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

   Charges are heraldic drawings from Wikimedia Commons, recoloured by
   tools/heraldry-art.js into 02-charge-assets.js (credits in Settings).
   game-icons.net silhouettes came before them, and were "cartoony".

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
  /* and the lit body of every charge painted on it (bodyOf, below) */
  return Object.keys(c.furs).map(t => furPattern(t, c)).join('') +
         Object.keys(c.grads || {}).map(id => bodyGrad(id, c.grads[id])).join('');
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

/* The field is cut in the arms' own proportions (the zone Z, see below):
   a line through the middle of the arms is through the middle of the
   arms, and carries on down a long banner at the same angle. Stripes and
   chequers repeat at their own size, so a long cloth has more of them
   rather than longer ones. */
function field(div, a, b, W, H, ln, c, Z){
  Z = Z || { x:0, y:0, w:W, h:H };
  const A = paint(a, c), B = paint(b, c), E = 3 * (W + H);
  const bg = '<rect width="' + W + '" height="' + H + '" fill="' + A + '"/>';
  const R = (x,y,w,h) => '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(w) +
    '" height="' + f2(h) + '" fill="' + B + '"/>';
  const P = d => '<path d="' + d + '" fill="' + B + '"/>';
  /* the wavelength every cut on this drawing is made with */
  const per = Math.max(W, Z.h) / 7.5, amp = per * 0.30;
  const cut = (x1,y1,x2,y2) => line(x1,y1,x2,y2, ln, per, amp);
  const ym = Z.y + Z.h / 2, zb = Z.y + Z.h;
  let s = '';
  switch(div){
    case 'perPale':    return bg + P('M' + W/2 + ',0 ' + cut(W/2,0,W/2,H) +
                                     ' L' + W + ',' + H + ' L' + W + ',0 Z');
    case 'perFess':    return bg + P('M0,' + f2(ym) + ' ' + cut(0,ym,W,ym) +
                                     ' L' + W + ',' + H + ' L0,' + H + ' Z');
    case 'quarterly':  return bg + P('M' + W/2 + ',0 ' + cut(W/2,0,W/2,ym) +
                                     ' ' + cut(W/2,ym,W,ym) + ' L' + W + ',0 Z')
                                 + P('M0,' + f2(ym) + ' ' + cut(0,ym,W/2,ym) +
                                     ' ' + cut(W/2,ym,W/2,H) + ' L0,' + H + ' Z');
    /* corner to corner of the ARMS, and on at that angle */
    case 'perBend': case 'perBendSin': {
      const sx = div === 'perBend' ? 1 : -1, k = 4, cx = W/2;
      const p0 = [cx - sx*Z.w*k, ym - Z.h*k], p1 = [cx + sx*Z.w*k, ym + Z.h*k];
      return bg + P('M' + f2(p0[0]) + ',' + f2(p0[1]) + ' ' + cut(p0[0], p0[1], p1[0], p1[1]) +
                    ' L' + f2(p0[0]) + ',' + f2(p1[1]) + ' Z'); }
    case 'perChevron': { const ay = Z.y + Z.h * .44, m = (zb - ay) / (W/2), X = W * 2;
      return bg + P('M' + f2(W/2 - X) + ',' + f2(ay + m*X) + ' ' + cut(W/2 - X, ay + m*X, W/2, ay) + ' ' +
                    cut(W/2, ay, W/2 + X, ay + m*X) + ' L' + f2(W/2 + X) + ',' + f2(E) + ' L' + f2(W/2 - X) + ',' + f2(E) + ' Z'); }
    case 'perSaltire': { const cx = W/2, k = 8, dx = W/2*k, dy = Z.h/2*k;
      return bg + P('M' + cx + ',' + f2(ym) + ' L' + f2(cx - dx) + ',' + f2(ym - dy) + ' L' + f2(cx + dx) + ',' + f2(ym - dy) + ' Z') +
                  P('M' + cx + ',' + f2(ym) + ' L' + f2(cx - dx) + ',' + f2(ym + dy) + ' L' + f2(cx + dx) + ',' + f2(ym + dy) + ' Z'); }
    case 'tierced':    return bg + P('M' + W/3 + ',0 ' + cut(W/3,0,W/3,H) +
                                     ' L' + (W*2/3) + ',' + H + ' ' + cut(W*2/3,H,W*2/3,0) + ' Z');
    case 'barry':
      { const st = Z.h / 8;
        for (let y0 = st; y0 < H; y0 += st*2){ const y1 = y0 + st;
          s += P('M0,' + f2(y0) + ' ' + cut(0,y0,W,y0) + ' L' + W + ',' + f2(y1) +
                 ' ' + cut(W,y1,0,y1) + ' Z'); }
        return bg + s; }
    case 'paly':
      for (let i=1;i<6;i+=2){ const x0 = W*i/6, x1 = W*(i+1)/6;
        s += P('M' + f2(x0) + ',0 ' + cut(x0,0,x0,H) + ' L' + f2(x1) + ',' + H +
               ' ' + cut(x1,H,x1,0) + ' Z'); }
      return bg + s;
    case 'bendy':
      { const step = W/6, n = Math.ceil((W + H)/step) + 2;
        for (let i=0;i<n;i+=2)
          s += P('M' + f2(i*step) + ',0 L' + f2((i+1)*step) + ',0 L' +
                 f2((i+1)*step - H) + ',' + H + ' L' + f2(i*step - H) + ',' + H + ' Z');
        return bg + s; }
    case 'chevronny':
      { const u = Z.h;
        for (let y = u*.12; y < H + u*.2; y += u*.22)
          s += P('M0,' + f2(y+u*0.11) + ' L' + W/2 + ',' + f2(y-u*0.05) + ' L' + W + ',' +
                 f2(y+u*0.11) + ' L' + W + ',' + f2(y+u*0.22) + ' L' + W/2 + ',' +
                 f2(y+u*0.06) + ' L0,' + f2(y+u*0.22) + ' Z');
        return bg + s; }
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
      { const cx=W/2, cy=Z.y + Z.h*0.44, r=Math.max(W,H)*1.6;
        for (let i=0;i<8;i+=2){
          const a1=(i*45-90)*Math.PI/180, a2=((i+1)*45-90)*Math.PI/180;
          s += P('M' + cx + ',' + f2(cy) + ' L' + f2(cx+Math.cos(a1)*r) + ',' + f2(cy+Math.sin(a1)*r) +
                 ' L' + f2(cx+Math.cos(a2)*r) + ',' + f2(cy+Math.sin(a2)*r) + ' Z'); }
        return bg + s; }
    case 'pily':
      { const n=5;
        for (let i=0;i<n;i++) s += P('M' + f2(W*i/n) + ',0 L' + f2(W*(i+1)/n) + ',0 L' +
          f2(W*(i+0.5)/n) + ',' + f2(Z.y + Z.h*0.62) + ' Z');
        return bg + s; }
    default: return bg;
  }
}

/* ══ THE ORDINARY ═════════════════════════════════════════════ */
const ORDINARIES = { none:'None', cross:'A cross', pale:'A pale', fess:'A fess',
  chevron:'A chevron', saltire:'A saltire', bend:'A bend', bendSin:'A bend sinister',
  chief:'A chief', base:'A base', pile:'A pile', pall:'A pall',
  crossPatee:'A cross patée', fessDouble:'Two bars', canton:'A canton' };
/* the ones with two long straight edges, which is what a line of partition
   needs to have something to bite on */
const ORD_LINEABLE = { cross:1, pale:1, fess:1, chevron:1, bend:1, bendSin:1,
  chief:1, base:1, fessDouble:1 };

/* ══ THE ARMS' OWN PROPORTIONS ════════════════════════════════
   grumkata: "when put on a banner a lot of it looks ugly and stretched".
   Everything used to be drawn corner to corner of whatever it was put on,
   so a saltire on a hanging banner was a tall thin X, a chevron a spike, a
   bend nearly upright — the same coat was four different coats at the four
   sizes the app draws it.

   So the arms have a proportion of their own. The ZONE is the shield's
   shape, allowed to grow a little taller on a long banner and no further;
   on a banner it hangs at the top of the cloth. Every angle, every band and
   every charge is laid out in it. What runs off it — a pale, a bend, the
   arms of a saltire, the line of a cut field — runs on down the cloth at
   the same angle, as a painter would carry it, instead of being stretched to
   reach the corners. */
const ZONE_TALL = 1.42;
function zoneOf(W, H, shape, hem){
  if (shape === 'shield' || shape === 'box') return { x:0, y:0, w:W, h:H, bot: shape === 'shield' ? H*.86 : H };
  const cloth = H * (HEM_CLOTH[hem] || .86), h = Math.min(cloth, W * ZONE_TALL);
  /* in the middle of the cloth above the hem, a touch high, as a painter
     would hang it — not pinned to the top with the tail left bare */
  return { x:0, y: (cloth - h) * .42, w:W, h, bot: cloth };
}
/* the part of the zone left for crossing ordinaries and charges, once a
   chief has taken the top and a base the bottom */
function roomOf(A, Z){
  const has = k => (A.ords || []).some(g => g.o === k);
  const top = has('chief') ? Z.y + Z.h*.22 : Z.y;
  const bot = has('base') ? Math.min(Z.y + Z.h, Z.bot) - Z.h*.18 : Z.y + Z.h;
  /* `vis`: how far down the room is really cloth — a shield narrows to its
     point, so what lies on a bend is kept above it */
  return { x: Z.x, y: top, w: Z.w, h: bot - top, chief: has('chief') ? top : 0,
           base: has('base') ? bot : 0, zone: Z, vis: Math.min(bot, Z.bot) };
}

/* a band along a line: the centre line p0→p1, drawn hw either side of it,
   both edges cut by the same line of partition */
