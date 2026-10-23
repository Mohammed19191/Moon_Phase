/* glass.js — زجاج سائل حقيقي (انكسار وحواف لامعة بمؤثر WebGL) لشريط التنقل وزر المظهر.
   - المكتبة: @ybouane/liquidglass 1.0.3 (MIT)، نسخة محلية في vendor/ فلا اعتماد على شبكة خارجية.
   - المكتبة تكسر ما يقع داخل «جذرها» فقط، فنبني جذرًا ثابتًا بحجم الشاشة يضم:
       ١) لوحة غير مرئية نرسم فيها سماء المظهر الحالي (التدرج والنجوم)،
       ٢) لوحة «مرآة» غير مرئية فيها صورة لمحتوى الصفحة نحرّكها مع التمرير، فينكسر النص والقمر تحت الزجاج،
       ٣) شريط التنقل وزر المظهر.
   - صورة المحتوى تُلتقط (html-to-image، نسخة محلية) عند التحميل وتبديل الشاشة والمظهر وتغيّر المحتوى،
     لا مع كل تمرير؛ التمرير يحرّك الصورة الملتقطة فقط فيبقى خفيفًا.
   - الشريط ثابت أسفل الشاشة على الجوال فقط؛ على الحاسوب يبقى في مكانه بزجاجه المعتاد (CSS).
   - يعود كل شيء إلى زجاج CSS تلقائيًا إن تعذّر WebGL، أو طلب النظام تقليل الشفافية، أو انخفض الأداء. */
