export type SupplierType = 
  | 'distribuidor'
  | 'atacadista'
  | 'produtor'
  | 'frigorifico'
  | 'hortifruti'
  | 'bebidas'
  | 'embalagens'
  | 'limpeza'
  | 'equipamentos'
  | 'insumos'
  | 'servicos'
  | 'outro';

export type SupplierStatus = 'active' | 'inactive' | 'pending';

export type FreightType = 'CIF' | 'FOB' | 'FREE_ABOVE_MIN' | 'VARIABLE';

export type ProductAvailability = 'available' | 'on_demand' | 'out_of_stock';

export type QuotationStatus = 'draft' | 'open' | 'responses_received' | 'awarded' | 'converted_to_po' | 'cancelled';

export type PurchaseOrderStatus = 
  | 'quotation' 
  | 'awaiting_approval' 
  | 'order_placed' 
  | 'in_transit' 
  | 'received' 
  | 'cancelled';

export interface RegionalPrice {
  region: string; // e.g. "Ribeirão Preto", "São Paulo", "Sertãozinho", "Pradópolis"
  price: number;
}

export interface SupplierProductItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  unit: string; // KG, UN, LT, CX, FD, PACOTE, LATA, etc.
  price: number;
  regionalPrices?: RegionalPrice[];
  lastUpdated: string; // ISO date string or formatted DD/MM/YYYY
  previousPrice?: number;
  variationPercentage?: number;
  availability: ProductAvailability;
  minOrderQty?: number;
}

export interface PriceHistoryEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  unit: string;
  price: number;
  region?: string;
  date: string;
  time: string;
  source: 'manual' | 'quotation' | 'integration' | 'order' | 'import';
  userResponsible: string;
  notes?: string;
}

export interface B2BSupplier {
  id: string;
  // Dados Básicos
  corporateName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  cnpj: string;
  category: string;
  supplierType: SupplierType;
  status: SupplierStatus;
  
  // Contato
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  contactPerson?: string;

  // Endereço
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;

  // Região de Atendimento
  servedCities: string[];
  servedRegions: string[];
  maxDeliveryDistanceKm?: number;
  deliversToRestaurant: boolean;

  // Comercial
  minOrderValue: number; // R$
  avgDeliveryDays: number;
  deliveryDays: string[]; // e.g. ["Segunda", "Quarta", "Sexta"]
  paymentMethods: string[]; // e.g. ["Boleto Faturado", "Pix", "Cartão de Crédito"]
  paymentTerms: string; // e.g. "28 dias", "À vista", "15/30 dias"
  freightType: FreightType;
  deliveryFee: number;
  notes?: string;

  // Produtos & Histórico
  products: SupplierProductItem[];
  history: Record<string, { date: string; price: number }[]>; // productName -> history points

  // Metadados
  rating?: number;
  isPartner?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface B2BCentralProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  averageMarketPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  isCustom?: boolean;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  type: 'price_increase' | 'price_decrease' | 'cheaper_alternative';
  percentageChange?: number;
  diffAmount?: number;
  message: string;
  alternativeSupplierName?: string;
  alternativePrice?: number;
  date: string;
  severity: 'warning' | 'info' | 'success';
  read: boolean;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  targetPrice?: number;
  notes?: string;
}

export interface QuotationSupplierResponse {
  supplierId: string;
  supplierName: string;
  status: 'pending' | 'quoted' | 'declined';
  items: {
    productId: string;
    unitPrice: number;
    available: boolean;
    leadTimeDays?: number;
    notes?: string;
  }[];
  freight: number;
  minOrderMet: boolean;
  paymentTerms: string;
  validityUntil: string;
  totalQuotation: number;
  notes?: string;
  respondedAt?: string;
}

export interface B2BQuotation {
  id: string;
  quotationNumber: string;
  restaurantTenantId: string;
  restaurantName: string;
  title: string;
  status: QuotationStatus;
  items: QuotationItem[];
  invitedSuppliers: QuotationSupplierResponse[];
  createdAt: string;
  deadline: string;
  selectedSupplierId?: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface B2BPurchaseOrder {
  id: string;
  orderNumber: string;
  quotationId?: string;
  restaurantTenantId: string;
  restaurantName: string;
  supplierId: string;
  supplierName: string;
  supplierCity: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  freight: number;
  discount: number;
  total: number;
  deliveryDays: number;
  estimatedDeliveryDate: string;
  paymentMethod: string;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
  receivedAt?: string;
  sentToAccountsPayable?: boolean;
  sentToInventory?: boolean;
  launchedCostValue?: number;
}

export interface NegotiatedPrice {
  productId: string;
  productName: string;
  unit: string;
  regularPrice: number;
  negotiatedPrice: number;
  discountPercentage: number;
  validUntil: string;
  notes?: string;
}

export interface RestaurantSupplierRelationship {
  id: string;
  restaurantTenantId: string;
  supplierId: string;
  supplierName: string;
  isFavorite: boolean;
  isUsed: boolean;
  negotiatedPrices: NegotiatedPrice[];
  commercialAgreementNotes?: string;
  lastPurchaseDate?: string;
  totalPurchasedValue: number;
  ordersCount: number;
}
