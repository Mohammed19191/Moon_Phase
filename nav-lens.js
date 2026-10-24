/* nav-lens.js — عدسة زجاجية حقيقية فوق التبويب المحدد في شريط التنقل (على نمط iOS 26).
   مأخوذة من عرض المستخدم (demo.js): خريطة إزاحة تُحسب من قانون انكسار الضوء على حافة زجاج محدّبة،
   ثم تُطبّق على ما خلف العدسة مباشرة بـ backdrop-filter: url(#مرشح SVG). لا تصوير للصفحة ولا مكتبة.
   - تعمل في المتصفحات المبنية على Chromium (كروم وإيدج على ويندوز وأندرويد).
     سفاري (آيفون وآيباد وماك) وفايرفوكس لا يدعمان المرشح داخل backdrop-filter، فيبقى الشريط فيهما كما هو.
   - المرشح يُبنى مرة واحدة لكل مقاس ويُحفظ؛ أثناء السحب تتحرك العدسة فقط (العرض الأصلي كان يعيد بناءه
     مع كل حركة، نحو ٧٠ ملّي ثانية لكل مرة، فيتقطع السحب).
   - الضغط يكبّرها قليلًا، والسحب أفقيًا يحركها مع الإصبع بتجاوز مطاطي عند الحافتين، والإفلات يفتح أقرب تبويب. */
