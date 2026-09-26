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
const crypto = require('crypto');
const { scope } = require('./tools/scope-css.js');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

/* ══ THE PICTURES COME OUT ══════════════════════════════════════
   Every pack bakes its textures into the JavaScript as
   `data:image/jpeg;base64,...`. That was right while this was one file you
   could mail to somebody; it stopped being right at the tavern, which
   carries twenty-seven 1024x1024 JPEGs — four megabytes of picture inside a
   seven megabyte script.

   A data URI is the worst container an image can have. base64 costs a third
   on top of the bytes; the bytes go through the JAVASCRIPT parser on the
   main thread before the browser knows they are a picture; and nothing can
   start decoding until the whole script has been read. The same picture as a
   .jpg next to the page is fetched off-thread, decoded off-thread, and never
   touches the JS parser at all.

   So tools/bake-textures.py writes them to src/assets/tex/ as real files,
   halved to 512 on the longest edge, and leaves a manifest keyed by the hash
   of the URI it replaced. This swaps them in as it stitches.

   THE PACK FILES ARE NEVER EDITED. They stay exactly as their bake script
   wrote them, so re-baking a pack is still safe — you just re-run
   bake-textures.py afterwards to pick up the new pictures. Anything not in
   the manifest is left inline and reported, so a forgotten re-run is a
   slightly fatter build and a line of output, never a missing texture. */
/* ══ AND THE VERTICES GO BINARY ════════════════════════════════
   The other five megabytes. A baked pack writes its vertices as decimal
   text — `"p":[0.4399,1.2643,-0.4406,...]` — and every one of those numbers
   is read by the JavaScript parser to make a double that is immediately
   truncated into a Float32Array. tools/pack-geometry.js replaces each
   geometry literal with one base64 blob and a JSON skeleton of descriptors;
   src/js/00-geo-runtime.js reads them back as typed array views.

   The map is `global name per pack file`, and only the geometry ones are
   listed: 36-sprite-assets is pictures end to end, and 02-charge-assets is
   SVG path strings, so neither has a vertex to pack.

   A pack that fails to pack is REPORTED AND LEFT ALONE. A wrong vertex is
   far worse than a fat one, so pack-geometry checks every array it writes
   against the numbers it replaced and refuses rather than guesses. */
const GEO_PACKS = {
  '01-castle-assets.js': 'CASTLE',
  '20-chest-asset.js':   'CHEST',
  '19-bin-asset.js':     'BIN3D',
  '17-wood-assets.js':   'WOOD',
  '18-bits-assets.js':   'BITS',
  '33-dice-assets.js':   'DICE_ASSETS',
  '35-kit-assets.js':    'KIT',
  '52-room-assets.js':   'ROOM',
  '53-tavern-assets.js': 'TAVERN',
  '70-terra-assets.js':  'TERRA',
  '71-dungeon-assets.js':'DUNGEON'
};
const { pack } = require('./tools/pack-geometry.js');
let geoWas = 0, geoNow = 0, geoArrays = 0;
const geoNotes = [];
function repack(src, file) {
  const name = GEO_PACKS[path.basename(file)];
  if (!name) return src;
  let r;
  try { r = pack(src, name); }
  catch (e) { geoNotes.push(`${path.basename(file)}: ${e.message}`); return src; }
  if (!r) return src;
  if (r.error) { geoNotes.push(`${path.basename(file)}: ${r.error}`); return src; }
  geoWas += r.stats.wasText; geoNow += r.stats.nowText; geoArrays += r.stats.arrays;
  return r.js;
}

const TEX_DIR  = path.join(__dirname, 'src/assets/tex');
const TEX_MAP  = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(TEX_DIR, 'manifest.json'), 'utf8')); }
  catch (e) { return null; }
})();
const DATA_URI = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g;

/* A picture small enough to be cheaper inline than as a round trip stays
   inline, and is not worth a warning. 32-combat-app.js's 1x1 transparent GIF
   — the one that suppresses the browser's drag ghost — is 62 bytes, and
   making the browser go and fetch it would make dragging worse, not better. */
const INLINE_OK = 2048;

let texHit = 0, texMiss = 0, texWas = 0, texNow = 0;
function unpicture(src) {
  if (!TEX_MAP) return src;
  return src.replace(DATA_URI, uri => {
    const to = TEX_MAP[crypto.createHash('sha1').update(uri).digest('hex')];
    if (!to) { if (uri.length > INLINE_OK) texMiss++; return uri; }
    texHit++; texWas += uri.length; texNow += to.length;
    return to;
  });
}

