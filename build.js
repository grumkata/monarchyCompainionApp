#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   build.js — stitches the split source into ONE page.

   monarchy.html opens in the hall. Raising a table and walking into
   it is a state change, not a navigation: both halves live in the
   same document and a class on <body> says which you are looking at.

   That is only safe because the two stylesheets are CONFINED at
   build time. The hall and the table were written as separate
   documents and share 27 class names — .plate, .shield, .face,
   .cap, .row, .on, .warn and the rest — so each sheet is scoped to
   its own body class by tools/scope-css.js. Without that they would
   quietly restyle each other; .plate has broken this project once
   already.

     node build.js
══════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const { scope } = require('./tools/scope-css.js');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

/* Load order is load-bearing, so it is written down rather than globbed:
   adding a file is a decision, not an accident. */
const CSS = [
  ['src/css/20-shell.css',   null],            // unscoped: reaches across both
  ['src/css/00-hall.css',    'body.at-hall'],
  /* the record is needed in both places: the hall keeps the roster and the
     table opens the same record as a paper on your own end */
  ['src/css/01-sheet.css',   ['body.at-hall', '#tp']],
  ['src/css/12-combat.css',  'body.at-table'],
  ['src/css/13-table-ui.css','body.at-table']
];

const JS = [
  'src/js/29-role.js',           // which side of the table you are
  'src/js/00-three.js',          // vendor
  'src/js/01-castle-assets.js',  // Castle Pack, baked by tools/bake_castle.py
  'src/js/02-charge-assets.js',  // heraldic charges (game-icons.net, CC BY 3.0)
  'src/js/20-chest-asset.js',    // AnimatedChest, baked by tools/bake_chest.py
  'src/js/19-bin-asset.js',      // KayKit container, baked by tools/bake_gltf.py
  'src/js/17-wood-assets.js',    // WoodStuff (CC0, loafbrr) — the table, and the furniture
  'src/js/18-bits-assets.js',    // KayKit BoardGameBits — the pieces that stand on it
  'src/js/33-dice-assets.js',
  'src/js/35-kit-assets.js',     // Nature MegaKit, baked
  'src/js/36-sprite-assets.js',

  'src/js/10-sheet-data.js',     // ── the hall ──
  'src/js/11-prebuilt-data.js',
  'src/js/12-heraldry.js',
  'src/js/13-hall3d.js',
  'src/js/14-codex.js',
  'src/js/15-sheet.js',

  'src/js/30-rules.js',          // ── the fight ──
  'src/js/31-content.js',
  'src/js/32-combat-app.js',     // needs #field in the page: it renders on load
  'src/js/34-gl-pieces.js',      // the moulded counters
  'src/js/37-scene-field.js',    // the immersive field you drop into
  'src/js/38-bar-hud.js',
  'src/js/39-dice.js',

  'src/js/21-table-content.js',  // ── the table ──
  'src/js/22-table-model.js',
  'src/js/23-table3d.js',        // viewport: pan, zoom, prop drag, lock-in
  'src/js/24-table-props.js',
  'src/js/48-library.js',        // what there is to put on the table
  'src/js/49-pictures.js',       // getting a picture in, and its real shape
  'src/js/46-figures.js',        // what a thing looks like before it is a thing
  'src/js/47-hand.js',           // the bar, and what is in your hand
  'src/js/25-toolbox.js',
  'src/js/26-scene-setup.js',
  'src/js/27-table-gl.js',
  'src/js/44-characters.js',      // the hall's roster, reachable from the table
  'src/js/43-tokens.js',          // a token has one home
  'src/js/45-papers.js',          // a record opened at the table
  'src/js/50-token-maker.js',     // what a counter is: person, NPC or formation
  'src/js/51-preview.js',        // a preview is the thing, made small
  'src/js/41-lines-edit.js',
  'src/js/40-combat-scene.js',   // model <-> battlefield
  'src/js/28-table-boot.js',

  'src/js/42-shell.js',          // ── which half you are looking at ──
  'src/js/16-menu.js'            // last: it boots the hall
];

const head = CSS.map(([f, sel]) => {
  const css = R(f);
  return `<style>\n/* ${path.basename(f)}${sel ? '  — scoped to ' + sel : '  — unscoped'} */\n` +
         (sel ? scope(css, sel) : css) + `\n</style>`;
}).join('\n');

const body =
  `<div id="hall-app">\n${R('src/menu-body.html')}\n</div>\n` +
  `<div id="table-app">\n${R('src/table-body.html')}\n</div>`;

const tail = JS.map(f =>
  `<script>\n/* ${path.basename(f)} */\n${R(f)}\n</script>`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monarchy</title>
${head}
</head>
<body class="at-hall">
${body}
${tail}
</body>
</html>
`;

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/monarchy.html'), html);
console.log(`dist/monarchy.html  ${(html.length / 1024 / 1024).toFixed(2)} MB  ` +
            `(${CSS.length} css, ${JS.length} js)`);
