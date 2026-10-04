# princelubricants.com: multi-page site design

Date: 2026-10-04. Status: approved in conversation (design parts 1 to 4).

## 1. Intent

The client approved the look of `../index.html`, the single-page Prince Lubricants
mockup. They now want the new www.princelubricants.com built as a multi-page site from
their doc, "New Prince Website Oct 2026". The doc is transcribed verbatim in
`docs/content/client-doc-2026-10.md`, and that file is the only source of client copy.

Success means three things:

- every page in the doc and every page it links to exists at the URL the doc names;
- the client's copy appears word for word, as real HTML text;
- the site reads as modern, premium and animated while staying fully crawlable by
  search engines and AI answer engines.

Constraints:

- desktop is reviewed first, as the user prefers, but layouts stay fluid;
- no stock photography;
- no invented marketing claims;
- anything only the client can supply is a visibly labelled placeholder.

## 2. Site map

All pages are real `index.html` files at clean URLs. Links are relative (`../company/`).

| URL | Page | Copy source |
|---|---|---|
| `/` | Home | Doc Home S01 to S07 |
| `/company/` | Our Company | Doc Company S01 to S07 |
| `/company/airasia/` | Prince Lubricants × AirAsia | Doc story 01, plus labelled slots |
| `/company/china-lubricant-expo-2017/` | China International Lubricant Expo 2017 | Doc story 02, plus labelled slots |
| `/technology/` | Our Technology | Doc Technology S01 to S04 |
| `/technology/p-9-ester/` | P-9 ESTER Based Technology | Doc P-9 section and Home P-9 card |
| `/technology/p-10-ester/` | P-10 ESTER Based Technology | Doc P-10 section and Home P-10 card |
| `/products/` | Products | Doc Home S04 and Discover card 03. Six category sections with anchors |
| `/motorsport/` | Motorsport Heritage | Doc Home S05. Six disciplines as HTML text |
| `/contact/` | Contact Us | Doc CTA copy, plus contact details from `../index.html` |
| `/become-a-distributor/` | Become a Distributor | Doc CTA and Global Presence copy, plus benefits from `../index.html` |
| `/404.html` | Not found | none (noindex) |

The product category anchors are `#passenger-car`, `#motorsport`, `#commercial-fleet`,
`#motorcycle`, `#industrial` and `#marine`. They become their own pages when the client
sends the catalogue.

### Navigation

- **Header:** logo · Company ▾ · Technology ▾ · Products ▾ · Motorsport · Become a
  Distributor · **Contact Us** (gold button).
- **Dropdowns:** these are mega panels of real `<a>` links, so they can be crawled.
  - Company: Our Company, Our Journey, Quality & Standards, Global Presence, AirAsia,
    China Expo 2017.
  - Technology: Overview, P-9 ESTER, P-10 ESTER, P+ SYNTHESE.
  - Products: the six categories, each with its product lines.
- **Active state:** set at build time with `aria-current="page"`.
- **Universal CTA:** the doc's S07 closes every page except Contact, Become a Distributor
  and 404, where it would link back to itself.
- **Footer:**
  - brand line and site links;
  - contact details and socials, both from `../index.html`;
  - legal line: "© 2026 PRINCE LUBRICANTS. Manufactured by PRINCE GLOBAL PTE. LTD.,
    Singapore, under licence from PRINCE OIL INC. U.S.A.";
  - studio credit: "Designed and developed by Imsuya Global", linking to
    imsuyaglobal.com, the same as PX98.

## 3. Content rules

1. Doc copy is used verbatim, including the client's uppercase headlines. Uppercase is
   kept in the source, so crawlers read what the client wrote.
2. Typos are fixed and listed in §9: DFIFT→DRIFT, STARBUST→STARBURST,
   Heave-Duty→Heavy-Duty.
3. Copy carried over from `../index.html` (the current site) is marked "from current
   site, confirm" in §9. This covers contact details, socials, distributor benefits and
   the racing event names.
4. No new marketing claims. Functional text is the exception: nav labels, button
   labels, form labels, breadcrumbs, and titles and meta descriptions built from doc
   sentences.
5. Anything the client must still supply is a visible placeholder:
   - `.placeholder` is a "Content to come" block that says what is needed;
   - `.photo-slot` is a "Photo to come" frame that says what the photo shows.

## 4. Visual system

Carried over from `../index.html` and tightened.

- **Colour tokens:**
  - ink `#060611` `#0a0a14` `#10101c` `#1a1a2e`;
  - gold `#FFD700` `#FFC200` `#E6B800`;
  - `--gold-deep: #8A6A00` for small gold text on white (5.07:1). The old `#E6B800`
    on white is about 1.9:1;
  - paper `#fff` and `#f7f6f2`;
  - body text on ink at 64% white or more, which is 8:1.
