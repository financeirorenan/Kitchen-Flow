import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Zap, 
  ArrowRight, 
  Check, 
  MessageSquare, 
  DollarSign, 
  Activity, 
  History, 
  FileText, 
  Sparkles, 
  ExternalLink,
  RotateCcw,
  Share2
} from 'lucide-react';
import { DiagnosticItem, DiagnosticStatus, AnomalyType } from './types';

interface DiagnosticDetailModalProps {
  diagnostic: DiagnosticItem | null;
  onClose: () => void;
  onResolve: (id: string, notes?: string) => void;
  onExecuteQuickAction?: (actionId: string, diagnostic: DiagnosticItem) => void;
}

export const DiagnosticDetailModal: React.FC<DiagnosticDetailModalProps> = ({
  diagnostic,
  onClose,
  onResolve,
  onExecuteQuickAction
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!diagnostic) return null;

  const getStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case 'critical':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500',
          label: '🔴 CRÍTICO',
          desc: 'Existe problema confirmado ou risco elevado de impacto operacional.'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          label: '🟡 ATENÇÃO',
          desc: 'Existe risco ou inconsistência que merece análise preventiva.'
        };
      case 'monitoring':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          dot: 'bg-blue-500',
          label: '🔵 MONITORAMENTO',
          desc: 'Comportamento fora do padrão, mas sem impacto confirmado.'
        };
      case 'normal':
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
          label: '🟢 NORMAL',
          desc: 'Nenhum problema relevante detectado.'
        };
    }
  };

  const getAnomalyTypeBadge = (type: AnomalyType) => {
    switch (type) {
      case 'unusual_behavior':
        return { label: 'COMPORTAMENTO INCOMUM', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'risk':
        return { label: 'RISCO OPERACIONAL', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'inconsistency':
        return { label: 'INCONSISTÊNCIA', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'error':
        return { label: 'ERRO CONFIRMADO', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'failure':
        return { label: 'FALHA DE SISTEMA', color: 'bg-red-100 text-red-900 border-red-300' };
      default:
        return { label: 'SINAL DETECTADO', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const statusInfo = getStatusBadge(diagnostic.status);
  const typeInfo = getAnomalyTypeBadge(diagnostic.anomalyType);

  const handleQuickAction = () => {
    if (!diagnostic.quickAction) return;
    setIsExecutingAction(true);

    setTimeout(() => {
      setIsExecutingAction(false);
      setActionSuccessMessage('Ação preventiva executada com sucesso!');
      if (onExecuteQuickAction) {
        onExecuteQuickAction(diagnostic.quickAction!.id, diagnostic);
      }
      setTimeout(() => {
        onResolve(diagnostic.id, `Resolvido via Ação Rápida: ${diagnostic.quickAction?.label}`);
      }, 1200);
    }, 1000);
  };

  const handleWhatsAppAlert = () => {
    const text = encodeURIComponent(
      `🚨 *ALERTA KITCHENFLOW AI: Central de Diagnóstico*\n\n` +
      `*Diagnóstico:* ${diagnostic.title}\n` +
      `*Nível:* ${statusInfo.label}\n` +
      `*Área:* ${diagnostic.areaLabel}\n` +
      `*O que foi detectado:* ${diagnostic.whatWasDetected}\n` +
      `*Impacto:* ${diagnostic.potentialImpact}\n` +
      `*Ação recomendada:* ${diagnostic.suggestedActions[0] || 'Verificar painel'}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Topo / Header da Ficha */}
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${statusInfo.bg}`}>
                  {statusInfo.label}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/15">
                  Área: {diagnostic.areaLabel}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: {diagnostic.code}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {diagnostic.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Detectado em: {new Date(diagnostic.detectedAt).toLocaleString('pt-BR')}</span>
                {diagnostic.entityReference && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-bold">{diagnostic.entityReference}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Corpo da Ficha com as 6 seções exigidas */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Mensagem de sucesso transitória */}
          {actionSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs font-bold">{actionSuccessMessage}</div>
            </div>
          )}

          {/* Grid com O Que Foi Detectado & Impacto Potencial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. O QUE FOI DETECTADO */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>1. O que foi detectado</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {diagnostic.whatWasDetected}
              </p>
              <div className="pt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700">Comportamento de Referência: </span>
                {statusInfo.desc}
              </div>
            </div>

            {/* 2. IMPACTO POTENCIAL */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>2. Impacto Potencial</span>
                </div>
                {diagnostic.financialImpactEstimated !== undefined && diagnostic.financialImpactEstimated > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
                    Risco: R$ {diagnostic.financialImpactEstimated.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {diagnostic.potentialImpact}
              </p>
              <div className="pt-2 text-[11px] text-amber-700 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 font-medium">
                💡 A prevenção precoce deste sinal evita prejuízos acumulados e perda de clientes.
              </div>
            </div>

          </div>

          {/* Grid com Causa Provável & Ações Sugeridas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 3. CAUSA PROVÁVEL */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>3. Causa Provável (Hipótese da IA)</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {diagnostic.probableCause}
              </p>
            </div>

            {/* 4. AÇÕES SUGERIDAS (ORIENTAÇÃO) */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>4. Ações Sugeridas (Passo a Passo)</span>
              </div>
              <ul className="space-y-2">
                {diagnostic.suggestedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* 5. AÇÃO RÁPIDA / CORREÇÃO IMEDIATA */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-slate-50 border border-indigo-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>5. Auto-Correção & Ação Imediata</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                1-Clique
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Execute a resolução guiada pelo sistema ou compartilhe o alerta imediatamente com a gerência do turno.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {diagnostic.quickAction && (
                <button
                  type="button"
                  disabled={isExecutingAction || diagnostic.isResolved}
                  onClick={handleQuickAction}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <Zap className={`w-4 h-4 ${isExecutingAction ? 'animate-spin' : ''}`} />
                  <span>{isExecutingAction ? 'Executando...' : diagnostic.quickAction.label}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleWhatsAppAlert}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Encaminhar no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => onResolve(diagnostic.id, 'Marcado como revisado pelo operador')}
                disabled={diagnostic.isResolved}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{diagnostic.isResolved ? 'Resolvido' : 'Marcar como Revisado'}</span>
              </button>
            </div>
          </div>

          {/* 6. REGISTRO & TRILHA IMUTÁVEL DE AUDITORIA */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <History className="w-4 h-4 text-slate-600" />
                <span>6. Trilha Imutável de Auditoria</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Log Criptografado & Rastreável
              </span>
            </div>

            <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-4 py-1">
              {diagnostic.auditTrail.map((entry, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 group-hover:bg-indigo-600 transition-colors" />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-800">{entry.action}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] text-slate-600 font-bold">
                      {entry.user}
                    </span>
                  </div>
                  {entry.details && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{entry.details}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Campo para observação da resolução */}
            {!diagnostic.isResolved && (
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Adicionar nota de auditoria ou motivo da resolução..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => onResolve(diagnostic.id, resolutionNotes || 'Resolvido via Central de Diagnóstico')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Concluir Registro
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            KitchenFlow AI • Central de Diagnóstico, Prevenção e Saúde
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>

      </div>
    </div>
  );
};
