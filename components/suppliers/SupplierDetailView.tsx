import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  DollarSign, 
  Truck, 
  X, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  MessageCircle,
  Globe,
  TrendingDown,
  TrendingUp,
  Package,
  Plus,
  Edit2,
  Calendar,
  Layers,
  History,
  FileText,
  Percent,
  Check,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { B2BSupplier, SupplierProductItem, PriceHistoryEntry } from './types';

interface SupplierDetailViewProps {
  supplier: B2BSupplier;
  allSuppliers?: B2BSupplier[];
  onClose: () => void;
  onUpdatePrice: (supplierId: string, productId: string, newPrice: number, unit: string, notes?: string) => void;
  onAddNewProduct: (supplierId: string, product: Omit<SupplierProductItem, 'id'>) => void;
  onCreateQuotationWithSupplier?: (supplier: B2BSupplier) => void;
  currentUserEmail?: string;
}

export const SupplierDetailView: React.FC<SupplierDetailViewProps> = ({
  supplier,
  allSuppliers = [],
  onClose,
  onUpdatePrice,
  onAddNewProduct,
  onCreateQuotationWithSupplier,
  currentUserEmail = 'gestor@restaurante.com'
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'history' | 'logistics' | 'info'>('products');
  
  // Product selected for graph
  const defaultProduct = supplier.products[0]?.productName || 'Bife Bovino (Alcatra/Contra-filé)';
  const [selectedGraphProduct, setSelectedGraphProduct] = useState<string>(defaultProduct);

  // Modal to update price
  const [showPriceUpdateModal, setShowPriceUpdateModal] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState<SupplierProductItem | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');

  // Modal to add new product
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(supplier.category);
  const [newProdUnit, setNewProdUnit] = useState('KG');
  const [newProdPrice, setNewProdPrice] = useState('');

  // Graph data and KPI calculations for the selected product
  const { chartData, kpiStats } = useMemo(() => {
    const historyPoints = supplier.history[selectedGraphProduct] || [];
    
    // Sort or map history
    const data = historyPoints.map(p => ({
      name: p.date,
      preco: p.price
    }));

    if (data.length === 0 && supplier.products.find(p => p.productName === selectedGraphProduct)) {
      const prod = supplier.products.find(p => p.productName === selectedGraphProduct);
      if (prod) {
        data.push({ name: 'Atual', preco: prod.price });
      }
    }

    const prices = data.map(d => d.preco);
    const current = prices[prices.length - 1] || 0;
    const min = prices.length ? Math.min(...prices) : current;
    const max = prices.length ? Math.max(...prices) : current;
    const avg = prices.length ? prices.reduce((acc, v) => acc + v, 0) / prices.length : current;

    return {
      chartData: data,
      kpiStats: {
        current,
        min,
        max,
        avg
      }
    };
  }, [supplier, selectedGraphProduct]);

  const handleOpenPriceModal = (product: SupplierProductItem) => {
    setUpdatingProduct(product);
    setNewPriceValue(product.price.toString());
    setUpdateNotes('');
    setShowPriceUpdateModal(true);
  };

  const handleSavePriceUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingProduct) return;
    const priceNum = parseFloat(newPriceValue.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) return;

    onUpdatePrice(
      supplier.id, 
      updatingProduct.productId, 
      priceNum, 
      updatingProduct.unit, 
      updateNotes || 'Atualização manual via Ficha do Fornecedor'
    );
    setShowPriceUpdateModal(false);
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newProdPrice.replace(',', '.'));
    if (!newProdName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const todayFormatted = new Intl.DateTimeFormat('pt-BR').format(new Date());

    onAddNewProduct(supplier.id, {
      productId: `prod-custom-${Date.now()}`,
      productName: newProdName.trim(),
      category: newProdCategory,
      unit: newProdUnit,
      price: priceNum,
      lastUpdated: todayFormatted,
      availability: 'available',
      variationPercentage: 0
    });

    setShowAddProductModal(false);
    setNewProdName('');
    setNewProdPrice('');
  };

  const whatsappUrl = supplier.whatsapp 
    ? `https://wa.me/55${supplier.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${supplier.tradeName}, estou entrando em contato pelo KitchenFlow AI para consultar condições comerciais.`)}`
    : null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-150 bg-slate-50 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <Building2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {supplier.tradeName}
                </h2>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  supplier.status === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {supplier.status === 'active' ? 'ATIVO' : 'HOMOLOGAÇÃO'}
                </span>
                {supplier.isPartner && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Star size={11} className="fill-amber-400 text-amber-500" /> Parceiro Estratégico
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {supplier.corporateName} • CNPJ: {supplier.cnpj}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 font-bold flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-600" />
                  {supplier.city} - {supplier.state}
                </span>
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-indigo-600" />
                  {supplier.phone}
                </span>
                {supplier.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-pink-600" />
                    {supplier.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            {onCreateQuotationWithSupplier && (
              <button
                onClick={() => onCreateQuotationWithSupplier(supplier)}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <Send size={14} /> Cotar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Commercial Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-white border-b border-slate-150">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Produtos Cadastrados</span>
            <span className="text-lg font-black text-slate-800 tracking-tight mt-0.5 block">
              {supplier.products.length} itens
            </span>
            <span className="text-[10px] text-slate-500 font-bold">Catálogo ativo</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Última Atualização</span>
            <span className="text-lg font-black text-emerald-700 tracking-tight mt-0.5 block">
              {supplier.products[0]?.lastUpdated || '20/09/2026'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">Vigência recente</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pedido Mínimo</span>
            <span className="text-lg font-black text-slate-800 tracking-tight mt-0.5 block">
              R$ {supplier.minOrderValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">Por entrega</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Prazo Médio</span>
            <span className="text-lg font-black text-indigo-700 tracking-tight mt-0.5 block">
              {supplier.avgDeliveryDays} {supplier.avgDeliveryDays === 1 ? 'dia' : 'dias'}
            </span>
            <span className="text-[10px] text-indigo-600 font-bold">{supplier.paymentTerms}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-150 bg-slate-50/50 flex gap-4">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package size={15} /> Produtos e Preços ({supplier.products.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={15} /> Histórico de Preços
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'logistics'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck size={15} /> Região & Condições Comerciais
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={15} /> Dados Cadastrais
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Tabela de Produtos e Preços Vigentes
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Valores atualizados para compra pelo restaurante no KitchenFlow AI.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Plus size={14} /> Adicionar Produto
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-150">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-3">Unidade</th>
                      <th className="py-3 px-3">Preço Atual</th>
                      <th className="py-3 px-3">Última Atualização</th>
                      <th className="py-3 px-3">Variação</th>
                      <th className="py-3 px-3">Disponibilidade</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplier.products.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div>
                            <span>{item.productName}</span>
                            <span className="block text-[10px] text-slate-400 font-semibold">{item.category}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-150 text-xs">
                            R$ {item.price.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-500 text-[11px]">
                          {item.lastUpdated}
                        </td>
                        <td className="py-3.5 px-3">
                          {item.variationPercentage !== undefined ? (
                            <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-md ${
                              item.variationPercentage < 0
                                ? 'text-emerald-700 bg-emerald-50'
                                : item.variationPercentage > 0
                                ? 'text-rose-700 bg-rose-50'
                                : 'text-slate-500 bg-slate-100'
                            }`}>
                              {item.variationPercentage > 0 ? `+${item.variationPercentage.toFixed(1)}%` : `${item.variationPercentage.toFixed(1)}%`}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-150">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {item.availability === 'available' ? 'Disponível' : item.availability === 'on_demand' ? 'Sob Encomenda' : 'Esgotado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedGraphProduct(item.productName);
                                setActiveTab('history');
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Ver Gráfico de Preços"
                            >
                              <History size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenPriceModal(item)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-[10px] rounded-lg transition-colors border border-slate-200 flex items-center gap-1"
                              title="Registrar Novo Preço"
                            >
                              <Edit2 size={11} /> Atualizar Preço
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Regional Pricing Preview if available */}
              {supplier.products.some(p => p.regionalPrices && p.regionalPrices.length > 0) && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600" /> Preços Diferenciados por Região
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {supplier.products.flatMap(p => 
                      (p.regionalPrices || []).map((rp, idx) => (
                        <div key={`${p.id}-${idx}`} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{p.productName}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{rp.region}</span>
                          </div>
                          <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            R$ {rp.price.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Product selector for history graph */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Selecionar Insumo / Produto
                  </label>
                  <p className="text-xs font-semibold text-slate-600">
                    Acompanhe a curva de preços praticada por {supplier.tradeName}
                  </p>
                </div>

                <select
                  value={selectedGraphProduct}
                  onChange={(e) => setSelectedGraphProduct(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {supplier.products.map(p => (
                    <option key={p.id} value={p.productName}>{p.productName} ({p.unit})</option>
                  ))}
                  {Object.keys(supplier.history)
                    .filter(name => !supplier.products.some(p => p.productName === name))
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>

              {/* 4 KPIs Highlight Boxes requested in section 7 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Preço Atual</span>
                  <span className="text-2xl font-black text-emerald-700 tracking-tight mt-1 block">
                    R$ {kpiStats.current.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">Vigente</span>
                </div>

                <div className="bg-indigo-50/80 border border-indigo-200/80 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Menor Preço</span>
                  <span className="text-2xl font-black text-indigo-700 tracking-tight mt-1 block">
                    R$ {kpiStats.min.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold">Melhor cotação</span>
                </div>

                <div className="bg-rose-50/80 border border-rose-200/80 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block">Maior Preço</span>
                  <span className="text-2xl font-black text-rose-700 tracking-tight mt-1 block">
                    R$ {kpiStats.max.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">Pico no período</span>
                </div>

                <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl text-center">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block">Média Histórica</span>
                  <span className="text-2xl font-black text-amber-800 tracking-tight mt-1 block">
                    R$ {kpiStats.avg.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold">Base ponderada</span>
                </div>
              </div>

              {/* AreaChart */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={15} className="text-emerald-600" />
                      Evolução de Preço: {selectedGraphProduct}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Histórico dos últimos meses registrados no ecossistema
                    </p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSupplierPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: 'none', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontSize: '11px',
                          fontWeight: 700
                        }} 
                        formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Preço']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="preco" 
                        stroke="#059669" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorSupplierPrice)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={15} className="text-emerald-600" />
                  Regiões e Cidades Atendidas
                </h4>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Cidades com Rota Direta:</span>
                  <div className="flex flex-wrap gap-2">
                    {supplier.servedCities.map((city) => (
                      <span key={city} className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-xl">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Macrorregiões:</span>
                  <div className="flex flex-wrap gap-2">
                    {supplier.servedRegions.map((region) => (
                      <span key={region} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-xl">
                        {region}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Distância Máxima de Entrega:</span>
                    <span className="font-black text-slate-800 text-sm mt-0.5 block">
                      {supplier.maxDeliveryDistanceKm ? `${supplier.maxDeliveryDistanceKm} km` : 'Sem limite (Transportadora)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Dias de Entrega na Semana:</span>
                    <span className="font-black text-slate-800 text-sm mt-0.5 block">
                      {supplier.deliveryDays.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={15} className="text-emerald-600" />
                  Condições Comerciais e Pagamento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Formas de Pagamento Aceitas:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {supplier.paymentMethods.map(m => (
                        <span key={m} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 text-[11px]">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Prazos de Faturamento:</span>
                    <span className="font-bold text-slate-800 text-sm mt-1.5 block">
                      {supplier.paymentTerms}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Política de Frete:</span>
                    <span className="font-bold text-slate-800 text-sm mt-1.5 block">
                      {supplier.freightType === 'CIF' ? 'Frete Grátis (CIF incluso no preço)' : supplier.freightType === 'FREE_ABOVE_MIN' ? 'Frete Grátis acima do Pedido Mínimo' : 'FOB (Por conta do cliente)'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Taxa de Entrega Fixa:</span>
                    <span className="font-bold text-slate-800 text-sm mt-1.5 block">
                      {supplier.deliveryFee === 0 ? 'Isento' : `R$ ${supplier.deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {supplier.notes && (
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-150 text-xs">
                    <span className="text-[10px] font-black text-indigo-900 uppercase block mb-1">Observações Comerciais:</span>
                    <p className="text-indigo-850 font-medium leading-relaxed">
                      {supplier.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-600" />
                Ficha Cadastral Completa
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Razão Social:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{supplier.corporateName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Nome Fantasia:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{supplier.tradeName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">CNPJ:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{supplier.cnpj}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Categoria de Atuação:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{supplier.category} ({supplier.supplierType})</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Contato Responsável:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{supplier.contactPerson || 'Departamento Comercial'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Website:</span>
                  {supplier.website ? (
                    <a href={supplier.website} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-0.5">
                      {supplier.website} <Globe size={12} />
                    </a>
                  ) : (
                    <span className="text-slate-400">Não informado</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Endereço Sede / Centro de Distribuição:</span>
                <p className="font-bold text-slate-700">
                  {supplier.street}, {supplier.number} {supplier.complement ? `- ${supplier.complement}` : ''} • Bairro: {supplier.neighborhood}
                </p>
                <p className="text-slate-500 font-semibold mt-0.5">
                  {supplier.city} - {supplier.state} • CEP: {supplier.cep}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Atualizar Preço */}
        {showPriceUpdateModal && updatingProduct && (
          <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Atualizar Preço do Produto
                </h3>
                <button onClick={() => setShowPriceUpdateModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePriceUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Produto</label>
                  <p className="font-black text-slate-800 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {updatingProduct.productName} ({updatingProduct.unit})
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Preço Atual</label>
                  <span className="text-xs font-bold text-slate-500">R$ {updatingProduct.price.toFixed(2)}</span>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Novo Preço (R$)</label>
                  <input
                    type="text"
                    required
                    value={newPriceValue}
                    onChange={(e) => setNewPriceValue(e.target.value)}
                    placeholder="Ex: 34.50"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Motivo / Origem da Atualização</label>
                  <input
                    type="text"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Ex: Reajuste semanal, cotação balcão, promoção temporária"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[10px] text-amber-800 font-semibold">
                  Esta alteração ficará gravada no histórico imutável de preços com data, hora e responsável ({currentUserEmail}).
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPriceUpdateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[11px] shadow-sm"
                  >
                    Gravar Novo Preço
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Adicionar Produto ao Catálogo do Fornecedor */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Adicionar Insumo ao Fornecedor
                </h3>
                <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNewProduct} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Nome do Produto / Insumo</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Ex: Contra-Filé Bife Resfriado"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Categoria</label>
                    <input
                      type="text"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Unidade</label>
                    <select
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="KG">KG (Quilo)</option>
                      <option value="UN">UN (Unidade)</option>
                      <option value="LT">LT (Litro)</option>
                      <option value="CX">CX (Caixa)</option>
                      <option value="FD">FD (Fardo)</option>
                      <option value="GL">GL (Galão)</option>
                      <option value="BD">BD (Balde)</option>
                      <option value="PCT">PCT (Pacote)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Preço Inicial (R$)</label>
                  <input
                    type="text"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="Ex: 28.90"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[11px] shadow-sm"
                  >
                    Salvar Produto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
