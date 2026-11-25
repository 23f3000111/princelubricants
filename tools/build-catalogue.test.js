'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('./build-catalogue.js');

const product = (over = {}) => ({
  id: 'x', name: 'PRINCE® FS1 SAE 0W-30', intro: ['One.'], sizes: ['1L', '4L'], sizeNote: 'as applicable', spec: 'API SP · API CF', sections: [], images: [],
  facts: [['Product Series', 'FS1'], ['Product Type', 'Fully Synthetic Engine Oil'], ['API Service Category', 'API SP'], ['ACEA Classification', 'ACEA A3/B4'], ['Category', 'PCMO']],
  ...over,
});

test('a document product name is split into its family and the grade shown in gold', () => {
  const cases = [
    ['PRINCE® FS1 SAE 0W-30', 'PRINCE® FS1', 'SAE 0W-30'],
    ['PRINCE® FS1 EUROGEN SAE 0W-20 C6/C5', 'PRINCE® FS1 EUROGEN', 'SAE 0W-20 C6/C5'],
    ['PRINCE® SS1 Fuel Economy SAE 5W-30', 'PRINCE® SS1 Fuel Economy', 'SAE 5W-30'],
    ['PRINCE® SUPER-SHIFT GL-5 +LSD SAE 75W-140', 'PRINCE® SUPER-SHIFT GL-5 +LSD', 'SAE 75W-140'],
    ['PRINCE® ATF EUROSPEC 9HP', 'PRINCE® ATF EUROSPEC', '9HP'],
    ['PRINCE® ATF EUROSPEC 8AT AW-2', 'PRINCE® ATF EUROSPEC', '8AT AW-2'],
    ['PRINCE® ATF 6 MERCON LV DEXRON VI', 'PRINCE® ATF', '6 MERCON LV DEXRON VI'],
    ['PRINCE® ATF LV MULTI-VEHICLE', 'PRINCE® ATF', 'LV MULTI-VEHICLE'],
    ['PRINCE® DCT MAGNA LV', 'PRINCE® DCT', 'MAGNA LV'],
    ['PRINCE® CVT FE', 'PRINCE® CVT', 'FE'],
    ['PRINCE® CENTRAL HYDRAULIC FLUID CHF 11S', 'PRINCE® CENTRAL HYDRAULIC FLUID', 'CHF 11S'],
    ['PRINCE® POWER STEERING FLUID', 'PRINCE®', 'POWER STEERING FLUID'],
    ['PRINCE® POWER STEERING FLUID WITH STOP LEAK', 'PRINCE® POWER STEERING FLUID', 'WITH STOP LEAK'],
    ['PRINCE® BRAKE & CLUTCH FLUID DOT 5.1', 'PRINCE® BRAKE & CLUTCH FLUID', 'DOT 5.1'],
    ['PRINCE® 50/50 ANTIFREEZE/COOLANT G12++/G13 −37°C', 'PRINCE® 50/50 ANTIFREEZE/COOLANT', 'G12++/G13 −37°C'],
  ];
  for (const [name, lead, mark] of cases) assert.deepEqual(c.nameParts(name), [lead, mark], name);
});

test('goldGrade keeps its rule for the products that come from the current site', () => {
  assert.equal(c.goldGrade('D1 GOLD 5W-30'), 'D1 GOLD <span>5W-30</span>');
  assert.equal(c.goldGrade('Suspension Fork Oil'), 'Suspension Fork Oil');
  assert.equal(c.goldGrade('PRINCE® BRAKE & CLUTCH FLUID DOT 4'), 'PRINCE® BRAKE &amp; CLUTCH FLUID <span>DOT 4</span>');
});

test('a search description says what the product is, its categories and its packs', () => {
  assert.equal(c.docDescription(product()), 'PRINCE® FS1 SAE 0W-30: Fully Synthetic Engine Oil. API SP, ACEA A3/B4. Available packaging: 1L, 4L.');
});

