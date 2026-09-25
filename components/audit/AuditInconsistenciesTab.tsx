import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Filter, 
  ExternalLink,
  Info
} from 'lucide-react';
import { AuditInconsistency } from '../../types';

interface AuditInconsistenciesTabProps {
  inconsistencies?: AuditInconsistency[];
  onInvestigate: (entityType: string, entityId: string) => void;
}

export const AuditInconsistenciesTab: React.FC<AuditInconsistenciesTabProps> = ({
  inconsistencies = [],
  onInvestigate
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'suspicious' | 'normal'>('all');

  const safeInconsistencies = Array.isArray(inconsistencies) ? inconsistencies : [];

  const filtered = safeInconsistencies.filter(inc => {
    if (severityFilter === 'all') return true;
    return inc.severity === severityFilter;
  });

  const countBySeverity = {
    critical: safeInconsistencies.filter(i => i.severity === 'critical').length,
    warning: safeInconsistencies.filter(i => i.severity === 'warning').length,
    suspicious: safeInconsistencies.filter(i => i.severity === 'suspicious').length,
    normal: safeInconsistencies.filter(i => i.severity === 'normal').length
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            🔴 Crítico
          </span>
        );
      case 'warning':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            🟠 Atenção
          </span>
        );
      case 'suspicious':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-yellow-100 text-yellow-800 border border-yellow-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            🟡 Suspeito
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            🟢 Normal
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Filter bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            ⚠️ Inconsistências & Desvios Operacionais
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Varredura algorítmica contínua de integridade contábil, pedidos sem pagamento e anomalias de caixa.
          </p>
        </div>

        {/* Severities Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSeverityFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              severityFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({inconsistencies.length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('critical')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              severityFilter === 'critical'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            🔴 Crítico ({countBySeverity.critical})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('warning')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              severityFilter === 'warning'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            🟠 Atenção ({countBySeverity.warning})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('suspicious')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              severityFilter === 'suspicious'
                ? 'bg-yellow-500 text-white shadow-xs'
                : 'text-yellow-700 hover:bg-yellow-50'
            }`}
          >
            🟡 Suspeito ({countBySeverity.suspicious})
          </button>
        </div>
      </div>

      {/* List of Inconsistencies */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-12 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Nenhuma inconsistência detectada nesta categoria
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Todas as transações, pedidos e movimentações estão em estrita conformidade com as regras de auditoria e conciliação.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map(inc => (
            <div
              key={inc.id}
              className={`p-4 rounded-2xl border transition-all ${
                inc.severity === 'critical'
                  ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                  : inc.severity === 'warning'
                  ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                  : 'bg-yellow-50/30 border-yellow-200/80 hover:border-yellow-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getSeverityBadge(inc.severity)}
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {inc.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      Detectado em: {new Date(inc.detectedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900">
                    {inc.title}
                  </h3>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {inc.description}
                  </p>

                  {/* Impacto financeiro e autoria */}
                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    {inc.amount !== undefined && (
                      <span className="text-slate-600 font-bold">
                        Valor Envolvido:{' '}
                        <span className="text-rose-700 font-black">
                          {inc.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </span>
                    )}

                    {inc.userResponsible && (
                      <span className="text-slate-600 font-bold">
                        Responsável:{' '}
                        <span className="text-slate-900 font-black">
                          {inc.userResponsible}
                        </span>
                      </span>
                    )}

                    <span className="text-slate-500 font-medium">
                      Registro Afetado:{' '}
                      <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                        {inc.entityType.toUpperCase()} #{inc.entityId.slice(0, 10)}
                      </span>
                    </span>
                  </div>

                  {/* Ação Recomendada */}
                  {inc.recommendedAction && (
                    <div className="mt-2.5 p-2.5 bg-white/80 rounded-xl border border-slate-200/80 flex items-start gap-2 text-xs text-slate-700">
                      <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-indigo-900">Ação Recomendada: </span>
                        {inc.recommendedAction}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão de Investigação */}
                <button
                  type="button"
                  onClick={() => onInvestigate(inc.entityType, inc.entityId)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start shrink-0 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span>Investigar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
