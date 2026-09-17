# Blazon — how Monarchy looks

_Written 2026-09-17. The tokens live in `src/css/20-shell.css`; this is the
reasoning and the rules. `PROJECT.md` §3.13 is the short version._

Persona 5 is recognisable from a single frame because its theme **is** its
graphic system: one strict palette, one shape language, type used as image,
and motion that belongs to the brand. Monarchy's theme is heraldry, and
heraldry already is a graphic system — a thousand years old, with rules. So
Blazon doesn't invent a style. It adopts heraldry's rules and applies them to
every surface.

If you only remember one line: **tinctures only, metal on colour, and
anything chosen gets counterchanged on the bend.**

---

## 1. The tinctures (palette)

The palette is `TINCT` from `src/js/12-heraldry.js`, copied into `--m-*`
tokens. The hall's banners are painted from that table, so the chrome is
literally the same paint. `test/tincture.test.js` fails the build if the two
drift.

| Token | Tincture | Kind | Role in the UI |
|---|---|---|---|
| `--m-or` `#c9a227` | Or | metal | the **voice**: headings on chrome, the live/chosen state, primary buttons |
| `--m-argent` `#ded8c8` | Argent | metal | the **text** on chrome and cloth |
| `--m-sable` `#171310` | Sable | colour | the **chrome** ground |
| `--m-gules` `#a3232b` | Gules | colour | rubrication on vellum, destructive acts, the default livery |
| `--m-azure` `#27508f` | Azure | colour | allies; the Join cloth |
| `--m-vert` `#2b6940` | Vert | colour | the Characters cloth |
| `--m-purpure` `#67326f` | Purpure | colour | the Settings cloth |
| `--m-tenne`, `--m-murrey`, `--m-bleu` | stains | colour | available to arms; not used by chrome |

Shades (`--m-or-hi/lo`, `--m-sable-0/2/3`, `--m-gules-hi/lo`, …) exist for
things with depth. They are the same paint lit or shaded, not new colours.

**Vellum** (`--m-vellum*`, `--m-ink*`) isn't a tincture. It's the ground a
record is written on.

### The rule of tincture = the contrast rule

> Metal on colour, colour on metal. Never metal on metal, never colour on colour.

Heralds used this rule so a shield could be read across a field, and it maps
straight onto accessibility:

- **Argent on any colour** clears 4.5:1, so it's safe for body text.
  (Vert was darkened two steps, `#2c6b41` → `#2b6940`, to get there.)
- **Or on Sable** clears 7:1, so it's safe at any size.
- **Or on a colour** (Gules, Azure…) only clears ~3:1, so use it for
  **display type only** (titles, illuminated initials, big tallies).
- **Or on vellum is forbidden.** That's metal on metal. On a record, headings
  are Gules (rubric) or Sable ink.

## 2. Three surfaces, never mixed

| Surface | Where | Ground | Text | Accent |
|---|---|---|---|---|
| **Sable** | all chrome: bars, buttons, panels, chat, toasts, HUD | `--m-sable` | Argent | Or + your livery |
| **Cloth** | the hall's full-screen views | the banner's tincture (`--field`) | Argent | Or |
| **Vellum** | the record, papers, notes, the battle mat | `--m-vellum` | Sable ink | Gules rubric |

Chrome stays Sable regardless of the table's Theme button, the way P5's UI
stays red and black over every world. The Theme button changes the *mat*, not
the chrome.

## 3. Type — four voices, one job each

| Token | Face (bundled) | Windows fallback | Job |
|---|---|---|---|
| `--m-f-mark` | UnifrakturMaguntia | Old English Text MT → Sitka Banner | the name of a thing: "Monarchy", a person, an illuminated initial |
| `--m-f-cap` | Cinzel | Constantia | engraved capitals: every label, button, heading. Tracking `--m-track` |
| `--m-f-hand` | Crimson Text | Sitka Text → Palatino | anything read as a sentence; placeholders; flavour |
| `--m-f-tally` | Barlow Condensed | Bahnschrift SemiCondensed | a number you act on: dice, rounds, counts, list numbers |

