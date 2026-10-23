/* glass.js — زجاج سائل حقيقي (انكسار وحواف لامعة وظل بمؤثر WebGL) في كل الموقع:
   شريط التنقل، زر المظهر، مشغّل التلاوة وأزراره، بقية الأزرار، والنوافذ المنبثقة.

   المكتبة: @ybouane/liquidglass 1.0.3 (MIT)، و html-to-image 1.11.11 (MIT)، نسخ محلية في vendor/.
   المكتبة تكسر ما يقع داخل «جذرها» فقط، والعناصر الزجاجية يجب أن تكون أبناءه المباشرين، لذا:
   - «المجموعة الأمامية» (ثابتة بحجم الشاشة): شريط التنقل على الجوال وزر المظهر. خلفها سماء المظهر
     وصورة لمحتوى الصفحة تتحرك مع التمرير، فينكسر المحتوى تحت الشريط.
   - «مجموعات البطاقات»: جذر صغير داخل كل بطاقة خلف محتواها، فيه سماء المكان وزجاج بمقاس البطاقة
     وزجاج بمقاس كل زر فيها. الجذر يتحرك مع البطاقة، فلا يُعاد الرسم مع التمرير.
   - «مجموعات النوافذ»: تُنشأ عند فتح النافذة وتُزال عند إغلاقها؛ خلفها صورة الصفحة معتّمة قليلًا.
   يعود كل شيء إلى زجاج CSS تلقائيًا إن تعذّر WebGL، أو طلب النظام تقليل الشفافية، أو انخفض الأداء. */
