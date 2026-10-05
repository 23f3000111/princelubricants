// No orphans: in every heading and paragraph on every page, at five desktop widths, no
// line that ends a block or a <br> holds a single word when that run has three or more
// (a two-word title too long for its card splits one and one, which is no orphan). Glued
// words never stick out of their block or change colour. FAQ answers are opened first. A word broken at
// its hyphen counts on both lines, so "thermal-" / "oxidative characteristics." is two
// words on the last line. Run after fonts load and titles split, as a visitor sees them.
async (page, base = 'http://127.0.0.1:8765', paths = null) => {
  const PAGES = paths || ['/', '/company/', '/company/airasia/', '/company/china-lubricant-expo-2017/', '/technology/',
    '/technology/p-9-ester/', '/technology/p-10-ester/', '/products/', '/motorsport/', '/contact/',
    '/become-a-distributor/', '/faq/', '/404.html'];
  const SIZES = [[1280, 800], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]];
  const browser = page.context().browser();

  // In the page: every visible heading and paragraph whose last line is a lone word.
  const find = () => {
    document.querySelectorAll('details').forEach((det) => { det.open = true; });
    const orphans = [];
    const els = document.querySelectorAll('h1, h2, h3, h4, p, .next-title, .next-sub, .dd-title');
    for (const el of els) {
      if (!el.getClientRects().length || el.closest('.sr-only, #loader, [hidden]')) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const lines = [];   // { cy, h, words: Set, runs: Set }
      let id = 0;
      let run = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeName === 'BR') { run += 1; continue; }
        if (node.nodeType !== Node.TEXT_NODE || node.parentElement.closest('.type-cursor')) continue;
        for (const m of node.textContent.matchAll(/[^\s ]+/g)) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const token = id++;
          for (const r of range.getClientRects()) {
            if (!r.width) continue;
            const cy = r.top + r.height / 2;
            let line = lines.find((l) => Math.abs(l.cy - cy) < l.h * 0.5);
            if (!line) { line = { cy, h: r.height, words: new Set(), runs: new Set() }; lines.push(line); }
            line.words.add(token);
            line.runs.add(run);
          }
        }
      }
      if (lines.length < 2 || id < 2) continue;
      lines.sort((a, b) => a.cy - b.cy);
      // The last line of each run (the text before a <br>, or the end) must not be one word.
      const label = `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`;
      for (let k = 0; k < lines.length; k += 1) {
        const line = lines[k];
        const next = lines[k + 1];
        const endsRun = !next || [...line.runs].some((r) => !next.runs.has(r));
        const runWords = lines.filter((l) => [...l.runs].some((r) => line.runs.has(r))).reduce((n, l) => n + l.words.size, 0);
        if (endsRun && line.words.size === 1 && runWords >= 3) {
          orphans.push(`${label}: …${el.textContent.replace(/\s+/g, ' ').trim().slice(-48)}`);
          break;
        }
      }
      for (const g of el.querySelectorAll('.glue')) {
        const gr = g.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        if (gr.right > er.right + 1 || gr.left < er.left - 1) orphans.push(`${label} overflows: ${g.textContent}`);
        if (getComputedStyle(g).color !== getComputedStyle(g.parentElement).color) orphans.push(`${label} glue recolours: ${g.textContent}`);
      }
    }
    // Labels and eyebrows are one line each: they are set in wide-tracked capitals.
    for (const el of document.querySelectorAll('.sec-label, .h-eyebrow')) {
      if (!el.getClientRects().length || el.closest('[hidden]')) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set([...range.getClientRects()].filter((r) => r.width > 1).map((r) => Math.round(r.top / 4)));
      if (tops.size > 1) orphans.push(`${el.className.split(' ')[0]} wraps: ${el.textContent.trim()}`);
    }
    return orphans;
  };

  const out = { pass: true, pages: {} };
  for (const path of PAGES) {
    const r = {};
    for (const [w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await p.goto(base + path, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(500);
      const found = await p.evaluate(find);
      if (found.length) { r[w] = found; out.pass = false; }
      await ctx.close();
    }
    out.pages[path] = Object.keys(r).length ? r : 'ok';
  }
  return out;
}
