#!/usr/bin/env node
/*
 * Writes the product catalogue from docs/content/products.json. No dependencies.
 *
 *   node tools/build-catalogue.js        then        node tools/build.js
 *
 *   products/<category>/index.html             a category: its ranges, as product cards; or, if
 *                                              it has a client document, its product types
 *   products/<category>/<type>/index.html      a type: the menu of types, its series, and one
 *                                              card per product with its list from the document
 *   products/<category>/<product>/index.html   a product: its pack, introduction, sizes,
 *                                              specifications, application, benefits, data
 *   products/index.html                        each category's write-up, its ranges or types and
 *                                              its buttons, between <!-- @cat:<id> --> markers
 *
 * Every page carries the partial markers; build.js fills them and checks every link. The
 * copy is the client's: the category's product document if it has one, otherwise the current
 * site's, as tools/build-products.py collected it. The exceptions are the category write-ups
 * below, which the client asked for (amendment 1, page 8), and the lines in product-types.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const TYPES = require('./product-types.js');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.princelubricants.com';
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/content/products.json'), 'utf8'));
// "PRINCE LUBRICANTS products are manufactured by PRINCE GLOBAL PTE. LTD. in Singapore" (the
// client's FAQ, docs/content/faq.json).
const ORIGIN_COUNTRY = { '@type': 'Country', name: 'Singapore' };

// The six categories as the site presents them. `lines` is the client doc's line for each.
const META = {
  'passenger-car': {
    h1: 'PASSENGER <span>CAR</span>', photo: 'pour.webp', pos: '30% 50%', dark: false,
    lines: 'Engine Oils · Transmission Fluids · Antifreeze Coolants',
    title: 'Passenger Car Engine Oils & Fluids | PRINCE LUBRICANTS',
    description: 'PRINCE LUBRICANTS for passenger cars: ester based and synthetic engine oils, ATF, manual transmission and gear oils, hydraulic, brake and cooling fluids.',
    intro: 'Engine oils for every kind of car, from the P-9 ESTER flagships FS1, FS1 EUROGEN and FS1 TECHNICA to FSe for hybrid engines, FS SUPER, SS1, SS SUPER and M1, with the transmission fluids, gear oils, hydraulic and brake fluids and coolants that keep the rest of the car in step.',
    keywords: 'engine oil Singapore, car engine oil, fully synthetic engine oil, ester engine oil, FS1, ATF, gear oil, brake fluid, coolant',
  },
  competition: {
    h1: 'COMPETITION', photo: 'formula-pass.webp', pos: '38% 58%', dark: true,
    lines: 'Racing Engine Oils · Gear Oils · Brake Fluids · Coolants',
    title: 'Racing Engine Oils & Competition Fluids | PRINCE LUBRICANTS',
    description: 'FSR racing engine oils with P-9/P-12 double ester, PRO-SHIFT GT RACING gear oils, BRAKE FLUID GT RACING and GT COOLING race coolants from Singapore.',
    intro: 'Built for the track: FSR racing engine oils with Group V double ester (P-9/P-12) base stocks, PRO-SHIFT GT RACING gear, axle and differential oils, BRAKE FLUID GT RACING and the GT COOLING race coolants, each made for the heat, loads and revs of competition.',
    keywords: 'racing engine oil, racing oil Singapore, motorsport oil, FSR, ester racing oil, racing gear oil, racing brake fluid, race coolant',
  },
  'commercial-vehicle': {
    h1: 'COMMERCIAL <span>VEHICLE</span>', photo: 'fleet.webp', pos: '40% 50%', dark: false,
    lines: 'Diesel Engine Oils · Transmission & Gear Oils · Coolants',
    title: 'Commercial Vehicle & Heavy-Duty Diesel Oils | PRINCE LUBRICANTS',
    description: 'D1 GOLD and D1 GOLD 4X4 with P-12 ester, D1 and Devo heavy-duty diesel engine oils, ATF, SUPER-SHIFT gear oils and coolants for trucks, buses and fleets.',
    intro: 'For trucks, buses, pickups and working fleets: D1 GOLD and D1 GOLD 4X4 with P-12 Ester-Based Technology, the D1 and Devo heavy-duty diesel engine oils, and the transmission fluids, SUPER-SHIFT gear oils, power steering and brake fluids and heavy-duty coolants that keep them working.',
    keywords: 'diesel engine oil, heavy-duty engine oil Singapore, HDEO, truck engine oil, CK-4 engine oil, fleet lubricants, D1 GOLD, Devo',
  },
  powersports: {
    h1: 'POWERSPORTS', photo: 'bike.webp', pos: '50% 50%', dark: true,
    lines: '4T & 2T Engine Oils · Gear Oils · Fork Oils & Coolants',
    title: 'Powersports: Motorcycle & Scooter Oils | PRINCE LUBRICANTS',
    description: 'MAXX GOLD 4T with P-10 ester, MAXX ULTRA and MAXX LAUNCH motorcycle oils, scooter and 2T oils, MAXX-SHIFT gear oils, fork oils, coolants and chain lube.',
    intro: 'For every rider: MAXX GOLD 4T with P-10 Ester-Based Technology, MAXX ULTRA 4T and MAXX LAUNCH 4T motorcycle oils, scooter and two-stroke oils, with MAXX-SHIFT gear oils, fork oils, brake fluid, MAXX COOL coolants and chain lube for the rest of the machine.',
    keywords: 'motorcycle engine oil, motorcycle oil Singapore, 4T oil, JASO MA2, scooter oil, 2T oil, fork oil, motorcycle coolant, MAXX GOLD',
  },
  industrial: {
    h1: 'INDUSTRIAL', photo: 'rig.webp', pos: '60% 40%', dark: false,
    lines: 'Hydraulic · Compressor · Turbine · Gear Oils',
    title: 'Industrial Hydraulic, Compressor & Gear Oils | PRINCE LUBRICANTS',
    description: 'PRINCE LUBRICANTS industrial range: hydraulic, air compressor, refrigeration, turbine, spindle bearing, gear, heat transfer and electrical insulating oils.',
    intro: 'Oils for machines that run around the clock: hydraulic, air compressor, refrigeration, turbine, spindle bearing, gear, heat transfer and electrical insulating oils.',
    keywords: 'industrial lubricants Singapore, hydraulic oil, compressor oil, turbine oil, industrial gear oil, refrigeration oil, heat transfer oil',
  },
  marine: {
    h1: 'MARINE', photo: 'marine.webp', pos: '50% 50%', dark: true,
    lines: 'Outboard Engine Oils · Heavy-Duty Oils · System Lubricants',
    title: 'Marine Lubricants & Outboard Oils | PRINCE LUBRICANTS',
    description: 'MARINO outboard oils and marine gear oils for boats, and cylinder, trunk piston, stern tube, gear, turbine, hydraulic and compressor oils for ships.',
    intro: 'From the outboard to the engine room: MARINO four-stroke and two-stroke outboard oils and marine gear oils for boats, and cylinder, trunk piston, stern tube, gear, turbine, hydraulic and compressor oils for ships.',
    keywords: 'marine lubricants Singapore, outboard engine oil, marine engine oil, cylinder oil, trunk piston engine oil, stern tube oil, MARINO',
  },
};

// The client's documents tie these series to a technology; the Products page shows them as tags.
const SERIES_TAGS = {
  'passenger-car': ['P-9 ESTER series', ['FS1 SERIES', 'FS1 EUROGEN SERIES', 'FS1 TECHNICA SERIES']],
  competition: ['P-9/P-12 ESTER series', ['FSR SERIES']],
  'commercial-vehicle': ['P-12 ESTER series', ['D1 GOLD 4X4 SERIES', 'D1 GOLD SERIES']],
  powersports: ['P-10 ESTER series', ['MAXX GOLD 4T SERIES', 'MAXX GOLD 2T']],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

// A category holds ranges; one with a client document holds types, and they hold the ranges.
const rangesOf = (cat) => (cat.types ? cat.types.flatMap((t) => t.ranges) : cat.ranges);
const countOf = (ranges) => ranges.reduce((n, r) => n + r.products.length, 0);
const products = (n) => `${n} ${n === 1 ? 'product' : 'products'}`;
// A product that an earlier category's document also has keeps its one page there: `page` is
// that page's "category/product", and the card links to it. From a type or product page, the
// products folder is two levels up.
const hrefOf = (p) => (p.page ? `../../${p.page}/` : `../${p.id}/`);
const urlOf = (cat, p) => `${ORIGIN}/products/${p.page || `${cat.id}/${p.id}`}/`;
const categoryOf = (id) => DATA.categories.find((c) => c.id === id);

// A description for search results: the first sentences that fit in 155 characters.
function summary(text) {
  const t = String(text || '').trim();
  if (t.length <= 155) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > 155) break;
    out += s;
  }
  if (out.trim()) return out.trim();
  const cut = t.slice(0, 152);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

// A document's product name, as its family and its grade: "PRINCE® FS1 SAE 0W-30" ->
// ["PRINCE® FS1", "SAE 0W-30"]. The grade opens at SAE, DOT, CHF, G1x or HD, or at a word
// that starts with a digit, after at least one word of family; 4T, 2T and 4X4 are part of a
// series name (MAXX GOLD 4T, D1 GOLD 4X4), not a grade. A fluid without a grade is told apart
// by the words after its family's.
function nameParts(name) {
  const grade = name.match(/^(PRINCE® \S+(?: \S+)*?) ((?:SAE|DOT|CHF|HD|G1\d\S*|(?!\d+T\b|4X4\b)\d\S*)(?: .*)?)$/);
  if (grade) return [grade[1], grade[2]];
  const fluid = name.match(/^PRINCE® (ATF|DCT|CVT|POWER STEERING FLUID)(?: (.+))?$/);
  if (fluid) return fluid[2] ? [`PRINCE® ${fluid[1]}`, fluid[2]] : ['PRINCE®', fluid[1]];
  return [name, ''];
}

// "FS1 0W-30" -> "FS1 <span>0W-30</span>": the grade, from the first word that starts with a digit.
function goldGrade(name) {
  if (name.startsWith('PRINCE® ')) {
    const [family, grade] = nameParts(name);
    // A hyphenated family name (SUPER-SHIFT) never breaks at its hyphen.
    const lead = family.split(' ').map((w) => (w.includes('-') ? `<span class="glue">${esc(w)}</span>` : esc(w))).join(' ');
    return grade ? `${lead} <span>${esc(grade)}</span>` : lead;
  }
  const words = name.split(' ');
  const i = words.findIndex((w, k) => k > 0 && /^\d/.test(w));
  if (i < 1) return esc(name);
  return `${esc(words.slice(0, i).join(' '))} <span>${esc(words.slice(i).join(' '))}</span>`;
}

// Running text, with every viscosity grade kept whole: 0W-20 never breaks at its hyphen.
const prose = (text) => esc(text).replace(/\d+W-\d+/g, '<span class="glue">$&</span>');

// The headings are set in capitals, except a series whose small letter is part of its name: FSe.
const keepCase = (text) => (/\b[A-Z]{2,}[a-z]\b/.test(text) ? ' keep-case' : '');

// "fs1-4l-0w-30" -> "4 L"; the pack size each image shows.
function packSize(image) {
  const m = image.match(/(?:^|-)(\d+)l(?:-|$)/);
  return m ? `${m[1]} L` : '';
}

function img(name, root, alt, cls, lazy = true) {
  const [w, h] = DATA.imageSizes[name];
  return `<img${cls ? ` class="${cls}"` : ''} src="${root}assets/img/products/${name}.webp" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
}

// The outlines of PRINCE's own jug and bottle, traced from the pack shots, and of an aerosol
// can, for a product whose pack shot the client still has to send.
const OUTLINES = {
  jug: { box: '0 0 151 200', cap: 'M14 19.5H54', body: 'M22.7 .5 41.7 .4 50.8 1.7 51.6 3 52.1 11.7 53.2 16.9 55.3 23 58 24.8 86.3 12.4 102 7.1 116 3.6 133.3 1.1 139 2.7 142.9 6.3 144.6 11.7 143.7 25.7 143.7 39.3 147.3 73.7 150.3 132.7 150.3 188.7 149.6 192.3 147.3 195.9 144 198 139.3 199.3 10.7 199 5.7 197.6 2.1 194.3 .7 191 .3 187.7 .7 164.7 1.3 158.7 1.4 74 5.1 64.3 13.2 22.3 16.2 11.3 16.6 2.7 18.4 1.0ZM116.3 28.2 120.7 28.6 124 30.1 126.5 33 127.3 36.7 127.2 94.7 126.2 98.3 124.3 100.7 120.7 101.9 117.3 101.6 114.7 100.7 111.7 98.6 108.2 93.3 102.6 75.7 94.7 45 95.7 39.3 99.7 34.9 109.3 30.1Z' },
  can: { box: '0 0 76 200', cap: 'M6 46H70', body: 'M31 .5h14V10H31ZM38 10C27 10 18 15 14 23L6 30V192Q6 199.5 14 199.5H62Q70 199.5 70 192V30L62 23C58 15 49 10 38 10Z' },
  bottle: { box: '0 0 109 200', cap: 'M2.4 24H45', body: 'M13 .5 34.7 .7 41.5 2.8 42.4 4.7 44.4 23.3 45.1 24.2 79.7 7.8 93 2.7 97.3 1.7 100.7 2 104.3 3.6 107 6.7 107.6 11.7 104.5 28 103.7 39.7 107 79 108.3 105 108.3 138.7 107.8 142.3 108.3 147.7 108.3 189 107.3 193.7 105.3 196.3 103 197.8 92.7 199.3 17.3 199.3 13 198.2 8.7 195.5 6.4 193 3.9 188.7 1.4 181.3 .7 166.7 .3 61 1.7 30.7 4.1 3.4 5.1 2.2 8.7 .9Z' },
};

// The outline of the pack a product comes in: a can for an aerosol, a jug when it is sold in a
// jug's size (4 to 10 litres), otherwise a bottle; 18 and 20 litres are pails, not the pack
// its shot would show.
const outlineOf = (p) => {
  if (p.facts.some(([label, value]) => label === 'Application Method' && /Aerosol/i.test(value))) return 'can';
  return p.sizes.some((s) => parseFloat(s) >= 4 && parseFloat(s) <= 10) ? 'jug' : 'bottle';
};
const outline = (kind) => {
  const o = OUTLINES[kind];
  return `<svg class="pack-outline" viewBox="${o.box}" aria-hidden="true"><path fill-rule="evenodd" d="${o.body}"/><path d="${o.cap}"/></svg>`;
};

function packSlot(p) {
  return `<span class="pack-slot">${outline(outlineOf(p))}<span class="ph-tag">Pack shot to come</span></span>`;
}

const pack = (p, root, cls, lazy) => (p.images.length ? img(p.images[0], root, `${p.name} pack`, cls, lazy) : packSlot(p));

function head({ title, description, canonical, type = 'website', image, ld, keywords }) {
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${keywords ? `\n<meta name="keywords" content="${esc(keywords)}">` : ''}
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="PRINCE LUBRICANTS">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image || `${ORIGIN}/assets/img/brand/og-default.jpg`}">
<meta name="twitter:card" content="summary_large_image">
<!-- @head -->
<!-- /@head -->
<script type="application/ld+json">
${json(ld)}
</script>
</head>`;
}

const FOOT = `<!-- @cta -->
<!-- /@cta -->
</main>
<!-- @footer -->
<!-- /@footer -->
</body>
</html>
`;

// The compact card: the pack, the name, the first standards and the sizes.
function card(p, range, root, href, d) {
  const sizes = p.sizes.map((s) => s.replace(/ Liter$/, ' L')).join(' · ');
  return `          <li class="pc rv" style="--d:${d % 4}">
            <a class="pc-card" href="${href}">
              <span class="pc-well">${pack(p, root, '')}</span>
              <div class="pc-body">
                <span class="pc-range${keepCase(range.title)}">${esc(range.title)}</span>
                <h3 class="pc-name${keepCase(p.name)}">${p.facts ? goldGrade(p.name) : esc(p.name)}</h3>
                ${p.spec ? `<span class="pc-spec">${esc(p.spec)}</span>` : ''}
                <div class="pc-foot"><span class="pc-sizes">${esc(sizes)}</span><span class="link-more">Details</span></div>
              </div>
            </a>
          </li>`;
}

const listItem = (position, name, url) => ({ '@type': 'ListItem', position, name, item: url });
// Home > Products > the category > whatever follows, as [name, url] pairs.
const breadcrumb = (cat, ...rest) => ({ '@type': 'BreadcrumbList', itemListElement: [
  ['Home', `${ORIGIN}/`], ['Products', `${ORIGIN}/products/`], [cat.name, `${ORIGIN}/products/${cat.id}/`], ...rest,
].map(([name, url], i) => listItem(i + 1, name, url)) });

function categoryHero(cat, count) {
  const m = META[cat.id];
  return `  <section class="page-hero page-hero--short" data-intro data-dot="${esc(cat.name)}">
    <div class="hero-bg" data-parallax="0.2" style="background-image: url('../../assets/img/photo/${m.photo}'); --hero-pos: ${m.pos}"></div>
    <div class="hero-ov"></div>
    <div class="h-grid" aria-hidden="true"></div>
    <canvas class="particles" data-scene="particles" aria-hidden="true"></canvas>
    <div class="h-content">
      <nav class="breadcrumb rv" aria-label="Breadcrumb"><ol><li><a href="../../">Home</a></li><li><a href="../">Products</a></li><li><span aria-current="page">${esc(cat.name)}</span></li></ol></nav>
      <p class="h-eyebrow rv">${esc(m.lines.toUpperCase())}</p>
      <h1 class="page-title" data-split>${m.h1}</h1>
      <div class="gold-bar rv" style="margin: -6px auto 26px"></div>
      <p class="page-lede rv" style="--d:2">${esc(m.intro)}</p>
      <p class="hero-count rv" style="--d:3">${count}</p>
    </div>
  </section>`;
}

function categoryPage(cat) {
  const m = META[cat.id];
  const url = `${ORIGIN}/products/${cat.id}/`;
  const shown = (r) => r.products.map((p) => [p, `${p.id}/`]);
  const count = countOf(cat.ranges);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: m.title, description: m.description, isPartOf: { '@id': `${ORIGIN}/#website` } },
      breadcrumb(cat),
      { '@type': 'ItemList', name: `${cat.name} products`, numberOfItems: count, itemListElement: cat.ranges.flatMap(shown)
        .map(([p, href], i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: new URL(href, url).href })) },
    ],
  };
  const chips = cat.ranges.map((r) => `        <li><a href="#${r.id}">${esc(r.title)}</a></li>`).join('\n');
  const sections = cat.ranges.map((r, i) => `  <section class="section range-sec ${i % 2 ? 'bg-off' : 'bg-light'}" id="${r.id}" data-light data-dot="${esc(r.title)}">
    <div class="container">
      <div class="range-head">
        <span class="sec-label rv">${esc(cat.name)} · ${products(r.products.length)}</span>
        <h2 class="sec-title sec-title--md" data-split>${esc(r.title)}</h2>
        <div class="gold-bar rv"></div>
        ${r.desc ? `<p class="sec-text rv">${esc(r.desc)}</p>` : ''}
      </div>
      <ul class="pc-grid">
${shown(r).map(([p, href], k) => card(p, r, '../../', href, k)).join('\n')}
      </ul>
    </div>
  </section>`).join('\n\n');

  return `${head({ title: m.title, description: m.description, canonical: url, ld, keywords: m.keywords })}
<body data-section="products">
<!-- @header -->
<!-- /@header -->
<main id="main" tabindex="-1">

${categoryHero(cat, `<b>${count}</b> products in <b>${cat.ranges.length}</b> ${cat.ranges.length === 1 ? 'range' : 'ranges'}`)}

  <nav class="cat-nav cat-nav--ranges" aria-label="${esc(cat.name)} ranges" data-scene="catNav">
    <div class="container">
      <ul>
${chips}
      </ul>
    </div>
  </nav>

${sections}

${FOOT}`;
}

function blocksHtml(blocks, text = esc) {
  const out = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(`<ul class="pd-list">${list.join('')}</ul>`); list = []; } };
  for (const b of blocks) {
    if (b.li) { list.push(`<li>${esc(b.li)}</li>`); continue; }
    flush();
    if (b.chips) {
      out.push(`<ul class="pd-chips">${b.chips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
    } else if (b.table) {
      const rows = b.table.map((row) => `<tr>${row.map((c, i) => (i === 0 && row.length > 1 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('');
      out.push(`<div class="pd-table-wrap"><table class="pd-table"><tbody>${rows}</tbody></table></div>`);
    } else if (b.term) {
      const items = b.p.split(/,\s*/).filter(Boolean);
      out.push(items.length > 2
        ? `<p class="pd-term">${esc(b.term)}</p><ul class="pd-chips">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
        : `<p><strong>${esc(b.term)}:</strong> ${esc(b.p)}</p>`);
    } else {
      out.push(`<p>${text(b.p)}</p>`);
    }
  }
  flush();
  return out.join('\n            ');
}

function productPage(cat, range, p) {
  const url = `${ORIGIN}/products/${cat.id}/${p.id}/`;
  // Search results cut titles at about 60 characters; a long product name keeps the short brand.
  const full = `${p.name} | PRINCE LUBRICANTS`;
  const title = full.length <= 65 ? full : `${p.name} | PRINCE`;
  const description = summary(p.intro[0] || `${p.name}, from the ${range.title} range of PRINCE LUBRICANTS.`);
  const image = `${ORIGIN}/assets/img/products/${p.images[0]}.webp`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Product', '@id': `${url}#product`, name: p.name, description: p.intro.join(' ') || description, image,
        brand: { '@type': 'Brand', name: 'PRINCE LUBRICANTS' }, manufacturer: { '@id': `${ORIGIN}/#organization` }, countryOfOrigin: ORIGIN_COUNTRY,
        category: `${cat.name} > ${range.title}`, url },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${ORIGIN}/products/` },
        { '@type': 'ListItem', position: 3, name: cat.name, item: `${ORIGIN}/products/${cat.id}/` },
        { '@type': 'ListItem', position: 4, name: p.name, item: url },
      ] },
    ],
  };
  const root = '../../../';
  const thumbs = p.images.length > 1
    ? `<div class="pd-thumbs" role="group" aria-label="Pack sizes">${p.images.map((im, i) => `<button type="button" class="pd-thumb${i === 0 ? ' is-active' : ''}" data-src="${root}assets/img/products/${im}.webp" aria-label="Show the ${esc(packSize(im) || `pack ${i + 1}`)} pack"${i === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${img(im, root, '', '')}<span>${esc(packSize(im))}</span></button>`).join('')}</div>`
    : '';
  const sizes = p.sizes.length ? `<div class="pd-fact"><span class="pd-fact-label">Available sizes</span><ul class="pd-sizes">${p.sizes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : '';
  const grades = p.grades ? `<p class="pd-grades">${esc(p.grades)}</p>` : '';
  const sections = p.sections.map((s, i) => `          <article class="pd-block rv" style="--d:${i % 3}">
            <h2 class="pd-block-title">${esc(s.label)}</h2>
            ${blocksHtml(s.blocks)}
          </article>`).join('\n');
  const others = range.products.filter((o) => o.id !== p.id);
  const related = others.length ? `
  <section class="section bg-off pd-related" data-light data-dot="More ${esc(range.title)}">
    <div class="container">
      <div class="range-head">
        <span class="sec-label rv">More from the range</span>
        <h2 class="sec-title sec-title--md" data-split>${esc(range.title)}</h2>
        <div class="gold-bar rv"></div>
      </div>
      <ul class="pc-grid">
${others.map((o, k) => card(o, range, root, `../${o.id}/`, k)).join('\n')}
      </ul>
      <div class="mt-cta rv"><a class="btn-dark" href="../">All ${esc(cat.name)} products ›</a></div>
    </div>
  </section>
` : '';

  return `${head({ title, description, canonical: url, type: 'product', image, ld })}
<body data-section="products">
<!-- @header -->
<!-- /@header -->
<main id="main" tabindex="-1">

  <section class="section bg-d2 tech pd-hero" data-intro data-dot="${esc(p.name)}">
    <div class="container">
      <nav class="breadcrumb breadcrumb--left rv" aria-label="Breadcrumb"><ol><li><a href="${root}">Home</a></li><li><a href="../../">Products</a></li><li><a href="../">${esc(cat.name)}</a></li><li><span aria-current="page">${esc(p.name)}</span></li></ol></nav>
      <div class="tech-grid pd-grid">
        <div class="pd-visual rv-l">
          <div class="tech-img-wrap">
            <div class="g-ring" aria-hidden="true"></div><div class="g-ring" aria-hidden="true"></div><div class="g-ring" aria-hidden="true"></div><div class="g-orbit" aria-hidden="true"></div>
            <div class="tech-bottle pd-pack">${img(p.images[0], root, `${p.name} pack`, 'pd-main', false)}</div>
          </div>
          ${thumbs}
        </div>
        <div class="pd-info">
          <a class="sec-label rv" href="../#${range.id}">${esc(range.title)}</a>
          <h1 class="pd-title" data-split>${goldGrade(p.name)}</h1>
          <div class="gold-bar rv"></div>
          ${grades}
          ${p.intro.map((t) => `<p class="sec-text rv">${esc(t)}</p>`).join('\n          ')}
          <div class="pd-facts rv">${sizes}${p.spec ? `<div class="pd-fact"><span class="pd-fact-label">Specification</span><span class="pd-fact-value">${esc(p.spec)}</span></div>` : ''}</div>
          <div class="btn-row rv"><a class="btn-gold" href="${root}contact/?product=${encodeURIComponent(p.name)}">Product Enquiry ›</a><a class="btn-out" href="${root}become-a-distributor/">Become a Distributor</a></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section bg-light pd-details" id="details" data-light data-dot="Details">
    <div class="container">
      <div class="pd-blocks">
${sections}
      </div>
    </div>
  </section>
${related}
${FOOT}`;
}

