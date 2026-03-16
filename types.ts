
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';

export type UserRole = 'ADMIN' | 'MANAGER' | 'WAITER' | 'CASHIER' | 'CHEF';

export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'vale_refeicao' | 'conta_cliente';

export type Permission = 
  | 'dashboard_view' 
  | 'pos_access' 
  | 'tables_manage' 
  | 'kds_view' 
  | 'delivery_manage' 
  | 'inventory_edit' 
  | 'finance_view' 
  | 'cmv_analysis' 
  | 'users_manage'
  | 'digital_menu_manage'
  | 'admin_settings_manage'
  | 'fiscal_manage'
  | 'customers_manage';

export interface Customer {
  id: string;
  name: string;
  document: string; // CPF ou CNPJ
  phone: string;
  email?: string;
  address?: string;
  balance: number; // Saldo devedor (positivo = deve ao restaurante)
  createdAt: Date;
  history: CustomerTransaction[];
}

export interface CustomerTransaction {
  id: string;
  type: 'debit' | 'credit'; // debit = compra (aumenta divida), credit = pagamento (diminui divida)
  amount: number;
  description: string;
  date: Date;
  paymentMethod?: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface FiscalSettings {
  environment: 'homologacao' | 'producao';
  certificateStatus: 'valid' | 'expired' | 'missing';
  certificateExpiry?: string;
  cscId: string;
  cscToken: string;
  nextNfceNumber: number;
  series: number;
  taxRegime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
}

export interface AdminSettings {
  companyName: string;
  cnpj: string;
  address: string;
  phone: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  businessHours: BusinessHours[];
  fiscal: FiscalSettings;
  printing: {
    paperWidth: '58mm' | '80mm';
    autoPrintOrder: boolean;
    headerText: string;
    footerText: string;
    showLogo: boolean;
  };
  apis: {
    googleMapsKey: string;
    whatsappToken: string;
    ifoodWebhook: string;
    integrationActive: boolean;
  };
}

export interface DigitalMenuSettings {
  primaryColor: string;
  restaurantName: string;
  welcomeMessage: string;
  allowOrdering: boolean;
  showStock: boolean;
  bannerUrl: string;
  logoUrl: string;
  categoryImages?: Record<string, string>; // Imagens personalizadas para cada categoria
}

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface Subscription {
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  startDate: Date;
  expiryDate: Date;
  allowedModules: Permission[];
}

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  subscription: Subscription;
  createdAt: Date;
  active: boolean;
}

export interface User {
  id: string;
  tenantId?: string; // ID do cliente SaaS
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
  status: 'online' | 'offline';
  lastAccess?: Date;
  observations?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  description: string;
  timestamp: Date;
}

export interface PriceHistory {
  date: string;
  price: number;
  cost: number;
}

export interface RawMaterial {
  id: string;
  name: string;
  unit: string; // kg, g, l, ml, un, etc.
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  lastPurchaseDate?: Date;
  category: string;
}

export interface CashSession {
  isOpen: boolean;
  openingValue: number;
  openedAt: Date | null;
}

export interface CashClosingReport {
  id: string;
  openedAt: Date;
  closedAt: Date;
  openingValue: number;
  expectedValue: number; // Sum of sales + opening
  actualValue: number;   // What the user counted
  difference: number;
  salesByMethod: Record<PaymentMethod, number>;
  totalSales: number;
  closedBy: string; // User ID or Name
  observations?: string;
}

export interface TechnicalSheetItem {
  rawMaterialId: string;
  quantity: number; // Quantidade usada na unidade do insumo (ex: 0.2 para 200g se a unidade for kg)
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number; // Custo manual/registrado
  stock: number;
  barcode?: string;
  image?: string;
  priceHistory?: PriceHistory[];
  isPromotional?: boolean;
  promoPrice?: number;
  displayOrder?: number;
  technicalSheet?: TechnicalSheetItem[]; // Lista de insumos e quantidades
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  observation?: string;
  seat?: string;
}

export interface Order {
  id: string;
  tableNumber?: number;
  type: 'table' | 'delivery' | 'takeout';
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  deliveryFee?: number;
  createdAt: Date;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  courierId?: string;
  customerId?: string; // Link para conta fiado
  paymentMethod?: PaymentMethod;
  isFiscalIssued?: boolean;
  fiscalKey?: string;
  customerDocument?: string; // CPF/CNPJ for fiscal coupon
  wantsFiscalCoupon?: boolean;
  changeFor?: number;
}

export interface Table {
  id: number;
  status: 'available' | 'occupied' | 'billing' | 'cleaning';
  currentOrderId?: string;
  items: OrderItem[];
  total: number;
}

export interface Courier {
  id: string;
  name: string;
  status: 'available' | 'delivering' | 'offline';
  phone: string;
  pixKey?: string;
  dailyFee?: number;
  vehicleType?: 'bike' | 'moto' | 'car';
  createdAt: Date;
}

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  status?: 'pending' | 'paid'; // Controle de compromissos futuros
}
