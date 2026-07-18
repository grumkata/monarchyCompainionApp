# UX & Architecture Audit — Monarchy Companion App

_Written 2026-07-15, commissioned alongside the tab-restoration fix (see
`PROJECT.md`'s timeline for that day). This assumes you've read
`PROJECT.md` — it isn't repeated here._

This is a working backlog, not a settled reference — expect it to shrink
as items get done. Treat line/selector references as of 2026-07-15; they'll
drift as the code changes.

## How this was produced

Not just read from source. The app was actually built (`node build.js`)
and driven in a real Chromium instance (Playwright) — title screen through
character creation, all three sheet tabs, dark mode, window resize, and a
zoomed-out look at the empty table. Counts and ratios below (animation
count, contrast ratios, font-size spread, `onclick` count, etc.) are from
grep/computation against the actual files, not estimated.

---

## 1. What's already working — say this first

Easy to skip in an audit, but it changes what the rest of this means: none
of what follows is "start over." The bones are sound.

- **`PROJECT.md` itself.** Thorough, current, self-maintaining documentation
  is rare in a solo project this size. The Section 6 rules (keep overrides
  in `04-overrides.css`, mechanical-split-before-rewrite, don't rename
  `#sheet-root`, etc.) are good engineering discipline and this audit
  respects all of them — nothing below asks you to break one.
- **Verification discipline.** jsdom smoke tests, a headless-Electron
  Xvfb+CDP check of the actual packaged `.exe` rather than just the browser
  build, syntax-checking every split file — this is more rigor than most
  projects this size get.
- **The Electron config is genuinely hardened**: `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true`, no default menu. Better than a
  lot of hobbyist Electron apps ship with.
- **A real design-token layer already exists for color** — `--paper`,
  `--ink`, `--gold`, `--table-*`, etc. as CSS custom properties, re-themed
  wholesale under `body.dark-mode`. This is the right pattern; it's just
  not extended to typography or spacing yet (§3.2).
- **`WM` (the window manager) is genuinely generic** — `register()` /
  `enableScaling()` know nothing about sheets specifically, which is why
  today's fix could add `rescale()` to it without touching anything
  sheet-specific. Good separation of concerns to build on.
- **Some animation is already used exactly right**: `hp-danger-pulse` and
  `page-danger` fire on a state condition (low HP) and mean something. That's
  the standard the purely-decorative animations in §2.1 should be held to.
- **The theme identity is distinctive and fits the genre.** Nothing below
  argues for making this look like a generic SaaS dashboard — parchment and
  Cinzel and gothic corner flourishes are a fine answer for a monarchy-themed
  TTRPG tool. The issue is execution restraint, not the theme itself.

---

## 2. Today's fix, briefly

Tabs are back (`showTab()` in `03-sheet-basics.js` is back in control of
`.tabs`/`.sheet` visibility — `05-shell.css` no longer forces every page
visible). Two things needed fixing alongside the visibility flip, not just
the flip itself:

1. `.tabs`'s inherited `52px`/`180px` left/right padding (there to dodge
   `#menu-toggle`/`#quicksave-bar`, both hidden inside the window now) was
   making the tab row render visibly off-center. Reset to a symmetric
   `14px`/`14px`, scoped to `.window-content .tabs`.
2. `WM.enableScaling()` only recomputes the scaled wrapper's size on a
   window *resize*, not a content-height change — fine when every page was
   always visible, not fine once switching tabs makes the active page's
   natural height jump around. Added `WM.rescale(id)`, called from
   `showTab()`.

Full detail and rationale in `PROJECT.md` §3.10. Patch: see the repo diff
for `05-shell.css`, `03-sheet-basics.js`, `14-window-manager.js`.

---

## 3. Visual design findings

### 3.1 Ambient animation budget is the single biggest "professional" gap

Every `@keyframes` block in the CSS — all 16 of them — runs `infinite`:

```
gold-pulse · hp-danger-pulse · hp-pulse · moon-breathe · mote ·
ornament-spin · page-danger · pip-glow · qs-pulse · sheet-fire ·
sheet-live · star-spin · starburst-spin · tab-sh · title-blaze ·
title-pulse
```

