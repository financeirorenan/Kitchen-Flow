
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

export type FiscalDocumentStatus = 
  | 'AUTORIZADA'
  | 'CANCELADA'
  | 'REJEITADA'
  | 'PROCESSANDO'
  | 'PENDENTE'
  | 'CONTINGENCIA'
  | 'ERRO';

export interface FiscalDocumentAuditLog {
  id?: string;
  action: 'EMISSAO' | 'REIMPRESSAO' | 'CANCELAMENTO' | 'CONSULTA' | 'INUTILIZACAO';
  timestamp: Date | string;
  userId: string;
  userName: string;
  details: string;
  cStat?: string;
  protocol?: string;
}

export interface FiscalDocumentItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ncm?: string;
  cfop?: string;
  observation?: string;
}

export interface FiscalDocument {
  id: string;
  docId?: string;
  tenantId: string;
  orderId: string;
  orderDisplayId?: string;
  tableNumber?: number | string;
  orderType?: 'table' | 'delivery' | 'takeout' | string;
  nfceNumber: number;
  series: number;
  fiscalKey: string;
  protocol?: string;
  status: FiscalDocumentStatus;
  issuedAt: Date | string;
  authorizedAt?: Date | string;
  environment: 'production' | 'homologation';
  model: '65' | string; // 65 = NFC-e
  cStat?: string;
  xMotivo?: string;
  xml?: string;
  qrCodeUrl?: string;
  
  // Totais e Itens
  items: FiscalDocumentItem[];
  subtotal: number;
  discount: number;
  additionalFee: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  payments?: Array<{
    method: string;
    amount: number;
    customerDocument?: string;
  }>;
  
  // Consumidor
  customerName?: string;
  customerDocument?: string; // CPF ou CNPJ
  customerAddress?: string;
  
  // Emitente
  emitterCnpj: string;
  emitterRazaoSocial: string;
  emitterInscricaoEstadual?: string;
  emitterAddress?: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    codigoMunicipio?: string;
  };
  
  // Cancelamento
  isCanceled?: boolean;
  canceledAt?: Date | string;
  cancelProtocol?: string;
  cancelReason?: string;
  canceledBy?: {
    id: string;
    name: string;
    email: string;
  };
  cancelCStat?: string;
  cancelXMotivo?: string;
  cancelXml?: string;
  
  // Auditoria
  issuedBy?: {
    id: string;
    name: string;
    email: string;
  };
  reprintCount: number;
  lastReprintAt?: Date | string;
  auditHistory?: FiscalDocumentAuditLog[];
  
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface AdminSettings {
  companyName: string;
  category?: string; // Categoria/Vertical no Marketplace (ex: Lanches & Hamburguerias, Pizzarias, etc.)
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
  isStoreForceClosed?: boolean;
  isStoreForceOpen?: boolean;
  businessHours: BusinessHours[];
  fiscal: FiscalSettings;
  printing: {
    paperWidth: '58mm' | '80mm';
    autoPrintOrder: boolean;
    autoPrintMarketplace?: boolean;
    showPreviewModal?: boolean;
    headerText: string;
    footerText: string;
    showLogo: boolean;
    connectionMode?: 'browser' | 'webusb' | 'websocket' | 'spool_file';
    websocketUrl?: string;
    highContrastMode?: boolean;
    fontDensity?: 'normal' | 'high' | 'ultra';
    fontSizeLevel?: 'normal' | 'large' | 'extra_large';
    printerModel?: 'generic' | 'epson' | 'elgin' | 'bematech' | 'daruma' | 'pos58' | 'pos80' | string;
    marginLeftMm?: number;
    marginRightMm?: number;
    marginTopMm?: number;
    marginBottomMm?: number;
    antiClippingGuard?: boolean;
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
  customSlug?: string; // Slug de URL exclusivo do cliente (ex: "hamburgueria-artesanal")
  welcomeMessage: string;
  allowOrdering: boolean;
  showStock: boolean;
  bannerUrl: string;
  logoUrl: string;
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
  planId?: string;
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
  clientNumber?: number; // Número sequencial do cliente (iniciando em 1)
  name: string;
  slug?: string;
  subdomain?: string;
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
  tenantName?: string;
  description?: string;
  pixCode?: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: Date;
}

export interface MarketplacePromotion {
  id: string;
  title: string; 
  active: boolean; 
  bannerUrl?: string;
  participatingTenantIds: string[];
  description?: string;
  type?: 'free_delivery' | 'percentage_discount' | 'fixed_discount' | 'buy_x_get_y' | 'combo_deal' | 'tiered_discount';
  minOrderValue?: number; // Ex: R$ 65,00 para entrega grátis
  discountValue?: number; // Ex: 10 (%) ou 15 (R$)
  couponCode?: string; // Código opcional (ex: FRETE65)
  sponsoredBy?: 'store' | 'nova' | 'split'; // Quem financia o desconto
  splitStoreShare?: number; // Ex: 70 (%) ou R$ 7
  splitNovaShare?: number; // Ex: 30 (%) ou R$ 3
  startDate?: string;
  endDate?: string;
  maxUsageLimit?: number;
  currentUsageCount?: number;
  targetAudience?: 'all' | 'new_customers' | 'recurring_customers' | 'vip_customers' | 'cart_abandoners';
  targetCategory?: string;
  targetProductId?: string;
}

export interface MarketplaceAdSpace {
  id: string;
  name: string;
  placement: 'home_hero' | 'home_secondary' | 'category_top' | 'search_sponsored' | 'store_list_top' | 'checkout_upsell' | 'custom';
  description: string;
  pricingModel: 'monthly' | 'weekly' | 'cpc' | 'cpm' | 'fixed';
  price: number;
  maxSlots: number;
  activeSlots: number;
  active: boolean;
  recommendedFor?: string;
}

export interface MarketplaceAdCampaign {
  id: string;
  title: string;
  tenantId: string;
  tenantName: string;
  spaceId: string;
  spaceName: string;
  placement: string;
  bannerUrl?: string;
  targetUrl?: string;
  status: 'active' | 'scheduled' | 'ended' | 'paused';
  startDate: string;
  endDate: string;
  investmentAmount: number;
  impressions: number;
  clicks: number;
  ordersGenerated: number;
  revenueGenerated: number;
  targetRegion?: string;
  targetCategory?: string;
  createdAt: Date | string;
}

export interface MarketplaceBannerItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  tenantId?: string;
  tenantName?: string;
  position: 'home_hero' | 'home_middle' | 'category_top' | 'search_top';
  priority: number; // 1 a 10
  startDate: string;
  endDate: string;
  pricePaid?: number;
  active: boolean;
  clicks?: number;
  impressions?: number;
}

