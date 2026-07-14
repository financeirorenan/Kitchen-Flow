
import { Product, Table, Courier, User, AuditLog, Permission, RawMaterial } from './types';

export const CATEGORIES = ['Entradas', 'Buffet', 'Pratos Principais', 'Lanches', 'Batatas Recheadas', 'Pasteis', 'Bebidas'];
export const RAW_MATERIAL_CATEGORIES = ['Proteínas', 'Hortifruti', 'Laticínios', 'Grãos', 'Bebidas', 'Embalagens', 'Limpeza', 'Outros'];

const generateHistory = (basePrice: number, baseCost: number) => [
  { date: '2024-11-15', price: basePrice * 0.9, cost: baseCost * 0.85 },
  { date: '2024-12-20', price: basePrice * 0.95, cost: baseCost * 0.95 },
  { date: '2025-01-10', price: basePrice, cost: baseCost },
];

const ADICIONAIS = [
  { id: 'opt_bife_bov', name: 'Bife bovino', price: 8.00, category: 'Adicionais' },
  { id: 'opt_file_frango', name: 'Filé de frango', price: 7.00, category: 'Adicionais' },
  { id: 'opt_bife_parm', name: 'Bife a parmegiana', price: 10.00, category: 'Adicionais' },
  { id: 'opt_frango_parm', name: 'Filé de frango a parmegiana', price: 9.00, category: 'Adicionais' },
  { id: 'opt_frango_mil', name: 'Filé de frango a milanesa', price: 9.00, category: 'Adicionais' },
  { id: 'opt_ling_aceb', name: 'Linguiça acebolada', price: 7.00, category: 'Adicionais' },
  { id: 'opt_ovo', name: 'Ovo', price: 3.00, category: 'Adicionais' },
  { id: 'opt_feijao', name: 'Feijão', price: 2.50, category: 'Adicionais' },
  { id: 'opt_arroz', name: 'Arroz', price: 3.50, category: 'Adicionais' },
  { id: 'opt_batata', name: 'Batata frita', price: 3.50, category: 'Adicionais' },
  { id: 'opt_farofa', name: 'Farofa', price: 3.50, category: 'Adicionais' },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Entradas
  { id: 'e1', tenantId: 't1', name: 'Bolinha de queijo com cream cheese', category: 'Entradas', price: 20.00, cost: 8.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(20.00, 8.00) },
  { id: 'e2', tenantId: 't1', name: 'Batata frita', category: 'Entradas', price: 20.00, cost: 6.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(20.00, 6.00) },
  { id: 'e3', tenantId: 't1', name: 'Batata chips', category: 'Entradas', price: 15.00, cost: 4.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(15.00, 4.00) },
  { id: 'e4', tenantId: 't1', name: 'Torradas com geleia de pimenta', category: 'Entradas', price: 20.00, cost: 5.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(20.00, 5.00) },
  { id: 'e5', tenantId: 't1', name: 'Sticks de queijo', category: 'Entradas', price: 20.00, cost: 7.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(20.00, 7.00) },

  // Buffet
  { id: 'b1', tenantId: 't1', name: 'Buffet por kg', category: 'Buffet', price: 64.99, cost: 25.00, stock: 999, minStock: 0, unit: 'kg', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(64.99, 25.00) },
  { id: 'b2', tenantId: 't1', name: 'Buffet a vontade', category: 'Buffet', price: 44.99, cost: 18.00, stock: 999, minStock: 0, unit: 'un', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(44.99, 18.00) },

  // Pratos Principais
  { id: 'pp1', tenantId: 't1', name: 'Tradicional', category: 'Pratos Principais', price: 30.00, cost: 12.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 12.00), options: ADICIONAIS },
  { id: 'pp2', tenantId: 't1', name: 'Parmegiana de carne', category: 'Pratos Principais', price: 30.00, cost: 14.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1621510456681-23a23cfb5f57?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 14.00), options: ADICIONAIS },
  { id: 'pp3', tenantId: 't1', name: 'Parmegiana de frango', category: 'Pratos Principais', price: 28.00, cost: 11.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(28.00, 11.00), options: ADICIONAIS },
  { id: 'pp4', tenantId: 't1', name: 'Frango grelhado', category: 'Pratos Principais', price: 28.00, cost: 10.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(28.00, 10.00), options: ADICIONAIS },
  { id: 'pp5', tenantId: 't1', name: 'Frango a milanesa', category: 'Pratos Principais', price: 28.00, cost: 10.50, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(28.00, 10.50), options: ADICIONAIS },
  { id: 'pp6', tenantId: 't1', name: 'Strogonoff de carne', category: 'Pratos Principais', price: 30.00, cost: 13.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 13.00), options: ADICIONAIS },
  { id: 'pp7', tenantId: 't1', name: 'Strogonoff de frango', category: 'Pratos Principais', price: 28.00, cost: 11.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(28.00, 11.00), options: ADICIONAIS },
  { id: 'pp8', tenantId: 't1', name: 'Linguiça acebolada', category: 'Pratos Principais', price: 28.00, cost: 9.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(28.00, 9.00), options: ADICIONAIS },
  { id: 'pp9', tenantId: 't1', name: 'Omelete', category: 'Pratos Principais', price: 25.00, cost: 7.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-151062780277d-3d98c3479ae7?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(25.00, 7.00), options: ADICIONAIS },
  { id: 'pp10', tenantId: 't1', name: 'Salada Caesar', category: 'Pratos Principais', price: 25.00, cost: 8.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(25.00, 8.00), options: ADICIONAIS },

  // Lanches
  { id: 'l1', tenantId: 't1', name: 'X-burguer', category: 'Lanches', price: 20.00, cost: 8.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(20.00, 8.00), options: ADICIONAIS },
  { id: 'l2', tenantId: 't1', name: 'X-egg', category: 'Lanches', price: 22.00, cost: 9.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1499741496113-cf448f3e6d2a?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(22.00, 9.00), options: ADICIONAIS },
  { id: 'l3', tenantId: 't1', name: 'X-salada', category: 'Lanches', price: 21.00, cost: 8.50, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(21.00, 8.50), options: ADICIONAIS },
  { id: 'l4', tenantId: 't1', name: 'X-bacon', category: 'Lanches', price: 28.00, cost: 11.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(28.00, 11.00), options: ADICIONAIS },
  { id: 'l5', tenantId: 't1', name: 'X-tudo', category: 'Lanches', price: 31.00, cost: 13.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1582196346644-fd51caa975e1?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(31.00, 13.00), options: ADICIONAIS },
  { id: 'l6', tenantId: 't1', name: 'Misto quente', category: 'Lanches', price: 19.00, cost: 6.00, stock: 50, minStock: 10, unit: 'un', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(19.00, 6.00), options: ADICIONAIS },

  // Batatas Recheadas
  { id: 'br1', tenantId: 't1', name: '3 Queijos', category: 'Batatas Recheadas', price: 30.00, cost: 12.00, stock: 30, minStock: 5, unit: 'un', image: 'https://images.unsplash.com/photo-1593504049359-7b7d425b1593?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 12.00), options: ADICIONAIS },
  { id: 'br2', tenantId: 't1', name: 'Presunto e queijo', category: 'Batatas Recheadas', price: 30.00, cost: 11.00, stock: 30, minStock: 5, unit: 'un', image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 11.00), options: ADICIONAIS },
  { id: 'br3', tenantId: 't1', name: 'Bacon', category: 'Batatas Recheadas', price: 30.00, cost: 12.50, stock: 30, minStock: 5, unit: 'un', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 12.50), options: ADICIONAIS },
  { id: 'br4', tenantId: 't1', name: 'Calabresa', category: 'Batatas Recheadas', price: 30.00, cost: 11.50, stock: 30, minStock: 5, unit: 'un', image: 'https://images.unsplash.com/photo-1593504049359-7b7d425b1593?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 11.50), options: ADICIONAIS },
  { id: 'br5', tenantId: 't1', name: 'Strogonoff de frango', category: 'Batatas Recheadas', price: 30.00, cost: 13.00, stock: 30, minStock: 5, unit: 'un', image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 13.00), options: ADICIONAIS },
  { id: 'br6', tenantId: 't1', name: 'Strogonoff de carne', category: 'Batatas Recheadas', price: 30.00, cost: 14.00, stock: 30, minStock: 5, unit: 'un', image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(30.00, 14.00), options: ADICIONAIS },

  // Pasteis
  { id: 'p1', tenantId: 't1', name: 'Queijo', category: 'Pasteis', price: 10.00, cost: 3.50, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.00, 3.50) },
  { id: 'p2', tenantId: 't1', name: 'Presunto e queijo', category: 'Pasteis', price: 10.00, cost: 4.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.00, 4.00) },
  { id: 'p3', tenantId: 't1', name: 'Pizza', category: 'Pasteis', price: 10.50, cost: 4.20, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.50, 4.20) },
  { id: 'p4', tenantId: 't1', name: 'Frango com queijo', category: 'Pasteis', price: 10.50, cost: 4.50, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.50, 4.50) },
  { id: 'p5', tenantId: 't1', name: 'Frango com catupiry', category: 'Pasteis', price: 10.50, cost: 4.80, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.50, 4.80) },
  { id: 'p6', tenantId: 't1', name: 'Frango', category: 'Pasteis', price: 10.00, cost: 3.80, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.00, 3.80) },
  { id: 'p7', tenantId: 't1', name: 'Carne', category: 'Pasteis', price: 10.00, cost: 4.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.00, 4.00) },
  { id: 'p8', tenantId: 't1', name: 'Carne com queijo', category: 'Pasteis', price: 11.00, cost: 4.80, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(11.00, 4.80) },
  { id: 'p9', tenantId: 't1', name: 'Charutinho (presunto e queijo)', category: 'Pasteis', price: 9.00, cost: 3.00, stock: 100, minStock: 20, unit: 'un', image: 'https://images.unsplash.com/photo-1589187151053-5ec8818e661b?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(9.00, 3.00) },

  // Bebidas
  { id: 'd1', tenantId: 't1', name: 'Refrigerante Lata', category: 'Bebidas', price: 6.00, cost: 2.50, stock: 200, minStock: 48, unit: 'un', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(6.00, 2.50) },
  { id: 'd2', tenantId: 't1', name: 'Refrigerante 1L', category: 'Bebidas', price: 10.00, cost: 4.50, stock: 100, minStock: 24, unit: 'un', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(10.00, 4.50) },
  { id: 'd3', tenantId: 't1', name: 'Refrigerante 2L', category: 'Bebidas', price: 15.00, cost: 7.00, stock: 100, minStock: 24, unit: 'un', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(15.00, 7.00) },
  { id: 'd4', tenantId: 't1', name: 'Suco Natural copo', category: 'Bebidas', price: 5.00, cost: 1.50, stock: 999, minStock: 0, unit: 'un', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(5.00, 1.50) },
  { id: 'd5', tenantId: 't1', name: 'Suco Natural jarra', category: 'Bebidas', price: 9.00, cost: 3.00, stock: 999, minStock: 0, unit: 'un', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(9.00, 3.00) },
  { id: 'd6', tenantId: 't1', name: 'Água sem gás', category: 'Bebidas', price: 3.00, cost: 0.80, stock: 200, minStock: 24, unit: 'un', image: 'https://images.unsplash.com/photo-1560011961-4ab41261de01?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(3.00, 0.80) },
  { id: 'd7', tenantId: 't1', name: 'Água com gás', category: 'Bebidas', price: 3.50, cost: 1.00, stock: 200, minStock: 24, unit: 'un', image: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(3.50, 1.00) },
  { id: 'd8', tenantId: 't1', name: 'Água tônica', category: 'Bebidas', price: 7.00, cost: 3.00, stock: 100, minStock: 12, unit: 'un', image: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(7.00, 3.00) },
  { id: 'd9', tenantId: 't1', name: 'H2O', category: 'Bebidas', price: 7.00, cost: 3.20, stock: 100, minStock: 12, unit: 'un', image: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=500&auto=format&fit=crop&q=60', priceHistory: generateHistory(7.00, 3.20) },
].map(p => ({
  ...p,
  isAvailableDelivery: true,
  isAvailableDineIn: true,
  isAvailableOnline: true,
  isAvailableDigitalMenu: true,
  active: true
}));

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  { id: 'rm1', tenantId: 't1', name: 'Bife Bovino', category: 'Proteínas', currentStock: 50, minStock: 10, unit: 'kg', costPerUnit: 35.00 },
  { id: 'rm2', tenantId: 't1', name: 'Filé de Frango', category: 'Proteínas', currentStock: 40, minStock: 10, unit: 'kg', costPerUnit: 18.00 },
  { id: 'rm3', tenantId: 't1', name: 'Batata In Natura', category: 'Hortifruti', currentStock: 100, minStock: 20, unit: 'kg', costPerUnit: 4.50 },
  { id: 'rm4', tenantId: 't1', name: 'Queijo Muçarela', category: 'Laticínios', currentStock: 20, minStock: 5, unit: 'kg', costPerUnit: 32.00 },
  { id: 'rm5', tenantId: 't1', name: 'Presunto', category: 'Laticínios', currentStock: 15, minStock: 5, unit: 'kg', costPerUnit: 22.00 },
  { id: 'rm6', tenantId: 't1', name: 'Arroz agulhinha', category: 'Grãos', currentStock: 60, minStock: 10, unit: 'kg', costPerUnit: 5.50 },
  { id: 'rm7', tenantId: 't1', name: 'Feijão Carioca', category: 'Grãos', currentStock: 30, minStock: 10, unit: 'kg', costPerUnit: 8.00 },
  { id: 'rm8', tenantId: 't1', name: 'Refrigerante Lata 350ml', category: 'Bebidas', currentStock: 200, minStock: 48, unit: 'un', costPerUnit: 2.50 },
  { id: 'rm9', tenantId: 't1', name: 'Óleo de Soja', category: 'Outros', currentStock: 20, minStock: 5, unit: 'l', costPerUnit: 6.50 },
  { id: 'rm10', tenantId: 't1', name: 'Embalagem Marmitex', category: 'Embalagens', currentStock: 500, minStock: 100, unit: 'un', costPerUnit: 0.45 },
];

export const INITIAL_TABLES: Table[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  tenantId: 't1',
  status: 'available',
  items: [],
  total: 0
}));

