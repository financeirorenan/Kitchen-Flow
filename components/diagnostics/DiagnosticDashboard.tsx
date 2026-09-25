import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RotateCw, 
  Zap, 
  TrendingUp, 
  Server, 
  ShoppingBag, 
  DollarSign, 
  Coins, 
  Package, 
  Layers, 
  Sparkles, 
  Users, 
  Database,
  ArrowRight,
  ShieldCheck,
  Clock,
  ChevronRight,
  Sliders,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  PlatformHealthState, 
  DiagnosticItem, 
  DiagnosticAreaId, 
  DiagnosticStatus, 
  AreaHealthSummary 
} from './types';

interface DiagnosticDashboardProps {
  healthState: PlatformHealthState;
  onRunDiagnostic: () => void;
  isRunningScan: boolean;
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
  onNavigateArea: (areaId: DiagnosticAreaId) => void;
  onNavigateSubTab: (tabId: string) => void;
}

export const DiagnosticDashboard: React.FC<DiagnosticDashboardProps> = ({
  healthState,
  onRunDiagnostic,
  isRunningScan,
  onSelectDiagnostic,
  onNavigateArea,
  onNavigateSubTab
}) => {
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<DiagnosticAreaId | 'ALL'>('ALL');

  const getStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case 'critical':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          pill: 'bg-rose-500 text-white',
          label: '🔴 Crítico',
          color: 'text-rose-600'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          pill: 'bg-amber-500 text-white',
          label: '🟡 Atenção',
          color: 'text-amber-600'
        };
      case 'monitoring':
        return {
          icon: Activity,
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          pill: 'bg-blue-500 text-white',
          label: '🔵 Monitoramento',
          color: 'text-blue-600'
        };
      case 'normal':
      default:
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          pill: 'bg-emerald-500 text-white',
          label: '🟢 Normal',
          color: 'text-emerald-600'
        };
    }
  };

  const getAreaIcon = (areaId: DiagnosticAreaId) => {
    switch (areaId) {
      case 'system': return Server;
      case 'orders': return ShoppingBag;
      case 'finance': return DollarSign;
      case 'cash': return Coins;
      case 'inventory': return Package;
      case 'integrations': return Layers;
      case 'marketplace': return Sparkles;
      case 'users': return Users;
      case 'data': return Database;
      default: return Activity;
    }
  };

  const overallBadge = getStatusBadge(healthState.status);

  // Anomalias não resolvidas
  const activeDiagnostics = healthState.diagnostics.filter(d => !d.isResolved);
  const criticalCount = activeDiagnostics.filter(d => d.status === 'critical').length;
  const warningCount = activeDiagnostics.filter(d => d.status === 'warning').length;
  const monitoringCount = activeDiagnostics.filter(d => d.status === 'monitoring').length;

  return (
    <div className="space-y-6">
      
      {/* 1. TOPO: SAÚDE DA PLATAFORMA & STATUS GERAL */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Glow de fundo */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
          healthState.status === 'normal' ? 'bg-emerald-400' :
          healthState.status === 'monitoring' ? 'bg-blue-400' :
          healthState.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
        }`} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Lado Esquerdo: Índice de Saúde */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                Central de Diagnóstico & Saúde
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-[11px] font-bold text-slate-500">
                Check-up Contínuo Ativo
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {healthState.overallScore}%
              </h1>
              <div className="space-y-0.5">
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase border inline-flex items-center gap-1.5 ${overallBadge.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${overallBadge.pill}`} />
                  {healthState.label.split('—')[1]?.trim() || overallBadge.label}
                </span>
                <div className="text-[11px] text-slate-400 font-medium">
                  {healthState.totalChecks} verificações preditivas executadas
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Última verificação:</span>
                <span className="font-bold text-slate-700">
                  {new Date(healthState.lastChecked).toLocaleString('pt-BR')}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
                <span>Próxima verificação:</span>
                <span className="font-bold text-emerald-700">{healthState.nextCheck}</span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Botão Executar Diagnóstico & Resumo Rápido */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Cards de Contagem Rápida */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-center">
                <div className="text-base font-black leading-none">{criticalCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider">Críticos</div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 text-center">
                <div className="text-base font-black leading-none">{warningCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider">Atenção</div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-center">
                <div className="text-base font-black leading-none">{monitoringCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider">Monitor</div>
              </div>
            </div>

            {/* Botão Executar Diagnóstico */}
            <button
              type="button"
              onClick={onRunDiagnostic}
              disabled={isRunningScan}
              className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <RotateCw className={`w-4 h-4 ${isRunningScan ? 'animate-spin' : ''}`} />
              <span>{isRunningScan ? 'Escaneando Sensores...' : 'EXECUTAR DIAGNÓSTICO'}</span>
            </button>

          </div>

        </div>

        {/* Barra de Progresso / Saúde */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
            <span>Score Ponderado de Resiliência dos 9 Módulos</span>
            <span className="font-bold text-slate-800">{healthState.overallScore}/100</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 rounded-full ${
                healthState.overallScore >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                healthState.overallScore >= 75 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                'bg-gradient-to-r from-rose-500 to-red-400'
              }`}
              style={{ width: `${healthState.overallScore}%` }}
            />
          </div>
        </div>

      </div>

      {/* 2. GRID DAS 9 ÁREAS (STATUS & SAÚDE DETALHADA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Saúde por Área Funcional</span>
          </h2>
          <span className="text-xs text-slate-400">
            Clique na área para ver diagnósticos específicos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(healthState.areas).map((areaSummary: AreaHealthSummary) => {
            const AreaIcon = getAreaIcon(areaSummary.area);
            const statusMeta = getStatusBadge(areaSummary.status);

            return (
              <div
                key={areaSummary.area}
                onClick={() => onNavigateArea(areaSummary.area)}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-indigo-50 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                        <AreaIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">
                          {areaSummary.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {areaSummary.analyzedMetricsCount} indicadores ativos
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${statusMeta.bg}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Métricas rápidas da área */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
                    {areaSummary.metrics.slice(0, 2).map((m, idx) => (
                      <div key={idx} className="bg-slate-50/70 p-2 rounded-xl">
                        <div className="text-[10px] text-slate-400 truncate">{m.label}</div>
                        <div className="text-xs font-bold text-slate-800 truncate">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {areaSummary.totalAnomaliesCount > 0 ? (
                      <span className="font-bold text-amber-700">
                        {areaSummary.totalAnomaliesCount} {areaSummary.totalAnomaliesCount === 1 ? 'sinal detectado' : 'sinais detectados'}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Sem anomalias ativas</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Examinar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SEÇÃO: PREVENÇÃO ATIVA — SINAIS DETECTADOS ANTES DE VIRAREM PROBLEMAS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Prevenção Ativa: Sinais & Anomalias em Andamento
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              O motor KitchenFlow detecta anomalias precoces para você agir antes que impactem a operação.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateSubTab('anomalies')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Ver todos ({activeDiagnostics.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeDiagnostics.length === 0 ? (
          <div className="p-8 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <div className="text-sm font-black text-emerald-950">Nenhuma anomalia crítica pendente</div>
            <div className="text-xs text-emerald-700 max-w-md font-medium">
              Todos os módulos (pedidos, caixa, financeiro, estoque, KDS e integrações) estão operando dentro dos parâmetros de estabilidade.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDiagnostics.slice(0, 4).map(diag => {
              const statusMeta = getStatusBadge(diag.status);

              return (
                <div
                  key={diag.id}
                  onClick={() => onSelectDiagnostic(diag)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-400 bg-white hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-1 rounded-xl text-[10px] font-black border uppercase shrink-0 mt-0.5 ${statusMeta.bg}`}>
                      {statusMeta.label}
                    </span>
                    <div className="space-y-1">
                      <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {diag.title}
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1 font-medium">
                        {diag.whatWasDetected}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Área: <strong className="text-slate-600">{diag.areaLabel}</strong></span>
                        <span>•</span>
                        <span>Detectado às {new Date(diag.detectedAt).toLocaleTimeString('pt-BR')}</span>
                        {diag.financialImpactEstimated ? (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">
                              Risco estimado: R$ {diag.financialImpactEstimated.toFixed(2)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {diag.quickAction && (
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-indigo-600" />
                        <span>Ação Rápida Disponível</span>
                      </span>
                    )}
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-slate-900 group-hover:bg-indigo-600 text-white text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Abrir Ficha</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. BANNER DE PREVENÇÃO & AUTO-CORREÇÃO DE 1-CLIQUE */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs font-black uppercase tracking-wider border border-white/10">
            <Zap className="w-3.5 h-3.5" />
            <span>Motor de Auto-Correção & Prevenção</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Prevenir é 10x mais barato do que auditar prejuízos passados.
          </h3>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            A Central monitora silenciosamente cancelamentos pós-produção, divergências de caixa na troca de turno, pedidos estagnados no KDS e títulos vencidos para orientar a liderança em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateSubTab('quick-actions')}
            className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4 text-indigo-600" />
            <span>Central de Auto-Correção</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSubTab('timeline')}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Timeline de Eventos</span>
          </button>
        </div>
      </div>

    </div>
  );
};
