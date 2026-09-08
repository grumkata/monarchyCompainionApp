#!/usr/bin/env python3
"""
BAKE A PACK INTO THE APP.

The app is one HTML file. Every model in it is a JS object of the shape
27-table-gl.js's mesh() reads:

    { "prims": [ { p:[x,y,z...], n:[...], u:[u,v...], i:[...],
                   t:"texKey"|null, c:[r,g,b]|null } ] }

plus a texture book mapping texKey -> a data URI. That is the whole
contract, and it is why models can be inlined at all: no loader, no fetch,
no second file to lose.

This script makes those two things out of a glTF (read directly) or an FBX
(converted with assimp first, since the pipeline speaks glTF and half the
packs on disk do not).

Three things it must get right, each of which produced a wrong-looking
model the first time round:

  · NODE TRANSFORMS ARE BAKED IN. A glTF mesh is placed by its node, and
    an FBX out of a DCC app usually carries a 0.01 root scale for cm->m.
    Vertices are pushed through the accumulated world matrix here, because
    the app places models by measuring a DOM rect and has nowhere to put a
    per-model transform.

  · NORMALS GET THE INVERSE TRANSPOSE, not the world matrix. Non-uniform
    scale otherwise bends the lighting off the surface.

  · UVs ARE LEFT ALONE. tex() sets flipY = false, so the glTF convention
    is what the app expects; "correcting" them here turns every texture
    upside down.
"""

import base64, io, json, os, re, struct, subprocess, sys, tempfile
import numpy as np
from PIL import Image

# ── glTF plumbing ─────────────────────────────────────────────────────
CT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def _buffers(doc, base):
    out = []
    for b in doc.get('buffers', []):
        uri = b.get('uri')
        if uri is None:                     # GLB payload, filled by caller
            out.append(b['_bin'])
        elif uri.startswith('data:'):
            out.append(base64.b64decode(uri.split(',', 1)[1]))
        else:
            from urllib.parse import unquote
            with open(os.path.join(base, unquote(uri)), 'rb') as f:
                out.append(f.read())
    return out


def read_accessor(doc, bufs, i):
    """One accessor as a numpy array, honouring byteStride."""
    a = doc['accessors'][i]
    n = NC[a['type']]
    fmt = CT[a['componentType']]
    size = np.dtype(fmt).itemsize
    count = a['count']
    if 'bufferView' not in a:
        return np.zeros((count, n), dtype=np.dtype(fmt))
    bv = doc['bufferViews'][a['bufferView']]
    buf = bufs[bv.get('buffer', 0)]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or (n * size)
    if stride == n * size:
        raw = buf[start:start + count * n * size]
        arr = np.frombuffer(raw, dtype=np.dtype(fmt), count=count * n)
        return arr.reshape(count, n)
    rows = []
    for k in range(count):
        o = start + k * stride
        rows.append(np.frombuffer(buf[o:o + n * size], dtype=np.dtype(fmt), count=n))
    return np.array(rows)


def node_matrix(nd):
    if 'matrix' in nd:                       # glTF matrices are column-major
        return np.array(nd['matrix'], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4)
    if 'scale' in nd:
        m = np.diag(list(nd['scale']) + [1.0]) @ m
    if 'rotation' in nd:
        x, y, z, w = nd['rotation']
        r = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w),     2 * (x * z + y * w),     0],
            [2 * (x * y + z * w),     1 - 2 * (x * x + z * z), 2 * (y * z - x * w),     0],
            [2 * (x * z - y * w),     2 * (y * z + x * w),     1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1]])
        m = r @ m
    if 'translation' in nd:
        t = np.eye(4); t[:3, 3] = nd['translation']
        m = t @ m
    return m


def load_gltf(path):
    """A .gltf (with sidecar .bin) or a .glb, as (doc, buffers, basedir)."""
    base = os.path.dirname(os.path.abspath(path))
    if path.lower().endswith('.glb'):
        with open(path, 'rb') as f:
            data = f.read()
        assert data[:4] == b'glTF', 'not a glb'
        off, doc, bin0 = 12, None, None
        while off < len(data):
            ln, kind = struct.unpack_from('<II', data, off)
            chunk = data[off + 8: off + 8 + ln]
            if kind == 0x4E4F534A:
                doc = json.loads(chunk)
            elif kind == 0x004E4942:
                bin0 = chunk
            off += 8 + ln + ((4 - ln % 4) % 4 if ln % 4 else 0)
        if doc.get('buffers') and 'uri' not in doc['buffers'][0]:
            doc['buffers'][0]['_bin'] = bin0
        return doc, _buffers(doc, base), base
    with open(path) as f:
        doc = json.load(f)
    return doc, _buffers(doc, base), base


def to_gltf(path):
    """FBX/OBJ in, glTF out. assimp speaks both and the pipeline speaks glTF."""
    if path.lower().endswith(('.gltf', '.glb')):
        return path, None
    tmp = tempfile.mkdtemp(prefix='bake-')
    out = os.path.join(tmp, os.path.splitext(os.path.basename(path))[0] + '.gltf')
    r = subprocess.run(['assimp', 'export', path, out],
                       capture_output=True, text=True)
    if not os.path.exists(out):
        raise RuntimeError('assimp failed on %s: %s' % (path, r.stderr[-400:]))
    return out, tmp


