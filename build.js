#!/usr/bin/env node
/**
 * CityPhysio redesign concept — static site generator.
 *
 * Zero runtime dependencies. Reads JSON from src/data, writes static HTML to docs/.
 * Output is plain HTML/CSS/JS and works on GitHub Pages with no build step on CI.
 *
 *   node build.js                     -> builds for a root-hosted site ("/")
 *   BASE=/cityphysio-concept node build.js   -> builds for a GitHub project page
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const DATA = path.join(ROOT, 'src', 'data');

const BASE = (process.env.BASE || '').replace(/\/$/, '');
const SITE_ORIGIN = process.env.SITE_ORIGIN || '';

const site = read('site.json');
const regionsData = read('regions.json');
const servicesData = read('services.json');
const teamData = read('team.json');
const plates = read('plates.json');

const REGIONS = regionsData.regions;
const GROUPS = regionsData.groups;
const SERVICES = servicesData.services;
const TEAM = teamData.team;

function read(f) { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); }
function clampDesc(s, max = 158) {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '') + '\u2026';
}
function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Depth of the page currently being generated, counted in path segments.
// Set by emit() before each page so url() can return a relative path.
let DEPTH = 0;
let ABSOLUTE = false; // 404.html must use absolute paths — see emit()

function url(p) {
  if (/^(https?:|mailto:|tel:|#)/.test(p)) return p;
  const clean = p.startsWith('/') ? p.slice(1) : p;

  // 404.html is served for arbitrary missing paths, so relative links from it
  // would resolve against the requested URL rather than the file's location.
  if (ABSOLUTE) return (BASE + '/' + clean).replace(/\/+$/, '/') || '/';

  // Relative: the site is portable to any base path with no rebuild.
  const prefix = DEPTH === 0 ? './' : '../'.repeat(DEPTH);
  return clean === '' ? prefix : prefix + clean;
}

/* ---------------------------------------------------------------- paths -- */

const PATHS = {
  home: '/',
  about: '/about-cityphysio-lucan/',
  services: '/services-at-cityphysio-lucan/',
  service: s => `/services-at-cityphysio-lucan/${s}/`,
  symptoms: '/symptom-selector/',
  region: s => `/symptom-selector/${s}/`,
  approach: '/the-cityphysio-approach-to-treatment/',
  pilates: '/pilates-classes-at-city-physio-lucan/',
  contact: '/contact-cityphysio-lucan/',
  bookings: '/bookings/',
  downloads: '/downloads/',
  blog: '/blog/',
  privacy: '/privacy-cookies-policy/',
  safeguarding: '/child-safeguarding-statement/',
  patientPrivacy: '/patient-privacy-document/'
};

const NAV = [
  { label: 'Where it hurts', href: PATHS.symptoms },
  { label: 'Services', href: PATHS.services },
  { label: 'How we work', href: PATHS.approach },
  { label: 'The team', href: PATHS.about },
  { label: 'Contact', href: PATHS.contact }
];

/* ------------------------------------------------------------- partials -- */

const wordmark = (cls = '') => `
<a class="wordmark-wrap ${cls}" href="${url(PATHS.home)}">
  <span class="wordmark" aria-label="CityPhysio, Chartered Physiotherapy">
    <span class="wordmark__city">City</span><span class="wordmark__physio">physio</span>
  </span>
  <span class="wordmark__rule">Chartered Physiotherapy</span>
</a>`;

function masthead(current) {
  return `
<div class="concept-banner">
  <div class="shell">
    <span><strong>Unofficial redesign concept.</strong> Not the live site &mdash;
    visit <a href="https://www.cityphysio.ie/">cityphysio.ie</a> to book.</span>
  </div>
</div>

<header class="masthead">
  <div class="shell masthead__inner">
    ${wordmark()}
    <nav class="nav" id="nav" aria-label="Main">
      <button class="nav-close" type="button" data-nav-close aria-label="Close menu">&times;</button>
      <ul class="nav__list">
        ${NAV.map(i => `<li><a class="nav__link" href="${url(i.href)}"${current === i.href ? ' aria-current="page"' : ''}>${i.label}</a></li>`).join('\n        ')}
      </ul>
      <div class="nav__cta">
        <a class="btn btn--primary" href="${url(PATHS.bookings)}">Book online</a>
        <a class="btn btn--ghost" href="${site.phoneHref}">Call ${esc(site.phoneDisplay)}</a>
      </div>
    </nav>
    <div class="masthead__actions">
      <a class="phone-link" href="${site.phoneHref}">${esc(site.phoneDisplay)}</a>
      <a class="btn btn--primary btn--sm" href="${url(PATHS.bookings)}">Book online</a>
      <button class="menu-toggle" type="button" data-nav-open aria-expanded="false" aria-controls="nav">Menu</button>
    </div>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="shell">
    <div class="footer__grid">
      <div>
        ${wordmark()}
        <address style="margin-top:var(--s5)">
          ${esc(site.address.street)}<br>
          ${esc(site.address.locality)}, ${esc(site.address.region)}<br>
          ${esc(site.address.postalCode)}<br>
          <a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a><br>
          <a href="mailto:${site.email}">${esc(site.email)}</a>
        </address>
      </div>
      <div>
        <h2 class="footer__head">Patients</h2>
        <ul class="footer__list">
          <li><a href="${url(PATHS.symptoms)}">Where does it hurt?</a></li>
          <li><a href="${url(PATHS.services)}">Services</a></li>
          <li><a href="${url(PATHS.approach)}">How we work</a></li>
          <li><a href="${url(PATHS.bookings)}">Book an appointment</a></li>
          <li><a href="${url(PATHS.downloads)}">Downloads</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer__head">Clinic</h2>
        <ul class="footer__list">
          <li><a href="${url(PATHS.about)}">About &amp; team</a></li>
          <li><a href="${url(PATHS.pilates)}">Pilates classes</a></li>
          <li><a href="${url(PATHS.service('corporate-services'))}">For employers</a></li>
          <li><a href="${url(PATHS.contact)}">Contact &amp; directions</a></li>
          <li><a href="${url(PATHS.blog)}">News</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer__head">Opening hours</h2>
        <ul class="footer__list">
          ${site.hours.map(h => `<li>${esc(h.days)}<br><span style="color:#fff">${esc(h.open)}&ndash;${esc(h.close)}</span></li>`).join('\n          ')}
        </ul>
        <h2 class="footer__head" style="margin-top:var(--s5)">Follow</h2>
        <ul class="footer__list">
          <li><a href="${site.social.facebook}" rel="noopener">Facebook</a></li>
          <li><a href="${site.social.instagram}" rel="noopener">Instagram</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__legal">
      <span>${esc(site.legalName)}. Registered in Ireland No. ${esc(site.companyNumber)}.</span>
      <span>
        <a href="${url(PATHS.privacy)}">Privacy &amp; Cookies</a> &nbsp;&middot;&nbsp;
        <a href="${url(PATHS.safeguarding)}">Child Safeguarding</a> &nbsp;&middot;&nbsp;
        <a href="${url(PATHS.patientPrivacy)}">Patient Privacy</a>
      </span>
    </div>
  </div>
</footer>`;
}

