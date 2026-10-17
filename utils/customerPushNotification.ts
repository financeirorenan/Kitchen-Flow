/**
 * Customer PWA Push Notifications & Order Status Tracker
 * Handles browser notification permissions, Service Worker messaging,
 * audio chime alerts, and status transition notifications for customers.
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks if browser and device support native notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns current permission status
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Registers the PWA Service Worker for customer background notifications
 */
export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[PWA Notification] Failed to register service worker:', err);
    return null;
  }
}

/**
 * Plays a pleasant double-tone notification chime using Web Audio API
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First high tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second higher tone (cheerful chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio might be blocked by browser policy until interaction
  }
}

/**
 * Requests notification permission from customer and triggers a welcome push
 */
export async function requestCustomerNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        localStorage.setItem('pwa_push_enabled', 'true');
      } catch {}

      // Play audio confirmation
      playNotificationChime();

      // Show native welcome notification
      await triggerNativeNotification(
        '🔔 Notificações Ativadas!',
        {
          body: 'Você receberá alertas no seu celular sempre que o status do seu pedido for atualizado!',
          tag: 'welcome-notification',
          url: '/marketplace?nav=orders'
        }
      );
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[PWA Notification] Error requesting permission:', err);
    return false;
  }
}

/**
 * Sends a native system notification via Service Worker or Notification API
 */
export async function triggerNativeNotification(
  title: string,
  options: {
    body: string;
    tag?: string;
    icon?: string;
    badge?: string;
    url?: string;
    vibrate?: number[];
  }
): Promise<boolean> {
  if (getNotificationPermission() !== 'granted') {
    return false;
  }

  const defaultIcon = '/icon-192.png';
  const defaultBadge = '/icon-192.png';
  const defaultVibrate = [200, 100, 200];
  const targetUrl = options.url || '/marketplace?nav=orders';

  // Strategy 1: Through Service Worker Registration (Most reliable on Android & iOS PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body: options.body,
          icon: options.icon || defaultIcon,
          badge: options.badge || defaultBadge,
          tag: options.tag,
          vibrate: options.vibrate || defaultVibrate,
          data: { url: targetUrl }
        } as any);
        return true;
      }
    } catch (e) {
      console.warn('[PWA Notification] showNotification via reg failed, falling back:', e);
    }
  }

  // Strategy 2: Via Service Worker postMessage
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SEND_NOTIFICATION',
        title,
        body: options.body,
        icon: options.icon || defaultIcon,
        badge: options.badge || defaultBadge,
        tag: options.tag,
        vibrate: options.vibrate || defaultVibrate,
        url: targetUrl
      });
      return true;
    } catch (e) {
      console.warn('[PWA Notification] postMessage failed, falling back:', e);
    }
  }

  // Strategy 3: Standard Notification constructor (Desktop/Web fallback)
  try {
    new Notification(title, {
      body: options.body,
      icon: options.icon || defaultIcon,
      badge: options.badge || defaultBadge,
      tag: options.tag,
      data: { url: targetUrl }
    });
    return true;
  } catch (e) {
    console.warn('[PWA Notification] Standard constructor failed:', e);
    return false;
  }
}

/**
 * Sends a native status update push notification for an order
 */
export async function sendOrderStatusPushNotification(
  orderId: string,
  status: string,
  storeName?: string
): Promise<boolean> {
  const shortId = orderId ? orderId.slice(-4).toUpperCase() : '';
  const storePrefix = storeName ? `${storeName}: ` : '';

  let title = '';
  let body = '';

  switch (status) {
    case 'pending':
      title = `📋 Pedido #${shortId} Recebido!`;
      body = `${storePrefix}Seu pedido foi enviado com sucesso. Aguardando confirmação do restaurante.`;
      break;
    case 'preparing':
      title = `👨‍🍳 Pedido #${shortId} em Preparo!`;
      body = `${storePrefix}O chef começou a preparar seus pratos com carinho!`;
      break;
    case 'ready':
      title = `✨ Pedido #${shortId} Pronto!`;
      body = `${storePrefix}Seu pedido está pronto para entrega ou retirada no balcão!`;
      break;
    case 'delivering':
    case 'out_for_delivery':
      title = `🛵 Pedido #${shortId} a Caminho!`;
      body = `${storePrefix}O entregador acabou de sair com sua refeição! Fique atento(a).`;
      break;
    case 'delivered':
      title = `🎉 Pedido #${shortId} Entregue!`;
      body = `${storePrefix}Seu pedido foi entregue com sucesso! Tenha uma excelente refeição.`;
      break;
    case 'cancelled':
      title = `❌ Pedido #${shortId} Cancelado`;
      body = `${storePrefix}Seu pedido foi cancelado pelo restaurante.`;
      break;
    default:
      return false;
  }

  playNotificationChime();

  return await triggerNativeNotification(title, {
    body,
    tag: `order-status-${orderId}-${status}`,
    url: '/marketplace?nav=orders'
  });
}

// In-memory cache of last notified status per order
const lastNotifiedStatusMap = new Map<string, string>();

/**
 * Tracks order status transitions and sends push notifications whenever a change occurs
 */
export function trackAndNotifyOrderStatus(
  orders: Array<{ id: string; status: string; tenantId?: string }>,
  storeNameMap?: Record<string, string>
): void {
  if (getNotificationPermission() !== 'granted' || !orders || orders.length === 0) {
    return;
  }

  orders.forEach((order) => {
    if (!order.id || !order.status) return;

    const currentStatus = order.status;
    const previousStatus = lastNotifiedStatusMap.get(order.id);

    // If we haven't seen this order yet, record its initial status
    if (!previousStatus) {
      lastNotifiedStatusMap.set(order.id, currentStatus);
      return;
    }

    // Status changed!
    if (previousStatus !== currentStatus) {
      lastNotifiedStatusMap.set(order.id, currentStatus);
      const storeName = order.tenantId && storeNameMap ? storeNameMap[order.tenantId] : undefined;
      sendOrderStatusPushNotification(order.id, currentStatus, storeName);
    }
  });
}
