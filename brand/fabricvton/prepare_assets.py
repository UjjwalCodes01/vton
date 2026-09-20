#!/usr/bin/env python3
"""Prepare the FabricVTON company-site brand assets from the supplied originals.

The originals in this folder are 2000x2000 opaque images (no alpha channel).
This script produces web-ready transparent WebP/PNG files WITHOUT redrawing or
re-typesetting anything: every output pixel comes from the supplied art.

  * Fabric forms (cream / graphite): real alpha from a border flood-fill of the
    white background, then a 1px erode + 1px feather so no white halo remains.
    The two forms are separate connected shapes, so they are also written as
    two aligned layers for the hero parallax.
  * Wordmarks / thin type: exact "white to alpha" using the glyphs' own core
    colour, so anti-aliased edges are preserved and nothing is thickened.

Standard library only. Needs macOS `sips` (decode / resize) and `cwebp`.
Usage:  python3 brand/fabricvton/prepare_assets.py
"""
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "fabricvton-nextjs", "public", "brand"))
PAGE_BG = (250, 249, 246)  # --fv-bg


# --------------------------------------------------------------------------
# IO helpers
# --------------------------------------------------------------------------
def load_rgb(path):
    """Decode any image sips understands into (w, h, RGB bytearray, top-down)."""
    tmp = tempfile.mkdtemp()
    bmp = os.path.join(tmp, "x.bmp")
    subprocess.run(["sips", "-s", "format", "bmp", path, "--out", bmp],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    d = open(bmp, "rb").read()
    shutil.rmtree(tmp, ignore_errors=True)
    off = struct.unpack("<I", d[10:14])[0]
    w, h = struct.unpack("<ii", d[18:26])
    assert struct.unpack("<H", d[28:30])[0] == 24, "expected 24-bit BMP from sips"
    top_down = h < 0
    h = abs(h)
    stride = (w * 3 + 3) // 4 * 4
    out = bytearray(w * h * 3)
    for y in range(h):
        sy = y if top_down else h - 1 - y
        r = d[off + sy * stride: off + sy * stride + w * 3]
        o = y * w * 3
        out[o:o + w * 3:3] = r[2::3]
        out[o + 1:o + w * 3:3] = r[1::3]
        out[o + 2:o + w * 3:3] = r[0::3]
    return w, h, out


def write_png(path, w, h, data, channels):
    ctype = {3: 2, 4: 6}[channels]

    def chunk(t, body):
        c = struct.pack(">I", len(body)) + t + body
        return c + struct.pack(">I", zlib.crc32(t + body) & 0xFFFFFFFF)

    stride = w * channels
    raw = b"".join(b"\x00" + bytes(data[y * stride:(y + 1) * stride]) for y in range(h))
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 6))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


