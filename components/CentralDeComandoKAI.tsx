import React, { useMemo } from "react";
import {
  BrainCircuit,
  DollarSign,
  Wallet,
  ShoppingBag,
  Target,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Package,
  Bike,
  Sliders,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Award
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { PeriodType, Order, Product, RawMaterial } from "../types";

export interface ProductProfitItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
  margin: number;
  profit: number;
  shareOfRevenue: number;
}

export interface ChartDataItem {
  label: string;
  Faturamento: number;
  Lucro: number;
}

export interface StatsType {
  faturamento: number;
  faturamentoPrev: number;
  lucroReal: number;
  margem: number;
  cmv: number;
  taxasDelivery: number;
  folha: number;
  despesasFixas: number;
  pontoEquilibrio: number;
  pontoEquilibrioMensal: number;
  ticketMedio: number;
}

export interface SubscriptionStatsType {
  planName: string;
  currentPlan?: Record<string, unknown> | null;
  basePrice: number;
  maxOrders: number;
  ordersUsed: number;
  percentUsed: number;
  isExcedent: boolean;
  excedentCount: number;
  rate: number;
  rawExcedentCost: number;
  discountPercent: number;
  discountAmount: number;
  finalExcedentCost: number;
  totalInvoiceEstimated: number;
  nextPlan?: Record<string, unknown> | null;
  upgradeRecommended: boolean;
  isUnlimited: boolean;
}

export interface CentralDeComandoKAIProps {
  stats: StatsType;
  filteredData: { currentOrders: Order[]; previousOrders: Order[] };
  selectedPeriod: PeriodType;
  setSelectedPeriod?: (period: PeriodType) => void;
  dateRange: { periodName: string; daysCount: number };
  handleExplainOperation: () => void;
  setIsConfigOpen: (open: boolean) => void;
  setActiveSubTab: (tab: string) => void;
  stockStats: { totalStockValue: number; dormantStockValue: number; dormantItemsCount: number };
  courierStats: { totalCourierFee: number; pendingCourierFee: number; settledCourierFee: number; totalDeliveryFee: number };
  productProfitMap: {
    topProfitable: ProductProfitItem[];
    leastProfitable: ProductProfitItem[];
  };
  copilotInsights?: string[];
  dailyPerformanceChartData: ChartDataItem[];
  simCmvReduction?: number;
  setSimCmvReduction?: (val: number) => void;
  simFeeReduction?: number;
  setSimFeeReduction?: (val: number) => void;
  getPercentageVariation: (current: number, previous: number) => number;
  rawMaterials?: RawMaterial[];
  products?: Product[];
  onNavigateToInventory?: () => void;
  subscriptionStats?: SubscriptionStatsType | null;
}