/* The one place the clinic's safety position is stated. Wording follows HSE/NHS
   public guidance; it is flagged in the README for clinical sign-off. */
function cautionPanel(extra) {
  return `
<aside class="caution" role="note" aria-labelledby="caution-t">
  <h2 class="caution__title" id="caution-t">When not to wait for physiotherapy</h2>
  <p>${extra ? esc(extra) + ' ' : ''}Some symptoms need urgent medical assessment rather than physiotherapy &mdash;
  including loss of bladder or bowel control, numbness around the groin or inner thighs, weakness in both legs,
  severe pain following a significant injury, or pain alongside fever or unexplained weight loss.
  Contact your GP or an emergency department first.</p>
  <p>If you are not sure, call us on <a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a> and we will tell you
  honestly whether we are the right people to see.</p>
  <span class="caution__src">General safety guidance, consistent with HSE and NHS public advice. Not a diagnosis.</span>
</aside>`;
}

function ctaBand() {
  return `
<section class="band band--deep">
  <div class="shell cta-split">
    <div>
      <p class="eyebrow" style="color:var(--ink-inverse-soft)">Next step</p>
      <h2 class="cta-title">Book an appointment, or ask us first.</h2>
      <p style="color:var(--ink-inverse-soft);margin-top:var(--s4);max-width:46ch">
        You do not need a GP referral to see a chartered physiotherapist. If you are not sure
        whether physiotherapy is right for your problem, call &mdash; we would rather tell you now than
        take an appointment you do not need.
      </p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:var(--s3)">
      <a class="btn btn--onDark" href="${url(PATHS.bookings)}">Book online</a>
      <a class="btn btn--ghostOnDark" href="${site.phoneHref}">Call ${esc(site.phoneDisplay)}</a>
      <a class="btn btn--ghostOnDark" href="${url(PATHS.contact)}">Request a callback</a>
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- shell -- */

function page({ title, description, current, body, bodyClass = '', jsonld = null, canonical = '' }) {
  const fullTitle = `${title} — CityPhysio, Lucan`;
  return `<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(clampDesc(description))}">

<!-- Concept preview: deliberately excluded from search indexing. -->
<meta name="robots" content="noindex, nofollow">
${canonical && SITE_ORIGIN ? `<link rel="canonical" href="${SITE_ORIGIN}${canonical}">` : ''}

<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(clampDesc(description))}">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_IE">

<meta name="theme-color" content="#0a1628">
<link rel="icon" href="${url('/assets/img/favicon.svg')}" type="image/svg+xml">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${url('/assets/css/site.css')}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
${masthead(current)}
<main id="main">
${body}
</main>
${footer()}
<script src="${url('/assets/js/site.js')}" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------ structured -- */

const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'Physiotherapy',
  name: site.name,
  legalName: site.legalName,
  description: site.tagline,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country
  },
  telephone: '+353 1 628 0855',
  email: site.email,
  url: SITE_ORIGIN || undefined,
  openingHours: site.hours.map(h => h.schema),
  sameAs: [site.social.facebook, site.social.instagram],
  medicalSpecialty: 'Physiotherapy',
  availableService: SERVICES.map(s => ({ '@type': 'MedicalTherapy', name: s.title }))
};

/* ---------------------------------------------------------------- pages -- */

