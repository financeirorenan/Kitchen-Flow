import { Router, Request, Response } from "express";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import {
  initializeFirestore as initializeClientFirestore,
  collection as getClientCollection,
  query as clientQuery,
  where as clientWhere,
  getDocs as getClientDocs,
  doc as clientDoc,
  getDoc as getClientDoc,
  setDoc as clientSetDoc,
  updateDoc as clientUpdateDoc,
  limit as clientLimit
} from "firebase/firestore";
import path from "path";
import fs from "fs";

// Safe loading of firebase config
let firebaseConfig: Record<string, string> = {};
try {
  const configFile = path.resolve("firebase-applet-config.json");
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json from disk:", e);
}

if (!firebaseConfig || !firebaseConfig.projectId) {
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0510005534",
    appId: process.env.FIREBASE_APP_ID || "",
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0510005534.firebaseapp.com",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-a2f13cdd-6132-4b0a-bec9-cdb7d1da2816",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0510005534.firebasestorage.app"
  };
}

const clientApp = getClientApps().length > 0 ? getClientApps()[0] : initializeClientApp(firebaseConfig);
const db = initializeClientFirestore(
  clientApp,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId || "(default)"
);

export const marketplaceApiRouter = Router();

interface AuthenticatedRequest extends Request {
  merchantId?: string;
  merchantToken?: string;
}

// Middleware de Extração de Tenant / Autenticação de Mercador
const extractMerchant = (req: AuthenticatedRequest, _res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers["x-merchant-token"] as string;
  const merchantIdHeader = req.headers["x-merchant-id"] as string;
  const queryTenant = (req.query.tenantId || req.query.merchantId || req.query.token) as string;

  const tenantId = merchantIdHeader || queryTenant || "";
  let token = tokenHeader || "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // Se nenhum merchant for explicitamente fornecido, preservar o token ou tenantId informado
  req.merchantId = tenantId || "";
  req.merchantToken = token;

  next();
};

marketplaceApiRouter.use(extractMerchant);

// Helper para validar a presença de identificação do lojista
const requireMerchant = (req: AuthenticatedRequest, res: Response): string | null => {
  const mId = req.merchantId || 
              (req.query.tenantId as string) || 
              (req.query.merchantId as string) || 
              (req.body && (req.body.merchantId || req.body.tenantId)) ||
              (req.headers["x-merchant-id"] as string);
  if (!mId) {
    res.status(401).json({ error: "Identificação do estabelecimento (x-merchant-id, merchantId ou tenantId) é obrigatória." });
    return null;
  }
  return mId;
};

// =========================================================================
// ENDPOINTS DE INTEGRAÇÃO ZUPI DELIVERY (MARKETPLACE EXTERNO)
// =========================================================================

// Health check de conectividade para o app Zupi Delivery
marketplaceApiRouter.get("/health", (_req: Request, res: Response) => {
  return res.json({
    status: "ok",
    service: "KitchenFlow Marketplace Gateway",
    integratedApp: "Zupi Delivery",
    version: "2.1.0",
    timestamp: new Date().toISOString()
  });
});

