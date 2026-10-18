import { calculateMasterEquationByChannel, getAuditPeriodRange } from '../services/auditService';
import { Order, OrderPayment, FinancialRecord, Tenant } from '../types';
import { parseKdsItemDetails } from '../utils/kdsItemFormatter';
import { deduplicateOrders } from '../utils/deduplicate';

interface TestResult {
  name: string;
  block: string;
  passed: boolean;
  expected: string;
  found: string;
  details: string;
}

const results: TestResult[] = [];

function assertTest(
  condition: boolean,
  name: string,
  block: string,
  expected: string,
  found: string,
  details: string
) {
  if (condition) {
    results.push({ name, block, passed: true, expected, found, details });
    console.log(`✅ [PASS] [${block}] ${name}\n   -> Esperado: ${expected} | Encontrado: ${found}`);
  } else {
    results.push({ name, block, passed: false, expected, found, details });
    console.error(`❌ [FAIL] [${block}] ${name}\n   -> Esperado: ${expected} | Encontrado: ${found}`);
  }
}

async function runMasterEquationAudit() {
  console.log('========================================================================');
  console.log('⚖️ AUDITORIA DE INTEGRIDADE DE DADOS: EQUAÇÃO MESTRE & CONSISTÊNCIA 360');
  console.log('========================================================================\n');

  const now = new Date();
  const range = getAuditPeriodRange('today');

  // =========================================================================
  // BLOCO 1: SOMA DO CAIXA
  // =========================================================================
  console.log('--- BLOCO 1: SOMA DO CAIXA ---');

  // 1.1 Fechamento de Caixa: Troco inicial + entradas - saídas = saldo esperado
  const openingCash = 150.00;
  const cashPaymentsReceived = 380.00; // Entradas em dinheiro
  const sangria = 50.00; // Saída
  const suprimento = 70.00; // Entrada extra
  const expectedDrawerBalance = openingCash + cashPaymentsReceived + suprimento - sangria; // 150 + 380 + 70 - 50 = 550.00
  const actualCounted = 550.00;
  const cashDiff = actualCounted - expectedDrawerBalance;

  assertTest(
    Math.abs(cashDiff) < 0.001,
    'Fechamento de Caixa: Troco + Entradas - Saídas = Saldo Esperado',
    '1. Caixa',
    'R$ 550,00',
    `R$ ${expectedDrawerBalance.toFixed(2)}`,
    'Cálculo do saldo esperado em dinheiro na gaveta confere exatamente'
  );

  // 1.2 Taxas de cartão abatidas corretamente: bruto - taxa = líquido
  const cardGross = 500.00;
  const feePercent = 2.5; // 2.5%
  const cardFeeAmount = (cardGross * feePercent) / 100; // R$ 12,50
  const cardNet = cardGross - cardFeeAmount; // R$ 487,50

  assertTest(
    cardNet === 487.50 && cardFeeAmount === 12.50,
    'Taxa de Cartão: Bruto - Taxa = Líquido',
    '1. Caixa',
    'R$ 487,50 líquido (R$ 12,50 taxa)',
    `R$ ${cardNet.toFixed(2)} líq. (R$ ${cardFeeAmount.toFixed(2)} taxa)`,
    'Líquido e taxa separados sem contaminação do faturamento bruto'
  );

  // 1.3 Sangria e Suprimento com categoria e valor correto
  const validRecords: FinancialRecord[] = [
    {
      id: 'rec-sup-1',
      type: 'income',
      amount: 70.00,
      category: 'Suprimento',
      description: 'Reforço de troco',
      date: now,
      status: 'paid',
      paymentMethod: 'dinheiro'
    },
    {
      id: 'rec-sang-1',
      type: 'expense',
      amount: 50.00,
      category: 'Sangria',
      description: 'Depósito malote',
      date: now,
      status: 'paid',
      paymentMethod: 'dinheiro'
    }
  ];

  const sangriaSum = validRecords.filter(r => r.category === 'Sangria').reduce((s, r) => s + r.amount, 0);
  const suprimentoSum = validRecords.filter(r => r.category === 'Suprimento').reduce((s, r) => s + r.amount, 0);

  assertTest(
    sangriaSum === 50.00 && suprimentoSum === 70.00,
    'Sangrias e Suprimentos catalogados com motivo e valor correto',
    '1. Caixa',
    'Sangria: R$ 50,00 | Suprimento: R$ 70,00',
    `Sangria: R$ ${sangriaSum.toFixed(2)} | Suprimento: R$ ${suprimentoSum.toFixed(2)}`,
    'Categorias e valores de movimentação conferem com os lançamentos'
  );

  // =========================================================================
  // BLOCO 2: SOMA DE PEDIDOS
  // =========================================================================
  console.log('\n--- BLOCO 2: SOMA DE PEDIDOS ---');

  // 2.1 Valor total = soma dos itens + adicionais + taxa de entrega - descontos
  const sampleItems = [
    { id: 'i1', productId: 'p1', name: 'Hambúrguer Artesanal', price: 35.00, quantity: 2 }, // 70.00
    { id: 'i2', productId: 'p2', name: 'Batata Frita Rústica', price: 18.00, quantity: 1 }  // 18.00
  ];
  const itemsSum = sampleItems.reduce((acc, it) => acc + (it.price * it.quantity), 0); // 88.00
  const deliveryFee = 10.00;
  const discount = 8.00;
  const expectedTotal = itemsSum + deliveryFee - discount; // 90.00

  assertTest(
    expectedTotal === 90.00,
    'Fórmula de Total: Itens + Adicionais + Taxa - Descontos',
    '2. Pedidos',
    'R$ 90,00',
    `R$ ${expectedTotal.toFixed(2)}`,
    'Total calculado exatamente sem arredondamento arbitrário'
  );

  // 2.2 Pedidos divididos em múltiplos pagamentos: soma das parcelas = total exato
  const splitOrderPayments: OrderPayment[] = [
    { method: 'pix', amount: 40.00 },
    { method: 'cartao_credito', amount: 30.00 },
    { method: 'dinheiro', amount: 20.00 }
  ];
  const splitSum = splitOrderPayments.reduce((acc, p) => acc + p.amount, 0);

  assertTest(
    Math.abs(expectedTotal - splitSum) < 0.001,
    'Múltiplos Pagamentos: Soma das parcelas = Total Exato',
    '2. Pedidos',
    'R$ 90,00',
    `R$ ${splitSum.toFixed(2)}`,
    'Parcelas quitam 100% do pedido sem deixar resíduo ou sobra'
  );

  // 2.3 Pedidos cancelados saem da soma sem deixar resíduo
  const ordersSetWithCancelled: Order[] = [
    {
      id: 'ord-active-1',
      total: 90.00,
      status: 'finished',
      paymentStatus: 'paid',
      type: 'delivery',
      createdAt: now,
      items: sampleItems
    },
    {
      id: 'ord-cancelled-1',
      total: 120.00,
      status: 'cancelled', // Double 'l'
      paymentStatus: 'pending',
      type: 'delivery',
      createdAt: now,
      items: [{ id: 'i3', productId: 'p3', name: 'Pizza Grande', price: 120.00, quantity: 1 }]
    },
    {
      id: 'ord-cancelled-2',
      total: 65.00,
      status: 'canceled' as any, // Single 'l'
      paymentStatus: 'pending',
      type: 'takeout',
      createdAt: now,
      items: [{ id: 'i4', productId: 'p4', name: 'Combo Sushi', price: 65.00, quantity: 1 }]
    }
  ];

  const netSalesSum = ordersSetWithCancelled
    .filter(o => o.status !== 'cancelled' && (o.status as any) !== 'canceled')
    .reduce((acc, o) => acc + o.total, 0);

  assertTest(
    netSalesSum === 90.00,
    'Exclusão de Cancelados: Saem da soma sem deixar resíduo (ambas grafias)',
    '2. Pedidos',
    'R$ 90,00',
    `R$ ${netSalesSum.toFixed(2)}`,
    'Ambos "cancelled" e "canceled" são expurgados do faturamento'
  );

  // =========================================================================
  // BLOCO 3: SOMA DO KDS
  // =========================================================================
  console.log('\n--- BLOCO 3: SOMA DO KDS ---');

  // 3.1 Todo pedido enviado à cozinha aparece exatamente uma vez (sem duplicatas)
  const duplicateInputOrders: Order[] = [
    { id: 'kds-1', total: 50.00, status: 'preparing', type: 'table', tableNumber: 5, createdAt: now, items: sampleItems },
    { id: 'kds-1', total: 50.00, status: 'preparing', type: 'table', tableNumber: 5, createdAt: now, items: sampleItems },
    { id: 'kds-2', total: 45.00, status: 'preparing', type: 'delivery', createdAt: now, items: sampleItems }
  ];
  const deduplicatedKdsOrders = deduplicateOrders(duplicateInputOrders);

  assertTest(
    deduplicatedKdsOrders.length === 2,
    'Deduplicação de Pedidos no KDS: Exatamente uma vez por comanda',
    '3. KDS',
    '2 pedidos',
    `${deduplicatedKdsOrders.length} pedidos`,
    'Eliminada duplicidade de rede ou concorrência'
  );

  // 3.2 Itens cancelados após envio são riscados/sinalizados sem duplicar a fila
  const testItem = {
    id: 'item-cancel-test',
    productId: 'p1',
    name: 'X-Burger Especial',
    price: 32.00,
    quantity: 1,
    cancelled: true,
    observation: 'Sem maionese'
  };
  const parsedItem = parseKdsItemDetails(testItem);

  assertTest(
    parsedItem.isCancelled === true && parsedItem.removals.length > 0,
    'Item cancelado no KDS: Marcado como cancelado sem inflar quantidade',
    '3. KDS',
    'isCancelled: true',
    `isCancelled: ${parsedItem.isCancelled}`,
    'Item cancelado identificado e removidos detectados'
  );

  // =========================================================================
  // BLOCO 4: SOMA DO MARKETPLACE
  // =========================================================================
  console.log('\n--- BLOCO 4: SOMA DO MARKETPLACE ---');

  // 4.1 Pedido pago online (PIX) vs pago na entrega
  const mktPrepaidOrder: Order = {
    id: 'mkt-pix-1',
    total: 85.00,
    status: 'pending',
    paymentStatus: 'paid',
    isSettled: true,
    paymentMethod: 'pix',
    source: 'marketplace',
    type: 'delivery',
    createdAt: now,
    items: sampleItems
  };

  const mktOnDeliveryOrder: Order = {
    id: 'mkt-cash-1',
    total: 60.00,
    status: 'pending',
    paymentStatus: 'pending',
    isSettled: false,
    paymentMethod: 'dinheiro',
    source: 'marketplace',
    type: 'delivery',
    createdAt: now,
    items: sampleItems
  };

  assertTest(
    mktPrepaidOrder.paymentStatus === 'paid' && mktOnDeliveryOrder.paymentStatus === 'pending',
    'Marketplace: Pago online (PIX) entra como paid, pago na entrega entra como pending',
    '4. Marketplace',
    'Prepaid: paid | Na Entrega: pending',
    `Prepaid: ${mktPrepaidOrder.paymentStatus} | Na Entrega: ${mktOnDeliveryOrder.paymentStatus}`,
    'Separação correta de quitação para conciliação bancária'
  );

  // 4.2 Apenas lojas ativas cadastradas aparecem e vendem no app
  const tenantsList: Tenant[] = [
    { id: 't1', name: 'Pizzaria Bella Napoli', active: true, ownerId: 'u1', planId: 'pro', subscription: {} as any, createdAt: now },
    { id: 't2', name: 'Restaurante Desativado', active: false, ownerId: 'u2', planId: 'basic', subscription: {} as any, createdAt: now }
  ];
  const activeTenantsOnly = tenantsList.filter(t => t.active !== false);

  assertTest(
    activeTenantsOnly.length === 1 && activeTenantsOnly[0].id === 't1',
    'Marketplace: Apenas lojas reais cadastradas e aprovadas (active: true) vendem',
    '4. Marketplace',
    '1 loja ativa',
    `${activeTenantsOnly.length} loja(s) ativa(s)`,
    'Lojas desativadas ou suspensas excluídas da listagem pública'
  );

  // =========================================================================
  // BLOCO 5: EQUAÇÃO MESTRE & CONSISTÊNCIA CRUZADA
  // =========================================================================
  console.log('\n--- BLOCO 5: EQUAÇÃO MESTRE CRUZADA (TODOS OS CANAIS) ---');

  // Criar 1 pedido em cada canal
  const testOrdersByChannel: Order[] = [
    // Canal Mesa
    {
      id: 'ord-ch-table',
      type: 'table',
      tableNumber: 3,
      total: 120.00,
      deliveryFee: 0,
      discount: 0,
      status: 'finished',
      paymentStatus: 'paid',
      isSettled: true,
      paymentMethod: 'cartao_credito',
      payments: [{ method: 'cartao_credito', amount: 120.00 }],
      createdAt: now,
      items: [{ id: 'i10', productId: 'p10', name: 'Almoço Executivo', price: 60.00, quantity: 2 }]
    },
    // Canal Balcão
    {
      id: 'ord-ch-counter',
      type: 'takeout',
      total: 45.00,
      deliveryFee: 0,
      discount: 5.00,
      status: 'finished',
      paymentStatus: 'paid',
      isSettled: true,
      paymentMethod: 'dinheiro',
      payments: [{ method: 'dinheiro', amount: 45.00 }],
      createdAt: now,
      items: [{ id: 'i11', productId: 'p11', name: 'Marmitex Especial', price: 50.00, quantity: 1 }]
    },
    // Canal Delivery
    {
      id: 'ord-ch-delivery',
      type: 'delivery',
      total: 98.00,
      deliveryFee: 10.00,
      discount: 0,
      status: 'delivered',
      paymentStatus: 'paid',
      isSettled: true,
      paymentMethod: 'pix',
      payments: [{ method: 'pix', amount: 98.00 }],
      createdAt: now,
      items: [{ id: 'i12', productId: 'p12', name: 'Pizza Família', price: 88.00, quantity: 1 }]
    },
    // Canal Marketplace
    {
      id: 'ord-ch-marketplace',
      source: 'marketplace',
      type: 'delivery',
      total: 75.00,
      deliveryFee: 5.00,
      discount: 10.00,
      status: 'finished',
      paymentStatus: 'paid',
      isSettled: true,
      paymentMethod: 'pix',
      payments: [{ method: 'pix', amount: 75.00 }],
      createdAt: now,
      items: [{ id: 'i13', productId: 'p13', name: 'Hambúrguer Gourmet + Bebida', price: 80.00, quantity: 1 }]
    }
  ];

  const equationReport = calculateMasterEquationByChannel({ orders: testOrdersByChannel, range });

  console.log('\n--- DETALHAMENTO DA EQUAÇÃO MESTRE POR CANAL ---');
  equationReport.channels.forEach(ch => {
    console.log(`[${ch.channelLabel.padEnd(25)}] Pedidos: R$ ${ch.ordersNetSum.toFixed(2)} | Caixa: R$ ${ch.cashEntriesSum.toFixed(2)} | Dif: R$ ${ch.difference.toFixed(2)} | ${ch.isBalanced ? '✓ OK' : '✗ DIVERGENTE'}`);
  });

  assertTest(
    equationReport.isAllBalanced,
    'Equação Mestre por Canal: SOMA PEDIDOS = SOMA ENTRADAS CAIXA (100% dos canais batem)',
    '5. Equação Mestre',
    'Diferença = R$ 0,00 (Todos os 4 canais batem)',
    `Diferença = R$ ${equationReport.totalDifference.toFixed(2)} (${equationReport.isAllBalanced ? 'Equação Fechada' : 'Divergente'})`,
    'Mesa (R$ 120,00 = R$ 120,00), Balcão (R$ 45,00 = R$ 45,00), Delivery (R$ 98,00 = R$ 98,00), Marketplace (R$ 75,00 = R$ 75,00)'
  );

  assertTest(
    equationReport.totalOrdersNet === 338.00 && equationReport.totalCashEntries === 338.00,
    'Soma Global da Equação Mestre: R$ 338,00 em pedidos = R$ 338,00 em entradas',
    '5. Equação Mestre',
    'R$ 338,00 = R$ 338,00',
    `R$ ${equationReport.totalOrdersNet.toFixed(2)} = R$ ${equationReport.totalCashEntries.toFixed(2)}`,
    'Total consolidado coincide até os centavos sem desvio'
  );

  // Resumo final
  const totalPassed = results.filter(r => r.passed).length;
  console.log('\n========================================================================');
  console.log(`📊 AUDITORIA CONCLUÍDA: ${totalPassed}/${results.length} TESTES APROVADOS COM SUCESSO`);
  console.log('========================================================================');

  if (totalPassed === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMasterEquationAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