function homePage() {
  const featured = SERVICES.filter(s => s.featured);
  const keyed = plates.keys.map(k => {
    const r = REGIONS.find(x => x.slug === k.slug);
    return r ? { ...k, title: r.title, scan: r.scan } : null;
  }).filter(Boolean);

  const body = `
<section class="atlas">
  <div class="shell">
    <div class="atlas__top">
      <div>
        <p class="plate-no">Plate 01 &middot; Regions treated</p>
        <h1 class="atlas__statement">Tell us where it hurts.<br>We&rsquo;ll tell you <em>what is wrong</em>.</h1>
        <p class="atlas__sub">
          Chartered physiotherapy on Main Street in Lucan. Seven physiotherapists,
          hands-on treatment, and a straight answer about what is going on &mdash;
          including when the answer is that you need someone else.
        </p>
        <div class="atlas__actions">
          <a class="btn btn--onDark" href="${url(PATHS.bookings)}">Book online</a>
          <a class="btn btn--ghostOnDark" href="${site.phoneHref}">${esc(site.phoneDisplay)}</a>
        </div>
      </div>
      <figure class="atlas__figure" style="margin:0">
        ${plates.figure}
        <figcaption class="fig-cap" style="margin-top:var(--s4)">
          Fig. 1 &mdash; The ${keyed.length} regions treated at CityPhysio, keyed to the index below.
        </figcaption>
      </figure>
    </div>

    <div class="key" id="where">
      <div class="key__head">
        <h2 class="key__title">Key to the figure</h2>
        <p class="key__count">${keyed.length} regions &middot; each written by the physiotherapists who treat them</p>
      </div>
      <ul class="key__list">
        ${keyed.map(k => `
        <li class="key-item" data-k="${k.n}">
          <a class="key-link" href="${url(PATHS.region(k.slug))}">
            <span class="key-n" aria-hidden="true">${String(k.n).padStart(2, '0')}</span>
            <span>
              <span class="key-name">${esc(k.title)}</span>
              <span class="key-scan">${esc(k.scan)}</span>
            </span>
          </a>
        </li>`).join('')}
      </ul>
    </div>
  </div>
</section>

<section class="band">
  <div class="shell">
    <div class="sec-head">
      <p class="plate-no">Plate 02 &middot; What we promise</p>
      <h2 class="sec-title">Three promises</h2>
      <p class="sec-lede">The clinic&rsquo;s own words, carried over unchanged.</p>
    </div>
    <div class="stages">
      ${site.promises.map((p, i) => `
      <article class="stage">
        <span class="stage__n" aria-hidden="true">0${i + 1}</span>
        <div><h3 class="stage__title">${esc(p.split('.')[0])}.</h3></div>
        <p class="stage__detail">${esc(p)}</p>
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="band band--sunk">
  <div class="shell">
    <div class="sec-head">
      <p class="plate-no">Plate 03 &middot; Method</p>
      <h2 class="sec-title">How we work</h2>
      <p class="sec-lede">Three stages, applied to every condition we treat.</p>
    </div>
    <div class="stages">
      ${site.approach.map(st => `
      <article class="stage">
        <span class="stage__n" aria-hidden="true">${st.n}</span>
        <div>
          <h3 class="stage__title">${esc(st.title)}</h3>
          <p class="stage__summary">${esc(st.summary)}</p>
        </div>
        <p class="stage__detail">${esc(st.detail)}</p>
      </article>`).join('')}
    </div>
    <p style="margin-top:var(--s6)"><a class="btn btn--ghost" href="${url(PATHS.approach)}">More about our approach</a></p>
  </div>
</section>

<section class="band">
  <div class="shell">
    <div class="sec-head">
      <p class="plate-no">Plate 04 &middot; Services</p>
      <h2 class="sec-title">What we treat</h2>
      <p class="sec-lede">Nine services, from general musculoskeletal physiotherapy to specialist pelvic health and on-site occupational health.</p>
    </div>
    <div class="svc-list">${featured.map(s => serviceRow(s, 3)).join('')}</div>
    <p style="margin-top:var(--s6)"><a class="btn btn--ghost" href="${url(PATHS.services)}">All ${SERVICES.length} services</a></p>
  </div>
</section>

<section class="band band--sunk">
  <div class="shell">
    <div class="sec-head">
      <p class="plate-no">Plate 05 &middot; Practical</p>
      <h2 class="sec-title">Practical things</h2>
      <p class="sec-lede">The answers people ring up to ask.</p>
    </div>
    <div class="facts">
      <div class="fact">
        <p class="fact__label">Do I need a referral?</p>
        <p class="fact__value">No. You can refer yourself. We also accept GP and consultant referrals.</p>
      </div>
      <div class="fact">
        <p class="fact__label">Where</p>
        <p class="fact__value">${esc(site.address.street)}, ${esc(site.address.locality)}</p>
      </div>
      <div class="fact">
        <p class="fact__label">Opening hours</p>
        <p class="fact__value">${site.hours.map(h => `${esc(h.days)} ${esc(h.open)}&ndash;${esc(h.close)}`).join('<br>')}</p>
      </div>
      <div class="fact">
        <p class="fact__label">Phone</p>
        <p class="fact__value"><a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a></p>
      </div>
    </div>
    <div style="margin-top:var(--s7);display:grid;gap:var(--s7);grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      <div>
        <p class="eyebrow">Health insurance</p>
        <div class="insurers">${site.insurers.map(i => `<span class="insurer">${esc(i)}</span>`).join('')}</div>
        <p style="margin-top:var(--s4);font-size:16px;color:var(--ink-soft)">${esc(site.insurersNote)}</p>
      </div>
      <div>
        <p class="eyebrow">Professional standards</p>
        <p style="font-size:17px;color:var(--ink-soft);max-width:44ch">
          Treatment is provided only by chartered physiotherapists. The clinic is associated with the
          <a href="${site.professionalBody.url}" rel="noopener">${esc(site.professionalBody.name)}</a>,
          and Clinic Director Margaret Hanlon acts as an expert witness for the Society.
        </p>
      </div>
    </div>
  </div>
</section>

${ctaBand()}`;

  return page({
    title: 'Chartered Physiotherapy in Lucan',
    description: `Chartered physiotherapy in Lucan village, Co. Dublin. Back and neck pain, sports injuries, tendon problems and pelvic health. Self-referral welcome.`,
    current: PATHS.home,
    canonical: '/',
    jsonld: localBusiness,
    body
  });
}

function symptomIndexMarkup(limited = false, hl = 3) {
  const groups = limited ? GROUPS.slice(0, 5) : GROUPS;
  return groups.map(g => {
    let items = REGIONS.filter(r => r.group === g.id);
    if (limited) items = items.slice(0, 2);
    if (!items.length) return '';
    return `
    <div class="index-group">
      <h${hl} class="index-group__title">${esc(g.title)}</h${hl}>
      <ul class="index-list">
        ${items.map(r => `
        <li class="index-item">
          <a class="index-link" href="${url(PATHS.region(r.slug))}">
            <span class="index-n" aria-hidden="true">${String(REGIONS.indexOf(r) + 1).padStart(2, '0')}</span>
            <span>
              <span class="index-name">${esc(r.title)}</span>
              <span class="index-scan">${esc(r.scan)}</span>
            </span>
            <span class="index-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </li>`).join('')}
      </ul>
    </div>`;
  }).join('');
}

function serviceRow(s, hl = 3) {
  return `
      <a class="svc" href="${url(PATHS.service(s.slug))}">
        <span class="svc__n">${esc(s.n)}</span>
        <h${hl} class="svc__title">${esc(s.title)}</h${hl}>
        <p class="svc__lede">${esc(s.lede)}</p>
        <span class="svc__go" aria-hidden="true">&rarr;</span>
      </a>`;
}

function symptomsPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / Where it hurts</p>
  <h1 class="page-title">Where does it hurt?</h1>
  <p class="lede">
    ${REGIONS.length} body regions, written by the physiotherapists who treat them. Pick the one
    closest to your symptoms to understand what is likely going on, what usually causes it,
    and what treatment involves.
  </p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="ref">
    <div class="ref__body">
      ${symptomIndexMarkup(false, 2)}
    </div>
    <aside class="rail">
      <div class="rail__block">
        <p class="rail__label">Not sure which?</p>
        <p style="font-size:15px;color:var(--ink-soft)">
          Ring the clinic and describe it in your own words. Reception will match you to the right
          physiotherapist &mdash; or tell you if we are not the right people.
        </p>
        <p style="margin-top:var(--s4)">
          <a class="btn btn--ghost btn--sm" href="${site.phoneHref}">${esc(site.phoneDisplay)}</a>
        </p>
      </div>
      <div class="rail__block">
        <p class="rail__label">This is not a diagnosis</p>
        <p style="font-size:15px;color:var(--ink-soft)">
          These pages explain what we commonly see. They cannot tell you what is wrong with you
          &mdash; that takes an assessment.
        </p>
      </div>
    </aside>
  </div>

  <div style="margin-top:var(--s8);max-width:760px">
    ${cautionPanel()}
  </div>
</div>

${ctaBand()}`;

  return page({
    title: 'Where does it hurt? Symptom guide',
    description: `A guide to ${REGIONS.length} body regions, written by the chartered physiotherapists at CityPhysio in Lucan, Co. Dublin.`,
    current: PATHS.symptoms,
    canonical: PATHS.symptoms,
    body
  });
}