// Listar Estabelecimentos Ativos no Marketplace (GET /api/v1/marketplace/merchants)
marketplaceApiRouter.get("/merchants", async (req: Request, res: Response) => {
  try {
    const { search, category, city } = req.query;
    const tenantsRef = getClientCollection(db, "tenants");
    const snapshot = await getClientDocs(tenantsRef);

    const tenantList: Record<string, any>[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Garantir presença do lojista padrão para ambiente de desenvolvimento/homologação
    if (!tenantList.some(t => t.id === 'lojista' || t.slug === 'lojista')) {
      tenantList.unshift({
        id: 'lojista',
        name: 'KitchenFlow Burgers & Pizzas',
        companyName: 'KitchenFlow Gastronomia',
        slug: 'lojista',
        category: 'Hambúrgueres & Lanches',
        phone: '(11) 99999-8888',
        logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
        status: 'active',
        address: 'Avenida Paulista, 1000 - Bela Vista, São Paulo - SP',
        city: 'São Paulo',
        state: 'SP',
        rating: 4.9,
        reviewCount: 238,
        deliveryFee: 6.90,
        minOrderValue: 25.00,
        estimatedTime: '35-50 min'
      });
    }

    const merchants = [];

    for (const t of tenantList) {
      if (t.status === 'inactive') continue;

      // Filtro de busca
      if (search && typeof search === 'string') {
        const queryLower = search.toLowerCase();
        const matchesName = (t.name || '').toLowerCase().includes(queryLower);
        const matchesCat = (t.category || '').toLowerCase().includes(queryLower);
        if (!matchesName && !matchesCat) continue;
      }

      // Filtro de categoria
      if (category && typeof category === 'string' && category !== 'all') {
        if ((t.category || '').toLowerCase() !== category.toLowerCase()) continue;
      }

      // Filtro de cidade
      if (city && typeof city === 'string') {
        const tCity = (t.city || t.address?.city || '').toLowerCase();
        if (tCity && !tCity.includes(city.toLowerCase())) continue;
      }

      // Consulta status de abertura (aberto/fechado)
      let isOpen = true;
      try {
        const settingsSnap = await getClientDoc(clientDoc(db, "settings", t.id));
        if (settingsSnap.exists()) {
          const s = settingsSnap.data();
          if (s.isStoreForceClosed === true) isOpen = false;
        }
      } catch {
        // Fallback resiliente
      }

      merchants.push({
        id: t.id,
        name: t.name || t.companyName || 'Restaurante Parceiro',
        slug: t.slug || t.id,
        category: t.category || 'Alimentação & Delivery',
        logo: t.logo || t.logoUrl || t.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        banner: t.bannerUrl || t.coverUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
        phone: t.phone || '',
        address: typeof t.address === 'string' ? t.address : `${t.address?.street || ''}, ${t.address?.number || ''} - ${t.address?.neighborhood || ''}, ${t.address?.city || ''}`,
        city: t.city || t.address?.city || 'São Paulo',
        state: t.state || t.address?.state || 'SP',
        rating: t.rating || 4.8,
        reviewCount: t.reviewCount || 140,
        deliveryFee: typeof t.deliveryFee === 'number' ? t.deliveryFee : 5.00,
        minOrderValue: typeof t.minOrderValue === 'number' ? t.minOrderValue : 20.00,
        estimatedTime: t.estimatedTime || '30-45 min',
        isOpen,
        status: isOpen ? 'OPEN' : 'CLOSED'
      });
    }

    return res.json({
      success: true,
      partner: 'Zupi Delivery',
      count: merchants.length,
      merchants
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Marketplace API] Erro ao listar lojas:", err);
    return res.status(500).json({ error: "Erro ao listar restaurantes no marketplace.", details: errorMessage });
  }
});

// Detalhes de um Estabelecimento Específico (GET /api/v1/marketplace/merchants/:merchantId)
marketplaceApiRouter.get("/merchants/:merchantId", async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    let tenantData: any = null;

    try {
      const tenantDoc = await getClientDoc(clientDoc(db, "tenants", merchantId));
      if (tenantDoc.exists()) {
        tenantData = { id: tenantDoc.id, ...tenantDoc.data() };
      }
    } catch {
      // Ignorar e verificar fallback
    }

    if (!tenantData && merchantId === 'lojista') {
      tenantData = {
        id: 'lojista',
        name: 'KitchenFlow Burgers & Pizzas',
        category: 'Hambúrgueres & Lanches',
        slug: 'lojista',
        phone: '(11) 99999-8888',
        rating: 4.9,
        reviewCount: 238,
        deliveryFee: 6.90,
        minOrderValue: 25.00,
        estimatedTime: '35-50 min'
      };
    }

    if (!tenantData) {
      return res.status(404).json({ error: "Estabelecimento não encontrado no marketplace." });
    }

    let isOpen = true;
    let businessHours = null;
    let deliverySettings = null;

    try {
      const settingsSnap = await getClientDoc(clientDoc(db, "settings", merchantId));
      if (settingsSnap.exists()) {
        const s = settingsSnap.data();
        if (s.isStoreForceClosed === true) isOpen = false;
        businessHours = s.businessHours || null;
        deliverySettings = s.delivery || null;
      }
    } catch (_e) {
      // Ignora erro ao buscar configurações opcionais
    }

    return res.json({
      success: true,
      partner: 'Zupi Delivery',
      merchant: {
        id: tenantData.id,
        name: tenantData.name || tenantData.companyName || 'Restaurante Parceiro',
        slug: tenantData.slug || tenantData.id,
        category: tenantData.category || 'Alimentação & Delivery',
        logo: tenantData.logo || tenantData.logoUrl || tenantData.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
        banner: tenantData.bannerUrl || tenantData.coverUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
        phone: tenantData.phone || '',
        address: tenantData.address || 'São Paulo, SP',
        rating: tenantData.rating || 4.8,
        reviewCount: tenantData.reviewCount || 140,
        deliveryFee: typeof tenantData.deliveryFee === 'number' ? tenantData.deliveryFee : 5.00,
        minOrderValue: typeof tenantData.minOrderValue === 'number' ? tenantData.minOrderValue : 20.00,
        estimatedTime: tenantData.estimatedTime || '30-45 min',
        isOpen,
        status: isOpen ? 'OPEN' : 'CLOSED',
        businessHours,
        deliverySettings
      }
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao buscar detalhes do estabelecimento.", details: errorMessage });
  }
});

// Envio de Novo Pedido pelo Zupi Delivery (POST /api/v1/marketplace/orders)
marketplaceApiRouter.post("/orders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body || {};
    const merchantId = body.merchantId || body.tenantId || req.merchantId || (req.headers["x-merchant-id"] as string);

    if (!merchantId) {
      return res.status(400).json({ error: "Identificação do estabelecimento (merchantId ou tenantId) é obrigatória." });
    }

    const { customer, items, delivery, payment, notes, externalId, coupon, discount: inputDiscount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "O pedido deve conter ao menos um item no array 'items'." });
    }

    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({ error: "Dados do cliente (nome e telefone) são obrigatórios." });
    }

    const deliveryType = delivery?.type === 'takeout' ? 'takeout' : 'delivery';
    let formattedAddress = '';
    if (deliveryType === 'delivery') {
      if (typeof customer.address === 'string') {
        formattedAddress = customer.address;
      } else if (customer.address && typeof customer.address === 'object') {
        const a = customer.address;
        formattedAddress = `${a.street || ''}, ${a.number || ''}${a.complement ? ` (${a.complement})` : ''} - ${a.neighborhood || ''}, ${a.city || ''} - ${a.state || ''}`;
        if (a.reference) formattedAddress += ` [Ref: ${a.reference}]`;
      }

      if (!formattedAddress || formattedAddress.trim().length < 5) {
        return res.status(400).json({ error: "Endereço completo de entrega é obrigatório para pedidos do tipo 'delivery'." });
      }
    } else {
      formattedAddress = 'Retirada no Balcão pelo Cliente';
    }

    // Normalização e Cálculo dos Itens
    let subtotal = 0;
    const normalizedItems = items.map((it: any, index: number) => {
      const q = Number(it.quantity) || 1;
      const unitP = Number(it.price) || 0;
      let optionsTotal = 0;
      const selectedOpts = (it.selectedOptions || it.options || []).map((o: any) => {
        const optP = Number(o.price) || 0;
        optionsTotal += optP;
        return {
          id: o.id || `opt_${index}_${Math.random().toString(36).substring(2, 6)}`,
          name: o.name || 'Adicional',
          price: optP
        };
      });

      const itemTotal = (unitP + optionsTotal) * q;
      subtotal += itemTotal;

      return {
        id: it.id || it.productId || `item_${index}_${Date.now()}`,
        productId: it.productId || it.id || `prod_${index}`,
        name: it.name || "Item Zupi Delivery",
        quantity: q,
        price: unitP,
        category: it.category || "Geral",
        observation: it.observation || it.notes || "",
        selectedOptions: selectedOpts
      };
    });

    const deliveryFee = deliveryType === 'delivery' ? (Number(delivery?.fee) || 5.00) : 0;
    const discount = Number(inputDiscount) || 0;
    const total = Math.max(0, subtotal + deliveryFee - discount);

    // Mapeamento e Normalização da Forma de Pagamento
    const rawMethod = (payment?.method || 'PIX').toLowerCase();
    let paymentMethod = 'pix';
    if (rawMethod.includes('cred') || rawMethod.includes('credit')) paymentMethod = 'cartao_credito';
    else if (rawMethod.includes('deb') || rawMethod.includes('debit')) paymentMethod = 'cartao_debito';
    else if (rawMethod.includes('din') || rawMethod.includes('cash')) paymentMethod = 'dinheiro';
    else if (rawMethod.includes('vale') || rawMethod.includes('voucher') || rawMethod.includes('ticket')) paymentMethod = 'vale_refeicao';

    const isPrepaid = payment?.prepaid === true || paymentMethod === 'pix' || (payment?.status === 'paid');

    const now = new Date();
    const orderId = `zupi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const displayId = `ZP${Date.now().toString().slice(-4)}`;

    const orderDoc: Record<string, any> = {
      id: orderId,
      docId: orderId,
      tenantId: merchantId,
      displayId: displayId,
      tableNumber: deliveryType === 'takeout' ? 'Balcão / Zupi' : null,
      type: deliveryType,
      status: "pending",
      source: "marketplace",
      partnerApp: "zupi",
      partnerName: "Zupi Delivery",
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: formattedAddress,
      customerDocument: customer.document || "",
      items: normalizedItems,
      total: Number(total.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      coupon: coupon || "",
      paymentMethod: paymentMethod,
      paymentStatus: isPrepaid ? "paid" : "pending",
      changeFor: Number(payment?.changeFor) || 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      marketplaceFee: Number((total * 0.025).toFixed(2)), // Comissao de 2.5% do Zupi Delivery
      externalId: externalId || orderId,
      observation: notes || "",
      metadata: {
        channel: "zupi_delivery",
        app: "Zupi Delivery",
        clientVersion: (req.headers["x-app-version"] as string) || "1.0.0",
        customerDetails: customer,
        deliveryDetails: delivery || null,
        paymentDetails: payment || null
      }
    };

    // Função de limpeza recursiva de undefined para evitar erros no Firestore
    const cleanDoc = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) return obj.map(cleanDoc);
      if (typeof obj === 'object') {
        const out: any = {};
        for (const k of Object.keys(obj)) {
          if (obj[k] !== undefined) {
            out[k] = cleanDoc(obj[k]);
          }
        }
        return out;
      }
      return obj;
    };

    // Gravação no Firestore na coleção de orders
    const orderRef = clientDoc(db, "orders", orderId);
    await clientSetDoc(orderRef, cleanDoc(orderDoc));

    // Gravação de Evento na Fila de Integração
    const eventId = `evt_zupi_${Date.now()}`;
    const integrationEvent = {
      id: eventId,
      tenantId: merchantId,
      eventType: "ORDER_CREATED",
      status: "PENDING",
      createdAt: now.toISOString(),
      order: {
        id: orderId,
        displayId: displayId,
        type: deliveryType.toUpperCase(),
        customer: {
          name: customer.name,
          phone: customer.phone,
          address: formattedAddress
        },
        items: normalizedItems,
        total: total,
        paymentMethod: paymentMethod
      }
    };

    await clientSetDoc(clientDoc(db, "integration_events", eventId), cleanDoc(integrationEvent));

    // Registro/Atualização do Cliente na coleção 'customers'
    try {
      const cleanPhone = (customer.phone || '').replace(/\D/g, '');
      if (cleanPhone) {
        const customerId = `cust_${merchantId}_${cleanPhone}`;
        const custRef = clientDoc(db, "customers", customerId);
        await clientSetDoc(custRef, cleanDoc({
          id: customerId,
          tenantId: merchantId,
          name: customer.name,
          phone: customer.phone,
          document: customer.document || "",
          address: formattedAddress,
          email: customer.email || "",
          source: "zupi_delivery",
          lastOrderAt: now.toISOString(),
          crmStatus: "active"
        }), { merge: true });
      }
    } catch (_custErr) {
      console.warn("[Marketplace API] Aviso ao cadastrar cliente:", _custErr);
    }

    console.log(`[Marketplace API] 🚀 Novo Pedido #${displayId} recebido do Zupi Delivery para o Tenant: ${merchantId}`);

    return res.status(201).json({
      success: true,
      partner: "Zupi Delivery",
      orderId: orderId,
      displayId: displayId,
      status: "pending",
      statusLabel: "Recebido e aguardando confirmação da cozinha",
      total: Number(total.toFixed(2)),
      createdAt: now.toISOString(),
      estimatedDeliveryTime: "35-50 min",
      trackingUrl: `/api/v1/marketplace/orders/${orderId}`,
      message: "Pedido transmitido com sucesso para a cozinha do estabelecimento!"
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Marketplace API] Erro ao criar pedido:", err);
    return res.status(500).json({ error: "Erro ao processar pedido do marketplace.", details: errorMessage });
  }
});

