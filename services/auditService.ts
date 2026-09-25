import { 
  Order, 
  FinancialRecord, 
  Customer, 
  CashClosingReport, 
  CashSession, 
  AuditLog, 
  Product, 
  User, 
  AuditInconsistency 
} from '../types';
import { db as localDb } from './db';

export interface AuditPeriodRange {
  start: Date;
  end: Date;
  label: string;
}

export type AuditPeriodPreset = 
  | 'today' 
  | 'yesterday' 
  | '7days' 
  | '30days' 
  | 'current_month' 
  | 'previous_month' 
  | 'custom';

export function getAuditPeriodRange(
  preset: AuditPeriodPreset, 
  customStart?: string, 
  customEnd?: string
): AuditPeriodRange {
  const now = new Date();
  
  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: 'Hoje' };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { start, end, label: 'Ontem' };
  }

  if (preset === '7days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: 'Últimos 7 dias' };
  }

  if (preset === '30days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end, label: 'Últimos 30 dias' };
  }

  if (preset === 'current_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: 'Mês Atual' };
  }

  if (preset === 'previous_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'Mês Anterior' };
  }

  // Custom
  const start = customStart 
    ? new Date(customStart + 'T00:00:00') 
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
  const end = customEnd 
    ? new Date(customEnd + 'T23:59:59.999') 
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end, label: 'Período Personalizado' };
}

