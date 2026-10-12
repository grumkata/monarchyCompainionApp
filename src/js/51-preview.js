/* ══════════════════════════════════════════════════════════════
   51-preview.js — A PREVIEW IS THE THING, MADE SMALL.

   grumkata, twice, the second time in capitals: "for scenes and combat
   YOU STILL ARNT SHOWING WHAT YOUR PUTTING DOWN FFS".

   He was right, and the reason is worth writing down. The box drew a
   scene as an ICON of a scene — a little green grid of pips for combat,
   a cartoon hill for exploration. Those were drawings ABOUT the thing.
   What lands on the wood for a fight is the BOARD: eight lanes of felt in
   a wooden frame and the brass Line between the frontlines. A grid of pips is not a
   smaller version of that. It is a different object.

   So this file builds the REAL board, empty, at the real size, out of the
   board's own measurements (80-battle.js) and its own lane colours
   (81-battle-view.js), and then scales the whole thing down into whatever
   box it has been given. A miniature, not an impression: widen the board in
   your hand and the one you will put down gets longer. A map and a backdrop
   are a picture under a title bar.

   Everything here is empty-state on purpose: an empty board is exactly
   what you get when you put a new scene down, so this is not a
   flattering picture of the thing, it is the thing.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function sizeOf(kind) {
  const C = root.TableContent, d = C && C.SCENES && C.SCENES[kind];
  return d && d.size ? d.size : { w: 1180, h: 1000 };
}

/* ── A WINDOW ON THE WOOD ─────────────────────────────────────
   A map or a backdrop is a sheet under a title bar, and that is all the
   preview of one draws. (The combat board has no sheet: it is drawn below,
   from the board's own measurements.) */
function sheet(name, body, extra) {
  return `<div class="face cwin"${extra || ''}>
    <div class="wtitle"><span><span>${esc(name)}</span></span></div>
    ${body}
  </div>`;
}

/* ── COMBAT ───────────────────────────────────────────────────
   The board you are about to put down, at the width you are choosing
   right now — so widening the battlefield in your hand lengthens the
   board in front of you before you let go of it. Built at the board's own
   measurements (80-battle.js), looked at from straight above: eight lanes,
   the brass Line between the frontlines. */
function combatGeo(v) {
  const B = root.Battle;
  return B ? B.geometry({ id: 'pv', scene: 'combat', setup: { width: (v && v.width) || 8 } }) : null;
}
function combat(v) {
  const B = root.Battle, C = root.TableContent, V = root.BattleView, g = combatGeo(v);
  if (!B || !C || !g) return '';
  const G = B.G, ter = C.terrainOf(v && v.terrain), ground = C.TERRAINS[ter].mat.ground;
  const W = g.W, Hb = g.Hb, bx = (W - (g.bw + 2 * G.FRAME)) / 2, by = G.HEAD;
  const box = (x, y, w, h, css) => `<i style="position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(w)}px;height:${Math.round(h)}px;${css}"></i>`;
  let html = box(bx, by, g.bw + 2 * G.FRAME, Hb, 'background:linear-gradient(#8a5f34,#6a4524);border-radius:6px;box-shadow:0 14px 30px #0008');
  g.lines.forEach((l, i) => {
    const x = bx + G.FRAME + (g.n - 1 - i) * G.LW;
    const col = V && V.laneColour ? V.laneColour(l, i, ground) : (l.side === 'en' ? '#66402f' : '#365270');
    html += box(x + 3, by + G.FRAME + 3, G.LW - 6, g.bh - 6, 'background:' + col + ';border:3px solid #e8c35f55;box-sizing:border-box') +
      `<b style="position:absolute;left:${Math.round(x)}px;top:${by + G.FRAME + 14}px;width:${G.LW}px;text-align:center;font:700 22px Cinzel,Georgia,serif;letter-spacing:.06em;color:${l.side === 'en' ? '#ffc4b0' : '#b8d6ff'};text-transform:uppercase">${esc(l.label)}</b>`;
  });
  const eN = g.lines.filter(l => l.side === 'en').length;
  html += box(bx + G.FRAME + (g.n - eN) * G.LW - 5, by + G.FRAME, 10, g.bh, 'background:#e8c35f');
  return html;
}

/* ── EXPLORATION AND STAGE ────────────────────────────────────
   Same sheet, and the picture you chose IS the preview: what lands is
   this map under this title bar. Before one is chosen it says so, in
   the space the map will occupy, rather than drawing a pretend hill. */
function picture(name, src, cls, empty) {
  const body = `<div class="field pv-pic ${cls}">${
    src ? `<img alt="" src="${esc(src)}">`
        : `<span class="pv-none">${esc(empty)}</span>`}</div>`;
  return sheet(name, body, '');
}

/* ══ THE ONE ENTRY POINT ═══════════════════════════════════════
   `box` is the longest side it must fit inside. The sheet is built at
   its true size and scaled — the same trick 46-figures.js uses, for the
   same reason: one piece of markup is a 76px slot and a full-size ghost
   over the wood with no second stylesheet. */
function scene(kind, v, box) {
  const g = kind === 'combat' ? combatGeo(v) : null;
  const s = g ? { w: g.W, h: g.H } : sizeOf(kind);
  const html = kind === 'combat'      ? combat(v)
             : kind === 'exploration' ? picture('Exploration', v && v.map, 'map',
                                                'A map goes here')
             : kind === 'stage'       ? picture('Stage', v && v.backdrop, 'stage',
                                                'A backdrop goes here')
             : null;
  if (html === null) return null;
  const k = (box || 120) / Math.max(s.w, s.h);
  return `<span class="pv" style="position:absolute;left:50%;top:50%;width:${s.w}px;height:${s.h}px;` +
         `transform:translate(-50%,-50%) scale(${k.toFixed(5)})">${html}</span>`;
}

root.Preview = { scene, sizeOf };

})(window, document);