The sheet frame alone stacks **two** permanent looping effects at once —
`sheet-fire` (background pulse, 5s) and `.sheet::after`'s `gold-pulse`
(border glow, 3s) — and the active tab adds a third (`tab-sh`, 4s shimmer)
whenever tabs are open. None of these are tied to anything happening in the
game; they run identically whether you're mid-combat or just staring at a
blank name field.

Concretely, this is dead weight on top of everything else: in
`02-components.css:623`, `.sheet { animation: sheet-live 7s ... }` has no
`!important`; `03-patches.css:221` gives `.sheet` a *different* animation
(`sheet-fire`) `!important`. Equal specificity + `!important` beats
non-`!important` regardless of source order, so `sheet-live` never actually
renders — it's dead code, quietly overridden the moment the patch landed.
Worth deleting outright rather than leaving as a trap for later (this
doesn't conflict with the "overrides go in `04-overrides.css`" rule — that
rule is about *where new overrides go*, not about keeping fully-superseded
rules around forever).

**Why this matters more than it might seem**: a character sheet is a
reference document consulted mid-conversation at the table, often for
several hours. Continuous peripheral motion is exactly what pulls a reader's
eye away from the text they're trying to read — the opposite of what a
reference tool should do. The state-driven animations you already have
(`hp-danger-pulse`, `page-danger`) are the right model: motion earns its
place by *meaning something* (a warning, a change), the same principle
game-feel/"juice" design uses for feedback effects — a hit-flash or
screen-shake reads as informative because it's tied to an event; the same
effect looping constantly in the background would just read as noise. Right
now the sheet has the state-driven kind **and** the ambient-wallpaper kind
doing the same visual language (pulsing gold light), which makes it harder
for a player to tell "this is glowing because it's decorative" from "this is
glowing because my HP is critical."

*Recommendation: pick 2–3 animations that mean something (HP danger, a
save confirmation, dice roll) and cut the rest, or reduce them to
one-shot/on-hover rather than infinite loops.*

### 3.2 No unified type or spacing scale

Font sizes in play across the CSS (deduplicated):

```
5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10, 10.5, 11, 11.5, 12,
12.5, 13, 14, 15, 16, 18, 20, 22, 28, 40, 44, 56  (px)
```

25 distinct values, several in half-pixel increments (`6.5px`, `11.5px`,
`12.5px`) — a strong tell that sizes were tuned per-element by eye rather
than drawn from a scale. A deliberate scale (e.g. a ~6-step set:
10/12/14/16/20/28px) would look at least as good and make future density/
hierarchy changes a one-variable edit instead of a file-wide hunt.

The sharpest example of why this matters: the **smallest text in the whole
app (5px)** is the `FORMATION`/`NORMAL` status tag on combat chips
(`04-overrides.css:115,122`, `.comb-chip.chip-formation::before` /
`.comb-chip:not(.chip-large):not(.chip-formation)::after`) — i.e., exactly
the status a GM needs to read at a glance mid-combat. The size hierarchy is
currently inverted: your most time-pressured, glance-critical text is your
tiniest.

### 3.3 Contrast — mostly fine, a couple of real failures

Computed against actual color pairs in the CSS (WCAG relative-luminance
formula, not eyeballed):

| Pair | Colors | Ratio | Result |
|---|---|---|---|
| Inactive tab label on tab bar | `#6b5530` on `#1a1208` | **2.62:1** | Fails AA even for large text (needs ≥3:1) |
| Active tab label on paper | `#16100a` on `#f0e6cc` | 15.19:1 | Fine |
| Title tagline on table background | `#7a5c1e` on `#d8c69a` | 3.69:1 | Passes only for large/bold text |
| Dark-mode ink on dark-mode paper | `#e8dfc8` on `#18130e` | 13.90:1 | Fine |
| Gold accent text on parchment | `#7a5c1e` on `#e8d9b5` | 4.45:1 | Passes only for large/bold text |