export function isDateInRange(dateValue: Date | string | undefined | null, range: AuditPeriodRange): boolean {
  if (!dateValue) return false;
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

export interface AuditMetricsSummary {
  totalOrdersCount: number;
  canceledOrdersCount: number;
  alteredOrdersCount: number;
  totalSold: number;
  totalReceived: number;
  totalOpenPending: number;
  totalSettled: number;
  totalDiscounts: number;
  totalReversals: number;
  totalBleeds: number;
  totalSupplies: number;
  totalFinancialAdjustments: number;
  totalDiscrepancies: number;
  totalSuspiciousOperations: number;
  userChangesCount: number;
}

export function calculateAuditMetrics(params: {
  orders: Order[];
  financialRecords: FinancialRecord[];
  customers: Customer[];
  cashClosings: CashClosingReport[];
  cashSession: CashSession;
  auditLogs: AuditLog[];
  range: AuditPeriodRange;
  inconsistenciesCount: number;
}): AuditMetricsSummary {
  const { orders, financialRecords, customers, cashClosings, auditLogs, range, inconsistenciesCount } = params;

  // Filtrar pedidos no período
  const periodOrders = orders.filter(o => isDateInRange(o.createdAt, range));
  const totalOrdersCount = periodOrders.length;
  const canceledOrdersCount = periodOrders.filter(o => o.status === 'canceled').length;

  // Pedidos com histórico de alteração nos logs
  const alteredOrderIds = new Set<string>();
  auditLogs.forEach(l => {
    if (l.orderId && isDateInRange(l.timestamp, range)) {
      alteredOrderIds.add(l.orderId);
    }
  });
  const alteredOrdersCount = alteredOrderIds.size;

  // Valores de pedidos
  let totalSold = 0;
  let totalReceived = 0;
  let totalOpenPending = 0;
  let totalDiscounts = 0;

  periodOrders.forEach(o => {
    if (o.status !== 'canceled') {
      totalSold += Number(o.total || 0);
      totalDiscounts += Number(o.discount || 0);

      if (o.paymentStatus === 'paid' || o.status === 'delivered') {
        totalReceived += Number(o.total || 0);
      } else {
        totalOpenPending += Number(o.total || 0);
      }
    }
  });

  // Baixas de fiado (settlements)
  let totalSettled = 0;
  let totalCustomerReversals = 0;

  customers.forEach(c => {
    if (c.history && Array.isArray(c.history)) {
      c.history.forEach(tx => {
        if (isDateInRange(tx.date, range)) {
          if (tx.type === 'credit') {
            totalSettled += Number(tx.amount || 0);
          } else if (tx.description?.toLowerCase().includes('estorno') || tx.description?.toLowerCase().includes('reversão')) {
            totalCustomerReversals += Number(tx.amount || 0);
          }
        }
      });
    }
  });

  // Registros financeiros
  const periodRecords = financialRecords.filter(r => isDateInRange(r.date, range));
  let totalBleeds = 0;
  let totalSupplies = 0;
  let totalFinancialAdjustments = 0;
  let totalReversals = totalCustomerReversals;

  periodRecords.forEach(r => {
    const cat = (r.category || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const amt = Math.abs(Number(r.amount || 0));

    if (cat.includes('sangria') || desc.includes('sangria')) {
      totalBleeds += amt;
    } else if (cat.includes('suprimento') || desc.includes('suprimento')) {
      totalSupplies += amt;
    } else if (cat.includes('ajuste') || desc.includes('ajuste')) {
      totalFinancialAdjustments += amt;
    } else if (cat.includes('estorno') || desc.includes('estorno') || desc.includes('cancelamento')) {
      totalReversals += amt;
    }
  });

  // Diferenças em fechamentos de caixa
  let cashDifferences = 0;
  cashClosings.forEach(cc => {
    if (isDateInRange(cc.closedAt, range)) {
      if (Math.abs(cc.difference || 0) > 0.05) {
        cashDifferences++;
      }
    }
  });

  const totalDiscrepancies = inconsistenciesCount + cashDifferences;

  // Operações suspeitas (logs com severity warning ou critical)
  const suspiciousLogs = auditLogs.filter(l => 
    isDateInRange(l.timestamp, range) && 
    (l.severity === 'suspicious' || l.severity === 'warning' || l.severity === 'critical')
  );
  const totalSuspiciousOperations = suspiciousLogs.length;

  // Alterações de usuários
  const userLogs = auditLogs.filter(l => 
    isDateInRange(l.timestamp, range) && 
    l.userId && l.userId !== 'system'
  );
  const userChangesCount = userLogs.length;

  return {
    totalOrdersCount,
    canceledOrdersCount,
    alteredOrdersCount,
    totalSold,
    totalReceived,
    totalOpenPending,
    totalSettled,
    totalDiscounts,
    totalReversals,
    totalBleeds,
    totalSupplies,
    totalFinancialAdjustments,
    totalDiscrepancies,
    totalSuspiciousOperations,
    userChangesCount
  };
}

export function detectInconsistencies(params: {
  orders: Order[];
  financialRecords: FinancialRecord[];
  customers: Customer[];
  products: Product[];
  cashClosings: CashClosingReport[];
  cashSession: CashSession;
  auditLogs: AuditLog[];
  discountThresholdPercent?: number;
}): AuditInconsistency[] {
  const { 
    orders, 
    customers, 
    products, 
    cashClosings, 
    auditLogs,
    discountThresholdPercent = 20 
  } = params;

  const inconsistencies: AuditInconsistency[] = [];

  // 1. Pedidos finalizados sem pagamento
  orders.forEach(order => {
    const isFinished = order.status === 'delivered';
    const isPaid = order.paymentStatus === 'paid' || (order.payments && order.payments.length > 0);
    const hasFiado = !!order.customerId;

    if (isFinished && !isPaid && !hasFiado && order.total > 0) {
      inconsistencies.push({
        id: `inc-no-pay-${order.id}`,
        code: 'INC_01_PEDIDO_SEM_PAGAMENTO',
        title: 'Pedido finalizado sem registro de pagamento',
        description: `O pedido #${order.id.slice(0, 8)} de R$ ${order.total.toFixed(2)} está marcado como entregue/finalizado, mas não consta pagamento ou fiado vinculado.`,
        severity: 'critical',
        entityType: 'order',
        entityId: order.id,
        detectedAt: new Date(),
        amount: order.total,
        recommendedAction: 'Verificar com o operador do caixa e registrar a forma de quitação ou vincular à conta fiado.'
      });
    }

    // 2. Pedido pago duas vezes ou valor de pagamentos superior ao total
    if (order.payments && order.payments.length > 1) {
      const sumPayments = order.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      if (sumPayments > order.total + 0.05 && order.total > 0) {
        inconsistencies.push({
          id: `inc-over-pay-${order.id}`,
          code: 'INC_02_PAGAMENTO_DUPLICADO',
          title: 'Pagamentos somados excedem o valor do pedido',
          description: `O pedido #${order.id.slice(0, 8)} de R$ ${order.total.toFixed(2)} possui pagamentos registrados somando R$ ${sumPayments.toFixed(2)}.`,
          severity: 'critical',
          entityType: 'order',
          entityId: order.id,
          detectedAt: new Date(),
          amount: sumPayments - order.total,
          recommendedAction: 'Estornar o lançamento excedente para evitar distorção no fechamento contábil.'
        });
      }
    }

    // 3. Desconto acima do limite permitido
    if (order.discount && order.discount > 0 && order.total > 0) {
      const baseTotal = order.total + order.discount;
      const discountPercent = (order.discount / baseTotal) * 100;
      if (discountPercent > discountThresholdPercent) {
        inconsistencies.push({
          id: `inc-discount-${order.id}`,
          code: 'INC_03_DESCONTO_EXCESSIVO',
          title: 'Desconto concedido acima do teto de tolerância',
          description: `Desconto de R$ ${order.discount.toFixed(2)} (${discountPercent.toFixed(1)}%) aplicado no pedido #${order.id.slice(0, 8)}. Limite padrão: ${discountThresholdPercent}%.`,
          severity: discountPercent > 40 ? 'critical' : 'warning',
          entityType: 'order',
          entityId: order.id,
          detectedAt: new Date(),
          amount: order.discount,
          recommendedAction: 'Confirmar a autorização do gerente ou administrador para o desconto concedido.'
        });
      }
    }

    // 4. Pedido cancelado após recebimento
    if (order.status === 'canceled' && (order.paymentStatus === 'paid' || (order.payments && order.payments.length > 0))) {
      // Verificar se houve registro de estorno correspondente
      const hasRefundLog = auditLogs.some(l => l.orderId === order.id && (l.action.includes('ESTORNO') || l.description.toLowerCase().includes('estorno')));
      if (!hasRefundLog) {
        inconsistencies.push({
          id: `inc-cancel-paid-${order.id}`,
          code: 'INC_04_CANCELAMENTO_POS_PAGAMENTO',
          title: 'Pedido pago foi cancelado sem estorno formal registrado',
          description: `O pedido #${order.id.slice(0, 8)} de R$ ${order.total.toFixed(2)} constava como pago e foi cancelado sem que um estorno formal fosse conciliado.`,
          severity: 'critical',
          entityType: 'order',
          entityId: order.id,
          detectedAt: new Date(),
          amount: order.total,
          recommendedAction: 'Registrar o comprovante de devolução do valor ao cliente ou reabrir o pedido.'
        });
      }
    }

    // 5. Preço de produto divergente do cadastro
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && Math.abs(item.price - product.price) > 0.05 && item.price > 0 && !item.selectedOptions?.length) {
          inconsistencies.push({
            id: `inc-price-diff-${order.id}-${item.productId}`,
            code: 'INC_05_PRECO_DIVERGENTE',
            title: 'Preço cobrado diverge do cadastro do produto',
            description: `Item "${item.name}" cobrado a R$ ${item.price.toFixed(2)} no pedido #${order.id.slice(0, 8)}, enquanto o cadastro oficial está a R$ ${product.price.toFixed(2)}.`,
            severity: 'suspicious',
            entityType: 'product',
            entityId: item.productId,
            detectedAt: new Date(),
            amount: Math.abs(item.price - product.price) * item.quantity,
            recommendedAction: 'Verificar se houve alteração manual de preço sem motivo registrado ou tabela de preço específica.'
          });
        }
      });
    }
  });

  // 6. Contas fiado: Saldo anômalo ou baixas inconsistentes
  customers.forEach(customer => {
    if (customer.balance < -0.05) {
      inconsistencies.push({
        id: `inc-negative-balance-${customer.id}`,
        code: 'INC_06_SALDO_CLIENTE_NEGATIVO',
        title: 'Conta fiado de cliente com saldo negativo (crédito não conciliado)',
        description: `Cliente "${customer.name}" possui saldo devedor negativo de R$ ${customer.balance.toFixed(2)}, indicando baixa superior ao débito ou estorno desregulado.`,
        severity: 'warning',
        entityType: 'customer',
        entityId: customer.id,
        detectedAt: new Date(),
        amount: Math.abs(customer.balance),
        recommendedAction: 'Auditar o extrato do cliente para verificar pagamentos duplicados ou créditos a favor.'
      });
    }
  });

  // 7. Divergências de Fechamento de Caixa
  cashClosings.forEach(closing => {
    if (Math.abs(closing.difference || 0) > 5.00) {
      const isShortage = closing.difference < 0;
      inconsistencies.push({
        id: `inc-cash-diff-${closing.id}`,
        code: 'INC_07_DIVERGENCIA_CAIXA',
        title: `Fechamento de caixa com ${isShortage ? 'quebra de caixa (falta)' : 'sobra de caixa'}`,
        description: `Caixa fechado por "${closing.closedBy || 'Operador'}" em ${new Date(closing.closedAt).toLocaleDateString()} com diferença de R$ ${Math.abs(closing.difference).toFixed(2)} (Esperado: R$ ${closing.expectedValue.toFixed(2)}, Informado: R$ ${closing.actualValue.toFixed(2)}).`,
        severity: Math.abs(closing.difference) > 50 ? 'critical' : 'warning',
        entityType: 'cash_session',
        entityId: closing.id,
        detectedAt: new Date(closing.closedAt),
        amount: Math.abs(closing.difference),
        userResponsible: closing.closedBy,
        recommendedAction: 'Conferir os comprovantes físicos de sangrias, despesas pagas em dinheiro e fita de cartão.'
      });
    }
  });

  // 8. Usuário com excesso de cancelamentos nos logs
  const cancellationsByUser: Record<string, { count: number; name: string }> = {};
  auditLogs.forEach(l => {
    if (l.action.includes('CANCEL') || l.description.toLowerCase().includes('cancelou')) {
      const uId = l.userId || 'unknown';
      if (!cancellationsByUser[uId]) {
        cancellationsByUser[uId] = { count: 0, name: l.userName || 'Usuário' };
      }
      cancellationsByUser[uId].count++;
    }
  });

  Object.entries(cancellationsByUser).forEach(([uId, data]) => {
    if (data.count >= 5 && uId !== 'system') {
      inconsistencies.push({
        id: `inc-user-cancels-${uId}`,
        code: 'INC_08_EXCESSO_CANCELAMENTOS_USUARIO',
        title: 'Usuário com volume elevado de cancelamentos',
        description: `O colaborador "${data.name}" realizou ${data.count} cancelamentos registrados no período recente.`,
        severity: 'suspicious',
        entityType: 'user',
        entityId: uId,
        detectedAt: new Date(),
        userResponsible: data.name,
        recommendedAction: 'Analisar os motivos relatados nos pedidos cancelados por este operador.'
      });
    }
  });

  return inconsistencies;
}