Rules:
- **Never use blackletter for a numeral or a lone I/J.** A blackletter I reads
  as J (the new-character doors said "JJ" for a minute).
- **Illuminated initial:** every hall `h2` gets its first letter in the mark
  face, in Or, 1.45× (`h2::first-letter` in `00-hall.css`).
- **The fonts aren't in the repo yet.** `node tools/fetch-fonts.js`
  downloads the four OFL families into `src/assets/fonts/`, and `build.js`
  copies them beside the page. Until then, `20-shell.css` aliases each family
  onto a Windows face with `@font-face … local()`, so the 205 existing
  `font-family:'Cinzel'` rules already render as something deliberate rather
  than Times New Roman.

## 4. Shapes — the cuts

Only these shapes. All are `clip-path` tokens.

| Token | Shape | Use |
|---|---|---|
| `--m-plaque` | trapezoid, narrower at the top | titles riding a border; primary buttons; HUD buttons |
| `--m-pennon` | flag with a swallowtail on the right | "go back"; toasts; the hotbar name tag |
| `--m-cut` | rectangle with top-left and bottom-right corners cut on the bend | panels (the new-character doors) |

Ornament:
- **`--m-frame`**: the layered frame (Sable rule outside a gilt one).
- **`--m-marks`**: corner marks at top-right and bottom-left, the *other*
  diagonal from `--m-cut`, so a panel can wear both.
- **The lozenge rule:** two gilt hairlines meeting at a diamond, under the
  app's name (lintel, record title). It's the only freestanding ornament.
- **The bend strip:** a gilt bar cut on the diagonal (`.strip`) under a title.

## 5. The counterchange — the signature interaction

In heraldry, *counterchanged* means the colours swap across a dividing line.
In Blazon, **anything hovered, chosen or live is counterchanged along a
bend**: an Or band sweeps in on a 115° diagonal and the ink flips to Sable.
It's this app's version of P5's red slash, and the one motion every control
shares.

```css
.my-control{
  color: var(--m-text);
  background: var(--m-sweep) 102% 0 / var(--m-sweep-size) no-repeat, var(--m-sable);
  transition: background-position var(--t-wipe) var(--settle),
              color var(--t-wipe) var(--settle);
}
.my-control:hover, .my-control.on{ background-position: 0 0; color: var(--m-sable); }
```

Variants:
- **Primary** (already Or at rest): use `--m-sweep-house`, so your livery sweeps
  over the gold and the ink flips to `--m-house-ink`.
- **Destructive:** swap the band for Gules: `background-image:
  linear-gradient(115deg,var(--m-gules) 0 50%,transparent calc(50% + .5px))`,
  and the ink goes Argent.
- **Hall plates:** the band is the banner's own tincture (`--house`, set per
  plate by `16-menu.js`).
- **Roll entries:** the band only grows behind the number (`background-size`
  0 → 150px), so the name stays readable.

New markup can use the `.m-cc` class. Existing controls carry the recipe in
their own scoped rules, because a bare class in `20-shell.css` loses to their
two-class selectors (PROJECT.md rule 5).

## 6. Motion — the Herald

Persona 5 is as recognisable in motion as it is in a still frame. Blazon's
motion lives in `src/js/55-herald.js` and does three things, all of them
heraldic:

