/* ══════════════════════════════════════════════════════════════
   heraldry-art.js — the heraldic drawings, made recolourable.

     node tools/heraldry-art.js       (writes src/js/02-charge-assets.js)

   grumkata, on the game-icon silhouettes the charges used to be:
   "cartoony… ugly… poorly placed". They are now real heraldic drawings
   from Wikimedia Commons (src/assets/heraldry/, who drew each and under
   what licence in credits.json), and this turns each one into something
   the app can paint in any tincture:

     {B}  the body          a lit gradient of the tincture
     {L}  a lighter part    teeth, windows, a seed — the tincture, lighter
     {D}  a darker part     a trunk, a handle — the tincture, darker
     {I}  the ink           the drawing's black lines, which are NOT drawn
                            black (grumkata: "the black outlines look silly")
                            but in the tincture's own deep shade
     {A}  armed and langued claws, tongue, beak: Gules, or Azure on Gules
     {U}  an id prefix      so two lions on one page do not share a gradient

   Most of the source drawings are one French series that paints in a fixed
   palette (#fcef3c Or, #fff Argent, #e20909 Gules, #2b5df2 Azure, #5ab532
   Vert, black ink), which is what makes this reliable. Each drawing still
   says below which of its colours is the body and which the accents,
   because a red tower is a red tower and a red tongue is a tongue.

   `f` is which way the beast faces as drawn: 'l' (to the viewer's left, as
   heraldry draws by default) or 'r'. Nothing for things with no face.
══════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'src', 'assets', 'heraldry');
const OUT = path.join(__dirname, '..', 'src', 'js', '02-charge-assets.js');
const credits = JSON.parse(fs.readFileSync(path.join(DIR, 'credits.json'), 'utf8'));

const INK = ['#000', '#000000', 'black', '#280000', '#1a1a1a'];
const C = {
  lion:       { n:'A lion rampant', f:'l', map:{ '#ffffff':'B', '#e20909':'A' } },
  lionpassant:{ n:'A lion passant', f:'l', map:{ '#ffffff':'B', '#2b5df2':'A', '#fcef3c':'A' } },
  eagle:      { n:'An eagle', map:{ '#2b5df2':'B', '#fcef3c':'A', '#fff03c':'A', '#e20909':'A' } },
  griffin:    { n:'A griffin', f:'l', map:{ '#fcef3c':'B', '#e20909':'A', 'white':'L' } },
  dragon:     { n:'A dragon', f:'l', map:{ '#e20909':'B', '#2b5df2':'A', '#fff':'L' } },
  unicorn:    { n:'A unicorn', f:'l', map:{ '#ffffff':'B' } },
  boar:       { n:'A boar', f:'l', map:{ '#fcef3c':'B', '#e20909':'A', '#fff':'L', '#5ab532':'A' } },
  boarhead:   { n:"A boar's head", f:'l', map:{ '#000':'B', '#545454':'I' }, fillInk:false },
  bear:       { n:'A bear', f:'l', map:{ '#ffffff':'B', '#ff0000':'A' }, strokeMap:{ '#ffffff':'L' } },
  wolf:       { n:'A wolf', f:'l', map:{ '#ffffff':'B' } },
  stag:       { n:'A stag', f:'l', map:{ '#ffffff':'B' } },
  horse:      { n:'A horse', f:'l', map:{ '#ffffff':'B' } },
  bull:       { n:'A bull', f:'l', map:{ '#fcef3c':'B' } },
  goat:       { n:'A goat', f:'l', map:{ '#fff':'B' } },
  raven:      { n:'A raven', f:'l', map:{ '#000000':'B' }, fillInk:false, strokeMap:{ '#ffffff':'L' } },
  swan:       { n:'A swan', f:'l', map:{ '#fff':'B', '#e20909':'A', '#fcef3c':'A' } },
  owl:        { n:'An owl', map:{ 'white':'B', '#fcef3c':'A' } },
  serpent:    { n:'A serpent', map:{ '#5ab532':'B', '#e20909':'A' } },
  dolphin:    { n:'A dolphin', f:'l', map:{ '#ffffff':'B', '#e20909':'A', '#2b5df2':'A' } },
  fleur:      { n:'A fleur-de-lis', map:{ '#fff':'B' } },
  rose:       { n:'A rose', map:{ 'red':'B', '#ff0':'L', '#0f0':'D' } },
  oakleaf:    { n:'An oak leaf', map:{ '#5ab532':'B' } },
  acorn:      { n:'An acorn', map:{ '#5ab532':'B', '#fcef3c':'L' } },
  wheat:      { n:'A garb of wheat', map:{ '#fcef3c':'B' } },
  tree:       { n:'A tree', map:{ '#5ab532':'B', '#804000':'D' } },
  crown:      { n:'A crown', map:{ '#fcef3c':'B' } },
  crownsharp: { n:'An eastern crown', map:{ '#fcef3c':'B' } },
  helm:       { n:'A helm', map:{ '#fcef3c':'B' } },
  sword:      { n:'A sword', map:{ '#ffffff':'B', '#fcef3c':'L' } },
  swords:     { n:'Two swords in saltire', map:{ 'white':'B', '#fcef3c':'L' } },
  axe:        { n:'An axe', map:{ '#ffffff':'B', '#2b5df2':'D' } },
  mace:       { n:'A mace', map:{ '#ffffff':'B' } },
  spears:     { n:'A spearhead', map:{ '#fff':'B', '#fcef3c':'L' } },
  tower:      { n:'A tower', map:{ '#e20909':'B', '#fff':'D' } },
  castle:     { n:'A castle', map:{ '#e20909':'B' } },
  gate:       { n:'A gate', map:{ '#fcef3c':'B' } },
  anchor:     { n:'An anchor', map:{ '#ff0':'B' } },
  bell:       { n:'A bell', map:{ '#fcef3c':'B' } },
  keys:       { n:'Two keys in saltire', map:{ '#fcef3c':'B' } },
  grail:      { n:'A covered cup', map:{ '#fcef3c':'B', '#fff':'L' } },
  gauntlet:   { n:'A gauntlet', map:{ '#fcef3c':'B' } },
  estoile:    { n:'An estoile', map:{ '#fcef3c':'B' } },
  moon:       { n:'A crescent', map:{ '#fcef3c':'B' } },
  sun:        { n:'A sun in splendour', map:{ '#fcdd09':'B' } },
  heart:      { n:'A heart', map:{ '#fcef3c':'B' } },
  skull:      { n:"A death's head", map:{ '#fcef3c':'B' } },
  crosslet:   { n:'A cross crosslet', map:{}, defaultFill:'B' },
  lymphad:    { n:'A ship', f:'l', map:{ '#fff':'B' } },
  harp:       { n:'A harp', map:{ '#fcef3c':'B' } },
  escallop:   { n:'An escallop', map:{ '#fff':'B' } },
  wreath:     { n:'An olive wreath', map:{ 'green':'B' }, around:1 },
  laurel:     { n:'A laurel wreath', map:{ '#6d9d30':'B' }, around:1 }
};
/* drawn here rather than taken from the pack: the pack's own were poor */
const MADE = {
  star:   { n:'A mullet', v:'-50 -50 100 100', s: (() => {
    /* five rays, each lit on one side and shaded on the other */
    const pt = (a, r) => (Math.cos(a) * r).toFixed(2) + ',' + (Math.sin(a) * r).toFixed(2);
    let s = '';
    for (let i = 0; i < 5; i++){ const a = -Math.PI/2 + i * 2*Math.PI/5;
      s += '<path d="M0,0 L' + pt(a, 48) + ' L' + pt(a - Math.PI/5, 20) + 'Z" fill="{L}"/>' +
           '<path d="M0,0 L' + pt(a, 48) + ' L' + pt(a + Math.PI/5, 20) + 'Z" fill="{B}"/>'; }
    return s; })() },
  shield: { n:'A small shield', v:'0 0 100 120',
    s: '<path d="M4,4 H96 V70 C96,98 72,110 50,116 C28,110 4,98 4,70 Z" fill="{B}" stroke="{I}" stroke-width="3"/>' },
  /* the old names that no longer have a drawing of their own */
  eaglehead: { alias:'eagle' }, snake: { alias:'serpent' }
};

