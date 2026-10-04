# princelubricants.com

The PRINCE LUBRICANTS website: twelve static pages built on the client-approved
`index.html` design, with the copy from the client's October 2026 website document.
There is no framework and no build step at deploy time. What is in this folder is the
site.

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
| `/products/` | `products/index.html` | The six product categories, each with its own anchor |
| `/motorsport/` | `motorsport/index.html` | Motorsport heritage, one section per discipline |
| `/contact/` | `contact/index.html` | Contact details, map and enquiry form |
| `/become-a-distributor/` | `become-a-distributor/index.html` | Partnership, benefits, markets and application form |
| any missing URL | `404.html` | Not found (noindex) |

Product category anchors: `#passenger-car`, `#motorsport`, `#commercial-fleet`,
`#motorcycle`, `#industrial`, `#marine`.

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
- **Forms.** Contact and Become a Distributor open a mail draft to
  info@princelubricants.com. To post to a form service instead, set `formEndpoint` in
  the `SITE` constant near the top of `assets/js/site.js`.

## Build

```bash
node tools/build.js            # stamp partials, write sitemap.xml and llms.txt, check every page
node tools/build.js --check    # check only, write nothing
node --test tools/             # unit tests for the build script
```

The check fails a page that has missing partial markers, more or fewer than one `h1`,
a missing title, description or canonical, broken JSON-LD, an unfilled `{{token}}`, or
an internal link or `#fragment` that goes nowhere. It warns about titles over 65
characters and descriptions over 160. `llms.txt` opens with `tools/llms-intro.md`.

Two scripts make assets and only need to run again if their sources change:

- `python tools/build-images.py` crops the photography out of the old site's banners in
  `../Prince Lubricants Images/`, and draws the favicons and the share image. It needs
  Pillow, plus Oswald and Inter (from github.com/google/fonts) in `tools/data/`.
- `node tools/build-map.js` draws the Global Presence map from Natural Earth 1:110m
  data (URLs at the top of the script) saved into `tools/data/`. It writes
  `assets/img/world-dots.svg`, `assets/img/world-overlay.svg` and the map inside
  `company/index.html`.

`tools/data/` is not committed.

Browser checks used during development are in `tools/checks/`. Each one exports an
`async (page) => result` function for Playwright to run against the preview server.

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
this README and the repository's own files.

## Open items for the client

| # | Item | What the site does now |
|---|---|---|
| 1 | Product count hidden by the watermark ("more than [?]00") | "more than 500", from the current site's "500++" |
| 2 | Home base-oil storage hidden ("[?]0,000 MT") | ">15,000 MT", the legible Company figure |
| 3 | Home hero has no headline | H1 "PRINCE LUBRICANTS" |
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
| 15 | FS1 EUROGEN has no category in the document | Linked to Passenger Car, as an FS1 line |
| 16 | SS1, D1 and MAXX ULTRA have no category in the document | Named on Technology only |
| 17 | The "Designed and developed by Imsuya Global" credit | Left out of the footer. Add it back if wanted |

## Placeholders

Every gap the client still has to fill is a visible, labelled slot in the page:

- **Photography:** the AirAsia livery and the Expo 2017 stand (Company and both story
  pages), three gallery photos on each story page, the FS1 EUROGEN pack shot (P-9), the
  MAXX GOLD pack shot (P-10), motorcycle photography (Home and Products), and GT,
  Gymkhana, endurance and drift photography (Motorsport).
- **Official marks:** the ISO 9001:2015, API ENERGY, API STARBURST, ACEA and EELQMS logos
  (Company).
- **Content:** the full AirAsia and Expo 2017 stories; P-9 and P-10 test data, line-ups
  and data sheets; the product catalogue (grades, specifications, pack sizes); and one
  involvement summary for each of the six motorsport disciplines.
