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

  const customIcon = payload.data?.icon || payload.notification?.icon || stateIcon;
  const customImage = payload.data?.image || payload.notification?.image || undefined;

  const notificationOptions = {
    body: rawBody,
    icon: customIcon,
    image: customImage,
    badge: LOGO_MONO,
    color: '#0E7850',
    data: { url },
    tag: tag || 'default',
    renotify: true
  };

  return self.registration.showNotification(title, notificationOptions);
});

// 3. PWA Cache Management & Fetching Logic
const CACHE_NAME = 'vectorise-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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

  // Bypass interception for APIs and external Firebase assets
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

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw err;
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
