import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  ArrowUpRight, 
  CheckCircle2, 
  DollarSign, 
  Store, 
  ShoppingBag, 
  Zap,
  Send,
  Flag
} from 'lucide-react';
import { Tenant, MarketplaceOpportunity, MarketplaceGoal } from '../../../types';

interface MarketplaceOpportunitiesViewProps {
  tenants: Tenant[];
  onNavigateTab?: (tab: string) => void;
}

const INITIAL_OPPORTUNITIES: MarketplaceOpportunity[] = [
  {
    id: 'opp-1',
    type: 'ad_upsell',
    title: '3 Lojas com alta nota (4.9★) mas poucas visitas no app',
    description: 'Restaurantes com excelência gastronômica que podem multiplicar faturamento com um Destaque Home.',
    potentialImpact: '+R$ 4.200 em GMV e +R$ 447 em receita de publicidade',
    suggestedAction: 'Enviar oferta de 50% de desconto no 1º mês do Destaque Pro',
    actionType: 'create_campaign',
    priority: 'high'
  },
  {
    id: 'opp-2',
    type: 'growth',
    title: 'Categoria "Pizzarias" com pico de buscas às sextas e domingos',
    description: 'Demanda 40% superior à média nos fins de semana à noite.',
    potentialImpact: '+120 pedidos estimados por fim de semana',
    suggestedAction: 'Criar campanha "Noite da Pizza" com cupom compartilhado',
    actionType: 'create_coupon',
    priority: 'high'
  },
  {
    id: 'opp-3',
    type: 'retention',
    title: '142 carrinhos com pratos de Sushi não foram finalizados',
    description: 'Ticket médio alto (R$ 82,00) parado sem conversão nas últimas 48h.',
    potentialImpact: 'Recuperação estimada de R$ 3.800 em vendas',
    suggestedAction: 'Disparar push com Frete Grátis acima de R$ 60',
    actionType: 'recover_cart',
    priority: 'medium'
  }
];

const INITIAL_GOALS: MarketplaceGoal[] = [
  {
    id: 'goal-1',
    title: 'GMV Mensal Transacionado',
    metric: 'gmv',
    targetValue: 150000.00,
    currentValue: 118400.00,
    unit: 'currency',
    deadlineMonth: 'Setembro/2026'
  },
  {
    id: 'goal-2',
    title: 'Receita Real do Marketplace Nova',
    metric: 'revenue',
    targetValue: 18000.00,
    currentValue: 14650.00,
    unit: 'currency',
    deadlineMonth: 'Setembro/2026'
  },
  {
    id: 'goal-3',
    title: 'Receita com Venda de Publicidade & Banners',
    metric: 'ad_revenue',
    targetValue: 3500.00,
    currentValue: 2780.00,
    unit: 'currency',
    deadlineMonth: 'Setembro/2026'
  },
  {
    id: 'goal-4',
    title: 'Volume Total de Pedidos Concluídos',
    metric: 'orders',
    targetValue: 3200,
    currentValue: 2640,
    unit: 'number',
    deadlineMonth: 'Setembro/2026'
  }
];

export const MarketplaceOpportunitiesView: React.FC<MarketplaceOpportunitiesViewProps> = ({
  tenants,
  onNavigateTab
}) => {
  const [opportunities, setOpportunities] = useState<MarketplaceOpportunity[]>(INITIAL_OPPORTUNITIES);
  const [goals, setGoals] = useState<MarketplaceGoal[]>(INITIAL_GOALS);
  const [actionDoneId, setActionDoneId] = useState<string | null>(null);

  const handleExecuteAction = (oppId: string) => {
    setActionDoneId(oppId);
    setTimeout(() => {
      setOpportunities(opportunities.filter(o => o.id !== oppId));
      setActionDoneId(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Metas & Previsão de Faturamento */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Target size={18} className="text-indigo-600" />
              Metas & Projeção Mensal do Marketplace Nova (Setembro/2026)
            </h3>
            <p className="text-xs text-slate-500">Acompanhe o progresso de faturamento, pedidos e monetização em relação aos objetivos estabelecidos.</p>
          </div>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
            Ritmo de Crescimento: +18.4%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {goals.map((g) => {
            const progress = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));

            return (
              <div key={g.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{g.title}</p>
                  <p className="text-xl font-black text-slate-900 mt-1">
                    {g.unit === 'currency' 
                      ? `R$ ${g.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : `${g.currentValue.toLocaleString('pt-BR')}`}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Meta: {g.unit === 'currency' ? `R$ ${g.targetValue.toLocaleString('pt-BR')}` : g.targetValue.toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">Atingimento:</span>
                    <span className="text-indigo-600 font-black">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Central de Oportunidades Automáticas & Inteligência */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            Central de Oportunidades & Ações de Crescimento
          </h3>
          <p className="text-xs text-slate-500">Sugestões inteligentes em tempo real calculadas a partir dos dados de comportamento do aplicativo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {opportunities.map((opp) => (
            <div key={opp.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                  opp.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  Prioridade {opp.priority === 'high' ? 'Alta' : 'Média'}
                </span>

                <div>
                  <h4 className="text-sm font-black text-slate-900">{opp.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{opp.description}</p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs">
                  <p className="text-[10px] uppercase font-bold text-emerald-800">Impacto Estimado:</p>
                  <p className="font-bold text-emerald-950 mt-0.5">{opp.potentialImpact}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60">
                {actionDoneId === opp.id ? (
                  <div className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 size={14} /> Ação Executada com Sucesso!
                  </div>
                ) : (
                  <button
                    onClick={() => handleExecuteAction(opp.id)}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
                  >
                    <Zap size={13} /> {opp.suggestedAction}
                  </button>
                )}
              </div>
            </div>
          ))}

          {opportunities.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400 font-bold text-xs">
              🎉 Todas as oportunidades recomendadas foram executadas!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
