import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Truck, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  ShoppingCart, 
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpDown,
  Building2
} from 'lucide-react';
import { B2BSupplier, B2BCentralProduct } from './types';

interface PriceComparisonViewProps {
  products: B2BCentralProduct[];
  suppliers: B2BSupplier[];
  selectedProductId?: string;
  onSelectSupplier: (supplier: B2BSupplier) => void;
  onCreatePurchaseOrderWithSupplier: (supplier: B2BSupplier, productId: string, price: number, unit: string) => void;
  onRequestQuoteWithSupplier: (supplier: B2BSupplier, productId: string) => void;
}

export const PriceComparisonView: React.FC<PriceComparisonViewProps> = ({
  products,
  suppliers,
  selectedProductId,
  onSelectSupplier,
  onCreatePurchaseOrderWithSupplier,
  onRequestQuoteWithSupplier
}) => {
  const [currentProductId, setCurrentProductId] = useState<string>(
    selectedProductId || (products[0]?.id || 'prod-bife-bovino')
  );

  const [selectedCityRegion, setSelectedCityRegion] = useState<string>('Todas');
  const [sortField, setSortField] = useState<'price' | 'deliveryDays' | 'minOrder'>('price');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Available unique cities from suppliers
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach(s => {
      set.add(s.city);
      s.servedCities.forEach(c => set.add(c));
    });
    return Array.from(set).sort();
  }, [suppliers]);

  const activeProduct = useMemo(() => {
    return products.find(p => p.id === currentProductId) || products[0];
  }, [products, currentProductId]);

  // Table rows: matching suppliers
  const comparisonRows = useMemo(() => {
    if (!activeProduct) return [];

    const rows: {
      supplier: B2BSupplier;
      price: number;
      regionalPriceUsed?: boolean;
      regionName?: string;
      unit: string;
      lastUpdated: string;
      availability: string;
      minOrder: number;
      deliveryDays: number;
      freightType: string;
      deliveryFee: number;
      paymentTerms: string;
      paymentMethods: string[];
    }[] = [];

    suppliers.forEach(sup => {
      // Check city filter
      if (selectedCityRegion !== 'Todas') {
        const matchesCity = 
          sup.city.toLowerCase() === selectedCityRegion.toLowerCase() ||
          sup.servedCities.some(c => c.toLowerCase() === selectedCityRegion.toLowerCase()) ||
          sup.servedRegions.some(r => r.toLowerCase().includes(selectedCityRegion.toLowerCase()));

        if (!matchesCity) return;
      }

      // Check product match
      const item = sup.products.find(
        p => p.productId === activeProduct.id ||
             p.productName.toLowerCase().trim() === activeProduct.name.toLowerCase().trim() ||
             activeProduct.name.toLowerCase().includes(p.productName.toLowerCase()) ||
             p.productName.toLowerCase().includes(activeProduct.name.toLowerCase())
      );

      if (item) {
        // Check if there is a regional price for the selected city
        let finalPrice = item.price;
        let regionalPriceUsed = false;
        let regionName = undefined;

        if (selectedCityRegion !== 'Todas' && item.regionalPrices && item.regionalPrices.length > 0) {
          const matchRp = item.regionalPrices.find(
            rp => rp.region.toLowerCase() === selectedCityRegion.toLowerCase()
          );
          if (matchRp) {
            finalPrice = matchRp.price;
            regionalPriceUsed = true;
            regionName = matchRp.region;
          }
        }

        rows.push({
          supplier: sup,
          price: finalPrice,
          regionalPriceUsed,
          regionName,
          unit: item.unit,
          lastUpdated: item.lastUpdated,
          availability: item.availability,
          minOrder: sup.minOrderValue,
          deliveryDays: sup.avgDeliveryDays,
          freightType: sup.freightType,
          deliveryFee: sup.deliveryFee,
          paymentTerms: sup.paymentTerms,
          paymentMethods: sup.paymentMethods
        });
      }
    });

    // Sorting
    rows.sort((a, b) => {
      let diff = 0;
      if (sortField === 'price') diff = a.price - b.price;
      else if (sortField === 'deliveryDays') diff = a.deliveryDays - b.deliveryDays;
      else if (sortField === 'minOrder') diff = a.minOrder - b.minOrder;
      return sortAsc ? diff : -diff;
    });

    return rows;
  }, [activeProduct, suppliers, selectedCityRegion, sortField, sortAsc]);

  // Find min values for visual badges (without bias)
  const minPriceFound = comparisonRows.length ? Math.min(...comparisonRows.map(r => r.price)) : 0;
  const minDaysFound = comparisonRows.length ? Math.min(...comparisonRows.map(r => r.deliveryDays)) : 0;
  const minOrderFound = comparisonRows.length ? Math.min(...comparisonRows.map(r => r.minOrder)) : 0;

  return (
    <div className="space-y-6">
      {/* Selection Control Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Scale size={20} className="text-emerald-600" />
              Comparador Estratégico de Preços B2B
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Compare todas as ofertas disponíveis no mercado para decidir o melhor custo-benefício para seu restaurante.
            </p>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-150 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-indigo-900 font-bold">
            <Sparkles size={16} className="text-indigo-650 shrink-0" />
            <span>Decisão imparcial: avalie preço, frete, pedido mínimo e prazo de entrega.</span>
          </div>
        </div>

        {/* Selectors Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-150">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              1. Selecionar Produto
            </label>
            <select
              value={currentProductId}
              onChange={(e) => setCurrentProductId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit}) - {p.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              2. Cidade / Praça de Entrega
            </label>
            <select
              value={selectedCityRegion}
              onChange={(e) => setSelectedCityRegion(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Todas">Todas as Cidades e Regiões</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              3. Ordenar Comparação Por
            </label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="price">Menor Preço Unitário</option>
                <option value="deliveryDays">Menor Prazo de Entrega</option>
                <option value="minOrder">Menor Pedido Mínimo</option>
              </select>
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="px-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center text-slate-700 transition-colors"
                title="Alternar ordem ascendente / descendente"
              >
                <ArrowUpDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Product Summary Header */}
      {activeProduct && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
              <Scale size={20} />
            </div>
            <div>
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Produto em Comparação:</span>
              <h4 className="text-base font-black text-emerald-950 tracking-tight">
                {activeProduct.name}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-emerald-900">
            <span>Categoria: <strong>{activeProduct.category}</strong></span>
            <span>Unidade: <strong>{activeProduct.unit}</strong></span>
            <span>Fornecedores Encontrados: <strong>{comparisonRows.length}</strong></span>
          </div>
        </div>
      )}

      {/* Comparison Table as requested in Section 9 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-5">Fornecedor</th>
                <th className="py-4 px-4">Preço Unitário</th>
                <th className="py-4 px-4">Atualização</th>
                <th className="py-4 px-4">Pedido Mínimo</th>
                <th className="py-4 px-4">Prazo Médio</th>
                <th className="py-4 px-4">Frete & Condições</th>
                <th className="py-4 px-4">Pagamento</th>
                <th className="py-4 px-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonRows.map((row) => {
                const isBestPrice = row.price === minPriceFound;
                const isFastestDelivery = row.deliveryDays === minDaysFound;
                const isLowestMinOrder = row.minOrder === minOrderFound;

                return (
                  <tr key={row.supplier.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Fornecedor */}
                    <td className="py-4 px-5 font-bold text-slate-800">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onSelectSupplier(row.supplier)}
                            className="font-black text-slate-900 hover:text-emerald-700 hover:underline text-left block"
                          >
                            {row.supplier.tradeName}
                          </button>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {row.supplier.city} - {row.supplier.state} • {row.supplier.supplierType}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Preço Unitário com badges */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className={`text-base font-black px-2.5 py-1 rounded-xl border block w-fit ${
                          isBestPrice
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          R$ {row.price.toFixed(2)}
                          <span className="text-[10px] font-normal opacity-80">/{row.unit}</span>
                        </span>
                        {isBestPrice && (
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            ★ Menor Preço
                          </span>
                        )}
                        {row.regionalPriceUsed && (
                          <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                            Praça: {row.regionName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Atualização */}
                    <td className="py-4 px-4 font-semibold text-slate-600">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar size={13} className="text-slate-400" />
                        {row.lastUpdated}
                      </div>
                      <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
                        {row.availability === 'available' ? 'Em estoque' : 'Sob encomenda'}
                      </span>
                    </td>

                    {/* Pedido Mínimo */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800 text-xs block">
                        R$ {row.minOrder.toFixed(0)}
                      </span>
                      {isLowestMinOrder && (
                        <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md mt-0.5">
                          Menor Entrada
                        </span>
                      )}
                    </td>

                    {/* Prazo */}
                    <td className="py-4 px-4">
                      <span className="font-black text-indigo-700 text-xs flex items-center gap-1">
                        <Clock size={13} />
                        {row.deliveryDays} {row.deliveryDays === 1 ? 'dia' : 'dias'}
                      </span>
                      {isFastestDelivery && (
                        <span className="inline-block bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md mt-0.5">
                          Mais Rápido
                        </span>
                      )}
                    </td>

                    {/* Frete */}
                    <td className="py-4 px-4 text-xs">
                      <span className="font-bold text-slate-700 block">
                        {row.freightType === 'CIF' ? 'CIF (Grátis)' : row.freightType === 'FREE_ABOVE_MIN' ? 'Grátis no pedido mín' : 'FOB / Sob consulta'}
                      </span>
                      {row.deliveryFee > 0 && (
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          Taxa: R$ {row.deliveryFee.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Pagamento */}
                    <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                      <span>{row.paymentTerms}</span>
                      <span className="block text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                        {row.paymentMethods.join(', ')}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onRequestQuoteWithSupplier(row.supplier, activeProduct.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-colors text-[10px] uppercase tracking-wider"
                          title="Enviar Cotação"
                        >
                          <Send size={13} />
                        </button>

                        <button
                          onClick={() => onCreatePurchaseOrderWithSupplier(row.supplier, activeProduct.id, row.price, row.unit)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-2xs flex items-center gap-1"
                        >
                          <ShoppingCart size={13} /> Pedir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {comparisonRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                    Nenhum fornecedor cadastrado atende aos filtros de produto e praça selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
