#!/usr/bin/env python3
"""
bake-textures.py — pulls every picture out of the baked asset packs and
writes it to src/assets/tex/ as a real image file.

WHY THIS EXISTS
───────────────
Every pack (tools/bake*.py) writes its textures INTO the JavaScript, as
`data:image/jpeg;base64,...`. That was the right call when the app was one
file you could mail to somebody. It stopped being the right call at the
tavern, which carries twenty-seven 1024x1024 JPEGs — four megabytes of
picture, inside a seven megabyte script.

A data URI is the worst container an image can have:

  · base64 costs 33% on top of the bytes, forever;
  · the bytes go through the JAVASCRIPT parser, on the main thread,
    before the browser knows they are a picture at all;
  · and the decode cannot start until the whole script has been read.

The same picture as a .jpg on disk is fetched off-thread, decoded
off-thread, and never touches the JS parser.

AND THE RESOLUTION WAS NEVER NEEDED. A 1024x1024 albedo on a tavern stool
that is a hundred pixels tall on screen is not detail, it is 22 MB of RGBA
decoded at boot and uploaded to the card so it can be minified away by the
sampler. 512 is plenty; that is a quarter of the pixels, a quarter of the
decode, a quarter of the VRAM.

WHAT IT WRITES
──────────────
  src/assets/tex/<hash>.<ext>   one file per distinct picture
  src/assets/tex/manifest.json  { "<sha1 of the data URI>": "assets/tex/<hash>.<ext>" }

Files are named by the hash of their CONTENT, so a picture that appears in
two packs is written once and both packs point at it.

build.js reads the manifest and swaps the data URIs for those paths as it
stitches. The pack files themselves are never edited — they stay exactly as
their bake script wrote them, so re-baking a pack is still safe. Re-run this
afterwards to pick the new pictures up.

    python tools/bake-textures.py            # 512 cap (the default)
    python tools/bake-textures.py --max 256  # tighter
    python tools/bake-textures.py --clean    # drop pictures nothing points at
"""

import argparse
import base64
import hashlib
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
JS_DIR = ROOT / "src" / "js"
OUT_DIR = ROOT / "src" / "assets" / "tex"
MANIFEST = OUT_DIR / "manifest.json"

DATA_URI = re.compile(rb"data:image/([a-z+]+);base64,([A-Za-z0-9+/=]+)")

# ONLY THE BAKED PACKS, NAMED ONE BY ONE — never a glob over src/js.
#
# A glob finds two other things and is wrong about both. `32-combat-app.js`
# carries the 1x1 transparent GIF that suppresses the browser's drag ghost:
# it is app code, it is forty bytes, and turning it into a file the browser
# has to go and fetch would make the drag WORSE, not better. `19-chest-asset.js`
# is a superseded copy of 20- that nothing loads.
#
# This list mirrors the asset block in build.js. Adding a pack there means
# adding it here.
PACKS = [
    "01-castle-assets.js",
    "02-charge-assets.js",
    "20-chest-asset.js",
    "19-bin-asset.js",
    "17-wood-assets.js",
    "18-bits-assets.js",
    "33-dice-assets.js",
    "35-kit-assets.js",
    "36-sprite-assets.js",
    "52-room-assets.js",
    "53-tavern-assets.js",
]

# JPEG quality. 85 is the point where re-encoding a 1024 down to 512 stops
# being distinguishable from the original at any size this app draws it.
JPEG_Q = 85

# A picture is treated as opaque — and so may become a JPEG — only if NO pixel
# is meaningfully transparent. Anything else keeps its alpha and stays a PNG.
# The cutoff is not 255 because some bakes carry a 254 fringe from resampling.
ALPHA_SOLID = 250


def is_opaque(im):
    """True when the alpha channel carries no information worth keeping."""
    if im.mode not in ("RGBA", "LA", "PA") and "transparency" not in im.info:
        return True
    alpha = im.convert("RGBA").getchannel("A")
    lo, _hi = alpha.getextrema()
    return lo >= ALPHA_SOLID


def target_size(w, h, cap):
    """Longest edge down to `cap`, aspect kept, never upscaled.

    Power-of-two stays power-of-two — 13-hall3d.js wraps the castle textures
    with RepeatWrapping, and WebGL1 will not mipmap or repeat a NPOT texture.
    Since the cap is itself a power of two, halving preserves that for free.
    """
    longest = max(w, h)
    if longest <= cap:
        return None                       # already small enough; leave it alone
    k = cap / longest
    return (max(1, round(w * k)), max(1, round(h * k)))


