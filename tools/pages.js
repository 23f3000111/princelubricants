#!/usr/bin/env node
/*
 * Assembles the GitHub Pages copy of the site in a folder of its own. No dependencies.
 *
 *   node tools/pages.js _site /princelubricants
 *
 * GitHub serves a project site under /<repo>/, not at the domain root. Every page links
 * relatively, so the pages work there unchanged. 404.html is the exception: the host
 * serves it at whatever URL was missed, so its links are root-absolute (see build.js),
 * and in this copy they gain the project path. Whatever .vercelignore keeps out of a
 * deployment stays out of this one too.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ALWAYS_SKIP = ['.git', '.github', '.superpowers', 'node_modules', '_site', '.vercelignore', 'vercel.json'];

// .vercelignore lists top-level names, folders with a trailing slash.
function ignored(text) {
  const listed = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  return new Set([...ALWAYS_SKIP, ...listed.map((line) => line.replace(/\/+$/, ''))]);
}

// Root-absolute URLs ("/x", never protocol-relative "//host") gain the base path.
function rebase(html, base) {
  if (base && !base.startsWith('/')) throw new Error(`base path must be empty or start with "/", got "${base}"`);
  const prefix = base.replace(/\/+$/, '');
  if (!prefix) return html;
  return html
    .replace(/(\s(?:href|src|action)=")\/(?!\/)/g, `$1${prefix}/`)
    .replace(/(url\(['"]?)\/(?!\/)/g, `$1${prefix}/`);
}

function assemble(root, out, base) {
  const ignoreFile = path.join(root, '.vercelignore');
  const skip = ignored(fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : '');
  const inside = path.relative(root, out);
  if (inside && !inside.startsWith('..') && !path.isAbsolute(inside)) skip.add(inside.split(path.sep)[0]);

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(root)) {
    if (!skip.has(entry)) fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
  }
  const notFound = path.join(out, '404.html');
  if (fs.existsSync(notFound)) fs.writeFileSync(notFound, rebase(fs.readFileSync(notFound, 'utf8'), base));
}

function main([out = '_site', base = '']) {
  const root = path.resolve(__dirname, '..');
  const dest = path.resolve(root, out);
  assemble(root, dest, base);
  console.log(`assembled ${path.relative(root, dest) || dest} for base "${base || '/'}"`);
}

module.exports = { ignored, rebase, assemble };

if (require.main === module) main(process.argv.slice(2));
