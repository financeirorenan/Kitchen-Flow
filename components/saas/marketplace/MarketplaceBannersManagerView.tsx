import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Eye, 
  MousePointer, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Store,
  ArrowUpRight
} from 'lucide-react';
import { Tenant, MarketplaceBannerItem } from '../../../types';

interface MarketplaceBannersManagerViewProps {
  tenants: Tenant[];
  bannerUrl: string;
  onBannerChange?: (url: string) => void;
}

const INITIAL_BANNERS: MarketplaceBannerItem[] = [
  {
    id: 'ban-1',
    title: 'Festival Gastronômico da Primavera',
    description: 'Descontos de até 30% nas melhores hamburguerias e pizzarias',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    linkUrl: '/promocoes',
    position: 'home_hero',
    priority: 10,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    pricePaid: 199.00,
    active: true,
    clicks: 420,
    impressions: 5120
  },
  {
    id: 'ban-2',
    title: 'Super Combo Smash Burger + Batata',
    description: 'Oferta exclusiva do Pradópolis Burger',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    linkUrl: '/restaurante/tenant-1',
    tenantName: 'Pradópolis Burger',
    position: 'home_middle',
    priority: 8,
    startDate: '2026-09-05',
    endDate: '2026-09-25',
    pricePaid: 99.00,
    active: true,
    clicks: 290,
    impressions: 3450
  },
  {
    id: 'ban-3',
    title: 'Noite Japonesa • Sushi Lounge Premium',
    description: 'Combo 40 peças com frete grátis hoje',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80',
    linkUrl: '/restaurante/tenant-3',
    tenantName: 'Sushi Lounge',
    position: 'category_top',
    priority: 7,
    startDate: '2026-09-01',
    endDate: '2026-09-18',
    pricePaid: 79.00,
    active: true,
    clicks: 180,
    impressions: 2190
  }
];

export const MarketplaceBannersManagerView: React.FC<MarketplaceBannersManagerViewProps> = ({
  tenants,
  bannerUrl,
  onBannerChange
}) => {
  const [banners, setBanners] = useState<MarketplaceBannerItem[]>(INITIAL_BANNERS);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<MarketplaceBannerItem>>({
    title: '',
    imageUrl: '',
    position: 'home_hero',
    priority: 5,
    active: true
  });

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner.title || !editingBanner.imageUrl) return;

    if (editingBanner.id) {
      setBanners(banners.map(b => b.id === editingBanner.id ? { ...b, ...(editingBanner as MarketplaceBannerItem) } : b));
    } else {
      const newBanner: MarketplaceBannerItem = {
        id: `ban-${Date.now()}`,
        title: editingBanner.title,
        description: editingBanner.description || '',
        imageUrl: editingBanner.imageUrl,
        linkUrl: editingBanner.linkUrl || '',
        position: editingBanner.position || 'home_hero',
        priority: Number(editingBanner.priority || 5),
        startDate: editingBanner.startDate || new Date().toISOString().slice(0, 10),
        endDate: editingBanner.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        pricePaid: Number(editingBanner.pricePaid || 0),
        active: true,
        clicks: 0,
        impressions: 0
      };
      setBanners([...banners, newBanner]);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Action Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">Gerenciador de Banners & Vitrines Publicitárias</h3>
          <p className="text-xs text-slate-500">Controle os banners ativos, posições, métricas de visualização e agendamentos.</p>
        </div>

        <button
          onClick={() => {
            setEditingBanner({
              title: '',
              imageUrl: '',
              position: 'home_hero',
              priority: 5,
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              active: true
            });
            setShowModal(true);
          }}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
        >
          <Plus size={15} /> Adicionar Novo Banner
        </button>
      </div>

      {/* Grid of Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((ban, idx) => (
          <div key={ban.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div>
              {/* Banner Image Preview */}
              <div className="relative h-40 bg-slate-100 overflow-hidden">
                <img src={ban.imageUrl} alt={ban.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[9px] font-black uppercase backdrop-blur-xs">
                    {ban.position === 'home_hero' ? 'Home Topo' : ban.position === 'home_middle' ? 'Home Meio' : 'Categoria Topo'}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingBanner(ban);
                      setShowModal(true);
                    }}
                    className="p-1.5 bg-white/90 text-slate-700 rounded-lg hover:bg-white shadow-xs"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      setBanners(banners.filter(b => b.id !== ban.id));
                    }}
                    className="p-1.5 bg-white/90 text-rose-600 rounded-lg hover:bg-white shadow-xs"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-5 space-y-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{ban.title}</h4>
                  {ban.description && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{ban.description}</p>
                  )}
                </div>

                {ban.tenantName && (
                  <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                    <Store size={12} /> {ban.tenantName}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Views</span>
                    <p className="font-black text-slate-800">{ban.impressions?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cliques</span>
                    <p className="font-black text-indigo-600">{ban.clicks?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">
                Prioridade: {ban.priority}/10
              </span>

              <div 
                onClick={() => {
                  const newBans = [...banners];
                  newBans[idx].active = !newBans[idx].active;
                  setBanners(newBans);
                }}
                className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-all ${ban.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${ban.active ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Adicionar/Editar Banner */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">
              {editingBanner.id ? 'Editar Banner' : 'Novo Banner Publicitário'}
            </h3>

            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Título do Banner</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Noite da Pizza Especial"
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">URL da Imagem</label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.com/banner.jpg"
                  value={editingBanner.imageUrl || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Posição</label>
                  <select
                    value={editingBanner.position || 'home_hero'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, position: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  >
                    <option value="home_hero">Home Topo</option>
                    <option value="home_middle">Home Meio</option>
                    <option value="category_top">Topo Categoria</option>
                    <option value="search_top">Busca Topo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Prioridade (1 a 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingBanner.priority || 5}
                    onChange={(e) => setEditingBanner({ ...editingBanner, priority: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Descrição / Subtítulo</label>
                <textarea
                  placeholder="Ex: Ganhe 20% de desconto hoje..."
                  value={editingBanner.description || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-600 h-16"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-md shadow-indigo-200"
                >
                  Salvar Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
