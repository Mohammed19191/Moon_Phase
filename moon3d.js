/* moon3d.js — قمر ثلاثي الأبعاد بإضاءة الليلة الحقيقية.
   - Three.js محفوظ محليًا (vendor/) وخريطة السطح والتضاريس من بيانات ناسا (tex/)، فلا اعتماد على شبكة خارجية.
   - الإضاءة بنموذج لوميل-زيلغر القمري: البدر قرص ساطع متساوٍ تقريبًا، لا كرة معتمة الأطراف.
   - إن تعذّر WebGL بقيت صورة الطور العادية كما هي. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAM_Z = 4.4;
  let ready = null;

  function hasWebGL() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
    catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (window.THREE) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  // اتجاه الشمس من كسر الدورة (0 محاق، 0.5 بدر). المتزايد مضاء من اليمين كما في نصف الكرة الشمالي.
  const sunDir = (T, f) => { const e = f * 2 * Math.PI; return new T.Vector3(Math.sin(e), 0.08, -Math.cos(e)).multiplyScalar(10); };

  function engine() {
    if (ready) return ready;
    ready = (async () => {
      if (!hasWebGL()) throw new Error('WebGL غير متاح');
      await loadScript('vendor/three.min.js');
      const T = window.THREE;
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.z = CAM_Z;

      const loader = new T.TextureLoader();
      const load = u => new Promise((res, rej) => loader.load(u, res, undefined, rej));
      const [map, bump] = await Promise.all([load('tex/moon.webp'), load('tex/moon-bump.webp')]);
      map.encoding = T.sRGBEncoding;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const mat = new T.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.022, roughness: 1, metalness: 0, color: 0xf4eee4 });
      mat.onBeforeCompile = sh => {
        const chunk = T.ShaderChunk.lights_physical_pars_fragment;
        const target = 'vec3 irradiance = dotNL * directLight.color;';
        if (chunk.indexOf(target) < 0) return;
        sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', chunk.replace(target,
          'float muV = saturate( dot( geometry.normal, geometry.viewDir ) );' +
          'vec3 irradiance = min( 2.0 * dotNL / ( dotNL + muV + 1e-4 ), 1.35 ) * directLight.color;'));
      };
      const sphere = new T.Mesh(new T.SphereGeometry(1, 160, 112), mat);
      sphere.rotation.y = -Math.PI / 2;          // خط الطول صفر (الوجه المقابل للأرض) نحو الناظر
      const group = new T.Group();
      group.add(sphere);
      scene.add(group);
      const sun = new T.DirectionalLight(0xfff6ea, 1.35);
      scene.add(sun);
      scene.add(new T.AmbientLight(0x5c6f9e, 0.012));   // ضوء الأرض الخافت: الجزء المظلم قرص داكن شبه أسود، فيبقى القمر دائريًا
      return { T, renderer, scene, camera, group, sun, view: null };
    })();
    return ready;
  }

  /* يضع القمر داخل عنصر ويعيد أداة تحكم { setPhase } */
  async function mount(host, fraction) {
    const g = await engine();
    const { T, renderer, scene, camera, group, sun } = g;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    const st = { f: fraction, rx: 0, ry: reduce ? 0 : 0.9, vx: 0, vy: 0, dragging: false, moved: 0, lx: 0, ly: 0, raf: 0 };
    g.view = st;
    sun.position.copy(sunDir(T, st.f));

    function size() {
      const s = host.clientWidth;
      if (!s) return;                            // الشاشة مخفية: لا تغيير
      renderer.setSize(s, s, false);
      camera.aspect = 1; camera.updateProjectionMatrix();
      kick();
    }
    function step() {
      st.raf = 0;
      let moving = false;
      if (!st.dragging) {
        if (Math.abs(st.vx) > 1e-4 || Math.abs(st.vy) > 1e-4) {
          st.ry += st.vy; st.rx += st.vx; st.vx *= 0.93; st.vy *= 0.93; moving = true;
        } else if (Math.abs(st.ry) > 0.002 || Math.abs(st.rx) > 0.002) {
          st.ry *= 0.94; st.rx *= 0.94; moving = true;   // يعود القمر برفق إلى وجهه المعتاد
        } else { st.rx = 0; st.ry = 0; }
      }
      st.rx = Math.max(-1.2, Math.min(1.2, st.rx));
      group.rotation.set(st.rx, st.ry, 0);
      renderer.render(scene, camera);
      if (moving) kick();
    }
    function kick() { if (!st.raf) st.raf = requestAnimationFrame(step); }

    canvas.addEventListener('pointerdown', e => {
      st.dragging = true; st.moved = 0; st.lx = e.clientX; st.ly = e.clientY; st.vx = st.vy = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    });
    canvas.addEventListener('pointermove', e => {
      if (!st.dragging) return;
      const dx = e.clientX - st.lx, dy = e.clientY - st.ly;
      st.lx = e.clientX; st.ly = e.clientY; st.moved += Math.abs(dx) + Math.abs(dy);
      st.vy = dx * 0.008; st.vx = dy * 0.008; st.ry += st.vy; st.rx += st.vx;
      kick();
    });
    const end = () => { st.dragging = false; kick(); };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    // السحب لا يُحتسب ضغطة: يمنع الانتقال إن كان القمر داخل رابط
    host.addEventListener('click', e => { if (st.moved > 6) { e.preventDefault(); e.stopPropagation(); } st.moved = 0; }, true);

    if ('ResizeObserver' in window) new ResizeObserver(size).observe(host); else addEventListener('resize', size);
    size();
    // دوران الترحيب: فقط إن كان الجهاز يرسم القمر بسرعة. الأجهزة الضعيفة (أو الرسم البرمجي بلا معالج رسوميات)
    // تعرض القمر ثابتًا حتى يسحبه الزائر، فلا تنشغل الصفحة بعشرات الإطارات الثقيلة عند الفتح
    if (st.ry) {
      const t0 = performance.now();
      group.rotation.set(st.rx, st.ry, 0); renderer.render(scene, camera);
      try { renderer.getContext().finish(); } catch (err) { /* */ }
      if (performance.now() - t0 > 30) { st.ry = 0; kick(); }
    }
    return {
      setPhase(f) { st.f = f; sun.position.copy(sunDir(T, f)); kick(); },
      redraw: size
    };
  }

  /* صورة ثابتة للقمر في طور معيّن (لبطاقة المشاركة وقمر الميلاد) */
  async function snapshot(fraction, px = 640) {
    const { T, renderer, scene, camera, group, sun, view } = await engine();
    const prevRatio = renderer.getPixelRatio();
    const prevSize = renderer.getSize(new T.Vector2());
    renderer.setPixelRatio(1);
    renderer.setSize(px, px, false);
    camera.aspect = 1; camera.updateProjectionMatrix();
    group.rotation.set(0, 0, 0);
    sun.position.copy(sunDir(T, fraction));
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.setPixelRatio(prevRatio);
    if (prevSize.x) renderer.setSize(prevSize.x, prevSize.y, false);
    if (view) { sun.position.copy(sunDir(T, view.f)); group.rotation.set(view.rx, view.ry, 0); }
    renderer.render(scene, camera);
    return url;
  }

  // نسبة قطر القرص إلى عرض الصورة (لضبط حجم القمر في البطاقات)
  const DISC = 1 / (CAM_Z * Math.tan(15 * Math.PI / 180));

  window.Moon3D = { mount, snapshot, available: () => engine().then(() => true, () => false), DISC };
})();
