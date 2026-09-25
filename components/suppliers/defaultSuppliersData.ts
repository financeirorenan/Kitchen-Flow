import { 
  B2BSupplier, 
  B2BCentralProduct, 
  PriceAlert, 
  B2BQuotation, 
  B2BPurchaseOrder, 
  RestaurantSupplierRelationship,
  PriceHistoryEntry
} from './types';

export const SUPPLIER_CATEGORIES = [
  'Carnes',
  'Frangos',
  'Peixes',
  'Frios',
  'Laticínios',
  'Hortifruti',
  'Bebidas',
  'Mercearia',
  'Massas',
  'Congelados',
  'Embalagens',
  'Produtos de limpeza',
  'Descartáveis',
  'Equipamentos',
  'Gás',
  'Panificação',
  'Outros'
] as const;

export const DEFAULT_CENTRAL_PRODUCTS: B2BCentralProduct[] = [
  {
    id: 'prod-bife-bovino',
    name: 'Bife Bovino (Alcatra/Contra-filé)',
    category: 'Carnes',
    unit: 'KG',
    description: 'Corte bovino limpo em bifes padronizados de 150g a 200g, resfriado a vácuo.',
    averageMarketPrice: 33.15,
    minPrice: 31.80,
    maxPrice: 34.50,
    tags: ['carne vermelha', 'churrasco', 'prato executivo']
  },
  {
    id: 'prod-file-frango',
    name: 'Filé de Peito de Frango',
    category: 'Frangos',
    unit: 'KG',
    description: 'Peito de frango desossado e sem pele, congelado individualmente (IQF).',
    averageMarketPrice: 16.90,
    minPrice: 16.20,
    maxPrice: 17.50,
    tags: ['aves', 'grelhados', 'empanados']
  },
  {
    id: 'prod-queijo-mucarela',
    name: 'Queijo Muçarela Peça/Fatiado',
    category: 'Laticínios',
    unit: 'KG',
    description: 'Muçarela de primeira linha com alto teor de derretimento para pizzas e lanches.',
    averageMarketPrice: 29.40,
    minPrice: 28.50,
    maxPrice: 30.20,
    tags: ['pizzaria', 'hamburgueria', 'frios']
  },
  {
    id: 'prod-tomate-italiano',
    name: 'Tomate Italiano Especial',
    category: 'Hortifruti',
    unit: 'KG',
    description: 'Tomate selecionado tipo italiano, ponto de maturação ideal para molhos e saladas.',
    averageMarketPrice: 7.20,
    minPrice: 6.50,
    maxPrice: 7.90,
    tags: ['hortifruti', 'molho', 'salada']
  },
  {
    id: 'prod-batata-prefrita',
    name: 'Batata Pré-Frita Congelada 9mm',
    category: 'Congelados',
    unit: 'KG',
    description: 'Batata palito congelada para fritura rápida com crocância superior (saco 2.5kg).',
    averageMarketPrice: 11.50,
    minPrice: 10.80,
    maxPrice: 12.20,
    tags: ['porções', 'acompanhamento', 'fritura']
  },
  {
    id: 'prod-cerveja-longneck',
    name: 'Cerveja Puro Malte Long Neck (Caixa com 24)',
    category: 'Bebidas',
    unit: 'CX',
    description: 'Caixa com 24 unidades de 330ml descartáveis, embalagem shrink.',
    averageMarketPrice: 94.00,
    minPrice: 89.90,
    maxPrice: 98.00,
    tags: ['bebidas alcoólicas', 'bar', 'happy hour']
  },
  {
    id: 'prod-embalagem-kraft',
    name: 'Embalagem Kraft Hamburguer Térmica (Cento)',
    category: 'Embalagens',
    unit: 'CX',
    description: 'Caixa de papel kraft antivazamento com 100 unidades, respiradouro anti-umidade.',
    averageMarketPrice: 62.00,
    minPrice: 58.00,
    maxPrice: 66.50,
    tags: ['delivery', 'hamburgueria', 'sustentável']
  },
  {
    id: 'prod-detergente-clorado',
    name: 'Detergente Clorado Desengordurante 5L',
    category: 'Produtos de limpeza',
    unit: 'GL',
    description: 'Galão de 5 litros homologado Anvisa para higienização profissional de cozinhas industriais.',
    averageMarketPrice: 38.50,
    minPrice: 35.00,
    maxPrice: 42.00,
    tags: ['higiene', 'anvisa', 'limpeza pesada']
  },
  {
    id: 'prod-oleo-algodao',
    name: 'Óleo de Algodão para Fritura 18L',
    category: 'Mercearia',
    unit: 'BD',
    description: 'Balde de 18 litros com alto ponto de fumaça, não transfere sabor aos alimentos.',
    averageMarketPrice: 135.00,
    minPrice: 128.00,
    maxPrice: 142.00,
    tags: ['fritura profissional', 'rendimento']
  }
];