function regionPage(r, i) {
  const group = GROUPS.find(g => g.id === r.group);
  const prev = REGIONS[i - 1];
  const next = REGIONS[i + 1];
  const svcs = (r.services || []).map(sl => SERVICES.find(s => s.slug === sl)).filter(Boolean);

  const body = `
<div class="shell page-head">
  <p class="crumb">
    <a href="${url(PATHS.home)}">Home</a> /
    <a href="${url(PATHS.symptoms)}">Where it hurts</a> /
    ${esc(group ? group.title : '')}
  </p>
  <p class="anat">${esc(r.anatomical)}</p>
  <h1 class="page-title" style="margin-top:var(--s3)">${esc(r.title)}</h1>
  <p class="lede">${esc(r.intro)}</p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="ref">
    <div class="ref__body">
      <div class="prose">
        ${r.body.map(p => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>

      ${r.ruleOut ? `
      <div class="form-note" style="border-left-color:var(--brand-green)">
        <strong>What it probably isn&rsquo;t.</strong> ${esc(r.ruleOut)}
      </div>` : ''}

      ${cautionPanel(r.redFlag)}

      <div>
        <p class="eyebrow">What we see under this heading</p>
        <ul class="tags">
          ${r.alsoCovers.map(t => `<li class="tag">${esc(t)}</li>`).join('\n          ')}
        </ul>
      </div>

      <div style="padding-top:var(--s5);border-top:1px solid var(--rule)">
        <h2 style="font-size:22px">What happens if you book</h2>
        <p style="margin-top:var(--s3);color:var(--ink-soft);max-width:56ch">
          Every appointment starts with assessment, not treatment. Your physiotherapist takes a
          history, examines you, and then tells you what is wrong, what treatment is needed and
          roughly how many sessions it should take.
        </p>
        <p style="margin-top:var(--s4)">
          <a class="btn btn--primary" href="${url(PATHS.bookings)}">Book an appointment</a>
          <a class="btn btn--ghost" href="${url(PATHS.approach)}" style="margin-left:var(--s2)">How we work</a>
        </p>
      </div>
    </div>

    <aside class="rail">
      ${plates.details[r.slug] ? `
      <figure class="rail__plate" style="margin:0 0 var(--s5)">
        <p class="plate-no">Fig. ${i + 1}</p>
        ${plates.details[r.slug]}
        <figcaption>${esc(r.anatomical)}</figcaption>
      </figure>` : ''}
      <div class="rail__block">
        <p class="rail__label">Treated through</p>
        <ul class="rail__list">
          ${svcs.map(s => `<li><a href="${url(PATHS.service(s.slug))}">${esc(s.title)}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div class="rail__block">
        <p class="rail__label">Book or ask</p>
        <ul class="rail__list">
          <li><a href="${url(PATHS.bookings)}">Book online</a></li>
          <li><a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a></li>
          <li><a href="mailto:${site.email}">${esc(site.email)}</a></li>
        </ul>
      </div>
      <div class="rail__block">
        <p class="rail__label">Referral</p>
        <p style="font-size:14.5px;color:var(--ink-soft)">
          No GP referral needed. We also accept referrals from GPs and consultants.
        </p>
      </div>
    </aside>
  </div>

  <nav class="pager" aria-label="More regions">
    ${prev ? `<a href="${url(PATHS.region(prev.slug))}"><span class="pager__dir">Previous</span><span class="pager__name">${esc(prev.title)}</span></a>` : `<a href="${url(PATHS.symptoms)}"><span class="pager__dir">Index</span><span class="pager__name">All regions</span></a>`}
    ${next ? `<a href="${url(PATHS.region(next.slug))}"><span class="pager__dir">Next</span><span class="pager__name">${esc(next.title)}</span></a>` : `<a href="${url(PATHS.symptoms)}"><span class="pager__dir">Index</span><span class="pager__name">All regions</span></a>`}
  </nav>
</div>`;

  return page({
    title: `${r.title} pain — physiotherapy`,
    description: `How our chartered physiotherapists in Lucan, Co. Dublin assess and treat ${r.title.toLowerCase()} problems. ${r.scan}.`,
    current: PATHS.symptoms,
    canonical: PATHS.region(r.slug),
    body
  });
}

function servicesPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / Services</p>
  <h1 class="page-title">Services</h1>
  <p class="lede">
    We don&rsquo;t treat a list of medical conditions. We treat people with aches, pains, injuries
    and movement problems &mdash; through these ${SERVICES.length} services.
  </p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="svc-list">
    ${SERVICES.map(s => serviceRow(s, 2)).join('')}
  </div>
</div>

${ctaBand()}`;

  return page({
    title: 'Physiotherapy services',
    description: `Physiotherapy, tendon clinic and shockwave, sports physio, Pilates, women's health, acupuncture and on-site corporate services in Lucan.`,
    current: PATHS.services,
    canonical: PATHS.services,
    body
  });
}

