/* ══════════════════════════════════════════════════════════════
   48-library.js — WHAT THERE IS TO PUT ON THE TABLE.

   grumkata:

     "art should be able to pull from art inside the program (which
      i will add an extensive list later) and external art — this
      goes for character and token image ... 3d models dont work at
      all even though i have so many assets to use"

   Two registries, and the point of both is the SEAM. Adding to
   them is filling in a table, never writing code:

     ART     — pictures. Sprites and heraldic charges are already
               baked into this app and were sitting unused; anything
               added later drops into ART_PACKS beside them, and
               anything off your own machine lands in the same list
               through `add()` and stays there.

     MODELS  — real 3D. The nature kit (20 pieces), the castle, the
               chest and the container are all already baked and
               were reachable by exactly one screen each. They are
               all reachable from the box now.

   Nothing here touches the DOM or THREE, so it unit-tests in plain
   node and neither renderer has to exist for the list to be read.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

/* ── HOW THE BAKED PACKS ARE REACHED ──────────────────────────
   NOT `window.SPRITES`. bake_sprites.py and bake_kit.py write `const SPRITES`
   and `const KIT` at the top level of a classic script, and a top-level
   `const` goes into the GLOBAL LEXICAL environment, not onto window — so
   `root.SPRITES` reads undefined however loaded the pack is. That is the
   same trap that once made the toolbox's GM gate never fire, and it cost
   this file a whole art library and every 3D model on the first run: the two
   packs written as `window.CASTLE =` and `window.CHARGES =` appeared, and
   the four written as `const` did not.

   Reading them by NAME with typeof is how 37-scene-field.js already does it,
   and it is the only thing that sees both kinds of global. */
const pack = {
  SPRITES:   () => (typeof SPRITES   !== 'undefined' ? SPRITES   : null),
  CHARGES:   () => (typeof CHARGES   !== 'undefined' ? CHARGES   : root.CHARGES),
  KIT:       () => (typeof KIT       !== 'undefined' ? KIT       : null),
  KIT_TEX:   () => (typeof KIT_TEX   !== 'undefined' ? KIT_TEX   : null),
  CASTLE:    () => (typeof CASTLE    !== 'undefined' ? CASTLE    : root.CASTLE),
  CHEST:     () => (typeof CHEST     !== 'undefined' ? CHEST     : null),
  CHEST_TEX: () => (typeof CHEST_TEX !== 'undefined' ? CHEST_TEX : null),
  BIN3D:     () => (typeof BIN3D     !== 'undefined' ? BIN3D     : null),
  BIN3D_TEX: () => (typeof BIN3D_TEX !== 'undefined' ? BIN3D_TEX : null),
  WOOD:      () => (typeof WOOD      !== 'undefined' ? WOOD      : null),
  WOOD_TEX:  () => (typeof WOOD_TEX  !== 'undefined' ? WOOD_TEX  : null),
  BITS:      () => (typeof BITS      !== 'undefined' ? BITS      : null),
  BITS_TEX:  () => (typeof BITS_TEX  !== 'undefined' ? BITS_TEX  : null)
};
const G = k => { try { return pack[k] ? pack[k]() : undefined; } catch (e) { return undefined; } };
const KEY_ART = 'monarchy.art.v1';

/* ══ ART ══════════════════════════════════════════════════════
   A picture is either a raster (`src`, a data URI) or a vector
   (`svg`, a viewBox and its paths). Both draw; only the raster can
   be scaled to any size without going soft, which is why a token's
   portrait prefers one and an emblem prefers the other.          */

/* the sprites bake_sprites.py made — real painted figures, and the
   obvious thing to put on an NPC's counter */
function spritePack() {
  const S = G('SPRITES'); if (!S) return null;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    id: 'figures', name: 'Figures',
    items: Object.keys(S).map(k => ({
      id: 'sprite:' + k, name: cap(k), src: S[k].src, tall: true
    }))
  };
}

/* the heraldic charges the flag maker draws with (game-icons.net,
   CC BY 3.0 — the attribution lives in the flag maker) */
function chargePack() {
  const C = G('CHARGES'); if (!C) return null;
  return {
    id: 'charges', name: 'Charges',
    items: Object.keys(C).map(k => ({
      id: 'charge:' + k, name: C[k].n || k,
      svg: { v: C[k].v, d: C[k].d }
    }))
  };
}

/* ── ADD A PACK HERE ──────────────────────────────────────────
   One function per pack, returning { id, name, items } or null when
   whatever it reads is not loaded. That is the whole contract.   */
/* chargePack is deliberately NOT in here. grumkata: "when selcting images
   dont show charges fro obvious reasons" -- and the obvious reason is that a
   charge is not a picture. It is a single-colour vector glyph drawn to be
   stamped on a shield by the flag maker, which is the one place it belongs
   and the one place it still appears (12-heraldry.js reads window.CHARGES
   directly and never came through here). Offered as table art it is two
   hundred silhouettes cluttering the shelf you go to for a portrait or a
   map, and every one of them is the wrong tool.

   The function stays, because the pack is correctly written and the seam is
   the point of this file: put it back in this array and the shelf has it
   again. */