// Rastreamento em Tempo Real do Pedido (GET /api/v1/marketplace/orders/:orderId)
marketplaceApiRouter.get("/orders/:orderId", async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const orderRef = clientDoc(db, "orders", orderId);
    const orderSnap = await getClientDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ error: "Pedido não encontrado no marketplace." });
    }

    const data = orderSnap.data();
    const status = data.status || "pending";

    // Mapa de Etapas Humanizadas para a tela de rastreamento do Zupi Delivery
    let statusStep = 1;
    let statusLabel = "Aguardando confirmação";
    let statusDescription = "O estabelecimento já recebeu seu pedido e vai iniciar o preparo em breve.";

    if (status === "preparing") {
      statusStep = 2;
      statusLabel = "Em preparo na cozinha";
      statusDescription = "Seu pedido está sendo preparado pelos chefs do restaurante.";
    } else if (status === "ready") {
      statusStep = 3;
      statusLabel = "Pronto para envio / retirada";
      statusDescription = "Pedido finalizado! Aguardando coleta do entregador.";
    } else if (status === "delivering") {
      statusStep = 4;
      statusLabel = "Saiu para entrega";
      statusDescription = data.courierName ? `O entregador ${data.courierName} está a caminho do seu endereço.` : "O entregador está a caminho do seu endereço.";
    } else if (status === "delivered" || status === "finished") {
      statusStep = 5;
      statusLabel = "Entregue";
      statusDescription = "Pedido entregue com sucesso! Bom apetite.";
    } else if (status === "cancelled") {
      statusStep = 0;
      statusLabel = "Cancelado";
      statusDescription = data.cancelReason || "Este pedido foi cancelado.";
    }

    return res.json({
      success: true,
      partner: "Zupi Delivery",
      order: {
        id: orderSnap.id,
        displayId: data.displayId || `#${orderSnap.id.slice(-4)}`,
        status: status,
        statusStep: statusStep,
        statusLabel: statusLabel,
        statusDescription: statusDescription,
        type: data.type || "delivery",
        merchantId: data.tenantId,
        customer: {
          name: data.customerName,
          phone: data.customerPhone,
          address: data.customerAddress
        },
        items: data.items || [],
        totals: {
          subtotal: Number((data.total - (data.deliveryFee || 0) + (data.discount || 0)).toFixed(2)),
          deliveryFee: data.deliveryFee || 0,
          discount: data.discount || 0,
          total: data.total
        },
        payment: {
          method: data.paymentMethod,
          status: data.paymentStatus,
          changeFor: data.changeFor
        },
        courier: data.courierName ? {
          name: data.courierName,
          phone: data.courierPhone || ""
        } : null,
        timestamps: {
          createdAt: data.createdAt,
          acceptedAt: data.acceptedAt || null,
          readyAt: data.readyAt || null,
          dispatchedAt: data.dispatchedAt || null,
          deliveredAt: data.deliveredAt || null,
          cancelledAt: data.cancelledAt || null
        },
        cancelReason: data.cancelReason || null,
        estimatedDeliveryTime: data.estimatedTime || "35-50 min"
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao consultar status do pedido.", details: errorMessage });
  }
});