const supports = (() => {
  try {
    if (matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
})();

if (supports) {
  const body = document.body;
  const nav = document.querySelector('.nav-container');
  const toggle = document.getElementById('themeToggle');
  const phone = matchMedia('(max-width: 640px)');
  const navHome = document.createComment('nav'), toggleHome = document.createComment('toggle');   // مكانهما الأصليان
  if (nav) nav.before(navHome);
  if (toggle) toggle.before(toggleHome);

  const root = document.createElement('div');
  root.className = 'lg-root';
  const sky = document.createElement('canvas');
  sky.className = 'lg-sky';
  sky.setAttribute('aria-hidden', 'true');
  root.appendChild(sky);
  const mirror = document.createElement('canvas');
  mirror.className = 'lg-sky lg-mirror';
  mirror.setAttribute('aria-hidden', 'true');
  root.appendChild(mirror);
  document.body.appendChild(root);
  const app = document.getElementById('app');

  /* ---------- المرآة: صورة المحتوى خلف الزجاج ---------- */
  let snap = null, capturing = false, again = false, capTimer = 0;
  const loadScript = src => new Promise((res, rej) => {
    if (window.htmlToImage) return res();
    const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el);
  });
  async function capture() {
    if (!instance || !app) return;
    if (capturing) { again = true; return; }
    capturing = true;
    try {
      await loadScript('vendor/html-to-image.js?v=1.11.11');
      const r = app.getBoundingClientRect();
      const canvas = await window.htmlToImage.toCanvas(app, {
        pixelRatio: 1, skipFonts: true, cacheBust: false,
        filter: n => !(n instanceof HTMLElement && n.hidden)        // الشاشات المخفية لا تُلتقط
      });
      snap = { canvas, top: r.top + scrollY, left: r.left + scrollX, w: r.width, h: r.height };
      drawMirror();
    } catch (err) {
      console.warn('تعذّر التقاط المحتوى للزجاج؛ يبقى انكسار السماء وحده:', err);
    } finally {
      capturing = false;
      if (again) { again = false; scheduleCapture(400); }
    }
  }
  function scheduleCapture(ms = 700) { clearTimeout(capTimer); capTimer = setTimeout(capture, ms); }

  function drawMirror() {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
    if (mirror.width !== Math.round(w * dpr) || mirror.height !== Math.round(h * dpr)) {
      mirror.width = Math.round(w * dpr); mirror.height = Math.round(h * dpr);
    }
    const x = mirror.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, mirror.width, mirror.height);
    if (snap) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.drawImage(snap.canvas, snap.left - scrollX, snap.top - scrollY, snap.w, snap.h);
    }
    if (instance) instance.markChanged(mirror);
  }
  let scrollRaf = 0;
  addEventListener('scroll', () => { if (instance && snap && !scrollRaf) scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; drawMirror(); }); }, { passive: true });
  document.addEventListener('viewchange', () => { if (instance) { snap = null; drawMirror(); scheduleCapture(450); } });

  // تغيّر المحتوى (آية جديدة، نتيجة قمر الميلاد، ظهور القمر ثلاثي الأبعاد) يعيد الالتقاط؛
  // ونتجاهل ما يتغير باستمرار (عدادات العمر، شريط التلاوة) حتى لا يُلتقط المحتوى كل ثانية
  const NOISY = '.age-grid, .qp, .moon3d';
  if (app) new MutationObserver(list => {
    if (!instance) return;
    if (list.some(m => { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; return t && !t.closest(NOISY); })) scheduleCapture();
  }).observe(app, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src', 'class', 'hidden'] });

  /* ---------- لوحة السماء التي ينكسر فيها الزجاج ---------- */
  const STARS = (() => { let s = 11; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
    return Array.from({ length: 140 }, () => ({ x: r(), y: r(), r: 0.5 + r() * 1.3, a: 0.25 + r() * 0.6 })); })();
  function paintSky() {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
    sky.width = Math.round(w * dpr); sky.height = Math.round(h * dpr);
    const x = sky.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(body), theme = body.dataset.theme;
    let g, stars = theme === 'dark' || theme === 'burgundy' ? 1 : 0;
    if (body.dataset.sky === 'live' && window.SiteKit && SiteKit.liveSky) {
      const L = SiteKit.liveSky();
      g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, L.top); g.addColorStop(1, L.bottom);
      stars = L.palette === 'dark' ? Math.max(0.4, L.night) : 0;
    } else {
      const a = cs.getPropertyValue('--body-gradient-start').trim() || '#0B1026';
      const b = cs.getPropertyValue('--body-gradient-end').trim() || '#1a2048';
      g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, a); g.addColorStop(1, b);
    }
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // المظاهر الفاتحة: طبقة بيضاء فوق السماء، فيبدو الزجاج مصقولًا كزجاج iOS لا ملونًا بلون الخلفية المشبع
    if (!stars && theme !== 'sakura') { x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(0, 0, w, h); }
    if (stars) for (const s of STARS) {
      x.globalAlpha = s.a * stars; x.fillStyle = '#fff';
      x.beginPath(); x.arc(s.x * w, s.y * h, s.r, 0, 6.2832); x.fill();
    }
    x.globalAlpha = 1;
  }

  /* ---------- إعدادات الزجاج ---------- */
  const radius = el => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24;
  function configure(el, extra) {
    const dark = ['dark', 'burgundy'].includes(body.dataset.theme);
    el.dataset.config = JSON.stringify(Object.assign({
      blurAmount: 0.5, refraction: 0.8, chromAberration: 0.04, edgeHighlight: dark ? 0.12 : 0.1,
      specular: dark ? 0.35 : 0.18, fresnel: 1, cornerRadius: radius(el), zRadius: 22,
      // الفاتح: زجاج مصقول مائل إلى البياض بدل لون الخلفية المشبع؛ الداكن: زجاج شفاف يكسر النجوم
      saturation: dark ? 0.1 : -0.2, brightness: dark ? 0.05 : 0.06, shadowOpacity: dark ? 0.35 : 0.2, shadowSpread: 14, shadowOffsetY: 4
    }, extra));
  }

  let lib = null, instance = null, starting = false, slowSince = 0, gaveUp = false;

  async function start() {
    if (starting || instance || gaveUp) return;
    starting = true;
    try {
      lib = lib || await import('./vendor/liquidglass.js?v=1.0.3');
      paintSky();
      const glass = [];
      if (toggle) { root.appendChild(toggle); configure(toggle, { cornerRadius: toggle.offsetWidth / 2, zRadius: toggle.offsetWidth / 2.2, button: true }); glass.push(toggle); }
      if (nav && phone.matches) { root.appendChild(nav); configure(nav); glass.push(nav); }
      body.classList.add('lg-on');
      instance = await lib.LiquidGlass.init({ root, glassElements: glass });
      capture();
    } catch (err) {
      console.warn('الزجاج السائل غير متاح، يبقى زجاج CSS:', err);
      stop(); gaveUp = true;
    } finally { starting = false; }
  }

  function stop() {
    if (instance) { try { instance.destroy(); } catch (e) { /* */ } instance = null; }
    snap = null; clearTimeout(capTimer);
    body.classList.remove('lg-on');
    [nav, toggle].forEach(el => { if (el) { el.removeAttribute('data-config'); el.style.removeProperty('position'); } });
    if (toggle && toggle.parentNode === root) toggleHome.after(toggle);
    if (nav && nav.parentNode === root) navHome.after(nav);
  }
  const restart = () => { stop(); start(); };

  // تغيّر المظهر أو لون السماء الحية: نعيد رسم السماء ونحدّث إعدادات الزجاج
  new MutationObserver(() => {
    if (!instance) return;
    paintSky();
    if (toggle) configure(toggle, { cornerRadius: toggle.offsetWidth / 2, zRadius: toggle.offsetWidth / 2.2, button: true });
    if (nav && nav.parentNode === root) configure(nav);
    instance.markChanged();
    scheduleCapture(200);                                   // ألوان النص تغيّرت مع المظهر
  }).observe(body, { attributes: true, attributeFilter: ['data-theme', 'data-sky', 'style'] });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (instance) { paintSky(); drawMirror(); instance.markChanged(); scheduleCapture(300); } }, 150); });
  const onPhone = () => { if (instance || starting) restart(); };
  if (phone.addEventListener) phone.addEventListener('change', onPhone); else phone.addListener(onPhone);

  // حارس الأداء: إن بقي معدل الإطارات منخفضًا ٤ ثوانٍ متتالية نعود إلى زجاج CSS
  setInterval(() => {
    if (!instance || document.hidden || /[?&]lg=force\b/.test(location.search)) { slowSince = 0; return; }
    const fps = instance.fps;
    window.__lgFps = fps;
    if (fps && fps < 24) { slowSince = slowSince || Date.now(); if (Date.now() - slowSince > 4000) { stop(); gaveUp = true; } }
    else slowSince = 0;
  }, 1000);

  // نبدأ بعد اكتمال تحميل الصفحة والخطوط، حتى لا يؤخر الزجاج ظهور المحتوى
  const go = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(start, 300));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}
