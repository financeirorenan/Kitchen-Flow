import React, { useState } from 'react';
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Send, 
  Clock, 
  DollarSign, 
  Sparkles, 
  ArrowRight, 
  Percent, 
  CheckCircle2, 
  AlertTriangle,
  Mail,
  MessageCircle,
  Eye,
  Filter
} from 'lucide-react';
import { Tenant } from '../../../types';

interface MarketplaceCrmFunnelViewProps {
  tenants: Tenant[];
}

export const MarketplaceCrmFunnelView: React.FC<MarketplaceCrmFunnelViewProps> = ({
  tenants
}) => {
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'new' | 'recurring' | 'inactive' | 'vip' | 'abandoners'>('abandoners');
  const [recoveryDiscount, setRecoveryDiscount] = useState(10);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Conversion Funnel Data
  const funnelSteps = [
    { name: '1. Visitas no App', count: 12450, percentage: '100%', drop: null },
    { name: '2. Lojas Visualizadas', count: 8340, percentage: '67.0%', drop: '-33.0%' },
    { name: '3. Pratos & Cardápio', count: 5820, percentage: '46.7%', drop: '-30.2%' },
    { name: '4. Carrinhos Iniciados', count: 2180, percentage: '17.5%', drop: '-62.5%' },
    { name: '5. Checkout Aberto', count: 1420, percentage: '11.4%', drop: '-34.8%' },
    { name: '6. Pedidos Concluídos', count: 1120, percentage: '9.0%', drop: '-21.1%' },
  ];

  // Cart Abandonment Simulation
  const cartsInitiatedToday = 340;
  const cartsCompletedToday = 190;
  const cartsAbandonedToday = cartsInitiatedToday - cartsCompletedToday;
  const abandonmentRate = ((cartsAbandonedToday / cartsInitiatedToday) * 100).toFixed(1);
  const estimatedLostGmv = cartsAbandonedToday * 52.40;

  // CRM Segments list
  const segments = [
    { id: 'abandoners', name: '🛒 Abandonadores de Carrinho', count: cartsAbandonedToday, desc: 'Adicionaram itens nas últimas 24h mas não concluíram.' },
    { id: 'new', name: '✨ Novos Clientes (1º Pedido)', count: 480, desc: 'Cadastrados recentemente ou fizeram apenas 1 pedido.' },
    { id: 'recurring', name: '🔄 Recorrentes Fiéis', count: 1240, desc: 'Fazem pedidos pelo menos 2x ao mês.' },
    { id: 'vip', name: '👑 Clientes VIP', count: 210, desc: 'Gasto médio superior a R$ 350/mês.' },
    { id: 'inactive', name: '💤 Inativos (>30 dias)', count: 620, desc: 'Não realizam pedidos há mais de 30 dias.' }
  ];

  const handleSendRecoveryCampaign = () => {
    setRecoverySuccess(true);
    setTimeout(() => setRecoverySuccess(false), 4000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner: Cart Abandonment Live Alert */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-wider border border-rose-500/30">
              🚨 Radar de Conversão & Abandono
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {cartsAbandonedToday} Carrinhos Abandonados Hoje
          </h2>
          <p className="text-xs md:text-sm text-slate-300">
            Faturamento potencial parado em carrinhos: <strong className="text-emerald-400 font-black">R$ {estimatedLostGmv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. Taxa de abandono em <strong className="text-rose-400">{abandonmentRate}%</strong>.
          </p>
        </div>

        {/* Quick Recovery Action Box */}
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 w-full lg:w-auto shrink-0 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disparo Rápido de Recuperação</p>
          <div className="flex items-center gap-2">
            <select
              value={recoveryDiscount}
              onChange={(e) => setRecoveryDiscount(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white rounded-xl text-xs font-bold px-3 py-2 outline-none"
            >
              <option value={10}>Cupom R$ 10 OFF</option>
              <option value={15}>Cupom R$ 15 OFF</option>
              <option value={5}>Frete Grátis</option>
            </select>
            <button
              onClick={handleSendRecoveryCampaign}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer shrink-0"
            >
              <Send size={13} /> Disparar Push / WhatsApp
            </button>
          </div>
          {recoverySuccess && (
            <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 size={13} /> Campanha disparada para {cartsAbandonedToday} consumidores!
            </p>
          )}
        </div>
      </div>

      {/* Funil Visual de Conversão */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" />
            Funil Completo de Conversão do Marketplace
          </h3>
          <p className="text-xs text-slate-500">Mapeamento passo a passo da jornada do cliente no aplicativo e pontos de perda.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {funnelSteps.map((step, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Etapa {idx + 1}</span>
                {step.drop && (
                  <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                    {step.drop}
                  </span>
                )}
              </div>
              <p className="text-xs font-black text-slate-900 line-clamp-1">{step.name}</p>
              <p className="text-xl font-black text-indigo-600">{step.count.toLocaleString('pt-BR')}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full" 
                  style={{ width: step.percentage }} 
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400">{step.percentage} do topo</p>
            </div>
          ))}
        </div>
      </div>

      {/* CRM & Segmentação de Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Segments List */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Segmentos de Clientes no CRM
          </h3>
          <p className="text-xs text-slate-500">Selecione um grupo para disparar campanhas direcionadas:</p>

          <div className="space-y-2">
            {segments.map((seg) => (
              <div
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id as any)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                  selectedSegment === seg.id 
                    ? 'bg-indigo-50/80 border-indigo-500 shadow-sm' 
                    : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">{seg.name}</h4>
                  <span className="text-xs font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                    {seg.count} clientes
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{seg.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Campaign Action Panel for the Selected Segment */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Segmento Selecionado
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                {segments.find(s => s.id === selectedSegment)?.name}
              </h3>
            </div>
            <span className="text-xl font-black text-slate-900">
              {segments.find(s => s.id === selectedSegment)?.count} Contatos
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Mensagem da Notificação / Push / SMS</label>
              <textarea
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-indigo-600 transition-all h-28"
                defaultValue={`Olá! Notamos que você tem itens deliciosos esperando no seu carrinho. Use o cupom VOLTA10 e ganhe R$ 10 de desconto para concluir seu pedido agora! 🍔🍕`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Canal de Envio</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">Push Notif.</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">WhatsApp</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Cupom Vinculado</p>
                <p className="text-xs font-black text-indigo-600 pt-1 font-mono">VOLTA10 (R$ 10 OFF)</p>
              </div>
            </div>

            <button
              onClick={handleSendRecoveryCampaign}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={15} /> Disparar Campanha para {segments.find(s => s.id === selectedSegment)?.count} Clientes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