export const DEFAULT_SAAS_B2B_SUPPLIERS: B2BSupplier[] = [
  {
    id: 'sup-jbs-friboi',
    corporateName: 'JBS S/A Distribuidora de Carnes',
    tradeName: 'Distribuidora JBS Friboi',
    cnpj: '02.916.265/0001-00',
    category: 'Carnes',
    supplierType: 'frigorifico',
    status: 'active',
    phone: '(11) 3144-4000',
    whatsapp: '(11) 98765-4321',
    email: 'vendas.foodservice@friboi.com.br',
    website: 'https://friboi.com.br/foodservice',
    contactPerson: 'Carlos Eduardo (Consultor Food Service SP/Interior)',
    cep: '05118-100',
    street: 'Av. Marginal Direita do Tietê',
    number: '500',
    complement: 'Complexo Logístico Bloco C',
    neighborhood: 'Vila Jaguara',
    city: 'São Paulo',
    state: 'SP',
    servedCities: ['São Paulo', 'Ribeirão Preto', 'Campinas', 'Santos', 'Sorocaba', 'Sertãozinho'],
    servedRegions: ['Grande São Paulo', 'Região Metropolitana de Ribeirão Preto', 'Região de Campinas'],
    maxDeliveryDistanceKm: 350,
    deliversToRestaurant: true,
    minOrderValue: 500,
    avgDeliveryDays: 2,
    deliveryDays: ['Segunda-feira', 'Quarta-feira', 'Sexta-feira'],
    paymentMethods: ['Boleto Faturado (28 dias)', 'Pix', 'Cartão B2B'],
    paymentTerms: '28 dias após faturamento (sujeito à análise de crédito)',
    freightType: 'CIF',
    deliveryFee: 0,
    notes: 'Frota refrigerada própria com rastreamento de temperatura e laudos sanitários em dia.',
    rating: 4.9,
    isPartner: true,
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2026-09-20T14:30:00Z',
    products: [
      {
        id: 'p-jbs-1',
        productId: 'prod-bife-bovino',
        productName: 'Bife Bovino (Alcatra/Contra-filé)',
        category: 'Carnes',
        unit: 'KG',
        price: 34.50,
        previousPrice: 33.70,
        variationPercentage: 2.37,
        lastUpdated: '20/09/2026',
        availability: 'available',
        minOrderQty: 10,
        regionalPrices: [
          { region: 'São Paulo', price: 34.50 },
          { region: 'Ribeirão Preto', price: 35.20 },
          { region: 'Campinas', price: 34.80 }
        ]
      },
      {
        id: 'p-jbs-2',
        productId: 'prod-file-frango',
        productName: 'Filé de Peito de Frango',
        category: 'Frangos',
        unit: 'KG',
        price: 17.20,
        previousPrice: 17.40,
        variationPercentage: -1.15,
        lastUpdated: '20/09/2026',
        availability: 'available',
        minOrderQty: 15,
        regionalPrices: [
          { region: 'São Paulo', price: 17.20 },
          { region: 'Ribeirão Preto', price: 17.50 }
        ]
      }
    ],
    history: {
      'Bife Bovino (Alcatra/Contra-filé)': [
        { date: 'Jan/26', price: 32.00 },
        { date: 'Fev/26', price: 32.50 },
        { date: 'Mar/26', price: 33.80 },
        { date: 'Abr/26', price: 34.10 },
        { date: 'Mai/26', price: 34.50 }
      ],
      'Filé de Peito de Frango': [
        { date: 'Jan/26', price: 16.00 },
        { date: 'Fev/26', price: 16.50 },
        { date: 'Mar/26', price: 16.80 },
        { date: 'Abr/26', price: 17.00 },
        { date: 'Mai/26', price: 17.20 }
      ]
    }
  },
  {
    id: 'sup-sul-meat',
    corporateName: 'Frigorífico Sul Meat Alimentos Ltda',
    tradeName: 'Sul Meat Alimentos',
    cnpj: '14.552.887/0001-44',
    category: 'Carnes',
    supplierType: 'atacadista',
    status: 'active',
    phone: '(51) 3320-9988',
    whatsapp: '(51) 99988-7766',
    email: 'comercial@sulmeat.com.br',
    website: 'https://sulmeat.com.br',
    contactPerson: 'Mariana Duarte (Gerente de Contas B2B)',
    cep: '90240-001',
    street: 'Av. Farrapos',
    number: '3120',
    neighborhood: 'São Geraldo',
    city: 'Porto Alegre',
    state: 'RS',
    servedCities: ['Porto Alegre', 'Curitiba', 'São Paulo', 'Ribeirão Preto', 'Caxias do Sul'],
    servedRegions: ['Sul do Brasil', 'Interior de SP (Ribeirão Preto / Franca)', 'Grande SP'],
    maxDeliveryDistanceKm: 800,
    deliversToRestaurant: true,
    minOrderValue: 300,
    avgDeliveryDays: 1,
    deliveryDays: ['Segunda-feira', 'Terça-feira', 'Quinta-feira', 'Sexta-feira'],
    paymentMethods: ['Boleto 15/30 dias', 'Pix Transferência', 'Faturamento Quanzene'],
    paymentTerms: '15 e 30 dias mediante aprovação de cadastro',
    freightType: 'FREE_ABOVE_MIN',
    deliveryFee: 0,
    notes: 'Especialista em cortes porcionados com padrão uniforme para grelhados e steakhouses.',
    rating: 4.8,
    isPartner: true,
    createdAt: '2025-02-15T09:00:00Z',
    updatedAt: '2026-09-19T16:00:00Z',
    products: [
      {
        id: 'p-sul-1',
        productId: 'prod-bife-bovino',
        productName: 'Bife Bovino (Alcatra/Contra-filé)',
        category: 'Carnes',
        unit: 'KG',
        price: 31.80,
        previousPrice: 32.20,
        variationPercentage: -1.24,
        lastUpdated: '19/09/2026',
        availability: 'available',
        minOrderQty: 10,
        regionalPrices: [
          { region: 'Porto Alegre', price: 30.50 },
          { region: 'Curitiba', price: 31.20 },
          { region: 'Ribeirão Preto', price: 31.80 },
          { region: 'São Paulo', price: 32.00 }
        ]
      },
      {
        id: 'p-sul-2',
        productId: 'prod-file-frango',
        productName: 'Filé de Peito de Frango',
        category: 'Frangos',
        unit: 'KG',
        price: 16.50,
        previousPrice: 16.50,
        variationPercentage: 0,
        lastUpdated: '19/09/2026',
        availability: 'available',
        minOrderQty: 15,
        regionalPrices: [
          { region: 'Ribeirão Preto', price: 16.50 },
          { region: 'Porto Alegre', price: 15.90 }
        ]
      }
    ],
    history: {
      'Bife Bovino (Alcatra/Contra-filé)': [
        { date: 'Jan/26', price: 30.00 },
        { date: 'Fev/26', price: 30.80 },
        { date: 'Mar/26', price: 31.20 },
        { date: 'Abr/26', price: 31.50 },
        { date: 'Mai/26', price: 31.80 }
      ],
      'Filé de Peito de Frango': [
        { date: 'Jan/26', price: 15.50 },
        { date: 'Fev/26', price: 15.80 },
        { date: 'Mar/26', price: 16.00 },
        { date: 'Abr/26', price: 16.20 },
        { date: 'Mai/26', price: 16.50 }
      ]
    }
  },
  {
    id: 'sup-scala-laticinios',
    corporateName: 'Laticínios Scala Indústria e Comércio',
    tradeName: 'Distribuidora Scala de Laticínios',
    cnpj: '21.098.765/0002-88',
    category: 'Laticínios',
    supplierType: 'distribuidor',
    status: 'active',
    phone: '(11) 4567-8900',
    whatsapp: '(11) 95544-3322',
    email: 'pedidos@scalalaticinios.com.br',
    website: 'https://scalalaticinios.com.br',
    contactPerson: 'Renato Faria (Representante Comercial)',
    cep: '04578-000',
    street: 'Rua Funchal',
    number: '418',
    neighborhood: 'Vila Olímpia',
    city: 'São Paulo',
    state: 'SP',
    servedCities: ['São Paulo', 'Campinas', 'Ribeirão Preto', 'São José dos Campos'],
    servedRegions: ['Estado de São Paulo', 'Sul de Minas'],
    maxDeliveryDistanceKm: 300,
    deliversToRestaurant: true,
    minOrderValue: 400,
    avgDeliveryDays: 2,
    deliveryDays: ['Terça-feira', 'Quinta-feira', 'Sábado'],
    paymentMethods: ['Boleto 21 dias', 'Pix Direto', 'Cartão Corporativo'],
    paymentTerms: '21 dias líquido',
    freightType: 'CIF',
    deliveryFee: 0,
    notes: 'Qualidade reconhecida pela APAS e Abrasel. Padrão ouro em derretimento e sabor.',
    rating: 4.9,
    isPartner: true,
    createdAt: '2025-01-20T11:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    products: [
      {
        id: 'p-scala-1',
        productId: 'prod-queijo-mucarela',
        productName: 'Queijo Muçarela Peça/Fatiado',
        category: 'Laticínios',
        unit: 'KG',
        price: 29.90,
        previousPrice: 29.50,
        variationPercentage: 1.35,
        lastUpdated: '18/09/2026',
        availability: 'available',
        minOrderQty: 12,
        regionalPrices: [
          { region: 'São Paulo', price: 29.90 },
          { region: 'Ribeirão Preto', price: 30.40 }
        ]
      }
    ],
    history: {
      'Queijo Muçarela Peça/Fatiado': [
        { date: 'Jan/26', price: 28.50 },
        { date: 'Fev/26', price: 29.00 },
        { date: 'Mar/26', price: 29.50 },
        { date: 'Abr/26', price: 29.80 },
        { date: 'Mai/26', price: 29.90 }
      ]
    }
  },
  {
    id: 'sup-campo-belo',
    corporateName: 'Campo Belo Hortifruti e Orgânicos Ltda',
    tradeName: 'Hortifruti Campo Belo',
    cnpj: '33.456.789/0001-12',
    category: 'Hortifruti',
    supplierType: 'produtor',
    status: 'active',
    phone: '(16) 3610-7788',
    whatsapp: '(16) 99123-4567',
    email: 'pedidos@hortifruticampobelo.com.br',
    website: 'https://campobeloorganicos.com.br',
    contactPerson: 'João Silveira (Produtor Responsável)',
    cep: '14010-060',
    street: 'Rodovia Anhanguera KM 312',
    number: 'S/N',
    neighborhood: 'Zona Rural',
    city: 'Ribeirão Preto',
    state: 'SP',
    servedCities: ['Ribeirão Preto', 'Sertãozinho', 'Pradópolis', 'Cravinhos', 'Brodowski', 'Araraquara'],
    servedRegions: ['Região Metropolitana de Ribeirão Preto', 'Mogiana'],
    maxDeliveryDistanceKm: 120,
    deliversToRestaurant: true,
    minOrderValue: 200,
    avgDeliveryDays: 1,
    deliveryDays: ['Segunda a Sábado (Diário pela manhã)'],
    paymentMethods: ['Pix Faturamento Semanal', 'Boleto 7/14 dias', 'Dinheiro na entrega'],
    paymentTerms: 'Semanal toda segunda-feira',
    freightType: 'CIF',
    deliveryFee: 0,
    notes: 'Colheita diária na madrugada. Produtos frescos entregues antes das 9h no restaurante.',
    rating: 4.95,
    isPartner: true,
    createdAt: '2025-03-01T07:00:00Z',
    updatedAt: '2026-09-21T06:30:00Z',
    products: [
      {
        id: 'p-campo-1',
        productId: 'prod-tomate-italiano',
        productName: 'Tomate Italiano Especial',
        category: 'Hortifruti',
        unit: 'KG',
        price: 6.80,
        previousPrice: 7.20,
        variationPercentage: -5.55,
        lastUpdated: '21/09/2026',
        availability: 'available',
        minOrderQty: 10,
        regionalPrices: [
          { region: 'Ribeirão Preto', price: 6.80 },
          { region: 'Sertãozinho', price: 7.00 },
          { region: 'Pradópolis', price: 7.10 }
        ]
      }
    ],
    history: {
      'Tomate Italiano Especial': [
        { date: 'Jan/26', price: 7.80 },
        { date: 'Fev/26', price: 7.50 },
        { date: 'Mar/26', price: 7.30 },
        { date: 'Abr/26', price: 7.20 },
        { date: 'Mai/26', price: 6.80 }
      ]
    }
  },
  {
    id: 'sup-ambev-express',
    corporateName: 'Ambev Centro de Distribuição Direta',
    tradeName: 'Distribuidora Ambev B2B Express',
    cnpj: '07.526.557/0001-00',
    category: 'Bebidas',
    supplierType: 'distribuidor',
    status: 'active',
    phone: '(16) 3999-1000',
    whatsapp: '(16) 98877-6655',
    email: 'pedidos.food@ambevb2b.com.br',
    website: 'https://bees.com.br',
    contactPerson: 'Patrícia Mendes (Supervisora On-Trade)',
    cep: '14075-000',
    street: 'Av. Thomaz Alberto Whately',
    number: '4200',
    neighborhood: 'Parque Industrial Tanquinho',
    city: 'Ribeirão Preto',
    state: 'SP',
    servedCities: ['Ribeirão Preto', 'Sertãozinho', 'Franca', 'Araraquara', 'São Carlos'],
    servedRegions: ['Nordeste Paulista'],
    maxDeliveryDistanceKm: 150,
    deliversToRestaurant: true,
    minOrderValue: 450,
    avgDeliveryDays: 2,
    deliveryDays: ['Segunda-feira', 'Quarta-feira', 'Sexta-feira'],
    paymentMethods: ['Boleto 21 dias', 'Cartão BEES', 'Pix'],
    paymentTerms: '21 dias faturado',
    freightType: 'CIF',
    deliveryFee: 0,
    notes: 'Fornecimento com comodato de chopeiras e freezers mediante contrato de exclusividade.',
    rating: 4.7,
    isPartner: true,
    createdAt: '2025-01-05T08:00:00Z',
    updatedAt: '2026-09-20T11:00:00Z',
    products: [
      {
        id: 'p-ambev-1',
        productId: 'prod-cerveja-longneck',
        productName: 'Cerveja Puro Malte Long Neck (Caixa com 24)',
        category: 'Bebidas',
        unit: 'CX',
        price: 91.50,
        previousPrice: 93.00,
        variationPercentage: -1.61,
        lastUpdated: '20/09/2026',
        availability: 'available',
        minOrderQty: 3,
        regionalPrices: [
          { region: 'Ribeirão Preto', price: 91.50 },
          { region: 'Sertãozinho', price: 92.50 }
        ]
      }
    ],
    history: {
      'Cerveja Puro Malte Long Neck (Caixa com 24)': [
        { date: 'Jan/26', price: 88.00 },
        { date: 'Fev/26', price: 89.50 },
        { date: 'Mar/26', price: 91.00 },
        { date: 'Abr/26', price: 93.00 },
        { date: 'Mai/26', price: 91.50 }
      ]
    }
  },
  {
    id: 'sup-packfood',
    corporateName: 'PackFood Indústria e Comércio de Embalagens',
    tradeName: 'PackFood Embalagens & Descartáveis',
    cnpj: '18.990.123/0001-77',
    category: 'Embalagens',
    supplierType: 'embalagens',
    status: 'active',
    phone: '(11) 2233-4455',
    whatsapp: '(11) 97766-5544',
    email: 'contato@packfood.com.br',
    website: 'https://packfood.com.br',
    contactPerson: 'Eduardo Castro (Especialista em Food Delivery)',
    cep: '03001-000',
    street: 'Rua da Mooca',
    number: '1450',
    neighborhood: 'Mooca',
    city: 'São Paulo',
    state: 'SP',
    servedCities: ['São Paulo', 'Ribeirão Preto', 'Campinas', 'Curitiba', 'Belo Horizonte', 'Rio de Janeiro'],
    servedRegions: ['Todo o Brasil via transportadora própria'],
    maxDeliveryDistanceKm: 600,
    deliversToRestaurant: true,
    minOrderValue: 250,
    avgDeliveryDays: 3,
    deliveryDays: ['Segunda a Sexta'],
    paymentMethods: ['Boleto 30 dias', 'Cartão em até 3x', 'Pix 5% off'],
    paymentTerms: '30 dias',
    freightType: 'FREE_ABOVE_MIN',
    deliveryFee: 0,
    notes: 'Possibilidade de personalização com logotipo do restaurante para lotes acima de 5.000 un.',
    rating: 4.85,
    isPartner: true,
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2026-09-15T15:00:00Z',
    products: [
      {
        id: 'p-pack-1',
        productId: 'prod-embalagem-kraft',
        productName: 'Embalagem Kraft Hamburguer Térmica (Cento)',
        category: 'Embalagens',
        unit: 'CX',
        price: 59.90,
        previousPrice: 62.00,
        variationPercentage: -3.38,
        lastUpdated: '15/09/2026',
        availability: 'available',
        minOrderQty: 2,
        regionalPrices: [
          { region: 'São Paulo', price: 59.90 },
          { region: 'Ribeirão Preto', price: 61.50 }
        ]
      }
    ],
    history: {
      'Embalagem Kraft Hamburguer Térmica (Cento)': [
        { date: 'Jan/26', price: 56.00 },
        { date: 'Fev/26', price: 58.00 },
        { date: 'Mar/26', price: 60.00 },
        { date: 'Abr/26', price: 62.00 },
        { date: 'Mai/26', price: 59.90 }
      ]
    }
  },
  {
    id: 'sup-cleanpro',
    corporateName: 'CleanPro Soluções em Higienização Food Ltda',
    tradeName: 'CleanPro Produtos de Higiene Food Service',
    cnpj: '25.678.901/0001-99',
    category: 'Produtos de limpeza',
    supplierType: 'limpeza',
    status: 'active',
    phone: '(19) 3876-5432',
    whatsapp: '(19) 98111-2233',
    email: 'comercial@cleanprofood.com.br',
    website: 'https://cleanprofood.com.br',
    contactPerson: 'Amanda Torres (Engenheira de Alimentos)',
    cep: '13080-000',
    street: 'Av. Barão de Itapura',
    number: '2100',
    neighborhood: 'Guanabara',
    city: 'Campinas',
    state: 'SP',
    servedCities: ['Campinas', 'São Paulo', 'Ribeirão Preto', 'Piracicaba', 'Limeira'],
    servedRegions: ['Interior e Capital SP'],
    maxDeliveryDistanceKm: 250,
    deliversToRestaurant: true,
    minOrderValue: 200,
    avgDeliveryDays: 2,
    deliveryDays: ['Terça-feira', 'Quinta-feira'],
    paymentMethods: ['Boleto 28 dias', 'Pix'],
    paymentTerms: '28 dias',
    freightType: 'CIF',
    deliveryFee: 0,
    notes: 'Fornecimento gratuito de dosadores automáticos para máquinas lava-louças e laudos de microbiologia.',
    rating: 4.9,
    isPartner: true,
    createdAt: '2025-02-20T14:00:00Z',
    updatedAt: '2026-09-17T09:00:00Z',
    products: [
      {
        id: 'p-clean-1',
        productId: 'prod-detergente-clorado',
        productName: 'Detergente Clorado Desengordurante 5L',
        category: 'Produtos de limpeza',
        unit: 'GL',
        price: 36.90,
        previousPrice: 38.00,
        variationPercentage: -2.89,
        lastUpdated: '17/09/2026',
        availability: 'available',
        minOrderQty: 2,
        regionalPrices: [
          { region: 'Campinas', price: 36.90 },
          { region: 'Ribeirão Preto', price: 37.50 },
          { region: 'São Paulo', price: 37.20 }
        ]
      }
    ],
    history: {
      'Detergente Clorado Desengordurante 5L': [
        { date: 'Jan/26', price: 34.00 },
        { date: 'Fev/26', price: 35.00 },
        { date: 'Mar/26', price: 36.50 },
        { date: 'Abr/26', price: 38.00 },
        { date: 'Mai/26', price: 36.90 }
      ]
    }
  }
];

