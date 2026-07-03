import React, { useState, useMemo } from 'react';
import { Product, Order, RawMaterial } from '../types';
import { 
  DollarSign, Package, AlertTriangle, AlertCircle, TrendingUp, Sparkles, 
  Search, Sliders, Play, TrendingDown, Target, HelpCircle, ArrowUpRight, 
  Info, Award, Flame, Calendar, RefreshCcw, Percent, BarChart3, PieChart as PieIcon,
  Layers, Lightbulb, BadgeAlert, ArrowDownRight, RefreshCw, FileJson, Copy, Check, X
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';

interface StockAnalystProps {
  products: Product[];
  orders?: Order[];
  rawMaterials?: RawMaterial[];
}

// Cores sofisticadas para o dashboard
const COLORS = [
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#06b6d4', // Cyan
  '#e11d48', // Rose
  '#d97706', // Amber
  '#8b5cf6', // Violet
  '#2563eb', // Blue
  '#16a34a', // Green
];

export const StockAnalyst: React.FC<StockAnalystProps> = ({ products = [], orders = [], rawMaterials = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low' | 'normal' | 'out_of_stock'>('all');
  const [activeTab, setActiveTab] = useState<'metrics' | 'rankings' | 'insights' | 'projections'>('metrics');

  // Estado para simular as médias de vendas mensais dos produtos
  const [salesSimulations, setSalesSimulations] = useState<Record<string, number>>({});

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // 1. Obter as matérias-primas reais ou virtuais se vazio
  const actualRawMaterials = useMemo(() => {
    if (rawMaterials && rawMaterials.length > 0) {
      return rawMaterials;
    }
    // Fallback: se não houver insumos, gera virtuais a partir de produtos
    return products.map(p => ({
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      unit: p.unit || 'un',
      currentStock: p.stock || 0,
      minStock: p.minStock || 2,
      costPerUnit: p.cost || 0,
      category: p.category || 'Geral'
    }));
  }, [rawMaterials, products]);

  // 2. Obter categorias únicas de insumos
  const activeCategories = useMemo<string[]>(() => {
    const cats = actualRawMaterials.map(rm => rm.category).filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(cats))];
  }, [actualRawMaterials]);

  // 3. Extrair dados históricos do histórico de pedidos (últimos 30 dias)
  const historicalMonthlySales = useMemo(() => {
    const salesMap: Record<string, number> = {};
    if (!orders || orders.length === 0) return salesMap;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    orders.forEach(order => {
      const isCompleted = order.status === 'finished' || order.status === 'delivered';
      const orderTime = new Date(order.createdAt).getTime();
      
      if (isCompleted && orderTime >= thirtyDaysAgo && order.items) {
        order.items.forEach(item => {
          if (item.productId) {
            salesMap[item.productId] = (salesMap[item.productId] || 0) + (item.quantity || 0);
          }
        });
      }
    });

    return salesMap;
  }, [orders]);

  // Auxiliar para obter a média mensal de um produto (calculada ou simulada)
  const getProductMonthlySales = (productId: string, minStock: number): number => {
    const realHistory = historicalMonthlySales[productId];
    if (realHistory !== undefined && realHistory > 0) {
      return realHistory;
    }
    return Math.max(5, (minStock || 2) * 5);
  };

  const handleSimulateSales = (rmId: string, val: string) => {
    const num = isNaN(parseFloat(val)) ? 0 : Math.max(0, parseFloat(val));
    setSalesSimulations(prev => ({
      ...prev,
      [rmId]: num
    }));
  };

  // 4. Analisar as matérias-primas e vincular as Fichas Técnicas
  const analyzedRawMaterials = useMemo(() => {
    return actualRawMaterials.map(rm => {
      const stock = rm.currentStock || 0;
      const cost = rm.costPerUnit || 0;
      const valorInvestido = stock * cost;

      // Encontrar pratos que usam este insumo na ficha técnica
      const allocatedProducts = products.filter(p => 
        p.technicalSheet?.some(ts => ts.rawMaterialId === rm.id)
      );

      // Calcular faturamento ponderado por unidade de insumo através da margem das fichas técnicas
      let price = cost * 1.5; // fallback: 50% markup se não houver prato associado
      if (allocatedProducts.length > 0) {
        let totalWeight = 0;
        let sumWeightedPrice = 0;
        allocatedProducts.forEach(p => {
          const tsItem = p.technicalSheet?.find(ts => ts.rawMaterialId === rm.id);
          if (tsItem && tsItem.quantity > 0) {
            // Custo total da ficha técnica deste prato
            const recipeCost = p.technicalSheet?.reduce((sum, item) => {
              const mat = actualRawMaterials.find(m => m.id === item.rawMaterialId);
              const c = mat ? mat.costPerUnit : 0;
              return sum + (item.quantity * c);
            }, 0) || p.cost || 1;

            const costProp = (tsItem.quantity * rm.costPerUnit) / (recipeCost || 1);
            const revenueContributionOfRM = (costProp * p.price) / tsItem.quantity;

            const salesVol = getProductMonthlySales(p.id, p.minStock || 0);
            const weight = salesVol > 0 ? salesVol : 1;

            sumWeightedPrice += revenueContributionOfRM * weight;
            totalWeight += weight;
          }
        });
        if (totalWeight > 0) {
          price = sumWeightedPrice / totalWeight;
        }
      }

      // Demanda de consumo do insumo baseada na ficha técnica e vendas dos produtos
      let mvm = salesSimulations[rm.id];
      if (mvm === undefined) {
        mvm = 0;
        if (allocatedProducts.length > 0) {
          allocatedProducts.forEach(p => {
            const tsItem = p.technicalSheet?.find(ts => ts.rawMaterialId === rm.id);
            if (tsItem && tsItem.quantity > 0) {
              const salesVol = getProductMonthlySales(p.id, p.minStock || 0);
              mvm += salesVol * tsItem.quantity;
            }
          });
        }
        if (mvm <= 0) {
          mvm = Math.max(5, (rm.minStock || 2) * 5);
        }
      }

      const mdv = mvm / 30; // consumo diário
      const diasCobertura = mdv > 0 ? stock / mdv : Infinity;

      const faturamentoPotencial = stock * price;
      const lucroPotencial = Math.max(0, faturamentoPotencial - valorInvestido);
      const margemLucro = price > 0 ? ((price - cost) / price) * 100 : 0;
      const ire = valorInvestido > 0 ? (lucroPotencial / valorInvestido) * 100 : (cost === 0 && price > 0 ? 100 : 0);

      const lucroUnitario = Math.max(0, price - cost);
      const projecao7d = Math.round(Math.min(stock, mdv * 7) * lucroUnitario * 100) / 100;
      const projecao30d = Math.round(Math.min(stock, mdv * 30) * lucroUnitario * 100) / 100;
      const projecao90d = Math.round(Math.min(stock, mdv * 90) * lucroUnitario * 100) / 100;

      return {
        ...rm,
        stock,
        cost,
        price,
        valorInvestido,
        faturamentoPotencial,
        lucroPotencial,
        margemLucro,
        ire,
        mvm,
        mdv,
        diasCobertura,
        projecao7d,
        projecao30d,
        projecao90d,
        allocatedProducts
      };
    });
  }, [actualRawMaterials, products, salesSimulations, historicalMonthlySales]);

  // 5. Filtrar as matérias-primas conforme busca e categoria
  const filteredProducts = useMemo(() => {
    return analyzedRawMaterials.filter(rm => {
      const matchesSearch = rm.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            rm.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || rm.category === selectedCategory;
      
      let matchesStock = true;
      if (stockLevelFilter === 'low') {
        matchesStock = rm.stock > 0 && rm.stock <= (rm.minStock || 2);
      } else if (stockLevelFilter === 'out_of_stock') {
        matchesStock = rm.stock <= 0;
      } else if (stockLevelFilter === 'normal') {
        matchesStock = rm.stock > (rm.minStock || 2);
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [analyzedRawMaterials, searchTerm, selectedCategory, stockLevelFilter]);

  // 6. Resumo Geral de Indicadores de Insumos
  const resumo = useMemo(() => {
    const availableStockRMs = analyzedRawMaterials.filter(rm => rm.stock > 0);
    
    const valor_estoque = availableStockRMs.reduce((sum, rm) => sum + rm.valorInvestido, 0);
    const faturamento_potencial = availableStockRMs.reduce((sum, rm) => sum + rm.faturamentoPotencial, 0);
    const lucro_potencial = availableStockRMs.reduce((sum, rm) => sum + rm.lucroPotencial, 0);
    
    const margem_media = faturamento_potencial > 0 ? (lucro_potencial / faturamento_potencial) * 100 : 0;
    const total_itens = availableStockRMs.reduce((sum, rm) => sum + rm.stock, 0);

    return {
      valor_estoque,
      faturamento_potencial,
      lucro_potencial,
      margem_media,
      total_itens
    };
  }, [analyzedRawMaterials]);

  // 7. Configurar Rankings de Insumos
  const topLucro = useMemo(() => {
    return [...analyzedRawMaterials]
      .filter(rm => rm.lucroPotencial > 0)
      .sort((a, b) => b.lucroPotencial - a.lucroPotencial)
      .slice(0, 10);
  }, [analyzedRawMaterials]);

  const topRentabilidade = useMemo(() => {
    return [...analyzedRawMaterials]
      .filter(rm => rm.lucroPotencial > 0 && rm.valorInvestido > 0)
      .sort((a, b) => b.ire - a.ire)
      .slice(0, 10);
  }, [analyzedRawMaterials]);

  const topCapitalParado = useMemo(() => {
    return [...analyzedRawMaterials]
      .filter(rm => rm.valorInvestido > 0)
      .sort((a, b) => b.valorInvestido - a.valorInvestido)
      .slice(0, 10);
  }, [analyzedRawMaterials]);

  // 8. Divisão de Recursos por Categoria de Insumos
  const chartCategoryData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    analyzedRawMaterials.forEach(rm => {
      if (rm.valorInvestido > 0) {
        dataMap[rm.category] = (dataMap[rm.category] || 0) + rm.valorInvestido;
      }
    });
    return Object.entries(dataMap).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    })).sort((a, b) => b.value - a.value);
  }, [analyzedRawMaterials]);

  // 9. Inteligência AI do Analista de Estoque de Insumos
  const businessInsights = useMemo(() => {
    const alerts: { type: 'danger' | 'warning' | 'success' | 'info'; title: string; desc: string; icon: any }[] = [];
    
    const maxCapitalRM = [...analyzedRawMaterials]
      .filter(rm => rm.stock > 0)
      .sort((a, b) => b.valorInvestido - a.valorInvestido)[0];

    if (maxCapitalRM && maxCapitalRM.valorInvestido > 150) {
      const pNames = maxCapitalRM.allocatedProducts.map(p => p.name).slice(0, 2).join(', ');
      const pText = pNames ? ` (utilizado em: ${pNames})` : '';
      alerts.push({
        type: 'warning',
        title: 'Elevado Capital em Insumos',
        desc: `O insumo "${maxCapitalRM.name}"${pText} possui R$ ${maxCapitalRM.valorInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} travados em estoque físico (${maxCapitalRM.stock} ${maxCapitalRM.unit}). Acelere as vendas destes itens para liberar fluxo de caixa.`,
        icon: BadgeAlert
      });
    }

    const lowMarginRMs = analyzedRawMaterials.filter(rm => rm.stock > 0 && rm.margemLucro < 30 && rm.cost > 0);
    if (lowMarginRMs.length > 0) {
      const topLowMargin = lowMarginRMs.sort((a, b) => a.margemLucro - b.margemLucro)[0];
      const productsList = topLowMargin.allocatedProducts.map(p => p.name).slice(0, 3).join(', ');
      const productsText = productsList ? ` das fichas técnicas de: ${productsList}` : '';
      alerts.push({
        type: 'danger',
        title: 'Alerta de Margem Crítica de Insumo',
        desc: `O insumo "${topLowMargin.name}" opera com uma margem de lucro estimada de apenas ${topLowMargin.margemLucro.toFixed(1)}%${productsText}. Considere renegociar preços com fornecedores ou reajustar o preço de venda dos produtos finais.`,
        icon: TrendingDown
      });
    }

    const goldOpportunities = analyzedRawMaterials.filter(rm => rm.margemLucro > 55 && rm.stock <= (rm.minStock || 2));
    if (goldOpportunities.length > 0) {
      const primaryOpportunity = goldOpportunities[0];
      alerts.push({
        type: 'success',
        title: 'Reposição Estratégica Recomendada',
        desc: `O insumo "${primaryOpportunity.name}" alimenta pratos de altíssima rentabilidade (margem superior a ${primaryOpportunity.margemLucro.toFixed(0)}%), mas seu estoque está crítico (${primaryOpportunity.stock} ${primaryOpportunity.unit}). Priorize a reposição imediata para não perder vendas.`,
        icon: Sparkles
      });
    }

    const outOfStock = analyzedRawMaterials.filter(rm => rm.stock <= 0);
    if (outOfStock.length > 0) {
      const namesList = outOfStock.map(r => r.name).slice(0, 3).join(', ');
      alerts.push({
        type: 'danger',
        title: 'Insumos Críticos Zerados',
        desc: `Atualmente há ${outOfStock.length} insumos essenciais zerados no estoque físico (${namesList}). Isso impede a preparação dos pratos vinculados a essas fichas técnicas.`,
        icon: AlertTriangle
      });
    }

    const potentialPromo = analyzedRawMaterials.filter(rm => rm.stock > (rm.minStock || 2) * 2.5 && rm.margemLucro > 45);
    if (potentialPromo.length > 0) {
      const bestPromo = potentialPromo.sort((a, b) => b.stock - a.stock)[0];
      const pNames = bestPromo.allocatedProducts.map(p => p.name).slice(0, 2).join(', ');
      const pText = pNames ? ` para os produtos: ${pNames}` : '';
      alerts.push({
        type: 'info',
        title: 'Giro Rápido Recomendado',
        desc: `O insumo "${bestPromo.name}" está com estoque elevado (${bestPromo.stock} ${bestPromo.unit}) e possui margem saudável (${bestPromo.margemLucro.toFixed(0)}%). Sugerimos lançar promoções ou combos${pText} no cardápio digital para queimar este estoque.`,
        icon: Award
      });
    }

    const sortedByLucro = [...analyzedRawMaterials].sort((a, b) => b.lucroPotencial - a.lucroPotencial);
    if (sortedByLucro.length > 0 && sortedByLucro[0].lucroPotencial > 0) {
      const topOne = sortedByLucro[0];
      alerts.push({
        type: 'success',
        title: 'Seu Maior Motor de Lucratividade',
        desc: `O insumo "${topOne.name}" representa o maior potencial de retorno financeiro. A venda total de pratos que usam este insumo gerará R$ ${topOne.lucroPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de lucro puro.`,
        icon: Target
      });
    }

    return alerts;
  }, [analyzedRawMaterials]);

  // 10. Relatório JSON do Estoque de Insumos
  const reportJson = useMemo(() => {
    return {
      resumo: {
        valor_estoque: Number(resumo.valor_estoque.toFixed(2)),
        faturamento_potencial: Number(resumo.faturamento_potencial.toFixed(2)),
        lucro_potencial: Number(resumo.lucro_potencial.toFixed(2)),
        margem_media: Number(resumo.margem_media.toFixed(2))
      },
      top_lucro: topLucro.map(rm => ({
        nome_do_insumo: rm.name,
        categoria: rm.category,
        quantidade_em_estoque: rm.stock,
        unidade: rm.unit,
        custo_unitario: Number(rm.cost.toFixed(2)),
        valor_investido: Number(rm.valorInvestido.toFixed(2)),
        lucro_potencial: Number(rm.lucroPotencial.toFixed(2))
      })),
      top_rentabilidade: topRentabilidade.map(rm => ({
        nome_do_insumo: rm.name,
        categoria: rm.category,
        custo_unitario: Number(rm.cost.toFixed(2)),
        margem_de_lucro_estimada: Number(rm.margemLucro.toFixed(2)),
        ire: Number(rm.ire.toFixed(4))
      })),
      capital_parado: topCapitalParado.map(rm => ({
        nome_do_insumo: rm.name,
        categoria: rm.category,
        quantidade_em_estoque: rm.stock,
        unidade: rm.unit,
        valor_investido: Number(rm.valorInvestido.toFixed(2))
      })),
      alertas: businessInsights.filter(i => i.type === 'danger' || i.type === 'warning').map(i => ({
        titulo: i.title,
        descricao: i.desc,
        nivel: i.type
      })),
      insights: businessInsights.map(i => ({
        tipo: i.type,
        titulo: i.title,
        descricao: i.desc
      })),
      projecoes: analyzedRawMaterials
        .filter(rm => rm.mvm > 0)
        .map(rm => {
          return {
            nome_do_insumo: rm.name,
            categoria: rm.category,
            estoque_atual: rm.stock,
            unidade: rm.unit,
            consumo_mensal_estimado: rm.mvm,
            dias_de_cobertura: Math.round(rm.diasCobertura),
            projecao_lucro_7d: Number(rm.projecao7d.toFixed(2)),
            projecao_lucro_30d: Number(rm.projecao30d.toFixed(2)),
            projecao_lucro_90d: Number(rm.projecao90d.toFixed(2))
          };
        })
    };
  }, [resumo, topLucro, topRentabilidade, topCapitalParado, businessInsights, analyzedRawMaterials]);

  // Auxiliar para simulação
  function simulatedMvm(rm: any) {
    return salesSimulations[rm.id] || 0;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* SaaS Marketing Hook Element - Chamativo e Moderno */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-6 sm:p-8 rounded-[2.5rem] border border-indigo-500/30 shadow-2xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-12 translate-x-24 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-900/40 rounded-full blur-xl pointer-events-none" />
        
        <div className="space-y-3 relative z-10 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500/20 text-indigo-200 rounded-full border border-indigo-400/30 font-black text-[9px] uppercase tracking-wider">
            <Sparkles size={11} className="animate-pulse" />
            Visão de Capital do Estoque
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-tight font-sans">
            Seu estoque não é apenas mercadoria... <span className="text-indigo-200">ele é dinheiro vivo !</span>
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm font-medium leading-relaxed">
            Se todo o estoque atual disponível de <strong className="text-white underline decoration-wavy decoration-emerald-400">{resumo.total_itens.toLocaleString('pt-BR')} unidades de insumos</strong> for consumido nas fichas técnicas, o faturamento estimado será de <strong className="text-white text-md">R$ {resumo.faturamento_potencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, gerando aproximadamente <strong className="text-emerald-300 text-lg font-black tracking-tight">R$ {resumo.lucro_potencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> de lucro bruto estimado para o seu caixa.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/15 p-5 rounded-3xl text-center shrink-0 min-w-[200px] relative z-10 shadow-lg select-none">
          <p className="text-[10px] font-black uppercase text-indigo-200 tracking-wider">Líquidez Latente</p>
          <div className="text-3xl font-black text-amber-300 mt-2 tracking-tighter">
            R$ {resumo.lucro_potencial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[8px] font-bold text-white/70 mt-1 uppercase tracking-widest">Lucro Bruto Pendente</p>
          <div className="h-px bg-white/10 my-3" />
          <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-300 font-bold">
            <ArrowUpRight size={14} />
            <span>Retorno de {resumo.valor_estoque > 0 ? ((resumo.lucro_potencial / resumo.valor_estoque) * 100).toFixed(0) : 0}% s/ capital</span>
          </div>
        </div>
      </div>

      {/* Menu Interno de Análise e Exportar JSON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 max-w-2xl flex-1">
          {[
            { id: 'metrics', label: 'Dashboard Geral', icon: BarChart3 },
            { id: 'rankings', label: 'Estratégia & Rankings', icon: Award },
            { id: 'insights', label: 'Dicas de Negócio', icon: Lightbulb, alertCount: businessInsights.length },
            { id: 'projections', label: 'Simulações de Vendas', icon: Calendar },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-150 font-black relative z-10' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
              }`}
            >
              <tab.icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.alertCount !== undefined && tab.alertCount > 0 && (
                <span className={`w-4 h-4 text-[9px] rounded-full flex items-center justify-center font-bold ${activeTab === tab.id ? 'bg-amber-400 text-indigo-900' : 'bg-red-500 text-white animate-pulse'}`}>
                  {tab.alertCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setIsJsonModalOpen(true);
            setCopiedJson(false);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl h-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all cursor-pointer shrink-0"
        >
          <FileJson size={14} className="text-emerald-200" />
          <span>Relatório JSON</span>
        </button>
      </div>

      {/* RENDER VIEW: METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Grid de Métricas Financeiras */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                <DollarSign size={20} />
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Capital Empacado</p>
                <p className="text-lg sm:text-xl font-black text-slate-950 tracking-tighter mt-1">
                  R$ {resumo.valor_estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] font-medium text-slate-400 mt-1">Custo total investido</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl w-fit">
                <TrendingUp size={20} />
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Faturamento Alvo</p>
                <p className="text-lg sm:text-xl font-black text-slate-950 tracking-tighter mt-1">
                  R$ {resumo.faturamento_potencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] font-medium text-slate-400 mt-1">Potencial bruto de venda</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                <Flame size={20} />
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Lucro Adormecido</p>
                <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tighter mt-1">
                  R$ {resumo.lucro_potencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] font-medium text-slate-400 mt-1">Lucro bruto à vista</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                <Percent size={20} />
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Margem Média</p>
                <p className="text-lg sm:text-xl font-black text-slate-950 tracking-tighter mt-1">
                  {resumo.margem_media.toFixed(1)}%
                </p>
                <p className="text-[9px] font-medium text-slate-400 mt-1">Margem global média</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-150 shadow-sm col-span-2 md:col-span-1 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl w-fit">
                <Package size={20} />
              </div>
              <div className="mt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Insumos Estocados</p>
                <p className="text-lg sm:text-xl font-black text-slate-950 tracking-tighter mt-1">
                  {resumo.total_itens.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-bold">un</span>
                </p>
                <p className="text-[9px] font-medium text-slate-400 mt-1">Total de unidades físicas</p>
              </div>
            </div>
          </div>

          {/* Gráficos de Capital Investido por categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                  <PieIcon size={16} className="text-indigo-500" />
                  Divisão de Recursos por Categoria
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Veja onde seu capital está retido na cozinha/bar</p>
              </div>

              <div className="h-64 my-4 flex items-center justify-center relative">
                {chartCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sem dados de capital investido</p>
                )}
                {chartCategoryData.length > 0 && (
                  <div className="absolute flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                    <span className="text-md font-black text-slate-800">R$ {resumo.valor_estoque.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>

              {/* Legenda Dinâmica de Categoria */}
              <div className="space-y-1.5 border-t pt-4 custom-scrollbar max-h-36 overflow-y-auto">
                {chartCategoryData.slice(0, 5).map((item, index) => {
                  const percent = resumo.valor_estoque > 0 ? (item.value / resumo.valor_estoque) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="text-slate-400 text-[10px] font-black shrink-0">
                        R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Lucro Acumulado BarChart */}
            <div className="lg:col-span-8 bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                  <BarChart3 size={16} className="text-emerald-500" />
                  Comparativo de Lucratividade Teórica dos Insumos
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Os 8 principais insumos com maior folga monetária no estoque</p>
              </div>

              <div className="h-80 my-4">
                {topLucro.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topLucro.slice(0, 8).map(p => ({
                        name: p.name.length > 15 ? p.name.substring(0, 13) + '...' : p.name,
                        'Investimento (Custo)': p.valorInvestido,
                        'Lucro Potencial': p.lucroPotencial
                      }))}
                      margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Bar dataKey="Investimento (Custo)" fill="#cbcbda" radius={[6, 6, 0, 0]} barSize={24} />
                      <Bar dataKey="Lucro Potencial" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sem insumos cadastrados com potencial de lucro</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: RANKINGS */}
      {activeTab === 'rankings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top 10 Lucro Potencial */}
          <div className="bg-white rounded-[2rem] border border-slate-150 shadow-sm overflow-hidden flex flex-col h-[520px]">
            <div className="p-5 border-b bg-gradient-to-b from-indigo-50/50 to-white">
              <span className="p-1 px-2 text-[8px] font-black uppercase tracking-wider bg-indigo-500 text-white rounded-md mb-2 inline-block">Rentabilidade Monetária</span>
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                <Flame size={16} className="text-red-500" />
                Maior Lucro Potencial
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Se todo o estoque for vendido (ordem Decrescente)</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {topLucro.map((p, index) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/60 transition-all">
                  <div className="w-6 h-6 bg-indigo-100 text-indigo-700/80 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-black text-slate-800 truncate" title={p.name}>{p.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{p.stock} {p.unit || 'un'} · Margem {p.margemLucro.toFixed(0)}%</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">R$ {p.lucroPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">Lucro Absoluto</p>
                  </div>
                </div>
              ))}
              {topLucro.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Info size={28} className="opacity-40" />
                  <p className="text-xs font-bold mt-2 uppercase tracking-wider">Nenhum insumo</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 10 Rentabilidade (IRE) */}
          <div className="bg-white rounded-[2rem] border border-slate-150 shadow-sm overflow-hidden flex flex-col h-[520px]">
            <div className="p-5 border-b bg-gradient-to-b from-indigo-50/50 to-white">
              <span className="p-1 px-2 text-[8px] font-black uppercase tracking-wider bg-teal-500 text-white rounded-md mb-2 inline-block">IRE (Índice Rentabilidade)</span>
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                <Target size={16} className="text-teal-600" />
                Mais Rentáveis (Índice IRE)
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Maior eficiência de ganho sobre o capital aplicado</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {topRentabilidade.map((p, index) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/60 transition-all">
                  <div className="w-6 h-6 bg-teal-100 text-teal-700/80 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-black text-slate-800 truncate" title={p.name}>{p.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Faturamento Estimado: R$ {p.price.toFixed(2)} · Custo: R$ {p.cost.toFixed(2)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-teal-600">{p.ire === Infinity ? 'Sem Custo' : `${p.ire.toFixed(0)}%`}</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">Rentabilidade</p>
                  </div>
                </div>
              ))}
              {topRentabilidade.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Info size={28} className="opacity-40" />
                  <p className="text-xs font-bold mt-2 uppercase tracking-wider">Nenhum insumo</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Capital Parado */}
          <div className="bg-white rounded-[2rem] border border-slate-150 shadow-sm overflow-hidden flex flex-col h-[520px]">
            <div className="p-5 border-b bg-gradient-to-b from-indigo-50/50 to-white">
              <span className="p-1 px-2 text-[8px] font-black uppercase tracking-wider bg-rose-500 text-white rounded-md mb-2 inline-block">Liquidez Presa</span>
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                <AlertCircle size={16} className="text-rose-500" />
                Maior Capital Parado
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium font-sans">Insumos que estão retendo mais dinheiro físico em gaveta</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {topCapitalParado.map((p, index) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/60 transition-all">
                  <div className="w-6 h-6 bg-rose-100 text-rose-700/80 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-black text-slate-800 truncate" title={p.name}>{p.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{p.stock} {p.unit || 'un'} · Custo Unitário R$ {p.cost.toFixed(2)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-rose-600">R$ {p.valorInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">Dinheiro Retido</p>
                  </div>
                </div>
              ))}
              {topCapitalParado.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Info size={28} className="opacity-40" />
                  <p className="text-xs font-bold mt-2 uppercase tracking-wider">Nenhum insumo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: INSIGHTS & INTELIGÊNCIA */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-150">
              <Lightbulb size={20} />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 tracking-tight uppercase">Inteligência Estratégica AI do Estoque</h4>
              <p className="text-[10px] text-slate-500 font-medium">Insights financeiros automáticos gerados a partir do estoque e volume de liquidez dos produtos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessInsights.map((insight, idx) => {
              const bgColors = {
                danger: 'bg-rose-50/70 border-rose-100 text-rose-900',
                warning: 'bg-amber-50/70 border-amber-150 text-amber-900',
                success: 'bg-emerald-50/70 border-emerald-100 text-emerald-900',
                info: 'bg-blue-50/70 border-blue-100 text-blue-900'
              };
              
              const textColors = {
                danger: 'text-rose-600 bg-rose-100/50 border border-rose-200/40',
                warning: 'text-amber-600 bg-amber-150/40 border border-amber-200/50',
                success: 'text-emerald-600 bg-emerald-100/50 border border-emerald-200/40',
                info: 'text-blue-600 bg-blue-100/50 border border-blue-200/40'
              };

              return (
                <div 
                  key={idx} 
                  className={`p-6 rounded-[2rem] border shadow-sm flex items-start gap-4 hover:shadow-md transition-all antialiased animate-in fade-in slide-in-from-left-2 duration-300 ${bgColors[insight.type]}`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className={`p-3 rounded-2xl shrink-0 ${textColors[insight.type]}`}>
                    <insight.icon size={22} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 leading-snug">
                      {insight.title}
                    </h5>
                    <p className="text-slate-600 text-xs font-medium leading-relaxed">
                      {insight.desc}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {businessInsights.length === 0 && (
              <div className="col-span-2 p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-slate-400">
                <Info size={40} className="mx-auto text-slate-300" />
                <p className="text-xs font-black mt-2 uppercase tracking-widest">Sem insights críticos no momento</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Seu estoque está bem otimizado e equilibrado!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: PROJECTIONS */}
      {activeTab === 'projections' && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
                <Sliders size={18} className="text-indigo-600" />
                Simulador Dinâmico de Histórico & Cobertura
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Abaixo, a inteligência financeira estima os **Dias de Cobertura** e o **Lucro Brutamente Gerado** para 7, 30 e 90 dias com base no estoque disponível. 
                O sistema usa as vendas reais dos últimos 30 dias de forma inteligente, mas você pode **mudar a média de vendas mensal** de qualquer item para obter projeções sob medida!
              </p>
            </div>
            
            <button 
              onClick={() => { setSalesSimulations({}); }}
              disabled={Object.keys(salesSimulations).length === 0}
              className="px-5 py-3 bg-white text-slate-700 disabled:opacity-50 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-100 flex items-center gap-2 shadow-sm transition-all text-xs shrink-0 active:scale-[0.98]"
            >
              <RefreshCw size={14} className="shrink-0" />
              Restaurar Valores Reais
            </button>
          </div>

          {/* Filtros da Tabela */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquise por nome do insumo..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            
            <div className="flex gap-3">
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none shadow-sm capitalize"
              >
                <option value="all">Filtro: Categorias (Todas)</option>
                {activeCategories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                value={stockLevelFilter}
                onChange={e => setStockLevelFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 focus:outline-none shadow-sm"
              >
                <option value="all">Filtro: Estoque (Todos)</option>
                <option value="low">Estoque Mínimo Crítico</option>
                <option value="normal">Estoque Saudável</option>
                <option value="out_of_stock">Esgotados</option>
              </select>
            </div>
          </div>

          {/* Tabela Interativa */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4 w-[240px]">Insumo / Categoria</th>
                    <th className="px-4 py-4 w-[110px] text-center">Físico Atual</th>
                    <th className="px-4 py-4 w-[120px] text-center">Média Mensal</th>
                    <th className="px-4 py-4 w-[120px] text-center">Dias Cobertura</th>
                    <th className="px-4 py-4 w-[110px] text-right">Margem (%)</th>
                    <th className="px-4 py-4 w-[110px] text-right">Lucro 7d</th>
                    <th className="px-4 py-4 w-[110px] text-right">Lucro 30d</th>
                    <th className="px-4 py-4 w-[110px] text-right">Lucro 90d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {filteredProducts.map(p => {
                    const isCritical = p.stock <= (p.minStock || 2);
                    const isOut = p.stock <= 0;
                    
                    let coverageLabel = '';
                    let coverageColor = 'text-slate-700 bg-slate-100';
                    
                    if (p.diasCobertura === Infinity) {
                      coverageLabel = 'Sem consumo';
                      coverageColor = 'text-slate-400 bg-slate-50';
                    } else if (isOut) {
                      coverageLabel = 'Esgotado';
                      coverageColor = 'text-rose-600 bg-rose-50 border border-rose-100/50';
                    } else if (p.diasCobertura < 7) {
                      coverageLabel = `${Math.round(p.diasCobertura)} dias (Ruína)`;
                      coverageColor = 'text-rose-600 bg-rose-50 border border-rose-100/30 font-black';
                    } else if (p.diasCobertura < 15) {
                      coverageLabel = `${Math.round(p.diasCobertura)} dias (Baixo)`;
                      coverageColor = 'text-amber-600 bg-amber-50 border border-amber-100/30';
                    } else if (p.diasCobertura > 90) {
                      coverageLabel = `${Math.round(p.diasCobertura)} d (Excesso)`;
                      coverageColor = 'text-violet-600 bg-violet-50 border border-violet-100/30';
                    } else {
                      coverageLabel = `${Math.round(p.diasCobertura)} dias`;
                      coverageColor = 'text-emerald-600 bg-emerald-50 border border-emerald-150/30';
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-all font-sans text-xs">
                        <td className="px-6 py-4 truncate">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 text-xs truncate leading-snug">{p.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold truncate leading-none">{p.category}</span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            isOut ? 'bg-rose-100 text-rose-600' : isCritical ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {p.stock} <span className="text-[8px] font-bold text-slate-400 capitalize">{p.unit || 'un'}</span>
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                            <input 
                              type="number"
                              min="0"
                              value={p.mvm}
                              onChange={e => handleSimulateSales(p.id, e.target.value)}
                              className="w-10 bg-transparent text-center font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded text-xs py-0.5"
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{p.unit || 'un'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black tracking-tight ${coverageColor}`}>
                            {coverageLabel}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <span className={`font-bold ${p.margemLucro < 25 ? 'text-rose-500' : p.margemLucro > 50 ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {p.margemLucro.toFixed(0)}%
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-slate-800">
                          R$ {p.projecao7d.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-indigo-600">
                          R$ {p.projecao30d.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-teal-600">
                          R$ {p.projecao90d.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                        Nenhum insumo correspondente aos filtros foi encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Relatório JSON */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100">
            {/* Header */}
            <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileJson size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tighter">Exportar Relatório JSON</h3>
                  <p className="text-xs text-slate-400 font-medium leading-none mt-1">Dados consolidados do estoque prontos para integrações</p>
                </div>
              </div>
              <button 
                onClick={() => setIsJsonModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900 custom-scrollbar text-slate-200 font-mono text-xs leading-relaxed selection:bg-indigo-500/30">
              <pre className="whitespace-pre-wrap word-break-all select-all">
                {JSON.stringify(reportJson, null, 2)}
              </pre>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t bg-slate-50 flex gap-3 justify-end items-center">
              <button 
                onClick={() => setIsJsonModalOpen(false)}
                className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(reportJson, null, 2));
                  setCopiedJson(true);
                  setTimeout(() => setCopiedJson(false), 2000);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                {copiedJson ? (
                  <>
                    <Check size={14} className="text-emerald-100 animate-bounce" />
                    <span>Copiado !</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-emerald-100" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
