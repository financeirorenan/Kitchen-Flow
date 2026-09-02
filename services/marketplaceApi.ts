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
  const mId = req.merchantId || (req.query.tenantId as string) || (req.headers["x-merchant-id"] as string);
  if (!mId) {
    res.status(401).json({ error: "Identificação do estabelecimento (x-merchant-id ou tenantId) é obrigatória." });
    return null;
  }
  return mId;
};

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
      clientLimit(200)
    );
    const snapshot = await getClientDocs(q);

    const items = snapshot.docs.map(d => {
      const p = d.data();
      return {
        id: d.id,
        externalCode: p.externalCode || p.barcode || d.id,
        name: p.name || "Produto Sem Nome",
        description: p.description || "",
        category: p.category || "Geral",
        price: p.price || 0,
        available: p.active !== false && p.isAvailableOnline !== false,
        options: (p.options || []).map((opt: Record<string, unknown>) => ({
          id: opt.id,
          externalCode: opt.externalCode || opt.id,
          name: opt.name,
          price: opt.price || 0
        }))
      };
    });

    return res.json({
      success: true,
      merchantId,
      totalItems: items.length,
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
