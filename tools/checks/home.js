// Home page checks: the client's copy is in the served HTML verbatim, the two 2x3 grids
// follow the doc's row/column order, the counters land on their exact figures, every
// next-page CTA goes where the doc says, and nothing is hidden without JavaScript.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const MUST = [
    "SINGAPORE'S PERFORMANCE LUBRICANT SPECIALIST SINCE 1998.",
    'Established in 1998, PRINCE LUBRICANTS is a Singapore-based high-performance lubricant specialist serving automotive, racing, two-wheeler, marine and industrial applications.',
    'Licensed by PRINCE OIL INC. U.S.A. and manufactured by PRINCE GLOBAL PTE. LTD., PRINCE LUBRICANTS develops performance-driven and advanced lubricants for demanding engines, machinery and operating environments worldwide.',
    'ENGINEERED FOR PERFORMANCE. EQUIPPED FOR SCALE.',
    'PRINCE LUBRICANTS transforms performance-focused lubricant engineering into products at scale, backed by more than 100,000 metric tonnes of annual blending capacity and a portfolio of more than 500 lubricant products supplied across international markets.',
    '>100,000', 'Annual Blending Capacity', '>15,000', 'Base Oil Storage Capacity', '30+', 'COUNTRIES', 'Global Market Presence',
    '70+', 'API-LICENSED PRODUCTS', 'API-Certified Portfolio', '200+', 'RACING PARTNERSHIPS', 'Performance Proven in Competition',
    'THE ESTER TECHNOLOGY BEHIND PRINCE LUBRICANTS PERFORMANCE.',
    "At PRINCE LUBRICANTS, cutting-edge ester technology isn't reserved for a single halo product. Proprietary P-9 ESTER Based Technology powers our flagship FS1 automotive engine oils and FSR racing oils, while dedicated P-10 ESTER Based Technology is engineered into MAXX GOLD, our signature 4T oils for high-performance motorcycles. Both ester technologies are designed to deliver greater oil-film strength, lower volatility and enhanced overall engine protection under demanding operating conditions.",
    'Modern Automotive & Racing Performance', 'FS1 SERIES', 'FS1 EUROGEN SERIES', 'FSR SERIES',
    'Engineered for advanced automotive and extreme motorsport applications.', 'EXPLORE P-9 ESTER TECHNOLOGY',
    'High-Performance Motorcycle Engineering', 'MAXX GOLD SERIES', 'Dedicated technology engineered for powerful 4T applications.', 'EXPLORE P-10 ESTER TECHNOLOGY',
    'FROM RACE TO ROAD. INDUSTRY TO SEA.',
    'Explore PRINCE LUBRICANTS high-performance solutions across automotive, motorsport, motorcycle, marine, heavy-duty and industrial applications — from state-of-the-art motor oils and transmission fluids to specialised lubricants engineered for demanding conditions.',
    'Engine Oils · Transmission Fluids · Antifreeze Coolants', 'Racing Oils · Manual Gear Oils · Performance Coolants',
    'Diesel Engine Oils · Hypoid Gear Oils · Long-life Coolants', '4T Engine Oils · Scooter Engine Oils · Driveline Fluids',
    'Hydraulic · Compressor · Slideways · Metalworking', 'Outboard Engine Oils · Heavy-Duty Oils · System Lubricants',
    'EXPLORE ALL PRINCE LUBRICANTS PRODUCTS',
    'PERFORMANCE FORGED THROUGH MOTORSPORT.', 'FROM FORMULA RACING TO GT. FROM ENDURANCE TO DRIFT.',
    'International motorsport has played a defining role in the performance journey of PRINCE LUBRICANTS. From FIA Formula and GT Challenges to Nürburgring endurance racing, the King of Europe Pro Drift Series, East African Safari Rally and countless Gymkhana, this extensive motorsport heritage reflects a performance philosophy shaped by competition, extreme operating conditions and the relentless pursuit of engine protection and reliability.',
    'EXPLORE OUR MOTORSPORT HERITAGE',
    'DISCOVER PRINCE LUBRICANTS',
    'Discover the journey of PRINCE LUBRICANTS — from our beginnings in 1998 to our manufacturing capabilities, international presence and continued evolution as a mass-market high-performance lubricant specialist.',
    'Explore the lubricant engineering, proprietary ester technologies and formulation expertise behind PRINCE LUBRICANTS high-performance products.',
    'Discover the complete PRINCE LUBRICANTS product portfolio, combining advanced engine oils, transmission fluids, driveline lubricants and specialised fluids for a wide range of vehicles, vessels, equipment and machinery.',
    'DISCOVER OUR COMPANY', 'DISCOVER OUR TECHNOLOGY', 'EXPLORE OUR PRODUCTS',
    "LET'S MOVE PERFORMANCE FORWARD.", "LET'S BUILD THE NEXT MARKET TOGETHER.",
    'Every new market begins with the right partnership. Connect with PRINCE LUBRICANTS for product enquiries, technical support and exclusive distribution opportunities.',
  ];
  const r = {};
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  const src = await page.evaluate(async () => {
    const html = await (await fetch(location.href, { cache: 'no-store' })).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { main: doc.querySelector('main')?.textContent ?? '', h1: [...doc.querySelectorAll('h1')].map((h) => h.textContent) };
  });
  const mainText = norm(src.main);
  r.missingCopy = MUST.map(norm).filter((s) => !mainText.includes(s));
  r.h1 = src.h1.map(norm);

  const caps = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim().toUpperCase()), sel);
  const grid = (sel) => page.evaluate((s) => {
    const b = [...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect());
    if (b.length !== 6) return false;
    const row = (i, j) => Math.abs(b[i].top - b[j].top) < 2 && b[i].left < b[j].left;
    const col = (i, j) => Math.abs(b[i].left - b[j].left) < 2 && b[j].top > b[i].top + 10;
    return row(0, 1) && row(2, 3) && row(4, 5) && col(0, 2) && col(2, 4) && col(1, 3) && col(3, 5);
  }, sel);
  r.tileOrder = await caps('.p-card .p-card-title');
  r.tileGrid = await grid('.p-card');
  r.archiveOrder = await caps('.arc-card .arc-name');
  r.archiveGrid = await grid('.arc-card');

  await page.evaluate(() => document.querySelector('.stats')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2600);
  r.counters = await page.evaluate(() => [...document.querySelectorAll('.stats [data-count]')].map((e) => e.textContent.trim()));

  r.links = await page.evaluate(() => {
    const has = (href) => !!document.querySelector(`main a[href="${href}"]`);
    return {
      p9: has('technology/p-9-ester/'), p10: has('technology/p-10-ester/'), products: has('products/'),
      motorsport: has('motorsport/'), company: has('company/'), technology: has('technology/'),
      tiles: [...document.querySelectorAll('.p-card')].map((a) => a.getAttribute('href')).join(' '),
    };
  });
  r.consoleErrors = [...errors];

  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nojs = await ctx.newPage();
  await nojs.goto(BASE + '/', { waitUntil: 'load' });
  r.noJsHiddenText = await nojs.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a')]
    .filter((e) => !e.closest('[aria-hidden="true"]'))
    .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; })
    .map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 40)));
  await ctx.close();

  const want = {
    tiles: ['PASSENGER CAR', 'MOTORSPORT', 'COMMERCIAL FLEET', 'MOTORCYCLE', 'INDUSTRIAL', 'MARINE'],
    archive: ['FIA FORMULA', 'GT', 'GYMKHANA', 'ENDURANCE', 'DRIFT', 'TOURING'],
    counters: ['>100,000', '>15,000', '30+', '70+', '200+'],
    tileHrefs: 'products/#passenger-car products/#motorsport products/#commercial-fleet products/#motorcycle products/#industrial products/#marine',
  };
  r.pass = r.missingCopy.length === 0 && r.h1.length === 1 && r.h1[0] === 'PRINCE LUBRICANTS' &&
    JSON.stringify(r.tileOrder) === JSON.stringify(want.tiles) && r.tileGrid &&
    JSON.stringify(r.archiveOrder) === JSON.stringify(want.archive) && r.archiveGrid &&
    JSON.stringify(r.counters) === JSON.stringify(want.counters) &&
    Object.entries(r.links).every(([k, v]) => (k === 'tiles' ? v === want.tileHrefs : v)) &&
    r.consoleErrors.length === 0 && r.noJsHiddenText.length === 0;
  return r;
}
