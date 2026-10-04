# princelubricants.com multi-page site: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new www.princelubricants.com as a static, crawlable, animated multi-page
site from the client's Oct 2026 doc, in the visual language of `../index.html`.

**Architecture:**

- one real `index.html` per clean URL, with relative links;
- shared `assets/css/site.css` and `assets/js/site.js`, plus GSAP vendored;
- header, footer and CTA partials stamped into pages by a no-dependency Node script,
  which also writes `sitemap.xml` and `llms.txt` and fails on structural errors.

**Tech Stack:**

- HTML, CSS, vanilla JS;
- GSAP 3.13 (gsap, ScrollTrigger, SplitText);
- Node 20 (`node:test`) for tooling;
- Python 3 and Pillow for images;
- Playwright MCP for browser verification.

**Spec:** `docs/superpowers/specs/2026-10-04-princelubricants-site-design.md`. The copy
source is `docs/content/client-doc-2026-10.md`.

**Execution note:** the user asked to go straight on to development, so execution is
native (in session). Page markup is written from spec §7 and the copy source. It is not
duplicated in this plan. Tooling code is written out in full.

## Global Constraints

- Canonical origin is `https://www.princelubricants.com`, and every page's canonical is
  origin plus its clean path.
- Client copy is verbatim from `docs/content/client-doc-2026-10.md`. The only edits are
  the listed typo fixes (DRIFT, STARBURST, Heavy-Duty).
- No stock photography. Use only `../Prince Lubricants Images/` crops, drawn visuals and
  labelled `.photo-slot` or `.placeholder` blocks.
- No new marketing claims. Functional UI text only.
- Exactly one `<h1>` per page. All copy is present in the HTML without JavaScript.
- Every internal link and anchor resolves.
- Content is hidden for animation only under `html.js`. Reduced motion shows everything.
- `cursor: none` applies only when JS is running, the pointer is fine, and motion is
  allowed.
- Small gold text on white uses `--gold-deep: #8A6A00`.
- Review is at desktop widths (1440 and 1920). Layouts stay fluid, but mobile is not
  tuned.
- Footer credit: "Designed and developed by Imsuya Global", linking to
  https://imsuyaglobal.com.

## Review Focus

1. **JavaScript off, or GSAP failing to load.** Every heading and paragraph must still
   be visible, and the native cursor must still show. Pinned in Task 3 step 6 and Task 10
   step 3.
2. **`prefers-reduced-motion: reduce`.** No pinning, no parallax, no custom cursor, all
   content visible at once. Pinned in Task 3 step 6 and Task 10 step 3.
3. **Double-click preview from disk (`file:`).** Directory links must open
   `…/index.html`, not a folder listing. Pinned in Task 3 step 6.
4. **Keyboard use of the mega menus.** Tab reaches the triggers, Enter or Space opens a
   menu, Esc closes it and returns focus, and `aria-expanded` follows. The skip link
   works. Pinned in Task 3 step 6.
5. **Deep links to anchors under the fixed header** (`/products/#marine`,
   `/motorsport/#drift`). The target heading must land below the header, not under it.
   Pinned in Task 8 step 4.

---

## File structure

| File | Responsibility |
|---|---|
| `tools/build.js` | Partial stamping, `aria-current`, sitemap, llms.txt, structural and link checks |
| `tools/build.test.js` | `node:test` unit tests for build.js |
| `tools/llms-intro.md` | Curated head of llms.txt, facts taken from doc copy |
| `tools/build-images.py` | Crops and WebP, favicon set, OG image |
| `tools/build-map.js` | Dotted world map SVG with Singapore hub and the 14 named markets |
| `partials/header.html`, `footer.html`, `cta.html` | Shared blocks with `{{root}}` and `{{home}}` tokens |
| `assets/css/site.css` | Tokens, base, components, page sections |
| `assets/js/site.js` | Global UI, reveals, counters, scenes, forms |
| `assets/js/vendor/*.min.js` | gsap, ScrollTrigger, SplitText |
| `assets/img/**` | Generated imagery |
| Route `index.html` files and `404.html` | Pages |
| `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest`, `favicon.ico` | Crawl surface |
| `vercel.json`, `.vercelignore`, `.gitattributes`, `README.md` | Deploy and hand-over |

---

### Task 1: Build tooling (TDD)

**Files:**
- Create: `tools/build.js`, `tools/build.test.js`, `.gitattributes`

