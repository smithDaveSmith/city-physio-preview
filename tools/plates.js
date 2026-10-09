#!/usr/bin/env node
/**
 * Generates the site's anatomical plates as SVG.
 *
 * All artwork is original, drawn programmatically — nothing is traced, stocked
 * or licensed. Parameters live at the top of each builder so the drawing can be
 * tuned rather than hand-edited as path data.
 *
 *   node tools/plates.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'img', 'plates');
fs.mkdirSync(OUT, { recursive: true });

const r2 = n => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------- helpers -- */

/**
 * A bone silhouette: a closed outline, symmetric about the axis from
 * (x1,y1) to (x2,y2), swelling to w1/wMid/w2 at start/middle/end.
 * Drawn as an outline (fill:none) so it reads as a technical plate.
 */
function bone(x1, y1, x2, y2, w1, wMid, w2, bulge = 0.5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // unit normal
  const nx = -dy / len, ny = dx / len;
  const mx = x1 + dx * bulge, my = y1 + dy * bulge;

  const p = (x, y, w, s) => [r2(x + nx * w * s), r2(y + ny * w * s)];

  const [ax, ay] = p(x1, y1, w1, 1);
  const [bx, by] = p(mx, my, wMid, 1);
  const [cx, cy] = p(x2, y2, w2, 1);
  const [dx2, dy2] = p(x2, y2, w2, -1);
  const [ex, ey] = p(mx, my, wMid, -1);
  const [fx, fy] = p(x1, y1, w1, -1);

  return `M ${ax} ${ay} Q ${bx} ${by} ${cx} ${cy}` +
         ` A ${r2(w2)} ${r2(w2)} 0 0 1 ${dx2} ${dy2}` +
         ` Q ${ex} ${ey} ${fx} ${fy}` +
         ` A ${r2(w1)} ${r2(w1)} 0 0 1 ${ax} ${ay} Z`;
}

/** A single vertebra seen from the front: body + transverse processes. */
function vertebra(cx, cy, w, h) {
  const hw = w / 2, hh = h / 2;
  return [
    `<rect x="${r2(cx - hw)}" y="${r2(cy - hh)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(h * 0.35)}"/>`,
    `<line x1="${r2(cx - hw - w * 0.34)}" y1="${r2(cy)}" x2="${r2(cx - hw)}" y2="${r2(cy)}"/>`,
    `<line x1="${r2(cx + hw)}" y1="${r2(cy)}" x2="${r2(cx + hw + w * 0.34)}" y2="${r2(cy)}"/>`
  ].join('');
}

/** A stacked run of vertebrae, tapering in width down the column. */
function spine(cx, yTop, yBot, count, wTop, wBot) {
  const step = (yBot - yTop) / count;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    const w = wTop + (wBot - wTop) * t;
    out.push(vertebra(cx, yTop + step * i + step / 2, w, step * 0.68));
  }
  return out.join('');
}

/* ------------------------------------------------------------ the figure -- */
/**
 * Anterior structural figure. Deliberately diagrammatic rather than realistic:
 * precise geometry reads as a technical plate, where an approximate human
 * outline would just read as a poor drawing.
 */
