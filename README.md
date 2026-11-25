# princelubricants.com

The PRINCE LUBRICANTS website: thirteen static pages built on the client-approved
`index.html` design, with the copy from the client's October 2026 website document,
plus a product catalogue of 188 generated pages (six categories, 174 products). Passenger
Car comes from the client's own product document (November 2026); the other five categories
are carried over from the current princelubricants.com until their documents arrive
(motorcycle, truck and marine are promised). The client's first round of design amendments
(5 Oct 2026) is in `docs/content/amendment-1-2026-10-05.md`. There is no framework and no
build step at deploy time. What is in this folder is the site.

## Pages

| URL | File | What it holds |
|---|---|---|
| `/` | `index.html` | Home: hero, scale and counters, ester technology, products, motorsport, CTA |
| `/company/` | `company/index.html` | Our Company: journey, quality and standards, global presence map, stories |
| `/company/airasia/` | `company/airasia/index.html` | Featured story: the AirAsia A320 livery |
| `/company/china-lubricant-expo-2017/` | `company/china-lubricant-expo-2017/index.html` | Featured story: China Lubricant Expo 2017 |
| `/technology/` | `technology/index.html` | Our Technology: formulation, P-9, P-10, P+ SYNTHESE |
| `/technology/p-9-ester/` | `technology/p-9-ester/index.html` | P-9 ESTER Based Technology |
| `/technology/p-10-ester/` | `technology/p-10-ester/index.html` | P-10 ESTER Based Technology |
| `/products/` | `products/index.html` | The six product categories: write-up, ranges or types, and a Browse Products button each |
| `/products/<category>/` | `products/<category>/index.html` | One category, range by range, one card per product; or, for a category with a client document, its product types (generated) |
| `/products/passenger-car/<type>/` | `products/passenger-car/<type>/index.html` | One of the eight product types: the menu of types, its series, and one card per product with the document's list (generated) |
| `/products/<category>/<product>/` | `products/<category>/<product>/index.html` | One product: packs, sizes, specification and its sections (generated) |
| `/motorsport/` | `motorsport/index.html` | Motorsport heritage, one section per discipline |
| `/contact/` | `contact/index.html` | Contact details, map and enquiry form |
| `/become-a-distributor/` | `become-a-distributor/index.html` | Partnership, benefits, markets and application form |
| `/faq/` | `faq/index.html` | 110 questions in seven categories, with search; built from the client's spreadsheet |
| any missing URL | `404.html` | Not found (noindex) |

Categories: `passenger-car`, `motorsport`, `commercial-fleet`, `motorcycle`,
`industrial`, `marine`. Each is an anchor on `/products/` and a page of its own; each
range is an anchor on its category page, e.g. `/products/motorcycle/#maxx-gold-4t`, and each
series of a document an anchor on its type's page, e.g.
`/products/passenger-car/flagship-ester-based-engine-oils/#fs1-eurogen`.

## Preview

```bash
python tools/serve.py          # then open http://127.0.0.1:8765
```

`serve.py` is Python's static server with browser caching turned off, so a reload always
shows what is on disk. Opening `index.html` straight from the folder also works: links
are rewritten to `index.html` files when the page runs from `file:`. The only
difference is two console errors about `site.webmanifest`, which Chrome blocks from
disk.

## Editing

- **Shared parts.** The header, footer, `<head>` boilerplate and the closing CTA band
  live once each in `partials/`. They are copied into every page between
  `<!-- @name -->` and `<!-- /@name -->` markers. Edit the partial, never the copy
  inside a page, then run the build.
- **Page copy.** Edit the page's own `index.html`. Every word a visitor or a crawler
  reads is in the HTML. The scripts only animate it.
- **Styles and motion.** These are in `assets/css/site.css` and `assets/js/site.js`.
  GSAP 3.13 is vendored in `assets/js/vendor/`. Every page works without JavaScript and
  with reduced motion.
- **FAQ.** The questions and answers live in `docs/content/FAQ.xlsx`, one sheet per
  category. After changing it, run `python tools/build-faq.py` (needs openpyxl) and then
  `node tools/build.js`. The script writes the sections, the category chips and the
  FAQPage JSON-LD into `faq/index.html`, and `docs/content/faq.json` for the checks. A
  new sheet needs a line in its `CATEGORIES` table.