/* Load order is load-bearing, so it is written down rather than globbed:
   adding a file is a decision, not an accident. */
const CSS = [
  ['src/css/20-shell.css',   null],            // unscoped: reaches across both
  ['src/css/00-hall.css',    'body.at-hall'],
  /* the record is needed in both places: the hall keeps the roster and the
     table opens the same record as a paper on your own end */
  /* `.tp` and not `#tp`: a record is TWO elements now — the sheet lying on
     the wood and the reading that rises off it (45-papers.js) — and both
     wear the record's own stylesheet */
  ['src/css/01-sheet.css',   ['body.at-hall', '.tp']],
  ['src/css/12-combat.css',  'body.at-table'],
  ['src/css/13-table-ui.css','body.at-table'],
  /* the toolbox dock, the workbench, the counters, the tracker and the war
     room (2026-09-25) — last, so it wins over what it replaced */
  ['src/css/14-war.css',     'body.at-table']
];

const JS = [
  'src/js/29-role.js',           // which side of the table you are
  'src/js/07-options.js',        // what you have asked the app to be; read by 09 below
  /* ── the multiplayer layer ──
     The Firebase compat SDKs are inlined from node_modules the same way
     three.js is: this app is ONE file and always has been, and a CDN tag
     would mean a table that cannot be hosted on a venue's guest wifi
     until gstatic answers. 337KB against a 4.5MB page. */
  'node_modules/firebase/firebase-app-compat.js',
  'node_modules/firebase/firebase-auth-compat.js',
  'node_modules/firebase/firebase-database-compat.js',
  'src/js/04-ring.js',           // who sits where, and why everyone agrees
  'src/js/05-net.js',            // the wire: firebase, or this machine
  'src/js/06-session.js',        // hosting, joining, presence, chat
  'src/js/00-three.js',          // vendor
  'src/js/00-geo-runtime.js',    // reads the packed vertices; needs THREE, precedes every pack
  'src/js/09-blazon3d.js',       // Blazon in 3D: banded light, the house ramp, a gilt rim
  'src/js/01-castle-assets.js',  // Castle Pack, baked by tools/bake_castle.py
  'src/js/02-charge-assets.js',  // heraldic charges (game-icons.net, CC BY 3.0)
  /* 20-chest-asset.js, 19-bin-asset.js and 18-bits-assets.js are no longer
     built in: the chest and the bin were the toolbox, and the board-game bits
     were what a counter used to be (2026-09-25). The files are still in
     src/js and still bake; put a line back here to have one again. */
  'src/js/17-wood-assets.js',    // WoodStuff (CC0, loafbrr) — the table, and the furniture
  'src/js/33-dice-assets.js',
  'src/js/35-kit-assets.js',     // Nature MegaKit, baked
  'src/js/36-sprite-assets.js',
  'src/js/52-room-assets.js',    // Medieval Village MegaKit — the tavern shell
  'src/js/53-tavern-assets.js',  // soiTavern — what makes it a tavern
  'src/js/70-terra-assets.js',   // the rest of the Nature MegaKit — wastes, marsh, desert, snow
  'src/js/71-dungeon-assets.js', // KayKit Dungeon — the crypt, and what a fight happens among

  'src/js/10-sheet-data.js',     // ── the hall ──
  'src/js/11-prebuilt-data.js',
  'src/js/12-heraldry.js',
  'src/js/13-hall3d.js',
  'src/js/14-codex.js',
  'src/js/15-sheet.js',

  'src/js/65-token-look.js',     // what a counter looks like; read by the mat, the wood and the field
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
  'src/js/54-room-editor.js',  // place the tavern by hand
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

  'src/js/55-herald.js',         // Blazon's motion: the bend, the cry, the gilt
  'src/js/57-chat-net.js',       // the dock, when there are other people in it
  'src/js/58-sheets-net.js',     // the sheets somebody pulled onto the wood
  'src/js/59-table-menu.js',     // the table's one menu: Esc, or the mark
  'src/js/60-board-net.js',      // the same wood, for everyone at it
  'src/js/61-ink.js',            // drawing on the wood
  'src/js/62-pocket.js',         // your own notes, in your hand or on the table
  'src/js/63-point.js',          // pointing at the table
  'src/js/64-kit.js',            // the rail everyone has: sheets, notes, draw, point
  'src/js/66-workbench.js',      // everything a thing can be, chosen before it is put down
  'src/js/67-inspector.js',      // the one you have hold of: edit, duplicate, turn, remove
  'src/js/68-gm-rail.js',        // the GM's rail: toolbox, the fight, prepared fights
  'src/js/72-muster.js',         // the fight run from one place: the roll, the card, the ground
  'src/js/73-encounters.js',     // fights made before the evening, and the war room they are made in
  'src/js/42-shell.js',          // ── which half you are looking at ──
  'src/js/16-menu.js'            // last: it boots the hall
];