def encode(im, kind, cap):
    """Resize if needed and re-encode. Returns (bytes, extension).

    THE SOURCE FORMAT IS THE AUTHOR'S SIGNAL, AND IT IS KEPT.
    ────────────────────────────────────────────────────────
    An opaque PNG is very tempting to turn into a JPEG — the castle's wall
    sheet went 193 KB to 18 KB that way. It is also wrong, and the reason is
    two lines further down in 13-hall3d.js:

        texture(root.CASTLE.tex.Walls, [12, 22])

    That sheet is TILED, twelve by twenty-two. JPEG works in 8x8 blocks and
    does not preserve the edge pixels exactly, so a tiled JPEG can show a
    faint grid where the seams line up — 264 copies of the same seam, which
    is the sort of artefact you notice without being able to say why. The
    same argument covers pixel-exact UI art and anything with a hard edge.

    A pack baked as a JPEG was already lossy and re-encoding it costs
    nothing new. A pack baked as a PNG was baked that way for a reason.
    So: resize everything, but never change what kind of picture it is.
    Almost all of the weight here is the tavern's 27 JPEGs anyway, and
    those are untouched by this rule.
    """
    size = target_size(im.width, im.height, cap)
    if size:
        # LANCZOS over BICUBIC: these are albedo maps with hard painted edges
        # (planks, banding, lettering) and bicubic softens them into mush at 2x
        # reduction. Lanczos keeps the edge and costs nothing here — this runs
        # once, offline.
        im = im.resize(size, Image.LANCZOS)

    if kind in ("jpeg", "jpg"):
        buf = io.BytesIO()
        im.convert("RGB").save(
            buf, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
        return buf.getvalue(), "jpg"

    # PNG stays PNG. optimize=True re-runs the deflate filter search, and an
    # opaque one drops its alpha channel — a quarter of the pixels gone with
    # no loss at all, which is most of what the JPEG conversion was winning.
    buf = io.BytesIO()
    im.convert("RGB" if is_opaque(im) else "RGBA").save(buf, "PNG", optimize=True)
    return buf.getvalue(), "png"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=512,
                    help="longest edge, in pixels (default 512)")
    ap.add_argument("--clean", action="store_true",
                    help="delete files in src/assets/tex nothing points at")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest = {}
    # Content hash -> written filename, so a picture shared by two packs is
    # written once.
    by_content = {}
    was = now = 0
    seen_files = 0

    for pack in PACKS:
        js = JS_DIR / pack
        if not js.exists():
            print(f"  !! {pack} is in PACKS but not on disk — skipped")
            continue
        raw = js.read_bytes()
        hits = DATA_URI.findall(raw)
        if not hits:
            continue

        pack_was = pack_now = 0
        for kind, b64 in hits:
            uri = b"data:image/" + kind + b";base64," + b64
            key = hashlib.sha1(uri).hexdigest()
            if key in manifest:
                continue                          # same URI twice in one pack

            try:
                src = base64.b64decode(b64)
                im = Image.open(io.BytesIO(src))
                im.load()
            except Exception as e:                # noqa: BLE001
                print(f"  !! {js.name}: undecodable image ({e}) — left inline")
                continue

            out, ext = encode(im, kind.decode(), args.max)

            # Content hash of the OUTPUT, so identical results share a file.
            digest = hashlib.sha1(out).hexdigest()[:16]
            name = by_content.get(digest)
            if not name:
                name = f"{digest}.{ext}"
                (OUT_DIR / name).write_bytes(out)
                by_content[digest] = name
                seen_files += 1

            manifest[key] = f"assets/tex/{name}"
            # The data URI is what actually sat in the file, base64 and all.
            pack_was += len(uri)
            pack_now += len(out)

        was += pack_was
        now += pack_now
        print(f"  {js.name:<24} {len(hits):>3} pictures  "
              f"{pack_was/1048576:>6.2f} MB inline -> {pack_now/1048576:>5.2f} MB on disk")

    MANIFEST.write_text(json.dumps(manifest, indent=0, sort_keys=True))

    if args.clean:
        keep = set(by_content.values()) | {"manifest.json"}
        for f in OUT_DIR.iterdir():
            if f.name not in keep:
                f.unlink()
                print(f"  -- dropped {f.name}")

    print()
    print(f"  {len(manifest)} pictures -> {seen_files} files in src/assets/tex/")
    print(f"  {was/1048576:.2f} MB of script  ->  {now/1048576:.2f} MB of images"
          f"   ({100 * (was - now) / was:.0f}% smaller)" if was else "  nothing to do")
    return 0


if __name__ == "__main__":
    sys.exit(main())
