import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  MessageSquare, 
  Filter, 
  ChevronRight, 
  Clock,
  Zap,
  ArrowRight
} from 'lucide-react';
import { SaasLedgerItem, FinancialPeriodFilter, TenantFinancialProfile } from './types';
import { Tenant } from '../../types';

interface OverviewTabProps {
  totalReceivable: number;
  totalPayable: number;
  totalReceivedInPeriod: number;
  netResultInPeriod: number;
  totalPaidInPeriod: number;
  period: FinancialPeriodFilter;
  setPeriod: (p: FinancialPeriodFilter) => void;
  customRange: { start: string; end: string };
  setCustomRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  pendingTenants: Array<{
    tenant: Tenant;
    amount: number;
    dueDateFormatted: string;
    statusLabel: string;
    daysDiff: number;
    isOverdue: boolean;
  }>;
  alerts: {
    expiredTenantsCount: number;
    expiredTenantsAmount: number;
    dueTodayAmount: number;
    due7DaysAmount: number;
    overduePayablesAmount: number;
  };
  onOpenCobrar: (tenant: Tenant, amount: number) => void;
  onNavigateTab: (tab: 'receivables' | 'payables' | 'reconciliation' | 'reports') => void;
  onOpenTenantProfile: (tenant: Tenant) => void;
  onFilterByAlert: (alertType: 'overdue_tenants' | 'due_today' | 'due_7days' | 'overdue_payables') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  totalReceivable,
  totalPayable,
  totalReceivedInPeriod,
  netResultInPeriod,
  totalPaidInPeriod,
  period,
  setPeriod,
  customRange,
  setCustomRange,
  pendingTenants,
  alerts,
  onOpenCobrar,
  onNavigateTab,
  onOpenTenantProfile,
  onFilterByAlert,
}) => {
  const periodOptions: Array<{ id: FinancialPeriodFilter; label: string }> = [
    { id: 'today', label: 'Hoje' },
    { id: '7days', label: '7 dias' },
    { id: 'this_month', label: 'Este mês' },
    { id: 'last_month', label: 'Mês anterior' },
    { id: 'last_30days', label: 'Últimos 30 dias' },
    { id: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="space-y-6">
      {/* 4 CARDS PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: A RECEBER */}
        <div 
          onClick={() => onNavigateTab('receivables')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              A Receber
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-sans">
            R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Mensalidades + Marketplace</span>
            <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
              Ver detalhes <ChevronRight size={12} />
            </span>
          </p>
        </div>

        {/* CARD 2: A PAGAR */}
        <div 
          onClick={() => onNavigateTab('payables')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              A Pagar
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-all">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-sans">
            R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Despesas & Fornecedores</span>
            <span className="text-rose-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
              Ver despesas <ChevronRight size={12} />
            </span>
          </p>
        </div>

        {/* CARD 3: RECEBIDO NO PERÍODO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Recebido no Período
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-indigo-900 tracking-tight font-sans">
            R$ {totalReceivedInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5">
            Compensado e liquidado no caixa
          </p>
        </div>

        {/* CARD 4: RESULTADO LÍQUIDO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${netResultInPeriod >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              Resultado Líquido
            </span>
            <div className={`p-2 rounded-xl ${netResultInPeriod >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Coins size={16} />
            </div>
          </div>
          <div className={`text-2xl lg:text-3xl font-black tracking-tight font-sans ${netResultInPeriod >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            R$ {netResultInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5">
            {netResultInPeriod >= 0 ? 'Superávit no período selecionado' : 'Atenção: Déficit no período'}
          </p>
        </div>
      </div>

      {/* FILTROS DE PERÍODO & FLUXO FINANCEIRO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              Fluxo Financeiro
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Receitas faturadas vs. despesas operacionais no período
            </p>
          </div>

          {/* Seletor de período */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === opt.id
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar size={14} /> Intervalo Personalizado:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
              <span className="text-slate-400 text-xs font-bold">até</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Visualização de Fluxo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
            <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">Entradas (Receitas)</span>
            <div className="text-2xl font-black text-emerald-700 font-sans mt-1">
              R$ {totalReceivedInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-emerald-200/60 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (totalReceivedInPeriod / (totalReceivedInPeriod + totalPaidInPeriod || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100/80">
            <span className="text-xs font-black uppercase text-rose-800 tracking-wider">Saídas (Despesas)</span>
            <div className="text-2xl font-black text-rose-700 font-sans mt-1">
              R$ {totalPaidInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-rose-200/60 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (totalPaidInPeriod / (totalReceivedInPeriod + totalPaidInPeriod || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${netResultInPeriod >= 0 ? 'bg-indigo-50/60 border-indigo-100/80' : 'bg-amber-50/60 border-amber-100/80'}`}>
            <span className={`text-xs font-black uppercase tracking-wider ${netResultInPeriod >= 0 ? 'text-indigo-800' : 'text-amber-800'}`}>
              Margem de Contribuição
            </span>
            <div className={`text-2xl font-black font-sans mt-1 ${netResultInPeriod >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
              {totalReceivedInPeriod > 0 
                ? `${Math.round((netResultInPeriod / totalReceivedInPeriod) * 100)}%` 
                : '0%'}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2.5">
              {netResultInPeriod >= 0 ? 'Operação saudável e lucrativa' : 'Custos superiores ao faturamento'}
            </p>
          </div>
        </div>
      </div>

      {/* ALERTAS IMPORTANTES (CLICÁVEIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* ALERTA 1: LOJISTAS EM ATRASO */}
        <button
          onClick={() => onFilterByAlert('overdue_tenants')}
          className="p-4 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-2xl text-left transition-all group flex items-start justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              Atrasos de Lojistas
            </span>
            <div className="text-lg font-black text-rose-900 font-sans">
              🔴 {alerts.expiredTenantsCount} {alerts.expiredTenantsCount === 1 ? 'lojista' : 'lojistas'} em atraso
            </div>
            <p className="text-xs text-rose-600 font-semibold">
              R$ {alerts.expiredTenantsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes
            </p>
          </div>
          <ChevronRight size={18} className="text-rose-400 group-hover:translate-x-1 transition-transform mt-1" />
        </button>

        {/* ALERTA 2: VENCEM HOJE */}
        <button
          onClick={() => onFilterByAlert('due_today')}
          className="p-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-2xl text-left transition-all group flex items-start justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Vencendo Hoje
            </span>
            <div className="text-lg font-black text-amber-950 font-sans">
              🟠 R$ {alerts.dueTodayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-amber-700 font-semibold">
              Vencem na data atual
            </p>
          </div>
          <ChevronRight size={18} className="text-amber-500 group-hover:translate-x-1 transition-transform mt-1" />
        </button>

        {/* ALERTA 3: PRÓXIMOS 7 DIAS */}
        <button
          onClick={() => onFilterByAlert('due_7days')}
          className="p-4 bg-yellow-50 hover:bg-yellow-100/80 border border-yellow-200/80 rounded-2xl text-left transition-all group flex items-start justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-800 flex items-center gap-1.5">
              <Clock size={12} className="text-yellow-600" />
              Próximos 7 Dias
            </span>
            <div className="text-lg font-black text-yellow-950 font-sans">
              🟡 R$ {alerts.due7DaysAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-yellow-700 font-semibold">
              Acompanhar previsibilidade
            </p>
          </div>
          <ChevronRight size={18} className="text-yellow-600 group-hover:translate-x-1 transition-transform mt-1" />
        </button>

        {/* ALERTA 4: DESPESAS VENCIDAS */}
        <button
          onClick={() => onFilterByAlert('overdue_payables')}
          className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all group flex items-start justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <AlertCircle size={12} className="text-rose-500" />
              Contas a Pagar
            </span>
            <div className="text-lg font-black text-slate-800 font-sans">
              {alerts.overduePayablesAmount > 0 ? `🔴 R$ ${alerts.overduePayablesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '🟢 Em Dia'}
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              {alerts.overduePayablesAmount > 0 ? 'Despesas vencidas em aberto' : 'Nenhuma conta atrasada'}
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform mt-1" />
        </button>
      </div>

      {/* LOJISTAS COM PENDÊNCIAS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              Lojistas com Pendências
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Apenas pendências imediatas que necessitam de atenção ou cobrança
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('receivables')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            Ver todos a receber <ArrowRight size={14} />
          </button>
        </div>

        {pendingTenants.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingTenants.slice(0, 6).map((item) => (
              <div
                key={item.tenant.id}
                className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div 
                  onClick={() => onOpenTenantProfile(item.tenant)}
                  className="cursor-pointer group flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.tenant.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      {item.tenant.subscription?.plan || 'BASIC'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>Vencimento: {item.dueDateFormatted}</span>
                    <span>•</span>
                    <span className={`font-bold ${item.isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                      {item.statusLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 font-sans block">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Pendente</span>
                  </div>

                  <button
                    onClick={() => onOpenCobrar(item.tenant, item.amount)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <MessageSquare size={13} />
                    Cobrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 text-xs font-bold">
            🎉 Nenhum lojista com pendência no momento! Todas as contas estão regulares.
          </div>
        )}
      </div>
    </div>
  );
};
