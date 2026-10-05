// The line breaks the client asked for, at five desktop widths, with the titles split and
// animated as a visitor sees them: "HIGH-PERFORMANCE LUBRICANTS." on one line; the
// Technology title as exactly two lines, one sentence each; the Singapore title in exactly
// two lines, neither a lone word, ending on "SINCE 1998."; "lubricant manufacturers." and
// "oxidative characteristics." kept together at the end of their paragraphs.
async (page, base = 'http://127.0.0.1:8765') => {
  const SIZES = [[1280, 800], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]];
  const CASES = [
    ['/company/', 'main h1', (l) => l.at(-1) === 'HIGH-PERFORMANCE LUBRICANTS.'],
    ['/company/', '.page-hero .page-lede', (l) => / manufacturers\.$/.test(l.at(-1)) && l.at(-1).includes(' ')],
    ['/company/', '.pillar p', (l) => l.at(-1).split(' ').length >= 2],
    ['/technology/', 'main h1', (l) => l.length === 2 && l[0] === 'ADVANCED LUBRICANT TECHNOLOGY.' && l[1] === 'ENGINEERED FOR PERFORMANCE.'],
    ['/technology/', '.page-hero .page-lede', (l) => /oxidative characteristics\.$/.test(l.at(-1))],
    ['/', 'main h1', (l) => l.length === 2 && /SINCE 1998\.$/.test(l.at(-1)) && l.every((line) => line.split(' ').length >= 2)],
  ];
  const browser = page.context().browser();
  const out = { pass: true, cases: {} };
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    for (const [path, sel, ok] of CASES) {
      if (p.url() !== base + path) {
        await p.goto(base + path, { waitUntil: 'networkidle' });
        await p.evaluate(() => document.fonts.ready);
        await p.waitForTimeout(4200);   // loader, split and intro animations done
      }
      const lines = await p.evaluate((s) => {
        // Character by character, in DOM order, so a typed title (one node per letter)
        // and a no-break space read the same as plain text.
        const el = document.querySelector(s);
        const rows = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          for (let i = 0; i < node.data.length; i += 1) {
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const r = range.getClientRects()[0];
            if (!r || !r.width) continue;
            const cy = r.top + r.height / 2;
            let row = rows.find((x) => Math.abs(x.cy - cy) < x.h * 0.5);
            if (!row) { row = { cy, h: r.height, text: '' }; rows.push(row); }
            row.text += node.data[i];
          }
        }
        return rows.sort((a, b) => a.cy - b.cy).map((row) => row.text.replace(/[\s ]+/g, ' ').trim()).filter(Boolean);
      }, sel);
      const pass = ok(lines);
      out.cases[`${w} ${path} ${sel}`] = pass ? 'ok' : lines;
      out.pass = out.pass && pass;
    }
    await ctx.close();
  }
  return out;
}
