import React, { useState, useMemo, useEffect } from 'react';
import { 
  Order, 
  FinancialRecord, 
  Customer, 
  Product, 
  CashClosingReport, 
  CashSession, 
  AuditLog, 
  User, 
  BankAccount,
  Tenant 
} from '../types';
import { 
  AuditPeriodPreset, 
  getAuditPeriodRange, 
  calculateAuditMetrics, 
  detectInconsistencies,
  calculateMerchantAuditSummary,
  calculatePlatformComparison,
  buildMerchantPayoutsAudit,
  detectReconciliationDiscrepancies,
  MerchantAuditSummary,
  PlatformComparisonMetrics,
  MerchantPayoutAuditItem,
  ReconciliationDiscrepancy
} from '../services/auditService';
import { runPlatformDiagnostic } from '../services/diagnosticEngine';
import { 
  DiagnosticItem, 
  DiagnosticStatus, 
  DiagnosticAreaId, 
  PlatformHealthState 
} from './diagnostics/types';
import { DiagnosticDashboard } from './diagnostics/DiagnosticDashboard';
import { DiagnosticDetailModal } from './diagnostics/DiagnosticDetailModal';
import { DiagnosticAnomaliesTab } from './diagnostics/DiagnosticAnomaliesTab';
import { DiagnosticTimelineTab } from './diagnostics/DiagnosticTimelineTab';
import { DiagnosticQuickActionsTab } from './diagnostics/DiagnosticQuickActionsTab';
import { AuditHeader } from './audit/AuditHeader';
import { AuditKPIGrid } from './audit/AuditKPIGrid';
import { AuditMerchantSummary } from './audit/AuditMerchantSummary';
import { AuditMerchantPayoutsTab } from './audit/AuditMerchantPayoutsTab';
import { AuditReconciliationTab } from './audit/AuditReconciliationTab';
import { AuditInconsistenciesTab } from './audit/AuditInconsistenciesTab';
import { AuditOrdersTab } from './audit/AuditOrdersTab';
import { AuditCustomersTab } from './audit/AuditCustomersTab';
import { AuditAccountsReceivableTab } from './audit/AuditAccountsReceivableTab';
import { AuditFinancialRecordsTab } from './audit/AuditFinancialRecordsTab';
import { AuditProductsSoldTab } from './audit/AuditProductsSoldTab';
import { AuditCancellationsTab } from './audit/AuditCancellationsTab';
import { AuditDiscountsTab } from './audit/AuditDiscountsTab';
import { AuditCashTab } from './audit/AuditCashTab';
import { AuditUserLogsTab } from './audit/AuditUserLogsTab';
import { AuditGlobalSearchTab } from './audit/AuditGlobalSearchTab';
import { AuditReportsExportModal } from './audit/AuditReportsExportModal';
import { AuditAlertRulesModal } from './audit/AuditAlertRulesModal';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  DollarSign, 
  Package, 
  XCircle, 
  Tag, 
  Coins, 
  UserCheck, 
  Search,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Building2,
  Receipt,
  Activity,
  Clock,
  Zap
} from 'lucide-react';

export interface SystemAuditProps {
  orders?: Order[];
  financialRecords?: FinancialRecord[];
  customers?: Customer[];
  products?: Product[];
  cashClosings?: CashClosingReport[];
  cashSession?: CashSession;
  auditLogs?: AuditLog[];
  users?: User[];
  currentUser?: User | null;
  bankAccounts?: BankAccount[];
  tenants?: Tenant[];
  selectedTenantId?: string | null;
  onSelectTenantId?: (tenantId: string | null) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onAddFinancialRecord?: (record: Partial<FinancialRecord>) => void;
  onUpdateFinancialRecord?: (id: string, updates: Partial<FinancialRecord>) => void;
  onOpenOrder?: (orderId: string) => void;
  onRefresh?: () => void;
}

