// Our Technology checks: doc copy verbatim, the five anchors the site links to, links to
// the P-9 and P-10 pages, the ester scene switching state as each pillar crosses the
// viewport centre, no console errors, nothing hidden without JavaScript.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const MUST = [
    'PRINCE LUBRICANTS TECHNOLOGY', 'ADVANCED LUBRICANT TECHNOLOGY. ENGINEERED FOR PERFORMANCE.',
    'Lubricant performance is determined by the interaction between base-stock chemistry, additive technology and the mechanical requirements of the application. PRINCE LUBRICANTS formulates with carefully selected, high-viscosity-index, severely hydroprocessed synthetic base stocks, cutting-edge additive systems and specialised performance chemistries to achieve precisely controlled rheological, tribological and thermal-oxidative characteristics.',
    'Formulation objectives extend beyond viscosity grade alone. Shear stability, oxidation resistance, volatility, lubricant film integrity, low-temperature fluidity, friction characteristics, wear protection, detergency, dispersancy and deposit control are considered as interconnected elements of overall lubricant performance. For high-performance applications, proprietary P-9, P-10 and P-12 ESTER Based Technologies introduce advanced ester chemistry to further strengthen the formulation architecture.',
    'PERFORMANCE IS ENGINEERED INTO THE FORMULATION.',
    'The performance of an engine oil, transmission fluid or specialised lubricant depends on how effectively its base stocks, additive chemistry and performance technologies work together. PRINCE LUBRICANTS engineers each formulation as an integrated system, carefully balancing advanced base stock technology, sophisticated additive technology and application-specific engineering to achieve the required viscosity behaviour, friction characteristics, shear stability, oxidative stability and engine cleanliness under demanding operating conditions.',
    'ADVANCED BASE-STOCK TECHNOLOGY',
    'PRINCE LUBRICANTS employs high-purity hydroisomerized VHVI (Very-High-Viscosity Index) base stocks as a foundation for all high-performance formulations. Characterised by high saturates content, low sulphur levels and elevated viscosity indices, these advanced base stock components provide excellent viscosity-temperature response, low volatility, optimized oxidative stability and favourable low-temperature flow characteristics. Their molecular uniformity and thermal stability provide a robust foundation for maintaining lubricant integrity across wide temperature ranges and challenging operating conditions.',
    'SOPHISTICATED LUBRICANT ADDITIVE SYSTEMS',
    "Modern high-performance engine oils and low-viscosity transmission fluids depend on far more than base stock quality alone. PRINCE LUBRICANTS combines sophisticated additive package with carefully chosen base oils to create precisely balanced formulations for specific mechanical and operating requirements. Detergent and dispersant chemistry, anti-wear agents, friction modifiers, antioxidants, corrosion inhibitors and viscosity-index improvers work synergistically to control oxidation, deposits and sludge, maintain component cleanliness, reduce wear, protect metal surfaces and preserve viscosity performance under sustained thermal and mechanical stress. Careful management of additive compatibility and chemical interactions ensures that these individual functions operate together as a stable, integrated performance system throughout the oil's intended service life.",
    'APPLICATION-SPECIFIC LUBRICANT ENGINEERING',
    'Different engines, transmissions and driveline systems operate under fundamentally different lubrication regimes. PRINCE LUBRICANTS designs application-specific formulations around the mechanical, thermal and tribological demands of each system, considering operating temperature, load, rotational speed, shear conditions, friction characteristics, fuel economy requirements and compatibility with emissions-control technologies of the latest-generation. From highly-advanced passenger car motor oils to motorcycle four-cycle engine oils, automatic transmission fluids, differential gear oils and heavy-duty marine oils, formulation parameters are matched to the intended application and its applicable API, ACEA, JASO and other international performance requirements.',
    'PRINCE LUBRICANTS ESTER TECHNOLOGIES',
    'P-9 ESTER BASED TECHNOLOGY', 'PROPRIETARY ESTER TECHNOLOGY FOR ENGINE OILS & RACING LUBRICANTS.',
    'P-9 ESTER Based Technology is the core formulation architecture behind PRINCE LUBRICANTS flagship FS1 Series, FS1 EUROGEN Series and FSR Racing Series. It integrates high-polar ester chemistry with high-performance Group V synthetic base stocks and state-of-the-art additive systems to enhance surface affinity, lubricant film retention, thermal-oxidative stability and volatility control. This synergistic formulation architecture is developed to maintain film integrity and improve engine shield under increased temperatures, heavy loads and sustained mechanical load stress.',
    'SUPERIOR FILM STRENGTH', 'Resilient lubricant film supports surface separation and protection under extreme loads and mechanical stress.',
    'POLAR MOLECULAR PROTECTION', 'Strong surface affinity supports persistent lubricant coverage on critical components.',
    'BROAD-TEMPERATURE PERFORMANCE', 'Stable lubrication across cold ambient, extreme heat and sustained operating conditions.',
    'RAPID COLD-START PROTECTION', 'Immediate circulation and surface retention support protection during critical start-up conditions.',
    'ENHANCED ENGINE CLEANLINESS', 'Natural ester solvency supports deposit and sludge control and cleaner internal engine surfaces.',
    'P-10 ESTER BASED TECHNOLOGY', 'DEDICATED ESTER TECHNOLOGY FOR POWERFUL 4T ENGINES.',
    'Motorcycle engines operate within an exceptionally demanding lubrication environment. High specific power output, sustained high RPM and compact engine construction generate intense thermal loading, while many motorcycles rely on the same oil to lubricate the engine, gearbox and wet clutch. P-10 ESTER Based Technology is developed specifically for these conditions. Polar ester chemistry supports oil-film retention at elevated temperatures, while strong resistance to volatility and thermal degradation helps preserve lubricant integrity. Carefully controlled frictional and rheological properties provide the shear resistance, clutch compatibility and protection demanded by high-performance motorcycle powertrains.',
    'HIGH-LOAD FILM PROTECTION', 'Ester polarity supports persistent lubricant films across heavily loaded engine and transmission contact surfaces.',
    'HIGH-TEMPERATURE VISCOSITY SUPPORT', 'Thermally stable ester chemistry helps preserve oil film performance as operating temperatures increase.',
    'SUSTAINED THERMAL ENDURANCE', 'Supports prolonged lubricant performance under the continuous heat generated by high-output engines.',
    'THERMAL DEGRADATION RESISTANCE', 'Heat resistance properties help resist lubricant breakdown during severe and sustained operating conditions.',
    'LOW-DEPOSIT PERFORMANCE', 'Natural ester solvency supports deposit control and cleaner lubrication under demanding operations.',
    'PRINCE P+ SYNTHESE', 'A SYNTHETIC-RICH APPROACH TO SEMI-SYNTHETICS.',
    'P+ SYNTHESE uses a high concentration of severely hydroisomerized, high-viscosity index base stocks to establish a more technically capable base-fluid system for SS1, D1 and MAXX ULTRA engine oils. Their optimized saturates content, elevated viscosity index stability and controlled molecular structure provide inherently stronger oxidative stability, lower volatility and enhanced viscosity-temperature characteristics compared with conventional base alternatives. This higher-grade base stock foundation is complemented by exceptional detergent-dispersant chemistry and antioxidant systems to resist lubricant degradation, control piston deposits, and maintain protective performance throughout demanding service.',
    'IMPROVED ENGINE CLEANLINESS', 'Enriched synthetic base stocks and performance additives help minimise deposits, sludge and varnish formation.',
    'LONG-LASTING PERFORMANCE', 'Enhanced thermal-oxidative stability helps preserve lubricant performance throughout demanding service.',
    'ELEVATED BOUNDARY PROTECTION', 'Robust lubricant film and anti-wear chemistry support critical surfaces under boundary-lubrication conditions.',
    "LET'S MOVE PERFORMANCE FORWARD.",
  ];
  const r = {};
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(BASE + '/technology/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const src = await page.evaluate(async () => {
    const doc = new DOMParser().parseFromString(await (await fetch(location.href, { cache: 'no-store' })).text(), 'text/html');
    return { main: doc.querySelector('main')?.textContent ?? '', h1: [...doc.querySelectorAll('h1')].map((h) => h.textContent) };
  });
  const text = norm(src.main);
  r.missing = MUST.map(norm).filter((s) => !text.includes(s));
  r.h1 = src.h1.map(norm);
  r.anchors = await page.evaluate(() => ['formulation', 'ester-technologies', 'p-9-ester', 'p-10-ester', 'p-plus-synthese'].filter((id) => !document.getElementById(id)));
  r.links = await page.evaluate(() => !!document.querySelector('main a[href="p-9-ester/"]') && !!document.querySelector('main a[href="p-10-ester/"]'));
  r.breadcrumb = await page.evaluate(() => document.querySelector('.breadcrumb [aria-current="page"]')?.textContent.trim() === 'Our Technology');

  // Bring the third P-9 pillar to the viewport centre: the stage follows it.
  await page.evaluate(() => document.querySelectorAll('#p-9-ester .ep')[2].scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(900);
  r.scene = await page.evaluate(() => {
    const block = document.getElementById('p-9-ester');
    const pillars = [...block.querySelectorAll('.ep')];
    const stage = block.querySelector('.ester-stage');
    return {
      active: pillars.findIndex((p) => p.classList.contains('is-active')),
      state: stage?.dataset.state,
      caption: block.querySelector('.ester-caption-text')?.textContent.trim(),
      stageOnScreen: (() => { const b = stage.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })(),
    };
  });
  r.consoleErrors = [...errors];

  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nojs = await ctx.newPage();
  await nojs.goto(BASE + '/technology/', { waitUntil: 'load' });
  r.noJsHidden = await nojs.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a')]
    .filter((e) => !e.closest('[aria-hidden="true"]'))
    .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; })
    .map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 40)));
  await ctx.close();

  r.pass = r.missing.length === 0 && r.h1.length === 1 && r.h1[0] === 'ADVANCED LUBRICANT TECHNOLOGY. ENGINEERED FOR PERFORMANCE.' &&
    r.anchors.length === 0 && r.links && r.breadcrumb &&
    r.scene.active === 2 && r.scene.state === '3' && r.scene.caption === 'BROAD-TEMPERATURE PERFORMANCE' && r.scene.stageOnScreen &&
    r.consoleErrors.length === 0 && r.noJsHidden.length === 0;
  return r;
}
