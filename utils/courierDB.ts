import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Courier } from '../types';

const DB_NAME = 'KitchenFlowAICourierDB';
const DB_VERSION = 1;
const COURIER_STORE = 'courier_data';
const SYNC_QUEUE_STORE = 'sync_queue';

export function openCourierDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(COURIER_STORE)) {
        dbInstance.createObjectStore(COURIER_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        dbInstance.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Salva o perfil completo do entregador localmente
export async function saveCourierProfileLocally(courier: Courier): Promise<void> {
  try {
    const dbInstance = await openCourierDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(COURIER_STORE, 'readwrite');
      const store = tx.objectStore(COURIER_STORE);
      
      // Converte objetos Date em string ou timestamp simples para evitar erro de clonagem estruturada no IDB
      const serialized = {
        ...courier,
        createdAt: courier.createdAt instanceof Date ? courier.createdAt.toISOString() : courier.createdAt,
        updatedAt: courier.updatedAt instanceof Date ? courier.updatedAt.toISOString() : courier.updatedAt,
        lastDailyFeeDate: courier.lastDailyFeeDate instanceof Date ? courier.lastDailyFeeDate.toISOString() : courier.lastDailyFeeDate,
      };

      store.put(serialized);
      tx.oncomplete = () => {
        dbInstance.close();
        resolve();
      };
      tx.onerror = () => {
        dbInstance.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn("[IndexedDB] Não foi possível salvar perfil localmente:", err);
  }
}

// Recupera o perfil completo do entregador localmente em caso de offline
export async function getCourierProfileLocally(courierId: string): Promise<Courier | null> {
  try {
    const dbInstance = await openCourierDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(COURIER_STORE, 'readonly');
      const store = tx.objectStore(COURIER_STORE);
      const req = store.get(courierId);
      req.onsuccess = () => {
        dbInstance.close();
        if (req.result) {
          const raw = req.result;
          resolve({
            ...raw,
            createdAt: raw.createdAt ? new Date(raw.createdAt) : undefined,
            updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
            lastDailyFeeDate: raw.lastDailyFeeDate ? new Date(raw.lastDailyFeeDate) : null,
          } as Courier);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        dbInstance.close();
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn("[IndexedDB] Erro ao recuperar perfil localmente:", err);
    return null;
  }
}

// Adiciona uma atualização na fila de sincronização (status ou localização)
export async function addSyncQueueItem(type: 'status' | 'location', payload: any): Promise<void> {
  try {
    const dbInstance = await openCourierDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      store.add({
        type,
        payload,
        timestamp: Date.now()
      });
      tx.oncomplete = () => {
        dbInstance.close();
        resolve();
      };
      tx.onerror = () => {
        dbInstance.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn("[IndexedDB] Erro ao enfileirar atualização offline:", err);
  }
}

// Recupera todos os itens pendentes na fila de sincronização
export async function getSyncQueueItems(): Promise<any[]> {
  try {
    const dbInstance = await openCourierDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(SYNC_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        dbInstance.close();
        resolve(req.result || []);
      };
      req.onerror = () => {
        dbInstance.close();
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn("[IndexedDB] Erro ao ler fila de sincronização:", err);
    return [];
  }
}

// Remove um item específico da fila de sincronização por ID
export async function removeSyncQueueItem(id: number): Promise<void> {
  try {
    const dbInstance = await openCourierDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      store.delete(id);
      tx.oncomplete = () => {
        dbInstance.close();
        resolve();
      };
      tx.onerror = () => {
        dbInstance.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao remover item ${id} da fila:`, err);
  }
}

// Limpa toda a fila de itens duplicados de localização para otimizar, deixando apenas o mais recente se houver muitos
export async function optimizeLocationQueue(): Promise<void> {
  const items = await getSyncQueueItems();
  if (items.length <= 1) return;

  const locations = items.filter(i => i.type === 'location');
  if (locations.length <= 1) return;

  // Encontra o mais recente e remove os outros
  const newestLocation = locations.reduce((prev, current) => (prev.timestamp > current.timestamp) ? prev : current);
  
  for (const item of locations) {
    if (item.id && item.id !== newestLocation.id) {
      await removeSyncQueueItem(item.id);
    }
  }
}

// Sincroniza dados acumulados com o Firestore
export async function syncCourierOfflineData(courierId: string): Promise<{ successCount: number; failedCount: number }> {
  if (!navigator.onLine) {
    return { successCount: 0, failedCount: 0 };
  }

  // Otimiza enviando apenas a localização mais recente e reduzindo tráfego
  await optimizeLocationQueue();

  const items = await getSyncQueueItems();
  if (items.length === 0) {
    return { successCount: 0, failedCount: 0 };
  }

  let successCount = 0;
  let failedCount = 0;
  const courierRef = doc(db, 'couriers', courierId);

  for (const item of items) {
    try {
      if (item.type === 'status') {
        await updateDoc(courierRef, {
          status: item.payload.status,
          updatedAt: new Date(item.timestamp)
        });
      } else if (item.type === 'location') {
        await updateDoc(courierRef, {
          currentLatitude: item.payload.currentLatitude,
          currentLongitude: item.payload.currentLongitude,
          updatedAt: new Date(item.timestamp)
        });
      }
      if (item.id) {
        await removeSyncQueueItem(item.id);
      }
      successCount++;
    } catch (err) {
      console.error("[IndexedDB Sync] Falha ao sincronizar item offline:", item, err);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}