/* ---------- Categories with a client document ---------- */

// A search description, made from the product's list: what it is, its standards and its packs.
// It gives up the packs, then its last standards, until it fits in 155 characters.
const STANDARDS = ['API Service Category', 'ACEA Classification', 'ILSAC Performance Category', 'Performance Specifications',
  'Industry Performance Standards', 'Key Performance Standards'];
function docDescription(p) {
  const facts = new Map(p.facts);
  let what = facts.get('Product Type') || '';
  // "ATF", "MTF" and "Gear Oil" say little by themselves; the base and the classification say it.
  if (facts.has('Fluid Classification')) {
    const base = (facts.get('Base Type') || '').replace(/\s*\([^()]*\)/g, '').replace(/ (?:Base Stocks|Formulation)$/, '');
    what = `${base} ${facts.get('Fluid Classification')}`.trim();
  }
  let standards = STANDARDS.flatMap((label) => (facts.has(label) ? facts.get(label).split(', ') : []));
  if (!standards.length) standards = p.spec.split(' · ').filter(Boolean);
  const say = (list, packs) => `${p.name}: ${what}.${list.length ? ` ${list.join(', ')}.` : ''}${packs ? ` Available packaging: ${p.sizes.join(', ')}.` : ''}`;
  let out = say(standards, true);
  if (out.length > 155) out = say(standards, false);
  while (out.length > 155 && standards.length) { standards = standards.slice(0, -1); out = say(standards, false); }
  return out;
}

