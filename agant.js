/* ───────────────────────────────────────────────────────────────
   THE agANT — one place to light him up across all of 72.

   HOW TO TURN HIM ON:
   Drop the pose file into /agant/ and name it to match POSES below. That's it —
   every page referencing that pose shows him instantly. SVG is preferred (sharp at
   any size, versioned in the repo, no upload/host step); PNG works the same way.
   A missing file removes itself cleanly — NO broken image, ever.

   HOW HE GETS PLACED:
   • Static:  any element with  data-agant="closed"  gets him auto-mounted.
   • Dynamic: JS-rendered states call  AGANT.mount('closed', hostEl).
   Poses come straight from brand/72-ant.md (the character bible).
   ─────────────────────────────────────────────────────────────── */
(function () {
  // Files live in /agant/<key>.png (served free by Cloudflare Pages from the repo).
  // A missing file removes itself (onerror below) — never a broken-image icon — so
  // every pose is wired now and simply appears the moment you commit its PNG.
  var BASE = '/agant/';

  // pose key → filename in /agant/
  // SVG poses are hand-authored and live in the repo (free, sharp at any size, no
  // upload step). PNG slots stay wired and simply appear the moment a file lands.
  var POSES = {
    boss:      'boss.svg',      // Boss Stand / Arms Crossed — hero corner, "on duty" ✅ LIVE
    gate:      'gate.png',      // "You've got 72." — greeting / verifying
    welcome:   'welcome.png',   // "The line's this way" — onboarding / connecting
    coin:      'coin.png',      // Holding the 72 — pricing / payment
    approved:  'approved.png',  // "Conversation approved." — payment / call captured
    call:      'call.png',      // On the Phone — connected / in-call
    onit:      'onit.png',      // "One moment…" — loading / processing
    closed:    'closed.png',    // "Rope's closed." — member offline
    splat:     'splat.png',     // SPLAT — time-waster / "pick your brain" spam
    phonebill: 'phonebill.png', // "…did you pay your phone bill?" — call not connected
    director:  'director.png',  // Director — owner / creator dashboard
    backend:   'backend.png',   // Backend (laptop) — member dashboard
    zen:       'zen.png',       // Stay Zen — waiting / empty states
    seeya:     'seeya.png',     // See Ya / Let's Go — call ended, sign-off
    vibe:      'vibe.png'       // Vibe Check / The Look — 404, "you sure?"
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
    // Missing pose file → remove cleanly (never a broken-image icon).
    img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
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
