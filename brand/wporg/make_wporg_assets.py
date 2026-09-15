#!/usr/bin/env python3
"""Build the WordPress.org plugin directory icons and banners for Clothsy AI.

WordPress.org reads these from the plugin's SVN /assets folder:
  icon-128x128.png, icon-256x256.png      square icon (search results, admin)
  banner-772x250.png, banner-1544x500.png header of the plugin page (1x, 2x)

The mark is cut out of the app icon, so it always matches the brand files.

Usage: python3 make_wporg_assets.py   (writes next to this script)
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
ICON = HERE.parent / "clothsy-ai-icon-1200.png"
FONT = "/usr/share/fonts/truetype/ubuntu/UbuntuSans[wdth,wght].ttf"

PURPLE = (98, 38, 252)
DEEP = (58, 16, 170)
WHITE = (255, 255, 255)
SOFT = (226, 216, 255)

# Where the white mark sits inside the 1200px app icon.
MARK_BOX = (383, 383, 816, 816)


def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([100, weight])  # width 100%, weight
    return f


def mark(height):
    """The white mark alone, as an RGBA image of the given height."""
    src = Image.open(ICON).convert("L").crop(MARK_BOX)
    alpha = src.point(lambda v: 255 if v > 200 else 0)
    scale = height / alpha.height
    alpha = alpha.resize((round(alpha.width * scale), height), Image.LANCZOS)
    out = Image.new("RGBA", alpha.size, WHITE + (0,))
    out.putalpha(alpha)
    return out


def gradient(size):
    """Diagonal brand gradient, lighter top-left to deeper bottom-right."""
    w, h = size
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x / 63) * 0.65 + (y / 63) * 0.35
            px[x, y] = tuple(round(PURPLE[i] + (DEEP[i] - PURPLE[i]) * t) for i in range(3))
    return small.resize(size, Image.BICUBIC)


def try_on_card(scale):
    """A stylised product card with a 'Try It On' button: the plugin at a glance."""
    w, h = round(210 * scale), round(236 * scale)
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    r = round(18 * scale)
    d.rounded_rectangle([0, 0, w - 1, h - 1], r, fill=WHITE + (255,))
    # Product photo area
    pad = round(14 * scale)
    photo = [pad, pad, w - pad, round(150 * scale)]
    d.rounded_rectangle(photo, round(12 * scale), fill=(237, 232, 255, 255))
    # A simple garment silhouette in the photo
    cx, top = (photo[0] + photo[2]) // 2, photo[1] + round(22 * scale)
    s = scale
    shirt = [
        (cx - 40 * s, top + 8 * s), (cx - 16 * s, top), (cx - 8 * s, top + 8 * s), (cx + 8 * s, top + 8 * s),
        (cx + 16 * s, top), (cx + 40 * s, top + 8 * s), (cx + 54 * s, top + 34 * s), (cx + 36 * s, top + 44 * s),
        (cx + 30 * s, top + 36 * s), (cx + 30 * s, top + 100 * s), (cx - 30 * s, top + 100 * s),
        (cx - 30 * s, top + 36 * s), (cx - 36 * s, top + 44 * s), (cx - 54 * s, top + 34 * s),
    ]
    d.polygon([(round(x), round(y)) for x, y in shirt], fill=PURPLE + (255,))
    # Title and price lines
    y = round(164 * scale)
    d.rounded_rectangle([pad, y, round(130 * scale), y + round(10 * scale)], round(5 * scale), fill=(40, 30, 70, 255))
    d.rounded_rectangle([pad, y + round(18 * scale), round(80 * scale), y + round(26 * scale)], round(4 * scale), fill=(170, 160, 200, 255))
    # Button
    b = [pad, round(196 * scale), w - pad, round(222 * scale)]
    d.rounded_rectangle(b, round(13 * scale), fill=PURPLE + (255,))
    f = font(round(13 * scale), 700)
    label = "Try It On"
    tw = d.textlength(label, font=f)
    d.text(((b[0] + b[2] - tw) / 2, (b[1] + b[3]) / 2), label, font=f, fill=WHITE, anchor="lm")
    return card


def banner(size):
    w, h = size
    s = h / 250  # 1 at 772x250, 2 at 1544x500
    img = gradient(size).convert("RGBA")

    # Soft light circles for depth
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([w * 0.58, -h * 0.55, w * 1.15, h * 1.05], fill=(255, 255, 255, 34))
    g.ellipse([w * 0.70, h * 0.35, w * 1.05, h * 1.45], fill=(255, 255, 255, 22))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(round(24 * s))))

    d = ImageDraw.Draw(img)
    left = round(44 * s)

    m = mark(round(52 * s))
    img.alpha_composite(m, (left, round(58 * s)))

    title = font(round(46 * s), 800)
    d.text((left + m.width + round(18 * s), round(58 * s) + m.height / 2), "Clothsy AI", font=title, fill=WHITE, anchor="lm")

    sub = font(round(22 * s), 500)
    d.text((left, round(142 * s)), "Virtual try-on for WooCommerce", font=sub, fill=WHITE)
    small = font(round(15 * s), 400)
    d.text((left, round(176 * s)), "Shoppers see your clothes on themselves before they buy.", font=small, fill=SOFT)

    # The card, tilted slightly, with a soft shadow
    card = try_on_card(s * 0.92).rotate(-6, resample=Image.BICUBIC, expand=True)
    x, y = round(w - card.width - 52 * s), round((h - card.height) / 2 + 4 * s)
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow.paste((20, 0, 60, 110), (x + round(6 * s), y + round(10 * s)), card.split()[3])
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(round(12 * s))))
    img.alpha_composite(card, (x, y))
    return img.convert("RGB")


def main():
    icon = Image.open(ICON).convert("RGB")
    for px in (128, 256):
        out = HERE / f"icon-{px}x{px}.png"
        icon.resize((px, px), Image.LANCZOS).save(out, optimize=True)
        print(out.name)
    for size in ((772, 250), (1544, 500)):
        out = HERE / f"banner-{size[0]}x{size[1]}.png"
        banner(size).save(out, optimize=True)
        print(out.name)


if __name__ == "__main__":
    main()
