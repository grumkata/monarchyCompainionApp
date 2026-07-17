# MONARCHY — Project Reference

**Status:** Active development
**Last updated:** 2026-07-13

> **Purpose of this document:** this is the single place to check before
> working on the project — what exists, how it's built, and what rules to
> follow. Read this instead of re-reading the whole codebase. **Update it
> every time you make a meaningful change** (new feature, structural change,
> renamed system, bug fixed, known issue found). See "Maintenance rules" at
> the bottom for exactly what to update and when.

---

## 1. What this project is

Monarchy is a browser-based character sheet + combat tracker companion app
for a custom TTRPG. One person plays GM and can host a live session; players
can join from their own device and see a synced battlefield and push their
own HP/vitals back to the GM in real time. It also works completely
standalone for a single person building/viewing a character sheet with no
network involved.

The app opens to a **title screen**, which leads into a **table scene** — a
shared surface where windows (the character sheet today; combat, a rulebook,
and other group-facing tools in the future) can be opened, dragged, resized,
and dismissed. The character sheet is no longer "the app" — it's the first
tenant of the table. See 3.10 for how this works.

It ships as a **native Windows `.exe`** (via Electron — see 3.11) — no
browser, no install required for the portable build, works for
tech-illiterate players: they double-click it and it opens.

---

## 2. Architecture

### 2.1 The two-layer structure

As of the baseline split (2026-07-11), the project is no longer one 7,394-line
file. It's now:

```
src/                       ← EDIT THIS. Multi-file source, never distributed as-is.
  index.html               ← page skeleton + all HTML markup
  css/
    01-base.css             core theme, colors, layout
    02-components.css       sheet UI components
    03-patches.css          later fixes + GM tool modals
    04-overrides.css        MUST STAY LAST of the original 4 — cascade-wins over everything above
    05-shell.css            title screen, table scene, window chrome, dock — see 3.10
  js/
    00-storage.js            localStorage-safe wrapper — must load first
    01-fx-polish.js          canvas particle fx, header ornaments, QoL fixes
    02-data-prebuilt.js      PREBUILT_DATA — backgrounds/prebuilt items table
    03-sheet-basics.js       armour equip, derived stats, attribute nav, tabs
    04-data-skills.js        SKILL_DATA — the 3 skill trees
    05-skills-backgrounds.js skill picker, skill trees, knacks, backgrounds
    06-equipment-lanes.js    weapons, armour UI, ability slots, exhaustion
    07-combat-tracker.js     ⚔ battlefield/chips/lanes — see 3.6
    08-saves-io.js           quick save, save/load, export/import, autosave
    09-session-sync.js       GM/player live sync networking
    10-gm-tools.js           server management, saved NPCs, saved encounters
    11-combat-extras.js      fog of war, global mana, chip-player linking
    12-app-utils.js          dark mode, undo system
    13-turn-and-init.js      turn counter + page init — MUST STAY LAST of the original 14
    14-window-manager.js     generic drag/resize/dock window system — see 3.10
    15-app-shell.js          title screen logic + wiring into session-sync — MUST STAY LAST

build.js                  ← run `node build.js` to produce dist/monarchy.html (intermediate step, see 2.3)
dist/monarchy.html        ← intermediate build artifact — valid standalone file, but not the distributable anymore
package.json               ← Electron + electron-builder config; `npm run dist` is the real distributable step
electron/
  main.js                  ← Electron main process: loads dist/monarchy.html in a plain native window, no menu bar
release/                   ← OUTPUT of `npm run dist` — the actual .exe lands here (gitignore this)
```

**Golden rule:** `src/` is where all editing happens. `dist/monarchy.html`
is a build artifact — regenerate it with `node build.js`, never edit it
directly (edits will be silently lost on the next build).

### 2.2 Why the split is ordered the way it is

- It's a **pure mechanical split** of the original monolith — code was
  moved, not rewritten. All of it is still plain (non-module) JS/CSS sharing
  one global scope, exactly like the original file.
- **CSS load order matters**: later files win on conflicting rules.
  `04-overrides.css` is explicitly written to load last and override
  everything above it. Don't reorder the `<link>` tags.
- **JS load order matters**: later files call functions and read variables
  declared in earlier files. Don't reorder the `<script src>` tags. If you
  add a new file, insert it where it logically depends on what's above and
  is depended on by what's below it — or when in doubt, append near the end
  and test.
- Dev version (`src/index.html`) can be opened directly via double-click —
  relative `<link>`/`<script src>` paths work fine over `file://`, no local
  server required.

