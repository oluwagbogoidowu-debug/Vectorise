// Legacy Service Worker cleanup stub
// This file exists to clean up any previously registered Service Worker at /sw.js
// and avoid 404/text-html MIME type errors during the transition to FCM.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('[Legacy SW] Unregistered old /sw.js successfully.');
    })
  );
});
