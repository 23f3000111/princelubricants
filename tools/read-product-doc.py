"""
Reads one of the client's product documents (a Word file saved as PDF) into JSON.

    python tools/read-product-doc.py "Product Page - Passenger Cars.pdf" passenger-car

Writes docs/content/product-docs/<category>.json, which is what the site is built from: edit
that file, not the PDF, when the client sends a small change. Needs pdfplumber.

The document is one table after another. A menu table (the category's product types, the
current one in red) opens each type. A heading such as "FS1 – 4 products" names the series
that follow; some types have none. Then a table with one row per product: its name, the lines
for the product list ("Label: value"), and its own page (a description, labelled paragraphs
and the packaging). Word tags every cell and paragraph, so nothing is inferred from the
layout. The one thing a page break loses is which row it cut: the rest of a product comes as
a row of its own without a name, and merge_rows puts it back.

Corrections live beside the JSON, in <category>.fixes.json: one entry per slip, with the
product as the document names it, the words and their replacement. Every entry has to apply,
so a corrected re-issue of the document is noticed. The run ends by comparing every word of
the PDF with every word of the JSON and fails if one is missing or extra.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "content" / "product-docs"

# The labelled paragraphs of a product's own page. Those that hold a comma-separated list of
# standards and OEM numbers are kept as lists.
LIST_LABELS = (
    "Industry Standards, Specifications, & Recommendations", "Industry Standards & Specifications",
    "OEM Specifications & Recommendations", "Key OEM Performance Specifications",
    "Key OEM Performance Specification", "Recommended OEM Fluid Specifications",
)
TEXT_LABELS = ("Intended Applications",)
PACKAGING = "Available Packaging"
LABELS = LIST_LABELS + TEXT_LABELS + (PACKAGING,)

HEADING = re.compile(r"([^;–]+?)\s*–\s*(\d+) products?\b")


def blank(text):
    return not text.strip()


def labelled(text):
    return any(text.startswith(f"{label}:") for label in LABELS)


def looks_labelled(text):
    """A few words and a colon at the start: perhaps a label LABELS does not have yet."""
    return re.match(r"[A-Z][^.,:;()]{2,60}: [A-Z0-9]", text) is not None


def tidy(text):
    return re.sub(r"\s+", " ", text).strip()


def series_of(heading):
    """"SS1 – 3 products ; SS SUPER – 1 product" -> [("SS1", 3), ("SS SUPER", 1)]."""
    return [(name.strip(), int(count)) for name, count in HEADING.findall(heading)]


def merge_rows(rows):
    """Rows of (name, facts, body) paragraphs, with the rows a page break cut put together."""
    out = []
    for name, facts, body in rows:
        if any(not blank(p) for p in name):
            out.append((name, list(facts), list(body)))
            continue
        if not out:
            raise ValueError("a row without a product name opens the table")
        _, above_facts, above_body = out[-1]
        above_facts += [p for p in facts if not blank(p)]
        rest = [] if all(blank(p) for p in body) else list(body)
        # The client leaves a blank line between paragraphs, so two that meet at the page
        # break without one are the halves of a single paragraph, unless a label opens the next.
        if rest and above_body and not blank(above_body[-1]) and not blank(rest[0]) and not labelled(rest[0]):
            above_body[-1] += rest.pop(0)
        above_body += rest
    return out


def fact(line):
    label, colon, value = tidy(line).partition(": ")
    if not colon or not value:
        raise ValueError(f"not a \"Label: value\" line: {line!r}")
    return label, value


def lines_of(paragraphs, labels):
    """The "Label: value" lines of a product's list, one each. A line break typed inside a
    paragraph leaves two of them in it; `labels` are the labels the document uses."""
    # Longest first, so that "API Service Category" is not cut at the "Category" inside it.
    label = re.compile(r"(?:^|(?<= ))(?:%s): " % "|".join(re.escape(l) for l in sorted(labels, key=len, reverse=True)))
    out = []
    for text in (tidy(p) for p in paragraphs):
        starts = sorted({0} | {m.start() for m in label.finditer(text)})
        out += [text[i:j].strip() for i, j in zip(starts, starts[1:] + [len(text)]) if text]
    return out


def split_list(text):
    """Commas separate the items, except inside brackets."""
    items = re.split(r",\s*(?![^()]*\))", tidy(text).rstrip("."))
    return [item.strip() for item in items if item.strip()]


def body(paragraphs):
    """A product's own page: its description, its labelled sections and its packaging."""
    description, sections, packaging = [], [], None
    for text in (tidy(p) for p in paragraphs):
        if not text:
            continue
        label = next((l for l in LABELS if text.startswith(f"{l}:")), None)
        if label is None:
            description.append(text)
            continue
        value = text[len(label) + 1:].strip()
        if label == PACKAGING:
            m = re.fullmatch(r"(.*?)\s*(?:\(([^()]*)\))?", value)
            packaging = {"sizes": [s.strip() for s in m.group(1).split("/")], "note": m.group(2) or ""}
        elif label in LIST_LABELS:
            sections.append({"label": label, "items": split_list(value)})
        else:
            sections.append({"label": label, "text": value})
    if packaging is None:
        raise ValueError(f"no packaging: {paragraphs!r}")
    return {"description": description, "sections": sections, "packaging": packaging}