const factList = (p, cls) => `<dl class="${cls}">${p.facts.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
const packSizes = (p) => p.sizes.join(' · ');

// The card of the product list: the pack, the name and every line of the document's list. The
// name is the one link, stretched over the card, so a screen reader hears the name alone.
function docCard(p, root, href, d) {
  return `          <li class="pc rv" style="--d:${d % 4}">
            <article class="pc-card pc-card--doc">
              <span class="pc-well">${pack(p, root, '')}</span>
              <div class="pc-body">
                <h3 class="pc-name${keepCase(p.name)}"><a class="stretched" href="${href}">${goldGrade(p.name)}</a></h3>
                ${factList(p, 'pc-facts')}
                <div class="pc-foot"><span class="pc-sizes">${esc(packSizes(p))}</span><span class="link-more" aria-hidden="true">Details</span></div>
              </div>
            </article>
          </li>`;
}

// How many cards stand side by side: four or three, whichever leaves the last row fuller; a
// series of one or two has wide cards instead.
function columns(n) {
  if (n < 3) return n;
  const empty = (cols) => (cols - (n % cols || cols)) / cols;
  return empty(3) < empty(4) ? 3 : 4;
}

function typeInfo(cat, type) {
  const info = (TYPES[cat.id] || {})[type.id];
  if (!info) throw new Error(`tools/product-types.js has no entry for ${cat.id} / ${type.id}`);
  return info;
}

const icon = (info) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${info.icon}</svg>`;

