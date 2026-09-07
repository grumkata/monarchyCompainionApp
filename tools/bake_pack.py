"""Bakes NAMED PIECES out of a glTF/GLB pack into the build.

    python3 tools/bake_pack.py <in.glb|in.gltf> <VAR> <out.js> [--only A,B,C]
                               [--tex "matPrefix=file.png,..."] [--texmax 256]

Output shape is the one 27-table-gl.js's mesh() already eats:

    const VAR = { "Table_Round_A": { prims:[{p,n,u,i,t,c,vc}], size:[x,y,z] }, ... };
    const VAR_TEX = { "key": "data:image/..." };

so a new pack costs a bake and a line in 48-library.js, and no new drawing
code anywhere.

WHY PER-NODE AND NOT WHOLE-FILE: bake_gltf.py merges an entire file into one
object, which is right for a single model shipped on its own. A furniture pack
is eighty separate things in one file, and merging them gives you one mesh of
eighty tables. The pieces have to come out by name.

Textures are matched by MATERIAL NAME because these packs do not embed them:
WoodStuff's GLB carries UVs and a bare 0.8 grey factor, and the trim sheets sit
in a folder beside it. --tex maps one to the other. They come down to 256px on
the way in — a 1K trim sheet is two megabytes of base64 per variant, and six of
those is more than the whole rest of the app.
"""
import json, sys, os, base64, io, struct
import numpy as np
from PIL import Image

CT = {5120:'i1', 5121:'u1', 5122:'i2', 5123:'u2', 5125:'u4', 5126:'f4'}
NC = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4, 'MAT4':16}


def quat_mat(q):
    x, y, z, w = q
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w),   2*(x*z+y*w)],
        [2*(x*y+z*w),   1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w),   2*(y*z+x*w),   1-2*(x*x+y*y)]], np.float32)


def load(src):
    """glTF json + its buffer, from either a .glb or a .gltf beside its .bin"""
    if src.lower().endswith('.glb'):
        b = open(src, 'rb').read()
        assert b[:4] == b'glTF', 'not a GLB'
        off, js, bin_ = 12, None, b''
        while off < len(b):
            ln, ty = struct.unpack_from('<II', b, off)
            chunk = b[off+8:off+8+ln]
            if ty == 0x4E4F534A: js = json.loads(chunk.decode('utf8'))
            elif ty == 0x004E4942: bin_ = chunk
            off += 8 + ln
        return js, bin_, os.path.dirname(os.path.abspath(src))
    here = os.path.dirname(os.path.abspath(src))
    g = json.load(open(src, encoding='utf-8'))
    uri = g['buffers'][0].get('uri', '')
    if uri.startswith('data:'):
        return g, base64.b64decode(uri.split(',', 1)[1]), here
    return g, open(os.path.join(here, uri), 'rb').read(), here


