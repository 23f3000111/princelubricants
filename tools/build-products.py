"""
Builds the product catalogue from the client's product documents and, for the categories that
have none yet, from a crawl of the current princelubricants.com.

    python tools/build-products.py

Reads docs/content/product-docs/ (written by tools/read-product-doc.py):
  <category>.json         the category's product types, their series and their products
  <category>.packs.json   the pack shots each of those products has

and tools/data/oldsite/ (not committed; see the README for how it was made):
  lists.json     each range page of the current site, in its menu order: the ranges on it,
                 their one-line descriptions and their products, in order
  details.json   each product page: name, introduction, sizes, images and its tabs
  raw/           the product images, as the current site serves them
Pack shots the client sends later go in tools/data/packs/, as PNG on white.

Writes:
  docs/content/products.json   six categories, their types or ranges, and their products
  assets/img/products/*.webp   each pack shot keyed off its white ground, trimmed, resized
  vercel.json, "redirects"     where each page of the current site leads on the new one

A category with a document takes everything from it, in the document's order. A product that
an earlier category's document also has gets one page, in that category; the later ones list
it and link to it. The categories without a document keep the current site's order: their
ranges follow its product menu (Industrial, Maritime solution), and every range keeps its
products as the site shows them. Needs Pillow, numpy and scipy.
"""
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
CRAWL = ROOT / "tools" / "data" / "oldsite"
NEW_PACKS = ROOT / "tools" / "data" / "packs"
DOCS = ROOT / "docs" / "content" / "product-docs"
OUT_JSON = ROOT / "docs" / "content" / "products.json"
VERCEL = ROOT / "vercel.json"
OUT_IMG = ROOT / "assets" / "img" / "products"
PACK_HEIGHT = 600          # px; cards show packs about 240px tall, the product page 460px

M, T, A, F = "pcars.html", "tfluid.html", "atfluid.html", "mfluid.html"
R, C, P, S = "racing_product.html", "ctrucks.html", "psport.html", "mspec.html"
I, X, Y = "industrial_oil_product.html", "metal_processing_product.html", "marine_solution_product.html"

DOCUMENT = "document"

# The six categories of the site, in its order. One with a client document takes everything
# from it. The others list the current site's ranges: (range page, range title[, only these
# pages]). Every crawled product lands exactly once: here, in SUPERSEDED or in LEFT_OUT.
CATEGORIES = [
    ("passenger-car", "Passenger Car", DOCUMENT),
    ("competition", "Competition", DOCUMENT),
    ("commercial-vehicle", "Commercial Vehicle", DOCUMENT),
    ("powersports", "Powersports", DOCUMENT),
    ("industrial", "Industrial", [
        (I, "Spindle Bearing Oils"), (I, "Refrigeration Oil"), (I, "Air Compressor Oil"), (I, "Turbine Oil"),
        (I, "Heat Transfer Oil"), (I, "Electrical Insulating Oil"), (I, "Hydraulic Oil"), (I, "Gear Oil"),
    ]),
    ("marine", "Marine", [
        (S, "MARINO RACING 4T"), (S, "MARINO GOLD 4T"), (S, "MARINO SILVER 4T"), (S, "MARINO BLUE 2T"),
        (T, "MARINE TRANSMISSION SPECIALTIES"),
        (Y, "Cylinder Oils"), (Y, "Trunk Piston Engine Oils"), (Y, "Stern Tube Oils"), (Y, "Auxiliary Gear Oils"),
        (Y, "Turbine Oils"), (Y, "Hydraulic Oils"), (Y, "Compressor Oils"),
    ]),
]