### 2.3 Distribution

**Primary distribution is now a Windows `.exe` via Electron** — not a
browser file. Two build steps, chained automatically:

```
npm install        (one-time)
npm run dist        (builds dist/monarchy.html, then packages it into an exe)
```

`npm run dist` runs `node build.js` first (inlines every CSS/JS file into
one `dist/monarchy.html`, same mechanism as before) and then runs
`electron-builder`, which wraps that file plus `electron/main.js` into a
real, standalone native executable at `release/Monarchy <version>.exe` — no
browser, no "this is secretly a webpage" tell, no install required for the
portable target. See 3.11 for the full breakdown, targets, and a real
limitation (Wine) when cross-building the installer target from Linux/Mac.

`dist/monarchy.html` still gets built as an intermediate — and is still a
perfectly valid standalone file you can open directly in a browser for
quick testing — but it is **no longer the thing you hand to players.** The
`.exe` is.

---

## 3. Feature reference

### 3.1 Character sheet — attributes

8 core attributes in 4 groups, each attribute tagged Passive or Active:

| Group | Attributes |
|---|---|
| Physicality (Body) | Fortitude (Passive), Prowess (Active) |
| Agility (Body) | Dexterity, Nimble |
| Mind | Willpower, Intelligence |
| Social | Presence, Charisma |

Derived stats (auto-calculated, read-only, via `recalcDerived()` in
`03-sheet-basics.js`):

| Stat | Formula |
|---|---|
| HP max | Fortitude × Armour Value (of equipped armour) |
| Stamina max | ⌊(Fortitude + Willpower) / 2⌋ + 4 |
| Stress max | Willpower × 2 |

Also tracked: **Ward** (Ablative / Temporary / Static types) and
**Exhaustion** (pip-based track, rendered in `exh-pips`).

### 3.2 Skill trees

Three trees, each with a 3-tier structure (Primary → Secondary → Tertiary).
Full data lives in `js/04-data-skills.js` (source of truth — don't duplicate
the list here, it will go stale).

| Tree | Primary skills |
|---|---|
| Body | Melee Weapons, Ranged Weapons, Resilience, Coordination, Vigor, Finesse, Poise |
| Mind | Arcane, Craft, Divine, Insight, Knowledge, Logic, Survival |
| Social | Acting, Charm, Command, Convince, Empathy, Entertain, Etiquette |

Players add primaries/secondaries/tertiaries via a skill picker modal
(builtin list or custom text entry). Logic in `05-skills-backgrounds.js`.

### 3.3 Backgrounds

Prebuilt background/path data lives in `js/02-data-prebuilt.js`
(`PREBUILT_DATA.backgrounds`). Backgrounds grant skill investments along a
path; investing deeper into a path applies point costs across
primary/secondary/tertiary skill levels (`bgApplyPathToSkills` and friends
in `05-skills-backgrounds.js`). Custom (non-prebuilt) backgrounds are also
supported via free-text entry.

### 3.4 Abilities & Knacks

Ability slots come in tiers I–VIII (Roman numerals), each with a points
cost band and a cooldown:

- Cost bands: `4/6/8 pts`, `6/8/10 pts`, `8/10/12 pts`, then further tiers
  are flagged as "(extra slot)" rather than costed.
- Cooldowns range from **No cooldown** up through **Per combat / Per day /
  Per week / Once ever**.

Knacks are a smaller, separate ability-adjacent slot type. Logic in
`06-equipment-lanes.js`.

### 3.5 Equipment

Weapons and armour are added as cards; armour has an Armour Value (AV)
that feeds directly into the HP max formula. Only one armour can be
"equipped" at a time (`equipArmor` / `selectUnarmoured` in
`03-sheet-basics.js`); AV of the equipped armour recalculates derived
stats immediately.

### 3.6 Combat / Battlefield tracker — ⚠ overhaul target

Lives in `js/07-combat-tracker.js` (634 lines) — **this is the system
flagged for a full rewrite.** Current behavior, for reference before you
start rewriting:

- **8 lanes**: Front / Second / Support / Back, for each of Ally (`a-`) and
  Enemy (`e-`) sides. Lane note in the UI: *"Empty lines advance — if a
  line is empty all combatants behind it move forward."* (auto-advance
  formation rule)
- **Combatants** are draggable chips placed into lanes, each with: HP
  bar/label, a condition token-stack (name → count), a "turn used" toggle,
  notes, and support for both **individual** and **formation** (grouped
  unit) sizing.
