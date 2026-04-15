// ====================================================
// sw.js — Smart Service Worker with Auto-Update
// Har Vercel deploy pe automatically cache clear hoga
// ====================================================

const CACHE_VERSION = 'v1776176150307'; // Vercel build time se replace hoga
const CACHE_NAME = `nayika-naari-${CACHE_VERSION}`;

// Ye files cache karo (app shell)
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/splash.png',
];

// ── Install: naya cache banao ──────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  
  // Turant active ho jao — purane SW ka wait mat karo
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
});

// ── Activate: purane sare cache delete karo ───────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating, cleaning old caches...');

  event.waitUntil(
    Promise.all([
      // Purane sare caches delete karo
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Turant sare clients ko control lo
      self.clients.claim(),
    ])
  );
});

// ── Fetch: Network First strategy ─────────────────
// Network se lao, fail hone pe cache use karo
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase, OneSignal, APIs — kuch bhi cache mat karo
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('onesignal.com') ||
    url.hostname.includes('postalpincode.in') ||
    url.hostname.includes('wa.me') ||
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET'
  ) {
    return; // Network directly use karo
  }

  // _next/static files — Cache First (ye frequently change nahi hote)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — Network First (hamesha fresh content dikhao)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Baaki sab — Network First with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Message handler: Force update ─────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage('CACHE_CLEARED'));
    });
  }
});