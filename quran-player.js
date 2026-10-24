/* quran-player.js — مشغل يتلو الآية المعروضة بصوت قارئ يختاره الزائر.
   المصدر الصوتي: EveryAyah (ملف لكل آية: السورة والآية بثلاث خانات، مثل 002152.mp3).
   الاستخدام:  const player = QuranPlayer.mount(element);  player.setAyah({ surah, verse, complete }); */
(() => {
  'use strict';

  const BASE = 'https://everyayah.com/data/';

  const SURAH_NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];

  // عدد آيات كل سورة (المصحف المدني، مجموعها ٦٢٣٦) — لمعرفة نهاية السورة عند الإكمال
  const VERSE_COUNT = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

  // اسم المجلد عند EveryAyah — منقول حرفيًا من قائمتهم الرسمية (recitations.js)
  const QARIS = [
    { id: 'alafasy',   name: 'مشاري راشد العفاسي',                dir: 'Alafasy_128kbps' },
    { id: 'sudais',    name: 'عبد الرحمن السديس',                 dir: 'Abdurrahmaan_As-Sudais_192kbps' },
    { id: 'shuraym',   name: 'سعود الشريم',                       dir: 'Saood_ash-Shuraym_128kbps' },
    { id: 'maher',     name: 'ماهر المعيقلي',                     dir: 'MaherAlMuaiqly128kbps' },
    { id: 'husary',    name: 'محمود خليل الحصري (مرتّل)',          dir: 'Husary_128kbps' },
    { id: 'husaryM',   name: 'محمود خليل الحصري (مجوّد)',          dir: 'Husary_128kbps_Mujawwad' },
    { id: 'minshawy',  name: 'محمد صديق المنشاوي (مرتّل)',         dir: 'Minshawy_Murattal_128kbps' },
    { id: 'minshawyM', name: 'محمد صديق المنشاوي (مجوّد)',         dir: 'Minshawy_Mujawwad_192kbps' },
    { id: 'basit',     name: 'عبد الباسط عبد الصمد (مرتّل)',       dir: 'Abdul_Basit_Murattal_192kbps' },
    { id: 'basitM',    name: 'عبد الباسط عبد الصمد (مجوّد)',       dir: 'Abdul_Basit_Mujawwad_128kbps' },
    { id: 'ajamy',     name: 'أحمد بن علي العجمي',                dir: 'ahmed_ibn_ali_al_ajamy_128kbps' },
    { id: 'ghamadi',   name: 'سعد الغامدي',                       dir: 'Ghamadi_40kbps' },
    { id: 'hudhaify',  name: 'علي الحذيفي',                       dir: 'Hudhaify_128kbps' },
    { id: 'dussary',   name: 'ياسر الدوسري',                      dir: 'Yasser_Ad-Dussary_128kbps' },
    { id: 'qatami',    name: 'ناصر القطامي',                      dir: 'Nasser_Alqatami_128kbps' },
    { id: 'budair',    name: 'صلاح البدير',                       dir: 'Salah_Al_Budair_128kbps' },
    { id: 'rifai',     name: 'هاني الرفاعي',                      dir: 'Hani_Rifai_192kbps' },
    { id: 'qahtani',   name: 'خالد القحطاني',                     dir: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps' },
    { id: 'qasim',     name: 'محسن القاسم',                       dir: 'Muhsin_Al_Qasim_192kbps' },
    { id: 'basfar',    name: 'عبد الله بصفر',                     dir: 'Abdullah_Basfar_192kbps' },
    { id: 'shatri',    name: 'أبو بكر الشاطري',                   dir: 'Abu_Bakr_Ash-Shaatree_128kbps' },
    { id: 'matroud',   name: 'عبد الله المطرود',                  dir: 'Abdullah_Matroud_128kbps' },
    { id: 'bukhatir',  name: 'صلاح بو خاطر',                      dir: 'Salaah_AbdulRahman_Bukhatir_128kbps' },
    { id: 'ayyoub',    name: 'محمد أيوب',                         dir: 'Muhammad_Ayyoub_128kbps' },
    { id: 'jibreel',   name: 'محمد جبريل',                        dir: 'Muhammad_Jibreel_128kbps' },
    { id: 'akhdar',    name: 'إبراهيم الأخضر',                    dir: 'Ibrahim_Akhdar_32kbps' },
    { id: 'aljaber',   name: 'علي جابر',                          dir: 'Ali_Jaber_64kbps' },
    { id: 'abbad',     name: 'فارس عباد',                         dir: 'Fares_Abbad_64kbps' },
    { id: 'salamah',   name: 'ياسر سلامة',                        dir: 'Yaser_Salamah_128kbps' }
  ];
  const DEFAULT_QARI = 'shuraym';
  const SPEEDS = [1, 1.25, 1.5, 0.75];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* التخزين غير متاح */ } }
  };

  const pad3 = n => String(n).padStart(3, '0');
  const ar = (n, digits = 0) => Number(n).toLocaleString('ar-SA', { useGrouping: false, maximumFractionDigits: digits }).replace(/\u066B/g, ',');
  const fmt = s => {
    s = isFinite(s) && s > 0 ? s : 0;
    return ar(Math.floor(s / 60)) + ':' + ar(Math.floor(s % 60)).padStart(2, '٠');
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const ICONS = {
    play:  '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    spin:  '<svg class="i-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7z"/></svg>',
    repeat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    prev:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5h2v14h-2zM16 12 6 5v14z"/></svg>',
    next:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2v14H4zM8 12l10-7v14z"/></svg>',
    volOn: '<svg class="i-vol-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    volOff:'<svg class="i-vol-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
  };

  const TEMPLATE = `
    <div class="qp-main">
      <div class="qp-seekwrap">
        <input type="range" class="qp-seek" min="0" max="1000" step="1" value="0" disabled aria-label="موضع التلاوة">
        <div class="qp-times" aria-hidden="true"><span class="qp-cur">٠:٠٠</span><span class="qp-dur">٠:٠٠</span></div>
      </div>
    </div>
    <div class="qp-transport">
      <button type="button" class="qp-btn qp-back" aria-label="الآية السابقة" title="الآية السابقة">${ICONS.prev}</button>
      <button type="button" class="qp-play" aria-label="تشغيل التلاوة">${ICONS.play}${ICONS.pause}${ICONS.spin}</button>
      <button type="button" class="qp-btn qp-fwd" aria-label="الآية التالية" title="الآية التالية">${ICONS.next}</button>
    </div>
    <div class="qp-qari">
      <span class="qp-qari-label" id="qpQariLabel">القارئ</span>
      <button type="button" class="qp-select qp-qari-btn" aria-haspopup="dialog" aria-labelledby="qpQariLabel qpQariName"><span id="qpQariName" class="qp-qari-name"></span></button>
      <select class="qp-select qp-select-native" hidden aria-hidden="true" tabindex="-1"></select>
    </div>
    <div class="qp-tools">
      <button type="button" class="qp-btn qp-repeat" aria-pressed="false" aria-label="تكرار الآية" title="تكرار الآية">${ICONS.repeat}</button>
      <button type="button" class="qp-btn qp-cont" aria-pressed="true" aria-label="متابعة التلاوة تلقائيًا إلى الآيات والسور التالية" title="متابعة التلاوة تلقائيًا إلى الآيات والسور التالية">إكمال التلاوة</button>
      <button type="button" class="qp-btn qp-speed" aria-label="سرعة التلاوة" title="سرعة التلاوة">١×</button>
      <div class="qp-vol">
        <button type="button" class="qp-btn qp-mute" aria-label="كتم الصوت" title="كتم الصوت">${ICONS.volOn}${ICONS.volOff}</button>
        <input type="range" class="qp-volume" min="0" max="100" step="1" value="100" aria-label="مستوى الصوت">
      </div>
    </div>
    <p class="qp-note" role="status" aria-live="polite"></p>`;

  function mount(root) {
    if (!root) return null;
    root.classList.add('qp');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'مشغّل تلاوة الآية');
    root.innerHTML = TEMPLATE;
    root.hidden = true;                                      // يظهر عند وصول آية صالحة

    const $ = s => root.querySelector(s);
    const btnPlay = $('.qp-play'), seek = $('.qp-seek'), cur = $('.qp-cur'), dur = $('.qp-dur');
    const select = $('.qp-select-native'), qariBtn = $('.qp-qari-btn'), qariName = $('.qp-qari-name'), note = $('.qp-note');
    const btnBack = $('.qp-back'), btnFwd = $('.qp-fwd'), btnRepeat = $('.qp-repeat');
    const btnCont = $('.qp-cont'), btnSpeed = $('.qp-speed'), btnMute = $('.qp-mute'), vol = $('.qp-volume');

    const audio = new Audio();
    audio.preload = 'none';

    let ayah = null;                  // الآية الجارية { surah, verse, complete }
    let base = null;                  // آية اليوم الأصلية — إليها نعود بعد نهاية السورة
    let continuous = store.get('qpCont') !== '0';
    let qari = QARIS.find(q => q.id === store.get('qpQari')) || QARIS.find(q => q.id === DEFAULT_QARI);
    let loadedUrl = '';
    let dragging = false;
    let raf = 0;
    let speedIdx = 0;
    let incompleteNote = '';

    /* ---------- القائمة ---------- */
    QARIS.forEach(q => {
      const o = document.createElement('option');
      o.value = q.id; o.textContent = q.name;
      select.appendChild(o);
    });
    select.value = qari.id;
    const syncQariBtn = () => { qariName.textContent = qari.name; };
    syncQariBtn();


    /* ---------- عجلة اختيار القارئ (على نمط منتقي iOS) ---------- */
    const ITEM = 44, VISIBLE = 5;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let wheelUi = null;
    function buildWheel() {
      const wrap = document.createElement('div');
      wrap.className = 'qpw';
      wrap.hidden = true;
      wrap.innerHTML = `
        <div class="qpw-backdrop"></div>
        <div class="qpw-sheet" role="dialog" aria-modal="true" aria-label="اختيار القارئ">
          <div class="qpw-head">
            <button type="button" class="qpw-cancel">إلغاء</button>
            <span class="qpw-title">القارئ</span>
            <button type="button" class="qpw-done">تم</button>
          </div>
          <div class="qpw-stage">
            <div class="qpw-band" aria-hidden="true"></div>
            <div class="qpw-wheel" role="listbox" tabindex="0" aria-label="قائمة القراء">
              <ul class="qpw-list"></ul>
            </div>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      const wheel = wrap.querySelector('.qpw-wheel'), list = wrap.querySelector('.qpw-list');
      wheel.style.height = ITEM * VISIBLE + 'px';
      list.style.paddingBlock = ITEM * Math.floor(VISIBLE / 2) + 'px';
      const items = QARIS.map((q, i) => {
        const li = document.createElement('li');
        li.className = 'qpw-item'; li.setAttribute('role', 'option'); li.id = 'qpw-opt-' + q.id;
        li.style.height = ITEM + 'px'; li.textContent = q.name;
        li.addEventListener('click', () => goTo(i, true));
        list.appendChild(li);
        return li;
      });
      let sel = 0, ticking = false;
      const idxFromScroll = () => clamp(Math.round(wheel.scrollTop / ITEM), 0, items.length - 1);
      function paint() {
        ticking = false;
        const c = wheel.scrollTop / ITEM;
        items.forEach((li, i) => {
          const d = i - c, a = Math.abs(d);
          if (a > 3.2) { li.style.opacity = '0'; return; }
          li.style.opacity = String(Math.max(0.18, 1 - a * 0.32));
          li.style.transform = `rotateX(${clamp(-d * 24, -75, 75)}deg) scale(${1 - Math.min(a, 3) * 0.05})`;
        });
        const n = idxFromScroll();
        if (n !== sel) { sel = n; mark(); }
      }
      function mark() {
        items.forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
        wheel.setAttribute('aria-activedescendant', items[sel].id);
      }
      function goTo(i, smooth) {
        i = clamp(i, 0, items.length - 1);
        wheel.scrollTo({ top: i * ITEM, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
        if (!smooth || reduceMotion) { sel = i; mark(); paint(); }
      }
      wheel.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });

      // السحب بالفأرة على الحاسوب (اللمس يتولاه التمرير الأصلي)
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
        if (moved) { goTo(idxFromScroll(), true); return; }
        const hit = e && e.clientX != null && document.elementFromPoint(e.clientX, e.clientY);   // نقرة بالفأرة بلا سحب
        const li = hit && hit.closest && hit.closest('.qpw-item');
        if (li) goTo(items.indexOf(li), true);
      };
      wheel.addEventListener('pointerup', endDrag);
      wheel.addEventListener('pointercancel', endDrag);

      wheel.addEventListener('keydown', e => {
        const k = { ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 }[e.key];
        if (k) { e.preventDefault(); goTo(sel + k, true); }
        else if (e.key === 'Home') { e.preventDefault(); goTo(0, true); }
        else if (e.key === 'End') { e.preventDefault(); goTo(items.length - 1, true); }
        else if (e.key === 'Enter') { e.preventDefault(); done(); }
      });
      wrap.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
      wrap.querySelector('.qpw-backdrop').addEventListener('click', () => close());
      wrap.querySelector('.qpw-cancel').addEventListener('click', () => close());
      wrap.querySelector('.qpw-done').addEventListener('click', () => done());

      function open() {
        wrap.hidden = false;
        document.documentElement.classList.add('qpw-lock');
        requestAnimationFrame(() => wrap.classList.add('is-open'));
        const cur = Math.max(0, QARIS.findIndex(q => q.id === qari.id));
        goTo(cur, false);
        wheel.focus({ preventScroll: true });
      }
      function close() {
        wrap.classList.remove('is-open');
        document.documentElement.classList.remove('qpw-lock');
        setTimeout(() => { wrap.hidden = true; }, reduceMotion ? 0 : 220);
        qariBtn.focus({ preventScroll: true });
      }
      function done() {
        const q = QARIS[sel];
        close();
        if (q && q.id !== qari.id) { select.value = q.id; select.dispatchEvent(new Event('change')); }
      }
      return { open };
    }
    qariBtn.addEventListener('click', () => { (wheelUi = wheelUi || buildWheel()).open(); });

    /* ---------- أدوات ---------- */
    const urlFor = () => ayah ? `${BASE}${qari.dir}/${pad3(ayah.surah)}${pad3(ayah.verse)}.mp3` : '';
    const hasDuration = () => isFinite(audio.duration) && audio.duration > 0;
    const setFill = (el, pct) => { el.style.setProperty('--p', pct + '%'); el.style.setProperty('--pn', pct / 100); };   // --pn: لمطابقة نهاية التعبئة لمركز المقبض
    const showNote = (text, isError) => {
      note.textContent = text || '';
      note.classList.toggle('is-error', !!isError);
    };
    const idleNote = () => showNote(incompleteNote, false);

    function updateProgress() {
      if (dragging) return;
      const d = hasDuration() ? audio.duration : 0;
      const p = d ? clamp(audio.currentTime / d, 0, 1) : 0;
      seek.value = Math.round(p * 1000);
      setFill(seek, p * 100);
      cur.textContent = fmt(audio.currentTime);
    }
    function updateDuration() {
      const ok = hasDuration();
      dur.textContent = ok ? fmt(audio.duration) : '٠:٠٠';
      seek.disabled = !ok;
    }
    function tick() {
      updateProgress();
      if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
    }
    function setState({ playing, loading }) {
      root.classList.toggle('is-playing', !!playing);
      root.classList.toggle('is-loading', !!loading);
      btnPlay.setAttribute('aria-label', playing || loading ? 'إيقاف التلاوة مؤقتًا' : 'تشغيل التلاوة');
    }
    function syncVolumeUi() {
      const muted = audio.muted || audio.volume === 0;
      root.classList.toggle('is-muted', muted);
      btnMute.setAttribute('aria-label', muted ? 'إلغاء كتم الصوت' : 'كتم الصوت');
      vol.value = Math.round((audio.muted ? 0 : audio.volume) * 100);
      setFill(vol, Number(vol.value));
    }

    function ensureSource(force) {
      const url = urlFor();
      if (!url) return false;
      if (force || loadedUrl !== url || audio.error) {
        loadedUrl = url;
        audio.src = url;
        audio.load();
        updateDuration();
        updateProgress();
      }
      return true;
    }

    function unloadSource() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      loadedUrl = '';
      updateDuration();
      updateProgress();
      setState({});
    }

    /* ---------- MediaSession (أزرار القفل وإشعارات الجهاز) ---------- */
    function updateMediaSession() {
      if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'آية اليوم', artist: qari.name, album: 'شكل القمر اليوم'
        });
      } catch (e) { /* غير مدعوم */ }
    }
    function bindMediaSession() {
      if (!('mediaSession' in navigator)) return;
      const set = (name, fn) => { try { navigator.mediaSession.setActionHandler(name, fn); } catch (e) { /* غير مدعوم */ } };
      set('play', () => play());
      set('pause', () => audio.pause());
      set('previoustrack', () => step(-1));
      set('nexttrack', () => step(1));
    }

    /* ---------- التحكم ---------- */
    async function play() {
      if (!ensureSource()) return;
      idleNote();                                            // يمسح الخطأ السابق ويُبقي تنبيه «الآية كاملة» ظاهرًا
      setState({ loading: true });
      updateMediaSession();
      try {
        await audio.play();
      } catch (err) {
        if (err && err.name === 'AbortError') return;       // استُبدل المصدر أثناء التحميل
        setState({});
        if (err && err.name === 'NotAllowedError') showNote('اضغط زر التشغيل لبدء التلاوة.', false);
        else onError();
      }
    }
    function toggle() { (audio.paused || audio.ended) ? play() : audio.pause(); }

    const baseNote = () => base && !base.complete ? 'تُتلى الآية كاملة، والنص المعروض أعلاه جزء منها.' : '';
    const where = () => 'سورة ' + SURAH_NAMES[ayah.surah - 1] + ' — الآية ' + ar(ayah.verse) + ' من ' + ar(VERSE_COUNT[ayah.surah - 1]);
    function syncNav() {
      const last = ayah ? VERSE_COUNT[ayah.surah - 1] : 0;
      btnBack.disabled = !ayah || ayah.verse <= 1;
      btnFwd.disabled = !ayah || ayah.verse >= last;
    }
    function step(delta) {                                   // الآية السابقة / التالية داخل السورة
      if (!ayah) return;
      const last = VERSE_COUNT[ayah.surah - 1];
      const v = ayah.verse + delta;
      if (v < 1 || v > last) return;
      const wasPlaying = !audio.paused || root.classList.contains('is-loading');
      const isBase = base && base.surah === ayah.surah && base.verse === v;
      ayah = { surah: ayah.surah, verse: v, complete: isBase ? base.complete : true };
      incompleteNote = isBase ? baseNote() : '';
      unloadSource();
      syncNav();
      if (wasPlaying) play();
      showNote(isBase ? incompleteNote : where(), false);
    }

    function onError() {
      setState({});
      const code = audio.error ? audio.error.code : 0;
      showNote(code === 4
        ? 'ملف التلاوة غير متاح لهذا القارئ. اختر قارئًا آخر.'
        : 'تعذّر تحميل التلاوة. تحقّق من الاتصال ثم اضغط تشغيل للمحاولة مرة أخرى.', true);
    }

    btnPlay.addEventListener('click', toggle);
    btnBack.addEventListener('click', () => step(-1));
    btnFwd.addEventListener('click', () => step(1));

    btnRepeat.addEventListener('click', () => {
      const on = btnRepeat.getAttribute('aria-pressed') !== 'true';
      btnRepeat.setAttribute('aria-pressed', String(on));
      audio.loop = on;
      store.set('qpRepeat', on ? '1' : '0');
    });
    if (store.get('qpRepeat') === '1') { btnRepeat.setAttribute('aria-pressed', 'true'); audio.loop = true; }

    btnCont.setAttribute('aria-pressed', String(continuous));
    btnCont.addEventListener('click', () => {
      continuous = btnCont.getAttribute('aria-pressed') !== 'true';
      btnCont.setAttribute('aria-pressed', String(continuous));
      store.set('qpCont', continuous ? '1' : '0');
    });

    btnSpeed.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      audio.defaultPlaybackRate = SPEEDS[speedIdx];          // load() يعيد السرعة إلى الافتراضية، فنضبط الاثنين
      audio.playbackRate = SPEEDS[speedIdx];
    });
    audio.addEventListener('ratechange', () => {
      btnSpeed.textContent = ar(audio.playbackRate, 2) + '×';
    });

    btnMute.addEventListener('click', () => {
      if (audio.muted || audio.volume === 0) { audio.muted = false; if (audio.volume === 0) audio.volume = 0.8; }
      else audio.muted = true;
    });
    vol.addEventListener('input', () => {
      audio.muted = false;
      audio.volume = Number(vol.value) / 100;
      store.set('qpVolume', String(audio.volume));
    });
    audio.addEventListener('volumechange', syncVolumeUi);
    const savedVol = parseFloat(store.get('qpVolume'));
    if (isFinite(savedVol)) audio.volume = clamp(savedVol, 0, 1);
    syncVolumeUi();

    seek.addEventListener('input', () => {
      dragging = true;
      const p = Number(seek.value) / 1000;
      setFill(seek, p * 100);
      if (hasDuration()) cur.textContent = fmt(p * audio.duration);
    });
    seek.addEventListener('change', () => {
      if (hasDuration()) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
      dragging = false;
      updateProgress();
    });

    select.addEventListener('change', () => {
      qari = QARIS.find(q => q.id === select.value) || qari;
      syncQariBtn();
      store.set('qpQari', qari.id);
      const wasPlaying = !audio.paused && !audio.ended;
      showNote('', false);
      idleNote();
      unloadSource();
      updateMediaSession();
      if (wasPlaying) play();                                // يكمل بصوت القارئ الجديد من أول الآية
    });

    /* ---------- أحداث الصوت ---------- */
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('waiting', () => { if (!audio.paused) setState({ loading: true }); });
    audio.addEventListener('stalled', () => { if (!audio.paused) setState({ loading: true }); });
    audio.addEventListener('playing', () => { setState({ playing: true }); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
    audio.addEventListener('pause', () => { if (!audio.ended) setState({}); updateProgress(); });
    audio.addEventListener('ended', () => {
      setState({}); updateProgress();
      if (!continuous || !ayah || audio.loop) return;
      const last = VERSE_COUNT[ayah.surah - 1];
      incompleteNote = '';
      if (ayah.verse < last) {                              // الآية التالية في السورة نفسها
        ayah = { surah: ayah.surah, verse: ayah.verse + 1, complete: true };
        syncNav();
        play();
        showNote(where(), false);
      } else {                                              // انتهت السورة: نبدأ التي بعدها (وبعد الناس الفاتحة)
        const next = ayah.surah % 114 + 1;
        ayah = { surah: next, verse: 1, complete: true };
        syncNav();
        play();
        showNote('انتهت السورة، وتبدأ الآن سورة ' + SURAH_NAMES[next - 1] + '.', false);
      }
    });
    audio.addEventListener('error', () => { if (audio.getAttribute('src')) onError(); });

    bindMediaSession();
    updateMediaSession();
    btnSpeed.textContent = '١×';

    /* ---------- واجهة المشغل العامة ---------- */
    function setAyah(entry) {
      const valid = entry && Number.isInteger(entry.surah) && Number.isInteger(entry.verse);
      if (!valid) { unloadSource(); ayah = null; base = null; syncNav(); root.hidden = true; return; }
      if (base && base.surah === entry.surah && base.verse === entry.verse) return;   // التحديث الدوري لا يقطع التلاوة
      base = { surah: entry.surah, verse: entry.verse, complete: entry.complete !== false };
      const changed = true;
      ayah = { surah: entry.surah, verse: entry.verse, complete: entry.complete !== false };
      incompleteNote = ayah.complete ? '' : 'تُتلى الآية كاملة، والنص المعروض أعلاه جزء منها.';
      root.hidden = false;
      syncNav();
      if (changed) { unloadSource(); showNote('', false); }
      idleNote();
    }
    function stop() { unloadSource(); }

    return { setAyah, stop, audio, qaris: QARIS };
  }

  window.QuranPlayer = { mount, QARIS };
})();
