/* ══════════════════════════════════════════════════════════════
   79-token-glyph.js — WHAT A TOKEN LOOKS LIKE, AS A PICTURE.

   Every one of the twenty-nine tokens has its own small picture, so a token on a
   piece reads at a glance without anybody having to learn two-letter codes.
   The SHAPE says what kind it is — a round green seal is good for you, an
   amber diamond is neutral, a red hexagon is bad — and the picture inside says
   which: a drop for Bleed, a shield for Hardened, a boot for Prone.

   Pure markup. No state. Read by the board (81-battle-view.js) and the card
   (82-battle-ui.js); the rules text they pair with is RULES.TOKENS' own.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';
const G = {
 /* GOOD */
 Crit:        '<path d="M12 3l2.2 6.3 6.5.2-5.2 3.9 1.9 6.4L12 15.6 6.6 19.8l1.9-6.4L3.3 9.5l6.5-.2z" fill="#fff"/>',
 Riposte:     '<path d="M5 19L17 7M14 5h5v5M19 19L7 7M5 10V5h5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 Dodge:       '<path d="M6 18c0-6 4-10 12-10M18 8l-4-3M18 8l-3 4" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 Hardened:    '<path d="M12 3l7 3v6c0 4.4-3 7.2-7 9-4-1.8-7-4.6-7-9V6z" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 3v18c4-1.8 7-4.6 7-9V6z" fill="#fff"/>',
 Impenetrable:'<path d="M12 3l7 3v6c0 4.4-3 7.2-7 9-4-1.8-7-4.6-7-9V6z" fill="#fff"/><circle cx="12" cy="11.5" r="2.6" fill="#2f7a3b"/>',
 Guarded:     '<path d="M12 3l7 3v6c0 4.4-3 7.2-7 9-4-1.8-7-4.6-7-9V6z" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="10" r="2.2" fill="#fff"/><path d="M8 16c.8-2.4 2.2-3.4 4-3.4s3.2 1 4 3.4" fill="#fff"/>',
 Guard:       '<path d="M12 3l7 3v6c0 4.4-3 7.2-7 9-4-1.8-7-4.6-7-9V6z" fill="#fff"/><path d="M8 12l3 3 5-6" stroke="#2f7a3b" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 Inspiration: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
 'Greater Inspiration':'<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="12" r="2.4" fill="#fff"/>',
 Swiftness:   '<path d="M3 8h8M2 12h12M5 16h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M15 6l6 6-6 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 Determination:'<path d="M12 21c-5-3-7-6-7-9.5C5 8 7 6.5 9 6.5c1.4 0 2.4.7 3 1.8.6-1.1 1.6-1.8 3-1.8 2 0 4 1.5 4 5C19 15 17 18 12 21z" fill="#fff"/>',
 /* NEUTRAL */
 Taunt:       '<path d="M5 9h5l7-4v14l-7-4H5z" fill="#fff"/><path d="M19 9c1.4 1 1.4 5 0 6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
 Goad:        '<path d="M12 4v10M8 10l4 4 4-4" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="19" r="2.2" fill="#fff"/>',
 Rooted:      '<path d="M12 3v9M12 12l-5 6M12 12l5 6M12 12v9M9 18l-3 3M15 18l3 3" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
 Immobilize:  '<circle cx="8" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="16" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M8 12h8" stroke="#fff" stroke-width="2.4"/>',
 Stealth:     '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="12" r="2.8" fill="#fff"/><path d="M4 20L20 4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
 /* BAD */
 Daze:        '<path d="M12 12m0 0c0-2 3-2 3 0s-5 2-5-1.5S17 6 17 11s-3 8-8 8-8-3-8-8" transform="translate(3 0) scale(.9)" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M12 12c0-1.6 2.4-1.6 2.4 0s-3.6 1.8-3.6-1.6 5.6-3.6 5.6 1.8-4.6 6-7.6 4.6-4.4-4.8-2-7.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" transform="translate(0 0)"/>',
 Stun:        '<path d="M12 4l1.7 4.2 4.3.4-3.3 2.9 1 4.4L12 13.7 8.3 15.9l1-4.4L6 8.6l4.3-.4z" fill="#fff"/><circle cx="5.5" cy="18.5" r="1.8" fill="#fff"/><circle cx="18.5" cy="18.5" r="1.8" fill="#fff"/><circle cx="12" cy="20.5" r="1.4" fill="#fff"/>',
 Blind:       '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M5 5l14 14" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>',
 Weakened:    '<path d="M14 4l-8 10 5 1-1 5 8-10-5-1z" fill="#fff"/>',
 Vulnerable:  '<path d="M12 3l7 3v6c0 4.4-3 7.2-7 9-4-1.8-7-4.6-7-9V6z" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 5l-2 5 3 2-2 5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
 Brittle:     '<path d="M4 8l5 3-3 4 6 2-1 4M20 8l-5 3 3 4-6 2" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 Bleed:       '<path d="M12 3c-3 4.5-6 7.4-6 10.8A6 6 0 0 0 12 20a6 6 0 0 0 6-6.2C18 10.4 15 7.500 12 3z" fill="#fff"/>',
 Blight:      '<circle cx="12" cy="11" r="6" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="9.6" cy="10" r="1.5" fill="#fff"/><circle cx="14.4" cy="10" r="1.5" fill="#fff"/><path d="M9 20v-2.5M12 20v-2.5M15 20v-2.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
 Fire:        '<path d="M12 2c1 4 5 5.600 5 11a5 5 0 0 1-10 0c0-2.200 1-3.600 2.400-4.800C9.400 10 10 11 11 11.400 11.600 8.200 11 5 12 2z" fill="#fff"/>',
 Winded:      '<path d="M3 9h10a3 3 0 1 0-3-3M3 14h14a3 3 0 1 1-3 3M3 19h7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
 Debilitated: '<path d="M12 4v14M6 12l6 6 6-6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 Helpless:    '<path d="M7 11V6.500a1.500 1.500 0 0 1 3 0V11M10 11V5a1.500 1.500 0 0 1 3 0v6M13 11V6a1.500 1.500 0 0 1 3 0v6M16 12V9a1.500 1.500 0 0 1 3 0v5c0 4-2 7-6 7-3.500 0-5-2-7-5.500-.8-1.400 1-2.500 2-1.500l1 1.500" fill="#fff"/>',
 Prone:       '<circle cx="5.500" cy="15" r="2.200" fill="#fff"/><path d="M8 16h11M12 16l-1-4M16 16l1 4M19 16l2-3" stroke="#fff" stroke-width="2.600" fill="none" stroke-linecap="round"/>',
};
const KIND={Crit:'g',Riposte:'g',Dodge:'g',Hardened:'g',Impenetrable:'g',Guarded:'g',Guard:'g',Inspiration:'g','Greater Inspiration':'g',Swiftness:'g',Determination:'g',
 Taunt:'n',Goad:'n',Rooted:'n',Immobilize:'n',Stealth:'n',
 Daze:'b',Stun:'b',Blind:'b',Weakened:'b',Vulnerable:'b',Brittle:'b',Bleed:'b',Blight:'b',Fire:'b',Winded:'b',Debilitated:'b',Helpless:'b',Prone:'b'};