- Drag-and-drop implemented via native HTML5 drag events
  (`makeDraggable`, `handleDragStart/End/Over/Enter/Leave/Drop`), plus a
  `MutationObserver` that auto-attaches drag handlers to cards added later
  (sheet-side cards: backgrounds, weapons, ability slots, skill primaries).
- Battlefield state serializes/restores as one JSON blob
  (`serializeBattlefield` / `restoreBattlefield`) — this is also the shape
  pushed over the network for GM/player sync (3.7).
- Turn counter (global, adjustable, resettable) lives in
  `13-turn-and-init.js`, not in this file — tightly coupled to combat but
  physically split off; keep in mind if rewriting turn-based mechanics.

### 3.7 Live session sync (GM ↔ Player)

Lives in `js/09-session-sync.js` (largest single file, ~1,120 lines) plus
`10-gm-tools.js` for GM-side management UI. Backend is a **Google Apps
Script** web endpoint (`BASE_SCRIPT_URL`), used as a simple shared
key-value relay — not a custom server.

- **Servers**: the GM picks/names a "server" (really just an ID scoping a
  shared table on the same backend), managed in `10-gm-tools.js`.
- **GM role**: pushes the battlefield state to the backend
  (`pushBattlefield`), polls for player vitals every 3s
  (`_gmPollPlayers`), can queue commands to players (`_queueGmCommand`),
  and can link a battlefield chip to a specific connected player's vitals
  (`setChipPlayerLink`) so the chip's HP mirrors what that player reports.
- **Player role**: polls the battlefield for changes (`_playerPollBf`),
  pushes their own HP/vitals back (`_playerPushVitals`, debounced), and can
  view/edit their own character sheet in a modal (`openPlayerSheet`).
- Transport: fetch-based polling by default, with a JSONP fallback
  (`_fetchStateJsonp`) for networks that block cross-origin GET.
- GM tools built on top of this channel: **NPCs** (saved locally, dragged
  onto the battlefield), **Encounters** (saved combatant groups, loaded in
  one action), **Fog of war** toggle, **Global mana** pool tracker
  (`11-combat-extras.js`).

### 3.8 Saves, export/import, autosave

Lives in `js/08-saves-io.js`.

- **Local saves**: named character saves stored in `localStorage`, listed
  in the side menu, switchable via `loadCharacter(id)`.
- **Autosave**: debounced, ticks a visible indicator dot on save.
- **Export/Import**: character exports as a `.monarch` file — plain JSON
  with shape `{ format: 'monarchy-character-sheet', version: 3, exported:
  <ISO date>, character: <serialized sheet> }`. Import reverses this.
  `version: 3` — bump this if the serialized shape changes, and handle
  older versions on import if you do.

### 3.9 UI polish & utilities