const ART_PACKS = [spritePack];

let ownCache = null;
function own() {
  if (ownCache) return ownCache;
  try {
    const v = JSON.parse(root.localStorage.getItem(KEY_ART));
    ownCache = Array.isArray(v) ? v : [];
  } catch (e) { ownCache = []; }
  return ownCache;
}
function saveOwn() {
  try { root.localStorage.setItem(KEY_ART, JSON.stringify(ownCache || [])); }
  catch (e) {
    /* A picture is a data URI and localStorage is about five megabytes, so
       this WILL fail eventually. Failing quietly and keeping it for the
       session beats refusing the picture — the table it was placed on holds
       its own copy either way. */
    return false;
  }
  return true;
}

function artGroups() {
  const out = [];
  ART_PACKS.forEach(fn => { const p = fn(); if (p && p.items.length) out.push(p); });
  const mine = own();
  if (mine.length) out.unshift({ id: 'yours', name: 'Yours', items: mine.slice() });
  return out;
}
const artAll = () => artGroups().reduce((a, g) => a.concat(g.items), []);
const artGet = id => artAll().find(a => a.id === id) || null;

/* a picture off your own machine, kept so it is there next time */
function artAdd(entry) {
  const mine = own();
  const e = Object.assign({ id: 'own:' + Date.now().toString(36) +
                                Math.random().toString(36).slice(2, 5) }, entry);
  mine.unshift(e);
  if (mine.length > 60) mine.length = 60;
  e.kept = saveOwn();
  return e;
}
function artRemove(id) {
  const mine = own();
  const i = mine.findIndex(a => a.id === id);
  if (i < 0) return false;
  mine.splice(i, 1); saveOwn(); return true;
}

/* ══ MODELS ═══════════════════════════════════════════════════
   `prims` and `tex` are exactly what 27-table-gl.js's mesh() eats,
   so a model here needs no new drawing code. `foot` is how wide it
   stands on the wood in table units — a mushroom is not a tree.  */
function kitPack() {
  const K = G('KIT'); if (!K) return [];
  const T = G('KIT_TEX');
  /* HOW WIDE IT STANDS, in table units, on a slab 2900 across. These were
     first written at about half this and a tree came out the size of a
     thumbnail on a table you can see all of at once — a model on the wood has
     to be a thing you can look AT, not a detail you have to zoom into. */
  const NAMED = {
    tree: ['Tree', 560], tree2: ['Tree, broad', 560], pine: ['Pine', 520],
    bush: ['Bush', 300], bushfl: ['Bush in flower', 300],
    rock: ['Rock', 330], rock2: ['Rock, split', 330], boulder: ['Boulder', 420],
    grass: ['Grass', 200], grassS: ['Grass, short', 170],
    wispy: ['Wispy grass', 200], wispyS: ['Wispy grass, short', 170],
    fern: ['Fern', 250], clover: ['Clover', 180], plant: ['Plant', 230],
    flower: ['Flower', 180], flower2: ['Flower, tall', 200],
    mushroom: ['Mushroom', 150], pebble: ['Pebble', 130], pebble2: ['Pebbles', 150]
  };
  return Object.keys(K).map(k => {
    const n = NAMED[k] || [k, 200];
    return { id: 'kit:' + k, name: n[0], foot: n[1],
             prims: K[k].prims, tex: T, pack: 'Nature' };
  });
}

function bigPack() {
  const out = [];
  /* ── THE HALL IS NOT IN HERE, DELIBERATELY ──────────────────
     grumkata: "the hall isnt a model you should be bale to grab". It was
     offered as a 1300-unit object you could pick out of the chest and drop
     on the wood, which is half the table — a building is a PLACE, not a
     piece. The Castle Pack is still loaded and still builds the hall you
     walk into from the menu (13-hall3d.js); it is simply not something the
     box hands you. There is no "Buildings" shelf any more. */
  const CH = G('CHEST');
  /* these two carry their own dressing: the chest's ironwork and the
     container's pale plastic both need bringing down, and DRESS in
     27-table-gl.js is where each is written */
  if (CH) out.push({ id: 'prop:chest', name: 'A chest', foot: 380, dress: 'chest',
                     prims: CH.base.concat(CH.lid, CH.hinge),
                     tex: G('CHEST_TEX'), pack: 'Things' });
  const B = G('BIN3D');
  if (B) out.push({ id: 'prop:crate', name: 'A container', foot: 340, dress: 'bin',
                    prims: B.prims, tex: G('BIN3D_TEX'), pack: 'Things' });
  return out;
}

/* ── THE FURNITURE ────────────────────────────────────────────
   grumkata: "PLEASE look in the assets folder instead of imeadtly making
   shitty drtawings". Eighty pieces out of WoodStuff — tables, chairs,
   barrels, crates, shelves, pots, baskets — baked by tools/bake_pack.py and
   named by the pack itself. Nothing here is written twice: the display name
   is the asset's own name unpicked, and how wide it stands is its own
   measured footprint.

   ONE MODEL UNIT IS 420 TABLE UNITS. Not life-size — a barrel at true scale
   next to this app's trees is a dot, and the nature kit already decided that
   a thing on the wood has to be something you can look AT rather than a
   detail you zoom into. At 420 a round table stands 420 across on a 2600
   table, a chair 185, a barrel 160: recognisable at the fit zoom, which is
   the only test that matters. Everything in the pack is measured, so one
   constant sizes all eighty correctly. */