export const INITIAL_COUNTER_ORDERS: Table[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1000, // IDs a partir de 1000 para balcão para correta identificação no KDS
  number: i + 1,
  tenantId: 't1',
  status: 'available',
  items: [],
  total: 0
}));

// Added missing createdAt property to Courier initial data
export const INITIAL_COURIERS: Courier[] = [
  { id: 'c1', tenantId: 't1', name: 'João Silva', status: 'available', phone: '(11) 98888-7777', active: true, createdAt: new Date() },
  { id: 'c2', tenantId: 't1', name: 'Marcos Oliveira', status: 'delivering', phone: '(11) 97777-6666', active: true, createdAt: new Date() },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: ['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'delivery_manage', 'inventory_edit', 'finance_view', 'cmv_analysis', 'users_manage'],
  MANAGER: ['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'delivery_manage', 'inventory_edit', 'cmv_analysis'],
  WAITER: ['pos_access', 'tables_manage'],
  CASHIER: ['pos_access', 'delivery_manage'],
  CHEF: ['kds_view', 'inventory_edit'],
  KDS: ['kds_kitchen_only_view'],
  COURIER: ['courier_app_access'],
  OWNER: ['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'delivery_manage', 'inventory_edit', 'finance_view', 'cmv_analysis', 'users_manage', 'digital_menu_manage', 'admin_settings_manage', 'fiscal_manage', 'customers_manage'],
  SAAS_ADMIN: ['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'kds_kitchen_only_view', 'delivery_manage', 'inventory_edit', 'finance_view', 'cmv_analysis', 'users_manage', 'digital_menu_manage', 'admin_settings_manage', 'fiscal_manage', 'customers_manage'],
  CUSTOMER: [],
  STOCK_ANALYST: ['dashboard_view', 'inventory_edit', 'cmv_analysis'],
};

export const INITIAL_USERS: User[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

