/* ══════════════════════════════════════════════════════════════
   HERALDRY — the drawing system for the whole menu.

   Every banner in the hall, the arms you march under, and the flag maker all
   render from one record:

     { div, a, b,          the field and how it is divided
       ord, ordT,          the ordinary laid over it
       chg, chgT, chgN,    the charge, its tincture, and how many
       bord, bordT }       a bordure round the edge, or none

   Heraldry is natively vector — a field, a division, an ordinary, a charge —
   which is why it can be drawn honestly in code. The rule of tincture (never
   colour on colour, never metal on metal) is shown as advice in the maker and
   never enforced: it is a rule of the art, and people break it on purpose.

   Charges come from game-icons.net (CC BY 3.0) via charge_assets.js. Drawing
   them by hand was tried and they were poor.
══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

const TINCT = {
  gules:'#a3232b', azure:'#27508f', vert:'#2c6b41', purpure:'#67326f',
  sable:'#171310', tenne:'#8a4a1e', murrey:'#6d2038', bleu:'#5d7fa8',
  or:'#c9a227', argent:'#ded8c8'
};
const TNAME = { gules:'Gules', azure:'Azure', vert:'Vert', purpure:'Purpure',
  sable:'Sable', tenne:'Tenné', murrey:'Murrey', bleu:'Bleu celeste',
  or:'Or', argent:'Argent' };
const METALS = ['or','argent'];
const isMetal = t => METALS.indexOf(t) >= 0;
const named   = t => !!TINCT[t];
/* a slot holds a tincture name or any colour, so "pick your own" costs nothing */
const col = t => TINCT[t] || (/^#|^rgb|^hsl/.test(String(t)) ? t : '#888');

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

function field(div, a, b, W, H){
  const A = col(a), B = col(b);
  const bg = `<rect width="${W}" height="${H}" fill="${A}"/>`;
  const R = (x,y,w,h) => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}"
    width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${B}"/>`;
  let s = '';
  switch(div){
    case 'perPale':    return bg + R(W/2, 0, W/2, H);
    case 'perFess':    return bg + R(0, H/2, W, H/2);
    case 'quarterly':  return bg + R(W/2, 0, W/2, H/2) + R(0, H/2, W/2, H/2);
    case 'perBend':    return bg + `<path d="M0,0 L${W},0 L0,${H} Z" fill="${B}"/>`;
    case 'perBendSin': return bg + `<path d="M${W},0 L${W},${H} L0,0 Z" fill="${B}"/>`;
    case 'perChevron': return bg + `<path d="M0,${H} L${W/2},${H*0.44} L${W},${H} Z" fill="${B}"/>`;
    case 'perSaltire': return bg + `<path d="M0,0 L${W/2},${H/2} L${W},0 Z" fill="${B}"/>
                                    <path d="M0,${H} L${W/2},${H/2} L${W},${H} Z" fill="${B}"/>`;
    case 'tierced':    return bg + R(W/3, 0, W/3, H);
    case 'barry':      for (let i=1;i<8;i+=2) s += R(0, H*i/8, W, H/8); return bg + s;
    case 'paly':       for (let i=1;i<6;i+=2) s += R(W*i/6, 0, W/6, H); return bg + s;
    case 'bendy':
      /* the stripes run at 45 degrees, so on a tall banner the top of a stripe
         and its bottom are H apart in x — the loop has to reach that far or the
         hem comes out bare */
      { const step = W/6, n = Math.ceil((W + H)/step) + 2;
        for (let i=0;i<n;i+=2)
          s += `<path d="M${(i*step).toFixed(2)},0 L${((i+1)*step).toFixed(2)},0
                L${((i+1)*step - H).toFixed(2)},${H} L${(i*step - H).toFixed(2)},${H} Z"
                fill="${B}"/>`;
        return bg + s; }
    case 'chevronny':
      for (let i=0;i<5;i++){ const y=H*(0.12+i*0.22);
        s += `<path d="M0,${y+H*0.11} L${W/2},${y-H*0.05} L${W},${y+H*0.11}
              L${W},${y+H*0.22} L${W/2},${y+H*0.06} L0,${y+H*0.22} Z" fill="${B}"/>`; }
      return bg + s;
    /* cells are square-ish whatever the shape: a banner is twice as tall as it
       is wide, and rows sized off H come out as long rectangles */
    case 'checky':
      { const n = 6, cw = W/n, chh = cw*1.1, rows = Math.ceil(H/chh);
        for (let r=0;r<rows;r++) for (let c=0;c<n;c++)
          if ((r+c)%2) s += R(c*cw, r*chh, cw, chh);
        return bg + s; }
    case 'lozengy':
      { const n = 5, cw = W/n, chh = cw*1.35, rows = Math.ceil(H/chh)+2;
        for (let r=-1;r<rows;r++) for (let c=-1;c<=n;c++){
          const x = c*cw + (Math.abs(r%2) ? cw/2 : 0), y = r*chh;
          s += `<path d="M${(x+cw/2).toFixed(2)},${y.toFixed(2)}
                L${(x+cw).toFixed(2)},${(y+chh/2).toFixed(2)}
                L${(x+cw/2).toFixed(2)},${(y+chh).toFixed(2)}
                L${x.toFixed(2)},${(y+chh/2).toFixed(2)} Z" fill="${B}"/>`; }
        return bg + s; }
    case 'gyronny':
      { const cx=W/2, cy=H*0.44, r=Math.max(W,H)*1.6;
        for (let i=0;i<8;i+=2){
          const a1=(i*45-90)*Math.PI/180, a2=((i+1)*45-90)*Math.PI/180;
          s += `<path d="M${cx},${cy} L${cx+Math.cos(a1)*r},${cy+Math.sin(a1)*r}
                L${cx+Math.cos(a2)*r},${cy+Math.sin(a2)*r} Z" fill="${B}"/>`; }
        return bg + s; }
    case 'pily':
      { const n=5;
        for (let i=0;i<n;i++) s += `<path d="M${W*i/n},0 L${W*(i+1)/n},0
          L${W*(i+0.5)/n},${H*0.62} Z" fill="${B}"/>`;
        return bg + s; }
    default: return bg;
  }
}

