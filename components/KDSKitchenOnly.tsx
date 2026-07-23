import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order, OrderItem, Product, Table } from '../types';
import { 
  ChefHat, Clock, CheckCircle2, AlertTriangle, Play, Check, 
  Sparkles, Coffee, Flame, Utensils, Award, RefreshCw, Volume2, VolumeX, Grid, Smartphone, ShoppingBag, Bike, LogOut,
  Maximize2, Minimize2, Sun, Moon
} from 'lucide-react';

interface KDSKitchenOnlyProps {
  orders: Order[];
  products: Product[];
  tables: Table[];
  onUpdateStatus: (id: string, status: 'pending' | 'preparing' | 'ready') => void;
  onLogout?: () => void;
  showLogoutButton?: boolean;
}

export const KDSKitchenOnly: React.FC<KDSKitchenOnlyProps> = ({ 
  orders, 
  products, 
  tables, 
  onUpdateStatus,
  onLogout,
  showLogoutButton = false
}) => {
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'delivery' | 'takeout' | 'table'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement));
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kds_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light'; // Padrão Modo Diurno (fundo claro/branco)
  });

  const isLight = themeMode === 'light';

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kds_theme', next);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Erro ao ativar tela cheia:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Erro ao sair da tela cheia:', err);
        });
      }
    }
  };
  
  // Safe helper to convert any date representation (Date, string, Firestore Timestamp) to Date
  const safeParseDate = (raw: any): Date => {
    if (!raw) return new Date();
    if (raw instanceof Date) return isNaN(raw.getTime()) ? new Date() : raw;
    if (typeof raw === 'object' && typeof raw.seconds === 'number') {
      return new Date(raw.seconds * 1000);
    }
    if (typeof raw?.toDate === 'function') {
      return raw.toDate();
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Track checked items per order in local state so cooks can mark specific dishes as completed
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<string, boolean>>>({});
  
  // Keep track of order count to trigger chime on new orders
  const prevOrdersCountRef = useRef<number>(0);

  // Filter orders to only pending/preparing (to-be-produced)
  const kitchenOrders = useMemo(() => {
    // Keep only recent pending/preparing orders (from last 12 hours) to avoid clutter
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const filtered = orders.filter(o => {
      const isKitchenStatus = o.status === 'pending' || o.status === 'preparing';
      if (!isKitchenStatus) return false;
      const createdDate = safeParseDate(o.createdAt);
      return createdDate > twelveHoursAgo;
    });

    // Ordenação FIFO estrita (o pedido lançado primeiro vem em 1º lugar na tela do KDS)
    return [...filtered].sort((a, b) => {
      const timeA = safeParseDate(a.createdAt).getTime();
      const timeB = safeParseDate(b.createdAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.dailyNumber || 0) - (b.dailyNumber || 0);
    });
  }, [orders]);

  // Extract all available product categories to serve as Kitchen Stations
  const stations = useMemo(() => {
    const categories = new Set<string>();
    products.forEach(p => {
      if (p.category) {
        categories.add(p.category);
      }
    });
    return ['all', ...Array.from(categories)];
  }, [products]);

  // Filter orders based on active filters (type) and selected station (category)
  const filteredKitchenOrders = useMemo(() => {
    return kitchenOrders.filter(order => {
      // 1. Filter by order type
      if (activeFilter !== 'all' && order.type !== activeFilter) {
        return false;
      }

      // 2. Filter by station (category)
      if (selectedStation !== 'all') {
        // Only show order if it contains at least one item from the selected category/station
        const hasMatchingItem = order.items.some(item => {
          const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.split(' (')[0].trim().toLowerCase());
          return prod?.category === selectedStation;
        });
        return hasMatchingItem;
      }

      return true;
    });
  }, [kitchenOrders, activeFilter, selectedStation, products]);

  // Trigger sound alert when a new kitchen order arrives
  useEffect(() => {
    const currentCount = kitchenOrders.length;
    if (currentCount > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
      if (soundEnabled) {
        playNewOrderSound();
      }
    }
    prevOrdersCountRef.current = currentCount;
  }, [kitchenOrders, soundEnabled]);

  const playNewOrderSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.05);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      // High chime sequence for kitchen
      playTone(523.25, now, 0.15); // C5
      playTone(659.25, now + 0.15, 0.15); // E5
      playTone(783.99, now + 0.3, 0.3); // G5
    } catch (e) {
      console.warn("Could not play sound: ", e);
    }
  };

  // Toggle checklist status of an item
  const toggleItemChecked = (orderId: string, itemKey: string) => {
    setCheckedItems(prev => {
      const orderChecked = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...orderChecked,
          [itemKey]: !orderChecked[itemKey]
        }
      };
    });
  };

  // Get elapsed minutes for color-coding prep time
  const getElapsedTimeInfo = (createdAt: any) => {
    const createdDate = safeParseDate(createdAt);
    const minutes = Math.floor((Date.now() - createdDate.getTime()) / 60000);
    let colorClass = isLight 
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    let label = 'Recém enviado';

    if (minutes >= 10 && minutes < 20) {
      colorClass = isLight 
        ? 'text-amber-800 bg-amber-50 border-amber-200 font-bold' 
        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      label = 'Alerta de Tempo';
    } else if (minutes >= 20) {
      colorClass = isLight
        ? 'text-rose-700 bg-rose-50 border-rose-200 font-black animate-pulse'
        : 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse';
      label = 'CRÍTICO / ATRASADO';
    }

    return { minutes, colorClass, label };
  };

  // Resolve Table label beautifully
  const getTableLabel = (order: Order) => {
    if (order.type !== 'table') return null;
    const tNum = String(order.tableNumber);
    if (tNum.length < 5 && !isNaN(Number(tNum))) return `Mesa ${tNum}`;
    const tableRef = tables.find(t => t.id === order.tableNumber || (t as any).docId === order.tableNumber);
    return tableRef ? `Mesa ${tableRef.number}` : `Mesa ${tNum.slice(-4)}`;
  };

  // Render order name cleanly
  const getOrderIdentifier = (order: Order) => {
    if (order.type === 'table') return getTableLabel(order);
    if (order.customerName) return order.customerName.toUpperCase().slice(0, 15);
    const shortId = order.id.replace('KDS-', '').toUpperCase().slice(-4);
    return `SENHA ${shortId}`;
  };

  // Custom component for the elapsed timer (live updates)
  const TimerBadge: React.FC<{ createdAt: Date }> = ({ createdAt }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 5000); // update color stats every 5 seconds
      return () => clearInterval(interval);
    }, []);

    const { minutes, colorClass } = getElapsedTimeInfo(createdAt);

    return (
      <div className={`flex items-center gap-1 p-1 px-2.5 rounded-full border text-[10px] font-black tracking-wider ${colorClass}`}>
        <Clock size={11} className="animate-pulse" />
        <span>{minutes} MIN</span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col flex-1 rounded-3xl border shadow-2xl overflow-hidden h-full min-h-0 select-none transition-colors duration-300 ${
      isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-950 text-slate-100 border-slate-900'
    }`}>
      
      {/* Top Header Panel */}
      <div className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border shadow-lg ${
            isLight ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            <ChefHat size={24} className="animate-bounce" />
          </div>
          <div>
            <h1 className={`text-lg sm:text-xl font-black uppercase tracking-wider flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}>
              KDS Cozinha (Módulo Produção)
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest animate-pulse border ${
                isLight ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                ÁREA QUENTE
              </span>
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-tight ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Foco total na produção — Apenas pedidos pendentes e em preparo, livres de logística
            </p>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-3">
          {/* Theme Mode Toggle (Modo Diurno / Noturno) */}
          <button
            onClick={toggleTheme}
            className={`p-2 px-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              isLight 
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-md hover:bg-amber-200' 
                : 'bg-indigo-950 text-indigo-300 border-indigo-800 hover:bg-indigo-900'
            }`}
            title="Alternar entre Modo Diurno (Claro) e Modo Noturno (Escuro)"
          >
            {isLight ? <Sun size={13} className="text-amber-600" /> : <Moon size={13} className="text-indigo-400" />}
            {isLight ? 'Modo Diurno' : 'Modo Noturno'}
          </button>

          {/* Sounds */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 px-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              soundEnabled 
                ? isLight
                  ? 'bg-amber-500 text-white border-amber-600 font-black shadow-md'
                  : 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/10' 
                : isLight
                  ? 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {soundEnabled ? 'Sons Ativos' : 'Sons Mudos'}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 px-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              isFullscreen 
                ? 'bg-indigo-600 text-white border-indigo-400 font-black shadow-lg shadow-indigo-600/30' 
                : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-200 border-slate-700/50 hover:bg-slate-700'
            }`}
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia (Ideal para Cozinha/TVs)"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
          </button>

          {showLogoutButton && onLogout && (
            <button
              onClick={onLogout}
              className="p-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl border border-rose-500/30 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-rose-950/20 active:scale-[0.98]"
            >
              <LogOut size={13} />
              Sair da Conta
            </button>
          )}

          {/* Mini Stats Banner */}
          <div className={`flex items-center gap-2 border p-1.5 px-3 rounded-xl shadow-inner font-mono text-xs font-black ${
            isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-950 border-slate-800 text-rose-400'
          }`}>
            <Flame size={14} className="text-rose-500 animate-pulse" />
            <span>{kitchenOrders.length} FILA</span>
          </div>
        </div>
      </div>

      {/* Subheader: Order Type Filters */}
      <div className={`border-b p-3 px-5 flex items-center justify-between gap-3 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800/60'
      }`}>
        <div className="flex items-center gap-2">
          <Utensils size={16} className={isLight ? 'text-rose-600' : 'text-rose-400'} />
          <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Fila de Produção da Cozinha
          </span>
        </div>

        {/* Order Type Filters */}
        <div className={`flex gap-1.5 p-1 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          {[
            { id: 'all', label: 'Todos os Pedidos', icon: Grid },
            { id: 'table', label: 'Mesa / Salão', icon: Smartphone },
            { id: 'takeout', label: 'Balcão', icon: ShoppingBag },
            { id: 'delivery', label: 'Delivery', icon: Bike }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeFilter === item.id 
                  ? 'bg-rose-600 text-white font-black shadow-md' 
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <item.icon size={13} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Production Board Grid */}
      <div className={`flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar relative min-h-0 ${
        isLight ? 'bg-slate-100/90' : 'bg-slate-950'
      }`}>
        {filteredKitchenOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredKitchenOrders.map(order => {
                const isPreparing = order.status === 'preparing';
                
                const itemsToDisplay = order.items;
                if (itemsToDisplay.length === 0) return null;

                const orderCheckedState = checkedItems[order.id] || {};
                const allItemsChecked = itemsToDisplay.length > 0 && itemsToDisplay.every((_, idx) => orderCheckedState[`${order.id}-${idx}`]);

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className={`border rounded-3xl flex flex-col overflow-hidden shadow-xl transition-all relative ${
                      isLight
                        ? isPreparing
                          ? 'bg-white border-indigo-300 shadow-indigo-100'
                          : 'bg-white border-slate-200 shadow-slate-200/60'
                        : isPreparing 
                          ? 'bg-slate-900 border-indigo-500/50 shadow-indigo-950/20' 
                          : 'bg-slate-900 border-slate-800 shadow-slate-950/40'
                    }`}
                  >
                    {/* Glowing Accent strip on left side */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPreparing ? 'bg-indigo-500' : 'bg-rose-500'}`} />

                    {/* Ticket Header */}
                    <div className={`p-4 border-b flex flex-col gap-2 pl-6 ${
                      isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800/80'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {order.type === 'table' ? '🍽️ SALÃO' : order.type === 'takeout' ? '🛍️ BALCÃO' : '🛵 DELIVERY'}
                          <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>•</span>
                          #{order.dailyNumber || order.id.slice(-4).toUpperCase()}
                          {order.isSettled ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                              ✓ PAGO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 border border-amber-500/30">
                              ⏳ A PAGAR
                            </span>
                          )}
                        </span>
                        <TimerBadge createdAt={order.createdAt} />
                      </div>

                      <div className="flex items-center justify-between">
                        <h3 className={`text-lg font-black tracking-tight uppercase truncate max-w-[70%] ${
                          isLight ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                          {getOrderIdentifier(order)}
                        </h3>
                        <span className={`text-xs font-mono font-bold ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Cooking Checklist items */}
                    <div className="flex-1 p-4 space-y-3.5">
                      <div className={`flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-b pb-1.5 ${
                        isLight ? 'text-slate-400 border-slate-200' : 'text-slate-500 border-slate-800/50'
                      }`}>
                        <span>PRATOS / INGREDIENTES</span>
                        <span>QTD</span>
                      </div>

                      <div className="space-y-3">
                        {itemsToDisplay.map((item, idx) => {
                          const itemKey = `${order.id}-${idx}`;
                          const isChecked = !!orderCheckedState[itemKey];

                          // Resolve product category accurately
                          let category = item.category;
                          if (!category && products && products.length > 0) {
                            let prod = products.find(p => p.id === item.productId);
                            if (!prod) {
                              const rawName = item.name || '';
                              const cleanName = rawName.split(' (')[0].split(' - ')[0].trim().toLowerCase();
                              const fullName = rawName.trim().toLowerCase();
                              prod = products.find(p => {
                                const pn = p.name.trim().toLowerCase();
                                return pn === cleanName || pn === fullName || cleanName.startsWith(pn) || fullName.includes(pn);
                              });
                            }
                            category = prod?.category;
                          }

                          return (
                            <div 
                              key={idx}
                              onClick={() => toggleItemChecked(order.id, itemKey)}
                              className={`flex items-start justify-between p-3 rounded-2xl cursor-pointer transition-all border text-sm gap-3 ${
                                isChecked 
                                  ? isLight
                                    ? 'bg-emerald-50 border-emerald-200 text-slate-400 line-through decoration-emerald-500/50'
                                    : 'bg-emerald-950/20 border-emerald-900/40 text-slate-400 line-through decoration-emerald-500/50' 
                                  : isLight
                                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                                    : 'bg-slate-950/60 border-slate-800/90 hover:bg-slate-850 hover:border-slate-700 text-slate-100'
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-1 transition-all ${
                                  isChecked 
                                    ? 'bg-emerald-500 border-emerald-400 text-white' 
                                    : isLight
                                      ? 'border-slate-300 text-transparent bg-white'
                                      : 'border-slate-700 text-transparent'
                                }`}>
                                  <Check size={13} strokeWidth={3} />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                                      isChecked ? 'text-slate-400 font-semibold' : isLight ? 'text-slate-900' : 'text-slate-100'
                                    }`}>
                                      {item.name}
                                    </span>
                                    {category && (
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                                        isLight 
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                          : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                                      }`}>
                                        {category}
                                      </span>
                                    )}
                                  </div>
                                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                                    <div className={`text-xs sm:text-sm space-y-0.5 font-bold pl-1 mt-0.5 ${
                                      isLight ? 'text-slate-600' : 'text-slate-400'
                                    }`}>
                                      {item.selectedOptions.map((opt, oIdx) => (
                                        <p key={oIdx}>+ {opt.name}</p>
                                      ))}
                                    </div>
                                  )}
                                  {item.observation && (
                                    <p className={`text-xs sm:text-sm font-black border px-2.5 py-1 rounded-xl w-fit mt-1.5 shadow-sm ${
                                      isLight 
                                        ? 'text-rose-700 bg-rose-50 border-rose-200' 
                                        : 'text-rose-300 bg-rose-950/40 border-rose-500/40'
                                    }`}>
                                      OBS: {item.observation}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className={`font-black text-sm sm:text-base px-2.5 py-1 rounded-xl shrink-0 border ${
                                isChecked 
                                  ? isLight 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' 
                                  : isLight
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30 shadow'
                              }`}>
                                {item.quantity}x
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className={`p-3 border-t grid grid-cols-2 gap-2 ${
                      isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/30 border-slate-800/80'
                    }`}>
                      {/* Preparando Toggle */}
                      {!isPreparing ? (
                        <button
                          onClick={() => onUpdateStatus(order.id, 'preparing')}
                          className={`col-span-2 py-2.5 border rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                            isLight
                              ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/30 text-indigo-400'
                          }`}
                        >
                          <Play size={12} className="animate-pulse fill-current" />
                          Iniciar Preparo
                        </button>
                      ) : (
                        <div className={`col-span-2 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-widest border rounded-xl ${
                          isLight
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-indigo-950/20 border-indigo-900/30 text-indigo-400'
                        }`}>
                          <Coffee size={12} className="animate-spin" />
                          EM PREPARAÇÃO
                        </div>
                      )}

                      {/* Finish Production Action */}
                      <button
                        onClick={() => {
                          // Complete cooking order - promote to ready
                          onUpdateStatus(order.id, 'ready');
                        }}
                        className={`col-span-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                          allItemsChecked
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]'
                            : isLight
                              ? 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-750'
                        }`}
                      >
                        <CheckCircle2 size={13} />
                        Pronto (Despachar)
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className={`absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <ChefHat size={64} className="mb-4 stroke-1 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Cozinha livre! Nenhum pedido na fila</p>
          </div>
        )}
      </div>

      {/* Footer Instruction Label */}
      <div className={`border-t p-3 px-5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider ${
        isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-500'
      }`}>
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-rose-500 animate-pulse" />
          Marque os itens à medida que são cozidos. Clique em "Pronto" para enviar ao painel de retiradas!
        </span>
        <span className="font-mono text-[9px]">
          KitchenFlow AI Cozinha v1.2
        </span>
      </div>
    </div>
  );
};
