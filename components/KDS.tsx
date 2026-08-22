import React, { useMemo, useState, memo, useCallback } from 'react';
import { Order, OrderStatus, Courier, Product, AdminSettings, Table, CashSession } from '../types';
import { 
  Clock, Check, CheckCircle2, Smartphone, 
  User, Truck, Package, Flag, ChevronRight, 
  ChefHat, Timer, Bike, AlertCircle, X,
  Edit, Plus, Minus, Trash2, Search, CreditCard, Printer, Share2, ShoppingBag, MapPin, Phone,
  Store, XCircle, Receipt, Maximize2, Minimize2, ArrowLeft, ArrowRight
} from 'lucide-react';
import { generateReceiptHtml, handlePrintOrder } from '../services/printService';
import EditOrderModal from './EditOrderModal';

interface KDSProps {
  orders: Order[];
  couriers: Courier[];
  products: Product[];
  adminSettings: AdminSettings;
  tables: Table[];
  cashSession?: CashSession;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onAssignCourier: (orderId: string, courierId: string) => void;
  onUpdateOrder: (id: string, updates: Partial<Order>) => void;
  onEditOrderInPDV: (order: Order) => void;
  onUpdateLogisticsSettings: (settings: Partial<AdminSettings>) => void;
  onNavigate: (tab: string) => void;
}

const safeParseDate = (raw: any): Date | null => {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    return new Date(raw.seconds * 1000);
  }
  if (typeof raw?.toDate === 'function') {
    return raw.toDate();
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const isToday = (date: any) => {
  const d = safeParseDate(date);
  if (!d) return false;
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'preparing': return { label: 'Cozinha', icon: ChefHat, color: 'text-rose-600', dotColor: 'bg-rose-500', bg: 'bg-slate-50' };
    case 'ready': return { label: 'Aguardando entrega', icon: Package, color: 'text-amber-600', dotColor: 'bg-amber-500', bg: 'bg-slate-50' };
    case 'delivering': return { label: 'Saiu p/ entrega ou Aguardando cliente', icon: Bike, color: 'text-indigo-600', dotColor: 'bg-indigo-500', bg: 'bg-slate-50' };
    case 'delivered': return { label: 'Finalizados (Turno Caixa)', icon: Flag, color: 'text-emerald-600', dotColor: 'bg-emerald-500', bg: 'bg-emerald-50/10' };
    case 'cancelled': return { label: 'Cancelados', icon: XCircle, color: 'text-slate-400', dotColor: 'bg-slate-400', bg: 'bg-slate-50' };
    default: return { label: 'Status', icon: Clock, color: 'text-slate-500', dotColor: 'bg-slate-500', bg: 'bg-slate-50' };
  }
};