/* NO ROUNDING OF THE NUMBERS. It was tried, to save a hundred kilobytes, and
   it took the body off the eagle: these drawings are long runs of relative
   path commands, where every coordinate is added to the last, and the
   rounding of hundreds of them adds up. The drawings are kept as drawn. */
function convert(key, spec){
  let s = fs.readFileSync(path.join(DIR, key + '.svg'), 'utf8');
  /* the document around the drawing: prolog, editor metadata, comments */
  s = s.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/g, '').replace(/<!--[\s\S]*?-->/g, '')
       .replace(/<metadata[\s\S]*?<\/metadata>/g, '').replace(/<title[\s\S]*?<\/title>/g, '')
       .replace(/<desc[\s\S]*?<\/desc>/g, '').replace(/<sodipodi:namedview[\s\S]*?(\/>|<\/sodipodi:namedview>)/g, '')
       .replace(/<image[^>]*display="none"[^>]*\/>/g, '')
       .replace(/\s(inkscape|sodipodi):[\w-]+="[^"]*"/g, '');
  /* NOTHING FROM ANOTHER NAMESPACE. A banner is also drawn as an image — a
     data URL the hall and the table turn into a texture — and an image is
     parsed as strict XML, where one undeclared prefix (an Inkscape
     perspective, an Illustrator "i:knockout") fails the WHOLE banner. Only
     xlink: (declared on every banner) and xml: are kept. */
  s = s.replace(/<(\/?)svg:/g, '<$1')
       .replace(/<([a-zA-Z]+):([\w-]+)\b[^>]*\/>/g, '')
       .replace(/<([a-zA-Z]+):([\w-]+)\b[^>]*>[\s\S]*?<\/\1:\2>/g, '')
       .replace(/<\/[a-zA-Z]+:[\w-]+>/g, '')
       .replace(/\s(?!xlink:|xml:)[a-zA-Z]+:[\w-]+="[^"]*"/g, '');
  const root = /<svg\b[^>]*>/.exec(s);
  if (!root) throw new Error(key + ': no <svg>');
  const tag = root[0];
  let v = (/viewBox="([^"]+)"/.exec(tag) || [])[1];
  if (!v){ const w = parseFloat((/\bwidth="([\d.]+)/.exec(tag) || [])[1]), h = parseFloat((/\bheight="([\d.]+)/.exec(tag) || [])[1]);
    v = '0 0 ' + w + ' ' + h; }
  /* the root may carry presentation (stroke, stroke-width, fill) its children inherit */
  const inherit = ['fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap']
    .map(a => { const m = new RegExp('\\s' + a + '="([^"]*)"').exec(tag); return m ? ' ' + a + '="' + m[1] + '"' : ''; }).join('');
  let inner = s.slice(root.index + tag.length, s.lastIndexOf('</svg>'));

  const slot = (c, isStroke) => {
    c = c.toLowerCase();
    if (isStroke && spec.strokeMap && spec.strokeMap[c]) return '{' + spec.strokeMap[c] + '}';
    if (spec.map[c]) return '{' + spec.map[c] + '}';
    if (INK.indexOf(c) >= 0) return (!isStroke && spec.fillInk === false) ? '{B}' : '{I}';
    return null;
  };
  const colour = /(#[0-9a-fA-F]{3,6}\b|\b(?:black|white|red|green)\b)/;
  inner = inner.replace(/\b(fill|stroke)(\s*[:=]\s*"?)(#[0-9a-fA-F]{3,6}\b|black|white|red|green)/g,
    (m, k, sep, c) => { const r = slot(c, k === 'stroke'); return r ? k + sep + r : m; });
  let wrap = inherit.replace(/\b(fill|stroke)="(#[0-9a-fA-F]{3,6}|black|white|red|green)"/g,
    (m, k, c) => { const r = slot(c, k === 'stroke'); return r ? k + '="' + r + '"' : m; });
  /* a drawing that leaves its fill to the default is drawn in black by the
     browser — which here is the body, not the ink */
  if (spec.defaultFill && !/\bfill=/.test(wrap)) wrap += ' fill="{' + spec.defaultFill + '}"';
  else if (!/\bfill=/.test(wrap)) wrap += ' fill="{I}"';
  /* ids made unique per drawing on the page */
  const ids = new Set(); inner.replace(/\bid="([^"]+)"/g, (m, id) => ids.add(id));
  for (const id of ids){
    const e = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp('\\bid="' + e + '"', 'g'), 'id="{U}' + id + '"')
                 .replace(new RegExp('(url\\(#|href="#)' + e + '([")])', 'g'), '$1{U}' + id + '$2');
  }
  inner = (inner.replace(/\s+/g, ' ').replace(/> </g, '><').trim());
  const left = inner.match(colour);
  return { n: spec.n, v: v.trim().split(/[\s,]+/).map(Number).join(' '),
           s: '<g' + wrap + '>' + inner + '</g>', f: spec.f, around: spec.around, unmapped: left ? left[0] : '' };
}