export interface ProductsSoldAuditItem {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  quantityCanceled: number;
  netQuantity: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  averageTicket: number;
  unitCost?: number;
  cmvTotal?: number;
  profitMargin?: number;
  orderIds: string[];
}

export function buildProductsSoldAudit(
  orders: Order[],
  products: Product[],
  range: AuditPeriodRange
): ProductsSoldAuditItem[] {
  const map: Record<string, ProductsSoldAuditItem> = {};

  orders.forEach(order => {
    if (!isDateInRange(order.createdAt, range)) return;
    const isCanceled = order.status === 'canceled';

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const pId = item.productId || item.name;
        if (!map[pId]) {
          const prod = products.find(p => p.id === pId);
          map[pId] = {
            productId: pId,
            name: item.name,
            category: item.category || prod?.category || 'Geral',
            quantitySold: 0,
            quantityCanceled: 0,
            netQuantity: 0,
            grossRevenue: 0,
            totalDiscount: 0,
            netRevenue: 0,
            averageTicket: 0,
            unitCost: prod?.costPrice || (prod?.price ? prod.price * 0.35 : 0),
            orderIds: []
          };
        }

        const target = map[pId];
        const q = Number(item.quantity || 1);
        const itemTotal = Number(item.price || 0) * q;

        if (isCanceled) {
          target.quantityCanceled += q;
        } else {
          target.quantitySold += q;
          target.grossRevenue += itemTotal;
          target.netQuantity += q;
          if (!target.orderIds.includes(order.id)) {
            target.orderIds.push(order.id);
          }
        }
      });
    }
  });

  return Object.values(map).map(p => {
    p.netRevenue = p.grossRevenue - p.totalDiscount;
    p.averageTicket = p.netQuantity > 0 ? p.netRevenue / p.netQuantity : 0;
    if (p.unitCost) {
      p.cmvTotal = p.unitCost * p.netQuantity;
      p.profitMargin = p.netRevenue > 0 ? ((p.netRevenue - p.cmvTotal) / p.netRevenue) * 100 : 0;
    }
    return p;
  }).sort((a, b) => b.netRevenue - a.netRevenue);
}

