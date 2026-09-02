import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  ExternalLink, 
  RefreshCw, 
  Eye, 
  Store, 
  Tag, 
  Truck, 
  Percent, 
  Sparkles, 
  ChevronRight, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Tenant, MarketplaceSettings, MarketplacePromotion } from '../../types';

interface MarketplaceAdminViewProps {
  tenants: Tenant[];
  onViewTenant360: (tenant: Tenant) => void;
  onOpenStoreMenu: (tenant: Tenant) => void;
  marketplaceFixedFee?: number;
}

export const MarketplaceAdminView: React.FC<MarketplaceAdminViewProps> = ({
  tenants,
  onViewTenant360,
  onOpenStoreMenu,
  marketplaceFixedFee = 1.50
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  // Derive unique cities
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    tenants.forEach(t => {
      if (t.address) {
        const parts = t.address.split('-');
        if (parts.length > 1) {
          citySet.add(parts[parts.length - 1].trim());
        }
      }
    });
    return Array.from(citySet);
  }, [tenants]);

  // Operational Simulation metrics based on active stores
  const activeTenants = tenants.filter(t => t.active);
  const inactiveTenants = tenants.filter(t => !t.active);

  const totalOrdersToday = activeTenants.length * 14 + 18;
  const avgTicket = 46.80;
  const totalGmvToday = totalOrdersToday * avgTicket;
  const totalPlatformCommissionToday = totalOrdersToday * marketplaceFixedFee;
  const pendingOrdersCount = 2;
  const cancelledOrdersCount = 1;
  const cancellationRate = ((cancelledOrdersCount / totalOrdersToday) * 100).toFixed(1);

  // Filtered store list
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.ownerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'online' 
        ? t.active 
        : !t.active;

      const matchCity = cityFilter === 'all' 
        ? true 
        : (t.address && t.address.toLowerCase().includes(cityFilter.toLowerCase()));

      return matchSearch && matchStatus && matchCity;
    });
  }, [tenants, searchTerm, statusFilter, cityFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      {/* Top Banner KPI Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-orange-600/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                🍔 Zupi Delivery • Operação B2C
              </span>
              <span className="text-xs font-bold text-orange-200">• Tempo Real</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
              Painel Operacional do Marketplace
            </h2>
            <p className="text-xs md:text-sm text-orange-100 mt-1 max-w-2xl font-medium">
              Acompanhe pedidos ao vivo, faturamento bruto (GMV), comissão retida e saúde das lojas parceiras.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 block">Comissão por Pedido</span>
              <span className="text-xl font-black text-white">R$ {marketplaceFixedFee.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Cards Principais: GMV, Pedidos Hoje, Comissão SaaS e Lojas Online */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GMV Transacionado Hoje</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            R$ {totalGmvToday.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} />
            <span>+14.2% em relação a ontem</span>
          </div>
        </div>

        {/* Pedidos Hoje */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos Entregues Hoje</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalOrdersToday} Pedidos</p>
          <p className="text-xs text-slate-500 font-medium">Ticket Médio: R$ {avgTicket.toFixed(2).replace('.', ',')}</p>
        </div>

        {/* Comissão da Plataforma */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comissão Apurada Hoje</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Percent size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">
            R$ {totalPlatformCommissionToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 font-medium">{totalOrdersToday} transações com split ativo</p>
        </div>

        {/* Lojas Online */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status das Lojas</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Store size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            <span className="text-emerald-600">{activeTenants.length} Online</span>
            <span className="text-slate-300 mx-2">/</span>
            <span className="text-slate-400 text-lg">{inactiveTenants.length} Offline</span>
          </p>
          <p className="text-xs text-slate-500 font-medium">{tenants.length} estabelecimentos cadastrados</p>
        </div>
      </div>

      {/* Operação em Tempo Real & Alertas Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Pedidos Pendentes de Aceitação</h4>
            <p className="text-xl font-black text-amber-950 mt-0.5">{pendingOrdersCount} Pedidos</p>
            <p className="text-[11px] text-amber-700 font-medium">Tempo médio de aceite das lojas: 1m 45s</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-rose-50/80 border border-rose-200/80 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0">
            <XCircle size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">Taxa de Cancelamento</h4>
            <p className="text-xl font-black text-rose-950 mt-0.5">{cancellationRate}% ({cancelledOrdersCount} cancelado)</p>
            <p className="text-[11px] text-rose-700 font-medium">Motivo mais comum: Item indisponível no horário</p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
            <Truck size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Tempo Médio de Entrega</h4>
            <p className="text-xl font-black text-emerald-950 mt-0.5">34 Minutos</p>
            <p className="text-[11px] text-emerald-700 font-medium">Rastreio em tempo real com GPS ativo</p>
          </div>
        </div>
      </div>

      {/* Tabela de Lojas do Marketplace */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Lojas Conectadas no Marketplace</h3>
            <p className="text-xs text-slate-500 font-medium">Gerencie a disponibilidade, comissões e abra a visão 360° de cada estabelecimento.</p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar loja ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all"
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

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Estabelecimento</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Status Marketplace</th>
                <th className="px-6 py-4">Pedidos Hoje</th>
                <th className="px-6 py-4">Comissão Gerada</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTenants.map((t, idx) => {
                const simulatedOrders = t.active ? 8 + (idx % 12) : 0;
                const simulatedCommission = simulatedOrders * marketplaceFixedFee;

                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center font-black overflow-hidden shrink-0">
                          {t.logoUrl ? (
                            <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            t.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{t.ownerId}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                        {t.category || 'Geral'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        t.active 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                        {t.active ? '🟢 ABERTO (ONLINE)' : '🔴 FECHADO'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-black text-slate-900">{simulatedOrders} Pedidos</span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-black text-amber-600 font-mono">
                        R$ {simulatedCommission.toFixed(2).replace('.', ',')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewTenant360(t)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-black text-xs transition-all cursor-pointer flex items-center gap-1"
                          title="Abrir Visão 360°"
                        >
                          <Eye size={13} />
                          <span>Visão 360°</span>
                        </button>

                        <button
                          onClick={() => onOpenStoreMenu(t)}
                          className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                          title="Acessar Cardápio"
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
