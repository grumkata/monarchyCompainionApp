# Monarchy — project structure

A TTRPG companion: a **hall** where the roster and the character sheets live,
and a **table** you raise and walk into. Both halves are one document —
moving between them is a class on `<body>`, not a navigation.

> **Full reference:** `PROJECT.md` has the feature list, the game content,
> known issues, and the rules for working on this project. This file is just
> the day-to-day mechanics.

## Building

```
npm install          # once
npm start            # build, then open it in Electron
npm run dist         # build, then package release/Monarchy <version>.exe
npm test             # build, then the whole suite
```

`node build.js` stitches every CSS and JS file into `dist/monarchy.html` and
copies the textures next to it. **`src/` is where all editing happens** —
`dist/` is a build artifact, regenerate it, never edit it.

## How it's organized

```
src/
  menu-body.html          ← the hall's markup
  table-body.html         ← the table's markup
  css/
    20-shell.css          ← unscoped: reaches across both halves
    00-hall.css           ← scoped to body.at-hall at build time
    01-sheet.css          ← the record — needed in the hall AND at the table
    12-combat.css         ← scoped to body.at-table
    13-table-ui.css       ← scoped to body.at-table
  js/
    00-three.js           ← vendor (three.js r128)
    00-geo-runtime.js     ← reads the packed vertex blobs; must precede every pack
    01,02,17-20,33,35,36,52,53-*assets.js
                          ← baked model packs, written by tools/bake*.py
    10-16-*.js            ← the hall: sheet data, heraldry, hall 3D, codex, menu
    30-34,37-39-*.js      ← the fight: rules, content, combat app, field, dice
    21-28,40-51,54-*.js   ← the table: model, viewport, props, toolbox,
                            tokens, papers, library, the room editor
    29-role.js            ← which side of the table you are
    42-shell.js           ← which half you are looking at
  assets/tex/             ← the textures, as real files (see below)

tools/
  build inputs:  scope-css.js, pack-geometry.js   ← used by build.js
  asset baking:  bake*.py                          ← re-bake a model pack
  bake-textures.py                                 ← pull textures out to files
  shot.js                                          ← photograph the built app

test/
  serve.js            ← serves dist/ over http for the browser tests
  geometry.test.js    ← the packed vertices still say what the bake said
  table.test.js       ← the table model, in node
  table-ui.test.js    ← the chest, the bar, and what is in your hand
  join.test.js        ← a character joining a table
  handling.test.js    ← picking things up and putting them down
```

**Load order is load-bearing** and is written down in `build.js` rather than
globbed, so adding a file is a decision rather than an accident. Function
declarations hoist, so most order problems do not bite — but the asset packs
must follow `00-geo-runtime.js`, and `16-menu.js` is last because it boots
the hall.

## The assets are not in the JavaScript

Since 2026-09-14 the textures are real image files in `src/assets/tex/`,
copied to `dist/assets/tex/` at build time, and the vertices are binary blobs
rather than decimal number literals. That took the page from 15.28 MB to
4.24 MB plus 2.25 MB of images.

Two consequences worth knowing:

- **Re-baked a model pack?** Run `python tools/bake-textures.py` afterwards.
  The bake scripts write textures back in as data URIs; that tool pulls them
  out again. Forgetting is not fatal — `build.js` reports every picture it
  could not find and leaves it inline — but the build gets fat again. The
  vertex packing needs no such step; `build.js` does it on every build.
- **`dist/monarchy.html` is no longer standalone**, and double-clicking it
  into a browser does not work even from inside `dist/` — three.js requests
  textures with `crossOrigin="anonymous"`, which over `file://` is a CORS
  request against a response with no CORS headers, so every model comes up
  blank grey with nothing in the console. Electron does not enforce this, so
  the app and the `.exe` are fine. To look at the built page in a browser,
  serve it:

  ```
  node -e "require('./test/serve.js').serve().then(s=>console.log(s.url+'/monarchy.html'))"
  ```