function servicePage(s) {
  const relatedRegions = REGIONS.filter(r => (r.services || []).includes(s.slug));
  const parent = s.partOf ? SERVICES.find(x => x.slug === s.partOf) : null;
  const children = SERVICES.filter(x => x.partOf === s.slug);

  const body = `
<div class="shell page-head">
  <p class="crumb">
    <a href="${url(PATHS.home)}">Home</a> /
    <a href="${url(PATHS.services)}">Services</a>
    ${parent ? ` / <a href="${url(PATHS.service(parent.slug))}">${esc(parent.title)}</a>` : ''}
  </p>
  <p class="anat">Service ${esc(s.n)}</p>
  <h1 class="page-title" style="margin-top:var(--s3)">${esc(s.title)}</h1>
  <p class="lede">${esc(s.lede)}</p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="ref">
    <div class="ref__body">
      <div class="prose">
        ${s.body.map(p => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>

      ${s.treats ? `
      <div style="padding-top:var(--s5);border-top:1px solid var(--rule)">
        <h2 style="font-size:20px;margin-bottom:var(--s4)">Used for</h2>
        <ul class="tags">
          ${s.treats.map(t => `<li class="tag">${esc(t)}</li>`).join('\n          ')}
        </ul>
      </div>` : ''}

      ${s.points ? `
      <div style="padding-top:var(--s5);border-top:1px solid var(--rule)">
        <h2 style="font-size:20px;margin-bottom:var(--s4)">What it involves</h2>
        <ul class="member__spec" style="max-width:56ch">
          ${s.points.map(p => `<li style="font-size:16px;padding-block:6px">${esc(p)}</li>`).join('\n          ')}
        </ul>
      </div>` : ''}

      ${s.booking ? `<div class="form-note">${esc(s.booking)}</div>` : ''}

      ${children.length ? `
      <div style="padding-top:var(--s5);border-top:1px solid var(--rule)">
        <h2 style="font-size:20px;margin-bottom:var(--s4)">Part of this service</h2>
        <div class="svc-list">${children.map(c => serviceRow(c, 3)).join('')}</div>
      </div>` : ''}

      <div style="padding-top:var(--s5);border-top:1px solid var(--rule)">
        <p style="margin-bottom:var(--s4)">
          <a class="btn btn--primary" href="${url(PATHS.bookings)}">Book online</a>
          <a class="btn btn--ghost" href="${site.phoneHref}" style="margin-left:var(--s2)">Call ${esc(site.phoneDisplay)}</a>
        </p>
      </div>
    </div>

    <aside class="rail">
      ${s.price ? `
      <div class="rail__block">
        <p class="rail__label">Price</p>
        <p style="font-size:15px;color:var(--ink-soft)">${esc(s.price)}</p>
      </div>` : ''}
      ${relatedRegions.length ? `
      <div class="rail__block">
        <p class="rail__label">Commonly used for</p>
        <ul class="rail__list">
          ${relatedRegions.slice(0, 8).map(r => `<li><a href="${url(PATHS.region(r.slug))}">${esc(r.title)}</a></li>`).join('\n          ')}
        </ul>
      </div>` : ''}
      <div class="rail__block">
        <p class="rail__label">Health insurance</p>
        <p style="font-size:14.5px;color:var(--ink-soft)">
          ${site.insurers.join(', ')}. Cover varies by policy &mdash; check with your insurer first.
        </p>
      </div>
    </aside>
  </div>
</div>`;

  return page({
    title: s.title,
    description: `${s.lede} At CityPhysio, chartered physiotherapists in Lucan, Co. Dublin.`,
    current: PATHS.services,
    canonical: PATHS.service(s.slug),
    body
  });
}

function approachPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / How we work</p>
  <h1 class="page-title">How we work</h1>
  <p class="lede">
    We adopt a three-stage, hands-on approach to the management of all conditions.
    The order matters: nothing is treated before it is understood.
  </p>
</div>

<div class="shell" style="padding-bottom:var(--s8)">
  <div class="stages">
    ${site.approach.map(st => `
    <article class="stage">
      <span class="stage__n" aria-hidden="true">${st.n}</span>
      <div>
        <h2 class="stage__title">${esc(st.title)}</h2>
        <p class="stage__summary">${esc(st.summary)}</p>
      </div>
      <p class="stage__detail">${esc(st.detail)}</p>
    </article>`).join('')}
  </div>
</div>

<section class="band band--sunk">
  <div class="shell">
    <div class="sec-head">
      <p class="plate-no">Plate 02 &middot; First visit</p>
      <div>
        <h2 class="sec-title">Your first appointment</h2>
        <p class="sec-lede">What to expect, and what to bring.</p>
      </div>
    </div>
    <div class="ref">
      <div class="ref__body">
        <div class="prose">
          <p>Your first appointment is an assessment. Your physiotherapist will ask you about the
          history of the problem &mdash; when it started, what makes it better and worse, what you need
          to get back to &mdash; and then examine you physically.</p>
          <p>At the end of it you will be told the diagnosis, what treatment is required, the expected
          outcome, and the likely number of sessions. If physiotherapy is not the answer, we will say
          so and arrange a referral to the relevant specialist. That is the third promise and we mean it.</p>
        </div>
        <div class="form-note">
          <strong>What to bring.</strong> Any scans, X-rays or reports you already have; a GP or
          consultant referral letter if you have one; your health insurance details; a list of any
          medication you take; and, if your problem is running-related, your usual running shoes.
          Wear or bring loose clothing you can move in &mdash; shorts are useful for lower-limb problems.
        </div>
      </div>
      <aside class="rail">
        <div class="rail__block">
          <p class="rail__label">Cancellations</p>
          <p style="font-size:14.5px;color:var(--ink-soft)">
            Please give at least ${site.booking.cancellationHours} hours&rsquo; notice to avoid a
            ${esc(site.booking.cancellationFee)} cancellation fee.
          </p>
        </div>
        <div class="rail__block">
          <p class="rail__label">Referral</p>
          <p style="font-size:14.5px;color:var(--ink-soft)">
            Self-referral welcome. We also accept GP and consultant referrals, and provide a consultant
            service to other physiotherapists.
          </p>
        </div>
      </aside>
    </div>
  </div>
</section>

${ctaBand()}`;

  return page({
    title: 'How we work — our approach to treatment',
    description: 'Assessment, treatment and rehabilitation — the three-stage approach used at CityPhysio in Lucan, and what happens at your first appointment.',
    current: PATHS.approach,
    canonical: PATHS.approach,
    body
  });
}

function aboutPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / The team</p>
  <h1 class="page-title">The clinic and the team</h1>
  <p class="lede">${esc(teamData.clinicNotes[0])}</p>
</div>

<div class="shell" style="padding-bottom:var(--s8)">
  <div class="ref">
    <div class="ref__body">
      <div class="prose">
        ${teamData.clinicNotes.slice(1).map(n => `<p>${esc(n)}</p>`).join('\n        ')}
      </div>
    </div>
    <aside class="rail">
      <div class="rail__block">
        <p class="rail__label">Getting here</p>
        <p style="font-size:14.5px;color:var(--ink-soft)">
          Minutes from the ${site.transport.roads.join(', ')}. Dublin Bus routes
          ${site.transport.buses.join(', ')} from ${esc(site.transport.from)}.
        </p>
        <p style="margin-top:var(--s3)"><a href="${url(PATHS.contact)}" style="font-size:14.5px">Directions and contact &rarr;</a></p>
      </div>
      <div class="rail__block">
        <p class="rail__label">Company</p>
        <p style="font-size:14.5px;color:var(--ink-soft)">
          ${esc(site.legalName)}<br>Registered in Ireland No. ${esc(site.companyNumber)}<br>
          Directors: ${site.directors.join(', ')}
        </p>
      </div>
    </aside>
  </div>
</div>

<section class="band band--sunk">
  <div class="shell">
    <div class="sec-head">
      <p class="plate-no">Plate 01 &middot; The team</p>
      <div>
        <h2 class="sec-title">Our physiotherapists</h2>
        <p class="sec-lede">
          ${TEAM.length} chartered physiotherapists. Specialisms as published by the clinic.
        </p>
      </div>
    </div>
    <div class="team-grid">
      ${TEAM.map(m => `
      <article class="member">
        <p class="member__mark" aria-hidden="true">${esc(m.initials)}</p>
        <h3 class="member__name">${esc(m.name)}</h3>
        <p class="member__role">${esc(m.role)}</p>
        <ul class="member__spec">
          ${m.specialisms.map(s => `<li>${esc(s)}</li>`).join('\n          ')}
        </ul>
        ${m.note ? `<p class="member__note">${esc(m.note)}</p>` : ''}
      </article>`).join('')}
    </div>
    <p style="margin-top:var(--s5);font-size:14.5px;color:var(--ink-faint);max-width:60ch">
      Chartered physiotherapists in Ireland are members of the
      <a href="${site.professionalBody.url}" rel="noopener">${esc(site.professionalBody.name)}</a>.
      Individual qualifications and registration details are available from the clinic on request.
    </p>
  </div>
</section>

${ctaBand()}`;

  return page({
    title: 'About the clinic and our physiotherapists',
    description: `Meet the ${TEAM.length} chartered physiotherapists at CityPhysio, in the centre of Lucan village, Co. Dublin.`,
    current: PATHS.about,
    canonical: PATHS.about,
    body
  });
}

function contactPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / Contact</p>
  <h1 class="page-title">Contact and directions</h1>
  <p class="lede">
    The fastest way to get an appointment is to book online. If you would rather talk to someone
    first, ring us &mdash; reception will tell you honestly whether we can help.
  </p>
</div>

<div class="shell" style="padding-bottom:var(--s8)">
  <div class="facts">
    <div class="fact">
      <p class="fact__label">Address</p>
      <p class="fact__value">${esc(site.address.street)}<br>${esc(site.address.locality)}, ${esc(site.address.region)}<br>${esc(site.address.postalCode)}</p>
    </div>
    <div class="fact">
      <p class="fact__label">Phone</p>
      <p class="fact__value"><a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a></p>
    </div>
    <div class="fact">
      <p class="fact__label">Email</p>
      <p class="fact__value"><a href="mailto:${site.email}">${esc(site.email)}</a></p>
    </div>
    <div class="fact">
      <p class="fact__label">Opening hours</p>
      <p class="fact__value">${site.hours.map(h => `${esc(h.days)}<br>${esc(h.open)}&ndash;${esc(h.close)}`).join('<br>')}</p>
    </div>
  </div>
</div>

<section class="band">
  <div class="shell">
    <div class="ref">
      <div class="ref__body">
        <h2 style="font-size:clamp(24px,3vw,32px)">Request an appointment</h2>

        <div class="form-note" role="note">
          <strong>Demonstration form.</strong> This is a redesign concept, so this form is not
          connected to the clinic and nothing you type is sent anywhere. It validates and behaves
          exactly as the real one would. To actually contact CityPhysio, please
          <a href="${url(PATHS.bookings)}">book online</a>, call
          <a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a>, or email
          <a href="mailto:${site.email}">${esc(site.email)}</a>.
        </div>

        <form class="form" id="enquiry" novalidate>
          <div class="field">
            <label class="field__label" for="f-name">Your name <span class="field__req">(required)</span></label>
            <input class="field__input" type="text" id="f-name" name="name" autocomplete="name" required>
            <p class="field__error" id="e-name">Please enter your name.</p>
          </div>

          <div class="field">
            <label class="field__label" for="f-email">Email address <span class="field__req">(required)</span>
              <span class="field__hint">So we can confirm your appointment in writing.</span>
            </label>
            <input class="field__input" type="email" id="f-email" name="email" autocomplete="email" required>
            <p class="field__error" id="e-email">Please enter a valid email address, like name@example.com.</p>
          </div>

          <div class="field">
            <label class="field__label" for="f-phone">Phone number <span class="field__req">(required)</span>
              <span class="field__hint">We ring to confirm, so please double-check this.</span>
            </label>
            <input class="field__input" type="tel" id="f-phone" name="phone" autocomplete="tel" inputmode="tel" required>
            <p class="field__error" id="e-phone">Please enter a phone number we can reach you on.</p>
          </div>

          <div class="field">
            <label class="field__label" for="f-service">What do you need? <span class="field__req">(required)</span></label>
            <select class="field__input" id="f-service" name="service" required>
              <option value="">Choose one…</option>
              ${SERVICES.map(s => `<option value="${esc(s.slug)}">${esc(s.title)}</option>`).join('\n              ')}
              <option value="not-sure">I&rsquo;m not sure — please advise</option>
            </select>
            <p class="field__error" id="e-service">Please choose a service, or &ldquo;I&rsquo;m not sure&rdquo;.</p>
          </div>

          <fieldset class="field">
            <legend>Have you been to CityPhysio before?</legend>
            <div class="radio-row">
              <label class="radio"><input type="radio" name="returning" value="yes"> Yes</label>
              <label class="radio"><input type="radio" name="returning" value="no"> No</label>
            </div>
          </fieldset>

          <div class="field">
            <label class="field__label" for="f-msg">Tell us what&rsquo;s going on
              <span class="field__hint">Optional. Where it hurts, when it started, what makes it worse.</span>
            </label>
            <textarea class="field__input" id="f-msg" name="message" rows="5"></textarea>
          </div>

          <button class="btn btn--primary" type="submit">Request appointment</button>

          <p class="visually-hidden" role="status" aria-live="polite" id="form-status"></p>
          <div id="form-result" hidden></div>
        </form>
      </div>

      <aside class="rail">
        <div class="rail__block">
          <p class="rail__label">By car</p>
          <p style="font-size:14.5px;color:var(--ink-soft)">
            In the centre of Lucan village, minutes from the ${site.transport.roads.join(', ')}.
          </p>
        </div>
        <div class="rail__block">
          <p class="rail__label">By bus</p>
          <p style="font-size:14.5px;color:var(--ink-soft)">
            Routes ${site.transport.buses.join(', ')} from ${esc(site.transport.from)}.
          </p>
        </div>
        <div class="rail__block">
          <p class="rail__label">Cancellations</p>
          <p style="font-size:14.5px;color:var(--ink-soft)">
            At least ${site.booking.cancellationHours} hours&rsquo; notice, or a
            ${esc(site.booking.cancellationFee)} fee applies.
          </p>
        </div>
        <div class="rail__block">
          <p class="rail__label">Health insurance</p>
          <p style="font-size:14.5px;color:var(--ink-soft)">${site.insurers.join(', ')}.</p>
        </div>
      </aside>
    </div>
  </div>
