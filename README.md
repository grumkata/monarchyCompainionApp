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

build.js                  ← run this to produce the single distributable file
dist/monarchy.html        ← the single-file output (what you hand to players)
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
node build.js
```

This reads `src/index.html` and inlines every CSS/JS file back into one
`dist/monarchy.html` — same single-file format as before, just generated
instead of hand-maintained. Run it any time before sharing a new version.

Requires Node.js (nodejs.org) installed once. No npm packages, no
internet access needed to build — `build.js` only uses Node's built-in
file system module.

## Next steps

1. ~~Title screen + table scene~~ — done. The sheet now opens as a
   draggable/resizable window on a table; see `PROJECT.md` section 3.10.
2. **Overhaul combat**: `07-combat-tracker.js` is isolated — safe to
   rewrite without touching anything else. Once rewritten, it can become
   its own window on the table instead of a tab inside the sheet.
3. **Desktop app (.exe)**: wrapping `dist/monarchy.html` in Electron gets
   you a double-click desktop app, no browser chrome visible. Separate
   phase, ask whenever you're ready.
