/* ══════════════════════════════════════════════════════════════
   20-table-content.js — WHAT A TABLE CAN HOLD, declared as data.

   Nothing in here touches the DOM, so it unit-tests in plain node
   and so that adding a scene kind or an option is filling in a
   table rather than writing new code.

   Three words, used precisely, from grumkata:

     THING   exists on the table. Has a place. Can be moved,
             scaled, binned.
     TOOL    something you wield against things. The scaler.
     OPTION  a property OF a thing, reached from that thing.

   A veil is not a thing and not a tool — concealment is an
   OPTION. That test is why fog of war lives in OPTIONS below and
   not on a shelf.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

/* ── OPTIONS ──────────────────────────────────────────────────
   Defined ONCE. Each scene kind declares which it supports, so
   "fog of war" is never written twice and cannot drift apart.
   Always to hand for the GM; never an object on the wood.      */
const OPTIONS = {
  fog: {
    label: 'Fog of war',
    type: 'bool',
    def: false,
    hint: 'What the players are not told is not sent to them.'
  },
  mana: {
    label: 'Mana in the air',
    type: 'number',
    def: 0, min: 0, max: 999,
    hint: 'The shared pool both armies draw on. A cantrip is free but still needs 5 in the air.'
  },
  flex: {
    label: 'Player freedom',
    type: 'choice',
    def: 'move',
    choices: [
      ['ask',  'Ask first',   'Every move is a proposal the GM allows.'],
      ['move', 'Move freely', 'Players move themselves; everything else is asked.'],
      ['full', 'Free rein',   'Players act without waiting on the GM.']
    ],
    hint: 'How much the immersive view lets a player do on their own.'
  },
  npcAuto: {
    label: 'NPCs attack on their own',
    type: 'bool',
    def: false,
    hint: 'Enemy and ally NPCs swing without the GM declaring for each.'
  }
};

/* ── THE MODELS A SCENE CAN BE DRESSED WITH ───────────────────
   A near-empty registry on purpose: this is the seam the Workshop
   plugs into. An installed package appends to it; nothing else
   has to change.                                                */
const MODELS = {
  battlefield: [
    { id: 'none', name: 'Bare field', note: 'No model. Ranks on open ground.' }
  ]
};

/* ══ WHERE A FIGHT HAPPENS ════════════════════════════════════
   grumkata: "not every combat will be on a grassy field". Every fight in
   the game was fought in one meadow, because the field was built out of
   the Nature kit and nothing else, with its colours written into the
   drawing code. A terrain is DATA now: the mat on the table, the ground
   in the field, the sky, the light and what grows or stands round the
   edge all come from one row here, so adding a battlefield is adding a
   row — 37-scene-field.js reads `field`, the board reads `mat`.

     mat     the battle mat's cloth on the table: ground, the two halves'
             washes, and the ink the line names are written in
     field   what the immersive view builds: sky, light, fog, the ground
             painter's palette, what is scattered, and what falls from
             the sky                                                   */
const TERRAINS = {
  meadow: {
    name: 'Meadow', blurb: 'Open grass under a hard sun.',
    mat: { ground: '#6f8f3a', en: 'rgba(163,35,43,.16)', al: 'rgba(39,80,143,.16)', ink: '#f4efe2', edge: '#3e5a1e' },
    field: { sky: ['#3f96cf', '#84c9ec', '#d9edf3'], sun: '#fff1cf', skyLight: '#bcdcf5',
             bounce: '#8aa848', fog: [62, 165], exposure: 1.06,
             ground: ['#c3cf5a', '#a6cf4e', '#7fae37', '#4f7c26'], wear: '156,128,84',
             blades: ['#8fc23f', '#7cae32', '#a3d051', '#6f9d2c', '#b6d968', '#88b93a'],
             grass: 1, scatter: 'meadow', clouds: 1 } },
};
/* grumkata (2026-10-09): "remove the terrain options, make it limited to JUST meadow always". There is one
   ground; anything saved or sent as another is the meadow. */
const TERRAIN_ORDER = ['meadow'];
const terrainOf = () => 'meadow';

/* ══ WHAT STANDS ON THE FIELD ITSELF ══════════════════════════
   grumkata: "i want the capability for field variety". A terrain is the
   world round a fight; a FEATURE is the ground inside it — this slot is
   behind a wall, that one is a pool of black water — so two fights in the
   same wood are not the same fight.

   A feature lives on one slot of one line (`{ line, col, kind }` on the
   scene), is painted on the mat and stood up in the field, and says what
   it means on hover. `blocks` is whether a unit may be put in that slot at
   all; everything else is the GM's to rule on, which is how the rest of
   this board already works — the app shows reach, it does not refuse it.

   `props` is what the field stands there, by terrain; the first entry
   that exists in a loaded pack wins.                                   */
