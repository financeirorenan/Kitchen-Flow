
import { Product, Table, Courier, User, AuditLog, Permission } from './types';

export const CATEGORIES = ['Bebidas', 'Entradas', 'Pratos Principais', 'Sobremesas', 'Lanches'];

const generateHistory = (basePrice: number, baseCost: number) => [
  { date: '2024-11-15', price: basePrice * 0.9, cost: baseCost * 0.85 },
  { date: '2024-12-20', price: basePrice * 0.95, cost: baseCost * 0.95 },
  { date: '2025-01-10', price: basePrice, cost: baseCost },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Hambúrguer Artesanal', category: 'Lanches', price: 35.00, cost: 12.50, stock: 50, image: 'https://picsum.photos/seed/burger/200', priceHistory: generateHistory(35.00, 12.50) },
  { id: '2', name: 'Cerveja IPA 500ml', category: 'Bebidas', price: 18.00, cost: 8.00, stock: 120, image: 'https://picsum.photos/seed/beer/200', priceHistory: generateHistory(18.00, 8.00) },
  { id: '3', name: 'Batata Frita G', category: 'Entradas', price: 25.00, cost: 6.00, stock: 30, image: 'https://picsum.photos/seed/fries/200', priceHistory: generateHistory(25.00, 6.00) },
  { id: '4', name: 'Coca-Cola 350ml', category: 'Bebidas', price: 7.00, cost: 2.50, stock: 200, image: 'https://picsum.photos/seed/coke/200', priceHistory: generateHistory(7.00, 2.50) },
  { id: '5', name: 'Petit Gateau', category: 'Sobremesas', price: 22.00, cost: 7.50, stock: 15, image: 'https://picsum.photos/seed/dessert/200', priceHistory: generateHistory(22.00, 7.50) },
  { id: '6', name: 'Picanha na Chapa', category: 'Pratos Principais', price: 89.90, cost: 42.00, stock: 10, image: 'https://picsum.photos/seed/steak/200', priceHistory: generateHistory(89.90, 42.00) },
];

export const INITIAL_TABLES: Table[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  status: 'available',
  items: [],
  total: 0
}));

// Added missing createdAt property to Courier initial data
export const INITIAL_COURIERS: Courier[] = [
  { id: 'c1', name: 'João Silva', status: 'available', phone: '(11) 98888-7777', createdAt: new Date() },
  { id: 'c2', name: 'Marcos Oliveira', status: 'delivering', phone: '(11) 97777-6666', createdAt: new Date() },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: ['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'delivery_manage', 'inventory_edit', 'finance_view', 'cmv_analysis', 'users_manage'],
  MANAGER: ['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'delivery_manage', 'inventory_edit', 'cmv_analysis'],
  WAITER: ['pos_access', 'tables_manage'],
  CASHIER: ['pos_access', 'delivery_manage'],
  CHEF: ['kds_view', 'inventory_edit'],
};

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Julia Silva', email: 'julia@gastroai.com', role: 'ADMIN', status: 'online', permissions: ROLE_DEFAULT_PERMISSIONS.ADMIN, createdAt: new Date('2024-01-10') },
  { id: 'u2', name: 'Carlos Santos', email: 'carlos@gastroai.com', role: 'MANAGER', status: 'online', permissions: ROLE_DEFAULT_PERMISSIONS.MANAGER, createdAt: new Date('2024-01-15') },
  { id: 'u3', name: 'Ricardo Chef', email: 'ricardo@gastroai.com', role: 'CHEF', status: 'offline', permissions: ROLE_DEFAULT_PERMISSIONS.CHEF, createdAt: new Date('2024-02-01') },
  { id: 'u4', name: 'Maria Garçom', email: 'maria@gastroai.com', role: 'WAITER', status: 'online', permissions: ROLE_DEFAULT_PERMISSIONS.WAITER, createdAt: new Date('2024-02-10') },
  { id: 'u5', name: 'Paulo Caixa', email: 'paulo@gastroai.com', role: 'CASHIER', status: 'offline', permissions: ROLE_DEFAULT_PERMISSIONS.CASHIER, createdAt: new Date('2024-02-15') },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: '1', userId: 'u1', userName: 'Julia Silva', userRole: 'ADMIN', action: 'LOGIN', description: 'Realizou login no sistema', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
  { id: '2', userId: 'u5', userName: 'Paulo Caixa', userRole: 'CASHIER', action: 'VENDA', description: 'Finalizou pedido #34a1 (R$ 142.50)', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: '3', userId: 'u2', userName: 'Carlos Santos', userRole: 'MANAGER', action: 'ESTOQUE', description: 'Ajustou estoque de Cerveja IPA (+24 un)', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
  { id: '4', userId: 'u3', userName: 'Ricardo Chef', userRole: 'CHEF', action: 'KDS', description: 'Marcou pedido #bc22 como PRONTO', timestamp: new Date(Date.now() - 1000 * 60 * 180) },
  { id: '5', userId: 'u4', userName: 'Maria Garçom', userRole: 'WAITER', action: 'MESA', description: 'Abriu mesa #04', timestamp: new Date(Date.now() - 1000 * 60 * 240) },
];