/* ══ THE ORDINARY ═════════════════════════════════════════════ */
const ORDINARIES = { none:'None', cross:'A cross', pale:'A pale', fess:'A fess',
  chevron:'A chevron', saltire:'A saltire', bend:'A bend', bendSin:'A bend sinister',
  chief:'A chief', base:'A base', pile:'A pile', pall:'A pall',
  crossPatee:'A cross patée', fessDouble:'Two bars' };

function ordinary(kind, t, W, H){
  const M = col(t), u = W*0.19;
  switch(kind){
    case 'cross':   return `<rect x="${W/2-u/2}" width="${u}" height="${H}" fill="${M}"/>
                            <rect y="${H*0.34-u/2}" width="${W}" height="${u}" fill="${M}"/>`;
    case 'crossPatee':
      return `<path d="M${W/2-u*0.34},0 L${W/2+u*0.34},0 L${W/2+u*0.62},${H*0.26}
        L${W},${H*0.20} L${W},${H*0.48} L${W/2+u*0.62},${H*0.42} L${W/2+u*0.34},${H}
        L${W/2-u*0.34},${H} L${W/2-u*0.62},${H*0.42} L0,${H*0.48} L0,${H*0.20}
        L${W/2-u*0.62},${H*0.26} Z" fill="${M}"/>`;
    case 'pale':    return `<rect x="${W/2-u*0.8}" width="${u*1.6}" height="${H}" fill="${M}"/>`;
    case 'fess':    return `<rect y="${H*0.40}" width="${W}" height="${H*0.20}" fill="${M}"/>`;
    case 'fessDouble': return `<rect y="${H*0.31}" width="${W}" height="${H*0.10}" fill="${M}"/>
                               <rect y="${H*0.53}" width="${W}" height="${H*0.10}" fill="${M}"/>`;
    case 'chevron': return `<path d="M0,${H*.66} L${W/2},${H*.34} L${W},${H*.66} L${W},${H*.80}
                            L${W/2},${H*.48} L0,${H*.80} Z" fill="${M}"/>`;
    case 'saltire': return `<path d="M0,0 L${u},0 L${W},${H-u} L${W},${H} L${W-u},${H} L0,${u} Z"
                              fill="${M}"/>
                            <path d="M${W},0 L${W-u},0 L0,${H-u} L0,${H} L${u},${H} L${W},${u} Z"
                              fill="${M}"/>`;
    case 'bend':    return `<path d="M0,0 L${u*1.3},0 L${W},${H-u*1.3} L${W},${H} L${W-u*1.3},${H}
                            L0,${u*1.3} Z" fill="${M}"/>`;
    case 'bendSin': return `<path d="M${W},0 L${W-u*1.3},0 L0,${H-u*1.3} L0,${H} L${u*1.3},${H}
                            L${W},${u*1.3} Z" fill="${M}"/>`;
    case 'chief':   return `<rect width="${W}" height="${H*0.20}" fill="${M}"/>`;
    case 'base':    return `<rect y="${H*0.80}" width="${W}" height="${H*0.20}" fill="${M}"/>`;
    case 'pile':    return `<path d="M0,0 L${W},0 L${W/2},${H*0.78} Z" fill="${M}"/>`;
    case 'pall':    return `<path d="M0,0 L${u},0 L${W/2+u/2},${H*0.42} L${W/2+u/2},${H}
      L${W/2-u/2},${H} L${W/2-u/2},${H*0.42} L${W-u},0 L${W},0 L${W},${u*0.7}
      L${W/2+u/2},${H*0.50} L${W/2+u/2},${H*0.50} L${W/2-u/2},${H*0.50}
      L0,${u*0.7} Z" fill="${M}"/>`;
    default: return '';
  }
}

