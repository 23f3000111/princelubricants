"""
Builds the product catalogue from a crawl of the current princelubricants.com.

    python tools/build-products.py

Reads tools/data/oldsite/ (not committed; see the README for how it was made):
  lists.json     each range page of the current site, in its menu order: the ranges on it,
                 their one-line descriptions and their products, in order
  details.json   each product page: name, introduction, sizes, images and its tabs
  raw/           the product images, as the current site serves them

Writes:
  docs/content/products.json   six categories, their ranges and their 161 products
  assets/img/products/*.webp   each pack shot keyed off its white ground, trimmed, resized

The current site's order is kept. A category takes its ranges in the order of that site's
product menu (Racing, Motor oil, Gear oil, Automatic transmission fluid, Maintenance fluid,
Industrial, Metal processing, Maritime solution), and every range keeps its products in the
order the site shows them. Needs Pillow, numpy and scipy.
"""
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
CRAWL = ROOT / "tools" / "data" / "oldsite"
OUT_JSON = ROOT / "docs" / "content" / "products.json"
OUT_IMG = ROOT / "assets" / "img" / "products"
PACK_HEIGHT = 600          # px; cards show packs about 240px tall, the product page 460px

M, T, A, F = "pcars.html", "tfluid.html", "atfluid.html", "mfluid.html"
R, C, P, S = "racing_product.html", "ctrucks.html", "psport.html", "mspec.html"
I, X, Y = "industrial_oil_product.html", "metal_processing_product.html", "marine_solution_product.html"

# The six categories of the site, each with the current site's ranges it takes:
# (range page, range title[, only these product pages]). Every product lands exactly once.
CATEGORIES = [
    ("passenger-car", "Passenger Car", [
        (M, "FS1"), (M, "FS1 EUROGEN"), (M, "FSe"), (M, "FS SUPER"), (M, "SS1"), (M, "M Series"),
        (T, "PRO-SHIFT MTF"),
        (A, "ATF"), (A, "DCT"), (A, "CVT"),
        (F, "Non-silicone Brake & Clutch Fluid"),
        (F, "Antifreeze Coolant", ["coolant_g11_iat.html", "coolant_g12_plus_oat.html", "coolant_g13_oat.html"]),
        (F, "Hydraulic Fluid"),
    ]),
    ("motorsport", "Motorsport", [
        (R, "RACING MOTOR OIL"), (R, "RACING GEAR OILS"), (R, "RACING BRAKE FLUID"), (R, "RACING COOLANT"),
    ]),
    ("commercial-fleet", "Commercial Fleet", [
        (C, "D1 GOLD"), (C, "D1 GOLD 4X4"), (C, "D1"), (C, "Devo"),
        (T, "SUPER-SHIFT Series"),
        (F, "Antifreeze Coolant", ["coolant-heavy.html"]),
    ]),
    ("motorcycle", "Motorcycle", [
        (P, "MAXX GOLD 4T"), (P, "MAXX ULTRA 4T"), (P, "MAXX LAUNCH 4T"), (P, "MAXX SCOOTER RANGE"),
        (T, "MAXX-SHIFT Series"),
        (F, "Suspension Fork Oil"),
    ]),
    ("industrial", "Industrial", [
        (I, "Spindle Bearing Oils"), (I, "Refrigeration Oil"), (I, "Air Compressor Oil"), (I, "Turbine Oil"),
        (I, "Heat Transfer Oil"), (I, "Electrical Insulating Oil"), (I, "Hydraulic Oil"), (I, "Gear Oil"),
        (X, "Way Oils"), (X, "Neat Oils"), (X, "Emulsifiable / Soluble Oils"), (X, "Quenching Oils"),
    ]),
    ("marine", "Marine", [
        (S, "MARINO RACING 4T"), (S, "MARINO GOLD 4T"), (S, "MARINO SILVER 4T"), (S, "MARINO BLUE 2T"),
        (T, "MARINE TRANSMISSION SPECIALTIES"),
        (Y, "Cylinder Oils"), (Y, "Trunk Piston Engine Oils"), (Y, "Stern Tube Oils"), (Y, "Auxiliary Gear Oils"),
        (Y, "Turbine Oils"), (Y, "Hydraulic Oils"), (Y, "Compressor Oils"),
    ]),
]

# Range titles as the site shows them; the current site's capitals are kept where they are
# product names, and generic words are set in title case.
TITLES = {
    "RACING MOTOR OIL": "Racing Motor Oils", "RACING GEAR OILS": "Racing Gear Oils",
    "RACING BRAKE FLUID": "Racing Brake Fluid", "RACING COOLANT": "Racing Coolant",
    "MAXX SCOOTER RANGE": "MAXX SCOOTER", "SUPER-SHIFT Series": "SUPER-SHIFT", "MAXX-SHIFT Series": "MAXX-SHIFT",
    "MARINE TRANSMISSION SPECIALTIES": "Marine Transmission Specialties", "M Series": "M SERIES",
    "Non-silicone Brake & Clutch Fluid": "Brake & Clutch Fluids", "Antifreeze Coolant": "Antifreeze Coolants",
    "Hydraulic Fluid": "Hydraulic & Power Steering Fluids",
}

PREFIX = re.compile(r"^([A-Z][A-Za-z &/,.-]{2,40}):\s*(.+)$")

# Slips on the current site, corrected here so the fix survives a re-crawl.
FIXES = {"ILASC": "ILSAC", "Passanger": "Passenger", "Maintanence": "Maintenance", "Industiral": "Industrial"}


def slug(text):
    text = text.lower().replace("+", " plus ").replace("&", " and ").replace("°", "")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def tidy(text):
    text = re.sub(r"\s+", " ", text or "").strip()
    for wrong, right in FIXES.items():
        text = text.replace(wrong, right)
    return text


