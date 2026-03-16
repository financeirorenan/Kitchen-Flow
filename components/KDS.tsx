
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, Courier } from '../types';
import { 
  Clock, Check, CheckCircle2, Smartphone, 
  User, Truck, Package, Flag, ChevronRight, 
  ChefHat, Timer, Bike, AlertCircle, X
} from 'lucide-react';

interface KDSProps {
  orders: Order[];
  couriers: Courier[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onAssignCourier: (orderId: string, courierId: string) => void;
}

const KDS: React.FC<KDSProps> = ({ orders, couriers, onUpdateStatus, onAssignCourier }) => {
  const [dispatchModalOrder, setDispatchModalOrder] = useState<Order | null>(null);

  const columns = useMemo(() => ({
    preparing: orders.filter(o => ['pending', 'preparing'].includes(o.status)),
    ready: orders.filter(o => o.status === 'ready'),
    delivering: orders.filter(o => o.status === 'delivering'),
    delivered: orders.filter(o => o.status === 'delivered').slice(0, 10),
  }), [orders]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'preparing': return { label: 'Produção', icon: ChefHat, color: 'bg-rose-500', bg: 'bg-rose-50/30' };
      case 'ready': return { label: 'Prontos / Despacho', icon: Package, color: 'bg-amber-500', bg: 'bg-amber-50/30' };
      case 'delivering': return { label: 'Em Rota', icon: Bike, color: 'bg-indigo-500', bg: 'bg-indigo-50/30' };
      case 'delivered': return { label: 'Finalizados', icon: Flag, color: 'bg-emerald-500', bg: 'bg-emerald-50/30' };
      default: return { label: 'Status', icon: Clock, color: 'bg-slate-500', bg: 'bg-slate-50' };
    }
  };

  const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const timeElapsed = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
    const courier = couriers.find(c => c.id === order.courierId);

    return (
      <div className="bg-white border-2 border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-bottom-2 duration-300 overflow-hidden">
        <div className="p-2 border-b border-slate-50 flex justify-between items-start">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base text-slate-800">#{order.id.slice(-4)}</span>
              {order.customerName && <Smartphone size={10} className="text-indigo-600" />}
            </div>
            <div className="flex flex-wrap gap-1">
               <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border ${order.type === 'delivery' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                 {order.type}
               </span>
               {order.tableNumber && (
                 <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                   Mesa {order.tableNumber}
                 </span>
               )}
            </div>
          </div>
          <div className="text-right">
             <div className={`flex items-center gap-1 text-[9px] font-bold uppercase ${timeElapsed > 20 ? 'text-rose-500' : 'text-slate-400'}`}>
                <Timer size={10} /> {timeElapsed}m
             </div>
          </div>
        </div>

        <div className="p-2 space-y-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex gap-1.5 text-[11px]">
               <span className="font-black text-slate-400">{item.quantity}x</span>
               <p className="font-bold text-slate-700 truncate">{item.name}</p>
            </div>
          ))}
        </div>

        {order.status === 'delivering' && courier && (
          <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center gap-1.5">
            <Bike size={12} className="text-indigo-600" />
            <span className="text-[9px] font-black text-indigo-700 uppercase truncate">{courier.name}</span>
          </div>
        )}

        <div className="p-2 bg-slate-50/50 border-t">
          {order.status === 'preparing' ? (
            <button 
              onClick={() => onUpdateStatus(order.id, 'ready')}
              className="w-full bg-emerald-600 text-white py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-50"
            >
              <Check size={14} strokeWidth={4} /> Concluir
            </button>
          ) : order.status === 'ready' ? (
            order.type === 'delivery' ? (
              <button 
                onClick={() => setDispatchModalOrder(order)}
                className="w-full bg-rose-600 text-white py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-50"
              >
                <Truck size={14} /> Despachar
              </button>
            ) : (
              <button 
                onClick={() => onUpdateStatus(order.id, 'delivered')}
                className="w-full bg-indigo-600 text-white py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-50"
              >
                <CheckCircle2 size={14} /> Entregar
              </button>
            )
          ) : order.status === 'delivering' ? (
            <button 
              onClick={() => onUpdateStatus(order.id, 'delivered')}
              className="w-full bg-slate-800 text-white py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5"
            >
              <Flag size={14} /> Finalizar
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
              <CheckCircle2 size={14} /> Entregue
            </div>
          )}
        </div>
      </div>
    );
  };

  const KanbanColumn: React.FC<{ status: keyof typeof columns; orders: Order[] }> = ({ status, orders }) => {
    const config = getStatusConfig(status as string);
    const Icon = config.icon;

    return (
      <div className={`flex flex-col w-60 min-w-[15rem] h-full rounded-2xl ${config.bg} border-2 border-slate-100 overflow-hidden`}>
        <div className="p-3 flex items-center justify-between border-b bg-white">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg text-white ${config.color} shadow-lg shadow-current/20`}>
              <Icon size={16} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-tighter">{config.label}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase">{orders.length} {orders.length === 1 ? 'Pedido' : 'Pedidos'}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
          {orders.length > 0 ? (
            orders.map(order => <OrderCard key={order.id} order={order} />)
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-1 grayscale">
               <Icon size={32} />
               <p className="text-[9px] font-black uppercase tracking-widest">Vazio</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-3 h-[calc(100vh-10rem)] overflow-x-auto pb-2 custom-scrollbar relative">
      <KanbanColumn status="preparing" orders={columns.preparing} />
      <KanbanColumn status="ready" orders={columns.ready} />
      <KanbanColumn status="delivering" orders={columns.delivering} />
      <KanbanColumn status="delivered" orders={columns.delivered} />

      {/* Modal de Despacho Rápido no KDS */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b flex justify-between items-center bg-rose-50/50">
                 <div>
                    <h2 className="text-xl font-black text-slate-800">Despachar Pedido</h2>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Pedido #{dispatchModalOrder.id.slice(-4)}</p>
                 </div>
                 <button onClick={() => setDispatchModalOrder(null)} className="p-1.5 hover:bg-white rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              <div className="p-4 space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Entregador</p>
                 <div className="grid grid-cols-1 gap-3">
                    {couriers.filter(c => c.status !== 'offline').map(courier => {
                      const activeDeliveries = orders.filter(o => o.courierId === courier.id && o.status === 'delivering').length;
                      return (
                        <button 
                           key={courier.id} 
                           onClick={() => {
                              onAssignCourier(dispatchModalOrder.id, courier.id);
                              setDispatchModalOrder(null);
                           }}
                           className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-slate-50 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
                        >
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                 <Bike size={24} />
                              </div>
                              <div className="text-left">
                                 <p className="font-black text-slate-800">{courier.name}</p>
                                 <p className={`text-[9px] font-black uppercase ${activeDeliveries > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {activeDeliveries > 0 ? `${activeDeliveries} Entrega(s) em curso` : 'Livre agora'}
                                 </p>
                              </div>
                           </div>
                           <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default KDS;