# The current site's ranges that a client document has replaced. Their products are out of the
# catalogue; the one-line description of a series that goes on is kept (LINES).
SUPERSEDED = [
    # Passenger Car
    (M, "FS1"), (M, "FS1 EUROGEN"), (M, "FSe"), (M, "FS SUPER"), (M, "SS1"), (M, "M Series"),
    (T, "PRO-SHIFT MTF"), (T, "SUPER-SHIFT Series"),
    (A, "ATF"), (A, "DCT"), (A, "CVT"),
    (F, "Non-silicone Brake & Clutch Fluid"), (F, "Antifreeze Coolant"), (F, "Hydraulic Fluid"),
    # Competition
    (R, "RACING MOTOR OIL"), (R, "RACING GEAR OILS"), (R, "RACING BRAKE FLUID"), (R, "RACING COOLANT"),
    # Commercial Vehicle
    (C, "D1 GOLD"), (C, "D1 GOLD 4X4"), (C, "D1"), (C, "Devo"),
    # Powersports
    (P, "MAXX GOLD 4T"), (P, "MAXX ULTRA 4T"), (P, "MAXX LAUNCH 4T"), (P, "MAXX SCOOTER RANGE"),
    (T, "MAXX-SHIFT Series"), (F, "Suspension Fork Oil"),
]
# The current site's ranges the client asked to leave out: its metal processing fluids
# (2026-11-28, "metal cutting fluid not needed").
LEFT_OUT = [(X, "Way Oils"), (X, "Neat Oils"), (X, "Emulsifiable / Soluble Oils"), (X, "Quenching Oils")]
# A document series that goes on from one of the current site's ranges keeps its line. The
# current D1 line is not carried: it describes a low-SAPS oil, and the document's D1 series is
# D1 SPORT, D1 PLUS and D1 LONGLIFE.
LINES = {"FS1": (M, "FS1"), "FS1 EUROGEN": (M, "FS1 EUROGEN"), "FSe": (M, "FSe"), "FS SUPER": (M, "FS SUPER"),
         "SS1": (M, "SS1"), "M1": (M, "M Series"),
         "D1 GOLD 4X4": (C, "D1 GOLD 4X4"), "D1 GOLD": (C, "D1 GOLD"), "Devo": (C, "Devo"),
         "MAXX GOLD 4T": (P, "MAXX GOLD 4T"), "MAXX ULTRA 4T": (P, "MAXX ULTRA 4T"), "MAXX LAUNCH 4T": (P, "MAXX LAUNCH 4T")}

# A product that two documents have, but with words of its own in the later one, keeps a page
# in each: (category, product id).
OWN_PAGES = {("powersports", "brake-and-clutch-fluid-dot-4")}

# Where the current site's pages lead on the new one, as permanent redirects, so their links
# and their places in search results carry over to the new site on the same domain. A range
# page leads to the category or type that holds its products now ("" is the Products page);
# a product page to its own page here, or, for a range a document replaced, to the same
# product in the document when one plainly is (successor), or else to the type in SUCCESSORS.
RANGE_PAGES = {M: "passenger-car/", R: "competition/", C: "commercial-vehicle/", P: "powersports/", S: "marine/",
               T: "", A: "passenger-car/automatic-transmission-fluids/", F: "", I: "industrial/", X: "industrial/",
               Y: "marine/"}
SUCCESSORS = {
    (M, "FS1"): "passenger-car/flagship-ester-based-engine-oils",
    (M, "FS1 EUROGEN"): "passenger-car/flagship-ester-based-engine-oils",
    (M, "FSe"): "passenger-car/passenger-car-engine-oils", (M, "FS SUPER"): "passenger-car/passenger-car-engine-oils",
    (M, "SS1"): "passenger-car/passenger-car-engine-oils", (M, "M Series"): "passenger-car/passenger-car-engine-oils",
    (T, "PRO-SHIFT MTF"): "passenger-car/manual-transmission-oils",
    (T, "SUPER-SHIFT Series"): "passenger-car/differential-and-hypoid-gear-oils",
    (A, "ATF"): "passenger-car/automatic-transmission-fluids", (A, "DCT"): "passenger-car/automatic-transmission-fluids",
    (A, "CVT"): "passenger-car/automatic-transmission-fluids",
    (F, "Non-silicone Brake & Clutch Fluid"): "passenger-car/brake-and-clutch-fluids",
    (F, "Antifreeze Coolant"): "passenger-car/antifreeze-and-coolants",
    (F, "Hydraulic Fluid"): "passenger-car/hydraulic-and-power-steering-fluids",
    (R, "RACING MOTOR OIL"): "competition/racing-engine-oils",
    (R, "RACING GEAR OILS"): "competition/racing-gear-axle-and-differential-oils",
    (R, "RACING BRAKE FLUID"): "competition/racing-brake-fluids", (R, "RACING COOLANT"): "competition/racing-coolants",
    (C, "D1 GOLD"): "commercial-vehicle/signature-ester-based-engine-oils",
    (C, "D1 GOLD 4X4"): "commercial-vehicle/signature-ester-based-engine-oils",
    (C, "D1"): "commercial-vehicle/heavy-duty-engine-oils", (C, "Devo"): "commercial-vehicle/heavy-duty-engine-oils",
    (P, "MAXX GOLD 4T"): "powersports/motorcycle-engine-oils", (P, "MAXX ULTRA 4T"): "powersports/motorcycle-engine-oils",
    (P, "MAXX LAUNCH 4T"): "powersports/motorcycle-engine-oils", (P, "MAXX SCOOTER RANGE"): "powersports/scooter-engine-oils",
    (T, "MAXX-SHIFT Series"): "powersports/gear-and-drivetrain-lubricants",
    (F, "Suspension Fork Oil"): "powersports/fork-and-suspension-oils",
}
# The products whose successor is in another range than the rest of theirs.
SUCCESSOR_PAGES = {"coolant-heavy.html": "commercial-vehicle/50-50-antifreeze-coolant-hd-elc"}
# The categories this site itself has renamed (the review site had them under these names).
RENAMED = {"motorsport": "competition", "commercial-fleet": "commercial-vehicle", "motorcycle": "powersports"}

