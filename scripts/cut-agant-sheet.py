#!/usr/bin/env python3
"""
Cut the agANT character sheet into individual transparent poses.

The sheet is a 4-across, 2-down grid of numbered poses on a white background, with a
caption block above each pose and a banner strip along the bottom. This slices the
grid, drops the caption band, knocks the white out to alpha, trims to the ink, and
writes one PNG per pose into /agant/ under the key names agant.js already looks for.

    python3 scripts/cut-agant-sheet.py brand/agant/source/sheet.png

Flags worth knowing:
    --caption 0.14   fraction of each cell's height treated as caption (dropped)
    --banner  0.06   fraction of the sheet's height at the bottom that is banner
    --thresh  238    pixels brighter than this in all channels become transparent
    --pad     12     transparent padding kept around each trimmed pose
Tune and re-run; it never overwrites the source.
"""
import argparse
import os
import sys

from PIL import Image

# Grid order, left→right then top→bottom, mapped to the pose keys in agant.js.
# (sheet caption ............... -> pose key)
POSES = [
    ("1 incoming call",   "call"),      # phone to ear — in-call state
    ("2 pay to connect",  "welcome"),   # pointing — "the line's this way"
    ("3 payment success", "approved"),  # fist up — "conversation approved"
    ("4 connected",       "backend"),   # at the desk, headset — member dashboard
    ("5 goodbye",         "seeya"),     # waving — call ended
    ("6 earned",          "coin"),      # 72% bag — pricing / payout
    ("7 share & grow",    "director"),  # megaphone — owner dashboard
    ("8 velvet rope",     "boss"),      # arms crossed at the rope — hero corner
]

COLS, ROWS = 4, 2


def white_to_alpha(im, thresh):
    """Make near-white pixels transparent. Keeps the character's own light pixels
    (shoe whites, shirt) intact wherever they're enclosed by darker ink, because the
    trim below works on the alpha channel, not on colour."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= thresh and g >= thresh and b >= thresh:
                px[x, y] = (r, g, b, 0)
    return im


def flood_clear(im, thresh):
    """Clear the white BACKGROUND only — flood from the edges inward — so white
    sneakers and shirt cuffs survive instead of becoming holes."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    stack += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        r, g, b, a = px[x, y]
        if not (r >= thresh and g >= thresh and b >= thresh):
            continue
        seen[i] = 1
        px[x, y] = (r, g, b, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def trim(im, pad):
    box = im.split()[-1].getbbox()  # bbox of non-transparent pixels
    if not box:
        return im
    l, t, r, b = box
    l, t = max(l - pad, 0), max(t - pad, 0)
    r, b = min(r + pad, im.width), min(b + pad, im.height)
    return im.crop((l, t, r, b))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--out", default="agant")
    ap.add_argument("--caption", type=float, default=0.14)
    ap.add_argument("--banner", type=float, default=0.06)
    ap.add_argument("--thresh", type=int, default=238)
    ap.add_argument("--pad", type=int, default=12)
    a = ap.parse_args()

    if not os.path.exists(a.sheet):
        sys.exit(f"No sheet at {a.sheet} — upload it first.")

    sheet = Image.open(a.sheet).convert("RGBA")
    W, H = sheet.size
    H_use = int(H * (1 - a.banner))  # drop the bottom banner strip
    cw, ch = W // COLS, H_use // ROWS
    print(f"sheet {W}x{H} → cell {cw}x{ch} (banner {H-H_use}px dropped)")

    os.makedirs(a.out, exist_ok=True)
    for i, (label, key) in enumerate(POSES):
        cx, cy = (i % COLS) * cw, (i // COLS) * ch
        cell = sheet.crop((cx, cy + int(ch * a.caption), cx + cw, cy + ch))
        cell = flood_clear(cell, a.thresh)
        cell = trim(cell, a.pad)
        path = os.path.join(a.out, f"{key}.png")
        cell.save(path, "PNG", optimize=True)
        print(f"  {label:20s} → {path}  {cell.width}x{cell.height}")

    print("\nDone. Poses are wired in agant.js — commit /agant/ and they go live.")


if __name__ == "__main__":
    main()
