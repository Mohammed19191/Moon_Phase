/* sheets.js — سلوك الأوراق المنبثقة على الجوال كما في iOS (sheets.md › Mobile):
   مقبض صغير أعلى الورقة، والسحب لأسفل يغلقها، مع بقاء زر «إلغاء» أو «إغلاق» بديلًا عن الإيماءة.
   يشمل: عجلة القارئ، عجلة تاريخ الميلاد، وبطاقة المشاركة. */
(() => {
  'use strict';
  const phone = matchMedia('(max-width: 640px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SHEETS = '.qpw-sheet, .share-panel';
  const HANDLE = '.sheet-grabber, .qpw-head, .share-panel > h2';      // من أين يبدأ السحب
  const CLOSE = '.qpw-cancel, #shareClose';

  function enhance(sheet) {
    if (sheet.dataset.sheet) return;
    sheet.dataset.sheet = '1';
    const grab = document.createElement('div');
    grab.className = 'sheet-grabber';
    grab.setAttribute('aria-hidden', 'true');                         // الإيماءة اختصار؛ زر الإغلاق متاح لقارئ الشاشة
    sheet.prepend(grab);

    let drag = null;
    sheet.addEventListener('pointerdown', e => {
      if (!phone.matches || !e.isPrimary || e.button > 0) return;
      if (!e.target.closest(HANDLE) || e.target.closest('button')) return;
      drag = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
      sheet.style.transition = 'none';
      try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    });
    sheet.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y0;
      drag.dy = dy;
      // لأسفل تتبع الإصبع، ولأعلى مقاومة خفيفة فقط
      sheet.style.transform = `translateY(${dy > 0 ? dy : dy / 6}px)`;
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { dy, t0 } = drag;
      drag = null;
      const speed = dy / Math.max(1, performance.now() - t0);              // بكسل لكل ملّي ثانية
      sheet.style.transition = reduce.matches ? 'none' : 'transform .22s cubic-bezier(.2,.9,.3,1)';
      if (e.type === 'pointerup' && (dy > 110 || (dy > 30 && speed > 0.6))) {
        sheet.style.transform = `translateY(${sheet.offsetHeight + 40}px)`;
        const btn = sheet.closest('.qpw, .share-sheet').querySelector(CLOSE);
        setTimeout(() => { if (btn) btn.click(); sheet.style.transform = ''; sheet.style.transition = ''; }, reduce.matches ? 0 : 200);
      } else {
        sheet.style.transform = '';
        setTimeout(() => { sheet.style.transition = ''; }, 240);
      }
    };
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  }

  // الأوراق تُنشأ عند أول فتح، فنراقب الصفحة
  const scan = root => { if (root.matches && root.matches(SHEETS)) enhance(root); if (root.querySelectorAll) root.querySelectorAll(SHEETS).forEach(enhance); };
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); })))
    .observe(document.body, { childList: true });
  scan(document.body);
})();
