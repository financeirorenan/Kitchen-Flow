import { db } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { localDb } from './db';
import { Order, OrderStatus, OrderItem, PaymentMethod } from '../types';

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'ORDER_PERSISTED'
  | 'ORDER_UPDATED'
  | 'ORDER_ITEM_ADDED'
  | 'ORDER_ITEM_REMOVED'
  | 'ORDER_SENT_TO_KITCHEN'
  | 'ORDER_STATUS_CHANGED'
  | 'KITCHEN_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_COMPLETED'
  | 'TABLE_OPENED'
  | 'TABLE_UPDATED'
  | 'TABLE_CLOSED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'KDS_EVENT_RECEIVED'
  | 'KDS_ORDER_RENDERED';

export interface DomainEvent {
  id: string;
  event: OrderEventType;
  tenantId: string;
  storeId: string;
  orderId?: string;
  tableNumber?: number | string;
  userId?: string;
  userName?: string;
  userRole?: string;
  source: 'pos' | 'table' | 'kds' | 'delivery' | 'digital_menu' | 'marketplace' | 'admin' | string;
  payload?: any;
  timestamp: string;
  version: number;
}

// Canonical Tenant & Store ID Resolver
// Guarantees that Caixa, KDS, Garçom, and Salão ALWAYS use the exact same tenantId and storeId!
export const getCanonicalTenantId = (
  currentUserData?: any,
  viewingTenantId?: string | null,
  tenantData?: any
): string => {
  // 1. Explicit viewing tenant (Admin Support / Multi-Tenant selector)
  if (viewingTenantId && viewingTenantId.trim()) {
    return viewingTenantId.trim();
  }

  // 2. User's assigned tenant
  if (currentUserData?.tenantId && currentUserData.tenantId !== 'GLOBAL' && currentUserData.tenantId.trim()) {
    return currentUserData.tenantId.trim();
  }

  // 3. Loaded tenant data
  if (tenantData?.id && tenantData.id.trim()) {
    return tenantData.id.trim();
  }

  // 4. Cached tenant from localStorage
  try {
    const cachedTenant = localStorage.getItem('kitchenflow_cached_tenant_data');
    if (cachedTenant) {
      const parsed = JSON.parse(cachedTenant);
      if (parsed?.id && parsed.id.trim()) return parsed.id.trim();
    }
    const cachedUser = localStorage.getItem('kitchenflow_cached_user');
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      if (parsed?.tenantId && parsed.tenantId !== 'GLOBAL' && parsed.tenantId.trim()) {
        return parsed.tenantId.trim();
      }
    }
  } catch (e) {
    console.warn("[OrderService] Erro ao ler tenant do cache:", e);
  }

  // 5. Default production merchant ID
  return 'lojista';
};

export const getCanonicalStoreId = (tenantId: string, storeId?: string | null): string => {
  if (storeId && storeId.trim()) return storeId.trim();
  return `${tenantId}_unit01`;
};

// Cross-tab and local Domain Event Bus
const eventListeners = new Set<(event: DomainEvent) => void>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('kitchenflow_realtime_orders');
    broadcastChannel.onmessage = (msg) => {
      if (msg && msg.data) {
        notifyInternalListeners(msg.data as DomainEvent, false);
      }
    };
  } catch (err) {
    console.warn("[OrderService] BroadcastChannel não suportado ou erro:", err);
  }
}

const notifyInternalListeners = (event: DomainEvent, shouldBroadcast: boolean = true) => {
  eventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (e) {
      console.error("[OrderService] Erro no listener de evento de domínio:", e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kitchenflow:order-event', { detail: event }));
  }

  if (shouldBroadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch (e) {
      console.warn("[OrderService] Falha ao transmitir via BroadcastChannel:", e);
    }
  }
};

export const subscribeToDomainEvents = (callback: (event: DomainEvent) => void): (() => void) => {
  eventListeners.add(callback);
  return () => {
    eventListeners.delete(callback);
  };
};

export const logDiagnostic = (phase: string, data: Record<string, any>) => {
  const ts = new Date().toISOString();
  console.log(`%c[KITCHENFLOW DIAGNOSTIC] [${phase}] [${ts}]`, 'color: #4f46e5; font-weight: bold;', data);
};

export const publishDomainEvent = (
  eventType: OrderEventType,
  data: {
    tenantId: string;
    storeId?: string;
    orderId?: string;
    tableNumber?: number | string;
    userId?: string;
    userName?: string;
    userRole?: string;
    source: string;
    payload?: any;
    version?: number;
  }
): DomainEvent => {
  const tenantId = data.tenantId || 'lojista';
  const storeId = getCanonicalStoreId(tenantId, data.storeId);
  const event: DomainEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    event: eventType,
    tenantId,
    storeId,
    orderId: data.orderId,
    tableNumber: data.tableNumber,
    userId: data.userId,
    userName: data.userName,
    userRole: data.userRole,
    source: data.source || 'pos',
    payload: data.payload,
    timestamp: new Date().toISOString(),
    version: data.version || 1
  };

  logDiagnostic(eventType, {
    tenant_id: event.tenantId,
    store_id: event.storeId,
    order_id: event.orderId,
    user_id: event.userId,
    source: event.source,
    timestamp: event.timestamp,
    version: event.version
  });

  notifyInternalListeners(event, true);
  return event;
};

