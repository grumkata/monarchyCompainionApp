# Monarchy — project structure

Your 7,394-line single file, split into workable pieces. This was a **pure
mechanical split** — every line of code was moved, not rewritten, so it
behaves identically to your original file. (Verified: all 200 function
definitions, every top-level variable, every element ID, and every brace/
paren pair were checked to match exactly between the original and the
rebuilt output.)

## How it's organized

```
src/
  index.html              ← page skeleton + all markup (edit this for HTML)
  css/
    01-base.css           ← core theme, colors, layout
    02-components.css     ← sheet UI components
    03-patches.css        ← later fixes + GM tool modals
    04-overrides.css      ← MUST STAY LAST of the original 4 — wins over everything above
    05-shell.css          ← title screen, table scene, window chrome, dock
  js/
    00-storage.js         ← tiny localStorage-safe wrapper, loads first
    01-fx-polish.js       ← canvas particle fx, header ornaments, QoL fixes
    02-data-prebuilt.js   ← PREBUILT_DATA (your backgrounds/items table)
    03-sheet-basics.js    ← armour equip, derived stats, attribute nav, tabs
    04-data-skills.js     ← SKILL_DATA (your skills table)
    05-skills-backgrounds.js ← skill picker, skill trees, knacks, backgrounds
    06-equipment-lanes.js ← weapons, armour UI, ability slots, exhaustion
    07-combat-tracker.js  ← ⚔ THE BATTLEFIELD/COMBAT SYSTEM — your overhaul target
    08-saves-io.js        ← quick save, save/load, export/import, autosave
    09-session-sync.js    ← GM/player live sync networking
    10-gm-tools.js        ← server management, saved NPCs, saved encounters
    11-combat-extras.js   ← fog of war, global mana, chip-player linking
    12-app-utils.js       ← dark mode, undo system
    13-turn-and-init.js   ← turn counter + page init, MUST STAY LAST of the original 14
    14-window-manager.js  ← generic drag/resize/dock window system
    15-app-shell.js       ← title screen logic, MUST STAY LAST

build.js                  ← run this to produce dist/monarchy.html (intermediate, see below)
dist/monarchy.html        ← intermediate build artifact — fine for a quick browser test, not the distributable
package.json               ← Electron + electron-builder config
electron/main.js           ← Electron main process (loads dist/monarchy.html, no browser chrome)
release/                   ← OUTPUT of `npm run dist` — the actual .exe you hand to players
```

> **Full reference:** see `PROJECT.md` for the complete feature list, game
> content summary, known issues, and every rule to follow when working on
> this project. This README just covers the day-to-day mechanics.

## Why it's split this way

The CSS files are numbered because **order matters for CSS** — later rules
win when they conflict, and `04-overrides.css` was explicitly written to load
last and override everything else. Don't reorder the `<link>` tags in
`index.html`.

The JS files are numbered for the same reason: this is all still plain
(non-module) JavaScript sharing one global scope, exactly like your original
single file. Later files use functions/variables declared in earlier ones,
so load order must stay as listed in `index.html`. Function declarations are
fairly forgiving about order, but a few top-level `const`/`let` values are
relied on by later files, so just don't reshuffle the `<script>` tags.

## Editing day-to-day

Just open `src/index.html` directly in a browser (double-click it, no server
needed — relative `<link>`/`<script src>` paths work fine over `file://`).
Edit whichever `.css`/`.js` file actually contains the thing you're fixing,
refresh the browser, done. This is the entire win: you can now search
`07-combat-tracker.js` (634 lines) instead of the old 7,394-line file to find
anything combat-related.

## Producing the file you hand to players

```
npm install     (one-time)
npm run dist
```

This runs `node build.js` (inlines everything into `dist/monarchy.html`,
same as before) and then packages that into a real native `.exe` at
`release/Monarchy <version>.exe` — no browser, no webpage tell, works by
double-clicking. The **portable** target needs no installer and no admin
rights; a traditional installer (`nsis` target) is also configured but
needs Wine if you're building it from Linux/macOS (native Windows builds
need neither).

Requires Node.js installed once. `npm install` pulls down Electron itself
(~100MB+), so it needs internet access the first time; after that,
`npm run dist` works offline.

If you just want to quickly check a change in a browser without producing
a full exe, `node build.js` alone still works and `dist/monarchy.html` is
a perfectly normal file to open directly.

## Next steps

1. ~~Title screen + table scene~~ — done, then substantially reworked
   after first look (table starts empty, tabs removed, global theme,
   scale-to-fit windows) — see `PROJECT.md` section 3.10.
2. ~~Electron distribution~~ — done, verified end-to-end (built and
   launched the actual packaged app) — see `PROJECT.md` section 3.11.
3. **Overhaul combat**: `07-combat-tracker.js` is isolated — safe to
   rewrite without touching anything else. Once rewritten, it can become
   its own window on the table instead of a page inside the sheet.
4. **Dice & chat**: `#table-right-panel` is reserved and empty, ready for
   these whenever you want them.
