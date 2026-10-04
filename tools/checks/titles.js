// Every split headline on every built page keeps its own size: the line wrappers SplitText
// adds (.st-line) must inherit the headline's font-size and never pick up another component's styles.
async (page) => {
  const BASE = 'http://127.0.0.1:8765';
  const PATHS = ['/', '/company/', '/technology/', '/technology/p-9-ester/', '/technology/p-10-ester/', '/products/', '/motorsport/',
    '/company/airasia/', '/company/china-lubricant-expo-2017/', '/contact/', '/become-a-distributor/', '/404.html'];
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
