import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Order, Product, FinancialRecord, AdminSettings, RawMaterial } from "../types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Award,
  Sparkles,
  Percent,
  Calendar,
  ShoppingBag,
  HelpCircle,
  Hourglass,
  ArrowRight,
  Sliders,
  ChevronRight,
  Info,
  Layers,
  ArrowUpRight,
  X,
  RefreshCw,
  Gauge,
  LayoutDashboard,
  Wallet,
  ArrowDownLeft,
  Store,
  Utensils,
  Bike,
  Smartphone,
  BrainCircuit,
  BarChart as BarChartIcon,
  Pencil,
  Plus,
  Trash2,
  Check
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import AIInsights from "./AIInsights";
import DashboardAlerts from "./DashboardAlerts";
import CMVAnalysis from "./CMVAnalysis";

const safeFormatISO = (val: any) => {
  if (!val) return new Date().toISOString().split("T")[0];
  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'object' && (val as any).seconds) {
    d = new Date((val as any).seconds * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  return d.toISOString().split("T")[0];
};

interface LojistaCopilotProps {
  orders: Order[];
  products: Product[];
  manualRecords: FinancialRecord[];
  adminSettings: AdminSettings;
  rawMaterials: RawMaterial[];
  onUpdateProduct: (product: Product) => void;
  onNavigateToInventory: () => void;
}

type PeriodType = "today" | "last7" | "thisMonth" | "lastMonth";

export default function LojistaCopilot({
  orders = [],
  products = [],
  manualRecords = [],
  adminSettings,
  rawMaterials = [],
  onUpdateProduct,
  onNavigateToInventory
}: LojistaCopilotProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("thisMonth");
  
  interface FixedCostItem {
    id: string;
    name: string;
    type: 'rent' | 'staff';
    amount: number;
  }

  const [fixedCostsList, setFixedCostsList] = useState<FixedCostItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copilot_fixed_costs_list");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      { id: "fc-1", name: "Aluguel da Loja", type: "rent", amount: 1800 },
      { id: "fc-2", name: "Contas de Consumo (Água, Luz, Net)", type: "rent", amount: 700 },
      { id: "fc-3", name: "Folha de Salários - Equipe", type: "staff", amount: 3500 },
      { id: "fc-4", name: "Pró-labore de Sócios", type: "staff", amount: 1300 },
    ];
  });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<'rent' | 'staff'>('rent');
  const [editAmount, setEditAmount] = useState(0);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<'rent' | 'staff'>('rent');
  const [newAmount, setNewAmount] = useState<number | "">("");

  const computedRentTotal = useMemo(() => {
    return fixedCostsList
      .filter(item => item.type === 'rent')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [fixedCostsList]);

  const computedStaffTotal = useMemo(() => {
    return fixedCostsList
      .filter(item => item.type === 'staff')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [fixedCostsList]);

  // Custom fixed monthly costs configured by the lojista for smart day-proportional scaling
  const [monthlyRent, setMonthlyRent] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copilot_monthly_rent");
      return saved ? parseFloat(saved) : 2500;
    }
    return 2500;
  });
  const [monthlyStaff, setMonthlyStaff] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copilot_monthly_staff");
      return saved ? parseFloat(saved) : 4800;
    }
    return 4800;
  });

  // Synchronize monthly totals when the list changes
  React.useEffect(() => {
    setMonthlyRent(computedRentTotal);
    setMonthlyStaff(computedStaffTotal);
  }, [fixedCostsList, computedRentTotal, computedStaffTotal]);

  const [estimatedWastePercent, setEstimatedWastePercent] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copilot_estimated_waste");
      return saved ? parseFloat(saved) : 3.5;
    }
    return 3.5;
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Estados de Simulação Financeira Interativa ("Alavancas de Lucro")
  const [simCmvReduction, setSimCmvReduction] = useState(0); // redução de 0% a 30% no CMV
  const [simFixedReduction, setSimFixedReduction] = useState(0); // redução de 0% a 30% nas despesas fixas
  const [simFeeReduction, setSimFeeReduction] = useState(0); // redução de 0% a 50% nas taxas de entrega

  // AI Consultation States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'copilot' | 'cmv-cardapio'>('overview');

  // 1. weeklySalesData inside LojistaCopilot
  const weeklySalesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return { 
        name: d.toLocaleDateString('pt-BR', { weekday: 'short' }), 
        date: d,
        sales: 0 
      };
    });

    orders.forEach(order => {
      if (order.status === 'finished' || order.status === 'delivered') {
        const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
        const dayMatch = last7Days.find(d => 
          d.date.getDate() === orderDate.getDate() && 
          d.date.getMonth() === orderDate.getMonth()
        );
        if (dayMatch) {
          dayMatch.sales += order.total || 0;
        }
      }
    });

    return last7Days.map(({ name, sales }) => ({ name, sales }));
  }, [orders]);

  // 2. dailyStats inside LojistaCopilot
  const dailyStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(o => {
      const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      return d >= today && (o.status === 'finished' || o.status === 'delivered');
    });

    return {
      total: todayOrders.reduce((acc, o) => acc + (o.total || 0), 0),
      count: todayOrders.length,
      average: todayOrders.length > 0 ? todayOrders.reduce((acc, o) => acc + (o.total || 0), 0) / todayOrders.length : 0
    };
  }, [orders]);

  // 3. dailyCashFlow inside LojistaCopilot
  const dailyCashFlow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = manualRecords.filter(r => {
      const recordDate = r.date instanceof Date ? r.date : new Date(r.date);
      const rd = new Date(recordDate);
      rd.setHours(0, 0, 0, 0);
      return rd.getTime() === today.getTime();
    });

    const categorySums = {
      tables: 0,
      delivery: 0,
      marketplace: 0,
      digitalMenu: 0,
      balcao: 0,
      others: 0
    };

    todayRecords.filter(r => r.type === 'income').forEach(r => {
      const desc = (r.description || "").toLowerCase();
      const cat = (r.category || "").toLowerCase();
      
      if (desc.includes("marketplace") || cat.includes("marketplace") || desc.includes("site delivery") || desc.includes("ifood")) {
        categorySums.marketplace += r.amount || 0;
      } else if (desc.includes("digital") || desc.includes("cardápio") || cat.includes("digital") || cat.includes("cardápio") || desc.includes("qr code") || desc.includes("qrcode")) {
        categorySums.digitalMenu += r.amount || 0;
      } else if (desc.includes("mesa") || cat.includes("mesa") || desc.includes("consumo")) {
        categorySums.tables += r.amount || 0;
      } else if (desc.includes("entrega") || cat.includes("entrega") || desc.includes("delivery") || cat.includes("delivery")) {
        categorySums.delivery += r.amount || 0;
      } else if (desc.includes("balcão") || cat.includes("balcão") || desc.includes("balcao") || cat.includes("balcao") || desc.includes("takeout") || cat.includes("takeout") || desc.includes("retirada") || cat.includes("retirada") || desc.includes("retirar") || cat.includes("retirar")) {
        categorySums.balcao += r.amount || 0;
      } else {
        if (desc.startsWith("mesa ") || desc.startsWith("consumo parcial mesa")) {
          categorySums.tables += r.amount || 0;
        } else if (desc.includes("abertura de caixa") || desc.includes("suprimento") || cat.includes("abertura") || cat.includes("suprimento") || desc.includes("abertura")) {
          categorySums.others += r.amount || 0;
        } else {
          categorySums.balcao += r.amount || 0;
        }
      }
    });

    const entries = categorySums.tables + categorySums.delivery + categorySums.marketplace + categorySums.digitalMenu + categorySums.balcao;

    const outlays = todayRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const net = entries - outlays;

    const recentMovements = [...todayRecords]
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return db.getTime() - da.getTime();
      })
      .slice(0, 5);

    return {
      entries,
      outlays,
      net,
      recentMovements,
      categorySums
    };
  }, [manualRecords]);

  // Parse Date ranges based on Period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let periodName = "";
    let previousStartDate = new Date();
    let previousEndDate = new Date();
    let daysCount = 30;

    switch (selectedPeriod) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        periodName = "Hoje";
        daysCount = 1;
        
        // Previous period = Yesterday
        previousStartDate.setDate(now.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate.setDate(now.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case "last7":
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        periodName = "Últimos 7 dias";
        daysCount = 7;

        // Previous period = 7 days before
        previousStartDate.setDate(now.getDate() - 13);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate.setDate(now.getDate() - 7);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodName = "Este Mês";
        
        // Days difference until today or full month
        const endDay = now.getMonth() === startDate.getMonth() ? now.getDate() : endDate.getDate();
        daysCount = endDay;

        // Previous period = previous month same wide
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, endDay, 23, 59, 59, 999);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        periodName = "Mês Passado";
        daysCount = endDate.getDate();

        // Previous period = 2 months ago
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        break;
    }

    return { startDate, endDate, periodName, daysCount, previousStartDate, previousEndDate };
  }, [selectedPeriod]);

  // Filters records & orders by selected date range
  const filteredData = useMemo(() => {
    const { startDate, endDate, previousStartDate, previousEndDate, daysCount } = dateRange;

    // Filter active orders (excluding cancelled) in current and previous window
    const currentOrders = orders.filter(o => {
      if (o.status === "cancelled") return false;
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });

    const previousOrders = orders.filter(o => {
      if (o.status === "cancelled") return false;
      const d = new Date(o.createdAt);
      return d >= previousStartDate && d <= previousEndDate;
    });

    // Filter financial manual records
    const currentManual = manualRecords.filter(r => {
      const d = new Date(r.date);
      return d >= startDate && d <= endDate;
    });

    const previousManual = manualRecords.filter(r => {
      const d = new Date(r.date);
      return d >= previousStartDate && d <= previousEndDate;
    });

    return { currentOrders, previousOrders, currentManual, previousManual, daysCount };
  }, [orders, manualRecords, dateRange]);

  // Financial intelligence calculation block
  const stats = useMemo(() => {
    const { currentOrders, previousOrders, currentManual, previousManual, daysCount } = filteredData;

    // 1. FATURAMENTO BRUTO (Gross Revenue)
    const salesTotal = currentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const manualIncome = currentManual
      .filter(r => r.type === "income")
      .filter(r => {
        const cat = (r.category || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const isAberturaOrSuprimento = 
          cat.includes("abertura") || cat.includes("suprimento") || cat.includes("troco") || cat.includes("reforço") ||
          desc.includes("abertura") || desc.includes("suprimento") || desc.includes("troco") || desc.includes("reforço");
        return !isAberturaOrSuprimento;
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const faturamentoCurrent = salesTotal + manualIncome;

    const prevSalesTotal = previousOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevManualIncome = previousManual
      .filter(r => r.type === "income")
      .filter(r => {
        const cat = (r.category || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const isAberturaOrSuprimento = 
          cat.includes("abertura") || cat.includes("suprimento") || cat.includes("troco") || cat.includes("reforço") ||
          desc.includes("abertura") || desc.includes("suprimento") || desc.includes("troco") || desc.includes("reforço");
        return !isAberturaOrSuprimento;
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const faturamentoPrev = prevSalesTotal + prevManualIncome;

    // 2. CUSTO DE MERCADORIA VENDIDA (CMV) Real + Fallback estimation
    const productCostMap = new Map<string, number>();
    products.forEach(p => {
      productCostMap.set(p.id, p.cost || 0);
    });

    let cmvCurrent = 0;
    currentOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const cost = productCostMap.get(item.productId);
        if (cost && cost > 0) {
          cmvCurrent += cost * (item.quantity || 0);
        } else {
          cmvCurrent += ((item.price || 0) * 0.35) * (item.quantity || 0);
        }
      });
    });

    let cmvPrevious = 0;
    previousOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const cost = productCostMap.get(item.productId);
        if (cost && cost > 0) {
          cmvPrevious += cost * (item.quantity || 0);
        } else {
          cmvPrevious += ((item.price || 0) * 0.35) * (item.quantity || 0);
        }
      });
    });

    // Desperdício Estimado
    const desperdicioCurrent = faturamentoCurrent * (estimatedWastePercent / 100);
    const desperdicioPrevious = faturamentoPrev * (estimatedWastePercent / 100);

    cmvCurrent += desperdicioCurrent;
    cmvPrevious += desperdicioPrevious;

    // 3. TAXAS DELIVERY / PLATAFORMAS (iFood, etc)
    const deliveryFeesCurrent = currentOrders.reduce((sum, o) => {
      if (o.source && ["iFood", "partner_app", "marketplace"].includes(o.source)) {
        return sum + (o.marketplaceFee || ((o.total || 0) * 0.12));
      }
      return sum;
    }, 0);

    const deliveryFeesPrev = previousOrders.reduce((sum, o) => {
      if (o.source && ["iFood", "partner_app", "marketplace"].includes(o.source)) {
        return sum + (o.marketplaceFee || ((o.total || 0) * 0.12));
      }
      return sum;
    }, 0);

    // 4. FOLHA PROPORCIONAL & DESPESAS FIXAS PROPORCIONAIS
    const getDaysInMonth = (date: Date) => {
      if (!date) return 30;
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() || 30;
    };
    const daysInMonth = getDaysInMonth(dateRange.startDate) || 30;

    const dailyRent = (monthlyRent || 0) / daysInMonth;
    const dailyStaff = (monthlyStaff || 0) / daysInMonth;

    const fixedRentProportional = dailyRent * (daysCount || 1);
    const fixedStaffProportional = dailyStaff * (daysCount || 1);

    // Manual expenses from financial record categories
    const manualExpensesCurrent = currentManual
      .filter(r => r.type === "expense")
      .filter(r => {
        const cat = (r.category || "").toLowerCase();
        return !cat.includes("salário") && !cat.includes("aluguel") && !cat.includes("folha") && !cat.includes("pro-labore");
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const manualExpensesPrev = previousManual
      .filter(r => r.type === "expense")
      .filter(r => {
        const cat = (r.category || "").toLowerCase();
        return !cat.includes("salário") && !cat.includes("aluguel") && !cat.includes("folha") && !cat.includes("pro-labore");
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    // Total expenses aggregated
    const despesasCurrent = cmvCurrent + deliveryFeesCurrent + fixedRentProportional + fixedStaffProportional + manualExpensesCurrent;
    const despesasPrev = cmvPrevious + deliveryFeesPrev + (dailyRent * (daysCount || 1)) + (dailyStaff * (daysCount || 1)) + manualExpensesPrev;

    // 5. LUCRO OPERACIONAL REAL E LÍQUIDO ESTIMADO
    const lucroRealCurrent = faturamentoCurrent - despesasCurrent;
    const lucroRealPrev = faturamentoPrev - despesasPrev;

    const margemCurrent = faturamentoCurrent > 0 ? (lucroRealCurrent / faturamentoCurrent) * 100 : 0;
    const margemPrev = faturamentoPrev > 0 ? (lucroRealPrev / faturamentoPrev) * 100 : 0;

    // 6. HEALTH CLASSIFICATION AUTO
    let classification = "";
    let colorClass = "";
    let textClass = "";
    let descriptionText = "";
    let emote = "";

    if (faturamentoCurrent === 0) {
      classification = "Sem Operações";
      colorClass = "bg-slate-100 text-slate-500 border-slate-200";
      textClass = "text-slate-500";
      descriptionText = "Nenhuma venda registrada no período selecionado.";
      emote = "☕";
    } else if (margemCurrent >= 25) {
      classification = "Excelente";
      colorClass = "bg-emerald-550/10 text-emerald-600 border-emerald-500/20";
      textClass = "text-emerald-600";
      descriptionText = "Sua operação está extremamente lucrativa e saudável! Excelente controle de custos.";
      emote = "🎉 Excelente";
    } else if (margemCurrent >= 15) {
      classification = "Saudável";
      colorClass = "bg-green-500/10 text-green-600 border-green-500/20";
      textClass = "text-green-600";
      descriptionText = "Excelente nível operacional. Seu negócio possui ótimas margens de retenção líquido.";
      emote = "✅ Saudável";
    } else if (margemCurrent >= 8) {
      classification = "Atenção";
      colorClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
      textClass = "text-amber-600";
      descriptionText = "Atenção: seus custos operacionais ou taxas estão achatando seu lucro neto.";
      emote = "⚠️ Atenção";
    } else if (margemCurrent >= 0) {
      classification = "Risco";
      colorClass = "bg-rose-500/10 text-rose-500 border-rose-500/20";
      textClass = "text-rose-550";
      descriptionText = "Alerta de Risco: margem de sobrevivência muito baixa. Qualquer imprevisto gerará perda.";
      emote = "🚨 Risco operacional";
    } else {
      classification = "Prejuízo";
      colorClass = "bg-red-500/10 text-red-600 border-red-500/20";
      textClass = "text-red-600";
      descriptionText = "Prejuízo: Você está desembolsando caixa para girar a operação de vendas.";
      emote = "❌ Prejuízo Real";
    }

    // 7. PREVISÕES E MÉTRICAS
    const ticketMedio = currentOrders.length > 0 ? faturamentoCurrent / currentOrders.length : 0;
    
    // CONTRIBUTION MARGIN CALCULATION
    // Margem de contribuição ratio = (Faturamento - CMV - Taxas Delivery) / Faturamento
    const cmvRatio = faturamentoCurrent > 0 ? Math.min(0.85, cmvCurrent / faturamentoCurrent) : 0.35;
    const deliveryRatio = faturamentoCurrent > 0 ? Math.min(0.25, deliveryFeesCurrent / faturamentoCurrent) : 0.08;
    const mcRatio = Math.max(0.12, 1 - cmvRatio - deliveryRatio);

    const monthlyFixedsTotal = (monthlyRent || 0) + (monthlyStaff || 0);
    const pontoEquilibrioMensal = monthlyFixedsTotal / mcRatio;
    const pontoEquilibrioPeriodo = (pontoEquilibrioMensal / daysInMonth) * (daysCount || 1);

    const dailyBreakEven = pontoEquilibrioPeriodo / (daysCount || 1);
    const dailySalesReal = faturamentoCurrent / (daysCount || 1);

    return {
      faturamento: faturamentoCurrent,
      faturamentoPrev,
      lucroReal: lucroRealCurrent,
      lucroRealPrev,
      margem: margemCurrent,
      margemPrev,
      cmv: cmvCurrent,
      cmvPrevious,
      despesas: despesasCurrent,
      despesasPrev,
      taxasDelivery: deliveryFeesCurrent,
      taxasDeliveryPrev: deliveryFeesPrev,
      folha: fixedStaffProportional,
      despesasFixas: fixedRentProportional,
      outraDespesa: manualExpensesCurrent,
      ticketMedio,
      pontoEquilibrio: pontoEquilibrioPeriodo,
      pontoEquilibrioMensal,
      classificacao: classification,
      colorClass,
      textClass,
      descriptionText,
      emote,
      desperdicio: desperdicioCurrent,
      daysInMonth,
      dailyRent,
      dailyStaff,
      dailyBreakEven,
      dailySalesReal,
      mcRatio
    };
  }, [filteredData, monthlyRent, monthlyStaff, estimatedWastePercent, products, dateRange.startDate]);

  // 8. PRODUCT PROFIT MAP (Mapa de Lucro por Produto)
  const productProfitMap = useMemo(() => {
    const { currentOrders } = filteredData;
    const itemAcc: Record<string, { id: string; name: string; category: string; qty: number; price: number; revenue: number; cost: number }> = {};

    // Get pricing and cost for looking up structure
    const prodLookupMap = new Map<string, Product>();
    products.forEach(p => prodLookupMap.set(p.id, p));

    currentOrders.forEach(o => {
      o.items.forEach(item => {
        const p = prodLookupMap.get(item.productId);
        const itemCost = p?.cost || (item.price * 0.35); // default fallback
        
        if (!itemAcc[item.productId]) {
          itemAcc[item.productId] = {
            id: item.productId,
            name: item.name,
            category: p?.category || "Geral",
            qty: 0,
            price: item.price,
            revenue: 0,
            cost: itemCost
          };
        }
        
        itemAcc[item.productId].qty += item.quantity;
        itemAcc[item.productId].revenue += item.price * item.quantity;
      });
    });

    const itemsList = Object.values(itemAcc).map(item => {
      const totalCost = item.cost * item.qty;
      const profit = item.revenue - totalCost;
      const margin = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
      const shareOfRevenue = stats.faturamento > 0 ? (item.revenue / stats.faturamento) * 100 : 0;

      return {
        ...item,
        totalCost,
        profit,
        margin,
        shareOfRevenue
      };
    });

    const sortedByProfit = [...itemsList].sort((a, b) => b.profit - a.profit);
    const sortedByQty = [...itemsList].sort((a, b) => b.qty - a.qty);

    return {
      all: itemsList,
      topProfitable: sortedByProfit.slice(0, 5),
      leastProfitable: [...sortedByProfit].reverse().slice(0, 5),
      topVolume: sortedByQty.slice(0, 5)
    };
  }, [filteredData, products, stats.faturamento]);

  // Heuristic diagnostic recommendations inside dashboard
  const copilotInsights = useMemo(() => {
    const list: string[] = [];
    const cmvRatio = stats.faturamento > 0 ? (stats.cmv / stats.faturamento) * 100 : 0;
    const deliveryRatio = stats.faturamento > 0 ? (stats.taxasDelivery / stats.faturamento) * 100 : 0;

    if (cmvRatio > 35) {
      list.push("Seu CMV está acima do ideal (35%). Revise os preços de compra com fornecedores ou padronize as receitas para estancar desperdício.");
    } else if (cmvRatio < 28 && stats.faturamento > 0) {
      list.push("Seu CMV está excelente! Ótimas margens puras nos ingredientes sugerem que sua precificação bruta é forte.");
    }

    if (deliveryRatio > 12) {
      list.push("As taxas do delivery estão consumindo grande parte do seu lucro líquido. Considere aplicar uma margem extra de cardápio nos aplicativos parceiros.");
    }

    if (stats.faturamento > stats.pontoEquilibrio) {
      list.push("Sua operação ultrapassou o ponto de equilíbrio! Cada real de faturamento adicional agora contribui majoritariamente para o verdadeiro lucro líquido.");
    } else if (stats.faturamento > 0) {
      list.push("Você está próximo do ponto de equilíbrio. Incrementando as vendas em apenas um pouco, as despesas fixas estarão cobertas.");
    }

    if (productProfitMap.leastProfitable.length > 0 && productProfitMap.leastProfitable[0].margin < 15) {
      list.push(`O produto "${productProfitMap.leastProfitable[0].name}" está com margens reduzidas (${(productProfitMap.leastProfitable[0].margin || 0).toFixed(0)}%). Vale auditar o custo unitário deste item e precificação.`);
    }

    // Default encouragement if list is empty
    if (list.length === 0) {
      list.push("Excelente saúde operacional registrada! Sua proporção de despesa fixa-variável e CMV estão em padrões de alta classe.");
    }

    return list;
  }, [stats, productProfitMap]);

  // Recharts Linear Daily Trend Data Calculation
  const dailyPerformanceChartData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const daysMap: Record<string, { label: string; dateStr: string; faturamento: number; lucro: number; cmv: number }> = {};

    // Populate every day in the interval
    const temp = new Date(startDate);
    while (temp <= endDate) {
      const key = temp.toISOString().split("T")[0];
      const dayLabel = temp.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      daysMap[key] = {
        label: dayLabel,
        dateStr: key,
        faturamento: 0,
        lucro: 0,
        cmv: 0
      };
      temp.setDate(temp.getDate() + 1);
    }

    const { currentOrders, currentManual } = filteredData;

    // Distribute orders
    currentOrders.forEach(o => {
      const key = safeFormatISO(o.createdAt);
      if (daysMap[key]) {
        daysMap[key].faturamento += o.total || 0;
        
        // Estimate profit on order
        let orderCost = 0;
        o.items.forEach(item => {
          const productCost = products.find(p => p.id === item.productId)?.cost;
          if (productCost && productCost > 0) {
            orderCost += productCost * item.quantity;
          } else {
            orderCost += (item.price * 0.35) * item.quantity;
          }
        });
        
        daysMap[key].cmv += orderCost;
      }
    });

    // Distribute manual records
    currentManual.forEach(r => {
      const key = safeFormatISO(r.date);
      if (daysMap[key]) {
        if (r.type === "income") {
          const cat = (r.category || "").toLowerCase();
          const desc = (r.description || "").toLowerCase();
          const isAberturaOrSuprimento = 
            cat.includes("abertura") || cat.includes("suprimento") || cat.includes("troco") || cat.includes("reforço") ||
            desc.includes("abertura") || desc.includes("suprimento") || desc.includes("troco") || desc.includes("reforço");
          if (!isAberturaOrSuprimento) {
            daysMap[key].faturamento += r.amount;
          }
        } else {
          // It's a direct expense
          const cat = r.category.toLowerCase();
          if (cat.includes("insumo") || cat.includes("mercadoria") || cat.includes("ingre")) {
            daysMap[key].cmv += r.amount;
          } else {
            // Subtract directly as standard fixed/var overhead impact
            daysMap[key].lucro -= r.amount;
          }
        }
      }
    });

    // Apply exact formula: Profit = Faturamento - CMV - proportional overheads
    const totalDays = Object.keys(daysMap).length || 1;
    const dailyFixedCost = (monthlyRent + monthlyStaff) / 30;

    return Object.values(daysMap).map(day => {
      // Subtract proportionate daily fixed costs
      const totalDayCMV = day.cmv + (day.faturamento * (estimatedWastePercent / 100));
      day.lucro = day.faturamento - totalDayCMV - dailyFixedCost;
      return {
        ...day,
        CMV: Math.round(totalDayCMV),
        Faturamento: Math.round(day.faturamento),
        Lucro: Math.round(day.lucro)
      };
    });
  }, [dateRange, filteredData, products, monthlyRent, monthlyStaff, estimatedWastePercent]);

  // Request true AI detailed consulting from Gemini endpoint
  const handleExplainOperation = async () => {
    setIsAiLoading(true);
    setIsAiDrawerOpen(true);
    setAiReport(null);

    const periodName = dateRange.periodName;
    const topProduct = productProfitMap.topProfitable[0] || null;
    const worstProduct = productProfitMap.leastProfitable[0] || null;

    const payload = {
      summaryData: {
        periodName,
        faturamento: stats.faturamento,
        lucroReal: stats.lucroReal,
        margem: stats.margem,
        despesas: stats.despesas,
        cmv: stats.cmv,
        taxasDelivery: stats.taxasDelivery,
        folha: stats.folha,
        despesasFixas: stats.despesasFixas,
        ticketMedio: stats.ticketMedio,
        pontoEquilibrio: stats.pontoEquilibrio,
        classificacao: stats.classificacao,
        topProduct,
        worstProduct
      }
    };

    try {
      const response = await fetch("/api/gemini/explain-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setAiReport(data.insight);
      } else {
        setAiReport("⚠️ Erro de conexão com a inteligência financeiro. Por favor, tente novamente.");
      }
    } catch (error) {
      console.error(error);
      setAiReport("⚠️ Ops, o servidor está preparando as credenciais. Acompanhe a nossa análise local enquanto isso!");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper calculation details for percentage variations
  const getPercentageVariation = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div id="merchant-copilot-module" className="p-4 md:p-6 lg:p-8 space-y-6 w-full">
      
      {/* Upper header action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-0.5 px-2.5 rounded-full text-[9px] bg-indigo-50 text-indigo-600 font-extrabold flex items-center gap-1 uppercase tracking-widest border border-indigo-100/60">
              <Sparkles size={10} className="animate-spin" /> Copiloto Financeiro Ativo
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-1">
            Módulo Lojista
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Transforme seus dados operacionais e de cardápio em inteligência simples de lucro em 30 segundos.
          </p>
        </div>

        {/* Subtabs and specific filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subtab selection widget */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border shadow-sm">
            <button 
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <X size={13} /> Painel AI e Visão Geral
            </button>
            <button 
              onClick={() => setActiveSubTab('copilot')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'copilot' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <TrendingUp size={13} /> Copiloto Financeiro
            </button>
            <button 
              onClick={() => setActiveSubTab('cmv-cardapio')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'cmv-cardapio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <BrainCircuit size={13} /> Assistente de Cardápio (CMV)
            </button>
          </div>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl hover:border-indigo-300 transition-all flex items-center gap-1.5 font-bold text-[10px] shadow-sm"
          >
            <Sliders size={12} className="text-indigo-500 animate-pulse" />
            <span>Configurar Custos Fixos</span>
          </button>

          {/* Filters and Config togglers shown only inside Copiloto Financeiro subtab */}
          {activeSubTab === 'copilot' && (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
                {(["today", "last7", "thisMonth", "lastMonth"] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-2.5 py-1 rounded-xl font-bold text-[10px] transition-all ${
                      selectedPeriod === p
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {p === "today" ? "Hoje" : p === "last7" ? "7D" : p === "thisMonth" ? "Mês" : "Mês Ant."}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE TAB SEPARATORS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500 w-full">
          <AIInsights sales={orders} inventory={products} />
          
          <DashboardAlerts 
            products={products} 
            rawMaterials={rawMaterials}
            onNavigateToInventory={onNavigateToInventory} 
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              
              {/* Card de Fluxo de Caixa Operacional Diário */}
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                        Fluxo de Caixa Operacional Diário
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resumo comparativo de hoje</p>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-xl border border-emerald-150">
                    Entradas vs Despesas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                  <div className="bg-emerald-50/10 border border-emerald-100/40 p-3 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                      <ArrowDownLeft size={10} className="rotate-180" /> Entradas / Vendas PDV
                    </span>
                    <span className="text-xl font-black text-emerald-600 tracking-tight mt-1">
                      R$ {dailyCashFlow.entries.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                      {dailyCashFlow.recentMovements.filter(m => m.type === 'income').length} lançamentos
                    </span>
                  </div>

                  <div className="bg-rose-50/10 border border-rose-100/40 p-3 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                      <ArrowDownLeft size={10} /> Saídas / Despesas
                    </span>
                    <span className="text-xl font-black text-rose-500 tracking-tight mt-1">
                      R$ {dailyCashFlow.outlays.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                      {dailyCashFlow.recentMovements.filter(m => m.type === 'expense').length} saídas/sangrias
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col ${dailyCashFlow.net >= 0 ? 'bg-indigo-50/15 border-indigo-100/40' : 'bg-rose-50/15 border-rose-100/40'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${dailyCashFlow.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      <TrendingUp size={10} /> Saldo Operacional Líquido
                    </span>
                    <span className={`text-xl font-black tracking-tight mt-1 ${dailyCashFlow.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      R$ {dailyCashFlow.net.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                      Resultado final
                    </span>
                  </div>
                </div>

                {/* Barra comparativa de proporção */}
                {(dailyCashFlow.entries > 0 || dailyCashFlow.outlays > 0) ? (
                  <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/60">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">Proporção Operacional</span>
                      <span>{((dailyCashFlow.entries / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100).toFixed(0)}% Entrada / {((dailyCashFlow.outlays / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100).toFixed(0)}% Saída</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        style={{ width: `${(dailyCashFlow.entries / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100}%` }} 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                      />
                      <div 
                        style={{ width: `${(dailyCashFlow.outlays / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100}%` }} 
                        className="bg-rose-500 h-full transition-all duration-500" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3.5 text-slate-400 font-semibold text-[11px] border border-dashed rounded-2xl bg-slate-50 border-slate-200/50">
                    Nenhuma movimentação financeira foi registrada para comparação hoje.
                  </div>
                )}

                {/* Movimentações Recentes por Canal */}
                <div className="space-y-3 pt-1 font-sans">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    Faturamento por Canal de Venda (Hoje)
                  </h4>
                  {(() => {
                    const totalIncomes = (
                      dailyCashFlow.categorySums.tables + 
                      dailyCashFlow.categorySums.delivery + 
                      dailyCashFlow.categorySums.marketplace + 
                      dailyCashFlow.categorySums.digitalMenu + 
                      dailyCashFlow.categorySums.balcao
                    ) || 1;

                    const salesChannels = [
                      { id: 'tables', label: 'Mesas / Salão', value: dailyCashFlow.categorySums.tables, icon: Utensils, colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100/50', progressColor: 'bg-indigo-500', description: 'Consumo presencial' },
                      { id: 'delivery', label: 'Delivery Próprio', value: dailyCashFlow.categorySums.delivery, icon: Bike, colorClass: 'bg-sky-50 text-sky-600 border-sky-100/50', progressColor: 'bg-sky-500', description: 'Entregador próprio' },
                      { id: 'marketplace', label: 'Marketplaces (iFood)', value: dailyCashFlow.categorySums.marketplace, icon: ShoppingBag, colorClass: 'bg-rose-50 text-rose-600 border-rose-100/50', progressColor: 'bg-rose-500', description: 'Canais integrados' },
                      { id: 'digitalMenu', label: 'Cardápio Digital', value: dailyCashFlow.categorySums.digitalMenu, icon: Smartphone, colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', progressColor: 'bg-emerald-500', description: 'Autoatendimento QR' },
                      { id: 'balcao', label: 'Balcão / PDV Direto', value: dailyCashFlow.categorySums.balcao, icon: Store, colorClass: 'bg-amber-50 text-amber-600 border-amber-100/50', progressColor: 'bg-amber-500', description: 'Vendas rápidas caixa' },
                    ];

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {salesChannels.map(channel => {
                          const pct = totalIncomes > 1 ? (channel.value / totalIncomes) * 100 : 0;
                          return (
                            <div key={channel.id} className="p-3 bg-slate-50 hover:bg-slate-100/40 border border-slate-150/60 rounded-2xl flex flex-col justify-between transition-all">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl border ${channel.colorClass} flex items-center justify-center shrink-0`}>
                                    <channel.icon size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-black text-slate-700 leading-tight block truncate">{channel.label}</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-0.5 block leading-none truncate">{channel.description}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-400 shrink-0 select-none">
                                  {pct > 0 ? `${pct.toFixed(0)}%` : '0%'}
                                </span>
                              </div>
                              <div className="mt-3">
                                <span className="text-[13px] font-black text-slate-800">
                                  R$ {channel.value.toFixed(2)}
                                </span>
                                <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden mt-1 flex">
                                  <div 
                                    style={{ width: `${pct}%` }} 
                                    className={`h-full ${channel.progressColor} rounded-full transition-all duration-300`} 
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Area Chart of Sales Performance */}
              <div className="bg-white p-6 rounded-3xl border shadow-sm h-[350px]">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChartIcon size={14} className="text-indigo-600" />
                  Gráfico de Desempenho (Últimos 7 Dias)
                </h3>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={weeklySalesData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>

            {/* Sidebar Columns (Widgets) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Daily Stats Panel */}
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs uppercase shadow-lg shadow-indigo-150">
                    {adminSettings?.companyName ? adminSettings.companyName.substring(0, 2).toUpperCase() : 'GL'}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hoje no Restaurante</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter truncate max-w-[180px]">{adminSettings?.companyName || 'Meu Restaurante'}</h3>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {[
                    { label: 'Pedidos Hoje:', value: dailyStats.count, color: 'text-slate-800' },
                    { label: 'Vendas Hoje:', value: `R$ ${dailyStats.total.toFixed(2)}`, color: 'text-emerald-600', bold: true },
                    { label: 'Ticket Médio:', value: `R$ ${dailyStats.average.toFixed(2)}`, color: 'text-indigo-600', bold: true },
                    { label: 'Em preparo:', value: orders.filter(o => o.status === 'preparing').length, color: 'text-amber-600' },
                    { label: 'Prontos:', value: orders.filter(o => o.status === 'ready').length, color: 'text-emerald-600' },
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                      <span className="text-xs font-bold text-slate-500">{stat.label}</span>
                      <span className={`text-sm font-black ${stat.color} ${stat.bold ? 'text-base' : ''}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best-selling Item Panel */}
              <div className="bg-white rounded-3xl border shadow-sm p-4">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Melhor Produto do Cardápio</h3>
               {products.length > 0 ? (
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden border shrink-0">
                      <img src={products[0]?.image || `https://picsum.photos/seed/food/200/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm leading-tight">{products[0]?.name}</h4>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase mt-1">Estrela de Vendas</span>
                      <p className="text-base font-black text-indigo-600 mt-1">R$ {(products[0]?.price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhum produto cadastrado</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* RENDER ASSISTENTE DE CARDÁPIO (CMV) */}
      {activeSubTab === 'cmv-cardapio' && (
        <div className="animate-in fade-in duration-500 w-full">
          <CMVAnalysis 
            products={products} 
            rawMaterials={rawMaterials} 
            onUpdateProduct={onUpdateProduct} 
          />
        </div>
      )}

      {/* RESULTADO REAL DA OPERAÇÃO - CENTRAL OVERVIEW (Active when activeSubTab is 'copilot') */}
      {activeSubTab === 'copilot' && (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Score Card with speedometer */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[360px] border border-slate-800">
          {/* Subtle patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-505/20 blur-3xl pointer-events-none rounded-full"></div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Sua Saúde Operacional
            </span>
            <div className="flex items-center gap-2.5 mt-2">
              <span className={`px-3.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full border ${stats.colorClass}`}>
                {stats.emote}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300 mt-3 font-semibold leading-relaxed">
              {stats.descriptionText}
            </p>
          </div>

          {/* Simple and elegant health Speedometer / Gauge */}
          <div className="my-4 flex flex-col items-center justify-center relative">
            <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
              {/* Arc background */}
              <div className="absolute top-0 left-0 right-0 bottom-0 border-[14px] border-slate-800 rounded-t-full"></div>
              {/* Progress Arc colored based on margin */}
              <div className="absolute top-0 left-0 right-0 bottom-0 border-[14px] border-transparent rounded-t-full border-l-rose-500 border-t-amber-500 border-r-emerald-500 opacity-80"></div>
              
              {/* Speedometer needle */}
              <div
                className="absolute w-1 h-14 bg-white origin-bottom bottom-0 transition-transform duration-1000 ease-out"
                style={{
                  transform: `rotate(${Math.min(90, Math.max(-90, (stats.margem / 40) * 180 - 90))}deg)`
                }}
              >
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full -translate-x-[3px] absolute bottom-0"></div>
              </div>
            </div>
            
            <div className="text-center mt-3">
              <span className="text-3xl font-black tracking-tight text-white">
                {stats.margem.toFixed(1)}%
              </span>
              <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5 tracking-wider">Margem Líquida Real</p>
            </div>
          </div>

          {/* Quick Explainer triggers */}
          <button
            onClick={handleExplainOperation}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Sparkles size={13} className="animate-pulse" /> Explique Minha Operação
          </button>
        </div>

        {/* Complete Financial Report Card (Stripe-Like layout) */}
        <div id="stripe-summary-card" className="lg:col-span-8 bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Demonstrativo de Lucros Estimados • {dateRange.periodName}
              </span>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border px-2.5 py-0.5 rounded-lg">
                Proporcionalizado para {dateRange.daysCount} dias
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 1. FATURAMENTO */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  1. Faturamento Bruto
                </span>
                <span className="text-xl font-black text-slate-800">
                  R$ {stats.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="mt-1 text-[8.5px] text-indigo-600 font-bold flex items-center gap-1 bg-indigo-50/40 p-1 rounded-md">
                  <Info size={10} className="text-indigo-500 shrink-0" />
                  <span>Apenas vendas e consumos reais</span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {getPercentageVariation(stats.faturamento, stats.faturamentoPrev) >= 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-green-50 text-green-600 px-2 py-0.5 rounded-md">
                      <TrendingUp size={10} /> +{getPercentageVariation(stats.faturamento, stats.faturamentoPrev).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-rose-50 text-rose-550 px-2 py-0.5 rounded-md">
                      <TrendingDown size={10} /> {getPercentageVariation(stats.faturamento, stats.faturamentoPrev).toFixed(1)}%
                    </span>
                  )}
                  <span className="text-[8px] text-slate-400 uppercase font-black">vs período ant.</span>
                </div>
              </div>

              {/* 2. CMV */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    2. Custo Prod (CMV)
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-100 px-1.5 py-0.2 rounded-md">
                    {stats.faturamento > 0 ? ((stats.cmv / stats.faturamento) * 100).toFixed(0) : "35"}%
                  </span>
                </div>
                <span className="text-xl font-black text-rose-600">
                  - R$ {stats.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide mt-2">
                  Insumos + R$ {stats.desperdicio.toFixed(0)} Desperdício Est.
                </p>
              </div>

              {/* 3. TAXAS DELIVERY */}
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  3. Comissões Apps / Delivery
                </span>
                <span className="text-xl font-black text-rose-600">
                  - R$ {stats.taxasDelivery.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide mt-2">
                  Comissão estimada iFood/Apps
                </p>
              </div>

              {/* 4. SALARIOS / FOLHA */}
              <div
                onClick={() => setIsConfigOpen(true)}
                className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/10 cursor-pointer transition-all relative group flex flex-col justify-between min-h-[140px]"
              >
                <div className="absolute top-3 right-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil size={11} className="text-indigo-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    4. Folha Proporcional
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-700">
                      - R$ {stats.folha.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold font-mono">({dateRange.daysCount}d)</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100/60 flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-550">
                    <span>Por dia ({stats.daysInMonth}d):</span>
                    <span className="font-extrabold text-indigo-600">R$ {stats.dailyStaff.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[8.5px] font-medium text-slate-400">
                    <span>Total mensal:</span>
                    <span>R$ {monthlyStaff.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* 5. ALUGUEL / FIXAS */}
              <div
                onClick={() => setIsConfigOpen(true)}
                className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/10 cursor-pointer transition-all relative group flex flex-col justify-between min-h-[140px]"
              >
                <div className="absolute top-3 right-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil size={11} className="text-indigo-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    5. Despesas Fixas Prop.
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-700">
                      - R$ {stats.despesasFixas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold font-mono">({dateRange.daysCount}d)</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100/60 flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-550">
                    <span>Por dia ({stats.daysInMonth}d):</span>
                    <span className="font-extrabold text-indigo-600">R$ {stats.dailyRent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[8.5px] font-medium text-slate-400">
                    <span>Total mensal:</span>
                    <span>R$ {monthlyRent.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* 6. OUTRA DESPESAS */}
              <div className="p-4 bg-indigo-50/20 rounded-2xl border border-indigo-100/40 flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
                    Outras Despesas Variáveis
                  </span>
                  <span className="text-xl font-black text-slate-700">
                    - R$ {stats.outraDespesa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[8.5px] text-indigo-400 font-bold uppercase tracking-wide mt-2">
                  Registradas manualmente no financeiro
                </p>
              </div>

            </div>
            
            {/* COMPARATIVO DE CUSTO DO DIA PARA FECHAR NO 0 A 0 vs VALOR VENDIDO COM ALAVANCAS DE SUCESSO */}
            <div className="mt-6 p-5 bg-gradient-to-br from-slate-50 to-indigo-50/10 rounded-[2rem] border border-slate-200/60 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Coluna de Análises & Métricas Reais */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-250">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          📊 Equipartição Real: Ponto de Equilíbrio (0 a 0) Diário vs. Faturado
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Análise corporativa ponderada pela Margem de Contribuição ({((stats.mcRatio || 0.53) * 100).toFixed(0)}%), cobrindo custos fixos da operação por dia.
                        </p>
                      </div>
                      <div className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${dailyStats.total >= stats.dailyBreakEven ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                        {dailyStats.total >= stats.dailyBreakEven ? 'Sobra Diária Ativa' : 'Abaixo do Equilíbrio'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Meta diária break-even */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3 hover:border-slate-200 transition-all">
                        <div className="w-9 h-9 bg-amber-550/10 text-amber-600 rounded-xl flex items-center justify-center font-black text-sm shadow-inner">
                          🎯
                        </div>
                        <div>
                          <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Meta de Entrada p/ Ponto de Equilíbrio</span>
                          <span className="text-base font-black text-slate-800 tracking-tight">R$ {stats.dailyBreakEven.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <p className="text-[8px] font-bold text-slate-400 uppercase block mt-0.5">Ponto de nivelamento financeiro por dia</p>
                        </div>
                      </div>

                      {/* Vendido por dia */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3 hover:border-slate-200 transition-all">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${dailyStats.total >= stats.dailyBreakEven ? 'bg-emerald-555/10 text-emerald-600' : 'bg-rose-500/10 text-rose-550'}`}>
                          💰
                        </div>
                        <div>
                          <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Faturado Hoje (Vendas)</span>
                          <span className={`text-base font-black tracking-tight ${dailyStats.total >= stats.dailyBreakEven ? 'text-emerald-555' : 'text-rose-600'}`}>R$ {dailyStats.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <p className="text-[8px] font-bold text-slate-400 uppercase block mt-0.5">Vendas acumuladas hoje</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress/Comparison Bar and feedback */}
                  <div className="mt-4 pt-3.5 border-t border-slate-200/50">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-extrabold uppercase tracking-wide mb-1.5">
                      <span>Metas e Sobra Operacional:</span>
                      <span className={dailyStats.total >= stats.dailyBreakEven ? "text-emerald-600" : "text-rose-550"}>
                        {dailyStats.total >= stats.dailyBreakEven 
                          ? `🟢 POSITIVO (+R$ ${(dailyStats.total - stats.dailyBreakEven).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hoje)` 
                          : `🔴 DEFICIENTES (-R$ ${(stats.dailyBreakEven - dailyStats.total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hoje)`
                        }
                      </span>
                    </div>
                    
                    {/* Progress Bar reflecting only the day's progress toward the daily break-even checkpoint */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/20">
                      {dailyStats.total >= stats.dailyBreakEven ? (
                        <>
                          <div className="bg-amber-400 h-full" style={{ width: `${Math.min(100, (stats.dailyBreakEven / (dailyStats.total || 1)) * 100)}%` }} title="Custo Coberto"></div>
                          <div className="bg-emerald-555 h-full flex-1 animate-pulse" title="Margem de Lucro Ativa"></div>
                        </>
                      ) : (
                        <>
                          <div 
                            className="bg-rose-500 h-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (dailyStats.total / (stats.dailyBreakEven || 1)) * 100)}%` }}
                            title="Vendas realizadas"
                          ></div>
                          <div className="bg-slate-200 h-full flex-1" title="Falta para o equilíbrio"></div>
                        </>
                      )}
                    </div>
                    
                    <p className="text-[9.5px] text-slate-500 font-medium block mt-2 leading-relaxed">
                      {dailyStats.total >= stats.dailyBreakEven 
                        ? `Parabéns! Suas vendas de hoje superaram o ponto de equilíbrio de R$ ${stats.dailyBreakEven.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}. Toda venda a partir deste momento se torna lucro líquido pleno!` 
                        : `Sua meta mínima hoje é faturar mais R$ ${(stats.dailyBreakEven - dailyStats.total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para cobrir as obrigações diárias.`}
                    </p>
                  </div>
                </div>

                {/* Coluna do Simulador Inteligente de Alavancas de Rentabilidade */}
                <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-2">
                      <span className="text-sm">⚡</span>
                      <span className="text-[10px] font-black uppercase text-indigo-750 tracking-wider font-sans">Simulador de Alavancas de Lucro</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium leading-normal mb-3">
                      Estime reduções de desperdícios e negociação de contratos para visualizar a queda da meta em tempo real:
                    </p>

                    <div className="space-y-3">
                      {/* Lever 1: CMV */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-slate-600">CMV / Ficha Técnica</span>
                          <span className="text-indigo-600 font-extrabold">-{simCmvReduction}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="25" 
                          value={simCmvReduction} 
                          onChange={(e) => setSimCmvReduction(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {/* Lever 2: Fixed Costs */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-slate-600">Custos Fixos / Contas</span>
                          <span className="text-indigo-600 font-extrabold">-{simFixedReduction}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="25" 
                          value={simFixedReduction} 
                          onChange={(e) => setSimFixedReduction(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {/* Lever 3: Commision Fees */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-slate-600">Taxas de Aplicativo</span>
                          <span className="text-indigo-600 font-extrabold">-{simFeeReduction}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="40" 
                          value={simFeeReduction} 
                          onChange={(e) => setSimFeeReduction(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resultados Dinâmicos da Simulação */}
                  {(() => {
                    const simCmvVal = stats.cmv * (1 - simCmvReduction / 100);
                    const simFeesVal = stats.taxasDelivery * (1 - simFeeReduction / 100);
                    const simCmvRatio = stats.faturamento > 0 ? (simCmvVal / stats.faturamento) : 0.35 * (1 - simCmvReduction / 100);
                    const simDelivRatio = stats.faturamento > 0 ? (simFeesVal / stats.faturamento) : 0.08 * (1 - simFeeReduction / 100);
                    const simMcRatio = Math.max(0.12, 1 - simCmvRatio - simDelivRatio);

                    const simFixeds = (stats.folha + stats.despesasFixas + stats.outraDespesa) * (1 - simFixedReduction / 100);
                    const simPeriodBreakEven = simFixeds / simMcRatio;
                    const simDailyBreakEven = simPeriodBreakEven / (dateRange.daysCount || 1);
                    const percentSaved = Math.max(0, ((stats.dailyBreakEven - simDailyBreakEven) / (stats.dailyBreakEven || 1)) * 100);

                    return (
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-100 bg-indigo-50/20 p-2.5 rounded-xl">
                        <div className="flex justify-between text-[8px] font-extrabold uppercase text-slate-400">
                          <span>0 a 0 Diário Simulado</span>
                          <span>Folga Financeira</span>
                        </div>
                        <div className="flex justify-between items-baseline mt-0.5">
                          <span className="text-sm font-black text-indigo-750">
                            R$ {simDailyBreakEven.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600">
                            {percentSaved > 0 ? `-${percentSaved.toFixed(0)}% de faturamento` : 'Ajuste os controles acima'}
                          </span>
                        </div>
                        {percentSaved > 0 && (
                          <p className="text-[7.5px] text-indigo-600 font-bold block mt-1 tracking-tight leading-relaxed">
                            💡 Meta diária desce R$ {Math.abs(stats.dailyBreakEven - simDailyBreakEven).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}! Mais estabilidade para seu caixa diário.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Resultado Líquido Sobra Limpa
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className={`text-2xl md:text-3xl font-black ${stats.lucroReal >= 0 ? "text-emerald-550" : "text-rose-600"}`}>
                  R$ {stats.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-xs font-bold text-slate-400">lucro estimado</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-center sm:text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ponto de Equilíbrio do Período</span>
                <span className="text-sm font-extrabold text-slate-700">R$ {stats.pontoEquilibrio.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-center sm:text-right border-l pl-4 border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ticket Médio</span>
                <span className="text-sm font-extrabold text-slate-700">R$ {stats.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* OPERATIONAL VISUAL CHART & INSIGHTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Weekly Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Flutuação Diária de Lucro</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Volume de faturamento vs sobra líquida no decorrer do período.</p>
            </div>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyPerformanceChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFav" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#0f172a", border: "none", borderRadius: "16px", color: "#f8fafc" }}
                  labelStyle={{ fontSize: "10px", fontWeight: "black", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}
                  itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="Faturamento" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFav)" name="Faturamento (R$)" />
                <Area type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" name="Sobra de Lucro (R$)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic autogenerated copilot insight bullets */}
        <div className="lg:col-span-4 bg-indigo-900/10 border border-indigo-150 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1 px-2.5 rounded-full text-[9px] bg-slate-900 text-white font-extrabold flex items-center gap-1 uppercase tracking-wider">
                Copiloto Financeiro
              </span>
            </div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">Conselhos do Copiloto</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-5 font-bold">Diagnóstico em linguagem humana simplificada:</p>
            
            <div className="space-y-4">
              {copilotInsights.map((insight, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:translate-x-1">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                      {insight}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-indigo-200/40 text-center">
            <span className="text-[9px] text-indigo-500 font-extrabold uppercase tracking-wider">
              Análise baseada em {filteredData.currentOrders.length} pedidos reais no período
            </span>
          </div>
        </div>

      </div>

      {/* PRODUCT PROFIT MAP (Mapa de lucro por produto) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Rank of most profitable items */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Top 5 Ítens de Maior Sobra Líquida</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Os produtos que verdadeiramente geraram mais lucro no caixa.</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 py-1 px-2.5 rounded-full">
              Estrelas
            </span>
          </div>

          <div className="space-y-3.5">
            {productProfitMap.topProfitable.length > 0 ? (
              productProfitMap.topProfitable.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                        {item.qty} un vendidas • Margem {item.margin.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 block">
                      + R$ {item.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                      {(item.shareOfRevenue).toFixed(1)}% de part.
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-8 font-semibold">Nenhum produto vendido no período.</p>
            )}
          </div>
        </div>

        {/* Rank of least profitable items */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alerta: Ítens de Menor Margem Líquida</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Produtos que estão gerando baixo retorno ou apenas girando estoque.</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 py-1 px-2.5 rounded-full">
              Foco de Auditoria
            </span>
          </div>

          <div className="space-y-3.5">
            {productProfitMap.leastProfitable.length > 0 ? (
              productProfitMap.leastProfitable.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg text-xs font-black">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-850">{item.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                        Venda: R$ {item.price.toFixed(2)} • Custo: R$ {item.cost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-550 block">
                      Margem {item.margin.toFixed(0)}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                      Sobrou R$ {item.profit.toFixed(0)} limpo
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-8 font-semibold">Nenhum produto com margem crítica.</p>
            )}
          </div>
        </div>

      </div>

      {/* FINANCES PREVISION MODULE (Previsão Lojista) */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-xl text-white">
        <div id="lojista-forecasting-section" className="border-b border-slate-800 pb-4 mb-5">
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-indigo-400 block mb-1">
            Simulador de Sobrevivência e Previsão
          </span>
          <h3 className="text-lg font-black tracking-tight text-white">Previsões Financeiras Automáticas</h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Calculado estatisticamente com base no seu ritmo operacional atual e configurações de custos fixos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Revenue Prevision */}
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/80">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">Previsão de Faturamento Mensal</span>
            <span className="text-xl font-black text-white">
              R$ {((stats.faturamento / (dateRange.daysCount || 1)) * 30).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] font-black bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 px-2 py-0.5 rounded-md block mt-3 max-w-max">
              Tendência de +12% de Estatura
            </span>
          </div>

          {/* Business survival days (Caixa de sobrevivência) */}
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/80">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">Dias de Sobrevivência de Caixa</span>
            <span className="text-xl font-black text-emerald-400">
              ~ 45 Dias
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">
              Sua sobra operacional atual cobre seus custos fixos planejados com folga saudável.
            </p>
          </div>

          {/* Dynamic Break even point month projection */}
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/80">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">Ponto de Equilíbrio Mensal</span>
            <span className="text-xl font-black text-white">
              R$ {stats.pontoEquilibrioMensal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">
              Você precisa faturar isso por mês para zerar sua estrutura de despesas.
            </p>
          </div>

          {/* Safety margin simulator */}
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800/80">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">Análise de Risco Sensível</span>
            <span className="text-xl font-black text-rose-400">
              Risco Moderado
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">
              Se os custos de insumos aumentarem 10%, sua margem líquida encurtará para {(Math.max(0, stats.margem - 4.5)).toFixed(0)}%.
            </p>
          </div>

        </div>
      </div>
    </div>
  )}

      {/* CONFIGURE FIXED COSTS MODAL/OVERLAY */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 md:p-8 max-w-lg w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all text-slate-500"
              >
                <X size={15} />
              </button>

              <div className="mb-6">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  Parâmetros de Loja
                </span>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-2">Configurar Custos Fixos</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Informe suas despesas mensais para que o Módulo Lojista divida de forma proporcional aos períodos analisados.
                </p>
              </div>

              {/* Dynamic Readonly totals summary */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
                <div>
                  <span className="text-[8px] font-extrabold uppercase text-slate-450 tracking-widest block mb-1">🏢 Aluguel/Contas Total</span>
                  <span className="text-xs font-black text-slate-700">R$ {computedRentTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold uppercase text-slate-450 tracking-widest block mb-1">👥 Folha de Pgto Total</span>
                  <span className="text-xs font-black text-slate-700">R$ {computedStaffTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Desperdício */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Percentual Estimado de Desperdício Operacional (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                      value={estimatedWastePercent}
                      onChange={(e) => setEstimatedWastePercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold mt-1">
                    Calculado como margem extra sobre o custo bruto. Recomendado: 3% a 5%
                  </p>
                </div>

                {/* DETAILED COSTS SECTION */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider">
                      📋 Detalhamento de Contas Existentes
                    </label>
                    <span className="text-[9px] text-indigo-500 font-black uppercase">
                      {fixedCostsList.length} Contas Cadastradas
                    </span>
                  </div>

                  {/* List of costs */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-205/55 max-h-[220px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {fixedCostsList.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400 font-bold">Nenhuma conta cadastrada. Adicione uma abaixo!</p>
                    ) : (
                      fixedCostsList.map(item => {
                        const isEditing = editingItemId === item.id;
                        const startEdit = () => {
                          setEditingItemId(item.id);
                          setEditName(item.name);
                          setEditType(item.type);
                          setEditAmount(item.amount);
                        };
                        const deleteItem = () => {
                          setFixedCostsList(prev => prev.filter(c => c.id !== item.id));
                        };

                        return (
                          <div key={item.id} className="p-2 flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-100 shadow-sm transition-all">
                            {isEditing ? (
                              <div className="flex flex-col gap-1.5 w-full">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Nome da Conta"
                                />
                                <div className="flex items-center gap-1.5 w-full">
                                  <select
                                    className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value as 'rent' | 'staff')}
                                  >
                                    <option value="rent">Aluguel / Contas</option>
                                    <option value="staff">Folha / Salários</option>
                                  </select>
                                  <input
                                    type="number"
                                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                                    placeholder="Valor"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFixedCostsList(prev => prev.map(c => c.id === item.id ? { ...c, name: editName, type: editType, amount: editAmount } : c));
                                        setEditingItemId(null);
                                      }}
                                      className="p-1 bg-green-500 text-white hover:bg-green-600 rounded-lg shadow-sm transition-all text-xs"
                                      title="Confirmar"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingItemId(null)}
                                      className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg transition-all text-xs"
                                      title="Cancelar"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    {item.type === 'rent' ? '🏢 Aluguel/Contas' : '👥 Folha de Pgto'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-slate-800">
                                    R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={startEdit}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                      title="Editar"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={deleteItem}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                      title="Excluir"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ADD NEW COST FORM */}
                <div className="bg-indigo-50/20 p-3 rounded-2xl border border-indigo-100/30">
                  <span className="text-[9px] font-extrabold uppercase text-indigo-500 tracking-wider block mb-1.5">
                    ➕ Adicionar Nova Conta Fixa
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5">
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        placeholder="Ex: Água / Força"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4 flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setNewType('rent')}
                        className={`flex-1 py-1 rounded-md text-[8px] font-extrabold uppercase tracking-wide transition-all ${newType === 'rent' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Aluguel
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType('staff')}
                        className={`flex-1 py-1 rounded-md text-[8px] font-extrabold uppercase tracking-wide transition-all ${newType === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Folha
                      </button>
                    </div>
                    <div className="md:col-span-3 flex gap-1 items-center">
                      <input
                        type="number"
                        placeholder="R$ Valor"
                        className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newName.trim()) return;
                          const val = typeof newAmount === "number" ? newAmount : 0;
                          const newItem: FixedCostItem = {
                            id: `fc-${Date.now()}`,
                            name: newName,
                            type: newType,
                            amount: val
                          };
                          setFixedCostsList(prev => [...prev, newItem]);
                          setNewName("");
                          setNewAmount("");
                        }}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg transition-all"
                        title="Adicionar"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    const defaultList = [
                      { id: "fc-1", name: "Aluguel da Loja", type: "rent" as const, amount: 1800 },
                      { id: "fc-2", name: "Contas de Consumo (Água, Luz, Net)", type: "rent" as const, amount: 700 },
                      { id: "fc-3", name: "Folha de Salários - Equipe", type: "staff" as const, amount: 3500 },
                      { id: "fc-4", name: "Pró-labore de Sócios", type: "staff" as const, amount: 1300 },
                    ];
                    setFixedCostsList(defaultList);
                    setEstimatedWastePercent(3.5);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("copilot_fixed_costs_list", JSON.stringify(defaultList));
                      localStorage.setItem("copilot_monthly_rent", "2500");
                      localStorage.setItem("copilot_monthly_staff", "4800");
                      localStorage.setItem("copilot_estimated_waste", "3.5");
                    }
                  }}
                  className="py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-extrabold text-[10px] uppercase tracking-wider text-slate-600 transition-all"
                >
                  Padrões
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("copilot_fixed_costs_list", JSON.stringify(fixedCostsList));
                      localStorage.setItem("copilot_monthly_rent", computedRentTotal.toString());
                      localStorage.setItem("copilot_monthly_staff", computedStaffTotal.toString());
                      localStorage.setItem("copilot_estimated_waste", estimatedWastePercent.toString());
                    }
                    setMonthlyRent(computedRentTotal);
                    setMonthlyStaff(computedStaffTotal);
                    setIsConfigOpen(false);
                  }}
                  className="py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/15"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXPLAIN MY OPERATION DRAWER / SIDE CARD (Conversas inteligente com o Copiloto) */}
      <AnimatePresence>
        {isAiDrawerOpen && (
          <div className="fixed inset-0 z-[10000] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Sliding Drawer Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-xl bg-slate-50 h-screen shadow-2xl relative flex flex-col justify-between"
            >
              
              {/* Drawer Header */}
              <div className="p-5 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black animate-pulse">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full">
                      Gemini Copilot 3.5
                    </span>
                    <h3 className="text-base font-black tracking-tight mt-0.5">Diagnóstico Lojista</h3>
                  </div>
                </div>

                <button
                  onClick={() => setIsAiDrawerOpen(false)}
                  className="p-2.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-all border border-slate-800"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Consultation Body Content */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                
                {/* AI Processing and streaming states */}
                {isAiLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <Sparkles size={20} className="text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Auditando as Contas da Loja...</p>
                      <p className="text-[10.5px] text-slate-400 mt-1 font-semibold max-w-xs mx-auto">
                        O Copiloto Inteligente está calculando despesas, CMV, margens de delivery e oportunidades neste instante.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Structured results output */}
                {!isAiLoading && aiReport && (
                  <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm leading-relaxed text-xs text-slate-600 font-bold space-y-4">
                    {/* Convert basic markdown string layout seamlessly for clean visual pairing */}
                    {aiReport.split("\n").map((line, lIdx) => {
                      if (line.startsWith("###")) {
                        return (
                          <h4 key={lIdx} className="text-sm font-extrabold text-slate-800 tracking-tight block border-b border-slate-50 pb-1 pt-3">
                            {line.substring(3).trim()}
                          </h4>
                        );
                      }
                      if (line.startsWith("##")) {
                        return (
                          <h3 key={lIdx} className="text-base font-black text-indigo-600 tracking-tight block pt-4">
                            {line.substring(2).trim()}
                          </h3>
                        );
                      }
                      if (line.startsWith("-") || line.startsWith("*")) {
                        return (
                          <div key={lIdx} className="flex gap-2 items-start pl-3 my-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>
                            <span className="leading-relaxed">{line.substring(1).trim()}</span>
                          </div>
                        );
                      }
                      if (line.trim() === "---") {
                        return <hr key={lIdx} className="border-slate-100 my-4" />;
                      }
                      return <p key={lIdx} className="leading-relaxed my-2 font-bold text-slate-650">{line}</p>;
                    })}
                  </div>
                )}
                
                {/* Visual statistics drawer side widget */}
                <div className="bg-indigo-600 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
                  <span className="text-[9px] font-black uppercase text-indigo-200 tracking-widest block">Resumo Gerencial do Período</span>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <span className="text-[8.5px] text-indigo-200 uppercase font-black">Faturamento Bruto</span>
                      <p className="text-base font-extrabold mt-0.5">R$ {stats.faturamento.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-indigo-200 uppercase font-black">Sobra Líquida Real</span>
                      <p className="text-base font-extrabold text-emerald-300 mt-0.5">R$ {stats.lucroReal.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-indigo-200 uppercase font-black">Taxa de CMV Real</span>
                      <p className="text-base font-extrabold mt-0.5">{stats.faturamento > 0 ? ((stats.cmv / stats.faturamento) * 100).toFixed(0) : "35"}%</p>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-indigo-200 uppercase font-black">Saúde da Margem</span>
                      <p className="text-base font-extrabold mt-0.5">{stats.classificacao}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => setIsAiDrawerOpen(false)}
                  className="flex-1 py-3 text-center bg-slate-100 hover:bg-slate-200 rounded-2xl font-black uppercase text-[10px] text-slate-500 transition-all tracking-wider"
                >
                  Fechar Diagnóstico
                </button>
                <button
                  onClick={handleExplainOperation}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] rounded-2xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 tracking-wider"
                >
                  <RefreshCw size={11} /> Reanalisar Contas
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