function figure() {
  const W = 500, H = 980;
  const cx = W / 2;
  const g = [];

  // --- skull + mandible
  g.push(`<ellipse cx="${cx}" cy="72" rx="40" ry="48"/>`);
  g.push(`<path d="M ${cx - 30} 96 Q ${cx} 134 ${cx + 30} 96"/>`);
  g.push(`<line x1="${cx - 31}" y1="104" x2="${cx + 31}" y2="104"/>`);

  // --- spine
  g.push(spine(cx, 124, 196, 7, 20, 26));    // cervical
  g.push(spine(cx, 196, 372, 12, 26, 36));   // thoracic
  g.push(spine(cx, 372, 468, 5, 36, 44));    // lumbar

  // --- sacrum
  g.push(`<path d="M ${cx - 22} 468 L ${cx + 22} 468 L ${cx + 13} 524 L ${cx - 13} 524 Z"/>`);

  // --- ribcage: paired arcs springing from the thoracic vertebrae
  for (let i = 0; i < 10; i++) {
    const y = 206 + i * 15.5;
    const spread = 42 + Math.sin((i / 9) * Math.PI) * 76;
    const drop = 30 + i * 5.5;
    for (const s of [-1, 1]) {
      g.push(`<path d="M ${r2(cx + s * 16)} ${r2(y)} Q ${r2(cx + s * spread)} ${r2(y + drop * 0.25)} ${r2(cx + s * spread * 0.72)} ${r2(y + drop)}"/>`);
    }
  }

  // --- sternum
  g.push(`<rect x="${cx - 9}" y="228" width="18" height="96" rx="6"/>`);

  // --- clavicle + scapula
  for (const s of [-1, 1]) {
    g.push(`<path d="M ${r2(cx + s * 12)} 206 Q ${r2(cx + s * 60)} 196 ${r2(cx + s * 96)} 214"/>`);
    g.push(`<path d="M ${r2(cx + s * 70)} 220 Q ${r2(cx + s * 104)} 250 ${r2(cx + s * 82)} 284"/>`);
  }

  // --- pelvis: iliac wings + ischium
  for (const s of [-1, 1]) {
    g.push(`<path d="M ${r2(cx + s * 20)} 470 Q ${r2(cx + s * 92)} 480 ${r2(cx + s * 80)} 540 Q ${r2(cx + s * 66)} 578 ${r2(cx + s * 30)} 566 L ${r2(cx + s * 16)} 524 Z"/>`);
    g.push(`<circle cx="${r2(cx + s * 60)} " cy="552" r="15"/>`);
  }

  // --- upper limb
  for (const s of [-1, 1]) {
    const sx = cx + s * 98;
    g.push(`<circle cx="${r2(sx)}" cy="218" r="14"/>`);                       // gleno-humeral
    g.push(`<path d="${bone(sx, 232, cx + s * 122, 356, 10, 7, 11)}"/>`);     // humerus
    g.push(`<circle cx="${r2(cx + s * 122)}" cy="362" r="10"/>`);             // elbow
    g.push(`<path d="${bone(cx + s * 124, 372, cx + s * 140, 470, 7, 5, 8)}"/>`);  // radius
    g.push(`<path d="${bone(cx + s * 136, 372, cx + s * 152, 470, 6, 4, 7)}"/>`);  // ulna
    // carpals + metacarpals
    g.push(`<rect x="${r2(cx + s * 148 - 13)}" y="476" width="26" height="15" rx="6"/>`);
    for (let f = -2; f <= 2; f++) {
      g.push(`<line x1="${r2(cx + s * 148 + f * 5.5)}" y1="492" x2="${r2(cx + s * 148 + f * 8)}" y2="${520 - Math.abs(f) * 7}"/>`);
    }
  }

  // --- lower limb
  for (const s of [-1, 1]) {
    const hx = cx + s * 60;
    g.push(`<path d="${bone(hx, 566, cx + s * 54, 726, 13, 9, 15)}"/>`);      // femur
    g.push(`<circle cx="${r2(cx + s * 54)}" cy="736" r="12"/>`);              // knee
    g.push(`<ellipse cx="${r2(cx + s * 54)}" cy="730" rx="9" ry="11"/>`);     // patella
    g.push(`<path d="${bone(cx + s * 50, 750, cx + s * 48, 880, 11, 7, 10)}"/>`);  // tibia
    g.push(`<path d="${bone(cx + s * 64, 752, cx + s * 60, 876, 5, 4, 6)}"/>`);    // fibula
    g.push(`<circle cx="${r2(cx + s * 50)}" cy="888" r="9"/>`);               // ankle
    // tarsals + toes
    g.push(`<path d="M ${r2(cx + s * 40)} 896 Q ${r2(cx + s * 44)} 918 ${r2(cx + s * 86)} 920 L ${r2(cx + s * 88)} 930 Q ${r2(cx + s * 40)} 932 ${r2(cx + s * 34)} 906 Z"/>`);
  }

  return { W, H, body: g.join('\n    ') };
}

/* The 15 keyed markers, positioned on the figure above. */
const KEYS = [
  // bx/by = the point on the body (figure centred at x=250); rx/ry = the ring.
  // Rings sit in two outer columns clear of the figure, spaced so none collide.
  { n: 1,  slug: 'neck',               bx: 236, by: 160, rx: 34,  ry: 160 },
  { n: 2,  slug: 'jaw',                bx: 276, by: 106, rx: 466, ry: 106 },
  { n: 3,  slug: 'cervical-headaches', bx: 226, by: 56,  rx: 34,  ry: 56  },
  { n: 4,  slug: 'shoulder',           bx: 348, by: 218, rx: 466, ry: 212 },
  { n: 5,  slug: 'elbow',              bx: 372, by: 362, rx: 466, ry: 352 },
  { n: 6,  slug: 'wrist-hand',         bx: 398, by: 484, rx: 466, ry: 462 },
  { n: 7,  slug: 'thoracic-spine',     bx: 236, by: 286, rx: 34,  ry: 286 },
  { n: 8,  slug: 'ribs',               bx: 192, by: 310, rx: 34,  ry: 344 },
  { n: 9,  slug: 'lower-back',         bx: 236, by: 420, rx: 34,  ry: 420 },
  { n: 10, slug: 'pelvis',             bx: 308, by: 508, rx: 466, ry: 540 },
  { n: 11, slug: 'hip',                bx: 190, by: 552, rx: 34,  ry: 552 },
  { n: 12, slug: 'hamstring',          bx: 198, by: 650, rx: 34,  ry: 650 },
  { n: 13, slug: 'knee',               bx: 306, by: 736, rx: 466, ry: 736 },
  { n: 14, slug: 'shin',               bx: 198, by: 812, rx: 34,  ry: 812 },
  { n: 15, slug: 'foot-ankle',         bx: 312, by: 898, rx: 466, ry: 898 }
];

