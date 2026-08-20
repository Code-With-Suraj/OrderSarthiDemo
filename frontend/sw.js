/**
 * OrderSarthi — Progressive Web App Service Worker
 * Fast caching, offline support, background sync, and instant app install.
 */

const CACHE_NAME = 'ordersarthi-v1.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/cart.html',
  '/checkout.html',
  '/orders.html',
  '/profile.html',
  '/login.html',
  '/register.html',
  '/admin/index.html',
  '/admin/pos.html',
  '/admin/dashboard.html',
  '/admin/orders.html',
  '/admin/products.html',
  '/admin/settings.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/pwa.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.svg'
];

// Install Event: Cache Core App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some static assets failed to cache during install:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-First for API calls, Stale-While-Revalidate for Static Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or Apps Script API calls
  if (event.request.method !== 'GET' || url.hostname.includes('script.google.com') || url.hostname.includes('razorpay')) {
    return;
  }

  // Static Assets / Same-Origin: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
