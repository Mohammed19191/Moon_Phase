/* sw.js — عامل الخدمة: يعمل الموقع دون اتصال (ما عدا التلاوة الصوتية فهي من الإنترنت). */
const VERSION = 'moon-v20261024zf';
const SHELL = [
  './', 'index.html', 'MoonAge.html', 'ToTheMoon.html',
  'style.css', 'pet.css', 'quran-player.css', 'app.css', 'design.css',
  'site.js', 'quran-player.js', 'home.js', 'age.js', 'game.js', 'app.js', 'ayat.json', 'manifest.webmanifest',
  'features.css', 'moon3d.js', 'share.js', 'vendor/three.min.js', 'tex/moon.jpg', 'tex/moon-bump.jpg', 'fonts/amiri-quran.woff2', 'sheets.js', 'nav-lens.js', 'glass-sliders.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...['bat', 'cloud', 'firstQuarter', 'fullMoon', 'lastQuarter', 'newMoon', 'sakura', 'sakuraBranch',
      'waningCrescent', 'waningGibbous', 'waxingCrescent', 'waxingGibbous', 'zoro'].map(n => `images1/${n}.webp`)
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // الصوت وغيره من مواقع أخرى: مباشرةً من الشبكة

  // كل ملفات الموقع: الشبكة أولًا (فتصل التحديثات فورًا)، ثم المخزّن عند انقطاع الاتصال فقط
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
