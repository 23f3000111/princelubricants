"""
Cuts the site's imagery out of the client's existing banners, and draws the favicon set
and the share image.

    python tools/build-images.py

Sources are in ../Prince Lubricants Images/, the old princelubricants.com banners. Most
of them carry headline type baked into the picture, so every crop box below was chosen
to sit clear of it. Where a sliver of type or a white ground could not be cropped away
on a flat background, it is painted out with that background's own colour. Nothing is
upscaled: these banners are about 1650px wide, so the site sets them under ink
overlays or inside framed panels rather than full-bleed at 2x.

Fonts for the share image (Oswald, Inter) are read from tools/data/, which is not
committed. Fetch them from github.com/google/fonts (ofl/oswald, ofl/inter).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "Prince Lubricants Images"
PHOTO = ROOT / "assets" / "img" / "photo"
BRAND = ROOT / "assets" / "img" / "brand"
DATA = ROOT / "tools" / "data"

GOLD = (255, 215, 0)
INK = (6, 6, 17)

# name: (source, crop box (left, top, right, bottom) or None for the whole frame)
CROPS = {
    "refinery": ("home_1.png", (940, 0, 1651, 680)),      # right of "YOUR ULTIMATE..." headline
    "formula": ("home_2.png", (0, 222, 1651, 680)),       # below the "VISION SINCE 1998" banner
    "touring": ("home_3.png", (20, 300, 705, 680)),       # the Civic, left of the packs
    "fleet": ("home_6.png", (830, 205, 1651, 680)),       # right of and below the headline
    "marine": ("home_7.png", (0, 0, 742, 680)),           # left of "Your Dependable..."
    "rig": ("w1.png", (955, 0, 1920, 872)),               # right of "We offer sustainable..."
    "pour": ("p9.png", None),                             # no type in frame
    "lab": ("prince_4.jpg", None),
    "handshake": ("prince_1.jpg", None),
}

# Stock photography under free licences, standing in until the client supplies its own
# (amendment 1, page 3). The downloads live in tools/data/stock/, which is not committed.
#   aston  Eric Joseph on Pexels, photo 35662012 (Pexels licence): a yellow Aston Martin
#          V12 Vantage; no free photograph of a yellow DBS Superleggera could be found
#   bike   Bobby Thapa on Unsplash, photo tnAYx91-Qn4 (Unsplash licence): a yellow and black
#          Ducati Panigale
# name: (file, crop box or None, widest edge in px)
STOCK = {
    "aston": ("am-front.jpg", (0, 900, 2000, 2250), 1400),
    "bike": ("bike-tnAYx91-Qn4.jpg", None, 1600),
}


def stock():
    made = []
    for name, (file, box, edge) in STOCK.items():
        img = Image.open(DATA / "stock" / file).convert("RGB")
        img = img.crop(box) if box else img
        img.thumbnail((edge, edge), Image.LANCZOS)
        made.append(save_webp(img, name))
    return made


def save_webp(img, name, quality=82):
    PHOTO.mkdir(parents=True, exist_ok=True)
    out = PHOTO / f"{name}.webp"
    img.save(out, "WEBP", quality=quality, method=6)
    return out


def flat_fill(img, box, sample_at):
    """Paints a box with the colour found at sample_at: lifts type off a flat ground."""
    colour = img.getpixel(sample_at)
    ImageDraw.Draw(img).rectangle(box, fill=colour)


def racing_range():
    """The FSR, GT Cooling, GT Racing brake fluid and Pro-Shift packs, on Prince yellow."""
    img = Image.open(SRC / "home_3.png").convert("RGB")
    flat_fill(img, (700, 190, 772, 252), (690, 300))   # the tail of "The Champion's Choice."
    return img.crop((705, 222, 1545, 645))


def fs1_jug():
    """The FS1 5W-30 jug. Its foot overhangs the banner onto white, so the white is
    blended into the yellow by how white each pixel is, which keeps the jug's edge."""
    img = Image.open(SRC / "home_4.png").convert("RGB")
    flat_fill(img, (1036, 88, 1090, 180), (1050, 200))   # the "d" of "Ester-Based"
    img = img.crop((1040, 60, 1610, 680))
    yellow = img.getpixel((20, 20))
    px = img.load()
    w, h = img.size
    for y in range(500, h):
        for x in range(w):
            r, g, b = px[x, y]
            t = max(0.0, min(1.0, (min(r, g, b) - 200) / 55))
            if t > 0:
                px[x, y] = tuple(round(c + (yc - c) * t) for c, yc in zip((r, g, b), yellow))
    return img


