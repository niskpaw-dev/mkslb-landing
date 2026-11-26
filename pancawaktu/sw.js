/* PancaWaktu service worker — supaya paparan TV boleh dibuka semula tanpa internet.
   Halaman, manifest & API: rangkaian dulu, sandaran simpanan.
   Poster & fon: simpanan dulu (nama fail poster unik, tidak berubah).
   Zikir harian (pancawaktu/harian/): rangkaian dulu, kerana nama fail tetap. */
var CACHE = 'pancawaktu-v2';
var MAX_POSTER = 80;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./']); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return /^pancawaktu-v\d+$/.test(k) && k !== CACHE; }).map(function (k) { return caches.delete(k); }));   // simpanan video (pancawaktu-video) diurus oleh halaman
  }).then(function () { return self.clients.claim(); }));
});

function rangkaianDulu(req, kunci) {
  var masa = new Promise(function (_, tolak) { setTimeout(function () { tolak(new Error('lambat')); }, 8000); });
  return Promise.race([fetch(req), masa]).then(function (r) {
    if (r && r.ok) { var salin = r.clone(); caches.open(CACHE).then(function (c) { c.put(kunci || req, salin); }); }
    return r;
  }).catch(function () {
    return caches.match(kunci || req).then(function (r) { return r || Response.error(); });
  });
}
function simpananDulu(req) {
  return caches.match(req).then(function (ada) {
    if (ada) return ada;
    return fetch(req).then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) {
        var salin = r.clone();
        caches.open(CACHE).then(function (c) {
          c.put(req, salin).then(function () {
            c.keys().then(function (ks) {
              var poster = ks.filter(function (k) { return /\.(jpe?g|png|webp)(\?|$)/i.test(k.url); });
              if (poster.length > MAX_POSTER) poster.slice(0, poster.length - MAX_POSTER).forEach(function (k) { c.delete(k); });
            });
          });
        });
      }
      return r;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(rangkaianDulu(req, './')); return; }
  if (/manifest\.json$/.test(url.pathname)) { e.respondWith(rangkaianDulu(req, url.origin + url.pathname)); return; }
  if (/\/api\/waktu-solat/.test(url.pathname)) { e.respondWith(rangkaianDulu(req)); return; }
  if (/\/pancawaktu\/harian\//.test(url.pathname)) { e.respondWith(rangkaianDulu(req)); return; }   // zikir harian boleh diganti dengan nama sama
  if (/\.(jpe?g|png|webp|woff2?)$/i.test(url.pathname) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(simpananDulu(req)); return;
  }
});
