#!/usr/bin/env python3
"""BAKE THE BATTLEFIELDS' SCENERY.

    python tools/bake_terrain.py            # both packs
    python tools/bake_terrain.py terra      # just one

grumkata: "not every combat will be on a grassy field". The field was built
out of twenty pieces of the Nature MegaKit and nothing else, so every fight in
the game happened in the same meadow. This bakes the pieces the other
battlefields are made of, out of packs that were already sitting in Assets/:

  TERRA    the rest of the Nature MegaKit — dead trees, twisted trees, the
           desert-textured rocks, more pines and the rock paths. Wastes,
           deserts, marshes and snowfields are these, dressed differently.
  DUNGEON  the KayKit Dungeon Pack — floors, walls, pillars, torches, and
           the barrels and rubble a crypt fight happens among.

Output shape is the one 35-kit-assets.js already has, so the field's
propParts() and the table's mesh() both eat it without a new line of drawing
code:

    const TERRA = { key: { prims:[{p,n,u,i,t,cut}], r, size:[x,y,z], h } };
    const TERRA_TEX = { "texkey": "data:image/..." };

TWO NORMALISATIONS, ON PURPOSE.
  · Nature pieces are scaled to ONE UNIT on their longest side with their feet
    at the origin — exactly what the kit does — because the field scatters
    them by the height it wants (`Vs.setScalar(h)`).
  · Dungeon pieces are left at their OWN size (KayKit is authored in metres)
    with their feet at the origin and centred on x/z, because a wall is four
    metres long whatever else is true, and a room built out of them has to
    close. `h` is always the native height so a caller can do either.

Only the base colour is carried. The MegaKit ships a normal map beside every
bark texture, and the book used to swallow those too — two megabytes of
picture nothing in this app reads.

Afterwards run:  python tools/bake-textures.py   (build.js says so if you forget)
"""
import base64, io, json, os, struct, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
ASSETS = os.path.join(os.path.dirname(APP), 'Assets')
NATURE = os.path.join(ASSETS, 'Stylized Nature MegaKit[Standard]', 'glTF')
KAYKIT = os.path.join(ASSETS, 'KayKit_Dungeon_Pack_1.1_FREE', 'Assets', 'gltf')

CT = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

# ── WHAT GOES IN ─────────────────────────────────────────────────────────
# key in the pack  <-  file in the kit  (+ optional texture swap)
# FEW, AND CHOSEN. The first bake took all five of every tree and came out at
# twelve megabytes — a MegaKit tree is five to fifteen thousand vertices, and
# the page that has to parse them is five megabytes in total. A battlefield's
# treeline is one or two shapes turned and scaled a hundred ways, which is what
# the scatter already does, so two dead trees read as a dead wood just as well
# as five. The rock paths went entirely: seven thousand vertices for a decal.
TERRA = [
    ('dead1', 'DeadTree_1'), ('dead3', 'DeadTree_3'),
    ('twist2', 'TwistedTree_2'),
    ('pine1', 'Pine_1'), ('pine2', 'Pine_2'),
    # the same three rocks the meadow uses, in the pack's own sandstone
    ('drock1', 'Rock_Medium_1', 'Rocks_Desert_Diffuse.png'),
    ('drock2', 'Rock_Medium_2', 'Rocks_Desert_Diffuse.png'),
    ('drock3', 'Rock_Medium_3', 'Rocks_Desert_Diffuse.png'),
    ('fungus', 'Mushroom_Laetiporus'), ('plantB', 'Plant_7_Big'), ('plantA', 'Plant_1_Big'),
    ('pebR3', 'Pebble_Round_3'), ('pebS5', 'Pebble_Square_5'),
]
# The same rule as the trees: what a fight happens AMONG, not the whole shop.
# The stacked boxes, the decorated keg, the gold chest, the coin pile and the
# bed were two to three and a half thousand vertices each for set dressing.
DUNGEON = [
    'floor_tile_large', 'floor_tile_large_rocks',
    'floor_dirt_large', 'floor_dirt_large_rocky', 'floor_wood_large',
    'wall', 'wall_broken', 'wall_arched', 'wall_doorway',
    'wall_half', 'wall_corner', 'wall_pillar', 'wall_window_open',
    'pillar', 'pillar_decorated', 'column',
    'torch_lit', 'torch_mounted',
    'barrel_large', 'barrel_small_stack', 'crates_stacked',
    'rubble_large', 'rubble_half', 'barrier', 'barrier_column',
    'banner_patternA_red', 'banner_patternB_blue', 'banner_thin_yellow',
    'candle_triple', 'chest', 'sword_shield', 'table_long_broken',
    'shelf_small_candles', 'stairs', 'trunk_large_A',
]


