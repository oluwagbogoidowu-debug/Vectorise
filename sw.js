const CACHE_NAME = 'vectorise-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 1. Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 2. Bypass interception for Firestore, Google APIs, and external CDNs
  // This is critical to prevent "Failed to fetch" errors on complex dynamic requests.
  if (
    url.hostname.includes('firestore.googleapis.com') || 
    url.hostname.includes('firebase.io') ||
    url.hostname.includes('lh3.googleusercontent.com') ||
    url.pathname.includes('generateContent')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // 3. Perform network fetch but handle failure gracefully
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid basic responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Fallback for navigation requests when offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // Re-throw to let the caller handle specific errors
        throw err;
      });
    })
  );
});