</section>`;

  return page({
    title: 'Contact, directions and opening hours',
    description: `CityPhysio, ${site.address.street}, ${site.address.locality}, ${site.address.region}. Phone ${site.phoneDisplay}. Open ${site.hours.map(h => h.days + ' ' + h.open + '-' + h.close).join('; ')}.`,
    current: PATHS.contact,
    canonical: PATHS.contact,
    jsonld: localBusiness,
    body
  });
}

function bookingsPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / Book</p>
  <h1 class="page-title">Book an appointment</h1>
  <p class="lede">
    Booking runs on Cliniko, the clinic&rsquo;s own practice-management system. You do not need a
    GP referral. Choose Lucan Clinic, then your service &mdash; for Pilates, choose Group Sessions.
  </p>
</div>

<div class="shell" style="padding-bottom:var(--s8)">
  <div class="form-note" role="note">
    <strong>Live booking system.</strong> The panel below is CityPhysio&rsquo;s real Cliniko booking
    system, embedded from
    <a href="${site.booking.cliniko}" rel="noopener">${esc(new URL(site.booking.cliniko).hostname)}</a>.
    Anything you book here is a real appointment at the clinic.
  </div>

  <iframe
    class="embed-frame"
    src="${site.booking.clinikoEmbed}"
    title="CityPhysio online booking"
    loading="lazy"
    referrerpolicy="strict-origin-when-cross-origin"></iframe>

  <p style="margin-top:var(--s5);color:var(--ink-soft);font-size:15.5px">
    If the booking panel does not load, open it directly at
    <a href="${site.booking.cliniko}" rel="noopener">${esc(site.booking.cliniko)}</a>
    or call <a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a>.
  </p>

  <div style="margin-top:var(--s8);display:grid;gap:var(--s6);grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
    <div>
      <p class="eyebrow">Cancellations</p>
      <p style="color:var(--ink-soft);font-size:15.5px">
        Please give at least ${site.booking.cancellationHours} hours&rsquo; notice if you need to
        cancel, or a ${esc(site.booking.cancellationFee)} fee applies.
      </p>
    </div>
    <div>
      <p class="eyebrow">Health insurance</p>
      <p style="color:var(--ink-soft);font-size:15.5px">
        ${site.insurers.join(', ')}. ${esc(site.insurersNote)}
      </p>
    </div>
    <div>
      <p class="eyebrow">Referral</p>
      <p style="color:var(--ink-soft);font-size:15.5px">
        Self-referral is welcome. We also accept referrals from GPs and consultants.
      </p>
    </div>
  </div>
</div>`;

  return page({
    title: 'Book an appointment online',
    description: `Book a physiotherapy appointment at CityPhysio in Lucan, Co. Dublin. Self-referral welcome, no GP letter needed.`,
    current: PATHS.bookings,
    canonical: PATHS.bookings,
    body
  });
}

