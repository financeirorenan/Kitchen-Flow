import React, { useState } from 'react';
import { 
  Sparkles, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  MousePointer, 
  ShoppingBag, 
  CheckCircle2, 
  Tag, 
  Layers, 
  Store, 
  Target,
  ArrowUpRight,
  Info,
  Play,
  Pause
} from 'lucide-react';
import { Tenant, MarketplaceAdSpace, MarketplaceAdCampaign } from '../../../types';

interface MarketplaceMonetizationViewProps {
  tenants: Tenant[];
  onSaveConfig?: () => void;
}

const INITIAL_AD_SPACES: MarketplaceAdSpace[] = [
  {
    id: 'space-home-hero',
    name: 'Banner Principal (Carrossel Topo da Home)',
    placement: 'home_hero',
    description: 'Espaço nobre no topo da tela inicial do aplicativo do cliente. Máxima visibilidade.',
    pricingModel: 'monthly',
    price: 199.00,
    maxSlots: 5,
    activeSlots: 3,
    active: true,
    recommendedFor: 'Grandes lançamentos e ofertas imperdíveis'
  },
  {
    id: 'space-home-secondary',
    name: 'Banner Secundário (Meio da Home)',
    placement: 'home_secondary',
    description: 'Faixa publicitária localizada entre as categorias e os restaurantes recomendados.',
    pricingModel: 'monthly',
    price: 99.00,
    maxSlots: 6,
    activeSlots: 2,
    active: true,
    recommendedFor: 'Divulgação de combos e cardápios especiais'
  },
  {
    id: 'space-category-top',
    name: 'Destaque no Topo de Categoria',
    placement: 'category_top',
    description: 'Aparece como primeira opção quando o cliente clica em Pizza, Hambúrguer, etc.',
    pricingModel: 'monthly',
    price: 79.00,
    maxSlots: 3,
    activeSlots: 2,
    active: true,
    recommendedFor: 'Restaurantes especialistas em uma vertical'
  },
  {
    id: 'space-store-top',
    name: 'Lista de Restaurantes — 1ª Posição Garantida',
    placement: 'store_list_top',
    description: 'Selo "Patrocinado" fixando a loja no topo do feed com destaque visual dourado.',
    pricingModel: 'monthly',
    price: 149.00,
    maxSlots: 4,
    activeSlots: 3,
    active: true,
    recommendedFor: 'Aumentar pedidos imediatos e novos clientes'
  },
  {
    id: 'space-search-sponsored',
    name: 'Busca Patrocinada (Por Clique - CPC)',
    placement: 'search_sponsored',
    description: 'Aparece no topo dos resultados de busca do cliente quando pesquisa pratos ou nomes.',
    pricingModel: 'cpc',
    price: 0.50,
    maxSlots: 10,
    activeSlots: 5,
    active: true,
    recommendedFor: 'Capturar clientes com alta intenção de compra'
  }
];

const INITIAL_CAMPAIGNS: MarketplaceAdCampaign[] = [
  {
    id: 'camp-1',
    title: 'Campanha Burger Duplo Bacon',
    tenantId: 'tenant-1',
    tenantName: 'Pradópolis Burger House',
    spaceId: 'space-home-hero',
    spaceName: 'Banner Principal (Home)',
    placement: 'home_hero',
    bannerUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    status: 'active',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    investmentAmount: 199.00,
    impressions: 4820,
    clicks: 342,
    ordersGenerated: 68,
    revenueGenerated: 3450.00,
    targetCategory: 'Hambúrgueres',
    createdAt: new Date()
  },
  {
    id: 'camp-2',
    title: 'Destaque Topo Pizza Família',
    tenantId: 'tenant-2',
    tenantName: 'Pizzaria Bella Napoli',
    spaceId: 'space-store-top',
    spaceName: 'Lista de Restaurantes (1ª Posição)',
    placement: 'store_list_top',
    status: 'active',
    startDate: '2026-09-05',
    endDate: '2026-09-25',
    investmentAmount: 149.00,
    impressions: 3120,
    clicks: 215,
    ordersGenerated: 42,
    revenueGenerated: 2980.00,
    targetCategory: 'Pizzas',
    createdAt: new Date()
  },
  {
    id: 'camp-3',
    title: 'Promoção Barca de Sushi 30 Peças',
    tenantId: 'tenant-3',
    tenantName: 'Sushi Lounge Premium',
    spaceId: 'space-category-top',
    spaceName: 'Destaque Topo Categoria Japonesa',
    placement: 'category_top',
    status: 'active',
    startDate: '2026-09-01',
    endDate: '2026-09-15',
    investmentAmount: 79.00,
    impressions: 1980,
    clicks: 148,
    ordersGenerated: 29,
    revenueGenerated: 2465.00,
    targetCategory: 'Japonesa',
    createdAt: new Date()
  }
];