// One to three packs standing together: left, front, right. Jugs are wide, so they stand
// closer. "jug" or "bottle" in place of a pack shot stands as its outline until the shot comes.
const isOutline = (name) => name in OUTLINES;
const isJug = (name) => (isOutline(name) ? name === 'jug' : DATA.imageSizes[name][0] / DATA.imageSizes[name][1] > 0.65);
const lineUp = (info, root, lazy) => {
  const waiting = info.packs.every(isOutline);
  return `<span class="line-up line-up--${info.packs.length}${info.packs.some(isJug) ? ' line-up--jugs' : ''}${waiting ? ' line-up--outline' : ''}" aria-hidden="true">${info.packs.map((name) => (isOutline(name) ? outline(name) : img(name, root, '', '', lazy))).join('')}${waiting ? `<span class="ph-tag">${info.packs.length > 1 ? 'Pack shots' : 'Pack shot'} to come</span>` : ''}</span>`;
};

// The document's menu of types, with the page's own type in gold.
function typeNav(cat, current) {
  const cells = cat.types.map((t) => `        <li><a class="type-cell" href="../${t.id}/#types"${t === current ? ' aria-current="page"' : ''}><span class="type-ico">${icon(typeInfo(cat, t))}</span><span class="type-name">${esc(t.title)}</span><span class="type-count">${countOf(t.ranges)}<span class="sr-only"> ${countOf(t.ranges) === 1 ? 'product' : 'products'}</span></span></a></li>`).join('\n');
  return `  <nav class="type-nav" id="types" aria-label="${esc(cat.name)} product types">
    <div class="container">
      <ul class="type-grid">
${cells}
      </ul>
    </div>
  </nav>`;
}