- **Type:** Oswald 500/600/700 for uppercase display, Inter 300 to 700 for body. Type
  scales with `clamp()`.
- **Rhythm:** ink and paper sections alternate, as in `index.html`.
- **Motifs kept:**
  - section labels with a gold rule, and the gold underline bar;
  - ghost section numbers;
  - gold and outline buttons with the shine sweep;
  - gold stat band, particle and grid hero, tilt cards, parallax grounds.
- **Global UI kept on every page:** loader (first page of a visit only), gold scroll
  progress bar, ring and dot cursor (fine pointers only), side section dots, back to top.

## 5. Motion

GSAP 3.13, with ScrollTrigger and SplitText, is vendored in `assets/js/vendor/`.
Motion is progressive:

- `<html class="no-js">` becomes `js` in the head, and only `.js` hides content that is
  waiting to animate.
- `prefers-reduced-motion` skips all motion and shows everything at once.
- If GSAP fails, a safety timeout reveals everything.

Global patterns:

- headlines rise line by line from a mask;
- eyebrows draw their rule first;
- cards rise in a stagger;
- counters run once;
- parallax uses `[data-parallax]`;
- tilt uses `.tilt`;
- moving between pages uses a gold wipe through cross-document View Transitions, in
  CSS only. Browsers without support navigate normally.

Signature moments:

- **Home hero:** the PRINCE LUBRICANTS letters rise through particles and the gold grid.
  The eyebrow types out, but its text is already in the HTML.
- **Stat bands:** an odometer count-up on gold.
- **Technology ester scene:** a pinned visual. An SVG ester molecule (polar head,
  hydrocarbon tail) anchors to a metal surface to form the film, with one visual state
  per pillar. The five pillars advance as you scroll. It runs once for P-9 and once for
  P-10.
- **Technology pillars:** sticky stacking cards. The earlier cards scale back as the next
  one arrives.
- **Company Global Presence:** a pre-rendered dotted world map. The Singapore hub
  pulses, and arcs draw out to the 14 named countries. The country list stays as text
  beneath it.
- **Company journey:** the five proof points sit on a gold value chain line that draws
  across as you scroll.
- **Motorsport archive:** a 2×3 grid of typographic tiles whose ghost numerals fill gold
  on hover. It is never a slider.

## 6. Imagery

- **Real Prince photos** from `../Prince Lubricants Images/`, cropped clear of the
  baked-in banner text and re-encoded to WebP by `tools/build-images.py`:

  | Subject | Source file |
  |---|---|
  | Prince F1 car | `home_2` |
  | Prince Civic touring car | `home_3` |
  | FS1 pour | `p9` |
  | Truck | `home_6` |
  | Boat | `home_7` |
  | Refinery | `home_1` |
  | Offshore rig | `w1` |
  | Lab | `prince_4` |
  | Handshake | `prince_1` |

  The sources are about 1650px wide, so full-bleed uses sit under ink overlays.
- **Drawn in code:** molecules, the world map, oil-film waves, particles and numerals.
- **Labelled slots:**
  - motorcycle;
  - the AirAsia A320 livery;
  - China Expo 2017;
  - racing photos for GT, Gymkhana, Endurance and Drift;
  - the official ISO, API, ACEA and EELQMS marks, shown as typographic badges until the
    client supplies them.

## 7. Page layouts

### Home

1. **Hero** (ink, full viewport):
   - refinery ground, gold grid, particles;
   - eyebrow, then H1 "PRINCE LUBRICANTS", then the body;
   - buttons: Explore Our Products, Become a Distributor;
   - a scroll cue.
2. **Scale:** headline and body on paper, then a full-bleed gold band with five counters.
3. **Technology** (ink): headline and body, then two tall P-9 and P-10 cards. Each card
   has a ghost numeral, a molecule visual, series chips, a small line and its CTA.
4. **Product portfolio** (paper-2): headline and body, then a 2×3 grid of photo tiles in
   the doc's order. Each tile links to `/products/#…`. The CTA follows the grid.
5. **Motorsport** (ink over the parallax F1 car): headline, sub headline and body, then
   the 2×3 archive, which links to `/motorsport/#…`. The CTA follows.
6. **Discover:** three cards linking to Company, Technology and Products.
7. **Universal CTA:** a gold band.

### Company

1. **Hero:** eyebrow, H1 and body over a refinery ground, with a ghost "1998". Breadcrumb.
2. **Journey:** the five proof points on the gold value chain, then the crawlable country
   line.
