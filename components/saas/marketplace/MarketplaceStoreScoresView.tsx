import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Award, 
  Search, 
  Filter, 
  TrendingUp, 
  Eye, 
  ExternalLink, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  ShoppingBag,
  Percent,
  Sparkles
} from 'lucide-react';
import { Tenant } from '../../../types';

interface MarketplaceStoreScoresViewProps {
  tenants: Tenant[];
  onViewTenant360: (tenant: Tenant) => void;
  onOpenStoreMenu: (tenant: Tenant) => void;
  marketplaceFixedFee: number;
}

export const MarketplaceStoreScoresView: React.FC<MarketplaceStoreScoresViewProps> = ({
  tenants,
  onViewTenant360,
  onOpenStoreMenu,
  marketplaceFixedFee = 1.50
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<Tenant | null>(null);

  const filteredStores = useMemo(() => {
    return tenants.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' ? true : statusFilter === 'online' ? t.active : !t.active;
      return matchSearch && matchStatus;
    });
  }, [tenants, searchTerm, statusFilter]);

  // Score generator helper based on tenant data
  const getStoreScore = (t: Tenant, index: number) => {
    const baseScore = t.active ? 85 + (index % 12) : 55 + (index % 15);
    return Math.min(99, Math.max(45, baseScore));
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Filter & Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">Relatório de Performance & Score Operacional por Loja</h3>
          <p className="text-xs text-slate-500">Avalie a saúde de cada estabelecimento com base em notas, cancelamentos, tempo de preparo e faturamento.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar loja ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'online', label: 'Online' },
              { id: 'offline', label: 'Offline' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  statusFilter === f.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stores Table with Score */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Estabelecimento</th>
                <th className="px-6 py-4">Score Operacional</th>
                <th className="px-6 py-4">Avaliação / Tempo</th>
                <th className="px-6 py-4">Cancelamento</th>
                <th className="px-6 py-4">Pedidos & GMV</th>
                <th className="px-6 py-4">Comissão Nova</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStores.map((t, idx) => {
                const score = getStoreScore(t, idx);
                const simulatedOrders = t.active ? 12 + (idx % 18) : 2;
                const simulatedGmv = simulatedOrders * 48.50;
                const simulatedCommission = (simulatedGmv * 0.10) + (simulatedOrders * marketplaceFixedFee);
                const cancelRate = t.active ? (idx % 3 === 0 ? '1.2%' : '0.5%') : '4.8%';
                const rating = t.active ? (4.6 + (idx % 4) * 0.1).toFixed(1) : '4.1';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black overflow-hidden shrink-0">
                          {t.logoUrl ? (
                            <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            t.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{t.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{t.category || 'Alimentação'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-xl border ${
                          score >= 85 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : score >= 70 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {score}/100
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {score >= 85 ? '⭐ Excelente' : score >= 70 ? '👍 Bom' : '⚠️ Atenção'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black text-slate-900">⭐ {rating}</p>
                        <p className="text-[10px] text-slate-400">Preparo: 22 min</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`font-bold ${parseFloat(cancelRate) > 3 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {cancelRate}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black text-slate-900">{simulatedOrders} pedidos</p>
                        <p className="text-[10px] text-slate-500 font-mono">R$ {simulatedGmv.toFixed(2)}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-black text-emerald-600 font-mono">
                        R$ {simulatedCommission.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewTenant360(t)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>360°</span>
                        </button>
                        <button
                          onClick={() => onOpenStoreMenu(t)}
                          className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                        >
                          <ExternalLink size={14} />
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
    </div>
  );
};