export const DEFAULT_PRICE_ALERTS: PriceAlert[] = [
  {
    id: 'alt-1',
    productId: 'prod-bife-bovino',
    productName: 'Bife Bovino (Alcatra/Contra-filé)',
    supplierId: 'sup-sul-meat',
    supplierName: 'Sul Meat Alimentos',
    type: 'cheaper_alternative',
    diffAmount: 2.70,
    percentageChange: -7.82,
    message: 'Sul Meat está oferecendo Bife Bovino por R$ 31,80/kg (R$ 2,70 mais barato que o preço médio da região).',
    alternativeSupplierName: 'Sul Meat Alimentos',
    alternativePrice: 31.80,
    date: '20/09/2026',
    severity: 'success',
    read: false
  },
  {
    id: 'alt-2',
    productId: 'prod-tomate-italiano',
    productName: 'Tomate Italiano Especial',
    supplierId: 'sup-campo-belo',
    supplierName: 'Hortifruti Campo Belo',
    type: 'price_decrease',
    diffAmount: -0.40,
    percentageChange: -5.55,
    message: 'Tomate Italiano Especial caiu 5,5% com nova safra de primavera em Ribeirão Preto.',
    date: '21/09/2026',
    severity: 'info',
    read: false
  },
  {
    id: 'alt-3',
    productId: 'prod-bife-bovino',
    productName: 'Bife Bovino (Alcatra/Contra-filé)',
    supplierId: 'sup-jbs-friboi',
    supplierName: 'Distribuidora JBS Friboi',
    type: 'price_increase',
    diffAmount: 0.80,
    percentageChange: 2.37,
    message: 'Bife Bovino aumentou +2,4% no fornecedor JBS Friboi nos últimos 30 dias.',
    date: '20/09/2026',
    severity: 'warning',
    read: false
  }
];

