/* age.js — شاشة «عمر القمر» */
(() => {
      const { moonInfo, showMoon, ar, zoroPet } = SiteKit;
      const START = new Date(2001, 3, 23);

      /* ---- طور القمر: يُحسب محليًا دون أي اتصال بالإنترنت ---- */
      const moonImg = document.getElementById('moonImage');
      const phaseEl = document.getElementById('phaseName');
      const meta = document.createElement('div');
      meta.className = 'phase-meta';
      phaseEl.after(meta);
      moonImg.style.animation = 'float 3s ease-in-out infinite';

      function updateMoon() {
        const m = moonInfo();
        showMoon(moonImg, m);
        phaseEl.textContent = m.phase.name;
        meta.textContent = `عمر القمر ${ar(m.age, 1)} يومًا · الإضاءة نحو ${ar(Math.round(m.illum * 100))}٪`;
      }

      /* ---- بطاقات العمر: تُبنى مرة واحدة ثم يُحدَّث النص فقط ---- */
      const UNITS = [
        { key: 'years', label: 'سنة' }, { key: 'months', label: 'أشهر' }, { key: 'weeks', label: 'أسابيع' },
        { key: 'days', label: 'أيام' }, { key: 'hours', label: 'ساعات' }, { key: 'minutes', label: 'دقائق' },
        { key: 'seconds', label: 'ثواني' }
      ];
      const grid = document.getElementById('moonAgeDetails');
      grid.innerHTML = UNITS.map(u => `
        <div class="age-card">
          <div class="label">${u.label}</div>
          <div class="value" data-unit="${u.key}"></div>
        </div>`).join('');
      const cells = [...grid.querySelectorAll('[data-unit]')];

      const viewEl = document.getElementById('view-age');
      function tickAge() {
        if (viewEl.hidden) return;                      // الشاشة مخفية: لا تحديث
        const days = (Date.now() - START) / 864e5;
        const v = { years: days / 365.25, months: days / 365.25 * 12, weeks: days / 7, days,
                    hours: days * 24, minutes: days * 1440, seconds: days * 86400 };
        cells.forEach(c => { c.textContent = ar(Math.floor(v[c.dataset.unit])); });
      }

      const cards = grid.querySelectorAll('.age-card');
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
        }), { threshold: 0.3 });
        cards.forEach(c => io.observe(c));
      } else {
        cards.forEach(c => c.classList.add('visible'));
      }

      /* ---- زر عرض الكل / إخفاء ---- */
      const btn = document.getElementById('expandButton');
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => {
        const open = grid.classList.toggle('expanded');
        btn.classList.toggle('expanded', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.innerHTML = (open ? 'إخفاء' : 'عرض الكل') + ' ' + SiteKit.icon('chevron');
        if (!open) viewEl.querySelector('.age-details').scrollIntoView({ behavior: 'smooth' });
      });

      document.addEventListener('viewchange', e => { if (e.detail.view === 'age') { tickAge(); updateMoon(); } });
      updateMoon();
      tickAge();
      setInterval(tickAge, 1000);
      setInterval(updateMoon, 60000);
      zoroPet();
    })();
