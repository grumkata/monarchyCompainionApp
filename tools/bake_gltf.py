"""Bakes a plain .gltf + .bin + texture into the build, the same shape as
tools/bake_chest.py and the Nature/Castle bakes: p/n/u/i arrays plus a texture
key, so scene.js's propParts() reader consumes it and there is no loader and no
fetch in the shipped page.

For the KayKit BoardGameBits pieces, which ship as glTF with an external buffer.

    python3 tools/bake_gltf.py <in.gltf> <NAME> <out.js>
"""
import json, sys, os, base64, io
import numpy as np
from PIL import Image

CT = {5120:'i1', 5121:'u1', 5122:'i2', 5123:'u2', 5125:'u4', 5126:'f4'}
NC = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4, 'MAT4':16}
TEX_MAX = 256


def quat_mat(q):
    x, y, z, w = q
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w),   2*(x*z+y*w)],
        [2*(x*y+z*w),   1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w),   2*(y*z+x*w),   1-2*(x*x+y*y)]], np.float32)


def main(src, name, dst):
    here = os.path.dirname(os.path.abspath(src))
    g = json.load(open(src, encoding='utf-8'))
    BIN = open(os.path.join(here, g['buffers'][0]['uri']), 'rb').read()

    def acc(i):
        a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = a['count'] * NC[a['type']]
        return np.frombuffer(BIN, dtype=np.dtype('<'+CT[a['componentType']]),
                             count=n, offset=o).reshape(a['count'], NC[a['type']])

    # one texture for the whole kit, shared by every piece in it
    tex = None
    if g.get('images'):
        uri = g['images'][0].get('uri')
        if uri:
            pic = Image.open(os.path.join(here, uri)).convert('RGBA')
            if max(pic.size) > TEX_MAX:
                k = TEX_MAX / max(pic.size)
                pic = pic.resize((int(pic.width*k), int(pic.height*k)), Image.LANCZOS)
            b = io.BytesIO(); pic.save(b, 'PNG', optimize=True)
            tex = 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

    prims, allP = [], []
    for node in g['nodes']:
        if 'mesh' not in node: continue
        sc = np.array(node.get('scale', [1,1,1]), np.float32)
        R = quat_mat(node.get('rotation', [0,0,0,1]))
        T = np.array(node.get('translation', [0,0,0]), np.float32)
        for pr in g['meshes'][node['mesh']]['primitives']:
            P = acc(pr['attributes']['POSITION']).astype(np.float32) * sc
            P = (P @ R.T) + T
            N = acc(pr['attributes']['NORMAL']).astype(np.float32) @ R.T
            N /= (np.linalg.norm(N, axis=1, keepdims=True) + 1e-9)
            U = (acc(pr['attributes']['TEXCOORD_0']).astype(np.float32)
                 if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(P), 2), np.float32))
            I = acc(pr['indices']).astype(np.int32).ravel()
            prims.append([P, N, U, I]); allP.append(P)

    allP = np.vstack(allP)
    # footprint centred, base on y=0, longest side one unit — the same contract
    # every other baked prop uses, so a caller just says "it goes here"
    shift = np.array([allP[:,0].mean(), allP[:,1].min(), allP[:,2].mean()], np.float32)
    scale = 1.0 / float(max(allP.max(0) - allP.min(0)))

    out = []
    for P, N, U, I in prims:
        P = (P - shift) * scale
        out.append({'p': [round(float(v),4) for v in P.ravel()],
                    'n': [round(float(v),3) for v in N.ravel()],
                    'u': [round(float(v),4) for v in U.ravel()],
                    'i': [int(v) for v in I],
                    't': 'kit' if tex else None, 'c': None})

    js = ('/* Baked from KayKit BoardGameBits by tools/bake_gltf.py — do not edit. */\n'
          'const %s = %s;\n' % (name, json.dumps({'prims': out}, separators=(',', ':'))) +
          'const %s_TEX = %s;\n' % (name, json.dumps({'kit': tex} if tex else {},
                                                     separators=(',', ':'))))
    open(dst, 'w', encoding='utf-8').write(js)
    print('%s  %.1f KB  (%d prims, tex %s)' % (dst, len(js)/1024, len(out), bool(tex)))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
