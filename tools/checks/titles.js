// Every split headline on every built page keeps its own size: the line wrappers SplitText
// adds (.st-line) must inherit the headline's font-size and never pick up another component's styles.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const PATHS = ['/', '/company/', '/technology/', '/technology/p-9-ester/', '/technology/p-10-ester/', '/products/', '/motorsport/',
    '/company/airasia/', '/company/china-lubricant-expo-2017/', '/contact/', '/become-a-distributor/', '/faq/', '/404.html',
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
  await page.setViewportSize({ width: 1440, height: 900 });
  const bad = [];
  for (const path of PATHS) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await page.waitForTimeout(1200);
    const found = await page.evaluate(() => [...document.querySelectorAll('[data-split]')].flatMap((title) => {
      const size = getComputedStyle(title).fontSize;
      return [...title.querySelectorAll('.st-line')]
        .filter((line) => getComputedStyle(line).fontSize !== size)
        .map((line) => `${title.textContent.trim().slice(0, 40)} -> line ${getComputedStyle(line).fontSize} vs ${size}`);
    }));
    found.forEach((f) => bad.push(`${path}: ${f}`));
  }
  return { pass: bad.length === 0, bad: bad.slice(0, 12), count: bad.length };
}