**Interfaces:**
- Produces:
  - `urlFor(rel) → string`
  - `rootPrefix(rel) → string`
  - `homeHref(rel) → string`
  - `fill(tpl, ctx) → string`
  - `markCurrent(html, pageUrl) → string`
  - `stamp(html, partials, ctx, pageUrl) → string`
  - `checkPage(rel, html) → string[]`
  - `checkLinks(rel, html, io) → string[]`, where `io = {exists(file), read(file)}`
  - `sitemap(urls) → string`
- CLI: `node tools/build.js` stamps, writes and checks. `--check` checks only.
- Markers: `<!-- @header -->…<!-- /@header -->`, and the same for `footer` and `cta`.
- `cta` is required unless `<body data-cta="none">`.
- 404 uses absolute `/` links and `noindex`.

- [ ] **Step 1: Write the failing tests** in `tools/build.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('./build.js');

test('urlFor maps page files to clean URLs', () => {
  assert.equal(b.urlFor('index.html'), '/');
  assert.equal(b.urlFor('company/index.html'), '/company/');
  assert.equal(b.urlFor('company/airasia/index.html'), '/company/airasia/');
  assert.equal(b.urlFor('404.html'), '/404.html');
});

test('rootPrefix and homeHref are relative by depth, absolute on the 404 page', () => {
  assert.equal(b.rootPrefix('index.html'), '');
  assert.equal(b.rootPrefix('company/index.html'), '../');
  assert.equal(b.rootPrefix('company/airasia/index.html'), '../../');
  assert.equal(b.rootPrefix('404.html'), '/');
  assert.equal(b.homeHref('index.html'), './');
  assert.equal(b.homeHref('technology/p-9-ester/index.html'), '../../');
  assert.equal(b.homeHref('404.html'), '/');
});

test('stamp replaces marker contents, fills tokens, and is idempotent', () => {
  const page = '<body><!-- @header -->stale<!-- /@header --></body>';
  const partials = { header: '<a href="{{root}}company/">Company</a>' };
  const once = b.stamp(page, partials, { root: '../', home: '../' }, '/technology/');
  assert.equal(once, '<body><!-- @header -->\n<a href="../company/">Company</a>\n<!-- /@header --></body>');
  assert.equal(b.stamp(once, partials, { root: '../', home: '../' }, '/technology/'), once);
});

test('markCurrent marks only the link that points at this page', () => {
  const html = '<a href="../company/">C</a><a href="../technology/">T</a><a href="https://x.com/">X</a>';
  assert.equal(
    b.markCurrent(html, '/company/'),
    '<a href="../company/" aria-current="page">C</a><a href="../technology/">T</a><a href="https://x.com/">X</a>'
  );
});

const good = (canon) => `<html><head><title>T</title><meta name="description" content="D">
<link rel="canonical" href="https://www.princelubricants.com${canon}">
<script type="application/ld+json">{"@type":"WebPage"}</script></head>
<body><!-- @header --><!-- /@header --><h1>One</h1><!-- @cta --><!-- /@cta --><!-- @footer --><!-- /@footer --></body></html>`;

test('checkPage passes a well-formed page', () => {
  assert.deepEqual(b.checkPage('company/index.html', good('/company/')), []);
});

test('checkPage flags h1 count, canonical, JSON-LD, tokens and markers', () => {
  const rel = 'company/index.html';
  assert.match(b.checkPage(rel, good('/company/').replace('<h1>One</h1>', '')).join(), /h1/);
  assert.match(b.checkPage(rel, good('/company/').replace('</h1>', '</h1><h1>Two</h1>')).join(), /h1/);
  assert.match(b.checkPage(rel, good('/wrong/')).join(), /canonical/);
  assert.match(b.checkPage(rel, good('/company/').replace('{"@type":"WebPage"}', '{bad')).join(), /JSON-LD/);
  assert.match(b.checkPage(rel, good('/company/').replace('<h1>One', '<h1>{{root}}')).join(), /token/);
  assert.match(b.checkPage(rel, good('/company/').replace('<!-- @cta --><!-- /@cta -->', '')).join(), /cta/);
  assert.deepEqual(b.checkPage(rel, good('/company/').replace('<!-- @cta --><!-- /@cta -->', '').replace('<body>', '<body data-cta="none">')), []);
});

test('checkLinks flags missing files and missing fragments, ignores external links', () => {
  const files = {
    'company/index.html': '<h2 id="journey">J</h2>',
    'assets/css/site.css': '',
  };
  const io = { exists: (f) => f in files, read: (f) => files[f] };
  const html = '<a href="../company/#journey">ok</a><a href="../company/#nope">bad hash</a>' +
    '<a href="../missing/">bad file</a><link href="../assets/css/site.css"><a href="mailto:a@b.c">m</a><a href="https://e.com/">e</a>';
  const errs = b.checkLinks('technology/index.html', html, io);
  assert.equal(errs.length, 2);
  assert.match(errs[0], /#nope/);
  assert.match(errs[1], /missing/);
});

test('sitemap lists absolute URLs without lastmod', () => {
  const xml = b.sitemap(['/', '/company/']);
  assert.match(xml, /<loc>https:\/\/www\.princelubricants\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.princelubricants\.com\/company\/<\/loc>/);
  assert.doesNotMatch(xml, /lastmod/);
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test tools/`. Expected:
  FAIL with "Cannot find module './build.js'".