(() => {
  'use strict';
  const nav = document.querySelector('.nav-container');
  if (!nav) return;
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands &&
    navigator.userAgentData.brands.some(b => /Chromium/.test(b.brand)));
  const lessGlass = matchMedia('(prefers-reduced-transparency: reduce)').matches;   // ويندوز: «تأثيرات الشفافية» مطفأة
  const moreContrast = matchMedia('(prefers-contrast: more)').matches;               // ويندوز: «سمات التباين» مفعّلة

  // تشخيص: افتح الموقع بإضافة ?lensinfo لترى لماذا تعمل العدسة أو لا تعمل على هذا الجهاز
  if (/[?&]lensinfo\b/.test(location.search)) addEventListener('load', () => setTimeout(() => {
    const lens = document.querySelector('.nav-lens');
    const brands = navigator.userAgentData ? navigator.userAgentData.brands.map(b => b.brand + ' ' + b.version).join('، ') : 'غير متاح';
    const rows = [
      ['المتصفح', brands],
      ['مبني على Chromium', chromium ? 'نعم' : 'لا (العدسة لا تعمل فيه)'],
      ['تأثيرات الشفافية مطفأة في النظام', lessGlass ? 'نعم (لذلك العدسة معطّلة)' : 'لا'],
      ['التباين العالي مفعّل في النظام', moreContrast ? 'نعم (لذلك العدسة معطّلة)' : 'لا'],
      ['العدسة', lens ? 'تعمل: ' + getComputedStyle(lens.firstChild).backdropFilter : 'غير موجودة'],
      ['دعم المرشح في backdrop-filter', CSS.supports('backdrop-filter', 'url(#x)') ? 'نعم' : 'لا']
    ];
    const box = document.createElement('div');
    box.id = 'lensinfo'; box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;inset:12px 12px auto;z-index:999;padding:14px 16px;border-radius:16px;background:#0b1026;color:#fff;font:14px/1.7 system-ui,sans-serif;direction:rtl;box-shadow:0 10px 30px rgba(0,0,0,.4)';
    box.innerHTML = '<b>تشخيص عدسة الشريط</b><br>' + rows.map(([k, v]) => k + ': ' + v).join('<br>');
    document.body.appendChild(box);
  }, 1500));

  if (!chromium || lessGlass || moreContrast) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const CFG = { glassThickness: 30, bezelWidth: 16, ior: 1.4, scaleRatio: 1, blur: 0, specularOpacity: 0.5, specularSat: 0 };
  const PRESS_SCALE = 1.18, DRAG_THRESHOLD = 6, OVERSHOOT = 22;
  // قوة الانكسار: هادئة والعدسة ساكنة فيبقى اسم التبويب واضحًا، وكاملة عند الضغط والسحب.
  // تغيير قوة الإزاحة خاصية واحدة في المرشح، فلا يُعاد بناؤه
  const REST_STRENGTH = 0.4, PRESS_STRENGTH = 1;

  /* ---------- البصريات (من demo.js) ---------- */
  const surface = x => Math.pow(1 - Math.pow(1 - x, 4), 0.25);          // مقطع حافة الزجاج المحدّبة
  function refractionProfile(thick, bezel, ior, samples = 128) {
    const eta = 1 / ior, p = new Float64Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = i / samples, y = surface(x), dx = x < 1 ? 1e-4 : -1e-4;
      const deriv = (surface(x + dx) - y) / dx, mag = Math.sqrt(deriv * deriv + 1);
      const nx = -deriv / mag, ny = -1 / mag, k = 1 - eta * eta * (1 - ny * ny);
      if (k < 0) continue;
      const sq = Math.sqrt(k), rx = -(eta * ny + sq) * nx, ry = eta - (eta * ny + sq) * ny;
      p[i] = rx * ((y * bezel + thick) / ry);
    }
    return p;
  }
  function edgeMap(w, h, r, bezel, fill) {                               // يمرّ على بكسلات الحافة فقط
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
    const rSq = r * r, r1 = r + 1, r1Sq = r1 * r1, rBSq = Math.max(r - bezel, 0) ** 2, wB = w - r * 2, hB = h - r * 2;
    for (let y1 = 0; y1 < h; y1++) for (let x1 = 0; x1 < w; x1++) {
      const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
      const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
      const dSq = x * x + y * y, i = (y1 * w + x1) * 4;
      if (dSq > r1Sq || dSq < rBSq) { fill(d, i, null); continue; }
      const dist = Math.sqrt(dSq);
      const op = dSq < rSq ? 1 : 1 - (dist - r) / (r1 - r);
      if (op <= 0 || dist === 0) { fill(d, i, null); continue; }
      fill(d, i, { cos: x / dist, sin: y / dist, fromSide: r - dist, op });
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  let defs = null;
  function ensureDefs() {
    if (defs) return;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;';
    defs = document.createElementNS(SVGNS, 'defs'); svg.appendChild(defs); document.body.appendChild(svg);
  }
  const filters = new Map();                                              // مرشح لكل مقاس، يُبنى مرة واحدة
  function filterFor(w, h) {
    const key = w + 'x' + h;
    if (filters.has(key)) return filters.get(key);
    ensureDefs();
    const r = Math.max(2, Math.min(w, h) / 2);
    const bezel = Math.min(CFG.bezelWidth, r - 1, Math.min(w, h) / 2 - 1);
    const profile = refractionProfile(CFG.glassThickness, bezel, CFG.ior);
    const maxDisp = Math.max(...Array.from(profile, Math.abs)) || 1, S = profile.length;
    const disp = edgeMap(w, h, r, bezel, (d, i, p) => {
      if (!p) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 0; d[i + 3] = 255; return; }
      const v = profile[Math.min(((p.fromSide / bezel) * S) | 0, S - 1)] || 0;
      d[i] = (128 + (-p.cos * v / maxDisp) * 127 * p.op + 0.5) | 0;
      d[i + 1] = (128 + (-p.sin * v / maxDisp) * 127 * p.op + 0.5) | 0; d[i + 2] = 0; d[i + 3] = 255;
    });
    const spec = edgeMap(w, h, r, bezel * 2.5, (d, i, p) => {                // لمعان متوازن حول الحافة
      if (!p) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; return; }
      const edge = Math.sqrt(Math.max(0, 1 - (1 - p.fromSide) ** 2)), col = (255 * edge) | 0;
      d[i] = d[i + 1] = d[i + 2] = col; d[i + 3] = (col * edge * p.op) | 0;
    });
    const id = 'nav-lens-' + key, pad = 0.36;
    const f = el('filter', { id, x: Math.round(-w * pad), y: Math.round(-h * pad), width: Math.round(w * (1 + pad * 2)), height: Math.round(h * (1 + pad * 2)),
      filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
    const tr = el('feComponentTransfer', { in: 'spec_layer', result: 'spec_faded' });
    tr.appendChild(el('feFuncA', { type: 'linear', slope: CFG.specularOpacity }));
    f.append(
      el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: CFG.blur, result: 'blurred' }),
      el('feImage', { href: disp, x: 0, y: 0, width: w, height: h, result: 'disp_map' }),
      el('feDisplacementMap', { in: 'blurred', in2: 'disp_map', scale: maxDisp * CFG.scaleRatio * REST_STRENGTH, xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced', 'data-max': maxDisp * CFG.scaleRatio }),
      el('feColorMatrix', { in: 'displaced', type: 'saturate', values: CFG.specularSat, result: 'displaced_sat' }),
      el('feImage', { href: spec, x: 0, y: 0, width: w, height: h, result: 'spec_layer' }),
      el('feComposite', { in: 'displaced_sat', in2: 'spec_layer', operator: 'in', result: 'spec_masked' }),
      tr,
      el('feBlend', { in: 'spec_masked', in2: 'displaced', mode: 'normal', result: 'with_sat' }),
      el('feBlend', { in: 'spec_faded', in2: 'with_sat', mode: 'normal' })
    );
    defs.appendChild(f);
    filters.set(key, id);
    return id;
  }

  /* ---------- العدسة ---------- */
  const lens = document.createElement('div');
  lens.className = 'nav-lens';
  lens.setAttribute('aria-hidden', 'true');
  const refr = document.createElement('div'); refr.className = 'nav-lens-refr';
  const tint = document.createElement('div'); tint.className = 'nav-lens-tint';
  lens.append(refr, tint);
  nav.appendChild(lens);
  nav.classList.add('has-lens');
  nav.querySelectorAll('a').forEach(a => a.setAttribute('draggable', 'false'));   // السحب الأصلي للروابط يقطع حركة العدسة

  const links = () => [...nav.querySelectorAll('.nav-link')];
  const active = () => nav.querySelector('.nav-link[aria-current="page"]') || links()[0];
  const local = r => { const n = nav.getBoundingClientRect(); return { left: r.left - n.left, top: r.top - n.top, width: r.width, height: r.height }; };
  let size = '', dispNode = null;
  function strength(k) { if (dispNode) dispNode.setAttribute('scale', (dispNode.dataset.max || dispNode.getAttribute('data-max')) * k); }
  function setSize(w, h) {
    w = Math.round(w); h = Math.round(h);
    const key = w + 'x' + h;
    if (key === size) return;
    size = key;
    const id = filterFor(w, h);
    dispNode = defs.querySelector('#' + id + ' feDisplacementMap');
    lens.style.width = w + 'px'; lens.style.height = h + 'px';
    refr.style.backdropFilter = `url(#${id})`;
  }
  function place(animate, target) {
    const a = target || active(); if (!a) return;
    const r = local(a.getBoundingClientRect());
    lens.classList.toggle('no-anim', !animate || reduce.matches);
    setSize(r.width, r.height);
    lens.style.transform = `translate(${r.left}px, ${r.top}px)`;
    if (!animate) requestAnimationFrame(() => lens.classList.remove('no-anim'));
  }

  /* ---------- الضغط والسحب ---------- */
  let drag = null;
  function follow(x) {
    const a = local(active().getBoundingClientRect()), n = nav.getBoundingClientRect();
    let left = x - n.left - a.width / 2;
    const min = 0, max = n.width - a.width, rubber = drag && drag.moved > DRAG_THRESHOLD ? OVERSHOOT : 0;
    if (left < min) left = min - Math.min(rubber, (min - left) * 0.35);
    else if (left > max) left = max + Math.min(rubber, (left - max) * 0.35);
    lens.style.transform = `translate(${left}px, ${a.top}px) scale(${PRESS_SCALE})`;
  }
  function nearest(x) {
    return links().reduce((best, l) => {
      const r = l.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - x);
      return !best || d < best.d ? { l, d } : best;
    }, null).l;
  }
  nav.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button > 0 || drag || !e.target.closest('.nav-link')) return;
    e.preventDefault();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, moved: 0 };
    lens.classList.add('is-pressed');
    strength(PRESS_STRENGTH);
    follow(e.clientX);
  });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.x = e.clientX;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x0), Math.abs(e.clientY - drag.y0));
    lens.classList.toggle('is-drag', drag.moved > DRAG_THRESHOLD);
    follow(e.clientX);
  }, { passive: true });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, x } = drag, cancelled = e.type === 'pointercancel';
    drag = null;
    lens.classList.remove('is-pressed', 'is-drag');
    strength(REST_STRENGTH);
    if (cancelled) { place(true); return; }
    // الضغطة والسحب سواء: تنزلق العدسة فورًا إلى التبويب المقصود ثم تُفتح شاشته.
    // (كانت الضغطة تعيد العدسة أولًا إلى التبويب القديم، ثم تنتقل إلى الجديد بعد تبديل الشاشة، فتتقطع)
    const l = nearest(x);
    place(true, l);
    nav.dataset.handled = '1'; setTimeout(() => { delete nav.dataset.handled; }, 0);   // نتولى الانتقال بأنفسنا
    if (l && l.getAttribute('aria-current') !== 'page') location.hash = l.getAttribute('href');
    else if (l && moved <= DRAG_THRESHOLD) l.click();                                    // التبويب الحالي: يعيد الصفحة إلى أعلاها
  }
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  nav.addEventListener('click', e => { if (nav.dataset.handled && e.isTrusted) { e.preventDefault(); e.stopPropagation(); } }, true);

  document.addEventListener('viewchange', () => requestAnimationFrame(() => place(true)));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => place(false), 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(false));
  place(false);
})();
