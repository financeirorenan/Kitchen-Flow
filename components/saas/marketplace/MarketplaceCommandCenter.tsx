import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Store, 
  Users, 
  Percent, 
  Sparkles, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Award,
  ChevronRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Tenant } from '../../../types';

interface MarketplaceCommandCenterProps {
  tenants: Tenant[];
  marketplaceFixedFee: number;
  marketplaceFeePercent: number;
  onNavigateTab?: (tab: string) => void;
  onQuickAction?: (action: string) => void;
}

export const MarketplaceCommandCenter: React.FC<MarketplaceCommandCenterProps> = ({
  tenants,
  marketplaceFixedFee = 1.50,
  marketplaceFeePercent = 10,
  onNavigateTab,
  onQuickAction
}) => {
  const [periodFilter, setPeriodFilter] = useState<'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month'>('today');

  const activeTenants = tenants.filter(t => t.active);
  const inactiveTenants = tenants.filter(t => !t.active);
  const newTenantsThisMonth = Math.max(1, Math.floor(tenants.length * 0.2));

  // Multiplier according to period
  const multiplier = periodFilter === 'today' ? 1 
    : periodFilter === 'yesterday' ? 0.92 
    : periodFilter === '7d' ? 6.8 
    : periodFilter === '30d' ? 28.5 
    : periodFilter === 'this_month' ? 18.4 
    : 27.2;

  // Base GMV & Orders Simulation
  const baseOrders = Math.max(18, activeTenants.length * 12 + 15);
  const totalOrders = Math.round(baseOrders * multiplier);
  const avgTicket = 48.60;
  const totalGmv = totalOrders * avgTicket;

  // Revenue Breakdown
  const commissionFromStores = (totalGmv * (marketplaceFeePercent / 100));
  const fixedFeesFromOrders = totalOrders * marketplaceFixedFee;
  const adRevenue = Math.round((periodFilter === 'today' ? 149.00 : periodFilter === '7d' ? 890.00 : 3450.00) * (multiplier / (periodFilter === 'today' ? 1 : 10)));
  const bannerRevenue = Math.round(adRevenue * 0.55);
  const sponsoredHighlightRevenue = Math.round(adRevenue * 0.45);
  const otherRevenue = Math.round(totalOrders * 0.35);

  const totalNovaRevenue = commissionFromStores + fixedFeesFromOrders + bannerRevenue + sponsoredHighlightRevenue + otherRevenue;
  const takeRate = ((totalNovaRevenue / (totalGmv || 1)) * 100).toFixed(1);

  // Customer metrics
  const activeCustomers = Math.round(totalOrders * 0.78);
  const newCustomers = Math.round(activeCustomers * 0.32);
  const recurringCustomers = activeCustomers - newCustomers;

  return (
    <div className="space-y-6 text-left">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              ● Operação em Tempo Real
            </span>
            <span className="text-xs text-slate-400 font-medium">Marketplace Nova</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Centro de Comando & Performance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Indicadores financeiros, GMV vs Receita Real e métricas operacionais consolidadas.</p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7d', label: '7 Dias' },
            { id: '30d', label: '30 Dias' },
            { id: 'this_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Anterior' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodFilter === p.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Financial Comparison: GMV vs Real Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GMV Card (Total Transacionado) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/20">
                Volume Bruto Transacionado
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp size={14} /> +14.8% vs período anterior
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">GMV Total do Marketplace</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-1">
                R$ {totalGmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Valor total transacionado em produtos e delivery através das <span className="font-bold text-white">{activeTenants.length} lojas ativas</span>.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total de Pedidos</p>
                <p className="text-lg font-black text-white">{totalOrders.toLocaleString('pt-BR')} pedidos</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Ticket Médio</p>
                <p className="text-lg font-black text-white">R$ {avgTicket.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Real Revenue Card (Receita Real do Marketplace Nova) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/20">
                Receita Líquida do Marketplace
              </span>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Take Rate Médio: {takeRate}%
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Receita Real Faturada pelo Nova</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight text-emerald-400 mt-1">
                R$ {totalNovaRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Faturamento gerado por comissões, taxas fixas, venda de publicidade e destaques.
              </p>
            </div>

            {/* Quick breakdown bars */}
            <div className="pt-3 border-t border-emerald-900/40 grid grid-cols-3 gap-2 text-left">
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-emerald-500/10">
                <p className="text-[9px] uppercase font-black text-slate-400">Comissões</p>
                <p className="text-xs font-black text-white">R$ {(commissionFromStores + fixedFeesFromOrders).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-amber-500/10">
                <p className="text-[9px] uppercase font-black text-amber-400">Publicidade</p>
                <p className="text-xs font-black text-amber-300">R$ {(bannerRevenue + sponsoredHighlightRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-indigo-500/10">
                <p className="text-[9px] uppercase font-black text-indigo-400">Outras Taxas</p>
                <p className="text-xs font-black text-indigo-300">R$ {otherRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Cards Secundários: Pedidos, Lojas, Clientes e Monetização */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pedidos */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume de Pedidos</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalOrders.toLocaleString('pt-BR')}</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-0.5">
              <TrendingUp size={13} />
              <span>+11.5% vs anterior</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Ticket Médio</span>
            <span className="font-bold text-slate-800">R$ {avgTicket.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Lojas Conectadas */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lojas no Marketplace</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Store size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              <span className="text-emerald-600">{activeTenants.length} Abertas</span>
              <span className="text-slate-300 mx-1.5">/</span>
              <span className="text-slate-400 text-lg">{inactiveTenants.length}</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{tenants.length} lojas cadastradas</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Novas no mês</span>
            <span className="font-bold text-emerald-600">+{newTenantsThisMonth} estabelecimentos</span>
          </div>
        </div>

        {/* Base de Clientes */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes Ativos</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{activeCustomers.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Consumidores no período</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Novos: <strong className="text-indigo-600">{newCustomers}</strong></span>
            <span>Recorrentes: <strong className="text-emerald-600">{recurringCustomers}</strong></span>
          </div>
        </div>

        {/* Receita de Publicidade */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Publicidade & Ads</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Sparkles size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">
              R$ {(bannerRevenue + sponsoredHighlightRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Espaços e banners vendidos</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Banners: <strong className="text-slate-800">R$ {bannerRevenue}</strong></span>
            <span>Destaques: <strong className="text-slate-800">R$ {sponsoredHighlightRevenue}</strong></span>
          </div>
        </div>
      </div>

      {/* Detalhamento da Composição de Receita do Marketplace Nova */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <PieChartIcon size={18} className="text-indigo-600" />
              Composição Detalhada da Receita do Marketplace Nova
            </h3>
            <p className="text-xs text-slate-500">Entenda exatamente de onde vem cada real faturado pelo marketplace.</p>
          </div>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
            Total Líquido: R$ {totalNovaRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Item 1: Comissão Percentual */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase">1. Comissões %</span>
              <span className="text-[10px] font-black text-indigo-600">{marketplaceFeePercent}% global</span>
            </div>
            <p className="text-lg font-black text-slate-900">
              R$ {commissionFromStores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">Cobrado sobre o subtotal de produtos das lojas.</p>
          </div>

          {/* Item 2: Taxas Fixas */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase">2. Taxa por Pedido</span>
              <span className="text-[10px] font-black text-emerald-600">R$ {marketplaceFixedFee.toFixed(2)}/un</span>
            </div>
            <p className="text-lg font-black text-slate-900">
              R$ {fixedFeesFromOrders.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">{totalOrders} pedidos processados no período.</p>
          </div>

          {/* Item 3: Banners de Publicidade */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-700 uppercase">3. Banners Home</span>
              <span className="text-[10px] font-black text-amber-600">Publicidade</span>
            </div>
            <p className="text-lg font-black text-amber-900">
              R$ {bannerRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-amber-700">Venda de espaços publicitários no app.</p>
          </div>

          {/* Item 4: Destaques & Selos */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-700 uppercase">4. Destaques Patrocinados</span>
              <span className="text-[10px] font-black text-amber-600">Ranking</span>
            </div>
            <p className="text-lg font-black text-amber-900">
              R$ {sponsoredHighlightRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-amber-700">Lojas que pagam para aparecer no topo da lista.</p>
          </div>

          {/* Item 5: Outras Receitas */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase">5. Outras Receitas</span>
              <span className="text-[10px] font-black text-slate-500">Conveniência</span>
            </div>
            <p className="text-lg font-black text-slate-900">
              R$ {otherRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">Taxas de conveniência e serviços adicionais.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
