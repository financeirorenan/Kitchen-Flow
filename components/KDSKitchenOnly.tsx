import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order, OrderItem, Product, Table } from '../types';
import { 
  ChefHat, Clock, CheckCircle2, AlertTriangle, Play, Check, 
  Sparkles, Coffee, Flame, Utensils, Award, RefreshCw, Volume2, VolumeX, Grid, Smartphone, ShoppingBag, Bike, LogOut
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
  
  // Track checked items per order in local state so cooks can mark specific dishes as completed
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<string, boolean>>>({});
  
  // Keep track of order count to trigger chime on new orders
  const prevOrdersCountRef = useRef<number>(0);

  // Filter orders to only pending/preparing (to-be-produced)
  const kitchenOrders = useMemo(() => {
    // Keep only recent pending/preparing orders (from last 12 hours) to avoid clutter
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return orders.filter(o => 
      (o.status === 'pending' || o.status === 'preparing') && 
      new Date(o.createdAt) > twelveHoursAgo
    );
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
  const getElapsedTimeInfo = (createdAt: Date) => {
    const minutes = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    let colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    let label = 'Recém enviado';

    if (minutes >= 10 && minutes < 20) {
      colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      label = 'Alerta de Tempo';
    } else if (minutes >= 20) {
      colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse';
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
    <div className="flex flex-col flex-1 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl overflow-hidden h-full min-h-0 select-none">
      
      {/* Top Header Panel */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20 shadow-lg">
            <ChefHat size={24} className="animate-bounce" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
              KDS Cozinha (Módulo Produção)
              <span className="px-2.5 py-0.5 rounded-full text-[9px] bg-rose-500/10 border border-rose-500/25 text-rose-400 font-extrabold tracking-widest animate-pulse">
                ÁREA QUENTE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              Foco total na produção — Apenas pedidos pendentes e em preparo, livres de logística
            </p>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-3">
          {/* Sounds */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 px-3.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              soundEnabled 
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/10' 
                : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {soundEnabled ? 'Sons Ativos' : 'Sons Mudos'}
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
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 px-3 rounded-xl shadow-inner font-mono text-xs font-black text-rose-400">
            <Flame size={14} className="text-rose-500 animate-pulse" />
            <span>{kitchenOrders.length} FILA</span>
          </div>
        </div>
      </div>

      {/* Subheader: Categories / Production Stations & Order Types */}
      <div className="bg-slate-900/60 border-b border-slate-800/60 p-3 px-5 flex flex-wrap items-center justify-between gap-3">
        {/* Stations/Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 custom-scrollbar">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-2 shrink-0">
            Posto / Categoria:
          </span>
          {stations.map(station => (
            <button
              key={station}
              onClick={() => setSelectedStation(station)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                selectedStation === station
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {station === 'all' ? '🍽️ Todos os Itens' : station}
            </button>
          ))}
        </div>

        {/* Order Type Filters */}
        <div className="flex gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          {[
            { id: 'all', label: 'Todos', icon: Grid },
            { id: 'table', label: 'Mesa/Salão', icon: Smartphone },
            { id: 'takeout', label: 'Balcão', icon: ShoppingBag },
            { id: 'delivery', label: 'Delivery', icon: Bike }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeFilter === item.id 
                  ? 'bg-rose-600 text-white font-black shadow' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Production Board Grid */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950 custom-scrollbar relative min-h-0">
        {filteredKitchenOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredKitchenOrders.map(order => {
                const isPreparing = order.status === 'preparing';
                
                // Get items belonging to the selected station/category (if filtered)
                const itemsToDisplay = order.items.filter(item => {
                  if (selectedStation === 'all') return true;
                  const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.split(' (')[0].trim().toLowerCase());
                  return prod?.category === selectedStation;
                });

                if (itemsToDisplay.length === 0) return null;

                const orderCheckedState = checkedItems[order.id] || {};
                const allItemsChecked = itemsToDisplay.every((_, idx) => orderCheckedState[`${order.id}-${idx}`]);

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className={`bg-slate-900 border rounded-3xl flex flex-col overflow-hidden shadow-xl transition-all relative ${
                      isPreparing 
                        ? 'border-indigo-500/50 shadow-indigo-950/20' 
                        : 'border-slate-800 shadow-slate-950/40'
                    }`}
                  >
                    {/* Glowing Accent strip on left side */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPreparing ? 'bg-indigo-500' : 'bg-rose-500'}`} />

                    {/* Ticket Header */}
                    <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex flex-col gap-2 pl-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          {order.type === 'table' ? '🍽️ SALÃO' : order.type === 'takeout' ? '🛍️ BALCÃO' : '🛵 DELIVERY'}
                          <span className="text-slate-700">•</span>
                          #{order.dailyNumber || order.id.slice(-4).toUpperCase()}
                        </span>
                        <TimerBadge createdAt={order.createdAt} />
                      </div>

                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-100 tracking-tight uppercase truncate max-w-[70%]">
                          {getOrderIdentifier(order)}
                        </h3>
                        <span className="text-[9px] font-mono font-bold text-slate-500">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Cooking Checklist items */}
                    <div className="flex-1 p-4 space-y-3.5">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800/50 pb-1.5">
                        <span>Ingredientes / Pratos</span>
                        <span>QTD</span>
                      </div>

                      <div className="space-y-3">
                        {itemsToDisplay.map((item, idx) => {
                          const itemKey = `${order.id}-${idx}`;
                          const isChecked = !!orderCheckedState[itemKey];

                          // Resolve the product category for this item
                          const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.split(' (')[0].trim().toLowerCase());
                          const category = prod?.category;

                          return (
                            <div 
                              key={idx}
                              onClick={() => toggleItemChecked(order.id, itemKey)}
                              className={`flex items-start justify-between p-2 rounded-2xl cursor-pointer transition-all border text-xs gap-3 ${
                                isChecked 
                                  ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-400 line-through decoration-emerald-500/50' 
                                  : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1">
                                <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  isChecked 
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                                    : 'border-slate-700 text-transparent'
                                }`}>
                                  <Check size={11} strokeWidth={3} />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`font-semibold ${isChecked ? 'text-slate-500 font-normal' : 'text-slate-100'}`}>
                                      {item.name}
                                    </span>
                                    {category && (
                                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-extrabold text-indigo-400 uppercase tracking-wider">
                                        {category}
                                      </span>
                                    )}
                                  </div>
                                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                                    <div className="text-[10px] text-slate-500 space-y-0.5 font-bold pl-1">
                                      {item.selectedOptions.map((opt, oIdx) => (
                                        <p key={oIdx}>+ {opt.name}</p>
                                      ))}
                                    </div>
                                  )}
                                  {item.observation && (
                                    <p className="text-[9px] font-black text-rose-400 bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded-lg w-fit mt-1">
                                      OBS: {item.observation}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className={`font-black text-[11px] px-1.5 py-0.5 rounded-md shrink-0 ${
                                isChecked 
                                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/20' 
                                  : 'bg-slate-900 text-indigo-400 border border-slate-800'
                              }`}>
                                {item.quantity}x
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="p-3 bg-slate-900/30 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                      {/* Preparando Toggle */}
                      {!isPreparing ? (
                        <button
                          onClick={() => onUpdateStatus(order.id, 'preparing')}
                          className="col-span-2 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                        >
                          <Play size={12} className="animate-pulse fill-indigo-400" />
                          Iniciar Preparo
                        </button>
                      ) : (
                        <div className="col-span-2 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-950/20 border border-indigo-900/30 rounded-xl">
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
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]'
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
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none text-slate-500">
            <ChefHat size={64} className="mb-4 stroke-1 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Cozinha livre! Nenhum pedido na fila</p>
          </div>
        )}
      </div>

      {/* Footer Instruction Label */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 px-5 flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
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
