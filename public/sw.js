const CACHE_NAME = 'vectorise-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Become available to all pages immediately
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
  // 1. Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 2. Bypass interception for API calls, Firestore, Google APIs, and common external image CDNs
  // This is critical to prevent "Failed to fetch" errors on complex dynamic requests or CORS image fetches.
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') || 
    url.hostname.includes('firebase.io') ||
    url.hostname.includes('lh3.googleusercontent.com') ||
    url.hostname.includes('picsum.photos') ||
    url.hostname.includes('unsplash.com') ||
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

self.addEventListener('push', (event) => {
  console.log('🔥 PUSH RECEIVED:', event);

  const LOGO_MONO = 'https://lh3.googleusercontent.com/d/1E53SHGw_3D5V-qQKkMX6hUo61NgKkJPv';
  const STATE_ICONS = {
    'daily-unlock': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/unlock.png',
    'coach-message': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/chat.png',
    'task-completed': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/checkmark.png',
    'reminder': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png',
    'default': 'https://img.icons8.com/fluency-systems-filled/96/0E7850/clock.png'
  };

  let title = 'Vectorise';
  let options = {
    body: 'Push is working',
    icon: STATE_ICONS.default, // State icon on the right
    badge: LOGO_MONO,          // New monochrome logo on the left
    color: '#0E7850',          // Brand background/accent color
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      
      // Determine icon based on tag
      let stateIcon = STATE_ICONS.default;
      if (data.tag) {
        if (data.tag === 'daily-unlock') stateIcon = STATE_ICONS['daily-unlock'];
        else if (data.tag === 'coach-message') stateIcon = STATE_ICONS['coach-message'];
        else if (data.tag === 'task-completed') stateIcon = STATE_ICONS['task-completed'];
        else if (['missed-long', 'missed-short', 'midday-check', 'evening-reminder'].includes(data.tag)) {
          stateIcon = STATE_ICONS['reminder'];
        }
      }

      options = {
        ...options,
        body: data.body || options.body,
        icon: data.icon || stateIcon, // Allow server override, else use state icon
        data: {
          url: data.url || '/'
        },
        tag: data.tag || 'default',
        renotify: true
      };
    } catch (err) {
      console.warn('Push data was not JSON:', event.data.text());
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';

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
