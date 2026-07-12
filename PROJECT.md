# MONARCHY — Project Reference

**Status:** Active development
**Last updated:** 2026-07-11 (baseline)

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

It ships as a **single self-contained `.html` file** — no install, no
server, works for tech-illiterate players: they double-click it and it
opens.

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
    04-overrides.css        MUST STAY LAST — cascade-wins over everything above
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
    13-turn-and-init.js      turn counter + page init — MUST STAY LAST

build.js                  ← run `node build.js` to produce the distributable
dist/monarchy.html        ← THE FILE YOU HAND TO PLAYERS (generated, don't hand-edit)
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

```
node build.js
```
Inlines every CSS/JS file back into one `dist/monarchy.html`. Requires
Node.js installed once; no npm packages needed, no internet required to
build. Run this before sharing any new version with players.

**Planned next phase:** wrapping `dist/monarchy.html` in Electron for a
true double-click `.exe` (no browser chrome visible). Not started yet —
see Timeline.

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
- **Dark mode** toggle, **Undo system** (generic action-undo stack), both
  in `12-app-utils.js`.
- Toasts, side menu, keyboard shortcuts (small, scattered across
  `08-saves-io.js`).

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

---

## 6. Rules & guidelines for working on this project

1. **Edit in `src/`, never in `dist/monarchy.html`.** The dist file is
   regenerated by `build.js` and any direct edits to it will be lost.
2. **Never reorder `<link>`/`<script src>` tags in `index.html`** without
   checking dependencies first — both CSS cascade and JS globals rely on
   current order (see 2.2).
3. **Run `node build.js` before handing a new version to players.** A
   change in `src/` alone does nothing for someone using the exported
   `.html`.
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