export const MarketplaceMonetizationView: React.FC<MarketplaceMonetizationViewProps> = ({
  tenants
}) => {
  const [adSpaces, setAdSpaces] = useState<MarketplaceAdSpace[]>(INITIAL_AD_SPACES);
  const [campaigns, setCampaigns] = useState<MarketplaceAdCampaign[]>(INITIAL_CAMPAIGNS);
  const [selectedSubTab, setSelectedSubTab] = useState<'spaces' | 'campaigns' | 'packages'>('spaces');

  // Modal State for Spaces
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Partial<MarketplaceAdSpace> | null>(null);

  // Modal State for Campaigns
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<MarketplaceAdCampaign> | null>(null);

  // Aggregate Metrics
  const totalAdRevenue = campaigns.reduce((acc, c) => acc + c.investmentAmount, 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const totalOrdersFromAds = campaigns.reduce((acc, c) => acc + c.ordersGenerated, 0);
  const totalGmvFromAds = campaigns.reduce((acc, c) => acc + c.revenueGenerated, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const avgRoi = totalAdRevenue > 0 ? (((totalGmvFromAds - totalAdRevenue) / totalAdRevenue) * 100).toFixed(0) : '0';

  const handleSaveSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpace?.name || !editingSpace?.price) return;

    if (editingSpace.id) {
      setAdSpaces(adSpaces.map(s => s.id === editingSpace.id ? { ...s, ...(editingSpace as MarketplaceAdSpace) } : s));
    } else {
      const newSpace: MarketplaceAdSpace = {
        id: `space-${Date.now()}`,
        name: editingSpace.name,
        placement: editingSpace.placement || 'custom',
        description: editingSpace.description || '',
        pricingModel: editingSpace.pricingModel || 'monthly',
        price: Number(editingSpace.price),
        maxSlots: Number(editingSpace.maxSlots || 5),
        activeSlots: 0,
        active: true,
        recommendedFor: editingSpace.recommendedFor || ''
      };
      setAdSpaces([...adSpaces, newSpace]);
    }
    setShowSpaceModal(false);
    setEditingSpace(null);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign?.tenantId || !editingCampaign?.spaceId) return;

    const tenant = tenants.find(t => t.id === editingCampaign.tenantId);
    const space = adSpaces.find(s => s.id === editingCampaign.spaceId);

    if (editingCampaign.id) {
      setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { ...c, ...(editingCampaign as MarketplaceAdCampaign) } : c));
    } else {
      const newCamp: MarketplaceAdCampaign = {
        id: `camp-${Date.now()}`,
        title: editingCampaign.title || `Campanha ${tenant?.name}`,
        tenantId: editingCampaign.tenantId,
        tenantName: tenant?.name || 'Lojista',
        spaceId: editingCampaign.spaceId,
        spaceName: space?.name || 'Espaço',
        placement: space?.placement || 'home_hero',
        bannerUrl: editingCampaign.bannerUrl || '',
        status: 'active',
        startDate: editingCampaign.startDate || new Date().toISOString().slice(0, 10),
        endDate: editingCampaign.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        investmentAmount: Number(editingCampaign.investmentAmount || space?.price || 199),
        impressions: 0,
        clicks: 0,
        ordersGenerated: 0,
        revenueGenerated: 0,
        targetCategory: editingCampaign.targetCategory || tenant?.category || 'Geral',
        createdAt: new Date()
      };
      setCampaigns([...campaigns, newCamp]);
    }
    setShowCampaignModal(false);
    setEditingCampaign(null);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Monetization KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento com Publicidade</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">
            R$ {totalAdRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500">{campaigns.filter(c => c.status === 'active').length} campanhas ativas</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impressões & Visualizações</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Eye size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalImpressions.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 font-medium">Cliques: <strong className="text-indigo-600">{totalClicks}</strong> (CTR: {avgCtr}%)</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GMV Gerado para Lojistas</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            R$ {totalGmvFromAds.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500">{totalOrdersFromAds} pedidos gerados via Ads</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retorno Médio dos Lojistas (ROI)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600">+{avgRoi}% ROI</p>
          <p className="text-xs text-slate-500">A cada R$ 1 investido, R$ {(totalGmvFromAds / (totalAdRevenue || 1)).toFixed(1)} gerados</p>
        </div>
      </div>

      {/* Subtab Toggle Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedSubTab('spaces')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedSubTab === 'spaces'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📋 Inventário de Espaços ({adSpaces.length})
          </button>
          <button
            onClick={() => setSelectedSubTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedSubTab === 'campaigns'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🚀 Campanhas dos Lojistas ({campaigns.length})
          </button>
          <button
            onClick={() => setSelectedSubTab('packages')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedSubTab === 'packages'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Pacotes de Divulgação & Ofertas
          </button>
        </div>

        {selectedSubTab === 'spaces' && (
          <button
            onClick={() => {
              setEditingSpace({
                name: '',
                placement: 'home_hero',
                description: '',
                pricingModel: 'monthly',
                price: 99.00,
                maxSlots: 5,
                recommendedFor: ''
              });
              setShowSpaceModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Novo Espaço Publicitário
          </button>
        )}

        {selectedSubTab === 'campaigns' && (
          <button
            onClick={() => {
              setEditingCampaign({
                title: '',
                tenantId: tenants[0]?.id || '',
                spaceId: adSpaces[0]?.id || '',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                investmentAmount: 199.00
              });
              setShowCampaignModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Criar Nova Campanha de Lojista
          </button>
        )}
      </div>

      {/* SUB-VIEW 1: INVENTÁRIO DE ESPAÇOS PUBLICITÁRIOS */}
      {selectedSubTab === 'spaces' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adSpaces.map((space) => {
            const occupationRate = ((space.activeSlots / space.maxSlots) * 100).toFixed(0);

            return (
              <div key={space.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider">
                      {space.placement.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingSpace(space);
                          setShowSpaceModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900">{space.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{space.description}</p>
                  </div>

                  {space.recommendedFor && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                      💡 <strong>Ideal para:</strong> {space.recommendedFor}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Base</p>
                      <p className="text-xl font-black text-slate-900">
                        R$ {space.price.toFixed(2).replace('.', ',')}
                        <span className="text-xs font-normal text-slate-400">/{space.pricingModel === 'monthly' ? 'mês' : space.pricingModel === 'cpc' ? 'clique' : 'un'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Ocupação</p>
                      <p className="text-sm font-black text-indigo-600">{space.activeSlots}/{space.maxSlots} slots ({occupationRate}%)</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min(100, Number(occupationRate))}%` }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-VIEW 2: CAMPANHAS ATIVAS DOS LOJISTAS */}
      {selectedSubTab === 'campaigns' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Campanhas Publicitárias Contratadas</h3>
              <p className="text-xs text-slate-500">Acompanhe o desempenho, cliques, pedidos gerados e o faturamento de cada anúncio.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Campanha & Restaurante</th>
                  <th className="px-6 py-4">Espaço / Posição</th>
                  <th className="px-6 py-4">Status & Período</th>
                  <th className="px-6 py-4">Investimento</th>
                  <th className="px-6 py-4">Impressões / Cliques</th>
                  <th className="px-6 py-4">Pedidos & Faturamento</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {campaigns.map((camp) => {
                  const ctr = camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100).toFixed(1) : '0.0';
                  const roi = camp.investmentAmount > 0 ? (((camp.revenueGenerated - camp.investmentAmount) / camp.investmentAmount) * 100).toFixed(0) : '0';

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-slate-900">{camp.title}</p>
                          <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                            <Store size={12} /> {camp.tenantName}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                          {camp.spaceName}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            camp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ativo
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium">{camp.startDate} até {camp.endDate}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-black text-amber-600 font-mono">
                          R$ {camp.investmentAmount.toFixed(2).replace('.', ',')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-900">{camp.impressions.toLocaleString()} views</p>
                          <p className="text-[10px] text-slate-500">{camp.clicks} cliques (CTR: {ctr}%)</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-emerald-600">{camp.ordersGenerated} pedidos</p>
                          <p className="text-[10px] text-slate-500 font-mono">R$ {camp.revenueGenerated.toFixed(2)} (+{roi}% ROI)</p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setCampaigns(campaigns.filter(c => c.id !== camp.id));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                            title="Remover Campanha"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: PACOTES COMERCIAIS PARA OFERTAR AOS LOJISTAS */}
      {selectedSubTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pacote 1: Destaque Starter */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                Plano Básico
              </span>
              <h4 className="text-xl font-black text-slate-900">Destaque Categoria</h4>
              <p className="text-xs text-slate-500">Ideal para novas lojas que desejam obter as primeiras avaliações e pedidos na sua vertical.</p>
              <div className="text-3xl font-black text-slate-900">
                R$ 79<span className="text-xs text-slate-400 font-normal">/mês</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  Top 3 na Categoria Principal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  Selo "Recomendado do Bairro"
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  Relatório mensal de cliques
                </li>
              </ul>
            </div>
          </div>

          {/* Pacote 2: Destaque Pro (Mais Popular) */}
          <div className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white p-6 rounded-3xl border-2 border-indigo-500 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider">
                ⭐ Mais Recomendado
              </span>
              <h4 className="text-xl font-black text-white">Super Destaque Home + Feed</h4>
              <p className="text-xs text-indigo-200">Máxima exposição com primeira posição na lista de restaurantes e selo de destaque no app.</p>
              <div className="text-3xl font-black text-white">
                R$ 149<span className="text-xs text-indigo-300 font-normal">/mês</span>
              </div>

              <ul className="space-y-2 text-xs text-indigo-100 pt-2 border-t border-indigo-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  1ª Posição Garantida no Feed Geral
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  Borda dourada de restaurante patrocinado
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  Impulso no algoritmo de busca
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  Notificação Push quinzenal para o público
                </li>
              </ul>
            </div>
          </div>

          {/* Pacote 3: Banner Master */}
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-300 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                Premium
              </span>
              <h4 className="text-xl font-black text-slate-900">Banner Carrossel Topo</h4>
              <p className="text-xs text-slate-500">Banner rotativo no topo absoluto da tela de entrada do aplicativo Nova com link direto.</p>
              <div className="text-3xl font-black text-amber-600">
                R$ 199<span className="text-xs text-slate-400 font-normal">/mês</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  Banner em alta resolução no topo do App
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  Link direto para prato ou cardápio da loja
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  Métricas em tempo real de CTR e conversão
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar/Editar Espaço */}
      {showSpaceModal && editingSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">
              {editingSpace.id ? 'Editar Espaço Publicitário' : 'Novo Espaço Publicitário'}
            </h3>

            <form onSubmit={handleSaveSpace} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Nome do Espaço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Banner Topo da Categoria Sushi"
                  value={editingSpace.name || ''}
                  onChange={(e) => setEditingSpace({ ...editingSpace, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Posição</label>
                  <select
                    value={editingSpace.placement || 'home_hero'}
                    onChange={(e) => setEditingSpace({ ...editingSpace, placement: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  >
                    <option value="home_hero">Home Topo</option>
                    <option value="home_secondary">Home Meio</option>
                    <option value="category_top">Topo Categoria</option>
                    <option value="store_list_top">1ª Posição Feed</option>
                    <option value="search_sponsored">Busca Patrocinada</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={editingSpace.price || ''}
                    onChange={(e) => setEditingSpace({ ...editingSpace, price: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Descrição</label>
                <textarea
                  placeholder="Ex: Espaço exclusivo exibido para clientes que navegam na home..."
                  value={editingSpace.description || ''}
                  onChange={(e) => setEditingSpace({ ...editingSpace, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-600 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSpaceModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-md shadow-indigo-200"
                >
                  Salvar Espaço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar/Editar Campanha de Lojista */}
      {showCampaignModal && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Nova Campanha Publicitária de Lojista</h3>

            <form onSubmit={handleSaveCampaign} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Nome da Campanha</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Impulso Festival do Hambúrguer"
                  value={editingCampaign.title || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Loja Anunciante</label>
                  <select
                    value={editingCampaign.tenantId || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, tenantId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Espaço Contratado</label>
                  <select
                    value={editingCampaign.spaceId || ''}
                    onChange={(e) => {
                      const sp = adSpaces.find(s => s.id === e.target.value);
                      setEditingCampaign({ 
                        ...editingCampaign, 
                        spaceId: e.target.value,
                        investmentAmount: sp?.price || 199.00 
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  >
                    {adSpaces.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Data Início</label>
                  <input
                    type="date"
                    value={editingCampaign.startDate || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, startDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Data Término</label>
                  <input
                    type="date"
                    value={editingCampaign.endDate || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, endDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Investimento Total (R$)</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={editingCampaign.investmentAmount || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, investmentAmount: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-md shadow-indigo-200"
                >
                  Ativar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
