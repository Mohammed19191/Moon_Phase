/* sw.js — عامل الخدمة: يعمل الموقع دون اتصال (ما عدا التلاوة الصوتية فهي من الإنترنت). */
const VERSION = 'moon-v20261023c';
const SHELL = [
  './', 'index.html', 'MoonAge.html', 'ToTheMoon.html',
  'style.css', 'pet.css', 'quran-player.css', 'design.css',
  'site.js', 'quran-player.js', 'ayat.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...['bat', 'cloud', 'firstQuarter', 'fullMoon', 'lastQuarter', 'newMoon', 'sakura', 'sakuraBranch',
      'waningCrescent', 'waningGibbous', 'waxingCrescent', 'waxingGibbous', 'zoro'].map(n => `images1/${n}.png`)
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

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('ayat.json');
  if (isPage) {
    // الشبكة أولًا (لتصل التحديثات)، ثم النسخة المخزّنة عند انقطاع الاتصال
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // بقية الملفات: المخزّن أولًا مع تحديث في الخلفية
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