def correct(product, text, fixes, used):
    """The text with the corrections listed for this product; `used` gathers those that applied."""
    for i, fix in enumerate(fixes):
        if fix["product"] == product and fix["was"] in text:
            text = text.replace(fix["was"], fix["now"])
            used.add(i)
    return text


# ---------- The PDF ----------

class Pages:
    """The text of the PDF's tagged content, by page and marked-content id."""

    def __init__(self, pdf):
        self.chars = {}
        for page in pdf.pages:
            by_id = defaultdict(list)
            for c in page.chars:
                by_id[c.get("mcid")].append(c)
            self.chars[page.page_number] = by_id
            if any(not blank(c["text"]) for c in by_id[None]):
                raise ValueError(f"page {page.page_number} has text outside the tags")

    def of(self, node, page=None):
        page = node.get("page_number") or page
        chars = [c for mcid in node.get("mcids") or [] for c in self.chars[page][mcid]]
        for child in node.get("children") or []:
            chars += self.of(child, page)
        return chars

    def text(self, node):
        return "".join(c["text"] for c in self.of(node))


def find(node, kinds):
    """The nearest descendants of these kinds, in document order."""
    for child in node.get("children") or []:
        if child["type"] in kinds:
            yield child
        else:
            yield from find(child, kinds)


def is_red(char):
    colour = char.get("non_stroking_color")
    return not blank(char["text"]) and isinstance(colour, (tuple, list)) and len(colour) == 3 and colour[0] > 0.7 and max(colour[1:]) < 0.2


def read(pdf):
    """The document as it stands: its types, their headings and their merged rows, plus every
    other piece of text the tables hold, for the word count."""
    pages = Pages(pdf)
    types, other = [], []
    for top in pdf.structure_tree[0]["children"]:
        if top["type"] != "Table":
            text = tidy(pages.text(top))
            if not text:
                continue
            found = series_of(text)
            if not found:
                raise ValueError(f"unexpected text between the tables: {text!r}")
            types[-1]["series"] += found
            other.append(text)
            continue
        rows = [[cell for cell in find(tr, ("TH", "TD"))] for tr in find(top, ("TR",))]
        if all(len(row) == 4 for row in rows):
            names = [(tidy(pages.text(c)), any(is_red(ch) for ch in pages.of(c))) for row in rows for c in row]
            current = [name for name, red in names if red]
            if len(current) != 1:
                raise ValueError(f"a menu with {len(current)} current types: {names}")
            types.append({"title": current[0], "menu": [n for n, _ in names], "series": [], "rows": []})
            other += [n for n, _ in names]
            continue
        # Columns by where their text starts: a row cut by a page break has fewer cells.
        left = lambda cell: min((c["x0"] for c in pages.of(cell)), default=None)
        full = next(row for row in rows if len(row) == 3)
        edges = [left(c) for c in full]
        table = []
        for row in rows:
            cells = [[], [], []]
            for cell in row:
                x = left(cell)
                if x is None:
                    continue
                column = min(range(3), key=lambda i: abs(edges[i] - x))
                cells[column] += [pages.text(p) for p in find(cell, ("P",))]
            if [tidy("".join(c)) for c in cells] == ["Product", "Product Page Description", "Individual Page Description"]:
                other += [tidy("".join(c)) for c in cells]
                continue
            table.append(tuple(cells))
        types[-1]["rows"] += merge_rows(table)
    return types, other


