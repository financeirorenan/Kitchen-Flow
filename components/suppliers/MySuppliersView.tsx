import React, { useState } from 'react';
import { 
  Star, 
  Building2, 
  MapPin, 
  ShoppingCart, 
  TrendingDown, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  Plus,
  Percent,
  Sparkles
} from 'lucide-react';
import { RestaurantSupplierRelationship, B2BSupplier } from './types';

interface MySuppliersViewProps {
  relationships: RestaurantSupplierRelationship[];
  suppliers: B2BSupplier[];
  onSelectSupplier: (supplier: B2BSupplier) => void;
  onToggleFavorite: (relationshipId: string) => void;
  onRequestQuoteWithSupplier: (supplier: B2BSupplier) => void;
}

export const MySuppliersView: React.FC<MySuppliersViewProps> = ({
  relationships,
  suppliers,
  onSelectSupplier,
  onToggleFavorite,
  onRequestQuoteWithSupplier
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'negotiated'>('all');

  const filtered = relationships.filter(rel => {
    if (activeFilter === 'favorites') return rel.isFavorite;
    if (activeFilter === 'negotiated') return rel.negotiatedPrices && rel.negotiatedPrices.length > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Star size={18} className="text-amber-500 fill-amber-400" />
            Meus Fornecedores Homologados & Acordos Comerciais
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Gerencie seus fornecedores parceiros, preços negociados com exclusividade e histórico de compras do restaurante.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos Utilizados ({relationships.length})
          </button>
          <button
            onClick={() => setActiveFilter('favorites')}
            className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
              activeFilter === 'favorites'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Favoritos ({relationships.filter(r => r.isFavorite).length})
          </button>
          <button
            onClick={() => setActiveFilter('negotiated')}
            className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
              activeFilter === 'negotiated'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Com Preços Negociados
          </button>
        </div>
      </div>

      {/* Relationships Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(rel => {
          const sup = suppliers.find(s => s.id === rel.supplierId);
          if (!sup) return null;

          return (
            <div 
              key={rel.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm tracking-tight">
                        {sup.tradeName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-semibold">
                        {sup.city} - {sup.state} • {sup.category}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFavorite(rel.id)}
                    className={`p-2 rounded-xl border transition-all ${
                      rel.isFavorite
                        ? 'bg-amber-50 text-amber-500 border-amber-200'
                        : 'bg-white text-slate-300 border-slate-200 hover:text-amber-500'
                    }`}
                    title={rel.isFavorite ? 'Remover dos Favoritos' : 'Favoritar Fornecedor'}
                  >
                    <Star size={16} className={rel.isFavorite ? 'fill-amber-400' : ''} />
                  </button>
                </div>

                {/* Purchases summary */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-150 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Comprado</span>
                    <span className="font-black text-slate-800 text-sm mt-0.5 block">
                      R$ {rel.totalPurchasedValue.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{rel.ordersCount} pedidos realizados</span>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Última Compra</span>
                    <span className="font-bold text-slate-700 text-xs mt-1 block">
                      {rel.lastPurchaseDate ? new Date(rel.lastPurchaseDate).toLocaleDateString('pt-BR') : 'Nenhuma recente'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Fornecedor homologado</span>
                  </div>
                </div>

                {/* Exclusive Negotiated Prices (Seção 19) */}
                {rel.negotiatedPrices && rel.negotiatedPrices.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Percent size={12} className="text-emerald-600" />
                      Preços Negociados Exclusivos do Restaurante:
                    </span>

                    <div className="space-y-1.5">
                      {rel.negotiatedPrices.map((neg, idx) => (
                        <div key={idx} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-150 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{neg.productName}</span>
                            <span className="text-[10px] text-slate-400 line-through">
                              Tabela: R$ {neg.regularPrice.toFixed(2)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                              R$ {neg.negotiatedPrice.toFixed(2)}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 block mt-0.5">
                              -{neg.discountPercentage.toFixed(1)}% off • Até {neg.validUntil}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rel.commercialAgreementNotes && (
                  <p className="text-[11px] text-slate-500 font-medium italic bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    "{rel.commercialAgreementNotes}"
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectSupplier(sup)}
                  className="text-slate-700 hover:text-emerald-700 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  Ver Ficha Completa <ChevronRight size={13} />
                </button>

                <button
                  onClick={() => onRequestQuoteWithSupplier(sup)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-2xs"
                >
                  Solicitar Cotação
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
