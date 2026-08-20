import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, DollarSign, AlertTriangle, Check, X, ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { Order } from '../types';

interface OpenCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (openingValue: number) => Promise<void> | void;
  triggerOrder?: Order | null;
  pendingCount?: number;
}

export const OpenCashModal: React.FC<OpenCashModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  triggerOrder,
  pendingCount = 0,
}) => {
  const [openingValueInput, setOpeningValueInput] = useState('0,00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const formatCurrency = (val: string) => {
    const clean = val.replace(/\D/g, '');
    const num = Number(clean) / 100;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrency = (val: string) => {
    const clean = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const handlePresetSelect = (value: number) => {
    setOpeningValueInput(
      value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const numVal = parseCurrency(openingValueInput);
      await onConfirm(numVal);
      onClose();
    } catch (err) {
      console.error('Erro ao abrir caixa:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickPresets = [0, 50, 100, 150, 200, 300];

  return (
    <AnimatePresence>
      <div 
        id="modal-open-cash"
        className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 p-6 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <Lock size={24} className="text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-black uppercase tracking-wider border border-amber-300/30">
                      Caixa Fechado
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
                    Abertura de Caixa
                  </h3>
                </div>
              </div>
              <button
                id="btn-close-open-cash-modal"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Context Notice for Incoming Order */}
            {triggerOrder ? (
              <div className="bg-indigo-50 border border-indigo-100/80 rounded-2xl p-4 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                  {triggerOrder.type === 'delivery' ? <ShoppingBag size={20} /> : <Store size={20} />}
                </div>
                <div className="space-y-1 text-left flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                    Novo Pedido {triggerOrder.source === 'marketplace' ? 'Marketplace' : 'Cardápio Digital'}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    Pedido de <strong className="text-indigo-950 font-bold">{triggerOrder.customerName || 'Cliente'}</strong> (R$ {(triggerOrder.total || 0).toFixed(2)}) recebido.
                  </p>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed font-medium">
                    Abra o caixa agora para que as vendas deste pedido e dos próximos sejam contabilizadas no turno de hoje.
                  </p>
                </div>
              </div>
            ) : pendingCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1 text-left flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                    {pendingCount} Pedido(s) Aguardando Caixa
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    Existem pedidos recebidos via Cardápio Digital ou Marketplace que precisam de um caixa aberto para conciliação.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-3 items-center">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <p className="text-xs font-semibold text-slate-600">
                  Defina o fundo de troco inicial para abrir o turno de vendas.
                </p>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 text-center">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                  Valor de Fundo de Troco Inicial
                </label>
                
                <div className="relative max-w-[260px] mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 select-none">
                    R$
                  </span>
                  <input
                    id="input-opening-cash-value"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={openingValueInput}
                    onChange={(e) => setOpeningValueInput(formatCurrency(e.target.value))}
                    className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-3xl font-black text-slate-800 outline-none transition-all text-center tracking-tight shadow-inner"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                  Valores Rápidos
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-[340px] mx-auto">
                  {quickPresets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handlePresetSelect(val)}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                        parseCurrency(openingValueInput) === val
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {val === 0 ? 'R$ 0 (Sem Fundo)' : `R$ ${val},00`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  id="btn-confirm-open-cash"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-75 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-950/20 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Unlock size={18} />
                      {triggerOrder ? 'Abrir Caixa e Aceitar Pedido' : 'Confirmar e Abrir Caixa'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar / Decidir Depois
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