- [ ] **Step 3: Implement `tools/build.js`.** Implement exactly the interfaces above:
  - page discovery: walk the repo, skipping `.git docs tools partials assets node_modules`,
    and collect `index.html` and `404.html`;
  - `main()`: stamp, write, check pages, then check links across all pages, then write
    `sitemap.xml` (indexable pages) and `llms.txt` (`tools/llms-intro.md` plus a page list
    from each `<title>` and meta description);
  - output: errors print and exit code 1, warnings print only.
- [ ] **Step 4: Run the tests to verify they pass.** Run `node --test tools/`. Expected:
  all PASS.
- [ ] **Step 5: Commit.** Add `.gitattributes` (`* text=auto eol=lf`, binary images) and
  commit as "Build tooling: partial stamping, sitemap, llms.txt and page checks".

### Task 2: Asset pipeline

**Files:**
- Create: `tools/build-images.py`, `tools/build-map.js`, `assets/img/**`,
  `assets/js/vendor/{gsap,ScrollTrigger,SplitText}.min.js`, `favicon.ico`,
  `assets/img/brand/*`, `site.webmanifest`

**Interfaces:**
- Produces:
  - WebP files: `assets/img/photo/{refinery,rig,formula,touring,fleet,marine,pour,lab,handshake}.webp`
  - brand files: `assets/img/brand/logo.png`, `favicon-*.png`, `icon-192.png`,
    `icon-512.png`, `og-default.jpg` (1200×630)
  - `assets/img/world-dots.svg`, with `viewBox="0 0 1000 500"`, `<g id="land">` dots, and
    `data-market` markers for the 14 countries plus `data-hub="singapore"`
  - `window.PRINCE_MAP`: none. The map markers are positioned inside the SVG.

- [ ] **Step 1: Crops.** Open each source and choose crop boxes that are clear of baked-in
  text. Write `build-images.py` holding the boxes, and run it. Expected: each output exists
  and is ≥ 700px wide where the source allows. Print the sizes.
- [ ] **Step 2: Favicon and OG.** Generate them from `logo.png`: yellow tile and "P" for
  the favicon; ink ground, logo and the doc eyebrow for OG.
- [ ] **Step 3: Vendor GSAP 3.13.0 from cdnjs.** Verify the three files are non-empty and
  begin with the GSAP banner comment.
- [ ] **Step 4: World map.** Fetch Natural Earth 110m land and countries GeoJSON into
  `tools/data/` (gitignored). `build-map.js` projects equirectangular onto 1000×500,
  samples a 5-unit grid (point in polygon) for land dots, and writes markers at the
  centroids of the 14 named countries plus Singapore. Expected: the SVG has more than 1500
  dots and 15 markers.
- [ ] **Step 5: Commit** as "Imagery, brand marks, vendored GSAP and the world map".

### Task 3: Global shell (CSS, JS, partials, 404)

**Files:**
- Create: `assets/css/site.css`, `assets/js/site.js`, `partials/*.html`, `404.html`,
  `robots.txt`, `vercel.json`, `.vercelignore`

**Interfaces:**
- Consumes: Task 1 markers and tokens, Task 2 assets.
- Produces:
  - CSS components named in spec §4 and §5: `.container .section .section--ink`,
    `--paper`, `--paper-2`, `--gold`, `.eyebrow .h-display .h1 .h2 .h3 .lede`,
    `.btn .btn--gold .btn--outline .btn--ink .link-arrow .ghost-num .stat-band .stat`,
    `.placeholder .photo-slot .breadcrumb .page-hero .cta-band .tilt .rv .rv-l .rv-r`
  - JS: `data-` hooks `[data-count]`, `[data-parallax]`, `[data-split]`, `[data-dot]`,
    `[data-scene]`
  - JS: `site.js` init order: `fileLinks`, `loaderOnce`, `header`, `progress`, `cursor`,
    `dots`, `toTop`, `motion` (reveals, split, counters, parallax, tilt), `scenes`, `forms`

