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
    42-shell.js             which half you are looking at
  assets/tex/              ← the textures, as real files (see 2.3)

tools/
  scope-css.js, pack-geometry.js   ← build inputs, used by build.js
  bake*.py                         ← re-bake a model pack from its glTF/FBX
  bake-textures.py                 ← pull the textures back out to files
  shot.js                          ← photograph the built app (Electron, not Playwright — see its header)

test/
  serve.js                 ← serves dist/ over http for the browser tests
  geometry.test.js         ← the packed vertices still say what the bake said
  table.test.js            ← the table model, in node
  table-ui.test.js         ← the chest, the bar, and what is in your hand
  join.test.js             ← a character joining a table
  handling.test.js         ← picking things up and putting them down

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
