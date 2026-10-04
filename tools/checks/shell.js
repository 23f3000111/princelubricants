// Browser checks for the global shell: plan Task 3 step 6 and Review Focus 1 to 4.
// Run through the Playwright MCP (browser_run_code_unsafe, filename) with the site
// served at http://127.0.0.1:8765 (python -m http.server 8765 from the repo root).
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const FILE_HOME = 'file:///C:/Users/hp/Desktop/All-Mockup/Prince%20Lubricants/princelubricants/index.html';
  const r = {};
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto(BASE + '/404.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  r.consoleErrors = [...errors];

  // Link lists in the footer carry no bullets; the eyebrow's gold rule has drawn in.
  r.footerListsBulletless = await page.evaluate(() => [...document.querySelectorAll('.footer-col ul')]
    .every((ul) => getComputedStyle(ul).listStyleType === 'none'));
  await page.waitForTimeout(1600);
  r.eyebrowRuleDrawn = await page.evaluate(() => {
    const t = getComputedStyle(document.querySelector('main .eyebrow'), '::before').transform;
    return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
  });

  // Skip link: the first Tab lands on it, and Enter moves focus to #main.
  await page.keyboard.press('Tab');
  r.firstTabIsSkip = await page.evaluate(() => !!document.activeElement?.classList.contains('skip-link'));
  await page.keyboard.press('Enter');
  r.skipFocusesMain = await page.evaluate(() => document.activeElement?.id === 'main');

  // Mega menu: Tab reaches the Company toggle, Enter opens it, Esc closes it and hands focus back.
  // A fresh load, because the skip link left the sequential-focus start point inside #main.
  await page.goto(BASE + '/404.html', { waitUntil: 'networkidle' });
  let reached = false;
  for (let i = 0; i < 14 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => !!document.activeElement?.matches('.nav-toggle[aria-controls="mega-company"]'));
  }
  r.tabReachesCompanyToggle = reached;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  r.enterOpens = await page.evaluate(() => {
    const t = document.querySelector('.nav-toggle[aria-controls="mega-company"]');
    const panel = document.getElementById('mega-company');
    return !!t && !!panel && t.getAttribute('aria-expanded') === 'true' && getComputedStyle(panel).visibility === 'visible';
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  r.escCloses = await page.evaluate(() => {
    const t = document.querySelector('.nav-toggle[aria-controls="mega-company"]');
    const panel = document.getElementById('mega-company');
    return !!t && t.getAttribute('aria-expanded') === 'false' && document.activeElement === t &&
      getComputedStyle(panel).visibility === 'hidden';
  });

  // Reduced motion: no custom cursor, native cursor kept.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/404.html', { waitUntil: 'networkidle' });
  r.reducedCursorRingHidden = await page.evaluate(() => {
    const ring = document.getElementById('cursor-ring');
    return !ring || getComputedStyle(ring).display === 'none';
  });
  r.reducedBodyCursor = await page.evaluate(() => getComputedStyle(document.body).cursor);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // JavaScript off: native cursor, nothing waiting on an animation, no loader in the way.
  const ctx = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const nojs = await ctx.newPage();
  await nojs.goto(BASE + '/404.html', { waitUntil: 'load' });
  r.noJsBodyCursor = await nojs.evaluate(() => getComputedStyle(document.body).cursor);
  r.noJsHiddenText = await nojs.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, footer p, footer a')]
    .filter((e) => !e.closest('.mega, .mobile-menu, #loader, [aria-hidden="true"]'))
    .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.opacity) < 1 || s.visibility === 'hidden'; })
    .map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 30)));
  r.noJsLoaderShown = await nojs.evaluate(() => {
    const l = document.getElementById('loader');
    if (!l) return false;
    const s = getComputedStyle(l);
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0;
  });
  await ctx.close();

  // Double-click preview from disk: directory links are rewritten to index.html.
  try {
    await page.goto(FILE_HOME, { waitUntil: 'load' });
    r.fileCompanyHref = await page.evaluate(() => document.querySelector('.nav-link[data-nav="company"]')?.getAttribute('href') ?? null);
  } catch (e) {
    r.fileCompanyHref = 'error: ' + String(e.message).split('\n')[0];
  }

  r.pass = r.consoleErrors.length === 0 && r.footerListsBulletless && r.eyebrowRuleDrawn && r.firstTabIsSkip && r.skipFocusesMain && r.tabReachesCompanyToggle &&
    r.enterOpens && r.escCloses && r.reducedCursorRingHidden && r.reducedBodyCursor !== 'none' &&
    r.noJsBodyCursor !== 'none' && r.noJsHiddenText.length === 0 && !r.noJsLoaderShown &&
    String(r.fileCompanyHref).endsWith('company/index.html');
  return r;
}