def shrink(path, cap):
    pic = Image.open(path)
    alpha = pic.mode in ('RGBA', 'LA') or 'transparency' in pic.info
    pic = pic.convert('RGBA' if alpha else 'RGB')
    if max(pic.size) > cap:
        k = cap / max(pic.size)
        pic = pic.resize((max(1,int(pic.width*k)), max(1,int(pic.height*k))), Image.LANCZOS)
    b = io.BytesIO()
    if alpha:
        pic.save(b, 'PNG', optimize=True)
        return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
    pic.save(b, 'JPEG', quality=86, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def merge(srcs, var, dst, cap):
    """Several single-piece glTF files into ONE pack, keyed by file name.
    KayKit ships one file per piece; the app wants one asset file."""
    out, book = {}, {}
    for src in srcs:
        g, BIN, here = load(src)
        name = os.path.splitext(os.path.basename(src))[0]
        sub = {}
        for n, im in enumerate(g.get('images', [])):
            uri = im.get('uri')
            if uri and not uri.startswith('data:'):
                key = os.path.splitext(os.path.basename(uri))[0]
                if key not in book: book[key] = shrink(os.path.join(here, uri), cap)
        one = extract(g, BIN, here, None, {}, book, cap)
        # a single-piece file may name its node anything; take the lot
        prims, lo, hi = [], None, None
        for v in one.values():
            prims += v['prims']
        if not prims: continue
        allp = np.array([q for v in one.values() for q in
                         np.array(v['prims'][0]['p']).reshape(-1,3)])
        out[name] = {'prims': prims, 'size': one[list(one)[0]]['size']}
    body = '/* Baked from a glTF pack by tools/bake_pack.py — do not edit. */\n'
    body += 'const %s = %s;\n' % (var, json.dumps(out, separators=(',', ':')))
    body += 'const %s_TEX = %s;\n' % (var, json.dumps(book, separators=(',', ':')))
    open(dst, 'w').write(body)
    print('%s  %d pieces, %d textures, %.2f MB'
          % (os.path.basename(dst), len(out), len(book), len(body)/1024/1024))


def main(argv):
    if argv[1] == '--merge':
        var, dst, cap = argv[2], argv[3], 256
        srcs = argv[4:]
        if '--texmax' in srcs:
            i = srcs.index('--texmax'); cap = int(srcs[i+1]); srcs = srcs[:i] + srcs[i+2:]
        return merge(srcs, var, dst, cap)
    src, var, dst = argv[1], argv[2], argv[3]
    only = None; texmap = {}; cap = 256
    i = 4
    while i < len(argv):
        if argv[i] == '--only': only = set(argv[i+1].split(',')); i += 2
        elif argv[i] == '--texmax': cap = int(argv[i+1]); i += 2
        elif argv[i] == '--tex':
            for pair in argv[i+1].split(','):
                k, v = pair.split('=', 1); texmap[k] = v
            i += 2
        else: i += 1

    g, BIN, here = load(src)

    def acc(n):
        a = g['accessors'][n]; bv = g['bufferViews'][a['bufferView']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        cnt = a['count'] * NC[a['type']]
        return np.frombuffer(BIN, dtype=np.dtype('<'+CT[a['componentType']]),
                             count=cnt, offset=o).reshape(a['count'], NC[a['type']])

    # ── the texture book, keyed by material name ──
    book, matkey = {}, {}
    for m in g.get('materials', []):
        nm = m.get('name', '')
        hit = next((v for k, v in texmap.items() if nm.endswith(k) or nm == k), None)
        if hit:
            key = os.path.splitext(os.path.basename(hit))[0]
            if key not in book:
                book[key] = shrink(os.path.join(here, hit) if not os.path.isabs(hit) else hit, cap)
            matkey[nm] = key
    # embedded images, if the pack has any
    for n, im in enumerate(g.get('images', [])):
        uri = im.get('uri')
        if uri and not uri.startswith('data:'):
            key = os.path.splitext(os.path.basename(uri))[0]
            if key not in book: book[key] = shrink(os.path.join(here, uri), cap)

    def tex_of(mi):
        if mi is None: return None
        m = g['materials'][mi]
        nm = m.get('name', '')
        if nm in matkey: return matkey[nm]
        t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if t is None: return None
        src_i = g['textures'][t['index']].get('source')
        if src_i is None: return None
        uri = g['images'][src_i].get('uri', '')
        return os.path.splitext(os.path.basename(uri))[0] or None

    out = extract(g, BIN, here, only, texmap, book, cap, matkey)

    body = ('/* Baked from %s by tools/bake_pack.py — do not edit. */\n'
            % os.path.basename(src))
    body += 'const %s = %s;\n' % (var, json.dumps(out, separators=(',', ':')))
    body += 'const %s_TEX = %s;\n' % (var, json.dumps(book, separators=(',', ':')))
    open(dst, 'w').write(body)
    print('%s  %d pieces, %d textures, %.2f MB'
          % (os.path.basename(dst), len(out), len(book), len(body)/1024/1024))


def extract(g, BIN, here, only, texmap, book, cap, matkey=None):
    matkey = matkey or {}

    def acc(n):
        a = g['accessors'][n]; bv = g['bufferViews'][a['bufferView']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        cnt = a['count'] * NC[a['type']]
        return np.frombuffer(BIN, dtype=np.dtype('<'+CT[a['componentType']]),
                             count=cnt, offset=o).reshape(a['count'], NC[a['type']])

    def tex_of(mi):
        if mi is None: return None
        m = g['materials'][mi]
        nm = m.get('name', '')
        if nm in matkey: return matkey[nm]
        t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if t is None: return None
        src_i = g['textures'][t['index']].get('source')
        if src_i is None: return None
        uri = g['images'][src_i].get('uri', '')
        return os.path.splitext(os.path.basename(uri))[0] or None

    R3 = lambda a: [round(float(x), 4) for x in a.ravel()]
    out = {}
    for node in g.get('nodes', []):
        nm = node.get('name')
        if 'mesh' not in node or not nm: continue
        if only is not None and nm not in only: continue
        sc = np.array(node.get('scale', [1,1,1]), np.float32)
        R  = quat_mat(node.get('rotation', [0,0,0,1]))
        T  = np.array(node.get('translation', [0,0,0]), np.float32)
        prims, lo, hi = [], None, None
        for pr in g['meshes'][node['mesh']]['primitives']:
            at = pr['attributes']
            P = acc(at['POSITION']).astype(np.float32) * sc
            P = (P @ R.T) + T
            N = (acc(at['NORMAL']).astype(np.float32) @ R.T) if 'NORMAL' in at else None
            lo = P.min(0) if lo is None else np.minimum(lo, P.min(0))
            hi = P.max(0) if hi is None else np.maximum(hi, P.max(0))
            d = {'p': R3(P)}
            if N is not None: d['n'] = R3(N)
            if 'TEXCOORD_0' in at: d['u'] = R3(acc(at['TEXCOORD_0']).astype(np.float32))
            if 'indices' in pr: d['i'] = [int(x) for x in acc(pr['indices']).ravel()]
            k = tex_of(pr.get('material'))
            if k: d['t'] = k
            mi = pr.get('material')
            if mi is not None:
                f = g['materials'][mi].get('pbrMetallicRoughness', {}).get('baseColorFactor')
                if f: d['c'] = [round(float(x), 4) for x in f[:3]]
            if 'COLOR_0' in at:
                C = acc(at['COLOR_0']).astype(np.float32)
                if C.dtype != np.float32 or C.max() > 1.001: C = C / 65535.0
                d['vc'] = R3(C[:, :3])
            prims.append(d)
        if prims:
            out[nm] = {'prims': prims,
                       'size': [round(float(x), 4) for x in (hi - lo)]}

    return out


if __name__ == '__main__':
    main(sys.argv)
