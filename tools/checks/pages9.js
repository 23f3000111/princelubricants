// Stories, Contact and Become a Distributor: doc copy verbatim, breadcrumbs, labelled
// placeholders, every form control labelled, empty required fields blocking submission,
// a filled form producing a mail draft with the fields in it, no console errors, and
// nothing hidden without JavaScript.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  const out = { pass: true };

  const visit = async (path) => {
    errors.length = 0;
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    return page.evaluate(async () => {
      const doc = new DOMParser().parseFromString(await (await fetch(location.href, { cache: 'no-store' })).text(), 'text/html');
      return { main: doc.querySelector('main')?.textContent ?? '', h1: [...doc.querySelectorAll('h1')].map((h) => h.textContent) };
    });
  };
  const noJs = async (path) => {
    const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + path, { waitUntil: 'load' });
    const hidden = await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main label')]
      .filter((e) => !e.closest('[aria-hidden="true"]'))
      .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; })
      .map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 40)));
    const action = await p.evaluate(() => document.querySelector('form[data-enquiry]')?.getAttribute('action') ?? null);
    await ctx.close();
    return { hidden, action };
  };
  // A form: controls labelled; clicking send on the empty form is blocked by the browser's
  // validation; once filled, a real click (a user gesture, as a visitor's is) leaves the
  // mail draft link in the status line, addressed to the inbox and carrying the fields.
  const formCheck = async () => {
    const SEL = 'form[data-enquiry]';
    const draftHref = () => page.evaluate((s) => document.querySelector(`${s} .form-status a[href^="mailto:"]`)?.getAttribute('href') ?? '', SEL);
    const r = await page.evaluate((s) => {
      const form = document.querySelector(s);
      if (!form) return { exists: false };
      const controls = [...form.querySelectorAll('input:not([type=hidden]), select, textarea')];
      return { exists: true, unlabelled: controls.filter((c) => !(c.id && form.querySelector(`label[for="${c.id}"]`))).map((c) => c.name), blockedWhenEmpty: !form.checkValidity() };
    }, SEL);
    if (!r.exists) return r;
    // A check must never open the mail app on this machine: cancel the native mailto:
    // submission and the draft link's launch, leaving the page's own handlers to run.
    await page.evaluate(() => {
      document.addEventListener('submit', (e) => e.preventDefault(), true);
      window.followed = [];
      document.addEventListener('click', (e) => {
        const a = e.target instanceof Element && e.target.closest('a[href^="mailto:"]');
        if (a) { window.followed.push(a.getAttribute('href')); e.preventDefault(); }
      }, true);
    });
    await page.click(`${SEL} [type="submit"]`);
    await page.waitForTimeout(300);
    r.noDraftWhenEmpty = (await draftHref()) === '';
    r.validWhenFilled = await page.evaluate((s) => {
      const form = document.querySelector(s);
      for (const c of form.querySelectorAll('input:not([type=hidden]), select, textarea')) {
        if (!c.required) continue;
        if (c.tagName === 'SELECT') c.selectedIndex = 1;
        else if (c.type === 'email') c.value = 'buyer@example.com';
        else c.value = 'Test ' + c.name;
      }
      return form.checkValidity();
    }, SEL);
    await page.click(`${SEL} [type="submit"]`);
    await page.waitForTimeout(400);
    const mail = await draftHref();
    r.mailto = mail.startsWith('mailto:info@princelubricants.com');
    r.carriesFields = decodeURIComponent(mail).includes('buyer@example.com');
    // The page follows its own draft link once, which is what opens the mail app.
    r.followed = await page.evaluate((m) => window.followed.length === 1 && window.followed[0] === m, mail);
    return r;
  };

  // ---------- Stories ----------
  const STORIES = {
    '/company/airasia/': { h1: 'PRINCE LUBRICANTS × AIRASIA', crumb: 'AirAsia Partnership', next: '../china-lubricant-expo-2017/', must: ['FEATURED STORY', 'TAKING THE BRAND TO THE SKIES',
      "Through a strategic partnership with AirAsia, PRINCE LUBRICANTS took its brand presence to an entirely new level with a specially liveried Airbus A320 operating across the airline's regional network. The collaboration transformed a commercial aircraft into a highly visible representation of PRINCE LUBRICANTS across international skies and remains one of the most distinctive milestones in our brand history. PRINCE LUBRICANTS became the first — and remains the only — oil company to have undertaken a commercial aircraft livery initiative of this kind."] },
    '/company/china-lubricant-expo-2017/': { h1: 'CHINA INTERNATIONAL LUBRICANT EXPO 2017', crumb: 'China Lubricant Expo 2017', next: '../airasia/', must: ['FEATURED STORY', 'AT THE CENTRE OF THE MOST ENORMOUS LUBRICANT MARKET',
      "In 2017, PRINCE LUBRICANTS strengthened its presence in the Chinese lubricant industry as a Strategic Sponsor of the China International Lubricants and Application Technology Exhibition, one of China's most established professional platforms for the lubricant industries. The sponsorship reflected the brand's growing international presence and its commitment to engaging directly with distributors, industry professionals and lubricant markets beyond Singapore."] },
  };
  for (const [path, spec] of Object.entries(STORIES)) {
    const src = await visit(path);
    const text = norm(src.main);
    const r = { missing: spec.must.map(norm).filter((s) => !text.includes(s)), h1: src.h1.map(norm) };
    r.crumb = await page.evaluate((c) => { const b = document.querySelector('.breadcrumb'); return !!b?.querySelector('a[href="../../"]') && !!b?.querySelector('a[href="../"]') && b.querySelector('[aria-current="page"]')?.textContent.trim() === c; }, spec.crumb);
    r.links = await page.evaluate((n) => !!document.querySelector(`main a[href="${n}"]`) && !!document.querySelector('main a[href="../"]'), spec.next);
    r.placeholders = await page.evaluate(() => document.querySelectorAll('main .ph, main .photo-slot').length);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500);
    r.consoleErrors = [...errors];
    r.noJs = (await noJs(path)).hidden;
    r.pass = r.missing.length === 0 && r.h1.length === 1 && r.h1[0] === spec.h1 && r.crumb && r.links && r.placeholders >= 3 && r.consoleErrors.length === 0 && r.noJs.length === 0;
    out[path] = r; out.pass = out.pass && r.pass;
  }

  // ---------- Contact ----------
  {
    const src = await visit('/contact/');
    const text = norm(src.main);
    const must = ['CONTACT US', 'Every new market begins with the right partnership. Connect with PRINCE LUBRICANTS for product enquiries, technical support and exclusive distribution opportunities.',
      '36th Floor, UOB Plaza 1, 80 Raffles Place, Singapore 048624', '+65 9114 8735', 'info@princelubricants.com'];
    const r = { missing: must.map(norm).filter((s) => !text.includes(s)), h1: src.h1.map(norm) };
    r.contactLinks = await page.evaluate(() => !!document.querySelector('main a[href="tel:+6591148735"]') && !!document.querySelector('main a[href="mailto:info@princelubricants.com"]'));
    r.map = await page.evaluate(() => { const f = document.querySelector('main iframe'); return !!f && f.getAttribute('loading') === 'lazy' && !!f.getAttribute('title'); });
    r.form = await formCheck();
    r.consoleErrors = [...errors];
    const nj = await noJs('/contact/');
    r.noJs = nj.hidden; r.noJsAction = nj.action;
    r.pass = r.missing.length === 0 && r.h1.length === 1 && r.h1[0] === "LET'S MOVE PERFORMANCE FORWARD." && r.contactLinks && r.map &&
      r.form.exists && r.form.unlabelled.length === 0 && r.form.blockedWhenEmpty && r.form.noDraftWhenEmpty && r.form.validWhenFilled && r.form.mailto && r.form.carriesFields && r.form.followed &&
      r.consoleErrors.length === 0 && r.noJs.length === 0 && String(r.noJsAction).startsWith('mailto:');
    out.contact = r; out.pass = out.pass && r.pass;
  }

  // ---------- Become a Distributor ----------
  {
    const src = await visit('/become-a-distributor/');
    const text = norm(src.main);
    const must = ['BECOME A DISTRIBUTOR',
      'Every new market begins with the right partnership. Connect with PRINCE LUBRICANTS for product enquiries, technical support and exclusive distribution opportunities.',
      'International expansion at PRINCE LUBRICANTS is built around lasting partnerships rather than market presence alone, combining performance-focused lubricant technology and collaborative market development across diverse regions worldwide.',
      'Our international footprint includes the United Kingdom, Australia, China, Saudi Arabia, India, Thailand, Vietnam, Malaysia, Indonesia, the Philippines, Papua New Guinea, Egypt, Ethiopia, Kenya and other markets worldwide.',
      'Exclusive territorial rights', 'Full marketing support', 'Custom formulation collaboration', 'Flexible packaging'];
    const r = { missing: must.map(norm).filter((s) => !text.includes(s)), h1: src.h1.map(norm) };
    r.form = await formCheck();
    r.consoleErrors = [...errors];
    const nj = await noJs('/become-a-distributor/');
    r.noJs = nj.hidden; r.noJsAction = nj.action;
    r.pass = r.missing.length === 0 && r.h1.length === 1 && r.h1[0] === "LET'S BUILD THE NEXT MARKET TOGETHER." &&
      r.form.exists && r.form.unlabelled.length === 0 && r.form.blockedWhenEmpty && r.form.noDraftWhenEmpty && r.form.validWhenFilled && r.form.mailto && r.form.carriesFields && r.form.followed &&
      r.consoleErrors.length === 0 && r.noJs.length === 0 && String(r.noJsAction).startsWith('mailto:');
    out.distributor = r; out.pass = out.pass && r.pass;
  }
  return out;
}