const supports = (() => {
  try {
    if (matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
})();

if (supports) {
  const body = document.body, html = document.documentElement;
  const app = document.getElementById('app');
  const phone = matchMedia('(max-width: 640px)');
  const FORCE = /[?&]lg=force\b/.test(location.search);
  let lib = null, disabled = false;
  const DPR = () => Math.min(devicePixelRatio || 1, 2);
  const isDark = () => ['dark', 'burgundy'].includes(body.dataset.theme);

  const loadScript = src => new Promise((res, rej) => {
    if (window.htmlToImage) return res();
    const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el);
  });

  /* ---------- رسم خلفية الصفحة لأي مستطيل من الشاشة ---------- */
  const STARS = (() => { let s = 11; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
    return Array.from({ length: 140 }, () => ({ x: r(), y: r(), r: 0.5 + r() * 1.3, a: 0.25 + r() * 0.6 })); })();
  function paintBg(canvas, area, withStars) {
    const dpr = DPR(), w = Math.max(1, area.width), h = Math.max(1, area.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const x = canvas.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, -area.left * dpr, -area.top * dpr);   // نرسم بإحداثيات الشاشة
    const page = html.getBoundingClientRect(), theme = body.dataset.theme;
    const ph = Math.max(page.height, innerHeight), pw = page.width;
    let g, stars = isDark() ? 1 : 0;
    if (body.dataset.sky === 'live' && window.SiteKit && SiteKit.liveSky) {
      const L = SiteKit.liveSky();
      g = x.createLinearGradient(0, page.top, 0, page.top + ph);
      g.addColorStop(0, L.top); g.addColorStop(1, L.bottom);
      stars = L.palette === 'dark' ? Math.max(0.4, L.night) : 0;
    } else {                                                    // كتدرج CSS بزاوية 135°
      const cs = getComputedStyle(body);
      const a = cs.getPropertyValue('--body-gradient-start').trim() || '#0B1026';
      const b = cs.getPropertyValue('--body-gradient-end').trim() || '#1a2048';
      const len = (pw + ph) * Math.SQRT1_2 / 2, cx = page.left + pw / 2, cy = page.top + ph / 2;
      g = x.createLinearGradient(cx - len * Math.SQRT1_2, cy - len * Math.SQRT1_2, cx + len * Math.SQRT1_2, cy + len * Math.SQRT1_2);
      g.addColorStop(0, a); g.addColorStop(1, b);
    }
    x.fillStyle = g; x.fillRect(area.left, area.top, w, h);
    // المظاهر الفاتحة: طبقة بيضاء، فيبدو الزجاج مصقولًا كزجاج iOS لا ملوّنًا بلون الخلفية المشبع
    if (!stars && theme !== 'sakura') { x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(area.left, area.top, w, h); }
    if (withStars && stars) for (const s of STARS) {
      x.globalAlpha = s.a * stars; x.fillStyle = '#fff';
      x.beginPath(); x.arc(s.x * innerWidth, s.y * innerHeight, s.r, 0, 6.2832); x.fill();
    }
    x.globalAlpha = 1;
  }

  /* ---------- صورة محتوى الصفحة (للشريط والنوافذ) ---------- */
  let snap = null, capturing = false, again = false, capTimer = 0;
  async function capture() {
    if (disabled || !app || !front.instance) return;
    if (capturing) { again = true; return; }
    capturing = true;
    try {
      await loadScript('vendor/html-to-image.js?v=1.11.11');
      const r = app.getBoundingClientRect();
      // أشرطة التمرير الداخلية تظهر في الصورة كخط أبيض؛ نخفيها لحظة الالتقاط فقط
      html.classList.add('lg-capturing');
      const done = () => html.classList.remove('lg-capturing');
      const canvas = await window.htmlToImage.toCanvas(app, {
        pixelRatio: 1, skipFonts: true, cacheBust: false,
        filter: n => !(n instanceof HTMLElement && n.hidden)        // الشاشات المخفية لا تُلتقط
      }).finally(done);
      snap = { canvas, top: r.top + scrollY, left: r.left + scrollX, w: r.width, h: r.height };
      front.drawMirror();
    } catch (err) {
      console.warn('تعذّر التقاط المحتوى للزجاج؛ يبقى انكسار السماء وحده:', err);
    } finally {
      capturing = false;
      if (again) { again = false; scheduleCapture(400); }
    }
  }
  function scheduleCapture(ms = 700) { clearTimeout(capTimer); capTimer = setTimeout(capture, ms); }
  function drawSnap(canvas, area, tint) {
    const dpr = DPR();
    canvas.width = Math.round(Math.max(1, area.width) * dpr); canvas.height = Math.round(Math.max(1, area.height) * dpr);
    const x = canvas.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, -area.left * dpr, -area.top * dpr);
    if (snap) x.drawImage(snap.canvas, snap.left - scrollX, snap.top - scrollY, snap.w, snap.h);
    if (tint) { x.fillStyle = tint; x.fillRect(area.left, area.top, area.width, area.height); }
  }

  /* ---------- إعدادات الزجاج ---------- */
  function config(el, kind) {
    const dark = isDark(), r = el.getBoundingClientRect();
    const br = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
    const radius = Math.max(4, Math.min(br, r.height / 2, r.width / 2));
    const base = {
      refraction: 0.8, chromAberration: 0.04, fresnel: 1, cornerRadius: radius,
      edgeHighlight: dark ? 0.12 : 0.1, specular: dark ? 0.35 : 0.18,
      saturation: dark ? 0.1 : -0.2, brightness: dark ? 0.05 : 0.06,
      shadowOpacity: dark ? 0.3 : 0.18, shadowSpread: 12, shadowOffsetY: 3
    };
    const by = {
      bar:    { blurAmount: 0.5, zRadius: 22 },
      card:   { blurAmount: 0.3, zRadius: Math.min(26, radius), brightness: dark ? 0.06 : 0.1 },
      button: { blurAmount: 0.3, zRadius: Math.min(18, radius), shadowSpread: 8, shadowOpacity: dark ? 0.28 : 0.15 },
      round:  { blurAmount: 0.3, zRadius: radius * 0.9 },
      sheet:  { blurAmount: 0.65, zRadius: Math.min(28, radius), brightness: dark ? 0.04 : 0.12, shadowOpacity: 0.35, shadowSpread: 22, shadowOffsetY: 8 },
      band:   { blurAmount: 0.2, zRadius: 12, refraction: 1, shadowOpacity: 0, edgeHighlight: 0.18 },
      // عدسة الشريط: قطرة زجاج بلا ضبابية تكبّر أيقونة التبويب واسمه تحتها (على نمط iOS 26)
      lens:   { blurAmount: 0, zRadius: 14, refraction: 0.3, chromAberration: 0.02, edgeHighlight: 0.22,
                specular: 0.45, brightness: dark ? 0.06 : 0.04, saturation: 0.1, shadowOpacity: dark ? 0.25 : 0.14, shadowSpread: 10 }
    };
    return JSON.stringify(Object.assign(base, by[kind] || {}));
  }

  /* =====================================================================
     المجموعة الأمامية: شريط التنقل (على الجوال) وزر المظهر
     ===================================================================== */
  const front = (() => {
    const nav = document.querySelector('.nav-container');
    const toggle = document.getElementById('themeToggle');
    const navHome = document.createComment('nav'), toggleHome = document.createComment('toggle');
    if (nav) nav.before(navHome);
    if (toggle) toggle.before(toggleHome);
    const root = document.createElement('div'); root.className = 'lg-root';
    const sky = document.createElement('canvas'), mirror = document.createElement('canvas');
    sky.className = mirror.className = 'lg-bg';
    root.append(sky, mirror);
    body.appendChild(root);
    const view = () => ({ left: 0, top: 0, width: innerWidth, height: innerHeight });
    const me = {
      instance: null,
      paint() { paintBg(sky, view(), true); me.drawMirror(); },
      drawMirror() { drawSnap(mirror, view()); if (me.instance) me.instance.markChanged(mirror); },
      configure() {
        if (toggle && toggle.parentNode === root) toggle.dataset.config = JSON.stringify(Object.assign(JSON.parse(config(toggle, 'round')), { button: true }));
        if (nav && nav.parentNode === root) nav.dataset.config = config(nav, 'bar');
        if (lens.el.isConnected) lens.el.dataset.config = config(lens.el, 'lens');
      },
      async start() {
        if (me.instance) return;
        const glass = [];
        if (toggle) { root.appendChild(toggle); glass.push(toggle); }
        if (nav && phone.matches) { root.appendChild(nav); glass.push(nav); root.appendChild(lens.el); glass.push(lens.el); }
        body.classList.add('lg-on');
        if (lens.el.isConnected) { body.classList.add('lg-lens-on'); lens.place(false); }
        me.configure(); me.paint();
        me.instance = await lib.LiquidGlass.init({ root, glassElements: glass });
        capture();
      },
      stop() {
        if (me.instance) { try { me.instance.destroy(); } catch (e) { /* */ } me.instance = null; }
        [nav, toggle].forEach(el => { if (el) { el.removeAttribute('data-config'); el.style.removeProperty('position'); } });
        if (toggle && toggle.parentNode === root) toggleHome.after(toggle);
        if (nav && nav.parentNode === root) navHome.after(nav);
        lens.el.remove(); lens.el.removeAttribute('data-config');
        body.classList.remove('lg-on', 'lg-lens-on');
      }
    };

    /* ---------- عدسة التبويبات: تنزلق إلى التبويب المحدد، وتكبر عند الضغط وتتبع الإصبع عند السحب ---------- */
    const lens = (() => {
      const el = document.createElement('div');
      el.className = 'lg-lens';
      el.setAttribute('aria-hidden', 'true');
      const links = () => [...nav.querySelectorAll('.nav-link')];
      const active = () => nav.querySelector('.nav-link[aria-current="page"]') || links()[0];
      let drag = null;
      // المكتبة لا تتابع الحركة التي لا تُحدث تغييرًا في الصفحة، فنطلب إعادة رسم العدسة طوال انزلاقها
      let pumpUntil = 0, pumping = false;
      function pump() {
        if (me.instance) me.instance.markChanged(el);
        if (performance.now() < pumpUntil || drag) requestAnimationFrame(pump); else pumping = false;
      }
      function set(r) {
        Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
        pumpUntil = performance.now() + 450;
        if (!pumping) { pumping = true; requestAnimationFrame(pump); }
      }
      function place(animate) {
        if (!el.isConnected || drag) return;
        const a = active(); if (!a) return;
        el.classList.toggle('no-anim', !animate);
        const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect(), i = 3;   // داخل حدود الشريط دائمًا
        const left = Math.max(n.left + i, r.left), right = Math.min(n.right - i, r.right);
        set({ left, top: r.top + 1, width: right - left, height: r.height - 2 });
        if (!animate) requestAnimationFrame(() => el.classList.remove('no-anim'));
      }
      // الضغط يكبّر العدسة قليلًا حول مركزها، والسحب يحرّكها أفقيًا داخل الشريط
      function follow(x) {
        const a = active().getBoundingClientRect(), n = nav.getBoundingClientRect();
        const w = a.width + 18, h = a.height + 14;
        const left = Math.max(n.left + 2, Math.min(n.right - w - 2, x - w / 2));
        set({ left, top: a.top - 7, width: w, height: h });
      }
      function linkAt(x) {
        return links().reduce((best, l) => {
          const r = l.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - x);
          return !best || d < best.d ? { l, d } : best;
        }, null).l;
      }
      if (nav) {
        // الروابط لا تُسحب كملفات (السحب الأصلي يقطع حركة العدسة)
        nav.querySelectorAll('a').forEach(a => a.setAttribute('draggable', 'false'));
        nav.addEventListener('pointerdown', e => {
          if (!el.isConnected || e.button > 0) return;
          drag = { x0: e.clientX, x: e.clientX, moved: 0 };
          el.classList.add('is-pressed');
          follow(e.clientX);
        });
        addEventListener('pointermove', e => {
          if (!drag) return;
          drag.x = e.clientX;
          drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x0));
          if (drag.moved > 6) el.classList.add('is-drag');
          follow(e.clientX);
        }, { passive: true });
        const end = e => {
          if (!drag) return;
          const moved = drag.moved, x = drag.x;
          drag = null;
          el.classList.remove('is-pressed', 'is-drag');
          if (moved > 6) { el.classList.add('was-drag'); setTimeout(() => el.classList.remove('was-drag'), 0); }
          if (moved > 6) {
            const l = linkAt(x);
            if (l && l.getAttribute('aria-current') !== 'page') { location.hash = l.getAttribute('href'); return; }   // التبويب الجديد يعيد وضع العدسة
          }
          place(true);
        };
        addEventListener('pointerup', end);
        addEventListener('pointercancel', end);
        // السحب لا يُحتسب ضغطة على الرابط الذي بدأ منه
        nav.addEventListener('click', e => { if (el.classList.contains('was-drag')) e.preventDefault(); }, true);
      }
      document.addEventListener('viewchange', () => requestAnimationFrame(() => place(true)));
      addEventListener('resize', () => place(false));
      return { el, place };
    })();
    let raf = 0;
    addEventListener('scroll', () => { if (me.instance && snap && !raf) raf = requestAnimationFrame(() => { raf = 0; me.drawMirror(); }); }, { passive: true });
    return me;
  })();

  /* =====================================================================
     مجموعة زجاج مرتبطة بعنصر «مضيف» (بطاقة، زر منفرد، أو نافذة)
     ===================================================================== */
  class Group {
    constructor(host, opts) { this.host = host; this.opts = opts; this.instance = null; this.proxies = []; }
    targets() {
      const list = [];
      if (this.opts.self) list.push([this.host, this.opts.self]);
      for (const [sel, kind] of this.opts.parts || []) this.host.querySelectorAll(sel).forEach(el => list.push([el, kind]));
      return list;
    }
    async start() {
      if (this.instance || disabled || !this.host.isConnected) return;
      const host = this.host;
      if (getComputedStyle(host).position === 'static') { host.style.position = 'relative'; this.setPos = true; }
      const root = this.root = document.createElement('div');
      root.className = 'lg-group';
      this.bg = document.createElement('canvas'); this.bg.className = 'lg-bg';
      root.appendChild(this.bg);
      if (this.opts.mirror) { this.mirror = document.createElement('canvas'); this.mirror.className = 'lg-bg'; root.appendChild(this.mirror); }
      this.list = this.targets();
      this.proxies = this.list.map(([el]) => {
        const p = document.createElement('div'); p.className = 'lg-proxy'; root.appendChild(p);
        if (el !== host) el.classList.add('lg-target');
        return p;
      });
      host.classList.add('lg-host');
      host.prepend(root);
      this.layout(false);
      this.instance = await lib.LiquidGlass.init({ root, glassElements: this.proxies });
      if (!this.root) { this.stop(); return; }                 // أُغلقت أثناء التهيئة
      // يتغير حجم البطاقة أو تظهر أزرار وتختفي: نعيد وضع الزجاج
      this.ro = new ResizeObserver(() => this.soon()); this.ro.observe(host);
      this.mo = new MutationObserver(list => { if (list.some(m => !this.root.contains(m.target))) this.soon(); });
      this.mo.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'aria-pressed'] });
    }
    soon() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.layout(true); }); }
    layout(mark) {
      if (!this.root) return;
      // الجذر يمتد ٤٨px حول المضيف ليتسع للظل، لكن لا يتجاوز حافتي الشاشة حتى لا تظهر إزاحة أفقية للصفحة
      const hr = this.host.getBoundingClientRect(), cw = html.clientWidth;
      if (!this.opts.mirror) {
        this.root.style.left = -Math.max(0, Math.min(48, hr.left)) + 'px';
        this.root.style.right = -Math.max(0, Math.min(48, cw - hr.right)) + 'px';
      }
      const rr = this.root.getBoundingClientRect();
      this.list.forEach(([el, kind], i) => {
        const p = this.proxies[i], r = el.getBoundingClientRect();
        if (!r.width || !r.height || !el.isConnected) { p.style.display = 'none'; return; }
        p.style.display = '';
        Object.assign(p.style, { left: (r.left - rr.left) + 'px', top: (r.top - rr.top) + 'px', width: r.width + 'px', height: r.height + 'px' });
        const c = config(el, kind);
        if (p.dataset.config !== c) p.dataset.config = c;
      });
      paintBg(this.bg, rr, false);
      if (this.mirror) drawSnap(this.mirror, rr, isDark() ? 'rgba(8,12,30,0.6)' : 'rgba(255,255,255,0.65)');
      if (mark && this.instance) this.instance.markChanged();
    }
    stop() {
      if (this.instance) { try { this.instance.destroy(); } catch (e) { /* */ } this.instance = null; }
      if (this.ro) this.ro.disconnect();
      if (this.mo) this.mo.disconnect();
      if (this.root) this.root.remove();
      this.root = null;
      (this.list || []).forEach(([el]) => el.classList.remove('lg-target'));
      this.host.classList.remove('lg-host');
      if (this.setPos) this.host.style.removeProperty('position');
    }
  }

  /* ---------- ما يصير زجاجًا في كل شاشة ---------- */
  const PLAYER_BTNS = [['.qp-btn', 'button'], ['.qp-play', 'round'], ['.qp-qari-btn', 'button']];
  const SPECS = {
    home: [['.ayah-container', { self: 'card', parts: PLAYER_BTNS }], ['#shareTonight', { self: 'button' }]],
    age:  [['.age-details', { self: 'card', parts: [['.expand-button', 'button']] }],
           ['.birth-moon', { self: 'card', parts: [['#birthPick', 'button'], ['#birthShare', 'button']] }]],
    game: [['.pause-button', { self: 'round' }], ['.start-button', { self: 'button' }], ['.restart-button', { self: 'button' }]]
  };
  let groups = [], building = 0;
  const viewNow = () => document.documentElement.dataset.view || 'home';
  async function buildView(v) {
    const token = ++building;
    groups.forEach(g => g.stop()); groups = [];
    if (disabled) return;
    for (const [sel, opts] of SPECS[v] || []) {
      if (token !== building) return;                          // انتقل الزائر إلى شاشة أخرى
      const host = document.querySelector('#view-' + v + ' ' + sel);
      if (!host) continue;
      const g = new Group(host, opts); groups.push(g);
      try { await g.start(); } catch (err) { console.warn('زجاج:', sel, err); g.stop(); }
    }
  }

  /* ---------- النوافذ المنبثقة: عجلة القارئ، عجلة التاريخ، بطاقة المشاركة ---------- */
  const popups = new Map(), watched = new WeakSet();
  function watchPopup(wrap) {
    if (watched.has(wrap)) return;
    const sheet = wrap.querySelector('.qpw-sheet, .share-panel');
    if (!sheet) return;
    watched.add(wrap);
    const isShare = sheet.classList.contains('share-panel');
    const opts = isShare
      ? { self: 'sheet', mirror: true, parts: [['.share-primary', 'button'], ['.share-secondary', 'button']] }
      : { self: 'sheet', mirror: true, parts: [['.qpw-band', 'band']] };
    const sync = () => {
      const open = !wrap.hidden && (isShare || wrap.classList.contains('is-open'));
      let g = popups.get(wrap);
      if (open && !g && !disabled && lib) {
        g = new Group(sheet, opts); popups.set(wrap, g);
        g.start().then(() => setTimeout(() => g.soon(), 260))        // بعد انتهاء حركة الظهور
          .catch(err => { console.warn('زجاج النافذة:', err); g.stop(); popups.delete(wrap); });
      } else if (!open && g) { g.stop(); popups.delete(wrap); }
    };
    new MutationObserver(sync).observe(wrap, { attributes: true, attributeFilter: ['hidden', 'class'] });
    sync();
  }
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && (n.classList.contains('qpw') || n.classList.contains('share-sheet'))) watchPopup(n);
  }))).observe(body, { childList: true });

  /* ---------- التشغيل والإيقاف ---------- */
  function shutdown() {
    disabled = true;
    groups.forEach(g => g.stop()); groups = [];
    popups.forEach(g => g.stop()); popups.clear();
    front.stop();
  }
  async function start() {
    if (disabled || front.instance) return;
    try {
      lib = lib || await import('./vendor/liquidglass.js?v=1.0.3');
      await front.start();
      document.querySelectorAll('.qpw, .share-sheet').forEach(watchPopup);
      await buildView(viewNow());
    } catch (err) {
      console.warn('الزجاج السائل غير متاح، يبقى زجاج CSS:', err);
      shutdown();
    }
  }

  document.addEventListener('viewchange', e => {
    if (disabled || !front.instance) return;
    snap = null; front.drawMirror(); scheduleCapture(500);
    setTimeout(() => buildView(e.detail.view), 380);           // بعد انتهاء انتقال الشاشة
  });

  // تغيّر المظهر أو لون السماء الحية
  new MutationObserver(() => {
    if (disabled || !front.instance) return;
    front.configure(); front.paint(); front.instance.markChanged();
    groups.forEach(g => g.layout(true)); popups.forEach(g => g.layout(true));
    scheduleCapture(200);
  }).observe(body, { attributes: true, attributeFilter: ['data-theme', 'data-sky', 'style'] });

  // تغيّر المحتوى يعيد الالتقاط؛ ونتجاهل ما يتغير باستمرار (العدادات، شريط التلاوة، الزجاج نفسه)
  const NOISY = '.age-grid, .qp-seekwrap, .qp-times, .moon3d, .lg-group';
  if (app) new MutationObserver(list => {
    if (disabled || !front.instance) return;
    if (list.some(m => {
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (!t || t.closest(NOISY)) return false;
      if (m.type === 'attributes' && m.attributeName === 'class' && /\blg-/.test(t.className)) return false;
      return true;
    })) scheduleCapture();
  }).observe(app, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src', 'class', 'hidden'] });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => {
    if (disabled || !front.instance) return;
    front.paint(); front.instance.markChanged(); groups.forEach(g => g.layout(true)); scheduleCapture(300);
  }, 150); });
  const onPhone = () => { if (!front.instance || disabled) return; front.stop(); front.start(); };
  if (phone.addEventListener) phone.addEventListener('change', onPhone); else phone.addListener(onPhone);

  // حارس الأداء: إن بقي معدل الإطارات منخفضًا ٤ ثوانٍ متتالية نعود إلى زجاج CSS في كل الموقع
  let slowSince = 0;
  setInterval(() => {
    if (!front.instance || document.hidden || FORCE) { slowSince = 0; return; }
    const fps = front.instance.fps;
    if (fps && fps < 24) { slowSince = slowSince || Date.now(); if (Date.now() - slowSince > 4000) shutdown(); }
    else slowSince = 0;
  }, 1000);

  const go = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(start, 300));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}
