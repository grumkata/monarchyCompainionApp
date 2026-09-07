/* ══════════════════════════════════════════════════════════════
   46-figures.js — WHAT A THING LOOKS LIKE, BEFORE IT IS A THING.

   grumkata, twice, and the second time in capitals:

     "the toolbox ui should not be how it is it should be like
      mario maker or minecraft ui where you SEE the item your about
      to put down like a physical thing ... you are giving me
      website ui not game ui"

   A row of nine tiles reading Combat / Exploration / Note / Art is
   a menu with a picture frame round it. In Mario Maker you do not
   read the word "goomba"; a goomba is in your hand. So every offer
   in this app has a FIGURE: a small drawing of the actual object,
   built out of the same materials the real one is built out of.

   The rule from design-language.md, which this file exists to keep:

       NOTHING ON THE TABLE MAY BE A LABEL.

   One figure per kind, drawn face-on. Whoever shows it decides
   where it is pointing: in a hotbar slot it stands up, in your hand
   it is tipped into the table's own plane, and it is the SAME
   markup both times — so what you are holding is what lands.

   Sizes are given as a box; a figure fills it and never overflows,
   because a slot in a bar is 76px and a held piece is 300.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* two letters, the way the counters on the board are lettered */
const mono = n => (root.Tokens ? root.Tokens.monoOf(n) : String(n || '??').slice(0, 2).toUpperCase());

/* ══ A PICTURE, WHATEVER KIND OF PICTURE IT IS ═════════════════
   Three things in this app are pictures and all three end up drawn the same
   way: a raster (`src`, a data URI), a vector out of the charge sheet
   (`svg`), or a named entry in the art library (`art`, an id). One function,
   so a token's face, a piece of art and a scene's backdrop cannot drift
   apart in how they are shown.                                            */
function art(v) {
  if (!v) return '';
  if (v.src) return `<img alt="" src="${esc(v.src)}">`;
  if (v.art && root.Library) {
    const a = root.Library.art.get(v.art);
    if (a && a.src) return `<img alt="" src="${esc(a.src)}">`;
    if (a && a.svg) return svg(a.svg);
  }
  if (v.svg) return svg(v.svg);
  return '';
}
const svg = g => `<svg class="fg-svg" viewBox="${esc(g.v || '0 0 512 512')}"
  preserveAspectRatio="xMidYMid meet" aria-hidden="true">${
    (g.d || []).map(d => `<path d="${esc(d)}"/>`).join('')}</svg>`;

/* ══ THE DRAWINGS ══════════════════════════════════════════════
   Each returns the inside of a figure. `v` is the chosen variant,
   so the drawing changes as you cycle it IN YOUR HAND — which is
   the whole of complaint six: you pick the art before you put it
   down, not after.                                              */

/* A COUNTER: a moulded disc on a plinth — the piece 34-gl-pieces.js stands
   on the board, drawn flat.

   With `v.plate` it also gets its brass base plate, the way a painted
   miniature has its name engraved on the front of its base. That is the
   version that stands on the wood and the version you carry there; the
   version in a hotbar slot has no plate, because a name in a slot is the
   label this whole thing exists to stop being. */
