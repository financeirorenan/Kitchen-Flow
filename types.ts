
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled' | 'finished';

export type UserRole = 'ADMIN' | 'MANAGER' | 'WAITER' | 'CASHIER' | 'CHEF' | 'KDS' | 'SAAS_ADMIN' | 'COURIER' | 'CUSTOMER' | 'OWNER' | 'STOCK_ANALYST';

export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'vale_refeicao' | 'conta_cliente' | string;

export interface CardOperator {
  id: string;
  name: string;
  active: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'cash' | 'credit' | 'debit' | 'pix' | 'voucher' | 'account' | 'other';
  feePercentage: number;
  fixedFee?: number;
  active: boolean;
  operatorId?: string;
}

export type Permission = 
  | 'dashboard_view' 
  | 'pos_access' 
  | 'tables_manage' 
  | 'kds_view' 
  | 'kds_kitchen_only_view' 
  | 'delivery_manage' 
  | 'inventory_edit' 
  | 'finance_view' 
  | 'cmv_analysis' 
  | 'users_manage'
  | 'digital_menu_manage'
  | 'marketplace_manage'
  | 'admin_settings_manage'
  | 'fiscal_manage'
  | 'customers_manage'
  | 'tenants_manage'
  | 'leads_manage'
  | 'support_manage'
  | 'marketplace_config'
  | 'saas_finance_view'
  | 'saas_plans_manage'
  | 'saas_team_manage'
  | 'saas_suppliers_manage'
  | 'saas_dashboard_view'
  | 'courier_app_access';

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  document: string; // CPF ou CNPJ
  phone: string;
  email?: string;
  address?: string;
  addresses?: string[]; // Lista de endereços para entrega
  balance: number; // Saldo devedor (positivo = deve ao restaurante)
  source?: string;
  externalId?: string;
  crmStatus?: 'lead' | 'active' | 'vip' | 'blocked';
  tags?: string[];
  createdAt: Date;
  history: CustomerTransaction[];
}

export interface CustomerTransaction {
  id: string;
  type: 'debit' | 'credit'; // debit = compra (aumenta divida), credit = pagamento (diminui divida)
  amount: number;
  description: string;
  date: Date;
  expectedPaymentDate?: Date; // Previsão de pagamento para fiado
  paymentMethod?: string;
  items?: { name: string; quantity: number; price?: number }[];
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
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  autoIssueNfce?: boolean;
  address: {
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    codigoMunicipio: string;
  };
}

export interface AdminSettings {
  companyName: string;
  cnpj: string;
  cep?: string;
  address: string;
  phone: string;
  deliveryFee: number;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  minOrderValue?: number;
  estimatedDeliveryTime?: string; // e.g., "30-50 min"
  estimatedPickupTime?: string;   // e.g., "15-20 min"
  autoAcceptOrders?: boolean;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  primaryColor?: string;
  accentColor?: string;
  businessHours: BusinessHours[];
  fiscal: FiscalSettings;
  printing: {
    paperWidth: '58mm' | '80mm';
    autoPrintOrder: boolean;
    headerText: string;
    footerText: string;
    showLogo: boolean;
    connectionMode?: 'browser' | 'webusb' | 'websocket' | 'spool_file';
    websocketUrl?: string;
  };
  apis: {
    googleMapsKey: string;
    whatsappToken: string;
    ifoodWebhook: string;
    integrationActive: boolean;
  };
  paymentMethods: PaymentMethodConfig[];
  operators?: CardOperator[];
  saasIntegration: {
    isCustomerAppEnabled: boolean;
    appFeePerOrder: number; // R$ 1,50 por pedido
    lastMenuSync?: Date;
    billingAccumulated: number; // Valor total acumulado em taxas do app
  };
  lgpdSettings?: {
    maskSensitiveData?: boolean;
    cookieBannerEnabled?: boolean;
    dpoName?: string;
    dpoEmail?: string;
    consentText?: string;
  };
}

