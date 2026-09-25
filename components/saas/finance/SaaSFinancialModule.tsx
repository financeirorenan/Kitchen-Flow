import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Layers,
  Building2,
  DollarSign
} from 'lucide-react';
import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';
import { 
  FinancialMainTab, 
  SaasLedgerItem, 
  FinancialPeriodFilter 
} from './types';
import { 
  DEFAULT_MARKETPLACE_FIXED_FEE, 
  isDateInPeriod, 
  getTenantPlanDetails, 
  getDaysDiff,
  calculateMarketplaceTenantStats 
} from './financeHelpers';
import { 
  DEFAULT_REGISTERED_TENANTS,
  DEFAULT_SAAS_PLANS,
  DEFAULT_MARKETPLACE_ORDERS,
  DEFAULT_MARKETPLACE_INVOICES,
  DEFAULT_SAAS_LEDGER
} from './defaultFinancialData';
import { OverviewTab } from './OverviewTab';
import { ReceivablesTab } from './ReceivablesTab';
import { PayablesTab } from './PayablesTab';
import { ReconciliationTab } from './ReconciliationTab';
import { ReportsTab } from './ReportsTab';
import { TenantFinancialProfileModal } from './TenantFinancialProfileModal';
import { BillingCenterModal } from './BillingCenterModal';
import { AddLedgerModal } from './AddLedgerModal';
import { LedgerDetailModal } from './LedgerDetailModal';

interface SaaSFinancialModuleProps {
  tenants: Tenant[];
  plans: Plan[];
  orders: Order[];
  marketplaceInvoices: MarketplaceInvoice[];
  saasLedger: SaasLedgerItem[];
  marketplaceFixedFee?: number;
  marketplaceFee?: number;
  onSaveLedgerItem: (item: Partial<SaasLedgerItem>) => void;
  onToggleLedgerStatus: (item: SaasLedgerItem) => void;
  onQuickSettleSubscription: (tenant: Tenant) => void;
  onSettleMarketplaceCycle: (tenant: Tenant, unbilledOrders: Order[], totalAmount: number) => void;
}