def blocks_of(raw):
    out = []
    for b in raw:
        if "table" in b:
            rows = [[tidy(c) for c in row] for row in b["table"] if any(tidy(c) for c in row)]
            if rows:
                out.append({"table": rows})
        elif "li" in b and tidy(b["li"]):
            out.append({"li": tidy(b["li"])})
        elif "p" in b and tidy(b["p"]):
            text = tidy(b["p"])
            m = PREFIX.match(text)
            out.append({"term": m.group(1), "p": m.group(2)} if m else {"p": text})
    return out


def spec_line(sections):
    """A short line for the product card: its first specifications, at most three."""
    for sec in sections:
        if sec["label"] in ("Specification", "Performance Levels"):
            texts = [b["p"] for b in sec["blocks"] if "p" in b]
            if not texts:
                continue
            if len(texts) == 1:
                parts = [t.strip() for t in texts[0].split(",") if t.strip()]
            else:
                parts = texts
            return " · ".join(parts[:3])
    return ""


def image_name(src):
    return slug(Path(src).stem)


def key_white(path):
    """The pack on a transparent ground: the white connected to the edges goes, then a trim."""
    im = Image.open(path).convert("RGBA")
    rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    # Near-pure white only: the white plastic packs (coolants, GT COOLING) are shaded a few
    # levels below the studio ground, and a looser threshold eats into them.
    white = rgb.min(axis=2) > 250
    labels, count = ndimage.label(white)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    ground = set(edge[edge > 0].tolist())
    # The hole in a jug's handle is ground too: white, enclosed and big (about 4% of the
    # frame). The white lettering on the labels is under 1%, so it stays.
    areas = ndimage.sum(white, labels, index=np.arange(1, count + 1))
    ground |= {i for i, area in enumerate(areas, start=1) if area >= 0.02 * white.size}
    pack = ~np.isin(labels, list(ground))
    # Pull the cut in by a pixel, which drops the white fringe of the anti-aliased edge, then
    # soften it so the edge does not stair-step on a coloured ground.
    pack = ndimage.binary_erosion(pack, iterations=1)
    alpha = np.where(pack, 255, 0).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.minimum(np.asarray(alpha_img), np.asarray(im.getchannel("A")))
    im.putalpha(Image.fromarray(alpha.astype(np.uint8), "L"))
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if box:
        im = im.crop(box)
    scale = PACK_HEIGHT / im.height
    if scale < 1:
        im = im.resize((round(im.width * scale), PACK_HEIGHT), Image.LANCZOS)
    return im


def main():
    lists = json.loads((CRAWL / "lists.json").read_text(encoding="utf-8"))
    details = json.loads((CRAWL / "details.json").read_text(encoding="utf-8"))
    ranges_by_page = {(l["file"], g["title"]): g for l in lists for g in l["groups"]}

    placed, taken_ids, images = {}, set(), set()
    categories = []
    for cid, name, sources in CATEGORIES:
        ranges = []
        for source in sources:
            page, title = source[0], source[1]
            only = source[2] if len(source) > 2 else None
            group = ranges_by_page[(page, title)]
            products = []
            for item in group["items"]:
                href = item["href"]
                if only and href not in only:
                    continue
                if href in placed:
                    raise SystemExit(f"{href} is in two ranges: {placed[href]} and {cid}/{title}")
                placed[href] = f"{cid}/{title}"
                det = details[href]
                pid = slug(det["name"])
                if pid in taken_ids:
                    pid = slug(Path(href).stem)
                taken_ids.add(pid)
                paras = [tidy(p) for p in det["paras"] if tidy(p)]
                grades = next((p for p in paras if p.lower().startswith("available in")), "")
                intro = [p for p in paras if p != grades]
                sections = [{"label": tidy(t["label"]), "blocks": blocks_of(t["blocks"])} for t in det["tabs"]]
                sections = [s for s in sections if s["blocks"]]
                imgs = [image_name(item["img"])] if item.get("img") else []
                imgs += [image_name(src) for src in det["imgs"] if image_name(src) not in imgs]
                images.update(imgs)
                products.append({
                    "id": pid, "name": tidy(det["name"]), "source": href, "intro": intro, "grades": grades,
                    "sizes": [tidy(s) for s in det["sizes"]], "spec": spec_line(sections),
                    "sections": sections, "images": imgs,
                })
            rid = slug(TITLES.get(title, title))
            ranges.append({"id": rid, "title": TITLES.get(title, title), "desc": tidy(group["desc"]), "products": products})
        categories.append({"id": cid, "name": name, "ranges": ranges})

    missing = sorted(set(details) - set(placed))
    if missing:
        raise SystemExit(f"not placed in any category: {missing}")

    OUT_IMG.mkdir(parents=True, exist_ok=True)
    raw = {image_name(p.name): p for p in (CRAWL / "raw").glob("*.png")}
    made = 0
    for name in sorted(images):
        src = raw.get(name)
        if not src:
            raise SystemExit(f"no raw image for {name}")
        out = OUT_IMG / f"{name}.webp"
        if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
            continue
        key_white(src).save(out, "WEBP", quality=82, method=4)
        made += 1

    sizes = {}
    for name in sorted(images):
        with Image.open(OUT_IMG / f"{name}.webp") as im:
            sizes[name] = list(im.size)
    data = {"source": "https://www.princelubricants.com/, the current site, crawled 2026-10-05",
            "categories": categories, "imageSizes": sizes}
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    total = sum(len(r["products"]) for c in categories for r in c["ranges"])
    print(f"{total} products in {len(categories)} categories; {len(images)} pack images ({made} written)")


if __name__ == "__main__":
    main()
