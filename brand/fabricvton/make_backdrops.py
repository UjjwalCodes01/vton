#!/usr/bin/env python3
"""Procedural silk-fold backdrops for the company site (hero, approach, CTA).

There is no clean, text-free fabric photography in the repo (the design PDF flattens its backdrops
under the text), so these are generated: a domain-warped, directionally stretched noise height field,
lit like satin (diffuse + a broad soft sheen). Pure atmosphere: they carry no information and are soft
enough to sit behind text. Replace with real photography when it is exported.

Standard library only (plus sips/cwebp via prepare_assets). Usage: python3 brand/fabricvton/make_backdrops.py
"""
import math
import os
import shutil
import tempfile

from prepare_assets import OUT, write_png, cwebp

W, H = 800, 450  # computed small and upscaled by cwebp: the folds are low-frequency


def _hash(ix, iy, seed):
    n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def noise(x, y, seed):
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a, b = _hash(ix, iy, seed), _hash(ix + 1, iy, seed)
    c, d = _hash(ix, iy + 1, seed), _hash(ix + 1, iy + 1, seed)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy


def fbm(x, y, seed, octaves=4):
    v, amp, f, tot = 0.0, 0.5, 1.0, 0.0
    for o in range(octaves):
        v += amp * noise(x * f, y * f, seed + o * 17)
        tot += amp
        amp *= 0.5
        f *= 2.03
    return v / tot


ANGLE = -0.45  # fold direction
CA, SA = math.cos(ANGLE), math.sin(ANGLE)


def height(u, v, seed):
    # rotate, then stretch: long folds along one direction, tight across it
    a = u * CA - v * SA
    b = u * SA + v * CA
    # domain warp for organic, non-repeating folds
    wx = fbm(a * 1.3 + 3.1, b * 1.3, seed + 5, 3) - 0.5
    wy = fbm(a * 1.3, b * 1.3 + 7.7, seed + 9, 3) - 0.5
    x = a * 0.85 + wx * 1.5
    y = b * 2.1 + wy * 1.5
    return fbm(x, y, seed, 3) * 2.6


def render(palette, sheen, side_fade=0.0, seed=3, gain=3.3):
    (sr, sg, sb), (hr, hg, hb) = palette
    lx, ly, lz = -0.5, -0.6, 0.62
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    # half vector for the satin sheen
    hx, hy, hz = lx, ly, lz + 1.0
    hn = math.sqrt(hx * hx + hy * hy + hz * hz)
    hx, hy, hz = hx / hn, hy / hn, hz / hn
    e = 0.004
    aspect = H / W
    out = bytearray(W * H * 3)
    for y in range(H):
        v = (y / H) * aspect
        for x in range(W):
            u = x / W
            h0 = height(u, v, seed)
            dhu = (height(u + e, v, seed) - h0) / e
            dhv = (height(u, v + e, seed) - h0) / e
            nx, ny, nz = -gain * dhu * 0.1, -gain * dhv * 0.1, 1.0
            nn = math.sqrt(nx * nx + ny * ny + nz * nz)
            nx, ny, nz = nx / nn, ny / nn, nz / nn
            d = max(0.0, nx * lx + ny * ly + nz * lz)
            s = max(0.0, nx * hx + ny * hy + nz * hz) ** 28
            t = min(1.0, 0.10 + 0.90 * d ** 1.05)
            fade = 1.0 - side_fade * (u ** 1.25)
            r = (sr + (hr - sr) * t + 255 * sheen * s) * fade
            g = (sg + (hg - sg) * t + 255 * sheen * s) * fade
            b = (sb + (hb - sb) * t + 255 * sheen * s) * fade
            i = (y * W + x) * 3
            out[i] = max(0, min(255, int(r)))
            out[i + 1] = max(0, min(255, int(g)))
            out[i + 2] = max(0, min(255, int(b)))
    return out


def save(name, rgb, width=1600, q=76):
    tmp = tempfile.mkdtemp()
    png = os.path.join(tmp, name + ".png")
    write_png(png, W, H, rgb, 3)
    cwebp(png, os.path.join(OUT, name + ".webp"), resize_w=width, q=q)
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    print("drape-light")
    save("drape-light", render(((219, 205, 186), (254, 251, 245)), sheen=0.10, seed=3))
    print("drape-dark")
    save("drape-dark", render(((12, 9, 8), (150, 128, 108)), sheen=0.16, side_fade=0.9, seed=11))