/* ══ THE FIREBASE PROJECT, IF THERE IS ONE ══════════════════════
   src/firebase.config.json, put on the page as window.__FIREBASE_CONFIG__
   before any script runs, which is where 05-net.js looks for it. Absent is
   not an error: the app falls back to sharing a table between windows on
   one machine, and says so on the Join screen.

   A WEB CONFIG IS NOT A SECRET AND CANNOT BE MADE ONE. This ships as an
   .exe; whatever it needs to reach the database is in the binary on every
   player's machine, and no amount of build-time cleverness changes that.
   Google publish these in their own documentation. What protects the data
   is the database RULES (MULTIPLAYER.md) — baking the config in is not the
   risk, leaving the rules open is.

   `_comment` is stripped so the page does not carry a paragraph of prose in
   a global, and so 05-net.js's `apiKey` check is the only thing that
   decides whether a config counts. */
let fbTag = '';
try {
  const raw = JSON.parse(R('src/firebase.config.json'));
  delete raw._comment;
  if (raw.apiKey && raw.databaseURL)
    fbTag = '<script>window.__FIREBASE_CONFIG__=' + JSON.stringify(raw) + ';</script>';
  else
    console.log('  .. src/firebase.config.json has no apiKey/databaseURL — local tables only');
} catch (e) {
  console.log('  .. no src/firebase.config.json — tables are shared on this machine only');
}

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
/* THE MARKER SAYS BYTES, NOT FILES. It used to tick `i+1 of 52`, which made
   every script worth the same — and they are not remotely: the tavern pack
   is a thousand times the size of 29-role.js. So the bar ran in even little
   steps and then sat perfectly still for two seconds on one of the big ones,
   which is the exact shape of a hang. Weighting each tick by the bytes
   actually parsed makes the bar's speed match the pause, so a slow stretch
   LOOKS slow instead of looking broken. */
const bodies = JS.map(f => repack(unpicture(R(f)), f));
const jsBytes = bodies.reduce((a, b) => a + b.length, 0);
let jsSeen = 0;
const tail = bodies.map((src, i) => {
  jsSeen += src.length;
  return `<script>\n/* ${path.basename(JS[i])} */\n${src}\n</script>\n` +
         `<script>window.__boot&&__boot(${jsSeen},${jsBytes})</script>`;
}).join('\n');

/* ══ THE LOADING SCREEN IS A ROLL OF ARMS ═════════════════════
   grumkata: make the loading screens "more dynamic and interesting and most
   importantly coherent with the design elements and identity of the game".

   It was a crossed-swords glyph, the name and a bar: correct, and nothing
   that could only be Monarchy. What only Monarchy has is its heraldry, so
   the wait is a HERALD READING THE ROLL — a shield that turns through coats
   of arms, each with its blazon written under it the way the flag maker
   writes yours; a sun IN SPLENDOUR turning behind it (the same sun the Bend
   and the Cry use); the counterchange's gilt band passing along the bend;
   gold leaf drifting up through the dark. Your own coat is read first, once
   you have one (42-shell.js leaves it where this screen can find it).

   THE ARMS ARE DRAWN HERE, AT BUILD TIME, by the app's own heraldry. This
   screen is up precisely because no script has been read yet, so nothing
   can draw at run time — but 12-heraldry.js touches no DOM, so Node can run
   it and the coats arrive as finished SVG in the page itself.

   AND EVERY MOVING PART MOVES ON transform OR opacity, the only two things
   the compositor animates on its own thread (STYLE.md §6⅓). The page behind
   this is parsing twelve megabytes and the main thread is gone for seconds
   at a time; a turn, a spin or a drift driven by anything else would freeze
   for exactly as long as it exists to cover. test/smooth.test.js reads the
   keyframes below and fails if one ever animates anything else. */