def cwebp(png, out, resize_w=None, q=90):
    cmd = ["cwebp", "-quiet", "-q", str(q), "-alpha_q", "100", "-m", "6", "-sharp_yuv"]
    if resize_w:
        cmd += ["-resize", str(resize_w), "0"]
    subprocess.run(cmd + [png, "-o", out], check=True)
    print("  wrote", os.path.relpath(out, os.path.join(HERE, "..", "..")), os.path.getsize(out) // 1024, "KB")


# --------------------------------------------------------------------------
# Cut-out primitives (all operate on a rectangle of the source image)
# --------------------------------------------------------------------------
def min_channel(rgb, w, rect):
    x0, y0, x1, y1 = rect
    rw = x1 - x0
    m = bytearray(rw * (y1 - y0))
    for y in range(y0, y1):
        row = rgb[(y * w + x0) * 3:(y * w + x1) * 3]
        r, g, b = row[0::3], row[1::3], row[2::3]
        m[(y - y0) * rw:(y - y0 + 1) * rw] = bytes(map(min, r, g, b))
    return m


def flood_background(m, rw, rh, thr):
    bg = bytearray(rw * rh)
    stack = []

    def push(i):
        if not bg[i] and m[i] >= thr:
            bg[i] = 1
            stack.append(i)

    for x in range(rw):
        push(x)
        push((rh - 1) * rw + x)
    for y in range(rh):
        push(y * rw)
        push(y * rw + rw - 1)
    while stack:
        i = stack.pop()
        y, x = divmod(i, rw)
        if x > 0:
            push(i - 1)
        if x < rw - 1:
            push(i + 1)
        if y > 0:
            push(i - rw)
        if y < rh - 1:
            push(i + rw)
    return bg


def erode4(mask, w, h):
    out = bytearray(w * h)
    zero = bytes(w)
    for y in range(h):
        r = mask[y * w:(y + 1) * w]
        u = mask[(y - 1) * w:y * w] if y > 0 else zero
        d = mask[(y + 1) * w:(y + 2) * w] if y < h - 1 else zero
        left = b"\x00" + bytes(r[:-1])
        right = bytes(r[1:]) + b"\x00"
        out[y * w:(y + 1) * w] = bytes(a & b & c & e & f for a, b, c, e, f in zip(r, u, d, left, right))
    return out


def feather3(mask01, w, h):
    """3x3 box blur of a 0/1 mask -> 0..255 alpha."""
    zero = [0] * w
    hs = []
    for y in range(h):
        r = mask01[y * w:(y + 1) * w]
        row = [0] * w
        prev = 0
        for x in range(w):
            nxt = r[x + 1] if x + 1 < w else 0
            row[x] = prev + r[x] + nxt
            prev = r[x]
        hs.append(row)
    out = bytearray(w * h)
    for y in range(h):
        a = hs[y - 1] if y > 0 else zero
        b = hs[y]
        c = hs[y + 1] if y < h - 1 else zero
        out[y * w:(y + 1) * w] = bytes(min(255, (p + q + s) * 255 // 9) for p, q, s in zip(a, b, c))
    return out


def label4(mask, w, h):
    """4-connected component labels (0 = background). Returns (labels, areas)."""
    lab = [0] * (w * h)
    areas = {}
    nxt = 0
    for s in range(w * h):
        if mask[s] and not lab[s]:
            nxt += 1
            lab[s] = nxt
            st = [s]
            n = 0
            while st:
                i = st.pop()
                n += 1
                y, x = divmod(i, w)
                for j, ok in ((i - 1, x > 0), (i + 1, x < w - 1), (i - w, y > 0), (i + w, y < h - 1)):
                    if ok and mask[j] and not lab[j]:
                        lab[j] = nxt
                        st.append(j)
            areas[nxt] = n
    return lab, areas


class Canvas:
    """RGBA canvas the size of the source image."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = bytearray(w * h * 4)

    def put_rows(self, rect, rgb_src, sw, alpha, color=None):
        """Write a rect: colours from rgb_src (or a constant `color`), alpha from `alpha`."""
        x0, y0, x1, y1 = rect
        rw = x1 - x0
        for y in range(y0, y1):
            a = alpha[(y - y0) * rw:(y - y0 + 1) * rw]
            o = (y * self.w + x0) * 4
            if color is None:
                src = rgb_src[(y * sw + x0) * 3:(y * sw + x1) * 3]
                self.px[o:o + rw * 4:4] = src[0::3]
                self.px[o + 1:o + rw * 4:4] = src[1::3]
                self.px[o + 2:o + rw * 4:4] = src[2::3]
            else:
                self.px[o:o + rw * 4:4] = bytes([color[0]]) * rw
                self.px[o + 1:o + rw * 4:4] = bytes([color[1]]) * rw
                self.px[o + 2:o + rw * 4:4] = bytes([color[2]]) * rw
            self.px[o + 3:o + rw * 4:4] = a

    def bbox(self, thr=8):
        x0, y0, x1, y1 = self.w, self.h, -1, -1
        for y in range(self.h):
            a = self.px[y * self.w * 4 + 3:(y + 1) * self.w * 4:4]
            if max(a) > thr:
                if y < y0:
                    y0 = y
                y1 = y
                xs = [i for i, v in enumerate(a) if v > thr]
                x0 = min(x0, xs[0])
                x1 = max(x1, xs[-1])
        return x0, y0, x1 + 1, y1 + 1

    def crop(self, rect):
        x0, y0, x1, y1 = rect
        out = bytearray((x1 - x0) * (y1 - y0) * 4)
        for y in range(y0, y1):
            out[(y - y0) * (x1 - x0) * 4:(y - y0 + 1) * (x1 - x0) * 4] = \
                self.px[(y * self.w + x0) * 4:(y * self.w + x1) * 4]
        return x1 - x0, y1 - y0, out


def cut_object(rgb, w, rect, bg_thr=246):
    """Opaque object on light background -> (alpha 0..255, object mask 0/1)."""
    x0, y0, x1, y1 = rect
    rw, rh = x1 - x0, y1 - y0
    m = min_channel(rgb, w, rect)
    bg = flood_background(m, rw, rh, bg_thr)
    obj = bytearray(0 if b else 1 for b in bg)
    alpha = feather3(erode4(obj, rw, rh), rw, rh)
    return alpha, obj


def cut_ink(rgb, w, rect, dead=6):
    """Thin type / lines on light background -> (alpha, foreground colour)."""
    x0, y0, x1, y1 = rect
    rw, rh = x1 - x0, y1 - y0
    m = min_channel(rgb, w, rect)
    core = min(m)
    # foreground colour = mean of the darkest pixels (avoid anti-aliased edges)
    n = sr = sg = sb = 0
    for y in range(rh):
        for x in range(rw):
            if m[y * rw + x] <= core + 8:
                i = ((y0 + y) * w + x0 + x) * 3
                sr += rgb[i]
                sg += rgb[i + 1]
                sb += rgb[i + 2]
                n += 1
    color = (sr // n, sg // n, sb // n)
    span = max(1, 255 - core - dead)
    lut = [0 if 255 - v < dead else min(255, (255 - v - dead) * 255 // span) for v in range(256)]
    return bytearray(lut[v] for v in m), color


def split_components(alpha, obj, rw, rh, min_area=5000):
    lab, areas = label4(obj, rw, rh)
    big = sorted((a, l) for l, a in areas.items() if a >= min_area)[::-1]
    layers = []
    for _, l in big:
        layers.append(bytearray(a if lab[i] == l else 0 for i, a in enumerate(alpha)))
    return layers


def over(px, w, h, bg):
    """Composite RGBA over an opaque colour -> RGB bytearray."""
    out = bytearray(w * h * 3)
    for i in range(w * h):
        a = px[i * 4 + 3]
        for c in range(3):
            out[i * 3 + c] = (px[i * 4 + c] * a + bg[c] * (255 - a) + 127) // 255
    return out


# --------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()

    # ---- 1. The fabric mark (symbol only): two aligned layers + merged -------
    print("mark")
    w, h, rgb = load_rgb(os.path.join(HERE, "mark.webp"))
    rect = (580, 520, 1420, 1460)
    rw, rh = rect[2] - rect[0], rect[3] - rect[1]
    alpha, obj = cut_object(rgb, w, rect)
    layers = split_components(alpha, obj, rw, rh)
    assert len(layers) == 2, "expected the two fabric forms, got %d shapes" % len(layers)
    # cream is the one whose bbox starts further up / is lighter: decide by mean luminance
    def mean_lum(layer):
        s = n = 0
        for i, a in enumerate(layer):
            if a == 255:
                y, x = divmod(i, rw)
                j = ((rect[1] + y) * w + rect[0] + x) * 3
                s += rgb[j] + rgb[j + 1] + rgb[j + 2]
                n += 1
        return s / max(1, n)
    layers.sort(key=mean_lum, reverse=True)
    cream_a, graphite_a = layers

    canv = {}
    for name, a in (("cream", cream_a), ("graphite", graphite_a), ("merged", alpha)):
        c = Canvas(w, h)
        c.put_rows(rect, rgb, w, a)
        canv[name] = c
    bb = canv["merged"].bbox()
    pad = 14
    bb = (bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad)
    print("  mark bbox in source:", bb, "size", (bb[2] - bb[0], bb[3] - bb[1]))
    for name in ("cream", "graphite", "merged"):
        cw, ch, data = canv[name].crop(bb)
        p = os.path.join(tmp, "mark-%s.png" % name)
        write_png(p, cw, ch, data, 4)
        cwebp(p, os.path.join(OUT, "mark-%s.webp" % name), q=92)
        if name == "merged":
            mark_w, mark_h, mark_px = cw, ch, data
            shutil.copy(p, os.path.join(tmp, "mark.png"))

    # ---- 1b. Fabric texture crops (real pixels from inside the forms) --------
    # Largest fully-opaque 1.6:1 rectangles inside each form. Used as imagery
    # for the research fields until dedicated photography exists.
    print("fabric textures")

    def best_rect(alpha_layer, aspect=1.6, stride=6, exclude=None):
        opaque = [1 if a == 255 else 0 for a in alpha_layer]
        if exclude:
            ex0, ey0, ex1, ey1 = exclude
            for y in range(ey0, ey1):
                for x in range(ex0, ex1):
                    opaque[y * rw + x] = 0
        # integral image
        integ = [[0] * (rw + 1) for _ in range(rh + 1)]
        for y in range(rh):
            run = 0
            row, prev = integ[y + 1], integ[y]
            for x in range(rw):
                run += opaque[y * rw + x]
                row[x + 1] = prev[x + 1] + run
        for cw_ in range(640, 160, -8):
            ch_ = int(cw_ / aspect)
            for y in range(0, rh - ch_, stride):
                for x in range(0, rw - cw_, stride):
                    tot = (integ[y + ch_][x + cw_] - integ[y][x + cw_]
                           - integ[y + ch_][x] + integ[y][x])
                    if tot == cw_ * ch_:
                        return (x + 4, y + 4, x + cw_ - 4, y + ch_ - 4)
        raise RuntimeError("no interior rectangle found")

    def save_crop(name, sx0, sy0, sx1, sy1):
        cw_, ch_ = sx1 - sx0, sy1 - sy0
        buf = bytearray(cw_ * ch_ * 3)
        for y in range(ch_):
            buf[y * cw_ * 3:(y + 1) * cw_ * 3] = rgb[((sy0 + y) * w + sx0) * 3:((sy0 + y) * w + sx0 + cw_) * 3]
        p_ = os.path.join(tmp, name + ".png")
        write_png(p_, cw_, ch_, buf, 3)
        cwebp(p_, os.path.join(OUT, name + ".webp"), q=86)
        print("   ", name, (cw_, ch_))

    ox0, oy0 = rect[0], rect[1]
    r1 = best_rect(cream_a)
    save_crop("fabric-cream-1", ox0 + r1[0], oy0 + r1[1], ox0 + r1[2], oy0 + r1[3])
    r2 = best_rect(cream_a, exclude=r1)
    save_crop("fabric-cream-2", ox0 + r2[0], oy0 + r2[1], ox0 + r2[2], oy0 + r2[3])
    g1 = best_rect(graphite_a)
    save_crop("fabric-graphite-1", ox0 + g1[0], oy0 + g1[1], ox0 + g1[2], oy0 + g1[3])
    # one crop across the gap between the two forms: "two materials in relation"
    save_crop("fabric-relation", 840, 985, 1160, 1185)

    # ---- 2. Horizontal lockup (symbol + FabricVTON wordmark) -----------------
    print("lockup-horizontal")
    w, h, rgb = load_rgb(os.path.join(HERE, "lockup-horizontal.png"))
    c = Canvas(w, h)
    r_sym = (150, 700, 595, 1250)
    a, _ = cut_object(rgb, w, r_sym)
    c.put_rows(r_sym, rgb, w, a)
    r_txt = (595, 700, 1850, 1250)
    a, col = cut_ink(rgb, w, r_txt)
    print("  wordmark colour", col)
    c.put_rows(r_txt, rgb, w, a, color=col)
    bb = c.bbox()
    bb = (bb[0] - 6, bb[1] - 6, bb[2] + 6, bb[3] + 6)
    lw, lh, ldata = c.crop(bb)
    p = os.path.join(tmp, "lockup.png")
    write_png(p, lw, lh, ldata, 4)
    cwebp(p, os.path.join(OUT, "lockup-horizontal.webp"), resize_w=900, q=92)
    lockup_wh = (lw, lh, ldata)

    # ---- 3. Clothsy AI "powered by FabricVTON" lockup -----------------------
    print("clothsy-powered-by")
    w, h, rgb = load_rgb(os.path.join(HERE, "clothsy-powered-by-fabricvton.webp"))
    c = Canvas(w, h)
    for rect_, kind in (
        ((250, 560, 1850, 975), "ink"),      # Clothsy wordmark + AI chip
        ((300, 990, 660, 1050), "ink"),      # left hairline
        ((665, 990, 1335, 1060), "ink"),     # POWERED BY
        ((1335, 990, 1750, 1050), "ink"),    # right hairline
        ((280, 1080, 660, 1520), "obj"),     # fabric mark
        ((660, 1180, 1800, 1400), "ink"),    # FabricVTON wordmark
    ):
        if kind == "obj":
            a, _ = cut_object(rgb, w, rect_, bg_thr=246)
            c.put_rows(rect_, rgb, w, a)
        else:
            a, col = cut_ink(rgb, w, rect_)
            c.put_rows(rect_, rgb, w, a, color=col)
    bb = c.bbox()
    bb = (bb[0] - 6, bb[1] - 6, bb[2] + 6, bb[3] + 6)
    cw, ch, data = c.crop(bb)
    p = os.path.join(tmp, "clothsy.png")
    write_png(p, cw, ch, data, 4)
    cwebp(p, os.path.join(OUT, "clothsy-powered-by.webp"), resize_w=1000, q=92)

    # ---- 4. Icons + Open Graph image ---------------------------------------
    print("icons + og")
    S = 1200
    sq = Canvas(S, S)
    ox, oy = (S - mark_w) // 2, (S - mark_h) // 2
    for y in range(mark_h):
        o = ((oy + y) * S + ox) * 4
        sq.px[o:o + mark_w * 4] = mark_px[y * mark_w * 4:(y + 1) * mark_w * 4]
    p = os.path.join(tmp, "icon-square.png")
    write_png(p, S, S, sq.px, 4)
    for size, name in ((32, "favicon-32.png"), (192, "icon-192.png"), (512, "icon-512.png")):
        subprocess.run(["sips", "-Z", str(size), p, "--out", os.path.join(OUT, name)],
                       check=True, stdout=subprocess.DEVNULL)
        print("  wrote", name)
    # apple-touch-icon: opaque page background, mark at ~62% of the square
    ap = Canvas(S, S)
    ap.px[:] = bytes(PAGE_BG + (255,)) * (S * S)
    # mark is 740x~880 native; place native-size mark scaled by drawing at 1:1 inside a 1200 canvas
    # (native mark already occupies ~73% of height) then let sips downscale.
    for y in range(mark_h):
        for x in range(0, mark_w):
            i = (y * mark_w + x) * 4
            a = mark_px[i + 3]
            if a:
                j = ((oy + y) * S + ox + x) * 4
                for k in range(3):
                    ap.px[j + k] = (mark_px[i + k] * a + PAGE_BG[k] * (255 - a) + 127) // 255
    p2 = os.path.join(tmp, "apple.png")
    write_png(p2, S, S, ap.px, 4)
    subprocess.run(["sips", "-Z", "180", p2, "--out", os.path.join(OUT, "apple-touch-icon.png")],
                   check=True, stdout=subprocess.DEVNULL)
    print("  wrote apple-touch-icon.png")

    # OG image 1200x630: page background + horizontal lockup, composed at 2x then downscaled
    OW, OH = 2400, 1260
    lw, lh, ldata = lockup_wh
    og = bytearray(bytes(PAGE_BG) * (OW * OH))
    ox, oy = (OW - lw) // 2, (OH - lh) // 2
    for y in range(lh):
        for x in range(lw):
            i = (y * lw + x) * 4
            a = ldata[i + 3]
            if a:
                j = ((oy + y) * OW + ox + x) * 3
                for k in range(3):
                    og[j + k] = (ldata[i + k] * a + PAGE_BG[k] * (255 - a) + 127) // 255
    p3 = os.path.join(tmp, "og.png")
    write_png(p3, OW, OH, og, 3)
    subprocess.run(["sips", "-z", "630", "1200", p3, "--out", os.path.join(OUT, "og.png")],
                   check=True, stdout=subprocess.DEVNULL)
    print("  wrote og.png")

    shutil.rmtree(tmp, ignore_errors=True)
    print("done ->", OUT)


if __name__ == "__main__":
    sys.exit(main())
