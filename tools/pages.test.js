'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ignored, rebase, assemble } = require('./pages.js');

const ROOT = path.join(__dirname, '..');

test('rebase puts the project path in front of root-absolute URLs only', () => {
  const html = '<a href="/">Home</a><a href="/products/#marine">M</a><link rel="stylesheet" href="/assets/css/site.css">'
    + '<script src="/assets/js/site.js"></script><div style="background-image: url(\'/assets/img/photo/rig.webp\')"></div>'
    + '<a href="//cdn.example.com/x">cdn</a><a href="https://www.princelubricants.com/">abs</a><a href="#main">skip</a><a href="contact/">rel</a>';
  const out = rebase(html, '/princelubricants');
  assert.match(out, /href="\/princelubricants\/">Home/);
  assert.match(out, /href="\/princelubricants\/products\/#marine"/);
  assert.match(out, /href="\/princelubricants\/assets\/css\/site\.css"/);
  assert.match(out, /src="\/princelubricants\/assets\/js\/site\.js"/);
  assert.match(out, /url\('\/princelubricants\/assets\/img\/photo\/rig\.webp'\)/);
  assert.match(out, /href="\/\/cdn\.example\.com\/x"/);
  assert.match(out, /href="https:\/\/www\.princelubricants\.com\/"/);
  assert.match(out, /href="#main"/);
  assert.match(out, /href="contact\/"/);
});

test('rebase leaves a page alone when the site sits at the domain root', () => {
  const html = '<a href="/company/">C</a>';
  assert.equal(rebase(html, ''), html);
  assert.equal(rebase(html, '/'), html);
});

test('rebase refuses a base that is not a URL path', () => {
  // Git Bash on Windows rewrites a "/repo" argument into "C:/Program Files/Git/repo".
  assert.throws(() => rebase('<a href="/x">x</a>', 'C:/Program Files/Git/princelubricants'), /base path/);
  assert.throws(() => rebase('<a href="/x">x</a>', 'princelubricants'), /base path/);
});

test('ignored reads .vercelignore and always skips the repository machinery', () => {
  const skip = ignored('# a comment\ntools/\npartials/\n\nREADME.md\r\n');
  for (const name of ['tools', 'partials', 'README.md', '.git', '.github', '_site', 'vercel.json', '.vercelignore']) assert.ok(skip.has(name), name);
  assert.ok(!skip.has('# a comment'));
  assert.ok(!skip.has(''));
});

test('assemble copies the deployable files and rebases 404.html alone', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-pages-'));
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  put('.vercelignore', 'tools/\nREADME.md\n');
  put('index.html', '<a href="company/">C</a>');
  put('company/index.html', '<a href="../">H</a>');
  put('404.html', '<a href="/company/">C</a>');
  put('assets/css/site.css', 'body{}');
  put('tools/build.js', '//');
  put('README.md', '# x');
  try {
    const out = path.join(root, '_site');
    assemble(root, out, '/princelubricants');
    const has = (rel) => fs.existsSync(path.join(out, rel));
    assert.ok(has('index.html') && has('company/index.html') && has('assets/css/site.css'));
    assert.ok(!has('tools') && !has('README.md') && !has('.vercelignore') && !has('_site'));
    assert.equal(fs.readFileSync(path.join(out, '404.html'), 'utf8'), '<a href="/princelubricants/company/">C</a>');
    assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), '<a href="company/">C</a>');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('outside 404.html the site has no root-absolute URLs, so it also works under /<repo>/', () => {
  const skip = ignored(fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8'));
  const ROOT_ABSOLUTE = /(?:\s(?:href|src|action)="|url\(['"]?|"(?:src|start_url)":\s*")\/(?!\/)[^"')]*/g;
  const offenders = [];
  const walk = (dir, top) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (top && skip.has(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file, false);
      else if (/\.(?:html|css|webmanifest)$/.test(entry.name) && !(top && entry.name === '404.html')) {
        for (const [hit] of fs.readFileSync(file, 'utf8').matchAll(ROOT_ABSOLUTE)) offenders.push(`${path.relative(ROOT, file)}: ${hit}`);
      }
    }
  };
  walk(ROOT, true);
  assert.deepEqual(offenders, []);
});
