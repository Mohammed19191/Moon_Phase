/* game.js — لعبة «إلى القمر» (تعمل داخل شاشة #view-game) */
(() => {
        'use strict';
        const GOAL = 10;              // عدد القلوب اللازم جمعها قبل أن يصبح الوصول إلى القمر ممكنًا
        const HEARTS_PER_LEVEL = 5;
        const BASE_SPEED = 125;       // بكسل/ثانية (مثل الأصل: 2 بكسل كل 16 مللي ثانية)
        const ZORO_SPEED = 420;       // بكسل/ثانية عند التحكم بالأسهم أو WASD
        const NS_PLANETS = [
            ['planet-mercury', '#A0522D', '#8B4513'], ['planet-venus', '#FFA500', '#FFD700'],
            ['planet-mars', '#CD5C5C', '#FF6B6B'], ['planet-jupiter', '#DEB887', '#F4A460']
        ];
        const root = document.getElementById('view-game');
        const $ = s => root.querySelector(s);
        const area = $('.game-area'), zoro = $('.zoro'), moon = $('.moon');
        const overScreen = $('.game-over'), startScreen = $('.start-screen');
        const startBtn = $('.start-button'), restartBtn = $('.restart-button'), pauseBtn = $('#pauseButton');
        const hud = $('.score-display');
        const elPoints = $('#points'), elTime = $('#time'), elLevel = $('#level'), elFinal = $('#finalScore');
        const store = SiteKit.store;

        let active = false;           // الشاشة ظاهرة الآن؟
        let state = 'idle';           // idle | playing | paused | over
        let W = 0, H = 0, zw = 80, zh = 80, cx = 0, cy = 0;
        let time = 0, shownSec = -1, points = 0, level = 1;
        let obsTimer = 0, heartTimer = 0, last = 0, raf = 0;
        let things = [];              // العوائق والقلوب الساقطة: {el, kind, x, y, w, h, shrink}
        const keys = new Set();

        const fmt = s => {
            const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
            return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0');
        };
        const box = (x, y, w, h, s) => ({ l: x + w * s, r: x + w * (1 - s), t: y + h * s, b: y + h * (1 - s) });
        const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

        /* ---- عناصر إضافية: تلميح البداية وسطر أفضل نتيجة ---- */
        const hint = document.createElement('p');
        hint.className = 'game-hint';
        hint.textContent = `اجمع ${GOAL} قلوب ثم المس القمر 🌙`;
        $('.game-stats').after(hint);          // خارج شاشة البداية: تصميمك يُخفي كل نص فيها عمدًا
        const bestLine = document.createElement('p');
        bestLine.className = 'best-line';
        restartBtn.before(bestLine);
        pauseBtn.setAttribute('aria-label', 'إيقاف مؤقت');
        elPoints.textContent = '0/' + GOAL;

        /* ---- القياس وموضع زورو ---- */
        function setZoro(x, y) {
            cx = Math.max(zw / 2, Math.min(W - zw / 2, x));
            cy = Math.max(zh / 2, Math.min(H - zh / 2, y));
            zoro.style.bottom = 'auto';
            zoro.style.left = cx + 'px';
            zoro.style.top = (cy - zh / 2) + 'px';
        }
        function measure() {
            if (!area.clientWidth) return;            // الشاشة مخفية: لا قياس
            W = area.clientWidth; H = area.clientHeight;
            zw = zoro.offsetWidth || 80; zh = zoro.offsetHeight || 80;
            setZoro(cx, cy);
        }

        /* ---- إنشاء العوائق والقلوب ---- */
        function spawn(kind) {
            const el = document.createElement('div');
            let shrink;
            if (kind === 'obstacle') {
                const [cls, base, spot] = NS_PLANETS[Math.floor(Math.random() * NS_PLANETS.length)];
                el.className = 'obstacle ' + cls;
                el.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="${base}"/>` +
                    `<circle cx="30" cy="30" r="10" fill="${spot}"/><circle cx="70" cy="30" r="8" fill="${spot}"/>` +
                    `<circle cx="40" cy="70" r="12" fill="${spot}"/></svg>`;
                shrink = 0.12;
            } else {
                el.className = 'pickup';
                el.innerHTML = '<svg viewBox="0 0 100 100"><path d="M 50 90 C 50 90, 90 60, 90 30 C 90 10, 70 10, 50 30 ' +
                    'C 30 10, 10 10, 10 30 C 10 60, 50 90, 50 90" fill="#FF69B4"/></svg>';
                shrink = 0;
            }
            area.appendChild(el);
            const w = el.offsetWidth, h = el.offsetHeight;
            const x = W * 0.05 + Math.random() * Math.max(0, W * 0.9 - w);
            el.style.left = x + 'px';
            el.style.top = -h + 'px';
            things.push({ el, kind, x, y: -h, w, h, shrink });
        }
        const count = kind => things.reduce((n, t) => n + (t.kind === kind), 0);

        function collect() {
            points++;
            level = 1 + Math.floor(points / HEARTS_PER_LEVEL);
            elPoints.textContent = points + '/' + GOAL;
            elLevel.textContent = level;
            if (points >= GOAL) moon.classList.add('ready');
        }

        /* ---- حلقة اللعب (تعتمد على الزمن الفعلي لا على سرعة الشاشة) ---- */
        function update(dt) {
            time += dt;
            const sec = Math.floor(time);
            if (sec !== shownSec) { shownSec = sec; elTime.textContent = fmt(sec); }

            const dx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
            const dy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
            if (dx || dy) {
                const n = Math.hypot(dx, dy);
                setZoro(cx + dx / n * ZORO_SPEED * dt, cy + dy / n * ZORO_SPEED * dt);
            }

            const speed = BASE_SPEED * (1 + 0.2 * (level - 1));
            const interval = Math.max(1500, 3000 - 400 * (level - 1));
            obsTimer += dt * 1000; heartTimer += dt * 1000;
            if (obsTimer >= interval) { obsTimer = 0; if (count('obstacle') < Math.min(6, 2 + level)) spawn('obstacle'); }
            if (heartTimer >= 5000) { heartTimer = 0; if (count('heart') < 2) spawn('heart'); }

            const z = box(cx - zw / 2, cy - zh / 2, zw, zh, 0.2);
            for (let i = things.length - 1; i >= 0; i--) {
                const t = things[i];
                t.y += speed * dt;
                t.el.style.top = t.y + 'px';
                if (t.y > H) { t.el.remove(); things.splice(i, 1); continue; }
                if (!hit(z, box(t.x, t.y, t.w, t.h, t.shrink))) continue;
                if (t.kind === 'obstacle') return end(false);
                t.el.remove(); things.splice(i, 1); collect();
            }

            if (points >= GOAL) {
                const a = area.getBoundingClientRect(), m = moon.getBoundingClientRect();
                if (hit(z, box(m.left - a.left, m.top - a.top, m.width, m.height, 0.2))) end(true);
            }
        }

        function frame(now) {
            raf = requestAnimationFrame(frame);
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            if (state === 'playing') update(dt);
        }

        /* ---- التحكم ---- */
        const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
        addEventListener('keydown', e => {
            if (!active) return;
            if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
            const k = KEYMAP[e.code];
            if (!k) return;
            keys.add(k);
            if (state === 'playing') e.preventDefault();      // لا تُمرِّر الصفحة أثناء اللعب
        });
        addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });

        const follow = e => {
            if (state !== 'playing') return;
            const r = area.getBoundingClientRect();
            setZoro(e.clientX - r.left, e.clientY - r.top - (e.pointerType === 'touch' ? 50 : 0));
        };
        area.addEventListener('pointermove', follow);
        area.addEventListener('pointerdown', follow);

        const pauseIcon = cls => { pauseBtn.querySelector('.ic').replaceWith(new DOMParser().parseFromString(SiteKit.icon(cls.replace('fa-','')), 'text/html').body.firstChild); };
        function pause() {
            if (state !== 'playing') return;
            state = 'paused'; keys.clear();
            area.classList.add('paused'); pauseIcon('fa-play');
            pauseBtn.setAttribute('aria-label', 'متابعة');
        }
        function resume() {
            if (state !== 'paused') return;
            state = 'playing'; last = performance.now();
            area.classList.remove('paused'); pauseIcon('fa-pause');
            pauseBtn.setAttribute('aria-label', 'إيقاف مؤقت');
        }
        function togglePause() { state === 'playing' ? pause() : resume(); }
        document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
        addEventListener('blur', pause);

        /* ---- بدء اللعبة ونهايتها ---- */
        function start() {
            cancelAnimationFrame(raf);
            area.querySelectorAll('.obstacle,.pickup').forEach(el => el.remove());
            things = [];
            time = 0; shownSec = -1; points = 0; level = 1;
            obsTimer = 1500; heartTimer = 3000;                 // أول عائق بعد 1.5 ثانية وأول قلب بعد ثانيتين
            moon.classList.remove('ready'); area.classList.remove('paused');
            measure();
            setZoro(W / 2, H - 50 - zh / 2);
            hud.style.display = 'flex';
            elPoints.textContent = '0/' + GOAL; elTime.textContent = '0:00'; elLevel.textContent = 1;
            pauseIcon('fa-pause');
            startScreen.style.display = 'none'; overScreen.style.display = 'none';
            state = 'playing'; last = performance.now();
            raf = requestAnimationFrame(frame);
        }

        function end(won) {
            state = 'over';
            cancelAnimationFrame(raf);
            keys.clear();
            hud.style.display = 'none';
            const best = Math.max(points, parseInt(store.get('ttm_best'), 10) || 0);
            store.set('ttm_best', best);
            overScreen.querySelector('h2').textContent = won ? 'مبروك! وصلت إلى القمر!' : 'انتهت اللعبة!';
            elFinal.textContent = fmt(Math.floor(time));
            bestLine.textContent = `القلوب: ${points} — أفضل نتيجة: ${best}`;
            overScreen.style.display = 'block';
        }

        startBtn.addEventListener('click', start);
        restartBtn.addEventListener('click', start);
        pauseBtn.addEventListener('click', togglePause);
        addEventListener('resize', measure);
        measure();
        setZoro(W / 2, H - 50 - zh / 2);
    
        window.GameView = {
            activate() { active = true; measure(); if (state === 'idle' || state === 'over') setZoro(W / 2, H - 50 - zh / 2); },
            deactivate() { active = false; keys.clear(); pause(); }
        };
    })();