test('a search description spells out a product type that is only an abbreviation', () => {
  const p = product({ name: 'PRINCE® ATF EUROSPEC 9HP', sizes: ['1L', '20L'],
    facts: [['Product Type', 'ATF'], ['Base Type', 'Fully Synthetic'], ['Fluid Classification', 'Ultra-Low-Viscosity ATF'], ['Performance Specifications', 'ZF 9HP Series'], ['Category', 'Automatic Transmission Fluid (ATF)']] });
  assert.equal(c.docDescription(p), 'PRINCE® ATF EUROSPEC 9HP: Fully Synthetic Ultra-Low-Viscosity ATF. ZF 9HP Series. Available packaging: 1L, 20L.');
});

test('a search description gives up its packs, then its last standards, to stay within 155 characters', () => {
  const standards = ['ASTM D3306', 'ASTM D4985', 'ASTM D6210', 'MB 326.3', 'VW TL 774-D (G12)', 'VW TL 774-F (G12+)'];
  const p = product({ name: 'PRINCE® 50/50 ANTIFREEZE/COOLANT G12/G12+ −37°C', facts: [['Product Type', 'Ethylene Glycol-Based Coolant'], ['Key Performance Standards', standards.join(', ')]] });
  const out = c.docDescription(p);
  assert.ok(out.length <= 155, `${out.length}: ${out}`);
  assert.match(out, /^PRINCE® 50\/50 ANTIFREEZE\/COOLANT G12\/G12\+ −37°C: Ethylene Glycol-Based Coolant\. ASTM D3306, ASTM D4985/);
  assert.match(out, /\.$/);
});

test('a product without a pack shot shows a labelled placeholder, never a broken image', () => {
  const html = c.docCard(product(), '../../../', 'x/', 0);
  assert.match(html, /Pack shot to come/);
  assert.doesNotMatch(html, /<img/);
});

test('a document card lists every line of the document and links once, by its name', () => {
  const html = c.docCard(product(), '../../../', '../x/', 0);
  for (const [label, value] of product().facts) assert.match(html, new RegExp(`<dt>${label}</dt>\\s*<dd>${value}</dd>`));
  assert.equal((html.match(/<a /g) || []).length, 1);
  assert.match(html, /<h3 class="pc-name[^"]*"><a class="stretched" href="\.\.\/x\/">PRINCE® FS1 <span>SAE 0W-30<\/span><\/a><\/h3>/);
});

test('only a series whose small letter is part of its name keeps its case', () => {
  for (const name of ['FSe', 'PRINCE® FSe SAE 0W-16 GF-6B']) assert.equal(c.keepCase(name), ' keep-case', name);
  for (const name of ['FS1', 'SS1', 'Other ATF, DCT & CVT', 'Antifreeze & Coolants', 'PRINCE® SS1 Fuel Economy SAE 5W-30', 'D1 GOLD']) assert.equal(c.keepCase(name), '', name);
});

test('a series never leaves one card alone in a row', () => {
  for (let n = 2; n <= 24; n += 1) {
    if (n === 13) continue; // thirteen leaves one over in threes and in fours
    assert.notEqual(n % c.columns(n), 1, `${n} cards in ${c.columns(n)} columns`);
  }
  assert.deepEqual([1, 2, 3, 4, 5, 6, 8, 9].map(c.columns), [1, 2, 3, 4, 3, 3, 4, 3]);
});

test('a grade in running text does not break at its hyphen', () => {
  assert.equal(c.prose('Meets SAE 0W-20, or 5W-30 & more.'), 'Meets SAE <span class="glue">0W-20</span>, or <span class="glue">5W-30</span> &amp; more.');
  assert.equal(c.prose('A 7-speed, low-viscosity fluid.'), 'A 7-speed, low-viscosity fluid.');
});

test('a hyphenated family name does not break at its hyphen', () => {
  assert.equal(c.goldGrade('PRINCE® SUPER-SHIFT GL-5 SAE 75W-90'), 'PRINCE® <span class="glue">SUPER-SHIFT</span> <span class="glue">GL-5</span> <span>SAE 75W-90</span>');
});