const WOOD_SCALE = 420;
const SHELF_OF = {
  Table: 'Furniture', Chair: 'Furniture', Bench: 'Furniture', Stool: 'Furniture',
  Cabinet: 'Furniture', BookShelf: 'Furniture', Shelf: 'Furniture',
  Barrel: 'Containers', Crate: 'Containers', Basket: 'Containers',
  Container: 'Containers', Tray: 'Containers'
};
/* Table_Round_B_Static -> "Table, round B". A single trailing letter is the
   pack's way of numbering variants and stays a capital; everything else is
   a word and reads better in lower case. */
function prettify(k) {
  const w = k.split('_').filter(x => x && x !== 'Static');
  const head = w.shift();
  const rest = w.map(x => x.length === 1 ? x.toUpperCase() : x.toLowerCase()).join(' ');
  return rest ? head + ', ' + rest : head;
}
function woodPack() {
  const W = G('WOOD'); if (!W) return [];
  const T = G('WOOD_TEX');
  return Object.keys(W).map(k => {
    const sz = W[k].size || [1, 1, 1];
    const foot = Math.round(Math.max(sz[0], sz[2]) * WOOD_SCALE);
    return { id: 'wood:' + k, name: prettify(k), foot: Math.max(foot, 110), dress: 'timber',
             prims: W[k].prims, tex: T, pack: SHELF_OF[k.split('_')[0]] || 'Things' };
  });
}

/* ── THE PIECES ───────────────────────────────────────────────
   Meeples, pawns, standards and discs. These are what a counter on the wood
   is made of (27-table-gl.js stands one on every token), and they are worth
   having in the box in their own right — a row of meeples IS a unit marker. */
function bitsPack() {
  const B = G('BITS'); if (!B) return [];
  const T = G('BITS_TEX');
  /* ── WHAT THE PACK CALLS THEM, AND WHAT A PERSON CALLS THEM ──
     This read `NAME[bits[0]]` and fell back to the raw first word, which was
     fine while the only pieces baked in were meeples, pawns, standards,
     discs and the stand. The pack's character pieces are `tile_knight_blue`
     and `tile_skeleton_brute`, so that rule called all of them "tile" and
     threw the character away -- and `pawn_B_blue` came out as "Pawn, blue",
     the same name pawn_A already had. */
  const NAME = { meeple: 'Meeple', pawn: 'Pawn', flag: 'Standard',
                 token: 'Disc', playerstand: 'Stand', tile: 'Tile' };
  /* the four heroes and the skeletons, which the pack files under `tile_` */
  const WHO = { knight: 'Knight', mage: 'Mage', rogue: 'Rogue',
                barbarian: 'Barbarian', skeleton: 'Skeleton' };
  const COL = /^(blue|red|green|yellow|white|brown|purple|black)$/;
  const nameOf = k => {
    const p = k.split('_');
    const col = COL.test(p[p.length - 1]) ? p.pop() : '';
    let base;
    if (p[0] === 'tile' && WHO[p[1]])
      /* tile_skeleton_brute -> "Skeleton, brute" */
      base = WHO[p[1]] + (p[2] ? ', ' + p[2] : '');
    else if (p[0] === 'pawn' && /^[A-Z]$/.test(p[1] || ''))
      /* two different pawn shapes ship in this pack and both come in four
         colours, so the shape has to survive into the name */
      base = 'Pawn ' + p[1];
    else base = NAME[p[0]] || p[0];
    return col ? base + ', ' + col : base;
  };
  return Object.keys(B).map(k => {
    const sz = B[k].size || [1, 1, 1];
    return { id: 'bit:' + k,
             name: nameOf(k),
             foot: Math.max(Math.round(Math.max(sz[0], sz[2]) * 190), 110),
             dress: 'bits',
             prims: B[k].prims, tex: T, pack: 'Pieces' };
  });
}

function modelList() {
  return kitPack().concat(woodPack(), bitsPack(), bigPack());
}
function modelGroups() {
  const by = {};
  modelList().forEach(m => { (by[m.pack] = by[m.pack] || []).push(m); });
  return Object.keys(by).map(k => ({ id: k.toLowerCase(), name: k, items: by[k] }));
}
const modelGet = id => modelList().find(m => m.id === id) || null;

root.Library = {
  art:    { groups: artGroups, all: artAll, get: artGet,
            add: artAdd, remove: artRemove, PACKS: ART_PACKS },
  models: { groups: modelGroups, list: modelList, get: modelGet },
  KEY_ART
};
if (typeof module !== 'undefined' && module.exports) module.exports = root.Library;

})(typeof window !== 'undefined' ? window : globalThis);
