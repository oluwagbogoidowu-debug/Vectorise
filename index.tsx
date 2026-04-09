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
      // Check for existing registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        // If there's a registration that isn't for our current sw.js, or if it's in a weird state
        // we might want to unregister it, but for now let's just log
        console.log('Existing SW found:', reg.scope, reg.active ? 'active' : 'inactive');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available, please refresh.');
            }
          });
        }
      });
    } catch (error) {
      console.error('SW registration failed: ', error);
    }
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