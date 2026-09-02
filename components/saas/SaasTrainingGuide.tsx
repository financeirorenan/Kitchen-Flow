import React from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Lightbulb, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Building2, 
  DollarSign, 
  LifeBuoy, 
  X,
  Sparkles,
  Command
} from 'lucide-react';

interface SaasTrainingGuideProps {
  onClose?: () => void;
  onNavigateTab?: (tab: string) => void;
  onExecuteDiagnostic?: () => void;
}

export const SaasTrainingGuide: React.FC<SaasTrainingGuideProps> = ({
  onClose,
  onNavigateTab,
  onExecuteDiagnostic
}) => {
  return (
    <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-indigo-700/50 shadow-xl space-y-5 text-left relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-lg shadow-amber-400/20">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                🎓 MODO TREINAMENTO ATIVO
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mt-0.5">
              Guia Operacional para Gestão e Suporte SaaS
            </h3>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Ocultar Guia de Treinamento"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 3 Passos Principais de Operação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px]">1</span>
            <span>Varredura Diária</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            Verifique o placar de saúde no topo do painel. Se houver lojas com status vermelho 🔴, clique para abrir a <strong>Visão 360°</strong> e rodar o diagnóstico.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-black text-xs uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-indigo-400 text-slate-950 flex items-center justify-center text-[10px]">2</span>
            <span>Diagnóstico Antes do Suporte</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            💡 <strong>DICA DE OURO:</strong> Sempre execute o <em>Diagnóstico em 1 Clique</em> antes de abrir chamados. Ele testa banco, rede, impressoras e emissão fiscal.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-black text-xs uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px]">3</span>
            <span>Financeiro & Mensalidades</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            Acompanhe lojistas com vencimento em até 7 dias. Você pode registrar baixas manuais via PIX ou gerar cobranças automáticas instantaneamente.
          </p>
        </div>
      </div>

      {/* Dicas de Atalhos Rápidos */}
      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 relative z-10">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-400 shrink-0" />
          <span className="font-medium">
            Atalhos do Teclado: <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-[10px] font-black text-white">Ctrl + K</kbd> Busca Global • <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-[10px] font-black text-white">N</kbd> Novo Cliente • <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-[10px] font-black text-white">D</kbd> Diagnóstico • <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-[10px] font-black text-white">M</kbd> Marketplace
          </span>
        </div>

        {onExecuteDiagnostic && (
          <button
            onClick={onExecuteDiagnostic}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
          >
            <Zap size={14} />
            Testar Diagnóstico Agora
          </button>
        )}
      </div>
    </div>
  );
};
