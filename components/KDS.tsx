
import React, { useMemo, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order, OrderStatus, Courier, Product, AdminSettings, Table, CashSession } from '../types';
import { 
  Clock, Check, CheckCircle2, Smartphone, 
  User, Truck, Package, Flag, ChevronRight, 
  ChefHat, Timer, Bike, AlertCircle, X,
  Edit, Plus, Minus, Trash2, Search, CreditCard, Printer, Share2, ShoppingBag, MapPin, Phone,
  Store, XCircle, Receipt, Maximize2, Minimize2
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

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const toggleSelectColumn = (columnOrders: Order[]) => {
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
  };

  const handleBatchStatusChange = (newStatus: OrderStatus) => {
    selectedOrderIds.forEach(id => {
      onUpdateStatus(id, newStatus);
    });
    setSelectedOrderIds([]);
    setIsMudarParaOpen(false);
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') {
      return orders.filter(o => o.status !== 'cancelled');
    }
    if (activeFilter === 'cancelled') {
      return orders.filter(o => o.status === 'cancelled');
    }
    return orders.filter(o => o.type === activeFilter && o.status !== 'cancelled');
  }, [orders, activeFilter]);

  const deliveryStats = useMemo(() => {
    const deliveryOrders = orders.filter(o => o.type === 'delivery');
    return {
      active: deliveryOrders.filter(o => ['preparing', 'ready', 'delivering'].includes(o.status)).length,
      waiting: deliveryOrders.filter(o => o.status === 'ready').length,
      onRoute: deliveryOrders.filter(o => o.status === 'delivering').length,
    };
  }, [orders]);

  const columns = useMemo(() => {
    if (activeFilter === 'cancelled') {
      return {
        cancelled: filteredOrders
      };
    }

    const today = new Date();
    const isToday = (date: any) => {
      if (!date) return false;
      const d = new Date(date);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    const isRecent = (date: any, status: string) => {
      if (!date) return false;
      const d = new Date(date);
      
      // Regra de "Cozinha" (preparing/pending): 
      // Apenas hoje ou últimas 12 horas para evitar poluição de sobras de ontem
      if (status === 'preparing' || status === 'pending') {
         const threshold = new Date(today.getTime() - (12 * 60 * 60 * 1000));
         return d > threshold || isToday(d);
      }

      // Regra de "Pronto" ou "Entrega": 
      // Últimas 24 horas para cobrir turnos longos de ontem
      const twentyFourHoursAgo = new Date(today.getTime() - (24 * 60 * 60 * 1000));
      return d > twentyFourHoursAgo;
    };

    const openedDate = (() => {
      if (!cashSession || !cashSession.isOpen || !cashSession.openedAt) return null;
      const d = new Date(cashSession.openedAt);
      return isNaN(d.getTime()) ? null : d;
    })();

    const getOrderCompletionDate = (o: Order) => {
      const rawDate = o.completedAt || o.finishedAt || o.deliveredAt || o.updatedAt || o.createdAt;
      if (!rawDate) return null;
      const d = new Date(rawDate);
      return isNaN(d.getTime()) ? null : d;
    };

    return {
      preparing: filteredOrders.filter(o => 
        (o.status === 'preparing' || o.status === 'pending') && isRecent(o.createdAt, 'preparing')
      ),
      ready: filteredOrders.filter(o => 
        o.status === 'ready' && isRecent(o.createdAt, 'ready')
      ),
      delivering: filteredOrders.filter(o => 
        o.status === 'delivering' && isRecent(o.createdAt, o.status)
      ),
      delivered: filteredOrders.filter(o => {
        const isDeliveredOrFinished = o.status === 'delivered' || o.status === 'finished';
        if (!isDeliveredOrFinished) return false;

        if (openedDate) {
          const compDate = getOrderCompletionDate(o);
          return compDate && compDate >= openedDate;
        }

        return (isToday(o.createdAt) || (new Date().getTime() - new Date(o.createdAt).getTime() < 12 * 60 * 60 * 1000)) && !o.isSettled;
      }).slice(0, 40),
    };
  }, [filteredOrders, activeFilter, cashSession]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'preparing': return { label: 'Cozinha', icon: ChefHat, color: 'text-rose-500', dotColor: 'bg-rose-500', bg: 'bg-slate-50' };
      case 'ready': return { label: 'Aguardando entrega', icon: Package, color: 'text-amber-500', dotColor: 'bg-amber-500', bg: 'bg-slate-50' };
      case 'delivering': return { label: 'Saiu p/ entrega ou Aguardando cliente', icon: Bike, color: 'text-brand-secondary', dotColor: 'bg-brand-secondary', bg: 'bg-slate-50' };
      case 'delivered': return { label: 'Finalizados (Turno Caixa)', icon: Flag, color: 'text-emerald-500', dotColor: 'bg-emerald-500', bg: 'bg-emerald-50/5' };
      case 'cancelled': return { label: 'Cancelados', icon: XCircle, color: 'text-slate-400', dotColor: 'bg-slate-400', bg: 'bg-slate-50' };
      default: return { label: 'Status', icon: Clock, color: 'text-slate-500', dotColor: 'bg-slate-500', bg: 'bg-slate-50' };
    }
  };

  const handleAdvance = (order: Order) => {
    const statusFlow: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'finished'];
    const currentIndex = statusFlow.indexOf(order.status);
    
    if (currentIndex < statusFlow.length - 1) {
      let nextStatus = statusFlow[currentIndex + 1];
      
      // Se for mesa/balcão e for de 'ready', pode pular para 'delivered' se não houver lógica de entrega
      // Mas o usuário pediu "Esperando pelo cliente (Em entrega)", então manteremos o fluxo padrão
      // onde 'delivering' serve para ambos os casos de trânsito/espera.

      onUpdateStatus(order.id, nextStatus);
    }
  };

  const handleBack = (order: Order) => {
    const terminalStatuses: OrderStatus[] = ['delivered', 'finished', 'cancelled'];
    if (terminalStatuses.includes(order.status)) {
      // Bloqueio absoluto: Pedidos finalizados ou cancelados não voltam ao ciclo
      return;
    }

    // Regra do Usuário: Uma vez pronto (ready), não pode voltar para a cozinha (preparing)
    // Pode retroceder de 'delivering' para 'ready', mas não de 'ready' para 'preparing'
    if (order.status === 'ready') {
       console.warn("Bloqueio: Pedidos prontos não podem retornar à cozinha.");
       return;
    }

    const statusFlow: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivering'];
    const currentIndex = statusFlow.indexOf(order.status);
    
    if (currentIndex > 0) {
      const prevStatus = statusFlow[currentIndex - 1];
      onUpdateStatus(order.id, prevStatus);
    }
  };

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const timeElapsed = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
    const courier = couriers.find(c => c.id === order.courierId);
    const statusConfig = getStatusConfig(order.status);

    // Resolver número da mesa se for ID técnico ou antigo
    const resolvedTableLabel = useMemo(() => {
      if (order.type !== 'table') return null;
      
      const tNum = String(order.tableNumber);
      if (tNum.length < 5 && !isNaN(Number(tNum))) return tNum; // Já é um número curto

      const tableRef = tables.find(t => t.id === order.tableNumber || (t as any).docId === order.tableNumber);
      return tableRef ? String(tableRef.number) : tNum.slice(-4);
    }, [order.tableNumber, order.type, tables]);

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:ring-2 hover:ring-brand-primary/20 transition-all group animate-in fade-in duration-300">
        <div className="p-3 space-y-3">
          {/* Header do Card */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={selectedOrderIds.includes(order.id)}
                onChange={() => toggleSelectOrder(order.id)}
                className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer transition-all active:scale-95" 
              />
              <div className="flex flex-col">
                 <span className="font-bold text-slate-700 text-sm">#{order.dailyNumber || String(order?.id || '').slice(-4).toUpperCase()} - {order.customerName || 'Consumidor não identificado'}</span>
                 <span className="text-[10px] text-slate-400 font-medium">Desde {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({timeElapsed}m)</span>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Localização / Área */}
          <div className="space-y-1">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
               {order.type === 'delivery' ? 'Delivery' : order.type === 'takeout' ? 'Balcão' : `Mesa ${resolvedTableLabel || order.tableNumber}`}
             </p>
          </div>

          {/* Ícone da Origem */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-rose-500 text-white shadow-sm`}>
               {order.source === 'marketplace' ? <ShoppingBag size={14} strokeWidth={3} /> : <Store size={14} />}
            </div>
            {order.source === 'marketplace' && <span className="text-[8px] font-black text-rose-500 uppercase">Site Delivery</span>}
          </div>

          {/* Itens do Pedido */}
          {order.items && order.items.length > 0 && (() => {
             // Group items of this order by product category
             const itemsByCategory = order.items.reduce<Record<string, typeof order.items>>((acc, item) => {
                // Extract base product name before options (e.g., "Pastel (Queijo)" -> "Pastel")
                const baseName = item.name.split(' (')[0].trim().toLowerCase();
                let prod = item.productId ? products.find(p => p.id === item.productId) : null;
                if (!prod) {
                   prod = products.find(p => p.name && p.name.toLowerCase().trim() === baseName);
                }
                const category = prod?.category || 'Geral';
                if (!acc[category]) {
                   acc[category] = [];
                }
                acc[category].push(item);
                return acc;
             }, {});

             return (
                <div className="border-t border-slate-100 pt-2.5 space-y-3">
                   <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-400">Itens do Pedido</p>
                   <div className="space-y-3">
                      {Object.entries(itemsByCategory).map(([category, items]) => (
                         <div key={category} className="space-y-1">
                            {/* Nome da Categoria */}
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/60 px-2 py-0.5 rounded w-fit border border-indigo-100/50">
                               {category}
                            </p>
                            
                            {/* Itens desta Categoria */}
                            <div className="space-y-1.5 pl-1.5">
                               {items.map((item, idx) => (
                                  <div key={idx} className="flex flex-col text-slate-800 text-xs py-0.5">
                                     <div className="flex items-start gap-2.5">
                                        <span className="font-semibold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded text-[10px] min-w-[20px] text-center">
                                           {item.quantity}x
                                        </span>
                                        <span className="font-semibold text-slate-700 flex-1 leading-tight">{item.name}</span>
                                     </div>
                                     {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <div className="pl-9 mt-0.5 text-[10px] text-slate-400 font-bold space-y-0.5">
                                           {item.selectedOptions.map((opt, oIdx) => (
                                              <p key={oIdx}>+ {opt.name}</p>
                                           ))}
                                        </div>
                                     )}
                                     {item.observation && (
                                        <div className="pl-9 mt-1">
                                           <p className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md w-fit">
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
             );
          })()}

          {/* Informações de Entrega se houver */}
          {order.type === 'delivery' && (
             <div className="text-[10px] text-slate-500 border-t border-slate-50 pt-2 space-y-0.5">
                {order.customerAddress && <p className="truncate flex items-center gap-1"><MapPin size={8} /> {order.customerAddress}</p>}
                {courier && <p className="font-bold text-slate-800 flex items-center gap-1"><Truck size={8} /> Entregador: {courier.name}</p>}
             </div>
          )}

          {/* Badge da Forma de Pagamento */}
          <div className="flex justify-between items-center bg-slate-50/80 p-2 rounded-xl border border-slate-100/80 mt-2">
             <div className="flex items-center gap-1.5 text-[9px]">
                <CreditCard size={11} className="text-slate-400" />
                <span className="font-extrabold text-slate-400 uppercase tracking-tighter">PAGAMENTO:</span>
                <span className="font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 text-[9px] tracking-wide">
                  {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : 'dinheiro'}
                </span>
             </div>
             <button
                onClick={() => setEditingOrder(order)}
                className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 underline uppercase tracking-widest pl-2"
                title="Alterar forma de pagamento do pedido"
             >
                Alterar
             </button>
          </div>

          {/* Botões de Ação estilo SAIPOS */}
          <div className="flex items-center justify-end gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setEditingOrder(order)}
              className="p-1.5 bg-cyan-50 text-cyan-600 rounded-sm hover:bg-cyan-600 hover:text-white transition-all shadow-sm"
              title="Informações / Editar"
            >
              <Search size={14} />
            </button>
            <button 
              onClick={() => handlePrintOrder(order, adminSettings, { isFiscal: true })}
              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-sm hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              title="Imprimir Cupom Fiscal"
            >
              <Receipt size={14} />
            </button>
            <button 
              onClick={() => handlePrintOrder(order, adminSettings, { isFiscal: false })}
              className="p-1.5 bg-slate-50 text-slate-400 rounded-sm hover:bg-slate-200 hover:text-slate-700 transition-all shadow-sm"
              title="Imprimir Recibo"
            >
              <Printer size={14} />
            </button>
            
            {order.status !== 'cancelled' && (
              <button 
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
                className="p-1.5 bg-rose-50 text-rose-500 rounded-sm hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                title="Cancelar Pedido"
              >
                <XCircle size={14} />
              </button>
            )}

            {order.status === 'cancelled' && (
              <button 
                onClick={() => onUpdateStatus(order.id, 'pending')}
                className="p-1.5 bg-emerald-50 text-emerald-500 rounded-sm hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                title="Restaurar Pedido"
              >
                <CheckCircle2 size={14} />
              </button>
            )}

            <button 
              onClick={() => onEditOrderInPDV(order)}
              className="px-3 py-1 bg-brand-primary text-white rounded-sm font-bold text-[10px] uppercase hover:opacity-90 transition-all shadow-sm"
              title="Ver detalhes"
            >
              VER
            </button>
            
            {/* NavButtons */}
            <div className="flex gap-0.5 ml-1">
               {order.status !== 'pending' && order.status !== 'preparing' && order.status !== 'cancelled' && (
                 <button 
                   onClick={() => handleBack(order)}
                   className="p-1.5 bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-sm"
                   title="Voltar Estagio"
                 >
                   <ChevronRight size={14} className="rotate-180" />
                 </button>
               )}
               {order.status !== 'delivered' && order.status !== 'finished' && (
                 <button 
                   onClick={() => {
                     if (order.status === 'ready' && order.type === 'delivery' && !order.courierId) {
                        setDispatchModalOrder(order);
                     } else {
                        handleAdvance(order);
                     }
                   }}
                   className="p-1.5 bg-brand-secondary text-white rounded-sm hover:opacity-90"
                   title="Avançar"
                 >
                   <ChevronRight size={14} />
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const KanbanColumn: React.FC<{ status: keyof typeof columns; orders: Order[] }> = ({ status, orders }) => {
    const config = getStatusConfig(status as string);
    const Icon = config.icon;
    const isDeliveredColumn = status === 'delivered';

    return (
      <div className={`flex flex-col flex-1 min-w-[280px] md:min-w-0 self-stretch ${config.bg} ${isDeliveredColumn ? 'border-2 border-emerald-400 bg-emerald-50/15 rounded-[2rem] m-2 shadow-sm ring-4 ring-emerald-50/50' : 'border-r border-slate-100 last:border-r-0'} overflow-hidden transition-all duration-300`}>
        <div className="p-4 flex items-center justify-between border-b bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={orders.length > 0 && orders.every(o => selectedOrderIds.includes(o.id))}
              ref={el => {
                if (el) {
                  const someSelected = orders.length > 0 && orders.some(o => selectedOrderIds.includes(o.id));
                  const allSelected = orders.length > 0 && orders.every(o => selectedOrderIds.includes(o.id));
                  el.indeterminate = someSelected && !allSelected;
                }
              }}
              onChange={() => toggleSelectColumn(orders)}
              className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer transition-all active:scale-95" 
            />
            <div className={`p-2.5 rounded-xl ${config.dotColor} bg-opacity-10 ${config.color} shadow-sm transition-transform`}>
               <Icon size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">{config.label}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>
          <div className={`w-7 h-7 flex items-center justify-center rounded-xl ${config.dotColor} text-white text-[11px] font-black shadow-lg shadow-slate-200 border-2 border-white`}>
            {orders.length}
          </div>
        </div>

        {isDeliveredColumn && (
          <div className="bg-emerald-50 border-b border-emerald-100/50 p-3 flex items-start gap-2.5">
            <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={14} />
            <div>
              <p className="text-[10px] text-emerald-800/90 leading-tight font-extrabold uppercase tracking-wide">
                Espaço de Conferência
              </p>
              <p className="text-[9px] text-emerald-600 font-bold leading-normal mt-0.5">
                Estes pedidos ficam agrupados aqui até o término do seu turno (fechamento de caixa) para auditoria e ajuste de pagamento rápida.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex-1 p-3 overflow-y-auto space-y-4 custom-scrollbar-kds relative min-h-0">
          <AnimatePresence mode="popLayout" initial={false}>
            {orders.length > 0 ? (
              orders.map(order => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <OrderCard order={order} />
                </motion.div>
              ))
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                 <div className={`p-8 rounded-full bg-white shadow-xl shadow-slate-200 ${config.color} mb-4 border border-slate-100`}>
                   <Icon size={56} strokeWidth={1} />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fluxo Vazio</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden text-brand-black h-full min-h-0">
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
      <div className="bg-slate-900 p-2 sm:p-3 flex flex-wrap items-center gap-3 text-brand-white border-b-4 border-brand-primary">
         <div className="flex gap-1">
            <button 
              onClick={() => setActiveFilter(activeFilter === 'delivery' ? 'all' : 'delivery')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all hover:opacity-90 ${activeFilter === 'delivery' ? 'bg-brand-primary' : 'bg-slate-800'}`}
            >
               <Bike size={14} /> Delivery
            </button>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'takeout' ? 'all' : 'takeout')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all hover:opacity-90 ${activeFilter === 'takeout' ? 'bg-brand-primary' : 'bg-slate-800'}`}
            >
               <ShoppingBag size={14} /> Balcão
            </button>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'table' ? 'all' : 'table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all hover:opacity-90 ${activeFilter === 'table' ? 'bg-brand-secondary' : 'bg-slate-800'}`}
            >
               <Smartphone size={14} /> Mesa
            </button>
            <button 
              onClick={() => setActiveFilter(activeFilter === 'cancelled' ? 'all' : 'cancelled')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all hover:opacity-90 ${activeFilter === 'cancelled' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
               <XCircle size={14} /> Cancelados
            </button>
         </div>

         {/* Opção Mudar Para (move to status) */}
         <div className="flex items-center gap-2 bg-slate-800/40 p-1 rounded-lg border border-slate-800/60">
            <div className="relative text-left">
               <button
                  disabled={selectedOrderIds.length === 0}
                  onClick={() => setIsMudarParaOpen(!isMudarParaOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all border ${
                    selectedOrderIds.length > 0
                      ? 'bg-amber-600 text-white cursor-pointer hover:bg-amber-700 border-amber-500 shadow-md shadow-amber-955/40 font-black animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700 opacity-40'
                  }`}
               >
                  MUDAR PARA ▾
               </button>
               {isMudarParaOpen && selectedOrderIds.length > 0 && (
                  <div className="absolute left-0 mt-1.5 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-700/55 py-1">
                     <div className="px-3 py-1.5 text-[8.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-900 border-b border-slate-700/50">
                        Mudar para etapa de produção:
                     </div>
                     <button
                        onClick={() => handleBatchStatusChange('preparing')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-brand-primary hover:text-white transition-colors"
                     >
                        🧑‍🍳 Cozinha
                     </button>
                     <button
                        onClick={() => handleBatchStatusChange('ready')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-brand-primary hover:text-white transition-colors"
                     >
                        📦 Aguardando entrega
                     </button>
                     <button
                        onClick={() => handleBatchStatusChange('delivering')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-brand-primary hover:text-white transition-colors"
                     >
                        🛵 Em entrega/trânsito
                     </button>
                     <button
                        onClick={() => handleBatchStatusChange('delivered')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-brand-primary hover:text-white transition-colors"
                     >
                        🏁 Finalizados (Turno Caixa)
                     </button>
                     <button
                        onClick={() => handleBatchStatusChange('cancelled')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                     >
                        🚫 Cancelar Pedidos
                     </button>
                  </div>
               )}
            </div>

            {selectedOrderIds.length > 0 ? (
               <div className="flex items-center gap-1.5 px-2 py-0.5 animate-in fade-in duration-200">
                  <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wide">
                     {selectedOrderIds.length} venda(s) selecionada(s)
                  </span>
                  <button
                     onClick={() => setSelectedOrderIds([])}
                     className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-400 px-1 py-0.5"
                  >
                     [X]
                  </button>
               </div>
            ) : (
               <span className="text-[9px] font-bold text-slate-500 px-2 uppercase tracking-tight">
                  Nenhuma venda selecionada
               </span>
            )}
         </div>

         <div className="flex-1" />
         <div className="flex items-center gap-4 text-[10px] font-bold">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-2 py-1 rounded">
              <input 
                type="checkbox" 
                className="w-3 h-3 rounded" 
                checked={fiscalPrintDefault}
                onChange={(e) => setFiscalPrintDefault(e.target.checked)}
              />
              <span className="uppercase text-[9px]">Fiscal</span>
            </label>
            <div className="flex items-center gap-2 uppercase">
              Aberto: <div className="w-8 h-4 bg-emerald-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-all" /></div>
            </div>
            <button 
              onClick={() => {
                const latestOrder = orders.length > 0 ? orders[0] : null;
                if (latestOrder) handlePrintOrder(latestOrder, adminSettings, { isFiscal: fiscalPrintDefault });
              }}
              className={`${fiscalPrintDefault ? 'bg-indigo-600' : 'bg-brand-secondary'} px-3 py-1 rounded hover:opacity-90 flex items-center gap-1 transition-colors`}
            >
               <Printer size={12} /> {fiscalPrintDefault ? 'Imprimir Fiscal' : 'Imprimir no meu usuário'}
            </button>
            <button
              onClick={toggleFullscreen}
              className={`px-3 py-1 rounded flex items-center gap-1 transition-all uppercase text-[9px] font-black border ${
                isFullscreen 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30' 
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia para Monitor/TV"}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
            </button>
         </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex overflow-x-auto w-full min-h-0 pb-2 custom-scrollbar-kds">
        {(Object.keys(columns) as Array<keyof typeof columns>).map(status => (
          <KanbanColumn key={status} status={status} orders={columns[status]} />
        ))}
      </div>

      {/* Modal de Despacho Rápido */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-brand-white w-full max-w-sm rounded-xl border shadow-2xl overflow-hidden">
              <div className="p-4 border-b bg-brand-primary/10 flex justify-between items-center text-brand-black">
                 <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Despachar Pedido</h2>
                    <p className="text-[10px] font-bold opacity-60">ID #{String(dispatchModalOrder?.id || '').slice(-4)}</p>
                 </div>
                 <button onClick={() => setDispatchModalOrder(null)} className="p-1.5 hover:bg-white rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3">
                 {couriers.filter(c => c.status !== 'offline').map(courier => (
                   <button 
                     key={courier.id} 
                     onClick={() => {
                        onAssignCourier(dispatchModalOrder.id, courier.id);
                        setDispatchModalOrder(null);
                     }}
                     className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand-primary hover:bg-brand-primary/5 transition-all group"
                   >
                     <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-brand-primary"><Bike size={20} /></div>
                        <div><p className="font-bold text-slate-800 text-sm">{courier.name}</p><p className="text-[10px] text-emerald-500 font-bold uppercase">Disponível</p></div>
                     </div>
                     <ChevronRight size={16} className="text-slate-300" />
                   </button>
                 ))}
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
