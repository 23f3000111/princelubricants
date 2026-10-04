#!/usr/bin/env node
/*
 * Stamps the shared partials into every page, writes sitemap.xml and llms.txt, and
 * checks every page. No dependencies. Run from anywhere:
 *
 *   node tools/build.js           stamp, write, check
 *   node tools/build.js --check   check only, change nothing
 *
 * partials/<name>.html lands between <!-- @name --> and <!-- /@name --> in each page.
 * Inside a partial, {{root}} is the relative path from that page to the site root and
 * {{home}} is its link to the home page. Every link in the site is relative so it runs
 * from a domain, a sub-path or straight off the disk. 404.html is the exception: the
 * host serves it at whatever URL was missed, so only absolute links work there.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.princelubricants.com';
const PARTIALS = ['header', 'footer', 'cta'];
const SKIP_DIRS = new Set(['.git', '.superpowers', 'node_modules', 'docs', 'tools', 'partials', 'assets']);
// A URL scheme (https:, mailto:, tel:, data:) or protocol-relative: not ours to check.
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const NOINDEX = /<meta name="robots" content="[^"]*noindex/;

const isAbsolutePage = (rel) => rel === '404.html';
const depth = (rel) => rel.split('/').length - 1;

function urlFor(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

function rootPrefix(rel) {
  return isAbsolutePage(rel) ? '/' : '../'.repeat(depth(rel));
}

function homeHref(rel) {
  if (isAbsolutePage(rel)) return '/';
  return depth(rel) ? '../'.repeat(depth(rel)) : './';
}

function fill(tpl, ctx) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (token, key) => (key in ctx ? ctx[key] : token));
}

function markCurrent(html, pageUrl) {
  return html.replace(/<a\b([^>]*)>/g, (tag, attrs) => {
    const href = (attrs.match(/\shref="([^"]*)"/) || [])[1];
    if (href === undefined || href.startsWith('#') || EXTERNAL.test(href) || /\saria-current=/.test(attrs)) return tag;
    const url = new URL(href, ORIGIN + pageUrl);
    return url.pathname === pageUrl && !url.hash ? `<a${attrs} aria-current="page">` : tag;
  });
}

function stamp(html, partials, ctx, pageUrl) {
  for (const [name, tpl] of Object.entries(partials)) {
    const block = new RegExp(`<!-- @${name} -->[\\s\\S]*?<!-- /@${name} -->`, 'g');
    const body = markCurrent(fill(tpl, ctx), pageUrl).trim();
    html = html.replace(block, () => `<!-- @${name} -->\n${body}\n<!-- /@${name} -->`);
  }
  return html;
}

function checkPage(rel, html) {
  const errors = [];
  const fail = (msg) => errors.push(`${rel}: ${msg}`);

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`expected exactly one <h1>, found ${h1s}`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail('missing <title>');
  if (!/<meta name="description" content="[^"]+"/.test(html)) fail('missing meta description');

  if (!NOINDEX.test(html)) {
    const want = ORIGIN + urlFor(rel);
    const got = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
    if (got !== want) fail(`canonical is ${got || 'missing'}, expected ${want}`);
  }

  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch (e) { fail(`invalid JSON-LD: ${e.message}`); }
  }

  if (/\{\{\w+\}\}/.test(html)) fail('unfilled {{token}} left in the page');

  const required = /<body[^>]*\sdata-cta="none"/.test(html) ? ['header', 'footer'] : PARTIALS;
  for (const name of required) {
    if (!html.includes(`<!-- @${name} -->`) || !html.includes(`<!-- /@${name} -->`)) {
      fail(`missing the <!-- @${name} --> markers`);
    }
  }
  return errors;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasId = (html, id) => new RegExp(`\\sid="${escapeRe(id)}"`).test(html);

function checkLinks(rel, html, io) {
  const errors = [];
  const pageUrl = urlFor(rel);
  for (const [, ref] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    if (ref === '' || ref === '#' || EXTERNAL.test(ref)) continue;
    if (ref.startsWith('#')) {
      if (!hasId(html, decodeURIComponent(ref.slice(1)))) errors.push(`${rel}: link to missing anchor ${ref}`);
      continue;
    }
    const url = new URL(ref, ORIGIN + pageUrl);
    let file = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (file === '' || file.endsWith('/')) file += 'index.html';
    if (!io.exists(file)) {
      errors.push(`${rel}: broken link ${ref} (no ${file})`);
    } else if (url.hash.length > 1 && file.endsWith('.html') && !hasId(io.read(file), decodeURIComponent(url.hash.slice(1)))) {
      errors.push(`${rel}: link ${ref} points at a missing anchor`);
    }
  }
  return errors;
}

function sitemap(urls) {
  const rows = urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', times: '×', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rarr: '→', middot: '·' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/g, (m, name) => ENTITIES[name] ?? m);

function pageMeta(rel, html) {
  return {
    url: urlFor(rel),
    title: decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || rel),
    description: decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''),
  };
}

function llms(intro, pages) {
  const list = pages.map((p) => `- [${p.title}](${ORIGIN}${p.url}): ${p.description}`).join('\n');
  return `${intro.trim()}\n\n## Pages\n\n${list}\n`;
}

function lengthWarnings(rel, html) {
  const { title, description } = pageMeta(rel, html);
  const out = [];
  if (title.length > 65) out.push(`${rel}: title is ${title.length} chars, search results cut at about 60`);
  if (description.length > 160) out.push(`${rel}: description is ${description.length} chars, results cut at about 155`);
  return out;
}

function findPages(dir = ROOT, base = '') {
  const pages = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) pages.push(...findPages(path.join(dir, entry.name), rel));
    } else if (entry.name === 'index.html' || (entry.name === '404.html' && !base)) {
      pages.push(rel);
    }
  }
  return pages.sort((a, b) => urlFor(a).localeCompare(urlFor(b)));
}

function main(argv) {
  const checkOnly = argv.includes('--check');
  const abs = (rel) => path.join(ROOT, rel);
  const read = (rel) => fs.readFileSync(abs(rel), 'utf8');
  const exists = (rel) => fs.existsSync(abs(rel)) && fs.statSync(abs(rel)).isFile();
  const pages = findPages();
  const errors = [];
  const warnings = [];

  const partials = {};
  if (!checkOnly) for (const name of PARTIALS) partials[name] = read(`partials/${name}.html`);

  for (const rel of pages) {
    let html = read(rel);
    if (!checkOnly) {
      const stamped = stamp(html, partials, { root: rootPrefix(rel), home: homeHref(rel) }, urlFor(rel));
      if (stamped !== html) fs.writeFileSync(abs(rel), stamped);
      html = stamped;
    }
    errors.push(...checkPage(rel, html));
    warnings.push(...lengthWarnings(rel, html));
  }
  for (const rel of pages) errors.push(...checkLinks(rel, read(rel), { exists, read }));

  if (!checkOnly) {
    const indexable = pages.filter((rel) => !NOINDEX.test(read(rel)));
    fs.writeFileSync(abs('sitemap.xml'), sitemap(indexable.map(urlFor)));
    let intro = '# PRINCE LUBRICANTS';
    if (exists('tools/llms-intro.md')) intro = read('tools/llms-intro.md');
    else warnings.push('tools/llms-intro.md is missing, so llms.txt carries the page list only');
    fs.writeFileSync(abs('llms.txt'), llms(intro, indexable.map((rel) => pageMeta(rel, read(rel)))));
  }

  for (const w of warnings) console.warn(`warn   ${w}`);
  for (const e of errors) console.error(`error  ${e}`);
  console.log(`${pages.length} pages, ${errors.length} errors, ${warnings.length} warnings`);
  process.exitCode = errors.length ? 1 : 0;
}

module.exports = { ORIGIN, urlFor, rootPrefix, homeHref, fill, markCurrent, stamp, checkPage, checkLinks, sitemap, llms, pageMeta };

if (require.main === module) main(process.argv.slice(2));
