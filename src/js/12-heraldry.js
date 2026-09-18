/* ══════════════════════════════════════════════════════════════
   HERALDRY — the drawing system for the whole menu.

   Every banner in the hall, the arms you march under, the banner behind
   your chair at the table and the flag maker all render from ONE record:

     { div, a, b, line,       the field, its two tinctures, and the LINE it
                              is divided by (wavy, engrailed, embattled…)
       ord, ordT, ordLine,    the ordinary laid over it, and its own line
       chg, chgT, chgN, chgA, the charge, its tincture, how many, how ranged
       bord, bordT,           a bordure round the edge: none, plain, compony
       hem, livery }          the cut of your banner's foot, and the colour
                              the whole app wears for you

   Everything after `b` has a default, and `norm()` fills them in — so a
   record saved before any of this existed still draws, and draws the same.

   Heraldry is natively vector — a field, a division, an ordinary, a charge
   — which is why it can be drawn honestly in code. The rule of tincture
   (never colour on colour, never metal on metal) is shown as advice in the
   maker and never enforced: it is a rule of the art, and people break it on
   purpose. Furs are exempt from it, as they are in the real art.

   Charges come from game-icons.net (CC BY 3.0) via charge_assets.js.
   Drawing them by hand was tried and they were poor.

   ── ON CONTEXTS ───────────────────────────────────────────────
   Furs are not colours, they are PATTERNS, and an SVG pattern needs an id.
   The maker puts thirty-odd swatch <svg>s in one document at once, and a
   duplicate id does not mean "the near one" — every `url(#f-ermine)` in the
   whole page resolves to whichever pattern the document happens to hold
   first, at whatever scale THAT one was built for. So a drawing carries a
   context: `ctx(W)` mints an id suffix and a tile size, every fill that
   needs a pattern registers itself on it, and `defs(ctx)` writes out only
   the patterns that were actually asked for, sized for that drawing.
   Callers who use no furs never pay for one.
══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

const TINCT = {
  /* vert was #2c6b41 — two steps darker so Argent on it clears 4.5:1
     (test/tincture.test.js), which is invisible on a banner */
  gules:'#a3232b', azure:'#27508f', vert:'#2b6940', purpure:'#67326f',
  sable:'#171310', tenne:'#8a4a1e', murrey:'#6d2038', bleu:'#5d7fa8',
  or:'#c9a227', argent:'#ded8c8'
};
const TNAME = { gules:'Gules', azure:'Azure', vert:'Vert', purpure:'Purpure',
  sable:'Sable', tenne:'Tenné', murrey:'Murrey', bleu:'Bleu celeste',
  or:'Or', argent:'Argent' };
const METALS = ['or','argent'];

/* ══ THE FURS ═════════════════════════════════════════════════
   A third kind of tincture, neither metal nor colour: a pattern of little
   skins. `g` is the ground, `s` the spots, `k` which shape.            */
const FURS = {
  ermine:   { n:'Ermine',   g:'argent', s:'sable',  k:'spot' },
  ermines:  { n:'Ermines',  g:'sable',  s:'argent', k:'spot' },
  erminois: { n:'Erminois', g:'or',     s:'sable',  k:'spot' },
  pean:     { n:'Pean',     g:'sable',  s:'or',     k:'spot' },
  vair:     { n:'Vair',     g:'argent', s:'azure',  k:'vair' },
  potent:   { n:'Potent',   g:'argent', s:'azure',  k:'potent' }
};

const isFur   = t => !!FURS[t];
const isMetal = t => METALS.indexOf(t) >= 0;
const named   = t => !!TINCT[t] || !!FURS[t];
/* a slot holds a tincture name, a fur, or any colour, so "pick your own"
   costs nothing. A fur reduces to its GROUND here — that is what a caller
   with no context (a one-colour swatch, a CSS variable) can honestly use. */