export interface DigitalMenuSettings {
  primaryColor: string;
  accentColor?: string; // Cor de destaque (ex: amarelo)
  fontFamily?: 'sans' | 'serif' | 'mono';
  restaurantName: string;
  welcomeMessage: string;
  allowOrdering: boolean;
  showStock: boolean;
  bannerUrl: string;
  logoUrl: string;
  slug?: string; // Slug de URL personalizado para o cardápio digital (ex: vivalafome)
  categoryImages?: Record<string, string>; // Imagens personalizadas para cada categoria
  categoryOrder?: string[]; // Ordem personalizada das categorias
  hiddenCategories?: string[]; // Categorias ocultas no cardápio digital
  hiddenRawCategories?: string[]; // Categorias de insumos ocultas
  dailyPromo?: {
    title: string;
    subtitle: string;
    price: number;
    originalPrice: number;
    imageUrl?: string;
    active: boolean;
  };
  totemUpsellMode?: 'auto' | 'manual';
  totemUpsellProducts?: string[]; // Lista de IDs de produtos selecionados manualmente para upsell
}

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface Subscription {
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  startDate: Date;
  expiryDate: Date;
  allowedModules: Permission[];
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  modules: Permission[];
  maxUsers: number;
  maxOrders: number;
  billingCycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  active: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  planId: string;
  subscription: Subscription;
  createdAt: Date;
  active: boolean;
  logoUrl?: string; // URL do logo para o Marketplace
  bannerUrl?: string; // Banner para o Marketplace
  category?: string; // Categoria (Lanches, Pizza, etc.)
  description?: string; // Breve descrição
  customModules?: Permission[]; // Módulos específicos habilitados para este cliente (sobrescreve o plano)
  autoAcceptOrders?: boolean;
  cnpj?: string;
  address?: string;
  phone?: string;
}

export interface MarketplaceInvoice {
  id: string;
  tenantId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: Date;
}

export interface MarketplaceSettings {
  id: string;
  promotions: { 
    id: string;
    title: string; 
    active: boolean; 
    bannerUrl?: string;
    participatingTenantIds: string[];
    description?: string;
  }[];
  serviceFee: number;
  maintenance: {
    active: boolean;
    startAt?: Date;
    endAt?: Date;
    message?: string;
  };
  bannerUrl: string; // Banner global padrão
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId?: string; // ID do cliente SaaS
  password?: string; // Senha para login sincronizado dos funcionários
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
  photoURL?: string;
  phone?: string;
  document?: string;
  cnh?: string;
  vehiclePlate?: string;
  vehicleType?: 'moto' | 'bike' | 'car';
  address?: string;
  status: 'online' | 'offline';
  active: boolean;
  presets?: UserPreset[];
  lastAccess?: Date;
  observations?: string;
  createdAt: Date;
  
  // Dados de Folha e Contratos (Toast style)
  contractType?: 'CLT' | 'PJ' | 'Diarista' | 'Horista';
  baseSalary?: number;
  commissionRate?: number; // % comissão sobre vendas, ex: 5%
  hourlyRate?: number;
  dailyRate?: number;
  benefits?: number; // VT, VR, plano de saúde, etc.
  discounts?: number; // Adiantamentos, faltas, etc.
  bankInfo?: string; // Dados bancários ou chave Pix
  workingHoursSimulated?: number; // horas no mês
  workingDaysSimulated?: number; // diárias no mês
}

export interface UserPreset {
  id: string;
  name: string;
  settings: any;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  description: string;
  timestamp: Date;
  level?: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM';
  details?: string;
  stackTrace?: string;
}

export interface PriceHistory {
  date: string;
  price: number;
  cost: number;
}

export interface RawMaterial {
  id: string;
  tenantId: string;
  name: string;
  unit: string; // kg, g, l, ml, un, etc.
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  lastPurchaseDate?: Date;
  category: string;
  priceHistory?: PriceHistory[];
}

export interface CashSession {
  isOpen: boolean;
  openingValue: number;
  openedAt: Date | null;
}

export interface CashClosingReport {
  id: string;
  tenantId: string;
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
  unit?: string;
}