# A document's series that the site shows under another title.
SERIES_TITLES = {"others ATF": "Other ATF, DCT & CVT"}

# Range titles as the site shows them; the current site's capitals are kept where they are
# product names, and generic words are set in title case.
TITLES = {"MARINE TRANSMISSION SPECIALTIES": "Marine Transmission Specialties"}

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


# ---------- The client's documents ----------

def product_id(name):
    """A document product's slug: without the brand, the word SAE and the freezing point."""
    name = re.sub(r"^PRINCE®\s+", "", name)
    name = re.sub(r"\bSAE\s+", "", name)
    return slug(re.sub(r"\s+−\d+°C(?=\s|$)", "", name))


def type_id(title):
    return slug(re.sub(r"\s*\([^()]*\)", "", title))


def from_document(data, packs, lines, titles):
    """A client document's types, with their series as ranges. `packs` are the pack shots by
    product id, `lines` the series' one-line descriptions, `titles` the series the site shows
    under another name."""
    used, types = set(), []
    for t in data["types"]:
        ranges = []
        for s in t["series"]:
            products = []
            for p in s["products"]:
                pid = product_id(p["name"])
                used.add(pid)
                lists = [x["items"] for x in p["sections"] if "items" in x]
                products.append({
                    "id": pid, "name": p["name"], "facts": p["facts"], "intro": p["description"],
                    "sizes": p["packaging"]["sizes"], "sizeNote": p["packaging"]["note"],
                    "spec": " · ".join(lists[0][:3]) if lists else "",
                    "sections": [{"label": x["label"], "blocks": [{"chips": x["items"]} if "items" in x else {"p": x["text"]}]}
                                 for x in p["sections"]],
                    "images": packs.get(pid, []),
                    "notices": p.get("notices", []),
                })
            title = titles.get(s["title"], s["title"])
            ranges.append({"id": slug(title) or "products", "title": title, "desc": lines.get(s["title"], ""), "products": products})
        types.append({"id": type_id(t["title"]), "title": t["title"], "ranges": ranges})
    unknown = sorted(set(packs) - used)
    if unknown:
        raise SystemExit(f"pack shots for products the document does not have: {unknown}")
    return types


GRADE = re.compile(r"\d+w-\d+|\d+w")


def words(pid):
    """An id's words, a viscosity grade (10w-40) being one word."""
    return re.findall(r"\d+w-\d+|[a-z0-9]+", pid)