| Call | What you see | When |
|---|---|---|
| `Herald.wipe(mid, {title, sub})` | **The Bend.** A Sable cloth in your livery is drawn across on the diagonal with a *dancetty* (zig-zag) gilt edge. While it covers the screen, `mid()` runs and a sun *in splendour* turns behind the destination's name. Then it's drawn off the same way. | Hall ↔ table (`42-shell.js`). The table boots under the cloth, so its first-load hitch is hidden. |
| `Herald.proclaim(title, {sub, tone, hold})` | **The Cry.** A Sable band slammed across the screen at −7°, with hems in the tone's tincture outside gilt. The title is engraved capitals with a blackletter initial and a hard offset shadow in the tone (the one gesture borrowed from P5), over splendour rays. Cries queue; they never overlap. | A new round (Or), whose turn it is (players: livery, allies: Azure, enemies: Gules), a natural 20 (*Fortune*, Or), a natural 1 (*Ill Omen*, Gules). |
| `Herald.burst(x, y)` | **Gilt.** Lozenges of gold leaf thrown off a point. | Every wax seal press, the Roll seal, a roll's total. |

The watchers at the bottom of the file hook these to the dice log, the
combat sheet's `#round` and phase classes, and seal clicks. They work by
watching the DOM, so no other file's logic was changed.
`test/herald.test.js` makes sure they stay hooked up.

**Rules for the Cry, so it stays special:**
- Only for moments the whole table should look up at. A saved character is a
  toast, not a cry.
- At most about 1.4 s on screen. Never block input for longer than the Bend.
- Tone is a tincture name, and it follows the rule of tincture (it's a hem
  next to Or, so it's a colour, never a metal, except for Or's own moments).

**The shared curves** are unchanged: `--pop` for arriving or grabbed,
`--settle` for coming to rest and hovers, `--snap` for presses, and
`--t-wipe` (.22s) for the counterchange.

**Arrivals** (all CSS, all one-shot):
- **Hall wordmark:** resolves out of a blur, then a gilt glint crosses it
  every 9 s (only 1.2 s of motion in 9).
- **Hall furniture:** the rule draws out from its lozenge, the plates are hung
  one by one, and your arms slide in.
- **Cloth screens:**
  - The cloth falls with a **swallowtail hem**, not a flat edge.
  - The device slams in and the bend slides across.
  - The title arrives on its ribbon and the strip draws out.
  - Roll entries are dealt in one after another.
- **Table:** chat lines arrive from the hem, a roll's total is stamped, and
  the toolbox deals its slots when the chest opens.
- **Loading screen:** the same arrival as the lintel.

Reduced motion turns the Bend into a cut, and the global rule in
`20-shell.css` makes every arrival instant.

## 6½. Layout — out of the box

The user brief was to "cut free from the boxes". The rule is: **if a thing
can be heraldic furniture instead of a rectangle, it is.**

| Where | Furniture | How |
|---|---|---|
| Hall cloth screens | a great **bend** across the whole field, edged in gilt | `#screen .cloth::after` |
| | the house's **device**, huge, tilted and bleeding off the right edge, drifting against the pointer | `.device` + `--mx/--my` from the Herald, set on `#screen` only |
| | the **tincture's name** up the edge in outline capitals | `#screen[data-house]::after` (`16-menu.js` sets `data-house`) |
| | the **title on a Sable ribbon** that runs in from off-screen and is cut on the bend | `h2::after`; `.body` now spans the screen so the ribbon can bleed |
| | the **roll on a bend**: each entry a step further right, up to ten | `.roll > .entry` + `--i` |
| Hall | your name on a **scroll** | `#arms .who::before` |
| Table | the chat is a **hanging with an embattled edge**: merlons with gilt caps | `-webkit-mask` on `.chatdock` |
| | the dice are **lozengy**, the second row set in the notches of the first | a 9×3 half-cell grid; `clip-path` is also the hit area |
| | **Roll is a wax seal**, the same wax as the hall's (`--m-wax`, `--m-wax-melt`) | `.droll` |
| | the corner names **this table** in the mark's hand | `.hud.tl`, text set by `42-shell.js` |

## 6¾. Shaders

