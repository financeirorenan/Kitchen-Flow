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
  Bike, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Power, 
  Navigation,
  Phone,
  Package,
  ChevronRight,
  AlertCircle,
  UserCircle,
  TrendingUp,
  Wallet,
  ArrowRight,
  Map as MapIcon,
  ShoppingBag,
  LogOut,
  Bell,
  Camera,
  X,
  Check,
  Compass,
  Copy,
  Calendar,
  History,
  Activity,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Info,
  CreditCard,
  ShieldAlert,
  Star,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Zap,
  CheckCircle,
  BarChart2,
  CalendarDays,
  Gauge,
  Timer,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { maskPhone } from '../utils/masks';
import { CourierNavigation } from './CourierNavigation';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

// Componente auxiliar para renderizar uma Polyline animada com efeito de fluxo (marching ants)
interface AnimatedPolylineProps {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  color?: string;
  weight?: number;
}

const AnimatedRoutePolyline: React.FC<AnimatedPolylineProps> = ({
  origin,
  destination,
  color = '#EA580C',
  weight = 3,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const path = [origin, destination];

    // Linha de fundo translúcida para representar a rota completa
    const baseLine = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.2,
      strokeWeight: weight,
      map: map,
    });

    // Linha de primeiro plano com símbolos pontilhados em constante movimento
    const activeLine = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.0, // invisível para mostrar apenas os pontos se movendo
      strokeWeight: weight + 1,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeColor: color,
            strokeOpacity: 1.0,
            scale: 2.5,
          },
          offset: '0%',
          repeat: '15px',
        },
      ],
      map: map,
    });

    let count = 0;
    const interval = setInterval(() => {
      count = (count + 1) % 100;
      const icons = activeLine.get('icons');
      if (icons && icons[0]) {
        icons[0].offset = count + '%';
        activeLine.set('icons', icons);
      }
    }, 40);

    return () => {
      clearInterval(interval);
      baseLine.setMap(null);
      activeLine.setMap(null);
    };
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng, color, weight]);

  return null;
};

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY';

interface CourierAppProps {
  currentUser: User;
  onLogout?: () => void;
}

type CourierTab = 'home' | 'deliveries' | 'earnings' | 'history' | 'profile';

