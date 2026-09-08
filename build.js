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
  'src/js/52-room-assets.js',    // Medieval Village MegaKit — the tavern shell
  'src/js/53-tavern-assets.js',  // soiTavern — what makes it a tavern

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

/* ── THE LOADING SCREEN, AND WHY IT CAN TELL THE TRUTH ────────
   Every model, texture and line of code in this app is inlined into one
   document — that is the whole point of it, and it is also why opening it
   went from instant to a long white pause once the tavern arrived: the
   browser is parsing about twelve megabytes of script before it has
   anything to show.

   A spinner would be a lie invented to fill that pause. This is not one.
   The scripts are stitched in one at a time and a one-line marker between
   each of them ticks a counter, so the bar is a genuine report of how far
   through the parse the browser actually is — it moves in the same jerky
   way the work does, pausing on the big asset files, because that is what
   is happening. */
const tail = JS.map((f, i) =>
  `<script>\n/* ${path.basename(f)} */\n${R(f)}\n</script>\n` +
  `<script>window.__boot&&__boot(${i + 1},${JS.length})</script>`).join('\n');

const LOADING = `
<div id="boot">
  <div class="boot-mark">&#9876;</div>
  <div class="boot-name">Monarchy</div>
  <div class="boot-bar"><i></i></div>
  <div class="boot-say">setting the table&hellip;</div>
</div>
<style>
#boot{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:18px;
  background:radial-gradient(ellipse at 50% 38%,#241a10 0%,#0a0705 76%);
  transition:opacity .55s ease;font-family:Georgia,'Times New Roman',serif}
#boot.gone{opacity:0;pointer-events:none}
.boot-mark{font-size:40px;color:#c9a227;opacity:.72;
  text-shadow:0 0 26px rgba(201,162,39,.35);animation:bootpulse 2.6s ease-in-out infinite}
.boot-name{font-family:'UnifrakturMaguntia',Georgia,serif;font-size:52px;
  color:#e8dfc8;letter-spacing:.02em;text-shadow:0 0 40px rgba(201,120,40,.35)}
.boot-bar{width:236px;height:2px;background:rgba(232,223,200,.14);overflow:hidden}
.boot-bar i{display:block;height:100%;width:0;
  background:linear-gradient(90deg,#8a6a20,#e0c169);transition:width .25s ease}
.boot-say{font-size:12px;font-style:italic;color:rgba(232,223,200,.42);
  letter-spacing:.04em}
@keyframes bootpulse{0%,100%{opacity:.5}50%{opacity:.95}}
@media (prefers-reduced-motion:reduce){.boot-mark{animation:none}}
</style>
<script>
(function(){
  /* The words change as the work does, because "Loading..." for eight
     seconds tells you nothing and reads as a hang. */
  var SAY = [[0,'setting the table\\u2026'],[.34,'lighting the hearth\\u2026'],
             [.62,'pouring the drink\\u2026'],[.85,'laying out the pieces\\u2026']];
  var bar, say, seen = 0;
  window.__boot = function(n, of){
    bar = bar || document.querySelector('#boot .boot-bar i');
    say = say || document.querySelector('#boot .boot-say');
    var u = n / of; seen = u;
    if (bar) bar.style.width = (u * 100).toFixed(1) + '%';
    if (say) for (var i = SAY.length - 1; i >= 0; i--)
      if (u >= SAY[i][0]) { say.innerHTML = SAY[i][1]; break; }
  };
  /* Gone when the page is actually usable, not when the bar looks full:
     the last script still has to run, styles resolve and the first frame
     paint. Two animation frames after load is that moment. */
  function done(){
    var b = document.getElementById('boot');
    if (!b) return;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      b.classList.add('gone');
      setTimeout(function(){ b.remove(); }, 700);
    }); });
  }
  if (document.readyState === 'complete') done();
  else window.addEventListener('load', done);
  /* and never, ever a permanent cover if something above throws */
  setTimeout(done, 25000);
})();
</script>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monarchy</title>
${head}
</head>
<body class="at-hall">
${LOADING}
${body}
${tail}
</body>
</html>
`;

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/monarchy.html'), html);
console.log(`dist/monarchy.html  ${(html.length / 1024 / 1024).toFixed(2)} MB  ` +
            `(${CSS.length} css, ${JS.length} js)`);
