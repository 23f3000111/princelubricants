// The product catalogue (amendment 1). Every category page lists its ranges in the data's
// order, with one card per product that opens the product's page and shows its whole pack. The
// first and last product of each category carry the product's name as their only h1, its
// introduction, sizes and sections, a Product JSON-LD and an enquiry link; that link fills
// in the contact form. No console errors; nothing hidden without JavaScript.
async (page, base = 'http://127.0.0.1:8765') => {
  const data = await (await page.request.get(base + '/docs/content/products.json')).json();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  const out = { pass: true, categories: {}, products: {} };

  const scroll = async () => {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(90); }
    await page.waitForTimeout(500);
  };

  for (const cat of data.categories) {
    errors.length = 0;
    const res = await page.goto(`${base}/products/${cat.id}/`, { waitUntil: 'networkidle' });
    await scroll();
    const r = await page.evaluate((c) => {
      const ranges = [...document.querySelectorAll('main .range-sec')].map((s) => s.id);
      const cards = c.ranges.map((rg) => [...document.querySelectorAll(`[id="${rg.id}"] .pc-card`)].map((a) => a.getAttribute('href')));
      const want = c.ranges.map((rg) => rg.products.map((p) => `${p.id}/`));
      const imgs = [...document.querySelectorAll('.pc-card img')];
      return {
        h1: document.querySelectorAll('h1').length,
        ranges: JSON.stringify(ranges) === JSON.stringify(c.ranges.map((x) => x.id)),
        cards: JSON.stringify(cards) === JSON.stringify(want),
        images: `${imgs.filter((i) => i.complete && i.naturalWidth > 0).length}/${imgs.length}`,
        chips: document.querySelectorAll('.cat-nav a').length === c.ranges.length,
        // Every pack stands whole inside its well, never cropped by it.
        fits: [...document.querySelectorAll('.pc-well')].filter((w) => {
          const a = w.getBoundingClientRect(), i = w.querySelector('img').getBoundingClientRect();
          return !(i.top >= a.top - 1 && i.bottom <= a.bottom + 1 && i.left >= a.left - 1 && i.right <= a.right + 1);
        }).length,
        crumbs: !!document.querySelector('.breadcrumb a[href="../"]') && !!document.querySelector('.breadcrumb a[href="../../"]'),
      };
    }, cat);
    r.status = res.status();
    r.errors = [...errors];
    const [ok, all] = r.images.split('/').map(Number);
    r.pass = r.status === 200 && r.h1 === 1 && r.ranges && r.cards && ok === all && all > 0 && r.chips && r.fits === 0 && r.crumbs && !r.errors.length;
    out.categories[cat.id] = r.pass ? 'ok' : r;
    out.pass = out.pass && r.pass;
  }

  for (const cat of data.categories) {
    const all = cat.ranges.flatMap((rg) => rg.products);
    for (const p of [all[0], all[all.length - 1]]) {
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
          ld: !!ld && ld.name === prod.name,
          enquiry: !!enquiry && decodeURIComponent(enquiry.getAttribute('href').split('product=')[1]) === prod.name,
          image: !!img && img.complete && img.naturalWidth > 0,
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
  const first = data.categories[0].ranges[0].products[0];
  await page.goto(`${base}/contact/?product=${encodeURIComponent(first.name)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  out.prefill = await page.evaluate((name) => {
    const f = document.querySelector('form[data-enquiry]');
    return { type: f.querySelector('select').value, message: f.querySelector('textarea').value.includes(name) };
  }, first.name);
  out.pass = out.pass && out.prefill.type === 'Product enquiry' && out.prefill.message;

  // Without JavaScript a category page and a product page are fully readable.
  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nj = await ctx.newPage();
  out.noJs = {};
  for (const path of [`/products/${data.categories[0].id}/`, `/products/${data.categories[0].id}/${first.id}/`]) {
    await nj.goto(base + path, { waitUntil: 'load' });
    out.noJs[path] = await nj.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a')]
      .filter((e) => !e.closest('[aria-hidden="true"]'))
      .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; }).length);
  }
  await ctx.close();
  out.pass = out.pass && Object.values(out.noJs).every((n) => n === 0);
  return out;
}
