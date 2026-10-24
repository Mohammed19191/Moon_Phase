/* site.js — السلوك المشترك بين كل الصفحات: المظهر، النجوم، الساكورا، حساب طور القمر، زورو */
(() => {
  'use strict';

  const THEMES = ['dark', 'light', 'sakura', 'burgundy'];
  const BAR_COLORS = { dark: '#0B1026', light: '#5E9FE3', sakura: '#FFF0F5', burgundy: '#5C0A1F' };
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
    @keyframes sky-shoot{0%{transform:translate(0,0) rotate(-45deg);opacity:1}
      100%{transform:translate(-500px,500px) rotate(-45deg);opacity:0}}
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
        if (document.hidden || !['dark', 'burgundy'].includes(document.body.dataset.theme)) return;
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
    gem: '<path d="M6.5 3.5h11l4 5.5L12 21 2.5 9z"/><path d="M2.5 9h19M9 3.5 7.5 9 12 21M15 3.5 16.5 9 12 21"/>',
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
    sakura: { icon: 'flower', name: 'ساكورا' },
    burgundy: { icon: 'gem', name: 'بورغندي' }
  };

  /* ---------- شريط التبويب ---------- */
  function setupNav() {
    const nav = $('.nav-container');
    if (!nav) return;
    // زر المظهر دائرة مستقلة بجانب شريط التبويبات (كزر البحث بجانب الشريط في iOS 26)
    const toggle = $('#themeToggle');
    if (toggle && !nav.closest('.nav-dock')) {
      const dock = document.createElement('div');
      dock.className = 'nav-dock';
      nav.before(dock);
      dock.append(nav, toggle);                        // في اتجاه العربية: الشريط يمينًا والزر يساره
    }
    nav.setAttribute('aria-label', 'التنقل الرئيسي');
    nav.querySelectorAll('.nav-link').forEach(a => {
      if (a.classList.contains('active')) a.setAttribute('aria-current', 'page');
      // الضغط على التبويب الحالي لا يعيد تحميل الصفحة: يعيدك إلى أعلاها (كما في iOS)
      a.addEventListener('click', e => {
        if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
      });
      const text = [...a.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
      text.forEach(n => { const s = document.createElement('span'); s.className = 'tab-label'; s.textContent = n.textContent.trim(); n.replaceWith(s); });
    });
  }

  /* ---------- المظهر ---------- */
  // من لم يختر مظهرًا يتبع مظهر جهازه (فاتح أو داكن)
  let mode = 'dark';
  function currentTheme() {
    const t = store.get('theme');
    if (THEMES.includes(t)) return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, save) {
    mode = theme;
    const body = document.body;
    body.setAttribute('data-theme', theme);
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
      // الضغط على زر المظهر: يتحرك الزر نحو الشريط ويلتصق به، فيأخذ الشريط المظهر الجديد، ثم يعود الزر إلى مكانه.
      // تبديل المظهر نفسه بتلاشٍ متقاطع ناعم (View Transitions) حيث يُدعم
      let busy = false;
      /* اندماج كقطرتي ماء: طبقة خلف الشريط والزر فيها شكلان بمقاسهما، عليها مرشح «لزوجة»
         (تمويه ثم حدّ حاد للشفافية)، فحين يقترب الشكلان ينشأ بينهما عنق سائل يلتحم ثم يتمطط وينقطع */
      function goo(dock, nav) {
        let layer = dock.querySelector(':scope > .dock-goo');
        if (!layer) {
          if (!document.getElementById('dock-goo-f')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('aria-hidden', 'true');
            svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
            svg.innerHTML = '<filter id="dock-goo-f" x="-20%" y="-60%" width="140%" height="220%">' +
              '<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>' +
              '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -8"/></filter>';
            document.body.appendChild(svg);
          }
          layer = document.createElement('div');
          layer.className = 'dock-goo';
          layer.setAttribute('aria-hidden', 'true');
          layer.innerHTML = '<i class="goo-nav"></i><i class="goo-btn"></i>';
          dock.prepend(layer);
        }
        const d = dock.getBoundingClientRect();
        const put = (el, r, radius) => Object.assign(el.style, { left: (r.left - d.left) + 'px', top: (r.top - d.top) + 'px',
          width: r.width + 'px', height: r.height + 'px', borderRadius: radius });
        put(layer.querySelector('.goo-nav'), nav.getBoundingClientRect(), getComputedStyle(nav).borderTopLeftRadius);
        put(layer.querySelector('.goo-btn'), btn.getBoundingClientRect(), '50%');
        return layer;
      }
      /* المظهر الجديد ينبثق من الزر والشريط معًا كأنهما زر واحد: يملأ الشكل المندمج أولًا،
         ثم يتمدد من حوافه كلها بشكله المستدير حتى يغطي الصفحة. الصفحة كلها صورة واحدة أثناء الانتقال */
      const swap = (next, origin) => {
        if (!document.startViewTransition || reduce) { applyTheme(next, true); return Promise.resolve(); }
        if (!origin) return document.startViewTransition(() => applyTheme(next, true)).finished.catch(() => {});
        document.documentElement.classList.add("theme-reveal");
        const t = document.startViewTransition(() => applyTheme(next, true));
        t.ready.then(() => {
          const r = origin, W = innerWidth, H = innerHeight, rad = Math.min(r.height / 2, 36);
          const box = (k, round) => `inset(${r.top * k}px ${(W - r.right) * k}px ${(H - r.bottom) * k}px ${r.left * k}px round ${round}px)`;
          document.documentElement.animate(
            { clipPath: [box(1, rad), box(0.82, rad * 1.6), box(0, 0)], offset: [0, 0.3, 1] },
            { duration: 900, easing: 'cubic-bezier(.5, 0, .25, 1)', pseudoElement: '::view-transition-new(root)' });
        }).catch(() => {});
        return t.finished.catch(() => {}).finally(() => document.documentElement.classList.remove("theme-reveal"));
      };
      btn.addEventListener('click', () => {
        if (busy) return;
        const next = THEMES[(THEMES.indexOf(mode) + 1) % THEMES.length];
        const dock = btn.closest('.nav-dock'), nav = $('.nav-container');
        if (reduce || !dock || !nav) { swap(next); return; }
        busy = true;
        const n = nav.getBoundingClientRect(), b = btn.getBoundingClientRect();
        const dir = n.left >= b.right ? 1 : -1;                         // الشريط يمين الزر في اتجاه العربية
        const gap = dir > 0 ? n.left - b.right : b.left - n.right;
        // على الحاوية لا على العنصرين، لترثها الطبقة السائلة أيضًا
        dock.style.setProperty('--dock-dx', dir * (gap + 14) + 'px');  // يتداخل مع حافة الشريط ١٤px
        dock.style.setProperty('--dock-nx', -dir * 5 + 'px');          // والشريط يتحرك نحوه قليلًا
        goo(dock, nav);
        dock.classList.add('is-goo');
        requestAnimationFrame(() => dock.classList.add('is-merging'));
        setTimeout(() => {
          // منبع الانبثاق: الشكل المندمج كله (الزر في موضع التصاقه مع الشريط)
          const bb = btn.getBoundingClientRect(), nb = nav.getBoundingClientRect();
          const top = Math.min(bb.top, nb.top), bottom = Math.max(bb.bottom, nb.bottom);
          swap(next, { top, bottom, left: Math.min(bb.left, nb.left), right: Math.max(bb.right, nb.right), height: bottom - top }).then(() => {
            dock.classList.remove('is-merging');                        // تبتعد القطرتان فيتمطط العنق ثم ينقطع
            setTimeout(() => { dock.classList.remove('is-goo'); busy = false; }, 640);
          });
        }, 320);
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
    'new':             { file: 'newMoon.webp',        name: 'محاق' },
    'waxing crescent': { file: 'waxingCrescent.webp', name: 'هلال متزايد' },
    'first quarter':   { file: 'firstQuarter.webp',   name: 'تربيع أول' },
    'waxing gibbous':  { file: 'waxingGibbous.webp',  name: 'أحدب متزايد' },
    'full':            { file: 'fullMoon.webp',       name: 'بدر' },
    'waning gibbous':  { file: 'waningGibbous.webp',  name: 'أحدب متناقص' },
    'last quarter':    { file: 'lastQuarter.webp',    name: 'تربيع أخير' },
    'waning crescent': { file: 'waningCrescent.webp', name: 'هلال متناقص' }
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

  // الفاصلة العشرية العربية «٫» يرسمها خط النظام كحرف «ر»، فنكتب «,» بدلها (١٣,٧)
  const ar = (n, digits = 0) => n.toLocaleString('ar-SA', { maximumFractionDigits: digits }).replace(/\u066B/g, ',');

  /* ---------- زورو الطائر ---------- */
  function zoroPet() {
    const box = $('.zoro-container'), img = $('.zoro-image');
    if (!box || !img || box.dataset.pet) return;          // تستدعيه شاشتان: يُهيّأ مرة واحدة فقط
    box.dataset.pet = '1';
    const counter = $('.click-counter'), span = $('#zoroClicks');
    // لا يغطي زورو نصًا ولا زرًا ولا القمر؛ ويجوز أن يطير فوق المساحات الفارغة من البطاقات.
    // عناصر التحكم تُتجنّب بإطارها، والنصوص بحدود كلماتها فقط.
    const BOXES = 'a,button,input,select,.nav-container,.theme-toggle,.click-counter,#homeMoon,#moonImage,.moon3d,.qp-seek,.age-card,#birthMoonImg';
    const TEXTS = 'h1,h2,p,label,.home-moon-name,.home-moon-meta,.moon3d-hint,.phase-name,.phase-meta,.qp-times,.qp-qari-label,.qp-note';
    const range = document.createRange();
    const rects = () => [
      ...[...document.querySelectorAll(BOXES)].map(el => el.getBoundingClientRect()),
      ...[...document.querySelectorAll(TEXTS)].map(el => { range.selectNodeContents(el); return range.getBoundingClientRect(); })
    ];
    const GAP = 6;
    const dims = () => { const cs = getComputedStyle(box);
      return { S: box.offsetWidth || 80, X: parseFloat(cs.getPropertyValue('--zx')) || 20, Y: parseFloat(cs.getPropertyValue('--zy')) || 40 }; };
    let clicks = parseInt(store.get('zoroClicks'), 10) || 0;
    let clicked = false, shown = false, pos = null;

    if (clicks > 0) { span.textContent = clicks; counter.style.display = 'flex'; }
    img.addEventListener('error', () => box.remove());

    // يحسب مجال حركة الطفو كاملًا (٢٠px جانبيًا و٤٠px للأعلى) حتى لا يلامس زورو أي نص أثناء طيرانه
    const isSafe = (x, y) => { const { S, X, Y } = dims(); return rects().every(r => {
      if (!r.width || !r.height) return true;
      const L = x - X - GAP, R = x + S + X + GAP, T = y - Y - GAP, B = y + S + GAP;
      return R < r.left || L > r.right || B < r.top || T > r.bottom;
    }); };

    function reposition() {
      const { S, X, Y } = dims();
      const minX = X + 4, maxX = Math.max(minX, innerWidth - S - X - 4);
      const minY = Y + 8, maxY = Math.max(minY, innerHeight - S - 8);
      for (let i = 0; i < 200; i++) {
        const x = minX + Math.random() * (maxX - minX), y = minY + Math.random() * (maxY - minY);
        if (isSafe(x, y)) {
          pos = { x, y };
          box.style.left = x + 'px'; box.style.top = y + 'px';
          box.style.opacity = shown ? '1' : box.style.opacity;
          return true;
        }
      }
      pos = null;
      box.style.opacity = '0';                            // لا مكان خاليًا: يختفي بدل أن يغطي المحتوى
      return false;
    }

    function show() {
      shown = true;
      box.style.opacity = '1';
      if (!reduce) box.style.animation = 'floatZoro 5s ease-in-out infinite';
      if (!clicked || !pos) reposition();
    }

    // المحتوى يتحرك تحته (التمرير، تبديل الشاشة، عناصر تظهر لاحقًا): إن صار فوق شيء ينتقل إلى مكان خالٍ
    function guard() {
      if (!shown || document.hidden) return;
      if (!pos || !isSafe(pos.x, pos.y)) reposition();
    }
    let gt;
    const soon = () => { clearTimeout(gt); gt = setTimeout(guard, 160); };
    addEventListener('scroll', soon, { passive: true });
    document.addEventListener('viewchange', soon);
    setInterval(guard, 3000);

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

    addEventListener('resize', soon);
    setTimeout(show, 5000);
  }

  window.SiteKit = { icon: iconHTML, hydrateIcons, moonInfo, moonSVG, showMoon, PHASES, ar, zoroPet, store };
  setupTheme();

  /* ---------- PWA: عامل الخدمة (يحتاج HTTPS أو localhost) ---------- */
  if ('serviceWorker' in navigator) {
    // عند تفعيل نسخة جديدة من عامل الخدمة تُعاد الصفحة مرة واحدة لتأخذ آخر الملفات
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* غير مدعوم أو محجوب */ }); });
  }
})();