- **Canvas particle effects** + header ornamentation + several small "QoL"
  fixes, all in `01-fx-polish.js`, wrapped in one IIFE (self-contained,
  doesn't leak helpers globally — see Known Issues 5.1).
- **Undo system** (generic action-undo stack), in `12-app-utils.js`.
- Toasts, side menu, keyboard shortcuts (small, scattered across
  `08-saves-io.js`).
- **Dark mode**: the toggle function (`toggleDarkMode()`) still lives in
  `12-app-utils.js` and still works exactly as before (flips a class on
  `document.body`, always was global). What changed 2026-07-13: the
  *button* that calls it no longer lives in the sheet — see 3.10.
- **Sound effects**: infrastructure only, currently inert. See 3.10.

### 3.10 Title screen, table scene & window manager

Added 2026-07-12, substantially reworked 2026-07-13 after first-look
feedback. The character sheet stopped being "the app" and became a window
living on a shared table — and the table itself grew into something closer
to a real app shell (Foundry-VTT-style) rather than "the sheet's old UI,
just smaller." Markup and CSS in `index.html`/`05-shell.css`; behavior in
`14-window-manager.js` (generic) and `15-app-shell.js` (this app's specific
wiring).

**The table starts empty.** No window opens automatically on any of the
three title-screen entry points — the player has to explicitly create or
open a character from the left control panel. This was a deliberate
correction: the first version auto-opened a blank sheet immediately, which
read as "the table IS the sheet, just worse."

**Title screen** (`#title-screen`): three entry points, each a thin wrapper
around the existing session-sync system — no session logic was duplicated,
and none of them open a sheet window:

| Button | What it does |
|---|---|
| Open Local Table | Dismiss title screen. No session, no window opened. |
| Host Game Table | Pick/manage a server in a modal, then `startSession('gm')` (unchanged, in `09-session-sync.js`) |
| Join Game | Pick a server, then `startSession('player')` (unchanged) |

The host/join modals read `getServers()` (existing, `10-gm-tools.js`) and,
on confirm, set the value of the sheet's own `#session-server-sel` element
before calling `startSession()` — that select is what `getActiveServer()`
actually reads, so this is the only touch point, not a rewrite of server
logic. "Manage Servers" from either modal opens the **existing**
`#server-modal` (same one the sheet's own session panel uses); a short
poll (`titleManageServers`, 300ms interval) detects when it closes and
refreshes the title modal's list. A bit informal but fully isolated to
`15-app-shell.js` — see Known Issues 5.4 if you want to make it a real
callback instead.

**Table scene** (`#table-scene`): always rendered (never `display:none`) —
the title screen is just an opaque `z-index:1000` layer on top of it. This
matters: it means the sheet's own modals (server management, skill picker,
etc.) still work correctly via the DOM even while the title screen is up,
since nothing hides their actual ancestor. Don't "fix" this into a
show/hide toggle without re-checking that.

**Left control panel** (`#table-left-controls`): small, low-opacity,
non-intrusive buttons that brighten on hover — this is the app-level
control surface now, not the sheet's old hamburger menu:

| Button | Calls |
|---|---|
| ⌂ Title | `returnToTitle()` |
| ✚ Create Character | `tableCreateCharacter()` — resets the sheet via `restoreSheet({v:3})` (no `location.reload()`, so table/window state survives), opens the sheet window |
| 📂 Open Character | `tableOpenCharacterModal()` — lists `getSaves()` in a picker, loads the chosen one via the existing `loadCharacter(id)`, opens the sheet window |
| 💾 Save Table | `tableSaveAll()` — `quickSave()` if a character is already active, otherwise `openSaveModal()` (existing "save as" flow) |
| 🌗 Theme | `tableToggleTheme()` — just calls the existing `toggleDarkMode()` |

More buttons join this same panel later (combat, rulebook, etc.) — it's
built to grow, not a fixed set of five.

**Right panel** (`#table-right-panel`): reserved, intentionally empty.
Structurally present (fixed, right edge, `width:0`, `pointer-events:none`)
so dice/chat have a defined home later, but nothing renders there yet.

**Global theme, not sheet-owned**: the light/dark toggle used to only be
reachable from inside the sheet, and the table's own chrome (background,
dock, title screen) had no light-mode variant at all — meaning the table
always looked dark regardless of the toggle. Fixed: `05-shell.css` now
defines light-mode-default CSS custom properties (`--table-bg1`,
`--table-ink`, `--dock-bg`, etc. — see the `:root` block at the top of that
file) with a full `body.dark-mode` override block, so toggling from the
left panel re-themes title screen + table + dock + sheet together. The
sheet's own dark-mode CSS (in files 01–04) was untouched; only the new
table-level surfaces needed variants added.

**Tabs restored (2026-07-15).** The stacked-pages layout from 07-13 read
worse than real tabs in practice, so `showTab()`'s native behavior is back
in charge: `05-shell.css` no longer forces `.window-content .sheet` to
`display:block` or hides `.window-content .tabs` — both fall through to
their original `01-base.css` rules (`.tabs{display:flex}`,
`.sheet{display:none}`, `.sheet.active{display:block}`), so `p1`/`p2`/`p3`
switch again instead of all rendering stacked in one continuous scroll.
`syncCombatPage()` is still also called manually from
`tableCreateCharacter()`/`tableOpenCharacterConfirm()` (harmless, just
redundant now that the tab-click trigger fires again) — left in rather than
removed, since nothing depended on it going away.

Two things needed correcting to make tabs behave properly inside a window,
not just visually toggle back on:

- **Tab bar padding.** `.tabs` carries `padding-left:52px` /
  `padding-right:180px` in `01-base.css`, there to dodge `#menu-toggle` and
  `#quicksave-bar` (both `position:fixed` over the old full-page layout).
  Both are hidden inside the window now (see below), so that asymmetric
  padding just pushed the tab row visibly off-center. Reset to a symmetric
  `14px`/`14px`, scoped to `.window-content .tabs` so the original rule is
  untouched for any non-windowed use.
