/* KitchenFlow Courier & PWA Service Worker (InjectManifest + Offline Cache + Firestore Push) */
const WB_MANIFEST = self.__WB_MANIFEST || [];
const CACHE_NAME = 'kitchenflow-courier-pwa-v7';
const MAP_CACHE_NAME = 'kitchenflow-map-tiles-v2';
const FONT_CACHE_NAME = 'kitchenflow-fonts-v2';

const CORE_ASSETS = [
  '/manifest.json',
  '/manifest-courier.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/favicon.svg'
];

try {
  importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore-compat.js');
} catch (err) {
  console.warn('[SW Courier] Aviso ao importar Firebase scripts:', err);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const precacheUrls = WB_MANIFEST
        .map((entry) => (typeof entry === 'string' ? entry : entry.url))
        .filter((url) => url && !url.includes('/node_modules/') && !url.endsWith('.tsx') && !url.endsWith('.ts'));
      const allUrls = Array.from(new Set([...CORE_ASSETS, ...precacheUrls]));
      return Promise.allSettled(allUrls.map((url) => cache.add(url).catch(() => {})));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => ![CACHE_NAME, MAP_CACHE_NAME, FONT_CACHE_NAME].includes(name))
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Runtime Fetch Caching (Map Tiles, Fonts, Built Production Assets, Offline Navigation Fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never intercept API, Firestore, Auth, or Vite Dev Server / Source Modules
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/components/') ||
    url.pathname.startsWith('/hooks/') ||
    url.pathname.startsWith('/services/') ||
    url.pathname.startsWith('/utils/') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.jsx') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.search.includes('import') ||
    url.search.includes('html-proxy')
  ) {
    return;
  }

  // Cache CartoDB / OSM Map Tiles for Courier GPS navigation
  if (url.hostname.includes('basemaps.cartocdn.com') || url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request)
            .then((response) => {
              if (response && (response.status === 200 || response.status === 0)) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Cache Google Fonts
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && (response.status === 200 || response.status === 0)) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Navigation requests (e.g., /entregador): Network first, fallback to cached response only if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Built static assets (/assets/*, icons, manifests, fonts) on same-origin: Network-first to avoid stale JS bundles
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icon') ||
      url.pathname.startsWith('/favicon') ||
      url.pathname.startsWith('/manifest') ||
      /\.(png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf)$/i.test(url.pathname));

  if (isStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

let unsubscribeOrders = null;
let currentCourierId = null;
let knownOrderStates = new Map();
let isInitialSnapshot = true;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'SCHEDULE_TEST_NOTIFICATION') {
    const delayMs = event.data.delayMs || 5000;
    const customTitle = event.data.title || 'Nova Entrega Disponível 🛵 (R$ 16,50)';
    const customBody =
      event.data.body ||
      'Restaurante: Pizzaria Bella Napoli • Coleta a 1.2km • Toque para abrir o painel e aceitar a corrida!';
    const customVibrate = event.data.vibrate || [300, 150, 300, 150, 400];

    const promise = new Promise((resolve) => {
      setTimeout(() => {
        self.registration
          .showNotification(customTitle, {
            body: customBody,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: customVibrate,
            tag: 'test-push-notification-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            data: { url: '/entregador' }
          })
          .then(resolve)
          .catch(resolve);
      }, delayMs);
    });
    event.waitUntil(promise);
  }

  if (event.data.type === 'INIT_COURIER_CONFIG') {
    const {
      userId,
      tenantId,
      apiKey,
      authDomain,
      projectId,
      appId,
      firestoreDatabaseId
    } = event.data;

    if (!userId || !projectId || !apiKey) return;
    if (currentCourierId === userId && unsubscribeOrders) return;

    currentCourierId = userId;
    isInitialSnapshot = true;
    knownOrderStates.clear();

    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          firebase.initializeApp({
            apiKey,
            authDomain,
            projectId,
            appId
          });
        }

        let db;
        try {
          if (firestoreDatabaseId && firestoreDatabaseId !== '(default)') {
            db = firebase.app().firestore(firestoreDatabaseId);
          } else {
            db = firebase.firestore();
          }
        } catch (e) {
          db = firebase.firestore();
        }

        if (unsubscribeOrders) {
          unsubscribeOrders();
        }

        let queryRef = db.collection('orders').where('courierId', '==', userId);
        if (tenantId) {
          queryRef = queryRef.where('tenantId', '==', tenantId);
        }

        unsubscribeOrders = queryRef.onSnapshot(
          (snapshot) => {
            if (isInitialSnapshot) {
              snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                knownOrderStates.set(docSnap.id, data.status);
              });
              isInitialSnapshot = false;
              return;
            }

            snapshot.docChanges().forEach((change) => {
              const docId = change.doc.id;
              const order = change.doc.data();
              const prevStatus = knownOrderStates.get(docId);

              knownOrderStates.set(docId, order.status);

              const shortNumber = order.orderNumber
                ? String(order.orderNumber).padStart(3, '0')
                : docId.slice(-4).toUpperCase();

              if (
                change.type === 'added' &&
                ['ready', 'delivering', 'preparing'].includes(order.status)
              ) {
                self.registration.showNotification(
                  `🛵 Nova Entrega Atribuída! (#${shortNumber})`,
                  {
                    body: `Cliente: ${order.customerName || 'Cliente'} • Comissão: R$ ${(order.courierEarnings || 0).toFixed(2)}\nEnd: ${order.customerAddress || 'Retirada no balcão'}`,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [400, 150, 400, 150, 500],
                    tag: `new-order-${docId}`,
                    renotify: true,
                    requireInteraction: true,
                    data: { url: '/entregador' }
                  }
                );
              } else if (
                change.type === 'modified' &&
                prevStatus !== 'ready' &&
                order.status === 'ready'
              ) {
                self.registration.showNotification(
                  `🍳 Pedido #${shortNumber} Pronto para Retirada!`,
                  {
                    body: `Dirija-se ao balcão para retirar o pedido de ${order.customerName || 'Cliente'}.`,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [300, 100, 300],
                    tag: `ready-order-${docId}`,
                    renotify: true,
                    data: { url: '/entregador' }
                  }
                );
              }
            });
          },
          (err) => {
            console.warn('[SW Courier] Erro no listener Firestore:', err);
          }
        );
      }
    } catch (err) {
      console.error('[SW Courier] Falha ao configurar Firestore no SW:', err);
    }
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nova Atualização KitchenFlow';
  const options = {
    body: data.body || 'Você tem uma nova atualização nas suas entregas.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'order-notification',
    renotify: true,
    data: {
      url: data.url || '/entregador'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : '/entregador';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