const FEATURES = {
  cover:    { name: 'Cover',     mark: '▣', blocks: false,
              note: 'Something to stand behind — a low wall, a cart, a fallen trunk.',
              props: ['barrier', 'rock', 'drock1'] },
  obstacle: { name: 'Obstacle',  mark: '■', blocks: true,
              note: 'Nobody stands here — a boulder, a pillar, a great tree.',
              props: ['boulder', 'pillar', 'drock3'] },
  rough:    { name: 'Rough ground', mark: '▒', blocks: false,
              note: 'Rubble, brush or deep snow. Hard going.',
              props: ['rubble_half', 'bush', 'pebS5'] },
  hazard:   { name: 'Hazard',    mark: '✹', blocks: false,
              note: 'Fire, spikes or thorns. It hurts to be here.',
              props: ['torch_lit', 'fungus', 'mushroom'] },
  water:    { name: 'Water',     mark: '≈', blocks: false,
              note: 'Shallow water or mud underfoot.',
              props: [] }
};
const FEATURE_ORDER = ['cover', 'obstacle', 'rough', 'hazard', 'water'];

/* ── SCENES ───────────────────────────────────────────────────
   SETUP is what the scene IS — decided when it is made, and it
   travels with a preset. Changing it is remaking the scene.
   OPTIONS are how it is being RUN — live, any time.

   Width lives here and not on the table because a campaign has
   many fights and they are not all the same size.               */
const SCENES = {
  combat: {
    name: 'Combat',
    mark: '⚔',
    blurb: 'Ranks and columns. The field.',
    /* The footprint of eight lines and eight slots on the wood: the felt, the
       frame, and headroom for the figures (80-battle.js geometry() is where it is
       really worked out, and corrects a scene to it whenever its lines or width
       change). About 64 cm by 75 cm on a 2.2 m table. */
    size: { w: 1280, h: 1494 },
    setup: [
      { key: 'width', label: 'Units per line', type: 'number',
        def: 8, min: 3, max: 14,
        hint: 'How many a line holds. Small is about 5, large about 12. There are always eight lines.' },
      /* one ground, the meadow, always (grumkata, 2026-10-09). The field stays in the scene's setup so what is
         saved says so, but nothing offers a choice and any value is the meadow (terrainOf). */
      { key: 'terrain', label: 'Ground', type: 'terrain', def: 'meadow', hint: 'The meadow.' }
    ],
    /* depth is 8 lines, from the rules — not a choice */
    fixed: { lines: 8 },
    /* the fight's own switches (what players see of the enemy's health, the cloth)
       are kept on the scene by 80-battle.js and set on the board itself */
    options: ['fog', 'mana']
  },

  exploration: {
    name: 'Exploration',
    mark: '⛰',
    /* A MAP PUT DOWN IS THE SIZE OF A MAP. It was a 520x180 strip, which is
       the size of a caption, and it drew a brown card listing "The map: —"
       rather than the map. You choose the picture while the scene is still in
       your hand, so by the time it lands there is a real picture to lay out. */
    size: { w: 1180, h: 800 },
    blurb: 'A map put down. In the immersive view you walk it.',
    setup: [
      { key: 'map', label: 'The map', type: 'image',
        hint: 'The ground they explore.' }
    ],
    options: ['fog', 'flex']
  },

  stage: {
    name: 'Stage',
    mark: '✧',
    size: { w: 1180, h: 740 },
    blurb: 'Artwork for everyone in the scene over a drifting backdrop. A setting to roleplay in.',
    setup: [
      { key: 'backdrop', label: 'Backdrop', type: 'image',
        hint: 'Sits behind, and drifts.' },
      { key: 'cast', label: 'Who is in the scene', type: 'cast',
        hint: 'Their figure stands on the stage. No tokens here.' }
    ],
    options: []
  }
};

/* ── THE LINES A NEW FIGHT STARTS WITH ───────────────────────
   Empty: pulling a combat scene out of the box and finding somebody
   else's Hollow Knight already on it is not a scene, it is a save file.

   Four lines a side, back to front. There are ALWAYS these eight and
   nothing adds or removes one (80-battle.js builds the same eight for any
   scene, however it was saved); what a fight's setup changes is how many a
   line holds. `depth` is the line's distance from its own backline and is
   what move speed is counted in.                                    */
function blankLines() {
  const side = (s, p) => [
    { key: p + '-back',  side: s, label: 'Backline',  depth: 0, ents: [] },
    { key: p + '-supp',  side: s, label: 'Support',   depth: 1, ents: [] },
    { key: p + '-sec',   side: s, label: 'Secondary', depth: 2, ents: [] },
    { key: p + '-front', side: s, label: 'Frontline', depth: 3, front: true, ents: [] }
  ];
  /* enemy runs back-to-front down the page, ally front-to-back up it, so the
     two frontlines meet in the middle at The Line */
  return side('en', 'e').concat(side('al', 'a').reverse());
}

