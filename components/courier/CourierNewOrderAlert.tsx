import React from 'react';
import { 
  Bell, 
  MapPin, 
  DollarSign, 
  Clock, 
  ShoppingBag, 
  Check, 
  X, 
  Bike,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '../../types';
import { formatOrderNumber } from '../../utils/deduplicate';

interface CourierNewOrderAlertProps {
  order: Order | null;
  onAccept: (order: Order) => void;
  onDismiss: () => void;
}

export const CourierNewOrderAlert: React.FC<CourierNewOrderAlertProps> = ({
  order,
  onAccept,
  onDismiss
}) => {
  if (!order) return null;

  const orderNum = formatOrderNumber(order);
  const itemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
          onClick={onDismiss}
        />

        {/* New Order Alert Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="w-full max-w-md bg-slate-900 border-2 border-orange-500 rounded-[2.5rem] shadow-2xl shadow-orange-950/60 p-5 sm:p-6 space-y-5 relative z-10 pointer-events-auto overflow-hidden"
        >
          {/* Header Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-orange-500/40 animate-bounce">
                <Bell size={16} />
              </span>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 block">
                  Nova Corrida Atribuída
                </span>
                <span className="text-sm font-black text-white">
                  Pedido #{orderNum}
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={onDismiss}
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Earnings Highlight Box */}
          <div className="bg-gradient-to-r from-orange-950/60 to-slate-950 p-4.5 rounded-2xl border border-orange-500/30 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Valor da Corrida (Comissão)
              </span>
              <h2 className="text-3xl font-black text-orange-400 tracking-tight mt-0.5">
                R$ {(order.courierEarnings || 0).toFixed(2)}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Total do Pedido
              </span>
              <p className="text-sm font-bold text-slate-200">
                R$ {order.total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Destination Details */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                  Destino / Cliente
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {order.customerName || 'Cliente'}
                </p>
                <p className="text-xs text-slate-300 font-mono mt-0.5 leading-relaxed">
                  {order.customerAddress || 'Endereço não informado'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShoppingBag size={13} className="text-orange-400" />
                {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                order.paymentMethod === 'dinheiro' 
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-900/30' 
                  : 'bg-indigo-950/40 text-indigo-300 border border-indigo-900/30'
              }`}>
                {order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Pago Online'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Recusar / Fechar
            </button>

            <button
              type="button"
              onClick={() => onAccept(order)}
              className="flex-[2] py-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Check size={16} strokeWidth={3} />
              <span>Aceitar Corrida</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
