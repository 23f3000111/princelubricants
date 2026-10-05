#!/usr/bin/env node
/*
 * Writes the product catalogue from docs/content/products.json. No dependencies.
 *
 *   node tools/build-catalogue.js        then        node tools/build.js
 *
 *   products/<category>/index.html             a category: its ranges, as product cards
 *   products/<category>/<product>/index.html   a product: its pack, introduction, sizes,
 *                                              specifications, application, benefits, data
 *   products/index.html                        each category's write-up, range list and
 *                                              buttons, between <!-- @cat:<id> --> markers
 *
 * Every page carries the partial markers; build.js fills them and checks every link. The
 * copy is the current site's, as tools/build-products.py collected it, except the category
 * write-ups below, which the client asked for (amendment 1, page 8).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.princelubricants.com';
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/content/products.json'), 'utf8'));

// The six categories as the site presents them. `lines` is the client doc's line for each.
const META = {
  'passenger-car': {
    h1: 'PASSENGER <span>CAR</span>', photo: 'pour.webp', pos: '30% 50%', dark: false,
    lines: 'Engine Oils · Transmission Fluids · Antifreeze Coolants',
    title: 'Passenger Car Engine Oils & Fluids | PRINCE LUBRICANTS',
    description: 'PRINCE LUBRICANTS for passenger cars: FS1, FS1 EUROGEN, FSe, FS SUPER, SS1 and M SERIES engine oils, transmission fluids, brake fluids and coolants.',
    intro: 'Engine oils for every kind of car, from the P-9 ESTER FS1 and FS1 EUROGEN flagships to FSe for hybrid engines, FS SUPER, SS1 and the M SERIES, with the transmission fluids, brake fluids, coolants and hydraulic fluids that keep the rest of the car in step.',
  },
  motorsport: {
    h1: 'MOTORSPORT', photo: 'formula.webp', pos: '60% 45%', dark: true,
    lines: 'Racing Oils · Manual Gear Oils · Performance Coolants',
    title: 'Motorsport Racing Oils & Fluids | PRINCE LUBRICANTS',
    description: 'FSR GT Racing motor oils, PRO-SHIFT GT Racing gear oils, GT Racing brake fluid and GT COOLING coolant: the PRINCE LUBRICANTS range for the track.',
    intro: 'The range built for the track: FSR GT Racing motor oils, PRO-SHIFT GT Racing gear oils, GT Racing brake fluid and the GT COOLING race coolant, each made for the heat, loads and revs of competition.',
  },
  'commercial-fleet': {
    h1: 'COMMERCIAL <span>FLEET</span>', photo: 'fleet.webp', pos: '40% 50%', dark: false,
    lines: 'Diesel Engine Oils · Hypoid Gear Oils · Long-life Coolants',
    title: 'Heavy-Duty Diesel Engine Oils | PRINCE LUBRICANTS',
    description: 'D1 GOLD, D1 GOLD 4X4, D1 and DEVO diesel engine oils, SUPER-SHIFT gear oils and an extended-life coolant for trucks, buses, pickups and fleets.',
    intro: 'Diesel engine oils for trucks, buses, pickups and working fleets, from D1 GOLD with P-12 Ester for EURO VI engines to D1 GOLD 4X4, D1 and DEVO, with SUPER-SHIFT gear oils for gearboxes and differentials and an extended-life coolant for heavy-duty cooling systems.',
  },
  motorcycle: {
    h1: 'MOTORCYCLE', photo: 'bike.webp', pos: '50% 50%', dark: true,
    lines: '4T Engine Oils · Scooter Engine Oils · Driveline Fluids',
    title: 'Motorcycle 4T Engine Oils | PRINCE LUBRICANTS',
    description: 'MAXX GOLD, MAXX ULTRA, MAXX LAUNCH and MAXX SCOOTER 4T engine oils, MAXX-SHIFT gear oils and suspension fork oils from PRINCE LUBRICANTS.',
    intro: '4T engine oils for every rider: MAXX GOLD with P-10 Ester for high-performance machines, MAXX ULTRA, MAXX LAUNCH for everyday riding and the MAXX SCOOTER oils, with MAXX-SHIFT gear oils and suspension fork oils for the rest of the bike.',
  },
  industrial: {
    h1: 'INDUSTRIAL', photo: 'rig.webp', pos: '60% 40%', dark: false,
    lines: 'Hydraulic · Compressor · Slideways · Metalworking',
    title: 'Industrial Oils & Metalworking Fluids | PRINCE LUBRICANTS',
    description: 'PRINCE LUBRICANTS industrial range: hydraulic, compressor, refrigeration, turbine, spindle, gear and heat transfer oils, and metal processing fluids.',
    intro: 'Oils for machines that run around the clock: hydraulic, compressor, refrigeration, turbine, spindle, gear, heat transfer and insulating oils, with way oils, cutting oils and quenching oils for metal processing.',
  },
  marine: {
    h1: 'MARINE', photo: 'marine.webp', pos: '50% 50%', dark: true,
    lines: 'Outboard Engine Oils · Heavy-Duty Oils · System Lubricants',
    title: 'Marine Lubricants & Outboard Oils | PRINCE LUBRICANTS',
    description: 'MARINO outboard oils and marine gear oils for boats, and cylinder, trunk piston, stern tube, gear, turbine, hydraulic and compressor oils for ships.',
    intro: 'From the outboard to the engine room: MARINO four-stroke and two-stroke outboard oils and marine gear oils for boats, and cylinder, trunk piston, stern tube, gear, turbine, hydraulic and compressor oils for ships.',
  },
};

// The client doc ties these series to a technology; the Products page shows them as tags.
const SERIES_TAGS = {
  'passenger-car': ['P-9 ESTER series', ['FS1 SERIES', 'FS1 EUROGEN SERIES']],
  motorsport: ['P-9 ESTER series', ['FSR SERIES']],
  motorcycle: ['P-10 ESTER series', ['MAXX GOLD SERIES']],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const json = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

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

// "FS1 0W-30" -> "FS1 <span>0W-30</span>": the grade, from the first word that starts with a digit.
function goldGrade(name) {
  const words = name.split(' ');
  const i = words.findIndex((w, k) => k > 0 && /^\d/.test(w));
  if (i < 1) return esc(name);
  return `${esc(words.slice(0, i).join(' '))} <span>${esc(words.slice(i).join(' '))}</span>`;
}

// "fs1-4l-0w-30" -> "4 L"; the pack size each image shows.
function packSize(image) {
  const m = image.match(/(?:^|-)(\d+)l(?:-|$)/);
  return m ? `${m[1]} L` : '';
}

function img(name, root, alt, cls, lazy = true) {
  const [w, h] = DATA.imageSizes[name];
  return `<img${cls ? ` class="${cls}"` : ''} src="${root}assets/img/products/${name}.webp" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
}

function head({ title, description, canonical, type = 'website', image, ld }) {
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
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

function card(p, range, root, href, d) {
  const sizes = p.sizes.map((s) => s.replace(/ Liter$/, ' L')).join(' · ');
  return `          <li class="pc rv" style="--d:${d % 4}">
            <a class="pc-card" href="${href}">
              <span class="pc-well">${img(p.images[0], root, `${p.name} pack`, '')}</span>
              <div class="pc-body">
                <span class="pc-range">${esc(range.title)}</span>
                <h3 class="pc-name">${esc(p.name)}</h3>
                ${p.spec ? `<span class="pc-spec">${esc(p.spec)}</span>` : ''}
                <div class="pc-foot"><span class="pc-sizes">${esc(sizes)}</span><span class="link-more">Details</span></div>
              </div>
            </a>
          </li>`;
}

function categoryPage(cat) {
  const m = META[cat.id];
  const url = `${ORIGIN}/products/${cat.id}/`;
  const count = cat.ranges.reduce((n, r) => n + r.products.length, 0);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: m.title, description: m.description, isPartOf: { '@id': `${ORIGIN}/#website` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${ORIGIN}/products/` },
        { '@type': 'ListItem', position: 3, name: cat.name, item: url },
      ] },
      { '@type': 'ItemList', name: `${cat.name} products`, numberOfItems: count, itemListElement: cat.ranges.flatMap((r) => r.products)
        .map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: `${url}${p.id}/` })) },
    ],
  };
  const chips = cat.ranges.map((r) => `        <li><a href="#${r.id}">${esc(r.title)}</a></li>`).join('\n');
  const sections = cat.ranges.map((r, i) => `  <section class="section range-sec ${i % 2 ? 'bg-off' : 'bg-light'}" id="${r.id}" data-light data-dot="${esc(r.title)}">
    <div class="container">
      <div class="range-head">
        <span class="sec-label rv">${esc(cat.name)} · ${r.products.length} ${r.products.length === 1 ? 'product' : 'products'}</span>
        <h2 class="sec-title sec-title--md" data-split>${esc(r.title)}</h2>
        <div class="gold-bar rv"></div>
        ${r.desc ? `<p class="sec-text rv">${esc(r.desc)}</p>` : ''}
      </div>
      <ul class="pc-grid">
${r.products.map((p, k) => card(p, r, '../../', `${p.id}/`, k)).join('\n')}
      </ul>
    </div>
  </section>`).join('\n\n');

  return `${head({ title: m.title, description: m.description, canonical: url, ld })}
<body data-section="products">
<!-- @header -->
<!-- /@header -->
<main id="main" tabindex="-1">

  <section class="page-hero page-hero--short" data-intro data-dot="${esc(cat.name)}">
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
      <p class="hero-count rv" style="--d:3"><b>${count}</b> products in <b>${cat.ranges.length}</b> ${cat.ranges.length === 1 ? 'range' : 'ranges'}</p>
    </div>
  </section>

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

function blocksHtml(blocks) {
  const out = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(`<ul class="pd-list">${list.join('')}</ul>`); list = []; } };
  for (const b of blocks) {
    if (b.li) { list.push(`<li>${esc(b.li)}</li>`); continue; }
    flush();
    if (b.table) {
      const rows = b.table.map((row) => `<tr>${row.map((c, i) => (i === 0 && row.length > 1 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('');
      out.push(`<div class="pd-table-wrap"><table class="pd-table"><tbody>${rows}</tbody></table></div>`);
    } else if (b.term) {
      const items = b.p.split(/,\s*/).filter(Boolean);
      out.push(items.length > 2
        ? `<p class="pd-term">${esc(b.term)}</p><ul class="pd-chips">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
        : `<p><strong>${esc(b.term)}:</strong> ${esc(b.p)}</p>`);
    } else {
      out.push(`<p>${esc(b.p)}</p>`);
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
        brand: { '@type': 'Brand', name: 'PRINCE LUBRICANTS' }, manufacturer: { '@id': `${ORIGIN}/#organization` },
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

// The Products page: each category's write-up, its ranges and its buttons.
function overviewBlock(cat) {
  const m = META[cat.id];
  const ranges = cat.ranges.map((r, i) => `            <li class="rv" style="--d:${i % 4}"><a class="range-link" href="${cat.id}/#${r.id}"><span class="rl-name">${esc(r.title)}</span><span class="rl-count">${r.products.length}</span></a></li>`).join('\n');
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
  for (const cat of DATA.categories) {
    write(`products/${cat.id}/index.html`, categoryPage(cat));
    pages += 1;
    keep.add(cat.id);
    for (const range of cat.ranges) {
      for (const p of range.products) {
        write(`products/${cat.id}/${p.id}/index.html`, productPage(cat, range, p));
        keep.add(`${cat.id}/${p.id}`);
        pages += 1;
      }
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
  const total = DATA.categories.reduce((n, c) => n + c.ranges.reduce((k, r) => k + r.products.length, 0), 0);
  const ranges = DATA.categories.reduce((n, c) => n + c.ranges.length, 0);
  overview = overview.replace(/<!-- @cat-total -->[\s\S]*?<!-- \/@cat-total -->/, () => `<!-- @cat-total -->
      <ul class="cat-total rv"><li><b>${total}</b> products</li><li><b>${ranges}</b> ranges</li><li><b>${DATA.categories.length}</b> categories</li></ul>
      <!-- /@cat-total -->`);
  fs.writeFileSync(path.join(ROOT, 'products/index.html'), overview);
  console.log(`${pages} catalogue pages from ${DATA.categories.length} categories`);
}

module.exports = { summary, goldGrade, packSize };

if (require.main === module) main();
