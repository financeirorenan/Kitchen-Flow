import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Order, Product, FinancialRecord, AdminSettings, RawMaterial, Tenant, Plan, User } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
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
  Target,
  ShieldCheck,
  Zap,
  Store,
  Utensils,
  Bike,
  Smartphone,
  BrainCircuit,
  BarChart as BarChartIcon,
  Pencil,
  Plus,
  Trash2,
  Check,
  MessageSquare,
  Bot,
  Package,
  Receipt
} from "lucide-react";
import { StockAnalyst } from "./StockAnalyst";
import { FiscalEngineModule } from "./FiscalEngineModule";
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
import KaiAvatar, { KaiExpression, KaiPose } from "./KaiAvatar";

const getSafeDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        return isNaN(d.getTime()) ? null : d;
      } catch {
        // ignore
      }
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val._seconds === 'number') {
      const d = new Date(val._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const getOrderSafeDate = (o: Order): Date | null => {
  return getSafeDate(o.paidAt || o.finishedAt || o.deliveredAt || o.createdAt);
};

const isCompletedOrder = (o: Order): boolean => {
  if (o.status === "cancelled" || o.isSubTicket || o.mergedIntoOrderId) return false;
  return o.status === "finished" || o.status === "delivered" || o.paymentStatus === "paid";
};

const isOrderOrSaleRecord = (r: FinancialRecord): boolean => {
  if (r.orderId) return true;
  const cat = (r.category || "").toLowerCase();
  const desc = (r.description || "").toLowerCase();
  return (
    cat.startsWith("venda") ||
    cat.startsWith("pedido") ||
    cat.includes("vendas pdv") ||
    cat.includes("venda balcão") ||
    cat.includes("venda delivery") ||
    cat.includes("vendas balcão / mesas") ||
    desc.startsWith("pedido #") ||
    desc.startsWith("venda #")
  );
};

const isAberturaOrSuprimentoRecord = (r: FinancialRecord): boolean => {
  const cat = (r.category || "").toLowerCase();
  const desc = (r.description || "").toLowerCase();
  return (
    cat.includes("abertura") || cat.includes("suprimento") || cat.includes("troco") || cat.includes("reforço") ||
    desc.includes("abertura") || desc.includes("suprimento") || desc.includes("troco") || desc.includes("reforço")
  );
};

const formatLocalDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safeFormatISO = (val: any) => {
  const d = getSafeDate(val) || new Date();
  return formatLocalDateKey(d);
};

interface LojistaCopilotProps {
  tenantId?: string;
  orders: Order[];
  products: Product[];
  manualRecords: FinancialRecord[];
  adminSettings: AdminSettings;
  rawMaterials: RawMaterial[];
  onUpdateProduct: (product: Product) => void;
  onNavigateToInventory: () => void;
  tenantData?: Tenant | null;
  plans?: Plan[];
  saasConfig?: {
    excedentOrderPrice: number;
    maxExtraOrdersLimit: number;
    enableExtraOrdersLimit: boolean;
    volumeDiscounts: { threshold: number; discountPercent: number }[];
  } | null;
  currentUser?: User;
  onUpdateSettings?: (settings: AdminSettings) => void;
}

type PeriodType = "today" | "last7" | "thisMonth" | "lastMonth";

export default function LojistaCopilot({
  tenantId,
  orders = [],
  products = [],
  manualRecords = [],
  adminSettings,
  rawMaterials = [],
  onUpdateProduct,
  onNavigateToInventory,
  tenantData = null,
  plans = [],
  saasConfig = null,
  currentUser,
  onUpdateSettings
}: LojistaCopilotProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("today");

  // Subscription / usage details calculation
  const subscriptionStats = useMemo(() => {
    if (!tenantData) return null;
    const planName = tenantData.subscription?.plan || 'START';
    const activePlans = plans || [];
    
    // Find current plan
    const currentPlan = activePlans.find(p => p.name.toUpperCase() === planName.toUpperCase() || p.id === tenantData.subscription?.planId);
    const basePrice = currentPlan?.price || (planName.toUpperCase() === 'START' ? 149.90 : 249.90);
    const maxOrders = (currentPlan?.maxOrders !== undefined && currentPlan?.maxOrders !== null) ? currentPlan.maxOrders : (planName.toUpperCase() === 'START' ? 500 : 1000);
    const isUnlimited = maxOrders === 0 || maxOrders >= 99999;
    
    // Count orders in current month
    const now = new Date();
    const currentMonthOrders = orders.filter(o => {
      if (o.isSubTicket || o.mergedIntoOrderId || o.status === 'cancelled') return false;
      if (!o.createdAt) return false;
      const oDate = o.createdAt instanceof Date ? o.createdAt : (typeof (o.createdAt as any)?.toDate === 'function' ? (o.createdAt as any).toDate() : new Date(o.createdAt));
      if (!oDate || isNaN(oDate.getTime())) return false;
      return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
    });
    const ordersUsed = currentMonthOrders.length;
    const isExcedent = !isUnlimited && ordersUsed > maxOrders;
    const excedentCount = isExcedent ? ordersUsed - maxOrders : 0;
    
    // Calculate excedent cost
    const rate = saasConfig?.excedentOrderPrice !== undefined ? saasConfig.excedentOrderPrice : 0.20;
    let rawExcedentCost = excedentCount * rate;
    
    // Apply volume discounts
    let discountPercent = 0;
    const discounts = saasConfig?.volumeDiscounts || [];
    const activeDiscountTier = [...discounts]
      .sort((a, b) => b.threshold - a.threshold) // sort desc to get the highest matched threshold
      .find(tier => excedentCount >= tier.threshold);
      
    if (activeDiscountTier) {
      discountPercent = activeDiscountTier.discountPercent;
    }
    
    const discountAmount = rawExcedentCost * (discountPercent / 100);
    const finalExcedentCost = rawExcedentCost - discountAmount;
    const totalInvoiceEstimated = basePrice + finalExcedentCost;
    const percentUsed = isUnlimited ? 0 : (maxOrders > 0 ? (ordersUsed / maxOrders) * 100 : 0);
    
    // Look for smart upgrade suggestion
    let nextPlan = null;
    let upgradeRecommended = false;
    
    if (!isUnlimited) {
      // Find plans priced higher than current plan, sorted by price ascending
      const higherPlans = activePlans
        .filter(p => p.price > basePrice && p.active !== false)
        .sort((a, b) => a.price - b.price);
        
      if (higherPlans.length > 0) {
        const targetPlan = higherPlans[0];
        const priceDifference = targetPlan.price - basePrice;
        const thresholdAmount = priceDifference * 0.70;
        
        if (finalExcedentCost >= thresholdAmount) {
          nextPlan = targetPlan;
          upgradeRecommended = true;
        }
      }
    }
    
    return {
      planName,
      currentPlan,
      basePrice,
      maxOrders,
      ordersUsed,
      percentUsed,
      isExcedent,
      excedentCount,
      rate,
      rawExcedentCost,
      discountPercent,
      discountAmount,
      finalExcedentCost,
      totalInvoiceEstimated,
      nextPlan,
      upgradeRecommended,
      isUnlimited
    };
  }, [tenantData, plans, orders, saasConfig]);
  
  interface FixedCostItem {
    id: string;
    name: string;
    type: 'rent' | 'staff';
    amount: number;
  }

  const activeTenantId = tenantId || tenantData?.id || currentUser?.tenantId || 't1';

  const [fixedCostsList, setFixedCostsList] = useState<FixedCostItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`copilot_fixed_costs_list_${activeTenantId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [
      { id: `fc-1-${activeTenantId}`, name: "Aluguel da Loja", type: "rent", amount: 1800 },
      { id: `fc-2-${activeTenantId}`, name: "Contas de Consumo (Água, Luz, Net)", type: "rent", amount: 700 },
      { id: `fc-3-${activeTenantId}`, name: "Folha de Salários - Equipe", type: "staff", amount: 3500 },
      { id: `fc-4-${activeTenantId}`, name: "Pró-labore de Sócios", type: "staff", amount: 1300 },
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

  // Custom fixed monthly costs derived directly from lojista config
  const monthlyRent = computedRentTotal;
  const monthlyStaff = computedStaffTotal;

  const [estimatedWastePercent, setEstimatedWastePercent] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`copilot_estimated_waste_${activeTenantId}`);
      return saved ? parseFloat(saved) : 3.5;
    }
    return 3.5;
  });

  // Re-sync when activeTenantId changes so switching lojistas loads each lojista's isolated costs
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedList = localStorage.getItem(`copilot_fixed_costs_list_${activeTenantId}`);
      if (savedList) {
        try {
          setFixedCostsList(JSON.parse(savedList));
        } catch (e) {
          console.error(e);
        }
      } else {
        setFixedCostsList([
          { id: `fc-1-${activeTenantId}`, name: "Aluguel da Loja", type: "rent", amount: 1800 },
          { id: `fc-2-${activeTenantId}`, name: "Contas de Consumo (Água, Luz, Net)", type: "rent", amount: 700 },
          { id: `fc-3-${activeTenantId}`, name: "Folha de Salários - Equipe", type: "staff", amount: 3500 },
          { id: `fc-4-${activeTenantId}`, name: "Pró-labore de Sócios", type: "staff", amount: 1300 },
        ]);
      }

      const savedWaste = localStorage.getItem(`copilot_estimated_waste_${activeTenantId}`);
      setEstimatedWastePercent(savedWaste ? parseFloat(savedWaste) : 3.5);
    }
  }, [activeTenantId]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Estados de Simulação Financeira Interativa ("Alavancas de Lucro")
  const [simCmvReduction, setSimCmvReduction] = useState(0); // redução de 0% a 30% no CMV
  const [simFixedReduction, setSimFixedReduction] = useState(0); // redução de 0% a 30% nas despesas fixas
  const [simFeeReduction, setSimFeeReduction] = useState(0); // redução de 0% a 50% nas taxas de entrega

  // AI Consultation States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  
  // Kai Local Chat States
  const [kaiPose, setKaiPose] = useState<KaiPose>('tudo-sob-controle');
  const [kaiExpression, setKaiExpression] = useState<KaiExpression>('feliz');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'kai'; text: string; pose?: KaiPose; expression?: KaiExpression }[]>([
    {
      sender: 'kai',
      text: `Olá lojista! Eu sou o Kai, seu analista e Copiloto de Inteligência Operacional. 🤖💡

Estou aqui para rodar diagnósticos em tempo real, efetuar projeções e tirar dúvidas estratégicas sobre a sua loja de forma 100% inteligente!

Podemos conversar sobre como reduzir seu CMV, planejar o faturamento para bater o ponto de equilíbrio, criar combos rentáveis com pratos âncoras, ou ajustar insumos críticos do seu estoque.

Como posso te ajudar a lucrar mais hoje? Pergunte abaixo ou clique em uma das sugestões rápidas!`,
      pose: 'tudo-sob-controle',
      expression: 'feliz'
    }
  ]);
  const [userQuery, setUserQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'copilot' | 'cmv-cardapio' | 'chatbot' | 'analista-estoque' | 'fiscal'>('copilot');
  const [isMobileAppMode, setIsMobileAppMode] = useState(false);

  const chatEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeSubTab]);

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
      if (isCompletedOrder(order)) {
        const orderDate = getOrderSafeDate(order);
        if (orderDate) {
          const dayMatch = last7Days.find(d => 
            d.date.getDate() === orderDate.getDate() && 
            d.date.getMonth() === orderDate.getMonth() &&
            d.date.getFullYear() === orderDate.getFullYear()
          );
          if (dayMatch) {
            dayMatch.sales += order.total || 0;
          }
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
      if (!isCompletedOrder(o)) return false;
      const d = getOrderSafeDate(o);
      return d && d >= today;
    });

    return {
      total: todayOrders.reduce((acc, o) => acc + (o.total || 0), 0),
      count: todayOrders.length,
      average: todayOrders.length > 0 ? todayOrders.reduce((acc, o) => acc + (o.total || 0), 0) / todayOrders.length : 0
    };
  }, [orders]);

  // Top Selling Product based on real completed orders
  const topSellingProduct = useMemo(() => {
    const counts: Record<string, { qty: number; revenue: number; name: string }> = {};
    orders.forEach(o => {
      if (o.status === 'cancelled' || o.isSubTicket || o.mergedIntoOrderId) return;
      (o.items || []).forEach(item => {
        const id = item.productId || item.id || item.name;
        if (!counts[id]) {
          counts[id] = { qty: 0, revenue: 0, name: item.name };
        }
        counts[id].qty += item.quantity || 1;
        counts[id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1].qty - a[1].qty);
    if (sorted.length > 0) {
      const topId = sorted[0][0];
      const topInfo = sorted[0][1];
      const matchedProd = products.find(p => p.id === topId || p.name.toLowerCase() === topInfo.name.toLowerCase());
      return {
        name: matchedProd?.name || topInfo.name,
        price: matchedProd?.price || (topInfo.qty > 0 ? topInfo.revenue / topInfo.qty : 0),
        image: matchedProd?.image || 'https://picsum.photos/seed/food/200/200',
        qtySold: topInfo.qty,
        revenue: topInfo.revenue
      };
    }
    if (products.length > 0) {
      return {
        name: products[0].name,
        price: products[0].price || 0,
        image: products[0].image || 'https://picsum.photos/seed/food/200/200',
        qtySold: 0,
        revenue: 0
      };
    }
    return null;
  }, [orders, products]);

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
    let startDate: Date;
    let endDate: Date;
    let periodName = "";
    let previousStartDate: Date;
    let previousEndDate: Date;
    let daysCount = 30;

    switch (selectedPeriod) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodName = "Hoje";
        daysCount = 1;
        
        // Previous period = Yesterday
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case "last7":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodName = "Últimos 7 dias";
        daysCount = 7;

        // Previous period = 7 days before
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodName = "Este Mês";
        
        // Days difference until today or full month
        const endDay = now.getDate();
        daysCount = endDay;

        // Previous period = previous month same wide
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, endDay, 23, 59, 59, 999);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        periodName = "Mês Passado";
        daysCount = endDate.getDate();

        // Previous period = 2 months ago
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodName = "Este Mês";
        daysCount = now.getDate();
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);
        break;
    }

    return { startDate, endDate, periodName, daysCount, previousStartDate, previousEndDate };
  }, [selectedPeriod]);

  // Filters records & orders by selected date range
  const filteredData = useMemo(() => {
    const { startDate, endDate, previousStartDate, previousEndDate, daysCount } = dateRange;

    // Filter completed/delivered/paid orders (excluding cancelled, sub-tickets, or merged) in current and previous window
    const currentOrders = orders.filter(o => {
      if (!isCompletedOrder(o)) return false;
      const d = getOrderSafeDate(o);
      if (!d) return false;
      return d >= startDate && d <= endDate;
    });

    const previousOrders = orders.filter(o => {
      if (!isCompletedOrder(o)) return false;
      const d = getOrderSafeDate(o);
      if (!d) return false;
      return d >= previousStartDate && d <= previousEndDate;
    });

    // Filter financial manual records
    const currentManual = manualRecords.filter(r => {
      const d = getSafeDate(r.date);
      if (!d) return false;
      return d >= startDate && d <= endDate;
    });

    const previousManual = manualRecords.filter(r => {
      const d = getSafeDate(r.date);
      if (!d) return false;
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
      .filter(r => r.type === "income" && !isOrderOrSaleRecord(r) && !isAberturaOrSuprimentoRecord(r))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const faturamentoCurrent = salesTotal + manualIncome;

    const prevSalesTotal = previousOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevManualIncome = previousManual
      .filter(r => r.type === "income" && !isOrderOrSaleRecord(r) && !isAberturaOrSuprimentoRecord(r))
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

  // Real-time metrics for Today, Yesterday and Monthly summary (for Kai Chatbot context)
  const kaiMetrics = useMemo(() => {
    const now = new Date();
    
    // Today Range (midnight to end of day)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Yesterday Range (yesterday midnight to yesterday end)
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    
    // This Month Range (1st of month to end of month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const calculateStatsForRange = (startDate: Date, endDate: Date) => {
      const currentOrders = orders.filter(o => {
        if (!isCompletedOrder(o)) return false;
        const d = getOrderSafeDate(o);
        if (!d) return false;
        return d >= startDate && d <= endDate;
      });

      const currentManual = manualRecords.filter(r => {
        const d = getSafeDate(r.date);
        if (!d) return false;
        return d >= startDate && d <= endDate;
      });

      // Calculate days count
      const daysCount = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Gross faturamento
      const salesTotal = currentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const manualIncome = currentManual
        .filter(r => r.type === "income" && !isOrderOrSaleRecord(r) && !isAberturaOrSuprimentoRecord(r))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      const faturamento = salesTotal + manualIncome;

      // CMV
      const productCostMap = new Map<string, number>();
      products.forEach(p => {
        productCostMap.set(p.id, p.cost || 0);
      });

      let cmvValue = 0;
      currentOrders.forEach(o => {
        (o.items || []).forEach(item => {
          const cost = productCostMap.get(item.productId);
          if (cost && cost > 0) {
            cmvValue += cost * (item.quantity || 0);
          } else {
            cmvValue += ((item.price || 0) * 0.35) * (item.quantity || 0);
          }
        });
      });

      const desperdicio = faturamento * (estimatedWastePercent / 100);
      cmvValue += desperdicio;

      // Delivery Fees
      const deliveryFees = currentOrders.reduce((sum, o) => {
        if (o.source && ["iFood", "partner_app", "marketplace"].includes(o.source)) {
          return sum + (o.marketplaceFee || ((o.total || 0) * 0.12));
        }
        return sum;
      }, 0);

      // Proportional fixed costs
      const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate() || 30;
      const dailyRent = (monthlyRent || 0) / daysInMonth;
      const dailyStaff = (monthlyStaff || 0) / daysInMonth;
      const fixedRentProportional = dailyRent * daysCount;
      const fixedStaffProportional = dailyStaff * daysCount;

      // Other expenses
      const manualExpenses = currentManual
        .filter(r => r.type === "expense")
        .filter(r => {
          const cat = (r.category || "").toLowerCase();
          return !cat.includes("salário") && !cat.includes("aluguel") && !cat.includes("folha") && !cat.includes("pro-labore");
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const despesas = cmvValue + deliveryFees + fixedRentProportional + fixedStaffProportional + manualExpenses;
      const lucroReal = faturamento - despesas;
      const margem = faturamento > 0 ? (lucroReal / faturamento) * 100 : 0;

      return {
        faturamento,
        lucroReal,
        margem,
        cmv: cmvValue,
        despesas,
        taxasDelivery: deliveryFees,
        folha: fixedStaffProportional,
        despesasFixas: fixedRentProportional,
        outraDespesa: manualExpenses,
        orderCount: currentOrders.length
      };
    };

    return {
      hoje: calculateStatsForRange(todayStart, todayEnd),
      ontem: calculateStatsForRange(yesterdayStart, yesterdayEnd),
      mes: calculateStatsForRange(monthStart, monthEnd)
    };
  }, [orders, products, manualRecords, monthlyRent, monthlyStaff, estimatedWastePercent]);

  // Recharts Linear Daily Trend Data Calculation
  const dailyPerformanceChartData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const daysMap: Record<string, { label: string; dateStr: string; faturamento: number; lucro: number; cmv: number }> = {};

    // Populate every day in the interval
    const temp = new Date(startDate);
    while (temp <= endDate) {
      const key = formatLocalDateKey(temp);
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
      const orderDate = getOrderSafeDate(o);
      const key = safeFormatISO(orderDate);
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
          if (!isOrderOrSaleRecord(r) && !isAberturaOrSuprimentoRecord(r)) {
            daysMap[key].faturamento += r.amount || 0;
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

  // Stock Stats (Dormant Capital) - Alinhado 100% com o Analista de Estoque (StockAnalyst)
  const stockStats = useMemo(() => {
    // 1. Insumos reais (rawMaterials) ou Produtos como fallback
    const actualItems = (rawMaterials && rawMaterials.length > 0)
      ? rawMaterials.map(rm => ({
          id: rm.id,
          name: rm.name,
          stock: rm.currentStock || 0,
          cost: rm.costPerUnit || 0,
          lastDate: rm.lastPurchaseDate ? new Date(rm.lastPurchaseDate) : null
        }))
      : (products || []).map(p => ({
          id: p.id,
          name: p.name,
          stock: (p as any).stockQuantity ?? p.stock ?? 0,
          cost: (p as any).costPrice ?? p.cost ?? 0,
          lastDate: (p as any).updatedAt ? new Date((p as any).updatedAt) : null
        }));

    let totalStockValue = 0;
    let dormantStockValue = 0;
    let dormantItemsCount = 0;

    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    actualItems.forEach((item) => {
      const val = item.stock * item.cost;
      totalStockValue += val;

      if (item.stock > 0 && val > 0) {
        const isDormant = !item.lastDate || item.lastDate < fifteenDaysAgo;
        if (isDormant) {
          dormantStockValue += val;
          dormantItemsCount++;
        }
      }
    });

    // Se dormantStockValue for 0 mas houver estoque investido (ex: sem data registrada), exibe o estoque acumulado total como capital parado
    if (dormantStockValue === 0 && totalStockValue > 0) {
      dormantStockValue = totalStockValue;
      dormantItemsCount = actualItems.filter(i => i.stock > 0 && (i.stock * i.cost) > 0).length;
    }

    return { totalStockValue, dormantStockValue, dormantItemsCount };
  }, [rawMaterials, products]);

  // Courier Stats (Logistics Payouts) filtered by selected date range
  const courierStats = useMemo(() => {
    let totalCourierFee = 0;
    let pendingCourierFee = 0;
    let settledCourierFee = 0;
    let totalDeliveryFee = 0;

    (filteredData.currentOrders || []).forEach((o) => {
      if (o.deliveryFee) {
        totalDeliveryFee += Number(o.deliveryFee);
      }
      if (o.courierFee) {
        const fee = Number(o.courierFee);
        totalCourierFee += fee;
        if (o.courierSettled) {
          settledCourierFee += fee;
        } else {
          pendingCourierFee += fee;
        }
      }
    });

    return { totalCourierFee, pendingCourierFee, settledCourierFee, totalDeliveryFee };
  }, [filteredData.currentOrders]);

  // Request 100% Offline Real-Time AI Business Diagnostic from Kai
  const handleExplainOperation = () => {
    setIsAiLoading(true);
    setIsAiDrawerOpen(true);
    setAiReport(null);
    setKaiPose('analisando-dados');
    setKaiExpression('analisando');

    const periodName = dateRange.periodName;
    const topProduct = productProfitMap.topProfitable[0] || null;
    const worstProduct = productProfitMap.leastProfitable[0] || null;

    // Simulate real-time processing in 900ms
    setTimeout(() => {
      const faturamento = stats.faturamento || 0;
      const lucroReal = stats.lucroReal || 0;
      const margem = stats.margem || 0;
      const despesas = stats.despesas || 0;
      const cmv = stats.cmv || 0;
      const taxasDelivery = stats.taxasDelivery || 0;
      const ticketMedio = stats.ticketMedio || 0;
      const pontoEquilibrio = stats.pontoEquilibrio || 0;
      const classificacao = stats.classificacao || "Em Crescimento";

      const localAnalysis = `### 🐙 Diagnóstico Completo do Kai | Analista Residente

Olá! Eu sou o **Kai**, o seu analista de inteligência em tempo real. Fiz uma auditoria instantânea e minuciosa de todos os seus dados operacionais no período **${periodName}** diretamente no seu dispositivo. 

Sua operação está classificada hoje como **${classificacao}** com uma taxa de retorno líquida estimada em **${margem.toFixed(1)}%**. Abaixo, apresento o raio-x exato da sua rentabilidade e os passos para otimizar suas margens:

---

### 🟢 Pontos de Destaque (Alta Performance)
1. **${topProduct ? `Estrela de Vendas: ${topProduct.name}` : 'Excelente Mix de Vendas'}**: Este item lidera a geração de sobra líquida, trazendo margens saudáveis e alto giro. Ele é um pilar vital para manter o estabelecimento lucrativo.
2. **Giro Financeiro**: Seu faturamento de **R$ ${faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** demonstra boa atração de clientes.
3. **Ticket Médio**: Com uma média de **R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** por pedido, você possui uma base estável para expandir táticas de upselling e ofertas complementares.
4. **Ponto de Equilíbrio Superado**: Seu custo fixo totalizando aluguel e equipe exige um ponto de equilíbrio operacional de **R$ ${pontoEquilibrio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**. Ao ultrapassar essa marca, sua operação passou a reter lucro limpo de verdade!

---

### ⚠️ Pontos Críticos (Onde O Lucro Está Escapando)
1. **Pressão no CMV de Insumos**: Suas despesa líquida em custos de mercadoria vendida (CMV) representa **R$ ${cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** (aproximadamente **${faturamento > 0 ? ((cmv / faturamento) * 100).toFixed(1) : '33.0'}%** da receita bruta). Fora da meta ideal de 28% a 32%, o peso de matérias-primas e desperdícios está comprometendo a margem líquida.
2. **Impacto das Comissões de Delivery**: Taxas e tarifas de entregadores externas somaram **R$ ${taxasDelivery.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** neste período. É crucial repassar esse custo de plataforma de forma correspondente para os clientes do canal digital.
3. **${worstProduct ? `Inconsistência de Margem no item: ${worstProduct.name}` : 'Baixa eficiência em itens de cardápio'}**: Este produto está rodando com margem unitária perigosamente espremida devido à escalada no custo dos ingredientes ou preço final defasado.

---

### 💡 Plano de Ação Imediato do Kai
- **Avançar no CMV de Insumos**: Padronize as fichas técnicas e utilize porcionadores na cozinha. Reduzir em apenas 2% o desperdício adicionará **R$ ${(faturamento * 0.02).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** direto ao seu bolso!
- **Diferenciação de Canal**: Pratique preços de 12% a 18% superiores nos aplicativos de delivery para cobrir integralmente as taxas dessas plataformas. Ofereça vantagens exclusivas no cardápio próprio/local.
- **Tática de Combos de Alto Giro**: Monte combinações estratégicas aliando sua "Estrela" com um item de baixíssimo custo e alta margem de contribuição (como bebidas ou batatas fritas artesanais). 

*Como sou um analista no seu navegador, você pode usar o chat abaixo para me perguntar qualquer estratégia específica! O que quer ajustar agora?*`;

      setAiReport(localAnalysis);
      setKaiPose('tudo-sob-controle');
      setKaiExpression('feliz');
      setIsAiLoading(false);

      // Start conversational log
      setChatMessages([
        {
          sender: 'kai',
          text: `Olá! Sou o Kai e já concluí o diagnóstico completo para o período ${periodName}. A margem média está em ${margem.toFixed(1)}%. Veja o relatório principal acima e use este chat para conversamos sobre as suas metas operacionais! Como posso te ajudar a lucrar mais?`,
          pose: 'tudo-sob-controle',
          expression: 'feliz'
        }
      ]);
    }, 950);
  };

  // Helper calculation details for percentage variations
  const getPercentageVariation = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Chat conversation engine for Kai (Local reasoning and server-side Gemini intelligence)
  const handleSendChat = async (customText?: string) => {
    const textToSend = (customText || userQuery).trim();
    if (!textToSend) return;

    // Append user message
    setChatMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    setUserQuery("");
    setIsChatLoading(true);

    const lowercaseQuery = textToSend.toLowerCase();
    
    // Choose specific pose for Kai while thinking
    setKaiPose('analisando-dados');
    setKaiExpression('analisando');

    try {
      // 1. Prepare payload elements
      const summaryPayload = {
        periodName: dateRange.periodName,
        faturamento: stats.faturamento,
        lucroReal: stats.lucroReal,
        margem: stats.margem,
        classificacao: stats.classificacao,
        cmv: stats.cmv,
        taxasDelivery: stats.taxasDelivery,
        folha: stats.folha,
        despesasFixas: stats.despesasFixas,
        despesas: stats.despesas,
        ticketMedio: stats.ticketMedio,
        pontoEquilibrio: stats.pontoEquilibrio,
        topProduct: productProfitMap.topProfitable[0] ? { name: productProfitMap.topProfitable[0].name, qty: productProfitMap.topProfitable[0].qty, price: productProfitMap.topProfitable[0].price, cost: productProfitMap.topProfitable[0].cost } : null,
        worstProduct: productProfitMap.leastProfitable[0] ? { name: productProfitMap.leastProfitable[0].name, qty: productProfitMap.leastProfitable[0].qty, price: productProfitMap.leastProfitable[0].price, cost: productProfitMap.leastProfitable[0].cost } : null
      };

      // Get last 6 messages as context history
      const slicedHistory = chatMessages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));

      // 2. Fetch response from server-side endpoint
      const response = await fetch("/api/gemini/chat-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: slicedHistory,
          summaryData: summaryPayload,
          kaiMetrics: kaiMetrics
        })
      });

      if (!response.ok) {
        throw new Error("API response error");
      }

      const data = await response.json();
      if (data.success) {
        setChatMessages(prev => [...prev, {
          sender: 'kai',
          text: data.text,
          pose: data.pose,
          expression: data.expression
        }]);
        setKaiPose(data.pose);
        setKaiExpression(data.expression);
      } else {
        throw new Error("Chat copilot returned success: false");
      }
    } catch (err) {
      console.error("Error communicating with Kai API, falling back to offline reasoning:", err);
      // Fallback local heuristic reasoning
      let responseText = "";
      let responsePose: KaiPose = 'tudo-sob-controle';
      let responseExpression: KaiExpression = 'feliz';

      const faturamento = stats.faturamento || 0;
      const cmv = stats.cmv || 0;
      const worstProduct = productProfitMap.leastProfitable[0] || null;
      const topProduct = productProfitMap.topProfitable[0] || null;
      const targetCmvValue = faturamento * 0.30; 

      if (lowercaseQuery.includes("cmv") || lowercaseQuery.includes("custo de mercadoria") || lowercaseQuery.includes("reduzir")) {
        responseText = `Entendido! Reduzir o **CMV (Custo de Mercadoria Vendida)** é a forma mais rápida de colocar mais dinheiro no bolso do lojista. 
        
No seu faturamento atual de **R$ ${faturamento.toLocaleString("pt-BR") || '0,00'}**, seu CMV atual está em R$ ${cmv.toLocaleString("pt-BR")}. Se reduzirmos isso para a nossa meta teórica de 30% (R$ ${targetCmvValue.toLocaleString("pt-BR")}), você economizará **R$ ${(Math.max(0, cmv - targetCmvValue)).toLocaleString("pt-BR")}** adicionais de lucro líquido!

**Aqui estão as 4 diretrizes de ouro para atingir isso hoje na cozinha:**
1. **Ficha Técnica Rígida**: Cada prato deve ter gramatura exata. Use balanças no porcionamento!
2. **Negociação em Lote**: Seus principais ingredientes devem ser cotados com múltiplos fornecedores toda terça-feira.
3. **Mapeie o Lixo**: Use a aba de Estoque para registrar o desperdício diário (ex: sobras de preparo, produtos vencidos).
4. **Cardápio Inteligente**: Promova pratos com ingredientes sazonais/baratos e margem robusta!`;
        responsePose = 'controle-estoque';
        responseExpression = 'concentrado';
      } 
      else if (lowercaseQuery.includes("hoje") || lowercaseQuery.includes("dia")) {
        const hoje = kaiMetrics.hoje;
        responseText = `### 📅 Relatório Operacional de Hoje:
- **Faturamento de Hoje**: R$ ${hoje.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Lucro Líquido de Hoje**: R$ ${hoje.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Margem Líquida**: ${hoje.margem.toFixed(1)}%
- **Pedidos**: ${hoje.orderCount}

${hoje.lucroReal >= 0 
  ? `🟢 Muito bem! Hoje a operação está rodando no azul com uma excelente margem operacional!` 
  : `⚠️ Atenção: A operação de hoje está abaixo do ponto de equilíbrio necessário devido às taxas e custos fixos proporcionais do dia.`}`;
        responsePose = 'gestao-pedidos';
        responseExpression = hoje.lucroReal >= 0 ? 'feliz' : 'alerta';
      }
      else if (lowercaseQuery.includes("ontem")) {
        const ontem = kaiMetrics.ontem;
        responseText = `### 📅 Fechamento de Ontem:
- **Faturamento de Ontem**: R$ ${ontem.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Lucro Líquido de Ontem**: R$ ${ontem.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Margem Líquida**: ${ontem.margem.toFixed(1)}%
- **Pedidos**: ${ontem.orderCount}

${ontem.lucroReal >= 0 
  ? `🟢 Excelente! Ontem a operação terminou positiva no azul.` 
  : `⚠️ Ontem fechamos no vermelho. Vamos reverter esses resultados na operação de hoje!`}`;
        responsePose = 'planejamento';
        responseExpression = ontem.lucroReal >= 0 ? 'feliz' : 'concentrado';
      }
      else if (lowercaseQuery.includes("mês") || lowercaseQuery.includes("mensal") || lowercaseQuery.includes("faturamento do mes")) {
        const mes = kaiMetrics.mes;
        responseText = `### 📊 Balanço Acumulado do Mês:
- **Faturamento Bruto**: R$ ${mes.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Lucro Líquido**: R$ ${mes.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Margem Média**: ${mes.margem.toFixed(1)}%
- **Pedidos do Mês**: ${mes.orderCount}

Sua saúde financeira acumulada este mês está classificada como **${mes.margem >= 15 ? 'Excelente 🟢' : mes.margem >= 8 ? 'Estável ⚠️' : 'Crítica 🚨'}**.`;
        responsePose = 'analisando-dados';
        responseExpression = 'feliz';
      }
      else if (lowercaseQuery.includes("vermelho") || lowercaseQuery.includes("equilibrio") || lowercaseQuery.includes("ponto") || lowercaseQuery.includes("despesas")) {
        const fixedCosts = stats.folha + stats.despesasFixas;
        responseText = `Excelente pergunta! Vamos auditar o seu faturamento de equilíbrio:

Sua estrutura atual possui **R$ ${(fixedCosts).toLocaleString("pt-BR")}** em gastos estruturais (equipe + despesas fixas) proporcionalmente às datas visualizadas.
Seu ponto de equilíbrio atual é de **R$ ${stats.pontoEquilibrio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**.

Para ficar totalmente tranquilo ("no azul"), você precisa atingir uma média de faturamento diária de **R$ ${(stats.pontoEquilibrio / dateRange.daysCount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**. Qualquer venda acima disso flui quase integralmente para o lucro, exceto o valor cru dos ingredientes! No momento, seu ritmo operacional está ${faturamento >= stats.pontoEquilibrio ? "🟢 **Superando** com folga a meta de equilíbrio!" : "⚠️ **Abaixo** do ponto de equilíbrio. Precisamos impulsionar as vendas físicas e delivery!"}`;
        responsePose = 'planejamento';
        responseExpression = 'alerta';
      } 
      else if (lowercaseQuery.includes("combo") || lowercaseQuery.includes("ticket") || lowercaseQuery.includes("médio")) {
        responseText = `A criação de **combos inteligentes** é fantástica para subir o ticket médio sem espremer o CMV!

No momento, o seu ticket médio está em **R$ ${stats.ticketMedio.toLocaleString("pt-BR") || '0,00'}**. 

${topProduct ? `Podemos usar o seu prato estrela **"${topProduct.name}"** como âncora do combo!` : "Podemos usar o prato mais vendido da sua cozinha como âncora do combo!"}

**Esquema de Combo Lucrativo do Kai:**
1. **Prato Principal**: Seu campeão de vendas.
2. **Acompanhamento de Alto Retorno**: Adicione um item de ultra-baixo custo de insumo (ex: batata frita artesanal, anéis de cebola ou porção de molho caseiro). Custam centavos de CMV, mas agregam valor percebido.
3. **Bebida Rentável**: Bebidas têm CMV de apenas 35% e zero esforço de preparo na cozinha.
*Se o cliente comprar o prato isolado por R$ 35, ganha R$ 10 de lucro. Adicionando R$ 12 pelo combo inteiro, o lucro líquido salta para R$ 18!*`;
        responsePose = 'gestao-pedidos';
        responseExpression = 'feliz';
      } 
      else if (lowercaseQuery.includes("critico") || lowercaseQuery.includes("produto") || lowercaseQuery.includes("ajuste")) {
        responseText = `Vamos focar no saneamento de margem!
        
${worstProduct ? `O seu produto mais crítico no momento é o **"${worstProduct.name}"**, que rodou com margem de apenas **${worstProduct.margin.toFixed(0)}%**.` : "Não identifiquei nenhum produto crítico grave nas vendas do período, o que é excelente!"}

**Como consertamos isso sem espantar os clientes:**
1. **Redimensionar porção**: Em vez de aumentar o preço, diminua levemente a gramatura da proteína principal em 10% (quase imperceptível visualmente, mas reduz o CMV imediatamente).
2. **Substituir componentes caros**: Se usa um queijo importado ou marca premium, cote marcas nacionais equivalentes que mantenham o sabor original.
3. **Ajuste Cirúrgico**: Faça uma correção de 5% a 8% apenas na plataforma de delivery. Os clientes em canais online são menos sensíveis a pequenas variações que auxiliam a equilibrar as comissões.`;
        responsePose = 'na-cozinha';
        responseExpression = 'concentrado';
      } 
      else if (lowercaseQuery.includes("delivery") || lowercaseQuery.includes("taxa") || lowercaseQuery.includes("entrega")) {
        responseText = `O canal de delivery é importante para expandir o faturamento, mas cobra um preço alto do lojista. Suas despesas com delivery somaram **R$ ${stats.taxasDelivery.toLocaleString("pt-BR")}** neste período.

**Estratégia Local do Kai para conter essas comissões:**
1. **Precificação Espelho Diferenciada**: Sempre suba os preços do menu online de 12% a 15% em relação ao menu presencial físico. Isso zera as comissões abusivas repassando de forma transparente.
2. **Cupom de Fidelidade Local**: Coloque um panfleto especial na sacola com QR Code para o seu cardápio digital próprio (WhatsApp ou menu local) oferecendo 10% de desconto no primeiro pedido direto. Você retém o cliente sem pagar e-marketplaces!
3. **Praça Própria**: Para clientes que moram até 2km de distância, tente contratar motoboy direto para reduzir comissões por distância.`;
        responsePose = 'gestao-pedidos';
        responseExpression = 'neutro';
      } 
      else {
        responseText = `Que excelente pauta de negócios! Como o seu analista de IA offline residente, estou sempre pronto para processar dados de faturamento, metas, estoque de matérias-primas e mesas. 

Para aumentar a eficiência da sua cozinha, recomendo focar nas seguintes ações hoje:
1. Cadastrar corretamente todos os custos de matérias-primas na aba de CMV para que eu possa entregar dados ainda mais precisos.
2. Acompanhar as metas diárias de vendas para garantir que as despesas fixas (folha de pagamento de R$ ${stats.folha.toLocaleString("pt-BR")} e fixos) sejam cobertas com folga.
3. Use os botões abaixo para obter insights instantâneos rápidos!`;
        responseExpression = 'feliz';
        responsePose = 'tudo-sob-controle';
      }

      setChatMessages(prev => [...prev, {
        sender: 'kai',
        text: responseText,
        pose: responsePose,
        expression: responseExpression
      }]);
      setKaiPose(responsePose);
      setKaiExpression(responseExpression);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isMobileAppMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] py-6 bg-slate-100/30 rounded-3xl p-4 border border-dashed border-slate-200 animate-in fade-in duration-500">
        <div className="max-w-md w-full mb-4 flex items-center justify-between px-2">
          <div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> PWA Simulado Ativo
            </span>
            <h2 className="text-sm font-black text-slate-850">KitchenFlow Lojista App</h2>
          </div>
          <button
            onClick={() => setIsMobileAppMode(false)}
            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            Sair do Modo App (Voltar p/ Web)
          </button>
        </div>

        {/* Smartphone Frame Simulator */}
        <div className="w-full max-w-[390px] h-[800px] bg-slate-950 rounded-[3.2rem] p-3.5 shadow-2xl border-4 border-slate-900 relative flex flex-col overflow-hidden">
          {/* Speaker & Camera Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <div className="w-12 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Screen Content Wrapper */}
          <div className="flex-1 bg-slate-900 text-white rounded-[2.5rem] flex flex-col overflow-hidden relative border border-slate-800">
            {/* Safe Area Header */}
            <div className="pt-8 pb-3 px-5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Store size={14} className="text-[#00B7FF]" />
                <span className="font-black text-xs uppercase tracking-wider max-w-[140px] truncate">{adminSettings?.companyName || "Minha Loja"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Inner App Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-20">
              {activeSubTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 mb-2">
                    <LayoutDashboard size={14} className="text-[#00B7FF]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diagnóstico da Operação</span>
                  </div>
                  <AIInsights sales={orders} inventory={products} />
                  <DashboardAlerts products={products} rawMaterials={rawMaterials} onNavigateToInventory={onNavigateToInventory} />
                </div>
              )}

              {activeSubTab === 'copilot' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp size={14} className="text-[#00B7FF]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sua Saúde Operacional</span>
                  </div>
                  
                  {/* Miniature score card */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 block">MARGEM LÍQUIDA REAL</span>
                    <span className="text-2xl font-black text-white block mt-0.5">{stats.margem.toFixed(1)}%</span>
                    <p className="text-[10px] text-slate-300 leading-normal mt-2 font-medium">{stats.descriptionText}</p>
                    <button
                      onClick={handleExplainOperation}
                      className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                    >
                      <Sparkles size={11} className="animate-pulse" /> Analisar com Kai
                    </button>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3.5">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase border-b border-slate-900 pb-1.5">Resumo Financeiro</span>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase block">Faturamento</span>
                        <span className="text-xs font-black text-white">R$ {stats.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase block">Margem CMV</span>
                        <span className="text-xs font-black text-rose-400">R$ {stats.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase block">Custos Fixos</span>
                        <span className="text-xs font-black text-slate-400">R$ {(stats.folha + stats.despesasFixas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase block">Sobra Limpa</span>
                        <span className={`text-xs font-black ${stats.lucroReal >= 0 ? "text-emerald-400" : "text-rose-500"}`}>R$ {stats.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit projections */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Previsão Mensal</span>
                    <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                      <span className="text-[8px] text-slate-400 uppercase block">Faturamento Previsto (30 dias)</span>
                      <span className="text-lg font-black text-emerald-400">R$ {((stats.faturamento / (dateRange.daysCount || 1)) * 30).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'analista-estoque' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package size={14} className="text-[#00B7FF]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analista de Estoque</span>
                  </div>
                  <div className="bg-white text-slate-900 rounded-3xl p-3 shadow-md">
                    <StockAnalyst products={products} orders={orders} rawMaterials={rawMaterials} />
                  </div>
                </div>
              )}

              {activeSubTab === 'cmv-cardapio' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BrainCircuit size={14} className="text-[#00B7FF]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cardápio & CMV</span>
                  </div>
                  <div className="bg-white text-slate-900 rounded-3xl p-3 shadow-md">
                    <CMVAnalysis products={products} rawMaterials={rawMaterials} onUpdateProduct={onUpdateProduct} />
                  </div>
                </div>
              )}

              {activeSubTab === 'chatbot' && (
                <div className="flex flex-col h-[520px] bg-slate-950 rounded-3xl border border-slate-800/80 overflow-hidden">
                  <div className="p-3 bg-slate-900/80 border-b border-slate-800/50 flex items-center gap-2">
                    <KaiAvatar expression="feliz" pose="tudo-sob-controle" size={28} />
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-white leading-none">Copiloto Kai</h4>
                      <span className="text-[8px] text-slate-400">Análise de negócios ativo</span>
                    </div>
                  </div>
                  
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender !== 'user' && (
                          <div className="shrink-0 mt-0.5 scale-75 origin-top-left">
                            <KaiAvatar expression={msg.expression || 'neutro'} pose={msg.pose || 'tudo-sob-controle'} size={24} />
                          </div>
                        )}
                        <div className={`p-2.5 rounded-xl text-[10px] max-w-[85%] leading-relaxed font-semibold ${
                          msg.sender === 'user' 
                            ? 'bg-[#00B7FF] text-[#14171C] font-extrabold rounded-tr-none' 
                            : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
                        }`}>
                          {msg.text.split('\n').map((line, lineIdx) => (
                            <p key={lineIdx} className="my-0.5">{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start gap-2">
                        <div className="bg-slate-900 p-2.5 rounded-xl rounded-tl-none border border-slate-800 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-[#00B7FF] animate-bounce" />
                          <div className="w-1 h-1 rounded-full bg-[#00B7FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-1 rounded-full bg-[#00B7FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChat();
                    }}
                    className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="CMV, metas, faturamento..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-[#00B7FF] text-slate-950 font-black text-[9px] uppercase px-3 py-1.5 rounded-xl"
                    >
                      Enviar
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Native Bottom Tab Navigation Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-slate-800/80 flex items-center justify-around px-2 z-40">
              <button
                onClick={() => setActiveSubTab('copilot')}
                className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'copilot' ? 'text-[#00B7FF]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <BrainCircuit size={15} />
                <span>Comando KAI</span>
              </button>
              <button
                onClick={() => setActiveSubTab('overview')}
                className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'overview' ? 'text-[#00B7FF]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutDashboard size={15} />
                <span>Alertas</span>
              </button>
              <button
                onClick={() => setActiveSubTab('analista-estoque')}
                className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'analista-estoque' ? 'text-[#00B7FF]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Package size={15} />
                <span>Estoque</span>
              </button>
              <button
                onClick={() => setActiveSubTab('cmv-cardapio')}
                className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'cmv-cardapio' ? 'text-[#00B7FF]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <TrendingUp size={15} />
                <span>CMV</span>
              </button>
              <button
                onClick={() => setActiveSubTab('chatbot')}
                className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'chatbot' ? 'text-[#00B7FF]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <MessageSquare size={15} />
                <span>Chatbot</span>
              </button>
              <button
                onClick={() => setActiveSubTab('fiscal')}
                className={`flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${activeSubTab === 'fiscal' ? 'text-[#00B7FF]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Receipt size={15} />
                <span>Fiscal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="merchant-copilot-module" className="p-4 md:p-6 lg:p-8 space-y-6 w-full">
      
      {/* Upper header action bar with Command Center style */}
      <div className="bg-[#121214] border border-slate-800 p-5 md:p-6 rounded-[2rem] text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-xl z-10">
          <div className="flex items-center gap-2">
            <span className="p-0.5 px-3 rounded-full text-[9px] bg-[#00B7FF]/15 text-[#00B7FF] font-black flex items-center gap-1.5 uppercase tracking-widest border border-[#00B7FF]/30 shadow-sm">
              <Sparkles size={11} className="animate-spin text-[#00B7FF]" /> Analista Residente Kai
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
            Módulo Lojista
          </h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Acompanhe o raio-x operacional e financeiro da sua loja gerado em tempo real com inteligência artificial.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 z-10">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 rounded-xl transition-all flex items-center gap-2 font-bold text-xs shadow-sm cursor-pointer active:scale-95"
          >
            <Sliders size={14} className="text-indigo-400 animate-pulse" />
            <span>Configurar Custos Fixos</span>
          </button>

          <button
            onClick={() => setIsMobileAppMode(!isMobileAppMode)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl transition-all flex items-center gap-2 font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
          >
            <Smartphone size={14} />
            <span>{isMobileAppMode ? "Ver Painel Web" : "Simular App Lojista 📱"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-2 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button 
            onClick={() => setActiveSubTab('copilot')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSubTab === 'copilot' ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'}`}
          >
            <BrainCircuit size={15} className={activeSubTab === 'copilot' ? 'text-[#00B7FF]' : 'text-indigo-500'} /> Central de Comando KAI (Painel do Dono)
          </button>
          <button 
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSubTab === 'overview' ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'}`}
          >
            <LayoutDashboard size={14} /> Alertas & Insights
          </button>
          <button 
            onClick={() => setActiveSubTab('analista-estoque')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSubTab === 'analista-estoque' ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'}`}
          >
            <Package size={14} className={activeSubTab === 'analista-estoque' ? 'text-white' : 'text-amber-500'} /> Estoque
          </button>
          <button 
            onClick={() => setActiveSubTab('cmv-cardapio')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSubTab === 'cmv-cardapio' ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'}`}
          >
            <TrendingUp size={14} className={activeSubTab === 'cmv-cardapio' ? 'text-white' : 'text-emerald-500'} /> Assistente CMV
          </button>
          <button 
            onClick={() => setActiveSubTab('chatbot')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSubTab === 'chatbot' ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'}`}
          >
            <MessageSquare size={14} className={activeSubTab === 'chatbot' ? 'text-white' : 'text-indigo-500'} /> Chatbot Kai
          </button>
          <button 
            onClick={() => setActiveSubTab('fiscal')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${activeSubTab === 'fiscal' ? 'bg-[#0F172A] text-white shadow-md shadow-slate-900/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'}`}
          >
            <Receipt size={14} className={activeSubTab === 'fiscal' ? 'text-white' : 'text-purple-500'} /> Motor Tributário CBS/IBS
          </button>
        </div>

        {/* Filters shown inside Central de Comando KAI and Alertas */}
        {(activeSubTab === 'copilot' || activeSubTab === 'overview') && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-end">
            {(["today", "last7", "thisMonth", "lastMonth"] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                  selectedPeriod === p
                    ? "bg-white text-indigo-600 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p === "today" ? "Hoje" : p === "last7" ? "7D" : p === "thisMonth" ? "Mês" : "Mês Ant."}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RENDER ACTIVE TAB SEPARATORS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500 w-full">
          <AIInsights sales={filteredData.currentOrders} inventory={products} />
          
          <DashboardAlerts 
            products={products} 
            rawMaterials={rawMaterials}
            onNavigateToInventory={onNavigateToInventory} 
          />

          {/* Card de Assinatura e Consumo de Pedidos */}
          {subscriptionStats && (
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Award size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                      Assinatura e Consumo de Pedidos
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acompanhamento de franquia mensal em tempo real</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                    Plano {subscriptionStats.planName}
                  </span>
                  {subscriptionStats.percentUsed >= 100 && (
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full animate-pulse">
                      Excedente Ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Franquia Mensal: {subscriptionStats.isUnlimited ? "Pedidos Ilimitados" : `${subscriptionStats.maxOrders} pedidos inclusos`}</span>
                  <span className={subscriptionStats.isUnlimited ? "text-indigo-600" : (subscriptionStats.percentUsed >= 100 ? "text-amber-600 font-black" : "text-indigo-600")}>
                    {subscriptionStats.ordersUsed} utilizados {subscriptionStats.isUnlimited ? "" : `(${Math.round(subscriptionStats.percentUsed)}%)`}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${subscriptionStats.isUnlimited ? 100 : Math.min(subscriptionStats.percentUsed, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      subscriptionStats.isUnlimited
                        ? "bg-indigo-600"
                        : subscriptionStats.percentUsed >= 100 
                          ? "bg-rose-500" 
                          : subscriptionStats.percentUsed >= 80 
                            ? "bg-amber-500" 
                            : "bg-indigo-600"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Base do Plano</span>
                  <span className="text-lg font-black text-slate-800 tracking-tight mt-1">R$ {subscriptionStats.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pedidos Excedentes</span>
                  <span className="text-lg font-black text-slate-800 tracking-tight mt-1">
                    {subscriptionStats.isUnlimited ? (
                      <span className="text-sm text-indigo-600 font-black uppercase">Ilimitado</span>
                    ) : (
                      <>
                        {subscriptionStats.excedentCount} <span className="text-xs text-slate-400 font-bold">pedidos extras</span>
                      </>
                    )}
                  </span>
                  {!subscriptionStats.isUnlimited && subscriptionStats.isExcedent && (
                    <span className="absolute right-3 top-3 text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase">
                      + R$ {subscriptionStats.rate.toFixed(2)}/un
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between border-2 border-indigo-50">
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={10} /> Adicional Estimado
                  </span>
                  <div className="flex flex-col mt-1">
                    <span className="text-lg font-black text-indigo-600 tracking-tight">
                      {subscriptionStats.isUnlimited ? "R$ 0,00" : `R$ ${subscriptionStats.finalExcedentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                    {!subscriptionStats.isUnlimited && subscriptionStats.discountPercent > 0 && (
                      <span className="text-[8px] text-emerald-600 font-extrabold uppercase mt-0.5">
                        {subscriptionStats.discountPercent}% desconto volume aplicado (Economizou R$ {subscriptionStats.discountAmount.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total predicted block */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl flex justify-between items-center text-xs border border-indigo-100">
                <div className="text-slate-600 font-bold">
                  Total Estimado para Próxima Fatura (Base + Excedentes):
                </div>
                <div className="text-indigo-700 font-black text-lg">
                  R$ {subscriptionStats.totalInvoiceEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* SMART UPGRADE SUGGESTION */}
              {subscriptionStats.upgradeRecommended && subscriptionStats.nextPlan && (
                <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-[1.8rem] shadow-lg shadow-emerald-500/10 space-y-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="shrink-0 text-amber-300 mt-1" size={20} />
                    <div className="space-y-1">
                      <p className="font-black text-sm tracking-tight">Upgrade Inteligente Recomendado</p>
                      <p className="text-[11px] opacity-90 font-medium leading-relaxed">
                        Seus custos adicionais com pedidos excedentes atingiram R$ {subscriptionStats.finalExcedentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. 
                        Migrar para o plano <span className="font-extrabold text-amber-200">{subscriptionStats.nextPlan.name}</span> por apenas <span className="font-extrabold text-amber-200">R$ {subscriptionStats.nextPlan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> aumentará sua franquia mensal para <span className="font-extrabold text-amber-200">{subscriptionStats.nextPlan.maxOrders} pedidos</span> e eliminará as cobranças de excedente atuais!
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      try {
                        const tenantId = tenantData.id;
                        await updateDoc(doc(db, 'tenants', tenantId), {
                          'subscription.plan': subscriptionStats.nextPlan.name,
                          'subscription.planId': subscriptionStats.nextPlan.id
                        });
                        alert(`Parabéns! Seu plano foi atualizado para ${subscriptionStats.nextPlan.name} com sucesso!`);
                      } catch (error) {
                        console.error("Erro ao efetuar upgrade automático:", error);
                        alert("Não foi possível efetuar o upgrade automático.");
                      }
                    }}
                    className="w-full py-3 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    Efetuar Upgrade para {subscriptionStats.nextPlan.name} Agora
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
          
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
                {topSellingProduct ? (
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden border shrink-0">
                      <img src={topSellingProduct.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{topSellingProduct.name}</h4>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase mt-1">
                        {topSellingProduct.qtySold > 0 ? `${topSellingProduct.qtySold} vendidos` : 'Estrela de Vendas'}
                      </span>
                      <p className="text-base font-black text-indigo-600 mt-1">R$ {topSellingProduct.price.toFixed(2)}</p>
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

      {/* RENDER CHATBOT KAI INTEGRATED PAGE VIEW */}
      {activeSubTab === 'chatbot' && (
        <div className="animate-in fade-in duration-500 w-full space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Animated Mascot Details Card */}
            <div className="lg:col-span-4 bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-xl border border-slate-800 flex flex-col justify-between relative overflow-hidden min-h-[460px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full"></div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00B7FF]">Kai Copiloto Ativo</span>
                  </div>
                  <span className="text-[8px] bg-[#00B7FF]/10 text-[#00B7FF] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#00B7FF]/20">
                    Offline AI
                  </span>
                </div>
                
                {/* Big Avatar Presentation */}
                <div className="flex flex-col items-center py-6">
                  <div className="p-3 bg-slate-950/80 rounded-[2rem] border border-white/5 shadow-inner scale-110 relative">
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    </div>
                    <KaiAvatar 
                      expression={isChatLoading ? 'analisando' : kaiExpression} 
                      pose={isChatLoading ? 'analisando-dados' : kaiPose} 
                      size={110} 
                    />
                  </div>
                  <h3 className="text-base font-black text-white mt-4 tracking-tight">Copiloto Kai</h3>
                  <p className="text-[10px] text-[#7DD3FF] font-extrabold uppercase tracking-wider mt-0.5">Analista de Inteligência KitchenFlow</p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2 text-center">
                  <p className="text-[11px] font-semibold text-slate-300 leading-relaxed">
                    "Focado em cortar perdas e transformar faturamento, vendas e custos de CMV em lucro líquido no seu bolso."
                  </p>
                </div>
              </div>

              {/* Botão de reiniciar conversa */}
              <button
                onClick={() => {
                  setChatMessages([]);
                  setKaiPose('tudo-sob-controle');
                  setKaiExpression('feliz');
                }}
                className="mt-4 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-white/5"
              >
                <RefreshCw size={10} /> Reiniciar Diálogo
              </button>
            </div>

            {/* Right Side: Immersive Chat Engine */}
            <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between min-h-[520px]">
              
              <div className="flex flex-col flex-1">
                {/* Chat conversation area */}
                <div className="flex-1 max-h-[380px] overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-50 space-y-4">
                  
                  {chatMessages.map((msg, mIdx) => (
                    <div 
                      key={mIdx} 
                      className={`flex gap-3 pt-3.5 first:pt-0 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'kai' && (
                        <div className="shrink-0 scale-90 mt-0.5">
                          <KaiAvatar expression={msg.expression || 'neutro'} pose={msg.pose || 'tudo-sob-controle'} size={38} />
                        </div>
                      )}
                      
                      <div className={`p-4 rounded-3xl text-xs max-w-[80%] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white font-extrabold rounded-tr-none shadow-md shadow-indigo-600/10'
                          : 'bg-slate-50 text-slate-800 font-semibold rounded-tl-none border border-slate-100'
                      }`}>
                        {/* Render msg with markup lines gracefully */}
                        {msg.text.split('\n').map((line, lineIdx) => {
                          const isHeading = line.startsWith("###") || line.startsWith("**") || line.startsWith("- **");
                          return (
                            <p 
                              key={lineIdx} 
                              className={`my-1 ${isHeading ? 'font-black text-slate-900 bg-indigo-50/20 px-1 rounded-md' : ''}`}
                            >
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Typing placeholder loader */}
                  {isChatLoading && (
                    <div className="flex justify-start gap-3 pt-3.5">
                      <div className="shrink-0 scale-90 mt-0.5">
                        <KaiAvatar expression="analisando" pose="analisando-dados" size={38} />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-3xl rounded-tl-none border border-slate-100 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Predefined prompt templates */}
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">💡 Sugestões Rápidas de Diagnóstico</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { text: "Como reduzir meu CMV na prática?", label: "📉 CMV Insumos" },
                      { text: "Estou no vermelho? Qual meu ponto de equilíbrio?", label: "🧱 Ponto de Equilíbrio" },
                      { text: "Quais combos eu posso criar para aumentar o ticket?", label: "🍔 Combos de Alto Giro" },
                      { text: "O que fazer com o produto crítico no meu cardápio?", label: "⚠️ Ajustar Crítico" },
                      { text: "Quais estratégias de taxas usar para o delivery?", label: "🚴 Taxas do Delivery" }
                    ].map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => handleSendChat(btn.text)}
                        disabled={isChatLoading}
                        className="text-[10px] font-bold px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Message submit form block */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-4"
              >
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Pergunte ao Kai: 'Como reduzir CMV?', 'Análise de comissão'..."
                  disabled={isChatLoading}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-2xl placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-55"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !userQuery.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                >
                  <Bot size={13} /> Enviar
                </button>
              </form>

            </div>

          </div>
        </div>
      )}

      {/* RESULTADO REAL DA OPERAÇÃO - CENTRAL DE COMANDO KAI (PAINEL DO DONO) */}
      {activeSubTab === 'copilot' && (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
          
          {/* BANNER PRINCIPAL DO DONO - VISÃO COMPACTA E DIRETA DE CAIXA E SOBRA */}
          <div className="w-full bg-[#0F172A] text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden border border-slate-800">
            {/* Glow decorativo */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#00B7FF]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-[#00B7FF]">
                  <BrainCircuit size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-[#00B7FF] border border-indigo-500/30">
                      Painel do Dono
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Tempo Real
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      • {dateRange.periodName} ({dateRange.daysCount}d)
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
                    Central de Comando KAI
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
                  {(["today", "last7", "thisMonth", "lastMonth"] as PeriodType[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        selectedPeriod === p
                          ? "bg-indigo-600 text-white shadow-md font-black"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      {p === "today" ? "Hoje" : p === "last7" ? "7 Dias" : p === "thisMonth" ? "Este Mês" : "Mês Ant."}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExplainOperation}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={14} className="animate-pulse text-amber-300" />
                  Auditoria KAI
                </button>
              </div>
            </div>

            {/* 6 CARDS PRINCIPAIS DO DONO (MÉTRICAS VITAIS DE CAIXA, ESTOQUE E LOGÍSTICA) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-6 relative z-10">
              
              {/* Card 1: Faturamento Bruto Real */}
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign size={12} className="text-emerald-400" /> Faturamento
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">
                      {filteredData.currentOrders.length} ped.
                    </span>
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight block">
                    R$ {stats.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Variância:</span>
                  {getPercentageVariation(stats.faturamento, stats.faturamentoPrev) >= 0 ? (
                    <span className="text-[9.5px] font-black text-emerald-400 flex items-center gap-0.5">
                      <TrendingUp size={11} /> +{getPercentageVariation(stats.faturamento, stats.faturamentoPrev).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-black text-rose-400 flex items-center gap-0.5">
                      <TrendingDown size={11} /> {getPercentageVariation(stats.faturamento, stats.faturamentoPrev).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Sobra Limpa no Bolso (Lucro Real) */}
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-2 h-full ${stats.lucroReal >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Wallet size={12} className="text-[#00B7FF]" /> Sobra Limpa (Bolso)
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${stats.margem >= 15 ? 'bg-emerald-600' : stats.margem >= 8 ? 'bg-amber-600' : 'bg-rose-600'}`}>
                      {stats.margem.toFixed(1)}% Margem
                    </span>
                  </div>
                  <span className={`text-2xl font-black tracking-tight block ${stats.lucroReal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {stats.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>Status:</span>
                  <span className={stats.lucroReal >= 0 ? 'text-emerald-400 font-extrabold' : 'text-rose-400 font-extrabold'}>
                    {stats.lucroReal >= 0 ? '🟢 Lucro no Bolso' : '🔴 Operação em Déficit'}
                  </span>
                </div>
              </div>

              {/* Card 3: Termômetro 0 a 0 do Período */}
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Target size={12} className="text-amber-400" /> Meta 0a0 ({selectedPeriod === 'today' ? 'Equilíbrio Hoje' : selectedPeriod === 'last7' ? 'Equilíbrio 7D' : selectedPeriod === 'thisMonth' ? 'Equilíbrio Mês' : 'Equilíbrio Mês Ant.'})
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-400">
                      R$ {stats.pontoEquilibrio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}{selectedPeriod === 'today' ? '/dia' : ''}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-white">
                      R$ {stats.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] font-black ${stats.faturamento >= stats.pontoEquilibrio ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {stats.pontoEquilibrio > 0 ? Math.round((stats.faturamento / stats.pontoEquilibrio) * 100) : 0}%
                    </span>
                  </div>
                </div>
                {/* Barra de progresso do 0a0 */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${stats.faturamento >= stats.pontoEquilibrio ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, stats.pontoEquilibrio > 0 ? (stats.faturamento / stats.pontoEquilibrio) * 100 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-bold block mt-1">
                    {stats.faturamento >= stats.pontoEquilibrio 
                      ? "🟢 Contas do período cobertas! Sobra ativa." 
                      : `Faltam R$ ${Math.max(0, stats.pontoEquilibrio - stats.faturamento).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} para equilibrar.`}
                  </span>
                </div>
              </div>

              {/* Card 4: Ticket Médio x Desempenho */}
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <ShoppingBag size={12} className="text-indigo-400" /> Ticket Médio
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">Por Pedido</span>
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight block">
                    R$ {stats.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[8.5px] font-semibold text-slate-400">
                  <span>Impacto de +R$ 3 no ticket:</span>
                  <span className="font-extrabold text-[#00B7FF]">
                    +R$ {(filteredData.currentOrders.length * 3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Card 5: Estoque Adormecido (Dinheiro Parado) */}
              <div 
                onClick={() => setActiveSubTab('analista-estoque')}
                className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between hover:border-amber-500/50 cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Package size={12} className="text-amber-400" /> Capital Parado
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                      {stockStats.dormantItemsCount} itens
                    </span>
                  </div>
                  <span className="text-2xl font-black text-amber-300 tracking-tight block">
                    R$ {stockStats.dormantStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[8.5px] font-semibold text-slate-400">
                  <span>Parado 15+ dias:</span>
                  <span className="font-extrabold text-amber-400 flex items-center gap-0.5 group-hover:underline">
                    Girar Estoque <ChevronRight size={10} />
                  </span>
                </div>
              </div>

              {/* Card 6: Repasse aos Entregadores */}
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500" />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Bike size={12} className="text-indigo-400" /> Repasse Motoboys
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${courierStats.pendingCourierFee > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {courierStats.pendingCourierFee > 0 ? 'A Acertar' : 'Quitado'}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight block">
                    R$ {courierStats.totalCourierFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[8.5px] font-semibold text-slate-400">
                  <span>Pendente de acerto:</span>
                  <span className={`font-extrabold ${courierStats.pendingCourierFee > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    R$ {courierStats.pendingCourierFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO ESPECIAL KAI: CAPITAL PARADO EM ESTOQUE & BALANÇO DE ENTREGADORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* CARD DETALHADO DE ESTOQUE ADORMECIDO */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                      <Package size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Estoque Adormecido (Capital Imobilizado)
                      </h4>
                      <span className="text-[9.5px] font-bold text-slate-400">
                        Ingredientes e produtos sem movimentação há mais de 15 dias
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {stockStats.dormantItemsCount} itens parados
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Dinheiro Parado em Prateleira</span>
                    <span className="text-2xl font-black text-amber-600 tracking-tight">
                      R$ {stockStats.dormantStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Total do Estoque</span>
                    <span className="text-xs font-black text-slate-700">
                      R$ {stockStats.totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Barra de Proporção de Estoque Imobilizado */}
                <div className="mt-3">
                  <div className="flex justify-between items-center text-[8.5px] font-extrabold uppercase text-slate-400 mb-1">
                    <span>Proporção do Estoque Total</span>
                    <span className="text-amber-600">
                      {stockStats.totalStockValue > 0 ? ((stockStats.dormantStockValue / stockStats.totalStockValue) * 100).toFixed(1) : 0}% Imobilizado
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/50">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min(100, stockStats.totalStockValue > 0 ? (stockStats.dormantStockValue / stockStats.totalStockValue) * 100 : 0)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[9.5px] text-slate-500 font-medium leading-tight">
                  💡 <strong>Dica Kai:</strong> Crie um combo promocional no PDV com esses itens para liberar capital de giro e evitar desperdício.
                </p>
                <button
                  onClick={() => setActiveSubTab('analista-estoque')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shrink-0 ml-3 flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  Girar Estoque <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* CARD DETALHADO DE REPASSES E LOGÍSTICA DE ENTREGADORES */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                      <Bike size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Repasse & Balanço de Entregadores
                      </h4>
                      <span className="text-[9.5px] font-bold text-slate-400">
                        Taxa de frete dos clientes vs. Payouts de motoboys
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${courierStats.pendingCourierFee > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {courierStats.pendingCourierFee > 0 ? `Pendente: R$ ${courierStats.pendingCourierFee.toFixed(2)}` : 'Sem Pendências'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Repassado aos Motoboys</span>
                    <span className="text-lg font-black text-slate-800 mt-0.5 block">
                      R$ {courierStats.totalCourierFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Taxa de Entrega Cobrada</span>
                    <span className="text-lg font-black text-indigo-600 mt-0.5 block">
                      R$ {courierStats.totalDeliveryFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9.5px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-500">Saldo Logístico (Frete Cobrado vs Pago):</span>
                  <span className={`font-black ${courierStats.totalDeliveryFee - courierStats.totalCourierFee >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {courierStats.totalDeliveryFee - courierStats.totalCourierFee >= 0 ? '+' : ''}
                    R$ {(courierStats.totalDeliveryFee - courierStats.totalCourierFee).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold">
                  <span>Quitados: R$ {courierStats.settledCourierFee.toFixed(2)}</span>
                  <span>•</span>
                  <span className="text-amber-600">A Acertar: R$ {courierStats.pendingCourierFee.toFixed(2)}</span>
                </div>
                <span className="text-[9.5px] font-extrabold text-indigo-600">
                  Sincronizado com Módulo Delivery
                </span>
              </div>
            </div>

          </div>

          {/* OS 3 PILARES FUNDAMENTAIS DA OPERAÇÃO DE ALIMENTAÇÃO */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" /> Os 3 Pilares Vitais da Sua Operação
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">Diagnóstico em tempo real dos fatores que diretamente afetam o lucro do restaurante.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* PILAR 1: CMV (Custos de Insumos & Ingredientes) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Utensils size={14} className="text-rose-500" /> Pilar 1: CMV (Insumos)
                    </span>
                    {(() => {
                      const cmvPct = stats.faturamento > 0 ? (stats.cmv / stats.faturamento) * 100 : 0;
                      return (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${cmvPct <= 33 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : cmvPct <= 38 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {cmvPct.toFixed(1)}% ({cmvPct <= 33 ? 'Saudável' : cmvPct <= 38 ? 'Atenção' : 'Alto'})
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mt-4">
                    <span className="text-2xl font-black text-slate-800 block">
                      R$ {stats.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Custo total estimado de ingredientes nos pratos vendidos.
                    </p>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-100/80 text-[10px] leading-relaxed text-slate-600 font-medium">
                  {(() => {
                    const cmvPct = stats.faturamento > 0 ? (stats.cmv / stats.faturamento) * 100 : 0;
                    if (cmvPct <= 33) {
                      return "🟢 Seu custo de ingredientes está dentro da meta ideal (até 33%). Mantenha a disciplina de porcionamento na cozinha.";
                    } else if (cmvPct <= 38) {
                      return "🟡 Seu CMV está levemente pressionado. Verifique os insumos de maior peso e padronize a pesagem de ingredientes.";
                    } else {
                      return "🔴 CMV crítico acima de 38%! Custo de ingredientes corroendo a sobra. Revise os preços de pratos principais ou negocie fornecedores.";
                    }
                  })()}
                </div>
              </div>

              {/* PILAR 2: Dependência de Marketplace vs Canal Próprio */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bike size={14} className="text-amber-500" /> Pilar 2: Taxas de Delivery
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      {stats.faturamento > 0 ? ((stats.taxasDelivery / stats.faturamento) * 100).toFixed(1) : 0}% do Fat.
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-2xl font-black text-slate-800 block">
                      R$ {stats.taxasDelivery.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Valor retido em comissões de aplicativos e logística.
                    </p>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-2xl bg-amber-50/50 border border-amber-100 text-[10px] leading-relaxed text-amber-900 font-medium flex items-start gap-2">
                  <Zap size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold uppercase block text-[9px] text-amber-800">Economia Potencial KAI:</strong>
                    Se você migrar 15% das vendas dos apps para seu WhatsApp / Cardápio Próprio, economizará aproximadamente <strong>R$ {(stats.taxasDelivery * 0.15).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> que entram direto na sobra!
                  </div>
                </div>
              </div>

              {/* PILAR 3: Impostos & Retenção do Split Payment (CBS/IBS) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Receipt size={14} className="text-indigo-600" /> Pilar 3: Retenção Tributária
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Split Payment
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-2xl font-black text-slate-800 block">
                      R$ {(stats.faturamento * 0.038).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Estimativa de CBS/IBS retido na adquirente (Reforma Tributária).
                    </p>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-[10px] leading-relaxed text-indigo-900 font-medium flex items-start gap-2">
                  <ShieldCheck size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold uppercase block text-[9px] text-indigo-800">Conformidade Fiscal Garantida:</strong>
                    Sua "Sobra Limpa" calculada neste painel já considers as dedutibilidades e você não terá surpresas com o fisco no final do mês.
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3 ALERTAS E AÇÕES PRÁTICAS DO DIA PARA O DONO */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2.5rem] p-6 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    3 Ações Imediatas Sugeridas pelo Kai
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Otimizações diretas e sem enrolação para aplicar ainda hoje no seu estabelecimento.
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Ações do Dia
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card Ação 1: Ajuste de Cardápio */}
              <div className="bg-slate-900/90 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    1. Proteção de Margem de Item
                  </span>
                  <h4 className="text-xs font-black text-white">
                    {productProfitMap.leastProfitable[0] ? `Revisar item: ${productProfitMap.leastProfitable[0].name}` : 'Ajuste Fixo de Fichas'}
                  </h4>
                  <p className="text-[10.5px] text-slate-300 font-medium leading-relaxed mt-2">
                    {productProfitMap.leastProfitable[0]
                      ? `Este item está rodando com margem menor que o ideal. Reajustar R$ 1,50 no valor de venda ou ajustar a porção equilibra a margem imediatamente.`
                      : `Monitore os insumos com variação de preço de mercado nos fornecedores para não perder rentabilidade nos itens do cardápio.`}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Impacto Esperado:</span>
                  <span className="text-[9.5px] font-black text-emerald-400">+ R$ 350,00/mês</span>
                </div>
              </div>

              {/* Card Ação 2: Giro de Estoque Parado */}
              <div className="bg-slate-900/90 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#00B7FF] block mb-1">
                    2. Combos & Giro de Estoque
                  </span>
                  <h4 className="text-xs font-black text-white">
                    Criar Combo "Âncora + Acompanhamento"
                  </h4>
                  <p className="text-[10.5px] text-slate-300 font-medium leading-relaxed mt-2">
                    Crie ofertas combinando seu prato principal de maior saída com acompanhamentos ou bebidas de baixíssimo custo para acelerar o giro de ingredientes.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Impacto Esperado:</span>
                  <span className="text-[9.5px] font-black text-[#00B7FF]">+ 18% Vendas Totais</span>
                </div>
              </div>

              {/* Card Ação 3: Alavanca de Ticket Médio */}
              <div className="bg-slate-900/90 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                    3. Elevação do Ticket no Atendimento
                  </span>
                  <h4 className="text-xs font-black text-white">
                    Sugestão Ativa de Sobremesas / Bebidas
                  </h4>
                  <p className="text-[10.5px] text-slate-300 font-medium leading-relaxed mt-2">
                    Estimule o atendimento a oferecer adicionais ou sobremesas. Um incremento médio de R$ 3,00 por comanda gera um aporte limpo direto para o caixa.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Ganho no Período:</span>
                  <span className="text-[9.5px] font-black text-emerald-400">
                    + R$ {(filteredData.currentOrders.length * 3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* SIMULADOR DE ALAVANCAS DE LUCRO (E SE...?) */}
          <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Sliders size={16} className="text-indigo-600" /> Simulador de Alavancas de Lucro
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Arraste os controles para ver instantaneamente quanto dinheiro a mais entra no seu bolso ao otimizar a operação.
                </p>
              </div>

              {/* Resultado da Simulação */}
              {(() => {
                const cmvGain = stats.cmv * (simCmvReduction / 100);
                const feeGain = stats.taxasDelivery * (simFeeReduction / 100);
                const totalExtraProfit = cmvGain + feeGain;
                return (
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 px-4 rounded-2xl flex items-center gap-3">
                    <span className="text-base">💰</span>
                    <div>
                      <span className="text-[8.5px] font-extrabold uppercase text-emerald-800 tracking-wider block">Sobra Adicional Estimada:</span>
                      <span className="text-base font-black text-emerald-700">
                        + R$ {totalExtraProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Slider 1: Redução de CMV / Desperdício */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Utensils size={14} className="text-rose-500" /> Redução de CMV / Desperdício
                  </label>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 border px-2 py-0.5 rounded-lg">
                    -{simCmvReduction}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="15" 
                  step="1"
                  value={simCmvReduction}
                  onChange={(e) => setSimCmvReduction(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>0% (Atual)</span>
                  <span>Ganho: +R$ {(stats.cmv * (simCmvReduction / 100)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  <span>-15% (Otimizado)</span>
                </div>
              </div>

              {/* Slider 2: Migração de Apps p/ Canal Próprio */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Bike size={14} className="text-amber-500" /> Migração de App p/ Cardápio Próprio
                  </label>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 border px-2 py-0.5 rounded-lg">
                    {simFeeReduction}% das Vendas
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  step="5"
                  value={simFeeReduction}
                  onChange={(e) => setSimFeeReduction(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>0% (Sem mudança)</span>
                  <span>Economia: +R$ {(stats.taxasDelivery * (simFeeReduction / 100)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  <span>30% Convertidos</span>
                </div>
              </div>

            </div>
          </div>

          {/* DEMONSTRATIVO FINANCEIRO COMPLETO (DRE RESUMIDO) */}
          <div id="stripe-summary-card" className="w-full bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Demonstrativo Consolidado de Resultados (DRE Resumido)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Decomposição detalhada do fluxo financeiro do período selecionado.
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border px-2.5 py-1 rounded-lg">
                Proporcional para {dateRange.daysCount} dias
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Items do DRE */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">1. Faturamento Bruto</span>
                <span className="text-xl font-black text-slate-800">R$ {stats.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[8.5px] font-bold text-slate-400 block mt-1">Vendas reais no sistema</span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">2. Custo de Insumos (CMV)</span>
                <span className="text-xl font-black text-rose-600">- R$ {stats.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[8.5px] font-bold text-slate-400 block mt-1">{stats.faturamento > 0 ? ((stats.cmv / stats.faturamento) * 100).toFixed(1) : 0}% da receita em insumos</span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">3. Taxas de Apps & Delivery</span>
                <span className="text-xl font-black text-amber-600">- R$ {stats.taxasDelivery.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[8.5px] font-bold text-slate-400 block mt-1">Comissões e taxas de marketplace</span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">4. Folha de Pagamento</span>
                <span className="text-xl font-black text-slate-700">- R$ {stats.folha.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[8.5px] font-bold text-slate-400 block mt-1">Proporcional de salários e pró-labore</span>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">5. Despesas Fixas (Aluguel/Contas)</span>
                <span className="text-xl font-black text-slate-700">- R$ {stats.despesasFixas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[8.5px] font-bold text-slate-400 block mt-1">Estrutura operacional proporcional</span>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl">
                <span className="text-[9.5px] font-black text-emerald-800 uppercase tracking-widest block mb-1">6. Sobra Limpa Final</span>
                <span className={`text-xl font-black ${stats.lucroReal >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  R$ {stats.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[8.5px] font-black text-emerald-700 block mt-1">{stats.margem.toFixed(1)}% de margem líquida real</span>
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
        <div className="lg:col-span-4 bg-[#00B7FF]/5 border border-[#00B7FF]/10 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1 px-2.5 rounded-full text-[9px] bg-[#14171C] text-white font-extrabold flex items-center gap-1 uppercase tracking-wider border border-white/5">
                Diretrizes do Kai
              </span>
            </div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">Recomendações de Gestão</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-5 font-bold">Auditoria operacional residente instantânea:</p>
            
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

  {activeSubTab === 'analista-estoque' && (
    <div className="animate-in fade-in duration-500 w-full space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Package className="text-amber-500" /> Analista de Estoque Inteligente
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Visualize os indicadores financeiros de giro, faturamento potencial e saúde de reposição do seu estoque físico.
          </p>
        </div>
        <StockAnalyst products={products} orders={orders} rawMaterials={rawMaterials} />
      </div>
    </div>
  )}

  {activeSubTab === 'fiscal' && (
    <div className="animate-in fade-in duration-500 w-full">
      <FiscalEngineModule 
        products={products}
        orders={orders}
        settings={adminSettings}
        currentUser={currentUser}
        onUpdateSettings={onUpdateSettings}
      />
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
                      { id: `fc-1-${activeTenantId}`, name: "Aluguel da Loja", type: "rent" as const, amount: 1800 },
                      { id: `fc-2-${activeTenantId}`, name: "Contas de Consumo (Água, Luz, Net)", type: "rent" as const, amount: 700 },
                      { id: `fc-3-${activeTenantId}`, name: "Folha de Salários - Equipe", type: "staff" as const, amount: 3500 },
                      { id: `fc-4-${activeTenantId}`, name: "Pró-labore de Sócios", type: "staff" as const, amount: 1300 },
                    ];
                    setFixedCostsList(defaultList);
                    setEstimatedWastePercent(3.5);
                    if (typeof window !== "undefined") {
                      localStorage.setItem(`copilot_fixed_costs_list_${activeTenantId}`, JSON.stringify(defaultList));
                      localStorage.setItem(`copilot_monthly_rent_${activeTenantId}`, "2500");
                      localStorage.setItem(`copilot_monthly_staff_${activeTenantId}`, "4800");
                      localStorage.setItem(`copilot_estimated_waste_${activeTenantId}`, "3.5");
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
                      localStorage.setItem(`copilot_fixed_costs_list_${activeTenantId}`, JSON.stringify(fixedCostsList));
                      localStorage.setItem(`copilot_monthly_rent_${activeTenantId}`, computedRentTotal.toString());
                      localStorage.setItem(`copilot_monthly_staff_${activeTenantId}`, computedStaffTotal.toString());
                      localStorage.setItem(`copilot_estimated_waste_${activeTenantId}`, estimatedWastePercent.toString());
                    }
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

      {/* EXPLAIN MY OPERATION DRAWER / SIDE CARD (Conversas inteligente com o Copiloto Kai) */}
      <AnimatePresence>
        {isAiDrawerOpen && (
          <div className="fixed inset-0 z-[10000] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiDrawerOpen(false)}
              className="absolute inset-0 bg-[#14171C]/80 backdrop-blur-md"
            />
            
            {/* Sliding Drawer Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-xl bg-slate-950 h-screen shadow-2xl relative flex flex-col justify-between border-l border-[#00B7FF]/10 text-white"
            >
              
              {/* Drawer Header */}
              <div className="p-4 bg-[#14171C] border-b border-[#00B7FF]/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-slate-900 rounded-xl border border-white/5">
                    <KaiAvatar 
                      expression={isAiLoading || isChatLoading ? 'analisando' : kaiExpression} 
                      pose={isAiLoading || isChatLoading ? 'analisando-dados' : kaiPose} 
                      size={50} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black tracking-widest uppercase text-[#00B7FF] bg-[#00B7FF]/10 px-2 py-0.5 rounded-full border border-[#00B7FF]/20 animate-pulse">
                        Kai Analyst (Offline)
                      </span>
                    </div>
                    <h3 className="text-sm font-black tracking-tight text-white mt-0.5">Analista Residente Operacional</h3>
                  </div>
                </div>

                <button
                  onClick={() => setIsAiDrawerOpen(false)}
                  className="p-2.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-full transition-all border border-white/5"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Consultation Body Content */}
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-6 bg-slate-950">
                
                {/* AI Processing and streaming states */}
                {isAiLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 border-4 border-[#00B7FF] border-t-transparent rounded-full animate-spin"></div>
                      <Sparkles size={20} className="text-[#7DD3FF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#7DD3FF] uppercase tracking-widest animate-pulse">Focalizando no Seu Caixa...</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-bold max-w-xs mx-auto">
                        Kai está compilando faturas, comissões de delivery e CMV localmente agora.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Structured results output */}
                {!isAiLoading && aiReport && (
                  <div className="bg-[#1F232A]/90 rounded-3xl p-5 md:p-6 border border-white/5 shadow-inner leading-relaxed text-xs text-slate-300 font-bold space-y-4">
                    {/* Convert basic markdown string layout seamlessly for clean visual pairing */}
                    {aiReport.split("\n").map((line, lIdx) => {
                      if (line.startsWith("###")) {
                        return (
                          <h4 key={lIdx} className="text-sm font-black text-[#7DD3FF] tracking-tight block border-b border-white/5 pb-1 pt-3">
                            {line.substring(3).trim()}
                          </h4>
                        );
                      }
                      if (line.startsWith("##")) {
                        return (
                          <h3 key={lIdx} className="text-base font-black text-[#00B7FF] tracking-tight block pt-4">
                            {line.substring(2).trim()}
                          </h3>
                        );
                      }
                      if (line.startsWith("-") || line.startsWith("*")) {
                        return (
                          <div key={lIdx} className="flex gap-2 items-start pl-3 my-1 text-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00B7FF] shrink-0 mt-1.5 filter drop-shadow-[0_0_2px_#00B7FF]"></span>
                            <span className="leading-relaxed">{line.substring(1).trim()}</span>
                          </div>
                        );
                      }
                      if (line.trim() === "---") {
                        return <hr key={lIdx} className="border-white/5 my-4" />;
                      }
                      return <p key={lIdx} className="leading-relaxed my-2 font-semibold text-slate-300">{line}</p>;
                    })}
                  </div>
                )}
                
                {/* Visual statistics drawer side widget */}
                <div className="bg-[#14171C] border border-white/5 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#00B7FF]/5 rounded-full blur-xl pointer-events-none" />
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Painel de Métricas do Período</span>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <span className="text-[8px] text-[#7DD3FF] uppercase font-black tracking-wider block">Faturamento Bruto</span>
                      <p className="text-sm font-black text-white mt-0.5">R$ {stats.faturamento.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#7DD3FF] uppercase font-black tracking-wider block font-bold">Lucro de Sobra</span>
                      <p className="text-sm font-black text-emerald-400 mt-0.5">R$ {stats.lucroReal.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#7DD3FF] uppercase font-black tracking-wider block block">Custo de CMV Real</span>
                      <p className="text-sm font-black text-white mt-0.5">{stats.faturamento > 0 ? ((stats.cmv / stats.faturamento) * 100).toFixed(0) : "35"}%</p>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#7DD3FF] uppercase font-black tracking-wider block">Saúde Geral</span>
                      <p className="text-sm font-black mt-0.5 text-[#00B7FF]">{stats.classificacao}</p>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE CHAT PANEL - CONVERSATIONS WITH KAI */}
                {!isAiLoading && (
                  <div className="bg-[#1F232A]/40 rounded-3xl p-4 border border-white/5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Conversação em Tempo Real com o Kai</span>
                    </div>

                    <div className="space-y-3.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {chatMessages.map((msg, mIdx) => (
                        <div key={mIdx} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.sender === 'kai' && (
                            <div className="shrink-0 scale-75 mt-1">
                              <KaiAvatar expression={msg.expression || 'neutro'} pose={msg.pose || 'tudo-sob-controle'} size={32} />
                            </div>
                          )}
                          <div className={`p-3 rounded-2xl text-[11px] max-w-[85%] leading-relaxed font-semibold ${
                            msg.sender === 'user' 
                              ? 'bg-[#00B7FF] text-[#14171C] font-extrabold rounded-tr-none' 
                              : 'bg-[#1F232A] text-slate-200 rounded-tl-none border border-white/5'
                          }`}>
                            {msg.text.split('\n').map((line, lineIdx) => (
                              <p key={lineIdx} className={line.startsWith("**") || line.startsWith("-") ? "my-1" : "my-0.5"}>{line}</p>
                            ))}
                          </div>
                        </div>
                      ))}

                      {isChatLoading && (
                        <div className="flex justify-start gap-3">
                          <div className="shrink-0 scale-75 mt-1">
                            <KaiAvatar expression="analisando" pose="analisando-dados" size={32} />
                          </div>
                          <div className="bg-[#1F232A] p-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00B7FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00B7FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00B7FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pre-defined options quick tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button 
                        onClick={() => handleSendChat("Como reduzir meu CMV na prática?")}
                        disabled={isChatLoading}
                        className="text-[9px] font-bold px-2 py-1 bg-white/5 hover:bg-[#00B7FF]/10 hover:text-[#7DD3FF] rounded-lg border border-white/5 text-slate-300 transition-all text-left"
                      >
                        📉 Como reduzir meu CMV?
                      </button>
                      <button 
                        onClick={() => handleSendChat("Estou no vermelho? Qual meu ponto de equilíbrio?")}
                        disabled={isChatLoading}
                        className="text-[9px] font-bold px-2 py-1 bg-white/5 hover:bg-[#00B7FF]/10 hover:text-[#7DD3FF] rounded-lg border border-white/5 text-slate-300 transition-all text-left"
                      >
                        🧱 Qual o meu ponto de equilíbrio?
                      </button>
                      <button 
                        onClick={() => handleSendChat("Quais combos eu posso criar para aumentar o ticket?")}
                        disabled={isChatLoading}
                        className="text-[9px] font-bold px-2 py-1 bg-white/5 hover:bg-[#00B7FF]/10 hover:text-[#7DD3FF] rounded-lg border border-white/5 text-slate-300 transition-all text-left"
                      >
                        🍔 Táticas de combo lucrativo
                      </button>
                      <button 
                        onClick={() => handleSendChat("O que fazer com o produto crítico no meu cardápio?")}
                        disabled={isChatLoading}
                        className="text-[9px] font-bold px-2 py-1 bg-white/5 hover:bg-[#00B7FF]/10 hover:text-[#7DD3FF] rounded-lg border border-white/5 text-slate-300 transition-all text-left"
                      >
                        ⚠️ Como ajustar ingrediente crítico?
                      </button>
                    </div>

                    {/* Chat Text Input */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChat();
                      }}
                      className="flex items-center gap-2 pt-2 border-t border-white/5"
                    >
                      <input 
                        type="text"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Pergunte ao Kai sobre CMV, metas, combos..."
                        disabled={isChatLoading}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-white/5 text-[11px] font-semibold text-white rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-[#00B7FF]/50"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || !userQuery.trim()}
                        className="px-4 py-2 bg-[#00B7FF] text-[#14171C] font-black uppercase text-[10px] tracking-wide rounded-xl active:scale-95 disabled:opacity-50 transition-all"
                      >
                        Enviar
                      </button>
                    </form>
                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-[#14171C] border-t border-[#00B7FF]/10 flex items-center gap-3">
                <button
                  onClick={() => setIsAiDrawerOpen(false)}
                  className="flex-1 py-3 text-center bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] transition-all tracking-wider border border-white/5"
                >
                  Fechar Painel
                </button>
                <button
                  onClick={handleExplainOperation}
                  className="flex-1 py-3 bg-[#00B7FF] hover:bg-[#7DD3FF] text-[#14171C] font-black uppercase text-[10px] rounded-2xl transition-all shadow-md shadow-[#00B7FF]/15 flex items-center justify-center gap-1.5 tracking-wider"
                >
                  <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '4s' }} /> Recalcular Tudo
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
