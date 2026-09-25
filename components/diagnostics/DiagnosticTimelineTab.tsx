import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Filter, 
  Layers, 
  Eye, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DiagnosticItem, DiagnosticStatus, DiagnosticAreaId } from './types';

interface DiagnosticTimelineTabProps {
  diagnostics: DiagnosticItem[];
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
}

export const DiagnosticTimelineTab: React.FC<DiagnosticTimelineTabProps> = ({
  diagnostics,
  onSelectDiagnostic
}) => {
  const [filterSeverity, setFilterSeverity] = useState<DiagnosticStatus | 'ALL'>('ALL');
  const [filterArea, setFilterArea] = useState<DiagnosticAreaId | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  // Ordenar cronologicamente inverso
  const timelineItems = useMemo(() => {
    return [...diagnostics]
      .filter(d => {
        if (filterSeverity !== 'ALL' && d.status !== filterSeverity) return false;
        if (filterArea !== 'ALL' && d.area !== filterArea) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            d.title.toLowerCase().includes(q) ||
            d.whatWasDetected.toLowerCase().includes(q) ||
            d.areaLabel.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }, [diagnostics, filterSeverity, filterArea, search]);

  const getStatusIcon = (status: DiagnosticStatus) => {
    switch (status) {
      case 'critical':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'monitoring':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'normal':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Topo da Timeline com Filtros */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Linha do Tempo de Diagnósticos & Eventos</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Rastreamento cronológico de todas as anomalias, verificações preditivas e intervenções.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar eventos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Severidade:
          </span>
          {(['ALL', 'critical', 'warning', 'monitoring', 'normal'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSeverity(s)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                filterSeverity === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'Todos' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Lista da Linha do Tempo */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        {timelineItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Nenhum evento registrado com os filtros aplicados.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6">
            {timelineItems.map((item, idx) => (
              <div key={item.id} className="relative pl-6 sm:pl-8 group">
                
                {/* Marcador na Linha */}
                <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                  item.status === 'critical' ? 'border-rose-500' :
                  item.status === 'warning' ? 'border-amber-500' :
                  item.status === 'monitoring' ? 'border-blue-500' : 'border-emerald-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'critical' ? 'bg-rose-500' :
                    item.status === 'warning' ? 'bg-amber-500' :
                    item.status === 'monitoring' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`} />
                </div>

                {/* Conteúdo do Evento */}
                <div className="bg-slate-50/70 hover:bg-indigo-50/40 p-4 rounded-2xl border border-slate-200/70 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                        {item.areaLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>{new Date(item.detectedAt).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{new Date(item.detectedAt).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    {item.whatWasDetected}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Impacto: <strong className="text-slate-700">{item.potentialImpact}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectDiagnostic(item)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Detalhes</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