- **Product catalogue.** Everything is built from `docs/content/products.json`, which
  `python tools/build-products.py` (needs Pillow, numpy and scipy) puts together from two
  sources; `node tools/build-catalogue.js` then writes the pages and the blocks on
  `/products/`, and `node tools/build.js` finishes them.
  - *Categories with a client document* (Passenger Car) come from
    `docs/content/product-docs/`. A wording change goes into `passenger-car.json`. A new pack
    shot goes into `tools/data/packs/` as a PNG on white, with its name added to
    `passenger-car.packs.json`; until then the product shows PRINCE's own pack in outline,
    labelled "Pack shot to come".
  - *The others* come from the current site, crawled into `tools/data/oldsite/` (not
    committed): `build-products.py` maps its ranges onto the categories, fixes its typos
    (ILASC, Passanger, Maintanence, Industiral) and keys each pack shot off its white ground
    into `assets/img/products/`.
  - A category's title, photo and write-up are in `META` at the top of `build-catalogue.js`;
    the titles, lines and icons of the product types are in `tools/product-types.js`.
- **A new product document** (motorcycle, truck and marine are coming): save it as PDF, then
  1. `python tools/read-product-doc.py "<file>.pdf" <category>` (needs pdfplumber) writes
     `product-docs/<category>.json` and stops unless every word of the PDF is in it. Slips to
     correct go in `product-docs/<category>.fixes.json`, one entry each, and the script is run
     again;
  2. list the category's pack shots in `product-docs/<category>.packs.json`;
  3. in `build-products.py`, set the category to `DOCUMENT` and move its old ranges to
     `SUPERSEDED`;
  4. add its types to `tools/product-types.js`;
  5. run the three build commands above, then the tests below.
- **Line breaks.** A heading or paragraph never ends on a word by itself: `site.js`
  keeps the last two words of each one, and of each line a `<br>` ends, together, and
  lets go again wherever the pair would not fit. `tools/checks/orphans.js` checks every
  page at five desktop widths.
- **Forms.** Contact and Become a Distributor open a mail draft to
  info@princelubricants.com. To post to a form service instead, set `formEndpoint` in
  the `SITE` constant near the top of `assets/js/site.js`.

## Build

```bash
node tools/build.js            # stamp partials, write sitemap.xml and llms.txt, check every page
node tools/build.js --check    # check only, write nothing
node --test tools/             # unit tests, and every word of the product documents on its page
python -m unittest discover -s tools   # unit tests for the product document reader
```

The check fails a page that has missing partial markers, more or fewer than one `h1`,
a missing title, description or canonical, broken JSON-LD, an unfilled `{{token}}`, or
an internal link or `#fragment` that goes nowhere. It warns about titles over 65
characters and descriptions over 160. `llms.txt` opens with `tools/llms-intro.md`.

Two scripts make assets and only need to run again if their sources change:

- `python tools/build-images.py` crops the photography out of the old site's banners in
  `../Prince Lubricants Images/`, and draws the favicons and the share image. It needs
  Pillow, plus Oswald and Inter (from github.com/google/fonts) in `tools/data/`. It also
  sizes the two stock photographs in `tools/data/stock/`: the yellow Aston Martin V12
  Vantage (Eric Joseph, Pexels photo 35662012, Pexels licence) and the yellow and black
  Ducati Panigale (Bobby Thapa, Unsplash photo tnAYx91-Qn4, Unsplash licence).
- `node tools/build-map.js` draws the Global Presence map from Natural Earth 1:110m
  data (URLs at the top of the script) saved into `tools/data/`. It writes
  `assets/img/world-dots.svg`, `assets/img/world-overlay.svg` and the map inside
  `company/index.html`.

`tools/data/` is not committed.

Browser checks used during development are in `tools/checks/`. Each one exports an
`async (page) => result` function for Playwright to run against the preview server.
`orphans.js`, `published.js` and `final.js` take a list of paths, so a change can be checked
on the pages it touches (`final.js` is best run a few pages at a time). `landing.js` checks
that links to a section of another page land on it.