// A document category opens on its types.
function typesPage(cat) {
  const m = META[cat.id];
  const url = `${ORIGIN}/products/${cat.id}/`;
  const count = countOf(rangesOf(cat));
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: m.title, description: m.description, isPartOf: { '@id': `${ORIGIN}/#website` } },
      breadcrumb(cat),
      { '@type': 'ItemList', name: `${cat.name} product types`, numberOfItems: cat.types.length, itemListElement: cat.types
        .map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.title, url: `${url}${t.id}/` })) },
    ],
  };
  const tiles = cat.types.map((t, i) => {
    const info = typeInfo(cat, t);
    return `        <li class="rv" style="--d:${i % 4}">
          <a class="type-tile" href="${t.id}/">
            <span class="tt-well">${lineUp(info, '../../', true)}</span>
            <div class="tt-body">
              <div class="tt-head"><span class="type-ico">${icon(info)}</span><h3 class="tt-name">${esc(t.title)}</h3></div>
              <span class="tt-holds">${esc(info.holds)}</span>
              <span class="tt-foot"><span class="tt-count">${products(countOf(t.ranges))}</span><span class="link-more">View</span></span>
            </div>
          </a>
        </li>`;
  }).join('\n');
  return `${head({ title: m.title, description: m.description, canonical: url, ld, keywords: m.keywords })}
<body data-section="products">
<!-- @header -->
<!-- /@header -->
<main id="main" tabindex="-1">

${categoryHero(cat, `<b>${count}</b> products in <b>${cat.types.length}</b> product types`)}

  <section class="section types-sec bg-light" id="types" data-light data-dot="Product types">
    <div class="container">
      <div class="sec-head sec-head--center">
        <span class="sec-label rv">${esc(cat.name)}</span>
        <h2 class="sec-title sec-title--md" data-split>Product <span>types</span></h2>
        <div class="gold-bar rv"></div>
      </div>
      <ul class="type-tiles">
${tiles}
      </ul>
    </div>
  </section>

${FOOT}`;
}

