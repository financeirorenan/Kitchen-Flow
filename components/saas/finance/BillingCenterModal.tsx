import React, { useState } from 'react';
import { X, MessageSquare, Copy, Check, ExternalLink, Send } from 'lucide-react';
import { Tenant } from '../../types';
import { generateWhatsAppBillingMessage } from './financeHelpers';

interface BillingCenterModalProps {
  tenant: Tenant | null;
  amount: number;
  options?: {
    monthly?: number;
    mkt?: number;
    ordersCount?: number;
  };
  onClose: () => void;
}

export const BillingCenterModal: React.FC<BillingCenterModalProps> = ({
  tenant,
  amount,
  options,
  onClose,
}) => {
  if (!tenant) return null;

  const dueDateFormatted = tenant.subscription?.expiryDate
    ? new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const defaultMsg = generateWhatsAppBillingMessage({
    tenantName: tenant.name,
    planName: tenant.subscription?.plan || 'Plano Pro',
    monthlyAmount: options?.monthly,
    marketplaceOrdersCount: options?.ordersCount,
    marketplaceAmount: options?.mkt,
    totalAmount: amount,
    dueDateStr: dueDateFormatted,
  });

  const [message, setMessage] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = tenant.phone ? tenant.phone.replace(/\D/g, '') : '';
    const textToSend = encodeURIComponent(message);
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${textToSend}`
      : `https://api.whatsapp.com/send?text=${textToSend}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-500" />
              Cobrança — {tenant.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total a cobrar: <strong className="text-slate-900 font-sans">R$ {amount.toFixed(2)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
              Mensagem para Envio
            </label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 leading-relaxed focus:outline-none focus:border-amber-500"
            />
          </div>

          {tenant.phone && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Telefone de contato: <strong className="text-slate-800">{tenant.phone}</strong>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar Texto'}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ExternalLink size={14} /> Abrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