export interface MarketplaceCoupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  targetAudience: 'all' | 'new_customers' | 'recurring_customers' | 'vip_customers' | 'cart_abandoners';
  specificTenantId?: string;
  specificCategory?: string;
  sponsoredBy: 'store' | 'nova' | 'split';
  splitStoreShare?: number;
  splitNovaShare?: number;
  active: boolean;
}

export interface MarketplaceAlgorithmWeights {
  ratingWeight: number; // 0 a 100
  ordersWeight: number; // 0 a 100
  conversionWeight: number; // 0 a 100
  prepTimeWeight: number; // 0 a 100
  cancelRatePenalty: number; // 0 a 100
  deliveryTimeWeight: number; // 0 a 100
  availabilityWeight: number; // 0 a 100
  promoWeight: number; // 0 a 100
  sponsoredBoost: number; // 0 a 100
  preventLowQualitySponsorship: boolean;
}

export interface MarketplaceOpportunity {
  id: string;
  type: 'growth' | 'ad_upsell' | 'retention' | 'warning' | 'category';
  title: string;
  description: string;
  potentialImpact: string;
  suggestedAction: string;
  actionType: 'create_campaign' | 'create_coupon' | 'contact_store' | 'boost_category' | 'recover_cart';
  actionPayload?: any;
  priority: 'high' | 'medium' | 'low';
}

export interface MarketplaceGoal {
  id: string;
  title: string;
  metric: 'gmv' | 'revenue' | 'orders' | 'active_stores' | 'ad_revenue';
  targetValue: number;
  currentValue: number;
  unit: 'currency' | 'number';
  deadlineMonth: string; // "09/2026"
}

