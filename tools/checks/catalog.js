// Products and Motorsport checks: doc copy verbatim, the twelve anchors in the doc's order,
// series named only where the doc names them, the event names, labelled placeholders, deep
// links landing below the fixed header (and the sticky category bar), no console errors,
// nothing hidden without JavaScript.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const out = { pass: true };
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });

  const read = async (path) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    return page.evaluate(async () => {
      const doc = new DOMParser().parseFromString(await (await fetch(location.href, { cache: 'no-store' })).text(), 'text/html');
      return { main: doc.querySelector('main')?.textContent ?? '', h1: [...doc.querySelectorAll('h1')].map((h) => h.textContent) };
    });
  };
  // Where the heading of #id lands after a deep link, against the header (and sticky bar) above it.
  const landing = async (path, id) => {
    await page.goto(`${BASE}${path}#${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    return page.evaluate((i) => {
      const target = document.getElementById(i);
      const heading = target.querySelector('h2') || target;
      const covers = [document.getElementById('nav'), document.querySelector('.cat-nav')].filter(Boolean)
        .map((el) => el.getBoundingClientRect().bottom);
      return { headingTop: Math.round(heading.getBoundingClientRect().top), coveredTo: Math.round(Math.max(...covers)) };
    }, id);
  };
  const noJs = async (path) => {
    const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + path, { waitUntil: 'load' });
    const hidden = await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a')]
      .filter((e) => !e.closest('[aria-hidden="true"]'))
      .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; })
      .map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 40)));
    await ctx.close();
    return hidden;
  };

  // ---------- Products ----------
  {
    errors.length = 0;
    const src = await read('/products/');
    const text = norm(src.main);
    const MUST = ['OUR PRODUCTS', 'FROM RACE TO ROAD. INDUSTRY TO SEA.',
      'Explore PRINCE LUBRICANTS high-performance solutions across automotive, motorsport, motorcycle, marine, heavy-duty and industrial applications — from state-of-the-art motor oils and transmission fluids to specialised lubricants engineered for demanding conditions.',
      'Discover the complete PRINCE LUBRICANTS product portfolio, combining advanced engine oils, transmission fluids, driveline lubricants and specialised fluids for a wide range of vehicles, vessels, equipment and machinery.',
      'PASSENGER CAR', 'Engine Oils', 'Transmission Fluids', 'Antifreeze Coolants',
      'MOTORSPORT', 'Racing Oils', 'Manual Gear Oils', 'Performance Coolants',
      'COMMERCIAL FLEET', 'HEAVY DUTY', 'Diesel Engine Oils', 'Hypoid Gear Oils', 'Long-life Coolants',
      'MOTORCYCLE', '4T Engine Oils', 'Scooter Engine Oils', 'Driveline Fluids',
      'INDUSTRIAL', 'Hydraulic', 'Compressor', 'Slideways', 'Metalworking',
      'MARINE', 'Outboard Engine Oils', 'Heavy-Duty Oils', 'System Lubricants',
      'FS1 SERIES', 'FS1 EUROGEN SERIES', 'FSR SERIES', 'MAXX GOLD SERIES'];
    const r = { missing: MUST.map(norm).filter((s) => !text.includes(s)), h1: src.h1.map(norm) };
    r.order = await page.evaluate(() => [...document.querySelectorAll('main .cat-section')].map((s) => s.id));
    r.chips = await page.evaluate(() => [...document.querySelectorAll('.cat-nav a')].map((a) => a.getAttribute('href')));
    r.seriesWhere = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('main .cat-section')].map((s) => [s.id, [...s.querySelectorAll('.series-tags .tag')].map((t) => t.textContent.trim())])));
    r.placeholder = await page.evaluate(() => !!document.querySelector('main .ph .ph-tag'));
    r.consoleErrors = [...errors];
    r.landing = await landing('/products/', 'marine');
    r.noJsHidden = await noJs('/products/');
    const wantOrder = ['passenger-car', 'motorsport', 'commercial-fleet', 'motorcycle', 'industrial', 'marine'];
    const wantSeries = { 'passenger-car': ['FS1 SERIES', 'FS1 EUROGEN SERIES'], motorsport: ['FSR SERIES'], 'commercial-fleet': [], motorcycle: ['MAXX GOLD SERIES'], industrial: [], marine: [] };
    r.pass = r.missing.length === 0 && r.h1.length === 1 && r.h1[0] === 'FROM RACE TO ROAD. INDUSTRY TO SEA.' &&
      JSON.stringify(r.order) === JSON.stringify(wantOrder) && JSON.stringify(r.chips) === JSON.stringify(wantOrder.map((i) => `#${i}`)) &&
      JSON.stringify(r.seriesWhere) === JSON.stringify(wantSeries) && r.placeholder &&
      r.landing.headingTop >= r.landing.coveredTo && r.consoleErrors.length === 0 && r.noJsHidden.length === 0;
    out.products = r;
    out.pass = out.pass && r.pass;
  }

  // ---------- Motorsport ----------
  {
    errors.length = 0;
    const src = await read('/motorsport/');
    const text = norm(src.main);
    const MUST = ['MOTORSPORT HERITAGE', 'PERFORMANCE FORGED THROUGH MOTORSPORT.', 'FROM FORMULA RACING TO GT. FROM ENDURANCE TO DRIFT.',
      'International motorsport has played a defining role in the performance journey of PRINCE LUBRICANTS. From FIA Formula and GT Challenges to Nürburgring endurance racing, the King of Europe Pro Drift Series, East African Safari Rally and countless Gymkhana, this extensive motorsport heritage reflects a performance philosophy shaped by competition, extreme operating conditions and the relentless pursuit of engine protection and reliability.',
      '200+', 'RACING PARTNERSHIPS', 'Performance Proven in Competition',
      'FIA FORMULA', 'GT', 'GYMKHANA', 'ENDURANCE', 'DRIFT', 'TOURING',
      'FIA Formula Series', 'GP3', 'GT World Challenge', 'GT Asia Challenge', 'Nürburgring', 'Le Mans Endurance', 'King of Europe Pro Drift Series', 'East African Safari Rally', '100+ TCR Events'];
    const r = { missing: MUST.map(norm).filter((s) => !text.includes(s)), h1: src.h1.map(norm) };
    r.order = await page.evaluate(() => [...document.querySelectorAll('main .discipline')].map((s) => s.id));
    r.names = await page.evaluate(() => [...document.querySelectorAll('main .discipline h2')].map((h) => h.textContent.trim()));
    r.placeholders = await page.evaluate(() => document.querySelectorAll('main .discipline .ph').length);
    r.links = await page.evaluate(() => !!document.querySelector('main a[href="../technology/p-9-ester/"]') && !!document.querySelector('main a[href="../products/#motorsport"]'));
    r.consoleErrors = [...errors];
    r.landing = await landing('/motorsport/', 'drift');
    r.noJsHidden = await noJs('/motorsport/');
    const wantOrder = ['fia-formula', 'gt', 'gymkhana', 'endurance', 'drift', 'touring'];
    r.pass = r.missing.length === 0 && r.h1.length === 1 && r.h1[0] === 'PERFORMANCE FORGED THROUGH MOTORSPORT.' &&
      JSON.stringify(r.order) === JSON.stringify(wantOrder) &&
      JSON.stringify(r.names) === JSON.stringify(['FIA FORMULA', 'GT', 'GYMKHANA', 'ENDURANCE', 'DRIFT', 'TOURING']) &&
      r.placeholders === 6 && r.links && r.landing.headingTop >= r.landing.coveredTo &&
      r.consoleErrors.length === 0 && r.noJsHidden.length === 0;
    out.motorsport = r;
    out.pass = out.pass && r.pass;
  }
  return out;
}