const COL={g:'#2f7a3b',n:'#b78a1c',b:'#a02c26'}, RIM={g:'#7fd48a',n:'#f0cf6e',b:'#f08a80'};
const SHAPE={ g:c=>`<circle cx="12" cy="12" r="11" fill="${COL.g}" stroke="${RIM.g}" stroke-width="1.2"/>`,
  n:c=>`<path d="M12 .8L23.200 12 12 23.200.8 12z" fill="${COL.n}" stroke="${RIM.n}" stroke-width="1.2"/>`,
  b:c=>`<path d="M12 .8l9.700 5.600v11.200L12 23.200 2.300 17.600V6.400z" fill="${COL.b}" stroke="${RIM.b}" stroke-width="1.2"/>` };


const names = Object.keys(G);
const svg = n => { const k = KIND[n]; if (!G[n]) return ''; return '<svg viewBox="0 0 24 24" aria-hidden="true">' + SHAPE[k]() + '<g transform="translate(12 12) scale(.64) translate(-12 -12)">' + G[n] + '</g></svg>'; };
/* the picture at a size, or — for a token the rules gained after this was drawn — a plain seal with two letters */
const html = (n, px) => G[n]
  ? '<i class="bt-gl" style="width:' + px + 'px;height:' + px + 'px">' + svg(n) + '</i>'
  : '<i class="bt-gl bt-gl-x" style="width:' + px + 'px;height:' + px + 'px">' + String(n).slice(0, 2) + '</i>';
/* which of the three kinds, from the shape table here or — if it is new — the rules' own sign */
const kind = n => KIND[n] || ((root.RULES && root.RULES.TOKENS && root.RULES.TOKENS[n]) ? ({ good: 'g', neutral: 'n', bad: 'b' }[root.RULES.TOKENS[n].sign] || 'n') : 'n');
root.TokenGlyph = { names, has: n => !!G[n], kind, svg, html };
if (typeof module !== 'undefined' && module.exports) module.exports = root.TokenGlyph;

})(typeof window !== 'undefined' ? window : globalThis);