// Listar Histórico de Pedidos de um Cliente ou Lojista (GET /api/v1/marketplace/orders)
marketplaceApiRouter.get("/orders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerPhone, merchantId: queryMerchant, limit: queryLimit } = req.query;
    const merchantId = req.merchantId || (queryMerchant as string);

    const ordersRef = getClientCollection(db, "orders");
    let q;

    if (customerPhone && typeof customerPhone === "string") {
      // Filtrar por telefone do cliente (Tela 'Meus Pedidos' no Zupi Delivery)
      q = clientQuery(
        ordersRef,
        clientWhere("customerPhone", "==", customerPhone),
        clientLimit(Number(queryLimit) || 20)
      );
    } else if (merchantId) {
      // Filtrar por estabelecimento
      q = clientQuery(
        ordersRef,
        clientWhere("tenantId", "==", merchantId),
        clientLimit(Number(queryLimit) || 30)
      );
    } else {
      return res.status(400).json({ error: "Informe 'customerPhone' ou 'merchantId' para consultar os pedidos." });
    }

    const snapshot = await getClientDocs(q);
    const orders = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        displayId: data.displayId || `#${d.id.slice(-4)}`,
        status: data.status,
        total: data.total,
        type: data.type,
        createdAt: data.createdAt,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        itemsCount: (data.items || []).length,
        items: data.items || []
      };
    });

    return res.json({
      success: true,
      partner: "Zupi Delivery",
      count: orders.length,
      orders
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao listar pedidos do marketplace.", details: errorMessage });
  }
});

