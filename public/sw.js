/* KitchenFlow AI - Service Worker for Courier Notifications */

// Import Firebase Compat in the background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore-compat.js');

const CACHE_NAME = 'kitchenflow-courier-cache-v1';
let firebaseApp = null;
let firestoreDb = null;
let ordersListener = null;

// Keep track of order IDs that have already been notified
let notifiedOrderIds = new Set();

// Cache and setup essentials
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Cache Storage helper to persist credentials and states
async function getStoredConfig() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const configResp = await cache.match('/sw-config.json');
    if (configResp) {
      return await configResp.json();
    }
  } catch (e) {
    console.error('[SW] Error reading stored config:', e);
  }
  return null;
}

async function saveStoredConfig(config) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put('/sw-config.json', new Response(JSON.stringify(config)));
  } catch (e) {
    console.error('[SW] Error saving config:', e);
  }
}

async function getNotifiedOrders() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const notifiedResp = await cache.match('/notified-orders.json');
    if (notifiedResp) {
      const list = await notifiedResp.json();
      return new Set(list);
    }
  } catch (e) {
    console.error('[SW] Error reading notified orders:', e);
  }
  return new Set();
}

async function saveNotifiedOrders(set) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put('/notified-orders.json', new Response(JSON.stringify([...set])));
  } catch (e) {
    console.error('[SW] Error saving notified orders:', e);
  }
}

// Function to handle showing browser system-level notifications
function showNotification(title, options) {
  const defaultOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: self.registration.scope
    },
    ...options
  };
  
  return self.registration.showNotification(title, defaultOptions);
}

// Initialize active background Firestore listener
async function setupBackgroundFirestore(config) {
  if (!config || !config.apiKey || !config.projectId || !config.userId || !config.tenantId) {
    return;
  }

  // Load previously notified orders to avoid duplication
  const loadedSet = await getNotifiedOrders();
  notifiedOrderIds = loadedSet;

  // Unsubscribe existing listener if any
  if (ordersListener) {
    try {
      ordersListener();
    } catch (e) {}
    ordersListener = null;
  }

  try {
    // If firebase is not yet initialized
    if (!firebaseApp) {
      // Create a unique app name to avoid multi-init errors
      firebaseApp = firebase.initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        appId: config.appId
      }, 'kitchenflow-sw-app');
      
      firestoreDb = firebaseApp.firestore();
    }

    console.log('[SW] Background Firestore initialized successfully for courier:', config.userId);

    // Dynamic yesterday query to watch for new orders
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    // Setup active background orders listener
    ordersListener = firestoreDb.collection('orders')
      .where('tenantId', '==', config.tenantId)
      .where('courierId', '==', config.userId)
      .where('createdAt', '>=', yesterday)
      .onSnapshot((snapshot) => {
        let isFirstRun = notifiedOrderIds.size === 0;
        
        snapshot.docChanges().forEach((change) => {
          const docId = change.id;
          const data = change.doc.data();
          
          if (change.type === 'added') {
            if (!notifiedOrderIds.has(docId)) {
              notifiedOrderIds.add(docId);
              
              // Only trigger notification if it's not the initial page loading of old orders
              if (!isFirstRun && data.status !== 'delivered' && data.status !== 'cancelled') {
                showNotification(`Novo pedido atribuído! (#${docId.slice(-4)})`, {
                  body: `Você tem uma nova entrega disponível! Clique para visualizar no KitchenFlow AI.`,
                  tag: `order-${docId}`
                });
              }
            }
          } else if (change.type === 'modified') {
            // Warn if status has changed
            if (data.status === 'ready' && !notifiedOrderIds.has(`${docId}-ready`)) {
              notifiedOrderIds.add(`${docId}-ready`);
              showNotification(`Pedido Pronto! (#${docId.slice(-4)})`, {
                body: `O pedido #${docId.slice(-4)} já está pronto para entrega!`,
                tag: `ready-${docId}`
              });
            }
          }
        });
        
        saveNotifiedOrders(notifiedOrderIds);
      }, (err) => {
        console.warn('[SW] Background database listener exception (usually offline/permissions):', err);
      });

  } catch (error) {
    console.warn('[SW] Firestore bootstrap failed:', error);
  }
}

// Message parser
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  switch (data.type) {
    case 'INIT_COURIER_CONFIG':
      const newConfig = {
        userId: data.userId,
        tenantId: data.tenantId,
        apiKey: data.apiKey,
        authDomain: data.authDomain,
        projectId: data.projectId,
        appId: data.appId,
        firestoreDatabaseId: data.firestoreDatabaseId
      };
      
      saveStoredConfig(newConfig).then(() => {
        setupBackgroundFirestore(newConfig);
      });
      break;

    case 'SEND_NOTIFICATION':
      showNotification(data.title || 'Alerta KitchenFlow AI', {
        body: data.body || 'Atualização no seu painel de entregas.'
      });
      break;
      
    case 'CLEAR_NOTIFIED_HISTORY':
      notifiedOrderIds.clear();
      saveNotifiedOrders(notifiedOrderIds);
      break;
  }
});

// On click, focus or open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Try to self heal on sync/wake
self.addEventListener('sync', (event) => {
  event.waitUntil(
    getStoredConfig().then((config) => {
      if (config) setupBackgroundFirestore(config);
    })
  );
});

// Standby for push
self.addEventListener('push', (event) => {
  let title = 'Mensagem KitchenFlow AI';
  let body = 'Novidades no seu painel de entregas.';
  
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
    } catch (e) {
      body = event.data.text() || body;
    }
  }
  
  event.waitUntil(showNotification(title, { body }));
});
