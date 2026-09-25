import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  ArrowRight, 
  Filter, 
  RefreshCw, 
  Check, 
  DollarSign, 
  FileText, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { ReconciliationDiscrepancy } from '../../services/auditService';

interface AuditReconciliationTabProps {
  discrepancies?: ReconciliationDiscrepancy[];
  onInspectOrder?: (orderId: string) => void;
  onInspectFinancialRecord?: (recordId: string) => void;
  onRefresh?: () => void;
}

export const AuditReconciliationTab: React.FC<AuditReconciliationTabProps> = ({
  discrepancies = [],
  onInspectOrder,
  onInspectFinancialRecord,
  onRefresh
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const safeDiscrepancies = Array.isArray(discrepancies) ? discrepancies : [];

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filtered = safeDiscrepancies.filter(d => {
    if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = (d.title || '').toLowerCase().includes(term);
      const matchDesc = (d.description || '').toLowerCase().includes(term);
      const matchCode = (d.code || '').toLowerCase().includes(term);
      const matchAction = (d.recommendedAction || '').toLowerCase().includes(term);
      return matchTitle || matchDesc || matchCode || matchAction;
    }
    return true;
  });

  const criticalCount = safeDiscrepancies.filter(d => d.severity === 'critical').length;
  const warningCount = safeDiscrepancies.filter(d => d.severity === 'warning').length;
  const is100Conciliated = safeDiscrepancies.length === 0;

  return (
    <div className="space-y-6">
      {/* STATUS GERAL DE CONCILIAÇÃO */}
      <div className={`p-6 rounded-2xl border ${
        is100Conciliated
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              is100Conciliated
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              {is100Conciliated ? <CheckCircle2 className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  {is100Conciliated ? 'Operação 100% Conciliada' : 'Auditoria de Conciliação Automática'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  is100Conciliated
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {is100Conciliated ? 'Conformidade Total' : `${discrepancies.length} Divergência(s)`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cruzamento automático multidimensional: Pedidos ↔ Pagamentos ↔ Comissões ↔ Estornos ↔ Repasses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconciliar Novamente
              </button>
            )}
          </div>
        </div>

        {/* Resumo de Severidade */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total de Verificações</span>
            <span className="text-base font-black text-slate-900">9 Regras Ativas</span>
          </div>

          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Divergências Críticas</span>
            <span className="text-base font-black text-rose-900">{criticalCount}</span>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Alertas de Atenção</span>
            <span className="text-base font-black text-amber-900">{warningCount}</span>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterSeverity('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeverity === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({discrepancies.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeverity === 'critical' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Críticas ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeverity === 'warning' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Avisos ({warningCount})
          </button>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar inconsistência por regra, código ou texto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* LISTA DE DISCREPÂNCIAS DETECTADAS */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-sm font-black text-slate-900">
              Nenhuma inconsistência de conciliação encontrada
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Todos os pedidos, pagamentos, taxas de comissão e repasses do lojista batem exatamente com as somatórias auditadas.
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <div 
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.severity === 'critical'
                  ? 'bg-white border-rose-200 hover:border-rose-300'
                  : 'bg-white border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {item.code}
                      </span>
                      <h4 className="text-xs font-black text-slate-900">
                        {item.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.severity.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      {item.description}
                    </p>

                    {/* Ação recomendada */}
                    <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded-lg text-slate-700 border border-slate-100 flex items-start gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">Ação recomendada de auditoria:</span>{' '}
                        {item.recommendedAction}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diferença & Ação de Investigação */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {item.difference !== undefined && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Impacto</span>
                      <span className="text-xs font-black text-rose-600 font-mono">
                        {formatCurrency(item.difference)}
                      </span>
                    </div>
                  )}

                  {item.orderId && onInspectOrder && (
                    <button
                      type="button"
                      onClick={() => onInspectOrder(item.orderId!)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Auditar Pedido
                    </button>
                  )}

                  {item.paymentId && onInspectFinancialRecord && (
                    <button
                      type="button"
                      onClick={() => onInspectFinancialRecord(item.paymentId!)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Lançamento
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