- [ ] **Step 1: Partials.**
  - Header: mega panels and mobile menu.
  - Footer: links, contact, socials, legal line and credit.
  - CTA: doc S07, verbatim.
- [ ] **Step 2: `site.css`.**
  - Tokens, base, typography, buttons, header and mega menu, footer, CTA band, global UI,
    placeholder and photo slot, reveal states under `html.js`, reduced-motion overrides,
    `scroll-margin-top` for anchors.
  - Cross-document View Transitions: `@view-transition { navigation: auto; }` with the
    gold wipe keyframes.
- [ ] **Step 3: `site.js`.** Each module is a no-op when its elements are absent. GSAP
  loads with `defer` and is used only if `window.gsap` exists. A 2.5s failsafe adds `.vis`
  to everything.
- [ ] **Step 4: `404.html` and stubs.**
  - Write `404.html` (noindex, `data-cta="none"`).
  - Write a minimal valid stub for every other route: head, canonical, the spec's H1, the
    markers, and every anchor id another page links to (`#journey`, `#quality`,
    `#global-presence`, `#p-plus-synthese`, the six product ids, the six discipline ids).
  - Later tasks replace these stubs, which keeps the link check green throughout.
  - Run `node tools/build.js`. Expected: 0 errors.
- [ ] **Step 5: `robots.txt`** (allow all, name GPTBot, ClaudeBot, PerplexityBot and
  Google-Extended, plus the sitemap URL). `vercel.json` (`trailingSlash: true`, headers as
  in PX98). `.vercelignore`.
- [ ] **Step 6: Browser checks on 404.html.**
  - Playwright at 1440×900 shows 0 console errors.
  - Keyboard: Tab to the Company trigger, Enter opens it (`aria-expanded="true"`), Esc
    closes it and focus returns.
  - The skip link focuses `#main`.
  - With JS disabled (new context, `javaScriptEnabled:false`), the body's computed
    `cursor` is not `none`.
  - Reduced motion emulated: `#cursor-ring` is not displayed.
  - `file:` navigation: open `file:///…/404.html`, and the header's Company link `href`
    ends with `company/index.html` once a directory exists.
- [ ] **Step 7: Commit** as "Global shell: design system, header, footer, CTA, motion
  runtime".

### Task 4: Home page

**Files:**
- Create: `index.html`
- Modify: `assets/css/site.css` (home sections), `assets/js/site.js` (`heroLetters`,
  molecule SVG animation)

- [ ] **Step 1: Write `index.html`.** S01 to S07 per spec §7 Home, with copy from the
  transcription's Home section. Head: title "PRINCE LUBRICANTS | Singapore's Performance
  Lubricant Specialist Since 1998", description from the hero body, canonical `/`, OG,
  Organization and WebSite JSON-LD.
- [ ] **Step 2: Section CSS and JS.** Hero letters, gold stat band (5 counters), P-9 and
  P-10 cards with inline molecule SVG, a 2×3 tile grid in the doc's order, a 2×3 archive,
  Discover cards.
- [ ] **Step 3: Build.** Run `node tools/build.js`. Expected: 0 errors.
- [ ] **Step 4: Browser.** At 1440×900 and 1920×1080, screenshot every section and review
  it against the spec. Expect 0 console errors and counters that end on their exact
  target text.
- [ ] **Step 5: Commit** as "Home page".

### Task 5: Our Company page

**Files:**
- Create: `company/index.html`
- Modify: `site.css`, `site.js` (`valueChain`, `worldMap` scenes)

- [ ] **Step 1: Write `company/index.html`.**
  - S01 to S07 per spec §7 Company.
  - Inline `world-dots.svg` so the markers can animate.
  - The crawlable country line sits under the proof points.
  - Story cards link to the two story URLs.
  - JSON-LD: AboutPage and BreadcrumbList.
- [ ] **Step 2: Scenes.** The value chain line draws on scroll. The map arcs are SVG
  quadratic paths from the hub to each marker, drawn with `stroke-dashoffset`, and the hub
  pulses.
- [ ] **Step 3: Build and browser review.** Same checks as Task 4, at both widths. Expected
  0 errors.