/* a bordure is its own layer, not an ordinary — you can have both */
function bordure(on, t, W, H, clip){
  if (!on) return '';
  const w = Math.min(W, H) * 0.075;
  return `<path d="${clip}" fill="none" stroke="${col(t)}" stroke-width="${w*2}"/>`;
}

/* ══ THE CHARGE ═══════════════════════════════════════════════
   Real drawings, arranged the way a herald would: one in the middle, two side
   by side, three two-and-one. */
function chargeList(){ return root.CHARGES || {}; }

function chargeAt(kind, t, W, H, cx, cy, size){
  const C = chargeList()[kind];
  if (!C) return '';
  const vb = C.v.split(/\s+/).map(Number), span = Math.max(vb[2], vb[3]);
  const s = size / span;
  const x = cx - (vb[0] + vb[2]/2) * s, y = cy - (vb[1] + vb[3]/2) * s;
  return `<g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${s.toFixed(4)})"
             fill="${col(t)}">${C.d.map(d => `<path d="${d}"/>`).join('')}</g>`;
}

function charge(kind, t, W, H, n, opt){
  if (!kind) return '';
  n = n || 1;
  if (opt && opt.size) return chargeAt(kind, t, W, H, W/2, opt.cy!==undefined?opt.cy:H*0.46, opt.size);
  if (n === 1) return chargeAt(kind, t, W, H, W/2, H*0.46, W*0.50);
  if (n === 2) return chargeAt(kind, t, W, H, W*0.29, H*0.44, W*0.36)
                    + chargeAt(kind, t, W, H, W*0.71, H*0.44, W*0.36);
  /* three: two in chief, one in base */
  return chargeAt(kind, t, W, H, W*0.29, H*0.28, W*0.33)
       + chargeAt(kind, t, W, H, W*0.71, H*0.28, W*0.33)
       + chargeAt(kind, t, W, H, W*0.50, H*0.66, W*0.33);
}

