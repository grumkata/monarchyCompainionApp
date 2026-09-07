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
    /* MEASURED, not guessed. .cwin is 1180 wide and the eight lines make it
       1426 tall; the 720 that used to be here is why a scene "fitted" to the
       middle of the table still hung off the bottom of it. */
    size: { w: 1180, h: 1426 },
    setup: [
      { key: 'width', label: 'Battlefield width', type: 'number',
        def: 8, min: 3, max: 14,
        hint: 'Slots across. Small is about 5, large about 12.' },
      { key: 'model', label: 'Immersive battlefield', type: 'model',
        from: 'battlefield', def: 'none',
        hint: 'The model the immersive view stands the fight on.' }
    ],
    /* depth is 8 lines, from the rules — not a choice */
    fixed: { lines: 8 },
    options: ['fog', 'mana', 'flex', 'npcAuto']
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
   Empty. The demo army in 32-combat-app.js is a fixture for testing
   the drop rules, not the state a scene begins in — pulling a combat
   scene out of the box and finding somebody else's Hollow Knight
   already on it is not a scene, it is a save file.

   Four lines a side, back to front, and they are DATA: the sheet
   renders whatever is in this array, so lines can be renamed, added
   and removed while the fight is running (see 41-lines-edit.js).
   `depth` is the line's distance from its own backline and is what
   move speed is counted in.                                        */
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

const api = { OPTIONS, SCENES, SHELVES, MODELS, blankLines,
               defaultOptions, defaultSetup, coerceField, coerceSetup };
root.TableContent = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : globalThis);
