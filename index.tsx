import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { analyticsTracker } from './services/analyticsTracker';

// Initialize Analytics Tracking
analyticsTracker.init();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      console.log('[ServiceWorker] Checking for registrations...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        console.log('[ServiceWorker] No registration found, starting fresh.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[ServiceWorker] Successfully registered:', registration.scope);

      // Force an update check to ensure we have the latest and it's active
      registration.update();

      // Listen for updates found
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          console.log('[ServiceWorker] New version found, installing...');
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[ServiceWorker] New content is available; please refresh.');
              } else {
                console.log('[ServiceWorker] Content is cached for offline use.');
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
    }
  });

  // Handle redundant service workers and takeovers
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[ServiceWorker] Controller changed. Site will soon be controlled by a new worker.');
    // Optional: window.location.reload(); // Usually better to let user decide, but can be forced
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);