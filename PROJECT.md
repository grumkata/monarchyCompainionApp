# MONARCHY — Project Reference

**Status:** Active development
**Last updated:** 2026-09-24

> **Purpose of this document:** this is the single place to check before
> working on the project — what exists, how it's built, and what rules to
> follow. Read this instead of re-reading the whole codebase. **Update it
> every time you make a meaningful change** (new feature, structural change,
> renamed system, bug fixed, known issue found). See "Maintenance rules" at
> the bottom for exactly what to update and when.

---

## 1. What this project is

Monarchy is a character sheet + table companion app for a custom TTRPG. It
runs entirely on one machine: a hall where the roster and the sheets live,
and a table you raise and walk into, with the tavern around it.

**There is no live session today.** An earlier generation had GM/player sync
over Firebase; it went with that generation (see 2.1) and has not been
rebuilt. The hall still offers "Join a Game" and says as much on the screen
— *"the sync layer is not built — the word is remembered"*. Everything else
works with no network at all.

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

The tree below is the CURRENT one. It is not the one the 2026-07-11 split
produced: that generation — `src/index.html`, `css/01-base` through
`05-shell`, and `js/00-storage` through `16-multi-sheet` — was superseded by
the hall/table architecture and finally deleted on 2026-09-14, having sat
unbuilt for months. `git show f444ae8` still has every line of it if you ever
want to read one. **Features that went with it and have not been rebuilt:**
live GM/player sync, GM tools (saved NPCs and encounters), fog of war, the
drag/resize/dock window manager, and simultaneous multi-sheet editing. The
hall's "Join a Game" screen says so in as many words — *"the sync layer is
not built"* — and the `firebase` dependency that used to serve it was dropped
on the same day, since it was 45 MB riding into every installer for code
nothing loaded.

```
src/                       ← EDIT THIS. Multi-file source, never distributed as-is.
  menu-body.html           ← the hall's markup
  table-body.html          ← the table's markup
  css/                     ← scoped to one half or the other at build time
    20-shell.css            unscoped: reaches across both
    00-hall.css             body.at-hall
    01-sheet.css            the record — needed in the hall AND at the table
    12-combat.css           body.at-table
    13-table-ui.css         body.at-table
  js/
    00-three.js             vendor (three.js r128)
    00-geo-runtime.js       reads the packed vertex blobs; MUST precede every pack
    *-assets.js             baked model packs (castle, wood, bits, kit, room, tavern, dice,
                            sprites, charges, chest, bin), written by tools/bake*.py
    10-16                   the hall: sheet data, heraldry, hall 3D, codex, sheet, menu
    21-28, 40-51, 54        the table: content, model, viewport, props, toolbox, scene setup,
                            GL, boot, tokens, characters, papers, figures, hand, library,
                            pictures, token maker, preview, lines, combat scene, room editor
    30-34, 37-39            the fight: rules, content, combat app, GL pieces, field, bar, dice
    29-role.js              which side of the table you are
    55-herald.js            Blazon's motion: the Bend transition, the Cry, gilt (see 3.13) — before 42-shell
    42-shell.js             which half you are looking at
  assets/tex/              ← the textures, as real files (see 2.3)
  assets/fonts/            ← Blazon's four typefaces, once fetched (see 3.13) — copied to dist/ like tex

tools/
  scope-css.js, pack-geometry.js   ← build inputs, used by build.js
  bake*.py                         ← re-bake a model pack from its glTF/FBX
  bake-textures.py                 ← pull the textures back out to files
  fetch-fonts.js                   ← one-off: download the OFL fonts into src/assets/fonts
  shot.js                          ← photograph the built app (Electron, not Playwright — see its header)

test/
  serve.js                 ← serves dist/ over http for the browser tests
  geometry.test.js         ← the packed vertices still say what the bake said
  table.test.js            ← the table model, in node
  table-ui.test.js         ← the chest, the bar, and what is in your hand
  join.test.js             ← a character joining a table
  handling.test.js         ← picking things up and putting them down
  tincture.test.js         ← the chrome's palette still IS the banners' palette (see 3.13)
  herald.test.js           ← the Bend still lands a table; turns and natural 20s are still cried
  case.test.js             ← the chest's case, the orders' three controls, the paper on the wood

STYLE.md                  ← Blazon, the look of the app: the rules behind 20-shell.css's tokens

build.js                  ← `node build.js` produces dist/monarchy.html (see 2.3)
dist/monarchy.html        ← build artifact. NOT standalone any more — needs dist/assets/tex
                            beside it, and will not load textures over file:// at all (see 2.3)
package.json               ← Electron + electron-builder config; `npm run dist` is the distributable
electron/main.js           ← Electron main: loads dist/monarchy.html, no menu bar
release/                   ← OUTPUT of `npm run dist` (gitignored)
```

**Golden rule:** `src/` is where all editing happens. `dist/monarchy.html`
is a build artifact — regenerate it with `node build.js`, never edit it
directly (edits will be silently lost on the next build).

### 2.2 Why the split is ordered the way it is

- It was originally a **pure mechanical split** of the monolith — code moved,
  not rewritten. The 2026-07-18 combat/multiplayer split (3.6, 3.7, 3.10)
  kept that ethos — move first, verify, only rewrite where the move itself
  required it (e.g. folding the turn-count monkey-patch directly into
  serializeBattlefield/restoreBattlefield once both lived in the same file)
  — but it was NOT purely mechanical the way the original split was,
  because the original split had left `serializeSheet()`/`restoreSheet()`
  (whole-character save/load, used by everything) physically sitting inside
  the combat file. That got moved to 08-saves-io.js as part of this pass;
  see 3.6 and 3.8. All of it is still plain (non-module) JS/CSS sharing one
  global scope, exactly like the original file — direct cross-file
  `document.getElementById` reads and bare global function calls are the
  normal, intentional way things talk to each other here, not a bug to
  "fix" wherever you see one.
- **CSS load order matters**: later files win on conflicting rules, and the
  order lives in the `CSS` array in `build.js`. There is no `04-overrides`
  any more — each sheet is instead SCOPED at build time to `body.at-hall` or
  `body.at-table` by `tools/scope-css.js`, because the hall and the table
  were written as separate documents and share 27 class names (`.plate`,
  `.shield`, `.face`, `.cap`, `.row`, `.on`, `.warn` and the rest). Without
  that scoping they quietly restyle each other; `.plate` has broken this
  project once already.
- **JS load order matters**: later files call functions and read variables
  declared in earlier files. The order lives in the `JS` array in `build.js`
  and is written out by hand rather than globbed, so adding a file is a
  decision. Two hard constraints: `00-geo-runtime.js` must precede every
  asset pack, and `16-menu.js` is last because it boots the hall.
- **The built page is not standalone and will not run from `file://`.** See
  2.3 — the textures are real files now, and three.js asks for them with
  `crossOrigin="anonymous"`, which a `file://` response cannot satisfy. Use
  `test/serve.js`, or just run it in Electron with `npm start`.

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

`dist/monarchy.html` still gets built as an intermediate, and it is still
**no longer the thing you hand to players** — the `.exe` is.

It is also no longer standalone, and the way it is not is worth knowing
before it costs you an afternoon. Since 2026-09-14 the textures live beside
it as real image files in `dist/assets/tex/`, because 7.6 MB of base64 in a
script was most of the reason opening the app took a second. So the page
needs that folder next to it, and `electron-builder` ships the whole of
`dist/`, so the `.exe` is unaffected.

**Double-clicking `dist/monarchy.html` into a browser no longer works** —
not even from inside `dist/`, where the files plainly are. three.js sets
`crossOrigin="anonymous"` on every texture it loads, which over `file://`
makes each one a CORS request against a response that has no CORS headers,
so Chrome fails all of them (`net::ERR_FAILED`) and every model renders as
a blank grey shape with nothing in the console to say why. Electron does
not enforce this, which is the trap: the app is fine, screenshots look
right, and only a browser sees the fault.

To look at the built page in a browser, serve it:

```
node -e "require('./test/serve.js').serve().then(s=>console.log(s.url+'/monarchy.html'))"
```

That is what the Playwright tests do — see `test/serve.js`.

**Re-baking a pack?** Run `python tools/bake-textures.py` afterwards. The
bake scripts write textures back in as data URIs; that tool pulls them out
again and refreshes `src/assets/tex/manifest.json`. Forgetting is not fatal
— `build.js` reports each picture it could not find in the manifest and
leaves it inline — but the build gets fat again. The vertex packing needs no
such step: `build.js` runs `tools/pack-geometry.js` over each pack in memory
on every build, and `npm test` re-checks all 210 prims against the originals.

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

### 3.6 Combat / Battlefield — hardcoded into `#table-right-panel` (2026-08-01)

**Update 2026-08-01**: no longer a WM-managed floating window. It was split
from the sheet into a standalone `table-window` on 2026-07-18 (history
below), then on 2026-08-01 pulled out of the WM/drag/resize/close system
entirely and hardcoded as a permanent ~300px column at `#table-right-panel`
(`tableToggleCombat()` now collapses/expands that panel via a CSS class,
not `WM.toggle`). The 8-lane formation (`.bf-lanes`) is unchanged in the
DOM/JS — `07-combat-window.js` still addresses lanes by `.bf-lane`/
`data-lane`, never by grid position — only the CSS reflows it to a vertical
stack (`data-lane-label` on each lane drives an inline label, replacing the
old `.bf-label-row`). Own compact header now, not borrowed
`.sheet-header`/"Monarchy" branding.

Lives in `js/07-combat-window.js` (still ⚠ the system flagged for a full
mechanics/UI rewrite when someone gets to it — this pass only moved and
uncoupled it, it did not redesign combat itself). It used to be page 3 of
the character sheet (`#p3`, tab label "Combat Tracker"); it's now its own
table window (`data-window-id="combat"`, `#combat-root`), registered with
the Window Manager in `15-app-shell.js` exactly like the sheet is, opened
via the ⚔ Combat button in the left control panel or `WM.toggle('combat')`.
The GM/session/server-management half of the old combined tab stayed on
the sheet as its own tab (now labeled "Multiplayer") — see 3.7.

- **8 lanes**: Front / Second / Support / Back, for each of Ally (`a-`) and
  Enemy (`e-`) sides. Lane note in the UI: *"Empty lines advance — if a
  line is empty all combatants behind it move forward."* (auto-advance
  formation rule)
- **Combatants** are draggable chips placed into lanes, each with: HP
  bar/label, a condition token-stack (name → count), a "turn used" toggle,
  notes, and support for both **individual** and **formation** (grouped
  unit) sizing.
- Drag-and-drop for battlefield chips is native HTML5 drag events
  (`makeDraggable`, `handleDragStart/End/Over/Enter/Leave/Drop`), local to
  this file. The *other* drag-to-reorder system — for sheet cards
  (backgrounds, weapons, ability slots, skill primaries) — used to live
  in this same file via a shared `MutationObserver` pattern; it had
  nothing to do with combat and moved to `05-skills-backgrounds.js`.
- **Personal vitals & status** (current HP/Stamina/Stress, Ward,
  Exhaustion, Conditions, the movement/dodge readout) live here too, in
  `#player-vitals-section` — hidden when you're acting as GM. These used
  to be *mirrored* with page 1 of the sheet (three separate, overlapping
  sync mechanisms: `bindCurSync`, `adjBothVals`, and a mirror map inside
  `adjVal`); page 1 no longer has a current-HP/Stamina/Stress tracker at
  all, so there's nothing left to mirror with — this is now the one and
  only place current vitals live. Page 1 still shows the *max* values
  (`hp-max`/`st-max`/`str-max`), since those come from attributes + armor
  and are legitimate character-build reference numbers; `recalcDerived()`
  (03-sheet-basics.js) writes both the sheet's copy and this window's copy
  (`c-hp-max` etc.) every time, same mechanism as before, just pointed at
  a different window.
- Battlefield state serializes/restores as one JSON blob
  (`serializeBattlefield` / `restoreBattlefield`, both defined *here* now)
  — this is also the shape pushed over the network for GM/player sync
  (3.7); `09-session-sync.js` calls these two functions rather than
  defining them, which is the cleaner half of "uncoupling" this pass was
  asked to do.
- Turn counter (global, adjustable, resettable) lives here now too
  (`adjTurn`/`resetTurn`/`resetAllTurns`/`clearBattlefield`, moved from the
  old grab-bag `13-turn-and-init.js`). Turn count folds directly into
  `serializeBattlefield`/`restoreBattlefield` above — no more monkey-patch
  splicing it in from a separate file.
