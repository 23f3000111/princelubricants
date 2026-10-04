#!/usr/bin/env node
/*
 * Draws the Global Presence map once, from Natural Earth 1:110m data. No dependencies.
 *
 *   node tools/build-map.js
 *
 * Inputs (not committed; fetch them into tools/data/ first):
 *   https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_land.geojson
 *   https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson
 *
 * Outputs:
 *   assets/img/world-dots.svg      the dot field, land in grey and the 14 named markets in
 *                                  gold. Static, so it ships as an <img> and caches.
 *   assets/img/world-overlay.svg   the Singapore hub, one marker per market and an arc to
 *                                  each, with classes the page animates. The same SVG is
 *                                  stamped into company/index.html between <!-- @map -->
 *                                  markers, in the same viewBox as the dot field. Each arc
 *                                  has pathLength="1", so CSS can draw it in without any
 *                                  JavaScript measuring it.
 *
 * The frame is cropped to the five regions the client names (Europe, Africa, the Middle
 * East, Asia and Oceania) so the markets read at a useful size. The projection is
 * equirectangular at equal scale on both axes.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'data');

const W = 1000;
const LON0 = -25, LON1 = 180, LAT0 = 72, LAT1 = -48;
const K = W / (LON1 - LON0);
const H = Math.round((LAT0 - LAT1) * K);
const STEP = 8;
const r1 = (n) => Math.round(n * 10) / 10;
const project = ([lon, lat]) => [r1((lon - LON0) * K), r1((LAT0 - lat) * K)];
const unproject = (x, y) => [x / K + LON0, LAT0 - y / K];

const HUB = { id: 'singapore', name: 'Singapore', at: [103.8198, 1.3521], label: [-10, 16, 'end'] };

// `at` is where the marker sits: the Natural Earth label point, or a capital where the
// label point would land on top of Singapore. `label` is [dx, dy, text-anchor].
const MARKETS = [
  { id: 'united-kingdom', name: 'United Kingdom', at: [-1.5, 52.5], label: [-9, 4, 'end'] },
  { id: 'egypt', name: 'Egypt', at: [29.45, 26.19], label: [-9, 4, 'end'] },
  { id: 'saudi-arabia', name: 'Saudi Arabia', at: [44.7, 23.81], label: [9, -6, 'start'] },
  { id: 'ethiopia', name: 'Ethiopia', at: [39.09, 8.03], label: [9, 4, 'start'] },
  { id: 'kenya', name: 'Kenya', at: [37.91, 0.55], label: [-9, 8, 'end'] },
  { id: 'india', name: 'India', at: [79.36, 22.69], label: [-9, 4, 'end'] },
  { id: 'china', name: 'China', at: [106.34, 32.5], label: [9, -6, 'start'] },
  { id: 'thailand', name: 'Thailand', at: [100.5, 15.0], label: [-9, 4, 'end'] },
  { id: 'vietnam', name: 'Vietnam', at: [105.39, 21.72], label: [9, 2, 'start'] },
  { id: 'philippines', name: 'Philippines', at: [122.47, 11.2], label: [9, 4, 'start'] },
  { id: 'malaysia', name: 'Malaysia', at: [113.84, 2.53], label: [9, 4, 'start'] },
  { id: 'indonesia', name: 'Indonesia', at: [110.4, -7.3], label: [-6, 15, 'end'] },
  { id: 'papua-new-guinea', name: 'Papua New Guinea', at: [143.91, -5.7], label: [9, 4, 'start'] },
  { id: 'australia', name: 'Australia', at: [134.05, -24.13], label: [9, 4, 'start'] },
];

function polygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function withBox(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly[0]) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { poly, minX, minY, maxX, maxY };
}

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inAny(pt, boxed) {
  return boxed.some((b) => pt[0] >= b.minX && pt[0] <= b.maxX && pt[1] >= b.minY && pt[1] <= b.maxY &&
    inRing(pt, b.poly[0]) && !b.poly.slice(1).some((hole) => inRing(pt, hole)));
}

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

function main() {
  const land = readJson('ne_110m_land.geojson').features.flatMap((f) => polygons(f.geometry)).map(withBox);
  const countries = readJson('ne_110m_admin_0_countries.geojson').features;
  const marketPolys = countries
    .filter((f) => MARKETS.some((m) => m.name === f.properties.NAME))
    .flatMap((f) => polygons(f.geometry)).map(withBox);

  const found = new Set(countries.map((f) => f.properties.NAME));
  const missing = MARKETS.filter((m) => !found.has(m.name)).map((m) => m.name);
  if (missing.length) throw new Error(`not in Natural Earth: ${missing.join(', ')}`);

  // A hex-offset grid reads as a field rather than as graph paper.
  let landPath = '', marketPath = '', landDots = 0, marketDots = 0;
  for (let row = 0, y = STEP / 2; y < H; row++, y += STEP) {
    for (let x = STEP / 2 + (row % 2 ? STEP / 2 : 0); x < W; x += STEP) {
      const pt = unproject(x, y);
      if (!inAny(pt, land)) continue;
      const seg = `M${r1(x)} ${r1(y)}h0`;
      if (inAny(pt, marketPolys)) { marketPath += seg; marketDots++; } else { landPath += seg; landDots++; }
    }
  }

  const dots = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none">
<path d="${landPath}" stroke="#34344c" stroke-width="3.4" stroke-linecap="round"/>
<path d="${marketPath}" stroke="#FFD700" stroke-opacity=".62" stroke-width="3.4" stroke-linecap="round"/>
</svg>
`;

  const [hx, hy] = project(HUB.at);
  const arc = (m, k) => {
    const [x, y] = project(m.at);
    const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy);
    const lift = Math.min(0.3 * d, 120);
    // Bow every route the same way, north like a flight path. A route that runs nearly
    // north-south has no "up" side, so it bows away from the hub's meridian instead.
    let px = dy / d, py = -dx / d;
    if (Math.abs(py) < 0.25 ? px * dx < 0 : py > 0) { px = -px; py = -py; }
    const cx = r1((hx + x) / 2 + px * lift);
    const cy = r1((hy + y) / 2 + py * lift);
    return `<path class="map-arc" data-market="${m.id}" pathLength="1" style="--k:${k}" d="M${hx} ${hy}Q${cx} ${cy} ${x} ${y}"/>`;
  };
  const marker = (m, cls, k = 0) => {
    const [x, y] = project(m.at);
    const [lx, ly, anchor] = m.label;
    return `<g class="${cls}" data-${cls === 'map-hub' ? 'hub' : 'market'}="${m.id}" style="--k:${k}" transform="translate(${x} ${y})">` +
      `<circle class="map-ring" r="${cls === 'map-hub' ? 7 : 4}"/><circle class="map-dot" r="${cls === 'map-hub' ? 5 : 3}"/>` +
      `<text class="map-label" x="${lx}" y="${ly}" text-anchor="${anchor}">${m.name}</text></g>`;
  };

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="map-overlay" role="img" aria-labelledby="map-title">
<title id="map-title">PRINCE LUBRICANTS markets reached from Singapore: ${MARKETS.map((m) => m.name).join(', ')}</title>
<g class="map-arcs">${MARKETS.map(arc).join('')}</g>
<g class="map-markets">${MARKETS.map((m, k) => marker(m, 'map-market', k)).join('')}</g>
${marker(HUB, 'map-hub')}
</svg>
`;

  fs.mkdirSync(path.join(ROOT, 'assets/img'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets/img/world-dots.svg'), dots);
  fs.writeFileSync(path.join(ROOT, 'assets/img/world-overlay.svg'), overlay);

  const page = path.join(ROOT, 'company/index.html');
  if (fs.existsSync(page)) {
    const html = fs.readFileSync(page, 'utf8');
    const stamped = html.replace(/<!-- @map -->[\s\S]*?<!-- \/@map -->/, () => `<!-- @map -->\n${overlay.trim()}\n<!-- /@map -->`);
    if (stamped !== html) fs.writeFileSync(page, stamped);
    console.log(stamped.includes('class="map-overlay"') ? 'stamped company/index.html' : 'company/index.html has no <!-- @map --> markers');
  }
  console.log(`viewBox 0 0 ${W} ${H}: ${landDots + marketDots} dots (${marketDots} in markets), ${MARKETS.length + 1} markers, ` +
    `world-dots.svg ${(Buffer.byteLength(dots) / 1024).toFixed(1)} KB, world-overlay.svg ${(Buffer.byteLength(overlay) / 1024).toFixed(1)} KB`);
}

main();
