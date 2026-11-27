import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Génère un service worker qui précache TOUS les fichiers de l'app shell,
// y compris les polices et les sons (les fichiers de /public sont ajoutés
// explicitement car Vite ne les inclut pas dans le bundle).
function offlineServiceWorker() {
  // Un seul identifiant par build : il pilote le cache du service worker, la
  // meta dans index.html et version.json, que le client compare en réseau.
  const buildId = String(Date.now())
  return {
    name: 'confesse-moi-offline',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('</head>', `    <meta name="confesse-version" content="${buildId}" />\n  </head>`)
    },
    generateBundle(_options, bundle) {
      const publicDir = path.resolve(process.cwd(), 'public')
      const publicFiles = []

      function walk(dir, prefix = '') {
        if (!fs.existsSync(dir)) return
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name
          if (entry.isDirectory()) walk(path.join(dir, entry.name), rel)
          else if (rel !== 'sw.js' && rel !== 'manifest.webmanifest') publicFiles.push(rel)
        }
      }
      walk(publicDir)

      const urls = [...new Set([
        '/', '/index.html', '/manifest.webmanifest',
        ...Object.keys(bundle).filter((url) => url !== 'version.json'),
        ...publicFiles,
      ])]
        .map((url) => '/' + url.replace(/^\/+/, ''))

      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: buildId }) })

      const source = `/* Confesse-moi — cache de l'application, des polices et des sons */
const CACHE = 'confesse-moi-${buildId}';
const URLS = ${JSON.stringify(urls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Le client peut forcer l’activation d’un service worker en attente.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d’abord, pour que le mobile reçoive immédiatement
  // chaque nouveau build ; cache en secours quand le Wi-Fi est absent.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Le marqueur de version doit toujours venir du réseau : c’est lui qui
  // déclenche le rechargement des onglets déjà ouverts.
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Assets hachés : immuables, donc cache d’abord (fonctionne hors ligne).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => Response.error());
    })
  );
});
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), offlineServiceWorker()],
  build: {
    target: 'es2022',
  },
  // Accès depuis le téléphone sur le même réseau Wi-Fi.
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' },
})