- **Scale-to-fit didn't know pages change height.** `WM.enableScaling()`
  (below) only recomputes the scaled wrapper's size via a `ResizeObserver`
  on the *window*, not the sheet's content — fine when every page was
  always visible (natural height only ever grew), but tabs make the active
  page's natural height jump around a lot depending which page — and how
  much content (skills, backgrounds, combatants) has been added to it.
  Added a public `WM.rescale(id)` and call it from `showTab()` right after
  switching pages, so the window resyncs to the new page's actual height
  immediately instead of waiting for the next manual resize (which could
  otherwise leave a page clipped short or trailing dead scroll space sized
  for whichever page was previously active).

**Old sheet chrome hidden, not deleted.** `#menu-toggle`, `#darkmode-btn`,
and `#quicksave-bar` are redundant now (replaced by the left panel) and
hidden via `05-shell.css` (`.window-content > #menu-toggle` etc.). The
underlying functions (`openMenu`, `toggleDarkMode`, `quickSave`) are
untouched and still callable — `quickSave()` in particular is reused
directly by `tableSaveAll()`.

**Sound effects disabled.** The injected "SFX ON/OFF" button (from
`01-fx-polish.js`) floated on top of the new UI and controlled sounds that
were never actually configured (`SOUNDS` was already an empty object — no
audio ever played). The one line that injects that button is commented out
in `01-fx-polish.js`; `window.sfx()`/`window.sfxToggleMute()` are still
defined and safe to call from anywhere if sounds get added back later —
just uncomment the `injectBtn()` call (see the comment right above it).

**Scale-to-fit windows.** Resizing the sheet window used to just clip/
scroll a fixed-width sheet — now the whole sheet scales as one unit (like
a Foundry VTT app window), via `WM.enableScaling(id, opts)` in
`14-window-manager.js`:

- The sheet's outer content wrapper got a stable id, `#sheet-root`
  (wraps the tab bar + all three pages, natural width 980px — same width
  the sheet always designed for). **Don't remove or rename this id** —
  it's the only hook the scaling system has into the sheet's DOM.
- At runtime, `enableScaling` wraps `#sheet-root` in a `.window-scale-outer`
  sizing div, applies `transform:scale()` to `#sheet-root` itself based on
  the window's current content width, and keeps the outer wrapper's
  explicit pixel width/height in sync with the *scaled* size (plain CSS
  transform doesn't shrink an element's contribution to its parent's
  scrollable area — the outer div is what makes `window-content`'s
  scrollbars measure correctly).
- Recomputes via `ResizeObserver` on the window element, so it reacts to
  both manual drag-resizing and any other cause of the window changing
  size. Verified in the actual packaged Electron build (not just jsdom) —
  a live resize produced a real `transform: scale(0.713265)` on `#sheet-root`.
- Generic: any future window can opt in the same way — see the `opts`
  shape (`rootSelector`, `naturalWidth`, `minScale`, `maxScale`) in
  `14-window-manager.js`.
- **Known side effect**: `#fog-overlay` (fog-of-war, inside page 3) is
  `position:fixed` and now lives inside a `transform`-scaled ancestor —
  which changes its containing block from the true viewport to the scaled
  wrapper (a CSS rule: `transform` on an ancestor creates a new containing
  block for `position:fixed` descendants). It'll still render, just scoped
  to the scaled sheet content instead of covering the whole screen. Not
  fixed — combat/fog is a separate future overhaul (3.6) and this is a
  cosmetic side effect until then, not a functional break.

**Window manager** (`WM`, in `14-window-manager.js`): fully generic, knows
nothing about character sheets specifically. To add a new window type later
(combat, rulebook, a read-only player-sheet viewer, etc.):

1. Give it markup shaped like the sheet's:
   ```html
   <div class="table-window" data-window-id="YOUR_ID">
     <div class="window-titlebar"><span>Title</span><button class="window-close">✕</button></div>
     <div class="window-content">...</div>
     <div class="window-resize-handle"></div>
   </div>
   ```
2. Call `WM.register('YOUR_ID', { title, icon, defaultRect:{x,y,w,h}, minW, minH, startOpen })` once, after the markup exists (i.e. from a script loading after `14-window-manager.js`).
3. Optionally `WM.enableScaling('YOUR_ID', { rootSelector, naturalWidth })` if it should scale-to-fit like the sheet.

That's it — drag, resize, focus/z-order, dock button, and position/size
persistence (`localStorage`, key `monarchy_window_<id>`) all come for free.

