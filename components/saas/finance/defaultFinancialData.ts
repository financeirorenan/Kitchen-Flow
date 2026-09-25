import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';
import { SaasLedgerItem } from './types';

/**
 * Lojistas Cadastrados Previamente no KitchenFlow SaaS
 * Garante disponibilidade e resiliência total mesmo durante quedas de rede ou estouro de cota do Firestore.
 */
export const DEFAULT_REGISTERED_TENANTS: Tenant[] = [
  {
    id: 'HCL1177LRQVPEKCTYRAHU7IGBQ42',
    clientNumber: 101,
    name: 'Viva la fome',
    companyName: 'Viva Lá Fome Restaurante e Delivery',
    slug: 'viva-la-fome',
    category: 'Alimentação / Delivery',
    ownerId: 'financeirorenanuk@gmail.com',
    email: 'financeirorenanuk@gmail.com',
    phone: '(16) 99742-1100',
    planId: 'pro',
    active: true,
    createdAt: new Date(Date.now() - 90 * 86400000),
    subscription: {
      plan: 'PRO',
      planId: 'pro',
      status: 'active',
      startDate: new Date(Date.now() - 60 * 86400000),
      expiryDate: new Date(Date.now() + 15 * 86400000), // Vence em 15 dias
      allowedModules: [
        'merchant-copilot', 'pos', 'tables_manage', 'delivery', 
        'inventory', 'cmv', 'finance', 'kds', 'marketplace'
      ]
    }
  },
  {
    id: 'lojista',
    clientNumber: 102,
    name: 'KitchenFlow Matriz',
    companyName: 'KitchenFlow Alimentos e Bebidas Matriz',
    slug: 'lojista',
    category: 'Alimentação / Delivery',
    ownerId: 'lojista@kitchenflow.app',
    email: 'atendimento@kitchenflow.app',
    phone: '(11) 99999-8888',
    planId: 'ultimate',
    active: true,
    createdAt: new Date(Date.now() - 120 * 86400000),
    subscription: {
      plan: 'ENTERPRISE',
      planId: 'ultimate',
      status: 'active',
      startDate: new Date(Date.now() - 90 * 86400000),
      expiryDate: new Date(Date.now() + 20 * 86400000), // Vence em 20 dias
      allowedModules: [
        'merchant-copilot', 'pos', 'tables_manage', 'delivery', 
        'inventory', 'cmv', 'finance', 'kds', 'menu_digital_config', 
        'digital_menu', 'marketplace', 'ai_auditor', 'users', 'logs'
      ]
    }
  },
  {
    id: 'tenant-1',
    clientNumber: 103,
    name: 'Pradópolis Burger House',
    companyName: 'Pradópolis Burger House Ltda',
    slug: 'pradopolis-burger',
    category: 'Lanches & Hamburguerias',
    ownerId: 'contato@pradopolisburger.com.br',
    email: 'contato@pradopolisburger.com.br',
    phone: '(16) 99811-2233',
    planId: 'pro',
    active: true,
    createdAt: new Date(Date.now() - 45 * 86400000),
    subscription: {
      plan: 'PRO',
      planId: 'pro',
      status: 'active',
      startDate: new Date(Date.now() - 40 * 86400000),
      expiryDate: new Date(Date.now() + 5 * 86400000), // Vence em 5 dias
      allowedModules: ['merchant-copilot', 'pos', 'delivery', 'marketplace']
    }
  },
  {
    id: 'tenant-2',
    clientNumber: 104,
    name: 'Pizzaria Bella Napoli',
    companyName: 'Bella Napoli Forno a Lenha EIRELI',
    slug: 'bella-napoli',
    category: 'Pizzarias',
    ownerId: 'contato@bellanapoli.com.br',
    email: 'contato@bellanapoli.com.br',
    phone: '(16) 99755-4422',
    planId: 'basic',
    active: true,
    createdAt: new Date(Date.now() - 35 * 86400000),
    subscription: {
      plan: 'BASIC',
      planId: 'basic',
      status: 'past_due',
      startDate: new Date(Date.now() - 32 * 86400000),
      expiryDate: new Date(Date.now() - 2 * 86400000), // Vencido há 2 dias
      allowedModules: ['merchant-copilot', 'pos', 'delivery', 'marketplace']
    }
  },
  {
    id: 'tenant-3',
    clientNumber: 105,
    name: 'Cantina & Esfiharia Central',
    companyName: 'Cantina & Esfiharia Central Ltda',
    slug: 'cantina-central',
    category: 'Árabe / Esfihas',
    ownerId: 'pedidos@esfihariacentral.com.br',
    email: 'pedidos@esfihariacentral.com.br',
    phone: '(16) 99633-8899',
    planId: 'pro',
    active: true,
    createdAt: new Date(Date.now() - 25 * 86400000),
    subscription: {
      plan: 'PRO',
      planId: 'pro',
      status: 'active',
      startDate: new Date(Date.now() - 20 * 86400000),
      expiryDate: new Date(Date.now() + 10 * 86400000), // Vence em 10 dias
      allowedModules: ['merchant-copilot', 'pos', 'delivery', 'marketplace']
    }
  }
];

/**
 * Planos SaaS Padronizados do KitchenFlow
 */
