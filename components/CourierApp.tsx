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
import { Order, Courier, User, AdminSettings } from '../types';
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
  Copy,
  Calendar,
  History,
  Activity,
  User as UserIcon,
  ChevronDown,
  Info,
  Compass,
  CreditCard,
  ShieldAlert,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

type CourierTab = 'home' | 'deliveries' | 'earnings' | 'profile';

const CourierApp: React.FC<CourierAppProps> = ({ currentUser }) => {
  const [courierData, setCourierData] = useState<Courier | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CourierTab>('home');
  const [showLocationError, setShowLocationError] = useState(false);
  const [selectedOrderSummary, setSelectedOrderSummary] = useState<Order | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
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
  const prevOrderIdsRef = useRef<string[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);

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

  // Service Worker and Notification setup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[GastroAI] Service Worker registrado:', reg);
          if (currentUser) {
            setTimeout(() => {
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
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
            }, 1200);
          }
        })
        .catch(err => {
          console.error('[GastroAI] Erro ao registrar Service Worker:', err);
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

      const orderIdsStr = newOrders.map(o => `#${String(o?.id || '').slice(-4)}`).join(', ');
      setToast({
        message: `Novo pedido atribuído! ${newOrders.length === 1 ? 'Pedido' : 'Pedidos'}: ${orderIdsStr}`,
        type: 'success'
      });

      if (document.hidden || document.visibilityState === 'hidden') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SEND_NOTIFICATION',
            title: `Novo pedido atribuído! (#${String(newOrders[0]?.id || '').slice(-4)})`,
            body: `Você recebeu um novo pedido para entrega. Clique para abrir!`
          });
        } else if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Novo pedido atribuído! (#${String(newOrders[0]?.id || '').slice(-4)})`, {
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
    if (!currentUser.tenantId) return;

    const courierDocRef = doc(db, 'couriers', currentUser.id);
    const unsubscribeCourier = onSnapshot(courierDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCourierData({ 
          ...data, 
          id: snapshot.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          lastDailyFeeDate: data.lastDailyFeeDate instanceof Timestamp ? data.lastDailyFeeDate.toDate() : data.lastDailyFeeDate 
        } as Courier);
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
          } catch (err) {
            setLoading(false);
          }
        };
        fixCourier();
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'orders'),
      where('tenantId', '==', currentUser.tenantId),
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
    });

    // GPS location tracker
    let watchId: number;
    if ("geolocation" in navigator && courierData?.status !== 'offline') {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateDoc(doc(db, 'couriers', currentUser.id), {
            currentLatitude: position.coords.latitude,
            currentLongitude: position.coords.longitude,
            updatedAt: new Date()
          }).catch(console.error);
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
  }, [currentUser.id, currentUser.tenantId, courierData?.status]);

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
    try {
      await updateDoc(doc(db, 'couriers', currentUser.id), {
        status: newStatus,
        updatedAt: new Date()
      });
      setToast({
        message: newStatus === 'available' ? 'Você está online para receber entregas!' : 'Você está offline.',
        type: 'info'
      });
    } catch (err) {
      console.error("Error updating status:", err);
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
             description: `Comissão entrega pedido #${String(order?.id || '').slice(-4)} - ${currentUser.name}`,
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
    <div className="h-full w-full overflow-y-auto bg-[#f8fafb] pb-32">
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
      <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-primary to-[#E03D0C] -z-10 rounded-b-[3.5rem] shadow-2xl shadow-orange-100/50 overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
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
           </div>
        </div>
        <div>
          <button 
             onClick={() => auth.signOut()}
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
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/80 border border-slate-50">
                 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                       <div className={`w-4.5 h-4.5 rounded-full ${courierData?.status === 'offline' ? 'bg-slate-300' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse'}`} />
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status para entregas</span>
                          <span className="text-lg font-black text-slate-800 tracking-tight mt-1">
                             {courierData?.status === 'offline' ? 'Desconectado' : 'Online & Ativo'}
                          </span>
                       </div>
                    </div>
                    <button 
                       onClick={toggleStatus}
                       className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                          courierData?.status === 'offline' 
                          ? 'bg-brand-primary text-white shadow-orange-100 hover:bg-[#E03D0C]' 
                          : 'bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700'
                       }`}
                    >
                       {courierData?.status === 'offline' ? 'Entrega Online' : 'Ficar Off-line'}
                    </button>
                 </div>
                 
                 {showLocationError && (
                   <div className="mt-4 p-3.5 bg-amber-50 rounded-2xl flex items-center gap-3 text-amber-700 border border-amber-100">
                      <AlertCircle size={16} />
                      <p className="text-[10px] font-black uppercase tracking-wider">Habilite seu GPS para que o lojista veja seu percurso.</p>
                   </div>
                 )}
              </div>

              {/* Ready Deliveries alert lists as Notifications */}
              {readyDeliveries.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-100/60 rounded-[2.5rem] p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                         <Bell size={20} className="animate-bounce" />
                      </div>
                      <div>
                         <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none">Novas Corridas Prontas</span>
                         <h3 className="text-base font-black text-slate-800 tracking-tight mt-1">
                           Você tem {readyDeliveries.length} {readyDeliveries.length === 1 ? 'rota disponível' : 'rotas disponíveis'}!
                         </h3>
                      </div>
                   </div>

                   <div className="space-y-3.5">
                      {readyDeliveries.map((order, idx) => (
                         <div key={order.id} className="bg-white p-4.5 rounded-2xl border border-rose-100 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
                            <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2 mb-1.5">
                                 <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">Pedido #{String(order.id).slice(-4)}</span>
                                 <span className="text-[9px] font-semibold text-slate-700 font-mono italic">({order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Digital'})</span>
                               </div>
                               <p className="text-xs font-bold text-slate-800 leading-normal mb-1">{order.customerAddress}</p>
                               <span className="text-[10px] font-bold text-brand-primary">
                                  Ganhos: R$ {(order.courierEarnings || 0).toFixed(2)}
                               </span>
                            </div>
                            <button
                               onClick={() => {
                                  updateOrderStatus(order, 'delivering');
                                  setActiveTab('deliveries');
                               }}
                               className="shrink-0 py-3 px-5 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-orange-100"
                            >
                               <Bike size={14} /> Aceitar e Entregar
                            </button>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              {/* City Mini-Map View card as requested */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-100 border border-slate-50 space-y-4">
                 <div className="flex items-center justify-between">
                    <div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhamento</span>
                       <h3 className="text-lg font-black text-slate-800 tracking-tight mt-1">Miniatura do Mapa</h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{adminSettings?.fiscal?.address?.municipio || 'Pradópolis'}</span>
                    </div>
                 </div>

                 {hasValidKey ? (
                   <APIProvider apiKey={MAPS_API_KEY} version="weekly">
                     <div className="w-full h-60 rounded-[2rem] overflow-hidden border border-slate-100 relative">
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
                                    <div className="w-7 h-7 bg-emerald-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl relative z-10 animate-in zoom-in-50 duration-300">
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
                           <div className="w-10 h-10 bg-brand-primary rounded-full border-4 border-white flex items-center justify-center text-white shadow-xl">
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
                   <div className="w-full h-60 rounded-[2rem] overflow-hidden border border-slate-100 relative bg-slate-950 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                     <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                     
                     <div className="absolute w-[210px] h-[210px] rounded-full border-2 border-brand-primary/10 flex items-center justify-center">
                       <div className="absolute inset-0 rounded-full border-t border-brand-primary/30 animate-spin [animation-duration:5s]" />
                       <div className="absolute inset-8 rounded-full border border-dashed border-brand-primary/10" />
                       <div className="absolute w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center animate-pulse">
                         <div className="w-6 h-6 bg-brand-primary rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg">
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
                <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100 shadow-md">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                      <ShoppingBag size={32} className="text-slate-200" />
                   </div>
                   <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">Sem Entregas no Momento</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma entrega em rota ou pendente de início.</p>
                </div>
              ) : (
                activeDeliveries.map((order, index) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg shadow-slate-250/70 border border-slate-50"
                  >
                     <div className="p-6 border-b border-slate-50 flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${order.status === 'delivering' ? 'bg-brand-primary text-white font-black' : 'bg-[#FFF0EB] text-brand-primary'}`}>
                                 {index + 1}
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido #{String(order?.id || '').slice(-4)}</span>
                           </div>
                           <h3 className="text-lg font-black text-slate-800 tracking-tighter mt-1">{order.customerName}</h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${order.status === 'ready' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-[#FF4F18] animate-pulse'}`}>
                           {order.status === 'ready' ? 'Aguardando' : 'Em Rota'}
                        </div>
                     </div>

                     <div className="p-6 bg-slate-50/50 space-y-4">
                        <div className="flex items-start gap-3">
                           <MapPin size={20} className="text-rose-500 shrink-0 mt-0.5" />
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Endereço de Entrega</p>
                              <p className="text-xs font-bold text-slate-700 leading-normal font-mono">{order.customerAddress}</p>
                               {order.status === 'delivering' && (
                                 <CourierNavigation 
                                   order={order}
                                   courierLatitude={courierData?.currentLatitude}
                                   courierLongitude={courierData?.currentLongitude}
                                 />
                               )}
                           </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                           <div className="flex items-center gap-2">
                              <Wallet size={14} className="text-[#FF4F18]" />
                              <span className="text-xs font-black text-slate-800">R$ {order.total.toFixed(2)}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-44">
                                ({order.paymentMethod === 'dinheiro' ? 'Dinheiro' + (order.changeFor ? ' (troco p/ R$ ' + order.changeFor.toFixed(2) + ')' : '') : 'Pago Online'})
                              </span>
                           </div>
                           <div className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-400" />
                              <span className="text-[10px] font-black text-slate-400 uppercase">30 Minutos</span>
                           </div>
                        </div>
                     </div>

                     <div className="p-4 bg-white flex gap-3">
                        <button 
                           onClick={() => openRoute(order.customerAddress || '')}
                           className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                        >
                           <Navigation size={14} /> GPS
                        </button>
                        
                        {order.status === 'ready' ? (
                          <button 
                             onClick={() => updateOrderStatus(order, 'delivering')}
                             className="flex-[1.5] py-4 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-100 active:scale-95 hover:bg-[#E03D0C] transition-all"
                          >
                             <Bike size={16} /> Iniciar Entrega
                          </button>
                        ) : (
                          <button 
                             onClick={() => updateOrderStatus(order, 'delivered')}
                             className="flex-[1.5] py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 hover:bg-emerald-600 transition-all"
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

          {/* SCREEN 3: VALORES A RECEBER (Earnings History by Day) */}
          {activeTab === 'earnings' && (
            <motion.div 
              key="tab-earnings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Earnings Overview card */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-brand-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ganhos Acumulados</span>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">R$ {courierData?.earnings?.toFixed(2) || '0,00'}</h3>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Registros</span>
                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-full">{earningsByDay.length} dias</span>
                </div>
              </div>

              {/* Day-by-day Breakdown List */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Valores a receber por dia</h3>
                
                {earningsByDay.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100">
                    <Calendar size={32} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-xs font-heavy text-slate-400 uppercase tracking-widest font-black">Nenhuma entrega consolidada nos últimos 30 dias</p>
                  </div>
                ) : (
                  earningsByDay.map((dayGroup) => {
                    const dateStr = dayGroup.date.toDateString();
                    const isExpanded = expandedDay === dateStr;

                    return (
                      <div key={dateStr} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-4 overflow-hidden transition-all duration-300">
                        {/* Day Card Summary */}
                        <div 
                          onClick={() => setExpandedDay(isExpanded ? null : dateStr)}
                          className="flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100 text-slate-500">
                              <span className="text-[9px] font-black uppercase text-brand-primary leading-none">
                                {dayGroup.date.getDate()}
                              </span>
                              <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">
                                {dayGroup.date.toLocaleDateString('pt-BR', { month: 'short' }).slice(0,3)}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800 tracking-tight capitalize">{dayGroup.dateFormatted}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                                {dayGroup.count} {dayGroup.count === 1 ? 'entrega' : 'entregas'} realizada
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-black text-brand-primary">R$ {dayGroup.totalCommission.toFixed(2)}</span>
                              <span className="text-[8px] font-black uppercase tracking-wider block text-slate-400 mt-0.5">A Receber</span>
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
                            className="pt-4 border-t border-slate-100 space-y-3"
                          >
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Relação de Entregas</span>
                            {dayGroup.orders.map((order) => (
                              <div 
                                key={order.id} 
                                onClick={() => setSelectedOrderSummary(order)}
                                className="bg-slate-50 hover:bg-orange-50/30 p-3 rounded-2xl flex items-center justify-between gap-4 border border-slate-100 cursor-pointer transition-colors"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black text-slate-700">Pedido #{String(order.id).slice(-4)}</span>
                                    <span className="text-[8px] font-bold text-slate-400 italic">({order.deliveredAt ? order.deliveredAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'})</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5">{order.customerAddress}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-slate-800">+ R$ {(order.courierEarnings || 0).toFixed(2)}</span>
                                  <span className="text-[7px] font-bold uppercase tracking-widest text-[#FF4F18] block">Comissão</span>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Ledger notice */}
              <div className="bg-[#111111] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-lg shadow-slate-200">
                 <div className="relative z-10">
                    <h3 className="text-xl font-black tracking-tighter mb-2">Resumo da Carteira</h3>
                    <p className="text-xs text-orange-200/80 font-medium">Todos os repasses e cobranças em dinheiro em mãos são calculados em tempo real.</p>
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
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-100 border border-slate-50 flex flex-col items-center text-center">
                <div className="relative group">
                  <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-slate-50 shadow-inner relative">
                    {editingData.photoURL ? (
                      <img src={editingData.photoURL} className="w-full h-full object-cover" alt="Perfil" />
                    ) : (
                      <UserCircle size={48} className="text-slate-200" />
                    )}
                  </div>
                  <button 
                    onClick={handlePhotoUpload}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-primary text-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white active:scale-90 transition-all cursor-pointer"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-4">{courierData?.name || currentUser.name}</h3>
                
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mt-2">
                  <Star size={12} className="fill-current" />
                  <span>Pontuação: 4.9 Estrelas</span>
                </div>
              </div>

              {/* Financial Box moved to Profile Tab */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-150 border border-slate-50 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resumo Financeiro</h3>
                  {courierData?.dailyFee && (
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${courierData.lastDailyFeeDate?.toDateString() === new Date().toDateString() ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {courierData.lastDailyFeeDate?.toDateString() === new Date().toDateString() ? 'Diária Hoje Aplicada' : 'Sem Diária Hoje'}
                      </span>
                      <span className="text-[9px] font-black text-slate-500 mt-1">
                        Valor base: R$ {courierData.dailyFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Total Comissões + Diárias</span>
                      <span className="text-xs font-black text-slate-800">R$ {(courierData?.earnings || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Total Dinheiro em Mãos</span>
                      <span className="text-xs font-black text-amber-600">R$ {(courierData?.cashHeld || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">A Receber Líquido</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Ganhos - Dinheiro físico em mãos</span>
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
                           await updateDoc(doc(db, 'couriers', courierData.id), {
                             cashHeld: 0,
                             updatedAt: new Date()
                           });

                           await addDoc(collection(db, 'financialRecords'), {
                             tenantId: courierData.tenantId,
                             type: 'revenue',
                             amount: cashToSettle,
                             category: 'Repasse Entregador',
                             description: `Devolução de dinheiro em mãos: ${courierData.name}`,
                             date: new Date(),
                             status: 'confirmed'
                           });
                           
                           setToast({ message: 'Acerto de caixa efetuado com sucesso!', type: 'success' });
                         } catch (err) {
                           console.error('Erro ao fazer acerto:', err);
                           setToast({ message: 'Erro ao processar acerto de dinheiro.', type: 'error' });
                         }
                       }}
                       className="w-full mt-4 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                     >
                       <DollarSign size={14} className="text-brand-primary" />
                       Acertar conta com o Caixa
                     </button>
                   )}
                </div>
              </div>

              {/* Dados Pessoais Inputs */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-100 border border-slate-50 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Dados Individuais de Cadastro</span>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editingData.name}
                      onChange={(e) => setEditingData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      type="tel" 
                      value={editingData.phone}
                      onChange={(e) => setEditingData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave Pix para repasses</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="CPF, E-mail, Celular ou Aleatória"
                        value={editingData.pixKey}
                        onChange={(e) => setEditingData(prev => ({ ...prev, pixKey: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] pr-12 transition-all"
                      />
                      <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                      <select
                        value={editingData.vehicleType}
                        onChange={(e) => setEditingData(prev => ({ ...prev, vehicleType: e.target.value as any }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      >
                        <option value="bike">Bicicleta</option>
                        <option value="moto">Motocicleta</option>
                        <option value="car">Carro / Van</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa do Veículo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: ABC1D23"
                        value={editingData.vehiclePlate}
                        onChange={(e) => setEditingData(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documento CPF</label>
                      <input 
                        type="text" 
                        placeholder="Apenas números"
                        value={editingData.document}
                        onChange={(e) => setEditingData(prev => ({ ...prev, document: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua CNH</label>
                      <input 
                        type="text" 
                        placeholder="Registro da CNH"
                        value={editingData.cnh}
                        onChange={(e) => setEditingData(prev => ({ ...prev, cnh: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF4F18]/20 focus:border-[#FF4F18] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full py-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Nav - Elegant tab switcher with 4 tabs spacing */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/95 backdrop-blur-md rounded-[2.2rem] shadow-[0_15px_30px_rgba(0,0,0,0.08)] border border-white/50 flex items-center justify-around px-2 z-50">
         <button 
           onClick={() => setActiveTab('home')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all ${activeTab === 'home' ? 'text-brand-primary scale-110 font-bold bg-orange-50/40' : 'text-slate-300 hover:text-slate-400'}`}
           title="Início"
         >
            <Compass size={22} strokeWidth={activeTab === 'home' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Início</span>
         </button>

         <button 
           onClick={() => setActiveTab('deliveries')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all relative ${activeTab === 'deliveries' ? 'text-brand-primary scale-110 font-bold bg-orange-50/40' : 'text-slate-300 hover:text-slate-400'}`}
           title="Corridas"
         >
            <Bike size={22} strokeWidth={activeTab === 'deliveries' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Rotas</span>
            {activeDeliveries.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full border border-white flex items-center justify-center text-[8px] font-black text-white">
                 {activeDeliveries.length}
              </span>
            )}
         </button>

         <button 
           onClick={() => setActiveTab('earnings')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all ${activeTab === 'earnings' ? 'text-brand-primary scale-110 font-bold bg-orange-50/40' : 'text-slate-300 hover:text-slate-400'}`}
           title="Valores por dia"
         >
            <Calendar size={22} strokeWidth={activeTab === 'earnings' ? 3 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Ganhos</span>
         </button>

         <button 
           onClick={() => setActiveTab('profile')}
           className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all ${activeTab === 'profile' ? 'text-brand-primary scale-110 font-bold bg-orange-50/40' : 'text-slate-300 hover:text-slate-400'}`}
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
              className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-orange-50/50">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#FF4F18] bg-orange-100 px-2.5 py-1 rounded-full border border-orange-200/50">
                    Entrega Concluída
                  </span>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight mt-2">
                    Resumo de Entrega
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedOrderSummary(null)} 
                  className="p-2 bg-white hover:bg-slate-50 text-slate-400 rounded-xl transition-all shadow-sm border border-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pedido ID</p>
                    <p className="font-mono text-xs font-bold text-slate-700">#{selectedOrderSummary.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entregue Em</p>
                    <p className="text-xs font-bold text-slate-700">
                      {selectedOrderSummary.deliveredAt 
                        ? selectedOrderSummary.deliveredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : '--:--'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dados do Cliente</h4>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <UserCircle size={16} className="text-brand-primary mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{selectedOrderSummary.customerName || 'Não Informado'}</p>
                        {selectedOrderSummary.customerPhone && (
                          <p className="text-[10px] text-slate-400 font-medium">{maskPhone(selectedOrderSummary.customerPhone)}</p>
                        )}
                      </div>
                    </div>
                    {selectedOrderSummary.customerAddress && (
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100/50">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <MapPin size={16} className="text-brand-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Endereço de Entrega</p>
                            <p className="text-[11px] font-medium text-slate-600 leading-normal">{selectedOrderSummary.customerAddress}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedOrderSummary.customerAddress || '')}
                          className="shrink-0 flex items-center gap-1.5 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-brand-primary p-2 px-3 rounded-xl border border-slate-100 hover:border-orange-150 transition-all cursor-pointer font-bold active:scale-95 text-[9px] font-black uppercase tracking-wider"
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
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Itens do Pedido</h4>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {(selectedOrderSummary.items || []).reduce((sum, item) => sum + item.quantity, 0)} {(selectedOrderSummary.items || []).reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {(selectedOrderSummary.items || []).map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-brand-primary bg-orange-50 px-1.5 py-0.5 rounded uppercase font-sans border border-orange-100">
                              {item.quantity}x
                            </span>
                            <span className="text-xs font-bold text-slate-800">{item.name}</span>
                          </div>
                          
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="mt-1 pl-8 flex flex-wrap gap-1">
                              {item.selectedOptions.map((opt, oIdx) => (
                                <span key={oIdx} className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                                  {opt.name} ({opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Grátis'})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-600 text-right shrink-0">
                          R$ {((item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-50/50 border-2 border-brand-primary/10 p-5 rounded-3xl flex flex-col items-center text-center relative overflow-hidden shadow-sm">
                  <div className="w-10 h-10 bg-brand-primary text-white rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-orange-250">
                    <DollarSign size={20} />
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sua Comissão de Entrega</p>
                  <h3 className="text-3xl font-black text-brand-primary tracking-tight mt-1">
                    + R$ {(selectedOrderSummary.courierEarnings || 0).toFixed(2)}
                  </h3>
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-brand-primary text-white px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-tight">
                    <Check size={8} strokeWidth={3} /> Recebido
                  </div>
                </div>

                {/* Economic Summary */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumo Financeiro do Pedido</h4>
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                      <span>Subtotal Itens</span>
                      <span className="font-bold text-slate-800">
                        R$ {(selectedOrderSummary.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                      </span>
                    </div>
                    {selectedOrderSummary.deliveryFee !== undefined && selectedOrderSummary.deliveryFee > 0 && (
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                        <span>Taxa de Entrega</span>
                        <span className="font-bold text-slate-800">
                          R$ {selectedOrderSummary.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-sm">
                      <span className="font-black text-slate-700 uppercase tracking-tight">Valor Total Pago</span>
                      <span className="font-black text-slate-800">
                        R$ {selectedOrderSummary.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-slate-150 pt-2.5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Meio de Pagamento</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                          selectedOrderSummary.paymentMethod === 'dinheiro' 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}>
                          {selectedOrderSummary.paymentMethod === 'dinheiro' ? 'Dinheiro' : selectedOrderSummary.paymentMethod?.toUpperCase() || 'Digital'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedOrderSummary(null)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl pointer duration-200"
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
