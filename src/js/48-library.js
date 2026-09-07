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
const ART_PACKS = [spritePack, chargePack];

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
  const NAME = { meeple: 'Meeple', pawn: 'Pawn', flag: 'Standard',
                 token: 'Disc', playerstand: 'Stand' };
  return Object.keys(B).map(k => {
    const bits = k.split('_');
    const base = NAME[bits[0]] || bits[0];
    const col = bits[bits.length - 1];
    const sz = B[k].size || [1, 1, 1];
    return { id: 'bit:' + k,
             name: /^(blue|red|green|yellow)$/.test(col)
                   ? base + ', ' + col : base,
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
