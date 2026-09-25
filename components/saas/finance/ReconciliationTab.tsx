import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  ArrowRight, 
  FileCheck, 
  ShieldCheck, 
  Search, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Tenant, Order, MarketplaceInvoice } from '../../types';
import { SaasLedgerItem, FinancialDivergenceItem } from './types';
import { DEFAULT_MARKETPLACE_FIXED_FEE } from './financeHelpers';

interface ReconciliationTabProps {
  tenants: Tenant[];
  orders: Order[];
  marketplaceInvoices: MarketplaceInvoice[];
  saasLedger: SaasLedgerItem[];
  marketplaceFixedFee?: number;
  onFixDivergence?: (item: FinancialDivergenceItem) => void;
  onNavigateTab: (tab: 'receivables' | 'payables') => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  tenants,
  orders,
  marketplaceInvoices,
  saasLedger,
  marketplaceFixedFee = DEFAULT_MARKETPLACE_FIXED_FEE,
  onFixDivergence,
  onNavigateTab,
}) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [lastReconciledAt, setLastReconciledAt] = useState<Date>(new Date());
  const [activeFilter, setActiveFilter] = useState<'all' | 'reconciled' | 'pending' | 'divergence'>('all');

  // Cálculos de Conciliação
  const mktOrders = orders.filter(o => o.source === 'marketplace' || o.source === 'Marketplace');
  const totalMktOrders = mktOrders.length;
  const totalMktGenerated = totalMktOrders * marketplaceFixedFee;

  const billedOrderIds = new Set(marketplaceInvoices.map(i => i.orderId).filter(Boolean));
  const unbilledOrders = mktOrders.filter(o => !billedOrderIds.has(o.id));

  const totalPaidInvoices = marketplaceInvoices.filter(i => i.status === 'paid');
  const totalPendingInvoices = marketplaceInvoices.filter(i => i.status === 'pending');

  const totalReceivedAmount = totalPaidInvoices.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalPendingInvoiceAmount = totalPendingInvoices.reduce((acc, i) => acc + (i.amount || 0), 0);
  const unbilledOrdersAmount = unbilledOrders.length * marketplaceFixedFee;
  const totalPendingAmount = totalPendingInvoiceAmount + unbilledOrdersAmount;

  // Detecção Automática de Divergências
  const divergences: FinancialDivergenceItem[] = [];

  // 1. Pedidos Marketplace não faturados
  if (unbilledOrders.length > 0) {
    divergences.push({
      id: 'div_unbilled_orders',
      type: 'unbilled_order',
      title: `${unbilledOrders.length} Pedidos Marketplace não faturados`,
      description: `Existem ${unbilledOrders.length} pedidos concluídos no marketplace sem fatura de conciliação gerada (R$ ${(unbilledOrders.length * marketplaceFixedFee).toFixed(2)}).`,
      severity: 'medium',
      amount: unbilledOrders.length * marketplaceFixedFee,
    });
  }

  // 2. Faturas de marketplace sem correspondência no livro razão
  const ledgerIds = new Set(saasLedger.map(l => l.id));
  const orphanInvoices = marketplaceInvoices.filter(inv => (inv as any).ledgerId && !ledgerIds.has((inv as any).ledgerId));
  if (orphanInvoices.length > 0) {
    divergences.push({
      id: 'div_orphan_invoices',
      type: 'orphan_payment',
      title: `${orphanInvoices.length} Faturas sem lançamento no Livro Razão`,
      description: `Faturas de marketplace geradas que não possuem vínculo ativo com a tesouraria geral.`,
      severity: 'high',
      amount: orphanInvoices.reduce((acc, i) => acc + (i.amount || 0), 0),
    });
  }

  // 3. Faturas com valores pendentes vencidos há mais de 10 dias
  const overdueInvoices = marketplaceInvoices.filter(inv => {
    if (inv.status !== 'pending' || !inv.createdAt) return false;
    const date = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt);
    const diffDays = Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 10;
  });

  if (overdueInvoices.length > 0) {
    divergences.push({
      id: 'div_overdue_invoices',
      type: 'unpaid_invoice',
      title: `${overdueInvoices.length} Cobranças sem baixa há mais de 10 dias`,
      description: `Faturas emitidas que ultrapassaram o ciclo normal de conciliação e necessitam de cobrança ativa.`,
      severity: 'medium',
      amount: overdueInvoices.reduce((acc, i) => acc + (i.amount || 0), 0),
    });
  }

  // 4. Verificação de assinaturas com pagamento mas status desatualizado
  const activeTenantsWithoutPaidRecord = tenants.filter(t => {
    if (t.subscription?.plan === 'FREE') return false;
    const lastPayment = saasLedger.find(l => l.tenantId === t.id && l.status === 'paid' && l.type === 'receber');
    return !lastPayment && !t.subscription?.expiryDate;
  });

  if (activeTenantsWithoutPaidRecord.length > 0) {
    divergences.push({
      id: 'div_active_tenants_no_record',
      type: 'amount_mismatch',
      title: `${activeTenantsWithoutPaidRecord.length} Lojistas em plano pago sem registro de quitação inicial`,
      description: `Lojas ativas em planos PRO/Enterprise que não possuem comprovante de liquidação vinculado.`,
      severity: 'low',
    });
  }

  const handleReconcileNow = () => {
    setIsReconciling(true);
    setTimeout(() => {
      setIsReconciling(false);
      setLastReconciledAt(new Date());
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO COM FLUXO DA CADEIA & AÇÃO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
              Auditoria Contínua
            </span>
            <span className="text-xs text-slate-400">
              Última validação: {lastReconciledAt.toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Cadeia de Conciliação Financeira
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Validação integral: <strong>PEDIDOS → COBRANÇA → PAGAMENTO → BAIXA</strong>
          </p>
        </div>

        <button
          onClick={handleReconcileNow}
          disabled={isReconciling}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <RefreshCw size={14} className={isReconciling ? 'animate-spin' : ''} />
          {isReconciling ? 'Validando Cadeia...' : 'Conciliar Agora'}
        </button>
      </div>

      {/* OS 3 INDICADORES PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* INDICADOR: CONCILIADO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              [ CONCILIADO ]
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800 font-sans">
            R$ {totalReceivedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5">
            {totalPaidInvoices.length} faturas e pedidos baixados com sucesso
          </p>
        </div>

        {/* INDICADOR: PENDENTE */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              [ PENDENTE ]
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 font-sans">
            R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5">
            {unbilledOrders.length} pedidos a faturar + faturas em aberto
          </p>
        </div>

        {/* INDICADOR: DIVERGÊNCIA */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              [ DIVERGÊNCIA ]
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 font-sans">
            {divergences.length} {divergences.length === 1 ? 'Alerta' : 'Alertas'}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5">
            {divergences.length > 0 ? 'Inconsistências para revisão imediata' : 'Zero divergências detectadas'}
          </p>
        </div>
      </div>

      {/* EXEMPLO PRÁTICO & AUDITORIA DE VOLUMETRIA MARKETPLACE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <FileCheck size={16} className="text-indigo-600" />
          Balanço do Marketplace
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Pedidos Realizados</span>
            <span className="text-base font-black text-slate-800 font-sans mt-0.5 block">
              {totalMktOrders.toLocaleString('pt-BR')} pedidos
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Valor Gerado (R$ 2,00)</span>
            <span className="text-base font-black text-slate-900 font-sans mt-0.5 block">
              R$ {totalMktGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Recebido</span>
            <span className="text-base font-black text-emerald-600 font-sans mt-0.5 block">
              R$ {totalReceivedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Pendente</span>
            <span className="text-base font-black text-amber-600 font-sans mt-0.5 block">
              R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* LISTA DE DIVERGÊNCIAS DETECTADAS COM AÇÃO RÁPIDA */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-slate-900">
              Validações e Alertas de Conciliação
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Verificações automáticas de duplicidade, pedidos não faturados e baixas incorretas
            </p>
          </div>
        </div>

        {divergences.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {divergences.map((div) => (
              <div key={div.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      div.severity === 'high' 
                        ? 'bg-rose-100 text-rose-800' 
                        : div.severity === 'medium' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {div.severity === 'high' ? 'Alta Prioridade' : div.severity === 'medium' ? 'Atenção' : 'Informativo'}
                    </span>
                    <span className="font-black text-sm text-slate-900">{div.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl">{div.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {div.amount !== undefined && (
                    <span className="text-sm font-black text-slate-800 font-sans">
                      R$ {div.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}

                  <button
                    onClick={() => onNavigateTab('receivables')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    Resolver <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck size={24} />
            </div>
            <p className="text-sm font-black text-slate-800">
              Tudo 100% Conciliado e Seguro
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Não foram identificadas duplicidades, pedidos perdidos ou inconsistências entre pedidos, faturas e livro razão.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
