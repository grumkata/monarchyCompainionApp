/* ══════════════════════════════════════════════════════════════
   51-preview.js — A PREVIEW IS THE THING, MADE SMALL.

   grumkata, twice, the second time in capitals: "for scenes and combat
   YOU STILL ARNT SHOWING WHAT YOUR PUTTING DOWN FFS".

   He was right, and the reason is worth writing down. The box drew a
   scene as an ICON of a scene — a little green grid of pips for combat,
   a cartoon hill for exploration. Those were drawings ABOUT the thing.
   What actually lands on the wood is the battlefield sheet: parchment,
   a title bar, a round counter, a mana pool, eight named ranks with
   their slot counts and the Line down the middle. A grid of green pips
   is not a smaller version of that. It is a different object.

   So this file builds the REAL sheet, empty, at the real size, out of
   the SAME class names 32-combat-app.js renders the live one with, and
   then scales the whole thing down into whatever box it has been given.
   A miniature, not an impression. When the sheet changes, this changes
   with it, because it is made of the sheet's own parts.

   Everything here is empty-state on purpose: an empty sheet is exactly
   what you get when you put a new scene down, so this is not a
   flattering picture of the thing, it is the thing.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* the lines a new fight starts with, from the one place that decides */
function lines() {
  const C = root.TableContent;
  return C && C.blankLines ? C.blankLines() : [];
}
function sizeOf(kind) {
  const C = root.TableContent, d = C && C.SCENES && C.SCENES[kind];
  return d && d.size ? d.size : { w: 1180, h: 1000 };
}

/* ── ONE RANK ─────────────────────────────────────────────────
   32-combat-app.js's lineHTML, with the parts that need live state
   removed: no units, no ghost, no over-cap warning, because a scene you
   are about to put down has none of those. The classes are the same
   ones, so the stylesheet dresses it identically. */
function line(l, deep, w) {
  const bars = Array.from({ length: deep },
    (_, i) => `<i class="${i === l.depth ? 'on' : ''}"></i>`).join('');
  const cells = Array.from({ length: w },
    (_, i) => `<div class="free" data-col="${i}"></div>`).join('');
  return `<div class="line${l.front ? ' front' : ''} empty">
    <div class="tab"><span class="depth">${bars}</span><span>${esc(l.label)}</span></div>
    <div class="rank" style="--w:${w}">${cells}</div>
    <div class="cap"><b>0<em>/${w}</em></b><span>slots</span></div></div>`;
}

/* ── THE SHEET'S OWN CHROME ───────────────────────────────────
   table-body.html's .cwin, kept in step with it by hand — the live one
   is a single element in the page and cannot be cloned before a scene
   exists, so this is the one duplication in the file and it is here
   rather than anywhere else so there is exactly one of it. */
/* `fight` decides whether the sheet carries the combat top bar. It used
   to be unconditional, so an EXPLORATION scene — a map you walk — and a
   STAGE — a backdrop to roleplay against — were both drawn with a round
   counter, Players/Allies/Enemies phases, a "Battlefield" label and an
   End Turn button. A scene about walking a map does not have rounds. */
function sheet(name, body, extra, fight) {
  return `<div class="face cwin"${extra || ''}>
    <div class="wtitle"><span><span>${esc(name)}</span></span></div>
    ${fight === false ? '' : `<div class="topbar">
      <div class="tb"><span class="tb-l">Round</span><span class="round">01</span></div>
      <div class="phases"><div class="ph now">Players</div><div class="ph">Allies</div><div class="ph">Enemies</div></div>
      <div class="tb" style="min-width:128px"><span class="tb-l">Battlefield</span>
        <span style="font-family:var(--f-disp);font-size:11px;letter-spacing:.09em">${esc(extra ? '' : '')}</span></div>
      <!-- NOT A <button>. A slot in the plank IS a <button>, and the HTML
           parser closes an open button the moment it meets a nested one —
           which hoisted the whole sheet out of its slot and stretched the
           plank across half the screen. Nothing in a preview may be an
           interactive element: it is a picture of the thing. -->
      <div class="endturn"><span class="et">End Turn<small>SPACE</small></span></div>
    </div>`}
    ${body}
  </div>`;
}

/* ── COMBAT ───────────────────────────────────────────────────
   The board you are about to put down, at the width you are choosing
   right now — so widening the battlefield in your hand widens the
   board in front of you before you let go of it. */
function combat(v) {
  const w = Math.max(3, Math.min(14, (v && v.width) || 8));
  const ls = lines();
  const en = ls.filter(l => l.side === 'en'), al = ls.filter(l => l.side === 'al');
  const half = (cls, plaque, arr) =>
    `<div class="half ${cls}"><div class="plaque">${plaque}</div>
       <div class="board frame diaper" style="--w:${w}">${
         arr.map(l => line(l, arr.length, w)).join('')}</div></div>`;
  const body = `<div class="field"><div class="boards">
      ${half('en', 'Enemy', en)}
      <div class="mid"><span>The Line</span></div>
      ${half('al', 'Ally', al)}
    </div></div>
    <div class="selbar none"></div>`;
  return sheet('Combat', body, '', true);
}

/* ── EXPLORATION AND STAGE ────────────────────────────────────
   Same sheet, and the picture you chose IS the preview: what lands is
   this map under this title bar. Before one is chosen it says so, in
   the space the map will occupy, rather than drawing a pretend hill. */
function picture(name, src, cls, empty) {
  const body = `<div class="field pv-pic ${cls}">${
    src ? `<img alt="" src="${esc(src)}">`
        : `<span class="pv-none">${esc(empty)}</span>`}</div>`;
  return sheet(name, body, '', false);
}

/* ══ THE ONE ENTRY POINT ═══════════════════════════════════════
   `box` is the longest side it must fit inside. The sheet is built at
   its true size and scaled — the same trick 46-figures.js uses, for the
   same reason: one piece of markup is a 76px slot and a full-size ghost
   over the wood with no second stylesheet. */
function scene(kind, v, box) {
  const s = sizeOf(kind);
  const html = kind === 'combat'      ? combat(v)
             : kind === 'exploration' ? picture('Exploration', v && v.map, 'map',
                                                'A map goes here')
             : kind === 'stage'       ? picture('Stage', v && v.backdrop, 'stage',
                                                'A backdrop goes here')
             : null;
  if (html === null) return null;
  const k = (box || 120) / Math.max(s.w, s.h);
  return `<span class="pv" style="width:${s.w}px;height:${s.h}px;` +
         `transform:translate(-50%,-50%) scale(${k.toFixed(5)})">${html}</span>`;
}

root.Preview = { scene, sizeOf };

})(window, document);
