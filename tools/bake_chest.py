"""Bakes the AnimatedChest into the build, the same way the Nature kit and the
Castle pack are baked: plain arrays in a JS global, no loader and no fetch.

The asset ships as Unity FBX + a .anim clip, which a browser cannot read. It is
run through FBX2glTF first (see the Makefile note below), which turns the clip
into a glTF animation. What comes out has a pleasantly simple rig:

    RootNode
      Armature            <- the animation rotates THIS node
        Bone
          ChestLid        <- mesh
      ChestBase           <- mesh
      Hinges              <- mesh

So the lid is not skinned; it hangs off a single hinge bone. That means no
animation system is needed at runtime — the lid is its own Group placed at the
Armature's rest transform, and opening the chest is one quaternion slerp
between the clip's first and last keys. Fourteen kilobytes of runtime instead
of three hundred.

Output matches KIT's shape exactly (p/n/u/i arrays + a texture key), so the
same propParts() reader in scene.js can consume it.

    python3 tools/bake_chest.py <chest.glb> src/js/19-chest-asset.js
"""
import json, struct, sys, os, base64, io
import numpy as np
from PIL import Image

CT = {5120:'i1', 5121:'u1', 5122:'i2', 5123:'u2', 5125:'u4', 5126:'f4'}
NC = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4, 'MAT4':16}
TEX_MAX = 256          # the chest is never more than a couple of hundred px on screen


def glb(path):
    d = open(path, 'rb').read()
    off, ch = 12, []
    while off < len(d):
        clen, ctype = struct.unpack('<II', d[off:off+8])
        ch.append((ctype, off+8, clen)); off += 8 + clen
    g = json.loads(d[ch[0][1]:ch[0][1]+ch[0][2]].decode('utf-8'))
    return g, d[ch[1][1]:ch[1][1]+ch[1][2]]


def quat_mat(q):
    x, y, z, w = q
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w),   2*(x*z+y*w)],
        [2*(x*y+z*w),   1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w),   2*(y*z+x*w),   1-2*(x*x+y*y)]], np.float32)