export const DEFAULT_SAAS_PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    description: 'Ideal para pequenos comércios e delivery inicial',
    price: 99.00,
    features: ['PDV Rápido', 'Gestão de Mesas', 'Cardápio Digital', 'Até 2 usuários'],
    modules: ['pos', 'tables_manage', 'digital_menu'],
    maxUsers: 2,
    maxOrders: 500,
    billingCycle: 'monthly',
    active: true
  },
  {
    id: 'pro',
    name: 'Profissional',
    description: 'Mais popular para restaurantes, hamburguerias e pizzarias em expansão',
    price: 199.00,
    features: ['Tudo do Básico', 'Marketplace Zupi B2C', 'KDS Cozinha', 'Controle de Estoque & CMV', 'Até 5 usuários'],
    modules: ['pos', 'tables_manage', 'delivery', 'inventory', 'cmv', 'kds', 'marketplace'],
    maxUsers: 5,
    maxOrders: 2000,
    billingCycle: 'monthly',
    active: true
  },
  {
    id: 'ultimate',
    name: 'Enterprise',
    description: 'Gestão completa para redes, franquias e alta demanda',
    price: 499.00,
    features: ['Tudo do Pro', 'Módulo Fiscal NFC-e', 'Copiloto de IA', 'Usuários e Pedidos Ilimitados'],
    modules: ['pos', 'tables_manage', 'delivery', 'inventory', 'cmv', 'kds', 'marketplace', 'ai_auditor', 'users'],
    maxUsers: 25,
    maxOrders: 10000,
    billingCycle: 'monthly',
    active: true
  }
];

/**
 * Pedidos de Marketplace Padronizados para Contabilização de Taxas (R$ 2,00 por pedido)
 */
function createMktOrder(id: string, tenantId: string, daysAgo: number, total: number, customerName: string): Order {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return {
    id,
    tenantId,
    type: 'delivery',
    status: 'delivered',
    source: 'marketplace',
    customerName,
    customerPhone: '(16) 99888-7766',
    total,
    marketplaceFee: 2.00,
    deliveryFee: 5.00,
    paymentStatus: 'paid',
    paidAt: date,
    createdAt: date,
    items: [
      {
        id: `it-${id}`,
        productId: 'prod-1',
        name: 'Combo Especial Marketplace',
        quantity: 1,
        price: total
      }
    ]
  };
}

export const DEFAULT_MARKETPLACE_ORDERS: Order[] = [
  // 18 pedidos para Viva la fome (HCL1177LRQVPEKCTYRAHU7IGBQ42) -> R$ 36,00 de taxas
  ...Array.from({ length: 18 }).map((_, i) =>
    createMktOrder(`mkt-viva-${i + 1}`, 'HCL1177LRQVPEKCTYRAHU7IGBQ42', (i % 25) + 1, 48.50 + (i * 2), `Cliente Viva ${i + 1}`)
  ),

  // 26 pedidos para Pradópolis Burger House (tenant-1) -> R$ 52,00 de taxas
  ...Array.from({ length: 26 }).map((_, i) =>
    createMktOrder(`mkt-burger-${i + 1}`, 'tenant-1', (i % 28) + 1, 56.00 + (i * 1.5), `Cliente Burger ${i + 1}`)
  ),

  // 14 pedidos para Pizzaria Bella Napoli (tenant-2) -> R$ 28,00 de taxas
  ...Array.from({ length: 14 }).map((_, i) =>
    createMktOrder(`mkt-napoli-${i + 1}`, 'tenant-2', (i % 20) + 1, 68.00 + (i * 3), `Cliente Pizza ${i + 1}`)
  ),

  // 10 pedidos para Cantina & Esfiharia Central (tenant-3) -> R$ 20,00 de taxas
  ...Array.from({ length: 10 }).map((_, i) =>
    createMktOrder(`mkt-cantina-${i + 1}`, 'tenant-3', (i % 15) + 1, 42.00 + (i * 2), `Cliente Esfiha ${i + 1}`)
  ),

  // 8 pedidos para KitchenFlow Matriz (lojista) -> R$ 16,00 de taxas
  ...Array.from({ length: 8 }).map((_, i) =>
    createMktOrder(`mkt-matriz-${i + 1}`, 'lojista', (i % 18) + 1, 52.00 + (i * 4), `Cliente Matriz ${i + 1}`)
  )
];

/**
 * Faturas de Marketplace Iniciais (Liquidações parciais registradas)
 */
export const DEFAULT_MARKETPLACE_INVOICES: MarketplaceInvoice[] = [
  {
    id: 'inv-prev-viva',
    tenantId: 'HCL1177LRQVPEKCTYRAHU7IGBQ42',
    period: 'Ciclo Anterior',
    amount: 24.00, // 12 pedidos liquidados no ciclo passado
    status: 'paid',
    orderCount: 12,
    createdAt: new Date(Date.now() - 35 * 86400000),
    paidAt: new Date(Date.now() - 30 * 86400000)
  }
];

/**
 * Itens do Livro Caixa SaaS (Custos operacionais e despesas)
 */
export const DEFAULT_SAAS_LEDGER: SaasLedgerItem[] = [
  {
    id: 'desp-infra-1',
    description: 'Servidores Google Cloud / Cloud Run & Bancos',
    category: 'Servidores e Infraestrutura',
    amount: 185.40,
    type: 'pagar',
    status: 'paid',
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
    paidAt: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
    createdAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  },
  {
    id: 'desp-mail-1',
    description: 'Serviço de Envio Transacional Resend API',
    category: 'Comunicação e APIs',
    amount: 49.00,
    type: 'pagar',
    status: 'paid',
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
    paidAt: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
    createdAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  },
  {
    id: 'desp-dom-1',
    description: 'Registro.br / Certificados SSL e Domínios',
    category: 'Domínios e SSL',
    amount: 40.00,
    type: 'pagar',
    status: 'pending',
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 28),
    createdAt: new Date(new Date().getFullYear(), new Date().getMonth(), 5)
  }
];
