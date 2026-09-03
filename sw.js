/**
 * FoldC64 — Service Worker
 *
 * Provides offline caching for the PWA:
 * - Cache-first for app shell (HTML, CSS, JS, fonts, icons)
 * - Network-first with cache fallback for WASM/ROM files
 */

const CACHE_NAME = 'foldc64-v2';

/**
 * App shell resources to pre-cache on install.
 */
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/monitor.css',
  '/css/keyboard.css',
  '/css/joystick.css',
  '/js/app.js',
  '/js/emulator.js',
  '/js/keyboard.js',
  '/js/joystick.js',
  '/js/storage.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

/**
 * Patterns that should use network-first strategy.
 * These are large WASM/ROM files fetched from CDNs.
 */
const NETWORK_FIRST_PATTERNS = [
  /\.wasm$/,
  /\.data$/,
  /retroarch/,
  /nostalgist/,
  /libretro/,
  /\.rom$/,
];

// ── Install: Pre-cache app shell ─────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );

  // Activate immediately (don't wait for old service worker to stop)
  self.skipWaiting();
});

// ── Activate: Clean up old caches ────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: Route requests to cache or network ────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Check if this request should use network-first strategy
  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some((pattern) =>
    pattern.test(url.pathname) || pattern.test(url.href)
  );

  if (isNetworkFirst) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

/**
 * Cache-first strategy: Check cache, fall back to network.
 * Used for app shell resources.
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Network fetch failed for:', request.url);
    // Return a basic offline response for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw err;
  }
}

/**
 * Network-first strategy: Try network, fall back to cache.
 * Used for WASM/ROM files that may be updated but should work offline.
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache the response for offline use
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Network failed, trying cache for:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw err;
  }
}