export const DEFAULT_QUOTATIONS: B2BQuotation[] = [
  {
    id: 'quot-101',
    quotationNumber: 'COT-2026-0042',
    restaurantTenantId: 'demo-tenant',
    restaurantName: 'Restaurante Sabor & Arte',
    title: 'Cotação Semanal de Carnes e Laticínios para Fim de Semana',
    status: 'responses_received',
    createdAt: '2026-09-18T10:00:00Z',
    deadline: '2026-09-24T18:00:00Z',
    items: [
      {
        productId: 'prod-bife-bovino',
        productName: 'Bife Bovino (Alcatra/Contra-filé)',
        unit: 'KG',
        quantity: 80,
        targetPrice: 32.00,
        notes: 'Padrão bife de 180g limpo'
      },
      {
        productId: 'prod-file-frango',
        productName: 'Filé de Peito de Frango',
        unit: 'KG',
        quantity: 50,
        targetPrice: 16.50
      },
      {
        productId: 'prod-queijo-mucarela',
        productName: 'Queijo Muçarela Peça/Fatiado',
        unit: 'KG',
        quantity: 40,
        targetPrice: 29.00
      }
    ],
    invitedSuppliers: [
      {
        supplierId: 'sup-jbs-friboi',
        supplierName: 'Distribuidora JBS Friboi',
        status: 'quoted',
        freight: 0,
        minOrderMet: true,
        paymentTerms: '28 dias no boleto',
        validityUntil: '25/09/2026',
        totalQuotation: 4816.00,
        notes: 'Entrega na quarta-feira pela manhã sem custo de frete.',
        respondedAt: '2026-09-19T14:00:00Z',
        items: [
          { productId: 'prod-bife-bovino', unitPrice: 34.50, available: true, leadTimeDays: 2 },
          { productId: 'prod-file-frango', unitPrice: 17.20, available: true, leadTimeDays: 2 },
          { productId: 'prod-queijo-mucarela', unitPrice: 29.90, available: true, leadTimeDays: 2 }
        ]
      },
      {
        supplierId: 'sup-sul-meat',
        supplierName: 'Sul Meat Alimentos',
        status: 'quoted',
        freight: 0,
        minOrderMet: true,
        paymentTerms: '15/30 dias faturado',
        validityUntil: '24/09/2026',
        totalQuotation: 4569.00,
        notes: 'Melhor preço garantido no lote completo.',
        respondedAt: '2026-09-19T16:30:00Z',
        items: [
          { productId: 'prod-bife-bovino', unitPrice: 31.80, available: true, leadTimeDays: 1 },
          { productId: 'prod-file-frango', unitPrice: 16.50, available: true, leadTimeDays: 1 },
          { productId: 'prod-queijo-mucarela', unitPrice: 30.00, available: true, leadTimeDays: 2 }
        ]
      }
    ]
  }
];

