#!/usr/bin/env python3
"""
Prep individual agANT pose images for the site.

Use this when you already have poses as SEPARATE image files (any size, white or
transparent background). It knocks out white backgrounds, trims to the ink, resizes
to a sane web width, and writes PNGs into /agant/ under the pose keys agant.js reads.

    python3 scripts/prep-agant.py brand/agant/source/*.png

Naming: if a filename contains a pose key (boss, approved, call, welcome, coin,
seeya, backend, director, gate, onit, closed, splat, phonebill, zen, vibe) it's
matched automatically. Anything unmatched is listed at the end so you can rename it.
"""
import os, sys, glob
from PIL import Image

KEYS = ["boss","gate","welcome","coin","approved","call","onit","closed",
        "splat","phonebill","director","backend","zen","seeya","vibe"]
MAXW = 900   # plenty for a 96-120px display slot at 3x

def flood_clear(im, thresh=238):
    im = im.convert("RGBA"); w,h = im.size; px = im.load()
    seen = bytearray(w*h)
    stack = [(x,0) for x in range(w)]+[(x,h-1) for x in range(w)]
    stack += [(0,y) for y in range(h)]+[(w-1,y) for y in range(h)]
    while stack:
        x,y = stack.pop()
        if x<0 or y<0 or x>=w or y>=h: continue
        i = y*w+x
        if seen[i]: continue
        r,g,b,_ = px[x,y]
        if not (r>=thresh and g>=thresh and b>=thresh): continue
        seen[i]=1; px[x,y]=(r,g,b,0)
        stack += [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]
    return im

def trim(im, pad=10):
    box = im.split()[-1].getbbox()
    if not box: return im
    l,t,r,b = box
    return im.crop((max(l-pad,0), max(t-pad,0), min(r+pad,im.width), min(b+pad,im.height)))

def key_for(path):
    stem = os.path.splitext(os.path.basename(path))[0].lower()
    hits = [k for k in KEYS if k in stem]
    return max(hits, key=len) if hits else None

def main():
    files = [f for pat in sys.argv[1:] for f in glob.glob(pat)]
    if not files: sys.exit("usage: prep-agant.py <files...>")
    os.makedirs("agant", exist_ok=True)
    unmatched = []
    for f in files:
        k = key_for(f)
        if not k: unmatched.append(f); continue
        im = trim(flood_clear(Image.open(f)))
        if im.width > MAXW:
            im = im.resize((MAXW, round(im.height*MAXW/im.width)), Image.LANCZOS)
        out = f"agant/{k}.png"
        im.save(out, "PNG", optimize=True)
        print(f"  {os.path.basename(f):40s} → {out}  {im.width}x{im.height}")
    if unmatched:
        print("\nCouldn't match a pose key (rename to include one):")
        for f in unmatched: print("  ", f)
        print("  keys:", ", ".join(KEYS))

if __name__ == "__main__":
    main()
