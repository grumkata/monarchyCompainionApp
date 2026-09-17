#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   fetch-fonts.js — put Blazon's four typefaces in src/assets/fonts.

     node tools/fetch-fonts.js

   Run it ONCE and commit what it writes. It is not part of the build:
   the app is packaged for players who may be offline, so the letters
   travel inside it like the textures do (build.js copies the folder
   beside the page), and nothing ever asks the network at runtime.

   Every family here is SIL Open Font License, which allows bundling:
     Cinzel               Natanael Gama        — engraved capitals
     Crimson Text         Sebastian Kosch      — the book's hand
     UnifrakturMaguntia   J. Victor Gaultney   — the mark
     Barlow Condensed     Jeremy Tribby        — tallies

   Only the LATIN subset is kept. The Google Fonts CSS API answers with a
   @font-face per unicode-range subset; this takes the block marked
   `/* latin *\/` and writes that one file. A full 400..900 range comes
   back as one variable file for Cinzel; the others are static, so each
   weight 20-shell.css declares is fetched on its own.
══════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'fonts');

/* [file, family query] — the file names are the ones 20-shell.css asks for */
const WANT = [
  ['cinzel.woff2',              'Cinzel:wght@400..900'],
  ['crimson-text.woff2',        'Crimson+Text:ital,wght@0,400'],
  ['crimson-text-italic.woff2', 'Crimson+Text:ital,wght@1,400'],
  ['crimson-text-bold.woff2',   'Crimson+Text:ital,wght@0,600'],
  ['unifraktur-maguntia.woff2', 'UnifrakturMaguntia'],
  ['barlow-condensed.woff2',    'Barlow+Condensed:wght@500'],
  ['barlow-condensed-bold.woff2','Barlow+Condensed:wght@700']
];

/* Without a modern user agent the API serves TTF, not woff2. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function one([file, query]) {
  const css = await (await fetch(
    'https://fonts.googleapis.com/css2?family=' + query + '&display=swap',
    { headers: { 'User-Agent': UA } })).text();
  const latin = css.split('/* latin */')[1];
  const url = latin && (latin.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
  if (!url) throw new Error('no latin woff2 in the answer for ' + query);
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(path.join(OUT, file), bytes);
  return `${file.padEnd(28)} ${(bytes.length / 1024).toFixed(1).padStart(6)} KB`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let bad = 0;
  for (const w of WANT) {
    try { console.log('  ' + await one(w)); }
    catch (e) { bad++; console.log('  !! ' + w[0] + ' — ' + e.message); }
  }
  console.log(bad ? `  ${bad} failed; the app falls back to Windows faces for those`
                  : '  done. node build.js copies them beside the page.');
  process.exit(bad ? 1 : 0);
})();