function heroFigure() {
  const { W, H, body } = figure();

  const markers = KEYS.map(k => {
    // Leader runs from the ring's outer edge to the point on the body, with a
    // short horizontal run into the ring so angled leaders still read cleanly.
    const left = k.rx < 210;
    const edge = left ? k.rx + 11 : k.rx - 11;
    const elbowX = left ? edge + 16 : edge - 16;
    return `
    <g class="mk" id="mk-${k.n}" data-region="${k.slug}">
      <polyline class="mk-lead" points="${edge},${k.ry} ${elbowX},${k.ry} ${k.bx},${k.by}"/>
      <circle class="mk-dot" cx="${k.bx}" cy="${k.by}" r="3"/>
      <circle class="mk-ring" cx="${k.rx}" cy="${k.ry}" r="11"/>
      <text class="mk-num" x="${k.rx}" y="${k.ry + 4}">${k.n}</text>
    </g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="plate-figure" role="img" aria-label="Anatomical figure with the fifteen body regions marked and numbered">
  <g class="plate-body" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </g>
  <g class="plate-keys">${markers}
  </g>
</svg>`;
}

/* --------------------------------------------------------- region plates -- */
/* A small detail plate per region. Same drawing vocabulary, zoomed in. */

const DETAIL = {
  neck: () => `${spine(60, 10, 104, 7, 22, 28)}
    <ellipse cx="60" cy="-14" rx="26" ry="20"/>
    <path d="M 26 112 Q 60 104 94 112"/>`,
  jaw: () => `<ellipse cx="60" cy="40" rx="34" ry="40"/>
    <path d="M 30 56 Q 60 100 90 56"/>
    <circle cx="86" cy="50" r="7"/>
    <line x1="30" y1="66" x2="90" y2="66"/>`,
  'cervical-headaches': () => `<ellipse cx="60" cy="38" rx="36" ry="42"/>
    ${spine(60, 72, 112, 4, 20, 24)}
    <path d="M 34 54 Q 60 24 86 54" stroke-dasharray="3 4"/>`,
  shoulder: () => `<circle cx="58" cy="46" r="20"/>
    <path d="${bone(58, 62, 74, 140, 11, 8, 12)}"/>
    <path d="M 18 36 Q 42 26 72 40"/>
    <path d="M 26 52 Q 54 78 38 104"/>`,
  elbow: () => `<path d="${bone(60, 4, 62, 54, 11, 8, 12)}"/>
    <circle cx="62" cy="62" r="11"/>
    <path d="${bone(56, 72, 52, 136, 7, 5, 8)}"/>
    <path d="${bone(70, 72, 74, 136, 6, 4, 7)}"/>`,
  'wrist-hand': () => `<path d="${bone(52, 0, 56, 56, 7, 5, 8)}"/>
    <path d="${bone(68, 0, 64, 56, 6, 4, 7)}"/>
    <rect x="42" y="62" width="38" height="18" rx="7"/>
    ${[-2, -1, 0, 1, 2].map(f => `<line x1="${61 + f * 8}" y1="82" x2="${61 + f * 12}" y2="${128 - Math.abs(f) * 10}"/>`).join('')}`,
  'thoracic-spine': () => `${spine(60, 4, 132, 9, 26, 32)}
    ${[0, 1, 2, 3, 4, 5].map(i => {
      const y = 14 + i * 14;
      return [-1, 1].map(s => `<path d="M ${60 + s * 14} ${y} Q ${60 + s * 56} ${y + 8} ${60 + s * 44} ${y + 30}"/>`).join('');
    }).join('')}`,
  ribs: () => `${spine(60, 4, 132, 8, 24, 30)}
    ${[0, 1, 2, 3, 4, 5, 6].map(i => {
      const y = 12 + i * 16;
      return [-1, 1].map(s => `<path d="M ${60 + s * 13} ${y} Q ${60 + s * 58} ${y + 6} ${60 + s * 42} ${y + 34}"/>`).join('');
    }).join('')}
    <rect x="52" y="30" width="16" height="70" rx="6"/>`,
  'lower-back': () => `${spine(60, 6, 104, 5, 32, 40)}
    <path d="M 42 104 Q 60 108 78 104 L 70 148 Q 60 154 50 148 Z"/>
    <path d="M 78 34 Q 100 54 96 96 Q 94 124 82 144" stroke-dasharray="3 5"/>
    <circle cx="78" cy="34" r="2.5" fill="currentColor" stroke="none"/>`,
  pelvis: () => `${[-1, 1].map(s => `<path d="M ${60 + s * 13} 30 Q ${60 + s * 52} 22 ${60 + s * 56} 62 Q ${60 + s * 58} 92 ${60 + s * 40} 106 Q ${60 + s * 22} 112 ${60 + s * 16} 92 Z"/>
    <circle cx="${60 + s * 42}" cy="88" r="12"/>
    <path d="M ${60 + s * 30} 108 Q ${60 + s * 20} 128 ${60 + s * 6} 126"/>`).join('')}
    <path d="M 48 26 Q 60 30 72 26 L 66 76 Q 60 82 54 76 Z"/>
    <line x1="54" y1="40" x2="66" y2="40"/><line x1="55" y1="54" x2="65" y2="54"/>`,
  hip: () => `<circle cx="60" cy="52" r="22"/>
    <circle cx="60" cy="52" r="12"/>
    <path d="M 14 26 Q 68 32 60 74 Q 54 104 26 96"/>
    <path d="${bone(60, 74, 52, 150, 13, 9, 13)}"/>`,
  hamstring: () => `<path d="${bone(60, 6, 55, 134, 12, 8, 14)}"/>
    <path d="M 74 14 Q 92 60 80 128 Q 76 142 70 146"/>
    <path d="M 82 18 Q 100 64 88 126"/>
    <path d="M 46 16 Q 30 62 42 128"/>
    <line x1="74" y1="46" x2="86" y2="44"/><line x1="76" y1="68" x2="88" y2="66"/>
    <line x1="78" y1="90" x2="88" y2="88"/>`,
  knee: () => `<path d="${bone(60, 0, 58, 54, 13, 9, 16)}"/>
    <circle cx="58" cy="66" r="14"/>
    <ellipse cx="58" cy="58" rx="10" ry="13"/>
    <path d="${bone(55, 82, 54, 150, 12, 8, 11)}"/>
    <path d="${bone(72, 84, 70, 148, 5, 4, 6)}"/>`,
  shin: () => `<path d="${bone(54, 6, 52, 134, 12, 8, 11)}"/>
    <path d="${bone(72, 8, 70, 130, 5, 4, 6)}"/>
    ${[0,1,2,3,4,5].map(i => `<line x1="${41 - i * 0.4}" y1="${48 + i * 11}" x2="${48 - i * 0.4}" y2="${44 + i * 11}"/>`).join('')}
    <path d="M 38 42 Q 33 84 40 122" stroke-dasharray="3 5"/>`,
  'foot-ankle': () => `<path d="${bone(50, 0, 48, 56, 11, 8, 10)}"/>
    <path d="${bone(66, 2, 64, 54, 5, 4, 6)}"/>
    <circle cx="48" cy="66" r="10"/>
    <path d="M 32 76 Q 38 104 102 106 L 104 118 Q 32 120 24 90 Z"/>`
};

function regionPlate(slug) {
  const draw = DETAIL[slug];
  if (!draw) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" class="plate-detail" role="presentation" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    ${draw()}
  </g>
</svg>`;
}

/* ------------------------------------------------------------------ main -- */

const hero = heroFigure();
fs.writeFileSync(path.join(OUT, 'figure.svg'), hero);

const details = {};
let nDetails = 0;
for (const slug of Object.keys(DETAIL)) {
  const svg = regionPlate(slug);
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  details[slug] = svg;
  nDetails++;
}

// Inlined for the generator, so plates ship without extra requests.
fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'data', 'plates.json'),
  JSON.stringify({ _note: 'Generated by tools/plates.js — do not edit by hand.', figure: hero, keys: KEYS, details }, null, 0)
);

console.log(`Plates: 1 figure (${KEYS.length} keys) + ${nDetails} region details -> assets/img/plates/`);
console.log(`Inlined to src/data/plates.json (${Math.round(fs.statSync(path.join(__dirname, '..', 'src', 'data', 'plates.json')).size / 1024)}KB)`);
