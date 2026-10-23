/* share.js — بطاقة المشاركة (قمر الليلة مع آية اليوم، أو قمر ليلة الميلاد) وقسم «قمر ليلة ميلادك» */
(() => {
  'use strict';
  const { moonInfo, PHASES, ar, store } = SiteKit;
  const $ = id => document.getElementById(id);
  const SYN = 29.530588861;
  const SITE = 'batoool.net';

  /* ---------- تنسيق التواريخ ---------- */
  const fmt = (opts, cal) => { try { return new Intl.DateTimeFormat('ar-SA-u-ca-' + cal, opts); } catch (e) { return null; } };
  const hijriF = fmt({ day: 'numeric', month: 'long', year: 'numeric' }, 'islamic-umalqura');
  const gregF = fmt({ day: 'numeric', month: 'long', year: 'numeric' }, 'gregory');
  const dayF = fmt({ weekday: 'long' }, 'gregory');
  const hijri = d => (hijriF ? hijriF.format(d) : '');
  const greg = d => (gregF ? gregF.format(d) : d.toLocaleDateString('ar'));
  const weekday = d => (dayF ? dayF.format(d) : '');

  /* ---------- صورة القمر: من المجسم ثلاثي الأبعاد، وإلا صورة الطور ---------- */
  function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
  async function moonImage(info) {
    if (window.Moon3D && await Moon3D.available()) {
      try { const url = await Moon3D.snapshot(info.fraction, 700); return { img: await loadImg(url), disc: Moon3D.DISC }; } catch (e) { /* نكمل بالصورة */ }
    }
    return { img: await loadImg('images1/' + info.phase.file), disc: 0.9 };
  }

  /* ---------- خط الآيات (محلي) ---------- */
  let fontReady = null;
  function verseFont() {
    if (!fontReady) {
      fontReady = ('FontFace' in window)
        ? new FontFace('Amiri Quran Card', "url(fonts/amiri-quran.woff2) format('woff2')").load()
            .then(f => { document.fonts.add(f); return true; }).catch(() => false)
        : Promise.resolve(false);
    }
    return fontReady;
  }
  const UI = "'Segoe UI', Tahoma, Geneva, sans-serif";

  function wrapLines(ctx, text, maxW) {
    const words = text.split(/\s+/), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function fullMoons(n) {
    const r = n % 100;
    const word = (r >= 3 && r <= 10) ? 'بدور' : (r >= 11 ? 'بدرًا' : 'بدر');
    return ar(n) + ' ' + word;
  }
  function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  /* ---------- ألوان البطاقة تتبع المظهر المختار ---------- */
  const PALETTES = {
    dark:     { bg: ['#070B1E', '#0B1026', '#1a2048'], stars: 1, decor: '', glow: '254,234,250',
                title: '#FFB8D9', main: '#FEEAFA', sub: '#EFD3D7' },
    light:    { bg: ['#FF6B3D', '#FF8F45', '#FFB347'], stars: 0, decor: 'clouds', glow: '255,255,255',
                title: '#1B2530', main: '#1B2530', sub: '#2A323D' },
    sakura:   { bg: ['#FFF0F5', '#FFE0E6', '#FFD3DF'], stars: 0, decor: 'sakura', glow: '255,255,255',
                title: '#B0245A', main: '#5E1B3C', sub: '#7A1744' },
    burgundy: { bg: ['#230410', '#3A0713', '#5C0A1F'], stars: 1, decor: '', glow: '255,233,238',
                title: '#FFB8C8', main: '#FFE9EE', sub: '#F6DDE3' }
  };
  function cardPalette() {
    const b = document.body, t = b.dataset.theme;
    const base = PALETTES[t] || PALETTES.dark;
    if (b.dataset.sky !== 'live' || !SiteKit.liveSky) return base;
    const L = SiteKit.liveSky();                     // السماء الحية: لون السماء في هذه الساعة نفسها
    if (L.palette === 'light') return { ...PALETTES.light, bg: [L.top, L.bottom] };
    return { ...PALETTES.dark, bg: [L.top, L.bottom], stars: Math.max(0.35, L.night) };
  }

  /* ---------- رسم البطاقة 1080×1350 (مقاس منشورات واتساب وإنستغرام) ---------- */
  async function drawCard(opt) {
    const { date, info, title, verse, ref, line } = opt;
    const [moon, hasFont] = await Promise.all([moonImage(info), verse ? verseFont() : Promise.resolve(false)]);
    const W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    const P = cardPalette();
    const bg = x.createLinearGradient(0, 0, 0, H);
    P.bg.forEach((c, i) => bg.addColorStop(i / (P.bg.length - 1), c));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const R = seeded(Math.floor(date.getTime() / 864e5) % 2147483646 + 1);
    if (P.stars > 0) {
      for (let n = 0; n < 240; n++) {
        x.fillStyle = `rgba(255,255,255,${(0.15 + R() * 0.6) * P.stars})`;
        x.beginPath(); x.arc(R() * W, R() * H * 0.9, R() * 1.8 + 0.3, 0, Math.PI * 2); x.fill();
      }
    }
    if (P.decor === 'clouds') {
      const cloud = await loadImg('images1/cloud.webp');
      if (cloud) [[-120, 170, 520, .75], [640, 300, 560, .7], [-60, 1180, 600, .55], [700, 1080, 480, .5]].forEach(([cx, cy, cw, a]) => {
        x.globalAlpha = a; x.drawImage(cloud, cx, cy, cw, cw * cloud.height / cloud.width);
      });
      x.globalAlpha = 1;
    } else if (P.decor === 'sakura') {
      const [branch, petal] = await Promise.all([loadImg('images1/sakuraBranch.webp'), loadImg('images1/sakura.webp')]);
      if (branch) { x.globalAlpha = .55; x.drawImage(branch, W - 430, -30, 460, 460 * branch.height / branch.width); }
      if (petal) for (let n = 0; n < 14; n++) {
        const s2 = 22 + R() * 26; x.globalAlpha = .35 + R() * .4;
        x.drawImage(petal, R() * W, 180 + R() * (H - 260), s2, s2);
      }
      x.globalAlpha = 1;
    }
    const mx = W / 2, my = 500, mr = 280;
    const glow = x.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 1.9);
    glow.addColorStop(0, `rgba(${P.glow},${0.08 + 0.2 * info.illum})`); glow.addColorStop(1, `rgba(${P.glow},0)`);
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
    if (moon.img) { const s = (mr * 2) / moon.disc; x.drawImage(moon.img, mx - s / 2, my - s / 2, s, s); }

    x.direction = 'rtl'; x.textAlign = 'center';
    x.fillStyle = P.title; x.font = `600 50px ${UI}`;
    x.fillText(title, mx, 118);
    x.fillStyle = P.main; x.font = `700 74px ${UI}`;
    x.fillText(info.phase.name, mx, 885);
    x.fillStyle = P.sub; x.font = `400 34px ${UI}`;
    x.fillText(hijri(date) + '  ·  ' + greg(date), mx, 945);
    x.fillText('عمر القمر ' + ar(info.age, 1) + ' يومًا  ·  الإضاءة ' + ar(Math.round(info.illum * 100)) + '٪', mx, 995);

    if (verse) {
      x.fillStyle = P.main;
      x.font = hasFont ? "46px 'Amiri Quran Card', serif" : `500 42px ${UI}`;
      const lines = wrapLines(x, '﴿ ' + verse + ' ﴾', 920).slice(0, 3);
      let y = 1105 - (lines.length - 1) * 38;
      for (const l of lines) { x.fillText(l, mx, y); y += 80; }
      if (ref) { x.fillStyle = P.title; x.font = `400 28px ${UI}`; x.fillText(ref, mx, y - 22); }
    } else if (line) {
      x.fillStyle = P.main; x.font = `500 40px ${UI}`;
      x.fillText(line, mx, 1110);
    }
    x.direction = 'ltr'; x.fillStyle = P.title; x.font = `600 30px ${UI}`;
    x.fillText(SITE, mx, H - 58);
    return cv;
  }

  /* ---------- نافذة المعاينة والمشاركة ---------- */
  let sheet, sheetImg, shareBtn, saveLink, statusEl, lastFocus, current = null, blobUrl = null;
  function buildSheet() {
    sheet = document.createElement('div');
    sheet.className = 'share-sheet';
    sheet.hidden = true;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'shareTitle');
    sheet.innerHTML = `
      <div class="share-panel">
        <h2 id="shareTitle">بطاقة للمشاركة</h2>
        <div class="share-frame"><img alt="" id="shareImg"><span class="share-wait" id="shareWait">تُرسم البطاقة…</span></div>
        <div class="share-actions">
          <button type="button" class="share-primary" id="shareNow" hidden>مشاركة</button>
          <a class="share-secondary" id="shareSave" download="batoool-moon.jpg">حفظ الصورة</a>
          <button type="button" class="share-secondary" id="shareClose">إغلاق</button>
        </div>
        <p class="share-status" id="shareStatus" aria-live="polite"></p>
      </div>`;
    document.body.appendChild(sheet);
    sheetImg = $('shareImg'); shareBtn = $('shareNow'); saveLink = $('shareSave'); statusEl = $('shareStatus');
    $('shareClose').addEventListener('click', closeSheet);
    sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
    shareBtn.addEventListener('click', async () => {
      if (!current) return;
      try { await navigator.share({ files: [current.file], text: current.text }); }
      catch (e) { if (e && e.name !== 'AbortError') statusEl.textContent = 'تعذّرت المشاركة. احفظ الصورة ثم أرسلها.'; }
    });
  }
  function closeSheet() {
    sheet.hidden = true;
    document.documentElement.classList.remove('sheet-open');
    if (lastFocus) lastFocus.focus();
  }
  async function openCard(opt, text) {
    if (!sheet) buildSheet();
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.documentElement.classList.add('sheet-open');
    sheetImg.hidden = true; $('shareWait').hidden = false; statusEl.textContent = '';
    shareBtn.hidden = true; saveLink.removeAttribute('href');
    $('shareClose').focus();
    const cv = await drawCard(opt);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(blob);
    sheetImg.src = blobUrl; sheetImg.alt = opt.title + ': ' + opt.info.phase.name;
    sheetImg.hidden = false; $('shareWait').hidden = true;
    saveLink.href = blobUrl;
    const file = new File([blob], 'batoool-moon.jpg', { type: 'image/jpeg' });
    current = { file, text };
    if (navigator.canShare && navigator.canShare({ files: [file] })) shareBtn.hidden = false;
  }

  /* ---------- بطاقة الليلة (الشاشة الرئيسية) ---------- */
  function splitAyah(raw) {
    const m = raw.match(/^(.*)\s*\(([^()]+)\)\s*$/);
    return m ? { verse: m[1].trim(), ref: m[2].trim() } : { verse: raw.trim(), ref: '' };
  }
  const nightBtn = $('shareTonight');
  if (nightBtn) nightBtn.addEventListener('click', () => {
    const date = new Date(), info = moonInfo(date);
    const { verse, ref } = splitAyah(($('ayah') || {}).textContent || '');
    openCard({ date, info, title: 'قمر الليلة', verse, ref },
      `قمر الليلة: ${info.phase.name} · ${hijri(date)}\n﴿${verse}﴾ ${ref ? '(' + ref + ')' : ''}\nhttps://${SITE}`);
  });

  /* ---------- قمر ليلة ميلادك (شاشة عمر القمر) ---------- */
  const pickBtn = $('birthPick');
  if (!pickBtn) return;
  const result = $('birthResult'), img = $('birthMoonImg'), pickLabel = $('birthPickValue');
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const MIN_YEAR = 1937;                               // بداية تقويم أم القرى في المتصفحات
  const pad2 = n => String(n).padStart(2, '0');
  const yearTxt = y => ar(y).replace(/[٬,]/g, '');
  const daysIn = (y, m) => new Date(y, m, 0).getDate();
  let birth = null, picked = null;                     // picked = { y, m, d }

  async function showBirth() {
    if (!picked) { result.hidden = true; return; }
    const { y, m, d } = picked;
    const date = new Date(y, m - 1, d, 20, 0, 0);       // «ليلة» اليوم: الثامنة مساءً بالتوقيت المحلي
    if (isNaN(date)) { result.hidden = true; return; }
    pickLabel.textContent = `${ar(d)} ${MONTHS[m - 1]} ${yearTxt(y)}`;
    pickBtn.classList.add('has-value');
    const info = moonInfo(date);
    const full = Math.max(0, Math.floor((Date.now() - date.getTime()) / (SYN * 864e5)));
    birth = { date, info, full };
    $('birthPhase').textContent = info.key === 'full' ? 'وُلدتَ ليلة البدر' : 'وُلدتَ والقمر ' + info.phase.name;
    $('birthText').textContent = `${weekday(date)} ${greg(date)}، الموافق ${hijri(date)}. كان عمر القمر ${ar(info.age, 1)} يومًا، ومضاءً بنحو ${ar(Math.round(info.illum * 100))}٪.`;
    $('birthCount').textContent = `عدد البدور التي أشرقت منذ ميلادك: ${ar(full)}`;
    img.alt = 'القمر ليلة الميلاد: ' + info.phase.name;
    result.hidden = false;
    const moon = await moonImage(info);
    if (moon.img && birth && birth.date === date) img.src = moon.img.src;
  }

  /* عجلة واحدة على نمط عجلة اختيار القارئ (التمرير الأصلي مع التثبيت، والسحب بالفأرة، ولوحة المفاتيح) */
  const ITEM = 44, VISIBLE = 5;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function makeWheel(label, onChange) {
    const col = document.createElement('div');
    col.className = 'bdw-col';
    col.innerHTML = `<div class="qpw-wheel bdw-wheel" role="listbox" tabindex="0" aria-label="${label}"><ul class="qpw-list"></ul></div>`;
    const wheel = col.firstChild, list = wheel.firstChild;
    wheel.style.height = ITEM * VISIBLE + 'px';
    list.style.paddingBlock = ITEM * Math.floor(VISIBLE / 2) + 'px';
    let items = [], values = [], sel = 0, ticking = false;
    const idx = () => clamp(Math.round(wheel.scrollTop / ITEM), 0, items.length - 1);
    function paint() {
      ticking = false;
      const c = wheel.scrollTop / ITEM;
      items.forEach((li, i) => {
        const d = i - c, a = Math.abs(d);
        if (a > 3.2) { li.style.opacity = '0'; return; }
        li.style.opacity = String(Math.max(0.18, 1 - a * 0.32));
        li.style.transform = `rotateX(${clamp(-d * 24, -75, 75)}deg) scale(${1 - Math.min(a, 3) * 0.05})`;
      });
      const n = idx();
      if (n !== sel) { sel = n; mark(); onChange(); }
    }
    function mark() {
      items.forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
      if (items[sel]) wheel.setAttribute('aria-activedescendant', items[sel].id);
    }
    function goTo(i, smooth) {
      i = clamp(i, 0, items.length - 1);
      wheel.scrollTo({ top: i * ITEM, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
      if (!smooth || reduceMotion) { sel = i; mark(); paint(); }
    }
    function setItems(vals, text, keepValue) {
      const want = keepValue != null ? keepValue : values[sel];
      values = vals;
      list.textContent = '';
      items = vals.map((v, i) => {
        const li = document.createElement('li');
        li.className = 'qpw-item'; li.setAttribute('role', 'option');
        li.id = 'bdw-' + label + '-' + v; li.style.height = ITEM + 'px'; li.textContent = text(v);
        li.addEventListener('click', () => goTo(i, true));
        list.appendChild(li);
        return li;
      });
      const j = values.indexOf(want);
      sel = -1;
      goTo(j >= 0 ? j : Math.min(values.length - 1, Math.max(0, values.length - 1)), false);
    }
    wheel.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    let drag = null;
    wheel.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      drag = { y: e.clientY, top: wheel.scrollTop, moved: false };
      wheel.classList.add('is-drag'); wheel.setPointerCapture(e.pointerId);
    });
    wheel.addEventListener('pointermove', e => {
      if (!drag) return;
      if (Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
      wheel.scrollTop = drag.top - (e.clientY - drag.y);
    });
    const endDrag = e => {
      if (!drag) return;
      const moved = drag.moved; drag = null;
      wheel.classList.remove('is-drag');
      if (moved) { goTo(idx(), true); return; }
      const hit = e && e.clientX != null && document.elementFromPoint(e.clientX, e.clientY);
      const li = hit && hit.closest && hit.closest('.qpw-item');
      if (li) goTo(items.indexOf(li), true);
    };
    wheel.addEventListener('pointerup', endDrag);
    wheel.addEventListener('pointercancel', endDrag);
    wheel.addEventListener('keydown', e => {
      const k = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
      if (k) { e.preventDefault(); goTo(sel + k, true); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(0, true); }
      else if (e.key === 'End') { e.preventDefault(); goTo(items.length - 1, true); }
    });
    return { el: col, wheel, setItems, value: () => values[sel], set: v => { const j = values.indexOf(v); if (j >= 0) goTo(j, false); }, repaint: paint };
  }

  let picker = null;
  function buildPicker() {
    const wrap = document.createElement('div');
    wrap.className = 'qpw bdw';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="qpw-backdrop"></div>
      <div class="qpw-sheet" role="dialog" aria-modal="true" aria-label="اختيار تاريخ الميلاد">
        <div class="qpw-head">
          <button type="button" class="qpw-cancel">إلغاء</button>
          <span class="qpw-title">تاريخ الميلاد</span>
          <button type="button" class="qpw-done">تم</button>
        </div>
        <div class="bdw-labels" aria-hidden="true"><span>اليوم</span><span>الشهر</span><span>السنة</span></div>
        <div class="qpw-stage">
          <div class="qpw-band" aria-hidden="true"></div>
          <div class="bdw-cols"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const cols = wrap.querySelector('.bdw-cols');
    const now = new Date();
    const years = []; for (let y = MIN_YEAR; y <= now.getFullYear(); y++) years.push(y);
    const range = n => Array.from({ length: n }, (_, i) => i + 1);

    // اليوم يتبع الشهر والسنة (فبراير والسنوات الكبيسة)، ولا يُسمح بتاريخ في المستقبل
    let syncing = false;
    function sync() {
      if (syncing) return;
      syncing = true;
      const y = yW.value(), m = mW.value();
      const maxM = y === now.getFullYear() ? now.getMonth() + 1 : 12;
      if (mW.count !== maxM) { mW.count = maxM; mW.setItems(range(maxM), v => MONTHS[v - 1], Math.min(m, maxM)); }
      const mm = mW.value();
      let maxD = daysIn(y, mm);
      if (y === now.getFullYear() && mm === now.getMonth() + 1) maxD = now.getDate();
      if (dW.count !== maxD) { const d = dW.value(); dW.count = maxD; dW.setItems(range(maxD), v => ar(v), Math.min(d || 1, maxD)); }
      syncing = false;
    }
    const dW = makeWheel('اليوم', sync), mW = makeWheel('الشهر', sync), yW = makeWheel('السنة', sync);
    dW.el.classList.add('bdw-day'); mW.el.classList.add('bdw-month'); yW.el.classList.add('bdw-year');
    cols.append(dW.el, mW.el, yW.el);           // من اليمين: يوم، شهر، سنة

    function close() {
      wrap.classList.remove('is-open');
      document.documentElement.classList.remove('qpw-lock');
      setTimeout(() => { wrap.hidden = true; }, reduceMotion ? 0 : 220);
      pickBtn.focus({ preventScroll: true });
    }
    function done() {
      picked = { y: yW.value(), m: mW.value(), d: dW.value() };
      store.set('birthDate', `${picked.y}-${pad2(picked.m)}-${pad2(picked.d)}`);
      close();
      showBirth();
    }
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && e.target.classList.contains('bdw-wheel')) { e.preventDefault(); done(); }
    });
    wrap.querySelector('.qpw-backdrop').addEventListener('click', close);
    wrap.querySelector('.qpw-cancel').addEventListener('click', close);
    wrap.querySelector('.qpw-done').addEventListener('click', done);

    function open() {
      wrap.hidden = false;
      document.documentElement.classList.add('qpw-lock');
      requestAnimationFrame(() => wrap.classList.add('is-open'));
      const p = picked || { y: 2000, m: 1, d: 1 };
      syncing = true;
      yW.setItems(years, yearTxt, p.y);
      mW.count = 0; dW.count = 0;
      syncing = false;
      mW.setItems(range(12), v => MONTHS[v - 1], p.m); mW.count = 12;
      sync();
      dW.set(p.d);
      requestAnimationFrame(() => { dW.repaint(); mW.repaint(); yW.repaint(); });
      dW.wheel.focus({ preventScroll: true });
    }
    return { open };
  }
  pickBtn.addEventListener('click', () => { (picker = picker || buildPicker()).open(); });

  const saved = store.get('birthDate');
  if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
    const [y, m, d] = saved.split('-').map(Number);
    picked = { y, m, d };
    showBirth();
  }

  $('birthShare').addEventListener('click', () => {
    if (!birth) return;
    const { date, info, full } = birth;
    openCard({ date, info, title: 'قمر ليلة ميلادي', line: `أشرق منذ ميلادي ${fullMoons(full)}` },
      `قمر ليلة ميلادي: ${info.phase.name} · ${hijri(date)}\nأشرق منذ ميلادي ${fullMoons(full)}\nhttps://${SITE}`);
  });
})();
