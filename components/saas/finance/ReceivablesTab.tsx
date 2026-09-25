import React, { useState } from 'react';
import { 
  Building2, 
  ShoppingBag, 
  Coins, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  Eye, 
  Calendar, 
  Filter, 
  Plus, 
  ChevronRight,
  ArrowDownRight,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';
import { SaasLedgerItem, ReceivablesSubTab } from './types';
import { DEFAULT_MARKETPLACE_FIXED_FEE, calculateMarketplaceTenantStats, getTenantPlanDetails, getDaysDiff } from './financeHelpers';

interface ReceivablesTabProps {
  tenants: Tenant[];
  plans: Plan[];
  orders: Order[];
  marketplaceInvoices: MarketplaceInvoice[];
  saasLedger: SaasLedgerItem[];
  marketplaceFixedFee?: number;
  marketplaceFee?: number;
  onOpenTenantProfile: (tenant: Tenant) => void;
  onOpenCobrar: (tenant: Tenant, amount: number, options?: { monthly?: number; mkt?: number; ordersCount?: number }) => void;
  onQuickSettleSubscription: (tenant: Tenant) => void;
  onSettleMarketplaceCycle: (tenant: Tenant, unbilledOrders: Order[], totalAmount: number) => void;
  onToggleLedgerStatus: (item: SaasLedgerItem) => void;
  onOpenLedgerDetails: (item: SaasLedgerItem) => void;
  onOpenAddLedger: (defaultType: 'receber') => void;
}

export const ReceivablesTab: React.FC<ReceivablesTabProps> = ({
  tenants,
  plans,
  orders,
  marketplaceInvoices,
  saasLedger,
  marketplaceFixedFee = DEFAULT_MARKETPLACE_FIXED_FEE,
  marketplaceFee = 0,
  onOpenTenantProfile,
  onOpenCobrar,
  onQuickSettleSubscription,
  onSettleMarketplaceCycle,
  onToggleLedgerStatus,
  onOpenLedgerDetails,
  onOpenAddLedger,
}) => {
  const [subTab, setSubTab] = useState<ReceivablesSubTab>('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  // MARKETPLACE OVERALL STATS
  const allMktOrders = orders.filter(o => {
    const src = String(o?.source || (o as any)?.channel || '').toLowerCase();
    return src === 'marketplace' || (o as any)?.isMarketplace === true;
  });
  const totalMktOrdersCount = allMktOrders.length;
  const totalMktGenerated = totalMktOrdersCount * marketplaceFixedFee;
  
  const totalMktPaid = marketplaceInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((acc, inv) => acc + (inv.amount || 0), 0);

  const totalMktPending = Math.max(0, totalMktGenerated - totalMktPaid);

  // Filtered tenants for Subscriptions
  const filteredTenants = tenants.filter(tenant => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = tenant.name?.toLowerCase().includes(term);
      const matchPlan = tenant.subscription?.plan?.toLowerCase().includes(term);
      if (!matchName && !matchPlan) return false;
    }

    const daysRemaining = getDaysDiff(tenant.subscription?.expiryDate);
    const isOverdue = daysRemaining < 0 && tenant.subscription?.plan !== 'FREE';
    const isPending = daysRemaining <= 3 && tenant.subscription?.plan !== 'FREE';

    if (statusFilter === 'overdue') return isOverdue;
    if (statusFilter === 'pending') return isPending && !isOverdue;
    if (statusFilter === 'paid') return daysRemaining > 3 || tenant.subscription?.plan === 'FREE';

    return true;
  });

  // Outros recebíveis (ledger entries type === 'receber' que não são do ciclo padrão)
  const otherReceivables = saasLedger.filter(item => {
    if (item.type !== 'receber') return false;
    if (item.category === 'Planos e Marketplace') return false; // Ciclos automáticos
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return item.description?.toLowerCase().includes(term) || item.category?.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* NAVEGAÇÃO DE SUB-ABAS DE A RECEBER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setSubTab('subscriptions')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'subscriptions'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={15} />
            Mensalidades
          </button>

          <button
            onClick={() => setSubTab('marketplace')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'marketplace'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag size={15} />
            Marketplace
          </button>

          <button
            onClick={() => setSubTab('others')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'others'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins size={15} />
            Outros
          </button>
        </div>

        {/* Busca e Ações Rápidas */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lojista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => onOpenAddLedger('receber')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} /> Lançamento
          </button>
        </div>
      </div>

      {/* SUB-ABA 1: MENSALIDADES */}
      {subTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">
              {filteredTenants.length} lojistas cadastrados na plataforma
            </p>

            <div className="flex items-center gap-1">
              {(['all', 'overdue', 'pending', 'paid'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    statusFilter === status
                      ? 'bg-slate-800 text-white font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all' && 'Todos'}
                  {status === 'overdue' && '🔴 Em Atraso'}
                  {status === 'pending' && '🟡 Pendentes'}
                  {status === 'paid' && '🟢 Em Dia'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Lojista</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Plano</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Mensalidade</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Vencimento</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map((tenant) => {
                    const { planName, price } = getTenantPlanDetails(tenant, plans);
                    const daysRemaining = getDaysDiff(tenant.subscription?.expiryDate);
                    const isOverdue = daysRemaining < 0 && tenant.subscription?.plan !== 'FREE';
                    const isPending = daysRemaining <= 3 && tenant.subscription?.plan !== 'FREE';
                    const expiryFormatted = tenant.subscription?.expiryDate
                      ? new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')
                      : 'Sem data';

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <button
                            onClick={() => onOpenTenantProfile(tenant)}
                            className="font-black text-sm text-slate-900 hover:text-indigo-600 transition-colors text-left flex items-center gap-1.5 group cursor-pointer"
                          >
                            <span>{tenant.name}</span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                          </button>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {tenant.id}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                            {planName}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-black text-slate-800 font-sans">
                            R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-500">
                          {expiryFormatted}
                        </td>
                        <td className="px-5 py-4">
                          {tenant.subscription?.plan === 'FREE' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
                              Plano Gratuito
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase border border-rose-100 flex items-center gap-1 w-fit">
                              🔴 Vencido há {Math.abs(daysRemaining)}d
                            </span>
                          ) : isPending ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-black uppercase border border-amber-100 flex items-center gap-1 w-fit">
                              🟠 Vence em {daysRemaining}d
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-100 flex items-center gap-1 w-fit">
                              🟢 Em dia
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenTenantProfile(tenant)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Ver perfil financeiro completo"
                            >
                              <Eye size={12} /> Perfil
                            </button>

                            {tenant.subscription?.plan !== 'FREE' && (
                              <>
                                <button
                                  onClick={() => onOpenCobrar(tenant, price, { monthly: price })}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="Enviar mensagem de cobrança WhatsApp"
                                >
                                  <MessageSquare size={12} /> Cobrar
                                </button>

                                <button
                                  onClick={() => onQuickSettleSubscription(tenant)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
                                  title="Registrar recebimento da mensalidade"
                                >
                                  <CheckCircle2 size={12} /> Baixar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: MARKETPLACE */}
      {subTab === 'marketplace' && (
        <div className="space-y-6">
          {/* CARDS RESUMO MARKETPLACE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Pedidos Realizados
              </span>
              <div className="text-2xl font-black text-slate-800 font-sans flex items-baseline gap-2">
                <span>{totalMktOrdersCount}</span>
                <span className="text-xs font-bold text-slate-400">pedidos</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-1">
                Origem Marketplace B2C
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Taxa Fixa Padrão
              </span>
              <div className="text-2xl font-black text-indigo-600 font-sans">
                R$ {marketplaceFixedFee.toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-1">
                Calculado automaticamente por pedido
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Total Gerado
              </span>
              <div className="text-2xl font-black text-slate-900 font-sans">
                R$ {totalMktGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-1">
                {totalMktOrdersCount} pedidos × R$ {marketplaceFixedFee.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Pendente de Recebimento
              </span>
              <div className="text-2xl font-black text-amber-600 font-sans">
                R$ {totalMktPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-1">
                Recebido liquidado: R$ {totalMktPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* FECHAMENTO AUTOMÁTICO POR LOJISTA E PERÍODO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Fechamento Automático por Lojista
                </h4>
                <p className="text-xs text-slate-400">
                  Cruzamento em tempo real de pedidos marketplace com taxas e mensalidade
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((tenant) => {
                const stats = calculateMarketplaceTenantStats(
                  tenant.id,
                  orders,
                  marketplaceInvoices,
                  marketplaceFixedFee,
                  marketplaceFee
                );

                const { price: monthlyPrice } = getTenantPlanDetails(tenant, plans);
                const totalCycleAmount = stats.unbilledFees + (tenant.subscription?.plan !== 'FREE' ? monthlyPrice : 0);
                const hasPendingOrders = stats.unbilledOrdersCount > 0;
                const periodStr = `${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('pt-BR')} — ${new Date().toLocaleDateString('pt-BR')}`;

                return (
                  <div
                    key={tenant.id}
                    className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Lojista
                          </span>
                          <h5 
                            onClick={() => onOpenTenantProfile(tenant)}
                            className="text-base font-black text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            {tenant.name}
                          </h5>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Período: {periodStr}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          hasPendingOrders || (tenant.subscription?.plan !== 'FREE' && monthlyPrice > 0)
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {hasPendingOrders ? 'Pendente' : 'Regular'}
                        </span>
                      </div>

                      {/* Breakdown Data */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Pedidos</span>
                          <span className="font-black text-slate-800 text-sm">
                            {stats.unbilledOrdersCount}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Taxa</span>
                          <span className="font-black text-slate-800 text-sm">
                            R$ {marketplaceFixedFee.toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Marketplace</span>
                          <span className="font-black text-amber-700 text-sm">
                            R$ {stats.unbilledFees.toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Mensalidade</span>
                          <span className="font-black text-indigo-700 text-sm">
                            R$ {monthlyPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex items-center justify-between pt-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Total a Cobrar
                        </span>
                        <span className="text-lg font-black text-slate-900 font-sans">
                          R$ {totalCycleAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-4 mt-2">
                      <button
                        onClick={() => onOpenTenantProfile(tenant)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Eye size={13} /> Ver Detalhes
                      </button>

                      <button
                        onClick={() => onOpenCobrar(tenant, totalCycleAmount, {
                          monthly: monthlyPrice,
                          mkt: stats.unbilledFees,
                          ordersCount: stats.unbilledOrdersCount,
                        })}
                        disabled={totalCycleAmount <= 0}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare size={13} /> Cobrar
                      </button>

                      <button
                        onClick={() => onSettleMarketplaceCycle(tenant, stats.unbilledOrdersList, totalCycleAmount)}
                        disabled={stats.unbilledOrdersCount === 0 && monthlyPrice <= 0}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <CheckCircle2 size={13} /> Baixar Pagamento
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: OUTROS RECEBÍVEIS */}
      {subTab === 'others' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Outros Lançamentos de Receita
              </h4>
              <p className="text-xs text-slate-400">
                Taxas de setup, consultorias, serviços extras e receitas avulsas
              </p>
            </div>
            <button
              onClick={() => onOpenAddLedger('receber')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={14} /> Novo Lançamento
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {otherReceivables.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {otherReceivables.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                    <div 
                      onClick={() => onOpenLedgerDetails(item)}
                      className="cursor-pointer group flex-1"
                    >
                      <span className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors block">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {item.category}
                        </span>
                        {item.dueDate && (
                          <span>Vencimento: {item.dueDate instanceof Date ? item.dueDate.toLocaleDateString('pt-BR') : new Date(item.dueDate).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-600 font-sans block">
                          + R$ {item.amount?.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${item.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.status === 'paid' ? 'Liquidado' : 'Pendente'}
                        </span>
                      </div>

                      <button
                        onClick={() => onToggleLedgerStatus(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          item.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                        }`}
                      >
                        {item.status === 'paid' ? 'Pago' : 'Dar Baixa'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs font-bold">
                Nenhum lançamento avulso encontrado. Clique em "Novo Lançamento" para cadastrar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
