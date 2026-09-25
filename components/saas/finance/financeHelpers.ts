import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';
import { SaasLedgerItem, TenantFinancialProfile, FinancialPeriodFilter } from './types';

export const DEFAULT_MARKETPLACE_FIXED_FEE = 2.00; // R$ 2,00 por pedido conforme diretriz

export function getTenantPlanDetails(tenant: Tenant, plans: Plan[]) {
  const planObj = plans.find(p => p.id === tenant.planId) || plans.find(p => p.name === tenant.subscription?.plan);
  const planName = planObj?.name || tenant.subscription?.plan || 'BASIC';
  
  let price = 0;
  if (planObj?.price !== undefined) {
    price = planObj.price;
  } else {
    const fallbackPrices: Record<string, number> = {
      FREE: 0,
      BASIC: 99,
      PRO: 199,
      ENTERPRISE: 499
    };
    price = fallbackPrices[planName.toUpperCase()] ?? 99;
  }

  // Check custom price override if exists
  if ((tenant.subscription as any)?.customPrice) {
    price = Number((tenant.subscription as any).customPrice);
  }

  return { planName, price, planObj };
}

export function getDaysDiff(targetDate: any): number {
  if (!targetDate) return 0;
  let d: Date;
  if (typeof targetDate?.toDate === 'function') {
    d = targetDate.toDate();
  } else if (targetDate?.seconds) {
    d = new Date(targetDate.seconds * 1000);
  } else if (targetDate instanceof Date) {
    d = targetDate;
  } else {
    d = new Date(targetDate);
  }
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetDay = new Date(d);
  targetDay.setHours(0, 0, 0, 0);
  const diffTime = targetDay.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isDateInPeriod(dateVal: any, period: FinancialPeriodFilter, customRange?: { start?: string; end?: string }): boolean {
  if (!dateVal) return false;
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      return d >= startOfToday && d <= endOfToday;
    case '7days': {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= past7 && d <= endOfToday;
    }
    case 'last_30days': {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= past30 && d <= endOfToday;
    }
    case 'this_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return d >= firstDay && d <= lastDay;
    }
    case 'last_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return d >= firstDay && d <= lastDay;
    }
    case 'custom': {
      if (!customRange?.start) return true;
      const start = new Date(`${customRange.start}T00:00:00`);
      const end = customRange.end ? new Date(`${customRange.end}T23:59:59`) : endOfToday;
      return d >= start && d <= end;
    }
    default:
      return true;
  }
}

export function calculateMarketplaceTenantStats(
  tenantId: string,
  orders: Order[],
  marketplaceInvoices: MarketplaceInvoice[],
  fixedFeePerOrder: number = DEFAULT_MARKETPLACE_FIXED_FEE,
  percentageFee: number = 0
) {
  const targetId = String(tenantId || '').trim().toLowerCase();

  const tenantMktOrders = (orders || []).filter(o => {
    const oTid = String(o.tenantId || '').trim().toLowerCase();
    const matchesTenant = oTid === targetId || 
      (targetId.includes('hcl1177') && oTid.includes('hcl1177')) ||
      (targetId === 'lojista' && (oTid === 'lojista' || oTid.includes('matriz')));

    const src = String(o.source || (o as any).channel || (o as any).origin || '').toLowerCase();
    const isMkt = src === 'marketplace' || (o as any).isMarketplace === true;

    return matchesTenant && isMkt;
  });

  const billedInvoices = (marketplaceInvoices || []).filter(inv => {
    const invTid = String(inv.tenantId || '').trim().toLowerCase();
    return invTid === targetId || (targetId.includes('hcl1177') && invTid.includes('hcl1177'));
  });
  const billedOrderIds = new Set(billedInvoices.map(inv => inv.orderId).filter(Boolean));

  const unbilledOrders = tenantMktOrders.filter(o => !billedOrderIds.has(o.id));
  const billedOrders = tenantMktOrders.filter(o => billedOrderIds.has(o.id));

  const totalGMV = tenantMktOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const unbilledGMV = unbilledOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  // Cada pedido gera R$ 2,00 (ou taxa configurada) + porcentagem se houver
  const unbilledFees = unbilledOrders.reduce((acc, o) => {
    const commission = ((o.total || 0) * percentageFee) / 100;
    return acc + fixedFeePerOrder + commission;
  }, 0);

  const totalFeesGenerated = tenantMktOrders.reduce((acc, o) => {
    const commission = ((o.total || 0) * percentageFee) / 100;
    return acc + fixedFeePerOrder + commission;
  }, 0);

  const billedFeesPaid = billedInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((acc, inv) => acc + (inv.amount || 0), 0);

  const billedFeesPending = billedInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((acc, inv) => acc + (inv.amount || 0), 0);

  return {
    totalOrdersCount: tenantMktOrders.length,
    unbilledOrdersCount: unbilledOrders.length,
    billedOrdersCount: billedOrders.length,
    totalGMV,
    unbilledGMV,
    fixedFeePerOrder,
    unbilledFees,
    totalFeesGenerated,
    billedFeesPaid,
    billedFeesPending,
    totalPendingFees: unbilledFees + billedFeesPending,
    unbilledOrdersList: unbilledOrders,
  };
}

export function generateWhatsAppBillingMessage(params: {
  tenantName: string;
  planName?: string;
  monthlyAmount?: number;
  marketplaceOrdersCount?: number;
  marketplaceAmount?: number;
  totalAmount: number;
  dueDateStr: string;
  pixKey?: string;
}): string {
  const parts: string[] = [
    `Olá! Tudo bem?`,
    `Identificamos um valor pendente referente ao KitchenFlow AI para ${params.tenantName}.`,
    ``
  ];

  if (params.monthlyAmount && params.monthlyAmount > 0) {
    parts.push(`• Mensalidade (${params.planName || 'Plano Ativo'}): R$ ${params.monthlyAmount.toFixed(2).replace('.', ',')}`);
  }

  if (params.marketplaceAmount && params.marketplaceAmount > 0) {
    const ordersDesc = params.marketplaceOrdersCount ? ` (${params.marketplaceOrdersCount} pedidos × R$ 2,00)` : '';
    parts.push(`• Marketplace${ordersDesc}: R$ ${params.marketplaceAmount.toFixed(2).replace('.', ',')}`);
  }

  parts.push(`• Total a Pagar: R$ ${params.totalAmount.toFixed(2).replace('.', ',')}`);
  parts.push(`• Vencimento: ${params.dueDateStr}`);

  if (params.pixKey) {
    parts.push(``);
    parts.push(`Chave Pix: ${params.pixKey}`);
  }

  parts.push(``);
  parts.push(`Caso já tenha realizado o pagamento, desconsidere esta mensagem. Muito obrigado!`);

  return parts.join('\n');
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
