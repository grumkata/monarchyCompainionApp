/* ══════════════════════════════════════════════════════════════
   65-token-look.js — WHAT A COUNTER LOOKS LIKE.

   grumkata: "tokens souldnt look how they currently look".

   They were plastic. A nameless body was a KayKit meeple, a character
   was a pawn and a formation was a little flag, in toy red and toy
   blue — board-game bits, which is exactly what they looked like: a
   stand-in for a person rather than a picture of one. The painted
   figures the field has always stood on the battlefield were never
   used on the table at all.

   So a counter wears a PICTURE now, and there are two ways to wear it,
   chosen on the workbench before it is put down:

     STANDEE   the figure printed and stood up on a turned base, the
               way a card miniature is. The base's band is the side's
               tincture, so allegiance reads without a label. This is
               the one that stands on the wood in 3D (27-table-gl.js).
     COIN      a round counter lying flat, the picture in a rim of the
               side's tincture — a top-down VTT token, which reads best
               from straight above and is what the battle mat uses.

   The picture itself is, in order: a portrait somebody gave it (off the
   record, off their machine, out of the art shelf), or one of the painted
   figures, or — when nobody chose — a figure picked by side and size so
   an empty counter is still a person and not a letter in a circle.

   Nothing in here holds state or touches the model. It is asked "what
   does this look like" by 46-figures.js (the toolbox and the wood),
   32-combat-app.js (the mat), 27-table-gl.js (the 3D standee) and
   37-scene-field.js (the field), so all four agree.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* the painted figures, by NAME — a top-level `const SPRITES` is not on
   window (48-library.js has the long version of why) */
const sprites = () => (typeof SPRITES !== 'undefined' ? SPRITES : null);

const FIG_NAMES = { spearman: 'Spearman', archer: 'Archer', axeman: 'Axeman',
                    skeleton: 'Skeleton', lich: 'Lich' };
function figures() {
  const S = sprites(); if (!S) return [];
  return Object.keys(S).map(k => ({ id: k, name: FIG_NAMES[k] || k, src: S[k].src, w: S[k].w }));
}

/* An empty counter still has somebody on it. Chosen by side and size, so
   the default enemy is not the same man as the default ally. */
function defaultFig(side, kind) {
  if (side === 'en') return kind === 'large' ? 'lich' : 'skeleton';
  return kind === 'large' ? 'axeman' : 'spearman';
}

/* ── THE PICTURE ───────────────────────────────────────────────
   `cut` says whether the picture is a CUTOUT — a painted figure on a clear
   ground, which stands on its own — or a PORTRAIT, a rectangle with its own
   background, which has to be framed. The same picture is drawn two
   different ways depending on which it is. */
function pic(v) {
  v = v || {};
  const S = sprites();
  const isSprite = id => /^sprite:/.test(id || '');
  if (v.src) {
    const fromSprite = isSprite(v.art) || (S && Object.keys(S).some(k => S[k].src === v.src));
    return { src: v.src, cut: !!fromSprite };
  }
  if (v.art && root.Library) {
    const a = root.Library.art.get(v.art);
    if (a && a.src) return { src: a.src, cut: isSprite(v.art) };
  }
  const fig = (v.fig && S && S[v.fig]) ? v.fig : defaultFig(v.side, v.entKind || v.kind);
  if (S && S[fig]) return { src: S[fig].src, cut: true, fig: fig };
  return { src: '', cut: false };
}

/* which figure a sprite src IS, if it is one — the field stands the same
   painted figure on the battlefield that the counter wears on the table */
function figOf(v) {
  const S = sprites(); if (!S) return null;
  const p = pic(v);
  if (p.fig) return p.fig;
  if (v && v.art && /^sprite:/.test(v.art)) return v.art.slice(7);
  const k = Object.keys(S).find(x => S[x].src === p.src);
  return k || null;
}

const LOOKS = [['standee', 'Standee'], ['coin', 'Coin']];
const lookOf = v => (v && v.look === 'coin') ? 'coin' : 'standee';

/* two letters, for the one case with no picture at all */
const mono = n => {
  const w = String(n || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '??';
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
};

/* ── A COIN ────────────────────────────────────────────────────
   Pure markup and CSS (14-war.css): a disc, the picture inside it and a
   rim in the side's tincture. A cutout figure stands on a painted ground
   inside the coin; a portrait fills it. `px` is its diameter. */
function coin(v, px, extra) {
  v = v || {};
  const p = pic(v);
  const side = v.side === 'en' ? 'en' : 'al';
  const kind = v.entKind || v.kind || 'unit';
  return `<span class="tl-coin ${side} k-${esc(kind)}${p.cut ? ' cut' : ' port'}${extra ? ' ' + extra : ''}"` +
         ` style="--d:${Math.round(px || 44)}px">` +
           (p.src ? `<i class="tl-art" style="background-image:url('${esc(p.src)}')"></i>`
                  : `<b class="tl-mono">${esc(mono(v.name))}</b>`) +
           `<u class="tl-rim"></u>` +
         `</span>`;
}

/* ── A STANDEE, DRAWN FLAT ─────────────────────────────────────
   For everywhere the 3D one cannot go: a slot in the toolbox, the
   workbench's stage, a GL-less machine. The picture stands on an
   ellipse that is the base seen from a little above, band and all. A
   formation is its figure three times over on a long base. */
function standee(v, px) {
  v = v || {};
  const p = pic(v);
  const side = v.side === 'en' ? 'en' : 'al';
  const kind = v.entKind || v.kind || 'unit';
  const n = kind === 'form' ? 3 : 1;
  const card = p.src
    ? Array.from({ length: n }, (_, i) =>
        `<i class="tl-card${p.cut ? ' cut' : ' port'}" style="--i:${i};background-image:url('${esc(p.src)}')"></i>`).join('')
    : `<b class="tl-mono">${esc(mono(v.name))}</b>`;
  return `<span class="tl-stand ${side} k-${esc(kind)}" style="--d:${Math.round(px || 80)}px">` +
           `<span class="tl-figs">${card}</span>` +
           `<span class="tl-base"><u></u></span>` +
         `</span>`;
}

/* whichever the counter is */
function html(v, px) { return lookOf(v) === 'coin' ? coin(v, px) : standee(v, px); }

/* the colours the GL base is painted in, from Blazon's own tinctures */
const TINCT = { al: '#27508f', en: '#a3232b', or: '#c9a227', sable: '#171310' };

root.TokenLook = { figures, defaultFig, pic, figOf, coin, standee, html,
                   LOOKS, lookOf, mono, TINCT, FIG_NAMES };
if (typeof module !== 'undefined' && module.exports) module.exports = root.TokenLook;

})(typeof window !== 'undefined' ? window : globalThis);
