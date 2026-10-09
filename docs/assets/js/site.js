/* CityPhysio redesign concept — progressive enhancement only.
   Nothing here is required to read the site or contact the clinic. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------- mobile navigation */
  var nav = document.getElementById('nav');
  var openBtn = document.querySelector('[data-nav-open]');
  var closeBtn = document.querySelector('[data-nav-close]');
  var lastFocused = null;

  function focusables() {
    return nav ? Array.prototype.slice.call(
      nav.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (el) { return el.offsetParent !== null; }) : [];
  }

  function openNav() {
    if (!nav) return;
    lastFocused = document.activeElement;
    nav.classList.add('nav--open');
    document.body.classList.add('nav-locked');
    openBtn.setAttribute('aria-expanded', 'true');
    var f = focusables();
    if (f.length) f[0].focus();
    document.addEventListener('keydown', onNavKey);
  }

  function closeNav() {
    if (!nav) return;
    nav.classList.remove('nav--open');
    document.body.classList.remove('nav-locked');
    openBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onNavKey);
    if (lastFocused) lastFocused.focus();
  }

  function onNavKey(e) {
    if (e.key === 'Escape') { closeNav(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  if (openBtn) openBtn.addEventListener('click', openNav);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);

  // If the viewport grows past the mobile breakpoint while the menu is open, reset it.
  var wide = window.matchMedia('(min-width: 861px)');
  (wide.addEventListener ? wide.addEventListener.bind(wide, 'change') : wide.addListener.bind(wide))(
    function () { if (wide.matches && nav && nav.classList.contains('nav--open')) closeNav(); }
  );

  /* --------------------------------------------------------- form validation
     Real validation. Never a false "message sent" — this concept has no
     authorised destination, so on a valid submit we say exactly that and hand
     the visitor the clinic's real contact routes. */
  var form = document.getElementById('enquiry');
  if (form) {
    var status = document.getElementById('form-status');
    var result = document.getElementById('form-result');

    var rules = [
      { id: 'f-name', err: 'e-name', test: function (v) { return v.trim().length > 1; } },
      { id: 'f-email', err: 'e-email', test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
      { id: 'f-phone', err: 'e-phone', test: function (v) { return v.replace(/[^\d]/g, '').length >= 7; } },
      { id: 'f-service', err: 'e-service', test: function (v) { return v !== ''; } }
    ];

    function validateField(rule) {
      var el = document.getElementById(rule.id);
      if (!el) return true;
      var ok = rule.test(el.value);
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      el.setAttribute('aria-describedby', ok ? '' : rule.err);
      return ok;
    }

    rules.forEach(function (rule) {
      var el = document.getElementById(rule.id);
      if (!el) return;
      // Validate on blur only once touched, so we don't shout at people mid-typing.
      el.addEventListener('blur', function () { validateField(rule); });
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') === 'true') validateField(rule);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var failed = rules.filter(function (r) { return !validateField(r); });

      if (failed.length) {
        status.textContent = failed.length + ' field' + (failed.length > 1 ? 's need' : ' needs') + ' attention.';
        var firstBad = document.getElementById(failed[0].id);
        if (firstBad) {
          firstBad.focus();
          firstBad.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
        return;
      }

      status.textContent = 'Form is valid. This demonstration form does not send messages.';
      result.hidden = false;
      result.innerHTML =
        '<div class="caution" role="alert" style="margin-top:var(--s5)">' +
        '<h3 class="caution__title">Nothing was sent &mdash; and that is deliberate.</h3>' +
        '<p>Your details passed validation, but this is an unofficial redesign concept with no ' +
        'connection to CityPhysio, so there is nowhere legitimate to send them. Nothing you typed ' +
        'has left your browser.</p>' +
        '<p>To actually reach the clinic: ' +
        '<a href="tel:+35316280855">call (01) 628 0855</a>, ' +
        '<a href="mailto:info@cityphysio.ie">email info@cityphysio.ie</a>, ' +
        'or <a href="https://mjphysioltd-ta-cityphysio.eu1.cliniko.com/bookings" rel="noopener">book online</a>.</p>' +
        '</div>';
      result.querySelector('.caution').setAttribute('tabindex', '-1');
      result.querySelector('.caution').focus();
    });
  }

  /* ------------------------------------------------------------- reveal
     Opt-in, cheap, and fully skipped when reduced motion is requested. */
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.band, .stage, .index-group');
    if (targets.length) {
      targets.forEach(function (el) { el.classList.add('reveal'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
      targets.forEach(function (el) { io.observe(el); });
    }
  }
})();
