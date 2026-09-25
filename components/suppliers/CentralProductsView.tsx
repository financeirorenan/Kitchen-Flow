import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowUpDown, 
  Building2, 
  MapPin, 
  Clock, 
  DollarSign, 
  Layers, 
  Send, 
  Plus,
  Scale
} from 'lucide-react';
import { B2BCentralProduct, B2BSupplier } from './types';
import { SUPPLIER_CATEGORIES } from './defaultSuppliersData';

interface CentralProductsViewProps {
  products: B2BCentralProduct[];
  suppliers: B2BSupplier[];
  onCompareProduct: (productId: string, productName: string) => void;
  onRequestQuote: (productId: string) => void;
  onSelectSupplier: (supplier: B2BSupplier) => void;
}

export const CentralProductsView: React.FC<CentralProductsViewProps> = ({
  products,
  suppliers,
  onCompareProduct,
  onRequestQuote,
  onSelectSupplier
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Build a mapped structure: each product -> array of supplier offerings
  const productOfferings = useMemo(() => {
    return products.map(prod => {
      // Find all suppliers offering this product or matching name
      const offerings: {
        supplier: B2BSupplier;
        price: number;
        unit: string;
        lastUpdated: string;
        availability: string;
      }[] = [];

      suppliers.forEach(sup => {
        const item = sup.products.find(
          p => p.productId === prod.id || 
               p.productName.toLowerCase().trim() === prod.name.toLowerCase().trim() ||
               prod.name.toLowerCase().includes(p.productName.toLowerCase()) ||
               p.productName.toLowerCase().includes(prod.name.toLowerCase())
        );

        if (item) {
          offerings.push({
            supplier: sup,
            price: item.price,
            unit: item.unit,
            lastUpdated: item.lastUpdated,
            availability: item.availability
          });
        }
      });

      // Sort offerings by price ascending
      offerings.sort((a, b) => a.price - b.price);

      const prices = offerings.map(o => o.price);
      const minPrice = prices.length ? Math.min(...prices) : prod.minPrice || 0;
      const maxPrice = prices.length ? Math.max(...prices) : prod.maxPrice || 0;
      const avgPrice = prices.length 
        ? prices.reduce((a, b) => a + b, 0) / prices.length 
        : prod.averageMarketPrice || 0;

      return {
        ...prod,
        offerings,
        computedMinPrice: minPrice,
        computedMaxPrice: maxPrice,
        computedAvgPrice: avgPrice
      };
    });
  }, [products, suppliers]);

  const filteredProducts = useMemo(() => {
    return productOfferings.filter(prod => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prod.tags && prod.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        prod.offerings.some(o => o.supplier.tradeName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'Todas' || prod.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [productOfferings, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header and Filter bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package size={18} className="text-emerald-600" />
            Catálogo Central de Insumos & Matriz de Fornecedores
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Cada insumo é compartilhado entre distribuidores. Compare os preços praticados por cada empresa.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shrink-0 ${
              selectedCategory === 'Todas'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas as Categorias
          </button>
          {['Carnes', 'Frangos', 'Laticínios', 'Hortifruti', 'Bebidas', 'Embalagens', 'Produtos de limpeza'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredProducts.map(prod => (
          <div 
            key={prod.id} 
            className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Product Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mb-1">
                    {prod.category}
                  </span>
                  <h4 className="text-base font-black text-slate-800 tracking-tight">
                    {prod.name}
                  </h4>
                  {prod.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                      {prod.description}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Unidade</span>
                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {prod.unit}
                  </span>
                </div>
              </div>

              {/* Price Range Stats */}
              <div className="grid grid-cols-3 gap-2 my-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-150 text-center text-xs">
                <div>
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block">Menor Preço</span>
                  <span className="font-black text-emerald-700 text-sm mt-0.5 block">
                    R$ {prod.computedMinPrice.toFixed(2)}
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Preço Médio</span>
                  <span className="font-black text-slate-800 text-sm mt-0.5 block">
                    R$ {prod.computedAvgPrice.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-rose-700 uppercase tracking-wider block">Maior Preço</span>
                  <span className="font-black text-rose-700 text-sm mt-0.5 block">
                    R$ {prod.computedMaxPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Suppliers List for this product */}
              <div className="space-y-2 mt-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Fornecedores Cadastrados ({prod.offerings.length})
                </span>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {prod.offerings.map((offering, idx) => (
                    <div 
                      key={offering.supplier.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        idx === 0 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSelectSupplier(offering.supplier)}
                            className="font-bold text-xs text-slate-800 hover:text-emerald-700 hover:underline truncate text-left"
                          >
                            {offering.supplier.tradeName}
                          </button>
                          {idx === 0 && (
                            <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md">
                              Menor Preço
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                          {offering.supplier.city} • Pedido Mín: R$ {offering.supplier.minOrderValue} • Prazo: {offering.supplier.avgDeliveryDays}d
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-xs text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 block">
                          R$ {offering.price.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/{prod.unit}</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                          Atz: {offering.lastUpdated}
                        </span>
                      </div>
                    </div>
                  ))}

                  {prod.offerings.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs font-semibold">
                      Nenhum fornecedor cadastrado para este produto ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Action footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => onCompareProduct(prod.id, prod.name)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Scale size={13} /> Comparador de Preços
              </button>

              <button
                onClick={() => onRequestQuote(prod.id)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Send size={13} /> Solicitar Cotação
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