export const DEFAULT_PURCHASE_ORDERS: B2BPurchaseOrder[] = [
  {
    id: 'po-1001',
    orderNumber: 'PED-2026-089',
    quotationId: 'quot-101',
    restaurantTenantId: 'demo-tenant',
    restaurantName: 'Restaurante Sabor & Arte',
    supplierId: 'sup-sul-meat',
    supplierName: 'Sul Meat Alimentos',
    supplierCity: 'Porto Alegre / Hub SP',
    status: 'received',
    items: [
      {
        productId: 'prod-bife-bovino',
        productName: 'Bife Bovino (Alcatra/Contra-filé)',
        unit: 'KG',
        quantity: 60,
        unitPrice: 31.80,
        total: 1908.00
      },
      {
        productId: 'prod-file-frango',
        productName: 'Filé de Peito de Frango',
        unit: 'KG',
        quantity: 40,
        unitPrice: 16.50,
        total: 660.00
      }
    ],
    subtotal: 2568.00,
    freight: 0,
    discount: 50.00,
    total: 2518.00,
    deliveryDays: 1,
    estimatedDeliveryDate: '2026-09-21',
    paymentMethod: 'Boleto Faturado 15/30d',
    paymentTerms: '15/30 dias',
    notes: 'Entregar na porta de serviço até as 10h.',
    createdAt: '2026-09-19T17:00:00Z',
    receivedAt: '2026-09-21T09:15:00Z',
    sentToAccountsPayable: true,
    sentToInventory: true,
    launchedCostValue: 2518.00
  },
  {
    id: 'po-1002',
    orderNumber: 'PED-2026-090',
    restaurantTenantId: 'demo-tenant',
    restaurantName: 'Restaurante Sabor & Arte',
    supplierId: 'sup-campo-belo',
    supplierName: 'Hortifruti Campo Belo',
    supplierCity: 'Ribeirão Preto',
    status: 'in_transit',
    items: [
      {
        productId: 'prod-tomate-italiano',
        productName: 'Tomate Italiano Especial',
        unit: 'KG',
        quantity: 45,
        unitPrice: 6.80,
        total: 306.00
      }
    ],
    subtotal: 306.00,
    freight: 0,
    discount: 0,
    total: 306.00,
    deliveryDays: 1,
    estimatedDeliveryDate: '2026-09-25',
    paymentMethod: 'Pix Semanal',
    paymentTerms: 'Semanal',
    notes: 'Colheita madrugador para mise en place do almoço.',
    createdAt: '2026-09-24T14:00:00Z',
    sentToAccountsPayable: false,
    sentToInventory: false
  }
];