/* ── WHAT THE BOX OFFERS ──────────────────────────────────────
   Shelves, because one flat list of everything is a junk drawer.
   `make` items build something; `place` items put a thing down. */
const SHELVES = [
  { id: 'scenes', name: 'Scenes',
    note: 'One runs at a time.',
    items: Object.keys(SCENES).map(k => ({
      id: 'scene:' + k, kind: 'scene', scene: k,
      name: SCENES[k].name, mark: SCENES[k].mark, blurb: SCENES[k].blurb,
      act: 'make'
    })) },

  { id: 'pieces', name: 'Pieces',
    note: 'Things on the wood. Moved, scaled, binned.',
    items: [
      { id: 'token', kind: 'token', name: 'Token', mark: '●', act: 'place',
        blurb: 'A body in the world. Drop it on a line to make it a combatant.' },
      { id: 'note',  kind: 'note',  name: 'Note',  mark: '✎', act: 'place',
        blurb: 'Something written down and put on the table.' },
      { id: 'art',   kind: 'art',   name: 'Art',   mark: '❖', act: 'place',
        blurb: 'A picture laid out for everyone.' },
      { id: 'model', kind: 'model', name: 'Model', mark: '♢', act: 'place',
        blurb: 'A 3D model, for looking at.' }
    ] },

  { id: 'papers', name: 'Papers',
    note: 'Records you read. A page can be taken out and put down.',
    items: [
      { id: 'sheet', kind: 'sheet', name: 'Character record', mark: '☷', act: 'open',
        blurb: 'Opens on your own end.' },
      { id: 'page',  kind: 'page',  name: 'A page',           mark: '☰', act: 'place',
        blurb: 'Taken out of a book and put on the table for everyone.' }
    ] }
];

/* the value a fresh scene's options start at */
function defaultOptions(sceneKind) {
  const def = SCENES[sceneKind];
  const out = {};
  if (!def) return out;
  def.options.forEach(k => { if (OPTIONS[k]) out[k] = OPTIONS[k].def; });
  return out;
}

/* ── coercion ─────────────────────────────────────────────────
   Every form control hands back a string: a number field's value is
   "12", not 12. Left alone that string reaches storage, survives a
   reload, and then battlefield width is a string being used for
   arithmetic. Coerce by the field's declared type, in one place, so
   whatever route a value takes in it arrives the same shape.        */
function coerceField(field, value) {
  if (!field) return value;
  /* a terrain nobody has heard of — an old save, a typo on the wire — is
     the meadow, not a field with no sky */
  if (field.type === 'terrain') return terrainOf(value == null ? field.def : String(value));
  if (field.type === 'number') {
    const n = parseInt(value, 10);
    const v = Number.isFinite(n) ? n : (field.def || 0);
    return Math.max(field.min == null ? -Infinity : field.min,
           Math.min(field.max == null ? Infinity : field.max, v));
  }
  return value == null ? '' : String(value);
}

/* the whole of a scene's setup, each field coerced by its own type */
function coerceSetup(sceneKind, setup) {
  const def = SCENES[sceneKind];
  const out = defaultSetup(sceneKind);
  if (!def || !setup) return out;
  def.setup.forEach(f => {
    if (Object.prototype.hasOwnProperty.call(setup, f.key)) {
      out[f.key] = coerceField(f, setup[f.key]);
    }
  });
  return out;
}

/* the value a fresh scene's setup starts at */
function defaultSetup(sceneKind) {
  const def = SCENES[sceneKind];
  const out = {};
  if (!def) return out;
  def.setup.forEach(f => { out[f.key] = (f.def !== undefined ? f.def : ''); });
  return out;
}

/* ── A FEATURE, CLEANED ON THE WAY IN ─────────────────────────
   Features arrive from presets, from the wire and from old saves. One
   feature per slot, only kinds that exist, only lines that exist. */
function coerceFeatures(list, lines) {
  const keys = new Set((lines || []).map(l => l.key));
  const seen = new Set(), out = [];
  (Array.isArray(list) ? list : []).forEach(f => {
    if (!f || !FEATURES[f.kind]) return;
    if (keys.size && !keys.has(f.line)) return;
    const col = Math.max(0, parseInt(f.col, 10) || 0);
    const at = f.line + ':' + col;
    if (seen.has(at)) return;
    seen.add(at);
    out.push({ line: String(f.line), col, kind: f.kind });
  });
  return out;
}

const api = { OPTIONS, SCENES, SHELVES, MODELS, TERRAINS, TERRAIN_ORDER, FEATURES, FEATURE_ORDER,
               blankLines, defaultOptions, defaultSetup, coerceField, coerceSetup,
               coerceFeatures, terrainOf };
root.TableContent = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : globalThis);