function typePage(cat, type) {
  const info = typeInfo(cat, type);
  const url = `${ORIGIN}/products/${cat.id}/${type.id}/`;
  const root = '../../../';
  const all = type.ranges.flatMap((r) => r.products);
  const series = type.ranges.filter((r) => r.title);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: info.title, description: info.description, isPartOf: { '@id': `${ORIGIN}/#website` } },
      breadcrumb(cat, [type.title, url]),
      { '@type': 'ItemList', name: type.title, numberOfItems: all.length, itemListElement: all
        .map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: urlOf(cat, p) })) },
    ],
  };
  const count = `<p class="hero-count rv"><b>${all.length}</b> ${all.length === 1 ? 'product' : 'products'}${series.length > 1 ? ` in <b>${series.length}</b> series` : ''}</p>`;
  const jumps = series.length > 1
    ? `\n          <ul class="ty-series rv">${series.map((r) => `<li><a${keepCase(r.title) ? ' class="keep-case"' : ''} href="#${r.id}"><span>${esc(r.title)}</span><span class="rl-count">${r.products.length}</span></a></li>`).join('')}</ul>`
    : '';
  const sections = type.ranges.map((r, i) => `  <section class="section range-sec ${i % 2 ? 'bg-off' : 'bg-light'}" id="${r.id}" data-light data-dot="${esc(r.title || type.title)}">
    <div class="container">
${r.title ? `      <div class="range-head">
        <span class="sec-label rv">${products(r.products.length)}</span>
        <h2 class="sec-title sec-title--md${keepCase(r.title)}" data-split>${esc(r.title)}</h2>
        <div class="gold-bar rv"></div>
        ${r.desc ? `<p class="sec-text rv">${esc(r.desc)}</p>` : ''}
      </div>` : `      <h2 class="sr-only">${esc(type.title)}: ${products(r.products.length)}</h2>`}
      <ul class="pc-grid pc-grid--doc pc-grid--c${columns(r.products.length)}" style="--rows:${Math.max(...r.products.map((p) => p.facts.length)) + 3}">
${r.products.map((p, k) => docCard(p, root, hrefOf(p), k)).join('\n')}
      </ul>
    </div>
  </section>`).join('\n\n');
  const at = cat.types.indexOf(type);
  const step = (t, dir, cls) => `<a class="ts-link ${cls}" href="../${t.id}/#types"><span class="ts-dir">${dir}</span><span class="ts-name">${esc(t.title)}</span></a>`;
  const n = cat.types.length;
  return `${head({ title: info.title, description: info.description, canonical: url, ld, keywords: info.keywords })}
<body data-section="products">
<!-- @header -->
<!-- /@header -->
<main id="main" tabindex="-1">

  <section class="section bg-d2 tech ty-hero" data-intro data-dot="${esc(type.title)}">
    <div class="container">
      <nav class="breadcrumb breadcrumb--left rv" aria-label="Breadcrumb"><ol><li><a href="${root}">Home</a></li><li><a href="../../">Products</a></li><li><a href="../">${esc(cat.name)}</a></li><li><span aria-current="page">${esc(type.title)}</span></li></ol></nav>
      <div class="tech-grid ty-grid">
        <div class="ty-copy">
          <a class="sec-label rv" href="../">${esc(cat.name)}</a>
          <h1 class="page-title page-title--left" data-split>${info.h1}</h1>
          <div class="gold-bar rv"></div>
          <p class="sec-text rv">${prose(info.lede)}</p>
          ${count}${jumps}
        </div>
        <div class="ty-visual rv-r">
          <div class="g-ring" aria-hidden="true"></div><div class="g-ring" aria-hidden="true"></div><div class="g-orbit" aria-hidden="true"></div>
          ${lineUp(info, root, false)}
        </div>
      </div>
    </div>
  </section>

${typeNav(cat, type)}

${sections}

  <nav class="type-steps" aria-label="More ${esc(cat.name)} product types">
    <div class="container ts-grid">
      ${step(cat.types[(at + n - 1) % n], 'Previous', 'ts-link--prev')}
      <a class="btn-out" href="../">All product types</a>
      ${step(cat.types[(at + 1) % n], 'Next', 'ts-link--next')}
    </div>
  </nav>

${FOOT}`;
}