export const DEFAULT_RESTAURANT_RELATIONSHIPS: RestaurantSupplierRelationship[] = [
  {
    id: 'rel-1',
    restaurantTenantId: 'demo-tenant',
    supplierId: 'sup-sul-meat',
    supplierName: 'Sul Meat Alimentos',
    isFavorite: true,
    isUsed: true,
    commercialAgreementNotes: 'Condição especial de 5% de desconto para compras acima de R$ 2.000 com pagamento em 15/30d.',
    lastPurchaseDate: '2026-09-21T09:15:00Z',
    totalPurchasedValue: 18450.00,
    ordersCount: 8,
    negotiatedPrices: [
      {
        productId: 'prod-bife-bovino',
        productName: 'Bife Bovino (Alcatra/Contra-filé)',
        unit: 'KG',
        regularPrice: 31.80,
        negotiatedPrice: 30.50,
        discountPercentage: 4.09,
        validUntil: '31/12/2026',
        notes: 'Válido para consumo mínimo de 150kg/mês.'
      },
      {
        productId: 'prod-file-frango',
        productName: 'Filé de Peito de Frango',
        unit: 'KG',
        regularPrice: 16.50,
        negotiatedPrice: 15.80,
        discountPercentage: 4.24,
        validUntil: '31/12/2026',
        notes: 'Preço fixado para segundo semestre.'
      }
    ]
  },
  {
    id: 'rel-2',
    restaurantTenantId: 'demo-tenant',
    supplierId: 'sup-campo-belo',
    supplierName: 'Hortifruti Campo Belo',
    isFavorite: true,
    isUsed: true,
    commercialAgreementNotes: 'Parceiro exclusivo para folhas, ervas finas e tomates com entrega diária sem taxa.',
    lastPurchaseDate: '2026-09-24T14:00:00Z',
    totalPurchasedValue: 4280.00,
    ordersCount: 14,
    negotiatedPrices: [
      {
        productId: 'prod-tomate-italiano',
        productName: 'Tomate Italiano Especial',
        unit: 'KG',
        regularPrice: 6.80,
        negotiatedPrice: 6.20,
        discountPercentage: 8.82,
        validUntil: '30/10/2026',
        notes: 'Preço direto do produtor rural.'
      }
    ]
  },
  {
    id: 'rel-3',
    restaurantTenantId: 'demo-tenant',
    supplierId: 'sup-jbs-friboi',
    supplierName: 'Distribuidora JBS Friboi',
    isFavorite: false,
    isUsed: true,
    commercialAgreementNotes: 'Fornecedor homologado de backup para fins de semana de pico.',
    lastPurchaseDate: '2026-08-30T10:00:00Z',
    totalPurchasedValue: 12300.00,
    ordersCount: 4,
    negotiatedPrices: []
  }
];

