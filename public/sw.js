/*
 * Giftnify service worker — makes the website installable as an app.
 * Static files (built JS/CSS, icons, images) are cached for speed.
 * Pages and anything with money or personal data always come from the server,
 * so the app and the website show exactly the same data.
 */
const VERSION = 'giftnify-v2';
const STATIC = /^\/(build|images|icons|sounds)\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Static assets: cache first (file names change on every build).
  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Pages: always the network; a simple message when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
        '<body style="font-family:system-ui;padding:40px 20px;color:#22101D"><h1>You\'re offline</h1>' +
        '<p>Giftnify needs a connection. Check your internet and try again.</p></body>',
        { headers: { 'Content-Type': 'text/html' } }
      ))
    );
  }
});
