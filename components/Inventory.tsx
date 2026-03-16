
import React, { useState, useEffect } from 'react';
import { Product, PriceHistory, RawMaterial } from '../types';
import { CATEGORIES } from '../constants';
import { generateProductImage } from '../services/gemini';
import { 
  Edit3, Package, TrendingUp, AlertCircle, Save, X, 
  Search, Filter, Download, Plus, History, 
  Sparkles, Loader2, Image as ImageIcon, Zap, ChevronDown,
  CheckCircle2, Wand2, Barcode, Scan, ArrowUpRight, ArrowDownRight, 
  Minus, Percent, ClipboardList, Info, Beaker, Scale
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface InventoryProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  onUpdateProduct: (product: Product) => void;
  onUpdateRawMaterial: (material: RawMaterial) => void;
  onAddRawMaterial: (material: Partial<RawMaterial>) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, rawMaterials, onUpdateProduct, onUpdateRawMaterial, onAddRawMaterial }) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'raw-materials'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [missingImagesCount, setMissingImagesCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // Detecta produtos sem imagem real ao carregar
  useEffect(() => {
    const missing = products.filter(p => !p.image || p.image.includes('picsum')).length;
    setMissingImagesCount(missing);
  }, [products]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct({ ...product });
  };

  const handleSave = () => {
    if (editingProduct) {
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
    }
  };

  const handleSaveMaterial = () => {
    if (editingMaterial) {
      onUpdateRawMaterial(editingMaterial);
      setEditingMaterial(null);
    }
  };

  const handleAddMaterial = () => {
    onAddRawMaterial({
      name: 'Novo Insumo',
      unit: 'kg',
      currentStock: 0,
      minStock: 0,
      costPerUnit: 0,
      category: 'Geral'
    });
  };

  const handleGenerateImage = async (product: Product) => {
    setGeneratingId(product.id);
    try {
      const imageUrl = await generateProductImage(product.name, product.category);
      if (imageUrl) {
        onUpdateProduct({ ...product, image: imageUrl });
      }
    } catch (err) {
      console.error("Erro ao gerar imagem individual:", err);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateAllMissingImages = async () => {
    const missing = products.filter(p => !p.image || p.image.includes('picsum'));
    if (missing.length === 0) return;

    setIsGeneratingAll(true);
    for (const product of missing) {
      setGeneratingId(product.id);
      try {
        const imageUrl = await generateProductImage(product.name, product.category);
        if (imageUrl) {
          onUpdateProduct({ ...product, image: imageUrl });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Erro ao gerar imagem para ${product.name}:`, err);
      }
    }
    setGeneratingId(null);
    setIsGeneratingAll(false);
  };

  const handleMockScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const randomBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(13, '0');
      if (editingProduct) {
        setEditingProduct({ ...editingProduct, barcode: randomBarcode });
      }
      setIsScanning(false);
      alert("Código de barras escaneado com sucesso!");
    }, 2000);
  };

  const filteredProducts = products.filter(p => 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm)) &&
    (categoryFilter === 'Todos' || p.category === categoryFilter)
  );

  const lowStockCount = products.filter(p => p.stock < 15).length;
  const lowRawStockCount = rawMaterials.filter(m => m.currentStock < m.minStock).length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
  const totalRawValue = rawMaterials.reduce((acc, m) => acc + (m.currentStock * m.costPerUnit), 0);

  const chartData = editingProduct?.priceHistory?.map(h => ({
    ...h,
    dateFormatted: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  })) || [];

  const sortedHistory = [...(editingProduct?.priceHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      {/* Sub-tabs for Products vs Raw Materials */}
      <div className="flex bg-white p-1 rounded-xl border shadow-sm gap-1">
        <button 
          onClick={() => setActiveSubTab('products')}
          className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Package size={14} /> Produtos
        </button>
        <button 
          onClick={() => setActiveSubTab('raw-materials')}
          className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'raw-materials' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Beaker size={14} /> Insumos
        </button>
      </div>

      {/* Alerta de Imagens Ausentes */}
      {missingImagesCount > 0 && !isGeneratingAll && (
        <div className="bg-indigo-600 rounded-2xl p-2 text-white flex flex-col md:flex-row items-center justify-between gap-2 shadow-xl shadow-indigo-100 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Wand2 size={18} className="text-amber-300 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight">Otimize seu Cardápio Digital</h4>
              <p className="text-indigo-100 text-[10px] font-medium">Detectamos {missingImagesCount} produtos sem fotos reais. A IA pode gerar imagens profissionais agora.</p>
            </div>
          </div>
          <button 
            onClick={handleGenerateAllMissingImages}
            className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
              <Plus size={14} strokeWidth={3} /> Novo Produto
            </button>
          </button>
        </div>
      )}

      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            {activeSubTab === 'products' ? <Package size={16} /> : <Beaker size={16} />}
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{activeSubTab === 'products' ? 'Total de Produtos' : 'Total de Insumos'}</p>
            <p className="text-base font-black text-slate-800">{activeSubTab === 'products' ? products.length : rawMaterials.length}</p>
          </div>
        </div>
        <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <AlertCircle size={16} />
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Estoque Crítico</p>
            <p className="text-base font-black text-rose-600">{activeSubTab === 'products' ? lowStockCount : lowRawStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Valor em Estoque</p>
            <p className="text-base font-black text-slate-800">R$ {(activeSubTab === 'products' ? totalStockValue : totalRawValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters Area */}
      <div className="bg-white p-2 rounded-xl border shadow-sm space-y-1.5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2">
          <div className="flex flex-col sm:flex-row gap-1.5 w-full lg:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input 
                type="text" 
                placeholder={activeSubTab === 'products' ? "Pesquisar produto..." : "Pesquisar insumo..."} 
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-[10px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative min-w-[140px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                <Filter size={10} />
              </div>
              <select 
                className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-[10px] text-slate-700 appearance-none cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="Todos">Todas Categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={10} />
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 w-full sm:w-auto">
            <button 
              onClick={activeSubTab === 'products' ? () => {} : handleAddMaterial}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-3 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              <Plus size={12} strokeWidth={3} /> {activeSubTab === 'products' ? 'Novo Produto' : 'Novo Insumo'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest">{activeSubTab === 'products' ? 'Produto' : 'Insumo'}</th>
                <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest">Categoria</th>
                <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">{activeSubTab === 'products' ? 'Custo' : 'Custo Unit.'}</th>
                {activeSubTab === 'products' && <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">Venda</th>}
                <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-center">Estoque</th>
                <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest">Status</th>
                <th className="px-2 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeSubTab === 'products' ? (
                filteredProducts.length > 0 ? filteredProducts.map(product => {
                  const isGenerating = generatingId === product.id;
                  const hasRealImage = product.image && !product.image.includes('picsum');
                  const isLowStock = product.stock < 15;
                  
                  return (
                    <tr key={product.id} className={`transition-colors group ${isLowStock ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`relative w-7 h-7 rounded-lg overflow-hidden border bg-slate-100 group shadow-sm flex items-center justify-center transition-all ${!hasRealImage && !isGenerating ? 'border-amber-200' : ''}`}>
                            {isGenerating ? (
                              <div className="absolute inset-0 bg-indigo-600 flex flex-col items-center justify-center">
                                 <Loader2 size={10} className="animate-spin text-white" />
                              </div>
                            ) : product.image ? (
                              <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon size={10} />
                              </div>
                            )}
                            
                            {!hasRealImage && !isGenerating && (
                              <button 
                                onClick={() => handleGenerateImage(product)}
                                className="absolute inset-0 bg-indigo-600/90 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all gap-1"
                                title="Gerar imagem com IA"
                              >
                                <Sparkles size={8} />
                              </button>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-[10px]">{product.name}</p>
                            <div className="flex items-center gap-1">
                              <p className="text-[7px] font-bold text-slate-400 uppercase">#{product.id.padStart(4, '0')}</p>
                              {product.barcode && (
                                <p className="text-[7px] font-bold text-indigo-400 uppercase flex items-center gap-1">
                                  <Barcode size={7} /> {product.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-[7px] font-black uppercase tracking-tight bg-slate-100 text-slate-600 px-1 py-0.5 rounded-md border border-slate-200">{product.category}</span>
                      </td>
                      <td className="px-2 py-1 text-right font-bold text-slate-500 text-[10px]">R$ {product.cost.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right font-black text-indigo-600 text-[10px]">R$ {product.price.toFixed(2)}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`font-black text-xs tracking-tighter ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        {isLowStock ? (
                          <div className="flex items-center gap-1 text-rose-600 font-black text-[6px] uppercase tracking-widest bg-rose-100 px-1 py-0.5 rounded-full border border-rose-200 w-fit animate-pulse">
                            <AlertCircle size={8} /> Reposição
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 font-black text-[6px] uppercase tracking-widest bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-100 w-fit">
                            <CheckCircle2 size={8} /> OK
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button 
                          onClick={() => handleEditClick(product)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                        >
                          <Edit3 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 opacity-30 grayscale">
                        <Package size={24} strokeWidth={1} />
                        <p className="font-black uppercase tracking-widest text-[8px]">Nenhum produto</p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                rawMaterials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? 
                rawMaterials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(material => {
                  const isLowStock = material.currentStock < material.minStock;
                  return (
                    <tr key={material.id} className={`transition-colors group ${isLowStock ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Beaker size={14} />
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-[10px]">{material.name}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase">#{material.id.slice(-4)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-[7px] font-black uppercase tracking-tight bg-slate-100 text-slate-600 px-1 py-0.5 rounded-md border border-slate-200">{material.category}</span>
                      </td>
                      <td className="px-2 py-1 text-right font-bold text-slate-500 text-[10px]">R$ {material.costPerUnit.toFixed(2)} / {material.unit}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`font-black text-xs tracking-tighter ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                          {material.currentStock} {material.unit}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        {isLowStock ? (
                          <div className="flex items-center gap-1 text-rose-600 font-black text-[6px] uppercase tracking-widest bg-rose-100 px-1 py-0.5 rounded-full border border-rose-200 w-fit animate-pulse">
                            <AlertCircle size={8} /> Reposição
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 font-black text-[6px] uppercase tracking-widest bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-100 w-fit">
                            <CheckCircle2 size={8} /> OK
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button 
                          onClick={() => setEditingMaterial(material)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                        >
                          <Edit3 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 opacity-30 grayscale">
                        <Beaker size={24} strokeWidth={1} />
                        <p className="font-black uppercase tracking-widest text-[8px]">Nenhum insumo</p>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Beaker size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Editar Insumo</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão de estoque de insumos</p>
                </div>
              </div>
              <button onClick={() => setEditingMaterial(null)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Nome do Insumo</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Unidade</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                    value={editingMaterial.unit}
                    onChange={(e) => setEditingMaterial({...editingMaterial, unit: e.target.value})}
                  >
                    <option value="kg">Quilograma (kg)</option>
                    <option value="g">Grama (g)</option>
                    <option value="l">Litro (l)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="un">Unidade (un)</option>
                    <option value="pct">Pacote (pct)</option>
                    <option value="cx">Caixa (cx)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Categoria</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                    value={editingMaterial.category}
                    onChange={(e) => setEditingMaterial({...editingMaterial, category: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Estoque Atual</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                    value={editingMaterial.currentStock}
                    onChange={(e) => setEditingMaterial({...editingMaterial, currentStock: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Estoque Mínimo</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                    value={editingMaterial.minStock}
                    onChange={(e) => setEditingMaterial({...editingMaterial, minStock: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Custo por Unidade (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                  value={editingMaterial.costPerUnit}
                  onChange={(e) => setEditingMaterial({...editingMaterial, costPerUnit: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50/50 flex gap-2 justify-end">
              <button 
                onClick={() => setEditingMaterial(null)} 
                className="px-4 py-2 rounded-xl font-black text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200 uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveMaterial}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest text-[10px]"
              >
                <Save size={16} /> Salvar Insumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Editar Produto</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão detalhada e histórico de preços</p>
                </div>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <Package size={14} /> Dados Principais
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Nome do Produto</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                          />
                        </div>
                        <div className="w-14 h-14 rounded-xl border bg-slate-100 overflow-hidden relative group flex items-center justify-center">
                           {generatingId === editingProduct.id ? (
                              <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
                                 <Loader2 size={18} className="animate-spin text-white" />
                              </div>
                           ) : editingProduct.image ? (
                             <img src={editingProduct.image} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-300">
                               <ImageIcon size={18} />
                             </div>
                           )}
                           <button 
                            onClick={() => handleGenerateImage(editingProduct)}
                            className="absolute inset-0 bg-indigo-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                           >
                              <Sparkles size={14} />
                           </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Código de Barras (EAN / GTIN)</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              placeholder="Escaneie ou digite o código..."
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-xs"
                              value={editingProduct.barcode || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                            />
                          </div>
                          <button 
                            onClick={handleMockScan}
                            disabled={isScanning}
                            className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center group relative overflow-hidden"
                            title="Simular Escaneamento"
                          >
                            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Scan size={16} />}
                            {isScanning && (
                              <div className="absolute inset-x-0 h-[2px] bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[scan_1s_linear_infinite]"></div>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Custo (R$)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={formatCurrency(editingProduct.cost)}
                            onChange={(e) => setEditingProduct({...editingProduct, cost: parseCurrency(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Venda (R$)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={formatCurrency(editingProduct.price)}
                            onChange={(e) => setEditingProduct({...editingProduct, price: parseCurrency(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Categoria</label>
                           <select 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                              value={editingProduct.category}
                              onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                           >
                              {CATEGORIES.map(cat => (
                                 <option key={cat} value={cat}>{cat}</option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Quantidade em Estoque</label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={editingProduct.stock}
                            onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-5 flex flex-col max-h-[600px]">
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <History size={14} /> Evolução 90 dias (Preço x Custo)
                    </h3>
                    <div className="h-[180px] w-full bg-slate-50 rounded-2xl p-2 border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 'bold', fill: '#94a3b8'}} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                            itemStyle={{fontSize: '10px'}}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                          <Line type="monotone" dataKey="price" name="Venda" stroke="#4f46e5" strokeWidth={2} dot={{r: 3, fill: '#4f46e5', strokeWidth: 1, stroke: '#fff'}} activeDot={{r: 5}} />
                          <Line type="monotone" dataKey="cost" name="Custo" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#fff'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="flex-1 space-y-3 flex flex-col min-h-0">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <ClipboardList size={14} /> Registros de Alteração
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-2xl bg-slate-50/50">
                       <table className="w-full text-left border-collapse">
                          <thead className="bg-white border-b sticky top-0 z-10">
                             <tr>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest">Data</th>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">Custo</th>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">Venda</th>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-center">Margem</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {sortedHistory.map((entry, idx) => {
                                const nextEntry = sortedHistory[idx + 1];
                                const costTrend = nextEntry ? (entry.cost > nextEntry.cost ? 'up' : entry.cost < nextEntry.cost ? 'down' : 'stable') : 'stable';
                                const margin = ((entry.price - entry.cost) / entry.price) * 100;
                                
                                return (
                                   <tr key={idx} className="hover:bg-white transition-colors group">
                                      <td className="px-3 py-2">
                                         <p className="text-[10px] font-bold text-slate-600">{new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                         <div className="flex items-center justify-end gap-1">
                                            <span className="text-[10px] font-black text-slate-700">R$ {entry.cost.toFixed(2)}</span>
                                            {costTrend === 'up' ? <ArrowUpRight size={12} className="text-rose-500" /> : costTrend === 'down' ? <ArrowDownRight size={12} className="text-emerald-500" /> : <Minus size={12} className="text-slate-300" />}
                                         </div>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                         <span className="text-[10px] font-black text-indigo-600">R$ {entry.price.toFixed(2)}</span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                         <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${margin > 50 ? 'bg-emerald-100 text-emerald-700' : margin > 30 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {margin.toFixed(0)}%
                                         </div>
                                      </td>
                                   </tr>
                                );
                             })}
                             {sortedHistory.length === 0 && (
                                <tr>
                                   <td colSpan={4} className="px-3 py-6 text-center opacity-30">
                                      <p className="text-[8px] font-black uppercase tracking-widest">Sem histórico registrado</p>
                                   </td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-2 text-indigo-700 items-start">
                       <Info size={14} className="shrink-0 mt-0.5" />
                       <p className="text-[9px] font-medium leading-tight">O sistema registra automaticamente as variações quando os preços de custo ou venda são atualizados durante o salvamento.</p>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50/50 flex gap-2 justify-end">
              <button 
                onClick={() => setEditingProduct(null)} 
                className="px-4 py-2 rounded-xl font-black text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200 uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest text-[10px]"
              >
                <Save size={16} /> Salvar e Atualizar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