// Top-level memoized OrderCard component to prevent unmounting/remounting on parent re-renders
interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  products: Product[];
  couriers: Courier[];
  tables: Table[];
  adminSettings: AdminSettings;
  onEditOrderInPDV: (order: Order) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onAdvance: (order: Order) => void;
  onBack: (order: Order) => void;
  onOpenDispatchModal: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = memo(({
  order,
  isSelected,
  onToggleSelect,
  products,
  couriers,
  tables,
  adminSettings,
  onEditOrderInPDV,
  onUpdateStatus,
  onAdvance,
  onBack,
  onOpenDispatchModal,
}) => {
  const createdDate = safeParseDate(order.createdAt) || new Date();
  const timeElapsed = Math.floor((Date.now() - createdDate.getTime()) / 60000);
  const courier = couriers.find(c => c.id === order.courierId);

  // Resolver número da mesa se for ID técnico ou antigo
  const resolvedTableLabel = useMemo(() => {
    if (order.type !== 'table') return null;
    
    const tNum = String(order.tableNumber);
    if (tNum.length < 5 && !isNaN(Number(tNum))) return tNum;

    const tableRef = tables.find(t => t.id === order.tableNumber || (t as any).docId === order.tableNumber);
    return tableRef ? String(tableRef.number) : tNum.slice(-4);
  }, [order.tableNumber, order.type, tables]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    if (!order.items || order.items.length === 0) return {};
    return order.items.reduce<Record<string, typeof order.items>>((acc, item) => {
      let category = item.category;
      if (!category && products && products.length > 0) {
        let prod = item.productId ? products.find(p => p.id === item.productId) : null;
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
      const finalCat = category || 'Geral';
      if (!acc[finalCat]) {
        acc[finalCat] = [];
      }
      acc[finalCat].push(item);
      return acc;
    }, {});
  }, [order.items, products]);

  const canGoBack = order.status !== 'pending' && order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'finished';
  const canAdvance = order.status !== 'delivered' && order.status !== 'finished' && order.status !== 'cancelled';

  return (
    <div 
      className={`bg-white border rounded-xl shadow-sm transition-all text-slate-800 ${
        isSelected ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-3.5 space-y-3">
        {/* Header do Card */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={() => onToggleSelect(order.id)}
              className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0" 
            />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-slate-800 text-sm truncate">
                #{order.dailyNumber || String(order?.id || '').slice(-4).toUpperCase()} - {order.customerName || 'Consumidor não identificado'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                Desde {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({timeElapsed >= 0 ? timeElapsed : 0}m)
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{createdDate.toLocaleDateString()}</p>
          </div>
        </div>

        {/* Localização / Área e Badges */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              order.type === 'delivery' 
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                : order.type === 'takeout' 
                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {order.type === 'delivery' ? '🛵 Delivery' : order.type === 'takeout' ? '🛍️ Balcão' : `🍽️ Mesa ${resolvedTableLabel || order.tableNumber}`}
            </span>

            {order.source === 'marketplace' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                Site Delivery
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(order.isSettled || order.paymentStatus === 'paid') && (
              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                💰 PAGO
              </span>
            )}
            {((order as any).currentBatch > 1 || order.items.some(i => (i as any).batchNumber > 1)) && (
              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-amber-500 text-white border border-amber-600">
                ⚡ NOVO LOTE
              </span>
            )}
          </div>
        </div>

        {/* Itens do Pedido */}
        {order.items && order.items.length > 0 && (
          <div className="border-t border-slate-100 pt-2 space-y-2.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            <p className="text-[9px] font-black tracking-wider uppercase text-slate-400">Itens do Pedido ({order.items.length})</p>
            <div className="space-y-2.5">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <p className="text-[8.5px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded w-fit border border-indigo-100">
                    {category}
                  </p>
                  <div className="space-y-1 pl-1">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex flex-col text-slate-800 text-xs py-0.5">
                        <div className="flex items-start gap-2">
                          <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] min-w-[20px] text-center border border-indigo-100 shrink-0">
                            {item.quantity}x
                          </span>
                          <span className="font-bold text-slate-700 leading-tight">{item.name}</span>
                          {((item as any).batchNumber > 1 || (item as any).isNew) && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white shrink-0">
                              NOVO
                            </span>
                          )}
                        </div>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="pl-7 mt-0.5 text-[10px] text-slate-500 font-medium space-y-0.5">
                            {item.selectedOptions.map((opt, oIdx) => (
                              <p key={oIdx}>+ {opt.name}</p>
                            ))}
                          </div>
                        )}
                        {item.observation && (
                          <div className="pl-7 mt-1">
                            <p className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md w-fit whitespace-pre-line">
                              Obs: {item.observation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações de Entrega se houver */}
        {order.type === 'delivery' && (
          <div className="text-[10px] text-slate-600 border-t border-slate-100 pt-2 space-y-0.5">
            {order.customerAddress && (
              <p className="truncate flex items-center gap-1 font-medium">
                <MapPin size={11} className="text-indigo-600 shrink-0" /> {order.customerAddress}
              </p>
            )}
            {order.customerPhone && (
              <p className="truncate flex items-center gap-1 font-medium text-slate-500">
                <Phone size={10} className="text-slate-400 shrink-0" /> {order.customerPhone}
              </p>
            )}
            {courier && (
              <p className="font-black text-slate-800 flex items-center gap-1">
                <Truck size={11} className="text-emerald-600 shrink-0" /> Entregador: {courier.name}
              </p>
            )}
          </div>
        )}

        {/* Badge da Forma de Pagamento */}
        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
          <div className="flex items-center gap-1.5 text-[9px] min-w-0">
            <CreditCard size={12} className="text-slate-400 shrink-0" />
            <span className="font-black text-slate-500 uppercase tracking-tighter shrink-0">PAGAMENTO:</span>
            <span className="font-black text-indigo-700 uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[9px] tracking-wide truncate">
              {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : 'dinheiro'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onEditOrderInPDV(order)}
            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 underline uppercase tracking-wider shrink-0 pl-2 cursor-pointer"
            title="Alterar forma de pagamento e lançamentos do pedido"
          >
            Alterar
          </button>
        </div>

        {/* Botões de Ação estilo SAIPOS (SEMPRE VISÍVEIS E INTERATIVOS) */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
          {/* Ações Secundárias: Ver, Cupom, Recibo, Cancelar */}
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => onEditOrderInPDV(order)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-md font-black text-[10px] uppercase transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="Abrir detalhes no PDV"
            >
              <Search size={12} />
              <span>VER</span>
            </button>

            <button 
              type="button"
              onClick={() => handlePrintOrder(order, adminSettings, { isFiscal: true })}
              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white active:scale-95 border border-emerald-200 rounded-md transition-all shadow-xs cursor-pointer"
              title="Imprimir Cupom Fiscal"
            >
              <Receipt size={14} />
            </button>

            <button 
              type="button"
              onClick={() => handlePrintOrder(order, adminSettings, { isFiscal: false })}
              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 active:scale-95 border border-slate-200 rounded-md transition-all shadow-xs cursor-pointer"
              title="Imprimir Recibo"
            >
              <Printer size={14} />
            </button>
            
            {order.status !== 'cancelled' && (
              <button 
                type="button"
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white active:scale-95 border border-rose-200 rounded-md transition-all shadow-xs cursor-pointer"
                title="Cancelar Pedido"
              >
                <XCircle size={14} />
              </button>
            )}

            {order.status === 'cancelled' && (
              <button 
                type="button"
                onClick={() => onUpdateStatus(order.id, 'pending')}
                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white active:scale-95 border border-emerald-200 rounded-md transition-all shadow-xs cursor-pointer"
                title="Restaurar Pedido"
              >
                <CheckCircle2 size={14} />
              </button>
            )}
          </div>

          {/* Botões de Navegação de Etapa (Voltar e Avançar) */}
          <div className="flex items-center gap-1 shrink-0">
            {canGoBack && (
              <button 
                type="button"
                onClick={() => onBack(order)}
                className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 border border-amber-200 rounded-md transition-all cursor-pointer flex items-center justify-center"
                title="Voltar Etapa (Retornar para Cozinha/Preparo)"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            
            {canAdvance && (
              <button 
                type="button"
                onClick={() => {
                  if (order.status === 'ready' && order.type === 'delivery' && !order.courierId) {
                    onOpenDispatchModal(order);
                  } else {
                    onAdvance(order);
                  }
                }}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-[10px] uppercase rounded-md transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                title="Avançar para a próxima etapa"
              >
                <span>Avançar</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Top-level memoized KanbanColumn component
interface KanbanColumnProps {
  status: string;
  orders: Order[];
  selectedOrderIds: string[];
  onToggleSelectColumn: (orders: Order[]) => void;
  onToggleSelectOrder: (id: string) => void;
  products: Product[];
  couriers: Courier[];
  tables: Table[];
  adminSettings: AdminSettings;
  onEditOrderInPDV: (order: Order) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onAdvance: (order: Order) => void;
  onBack: (order: Order) => void;
  onOpenDispatchModal: (order: Order) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = memo(({
  status,
  orders,
  selectedOrderIds,
  onToggleSelectColumn,
  onToggleSelectOrder,
  products,
  couriers,
  tables,
  adminSettings,
  onEditOrderInPDV,
  onUpdateStatus,
  onAdvance,
  onBack,
  onOpenDispatchModal,
}) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  const isDeliveredColumn = status === 'delivered';

  const isAllSelected = orders.length > 0 && orders.every(o => selectedOrderIds.includes(o.id));
  const isSomeSelected = orders.length > 0 && orders.some(o => selectedOrderIds.includes(o.id));

  return (
    <div className={`flex flex-col flex-1 min-w-[300px] md:min-w-0 self-stretch ${config.bg} ${
      isDeliveredColumn ? 'border-2 border-emerald-400 bg-emerald-50/15 rounded-2xl m-2 shadow-xs ring-4 ring-emerald-50/40' : 'border-r border-slate-200 last:border-r-0'
    } overflow-hidden`}>
      {/* Column Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-2.5">
          <input 
            type="checkbox" 
            checked={isAllSelected}
            ref={el => {
              if (el) {
                el.indeterminate = isSomeSelected && !isAllSelected;
              }
            }}
            onChange={() => onToggleSelectColumn(orders)}
            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer" 
          />
          <div className={`p-2 rounded-lg ${config.dotColor} bg-opacity-15 ${config.color} shadow-xs`}>
            <Icon size={18} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">{config.label}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>
        </div>
        <div className={`w-7 h-7 flex items-center justify-center rounded-lg ${config.dotColor} text-white text-[11px] font-black shadow-xs`}>
          {orders.length}
        </div>
      </div>

      {isDeliveredColumn && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-3 flex items-start gap-2">
          <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={14} />
          <div>
            <p className="text-[10px] text-emerald-900 leading-tight font-black uppercase tracking-wide">
              Espaço de Conferência
            </p>
            <p className="text-[9px] text-emerald-700 font-semibold leading-normal mt-0.5">
              Estes pedidos ficam agrupados aqui até o término do seu turno para conferência rápida.
            </p>
          </div>
        </div>
      )}
      
      {/* Column Cards List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar-kds relative min-h-0">
        {orders.length > 0 ? (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={selectedOrderIds.includes(order.id)}
              onToggleSelect={onToggleSelectOrder}
              products={products}
              couriers={couriers}
              tables={tables}
              adminSettings={adminSettings}
              onEditOrderInPDV={onEditOrderInPDV}
              onUpdateStatus={onUpdateStatus}
              onAdvance={onAdvance}
              onBack={onBack}
              onOpenDispatchModal={onOpenDispatchModal}
            />
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center opacity-40 pointer-events-none">
            <div className={`p-6 rounded-full bg-white shadow-md ${config.color} mb-3 border border-slate-100`}>
              <Icon size={40} strokeWidth={1.5} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum Pedido</p>
          </div>
        )}
      </div>
    </div>
  );
});

const KDS: React.FC<KDSProps> = memo(({ 
  orders, 
  couriers, 
  products, 
  adminSettings, 
  tables,
  cashSession,
  onUpdateStatus, 
  onAssignCourier, 
  onUpdateOrder, 
  onEditOrderInPDV,
  onUpdateLogisticsSettings,
  onNavigate
}) => {
  const [dispatchModalOrder, setDispatchModalOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'delivery' | 'takeout' | 'table' | 'cancelled'>('all');
  const [fiscalPrintDefault, setFiscalPrintDefault] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isMudarParaOpen, setIsMudarParaOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement));

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
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
  }, []);

  const toggleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  }, []);

  const toggleSelectColumn = useCallback((columnOrders: Order[]) => {
    const columnOrderIds = columnOrders.map(o => o.id);
    const allSelected = columnOrderIds.every(id => selectedOrderIds.includes(id));
    
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !columnOrderIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => {
        const filteredPrev = prev.filter(id => !columnOrderIds.includes(id));
        return [...filteredPrev, ...columnOrderIds];
      });
    }
  }, [selectedOrderIds]);

  const handleBatchStatusChange = useCallback((newStatus: OrderStatus) => {
    selectedOrderIds.forEach(id => {
      onUpdateStatus(id, newStatus);
    });
    setSelectedOrderIds([]);
    setIsMudarParaOpen(false);
  }, [selectedOrderIds, onUpdateStatus]);

  const handleAdvance = useCallback((order: Order) => {
    const statusFlow: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'finished'];
    const currentIndex = statusFlow.indexOf(order.status);
    
    if (currentIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIndex + 1];
      onUpdateStatus(order.id, nextStatus);
    }
  }, [onUpdateStatus]);

  const handleBack = useCallback((order: Order) => {
    const terminalStatuses: OrderStatus[] = ['delivered', 'finished', 'cancelled'];
    if (terminalStatuses.includes(order.status)) {
      return;
    }

    const statusFlow: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivering'];
    const currentIndex = statusFlow.indexOf(order.status);
    
    if (currentIndex > 0) {
      const prevStatus = statusFlow[currentIndex - 1];
      onUpdateStatus(order.id, prevStatus);
    }
  }, [onUpdateStatus]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') {
      return orders.filter(o => o.status !== 'cancelled');
    }
    if (activeFilter === 'cancelled') {
      return orders.filter(o => o.status === 'cancelled');
    }
    return orders.filter(o => o.type === activeFilter && o.status !== 'cancelled');
  }, [orders, activeFilter]);

  const columns = useMemo(() => {
    if (activeFilter === 'cancelled') {
      return {
        cancelled: filteredOrders
      };
    }

    const today = new Date();

    const isRecent = (date: any, status: string) => {
      const d = safeParseDate(date);
      if (!d) return true;
      
      if (status === 'preparing' || status === 'pending') {
         const threshold = new Date(today.getTime() - (12 * 60 * 60 * 1000));
         return d > threshold || isToday(d);
      }

      const twentyFourHoursAgo = new Date(today.getTime() - (24 * 60 * 60 * 1000));
      return d > twentyFourHoursAgo;
    };

    const openedDate = (() => {
      if (!cashSession || !cashSession.isOpen || !cashSession.openedAt) return null;
      return safeParseDate(cashSession.openedAt);
    })();

    const sortByLaunchOrder = (a: Order, b: Order) => {
      const dateA = safeParseDate(a.createdAt);
      const dateB = safeParseDate(b.createdAt);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      const dailyA = a.dailyNumber || 0;
      const dailyB = b.dailyNumber || 0;
      if (dailyA !== dailyB) return dailyA - dailyB;
      return String(a.id).localeCompare(String(b.id));
    };

    const sortByNewestCompleted = (a: Order, b: Order) => {
      const dateA = safeParseDate(a.completedAt || a.finishedAt || a.deliveredAt || a.createdAt);
      const dateB = safeParseDate(b.completedAt || b.finishedAt || b.deliveredAt || b.createdAt);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      const dailyA = a.dailyNumber || 0;
      const dailyB = b.dailyNumber || 0;
      if (dailyA !== dailyB) return dailyB - dailyA;
      return String(b.id).localeCompare(String(a.id));
    };

    if (activeFilter === 'cancelled') {
      return {
        cancelled: [...filteredOrders].sort(sortByLaunchOrder)
      };
    }

    return {
      preparing: filteredOrders.filter(o => 
        (o.status === 'preparing' || o.status === 'pending') && isRecent(o.createdAt, 'preparing')
      ).sort(sortByLaunchOrder),
      ready: filteredOrders.filter(o => 
        o.status === 'ready' && isRecent(o.createdAt, 'ready')
      ).sort(sortByLaunchOrder),
      delivering: filteredOrders.filter(o => 
        o.status === 'delivering' && isRecent(o.createdAt, o.status)
      ).sort(sortByLaunchOrder),
      delivered: filteredOrders.filter(o => {
        const isDeliveredOrFinished = o.status === 'delivered' || o.status === 'finished';
        if (!isDeliveredOrFinished) return false;

        const createdDate = safeParseDate(o.createdAt);
        const completionDate = safeParseDate(o.completedAt || o.finishedAt || o.deliveredAt || o.createdAt);

        if (openedDate) {
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
          
          if (openedDate >= twentyFourHoursAgo) {
            const createdInTurn = createdDate ? createdDate >= openedDate : false;
            const completedInTurn = completionDate ? completionDate >= openedDate : false;
            return createdInTurn || completedInTurn;
          }
        }

        const isCreatedToday = createdDate ? isToday(createdDate) : false;
        const isCompletedToday = completionDate ? isToday(completionDate) : false;
        return isCreatedToday || isCompletedToday;
      }).sort(sortByNewestCompleted).slice(0, 40),
    };
  }, [filteredOrders, activeFilter, cashSession]);

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden text-slate-800 h-full min-h-0">
      <style>{`
        .custom-scrollbar-kds::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar-kds::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .custom-scrollbar-kds::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          border: 1px solid #f8fafc;
        }
        .custom-scrollbar-kds::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      
      {/* Header Estilo SAIPOS */}
      <div className="bg-slate-900 p-2.5 sm:p-3 flex flex-wrap items-center gap-3 text-white border-b-4 border-amber-500">
        {/* Filtros de Tipo */}
        <div className="flex gap-1.5">
          <button 
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'delivery' ? 'all' : 'delivery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
              activeFilter === 'delivery' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Bike size={14} /> Delivery
          </button>
          <button 
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'takeout' ? 'all' : 'takeout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
              activeFilter === 'takeout' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShoppingBag size={14} /> Balcão
          </button>
          <button 
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'table' ? 'all' : 'table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
              activeFilter === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Smartphone size={14} /> Mesa
          </button>
          <button 
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'cancelled' ? 'all' : 'cancelled')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
              activeFilter === 'cancelled' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <XCircle size={14} /> Cancelados
          </button>
        </div>

        {/* Opção Mudar Para (move to status em lote) */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <div className="relative text-left">
            <button
              type="button"
              disabled={selectedOrderIds.length === 0}
              onClick={() => setIsMudarParaOpen(!isMudarParaOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black uppercase transition-all border ${
                selectedOrderIds.length > 0
                  ? 'bg-amber-600 text-white cursor-pointer hover:bg-amber-700 border-amber-500 shadow-sm'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700 opacity-40'
              }`}
            >
              MUDAR PARA ▾
            </button>
            
            {isMudarParaOpen && selectedOrderIds.length > 0 && (
              <div className="absolute left-0 mt-1.5 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-700/50 py-1">
                <div className="px-3 py-1.5 text-[8.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-900 border-b border-slate-700/50">
                  Mudar para etapa:
                </div>
                <button
                  type="button"
                  onClick={() => handleBatchStatusChange('preparing')}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                >
                  🧑‍🍳 Cozinha
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchStatusChange('ready')}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                >
                  📦 Aguardando entrega
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchStatusChange('delivering')}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                >
                  🛵 Em entrega/trânsito
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchStatusChange('delivered')}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                >
                  🏁 Finalizados (Turno Caixa)
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchStatusChange('cancelled')}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                >
                  🚫 Cancelar Pedidos
                </button>
              </div>
            )}
          </div>

          {selectedOrderIds.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wide">
                {selectedOrderIds.length} venda(s) selecionada(s)
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-400 px-1 py-0.5 cursor-pointer"
              >
                [X]
              </button>
            </div>
          ) : (
            <span className="text-[9px] font-bold text-slate-500 px-2 uppercase tracking-tight">
              Nenhuma selecionada
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Right Header Actions */}
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 rounded border-slate-600 text-amber-500 focus:ring-amber-400 cursor-pointer" 
              checked={fiscalPrintDefault}
              onChange={(e) => setFiscalPrintDefault(e.target.checked)}
            />
            <span className="uppercase text-[9px] font-black">Fiscal</span>
          </label>

          <button 
            type="button"
            onClick={() => {
              const latestOrder = orders.length > 0 ? orders[0] : null;
              if (latestOrder) handlePrintOrder(latestOrder, adminSettings, { isFiscal: fiscalPrintDefault });
            }}
            className={`${fiscalPrintDefault ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700'} px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-bold cursor-pointer`}
          >
            <Printer size={13} /> 
            <span>{fiscalPrintDefault ? 'Imprimir Fiscal' : 'Imprimir'}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all uppercase text-[9px] font-black border cursor-pointer ${
              isFullscreen 
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm' 
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia para Monitor/TV"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 flex overflow-x-auto w-full min-h-0 pb-2 custom-scrollbar-kds">
        {(Object.keys(columns) as Array<keyof typeof columns>).map(status => (
          <KanbanColumn 
            key={status} 
            status={status} 
            orders={columns[status]}
            selectedOrderIds={selectedOrderIds}
            onToggleSelectColumn={toggleSelectColumn}
            onToggleSelectOrder={toggleSelectOrder}
            products={products}
            couriers={couriers}
            tables={tables}
            adminSettings={adminSettings}
            onEditOrderInPDV={onEditOrderInPDV}
            onUpdateStatus={onUpdateStatus}
            onAdvance={handleAdvance}
            onBack={handleBack}
            onOpenDispatchModal={setDispatchModalOrder}
          />
        ))}
      </div>

      {/* Modal de Despacho Rápido */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 bg-amber-500/10 flex justify-between items-center text-slate-900">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Despachar Pedido</h2>
                <p className="text-[10px] font-bold text-slate-500">ID #{String(dispatchModalOrder?.id || '').slice(-4)}</p>
              </div>
              <button 
                type="button"
                onClick={() => setDispatchModalOrder(null)} 
                className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar">
              {couriers.filter(c => c.status !== 'offline').length > 0 ? (
                couriers.filter(c => c.status !== 'offline').map(courier => (
                  <button 
                    key={courier.id} 
                    type="button"
                    onClick={() => {
                      onAssignCourier(dispatchModalOrder.id, courier.id);
                      setDispatchModalOrder(null);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <Bike size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{courier.name}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase">Disponível</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <Truck size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">Nenhum entregador disponível no momento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Informações */}
      {editingOrder && (
        <EditOrderModal 
          order={editingOrder} 
          products={products} 
          onClose={() => setEditingOrder(null)} 
          onSave={(updates) => {
            onUpdateOrder(editingOrder.id, updates);
            setEditingOrder(null);
          }} 
        />
      )}
    </div>
  );
});

export default KDS;