export interface MarketplaceSettings {
  id: string;
  promotions: MarketplacePromotion[];
  serviceFee: number;
  maintenance: {
    active: boolean;
    startAt?: Date;
    endAt?: Date;
    message?: string;
  };
  bannerUrl: string; // Banner global padrão
  announcementText?: string;
  adSpaces?: MarketplaceAdSpace[];
  banners?: MarketplaceBannerItem[];
  adCampaigns?: MarketplaceAdCampaign[];
  coupons?: MarketplaceCoupon[];
  algorithmWeights?: MarketplaceAlgorithmWeights;
  goals?: MarketplaceGoal[];
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

export interface SaasAuditLog {
  id: string;
  userId?: string;
  userName: string;
  action: string;
  tenantId?: string;
  clientName?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: Date | string;
  category?: string;
  severity?: 'info' | 'warning' | 'danger';
}

export interface SaasNotification {
  id: string;
  title: string;
  description: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  timestamp: Date | string;
  read: boolean;
  tenantId?: string;
  tenantName?: string;
  actionUrl?: string;
  actionTab?: string;
  resolved?: boolean;
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
  channel?: 'all' | 'dine_in' | 'takeout_delivery' | 'delivery' | 'takeout';
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
  id?: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  observation?: string;
  seat?: string;
  selectedOptions?: ProductOption[];
  sentToKitchen?: boolean;
  batchNumber?: number;
  isNew?: boolean;
  sentAt?: string;
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
  source?: 'local' | 'partner_app' | 'iFood' | 'whatsapp' | 'marketplace' | 'digital_menu' | 'pos' | 'table' | string;
  paymentStatus?: 'pending' | 'paid';
  paidAt?: Date;
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
  coupon?: string;
  appliedPromotion?: string;
  freeDeliveryApplied?: boolean;
  originalDeliveryFee?: number;
  paymentMethod?: PaymentMethod;
  payments?: OrderPayment[];
  isFiscalIssued?: boolean;
  fiscalKey?: string;
  customerDocument?: string; // CPF/CNPJ for fiscal coupon
  wantsFiscalCoupon?: boolean;
  changeFor?: number;
  isSettled?: boolean;
  isSubTicket?: boolean;
  mergedIntoOrderId?: string;
  updatedAt?: Date;
  completedAt?: Date;
  latitude?: number;
  longitude?: number;
  routePosition?: number;
  courierEarnings?: number;
  dailyNumber?: number;
  version?: number;
  lastEventId?: string;
  currentBatch?: number;
  observations?: string;
  notes?: string;
}

export interface Table {
  id: number | string;
  number: number;
  tenantId: string;
  status: 'available' | 'occupied' | 'billing' | 'cleaning';
  currentOrderId?: string;
  items: OrderItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryFee?: number;
  isDelivery?: boolean;
  customerId?: string;
  partialPayments?: {
    id?: string;
    method: PaymentMethod;
    amount: number;
    timestamp?: Date;
    customerId?: string;
    customerDocument?: string;
    isFiscalIssued?: boolean;
    fiscalKey?: string;
  }[];
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

export interface CommerceCategoryPreset {
  id: string;
  name: string;
  label: string;
  subtitle: string;
  description: string;
  emoji: string;
  iconName: string;
  bg: string;
  color: string;
  aliases: string[];
}

export const COMMERCE_VERTICAL_CATEGORIES: CommerceCategoryPreset[] = [
  {
    id: 'todos',
    name: 'Todos',
    label: 'Todos',
    subtitle: 'Tudo na cidade',
    description: 'Todas as lojas e categorias',
    emoji: '🍽️',
    iconName: 'UtensilsCrossed',
    bg: 'bg-slate-50',
    color: 'text-slate-700',
    aliases: ['todos', 'todas', 'geral', 'tudo']
  },
  {
    id: 'burger',
    name: 'Lanches & Hamburguerias',
    label: 'Lanches & Hamburguerias',
    subtitle: 'Artesanais & smash',
    description: 'Artesanais, smash burgers, lanches e petiscos',
    emoji: '🍔',
    iconName: 'Sandwich',
    bg: 'bg-amber-50',
    color: 'text-amber-500',
    aliases: ['burger', 'lanches', 'lanche', 'hamburguer', 'hamburgueria', 'smash', 'sanduiche', 'sanduiches', 'artesanais']
  },
  {
    id: 'pizza',
    name: 'Pizzarias',
    label: 'Pizzarias',
    subtitle: 'Forno a lenha',
    description: 'Pizzas artesanais, forno a lenha, calzones e bordas recheadas',
    emoji: '🍕',
    iconName: 'Pizza',
    bg: 'bg-rose-50',
    color: 'text-rose-500',
    aliases: ['pizza', 'pizzas', 'pizzaria', 'pizzarias', 'calzone', 'forno a lenha']
  },
  {
    id: 'marmitaria',
    name: 'Marmitarias & Caseira',
    label: 'Marmitarias & Caseira',
    subtitle: 'Comida caseira',
    description: 'Comida caseira, marmitex, pratos executivos e almoço',
    emoji: '🍲',
    iconName: 'ChefHat',
    bg: 'bg-emerald-50',
    color: 'text-emerald-500',
    aliases: ['marmitaria', 'marmitarias', 'marmita', 'marmitas', 'marmitex', 'comida caseira', 'caseira', 'almoco', 'almoço', 'restaurante', 'restaurantes', 'prato executivo', 'prato feito']
  },
  {
    id: 'mercado',
    name: 'Mercados & Hortifruti',
    label: 'Mercados & Hortifruti',
    subtitle: 'Hortifruti & básicos',
    description: 'Supermercados, mercearias, hortifrúti, frutas e produtos básicos',
    emoji: '🛒',
    iconName: 'Store',
    bg: 'bg-green-50',
    color: 'text-green-500',
    aliases: ['mercado', 'mercados', 'supermercado', 'supermercados', 'mercearia', 'mercearias', 'hortifruti', 'hortifrúti', 'basicos', 'frutas', 'verduras']
  },
  {
    id: 'farmacia',
    name: 'Farmácias & Drogaria',
    label: 'Farmácias & Drogaria',
    subtitle: 'Saúde & bem-estar',
    description: 'Medicamentos, cosméticos, drogarias, higiene e saúde',
    emoji: '💊',
    iconName: 'Pill',
    bg: 'bg-teal-50',
    color: 'text-teal-500',
    aliases: ['farmacia', 'farmácia', 'farmacias', 'farmácias', 'drogaria', 'drogarias', 'medicamento', 'medicamentos', 'saude', 'saúde', 'bem-estar']
  },
  {
    id: 'pet',
    name: 'Pet & Agro',
    label: 'Pet & Agro',
    subtitle: 'Rações & cuidados',
    description: 'Rações, pet shops, produtos agropecuários e cuidados animais',
    emoji: '🐾',
    iconName: 'PawPrint',
    bg: 'bg-purple-50',
    color: 'text-purple-500',
    aliases: ['pet', 'pet & agro', 'agro', 'petshop', 'pet shop', 'racao', 'rações', 'racoes', 'veterinaria', 'veterinária', 'animais', 'cuidados']
  },
  {
    id: 'bebidas',
    name: 'Adegas & Bebidas',
    label: 'Adegas & Bebidas',
    subtitle: 'Cervejas trincando',
    description: 'Cervejas trincando, adegas, distribuidoras, vinhos e drinks',
    emoji: '🍷',
    iconName: 'Wine',
    bg: 'bg-cyan-50',
    color: 'text-cyan-500',
    aliases: ['bebidas', 'bebida', 'adega', 'adegas', 'adegas &...', 'distribuidora', 'cerveja', 'cervejas', 'vinho', 'vinhos', 'drinks', 'geladas']
  },
  {
    id: 'doces',
    name: 'Açaí & Doces',
    label: 'Açaí & Doces',
    subtitle: 'Gelados & doces',
    description: 'Açaí, sorvetes, sobremesas, bolos, tortas e doces artesanais',
    emoji: '🍧',
    iconName: 'IceCream',
    bg: 'bg-pink-50',
    color: 'text-pink-500',
    aliases: ['doces', 'doce', 'acai', 'açaí', 'açaí & doces', 'acai & doces', 'sobremesa', 'sobremesas', 'sorvete', 'sorvetes', 'sorveteria', 'gelados', 'bolos', 'confeitaria']
  },
  {
    id: 'pastel',
    name: 'Pastéis & Salgados',
    label: 'Pastéis & Salgados',
    subtitle: 'Fritos na hora',
    description: 'Pastéis fritos na hora, salgados, coxinhas e empanadas',
    emoji: '🥟',
    iconName: 'UtensilsCrossed',
    bg: 'bg-orange-50',
    color: 'text-orange-500',
    aliases: ['pastel', 'pasteis', 'pastéis', 'pastéis &...', 'pastelaria', 'salgados', 'salgado', 'empanadas', 'fritos na hora', 'coxinhas']
  }
];

