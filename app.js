/* app.js — الموجّه (Router): صفحة واحدة بثلاث شاشات، تنقّل بالتجزئة (#/home · #/age · #/game)
   - تُحمَّل كل الشاشات مرة واحدة، والتبديل بينها فوري مع انتقال متحرك (View Transitions) حيث يُدعم.
   - اتجاه الحركة يتبع ترتيب التبويبات، والقمر ينتقل بين الرئيسية وعمر القمر كعنصر مشترك. */
(() => {
  'use strict';
  const VIEWS = ['home', 'age', 'game'];
  const TITLES = { home: 'شكل القمر اليوم', age: 'عمر القمر', game: 'إلى القمر' };
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const els = Object.fromEntries(VIEWS.map(v => [v, document.getElementById('view-' + v)]));
  const links = [...document.querySelectorAll('.nav-link[data-view]')];
  let current = null;

  const fromHash = () => {
    const h = location.hash.replace(/^#\/?/, '');
    return VIEWS.includes(h) ? h : 'home';
  };

  function riseOnce() {                       // ظهور متتابع خفيف حيث لا يتوفر انتقال المتصفح
    root.classList.add('rise-on');
    clearTimeout(riseOnce.t);
    riseOnce.t = setTimeout(() => root.classList.remove('rise-on'), 900);
  }

  function apply(view, prev, moveFocus) {
    VIEWS.forEach(v => { els[v].hidden = v !== view; });
    links.forEach(a => {
      const on = a.dataset.view === view;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = TITLES[view];
    root.dataset.view = view;
    scrollTo(0, 0);
    if (window.GameView) { if (prev === 'game' && view !== 'game') GameView.deactivate(); if (view === 'game') GameView.activate(); }
    document.dispatchEvent(new CustomEvent('viewchange', { detail: { view, prev } }));
    if (moveFocus) { const h = els[view].querySelector('h1'); if (h) h.focus({ preventScroll: true }); }   // قارئ الشاشة يعلن الشاشة الجديدة
  }

  function show(view, animate) {
    if (view === current) return;
    const dir = current === null ? 0 : (VIEWS.indexOf(view) > VIEWS.indexOf(current) ? 1 : -1);
    const prev = current;
    current = view;
    if (animate && dir && document.startViewTransition && !reduce.matches) {
      root.classList.add(dir > 0 ? 'vt-fwd' : 'vt-back');
      const t = document.startViewTransition(() => apply(view, prev, true));
      t.finished.catch(() => {}).finally(() => root.classList.remove('vt-fwd', 'vt-back'));
    } else {
      apply(view, prev, animate);
      if (!reduce.matches) riseOnce();
    }
  }

  addEventListener('hashchange', () => show(fromHash(), true));
  show(fromHash(), false);
  window.App = { show, VIEWS };
})();