/* ══ THE SHAPES A COAT IS PAINTED ON ══════════════════════════ */
function hem(kind, W, H){
  if (kind === 'swallow') return `L${W},${H*.86} L${W*.72},${H} L${W*.5},${H*.90}
                                  L${W*.28},${H} L0,${H*.86}`;
  if (kind === 'dagged'){ let p = `L${W},${H*.90}`;
    for (let i=5;i>=0;i--) p += ` L${(W/6)*(i+.5)},${H} L${(W/6)*i},${H*.90}`;
    return p; }
  if (kind === 'pennon') return `L${W},${H*.72} L${W*.5},${H} L0,${H*.72}`;
  return `L${W},${H} L0,${H}`;
}
function shieldPath(W, H){
  return `M0,0 H${W} V${H*.58} C${W},${H*.82} ${W*.72},${H*.94} ${W/2},${H}
          C${W*.28},${H*.94} 0,${H*.82} 0,${H*.58} Z`;
}

function armsSVG(A, o){
  o = o || {};
  const W = o.w || 200, H = o.h || (o.shape === 'shield' ? 240 : 400);
  const shape = o.shape || 'banner';
  const clip = shape === 'shield' ? shieldPath(W, H)
             : `M0,0 L${W},0 ${hem(o.hem||'straight',W,H)} Z`;
  const inner = field(A.div, A.a, A.b, W, H)
              + ordinary(A.ord, A.ordT, W, H)
              + charge(A.chg, A.chgT, W, H, A.chgN)
              + bordure(A.bord, A.bordT, W, H, clip);
  const weave = o.weave === false ? '' : `<rect width="${W}" height="${H}" fill="url(#wv)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
      viewBox="0 0 ${W} ${H}">
    <defs>
      <clipPath id="cp"><path d="${clip}"/></clipPath>
      <pattern id="wv" width="9" height="9" patternUnits="userSpaceOnUse">
        <path d="M0,0 H9 M4.5,0 V9" stroke="#000" stroke-opacity=".055" stroke-width="1.6"/>
        <path d="M0,4.5 H9" stroke="#fff" stroke-opacity=".035" stroke-width="1.6"/>
      </pattern>
    </defs>
    <g clip-path="url(#cp)">${inner}${weave}</g>
    <path d="${clip}" fill="none" stroke="#0d0906" stroke-width="${o.edge||5}"
          stroke-opacity=".8"/>
  </svg>`;
}
const armsURL = (A, o) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(armsSVG(A, o));

/* the rule of tincture, as advice */
function tinctureWarning(A){
  const flat = A.div === 'plain';
  const out = [];
  if (A.ord !== 'none' && flat && isMetal(A.ordT) === isMetal(A.a))
    out.push(isMetal(A.a) ? 'metal on metal' : 'colour on colour');
  if (A.chg && flat && A.ord === 'none' && isMetal(A.chgT) === isMetal(A.a))
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
  const a    = metalField ? take(mets) : take(cols);
  const b    = metalField ? take(cols) : (mets.length ? take(mets) : take(cols));
  const ordT = metalField ? take(cols) : (mets.length ? take(mets) : take(cols));
  const chgT = metalField ? (cols.length ? take(cols) : take(mets))
                          : (mets.length ? take(mets) : take(cols));
  const bord = Math.random() < 0.4;
  const bordT = bord ? (metalField ? take(cols) : (mets.length ? take(mets) : take(cols)))
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
  return { div, a, b, ord, ordT,
           chg: Math.random() < 0.82 ? pick(chs) : '',
           chgT, chgN: pick([1,1,1,2,3]), bord, bordT };
}

root.Heraldry = { TINCT, TNAME, METALS, isMetal, named, col, DIVISIONS, ORDINARIES,
                  chargeList, field, ordinary, bordure, charge, chargeAt, hem,
                  shieldPath, armsSVG, armsURL, tinctureWarning, roll };
})(window);