- **Persistence**: the battlefield used to ride along inside the
  character's own save file, so a solo/local GM's battlefield survived a
  reload, but was tangled to whichever specific character happened to be
  loaded at save time. It now persists itself independently
  (`_saveLocalBattlefield`/`_loadLocalBattlefield`, key
  `monarchy_combat_state`, autosaved every 5s + on unload) — same idea as
  how window position/size already persist per-window (3.10), just for
  battlefield content. **Behavior change to be aware of:** switching which
  character is loaded on the sheet no longer resets or reloads the
  battlefield; the two are independent saves now.

### 3.7 Live session sync (GM ↔ Player) & the embedded player/session panel

**Update 2026-08-01**: the "Multiplayer" tab (`#p3`) described below is
gone. Its content — session bar, server modal, GM tools — is now
`#sheet-toolbar-panel`, always visible above Page I/II instead of a third
page that hid them. GM tools specifically collapse/expand
(`toggleGmToolsPanel()`) rather than being permanently shown. A real player-
identity section (username input + avatar file picker, `11-session-
extras.js`) now sits above the session bar — separate from the character's
own name on Page I, persisted locally, pushed out in the same payload as
vitals. `getMyPlayerName()` no longer falls back to a `prompt()` popup.

Lives in `js/09-session-sync.js` (largest single file, ~1,000 lines) plus
`10-gm-tools.js` for GM-side management UI and `11-session-extras.js` for
fog/mana/player-identity. Backend is **Firebase Realtime Database** (real-time
listeners, no polling) — migrated from an earlier Google Apps Script relay in
a separate pass upstream of this document's 2026-07-18 combat/multiplayer
split; `10-gm-tools.js` still has a comment marking where `BASE_SCRIPT_URL`
used to live, for anyone tracing history. This is the half of the old combined "Combat Tracker" tab
that **stayed on the character sheet** (now labeled "Multiplayer") rather
than moving to the standalone Combat window (3.6) — deliberately, since
more multiplayer features beyond combat are planned, and connection/
session/GM-tool management reads more naturally as part of "your sheet"
than as a shared table window everyone looks at together (that's what the
battlefield itself is for).

- **Servers**: the GM picks/names a "server" (really just an ID scoping a
  shared table on the same backend), managed in `10-gm-tools.js`.
- **GM role**: pushes the battlefield state to the backend
  (`pushBattlefield`), polls for player vitals every 3s
  (`_gmPollPlayers`), can queue commands to players (`_queueGmCommand`),
  and can link a battlefield chip to a specific connected player's vitals
  (`setChipPlayerLink`) so the chip's HP mirrors what that player reports.
  These functions reach directly into the Combat window's chip/lane DOM
  (e.g. `_handleLaneDrop`, `setChipPlayerLink`) rather than through some
  formal message-passing interface — that's an intentional, pragmatic
  choice (see 2.2): the sheet, Multiplayer tab, and Combat window are
  still all one document/one global scope, so a direct
  `document.getElementById` reach-across is the normal way this app's
  pieces talk to each other, not a shortcut that needs fixing.
- **Player role**: polls the battlefield for changes (`_playerPollBf`),
  pushes their own HP/vitals back (`_playerPushVitals`, debounced), and can
  view/edit their own character sheet in a modal (`openPlayerSheet`).
- Transport: fetch-based polling by default, with a JSONP fallback
  (`_fetchStateJsonp`) for networks that block cross-origin GET.
- GM tools built on top of this channel, all in the sheet's Multiplayer
  tab: **NPCs** (saved locally, dragged onto the battlefield),
  **Encounters** (saved combatant groups, loaded in one action), **Fog of
  war** toggle, **Global mana** pool tracker (`11-session-extras.js`). The
  GM-facing controls for fog/mana live in the Multiplayer tab; the
  player-visible readouts they drive (the mana pool number, the fog
  overlay itself) live in the Combat window, same direct-DOM-reach pattern
  as above.

### 3.8 Saves, export/import, autosave

Lives in `js/08-saves-io.js`, including `serializeSheet()` / `restoreSheet()`
/ `setActiveSave()` — moved in from `07-combat-tracker.js` on 2026-07-18,
where they'd been misplaced since the original split despite PROJECT.md
claiming that file was "isolated." These three are the whole-character
save/load backbone: quickSave, confirmSave, loadCharacter, exportMonarch,
importMonarch, and the undo system (12-app-utils.js) all depend on them
covering the *entire* character, not just combat.

- **Local saves**: named character saves stored in `localStorage`, listed
  in the side menu, switchable via `loadCharacter(id)`.
- **Autosave**: debounced, ticks a visible indicator dot on save.
- **Export/Import**: character exports as a `.monarch` file — plain JSON
  with shape `{ format: 'monarchy-character-sheet', version: 4, exported:
  <ISO date>, character: <serialized sheet> }`. Import reverses this.
  `version: 4` — bump this if the serialized shape changes, and handle
  older versions on import if you do (as of this bump, `restoreSheet`
  accepts `v: 3` or `v: 4`; only `v: 4` is written on export).
- **What changed at v4**: combat/session state (current HP-STA-STR, Ward,
  Exhaustion, Conditions, battlefield combatants) no longer travels with
  the character file at all — that's Combat's own concern now, persisted
  independently (3.6). A character save is purely "build" data: identity,
  attributes, skills, backgrounds, gear, abilities. Old `v: 3` files still
  import fine; their combat-shaped fields are just ignored, not read.

### 3.9 UI polish & utilities

- **Canvas particle effects** + header ornamentation + several small "QoL"
  fixes, all in `01-fx-polish.js`, wrapped in one IIFE (self-contained,
  doesn't leak helpers globally — see Known Issues 5.1). Includes the HP
  danger-flash effect, which reads the Combat window's `c-hp-cur`/
  `c-hp-max` (updated 2026-07-18 — it used to also read a page-1 `hp-cur`
  that no longer exists) and pulses the Combat window itself, not the
  sheet.
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
| ✚ Create Character | `tableCreateCharacter()` — resets the sheet via `restoreSheet({v:4})` (no `location.reload()`, so table/window state survives), opens the sheet window |
| 📂 Open Character | `tableOpenCharacterModal()` — lists `getSaves()` in a picker, loads the chosen one via the existing `loadCharacter(id)`, opens the sheet window |
| 💾 Save Table | `tableSaveAll()` — `quickSave()` if a character is already active, otherwise `openSaveModal()` (existing "save as" flow) |
| ⚔️ Combat | `tableToggleCombat()` — `WM.toggle('combat')`, added 2026-07-18 (3.6) |
| 🌗 Theme | `tableToggleTheme()` — just calls the existing `toggleDarkMode()` |

More buttons can still join this same panel later (rulebook, dice, etc.) —
it's built to grow, not a fixed set.

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
(`syncCombatPage()`, mentioned in an earlier revision of this doc as still
being called here "harmlessly," was removed 2026-07-18 along with the
page-1/Combat-window vitals mirroring it existed to support — see 3.6.)

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
- **Fixed 2026-07-18**: `#fog-overlay` used to live inside page 3
  (`position:fixed`, meant to cover the whole viewport), which put it
  inside this same `transform`-scaled ancestor — a CSS rule that a
  `transform` on an ancestor creates a new containing block for
  `position:fixed` descendants, so it only ever covered the scaled sheet
  content, not the real viewport. Now that combat is its own window
  (3.6), `#fog-overlay` moved to be a direct sibling of the table windows
  under `#table-surface`, outside any scaled/transformed wrapper, so it
  correctly covers the whole screen again.

**Window manager** (`WM`, in `14-window-manager.js`): fully generic, knows
nothing about character sheets specifically. The Combat window (3.6),
added 2026-07-18, is the second window type built on this and proves the
pattern generalizes — sheet and combat are each ~150 lines of markup +
one `WM.register` call, nothing WM-side changed to support a second
window. To add another window type later (rulebook, a read-only
player-sheet viewer, etc.):

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

**Solved 2026-08-01, without rewriting files 00–13**: the sheet's own code
still reaches its elements by fixed global ids (`attr-for`, `hp-cur`,
etc.) — that didn't change, and per 2.2 it deliberately isn't going to.
What changed is *who currently owns those ids*. `16-multi-sheet.js` gives
every field inside `#sheet-root` a permanent `data-field` mirror of its id
(added once, mechanically, to the template). Only one sheet instance
"claims" the real ids at a time — `claimSheetIds`/`releaseSheetIds` move
that ownership on focus (`activateSheetInstance`, hooked to
`mousedown`/`focusin` in the capture phase, before any click/input inside
the window is handled). Every existing id-based function in 00–08 keeps
working completely unchanged for whichever instance most recently had a
user interact with it. Each instance's actual values live in its own DOM
subtree at all times regardless of which one currently owns the ids —
nothing is shared or overwritten, just wired live one at a time.

The one real hazard this introduced: autosave debounces for 4s
(`08-saves-io.js`), so switching instances mid-debounce could otherwise
save the wrong data into the wrong slot. `flushActiveSheetWrites()` forces
that write to complete, synchronously, against the *outgoing* instance
before ids move to the incoming one. Verified end-to-end in
`test/multi-sheet.test.js`, including that exact race.

`"Create Character"` / `"Open Character"` now call `createSheetInstance()`
(clones `#sheet-root`'s template into a new WM window rather than
resetting the existing one); opening a character that's already open in
some instance focuses it instead of duplicating it
(`findSheetInstanceForSave`).

**Known gap, not addressed by this**: combat's HP-max mirroring
(`07-combat-window.js` reading/writing page-1 vitals directly) and
session-sync's player identity still effectively key off whichever
instance is currently active, not "the specific character a given combat
chip represents." Harmless today (nothing exercises multiple *networked*
characters simultaneously yet) but worth a real design pass — which
character's HP a chip mirrors, and whether each open sheet gets its own
session identity or the table has one shared one — before leaning on
combat + multi-instance together.

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

### 3.12 Distribution: auto-update (2026-09-15)

Real binary auto-update, via `electron-updater` — not to be confused with
a separate, unrelated `updater.js` that briefly sat at the repo root: a
hand-rolled scheme that polled the GitHub Releases API for a `content.zip`
and hot-patched just the web content inside a fixed shell. grumkata chose
the real thing instead (full package replacement) over that content-patch
approach; the old file is still there, **unused**, kept only until someone
decides it's worth deleting. `electron/updater.js` is the one that's wired
in.

- **Only the `nsis` Windows target actually auto-updates.**
  electron-updater's Windows mechanism works by having the installed
  NSIS uninstaller silently re-run a newer installer in place — there is
  no equivalent for the `portable` target (also shipped, see 3.11), which
  is just a standalone .exe someone downloaded and runs directly. A
  player on the portable build will never auto-update; they have to grab
  a new copy by hand. This is a property of how NSIS auto-update works,
  not a limitation of anything written here — nothing can fix it short of
  dropping the portable target.
- **Where it lives**: `electron/updater.js` wraps `autoUpdater` from
  `electron-updater` (a real npm dependency — see the note below on why
  that classification matters) and is called once from `main.js`, after
  `createWindow()`, inside the same `app.whenReady()` block. AFTER the
  window on purpose: grumkata chose checking quietly in the background
  over blocking startup on it, and `autoDownload`/`autoInstallOnAppQuit`
  (both default `true`) already do almost exactly that on their own —
  download while the session continues, install on the next natural quit.
  The native OS "update available" toast electron-updater can show by
  itself (`checkForUpdatesAndNotify()`) is deliberately skipped in favor
  of `checkForUpdates()` plus console logging, for the same reason this
  app removed the default menu bar and hides its own chrome: a system
  toast reads as a webpage/Electron tell, not as a real desktop app.
  Every event also logs to the console, the same place every other
  failure in this app already reports (see `glFailed()` in
  `27-table-gl.js` for one).
- **The in-app UI is a popup on the hall, not anything in Settings.**
  First built inside Settings (a version line + a "Check for Updates"
  button) and then deliberately moved — grumkata: the hall is the one
  screen every session actually passes through, whether or not anyone
  ever opens Settings at all, and that's exactly the point of a
  background-checked update: nobody should have to go looking for it.
  `#update-card` (`menu-body.html`) sits top-right, hidden until
  `16-menu.js`'s status listener sees `state: 'downloaded'` — every other
  state (`checking`/`available`/`downloading`/`error`) is silent on
  purpose, since none of them are anything a player needs to act on.
  Two buttons, both plain `.lk`: "Restart & update" calls
  `autoUpdater.quitAndInstall()` (via IPC), "Later" just hides the card
  for this session — installing on the next natural quit was already
  going to happen regardless (`autoInstallOnAppQuit`), so "Later" costs
  nothing. `z-index:50` — above the hall's own chrome (`#ui` is `z:2`)
  but below the record screen (`#screen` is `z:20`, `.back` is `z:24`),
  so opening anything covers it and it's there again the moment you
  return to the bare hall. Deliberate, not a gap: this was asked for on
  the *starting* screen specifically, not as a thing that follows you
  everywhere.
