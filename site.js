/* site.js — السلوك المشترك بين كل الصفحات: المظهر، النجوم، الساكورا، حساب طور القمر، زورو */
(() => {
  'use strict';

  const THEMES = ['dark', 'light', 'sakura'];
  const BAR_COLORS = { dark: '#0B1026', light: '#FF6B3D', sakura: '#FFF0F5' };
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


  /* ---------- الأيقونات (SVG مضمّنة بدل Font Awesome: لا اعتماد على شبكة خارجية) ---------- */
  const ICON_PATHS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    gamepad: '<path d="M7 8h10a4 4 0 0 1 4 4v1.5a3 3 0 0 1-5.2 2L14.5 14h-5l-1.3 1.5A3 3 0 0 1 3 13.5V12a4 4 0 0 1 4-4z"/><path d="M7.5 10.2v3.6M5.7 12h3.6M16 11.2h.01M18 12.8h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    cloud: '<path d="M7.5 18.5h9a4 4 0 0 0 .5-7.97 5.5 5.5 0 0 0-10.5 1.2 3.5 3.5 0 0 0 1 6.77z"/>',
    flower: '<circle cx="12" cy="6.6" r="3.1"/><circle cx="17.1" cy="10.3" r="3.1"/><circle cx="15.2" cy="16.3" r="3.1"/><circle cx="8.8" cy="16.3" r="3.1"/><circle cx="6.9" cy="10.3" r="3.1"/>',
    heart: '<path d="M12 20.5s-8-4.7-8-10.3A4.7 4.7 0 0 1 12 7.6a4.7 4.7 0 0 1 8 2.6c0 5.6-8 10.3-8 10.3z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>'
  };
  const iconHTML = (name, cls = '') =>
    `<svg class="ic ic-${name} ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name] || ''}</svg>`;
  const iconEl = name => { const t = document.createElement('template'); t.innerHTML = iconHTML(name); return t.content.firstChild; };
  const FA_MAP = { 'fa-home': 'home', 'fa-moon': 'moon', 'fa-gamepad': 'gamepad', 'fa-heart': 'heart',
    'fa-clock': 'clock', 'fa-pause': 'pause', 'fa-play': 'play', 'fa-chevron-down': 'chevron' };
  function hydrateIcons(root = document) {
    root.querySelectorAll('i.fas').forEach(i => {
      const key = [...i.classList].find(c => FA_MAP[c]);
      if (key) i.replaceWith(iconEl(FA_MAP[key]));
    });
  }

  const THEME_INFO = {
    dark:   { icon: 'moon',   name: 'داكن' },
    light:  { icon: 'sun',    name: 'فاتح' },
    sakura: { icon: 'flower', name: 'ساكورا' }
  };

  /* ---------- شريط التبويب ---------- */
  function setupNav() {
    const nav = $('.nav-container');
    if (!nav) return;
    nav.setAttribute('aria-label', 'التنقل الرئيسي');
    nav.querySelectorAll('.nav-link').forEach(a => {
      if (a.classList.contains('active')) a.setAttribute('aria-current', 'page');
      const text = [...a.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
      text.forEach(n => { const s = document.createElement('span'); s.className = 'tab-label'; s.textContent = n.textContent.trim(); n.replaceWith(s); });
    });
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
    const btn = $('#themeToggle');
    if (btn) {
      const info = THEME_INFO[theme];
      btn.innerHTML = iconHTML(info.icon);
      btn.setAttribute('aria-label', 'المظهر الحالي: ' + info.name + '. اضغط للتبديل');
      btn.title = 'المظهر: ' + info.name;
    }
  }

  function setupTheme() {
    buildSky();
    hydrateIcons();
    setupNav();
    applyTheme(currentTheme(), false);
    const btn = $('#themeToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const next = THEMES[(THEMES.indexOf(document.body.dataset.theme) + 1) % THEMES.length];
        applyTheme(next, true);
      });
    }
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { if (!THEMES.includes(store.get('theme'))) applyTheme(currentTheme(), false); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
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
    'new':             { file: 'newMoon.png',        name: 'محاق' },
    'waxing crescent': { file: 'waxingCrescent.png', name: 'هلال متزايد' },
    'first quarter':   { file: 'firstQuarter.png',   name: 'تربيع أول' },
    'waxing gibbous':  { file: 'waxingGibbous.png',  name: 'أحدب متزايد' },
    'full':            { file: 'fullMoon.png',       name: 'بدر' },
    'waning gibbous':  { file: 'waningGibbous.png',  name: 'أحدب متناقص' },
    'last quarter':    { file: 'lastQuarter.png',    name: 'تربيع أخير' },
    'waning crescent': { file: 'waningCrescent.png', name: 'هلال متناقص' }
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
    const AVOID = 'a,button,h1,.nav-container,.moon-container,.age-details,.ayah-container,.qp,.home-moon';
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

  window.SiteKit = { icon: iconHTML, hydrateIcons, moonInfo, moonSVG, showMoon, PHASES, ar, zoroPet, store };
  setupTheme();

  /* ---------- PWA: عامل الخدمة (يحتاج HTTPS أو localhost) ---------- */
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* غير مدعوم أو محجوب */ }); });
  }
})();