// =========================================================================
// ROTAS DE SINCRONIZAÇÃO E EVENTOS SAIPOS / POS
// =========================================================================

// 1. Polling de Eventos (GET /api/v1/marketplace/events:poll)
marketplaceApiRouter.get("/events:poll", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    console.log(`[Marketplace API] Polling de Eventos isolado para Tenant: ${merchantId}`);

    const eventsRef = getClientCollection(db, "integration_events");
    
    // Consulta estrita isolada por tenantId
    const q = clientQuery(
      eventsRef,
      clientWhere("tenantId", "==", merchantId),
      clientWhere("status", "==", "PENDING"),
      clientLimit(50)
    );

    const snapshot = await getClientDocs(q);

    const events = snapshot.docs.map(d => ({
      eventId: d.id,
      eventType: d.data().eventType || "ORDER_CREATED",
      createdAt: d.data().createdAt || new Date().toISOString(),
      order: d.data().order || null
    }));

    return res.json({
      success: true,
      merchantId,
      eventsCount: events.length,
      events
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Marketplace API] Erro no polling de eventos:", err);
    return res.status(500).json({ error: "Erro ao consultar fila de eventos do Marketplace", details: errorMessage });
  }
});

// 2. Confirmação de Recebimento de Eventos (POST /api/v1/marketplace/events/ack)
marketplaceApiRouter.post("/events/ack", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { eventIds } = req.body;
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: "Array 'eventIds' é obrigatório." });
    }

    const now = new Date().toISOString();
    let acknowledgedCount = 0;

    for (const id of eventIds) {
      try {
        const docRef = clientDoc(db, "integration_events", id);
        const docSnap = await getClientDoc(docRef);
        if (docSnap.exists()) {
          const evData = docSnap.data();
          // Validação anti-IDOR: o evento deve pertencer ao lojista autenticado
          if (evData.tenantId && evData.tenantId !== merchantId) {
            console.warn(`[Marketplace API ACK Security] Tentativa de ACK em evento de outro tenant (${evData.tenantId}) por ${merchantId}`);
            continue;
          }
          await clientUpdateDoc(docRef, {
            status: "ACKNOWLEDGED",
            acknowledgedAt: now
          });
          acknowledgedCount++;
        }
      } catch (_docErr) {
        console.warn(`[Marketplace API] Erro ao dar ACK no evento ${id}:`, _docErr);
      }
    }

    return res.json({
      success: true,
      acknowledgedCount,
      timestamp: now
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao confirmar eventos.", details: errorMessage });
  }
});