def successor(old_id, candidates):
    """Which of the candidate ids an old product's id plainly names, or None when no single
    one does. Only a candidate with the old product's grade can be it; then, in turn: the
    same id; the one new name inside the old ("ATF 3H" in "ATF 3H DEXRON III-H / MERCON");
    of the new names around the old one, the one that adds least ("D1 GOLD 5W-40 CK-4/SN"
    rather than "D1 GOLD 4X4 5W-40 CK-4/SN"); or the one of the same family (the old name's
    first two words) that shares the most words, three with a grade, two without."""
    if old_id in candidates:
        return old_id
    old = words(old_id)
    grades = {w for w in old if GRADE.fullmatch(w)}
    fits = {c: set(words(c)) for c in candidates if grades <= set(words(c))}
    inside = [c for c, w in fits.items() if w <= set(old)]
    if len(inside) == 1:
        return inside[0]
    extra = {c: w - set(old) for c, w in fits.items() if set(old) <= w}
    closest = [c for c in extra if all(extra[c] <= e for e in extra.values())]
    if len(closest) == 1:
        return closest[0]
    family = set(old[:2])
    scored = sorted(((len(set(old) & w), c) for c, w in fits.items() if family <= w), reverse=True)
    scored = [(n, c) for n, c in scored if n >= (3 if grades else 2)]
    if not scored or (len(scored) > 1 and scored[0][0] == scored[1][0]):
        return None
    return scored[0][1]


def redirects(details, old_ranges, new_pages, categories):
    """Each page of the current site, and of this site's renamed categories, and where it leads
    now, for vercel.json. `old_ranges` maps a product page the site no longer has to its old
    range; `new_pages` maps one it still has to its page."""
    types = {f"{c['id']}/{t['id']}": t for c in categories for t in c.get("types", [])}
    out = {f"/{page}": f"/products/{to}" for page, to in RANGE_PAGES.items()}
    for href in details:
        if href in new_pages:
            to = new_pages[href]
        elif href in SUCCESSOR_PAGES:
            to = SUCCESSOR_PAGES[href]
        elif old_ranges[href] in SUCCESSORS:
            where = SUCCESSORS[old_ranges[href]]
            pages = [p["id"] for r in types[where]["ranges"] for p in r["products"] if "page" not in p]
            found = successor(slug(details[href]["name"]), pages)
            to = f"{where.split('/')[0]}/{found}" if found else where
        else:
            to = "industrial"   # the ranges the client asked to leave out
        out[f"/{href}"] = f"/products/{to}/"
    for old, new in RENAMED.items():
        out[f"/products/{old}/:path*"] = f"/products/{new}/"
    return [{"source": k, "destination": v, "permanent": True} for k, v in out.items()]


def json_text(value, level=0):
    """JSON as vercel.json is written by hand: an object of plain values on one line."""
    pad = "  " * level
    plain = lambda v: not isinstance(v, (dict, list))
    if isinstance(value, dict) and all(map(plain, value.values())):
        return "{ " + ", ".join(f"{json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}" for k, v in value.items()) + " }"
    if isinstance(value, dict):
        return "{\n" + ",\n".join(f"{pad}  {json.dumps(k)}: {json_text(v, level + 1)}" for k, v in value.items()) + f"\n{pad}}}"
    if isinstance(value, list) and not all(map(plain, value)):
        return "[\n" + ",\n".join(f"{pad}  {json_text(v, level + 1)}" for v in value) + f"\n{pad}]"
    return json.dumps(value, ensure_ascii=False)


def words_of(p):
    return " ".join(p["intro"] + [b.get("p") or ", ".join(b.get("chips", [])) for s in p["sections"] for b in s["blocks"]]).split()


def share(cid, types, pages, own_pages):
    """Gives every product of a document category one page. A product that an earlier category
    already has a page for is listed here as a link to it: it keeps this document's list for
    its card and takes the page's pack shots, and the page names this category's type as
    another place it is listed. `pages` maps a product id to its page and that page's category,
    and gains this category's pages; `own_pages` holds the (category, product id) pairs that
    keep a page of their own. Returns a note for each listed product whose words differ from
    its page's."""
    notes, addresses = [], {t["id"] for t in types}
    for t in types:
        for r in t["ranges"]:
            for i, p in enumerate(r["products"]):
                page, where = pages.get(p["id"], (None, cid))
                if page and where != cid and (cid, p["id"]) not in own_pages:
                    r["products"][i] = {key: p[key] for key in ("id", "name", "facts", "sizes", "spec")}
                    r["products"][i].update(images=page["images"], page=f"{where}/{p['id']}")
                    page.setdefault("alsoIn", []).append({"category": cid, "type": t["id"]})
                    if words_of(p) != words_of(page):
                        notes.append(f"{cid} lists {p['name']} with the page in {where}, whose words differ")
                    continue
                if p["id"] in addresses:
                    raise SystemExit(f"two pages would share the address {cid}/{p['id']}/")
                addresses.add(p["id"])
                pages.setdefault(p["id"], (p, cid))
    return notes