**Known limitation, not yet solved**: the sheet's own code (files 00–13)
reaches its elements by fixed global ids (`attr-for`, `hp-cur`, etc.). That
means exactly **one** live/interactive sheet can exist at a time — you
cannot open two independent, fully-interactive copies of the sheet window
side by side without rewriting those files to be instance-scoped. Viewing
*other* players' sheets read-only (already fetched as data via
`openPlayerSheet` in session-sync) doesn't hit this problem, since that's
rendered from data, not live singleton ids — a read-only viewer window is a
reasonable future window type that sidesteps this entirely. Full multi-
instance editing is a bigger, separate project if it's ever needed. This is
also why "Create Character" / "Open Character" reset/reload content into
the *same* sheet window rather than spawning a second one.

### 3.11 Distribution: Electron packaging

Added 2026-07-13. The app is no longer distributed as a plain HTML file —
`npm run dist` produces a real native executable.

- **`electron/main.js`**: the entire main process. Creates one
  `BrowserWindow`, strips Electron's default menu bar entirely
  (`Menu.setApplicationMenu(null)`) so it doesn't look/feel like a browser,
  and loads `dist/monarchy.html` — the same single-file build `build.js`
  has always produced. `nodeIntegration:false` + `contextIsolation:true` +
  `sandbox:true`: the app is plain browser JS/HTML/CSS with no need for
  Node API access from the page, so it stays sandboxed like a normal web
  page would be.