export const DEFAULT_PRICE_HISTORY_LOGS: PriceHistoryEntry[] = [
  {
    id: 'log-1',
    supplierId: 'sup-jbs-friboi',
    supplierName: 'Distribuidora JBS Friboi',
    productId: 'prod-bife-bovino',
    productName: 'Bife Bovino (Alcatra/Contra-filé)',
    unit: 'KG',
    price: 34.50,
    region: 'São Paulo',
    date: '20/09/2026',
    time: '14:30',
    source: 'manual',
    userResponsible: 'Carlos Eduardo (JBS)',
    notes: 'Ajuste de tabela quinzenal do frigorífico.'
  },
  {
    id: 'log-2',
    supplierId: 'sup-sul-meat',
    supplierName: 'Sul Meat Alimentos',
    productId: 'prod-bife-bovino',
    productName: 'Bife Bovino (Alcatra/Contra-filé)',
    unit: 'KG',
    price: 31.80,
    region: 'Ribeirão Preto',
    date: '19/09/2026',
    time: '16:00',
    source: 'quotation',
    userResponsible: 'Mariana Duarte (Sul Meat)',
    notes: 'Proposta competitiva enviada na Cotação COT-2026-0042.'
  },
  {
    id: 'log-3',
    supplierId: 'sup-campo-belo',
    supplierName: 'Hortifruti Campo Belo',
    productId: 'prod-tomate-italiano',
    productName: 'Tomate Italiano Especial',
    unit: 'KG',
    price: 6.80,
    region: 'Ribeirão Preto',
    date: '21/09/2026',
    time: '06:30',
    source: 'manual',
    userResponsible: 'João Silveira (Produtor)',
    notes: 'Entrada de nova colheita de estufa.'
  }
];
