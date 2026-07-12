#!/usr/bin/env python3
"""
Mechanical, order-preserving split of monarchy_8_4_2.html into separate files.
Every chunk is a CONTIGUOUS line range copied verbatim (no rewriting, no
reordering) so behavior cannot change -- this is purely a file-organization
transform. Line numbers below are 1-indexed and inclusive, matching what
`grep -n` / `view` reported on the original file.
"""
import io

SRC = "original.html"

with io.open(SRC, "r", encoding="utf-8", newline=None) as f:
    lines = f.readlines()  # universal newlines -> each entry ends with \n

def chunk(start, end):
    """1-indexed inclusive line range -> text block, normalized to \n."""
    return "".join(lines[start-1:end])

# ---- CSS chunks (order MUST be preserved when reassembled: 04 overrides
# everything and must load last) ----
css_chunks = {
    "01-base.css":       (9, 596),
    "02-components.css": (601, 1245),
    "03-patches.css":    (1625, 2223),
    "04-overrides.css":  (2231, 2423),   # "loaded last, wins over all"
}

# ---- JS chunks, in original top-to-bottom order ----
js_chunks = [
    ("00-storage.js",            1252, 1258),  # _memStore / _ls, must load first
    ("01-fx-polish.js",          1260, 1620),  # canvas fx + QoL polish IIFE
    ("02-data-prebuilt.js",      2992, 3905),  # PREBUILT_DATA
    ("03-sheet-basics.js",       3906, 4115),  # armour equip, derived stats, attr nav, prebuilt modal, tabs, ids, hp adjust
    ("04-data-skills.js",        4116, 4273),  # SKILL_DATA
    ("05-skills-backgrounds.js", 4274, 4844),  # skill picker, skill trees, knacks, backgrounds
    ("06-equipment-lanes.js",    4845, 4941),  # weapons, armour UI, ability slots, exhaustion, conditions, lane options
    ("07-combat-tracker.js",     4942, 5575),  # combatants, chips, serialization, combat readout, drag-reorder  <-- OVERHAUL TARGET
    ("08-saves-io.js",           5576, 5677),  # quick save, save/load, export/import, autosave, keyboard shortcuts, menu, toast
    ("09-session-sync.js",       5678, 6801),  # GM/player live sync networking
    ("10-gm-tools.js",           6802, 7121),  # server management, saved NPCs, saved encounters
    ("11-combat-extras.js",      7122, 7191),  # fog of war, global mana, connected players & chip linking
    ("12-app-utils.js",          7192, 7338),  # dark mode, undo system, skill collapse, skill tooltip
    ("13-turn-and-init.js",      7339, 7392),  # turn counter + INIT, must load last
]

for fname, (start, end) in css_chunks.items():
    with io.open(f"src/css/{fname}", "w", encoding="utf-8") as out:
        out.write(chunk(start, end).rstrip() + "\n")

for fname, start, end in js_chunks:
    with io.open(f"src/js/{fname}", "w", encoding="utf-8") as out:
        out.write(chunk(start, end).rstrip() + "\n")

# ---- Body markup (everything between <body> and the big script block) ----
# Original: <body> at 2427, big script starts at 2989.
# We exclude the canvas tag (1248) from head and re-insert it at the very
# top of body instead (it was only in <head> due to an HTML-parser quirk
# that auto-relocated it -- functionally it always belonged in the body).
body_markup = chunk(2429, 2988)  # skip the blank line right after <body>

with io.open("canvas_tag.html", "w", encoding="utf-8") as out:
    out.write(chunk(1248, 1248))

print("Extraction complete.")
for fname in css_chunks:
    print("  css/" + fname)
for fname, *_ in js_chunks:
    print("  js/" + fname)

with io.open("body_markup.html", "w", encoding="utf-8") as out:
    out.write(body_markup)