- **`electron/preload.js`** is new — this app had no preload at all
  before this. `contextIsolation: true` and `sandbox: true` stay exactly
  as they were; the preload opens exactly one hole in that seal,
  `window.AppUpdate` (`onStatus`/`checkNow`/`restartNow`), via
  `contextBridge`. It's undefined anywhere this HTML runs without that
  preload attached — `test/serve.js`'s plain browser, or the bare
  `BrowserWindow` `tools/shot.js` opens for screenshots — and every
  consumer in `16-menu.js` checks for it before touching it, for exactly
  that reason.
- **Guarded against dev runs**: `setupAutoUpdater()` no-ops immediately if
  `!app.isPackaged`. Unpackaged (`npm start`, or anything driven through
  `tools/shot.js`/`test/serve.js`), there is no `app-update.yml` for
  electron-updater to read and nothing meaningful to compare against — it
  throws rather than silently skipping if you let it try. Confirmed
  quiet: `npm start` logs `[updater] skipped — not a packaged build`
  immediately after the window opens and touches nothing else.
- **`electron-updater` is a real `dependencies` entry, not
  `devDependencies`.** It `require()`s inside `electron/updater.js`, which
  runs in the packaged app's own main process at runtime — and
  electron-builder strips devDependencies out of the asar it builds. Get
  this wrong and `npm start` still works fine (dev pulls straight from a
  fully-populated `node_modules`), which is exactly what makes it a trap:
  the packaged .exe would throw `Cannot find module 'electron-updater'`
  the first time a real player launched it, and nothing in a normal dev
  session would ever surface that before it shipped.
- **`build.publish`** (in `package.json`) is now set to the `github`
  provider, pointed at this repo. Adding it does **nothing** to what
  `npm run dist` does today — it still only builds locally into
  `release/`, exactly as before. It only takes effect the moment
  something either (a) runs electron-builder with an explicit publish
  flag and a `GH_TOKEN`, which uploads the installer plus a generated
  `latest.yml` to a GitHub Release, or (b) a packaged app calls
  `checkForUpdates()`, which reads that same config to know where to
  look. **No release, tag, or token was created as part of this work** —
  cutting an actual update is a distribution decision, made deliberately,
  not a side effect of writing the updater.
- **What actually publishing an update requires**, once ready: bump
  `package.json`'s `"version"` (electron-updater compares against
  `app.getVersion()`, which reads straight from it — nothing here bumps
  it automatically, and forgetting to is the one way this whole mechanism
  goes quiet with nothing to report), then build and publish with a
  `GH_TOKEN` environment variable set (a GitHub personal access token with
  permission to upload release assets on this repo) — e.g.
  `GH_TOKEN=... npx electron-builder --publish always` after
  `node build.js`. That step was intentionally not run or scripted here.

### 3.13 The look: Blazon (2026-09-17)

The app used to speak four visual dialects: the dark 3D hall, the parchment
record, a flat beige chat column with web-form buttons at the table, and the
bright cartoon field. Now there's one system, **Blazon**. It's heraldry used
as a graphic system, the way Persona 5 uses its own theme. **`STYLE.md` is
the full reference.** In short:

- **Tokens** are all in `20-shell.css` (unscoped), prefixed `--m-` so they
  can't collide with the local `--ink`/`--gold` names the scoped sheets
  already define. The palette is `12-heraldry.js`'s `TINCT`, copied exactly,
  and `test/tincture.test.js` fails if the two drift or if Argent stops
  clearing 4.5:1 on a colour.
- **Three surfaces:**
  - **Sable** for all chrome. It no longer follows the Theme button; only
    the mat does.
  - **Cloth** for the hall's views.
  - **Vellum** for records.
- **The signature interaction is the counterchange.** An Or band sweeps in on
  a 115° bend and the ink flips to Sable. It's on the hall's plates (in each
  banner's own tincture), Back, `.lk`, the roll, the record's tabs, the scribe
  bar, the HUD, chat, dice, the GM board and the scene dialog.
- **Livery.** The chrome's one accent, `--m-house`, is meant to come from the
  player's own arms. `42-shell.js` sets it (`Shell.livery()`, also called by
  `takeArms()`). The choice of tincture, `houseTincture()`, is an open TODO
  for grumkata. Until it's written, the livery is Gules.
- **Type.** The four families were never loaded: there was no `@font-face`
  anywhere, so everything was Times New Roman. `20-shell.css` now declares
  each family, trying an installed copy, then `assets/fonts/*.woff2`, then a
  Windows face (Constantia, Sitka Text, Old English Text MT / Sitka Banner,
  Bahnschrift SemiCondensed). **The woff2 files aren't in the repo yet.** Run
  `node tools/fetch-fonts.js` once and commit them; `build.js` copies the
  folder into `dist/` and says so in its output.