// The names of the products with a page in more than one category (each document's own words).
const twice = (() => {
  const seen = new Map();
  for (const cat of DATA.categories.filter((c) => c.types)) {
    for (const p of rangesOf(cat).flatMap((r) => r.products).filter((x) => !x.page)) seen.set(p.name, (seen.get(p.name) || 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([name]) => name));
})();

function docProductPage(cat, type, range, p) {
  const url = `${ORIGIN}/products/${cat.id}/${p.id}/`;
  const typeUrl = `${ORIGIN}/products/${cat.id}/${type.id}/`;
  const root = '../../../';
  // The name opens with the brand, so a long one stands alone; one that another category also
  // has a page for says whose this is.
  const name = twice.has(p.name) ? `${p.name} for ${cat.name}` : p.name;
  const full = `${name} | PRINCE LUBRICANTS`;
  const title = full.length <= 65 ? full : name;
  const description = docDescription(name === p.name ? p : { ...p, name });
  const image = p.images.length ? `${ORIGIN}/assets/img/products/${p.images[0]}.webp` : undefined;
  const series = range.title ? ` > ${range.title}` : '';
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Product', '@id': `${url}#product`, name: p.name, description: p.intro.join(' '), image,
        brand: { '@type': 'Brand', name: 'PRINCE LUBRICANTS' }, manufacturer: { '@id': `${ORIGIN}/#organization` }, countryOfOrigin: ORIGIN_COUNTRY,
        category: `${cat.name} > ${type.title}${series}`, url,
        additionalProperty: [...p.facts, ['Available Packaging', `${p.sizes.join(' / ')}${p.sizeNote ? ` (${p.sizeNote})` : ''}`]]
          .map(([name, value]) => ({ '@type': 'PropertyValue', name, value })) },
      breadcrumb(cat, [type.title, typeUrl], [p.name, url]),
    ],
  };
  const thumbs = p.images.length > 1
    ? `<div class="pd-thumbs" role="group" aria-label="Pack sizes">${p.images.map((im, i) => `<button type="button" class="pd-thumb${i === 0 ? ' is-active' : ''}" data-src="${root}assets/img/products/${im}.webp" aria-label="Show the ${esc(packSize(im) || `pack ${i + 1}`)} pack" aria-pressed="${i === 0}">${img(im, root, '', '')}<span>${esc(packSize(im))}</span></button>`).join('')}</div>`
    : '';
  // The document's sections: a text beside the list of details, a list of standards below them,
  // unless there is no text to fill that place.
  const blocks = p.sections.map((s, i) => {
    const wide = s.blocks.some((b) => b.chips) && i > 0;
    return `          <article class="pd-block${wide ? ' pd-block--wide' : ''} rv" style="--d:${(i + 1) % 3}">
            <h2 class="pd-block-title">${esc(s.label)}</h2>
            ${blocksHtml(s.blocks, prose)}
          </article>`;
  }).join('\n');
  // The rest of the series or, for a product that is alone in its own, of the type.
  const inSeries = range.products.filter((o) => o !== p);
  const others = inSeries.length ? inSeries : type.ranges.flatMap((r) => r.products).filter((o) => o !== p).slice(0, 4);
  const from = inSeries.length && range.title ? range.title : type.title;
  const rangeOf = (o) => type.ranges.find((r) => r.products.includes(o));
  const back = `../${type.id}/${range.title ? `#${range.id}` : ''}`;
  // The document's notices, as it sets them: a label and its words.
  const notices = (p.notices || []).length
    ? `\n          <div class="pd-notices rv" role="note">${p.notices.map((n) => `<p class="pd-notice"><strong>${esc(n.label)}:</strong> ${prose(n.text)}</p>`).join('')}</div>`
    : '';
  // The other categories' types that list this product.
  const also = (p.alsoIn || []).length
    ? `\n          <p class="pd-also rv">Also in ${p.alsoIn.map(({ category, type: tid }) => {
      const other = categoryOf(category);
      const t = other.types.find((x) => x.id === tid);
      return `<a href="../../${other.id}/${t.id}/">${esc(other.name)} · ${esc(t.title)}</a>`;
    }).join(', ')}</p>`
    : '';

  return `${head({ title, description, canonical: url, type: 'product', image, ld })}
<body data-section="products">
<!-- @header -->
<!-- /@header -->
<main id="main" tabindex="-1">

  <section class="section bg-d2 tech pd-hero pd-hero--doc" data-intro data-dot="${esc(p.name)}">
    <div class="container">
      <nav class="breadcrumb breadcrumb--left rv" aria-label="Breadcrumb"><ol><li><a href="${root}">Home</a></li><li><a href="../../">Products</a></li><li><a href="../">${esc(cat.name)}</a></li><li><a href="../${type.id}/">${esc(type.title)}</a></li><li><span aria-current="page">${esc(p.name)}</span></li></ol></nav>
      <div class="tech-grid pd-grid">
        <div class="pd-visual rv-l">
          <div class="tech-img-wrap">
            <div class="g-ring" aria-hidden="true"></div><div class="g-ring" aria-hidden="true"></div><div class="g-ring" aria-hidden="true"></div><div class="g-orbit" aria-hidden="true"></div>
            <div class="tech-bottle pd-pack">${pack(p, root, 'pd-main', false)}</div>
          </div>
          ${thumbs}
        </div>
        <div class="pd-info">
          <a class="sec-label${keepCase(range.title)} rv" href="${back}">${esc(range.title || type.title)}</a>
          <h1 class="pd-title${keepCase(p.name)}" data-split>${goldGrade(p.name)}</h1>
          <div class="gold-bar rv"></div>
          ${p.intro.map((t) => `<p class="sec-text rv">${prose(t)}</p>`).join('\n          ')}${notices}${also}
          <div class="pd-facts rv"><div class="pd-fact"><span class="pd-fact-label">Available Packaging</span><ul class="pd-sizes">${p.sizes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>${p.sizeNote ? `<span class="pd-fact-note">(${esc(p.sizeNote)})</span>` : ''}</div></div>
          <div class="btn-row rv"><a class="btn-gold" href="${root}contact/?product=${encodeURIComponent(p.name)}">Product Enquiry ›</a><a class="btn-out" href="${root}become-a-distributor/">Become a Distributor</a></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section bg-light pd-details" id="details" data-light data-dot="Details">
    <div class="container">
      <div class="pd-blocks pd-blocks--doc">
          <article class="pd-block pd-block--list rv">
            <h2 class="pd-block-title">Product Details</h2>
            ${factList(p, 'pd-list-facts')}
          </article>
${blocks}
      </div>
    </div>
  </section>

  <section class="section bg-off pd-related" data-light data-dot="More products">
    <div class="container">
      <div class="range-head">
        <span class="sec-label rv">More from the range</span>
        <h2 class="sec-title sec-title--md${keepCase(from)}" data-split>${esc(from)}</h2>
        <div class="gold-bar rv"></div>
      </div>
      <ul class="pc-grid">
${others.map((o, k) => card(o, rangeOf(o).title ? rangeOf(o) : type, root, hrefOf(o), k)).join('\n')}
      </ul>
      <div class="mt-cta rv"><a class="btn-dark" href="../${type.id}/">All ${esc(type.title)} ›</a></div>
    </div>
  </section>

${FOOT}`;
}