function bandPath(p0, p1, hw, ln, per, amp){
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L * hw, ny = dx / L * hw;
  const a = [p0[0] + nx, p0[1] + ny], b = [p1[0] + nx, p1[1] + ny],
        c = [p1[0] - nx, p1[1] - ny], d = [p0[0] - nx, p0[1] - ny];
  return 'M' + f2(a[0]) + ',' + f2(a[1]) + ' ' + line(a[0], a[1], b[0], b[1], ln, per, amp) +
         ' L' + f2(c[0]) + ',' + f2(c[1]) + ' ' + line(c[0], c[1], d[0], d[1], ln, per, amp) + ' Z';
}

/* THE ORDINARIES, in a room R of a W×H cloth. `n` stacks them — two or three
   chevrons one above another, bars, bendlets, pallets (grumkata: "stacked…
   like I should be able to do multiple up arrows"). `charged` draws the one
   that carries charges wider, as heralds do, so its charges are not specks.
   Returns the paths, and where n charges sit ON it (null where they cannot). */
const STACKS = { fess:1, pale:1, bend:1, bendSin:1, chevron:1 };
function ordGeo(kind, W, H, R, ln, n, charged){
  n = STACKS[kind] ? Math.max(1, Math.min(3, n | 0 || 1)) : 1;
  const E = 3 * (W + H), per = W / 6, amp = per * .26;
  const cut = (x1, y1, x2, y2) => line(x1, y1, x2, y2, ln, per, amp);
  const wide = R.w * (charged ? .3 : .22);
  const bw = n > 1 ? wide * .5 : wide, gap = wide * .95;
  const offs = i => (i - (n - 1) / 2) * gap;
  const at = (xs, y) => xs.map(x => [x, y]);
  const d = [];
  let on = () => null;
  const cx = R.x + R.w / 2;
  switch (kind){
    case 'fess': { const cy = R.y + R.h * .47;
      for (let i = 0; i < n; i++) d.push(bandPath([-E, cy + offs(i)], [W + E, cy + offs(i)], bw / 2, ln, per, amp));
      if (n === 1) on = m => m <= 3 ? { pts: at([[.5], [.3, .7], [.2, .5, .8]][m - 1].map(x => R.x + R.w * x), cy), s: bw * .86 } : null;
      break; }
    case 'pale': { const vh = (R.vis || R.y + R.h) - R.y;
      for (let i = 0; i < n; i++) d.push(bandPath([cx + offs(i), -E], [cx + offs(i), H + E], bw / 2, ln, per, amp));
      if (n === 1) on = m => m <= 3 ? { pts: [[.5], [.3, .7], [.2, .5, .8]][m - 1].map(y => [cx, R.y + vh * y]), s: bw * .86 } : null;
      break; }
    case 'bend': case 'bendSin': {
      const sx = kind === 'bend' ? 1 : -1, L = Math.hypot(R.w, R.h);
      const ux = sx * R.w / L, uy = R.h / L, mx = cx, my = R.y + R.h / 2;
      for (let i = 0; i < n; i++){ const o = offs(i), px = -uy * o, py = ux * o;
        d.push(bandPath([mx + px - ux * E, my + py - uy * E], [mx + px + ux * E, my + py + uy * E], bw / 2, ln, per, amp)); }
      /* spread along the part of the bend that is on the cloth: from just
         below the top of the room to just above where it runs out */
      const yTop = R.y + R.h * .12, yBot = (R.vis || R.y + R.h) - R.h * .12;
      const along = y => { const t = (y - my) / uy; return [mx + ux * t, y]; };
      if (n === 1) on = m => m <= 3 ? { pts: [[.5], [.25, .75], [.14, .5, .86]][m - 1].map(f => along(yTop + (yBot - yTop) * f)), s: bw * .86 } : null;
      break; }
    case 'saltire': { const mx = cx, my = R.y + R.h / 2, L = Math.hypot(R.w, R.h);
      const u1 = [R.w / L, R.h / L], u2 = [-R.w / L, R.h / L];
      d.push(bandPath([mx - u1[0] * E, my - u1[1] * E], [mx + u1[0] * E, my + u1[1] * E], bw / 2, 'straight', per, amp));
      d.push(bandPath([mx - u2[0] * E, my - u2[1] * E], [mx + u2[0] * E, my + u2[1] * E], bw / 2, 'straight', per, amp));
      on = m => m === 1 ? { pts: [[mx, my]], s: bw * .8 }
              : m === 5 ? { pts: [[mx, my]].concat([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(q => [mx + q[0] * R.w * .3, my + q[1] * R.h * .3])), s: bw * .72 } : null;
      break; }
    case 'cross': { const cy = R.y + R.h * .42;
      d.push(bandPath([cx, -E], [cx, H + E], bw / 2, ln, per, amp));
      d.push(bandPath([-E, cy], [W + E, cy], bw / 2, ln, per, amp));
      on = m => m === 1 ? { pts: [[cx, cy]], s: bw * .86 }
              : m === 5 ? { pts: [[cx, cy], [cx, R.y + (cy - R.y) * .42], [R.x + R.w * .17, cy], [R.x + R.w * .83, cy],
                                  [cx, cy + ((R.vis || R.y + R.h) - cy) * .5]], s: bw * .8 } : null;
      break; }
    case 'chevron': {
      /* the arms fall from the apex to the sides at the same angle on any
         cloth, and run off the sides — they are never stretched to a corner */
      const m = (R.h * .38) / (R.w / 2), tv = bw * Math.sqrt(1 + m * m), X = W;
      const a0 = R.y + R.h * (n > 1 ? .28 : .34), step = tv * 1.9;
      for (let i = 0; i < n; i++){ const a = a0 + i * step;
        const Lo = [cx - X, a + m * X], Ro = [cx + X, a + m * X], Li = [cx - X, a + tv + m * X], Ri = [cx + X, a + tv + m * X];
        d.push('M' + f2(Lo[0]) + ',' + f2(Lo[1]) + ' ' + cut(Lo[0], Lo[1], cx, a) + ' ' + cut(cx, a, Ro[0], Ro[1]) +
               ' L' + f2(Ri[0]) + ',' + f2(Ri[1]) + ' ' + cut(Ri[0], Ri[1], cx, a + tv) + ' ' + cut(cx, a + tv, Li[0], Li[1]) + ' Z'); }
      if (n === 1) on = k => k === 1 ? { pts: [[cx, a0 + tv * .5]], s: tv * .82 }
        : k === 3 ? { pts: [[cx, a0 + tv * .5], [cx - R.w * .3, a0 + tv * .5 + m * R.w * .3], [cx + R.w * .3, a0 + tv * .5 + m * R.w * .3]], s: tv * .78 } : null;
      break; }
    case 'pile': {
      d.push('M' + f2(R.x) + ',' + f2(R.y) + ' L' + f2(R.x + R.w) + ',' + f2(R.y) + ' L' + f2(cx) + ',' + f2(R.y + R.h * .8) + ' Z');
      on = m => m === 1 ? { pts: [[cx, R.y + R.h * .26]], s: R.w * .28 }
              : m === 3 ? { pts: [[cx - R.w * .17, R.y + R.h * .13], [cx + R.w * .17, R.y + R.h * .13], [cx, R.y + R.h * .38]], s: R.w * .2 } : null;
      break; }
    case 'pall': { const my = R.y + R.h * .45;
      d.push(bandPath([cx, my], [cx - (R.w / 2) * 6, my - (my - R.y) * 6], bw / 2, 'straight', per, amp));
      d.push(bandPath([cx, my], [cx + (R.w / 2) * 6, my - (my - R.y) * 6], bw / 2, 'straight', per, amp));
      d.push(bandPath([cx, my - bw * .3], [cx, H + E], bw / 2, 'straight', per, amp));
      on = m => m === 1 ? { pts: [[cx, my]], s: bw * .8 } : null;
      break; }
    case 'crossPatee': { const u = R.w * .19, hh = R.h, y = v => f2(R.y + v);
      d.push('M' + (cx - u * .34) + ',' + y(0) + ' L' + (cx + u * .34) + ',' + y(0) + ' L' + (cx + u * .62) + ',' + y(hh * .26) +
        ' L' + (R.x + R.w) + ',' + y(hh * .2) + ' L' + (R.x + R.w) + ',' + y(hh * .48) + ' L' + (cx + u * .62) + ',' + y(hh * .42) +
        ' L' + (cx + u * .34) + ',' + y(hh) + ' L' + (cx - u * .34) + ',' + y(hh) + ' L' + (cx - u * .62) + ',' + y(hh * .42) +
        ' L' + R.x + ',' + y(hh * .48) + ' L' + R.x + ',' + y(hh * .2) + ' L' + (cx - u * .62) + ',' + y(hh * .26) + ' Z');
      on = m => m === 1 ? { pts: [[cx, R.y + hh * .34]], s: u * 1.1 } : null;
      break; }
    /* the bands that take room: the room R given them is the whole zone */
    case 'chief': { const y = R.chiefH || R.y + R.h * .22;
      d.push('M0,' + f2(-E) + ' L' + W + ',' + f2(-E) + ' L' + W + ',' + f2(y) + ' ' + cut(W, y, 0, y) + ' Z'); break; }
    case 'base': { const y = R.baseY || R.y + R.h * .82;
      d.push('M0,' + f2(y) + ' ' + cut(0, y, W, y) + ' L' + W + ',' + f2(H + E) + ' L0,' + f2(H + E) + ' Z'); break; }
    case 'canton': { const y = R.cantonY != null ? R.cantonY : R.y, w = R.w * .38,
      h = R.cantonH || Math.min(R.h * .3, R.w * .36);
      d.push('M0,' + f2(y) + ' H' + f2(w) + ' V' + f2(y + h) + ' H0 Z'); break; }
    default: return null;
  }
  return { d, on, n };
}
/* one ordinary in a box — what the maker's swatches draw */
function ordinary(kind, t, W, H, ln, c, n){
  const g = ordGeo(kind === 'fessDouble' ? 'fess' : kind, W, H, { x:0, y:0, w:W, h:H }, ln,
                   kind === 'fessDouble' ? 2 : n);
  if (!g) return '';
  const M = paint(t, c);
  return g.d.map(d => '<path d="' + d + '" fill="' + M + '"/>').join('');
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
   Real heraldic drawings (02-charge-assets.js, made by tools/heraldry-art.js
   from Wikimedia Commons). Each is a drawing with slots for its colours —
   body, light, dark, ink, and the claws and tongue — filled here from the
   tincture it is borne in. The ink is never black: grumkata, "the black
   outlines look silly". It is the tincture's own deepest shade, so a gold
   lion's lines read as the shadows of gold thread. */
const ARRANGE = { proper:'As they fall', inPale:'In pale', inFess:'In fess',
  inBend:'In bend', inOrle:'In orle' };

function chargeList(){ return root.CHARGES || {}; }
/* the drawing for a name, through the old names that now point elsewhere */
function chargeDef(kind){
  const L = chargeList(); let C = L[kind];
  if (C && C.alias) C = L[C.alias];
  return C || null;
}

/* ── the shades of a tincture ── */
function hexOf(t){ const c = col(t); return /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888'; }
function mix(hex, to, k){
  const n = parseInt(hex.slice(1), 16), m = parseInt(to.slice(1), 16);
  const ch = s => Math.round(((n >> s) & 255) * (1 - k) + ((m >> s) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
/* metals are brighter at their highlight; colours hold their hue */
const lightOf = t => mix(hexOf(t), isMetal(t) ? '#fffbe8' : '#ffffff', isMetal(t) ? 0.55 : 0.28);
const darkOf  = t => mix(hexOf(t), '#000000', 0.32);
const inkOf   = t => mix(hexOf(t), '#1a0f06', isMetal(t) ? 0.62 : 0.7);
/* a charge's body: the tincture lit from the upper left. A fur keeps its pattern. */
function bodyOf(t, c){
  if (isFur(t) || !c) return paint(t, c);
  const id = 'cb-' + String(t).replace(/[^a-z0-9]/gi, '') + '-' + c.u;
  (c.grads = c.grads || {})[id] = t;
  return 'url(#' + id + ')';
}
function bodyGrad(id, t){
  return '<linearGradient id="' + id + '" x1="0" y1="0" x2=".7" y2="1">' +
    '<stop offset="0" stop-color="' + lightOf(t) + '"/><stop offset=".5" stop-color="' + hexOf(t) + '"/>' +
    '<stop offset="1" stop-color="' + darkOf(t) + '"/></linearGradient>';
}
/* claws and tongue: Gules, as heraldry arms a beast — Azure if it is Gules */
const accentOf = t => t === 'gules' ? TINCT.azure : TINCT.gules;

let inst = 0;
function tintDrawing(s, t, c){
  /* counted per drawing, so the same coat drawn twice is the same markup */
  const u = 'c-' + (c ? c.u + '-' + (c.k = (c.k || 0) + 1) : 'x' + (++inst)) + '-';
  const ground = isFur(t) ? FURS[t].g : t;
  return s.split('{B}').join(bodyOf(t, c)).split('{L}').join(lightOf(ground))
          .split('{D}').join(darkOf(ground)).split('{I}').join(inkOf(ground))
          .split('{A}').join(accentOf(t)).split('{U}').join(u);
}

/* One drawing, centred on cx,cy, its longer side `size` long. `face` is
   which way it should look ('l' or 'r'); a drawing facing the other way is
   mirrored about its own centre. */
function chargeAt(kind, t, W, H, cx, cy, size, c, face){
  const C = chargeDef(kind);
  if (!C) return '';
  const vb = C.v.split(/\s+/).map(Number), k = size / Math.max(vb[2], vb[3]);
  const w = vb[2] * k, h = vb[3] * k;
  let out;
  if (C.s)
    out = '<svg x="' + f2(cx - w/2) + '" y="' + f2(cy - h/2) + '" width="' + f2(w) + '" height="' + f2(h) +
          '" viewBox="' + C.v + '" overflow="visible">' + tintDrawing(C.s, t, c) + '</svg>';
  else  /* a pack in the old form: bare paths in one colour */
    out = '<g transform="translate(' + f2(cx - (vb[0] + vb[2]/2) * k) + ',' + f2(cy - (vb[1] + vb[3]/2) * k) +
          ') scale(' + k.toFixed(4) + ')" fill="' + paint(t, c) + '">' +
          (C.d || []).map(d => '<path d="' + d + '"/>').join('') + '</g>';
  if (face && C.f && face !== C.f)
    out = '<g transform="translate(' + f2(cx * 2) + ',0) scale(-1,1)">' + out + '</g>';
  return out;
}
/* how big a drawing can be and still sit inside a w×h box */
function fitSize(kind, w, h){
  const C = chargeDef(kind);
  if (!C) return Math.min(w, h);
  const vb = C.v.split(/\s+/).map(Number);
  return Math.min(w / vb[2], h / vb[3]) * Math.max(vb[2], vb[3]);
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
/* how far down a banner of each cut is whole cloth, before the hem starts
   cutting into it — the room there is to put anything */
const HEM_CLOTH = { straight:.94, round:.82, swallow:.86, dagged:.9, gonfalon:.74, pennon:.72 };
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

/* ══ THE SYMBOLS ══════════════════════════════════════════════
   grumkata: "there should also be the capability of having multiple
   symbols in the flag in custom orientations… like a lion facing a unicorn
   with a crown in the center and a wreath around it all".

   A coat carries a list of symbols, each
     { c: which, t: tincture, at: where, face: 'l'|'r', size: 's'|'m'|'l',
       n: how many, how: how they are ranged }
   `at` is a PLACE, not a position: centre, left, right, top, bottom, or
   around (a wreath). Where each place is on the cloth is worked out here,
   from what else is there — and with room to spare, because "a bit too
   scrunched together yk" was the verdict every time the symbols were
   packed to the edges of their space. */
const PLACES = { center:'Centre', left:'Left', right:'Right', top:'Top', bottom:'Bottom', around:'Around',
  chief:'On the chief', canton:'On the canton', on:'On the ordinary' };
const SIZES = { s:'Small', m:'Medium', l:'Large' };
const SIZE_K = { s:.52, m:.72, l:.92 };

/* which way a symbol looks, by default: those at the sides turn to face the
   middle, so a lion at the left and a unicorn at the right face each other */
const faceFor = (S) => S.face || (S.at === 'left' ? 'r' : S.at === 'right' ? 'l' : '');

/* the proper arrangement of n in a box, as rows of how many. A tall box
   stacks them (three crowns in pale on a hanging banner), a squat one
   ranges them two and one. */
function rowsFor(n, tall){
  if (tall) return [[1],[1,1],[1,1,1],[2,2],[2,1,2],[2,2,2]][n - 1];
  return [[1],[2],[2,1],[2,2],[2,1,2],[3,2,1]][n - 1];
}
function cells(n, how, x, y, w, h){
  const out = [];
  if (n > 1 && how === 'inPale')
    for (let i = 0; i < n; i++) out.push({ x: x + w/2, y: y + h*(i + .5)/n, w: w, h: h/n });
  else if (n > 1 && how === 'inFess')
    for (let i = 0; i < n; i++) out.push({ x: x + w*(i + .5)/n, y: y + h/2, w: w/n, h: h });
  else if (n > 1 && how === 'inBend')
    for (let i = 0; i < n; i++){ const t = (i + .5)/n; out.push({ x: x + w*t, y: y + h*t, w: w/n*1.3, h: h/n*1.3 }); }
  else if (n > 1 && how === 'inOrle')
    for (let i = 0; i < n; i++){ const a = -Math.PI/2 + i*2*Math.PI/n;
      out.push({ x: x + w/2 + Math.cos(a)*w*.36, y: y + h/2 + Math.sin(a)*h*.36, w: w*.3, h: h*.3 }); }
  else {
    const rows = rowsFor(n, h / w > 1.4), rh = h / rows.length, most = Math.max(...rows);
    rows.forEach((k, r) => { for (let i = 0; i < k; i++)
      out.push({ x: x + w/2 + (i - (k - 1)/2) * (w / most), y: y + rh*(r + .5), w: w / most, h: rh }); });
  }
  return out;
}

/* ON AN ORDINARY. Three mullets on a bend are ON the bend, sized to it —
   not strewn across the field over the top of it. The carrier is the first
   crossing ordinary that can take that many; it is drawn wider for it. */
function carrierFor(A, S, W, H, R){
  if (!S || (A.syms || []).some(x => x.at === 'around')) return null;
  const n = S.n || 1;
  if (!(S.at === 'on' || (S.at === 'center' && n > 1))) return null;
  for (const g of A.ords || []){
    if (BAND[g.o]) continue;
    const G = ordGeo(g.o, W, H, R, g.line, g.n, true);
    const on = G && G.on(n);
    if (on) return { g, on };
  }
  return null;
}

/* ══ INSIDE THE OUTLINE ═══════════════════════════════════════
   grumkata: "we still have the issue of symbols getting cutoff". A symbol
   was sized to a rectangle — and a shield curves in to its point, a hem is
   cut into tails, a bordure takes its band, and the cloth ripples. So every
   symbol placed is checked against the coat's real outline and made smaller
   (or lifted, if it is only its feet that are out) until all of it is in,
   with a margin to spare. The outlines use only M L H V C Z, all absolute,
   so this reads them itself — it runs in Node at build time as well. */
function outlinePts(d){
  const tok = String(d).match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const pts = []; let i = 0, cmd = '', x = 0, y = 0;
  const num = () => +tok[i++];
  while (i < tok.length){
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M' || cmd === 'L'){ x = num(); y = num(); pts.push([x, y]); }
    else if (cmd === 'H'){ x = num(); pts.push([x, y]); }
    else if (cmd === 'V'){ y = num(); pts.push([x, y]); }
    else if (cmd === 'C'){ const a = [num(), num(), num(), num(), num(), num()];
      for (let k = 1; k <= 10; k++){ const t = k/10, u = 1 - t;
        pts.push([u*u*u*x + 3*u*u*t*a[0] + 3*u*t*t*a[2] + t*t*t*a[4],
                  u*u*u*y + 3*u*u*t*a[1] + 3*u*t*t*a[3] + t*t*t*a[5]]); }
      x = a[4]; y = a[5]; }
    else if (cmd === 'Z') i++;
    else i++;
  }
  return pts;
}
function insidePts(P, x, y){
  let hit = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++)
    if ((P[i][1] > y) !== (P[j][1] > y) &&
        x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) hit = !hit;
  return hit;
}
/* the points of a drawing's box that must be inside: the middle of each side,
   and the corners pulled in (a drawing rarely fills its corners), each
   pushed out by the margin it must keep from the edge */
function fits(P, cx, cy, w, h, gap){
  const T = [[0, -.5], [0, .5], [-.5, 0], [.5, 0], [-.34, -.34], [.34, -.34], [-.34, .34], [.34, .34]];
  return T.every(t => { const dx = t[0], dy = t[1], L = Math.hypot(dx, dy) || 1;
    return insidePts(P, cx + dx*w + dx/L*gap, cy + dy*h + dy/L*gap); });
}
function keepInside(P, p, gap){
  const C = chargeDef(p.S.c); if (!C) return p;
  const vb = C.v.split(/\s+/).map(Number);
  for (let tries = 0; tries < 16; tries++){
    const k = p.size / Math.max(vb[2], vb[3]), w = vb[2]*k, h = vb[3]*k;
    if (fits(P, p.x, p.y, w, h, gap)) break;
    /* only the feet out: lift it a little first, it keeps its size */
    if (tries < 3 && fits(P, p.x, p.y - h*.06, w, h*.88, gap)) { p.y -= h*.05; continue; }
    p.size *= .93;
  }
  return p;
}
/* a wreath is an oval frame: the oval must be inside */
function wreathFits(P, b, gap){
  for (let i = 0; i < 16; i++){ const a = i * Math.PI / 8;
    if (!insidePts(P, b.x + b.w/2 + Math.cos(a)*(b.w/2 + gap), b.y + b.h/2 + Math.sin(a)*(b.h/2 + gap))) return false; }
  return true;
}

/* ══ THE REAL SHAPE OF A DRAWING ══════════════════════════════
   Every drawing carries \`m\` (tools/heraldry-art.js): which cells of a small
   grid over it hold paint. Charges are fitted by that, not by their box —
   a rampant lion's box is half air, and two boxes touch long before two
   lions facing each other do. */
const MASKS = {};
function maskOf(k){
  if (k in MASKS) return MASKS[k];
  const C = chargeDef(k);
  if (!C || !C.m) return (MASKS[k] = null);
  const parts = C.m.split(':'), g = parts[0].split(',').map(Number), gw = g[0], gh = g[1];
  const a = new Uint8Array(gw * gh);
  parts[1].split('.').forEach((r, j) => { for (let i = 0; i < gw; i++)
    if (parseInt(r[i >> 2], 16) & (8 >> (i & 3))) a[j * gw + i] = 1; });
  const on = (i, j) => i >= 0 && j >= 0 && i < gw && j < gh && a[j * gw + i];
  /* only the cells at the silhouette's edge need testing */
  const edge = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++)
    if (on(i, j) && !(on(i - 1, j) && on(i + 1, j) && on(i, j - 1) && on(i, j + 1))) edge.push([i, j]);
  return (MASKS[k] = { gw, gh, a, edge, on });
}
/* a drawing at a size: its box on the cloth, its grid, and which way it looks */
function placed(p, size){
  const C = chargeDef(p.S.c), vb = C.v.split(/\s+/).map(Number), k = size / Math.max(vb[2], vb[3]);
  const w = vb[2] * k, h = vb[3] * k, M = maskOf(p.S.c);
  const f = faceFor(p.S), mir = !!(f && C.f && f !== C.f);
  return { x0: p.x - w/2, x1: p.x + w/2, y0: p.y - h/2, y1: p.y + h/2, w, h, M,
           cw: M ? w / M.gw : w, ch: M ? h / M.gh : h, mir };
}
/* the middle of cell i,j of a placed drawing, on the cloth */
const cellAt = (e, i, j) => [e.x0 + ((e.mir ? e.M.gw - 1 - i : i) + .5) * e.cw, e.y0 + (j + .5) * e.ch];
/* is all the paint inside the outline and the room, with \`gap\` to spare? */
function shapeFits(e, P, room, gap){
  if (!e.M){
    if (e.x0 < room.x0 || e.x1 > room.x1 || e.y0 < room.y0 || e.y1 > room.y1) return false;
    return !P || fits(P, (e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, e.w, e.h, gap);
  }
  const hx = e.cw / 2, hy = e.ch / 2;
  for (const c of e.M.edge){
    const q = cellAt(e, c[0], c[1]);
    if (q[0] - hx < room.x0 || q[0] + hx > room.x1 || q[1] - hy < room.y0 || q[1] + hy > room.y1) return false;
    if (P && !(insidePts(P, q[0] - hx - gap, q[1] - hy - gap) && insidePts(P, q[0] + hx + gap, q[1] - hy - gap) &&
               insidePts(P, q[0] - hx - gap, q[1] + hy + gap) && insidePts(P, q[0] + hx + gap, q[1] + hy + gap))) return false;
  }
  return true;
}
/* do two placed drawings keep \`air\` between their paint? */
function shapesClear(e, f, air){
  if (e.x1 + air <= f.x0 || f.x1 + air <= e.x0 || e.y1 + air <= f.y0 || f.y1 + air <= e.y0) return true;
  if (!e.M || !f.M) return false;
  const rx = Math.ceil((air + e.cw / 2) / f.cw), ry = Math.ceil((air + e.ch / 2) / f.ch);
  for (const c of e.M.edge){
    const q = cellAt(e, c[0], c[1]);
    const fi = Math.floor((q[0] - f.x0) / f.cw), fj = Math.floor((q[1] - f.y0) / f.ch);
    for (let dj = -ry; dj <= ry; dj++) for (let di = -rx; di <= rx; di++){
      const i = fi + di, j = fj + dj;
      if (f.M.on(f.mir ? f.M.gw - 1 - i : i, j)) return false;
    }
  }
  return true;
}
/* GROWING. Each symbol is held by the side of the room it belongs to — one
   at the left keeps its back to the left edge, one at the top its crown to
   the top — and all of them grow TOWARD each other until their paint would
   cross the outline or nearly touch: two beasts facing each other end up
   with their paws almost meeting in the middle, as heraldry draws them.
   On a curving shield an anchored one may step in a little to fit. */
function grow(ps, P, room, gap, W){
  if (!ps.length) return;
  const air = W * .012;
  ps.forEach(p => { p.cx0 = p.x; p.cy0 = p.y; });
  const STEPS = [0, .015, .03, .05, .075, .1, .13, .17];
  /* where p goes at a size, trying the anchored spot first and stepping in */
  const seat = (p, size) => {
    const e0 = placed(p, size);
    for (const st of (p.anchor ? STEPS : [0])){
      const o = st * W;
      p.x = p.anchor === 'l' ? room.x0 + e0.w/2 + o : p.anchor === 'r' ? room.x1 - e0.w/2 - o : p.cx0;
      p.y = p.anchor === 't' ? room.y0 + e0.h/2 + o : p.anchor === 'b' ? room.y1 - e0.h/2 - o : p.cy0;
      const e = placed(p, size);
      if (shapeFits(e, P, room, gap)) return e;
    }
    return null;
  };
  const ok = sizes => {
    const es = [];
    for (let i = 0; i < ps.length; i++){ const e = seat(ps[i], sizes[i]); if (!e) return false; es.push(e); }
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++)
      if (!shapesClear(es[i], es[j], air)) return false;
    return true;
  };
  /* all together first: the largest scale at which every one still fits */
  const base = ps.map(p => p.size);
  let lo = 0.1, hi = 5;
  for (let i = 0; i < 20; i++){ const m = (lo + hi) / 2; if (ok(base.map(v => v * m))) lo = m; else hi = m; }
  let sizes = base.map(v => v * lo);
  /* then each on its own, into whatever room is left beside it */
  for (let pass = 0; pass < 2; pass++) ps.forEach((p, idx) => {
    let x = sizes[idx], y = sizes[idx] * 1.7;
    for (let i = 0; i < 14; i++){ const m = (x + y) / 2;
      if (ok(sizes.map((v, j) => j === idx ? m : v))) x = m; else y = m; }
    sizes[idx] = x;
  });
  ok(sizes);                       /* leaves every one seated where it fits */
  ps.forEach((p, i) => { p.size = sizes[i]; p.grown = 1; });
}

/* The room there is, and where each symbol goes in it. */
function layoutSymbols(A, W, H, shape, clip, Z){
  const P = clip ? outlinePts(clip) : null;
  Z = Z || zoneOf(W, H, shape, A.hem);
  const RM = roomOf(A, Z);
  const syms = (A.syms || []).filter(S => chargeDef(S.c));
  if (!syms.length) return [];
  const b = A.bord ? Math.min(W, H) * 0.075 : 0;
  /* a margin all round: the cloth ripples, and a raised charge casts a shadow */
  const mx = W * .03, gap = b + W * .022;
  const ords = A.ords || [], hasO = k => ords.some(g => g.o === k);
  /* the room: the arms' zone, below a chief and above a base */
  let x0 = b + mx, x1 = W - b - mx, y0 = RM.y + (RM.chief ? 0 : Math.max(0, b - RM.y)) + Z.h*.025,
      y1 = Math.min(RM.y + RM.h, Z.bot) - (RM.base ? 0 : b);
  /* a canton takes the top corner: what goes in the middle keeps clear of it */
  const cant = hasO('canton') ? { w: W*0.38, h: cantonHOf(RM, Z, W), y: RM.chief || 0 } : null;
  const out = [];
  const around = syms.find(S => S.at === 'around');
  if (around){
    /* the wreath is stretched to the room there is, and the rest go INSIDE it */
    const px = (x1 - x0) * .05, py = (y1 - y0) * .04;
    const box = { x: x0 + px, y: y0 + py, w: x1 - x0 - px*2, h: y1 - y0 - py*2 };
    /* an oval, not a stretched one: a wreath is at most a little taller than wide */
    const tallest = box.w * 1.18;
    if (box.h > tallest){ box.y += (box.h - tallest) / 2; box.h = tallest; }
    for (let t = 0; P && t < 14 && !wreathFits(P, box, gap * .5); t++){
      box.x += box.w * .03; box.y += box.h * .02; box.w *= .94; box.h *= .96; }
    out.push({ S: around, box });
    x0 = box.x + box.w*.11; x1 = box.x + box.w*.89; y0 = box.y + box.h*.08; y1 = box.y + box.h*.9;
  }
  const iw = x1 - x0, ih = y1 - y0;
  /* A PAIR IS A PAIR. One symbol in the centre and one at a side is two
     things side by side — not a row of three with a hole in it, which is
     what shrank them to a third of the cloth each. The centre one takes the
     empty side. */
  const at0 = S => S.at;
  const sideCount = ['left', 'right'].filter(p => syms.some(S => at0(S) === p)).length;
  if (sideCount === 1 && syms.filter(S => at0(S) === 'center').length === 1){
    const empty = syms.some(S => at0(S) === 'left') ? 'right' : 'left';
    syms.forEach((S, i) => { if (S.at === 'center') syms[i] = Object.assign({}, S, { at: empty }); });
  }
  const has = p => syms.some(S => S.at === p);
  const sides = has('left') || has('right'), tb = has('top') || has('bottom');
  /* the places, as boxes in the room: sides take the outer thirds, top and
     bottom a band each, and the centre what is left between them */
  const R = {
    top:    { x: x0 + iw*.18, y: y0, w: iw*.64, h: ih*.3 },
    bottom: { x: x0 + iw*.18, y: y1 - ih*.3, w: iw*.64, h: ih*.3 },
    left:   { x: x0, y: y0 + ih*(tb ? .28 : .14), w: iw*(has('center') ? .34 : .5), h: ih*(tb ? .6 : .72) },
    right:  { x: x1 - iw*(has('center') ? .34 : .5), y: y0 + ih*(tb ? .28 : .14), w: iw*(has('center') ? .34 : .5), h: ih*(tb ? .6 : .72) },
    center: sides ? { x: x0 + iw*.34, y: y0 + ih*(tb ? .28 : .2), w: iw*.32, h: ih*(tb ? .44 : .6) }
                  : { x: x0, y: y0 + (has('top') ? ih*.32 : 0), w: iw,
                      h: ih - (has('top') ? ih*.32 : 0) - (has('bottom') ? ih*.32 : 0) },
    /* on the chief: a row along it */
    chief:  { x: b + W*.08, y: b + Z.h*.012, w: W - b*2 - W*.16, h: (RM.chief || Z.h*.22) - b - Z.h*.024 },
    /* on the canton: one, in the middle of it */
    canton: cant ? { x: cant.w*.14, y: cant.y + cant.h*.14, w: cant.w*.72, h: cant.h*.72 } : null
  };
  if (cant && !around && !sides){
    const r = R.center, cx = cant.w * .55, cy = cant.y + cant.h * .5;
    if (r.x < cx && r.y < cy){ const dy = cy - r.y; r.y += dy; r.h -= dy; }
  }
  for (const S of syms){
    if (S === around) continue;
    /* on the chief or the canton, if the coat has one; above everything else if not */
    const place = (S.at === 'chief' && !hasO('chief')) || (S.at === 'canton' && !cant) ? 'top' : S.at;
    const r = R[place] || R.center, n = place === 'center' ? (S.n || 1) : place === 'canton' ? 1 : Math.min(3, S.n || 1);
    /* ON THE ORDINARY: when asked, or when several go in the middle of a coat
       that has one to carry them (three mullets on a bend). One beast in the
       middle stays a beast in the middle — it is not shrunk onto a fess. */
    const car = carrierFor(A, Object.assign({}, S, { at: place, n }), W, H, RM);
    if (car){ car.on.pts.forEach(p => out.push({ S, fixed: 1, x: p[0], y: p[1], size: fitSize(S.c, car.on.s, car.on.s) * (SIZE_K[S.size || 'l'] / .92) }));
              continue; }
    const how = place === 'center' ? S.how : (place === 'left' || place === 'right') ? 'inPale' : 'inFess';
    /* SIZE. grumkata: things "too big" and clipped, "at the same time other
       things are too small making the shield look empty". Left unsaid, a
       symbol is as large as its place allows — and keepInside, below, takes
       back only what would cross the edge. */
    const onBand = place === 'chief' || place === 'canton';
    const anchor = { left:'l', right:'r', top:'t', bottom:'b' }[place] || '';
    for (const c of cells(n, how, r.x, r.y, r.w, r.h))
      out.push({ S, fixed: onBand ? 1 : 0, anchor: n > 1 && (anchor === 't' || anchor === 'b') ? '' : anchor, x: c.x, y: c.y,
                 size: fitSize(S.c, c.w * (onBand ? SIZE_K[S.size || 'l'] : .7), c.h * (onBand ? SIZE_K[S.size || 'l'] : .7)) });
  }
  /* THEN THEY GROW. grumkata: "the scaling is always fucked up". Every
     symbol used to be sized to a fixed share of the cloth and left there, so
     a pair facing each other sat small in a big empty field. Now the places
     only say WHERE; how big is found by growing everything together until
     something would cross the edge of the shield or banner, leave the room
     (below a chief, inside a wreath), or touch its neighbour — and then
     each one on its own, so a tall lion and a long horse both fill their
     side. "Small" and "Medium" are then that, scaled down. */
  grow(out.filter(p => !p.box && !p.fixed), P, { x0, x1, y0, y1 }, gap, W);
  out.forEach(p => { if (!p.box && !p.fixed && (p.S.size === 's' || p.S.size === 'm'))
    p.size *= p.S.size === 's' ? .58 : .8; });
  /* and nothing over the edge */
  if (P) out.forEach(p => { if (!p.box && !p.grown) keepInside(P, p, gap); });
  return out;
}

/* ══ LAYING THE ORDINARIES ON ═════════════════════════════════
   In the order they were added — except that a chief and a base are bands
   that TAKE ROOM from the field: anything that crosses the field (a bend, a
   cross, a saltire) runs in what is left between them, not through them;
   and a canton sits in the corner below a chief, over whatever else is
   there. `wrap` lets the caller raise each one off the cloth. */
const BAND = { chief:1, base:1, canton:1 };
/* a canton reaches from the top of the cloth (or the chief) to a third of the way down the arms */
const cantonHOf = (R, Z, W) => R.chief ? Math.min(Z.h*.3, W*.36) : Z.y + Math.min(Z.h*.3, W*.36);
function layOrdinaries(A, W, H, Z, c, wrap){
  const ords = A.ords || [], R = roomOf(A, Z), w = wrap || (m => m);
  /* the one that carries charges is drawn wider for them */
  const carried = new Set((A.syms || []).map(S => carrierFor(A, S, W, H, R)).filter(Boolean).map(x => x.g));
  const bands = Object.assign({}, Z, { chiefH: R.chief || Z.y + Z.h*.22,
    baseY: R.base || Math.min(Z.y + Z.h, Z.bot) - Z.h*.18, cantonY: R.chief || 0,
    cantonH: cantonHOf(R, Z, W) });
  const draw = (g, box, wideIt) => { const G = ordGeo(g.o, W, H, box, g.line, g.n, wideIt);
    if (!G) return ''; const M = paint(g.t, c);
    return w(G.d.map(d => '<path d="' + d + '" fill="' + M + '"/>').join('')); };
  return ords.filter(g => !BAND[g.o]).map(g => draw(g, R, carried.has(g))).join('') +
         ords.filter(g => g.o === 'chief' || g.o === 'base').map(g => draw(g, bands)).join('') +
         ords.filter(g => g.o === 'canton').map(g => draw(g, bands)).join('');
}

/* ══ A WHOLE RECORD, FILLED IN ════════════════════════════════
   Everything past `b` arrived after people already had arms saved. norm()
   is the one place that knows what an absent field means, so nothing
   downstream has to guess and no saved coat has to be migrated. */
const DEFAULTS = { div:'plain', a:'sable', b:'argent', line:'straight',
  ord:'none', ordT:'or', ordLine:'straight', chg:'', chgT:'or', chgN:1,
  chgA:'proper', bord:'', bordT:'or', hem:'swallow', livery:'', syms:[] };
function normSym(S){
  if (!S || !S.c) return null;
  const C = chargeDef(S.c);
  const o = { c: String(S.c), t: S.t || 'or',
    at: PLACES[S.at] ? S.at : (C && C.around ? 'around' : 'center'),
    size: SIZES[S.size] ? S.size : '', n: Math.max(1, Math.min(6, S.n | 0 || 1)),
    how: ARRANGE[S.how] ? S.how : 'proper', face: S.face === 'l' || S.face === 'r' ? S.face : '' };
  if (o.at !== 'center') o.n = Math.min(3, o.n);
  if (o.at === 'around') o.n = 1;
  return o;
}
function norm(A){
  const o = Object.assign({}, DEFAULTS, A || {});
  /* a bordure used to be a yes or a no; it is a kind now */
  if (o.bord === true) o.bord = 'plain';
  if (o.bord === false || o.bord == null) o.bord = '';
  if (!LINEABLE[o.div]) o.line = 'straight';
  if (!ORD_LINEABLE[o.ord]) o.ordLine = 'straight';
  o.chgN = Math.max(1, Math.min(6, o.chgN | 0 || 1));
  /* THE ORDINARIES. grumkata: "i wanted more stacked ordinaries". A coat has
     a list of them, drawn in order — a chief and a bend, a saltire and a
     cross over it, a canton. A coat saved with one has it as its first; and
     the first is still written back as "the" ordinary, for anything that
     reads a coat the old way. */
  o.ords = (Array.isArray(A && A.ords) ? A.ords
    : (o.ord && o.ord !== 'none' ? [{ o: o.ord, t: o.ordT, line: o.ordLine }] : []))
    .filter(g => g && ORDINARIES[g.o] && g.o !== 'none').slice(0, 6)
    .map(g => { const o = g.o === 'fessDouble' ? 'fess' : g.o;
      return { o, t: g.t || 'or', line: ORD_LINEABLE[o] && LINES[g.line] ? g.line : 'straight',
               n: STACKS[o] ? Math.max(1, Math.min(3, (g.o === 'fessDouble' ? 2 : g.n) | 0 || 1)) : 1 }; });
  const first = o.ords.find(g => g.o !== 'canton') || o.ords[0];
  if (first){ o.ord = first.o; o.ordT = first.t; o.ordLine = first.line; }
  else { o.ord = 'none'; o.ordLine = 'straight'; }
  /* THE SYMBOLS. A coat saved with one charge has it as its first symbol;
     and the first symbol in the centre is still written back as the charge,
     so anything that reads a coat the old way — and anybody at the table on
     a copy that has not updated yet — still sees the coat's main charge. */
  o.syms = (Array.isArray(A && A.syms) ? A.syms
    : (o.chg ? [{ c: o.chg, t: o.chgT, n: o.chgN, how: o.chgA, at: 'center' }] : []))
    .map(normSym).filter(Boolean).slice(0, 8);
  const main = o.syms.find(S => S.at === 'center') || o.syms[0];
  if (main){ o.chg = main.c; o.chgT = main.t; o.chgN = main.n; o.chgA = main.how; }
  else o.chg = '';
  return o;
}
/* is this a coat somebody actually chose, or the empty default? */
function blazoned(A){
  if (!A) return false;
  const o = norm(A);
  return o.div !== 'plain' || o.a !== 'sable' || o.syms.length > 0 || o.ords.length > 0 || !!o.bord;
}

/* ══ HOW IT IS MADE ═══════════════════════════════════════════
   The look grumkata picked from the samples, the bolder of the two: dyed
   and woven cloth with folds in it and a ripple through it, and the charges
   and bordure RAISED — lit from the upper left, casting a soft shadow onto
   the cloth — like gold and silver thread. A shield gets the same thread
   and dye but hangs no folds, being a board and not a cloth.

   Everything is sized off the drawing's width, so a 58px swatch and a
   420px hall banner are the same banner. `style:'flat'` draws without any
   of it, for the swatches in the maker's rows. */
function makeDefs(c, W, H, cloth){
  const k = W / 200, u = c.u;
  const stop = (o, col, a) => '<stop offset="' + o + '" stop-color="' + col + '" stop-opacity="' + a + '"/>';
  return '<filter id="rz-' + u + '" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + f2(1.6*k) + '" result="bl"/>' +
      '<feSpecularLighting in="bl" surfaceScale="' + f2(4.5*k) + '" specularConstant="1.1" specularExponent="16" lighting-color="#fff0c0" result="sp">' +
        '<feDistantLight azimuth="225" elevation="42"/></feSpecularLighting>' +
      '<feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>' +
      '<feComposite in="SourceGraphic" in2="spi" operator="arithmetic" k2="1" k3=".75" result="lit"/>' +
      '<feOffset in="SourceAlpha" dx="' + f2(1.5*k) + '" dy="' + f2(3.5*k) + '" result="off"/>' +
      '<feGaussianBlur in="off" stdDeviation="' + f2(2.6*k) + '" result="sh"/>' +
      '<feFlood flood-color="#000" flood-opacity=".6"/><feComposite in2="sh" operator="in" result="shadow"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="lit"/></feMerge></filter>' +
    /* an ordinary: the same light, but only at its edges, and a lighter shadow */
    '<filter id="ro-' + u + '" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">' +
      '<feMorphology in="SourceAlpha" operator="erode" radius="' + f2(2.2*k) + '" result="core"/>' +
      '<feComposite in="SourceAlpha" in2="core" operator="out" result="rim"/>' +
      '<feGaussianBlur in="rim" stdDeviation="' + f2(1.2*k) + '" result="bl"/>' +
      '<feSpecularLighting in="bl" surfaceScale="' + f2(3*k) + '" specularConstant=".7" specularExponent="14" lighting-color="#fff0c0" result="sp">' +
        '<feDistantLight azimuth="225" elevation="40"/></feSpecularLighting>' +
      '<feComposite in="sp" in2="rim" operator="in" result="spi"/>' +
      '<feComposite in="SourceGraphic" in2="spi" operator="arithmetic" k2="1" k3=".45" result="lit"/>' +
      '<feOffset in="SourceAlpha" dx="' + f2(1.2*k) + '" dy="' + f2(2.6*k) + '" result="off"/>' +
      '<feGaussianBlur in="off" stdDeviation="' + f2(2*k) + '" result="sh"/>' +
      '<feFlood flood-color="#000" flood-opacity=".42"/><feComposite in2="sh" operator="in" result="shadow"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="lit"/></feMerge></filter>' +
    '<filter id="wv-' + u + '" x="0" y="0" width="100%" height="100%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + f2(1.4/k) + ' ' + f2(.18/k) + '" numOctaves="1" seed="3" result="a"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + f2(.18/k) + ' ' + f2(1.4/k) + '" numOctaves="1" seed="9" result="b"/>' +
      '<feBlend in="a" in2="b" mode="multiply" result="ab"/>' +
      '<feColorMatrix in="ab" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1"/></filter>' +
    '<filter id="dy-' + u + '" x="0" y="0" width="100%" height="100%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + (.012/k).toFixed(4) + ' ' + (.02/k).toFixed(4) + '" numOctaves="3" seed="11"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.45"/></filter>' +
    '<linearGradient id="vt-' + u + '" x1="0" y1="0" x2="0" y2="1">' + stop(0, '#000', .3) + stop(.1, '#000', 0) +
      stop(.8, '#000', 0) + stop(1, '#000', .35) + '</linearGradient>' +
    (cloth
      ? '<linearGradient id="fo-' + u + '" x1="0" x2="1">' + [[0,.34],[.14,0],[.3,.2],[.47,0],[.63,.22],[.8,0],[1,.36]]
          .map(x => stop(x[0], '#000', x[1])).join('') + '</linearGradient>' +
        '<linearGradient id="hl-' + u + '" x1="0" x2="1">' + [[.08,0],[.2,.1],[.3,0],[.55,0],[.7,.08],[.8,0]]
          .map(x => stop(x[0], '#fff', x[1])).join('') + '</linearGradient>' +
        '<filter id="rp-' + u + '" x="-5%" y="-3%" width="110%" height="106%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="' + (.014/k).toFixed(4) + ' ' + (.005/k).toFixed(4) + '" numOctaves="2" seed="5"/>' +
          '<feDisplacementMap in="SourceGraphic" scale="' + f2(9*k) + '" xChannelSelector="R" yChannelSelector="G"/></filter>'
      : '<radialGradient id="hl-' + u + '" cx=".32" cy=".24" r=".8">' + stop(0, '#fff', .16) + stop(.6, '#fff', 0) + '</radialGradient>');
}

function armsSVG(A0, o){
  o = o || {};
  const A = norm(A0);
  const W = o.w || 200, H = o.h || (o.shape === 'shield' ? 240 : 400);
  const shape = o.shape || 'banner';
  const rich = o.style !== 'flat';
  const cloth = rich && shape !== 'shield';
  const edge = o.edge || 5;
  const c = ctx(W);
  /* THE COAT OF ARMS WAS LOSING ITS OWN BORDER. The outline is stroked,
     and a stroke straddles its path — so the shape is inset by half the
     stroke width, or the outer half is clipped off by the <svg>'s own box. */
  const clip = shape === 'shield' ? shieldPath(W, H, edge / 2)
             : 'M0,0 L' + W + ',0 ' + hem(o.hem || A.hem, W, H) + ' Z';
  const raise = m => m && rich ? '<g filter="url(#rz-' + c.u + ')">' + m + '</g>' : m;
  const R = '<rect width="' + W + '" height="' + H + '"';
  /* the fills are gathered FIRST and the defs written after, because a fur
     or a charge's body only declares itself when something is painted with it */
  const hemK = o.hem || A.hem, Z = zoneOf(W, H, shape, hemK);
  let inner = field(A.div, A.a, A.b, W, H, A.line, c, Z);
  if (rich) inner += R + ' filter="url(#dy-' + c.u + ')" style="mix-blend-mode:soft-light" opacity=".7"/>';
  /* THE ORDINARY IS CLOTH SEWN ON, NOT A CHARGE. grumkata: "the colors of
     the ordinary need to be worked with". It used to be lit like a charge —
     one gradient laid across the whole bend or saltire, so one end came out
     pale and the other dark, and a sheen over its broad flat middle turned
     Sable to grey. It is its own tincture now, evenly, with only its edges
     raised off the field. The bordure keeps the gilt light of a charge. */
  const lit = t => rich && !isFur(t) ? bodyOf(t, c) : null;
  inner += layOrdinaries(A, W, H, Z, c, m => m && rich ? '<g filter="url(#ro-' + c.u + ')">' + m + '</g>' : m);
  inner += raise(layoutSymbols(Object.assign({}, A, { hem: hemK }), W, H, shape, clip, Z).map(p => p.box
    /* a wreath is stretched to its box: it is a frame, and frames fit */
    ? (() => { const C = chargeDef(p.S.c);
        return '<svg x="' + f2(p.box.x) + '" y="' + f2(p.box.y) + '" width="' + f2(p.box.w) + '" height="' + f2(p.box.h) +
          '" viewBox="' + C.v + '" preserveAspectRatio="none" overflow="visible">' + tintDrawing(C.s, p.S.t, c) + '</svg>'; })()
    : chargeAt(p.S.c, p.S.t, W, H, p.x, p.y, p.size, c, faceFor(p.S))).join(''));
  let bordM = bordure(A.bord, A.bordT, W, H, clip, c);
  if (lit(A.bordT)) bordM = bordM.replace(/stroke="[^"]+"/, 'stroke="' + lit(A.bordT) + '"');
  inner += raise(bordM);
  let over = '';
  if (rich) over = R + ' filter="url(#wv-' + c.u + ')" opacity=".5" style="mix-blend-mode:multiply" pointer-events="none"/>' +
    (cloth ? R + ' fill="url(#fo-' + c.u + ')" pointer-events="none"/>' : '') +
    R + ' fill="url(#hl-' + c.u + ')" style="mix-blend-mode:screen" pointer-events="none"/>' +
    R + ' fill="url(#vt-' + c.u + ')" pointer-events="none"/>';
  else if (o.weave !== false)
    over = R + ' fill="url(#wv-' + c.u + ')" pointer-events="none"/>';
  const plainWeave = '<pattern id="wv-' + c.u + '" width="9" height="9" patternUnits="userSpaceOnUse">' +
    '<path d="M0,0 H9 M4.5,0 V9" stroke="#000" stroke-opacity=".055" stroke-width="1.6"/>' +
    '<path d="M0,4.5 H9" stroke="#fff" stroke-opacity=".035" stroke-width="1.6"/></pattern>';
  let body = '<g clip-path="url(#cp-' + c.u + ')">' + inner + over + '</g>' +
    '<path d="' + clip + '" fill="none" stroke="#0d0906" stroke-width="' + edge +
    '" stroke-opacity="' + (rich ? .6 : .8) + '"/>';
  /* a cloth ripples, edge and all — drawn a touch smaller so the ripple
     stays inside the picture */
  if (cloth) body = '<g transform="translate(' + f2(W*.015) + ',' + f2(H*.01) + ') scale(.97 .98)">' +
    '<g filter="url(#rp-' + c.u + ')">' + body + '</g></g>';
  /* xlink declared: some drawings mirror half of themselves with <use xlink:href>,
     and a banner drawn as an image is strict XML */
  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H +
    '" viewBox="0 0 ' + W + ' ' + H + '"><defs>' +
    '<clipPath id="cp-' + c.u + '"><path d="' + clip + '"/></clipPath>' +
    (rich ? makeDefs(c, W, H, cloth) : plainWeave) + defs(c) + '</defs>' + body + '</svg>';
}
const armsURL = (A, o) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(armsSVG(A, o));

/* the coat's symbols and ordinary without its field — what the hall's
   screens show large and faint behind their pages */
function device(A0, W, H){
  const A = norm(A0), c = ctx(W);
  const Z = zoneOf(W, H, 'banner', A.hem);
  const s = layOrdinaries(A, W, H, Z, c) +
    layoutSymbols(A, W, H, 'banner', null, Z).filter(p => !p.box)
      .map(p => chargeAt(p.S.c, p.S.t, W, H, p.x, p.y, p.size, c, faceFor(p.S))).join('');
  const d = defs(c);
  return (d ? '<defs>' + d + '</defs>' : '') + s;
}

/* ══ THE LIVERY ═══════════════════════════════════════════════
   Which single colour out of a whole coat does the app wear? (42-shell.js
   sets it on <html> as --m-house.) The chrome is Sable and gilt, so the
   livery has to be a COLOUR and not a metal — Or would vanish into the
   plaques, Sable into the panel it is drawn on. Furs give up their spot
   tincture if that is a colour, and their ground otherwise.

   Preference runs from the most personal choice outwards: what you picked,
   then the symbols you march under, then the ordinary, then the field. */
function liveryOf(A0){
  if (!A0) return null;
  const A = norm(A0);
  if (A.livery && /^#[0-9a-fA-F]{6}$/.test(A.livery)) return A.livery;
  if (A.livery && named(A.livery)) return liveryTint(A.livery);
  const tries = A.syms.filter(S => S.at !== 'around').map(S => S.t)
    .concat(A.ords.map(g => g.t), [A.bord ? A.bordT : 0, A.b, A.a]);
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
   picture is one draughtsman's reading of it. Nothing prints it under a
   banner (grumkata: "don't put words under banners"); the loading screen
   keeps it, and the tests hold the drawing to it. */
const COUNT = ['', 'a', 'two', 'three', 'four', 'five', 'six'];
const plural1 = w => /(s|x|sh|ch)$/.test(w) ? w + 'es'
                  : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
/* "suns in splendour", "garbs of wheat", "lions rampant": the noun is the
   first word, and what follows it — a place, an attitude — does not change */
const plural = w => { const m = /^(\S+)(\s+(?:in|of|rampant|passant|displayed)\b.*)$/.exec(w);
  return m ? plural1(m[1]) + m[2] : plural1(w); };
/* the charge list names things as 'A lion' — the article is the list's, and
   a blazon supplies its own */
const bare = n => String(n || '').replace(/^(an?|the|two)\s+/i, '').toLowerCase();
const FIELD_SAY = { perPale:'Per pale', perFess:'Per fess', quarterly:'Quarterly',
  perBend:'Per bend', perBendSin:'Per bend sinister', perChevron:'Per chevron',
  perSaltire:'Per saltire', tierced:'Tierced in pale', barry:'Barry', paly:'Paly',
  bendy:'Bendy', chevronny:'Chevronny', checky:'Checky', lozengy:'Lozengy',
  gyronny:'Gyronny', pily:'Pily' };
const WHERE_SAY = { left:'to the dexter', right:'to the sinister', top:'in chief', bottom:'in base',
  chief:'on the chief', canton:'on the canton', on:'on the ordinary' };
function blazonText(A0){
  const A = norm(A0), say = t => tname(t);
  const parts = [];
  if (A.div === 'plain') parts.push(say(A.a));
  else parts.push(FIELD_SAY[A.div] + (A.line !== 'straight' ? ' ' + LINES[A.line].toLowerCase() : '')
                  + ' ' + say(A.a) + ' and ' + say(A.b));
  const MANY = { fess:'bars', pale:'pallets', bend:'bendlets', bendSin:'bendlets sinister', chevron:'chevronels' };
  A.ords.forEach(g => {
    const n = bare(ORDINARIES[g.o]);
    parts.push((g.n > 1 ? COUNT[g.n] + ' ' + MANY[g.o] : /^two/.test(ORDINARIES[g.o].toLowerCase()) ? 'two ' + n : 'a ' + n)
      + (g.line !== 'straight' ? ' ' + LINES[g.line].toLowerCase() : '')
      + ' ' + say(g.t));
  });
  A.syms.forEach(S => {
    const C = chargeDef(S.c);
    const n = bare(C ? C.n : S.c);
    /* "an eagle", "an owl" — but "a unicorn" */
    const one = S.n === 1 && /^(?!uni)[aeiou]/.test(n) ? 'an' : COUNT[S.n];
    /* a charge that is itself a pair — two keys in saltire — is counted in pairs */
    const pair = C && /^two\s/i.test(C.n);
    const what = pair ? (S.n === 1 ? 'two ' + n : COUNT[S.n] + ' pairs of ' + n) : one + ' ' + (S.n > 1 ? plural(n) : n);
    /* the arrangement comes AFTER the tincture, as a herald says it:
       "three lions Sable in pale", never "three lions in pale Sable" */
    parts.push((S.at === 'around' ? 'within ' : '') + what
      + ' ' + say(S.t)
      + (S.n > 1 && S.how !== 'proper' ? ' ' + ARRANGE[S.how].toLowerCase() : '')
      + (WHERE_SAY[S.at] ? ' ' + WHERE_SAY[S.at] : ''));
  });
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
  const clash = (x, y) => named(x) && named(y) && kind(x) !== 'fur' && kind(y) !== 'fur' && kind(x) === kind(y);
  /* each ordinary on the field; symbols on the field where no ordinary
     carries them; and what sits on a chief or canton, on that */
  const tOf = k => (A.ords.find(g => g.o === k) || {}).t;
  if (flat && A.ords.some(g => clash(g.t, A.a)))
    out.push(isMetal(A.a) ? 'metal on metal' : 'colour on colour');
  if (flat && !A.ords.some(g => g.o !== 'chief' && g.o !== 'canton' && g.o !== 'base') &&
      A.syms.some(S => (S.at !== 'chief' || !tOf('chief')) && (S.at !== 'canton' || !tOf('canton')) && clash(S.t, A.a)))
    out.push('a charge shares its nature with the field');
  if (A.syms.some(S => (S.at === 'chief' && clash(S.t, tOf('chief'))) || (S.at === 'canton' && clash(S.t, tOf('canton')))))
    out.push('a charge shares its nature with what it lies on');
  return out.length ? 'Against the rule of tincture — ' + out.join(', ') : '';
}

/* ══ ROLLING A COAT ═══════════════════════════════════════════
   grumkata: rolls should "actually look nice". The old roll drew four or
   five tinctures without replacement and picked every slot on its own —
   which is how a coat comes out looking like a flag of convenience.

   Real arms are a few patterns in two or three tinctures, so a roll picks
   one: a single beast filling the cloth; three of something; an ordinary
   carrying charges; two beasts facing each other, perhaps under a crown;
   a wreath with something inside it. The palette alternates metal and
   colour so nothing sits on its own kind. */
const COLOURS_W = [['gules',5],['azure',5],['sable',3],['vert',3],['purpure',1.4],['murrey',.5],['tenne',.4],['bleu',.5]];
const METALS_W = [['or',5],['argent',4]];
/* beasts and big things that can fill the cloth alone; things that come in threes */
const BEASTS = ['lion','lionpassant','eagle','griffin','dragon','unicorn','boar','bear','wolf','stag','horse','bull','goat','swan','dolphin','raven','owl'];
/* beasts that stand up to face each other: a walking horse or boar is long
   and low, and two of them side by side on a hanging banner come out small */
const FACING = ['lion','griffin','dragon','unicorn','bear','wolf'];
const SMALL = ['fleur','rose','star','estoile','moon','crown','escallop','heart','acorn','bell','keys','crosslet','boarhead','tower','wheat','oakleaf','sun','grail'];
const OBJECTS = ['castle','tower','tree','sun','crown','helm','lymphad','harp','anchor','swords','keys','grail','gate','sword','skull','mace','axe','gauntlet'];
function roll(){
  const pickW = list => { const tot = list.reduce((s, x) => s + x[1], 0); let r = Math.random() * tot;
    for (const x of list){ r -= x[1]; if (r <= 0) return x[0]; } return list[list.length - 1][0]; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const have = a => a.filter(k => chargeDef(k));
  /* the palette: the field, a tincture that reads on it, and a third that
     reads on that — never more than three, never one on its own kind */
  const metalField = Math.random() < 0.35;
  let a = pickW(metalField ? METALS_W : COLOURS_W);
  if (Math.random() < 0.08) a = pick(metalField ? ['ermine','erminois','vair'] : ['ermines','pean']);
  const x = pickW(metalField ? COLOURS_W : METALS_W);
  const y = pickW((metalField ? METALS_W : COLOURS_W).filter(w => w[0] !== a).concat(metalField ? [] : [['sable', .01]]));
  const A = { div:'plain', a, b:x, line:'straight', ord:'none', ordT:x, ordLine:'straight',
              syms:[], bord:'', bordT:x, hem: pick(Object.keys(HEMS)) };
  const kind = pickW([['beast',22],['three',14],['ordinary',14],['pair',10],['wreath',8],['object',8],['divided',9],
    ['chief',10],['canton',4],['crossed',3]]);
  if (kind === 'beast') A.syms = [{ c: pick(have(BEASTS)), t: x, at:'center' }];
  if (kind === 'object') A.syms = [{ c: pick(have(OBJECTS)), t: x, at:'center' }];
  if (kind === 'three') A.syms = [{ c: pick(have(SMALL)), t: x, at:'center', n: pickW([[3,8],[2,1],[4,1],[5,1],[6,1]]) }];
  if (kind === 'ordinary'){
    A.ord = pickW([['bend',5],['fess',5],['chevron',5],['pale',3],['cross',4],['saltire',4],['chief',3],['pile',1],['bendSin',1]]);
    if (A.ord !== 'pile' && Math.random() < 0.25) A.ordLine = pick(['wavy','engrailed','indented','embattled','invected']);
    if (!ORD_LINEABLE[A.ord]) A.ordLine = 'straight';
    const counts = { bend:[3,3,1], bendSin:[3,1], fess:[3,3,1], pale:[3,1], cross:[1,5], saltire:[1,5], chevron:[3,1], chief:[3] }[A.ord];
    if (counts && Math.random() < 0.7)
      A.syms = [{ c: pick(have(SMALL)), t: A.ord === 'chief' ? x : (y !== a ? a : y), at:'center', n: pick(counts) }];
    if (A.ord === 'chief' && A.syms.length){ A.syms[0].t = x; A.syms[0].at = 'center'; A.syms[0].n = 1;
      A.syms[0].c = pick(have(BEASTS)); }
  }
  /* STACKED: a chief carrying small charges over the main one below it */
  if (kind === 'chief'){
    A.ords = [{ o:'chief', t: x, line: Math.random() < 0.2 ? pick(['indented','embattled','wavy']) : 'straight' }];
    /* what is on the chief is of the field's kind, so it reads on the chief */
    const onChief = metalField ? pickW(METALS_W) : pickW(COLOURS_W.filter(w => w[0] !== x));
    A.syms = [{ c: pick(have(SMALL)), t: onChief, at:'chief', n: pickW([[3,5],[2,1],[1,1]]) }];
    if (Math.random() < 0.6) A.syms.push({ c: pick(have(BEASTS.concat(OBJECTS))), t: x, at:'center' });
    else A.ords.push({ o: pick(['fess','chevron','bend','pale','saltire']), t: x, line:'straight' });
  }
  /* a canton in the corner, on a coat with something of its own */
  if (kind === 'canton'){
    const ct = pickW((metalField ? COLOURS_W : METALS_W).filter(w => w[0] !== x));
    A.ords = [{ o:'canton', t: ct, line:'straight' }];
    A.syms = Math.random() < 0.5 ? [{ c: pick(have(BEASTS)), t: x, at:'center' }]
                                 : [{ c: pick(have(SMALL)), t: x, at:'center', n: 3 }];
    if (Math.random() < 0.5) A.syms.push({ c: pick(have(['star','fleur','rose','crown','estoile'])),
      t: metalField ? pickW(METALS_W) : pickW(COLOURS_W), at:'canton' });
  }
  /* two ordinaries crossing: a saltire under a cross, a pale over a fess */
  if (kind === 'crossed'){
    const pair = pick([['saltire','cross'], ['fess','pale'], ['bend','bendSin'], ['saltire','pale']]);
    const x2 = pickW((metalField ? COLOURS_W : METALS_W).filter(w => w[0] !== x && w[0] !== a));
    A.ords = [{ o: pair[0], t: x, line:'straight' }, { o: pair[1], t: x2, line:'straight' }];
  }
  if (kind === 'pair'){
    const one = pick(have(FACING)), two = Math.random() < 0.5 ? one : pick(have(FACING));
    /* the second beast may differ in tincture, but only to the other of the
       first one's kind — a lion Or and a unicorn Argent, both on the colour */
    const x2 = pickW((metalField ? COLOURS_W : METALS_W).filter(w => w[0] !== x && w[0] !== a));
    A.syms = [{ c: one, t: x, at:'left' }, { c: two, t: Math.random() < 0.3 ? x2 : x, at:'right' }];
    if (Math.random() < 0.6) A.syms.push({ c: pick(have(['crown','star','estoile','fleur','sun'])), t: x, at:'top' });
  }
  if (kind === 'wreath'){
    A.syms = [{ c: pick(have(['wreath','laurel'])), t: x, at:'around' }];
    if (Math.random() < 0.6) A.syms.push({ c: pick(have(BEASTS.concat(OBJECTS))), t: x, at:'center' });
    else { const one = pick(have(FACING));
      A.syms.push({ c: one, t: x, at:'left' }, { c: pick(have(FACING)), t: x, at:'right' });
      if (Math.random() < 0.7) A.syms.push({ c: 'crown', t: x, at:'top', size:'s' }); }
  }
  if (kind === 'divided'){
    /* a cut field is a colour and a metal. Nothing laid across both halves
       can keep the rule on both, so it is either left clean, or crossed by
       an ordinary in Sable (Argent on a Sable field) — the old heralds'
       answer, "Quarterly Or and Gules, a bend Sable" */
    A.div = pickW([['perPale',4],['perFess',4],['perBend',3],['quarterly',3],['perChevron',2],['barry',1],['paly',1]]);
    A.a = pickW(COLOURS_W.filter(w => w[0] !== 'sable')); A.b = pickW(METALS_W);
    if (Math.random() < 0.5) A.ords = [{ o: pick(['bend','fess','cross','saltire','chevron','pale']), t:'sable', line:'straight' }];
  }
  if (Math.random() < 0.18 && kind !== 'wreath' && kind !== 'canton'){ A.bord = Math.random() < 0.2 ? 'compony' : 'plain';
    A.bordT = kind === 'divided' ? 'sable' : x; }
  if (!A.ords && A.ord !== 'none') A.ords = [{ o: A.ord, t: A.ordT, line: A.ordLine }];
  /* now and then the one ordinary is two or three of it: chevronels, bars, bendlets */
  if (A.ords && A.ords.length === 1 && STACKS[A.ords[0].o] && !A.syms.some(S => S.at === 'on' || S.n > 1) && Math.random() < .3)
    A.ords[0].n = Math.random() < .5 ? 2 : 3;
  return norm(A);
}

root.Heraldry = { TINCT, TNAME, METALS, FURS, LINES, LINEABLE, ORD_LINEABLE,
                  BORDURES, ARRANGE, HEMS, DEFAULTS, PLACES, SIZES,
                  isMetal, isFur, named, col, tname, ctx, paint, defs, ORD_LINEABLE_ALL: ORD_LINEABLE,
                  DIVISIONS, ORDINARIES, chargeList, chargeDef, line,
                  field, ordinary, bordure, charge, chargeAt, spots, hem,
                  shieldPath, norm, blazoned, armsSVG, armsURL, device, layoutSymbols, zoneOf, STACKS,
                  liveryOf, liveryTint, blazonText, tinctureWarning, roll };
})(window);
