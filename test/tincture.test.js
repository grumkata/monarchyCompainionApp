/* ══════════════════════════════════════════════════════════════
   tincture.test.js — the chrome and the banners are the same paint.

   The hall's banners are painted from TINCT in 12-heraldry.js. The
   chrome is painted from the --m-* tokens in 20-shell.css. Blazon's
   whole claim is that those are ONE palette, so this reads both and
   fails if a tincture has been retouched in one place and not the
   other — the kind of drift that is invisible in any single screen
   and is exactly how an app stops looking like one thing.

   It also holds the rule of tincture to its word: Argent must clear
   4.5:1 on every colour, and Or must clear 7:1 on Sable, because
   those are the two promises STYLE.md makes about text.
══════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

let bad = 0;
const T = (name, ok, why) => {
  console.log((ok ? 'ok    ' : 'FAIL  ') + name + (ok || !why ? '' : '  — ' + why));
  if (!ok) bad++;
};

const js = R('src/js/12-heraldry.js');
const block = (js.match(/const TINCT\s*=\s*\{([\s\S]*?)\};/) || [])[1] || '';
const tinct = {};
block.replace(/(\w+)\s*:\s*'(#[0-9a-f]{6})'/gi, (_, k, v) => { tinct[k] = v.toLowerCase(); });

const css = R('src/css/20-shell.css');
const token = {};
css.replace(/--m-(\w+)\s*:\s*(#[0-9a-f]{6})\s*;/gi, (_, k, v) => { token[k] = v.toLowerCase(); });

T('12-heraldry.js still has a TINCT table to read', Object.keys(tinct).length >= 8);
for (const k of Object.keys(tinct)) {
  T(`--m-${k} matches TINCT.${k}`, token[k] === tinct[k],
    `css ${token[k] || 'missing'} vs heraldry ${tinct[k]}`);
}

/* WCAG relative luminance and contrast */
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* the colours Blazon lets chrome and cloth be dyed */
for (const k of ['gules', 'azure', 'vert', 'purpure', 'sable', 'murrey']) {
  const r = ratio(tinct.argent, tinct[k]);
  T(`Argent reads on ${k} (${r.toFixed(2)}:1)`, r >= 4.5, 'body text would fail AA');
}
const os = ratio(tinct.or, tinct.sable);
T(`Or reads on Sable at any size (${os.toFixed(2)}:1)`, os >= 7);

console.log(bad ? `\n${bad} failed` : '\nall tinctures agree');
process.exit(bad ? 1 : 0);
