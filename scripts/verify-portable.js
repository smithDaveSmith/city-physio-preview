#!/usr/bin/env node
/**
 * Portability check.
 *
 * Serves docs/ under an arbitrary path prefix the build has never seen and
 * crawls every page, confirming the stylesheet actually applies and that no
 * internal link 404s. This is what stops a repository rename from silently
 * breaking the whole site.
 *
 *   node scripts/verify-portable.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'docs');
const PORT = 8110;
const PREFIX = '/a-name-this-build-has-never-seen';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.png': 'image/png'
};

const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (!u.startsWith(PREFIX)) { r.writeHead(404); return r.end('outside prefix'); }
  u = u.slice(PREFIX.length) || '/';
  let f = path.join(ROOT, u);
  if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('missing: ' + u); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
}).listen(PORT);

function routes() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name === 'index.html') {
        const rel = path.relative(ROOT, d).split(path.sep).join('/');
        out.push(rel ? `/${rel}/` : '/');
      }
    }
  })(ROOT);
  return out.sort();
}

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await c.newPage();
  const failed = [];
  const probed = new Set();
  let cssOk = 0;
  const all = routes();

  for (const rt of all) {
    const resp = await pg.goto(`http://127.0.0.1:${PORT}${PREFIX}${rt}`, { waitUntil: 'networkidle' });
    if (!resp || resp.status() !== 200) { failed.push(`PAGE ${rt} -> ${resp && resp.status()}`); continue; }

    const r = await pg.evaluate(() => ({
      // A 404'd stylesheet yields no cssRules — this is the real test.
      sheet: [...document.styleSheets].some(s => s.href && s.href.includes('site.css') && s.cssRules && s.cssRules.length > 0),
      links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin))
    }));

    if (r.sheet) cssOk++; else failed.push(`CSS NOT APPLIED on ${rt}`);

    for (const abs of r.links) {
      if (probed.has(abs)) continue;
      probed.add(abs);
      const pr = await pg.request.get(abs);
      if (pr.status() !== 200) failed.push(`LINK ${rt} -> ${abs.replace(`http://127.0.0.1:${PORT}`, '')} (${pr.status()})`);
    }
  }

  console.log(`\nServed under "${PREFIX}"`);
  console.log(`Pages: ${all.length} | CSS applied on: ${cssOk}/${all.length} | links probed: ${probed.size}`);
  console.log(failed.length
    ? `\nFAILURES (${failed.length}):\n` + failed.slice(0, 12).join('\n')
    : '\nNo failures — the build is base-independent.');

  await b.close();
  srv.close();
  if (failed.length) process.exitCode = 1;
})();
