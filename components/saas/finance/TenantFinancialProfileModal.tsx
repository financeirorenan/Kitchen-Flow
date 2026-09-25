import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Phone
} from 'lucide-react';
import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';
import { SaasLedgerItem } from './types';
import { 
  getTenantPlanDetails, 
  getDaysDiff, 
  calculateMarketplaceTenantStats, 
  generateWhatsAppBillingMessage,
  DEFAULT_MARKETPLACE_FIXED_FEE 
} from './financeHelpers';

interface TenantFinancialProfileModalProps {
  tenant: Tenant | null;
  plans: Plan[];
  orders: Order[];
  marketplaceInvoices: MarketplaceInvoice[];
  saasLedger: SaasLedgerItem[];
  marketplaceFixedFee?: number;
  onClose: () => void;
  onQuickSettle: (tenant: Tenant) => void;
}

export const TenantFinancialProfileModal: React.FC<TenantFinancialProfileModalProps> = ({
  tenant,
  plans,
  orders,
  marketplaceInvoices,
  saasLedger,
  marketplaceFixedFee = DEFAULT_MARKETPLACE_FIXED_FEE,
  onClose,
  onQuickSettle,
}) => {
  const [copied, setCopied] = useState(false);
  const [showWhatsAppEditor, setShowWhatsAppEditor] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  if (!tenant) return null;

  const { planName, price: monthlyPrice } = getTenantPlanDetails(tenant, plans);
  const daysRemaining = getDaysDiff(tenant.subscription?.expiryDate);
  const isOverdue = daysRemaining < 0 && tenant.subscription?.plan !== 'FREE';

  const mktStats = calculateMarketplaceTenantStats(
    tenant.id,
    orders,
    marketplaceInvoices,
    marketplaceFixedFee
  );

  const totalReceivable = (isOverdue ? monthlyPrice : 0) + mktStats.totalPendingFees;
  const totalOverdue = isOverdue ? monthlyPrice : 0;

  // Payments this month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tenantPaidLedger = saasLedger.filter(i => {
    if (i.tenantId !== tenant.id || i.status !== 'paid' || i.type !== 'receber') return false;
    const itemDate = i.createdAt ? (i.createdAt instanceof Date ? i.createdAt : new Date(i.createdAt)) : null;
    return itemDate && itemDate >= firstDayOfMonth;
  });
  const paidThisMonth = tenantPaidLedger.reduce((acc, i) => acc + (i.amount || 0), 0);

  // History construction
  const historyItems: Array<{
    id: string;
    date: Date;
    description: string;
    type: string;
    amount: number;
    status: 'paid' | 'pending';
    paymentMethod: string;
  }> = [];

  // Add ledger items for this tenant
  saasLedger.filter(l => l.tenantId === tenant.id).forEach(item => {
    historyItems.push({
      id: item.id,
      date: item.createdAt instanceof Date ? item.createdAt : item.createdAt ? new Date(item.createdAt) : new Date(),
      description: item.description,
      type: item.type === 'receber' ? 'Receita' : 'Despesa',
      amount: Number(item.amount || 0),
      status: item.status,
      paymentMethod: item.paymentMethod || 'Pix',
    });
  });

  // Add unbilled marketplace indicator if any
  if (mktStats.unbilledOrdersCount > 0) {
    historyItems.unshift({
      id: `unbilled_mkt_${tenant.id}`,
      date: new Date(),
      description: `Marketplace — ${mktStats.unbilledOrdersCount} pedidos`,
      type: 'Receita',
      amount: mktStats.unbilledFees,
      status: 'pending',
      paymentMethod: 'Pix / Conciliação',
    });
  }

  // Next due date formatted
  const nextDueDateFormatted = tenant.subscription?.expiryDate
    ? new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')
    : 'A definir';

  // Prepare default WhatsApp message
  const defaultWhatsAppMsg = generateWhatsAppBillingMessage({
    tenantName: tenant.name,
    planName,
    monthlyAmount: isOverdue ? monthlyPrice : undefined,
    marketplaceOrdersCount: mktStats.unbilledOrdersCount > 0 ? mktStats.unbilledOrdersCount : undefined,
    marketplaceAmount: mktStats.unbilledFees > 0 ? mktStats.unbilledFees : undefined,
    totalAmount: totalReceivable > 0 ? totalReceivable : monthlyPrice,
    dueDateStr: nextDueDateFormatted,
  });

  const handleOpenCobrar = () => {
    setCustomMessage(defaultWhatsAppMsg);
    setShowWhatsAppEditor(true);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage || defaultWhatsAppMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = tenant.phone ? tenant.phone.replace(/\D/g, '') : '';
    const textToSend = encodeURIComponent(customMessage || defaultWhatsAppMsg);
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${textToSend}`
      : `https://api.whatsapp.com/send?text=${textToSend}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {tenant.name}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase border border-indigo-100">
                {planName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5 font-medium">
              <span>Mensalidade: <strong>R$ {monthlyPrice.toFixed(2)}</strong></span>
              <span>•</span>
              <span>Próximo vencimento: <strong>{nextDueDateFormatted}</strong></span>
              {tenant.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone size={11} /> {tenant.phone}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* RESUMO (CARDS COMPACTOS) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                A Receber
              </span>
              <span className="text-base font-black text-slate-900 font-sans block mt-1">
                R$ {totalReceivable.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-100">
              <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider block">
                Em Atraso
              </span>
              <span className="text-base font-black text-rose-700 font-sans block mt-1">
                R$ {totalOverdue.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                Pago Este Mês
              </span>
              <span className="text-base font-black text-emerald-700 font-sans block mt-1">
                R$ {paidThisMonth.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">
                Pedidos Mkt
              </span>
              <span className="text-base font-black text-indigo-900 font-sans block mt-1">
                {mktStats.totalOrdersCount}
              </span>
            </div>

            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-100">
              <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider block">
                Taxas Mkt
              </span>
              <span className="text-base font-black text-amber-900 font-sans block mt-1">
                R$ {mktStats.unbilledFees.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ÁREA DE COBRANÇA WHATSAPP PRONTA */}
          <div className="p-5 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30 rounded-3xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-amber-600" />
                  Cobrança Rápida via WhatsApp
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mensagem pré-formatada pronta para envio com valores discriminados
                </p>
              </div>

              {!showWhatsAppEditor ? (
                <button
                  onClick={handleOpenCobrar}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <MessageSquare size={14} /> Enviar Cobrança
                </button>
              ) : (
                <button
                  onClick={() => setShowWhatsAppEditor(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Fechar Editor
                </button>
              )}
            </div>

            {showWhatsAppEditor && (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3.5 bg-white border border-amber-200 rounded-2xl text-xs font-medium text-slate-800 leading-relaxed focus:outline-none focus:border-amber-500 shadow-inner"
                  placeholder="Edite a mensagem antes de enviar..."
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={handleCopyMessage}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar Mensagem'}
                  </button>

                  <button
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <ExternalLink size={14} /> Abrir no WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* HISTÓRICO FINANCEIRO */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Histórico Financeiro
            </h4>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 font-black text-slate-400 uppercase">Data</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Descrição</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Tipo</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Valor</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Status</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Forma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyItems.length > 0 ? (
                    historyItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-600">
                          {item.date.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-black text-slate-900">
                          {item.description}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {item.type}
                        </td>
                        <td className="p-3 font-black text-slate-800 font-sans">
                          R$ {item.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {item.paymentMethod}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-bold text-xs">
                        Nenhum registro financeiro encontrado para este lojista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Fechar
          </button>

          {isOverdue && (
            <button
              onClick={() => {
                onQuickSettle(tenant);
                onClose();
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 size={14} /> Dar Baixa na Mensalidade
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
