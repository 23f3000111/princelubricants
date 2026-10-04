// The published copy, wherever it is served (the GitHub Pages project path by default):
// every page answers 200 with its stylesheet applied, no console errors and no failed
// same-origin requests; every internal link on every page resolves; 404.html is styled
// and its links resolve under the project path. With deep404, a missing URL several
// folders deep must answer 404 with that same styled page.
async (page, base = 'https://23f3000111.github.io/princelubricants', deep404 = true) => {
  const PAGES = ['/', '/company/', '/company/airasia/', '/company/china-lubricant-expo-2017/', '/technology/',
    '/technology/p-9-ester/', '/technology/p-10-ester/', '/products/', '/motorsport/', '/contact/',
    '/become-a-distributor/', '/404.html'];
  const origin = new URL(base).origin;
  const errors = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
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
      links: [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(o)),
    }), origin);
    info.links.forEach((h) => links.add(h.split('#')[0]));
    const r = { status: res ? res.status() : 0, styled: info.styled, logo: info.logo, errors: [...errors], failed: [...failed] };
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
