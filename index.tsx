import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { analyticsTracker } from './services/analyticsTracker';

// Safe global JSON.stringify patch to prevent circular structure crashes (e.g. Firebase Y2/Ka/src)
if (typeof JSON !== 'undefined') {
  const originalStringify = JSON.stringify;
  JSON.stringify = function (value, replacer, space) {
    const seen = new WeakSet();
    const cycleReplacer = (key: string, val: any) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
      }
      return val;
    };

    let newReplacer: any;
    if (typeof replacer === 'function') {
        newReplacer = (key: string, val: any) => {
            return replacer(key, cycleReplacer(key, val));
        };
    } else if (Array.isArray(replacer)) {
        newReplacer = (key: string, val: any) => {
            if (key !== '' && !replacer.includes(key)) return undefined;
            return cycleReplacer(key, val);
        }
    } else {
        newReplacer = cycleReplacer;
    }

    try {
      return originalStringify(value, newReplacer as any, space);
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('circular')) {
         return '"[Unserializable Circular Reference]"';
      }
      // Provide fallback for objects with throwing getters
      return '"[Unserializable Object]"';
    }
  };
}

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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);