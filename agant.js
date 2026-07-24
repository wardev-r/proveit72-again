/* ───────────────────────────────────────────────────────────────
   THE agANT — one place to light him up across all of 72.

   HOW TO TURN HIM ON:
   1. Host each pose on Cloudflare (Images or R2), copy the URL.
   2. Paste it next to the matching pose in POSES below.
   That's it. Every page that references that pose shows him instantly.
   An empty string = that slot stays clean (NO broken image ever).

   HOW HE GETS PLACED:
   • Static:  any element with  data-agant="closed"  gets him auto-mounted.
   • Dynamic: JS-rendered states call  AGANT.mount('closed', hostEl).
   Poses come straight from brand/72-ant.md (the character bible).
   ─────────────────────────────────────────────────────────────── */
(function () {
  // Optional shared prefix, e.g. 'https://imagedelivery.net/<hash>/'
  var BASE = '';

  // pose key → image URL   (fill these once hosted)
  var POSES = {
    boss:      '',  // Boss Stand / Arms Crossed — hero corner, "on duty"
    gate:      '',  // Gatekeeper w/ clipboard — verifying / checking state
    welcome:   '',  // "The line's this way" — onboarding / CTA
    coin:      '',  // Holding the 72 — pricing / payment
    approved:  '',  // Approved / Thumbs Up — payment or call approved
    call:      '',  // On the Phone — connected / in-call
    onit:      '',  // On It / running — loading / processing
    closed:    '',  // Rope's Closed — member offline / not taking calls
    splat:     '',  // SPLAT — time-waster / "pick your brain" spam
    phonebill: '',  // "…did you pay your phone bill?" — call-failed error
    director:  '',  // Director — owner / creator dashboard
    backend:   '',  // Backend (laptop) — member dashboard / settings
    zen:       '',  // Stay Zen — waiting / empty states
    seeya:     '',  // See Ya / Let's Go — call ended, sign-off
    vibe:      ''   // Vibe Check / The Look — 404, "you sure?"
  };

  function url(pose) { var u = POSES[pose]; return u ? (BASE + u) : ''; }
  function has(pose) { return !!url(pose); }

  function el(pose, opts) {
    opts = opts || {};
    var u = url(pose);
    if (!u) return null;
    var img = document.createElement('img');
    img.src = u;
    img.alt = opts.alt || 'the 72 agANT';
    img.className = 'agant agant-' + pose + (opts.className ? ' ' + opts.className : '');
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function mount(pose, target, opts) {
    opts = opts || {};
    var node = el(pose, opts);
    if (!node) return null;
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;
    if (opts.replace) host.innerHTML = '';
    if (opts.prepend && host.firstChild) host.insertBefore(node, host.firstChild);
    else host.appendChild(node);
    return node;
  }

  // Auto-mount every static slot: <div data-agant="closed"></div>
  function scan(root) {
    (root || document).querySelectorAll('[data-agant]').forEach(function (host) {
      if (host.getAttribute('data-agant-done')) return;
      var pose = host.getAttribute('data-agant');
      var node = el(pose, {
        className: host.getAttribute('data-agant-class') || '',
        alt: host.getAttribute('data-agant-alt') || ''
      });
      if (node) { host.appendChild(node); host.setAttribute('data-agant-done', '1'); }
    });
  }

  // Minimal, self-contained styling. Pages can override .agant freely.
  function injectCSS() {
    if (document.getElementById('agant-css')) return;
    var s = document.createElement('style');
    s.id = 'agant-css';
    s.textContent =
      '.agant{display:block;max-width:100%;height:auto;pointer-events:none;user-select:none}' +
      // hero corner, fixed bottom-right, small & unobtrusive
      '.agant-corner{position:fixed;right:14px;bottom:14px;width:96px;z-index:40;' +
      'filter:drop-shadow(0 6px 18px rgba(0,0,0,.45));animation:agantIn .5s ease both}' +
      // inline badge above a state message
      '.agant-badge{width:120px;margin:0 auto 10px}' +
      '@keyframes agantIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
      '@media (max-width:560px){.agant-corner{width:72px;right:10px;bottom:10px}}';
    document.head.appendChild(s);
  }

  window.AGANT = { url: url, has: has, el: el, mount: mount, scan: scan, poses: POSES };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injectCSS(); scan(); });
  } else { injectCSS(); scan(); }
})();
