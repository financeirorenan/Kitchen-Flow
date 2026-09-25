import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';

export type FinancialMainTab = 'overview' | 'receivables' | 'payables' | 'reconciliation' | 'reports';

export type ReceivablesSubTab = 'subscriptions' | 'marketplace' | 'others';

export type FinancialPeriodFilter = 'today' | '7days' | 'this_month' | 'last_month' | 'last_30days' | 'custom';

export interface SaasLedgerItem {
  id: string;
  description: string;
  type: 'receber' | 'pagar';
  amount: number;
  dueDate: any; // Date | string | null
  category: string;
  status: 'pending' | 'paid';
  tenantId?: string;
  tenantName?: string;
  supplierName?: string;
  paymentMethod?: string;
  notes?: string;
  pixCode?: string;
  orderId?: string;
  createdAt: any;
  paidAt?: any;
}

export interface TenantFinancialProfile {
  tenant: Tenant;
  planName: string;
  monthlyPrice: number;
  nextDueDate: Date | null;
  status: 'paid' | 'pending' | 'overdue';
  daysOverdue: number;
  totalReceivable: number;
  totalOverdue: number;
  paidThisMonth: number;
  marketplaceOrdersCount: number;
  marketplaceFeesAmount: number;
  history: Array<{
    id: string;
    date: Date;
    description: string;
    type: 'receita' | 'despesa';
    amount: number;
    status: 'paid' | 'pending';
    paymentMethod: string;
    rawItem?: any;
  }>;
}

export interface MonthlyClosingData {
  monthKey: string; // YYYY-MM
  monthName: string;
  subscriptionsRevenue: number;
  marketplaceRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  expenses: number;
  netResult: number;
  activeTenantsCount: number;
  defaultingTenantsCount: number;
  marketplaceOrdersCount: number;
  marketplaceFeesTotal: number;
  divergencesCount: number;
  closedAt?: Date;
  closedBy?: string;
}

export interface FinancialDivergenceItem {
  id: string;
  type: 'unbilled_order' | 'unpaid_invoice' | 'orphan_payment' | 'amount_mismatch' | 'duplicate_entry';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  amount?: number;
  tenantId?: string;
  tenantName?: string;
  orderId?: string;
  invoiceId?: string;
  ledgerId?: string;
  createdAt?: Date;
  resolved?: boolean;
}