/* ---------- The Products page: each category's write-up, its ranges or types, its buttons ---------- */

function overviewBlock(cat) {
  const m = META[cat.id];
  const links = cat.types
    ? cat.types.map((t) => [`${cat.id}/${t.id}/`, t.title, countOf(t.ranges)])
    : cat.ranges.map((r) => [`${cat.id}/#${r.id}`, r.title, r.products.length]);
  const ranges = links.map(([href, title, n], i) => `            <li class="rv" style="--d:${i % 4}"><a class="range-link" href="${href}"><span class="rl-name">${esc(title)}</span><span class="rl-count">${n}</span></a></li>`).join('\n');
  const tags = SERIES_TAGS[cat.id]
    ? `\n          <div class="series-tags rv"><span class="series-label">${SERIES_TAGS[cat.id][0]}</span><ul class="tags">${SERIES_TAGS[cat.id][1].map((t) => `<li class="tag">${t}</li>`).join('')}</ul></div>`
    : '';
  const enquiry = m.dark ? 'btn-out' : 'btn-dark';
  return `          <p class="cat-lines rv">${esc(m.lines)}</p>
          <p class="sec-text cat-intro rv">${esc(m.intro)}</p>
          <ul class="range-list">
${ranges}
          </ul>${tags}
          <div class="btn-row rv"><a class="${enquiry}" href="../contact/">Product Enquiry ›</a><a class="btn-gold" href="${cat.id}/">Browse Products ›</a></div>`;
}

function write(rel, html) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function main() {
  let pages = 0;
  const keep = new Set();
  const page = (rel, html) => {
    write(`products/${rel}/index.html`, html);
    keep.add(rel);
    pages += 1;
  };
  for (const cat of DATA.categories) {
    if (!cat.types) {
      page(cat.id, categoryPage(cat));
      for (const range of cat.ranges) for (const p of range.products) page(`${cat.id}/${p.id}`, productPage(cat, range, p));
      continue;
    }
    page(cat.id, typesPage(cat));
    for (const type of cat.types) {
      page(`${cat.id}/${type.id}`, typePage(cat, type));
      for (const range of type.ranges) for (const p of range.products.filter((x) => !x.page)) page(`${cat.id}/${p.id}`, docProductPage(cat, type, range, p));
    }
  }
  // A product dropped from the data loses its page.
  for (const cat of DATA.categories) {
    const dir = path.join(ROOT, 'products', cat.id);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !keep.has(`${cat.id}/${entry.name}`)) fs.rmSync(path.join(dir, entry.name), { recursive: true });
    }
  }
  let overview = fs.readFileSync(path.join(ROOT, 'products/index.html'), 'utf8');
  for (const cat of DATA.categories) {
    const re = new RegExp(`<!-- @cat:${cat.id} -->[\\s\\S]*?<!-- /@cat:${cat.id} -->`);
    if (!re.test(overview)) throw new Error(`products/index.html has no <!-- @cat:${cat.id} --> markers`);
    overview = overview.replace(re, () => `<!-- @cat:${cat.id} -->\n${overviewBlock(cat)}\n          <!-- /@cat:${cat.id} -->`);
  }
  // A product listed in a second category is counted once, where its page is. A category with
  // a document counts its types as its ranges.
  const total = DATA.categories.flatMap(rangesOf).flatMap((r) => r.products).filter((p) => !p.page).length;
  const ranges = DATA.categories.reduce((n, c) => n + (c.types || c.ranges).length, 0);
  overview = overview.replace(/<!-- @cat-total -->[\s\S]*?<!-- \/@cat-total -->/, () => `<!-- @cat-total -->
      <ul class="cat-total rv"><li><b>${total}</b> products</li><li><b>${ranges}</b> ranges</li><li><b>${DATA.categories.length}</b> categories</li></ul>
      <!-- /@cat-total -->`);
  fs.writeFileSync(path.join(ROOT, 'products/index.html'), overview);
  console.log(`${pages} catalogue pages from ${DATA.categories.length} categories`);
}

module.exports = { summary, nameParts, goldGrade, prose, keepCase, packSize, columns, docDescription, docCard, outlineOf, hrefOf };

if (require.main === module) main();
