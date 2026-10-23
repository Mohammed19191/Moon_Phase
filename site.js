/* site.js — السلوك المشترك بين كل الصفحات: المظهر، النجوم، الساكورا، حساب طور القمر، زورو */
(() => {
  'use strict';

  const THEMES = ['dark', 'light', 'sakura'];
  const BAR_COLORS = { dark: '#0B1026', light: '#FF512F', sakura: '#FFF0F5' };
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* التخزين غير متاح */ } }
  };

  /* ---------- أنماط الطبقة المشتركة ---------- */
  const style = document.createElement('style');
  style.textContent = `
    .sky{position:fixed;inset:0;pointer-events:none;z-index:0;transition:opacity .5s}
    [data-theme="light"] .sky,[data-theme="sakura"] .sky{opacity:0}
    .sky i{position:absolute;border-radius:50%;background:var(--star-color,#fff);
      animation:sky-twinkle var(--d,4s) ease-in-out var(--l,0s) infinite}
    .sky b{position:absolute;width:100px;height:1px;background:linear-gradient(90deg,#fff,transparent);
      opacity:0;animation:sky-shoot 5s linear forwards}
    @keyframes sky-twinkle{0%,100%{opacity:.2}50%{opacity:1}}
    @keyframes sky-shoot{0%{transform:translate(0,0) rotate(45deg);opacity:1}
      100%{transform:translate(-500px,500px) rotate(45deg);opacity:0}}
    .theme-toggle:focus-visible,.nav-link:focus-visible,.zoro-image:focus-visible{outline:2px solid var(--accent-color);outline-offset:3px}
    @media (prefers-reduced-motion:reduce){
      *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
        transition-duration:.01ms!important;scroll-behavior:auto!important}
      .sky i{opacity:.7}
    }`;
  document.head.appendChild(style);

  /* ---------- النجوم والشهب (طبقة واحدة تُنشأ مرة واحدة) ---------- */
  function buildSky() {
    if ($('.sky')) return;
    const sky = document.createElement('div');
    sky.className = 'sky';
    sky.setAttribute('aria-hidden', 'true');
    const frag = document.createDocumentFragment();
    const count = innerWidth < 600 ? 100 : 180;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('i');
      const size = 0.8 + Math.random() * 1.8;
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;` +
        `width:${size}px;height:${size}px;--d:${2 + Math.random() * 3}s;--l:${Math.random() * 2}s`;
      frag.appendChild(s);
    }
    sky.appendChild(frag);
    document.body.prepend(sky);
    if (!reduce) {
      setInterval(() => {
        if (document.hidden || document.body.dataset.theme !== 'dark') return;
        const b = document.createElement('b');
        b.style.top = Math.random() * 50 + '%';
        b.style.right = '0';
        sky.appendChild(b);
        b.addEventListener('animationend', () => b.remove());
      }, 8000);
    }
  }

  /* ---------- أوراق الساكورا ---------- */
  function buildLeaves() {
    document.querySelectorAll('.sakura-leaf').forEach(l => l.remove());
    if (document.body.dataset.theme !== 'sakura' || reduce) return;
    for (let i = 0; i < 20; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'sakura-leaf';
      leaf.style.left = `${Math.random() * 100}%`;
      leaf.style.animationDuration = `${Math.random() * 10 + 10}s`;
      leaf.style.animationDelay = `${Math.random() * 5}s`;
      document.body.appendChild(leaf);
    }
  }

  /* ---------- المظهر ---------- */
  function currentTheme() {
    const t = store.get('theme');
    if (THEMES.includes(t)) return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, save) {
    document.body.setAttribute('data-theme', theme);
    if (save) store.set('theme', theme);
    let meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BAR_COLORS[theme]);
    buildLeaves();
  }

  function setupTheme() {
    buildSky();
    applyTheme(currentTheme(), false);
    const btn = $('#themeToggle');
    if (btn) {
      btn.setAttribute('aria-label', 'تغيير المظهر');
      btn.addEventListener('click', () => {
        const next = THEMES[(THEMES.indexOf(document.body.dataset.theme) + 1) % THEMES.length];
        applyTheme(next, true);
      });
    }
    addEventListener('storage', e => { if (e.key === 'theme' && THEMES.includes(e.newValue)) applyTheme(e.newValue, false); });
  }

  /* ---------- حساب طور القمر (خوارزمية Meeus، الفصل 49 — دقيقة لدقائق معدودة) ---------- */
  const SYN = 29.530588861;
  const RAD = Math.PI / 180;

  function newMoonJDE(k) {
    const T = k / 1236.85;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * RAD;
    const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3) * RAD;
    const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3) * RAD;
    const s = Math.sin;
    return 2451550.09766 + SYN * k + 0.00015437 * T * T - 0.00000015 * T ** 3
      - 0.40720 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F)
      + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M)
      - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M)
      - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
      - 0.00024 * E * s(2 * Mp - M);
  }

  const PHASES = {
    'new':             { file: 'newMoon.png',        name: 'محاق (New Moon)' },
    'waxing crescent': { file: 'waxingCrescent.png', name: 'هلال متزايد (Waxing Crescent)' },
    'first quarter':   { file: 'firstQuarter.png',   name: 'تربيع أول (First Quarter)' },
    'waxing gibbous':  { file: 'waxingGibbous.png',  name: 'أحدب متزايد (Waxing Gibbous)' },
    'full':            { file: 'fullMoon.png',       name: 'بدر (Full Moon)' },
    'waning gibbous':  { file: 'waningGibbous.png',  name: 'أحدب متناقص (Waning Gibbous)' },
    'last quarter':    { file: 'lastQuarter.png',    name: 'تربيع أخير (Last Quarter)' },
    'waning crescent': { file: 'waningCrescent.png', name: 'هلال متناقص (Waning Crescent)' }
  };
  const ORDER = ['new', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full',
    'waning gibbous', 'last quarter', 'waning crescent'];

  function moonInfo(date = new Date()) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    let k = Math.floor((jd - 2451550.09766) / SYN);
    let a = newMoonJDE(k);
    if (a > jd) { k--; a = newMoonJDE(k); }
    let b = newMoonJDE(k + 1);
    if (b <= jd) { k++; a = b; b = newMoonJDE(k + 1); }
    const age = jd - a;
    const fraction = age / (b - a);                     // 0 = محاق، 0.5 = بدر
    const illum = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
    const key = ORDER[Math.floor(((fraction + 1 / 16) % 1) * 8)];
    return { age, fraction, illum, key, phase: PHASES[key] };
  }

  /* صورة بديلة تُرسم محليًا إن لم يُحمَّل ملف PNG (نصف الكرة الشمالي: المتزايد مضاء من اليمين) */
  function moonSVG(f) {
    const r = 48, c = Math.cos(2 * Math.PI * f), rx = (r * Math.abs(c)).toFixed(2);
    const waxing = f < 0.5, crescent = c > 0;
    const outer = waxing ? 1 : 0;
    const inner = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    const lit = `M50 2 A${r} ${r} 0 0 ${outer} 50 98 A${rx} ${r} 0 0 ${inner} 50 2Z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<circle cx="50" cy="50" r="${r}" fill="#1d2440" stroke="#8E9AAF" stroke-opacity=".4"/>` +
      `<path d="${lit}" fill="#f1ede0"/></svg>`;
  }

  /* يضبط عنصر <img> على صورة الطور، وعند فشل التحميل يستخدم الرسم المحلي */
  function showMoon(img, info, dir = 'images1/') {
    img.alt = 'شكل القمر: ' + info.phase.name;
    img.onerror = () => {
      img.onerror = null;
      img.src = 'data:image/svg+xml,' + encodeURIComponent(moonSVG(info.fraction));
    };
    img.src = dir + info.phase.file;
  }

  const ar = (n, digits = 0) => n.toLocaleString('ar-SA', { maximumFractionDigits: digits });

  /* ---------- زورو الطائر ---------- */
  function zoroPet() {
    const box = $('.zoro-container'), img = $('.zoro-image');
    if (!box || !img) return;
    const counter = $('.click-counter'), span = $('#zoroClicks');
    const AVOID = 'a,button,h1,.nav-container,.moon-container,.age-details,.ayah-container,.home-moon';
    const SIZE = 80, PAD = 20;
    let clicks = parseInt(store.get('zoroClicks'), 10) || 0;
    let clicked = false;

    if (clicks > 0) { span.textContent = clicks; counter.style.display = 'flex'; }
    img.addEventListener('error', () => box.remove());

    const isSafe = (x, y) => [...document.querySelectorAll(AVOID)].every(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return true;
      return x + SIZE + PAD < r.left || x - PAD > r.right || y + SIZE + PAD < r.top || y - PAD > r.bottom;
    });

    function reposition() {
      const maxX = Math.max(0, innerWidth - 100), maxY = Math.max(0, innerHeight - 100);
      let x, y, tries = 0;
      do { x = Math.random() * maxX; y = Math.random() * maxY; tries++; } while (!isSafe(x, y) && tries < 50);
      if (tries >= 50) { x = Math.max(0, maxX - 100); y = innerHeight / 2; }
      box.style.left = x + 'px';
      box.style.top = y + 'px';
    }

    function show() {
      box.style.opacity = '1';
      if (!reduce) box.style.animation = 'floatZoro 5s ease-in-out infinite';
      if (!clicked) reposition();
    }

    img.addEventListener('click', e => {
      clicks++;
      clicked = true;
      store.set('zoroClicks', clicks);
      span.textContent = clicks;
      counter.style.display = 'flex';
      const heart = document.createElement('div');
      heart.className = 'heart';
      heart.textContent = '❤️';
      heart.style.left = e.offsetX + 'px';
      heart.style.top = e.offsetY + 'px';
      box.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
      show();
    });

    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (!clicked) reposition(); }, 200); });
    setTimeout(show, 5000);
  }

  window.SiteKit = { moonInfo, moonSVG, showMoon, PHASES, ar, zoroPet, store };
  setupTheme();
})();