export interface UserDiscountRanking {
  userId: string;
  userName: string;
  totalDiscountAmount: number;
  discountsCount: number;
  maxDiscount: number;
  averageDiscount: number;
}

export function buildDiscountsRanking(
  orders: Order[],
  auditLogs: AuditLog[],
  range: AuditPeriodRange
): {
  ranking: UserDiscountRanking[];
  highestDiscount: number;
  averageDiscount: number;
  totalDiscountSum: number;
} {
  const map: Record<string, UserDiscountRanking> = {};
  let highestDiscount = 0;
  let totalDiscountSum = 0;
  let totalDiscountCount = 0;

  orders.forEach(order => {
    if (!isDateInRange(order.createdAt, range)) return;
    const discount = Number(order.discount || 0);
    if (discount > 0 && order.status !== 'canceled') {
      totalDiscountSum += discount;
      totalDiscountCount++;
      if (discount > highestDiscount) highestDiscount = discount;

      // Buscar nos logs quem aplicou
      const log = auditLogs.find(l => l.orderId === order.id && (l.action.includes('DISCOUNT') || l.description.toLowerCase().includes('desconto')));
      const uId = log?.userId || 'u-atendente';
      const uName = log?.userName || 'Atendente Balcão / Garçom';

      if (!map[uId]) {
        map[uId] = {
          userId: uId,
          userName: uName,
          totalDiscountAmount: 0,
          discountsCount: 0,
          maxDiscount: 0,
          averageDiscount: 0
        };
      }

      map[uId].totalDiscountAmount += discount;
      map[uId].discountsCount++;
      if (discount > map[uId].maxDiscount) {
        map[uId].maxDiscount = discount;
      }
    }
  });

  const ranking = Object.values(map).map(item => ({
    ...item,
    averageDiscount: item.discountsCount > 0 ? item.totalDiscountAmount / item.discountsCount : 0
  })).sort((a, b) => b.totalDiscountAmount - a.totalDiscountAmount);

  return {
    ranking,
    highestDiscount,
    averageDiscount: totalDiscountCount > 0 ? totalDiscountSum / totalDiscountCount : 0,
    totalDiscountSum
  };
}

export interface GlobalSearchChainResult {
  customer?: Customer;
  order?: Order;
  payments?: { method?: string; amount?: number }[];
  financialRecords?: FinancialRecord[];
  auditLogs?: AuditLog[];
  relatedProducts?: Product[];
  settlements?: unknown[];
}

export function searchAuditChain(
  query: string,
  data: {
    customers: Customer[];
    orders: Order[];
    financialRecords: FinancialRecord[];
    products: Product[];
    auditLogs: AuditLog[];
    users: User[];
  }
): GlobalSearchChainResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { customers, orders, financialRecords, products, auditLogs } = data;
  const results: GlobalSearchChainResult[] = [];

  // Busca por pedido
  const matchedOrders = orders.filter(o => 
    o.id.toLowerCase().includes(q) || 
    (o.externalId && o.externalId.toLowerCase().includes(q)) ||
    (o.customerName && o.customerName.toLowerCase().includes(q)) ||
    (o.customerPhone && o.customerPhone.includes(q)) ||
    (o.tableNumber && String(o.tableNumber).includes(q))
  );

  matchedOrders.slice(0, 10).forEach(order => {
    const cust = customers.find(c => c.id === order.customerId || (order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase()));
    const relLogs = auditLogs.filter(l => l.orderId === order.id || (l.details && l.details.includes(order.id)));
    const relFin = financialRecords.filter(f => f.orderId === order.id || (f.description && f.description.includes(order.id)));

    results.push({
      order,
      customer: cust,
      payments: order.payments || [],
      financialRecords: relFin,
      auditLogs: relLogs
    });
  });

  // Busca por cliente
  const matchedCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.document.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    c.id.toLowerCase().includes(q)
  );

  matchedCustomers.slice(0, 10).forEach(customer => {
    // Evitar duplicatas se já adicionado por pedido
    if (results.some(r => r.customer?.id === customer.id)) return;

    const custOrders = orders.filter(o => o.customerId === customer.id || (o.customerName && o.customerName.toLowerCase() === customer.name.toLowerCase()));
    const custLogs = auditLogs.filter(l => l.customerId === customer.id || (l.details && l.details.includes(customer.id)));
    const custFin = financialRecords.filter(f => customer.history?.some(h => f.description?.includes(h.id)));

    results.push({
      customer,
      order: custOrders[0],
      payments: custOrders.flatMap(o => o.payments || []),
      financialRecords: custFin,
      auditLogs: custLogs,
      settlements: customer.history?.filter(h => h.type === 'credit')
    });
  });

  // Busca por produto
  const matchedProducts = products.filter(p => 
    p.name.toLowerCase().includes(q) || 
    (p.barcode && p.barcode.includes(q)) ||
    p.category.toLowerCase().includes(q)
  );

  if (matchedProducts.length > 0 && results.length < 5) {
    matchedProducts.slice(0, 5).forEach(product => {
      const prodOrders = orders.filter(o => o.items?.some(i => i.productId === product.id));
      results.push({
        relatedProducts: [product],
        order: prodOrders[0],
        auditLogs: auditLogs.filter(l => l.entityId === product.id || l.details?.includes(product.name))
      });
    });
  }

  return results;
}

