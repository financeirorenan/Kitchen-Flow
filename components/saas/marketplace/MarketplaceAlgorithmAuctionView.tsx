import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  Info,
  Store
} from 'lucide-react';
import { Tenant, MarketplaceAlgorithmWeights } from '../../../types';

interface MarketplaceAlgorithmAuctionViewProps {
  tenants: Tenant[];
}

const DEFAULT_WEIGHTS: MarketplaceAlgorithmWeights = {
  ratingWeight: 25,
  ordersWeight: 20,
  conversionWeight: 15,
  prepTimeWeight: 10,
  cancelRatePenalty: 15,
  deliveryTimeWeight: 5,
  availabilityWeight: 5,
  promoWeight: 5,
  sponsoredBoost: 30,
  preventLowQualitySponsorship: true
};

export const MarketplaceAlgorithmAuctionView: React.FC<MarketplaceAlgorithmAuctionViewProps> = ({
  tenants
}) => {
  const [weights, setWeights] = useState<MarketplaceAlgorithmWeights>(DEFAULT_WEIGHTS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'algorithm' | 'auction'>('algorithm');

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('algorithm')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'algorithm'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚖️ Pesos do Algoritmo de Ranking
          </button>
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'auction'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚡ Sistema de Leilão & Prioridade
          </button>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-500 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-200 cursor-pointer"
        >
          <CheckCircle2 size={15} /> Salvar Configuração do Algoritmo
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-black flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} /> Pesos do algoritmo e regras de leilão atualizados com sucesso no Marketplace global!
        </div>
      )}

      {/* VIEW 1: PESOS DO ALGORITMO */}
      {activeTab === 'algorithm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders Configuration */}
          <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Sliders size={18} className="text-indigo-600" />
                Ponderação dos Critérios de Ordenação do Feed
              </h3>
              <p className="text-xs text-slate-500">Defina o peso de cada métrica no cálculo da nota de relevância das lojas no app.</p>
            </div>

            <div className="space-y-4">
              {/* Avaliação */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-800">⭐ Avaliação dos Clientes (Rating 5 Estrelas)</span>
                  <strong className="text-indigo-600 font-mono text-sm">{weights.ratingWeight}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.ratingWeight}
                  onChange={(e) => setWeights({ ...weights, ratingWeight: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Volume de Pedidos */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-800">📦 Volume Histórico de Pedidos</span>
                  <strong className="text-indigo-600 font-mono text-sm">{weights.ordersWeight}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.ordersWeight}
                  onChange={(e) => setWeights({ ...weights, ordersWeight: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Taxa de Conversão */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-800">📈 Taxa de Conversão da Loja (Visitas → Pedidos)</span>
                  <strong className="text-indigo-600 font-mono text-sm">{weights.conversionWeight}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.conversionWeight}
                  onChange={(e) => setWeights({ ...weights, conversionWeight: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Velocidade de Preparo */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-800">⏱️ Tempo Médio de Preparo e Despacho</span>
                  <strong className="text-indigo-600 font-mono text-sm">{weights.prepTimeWeight}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.prepTimeWeight}
                  onChange={(e) => setWeights({ ...weights, prepTimeWeight: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Penalidade por Cancelamento */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-rose-900">🚨 Penalização por Cancelamentos & Atrasos</span>
                  <strong className="text-rose-600 font-mono text-sm">-{weights.cancelRatePenalty}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.cancelRatePenalty}
                  onChange={(e) => setWeights({ ...weights, cancelRatePenalty: Number(e.target.value) })}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Right: Guardrails & Quality vs Sponsorship Balance */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              Trava de Qualidade em Destaques
            </h3>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950">Bloquear Patrocínio de Lojas Mal Avaliadas</span>
                <input
                  type="checkbox"
                  checked={weights.preventLowQualitySponsorship}
                  onChange={(e) => setWeights({ ...weights, preventLowQualitySponsorship: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Lojas com avaliação abaixo de 4.0 estrelas ou taxa de cancelamento superior a 8% não podem comprar destaques na primeira posição.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-black text-slate-800">Impulso de Lojas Promovidas (Boost)</p>
              <div className="flex items-center justify-between text-xs font-bold text-amber-600">
                <span>Multiplicador Patrocinado:</span>
                <span className="font-mono text-sm">+{weights.sponsoredBoost}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.sponsoredBoost}
                onChange={(e) => setWeights({ ...weights, sponsoredBoost: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SISTEMA DE LEILÃO & PRIORIDADE */}
      {activeTab === 'auction' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Mecanismo de Lance e Prioridade por Região
            </h3>
            <p className="text-xs text-slate-500">Como funciona o leilão quando múltiplos restaurantes concorrem pela mesma posição no feed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Regra 1</span>
              <h4 className="text-sm font-black text-slate-900">Lance Diário por Região</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Restaurantes definem um orçamento máximo diário (ex: R$ 15/dia) para disputar o topo do seu bairro.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Regra 2</span>
              <h4 className="text-sm font-black text-slate-900">Índice Ad Rank = Lance × Nota</h4>
              <p className="text-xs text-slate-500 leading-relaxed">A prioridade não depende apenas de quem paga mais, mas sim da multiplicação do valor ofertado pela nota operacional da loja.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Regra 3</span>
              <h4 className="text-sm font-black text-slate-900">Cobrança Justa por Pedido Gerado</h4>
              <p className="text-xs text-slate-500 leading-relaxed">A loja só é cobrada quando o anúncio gera cliques ou pedidos reais, protegendo o caixa do parceiro.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
