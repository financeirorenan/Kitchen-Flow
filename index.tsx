import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Purge stale Service Worker caches that may have cached Vite dev modules and register /sw.js
if (typeof window !== 'undefined') {
  if ('caches' in window) {
    const validCaches = [
      'kitchenflow-courier-pwa-v6',
      'kitchenflow-map-tiles-v2',
      'kitchenflow-fonts-v2'
    ];
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (!validCaches.includes(name)) {
          caches.delete(name).catch(() => {});
        }
      });
    }).catch(() => {});
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch((err) => {
          console.warn('Aviso ao registrar Service Worker:', err);
        });
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
