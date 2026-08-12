// Motor Tributário CBS/IBS com Split Payment - KitchenFlow AI (Reforma Tributária Brasileira)
// Arquitetura Orientada a Regras (Rule Engine) com Versionamento e Auditabilidade Imutável

export type TaxRegime = 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'cbs_ibs_geral';
export type TaxCategory = 'standard' | 'basic_food_basket' | 'differentiated' | 'exempt';
export type ProductFiscalType = 'food' | 'alcoholic_beverage' | 'non_alcoholic_beverage' | 'dessert' | 'packaging' | 'service' | 'other';
export type SplitPaymentStatus = 'pending' | 'processed_retained' | 'reconciled';

export interface TaxRuleVersion {
  id: string;
  version: number;
  effectiveDate: string; // YYYY-MM-DD
  expirationDate?: string; // YYYY-MM-DD
  cbsRate: number; // e.g. 8.8%
  ibsStateRate: number; // e.g. 17.7%
  ibsCityRate: number; // e.g. 1.2%
  foodSegmentReductionPct: number; // e.g. 60.0% (redução legal para serviços de alimentação e cesta básica)
  basicBasketReductionPct: number; // e.g. 100.0% (isenção/alíquota zero para itens de cesta básica)
  updatedBy: string;
  updatedAt: string;
  reason: string;
  isActive: boolean;
}

export interface ProductTaxClassification {
  productId: string;
  ncm: string;
  cest?: string;
  productType: ProductFiscalType;
  taxCategory: TaxCategory;
  taxRegime: TaxRegime;
  baseReductionPct: number; // Ex: 60% para refeição/restaurante
  specificTaxation?: string; // Ex: Monofásico, ST, Isento
  taxBenefit?: string; // Ex: Regime Diferenciado de Bares/Restaurantes
  creditAllowed: boolean;
  effectiveDate: string;
  expirationDate?: string;
  status: 'valid' | 'missing_ncm' | 'invalid_ncm' | 'pending_review';
}

export interface ItemTaxCalculation {
  productId: string;
  productName: string;
  ncm: string;
  quantity: number;
  unitPrice: number;
  grossTotal: number;
  taxCategory: TaxCategory;
  baseReductionPct: number;
  taxableBase: number;
  cbsRate: number;
  cbsValue: number;
  ibsStateRate: number;
  ibsStateValue: number;
  ibsCityRate: number;
  ibsCityValue: number;
  totalIbsValue: number;
  totalTaxes: number;
  netItemAmount: number;
}

export interface SplitPaymentDetail {
  grossAmount: number;
  retainedCbs: number;
  retainedIbsState: number;
  retainedIbsCity: number;
  retainedIbsTotal: number;
  totalRetainedByGov: number;
  netCreditedToRestaurant: number;
  status: SplitPaymentStatus;
  liquidationDate?: string;
  transactionCode: string;
  paymentMethod: string;
  acquirerFee: number;
  marketplaceFee: number;
}

export interface OrderTaxAuditMemory {
  id: string;
  orderId: string;
  ruleVersion: number;
  calculatedAt: string;
  operatorId?: string;
  operatorName?: string;
  customerDoc?: string;
  nfceNumber?: number;
  nfceKey?: string;
  grossAmount: number;
  totalCbs: number;
  totalIbsState: number;
  totalIbsCity: number;
  totalIbs: number;
  totalTaxes: number;
  taxPercentageOfGross: number;
  netEstablishmentAmount: number;
  itemsCalculations: ItemTaxCalculation[];
  splitPayment: SplitPaymentDetail;
  isImmutable: true;
}

// Histórico Padrão Inicial de Regras Tributárias (Versionado)
export const DEFAULT_TAX_RULES: TaxRuleVersion[] = [
  {
    id: 'rule_v1_2026',
    version: 1,
    effectiveDate: '2026-01-01',
    cbsRate: 8.8,
    ibsStateRate: 17.7,
    ibsCityRate: 1.2,
    foodSegmentReductionPct: 60.0, // 60% de redução para bares e restaurantes (Lei Complementar Reforma Tributária)
    basicBasketReductionPct: 100.0,
    updatedBy: 'SISTEMA_KITCHENFLOW',
    updatedAt: new Date().toISOString(),
    reason: 'Parametrização Inicial da Reforma Tributária (CBS/IBS)',
    isActive: true
  }
];

