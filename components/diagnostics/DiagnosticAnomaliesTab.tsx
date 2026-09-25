import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Zap, 
  ChevronRight, 
  Check, 
  Eye, 
  RotateCcw,
  Sparkles,
  Share2,
  Clock
} from 'lucide-react';
import { 
  DiagnosticItem, 
  DiagnosticStatus, 
  DiagnosticAreaId, 
  AnomalyType 
} from './types';

interface DiagnosticAnomaliesTabProps {
  diagnostics: DiagnosticItem[];
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
  onResolveDiagnostic: (id: string, notes?: string) => void;
  onExecuteQuickAction?: (actionId: string, diag: DiagnosticItem) => void;
  initialAreaFilter?: DiagnosticAreaId | 'ALL';
}

export const DiagnosticAnomaliesTab: React.FC<DiagnosticAnomaliesTabProps> = ({
  diagnostics,
  onSelectDiagnostic,
  onResolveDiagnostic,
  onExecuteQuickAction,
  initialAreaFilter = 'ALL'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DiagnosticStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<AnomalyType | 'ALL'>('ALL');
  const [selectedArea, setSelectedArea] = useState<DiagnosticAreaId | 'ALL'>(initialAreaFilter);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');

  const filteredDiagnostics = useMemo(() => {
    return diagnostics.filter(diag => {
      // Filtro de resolvido
      if (statusFilter === 'pending' && diag.isResolved) return false;
      if (statusFilter === 'resolved' && !diag.isResolved) return false;

      // Filtro de severidade/status
      if (selectedStatus !== 'ALL' && diag.status !== selectedStatus) return false;

      // Filtro de tipo
      if (selectedType !== 'ALL' && diag.anomalyType !== selectedType) return false;

      // Filtro de área
      if (selectedArea !== 'ALL' && diag.area !== selectedArea) return false;

      // Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = diag.title.toLowerCase().includes(q);
        const matchDesc = diag.whatWasDetected.toLowerCase().includes(q);
        const matchCode = diag.code.toLowerCase().includes(q);
        const matchArea = diag.areaLabel.toLowerCase().includes(q);
        const matchRef = (diag.entityReference || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCode && !matchArea && !matchRef) return false;
      }

      return true;
    });
  }, [diagnostics, statusFilter, selectedStatus, selectedType, selectedArea, searchQuery]);

  const getStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case 'critical':
        return { bg: 'bg-rose-50 border-rose-200 text-rose-700', label: '🔴 Crítico' };
      case 'warning':
        return { bg: 'bg-amber-50 border-amber-200 text-amber-800', label: '🟡 Atenção' };
      case 'monitoring':
        return { bg: 'bg-blue-50 border-blue-200 text-blue-700', label: '🔵 Monitoramento' };
      case 'normal':
      default:
        return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: '🟢 Normal' };
    }
  };

  const getAnomalyTypeLabel = (type: AnomalyType) => {
    switch (type) {
      case 'unusual_behavior': return 'Comportamento Incomum';
      case 'risk': return 'Risco';
      case 'inconsistency': return 'Inconsistência';
      case 'error': return 'Erro';
      case 'failure': return 'Falha';
      default: return type;
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        
        {/* Linha 1: Busca e Toggle Pendentes/Resolvidos */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por sinal, código (ex: PED-DUP), comanda, área ou impacto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendentes ({diagnostics.filter(d => !d.isResolved).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'resolved'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolvidos ({diagnostics.filter(d => d.isResolved).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({diagnostics.length})
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros de Nível, Tipo e Área */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Nível:
          </span>
          {(['ALL', 'critical', 'warning', 'monitoring', 'normal'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedStatus(lvl)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                selectedStatus === lvl
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'Todos os Níveis' :
               lvl === 'critical' ? '🔴 Crítico' :
               lvl === 'warning' ? '🟡 Atenção' :
               lvl === 'monitoring' ? '🔵 Monitoramento' : '🟢 Normal'}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Tipo:
          </span>
          {(['ALL', 'unusual_behavior', 'risk', 'inconsistency', 'error', 'failure'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                selectedType === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'Todos os Tipos' : getAnomalyTypeLabel(t)}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          {/* Filtro de Área */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value as any)}
            className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 focus:outline-hidden focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">Todas as Áreas (9 Módulos)</option>
            <option value="orders">Pedidos</option>
            <option value="cash">Caixa</option>
            <option value="finance">Financeiro</option>
            <option value="inventory">Estoque & CMV</option>
            <option value="integrations">Integrações</option>
            <option value="marketplace">Marketplace</option>
            <option value="users">Usuários & Acessos</option>
            <option value="system">Sistema</option>
            <option value="data">Dados & Banco</option>
          </select>
        </div>

      </div>

      {/* Lista de Diagnósticos */}
      {filteredDiagnostics.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-black text-slate-900">
            Nenhum sinal detectado com os filtros atuais
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            O motor de monitoramento contínuo do KitchenFlow não encontrou nenhuma anomalia correspondente aos critérios selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDiagnostics.map(diag => {
            const statusInfo = getStatusBadge(diag.status);

            return (
              <div
                key={diag.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  diag.isResolved 
                    ? 'border-slate-200 opacity-60 bg-slate-50/50' 
                    : diag.status === 'critical'
                    ? 'border-rose-200 hover:border-rose-400 shadow-xs'
                    : 'border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Informações Principais */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {getAnomalyTypeLabel(diag.anomalyType)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {diag.areaLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {diag.code}
                      </span>
                      {diag.isResolved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Resolvido
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 
                        onClick={() => onSelectDiagnostic(diag)}
                        className="text-sm sm:text-base font-black text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        {diag.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium line-clamp-2">
                        {diag.whatWasDetected}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Detectado em: {new Date(diag.detectedAt).toLocaleString('pt-BR')}</span>
                      </div>
                      {diag.entityReference && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-bold">{diag.entityReference}</span>
                        </>
                      )}
                      {diag.financialImpactEstimated ? (
                        <>
                          <span>•</span>
                          <span className="text-rose-600 font-bold">
                            Impacto estimado: R$ {diag.financialImpactEstimated.toFixed(2)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Ações Rápidas na Linha */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {diag.quickAction && !diag.isResolved && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onExecuteQuickAction) {
                            onExecuteQuickAction(diag.quickAction!.id, diag);
                          }
                          onResolveDiagnostic(diag.id, `Resolvido via Ação Rápida: ${diag.quickAction?.label}`);
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={diag.quickAction.description}
                      >
                        <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{diag.quickAction.label}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectDiagnostic(diag)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ficha Completa</span>
                    </button>

                    {!diag.isResolved && (
                      <button
                        type="button"
                        onClick={() => onResolveDiagnostic(diag.id, 'Marcado como resolvido')}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                        title="Marcar como resolvido"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