- [ ] **Step 4: Commit** as "Our Company page".

### Task 6: Our Technology page

**Files:**
- Create: `technology/index.html`
- Modify: `site.css`, `site.js` (`pillarStack`, `esterScene`)

- [ ] **Step 1: Write `technology/index.html`.**
  - S01 to S04 per spec §7 Technology.
  - Section ids: `#formulation`, `#ester-technologies`, `#p-9-ester`, `#p-10-ester`,
    `#p-plus-synthese`. The mega menu links to `#p-plus-synthese`.
  - JSON-LD: TechArticle-free. Use WebPage and BreadcrumbList.
- [ ] **Step 2: Scenes.**
  - Pillar stack: CSS sticky, with JS scaling earlier cards back.
  - Ester scene: ScrollTrigger pin, five states per technology. A state switches when the
    matching pillar crosses the viewport centre. Pinning is skipped under reduced motion,
    and then the pillars are a plain list.
- [ ] **Step 3: Build and browser review** at both widths.
- [ ] **Step 4: Commit** as "Our Technology page".

### Task 7: P-9 and P-10 pages

**Files:**
- Create: `technology/p-9-ester/index.html`, `technology/p-10-ester/index.html`

- [ ] **Step 1:** Write both pages per spec §7. Series cards link to
  `../../products/#passenger-car`, `#motorsport` or `#motorcycle`.
- [ ] **Step 2:** Build and browser review.
- [ ] **Step 3: Commit** as "P-9 and P-10 ESTER pages".

### Task 8: Products and Motorsport pages

**Files:**
- Create: `products/index.html`, `motorsport/index.html`

- [ ] **Step 1: Products.**
  - Six category sections. Ids: `passenger-car motorsport commercial-fleet motorcycle
    industrial marine`.
  - Sticky chips.
  - Catalogue placeholder.
  - JSON-LD: CollectionPage and BreadcrumbList.
- [ ] **Step 2: Motorsport.**
  - Six discipline rows. Ids: `fia-formula gt gymkhana endurance drift touring`.
  - Events from the doc and current site.
  - Photos: `formula.webp` and `touring.webp`. Slots for the rest.
  - Involvement placeholders.
- [ ] **Step 3:** Build. Expected 0 errors. The home tiles and archive links now resolve
  their fragments.
- [ ] **Step 4: Anchor check.** Navigate to `products/#marine` and `motorsport/#drift` at
  1440×900. The target heading's `getBoundingClientRect().top` must be ≥ the header height.
- [ ] **Step 5: Commit** as "Products and Motorsport pages".

### Task 9: Stories, Contact, Become a Distributor

**Files:**
- Create: `company/airasia/index.html`, `company/china-lubricant-expo-2017/index.html`,
  `contact/index.html`, `become-a-distributor/index.html`
- Modify: `site.js` (`forms`: mailto fallback, `SITE.formEndpoint`)

- [ ] **Step 1: Story pages,** per spec §7 Stories.
- [ ] **Step 2: Contact and Distributor pages** (`data-cta="none"`). Forms carry `name`
  attributes. Submitting opens a mail draft to `info@princelubricants.com` with the fields
  in the body. An empty required field blocks submission with native validation.
- [ ] **Step 3: Build and browser review.** Submitting the form with empty required
  fields shows validation and opens no mailto.
- [ ] **Step 4: Commit** as "Story, Contact and Become a Distributor pages".

### Task 10: Crawl surface, hand-over, full verification

**Files:**
- Create: `tools/llms-intro.md`, `README.md`
- Modify: generated `sitemap.xml` and `llms.txt`

- [ ] **Step 1: Write `llms-intro.md`** (facts from the doc only). Run
  `node tools/build.js`. Expected: 0 errors, a sitemap of 11 URLs, and llms.txt listing 11
  pages.
- [ ] **Step 2: README.** Pages, how to preview, build commands, the open items table
  from spec §9, and the placeholder list.
- [ ] **Step 3: Full browser pass over all 12 pages at 1440×900 and 1920×1080.**
  - 0 console errors.
  - Screenshots reviewed.
  - JS disabled: every `h1, h2, h3, p` has computed opacity 1.
  - Reduced motion: no element with `position: fixed` from a pin spacer, and all
    `.rv` visible.
- [ ] **Step 4: Run `node --test tools/`.** All pass.
- [ ] **Step 5: Commit** as "Crawl surface, README and verification fixes".
