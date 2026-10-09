# CityPhysio — redesign concept

An **unofficial** redesign concept for [CityPhysio](https://www.cityphysio.ie/), a chartered
physiotherapy clinic at 1–2 Vesey Terrace, Main Street, Lucan, Co. Dublin.

This is not affiliated with or authorised by the clinic. Every page carries a visible banner saying
so, every page is `noindex, nofollow`, and `robots.txt` disallows all crawling.

---

## Running it

```bash
npm install          # only needed for `npm run verify`
npm run build        # -> docs/   (root-hosted, e.g. a custom domain)
npm run build:pages  # -> docs/   (GitHub project page, paths prefixed)
npm run serve        # http://localhost:8080
npm run verify       # headless Chromium audit across every page × 3 viewports
npm run verify:portable  # proves the build works under any base path
node tools/plates.js # regenerate the anatomical artwork
```

No runtime dependencies. `build.js` is plain Node with no imports beyond `fs` and `path`.
Playwright is a dev dependency used only by the verification script.

### How it's put together

```
src/data/*.json   All content. This is the only place to edit copy.
assets/           CSS, JS, favicon — copied verbatim into docs/
build.js          Generates 38 pages from the data
scripts/verify.js Audits the built output
docs/             Build output. Committed, so GitHub Pages needs no CI.
```

Adding a symptom region or a service means adding one object to a JSON file. The index pages,
cross-links, "treated through" rails, prev/next pagers and sitemap entries all follow automatically.

---

## What was verified, and how

Measured with headless Chromium at 375 / 768 / 1440 px across all 37 routes (111 page-loads):

| Check | Result |
|---|---|
| Horizontal overflow | None on any route at any viewport |
| Broken internal links | 0 of 37 probed |
| Console errors | 0 (excluding blocked fonts — see limitation below) |
| `<h1>` per page | Exactly 1 on every page; no heading-level skips |
| Images without `alt` | 0 |
| Links with no accessible name | 0 |
| Unlabelled form fields | 0 |
| Skip link | Present and the first tab stop on every page |
| `noindex` | Present on every page |
| Contrast (WCAG AA) | All measured text pairs pass — lowest 5.57:1 |
| Tap targets | All activation targets ≥ 24 px |
| Mobile menu | Opens, traps focus, sets `aria-expanded`, closes on Escape |
| Reduced motion | Content renders fully visible; transitions ~0ms |
| Form | Rejects empty submit (4 fields flagged); on valid submit states plainly that nothing was sent |
| Home page weight | 4 requests, 72 KB own assets (artwork is inline SVG, so no extra requests) |
| Portability | `scripts/verify-portable.js` serves `docs/` under a path the build never saw: 37/37 pages styled, 74 links, 0 failures |

### Limitations — things NOT verified

- **Webfont rendering is unverified.** The build sandbox's proxy blocks `fonts.googleapis.com`, so
  every measurement above was taken with *fallback* fonts. Layout, spacing and contrast are verified
  under fallbacks and hold; Archivo / Source Serif 4 / IBM Plex Mono rendering has not been seen.
  **Check this first after deploying.**
- **No Lighthouse or axe run.** Neither tool was available. The contrast, heading, landmark, label
  and target checks above were implemented directly and are real measurements, but they are not a
  substitute for a full automated accessibility audit plus manual screen-reader testing.
- **No real-network performance numbers.** Load times were measured against localhost in headless
  Chromium. They say nothing about real-world performance.
- **No testing on real iOS Safari or Android Chrome.** Only Chromium's device emulation.

---

## What the owner needs to supply

Ordered by how much it matters.

1. **Confirm the opening hours.** The current site contradicts itself. The page body on
   `/contact-cityphysio-lucan` says Mon–Thu 08:00–20:00, Fri 08:00–18:00. The `<title>` and meta
   description on the *same page* say Mon–Thu 8am–9pm, Fri 8am–6pm, **Sat 9am–2pm**. Google shows
   the title version, so patients may be arriving on a Saturday to a closed clinic, or not booking
   an 8pm Tuesday slot that exists. This concept uses the narrower body hours and puts them in
   structured data. **Fix this before anything else, on the live site, today.**
2. **Clinical sign-off on the safety and rule-out wording.** The amber "When not to wait for
   physiotherapy" panel and the green "What it probably isn't" notes were written to follow HSE/NHS
   public guidance and the clinic's own text. A chartered physiotherapist must read and approve every
   one before this goes live. Rule-out lines are currently on 4 of 15 regions — extending them to all
   15 is the single highest-value content job on the site.
3. **Photography.** There is none, and this build uses original anatomical artwork in its place
   rather than stock. The current site uses stock sports photos (the About banner is literally
   `cityphysio-ie-fallback-rugby1.png`) and caricature illustrations of staff. Commission:
   the shopfront on Main Street, the waiting area, two or three treatment rooms, the shockwave unit,
   a Pilates class in progress, and proper headshots of all seven physiotherapists. Until then, do
   not substitute stock.
4. **Staff credentials.** No qualifications, letters, CORU registration numbers or years in practice
   are published anywhere. For a clinic whose entire positioning is expertise, this is the biggest
   easy win available. Supply per physiotherapist: qualifications, ISCP/CORU status, postgraduate
   training, years in practice, and which body regions and services they each cover.
5. **Prices, or a clear statement of why not.** Only "Prices on request" (Tendon Clinic) appears
   anywhere. Patients weigh cost before booking. At minimum publish the initial assessment and
   follow-up fee.
6. **Appointment durations.** Only the shockwave session length (20–30 min) is published. The first
   appointment duration is unknown and has deliberately not been invented.
7. **Typical course length.** "Most people need between X and Y sessions" is the most direct possible
   expression of *"we promise not to waste your time"*. Supply a range.
8. **Legal pages.** Privacy & Cookies, Child Safeguarding and Patient Privacy exist here as stubs
   that preserve the URLs. The real text must be migrated verbatim and checked — legal wording is not
   something to paraphrase. (The live Privacy page would not load during research, so its content was
   never read.)
9. **Insurer permission.** Insurers are shown as typographic names, not logos, because the original
   logo files could not be licensed or verified. If you want logos back, confirm you have permission
   to use each mark.
10. **Decide about the blog.** Two posts, newest April 2021, one still carrying placeholder text and
    a `demo-blog-post-title-here` URL. Either commit to publishing or retire it and redirect `/blog`
    to the symptom guide.
11. **The shockwave efficacy claim.** The current site states "up to 90% of patients report pain
    reduction after 3 sessions" with no source. It is **omitted here**. Reinstate only with a citation.

---

## Content provenance

Everything on this site traces to a verified source. `src/data/*.json` carries `_note` fields
recording where each block came from, and `site.json` has an `unverified` block listing every fact
that is in dispute or absent.

Nothing was invented: no reviews, ratings, testimonials, prices, statistics, qualifications,
guarantees, client logos or locations. Where the clinic publishes no information, this site says
nothing rather than filling the gap.

**Sources:** cityphysio.ie (home, about, services, symptom-selector, approach, contact, bookings,
pilates, downloads, blog), the embedded Cliniko booking endpoint, and the ISCP "Find a Chartered
Physiotherapist" directory. The logo's exact brand colours (`#184090` blue, `#008850` green) were
sampled from the official logo PNG.

---

## URL migration map

Every URL worth keeping is preserved exactly. **No redirects are required** if the site moves to
any host that serves directory-style paths.

| Current URL | This concept | Status |
|---|---|---|
| `/` | `/` | Unchanged |
| `/about-cityphysio-lucan` | `/about-cityphysio-lucan/` | Unchanged |
| `/services-at-cityphysio-lucan` | `/services-at-cityphysio-lucan/` | Unchanged |
| `/symptom-selector` | `/symptom-selector/` | Unchanged |
| `/pilates-classes-at-city-physio-lucan` | `/pilates-classes-at-city-physio-lucan/` | Unchanged |
| `/the-cityphysio-approach-to-treatment` | `/the-cityphysio-approach-to-treatment/` | Unchanged |
| `/blog` | `/blog/` | Unchanged |
| `/contact-cityphysio-lucan` | `/contact-cityphysio-lucan/` | Unchanged |
| `/bookings` | `/bookings/` | Unchanged |
| `/downloads` | `/downloads/` | Unchanged |
| `/privacy-cookies-policy` | `/privacy-cookies-policy/` | Unchanged |
| `/child-safeguarding-statement` | `/child-safeguarding-statement/` | Unchanged |
| `/patient-privacy-document` | `/patient-privacy-document/` | Unchanged |
| — | `/symptom-selector/<region>/` × 15 | **New** |
| — | `/services-at-cityphysio-lucan/<service>/` × 9 | **New** |

The 24 new pages are additive: 15 body-region pages and 9 service pages, each one a long-tail landing
page ("neck pain physio Lucan", "shockwave therapy Dublin") that the current site has no equivalent
for. Submit a fresh sitemap after launch.

Two existing blog URLs are linked out to the live site rather than migrated, pending the decision
above. The two PDFs still point at `cityphysio.ie/s/…`; rehost them alongside the site at launch.

---

## Final platform options

Pricing checked October 2026 — **verify before committing**, these change.

| | Owner editing | Functionality | Maintenance | Migration | Recurring cost |
|---|---|---|---|---|---|
| **Stay on Squarespace** | Familiar; no retraining | Everything already works; Cliniko embeds fine | Squarespace handles it | None | Existing plan |
| **Static (GitHub Pages / Netlify / Cloudflare Pages)** | Needs a CMS bolted on, or edits via JSON — not owner-friendly alone | Fastest; forms need a third party (Formspree, Netlify Forms) | Near zero | Already done — this repo | Free–€20/mo |
| **Static + headless CMS** (Netlify + Decap, Cloudflare + Sanity) | Good once configured | Full control | Low, but someone must own it | Moderate setup | €0–25/mo |
| **WordPress** (managed host) | Very familiar; large plugin ecosystem | Anything, via plugins | Highest — updates, security, plugin rot | Full rebuild | €15–40/mo hosting |

**Recommendation.** You do not need to decide now, and the content model here is portable to any of
them. But be honest about who will maintain it: a static site is the fastest and cheapest, and it is
the wrong answer if nobody at the clinic can edit JSON. If reception needs to change a class time
without ringing a developer, go static-plus-CMS or stay on Squarespace — and note that **most of the
problems found in the audit are content and configuration problems, not platform problems.** The
hours contradiction, the filename `alt` text, the missing page titles and the empty structured data
can all be fixed on Squarespace this week, without any rebuild.

---

## Design direction

**Anatomical atlas.** The visual language of a medical plate: line anatomy, plate numbers,
keyed labels with leader lines, figure captions, specimen-label typography. Ink ground, aged
paper, and a key green that marks every point of interest.

The reasoning: a physiotherapist's job is knowing what is under the skin, so a site that looks
like an atlas is a visual argument for expertise rather than decoration. It also solves the
imagery problem honestly — all artwork is original and generated by `tools/plates.js`, so
nothing is licensed, traced, or pretending to be a photograph of this clinic.

**The hero is the navigation.** A keyed anatomical figure carries fifteen numbered markers; the
index beneath it uses the same numbers. Hovering either one lights the other (CSS `:has()`, no
JavaScript). A patient points at what hurts and lands on a page that ends in a booking link.

**Type is two families, both doing a specific job.** Newsreader sets everything that is read —
headlines, clinical prose, figure captions in italic. IBM Plex Mono sets everything that is
*labelled* — plate numbers, keys, navigation, buttons, field labels. That split is what makes it
read as a scientific publication rather than a brochure.

**Colour** comes from the logo: `#184090` blue and `#008850` green, against an ink field
`#0a1628` and aged paper `#f7f4ec` rather than white. Dark mode supported.

Two alternatives were developed and rejected: an interactive SVG body map (hostile to keyboard
and screen-reader users, cramped at 375px, and it buries eight of the nine services), and a warm
Scandinavian editorial treatment (approachable, but close to a generic template and weaker on the
diagnostic positioning).

**Distinctive features**, each doing a job no competitor site inspected during research was doing:

1. **The keyed plate** — figure and index as one instrument, resolving to a booking link.
2. **"What it probably isn't"** — a rule-out line that demonstrates diagnostic discrimination
   before the patient pays anything. Promise #1 rendered as content design.
3. **One honest safety panel** — telling people plainly when *not* to come to physiotherapy.
   Promise #3, and what makes a symptom tool trustworthy rather than a liability.

### Regenerating the artwork

```bash
node tools/plates.js   # -> assets/img/plates/*.svg + src/data/plates.json
node build.js
```

`tools/plates.js` draws everything from parameters — bone widths, vertebra counts, rib spread,
key positions. Tune the numbers at the top of each builder rather than editing path data. The
plates are inlined into the pages at build time, so they cost no extra requests and inherit
`currentColor` in both themes.

## Deploying

`docs/` is committed, so GitHub Pages serves it with no CI.

**Settings → Pages → Source: "Deploy from a branch" → Branch `main`, folder `/docs`.**

All asset and link paths are **relative**, so the same `docs/` works at any base path — a user
page, a project page under any repository name, or a custom domain — with no rebuild and no
`BASE` variable. Renaming the repository will not break it. `scripts/verify-portable.js` proves
this on every run.

`.github/workflows/pages.yml` is included as an alternative if you'd rather not commit build output;
it sets `BASE` from the repository name automatically. Leave it disabled otherwise.

**Do not deploy this to cityphysio.ie.** It is a concept, it is not clinically signed off, and its
contact form goes nowhere.
