/* game.js — لعبة «إلى القمر» (تعمل داخل شاشة #view-game) */
(() => {
        'use strict';
        const GOAL = 10;              // عدد القلوب اللازم جمعها قبل أن يصبح الوصول إلى القمر ممكنًا
        const HEARTS_PER_LEVEL = 5;
        const BASE_SPEED = 125;       // بكسل/ثانية (مثل الأصل: 2 بكسل كل 16 مللي ثانية)
        const ZORO_SPEED = 420;       // بكسل/ثانية عند التحكم بالأسهم أو WASD
        const root = document.getElementById('view-game');

        /* ---- نيزك واقعي: صخرة غير منتظمة بإضاءة من أعلى اليسار، فوهات، وتوهّج احتكاك على الحافة الأمامية ---- */
        const ROCKS = [
            ['#B9B2A8', '#7C766E', '#3A3631'],   // حجري رمادي
            ['#8F8A85', '#56524D', '#25221F'],   // بازلتي داكن
            ['#C08A63', '#7E5238', '#34211A']    // حديدي صدئ
        ];
        let rockId = 0;
        function rockSVG() {
            const id = 'rk' + (++rockId), [c1, c2, c3] = ROCKS[Math.floor(Math.random() * ROCKS.length)];
            const n = 15 + Math.floor(Math.random() * 4), seed = Math.random() * 6.28;
            const sx = 0.94 + Math.random() * 0.1, sy = 0.9 + Math.random() * 0.08;
            const P = [];
            for (let i = 0; i < n; i++) {
                const a = i / n * Math.PI * 2;
                const r = 39 + Math.sin(a * 2 + seed) * 3.2 + Math.sin(a * 3 + seed * 1.7) * 2.4 + (Math.random() - 0.5) * 6;
                P.push([50 + Math.cos(a) * r * sx, 50 + Math.sin(a) * r * sy]);
            }
            let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
            for (let i = 0; i < n; i++) {
                const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n], k = 0.09;
                d += `C${(p1[0] + (p2[0] - p0[0]) * k).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) * k).toFixed(1)} ` +
                     `${(p2[0] - (p3[0] - p1[0]) * k).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) * k).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
            }
            d += 'Z';
            let craters = '';
            const nc = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < nc; i++) {
                const a = Math.random() * 6.28, rr = Math.random() * 25, x = 50 + Math.cos(a) * rr, y = 50 + Math.sin(a) * rr;
                const rx = 4 + Math.random() * 7, ry = rx * (0.7 + Math.random() * 0.25);
                craters += `<ellipse cx="${(x + 0.9).toFixed(1)}" cy="${(y + 1.4).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>` +
                           `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="rgba(0,0,0,.34)"/>`;
            }
            let specks = '';
            for (let i = 0; i < 9; i++) {
                const a = Math.random() * 6.28, rr = Math.random() * 36;
                specks += `<circle cx="${(50 + Math.cos(a) * rr).toFixed(1)}" cy="${(50 + Math.sin(a) * rr).toFixed(1)}" r="${(0.7 + Math.random() * 1.3).toFixed(1)}" fill="rgba(${Math.random() < 0.5 ? '0,0,0,.28' : '255,255,255,.2'})"/>`;
            }
            return `<svg class="rock" viewBox="0 0 100 100" aria-hidden="true"><defs>` +
                `<radialGradient id="${id}b" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></radialGradient>` +
                `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>` +
                `<radialGradient id="${id}g" cx="50%" cy="100%" r="60%"><stop offset="0" stop-color="#FFB347" stop-opacity=".75"/><stop offset=".6" stop-color="#FF6A1A" stop-opacity=".25"/><stop offset="1" stop-color="#FF4500" stop-opacity="0"/></radialGradient>` +
                `<clipPath id="${id}c"><path d="${d}"/></clipPath></defs>` +
                `<path d="${d}" fill="url(#${id}b)"/><g clip-path="url(#${id}c)">${craters}${specks}` +
                `<rect width="100" height="100" fill="url(#${id}s)"/><rect width="100" height="100" fill="url(#${id}g)"/></g>` +
                `<path d="${d}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/></svg>`;
        }
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
        let time = 0, shownSec = -1, points = 0, got = 0, level = 1;
        const goalOf = L => Math.min(20, GOAL + 2 * (L - 1));   // كل مستوى يحتاج قلبين إضافيين حتى 20
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
                el.className = 'obstacle';
                el.innerHTML = '<span class="flame"></span>' + rockSVG();
                const spin = el.querySelector('svg');
                spin.style.animationDuration = (5 + Math.random() * 9).toFixed(1) + 's';
                if (Math.random() < 0.5) spin.style.animationDirection = 'reverse';
                shrink = 0.12;
            } else {
                el.className = 'pickup';
                el.innerHTML = '<svg viewBox="0 0 100 100"><path d="M 50 90 C 50 90, 90 60, 90 30 C 90 10, 70 10, 50 30 ' +
                    'C 30 10, 10 10, 10 30 C 10 60, 50 90, 50 90" fill="#FF69B4"/></svg>';
                shrink = 0;
            }
            area.appendChild(el);
            if (kind === 'obstacle') { const base = Math.max(el.offsetWidth, 54), sc = 0.85 + Math.random() * 0.5; el.style.width = el.style.height = (base * sc) + 'px'; }
            const w = el.offsetWidth, h = el.offsetHeight;
            const x = W * 0.05 + Math.random() * Math.max(0, W * 0.9 - w);
            el.style.left = x + 'px';
            el.style.top = -h + 'px';
            things.push({ el, kind, x, y: -h, w, h, shrink });
        }
        const count = kind => things.reduce((n, t) => n + (t.kind === kind), 0);

        function collect() {
            points++; got++;
            elPoints.textContent = got + '/' + goalOf(level);
            if (got >= goalOf(level)) moon.classList.add('ready');
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

            const speed = BASE_SPEED * (1 + 0.15 * Math.min(level - 1, 8));
            const interval = Math.max(1100, 3000 - 350 * (level - 1));
            obsTimer += dt * 1000; heartTimer += dt * 1000;
            if (obsTimer >= interval) { obsTimer = 0; if (count('obstacle') < Math.min(8, 2 + level)) spawn('obstacle'); }
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

            if (got >= goalOf(level)) {
                const a = area.getBoundingClientRect(), m = moon.getBoundingClientRect();
                if (hit(z, box(m.left - a.left, m.top - a.top, m.width, m.height, 0.2))) nextLevel();
            }
        }

        const toast = document.createElement('div');
        toast.className = 'level-toast';
        area.appendChild(toast);
        function nextLevel() {
            level++; got = 0;
            area.querySelectorAll('.obstacle,.pickup').forEach(el => el.remove());
            things = [];
            obsTimer = 0; heartTimer = 2000;
            moon.classList.remove('ready');
            elLevel.textContent = level;
            elPoints.textContent = '0/' + goalOf(level);
            hint.textContent = `المستوى ${level}: اجمع ${goalOf(level)} ${goalOf(level) <= 10 ? 'قلوب' : 'قلبًا'} ثم المس القمر 🌙`;
            setZoro(W / 2, H - 50 - zh / 2);
            toast.textContent = 'المستوى ' + level;
            toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
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
            time = 0; shownSec = -1; points = 0; got = 0; level = 1;
            hint.textContent = `اجمع ${GOAL} قلوب ثم المس القمر 🌙`;
            obsTimer = 1500; heartTimer = 3000;                 // أول عائق بعد 1.5 ثانية وأول قلب بعد ثانيتين
            moon.classList.remove('ready'); area.classList.remove('paused');
            measure();
            setZoro(W / 2, H - 50 - zh / 2);
            hud.style.display = 'flex';
            elPoints.textContent = '0/' + goalOf(1); elTime.textContent = '0:00'; elLevel.textContent = 1;
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
            overScreen.querySelector('h2').textContent = level > 1 ? `انتهت اللعبة! بلغت المستوى ${level}` : 'انتهت اللعبة!';
            elFinal.textContent = fmt(Math.floor(time));
            bestLine.textContent = `القلوب: ${points} · المستوى: ${level} — أفضل نتيجة: ${best}`;
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
