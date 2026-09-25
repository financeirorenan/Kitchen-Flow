import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  Filter, 
  Plus, 
  Layers, 
  Package, 
  Scale, 
  Send, 
  ShoppingCart, 
  TrendingUp, 
  Star, 
  CheckCircle2, 
  SlidersHorizontal, 
  X, 
  RotateCcw,
  Sparkles,
  DollarSign,
  Truck
} from 'lucide-react';
import { 
  B2BSupplier, 
  B2BCentralProduct, 
  PriceAlert, 
  B2BQuotation, 
  B2BPurchaseOrder, 
  RestaurantSupplierRelationship,
  PriceHistoryEntry,
  SupplierProductItem
} from './types';
import { 
  DEFAULT_SAAS_B2B_SUPPLIERS, 
  DEFAULT_CENTRAL_PRODUCTS, 
  DEFAULT_PRICE_ALERTS, 
  DEFAULT_QUOTATIONS, 
  DEFAULT_PURCHASE_ORDERS, 
  DEFAULT_RESTAURANT_RELATIONSHIPS,
  DEFAULT_PRICE_HISTORY_LOGS,
  SUPPLIER_CATEGORIES
} from './defaultSuppliersData';
import { SupplierCard } from './SupplierCard';
import { SupplierDetailView } from './SupplierDetailView';
import { SupplierFormModal } from './SupplierFormModal';
import { CentralProductsView } from './CentralProductsView';
import { PriceComparisonView } from './PriceComparisonView';
import { QuotationsView } from './QuotationsView';
import { PurchaseOrdersView } from './PurchaseOrdersView';
import { PriceAlertsView } from './PriceAlertsView';
import { MySuppliersView } from './MySuppliersView';

interface B2BSuppliersModuleProps {
  onNavigateTab?: (tab: string) => void;
  currentUserEmail?: string;
  currentTenantId?: string;
}