const col = t => TINCT[t]
  || (FURS[t] ? TINCT[FURS[t].g] : 0)
  || (/^#|^rgb|^hsl/.test(String(t)) ? t : '#888');
/* the full name of anything that can sit in a tincture slot */
const tname = t => TNAME[t] || (FURS[t] ? FURS[t].n : 'A colour of your own');

/* ══ THE CONTEXT ══════════════════════════════════════════════ */
let seq = 0;
function ctx(W){
  return { u: 'h' + (++seq).toString(36), s: Math.max(9, (W || 200) / 5.2), furs: {} };
}
/* what to put in a `fill=` for a tincture: a colour, or a pattern of skins */
function paint(t, c){
  if (!c || !FURS[t]) return col(t);
  c.furs[t] = 1;
  return 'url(#f-' + t + '-' + c.u + ')';
}

/* ── the ermine spot, in a 10x10 cell: a tail with three dots over it ── */
const SPOT =
  '<path d="M5,2.1 C4.35,3.7 3.35,4.6 3.35,5.95 C3.35,7.05 4.05,7.7 5,7.7' +
  ' C5.95,7.7 6.65,7.05 6.65,5.95 C6.65,4.6 5.65,3.7 5,2.1 Z"/>' +
  '<circle cx="5" cy="0.8" r=".62"/><circle cx="3.45" cy="1.6" r=".5"/>' +
  '<circle cx="6.55" cy="1.6" r=".5"/>';
/* a vair bell, flat across the top, 10 wide and 8 deep */
const BELL = 'M0,0 H10 V2.2 C10,5.3 7.7,8 5,8 C2.3,8 0,5.3 0,2.2 Z';
const BELL_UP = 'M0,8 H10 V5.8 C10,2.7 7.7,0 5,0 C2.3,0 0,2.7 0,5.8 Z';
/* a potent, and its opposite, in an 8x8 cell */
const TEE = 'M0,0 H8 V3 H5.5 V8 H2.5 V3 H0 Z';
const TEE_UP = 'M0,8 H8 V5 H5.5 V0 H2.5 V5 H0 Z';

function furPattern(t, c){
  const F = FURS[t], G = TINCT[F.g], S = TINCT[F.s], s = c.s;
  const P = (w, h, body) =>
    '<pattern id="f-' + t + '-' + c.u + '" width="' + (w*s/10).toFixed(2) +
    '" height="' + (h*s/10).toFixed(2) + '" patternUnits="userSpaceOnUse">' +
    '<rect width="' + (w*s/10).toFixed(2) + '" height="' + (h*s/10).toFixed(2) +
    '" fill="' + G + '"/><g transform="scale(' + (s/10).toFixed(4) +
    ')" fill="' + S + '">' + body + '</g></pattern>';
  if (F.k === 'spot')
    /* two spots per tile, laid brickwise, so it never reads as a grid */
    return P(20, 20, '<g>' + SPOT + '</g>' +
      '<g transform="translate(10,10)">' + SPOT + '</g>');
  if (F.k === 'vair')
    /* rows of bells, the next row half a bell over and turned about. The
       ones at -5 and 15 are the halves that make the seam invisible. */
    return P(20, 16,
      '<path d="' + BELL + '"/><g transform="translate(10,0)"><path d="' + BELL + '"/></g>' +
      '<g transform="translate(5,8)"><path d="' + BELL_UP + '"/></g>' +
      '<g transform="translate(-5,8)"><path d="' + BELL_UP + '"/></g>' +
      '<g transform="translate(15,8)"><path d="' + BELL_UP + '"/></g>');
  return P(16, 16,
    '<path d="' + TEE + '"/><g transform="translate(8,8)"><path d="' + TEE + '"/></g>' +
    '<g transform="translate(8,0)"><path d="' + TEE_UP + '"/></g>' +
    '<g transform="translate(0,8)"><path d="' + TEE_UP + '"/></g>');
}
/* every pattern this drawing actually asked for, and nothing else */
function defs(c){
  if (!c) return '';
  return Object.keys(c.furs).map(t => furPattern(t, c)).join('');
}

/* ══ THE LINES OF PARTITION ═══════════════════════════════════
   Any cut across the field — the division, the edge of an ordinary — can be
   drawn as something other than a straight rule. `line()` walks from A to B
   in the chosen manner and returns the path commands to get there, so a
   division and an ordinary use exactly the same machinery.

   Everything is built on the chord: `u` runs along it and `p` across it, so
   a wavy per bend and a wavy per fess are the same three lines of code. */
const LINES = { straight:'Straight', wavy:'Wavy', nebuly:'Nebuly',
  engrailed:'Engrailed', invected:'Invected', indented:'Indented',
  dancetty:'Dancetty', embattled:'Embattled' };

const f2 = n => (Math.round(n*100)/100);
function line(ax, ay, bx, by, kind, per, amp){
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  if (!L || !kind || kind === 'straight' || !LINES[kind])
    return 'L' + f2(bx) + ',' + f2(by);
  per = per || 40; amp = amp == null ? per * 0.34 : amp;
  const ux = dx/L, uy = dy/L, px = -uy, py = ux;
  const at = (t, o) => f2(ax + ux*t + px*o) + ',' + f2(ay + uy*t + py*o);

  /* teeth are sized in units, not in counts, so a short cut and a long one
     are cut with the SAME tool — a per-fess and a per-pale wavy match */
  let n = Math.max(2, Math.round(L / per));
  const step = L / n;
  let d = '';

  if (kind === 'indented' || kind === 'dancetty'){
    if (kind === 'dancetty'){ n = Math.max(2, Math.round(n/2.2)); }
    const h = L / (n*2), a = kind === 'dancetty' ? amp*1.9 : amp;
    for (let i = 1; i <= n*2; i++) d += 'L' + at(i*h, i % 2 ? a : 0);
    return d;
  }
  if (kind === 'embattled'){
    const h = L / (n*2);
    for (let i = 0; i < n*2; i++){
      const o = i % 2 ? amp : 0;
      d += 'L' + at(i*h, o) + 'L' + at((i+1)*h, o);
    }
    return d + 'L' + at(L, 0);
  }
  if (kind === 'engrailed' || kind === 'invected'){
    /* a run of half-circles. A cubic whose handles stand off the chord by
       4r/3 IS a half-circle to within a rounding error, and unlike an arc
       command it has no sweep flag to get backwards on a diagonal. */
    const r = step/2, k = r*4/3, s = kind === 'engrailed' ? 1 : -1;
    for (let i = 0; i < n; i++)
      d += 'C' + at(i*step, k*s) + ' ' + at((i+1)*step, k*s) + ' ' + at((i+1)*step, 0);
    return d;
  }
  /* wavy and nebuly: the same wave, nebuly cut deeper and undercut so it
     reads as cloud rather than as ripple */
  const h = L / (n*2), a = kind === 'nebuly' ? amp*2.1 : amp;
  const lean = kind === 'nebuly' ? 0.62 : 0.34;
  for (let i = 1; i <= n*2; i++){
    const s = i % 2 ? 1 : -1;
    d += 'C' + at((i-1)*h + h*lean, a*s) + ' ' + at(i*h - h*lean, a*s) + ' ' + at(i*h, 0);
  }
  return d;
}

/* ══ THE FIELD ════════════════════════════════════════════════
   Divisions cut the field in two. Patterns repeat it. Both live here because
   to everything downstream they are the same thing: what is underneath. */
const DIVISIONS = {
  plain:'Plain', perPale:'Per pale', perFess:'Per fess', quarterly:'Quarterly',
  perBend:'Per bend', perBendSin:'Per bend sinister', perChevron:'Per chevron',
  perSaltire:'Per saltire', tierced:'Tierced in pale',
  barry:'Barry', paly:'Paly', bendy:'Bendy', chevronny:'Chevronny',
  checky:'Checky', lozengy:'Lozengy', gyronny:'Gyronny', pily:'Pily'
};
/* which divisions a line of partition means anything on: the ones that are
   a CUT. You cannot engrail a chequerboard, and offering it would be a lie. */
const LINEABLE = { perPale:1, perFess:1, quarterly:1, perBend:1, perBendSin:1,
  perChevron:1, tierced:1, barry:1, paly:1 };

function field(div, a, b, W, H, ln, c){
  const A = paint(a, c), B = paint(b, c);
  const bg = '<rect width="' + W + '" height="' + H + '" fill="' + A + '"/>';
  const R = (x,y,w,h) => '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(w) +
    '" height="' + f2(h) + '" fill="' + B + '"/>';
  const P = d => '<path d="' + d + '" fill="' + B + '"/>';
  /* the wavelength every cut on this drawing is made with */
  const per = Math.max(W, H) / 7.5, amp = per * 0.30;
  const cut = (x1,y1,x2,y2) => line(x1,y1,x2,y2, ln, per, amp);
  let s = '';
  switch(div){
    /* a lined division is not a rectangle any more: it is the region on one
       side of the cut, so it is drawn as a path that FOLLOWS the cut and
       then runs round the outside of the box back to where it started */
    case 'perPale':    return bg + P('M' + W/2 + ',0 ' + cut(W/2,0,W/2,H) +
                                     ' L' + W + ',' + H + ' L' + W + ',0 Z');
    case 'perFess':    return bg + P('M0,' + H/2 + ' ' + cut(0,H/2,W,H/2) +
                                     ' L' + W + ',' + H + ' L0,' + H + ' Z');
    case 'quarterly':  return bg + P('M' + W/2 + ',0 ' + cut(W/2,0,W/2,H/2) +
                                     ' ' + cut(W/2,H/2,W,H/2) + ' L' + W + ',0 Z')
                                 + P('M0,' + H/2 + ' ' + cut(0,H/2,W/2,H/2) +
                                     ' ' + cut(W/2,H/2,W/2,H) + ' L0,' + H + ' Z');
    case 'perBend':    return bg + P('M0,0 ' + cut(0,0,W,H) + ' L0,' + H + ' Z');
    case 'perBendSin': return bg + P('M' + W + ',0 ' + cut(W,0,0,H) +
                                     ' L0,' + H + ' L' + W + ',' + H + ' Z');
    case 'perChevron': return bg + P('M0,' + H + ' ' + cut(0,H,W/2,H*0.44) +
                                     ' ' + cut(W/2,H*0.44,W,H) + ' Z');
    case 'perSaltire': return bg + P('M0,0 L' + W/2 + ',' + H/2 + ' L' + W + ',0 Z') +
                                   P('M0,' + H + ' L' + W/2 + ',' + H/2 + ' L' + W + ',' + H + ' Z');
    case 'tierced':    return bg + P('M' + W/3 + ',0 ' + cut(W/3,0,W/3,H) +
                                     ' L' + (W*2/3) + ',' + H + ' ' + cut(W*2/3,H,W*2/3,0) + ' Z');
    case 'barry':
      for (let i=1;i<8;i+=2){ const y0 = H*i/8, y1 = H*(i+1)/8;
        s += P('M0,' + f2(y0) + ' ' + cut(0,y0,W,y0) + ' L' + W + ',' + f2(y1) +
               ' ' + cut(W,y1,0,y1) + ' Z'); }
      return bg + s;
    case 'paly':
      for (let i=1;i<6;i+=2){ const x0 = W*i/6, x1 = W*(i+1)/6;
        s += P('M' + f2(x0) + ',0 ' + cut(x0,0,x0,H) + ' L' + f2(x1) + ',' + H +
               ' ' + cut(x1,H,x1,0) + ' Z'); }
      return bg + s;
    case 'bendy':
      /* the stripes run at 45 degrees, so on a tall banner the top of a stripe
         and its bottom are H apart in x — the loop has to reach that far or the
         hem comes out bare */
      { const step = W/6, n = Math.ceil((W + H)/step) + 2;
        for (let i=0;i<n;i+=2)
          s += P('M' + f2(i*step) + ',0 L' + f2((i+1)*step) + ',0 L' +
                 f2((i+1)*step - H) + ',' + H + ' L' + f2(i*step - H) + ',' + H + ' Z');
        return bg + s; }
    case 'chevronny':
      for (let i=0;i<5;i++){ const y=H*(0.12+i*0.22);
        s += P('M0,' + f2(y+H*0.11) + ' L' + W/2 + ',' + f2(y-H*0.05) + ' L' + W + ',' +
               f2(y+H*0.11) + ' L' + W + ',' + f2(y+H*0.22) + ' L' + W/2 + ',' +
               f2(y+H*0.06) + ' L0,' + f2(y+H*0.22) + ' Z'); }
      return bg + s;
    /* cells are square-ish whatever the shape: a banner is twice as tall as it
       is wide, and rows sized off H come out as long rectangles */
    case 'checky':
      { const n = 6, cw = W/n, chh = cw*1.1, rows = Math.ceil(H/chh);
        for (let r=0;r<rows;r++) for (let cc=0;cc<n;cc++)
          if ((r+cc)%2) s += R(cc*cw, r*chh, cw, chh);
        return bg + s; }
    case 'lozengy':
      { const n = 5, cw = W/n, chh = cw*1.35, rows = Math.ceil(H/chh)+2;
        for (let r=-1;r<rows;r++) for (let cc=-1;cc<=n;cc++){
          const x = cc*cw + (Math.abs(r%2) ? cw/2 : 0), y = r*chh;
          s += P('M' + f2(x+cw/2) + ',' + f2(y) + ' L' + f2(x+cw) + ',' + f2(y+chh/2) +
                 ' L' + f2(x+cw/2) + ',' + f2(y+chh) + ' L' + f2(x) + ',' + f2(y+chh/2) + ' Z'); }
        return bg + s; }
    case 'gyronny':
      { const cx=W/2, cy=H*0.44, r=Math.max(W,H)*1.6;
        for (let i=0;i<8;i+=2){
          const a1=(i*45-90)*Math.PI/180, a2=((i+1)*45-90)*Math.PI/180;
          s += P('M' + cx + ',' + cy + ' L' + f2(cx+Math.cos(a1)*r) + ',' + f2(cy+Math.sin(a1)*r) +
                 ' L' + f2(cx+Math.cos(a2)*r) + ',' + f2(cy+Math.sin(a2)*r) + ' Z'); }
        return bg + s; }
    case 'pily':
      { const n=5;
        for (let i=0;i<n;i++) s += P('M' + f2(W*i/n) + ',0 L' + f2(W*(i+1)/n) + ',0 L' +
          f2(W*(i+0.5)/n) + ',' + f2(H*0.62) + ' Z');
        return bg + s; }
    default: return bg;
  }
}

/* ══ THE ORDINARY ═════════════════════════════════════════════ */
const ORDINARIES = { none:'None', cross:'A cross', pale:'A pale', fess:'A fess',
  chevron:'A chevron', saltire:'A saltire', bend:'A bend', bendSin:'A bend sinister',
  chief:'A chief', base:'A base', pile:'A pile', pall:'A pall',
  crossPatee:'A cross patée', fessDouble:'Two bars' };
/* the ones with two long straight edges, which is what a line of partition
   needs to have something to bite on */
const ORD_LINEABLE = { cross:1, pale:1, fess:1, chevron:1, bend:1, bendSin:1,
  chief:1, base:1, fessDouble:1 };

function ordinary(kind, t, W, H, ln, c){
  const M = paint(t, c), u = W*0.19;
  const per = Math.max(W, H)/8.5, amp = per*0.26;
  const cut = (x1,y1,x2,y2) => line(x1,y1,x2,y2, ln, per, amp);
  const P = d => '<path d="' + d + '" fill="' + M + '"/>';
  /* a band across the whole width, both of its edges cut the same way */
  const hband = (y0, y1) => P('M0,' + f2(y0) + ' ' + cut(0,y0,W,y0) + ' L' + W + ',' +
    f2(y1) + ' ' + cut(W,y1,0,y1) + ' Z');
  const vband = (x0, x1) => P('M' + f2(x0) + ',0 ' + cut(x0,0,x0,H) + ' L' + f2(x1) +
    ',' + H + ' ' + cut(x1,H,x1,0) + ' Z');
  switch(kind){
    case 'cross':   return vband(W/2-u/2, W/2+u/2) + hband(H*0.34-u/2, H*0.34+u/2);
    case 'crossPatee':
      return P('M' + (W/2-u*0.34) + ',0 L' + (W/2+u*0.34) + ',0 L' + (W/2+u*0.62) + ',' + H*0.26 +
        ' L' + W + ',' + H*0.20 + ' L' + W + ',' + H*0.48 + ' L' + (W/2+u*0.62) + ',' + H*0.42 +
        ' L' + (W/2+u*0.34) + ',' + H + ' L' + (W/2-u*0.34) + ',' + H + ' L' + (W/2-u*0.62) + ',' +
        H*0.42 + ' L0,' + H*0.48 + ' L0,' + H*0.20 + ' L' + (W/2-u*0.62) + ',' + H*0.26 + ' Z');
    case 'pale':    return vband(W/2-u*0.8, W/2+u*0.8);
    case 'fess':    return hband(H*0.40, H*0.60);
    case 'fessDouble': return hband(H*0.31, H*0.41) + hband(H*0.53, H*0.63);
    case 'chevron': return P('M0,' + H*.66 + ' ' + cut(0,H*.66,W/2,H*.34) + ' ' +
      cut(W/2,H*.34,W,H*.66) + ' L' + W + ',' + H*.80 + ' ' + cut(W,H*.80,W/2,H*.48) + ' ' +
      cut(W/2,H*.48,0,H*.80) + ' Z');
    case 'saltire': return P('M0,0 L' + u + ',0 L' + W + ',' + (H-u) + ' L' + W + ',' + H +
                             ' L' + (W-u) + ',' + H + ' L0,' + u + ' Z') +
                           P('M' + W + ',0 L' + (W-u) + ',0 L0,' + (H-u) + ' L0,' + H +
                             ' L' + u + ',' + H + ' L' + W + ',' + u + ' Z');
    case 'bend':    return P('M0,0 L' + f2(u*1.3) + ',0 ' + cut(u*1.3,0,W,H-u*1.3) +
      ' L' + W + ',' + H + ' L' + f2(W-u*1.3) + ',' + H + ' ' + cut(W-u*1.3,H,0,u*1.3) + ' Z');
    case 'bendSin': return P('M' + W + ',0 L' + f2(W-u*1.3) + ',0 ' + cut(W-u*1.3,0,0,H-u*1.3) +
      ' L0,' + H + ' L' + f2(u*1.3) + ',' + H + ' ' + cut(u*1.3,H,W,u*1.3) + ' Z');
    case 'chief':   return P('M0,0 L' + W + ',0 L' + W + ',' + f2(H*0.20) + ' ' +
      cut(W,H*0.20,0,H*0.20) + ' Z');
    case 'base':    return P('M0,' + f2(H*0.80) + ' ' + cut(0,H*0.80,W,H*0.80) +
      ' L' + W + ',' + H + ' L0,' + H + ' Z');
    case 'pile':    return P('M0,0 L' + W + ',0 L' + W/2 + ',' + H*0.78 + ' Z');
    case 'pall':    return P('M0,0 L' + u + ',0 L' + (W/2+u/2) + ',' + H*0.42 + ' L' +
      (W/2+u/2) + ',' + H + ' L' + (W/2-u/2) + ',' + H + ' L' + (W/2-u/2) + ',' + H*0.42 +
      ' L' + (W-u) + ',0 L' + W + ',0 L' + W + ',' + u*0.7 + ' L' + (W/2+u/2) + ',' + H*0.50 +
      ' L' + (W/2-u/2) + ',' + H*0.50 + ' L0,' + u*0.7 + ' Z');
    default: return '';
  }
}

/* ══ THE BORDURE ══════════════════════════════════════════════
   Its own layer, not an ordinary — you can have both. `compony` is the same
   stroke twice: the second one dashed, so the two tinctures alternate round
   the edge the way a compony bordure does, for the price of one attribute. */
const BORDURES = { '':'None', plain:'A bordure', compony:'Compony' };
function bordure(on, t, W, H, clip, c){
  if (!on) return '';
  const w = Math.min(W, H) * 0.075;
  const base = '<path d="' + clip + '" fill="none" stroke="' + paint(t, c) +
               '" stroke-width="' + (w*2) + '"/>';
  if (on !== 'compony') return base;
  const seg = Math.min(W, H) * 0.19;
  return base + '<path d="' + clip + '" fill="none" stroke="' + col('argent') +
    '" stroke-width="' + (w*2) + '" stroke-dasharray="' + f2(seg) + ' ' + f2(seg) + '"/>';
}

/* ══ THE CHARGE ═══════════════════════════════════════════════
   Real drawings, ranged the way a herald would range them. `chgA` says how:
   the default is the proper heraldic arrangement for that many (one in the
   middle, two side by side, three two-and-one), and the rest are the named
   ones — in pale, in fess, in bend, in orle round the edge. */
const ARRANGE = { proper:'As they fall', inPale:'In pale', inFess:'In fess',
  inBend:'In bend', inOrle:'In orle' };

function chargeList(){ return root.CHARGES || {}; }

function chargeAt(kind, t, W, H, cx, cy, size, c){
  const C = chargeList()[kind];
  if (!C) return '';
  const vb = C.v.split(/\s+/).map(Number), span = Math.max(vb[2], vb[3]);
  const s = size / span;
  const x = cx - (vb[0] + vb[2]/2) * s, y = cy - (vb[1] + vb[3]/2) * s;
  return '<g transform="translate(' + f2(x) + ',' + f2(y) + ') scale(' + s.toFixed(4) +
         ')" fill="' + paint(t, c) + '">' +
         C.d.map(d => '<path d="' + d + '"/>').join('') + '</g>';
}

/* where n charges sit, in fractions of the field, and how big each is */
const PROPER = {
  1:[[.50,.46]], 2:[[.29,.44],[.71,.44]], 3:[[.29,.28],[.71,.28],[.50,.62]],
  4:[[.30,.27],[.70,.27],[.30,.63],[.70,.63]],
  5:[[.28,.24],[.72,.24],[.50,.45],[.28,.66],[.72,.66]],
  6:[[.24,.22],[.50,.22],[.76,.22],[.33,.50],[.67,.50],[.50,.76]]
};
const SIZE = [0,.50,.36,.33,.30,.26,.24];
function spots(n, how, W, H){
  n = Math.max(1, Math.min(6, n|0));
  const sz = SIZE[n] * W;
  const put = list => list.map(p => ({ x:p[0]*W, y:p[1]*H, s:sz }));
  if (n === 1 || how === 'proper' || !ARRANGE[how]) return put(PROPER[n]);
  const out = [];
  if (how === 'inPale')
    for (let i=0;i<n;i++) out.push([.50, .18 + (.60/(n-1))*i]);
  else if (how === 'inFess')
    for (let i=0;i<n;i++) out.push([.20 + (.60/(n-1))*i, .46]);
  else if (how === 'inBend')
    for (let i=0;i<n;i++){ const t = i/(n-1); out.push([.22 + .56*t, .20 + .54*t]); }
  else {
    /* in orle: ranged round the edge, starting at the top */
    for (let i=0;i<n;i++){ const a = -Math.PI/2 + i*2*Math.PI/n;
      out.push([.50 + Math.cos(a)*.33, .46 + Math.sin(a)*.30]); }
  }
  return put(out);
}

function charge(kind, t, W, H, n, how, c, opt){
  if (!kind) return '';
  if (opt && opt.size)
    return chargeAt(kind, t, W, H, W/2, opt.cy !== undefined ? opt.cy : H*0.46, opt.size, c);
  return spots(n || 1, how || 'proper', W, H)
    .map(p => chargeAt(kind, t, W, H, p.x, p.y, p.s, c)).join('');
}

/* ══ THE SHAPES A COAT IS PAINTED ON ══════════════════════════ */
const HEMS = { straight:'Square', round:'Rounded', swallow:'Swallow-tailed',
  dagged:'Dagged', gonfalon:'Gonfalon', pennon:'Pennon' };
function hem(kind, W, H){
  if (kind === 'swallow') return 'L' + W + ',' + H*.86 + ' L' + W*.72 + ',' + H +
                                 ' L' + W*.5 + ',' + H*.90 + ' L' + W*.28 + ',' + H +
                                 ' L0,' + H*.86;
  if (kind === 'dagged'){ let p = 'L' + W + ',' + H*.90;
    for (let i=5;i>=0;i--) p += ' L' + f2((W/6)*(i+.5)) + ',' + H + ' L' + f2((W/6)*i) + ',' + H*.90;
    return p; }
  if (kind === 'pennon') return 'L' + W + ',' + H*.72 + ' L' + W*.5 + ',' + H + ' L0,' + H*.72;
  if (kind === 'round')
    return 'L' + W + ',' + H*.80 + ' C' + W + ',' + H*.96 + ' ' + W*.72 + ',' + H + ' ' +
           W*.5 + ',' + H + ' C' + W*.28 + ',' + H + ' 0,' + H*.96 + ' 0,' + H*.80;
  if (kind === 'gonfalon'){
    /* three tails, the middle one longest: a hanging banner, not a flown one */
    return 'L' + W + ',' + H*.74 + ' L' + W*.84 + ',' + H*.88 + ' L' + W*.68 + ',' + H*.74 +
           ' L' + W*.58 + ',' + H + ' L' + W*.42 + ',' + H + ' L' + W*.32 + ',' + H*.74 +
           ' L' + W*.16 + ',' + H*.88 + ' L0,' + H*.74;
  }
  return 'L' + W + ',' + H + ' L0,' + H;
}
/* `inset` pulls every point of the outline in from the WxH box by that
   many px on each side — 0 (the default) is the original shape, touching
   the box exactly, which is exactly what armsSVG must NOT hand to a
   stroked path (see the note there). Every other caller (16-menu.js's
   stationer's mark, the raw fill-only watermark on a blank sheet) wants
   the untouched shape and gets it for free by not passing one. */
function shieldPath(W, H, inset){
  const m = inset || 0, w = W - m*2, h = H - m*2;
  return 'M' + m + ',' + m + ' H' + (m+w) + ' V' + (m+h*.58) + ' C' + (m+w) + ',' + (m+h*.82) +
         ' ' + (m+w*.72) + ',' + (m+h*.94) + ' ' + (m+w/2) + ',' + (m+h) +
         ' C' + (m+w*.28) + ',' + (m+h*.94) + ' ' + m + ',' + (m+h*.82) + ' ' + m + ',' +
         (m+h*.58) + ' Z';
}

/* ══ A WHOLE RECORD, FILLED IN ════════════════════════════════
   Everything past `b` arrived after people already had arms saved. norm()
   is the one place that knows what an absent field means, so nothing
   downstream has to guess and no saved coat has to be migrated. */
const DEFAULTS = { div:'plain', a:'sable', b:'argent', line:'straight',
  ord:'none', ordT:'or', ordLine:'straight', chg:'', chgT:'or', chgN:1,
  chgA:'proper', bord:'', bordT:'or', hem:'swallow', livery:'' };
function norm(A){
  const o = Object.assign({}, DEFAULTS, A || {});
  /* a bordure used to be a yes or a no; it is a kind now */
  if (o.bord === true) o.bord = 'plain';
  if (o.bord === false || o.bord == null) o.bord = '';
  if (!LINEABLE[o.div]) o.line = 'straight';
  if (!ORD_LINEABLE[o.ord]) o.ordLine = 'straight';
  o.chgN = Math.max(1, Math.min(6, o.chgN | 0 || 1));
  return o;
}
/* is this a coat somebody actually chose, or the empty default? */
function blazoned(A){
  if (!A) return false;
  const o = norm(A);
  return o.div !== 'plain' || o.a !== 'sable' || !!o.chg || o.ord !== 'none' || !!o.bord;
}

function armsSVG(A0, o){
  o = o || {};
  const A = norm(A0);
  const W = o.w || 200, H = o.h || (o.shape === 'shield' ? 240 : 400);
  const shape = o.shape || 'banner';
  const edge = o.edge || 5;
  const c = ctx(W);
  /* THE COAT OF ARMS WAS LOSING ITS OWN BORDER. grumkata: "cutoff...
     it's a different shape" — meaning different from the empty-shield
     placeholder and an uploaded picture (#arms in 00-hall.css), which
     ring themselves with an INSET box-shadow that physically cannot
     draw outside their own box. This shield instead strokes its outline
     — stroke-width below — and an SVG stroke straddles its path, half in
     and half out. shieldPath used to touch x=0, x=W and y=0 exactly, so
     the OUTER half of that stroke fell outside the <svg>'s own viewBox
     and was clipped clean off by its default overflow:hidden — worst
     along the flat top edge and both dead-straight sides, where it ran
     parallel to the clip boundary for a long stretch rather than just
     grazing a point. Insetting the shape itself by half the stroke width
     puts the WHOLE stroke inside the box instead. The field/charges/
     bordure below clip to this exact same `clip` value, so they shrink by
     the same half-edge and the border still sits flush against them —
     nothing moves relative to anything else, the border just stops eating
     itself. */
  const clip = shape === 'shield' ? shieldPath(W, H, edge / 2)
             : 'M0,0 L' + W + ',0 ' + hem(o.hem || A.hem, W, H) + ' Z';
  /* the fills are gathered FIRST and the defs written after, because a fur
     only declares itself when something asks to be painted with it */
  const inner = field(A.div, A.a, A.b, W, H, A.line, c)
              + ordinary(A.ord, A.ordT, W, H, A.ordLine, c)
              + charge(A.chg, A.chgT, W, H, A.chgN, A.chgA, c)
              + bordure(A.bord, A.bordT, W, H, clip, c);
  const weave = o.weave === false ? '' :
    '<rect width="' + W + '" height="' + H + '" fill="url(#wv-' + c.u + ')"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
    '" viewBox="0 0 ' + W + ' ' + H + '"><defs>' +
    '<clipPath id="cp-' + c.u + '"><path d="' + clip + '"/></clipPath>' +
    '<pattern id="wv-' + c.u + '" width="9" height="9" patternUnits="userSpaceOnUse">' +
    '<path d="M0,0 H9 M4.5,0 V9" stroke="#000" stroke-opacity=".055" stroke-width="1.6"/>' +
    '<path d="M0,4.5 H9" stroke="#fff" stroke-opacity=".035" stroke-width="1.6"/></pattern>' +
    defs(c) + '</defs>' +
    '<g clip-path="url(#cp-' + c.u + ')">' + inner + weave + '</g>' +
    '<path d="' + clip + '" fill="none" stroke="#0d0906" stroke-width="' + edge +
    '" stroke-opacity=".8"/></svg>';
}
const armsURL = (A, o) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(armsSVG(A, o));

/* ══ THE LIVERY ═══════════════════════════════════════════════
   Which single colour out of a whole coat does the app wear? (42-shell.js
   sets it on <html> as --m-house.) The chrome is Sable and gilt, so the
   livery has to be a COLOUR and not a metal — Or would vanish into the
   plaques, Sable into the panel it is drawn on. Furs give up their spot
   tincture if that is a colour, and their ground otherwise.

   Preference runs from the most personal choice outwards: what you picked,
   then the charge you march under, then the ordinary, then the field. */
function liveryOf(A0){
  if (!A0) return null;
  const A = norm(A0);
  if (A.livery && /^#[0-9a-fA-F]{6}$/.test(A.livery)) return A.livery;
  if (A.livery && named(A.livery)) return liveryTint(A.livery);
  const tries = [ A.chg ? A.chgT : 0, A.ord !== 'none' ? A.ordT : 0,
                  A.bord ? A.bordT : 0, A.b, A.a ];
  for (let i = 0; i < tries.length; i++){
    const c = liveryTint(tries[i]);
    if (c) return c;
  }
  return null;
}
/* a tincture is fit to be a livery only if it is a colour. Anything the
   player typed in themselves is theirs and is taken as given. */
function liveryTint(t){
  if (!t) return null;
  if (FURS[t]) return liveryTint(FURS[t].s) || liveryTint(FURS[t].g);
  if (TINCT[t]) return (isMetal(t) || t === 'sable') ? null : TINCT[t];
  return /^#|^rgb|^hsl/.test(String(t)) ? t : null;
}

/* ══ THE COAT, IN WORDS ══════════════════════════════
   A blazon is a SENTENCE — the written form is the real heraldry and the
   picture is one draughtsman's reading of it. Writing it under the maker's
   preview is not decoration: it is the thing that tells you the app knows
   what you just built, and it names every option you have turned on, which
   is worth more than a tooltip.

   It is not full blazonry and does not pretend to be — no cadency, no
   proper tinctures, no marshalling. It says what this record holds. */
const COUNT = ['', 'a', 'two', 'three', 'four', 'five', 'six'];
const plural = w => /(s|x|sh|ch)$/.test(w) ? w + 'es'
                  : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
/* the charge list names things as 'A lion' — the article is the list's, and
   a blazon supplies its own */
const bare = n => String(n || '').replace(/^(an?|the)\s+/i, '').toLowerCase();
const FIELD_SAY = { perPale:'Per pale', perFess:'Per fess', quarterly:'Quarterly',
  perBend:'Per bend', perBendSin:'Per bend sinister', perChevron:'Per chevron',
  perSaltire:'Per saltire', tierced:'Tierced in pale', barry:'Barry', paly:'Paly',
  bendy:'Bendy', chevronny:'Chevronny', checky:'Checky', lozengy:'Lozengy',
  gyronny:'Gyronny', pily:'Pily' };
function blazonText(A0){
  const A = norm(A0), say = t => tname(t);
  const parts = [];
  if (A.div === 'plain') parts.push(say(A.a));
  else parts.push(FIELD_SAY[A.div] + (A.line !== 'straight' ? ' ' + LINES[A.line].toLowerCase() : '')
                  + ' ' + say(A.a) + ' and ' + say(A.b));
  if (A.ord !== 'none'){
    const n = bare(ORDINARIES[A.ord]);
    parts.push((/^two/.test(n) ? n : 'a ' + n)
      + (A.ordLine !== 'straight' ? ' ' + LINES[A.ordLine].toLowerCase() : '')
      + ' ' + say(A.ordT));
  }
  if (A.chg){
    const C = chargeList()[A.chg];
    const n = bare(C ? C.n : A.chg);
    /* the arrangement comes AFTER the tincture, as a herald says it:
       "three lions Sable in pale", never "three lions in pale Sable" */
    parts.push(COUNT[A.chgN] + ' ' + (A.chgN > 1 ? plural(n) : n)
      + ' ' + say(A.chgT)
      + (A.chgA !== 'proper' ? ' ' + ARRANGE[A.chgA].toLowerCase() : ''));
  }
  if (A.bord) parts.push('a bordure' + (A.bord === 'compony' ? ' compony' : '') +
                         ' ' + say(A.bordT));
  return parts.join(', ');
}

/* the rule of tincture, as advice. Furs are exempt — they always were. */
function tinctureWarning(A0){
  const A = norm(A0);
  const flat = A.div === 'plain';
  const kind = t => isFur(t) ? 'fur' : isMetal(t) ? 'metal' : 'colour';
  const out = [];
  const clash = (x, y) => kind(x) !== 'fur' && kind(y) !== 'fur' && kind(x) === kind(y);
  if (A.ord !== 'none' && flat && clash(A.ordT, A.a))
    out.push(isMetal(A.a) ? 'metal on metal' : 'colour on colour');
  if (A.chg && flat && A.ord === 'none' && clash(A.chgT, A.a))
    out.push('the charge shares its nature with the field');
  return out.length ? 'Against the rule of tincture — ' + out.join(', ') : '';
}

/* ── rolling a coat: never the same tincture twice, and metal against colour ── */
function roll(){
  const COLOURS = Object.keys(TINCT).filter(t => !isMetal(t));
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const take = a => a.splice(Math.floor(Math.random()*a.length), 1)[0];
  const cols = COLOURS.slice(), mets = METALS.slice();
  const metalField = Math.random() < 0.35;

  /* alternate metal and colour so nothing ever sits on its own kind, and draw
     without replacement so no tincture is used twice */
  let a    = metalField ? take(mets) : take(cols);
  const b    = metalField ? take(cols) : (mets.length ? take(mets) : take(cols));
  const ordT = metalField ? take(cols) : (mets.length ? take(mets) : take(cols));
  const chgT = metalField ? (cols.length ? take(cols) : take(mets))
                          : (mets.length ? take(mets) : take(cols));
  /* one coat in seven is furred, and it is the field that wears it: a fur
     ordinary on a fur field is a mess and a herald would not do it */
  if (Math.random() < 0.14) a = pick(Object.keys(FURS));
  const bordKind = Math.random() < 0.4 ? (Math.random() < 0.25 ? 'compony' : 'plain') : '';
  const bordT = bordKind ? (metalField ? take(cols) : (mets.length ? take(mets) : take(cols)))
                         : ordT;
  const divs = Object.keys(DIVISIONS);
  const ords = Object.keys(ORDINARIES);
  const chs  = Object.keys(chargeList());
  const heavyField = ['checky','lozengy','gyronny','barry','paly','bendy','chevronny','pily'];
  const div = pick(divs);
  /* a busy field does not also get a busy ordinary */
  const ord = heavyField.indexOf(div) >= 0
    ? pick(['none','none','fess','pale','chief','bend'])
    : pick(ords);
  /* a fancy line on a fancy field is noise; most coats are cut straight */
  const fancy = Object.keys(LINES);
  return norm({ div, a, b,
           line: LINEABLE[div] && Math.random() < 0.34 ? pick(fancy) : 'straight',
           ord, ordT,
           ordLine: ORD_LINEABLE[ord] && Math.random() < 0.26 ? pick(fancy) : 'straight',
           chg: Math.random() < 0.82 ? pick(chs) : '',
           chgT, chgN: pick([1,1,1,2,3,3,4,5]),
           chgA: Math.random() < 0.25 ? pick(Object.keys(ARRANGE)) : 'proper',
           bord: bordKind, bordT,
           hem: pick(Object.keys(HEMS)) });
}

root.Heraldry = { TINCT, TNAME, METALS, FURS, LINES, LINEABLE, ORD_LINEABLE,
                  BORDURES, ARRANGE, HEMS, DEFAULTS,
                  isMetal, isFur, named, col, tname, ctx, paint, defs,
                  DIVISIONS, ORDINARIES, chargeList, line,
                  field, ordinary, bordure, charge, chargeAt, spots, hem,
                  shieldPath, norm, blazoned, armsSVG, armsURL,
                  liveryOf, liveryTint, blazonText, tinctureWarning, roll };
})(window);