// Utilities to clean objects for Firestore (removes undefined)
export const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

  const clean: any = {};
  Object.keys(obj).forEach(k => {
    const val = obj[k];
    if (val !== undefined) {
      clean[k] = sanitizeForFirestore(val);
    }
  });
  return clean;
};

// Central Order Creation & Dispatch Service
export interface CreateOrderParams {
  tableNumber?: number | string;
  type: 'table' | 'delivery' | 'takeout';
  status?: OrderStatus;
  kitchenStatus?: 'pending' | 'preparing' | 'ready' | 'delivered';
  paymentStatus?: 'pending' | 'paid';
  productionStatus?: 'pending' | 'in_production' | 'ready';
  items: OrderItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryFee?: number;
  customerId?: string;
  source: 'pos' | 'table' | 'garcom' | 'delivery' | 'digital_menu' | 'marketplace' | string;
  paymentMethod?: PaymentMethod;
  tenantId: string;
  storeId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  existingOrderId?: string;
  counterId?: number | string;
  batchNumber?: number;
}

export const syncOrderToBackend = async (order: Order): Promise<void> => {
  const canonicalTenant = order.tenantId || 'lojista';
  const canonicalStore = getCanonicalStoreId(canonicalTenant, order.storeId);
  
  const standardizedOrder: Order = {
    ...order,
    tenantId: canonicalTenant,
    storeId: canonicalStore,
    status: order.status || 'preparing',
    kitchenStatus: order.kitchenStatus || (order.status === 'ready' ? 'ready' : (order.status === 'delivered' || order.status === 'finished' ? 'delivered' : 'preparing')),
    paymentStatus: order.paymentStatus || 'pending',
    updatedAt: new Date()
  };

  const cleanData = sanitizeForFirestore(standardizedOrder);

  // 1. Local Dexie DB persistence for offline-first resilience
  try {
    await localDb.orders.put(standardizedOrder);
  } catch (err) {
    console.warn("[OrderService] Erro ao persistir localDb:", err);
  }

  // 2. Firestore Cloud Persistence
  if (canonicalTenant) {
    try {
      const docRef = doc(db, 'orders', standardizedOrder.id);
      await setDoc(docRef, cleanData, { merge: true });
      logDiagnostic('ORDER_PERSISTED', {
        tenant_id: canonicalTenant,
        store_id: canonicalStore,
        order_id: standardizedOrder.id,
        status: standardizedOrder.status,
        kitchen_status: standardizedOrder.kitchenStatus,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("[OrderService] Erro ao sincronizar pedido com o Firestore:", err);
      throw err;
    }
  }
};

/**
 * Cria ou atualiza atomicamente um pedido no backend (Firestore + Dexie + Event Bus)
 * Garante consistência entre orders e diningTables, disparo de eventos e logs de auditoria.
 */
export const createOrUpdateOrderAtBackend = async (
  params: CreateOrderParams
): Promise<Order> => {
  const now = new Date();
  const canonicalTenant = params.tenantId || 'lojista';
  const canonicalStore = getCanonicalStoreId(canonicalTenant, params.storeId);
  
  const orderId = params.existingOrderId || `KDS-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  const initialStatus: OrderStatus = params.status || 'preparing';
  const initialKitchenStatus = params.kitchenStatus || (initialStatus === 'ready' ? 'ready' : 'preparing');

  const preparedItems = params.items.map(i => ({
    ...i,
    sentToKitchen: true,
    isNew: false,
    batchNumber: i.batchNumber || params.batchNumber || 1
  }));

  const orderData: Order = {
    id: orderId,
    tenantId: canonicalTenant,
    storeId: canonicalStore,
    tableNumber: params.tableNumber,
    type: params.type,
    status: initialStatus,
    kitchenStatus: initialKitchenStatus,
    paymentStatus: params.paymentStatus || 'pending',
    items: preparedItems,
    total: params.total,
    deliveryFee: params.deliveryFee || 0,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerAddress: params.customerAddress,
    customerId: params.customerId,
    source: params.source || 'pos',
    paymentMethod: params.paymentMethod,
    isManual: true,
    isSettled: false,
    currentBatch: params.batchNumber || 1,
    createdAt: now,
    updatedAt: now,
    version: 1
  };

  logDiagnostic('ORDER_CREATED', {
    tenant_id: canonicalTenant,
    store_id: canonicalStore,
    order_id: orderId,
    table_number: params.tableNumber,
    type: params.type,
    status: orderData.status,
    kitchen_status: orderData.kitchenStatus,
    items_count: preparedItems.length,
    total: orderData.total,
    source: orderData.source,
    timestamp: now.toISOString()
  });

  // 1. Persistência Offline-First Local
  try {
    await localDb.orders.put(orderData);
  } catch (err) {
    console.warn("[OrderService] Erro ao persistir pedido localmente:", err);
  }

  // 2. Persistência Atômica no Firestore
  try {
    const batch = writeBatch(db);
    const orderDocRef = doc(db, 'orders', orderId);
    batch.set(orderDocRef, sanitizeForFirestore({
      ...orderData,
      createdAt: now,
      updatedAt: now
    }), { merge: true });

    // Se for mesa física, atualiza atomicamente o status e o currentOrderId da mesa
    if (params.type === 'table' && params.tableNumber !== undefined) {
      const tableQuery = query(
        collection(db, 'diningTables'),
        where('tenantId', '==', canonicalTenant)
      );
      const tableSnap = await getDocs(tableQuery);
      const matchedDoc = tableSnap.docs.find(d => {
        const dData = d.data();
        return String(dData.number) === String(params.tableNumber) || String(dData.id) === String(params.tableNumber);
      });

      if (matchedDoc) {
        batch.update(matchedDoc.ref, sanitizeForFirestore({
          currentOrderId: orderId,
          status: 'occupied',
          items: preparedItems,
          total: params.total,
          updatedAt: now
        }));
      }
    }

    await batch.commit();

    logDiagnostic('ORDER_PERSISTED', {
      tenant_id: canonicalTenant,
      store_id: canonicalStore,
      order_id: orderId,
      status: orderData.status,
      kitchen_status: orderData.kitchenStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("[OrderService] Erro ao persistir atomicamente no Firestore:", err);
  }

  // 3. Disparo do Evento de Domínio
  publishDomainEvent('ORDER_CREATED', {
    tenantId: canonicalTenant,
    storeId: canonicalStore,
    orderId: orderId,
    tableNumber: params.tableNumber,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    source: params.source,
    payload: {
      orderId,
      status: orderData.status,
      kitchenStatus: orderData.kitchenStatus,
      total: orderData.total,
      itemsCount: preparedItems.length
    }
  });

  return orderData;
};

/**
 * Assina pedidos em tempo real diretamente do Firestore + Cache Offline
 * Ideal para KDS, Garçom e Caixa
 */
export const subscribeToOrdersRealtime = (
  tenantId: string,
  storeId: string,
  callbacks: {
    onOrdersUpdated: (orders: Order[]) => void;
    onError?: (err: any) => void;
  }
): (() => void) => {
  const canonicalTenant = tenantId || 'lojista';
  const canonicalStore = getCanonicalStoreId(canonicalTenant, storeId);

  // 1. Carregar estado inicial do Dexie para renderização instantânea offline
  localDb.orders.toArray().then(localOrders => {
    const tenantOrders = localOrders.filter(o => 
      !o.tenantId || o.tenantId === canonicalTenant || o.tenantId === 'lojista'
    );
    if (tenantOrders.length > 0) {
      callbacks.onOrdersUpdated(tenantOrders as Order[]);
    }
  }).catch(e => console.warn("[OrderService] Erro ao ler Dexie inicial:", e));

  // 2. Ouvinte Firestore em tempo real
  const q = query(
    collection(db, 'orders'),
    where('tenantId', '==', canonicalTenant),
    limit(150)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date());
      return {
        ...data,
        id: doc.id,
        docId: doc.id,
        createdAt,
        updatedAt
      } as Order;
    });

    logDiagnostic('KDS_EVENT_RECEIVED', {
      tenant_id: canonicalTenant,
      store_id: canonicalStore,
      received_orders_count: orders.length,
      timestamp: new Date().toISOString()
    });

    callbacks.onOrdersUpdated(orders);
  }, (err) => {
    console.error("[OrderService] Erro no listener realtime de pedidos:", err);
    if (callbacks.onError) callbacks.onError(err);
  });

  return unsubscribe;
};