// 3. Confirmar Pedido na Cozinha (POST /api/v1/marketplace/orders/:orderId/confirm)
marketplaceApiRouter.post("/orders/:orderId/confirm", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { orderId } = req.params;
    const now = new Date();

    const orderRef = clientDoc(db, "orders", orderId);
    const orderSnap = await getClientDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const orderData = orderSnap.data();
    // Validação estrita de isolamento de dados (Anti-IDOR)
    if (orderData.tenantId && orderData.tenantId !== merchantId) {
      return res.status(403).json({ error: "Acesso negado: o pedido pertence a outro estabelecimento." });
    }

    await clientSetDoc(orderRef, {
      status: "preparing",
      acceptedAt: now,
      updatedAt: now,
      externalSync: {
        system: "SAIPOS_ERP",
        status: "CONFIRMED_BY_POS",
        timestamp: now.toISOString()
      }
    }, { merge: true });

    return res.json({
      success: true,
      orderId,
      status: "preparing",
      message: "Pedido aceito e enviado para preparação na cozinha via Saipos ERP."
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao confirmar pedido.", details: errorMessage });
  }
});

// 4. Despachar Pedido para Entrega (POST /api/v1/marketplace/orders/:orderId/dispatch)
marketplaceApiRouter.post("/orders/:orderId/dispatch", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { orderId } = req.params;
    const { courierName, courierPhone } = req.body;
    const now = new Date();

    const orderRef = clientDoc(db, "orders", orderId);
    const orderSnap = await getClientDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const orderData = orderSnap.data();
    // Validação estrita de isolamento de dados (Anti-IDOR)
    if (orderData.tenantId && orderData.tenantId !== merchantId) {
      return res.status(403).json({ error: "Acesso negado: o pedido pertence a outro estabelecimento." });
    }

    await clientSetDoc(orderRef, {
      status: "delivering",
      dispatchedAt: now,
      updatedAt: now,
      courierName: courierName || "Entregador Saipos",
      courierPhone: courierPhone || "",
      externalSync: {
        system: "SAIPOS_ERP",
        status: "DISPATCHED_BY_POS",
        timestamp: now.toISOString()
      }
    }, { merge: true });

    return res.json({
      success: true,
      orderId,
      status: "delivering",
      message: "Pedido despachado para entrega no Marketplace."
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao despachar pedido.", details: errorMessage });
  }
});

// 5. Marcar Pedido Pronto (POST /api/v1/marketplace/orders/:orderId/ready)
marketplaceApiRouter.post("/orders/:orderId/ready", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { orderId } = req.params;
    const now = new Date();

    const orderRef = clientDoc(db, "orders", orderId);
    const orderSnap = await getClientDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const orderData = orderSnap.data();
    // Validação estrita de isolamento de dados (Anti-IDOR)
    if (orderData.tenantId && orderData.tenantId !== merchantId) {
      return res.status(403).json({ error: "Acesso negado: o pedido pertence a outro estabelecimento." });
    }

    await clientSetDoc(orderRef, {
      status: "ready",
      readyAt: now,
      updatedAt: now,
    }, { merge: true });

    return res.json({
      success: true,
      orderId,
      status: "ready",
      message: "Pedido marcado como pronto no Marketplace."
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao atualizar status.", details: errorMessage });
  }
});

// 6. Cancelar Pedido (POST /api/v1/marketplace/orders/:orderId/cancel)
marketplaceApiRouter.post("/orders/:orderId/cancel", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { orderId } = req.params;
    const { reason, code } = req.body;
    const now = new Date();

    const orderRef = clientDoc(db, "orders", orderId);
    const orderSnap = await getClientDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const orderData = orderSnap.data();
    // Validação estrita de isolamento de dados (Anti-IDOR)
    if (orderData.tenantId && orderData.tenantId !== merchantId) {
      return res.status(403).json({ error: "Acesso negado: o pedido pertence a outro estabelecimento." });
    }

    await clientSetDoc(orderRef, {
      status: "cancelled",
      cancelReason: reason || "Cancelado pelo sistema parceiro/Saipos",
      cancelCode: code || "POS_CANCELLED",
      cancelledAt: now,
      updatedAt: now
    }, { merge: true });

    return res.json({
      success: true,
      orderId,
      status: "cancelled",
      message: "Pedido cancelado com sucesso."
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao cancelar pedido.", details: errorMessage });
  }
});

