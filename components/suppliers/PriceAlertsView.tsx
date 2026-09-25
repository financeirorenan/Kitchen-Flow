import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Scale, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { PriceAlert, PriceHistoryEntry, B2BSupplier } from './types';

interface PriceAlertsViewProps {
  alerts: PriceAlert[];
  historyLogs: PriceHistoryEntry[];
  suppliers: B2BSupplier[];
  onCompareProduct: (productId: string, productName: string) => void;
  onDismissAlert?: (alertId: string) => void;
}

export const PriceAlertsView: React.FC<PriceAlertsViewProps> = ({
  alerts,
  historyLogs,
  suppliers,
  onCompareProduct,
  onDismissAlert
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600" />
            Inteligência de Mercado & Monitoramento de Preços
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Alertas automáticos de flutuação, oportunidades de economia e auditoria imutável de alterações de valores.
          </p>
        </div>

        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
          <Sparkles size={14} className="text-emerald-600" />
          <span>Monitoramento 24h ativo</span>
        </div>
      </div>

      {/* Grid: Alerts on Left, History Audit on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Alerts */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={15} className="text-amber-500" />
              Alertas Ativos ({alerts.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">Oportunidades & Avisos</span>
          </div>

          <div className="space-y-3">
            {alerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                  alert.severity === 'warning'
                    ? 'bg-amber-50/40 border-amber-200'
                    : alert.severity === 'success'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-indigo-50/40 border-indigo-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      alert.severity === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : alert.severity === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {alert.type === 'price_increase' ? (
                        <>
                          <TrendingUp size={11} /> Alta Detectada
                        </>
                      ) : alert.type === 'price_decrease' ? (
                        <>
                          <TrendingDown size={11} /> Queda de Preço
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} /> Oportunidade de Troca
                        </>
                      )}
                    </span>

                    <span className="text-[10px] text-slate-400 font-bold">
                      {alert.date}
                    </span>
                  </div>

                  <p className="font-bold text-slate-800 text-xs leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                    <span>Produto: <strong>{alert.productName}</strong></span>
                    <span>•</span>
                    <span>Fornecedor: <strong>{alert.supplierName}</strong></span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    onClick={() => onCompareProduct(alert.productId, alert.productName)}
                    className="text-emerald-700 hover:text-emerald-800 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    Comparar outros fornecedores <ArrowRight size={12} />
                  </button>

                  {onDismissAlert && (
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                    >
                      Dispensar
                    </button>
                  )}
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-500" />
                <p className="font-bold text-xs">Nenhum alerta de variação incomum no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Immutability Audit Logs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History size={15} className="text-indigo-600" />
              Auditoria de Histórico de Preços (Seção 15)
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">Trilha Imutável</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
            {historyLogs.map(log => (
              <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800">{log.productName}</span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                    R$ {log.price.toFixed(2)} /{log.unit}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold flex-wrap">
                  <span className="flex items-center gap-1 text-slate-700 font-bold">
                    <Building2 size={11} className="text-slate-400" /> {log.supplierName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-slate-400" /> {log.date} às {log.time}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User size={11} className="text-slate-400" /> {log.userResponsible}
                  </span>
                </div>

                {log.notes && (
                  <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">
                    "{log.notes}"
                  </p>
                )}
              </div>
            ))}

            {historyLogs.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                Nenhum registro de auditoria gravado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
