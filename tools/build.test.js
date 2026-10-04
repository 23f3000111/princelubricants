'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('./build.js');

test('urlFor maps page files to clean URLs', () => {
  assert.equal(b.urlFor('index.html'), '/');
  assert.equal(b.urlFor('company/index.html'), '/company/');
  assert.equal(b.urlFor('company/airasia/index.html'), '/company/airasia/');
  assert.equal(b.urlFor('404.html'), '/404.html');
});

test('rootPrefix and homeHref are relative by depth, absolute on the 404 page', () => {
  assert.equal(b.rootPrefix('index.html'), '');
  assert.equal(b.rootPrefix('company/index.html'), '../');
  assert.equal(b.rootPrefix('company/airasia/index.html'), '../../');
  assert.equal(b.rootPrefix('404.html'), '/');
  assert.equal(b.homeHref('index.html'), './');
  assert.equal(b.homeHref('technology/p-9-ester/index.html'), '../../');
  assert.equal(b.homeHref('404.html'), '/');
});

test('stamp replaces marker contents, fills tokens, and is idempotent', () => {
  const page = '<body><!-- @header -->stale<!-- /@header --></body>';
  const partials = { header: '<a href="{{root}}company/">Company</a>' };
  const once = b.stamp(page, partials, { root: '../', home: '../' }, '/technology/');
  assert.equal(once, '<body><!-- @header -->\n<a href="../company/">Company</a>\n<!-- /@header --></body>');
  assert.equal(b.stamp(once, partials, { root: '../', home: '../' }, '/technology/'), once);
});

test('markCurrent marks only the link that points at this page', () => {
  const html = '<a href="../company/">C</a><a href="../technology/">T</a><a href="https://x.com/">X</a>';
  assert.equal(
    b.markCurrent(html, '/company/'),
    '<a href="../company/" aria-current="page">C</a><a href="../technology/">T</a><a href="https://x.com/">X</a>'
  );
});

const good = (canon) => `<html><head><title>T</title><meta name="description" content="D">
<link rel="canonical" href="https://www.princelubricants.com${canon}">
<!-- @head --><!-- /@head -->
<script type="application/ld+json">{"@type":"WebPage"}</script></head>
<body><!-- @header --><!-- /@header --><h1>One</h1><!-- @cta --><!-- /@cta --><!-- @footer --><!-- /@footer --></body></html>`;

test('checkPage passes a well-formed page', () => {
  assert.deepEqual(b.checkPage('company/index.html', good('/company/')), []);
});

test('checkPage flags h1 count, canonical, JSON-LD, tokens and markers', () => {
  const rel = 'company/index.html';
  assert.match(b.checkPage(rel, good('/company/').replace('<h1>One</h1>', '')).join(), /h1/);
  assert.match(b.checkPage(rel, good('/company/').replace('</h1>', '</h1><h1>Two</h1>')).join(), /h1/);
  assert.match(b.checkPage(rel, good('/wrong/')).join(), /canonical/);
  assert.match(b.checkPage(rel, good('/company/').replace('{"@type":"WebPage"}', '{bad')).join(), /JSON-LD/);
  assert.match(b.checkPage(rel, good('/company/').replace('<h1>One', '<h1>{{root}}')).join(), /token/);
  assert.match(b.checkPage(rel, good('/company/').replace('<!-- @cta --><!-- /@cta -->', '')).join(), /cta/);
  assert.match(b.checkPage(rel, good('/company/').replace('<!-- @head --><!-- /@head -->', '')).join(), /@head/);
  assert.match(b.checkPage(rel, good('/company/').replace('<!-- @head --><!-- /@head -->', '').replace('<body>', '<body data-cta="none">')).join(), /@head/);
  assert.deepEqual(b.checkPage(rel, good('/company/').replace('<!-- @cta --><!-- /@cta -->', '').replace('<body>', '<body data-cta="none">')), []);
});

test('checkLinks flags missing files and missing fragments, ignores external links', () => {
  const files = {
    'company/index.html': '<h2 id="journey">J</h2>',
    'assets/css/site.css': '',
  };
  const io = { exists: (f) => f in files, read: (f) => files[f] };
  const html = '<a href="../company/#journey">ok</a><a href="../company/#nope">bad hash</a>' +
    '<a href="../missing/">bad file</a><link href="../assets/css/site.css"><a href="mailto:a@b.c">m</a><a href="https://e.com/">e</a>';
  const errs = b.checkLinks('technology/index.html', html, io);
  assert.equal(errs.length, 2);
  assert.match(errs[0], /#nope/);
  assert.match(errs[1], /missing/);
});

test('sitemap lists absolute URLs without lastmod', () => {
  const xml = b.sitemap(['/', '/company/']);
  assert.match(xml, /<loc>https:\/\/www\.princelubricants\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.princelubricants\.com\/company\/<\/loc>/);
  assert.doesNotMatch(xml, /lastmod/);
});