function token(o, v) {
  const side = (v && v.side) || 'al';
  const plate = v && v.plate;
  const hp = v && v.hp;
  const form = (v && v.entKind) === 'form';
  /* A COUNTER CAN HAVE A FACE. From the record's portrait, from the art
     inside the app, or from a picture off your machine — all three arrive
     here as the same thing, a `src`. Design-language rule 5: the side colour
     lives in the RIM, not the fill, so a portrait never fights it. */
  const face = art(v);
  /* ── AND IT STANDS UP ──────────────────────────────────────
     grumkata: "tokens ... are flat for some weird ass reason". They were
     flat because this was the whole of them — a circle with a letter in it,
     lying on the wood. It is an ANCHOR now: 27-table-gl.js measures this
     span every frame and stands the real piece on it, out of the boardgame
     bits pack, in this side's colour. A body of troops gets a standard, a
     record gets a pawn, anybody else gets a meeple; a counter with a face
     gets that face, printed and standing on its own base.

     The disc stays in the markup and is only made invisible, because it is
     what the picture is carried in and what is left if the pack never
     arrives. It is the fallback, not the piece. */
  const shape = form ? 'flag' : (v && v.source) === 'char' ? 'pawn' : 'meep';
  const solid = !!(v && v.stand) && typeof BITS !== 'undefined';
  /* IN A SLOT, THE SAME PIECE, PHOTOGRAPHED. A hotbar slot is at z-index 1200
     and the GL layer is at 870, so a standee drawn over a slot would be behind
     the plank. 27-table-gl.js takes a picture of the piece with the same
     camera it photographs every model with, so what you see in the box is
     what stands on the wood — not a letter in a circle. */
  const pic = (!solid && !face && root.TableGL && root.TableGL.bit)
    ? root.TableGL.bit(shape, side === 'en' ? 'en' : 'al', 128) : null;
  return `<span class="fg fg-tok ${side === 'en' ? 'en' : 'al'}${plate ? ' named' : ''}${
            form ? ' form' : ''}${face ? ' faced' : ''}${solid ? ' standing' : ''}">
            <span class="fg-plinth"></span>
            <span class="fg-disc${pic ? ' shot' : ''}">${
              face || (pic ? `<img alt="" src="${esc(pic)}">`
                           : `<b>${esc(mono(o.name))}</b>`)}${
              /* WHOSE PIECE IS IT. Every pawn is the same pawn, so a tray of
                 six characters would be six identical blue pawns — worse than
                 the letters it replaced. A record's counter keeps its
                 monogram, on a little brass tag the way a painted miniature
                 is labelled underneath. An NPC or a formation gets none:
                 "SE" for "Someone else" was never information. */
              (pic && shape === 'pawn') ? `<b class="fg-mono">${esc(mono(o.name))}</b>` : ''
            }</span>
            ${solid ? `<span class="fg-stand"
                 data-stand="${shape}|${side === 'en' ? 'en' : 'al'}|${
                   face ? '1' : '0'}"></span>` : ''}
            ${plate ? `<span class="fg-plate">
                 <i${v.id ? ` data-rename="${esc(v.id)}" title="Rename"` : ''}
                    >${esc(plate)}</i>
                 ${hp ? `<u>${esc(hp)}</u>` : ''}
                 ${v.id ? `<b class="fg-side" data-side-of="${esc(v.id)}"
                              title="Ally or enemy"></b>` : ''}
               </span>` : ''}
          </span>`;
}

/* paper: ruled, dog-eared, lying slightly off square */
function note(o, v) {
  const tint = (v && v.tint) || 'cream';
  return `<span class="fg fg-note t-${esc(tint)}">
            <span class="fg-lines"></span>
            <span class="fg-ear"></span>
          </span>`;
}

/* THE PICTURE, AND NOTHING AROUND IT.
   It used to be drawn inside a gilt frame, which is a thing this app decided
   to add to your artwork — "artwork ... having a border for some weird
   reason". A picture put on a table is the picture. Only the empty case,
   before one has been chosen, draws anything of its own. */
function picture(o, v) {
  const inside = art(v);
  return `<span class="fg fg-art${inside ? ' has' : ''}">${
    inside || `<span class="fg-blank"></span>`}</span>`;
}

/* a page out of a book: torn spine edge, a drop cap, set text */
function page(o, v) {
  const rule = (v && v.rule) || 'set';
  return `<span class="fg fg-page r-${esc(rule)}">
            <span class="fg-tear"></span>
            <span class="fg-cap"></span>
            <span class="fg-set"></span>
          </span>`;
}

/* ── A MODEL IS A PICTURE OF THAT MODEL ───────────────────────
   grumkata: "toolbox previews should be previews not an artist
   interpretation". 27-table-gl.js renders the real asset into a little
   canvas once and caches it, so what you are looking at in the box is the
   object itself from three quarters on. The three-faced block below is only
   what stands in for a model you have not chosen yet. */
function model(o, v) {
  const id = v && v.model;
  const shot = id && root.TableGL && root.TableGL.thumb
    ? root.TableGL.thumb(id, 192) : null;
  if (shot) return `<span class="fg fg-model shot"><img alt="" src="${esc(shot)}"></span>`;
  return `<span class="fg fg-model">
            <span class="cu t"></span><span class="cu l"></span><span class="cu r"></span>
          </span>`;
}

/* the record: a folded sheet with a portrait block and its numbers */
function sheet(o, v) {
  return `<span class="fg fg-sheet">
            <span class="fg-band"></span>
            <span class="fg-port"></span>
            <span class="fg-pips"></span>
          </span>`;
}

/* ── the scenes, each a miniature of the real thing ──────────── */

/* the battlefield: eight ranks, as many columns as the width you
   are holding. Cycle the width and the board GETS WIDER in your
   hand — the setting is the picture, not a number in a dialog. */
/* ── A SCENE IS THE SHEET, MADE SMALL ─────────────────────────
   grumkata, twice, the second time shouting: "for scenes and combat YOU
   STILL ARNT SHOWING WHAT YOUR PUTTING DOWN FFS". These three drew an ICON
   of a scene — a grid of green pips, a cartoon hill, a curtain. What lands
   is a battlefield sheet: parchment, a title bar, a round counter, eight
   named ranks with their slot counts, the Line down the middle. An icon of
   a thing is not a smaller version of that thing.

   51-preview.js builds the REAL sheet, empty, at its real size, out of the
   sheet's own class names, and scales it into the box. What is below each
   of these three is only the fallback for a page where that file is
   missing. */
function combat(o, v) {
  const pv = root.Preview && root.Preview.scene('combat', v, PVBOX);
  if (pv) return pv;
  const w = Math.max(3, Math.min(14, (v && v.width) || 8));
  const rank = (side, n) =>
    `<span class="mb-rank ${side}">${
      Array.from({ length: w }, (_, i) =>
        `<i${n === 0 && i < Math.min(3, w) ? ' class="on"' : ''}></i>`).join('')
    }</span>`;
  return `<span class="fg fg-board" style="--cols:${w}">
            <span class="mb-half en">${[0,1,2,3].map(n => rank('en', n)).join('')}</span>
            <span class="mb-line"></span>
            <span class="mb-half al">${[3,2,1,0].map(n => rank('al', n)).join('')}</span>
          </span>`;
}

/* a map put down: the picture if one has been chosen, else the
   parchment it will be drawn on */
function explore(o, v) {
  const pv = root.Preview && root.Preview.scene('exploration', v, PVBOX);
  if (pv) return pv;
  const src = v && v.map;
  return `<span class="fg fg-map">${
    src ? `<img alt="" src="${esc(src)}">`
        : `<span class="mp-land"></span><span class="mp-path"></span><span class="mp-x"></span>`
  }</span>`;
}

/* the stage: a backdrop with people standing in front of it */
function stage(o, v) {
  const pv = root.Preview && root.Preview.scene('stage', v, PVBOX);
  if (pv) return pv;
  const src = v && v.backdrop;
  return `<span class="fg fg-stage">
            <span class="st-back">${src ? `<img alt="" src="${esc(src)}">` : ''}</span>
            <span class="st-who a"></span><span class="st-who b"></span>
            <span class="st-floor"></span>
          </span>`;
}

/* The size the sheet is BUILT at before html() scales it into whatever slot
   or hand it is going into. Big enough that the ranks are still ranks. */
const PVBOX = 260;

const DRAW = {
  token, note, art: picture, page, model, sheet,
  'scene:combat': combat,
  'scene:exploration': explore,
  'scene:stage': stage
};

/* which drawing an offer gets */
function keyOf(o) {
  if (!o) return 'note';
  if (o.kind === 'scene') return 'scene:' + o.scene;
  return DRAW[o.kind] ? o.kind : 'note';
}

/* ══ VARIANTS ═════════════════════════════════════════════════
   What you may choose WHILE HOLDING IT. Two shapes:

     · a list — cycled with the wheel or the arrow keys, and shown
       as a rack of the same figure drawn each way.
     · a pick — a file off your machine, asked for the MOMENT you
       take it out of the chest, so you are holding the picture and
       not a promise of one.

   grumkata: "you shouldn't just grab a piece of art and then
   separately choose the art after placing it thats fucking dumb". */
const VARIANTS = {
  'scene:combat': {
    field: 'width',
    of: 'setup',
    list: [
      { width: 5,  name: 'Skirmish' },
      { width: 8,  name: 'Field' },
      { width: 12, name: 'Great field' }
    ],
    start: 1
  },
  'scene:exploration': { field: 'map',      of: 'setup', pick: 'image', need: false },
  'scene:stage':       { field: 'backdrop', of: 'setup', pick: 'image', need: false },
  /* Art has no variants any more: WHICH picture is the choice, and it is
     made in the tray before you are holding anything — out of the art inside
     the app or off your own machine. There is nothing left to cycle. */
  note: {
    field: 'tint', of: 'thing',
    list: [{ tint: 'cream', name: 'Paper' },
           { tint: 'blue',  name: 'Blue paper' },
           { tint: 'red',   name: 'Red paper' }],
    start: 0
  },
  /* which side a counter falls in on is the one thing worth being able to
     flip without opening anything — everything else about a token is set in
     the maker, beside the counter, while you are still holding it */
  token: {
    field: 'side', of: 'ent',
    list: [{ side: 'al', name: 'Ally' }, { side: 'en', name: 'Enemy' }],
    start: 0
  },
  page: {
    field: 'rule', of: 'thing',
    list: [{ rule: 'set',  name: 'Set text' },
           { rule: 'ruled',name: 'Ruled' },
           { rule: 'plain',name: 'Blank' }],
    start: 0
  }
};

const variantsFor = o => VARIANTS[keyOf(o)] || null;

/* ══ HOW BIG ═══════════════════════════════════════════════════
   A figure is drawn at its own natural size and then scaled into
   whatever box it has been given, so the SAME markup is a 76px
   slot and a 320px thing in your hand with no second stylesheet. */
const NATURAL = {
  token: [96, 104], note: [116, 92], art: [124, 96], page: [104, 118],
  model: [104, 96], sheet: [96, 118],
  /* A SCENE'S DRAWING IS THE SHEET'S OWN SHAPE. It used to be a wide
     landscape box because the drawing was a little picture of a battlefield;
     it is the battlefield sheet now, and that is tall. Squeezing a 1180x1426
     sheet into a 160x120 box is how you get a preview that is cut off. */
  'scene:combat': [PVBOX, Math.round(PVBOX * 1426 / 1180)],
  'scene:exploration': [PVBOX, Math.round(PVBOX * 800 / 1180)],
  'scene:stage': [PVBOX, Math.round(PVBOX * 740 / 1180)]
};

/* the natural size of a drawing, which a couple of them vary */
function natural(k, v) {
  const n = NATURAL[k] || [110, 100];
  if (k === 'token') {
    /* A BODY OF TROOPS IS NOT A PERSON. app.js already sizes a formation
       across several slots on the board; the counter has to say so before it
       gets there, so it is drawn as a wide oblong rather than a disc — in the
       tray, in your hand and on the wood. */
    const form = v && v.entKind === 'form';
    if (v && v.plate) return form ? [150, 140] : [116, 140];
    return form ? [124, 104] : n;
  }
  return n;
}

/* the whole figure, boxed. `box` is the side of the square it must
   fit inside. */
function html(o, v, box) {
  const k = keyOf(o);
  const [w, h] = natural(k, v);
  const s = (box || 76) / Math.max(w, h);
  /* data-k0 is this drawing's scale at 100%. The wheel resizes a piece on
     the wood (23-table3d.js scaleUnder) and 24-table-props.js scales the
     drawing in place from this rather than rebuilding it — a rebuild
     mid-gesture throws away the GL object standing on the anchor. */
  return `<span class="fgbox" data-k0="${s.toFixed(4)}" ` +
         `style="width:${w}px;height:${h}px;` +
         `transform:translate(-50%,-50%) scale(${s.toFixed(4)})">` +
         (DRAW[k] || note)(o, v) + `</span>`;
}