def main(src, dst):
    g, BIN = glb(src)

    def acc(i):
        a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = a['count'] * NC[a['type']]
        return np.frombuffer(BIN, dtype=np.dtype('<'+CT[a['componentType']]),
                             count=n, offset=o).reshape(a['count'], NC[a['type']])

    nodes = g['nodes']
    byname = {n.get('name'): i for i, n in enumerate(nodes)}

    def trs(i):
        n = nodes[i]
        return (np.array(n.get('translation', [0,0,0]), np.float32),
                np.array(n.get('rotation', [0,0,0,1]), np.float32),
                np.array(n.get('scale', [1,1,1]), np.float32))

    def local(i):
        t, q, s = trs(i)
        M = np.eye(4, dtype=np.float32)
        M[:3, :3] = quat_mat(q) * s
        M[:3, 3] = t
        return M

    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []) or []:
            parent[c] = i

    def chain(i, stop=None):
        """world matrix of node i, stopping BELOW `stop` (exclusive)."""
        M = np.eye(4, dtype=np.float32)
        j = i
        seq = []
        while j is not None and j != stop:
            seq.append(j); j = parent.get(j)
        for j in reversed(seq):
            M = M @ local(j)
        return M

    # ── geometry ────────────────────────────────────────────────
    def mesh_prims(node_i, M):
        R, S = M[:3, :3], None
        out = []
        for pr in nodes[node_i] and g['meshes'][nodes[node_i]['mesh']]['primitives']:
            P = acc(pr['attributes']['POSITION']).astype(np.float32)
            P = (P @ R.T) + M[:3, 3]
            N = acc(pr['attributes']['NORMAL']).astype(np.float32) @ R.T
            N /= (np.linalg.norm(N, axis=1, keepdims=True) + 1e-9)
            U = acc(pr['attributes']['TEXCOORD_0']).astype(np.float32)
            I = acc(pr['indices']).astype(np.int32).ravel()
            mi = pr.get('material')
            out.append({'P': P, 'N': N, 'U': U, 'I': I,
                        'tex': mat_tex(mi), 'col': mat_col(mi)})
        return out

    # Metal and Hinges carry no texture — only a baseColorFactor. Dropping it
    # and falling back to one hard-coded tan turned every brass band the same
    # colour as the wood.
    def mat_col(mi):
        if mi is None: return None
        f = g['materials'][mi].get('pbrMetallicRoughness', {}).get('baseColorFactor')
        if not f: return None
        return [round(float(v), 4) for v in f[:3]]

    imgs = {}
    def mat_tex(mi):
        if mi is None: return None
        m = g['materials'][mi]
        pbr = m.get('pbrMetallicRoughness', {})
        bc = pbr.get('baseColorTexture')
        if not bc: return None
        ti = g['textures'][bc['index']]['source']
        if ti not in imgs:
            im = g['images'][ti]
            bv = g['bufferViews'][im['bufferView']]
            o = bv.get('byteOffset', 0)
            raw = BIN[o:o+bv['byteLength']]
            pic = Image.open(io.BytesIO(raw)).convert('RGBA')
            if max(pic.size) > TEX_MAX:
                k = TEX_MAX / max(pic.size)
                pic = pic.resize((max(1,int(pic.width*k)), max(1,int(pic.height*k))), Image.LANCZOS)
            b = io.BytesIO(); pic.save(b, 'PNG', optimize=True)
            imgs[ti] = ('chest%d' % ti,
                        'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode())
        return imgs[ti][0]

    lid_i  = byname['ChestLid']
    arm_i  = byname['Armature']

    # The lid is baked in ARMATURE-LOCAL space: everything from the lid up to
    # (but not including) the Armature. The Armature's own transform becomes a
    # runtime Group, because that is the node the clip animates.
    lid   = mesh_prims(lid_i,  chain(lid_i, stop=arm_i))
    base  = mesh_prims(byname['ChestBase'], chain(byname['ChestBase']))
    hinge = mesh_prims(byname['Hinges'],    chain(byname['Hinges']))

    at, aq, asc = trs(arm_i)

    # ── the clip: the two ends of the Armature's rotation ────────
    # NOT first-and-last. The clip is a full cycle — closed, open, closed
    # again — so the last key equals the first and the lid never moved. Take
    # the key that is FURTHEST from the resting one; that is "open".
    shut_q, open_q = aq.tolist(), aq.tolist()
    for a in g.get('animations', []):
        for c in a['channels']:
            if c['target']['node'] == arm_i and c['target']['path'] == 'rotation':
                s = a['samplers'][c['sampler']]
                keys = acc(s['output']).astype(np.float32)
                k0 = keys[0]
                # |dot| of two unit quaternions falls as the angle between them grows
                d = np.abs(keys @ k0)
                shut_q, open_q = k0.tolist(), keys[int(np.argmin(d))].tolist()
                print('   %d keys, widest at %d (dot %.3f)'
                      % (len(keys), int(np.argmin(d)), float(d.min())))

    # stand the whole chest on y=0 with its footprint centred, so a caller
    # just says "the chest goes here" — same contract as the castle parts
    allP = np.vstack([p['P'] for p in base + hinge])
    shift = np.array([allP[:,0].mean(), allP[:,1].min(), allP[:,2].mean()], np.float32)
    scale = 1.0 / float(max(allP.max(0) - allP.min(0)))     # longest side -> 1 unit

    def emit(prims, extra_shift=None):
        out = []
        for p in prims:
            P = (p['P'] - shift) * scale
            out.append({'p': [round(float(v), 4) for v in P.ravel()],
                        'n': [round(float(v), 3) for v in p['N'].ravel()],
                        'u': [round(float(v), 4) for v in p['U'].ravel()],
                        'i': [int(v) for v in p['I']],
                        't': p['tex'], 'c': p['col']})
        return out

    # the lid's own space is armature-local, so it is shifted by the armature's
    # rest position rather than by the model shift
    lid_out = []
    for p in lid:
        P = p['P'] * scale
        lid_out.append({'p': [round(float(v), 4) for v in P.ravel()],
                        'n': [round(float(v), 3) for v in p['N'].ravel()],
                        'u': [round(float(v), 4) for v in p['U'].ravel()],
                        'i': [int(v) for v in p['I']],
                        't': p['tex'], 'c': p['col']})

    CHEST = {
        'base':  emit(base),
        'hinge': emit(hinge),
        'lid':   lid_out,
        'pivot': {'t': [round(float(v),4) for v in ((at - shift) * scale)],
                  's': [round(float(v),4) for v in asc]},
        'shut':  [round(float(v),5) for v in shut_q],
        'open':  [round(float(v),5) for v in open_q],
    }
    TEX = {k: v for k, v in imgs.values()}

    js = ('/* Baked from Assets/AnimatedChest by tools/bake_chest.py — do not edit. */\n'
          'const CHEST = ' + json.dumps(CHEST, separators=(',', ':')) + ';\n'
          'const CHEST_TEX = ' + json.dumps(TEX, separators=(',', ':')) + ';\n')
    open(dst, 'w', encoding='utf-8').write(js)
    print('%s  %.1f KB  (base %d prims, lid %d, hinge %d, tex %d)'
          % (dst, len(js)/1024, len(base), len(lid), len(hinge), len(TEX)))
    print('shut', CHEST['shut'], '-> open', CHEST['open'])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
