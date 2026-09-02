import React, { useState } from 'react';
import { 
  Sparkles, 
  Tag, 
  Percent, 
  DollarSign, 
  Plus, 
  Edit3, 
  Trash2, 
  Truck, 
  Gift, 
  Layers, 
  Store, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Tenant, MarketplacePromotion, MarketplaceCoupon } from '../../../types';

interface MarketplacePromotionsViewProps {
  tenants: Tenant[];
  promotions: MarketplacePromotion[];
  onUpdatePromotions: (promos: MarketplacePromotion[]) => void;
}

const INITIAL_COUPONS: MarketplaceCoupon[] = [
  {
    id: 'coup-1',
    code: 'BEMVINDO15',
    description: 'R$ 15 OFF no primeiro pedido do cliente no app',
    discountType: 'fixed',
    discountValue: 15.00,
    minOrderValue: 50.00,
    usageLimit: 500,
    usedCount: 142,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    targetAudience: 'new_customers',
    sponsoredBy: 'nova',
    active: true
  },
  {
    id: 'coup-2',
    code: 'PIZZA20',
    description: '20% de desconto em Pizzas artesanais (acima de R$ 70)',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 70.00,
    usageLimit: 200,
    usedCount: 68,
    startDate: '2026-09-01',
    endDate: '2026-09-20',
    targetAudience: 'all',
    sponsoredBy: 'split',
    splitStoreShare: 14, // 14% loja
    splitNovaShare: 6,   // 6% nova
    active: true
  },
  {
    id: 'coup-3',
    code: 'VOLTA10',
    description: 'Cupom de recuperação para clientes inativos há mais de 20 dias',
    discountType: 'fixed',
    discountValue: 10.00,
    minOrderValue: 45.00,
    usageLimit: 300,
    usedCount: 89,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    targetAudience: 'recurring_customers',
    sponsoredBy: 'nova',
    active: true
  }
];