def fs1_duo():
    """The FS1 pair with the oil splash, lifted off its white ground to an alpha cut-out.
    Alpha comes from distance to white and is boosted so the jugs stay solid while the
    thin splash stays translucent, which is how oil reads on a dark ground."""
    img = Image.open(SRC / "info2.png").convert("RGB")
    ImageDraw.Draw(img).rectangle((440, 205, 896, 270), fill=(255, 255, 255))  # end of the headline
    img = img.crop((450, 215, 1545, 600))
    out = Image.new("RGBA", img.size)
    src, dst = img.load(), out.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            a = min(1.0, (255 - min(r, g, b)) / 255 * 1.7)
            if a <= 0.02:
                dst[x, y] = (0, 0, 0, 0)
                continue
            fg = tuple(max(0, min(255, round((c - (1 - a) * 255) / a))) for c in (r, g, b))
            dst[x, y] = (*fg, round(a * 255))
    return out


def p_glyph_mask(height):
    """The P from the client's logo, upsampled and thresholded so it stays crisp."""
    logo = Image.open(SRC / "logo.png").convert("RGBA")
    px = logo.load()
    xs, ys = [], []
    for y in range(22, 80):
        for x in range(15, 62):
            r, g, b, a = px[x, y]
            if a > 200 and r < 90 and g < 90 and b < 90:
                xs.append(x)
                ys.append(y)
    box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    glyph = logo.crop(box).convert("L").point(lambda v: 255 - v)  # dark P -> white mask
    scale = height / glyph.size[1]
    big = glyph.resize((round(glyph.size[0] * scale), height), Image.LANCZOS)
    return big.point(lambda v: 255 if v > 110 else 0)


def favicons():
    BRAND.mkdir(parents=True, exist_ok=True)
    size = 512
    tile = Image.new("RGB", (size, size), (0, 0, 0))
    ImageDraw.Draw(tile).rectangle((30, 30, size - 31, size - 31), fill=GOLD)
    mask = p_glyph_mask(330)
    tile.paste((0, 0, 0), ((size - mask.size[0]) // 2, (size - mask.size[1]) // 2), mask)
    outputs = {}
    for px in (16, 32, 48, 96, 180, 192, 512):
        name = "apple-touch-icon.png" if px == 180 else (f"icon-{px}.png" if px >= 192 else f"favicon-{px}.png")
        img = tile.resize((px, px), Image.LANCZOS)
        img.save(BRAND / name, optimize=True)
        outputs[px] = img
    outputs[48].save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    Image.open(SRC / "logo.png").save(BRAND / "logo.png", optimize=True)


def variable_font(file, size, weight_name):
    font = ImageFont.truetype(str(DATA / file), size)
    try:
        font.set_variation_by_name(weight_name)
    except Exception:
        pass
    return font


def wrap(draw, text, font, width, tracking):
    words, lines, line = text.split(), [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) + tracking * len(trial) > width and line:
            lines.append(line)
            line = word
        else:
            line = trial
    return lines + [line]


def draw_tracked(draw, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def share_image():
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    ImageDraw.Draw(glow).ellipse((760, -160, 1380, 460), fill=(40, 33, 6))
    img = glow.filter(ImageFilter.GaussianBlur(140))
    draw = ImageDraw.Draw(img)
    for x in range(0, w, 60):
        draw.line((x, 0, x, h), fill=(14, 14, 24))
    for y in range(0, h, 60):
        draw.line((0, y, w, y), fill=(14, 14, 24))

    ghost = variable_font("Oswald.ttf", 300, "Bold")
    gw = draw.textlength("1998", font=ghost)
    draw.text((w - gw - 40, 170), "1998", font=ghost, fill=(24, 21, 12))

    logo = Image.open(SRC / "logo.png").convert("RGBA")
    logo = logo.resize((round(logo.size[0] * 1.45), round(logo.size[1] * 1.45)), Image.LANCZOS)
    img.paste(logo, (80, 92), logo)

    draw.rectangle((84, 330, 144, 334), fill=GOLD)
    eyebrow = variable_font("Oswald.ttf", 44, "SemiBold")
    y = 356
    for line in wrap(draw, "SINGAPORE'S PERFORMANCE LUBRICANT SPECIALIST SINCE 1998.", eyebrow, 900, 2):
        draw_tracked(draw, (82, y), line, eyebrow, (255, 255, 255), 2)
        y += 58
    small = variable_font("Inter.ttf", 22, "Medium")
    draw_tracked(draw, (84, 548), "WWW.PRINCELUBRICANTS.COM", small, GOLD, 3)
    BRAND.mkdir(parents=True, exist_ok=True)
    img.save(BRAND / "og-default.jpg", quality=88, optimize=True)


def main():
    made = []
    for name, (file, box) in CROPS.items():
        img = Image.open(SRC / file).convert("RGB")
        made.append(save_webp(img.crop(box) if box else img, name))
    made.append(save_webp(racing_range(), "racing-range"))
    made.append(save_webp(fs1_jug(), "fs1"))
    made.append(save_webp(fs1_duo(), "fs1-duo", quality=86))
    made += stock()
    favicons()
    share_image()
    for path in made:
        with Image.open(path) as im:
            print(f"{path.relative_to(ROOT).as_posix():36s} {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB")
    for path in sorted(BRAND.iterdir()):
        print(f"{path.relative_to(ROOT).as_posix():36s} {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
