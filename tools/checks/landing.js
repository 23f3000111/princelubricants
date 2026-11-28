// A link to a section of another page lands on that section: its top sits just below the fixed
// header (and the sticky bar, where there is one), for a first visit and for a returning one,
// and stays there once the page has loaded. Going back keeps the place the visitor had reached.
async (page, base = 'http://127.0.0.1:8765') => {
  const LINKS = ['/company/#journey', '/company/#global-presence', '/technology/#p-plus-synthese', '/motorsport/#drift',
    '/products/#marine', '/products/commercial-vehicle/heavy-duty-engine-oils/#devo', '/products/marine/#stern-tube-oils',
    '/products/passenger-car/#types', '/products/passenger-car/automatic-transmission-fluids/#types',
    '/products/passenger-car/automatic-transmission-fluids/#other-atf-dct-and-cvt',
    '/products/passenger-car/flagship-ester-based-engine-oils/#fs1-eurogen', '/products/passenger-car/passenger-car-engine-oils/#m1'];
  const browser = page.context().browser();
  const out = { pass: true, links: {} };
  const where = (id) => {
    const top = document.getElementById(id).getBoundingClientRect().top;
    const covers = [document.getElementById('nav'), document.querySelector('.cat-nav')].filter(Boolean).map((e) => e.getBoundingClientRect()).filter((r) => r.top < 200);
    return { top: Math.round(top), covered: Math.round(Math.max(...covers.map((r) => r.bottom))) };
  };
  for (const returning of [false, true]) {
    for (const link of LINKS) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage();
      if (returning) await p.addInitScript(() => sessionStorage.setItem('pl-seen', '1'));
      await p.goto(base + link, { waitUntil: 'load' });
      await p.waitForTimeout(2500);
      const { top, covered } = await p.evaluate(where, link.split('#')[1]);
      // At the header's edge or a little under it. A sticky bar whose chips overflow is taller by
      // its scrollbar, which the section's own padding covers.
      const pass = top >= covered - 12 && top <= covered + 60;
      out.links[`${returning ? 'returning' : 'first'} ${link}`] = pass ? 'ok' : { top, covered };
      out.pass = out.pass && pass;
      await ctx.close();
    }
  }
  // Back: the visitor scrolled on from the section, opened another page and came back.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${base}/products/#competition`, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.mouse.wheel(0, 1500);
  await p.waitForTimeout(1200);
  const left = await p.evaluate(() => Math.round(scrollY));
  await p.goto(`${base}/contact/`, { waitUntil: 'load' });
  await p.goBack({ waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const back = await p.evaluate(() => Math.round(scrollY));
  out.back = { left, back };
  out.pass = out.pass && Math.abs(left - back) < 120;
  await ctx.close();
  return out;
}
