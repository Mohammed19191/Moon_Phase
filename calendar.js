/* calendar.js — شاشة «تقويم القمر»: شهر هجري كامل بشكل القمر في كل ليلة، والأيام البيض، ومواعيد قادمة.
   - التواريخ الهجرية بتقويم أم القرى (Intl)، وطور القمر بحساب الموقع نفسه (SiteKit.moonInfo).
   - كل شيء يُحسب على الجهاز، فيعمل دون اتصال. */
(() => {
  'use strict';
  const { moonInfo, ar } = SiteKit;
  const view = document.getElementById('view-calendar');
  if (!view) return;
  const $ = id => document.getElementById(id);
  const DAY = 864e5;

  /* ---------- أدوات التاريخ ---------- */
  let HF = null, monthF = null, gregF = null, gregShortF = null, weekF = null;
  try {
    HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
    if (!/islamic/.test(HF.resolvedOptions().calendar)) HF = null;
    monthF = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long' });
    gregF = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' });
    gregShortF = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long' });
    weekF = new Intl.DateTimeFormat('ar', { weekday: 'long' });
  } catch (e) { HF = null; }
  if (!HF) { view.querySelector('.cal-card').innerHTML = '<p class="cal-note">متصفحك لا يدعم التقويم الهجري.</p>'; return; }

  const noon = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const addDays = (d, n) => noon(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const daysBetween = (a, b) => Math.round((noon(b) - noon(a)) / DAY);
  function hp(date) {                                       // التاريخ الهجري لليوم
    const o = {};
    for (const p of HF.formatToParts(date)) if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
    return { y: o.year, m: o.month, d: o.day };
  }
  // أول يوم (ميلادي) من شهر هجري معيّن
  function monthStart(y, m) {
    let g = noon(new Date()), p = hp(g);
    for (let i = 0; i < 40; i++) {
      const diff = (y - p.y) * 12 + (m - p.m);
      if (!diff) break;
      g = addDays(g, Math.round(diff * 29.53));
      p = hp(g);
    }
    g = addDays(g, -(p.d - 1));
    while (hp(g).d !== 1) g = addDays(g, -1);               // احتياط
    return g;
  }
  function monthLength(start) { return hp(addDays(start, 29)).d === 30 ? 30 : 29; }
  const shift = (y, m, n) => { const k = y * 12 + (m - 1) + n; return { y: Math.floor(k / 12), m: (k % 12 + 12) % 12 + 1 }; };
  const hijriText = (date, p = hp(date)) => `${ar(p.d)} ${monthF.format(date)} ${yearTxt(p.y)}`;
  const yearTxt = y => y.toLocaleString('ar-SA', { useGrouping: false });
  // شكل القمر في مساء اليوم؛ ولليوم الحالي اللحظة نفسها حتى يطابق ما في الرئيسية
  const evening = d => sameDay(d, new Date()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 21);

  /* ---------- رسم القمر الصغير ---------- */
  function moonIcon(f, size) {
    const r = 46, c = Math.cos(2 * Math.PI * f), rx = (r * Math.abs(c)).toFixed(2);
    const waxing = f < 0.5, crescent = c > 0;
    const outer = waxing ? 1 : 0, inner = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    return `<svg class="cal-moon" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
      `<circle class="cal-moon-dark" cx="50" cy="50" r="${r}"/>` +
      `<path class="cal-moon-lit" d="M50 4 A${r} ${r} 0 0 ${outer} 50 96 A${rx} ${r} 0 0 ${inner} 50 4Z"/></svg>`;
  }

  /* ---------- لحظة البدر والمحاق القادمين ---------- */
  function nextPhase(target, from = new Date()) {           // target: 0.5 بدر، 0 محاق
    const g = t => { const f = moonInfo(new Date(t)).fraction; return target ? f - 0.5 : (f < 0.5 ? f : f - 1); };
    const H = 36e5;
    let a = from.getTime(), ga = g(a);
    for (let i = 0; i < 24 * 32; i++) {
      const b = a + H, gb = g(b);
      if (ga < 0 && gb >= 0 && gb - ga < 0.5) {
        let lo = a, hi = b;
        for (let k = 0; k < 16; k++) { const mid = (lo + hi) / 2; if (g(mid) < 0) lo = mid; else hi = mid; }
        return new Date(hi);
      }
      a = b; ga = gb;
    }
    return null;
  }

  function inDays(n) {
    if (n <= 0) return 'اليوم';
    if (n === 1) return 'غدًا';
    if (n === 2) return 'بعد يومين';
    return n <= 10 ? `بعد ${ar(n)} أيام` : `بعد ${ar(n)} يومًا`;
  }

  /* ---------- شبكة الشهر ---------- */
  const grid = $('calGrid'), titleEl = $('calMonth'), subEl = $('calSub'), dayEl = $('calDay'), todayBtn = $('calToday');
  let shown = null, selected = null, today = noon(new Date());

  function render(y, m, keepSel) {
    today = noon(new Date());
    const start = monthStart(y, m), len = monthLength(start), end = addDays(start, len - 1);
    shown = { y, m, start, len };
    titleEl.textContent = `${monthF.format(addDays(start, 14))} ${yearTxt(y)} هـ`;
    subEl.textContent = `${gregShortF.format(start)} – ${gregF.format(end)}`;
    const tp = hp(today);
    todayBtn.hidden = tp.y === y && tp.m === m;
    const cells = [];
    for (let i = 0; i < start.getDay(); i++) cells.push('<span class="cal-cell cal-blank"></span>');
    for (let d = 1; d <= len; d++) {
      const date = addDays(start, d - 1), info = moonInfo(evening(date));
      const cls = ['cal-cell'];
      if (sameDay(date, today)) cls.push('is-today');
      if (d >= 13 && d <= 15) cls.push('is-white');
      const label = `${weekF.format(date)} ${hijriText(date, { y, m, d })}، ${info.phase.name}` + (d >= 13 && d <= 15 ? '، من الأيام البيض' : '') + (sameDay(date, today) ? '، اليوم' : '');
      cells.push(`<button type="button" class="${cls.join(' ')}" data-d="${d}" aria-label="${label}" aria-pressed="false">` +
        moonIcon(info.fraction, 26) + `<span class="cal-h">${ar(d)}</span><span class="cal-g">${ar(date.getDate())}</span></button>`);
    }
    grid.innerHTML = cells.join('');
    let pick = keepSel && selected && selected >= start && selected <= end ? selected : null;
    if (!pick) pick = (tp.y === y && tp.m === m) ? today : start;
    select(pick);
  }

  function select(date) {
    selected = date;
    const d = daysBetween(shown.start, date) + 1;
    grid.querySelectorAll('.cal-cell[data-d]').forEach(b => {
      const on = +b.dataset.d === d;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const info = moonInfo(evening(date)), p = { y: shown.y, m: shown.m, d };
    const tags = [];
    if (sameDay(date, today)) tags.push('اليوم');
    if (d >= 13 && d <= 15) tags.push('من الأيام البيض');
    dayEl.innerHTML = moonIcon(info.fraction, 72) +
      `<div class="cal-day-info"><p class="cal-day-date">${weekF.format(date)} ${hijriText(date, p)} هـ</p>` +
      `<p class="cal-day-greg">${gregF.format(date)}</p>` +
      `<p class="cal-day-phase">${info.phase.name} · الإضاءة نحو ${ar(Math.round(info.illum * 100))}٪ · عمر القمر ${ar(info.age, 1)} يومًا</p>` +
      (tags.length ? `<p class="cal-day-tags">${tags.map(t => `<span>${t}</span>`).join('')}</p>` : '') + '</div>';
  }

  grid.addEventListener('click', e => {
    const b = e.target.closest('.cal-cell[data-d]');
    if (b) select(addDays(shown.start, +b.dataset.d - 1));
  });
  // الأسهم تتنقل بين الأيام داخل الشبكة (العربية: اليمين = اليوم السابق)
  grid.addEventListener('keydown', e => {
    const b = e.target.closest('.cal-cell[data-d]');
    const step = { ArrowRight: -1, ArrowLeft: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!b || !step) return;
    const n = +b.dataset.d + step;
    if (n < 1 || n > shown.len) return;
    e.preventDefault();
    const t = grid.querySelector(`.cal-cell[data-d="${n}"]`);
    t.focus(); select(addDays(shown.start, n - 1));
  });
  const go = n => { const s = shift(shown.y, shown.m, n); render(s.y, s.m, false); };
  $('calPrev').addEventListener('click', () => go(-1));
  $('calNext').addEventListener('click', () => go(1));
  todayBtn.addEventListener('click', () => { const p = hp(noon(new Date())); render(p.y, p.m, false); });
  // السحب الأفقي على الشبكة يقلّب الشهور (كصفحات التقويم العربي: القادم إلى اليسار)
  let sw = null;
  grid.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') sw = { x: e.clientX, y: e.clientY }; });
  grid.addEventListener('pointerup', e => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) go(dx > 0 ? 1 : -1);
  });
  grid.addEventListener('pointercancel', () => { sw = null; });

  /* ---------- مواعيد قادمة ---------- */
  function nextHijri(m, d) {                                 // أقرب موعد قادم ليوم هجري (شهر، يوم)
    const tp = hp(today);
    let y = tp.y;
    if (m < tp.m || (m === tp.m && d < tp.d)) y++;
    return addDays(monthStart(y, m), d - 1);
  }
  function events() {
    today = noon(new Date());
    const tp = hp(today), list = [];
    const full = nextPhase(0.5), neu = nextPhase(0);
    if (full) list.push({ t: 'البدر القادم', date: noon(full), f: 0.5 });
    if (neu) list.push({ t: 'المحاق القادم (ولادة هلال جديد)', date: noon(neu), f: 0 });
    // الأيام البيض: ١٣ و١٤ و١٥ من الشهر الهجري
    const wm = tp.d <= 15 ? { y: tp.y, m: tp.m } : shift(tp.y, tp.m, 1);
    const w13 = addDays(monthStart(wm.y, wm.m), 12), w15 = addDays(w13, 2);
    list.push({ t: 'الأيام البيض', date: today >= w13 ? today : w13, range: [w13, w15], f: 0.48, now: today >= w13 });
    const nm = shift(tp.y, tp.m, 1), ns = monthStart(nm.y, nm.m);
    list.push({ t: `غرّة ${monthF.format(addDays(ns, 14))}`, date: ns, f: 0.04 });
    [[9, 1, 'أول رمضان'], [10, 1, 'عيد الفطر'], [12, 9, 'يوم عرفة'], [12, 10, 'عيد الأضحى'], [1, 1, 'رأس السنة الهجرية'], [1, 10, 'عاشوراء']]
      .forEach(([m, d, t]) => {
        const date = nextHijri(m, d);
        if (!list.some(x => sameDay(x.date, date) && x.t.startsWith('غرّة'))) list.push({ t, date, f: moonInfo(evening(date)).fraction });
        else list.find(x => sameDay(x.date, date) && x.t.startsWith('غرّة')).t = t;
      });
    list.sort((a, b) => a.date - b.date);
    return list;
  }
  function renderEvents() {
    const list = events();
    $('calEvents').innerHTML = list.map(ev => {
      const n = daysBetween(today, ev.date);
      const when = ev.range
        ? `${weekF.format(ev.range[0])} ${gregShortF.format(ev.range[0])} – ${weekF.format(ev.range[1])} ${gregShortF.format(ev.range[1])}`
        : `${weekF.format(ev.date)} ${gregF.format(ev.date)} · ${hijriText(ev.date)} هـ`;
      return `<li class="cal-ev">${moonIcon(ev.f, 34)}<div class="cal-ev-main"><span class="cal-ev-title">${ev.t}</span>` +
        `<span class="cal-ev-when">${when}</span></div><span class="cal-ev-in${n <= 0 ? ' is-now' : ''}">${ev.now ? 'جارية الآن' : inDays(n)}</span></li>`;
    }).join('');
    // سطر في الرئيسية يدلّ على أقرب موعد قمري
    const chip = $('homeNext');
    if (chip) {
      const tp = hp(today);
      let txt;
      if (tp.d >= 13 && tp.d <= 15) txt = 'اليوم من الأيام البيض';
      else {
        const full = list.find(x => x.t === 'البدر القادم');
        const n = full ? daysBetween(today, full.date) : null;
        txt = n === null ? 'تقويم القمر' : n <= 0 ? 'الليلة ليلة البدر' : `البدر ${inDays(n)}`;
      }
      chip.querySelector('.home-next-text').textContent = txt;
      chip.hidden = false;
    }
  }

  function refresh() {
    const p = hp(noon(new Date()));
    if (!shown) render(p.y, p.m, false);
    else if (!sameDay(today, noon(new Date()))) render(shown.y, shown.m, true);
    renderEvents();
  }
  refresh();
  document.addEventListener('viewchange', e => { if (e.detail.view === 'calendar') refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
