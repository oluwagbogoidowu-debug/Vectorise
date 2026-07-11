importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 1. Initialize Firebase App
firebase.initializeApp({
  apiKey: "AIzaSyDEijT9QTC6wTyv_u2BN_UTC3NeOmADkI8",
  authDomain: "vectorise-f19d4.firebaseapp.com",
  projectId: "vectorise-f19d4",
  storageBucket: "vectorise-f19d4.firebasestorage.app",
  messagingSenderId: "617918084896",
  appId: "1:617918084896:web:2e1b531c6a0fd9e85f8945",
  measurementId: "G-M7NVQD0H7B"
});

const messaging = firebase.messaging();

const LOGO_MONO = 'https://lh3.googleusercontent.com/d/1iPPiCUwdOmGZ-KScVrvOpOw0LiauXE7X';
const STATE_ICONS = {
  'daily-unlock': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/unlock.png',
  'coach-message': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/chat.png',
  'task-completed': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/checkmark.png',
  'reminder': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png',
  'default': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png'
};

// 2. Custom Background Message Handler (Optional but handles icons/badge)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM Service Worker] Background message payload:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Vectorise';
  const rawBody = payload.notification?.body || payload.data?.body || '';
  const url = payload.data?.url || '/';
  const tag = payload.data?.tag || 'default';

  let stateIcon = STATE_ICONS.default;
  if (tag) {
    if (tag === 'daily-unlock') stateIcon = STATE_ICONS['daily-unlock'];
    else if (tag === 'coach-message') stateIcon = STATE_ICONS['coach-message'];
    else if (tag === 'task-completed') stateIcon = STATE_ICONS['task-completed'];
    else if (['missed-long', 'missed-short', 'midday-check', 'evening-reminder', 'reminder'].includes(tag)) {
      stateIcon = STATE_ICONS['reminder'];
    }
  }

  const notificationOptions = {
    body: rawBody,
    icon: payload.notification?.image || payload.data?.icon || stateIcon,
    badge: LOGO_MONO,
    color: '#0E7850',
    data: { url },
    tag: tag || 'default',
    renotify: true
  };

  return self.registration.showNotification(title, notificationOptions);
});

// 3. PWA Cache Management & Fetching Logic
const CACHE_NAME = 'vectorise-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/achievement_bg.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      console.log('[Service Worker] All core assets pre-cached successfully.');
    }).catch((err) => {
      console.error('[Service Worker] Failed to pre-cache core assets:', err);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass interception for real-time Firebase actions, external user images, etc.
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') || 
    url.hostname.includes('firebase.io') ||
    url.hostname.includes('lh3.googleusercontent.com') ||
    url.hostname.includes('picsum.photos') ||
    url.hostname.includes('unsplash.com') ||
    url.pathname.includes('generateContent') ||
    url.hostname.includes('fcm.googleapis.com')
  ) {
    return;
  }

  // 1. NETWORK-FIRST for HTML Document / Navigation requests to prevent stale index.html while remaining offline-capable
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[Service Worker] Navigation request failed; serving index.html fallback from cache');
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 2. CACHE-FIRST for Static UI Assets (JS bundles, CSS styles, locally hosted fonts, images)
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.woff2') || 
    url.pathname.endsWith('.woff') || 
    url.pathname.endsWith('.ttf') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.jpeg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.json') || 
    url.pathname.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.error('[Service Worker] Failed to fetch static asset:', url.pathname, err);
          // Return graceful fallbacks instead of crashing
          if (url.pathname.endsWith('.js')) {
            return new Response('console.warn("Offline: JS asset failed to load gracefully.");', {
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          if (url.pathname.endsWith('.css')) {
            return new Response('/* Offline: CSS asset failed to load gracefully. */', {
              headers: { 'Content-Type': 'text/css' }
            });
          }
          throw err;
        });
      })
    );
    return;
  }

  // 3. DEFAULT: Cache-First for all other static request paths
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// 4. Notification Action Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