(async () => {
const out = {}, report = [];
for (const [k, spec] of Object.entries(C)){
  const r = convert(k, spec);
  if (r.unmapped) report.push(k + ' keeps ' + r.unmapped);
  out[k] = { n: r.n, v: r.v, s: r.s };
  if (r.f) out[k].f = r.f;
  if (r.around) out[k].around = 1;
}
/* WHERE THE DRAWING ACTUALLY IS. A file's own size is not to be trusted:
   one is an A4 page in millimetres with a griffin somewhere on it, others
   carry a wide margin. So each is measured in a browser and its box is the
   drawing itself, a little room for its strokes, and nothing else — which
   is also what lets a charge be sized to fill its place. */
const { chromium } = require('playwright');
const b = await chromium.launch(), pg = await b.newPage();
await pg.setContent('<svg id=m xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
for (const k of Object.keys(out)){
  if (!out[k].s) continue;
  const box = await pg.evaluate(s => { const m = document.getElementById('m');
    m.innerHTML = s.split('{U}').join('m-').replace(/\{[A-Z]\}/g, '#888');
    const r = m.firstElementChild.getBBox(); return [r.x, r.y, r.width, r.height]; }, out[k].s);
  const pad = Math.max(box[2], box[3]) * 0.02;
  out[k].v = [box[0] - pad, box[1] - pad, box[2] + pad*2, box[3] + pad*2].map(n => Math.round(n * 100) / 100).join(' ');
}
for (const [k, m] of Object.entries(MADE)) out[k] = m.alias ? { alias: m.alias } : { n: m.n, v: m.v, s: m.s };
/* WHERE THE DRAWING IS PAINTED. grumkata: "the scaling is always fucked up…
   two things facing each other THEY ARE TINY". Sizing a drawing by its box
   wastes most of it — a rampant lion's box is half air, behind the tail and
   under the raised paw — so two boxes touch long before two lions do. Each
   drawing is painted here onto a small grid, and `m` records which cells
   hold paint: the heraldry sizes charges against the real silhouette.
   Rows of hex, most significant bit first; `g` is the grid's width,height. */
const GRID = 28;
await pg.setContent('<canvas id=c></canvas>');
for (const k of Object.keys(out)){
  if (!out[k].s) continue;
  const vb = out[k].v.split(' ').map(Number), long = Math.max(vb[2], vb[3]);
  const gw = Math.max(4, Math.round(GRID * vb[2] / long)), gh = Math.max(4, Math.round(GRID * vb[3] / long));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + gw * 8 +
    '" height="' + gh * 8 + '" viewBox="' + out[k].v + '" preserveAspectRatio="none">' +
    out[k].s.split('{U}').join('m-').replace(/\{[A-Z]\}/g, '#000') + '</svg>';
  const rows = await pg.evaluate(async ({ svg, gw, gh }) => {
    const img = new Image();
    await new Promise((r, e) => { img.onload = r; img.onerror = e;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); });
    const cv = document.getElementById('c'); cv.width = gw * 8; cv.height = gh * 8;
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0);
    const a = x.getImageData(0, 0, cv.width, cv.height).data, out = [];
    for (let j = 0; j < gh; j++){ let bits = '';
      for (let i = 0; i < gw; i++){ let n = 0;
        for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++)
          if (a[((j * 8 + yy) * cv.width + i * 8 + xx) * 4 + 3] > 60) n++;
        bits += n > 4 ? '1' : '0'; }
      out.push(bits); }
    return out;
  }, { svg, gw, gh });
  const hex = rows.map(r => { let h = ''; for (let i = 0; i < r.length; i += 4) h += parseInt((r.slice(i, i + 4) + '000').slice(0, 4), 2).toString(16); return h; });
  out[k].m = gw + ',' + gh + ':' + hex.join('.');
}
await b.close();

const CRED = Object.keys(credits).filter(k => C[k]).map(k => ({ k, file: credits[k].file, by: credits[k].author,
  lic: credits[k].license, url: credits[k].page }));
const js = '/* Heraldic drawings from Wikimedia Commons, recoloured by tools/heraldry-art.js.\n' +
  '   Who drew each and under what licence is CHARGE_CREDITS below, and is shown in\n' +
  '   Settings. The CC BY-SA drawings stay CC BY-SA as recoloured here. Do not remove it.\n' +
  '   GENERATED — edit src/assets/heraldry/ and the table in the tool, then rerun it. */\n' +
  'window.CHARGES=' + JSON.stringify(out) + ';\nwindow.CHARGE_CREDITS=' + JSON.stringify(CRED) + ';\n';
fs.writeFileSync(OUT, js);
console.log('  ' + Object.keys(out).length + ' charges, ' + (js.length / 1024 | 0) + ' KB -> ' + path.relative(process.cwd(), OUT));
if (report.length) console.log('  colours left as drawn: ' + report.join('; '));
})();
