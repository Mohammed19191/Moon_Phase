/* glass-sliders.js — مقبض زجاجي لشريطي التقدم والصوت في المشغّل (كما في iOS 26: يتحول المقبض
   إلى قطرة زجاج أثناء سحبه، ثم يعود مقبضًا عاديًا عند الإفلات).
   يستعمل مرشح الانكسار نفسه الذي تبنيه عدسة الشريط (nav-lens.js › GlassLens)، فيعمل في Chromium فقط،
   ويبقى المقبض العادي في سفاري وفايرفوكس وعند طلب تقليل الشفافية. */
(() => {
  'use strict';
  if (!window.GlassLens) return;                         // المتصفح لا يدعم العدسة
  const W = 46, H = 30, THUMB = 18;                      // مقاس القطرة، وقطر المقبض الأصلي
  const SLIDERS = '.qp-seek, .qp-volume';
  let active = null;

  function lensFor(input) {
    const wrap = input.parentElement;
    let lens = wrap.querySelector(':scope > .slider-lens');
    if (lens) return lens;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    lens = document.createElement('span');
    lens.className = 'slider-lens';
    lens.setAttribute('aria-hidden', 'true');
    const refr = document.createElement('span'); refr.className = 'slider-lens-refr';
    const tint = document.createElement('span'); tint.className = 'slider-lens-tint';
    lens.append(refr, tint);
    const id = GlassLens.filterFor(W, H);
    const disp = document.querySelector('#' + id + ' feDisplacementMap');
    if (disp) disp.setAttribute('scale', disp.getAttribute('data-max'));   // انكسار كامل: القطرة تظهر وقت السحب فقط
    refr.style.backdropFilter = `url(#${id})`;
    wrap.appendChild(lens);
    return lens;
  }

  // موضع المقبض على الشريط، مع مراعاة اتجاه العربية (القيمة الصغرى يمينًا)
  function place(input, lens) {
    const min = +input.min || 0, max = +input.max || 100, p = (input.value - min) / ((max - min) || 1);
    const ir = input.getBoundingClientRect(), wr = input.parentElement.getBoundingClientRect();
    const rtl = getComputedStyle(input).direction === 'rtl';
    const along = THUMB / 2 + p * (ir.width - THUMB);
    const cx = (rtl ? ir.right - along : ir.left + along) - wr.left;
    const cy = ir.top + ir.height / 2 - wr.top;
    lens.style.transform = `translate(${(cx - W / 2).toFixed(1)}px, ${(cy - H / 2).toFixed(1)}px)`;
  }

  document.addEventListener('pointerdown', e => {
    const input = e.target.closest && e.target.closest(SLIDERS);
    if (!input || input.disabled || !e.isPrimary || e.button > 0) return;
    const lens = lensFor(input);
    active = { input, lens, id: e.pointerId };
    input.classList.add('is-lens');
    place(input, lens);
    requestAnimationFrame(() => { place(input, lens); lens.classList.add('is-on'); });   // بعد أن يقفز المقبض إلى الإصبع
  }, true);
  document.addEventListener('input', e => { if (active && e.target === active.input) place(active.input, active.lens); }, true);
  const end = e => {
    if (!active || (e.pointerId != null && e.pointerId !== active.id)) return;
    const { input, lens } = active;
    active = null;
    lens.classList.remove('is-on');
    setTimeout(() => input.classList.remove('is-lens'), 180);   // يعود المقبض بعد انكماش القطرة
  };
  addEventListener('pointerup', end, true);
  addEventListener('pointercancel', end, true);
})();