The inactive-tab case is the one worth actually fixing — it's real body
text (not large/bold by WCAG's definition), currently invisible-ish until
you focus it, and it's the label for the exact feature this fix just
restored. The other two are borderline; fine as-is if kept to headers/large
text, worth a slightly darker gold if they ever get used for anything
smaller.

### 3.4 Color tokens exist but aren't consistently used

165 hardcoded hex colors appear outside the `:root`/`body.dark-mode` blocks,
against ~272 `var(--…)` usages. The token system (§1) is the right
foundation — it's just partially adopted. Every hardcoded hex is a color
that won't follow the theme toggle if it should, and a decision that has to
be re-made by hand the next time the palette shifts even slightly.

---

## 4. Interaction & information architecture (game-table lens)

### 4.1 The empty table has no onboarding

First launch after "Open Local Table" is a large, mostly-empty gradient
background with four small icon-only buttons in the top-left corner at
~55% opacity and a single dock button at the bottom. There's no visual cue
about what to do first. For comparison, this is exactly the moment
Foundry-style VTTs usually spend the most onboarding effort on (an empty
scene with an explicit "drop a token here" or "create your first actor"
affordance) — because an empty canvas with no call-to-action is the single
easiest place to lose a new user, and this app's empty state currently has
less going on than the loading screen before it.

*This doesn't need to fight the "minimal chrome" intent (§4.2) — a subtle
centered prompt on a genuinely empty table ("+ Create your first
character") that disappears once a window exists would fit the existing
minimal aesthetic and solve the discoverability problem at the same time.*

### 4.2 Icon-only, hover-reveal controls — a deliberate choice, with one gap

`PROJECT.md` §6 rule 14 is explicit that `.table-ctrl-btn` is meant to be
"small, low-opacity, brighten on hover" and that a second, more visible
control cluster is a non-goal. That's a legitimate, considered design
decision for a game-table surface where you don't want a toolbar competing
with the game itself — this isn't a case for undoing it.

The gap: the button label is `<span>` with `max-width:0;overflow:hidden`,
revealed only on `:hover`. That means the label is unreachable by keyboard
focus and by touch (no `:hover` state exists on a touchscreen) — so on a
tablet, or via keyboard navigation, these buttons are permanently
icon-only with a `title` attribute as the only fallback (which also
doesn't show without a mouse). Given `title`/`onclick` markup is already
in place, the cheap fix is adding `aria-label` (covered in §5 anyway) and
mirroring the `:hover` reveal on `:focus-visible`, without changing the
default collapsed/minimal look at all.

### 4.3 Combat-tracker glanceability

The lane-based battlefield (`07-combat-tracker.js`, already flagged in
`PROJECT.md` §3.6 as an overhaul target) is exactly the screen most likely
to be referenced every few seconds during a live session, which raises the
bar on at-a-glance clarity specifically for this page — turn order,
HP/condition state, and formation status need to be readable in a fraction
of a second, under table lighting, possibly on a laptop across the table.
The 5px status text (§3.2) is the clearest instance, but it's worth keeping
this lens generally in mind when the combat tracker gets its dedicated pass
rather than just porting the current visual language over unchanged.

---

## 5. Accessibility

Quick, concrete counts against the actual markup:

| Check | Count |
|---|---|
| `aria-*` attributes anywhere in `index.html` | 0 |
| `alt=` attributes anywhere | 0 |
| `<label>` elements | 7 (against dozens of inputs) |
| `@media` queries in all of `src/css/` | 1 (a single 640px breakpoint, shell-only) |
| Elements with `outline:none` (universal selector on all text inputs/selects/textareas) | all of them, `01-base.css:146` |

The `outline:none` isn't a total void — there's a custom `:focus` state
(border-bottom color change + faint background tint) — but it's a
meaningfully weaker signal than a full focus ring, especially for anyone
relying on keyboard navigation to see where they are.

Worth being honest about audience here: this ships to a small, known group
of players via a desktop `.exe`, not the general public on the web, so this
isn't screen-reader-critical the way a public site would be. But several of
these are genuinely cheap regardless of audience size — `aria-label` on the
icon-only buttons (§4.2), a few more `<label for>` associations, a stronger
`:focus-visible` style — and they cost little enough that "small audience"
isn't a strong reason to skip them.

---

## 6. Architecture & maintainability

### 6.1 Global scope / DOM-id coupling — you already know this one

`PROJECT.md`'s own 07-12 entry flags "the known limitation on multiple live
sheet instances" — this audit isn't discovering that, just adding a
recommendation on timing: this is a real architectural constraint (every
function and ID assumes exactly one sheet exists), but it's also a
substantial, regression-risky rewrite (instance-scoping ~4,000 lines of
procedural code sharing one global namespace). I'd treat it as **not**
urgent — worth doing as its own deliberate project *if and when* you
actually need multiple simultaneous editable sheets (e.g. a GM wanting
several players' full sheets open side by side), not as part of a general
"maintainability" pass. Doing it preemptively is a lot of risk for a
capability you may not need yet.

### 6.2 Inline `onclick` handlers

77 `<button>` elements, 131 inline `onclick="..."` attributes across
`index.html` + the JS-generated markup (combat chips, background cards,
etc. build their HTML via string concatenation with inline handlers too).
Workable at the current size, but it's the kind of pattern that gets
harder to change (not impossible, just increasingly tedious and
error-prone) as more interactive pieces get added — every new behavior
means another string-concatenated `onclick`, and refactoring later means
hunting through generated-markup strings rather than a single event-
delegation point. Worth switching new code to `data-action` attributes +
one delegated listener per container rather than more inline handlers,
without necessarily migrating the existing 131 right away.

### 6.3 Patch-file layering will keep producing dead rules like §3.1's example

`03-patches.css` and `04-overrides.css` are a sound, deliberate pattern per
`PROJECT.md` §6 rule 5 ("keep overrides in `04-overrides.css`, don't fight
specificity elsewhere") — not proposing to undo that. The one gap: nothing
currently prunes a rule once a later file has fully and permanently
superseded it (like `sheet-live`, §3.1). Cheap habit to add: when a patch
fully replaces an earlier rule's property (not just adds to it), delete the
earlier rule in the same sitting rather than leaving it inert.

### 6.4 Build system

`build.js`'s plain concatenation is appropriately-scoped for a non-module,
shared-global-scope codebase at this size — not a problem to solve now.
Worth flagging as a future decision point only: if §6.1's instance-scoping
ever becomes necessary, that's also the natural moment to reconsider a real
module system (ES modules + a small bundler), since instance-scoped state
and one-big-shared-scope are in tension. Not before then.

---

## 7. Proposed phased plan

Roughly ordered by risk-adjusted value — each phase is independently
useful even if you stop after it.

| Phase | Contents | Why this order |
|---|---|---|
| ~~0~~ | ~~Tabs restored~~ | Done, this pass |
| 1 | Cheap hygiene: fix the inactive-tab contrast (§3.3), add `aria-label`s to icon-only controls + `:focus-visible` label reveal (§4.2/§5), delete confirmed-dead CSS like `sheet-live` (§3.1) | Low risk, no visual redesign needed, immediate quality bump |
| 2 | Design tokens: extend the existing color-token pattern to a real type scale + spacing scale as CSS custom properties (§3.2) | Foundation everything visual builds on — do this *before* the de-clutter pass, not after |
| 3 | Visual restraint pass using Phase 2's tokens: pick the 2–3 animations that should survive (§3.1), reapply the type/spacing scale consistently | The actual "professional" visual delta; biggest perceptual change |
| 4 | Empty-table onboarding (§4.1) | Small, self-contained, high first-impression value |
| 5 | Combat tracker rework — already your own flagged target (`PROJECT.md` §3.6) | Do last of the visual work since it should inherit Phases 2–3's tokens rather than reinvent its own style |
| 6 (optional, bigger) | Instance-scoped architecture (§6.1) | Only if/when multi-instance sheets becomes an actual requirement |

---

## 8. Files touched in this pass

- `src/css/05-shell.css` — tab restoration + padding fix
- `src/js/03-sheet-basics.js` — `showTab()` now calls `WM.rescale('sheet')`
- `src/js/14-window-manager.js` — new public `WM.rescale(id)`
- `PROJECT.md` — §3.10, §5, §7 updated to match
- `UX-AUDIT.md` — this document (new)