// 7. Cardápio & SKUs Isolado por Tenant (GET /api/v1/marketplace/catalog)
marketplaceApiRouter.get("/catalog", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const productsRef = getClientCollection(db, "products");
    
    // Consulta estrita isolada por tenantId sem fallback para outros estabelecimentos
    const q = clientQuery(
      productsRef,
      clientWhere("tenantId", "==", merchantId),
      clientLimit(300)
    );
    const snapshot = await getClientDocs(q);

    let items = snapshot.docs.map(d => {
      const p = d.data();
      const unitPrice = typeof p.price === 'number' ? p.price : 0;
      const promoP = typeof p.promoPrice === 'number' ? p.promoPrice : null;
      const isPromo = p.isPromotional === true && promoP !== null;

      return {
        id: d.id,
        externalCode: p.externalCode || p.barcode || d.id,
        name: p.name || "Produto Sem Nome",
        description: p.description || "",
        category: p.category || "Geral",
        price: isPromo ? promoP : unitPrice,
        originalPrice: unitPrice,
        isPromotional: isPromo,
        image: p.image || "",
        imageUrl: p.image || "",
        available: p.active !== false && p.isAvailableOnline !== false,
        options: (p.options || []).map((opt: Record<string, unknown>) => ({
          id: opt.id,
          externalCode: opt.externalCode || opt.id,
          name: opt.name,
          price: opt.price || 0
        })),
        optionCategories: p.optionCategories || []
      };
    });

    // Se o estabelecimento ainda não tiver produtos cadastrados, fornecer menu inicial para testes do Zupi Delivery
    if (items.length === 0 && (merchantId === 'lojista' || merchantId === 'GLOBAL')) {
      items = [
        {
          id: 'zupi_prod_01',
          externalCode: 'BURGER_ART',
          name: 'Burger Zupi Premium Artesanal',
          description: 'Pão brioche selado na manteiga, blend de 180g de costela angus, queijo cheddar inglês derretido, fatias de bacon crocante e maionese defumada da casa.',
          category: 'Burgers Artesanais',
          price: 34.90,
          originalPrice: 39.90,
          isPromotional: true,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
          imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
          available: true,
          options: [
            { id: 'opt_bacon', externalCode: 'OPT_BACON', name: 'Bacon Extra Fatiado', price: 5.00 },
            { id: 'opt_cheddar', externalCode: 'OPT_CHEDDAR', name: 'Dobro de Queijo Cheddar', price: 4.50 },
            { id: 'opt_onion', externalCode: 'OPT_ONION', name: 'Cebola Caramelizada', price: 3.50 }
          ],
          optionCategories: []
        },
        {
          id: 'zupi_prod_02',
          externalCode: 'BURGER_SMASH',
          name: 'Duplo Smash Cheddar Bacon',
          description: 'Dois burgers smash de 90g com crostinha crocante, quatro fatias de cheddar derretido e molho especial.',
          category: 'Burgers Artesanais',
          price: 29.90,
          originalPrice: 29.90,
          isPromotional: false,
          image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80',
          imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80',
          available: true,
          options: [],
          optionCategories: []
        },
        {
          id: 'zupi_prod_03',
          externalCode: 'BATATA_RUSTICA',
          name: 'Batata Rústica com Alecrim e Páprica',
          description: 'Porção generosa de batatas rústicas douradas com alecrim fresco e toque de páprica defumada.',
          category: 'Acompanhamentos',
          price: 18.90,
          originalPrice: 18.90,
          isPromotional: false,
          image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
          imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
          available: true,
          options: [],
          optionCategories: []
        },
        {
          id: 'zupi_prod_04',
          externalCode: 'BEBIDA_COCA',
          name: 'Coca-Cola Original 350ml Lata',
          description: 'Lata de 350ml bem gelada.',
          category: 'Bebidas',
          price: 7.00,
          originalPrice: 7.00,
          isPromotional: false,
          image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
          imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
          available: true,
          options: [],
          optionCategories: []
        }
      ];
    }

    // Agrupamento por categorias para o Zupi Delivery construir o menu tabulado
    const categoriesMap: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.category || 'Geral';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(item);
    }

    const categories = Object.keys(categoriesMap).map(catName => ({
      name: catName,
      count: categoriesMap[catName].length,
      items: categoriesMap[catName]
    }));

    return res.json({
      success: true,
      partner: "Zupi Delivery",
      merchantId,
      totalItems: items.length,
      categories,
      catalog: items,
      items: items
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao listar cardápio do Marketplace", details: errorMessage });
  }
});

// 8. Atualizar Disponibilidade/Preço de Item com Checagem Anti-IDOR (PATCH /api/v1/marketplace/catalog/items/:itemId)
marketplaceApiRouter.patch("/catalog/items/:itemId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { itemId } = req.params;
    const { available, price } = req.body;

    const docRef = clientDoc(db, "products", itemId);
    const docSnap = await getClientDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Item do catálogo não encontrado." });
    }

    const prodData = docSnap.data();
    // Validação estrita de isolamento de dados (Anti-IDOR)
    if (prodData.tenantId && prodData.tenantId !== merchantId) {
      return res.status(403).json({ error: "Acesso negado: o item do cardápio pertence a outro estabelecimento." });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof available === "boolean") {
      updateData.active = available;
      updateData.isAvailableOnline = available;
    }
    if (typeof price === "number") {
      updateData.price = price;
    }

    await clientSetDoc(docRef, updateData, { merge: true });

    return res.json({
      success: true,
      itemId,
      updated: updateData
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao atualizar item do catálogo.", details: errorMessage });
  }
});

