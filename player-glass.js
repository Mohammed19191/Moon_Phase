/* player-glass.js — زجاج سائل (WebGL) لمشغّل التلاوة فقط: بطاقة الآية وأزرار المشغّل.
   مبني على توصيات توثيق المكتبة (liquid-glass.ybouane.com):
   - نسخة واحدة فقط (سياق WebGL واحد)، والجذر داخل البطاقة فيتحرك معها، فلا يُعاد الرسم مع التمرير.
   - لا تصوير لمحتوى الصفحة: ما خلف الزجاج لوحة مرسومة (سماء المظهر)، فالتهيئة خفيفة.
   - الأزرار الحقيقية تبقى فوق الزجاج كما هي؛ الزجاج ألواح فارغة خلفها بمقاسها.
   - عند مغادرة الشاشة الرئيسية يتوقف الرسم ولا يُهدم، ويُستأنف عند العودة دون تهيئة جديدة.
   - تغيّر ارتفاع النافذة وحده (شريط عنوان المتصفح على الجوال) لا يعيد التصوير (تعديل محلي في المكتبة).
   يبقى زجاج CSS المعتاد إن تعذّر WebGL، أو طلب النظام تقليل الشفافية، أو انخفض الأداء. */
const ok = (() => {
  try {
    if (matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
})();

const card = document.querySelector('#view-home .ayah-container');

if (ok && card) {
  const body = document.body, html = document.documentElement;
  const FORCE = /[?&]lg=force\b/.test(location.search);
  const PARTS = [['.qp-btn', 'button'], ['.qp-play', 'round'], ['.qp-qari-btn', 'button']];
  const isDark = () => ['dark', 'burgundy'].includes(body.dataset.theme);
  let inst = null, root = null, bg = null, list = [], proxies = [], dead = false, raf = 0;

  /* ---------- ما خلف الزجاج: سماء المظهر في موضع البطاقة ---------- */
  function paint() {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = root.getBoundingClientRect();
    bg.width = Math.max(1, Math.round(r.width * dpr)); bg.height = Math.max(1, Math.round(r.height * dpr));
    const x = bg.getContext('2d');
    // نرسم بإحداثيات الصفحة، فيبقى الرسم صحيحًا مهما مرّر الزائر
    const top = r.top + scrollY, left = r.left + scrollX;
    x.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
    const pw = html.scrollWidth, ph = Math.max(html.scrollHeight, innerHeight);
    let g, stars = isDark();
    if (body.dataset.sky === 'live' && window.SiteKit && SiteKit.liveSky) {
      const L = SiteKit.liveSky();
      g = x.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, L.top); g.addColorStop(1, L.bottom);
      stars = L.palette === 'dark';
    } else {
      const cs = getComputedStyle(body);
      const a = cs.getPropertyValue('--body-gradient-start').trim() || '#0B1026';
      const b = cs.getPropertyValue('--body-gradient-end').trim() || '#1a2048';
      g = x.createLinearGradient(0, 0, pw, ph); g.addColorStop(0, a); g.addColorStop(1, b);
    }
    x.fillStyle = g; x.fillRect(left, top, r.width, r.height);
    // المظاهر الفاتحة: زجاج مصقول مائل إلى البياض لا ملوّن بلون الخلفية المشبع
    if (!stars && body.dataset.theme !== 'sakura') { x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(left, top, r.width, r.height); }
    if (stars) {                                         // نجوم ثابتة تنكسر عند حواف الزجاج
      let s = 7; const R = () => (s = s * 16807 % 2147483647) / 2147483647;
      for (let i = 0; i < 90; i++) {
        x.globalAlpha = 0.25 + R() * 0.6; x.fillStyle = '#fff';
        x.beginPath(); x.arc(left + R() * r.width, top + R() * r.height, 0.5 + R() * 1.3, 0, 6.2832); x.fill();
      }
      x.globalAlpha = 1;
    }
  }

  /* ---------- إعدادات الزجاج ---------- */
  function config(el, kind) {
    const dark = isDark(), r = el.getBoundingClientRect();
    const br = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
    const radius = Math.max(4, Math.min(br, r.height / 2, r.width / 2));
    const c = {
      refraction: 0.8, chromAberration: 0.04, fresnel: 1, cornerRadius: radius, blurAmount: 0.3,
      edgeHighlight: dark ? 0.12 : 0.1, specular: dark ? 0.35 : 0.18,
      saturation: dark ? 0.1 : -0.2, brightness: dark ? 0.05 : 0.06,
      shadowOpacity: dark ? 0.3 : 0.18, shadowSpread: 12, shadowOffsetY: 3
    };
    if (kind === 'card') Object.assign(c, { zRadius: Math.min(26, radius), brightness: dark ? 0.06 : 0.1 });
    if (kind === 'button') Object.assign(c, { zRadius: Math.min(18, radius), shadowSpread: 8, shadowOpacity: dark ? 0.28 : 0.15 });
    if (kind === 'round') Object.assign(c, { zRadius: radius * 0.9 });
    return JSON.stringify(c);
  }

  /* ---------- وضع ألواح الزجاج بمقاس البطاقة وأزرارها ---------- */
  function layout() {
    if (!root) return;
    // الجذر يمتد ٤٨px حول البطاقة ليتسع للظل، دون أن يتجاوز حافتي الشاشة فيوسّع الصفحة
    const hr = card.getBoundingClientRect(), cw = html.clientWidth;
    root.style.left = -Math.max(0, Math.min(48, hr.left)) + 'px';
    root.style.right = -Math.max(0, Math.min(48, cw - hr.right)) + 'px';
    const rr = root.getBoundingClientRect();
    if (!rr.width) return;                               // الشاشة مخفية
    list.forEach(([el, kind], i) => {
      const p = proxies[i], r = el.getBoundingClientRect();
      if (!r.width || !r.height) { p.style.display = 'none'; return; }
      p.style.display = '';
      Object.assign(p.style, { left: (r.left - rr.left) + 'px', top: (r.top - rr.top) + 'px', width: r.width + 'px', height: r.height + 'px' });
      const c = config(el, kind);
      if (p.dataset.config !== c) p.dataset.config = c;
    });
    paint();
    if (inst) inst.markChanged();
  }
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };

  async function start() {
    if (inst || dead || card.closest('[hidden]')) return;
    try {
      const { LiquidGlass } = await import('./vendor/liquidglass.js?v=1.0.3b');
      if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
      root = document.createElement('div'); root.className = 'pg-root';
      bg = document.createElement('canvas'); bg.className = 'pg-bg';
      root.appendChild(bg);
      list = [[card, 'card'], ...PARTS.flatMap(([sel, kind]) => [...card.querySelectorAll(sel)].map(el => [el, kind]))];
      proxies = list.map(([el]) => {
        const p = document.createElement('div'); p.className = 'pg-pane'; root.appendChild(p);
        if (el !== card) el.classList.add('pg-target');
        return p;
      });
      card.classList.add('pg-host');
      card.prepend(root);
      layout();
      inst = await LiquidGlass.init({ root, glassElements: proxies });
      new ResizeObserver(soon).observe(card);
      new MutationObserver(m => { if (m.some(x => !root.contains(x.target))) soon(); })
        .observe(card, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'aria-pressed'] });
    } catch (err) {
      console.warn('زجاج المشغّل غير متاح، يبقى زجاج CSS:', err);
      stop();
    }
  }
  function stop() {
    dead = true;
    if (inst) { try { inst.destroy(); } catch (e) { /* */ } inst = null; }
    if (root) root.remove();
    list.forEach(([el]) => el.classList.remove('pg-target'));
    card.classList.remove('pg-host');
  }
  // إيقاف الرسم مؤقتًا خارج الشاشة الرئيسية، دون هدم ولا تهيئة جديدة عند العودة
  function pause() { if (inst && inst._running) { inst._running = false; cancelAnimationFrame(inst._rafId); } }
  function resume() {
    if (!inst || inst._running) return;
    inst._running = true; inst._rafId = requestAnimationFrame(() => inst._renderLoop());
    requestAnimationFrame(layout);
  }

  document.addEventListener('viewchange', e => {
    if (e.detail.view === 'home') { if (inst) resume(); else setTimeout(start, 400); }
    else pause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (!card.closest('[hidden]')) resume(); });
  // تغيّر المظهر أو لون السماء الحية
  new MutationObserver(soon).observe(body, { attributes: true, attributeFilter: ['data-theme', 'data-sky'] });
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; soon(); } });

  // حارس الأداء: إن بقي معدل الإطارات منخفضًا ٤ ثوانٍ متتالية نعود إلى زجاج CSS
  let slow = 0;
  setInterval(() => {
    if (!inst || !inst._running || document.hidden || FORCE) { slow = 0; return; }
    if (inst.fps && inst.fps < 24) { slow = slow || Date.now(); if (Date.now() - slow > 4000) stop(); } else slow = 0;
  }, 1000);

  // نبدأ بعد اكتمال تحميل الصفحة، حين يكون المتصفح متفرغًا، حتى لا يؤخر ظهور المحتوى
  const go = () => (window.requestIdleCallback || (f => setTimeout(f, 300)))(start, { timeout: 1500 });
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}
