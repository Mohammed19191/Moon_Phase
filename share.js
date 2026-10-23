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

  /* ---------- رسم البطاقة 1080×1350 (مقاس منشورات واتساب وإنستغرام) ---------- */
  async function drawCard(opt) {
    const { date, info, title, verse, ref, line } = opt;
    const [moon, hasFont] = await Promise.all([moonImage(info), verse ? verseFont() : Promise.resolve(false)]);
    const W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070B1E'); bg.addColorStop(0.6, '#0B1026'); bg.addColorStop(1, '#1a2048');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const R = seeded(Math.floor(date.getTime() / 864e5) % 2147483646 + 1);
    for (let n = 0; n < 240; n++) {
      x.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.6})`;
      x.beginPath(); x.arc(R() * W, R() * H, R() * 1.8 + 0.3, 0, Math.PI * 2); x.fill();
    }
    const mx = W / 2, my = 500, mr = 280;
    const glow = x.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 1.9);
    glow.addColorStop(0, `rgba(254,234,250,${0.08 + 0.2 * info.illum})`); glow.addColorStop(1, 'rgba(254,234,250,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
    if (moon.img) { const s = (mr * 2) / moon.disc; x.drawImage(moon.img, mx - s / 2, my - s / 2, s, s); }

    x.direction = 'rtl'; x.textAlign = 'center';
    x.fillStyle = '#FFB8D9'; x.font = `600 50px ${UI}`;
    x.fillText(title, mx, 118);
    x.fillStyle = '#FEEAFA'; x.font = `700 74px ${UI}`;
    x.fillText(info.phase.name, mx, 885);
    x.fillStyle = '#EFD3D7'; x.font = `400 34px ${UI}`;
    x.fillText(hijri(date) + '  ·  ' + greg(date), mx, 945);
    x.fillText('عمر القمر ' + ar(info.age, 1) + ' يومًا  ·  الإضاءة ' + ar(Math.round(info.illum * 100)) + '٪', mx, 995);

    if (verse) {
      x.fillStyle = '#FEEAFA';
      x.font = hasFont ? "46px 'Amiri Quran Card', serif" : `500 42px ${UI}`;
      const lines = wrapLines(x, '﴿ ' + verse + ' ﴾', 920).slice(0, 3);
      let y = 1105 - (lines.length - 1) * 38;
      for (const l of lines) { x.fillText(l, mx, y); y += 80; }
      if (ref) { x.fillStyle = '#FFB8D9'; x.font = `400 28px ${UI}`; x.fillText(ref, mx, y - 22); }
    } else if (line) {
      x.fillStyle = '#FEEAFA'; x.font = `500 40px ${UI}`;
      x.fillText(line, mx, 1110);
    }
    x.direction = 'ltr'; x.fillStyle = '#FFB8D9'; x.font = `600 30px ${UI}`;
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
  const input = $('birthDate');
  if (!input) return;
  const result = $('birthResult'), img = $('birthMoonImg');
  input.max = new Date().toISOString().slice(0, 10);
  let birth = null;

  async function showBirth() {
    const v = input.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { result.hidden = true; return; }
    const [y, m, d] = v.split('-').map(Number);
    const date = new Date(y, m - 1, d, 20, 0, 0);          // «ليلة» اليوم: الثامنة مساءً بالتوقيت المحلي
    if (isNaN(date) || date > new Date()) { result.hidden = true; return; }
    store.set('birthDate', v);
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
  input.addEventListener('change', showBirth);
  const saved = store.get('birthDate');
  if (saved) { input.value = saved; showBirth(); }

  $('birthShare').addEventListener('click', () => {
    if (!birth) return;
    const { date, info, full } = birth;
    openCard({ date, info, title: 'قمر ليلة ميلادي', line: `أشرق منذ ميلادي ${fullMoons(full)}` },
      `قمر ليلة ميلادي: ${info.phase.name} · ${hijri(date)}\nأشرق منذ ميلادي ${fullMoons(full)}\nhttps://${SITE}`);
  });
})();