/* HOW BIG IT WILL BE ONCE IT IS DOWN, in table units. What you are holding
   is drawn at exactly this, so the shape hovering over the wood is the shape
   that lands — none of "oh, it is bigger than I thought" the moment you let
   go of it.

   A scene's size is the one 21-table-content.js declares, READ FROM THERE
   rather than written down a second time. A combat sheet that said 720 in
   one file and measured 1426 in the browser is exactly how a scene came to
   be fitted to the table and still hang off the front of it. */
function sizeOf(o, v) {
  const k = keyOf(o);
  if (k.slice(0, 6) === 'scene:') {
    const C = root.TableContent;
    const d = C && C.SCENES[o.scene];
    return d && d.size ? { w: d.size.w, h: d.size.h } : { w: 1000, h: 700 };
  }
  /* A COUNTER IS A PIECE YOU PICK UP. At 150x182 on a table 2600 across it
     was a thumbnail — grumkata: "tokens dont look 3d", and a thing too small
     to have a silhouette cannot look like anything. This is roughly a
     miniature's real footprint against a table this size. */
  if (k === 'token') return { w: (v && v.entKind === 'form') ? 330 : 176, h: 212 };
  if (k === 'note')  return { w: 300, h: 210 };
  if (k === 'page')  return { w: 300, h: 340 };

  /* ── A PICTURE ARRIVES AT ITS OWN PROPORTIONS ──────────────
     "artwork not autofitting to the image". 49-pictures.js decoded it on the
     way in, so the shape is known before it lands and the box that lands is
     that shape — not a 420x320 slot that every picture is squeezed into. */
  if (k === 'art') {
    const P = root.Pictures;
    if (v && v.w && v.h && P) return P.fit(v.w, v.h, 520);
    /* a library entry that is a vector has no pixels to measure */
    return { w: 380, h: 380 };
  }

  /* a model stands as wide on the wood as its own entry says it does —
     a mushroom is not a tree */
  if (k === 'model') {
    const m = v && v.model && root.Library && root.Library.models.get(v.model);
    const f = m ? m.foot : 240;
    return { w: f, h: f };
  }
  return { w: 300, h: 260 };
}

root.Figures = { html, keyOf, variantsFor, sizeOf, natural, VARIANTS, NATURAL };
if (typeof module !== 'undefined' && module.exports) module.exports = root.Figures;

})(typeof window !== 'undefined' ? window : globalThis,
   typeof document !== 'undefined' ? document : null);

