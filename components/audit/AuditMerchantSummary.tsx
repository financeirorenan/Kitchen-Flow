import React from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  Tag, 
  ArrowDownRight, 
  Undo2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  FileEdit, 
  Sliders, 
  ShieldCheck, 
  BarChart3, 
  Building2, 
  Users, 
  Percent,
  ArrowRight
} from 'lucide-react';
import { 
  MerchantAuditSummary, 
  PlatformComparisonMetrics 
} from '../../services/auditService';
import { Tenant } from '../../types';

interface AuditMerchantSummaryProps {
  summary: MerchantAuditSummary;
  comparison: PlatformComparisonMetrics;
  tenant: Tenant;
  onNavigateTab: (tab: string) => void;
}

export const AuditMerchantSummary: React.FC<AuditMerchantSummaryProps> = ({
  summary,
  comparison,
  tenant,
  onNavigateTab
}) => {
  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercent = (val: number) => {
    return `${(val || 0).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO RESUMO EXECUTIVO */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                Visão Executiva & Diagnóstico: {tenant.name}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Operação Auditada
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Consolidado dos 3 pilares da auditoria do lojista: Operacional, Financeiro e Trilha de Conformidade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('reconciliation')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Conciliação Automática
          </button>
        </div>
      </div>

      {/* BLOCO 1: OPERAÇÃO DO LOJISTA */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
              1
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Operação do Estabelecimento
              </h4>
              <p className="text-xs text-slate-500">Fluxo volumétrico e status dos pedidos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
          >
            Ver Pedidos Detalhados <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Total Pedidos */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Total de Pedidos</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{summary.totalOrders}</div>
            <span className="text-[10px] text-slate-500">Volume gerado no período</span>
          </div>

          {/* Concluídos */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-xl border border-emerald-200/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold">Concluídos / Entregues</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-950">{summary.deliveredOrders}</div>
            <span className="text-[10px] text-emerald-700">
              {summary.totalOrders > 0 ? ((summary.deliveredOrders / summary.totalOrders) * 100).toFixed(1) : 0}% de conclusão
            </span>
          </div>

          {/* Cancelados */}
          <div 
            onClick={() => onNavigateTab('cancellations')}
            className="p-3.5 bg-rose-50/40 hover:bg-rose-50/70 rounded-xl border border-rose-200/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-bold">Cancelados</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-950">{summary.canceledOrders}</div>
            <span className="text-[10px] text-rose-700 font-semibold">
              {summary.totalOrders > 0 ? ((summary.canceledOrders / summary.totalOrders) * 100).toFixed(1) : 0}% taxa de cancelamento
            </span>
          </div>

          {/* Em Andamento */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="p-3.5 bg-amber-50/40 hover:bg-amber-50/70 rounded-xl border border-amber-200/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold">Em Andamento</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-950">{summary.inProgressOrders}</div>
            <span className="text-[10px] text-amber-700">Preparo / Em trânsito</span>
          </div>

          {/* Ticket Médio */}
          <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/60">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-[11px] font-bold">Ticket Médio</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-950">{formatCurrency(summary.averageTicket)}</div>
            <span className="text-[10px] text-indigo-700">Por pedido aprovado</span>
          </div>
        </div>
      </div>

      {/* BLOCO 2: FINANCEIRO DO LOJISTA & REPASSES */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
              2
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Financeiro & Repasses do Marketplace
              </h4>
              <p className="text-xs text-slate-500">Fluxo de caixa, descontos, estornos e comissões apuradas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('payouts')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
            >
              Auditoria de Repasses <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Faturamento Bruto */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-slate-500">Faturamento Bruto</span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(summary.grossRevenue)}
            </div>
            <span className="text-[10px] text-slate-500">Vendas totais sem deduções</span>
          </div>

          {/* Descontos Concedidos */}
          <div 
            onClick={() => onNavigateTab('discounts')}
            className="p-4 bg-amber-50/30 hover:bg-amber-50/60 rounded-xl border border-amber-200/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold">Descontos Concedidos</span>
              <Tag className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-950 mt-1">
              {formatCurrency(summary.totalDiscounts)}
            </div>
            <span className="text-[10px] text-amber-700">
              {summary.grossRevenue > 0 ? ((summary.totalDiscounts / summary.grossRevenue) * 100).toFixed(1) : 0}% do faturamento bruto
            </span>
          </div>

          {/* Faturamento Líquido Vendas */}
          <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-200/60">
            <span className="text-xs font-bold text-blue-700">Faturamento Líquido de Vendas</span>
            <div className="text-xl font-black text-blue-950 mt-1">
              {formatCurrency(summary.netRevenue)}
            </div>
            <span className="text-[10px] text-blue-600">Bruto deduzido de descontos</span>
          </div>

          {/* Total Recebido (Quitado) */}
          <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-200/60">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold">Total Recebido (Quitado)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-950 mt-1">
              {formatCurrency(summary.totalReceived)}
            </div>
            <span className="text-[10px] text-emerald-700">Quitado via meios de pagamento</span>
          </div>

          {/* Total em Aberto (Fiado) */}
          <div 
            onClick={() => onNavigateTab('accounts-receivable')}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-xs font-bold">Total em Aberto / Fiado</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(summary.totalOpenPending)}
            </div>
            <span className="text-[10px] text-slate-500">Pendente de liquidação</span>
          </div>

          {/* Total Estornado */}
          <div className="p-4 bg-rose-50/30 rounded-xl border border-rose-200/60">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-bold">Total Estornado</span>
              <Undo2 className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-950 mt-1">
              {formatCurrency(summary.totalReversals)}
            </div>
            <span className="text-[10px] text-rose-700">Devoluções e cancelamentos</span>
          </div>

          {/* Taxas/Comissões da Plataforma */}
          <div className="p-4 bg-purple-50/30 rounded-xl border border-purple-200/60">
            <span className="text-xs font-bold text-purple-700">Taxas & Comissão Plataforma</span>
            <div className="text-xl font-black text-purple-950 mt-1">
              {formatCurrency(summary.platformFees)}
            </div>
            <span className="text-[10px] text-purple-700">Taxas de serviço e split</span>
          </div>

          {/* Valor Líquido do Lojista */}
          <div className="p-4 bg-emerald-500 text-white rounded-xl shadow-xs">
            <span className="text-xs font-bold text-emerald-100">Líquido do Lojista (Repasse)</span>
            <div className="text-xl font-black text-white mt-1">
              {formatCurrency(summary.netMerchantAmount)}
            </div>
            <span className="text-[10px] text-emerald-100">Após descontos, estornos e taxas</span>
          </div>
        </div>
      </div>

      {/* BLOCO 3: AUDITORIA & CONFORMIDADE */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
              3
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Auditoria & Histórico de Alterações
              </h4>
              <p className="text-xs text-slate-500">Rastreabilidade de intervenções manuais, cancelamentos e alertas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('inconsistencies')}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline"
          >
            Ver Inconsistências & Alertas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Alterações de Pedidos */}
          <div 
            onClick={() => onNavigateTab('orders')}
            className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Alterações de Pedidos</span>
              <FileEdit className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-slate-900">{summary.alteredOrdersCount}</div>
            <span className="text-[10px] text-slate-500">Pedidos com logs de edição</span>
          </div>

          {/* Cancelamentos */}
          <div 
            onClick={() => onNavigateTab('cancellations')}
            className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Cancelamentos Registrados</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-lg font-black text-slate-900">{summary.cancellationsCount}</div>
            <span className="text-[10px] text-slate-500">Cancelados com motivo</span>
          </div>

          {/* Baixas de Fiado */}
          <div 
            onClick={() => onNavigateTab('accounts-receivable')}
            className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Baixas de Fiado</span>
              <ArrowDownRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-black text-slate-900">{summary.settledCount}</div>
            <span className="text-[10px] text-slate-500">Quitações registradas</span>
          </div>

          {/* Ajustes Financeiros */}
          <div 
            onClick={() => onNavigateTab('financial-records')}
            className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Ajustes Financeiros</span>
              <Sliders className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-black text-slate-900">{summary.financialAdjustmentsCount}</div>
            <span className="text-[10px] text-slate-500">Correções manuais</span>
          </div>

          {/* Operações Manuais */}
          <div 
            onClick={() => onNavigateTab('user-logs')}
            className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold">Operações Manuais</span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-lg font-black text-slate-900">{summary.manualOperationsCount}</div>
            <span className="text-[10px] text-slate-500">Intervenções de operadores</span>
          </div>

          {/* Alertas Ativos */}
          <div 
            onClick={() => onNavigateTab('inconsistencies')}
            className="p-3.5 bg-amber-50/50 hover:bg-amber-50 rounded-xl border border-amber-200 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold">Alertas de Risco</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-amber-950">{summary.alertsCount}</div>
            <span className="text-[10px] text-amber-700">Severidade moderada ou alta</span>
          </div>

          {/* Inconsistências */}
          <div 
            onClick={() => onNavigateTab('inconsistencies')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-colors col-span-2 ${
              summary.inconsistenciesCount > 0
                ? 'bg-rose-50/70 border-rose-300 text-rose-900 hover:bg-rose-50'
                : 'bg-emerald-50/40 border-emerald-200 text-emerald-900 hover:bg-emerald-50/70'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black uppercase">
                {summary.inconsistenciesCount > 0 ? 'Divergências Auditadas' : 'Conformidade dos Dados'}
              </span>
              <ShieldAlert className={`w-4 h-4 ${summary.inconsistenciesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <div className="text-lg font-black">
              {summary.inconsistenciesCount > 0 
                ? `${summary.inconsistenciesCount} inconsistência(s) detectada(s)`
                : 'Nenhuma anomalia crítica encontrada'}
            </div>
            <span className="text-[10px] opacity-80">
              {summary.inconsistenciesCount > 0 
                ? 'Clique para ver a relação de divergências a corrigir'
                : 'Operação e finanças 100% conciliadas com os padrões'}
            </span>
          </div>
        </div>
      </div>

      {/* BLOCO 4: COMPARAÇÃO COM A MÉDIA DA PLATAFORMA (BENCHMARKING) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Comparação de Desempenho com a Média da Plataforma
              </h4>
              <p className="text-xs text-slate-400">
                Benchmarking do lojista selecionado vs a média geral dos demais estabelecimentos
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
            Base Multitenant Nova
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Faturamento */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400">Faturamento</span>
            <div className="text-base font-black text-white mt-1">
              {formatCurrency(comparison.merchantRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Média: {formatCurrency(comparison.platformAvgRevenue)}
            </div>
            <div className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
              comparison.revenueDiffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {comparison.revenueDiffPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(comparison.revenueDiffPercent).toFixed(1)}% {comparison.revenueDiffPercent >= 0 ? 'acima' : 'abaixo'}
            </div>
          </div>

          {/* Volume de Pedidos */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400">Volume de Pedidos</span>
            <div className="text-base font-black text-white mt-1">
              {comparison.merchantOrders} pedidos
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Média: {comparison.platformAvgOrders.toFixed(0)} pedidos
            </div>
            <div className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
              comparison.ordersDiffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {comparison.ordersDiffPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(comparison.ordersDiffPercent).toFixed(1)}% {comparison.ordersDiffPercent >= 0 ? 'acima' : 'abaixo'}
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400">Ticket Médio</span>
            <div className="text-base font-black text-white mt-1">
              {formatCurrency(comparison.merchantTicket)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Média: {formatCurrency(comparison.platformAvgTicket)}
            </div>
            <div className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
              comparison.ticketDiffPercent >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {comparison.ticketDiffPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(comparison.ticketDiffPercent).toFixed(1)}% vs média
            </div>
          </div>

          {/* Taxa de Cancelamento */}
          <div className={`rounded-xl p-3 border ${
            comparison.isCancelRateAbove 
              ? 'bg-rose-950/60 border-rose-700 text-rose-200' 
              : 'bg-slate-800/80 border-slate-700/80 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold">Taxa Cancelamento</span>
              {comparison.isCancelRateAbove && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500 text-white uppercase">
                  Alerta
                </span>
              )}
            </div>
            <div className="text-base font-black mt-1">
              {formatPercent(comparison.merchantCancelRate)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">
              Média: {formatPercent(comparison.platformAvgCancelRate)}
            </div>
            <div className={`text-[10px] font-bold mt-1.5 ${
              comparison.isCancelRateAbove ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {comparison.isCancelRateAbove ? 'Fora da curva (Elevada)' : 'Dentro do padrão'}
            </div>
          </div>

          {/* Taxa de Descontos */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400">% Descontos</span>
            <div className="text-base font-black text-white mt-1">
              {formatPercent(comparison.merchantDiscountRate)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Média: {formatPercent(comparison.platformAvgDiscountRate)}
            </div>
            <div className={`text-[10px] font-bold mt-1.5 ${
              comparison.isDiscountRateAbove ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {comparison.isDiscountRateAbove ? 'Descontos acima da média' : 'Conforme padrão'}
            </div>
          </div>

          {/* Taxa de Estornos */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400">% Estornos</span>
            <div className="text-base font-black text-white mt-1">
              {formatPercent(comparison.merchantReversalRate)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Teto seguro: {formatPercent(comparison.platformAvgReversalRate)}
            </div>
            <div className={`text-[10px] font-bold mt-1.5 ${
              comparison.isReversalRateAbove ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {comparison.isReversalRateAbove ? 'Atenção aos estornos' : 'Nível saudável'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