export const CentralDeComandoKAI: React.FC<CentralDeComandoKAIProps> = ({
  stats,
  filteredData,
  selectedPeriod,
  setSelectedPeriod,
  dateRange,
  handleExplainOperation,
  setIsConfigOpen,
  setActiveSubTab,
  stockStats,
  courierStats,
  productProfitMap,
  copilotInsights = [],
  dailyPerformanceChartData,
  getPercentageVariation,
  rawMaterials = [],
  products = [],
  onNavigateToInventory,
  subscriptionStats = null
}) => {
  // CMV calculations
  const cmvPct = stats.faturamento > 0 ? (stats.cmv / stats.faturamento) * 100 : 0;
  const isCmvCritical = cmvPct > 38;
  const isCmvWarning = cmvPct > 33 && !isCmvCritical;

  // Real critical replenishment items from rawMaterials or products
  const criticalRawMaterials = useMemo(() => {
    if (rawMaterials && rawMaterials.length > 0) {
      return rawMaterials
        .filter(rm => (rm.currentStock || 0) <= (rm.minStock || 0))
        .map(rm => ({
          id: rm.id,
          name: rm.name,
          currentStock: rm.currentStock || 0,
          minStock: rm.minStock || 0,
          unit: rm.unit || 'UN',
          category: rm.category || 'Geral'
        }));
    }
    return (products || [])
      .filter(p => {
        const itemRecord = p as unknown as Record<string, unknown>;
        const stock = typeof itemRecord.stockQuantity === 'number' ? itemRecord.stockQuantity : (typeof p.stock === 'number' ? p.stock : 0);
        const min = typeof itemRecord.minStock === 'number' ? itemRecord.minStock : 2;
        return stock <= min;
      })
      .map(p => {
        const itemRecord = p as unknown as Record<string, unknown>;
        const stock = typeof itemRecord.stockQuantity === 'number' ? itemRecord.stockQuantity : (typeof p.stock === 'number' ? p.stock : 0);
        const min = typeof itemRecord.minStock === 'number' ? itemRecord.minStock : 2;
        return {
          id: p.id,
          name: p.name,
          currentStock: stock,
          minStock: min,
          unit: p.unit || 'UN',
          category: p.category || 'Geral'
        };
      });
  }, [rawMaterials, products]);

  // Overall operation health determination using existing data
  const overallHealth = useMemo<'normal' | 'warning' | 'critical'>(() => {
    if (stats.lucroReal < 0 || criticalRawMaterials.length > 5 || isCmvCritical) {
      return 'critical';
    }
    if (
      stockStats.dormantItemsCount > 0 ||
      courierStats.pendingCourierFee > 0 ||
      criticalRawMaterials.length > 0 ||
      isCmvWarning ||
      (stats.pontoEquilibrio > 0 && stats.faturamento < stats.pontoEquilibrio)
    ) {
      return 'warning';
    }
    return 'normal';
  }, [
    stats.lucroReal,
    stats.faturamento,
    stats.pontoEquilibrio,
    criticalRawMaterials.length,
    isCmvCritical,
    isCmvWarning,
    stockStats.dormantItemsCount,
    courierStats.pendingCourierFee
  ]);

  // Sub-statuses
  const financeStatus = useMemo<'normal' | 'warning' | 'critical'>(() => {
    if (stats.lucroReal < 0) return 'critical';
    if (stats.pontoEquilibrio > 0 && stats.faturamento < stats.pontoEquilibrio) return 'warning';
    return 'normal';
  }, [stats.lucroReal, stats.faturamento, stats.pontoEquilibrio]);

  const stockStatus = useMemo<'normal' | 'warning' | 'critical'>(() => {
    if (criticalRawMaterials.length > 5) return 'critical';
    if (criticalRawMaterials.length > 0 || stockStats.dormantItemsCount > 0) return 'warning';
    return 'normal';
  }, [criticalRawMaterials.length, stockStats.dormantItemsCount]);

  const deliveryStatus = useMemo<'normal' | 'warning' | 'critical'>(() => {
    if (courierStats.pendingCourierFee > 150) return 'critical';
    if (courierStats.pendingCourierFee > 0) return 'warning';
    return 'normal';
  }, [courierStats.pendingCourierFee]);

  const cmvStatus = useMemo<'normal' | 'warning' | 'critical'>(() => {
    if (isCmvCritical) return 'critical';
    if (isCmvWarning) return 'warning';
    return 'normal';
  }, [isCmvCritical, isCmvWarning]);

  // Order division
  const deliveryOrdersCount = useMemo(() => {
    return filteredData.currentOrders.filter(o => Boolean(o.deliveryFee && Number(o.deliveryFee) > 0)).length;
  }, [filteredData.currentOrders]);

  const dineInOrdersCount = useMemo(() => {
    return filteredData.currentOrders.length - deliveryOrdersCount;
  }, [filteredData.currentOrders.length, deliveryOrdersCount]);

  // Handle inventory navigation helper
  const handleGoToInventory = () => {
    if (onNavigateToInventory) {
      onNavigateToInventory();
    } else {
      setActiveSubTab('analista-estoque');
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. SAÚDE DA OPERAÇÃO                                                      */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              Diagnóstico em Tempo Real
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                SAÚDE DA OPERAÇÃO
              </h2>
              {overallHealth === 'normal' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  OPERAÇÃO NORMAL
                </span>
              )}
              {overallHealth === 'warning' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  ATENÇÃO NECESSÁRIA
                </span>
              )}
              {overallHealth === 'critical' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  ATENÇÃO CRÍTICA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {overallHealth === 'normal' && "Todos os eixos da operação estão saudáveis e alinhados com as metas."}
              {overallHealth === 'warning' && "A operação está ativa, mas existem pontos de atenção para proteger sua margem e caixa."}
              {overallHealth === 'critical' && "Identificadas situações críticas que exigem intervenção imediata para estancar perdas."}
            </p>
          </div>

          <div className="text-left lg:text-right shrink-0">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Período analisado:</span>
            {setSelectedPeriod ? (
              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(["today", "last7", "thisMonth", "lastMonth"] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      selectedPeriod === p
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {p === "today" ? "Hoje" : p === "last7" ? "7 Dias" : p === "thisMonth" ? "Mês" : "Mês Ant."}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-800">
                {selectedPeriod === 'today' ? 'Hoje' : selectedPeriod === 'last7' ? 'Últimos 7 dias' : selectedPeriod === 'thisMonth' ? 'Mês atual' : 'Mês anterior'}
                {' · '}{dateRange.daysCount} {dateRange.daysCount === 1 ? 'dia' : 'dias'}
              </span>
            )}
          </div>
        </div>

        {/* 4 Indicadores de Eixo Operacional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {/* 1. FINANCEIRO */}
          <div className={`p-4 rounded-xl border transition-all ${
            financeStatus === 'critical'
              ? 'bg-rose-50/50 border-rose-200'
              : financeStatus === 'warning'
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-slate-50/70 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Financeiro</span>
              <span className={`text-[11px] font-black flex items-center gap-1 ${
                financeStatus === 'critical' ? 'text-rose-700' : financeStatus === 'warning' ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {financeStatus === 'critical' ? '🔴 Crítico' : financeStatus === 'warning' ? '🟡 Atenção' : '🟢 Normal'}
              </span>
            </div>
            <div className={`font-mono text-base font-black tabular-nums ${
              stats.lucroReal >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {stats.lucroReal >= 0 ? '+' : ''}R$ {stats.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              {stats.lucroReal >= 0 ? `${stats.margem.toFixed(1)}% sobra limpa` : 'Operação em déficit'}
            </p>
          </div>

          {/* 2. ESTOQUE */}
          <div className={`p-4 rounded-xl border transition-all ${
            stockStatus === 'critical'
              ? 'bg-rose-50/50 border-rose-200'
              : stockStatus === 'warning'
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-slate-50/70 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Estoque</span>
              <span className={`text-[11px] font-black flex items-center gap-1 ${
                stockStatus === 'critical' ? 'text-rose-700' : stockStatus === 'warning' ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {stockStatus === 'critical' ? '🔴 Crítico' : stockStatus === 'warning' ? '🟡 Atenção' : '🟢 Normal'}
              </span>
            </div>
            <div className="font-mono text-base font-black text-slate-900 tabular-nums">
              {criticalRawMaterials.length} {criticalRawMaterials.length === 1 ? 'crítico' : 'críticos'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              {stockStats.dormantItemsCount > 0 ? `${stockStats.dormantItemsCount} parados (+15d)` : 'Sem estoque parado'}
            </p>
          </div>

          {/* 3. DELIVERY */}
          <div className={`p-4 rounded-xl border transition-all ${
            deliveryStatus === 'critical'
              ? 'bg-rose-50/50 border-rose-200'
              : deliveryStatus === 'warning'
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-slate-50/70 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">Delivery</span>
              <span className={`text-[11px] font-black flex items-center gap-1 ${
                deliveryStatus === 'critical' ? 'text-rose-700' : deliveryStatus === 'warning' ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {deliveryStatus === 'critical' ? '🔴 Crítico' : deliveryStatus === 'warning' ? '🟡 Atenção' : '🟢 Normal'}
              </span>
            </div>
            <div className="font-mono text-base font-black text-slate-900 tabular-nums">
              {courierStats.pendingCourierFee > 0
                ? `R$ ${courierStats.pendingCourierFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'R$ 0,00'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              {courierStats.pendingCourierFee > 0 ? 'Repasses pendentes' : 'Repasses quitados'}
            </p>
          </div>

          {/* 4. CMV */}
          <div className={`p-4 rounded-xl border transition-all ${
            cmvStatus === 'critical'
              ? 'bg-rose-50/50 border-rose-200'
              : cmvStatus === 'warning'
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-slate-50/70 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">CMV (Insumos)</span>
              <span className={`text-[11px] font-black flex items-center gap-1 ${
                cmvStatus === 'critical' ? 'text-rose-700' : cmvStatus === 'warning' ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {cmvStatus === 'critical' ? '🔴 Crítico' : cmvStatus === 'warning' ? '🟡 Atenção' : '🟢 Normal'}
              </span>
            </div>
            <div className="font-mono text-base font-black text-slate-900 tabular-nums">
              {cmvPct.toFixed(1)}% <span className="text-xs font-normal text-slate-500">do fat.</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              {isCmvCritical ? 'Acima de 38% (Crítico)' : isCmvWarning ? 'Meta: até 33%' : 'Dentro da meta ideal'}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. KAI — PRINCIPAIS INSIGHTS                                              */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0">
              <BrainCircuit size={18} className="text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                KAI — INTELIGÊNCIA DA OPERAÇÃO
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                A análise da sua operação em tempo real.
              </p>
            </div>
          </div>
          <button
            onClick={handleExplainOperation}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Sparkles size={13} className="text-orange-500" />
            <span>Auditar Detalhes</span>
          </button>
        </div>

        {/* Prioritized Key Real Findings */}
        <div className="space-y-2.5">
          {criticalRawMaterials.length > 0 && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">🔴</span>
              <div className="flex-1">
                <span className="text-xs font-black text-rose-950 block">
                  {criticalRawMaterials.length} {criticalRawMaterials.length === 1 ? 'insumo precisa' : 'insumos precisam'} de reposição
                </span>
                <p className="text-xs text-rose-900/80 font-medium mt-0.5">
                  Estoque atual abaixo do nível de segurança definido. Risco de indisponibilidade de itens do cardápio.
                </p>
              </div>
            </div>
          )}

          {stockStats.dormantStockValue > 0 && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">🟡</span>
              <div className="flex-1">
                <span className="text-xs font-black text-amber-950 block">
                  R$ {stockStats.dormantStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} estão parados no estoque
                </span>
                <p className="text-xs text-amber-900/80 font-medium mt-0.5">
                  {stockStats.dormantItemsCount} {stockStats.dormantItemsCount === 1 ? 'item sem movimentação' : 'itens sem movimentação'} há mais de 15 dias imobilizando capital de giro.
                </p>
              </div>
            </div>
          )}

          {courierStats.pendingCourierFee > 0 ? (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">🟡</span>
              <div className="flex-1">
                <span className="text-xs font-black text-amber-950 block">
                  R$ {courierStats.pendingCourierFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a repassar aos entregadores
                </span>
                <p className="text-xs text-amber-900/80 font-medium mt-0.5">
                  Valores de corridas finalizadas aguardando acerto com a equipe de motoboys.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">🟢</span>
              <div className="flex-1">
                <span className="text-xs font-black text-emerald-950 block">
                  Nenhuma pendência de repasse aos entregadores
                </span>
                <p className="text-xs text-emerald-900/80 font-medium mt-0.5">
                  Todos os fretes e repasses logísticos estão rigorosamente quitados no período.
                </p>
              </div>
            </div>
          )}

          {stats.lucroReal < 0 && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">🔴</span>
              <div className="flex-1">
                <span className="text-xs font-black text-rose-950 block">
                  Operação em déficit de R$ {Math.abs(stats.lucroReal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no período
                </span>
                <p className="text-xs text-rose-900/80 font-medium mt-0.5">
                  As receitas do período ainda não superaram a soma das despesas fixas proporcionais e custos de insumos.
                </p>
              </div>
            </div>
          )}

          {criticalRawMaterials.length === 0 && stockStats.dormantStockValue === 0 && stats.lucroReal >= 0 && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-black text-emerald-900 block">Tudo sob controle</span>
                <p className="text-xs text-emerald-800/80 font-medium mt-0.5">
                  Não foram identificados problemas que exigem ação imediata. A operação segue em conformidade.
                </p>
              </div>
            </div>
          )}

          {copilotInsights && copilotInsights.length > 0 && (
            <div className="pt-3 border-t border-slate-100 mt-2 space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Observações do Copiloto
              </span>
              {copilotInsights.slice(0, 2).map((ins, i) => (
                <p key={i} className="text-xs text-slate-600 font-medium leading-relaxed">
                  • {ins}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ALERTAS QUE EXIGEM AÇÃO                                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Bloco 1: A KAI RECOMENDA */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-orange-500" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  A KAI RECOMENDA
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ações Imediatas
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Recomendação 1: Insumos */}
              {criticalRawMaterials.length > 0 ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-between">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">01. Reposição</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{criticalRawMaterials.length} itens</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900">Revisar os insumos críticos</h4>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {criticalRawMaterials.length} {criticalRawMaterials.length === 1 ? 'item precisa' : 'itens precisam'} de reposição antes do próximo turno de vendas.
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex justify-end">
                    <button
                      onClick={handleGoToInventory}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>VER INSUMOS</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Recomendação 2: Estoque Parado */}
              {stockStats.dormantItemsCount > 0 ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-between">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">02. Giro de Estoque</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      R$ {stockStats.dormantStockValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900">Analisar estoque parado</h4>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    R$ {stockStats.dormantStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} estão imobilizados em {stockStats.dormantItemsCount} itens sem giro.
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex justify-end">
                    <button
                      onClick={() => setActiveSubTab('analista-estoque')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>ANALISAR ESTOQUE</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Recomendação 3: CMV / Margem */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-between">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">03. Margem e Cardápio</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">CMV: {cmvPct.toFixed(1)}%</span>
                </div>
                <h4 className="text-xs font-black text-slate-900">
                  {productProfitMap.leastProfitable[0] 
                    ? `Revisar margem de: ${productProfitMap.leastProfitable[0].name}`
                    : 'Otimizar fichas técnicas e porcionamentos'}
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  {productProfitMap.leastProfitable[0]
                    ? `Este item está rodando com margem abaixo da média da casa. Ajustar porção ou valor de venda protege o resultado.`
                    : 'Mantenha as fichas técnicas atualizadas para preservar a margem líquida da casa.'}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex justify-end">
                  <button
                    onClick={() => setActiveSubTab('cmv-cardapio')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>VER CMV & CARDÁPIO</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: ALERTA DE INSUMOS CRÍTICOS (Redesenhado de DashboardAlerts) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  INSUMOS CRÍTICOS
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
                {criticalRawMaterials.length} em alerta
              </span>
            </div>

            {criticalRawMaterials.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {criticalRawMaterials.slice(0, 4).map(item => {
                  const isZero = item.currentStock <= 0;
                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isZero ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                            Insumo / {item.category || 'Geral'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2.5">
                        <div>
                          <span className="font-mono font-black text-xs text-slate-900 tabular-nums">
                            {item.currentStock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                            {item.unit}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1 shrink-0">
                          <RefreshCw size={8} /> Repor
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">Estoque de segurança em dia</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Nenhum insumo abaixo do limite mínimo cadastrado.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              <strong className="text-slate-900">{criticalRawMaterials.length} insumos</strong> precisam de atenção
            </span>
            <button
              onClick={handleGoToInventory}
              className="text-xs font-black text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 transition-colors cursor-pointer group"
            >
              <span>VER TODOS OS ALERTAS</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. SAÚDE FINANCEIRA                                                       */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                SAÚDE FINANCEIRA
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Indicadores essenciais de receita, margem e cobertura de custos.
            </p>
          </div>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Sliders size={13} className="text-slate-600" />
            <span>Ajustar Custos Fixos</span>
          </button>
        </div>

        {/* 4 Cards Principais (com RESULTADO em destaque) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: RESULTADO (DESTAQUE MÁXIMO) */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            stats.lucroReal >= 0 
              ? 'bg-emerald-50/40 border-emerald-300' 
              : 'bg-rose-50/40 border-rose-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1 text-slate-700">
                  <Wallet size={14} className={stats.lucroReal >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
                  RESULTADO
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  stats.lucroReal >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {stats.margem.toFixed(1)}% margem
                </span>
              </div>
              <div className={`text-2xl md:text-3xl font-mono font-black tracking-tight tabular-nums ${
                stats.lucroReal >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {stats.lucroReal >= 0 ? '+' : ''}R$ {stats.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className={`font-bold ${stats.lucroReal >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                {stats.lucroReal >= 0 ? '✓ Operação com sobra' : '⚠ Operação em déficit'}
              </span>
              <span className="text-slate-500 font-medium">Líquido real</span>
            </div>
          </div>

          {/* Card 2: FATURAMENTO */}
          <div className="bg-slate-50/60 border border-slate-200/90 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <DollarSign size={14} className="text-slate-600" />
                  FATURAMENTO
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {filteredData.currentOrders.length} ped.
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-mono font-black text-slate-900 tracking-tight tabular-nums">
                R$ {stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Receita bruta
              </span>
              {getPercentageVariation(stats.faturamento, stats.faturamentoPrev) >= 0 ? (
                <span className="font-black text-emerald-700 flex items-center gap-0.5">
                  <TrendingUp size={12} /> +{getPercentageVariation(stats.faturamento, stats.faturamentoPrev).toFixed(1)}%
                </span>
              ) : (
                <span className="font-black text-rose-700 flex items-center gap-0.5">
                  <TrendingDown size={12} /> {getPercentageVariation(stats.faturamento, stats.faturamentoPrev).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Card 3: PEDIDOS */}
          <div className="bg-slate-50/60 border border-slate-200/90 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <ShoppingBag size={14} className="text-slate-600" />
                  PEDIDOS
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">Total</span>
              </div>
              <div className="text-2xl md:text-3xl font-mono font-black text-slate-900 tracking-tight tabular-nums">
                {filteredData.currentOrders.length}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{deliveryOrdersCount} delivery</span>
              <span>·</span>
              <span>{dineInOrdersCount} salão/balcão</span>
            </div>
          </div>

          {/* Card 4: TICKET MÉDIO */}
          <div className="bg-slate-50/60 border border-slate-200/90 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <Target size={14} className="text-slate-600" />
                  TICKET MÉDIO
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">Por comanda</span>
              </div>
              <div className="text-2xl md:text-3xl font-mono font-black text-slate-900 tracking-tight tabular-nums">
                R$ {stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">+R$ 3 no ticket =</span>
              <span className="font-extrabold text-orange-600">
                +R$ {(filteredData.currentOrders.length * 3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

        </div>

        {/* META DE EQUILÍBRIO (TERMÔMETRO SIMPLES) */}
        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={15} className="text-orange-500" />
                META DE EQUILÍBRIO
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Faturamento necessário para cobrir 100% dos custos fixos e insumos do período.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Meta do Período:</span>
              <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                R$ {stats.pontoEquilibrio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  stats.faturamento >= stats.pontoEquilibrio ? 'bg-emerald-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(100, stats.pontoEquilibrio > 0 ? (stats.faturamento / stats.pontoEquilibrio) * 100 : 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">
                {stats.faturamento >= stats.pontoEquilibrio 
                  ? '🟢 Contas do período cobertas! A operação está gerando sobra real.' 
                  : `Faltam R$ ${Math.max(0, stats.pontoEquilibrio - stats.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para equilibrar as contas.`}
              </span>
              <span className={stats.faturamento >= stats.pontoEquilibrio ? 'text-emerald-700 font-black' : 'text-orange-700 font-black'}>
                {stats.pontoEquilibrio > 0 ? Math.round((stats.faturamento / stats.pontoEquilibrio) * 100) : 0}% atingido
              </span>
            </div>
          </div>
        </div>

        {/* DRE Resumido */}
        <div className="border border-slate-200/80 rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-slate-700" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Demonstrativo de Resultado (DRE Resumido)
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              {dateRange.daysCount} dias proporcionais
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">1. Faturamento</span>
              <span className="font-mono text-sm font-black text-slate-900 mt-0.5 block tabular-nums">
                R$ {stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Vendas brutas</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">2. Insumos (CMV)</span>
              <span className="font-mono text-sm font-black text-rose-600 mt-0.5 block tabular-nums">
                - R$ {stats.cmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{cmvPct.toFixed(1)}% da receita</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">3. Taxas de Apps</span>
              <span className="font-mono text-sm font-black text-amber-600 mt-0.5 block tabular-nums">
                - R$ {stats.taxasDelivery.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Comissões e taxas</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">4. Folha de Pagamento</span>
              <span className="font-mono text-sm font-black text-slate-800 mt-0.5 block tabular-nums">
                - R$ {stats.folha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Equipe proporcional</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">5. Despesas Fixas</span>
              <span className="font-mono text-sm font-black text-slate-800 mt-0.5 block tabular-nums">
                - R$ {stats.despesasFixas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Aluguel, luz, sistemas</span>
            </div>

            <div className={`p-3 rounded-xl border ${stats.lucroReal >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${stats.lucroReal >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                6. Sobra Limpa
              </span>
              <span className={`font-mono text-sm font-black mt-0.5 block tabular-nums ${stats.lucroReal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stats.lucroReal >= 0 ? '+' : ''}R$ {stats.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] font-bold block mt-0.5 ${stats.lucroReal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stats.margem.toFixed(1)}% líquido
              </span>
            </div>
          </div>
        </div>

        {/* Flutuação Diária de Lucro */}
        {dailyPerformanceChartData && dailyPerformanceChartData.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Flutuação Diária no Período</h4>
                <p className="text-xs text-slate-500 font-medium">Comparativo diário de faturamento e lucro líquido.</p>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPerformanceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradientLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", color: "#f8fafc" }}
                    labelStyle={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}
                    itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="Faturamento" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#gradientFaturamento)" name="Faturamento (R$)" />
                  <Area type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradientLucro)" name="Lucro Líquido (R$)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5. ESTOQUE                                                                */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Package size={17} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                ESTOQUE
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Saúde do estoque armazenado e capital imobilizado.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveSubTab('analista-estoque')}
            className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <span>ABRIR ESTOQUE</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">VALOR EM ESTOQUE</span>
            <div className="font-mono text-xl font-black text-slate-900 mt-1 tabular-nums">
              R$ {stockStats.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Patrimônio em insumos</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">DINHEIRO PARADO NO ESTOQUE</span>
            <div className="font-mono text-xl font-black text-amber-700 mt-1 tabular-nums">
              R$ {stockStats.dormantStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Sem movimentação há +15 dias</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ITENS PARADOS</span>
            <div className="font-mono text-xl font-black text-slate-900 mt-1 tabular-nums">
              {stockStats.dormantItemsCount} <span className="text-xs font-normal text-slate-500">itens</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Insumos sem giro</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">ITENS CRÍTICOS</span>
            <div className="font-mono text-xl font-black text-rose-600 mt-1 tabular-nums">
              {criticalRawMaterials.length} <span className="text-xs font-normal text-slate-500">itens</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Abaixo do estoque mínimo</span>
          </div>
        </div>

        {/* Representação gráfica simples */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
            <span>Proporção do Capital Imobilizado</span>
            <span className="text-amber-700 font-mono">
              {stockStats.totalStockValue > 0 ? ((stockStats.dormantStockValue / stockStats.totalStockValue) * 100).toFixed(1) : '0.0'}% do estoque parado
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stockStats.totalStockValue > 0 ? (stockStats.dormantStockValue / stockStats.totalStockValue) * 100 : 0)}%` }}
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DELIVERY E LOGÍSTICA                                                   */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Bike size={17} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                DELIVERY E LOGÍSTICA
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Conferência de fretes cobrados dos clientes vs repasses aos entregadores.
              </p>
            </div>
          </div>

          {courierStats.pendingCourierFee === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
              <CheckCircle2 size={12} />
              SEM PENDÊNCIAS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 self-start sm:self-auto">
              <AlertTriangle size={12} />
              PENDÊNCIAS ATIVAS
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">FRETES COBRADOS</span>
            <div className="font-mono text-xl font-black text-slate-900 mt-1 tabular-nums">
              R$ {courierStats.totalDeliveryFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Taxas pagas pelos clientes</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">REPASSES AOS ENTREGADORES</span>
            <div className="font-mono text-xl font-black text-slate-900 mt-1 tabular-nums">
              R$ {courierStats.totalCourierFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Valor devido aos motoboys</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">SALDO LOGÍSTICO</span>
            <div className={`font-mono text-xl font-black mt-1 tabular-nums ${
              courierStats.totalDeliveryFee - courierStats.totalCourierFee >= 0 ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {courierStats.totalDeliveryFee - courierStats.totalCourierFee >= 0 ? '+' : ''}
              R$ {(courierStats.totalDeliveryFee - courierStats.totalCourierFee).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">Cobrado vs Pago</span>
          </div>

          <div className={`p-4 rounded-xl border ${
            courierStats.pendingCourierFee > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">PENDÊNCIAS DE REPASSE</span>
            <div className={`font-mono text-xl font-black mt-1 tabular-nums ${
              courierStats.pendingCourierFee > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              R$ {courierStats.pendingCourierFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              {courierStats.pendingCourierFee > 0 ? 'Aguardando acerto' : 'Tudo quitado'}
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ASSINATURA E CONSUMO                                                   */}
      {/* ========================================================================= */}
      {subscriptionStats && (
        <section className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black">
                <Award size={17} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  ASSINATURA E CONSUMO
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Franquia mensal e dados do seu plano KitchenFlow.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider rounded-lg">
                Plano {subscriptionStats.planName}
              </span>
              {subscriptionStats.percentUsed >= 100 && (
                <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs uppercase rounded-lg">
                  Excedente Ativo
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">FRANQUIA MENSAL</span>
              <div className="font-mono text-base font-black text-slate-900 mt-1 tabular-nums">
                {subscriptionStats.isUnlimited ? "Ilimitada" : `${subscriptionStats.maxOrders} pedidos`}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">Inclusos no plano base</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">CONSUMO NO MÊS</span>
              <div className="font-mono text-base font-black text-slate-900 mt-1 tabular-nums">
                {subscriptionStats.ordersUsed} pedidos
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                {subscriptionStats.isUnlimited ? "Consumo ilimitado" : `${Math.round(subscriptionStats.percentUsed)}% da franquia`}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MENSALIDADE BASE</span>
              <div className="font-mono text-base font-black text-slate-900 mt-1 tabular-nums">
                R$ {subscriptionStats.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                {subscriptionStats.isExcedent ? `+ R$ ${subscriptionStats.finalExcedentCost.toFixed(2)} excedente` : 'Sem cobranças adicionais'}
              </span>
            </div>
          </div>

          {!subscriptionStats.isUnlimited && (
            <div className="mt-4 pt-3 border-t border-slate-200/80">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1.5">
                <span>Progresso da Franquia Mensal</span>
                <span className="font-mono text-slate-700">{subscriptionStats.ordersUsed} / {subscriptionStats.maxOrders} pedidos</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    subscriptionStats.percentUsed >= 100 ? 'bg-rose-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, subscriptionStats.percentUsed)}%` }}
                />
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
};