# Punctuation is left out: a label's colon and a list's commas are structure in the JSON.
WORD = re.compile(r"[^\s\-–/:,.()]+")


def words(texts):
    return Counter(w for t in texts for w in WORD.findall(t))


def texts_of(types):
    """Every text of the products, for the word count."""
    for t in types:
        for s in t["series"]:
            for p in s["products"]:
                yield p["name"]
                for label, value in p["facts"]:
                    yield f"{label} {value}"
                yield from p["description"]
                for section in p["sections"]:
                    yield section["label"]
                    yield section.get("text") or " ".join(section["items"])
                yield " ".join([PACKAGING, *p["packaging"]["sizes"], p["packaging"]["note"]])


def build(types, fixes):
    used, out = set(), []
    labels = {tidy(p).partition(": ")[0] for t in types for _, facts, _ in t["rows"] for p in facts if ": " in p}
    for t in types:
        rows = list(t["rows"])
        groups = t["series"] or [("", len(rows))]
        if sum(n for _, n in groups) != len(rows):
            raise ValueError(f"{t['title']}: headings count {groups}, the tables hold {len(rows)} products")
        series = []
        for title, count in groups:
            products = []
            for name_paras, facts, paras in rows[:count]:
                printed = tidy("".join(name_paras))
                fix = lambda text: correct(printed, text, fixes, used)
                page = body([fix(p) for p in paras])
                products.append({"name": fix(printed), "facts": [list(fact(fix(f))) for f in lines_of(facts, labels)], **page})
            rows = rows[count:]
            series.append({"title": title, "products": products})
        out.append({"title": t["title"], "series": series})
    unused = [f for i, f in enumerate(fixes) if i not in used]
    if unused:
        raise ValueError(f"corrections that no longer apply: {unused}")
    return out


def main(argv):
    import pdfplumber
    source, category = argv
    fixes_file = OUT / f"{category}.fixes.json"
    fixes = json.loads(fixes_file.read_text(encoding="utf-8")) if fixes_file.exists() else []
    with pdfplumber.open(source) as pdf:
        types, other = read(pdf)
        printed = words(w["text"] for page in pdf.pages for w in page.extract_words())
        count = len(pdf.pages)
    taken = words(other + list(texts_of(build(types, []))))
    if printed != taken:
        raise SystemExit(f"words missing: {printed - taken}; words extra: {taken - printed}")
    menus = {tuple(t["menu"]) for t in types}
    if len(menus) != 1 or [t["title"] for t in types] != list(menus.pop()):
        raise SystemExit("the menus and the sections do not name the same types in the same order")
    data = {"source": f"{Path(source).name}, {count} pages", "category": category, "types": build(types, fixes)}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{category}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    for p in (p for t in data["types"] for s in t["series"] for p in s["products"]):
        for text in filter(looks_labelled, p["description"]):
            print(f"check {p['name']}: is this a label the reader does not know? {text[:70]}")
    for t in data["types"]:
        print(f"{t['title']}: " + ", ".join(f"{s['title'] or '-'} {len(s['products'])}" for s in t["series"]))
    total = sum(len(s["products"]) for t in data["types"] for s in t["series"])
    print(f"{total} products, {sum(printed.values())} words, every one accounted for; {len(fixes)} corrections applied")


if __name__ == "__main__":
    main(sys.argv[1:])