// 9. Status da Loja no Marketplace (GET & POST /api/v1/marketplace/merchant/status)
marketplaceApiRouter.get("/merchant/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const settingsDoc = await getClientDoc(clientDoc(db, "settings", merchantId));
    
    let isClosed = false;
    if (settingsDoc.exists()) {
      isClosed = settingsDoc.data()?.isStoreForceClosed === true;
    }

    return res.json({
      success: true,
      merchantId,
      status: isClosed ? "CLOSED" : "OPEN",
      isClosed: isClosed,
      isStoreForceClosed: isClosed
    });
  } catch {
    return res.json({ success: true, status: "OPEN", isClosed: false, isStoreForceClosed: false });
  }
});

marketplaceApiRouter.post("/merchant/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const { status } = req.body;
    
    const isClosed = status === "CLOSED";
    const settingsRef = clientDoc(db, "settings", merchantId);
    
    await clientSetDoc(settingsRef, {
      isStoreForceClosed: isClosed,
      isStoreForceOpen: !isClosed,
      updatedAt: new Date()
    }, { merge: true });

    return res.json({
      success: true,
      merchantId,
      status: isClosed ? "CLOSED" : "OPEN"
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao atualizar status da loja.", details: errorMessage });
  }
});

// 10. Disparador de Evento de Teste para o Saipos / Integrador (POST /api/v1/marketplace/test-event)
marketplaceApiRouter.post("/test-event", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.body.merchantId || req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ error: "Identificador do estabelecimento (merchantId) é obrigatório." });
    }

    const now = new Date();
    const orderId = `test_ord_${Date.now().toString().slice(-6)}`;
    const eventId = `evt_saipos_${Date.now()}`;

    const testEvent = {
      id: eventId,
      tenantId: merchantId,
      eventType: "ORDER_CREATED",
      status: "PENDING",
      createdAt: now.toISOString(),
      order: {
        id: orderId,
        displayId: orderId.slice(-4),
        createdAt: now.toISOString(),
        type: "DELIVERY",
        merchant: {
          id: merchantId,
          name: "Restaurante Teste Saipos"
        },
        customer: {
          id: "cust_saipos_123",
          name: "Cliente Teste Saipos ERP",
          phone: "+5511988887777",
          document: "123.456.789-00"
        },
        deliveryAddress: {
          streetName: "Avenida Paulista",
          streetNumber: "1000",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          postalCode: "01310-100",
          complement: "Apto 101"
        },
        items: [
          {
            id: "prod_01",
            externalCode: "SKU-BURG-01",
            name: "X-Burger Especial Saipos",
            quantity: 2,
            unitPrice: 28.50,
            totalPrice: 57.00,
            observation: "Sem cebola, ponto da carne ao ponto"
          },
          {
            id: "prod_02",
            externalCode: "SKU-BEB-01",
            name: "Refrigerante Lata 350ml",
            quantity: 2,
            unitPrice: 7.50,
            totalPrice: 15.00
          }
        ],
        payments: {
          prepaid: true,
          methods: [
            {
              method: "PIX",
              value: 77.00,
              currency: "BRL"
            }
          ]
        },
        total: {
          subTotal: 72.00,
          deliveryFee: 5.00,
          discount: 0.00,
          orderAmount: 77.00
        }
      }
    };

    await clientSetDoc(clientDoc(db, "integration_events", eventId), testEvent);

    return res.json({
      success: true,
      eventId,
      orderId,
      merchantId,
      message: "🚀 Pedido de teste criado na fila de integração com sucesso! Faça o Polling no Saipos para recebê-lo.",
      event: testEvent
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Marketplace API] Erro ao criar evento de teste:", err);
    return res.status(500).json({ error: "Erro ao gerar pedido de teste.", details: errorMessage });
  }
});

// 11. Histórico de Eventos Isolado por Tenant (GET /api/v1/marketplace/events/history)
marketplaceApiRouter.get("/events/history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = requireMerchant(req, res);
    if (!merchantId) return;

    const eventsRef = getClientCollection(db, "integration_events");

    const q = clientQuery(
      eventsRef,
      clientWhere("tenantId", "==", merchantId),
      clientLimit(30)
    );

    const snapshot = await getClientDocs(q);
    const events = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    return res.json({
      success: true,
      merchantId,
      events
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao buscar histórico de eventos.", details: errorMessage });
  }
});