export const B2BSuppliersModule: React.FC<B2BSuppliersModuleProps> = ({
  onNavigateTab,
  currentUserEmail = 'gestor@restaurante.com',
  currentTenantId = 'demo-tenant'
}) => {
  // Persistence state
  const [suppliers, setSuppliers] = useState<B2BSupplier[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_suppliers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b suppliers from localStorage', e);
    }
    return DEFAULT_SAAS_B2B_SUPPLIERS;
  });

  const [centralProducts, setCentralProducts] = useState<B2BCentralProduct[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_products');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b products from localStorage', e);
    }
    return DEFAULT_CENTRAL_PRODUCTS;
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_alerts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b alerts from localStorage', e);
    }
    return DEFAULT_PRICE_ALERTS;
  });

  const [quotations, setQuotations] = useState<B2BQuotation[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_quotations');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b quotations from localStorage', e);
    }
    return DEFAULT_QUOTATIONS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<B2BPurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_purchase_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b purchase orders from localStorage', e);
    }
    return DEFAULT_PURCHASE_ORDERS;
  });

  const [relationships, setRelationships] = useState<RestaurantSupplierRelationship[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_relationships');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b relationships from localStorage', e);
    }
    return DEFAULT_RESTAURANT_RELATIONSHIPS;
  });

  const [historyLogs, setHistoryLogs] = useState<PriceHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kflow_b2b_history_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load b2b history logs from localStorage', e);
    }
    return DEFAULT_PRICE_HISTORY_LOGS;
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_suppliers', JSON.stringify(suppliers));
    } catch (e) { console.warn(e); }
  }, [suppliers]);

  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_products', JSON.stringify(centralProducts));
    } catch (e) { console.warn(e); }
  }, [centralProducts]);

  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_alerts', JSON.stringify(alerts));
    } catch (e) { console.warn(e); }
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_quotations', JSON.stringify(quotations));
    } catch (e) { console.warn(e); }
  }, [quotations]);

  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_purchase_orders', JSON.stringify(purchaseOrders));
    } catch (e) { console.warn(e); }
  }, [purchaseOrders]);

  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_relationships', JSON.stringify(relationships));
    } catch (e) { console.warn(e); }
  }, [relationships]);

  useEffect(() => {
    try {
      localStorage.setItem('kflow_b2b_history_logs', JSON.stringify(historyLogs));
    } catch (e) { console.warn(e); }
  }, [historyLogs]);

  // Main UI Navigation Tabs
  type MainTab = 'suppliers' | 'central_products' | 'price_comparison' | 'quotations' | 'orders' | 'alerts' | 'my_suppliers';
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('suppliers');

  // Search & Quick Filters
  const [globalSearch, setGlobalSearch] = useState('');
  type QuickFilter = 'all' | 'my_city' | 'my_region' | 'state' | 'category' | 'active_only' | 'updated_prices';
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string>('Todas');

  // Advanced Filters Modal / Drawer State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advCity, setAdvCity] = useState('');
  const [advState, setAdvState] = useState('');
  const [advCategory, setAdvCategory] = useState('');
  const [advSupplierType, setAdvSupplierType] = useState('');
  const [advProduct, setAdvProduct] = useState('');
  const [advMaxPrice, setAdvMaxPrice] = useState('');
  const [advStatus, setAdvStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [advDelivers, setAdvDelivers] = useState(false);
  const [advMaxMinOrder, setAdvMaxMinOrder] = useState('');
  const [advPaymentCondition, setAdvPaymentCondition] = useState('');

  // Modals & Drawers
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<B2BSupplier | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [selectedProductForComparison, setSelectedProductForComparison] = useState<string>('prod-bife-bovino');

  // 2. DASHBOARD DE FORNECEDORES - Indicators Calculation (as required in Section 2)
  const dashboardKpis = useMemo(() => {
    const activeSuppliersCount = suppliers.filter(s => s.status === 'active').length;
    const totalSuppliersCount = suppliers.length;

    // Unique monitored products across central catalog + all supplier offerings
    const allProductNames = new Set<string>();
    centralProducts.forEach(p => allProductNames.add(p.name.toLowerCase()));
    suppliers.forEach(s => s.products.forEach(p => allProductNames.add(p.productName.toLowerCase())));
    const monitoredProductsCount = allProductNames.size;

    // Count of prices updated (with lastUpdated)
    const updatedPricesCount = suppliers.reduce((acc, s) => acc + s.products.length, 0);

    // Active quotations
    const activeQuotationsCount = quotations.filter(q => q.status === 'open' || q.status === 'responses_received').length;

    return {
      activeSuppliersCount,
      totalSuppliersCount,
      monitoredProductsCount,
      updatedPricesCount,
      activeQuotationsCount
    };
  }, [suppliers, centralProducts, quotations]);

  // Filtering suppliers based on Search, Quick Filter, and Advanced Filters
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(sup => {
      // 4. BUSCA INTELIGENTE (Global search)
      if (globalSearch.trim()) {
        const query = globalSearch.toLowerCase().trim();
        const matchesTradeName = sup.tradeName.toLowerCase().includes(query);
        const matchesCorporateName = sup.corporateName.toLowerCase().includes(query);
        const matchesCategory = sup.category.toLowerCase().includes(query);
        const matchesCity = sup.city.toLowerCase().includes(query);
        const matchesServedCities = sup.servedCities.some(c => c.toLowerCase().includes(query));
        const matchesProducts = sup.products.some(p => p.productName.toLowerCase().includes(query));
        const matchesType = sup.supplierType.toLowerCase().includes(query);

        if (!matchesTradeName && !matchesCorporateName && !matchesCategory && !matchesCity && !matchesServedCities && !matchesProducts && !matchesType) {
          return false;
        }
      }

      // 3. FILTROS RÁPIDOS
      if (quickFilter === 'my_city') {
        // Match city (e.g., Ribeirão Preto or São Paulo)
        const myCity = 'Ribeirão Preto';
        const inCity = sup.city.toLowerCase() === myCity.toLowerCase() || 
                       sup.servedCities.some(c => c.toLowerCase() === myCity.toLowerCase());
        if (!inCity) return false;
      } else if (quickFilter === 'my_region') {
        const myRegion = 'Região Metropolitana de Ribeirão Preto';
        const inRegion = sup.servedRegions.some(r => r.toLowerCase().includes('ribeirão') || r.toLowerCase().includes('interior'));
        if (!inRegion) return false;
      } else if (quickFilter === 'state') {
        if (sup.state !== 'SP') return false;
      } else if (quickFilter === 'category') {
        if (selectedQuickCategory !== 'Todas' && sup.category !== selectedQuickCategory) return false;
      } else if (quickFilter === 'active_only') {
        if (sup.status !== 'active') return false;
      } else if (quickFilter === 'updated_prices') {
        // has products with prices updated recently
        if (sup.products.length === 0) return false;
      }

      // FILTROS AVANÇADOS
      if (advCity.trim() && !sup.city.toLowerCase().includes(advCity.toLowerCase().trim()) && !sup.servedCities.some(c => c.toLowerCase().includes(advCity.toLowerCase().trim()))) {
        return false;
      }
      if (advState.trim() && sup.state.toLowerCase() !== advState.toLowerCase().trim()) {
        return false;
      }
      if (advCategory.trim() && sup.category.toLowerCase() !== advCategory.toLowerCase().trim()) {
        return false;
      }
      if (advSupplierType.trim() && sup.supplierType !== advSupplierType) {
        return false;
      }
      if (advProduct.trim()) {
        const hasProd = sup.products.some(p => p.productName.toLowerCase().includes(advProduct.toLowerCase().trim()));
        if (!hasProd) return false;
      }
      if (advMaxPrice.trim()) {
        const maxP = parseFloat(advMaxPrice);
        if (!isNaN(maxP)) {
          const hasAffordableProd = sup.products.some(p => p.price <= maxP);
          if (!hasAffordableProd) return false;
        }
      }
      if (advStatus !== 'all' && sup.status !== advStatus) {
        return false;
      }
      if (advDelivers && !sup.deliversToRestaurant) {
        return false;
      }
      if (advMaxMinOrder.trim()) {
        const maxMin = parseFloat(advMaxMinOrder);
        if (!isNaN(maxMin) && sup.minOrderValue > maxMin) {
          return false;
        }
      }
      if (advPaymentCondition.trim()) {
        const matchesPay = sup.paymentTerms.toLowerCase().includes(advPaymentCondition.toLowerCase().trim()) ||
          sup.paymentMethods.some(m => m.toLowerCase().includes(advPaymentCondition.toLowerCase().trim()));
        if (!matchesPay) return false;
      }

      return true;
    });
  }, [
    suppliers, 
    globalSearch, 
    quickFilter, 
    selectedQuickCategory, 
    advCity, 
    advState, 
    advCategory, 
    advSupplierType, 
    advProduct, 
    advMaxPrice, 
    advStatus, 
    advDelivers, 
    advMaxMinOrder, 
    advPaymentCondition
  ]);

  const resetAdvancedFilters = () => {
    setAdvCity('');
    setAdvState('');
    setAdvCategory('');
    setAdvSupplierType('');
    setAdvProduct('');
    setAdvMaxPrice('');
    setAdvStatus('all');
    setAdvDelivers(false);
    setAdvMaxMinOrder('');
    setAdvPaymentCondition('');
  };

  const hasActiveAdvancedFilters = Boolean(
    advCity || advState || advCategory || advSupplierType || advProduct || 
    advMaxPrice || advStatus !== 'all' || advDelivers || advMaxMinOrder || advPaymentCondition
  );

  // Handlers for B2B Operations
  const handleSaveSupplier = (newSupplier: B2BSupplier) => {
    const existingIndex = suppliers.findIndex(s => s.id === newSupplier.id);
    if (existingIndex >= 0) {
      const updated = [...suppliers];
      updated[existingIndex] = newSupplier;
      setSuppliers(updated);
    } else {
      setSuppliers([newSupplier, ...suppliers]);
    }
  };

  const handleUpdatePrice = (
    supplierId: string, 
    productId: string, 
    newPrice: number, 
    unit: string, 
    notes?: string
  ) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    const todayDate = new Intl.DateTimeFormat('pt-BR').format(new Date());
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let prodName = 'Insumo';
    let prevPrice = 0;

    const updatedSuppliers = suppliers.map(sup => {
      if (sup.id !== supplierId) return sup;

      const updatedProducts = sup.products.map(prod => {
        if (prod.productId === productId || prod.id === productId) {
          prodName = prod.productName;
          prevPrice = prod.price;
          const variation = prevPrice ? ((newPrice - prevPrice) / prevPrice) * 100 : 0;

          return {
            ...prod,
            price: newPrice,
            previousPrice: prevPrice,
            variationPercentage: variation,
            lastUpdated: todayDate
          };
        }
        return prod;
      });

      // Update history record
      const currentHist = sup.history[prodName] || [];
      const updatedHist = [
        ...currentHist,
        { date: todayDate, price: newPrice }
      ];

      return {
        ...sup,
        products: updatedProducts,
        history: {
          ...sup.history,
          [prodName]: updatedHist
        },
        updatedAt: new Date().toISOString()
      };
    });

    setSuppliers(updatedSuppliers);

    // Add immutable history entry (Seção 15)
    const newLog: PriceHistoryEntry = {
      id: `log-${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.tradeName,
      productId,
      productName: prodName,
      unit,
      price: newPrice,
      date: todayDate,
      time: nowTime,
      source: 'manual',
      userResponsible: currentUserEmail,
      notes: notes || 'Atualização manual de preço'
    };
    setHistoryLogs([newLog, ...historyLogs]);

    // Check for alerts (Seção 16)
    if (prevPrice > 0) {
      const diffPct = ((newPrice - prevPrice) / prevPrice) * 100;
      if (Math.abs(diffPct) >= 3) {
        const newAlert: PriceAlert = {
          id: `alt-${Date.now()}`,
          productId,
          productName: prodName,
          supplierId: supplier.id,
          supplierName: supplier.tradeName,
          type: diffPct > 0 ? 'price_increase' : 'price_decrease',
          percentageChange: diffPct,
          diffAmount: newPrice - prevPrice,
          message: `${prodName} ${diffPct > 0 ? 'aumentou' : 'caiu'} ${Math.abs(diffPct).toFixed(1)}% no fornecedor ${supplier.tradeName}.`,
          date: todayDate,
          severity: diffPct > 0 ? 'warning' : 'success',
          read: false
        };
        setAlerts([newAlert, ...alerts]);
      }
    }
  };

  const handleAddNewProductToSupplier = (
    supplierId: string, 
    newProdData: Omit<SupplierProductItem, 'id'>
  ) => {
    const updatedSuppliers = suppliers.map(sup => {
      if (sup.id !== supplierId) return sup;
      const newProd: SupplierProductItem = {
        ...newProdData,
        id: `prod-item-${Date.now()}`
      };

      const updatedHistory = {
        ...sup.history,
        [newProd.productName]: [{ date: 'Atual', price: newProd.price }]
      };

      return {
        ...sup,
        products: [...sup.products, newProd],
        history: updatedHistory
      };
    });
    setSuppliers(updatedSuppliers);
  };

  const handleCreateQuotation = (quotation: B2BQuotation) => {
    setQuotations([quotation, ...quotations]);
  };

  const handleConvertToPurchaseOrder = (quotation: B2BQuotation, winningSupplierId: string) => {
    const winningResp = quotation.invitedSuppliers.find(s => s.supplierId === winningSupplierId);
    const sup = suppliers.find(s => s.id === winningSupplierId);
    if (!winningResp || !sup) return;

    const items = quotation.items.map(it => {
      const qItem = winningResp.items.find(i => i.productId === it.productId);
      const unitPrice = qItem?.unitPrice || 30.00;
      return {
        productId: it.productId,
        productName: it.productName,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice,
        total: unitPrice * it.quantity
      };
    });

    const subtotal = items.reduce((acc, it) => acc + it.total, 0);

    const newPO: B2BPurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber: `PED-2026-${Math.floor(100 + Math.random() * 900)}`,
      quotationId: quotation.id,
      restaurantTenantId: currentTenantId,
      restaurantName: quotation.restaurantName,
      supplierId: sup.id,
      supplierName: sup.tradeName,
      supplierCity: sup.city,
      status: 'order_placed',
      items,
      subtotal,
      freight: winningResp.freight || 0,
      discount: 0,
      total: subtotal + (winningResp.freight || 0),
      deliveryDays: sup.avgDeliveryDays,
      estimatedDeliveryDate: new Date(Date.now() + sup.avgDeliveryDays * 86400000).toISOString().split('T')[0],
      paymentMethod: sup.paymentMethods[0] || 'Boleto 28d',
      paymentTerms: sup.paymentTerms,
      notes: `Gerado a partir da Cotação ${quotation.quotationNumber}`,
      createdAt: new Date().toISOString()
    };

    setPurchaseOrders([newPO, ...purchaseOrders]);

    // Update quotation status
    setQuotations(quotations.map(q => q.id === quotation.id ? { ...q, status: 'converted_to_po', selectedSupplierId: winningSupplierId } : q));

    setActiveMainTab('orders');
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: any) => {
    setPurchaseOrders(purchaseOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // Section 12 & 13: Receive order to Stock & Finance
  const handleReceiveOrderToStockAndFinance = (order: B2BPurchaseOrder) => {
    // 1. Mark order as received with integration flags
    const updated = purchaseOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'received' as const,
          receivedAt: new Date().toISOString(),
          sentToAccountsPayable: true,
          sentToInventory: true,
          launchedCostValue: o.total
        };
      }
      return o;
    });
    setPurchaseOrders(updated);

    // 2. Register/Update Restaurant-Supplier relationship
    const relIndex = relationships.findIndex(r => r.supplierId === order.supplierId);
    if (relIndex >= 0) {
      const updatedRel = [...relationships];
      updatedRel[relIndex] = {
        ...updatedRel[relIndex],
        isUsed: true,
        lastPurchaseDate: new Date().toISOString(),
        totalPurchasedValue: updatedRel[relIndex].totalPurchasedValue + order.total,
        ordersCount: updatedRel[relIndex].ordersCount + 1
      };
      setRelationships(updatedRel);
    } else {
      const newRel: RestaurantSupplierRelationship = {
        id: `rel-${Date.now()}`,
        restaurantTenantId: currentTenantId,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        isFavorite: false,
        isUsed: true,
        negotiatedPrices: [],
        lastPurchaseDate: new Date().toISOString(),
        totalPurchasedValue: order.total,
        ordersCount: 1
      };
      setRelationships([newRel, ...relationships]);
    }
  };

  const handleToggleFavoriteRelationship = (relationshipId: string) => {
    setRelationships(relationships.map(r => r.id === relationshipId ? { ...r, isFavorite: !r.isFavorite } : r));
  };

  return (
    <div className="space-y-6">
      {/* 2. DASHBOARD DE FORNECEDORES - Top 5 Indicators Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* FORNECEDORES ATIVOS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Fornecedores Ativos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {dashboardKpis.activeSuppliersCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400">parceiros</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">Prontos para compras</span>
        </div>

        {/* FORNECEDORES CADASTRADOS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Fornecedores Cadastrados
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {dashboardKpis.totalSuppliersCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400">empresas</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold mt-1">Base homologada</span>
        </div>

        {/* PRODUTOS MONITORADOS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Produtos Monitorados
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {dashboardKpis.monitoredProductsCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400">insumos</span>
          </div>
          <span className="text-[10px] text-amber-600 font-bold mt-1">Catálogo multicomparação</span>
        </div>

        {/* PREÇOS ATUALIZADOS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Preços Atualizados
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {dashboardKpis.updatedPricesCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400">cotações</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">Tabelas vigentes</span>
        </div>

        {/* COTAÇÕES ATIVAS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Cotações Ativas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700 tracking-tight">
              {dashboardKpis.activeQuotationsCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400">em negociação</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold mt-1">Respostas recebidas</span>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveMainTab('suppliers')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'suppliers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 size={16} /> Fornecedores ({filteredSuppliers.length})
        </button>

        <button
          onClick={() => setActiveMainTab('central_products')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'central_products'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package size={16} /> Catálogo de Insumos ({centralProducts.length})
        </button>

        <button
          onClick={() => setActiveMainTab('price_comparison')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'price_comparison'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Scale size={16} /> Comparador de Preços
        </button>

        <button
          onClick={() => setActiveMainTab('quotations')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'quotations'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Send size={16} /> Cotações B2B ({quotations.length})
        </button>

        <button
          onClick={() => setActiveMainTab('orders')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart size={16} /> Pedidos de Compra ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveMainTab('alerts')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'alerts'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={16} /> Alertas de Mercado ({alerts.length})
        </button>

        <button
          onClick={() => setActiveMainTab('my_suppliers')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            activeMainTab === 'my_suppliers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Star size={16} /> Meus Fornecedores
        </button>
      </div>

      {/* 3 & 4: Search & Quick Filters Bar (Visible for suppliers tab) */}
      {activeMainTab === 'suppliers' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          {/* Top row: Smart Search + Actions */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder='Buscar fornecedor ou produto (ex: "JBS", "Bife bovino", "Frigorífico", "Ribeirão Preto")...'
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border flex items-center gap-2 ${
                  hasActiveAdvancedFilters || showAdvancedFilters
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <SlidersHorizontal size={15} />
                <span>Filtros Avançados</span>
                {hasActiveAdvancedFilters && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-xs transition-all flex items-center gap-2 shrink-0"
              >
                <Plus size={16} /> + Cadastrar Fornecedor
              </button>
            </div>
          </div>

          {/* Quick Filters Row (Section 3: TODOS, MINHA CIDADE, MINHA REGIÃO, ESTADO, CATEGORIA, ATIVOS, COM PREÇOS ATUALIZADOS) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-[11px] font-black uppercase tracking-wider">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">Filtros Rápidos:</span>

            <button
              onClick={() => { setQuickFilter('all'); setSelectedQuickCategory('Todas'); }}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                quickFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>

            <button
              onClick={() => setQuickFilter('my_city')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 ${
                quickFilter === 'my_city'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MapPin size={12} /> Minha Cidade
            </button>

            <button
              onClick={() => setQuickFilter('my_region')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                quickFilter === 'my_region'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Minha Região
            </button>

            <button
              onClick={() => setQuickFilter('state')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                quickFilter === 'state'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Estado (SP)
            </button>

            <button
              onClick={() => setQuickFilter('active_only')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                quickFilter === 'active_only'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ativos
            </button>

            <button
              onClick={() => setQuickFilter('updated_prices')}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                quickFilter === 'updated_prices'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Com Preços Atualizados
            </button>

            {/* Category Quick Select */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <span className="text-[10px] text-slate-400 font-bold">Categoria:</span>
              <select
                value={selectedQuickCategory}
                onChange={(e) => {
                  setSelectedQuickCategory(e.target.value);
                  setQuickFilter('category');
                }}
                className="p-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700"
              >
                <option value="Todas">Todas</option>
                {SUPPLIER_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Filters Expandable Drawer (Section 3: cidade, estado, categoria, tipo de fornecedor, produto, faixa de preço, etc.) */}
          {showAdvancedFilters && (
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-emerald-600" />
                  Painel de Filtros Avançados
                </span>
                <button
                  onClick={resetAdvancedFilters}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-bold flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Limpar Filtros
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={advCity}
                    onChange={(e) => setAdvCity(e.target.value)}
                    placeholder="Ex: Ribeirão Preto"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={advState}
                    onChange={(e) => setAdvState(e.target.value.toUpperCase())}
                    placeholder="Ex: SP"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Tipo de Fornecedor</label>
                  <select
                    value={advSupplierType}
                    onChange={(e) => setAdvSupplierType(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="distribuidor">Distribuidor</option>
                    <option value="atacadista">Atacadista</option>
                    <option value="produtor">Produtor Direto</option>
                    <option value="frigorifico">Frigorífico</option>
                    <option value="hortifruti">Hortifruti</option>
                    <option value="bebidas">Distribuidor de Bebidas</option>
                    <option value="embalagens">Embalagens</option>
                    <option value="limpeza">Produtos de Limpeza</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Insumo / Produto</label>
                  <input
                    type="text"
                    value={advProduct}
                    onChange={(e) => setAdvProduct(e.target.value)}
                    placeholder="Ex: Bife bovino"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Faixa de Preço Máx (R$)</label>
                  <input
                    type="number"
                    value={advMaxPrice}
                    onChange={(e) => setAdvMaxPrice(e.target.value)}
                    placeholder="Ex: 35.00"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Pedido Mínimo Máximo (R$)</label>
                  <input
                    type="number"
                    value={advMaxMinOrder}
                    onChange={(e) => setAdvMaxMinOrder(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Condição de Pagamento</label>
                  <input
                    type="text"
                    value={advPaymentCondition}
                    onChange={(e) => setAdvPaymentCondition(e.target.value)}
                    placeholder="Ex: 28 dias, Boleto, Pix"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={advDelivers}
                      onChange={(e) => setAdvDelivers(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Atende Delivery no Restaurante</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tab Content Display */}
      {activeMainTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>
              Mostrando {filteredSuppliers.length} de {suppliers.length} fornecedores cadastrados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSuppliers.map(sup => (
              <SupplierCard
                key={sup.id}
                supplier={sup}
                onSelect={(selected) => setSelectedSupplierForDetail(selected)}
                onCompareProduct={(prodId) => {
                  setSelectedProductForComparison(prodId);
                  setActiveMainTab('price_comparison');
                }}
                onRequestQuote={(selected) => {
                  setSelectedSupplierForDetail(selected);
                }}
              />
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
              <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-700">Nenhum fornecedor encontrado para esta busca.</p>
              <p className="text-xs">Tente limpar os filtros rápidos ou pesquisar por outro termo.</p>
              <button
                onClick={() => {
                  setGlobalSearch('');
                  setQuickFilter('all');
                  resetAdvancedFilters();
                }}
                className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>
      )}

      {activeMainTab === 'central_products' && (
        <CentralProductsView
          products={centralProducts}
          suppliers={suppliers}
          onCompareProduct={(prodId) => {
            setSelectedProductForComparison(prodId);
            setActiveMainTab('price_comparison');
          }}
          onRequestQuote={(prodId) => {
            setActiveMainTab('quotations');
          }}
          onSelectSupplier={(supplier) => setSelectedSupplierForDetail(supplier)}
        />
      )}

      {activeMainTab === 'price_comparison' && (
        <PriceComparisonView
          products={centralProducts}
          suppliers={suppliers}
          selectedProductId={selectedProductForComparison}
          onSelectSupplier={(supplier) => setSelectedSupplierForDetail(supplier)}
          onCreatePurchaseOrderWithSupplier={(supplier, productId, price, unit) => {
            const prod = centralProducts.find(p => p.id === productId);
            const newPO: B2BPurchaseOrder = {
              id: `po-${Date.now()}`,
              orderNumber: `PED-2026-${Math.floor(100 + Math.random() * 900)}`,
              restaurantTenantId: currentTenantId,
              restaurantName: 'Restaurante Sabor & Arte',
              supplierId: supplier.id,
              supplierName: supplier.tradeName,
              supplierCity: supplier.city,
              status: 'order_placed',
              items: [
                {
                  productId,
                  productName: prod?.name || 'Insumo',
                  unit,
                  quantity: 15,
                  unitPrice: price,
                  total: price * 15
                }
              ],
              subtotal: price * 15,
              freight: supplier.deliveryFee || 0,
              discount: 0,
              total: (price * 15) + (supplier.deliveryFee || 0),
              deliveryDays: supplier.avgDeliveryDays,
              estimatedDeliveryDate: new Date(Date.now() + supplier.avgDeliveryDays * 86400000).toISOString().split('T')[0],
              paymentMethod: supplier.paymentMethods[0] || 'Boleto 28d',
              paymentTerms: supplier.paymentTerms,
              createdAt: new Date().toISOString()
            };
            setPurchaseOrders([newPO, ...purchaseOrders]);
            setActiveMainTab('orders');
          }}
          onRequestQuoteWithSupplier={(supplier, productId) => {
            setActiveMainTab('quotations');
          }}
        />
      )}

      {activeMainTab === 'quotations' && (
        <QuotationsView
          quotations={quotations}
          suppliers={suppliers}
          products={centralProducts}
          onCreateQuotation={handleCreateQuotation}
          onConvertToPurchaseOrder={handleConvertToPurchaseOrder}
          onSelectSupplier={(supplier) => setSelectedSupplierForDetail(supplier)}
        />
      )}

      {activeMainTab === 'orders' && (
        <PurchaseOrdersView
          orders={purchaseOrders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onReceiveOrderToStockAndFinance={handleReceiveOrderToStockAndFinance}
        />
      )}

      {activeMainTab === 'alerts' && (
        <PriceAlertsView
          alerts={alerts}
          historyLogs={historyLogs}
          suppliers={suppliers}
          onCompareProduct={(prodId) => {
            setSelectedProductForComparison(prodId);
            setActiveMainTab('price_comparison');
          }}
          onDismissAlert={(id) => setAlerts(alerts.filter(a => a.id !== id))}
        />
      )}

      {activeMainTab === 'my_suppliers' && (
        <MySuppliersView
          relationships={relationships}
          suppliers={suppliers}
          onSelectSupplier={(supplier) => setSelectedSupplierForDetail(supplier)}
          onToggleFavorite={handleToggleFavoriteRelationship}
          onRequestQuoteWithSupplier={() => setActiveMainTab('quotations')}
        />
      )}

      {/* 7. FICHA DO FORNECEDOR (Drawer / Full view modal) */}
      {selectedSupplierForDetail && (
        <SupplierDetailView
          supplier={selectedSupplierForDetail}
          allSuppliers={suppliers}
          onClose={() => setSelectedSupplierForDetail(null)}
          onUpdatePrice={handleUpdatePrice}
          onAddNewProduct={handleAddNewProductToSupplier}
          onCreateQuotationWithSupplier={() => {
            setSelectedSupplierForDetail(null);
            setActiveMainTab('quotations');
          }}
          currentUserEmail={currentUserEmail}
        />
      )}

      {/* 5. CADASTRO DE FORNECEDOR (Modal with sections) */}
      {showAddSupplierModal && (
        <SupplierFormModal
          isOpen={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          onSave={handleSaveSupplier}
        />
      )}
    </div>
  );
};