export const SaaSFinancialModule: React.FC<SaaSFinancialModuleProps> = ({
  tenants,
  plans,
  orders,
  marketplaceInvoices,
  saasLedger,
  marketplaceFixedFee = DEFAULT_MARKETPLACE_FIXED_FEE,
  marketplaceFee = 0,
  onSaveLedgerItem,
  onToggleLedgerStatus,
  onQuickSettleSubscription,
  onSettleMarketplaceCycle,
}) => {
  // Navigation State: 5 distinct tabs
  const [activeTab, setActiveTab] = useState<FinancialMainTab>('overview');

  // Period Filter State
  const [period, setPeriod] = useState<FinancialPeriodFilter>('this_month');
  const [customRange, setCustomRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Modal States
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<Tenant | null>(null);
  const [billingModalData, setBillingModalData] = useState<{
    tenant: Tenant;
    amount: number;
    options?: { monthly?: number; mkt?: number; ordersCount?: number };
  } | null>(null);
  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
  const [addLedgerDefaultType, setAddLedgerDefaultType] = useState<'receber' | 'pagar'>('pagar');
  const [selectedLedgerForDetail, setSelectedLedgerForDetail] = useState<SaasLedgerItem | null>(null);

  // Resilient Data Fallbacks (Guarantees pre-registered tenants, plans, and orders even if Firestore is offline/exhausted)
  const effectiveTenants = useMemo(() => {
    if (!tenants || tenants.length === 0) return DEFAULT_REGISTERED_TENANTS;
    const list = [...tenants];
    DEFAULT_REGISTERED_TENANTS.forEach(dt => {
      if (!list.some(t => t.id === dt.id || t.name?.toLowerCase() === dt.name.toLowerCase())) {
        list.push(dt);
      }
    });
    return list;
  }, [tenants]);

  const effectivePlans = useMemo(() => {
    if (!plans || plans.length === 0) return DEFAULT_SAAS_PLANS;
    const list = [...plans];
    DEFAULT_SAAS_PLANS.forEach(dp => {
      if (!list.some(p => p.id === dp.id)) {
        list.push(dp);
      }
    });
    return list;
  }, [plans]);

  const effectiveOrders = useMemo(() => {
    const list = [...(orders || [])];
    DEFAULT_MARKETPLACE_ORDERS.forEach(dmo => {
      if (!list.some(o => o.id === dmo.id)) {
        list.push(dmo);
      }
    });
    return list;
  }, [orders]);

  const effectiveLedger = useMemo(() => {
    if (!saasLedger || saasLedger.length === 0) return DEFAULT_SAAS_LEDGER;
    const list = [...saasLedger];
    DEFAULT_SAAS_LEDGER.forEach(dsl => {
      if (!list.some(l => l.id === dsl.id)) {
        list.push(dsl);
      }
    });
    return list;
  }, [saasLedger]);

  const effectiveInvoices = useMemo(() => {
    if (!marketplaceInvoices || marketplaceInvoices.length === 0) return DEFAULT_MARKETPLACE_INVOICES;
    return marketplaceInvoices;
  }, [marketplaceInvoices]);

  // Global Financial Calculations
  const {
    totalReceivable,
    totalPayable,
    totalReceivedInPeriod,
    totalPaidInPeriod,
    netResultInPeriod,
    pendingTenantsList,
    alertsData,
  } = useMemo(() => {
    // 1. Receivables: Active subscriptions in cycle + Marketplace unbilled fees (R$ 2,00/order)
    let receivableSum = 0;
    const pendingTenants: Array<{
      tenant: Tenant;
      amount: number;
      dueDateFormatted: string;
      statusLabel: string;
      daysDiff: number;
      isOverdue: boolean;
    }> = [];

    effectiveTenants.forEach(tenant => {
      const { price } = getTenantPlanDetails(tenant, effectivePlans);
      const days = getDaysDiff(tenant.subscription?.expiryDate);
      const isOverdue = days < 0 && tenant.subscription?.plan !== 'FREE';
      const isPending = days <= 5 && tenant.subscription?.plan !== 'FREE';

      const mktStats = calculateMarketplaceTenantStats(
        tenant.id,
        effectiveOrders,
        effectiveInvoices,
        marketplaceFixedFee,
        marketplaceFee
      );

      // Monthly fee expectation for active tenant
      const monthlyFee = (tenant.active && tenant.subscription?.plan !== 'FREE') ? price : 0;
      const totalTenantCycle = monthlyFee + mktStats.unbilledFees;
      receivableSum += totalTenantCycle;

      // Pending/Actionable tenant for quick billing:
      // Includes overdue, upcoming expiration (<= 5 days), or pending marketplace fees
      const actionableAmount = (isOverdue || isPending ? monthlyFee : 0) + mktStats.unbilledFees;
      if (actionableAmount > 0 || isOverdue) {
        pendingTenants.push({
          tenant,
          amount: actionableAmount > 0 ? actionableAmount : monthlyFee,
          dueDateFormatted: tenant.subscription?.expiryDate
            ? new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')
            : 'A definir',
          statusLabel: isOverdue ? `Vencido há ${Math.abs(days)}d` : days === 0 ? 'Vence hoje' : `Vence em ${days}d`,
          daysDiff: days,
          isOverdue,
        });
      }
    });

    // Add manual receivables in ledger with pending status
    effectiveLedger
      .filter(i => i.type === 'receber' && i.status === 'pending' && i.category !== 'Planos e Marketplace')
      .forEach(i => {
        receivableSum += Number(i.amount || 0);
      });

    // 2. Payables: ledger items type === 'pagar' and status === 'pending'
    const payableSum = effectiveLedger
      .filter(i => i.type === 'pagar' && i.status === 'pending')
      .reduce((acc, i) => acc + Number(i.amount || 0), 0);

    // 3. Flow in Period: items created/paid within the filtered date range
    const receivedInPeriod = effectiveLedger
      .filter(i => i.type === 'receber' && i.status === 'paid' && isDateInPeriod(i.createdAt, period, customRange))
      .reduce((acc, i) => acc + Number(i.amount || 0), 0);

    const paidInPeriod = effectiveLedger
      .filter(i => i.type === 'pagar' && i.status === 'paid' && isDateInPeriod(i.createdAt, period, customRange))
      .reduce((acc, i) => acc + Number(i.amount || 0), 0);

    const netResult = receivedInPeriod - paidInPeriod;

    // 4. Alerts calculation
    const expiredTenants = pendingTenants.filter(pt => pt.isOverdue);
    const expiredTenantsCount = expiredTenants.length;
    const expiredTenantsAmount = expiredTenants.reduce((acc, pt) => acc + pt.amount, 0);

    const dueTodayAmount = pendingTenants
      .filter(pt => pt.daysDiff === 0)
      .reduce((acc, pt) => acc + pt.amount, 0);

    const due7DaysAmount = pendingTenants
      .filter(pt => pt.daysDiff > 0 && pt.daysDiff <= 7)
      .reduce((acc, pt) => acc + pt.amount, 0);

    const overduePayablesAmount = effectiveLedger
      .filter(i => {
        if (i.type !== 'pagar' || i.status !== 'pending' || !i.dueDate) return false;
        return getDaysDiff(i.dueDate) < 0;
      })
      .reduce((acc, i) => acc + Number(i.amount || 0), 0);

    return {
      totalReceivable: receivableSum,
      totalPayable: payableSum,
      totalReceivedInPeriod: receivedInPeriod,
      totalPaidInPeriod: paidInPeriod,
      netResultInPeriod: netResult,
      pendingTenantsList: pendingTenants.sort((a, b) => a.daysDiff - b.daysDiff),
      alertsData: {
        expiredTenantsCount,
        expiredTenantsAmount,
        dueTodayAmount,
        due7DaysAmount,
        overduePayablesAmount,
      },
    };
  }, [effectiveTenants, effectivePlans, effectiveOrders, effectiveInvoices, effectiveLedger, marketplaceFixedFee, marketplaceFee, period, customRange]);

  // Handlers for modal opening
  const handleOpenCobrar = (
    tenant: Tenant, 
    amount: number, 
    options?: { monthly?: number; mkt?: number; ordersCount?: number }
  ) => {
    setBillingModalData({ tenant, amount, options });
  };

  const handleOpenAddLedger = (defaultType: 'receber' | 'pagar' = 'pagar') => {
    setAddLedgerDefaultType(defaultType);
    setIsAddLedgerOpen(true);
  };

  const handleFilterByAlert = (alertType: 'overdue_tenants' | 'due_today' | 'due_7days' | 'overdue_payables') => {
    if (alertType === 'overdue_payables') {
      setActiveTab('payables');
    } else {
      setActiveTab('receivables');
    }
  };

  return (
    <div className="space-y-6">
      {/* 5-TAB BARRA DE NAVEGAÇÃO PRINCIPAL */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* TAB BUTTONS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp size={15} />
            1. Visão Geral
          </button>

          <button
            onClick={() => setActiveTab('receivables')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'receivables'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight size={15} className="text-emerald-600" />
            2. A Receber
            {pendingTenantsList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('payables')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'payables'
                ? 'bg-white text-rose-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight size={15} className="text-rose-600" />
            3. A Pagar
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reconciliation'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 size={15} className="text-indigo-600" />
            4. Conciliação
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={15} className="text-slate-500" />
            5. Relatórios
          </button>
        </div>

        {/* BOTAO GLOBAL NOVO LANÇAMENTO */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddLedger('pagar')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={15} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO BASEADA NA ABA ATIVA */}
      {activeTab === 'overview' && (
        <OverviewTab
          totalReceivable={totalReceivable}
          totalPayable={totalPayable}
          totalReceivedInPeriod={totalReceivedInPeriod}
          netResultInPeriod={netResultInPeriod}
          totalPaidInPeriod={totalPaidInPeriod}
          period={period}
          setPeriod={setPeriod}
          customRange={customRange}
          setCustomRange={setCustomRange}
          pendingTenants={pendingTenantsList}
          alerts={alertsData}
          onOpenCobrar={(t, amt) => handleOpenCobrar(t, amt)}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenTenantProfile={(t) => setSelectedTenantForProfile(t)}
          onFilterByAlert={handleFilterByAlert}
        />
      )}

      {activeTab === 'receivables' && (
        <ReceivablesTab
          tenants={effectiveTenants}
          plans={effectivePlans}
          orders={effectiveOrders}
          marketplaceInvoices={effectiveInvoices}
          saasLedger={effectiveLedger}
          marketplaceFixedFee={marketplaceFixedFee}
          marketplaceFee={marketplaceFee}
          onOpenTenantProfile={(t) => setSelectedTenantForProfile(t)}
          onOpenCobrar={handleOpenCobrar}
          onQuickSettleSubscription={onQuickSettleSubscription}
          onSettleMarketplaceCycle={onSettleMarketplaceCycle}
          onToggleLedgerStatus={onToggleLedgerStatus}
          onOpenLedgerDetails={(item) => setSelectedLedgerForDetail(item)}
          onOpenAddLedger={handleOpenAddLedger}
        />
      )}

      {activeTab === 'payables' && (
        <PayablesTab
          saasLedger={effectiveLedger}
          onToggleStatus={onToggleLedgerStatus}
          onOpenDetails={(item) => setSelectedLedgerForDetail(item)}
          onOpenAddModal={() => handleOpenAddLedger('pagar')}
        />
      )}

      {activeTab === 'reconciliation' && (
        <ReconciliationTab
          tenants={effectiveTenants}
          orders={effectiveOrders}
          marketplaceInvoices={effectiveInvoices}
          saasLedger={effectiveLedger}
          marketplaceFixedFee={marketplaceFixedFee}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          tenants={effectiveTenants}
          plans={effectivePlans}
          orders={effectiveOrders}
          marketplaceInvoices={effectiveInvoices}
          saasLedger={effectiveLedger}
          marketplaceFixedFee={marketplaceFixedFee}
        />
      )}

      {/* MODAL: PERFIL FINANCEIRO DO LOJISTA */}
      {selectedTenantForProfile && (
        <TenantFinancialProfileModal
          tenant={selectedTenantForProfile}
          plans={effectivePlans}
          orders={effectiveOrders}
          marketplaceInvoices={effectiveInvoices}
          saasLedger={effectiveLedger}
          marketplaceFixedFee={marketplaceFixedFee}
          onClose={() => setSelectedTenantForProfile(null)}
          onQuickSettle={onQuickSettleSubscription}
        />
      )}

      {/* MODAL: COBRANÇA WHATSAPP */}
      {billingModalData && (
        <BillingCenterModal
          tenant={billingModalData.tenant}
          amount={billingModalData.amount}
          options={billingModalData.options}
          onClose={() => setBillingModalData(null)}
        />
      )}

      {/* MODAL: NOVO LANÇAMENTO */}
      {isAddLedgerOpen && (
        <AddLedgerModal
          initialType={addLedgerDefaultType}
          tenants={effectiveTenants}
          onClose={() => setIsAddLedgerOpen(false)}
          onSave={onSaveLedgerItem}
        />
      )}

      {/* MODAL: DETALHES DO LANÇAMENTO DO LIVRO RAZÃO */}
      {selectedLedgerForDetail && (
        <LedgerDetailModal
          item={selectedLedgerForDetail}
          tenants={effectiveTenants}
          onClose={() => setSelectedLedgerForDetail(null)}
          onToggleStatus={onToggleLedgerStatus}
        />
      )}
    </div>
  );
};
