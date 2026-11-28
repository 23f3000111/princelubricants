// The published copy, wherever it is served (the GitHub Pages project path by default):
// every page answers 200 with its stylesheet applied, no console errors and no failed
// same-origin requests; every internal link on every page resolves; 404.html is styled
// and its links resolve under the project path. With deep404, a missing URL several
// folders deep must answer 404 with that same styled page. Pass `paths` to check only the
// pages a change touched.
async (page, base = 'https://23f3000111.github.io/princelubricants', deep404 = true, paths = null) => {
  const PAGES = paths || ['/', '/company/', '/company/airasia/', '/company/china-lubricant-expo-2017/', '/technology/',
    '/technology/p-9-ester/', '/technology/p-10-ester/', '/products/', '/motorsport/', '/contact/',
    '/become-a-distributor/', '/faq/', '/404.html',
    // The catalogue: its category and type pages and, from each category, the product pages
    // with the most text or the longest name, and one without a pack shot.
    '/products/passenger-car/', '/products/competition/', '/products/commercial-vehicle/', '/products/powersports/',
    '/products/competition/racing-engine-oils/', '/products/competition/racing-coolants/',
    '/products/commercial-vehicle/heavy-duty-engine-oils/', '/products/commercial-vehicle/automatic-transmission-fluids/',
    '/products/commercial-vehicle/hydraulic-and-power-steering-fluids/', '/products/powersports/motorcycle-engine-oils/',
    '/products/powersports/two-stroke-lubricants/', '/products/powersports/chain-lubricants/',
    '/products/industrial/', '/products/marine/', '/products/passenger-car/flagship-ester-based-engine-oils/',
    '/products/passenger-car/passenger-car-engine-oils/', '/products/passenger-car/automatic-transmission-fluids/',
    '/products/passenger-car/manual-transmission-oils/', '/products/passenger-car/differential-and-hypoid-gear-oils/',
    '/products/passenger-car/hydraulic-and-power-steering-fluids/', '/products/passenger-car/brake-and-clutch-fluids/',
    '/products/passenger-car/antifreeze-and-coolants/', '/products/passenger-car/fs1-eurogen-0w-20-c6-c5/',
    '/products/passenger-car/fse-0w-16-gf-6b/', '/products/passenger-car/ss-super-10w-40/', '/products/passenger-car/atf-lv-multi-vehicle/',
    '/products/passenger-car/cvt-fe/', '/products/passenger-car/super-shift-gl-4-gl-4-plus-75w-80/',
    '/products/passenger-car/central-hydraulic-fluid-chf-11s/', '/products/passenger-car/power-steering-fluid-with-stop-leak/',
    '/products/passenger-car/50-50-antifreeze-coolant-g12-plus-plus-g13/', '/products/competition/fsr-gt-endurance-10w-50/',
    '/products/competition/gt-cooling-purple-racing-coolant/', '/products/competition/fsr-5w-40/',
    '/products/commercial-vehicle/d1-gold-4x4-5w-40-ck-4-sn/', '/products/commercial-vehicle/50-50-antifreeze-coolant-hd-elc-noat/',
    '/products/commercial-vehicle/super-shift-gl-5-140/', '/products/powersports/maxx-gold-scooter-4t-5w-30-mb/',
    '/products/powersports/brake-and-clutch-fluid-dot-4/', '/products/powersports/maxx-chain-lube/',
    '/products/industrial/turb-x-zinc-ep/', '/products/marine/marino-valvi-ultra-t-d-15w-40/'];
  const origin = new URL(base).origin;
  const errors = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ text: m.text(), url: m.location().url }); });
  page.on('pageerror', (e) => errors.push({ text: String(e), url: '' }));
  page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400 && r.request().resourceType() !== 'document') failed.push(`${r.status()} ${r.url()}`); });
  await page.setViewportSize({ width: 1440, height: 900 });

  const out = { pass: true, pages: {} };
  const links = new Set();
  const visit = async (path, wantStatus) => {
    errors.length = 0; failed.length = 0;
    const res = await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const info = await page.evaluate((o) => ({
      styled: getComputedStyle(document.body).backgroundColor === 'rgb(6, 6, 17)' && getComputedStyle(document.querySelector('#nav')).position === 'fixed',
      logo: (() => { const img = document.querySelector('.nav-logo img'); return !!img && img.complete && img.naturalWidth > 0; })(),
      links: [...document.querySelectorAll('a[href]')].filter((a) => !a.getAttribute('href').startsWith('#')).map((a) => a.href).filter((h) => h.startsWith(o)),
    }), origin);
    info.links.forEach((h) => links.add(h.split('#')[0]));
    // A missing URL's own 404 is logged by the browser as a console error; that one is the point.
    const own = (e) => wantStatus === 404 && e.url === base + path && /status of 404/.test(e.text);
    const r = { status: res ? res.status() : 0, styled: info.styled, logo: info.logo, errors: errors.filter((e) => !own(e)).map((e) => e.text), failed: [...failed] };
    r.pass = r.status === wantStatus && r.styled && r.logo && !r.errors.length && !r.failed.length;
    out.pages[path] = r;
    out.pass = out.pass && r.pass;
  };

  for (const path of PAGES) await visit(path, 200);
  if (deep404) await visit('/no/such/page/', 404);

  const broken = [];
  for (const url of links) {
    const res = await page.request.get(url);
    if (res.status() !== 200) broken.push(`${res.status()} ${url}`);
  }
  out.linksChecked = links.size;
  out.brokenLinks = broken;
  out.pass = out.pass && broken.length === 0;
  return out;
}