| Shader | File | What it does |
|---|---|---|
| Banner cloth (FS) | `13-hall3d.js` | Woven threads. Gold leaf: Or pixels, detected by colour, take a specular and a periodic line of light down the bend, and Argent a cooler sheen. Pointing at a banner sends one counterchange sweep down its diagonal, the 3D twin of the UI hover. |
| Gilt dust (VS+FS) | `13-hall3d.js` | 240 points moved entirely on the GPU, drifting upward through the torchlight and flickering. |
| The Bend + Splendour (FS) | `55-herald.js` | One full-screen triangle, drawn at no more than 1280 px wide, with two modes: <br>• **the cloth:** dancetty edge, livery band, gilt edge, diaper lattice, weave and grain <br>• **the sun in splendour:** 22 rays, alternating straight and rayonny |

## 7. Livery

The chrome wears exactly one accent, `--m-house`: the chat's inner hem, the
edge of every toast, the band on Back, the rule under the GM board's cap, and
the colour primary buttons counterchange into. It comes from **your own
arms**, so each player's app is dressed in their house colours.

`src/js/42-shell.js` sets it on `<html>` at start-up and whenever arms are
taken (`Shell.livery()`). Which tincture of a coat becomes the livery is
decided by `houseTincture(arms, H)`, which is **left for grumkata to write**.
The choices it has to make:

- **The field (`arms.a`)** is the obvious pick: it's most of the shield. It
  can be a metal, though, and a metal livery disappears beside Or plaques.
- **Fall back to `arms.b`** (the second tincture of a divided field) when the
  field is a metal? Then an Or/Gules coat still gives Gules.
- **Sable is a colour, but it's also the chrome.** A Sable livery is
  invisible on a Sable panel, so skip it too, or fall through to the next
  tincture.
- **Picked-your-own colours** (`'#rrggbb'`) can be anything. `inkFor()`
  already switches the ink to Sable for pale ones. Decide whether to allow
  them at all.
- **No arms yet** (the default is a plain Sable field) → return `null` and the
  livery stays Gules.

## 8. Adding something new

1. Pick its surface (§2). That decides its ground, ink and accent.
2. Use only `--m-*` tokens. A new hex literal is a smell; if you need a new
   shade, add a token to `20-shell.css`.
3. Pick a cut (§4). Don't add `border-radius` anywhere.
4. If it can be hovered, chosen or live, give it the counterchange (§5).
5. Labels in `--m-f-cap` with `--m-track`; sentences in `--m-f-hand`; numbers
   in `--m-f-tally`.
6. Check it on a Gules cloth, over the wood, and over the bright field.

## 9. What Blazon hasn't reached yet

Honest gaps, roughly in order of how much they'd help:

- **The fonts aren't bundled.** See §3. This is the single biggest step
  left.
- **The field (`37-scene-field.js`)** is a bright, saturated cartoon world
  (Nature MegaKit). The chrome now reads correctly over it, but the world
  itself is a different art style from the lamplit tavern and the dark
  hall. A heraldic grade on it (fewer greens, more ochre, a tincture-tinted
  sky) is a 3D/lighting job, not CSS.
- **~400 hex literals remain** in `12-combat.css` and `13-table-ui.css`,
  mostly the battle mat's and the hotbar's *materials* (wood, brass, lacquer).
  They're deliberately physical, but their golds could still be moved onto
  `--m-or*`.
- **The combat sheet's top bar and selection bar** (`.topbar`, `.selbar`)
  still use the mat's bronze band rather than chrome. They're printed on the
  mat, so that's defensible, but they're the next candidates.
- **The field has no cry of its own yet.** The Cry works over it, but a
  heraldic grade for the field's world (see above) would make the two feel
  like one place.
- **The record is deliberately calm.** It's a reference read for hours, so
  it got tokens and rubrication but no ambient motion (UX-AUDIT §3.1).
- **3D piece colours** (ally/enemy counters in `34-gl-pieces.js`) are set in
  JS and don't read the tokens.