3. **Quality** (ink): body, lab photo, certification badges.
4. **Global Presence:** the world map, the two-paragraph body and a region legend.
5. **Philosophy:** body, then the two story cards. They use photo slots and link to the
   story pages.
6. **The Journey Continues:** a two-line kinetic headline and the body.
7. **Universal CTA.**

### Technology

1. **Hero:** eyebrow, H1 and the two-paragraph body, with an oil-film canvas. Breadcrumb.
2. **S02:** headline and body, then the three pillar cards stacking as you scroll.
3. **S03, ester technologies** (ink, the page's centrepiece):
   - eyebrow;
   - the P-9 block: headline, sub headline, body, series chips (FS1, FS1 EUROGEN, FSR),
     then the pinned scene with five pillars and a link to the P-9 page;
   - the P-10 block: the same, with the MAXX GOLD chip.
4. **S04, P+ SYNTHESE:** eyebrow, headline, body, chips (SS1, D1, MAXX ULTRA) and three
   benefit tiles.
5. **Universal CTA.**

### P-9 and P-10 pages

1. **Hero:**
   - P-9 content: H1 = doc headline, sub = doc sub headline, a giant numeral, the
     molecule, the Home card's tagline and small line;
   - breadcrumb Home / Technology / P-x.
2. **Body**, plus "Powers" cards for each series. These link to the matching product
   category.
3. **The five pillars**, as numbered cards.
4. **`.placeholder`** for test data, the product line-up and technical data sheets.
5. **Sibling links:** the other ester technology, P+ SYNTHESE and the Technology
   overview.
6. **Universal CTA.**

### Products

1. **Hero:** eyebrow "OUR PRODUCTS", H1 "FROM RACE TO ROAD. INDUSTRY TO SEA.", body from
   card 03, and sticky category chips.
2. **Six category sections**, alternating image and copy:
   - each shows its product lines;
   - each shows its technology series only where the doc states it: Passenger Car gets
     FS1 and FS1 EUROGEN, Motorsport gets FSR, Motorcycle gets MAXX GOLD;
   - Commercial Fleet carries "Heavy Duty" as its eyebrow.
3. **`.placeholder`:** "Product catalogue to come".
4. **Universal CTA.**

### Motorsport

1. **Hero** over the F1 car: eyebrow, H1 = doc headline, sub = doc sub headline, and a
   "200+ RACING PARTNERSHIPS" stat. Breadcrumb.
2. **The doc body**, set as large editorial text.
3. **Six discipline rows**, never a slider. Each row (`#fia-formula` … `#touring`) has a
   number, an H2, the events named in the doc and the current site, a photo or
   `.photo-slot`, and an involvement `.placeholder`.
4. **Link cards** to P-9 ESTER and Products, Motorsport.
5. **Universal CTA.**

### Stories

Hero (eyebrow "FEATURED STORY", H1, sub), photo slot, the doc's story copy, a "full story
to come" placeholder, gallery slots, the next-story link and a link back to Our Company,
then the Universal CTA.

### Contact

Hero (eyebrow "CONTACT US", H1 "LET'S MOVE PERFORMANCE FORWARD.", doc CTA body), then:

- the details: address, phone, email, socials;
- a lazy-loaded map;
- an enquiry form with name, company, email, phone, country, enquiry type and message.

### Become a Distributor

Hero (H1 "LET'S BUILD THE NEXT MARKET TOGETHER.", doc CTA body), then:

- the "lasting partnerships" paragraph from the Global Presence body;
- the key numbers;
- the benefits carried over from the current site;
- a list of current markets;
- an application form.

## 8. Architecture

```
princelubricants/
  index.html, 404.html, <route>/index.html …
  assets/css/site.css           tokens, base, components, sections
  assets/js/site.js             global UI, reveals, counters, scenes, forms
  assets/js/vendor/             gsap, ScrollTrigger, SplitText (3.13.x)
  assets/img/                   WebP crops, brand, og image, world-dots.svg
  partials/header.html, footer.html, cta.html
  tools/build.js                partial stamping, sitemap, llms.txt, checks
  tools/build-images.py         crops and WebP
  tools/build-map.js            dotted world map SVG from Natural Earth
  robots.txt, sitemap.xml, llms.txt, favicon.ico, site.webmanifest
  vercel.json, .vercelignore    (ignores tools/, partials/, docs/, README.md)
  README.md
```

### `tools/build.js` (no dependencies)

- **Stamping:** replaces everything between `<!-- @header -->…<!-- /@header -->`, and
  the same markers for `@footer` and `@cta`.
  - Partial tokens: `{{root}}` takes the relative prefix for the page's depth.
  - The page's `<body data-page>` sets `aria-current` on the matching nav item.
- **Outputs:** `sitemap.xml` (no `lastmod`, per the PX98 lesson) and `llms.txt`.
- **Checks** (any failure exits non-zero):
  - exactly one `<h1>`;
  - a `<title>` and a meta description;
  - the canonical equals origin plus path;
  - every internal `href` and `src` resolves, including `#fragment` targets;
  - JSON-LD parses;
  - no leftover `{{` tokens.

### Local preview

Links are written to directories. Under `file:`, `site.js` appends `index.html`, so
double-clicking works. Any static server works as it is.

### SEO and AI crawling

- **Per page:** title, description, canonical
  (`https://www.princelubricants.com/<path>`), Open Graph, Twitter cards, one H1, and a
  logical H2 and H3 outline.
- **JSON-LD:**
  - Organization and WebSite on home;
  - BreadcrumbList on inner pages;
  - AboutPage on Company;
  - ContactPage on Contact;
  - CollectionPage on Products.
- **robots.txt** allows every crawler and names the AI bots.
- **llms.txt** summarises the facts and the pages.

### Accessibility

- skip link;
- focus-visible rings;
- `aria-expanded` on menus, which close on Esc;
- reduced motion;
- alt text;
- the contrast fixes in §4.

### Performance

- WebP with width and height set;
- lazy loading below the fold;
- font preconnect with `display=swap`;
- deferred scripts;
- no layout shift from the loader.

## 9. Open items for the client

| # | Item | What the site does now |
|---|---|---|
| 1 | Product count hidden by the watermark ("more than [?]00") | "more than 500", from the current site's "500++" |
| 2 | Home base-oil storage hidden ("[?]0,000 MT") | ">15,000 MT", the legible Company figure |
| 3 | Home hero has no headline | H1 "PRINCE LUBRICANTS" |
| 4 | COMMERCIAL FLEET (Home) vs Heavy Duty (Products list) | Home: Commercial Fleet. Products: Commercial Fleet, eyebrow Heavy Duty |
| 5 | East African Safari Rally has no archive tile | Kept in the body copy |
| 6 | Typos | DRIFT, STARBURST, Heavy-Duty |
| 7 | P-12 ESTER is named but has no section | Text only |
| 8 | Contact details and socials | From the current site, confirm |
| 9 | Distributor benefits | From the current site, confirm |
| 10 | Racing event names (GP3, GT World Challenge, GT Asia Challenge, Le Mans, 100+ TCR) | From the current site, confirm |
| 11 | Form submission | Mail-client fallback until an endpoint is set |
| 12 | Photography and official marks | Labelled slots (§6) |
| 13 | Technology doc numbering (two S03s) and the CTA label copied from Company | Treated as S04 and Technology's CTA |

## 10. Verification

1. `node tools/build.js` passes every check.
2. Playwright at 1440×900 and 1920×1080, on every page:
   - zero console errors;
   - a screenshot of every section, reviewed;
   - the header, mega menus, mobile menu and forms work;
   - all content is visible with reduced motion and with JavaScript off;
   - `file:` navigation works.

## 11. Amendment, 2026-10-04: the visual reference is index.html, not PX98

The user reviewed the first shell and rejected it as "looking like the PX98 website, not
like old index.html". The intent in §4 was always to carry `../index.html` forward, but the
implementation had drifted into PX98's dark editorial language.

What drifted:

- left-aligned giant headlines;
- hairline panels and big ghost numerals;
- full-width mega panels;
- flat gold on black.

From here on, every page is built from index.html's own components and values, and only the
motion is upgraded.

**Components to use:**

- the centred photo hero, with a gradient overlay, gold grid, particles, orbs, the eyebrow
  between two rules, a typewriter title, a gold stats line, gold and outline buttons, and a
  bouncing scroll cue;
- the gold stats band with black line icons;
- white sections with a centred `sec-label`, `sec-title` and `gold-bar`;
- yellow-bordered pillars with gold circle icons;
- the dark technology split, with pulsing rings and an orbit around a floating pack shot,
  plus `tp` point cards and `tn` number tiles;
- white product cards with a pale-yellow image well, a gold tag and a "Discover" link;
- the racing band over a photo, with a gold badge, pill tags and a gold button;
- why-cards with a gold top rule;
- the photo band with an ink overlay;
- index.html's nav, with compact dropdowns rather than mega panels;
- index.html's footer, with a Certified list. The PX98 studio credit is not carried over.

**Motion added on top:**

- split-line headline reveals;
- gold-bar and label rules that draw in;
- odometer counters;
- scrubbed parallax;
- tilt with glare;
- a motorsport ticker;
- a gold wipe for image reveals;
- gold page transitions.
