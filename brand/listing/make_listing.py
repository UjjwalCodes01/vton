#!/usr/bin/env python3
"""Crop a Shopify-admin screenshot of Clothsy AI to a 1600x900 App Store image.

Keeps only the app's own pane: removes the browser, Shopify's top bar and left
menu (they show the store name), and the OS taskbar. Anything left in the empty
space under the page content, such as a browser link tooltip, is cleared.

The pane is padded with its own background to 16:9 and scaled to 1600x900,
the size the Shopify App Store asks for. Layout is detected from pixel
colours, so full-screen and pre-cropped screenshots both work.

Usage: python3 make_listing.py RAW.png OUT.png
"""

import sys
from PIL import Image, ImageDraw

SIZE = (1600, 900)
PANE_BG = (241, 241, 241)  # Shopify admin page background


def crop_to_pane(im):
    px = im.load()
    w, h = im.size

    # The app pane starts at the first page-background row below Shopify's dark top bar.
    top = next(y for y in range(h) if px[w // 2, y] == PANE_BG)
    # Shopify's left menu is a slightly darker grey than the pane.
    probe_y = top + 300
    left = next(x for x in range(1, w // 2) if px[x, probe_y] == PANE_BG and px[x - 1, probe_y] != PANE_BG)
    # Right edge: last background column on the title bar row.
    right = max(x for x in range(left, w) if px[x, top + 20] == PANE_BG) + 1
    # Bottom: where the background stops down the empty right-hand margin.
    bottom = next((y for y in range(top + 80, h) if px[right - 20, y] != PANE_BG), h)

    pane = im.crop((left, top, right, bottom))
    pw, ph = pane.size
    ppx = pane.load()

    # Clear everything below the page content (browser tooltip, rounded frame
    # corners), judged on the centre of the pane where the cards are.
    def row_has_content(y):
        return any(abs(ppx[x, y][0] - PANE_BG[0]) > 10 for x in range(int(pw * 0.2), int(pw * 0.95), 2))

    content_bottom = max(y for y in range(ph) if row_has_content(y))
    draw = ImageDraw.Draw(pane)
    draw.rectangle([0, min(ph, content_bottom + 24), pw, ph], fill=PANE_BG)
    # The pane's rounded top corners show Shopify's frame (menu grey on the
    # left, the dark top bar on the right). Nothing of the app sits this close
    # to a corner, so square them off.
    draw.rectangle([0, 0, 13, 13], fill=PANE_BG)
    draw.rectangle([pw - 14, 0, pw, 13], fill=PANE_BG)
    return pane


def to_listing(pane):
    pw, ph = pane.size
    target = SIZE[0] / SIZE[1]
    # Pad with the page background to 16:9 (extra height goes under the content,
    # extra width is split evenly), then scale.
    if pw / ph > target:
        canvas = Image.new("RGB", (pw, round(pw / target)), PANE_BG)
        canvas.paste(pane, (0, 0))
    else:
        cw = round(ph * target)
        canvas = Image.new("RGB", (cw, ph), PANE_BG)
        canvas.paste(pane, ((cw - pw) // 2, 0))
    return canvas.resize(SIZE, Image.LANCZOS)


if __name__ == "__main__":
    raw, out = sys.argv[1], sys.argv[2]
    pane = crop_to_pane(Image.open(raw).convert("RGB"))
    result = to_listing(pane)
    result.save(out, optimize=True)
    print(f"{out}: {result.size[0]}x{result.size[1]} (app pane {pane.size[0]}x{pane.size[1]})")