# ---------- The crawl ----------

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

    def crawled(source, where):
        """The products of one of the crawl's ranges, each marked as placed."""
        group = ranges_by_page[(source[0], source[1])]
        only = source[2] if len(source) > 2 else None
        items = [item for item in group["items"] if not only or item["href"] in only]
        for item in items:
            if item["href"] in placed:
                raise SystemExit(f"{item['href']} is in two ranges: {placed[item['href']]} and {where}")
            placed[item["href"]] = where
        return group, items

    old_ranges, new_pages = {}, {}
    for source in SUPERSEDED:
        for item in crawled(source, f"{source[1]}, replaced by a client document")[1]:
            old_ranges[item["href"]] = (source[0], source[1])
    for source in LEFT_OUT:
        for item in crawled(source, f"{source[1]}, left out at the client's request")[1]:
            old_ranges[item["href"]] = (source[0], source[1])
    lines = {series: tidy(ranges_by_page[source]["desc"]) for series, source in LINES.items()}

    categories, pages = [], {}
    for cid, name, sources in CATEGORIES:
        if sources == DOCUMENT:
            data, packs = (json.loads((DOCS / f"{cid}{ext}").read_text(encoding="utf-8")) for ext in (".json", ".packs.json"))
            types = from_document(data, packs, lines, SERIES_TITLES)
            for note in share(cid, types, pages, OWN_PAGES):
                print(f"note: {note}")
            for p in (p for t in types for r in t["ranges"] for p in r["products"]):
                taken_ids.add(p["id"])
                images.update(p["images"])
            categories.append({"id": cid, "name": name, "types": types})
            continue
        ranges = []
        for source in sources:
            title = source[1]
            group, items = crawled(source, f"{cid}/{title}")
            products = []
            for item in items:
                det = details[item["href"]]
                pid = slug(det["name"])
                if pid in taken_ids:
                    pid = slug(Path(item["href"]).stem)
                taken_ids.add(pid)
                new_pages[item["href"]] = f"{cid}/{pid}"
                paras = [tidy(p) for p in det["paras"] if tidy(p)]
                grades = next((p for p in paras if p.lower().startswith("available in")), "")
                intro = [p for p in paras if p != grades]
                sections = [{"label": tidy(t["label"]), "blocks": blocks_of(t["blocks"])} for t in det["tabs"]]
                sections = [s for s in sections if s["blocks"]]
                imgs = [image_name(item["img"])] if item.get("img") else []
                imgs += [image_name(src) for src in det["imgs"] if image_name(src) not in imgs]
                images.update(imgs)
                products.append({
                    "id": pid, "name": tidy(det["name"]), "source": item["href"], "intro": intro, "grades": grades,
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
    raw = {image_name(p.name): p for folder in (CRAWL / "raw", NEW_PACKS) for p in folder.glob("*.png")}
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
    # A pack no product shows any more is not deployed.
    dropped = [f for f in OUT_IMG.glob("*.webp") if f.stem not in images]
    for f in dropped:
        f.unlink()

    sizes = {}
    for name in sorted(images):
        with Image.open(OUT_IMG / f"{name}.webp") as im:
            sizes[name] = list(im.size)
    data = {"source": "The client's product documents (docs/content/product-docs/) and, for the categories without one, "
                      "https://www.princelubricants.com/, the current site, crawled 2026-10-05",
            "categories": categories, "imageSizes": sizes}
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    vercel = json.loads(VERCEL.read_text(encoding="utf-8"))
    vercel["redirects"] = redirects(details, old_ranges, new_pages, categories)
    VERCEL.write_text(json_text(vercel) + "\n", encoding="utf-8", newline="\n")
    ranges = [r for c in categories for owner in c.get("types", [c]) for r in owner["ranges"]]
    total = sum(1 for r in ranges for p in r["products"] if "page" not in p)
    listed = sum(1 for r in ranges for p in r["products"] if "page" in p)
    print(f"{total} products in {len(categories)} categories, and {listed} listed in a second one; "
          f"{len(images)} pack images ({made} written, {len(dropped)} removed)")


if __name__ == "__main__":
    main()
