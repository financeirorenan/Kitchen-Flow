import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import {
  saveCourierProfileLocally,
  getCourierProfileLocally,
  addSyncQueueItem,
  getSyncQueueItems,
  syncCourierOfflineData
} from '../utils/courierDB';
import { Order, Courier, User, AdminSettings } from '../types';
import { formatOrderNumber } from '../utils/deduplicate';
import { 
  Bell, 
  X, 
  Bike, 
  Check, 
  Navigation,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Specialized Courier Modular Subcomponents
import { CourierHeader } from './courier/CourierHeader';
import { CourierHomeTab } from './courier/CourierHomeTab';
import { CourierDeliveriesTab } from './courier/CourierDeliveriesTab';
import { CourierEarningsTab } from './courier/CourierEarningsTab';
import { CourierHistoryTab } from './courier/CourierHistoryTab';
import { CourierProfileTab } from './courier/CourierProfileTab';
import { CourierNotificationsTab, CourierNotificationItem } from './courier/CourierNotificationsTab';
import { CourierOrderDetailModal } from './courier/CourierOrderDetailModal';
import { CourierNewOrderAlert } from './courier/CourierNewOrderAlert';
import { CourierBottomNav, CourierTabType } from './courier/CourierBottomNav';

interface CourierAppProps {
  currentUser: User;
  onLogout: () => void;
}

export const CourierApp: React.FC<CourierAppProps> = ({ currentUser, onLogout }) => {
  // Navigation tabs: 'home' | 'deliveries' | 'earnings' | 'history' | 'profile' | 'notifications'
  const [activeTab, setActiveTab] = useState<CourierTabType>('home');
  
  // Realtime state
  const [courierData, setCourierData] = useState<Courier | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Network & Offline Sync state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  
  // Geolocation & GPS state
  const [courierLocation, setCourierLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLocationError, setShowLocationError] = useState(false);

  // Modals and interactive cards
  const [selectedOrderSummary, setSelectedOrderSummary] = useState<Order | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testNotificationTimer, setTestNotificationTimer] = useState<number | null>(null);
  const [notificationsList, setNotificationsList] = useState<CourierNotificationItem[]>([]);

  // Profile editing form state
  const [editingData, setEditingData] = useState({
    name: '',
    phone: '',
    pixKey: '',
    vehicleType: 'moto' as 'bike' | 'moto' | 'car',
    vehiclePlate: '',
    document: '',
    cnh: ''
  });
  const [saving, setSaving] = useState(false);

  // Order tracking refs for detecting new orders
  const prevOrderIdsRef = useRef<string[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);

  // Offline Sync Management
  const refreshSyncCount = async () => {
    try {
      const items = await getSyncQueueItems();
      setPendingSyncCount(items.length);
    } catch (e) {
      console.warn("Could not get sync queue count:", e);
    }
  };

  const triggerIndexedDBSync = async () => {
    if (!navigator.onLine) return;
    try {
      const { successCount } = await syncCourierOfflineData(currentUser.id);
      if (successCount > 0) {
        setToast({
          message: `${successCount} dados salvos offline foram sincronizados com sucesso!`,
          type: 'success'
        });
      }
      refreshSyncCount();
    } catch (e) {
      console.warn("Error running auto-sync:", e);
    }
  };

  useEffect(() => {
    refreshSyncCount();
    const interval = setInterval(refreshSyncCount, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await getCourierProfileLocally(currentUser.id);
        if (cached && !courierData) {
          setCourierData(cached);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Error loading offline profile data:", err);
      }
    };
    loadCached();
  }, [currentUser.id]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerIndexedDBSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setToast({
        message: 'Você está desconectado. Status e localização serão salvos e sincronizados assim que a conexão retornar.',
        type: 'info'
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser.id]);

  // Load tenant settings
  useEffect(() => {
    if (!currentUser?.tenantId) return;
    const settingsRef = doc(db, 'settings', currentUser.tenantId);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAdminSettings(snapshot.data() as AdminSettings);
      }
    }, (error) => {
      console.warn("Error subscribing to tenant settings:", error);
    });
    return () => unsubscribe();
  }, [currentUser?.tenantId]);

  // Web Audio synth for new order sound
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.18);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.14); // A5
      gain2.gain.setValueAtTime(0.18, audioCtx.currentTime + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc2.start(audioCtx.currentTime + 0.14);
      osc2.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Endereço copiado para a área de transferência!', type: 'success' });
    setCopiedAddress(true);
    setTimeout(() => {
      setCopiedAddress(false);
    }, 2000);
  };

  // Push Notifications sync with Service Worker
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const syncServiceWorkerConfig = () => {
    if ('serviceWorker' in navigator && currentUser) {
      navigator.serviceWorker.ready.then((reg) => {
        const sw = reg.active || navigator.serviceWorker.controller;
        if (sw) {
          sw.postMessage({
            type: 'INIT_COURIER_CONFIG',
            userId: currentUser.id,
            tenantId: currentUser.tenantId,
            apiKey: firebaseConfig.apiKey,
            authDomain: firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId,
            appId: firebaseConfig.appId,
            firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
          });
        }
      });
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setToast({ message: 'Seu navegador não suporta notificações.', type: 'error' });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setToast({ message: 'Notificações ativadas com sucesso!', type: 'success' });
        syncServiceWorkerConfig();
      } else if (permission === 'denied') {
        setToast({ message: 'Notificações bloqueadas nas configurações do navegador.', type: 'error' });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const handleTestBackgroundNotification = () => {
    if (!('serviceWorker' in navigator)) {
      setToast({ message: 'Service Worker não suportado neste dispositivo.', type: 'error' });
      return;
    }
    if (Notification.permission !== 'granted') {
      setToast({ message: 'Por favor, conceda permissão de notificação primeiro.', type: 'error' });
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      const sw = reg.active || navigator.serviceWorker.controller;
      if (sw) {
        sw.postMessage({
          type: 'SCHEDULE_TEST_NOTIFICATION',
          delayMs: 5000,
          title: 'Notificação de Teste 🛵',
          body: 'As notificações em segundo plano do KitchenFlow Courier estão 100% ativas!'
        });
        
        setToast({ 
          message: 'Agendado! Minimize o app ou bloqueie a tela imediatamente para ver o alerta.', 
          type: 'success' 
        });

        let countdown = 5;
        setTestNotificationTimer(countdown);
        const interval = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            clearInterval(interval);
            setTestNotificationTimer(null);
          } else {
            setTestNotificationTimer(countdown);
          }
        }, 1000);
      }
    });
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          await navigator.serviceWorker.ready;
          if (currentUser) {
            syncServiceWorkerConfig();
          }
        })
        .catch(err => {
          console.error('Erro ao registrar Service Worker:', err);
        });
    }
  }, [currentUser]);

  // Handle incoming new orders and notifications
  useEffect(() => {
    if (loading) return;

    if (isFirstLoadRef.current) {
      prevOrderIdsRef.current = assignedOrders.map(o => o?.id || '');
      isFirstLoadRef.current = false;
      return;
    }

    const currentIds = assignedOrders.map(o => o?.id || '');
    const newOrders = assignedOrders.filter(order => order?.id && !prevOrderIdsRef.current.includes(order.id) && ['ready', 'delivering'].includes(order.status));

    if (newOrders.length > 0) {
      playNotificationSound();
      const firstNew = newOrders[0];
      setNewOrderAlert(firstNew);

      // Add to internal notifications log
      setNotificationsList(prev => [
        {
          id: `order-${firstNew.id}-${Date.now()}`,
          title: `Nova Entrega #${formatOrderNumber(firstNew)}`,
          message: `Você recebeu um novo pedido para ${firstNew.customerName || 'Cliente'}. Comissão: R$ ${(firstNew.courierEarnings || 0).toFixed(2)}`,
          type: 'order',
          timestamp: new Date(),
          read: false
        },
        ...prev
      ]);

      if (document.hidden || document.visibilityState === 'hidden') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SEND_NOTIFICATION',
            title: `Nova entrega atribuída! #${formatOrderNumber(firstNew)}`,
            body: `Comissão: R$ ${(firstNew.courierEarnings || 0).toFixed(2)}. Clique para abrir!`
          });
        } else if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Nova entrega atribuída! #${formatOrderNumber(firstNew)}`, {
            body: `Comissão: R$ ${(firstNew.courierEarnings || 0).toFixed(2)}. Clique para abrir!`,
            icon: '/icon-192.png'
          });
        }
      }

      prevOrderIdsRef.current = currentIds;
    } else {
      prevOrderIdsRef.current = currentIds;
    }
  }, [assignedOrders, loading]);

  // Firestore Realtime Subscriptions
  useEffect(() => {
    if (!currentUser.id) return;

    const courierDocRef = doc(db, 'couriers', currentUser.id);
    const unsubscribeCourier = onSnapshot(courierDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const fullCourier = { 
          ...data, 
          id: snapshot.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          lastDailyFeeDate: data.lastDailyFeeDate instanceof Timestamp ? data.lastDailyFeeDate.toDate() : data.lastDailyFeeDate 
        } as Courier;

        setCourierData(fullCourier);
        saveCourierProfileLocally(fullCourier);
        setLoading(false);
      } else {
        const createInitialCourier = async () => {
          const newCourier: Courier = {
            id: currentUser.id,
            tenantId: currentUser.tenantId || '',
            name: currentUser.name,
            phone: currentUser.phone || '',
            status: 'offline',
            active: true,
            createdAt: new Date(),
            earnings: 0,
            cashHeld: 0
          };
          try {
            await setDoc(doc(db, 'couriers', currentUser.id), newCourier);
            saveCourierProfileLocally(newCourier);
          } catch (err) {
            setLoading(false);
          }
        };
        createInitialCourier();
      }
    }, (error) => {
      console.error("Error subscribing to courier in Firestore:", error);
      setLoading(false);
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const tId = currentUser.tenantId || '';
    const q = query(
      collection(db, 'orders'),
      where('tenantId', '==', tId),
      where('courierId', '==', currentUser.id),
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );

    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          ...data, 
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          deliveredAt: data.deliveredAt instanceof Timestamp ? data.deliveredAt.toDate() : (data.deliveredAt ? new Date(data.deliveredAt) : undefined)
        } as Order;
      });
      
      const sorted = [...orders].sort((a, b) => {
        if (a.status === 'delivering' && b.status !== 'delivering') return -1;
        if (b.status === 'delivering' && a.status !== 'delivering') return 1;
        
        const posA = a.routePosition ?? 999;
        const posB = b.routePosition ?? 999;
        if (posA !== posB) return posA - posB;
        
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (new Date(a.createdAt).getTime() || 0);
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (new Date(b.createdAt).getTime() || 0);
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      
      setAssignedOrders(sorted);
    }, (error) => {
      console.error("Error subscribing to orders in Firestore:", error);
    });

    // Geolocation Watcher
    let watchId: number;
    if ("geolocation" in navigator && courierData?.status !== 'offline') {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCourierLocation({ latitude: lat, longitude: lng });

          setCourierData(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              currentLatitude: lat,
              currentLongitude: lng,
              updatedAt: new Date()
            };
            saveCourierProfileLocally(updated);
            return updated;
          });

          if (!navigator.onLine) {
            await addSyncQueueItem('location', { currentLatitude: lat, currentLongitude: lng });
            refreshSyncCount();
          } else {
            try {
              await updateDoc(doc(db, 'couriers', currentUser.id), {
                currentLatitude: lat,
                currentLongitude: lng,
                updatedAt: new Date()
              });
            } catch (fsErr) {
              await addSyncQueueItem('location', { currentLatitude: lat, currentLongitude: lng });
              refreshSyncCount();
            }
          }
        },
        (error) => {
          console.warn("Geolocation watch error:", error);
          setShowLocationError(true);
        },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      unsubscribeCourier();
      unsubscribeOrders();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [currentUser.id, currentUser.tenantId, courierData?.status, isOnline]);

  // Sync editing fields
  useEffect(() => {
    if (courierData) {
      setEditingData({
        name: courierData.name || currentUser.name || '',
        phone: courierData.phone || currentUser.phone || '',
        pixKey: courierData.pixKey || '',
        vehicleType: courierData.vehicleType || 'moto',
        vehiclePlate: courierData.vehiclePlate || '',
        cnh: courierData.cnh || '',
        document: courierData.document || ''
      });
    }
  }, [courierData, currentUser]);

  // Toggle Online/Offline Status
  const toggleStatus = async () => {
    if (!courierData) return;
    const newStatus = courierData.status === 'offline' ? 'available' : 'offline';
    setCourierData(prev => prev ? { ...prev, status: newStatus } : null);

    if (!navigator.onLine) {
      const updated = { ...courierData, status: newStatus, updatedAt: new Date() } as Courier;
      await saveCourierProfileLocally(updated);
      await addSyncQueueItem('status', { status: newStatus });
      refreshSyncCount();
      setToast({
        message: `Offline: Você ficou ${newStatus === 'available' ? 'disponível' : 'offline'} localmente. Será sincronizado ao reconectar!`,
        type: 'info'
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'couriers', currentUser.id), {
        status: newStatus,
        updatedAt: new Date()
      });
      const updated = { ...courierData, status: newStatus, updatedAt: new Date() } as Courier;
      await saveCourierProfileLocally(updated);
      setToast({
        message: newStatus === 'available' ? 'Você está online para receber entregas!' : 'Você está offline.',
        type: 'info'
      });
    } catch (err) {
      console.error("Error updating status:", err);
      await addSyncQueueItem('status', { status: newStatus });
      refreshSyncCount();
      setToast({
        message: 'Status atualizado com instabilidade. Salvo para sincronização em segundo plano.',
        type: 'info'
      });
    }
  };

  // Order State Transition (delivering -> delivered)
  const updateOrderStatus = async (order: Order, nextStatus: 'delivering' | 'delivered') => {
    try {
      const updates: any = {
        status: nextStatus,
        updatedAt: new Date()
      };

      if (nextStatus === 'delivering') {
        updates.dispatchedAt = new Date();
      } else if (nextStatus === 'delivered') {
        updates.deliveredAt = new Date();
        
        let totalReceived = order.courierEarnings || 0;
        const isCash = order.paymentMethod === 'dinheiro';
        const cashValue = isCash ? order.total : 0;

        let lastDailyFeeDate = courierData?.lastDailyFeeDate;
        let dailyFeeToAdd = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastFee = lastDailyFeeDate ? new Date(lastDailyFeeDate) : null;
        if (lastFee) lastFee.setHours(0,0,0,0);

        const todayStr = today.toDateString();
        const lastFeeStr = lastFee ? lastFee.toDateString() : '';

        // Daily Fee check
        if (courierData?.dailyFee && lastFeeStr !== todayStr) {
          dailyFeeToAdd = courierData.dailyFee;
          totalReceived += dailyFeeToAdd;
          lastDailyFeeDate = new Date(); 
          
          await addDoc(collection(db, 'financialRecords'), {
             tenantId: currentUser.tenantId,
             type: 'expense',
             amount: dailyFeeToAdd,
             category: 'Diárias',
             description: `Diária do entregador ${currentUser.name}`,
             date: new Date(),
             status: 'pending'
          });
        }

        await updateDoc(doc(db, 'couriers', currentUser.id), {
          earnings: (courierData?.earnings || 0) + totalReceived,
          cashHeld: (courierData?.cashHeld || 0) + cashValue,
          lastDailyFeeDate: lastDailyFeeDate || null,
          updatedAt: new Date()
        });

        if ((order.courierEarnings || 0) > 0) {
           await addDoc(collection(db, 'financialRecords'), {
             tenantId: currentUser.tenantId,
             type: 'expense',
             amount: order.courierEarnings || 0,
             category: 'Entregas',
             description: `Comissão entrega pedido #${formatOrderNumber(order)} - ${currentUser.name}`,
             date: new Date(),
             status: 'pending' 
           });
        }

        // Add to internal notifications log
        setNotificationsList(prev => [
          {
            id: `delivered-${order.id}-${Date.now()}`,
            title: `Entrega Concluída #${formatOrderNumber(order)}`,
            message: `Você finalizou com sucesso a entrega. +R$ ${(order.courierEarnings || 0).toFixed(2)} adicionados aos seus ganhos!`,
            type: 'delivery',
            timestamp: new Date(),
            read: false
          },
          ...prev
        ]);
      }

      await updateDoc(doc(db, 'orders', order.id), updates);
      setToast({ 
        message: nextStatus === 'delivering' ? 'Entrega iniciada! Vá até o destino.' : 'Entrega concluída com sucesso! Parabéns!', 
        type: 'success' 
      });
    } catch (err) {
      console.error("Error updating order status:", err);
      setToast({ message: 'Erro ao atualizar status da entrega.', type: 'error' });
    }
  };

  // Open in GPS Application (Google Maps / Waze / Apple Maps / Geo)
  const openExternalNavigation = (address: string, app: 'google' | 'waze' | 'geo' | 'apple' = 'google') => {
    const encoded = encodeURIComponent(address);
    let url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    if (app === 'waze') {
      url = `https://waze.com/ul?q=${encoded}&navigate=yes`;
    } else if (app === 'apple') {
      url = `https://maps.apple.com/?daddr=${encoded}&dirflg=d`;
    }
    window.open(url, '_blank');
  };

  // Multi-route on Google Maps
  const openMultiRoute = () => {
    const addresses = activeDeliveries
      .map(o => o.customerAddress)
      .filter(Boolean) as string[];

    if (addresses.length === 0) return;

    if (addresses.length === 1) {
      openExternalNavigation(addresses[0], 'google');
      return;
    }

    const origin = encodeURIComponent(adminSettings?.address || 'Restaurante');
    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses.slice(0, -1).map(a => encodeURIComponent(a)).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
    window.open(url, '_blank');
  };

  // Cash Held Settlement with the Physical Store
  const handleSettleCash = async () => {
    if (!courierData) return;
    if (!window.confirm(`Confirmar devolução de R$ ${courierData.cashHeld?.toFixed(2)} ao caixa do estabelecimento?`)) return;

    try {
      const cashToSettle = courierData.cashHeld || 0;
      const unsettledOrders = assignedOrders.filter(o => o.status === 'delivered' && !o.isSettled);
      const totalEarningsToSettle = unsettledOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);

      for (const order of unsettledOrders) {
        try {
          const targetDocId = order.docId || order.id;
          if (targetDocId) {
            await updateDoc(doc(db, 'orders', targetDocId), { 
              isSettled: true, 
              status: 'finished',
              updatedAt: new Date() 
            });
          }
        } catch (e) {
          console.error(`Erro ao atualizar pedido ${order.id} no acerto:`, e);
        }
      }

      await updateDoc(doc(db, 'couriers', courierData.id), {
        cashHeld: 0,
        earnings: Math.max(0, (courierData.earnings || 0) - totalEarningsToSettle),
        updatedAt: new Date()
      });

      await addDoc(collection(db, 'financialRecords'), {
        tenantId: courierData.tenantId,
        type: 'income',
        amount: cashToSettle,
        category: 'Recebimento Motoboy',
        description: `Repasse Entregador (Dinheiro): ${courierData.name}`,
        date: new Date(),
        status: 'paid'
      });

      if (totalEarningsToSettle > 0) {
        await addDoc(collection(db, 'financialRecords'), {
          tenantId: courierData.tenantId,
          type: 'expense',
          amount: totalEarningsToSettle,
          category: 'Entregadores',
          description: `Comissões pagas no acerto: ${courierData.name}`,
          date: new Date(),
          status: 'paid'
        });
      }

      setToast({ message: 'Acerto de caixa efetuado com sucesso e integrado ao sistema!', type: 'success' });
    } catch (err) {
      console.error('Erro ao fazer acerto:', err);
      setToast({ message: 'Erro ao processar acerto de dinheiro.', type: 'error' });
    }
  };

  // Photo Upload
  const handlePhotoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoData = reader.result as string;
        try {
          await updateDoc(doc(db, 'users', currentUser.id), { photoURL: photoData, updatedAt: new Date() });
          await updateDoc(doc(db, 'couriers', currentUser.id), { photoURL: photoData, updatedAt: new Date() });
          setCourierData(prev => prev ? { ...prev, photoURL: photoData } : null);
          setToast({ message: 'Foto de perfil atualizada com sucesso!', type: 'success' });
        } catch (err) {
          console.error("Error updating photo:", err);
          setToast({ message: 'Erro ao salvar foto de perfil.', type: 'error' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Profile Details
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        name: editingData.name,
        phone: editingData.phone,
        updatedAt: new Date()
      });

      const courierRef = doc(db, 'couriers', currentUser.id);
      await updateDoc(courierRef, {
        name: editingData.name,
        phone: editingData.phone,
        pixKey: editingData.pixKey,
        vehicleType: editingData.vehicleType,
        vehiclePlate: editingData.vehiclePlate,
        document: editingData.document,
        cnh: editingData.cnh,
        updatedAt: new Date()
      });

      setToast({ message: 'Seu perfil foi atualizado com sucesso!', type: 'success' });
    } catch (err) {
      console.error("Error saving profile:", err);
      setToast({ message: 'Erro ao salvar alterações no perfil.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const activeDeliveries = useMemo(() => assignedOrders.filter(o => ['ready', 'delivering'].includes(o.status)), [assignedOrders]);
  const unreadNotificationsCount = useMemo(() => notificationsList.filter(n => !n.read).length, [notificationsList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-16 h-16 bg-slate-900 border-2 border-orange-500 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-500/20 animate-bounce mb-4">
          <Bike size={32} className="text-orange-400" />
        </div>
        <h2 className="text-base font-black uppercase tracking-wider text-white">Carregando Painel de Entregas</h2>
        <p className="text-xs text-slate-400 mt-1 animate-pulse">Sincronizando rotas e informações em tempo real...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Background radial atmosphere */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-80 bg-gradient-to-b from-orange-500/10 via-slate-900/50 to-transparent pointer-events-none -z-10 blur-2xl" />

      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-4 left-4 right-4 max-w-md mx-auto z-[9999] bg-slate-900/95 border border-orange-500/50 rounded-2xl shadow-2xl p-4 flex items-start gap-3 backdrop-blur-md"
          >
            <div className="p-2 bg-brand-primary text-white rounded-xl shrink-0 shadow-md">
              <Bell size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Aviso da Rota</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button 
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col px-3 sm:px-4">
        {/* Header */}
        <CourierHeader 
          currentUser={currentUser}
          courierData={courierData}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          onProfileClick={() => setActiveTab('profile')}
          onLogout={onLogout}
          onToggleStatus={toggleStatus}
          onSyncNow={triggerIndexedDBSync}
        />

        {/* Content Tabs Switcher */}
        <main className="flex-1 mt-2">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CourierHomeTab 
                  courierData={courierData}
                  activeDeliveries={activeDeliveries}
                  assignedOrders={assignedOrders}
                  adminSettings={adminSettings}
                  courierLocation={courierLocation}
                  copiedAddress={copiedAddress}
                  onToggleStatus={toggleStatus}
                  onUpdateOrderStatus={updateOrderStatus}
                  onOpenExternalNavigation={openExternalNavigation}
                  onCopyAddress={copyToClipboard}
                  onSelectOrderSummary={(order) => setSelectedOrderSummary(order)}
                  onGoToDeliveries={() => setActiveTab('deliveries')}
                  onGoToEarnings={() => setActiveTab('earnings')}
                />
              </motion.div>
            )}

            {activeTab === 'deliveries' && (
              <motion.div
                key="deliveries"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CourierDeliveriesTab 
                  activeDeliveries={activeDeliveries}
                  adminSettings={adminSettings}
                  courierLocation={courierLocation}
                  copiedAddress={copiedAddress}
                  onUpdateOrderStatus={updateOrderStatus}
                  onOpenExternalNavigation={openExternalNavigation}
                  onCopyAddress={copyToClipboard}
                  onSelectOrderSummary={(order) => setSelectedOrderSummary(order)}
                  onOpenMultiRoute={openMultiRoute}
                />
              </motion.div>
            )}

            {activeTab === 'earnings' && (
              <motion.div
                key="earnings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CourierEarningsTab 
                  courierData={courierData}
                  assignedOrders={assignedOrders}
                  onSelectOrderSummary={(order) => setSelectedOrderSummary(order)}
                  onSettleCash={handleSettleCash}
                />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CourierHistoryTab 
                  assignedOrders={assignedOrders}
                  onSelectOrderSummary={(order) => setSelectedOrderSummary(order)}
                />
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CourierNotificationsTab 
                  notifications={notificationsList}
                  onMarkAllAsRead={() => {
                    setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
                    setToast({ message: 'Todas as notificações foram marcadas como lidas.', type: 'info' });
                  }}
                  onClearNotifications={() => {
                    setNotificationsList([]);
                    setToast({ message: 'Histórico de notificações limpo.', type: 'info' });
                  }}
                  onRequestPermission={requestNotificationPermission}
                  notificationPermission={notificationPermission}
                />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CourierProfileTab 
                  currentUser={currentUser}
                  courierData={courierData}
                  editingData={editingData}
                  saving={saving}
                  notificationPermission={notificationPermission}
                  testNotificationTimer={testNotificationTimer}
                  onEditingDataChange={setEditingData}
                  onSaveProfile={handleSaveProfile}
                  onRequestNotificationPermission={requestNotificationPermission}
                  onTestBackgroundNotification={handleTestBackgroundNotification}
                  onUploadPhoto={handlePhotoUploadChange}
                  onLogout={onLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Bottom Navigation */}
      <CourierBottomNav 
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        activeDeliveriesCount={activeDeliveries.length}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Modal: Completed / Active Order Details */}
      <CourierOrderDetailModal 
        order={selectedOrderSummary}
        onClose={() => setSelectedOrderSummary(null)}
        onOpenRoute={(addr) => openExternalNavigation(addr, 'google')}
        onCopyAddress={copyToClipboard}
        copiedAddress={copiedAddress}
      />

      {/* Alert / Modal: Incoming New Assigned Order */}
      <CourierNewOrderAlert 
        order={newOrderAlert}
        onAccept={(order) => {
          setNewOrderAlert(null);
          setActiveTab('home');
          setToast({ message: `Corrida do pedido #${formatOrderNumber(order)} aceita com sucesso!`, type: 'success' });
        }}
        onDismiss={() => setNewOrderAlert(null)}
      />
    </div>
  );
};

export default CourierApp;