const vm = require('vm');
function heraldryInNode() {
  const w = {}; w.window = w;
  const ctx = vm.createContext({ window: w });
  vm.runInContext(R('src/js/02-charge-assets.js'), ctx);
  vm.runInContext(R('src/js/12-heraldry.js'), ctx);
  return w.Heraldry;
}
/* every id in a baked coat is given a prefix, so eight coats and the
   player's own can share one page without two clip paths answering to the
   same name — a duplicate id resolves to whichever the document met first */
const reid = (svg, p) => svg.replace(/id="/g, 'id="' + p)
  .replace(/url\(#/g, 'url(#' + p).replace(/href="#/g, 'href="#' + p);
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* THE ROLL. Eight coats, every one of them keeping the rule of tincture, a
   spread of divisions, ordinaries and charges so the turning shield shows
   off what the flag maker can do. The first slot is the player's own when
   there is one. */
const ROLL = [
  { a: 'gules', chg: 'lion', chgT: 'or' },
  { a: 'azure', chg: 'fleur', chgT: 'or', chgN: 3 },
  { div: 'quarterly', a: 'or', b: 'gules', bord: 'plain', bordT: 'sable' },
  { a: 'vert', ord: 'chief', ordT: 'or', chg: 'stag', chgT: 'argent' },
  { a: 'purpure', chg: 'tower', chgT: 'argent', bord: 'compony', bordT: 'or' },
  { a: 'or', ord: 'bend', ordT: 'azure', chg: 'raven', chgT: 'sable' },
  { div: 'perChevron', a: 'argent', b: 'gules', chg: 'rose', chgT: 'or', chgN: 3 },
  { a: 'sable', ord: 'cross', ordT: 'or', chg: 'crown', chgT: 'gules' }
];
const HER = heraldryInNode();
const ROLL_HTML = ROLL.map((A, i) =>
  `<figure class="boot-arms${i === 0 ? ' me' : ''}" style="--i:${i}">` +
  reid(HER.armsSVG(A, { shape: 'shield', w: 176, h: 211 }), 'rl' + i + '-') +
  `<figcaption>${escH(HER.blazonText(A))}</figcaption></figure>`).join('');

/* A SUN IN SPLENDOUR, the heraldic way: twenty-two rays round a face, straight
   and wavy by turns (rayonny), never a starburst. Drawn in a unit circle and
   filled with a radial of the app's own Or tokens, so it is gilt whatever
   happens to the palette. Kept outside the loading screen as a <template>,
   because 55-herald.js stands the same sun behind the Bend's title long
   after this screen is gone. */
function sunSVG() {
  const n = 22, r0 = 0.15, pt = (r, a) => (r * Math.cos(a)).toFixed(4) + ' ' + (r * Math.sin(a)).toFixed(4);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, half = (Math.PI / n) * 0.46;
    if (i % 2 === 0) {
      d += 'M' + pt(r0, a - half) + 'L' + pt(1, a) + 'L' + pt(r0, a + half) + 'Z';
    } else {
      /* a flame: its spine waves, and it tapers to a point short of the rim */
      const L = [], Rt = [], steps = 22, tip = 0.84;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps, r = r0 + (tip - r0) * u;
        const wave = Math.sin(u * Math.PI * 3.2) * 0.07 * u;
        const w = half * 0.9 * (1 - u) + 0.004;
        L.push(pt(r, a + wave - w)); Rt.unshift(pt(r, a + wave + w));
      }
      d += 'M' + L.join('L') + 'L' + Rt.join('L') + 'Z';
    }
  }
  return '<svg viewBox="-1 -1 2 2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs><radialGradient id="msun-g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse">' +
    '<stop offset=".12" style="stop-color:var(--m-or-hi,#ecd27a);stop-opacity:.95"/>' +
    '<stop offset=".5" style="stop-color:var(--m-or,#c9a227);stop-opacity:.55"/>' +
    '<stop offset="1" style="stop-color:var(--m-or,#c9a227);stop-opacity:0"/></radialGradient></defs>' +
    '<path fill="url(#msun-g)" d="' + d + '"/></svg>';
}
const SUN = sunSVG();

/* gold leaf, rising — placed and timed from a fixed seed so every build
   draws the same drift */
const DUST = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let out = '';
  for (let i = 0; i < 18; i++) {
    const x = (4 + rnd() * 92).toFixed(1), s = (3 + rnd() * 5).toFixed(1);
    const dur = (7 + rnd() * 7).toFixed(2), t = (-rnd() * 14).toFixed(2);
    out += `<i style="--x:${x}%;--s:${s}px;--d:${dur}s;--t:${t}s"></i>`;
  }
  return out;
})();

