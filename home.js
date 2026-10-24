/* home.js — الشاشة الرئيسية: شكل القمر وآية اليوم */
(() => {
      const { moonInfo, showMoon, ar, zoroPet } = SiteKit;
      const FALLBACK = { ayah: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا (الشرح: ٦)', surah: 94, verse: 6, complete: true };
      const ayahEl = document.getElementById('ayah');
      let ayat = null, shownDay = null, fallbackShown = false;
      const player = QuranPlayer.mount(document.getElementById('ayahPlayer'));

      // رقم اليوم منذ 1970 — يمرّ على كل الآيات بالتتابع دون تكرار حتى تكتمل الدورة
      const dayNumber = () => {
        const d = new Date();
        return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
      };

      function showAyah(entry) {
        ayahEl.style.transition = 'none';
        ayahEl.style.opacity = '0';
        ayahEl.textContent = entry.ayah;
        player.setAyah(entry);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          ayahEl.style.transition = 'opacity 1s ease-in-out';
          ayahEl.style.opacity = '1';
        }));
      }

      async function updateAyah() {
        const day = dayNumber();
        if (day === shownDay) return;
        try {
          if (!ayat) {
            const res = await fetch('ayat.json');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            ayat = await res.json();
          }
          showAyah(ayat[day % ayat.length]);
          shownDay = day;
        } catch (err) {
          console.error('تعذر تحميل الآيات:', err);
          if (!fallbackShown && shownDay === null) { showAyah(FALLBACK); fallbackShown = true; }
        }
      }

      const moonImg = document.getElementById('homeMoon');
      const nameEl = document.getElementById('homeMoonName');
      const metaEl = document.getElementById('homeMoonMeta');
      // القمر ثلاثي الأبعاد: يحلّ محل الصورة متى جهز، وتبقى الصورة إن تعذّر WebGL
      let moon3d = null;
      const box = moonImg.closest('.home-moon');
      if (window.Moon3D) {
        Moon3D.mount(document.getElementById('homeMoon3d'), moonInfo().fraction).then(ctrl => {
          moon3d = ctrl;
          box.classList.add('is-3d');
          placeSun(moonInfo().fraction);
          document.getElementById('moon3dHint').hidden = false;
          document.addEventListener('viewchange', e => { if (e.detail.view === 'home') ctrl.redraw(); });
        }).catch(() => { /* تبقى صورة الطور */ });
      }
      /* الشمس في النهار (المظهر الفاتح فقط): تظهر في اتجاهها الحقيقي بالنسبة إلى القمر.
         الحساب هو نفسه الذي يضيء القمر ثلاثي الأبعاد (moon3d.js): زاوية الشمس من القمر e = الكسر × ٣٦٠°،
         والاتجاه (sin e، 0.08، −cos e) والناظر ينظر نحو −z.
         - قرب المحاق: الشمس خلف القمر تقريبًا، فيحجبها قرصه المظلم ويبقى وهجها حوله.
         - قرب التربيع: الشمس على جانب القمر المضيء.
         - بين الأحدب والبدر: الشمس خلف الناظر، فلا تظهر. */
      const stage = document.querySelector('.moon3d-link');
      // القمر يفتح «عمر القمر» بالضغط أو بمفتاح Enter؛ وليس رابطًا <a> حتى لا يُظهر المتصفح عنوانه أثناء
      // الضغط والسحب. سحب القمر لتدويره لا يُحتسب ضغطة (moon3d.js يوقف الضغطة بعد السحب)
      const openAge = () => { location.hash = stage.dataset.href; };
      stage.addEventListener('click', openAge);
      stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAge(); } });
      const sunEl = document.createElement('span');
      sunEl.className = 'moon-sun';
      sunEl.setAttribute('aria-hidden', 'true');
      stage.prepend(sunEl);
      // إطار الضوء حول القمر في المحاق (كالكسوف): داخل القمر نفسه ليطفو معه، وخلف قرصه
      const coronaEl = document.createElement('span');
      coronaEl.className = 'moon-corona';
      coronaEl.setAttribute('aria-hidden', 'true');
      document.getElementById('homeMoon3d').prepend(coronaEl);
      function placeSun(f) {
        const e = f * 2 * Math.PI, dx = Math.sin(e), dy = 0.08, dz = -Math.cos(e);
        const S = stage.querySelector('.moon3d').offsetWidth || 250;
        const focal = (S / 2) / Math.tan(15 * Math.PI / 180);           // كما في كاميرا moon3d.js
        let x, y;
        if (dz < -0.02) { x = dx / -dz * focal; y = -dy / -dz * focal; }  // أمام الناظر: إسقاط منظوري
        else { x = Math.sign(dx) * 1e4; y = 0; }
        const len = Math.hypot(x, y), max = S * 0.95;                    // لا تبتعد عن القمر أكثر من حافة المشهد
        if (len > max) { x *= max / len; y *= max / len; }
        const visible = Math.max(0, Math.min(1, (Math.cos(e) + 0.25) / 0.35));
        stage.style.setProperty('--sun-x', x.toFixed(1) + 'px');
        stage.style.setProperty('--sun-y', y.toFixed(1) + 'px');
        stage.style.setProperty('--sun-o', visible.toFixed(3));
        // يكتمل الإطار ليلة المحاق تمامًا، ويخفت حتى يختفي مع نهاية طور المحاق (نحو يومين)
        const fromNew = Math.min(f, 1 - f);
        stage.style.setProperty('--corona-o', Math.pow(Math.max(0, 1 - fromNew / 0.0625), 0.8).toFixed(3));
      }
      addEventListener('resize', () => placeSun(moonInfo().fraction));

      function updateMoon() {
        const m = moonInfo();
        showMoon(moonImg, m);
        if (moon3d) { moon3d.setPhase(m.fraction); placeSun(m.fraction); }
        nameEl.textContent = m.phase.name;
        metaEl.textContent = `عمر القمر ${ar(m.age, 1)} يومًا · الإضاءة نحو ${ar(Math.round(m.illum * 100))}٪`;
      }

      const refresh = () => { updateAyah(); updateMoon(); };
      refresh();
      setInterval(refresh, 60000);                       // يلتقط تغيّر اليوم عند منتصف الليل
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
      zoroPet();
    })();