- **Motion and shaders, second pass (2026-09-17).** New
  `src/js/55-herald.js` (loaded just before `42-shell.js`) is Blazon's motion
  runtime. `STYLE.md` §6–6¾ has the full detail.
  - **`Herald.wipe`:** a raw-WebGL shader transition, the Bend (a livery
    cloth with a dancetty gilt edge and a sun in splendour behind the
    destination's name). `Shell.show()` now goes through it. The switch
    itself is still the synchronous `swap()`, run on a timer at full
    cover, and a table's first boot happens under the cloth.
    `show(where, id, true)` skips it; `?table=` uses that.
  - **`Herald.proclaim`:** P5-style cries for round and phase changes
    (watching `#round` and `.ph`) and for natural 20s and 1s (watching
    `#chat-body`).
  - **`Herald.burst`:** gilt thrown off every wax seal.
  - **Hall shaders (`13-hall3d.js`):** the banner shader gains weave, gold
    leaf and a counterchange sweep on hover, and there's a new GPU gilt-dust
    system.
  - **Layout:**
    - Cloth screens get a full-field bend, a huge drifting device, a
      vertical tincture name, and titles on ribbons bleeding off the left.
      `#screen .body` now spans the screen with computed padding.
    - Rolls step down a bend.
    - The cloth falls with a swallowtail hem (`16-menu.js` `fall()`).
    - The chat hanging has an embattled edge (CSS mask), the dice are
      lozengy, Roll is a wax seal (`--m-wax`), and the HUD corner names the
      table.
- **Fixed on the way:**
  - `12-combat.css` had two corrupted token lines (`--rule-i:#c9a societal`
    and a full-width digit in `--ink-2`), each rescued only by a duplicate
    declared after it.
  - `.to-hall` had been drawn with no padding since the split, because
    `body.at-table *{padding:0}` outranks a bare class.
  - Every toast `45-papers.js` raised was invisible: it adds `.on`, while
    the CSS only showed `.show`.
  - Vert moved `#2c6b41` → `#2b6940` so Argent on it passes AA.

### 3.14 The table overhauled: the case, the orders, the paper (2026-09-17)

grumkata: *"the toolbox and all its menus where they currently stand it
cannot continue... we also need to redo the options entirely and also redo
how paper is so its actually physically on the table."* Three rebuilds, all
in `STYLE.md`'s vocabulary.

**THE CASE** (`47-hand.js`, `13-table-ui.css`). The plank of kinds and the
tray above it are one piece of furniture now: a rail of the six kinds down
the left (still drawn as real members, still keyed 1-6, still no labels), a
head that names what you are looking in with a find well and a count, the
library's groups as pennons, a scrolling grid of tiles big enough to
recognise with their names under them, and a foot that says what is in your
hand, what it can still be, and what the pointer will do next.

- **It opens ON something** - the first kind, rather than an empty box.
- **It collapses to its foot while you carry something**, because a
  browsing surface standing on the wood you are trying to place on is the
  old problem in a new shape. Dropping brings it back. (This is also what
  fixed placing a piece under it - see table-ui.test.js.)
- `/` goes to the find well; the count never lies; nothing is cut off.
- The table's own corner (`.hud`) stands down while the chest is open -
  they share the bottom band.

**THE ORDERS** (`26-scene-setup.js`). The options panel was a checkbox, a
number spinner and a `<select>` that ran out of its own panel. There are
three controls now and each is an object: **a yes is a seal** (pressing it
stamps wax and throws gilt), **a number is a tally** (a lozenge either
side), **a choice is a row of pennons** (all of them in sight, with what
the chosen one means written under the label). The same three build the
make-a-scene warrant and the token maker, so setting a scene up, running it
and building a counter are the same kind of act. The panel itself is a
writ: Sable, gilt-framed, dagged along the bottom hem.

**THE PAPER** (`45-papers.js`). A record was a panel bolted to the screen
edge. It is two things now, and they are the same record: **the sheet** - a
real `.prop` lying on the wood at your end, which pans, tilts and zooms
with the table and can be shoved about - and **the reading**, which rises
off it on a press (a FLIP from the sheet's own rect) to full size where it
can be written on. Escape, the scrim or the X puts it back down; the other
mark takes it off the table. `01-sheet.css` is scoped to `.tp` rather than
`#tp` so both wear the record's own stylesheet.

**THE TWO ROOMS, BLENDED** (`13-hall3d.js`, `27-table-gl.js`, `00-hall.css`).

- The hall's banner shader is a factory (`Hall.cloth`) and the tavern hangs
  it: the seat banners are real cloth now, with the wind, the weave and the
  gold leaf, lit by the hearth - `tickFire()` pushes the fire's own colour
  into them every frame.
- A seat with no banner of its own wears **your arms** (`Shell.arms()`),
  not a stranger's rolled coat.
- **The grade is shared.** The table has been graded since the tavern
  arrived; the hall had only a vignette. The grain tile is `.m-grain` in
  `20-shell.css` and the hall has its own `#hgrade`/`#hgrain`, aimed at its
  own light and sitting under `#ui` so no title is ever grained.

### 3.15 The real size, the shared table, and Blazon in 3D (2026-09-17)

grumkata: *"everything is too big on the table, a scene takes up most of
the room, same with placing any paper... we should be able to hold an 8
player campaign no problem"*, *"you are treating the table like its a
personal space when really its a shared space between players and gm —
with the final release each user at the table will physically be at the
table"*, and, for the third time, *"stylize the physical 3d environment"*.

**TWO UNITS ARE ONE MILLIMETRE.** The fault behind every scale complaint
was one number: the wood was 2600 units across and modelled as 1.2m, a four-foot tavern table. So a combat mat at 1180 units
was 545mm — 45% of the table — and a character sheet came out 41cm wide.
The table is now what a table for eight actually is: **2.2 metres, 4400
units**, which makes two units exactly one millimetre and lets every size
in the app be stated as the real object:

| Thing | Was | Now |
|---|---|---|
| the wood | 2600 units / 1.2 m | 4400 units / 2.2 m |
| a combat mat | 545 mm, 45% of the table | 590 mm, 27% |
| a character sheet | 415 mm | **A4** — 210 x 297 mm (420 x 594) |
| a counter | 81 mm | 42 mm (a heroic-scale standee) |
| a note | 138 mm | 100 mm |
| a page | 138 x 157 mm | A5 |

`Table3D.MM` is the conversion and `test/table.test.js` holds the sizes.
**The seated camera is measured from the table too** — `EYE_BACK` is
`TABLE_M / 2 + 0.42` and the chairs sit a little further out again. It was
a typed 1.24m, which was a comfortable 0.64m clear of a 1.2m table's edge
and 14cm from a 2.2m one: chin on the wood, inside the ring of chairs.
Two numbers that have to agree and can drift apart is exactly how that
happens, so `TABLE_M` is now stated once, by 23-table3d.js, and read by
the room.
A table saved in the old space is scaled into the new one once, on load
(`state.units`).

**THE TABLE IS SHARED.** `spaceSeats()` used to deal every chair onto a
108-degree arc on the far side and keep the near third for "you". That is
a table with one person at it and an audience opposite. The places go all
the way round now, evenly. A new table still comes with NO chairs — it
must SEAT eight, which is not the same as always SHOWING eight, and a
table nobody has joined ringed with empty furniture is clutter round the
only thing you are looking at. Which
seat is yours is a LOCAL choice (`Shell.seat()`, localStorage) rather
than a property of the table, because the table is the same object for
everyone at it; each client turns up with its own place at the bottom of
its own screen. Your record is laid at your place
(`TableModel.seatSpot()`), turned the way you would read it, and only
YOUR seat flies your arms — eight chairs all wearing one coat was one
player's colours printed eight times.

**BLAZON IN 3D** (`09-blazon3d.js`). Every material in both rooms is
patched through one function, with `onBeforeCompile` so three.js keeps
its own lighting and a Lambert stays a Lambert:

- **BANDED** — the lit result is quantised into a few steps, so the rooms
  read as painted rather than rendered. On a perceptual curve, each band
  sitting at its own middle, mixed back over the original: a straight
  `floor(L*steps)` put everything under 1/steps at black, which in a fire-
  lit box is most of the picture, and tore the walls into hard shapes.
- **RAMPED** — each band is pulled toward a three-colour ramp from the
  tinctures (Sable-blue shadow, Tenné mid, Or light). The texture's own
  hue survives; the two rooms just agree about what colour light is.
- **GILT RIM** — a fresnel edge in Or on anything with a fragment normal,
  which is a drawn outline without a second pass.

Settings are per surface: scenery is banded but never rimmed, pieces are
rimmed but barely tinted (a counter's colour is which side it is on), and
the tabletop gets nine soft bands because it is the one big smooth
surface carrying a shadow — at the room's settings that shadow became a
torn silhouette.

---

### 3.16 The coat, the banner, the profile and Settings (2026-09-18)

grumkata: *"rework the banner/profile system also add basic settings in the
settings system. for custom banners it should be wayyy more customisable."*

**The engine** (`src/js/12-heraldry.js`). The arms record went from ten slots
to sixteen, and everything new has a default that `norm()` supplies — which
is what lets a coat saved before any of this exist draw byte-identically
today (checked in `test/blazon.test.js`).

- **Furs.** Ermine, Ermines, Erminois, Pean, Vair and Potent, as real SVG
  `<pattern>`s rather than approximated colours. A tincture slot now holds a
  named tincture, a fur, or a raw hex.
- **Lines of partition.** Wavy, nebuly, engrailed, invected, indented,
  dancetty and embattled, applied both to the field's division (`line`, on
  the nine divisions that are a cut) and separately to the ordinary's edges
  (`ordLine`, on the nine ordinaries with long straight edges). One
  `line(ax,ay,bx,by,kind,…)` builds them all: everything is done on the
  chord, with `u` along it and `p` across, so a wavy per bend and a wavy per
  fess are the same code. Engrailed and invected are cubics with handles
  standing `4r/3` off the chord — a half-circle to within a rounding error,
  and unlike an arc command it has no sweep flag to get backwards.
- **Charges:** one to six, ranged five ways (as they fall, in pale, in fess,
  in bend, in orle) instead of one to three in fixed places.
- **Bordures:** none, plain, or **compony** — which is the same stroke twice,
  the second one dashed, so the two tinctures alternate round the edge for
  the price of one attribute.
- **Hems:** square, rounded, swallow-tailed, dagged, gonfalon, pennon — and
  the hem is on the record now, so `27-table-gl.js` stopped forcing
  `hem:'swallow'` and the banner behind your chair is the one you cut.
- **`blazonText(A)`** writes the coat out as a sentence. The written blazon
  is the real heraldry and the drawing is one reading of it, so the maker
  says it back under the preview.
- **`liveryOf(A)`** answers the `houseTincture()` TODO that `42-shell.js` has
  been carrying since 3.13 — see `STYLE.md` §7.

**Why furs need a context.** An SVG pattern needs an id; the maker puts
thirty-odd inline swatch `<svg>`s on one page; a duplicate id resolves to
whichever the *document* holds first, at whatever scale that one was built
for. So every drawing calls `ctx(W)`, which mints an id suffix and a tile
size; fills register themselves on it; `defs(ctx)` writes out only the
patterns actually asked for. Callers using no furs pay nothing.

**The maker is a workbench now.** The coat has roughly forty times the number
of forms it had, and one scrolling column of all of them was worse than the
small version. Five benches behind a row of pennons — Field, Ordinary,
Charge, Border, Banner — each pennon carrying a tally of how many of its
choices are off the default; the thing you are making sits beside them the
whole while, drawn twice (the shield and the banner) with the blazon in words
underneath. A choice that cannot apply (a line of partition on a chequy
field) **says so where it would have been**, because an empty space reads as
the app having lost it. The charge bench has a find well; 47 charges is more
than a grid.

**The profile** gained a **style** ("of the Red Marches") and a **motto**,
both optional, both shown in the hall's bottom-left corner only once written,
both saving as you type.

**One real bug found on the way.** The cloth behind the maker was the field's
own tincture, with one hand-written exception for Sable. That held only while
a field could only be one of ten known colours. A field of Ermine made the
whole screen cream, with cream text on it. `cloth()` in `16-menu.js` now
dresses it in the livery — which is a colour by construction — with a ceiling
on how light it is allowed to be.

**Settings** (new `src/js/07-options.js`, loaded before `09-blazon3d.js`).
Three switches, each describing itself so the screen draws from the store:
**Stylised 3D** (off / softened / full), **Film grade** (the grade and grain,
both halves), **Motion** (full / calm). Plus which of the eight chairs is
yours, a copy of everything as a file, and a two-press *forget everything*
that only removes keys this app wrote. No dropdown, no checkbox, no radio —
the same rule the orders panel keeps.

Two traps avoided: `calm` goes on `<html>`, because `tools/scope-css.js`
merges anything starting `body` into the sheet's own scope and `body.calm`
would have shipped as `body.at-hall.calm`; and the cel setting cannot
recompile shaders, so `Blazon3D.strength()` holds each patched material's
`uCelAmt` and scales it by what that material was *built* with.

**Verified:** new `test/blazon.test.js`, 29 checks, in `npm test`. Most of it
is the same shape of check repeated — every option in a list must draw
differently from every other option in that list — because an unwired line,
hem or arrangement silently falls through to the default and nobody compares
a nebuly per pale with an engrailed one side by side.

---

### 3.17 Smoothness: the walk into a table, and the loading screen (2026-09-18)

grumkata: *"make the loading screens smoother and transitions smoother as
sometimes they are laggy especially going from menu to table also add more
transitions and animations to make ui and menus more lively."*

**Measured before touched, and the first measurement was wrong.** A CPU
profile of the menu→table beat under the browser tests put 16.6 of 18.7
seconds in `(program)` with `getProgramInfoLog` beneath it — shader linking.
That is true of the software renderer the tests use, which compiles shaders
on the CPU, and it is *not* true of a real machine. Re-measured through
Electron against this machine's actual GPU (AMD, D3D11), the same flag was
inside run-to-run noise. Two conclusions, both kept in the code as comments:
**the browser tests cannot measure this**, and the fix had to be found again.

**What the real numbers said.** Opening a table was ~1.9s with two freezes,
the worst ~640ms. Of that, the JS was ~320ms and all of it was the same three
calls: `Table3D.mount`, `TableGL.build`, `TableGL.warm` — the viewport, sixty
thousand triangles of tavern, and its shaders. **None of those read
`TableModel`**: the room is the same room whichever table you open.

**So the room is raised before anyone asks for one.** `TableBoot.warm()`
(28-table-boot.js) does the three heavy calls; 42-shell.js asks for it on an
idle callback 1.4s after the hall settles. Walking into a table is then just
`TableModel.load` + `TableProps.mount` + `Toolbox.mount` — about a
millisecond and a half.

| walking into a table | before | after |
|---|---|---|
| openTable resolves | 1931 / 1916 ms | 1471 / 1466 ms |
| stutters over 60ms | 2 | 1 |
| total time not drawing | 1024 / 729 ms | 238 / 215 ms |
| worst single freeze | 647 / 638 ms | 238 / 215 ms |

The hall pays nothing for it: 157 frames in 2.6s, zero stutters, worst frame
18ms, with the room going up behind it.

**What did NOT work, recorded so it is not tried again.** The first attempt
ran the boot a piece per frame under the cloth, reasoning that the browser
cannot draw during a synchronous call. On the real GPU it was **worse** —
981ms frozen against 449ms, five stutters instead of two — because each piece
still blocked and the frames between them only added waiting. Moving work is
worth more than slicing it.

**The cover now waits for the work.** `Herald.wipe`'s hold was a flat 300ms,
so when `mid` took longer the cloth had already been told to lift and
uncovered onto a half-built room. `mid` may now return a promise; the cover
holds for at least the hold and at most a 9s ceiling. `swap()` returns one,
and fits the camera *while still covered*.

**`Blazon3D.tune()`** turns three.js's `checkShaderErrors` off, which stops
each `linkProgram` being dragged back onto the watched frame by the
`getProgramInfoLog` on the next line. It measured as noise on this GPU and
matters where linking is slow; because the cost is that a broken shader
fails silently, it is a switch — `monarchy.shaderlog` in localStorage or
`?shaderlog` on the URL brings the checks back.

**The loading screen.** Its marker counted *files*, so every script was worth
the same — and 00-three.js is a thousand times 29-role.js. The bar ticked
evenly and then sat still for two seconds, which is the exact shape of a
hang. It is weighted by **bytes parsed** now, so its speed matches the pause:
the steps run 0.2% → 14.4% → ... → 59.6% → 76.3% where the big packs are. It
also gained the one thing that can move while the main thread is blocked — a
gilt sweep on `transform` alone, which the compositor keeps drawing through
the whole parse — and it lifts like the Bend's cloth instead of just fading.

**And more life in the menus.** Settings blocks and their rows deal in, the
maker's pennons deal and its bench turns when you step to another one, the
coat pops in, and swatches, chips, pennons and roll rows lift under the
pointer. All of it is transform and opacity only, and all of it is gated on
`#screenbody.fresh` — a class 16-menu.js sets when a screen is genuinely
raised and leaves off when it merely repaints, without which the whole bench
would fly in again every time you pressed a tincture. Settings → Motion →
Calm switches the lot off.

**Verified:** new `test/smooth.test.js`, 16 checks, in `npm test` — including
that the camera still fits and seats identically, since raising the room
early means `fitTable()` now runs against a `display:none` viewport, which is
the exact shape of the bug that has broken this camera twice.

---

### 3.18 Undoing 3.17: what that change actually cost (2026-09-18)

grumkata, on 3.17 as shipped: *"its even laggier and less smooth and animated
then before the transition when entering a table is laggy and basically
skipped because of the lag same for most transitions."*

He was right, and 3.17's measurements were not wrong so much as **aimed at
the wrong case**. Every number in that entry was taken on a table opened
AFTER the room had been raised. Nobody opens a table that way. You load the
app, you take a banner down, you pick a table — and on a slower machine that
is over before the room has gone up. **The cold path was never measured**,
and the cold path is what everybody actually walks.

Four things in 3.17 made it worse, all of them on that path:

1. **`boot()` called `warm()`**, so linking every shader in the room and
   drawing one frame of it — the single most expensive thing in the app — was
   added to the click, a bill the old code never charged. `raiseRoom(false)`
   now leaves the compiling for the idle path.
2. **`swap()` fitted the camera inside the Bend's `mid`**, where the cover's
   animation is stopped for the whole of it. `fitTable()` walks every prop on
   the wood: 152ms of frozen cloth. Back to a timeout.
3. **`requestIdleCallback(warm, { timeout: 2600 })`** was the wrong tool.
   That timeout does not mean "when idle, or give up", it means "fire ANYWAY
   after this long" — so on a machine that is never idle it is a guaranteed
   300ms block dropped at an arbitrary moment, and the arbitrary moment was
   often the transition it existed to protect. It now waits for two frames
   that actually came in under 60ms with nothing on screen and the pointer
   off the banners, and settles for whatever is going after four seconds of
   WALL TIME — the first version of that fallback counted frames, which on a
   machine drawing one every 200ms is forty-eight seconds, so the machines
   that most needed it were the only ones that never got it.
4. **The room's render loop ran in the hall.** `TableGL.build()` ends with
   `requestAnimationFrame(frame)`, so from a second after launch the app was
   measuring and drawing a tavern nobody could see, in the frames the hall's
   own screens needed. One `at-table` check at the top of `frame()`; measured
   after: zero draws in three seconds of standing in the hall.

**And the thing 3.17 should have found and did not.** The Bend's cover was
the WebGL bend, drawn a frame at a time from `requestAnimationFrame` — which
runs on the main thread. A cover whose whole job is to hide the busiest
moment in the app cannot be driven by the thread that is busy: it freezes for
as long as the work takes and then arrives at its end state in one jump,
because every frame it owed came due at once. That is not a slow animation,
it is a **cut**, which is exactly the word grumkata used. The cover is the CSS
veil now (`.hr-veil`, one `transform` keyframe, `will-change: transform`) on
every machine, not just ones without WebGL. The shader stays for the Cry,
which fires when nothing else is happening.

**A third measurement failure, recorded because it is the pattern.** An
attempt to prove the CSS veil composited — block the main thread for 400ms,
count offscreen `paint` events and their distinct pixels — reported it
frozen. That is an artifact: Electron's offscreen rendering produces frames
through the main thread, so it cannot show compositor-only animation by
construction. The software renderer lied about shader linking in 3.17, the
warm-path-only benchmark lied about the transition, and this lied about
compositing. **Three for three.** The lesson is not "measure more", it is
that a harness has to be shown capable of detecting the thing before its
answer means anything.

**Settings → Motion gained Swift**, between Full and Calm: the same
transitions at about 55% of their length. That is not a workaround dressed as
a feature — a shorter animation has fewer frames to drop, so on a machine
that drops frames it is far likelier to play the whole way through instead of
freezing and jumping. It scales in one place: `Options.pace()` for the
JavaScript durations (the Bend's three phases, the hall's cloth), and a
re-declaration of the `--t-*` tokens under `html.swift` for every CSS
transition in the app at once.

---

### 3.19 The cover is not part of what it covers (2026-09-18)

grumkata, after two failed attempts at this: *"do you even know what a
transition is its the loading screen between opening a table and getting to
the table its laggy because your putting them on the same layer so when the
table lags the loading screen lags even though the reason it exsists is to
mask the lag that is the problem remove the motion setteings and the player
chair settinsg and actually fix the loading screens and transitions."*

That is the bug, stated better than any measurement in 3.17 or 3.18 managed.
**A loading screen that shares a rendering fate with the thing it is loading
is not a loading screen. It is a second symptom.** Both earlier attempts
treated the work — move it earlier, slice it smaller, shorten the animation
— and none of them touched the actual fault, which is that the cover was
being drawn by the same blocked main thread as the table underneath it.

**Three things fix it, and they are all about separation.**

1. **The cover gets its own compositor layer, with a wall round it.**
   `#herald { contain: layout paint style; will-change: transform; }`.
   `paint` containment means nothing outside can invalidate what is inside —
   so the table building itself underneath, adding props, resizing canvases
   and rasterising sixty thousand triangles, cannot dirty one pixel of the
   cloth on top. `will-change` asks for the layer outright instead of hoping
   a heuristic offers one. The boot screen gets the same treatment.
2. **The cover is PAINTED before the work starts.** Adding a class does not
   put anything on screen; the pixels change at the next frame, and `mid`
   blocks the thread that would have drawn it. So `add('carded')` followed by
   `mid()` on the next line meant the card was never once painted before the
   freeze — the loading screen arrived at the END of the load. There are two
   animation frames between them now (`rafTwice`): one for style and layout,
   one that is actually composited.
3. **Something on it keeps moving.** A gilt sweep under the title card, on
   `transform` alone, which the compositor runs on its own thread and keeps
   running while the main thread is blocked solid. Same trick as the boot
   screen's bar. On this side of a cover, "waiting" and "dead" are the only
   two things a player can tell apart.

**Removed, at his instruction:** the Motion setting (Full / Swift / Calm) and
the seat picker. The Motion setting was an apology dressed as a feature — a
speed dial on a broken animation, asking the player to manage a problem that
was the app's to solve. `prefers-reduced-motion` is still honoured, because
that is a preference the player has already expressed to their own system.
The seat is still `Shell.seat()`; it simply has no screen.

**And the measurement discipline that was missing the whole time.** Every
wrong turn on this problem came from a harness that could only ever say yes:

| harness | what it claimed | why it was incapable |
|---|---|---|
| software renderer (3.17) | 16.6s of 18.7 in shader linking | compiles shaders on the CPU; cannot defer anything |
| the benchmark (3.17) | 3× smoother | only ever opened a table that was already warm |
| offscreen Electron (3.18) | the cover is frozen | produces frames *through* the main thread |
| JPEG frame hashing (3.19) | the cover keeps moving | counted re-encoding noise as movement; "passed" with no cover on screen |

`test/smooth.test.js` therefore ends with a test that **carries its own
control**. It blocks the main thread for 600ms twice — once with nothing
composited on screen, once with the cover up — and reads lossless frames from
the browser compositor, which keeps producing them when the page cannot. The
control must FREEZE (1 distinct frame) or the positive result is not allowed
to pass. Measured: control 1 frame, cover 9. The film grade is switched off
for both halves, because the hall's grain is itself a composited animation
and would otherwise be the thing reported as movement.

A harness is worth nothing until it has been shown able to report the
failure. That rule is now at the top of that file.

---

### 3.20 Multiplayer: eleven people at one table (2026-09-18)

grumkata: *"each table can support up to 11 people 10 players 1 gm […] its
important the order stays the exact same on everyones stream […] we will be
using firebase for this not peer to peer […] tables are only active when a gm
instantiates one by hosting it which is diffrent then opening a table"*.

Full reference in **`MULTIPLAYER.md`**; what follows is why it is shaped this
way.

**Six new files.** `04-ring.js` (who sits where), `05-net.js` (the wire),
`06-session.js` (hosting, joining, presence, chat, sheets), `57-chat-net.js`
(the dock when other people are in it), `58-sheets-net.js` (the sheets
somebody pulled onto the wood), plus Firebase's three compat SDKs inlined
from `node_modules` the way three.js is — 337KB against a 4.5MB page, and no
CDN tag, because a table that cannot be hosted on a venue's guest wifi until
gstatic answers is not hosted.

**The seating is the whole trick.** Two requirements that look contradictory:
everyone must be at their own near seat, and everyone must agree on the
order. They resolve because what has to agree is not *where* anyone is in
degrees but *who is beside whom and which way round* — a CYCLIC order, and a
cyclic order survives rotation exactly. One global ring, rotated per client.
No angle is ever stored: storing one would mean a single client deciding
where everybody sits, which is a race every time two people join at once.

**Presence and place are different facts with different lifetimes**, and
conflating them was the one real bug the tests caught. `who` is removed the
instant a socket dies; if the place went with it, a phone going through a
tunnel would reshuffle the table for all eleven people. So arrival numbers
live in a ledger that is never cleaned up, and a reconnect reads it. There is
a test for exactly that scenario.

**A roll is markup from a machine this one does not control.** Chat text is
escaped; a roll is the rendered line, sent whole, because re-deriving it per
client would mean a second renderer to keep in step with the first. So it is
filtered down to the six tags and six class names `39-dice.js`'s own line is
built from, every attribute dropped. Seven attacks in the test.

**Sheets appear everywhere rather than in a panel.** The tempting design is a
"sheets at this table" list beside your own; the right one widens
`Characters.roster()`, which is where the chest, the counters, the papers and
the token maker all get their list. None of them learned a new concept.
Pulling a sheet to the table IS placing the character — no share button.

**Two transports, one shape.** Firebase RTDB (chosen over Firestore because
presence is the hard part and `onDisconnect` is a thing RTDB has), and a
local one over `localStorage` + `BroadcastChannel`. The local one is not a
toy: it is how this is developed without credentials and it is what makes the
multiplayer path testable by `npm test`.

**No credentials ship.** The project is the user's — Settings → Multiplayer
takes the config, parsed rather than `eval`ed, accepting the unquoted-key
form the Firebase console actually prints. `MULTIPLAYER.md` carries the
database rules, which are what make "each client writes only its own node" a
guarantee rather than a convention.

**Verified:** new `test/session.test.js`, 25 checks, in `npm test`. Eleven
genuinely independent clients — each its own global object with its own copy
of the modules, wired to one shared tree — because a claim about what several
machines agree on cannot be tested on one. An earlier attempt using three
browser pages was wrong and said so: pages in one profile share localStorage,
so they are one client with three windows.

**Not built:** the wood itself is still per-client. Everyone sees the same
people, chat and sheets; they do not yet see the same board. That is the next
piece and it is the big one. Also no kick, no host transfer, and sheet writes
are whole-record last-wins.

---

### 3.21 One menu, and nothing else on the walls (2026-09-18)

grumkata: *"hosting should be a thing you can do in the table not on opening
thats so fucking dumb"*, *"the table needs a real menu not random buttons all
over the place"*, *"that stupid page back button in the top left instead make
it an escape key and menu button in the top left that THEN brings you to
menu"*, and *"remove all the extrenous explanation text its unproffesional"*.

**Three complaints, one fault.** The table had a Back pennon pinned in one
corner, Theme and Fit in another, and hosting was a decision you had to make
in the hall before you had ever seen the wood. Every one of those was put
where it was because that is where there was room, not because that is where
anybody would look — and a person looks in one place.

**New `59-table-menu.js`.** A mark in the top left, Escape opens it, Escape
closes it. In it: host / stop hosting, leave a game you joined, back to the
hall, fit, light or dark. Hosting from here rather than from the hall's roll,
which is what grumkata asked for and is also simply correct — it is a
decision about a table you are looking at.

The Escape binding is on `window` in the bubble phase, deliberately last:
23-table3d.js steps out of a field, then a lock, then a selection;
45-papers.js puts a record down; 25-toolbox.js shuts the chest; 47-hand.js
drops what you are carrying. Each of those is what Escape should mean first.
The menu is what Escape means when it would otherwise have meant nothing.
Every element lookup in that guard is null-checked, because most of them are
built lazily — the first version threw on `#tp` before a record had ever been
opened and took the key out entirely.

**The prose went.** Seven `lede` paragraphs, the settings switches'
descriptions, the flag maker's "why this row is unavailable" notes, the seal
captions' sub-lines, and the HUD's keyboard manual printed across the top of
the table for the whole of every session. The rule applied: **keep state,
drop instruction.** A count, a word, a name, what went wrong — those stay. A
sentence explaining what a button does is a design problem the sentence was
hiding, and it is read once and then re-read four hundred times.

One test had to change rather than be fixed: `blazon.test.js` asserted that a
choice which cannot apply *says so where it would have been*. It now asserts
the row is not there at all, which is the better behaviour and the one that
was asked for.

**Also:** the Firebase project is live and anonymous auth is on — confirmed
by signing in and getting a uid. Writes still answer `PERMISSION_DENIED`,
because the Realtime Database rules in `MULTIPLAYER.md` have not been pasted
yet. `05-net.js` and the table menu both name that failure in words rather
than going quiet: "The database refused it — its rules have not been set".

---

### 3.22 Nine things wrong at somebody else's table (2026-09-24, v1.0.1)

grumkata's list, from the first real multiplayer session. Each item, what it
actually was, and where the fix lives:

1. **A player had the GM's chest, bin and hands.** `mayUseBox()` read
   `_sessionRole`, a binding from a file deleted with the previous generation,
   so the role was always empty and empty meant "solo". It reads
   `Session.role` now (`TableModel.role()`), `25-toolbox.js` re-gates on every
   session event, and a new `TableModel.mayTouch(t)` is checked wherever a hand
   meets a piece: the drag, Delete/arrows/`[` `]`, Alt+wheel, raising, writing
   on a note, running a scene, a counter's rename/side/off controls, and
   `32-combat-app.js`'s `canControl` (which read `ROLE`, 'gm' everywhere).
   Players touch nothing; `playerMayTouch()` is where an exception goes.
2. **Dice only fell for the one who rolled.** A thrown roll now carries its
   results (`Session.talk(..., { dice })`), and `57-chat-net.js` stages the
   same throw on every other table. Also: every player's roll was signed "GM".
3. **Pictures stood up in the chair view.** `t3-art` joined `STANDS_ALONE` in
   `23-table3d.js`: a picture lies flat like the scenes do.
4. **Paper looked broken.** A page was a drawing at 70% of its own box, inside
   the box's extruded edges and rectangular shadow. The drawing is A5 now
   (`46-figures.js`) and fills its box; pages and notes have no edges or card
   shadow; a note is a 100mm square rather than a strip; the reading scales a
   900-wide record to fit instead of scrolling sideways (`45-papers.js`).
5. **Banners and standees in the fireplace.** Two faults in `27-table-gl.js`.
   Every seat was turned `a` about Y where facing the middle needs `-a`, right
   only at 0 and 180 — side seats faced the wall. And a banner hung a fixed
   0.48m behind its chair: at the far seat that is 26cm inside the chimney
   breast. The room's own plan is boxed now (`findBlockers`) and a banner or
   standee is brought in along its bearing until clear (`reach`).
6. **Pictures did not reach other players.** The worst of the nine: joining
   answered before the player had walked into the table, so the GM's board
   landed in the player's LAST table — and then loading the right one fired the
   change hook, and `sendNow` sent a null for every piece it no longer saw. A
   player arriving deleted the GM's board. `60-board-net.js` now names the
   local table it mirrors into and never applies or sends from another; loading
   is never sent; and a player's table is `guest-<WORD>`, emptied on arrival and
   on leaving. See `MULTIPLAYER.md`.
7. **Leaving left a player sitting at the table.** Leave walks a player back
   to the hall, and so does the GM closing it (`59-table-menu.js`).
8. **Settings threw you out to the hall.** It opens on the menu's own card now,
   drawn from `07-options.js` the same way the hall draws it.
9. **Scrolling.** ArrowUp/ArrowDown are the wheel (when no piece of yours is
   selected — then they still nudge it). The zoom glides toward a goal instead
   of jumping 10% per click, and a trackpad's small deltas count as fractions
   of a click. Leaning back into the chair is one move that always finishes —
   `lean` is only ever 0 or 1 at rest — and a step the other way turns it round.

**Tests:** `session.test.js` gained a client that loads tables
(`LoadingModel`) and eleven checks for the join ordering, the guest table and
the dice filter; against the old `60-board-net.js` nine of them fail, including
"loading it deletes nothing from the table". `handling.test.js` waits for the
zoom glide to land rather than a fixed 400ms.

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

1. **~~Dead monkey-patch in `01-fx-polish.js`~~ — RESOLVED 2026-08-21.** Deleted (plan task P0-4), replaced with a comment recording where the real fix belongs. Original note follows. **Dead monkey-patch in `01-fx-polish.js`**: near the end of that file,
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
3. **~~Turn counter lives apart from combat tracker~~ — RESOLVED 2026-07-18.**
   `adjTurn` / `resetTurn` / `resetAllTurns` / `clearBattlefield` used to be
   in `13-turn-and-init.js`, not the combat file, purely because of where
   they fell in the original monolith split. That file is gone now (2.1);
   these moved into `07-combat-window.js` alongside the rest of combat, and
   turn count folds directly into `serializeBattlefield`/`restoreBattlefield`
   instead of being monkey-patched in from elsewhere. See 3.6.
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
6. **~~`#fog-overlay` no longer covers the true full screen once scaled~~
   — RESOLVED 2026-07-18.** Combat (including `#fog-overlay`) is its own
   table window now (3.6), and the overlay itself was deliberately placed
   as a sibling of the table windows rather than nested inside the Combat
   window's scaled wrapper, specifically so a `transform` on that wrapper
   can't turn it into `#fog-overlay`'s containing block. It covers the
   real viewport again.
7. **NSIS Windows installer target needs Wine to cross-build from
   Linux/macOS** (verified: the `portable` target does NOT need Wine and
   built/ran successfully from this project's Linux dev environment; the
   `nsis` target failed with `spawn wine ENOENT` under the same
   conditions). Building either target natively on Windows needs neither.
   If Wine is ever installed for full installer builds from Linux, no
   config changes are needed — `npm run dist` already requests both
   targets.
8. **~~Second dead monkey-patch~~ — RESOLVED 2026-08-21.** Deleted alongside #1 (plan task P0-4); same comment treatment. Original note follows. **Second dead monkey-patch, same shape as #1, in the HP-danger-flash
   code (`01-fx-polish.js`)**: `const _av = window.adjVal; if (_av)
   window.adjVal = ...`. `01-fx-polish.js` loads before `adjVal` is
   defined (now in `07-combat-window.js`; previously in
   `03-sheet-basics.js` — same problem either way), so `_av` is always
   `undefined` and this patch silently never applies, exactly like #1.
   Pre-existing in the original monolith, **not** introduced by the
   2026-07-18 combat/multiplayer split — that pass touched the two lines
   right next to it (fixing references to a `hp-cur` element that no
   longer exists) but deliberately left this dead pattern alone, matching
   how #1 was already handled. The feature still mostly works: `checkHpDanger`
   is also attached as a real `input`-event listener on `c-hp-cur`/
   `c-hp-max` (unaffected by this), so typing a new value triggers it
   correctly — only programmatic changes via `adjVal()` (i.e. the +/−
   button clicks) skip the check, since setting `.value` in JS doesn't
   fire a native `input` event.

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
   in `release/`. (`node build.js` then `npm start` is fine for a quick
   check — but NOT double-clicking the html, which cannot load its
   textures over `file://`; see 2.3.)
4. **When splitting or moving code, do it mechanically first.** Cut/paste
   before rewrite. If reorganizing something, land it in its new location
   unchanged, verify it still works, then rewrite — don't do both at once.
5. **Do not fight the CSS scoping.** Each sheet is confined at build time
   to `body.at-hall` or `body.at-table` (2.2). If a rule needs to reach
   both halves it belongs in `20-shell.css`, which is the only unscoped
   one — not in a more specific selector somewhere else.
6. **New JS files**: decide where they sit by what they depend on (goes
   after) and what depends on them (goes before). Update the load-order
   list in this doc (2.1) when you add one.
7. **Bump the `.monarch` export `version` number** if you change what
   `serializeSheet()` outputs, and handle old versions gracefully on
   import rather than breaking existing players' saves.
8. **Re-baked a model pack? Run `python tools/bake-textures.py`.** The bake
   scripts write textures back into the JavaScript as data URIs; that tool
   pulls them out to `src/assets/tex/` again. Forgetting is not fatal —
   `build.js` reports every picture it could not find in the manifest and
   leaves it inline — but the build quietly gets megabytes fatter. The
   vertex packing needs no such step; `build.js` does it every time.

   [superseded] **`07-combat-window.js`
   is the active overhaul target for combat mechanics/UI.** Changes here
   are expected to be more invasive than elsewhere — fine to break
   internal structure as long as external contracts (serialized
   battlefield shape used by session sync, see 3.7) are either kept
   compatible or updated on both ends together. This file no longer also
   holds whole-character serialization (that moved to `08-saves-io.js`,
   see 3.8) — a mechanics rewrite here now only touches combat state, not
   the entire save/load system.
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
13. **Colour, type and shape come from Blazon's `--m-*` tokens in
    `20-shell.css`, not from new hex literals.** (This rule used to name
    `05-shell.css`'s `--table-*` tokens; that file went with the previous
    generation.) Pick the surface first (Sable chrome, Cloth, or Vellum),
    keep to the rule of tincture, give anything hoverable or chosen the
    counterchange, and use no `border-radius`. A tincture changed in
    `12-heraldry.js` must change in `20-shell.css` too, or
    `test/tincture.test.js` fails. `STYLE.md` §8 is the checklist.
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
| 2026-09-24 | **v1.0.1: nine things wrong at somebody else's table** (3.22). Players no longer get the chest, the bin or anyone's pieces (`TableModel.mayTouch`); dice land on every table; pictures lie flat; pages and notes are paper; banners and standees keep clear of the room, and side seats face the table; a joining player no longer deletes the GM's board (the board is bound to a guest table); leaving goes back to the hall; Settings opens at the table; arrows scroll, the zoom glides, and the chair never stops halfway. `package.json` 1.0.0 → 1.0.1. |
| 2026-09-18 | **One menu, and nothing else on the walls** (3.21). grumkata: hosting belongs *in* the table not at the point of opening one; the table needs *"a real menu not random buttons all over the place"*, reached by Escape or a mark in the top left; and *"remove all the extrenous explanation text its unproffesional"*.<br>- **New `59-table-menu.js`:** one menu, Escape or the mark, holding host / stop hosting / leave / back to the hall / fit / light or dark. The Back pennon, Theme and Fit are gone from the corners, and the Host door is gone from the hall's roll.<br>- The Escape binding sits last on purpose — leaving a field, a lock, a selection, a record, the chest and a carried piece all get Escape first; the menu is what it means when it would otherwise mean nothing. Every lookup in that guard is null-checked, which the first version was not, and it took the key out entirely.<br>- **The prose went:** seven lede paragraphs, the settings descriptions, the maker's "why this is unavailable" notes, the seal sub-captions, and the keyboard manual printed across the top of the table all session. Rule applied: keep state, drop instruction.<br>- A test changed rather than being fixed: a choice that cannot apply is now simply absent instead of explaining itself. And `smooth.test.js`'s cover check was re-based on its own control rather than an absolute frame count, which was flaky at 7 against a threshold of 8.<br>- **Firebase:** anonymous auth confirmed working against the real project; writes still return `PERMISSION_DENIED` until the database rules are pasted, and the app now says exactly that instead of failing quietly. |
| 2026-09-18 | **Multiplayer: eleven people at one table** (3.20, and the new `MULTIPLAYER.md`).<br>- **Hosting is not opening.** A table is a local save until a GM hosts it, at which point it goes on the wire under a five-character word said out loud (no letters that sound like other letters). It is live only while its GM is; when they go, everyone stands down and what is left is a save.<br>- **The seating guarantee.** Everyone is at their own near seat AND everyone agrees on the order — possible because what must agree is the CYCLIC order, which survives rotation. One global ring, rotated per client, evenly spaced: two face each other, three make a triangle, eleven sit 32.7° apart. The GM is in the ring like anybody else.<br>- **Presence ≠ place.** Arrival numbers live in a ledger that is never erased, so a dropped connection does not reshuffle the table. This was a real bug the tests caught.<br>- **Firebase RTDB** (for `onDisconnect`), inlined from node_modules rather than a CDN, with a local `localStorage`+`BroadcastChannel` transport that makes the whole path testable without credentials. No credentials ship; Settings → Multiplayer takes the config, parsed not `eval`ed.<br>- **Chat and rolls** over the wire, with a scrubber — a roll is markup from a machine you do not control, so only the tags and classes the dice renderer uses survive. The dice themselves are not sent; the numbers are.<br>- **Sheets:** any number, from anyone, and pulling one there is simply placing the character. `Characters.roster()` widened so the chest, counters, papers and token maker all got them for nothing.<br>- New `test/session.test.js` (25 checks) in `npm test`, driving eleven genuinely independent clients against one shared tree.<br>- **Not built:** the board itself is still per-client. |
| 2026-09-18 | **The cover is not part of what it covers** (3.19). grumkata, after two failed attempts: the loading screen *"is laggy because your putting them on the same layer so when the table lags the loading screen lags even though the reason it exsists is to mask the lag"*. Exactly right, and neither earlier attempt had touched it — both treated the work instead of the coupling.<br>- **`#herald` now has `contain: layout paint style` and its own compositor layer**, so the table building underneath cannot dirty a pixel of the cloth on top. Same for the boot screen.<br>- **The cover is painted before the work begins** — two animation frames between raising the card and calling `mid()`, because adding a class paints nothing and `mid` blocks the thread that would have drawn it. The loading screen used to arrive at the end of the load.<br>- **A gilt sweep under the title card**, on `transform` alone, so something is visibly alive while the thread is dead.<br>- **Removed at his instruction:** the Motion setting and the seat picker. A speed dial on a broken animation is an apology, not a fix; `prefers-reduced-motion` is still honoured.<br>- **The test now carries its own control:** block the thread 600ms with and without the cover, read lossless frames from the browser compositor, and refuse to pass unless the control froze. Measured 1 frame against 9. Four harnesses in a row had told me what I wanted to hear — a software renderer, a warm-only benchmark, an offscreen window, and JPEG noise. |
| 2026-09-18 | **Undoing 3.17: what that change actually cost** (3.18). grumkata: 3.17 shipped *"even laggier and less smooth"*, with the table transition *"basically skipped"*. He was right — every number in 3.17 was taken on a table opened AFTER the room was raised, and **nobody opens a table that way**. On the cold path the change had added the shader compile to the click, moved a 152ms `fitTable()` inside the Bend's frozen `mid`, scheduled the pre-warm with a `requestIdleCallback` timeout that fires *anyway* (often mid-transition), and left the tavern's render loop running behind the hall. All four undone or fixed; the room now draws zero times while you are in the hall.<br>- **And the thing 3.17 missed:** the cover was a WebGL bend driven by `requestAnimationFrame` — i.e. by the main thread, the one thing guaranteed to be blocked at the moment a cover exists to hide. It is the CSS veil now (one `transform` keyframe, `will-change`), on every machine. An animation that freezes and then arrives is a cut, not a slow animation.<br>- **Settings → Motion gained Swift**, between Full and Calm: the same transitions at ~55% length, scaled from one number (`Options.pace()` plus the `--t-*` tokens under `html.swift`). Fewer frames to drop is fewer frames to miss.<br>- **Third measurement failure in a row, recorded as a pattern:** the software renderer lied about shader linking, the warm-only benchmark lied about the transition, and offscreen Electron lied about compositing (it produces frames through the main thread, so it cannot detect compositor animation at all). A harness has to be shown capable of detecting the thing before its answer means anything. |
| 2026-09-18 | **Smoothness: the walk into a table, and the loading screen** (3.17).<br>- **Measured first, and the first measurement lied.** A profile under the browser tests blamed shader linking (16.6s of 18.7 in `(program)`); re-measured through Electron on the real GPU that flag was inside noise. Both facts are now comments in the code — the software renderer cannot measure this.<br>- **The room is raised before anyone asks for a table.** `Table3D.mount` + `TableGL.build` + `TableGL.warm` do not read `TableModel`, so 42-shell.js asks for them on an idle callback while you are still in the hall. Opening a table is then ~1.5ms of work: **worst freeze 640ms → 225ms, total not-drawing 870ms → 225ms**, with the hall still at 60fps and zero stutters while it happens.<br>- **What did not work, kept in the file so it is not retried:** running the boot a piece per frame was *worse* on real hardware (981ms frozen vs 449ms). Moving work beats slicing it.<br>- **The Bend's cover waits for the work** instead of a flat 300ms, so it no longer uncovers a half-built room; the camera is fitted while still covered.<br>- **The loading bar is weighted by bytes parsed**, not by files counted, so its speed matches the pause instead of ticking evenly and then freezing; it gained a compositor-only gilt sweep that keeps moving through the parse, and it lifts like the Bend rather than fading.<br>- **More life in the menus:** settings blocks and rows deal in, the maker's bench turns, swatches and pennons lift — transform and opacity only, gated on `#screenbody.fresh` so nothing re-animates on a repaint, and all of it off under Motion → Calm.<br>- New `test/smooth.test.js` (16 checks) in `npm test`, including that the camera still fits and seats identically now that `fitTable()` first runs against a hidden viewport. |
| 2026-09-18 | **The coat, the banner, the profile and Settings** (3.16).<br>- **The arms record went from 10 slots to 16:** six **furs** as real SVG patterns, eight **lines of partition** on the field's division *and* separately on the ordinary's edges, one to six charges ranged five ways, a **compony** bordure, and six cuts of **hem** — which `27-table-gl.js` now takes off the record instead of forcing `swallow`. `norm()` supplies every new default, so a coat saved before any of this draws byte-identically.<br>- **`liveryOf()` closes the `houseTincture()` TODO** left open since 3.13, and the maker has an explicit livery slot that outranks it.<br>- **`blazonText()`** writes the coat out as a sentence under the preview.<br>- **The maker is a workbench:** five benches behind tallied pennons, the shield and the banner drawn side by side, a find well for the 47 charges, and a choice that cannot apply says so where it would have been.<br>- **The profile** gained a style and a motto, shown in the hall's corner once written.<br>- **Settings** (new `07-options.js`): stylised 3D off/softened/full, film grade, motion full/calm, which chair is yours, a copy of everything, and a two-press forget. No dropdown or checkbox anywhere.<br>- **Bug found on the way:** the cloth behind the maker was the field's raw tincture, so a field of Ermine made the screen cream with cream text on it; it is the livery with a lightness ceiling now.<br>- New `test/blazon.test.js` (29 checks) in `npm test`. |
| 2026-09-17 | **The real size, the shared table, and Blazon in 3D** (3.15).<br>- **Scale:** the wood is 4400 units for a 2.2m table, so two units are one millimetre and every size is the real object — a combat mat is 27% of the table instead of 45%, a character sheet is A4, a counter is 42mm. Old tables are migrated on load.<br>- **Shared:** seats go all the way round (a new table still starts with none), which place is yours is a local choice, your record lies at your place turned the way you read it, and only your own seat flies your arms.<br>- **3D:** new `09-blazon3d.js` patches every material in both rooms — banded light on a perceptual curve, a three-colour tincture ramp, and a gilt fresnel rim — so the tavern and the hall are drawn the way the UI is.<br>- 5 new checks in `test/table.test.js`; full suite green. |
| 2026-09-17 | **The table overhauled: the case, the orders, the paper, and the two rooms blended** (3.14).<br>- **The case:** the toolbox's plank and tray became one piece of furniture - kind rail, head with find and count, group pennons, a grid of tiles with names, and a foot that says what is in your hand. It opens on a kind and collapses to its foot while you carry something, which is also what fixed placing a piece under it.<br>- **The orders:** no `<select>`, no checkbox, no spinner anywhere - a yes is a wax seal, a number is a tally between two lozenges, a choice is a row of pennons. The same three controls build the make-a-scene warrant and the token maker; the panel is a dagged writ.<br>- **The paper:** a record is a real prop lying on the wood that rises to a reading on a press (FLIP from its own rect) and goes back down where it came from. `01-sheet.css` is now scoped to `.tp`, so the sheet and the reading share it.<br>- **The 3D:** `Hall.cloth` is a factory and the tavern's seat banners are the hall's own cloth, lit by the hearth; a seat with no banner wears your arms; and the hall gained the table's film grade (shared grain tile).<br>- **New `test/case.test.js`** (16 checks) in `npm test`; full suite 145 green. |
| 2026-09-17 | **Blazon, second pass: motion, shaders, and out of the box** (3.13; `STYLE.md` §6–6¾).<br>• **The Herald** (new `55-herald.js`, loaded before `42-shell.js`): **the Bend**, a WebGL shader wipe between hall and table under which the table now boots; **the Cry**, P5-style proclamations for rounds, phases and natural 20s/1s, hooked by `MutationObserver` so `32-combat-app.js` and `39-dice.js` are untouched; and **gilt bursts** off seals.<br>• **Hall shaders:** banner gold leaf, weave and hover sweep, plus GPU gilt dust.<br>• **Layout:** swallowtail cloth fall, full-field bend, drifting device, vertical tincture name, bleeding title ribbons, stepped rolls, name scroll, embattled chat hanging, lozengy dice, wax-seal Roll, and a named HUD corner.<br>• **Arrivals:** the lintel resolves in and glints every 9 s, plates are hung in turn, chat lines slide in, totals are stamped, toolbox slots are dealt, and the loading screen matches the lintel.<br>• **One bug found in my own watcher and fixed:** the visibility observer nulled the turn state its sibling had just read, so the first End Turn after placing a fight was silent.<br>• **New `test/herald.test.js`** (10 checks), now in `npm test`.<br>**Verified:** full `npm test` green; every new moment photographed mid-motion through the offscreen gallery. |
| 2026-09-17 | **Blazon: one look for the whole app** (see 3.13 and the new `STYLE.md`). **Problem:** the app was four visual dialects, no web font had ever been loaded (205 rules asking for Cinzel or Crimson Text all got Times New Roman), and there were ~460 unique hex literals, with at least three different golds. **The system:** heraldry used as a graphic system.<br>• **Palette:** `20-shell.css` gains `--m-*` tokens that are `12-heraldry.js`'s `TINCT` exactly, and new `test/tincture.test.js` (now in `npm test`) keeps them identical and holds Argent-on-colour to 4.5:1. Its first run caught Vert at 4.49, so Vert moved two steps darker.<br>• **Type:** `@font-face` aliases give every existing family name a real face on any Windows 10/11 machine today, and the bundled woff2 files are used once `tools/fetch-fonts.js` has been run (not run here: downloading needs the owner's go-ahead). `build.js` copies `src/assets/fonts` like the textures, and the loading screen now uses the tokens.<br>• **Restyled onto the tokens:** the table's chat dock and dice roller (from flat parchment to Sable chrome), HUD buttons, the back-to-hall pennon, papers, toasts (both halves), the hotbar name tag (now a pennon) and selected slot, the GM board's cap and switches, the scene dialog's buttons, and the selection ring. In the hall: the lintel (lozenge rule), plates (counterchanged in their own banner's tincture via a per-plate `--house` from `16-menu.js`), illuminated `h2` initials, the bend strip, Back, fields, `.lk`, the roll, flag-maker "on" states and the update card. In the record: tabs, title rule, doors and the scribe bar.<br>• **Mat tokens re-pointed:** `12-combat.css` sends enemy → Gules, ally → Azure and its fonts → the shared voices.<br>• **Livery:** `42-shell.js` gains `Shell.livery()`, which dyes the chrome's accent from the player's arms. Choosing the tincture, `houseTincture()`, is left as a TODO for grumkata.<br>• **Bugs fixed on the way:** two corrupted token lines in `12-combat.css`, `.to-hall`'s missing padding, and papers toasts that could never show.<br>**Verified:** `npm test` all green (tincture 17, geometry, 23 + 60 + 11 + 25). All 15 screens were photographed before and after through an offscreen-rendered Electron window: `tools/shot.js`'s hidden window never advances the Web Animations clock, so the hall's cloth-drop was frozen at frame 0 in every capture of a hall view. |
| 2026-09-15 | **In-app update UI**, on the hall rather than in Settings — grumkata's correction after a first pass put it there. `electron/preload.js` (new: this app had no preload before) exposes `window.AppUpdate` over `contextBridge`, `electron/updater.js` now pushes a status object on every electron-updater event, and `#update-card` in `menu-body.html` shows itself only for `state:'downloaded'` — a small top-right popup with "Restart & update" (calls `quitAndInstall()`) and "Later" (dismisses for the session; the update installs on the next quit regardless). Verified with a fake preload standing in for the real one, so a `'downloaded'` push could be fired without an actual GitHub release to test against — screenshotted showing correctly on the bare hall, clear of the banners and `#arms`. Full `npm test` (119/119) green throughout. See 3.12. |
| 2026-09-15 | **Real auto-update wired in**, via `electron-updater` against this repo's GitHub Releases — `electron/updater.js`, called from `main.js` after the window opens (checks and downloads quietly in the background, installs on the next natural quit, per grumkata's choice over blocking startup). Chosen over an earlier hand-rolled `updater.js` (still at the repo root, now unused) that only ever hot-patched web content inside a fixed shell; this instead replaces the whole packaged app via the `nsis` installer target — the `portable` target has no equivalent mechanism and cannot auto-update, a real limitation of NSIS rather than of this code. `electron-updater` added as a genuine `dependencies` entry (not `devDependencies` — it runs in the packaged app's own main process, and electron-builder strips devDependencies from the asar), and `package.json`'s `build.publish` now points at the `github` provider for this repo, which changes nothing about what `npm run dist` produces today and only matters once an actual publish (with a `GH_TOKEN`) or a running app's own update check reads it. No release, tag, or token was created or touched. Verified: syntax-checked, and confirmed live via `npm start` that the updater guard fires correctly and silently in an unpackaged dev run (`[updater] skipped — not a packaged build`) with no effect on normal startup; full `npm test` suite unaffected. See 3.12. |
| 2026-09-14 | **Deleted the previous generation.** `src/index.html` and the 32 CSS/JS files only it loaded had been unbuilt for months — `build.js` names every file it stitches, and none of them were on the list, so the shipped app had not contained a line of them in a long time. Removing them changed `dist/monarchy.html` by zero bytes, which is the proof they were dead. Gone with them: `test/smoke.js` and `test/multi-sheet.test.js` (both asserted on `WM`, both already failing, neither in `npm test`), `extract.py` (a one-time migration that reads an `original.html` no longer in the repo), `_canary.txt`, and `src/assets/images` (3 SVGs referenced only by the old entry point). **Features that went with that generation and are NOT rebuilt:** live GM/player sync, GM tools, fog of war, the window manager, multi-sheet editing — recorded in 2.1 rather than left to be discovered. **`firebase` dropped from `dependencies`**: nothing in the current source imports it, and electron-builder was bundling 45 MB of it into every installer (979 entries in the 129 MB `app.asar`) for the sync layer the hall's own Join screen says is not built. **Dead code inside the live files:** `27-table-gl.js` carried a whole post-processing chain — bright-pass, two blur passes, an ACES/split-tone/vignette/grain grade, three render targets, ~190 lines — behind `postReady`, and `buildPost()` was never called, so the condition could not fire and `drawUnder` had been taking the plain branch the whole time. The author's own note on it (measured: 14ms with the GL canvases hidden, 3001ms with them on, and `#grade` in table-body.html already grading the whole composite) had been pasted ABOVE the file's header, outside the IIFE, as a second `drawUnder` whose `uRen`/`uScene` did not even resolve — dead and unreachable. Both removed, the reasoning kept. Also `wallAt()` and `BIN_KEEPS`, the only two genuinely unreferenced symbols in the whole live source: a sweep of every top-level function found 14 candidates and 13 were false positives, called from template literals. **`tools/` cut from 20 files to 9**: the eleven `shot-*`/`dbg-*`/`diag` scripts all required playwright from `/home/claude/.npm-global/...` and opened `file:///tmp/mon/dist/monarchy.html`, paths inside a container that no longer exists, so not one could run. Replaced by `tools/shot.js`, which is Electron rather than Playwright because three.js does not set `preserveDrawingBuffer` — a Playwright screenshot reads an already-cleared buffer and produces a black page with the DOM chrome drawn on top, which looks like a broken app rather than a broken camera. **CSS was left alone on purpose:** 34 class names are never mentioned anywhere, but they are worth 1.9 KB of 290 KB and zero removable rules in the two largest sheets, and the `t3-*` family among them is built by concatenation in `24-table-props.js` (`'prop t3-thing t3-' + t.kind`), so the analysis that flagged them is exactly wrong about those. Not worth the risk. Verified: `dist/monarchy.html` unchanged at 4.24 MB through every step, 119 tests green, hall and table screenshots unchanged. |
| 2026-09-14 | **The assets came out of the JavaScript.** `dist/monarchy.html` was 15.28 MB and every byte of it was parsed on the main thread before the page could show anything — the long white pause `build.js` has been apologising for since the tavern arrived. Two things were in there that had no business being in a script. **The pictures:** every pack baked its textures in as `data:image/jpeg;base64,...`, 7.60 MB of it, of which 5.42 MB was the tavern's twenty-seven 1024×1024 albedos. base64 costs a third on top of the bytes, the bytes go through the *JavaScript* parser before the browser knows they are a picture, and nothing can start decoding until the whole script has been read. New `tools/bake-textures.py` writes them to `src/assets/tex/` as real files at 512 on the longest edge, named by content hash so a picture shared by two packs is stored once; `build.js` swaps the URIs for paths as it stitches and copies the folder into `dist/`. Textures are now also *lazy for free* — `TextureLoader` only fires when a mesh is built, so opening the hall fetches none of them. **The vertices:** 5.61 MB of decimal number literals, each read by the parser into a double and immediately truncated into a `Float32Array`. New `tools/pack-geometry.js` replaces each geometry literal with one base64 blob plus a JSON skeleton of descriptors — positions 16-bit over each prim's own bounding box, normals 8-bit, UVs 16-bit, indices bit-exact — and new `src/js/00-geo-runtime.js` reads them back as typed-array views (one `atob` per pack instead of the parser walking five megabytes). **Neither tool edits a pack file**: both transform in memory inside `build.js`, so re-baking with the Python tools stays safe — just re-run `bake-textures.py` afterwards. Result: **15.28 MB → 4.24 MB page + 2.25 MB of images**, DOMContentLoaded 835 → 559 ms, texture decode 27.2 → 6.9 megapixels, textures settled 499 → 262 ms. Two judgement calls worth keeping: a PNG stays a PNG (`CASTLE.tex.Walls` is tiled 12×22 by `13-hall3d.js`, and JPEG's 8×8 blocks would print 264 copies of the same seam), and `32-combat-app.js`'s 1×1 drag-ghost GIF stays inline because fetching it would make dragging worse. Also: `setIndex` is widened once in `00-geo-runtime.js` to accept a typed array — it previously assigned one straight to `.index`, producing a geometry that silently drew nothing. New `test/geometry.test.js` decodes all 210 prims with the *browser's own* decoder and fails the build if any array drifts past tolerance (worst seen: positions 7.6e-6 of prim extent, normals 0.22°, indices exact); wired into `npm test`, which also had three test files unblocked — they hardcoded `/home/claude/.npm-global/lib/node_modules/playwright`. Still on the table: `WOOD` carries 46% duplicate vertex positions and `CASTLE` 63%, so welding on the full (p,n,u) tuple would cut geometry again — not done here because it can change shading and wanted its own verification pass. Verified: 74-file syntax sweep, `geometry.test.js` 210/210, `table.test.js` 23/23, hall and table screenshots pixel-identical to the 15 MB build. |
| 2026-08-21 | **Phase 0 of the completion plan** (see `claude/completion-plan.md` in the Claude project, or https://claude.ai/code/artifact/766e657a-1c35-4352-bb22-aa0c6acfacae). **P0-1:** every client now signs in anonymously before the database connection opens — new `_uid`/`getMyUid()` in `09-session-sync.js`, `signInAnonymously()` inside `_ensureFirebase()` (returns `false` and reports loudly if it fails, since everything downstream needs an identity), an `owners` **set** of uids claimed by the first host of an unclaimed table (a set, not a single `owner` field: anonymous uids are per-browser-profile, so a single value would lock you out of your own table from a second machine), and a `uid` field on `serializePlayerVitals()`. Player/presence nodes are still keyed by display name on purpose — the name is load-bearing in five places (node keys, `chip.dataset.linkedPlayer`, `_connectedPlayers`, `cmd.target` matching in `_applyGmCommands`, and the `updateGmPlayerLinkDropdowns()` option values), so the uid rides *inside* the node instead. Also fixed a real latent bug in `index.html`'s SDK loader: app/database compat were loaded in parallel via `Promise.all`, but dynamically-inserted scripts are async, and database-compat needs the `firebase` global app-compat creates — if database won the race it threw `ReferenceError`, which `onerror` does *not* catch, so `__firebaseSdkReady` resolved `true` with a missing SDK. Now app loads first, then database + auth in parallel. **P0-3:** Health and Stamina round up (`Math.ceil`) per the rules instead of `Math.round`/`Math.floor`; Health's missing `+ Resilience` term is deliberately deferred to plan task P1-3. **P0-4:** both dead monkey-patches deleted (Known Issues 1 and 8). **P0-5:** `dist/` gitignored, settling the open question left by the 07-19 entry. Requires **Anonymous sign-in enabled** in the Firebase console; sync refuses to start without it. Still open: security rules are `.read`/`.write: true` on `servers/$serverId` — anyone with a table ID has full access. That's plan task P0-2. Verified: full JS syntax sweep, `node build.js`, `npm test` 30/30 smoke + 18/18 multi-sheet, exit 0. |
| 2026-07-11 | **Baseline.** Split the original single 7,394-line/422KB `monarchy_8_4_2.html` into the modular `src/` structure described in Section 2, with `build.js` regenerating an equivalent single-file `dist/monarchy.html`. Pure mechanical split — verified zero behavior change (all 200 function defs, all top-level declarations, all element IDs, and all brace/paren pairs matched exactly between original and rebuilt output; every split file and every rebuilt script block passes a JS syntax check clean). This document created as the standing project reference. |
| 2026-07-12 | **Title screen + table scene.** The character sheet stopped being "the app" — added a title screen (Open Local Table / Host Game Table / Join Game) leading into a table scene where the sheet now lives as one draggable, resizable, closeable/dockable window. New generic window manager (`14-window-manager.js`) built to support future window types (combat, rulebook) without more infrastructure work. No changes to sheet internals (files 00–13) — only wrapped, verified via a jsdom-based runtime smoke test (title screen dismissal, window open/close/drag/resize, position persistence, host/join modal server population) in addition to the usual syntax checks. See 3.10 for full details and the known limitation on multiple live sheet instances. |
| 2026-07-13 | **Table overhaul + Electron distribution**, after first-look feedback that the table "was just the sheet's UI but worse." Table now starts empty (no auto-opened sheet); added a left control panel (Title/Create Character/Open Character/Save Table/Theme, built to grow) and a reserved-but-empty right panel for future dice/chat. Tabs removed — all sheet pages render stacked. Old sheet chrome (menu, quicksave, dark-mode button) hidden inside the window, replaced by the table-level controls. Dark/light theme is now genuinely global — new `--table-*` CSS custom properties in `05-shell.css` re-theme the title screen/table/dock together, not just the sheet. Sound-effect UI disabled (was non-functional clutter — no sounds were ever configured). Added scale-to-fit windows (`WM.enableScaling()`) so resizing the sheet scales it as a whole instead of clipping/scrolling. **Distribution model changed**: `npm run dist` (Electron + electron-builder) now produces a real `.exe` — verified end-to-end by actually building and launching the packaged app (headless, via Xvfb + Chrome DevTools Protocol) and confirming the full flow (title screen → create character → blank sheet → real computed `scale()` transform) inside the genuine packaged executable, not just in a browser or jsdom. `dist/monarchy.html` still exists as a build intermediate and a quick-test convenience, but is no longer the distributable. See 3.10, 3.11, and Known Issues 5.6–5.8. |
| 2026-07-15 | **Tabs restored** — the stacked-pages layout from the 07-13 table overhaul read worse than real tabs, so `showTab()` switching is back (no code deleted 07-13, so this was a CSS-level reversal in `05-shell.css`, not a rebuild). Fixed two things the stacked layout had been masking: the tab bar's leftover asymmetric padding (`52px`/`180px`, originally there to dodge fixed-position buttons that are hidden inside the window now) was making the tab row render visibly off-center; and `WM.enableScaling()` had no way to know a page switch — as opposed to a window resize — had just changed the sheet's natural content height, so a new `WM.rescale(id)` is now called from `showTab()`. A full UI/UX + architecture review was requested alongside this fix; findings and a proposed phased plan are in the new **`UX-AUDIT.md`** rather than folded into this document, since it's closer to a working backlog than a settled reference — expect it to shrink over time as items get done. See 3.10. *(Note added 2026-07-18: `UX-AUDIT.md` isn't actually present in this repo or anywhere in its git history — checked across all branches. Either it existed locally and was never committed, or this entry described work that didn't fully land. If you're looking for it, it isn't here; treat this table and Section 5 as the current record instead.)* |
| 2026-07-18 | **Split combat and multiplayer out of the character sheet.** The old "Combat Tracker" sheet tab (`#p3`) was really three things wedged together: the battlefield tracker, live GM/player session sync, and GM tools. Combat (battlefield/lanes/chips/turn counter/personal vitals-ward-exhaustion-conditions) is now its own standalone table window (`data-window-id="combat"`, opened via a new ⚔ Combat button or `WM.toggle('combat')`) — the second window type built on the Window Manager, proving that pattern generalizes (3.6, 3.10). Multiplayer (session/host-join, server management, GM tools: NPCs/encounters/connected players/fog/mana) stayed on the sheet as its own tab, renamed "Multiplayer" — deliberately, since more multiplayer features beyond combat are planned and this reads more naturally as part of the sheet than as a shared table window (3.7). Along the way, fixed real coupling this split couldn't work around: `serializeSheet()`/`restoreSheet()`/`setActiveSave()` — the whole-character save/load backbone, not just combat — were physically misplaced inside the combat file since the original 07-11 split (despite this document's prior claim that file was "isolated"); moved to `08-saves-io.js` where every other save/load function already lived (3.8). Current HP/Stamina/Stress used to be mirrored between page 1 and the combat page via three overlapping mechanisms (`bindCurSync`, `adjBothVals`, a mirror map inside `adjVal`); removed all three now that current vitals live only in the Combat window, with page 1 keeping just the computed max values. Turn count used to be spliced into `serializeBattlefield`/`restoreBattlefield` via a monkey-patch sitting in a separate grab-bag file (`13-turn-and-init.js`, which also did unrelated multiplayer and sheet init) — that file is gone; turn count folds directly into those two functions, now both defined in the combat file, and each system (sheet, combat, multiplayer) initializes itself. `esc`/`val`/`selVal` (used by nearly every file) and a sheet-card drag-to-reorder feature were also relocated out of the combat file, where they'd been physically stranded despite having nothing to do with combat. The `.monarch` save format bumped to `v: 4` — combat/session state no longer travels with the character file at all, so a save is purely "build" data now; `v: 3` files still import correctly, their combat-shaped fields are just ignored. The battlefield persists itself independently now (autosave to `localStorage`, own key), rather than riding along inside whichever character happened to be loaded when you last saved — intentional behavior change, noted in 3.6. Verified via `node build.js`, a full JS syntax sweep, an HTML tag-balance check, and a new jsdom-based runtime smoke test (`test/smoke.js`, `npm test`) covering window registration, the save-format round-trip at both v3 and v4 (including a realistic old save with the removed fields actually present, to confirm they're silently ignored rather than crashing), battlefield serialize/restore with turn count, the GM remote-setHp command path, and the relocated HP-danger-flash effect — 24/24 checks pass with zero JS errors during page load. See 2.1, 2.2, 3.6, 3.7, 3.8, and Known Issues 5.3/5.6/5.8. |
| 2026-07-19 | **Combat/multiplayer split (above) regenerated against a moved `main`.** Two commits landed upstream between the split being built and delivered: a Firebase Realtime Database migration replacing the old Google Apps Script relay (`firebasemove` — new `firebaseConfig`/`_ensureFirebase`/`_onPlayersUpdate`/`_onPresenceUpdate`/`_stripUndefined` in `09-session-sync.js`, the `BASE_SCRIPT_URL`-generation fix in `10-gm-tools.js` noted in 3.7, a `firebase` npm dependency, a temporary heartbeat debug overlay and an async Firebase-SDK loader added to `index.html`), and a `dist/monarchy.html` un-tracking (`debugging host-electron issues` — the build artifact is no longer committed to git; **not** added to `.gitignore` as part of that commit, so running `node build.js` will make it show as untracked again — decide deliberately whether to gitignore it or keep hand-committing it, this document isn't taking that decision for you). `serializeBattlefield()`/`restoreBattlefield()`/`serializePlayerVitals()` — the three functions this split relocates/depends on most — turned out to be byte-identical before and after the Firebase migration (it changed transport, not the battlefield's data shape), so the split itself needed no redesign, just re-applying against the new surrounding code. One real addition this time: `setSessionUI()` (in `09-session-sync.js`) now also calls `WM.open('combat')` for both roles — when combat/vitals lived in the same sheet tab as session controls, starting a session already put you on the right tab; now that they're a separate window, starting a session needs to explicitly open it too, or a GM/player would start a session and see no combat window at all. |
