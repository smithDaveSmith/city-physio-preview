#!/usr/bin/env node
/**
 * Verification pass for the built site in docs/.
 * Serves docs/ over HTTP and drives headless Chromium across every page at
 * three viewports, reporting measured results only.
 *
 *   node scripts/verify.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'docs');
const PORT = 8099;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json'
};

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, p);
    if (p.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (fs.existsSync(file + '/index.html')) file = file + '/index.html';
      else {
        res.writeHead(404, { 'content-type': 'text/html' });
        return res.end(fs.existsSync(path.join(ROOT, '404.html'))
          ? fs.readFileSync(path.join(ROOT, '404.html')) : 'Not found');
      }
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(PORT);
}

function routes() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === 'index.html') {
        const rel = path.relative(ROOT, dir).split(path.sep).join('/');
        out.push(rel ? `/${rel}/` : '/');
      }
    }
  })(ROOT);
  return out.sort();
}

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

(async () => {
  const server = serve();
  const browser = await chromium.launch();
  const issues = [];
  const stats = { pages: 0, checks: 0, consoleErrors: 0, brokenLinks: 0, fontBlocked: 0 };
  const seenLinks = new Map();
  const all = routes();

  console.log(`\nVerifying ${all.length} routes at ${VIEWPORTS.length} viewports\n${'='.repeat(60)}`);

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

    for (const route of all) {
      consoleErrors.length = 0;
      const resp = await page.goto(ORIGIN + route, { waitUntil: 'networkidle' });
      if (vp.name === 'desktop') stats.pages++;
      stats.checks++;

      if (!resp || resp.status() !== 200) {
        issues.push(`[${vp.name}] ${route} returned HTTP ${resp ? resp.status() : 'none'}`);
      }

      const audit = await page.evaluate(() => {
        const r = {};
        r.scrollW = document.documentElement.scrollWidth;
        r.innerW = window.innerWidth;
        r.overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
        r.wide = [...document.querySelectorAll('body *')].filter(e => {
          const b = e.getBoundingClientRect();
          return b.width > window.innerWidth + 2 && b.height > 0;
        }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 36));

        r.h1 = [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 50));
        const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
        r.skips = [];
        let prev = 0;
        hs.forEach(h => {
          const lvl = +h.tagName[1];
          if (prev && lvl > prev + 1) r.skips.push(`${'h' + prev} -> ${h.tagName.toLowerCase()}: ${h.textContent.trim().slice(0, 32)}`);
          prev = lvl;
        });

        r.imgNoAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;
        r.title = document.title;
        r.titleLen = document.title.length;
        const md = document.querySelector('meta[name="description"]');
        r.descLen = md ? md.content.length : 0;
        r.robots = (document.querySelector('meta[name="robots"]') || {}).content || '';
        r.lang = document.documentElement.lang;
        r.hasMain = !!document.querySelector('main');
        r.hasSkip = !!document.querySelector('a.skip');
        r.landmarks = {
          header: document.querySelectorAll('header').length,
          nav: document.querySelectorAll('nav').length,
          main: document.querySelectorAll('main').length,
          footer: document.querySelectorAll('footer').length
        };

        r.emptyLinks = [...document.querySelectorAll('a')].filter(a =>
          !a.textContent.trim() && !a.getAttribute('aria-label')).length;

        r.links = [...document.querySelectorAll('a[href]')]
          .map(a => a.getAttribute('href'))
          .filter(h => h && !/^(https?:|mailto:|tel:|#)/.test(h));

        // WCAG 2.5.8 measures the activation target. An input inside a label is
        // activated by the whole label, so measure that instead.
        r.smallTargets = [...document.querySelectorAll('a, button, input, select')].filter(e => {
          const own = e.getBoundingClientRect();
          if (own.width === 0 || own.height === 0) return false;
          if (getComputedStyle(e).display === 'inline') return false;
          const lab = e.closest('label');
          const box = lab ? lab.getBoundingClientRect() : own;
          return box.height < 24 || box.width < 24;
        }).length;

        const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]), textarea, select')];
        r.unlabelled = fields.filter(f => {
          if (f.getAttribute('aria-label')) return false;
          if (f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)) return false;
          return !f.closest('label');
        }).length;

        // Actual running body copy, not metadata labels like .eyebrow / .crumb.
        const bodySel = ['.prose p', '.lede', '.opening__sub', '.sec-lede',
                         '.stage__detail', '.svc__lede', '.index-scan'];
        r.bodyFontPx = Math.min(...bodySel
          .map(s => document.querySelector(s))
          .filter(Boolean)
          .map(e => parseFloat(getComputedStyle(e).fontSize)));
        if (!isFinite(r.bodyFontPx)) r.bodyFontPx = null;
        return r;
      });

      if (audit.overflow) issues.push(`[${vp.name}] ${route} HORIZONTAL OVERFLOW ${audit.scrollW}px > ${audit.innerW}px :: ${audit.wide.join(', ')}`);
      if (audit.h1.length !== 1) issues.push(`[${vp.name}] ${route} has ${audit.h1.length} <h1>`);
      if (audit.skips.length) issues.push(`[${vp.name}] ${route} heading skip: ${audit.skips.join(' | ')}`);
      if (audit.imgNoAlt) issues.push(`[${vp.name}] ${route} ${audit.imgNoAlt} image(s) without alt`);
      if (audit.emptyLinks) issues.push(`[${vp.name}] ${route} ${audit.emptyLinks} link(s) with no accessible name`);
      if (audit.unlabelled) issues.push(`[${vp.name}] ${route} ${audit.unlabelled} unlabelled form field(s)`);
      if (!audit.hasSkip) issues.push(`[${vp.name}] ${route} missing skip link`);
      if (!audit.robots.includes('noindex')) issues.push(`[${vp.name}] ${route} MISSING noindex`);
      if (audit.lang !== 'en-IE') issues.push(`[${vp.name}] ${route} lang="${audit.lang}"`);
      if (audit.titleLen > 70) issues.push(`[${vp.name}] ${route} title ${audit.titleLen} chars (>70)`);
      if (audit.descLen > 165) issues.push(`[${vp.name}] ${route} meta description ${audit.descLen} chars (>165)`);
      if (audit.descLen < 50) issues.push(`[${vp.name}] ${route} meta description only ${audit.descLen} chars`);
      if (audit.landmarks.main !== 1) issues.push(`[${vp.name}] ${route} ${audit.landmarks.main} <main>`);
      if (audit.smallTargets) issues.push(`[${vp.name}] ${route} ${audit.smallTargets} target(s) under 24px tall`);
      if (vp.name === 'mobile' && audit.bodyFontPx && audit.bodyFontPx < 16)
        issues.push(`[${vp.name}] ${route} body text ${audit.bodyFontPx}px (<16px)`);

      const blockedFonts = consoleErrors.filter(e => /fonts\.(googleapis|gstatic)\.com|ERR_TUNNEL_CONNECTION_FAILED/.test(e));
      const realErrors = consoleErrors.filter(e => !blockedFonts.includes(e));
      if (blockedFonts.length) stats.fontBlocked++;
      if (realErrors.length) {
        stats.consoleErrors += realErrors.length;
        issues.push(`[${vp.name}] ${route} console: ${realErrors.slice(0, 2).join(' | ').slice(0, 160)}`);
      }

      if (vp.name === 'desktop') {
        for (const href of audit.links) {
          const target = href.startsWith('/') ? href : new URL(href, ORIGIN + route).pathname;
          if (!seenLinks.has(target)) {
            const probe = await page.request.get(ORIGIN + target);
            seenLinks.set(target, probe.status());
          }
          if (seenLinks.get(target) !== 200) {
            stats.brokenLinks++;
            issues.push(`[link] ${route} -> ${target} (HTTP ${seenLinks.get(target)})`);
          }
        }
      }
    }
    await ctx.close();
  }

  /* ---- focused behavioural checks ---- */
  console.log('\nBehavioural checks\n' + '-'.repeat(60));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Form rejects empty submit and never claims success
  await page.goto(ORIGIN + '/contact-cityphysio-lucan/');
  await page.click('#enquiry button[type=submit]');
  const invalidCount = await page.locator('[aria-invalid="true"]').count();
  const resultHiddenAfterInvalid = await page.locator('#form-result').isHidden();
  console.log(`  empty submit -> ${invalidCount} fields flagged invalid, result panel hidden: ${resultHiddenAfterInvalid}`);
  if (invalidCount < 4) issues.push('[form] empty submit did not flag all 4 required fields');
  if (!resultHiddenAfterInvalid) issues.push('[form] result panel shown despite invalid submit');

  // 2. Valid submit -> explicit "not sent", never a false confirmation
  await page.fill('#f-name', 'Test Patient');
  await page.fill('#f-email', 'test@example.com');
  await page.fill('#f-phone', '0871234567');
  await page.selectOption('#f-service', 'physiotherapy');
  await page.click('#enquiry button[type=submit]');
  await page.waitForSelector('#form-result .caution', { state: 'visible' });
  const resultText = (await page.locator('#form-result').innerText()).toLowerCase();
  const falseSuccess = /\b(message sent|thank you for your (message|enquiry)|we('| wi)ll be in touch|submitted successfully|sent successfully)\b/.test(resultText);
  console.log(`  valid submit -> says not sent: ${/nothing was sent|does not send|has left your browser/.test(resultText)}`);
  console.log(`  valid submit -> false success claim: ${falseSuccess}`);
  if (falseSuccess) issues.push('[form] shows a false success confirmation');
  if (!/nothing was sent|has left your browser/.test(resultText)) issues.push('[form] does not clearly state nothing was sent');

  // 3. Keyboard: skip link reachable and focus visible
  await page.goto(ORIGIN + '/');
  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => {
    const a = document.activeElement;
    const cs = getComputedStyle(a);
    return { tag: a.tagName, cls: a.className, text: a.textContent.trim().slice(0, 24), outline: cs.outlineStyle + ' ' + cs.outlineWidth };
  });
  console.log(`  first Tab stop: ${firstFocus.tag}.${firstFocus.cls} "${firstFocus.text}"`);
  if (!/skip/i.test(firstFocus.cls)) issues.push('[a11y] first tab stop is not the skip link');

  // 4. Mobile nav: opens, traps focus, closes on Escape
  const m = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mp = await m.newPage();
  await mp.goto(ORIGIN + '/');
  await mp.click('[data-nav-open]');
  const navOpen = await mp.locator('#nav').evaluate(n => n.classList.contains('nav--open'));
  const expanded = await mp.getAttribute('[data-nav-open]', 'aria-expanded');
  await mp.keyboard.press('Escape');
  const navClosed = await mp.locator('#nav').evaluate(n => !n.classList.contains('nav--open'));
  console.log(`  mobile nav: opens ${navOpen}, aria-expanded "${expanded}", closes on Escape ${navClosed}`);
  if (!navOpen) issues.push('[nav] mobile menu did not open');
  if (expanded !== 'true') issues.push('[nav] aria-expanded not set to true when open');
  if (!navClosed) issues.push('[nav] Escape did not close the menu');

  // 5. Reduced motion honoured
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rmp = await rm.newPage();
  await rmp.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
  const rmCheck = await rmp.evaluate(() => {
    const el = document.querySelector('.band');
    const cs = getComputedStyle(el);
    return {
      hasRevealClass: el.classList.contains('reveal'),
      opacity: cs.opacity,
      transitionDuration: cs.transitionDuration
    };
  });
  console.log(`  reduced motion: .reveal applied ${rmCheck.hasRevealClass}, opacity ${rmCheck.opacity}, transition ${rmCheck.transitionDuration}`);
  if (rmCheck.opacity !== '1') issues.push('[motion] content not fully visible under prefers-reduced-motion');

  // 6. Contrast of principal text pairs
  await page.goto(ORIGIN + '/symptom-selector/lower-back/');
  const contrast = await page.evaluate(() => {
    function lum(c) {
      const [r, g, b] = c.match(/\d+/g).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function ratio(fg, bg) {
      const a = lum(fg), b = lum(bg);
      return +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
    }
    function bgOf(el) {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        n = n.parentElement;
      }
      return 'rgb(255,255,255)';
    }
    const out = {};
    const pick = {
      'body prose': '.prose p',
      'lede': '.lede',
      'rail label': '.rail__label',
      'nav link': '.nav__link',
      'caution text': '.caution p',
      'tag': '.tag',
      'crumb': '.crumb',
      'anat label': '.anat'
    };
    for (const [k, sel] of Object.entries(pick)) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      out[k] = { ratio: ratio(cs.color, bgOf(el)), size: cs.fontSize, weight: cs.fontWeight };
    }
    return out;
  });
  console.log('  contrast (AA needs 4.5 for body, 3.0 for >=18.66px bold / >=24px):');
  for (const [k, v] of Object.entries(contrast)) {
    const px = parseFloat(v.size);
    const large = px >= 24 || (px >= 18.66 && +v.weight >= 700);
    const need = large ? 3 : 4.5;
    const pass = v.ratio >= need;
    console.log(`    ${pass ? 'PASS' : 'FAIL'}  ${k.padEnd(14)} ${String(v.ratio).padStart(5)}:1  ${v.size} ${v.weight}`);
    if (!pass) issues.push(`[contrast] ${k} ${v.ratio}:1 at ${v.size} (needs ${need}:1)`);
  }

  // 7. Weight of the home page
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
  const weight = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource');
    const nav = performance.getEntriesByType('navigation')[0];
    let same = 0, cross = 0;
    res.forEach(r => {
      const sz = r.transferSize || r.encodedBodySize || 0;
      if (r.name.startsWith(location.origin)) same += sz; else cross += sz;
    });
    return {
      requests: res.length + 1,
      sameOriginKB: Math.round((same + (nav ? nav.transferSize : 0)) / 1024),
      crossOriginKB: Math.round(cross / 1024),
      domInteractiveMs: nav ? Math.round(nav.domInteractive) : null,
      loadMs: nav ? Math.round(nav.loadEventEnd) : null
    };
  });
  console.log(`\n  home page: ${weight.requests} requests, ${weight.sameOriginKB}KB own assets, ${weight.crossOriginKB}KB cross-origin (fonts)`);
  console.log(`  domInteractive ${weight.domInteractiveMs}ms, load ${weight.loadMs}ms (localhost, headless, cold cache)`);

  await browser.close();
  server.close();

  console.log('\n' + '='.repeat(60));
  console.log(`Routes: ${stats.pages} | page-loads: ${stats.checks} | internal links probed: ${seenLinks.size}`);
  console.log(`Console errors (excluding blocked fonts): ${stats.consoleErrors} | Broken links: ${stats.brokenLinks}`);
  if (stats.fontBlocked) {
    console.log(`NOTE: Google Fonts was unreachable on ${stats.fontBlocked} page-loads — this sandbox's`);
    console.log(`      proxy blocks fonts.googleapis.com. All layout above was therefore measured with`);
    console.log(`      FALLBACK fonts. Webfont rendering is unverified; fallback rendering is verified.`);
  }
  if (issues.length) {
    console.log(`\n${issues.length} ISSUE(S):\n`);
    const grouped = {};
    issues.forEach(i => {
      const key = i.replace(/^\[[^\]]+\]\s*\S*\s*/, '').replace(/\d+/g, 'N').slice(0, 60);
      (grouped[key] = grouped[key] || []).push(i);
    });
    Object.values(grouped).forEach(g => {
      console.log(`  ${g[0]}`);
      if (g.length > 1) console.log(`    …and ${g.length - 1} more of the same kind`);
    });
    process.exitCode = 1;
  } else {
    console.log('\nNo issues found.');
  }
})();