const CourierApp: React.FC<CourierAppProps> = ({ currentUser, onLogout }) => {
  const [courierData, setCourierData] = useState<Courier | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CourierTab>('home');
  const [showLocationError, setShowLocationError] = useState(false);
  const [selectedOrderSummary, setSelectedOrderSummary] = useState<Order | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Estados de Controle para Histórico Detalhado & Estatísticas Semanais
  const [historyPeriod, setHistoryPeriod] = useState<'this_week' | 'last_week' | '30_days' | 'all'>('this_week');
  const [historyMetric, setHistoryMetric] = useState<'earnings' | 'deliveries' | 'duration'>('earnings');
  const [historyChartType, setHistoryChartType] = useState<'bar' | 'area' | 'line'>('bar');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'delivered' | 'delivering' | 'cancelled'>('all');
  const [historyViewMode, setHistoryViewMode] = useState<'kpi_chart' | 'orders_list'>('kpi_chart');
  const [editingData, setEditingData] = useState({
    name: currentUser.name || '',
    phone: currentUser.phone || '',
    photoURL: currentUser.photoURL || '',
    pixKey: '',
    vehicleType: 'moto' as 'bike' | 'moto' | 'car',
    vehiclePlate: '',
    cnh: '',
    document: ''
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testNotificationTimer, setTestNotificationTimer] = useState<number | null>(null);
  const prevOrderIdsRef = useRef<string[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const refreshSyncCount = async () => {
    try {
      const items = await getSyncQueueItems();
      setPendingSyncCount(items.length);
    } catch (e) {
      console.warn("Could not get sync queue items count:", e);
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
        console.warn("Error loading offline profile data from IndexedDB:", err);
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

  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number }>({ lat: -21.3558, lng: -48.0642 }); // Default: Pradópolis

  // Fetch tenant settings dynamically
  useEffect(() => {
    if (!currentUser?.tenantId) return;
    const settingsRef = doc(db, 'settings', currentUser.tenantId);
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const settingsData = snapshot.data() as AdminSettings;
        setAdminSettings(settingsData);
        
        // Let's geocode the address or city name of lojista using Nominatim
        if (settingsData.address) {
          const addr = settingsData.address;
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
            .then(res => res.json())
            .then(data => {
              if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setStoreCoords({ lat, lng: lon });
              } else {
                // If specific address geocoding fails, fallback to city & state
                const city = settingsData.fiscal?.address?.municipio || 'Pradópolis';
                const state = settingsData.fiscal?.address?.uf || 'SP';
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', ' + state)}&limit=1`)
                  .then(res2 => res2.json())
                  .then(data2 => {
                    if (data2 && data2.length > 0) {
                      const lat = parseFloat(data2[0].lat);
                      const lon = parseFloat(data2[0].lon);
                      setStoreCoords({ lat, lng: lon });
                    }
                  })
                  .catch(err => console.warn("Fallback geocoding error in CourierApp:", err));
              }
            })
            .catch(err => console.warn("Lojista geocoding error in CourierApp:", err));
        }
      }
    }, (error) => {
      console.warn("Error subscribing to tenant settings in CourierApp:", error);
    });

    return () => {
      unsubscribeSettings();
    };
  }, [currentUser?.tenantId]);

  // Sound synthesis on new orders
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio Context playback error:", e);
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

  // Synchronize state with current permission status on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Sync config with service worker helper
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
          console.log('[KitchenFlow AI] Configuração enviada para o Service Worker ativo via sync.');
        }
      });
    }
  };

  // Request notifications permission helper
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
        setToast({ message: 'As notificações foram bloqueadas. Ative-as nas configurações do navegador.', type: 'error' });
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão de notificação:', err);
    }
  };

  // Test background notifications by scheduling inside SW
  const handleTestBackgroundNotification = () => {
    if (!('serviceWorker' in navigator)) {
      setToast({ message: 'Service worker não suportado neste dispositivo.', type: 'error' });
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
          body: 'As notificações em segundo plano do CourierApp estão 100% ativas!'
        });
        
        setToast({ 
          message: 'Agendado! Minimize o app ou bloqueie a tela imediatamente para ver o alerta de segundo plano.', 
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
      } else {
        setToast({ message: 'Service worker ativo não encontrado. Tente recarregar a página.', type: 'error' });
      }
    });
  };

  // Service Worker and Notification setup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        setNotificationPermission(perm);
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          console.log('[KitchenFlow AI] Service Worker registrado:', reg);
          // Wait for service worker to be fully ready before sending config
          await navigator.serviceWorker.ready;
          if (currentUser) {
            syncServiceWorkerConfig();
          }
        })
        .catch(err => {
          console.error('[KitchenFlow AI] Erro ao registrar Service Worker:', err);
        });
    }
  }, [currentUser]);

  // Handle toast notifications for newly assigned orders
  useEffect(() => {
    if (loading) return;

    if (isFirstLoadRef.current) {
      prevOrderIdsRef.current = assignedOrders.map(o => o?.id || '');
      isFirstLoadRef.current = false;
      return;
    }

    const currentIds = assignedOrders.map(o => o?.id || '');
    const newOrders = assignedOrders.filter(order => order?.id && !prevOrderIdsRef.current.includes(order.id));

    if (newOrders.length > 0) {
      playNotificationSound();

      const orderIdsStr = newOrders.map(o => `${formatOrderNumber(o)}`).join(', ');
      setToast({
        message: `Novo pedido atribuído! ${newOrders.length === 1 ? 'Pedido' : 'Pedidos'}: ${orderIdsStr}`,
        type: 'success'
      });

      if (document.hidden || document.visibilityState === 'hidden') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SEND_NOTIFICATION',
            title: `Novo pedido atribuído! (${formatOrderNumber(newOrders[0])})`,
            body: `Você recebeu um novo pedido para entrega. Clique para abrir!`
          });
        } else if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Novo pedido atribuído! (${formatOrderNumber(newOrders[0])})`, {
            body: `Você recebeu um novo pedido para entrega. Clique para abrir!`,
            icon: '/icon-192.png'
          });
        }
      }

      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);

      prevOrderIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    prevOrderIdsRef.current = currentIds;
  }, [assignedOrders, loading]);

  // Pull courier data & subscribe to past 30 days orders
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
        const fixCourier = async () => {
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
        fixCourier();
      }
    }, (error) => {
      console.error("Error subscribing to courier data Firestore:", error);
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
      const orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          ...data, 
          id: doc.id,
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
        
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      setAssignedOrders(sorted);
    }, (error) => {
      console.error("Error subscribing to orders Firestore:", error);
    });

    // GPS location tracker
    let watchId: number;
    if ("geolocation" in navigator && courierData?.status !== 'offline') {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Atualiza dados no estado e no cache IDB de forma otimista para fluidez total
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
            // Se estiver desconectado, enfileira
            await addSyncQueueItem('location', {
              currentLatitude: lat,
              currentLongitude: lng
            });
            refreshSyncCount();
          } else {
            // Se estiver conectado, tenta atualizar Firestore diretamente
            try {
              await updateDoc(doc(db, 'couriers', currentUser.id), {
                currentLatitude: lat,
                currentLongitude: lng,
                updatedAt: new Date()
              });
            } catch (fsErr) {
              console.warn("[GPS Firebase Error] Erro ao sincronizar. Salvando no IndexedDB offline:", fsErr);
              await addSyncQueueItem('location', {
                currentLatitude: lat,
                currentLongitude: lng
              });
              refreshSyncCount();
            }
          }
        },
        (error) => {
          console.warn("Geolocation error:", error);
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

  // Synchronise edits when db document is loaded
  useEffect(() => {
    if (courierData) {
      setEditingData({
        name: courierData.name || currentUser.name || '',
        phone: courierData.phone || currentUser.phone || '',
        photoURL: courierData.photoURL || currentUser.photoURL || '',
        pixKey: courierData.pixKey || '',
        vehicleType: courierData.vehicleType || 'moto',
        vehiclePlate: courierData.vehiclePlate || '',
        cnh: courierData.cnh || '',
        document: courierData.document || ''
      });
    }
  }, [courierData, currentUser]);

  const toggleStatus = async () => {
    if (!courierData) return;
    const newStatus = courierData.status === 'offline' ? 'available' : 'offline';
    
    // Atualiza estado local de forma otimista
    setCourierData(prev => prev ? { ...prev, status: newStatus } : null);

    if (!navigator.onLine) {
      // Offline: salva no perfil local no IDB e enfileira na fila de sincronização
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

    // Online
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
      // Fallback em caso de falha de conexão provisória no Firestore
      await addSyncQueueItem('status', { status: newStatus });
      refreshSyncCount();
      setToast({
        message: 'Status atualizado com instabilidade. Salvo para sincronização em plano de fundo.',
        type: 'info'
      });
    }
  };

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
             description: `Comissão entrega pedido ${formatOrderNumber(order)} - ${currentUser.name}`,
             date: new Date(),
             status: 'pending' 
           });
        }
      }

      await updateDoc(doc(db, 'orders', order.id), updates);
      setToast({ 
        message: nextStatus === 'delivering' ? 'Entrega iniciada! Vá ao destino.' : 'Entrega concluída com sucesso!', 
        type: 'success' 
      });
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  const openRoute = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  // Advanced File selector logic to handle image uploads locally
  const handlePhotoUpload = () => {
    document.getElementById('courier-photo-file-input')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingData(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        name: editingData.name,
        phone: editingData.phone,
        photoURL: editingData.photoURL,
        updatedAt: new Date()
      });

      const courierRef = doc(db, 'couriers', currentUser.id);
      await updateDoc(courierRef, {
        name: editingData.name,
        phone: editingData.phone,
        photoURL: editingData.photoURL,
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

  // Group deliveries in order to calculate Earnings Per Day exactly!
  const earningsByDay = useMemo(() => {
    const daysMap: { [dateStr: string]: { date: Date; dateFormatted: string; totalCommission: number; count: number; orders: Order[] } } = {};
    
    // Filter orders which are successfully completed (delivered)
    const completedOrders = assignedOrders.filter(o => o.status === 'delivered');

    completedOrders.forEach(order => {
      const date = order.deliveredAt || order.createdAt || new Date();
      const dateKey = date.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const dateFormatted = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

      if (!daysMap[dateKey]) {
        daysMap[dateKey] = {
          date,
          dateFormatted: dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1),
          totalCommission: 0,
          count: 0,
          orders: []
        };
      }
      
      daysMap[dateKey].totalCommission += order.courierEarnings || 0;
      daysMap[dateKey].count += 1;
      daysMap[dateKey].orders.push(order);
    });

    return Object.values(daysMap).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [assignedOrders]);

  const chartData = useMemo(() => {
    // Get the 30 most recent days and reverse to sort chronologically (past to present)
    return [...earningsByDay]
      .slice(0, 30)
      .reverse()
      .map(item => ({
        dateFormatted: item.dateFormatted,
        dateStr: item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        ganhos: Number(item.totalCommission.toFixed(2))
      }));
  }, [earningsByDay]);

  // Estatísticas e Cálculo Semanal de Desempenho
  const weeklyPerformance = useMemo(() => {
    const now = new Date();
    
    // Início e fim da semana atual (Segunda 00:00 -> Domingo 23:59)
    const currentMonday = new Date(now);
    const dayOfWeek = currentMonday.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    currentMonday.setDate(currentMonday.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentSunday.getDate() + 6);
    currentSunday.setHours(23, 59, 59, 999);

    // Início e fim da semana anterior
    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    prevMonday.setHours(0, 0, 0, 0);

    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevSunday.getDate() + 6);
    prevSunday.setHours(23, 59, 59, 999);

    const deliveredOrders = assignedOrders.filter(o => o.status === 'delivered');

    // Pedidos da semana atual
    const thisWeekOrders = deliveredOrders.filter(o => {
      const d = o.deliveredAt || o.createdAt || new Date();
      return d >= currentMonday && d <= currentSunday;
    });

    // Pedidos da semana anterior
    const lastWeekOrders = deliveredOrders.filter(o => {
      const d = o.deliveredAt || o.createdAt || new Date();
      return d >= prevMonday && d <= prevSunday;
    });

    const totalEarningsThisWeek = thisWeekOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
    const totalEarningsLastWeek = lastWeekOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
    const totalDeliveredThisWeek = thisWeekOrders.length;
    const totalDeliveredLastWeek = lastWeekOrders.length;

    const avgEarningsPerDelivery = totalDeliveredThisWeek > 0 ? (totalEarningsThisWeek / totalDeliveredThisWeek) : 0;

    // Cálculo de Duração Média (minutos)
    const durations = thisWeekOrders.map(o => {
      const start = o.dispatchedAt ? new Date(o.dispatchedAt).getTime() : (o.createdAt ? new Date(o.createdAt).getTime() : 0);
      const end = o.deliveredAt ? new Date(o.deliveredAt).getTime() : 0;
      if (start > 0 && end > start) {
        return (end - start) / 60000;
      }
      return 18; // média de referência
    });
    const avgDurationMinutes = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Comparativos com semana anterior
    const earningsGrowth = totalEarningsLastWeek > 0 
      ? Math.round(((totalEarningsThisWeek - totalEarningsLastWeek) / totalEarningsLastWeek) * 100)
      : (totalEarningsThisWeek > 0 ? 100 : 0);

    const deliveriesGrowth = totalDeliveredLastWeek > 0 
      ? Math.round(((totalDeliveredThisWeek - totalDeliveredLastWeek) / totalDeliveredLastWeek) * 100)
      : (totalDeliveredThisWeek > 0 ? 100 : 0);

    // Dia de maior movimento nesta semana
    const dayCounts: { [dayIndex: number]: { count: number; earnings: number } } = {};
    thisWeekOrders.forEach(o => {
      const d = o.deliveredAt || o.createdAt || new Date();
      const idx = d.getDay();
      if (!dayCounts[idx]) dayCounts[idx] = { count: 0, earnings: 0 };
      dayCounts[idx].count += 1;
      dayCounts[idx].earnings += (o.courierEarnings || 0);
    });
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    let peakDayName = 'Sem entregas';
    let maxDeliveries = 0;
    Object.entries(dayCounts).forEach(([idxStr, val]) => {
      if (val.count > maxDeliveries) {
        maxDeliveries = val.count;
        peakDayName = `${dayNames[Number(idxStr)]} (${val.count} ${val.count === 1 ? 'entrega' : 'entregas'})`;
      }
    });

    // Dados diários de Segunda a Domingo para o gráfico semanal
    const targetMonday = historyPeriod === 'last_week' ? prevMonday : currentMonday;
    const targetSunday = historyPeriod === 'last_week' ? prevSunday : currentSunday;
    const targetOrders = historyPeriod === 'last_week' ? lastWeekOrders : thisWeekOrders;

    const shortDayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const weekDaysData = shortDayNames.map((name, i) => {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(dayDate);
      nextDay.setDate(dayDate.getDate() + 1);

      const ordersOnThisDay = targetOrders.filter(o => {
        const d = o.deliveredAt || o.createdAt || new Date();
        return d >= dayDate && d < nextDay;
      });

      const dayEarnings = ordersOnThisDay.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
      const dayDurations = ordersOnThisDay.map(o => {
        const start = o.dispatchedAt ? new Date(o.dispatchedAt).getTime() : (o.createdAt ? new Date(o.createdAt).getTime() : 0);
        const end = o.deliveredAt ? new Date(o.deliveredAt).getTime() : 0;
        return (start > 0 && end > start) ? (end - start) / 60000 : 18;
      });
      const dayAvgDuration = dayDurations.length > 0 ? Math.round(dayDurations.reduce((a, b) => a + b, 0) / dayDurations.length) : 0;

      const isToday = dayDate.toDateString() === now.toDateString();

      return {
        dayName: name,
        dateStr: `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`,
        fullDateFormatted: dayDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
        ganhos: Number(dayEarnings.toFixed(2)),
        entregas: ordersOnThisDay.length,
        tempoMedio: dayAvgDuration,
        isToday,
        orders: ordersOnThisDay
      };
    });

    return {
      currentMonday,
      currentSunday,
      prevMonday,
      prevSunday,
      totalEarningsThisWeek,
      totalEarningsLastWeek,
      totalDeliveredThisWeek,
      totalDeliveredLastWeek,
      avgEarningsPerDelivery,
      avgDurationMinutes,
      earningsGrowth,
      deliveriesGrowth,
      peakDayName,
      weekDaysData
    };
  }, [assignedOrders, historyPeriod]);

  // Dados do gráfico correspondentes ao período selecionado
  const selectedPeriodChartData = useMemo(() => {
    if (historyPeriod === 'this_week' || historyPeriod === 'last_week') {
      return weeklyPerformance.weekDaysData;
    }

    if (historyPeriod === '30_days') {
      return chartData.map(item => ({
        dayName: item.dateStr,
        dateStr: item.dateStr,
        fullDateFormatted: item.dateFormatted,
        ganhos: item.ganhos,
        entregas: earningsByDay.find(d => d.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === item.dateStr)?.count || 0,
        tempoMedio: 18,
        isToday: false,
        orders: earningsByDay.find(d => d.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === item.dateStr)?.orders || []
      }));
    }

    // Todos os dias
    return [...earningsByDay].reverse().map(item => ({
      dayName: item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dateStr: item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fullDateFormatted: item.dateFormatted,
      ganhos: Number(item.totalCommission.toFixed(2)),
      entregas: item.count,
      tempoMedio: 18,
      isToday: false,
      orders: item.orders
    }));
  }, [historyPeriod, weeklyPerformance, chartData, earningsByDay]);

  // Lista de pedidos filtrados para a visualização de histórico detalhado
  const filteredHistoryOrders = useMemo(() => {
    return assignedOrders.filter(order => {
      // Filtro de status
      if (historyStatusFilter !== 'all' && order.status !== historyStatusFilter) {
        return false;
      }

      const orderDate = order.deliveredAt || order.createdAt || new Date();

      // Filtro de período
      if (historyPeriod === 'this_week') {
        if (orderDate < weeklyPerformance.currentMonday || orderDate > weeklyPerformance.currentSunday) {
          return false;
        }
      } else if (historyPeriod === 'last_week') {
        if (orderDate < weeklyPerformance.prevMonday || orderDate > weeklyPerformance.prevSunday) {
          return false;
        }
      } else if (historyPeriod === '30_days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (orderDate < thirtyDaysAgo) return false;
      }

      // Filtro de busca textual
      if (historySearchTerm.trim()) {
        const term = historySearchTerm.toLowerCase();
        const matchesId = String(order.id).toLowerCase().includes(term);
        const matchesCustomer = (order.customerName || '').toLowerCase().includes(term);
        const matchesAddress = (order.customerAddress || '').toLowerCase().includes(term);
        const matchesItem = (order.items || []).some(it => it.name.toLowerCase().includes(term));
        if (!matchesId && !matchesCustomer && !matchesAddress && !matchesItem) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.deliveredAt || a.createdAt || new Date(0);
      const dateB = b.deliveredAt || b.createdAt || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [assignedOrders, historyStatusFilter, historyPeriod, historySearchTerm, weeklyPerformance]);

  // Filtering lists
  const activeDeliveries = useMemo(() => assignedOrders.filter(o => ['ready', 'delivering'].includes(o.status)), [assignedOrders]);
  const readyDeliveries = useMemo(() => assignedOrders.filter(o => o.status === 'ready'), [assignedOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-1/3 bg-slate-200 rounded" />
              <div className="h-5 w-2/3 bg-slate-200 rounded" />
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-md shadow-slate-100 border border-slate-50 space-y-4 animate-pulse">
            <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-slate-200 rounded-full animate-ping" />
                <div className="space-y-1.5">
                  <div className="h-2 w-16 bg-slate-100" />
                  <div className="h-4 w-28 bg-slate-200" />
                </div>
              </div>
              <div className="h-10 w-28 bg-slate-200 rounded-xl" />
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-50 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-32 bg-slate-200 rounded-[1.5rem]" />
          </div>

          <p className="text-center text-[10px] font-black text-brand-primary uppercase tracking-widest animate-pulse">
            Sincronizando Sistema de Rotas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-950 text-slate-100 pb-32">
      {/* Toast Messages */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] bg-slate-900 border-l-4 border-brand-primary rounded-2xl shadow-2xl p-4 flex items-start gap-3 backdrop-blur-md"
          >
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Aviso</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        id="courier-photo-file-input" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Hero background banner */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-slate-900 to-slate-950 -z-10 rounded-b-[3.5rem] border-b border-slate-800/50 shadow-2xl shadow-slate-950/80 overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
      </div>

      {/* Unified Screen Header */}
      <header className="px-6 py-8 flex items-center justify-between text-white relative z-10">
        <div className="flex items-center gap-4">
           <div 
             onClick={() => setActiveTab('profile')}
             className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl overflow-hidden group active:scale-95 transition-all cursor-pointer relative"
           >
              {editingData.photoURL ? (
                <img src={editingData.photoURL} className="w-full h-full object-cover" alt="Perfil" />
              ) : (
                <Bike size={28} className="text-white group-hover:scale-110 transition-transform" />
              )}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Olá, Parceiro</p>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('profile')}>
                {editingData.name.split(' ')[0]}
                <ChevronRight size={14} className="opacity-50" />
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-200 border border-rose-500/30 animate-pulse'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {isOnline ? 'Conectado' : 'Sem Conexão'}
                </span>
                
                {pendingSyncCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                    {pendingSyncCount} {pendingSyncCount === 1 ? 'pendente' : 'pendentes'}
                  </span>
                )}
              </div>
           </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
             onClick={() => {
               if (onLogout) {
                 onLogout();
               } else {
                 auth.signOut().then(() => {
                   window.location.href = '/login';
                 });
               }
             }}
             className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-[9px] font-black uppercase tracking-widest"
          >
             <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-6 space-y-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* SCREEN 1: INÍCIO (Home) */}
          {activeTab === 'home' && (
            <motion.div 
              key="tab-home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Status Toggle Card */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-950/40 border border-slate-800/60">
                 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                       <div className={`w-4.5 h-4.5 rounded-full ${courierData?.status === 'offline' ? 'bg-slate-700' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse'}`} />
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status para entregas</span>
                          <span className="text-lg font-black text-slate-100 tracking-tight mt-1">
                             {courierData?.status === 'offline' ? 'Desconectado' : 'Online & Ativo'}
                          </span>
                       </div>
                    </div>
                    <button 
                       onClick={toggleStatus}
                       className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                          courierData?.status === 'offline' 
                          ? 'bg-brand-primary text-white shadow-orange-950/20 hover:bg-[#E03D0C]' 
                          : 'bg-rose-600 text-white shadow-rose-950/20 hover:bg-rose-700'
                       }`}
                    >
                       {courierData?.status === 'offline' ? 'Entrega Online' : 'Ficar Off-line'}
                    </button>
                 </div>
                 
                 {showLocationError && (
                   <div className="mt-4 p-3.5 bg-amber-950/20 rounded-2xl flex items-center gap-3 text-amber-400 border border-amber-900/30">
                      <AlertCircle size={16} />
                      <p className="text-[10px] font-black uppercase tracking-wider">Habilite seu GPS para que o lojista veja seu percurso.</p>
                   </div>
                 )}

                 {pendingSyncCount > 0 && (
                   <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-300">
                     <div className="flex items-center gap-2 text-slate-400">
                       <Compass size={14} className="text-amber-500 animate-spin" />
                       <span className="text-[9px] font-black uppercase tracking-wider">
                         {pendingSyncCount} {pendingSyncCount === 1 ? 'Atualização offline salva no IndexedDB' : 'Atualizações offline salvas no IndexedDB'}
                       </span>
                     </div>
                     {isOnline && (
                       <button
                         onClick={triggerIndexedDBSync}
                         className="px-3.5 py-2 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer active:scale-95 text-center shadow-md shadow-orange-950/30"
                       >
                         Sincronizar Agora
                       </button>
                     )}
                   </div>
                 )}
              </div>

              {/* Ready Deliveries alert lists as Notifications */}
              {readyDeliveries.length > 0 && (
                <div className="bg-rose-950/10 border-2 border-rose-900/30 rounded-[2.5rem] p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-950/20">
                         <Bell size={20} className="animate-bounce" />
                      </div>
                      <div>
                         <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none">Novas Corridas Prontas</span>
                         <h3 className="text-base font-black text-slate-200 tracking-tight mt-1">
                           Você tem {readyDeliveries.length} {readyDeliveries.length === 1 ? 'rota disponível' : 'rotas disponíveis'}!
                         </h3>
                      </div>
                   </div>

                   <div className="space-y-3.5">
                      {readyDeliveries.map((order, idx) => (
                         <div key={order.id} className="bg-slate-900 p-4.5 rounded-2xl border border-rose-950/50 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
                            <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2 mb-1.5">
                                 <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/20">Pedido {formatOrderNumber(order)}</span>
                                 <span className="text-[9px] font-semibold text-slate-400 font-mono italic">({order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Digital'})</span>
                               </div>
                               <p className="text-xs font-bold text-slate-300 leading-normal mb-1">{order.customerAddress}</p>
                               <span className="text-[10px] font-bold text-brand-primary">
                                  Ganhos: R$ {(order.courierEarnings || 0).toFixed(2)}
                               </span>
                            </div>
                            <button
                               onClick={() => {
                                  updateOrderStatus(order, 'delivering');
                                  setActiveTab('deliveries');
                               }}
                               className="shrink-0 py-3 px-5 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-orange-950/30"
                            >
                               <Bike size={14} /> Aceitar e Entregar
                            </button>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              {/* City Mini-Map View card as requested */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl shadow-slate-950/30 border border-slate-800/60 space-y-4">
                 <div className="flex items-center justify-between">
                    <div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acompanhamento</span>
                       <h3 className="text-lg font-black text-slate-100 tracking-tight mt-1">Miniatura do Mapa</h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-850">
                      <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{adminSettings?.fiscal?.address?.municipio || 'Pradópolis'}</span>
                    </div>
                 </div>

                 {hasValidKey ? (
                   <APIProvider apiKey={MAPS_API_KEY} version="weekly">
                     <div className="w-full h-60 rounded-[2rem] overflow-hidden border border-slate-850 relative">
                       <Map
                         defaultCenter={{ 
                           lat: courierData?.currentLatitude || storeCoords.lat, 
                           lng: courierData?.currentLongitude || storeCoords.lng 
                         }}
                         defaultZoom={14}
                         gestureHandling="cooperative"
                         disableDefaultUI={true} internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                       >
                         {activeDeliveries.map(order => {
                            const courierLat = courierData?.currentLatitude || storeCoords.lat;
                            const courierLng = courierData?.currentLongitude || storeCoords.lng;
                            const hash = order.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const latOffset = ((hash % 100) - 50) * 0.00015;
                            const lngOffset = (((hash >> 2) % 100) - 50) * 0.00015;
                            const destCoords = {
                              lat: order.latitude || (courierLat + latOffset),
                              lng: order.longitude || (courierLng + lngOffset)
                            };
                            return (
                              <React.Fragment key={order.id}>
                                <AnimatedRoutePolyline
                                  origin={{ lat: courierLat, lng: courierLng }}
                                  destination={destCoords}
                                  color={order.status === 'delivering' ? '#EA580C' : '#3B82F6'}
                                  weight={3}
                                />
                                <AdvancedMarker position={destCoords}>
                                  <div className="relative flex items-center justify-center">
                                    <div className="absolute w-7 h-7 bg-emerald-500/30 rounded-full animate-ping" />
                                    <div className="absolute w-4 h-4 bg-emerald-500/50 rounded-full animate-pulse" />
                                    <div className="w-7 h-7 bg-emerald-600 rounded-full border-2 border-slate-900 flex items-center justify-center text-white shadow-xl relative z-10 animate-in zoom-in-50 duration-300">
                                      <MapPin size={12} />
                                    </div>
                                    <div className="absolute -bottom-8 bg-slate-950 border border-white/10 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap opacity-90 z-20">
                                      {order.customerName ? order.customerName.split(' ')[0] : 'Destino'}
                                    </div>
                                  </div>
                                </AdvancedMarker>
                              </React.Fragment>
                            );
                          })}

                          <AdvancedMarker 
                           position={{ 
                             lat: courierData?.currentLatitude || storeCoords.lat, 
                             lng: courierData?.currentLongitude || storeCoords.lng 
                           }}
                         >
                           <div className="w-10 h-10 bg-brand-primary rounded-full border-4 border-slate-900 flex items-center justify-center text-white shadow-xl">
                             <Bike size={18} />
                           </div>
                         </AdvancedMarker>
                       </Map>
                       <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 text-white">
                         <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                         <span className="text-[8px] font-black uppercase tracking-widest leading-none">GPS Ativo</span>
                       </div>
                     </div>
                   </APIProvider>
                 ) : (
                   <div className="w-full h-60 rounded-[2rem] overflow-hidden border border-slate-850 relative bg-slate-950 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                     <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                     
                     <div className="absolute w-[210px] h-[210px] rounded-full border-2 border-brand-primary/10 flex items-center justify-center">
                       <div className="absolute inset-0 rounded-full border-t border-brand-primary/30 animate-spin [animation-duration:5s]" />
                       <div className="absolute inset-8 rounded-full border border-dashed border-brand-primary/10" />
                       <div className="absolute w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center animate-pulse">
                         <div className="w-6 h-6 bg-brand-primary rounded-full border-2 border-slate-900 flex items-center justify-center text-white shadow-lg">
                           <Bike size={12} />
                         </div>
                       </div>
                       
                       <div className="absolute top-10 left-10 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                       <div className="absolute bottom-12 right-12 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                     </div>

                     <div className="relative z-10 space-y-1 mt-auto">
                       <span className="text-[9px] font-black uppercase tracking-widest text-[#FF4F18]">Radar em Tempo Real</span>
                       <p className="text-[10px] font-bold text-slate-400 leading-normal container max-w-xs mx-auto">
                         Varredura GPS de acompanhamento ativa. Seu sinal está visível para a central.
                       </p>
                     </div>
                   </div>
                 )}
              </div>

              {/* Status information guidelines banner */}
              <div className="bg-gradient-to-r from-orange-500 to-brand-primary p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                 <div className="relative z-10 space-y-2">
                    <h3 className="text-lg font-black tracking-tight leading-none uppercase">Central Inteligente</h3>
                    <p className="text-xs text-orange-50 font-medium">Deixe seu aplicativo sempre aberto para receber alertas instantâneos de novos roteiros entregas com comissões de repasse!</p>
                 </div>
                 <Activity size={120} className="absolute -right-8 -bottom-10 text-white/5 rotate-12" strokeWidth={1} />
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: ENTREGAS (Active Deliveries) */}
          {activeTab === 'deliveries' && (
            <motion.div 
              key="tab-deliveries"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {activeDeliveries.length > 1 && (
                <div className="bg-gradient-to-r from-brand-primary to-orange-500 rounded-3xl p-4.5 text-white shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                      <MapIcon size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Roteiro Otimizado</p>
                      <p className="text-xs font-bold">{activeDeliveries.length} Entregas Pendentes</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const addresses = activeDeliveries.map(o => encodeURIComponent(o.customerAddress || '')).join('/');
                      window.open(`https://www.google.com/maps/dir/${addresses}`, '_blank');
                    }}
                    className="px-4 py-2 bg-white text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all cursor-pointer font-sans"
                  >
                    Rota Total
                  </button>
                </div>
              )}

              {activeDeliveries.length === 0 ? (
                <div className="bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-800 shadow-2xl shadow-slate-950/40">
                   <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-850">
                      <ShoppingBag size={32} className="text-slate-200" />
                   </div>
                   <h3 className="text-lg font-black text-slate-200 tracking-tight mb-2">Sem Entregas no Momento</h3>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhuma entrega em rota ou pendente de início.</p>
                </div>
              ) : (
                activeDeliveries.map((order, index) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-950/40 border border-slate-800/60"
                  >
                     <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${order.status === 'delivering' ? 'bg-brand-primary text-white font-black' : 'bg-orange-950/20 text-brand-primary'}`}>
                                 {index + 1}
                              </span>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedido {formatOrderNumber(order)}</span>
                           </div>
                           <h3 className="text-lg font-black text-slate-100 tracking-tighter mt-1">{order.customerName}</h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${order.status === 'ready' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/20' : 'bg-orange-950/30 text-[#FF4F18] animate-pulse border border-orange-900/20'}`}>
                           {order.status === 'ready' ? 'Aguardando' : 'Em Rota'}
                        </div>
                     </div>

                     <div className="p-6 bg-slate-950/50 space-y-4">
                        <div className="flex items-start gap-3">
                           <MapPin size={20} className="text-rose-500 shrink-0 mt-0.5" />
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Endereço de Entrega</p>
                              <p className="text-xs font-bold text-slate-300 leading-normal font-mono">{order.customerAddress}</p>
                               {order.status === 'delivering' && (
                                 <CourierNavigation 
                                   order={order}
                                   courierLatitude={courierData?.currentLatitude}
                                   courierLongitude={courierData?.currentLongitude}
                                 />
                               )}
                           </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                           <div className="flex items-center gap-2">
                              <Wallet size={14} className="text-[#FF4F18]" />
                              <span className="text-xs font-black text-slate-200">R$ {order.total.toFixed(2)}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-44">
                                ({order.paymentMethod === 'dinheiro' ? 'Dinheiro' + (order.changeFor ? ' (troco p/ R$ ' + order.changeFor.toFixed(2) + ')' : '') : 'Pago Online'})
                              </span>
                           </div>
                           <div className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-400" />
                              <span className="text-[10px] font-black text-slate-500 uppercase">30 Minutos</span>
                           </div>
                        </div>
                     </div>

                     <div className="p-4 bg-slate-900 flex gap-3">
                        <button 
                           onClick={() => openRoute(order.customerAddress || '')}
                           className="flex-1 py-4 bg-slate-950 border border-slate-800/80 hover:bg-slate-900 text-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-slate-950/40"
                        >
                           <Navigation size={14} /> GPS
                        </button>
                        
                        {order.status === 'ready' ? (
                          <button 
                             onClick={() => updateOrderStatus(order, 'delivering')}
                             className="flex-[1.5] py-4 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-orange-950/30 active:scale-95 hover:bg-[#E03D0C] transition-all"
                          >
                             <Bike size={16} /> Iniciar Entrega
                          </button>
                        ) : (
                          <button 
                             onClick={() => updateOrderStatus(order, 'delivered')}
                             className="flex-[1.5] py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-emerald-950/30 active:scale-95 hover:bg-emerald-600 transition-all"
                          >
                             <CheckCircle2 size={16} /> Entregue & Pago
                          </button>
                        )}
                     </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* SCREEN 3: HISTÓRICO DETALHADO & ESTATÍSTICAS SEMANAIS DE DESEMPENHO */}
          {(activeTab === 'earnings' || activeTab === 'history') && (
            <motion.div 
              key="tab-history-performance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Header Navigation Segmented Controls */}
              <div className="bg-slate-900 p-1.5 rounded-[2rem] border border-slate-800/80 shadow-2xl flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('kpi_chart')}
                  className={`flex-1 py-3 px-3 rounded-[1.5rem] text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    historyViewMode === 'kpi_chart'
                      ? 'bg-brand-primary text-white shadow-lg shadow-orange-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
                  }`}
                >
                  <BarChart2 size={14} />
                  <span>Desempenho Semanal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('orders_list')}
                  className={`flex-1 py-3 px-3 rounded-[1.5rem] text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    historyViewMode === 'orders_list'
                      ? 'bg-brand-primary text-white shadow-lg shadow-orange-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
                  }`}
                >
                  <History size={14} />
                  <span>Histórico ({filteredHistoryOrders.length})</span>
                </button>
              </div>

              {/* Quick Period Selector Pills */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'this_week', label: 'Esta Semana' },
                  { id: 'last_week', label: 'Semana Anterior' },
                  { id: '30_days', label: 'Últimos 30 Dias' },
                  { id: 'all', label: 'Todas as Entregas' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setHistoryPeriod(p.id as any)}
                    className={`shrink-0 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                      historyPeriod === p.id
                        ? 'bg-slate-100 text-slate-900 border-white shadow-md'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {historyViewMode === 'kpi_chart' ? (
                <>
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Card 1: Ganhos na Semana */}
                    <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800/80 shadow-xl space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {historyPeriod === 'this_week' ? 'Ganhos Semanais' : historyPeriod === 'last_week' ? 'Semana Anterior' : 'Total Ganhos'}
                        </span>
                        <div className="w-8 h-8 bg-orange-950/30 text-brand-primary rounded-xl flex items-center justify-center border border-orange-900/30">
                          <DollarSign size={16} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-100 tracking-tight">
                          R$ {(historyPeriod === 'last_week' ? weeklyPerformance.totalEarningsLastWeek : weeklyPerformance.totalEarningsThisWeek).toFixed(2)}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          {weeklyPerformance.earningsGrowth >= 0 ? (
                            <span className="flex items-center text-[8.5px] font-black text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded-md border border-emerald-900/30">
                              <ArrowUpRight size={11} /> +{weeklyPerformance.earningsGrowth}%
                            </span>
                          ) : (
                            <span className="flex items-center text-[8.5px] font-black text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded-md border border-rose-900/30">
                              <ArrowDownRight size={11} /> {weeklyPerformance.earningsGrowth}%
                            </span>
                          )}
                          <span className="text-[8px] font-medium text-slate-500">vs semana ant.</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Entregas Realizadas */}
                    <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800/80 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Entregas Feitas
                        </span>
                        <div className="w-8 h-8 bg-indigo-950/30 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-900/30">
                          <Bike size={16} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-100 tracking-tight">
                          {historyPeriod === 'last_week' ? weeklyPerformance.totalDeliveredLastWeek : weeklyPerformance.totalDeliveredThisWeek}
                        </h4>
                        <p className="text-[8.5px] font-black uppercase text-indigo-400 mt-1 truncate">
                          Média: R$ {weeklyPerformance.avgEarningsPerDelivery.toFixed(2)} / corrida
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Tempo Médio de Entrega */}
                    <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800/80 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Tempo Médio
                        </span>
                        <div className="w-8 h-8 bg-amber-950/30 text-amber-400 rounded-xl flex items-center justify-center border border-amber-900/30">
                          <Timer size={16} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-100 tracking-tight">
                          {weeklyPerformance.avgDurationMinutes || 18} min
                        </h4>
                        <span className="text-[8px] font-bold text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded-md border border-amber-900/30">
                          ⚡ Alta pontualidade
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Dia de Maior Pico */}
                    <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800/80 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Dia de Pico
                        </span>
                        <div className="w-8 h-8 bg-emerald-950/30 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-900/30">
                          <Award size={16} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-100 tracking-tight line-clamp-1 mt-1">
                          {weeklyPerformance.peakDayName}
                        </h4>
                        <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded-md border border-emerald-900/30">
                          Maior faturamento
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Interactive Performance Chart with Controls */}
                  <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-slate-950/40 border border-slate-800/80 space-y-5">
                    {/* Header with Metric & Chart Type Switchers */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <BarChart2 size={16} className="text-brand-primary" />
                          <h3 className="text-sm font-black text-slate-100 tracking-tight">
                            Gráfico de Desempenho
                          </h3>
                        </div>
                        <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                          {historyPeriod === 'this_week' ? 'Segunda a Domingo (Semana Atual)' : historyPeriod === 'last_week' ? 'Semana Anterior' : 'Histórico Consolidado'}
                        </p>
                      </div>

                      {/* Metric Toggle Chips */}
                      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => setHistoryMetric('earnings')}
                          className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all ${
                            historyMetric === 'earnings'
                              ? 'bg-brand-primary text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Ganhos (R$)
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryMetric('deliveries')}
                          className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all ${
                            historyMetric === 'deliveries'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Qtd Entregas
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryMetric('duration')}
                          className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all ${
                            historyMetric === 'duration'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Tempo (min)
                        </button>
                      </div>
                    </div>

                    {/* Chart Render */}
                    {selectedPeriodChartData.length === 0 ? (
                      <div className="h-52 flex flex-col items-center justify-center text-center bg-slate-950/40 rounded-[1.8rem] border border-dashed border-slate-800 p-6">
                        <TrendingUp className="text-slate-700 mb-2 animate-pulse" size={28} />
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Sem dados no período</p>
                        <p className="text-[9px] text-slate-600 font-medium mt-1">Realize entregas para preencher as estatísticas semanais.</p>
                      </div>
                    ) : (
                      <div className="h-56 w-full bg-slate-950/40 p-3 pt-4 rounded-[1.8rem] border border-slate-800/60 relative">
                        {/* Visual Chart Mode Switcher in corner */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 z-10 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
                          <button 
                            type="button"
                            onClick={() => setHistoryChartType('bar')}
                            title="Barras"
                            className={`p-1 rounded-lg text-[9px] font-bold ${historyChartType === 'bar' ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Barras
                          </button>
                          <button 
                            type="button"
                            onClick={() => setHistoryChartType('area')}
                            title="Área"
                            className={`p-1 rounded-lg text-[9px] font-bold ${historyChartType === 'area' ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Área
                          </button>
                          <button 
                            type="button"
                            onClick={() => setHistoryChartType('line')}
                            title="Linhas"
                            className={`p-1 rounded-lg text-[9px] font-bold ${historyChartType === 'line' ? 'bg-brand-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Linha
                          </button>
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                          {historyChartType === 'bar' ? (
                            <BarChart data={selectedPeriodChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                              <XAxis 
                                dataKey="dayName" 
                                stroke="#64748b" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={8}
                              />
                              <YAxis 
                                stroke="#64748b" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => historyMetric === 'earnings' ? `R$${val}` : historyMetric === 'duration' ? `${val}m` : `${val}`}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#0f172a', 
                                  border: '1px solid #334155', 
                                  borderRadius: '16px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                }} 
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} 
                                itemStyle={{ color: '#FF4F18', fontSize: '11px', fontWeight: 'black' }} 
                                formatter={(value: any) => [
                                  historyMetric === 'earnings' 
                                    ? `R$ ${Number(value).toFixed(2)}` 
                                    : historyMetric === 'duration' 
                                      ? `${value} minutos` 
                                      : `${value} entregas`,
                                  historyMetric === 'earnings' ? 'Ganhos' : historyMetric === 'duration' ? 'Tempo Médio' : 'Entregas'
                                ]}
                                labelFormatter={(label, items) => {
                                  const item = items[0]?.payload;
                                  return item ? `${item.fullDateFormatted || label} (${item.entregas} entregas)` : label;
                                }}
                              />
                              <Bar 
                                dataKey={historyMetric === 'earnings' ? 'ganhos' : historyMetric === 'duration' ? 'tempoMedio' : 'entregas'} 
                                radius={[8, 8, 2, 2]}
                              >
                                {selectedPeriodChartData.map((entry, index) => {
                                  const fillColor = entry.isToday 
                                    ? '#FF4F18' 
                                    : historyMetric === 'earnings' 
                                      ? '#EA580C' 
                                      : historyMetric === 'duration' 
                                        ? '#D97706' 
                                        : '#6366F1';
                                  return <Cell key={`cell-${index}`} fill={fillColor} fillOpacity={entry.isToday ? 1 : 0.85} />;
                                })}
                              </Bar>
                            </BarChart>
                          ) : historyChartType === 'area' ? (
                            <AreaChart data={selectedPeriodChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={historyMetric === 'earnings' ? '#FF4F18' : historyMetric === 'duration' ? '#F59E0B' : '#6366F1'} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={historyMetric === 'earnings' ? '#FF4F18' : historyMetric === 'duration' ? '#F59E0B' : '#6366F1'} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                              <XAxis dataKey="dayName" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} dy={8} />
                              <YAxis 
                                stroke="#64748b" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => historyMetric === 'earnings' ? `R$${val}` : historyMetric === 'duration' ? `${val}m` : `${val}`}
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} 
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} 
                                itemStyle={{ color: '#FF4F18', fontSize: '11px', fontWeight: 'black' }} 
                                formatter={(value: any) => [
                                  historyMetric === 'earnings' ? `R$ ${Number(value).toFixed(2)}` : historyMetric === 'duration' ? `${value} min` : `${value} entregas`,
                                  historyMetric === 'earnings' ? 'Ganhos' : historyMetric === 'duration' ? 'Duração' : 'Entregas'
                                ]}
                              />
                              <Area 
                                type="monotone" 
                                dataKey={historyMetric === 'earnings' ? 'ganhos' : historyMetric === 'duration' ? 'tempoMedio' : 'entregas'} 
                                stroke={historyMetric === 'earnings' ? '#FF4F18' : historyMetric === 'duration' ? '#F59E0B' : '#6366F1'} 
                                fillOpacity={1} 
                                fill="url(#colorMetric)" 
                                strokeWidth={3} 
                              />
                            </AreaChart>
                          ) : (
                            <LineChart data={selectedPeriodChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                              <XAxis dataKey="dayName" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} dy={8} />
                              <YAxis 
                                stroke="#64748b" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => historyMetric === 'earnings' ? `R$${val}` : historyMetric === 'duration' ? `${val}m` : `${val}`}
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} 
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} 
                                itemStyle={{ color: '#FF4F18', fontSize: '11px', fontWeight: 'black' }} 
                                formatter={(value: any) => [
                                  historyMetric === 'earnings' ? `R$ ${Number(value).toFixed(2)}` : `${value}`,
                                  historyMetric === 'earnings' ? 'Ganhos' : 'Entregas'
                                ]}
                              />
                              <Line 
                                type="monotone" 
                                dataKey={historyMetric === 'earnings' ? 'ganhos' : historyMetric === 'duration' ? 'tempoMedio' : 'entregas'} 
                                stroke="#FF4F18" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#FF4F18', stroke: '#0f172a', strokeWidth: 1.5 }} 
                                activeDot={{ r: 6, fill: '#FF4F18', stroke: '#ffffff', strokeWidth: 1.5 }} 
                              />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Day-by-Day Breakdown List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Detalhamento por Dia da Semana
                      </h3>
                      <span className="text-[9px] font-black text-brand-primary uppercase">
                        {selectedPeriodChartData.filter(d => d.entregas > 0).length} dias ativos
                      </span>
                    </div>

                    {selectedPeriodChartData.length === 0 ? (
                      <div className="bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-800">
                        <Calendar size={32} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-xs font-heavy text-slate-500 uppercase tracking-widest font-black">Nenhum registro no período</p>
                      </div>
                    ) : (
                      selectedPeriodChartData.map((dayGroup, dIdx) => {
                        const dateKey = `day-${dayGroup.dateStr}-${dIdx}`;
                        const isExpanded = expandedDay === dateKey;
                        const dayOrders = dayGroup.orders || [];

                        return (
                          <div key={dateKey} className="bg-slate-900 rounded-[2rem] p-5 border border-slate-800/60 shadow-sm space-y-4 overflow-hidden transition-all duration-300">
                            {/* Day Card Summary */}
                            <div 
                              onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
                              className="flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center border text-slate-400 shadow-sm ${
                                  dayGroup.isToday 
                                    ? 'bg-orange-950/40 border-brand-primary/50 text-brand-primary' 
                                    : 'bg-slate-950 border-slate-800/80'
                                }`}>
                                  <span className="text-[10px] font-black uppercase leading-none">
                                    {dayGroup.dayName}
                                  </span>
                                  <span className="text-[7.5px] font-bold uppercase tracking-wider mt-0.5 text-slate-400">
                                    {dayGroup.dateStr}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-slate-100 tracking-tight capitalize">
                                      {dayGroup.fullDateFormatted || dayGroup.dayName}
                                    </h4>
                                    {dayGroup.isToday && (
                                      <span className="text-[7.5px] font-black uppercase bg-brand-primary text-white px-2 py-0.5 rounded-full shadow-sm">
                                        Hoje
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                                    {dayGroup.entregas} {dayGroup.entregas === 1 ? 'entrega realizada' : 'entregas realizadas'} {dayGroup.tempoMedio > 0 ? `• ~${dayGroup.tempoMedio} min/corrida` : ''}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-xs font-black text-brand-primary">R$ {dayGroup.ganhos.toFixed(2)}</span>
                                  <span className="text-[8px] font-black uppercase tracking-wider block text-slate-500 mt-0.5">Comissão</span>
                                </div>
                                <ChevronDown size={16} className={`text-slate-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-primary' : ''}`} />
                              </div>
                            </div>

                            {/* Expandable Day Details */}
                            {isExpanded && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-4 border-t border-slate-800 space-y-2.5"
                              >
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Relação de Entregas ({dayOrders.length})
                                </span>
                                {dayOrders.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-2">Nenhum pedido individual registrado neste dia.</p>
                                ) : (
                                  dayOrders.map((order) => (
                                    <div 
                                      key={order.id} 
                                      onClick={() => setSelectedOrderSummary(order)}
                                      className="bg-slate-950 hover:bg-slate-850/60 p-3.5 rounded-2xl flex items-center justify-between gap-4 border border-slate-800/80 cursor-pointer transition-all hover:border-brand-primary/40 group"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-slate-200">
                                            {formatOrderNumber(order)}
                                          </span>
                                          <span className="text-[8px] font-bold text-slate-500 italic">
                                            ({order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) : '--:--'})
                                          </span>
                                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                            {order.customerName || 'Cliente'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium truncate mt-1">
                                          {order.customerAddress || 'Endereço não informado'}
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0 flex items-center gap-2">
                                        <div>
                                          <span className="text-xs font-black text-slate-100 block">+ R$ {(order.courierEarnings || 0).toFixed(2)}</span>
                                          <span className="text-[7.5px] font-bold uppercase tracking-widest text-[#FF4F18]">Ver Detalhes</span>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-600 group-hover:text-brand-primary transition-colors" />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </motion.div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* History Orders List View with Live Search and Filters */
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      placeholder="Buscar por cliente, endereço ou #ID..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-all"
                    />
                    {historySearchTerm && (
                      <button 
                        onClick={() => setHistorySearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Status Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {[
                      { id: 'all', label: 'Todos os Status' },
                      { id: 'delivered', label: 'Concluídos' },
                      { id: 'delivering', label: 'Em Trânsito' },
                      { id: 'cancelled', label: 'Cancelados' }
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setHistoryStatusFilter(st.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                          historyStatusFilter === st.id
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Orders Cards List */}
                  {filteredHistoryOrders.length === 0 ? (
                    <div className="bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-800 space-y-3">
                      <ShoppingBag size={32} className="text-slate-700 mx-auto" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum pedido encontrado</p>
                      <p className="text-[10px] text-slate-600 font-medium">Tente ajustar o período ou os termos de busca.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredHistoryOrders.map((order) => {
                        const isDelivered = order.status === 'delivered';
                        const isDelivering = order.status === 'delivering';
                        const isCancelled = order.status === 'cancelled';
                        const orderDate = order.deliveredAt || order.createdAt || new Date();

                        return (
                          <div 
                            key={order.id}
                            onClick={() => setSelectedOrderSummary(order)}
                            className="bg-slate-900 rounded-[2rem] p-5 border border-slate-800/80 shadow-md space-y-3.5 hover:border-brand-primary/50 transition-all cursor-pointer group"
                          >
                            {/* Card Top Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 text-brand-primary font-mono text-xs font-black">
                                  {formatOrderNumber(order)}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-200 group-hover:text-brand-primary transition-colors">
                                    {order.customerName || 'Cliente Anônimo'}
                                  </h4>
                                  <p className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                                    {new Date(orderDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                  isDelivered 
                                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                                    : isDelivering
                                      ? 'bg-amber-950/30 text-amber-400 border-amber-900/30'
                                      : isCancelled
                                        ? 'bg-rose-950/30 text-rose-400 border-rose-900/30'
                                        : 'bg-indigo-950/30 text-indigo-400 border-indigo-900/30'
                                }`}>
                                  {isDelivered ? 'Entregue' : isDelivering ? 'Em Rota' : isCancelled ? 'Cancelado' : order.status}
                                </span>
                                <span className="text-xs font-black text-slate-100 block mt-1">
                                  + R$ {(order.courierEarnings || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Address Row */}
                            {order.customerAddress && (
                              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-start gap-2 text-[10px] text-slate-400">
                                <MapPin size={14} className="text-brand-primary shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-relaxed flex-1">{order.customerAddress}</span>
                              </div>
                            )}

                            {/* Card Footer */}
                            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-800/60 font-bold text-slate-500">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                  {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'itens'}
                                </span>
                                <span className="uppercase text-slate-400">
                                  {order.paymentMethod === 'dinheiro' ? 'Dinheiro' : order.paymentMethod?.toUpperCase() || 'Digital'}
                                </span>
                              </div>
                              <span className="text-brand-primary font-black uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Ver Detalhes <ChevronRight size={12} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Ledger notice */}
              <div className="bg-[#111111] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-lg shadow-slate-950/40">
                 <div className="relative z-10">
                    <h3 className="text-xl font-black tracking-tighter mb-2">Resumo da Carteira</h3>
                    <p className="text-xs text-orange-200/80 font-medium">Todos os repasses e cobranças em dinheiro em mãos são consolidados e atualizados em tempo real.</p>
                 </div>
                 <DollarSign size={100} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" strokeWidth={1} />
              </div>
            </motion.div>
          )}

          {/* SCREEN 4: PERFIL (Courier Settings and Personal Bio) */}
          {activeTab === 'profile' && (
            <motion.div 
              key="tab-profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Top Avatar & Basic Bio Card */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-950/40 border border-slate-800/60 flex flex-col items-center text-center">
                <div className="relative group">
                  <div className="w-24 h-24 bg-slate-950 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-slate-800 shadow-inner relative">
                    {editingData.photoURL ? (
                      <img src={editingData.photoURL} className="w-full h-full object-cover" alt="Perfil" />
                    ) : (
                      <UserCircle size={48} className="text-slate-200" />
                    )}
                  </div>
                  <button 
                    onClick={handlePhotoUpload}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-primary text-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-slate-900 active:scale-90 transition-all cursor-pointer"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <h3 className="text-xl font-black text-slate-100 tracking-tight mt-4">{courierData?.name || currentUser.name}</h3>
                
                <div className="flex items-center gap-1 bg-amber-950/20 text-amber-400 border border-amber-900/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mt-2">
                  <Star size={12} className="fill-current" />
                  <span>Pontuação: 4.9 Estrelas</span>
                </div>
              </div>

              {/* Financial Box moved to Profile Tab */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-950/40 border border-slate-800/60 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Resumo Financeiro</h3>
                  {courierData?.dailyFee && (
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${courierData.lastDailyFeeDate?.toDateString() === new Date().toDateString() ? 'bg-emerald-950/25 text-emerald-400 border border-emerald-900/20' : 'bg-slate-950 text-slate-500'}`}>
                        {courierData.lastDailyFeeDate?.toDateString() === new Date().toDateString() ? 'Diária Hoje Aplicada' : 'Sem Diária Hoje'}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 mt-1">
                        Valor base: R$ {courierData.dailyFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Total Comissões + Diárias</span>
                      <span className="text-xs font-black text-slate-200">R$ {(courierData?.earnings || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Total Dinheiro em Mãos</span>
                      <span className="text-xs font-black text-amber-400">R$ {(courierData?.cashHeld || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">A Receber Líquido</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Ganhos - Dinheiro físico em mãos</span>
                      </div>
                      <span className={`text-base font-black ${(courierData?.earnings || 0) >= (courierData?.cashHeld || 0) ? 'text-[#FF4F18]' : 'text-rose-600'}`}>
                         R$ {((courierData?.earnings || 0) - (courierData?.cashHeld || 0)).toFixed(2)}
                      </span>
                   </div>

                   {(courierData?.cashHeld || 0) > 0 && (
                     <button 
                       onClick={async () => {
                         if (!courierData) return;
                         if (!window.confirm(`Confirmar devolução de R$ ${courierData.cashHeld.toFixed(2)} ao estabelecimento físico?`)) return;
                         
                         try {
                           const cashToSettle = courierData.cashHeld;
                           const unsettledOrders = assignedOrders.filter(o => o.status === 'delivered' && !o.isSettled);
                           const totalEarningsToSettle = unsettledOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
                           
                           // Mark all delivered, unsettled orders of this courier as settled and finished in Firestore
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
                               console.error(`Erro ao atualizar pedido ${order.id} no acerto de caixa:`, e);
                             }
                           }

                           // Update the courier document: reset cashHeld to 0, subtract settled earnings
                           await updateDoc(doc(db, 'couriers', courierData.id), {
                             cashHeld: 0,
                             earnings: Math.max(0, (courierData.earnings || 0) - totalEarningsToSettle),
                             updatedAt: new Date()
                           });

                           // Add financial income record (money returned by courier to register)
                           await addDoc(collection(db, 'financialRecords'), {
                             tenantId: courierData.tenantId,
                             type: 'income',
                             amount: cashToSettle,
                             category: 'Recebimento Motoboy',
                             description: `Repasse Entregador (Dinheiro): ${courierData.name}`,
                             date: new Date(),
                             status: 'paid'
                           });

                           // If there were commissions/earnings settled, record as expense in the financial logs
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
                       }}
                       className="w-full mt-4 py-3 bg-slate-950 border border-slate-800/80 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                     >
                       <DollarSign size={14} className="text-brand-primary" />
                       Acertar conta com o Caixa
                     </button>
                   )}
                </div>
              </div>

              {/* Dados Pessoais Inputs */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-950/40 border border-slate-800/60 space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Dados Individuais de Cadastro</span>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editingData.name}
                      onChange={(e) => setEditingData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      type="tel" 
                      value={editingData.phone}
                      onChange={(e) => setEditingData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave Pix para repasses</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="CPF, E-mail, Celular ou Aleatória"
                        value={editingData.pixKey}
                        onChange={(e) => setEditingData(prev => ({ ...prev, pixKey: e.target.value }))}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] pr-12 transition-all"
                      />
                      <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                      <select
                        value={editingData.vehicleType}
                        onChange={(e) => setEditingData(prev => ({ ...prev, vehicleType: e.target.value as any }))}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      >
                        <option value="bike">Bicicleta</option>
                        <option value="moto">Motocicleta</option>
                        <option value="car">Carro / Van</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Placa do Veículo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: ABC1D23"
                        value={editingData.vehiclePlate}
                        onChange={(e) => setEditingData(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Documento CPF</label>
                      <input 
                        type="text" 
                        placeholder="Apenas números"
                        value={editingData.document}
                        onChange={(e) => setEditingData(prev => ({ ...prev, document: e.target.value }))}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sua CNH</label>
                      <input 
                        type="text" 
                        placeholder="Registro da CNH"
                        value={editingData.cnh}
                        onChange={(e) => setEditingData(prev => ({ ...prev, cnh: e.target.value }))}
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-slate-200 outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full py-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={16} /> Salvar Alterações de Cadastro
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Painel de Notificações em Segundo Plano */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-950/40 border border-slate-800/60 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={20} className="text-brand-primary animate-pulse" />
                  <span className="text-xs font-black text-slate-100 uppercase tracking-widest">Notificações em Segundo Plano</span>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Receba alertas instantâneos de novos pedidos mesmo com a tela bloqueada ou com o aplicativo minimizado. Nosso Service Worker gerencia a conexão em segundo plano para você não perder nenhuma entrega.
                </p>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status da Permissão</span>
                    {notificationPermission === 'granted' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-900/30">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        Concedida
                      </span>
                    ) : notificationPermission === 'denied' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-950/20 text-rose-400 border border-rose-900/30">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                        Bloqueada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-950/20 text-amber-400 border border-amber-900/30">
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                        Não Solicitada
                      </span>
                    )}
                  </div>

                  {notificationPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="w-full mt-1 py-3 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Bell size={14} /> Ativar Notificações no Navegador
                    </button>
                  )}

                  {notificationPermission === 'granted' && (
                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Simular Alerta de Segundo Plano</span>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Clique no botão abaixo e minimize o aplicativo ou bloqueie a tela do seu celular em até 5 segundos para testar o alerta de novas entregas!
                      </p>
                      <button
                        type="button"
                        onClick={handleTestBackgroundNotification}
                        disabled={testNotificationTimer !== null}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testNotificationTimer !== null ? (
                          <span>Aguarde {testNotificationTimer}s... Minimize o App!</span>
                        ) : (
                          <>
                            <Activity size={14} className="text-brand-primary" /> Testar Alerta em 5 Segundos
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 items-start bg-slate-950/50 p-4.5 rounded-2xl border border-slate-800/40 text-[10px] text-slate-500 leading-normal">
                  <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Sincronização e Economia de Bateria</span>
                    Nosso sistema utiliza sincronização PWA otimizada. Caso seu dispositivo restrinja o consumo em segundo plano, certifique-se de desabilitar a otimização de bateria para este PWA para garantir notificações imediatas de pedidos atribuídos.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Nav - Elegant tab switcher with 4 tabs spacing */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-slate-900/95 backdrop-blur-md rounded-[2.2rem] shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-slate-800/80 flex items-center justify-around px-2 z-50">
         <button 
           onClick={() => setActiveTab('home')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all ${activeTab === 'home' ? 'text-brand-primary scale-110 font-bold bg-orange-950/25' : 'text-slate-500 hover:text-slate-400'}`}
           title="Início"
         >
            <Compass size={22} strokeWidth={activeTab === 'home' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Início</span>
         </button>

         <button 
           onClick={() => setActiveTab('deliveries')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all relative ${activeTab === 'deliveries' ? 'text-brand-primary scale-110 font-bold bg-orange-950/25' : 'text-slate-500 hover:text-slate-400'}`}
           title="Corridas"
         >
            <Bike size={22} strokeWidth={activeTab === 'deliveries' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Rotas</span>
            {activeDeliveries.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                 {activeDeliveries.length}
              </span>
            )}
         </button>

         <button 
           onClick={() => setActiveTab('history')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all ${activeTab === 'history' || activeTab === 'earnings' ? 'text-brand-primary scale-110 font-bold bg-orange-950/25' : 'text-slate-500 hover:text-slate-400'}`}
           title="Histórico & Estatísticas Semanais"
         >
            <History size={22} strokeWidth={activeTab === 'history' || activeTab === 'earnings' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Histórico</span>
         </button>

         <button 
           onClick={() => setActiveTab('profile')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all ${activeTab === 'profile' ? 'text-brand-primary scale-110 font-bold bg-orange-950/25' : 'text-slate-500 hover:text-slate-400'}`}
           title="Meu Perfil"
         >
            <UserIcon size={22} strokeWidth={activeTab === 'profile' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Perfil</span>
         </button>
      </nav>

      {/* COMPLETED ORDER DETAIL DRAWER / MODAL */}
      <AnimatePresence>
        {selectedOrderSummary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrderSummary(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-slate-900 rounded-[3rem] shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col border border-slate-800/80"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-orange-950/10">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#FF4F18] bg-orange-950/30 px-2.5 py-1 rounded-full border border-orange-900/20">
                    Entrega Concluída
                  </span>
                  <h2 className="text-lg font-black text-slate-100 tracking-tight mt-2">
                    Resumo de Entrega
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedOrderSummary(null)} 
                  className="p-2 bg-slate-950 hover:bg-slate-900 text-slate-400 rounded-xl transition-all shadow-sm border border-slate-800/80 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pedido ID</p>
                    <p className="font-mono text-xs font-bold text-slate-300">#{selectedOrderSummary.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Entregue Em</p>
                    <p className="text-xs font-bold text-slate-300">
                      {selectedOrderSummary.deliveredAt 
                        ? selectedOrderSummary.deliveredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : '--:--'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dados do Cliente</h4>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <UserCircle size={16} className="text-brand-primary mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">{selectedOrderSummary.customerName || 'Não Informado'}</p>
                        {selectedOrderSummary.customerPhone && (
                          <p className="text-[10px] text-slate-500 font-medium">{maskPhone(selectedOrderSummary.customerPhone)}</p>
                        )}
                      </div>
                    </div>
                    {selectedOrderSummary.customerAddress && (
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <MapPin size={16} className="text-brand-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Endereço de Entrega</p>
                            <p className="text-[11px] font-medium text-slate-400 leading-normal">{selectedOrderSummary.customerAddress}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedOrderSummary.customerAddress || '')}
                          className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-950 text-slate-400 hover:text-brand-primary p-2 px-3 rounded-xl border border-slate-800 hover:border-brand-primary/40 transition-all cursor-pointer font-bold active:scale-95 text-[9px] font-black uppercase tracking-wider"
                        >
                          {copiedAddress ? (
                            <Check size={12} className="text-brand-primary" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{copiedAddress ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Itens do Pedido</h4>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      {(selectedOrderSummary.items || []).reduce((sum, item) => sum + item.quantity, 0)} {(selectedOrderSummary.items || []).reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  
                  <div className="border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60 bg-slate-950">
                    {(selectedOrderSummary.items || []).map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-brand-primary bg-orange-950/30 px-1.5 py-0.5 rounded uppercase font-sans border border-orange-900/20">
                              {item.quantity}x
                            </span>
                            <span className="text-xs font-bold text-slate-200">{item.name}</span>
                          </div>
                          
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="mt-1 pl-8 flex flex-wrap gap-1">
                              {item.selectedOptions.map((opt, oIdx) => (
                                <span key={oIdx} className="text-[8px] font-bold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded-md uppercase tracking-tight border border-slate-800/40">
                                  {opt.name} ({opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Grátis'})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-400 text-right shrink-0">
                          R$ {((item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-950/10 border-2 border-brand-primary/20 p-5 rounded-3xl flex flex-col items-center text-center relative overflow-hidden shadow-sm">
                  <div className="w-10 h-10 bg-brand-primary text-white rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-orange-950/45">
                    <DollarSign size={20} />
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sua Comissão de Entrega</p>
                  <h3 className="text-3xl font-black text-brand-primary tracking-tight mt-1">
                    + R$ {(selectedOrderSummary.courierEarnings || 0).toFixed(2)}
                  </h3>
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-brand-primary text-white px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-tight">
                    <Check size={8} strokeWidth={3} /> Recebido
                  </div>
                </div>

                {/* Economic Summary */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resumo Financeiro do Pedido</h4>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                      <span>Subtotal Itens</span>
                      <span className="font-bold text-slate-200">
                        R$ {(selectedOrderSummary.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                      </span>
                    </div>
                    {selectedOrderSummary.deliveryFee !== undefined && selectedOrderSummary.deliveryFee > 0 && (
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span>Taxa de Entrega</span>
                        <span className="font-bold text-slate-200">
                          R$ {selectedOrderSummary.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center text-sm">
                      <span className="font-black text-slate-300 uppercase tracking-tight">Valor Total Pago</span>
                      <span className="font-black text-slate-100">
                        R$ {selectedOrderSummary.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Meio de Pagamento</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                          selectedOrderSummary.paymentMethod === 'dinheiro' 
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-900/30' 
                            : 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/30'
                        }`}>
                          {selectedOrderSummary.paymentMethod === 'dinheiro' ? 'Dinheiro' : selectedOrderSummary.paymentMethod?.toUpperCase() || 'Digital'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-900 border-t border-slate-800">
                <button 
                  onClick={() => setSelectedOrderSummary(null)}
                  className="w-full py-4 bg-slate-950 border border-slate-800/80 hover:bg-slate-900 text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl pointer duration-200"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourierApp;