// Dicionário de Validação de NCMs Comuns na Gastronomia
export const COMMON_FOOD_NCMS: Record<string, { description: string; defaultType: ProductFiscalType; defaultCategory: TaxCategory }> = {
  '2106.90.90': { description: 'Preparações alimentícias diversas (Pratos feitos, Porções, Lanches)', defaultType: 'food', defaultCategory: 'differentiated' },
  '1905.90.90': { description: 'Produtos de padaria, pastelaria e biscoitos (Pães, Pizzas, Salgados)', defaultType: 'food', defaultCategory: 'differentiated' },
  '2202.10.00': { description: 'Águas e Refrigerantes adicionados de açúcar ou aromatizados', defaultType: 'non_alcoholic_beverage', defaultCategory: 'standard' },
  '2203.00.00': { description: 'Cervejas de malte', defaultType: 'alcoholic_beverage', defaultCategory: 'standard' },
  '2204.21.00': { description: 'Vinhos de uvas frescas em recipientes de até 2 litros', defaultType: 'alcoholic_beverage', defaultCategory: 'standard' },
  '2009.89.90': { description: 'Sucos de frutas ou de produtos hortícolas', defaultType: 'non_alcoholic_beverage', defaultCategory: 'differentiated' },
  '1806.90.00': { description: 'Chocolates e preparações alimentícias contendo cacau (Sobremesas)', defaultType: 'dessert', defaultCategory: 'standard' },
  '3923.10.90': { description: 'Caixas, sacos, bolsas e recipientes de plástico (Embalagens)', defaultType: 'packaging', defaultCategory: 'standard' },
  '4819.10.00': { description: 'Caixas de papel ou cartão ondulado (Embalagens Pizza/Marmita)', defaultType: 'packaging', defaultCategory: 'standard' },
};

export class TaxEngine {
  private rulesHistory: TaxRuleVersion[];

  constructor(customRules?: TaxRuleVersion[]) {
    this.rulesHistory = customRules && customRules.length > 0 ? customRules : DEFAULT_TAX_RULES;
  }

  // Obter a regra tributária vigente para uma determinada data
  public getRuleForDate(dateString: string = new Date().toISOString()): TaxRuleVersion {
    const targetDate = new Date(dateString).getTime();
    
    // Filtrar regras com data de início menor ou igual à data do pedido
    const applicableRules = this.rulesHistory
      .filter(r => new Date(r.effectiveDate).getTime() <= targetDate)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    if (applicableRules.length > 0) {
      return applicableRules[0];
    }

    // Fallback para a regra ativa mais recente
    return this.rulesHistory.find(r => r.isActive) || DEFAULT_TAX_RULES[0];
  }

  // Validador de NCM
  public validateNcm(ncm?: string): { isValid: boolean; description?: string; status: 'valid' | 'missing_ncm' | 'invalid_ncm' } {
    if (!ncm || ncm.trim() === '') {
      return { isValid: false, status: 'missing_ncm', description: 'NCM não preenchido' };
    }
    const cleanNcm = ncm.trim().replace(/\D/g, '');
    if (cleanNcm.length !== 8) {
      return { isValid: false, status: 'invalid_ncm', description: 'NCM deve conter 8 dígitos' };
    }
    const formattedNcm = `${cleanNcm.substring(0,4)}.${cleanNcm.substring(4,6)}.${cleanNcm.substring(6,8)}`;
    const knownInfo = COMMON_FOOD_NCMS[formattedNcm] || COMMON_FOOD_NCMS[ncm];
    return {
      isValid: true,
      status: 'valid',
      description: knownInfo ? knownInfo.description : 'NCM Válido'
    };
  }

  // Calcular impostos CBS/IBS de um item individual
  public calculateItemTax(
    item: { productId: string; name: string; quantity: number; unitPrice: number; ncm?: string; taxClassification?: Partial<ProductTaxClassification> },
    rule: TaxRuleVersion
  ): ItemTaxCalculation {
    const qty = Math.max(1, item.quantity || 1);
    const price = Math.max(0, item.unitPrice || 0);
    const grossTotal = qty * price;

    const classification = item.taxClassification || {};
    const category: TaxCategory = classification.taxCategory || 'differentiated';
    const pType: ProductFiscalType = classification.productType || 'food';

    // Determinar alíquotas e redução da base de cálculo
    let baseReduction = classification.baseReductionPct !== undefined 
      ? classification.baseReductionPct 
      : (pType === 'food' || category === 'differentiated' ? rule.foodSegmentReductionPct : 0);

    if (category === 'basic_food_basket' || category === 'exempt') {
      baseReduction = 100; // Isenção total / Cesta básica
    }

    // Base tributável líquida após redução legal
    const taxableBase = grossTotal * (1 - baseReduction / 100);

    // Alíquotas nominais da regra vigente
    const cbsRate = category === 'exempt' ? 0 : rule.cbsRate;
    const ibsStateRate = category === 'exempt' ? 0 : rule.ibsStateRate;
    const ibsCityRate = category === 'exempt' ? 0 : rule.ibsCityRate;

    const cbsValue = taxableBase * (cbsRate / 100);
    const ibsStateValue = taxableBase * (ibsStateRate / 100);
    const ibsCityValue = taxableBase * (ibsCityRate / 100);
    const totalIbsValue = ibsStateValue + ibsCityValue;
    const totalTaxes = cbsValue + totalIbsValue;
    const netItemAmount = grossTotal - totalTaxes;

    return {
      productId: item.productId,
      productName: item.name,
      ncm: item.ncm || '2106.90.90',
      quantity: qty,
      unitPrice: price,
      grossTotal,
      taxCategory: category,
      baseReductionPct: baseReduction,
      taxableBase,
      cbsRate,
      cbsValue,
      ibsStateRate,
      ibsStateValue,
      ibsCityRate,
      ibsCityValue,
      totalIbsValue,
      totalTaxes,
      netItemAmount
    };
  }

