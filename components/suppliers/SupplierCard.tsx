import React from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  DollarSign, 
  Truck, 
  ChevronRight, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Package
} from 'lucide-react';
import { B2BSupplier } from './types';

interface SupplierCardProps {
  supplier: B2BSupplier;
  onSelect: (supplier: B2BSupplier) => void;
  onCompareProduct?: (productId: string, productName: string) => void;
  onRequestQuote?: (supplier: B2BSupplier) => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
  supplier,
  onSelect,
  onCompareProduct,
  onRequestQuote
}) => {
  const whatsappUrl = supplier.whatsapp 
    ? `https://wa.me/55${supplier.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, sou do restaurante parceiro do KitchenFlow AI e gostaria de consultar a tabela de preços atualizada.`)}`
    : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-100 bg-linear-to-b from-slate-50/60 to-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-100/80 shadow-xs shrink-0 mt-0.5">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                  {supplier.tradeName}
                </h3>
                {supplier.isPartner && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <Star size={10} className="fill-amber-400 text-amber-500" /> Parceiro Verificado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-semibold line-clamp-1 mt-0.5">
                {supplier.corporateName} • CNPJ: {supplier.cnpj}
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
            supplier.status === 'active' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : supplier.status === 'pending'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              supplier.status === 'active' ? 'bg-emerald-500' : supplier.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            {supplier.status === 'active' ? 'Ativo' : supplier.status === 'pending' ? 'Homologando' : 'Inativo'}
          </span>
        </div>

        {/* Badges row: Category, Type, City */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2.5 py-0.5 rounded-lg">
            {supplier.category}
          </span>
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px] px-2.5 py-0.5 rounded-lg capitalize">
            {supplier.supplierType}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold ml-auto">
            <MapPin size={12} className="text-emerald-600 shrink-0" />
            {supplier.city} - {supplier.state}
          </span>
        </div>
      </div>

      {/* Commercial Highlights Grid */}
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/80 rounded-2xl border border-slate-150/70 text-center">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pedido Mín.</span>
            <span className="text-xs font-black text-slate-800 tracking-tight mt-0.5 block">
              R$ {supplier.minOrderValue.toFixed(0)}
            </span>
          </div>
          <div className="border-x border-slate-200/80">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Prazo Médio</span>
            <span className="text-xs font-black text-indigo-600 tracking-tight mt-0.5 block">
              {supplier.avgDeliveryDays} {supplier.avgDeliveryDays === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Frete</span>
            <span className="text-xs font-black text-emerald-600 tracking-tight mt-0.5 block">
              {supplier.freightType === 'CIF' ? 'Grátis (CIF)' : supplier.freightType === 'FREE_ABOVE_MIN' ? 'Grátis c/ mín' : 'Sob consulta'}
            </span>
          </div>
        </div>

        {/* Featured Products List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Package size={12} className="text-slate-400" />
              Produtos & Preços ({supplier.products.length})
            </span>
            <span className="text-[9px] font-bold text-slate-400">
              Atualizado: {supplier.products[0]?.lastUpdated || 'Recente'}
            </span>
          </div>

          <div className="space-y-1.5">
            {supplier.products.slice(0, 3).map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-150 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-700 truncate">{item.productName}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{item.unit}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.variationPercentage !== undefined && item.variationPercentage !== 0 && (
                    <span className={`inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      item.variationPercentage < 0 
                        ? 'text-emerald-700 bg-emerald-50' 
                        : 'text-rose-700 bg-rose-50'
                    }`}>
                      {item.variationPercentage < 0 ? (
                        <TrendingDown size={10} className="mr-0.5" />
                      ) : (
                        <TrendingUp size={10} className="mr-0.5" />
                      )}
                      {item.variationPercentage > 0 ? `+${item.variationPercentage.toFixed(1)}%` : `${item.variationPercentage.toFixed(1)}%`}
                    </span>
                  )}
                  <span className="font-black text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-100">
                    R$ {item.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {supplier.products.length > 3 && (
              <p className="text-[10px] text-center font-bold text-slate-400 pt-0.5">
                +{supplier.products.length - 3} outros itens disponíveis no catálogo
              </p>
            )}
          </div>
        </div>

        {/* Coverage summary */}
        <div className="text-[10px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex items-center justify-between">
          <span className="flex items-center gap-1.5 truncate">
            <Truck size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">Atende: {supplier.servedCities.slice(0, 3).join(', ')}{supplier.servedCities.length > 3 ? ` e +${supplier.servedCities.length - 3}` : ''}</span>
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0 ml-2">
            {supplier.paymentTerms}
          </span>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 bg-slate-50/90 border-t border-slate-150 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-2xs"
              title="Conversar no WhatsApp"
            >
              <MessageCircle size={15} />
            </a>
          )}
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone.replace(/\D/g, '')}`}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all shadow-2xs"
              title="Ligar para Fornecedor"
            >
              <Phone size={15} />
            </a>
          )}
          {supplier.email && (
            <a
              href={`mailto:${supplier.email}`}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all shadow-2xs"
              title="Enviar E-mail"
            >
              <Mail size={15} />
            </a>
          )}
        </div>

        <button
          onClick={() => onSelect(supplier)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          Ver Ficha Completa <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