# ── the bake ──────────────────────────────────────────────────────────
def base_image(doc, mi):
    """The base-colour image a material points at, as (key, uri-or-None).

    A kit file is not one material — a half-timbered wall is plaster AND
    wood trim in the same mesh — so the texture is resolved per primitive
    off its own material, not guessed per file. The key is the image's own
    filename, which is what makes the book shared: twenty wall pieces all
    referencing T_Plaster_BaseColor.png inline that atlas exactly once.
    """
    if mi is None:
        return None, None
    mat = doc.get('materials', [])[mi]
    bct = mat.get('pbrMetallicRoughness', {}).get('baseColorTexture')
    if not bct:
        return None, None
    tx = doc.get('textures', [])[bct['index']]
    src = tx.get('source')
    if src is None:
        return None, None
    img = doc.get('images', [])[src]
    uri = img.get('uri')
    if not uri:
        return None, None
    from urllib.parse import unquote
    name = os.path.splitext(os.path.basename(unquote(uri)))[0]
    return name, unquote(uri)


def prims_of(path, texkey=None, want=None, scale=1.0):
    """Every primitive in a file, in world space, ready for mesh().

    Returns (prims, {texKey: absolute image path}) — the caller decides
    which of those images to actually inline and at what size.

    `scale` exists because packs disagree about what one unit is. The
    village kit is in metres (its wall is 3.12 tall); the tavern pack is
    in centimetres (its chair is 86 tall). Two packs standing in the same
    room have to agree, and the honest place to settle that is here, once,
    at bake time — not in the room-building code, where it would be a
    magic number sitting next to every position.
    """
    gpath, _tmp = to_gltf(path)
    doc, bufs, base = load_gltf(gpath)
    out = []
    used = {}

    scene = doc.get('scenes', [{}])[doc.get('scene', 0)]
    stack = [(i, np.eye(4)) for i in scene.get('nodes', range(len(doc.get('nodes', []))))]
    while stack:
        ni, parent = stack.pop()
        nd = doc['nodes'][ni]
        world = parent @ node_matrix(nd)
        for c in nd.get('children', []):
            stack.append((c, world))
        if 'mesh' not in nd:
            continue
        for p in doc['meshes'][nd['mesh']].get('primitives', []):
            if p.get('mode', 4) != 4:            # triangles only
                continue
            att = p['attributes']
            pos = read_accessor(doc, bufs, att['POSITION']).astype(np.float64)
            h = np.hstack([pos, np.ones((len(pos), 1))])
            pos = (h @ world.T)[:, :3] * scale

            nrm = None
            if 'NORMAL' in att:
                nrm = read_accessor(doc, bufs, att['NORMAL']).astype(np.float64)
                nit = np.linalg.inv(world[:3, :3]).T
                nrm = nrm @ nit.T
                ln = np.linalg.norm(nrm, axis=1, keepdims=True)
                nrm = nrm / np.where(ln == 0, 1, ln)

            uv = None
            if 'TEXCOORD_0' in att:
                uv = read_accessor(doc, bufs, att['TEXCOORD_0']).astype(np.float64)

            idx = None
            if 'indices' in p:
                idx = read_accessor(doc, bufs, p['indices']).astype(np.int64).ravel()

            colour = None
            key = texkey
            if 'material' in p:
                mat = doc.get('materials', [])[p['material']]
                pbr = mat.get('pbrMetallicRoughness', {})
                bc = pbr.get('baseColorFactor')
                if bc and len(bc) >= 3 and tuple(bc[:3]) != (1, 1, 1):
                    colour = [round(float(v), 4) for v in bc[:3]]
                k, uri = base_image(doc, p['material'])
                if k and texkey is None:
                    key = k
                    used[k] = os.path.join(base, uri)

            if want is not None and not want(nd.get('name', ''), len(pos)):
                continue

            out.append({
                'p': [round(float(v), 4) for v in pos.ravel()],
                'n': None if nrm is None else [round(float(v), 3) for v in nrm.ravel()],
                'u': None if uv is None else [round(float(v), 4) for v in uv.ravel()],
                'i': None if idx is None else [int(v) for v in idx],
                't': key,
                'c': colour,
            })
    return out, used


def texture(path, px=1024, quality=82):
    """One image as a data URI, shrunk. JPEG unless it needs its alpha."""
    im = Image.open(path)
    if max(im.size) > px:
        k = px / max(im.size)
        im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))),
                       Image.LANCZOS)
    has_alpha = im.mode in ('RGBA', 'LA') and \
        im.getchannel('A').getextrema()[0] < 250
    buf = io.BytesIO()
    if has_alpha:
        im.convert('RGBA').save(buf, 'PNG', optimize=True)
        mime = 'image/png'
    else:
        im.convert('RGB').save(buf, 'JPEG', quality=quality, optimize=True)
        mime = 'image/jpeg'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(buf.getvalue()).decode())


def emit(js_path, var, models, book, note):
    """Write the asset file the build stitches in."""
    body = {k: {'prims': [{kk: vv for kk, vv in p.items() if vv is not None}
                          for p in v]} for k, v in models.items()}
    with open(js_path, 'w') as f:
        f.write('/* %s  Baked by tools/bake.py — do not edit. */\n' % note)
        f.write('const %s = %s;\n' % (var, json.dumps(body, separators=(',', ':'))))
        f.write('const %s_TEX = %s;\n' % (var, json.dumps(book, separators=(',', ':'))))
    return os.path.getsize(js_path)


if __name__ == '__main__':
    print(__doc__)
