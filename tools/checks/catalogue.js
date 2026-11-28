// The product catalogue. Every category page lists its ranges in the data's order, with one card
// per product that opens the product's page and shows its whole pack; a category with a client
// document shows its types instead, and each type's page has the menu of types with its own cell
// in gold, its series and one card per product with every line of the document's list, the rows
// of the cards beside each other level. The first and last product of each category carry the
// product's name as their only h1, its introduction, sizes and sections, a Product JSON-LD and
// an enquiry link; that link fills in the contact form. No console errors; nothing hidden
// without JavaScript.
async (page, base = 'http://127.0.0.1:8765') => {
  const data = await (await page.request.get(base + '/docs/content/products.json')).json();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  const out = { pass: true, categories: {}, types: {}, products: {} };
  // The products with their page in the category: a product listed in a second category has its
  // page in the first.
  const productsOf = (cat) => (cat.types ? cat.types.flatMap((t) => t.ranges) : cat.ranges).flatMap((r) => r.products).filter((p) => !p.page);

  const scroll = async () => {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(90); }
    // The lazy pictures arrive a little after the scroll has passed them.
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
  };
  const open = async (path) => {
    errors.length = 0;
    const res = await page.goto(base + path, { waitUntil: 'networkidle' });
    await scroll();
    return res.status();
  };
  // In the page: the state of its images, and the packs (or their outlines) that a well crops.
  const wells = () => {
    const imgs = [...document.querySelectorAll('main .pc-card img, main .type-tile img, main .ty-visual img')];
    return {
      // Every picture has loaded; a type whose pack shots are all still to come shows outlines.
      images: (imgs.length > 0 || document.querySelectorAll('main .pack-outline').length > 0) && imgs.every((i) => i.complete && i.naturalWidth > 0),
      cropped: [...document.querySelectorAll('.pc-well, .tt-well')].filter((w) => {
        const a = w.getBoundingClientRect();
        return [...w.querySelectorAll('img, .pack-outline, .ph-tag')].some((e) => {
          const i = e.getBoundingClientRect();
          return !(i.top >= a.top - 1 && i.bottom <= a.bottom + 1 && i.left >= a.left - 1 && i.right <= a.right + 1);
        });
      }).length,
      h1: document.querySelectorAll('h1').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  };

  for (const cat of data.categories) {
    const status = await open(`/products/${cat.id}/`);
    const r = { status, ...(await page.evaluate(wells)), errors: [...errors] };
    r.content = await page.evaluate((c) => {
      const crumbs = !!document.querySelector('.breadcrumb a[href="../"]') && !!document.querySelector('.breadcrumb a[href="../../"]');
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      if (c.types) {
        return crumbs && same([...document.querySelectorAll('main .type-tile')].map((a) => a.getAttribute('href')), c.types.map((t) => `${t.id}/`));
      }
      const ranges = [...document.querySelectorAll('main .range-sec')].map((s) => s.id);
      const cards = c.ranges.map((rg) => [...document.querySelectorAll(`[id="${rg.id}"] .pc-card`)].map((a) => a.getAttribute('href')));
      const want = c.ranges.map((rg) => rg.products.map((p) => `${p.id}/`));
      return crumbs && same(ranges, c.ranges.map((x) => x.id)) && same(cards, want) && document.querySelectorAll('.cat-nav a').length === c.ranges.length;
    }, cat);
    r.pass = r.status === 200 && r.h1 === 1 && r.content && r.images && r.cropped === 0 && !r.overflow && !r.errors.length;
    out.categories[cat.id] = r.pass ? 'ok' : r;
    out.pass = out.pass && r.pass;

    for (const type of cat.types || []) {
      const st = await open(`/products/${cat.id}/${type.id}/`);
      const t = { status: st, ...(await page.evaluate(wells)), errors: [...errors] };
      Object.assign(t, await page.evaluate(({ c, ty }) => {
        const norm = (s) => s.replace(/\s+/g, ' ').trim();
        const want = ty.ranges.flatMap((g) => g.products);
        const cells = [...document.querySelectorAll('.type-cell')];
        const cards = [...document.querySelectorAll('article.pc-card')];
        // Cards whose tops are level: their rows are level too.
        const uneven = [...document.querySelectorAll('.pc-grid--c3, .pc-grid--c4')].flatMap((grid) => {
          const rows = new Map();
          for (const card of grid.querySelectorAll('.pc-card')) {
            const top = Math.round(card.getBoundingClientRect().top);
            const at = [...card.querySelectorAll('.pc-facts div')].map((d) => Math.round(d.getBoundingClientRect().top)).join();
            rows.set(top, [...(rows.get(top) || []), at]);
          }
          return [...rows.values()].filter((list) => new Set(list).size > 1);
        }).length;
        return {
          menu: cells.length === c.types.length && cells.every((a, i) => a.getAttribute('href') === `../${c.types[i].id}/#types`),
          current: cells.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => norm(a.querySelector('.type-name').textContent)).join() === ty.title,
          gold: getComputedStyle(document.querySelector('.type-cell[aria-current]')).backgroundColor === 'rgb(255, 215, 0)',
          names: JSON.stringify(cards.map((a) => norm(a.querySelector('h3').textContent))) === JSON.stringify(want.map((p) => p.name)),
          facts: cards.every((a, i) => JSON.stringify([...a.querySelectorAll('.pc-facts div')].map((d) => [norm(d.children[0].textContent), norm(d.children[1].textContent)])) === JSON.stringify(want[i].facts)),
          // The whole card is its link.
          clickable: cards.every((a) => { const l = a.querySelector('a.stretched').getBoundingClientRect(); const s = getComputedStyle(a.querySelector('a.stretched'), '::before'); return l.width > 0 && s.position === 'absolute'; }),
          uneven,
        };
      }, { c: cat, ty: type }));
      t.pass = t.status === 200 && t.h1 === 1 && t.menu && t.current && t.gold && t.names && t.facts && t.clickable && t.uneven === 0 && t.images && t.cropped === 0 && !t.overflow && !t.errors.length;
      out.types[`${cat.id}/${type.id}`] = t.pass ? 'ok' : t;
      out.pass = out.pass && t.pass;
    }
  }

  for (const cat of data.categories) {
    const all = productsOf(cat);
    const without = all.find((p) => !p.images.length);
    for (const p of [all[0], all[all.length - 1], without].filter(Boolean)) {
      errors.length = 0;
      const res = await page.goto(`${base}/products/${cat.id}/${p.id}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const r = await page.evaluate((prod) => {
        const norm = (s) => s.replace(/\s+/g, ' ').trim();
        const main = norm(document.querySelector('main').textContent);
        let ld = null;
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          const j = JSON.parse(s.textContent);
          for (const n of j['@graph'] || [j]) if (n['@type'] === 'Product') ld = n;
        }
        const enquiry = document.querySelector('a.btn-gold[href*="contact/?product="]');
        const img = document.querySelector('.pd-main');
        const titles = [...document.querySelectorAll('.pd-block-title')].map((h) => norm(h.textContent));
        return {
          h1: [...document.querySelectorAll('h1')].map((h) => norm(h.textContent)),
          intro: prod.intro.every((t) => main.includes(norm(t))),
          sizes: prod.sizes.every((s) => main.includes(s)),
          sections: prod.sections.every((s) => titles.includes(s.label)),
          ld: !!ld && ld.name === prod.name && !!ld.image === prod.images.length > 0,
          enquiry: !!enquiry && decodeURIComponent(enquiry.getAttribute('href').split('product=')[1]) === prod.name,
          // Its pack, or the labelled outline while the client still has to send one.
          image: prod.images.length ? !!img && img.complete && img.naturalWidth > 0 : !!document.querySelector('.pd-pack .pack-outline') && /Pack shot to come/.test(main),
        };
      }, p);
      r.status = res.status();
      r.errors = [...errors];
      r.pass = r.status === 200 && r.h1.length === 1 && r.h1[0] === p.name && r.intro && r.sizes && r.sections && r.ld && r.enquiry && r.image && !r.errors.length;
      out.products[`${cat.id}/${p.id}`] = r.pass ? 'ok' : r;
      out.pass = out.pass && r.pass;
    }
  }

  // The enquiry link fills in the contact form.
  const first = productsOf(data.categories[0])[0];
  await page.goto(`${base}/contact/?product=${encodeURIComponent(first.name)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  out.prefill = await page.evaluate((name) => {
    const f = document.querySelector('form[data-enquiry]');
    return { type: f.querySelector('select').value, message: f.querySelector('textarea').value.includes(name) };
  }, first.name);
  out.pass = out.pass && out.prefill.type === 'Product enquiry' && out.prefill.message;

  // Without JavaScript a category page, a type page and a product page are fully readable.
  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nj = await ctx.newPage();
  out.noJs = {};
  const cat0 = data.categories[0];
  for (const path of [`/products/${cat0.id}/`, `/products/${cat0.id}/${cat0.types[0].id}/`, `/products/${cat0.id}/${first.id}/`]) {
    await nj.goto(base + path, { waitUntil: 'load' });
    out.noJs[path] = await nj.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main dt, main dd')]
      .filter((e) => !e.closest('[aria-hidden="true"]'))
      .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; }).length);
  }
  await ctx.close();
  out.pass = out.pass && Object.values(out.noJs).every((n) => n === 0);
  return out;
}
