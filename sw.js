/* Crosswind offline cache. This file never needs editing between builds: the ?v=N numbers in index.html keep the cache fresh.
   Install: save the page and every file it needs (scripts, styles, fonts, icons) plus the PDF import libraries.
   index.html is network-first (3 second timeout, then the saved copy); everything else is cache-first. */
const CACHE = 'crosswind-app';
const PAGE = 'index.html';
const PDF_LIBS = ['lib/pdf.min.js', 'lib/pdf.worker.min.js'];
const abs = p => new URL(p, self.registration.scope).href;

/* every same-origin file named by the page's <script src> and <link href>, plus the fonts its stylesheets name */
async function neededFiles(html) {
  const files = new Set();
  const re = /<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi; let m;
  while ((m = re.exec(html))) { const u = new URL(m[1], abs(PAGE)); if (u.origin === self.location.origin) files.add(u.href); }
  for (const u of [...files]) {
    if (!/\.css(\?|$)/.test(u)) continue;
    const css = await (await fetch(u, { cache: 'reload' })).text(); const ur = /url\(\s*["']?([^"')]+)["']?\s*\)/g; let f;
    while ((f = ur.exec(css))) { if (/^data:/.test(f[1])) continue; const fu = new URL(f[1], u); if (fu.origin === self.location.origin) files.add(fu.href); }
  }
  PDF_LIBS.forEach(p => files.add(abs(p)));
  return files;
}

/* download the page and everything it needs into the cache (install, and again when the page asks for a fresh copy) */
async function populate() {
  const res = await fetch(abs(PAGE), { cache: 'reload' }); if (!res.ok) throw new Error('page not available');
  const html = await res.clone().text(), cache = await caches.open(CACHE);
  await cache.put(abs(PAGE), res);
  await Promise.all([...await neededFiles(html)].map(u => cache.add(new Request(u, { cache: 'reload' }))));
}

self.addEventListener('install', e => { e.waitUntil(populate().then(() => self.skipWaiting())); });

/* the page's "Clear cache" button deletes the cache and sends 'refill' */
self.addEventListener('message', e => { if (e.data === 'refill') e.waitUntil(populate().then(() => e.source && e.source.postMessage('refilled'), () => e.source && e.source.postMessage('refill-failed'))); });

self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

/* drop old ?v=N copies of a file once the page names a newer one (fonts, icons, and the PDF libraries are kept) */
async function pruneOld(html) {
  const cache = await caches.open(CACHE), named = new Set();
  const re = /<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi; let m;
  while ((m = re.exec(html))) named.add(new URL(m[1], abs(PAGE)).href);
  for (const k of await cache.keys()) if (new URL(k.url).search && !named.has(k.url)) await cache.delete(k);
}

/* cache: 'no-cache' = always ask the server (a cheap check), never a copy the browser kept for up to 10 minutes */
async function pageNetworkFirst(req, event) {
  const cache = await caches.open(CACHE);
  const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => { if (res.ok) { await cache.put(abs(PAGE), res.clone()); pruneOld(await res.clone().text()); } return res; });
  event.waitUntil(net.catch(() => {}));
  try {
    return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3000))]);
  } catch (err) {
    const saved = await cache.match(abs(PAGE)); if (saved) return saved;
    return net;
  }
}

async function assetCacheFirst(req) {
  const cache = await caches.open(CACHE), hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req); if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/' + PAGE)) e.respondWith(pageNetworkFirst(req, e));
  else e.respondWith(assetCacheFirst(req));
});
