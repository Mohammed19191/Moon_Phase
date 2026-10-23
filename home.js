/* home.js — الشاشة الرئيسية: شكل القمر وآية اليوم */
(() => {
      const { moonInfo, showMoon, ar, zoroPet } = SiteKit;
      const FALLBACK = { ayah: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا (الشرح: 6)', surah: 94, verse: 6, complete: true };
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
      function updateMoon() {
        const m = moonInfo();
        showMoon(moonImg, m);
        nameEl.textContent = m.phase.name;
        metaEl.textContent = `عمر القمر ${ar(m.age, 1)} يومًا · الإضاءة نحو ${ar(Math.round(m.illum * 100))}٪`;
      }

      const refresh = () => { updateAyah(); updateMoon(); };
      refresh();
      setInterval(refresh, 60000);                       // يلتقط تغيّر اليوم عند منتصف الليل
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
      zoroPet();
    })();