function pilatesPage() {
  const s = SERVICES.find(x => x.slug === 'pilates');
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / Pilates classes</p>
  <h1 class="page-title">Pilates classes</h1>
  <p class="lede">${esc(s.lede)}</p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="ref">
    <div class="ref__body">
      <div class="prose">
        ${s.body.map(p => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>

      <div class="form-note">
        <strong>Class times.</strong> ${esc(s.booking)}
      </div>

      <div style="padding-top:var(--s5);border-top:1px solid var(--rule)">
        <h2 style="font-size:20px;margin-bottom:var(--s4)">Before your first class</h2>
        <ul class="member__spec" style="max-width:56ch">
          <li style="font-size:16px;padding-block:6px">If you are a CityPhysio patient: complete a Pilates assessment form with your physiotherapist.</li>
          <li style="font-size:16px;padding-block:6px">If you are not: arrive ten minutes early for a brief screening with the instructor.</li>
          <li style="font-size:16px;padding-block:6px">Wear clothing you can move in. Classes are run by specialist physiotherapists.</li>
        </ul>
      </div>

      <p>
        <a class="btn btn--primary" href="${url(PATHS.bookings)}">Book a class</a>
        <a class="btn btn--ghost" href="${site.phoneHref}" style="margin-left:var(--s2)">Call reception</a>
      </p>
    </div>
    <aside class="rail">
      <div class="rail__block">
        <p class="rail__label">Where Pilates fits</p>
        <p style="font-size:14.5px;color:var(--ink-soft)">
          For many patients Pilates is stage three of treatment &mdash; rehabilitation and prevention
          &mdash; rather than a separate activity.
        </p>
        <p style="margin-top:var(--s3)"><a href="${url(PATHS.approach)}" style="font-size:14.5px">How we work &rarr;</a></p>
      </div>
      <div class="rail__block">
        <p class="rail__label">Commonly helps</p>
        <ul class="rail__list">
          ${REGIONS.filter(r => (r.services || []).includes('pilates')).map(r => `<li><a href="${url(PATHS.region(r.slug))}">${esc(r.title)}</a></li>`).join('\n          ')}
        </ul>
      </div>
    </aside>
  </div>
</div>`;

  return page({
    title: 'Pilates classes',
    description: 'Physiotherapist-led Pilates classes at CityPhysio in Lucan, Co. Dublin. Assessment or screening before your first class.',
    current: PATHS.services,
    canonical: PATHS.pilates,
    body
  });
}

function downloadsPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / Downloads</p>
  <h1 class="page-title">Downloads</h1>
  <p class="lede">Patient leaflets you can keep.</p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="svc-list">
    ${site.downloads.map((d, i) => `
    <a class="svc" href="${d.url}" rel="noopener">
      <span class="svc__n">0${i + 1}</span>
      <h2 class="svc__title">${esc(d.title)}</h2>
      <p class="svc__lede">${esc(d.type)} &middot; opens on cityphysio.ie</p>
      <span class="svc__go" aria-hidden="true">&darr;</span>
    </a>`).join('')}
  </div>
  <p style="margin-top:var(--s6);font-size:15px;color:var(--ink-faint);max-width:60ch">
    These files are served from the current CityPhysio website. In a live rebuild they would be
    hosted alongside the rest of the site.
  </p>
</div>`;

  return page({
    title: 'Downloads',
    description: 'Patient leaflets from CityPhysio in Lucan, Co. Dublin: post-COVID recovery and working safely from home.',
    current: '',
    canonical: PATHS.downloads,
    body
  });
}

function blogPage() {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / News</p>
  <h1 class="page-title">News</h1>
  <p class="lede">Occasional writing from the clinic.</p>
</div>

<div class="shell" style="padding-bottom:var(--s9)">
  <div class="svc-list">
    <a class="svc" href="https://www.cityphysio.ie/blog/2020/5/5/good-physio-is-all-about-problem-solving-amp-we-love-it" rel="noopener">
      <span class="svc__n">2020</span>
      <h2 class="svc__title">Good physio is all about problem solving &amp; we love it</h2>
      <p class="svc__lede">Margaret Hanlon &middot; 5 May 2020 &middot; opens on cityphysio.ie</p>
      <span class="svc__go" aria-hidden="true">&rarr;</span>
    </a>
    <a class="svc" href="https://www.cityphysio.ie/blog/2020/5/5/demo-blog-post-title-here" rel="noopener">
      <span class="svc__n">2021</span>
      <h2 class="svc__title">Working Safely From Home</h2>
      <p class="svc__lede">5 April 2021 &middot; opens on cityphysio.ie</p>
      <span class="svc__go" aria-hidden="true">&rarr;</span>
    </a>
  </div>

  <div class="form-note" style="margin-top:var(--s7)">
    <strong>A note for the clinic.</strong> The existing blog holds two posts, the most recent from
    April 2021, and one of them still carries placeholder text and a demo URL. A visibly stale news
    section costs more credibility than it earns. Either commit to publishing, or retire the section
    and redirect <code>/blog</code> to the symptom guide &mdash; which is the clinical writing that
    actually works for you.
  </div>
</div>`;

  return page({
    title: 'News',
    description: 'News and writing from the chartered physiotherapists at CityPhysio in Lucan, Co. Dublin.',
    current: '',
    canonical: PATHS.blog,
    body
  });
}

function legalPage(title, slug, liveUrl, intro) {
  const body = `
<div class="shell page-head">
  <p class="crumb"><a href="${url(PATHS.home)}">Home</a> / ${esc(title)}</p>
  <h1 class="page-title">${esc(title)}</h1>
  <p class="lede">${esc(intro)}</p>
</div>

<div class="shell" style="padding-bottom:var(--s9);max-width:820px">
  <div class="form-note">
    <strong>Content to be migrated.</strong> This page exists in the concept so the URL is preserved
    and the navigation is complete. The authoritative text has not been copied across, because legal
    and safeguarding wording must move verbatim and be checked by the clinic before republishing.
    The current version is at
    <a href="${liveUrl}" rel="noopener">${esc(liveUrl)}</a>.
  </div>

  <div class="prose" style="margin-top:var(--s6)">
    <p>For any question about how CityPhysio handles your information, contact the clinic directly:</p>
  </div>

  <ul class="rail__list" style="margin-top:var(--s4)">
    <li><a href="mailto:${site.email}">${esc(site.email)}</a></li>
    <li><a href="${site.phoneHref}">${esc(site.phoneDisplay)}</a></li>
    <li>${esc(site.address.street)}, ${esc(site.address.locality)}, ${esc(site.address.region)} ${esc(site.address.postalCode)}</li>
  </ul>

  <p style="margin-top:var(--s6);font-size:15px;color:var(--ink-faint)">
    ${esc(site.legalName)} &middot; Registered in Ireland No. ${esc(site.companyNumber)}
  </p>
</div>`;

  return page({
    title,
    description: `${title} for ${site.legalName}, chartered physiotherapists in ${site.address.locality}, ${site.address.region}.`,
    current: '',
    canonical: slug,
    body
  });
}

function notFoundPage() {
  const body = `
<div class="shell page-head" style="padding-block:clamp(64px,10vw,140px)">
  <p class="anat">Error 404</p>
  <h1 class="page-title" style="margin-top:var(--s3)">That page isn&rsquo;t here.</h1>
  <p class="lede">It may have moved, or the address may be slightly off. These are the useful places:</p>
  <div style="display:flex;flex-wrap:wrap;gap:var(--s3);margin-top:var(--s6)">
    <a class="btn btn--primary" href="${url(PATHS.symptoms)}">Where does it hurt?</a>
    <a class="btn btn--ghost" href="${url(PATHS.services)}">Services</a>
    <a class="btn btn--ghost" href="${url(PATHS.bookings)}">Book online</a>
    <a class="btn btn--ghost" href="${url(PATHS.contact)}">Contact</a>
  </div>
</div>`;
  return page({ title: 'Page not found', description: 'That page could not be found. Find your symptoms, browse services, or book an appointment at CityPhysio in Lucan.', current: '', body });
}

/* ----------------------------------------------------------------- write -- */

function write(routePath, html) {
  const dir = routePath === '/' ? OUT : path.join(OUT, routePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// Generate a page with DEPTH set from its route, so url() resolves correctly.
function emit(routePath, generate) {
  DEPTH = routePath === '/' ? 0 : routePath.replace(/^\/|\/$/g, '').split('/').length;
  write(routePath, generate());
  DEPTH = 0;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(src, dst) : fs.copyFileSync(src, dst);
  }
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let n = 0;
  emit('/', homePage); n++;
  emit(PATHS.symptoms, symptomsPage); n++;
  REGIONS.forEach((r, i) => { emit(PATHS.region(r.slug), () => regionPage(r, i)); n++; });
  emit(PATHS.services, servicesPage); n++;
  SERVICES.forEach(s => { emit(PATHS.service(s.slug), () => servicePage(s)); n++; });
  emit(PATHS.approach, approachPage); n++;
  emit(PATHS.about, aboutPage); n++;
  emit(PATHS.contact, contactPage); n++;
  emit(PATHS.bookings, bookingsPage); n++;
  emit(PATHS.pilates, pilatesPage); n++;
  emit(PATHS.downloads, downloadsPage); n++;
  emit(PATHS.blog, blogPage); n++;
  emit(PATHS.privacy, () => legalPage('Privacy & Cookies Policy', PATHS.privacy,
    'https://www.cityphysio.ie/privacy-cookies-policy',
    'How CityPhysio collects, uses and protects your personal information.')); n++;
  emit(PATHS.safeguarding, () => legalPage('Child Safeguarding Statement', PATHS.safeguarding,
    'https://www.cityphysio.ie/child-safeguarding-statement',
    'Our commitment to the safety and welfare of children attending the clinic.')); n++;
  emit(PATHS.patientPrivacy, () => legalPage('Patient Privacy Consent', PATHS.patientPrivacy,
    'https://www.cityphysio.ie/patient-privacy-document',
    'How your clinical records are held and used.')); n++;

  // 404 is served from arbitrary paths, so it alone needs absolute URLs.
  ABSOLUTE = true;
  fs.writeFileSync(path.join(OUT, '404.html'), notFoundPage());
  ABSOLUTE = false;
  n++;

  // GitHub Pages: skip Jekyll processing
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  // Keep the concept out of search results at the server level too
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));

  console.log(`Built ${n} pages into docs/ — relative paths, portable to any base${BASE ? ` (404.html uses ${BASE})` : ''}`);
  console.log(`  ${REGIONS.length} symptom regions, ${SERVICES.length} services, ${TEAM.length} team members`);
}

build();