  // Executar Cálculo Completo de Pedido & Gerar Memória de Auditoria Imutável
  public processOrderTaxAndSplit(
    order: {
      id: string;
      total: number;
      items: any[];
      createdAt?: string;
      paymentMethod?: string;
      operatorId?: string;
      operatorName?: string;
      customerDoc?: string;
      nfceNumber?: number;
      nfceKey?: string;
      acquirerFeeVal?: number;
      marketplaceFeeVal?: number;
    },
    ruleOverride?: TaxRuleVersion
  ): OrderTaxAuditMemory {
    const orderDate = order.createdAt || new Date().toISOString();
    const rule = ruleOverride || this.getRuleForDate(orderDate);

    // Mapear e calcular cada item
    const itemsCalculations: ItemTaxCalculation[] = (order.items || []).map(item => {
      return this.calculateItemTax(
        {
          productId: item.id || item.productId || 'p_unknown',
          name: item.name || item.productName || 'Produto sem nome',
          quantity: item.quantity || 1,
          unitPrice: item.price || item.unitPrice || 0,
          ncm: item.ncm,
          taxClassification: item.taxClassification
        },
        rule
      );
    });

    // Totais Consolidados
    let grossAmount = itemsCalculations.reduce((acc, curr) => acc + curr.grossTotal, 0);
    if (grossAmount === 0 && order.total > 0) {
      grossAmount = order.total; // Fallback caso itens estejam vazios
    }

    const totalCbs = itemsCalculations.reduce((acc, curr) => acc + curr.cbsValue, 0);
    const totalIbsState = itemsCalculations.reduce((acc, curr) => acc + curr.ibsStateValue, 0);
    const totalIbsCity = itemsCalculations.reduce((acc, curr) => acc + curr.ibsCityValue, 0);
    const totalIbs = totalIbsState + totalIbsCity;
    const totalTaxes = totalCbs + totalIbs;
    const taxPercentageOfGross = grossAmount > 0 ? (totalTaxes / grossAmount) * 100 : 0;
    const netEstablishmentAmount = grossAmount - totalTaxes;

    // Cálculo do Split Payment
    const acquirerFee = order.acquirerFeeVal || 0;
    const marketplaceFee = order.marketplaceFeeVal || 0;
    const retainedByGov = totalTaxes;
    const netCreditedToRestaurant = Math.max(0, grossAmount - retainedByGov - acquirerFee - marketplaceFee);

    const transactionCode = `SPLIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const splitPayment: SplitPaymentDetail = {
      grossAmount,
      retainedCbs: totalCbs,
      retainedIbsState: totalIbsState,
      retainedIbsCity: totalIbsCity,
      retainedIbsTotal: totalIbs,
      totalRetainedByGov: retainedByGov,
      netCreditedToRestaurant,
      status: 'processed_retained',
      liquidationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D+1
      transactionCode,
      paymentMethod: order.paymentMethod || 'Cartão de Crédito / PIX',
      acquirerFee,
      marketplaceFee
    };

    return {
      id: `tax_audit_${order.id || Date.now()}`,
      orderId: order.id,
      ruleVersion: rule.version,
      calculatedAt: new Date().toISOString(),
      operatorId: order.operatorId || 'OP-SISTEMA',
      operatorName: order.operatorName || 'Caixa Central',
      customerDoc: order.customerDoc,
      nfceNumber: order.nfceNumber,
      nfceKey: order.nfceKey,
      grossAmount,
      totalCbs,
      totalIbsState,
      totalIbsCity,
      totalIbs,
      totalTaxes,
      taxPercentageOfGross,
      netEstablishmentAmount,
      itemsCalculations,
      splitPayment,
      isImmutable: true
    };
  }
}

export const defaultTaxEngine = new TaxEngine();