export const SystemAudit: React.FC<SystemAuditProps> = ({
  orders = [],
  financialRecords = [],
  customers = [],
  products = [],
  cashClosings = [],
  cashSession,
  auditLogs = [],
  users = [],
  currentUser,
  bankAccounts = [],
  tenants = [],
  selectedTenantId: externalSelectedTenantId,
  onSelectTenantId: externalOnSelectTenantId,
  onUpdateCustomer = () => {},
  onAddFinancialRecord = () => {},
  onUpdateFinancialRecord = () => {},
  onOpenOrder,
  onRefresh = () => {}
}) => {
  // Estado local ou controlado do lojista selecionado
  const [internalSelectedTenantId, setInternalSelectedTenantId] = useState<string | null>(
    externalSelectedTenantId !== undefined ? externalSelectedTenantId : null
  );

  useEffect(() => {
    if (externalSelectedTenantId !== undefined) {
      setInternalSelectedTenantId(externalSelectedTenantId);
    }
  }, [externalSelectedTenantId]);

  const effectiveTenantId = internalSelectedTenantId;

  const handleSelectTenant = (tenantId: string | null) => {
    setInternalSelectedTenantId(tenantId);
    if (externalOnSelectTenantId) {
      externalOnSelectTenantId(tenantId);
    }
  };

  // Encontrar o tenant atual se selecionado
  const currentTenant = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return null;
    return (tenants || []).find(t => t && t.id === effectiveTenantId) || null;
  }, [effectiveTenantId, tenants]);

  // Estado do Período
  const [activePeriod, setActivePeriod] = useState<AuditPeriodPreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sub-abas da Central de Diagnóstico & Auditoria
  type AuditTabId = 
    | 'health'
    | 'anomalies'
    | 'timeline'
    | 'quick-actions'
    | 'merchant-summary'
    | 'dashboard' 
    | 'payouts'
    | 'reconciliation'
    | 'inconsistencies' 
    | 'orders' 
    | 'customers' 
    | 'accounts-receivable' 
    | 'financial-records' 
    | 'products' 
    | 'cancellations' 
    | 'discounts' 
    | 'cash' 
    | 'user-logs' 
    | 'search';

  const [activeSubTab, setActiveSubTab] = useState<AuditTabId>('health');

  // Estado do Motor de Diagnóstico Preditivo & Saúde
  const [isRunningScan, setIsRunningScan] = useState<boolean>(false);
  const [selectedDiagnosticForModal, setSelectedDiagnosticForModal] = useState<DiagnosticItem | null>(null);
  const [resolvedDiagnosticIds, setResolvedDiagnosticIds] = useState<string[]>([]);
  const [diagnosticAreaFilter, setDiagnosticAreaFilter] = useState<DiagnosticAreaId | 'ALL'>('ALL');
  const [manualScanTrigger, setManualScanTrigger] = useState<number>(0);

  // Trocar automaticamente para a aba do lojista se selecionar um
  useEffect(() => {
    if (currentTenant && activeSubTab === 'dashboard') {
      setActiveSubTab('merchant-summary');
    } else if (!currentTenant && activeSubTab === 'merchant-summary') {
      setActiveSubTab('dashboard');
    }
  }, [currentTenant]);

  // Seleções para navegação cruzada
  const [selectedOrderIdForTab, setSelectedOrderIdForTab] = useState<string | null>(null);
  const [selectedCustomerIdForTab, setSelectedCustomerIdForTab] = useState<string | null>(null);

  // Modais de Exportação e Regras
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAlertRulesModalOpen, setIsAlertRulesModalOpen] = useState(false);

  // Parâmetros de Regras de Alerta
  const [discountThreshold, setDiscountThreshold] = useState<number>(20);
  const [cancellationThreshold, setCancellationThreshold] = useState<number>(100);
  const [reversalThreshold, setReversalThreshold] = useState<number>(200);
  const [maxUserCancels, setMaxUserCancels] = useState<number>(5);

  // Range de data computado
  const dateRange = useMemo(() => {
    return getAuditPeriodRange(activePeriod, customStartDate, customEndDate);
  }, [activePeriod, customStartDate, customEndDate]);

  // Defesas robustas contra coleções nulas ou indefinidas
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const safeFinancialRecords = useMemo(() => (Array.isArray(financialRecords) ? financialRecords : []), [financialRecords]);
  const safeCustomers = useMemo(() => (Array.isArray(customers) ? customers : []), [customers]);
  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const safeCashClosings = useMemo(() => (Array.isArray(cashClosings) ? cashClosings : []), [cashClosings]);
  const safeAuditLogs = useMemo(() => (Array.isArray(auditLogs) ? auditLogs : []), [auditLogs]);
  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const safeTenants = useMemo(() => (Array.isArray(tenants) ? tenants : []), [tenants]);

  // ISOLAMENTO MULTITENANT ESTRITO:
  // Se um lojista estiver selecionado, nenhum dado de outro lojista pode vazar para os cálculos ou telas.
  const isolatedOrders = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeOrders;
    return safeOrders.filter(o => o && o.tenantId === effectiveTenantId);
  }, [safeOrders, effectiveTenantId]);

  const isolatedFinancialRecords = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeFinancialRecords;
    return safeFinancialRecords.filter(r => r && (r as any).tenantId === effectiveTenantId);
  }, [safeFinancialRecords, effectiveTenantId]);

  const isolatedCustomers = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeCustomers;
    return safeCustomers.filter(c => c && (c as any).tenantId === effectiveTenantId);
  }, [safeCustomers, effectiveTenantId]);

  const isolatedProducts = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeProducts;
    return safeProducts.filter(p => p && (p as any).tenantId === effectiveTenantId);
  }, [safeProducts, effectiveTenantId]);

  const isolatedCashClosings = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeCashClosings;
    return safeCashClosings.filter(c => c && (c as any).tenantId === effectiveTenantId);
  }, [safeCashClosings, effectiveTenantId]);

  const isolatedAuditLogs = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeAuditLogs;
    return safeAuditLogs.filter(l => l && (l as any).tenantId === effectiveTenantId);
  }, [safeAuditLogs, effectiveTenantId]);

  const isolatedUsers = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return safeUsers;
    return safeUsers.filter(u => u && u.tenantId === effectiveTenantId);
  }, [safeUsers, effectiveTenantId]);

  // CÁLCULOS DO LOJISTA ESPECÍFICO (Se selecionado)
  const merchantAuditSummary: MerchantAuditSummary | null = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return null;
    return calculateMerchantAuditSummary({
      orders: isolatedOrders,
      financialRecords: isolatedFinancialRecords,
      customers: isolatedCustomers,
      auditLogs: isolatedAuditLogs,
      range: dateRange
    });
  }, [effectiveTenantId, isolatedOrders, isolatedFinancialRecords, isolatedCustomers, isolatedAuditLogs, dateRange]);

  const platformComparison: PlatformComparisonMetrics | null = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return null;
    return calculatePlatformComparison(
      isolatedOrders,
      safeOrders, // Todas as ordens da plataforma para fins de benchmarking
      dateRange
    );
  }, [effectiveTenantId, isolatedOrders, safeOrders, dateRange]);

  const merchantPayouts: MerchantPayoutAuditItem[] = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return [];
    return buildMerchantPayoutsAudit(
      isolatedOrders,
      dateRange
    );
  }, [effectiveTenantId, isolatedOrders, dateRange]);

  const reconciliationDiscrepancies: ReconciliationDiscrepancy[] = useMemo(() => {
    if (!effectiveTenantId || effectiveTenantId === 'ALL') return [];
    return detectReconciliationDiscrepancies({
      orders: isolatedOrders,
      financialRecords: isolatedFinancialRecords,
      payouts: merchantPayouts,
      auditLogs: isolatedAuditLogs
    });
  }, [effectiveTenantId, isolatedOrders, isolatedFinancialRecords, merchantPayouts, isolatedAuditLogs]);

  // Detecção automática de inconsistências gerais
  const detectedInconsistencies = useMemo(() => {
    return detectInconsistencies({
      orders: isolatedOrders,
      financialRecords: isolatedFinancialRecords,
      customers: isolatedCustomers,
      products: isolatedProducts,
      cashClosings: isolatedCashClosings,
      cashSession,
      auditLogs: isolatedAuditLogs,
      discountThresholdPercent: discountThreshold
    });
  }, [
    isolatedOrders, 
    isolatedFinancialRecords, 
    isolatedCustomers, 
    isolatedProducts, 
    isolatedCashClosings, 
    cashSession, 
    isolatedAuditLogs, 
    discountThreshold
  ]);

  // Métricas do período
  const metrics = useMemo(() => {
    return calculateAuditMetrics({
      orders: isolatedOrders,
      financialRecords: isolatedFinancialRecords,
      customers: isolatedCustomers,
      cashClosings: isolatedCashClosings,
      cashSession,
      auditLogs: isolatedAuditLogs,
      range: dateRange,
      inconsistenciesCount: detectedInconsistencies.length
    });
  }, [
    isolatedOrders, 
    isolatedFinancialRecords, 
    isolatedCustomers, 
    isolatedCashClosings, 
    cashSession, 
    isolatedAuditLogs, 
    dateRange, 
    detectedInconsistencies.length
  ]);

  // Execução do Motor de Diagnóstico Preditivo da Plataforma (9 Módulos)
  const platformHealthState = useMemo(() => {
    return runPlatformDiagnostic({
      orders: isolatedOrders,
      financialRecords: isolatedFinancialRecords,
      customers: isolatedCustomers,
      products: isolatedProducts,
      cashClosings: isolatedCashClosings,
      cashSession,
      auditLogs: isolatedAuditLogs,
      users: isolatedUsers,
      tenantId: effectiveTenantId,
      resolvedItemIds: resolvedDiagnosticIds
    });
  }, [
    isolatedOrders,
    isolatedFinancialRecords,
    isolatedCustomers,
    isolatedProducts,
    isolatedCashClosings,
    cashSession,
    isolatedAuditLogs,
    isolatedUsers,
    effectiveTenantId,
    resolvedDiagnosticIds,
    manualScanTrigger
  ]);

  const handleRunDiagnostic = () => {
    setIsRunningScan(true);
    setTimeout(() => {
      setManualScanTrigger(Date.now());
      setIsRunningScan(false);
    }, 1100);
  };

  const handleResolveDiagnostic = (id: string, notes?: string) => {
    setResolvedDiagnosticIds(prev => prev.includes(id) ? prev : [...prev, id]);
    if (selectedDiagnosticForModal && selectedDiagnosticForModal.id === id) {
      setSelectedDiagnosticForModal(prev => prev ? {
        ...prev,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionNotes: notes,
        auditTrail: [
          ...prev.auditTrail,
          {
            timestamp: new Date().toISOString(),
            action: 'Resolvido pelo Operador',
            user: currentUser?.name || currentUser?.email || 'Gerente',
            details: notes || 'Ação preventiva concluída com sucesso'
          }
        ]
      } : null);
    }
  };

  const handleExecuteQuickAction = (actionId: string, diag?: DiagnosticItem) => {
    if (actionId === 'reconcile_cash' || actionId === 'reconcile-cash-all') {
      onAddFinancialRecord({
        description: 'Ajuste Preventivo de Conciliação de Caixa',
        amount: diag?.financialImpactEstimated || 15.00,
        type: 'income',
        category: 'Ajuste de Conciliação',
        paymentMethod: 'Dinheiro',
        date: new Date().toISOString().split('T')[0]
      });
    } else if (actionId === 'resync_webhook' || actionId === 'resync-all-webhooks') {
      onRefresh();
    }
  };

  // Navegação cruzada ao clicar em investigar
  const handleInvestigate = (entityType: string, entityId: string) => {
    if (entityType === 'order') {
      setSelectedOrderIdForTab(entityId);
      setActiveSubTab('orders');
    } else if (entityType === 'customer' || entityType === 'account_receivable') {
      setSelectedCustomerIdForTab(entityId);
      setActiveSubTab('customers');
    } else if (entityType === 'cash_session') {
      setActiveSubTab('cash');
    } else if (entityType === 'financial_record') {
      setActiveSubTab('financial-records');
    } else if (entityType === 'product') {
      setActiveSubTab('products');
    } else if (entityType === 'user') {
      setActiveSubTab('user-logs');
    }
  };

  // Navegação cruzada de cliente para pedidos do lojista
  const handleSelectCustomerForOrders = (customerName: string) => {
    setActiveSubTab('orders');
  };

  // Lista de Abas Dinâmicas (Central de Diagnóstico & Saúde + Auditoria Completa)
  const navTabs = useMemo(() => {
    const tabs: { 
      id: AuditTabId; 
      label: string; 
      icon: React.FC<{ className?: string }>; 
      badge?: number; 
      badgeColor?: string 
    }[] = [];

    // 1. NÚCLEO DA CENTRAL DE DIAGNÓSTICO E SAÚDE DA PLATAFORMA
    tabs.push({
      id: 'health',
      label: 'Saúde da Plataforma',
      icon: Activity
    });

    const activeAnomaliesCount = platformHealthState.diagnostics.filter(d => !d.isResolved).length;
    tabs.push({
      id: 'anomalies',
      label: 'Diagnóstico Proativo',
      icon: AlertTriangle,
      badge: activeAnomaliesCount > 0 ? activeAnomaliesCount : undefined,
      badgeColor: activeAnomaliesCount > 0 ? 'bg-amber-500 text-white' : undefined
    });

    tabs.push({
      id: 'timeline',
      label: 'Linha do Tempo',
      icon: Clock
    });

    tabs.push({
      id: 'quick-actions',
      label: 'Auto-Correção',
      icon: Zap
    });

    // Se estiver em modo Lojista: Primeira aba é o Resumo Executivo do Lojista
    if (currentTenant) {
      tabs.push({ 
        id: 'merchant-summary', 
        label: 'Resumo do Lojista', 
        icon: Building2 
      });
      tabs.push({ 
        id: 'reconciliation', 
        label: 'Conciliação Automática', 
        icon: ShieldCheck,
        badge: reconciliationDiscrepancies.length > 0 ? reconciliationDiscrepancies.length : undefined,
        badgeColor: reconciliationDiscrepancies.length > 0 ? 'bg-rose-500 text-white' : undefined
      });
      tabs.push({ 
        id: 'payouts', 
        label: 'Repasses & Comissões', 
        icon: Receipt 
      });
    }

    tabs.push({ 
      id: 'dashboard', 
      label: currentTenant ? 'Visão Executiva (KPIs)' : 'Visão Geral Plataforma', 
      icon: LayoutDashboard 
    });

    tabs.push({ 
      id: 'inconsistencies', 
      label: 'Inconsistências & Riscos', 
      icon: AlertTriangle, 
      badge: detectedInconsistencies.length, 
      badgeColor: detectedInconsistencies.length > 0 ? 'bg-rose-500 text-white' : undefined 
    });

    tabs.push({ 
      id: 'orders', 
      label: currentTenant ? 'Pedidos do Estabelecimento' : 'Todos os Pedidos', 
      icon: ShoppingBag 
    });

    tabs.push({ 
      id: 'customers', 
      label: 'Clientes & Timeline', 
      icon: Users 
    });

    tabs.push({ 
      id: 'accounts-receivable', 
      label: 'Contas a Receber (Fiado)', 
      icon: CreditCard 
    });

    tabs.push({ 
      id: 'financial-records', 
      label: 'Lançamentos & Estornos', 
      icon: DollarSign 
    });

    tabs.push({ 
      id: 'products', 
      label: 'Itens Vendidos & CMV', 
      icon: Package 
    });

    tabs.push({ 
      id: 'cancellations', 
      label: 'Cancelamentos', 
      icon: XCircle,
      badge: metrics.canceledOrdersCount > 0 ? metrics.canceledOrdersCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800'
    });

    tabs.push({ 
      id: 'discounts', 
      label: 'Descontos & Cupons', 
      icon: Tag 
    });

    tabs.push({ 
      id: 'cash', 
      label: 'Auditoria de Caixa', 
      icon: Coins 
    });

    tabs.push({ 
      id: 'user-logs', 
      label: 'Log de Operações', 
      icon: UserCheck 
    });

    tabs.push({ 
      id: 'search', 
      label: 'Pesquisa Global', 
      icon: Search 
    });

    return tabs;
  }, [currentTenant, reconciliationDiscrepancies.length, detectedInconsistencies.length, metrics.canceledOrdersCount]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Cabeçalho de Auditoria com Seletor Multitenant de Lojista */}
      <AuditHeader
        activePeriod={activePeriod}
        setActivePeriod={setActivePeriod}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={onRefresh}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenAlertRulesModal={() => setIsAlertRulesModalOpen(true)}
        inconsistenciesCount={detectedInconsistencies.length}
        tenants={tenants}
        selectedTenantId={effectiveTenantId}
        onSelectTenantId={handleSelectTenant}
        activeSubTab={activeSubTab}
        onNavigateSubTab={(tab) => setActiveSubTab(tab as AuditTabId)}
      />

      {/* Navegação Secundária em Abas */}
      <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto shadow-2xs">
        <div className="flex items-center gap-1 min-w-max py-2">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${tab.badgeColor || 'bg-slate-200 text-slate-800'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* ABA: SAÚDE DA PLATAFORMA (DASHBOARD PRINCIPAL) */}
        {activeSubTab === 'health' && (
          <DiagnosticDashboard
            healthState={platformHealthState}
            onRunDiagnostic={handleRunDiagnostic}
            isRunningScan={isRunningScan}
            onSelectDiagnostic={(diag) => setSelectedDiagnosticForModal(diag)}
            onNavigateArea={(areaId) => {
              setDiagnosticAreaFilter(areaId);
              setActiveSubTab('anomalies');
            }}
            onNavigateSubTab={(tabId) => setActiveSubTab(tabId as AuditTabId)}
          />
        )}

        {/* ABA: DIAGNÓSTICO PROATIVO & ANOMALIAS */}
        {activeSubTab === 'anomalies' && (
          <DiagnosticAnomaliesTab
            diagnostics={platformHealthState.diagnostics}
            onSelectDiagnostic={(diag) => setSelectedDiagnosticForModal(diag)}
            onResolveDiagnostic={handleResolveDiagnostic}
            onExecuteQuickAction={handleExecuteQuickAction}
            initialAreaFilter={diagnosticAreaFilter}
          />
        )}

        {/* ABA: TIMELINE DE EVENTOS & INCIDENTES */}
        {activeSubTab === 'timeline' && (
          <DiagnosticTimelineTab
            diagnostics={platformHealthState.diagnostics}
            onSelectDiagnostic={(diag) => setSelectedDiagnosticForModal(diag)}
          />
        )}

        {/* ABA: AUTO-CORREÇÃO & AÇÕES RÁPIDAS */}
        {activeSubTab === 'quick-actions' && (
          <DiagnosticQuickActionsTab
            diagnostics={platformHealthState.diagnostics}
            onExecuteAction={handleExecuteQuickAction}
            onResolveDiagnostic={handleResolveDiagnostic}
          />
        )}

        {/* ABA DO LOJISTA: RESUMO OPERACIONAL, FINANCEIRO E AUDITORIA + BENCHMARKING */}
        {activeSubTab === 'merchant-summary' && currentTenant && merchantAuditSummary && platformComparison && (
          <AuditMerchantSummary
            summary={merchantAuditSummary}
            comparison={platformComparison}
            tenant={currentTenant}
            onNavigateTab={(tab) => setActiveSubTab(tab as AuditTabId)}
          />
        )}

        {/* ABA DO LOJISTA: REPASSES & CICLOS DE FATURAMENTO */}
        {activeSubTab === 'payouts' && (
          <AuditMerchantPayoutsTab
            payouts={merchantPayouts}
            allOrders={isolatedOrders}
            range={dateRange}
            merchantName={currentTenant?.name}
            onSelectOrder={(orderId) => {
              setSelectedOrderIdForTab(orderId);
              setActiveSubTab('orders');
            }}
          />
        )}

        {/* ABA DO LOJISTA: CONCILIAÇÃO AUTOMÁTICA (9 REGRAS) */}
        {activeSubTab === 'reconciliation' && (
          <AuditReconciliationTab
            discrepancies={reconciliationDiscrepancies}
            onInspectOrder={(orderId) => {
              setSelectedOrderIdForTab(orderId);
              setActiveSubTab('orders');
            }}
            onInspectFinancialRecord={(recId) => {
              setActiveSubTab('financial-records');
            }}
            onRefresh={onRefresh}
          />
        )}

        {/* ABA: DASHBOARD EXECUTIVO COM KPIS */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-6">
            <AuditKPIGrid 
              metrics={metrics} 
              onCardClick={(tab) => setActiveSubTab(tab as AuditTabId)} 
            />

            {/* Painel Duplo: Alertas Críticos Recentes & Balanço de Conformidade */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Inconsistências mais urgentes */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Apontamentos de Auditoria em Destaque
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('inconsistencies')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Ver todas ({detectedInconsistencies.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {detectedInconsistencies.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 font-bold">
                    Nenhuma inconformidade operacional detectada. Sistema 100% conciliado no período.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {detectedInconsistencies.slice(0, 4).map(inc => (
                      <div key={inc.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs gap-3">
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-900">{inc.title}</div>
                          <p className="text-slate-600 text-[11px] truncate max-w-md">{inc.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInvestigate(inc.entityType, inc.entityId)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0"
                        >
                          Auditar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Balanço e Integridade do Período */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Índice de Integridade e Rastreabilidade
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentTenant ? `Isolamento seguro para ${currentTenant.name}` : 'Nenhum pedido ou movimentação financeira pode desaparecer sem trilha de autoria.'}
                  </p>
                </div>

                <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">Total Faturado no Período:</span>
                    <span className="font-black text-slate-900">{metrics.totalSold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">Quitado / Caixa:</span>
                    <span className="font-black text-emerald-700">{metrics.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">Pendente / Fiado:</span>
                    <span className="font-black text-amber-700">{metrics.totalOpenPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-bold">Descontos + Estornos:</span>
                    <span className="font-black text-purple-700">{(metrics.totalDiscounts + metrics.totalReversals).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Isolamento Multi-tenant & Trilha:</span>
                  <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    100% Imutável
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Aba 2: Inconsistências & Alertas */}
        {activeSubTab === 'inconsistencies' && (
          <AuditInconsistenciesTab 
            inconsistencies={detectedInconsistencies} 
            onInvestigate={handleInvestigate} 
          />
        )}

        {/* Aba 3: Auditoria de Pedidos (Antes x Depois) */}
        {activeSubTab === 'orders' && (
          <AuditOrdersTab 
            orders={isolatedOrders} 
            auditLogs={isolatedAuditLogs} 
            products={isolatedProducts} 
            users={isolatedUsers}
            range={dateRange} 
            initialSelectedOrderId={selectedOrderIdForTab} 
          />
        )}

        {/* Aba 4: Auditoria de Clientes */}
        {activeSubTab === 'customers' && (
          <AuditCustomersTab 
            customers={isolatedCustomers} 
            orders={isolatedOrders} 
            financialRecords={isolatedFinancialRecords} 
            auditLogs={isolatedAuditLogs} 
            range={dateRange} 
            initialSelectedCustomerId={selectedCustomerIdForTab}
            onSelectCustomerForOrders={handleSelectCustomerForOrders}
          />
        )}

        {/* Aba 5: Contas a Receber (Fiado) */}
        {activeSubTab === 'accounts-receivable' && (
          <AuditAccountsReceivableTab 
            customers={isolatedCustomers} 
            orders={isolatedOrders} 
            auditLogs={isolatedAuditLogs} 
            users={isolatedUsers} 
            currentUser={currentUser} 
            range={dateRange} 
            onUpdateCustomer={onUpdateCustomer} 
          />
        )}

        {/* Aba 6: Lançamentos Financeiros & Estornos */}
        {activeSubTab === 'financial-records' && (
          <AuditFinancialRecordsTab 
            financialRecords={isolatedFinancialRecords} 
            auditLogs={isolatedAuditLogs} 
            bankAccounts={bankAccounts} 
            users={isolatedUsers} 
            currentUser={currentUser} 
            range={dateRange} 
            onAddRecord={onAddFinancialRecord} 
            onUpdateRecord={onUpdateFinancialRecord} 
          />
        )}

        {/* Aba 7: Produtos Vendidos & CMV */}
        {activeSubTab === 'products' && (
          <AuditProductsSoldTab 
            orders={isolatedOrders} 
            products={isolatedProducts} 
            range={dateRange} 
            onOpenOrder={(orderId) => {
              setSelectedOrderIdForTab(orderId);
              setActiveSubTab('orders');
            }} 
          />
        )}

        {/* Aba 8: Cancelamentos */}
        {activeSubTab === 'cancellations' && (
          <AuditCancellationsTab 
            orders={isolatedOrders} 
            auditLogs={isolatedAuditLogs} 
            users={isolatedUsers} 
            range={dateRange} 
            onOpenOrder={(orderId) => {
              setSelectedOrderIdForTab(orderId);
              setActiveSubTab('orders');
            }} 
          />
        )}

        {/* Aba 9: Descontos & Ranking */}
        {activeSubTab === 'discounts' && (
          <AuditDiscountsTab 
            orders={isolatedOrders} 
            auditLogs={isolatedAuditLogs} 
            users={isolatedUsers} 
            range={dateRange} 
            discountThresholdPercent={discountThreshold} 
            onOpenOrder={(orderId) => {
              setSelectedOrderIdForTab(orderId);
              setActiveSubTab('orders');
            }} 
          />
        )}

        {/* Aba 10: Auditoria de Caixa */}
        {activeSubTab === 'cash' && (
          <AuditCashTab 
            cashClosings={isolatedCashClosings} 
            cashSession={cashSession} 
            orders={isolatedOrders} 
            financialRecords={isolatedFinancialRecords} 
            range={dateRange} 
          />
        )}

        {/* Aba 11: Log de Usuários */}
        {activeSubTab === 'user-logs' && (
          <AuditUserLogsTab 
            auditLogs={isolatedAuditLogs} 
            users={isolatedUsers} 
            range={dateRange} 
          />
        )}

        {/* Aba 12: Pesquisa Global (Cadeia de Rastreabilidade) */}
        {activeSubTab === 'search' && (
          <AuditGlobalSearchTab 
            customers={isolatedCustomers} 
            orders={isolatedOrders} 
            financialRecords={isolatedFinancialRecords} 
            products={isolatedProducts} 
            auditLogs={isolatedAuditLogs} 
            users={isolatedUsers} 
            onOpenOrder={(orderId) => {
              setSelectedOrderIdForTab(orderId);
              setActiveSubTab('orders');
            }} 
            onOpenCustomer={(customerId) => {
              setSelectedCustomerIdForTab(customerId);
              setActiveSubTab('customers');
            }} 
          />
        )}
      </div>

      {/* Modal de Exportação de Relatórios (PDF, Excel, CSV) */}
      <AuditReportsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        metrics={metrics}
        range={dateRange}
        orders={isolatedOrders}
        financialRecords={isolatedFinancialRecords}
        inconsistencies={detectedInconsistencies}
        auditLogs={isolatedAuditLogs}
        merchantName={currentTenant?.name}
      />

      {/* Modal de Configuração de Regras de Alerta */}
      <AuditAlertRulesModal
        isOpen={isAlertRulesModalOpen}
        onClose={() => setIsAlertRulesModalOpen(false)}
        discountThreshold={discountThreshold}
        setDiscountThreshold={setDiscountThreshold}
        cancellationThreshold={cancellationThreshold}
        setCancellationThreshold={setCancellationThreshold}
        reversalThreshold={reversalThreshold}
        setReversalThreshold={setReversalThreshold}
        maxUserCancels={maxUserCancels}
        setMaxUserCancels={setMaxUserCancels}
      />

      {/* Modal Ficha Completa de Diagnóstico & Resolução */}
      <DiagnosticDetailModal
        diagnostic={selectedDiagnosticForModal}
        onClose={() => setSelectedDiagnosticForModal(null)}
        onResolve={handleResolveDiagnostic}
        onExecuteQuickAction={handleExecuteQuickAction}
      />
    </div>
  );
};

export default SystemAudit;