const LOADING = `
<div id="boot">
  <div class="boot-bend"></div>
  <div class="boot-dust">${DUST}</div>
  <div class="boot-in">
    <div class="boot-roll">
      <div class="boot-sun">${SUN}</div>
      <div class="boot-sun far">${SUN}</div>
      ${ROLL_HTML}
    </div>
    <div class="boot-name">Monarchy</div>
    <div class="boot-bar"><i></i><u></u></div>
    <div class="boot-say">the heralds are summoned&hellip;</div>
  </div>
</div>
<template id="m-sun">${SUN}</template>
<style>
/* Blazon's first frame. The tokens are 20-shell.css's — that sheet is in
   <head>, so they already resolve here.

   ══ WHAT CAN MOVE WHILE THE PAGE IS BUSY ══════════════════════
   Only what the compositor can do by itself: transform and opacity, on
   their own layers. So everything that moves here — the turning shield, the
   sun, the bend, the gold leaf, the shimmer on the bar — is one of those two
   and carries on through a two-second parse freeze. The bar's own width
   cannot: it is laid out, so it advances in steps, one per script, weighted
   by bytes and eased over a long curve so that it looks deliberate. */
/* the same isolation as the Bend's cover, for the same reason: this is up
   because the page is busy, so it must not share a layer with the page */
#boot{contain:layout paint style;will-change:transform;
  position:fixed;inset:0;z-index:100000;display:flex;overflow:hidden;
  align-items:center;justify-content:center;
  background:radial-gradient(ellipse at 50% 40%,#2c1e10 0%,#150f09 44%,var(--m-sable-0,#0a0705) 80%);
  font-family:var(--m-f-hand,Georgia,serif);
  transition:opacity .5s ease}
/* the Bend's cloth, faintly: a lattice of lozenges (a diaper) over the dark */
#boot::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(45deg,rgba(201,162,39,.05) 0 1px,transparent 1px 40px),
             repeating-linear-gradient(-45deg,rgba(201,162,39,.05) 0 1px,transparent 1px 40px);
  -webkit-mask-image:radial-gradient(ellipse at 50% 42%,#000 12%,transparent 72%);
          mask-image:radial-gradient(ellipse at 50% 42%,#000 12%,transparent 72%)}
.boot-in{position:relative;display:flex;flex-direction:column;align-items:center;gap:18px;
  will-change:transform,opacity;
  transition:transform .62s cubic-bezier(.5,0,.85,.4),opacity .42s ease}
/* the screen lifts the way the Bend's cloth does rather than just fading:
   the same exit, so the first thing the app does and everything after it
   agree about how a cover comes off */
#boot.gone{opacity:0;pointer-events:none}
#boot.gone .boot-in{transform:translateY(-26px) scale(.97);opacity:0}

/* ── THE SUN, turning behind the shield: two of it, one large and slow, one
   larger, fainter and the other way, so the rays shimmer as they cross ── */
.boot-sun{position:absolute;left:50%;top:44%;width:620px;height:620px;transform:translate(-50%,-50%);
  pointer-events:none;opacity:.34;will-change:transform;animation:bootsun 80s linear infinite}
/* centred by translate, not margins: the hall's reset (body.at-hall *{margin:0})
   outranks a bare class and put the first sun off in a corner */
.boot-sun.far{width:1100px;height:1100px;opacity:.12;
  animation-duration:150s;animation-direction:reverse}
.boot-sun svg{display:block;width:100%;height:100%}
@keyframes bootsun{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}

/* ── THE ROLL. Eight coats on one spot, each turning in on its edge, held,
   and turning away as the next comes round — the whole roll every 14.4s,
   each coat's turn 1.8s later than the last (--i). ── */
.boot-roll{position:relative;width:176px;height:252px;perspective:900px}
.boot-arms{position:absolute;left:0;top:0;width:176px;margin:0;opacity:0;
  transform:rotateY(-78deg) scale(.94);backface-visibility:hidden;will-change:transform,opacity;
  animation:bootturn 14.4s cubic-bezier(.2,.7,.2,1) infinite both;
  animation-delay:calc(var(--i) * 1.8s)}
.boot-arms svg{display:block;width:176px;height:211px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.65))}
.boot-arms figcaption{width:420px;margin:12px 0 0 -122px;text-align:center;white-space:nowrap;
  font-style:italic;font-size:14px;letter-spacing:.02em;color:rgba(222,216,200,.72)}
.boot-arms figcaption b{font-family:var(--m-f-cap,serif);font-style:normal;font-size:10px;font-weight:700;
  letter-spacing:.2em;text-transform:uppercase;color:var(--m-or,#c9a227);margin-right:6px}
@keyframes bootturn{
  0%{opacity:0;transform:rotateY(-78deg) scale(.94)}
  2.5%{opacity:1;transform:rotateY(0) scale(1)}
  11%{opacity:1;transform:rotateY(0) scale(1)}
  13.5%{opacity:0;transform:rotateY(78deg) scale(.94)}
  100%{opacity:0;transform:rotateY(78deg) scale(.94)}}

/* ── THE COUNTERCHANGE, across the whole screen: the gilt band every hovered
   and chosen thing in the app wears, passing along the bend ── */
.boot-bend{position:absolute;top:-50%;left:0;width:26vw;height:200%;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(236,210,122,.05) 38%,rgba(236,210,122,.11) 50%,rgba(236,210,122,.05) 62%,transparent);
  transform:translateX(-40vw) rotate(25deg);will-change:transform;
  animation:bootbend 6s cubic-bezier(.45,0,.55,1) infinite}
@keyframes bootbend{0%{transform:translateX(-40vw) rotate(25deg)}
  60%,100%{transform:translateX(125vw) rotate(25deg)}}

/* ── GOLD LEAF: the Herald's burst, slowed to a drift ── */
.boot-dust{position:absolute;inset:0;pointer-events:none}
.boot-dust i{position:absolute;left:var(--x);bottom:-12px;width:var(--s);height:var(--s);
  background:var(--m-or-hi,#ecd27a);opacity:0;transform:translateY(0) rotate(45deg);
  will-change:transform,opacity;animation:bootdust var(--d) linear var(--t) infinite}
@keyframes bootdust{0%{opacity:0;transform:translateY(0) rotate(45deg)}
  12%{opacity:.75}75%{opacity:.4}
  100%{opacity:0;transform:translateY(-104vh) rotate(315deg)}}

/* ── the name, and the lozenge rule drawing out under it ── */
.boot-name{position:relative;font-family:var(--m-f-mark,serif);font-size:58px;line-height:1;
  color:var(--m-argent-hi,#e8dfc8);letter-spacing:.02em;
  text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 40px rgba(201,120,40,.35);
  will-change:transform,opacity;animation:bootname 1s cubic-bezier(.16,.84,.24,1) both}
.boot-name::after{content:'';display:block;width:240px;height:11px;margin:14px auto 0;
  background:
    linear-gradient(45deg,transparent 35%,var(--m-or,#c9a227) 35% 65%,transparent 65%) center/11px 11px no-repeat,
    linear-gradient(90deg,transparent,var(--m-or,#c9a227) 36%,transparent 46%,transparent 54%,var(--m-or,#c9a227) 64%,transparent) center/100% 1px no-repeat;
  animation:bootrule .9s cubic-bezier(.16,.84,.24,1) .35s both}
@keyframes bootname{from{opacity:0;transform:translateY(14px) scale(1.08)}}
@keyframes bootrule{from{opacity:0;transform:scaleX(0)}}

/* ── the bar: gilt on a track cut on the bend, and a shimmer that never stops ── */
.boot-bar{position:relative;width:236px;height:6px;background:rgba(201,162,39,.14);
  overflow:hidden;clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)}
.boot-bar i{display:block;height:100%;width:0;
  background:linear-gradient(90deg,var(--m-house,#a3232b),var(--m-or-lo,#8a6a20) 30%,var(--m-or-hi,#e0c169));
  /* a long, late-settling curve, so a big script's jump glides in instead of
     snapping — and so two ticks close together read as one movement */
  transition:width .7s cubic-bezier(.16,.84,.24,1)}
/* THE ONE THING THAT NEVER STOPS. A gilt sweep running the length of the
   track on transform alone, so the compositor keeps drawing it even while
   the main thread is parsing and the bar itself cannot move. */
.boot-bar u{position:absolute;inset:0;display:block;
  background:linear-gradient(90deg,transparent,rgba(255,236,190,.5),transparent);
  transform:translateX(-100%);will-change:transform;
  animation:bootsweep 1.5s linear infinite}
@keyframes bootsweep{to{transform:translateX(100%)}}
.boot-say{font-size:13px;font-style:italic;color:rgba(222,216,200,.5);letter-spacing:.04em}

@media (prefers-reduced-motion:reduce){
  .boot-sun,.boot-bend,.boot-dust i,.boot-bar u,.boot-name,.boot-name::after{animation:none}
  .boot-bend,.boot-dust,.boot-bar u{opacity:0}
  .boot-arms{animation:none;opacity:0;transform:none}
  .boot-arms.me{opacity:1}
}
</style>
<script>
(function(){
  /* YOUR ARMS FIRST. Nothing that can draw a coat has been read yet, so
     42-shell.js leaves the last one it drew here; the first slot of the roll
     is swapped for it, and the bar wears your livery. */
  try {
    var mine = JSON.parse(localStorage.getItem('monarchy.boot.v1') || 'null');
    var slot = document.querySelector('#boot .boot-arms.me');
    if (mine && mine.svg && slot) {
      var esc = function(s){ return String(s || '').replace(/[&<>"]/g, function(c){
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      slot.innerHTML = mine.svg + '<figcaption><b>' + esc(mine.name || 'Your arms') + '</b>' +
                       esc(mine.blazon) + '</figcaption>';
      if (mine.house) document.documentElement.style.setProperty('--m-house', mine.house);
    }
  } catch (e) {}
  /* The words change as the work does, because "Loading..." for eight
     seconds tells you nothing and reads as a hang. */
  var SAY = [[0,'the heralds are summoned\\u2026'],[.18,'the roll of arms is read\\u2026'],
             [.38,'the banners are hung\\u2026'],[.58,'the hearth is lit\\u2026'],
             [.78,'the table is laid\\u2026']];
  var bar, say, shown = 0;
  /* n and of are BYTES parsed, not files done (see the marker in build.js) */
  window.__boot = function(n, of){
    bar = bar || document.querySelector('#boot .boot-bar i');
    say = say || document.querySelector('#boot .boot-say');
    var u = of ? n / of : 0;
    /* never backwards, and never quite full until the page really is: the
       last few per cent belong to the styles resolving and the first paint,
       which happen after the final script and are not nothing */
    u = Math.max(shown, Math.min(u, 1) * 0.94);
    shown = u;
    if (bar) bar.style.width = (u * 100).toFixed(2) + '%';
    if (say) for (var i = SAY.length - 1; i >= 0; i--)
      if (u >= SAY[i][0]) { say.innerHTML = SAY[i][1]; break; }
  };
  /* Gone when the page is actually usable, not when the bar looks full:
     the last script still has to run, styles resolve and the first frame
     paint. Two animation frames after load is that moment. */
  function done(){
    var b = document.getElementById('boot');
    if (!b) return;
    var i = b.querySelector('.boot-bar i');
    if (i) i.style.width = '100%';
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      /* a beat on a full bar before it lifts — a bar that vanishes at 94%
         reads as having given up rather than finished */
      setTimeout(function(){
        b.classList.add('gone');
        setTimeout(function(){ b.remove(); }, 700);
      }, 180);
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
${fbTag}
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
/* LF, ALWAYS. The sources are checked out with CRLF on Windows (git's
   autocrlf), so the page came out with nineteen thousand of them — and git
   turns them back into LF when it commits, so the copy on GitHub was never
   byte-for-byte the copy that was built. An installed app downloads the page
   from GitHub and checks it against the hash in update.json (below), so a
   page that changes on the way in is a page that never installs. */
fs.writeFileSync(path.join(__dirname, 'dist/monarchy.html'), html.replace(/\r\n?/g, '\n'));

/* The pictures have to travel with the page. electron/main.js does
   loadFile(dist/monarchy.html), so `assets/tex/x.jpg` resolves next to it —
   and electron-builder ships the whole of dist, so they are in the .exe too.
   Copied rather than symlinked: a symlink does not survive packaging. */
let copied = 0, copiedBytes = 0;
if (TEX_MAP) {
  const to = path.join(__dirname, 'dist/assets/tex');
  fs.mkdirSync(to, { recursive: true });
  const want = new Set(Object.values(TEX_MAP).map(p => path.basename(p)));
  /* Stale pictures are deleted, not left to rot: a renamed or re-baked
     texture would otherwise sit in dist for ever and ride into the build. */
  for (const f of fs.readdirSync(to)) if (!want.has(f)) fs.unlinkSync(path.join(to, f));
  for (const f of want) {
    const src = path.join(TEX_DIR, f), dst = path.join(to, f);
    if (!fs.existsSync(src)) { console.log(`  !! missing ${f} — run tools/bake-textures.py`); continue; }
    const s = fs.statSync(src);
    /* mtime+size is enough to skip a copy here and keeps rebuilds instant */
    if (!fs.existsSync(dst) || fs.statSync(dst).size !== s.size) fs.copyFileSync(src, dst);
    copied++; copiedBytes += s.size;
  }
}

/* ── THE LETTERS TRAVEL THE SAME WAY ──────────────────────────
   20-shell.css asks for assets/fonts/*.woff2 after an installed copy and
   before a Windows fallback, so a missing file costs the real letterforms
   and nothing else. tools/fetch-fonts.js fills the folder. Copied, like the
   textures, because a symlink does not survive packaging. */
const FONT_DIR = path.join(__dirname, 'src/assets/fonts');
let fonts = 0;
{
  const to = path.join(__dirname, 'dist/assets/fonts');
  const have = fs.existsSync(FONT_DIR)
    ? fs.readdirSync(FONT_DIR).filter(f => /\.woff2$/i.test(f)) : [];
  if (have.length) fs.mkdirSync(to, { recursive: true });
  if (fs.existsSync(to))
    for (const f of fs.readdirSync(to)) if (!have.includes(f)) fs.unlinkSync(path.join(to, f));
  for (const f of have) { fs.copyFileSync(path.join(FONT_DIR, f), path.join(to, f)); fonts++; }
}

/* ══ WHAT AN INSTALLED COPY UPDATES ITSELF TO ═════════════════════
   grumkata: "i update github repo change the update number to say its an
   update and all monarchy versions will update without going through the
   install process every time".

   So the thing that updates is THIS FOLDER, not the program around it.
   Everything the app is lives in dist/ — the page and its pictures — and an
   installed copy (electron/content.js) reads this file off the repo, sees a
   higher version, and fetches whichever files' hashes it does not already
   have. `version` is package.json's, which is the number you change to say
   "this is an update". `shell` is the oldest program (electron/) this page
   can run in: raise it, and electron/content.js's SHELL_API with it, only
   when a change needs something new from the program itself — which is the
   one case that still needs a real release.

   No timestamp in here: the same build must produce the same file, or every
   commit would carry a new update.json for nothing. */
const NEEDS_SHELL = 1;
{
  const DIST = path.join(__dirname, 'dist');
  const files = {};
  const walk = rel => {
    for (const e of fs.readdirSync(path.join(DIST, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(r);
      else if (r !== 'update.json')
        files[r] = require('crypto').createHash('sha256')
          .update(fs.readFileSync(path.join(DIST, r))).digest('hex');
    }
  };
  walk('');
  const version = JSON.parse(R('package.json')).version;
  const sorted = {};
  Object.keys(files).sort().forEach(k => { sorted[k] = files[k]; });
  fs.writeFileSync(path.join(DIST, 'update.json'),
    JSON.stringify({ version, shell: NEEDS_SHELL, files: sorted }, null, 1) + '\n');
  console.log(`dist/update.json    version ${version}, ${Object.keys(sorted).length} files`);
}

console.log(`dist/monarchy.html  ${(html.length / 1024 / 1024).toFixed(2)} MB  ` +
            `(${CSS.length} css, ${JS.length} js)`);
if (geoArrays) {
  console.log(`  vertices            ${geoArrays} arrays, ` +
              `${(geoWas / 1048576).toFixed(2)} MB of number literals -> ` +
              `${(geoNow / 1048576).toFixed(2)} MB binary`);
}
for (const n of geoNotes) console.log(`  !! geometry left as text — ${n}`);
if (TEX_MAP) {
  console.log(`dist/assets/tex     ${(copiedBytes / 1024 / 1024).toFixed(2)} MB  ` +
              `(${copied} pictures, ${(texWas / 1048576).toFixed(2)} MB of base64 lifted out)`);
  if (texMiss) console.log(`  !! ${texMiss} picture(s) not in the manifest, left inline — ` +
                           `run: python tools/bake-textures.py`);
} else {
  console.log('  !! no src/assets/tex/manifest.json — every picture is inline. ' +
              'Run: python tools/bake-textures.py');
}
console.log(fonts
  ? `dist/assets/fonts   ${fonts} font file(s)`
  : '  .. no fonts in src/assets/fonts — the type falls back to Windows faces. ' +
    'Run: node tools/fetch-fonts.js');