export async function logAuditEvent(
  event: Partial<AuditLog> & { 
    action: string; 
    description: string; 
    userId?: string; 
    userName?: string; 
    tenantId?: string;
  }
): Promise<AuditLog> {
  const newLog: AuditLog = {
    id: 'aud_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
    tenantId: event.tenantId || 't1',
    userId: event.userId || 'system',
    userName: event.userName || 'Sistema / Auditoria',
    userRole: event.userRole || 'SAAS_ADMIN',
    action: event.action,
    description: event.description,
    timestamp: new Date(),
    level: event.level || 'INFO',
    severity: event.severity || 'normal',
    details: event.details,
    entityType: event.entityType,
    entityId: event.entityId,
    orderId: event.orderId,
    customerId: event.customerId,
    previousValue: event.previousValue,
    newValue: event.newValue,
    financialImpact: event.financialImpact,
    reason: event.reason,
    operationType: event.operationType,
    diff: event.diff,
    metadata: event.metadata
  };

  try {
    await localDb.auditLogs.add(newLog);
  } catch (err) {
    console.warn('[AuditService] Não foi possível salvar no Dexie:', err);
  }

  return newLog;
}

export function exportToCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || !rows.length) return;
  const separator = ';';
  const keys = Object.keys(rows[0]);
  const csvContent =
    '\uFEFF' + // BOM para UTF-8 no Excel
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            if (cell instanceof Date) {
              cell = cell.toLocaleString('pt-BR');
            }
            cell = String(cell).replace(/"/g, '""');
            if (cell.search(/("|,|;|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// MÓDULO DE AUDITORIA ISOLADA POR LOJISTA
// ==========================================

export interface MerchantAuditSummary {
  // 1. Operação
  totalOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  inProgressOrders: number;
  averageTicket: number;

  // 2. Financeiro
  grossRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  totalReceived: number;
  totalOpenPending: number;
  totalReversals: number;
  platformFees: number;
  netMerchantAmount: number;

  // 3. Auditoria
  alteredOrdersCount: number;
  cancellationsCount: number;
  reversalsCount: number;
  settledCount: number;
  financialAdjustmentsCount: number;
  manualOperationsCount: number;
  alertsCount: number;
  inconsistenciesCount: number;
}

export function calculateMerchantAuditSummary(params: {
  orders: Order[];
  financialRecords: FinancialRecord[];
  customers: Customer[];
  auditLogs: AuditLog[];
  range: AuditPeriodRange;
  platformCommissionPercent?: number;
  inconsistenciesCount?: number;
}): MerchantAuditSummary {
  const {
    orders,
    financialRecords,
    customers,
    auditLogs,
    range,
    platformCommissionPercent = 2.5,
    inconsistenciesCount = 0
  } = params;

  const periodOrders = orders.filter(o => isDateInRange(o.createdAt, range));

  // 1. Operação
  const totalOrders = periodOrders.length;
  const deliveredOrders = periodOrders.filter(o => o.status === 'delivered' || o.status === 'finished').length;
  const canceledOrders = periodOrders.filter(o => o.status === 'canceled' || o.status === 'cancelled').length;
  const inProgressOrders = periodOrders.filter(o => 
    o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivering'
  ).length;

  let grossRevenue = 0;
  let totalDiscounts = 0;
  let totalReceived = 0;
  let totalOpenPending = 0;

  periodOrders.forEach(o => {
    if (o.status !== 'canceled' && o.status !== 'cancelled') {
      const orderTotal = Number(o.total || 0);
      grossRevenue += orderTotal;
      totalDiscounts += Number(o.discount || 0);

      if (o.paymentStatus === 'paid' || o.status === 'delivered' || o.status === 'finished') {
        totalReceived += orderTotal;
      } else {
        totalOpenPending += orderTotal;
      }
    }
  });

  const netRevenue = Math.max(0, grossRevenue - totalDiscounts);
  const averageTicket = (totalOrders - canceledOrders) > 0 ? grossRevenue / (totalOrders - canceledOrders) : 0;

  // 2. Financeiro & Estornos
  let totalReversals = 0;
  let settledCount = 0;
  let financialAdjustmentsCount = 0;

  // Estornos em clientes
  customers.forEach(c => {
    if (c.history && Array.isArray(c.history)) {
      c.history.forEach(tx => {
        if (isDateInRange(tx.date, range)) {
          if (tx.type === 'credit') {
            settledCount++;
          } else if (tx.description?.toLowerCase().includes('estorno') || tx.description?.toLowerCase().includes('reversão')) {
            totalReversals += Number(tx.amount || 0);
          }
        }
      });
    }
  });

  // Estornos em registros financeiros
  const periodRecords = financialRecords.filter(r => isDateInRange(r.date, range));
  periodRecords.forEach(r => {
    const desc = (r.description || '').toLowerCase();
    const cat = (r.category || '').toLowerCase();
    const amt = Math.abs(Number(r.amount || 0));

    if (desc.includes('estorno') || cat.includes('estorno') || desc.includes('cancelamento')) {
      totalReversals += amt;
    }
    if (desc.includes('ajuste') || cat.includes('ajuste')) {
      financialAdjustmentsCount++;
    }
  });

  // Taxas e Comissões retidas pela plataforma
  const platformFees = (grossRevenue * (platformCommissionPercent / 100));
  const netMerchantAmount = Math.max(0, grossRevenue - totalDiscounts - totalReversals - platformFees);

  // 3. Auditoria
  const alteredOrderIds = new Set<string>();
  auditLogs.forEach(l => {
    if (l.orderId && isDateInRange(l.timestamp, range)) {
      alteredOrderIds.add(l.orderId);
    }
  });

  const manualOperationsLogs = auditLogs.filter(l => 
    isDateInRange(l.timestamp, range) && 
    (l.action?.includes('UPDATE') || l.action?.includes('EDIT') || l.action?.includes('MANUAL') || l.operationType === 'manual')
  );

  const alertsCount = auditLogs.filter(l => 
    isDateInRange(l.timestamp, range) && 
    (l.severity === 'warning' || l.severity === 'critical' || l.severity === 'suspicious')
  ).length;

  return {
    totalOrders,
    deliveredOrders,
    canceledOrders,
    inProgressOrders,
    averageTicket,
    grossRevenue,
    totalDiscounts,
    netRevenue,
    totalReceived,
    totalOpenPending,
    totalReversals,
    platformFees,
    netMerchantAmount,
    alteredOrdersCount: alteredOrderIds.size,
    cancellationsCount: canceledOrders,
    reversalsCount: periodOrders.filter(o => o.status === 'canceled' && o.paymentStatus === 'paid').length + (totalReversals > 0 ? 1 : 0),
    settledCount,
    financialAdjustmentsCount,
    manualOperationsCount: manualOperationsLogs.length,
    alertsCount,
    inconsistenciesCount
  };
}

// -------------------------------------------------------------
// COMPARAÇÃO DE DESEMPENHO COM A PLATAFORMA (BENCHMARKING)
// -------------------------------------------------------------

export interface PlatformComparisonMetrics {
  merchantRevenue: number;
  platformAvgRevenue: number;
  revenueDiffPercent: number;

  merchantOrders: number;
  platformAvgOrders: number;
  ordersDiffPercent: number;

  merchantTicket: number;
  platformAvgTicket: number;
  ticketDiffPercent: number;

  merchantCancelRate: number;
  platformAvgCancelRate: number;
  isCancelRateAbove: boolean;

  merchantDiscountRate: number;
  platformAvgDiscountRate: number;
  isDiscountRateAbove: boolean;

  merchantReversalRate: number;
  platformAvgReversalRate: number;
  isReversalRateAbove: boolean;
}

export function calculatePlatformComparison(
  merchantOrders: Order[],
  allPlatformOrders: Order[],
  range: AuditPeriodRange
): PlatformComparisonMetrics {
  const mOrders = merchantOrders.filter(o => isDateInRange(o.createdAt, range));
  const allOrders = allPlatformOrders.filter(o => isDateInRange(o.createdAt, range));

  // Agrupar pedidos da plataforma por tenant para achar médias
  const tenantsMap: Record<string, { revenue: number; count: number; cancel: number; discount: number }> = {};
  allOrders.forEach(o => {
    const tId = o.tenantId || 'default';
    if (!tenantsMap[tId]) {
      tenantsMap[tId] = { revenue: 0, count: 0, cancel: 0, discount: 0 };
    }
    tenantsMap[tId].count++;
    if (o.status === 'canceled' || o.status === 'cancelled') {
      tenantsMap[tId].cancel++;
    } else {
      tenantsMap[tId].revenue += Number(o.total || 0);
      tenantsMap[tId].discount += Number(o.discount || 0);
    }
  });

  const tenantKeys = Object.keys(tenantsMap);
  const totalTenants = Math.max(1, tenantKeys.length);

  let totalPlatformRevenue = 0;
  let totalPlatformOrders = 0;
  let totalPlatformCancels = 0;
  let totalPlatformDiscounts = 0;

  tenantKeys.forEach(tId => {
    totalPlatformRevenue += tenantsMap[tId].revenue;
    totalPlatformOrders += tenantsMap[tId].count;
    totalPlatformCancels += tenantsMap[tId].cancel;
    totalPlatformDiscounts += tenantsMap[tId].discount;
  });

  const platformAvgRevenue = totalPlatformRevenue / totalTenants;
  const platformAvgOrders = totalPlatformOrders / totalTenants;
  const platformAvgTicket = (totalPlatformOrders - totalPlatformCancels) > 0 
    ? totalPlatformRevenue / (totalPlatformOrders - totalPlatformCancels) 
    : 0;
  const platformAvgCancelRate = totalPlatformOrders > 0 
    ? (totalPlatformCancels / totalPlatformOrders) * 100 
    : 0;
  const platformAvgDiscountRate = totalPlatformRevenue > 0 
    ? (totalPlatformDiscounts / totalPlatformRevenue) * 100 
    : 0;
  const platformAvgReversalRate = 0.8; // Baseline saudável de mercado

  // Métricas do Lojista
  let merchantRevenue = 0;
  let merchantCancels = 0;
  let merchantDiscounts = 0;
  mOrders.forEach(o => {
    if (o.status === 'canceled' || o.status === 'cancelled') {
      merchantCancels++;
    } else {
      merchantRevenue += Number(o.total || 0);
      merchantDiscounts += Number(o.discount || 0);
    }
  });

  const merchantOrdersCount = mOrders.length;
  const merchantTicket = (merchantOrdersCount - merchantCancels) > 0 
    ? merchantRevenue / (merchantOrdersCount - merchantCancels) 
    : 0;
  const merchantCancelRate = merchantOrdersCount > 0 
    ? (merchantCancels / merchantOrdersCount) * 100 
    : 0;
  const merchantDiscountRate = merchantRevenue > 0 
    ? (merchantDiscounts / merchantRevenue) * 100 
    : 0;
  const merchantReversalRate = (merchantCancels > 0 && merchantOrdersCount > 0)
    ? (merchantCancels / merchantOrdersCount) * 0.7
    : 0;

  const revenueDiffPercent = platformAvgRevenue > 0 
    ? ((merchantRevenue - platformAvgRevenue) / platformAvgRevenue) * 100 
    : 0;
  const ordersDiffPercent = platformAvgOrders > 0 
    ? ((merchantOrdersCount - platformAvgOrders) / platformAvgOrders) * 100 
    : 0;
  const ticketDiffPercent = platformAvgTicket > 0 
    ? ((merchantTicket - platformAvgTicket) / platformAvgTicket) * 100 
    : 0;

  return {
    merchantRevenue,
    platformAvgRevenue,
    revenueDiffPercent,
    merchantOrders: merchantOrdersCount,
    platformAvgOrders,
    ordersDiffPercent,
    merchantTicket,
    platformAvgTicket,
    ticketDiffPercent,
    merchantCancelRate,
    platformAvgCancelRate,
    isCancelRateAbove: merchantCancelRate > (platformAvgCancelRate + 1.5),
    merchantDiscountRate,
    platformAvgDiscountRate,
    isDiscountRateAbove: merchantDiscountRate > (platformAvgDiscountRate + 2.0),
    merchantReversalRate,
    platformAvgReversalRate,
    isReversalRateAbove: merchantReversalRate > 2.0
  };
}

// -------------------------------------------------------------
// AUDITORIA DE REPASSES AO LOJISTA (MARKETPLACE PAYOUTS)
// -------------------------------------------------------------

export interface MerchantPayoutAuditItem {
  id: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  totalGrossSold: number;
  totalCanceled: number;
  totalReversals: number;
  totalDiscounts: number;
  platformCommission: number;
  paymentGatewayFees: number;
  manualAdjustments: number;
  netPayoutDue: number;
  amountSettled: number;
  amountPending: number;
  status: 'liquidated' | 'processing' | 'pending';
  payoutDate?: Date | string;
  responsibleUser?: string;
  ordersCount: number;
  orderIds: string[];
}

export function buildMerchantPayoutsAudit(
  orders: Order[],
  range: AuditPeriodRange,
  commissionPercent: number = 2.5,
  gatewayFeePercent: number = 1.2
): MerchantPayoutAuditItem[] {
  // Dividir pedidos do período em ciclos de apuração (semanal / quinzenal)
  const validOrders = orders.filter(o => isDateInRange(o.createdAt, range));

  // Agrupar por semana ou lote
  const batches: Record<string, Order[]> = {};
  validOrders.forEach(o => {
    const d = new Date(o.createdAt);
    // Chave no formato YYYY-WW (Semana do ano)
    const weekNumber = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
    const key = `Ciclo Semanal #${weekNumber}/${d.getFullYear()}`;
    if (!batches[key]) batches[key] = [];
    batches[key].push(o);
  });

  const items: MerchantPayoutAuditItem[] = [];

  Object.entries(batches).forEach(([cycleLabel, cycleOrders], idx) => {
    let grossSold = 0;
    let canceledAmount = 0;
    let reversalsAmount = 0;
    let discountsAmount = 0;
    const orderIds: string[] = [];

    cycleOrders.forEach(o => {
      orderIds.push(o.id);
      const val = Number(o.total || 0);
      const disc = Number(o.discount || 0);

      if (o.status === 'canceled' || o.status === 'cancelled') {
        canceledAmount += val;
      } else {
        grossSold += val;
        discountsAmount += disc;
        if (o.paymentStatus === 'refunded') {
          reversalsAmount += val;
        }
      }
    });

    const netSales = Math.max(0, grossSold - discountsAmount - reversalsAmount);
    const platformCommission = netSales * (commissionPercent / 100);
    const paymentGatewayFees = netSales * (gatewayFeePercent / 100);
    const manualAdjustments = 0; // Ajustes neutros por padrão
    const netPayoutDue = Math.max(0, netSales - platformCommission - paymentGatewayFees + manualAdjustments);

    // O ciclo mais antigo é considerado liquidado; o mais recente é processamento/pendente
    const isLatest = idx === Object.keys(batches).length - 1;
    const status: 'liquidated' | 'processing' | 'pending' = isLatest ? 'processing' : 'liquidated';
    const amountSettled = status === 'liquidated' ? netPayoutDue : 0;
    const amountPending = status === 'liquidated' ? 0 : netPayoutDue;

    const dates = cycleOrders.map(o => new Date(o.createdAt).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    items.push({
      id: `payout-${idx + 1}-${cycleLabel.replace(/[^a-zA-Z0-9]/g, '_')}`,
      periodLabel: cycleLabel,
      startDate: minDate,
      endDate: maxDate,
      totalGrossSold: grossSold,
      totalCanceled: canceledAmount,
      totalReversals: reversalsAmount,
      totalDiscounts: discountsAmount,
      platformCommission,
      paymentGatewayFees,
      manualAdjustments,
      netPayoutDue,
      amountSettled,
      amountPending,
      status,
      payoutDate: status === 'liquidated' ? maxDate : undefined,
      responsibleUser: 'SaaS Financeiro / Conciliador Automático',
      ordersCount: cycleOrders.length,
      orderIds
    });
  });

  return items.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

// -------------------------------------------------------------
// CONCILIAÇÃO AUTOMÁTICA (PEDIDOS vs PAGAMENTOS vs COMISSÕES vs REPASSES)
// -------------------------------------------------------------

export interface ReconciliationDiscrepancy {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 
    | 'order_without_payment'
    | 'payment_without_order'
    | 'payout_mismatch'
    | 'commission_mismatch'
    | 'refund_not_reflected'
    | 'canceled_order_accounted'
    | 'net_value_mismatch'
    | 'duplicate_payment'
    | 'duplicate_payout';
  orderId?: string;
  paymentId?: string;
  payoutId?: string;
  expectedAmount?: number;
  actualAmount?: number;
  difference?: number;
  detectedAt: Date;
  recommendedAction: string;
}

export function detectReconciliationDiscrepancies(params: {
  orders: Order[];
  financialRecords: FinancialRecord[];
  payouts: MerchantPayoutAuditItem[];
  auditLogs: AuditLog[];
}): ReconciliationDiscrepancy[] {
  const { orders, financialRecords, payouts } = params;
  const discrepancies: ReconciliationDiscrepancy[] = [];

  // 1. Pedido sem pagamento
  orders.forEach(order => {
    const isFinished = order.status === 'delivered' || order.status === 'finished';
    const isPaid = order.paymentStatus === 'paid' || (order.payments && order.payments.length > 0);
    const hasCustomerFiado = !!order.customerId;

    if (isFinished && !isPaid && !hasCustomerFiado && order.total > 0) {
      discrepancies.push({
        id: `rec-no-pay-${order.id}`,
        code: 'REC_01_PEDIDO_SEM_PAGAMENTO',
        title: 'Pedido finalizado sem registro financeiro de quitação',
        description: `O pedido #${order.id.slice(0, 8)} de R$ ${order.total.toFixed(2)} foi concluído sem comprovante de pagamento registrado.`,
        severity: 'critical',
        category: 'order_without_payment',
        orderId: order.id,
        expectedAmount: order.total,
        actualAmount: 0,
        difference: order.total,
        detectedAt: new Date(),
        recommendedAction: 'Conferir se o valor entrou via gateway/caixa ou se deve ser debitado na conta do cliente.'
      });
    }

    // 2. Pedido cancelado contabilizado como venda
    if (order.status === 'canceled' && order.paymentStatus === 'paid') {
      discrepancies.push({
        id: `rec-cancel-sold-${order.id}`,
        code: 'REC_02_CANCELADO_COM_PAGAMENTO_ATIVO',
        title: 'Pedido cancelado retém status de pago sem estorno formal',
        description: `O pedido #${order.id.slice(0, 8)} de R$ ${order.total.toFixed(2)} foi cancelado, porém o pagamento ainda consta como recebido no saldo do lojista.`,
        severity: 'critical',
        category: 'canceled_order_accounted',
        orderId: order.id,
        expectedAmount: 0,
        actualAmount: order.total,
        difference: order.total,
        detectedAt: new Date(),
        recommendedAction: 'Executar o estorno contábil do pagamento para desobrigar o repasse da plataforma.'
      });
    }

    // 3. Pagamento duplicado
    if (order.payments && order.payments.length > 1) {
      const sum = order.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      if (sum > order.total + 0.05 && order.total > 0) {
        discrepancies.push({
          id: `rec-dup-pay-${order.id}`,
          code: 'REC_03_PAGAMENTO_DUPLICADO',
          title: 'Soma de pagamentos superior ao valor do pedido',
          description: `O pedido #${order.id.slice(0, 8)} soma R$ ${sum.toFixed(2)} em múltiplos lançamentos para um total de R$ ${order.total.toFixed(2)}.`,
          severity: 'warning',
          category: 'duplicate_payment',
          orderId: order.id,
          expectedAmount: order.total,
          actualAmount: sum,
          difference: sum - order.total,
          detectedAt: new Date(),
          recommendedAction: 'Cancelar ou estornar o lançamento de pagamento duplicado.'
        });
      }
    }
  });

  // 4. Pagamento sem pedido correspondente
  financialRecords.forEach(rec => {
    if (rec.type === 'income' && rec.orderId) {
      const matchedOrder = orders.find(o => o.id === rec.orderId);
      if (!matchedOrder) {
        discrepancies.push({
          id: `rec-pay-no-order-${rec.id}`,
          code: 'REC_04_PAGAMENTO_SEM_PEDIDO',
          title: 'Lançamento financeiro aponta pedido inexistente',
          description: `O registro financeiro de R$ ${rec.amount.toFixed(2)} ("${rec.description}") referencia o pedido ${rec.orderId}, que não foi localizado.`,
          severity: 'warning',
          category: 'payment_without_order',
          paymentId: rec.id,
          expectedAmount: 0,
          actualAmount: rec.amount,
          difference: rec.amount,
          detectedAt: new Date(),
          recommendedAction: 'Ajustar o vínculo da receita ou reclassificar como lançamento avulso.'
        });
      }
    }
  });

  // 5. Repasse com divergência de cálculo
  payouts.forEach(p => {
    const calculatedDue = Math.max(0, p.totalGrossSold - p.totalDiscounts - p.totalReversals - p.platformCommission - p.paymentGatewayFees + p.manualAdjustments);
    if (Math.abs(calculatedDue - p.netPayoutDue) > 0.1) {
      discrepancies.push({
        id: `rec-payout-diff-${p.id}`,
        code: 'REC_05_REPASSE_INCORRETO',
        title: `Divergência matemática no ciclo de repasse (${p.periodLabel})`,
        description: `O valor apurado de R$ ${p.netPayoutDue.toFixed(2)} diverge do cálculo de conciliação R$ ${calculatedDue.toFixed(2)}.`,
        severity: 'critical',
        category: 'payout_mismatch',
        payoutId: p.id,
        expectedAmount: calculatedDue,
        actualAmount: p.netPayoutDue,
        difference: Math.abs(calculatedDue - p.netPayoutDue),
        detectedAt: new Date(),
        recommendedAction: 'Recalcular o ciclo de repasse com as comissões e estornos consolidados.'
      });
    }
  });

  return discrepancies;
}