## Deploy

- **GitHub Pages.** Every push to `main` runs `.github/workflows/pages.yml`. The workflow
  runs the unit tests and the page checks. Then `node tools/pages.js _site <base>` copies
  the deployable files into `_site/` and publishes them. A project site lives under
  `/<repo>/`, so the script points 404.html's root links at that path. Every other page
  links relatively and needs no change. The site is live at
  https://23f3000111.github.io/princelubricants/.
- **Vercel.** The site also deploys to Vercel as static files at a domain root.
  `vercel.json` sets trailing-slash URLs and the headers.

Both deployments leave out what `.vercelignore` lists: `tools/`, `partials/`, `docs/`,
this README, the repository's own files, and the PDFs and folders the client sent, so a
deployment made from this folder never publishes them.

## Open items for the client

| # | Item | What the site does now |
|---|---|---|
| 1 | Product count hidden by the watermark ("more than [?]00") | "more than 500", from the current site's "500++" |
| 2 | Home base-oil storage hidden ("[?]0,000 MT") | ">15,000 MT", the legible Company figure |
| 3 | Home hero has no headline | Amendment 1: the H1 is "SINGAPORE'S PERFORMANCE LUBRICANT SPECIALIST SINCE 1998.", typed without a caret |
| 4 | COMMERCIAL FLEET (Home) vs Heavy Duty (Products list) | Home: Commercial Fleet. Products: Commercial Fleet, eyebrow Heavy Duty |
| 5 | East African Safari Rally has no archive tile | Kept in the body copy |
| 6 | Typos in the document | Fixed: DRIFT, STARBURST, Heavy-Duty |
| 7 | P-12 ESTER is named but has no section | Text only, not linked |
| 8 | Contact details and socials | Taken from the current site. Please confirm |
| 9 | Distributor benefits | Taken from the current site. Please confirm |
| 10 | Racing event names (GP3, GT World Challenge, GT Asia Challenge, Le Mans, 100+ TCR) | Taken from the current site. Please confirm |
| 11 | Form submission | Opens a mail draft until a form endpoint is set |
| 12 | Photography and official marks | Labelled slots, listed below |
| 13 | Technology document numbering (two S03s) and the CTA label copied from Company | Treated as S04, with Technology's own CTA |
| 14 | "FSR SERIES" (Home) vs "FSR RACING SERIES" (Technology) | Each page uses its own section's wording |
| 15 | FS1 EUROGEN has no category in the October document | Passenger Car, as in the November product document |
| 16 | SS1, D1 and MAXX ULTRA have no category in the October document | SS1 in Passenger Car, as in the November product document; D1 in Commercial Fleet and MAXX ULTRA in Motorcycle, as on the current site |
| 17 | The "Designed and developed by Imsuya Global" credit | Left out of the footer. Add it back if wanted |
| 18 | Slips in the FAQ spreadsheet | Fixed on the page: a missing question mark and a double space. "DEVO" and "Devo" both appear and are kept as written |
| 19 | The FAQ names ranges the Products page did not show (FSe, the D Series: D1 GOLD, D1 and DEVO; MAXX ULTRA) | All are in the catalogue now |
| 20 | P-9 card: "yellow car (Aston Martin DBS Superleggera)" | No free photograph of a yellow DBS Superleggera could be found. A yellow Aston Martin V12 Vantage (Pexels) stands in. Please send a licensed DBS Superleggera photograph |
| 21 | P-10 card: "bike image of yellow and black" | A yellow and black Ducati Panigale (Unsplash), with the Ducati name visible. It is also the motorcycle photograph on Home and Products. Please confirm or send your own |
| 22 | Motorsport: "use words from Chat GPT" | New copy for each discipline: what it asks of an engine and its oil. It claims no seasons, teams or results. Please approve |
| 23 | Products: "keep all products listed like in PX98 style" | Built in the current PRINCE design, as the user asked: every product, with its pack shot and information. Passenger Car follows the client's product document: a menu of eight types, and each product's own list on its card |
| 24 | Five categories still copy the current site's wording | Kept as written, with four typos fixed (ILASC, Passanger, Maintanence, Industiral). A few product names are in capitals there and stay so |
| 25 | The Maldives on the map | Too small for the map's data: a marker at Malé, no dots |
| 26 | Pack shots of 17 Passenger Car products | PRINCE's own jug or bottle in outline, labelled "Pack shot to come" (listed below) |
| 27 | FSe SAE 0W-16 GF-6B: its standards read "ILSAC GF-6A" | "ILSAC GF-6B", as its name, its list, its text and its pack have it. Please confirm |
| 28 | Other slips in the Passenger Car document | 44 corrected: spelling, spacing, grammar, and copy that named another grade. Each is in `docs/content/product-docs/passenger-car.fixes.json` |
| 29 | Passenger Car document, contradictions left as written | FS1 TECHNICA 5W-30 A7/B7 is P-9 Ester-Based in its list, but its text names no ester. FS1 EUROGEN 0W-30 C3 has Group III base stocks, then "PAO base oils". FS1 TECHNICA 0W-30 C2 has "phosphate ash" (elsewhere sulphated ash and phosphorus). SS1 Fuel Economy 10W-30 is API SP in its list, API SP-RC in its standards. G12/G12+ is "Hybrid" OAT in its list only. ATF SV is standard-viscosity in its list, high-viscosity in its text. DOT 5.1 has ISO 4925 Class 5-1 and Class 5.1. ATF 6 and ATF LV have "Fiat 9.5550-AV2" beside 9.55550- numbers |
| 30 | Four products of the current site are not in the Passenger Car document | Taken out: FS SUPER 0W-20 GF-5, FS SUPER 5W-30 GF-5, ATF MULTI-VEHICLE MERCON V, CVT UNIVERSAL |
| 31 | SUPER-SHIFT is in the Passenger Car document and was in Commercial Fleet | One page each, in Passenger Car, with the new copy. Commercial Fleet lists the same pages until the truck document arrives |
| 32 | The heading "others ATF – 8 products" covers ATF, DCT and CVT fluids | Titled "Other ATF, DCT & CVT" |
| 33 | The document has no introduction for its eight types | One line each, made from the document's own terms (`tools/product-types.js`). The series keep their line from the current site where they have one. Please approve |
| 34 | FS1 TECHNICA is P-9 Ester-Based in the document | Tagged so on the Products page. The Home, Technology and P-9 pages still name FS1, FS1 EUROGEN and FSR, as the October document does. Should FS1 TECHNICA join them? |
| 35 | Packs whose label differs from the document | Shown as they are: G11 reads "G11 (IAT)" (document: HOAT), G13 reads "G13 OAT" (G12++/G13, Si-OAT), FS1 EUROGEN 0W-20 reads "C5" (C6/C5) |
| 36 | FS1 0W-40 has no 1 L pack shot | The 4 L pack only. The current site shows the 5W-30 packs there |

## Placeholders

Every gap the client still has to fill is a visible, labelled slot in the page:

- **Pack shots:** FS1 TECHNICA 0W-30 C2, 5W-30 C4 and 5W-30 A7/B7; FS SUPER 0W-20 SP-RC and
  0W-30 SP-RC; SS SUPER 10W-40; ATF EUROSPEC 9HP, 8HP, 8AT AW-2, 9GT, 7GT FE+ and 7GT; ATF LV
  and ATF SV MULTI-VEHICLE; DCT MAGNA LV; PRO-SHIFT MTF 75W-85; 50/50 ANTIFREEZE/COOLANT G12
  EVO. PNG on white, as the others.
- **Photography:** the AirAsia livery and the Expo 2017 stand (Company and both story
  pages), three gallery photos on each story page, and GT, Gymkhana, endurance and drift
  photography (Motorsport).
- **Official marks:** the ISO 9001:2015, API ENERGY, API STARBURST, ACEA and EELQMS logos
  (Company).
- **Content:** the full AirAsia and Expo 2017 stories, and the P-9 and P-10 test data and
  technical data sheets.
