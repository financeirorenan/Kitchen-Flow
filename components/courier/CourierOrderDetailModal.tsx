import React from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  DollarSign, 
  Clock, 
  Copy, 
  Check, 
  Navigation, 
  UserCircle, 
  ShoppingBag, 
  CreditCard,
  Bike
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '../../types';
import { formatOrderNumber } from '../../utils/deduplicate';
import { maskPhone } from '../../utils/masks';

interface CourierOrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onOpenRoute?: (address: string) => void;
  onCopyAddress?: (address: string) => void;
  copiedAddress?: boolean;
}

export const CourierOrderDetailModal: React.FC<CourierOrderDetailModalProps> = ({
  order,
  onClose,
  onOpenRoute,
  onCopyAddress,
  copiedAddress
}) => {
  if (!order) return null;

  const orderNum = formatOrderNumber(order);
  const itemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal / Sheet Card */}
        <motion.div 
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden max-h-[92vh] flex flex-col border border-slate-800"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/40 px-2.5 py-0.5 rounded-full border border-orange-800/40">
                  {order.status === 'delivered' ? 'Entrega Concluída' : order.status === 'delivering' ? 'Em Rota' : 'Pedido Pronto'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Pedido #{orderNum}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                {order.customerName || 'Cliente'}
              </h2>
            </div>

            <button 
              type="button"
              onClick={onClose} 
              className="p-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-750 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
            {/* Courier Commission Highlight */}
            <div className="bg-gradient-to-br from-orange-500/20 via-slate-900 to-slate-950 border-2 border-orange-500/30 p-5 rounded-3xl flex items-center justify-between relative overflow-hidden shadow-inner">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-950/40 shrink-0">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Sua Comissão Nesta Entrega
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-orange-400 tracking-tight">
                    + R$ {(order.courierEarnings || 0).toFixed(2)}
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Garantido
              </span>
            </div>

            {/* Customer & Address Details */}
            <div className="bg-slate-950 p-4.5 rounded-3xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UserCircle size={14} className="text-orange-400" />
                  Dados do Cliente
                </span>
                {order.customerPhone && (
                  <a 
                    href={`tel:${order.customerPhone.replace(/\D/g, '')}`}
                    className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-900/30 hover:bg-emerald-900/40 transition-colors"
                  >
                    <Phone size={12} />
                    Ligar
                  </a>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-white">{order.customerName || 'Cliente'}</p>
                {order.customerPhone && (
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{maskPhone(order.customerPhone)}</p>
                )}
              </div>

              {/* Delivery Address */}
              {order.customerAddress && (
                <div className="pt-3 border-t border-slate-850 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Endereço de Entrega</p>
                      <p className="text-xs font-medium text-slate-200 leading-relaxed font-mono mt-0.5">
                        {order.customerAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onCopyAddress && onCopyAddress(order.customerAddress || '')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedAddress ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copiar Endereço</span>
                        </>
                      )}
                    </button>

                    {onOpenRoute && (
                      <button
                        type="button"
                        onClick={() => onOpenRoute(order.customerAddress || '')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
                      >
                        <Navigation size={13} />
                        <span>Abrir Rota GPS</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-orange-400" />
                  Itens do Pedido ({itemsCount})
                </span>
              </div>

              <div className="bg-slate-950 rounded-3xl border border-slate-800 divide-y divide-slate-850 overflow-hidden">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded-lg border border-orange-900/30">
                          {item.quantity}x
                        </span>
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {item.name}
                        </span>
                      </div>

                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="mt-1 pl-7 flex flex-wrap gap-1">
                          {item.selectedOptions.map((opt, oIdx) => (
                            <span key={oIdx} className="text-[8px] font-bold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                              + {opt.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-bold text-slate-400 shrink-0">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Financial Summary */}
            <div className="bg-slate-950 p-4.5 rounded-3xl border border-slate-800 space-y-3">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard size={14} className="text-orange-400" />
                Pagamento e Cobrança
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Subtotal itens</span>
                  <span className="font-bold text-slate-200">
                    R$ {(order.items || []).reduce((sum, it) => sum + it.price * it.quantity, 0).toFixed(2)}
                  </span>
                </div>

                {order.deliveryFee !== undefined && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Taxa de Entrega</span>
                    <span className="font-bold text-slate-200">
                      R$ {order.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-sm font-black">
                  <span className="text-white">Valor Total do Pedido</span>
                  <span className="text-orange-400">
                    R$ {order.total.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-850 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400">Forma de Pagamento</span>
                  <span className={`px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider border ${
                    order.paymentMethod === 'dinheiro'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {order.paymentMethod === 'dinheiro' 
                      ? `Dinheiro ${order.changeFor ? `(Troco p/ R$ ${order.changeFor.toFixed(2)})` : ''}` 
                      : (order.paymentMethod?.toUpperCase() || 'PAGO ONLINE')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800">
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-slate-800 transition-colors cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
