// Our Company checks: doc copy verbatim in the served HTML, the anchors the header links
// to, the five proof counters, the story links, the map's 18 markets and hub with arcs
// that draw in, no console errors, and nothing hidden without JavaScript.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const LINE = 'Our international footprint includes the United Kingdom, Australia, China, Saudi Arabia, India, Thailand, Vietnam, Malaysia, Indonesia, the Philippines, Papua New Guinea, Egypt, Ethiopia, Kenya, Oman, Bangladesh, the Maldives, Fiji and other markets worldwide.';
  const MUST = [
    'OUR COMPANY', 'FROM BASE OILS TO HIGH-PERFORMANCE LUBRICANTS.',
    'PRINCE LUBRICANTS is built upon a long-standing industry foundation dating back to 1998, when our company began operations in the sourcing, bulk trading and regional distribution of base stocks to lubricant manufacturers.',
    'The business subsequently expanded downstream across the lubricant value chain, developing capabilities in toll blending, finished-lubricant manufacturing, including contract manufacturing and private-label manufacturing, marine lubricant supply and international distribution.',
    'As the business evolved, these operations were consolidated under PRINCE GLOBAL PTE. LTD., carrying forward the experience and capabilities established since 1998.',
    'Today, this accumulated technical and manufacturing expertise forms the foundation of PRINCE LUBRICANTS, our core high-performance lubricant brand developed and manufactured in Singapore.',
    'OUR JOURNEY', 'EXPERIENCE BEHIND THE BRAND.',
    'What began with base oil sourcing and supplying in 1998 has evolved through decades of experience across the lubricant value chain. Today, that journey is reflected in the manufacturing capabilities, scales and international reach behind our core brand – PRINCE LUBRICANTS.',
    'ANNUAL BASE OIL SUPPLY VOLUME', 'Extensive experience in bulk base oil trade and supply to downstream manufacturers across regional markets.',
    'BASE OIL STORAGE CAPACITY', 'Substantial bulk storage infrastructure supporting production flexibility and continuity of supply.',
    'ANNUAL PRODUCTION CAPACITY', 'Large-scale finished-lubricant manufacturing capability supporting an extensive range of formulations and applications.',
    'FACTORIES SERVED', 'Supplying and supporting downstream manufacturers across Southeast Asia and South Asia.',
    'GLOBAL DESTINATIONS', 'PRINCE LUBRICANTS reaches more than 30 international destinations across Asia, Europe, Africa and Oceania.',
    LINE,
    'QUALITY & STANDARDS', 'QUALITY DEFINED BY STANDARDS, NOT CLAIMS.',
    'The performance of a lubricant begins with the quality of its formulation. PRINCE LUBRICANTS applies stringent quality-management principles throughout product development and production, combining carefully selected base oils with advanced additive packages and specialty chemicals from established global technology suppliers including Afton Chemical, Infineum, Lubrizol, BASF, etc.',
    'Formulations are designed and developed around defined performance targets and recognised international specifications, with quality-control procedures applied to maintain product integrity and batch-to-batch consistency. Across the PRINCE LUBRICANTS portfolio, a large variety of products meet recognised industry specifications, API certifications and OEM requirements applicable to their intended applications.',
    'ISO 9001:2015', 'API ENERGY', 'API STARBURST', 'ACEA', 'EELQMS',
    'INTERNATIONAL MARKET FOOTPRINT', 'MORE THAN 30 GLOBAL DESTINATIONS. ONE PERFORMANCE PHILOSOPHY.',
    'PRINCE GLOBAL PTE. LTD. and PRINCE LUBRICANTS have developed a prominent international presence spanning more than 30 countries worldwide, supported by importers, exclusive distributors and market partners across Asia, the Middle East, Africa, Europe and Oceania. ' + LINE,
    'International expansion at PRINCE LUBRICANTS is built around lasting partnerships rather than market presence alone, combining performance-focused lubricant technology and collaborative market development across diverse regions worldwide.',
    'OUR PHILOSOPHY', 'WE CHOSE PERFORMANCE. WE BUILT BEYOND THE PRODUCT.',
    'From the beginning, our ambition for PRINCE LUBRICANTS has extended beyond developing high-quality, high-performance, state-of-the-art engine oils. We believe a high-performance brand must also have the confidence to be seen, the commitment to stand alongside major competitions, and the ambition to build recognition far beyond the products on the shelf.',
    'That philosophy has taken PRINCE LUBRICANTS from international motorsport and industry exhibitions to high-profile global brand initiatives — building a formidable presence designed to give our distributors, partners and customers confidence in the strength, vision and long-term direction behind the brand.',
    'PRINCE LUBRICANTS × AIRASIA', 'TAKING THE BRAND TO THE SKIES',
    "Through a strategic partnership with AirAsia, PRINCE LUBRICANTS took its brand presence to an entirely new level with a specially liveried Airbus A320 operating across the airline's regional network. The collaboration transformed a commercial aircraft into a highly visible representation of PRINCE LUBRICANTS across international skies and remains one of the most distinctive milestones in our brand history. PRINCE LUBRICANTS became the first — and remains the only — oil company to have undertaken a commercial aircraft livery initiative of this kind.",
    'CHINA INTERNATIONAL LUBRICANT EXPO 2017', 'AT THE CENTRE OF THE MOST ENORMOUS LUBRICANT MARKET',
    "In 2017, PRINCE LUBRICANTS strengthened its presence in the Chinese lubricant industry as a Strategic Sponsor of the China International Lubricants and Application Technology Exhibition, one of China's most established professional platforms for the lubricant industries. The sponsorship reflected the brand's growing international presence and its commitment to engaging directly with distributors, industry professionals and lubricant markets beyond Singapore.",
    'DISCOVER THE FULL STORY',
    'THE JOURNEY CONTINUES', 'PERFORMANCE BUILDS THE PRODUCT.', 'AMBITION BUILDS THE BRAND.',
    'For us, building a great lubricant has never been the finish line. We have always believed that a strong performance brand must be backed by the ambition, investment and commitment to make its presence felt beyond the product itself. From taking the PRINCE LUBRICANTS name into the skies with AirAsia and onto the centre stage of the lubricant industry, to international motorsport and an expanding global distribution network, we have continuously looked for ways to take the brand further.',
    'That same enthusiasm continues today. We remain committed to advancing our technologies, strengthening our product portfolio, supporting our international partners and building PRINCE LUBRICANTS into an increasingly recognised name in the global performance lubricant industry.',
    "LET'S MOVE PERFORMANCE FORWARD.",
  ];
  const r = {};
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/company/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const src = await page.evaluate(async () => {
    const doc = new DOMParser().parseFromString(await (await fetch(location.href, { cache: 'no-store' })).text(), 'text/html');
    return { main: doc.querySelector('main')?.textContent ?? '', h1: [...doc.querySelectorAll('h1')].map((h) => h.textContent) };
  });
  const text = norm(src.main);
  r.missingCopy = MUST.map(norm).filter((s) => !text.includes(s));
  r.h1 = src.h1.map(norm);
  r.anchors = await page.evaluate(() => ['journey', 'quality', 'global-presence'].filter((id) => !document.getElementById(id)));
  // Consecutive paragraphs in a centred head keep their spacing (a margin shorthand once zeroed it).
  r.paraGap = await page.evaluate(() => { const ps = document.querySelectorAll('#philosophy .sec-head .sec-text'); return Math.round(ps[1].getBoundingClientRect().top - ps[0].getBoundingClientRect().bottom); });
  r.storyLinks = await page.evaluate(() => !!document.querySelector('main a[href="airasia/"]') && !!document.querySelector('main a[href="china-lubricant-expo-2017/"]'));
  r.breadcrumb = await page.evaluate(() => {
    const b = document.querySelector('.breadcrumb');
    return !!b && !!b.querySelector('a[href="../"]') && b.querySelector('[aria-current="page"]')?.textContent.trim() === 'Our Company';
  });

  await page.evaluate(() => document.getElementById('journey').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.chain')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(2600);
  r.counters = await page.evaluate(() => [...document.querySelectorAll('.chain [data-count]')].map((e) => e.textContent.trim()));

  await page.evaluate(() => document.querySelector('.map-wrap')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(3200);
  r.map = await page.evaluate(() => ({
    markets: document.querySelectorAll('.map-wrap .map-market').length,
    hub: document.querySelectorAll('.map-wrap .map-hub').length,
    arcsDrawn: [...document.querySelectorAll('.map-wrap .map-arc')].every((p) => parseFloat(getComputedStyle(p).strokeDashoffset || '0') < 0.02),
  }));
  r.consoleErrors = [...errors];

  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nojs = await ctx.newPage();
  await nojs.goto(BASE + '/company/', { waitUntil: 'load' });
  r.noJsHiddenText = await nojs.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a')]
    .filter((e) => !e.closest('[aria-hidden="true"]'))
    .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; })
    .map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 40)));
  r.noJsArcsVisible = await nojs.evaluate(() => [...document.querySelectorAll('.map-wrap .map-arc')].every((p) => parseFloat(getComputedStyle(p).strokeDashoffset || '0') < 0.02));
  await ctx.close();

  r.pass = r.missingCopy.length === 0 && r.h1.length === 1 && r.h1[0] === 'FROM BASE OILS TO HIGH-PERFORMANCE LUBRICANTS.' &&
    r.anchors.length === 0 && r.storyLinks && r.breadcrumb && r.paraGap >= 12 &&
    JSON.stringify(r.counters) === JSON.stringify(['>40,000', '>15,000', '>100,000', '40+', '30+']) &&
    r.map.markets === 18 && r.map.hub === 1 && r.map.arcsDrawn && r.noJsArcsVisible &&
    r.consoleErrors.length === 0 && r.noJsHiddenText.length === 0;
  return { pass: r.pass, paraGap: r.paraGap, missing: r.missingCopy, h1: r.h1, anchors: r.anchors, storyLinks: r.storyLinks, breadcrumb: r.breadcrumb, counters: r.counters, map: r.map, noJsArcsVisible: r.noJsArcsVisible, consoleErrors: r.consoleErrors, noJsHidden: r.noJsHiddenText };
}
