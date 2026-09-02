import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Bike, 
  ChevronRight, 
  ShoppingBag,
  ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Order } from '../../types';
import { formatOrderNumber } from '../../utils/deduplicate';

interface CourierHistoryTabProps {
  assignedOrders: Order[];
  onSelectOrderSummary: (order: Order) => void;
}

export const CourierHistoryTab: React.FC<CourierHistoryTabProps> = ({
  assignedOrders,
  onSelectOrderSummary
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'delivering' | 'cancelled'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const currentDayOfWeek = now.getDay();
  const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() + diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // Filtered orders list
  const filteredOrders = assignedOrders.filter(order => {
    // Search match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const num = formatOrderNumber(order).toLowerCase();
      const name = (order.customerName || '').toLowerCase();
      const addr = (order.customerAddress || '').toLowerCase();
      const id = (order.id || '').toLowerCase();
      if (!num.includes(q) && !name.includes(q) && !addr.includes(q) && !id.includes(q)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'delivered' && order.status !== 'delivered' && order.status !== 'finished') return false;
    if (statusFilter === 'delivering' && order.status !== 'delivering' && order.status !== 'ready') return false;
    if (statusFilter === 'cancelled' && order.status !== 'cancelled') return false;

    // Time filter
    const d = order.deliveredAt ? new Date(order.deliveredAt) : (order.createdAt ? new Date(order.createdAt) : null);
    if (d) {
      if (timeFilter === 'today' && d < startOfToday) return false;
      if (timeFilter === 'week' && d < currentWeekStart) return false;
      if (timeFilter === 'month' && d < monthStart) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5 pb-28">
      {/* Top Header */}
      <div>
        <h2 className="text-lg font-black text-white tracking-tight">
          Histórico de Entregas
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Consulte todas as suas corridas concluídas e em andamento
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar por cliente, endereço ou #pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 placeholder:text-slate-500 outline-none focus:border-orange-500/60 transition-all shadow-inner"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'all', label: 'Todas as Datas' },
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mês' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeFilter(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                timeFilter === t.id 
                  ? 'bg-brand-primary text-white' 
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'all', label: 'Todos Status' },
            { id: 'delivered', label: 'Concluídos' },
            { id: 'delivering', label: 'Em Rota' },
            { id: 'cancelled', label: 'Cancelados' }
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                statusFilter === s.id 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'bg-slate-950 text-slate-500 hover:text-slate-400 border border-slate-850'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span>{filteredOrders.length} {filteredOrders.length === 1 ? 'corrida encontrada' : 'corridas encontradas'}</span>
          <span>Ordem mais recente</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Nenhuma entrega corresponde aos filtros selecionados.
            </p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const isDelivered = order.status === 'delivered' || order.status === 'finished';
            const isDelivering = order.status === 'delivering' || order.status === 'ready';
            const isCancelled = order.status === 'cancelled';
            const orderNum = formatOrderNumber(order);
            const itemsCount = (order.items || []).reduce((sum, it) => sum + it.quantity, 0);

            return (
              <div 
                key={order.id || idx}
                onClick={() => onSelectOrderSummary(order)}
                className="bg-slate-900 p-4.5 rounded-3xl border border-slate-800 hover:border-orange-500/40 transition-all cursor-pointer space-y-3 shadow-md group"
              >
                {/* Header with status and ID */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${
                      isDelivered 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                        : isDelivering
                          ? 'bg-orange-500/15 text-orange-300 border-orange-500/30 animate-pulse'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {isDelivered ? 'Concluído' : isDelivering ? 'Em Rota' : 'Cancelado'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      #{orderNum}
                    </span>
                  </div>

                  <span className="text-sm font-black text-orange-400">
                    + R$ {(order.courierEarnings || 0).toFixed(2)}
                  </span>
                </div>

                {/* Customer & Address */}
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                    {order.customerName || 'Cliente'}
                  </h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                    {order.customerAddress || 'Endereço'}
                  </p>
                </div>

                {/* Footer with timestamp and payment */}
                <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {order.deliveredAt 
                      ? new Date(order.deliveredAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : (order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--/--')}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-850 uppercase">
                      {order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Digital'}
                    </span>
                    <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
