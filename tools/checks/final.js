// The whole site, every page at 1440x900 and 1920x1080: no console errors; once the page
// has been scrolled through, nothing in main is left hidden; without JavaScript every h1,
// h2, h3 and p is fully visible; with reduced motion nothing is pinned (no pin spacer, no
// fixed element in main) and every reveal element and split title is visible. A full-page
// screenshot of each page at each size is saved for review.
async (page, BASE = 'http://127.0.0.1:8765', paths = null) => {
  const PAGES = paths || ['/', '/company/', '/company/airasia/', '/company/china-lubricant-expo-2017/', '/technology/',
    '/technology/p-9-ester/', '/technology/p-10-ester/', '/products/', '/motorsport/', '/contact/',
    '/become-a-distributor/', '/faq/', '/404.html',
    // The catalogue: its category and type pages and, from each category, the product pages
    // with the most text or the longest name, and one without a pack shot.
    '/products/passenger-car/', '/products/motorsport/', '/products/commercial-fleet/', '/products/motorcycle/',
    '/products/industrial/', '/products/marine/', '/products/passenger-car/flagship-ester-based-engine-oils/',
    '/products/passenger-car/passenger-car-engine-oils/', '/products/passenger-car/automatic-transmission-fluids/',
    '/products/passenger-car/manual-transmission-oils/', '/products/passenger-car/differential-and-hypoid-gear-oils/',
    '/products/passenger-car/hydraulic-and-power-steering-fluids/', '/products/passenger-car/brake-and-clutch-fluids/',
    '/products/passenger-car/antifreeze-and-coolants/', '/products/passenger-car/fs1-eurogen-0w-20-c6-c5/',
    '/products/passenger-car/fse-0w-16-gf-6b/', '/products/passenger-car/ss-super-10w-40/', '/products/passenger-car/atf-lv-multi-vehicle/',
    '/products/passenger-car/cvt-fe/', '/products/passenger-car/super-shift-gl-4-gl-4-plus-75w-80/',
    '/products/passenger-car/central-hydraulic-fluid-chf-11s/', '/products/passenger-car/power-steering-fluid-with-stop-leak/',
    '/products/passenger-car/50-50-antifreeze-coolant-g12-plus-plus-g13/', '/products/motorsport/fsr-gt-racing-0w-40/',
    '/products/commercial-fleet/heavy-duty-extended-life-elc-antifreeze-coolant/', '/products/motorcycle/fork-oil-5w-light/',
    '/products/industrial/turb-x-zinc-ep/', '/products/marine/marino-valvi-ultra-t-d-15w-40/'];
  const SIZES = [[1440, 900], [1920, 1080]];
  const browser = page.context().browser();
  const slug = (path) => (path.replace(/^\/|\/$/g, '').replace(/[/.]/g, '-') || 'home');

  // In the page: the elements of a selector that are not fully visible, ignoring decoration.
  const hiddenIn = (sel) => [...document.querySelectorAll(sel)]
    .filter((e) => !e.closest('[aria-hidden="true"]'))
    .filter((e) => {
      for (let n = e; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (parseFloat(s.opacity) < 1 || s.visibility === 'hidden') return true;
      }
      return false;
    })
    .map((e) => `${e.tagName}.${e.className}:${e.textContent.trim().slice(0, 30)}`);

  const out = { pass: true, pages: {} };
  for (const path of PAGES) {
    const r = { pass: true };
    for (const [w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const p = await ctx.newPage();
      const errors = [];
      p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      p.on('pageerror', (e) => errors.push(String(e)));
      await p.goto(BASE + path, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1600);
      const height = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += Math.round(h * 0.6)) {
        await p.evaluate((v) => window.scrollTo(0, v), y);
        await p.waitForTimeout(160);
      }
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(1800);
      const stuck = await p.evaluate(`(${hiddenIn})('main h1, main h2, main h3, main p, main li, main a')`);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(700);
      await p.screenshot({ path: `.playwright-mcp/final-${w}-${slug(path)}.png`, fullPage: true });
      r[w] = { errors, stuck };
      if (errors.length || stuck.length) r.pass = false;
      await ctx.close();
    }

    const off = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const po = await off.newPage();
    await po.goto(BASE + path, { waitUntil: 'load' });
    r.noJs = await po.evaluate(`(${hiddenIn})('h1, h2, h3, p')`);
    await off.close();

    const red = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const pr = await red.newPage();
    await pr.goto(BASE + path, { waitUntil: 'networkidle' });
    await pr.waitForTimeout(600);
    r.reduced = await pr.evaluate(`({
      pinSpacers: document.querySelectorAll('.pin-spacer').length,
      fixedInMain: [...document.querySelectorAll('main *')].filter((e) => getComputedStyle(e).position === 'fixed').length,
      hidden: (${hiddenIn})('.rv, .rv-l, .rv-r, .rv-s, [data-split], main h1, main h2, main h3, main p'),
    })`);
    await red.close();

    if (r.noJs.length || r.reduced.pinSpacers || r.reduced.fixedInMain || r.reduced.hidden.length) r.pass = false;
    out.pages[path] = r;
    out.pass = out.pass && r.pass;
  }
  return out;
}
