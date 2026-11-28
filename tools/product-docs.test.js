'use strict';
/*
 * The client's product documents, against the pages built from them: every product of every
 * docs/content/product-docs/<category>.json has its page, its card and all of its words. A
 * product that an earlier category's document also has is listed with a card that links to
 * that category's page for it (its `page` in products.json), and that page says so.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs/content/product-docs');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// The text of a page as a reader sees it, without its scripts.
const textOf = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<span class="glue">([^<]*)<\/span>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));

const catalogue = json('docs/content/products.json');
const documents = fs.readdirSync(DOCS).filter((f) => /^[a-z-]+\.json$/.test(f)).map((f) => json(`docs/content/product-docs/${f}`));

test('there is a document for the passenger cars', () => {
  assert.ok(documents.some((d) => d.category === 'passenger-car'));
});

for (const doc of documents) {
  const cat = catalogue.categories.find((x) => x.id === doc.category);
  const base = `products/${doc.category}`;
  const builtTypes = cat.types || [];
  const builtOf = (t) => builtTypes[doc.types.indexOf(t)];
  const productsOf = (t) => t.series.flatMap((s) => s.products);
  // The built products that have their page in this category, and where any product's page is.
  const ownOf = (t) => t.ranges.flatMap((r) => r.products).filter((p) => !p.page);
  const pageOf = (p) => (p.page ? `products/${p.page}` : `${base}/${p.id}`);

  test(`${doc.category}: the catalogue holds the document's types, series and products, in its order`, () => {
    assert.deepEqual(builtTypes.map((t) => t.title), doc.types.map((t) => t.title));
    for (const t of doc.types) {
      assert.deepEqual(builtOf(t).ranges.map((r) => r.products.map((p) => p.name)), t.series.map((s) => s.products.map((p) => p.name)));
    }
  });

  test(`${doc.category}: the folder holds the types and the products, and nothing else`, () => {
    const dirs = fs.readdirSync(path.join(ROOT, base), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const want = builtTypes.flatMap((t) => [t.id, ...ownOf(t).map((p) => p.id)]).sort();
    assert.deepEqual(dirs, want);
  });

  test(`${doc.category}: the category page opens every type, with its number of products`, () => {
    const html = mainOf(read(`${base}/index.html`));
    const tiles = [...html.matchAll(/<a class="type-tile[^"]*"[^>]*href="([^"]+)"[\s\S]*?<\/a>/g)];
    assert.deepEqual(tiles.map((m) => m[1]), builtTypes.map((t) => `${t.id}/`));
    doc.types.forEach((t, i) => {
      const n = productsOf(t).length;
      assert.match(textOf(tiles[i][0]), new RegExp(`\\b${n} products?\\b`));
      assert.ok(textOf(tiles[i][0]).includes(t.title), t.title);
    });
  });

  test(`${doc.category}: every type page carries the whole menu and marks itself in it`, () => {
    for (const t of doc.types) {
      const built = builtOf(t);
      const html = mainOf(read(`${base}/${built.id}/index.html`));
      const menu = html.match(/<nav class="type-nav"[\s\S]*?<\/nav>/);
      assert.ok(menu, `${built.id} has no menu`);
      const cells = [...menu[0].matchAll(/<a class="type-cell"([^>]*)>([\s\S]*?)<\/a>/g)];
      assert.deepEqual(cells.map((m) => m[1].match(/href="([^"#]+)/)[1]), builtTypes.map((x) => `../${x.id}/`));
      cells.forEach((m, i) => {
        assert.equal(/aria-current="page"/.test(m[1]), doc.types[i] === t, `${built.id}: ${doc.types[i].title}`);
        assert.ok(textOf(m[2]).includes(doc.types[i].title));
      });
      assert.ok(textOf(html.match(/<h1[\s\S]*?<\/h1>/)[0]).trim().includes(t.title), t.title);
    }
  });

  test(`${doc.category}: every type page lists its products in order, each with its list from the document`, () => {
    for (const t of doc.types) {
      const built = builtOf(t);
      const html = mainOf(read(`${base}/${built.id}/index.html`));
      const cards = [...html.matchAll(/<article class="pc-card[\s\S]*?<\/article>/g)].map((m) => m[0]);
      const products = productsOf(t);
      assert.equal(cards.length, products.length, built.id);
      products.forEach((p, i) => {
        const b = built.ranges.flatMap((r) => r.products)[i];
        assert.ok(cards[i].includes(`href="${b.page ? `../../${b.page}/` : `../${b.id}/`}"`), `${p.name}: link`);
        assert.ok(textOf(cards[i]).includes(p.name), `${p.name}: name`);
        for (const [label, value] of p.facts) {
          assert.ok(cards[i].includes(`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`), `${p.name}: ${label}`);
        }
      });
      t.series.forEach((s, i) => {
        if (!s.title) return;
        const range = built.ranges[i];
        const section = html.match(new RegExp(`<section[^>]*id="${range.id}"[\\s\\S]*?</section>`));
        assert.ok(section, `${built.id} has no section for ${s.title}`);
        assert.match(textOf(section[0]), new RegExp(`\\b${s.products.length} products?\\b`));
        assert.equal((section[0].match(/<article class="pc-card/g) || []).length, s.products.length, s.title);
      });
    }
  });

  test(`${doc.category}: every product page carries every word of its product`, () => {
    for (const t of doc.types) {
      const built = builtOf(t).ranges.flatMap((r) => r.products);
      productsOf(t).forEach((p, i) => {
        const html = mainOf(read(`${pageOf(built[i])}/index.html`));
        const text = textOf(html);
        const where = `${p.name} (${pageOf(built[i])})`;
        assert.equal(textOf(html.match(/<h1[\s\S]*?<\/h1>/)[0]).trim(), p.name, where);
        for (const d of p.description) assert.ok(text.includes(d), `${where}: description`);
        for (const n of p.notices || []) assert.ok(text.includes(`${n.label}: ${n.text}`), `${where}: ${n.label}`);
        // A listed product's list is on its card (above); its page has its first document's list.
        if (!built[i].page) for (const [label, value] of p.facts) assert.ok(html.includes(`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`), `${where}: ${label}`);
        for (const s of p.sections) {
          assert.ok(text.includes(s.label), `${where}: ${s.label}`);
          if (s.text) assert.ok(text.includes(s.text), `${where}: text of ${s.label}`);
          for (const item of s.items || []) assert.ok(html.includes(`<li>${esc(item)}</li>`), `${where}: ${item}`);
        }
        assert.ok(text.includes('Available Packaging'), `${where}: packaging`);
        for (const size of p.packaging.sizes) assert.ok(html.includes(`<li>${size}</li>`), `${where}: ${size}`);
        if (p.packaging.note) assert.ok(text.includes(p.packaging.note), `${where}: ${p.packaging.note}`);
      });
    }
  });

  test(`${doc.category}: no page holds a control character`, () => {
    for (const rel of ['', ...builtTypes.flatMap((t) => [t.id, ...ownOf(t).map((p) => p.id)])]) {
      const bad = [...read(path.join(base, rel, 'index.html'))].find((ch) => ch < ' ' && !'\n\r\t'.includes(ch));
      assert.equal(bad, undefined, `${rel || 'the category page'}: U+${bad && bad.codePointAt(0).toString(16)}`);
    }
  });

  test(`${doc.category}: every product page leads back to its type`, () => {
    for (const t of builtTypes) {
      for (const p of ownOf(t)) {
        const crumbs = read(`${base}/${p.id}/index.html`).match(/<nav class="breadcrumb[\s\S]*?<\/nav>/)[0];
        assert.ok(crumbs.includes(`href="../${t.id}/"`), p.id);
      }
    }
  });

  test(`${doc.category}: the Products page lists every type, with its number of products`, () => {
    const html = read('products/index.html').match(new RegExp(`<!-- @cat:${doc.category} -->[\\s\\S]*?<!-- /@cat:${doc.category} -->`))[0];
    const links = [...html.matchAll(/<a class="range-link" href="([^"]+)"[\s\S]*?<\/a>/g)];
    assert.deepEqual(links.map((m) => m[1]), builtTypes.map((t) => `${doc.category}/${t.id}/`));
    doc.types.forEach((t, i) => assert.match(textOf(links[i][0]), new RegExp(`\\b${productsOf(t).length}\\b`)));
  });

  test(`${doc.category}: titles and search descriptions are unique and fit`, () => {
    const seen = new Map();
    for (const t of builtTypes) {
      for (const rel of [t.id, ...ownOf(t).map((p) => p.id)]) {
        const html = read(`${base}/${rel}/index.html`);
        const title = html.match(/<title>([^<]+)<\/title>/)[1];
        const description = textOf(html.match(/<meta name="description" content="([^"]+)"/)[1]);
        assert.ok(textOf(title).length <= 65, `${rel}: title ${textOf(title).length}`);
        assert.ok(description.length <= 160, `${rel}: description ${description.length}`);
        for (const [what, value] of [['title', title], ['description', description]]) {
          assert.ok(!seen.has(what + value), `${rel} and ${seen.get(what + value)} share a ${what}`);
          seen.set(what + value, rel);
        }
      }
    }
  });
}

test('a product listed in a second category has its page in the first, which links back', () => {
  const documented = catalogue.categories.filter((c) => c.types);
  for (const cat of documented) {
    for (const t of cat.types) {
      for (const p of t.ranges.flatMap((r) => r.products).filter((x) => x.page)) {
        const [owner, id] = p.page.split('/');
        assert.ok(documented.findIndex((c) => c.id === owner) < documented.indexOf(cat), `${cat.id}/${p.id}: ${owner} comes first`);
        assert.equal(id, p.id);
        const page = read(`products/${p.page}/index.html`);
        assert.ok(page.includes(`<a href="../../${cat.id}/${t.id}/">${esc(cat.name)} · ${esc(t.title)}</a>`), `${p.page} links back to ${cat.id}/${t.id}`);
        assert.ok(!fs.existsSync(path.join(ROOT, 'products', cat.id, p.id)), `${cat.id}/${p.id} has a page of its own`);
      }
    }
  }
});

test('every product of the documents has exactly one page, unless a document gives it words of its own', () => {
  const pages = catalogue.categories.filter((c) => c.types).flatMap((c) => c.types.flatMap((t) => t.ranges.flatMap((r) => r.products))
    .filter((p) => !p.page).map((p) => [p.name, c.id]));
  const twice = pages.filter(([name], i) => pages.findIndex(([n]) => n === name) !== i).map(([name, cid]) => `${cid}: ${name}`);
  assert.deepEqual(twice, ['powersports: PRINCE® BRAKE & CLUTCH FLUID DOT 4']);
});