- **`package.json` → `build` block**: electron-builder config.
  - `win.target`: both `portable` (single .exe, no installer, no admin
    rights — closest match to the original "double-click and it opens"
    goal) and `nsis` (traditional installer with an uninstaller entry).
  - `linux.target: AppImage`, `mac.target: dmg` — configured for
    completeness/cross-platform use even though Windows is the primary
    target.
  - No custom icon set yet (uses Electron's default). Add one later via
    `build.win.icon` / etc. once there's real art.
- **Verified, not just configured**: built and actually launched from this
  toolchain — packaging succeeded for both `portable` (Windows) and
  `AppImage` (Linux); the packaged Linux build was launched headless
  (Xvfb) and inspected live via the Chrome DevTools Protocol, confirming
  the title screen, empty table, window manager, and scale-to-fit all work
  correctly in the real packaged app (not just in dev). The **`nsis`**
  (full installer) target additionally requires **Wine** when
  cross-building from Linux or macOS — building it natively on Windows
  needs neither Wine nor any extra tooling. `portable` doesn't need Wine
  on any host.
- **`release/`** is the output directory (gitignore it — it's large,
  ~85-130MB per platform, and fully regenerable via `npm run dist`).

---

## 4. Game system summary (content, not code)

This app is a companion tool for a homebrew TTRPG built around:

- **8 attributes** across Body/Mind/Social domains (see 3.1), each
  Passive or Active, driving 3 derived resource pools (HP, Stamina,
  Stress) plus a separate Ward/Exhaustion layer.
- **3-tier skill trees** (Primary → Secondary → Tertiary) across the same
  three domains — Body, Mind, Social — 7 primary skills each (21 total).
- **Background/path system**: characters invest points along background
  paths that grant skill levels, rather than (or alongside) buying skills
  directly.
- **Tiered ability/knack system** (8 tiers, escalating cost and cooldown)
  layered on top of the attribute/skill base.
- **Lane-based tactical combat**: 4 lanes per side (Front/Second/Support/
  Back) with a "gap closes" auto-advance rule, individual or formation
  (grouped) combatants, condition tokens, and Ward as a damage-absorption
  layer distinct from HP.

The full data (every background, every skill tertiary, every prebuilt
item) lives in `js/02-data-prebuilt.js` and `js/04-data-skills.js` — treat
those files as the source of truth for game content; don't let this
summary duplicate them in detail.

---

## 5. Known issues / quirks

Documented so nobody "fixes" them by accident while working on something
else, and so they're not mistaken for split-related bugs.

1. **Dead monkey-patch in `01-fx-polish.js`**: near the end of that file,
   there's a patch of `window.addAbilSlot` guarded by
   `if (_aas) window.addAbilSlot = ...`. Because this file loads before
   `addAbilSlot` is even defined (in `05-skills-backgrounds.js`), `_aas` is
   always `undefined` and the patch silently never applies. Pre-existing
   behavior from the original monolith, preserved as-is during the split.
   Harmless no-op today — flagging in case it's ever "fixed" without
   realizing it was already inert.
2. **The canvas element** (`#fx-canvas`) now lives at the top of `<body>`
   in `index.html`. In the original monolith it was physically placed
   inside `<head>`, which worked only because browsers auto-relocate
   stray body-only elements found in `<head>` during parsing. Moved to its
   correct, non-hacky location during the split — purely a hygiene fix,
   no behavior change.
3. **Turn counter lives apart from combat tracker**: `adjTurn` /
   `resetTurn` / `resetAllTurns` / `clearBattlefield` are in
   `13-turn-and-init.js`, not `07-combat-tracker.js`, purely because of
   where they fell in the original file. Keep this in mind if the combat
   overhaul touches turn logic.
4. **`#server-modal` z-index bumped to 1500** (in `05-shell.css`, via ID
   selector, `!important`). It was originally 500 — fine for use inside
   the table scene, but not high enough to appear above the title screen
   (z:1000) or its host/join modals (z:1010) when opened from there. No
   other behavior changed; if you ever restructure z-index layers, remember
   this modal needs to beat both the table AND the title screen.
5. **`titleManageServers()` refresh is a 300ms poll**, not a callback —
   it watches `#server-modal`'s `display` style to notice when the user
   closes it, then refreshes the title screen's server dropdown. Simple,
   isolated to `15-app-shell.js`, but not elegant. Fine to replace with a
   real callback/event if `closeServerModal()` (in `10-gm-tools.js`) ever
   grows one.
6. **`#fog-overlay` (fog-of-war, page 3) no longer covers the true full
   screen** once the sheet is scaled — see 3.10's scale-to-fit note. A
   `transform` on an ancestor (the new scaling system) creates a new
   containing block for `position:fixed` descendants, so the overlay is
   now scoped to the scaled sheet content instead of the real viewport.
   Cosmetic today since combat/fog is an explicit future overhaul target
   (3.6); don't be surprised by it if you touch fog-of-war before then.
7. **NSIS Windows installer target needs Wine to cross-build from
   Linux/macOS** (verified: the `portable` target does NOT need Wine and
   built/ran successfully from this project's Linux dev environment; the
   `nsis` target failed with `spawn wine ENOENT` under the same
   conditions). Building either target natively on Windows needs neither.
   If Wine is ever installed for full installer builds from Linux, no
   config changes are needed — `npm run dist` already requests both
   targets.

---

## 6. Rules & guidelines for working on this project

1. **Edit in `src/`, never in `dist/monarchy.html`.** The dist file is
   regenerated by `build.js` and any direct edits to it will be lost.
2. **Never reorder `<link>`/`<script src>` tags in `index.html`** without
   checking dependencies first — both CSS cascade and JS globals rely on
   current order (see 2.2).
3. **Run `npm run dist` before handing a new version to players** — not
   `node build.js` alone. `build.js` only produces the intermediate
   `dist/monarchy.html`; the actual distributable is the packaged `.exe`
   in `release/`. (`node build.js` alone is still fine for a quick
   browser-based test of your changes.)
4. **When splitting or moving code, do it mechanically first.** Cut/paste
   before rewrite. If reorganizing something, land it in its new location
   unchanged, verify it still works, then rewrite — don't do both at once.
5. **Keep `04-overrides.css` last, always.** If new CSS needs to win over
   existing rules, it goes here, not by fighting specificity elsewhere.
6. **New JS files**: decide where they sit by what they depend on (goes
   after) and what depends on them (goes before). Update the load-order
   list in this doc (2.1) when you add one.
7. **Bump the `.monarch` export `version` number** if you change what
   `serializeSheet()` outputs, and handle old versions gracefully on
   import rather than breaking existing players' saves.
8. **`07-combat-tracker.js` is the active overhaul target.** Changes here
   are expected to be more invasive than elsewhere — fine to break
   internal structure as long as external contracts (serialized
   battlefield shape used by session sync, see 3.7) are either kept
   compatible or updated on both ends together.
9. **This document is not optional documentation — treat it as part of
   the codebase.** See Maintenance rules below.
10. **New table windows (combat, rulebook, etc.) register with `WM`,
    they don't get bespoke drag/resize code.** Give the window the markup
    shape shown in 3.10 and call `WM.register()` once — don't hand-roll
    dragging for a new panel.
11. **Don't make `#table-scene` `display:none`.** The title screen works
    by covering it, not by hiding it — see 3.10. Toggling table-scene's
    display would hide everything inside it (including modals the title
    screen still needs to reach) regardless of their own z-index.
12. **Don't rename or remove `#sheet-root`'s id.** It's the only hook
    `WM.enableScaling()` has to find and scale the sheet's content — see
    3.10.
13. **Theme colors for table-level UI (title screen, table, dock) go in
    `05-shell.css`'s `:root` / `body.dark-mode` custom properties**, not
    hardcoded per-element. Anything new added to the table should use
    `var(--table-*)` tokens so the global theme toggle keeps working
    everywhere, not just on the sheet.
14. **New table-level controls go in `#table-left-controls`, styled with
    the existing `.table-ctrl-btn` class** — small, low-opacity, brighten
    on hover. Don't add a second visible control cluster; the dock at the
    bottom is strictly for window open/close, the left panel is for
    everything else.

### Maintenance rules for this document

Update `PROJECT.md` in the same sitting as any change that:
- adds, removes, or significantly reworks a feature → update **Section 3**
  (and Section 4 if it's game-content-facing)
- changes the file structure or load order → update **Section 2**
- introduces or resolves a known quirk/bug worth flagging → update
  **Section 5**
- is a milestone worth remembering → add a dated entry to **Section 7**

Small in-file tweaks that don't change behavior or structure (formatting,
comments, minor CSS tweaks) don't need a changelog entry.

---

## 7. Timeline

| Date | Change |
|---|---|
| 2026-07-11 | **Baseline.** Split the original single 7,394-line/422KB `monarchy_8_4_2.html` into the modular `src/` structure described in Section 2, with `build.js` regenerating an equivalent single-file `dist/monarchy.html`. Pure mechanical split — verified zero behavior change (all 200 function defs, all top-level declarations, all element IDs, and all brace/paren pairs matched exactly between original and rebuilt output; every split file and every rebuilt script block passes a JS syntax check clean). This document created as the standing project reference. |
| 2026-07-12 | **Title screen + table scene.** The character sheet stopped being "the app" — added a title screen (Open Local Table / Host Game Table / Join Game) leading into a table scene where the sheet now lives as one draggable, resizable, closeable/dockable window. New generic window manager (`14-window-manager.js`) built to support future window types (combat, rulebook) without more infrastructure work. No changes to sheet internals (files 00–13) — only wrapped, verified via a jsdom-based runtime smoke test (title screen dismissal, window open/close/drag/resize, position persistence, host/join modal server population) in addition to the usual syntax checks. See 3.10 for full details and the known limitation on multiple live sheet instances. |
| 2026-07-13 | **Table overhaul + Electron distribution**, after first-look feedback that the table "was just the sheet's UI but worse." Table now starts empty (no auto-opened sheet); added a left control panel (Title/Create Character/Open Character/Save Table/Theme, built to grow) and a reserved-but-empty right panel for future dice/chat. Tabs removed — all sheet pages render stacked. Old sheet chrome (menu, quicksave, dark-mode button) hidden inside the window, replaced by the table-level controls. Dark/light theme is now genuinely global — new `--table-*` CSS custom properties in `05-shell.css` re-theme the title screen/table/dock together, not just the sheet. Sound-effect UI disabled (was non-functional clutter — no sounds were ever configured). Added scale-to-fit windows (`WM.enableScaling()`) so resizing the sheet scales it as a whole instead of clipping/scrolling. **Distribution model changed**: `npm run dist` (Electron + electron-builder) now produces a real `.exe` — verified end-to-end by actually building and launching the packaged app (headless, via Xvfb + Chrome DevTools Protocol) and confirming the full flow (title screen → create character → blank sheet → real computed `scale()` transform) inside the genuine packaged executable, not just in a browser or jsdom. `dist/monarchy.html` still exists as a build intermediate and a quick-test convenience, but is no longer the distributable. See 3.10, 3.11, and Known Issues 5.6–5.8. |
| 2026-07-15 | **Tabs restored** — the stacked-pages layout from the 07-13 table overhaul read worse than real tabs, so `showTab()` switching is back (no code deleted 07-13, so this was a CSS-level reversal in `05-shell.css`, not a rebuild). Fixed two things the stacked layout had been masking: the tab bar's leftover asymmetric padding (`52px`/`180px`, originally there to dodge fixed-position buttons that are hidden inside the window now) was making the tab row render visibly off-center; and `WM.enableScaling()` had no way to know a page switch — as opposed to a window resize — had just changed the sheet's natural content height, so a new `WM.rescale(id)` is now called from `showTab()`. A full UI/UX + architecture review was requested alongside this fix; findings and a proposed phased plan are in the new **`UX-AUDIT.md`** rather than folded into this document, since it's closer to a working backlog than a settled reference — expect it to shrink over time as items get done. See 3.10. |
