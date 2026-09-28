import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order, Product, Table } from '../types';
import { 
  ChefHat, Clock, CheckCircle2, Volume2, VolumeX, 
  Maximize2, Minimize2, Sun, Moon, LogOut
} from 'lucide-react';
import { formatOrderNumber, getOrderNumericId, deduplicateOrders } from '../utils/deduplicate';
import { logDiagnostic } from '../services/orderService';

interface KDSKitchenOnlyProps {
  orders: Order[];
  products: Product[];
  tables: Table[];
  onUpdateStatus: (id: string, status: 'pending' | 'preparing' | 'ready') => void;
  onLogout?: () => void;
  showLogoutButton?: boolean;
}

type FilterType = 'all' | 'table' | 'takeout' | 'delivery' | 'retirada';

// Helper seguro para converter datas (Date, string, Firestore Timestamp) para Date
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

const isToday = (date: any): boolean => {
  const d = safeParseDate(date);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

export const KDSKitchenOnly: React.FC<KDSKitchenOnlyProps> = ({ 
  orders, 
  products, 
  tables, 
  onUpdateStatus,
  onLogout,
  showLogoutButton = false
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement));
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kds_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
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

  // Keep track of order count to trigger chime on new orders
  const prevOrdersCountRef = useRef<number>(0);

  // 1. Filtrar apenas pedidos ativos em produção na cozinha (exclui cancelados, prontos, entregues e finalizados)
  const kitchenOrders = useMemo(() => {
    const validOrders = deduplicateOrders(orders).filter(o => {
      if (!o) return false;
      if (o.isSubTicket || o.mergedIntoOrderId) return false;
      // Pedidos já prontos, despachados, entregues ou cancelados NÃO ficam na cozinha de produção
      if (o.status === 'ready' || o.status === 'delivering' || o.status === 'delivered' || o.status === 'finished' || o.status === 'cancelled') {
        return false;
      }
      if (o.kitchenStatus === 'ready' || o.kitchenStatus === 'delivered') {
        return false;
      }
      const isKitchenStatus = o.status === 'pending' || o.status === 'preparing' || o.kitchenStatus === 'pending' || o.kitchenStatus === 'preparing';
      return isKitchenStatus;
    });

    // Se houver múltiplos registros de pedidos abertos para a mesma mesa no mesmo dia,
    // consolidamos em um único cartão na cozinha para visualização unificada e sem duplicidade!
    const tableOrdersMap = new Map<string, Order & { mergedOrderIds?: string[] }>();
    const result: (Order & { mergedOrderIds?: string[] })[] = [];

    for (const order of validOrders) {
      if (order.type === 'table' && order.tableNumber) {
        const tableKey = String(order.tableNumber);
        if (tableOrdersMap.has(tableKey)) {
          const existing = tableOrdersMap.get(tableKey)!;
          const mergedItems = [...(existing.items || [])];
          for (const item of (order.items || [])) {
            const idx = mergedItems.findIndex(i => i.id === item.id || (i.productId === item.productId && i.name === item.name && (i.observation || '') === (item.observation || '')));
            if (idx !== -1) {
              mergedItems[idx] = { ...mergedItems[idx], ...item };
            } else {
              mergedItems.push({ ...item, isNew: true });
            }
          }
          existing.items = mergedItems;
          existing.total = mergedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
          if (!existing.mergedOrderIds) {
            existing.mergedOrderIds = [existing.id];
          }
          if (!existing.mergedOrderIds.includes(order.id)) {
            existing.mergedOrderIds.push(order.id);
          }
          continue;
        } else {
          const clone = { ...order, items: [...(order.items || [])], mergedOrderIds: [order.id] };
          tableOrdersMap.set(tableKey, clone);
          result.push(clone);
        }
      } else {
        result.push({ ...order, items: [...(order.items || [])], mergedOrderIds: [order.id] });
      }
    }

    return result;
  }, [orders]);

  // Contadores para o cabeçalho compacto
  const readyTodayCount = useMemo(() => {
    return orders.filter(o => 
      (o.status === 'ready' || o.status === 'delivering' || o.status === 'delivered' || o.status === 'finished') &&
      isToday(o.createdAt)
    ).length;
  }, [orders]);

  // Log de diagnóstico de pedidos renderizados no KDS Cozinha
  useEffect(() => {
    if (kitchenOrders && kitchenOrders.length > 0) {
      kitchenOrders.forEach(order => {
        logDiagnostic('KDS_ORDER_RENDERED', {
          tenant_id: order.tenantId,
          store_id: order.storeId,
          order_id: order.id,
          status: order.status,
          table: order.tableNumber,
          items_count: order.items?.length || 0,
          timestamp: new Date().toISOString()
        });
      });
    }
  }, [kitchenOrders]);

  // Estações / Praças da cozinha baseadas nas categorias de produtos
  const stations = useMemo(() => {
    const categories = new Set<string>();
    products.forEach(p => {
      if (p.category) {
        categories.add(p.category);
      }
    });
    return ['all', ...Array.from(categories)];
  }, [products]);

  // Filtro de pedidos por tipo e estação
  const filteredKitchenOrders = useMemo(() => {
    const list = kitchenOrders.filter(order => {
      // 1. Filtro por tipo (TODOS, SALÃO, BALCÃO, DELIVERY, RETIRADA)
      if (filterType !== 'all') {
        const isRetirada = (order.deliveryMethod === 'retirada') || 
                           (typeof order.tableNumber === 'string' && order.tableNumber.toLowerCase().includes('retirada'));
        
        if (filterType === 'retirada') {
          if (!isRetirada) return false;
        } else if (filterType === 'table') {
          if (order.type !== 'table' && order.type !== 'dine_in') return false;
        } else if (filterType === 'delivery') {
          if (order.type !== 'delivery') return false;
        } else if (filterType === 'takeout') {
          if ((order.type !== 'takeout' && order.type !== 'counter') || isRetirada) return false;
        }
      }

      // 2. Filtro por praça / estação
      if (selectedStation !== 'all') {
        const hasMatchingItem = (order.items || []).some(item => {
          const prod = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.split(' (')[0].trim().toLowerCase());
          return prod?.category === selectedStation;
        });
        if (!hasMatchingItem) return false;
      }

      return true;
    });

    // Ordenação FIFO (primeiro que entra é o primeiro a ser produzido)
    return list.sort((a, b) => {
      const dateA = safeParseDate(a.createdAt);
      const dateB = safeParseDate(b.createdAt);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      const dailyA = a.dailyNumber || 0;
      const dailyB = b.dailyNumber || 0;
      if (dailyA !== dailyB) return dailyA - dailyB;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [kitchenOrders, filterType, selectedStation, products]);

  // Alerta sonoro quando um novo pedido entra na cozinha
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
      playTone(523.25, now, 0.15); // C5
      playTone(659.25, now + 0.15, 0.15); // E5
      playTone(783.99, now + 0.3, 0.3); // G5
    } catch (e) {
      console.warn("Could not play sound: ", e);
    }
  };

  // Helper para resolver a etiqueta visual de Mesa ou Destino com alto destaque
  const getDestinationInfo = (order: Order) => {
    const isRetirada = (order.deliveryMethod === 'retirada') || 
                       (typeof order.tableNumber === 'string' && order.tableNumber.toLowerCase().includes('retirada'));

    if (isRetirada) {
      return {
        label: '📦 RETIRADA',
        sub: order.customerName ? order.customerName.toUpperCase() : null
      };
    }

    if (order.type === 'table' || order.type === 'dine_in' || (!order.type && order.tableNumber)) {
      const tNum = String(order.tableNumber || '');
      let tableNumStr = tNum;
      if (tNum.length < 5 && !isNaN(Number(tNum))) {
        const n = parseInt(tNum, 10);
        tableNumStr = isNaN(n) ? tNum : (n < 10 ? `0${n}` : `${n}`);
      } else {
        const tableRef = tables.find(t => t.id === order.tableNumber || (t as any).docId === order.tableNumber);
        if (tableRef) {
          const n = Number(tableRef.number);
          tableNumStr = !isNaN(n) ? (n < 10 ? `0${n}` : `${n}`) : String(tableRef.number);
        } else if (tNum.length > 4) {
          tableNumStr = tNum.slice(-2);
        }
      }
      return {
        label: `🪑 MESA ${tableNumStr}`,
        sub: order.customerName ? order.customerName.toUpperCase() : null
      };
    }

    if (order.type === 'delivery') {
      return {
        label: '🛵 DELIVERY',
        sub: order.customerName ? order.customerName.toUpperCase() : null
      };
    }

    // Balcão
    return {
      label: '🛍️ BALCÃO',
      sub: order.customerName ? order.customerName.toUpperCase() : null
    };
  };

  // Componente de Tempo Decorrido com semáforo progressivo
  const ElapsedTimer: React.FC<{ createdAt: Date }> = React.memo(({ createdAt }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setTick(t => t + 1);
      }, 10000); // Atualiza o cronômetro a cada 10s
      return () => clearInterval(interval);
    }, []);

    const createdDate = safeParseDate(createdAt);
    const minutes = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60000));

    // Semáforo visual: normal (<10 min) -> amarelo/atenção (10-20 min) -> vermelho/atrasado (>20 min)
    let badgeClass = isLight 
      ? 'bg-slate-100 text-slate-900 border-slate-300 font-black' 
      : 'bg-zinc-800 text-zinc-100 border-zinc-700 font-black';

    if (minutes >= 10 && minutes < 20) {
      badgeClass = isLight 
        ? 'bg-amber-100 text-amber-950 border-amber-300 font-black' 
        : 'bg-amber-950/70 text-amber-300 border-amber-700/80 font-bold';
    } else if (minutes >= 20) {
      badgeClass = isLight
        ? 'bg-rose-100 text-rose-950 border-rose-300 font-black'
        : 'bg-rose-950/80 text-rose-300 border-rose-700 font-black';
    }

    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs sm:text-sm font-black tabular-nums tracking-wide shadow-xs ${badgeClass}`}>
        <Clock size={13} className="shrink-0 stroke-[2.5]" />
        <span>{minutes} min</span>
      </div>
    );
  });

  // Ação operacional única: DESPACHAR o pedido
  const handleDispatch = (order: Order & { mergedOrderIds?: string[] }) => {
    const idsToUpdate = order.mergedOrderIds && Array.isArray(order.mergedOrderIds)
      ? order.mergedOrderIds
      : [order.id];

    idsToUpdate.forEach((oid: string) => {
      onUpdateStatus(oid, 'ready');
    });
  };

  return (
    <div 
      style={{ touchAction: 'manipulation' }}
      className={`flex flex-col flex-1 rounded-2xl border shadow-xl overflow-hidden h-full min-h-0 select-none transition-colors duration-200 touch-manipulation overscroll-contain ${
        isLight ? 'bg-slate-100 text-slate-950 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
      }`}
    >
      
      {/* ─────────────────────────────────────────────────────────────
          1. CABEÇALHO COMPACTO
          Ocupa espaço vertical mínimo, priorizando a visibilidade dos cards
      ───────────────────────────────────────────────────────────── */}
      <header className={`px-4 py-2.5 sm:px-6 flex items-center justify-between border-b gap-3 shrink-0 ${
        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
      }`}>
        {/* Título & Métricas de Produção */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-950/60 text-emerald-400'
            }`}>
              <ChefHat size={20} className="stroke-[2.2]" />
            </div>
            <h1 className={`text-base sm:text-lg font-black tracking-tight uppercase ${
              isLight ? 'text-slate-950' : 'text-zinc-50'
            }`}>
              Cozinha
            </h1>
          </div>

          {/* Contadores da Cozinha */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
              kitchenOrders.length > 0
                ? isLight 
                  ? 'bg-amber-100 text-amber-950 border-amber-300 font-black' 
                  : 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                : isLight
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-zinc-850 text-zinc-400 border-zinc-700/60'
            }`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>{kitchenOrders.length} em produção</span>
            </div>

            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
              isLight ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}>
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>{readyTodayCount} prontos hoje</span>
            </div>
          </div>
        </div>

        {/* Controles do Operador: Som, Modo Claro/Escuro, Tela Cheia, Sair */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Som Ativo/Mudo */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              soundEnabled
                ? isLight
                  ? 'bg-slate-100 text-slate-950 border-slate-300 hover:bg-slate-200'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                : isLight
                  ? 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800 line-through'
            }`}
            title={soundEnabled ? 'Sons de novos pedidos ativados' : 'Sons silenciados'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden lg:inline">{soundEnabled ? 'Som' : 'Mudo'}</span>
          </button>

          {/* Alternar Modo Claro / Noturno */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              isLight 
                ? 'bg-slate-100 text-slate-950 border-slate-300 hover:bg-slate-200 font-black' 
                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
            title={isLight ? 'Ativar modo noturno' : 'Ativar modo diurno'}
          >
            {isLight ? <Moon size={16} className="text-indigo-600" /> : <Sun size={16} className="text-amber-400" />}
            <span className="hidden lg:inline">{isLight ? 'Escuro' : 'Claro'}</span>
          </button>

          {/* Modo Tela Cheia */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              isFullscreen
                ? 'bg-emerald-600 text-white border-emerald-500 font-black'
                : isLight
                  ? 'bg-slate-100 text-slate-950 border-slate-300 hover:bg-slate-200'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
            title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="hidden lg:inline">{isFullscreen ? 'Janela' : 'Tela cheia'}</span>
          </button>

          {/* Sair da Conta (Se exibido em KDS isolado de tablet) */}
          {showLogoutButton && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTROS COMPACTOS (TODOS | SALÃO | BALCÃO | DELIVERY | RETIRADA)
      ───────────────────────────────────────────────────────────── */}
      <div className={`px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-b shrink-0 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800/80'
      }`}>
        {/* Segmented Control de Destino */}
        <div className={`inline-flex p-1 rounded-xl border gap-1 max-w-full overflow-x-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
        }`}>
          {[
            { id: 'all' as const, label: 'TODOS' },
            { id: 'table' as const, label: '🪑 SALÃO' },
            { id: 'takeout' as const, label: '🛍️ BALCÃO' },
            { id: 'delivery' as const, label: '🛵 DELIVERY' },
            { id: 'retirada' as const, label: '📦 RETIRADA' }
          ].map(f => {
            const isActive = filterType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-950 shadow-xs'
                    : isLight
                      ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-bold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Seletor Compacto de Praça / Estação (caso haja mais de uma categoria cadastrada) */}
        {stations.length > 2 && (
          <div className="flex items-center gap-2">
            <label htmlFor="station-select" className={`text-xs font-bold uppercase tracking-wider hidden sm:inline ${
              isLight ? 'text-slate-700' : 'text-zinc-300'
            }`}>
              Praça:
            </label>
            <select
              id="station-select"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className={`min-h-[38px] px-3 py-1 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-950' 
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <option value="all">Todas as Praças</option>
              {stations.filter(s => s !== 'all').map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. GRID RESPONSIVO DE PEDIDOS
          Desktop grande: 4 colunas
          Notebook: 3 colunas
          Tablet horizontal: 2 colunas
          Tablet vertical / mobile: 1 coluna
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto custom-scrollbar relative min-h-0">
        {filteredKitchenOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredKitchenOrders.map(order => {
                const itemsToDisplay = order.items || [];
                if (itemsToDisplay.length === 0) return null;

                const destInfo = getDestinationInfo(order);

                return (
                  <motion.article
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.15 }}
                    className={`rounded-2xl border shadow-sm flex flex-col h-[480px] max-h-[520px] overflow-hidden transition-all ${
                      isLight 
                        ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-950' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-50'
                    }`}
                  >
                    {/* ─────────────────────────────────────────────
                        TOPO DO CARD: HIERARQUIA VISUAL
                        1. NÚMERO DO PEDIDO (#1024) - Tipografia gigante
                        2. MESA / DESTINO (🪑 MESA 03) - Destaque equivalente
                        3. TEMPO (18 min) - Semáforo progressivo
                    ───────────────────────────────────────────── */}
                    <header className={`p-4 border-b flex flex-col gap-2 shrink-0 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-850/60 border-zinc-800'
                    }`}>
                      {/* Linha 1: Número do Pedido + Tempo Decorrido */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            isLight ? 'text-slate-600' : 'text-zinc-400'
                          }`}>
                            PEDIDO
                          </span>
                          <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                            isLight ? 'text-slate-950 font-black' : 'text-zinc-50'
                          }`}>
                            {formatOrderNumber(order)}
                          </span>
                        </div>

                        {/* Cronômetro com semáforo */}
                        <ElapsedTimer createdAt={order.createdAt} />
                      </div>

                      {/* Linha 2: Mesa / Destino em grande destaque */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className={`text-lg sm:text-xl font-black tracking-tight truncate uppercase ${
                            isLight ? 'text-slate-950' : 'text-zinc-50'
                          }`}>
                            {destInfo.label}
                          </h2>
                          {destInfo.sub && (
                            <span className={`text-xs font-bold truncate uppercase ${
                              isLight ? 'text-slate-700 font-extrabold' : 'text-zinc-300'
                            }`}>
                              · {destInfo.sub}
                            </span>
                          )}
                        </div>

                        {/* Status de pagamento discreto */}
                        {order.isSettled ? (
                          <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isLight ? 'text-emerald-800 font-extrabold' : 'text-emerald-400'
                          }`}>
                            ✓ PAGO
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isLight ? 'text-amber-800 font-extrabold' : 'text-amber-400'
                          }`}>
                            A RECEBER
                          </span>
                        )}
                      </div>
                    </header>

                    {/* ─────────────────────────────────────────────
                        CORPO DO CARD: ITENS DO PEDIDO
                        Legibilidade máxima: "1× LA ITALIANO"
                        Sem checkboxes, sem confirmações individuais
                    ───────────────────────────────────────────── */}
                    <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                      {/* Observação Geral do Pedido (se houver) */}
                      {(order.notes || order.observation) && (
                        <div className={`p-2.5 rounded-xl border text-xs font-bold leading-relaxed ${
                          isLight 
                            ? 'bg-amber-100 text-amber-950 border-amber-300' 
                            : 'bg-amber-950/50 text-amber-200 border-amber-800/60'
                        }`}>
                          <span className={`font-black mr-1 ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>OBS:</span>
                          {order.notes || order.observation}
                        </div>
                      )}

                      {/* Lista de Itens */}
                      <div className="space-y-3">
                        {itemsToDisplay.map((item, idx) => {
                          const isMulti = item.quantity > 1;

                          return (
                            <div key={item.id || `${order.id}-${idx}`} className="flex flex-col">
                              {/* Linha Principal do Item: 1× NOME DO PRATO */}
                              <div className="flex items-start gap-2">
                                <span className={`text-base sm:text-lg font-black shrink-0 select-none ${
                                  isMulti 
                                    ? isLight ? 'text-amber-800' : 'text-amber-400' 
                                    : isLight ? 'text-emerald-700' : 'text-emerald-400'
                                }`}>
                                  {item.quantity}×
                                </span>
                                
                                <div className="flex-1 min-w-0">
                                  <span className={`text-base sm:text-lg font-black tracking-tight uppercase leading-snug break-words ${
                                    isLight ? 'text-slate-950' : 'text-zinc-50'
                                  }`}>
                                    {item.name}
                                  </span>

                                  {/* Opções e Adicionais do Prato */}
                                  {item.options && item.options.length > 0 && (
                                    <div className="mt-1 pl-1 space-y-0.5">
                                      {item.options.map((opt, oIdx) => (
                                        <div 
                                          key={oIdx} 
                                          className={`text-xs font-bold flex items-center gap-1.5 ${
                                            isLight ? 'text-slate-800' : 'text-zinc-300'
                                          }`}
                                        >
                                          <span>+ {opt.quantity && opt.quantity > 1 ? `${opt.quantity}× ` : ''}{opt.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Observação Específica do Item */}
                                  {item.observation && (
                                    <div className={`mt-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold w-fit ${
                                      isLight 
                                        ? 'bg-amber-100 text-amber-950 border-amber-300' 
                                        : 'bg-amber-950/50 text-amber-200 border-amber-800/60'
                                    }`}>
                                      OBS: {item.observation}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────
                        RODAPÉ DO CARD: BOTÃO DESPACHAR
                        Área de toque ampla (h-14 / 56px), confortável para tablet
                        Única ação operacional do card
                    ───────────────────────────────────────────── */}
                    <footer className={`p-3 border-t shrink-0 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-850/60 border-zinc-800'
                    }`}>
                      <button
                        type="button"
                        onClick={() => handleDispatch(order)}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm sm:text-base uppercase tracking-widest rounded-xl flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
                        title="Marcar pedido como pronto e despachar para retirada/entrega"
                      >
                        <CheckCircle2 size={22} className="stroke-[2.5]" />
                        <span>DESPACHAR</span>
                      </button>
                    </footer>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Estado Vazio: Cozinha limpa e sem pedidos pendentes */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
              isLight ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800/80 text-zinc-400'
            }`}>
              <ChefHat size={44} className="stroke-[1.8] animate-pulse" />
            </div>
            <h2 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${
              isLight ? 'text-slate-950' : 'text-zinc-50'
            }`}>
              Cozinha em Dia
            </h2>
            <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider mt-1 max-w-sm ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}>
              Nenhum pedido aguardando produção no momento. Novos pedidos entrarão automaticamente na tela.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
