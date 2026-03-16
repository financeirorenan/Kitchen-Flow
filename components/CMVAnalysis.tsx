
import React, { useState, useEffect, useMemo } from 'react';
import { Product, RawMaterial, TechnicalSheetItem } from '../types';
import { analyzeCMV } from '../services/gemini';
import { 
  BrainCircuit, Sparkles, TrendingUp, DollarSign, 
  ArrowRight, AlertCircle, CheckCircle2, RefreshCw,
  Zap, Info, Calculator, Percent, Loader2, Search, Brain,
  Save, Check, Plus, Trash2, Edit3, ChevronRight, BookOpen, Download,
  Scale, Package, BarChart3 as BarChartIcon
} from 'lucide-react';

interface CMVAnalysisProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  onUpdateProduct: (product: Product) => void;
}

interface AnalysisResult {
  productName: string;
  currentCMV: number;
  suggestion: string;
  newPrice: number;
}

const CMVAnalysis: React.FC<CMVAnalysisProps> = ({ products, rawMaterials, onUpdateProduct }) => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);
  const [editingSheetProduct, setEditingSheetProduct] = useState<Product | null>(null);
  const [view, setView] = useState<'dashboard' | 'assistant' | 'reports'>('dashboard');

  const calculateProductCost = (product: Product) => {
    if (!product.technicalSheet || product.technicalSheet.length === 0) return product.cost;
    return product.technicalSheet.reduce((total, item) => {
      const material = rawMaterials.find(rm => rm.id === item.rawMaterialId);
      return total + (material ? material.costPerUnit * item.quantity : 0);
    }, 0);
  };

  const menuStats = useMemo(() => {
    const total = products.length;
    if (total === 0) return { healthy: 0, critical: 0, warning: 0, total: 0, avgCMV: 0 };
    
    let healthy = 0;
    let critical = 0;
    let warning = 0;
    let totalCMV = 0;

    products.forEach(p => {
      const cost = calculateProductCost(p);
      const cmv = (cost / p.price) * 100;
      totalCMV += cmv;
      if (cmv > 35) critical++;
      else if (cmv > 32) warning++;
      else healthy++;
    });

    return { healthy, critical, warning, total, avgCMV: totalCMV / total };
  }, [products, rawMaterials]);

  const runAnalysis = async () => {
    setLoading(true);
    setLoadingProgress(10);
    setAppliedProducts([]);
    
    // Preparar produtos com custos calculados para a IA
    const productsWithCalculatedCosts = products.map(p => ({
      ...p,
      calculatedCost: calculateProductCost(p),
      cmv: (calculateProductCost(p) / p.price) * 100
    }));

    const interval = setInterval(() => {
       setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
       });
    }, 300);

    try {
      const data = await analyzeCMV(productsWithCalculatedCosts);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const handleApplyAdjustment = (result: AnalysisResult) => {
    const product = products.find(p => p.name === result.productName);
    if (product) {
      const updatedProduct: Product = {
        ...product,
        price: result.newPrice,
        priceHistory: [
          ...(product.priceHistory || []),
          { date: new Date().toISOString().split('T')[0], price: result.newPrice, cost: calculateProductCost(product) }
        ]
      };
      onUpdateProduct(updatedProduct);
      setAppliedProducts(prev => [...prev, result.productName]);
    }
  };

  const handleUpdateTechnicalSheet = (productId: string, sheet: TechnicalSheetItem[]) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedProduct = { ...product, technicalSheet: sheet };
      onUpdateProduct(updatedProduct);
      setEditingSheetProduct(updatedProduct);
    }
  };

  const addIngredient = (rawMaterialId: string) => {
    if (!editingSheetProduct) return;
    const currentSheet = editingSheetProduct.technicalSheet || [];
    if (currentSheet.some(i => i.rawMaterialId === rawMaterialId)) return;
    
    const newSheet = [...currentSheet, { rawMaterialId, quantity: 0 }];
    handleUpdateTechnicalSheet(editingSheetProduct.id, newSheet);
  };

  const removeIngredient = (rawMaterialId: string) => {
    if (!editingSheetProduct) return;
    const newSheet = (editingSheetProduct.technicalSheet || []).filter(i => i.rawMaterialId !== rawMaterialId);
    handleUpdateTechnicalSheet(editingSheetProduct.id, newSheet);
  };

  const updateIngredientQuantity = (rawMaterialId: string, quantity: number) => {
    if (!editingSheetProduct) return;
    const newSheet = (editingSheetProduct.technicalSheet || []).map(i => 
      i.rawMaterialId === rawMaterialId ? { ...i, quantity } : i
    );
    handleUpdateTechnicalSheet(editingSheetProduct.id, newSheet);
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl w-fit border shadow-sm">
        <button 
          onClick={() => setView('dashboard')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp size={14} /> Painel de Lucro
        </button>
        <button 
          onClick={() => setView('assistant')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'assistant' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BookOpen size={14} /> Fichas Técnicas
        </button>
        <button 
          onClick={() => setView('reports')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'reports' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BarChartIcon size={14} /> Relatórios
        </button>
      </div>

      {view === 'dashboard' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Calculator size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Itens</p>
                <p className="text-lg font-black text-slate-800">{menuStats.total}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CMV Saudável</p>
                <p className="text-lg font-black text-emerald-600">{menuStats.healthy}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Atenção (32-35%)</p>
                <p className="text-lg font-black text-amber-600">{menuStats.warning}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Crítico ({'>'}35%)</p>
                <p className="text-lg font-black text-rose-600">{menuStats.critical}</p>
              </div>
            </div>
          </div>

          {/* AI Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 animate-pulse">
              <BrainCircuit size={120} />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-md border border-white/20">
                  <Sparkles size={18} className="text-amber-300" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">GastroAI Intelligence</span>
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tighter">Otimização de CMV & Margens</h2>
              <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                Nossa IA analisa em tempo real a flutuação dos custos de insumos baseada nas suas fichas técnicas e sugere ajustes estratégicos de preços.
              </p>
              <button 
                onClick={runAnalysis}
                disabled={loading}
                className="mt-4 bg-white text-indigo-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-2xl disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                {loading ? 'Sincronizando...' : 'Atualizar Recomendações'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-3xl border shadow-2xl flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500 min-h-[400px]">
               <div className="relative">
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
                     <Brain className="text-indigo-600 animate-bounce" size={36} />
                  </div>
                  <div className="absolute inset-0 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
               </div>
               
               <div className="text-center max-w-sm">
                  <h3 className="text-xl font-black text-slate-800 mb-1">Processando Análise...</h3>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                     O GastroAI está cruzando suas fichas técnicas com os custos atuais de estoque para gerar sugestões de lucro.
                  </p>
               </div>

               <div className="w-full max-w-md space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-indigo-600 tracking-widest">
                     <span>Analisando Insumos</span>
                     <span>{loadingProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border">
                     <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                        style={{ width: `${loadingProgress}%` }}
                     ></div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((res, idx) => {
                const product = products.find(p => p.name === res.productName);
                if (!product) return null;
                const calculatedCost = calculateProductCost(product);
                const currentCMV = (calculatedCost / product.price) * 100;
                const isCritical = currentCMV > 35;
                const isApplied = appliedProducts.includes(res.productName);
                
                return (
                  <div key={idx} className={`bg-white rounded-2xl border-2 shadow-sm flex flex-col group hover:shadow-xl transition-all duration-300 ${isApplied ? 'border-emerald-200 bg-emerald-50/10' : isCritical ? 'border-rose-100' : 'border-slate-100 hover:border-indigo-200'}`}>
                    <div className="p-4 space-y-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h4 className="font-black text-base text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{res.productName}</h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Análise de Performance</p>
                        </div>
                        {isApplied ? (
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg animate-in zoom-in">
                            <Check size={16} />
                          </div>
                        ) : isCritical ? (
                          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg" title="CMV Elevado">
                            <AlertCircle size={16} />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>

                      <div className={`p-3 rounded-xl text-[11px] font-bold leading-relaxed border flex gap-2 ${isCritical ? 'bg-rose-50/50 border-rose-100 text-rose-700' : 'bg-indigo-50/50 border-indigo-100 text-indigo-700'}`}>
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <p>{res.suggestion}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">CMV Real (Ficha)</p>
                          <div className="flex items-center gap-1">
                            <Percent size={12} className={isCritical ? 'text-rose-500' : 'text-slate-400'} />
                            <span className={`text-base font-black ${isCritical ? 'text-rose-600' : 'text-slate-700'}`}>
                              {currentCMV.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Preço Sugerido</p>
                          <div className="flex items-center gap-1">
                            <DollarSign size={12} className="text-indigo-600" />
                            <span className="text-base font-black text-indigo-600">
                              R$ {res.newPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/50 border-t rounded-b-2xl flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Custo Insumos</p>
                        <p className="text-xs font-black text-slate-700">
                          R$ {calculatedCost.toFixed(2)} / un
                        </p>
                      </div>
                      {!isApplied ? (
                        <button 
                          onClick={() => handleApplyAdjustment(res)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center gap-1.5"
                        >
                          <Save size={12} /> Aplicar
                        </button>
                      ) : (
                        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                           Atualizado
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-3xl border shadow-sm space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar produto..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {products.map(p => {
                  const cost = calculateProductCost(p);
                  const cmv = (cost / p.price) * 100;
                  return (
                    <button 
                      key={p.id}
                      onClick={() => setEditingSheetProduct(p)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between group ${editingSheetProduct?.id === p.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white hover:border-indigo-200 text-slate-800'}`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-black text-sm tracking-tight">{p.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${editingSheetProduct?.id === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          CMV: {cmv.toFixed(1)}%
                        </p>
                      </div>
                      <ChevronRight size={16} className={editingSheetProduct?.id === p.id ? 'text-white' : 'text-slate-300'} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Technical Sheet Editor */}
          <div className="lg:col-span-2">
            {editingSheetProduct ? (
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Edit3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tighter">{editingSheetProduct.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ficha Técnica Operacional</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Calculado</p>
                    <p className="text-2xl font-black text-indigo-600 tracking-tighter">R$ {calculateProductCost(editingSheetProduct).toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Ingredients List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Scale size={14} className="text-indigo-500" /> Insumos e Quantidades
                    </h4>
                    
                    <div className="space-y-2">
                      {(editingSheetProduct.technicalSheet || []).map((item, idx) => {
                        const material = rawMaterials.find(rm => rm.id === item.rawMaterialId);
                        if (!material) return null;
                        return (
                          <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-800">{material.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Custo: R$ {material.costPerUnit.toFixed(2)} / {material.unit}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={item.quantity}
                                onChange={(e) => updateIngredientQuantity(item.rawMaterialId, parseFloat(e.target.value) || 0)}
                                className="w-24 px-3 py-1.5 bg-white border rounded-xl text-sm font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                              <span className="text-[10px] font-black text-slate-400 uppercase w-8">{material.unit}</span>
                            </div>
                            <div className="w-24 text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Subtotal</p>
                              <p className="text-sm font-black text-slate-800">R$ {(material.costPerUnit * item.quantity).toFixed(2)}</p>
                            </div>
                            <button 
                              onClick={() => removeIngredient(item.rawMaterialId)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}

                      {(editingSheetProduct.technicalSheet || []).length === 0 && (
                        <div className="p-12 text-center border-2 border-dashed rounded-3xl space-y-2">
                          <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                            <Package size={24} />
                          </div>
                          <p className="text-sm font-bold text-slate-400">Nenhum insumo adicionado a esta ficha técnica.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Ingredient Selector */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Adicionar Insumo</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {rawMaterials.map(rm => (
                        <button 
                          key={rm.id}
                          onClick={() => addIngredient(rm.id)}
                          disabled={(editingSheetProduct.technicalSheet || []).some(i => i.rawMaterialId === rm.id)}
                          className="p-2.5 text-left bg-white border rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-slate-200"
                        >
                          <div className="w-6 h-6 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <Plus size={14} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 truncate">{rm.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <BookOpen size={40} className="text-slate-300" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-800">Selecione um Produto</h3>
                  <p className="text-xs font-bold text-slate-400 max-w-xs">Escolha um item do cardápio ao lado para configurar sua ficha técnica e analisar o CMV real.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tighter">Relatório de Saúde do Cardápio</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visão geral da rentabilidade por categoria</p>
                </div>
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                  title="Imprimir Relatório"
                >
                  <Download size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {products.sort((a, b) => {
                  const cmvA = (calculateProductCost(a) / a.price) * 100;
                  const cmvB = (calculateProductCost(b) / b.price) * 100;
                  return cmvB - cmvA;
                }).map(p => {
                  const cost = calculateProductCost(p);
                  const cmv = (cost / p.price) * 100;
                  const profit = p.price - cost;
                  const isCritical = cmv > 35;
                  const isWarning = cmv > 32;

                  return (
                    <div key={p.id} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-800 truncate">{p.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isCritical ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isCritical ? 'Crítico' : isWarning ? 'Atenção' : 'Saudável'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.category}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 w-full md:w-auto shrink-0">
                        <div className="text-center md:text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Preço</p>
                          <p className="text-sm font-black text-slate-800">R$ {p.price.toFixed(2)}</p>
                        </div>
                        <div className="text-center md:text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Custo</p>
                          <p className="text-sm font-black text-slate-600">R$ {cost.toFixed(2)}</p>
                        </div>
                        <div className="text-center md:text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase">CMV</p>
                          <p className={`text-sm font-black ${isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {cmv.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="w-full md:w-32 bg-white p-2 rounded-xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Lucro Bruto</p>
                        <p className="text-sm font-black text-indigo-600">R$ {profit.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {/* Insights Card */}
              <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={20} className="text-indigo-200" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Insights da IA</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                    <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-1">Oportunidade de Promoção</p>
                    {products.filter(p => (calculateProductCost(p) / p.price) * 100 < 25).slice(0, 1).map(p => (
                      <div key={p.id}>
                        <p className="text-sm font-black">{p.name}</p>
                        <p className="text-[10px] opacity-80 mt-1">Este item tem uma margem excelente ({((1 - calculateProductCost(p)/p.price)*100).toFixed(0)}%). Considere criar um combo para aumentar o ticket médio.</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-rose-500/20 rounded-2xl backdrop-blur-md border border-rose-500/20">
                    <p className="text-[8px] font-black text-rose-200 uppercase tracking-widest mb-1">Alerta de Prejuízo</p>
                    {products.filter(p => (calculateProductCost(p) / p.price) * 100 > 40).slice(0, 1).map(p => (
                      <div key={p.id}>
                        <p className="text-sm font-black">{p.name}</p>
                        <p className="text-[10px] opacity-80 mt-1">CMV crítico de {((calculateProductCost(p)/p.price)*100).toFixed(0)}%. Verifique desperdícios ou reajuste o preço imediatamente.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800">Ações Rápidas</h3>
                <button 
                  onClick={() => setView('assistant')}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <BookOpen size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-700">Revisar Fichas</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <button 
                  onClick={() => setView('dashboard')}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <TrendingUp size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-700">Ver Sugestões IA</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Advice Card */}
      <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-100 shrink-0">
          <Calculator size={32} />
        </div>
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-lg font-black text-indigo-900 tracking-tight">Estratégia de Precificação Inteligente</h4>
          <p className="text-indigo-700/80 font-medium text-xs">
            Lembre-se que o CMV ideal para o setor gira entre <span className="font-black">28% e 32%</span>. 
            Ajustes graduais de até <span className="font-black">5%</span> no cardápio costumam ser bem aceitos pelos clientes se acompanhados de melhorias na experiência.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CMVAnalysis;
