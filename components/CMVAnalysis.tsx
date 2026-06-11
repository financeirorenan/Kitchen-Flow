
import React, { useState, useEffect, useMemo, memo } from 'react';
import { Product, RawMaterial, TechnicalSheetItem } from '../types';
import { analyzeCMV } from '../services/gemini';
import { 
  BrainCircuit, Sparkles, TrendingUp, DollarSign, 
  ArrowRight, AlertCircle, CheckCircle2, RefreshCw,
  Zap, Info, Calculator, Percent, Loader2, Search, Brain,
  Save, Check, Plus, Trash2, Edit3, ChevronRight, BookOpen, Download,
  Scale, Package, BarChart3 as BarChartIcon, Pizza
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

const CMVAnalysis: React.FC<CMVAnalysisProps> = memo(({ products, rawMaterials, onUpdateProduct }) => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);
  const [editingSheetProduct, setEditingSheetProduct] = useState<Product | null>(null);
  const [view, setView] = useState<'dashboard' | 'assistant' | 'reports' | 'pizza'>('dashboard');

  // Target profit margin state
  const [targetMargins, setTargetMargins] = useState<{
    default: number;
    categories: Record<string, number>;
    products: Record<string, number>;
  }>(() => {
    const saved = localStorage.getItem('kf_target_margins');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved target margins:", e);
      }
    }
    return {
      default: 60,
      categories: {
        'Bebidas': 40,
        'Drinks': 40,
        'Cervejas': 40,
        'Sucos': 55
      },
      products: {}
    };
  });

  useEffect(() => {
    localStorage.setItem('kf_target_margins', JSON.stringify(targetMargins));
  }, [targetMargins]);

  const calculateProductCost = (product: Product) => {
    if (!product.technicalSheet || product.technicalSheet.length === 0) return product.cost;
    return product.technicalSheet.reduce((total, item) => {
      const material = rawMaterials.find(rm => rm.id === item.rawMaterialId);
      return total + (material ? material.costPerUnit * item.quantity : 0);
    }, 0);
  };

  const getProductTargetMargin = (product: Product) => {
    const cat = product.category || 'Geral';
    const productOverride = targetMargins.products[product.id] || targetMargins.products[product.name];
    if (productOverride !== undefined) return productOverride;
    
    const categoryOverride = targetMargins.categories[cat];
    if (categoryOverride !== undefined) return categoryOverride;
    
    return targetMargins.default;
  };

  // Pizza simulation states
  const [pizzaSabor1, setPizzaSabor1] = useState<Product | null>(null);
  const [pizzaSabor2, setPizzaSabor2] = useState<Product | null>(null);
  const [pizzaPricingRule, setPizzaPricingRule] = useState<'highest' | 'average' | 'proportional'>('highest');
  const [pizzaBaseCost, setPizzaBaseCost] = useState<number>(4.50);
  const [simulatedPizzas, setSimulatedPizzas] = useState<Array<{
    id: string;
    name1: string;
    name2: string;
    cost: number;
    price: number;
    cmv: number;
    profit: number;
    rule: string;
  }>>(() => {
    const saved = localStorage.getItem('kf_simulated_pizzas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing simulated pizzas:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('kf_simulated_pizzas', JSON.stringify(simulatedPizzas));
  }, [simulatedPizzas]);

  const samplePizzaFlavors: Product[] = useMemo(() => [
    {
      id: "pz-marguerita",
      tenantId: "",
      name: "Pizza Marguerita Especial",
      category: "Pizza",
      price: 48.00,
      cost: 11.50,
      stock: 100,
      minStock: 10,
      unit: "un"
    },
    {
      id: "pz-calabresa",
      tenantId: "",
      name: "Pizza de Calabresa Defumada",
      category: "Pizza",
      price: 49.90,
      cost: 13.20,
      stock: 100,
      minStock: 10,
      unit: "un"
    },
    {
      id: "pz-quatroqueijos",
      tenantId: "",
      name: "Pizza Quatro Queijos Gourmet",
      category: "Pizza",
      price: 58.00,
      cost: 21.80,
      stock: 100,
      minStock: 10,
      unit: "un"
    },
    {
      id: "pz-portuguesa",
      tenantId: "",
      name: "Pizza Portuguesa Tradicional",
      category: "Pizza",
      price: 52.00,
      cost: 16.50,
      stock: 100,
      minStock: 10,
      unit: "un"
    },
    {
      id: "pz-camarao",
      tenantId: "",
      name: "Pizza de Camarão com Catupiry",
      category: "Pizza",
      price: 79.90,
      cost: 32.40,
      stock: 100,
      minStock: 10,
      unit: "un"
    }
  ], []);

  const combinedPizzaProducts = useMemo(() => {
    const dbPizzas = products.filter(p => 
      (p.category || '').toLowerCase().includes('pizza') || 
      p.name.toLowerCase().includes('pizza')
    );
    const all = [...dbPizzas];
    samplePizzaFlavors.forEach(sample => {
      if (!all.some(p => p.name.toLowerCase() === sample.name.toLowerCase())) {
        all.push(sample);
      }
    });
    return all;
  }, [products, samplePizzaFlavors]);

  // Set default selected pizzas once the combined list loads
  useEffect(() => {
    if (combinedPizzaProducts.length >= 2 && !pizzaSabor1 && !pizzaSabor2) {
      setPizzaSabor1(combinedPizzaProducts[0]);
      setPizzaSabor2(combinedPizzaProducts[1]);
    }
  }, [combinedPizzaProducts]);

  // Calculation details for active simulation
  const calcActivePizza = useMemo(() => {
    if (!pizzaSabor1 || !pizzaSabor2) return null;

    const cost1 = calculateProductCost(pizzaSabor1);
    const cost2 = calculateProductCost(pizzaSabor2);
    
    const price1 = pizzaSabor1.price;
    const price2 = pizzaSabor2.price;

    const toppingCost1 = cost1 * 0.5;
    const toppingCost2 = cost2 * 0.5;
    
    // Total combined cost is 50% of flavor 1 toppings cost + 50% of flavor 2 toppings cost + specified base cost (dough, box, gas, sauce)
    const totalCost = toppingCost1 + toppingCost2 + pizzaBaseCost;

    let totalPrice = 0;
    if (pizzaPricingRule === 'highest') {
      totalPrice = Math.max(price1, price2);
    } else if (pizzaPricingRule === 'average') {
      totalPrice = (price1 + price2) / 2;
    } else {
      // Proportional or list price average
      totalPrice = (price1 + price2) / 2;
    }

    const netProfit = totalPrice - totalCost;
    const realizedCMV = totalPrice > 0 ? (totalCost / totalPrice) * 100 : 0;
    const realizedMargin = totalPrice > 0 ? (netProfit / totalPrice) * 100 : 0;

    const target1 = getProductTargetMargin(pizzaSabor1);
    const target2 = getProductTargetMargin(pizzaSabor2);
    const averageTargetMargin = (target1 + target2) / 2;
    const targetCMV = 100 - averageTargetMargin;

    return {
      cost1,
      cost2,
      price1,
      price2,
      toppingCost1,
      toppingCost2,
      totalCost,
      totalPrice,
      netProfit,
      realizedCMV,
      realizedMargin,
      averageTargetMargin,
      targetCMV
    };
  }, [pizzaSabor1, pizzaSabor2, pizzaPricingRule, pizzaBaseCost, targetMargins]);

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
      
      const targetMargin = getProductTargetMargin(p);
      const targetCMV = 100 - targetMargin;

      if (cmv > targetCMV) critical++;
      else if (cmv > targetCMV - 3) warning++;
      else healthy++;
    });

    return { healthy, critical, warning, total, avgCMV: totalCMV / total };
  }, [products, rawMaterials, targetMargins]);

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
      const data = await analyzeCMV(productsWithCalculatedCosts, targetMargins);
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
        <button 
          onClick={() => setView('pizza')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'pizza' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Pizza size={14} /> Pizzas Meio-a-Meio
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
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Atenção (Próx. Alvo)</p>
                <p className="text-lg font-black text-amber-600">{menuStats.warning}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Crítico (Fora do Alvo)</p>
                <p className="text-lg font-black text-rose-600">{menuStats.critical}</p>
              </div>
            </div>
          </div>

          {/* Top Row: AI Banner & Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Header Banner */}
            <div className="lg:col-span-2 bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div className="absolute top-0 right-0 p-6 opacity-10 animate-pulse">
                <BrainCircuit size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-md border border-white/20">
                    <Sparkles size={18} className="text-amber-300" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">GastroAI Intelligence</span>
                </div>
                <h2 className="text-2xl font-black mb-1.5 tracking-tighter">Otimização de CMV & Margens</h2>
                <p className="text-indigo-100 text-xs leading-relaxed font-semibold max-w-xl">
                  Nossa inteligência sugere ajustes estratégicos de preços baseados em suas fichas técnicas de estoque e no percentual de margem de lucro que você deseja receber por produto ou categoria.
                </p>
              </div>
              <div className="relative z-10 mt-4">
                <button 
                  onClick={runAnalysis}
                  disabled={loading}
                  className="bg-white text-indigo-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-2xl disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" className="text-amber-500" />}
                  {loading ? 'Processando...' : 'Atualizar Análise'}
                </button>
              </div>
            </div>

            {/* Configuração de Margem Desejada Card */}
            <div className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Percent size={14} className="text-indigo-600" /> Margens Desejadas
                  </h3>
                  <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">Metas</span>
                </div>

                {/* General Margin Input */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/80 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black text-slate-700">
                      Margem de Lucro Geral
                    </label>
                    <div className="relative w-20">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={targetMargins.default}
                        onChange={(e) => {
                          const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 0));
                          setTargetMargins(prev => ({ ...prev, default: val }));
                        }}
                        className="w-full pr-5 pl-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-black text-right text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 select-none">%</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">
                    Equivale a CMV de {100 - targetMargins.default}%. Alterável por categoria abaixo.
                  </p>
                </div>

                {/* Custom Margins by Category */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Por Categoria</span>
                    <span className="text-[8px] font-bold text-slate-400 italic">Bebidas e drinks têm lucro menor</span>
                  </div>
                  
                  <div className="space-y-1 max-h-[110px] overflow-y-auto custom-scrollbar pr-0.5">
                    {(() => {
                      const productCategories = Array.from(new Set(products.map(p => p.category || 'Geral'))).filter(Boolean);
                      if (productCategories.length === 0) {
                        return <p className="text-[9px] text-slate-400 italic">Sem categorias.</p>;
                      }
                      return productCategories.map(cat => {
                        const currentVal = targetMargins.categories[cat] !== undefined ? targetMargins.categories[cat] : '';
                        return (
                          <div key={cat} className="flex items-center justify-between py-1 px-2 bg-slate-50/40 border border-slate-100 rounded-lg hover:border-slate-200 transition-all gap-3">
                            <span className="text-[10px] font-black text-slate-600 truncate max-w-[130px]">{cat}</span>
                            <div className="flex items-center shrink-0">
                              <div className="relative w-14">
                                <input
                                  type="number"
                                  placeholder={`${targetMargins.default}`}
                                  min="1"
                                  max="99"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const valStr = e.target.value;
                                    setTargetMargins(prev => {
                                      const newCats = { ...prev.categories };
                                      if (valStr === '') {
                                        delete newCats[cat];
                                      } else {
                                        newCats[cat] = Math.min(99, Math.max(1, parseInt(valStr) || 0));
                                      }
                                      return { ...prev, categories: newCats };
                                    });
                                  }}
                                  className="w-full pl-1 pr-3.5 py-0 bg-white border border-slate-150 rounded text-[10px] font-black text-right text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400 select-none">%</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <button
                onClick={runAnalysis}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest py-2 rounded-xl shadow border-b-2 border-indigo-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:translate-y-[1px] active:border-b-0 shrink-0"
              >
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                {loading ? "Calculando..." : "Salvar e Recalcular"}
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
                     O KitchenFlow AI está cruzando suas fichas técnicas com os custos atuais de estoque para gerar sugestões de lucro.
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
                
                const targetMargin = getProductTargetMargin(product);
                const targetCMV = 100 - targetMargin;
                const isCritical = currentCMV > targetCMV;
                const idealPrice = calculatedCost / (1 - targetMargin / 100);
                const isApplied = appliedProducts.includes(res.productName);
                
                return (
                  <div key={idx} className={`bg-white rounded-2xl border-2 shadow-sm flex flex-col group hover:shadow-xl transition-all duration-300 ${isApplied ? 'border-emerald-200 bg-emerald-50/10' : isCritical ? 'border-rose-100 bg-rose-50/5' : 'border-slate-100 hover:border-indigo-200'}`}>
                    <div className="p-4 space-y-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h4 className="font-black text-base text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors truncate max-w-[190px]">{res.productName}</h4>
                          <span className="inline-block text-[8px] font-black tracking-widest uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md">
                            {product.category || 'Geral'} • {targetMargin}% Lucro Desejado
                          </span>
                        </div>
                        {isApplied ? (
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg animate-in zoom-in">
                            <Check size={16} />
                          </div>
                        ) : isCritical ? (
                          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg animate-pulse" title="Margem abaixo do alvo">
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
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5" title="CMV Real / CMV Alvo">CMV Real / Alvo</p>
                          <div className="flex items-center gap-1">
                            <Percent size={12} className={isCritical ? 'text-rose-500' : 'text-emerald-500'} />
                            <span className={`text-xs font-black ${isCritical ? 'text-rose-600' : 'text-slate-700'}`}>
                              {currentCMV.toFixed(1)}% / {targetCMV.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Preço Ideal</p>
                          <div className="flex items-center gap-1">
                            <DollarSign size={12} className="text-emerald-600" />
                            <span className="text-xs font-black text-emerald-600">
                              R$ {idealPrice > 0 && isFinite(idealPrice) ? idealPrice.toFixed(2) : '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] font-black text-indigo-500 uppercase">Preço Recomendado (IA)</p>
                          <p className="text-lg font-black text-indigo-600">R$ {res.newPrice.toFixed(2)}</p>
                        </div>
                        <span className="text-[8px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">Sugerido</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/50 border-t rounded-b-2xl flex items-center justify-between group-hover:bg-indigo-50/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Preço Atual / Custo</p>
                        <p className="text-xs font-black text-slate-700">
                          R$ {product.price.toFixed(2)} / R$ {calculatedCost.toFixed(2)}
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
                  const cmv = p.price > 0 ? (cost / p.price) * 100 : 0;
                  return (
                    <button 
                      key={p.id}
                      onClick={() => setEditingSheetProduct(p)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between group ${editingSheetProduct?.id === p.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white hover:border-indigo-200 text-slate-800'}`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-black text-sm tracking-tight">{p.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${editingSheetProduct?.id === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          CMV: {(cmv || 0).toFixed(1)}%
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
                  const cmvA = a.price > 0 ? (calculateProductCost(a) / a.price) * 100 : 0;
                  const cmvB = b.price > 0 ? (calculateProductCost(b) / b.price) * 100 : 0;
                  return cmvB - cmvA;
                }).map(p => {
                  const cost = calculateProductCost(p);
                  const cmv = p.price > 0 ? (cost / p.price) * 100 : 0;
                  const profit = (p.price || 0) - cost;
                  
                  const targetMargin = getProductTargetMargin(p);
                  const targetCMV = 100 - targetMargin;
                  const isCritical = cmv > targetCMV;
                  const isWarning = cmv > targetCMV - 3 && cmv <= targetCMV;

                  return (
                    <div key={p.id} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2">
                           <h4 className="font-black text-slate-800 truncate">{p.name}</h4>
                           <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isCritical ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                             {isCritical ? 'Crítico' : isWarning ? 'Atenção' : 'Saudável'}
                           </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.category || 'Geral'} • Meta: {targetMargin}% Lucro (Alvo CMV: {targetCMV}%)</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 w-full md:w-auto shrink-0">
                        <div className="text-center md:text-right">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Preço</p>
                           <p className="text-sm font-black text-slate-800">R$ {(p.price || 0).toFixed(2)}</p>
                        </div>
                        <div className="text-center md:text-right">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Custo</p>
                           <p className="text-sm font-black text-slate-600">R$ {(cost || 0).toFixed(2)}</p>
                        </div>
                        <div className="text-center md:text-right">
                           <p className="text-[8px] font-black text-slate-400 uppercase">CMV Real / Alvo</p>
                           <p className={`text-sm font-black ${isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                             {(cmv || 0).toFixed(1)}% / {(targetCMV || 0)}%
                           </p>
                        </div>
                      </div>

                      <div className="w-full md:w-32 bg-white p-2 rounded-xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Lucro Bruto</p>
                        <p className="text-sm font-black text-indigo-600">R$ {(profit || 0).toFixed(2)}</p>
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

      {view === 'pizza' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner animate-bounce">
                  <Pizza size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tighter">Precificação Inteligente de Pizzas Meio a Meio</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de CMV e Margem Cruzada em Pizzas de 2 Sabores</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-3 max-w-sm text-xs text-amber-800 font-medium">
                🔔 O modelo tradicional do mercado brasileiro cobra o valor da <span className="font-extrabold">pizza mais cara</span> para proteger o CMV de desequilíbrios. Use este simulador para testar cenários.
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Parâmetros de Simulação - 5 cols */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/80 space-y-4 font-sans">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b pb-2">Seleção de Sabores</h4>
                  
                  {/* Sabor 1 Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Sabor 1 (Lado A)</label>
                    <select
                      value={pizzaSabor1?.id || ''}
                      onChange={(e) => {
                        const product = combinedPizzaProducts.find(p => p.id === e.target.value);
                        if (product) setPizzaSabor1(product);
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {combinedPizzaProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Venda: R$ {p.price.toFixed(2)} | Custo: R$ {calculateProductCost(p).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sabor 2 Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Sabor 2 (Lado B)</label>
                    <select
                      value={pizzaSabor2?.id || ''}
                      onChange={(e) => {
                        const product = combinedPizzaProducts.find(p => p.id === e.target.value);
                        if (product) setPizzaSabor2(product);
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {combinedPizzaProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Venda: R$ {p.price.toFixed(2)} | Custo: R$ {calculateProductCost(p).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Cost Input */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase" title="Massa, Molho base, Embalagem, Gás e preparação básica">Fórmula Básica (Massa + Caixa)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          value={pizzaBaseCost}
                          onChange={(e) => setPizzaBaseCost(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase">Diferença de Margem</label>
                      <div className="p-2 bg-white rounded-xl border flex items-center justify-center font-bold text-xs text-slate-600 h-[34px]">
                        R$ {Math.abs((pizzaSabor1?.price || 0) - (pizzaSabor2?.price || 0)).toFixed(2)} dif.
                      </div>
                    </div>
                  </div>

                  {/* Regra de Preço */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Regra de Venda do Estabelecimento</label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setPizzaPricingRule('highest')}
                        className={`p-3 text-left rounded-xl border-2 transition-all flex items-center justify-between ${pizzaPricingRule === 'highest' ? 'border-indigo-600 bg-indigo-50/20 text-slate-800' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}
                      >
                        <div className="pr-4">
                          <p className="text-xs font-black">Preço do Sabor Mais Caro</p>
                          <p className="text-[9px] font-medium text-slate-400">Padrão nacional. Absorve custos extras do fracionamento.</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${pizzaPricingRule === 'highest' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                          {pizzaPricingRule === 'highest' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setPizzaPricingRule('average')}
                        className={`p-3 text-left rounded-xl border-2 transition-all flex items-center justify-between ${pizzaPricingRule === 'average' ? 'border-indigo-600 bg-indigo-50/20 text-slate-800' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}
                      >
                        <div className="pr-4">
                          <p className="text-xs font-black">Média dos Dois Preços</p>
                          <p className="text-[9px] font-medium text-slate-400">Preço justo. Divide os sabores igualmente (50/50).</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${pizzaPricingRule === 'average' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                          {pizzaPricingRule === 'average' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Gravar em simulações */}
                  {calcActivePizza && (
                    <button
                      onClick={() => {
                        if (!pizzaSabor1 || !pizzaSabor2) return;
                        const newSim = {
                          id: Date.now().toString(),
                          name1: pizzaSabor1.name,
                          name2: pizzaSabor2.name,
                          cost: calcActivePizza.totalCost,
                          price: calcActivePizza.totalPrice,
                          cmv: calcActivePizza.realizedCMV,
                          profit: calcActivePizza.netProfit,
                          rule: pizzaPricingRule === 'highest' ? 'Mais Cara' : 'Média'
                        };
                        setSimulatedPizzas(prev => [newSim, ...prev]);
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Save size={14} /> Gravar Simulação
                    </button>
                  )}
                </div>
              </div>

              {/* Resultados e Visualizador Interativo - 7 cols */}
              <div className="lg:col-span-7 space-y-4">
                {calcActivePizza && pizzaSabor1 && pizzaSabor2 ? (
                  <div className="space-y-6">
                    {/* Visual Pizza Split Row */}
                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                      {/* The Split Circle */}
                      <div className="w-44 h-44 rounded-full relative overflow-hidden shadow-xl flex shrink-0 border-4 border-amber-900/30 bg-orange-100 animate-in zoom-in duration-500">
                        {/* Left Half (Sabor A) */}
                        <div className="absolute inset-y-0 left-0 right-1/2 bg-amber-400/95 flex flex-col items-center justify-center border-r-[3px] border-amber-900/40 p-2 overflow-hidden select-none">
                          <Pizza size={40} className="text-amber-900/20 absolute rotate-[-45deg] scale-150 opacity-40" />
                          <div className="relative text-center z-10">
                            <span className="bg-amber-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Lado A</span>
                            <p className="font-extrabold text-[10px] text-amber-950 mt-1 uppercase leading-tight truncate max-w-[70px]" title={pizzaSabor1.name}>{pizzaSabor1.name.split(' ').slice(1).join(' ') || pizzaSabor1.name}</p>
                            <p className="font-black text-amber-900 text-[11px] mt-0.5">R$ {calcActivePizza.toppingCost1.toFixed(2)}c</p>
                          </div>
                        </div>
                        {/* Right Half (Sabor B) */}
                        <div className="absolute inset-y-0 right-0 left-1/2 bg-yellow-400/90 flex flex-col items-center justify-center p-2 overflow-hidden select-none">
                          <Pizza size={40} className="text-yellow-600/20 absolute rotate-[135deg] scale-150 opacity-40" />
                          <div className="relative text-center z-10">
                            <span className="bg-yellow-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Lado B</span>
                            <p className="font-extrabold text-[10px] text-yellow-950 mt-1 uppercase leading-tight truncate max-w-[70px]" title={pizzaSabor2.name}>{pizzaSabor2.name.split(' ').slice(1).join(' ') || pizzaSabor2.name}</p>
                            <p className="font-black text-yellow-900 text-[11px] mt-0.5">R$ {calcActivePizza.toppingCost2.toFixed(2)}c</p>
                          </div>
                        </div>
                        {/* Center Hub */}
                        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white shadow-2xl flex flex-col items-center justify-center z-20 border-[3px] ${
                          calcActivePizza.realizedCMV > calcActivePizza.targetCMV
                            ? 'border-rose-400'
                            : calcActivePizza.realizedCMV > calcActivePizza.targetCMV - 3
                            ? 'border-amber-400'
                            : 'border-emerald-400'
                        }`}>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">CMV TOTAL</p>
                          <p className={`text-sm font-black tracking-tight leading-none mt-1 ${
                            calcActivePizza.realizedCMV > calcActivePizza.targetCMV ? 'text-rose-600 animate-pulse' : calcActivePizza.realizedCMV > calcActivePizza.targetCMV - 3 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {calcActivePizza.realizedCMV.toFixed(1)}%
                          </p>
                          <span className={`text-[6px] font-black uppercase mt-1 px-1 py-0.5 rounded ${
                            calcActivePizza.realizedCMV > calcActivePizza.targetCMV ? 'bg-rose-100 text-rose-700' : calcActivePizza.realizedCMV > calcActivePizza.targetCMV - 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {calcActivePizza.realizedCMV > calcActivePizza.targetCMV ? 'Estouro' : calcActivePizza.realizedCMV > calcActivePizza.targetCMV - 3 ? 'No Limite' : 'Ótimo'}
                          </span>
                        </div>
                      </div>

                      {/* Side info explaining base dough addition */}
                      <div className="space-y-2 flex-1 font-sans">
                        <h4 className="font-extrabold text-slate-800 text-sm">Composição Básica do Custo</h4>
                        <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                          <div className="flex justify-between">
                            <span>50% Recheio de {pizzaSabor1.name}</span>
                            <span className="font-black text-slate-700">R$ {calcActivePizza.toppingCost1.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>50% Recheio de {pizzaSabor2.name}</span>
                            <span className="font-black text-slate-700">R$ {calcActivePizza.toppingCost2.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Massa Base + Embalagem + Forno</span>
                            <span className="font-black text-slate-700">R$ {pizzaBaseCost.toFixed(2)}</span>
                          </div>
                          <div className="border-t pt-1.5 flex justify-between font-black text-slate-800 text-sm">
                            <span>Custo Produção Integral</span>
                            <span className="text-indigo-600">R$ {calcActivePizza.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Numerical cards bento */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preço Consumidor</span>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-slate-800">R$ {calcActivePizza.totalPrice.toFixed(2)}</span>
                          <span className="text-[8.5px] text-slate-400 font-bold mt-0.5">Regra: {pizzaPricingRule === 'highest' ? 'Mais Cara' : 'Média Cobrada'}</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Custo Combinado</span>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-slate-800">R$ {calcActivePizza.totalCost.toFixed(2)}</span>
                          <span className="text-[8.5px] text-slate-400 font-bold mt-0.5">Toppings + Massa Base</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lucro Líquido</span>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-emerald-600">R$ {calcActivePizza.netProfit.toFixed(2)}</span>
                          <span className="text-[8.5px] text-emerald-500 font-bold mt-0.5">Margem: {calcActivePizza.realizedMargin.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Margem Alvo / Meio</span>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-indigo-600">{calcActivePizza.averageTargetMargin.toFixed(0)}%</span>
                          <span className="text-[8.5px] text-indigo-500 font-bold mt-0.5">CMV Alvo: {calcActivePizza.targetCMV.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* IA Advisor Warning Box */}
                    {calcActivePizza.realizedCMV > calcActivePizza.targetCMV ? (
                      <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-rose-900 font-sans">
                        <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-1">
                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-rose-700">Dissonância de Margem Cruzada (Alerta IA)</p>
                          <p className="font-medium leading-relaxed">
                            A combinação selecionada apresenta um CMV de <span className="font-bold">{calcActivePizza.realizedCMV.toFixed(1)}%</span>, o que ultrapassa o limite saudável recomendado ({calcActivePizza.targetCMV.toFixed(0)}%). Isso ocorre porque os insumos de recheio do sabor <span className="font-bold">"{calcActivePizza.cost1 > calcActivePizza.cost2 ? pizzaSabor1.name : pizzaSabor2.name}"</span> são significativamente mais caros.
                          </p>
                          {pizzaPricingRule === 'average' && (
                            <p className="font-bold text-rose-900 border-t border-rose-100/30 pt-1.5 mt-1.5 flex items-center gap-1.5">
                              🚀 Solução Recomendada: Mude a regra de cobrança para "Preço da Mais Cara" ou reajuste o preço base do sabor mais caro para R$ { (calcActivePizza.totalCost / (1 - calcActivePizza.averageTargetMargin / 100)).toFixed(2) } para recuperar a margem de contribuição.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 font-sans">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-700">Equilíbrio Saudável de Margem (Aprovado IA)</p>
                          <p className="font-medium leading-relaxed">
                            Excelente! Esta combinação de sabores resulta em um CMV operacional de <span className="font-bold">{calcActivePizza.realizedCMV.toFixed(1)}%</span>, dentro da meta de rentabilidade estabelecida do estabelecimento. O lucro de <span className="font-bold">R$ {calcActivePizza.netProfit.toFixed(2)}</span> por unidade cobrada protege a operação gastronômica de vazamento de margem comum em pizzarias fracionadas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Pizza size={40} className="text-slate-350 animate-bounce" />
                    <p className="text-sm font-bold text-slate-400 mt-2">Escolha dois sabores no menu ao lado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Simulated History list */}
            {simulatedPizzas.length > 0 && (
              <div className="mt-8 border-t pt-6 space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">Simulações Recentes e Resultados</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tabela comparativa de cenários gravados pelo gestor</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Deseja limpar todo o histórico de testes?")) {
                        setSimulatedPizzas([]);
                      }
                    }}
                    className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all"
                  >
                    Limpar Histórico
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[9px] tracking-widest">
                        <th className="p-3">Sabor Lado A</th>
                        <th className="p-3">Sabor Lado B</th>
                        <th className="p-3 text-center">Precificação</th>
                        <th className="p-3 text-right">Preço Final</th>
                        <th className="p-3 text-right">Custo Total</th>
                        <th className="p-3 text-center">CMV Real</th>
                        <th className="p-3 text-right">Lucro Bruto</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {simulatedPizzas.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-800">{s.name1}</td>
                          <td className="p-3 font-bold text-slate-800">{s.name2}</td>
                          <td className="p-3 text-center">
                            <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100/30 uppercase">
                              {s.rule}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-slate-800 font-mono">R$ {s.price.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-slate-500 font-mono">R$ {s.cost.toFixed(2)}</td>
                          <td className="p-3 text-center font-black">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${s.cmv > 35 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {s.cmv.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-indigo-600 font-mono">R$ {s.profit.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setSimulatedPizzas(prev => prev.filter(x => x.id !== s.id))}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
});

export default CMVAnalysis;