export const MarketplacePromotionsView: React.FC<MarketplacePromotionsViewProps> = ({
  tenants,
  promotions,
  onUpdatePromotions
}) => {
  const [coupons, setCoupons] = useState<MarketplaceCoupon[]>(INITIAL_COUPONS);
  const [activeTab, setActiveTab] = useState<'promotions' | 'coupons' | 'cost_split'>('promotions');

  // Modal Promoção
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<MarketplacePromotion> | null>(null);

  // Modal Cupom
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<MarketplaceCoupon> | null>(null);

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo?.title) return;

    if (editingPromo.id) {
      onUpdatePromotions(promotions.map(p => p.id === editingPromo.id ? { ...p, ...(editingPromo as MarketplacePromotion) } : p));
    } else {
      const newPromo: MarketplacePromotion = {
        id: `promo-${Date.now()}`,
        title: editingPromo.title,
        description: editingPromo.description || '',
        active: true,
        type: editingPromo.type || 'free_delivery',
        minOrderValue: Number(editingPromo.minOrderValue || 50),
        discountValue: Number(editingPromo.discountValue || 0),
        couponCode: editingPromo.couponCode || '',
        participatingTenantIds: editingPromo.participatingTenantIds || ['all'],
        sponsoredBy: editingPromo.sponsoredBy || 'store',
        splitStoreShare: Number(editingPromo.splitStoreShare || 70),
        splitNovaShare: Number(editingPromo.splitNovaShare || 30)
      };
      onUpdatePromotions([...promotions, newPromo]);
    }
    setShowPromoModal(false);
    setEditingPromo(null);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code || !editingCoupon?.discountValue) return;

    if (editingCoupon.id) {
      setCoupons(coupons.map(c => c.id === editingCoupon.id ? { ...c, ...(editingCoupon as MarketplaceCoupon) } : c));
    } else {
      const newCoup: MarketplaceCoupon = {
        id: `coup-${Date.now()}`,
        code: editingCoupon.code.toUpperCase().trim(),
        description: editingCoupon.description || '',
        discountType: editingCoupon.discountType || 'fixed',
        discountValue: Number(editingCoupon.discountValue),
        minOrderValue: Number(editingCoupon.minOrderValue || 0),
        usageLimit: Number(editingCoupon.usageLimit || 100),
        usedCount: 0,
        startDate: editingCoupon.startDate || new Date().toISOString().slice(0, 10),
        endDate: editingCoupon.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        targetAudience: editingCoupon.targetAudience || 'all',
        sponsoredBy: editingCoupon.sponsoredBy || 'nova',
        splitStoreShare: Number(editingCoupon.splitStoreShare || 70),
        splitNovaShare: Number(editingCoupon.splitNovaShare || 30),
        active: true
      };
      setCoupons([...coupons, newCoup]);
    }
    setShowCouponModal(false);
    setEditingCoupon(null);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('promotions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'promotions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏷️ Campanhas & Promoções ({promotions.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎟️ Central de Cupons ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab('cost_split')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'cost_split'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚖️ Divisão de Custos (Quem Paga?)
          </button>
        </div>

        {activeTab === 'promotions' && (
          <button
            onClick={() => {
              setEditingPromo({
                title: '',
                description: '',
                type: 'free_delivery',
                minOrderValue: 60.00,
                discountValue: 0,
                sponsoredBy: 'store',
                participatingTenantIds: ['all']
              });
              setShowPromoModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Nova Promoção
          </button>
        )}

        {activeTab === 'coupons' && (
          <button
            onClick={() => {
              setEditingCoupon({
                code: '',
                description: '',
                discountType: 'fixed',
                discountValue: 10.00,
                minOrderValue: 40.00,
                usageLimit: 200,
                sponsoredBy: 'nova',
                targetAudience: 'all'
              });
              setShowCouponModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Criar Novo Cupom
          </button>
        )}
      </div>

      {/* VIEW 1: PROMOÇÕES ATIVAS */}
      {activeTab === 'promotions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promo, idx) => (
            <div key={promo.id || idx} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between hover:border-indigo-200 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    promo.type === 'free_delivery' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {promo.type === 'free_delivery' ? '🚚 Frete Grátis' : promo.type === 'percentage_discount' ? '🏷️ % Desconto' : '💵 Valor Fixo'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingPromo(promo);
                        setShowPromoModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        onUpdatePromotions(promotions.filter((_, i) => i !== idx));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-black text-slate-900">{promo.title}</h4>
                  {promo.description && (
                    <p className="text-xs text-slate-500 mt-1">{promo.description}</p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Pedido Mínimo:</span>
                    <strong className="text-slate-900">R$ {promo.minOrderValue?.toFixed(2) || '0,00'}</strong>
                  </div>
                  {promo.discountValue ? (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Desconto:</span>
                      <strong className="text-emerald-600">{promo.type === 'percentage_discount' ? `${promo.discountValue}%` : `R$ ${promo.discountValue.toFixed(2)}`}</strong>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Financiamento:</span>
                    <span className="font-bold text-indigo-600 text-[11px] uppercase">
                      {promo.sponsoredBy === 'nova' ? '100% Nova' : promo.sponsoredBy === 'split' ? 'Dividido (Loja + Nova)' : '100% Lojista'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">
                  {(!promo.participatingTenantIds || promo.participatingTenantIds.includes('all')) 
                    ? 'Todas as Lojas' 
                    : `${promo.participatingTenantIds.length} Loja(s)`}
                </span>

                <div 
                  onClick={() => {
                    const newPromos = [...promotions];
                    newPromos[idx].active = !newPromos[idx].active;
                    onUpdatePromotions(newPromos);
                  }}
                  className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-all ${promo.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${promo.active ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: CUPONS DE DESCONTO */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Cupons de Desconto Cadastrados</h3>
              <p className="text-xs text-slate-500">Cupons promocionais para conversão, aquisição de novos clientes e recuperação de inativos.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Código / Descrição</th>
                  <th className="px-6 py-4">Desconto</th>
                  <th className="px-6 py-4">Regra / Mínimo</th>
                  <th className="px-6 py-4">Público Alvo</th>
                  <th className="px-6 py-4">Financiamento</th>
                  <th className="px-6 py-4">Usos Realizados</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {coupons.map((coup) => (
                  <tr key={coup.id} className="hover:bg-slate-50/60 transition-all">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 inline-block">
                          {coup.code}
                        </span>
                        <p className="text-xs text-slate-700 font-medium mt-1">{coup.description}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-black text-emerald-600 text-sm">
                        {coup.discountType === 'percentage' ? `${coup.discountValue}% OFF` : `R$ ${coup.discountValue.toFixed(2)} OFF`}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-bold">Min: R$ {coup.minOrderValue.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">Até {coup.endDate}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {coup.targetAudience === 'new_customers' ? 'Novos Clientes' : coup.targetAudience === 'recurring_customers' ? 'Clientes Recorrentes' : 'Geral (Todos)'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        coup.sponsoredBy === 'nova' ? 'bg-indigo-50 text-indigo-700' : coup.sponsoredBy === 'split' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {coup.sponsoredBy === 'nova' ? '100% Nova' : coup.sponsoredBy === 'split' ? 'Dividido' : '100% Loja'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-black text-slate-900">{coup.usedCount} / {coup.usageLimit}</p>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${(coup.usedCount / coup.usageLimit) * 100}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setCoupons(coupons.filter(c => c.id !== coup.id));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: DIVISÃO DE CUSTOS & FINANCIAMENTO DAS PROMOÇÕES */}
      {activeTab === 'cost_split' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="max-w-2xl space-y-2">
            <h3 className="text-lg font-black text-slate-900">Como funciona o Financiamento de Promoções no Nova?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              O Marketplace Nova permite 3 modelos de investimento promocional para atrair novos clientes sem prejudicar a margem dos estabelecimentos parceiros:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 text-[10px] font-black uppercase">
                1. 100% Lojista
              </span>
              <h4 className="text-sm font-black text-slate-900">Desconto do Próprio Restaurante</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                O restaurante decide oferecer um desconto ou combo no cardápio. O valor é abatido inteiramente do recebível da loja.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase">
                2. 100% Marketplace Nova
              </span>
              <h4 className="text-sm font-black text-indigo-950">Investimento de Aquisição do Nova</h4>
              <p className="text-xs text-indigo-900 leading-relaxed">
                O marketplace patrocina cupons de boas-vindas (ex: R$ 15 OFF) para gerar novos usuários. A loja recebe o valor integral do prato.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase">
                3. Modelo Compartilhado (Split)
              </span>
              <h4 className="text-sm font-black text-amber-950">Parceria Ganha-Ganha</h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                Exemplo: Em um cupom de R$ 10 OFF, a loja absorve R$ 7 e o Marketplace Nova investe R$ 3 para impulsionar a conversão.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova/Editar Promoção */}
      {showPromoModal && editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Configurar Promoção</h3>

            <form onSubmit={handleSavePromo} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Título da Campanha</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Frete Grátis na Primeira Compra"
                  value={editingPromo.title || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Tipo</label>
                  <select
                    value={editingPromo.type || 'free_delivery'}
                    onChange={(e) => setEditingPromo({ ...editingPromo, type: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  >
                    <option value="free_delivery">Frete Grátis</option>
                    <option value="percentage_discount">% de Desconto</option>
                    <option value="fixed_discount">Valor Fixo (R$)</option>
                    <option value="buy_x_get_y">Leve X Pague Y</option>
                    <option value="combo_deal">Combo Promocional</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Valor Mínimo (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    value={editingPromo.minOrderValue || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, minOrderValue: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Quem Financia o Desconto?</label>
                <select
                  value={editingPromo.sponsoredBy || 'store'}
                  onChange={(e) => setEditingPromo({ ...editingPromo, sponsoredBy: e.target.value as any })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                >
                  <option value="store">100% Lojista</option>
                  <option value="nova">100% Marketplace Nova</option>
                  <option value="split">Dividido (Lojista + Nova)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-md shadow-indigo-200"
                >
                  Salvar Promoção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Cupom */}
      {showCouponModal && editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Novo Cupom de Desconto</h3>

            <form onSubmit={handleSaveCoupon} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Código do Cupom</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NOITEPIZZA10"
                  value={editingCoupon.code || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono tracking-wider outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Tipo Desconto</label>
                  <select
                    value={editingCoupon.discountType || 'fixed'}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  >
                    <option value="fixed">Valor Fixo (R$)</option>
                    <option value="percentage">Percentual (%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Valor do Desconto</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editingCoupon.discountValue || ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Pedido Mínimo (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    value={editingCoupon.minOrderValue || ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, minOrderValue: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Limite de Usos</label>
                  <input
                    type="number"
                    value={editingCoupon.usageLimit || ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, usageLimit: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-md shadow-indigo-200"
                >
                  Criar Cupom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