export interface ProductOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailableDelivery?: boolean;
  isAvailableDineIn?: boolean;
  isAvailableOnline?: boolean;
  isAvailableDigitalMenu?: boolean;
  active?: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  barcode?: string;
  trackStock?: boolean;
  image?: string;
  priceHistory?: PriceHistory[];
  isPromotional?: boolean;
  promoPrice?: number;
  displayOrder?: number;
  externalId?: string;
  source?: string;
  technicalSheet?: TechnicalSheetItem[]; // Lista de insumos e quantidades
  options?: ProductOption[];
  optionCategories?: {
    id: string;
    name: string;
    min: number;
    max: number;
    options: ProductOption[];
  }[];
  requiredOptionCategories?: string[]; // Categorias que precisam de pelo menos uma seleção
  isAvailableDelivery?: boolean;
  isAvailableDineIn?: boolean;
  isAvailableOnline?: boolean;
  isAvailableDigitalMenu?: boolean;
  active?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  observation?: string;
  seat?: string;
  selectedOptions?: ProductOption[];
  sentToKitchen?: boolean;
}

export interface OrderPayment {
  method: PaymentMethod;
  amount: number;
  timestamp: Date;
  customerId?: string;
  isFiscalIssued?: boolean;
  fiscalKey?: string;
  customerDocument?: string;
}

export interface Order {
  id: string;
  docId?: string;
  tenantId: string;
  tableNumber?: number | string;
  type: 'table' | 'delivery' | 'takeout';
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  deliveryFee?: number;
  createdAt: Date;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryMethod?: string;
  courierId?: string;
  customerId?: string; // Link para conta fiado
  source?: 'local' | 'partner_app' | 'iFood' | 'whatsapp' | 'marketplace';
  marketplaceFee?: number;
  acceptedAt?: Date;
  readyAt?: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  finishedAt?: Date;
  externalId?: string; // ID do pedido no sistema parceiro
  syncStatus?: 'synced' | 'pending' | 'error';
  metadata?: Record<string, any>; // Dados extras da integracao
  additionalFee?: number;
  additionalFeeReason?: string;
  discount?: number;
  paymentMethod?: PaymentMethod;
  payments?: OrderPayment[];
  isFiscalIssued?: boolean;
  fiscalKey?: string;
  customerDocument?: string; // CPF/CNPJ for fiscal coupon
  wantsFiscalCoupon?: boolean;
  changeFor?: number;
  isSettled?: boolean;
  updatedAt?: Date;
  completedAt?: Date;
  latitude?: number;
  longitude?: number;
  routePosition?: number;
  courierEarnings?: number;
  dailyNumber?: number;
}

export interface Table {
  id: number | string;
  number: number;
  tenantId: string;
  status: 'available' | 'occupied' | 'billing' | 'cleaning';
  currentOrderId?: string;
  items: OrderItem[];
  total: number;
}

export interface Courier {
  id: string;
  tenantId: string;
  name: string;
  status: 'available' | 'delivering' | 'offline';
  phone: string;
  email?: string;
  photoURL?: string;
  document?: string; // CPF
  cnh?: string;
  vehiclePlate?: string;
  vehicleType?: 'bike' | 'moto' | 'car';
  address?: string;
  pixKey?: string;
  dailyFee?: number;
  earningsPerDelivery?: number;
  lastDailyFeeDate?: Date;
  earnings?: number;
  cashHeld?: number;
  currentLatitude?: number;
  currentLongitude?: number;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  name: string;
  bankName: string;
  initialBalance: number;
  currentBalance: number;
  createdAt: Date;
}

export interface FinancialRecord {
  id: string;
  tenantId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  dueDate?: Date; // Data de vencimento
  status?: 'pending' | 'paid'; // Controle de compromissos futuros
  paymentMethod?: string; // Forma de pagamento vinculada
  feeAmount?: number; // Valor das taxas descontadas
  shiftOpenedAt?: Date;
  isRecurring?: boolean;
  installments?: number;
  currentInstallment?: number;
  recurringId?: string;
  orderId?: string;
}
