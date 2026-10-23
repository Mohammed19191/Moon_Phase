/* glass.js — زجاج سائل حقيقي (انكسار وحواف لامعة بمؤثر WebGL) لشريط التنقل وزر المظهر.
   - المكتبة: @ybouane/liquidglass 1.0.3 (MIT)، نسخة محلية في vendor/ فلا اعتماد على شبكة خارجية.
   - المكتبة تكسر ما يقع داخل «جذرها» فقط، فنبني جذرًا ثابتًا بحجم الشاشة يضم:
       ١) لوحة خلفية غير مرئية نرسم فيها سماء المظهر الحالي (التدرج والنجوم) لتنكسر في الزجاج،
       ٢) شريط التنقل وزر المظهر.
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
  document.body.appendChild(root);

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
      blurAmount: 0.28, refraction: 0.75, chromAberration: 0.04, edgeHighlight: dark ? 0.12 : 0.1,
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
    } catch (err) {
      console.warn('الزجاج السائل غير متاح، يبقى زجاج CSS:', err);
      stop(); gaveUp = true;
    } finally { starting = false; }
  }

  function stop() {
    if (instance) { try { instance.destroy(); } catch (e) { /* */ } instance = null; }
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
  }).observe(body, { attributes: true, attributeFilter: ['data-theme', 'data-sky', 'style'] });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (instance) { paintSky(); instance.markChanged(); } }, 150); });
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
