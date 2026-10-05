// FAQ page: every question and answer from the client's spreadsheet (docs/content/faq.json,
// written by tools/build-faq.py) is on the page, verbatim, in its category, and in the
// FAQPage JSON-LD; the category chips link to the sections; a question opens on click and
// on a deep link (landing below the header and the sticky category bar); the search narrows the list and says when
// nothing matches; without JavaScript every question is readable and the search is
// hidden; the header and footer link to the page; no console errors.
async (page, base = 'http://127.0.0.1:8765') => {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const res = await page.request.get(base + '/docs/content/faq.json');
  if (!res.ok()) return { pass: false, error: `faq.json: ${res.status()}` };
  const data = await res.json();
  const total = data.reduce((n, c) => n + c.items.length, 0);

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  const resp = await page.goto(base + '/faq/', { waitUntil: 'networkidle' });
  const out = { status: resp.status(), total };
  await page.waitForTimeout(600);

  // Content, structure and JSON-LD against the spreadsheet.
  Object.assign(out, await page.evaluate(({ data, total }) => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const problems = [];
    for (const cat of data) {
      const section = document.getElementById(cat.id);
      if (!section) { problems.push(`no section #${cat.id}`); continue; }
      if (!document.querySelector(`.cat-nav a[href="#${cat.id}"]`)) problems.push(`no chip for #${cat.id}`);
      const items = section.querySelectorAll('details.faq-item');
      if (items.length !== cat.items.length) problems.push(`#${cat.id}: ${items.length} items, expected ${cat.items.length}`);
      cat.items.forEach((it, i) => {
        const d = document.getElementById(it.id);
        if (!d || !section.contains(d)) { problems.push(`no #${it.id} in #${cat.id}`); return; }
        if (items[i] !== d) problems.push(`#${it.id} out of order`);
        if (norm(d.querySelector('summary').textContent) !== norm(it.q)) problems.push(`question differs: ${it.id}`);
        if (norm(d.querySelector('.faq-a').textContent) !== norm(it.a)) problems.push(`answer differs: ${it.id}`);
      });
    }
    let ld = null;
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      const j = JSON.parse(s.textContent);
      for (const node of j['@graph'] || [j]) if (node['@type'] === 'FAQPage') ld = node;
    }
    const flat = data.flatMap((c) => c.items);
    const ldOk = !!ld && ld.mainEntity.length === total && ld.mainEntity.every((q, i) => q['@type'] === 'Question' && norm(q.name) === norm(flat[i].q) && norm(q.acceptedAnswer.text) === norm(flat[i].a));
    return { problems, ldOk, h1: document.querySelectorAll('h1').length };
  }, { data, total }));

  // Click a question open.
  const first = data[0].items[0].id;
  await page.click(`#${first} summary`);
  await page.waitForTimeout(500);
  out.opensOnClick = await page.evaluate((id) => { const d = document.getElementById(id); const a = d.querySelector('.faq-a'); return d.open && a.getBoundingClientRect().height > 20; }, first);

  // Search narrows, and says so when nothing matches.
  out.search = await page.evaluate(async () => {
    const input = document.querySelector('#faq-search');
    if (!input || input.hidden) return { exists: false };
    const visible = () => [...document.querySelectorAll('details.faq-item')].filter((d) => d.getClientRects().length);
    const set = async (v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 250)); };
    await set('GPF');
    const hits = visible();
    const allMatch = hits.length > 0 && hits.every((d) => /gpf/i.test(d.textContent));
    const missed = [...document.querySelectorAll('details.faq-item')].filter((d) => /gpf/i.test(d.textContent) && !d.getClientRects().length).length;
    const emptySections = [...document.querySelectorAll('.faq-cat')].filter((s) => s.getClientRects().length && !s.querySelector('details.faq-item:not([hidden])')).length;
    await set('zzzz-no-such-thing');
    const none = visible().length === 0 && !!document.querySelector('.faq-empty') && document.querySelector('.faq-empty').getClientRects().length > 0;
    await set('');
    const restored = visible().length;
    return { exists: true, hits: hits.length, allMatch, missed, emptySections, none, restored };
  });

  // A deep link opens its question below the fixed header.
  const deep = data[3].items[2].id;
  await page.goto(base + '/faq/#' + deep, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  out.deepLink = await page.evaluate((id) => { const d = document.getElementById(id); const r = d.getBoundingClientRect(); const bars = ['#nav', '.cat-nav'].map((sel) => document.querySelector(sel).getBoundingClientRect().bottom); return { open: d.open, top: Math.round(r.top), header: Math.round(Math.max(...bars)) }; }, deep);
  out.consoleErrors = [...errors];

  // Without JavaScript.
  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(base + '/faq/', { waitUntil: 'load' });
  out.noJs = await p.evaluate(() => ({
    hiddenQuestions: [...document.querySelectorAll('details.faq-item summary')].filter((s) => { const cs = getComputedStyle(s); return !s.getClientRects().length || parseFloat(cs.opacity) < 1 || cs.visibility === 'hidden'; }).length,
    searchHidden: !document.querySelector('#faq-search') || !document.querySelector('#faq-search').getClientRects().length,
  }));
  await p.goto(base + '/contact/', { waitUntil: 'load' });
  out.linked = await p.evaluate(() => ({ nav: !!document.querySelector('#nav a[href="../faq/"]'), footer: !!document.querySelector('.site-footer a[href="../faq/"]'), mobile: !!document.querySelector('#mob-menu a[href="../faq/"]') }));
  await ctx.close();

  out.pass = out.status === 200 && out.h1 === 1 && out.problems.length === 0 && out.ldOk && out.opensOnClick &&
    out.search.exists && out.search.allMatch && out.search.missed === 0 && out.search.emptySections === 0 && out.search.none && out.search.restored === total &&
    out.deepLink.open && out.deepLink.top >= out.deepLink.header && out.deepLink.top < 400 &&
    out.consoleErrors.length === 0 && out.noJs.hiddenQuestions === 0 && out.noJs.searchHidden &&
    out.linked.nav && out.linked.footer && out.linked.mobile;
  out.problems = out.problems.slice(0, 12);
  return out;
}