def quat_mat(q):
    x, y, z, w = q
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w),   2*(x*z+y*w)],
        [2*(x*y+z*w),   1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w),   2*(y*z+x*w),   1-2*(x*x+y*y)]], np.float32)


def load(path):
    here = os.path.dirname(os.path.abspath(path))
    g = json.load(open(path, encoding='utf-8'))
    uri = g['buffers'][0].get('uri', '')
    if uri.startswith('data:'):
        return g, base64.b64decode(uri.split(',', 1)[1]), here
    return g, open(os.path.join(here, uri), 'rb').read(), here


def shrink(path, cap):
    pic = Image.open(path)
    alpha = pic.mode in ('RGBA', 'LA') or 'transparency' in pic.info
    pic = pic.convert('RGBA' if alpha else 'RGB')
    if alpha and pic.getextrema()[3][0] >= 250:
        alpha = False; pic = pic.convert('RGB')      # an alpha channel with nothing in it
    if max(pic.size) > cap:
        k = cap / max(pic.size)
        pic = pic.resize((max(1, int(pic.width*k)), max(1, int(pic.height*k))), Image.LANCZOS)
    b = io.BytesIO()
    if alpha:
        pic.save(b, 'PNG', optimize=True)
        return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
    pic.save(b, 'JPEG', quality=86, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def piece(path, book, cap, swap=None):
    """every mesh node in one file, pushed through its node transform, as a
    list of prims plus the bounding box of all of them"""
    g, BIN, here = load(path)

    def acc(n):
        a = g['accessors'][n]; bv = g['bufferViews'][a['bufferView']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        cnt = a['count'] * NC[a['type']]
        return np.frombuffer(BIN, dtype=np.dtype('<'+CT[a['componentType']]),
                             count=cnt, offset=o).reshape(a['count'], NC[a['type']])

    def base_tex(mi):
        """the BASE COLOUR picture of a material, and whether it is cut out"""
        if mi is None: return None, False
        m = g['materials'][mi]
        cut = m.get('alphaMode', 'OPAQUE') in ('MASK', 'BLEND')
        t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if t is None: return None, cut
        src = g['textures'][t['index']].get('source')
        if src is None: return None, cut
        uri = g['images'][src].get('uri', '')
        if swap: uri = swap
        key = os.path.splitext(os.path.basename(uri))[0]
        if key not in book:
            book[key] = shrink(os.path.join(here, uri), cap)
        return key, cut

    prims, lo, hi = [], None, None
    for node in g.get('nodes', []):
        if 'mesh' not in node: continue
        sc = np.array(node.get('scale', [1, 1, 1]), np.float32)
        R = quat_mat(node.get('rotation', [0, 0, 0, 1]))
        T = np.array(node.get('translation', [0, 0, 0]), np.float32)
        for pr in g['meshes'][node['mesh']]['primitives']:
            at = pr['attributes']
            P = (acc(at['POSITION']).astype(np.float32) * sc) @ R.T + T
            d = {'P': P}
            if 'NORMAL' in at:
                N = acc(at['NORMAL']).astype(np.float32) @ R.T
                N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
                d['N'] = N
            if 'TEXCOORD_0' in at: d['U'] = acc(at['TEXCOORD_0']).astype(np.float32)
            if 'indices' in pr: d['I'] = acc(pr['indices']).ravel().astype(np.int64)
            key, cut = base_tex(pr.get('material'))
            if key: d['t'] = key
            if cut: d['cut'] = 1
            mi = pr.get('material')
            if mi is not None:
                f = g['materials'][mi].get('pbrMetallicRoughness', {}).get('baseColorFactor')
                if f and any(abs(x - 1) > 1e-3 for x in f[:3]):
                    d['c'] = [round(float(x), 4) for x in f[:3]]
            lo = P.min(0) if lo is None else np.minimum(lo, P.min(0))
            hi = P.max(0) if hi is None else np.maximum(hi, P.max(0))
            prims.append(d)
    return prims, lo, hi


def weld(d):
    """one vertex per distinct (position, normal, uv). The MegaKit exports a
    fifth of its vertices twice over; merging them changes nothing you can see
    and is the cheapest fifth of a tree there is."""
    if 'I' not in d: return d
    cols = [d['P']] + ([d['N'] * 0.5] if 'N' in d else []) + ([d['U']] if 'U' in d else [])
    key = np.round(np.hstack(cols), 5)
    _, first, remap = np.unique(key, axis=0, return_index=True, return_inverse=True)
    out = dict(d)
    out['P'] = d['P'][first]
    if 'N' in d: out['N'] = d['N'][first]
    if 'U' in d: out['U'] = d['U'][first]
    out['I'] = remap.ravel()[d['I']]
    return out


def emit(prims, lo, hi, unit):
    """feet at the origin, centred on x/z, and — for `unit` — one unit on the
    longest side, the way the kit is"""
    size = hi - lo
    off = np.array([(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2], np.float32)
    k = 1.0 / max(size.max(), 1e-6) if unit else 1.0
    R4 = lambda a: [round(float(x), 4) for x in a.ravel()]
    out = []
    for d in (weld(x) for x in prims):
        o = {'p': R4((d['P'] - off) * k)}
        if 'N' in d: o['n'] = R4(d['N'])
        if 'U' in d: o['u'] = R4(d['U'])
        if 'I' in d: o['i'] = [int(x) for x in d['I']]
        for f in ('t', 'cut', 'c'):
            if f in d: o[f] = d[f]
        out.append(o)
    foot = max(size[0], size[2]) * k
    return {'prims': out, 'r': round(float(foot / 2), 4),
            'size': [round(float(x * k), 4) for x in size],
            'h': round(float(size[1]), 4)}


def write(dst, var, pack, book, note):
    body = '/* %s\n   Baked by tools/bake_terrain.py - do not edit; re-bake instead. */\n' % note
    body += 'const %s = %s;\n' % (var, json.dumps(pack, separators=(',', ':')))
    body += 'const %s_TEX = %s;\n' % (var, json.dumps(book, separators=(',', ':')))
    open(dst, 'w', encoding='utf-8', newline='\n').write(body)
    print('%-26s %3d pieces, %2d textures, %.2f MB'
          % (os.path.basename(dst), len(pack), len(book), len(body) / 1048576))


def bake_terra():
    pack, book = {}, {}
    for row in TERRA:
        key, name = row[0], row[1]
        swap = row[2] if len(row) > 2 else None
        path = os.path.join(NATURE, name + '.gltf')
        if not os.path.exists(path):
            print('  !! missing', name); continue
        prims, lo, hi = piece(path, book, 512, swap)
        if prims: pack[key] = emit(prims, lo, hi, True)
    write(os.path.join(APP, 'src/js/70-terra-assets.js'), 'TERRA', pack, book,
          'The rest of the Stylized Nature MegaKit (Quaternius, CC0): what the '
          'wastes, the marsh, the desert and the snow are made of.')


def bake_dungeon():
    pack, book = {}, {}
    for name in DUNGEON:
        path = os.path.join(KAYKIT, name + '.gltf')
        if not os.path.exists(path):
            print('  !! missing', name); continue
        prims, lo, hi = piece(path, book, 512)
        if prims: pack[name] = emit(prims, lo, hi, False)
    write(os.path.join(APP, 'src/js/71-dungeon-assets.js'), 'DUNGEON', pack, book,
          'KayKit Dungeon Pack 1.1 (Kay Lousberg, CC0): the crypt, and the '
          'clutter a fight happens among. Native size, in metres.')


if __name__ == '__main__':
    want = sys.argv[1:] or ['terra', 'dungeon']
    if 'terra' in want: bake_terra()
    if 'dungeon' in want: bake_dungeon()
