import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  RotateCw, 
  Coins, 
  ShoppingBag, 
  Package, 
  DollarSign, 
  Share2, 
  Layers, 
  ShieldCheck, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { DiagnosticItem } from './types';

interface DiagnosticQuickActionsTabProps {
  diagnostics: DiagnosticItem[];
  onExecuteAction: (actionId: string, item?: DiagnosticItem) => void;
  onResolveDiagnostic: (id: string, notes?: string) => void;
}

export const DiagnosticQuickActionsTab: React.FC<DiagnosticQuickActionsTabProps> = ({
  diagnostics,
  onExecuteAction,
  onResolveDiagnostic
}) => {
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [successLogs, setSuccessLogs] = useState<{ id: string; title: string; time: string }[]>([
    {
      id: 'log-1',
      title: 'Limpeza automática de filas de mensageria concluída',
      time: 'Hoje às 10:15'
    },
    {
      id: 'log-2',
      title: 'Conciliação preventiva de centavos de fechamento de caixa',
      time: 'Ontem às 23:45'
    }
  ]);

  const handleRunGlobalAction = (actionId: string, label: string) => {
    setRunningActionId(actionId);

    setTimeout(() => {
      setRunningActionId(null);
      setSuccessLogs(prev => [
        {
          id: `log-${Date.now()}`,
          title: `Executado com sucesso: ${label}`,
          time: `Hoje às ${new Date().toLocaleTimeString('pt-BR')}`
        },
        ...prev
      ]);
      onExecuteAction(actionId);
    }, 1200);
  };

  const pendingQuickActions = diagnostics.filter(d => !d.isResolved && d.quickAction);

  return (
    <div className="space-y-6">
      
      {/* Topo Explicativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs font-black uppercase tracking-wider border border-white/10">
          <Zap className="w-3.5 h-3.5" />
          <span>Central de Auto-Correção & Ações Imediatas</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Correções Guiadas e Prevenção Ativa com 1-Clique
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
          Evite retrabalho manual executando rotinas automáticas de conciliação de caixa, reparo de filas de webhook, reenvio emergencial de pedidos ao KDS e alinhamento de estoques com trilha auditada.
        </p>
      </div>

      {/* Ações Rápidas Globais */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Rotinas Globais de Auto-Correção</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Ação 1: Re-sincronizar Webhooks */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900">Re-sincronizar Fila de Webhooks</h4>
              <p className="text-xs text-slate-500 font-medium">
                Libera e reprocessa pacotes de delivery pendentes (iFood/Rappi) que sofreram atraso de conexão.
              </p>
            </div>
            <button
              type="button"
              disabled={runningActionId === 'resync-all-webhooks'}
              onClick={() => handleRunGlobalAction('resync-all-webhooks', 'Re-sincronização de Webhooks')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${runningActionId === 'resync-all-webhooks' ? 'animate-spin' : ''}`} />
              <span>{runningActionId === 'resync-all-webhooks' ? 'Processando...' : 'Executar Sincronismo'}</span>
            </button>
          </div>

          {/* Ação 2: Conciliação de Caixa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900">Conciliação Automática de Caixa</h4>
              <p className="text-xs text-slate-500 font-medium">
                Gera lançamentos compensatórios automáticos para diferenças residuais de centavos apuradas no PDV.
              </p>
            </div>
            <button
              type="button"
              disabled={runningActionId === 'reconcile-cash-all'}
              onClick={() => handleRunGlobalAction('reconcile-cash-all', 'Conciliação de Diferenças de Caixa')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Coins className={`w-3.5 h-3.5 ${runningActionId === 'reconcile-cash-all' ? 'animate-spin' : ''}`} />
              <span>{runningActionId === 'reconcile-cash-all' ? 'Conciliando...' : 'Conciliar Fechamentos'}</span>
            </button>
          </div>

          {/* Ação 3: Reindexação e Verificação de Banco */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-900">Auditoria & Reindexação de Banco</h4>
              <p className="text-xs text-slate-500 font-medium">
                Verifica integridade referencial entre pedidos, clientes e lançamentos, expurgando registros órfãos.
              </p>
            </div>
            <button
              type="button"
              disabled={runningActionId === 'reindex-db'}
              onClick={() => handleRunGlobalAction('reindex-db', 'Reindexação de Banco de Dados')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${runningActionId === 'reindex-db' ? 'animate-spin' : ''}`} />
              <span>{runningActionId === 'reindex-db' ? 'Verificando...' : 'Reindexar Dados'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Ações Específicas Pendentes Identificadas pelo Motor */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Ações Imediatas Sugeridas pelo Motor ({pendingQuickActions.length})</span>
        </h3>

        {pendingQuickActions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
            Nenhuma ação emergencial pendente no momento. Todos os módulos estão alinhados.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingQuickActions.map(item => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {item.areaLabel}
                    </span>
                    <span className="text-xs font-black text-slate-900">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {item.whatWasDetected}
                  </p>
                  <div className="text-[11px] text-amber-700 font-medium">
                    👉 Ação sugerida: <strong>{item.quickAction?.label}</strong> — {item.quickAction?.description}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onExecuteAction(item.quickAction!.id, item);
                      onResolveDiagnostic(item.id, `Resolvido via Ação Rápida: ${item.quickAction?.label}`);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{item.quickAction?.label}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico Recente de Intervenções */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
        <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Histórico de Auto-Correções Executadas</span>
        </h3>

        <div className="space-y-2">
          {successLogs.map(log => (
            <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{log.title}</span>
              </div>
              <span className="text-slate-400 text-[11px] font-mono shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
