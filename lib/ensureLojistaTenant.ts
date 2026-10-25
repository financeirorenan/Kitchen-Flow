import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { INITIAL_PRODUCTS, INITIAL_TABLES, CATEGORIES } from '../constants';

export function restoreCategoryForProduct(p: { id?: string; name?: string; category?: string }): string {
  if (p.category && p.category !== 'Geral' && p.category.trim() !== '') {
    return p.category;
  }
  const nameLower = (p.name || '').toLowerCase();
  const idLower = (p.id || '').toLowerCase();

  if (idLower.includes('e1') || idLower.includes('e2') || idLower.includes('e3') || idLower.includes('e4') || idLower.includes('e5') ||
      nameLower.includes('bolinha') || nameLower.includes('batata frita') || nameLower.includes('batata chips') || nameLower.includes('torrada') || nameLower.includes('stick')) {
    return 'Entradas';
  }
  if (idLower.includes('b1') || idLower.includes('b2') || nameLower.includes('buffet')) {
    return 'Buffet';
  }
  if (idLower.includes('pp') || nameLower.includes('tradicional') || nameLower.includes('parmegiana') || nameLower.includes('grelhado') || nameLower.includes('milanesa') || nameLower.includes('strogonoff') || nameLower.includes('linguiça') || nameLower.includes('omelete') || nameLower.includes('salada')) {
    return 'Pratos Principais';
  }
  if (idLower.includes('l1') || idLower.includes('l2') || idLower.includes('l3') || idLower.includes('l4') || idLower.includes('l5') || idLower.includes('l6') || nameLower.includes('x-') || nameLower.includes('misto') || nameLower.includes('burguer')) {
    return 'Lanches';
  }
  if (idLower.includes('br') || nameLower.includes('batatas recheadas') || nameLower.includes('3 queijos') || (nameLower.includes('presunto') && nameLower.includes('batata'))) {
    return 'Batatas Recheadas';
  }
  if (idLower.includes('p1') || idLower.includes('p2') || idLower.includes('p3') || idLower.includes('p4') || idLower.includes('p5') || idLower.includes('p6') || idLower.includes('p7') || idLower.includes('p8') || idLower.includes('p9') || nameLower.includes('pastel') || nameLower.includes('charutinho')) {
    return 'Pasteis';
  }
  if (idLower.includes('d1') || idLower.includes('d2') || idLower.includes('d3') || idLower.includes('d4') || idLower.includes('d5') || idLower.includes('d6') || idLower.includes('d7') || idLower.includes('d8') || idLower.includes('d9') || nameLower.includes('refrigerante') || nameLower.includes('suco') || nameLower.includes('água') || nameLower.includes('h2o') || nameLower.includes('coca') || nameLower.includes('guaraná')) {
    return 'Bebidas';
  }

  const init = INITIAL_PRODUCTS.find(item => item.name.toLowerCase() === nameLower);
  if (init) return init.category;

  return 'Pratos Principais';
}

const ensuredTenantsSet = new Set<string>();

export async function ensureLojistaTenantWithData(targetTenantId?: string) {
  if (!auth.currentUser?.uid) return;
  const tid = (targetTenantId || '').trim();
  if (!tid || tid === 'GLOBAL' || tid === 'default-tenant') return;

  const cacheKey = `kf_tenant_ensured_v4_${tid}`;
  if (ensuredTenantsSet.has(tid)) return;
  if (typeof window !== 'undefined' && sessionStorage.getItem(cacheKey)) {
    ensuredTenantsSet.add(tid);
    return;
  }
  ensuredTenantsSet.add(tid);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(cacheKey, 'true');
    } catch {}
  }

  try {
    // Se NÃO for o tenant de demonstração 'lojista', JAMAIS injetar categorias, produtos ou mesas padrão!
    if (tid !== 'lojista') {
      const cleanKey = `kf_tenant_sanitized_clean_v4_${tid}`;
      if (typeof window !== 'undefined' && !localStorage.getItem(cleanKey)) {
        try {
          const tenantProductsQuery = query(collection(db, 'products'), where('tenantId', '==', tid));
          const tenantProductsSnap = await getDocs(tenantProductsQuery);

          // Se a loja ainda não tem nenhum produto cadastrado pelo cliente, removemos categorias/mesas fantasmas herdadas do bug anterior
          if (tenantProductsSnap.empty) {
            const settingsRef = doc(db, 'settings', tid);
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
              const sData = settingsSnap.data();
              const curCats: string[] = Array.isArray(sData.productCategories) ? sData.productCategories : [];
              const isDefaultPollutedCats =
                curCats.length === CATEGORIES.length &&
                CATEGORIES.every(c => curCats.includes(c));

              if (isDefaultPollutedCats || curCats.includes('Geral')) {
                await setDoc(settingsRef, {
                  productCategories: [],
                  rawMaterialCategories: [],
                  updatedAt: new Date()
                }, { merge: true });
              }
            }

            const tenantTablesQuery = query(collection(db, 'diningTables'), where('tenantId', '==', tid));
            const tenantTablesSnap = await getDocs(tenantTablesQuery);
            if (!tenantTablesSnap.empty && tenantTablesSnap.size === INITIAL_TABLES.length) {
              const allAvailableAndEmpty = tenantTablesSnap.docs.every(d => {
                const data = d.data();
                return data.status === 'available' && (!data.items || data.items.length === 0) && (!data.total || data.total === 0);
              });
              if (allAvailableAndEmpty) {
                const batch = writeBatch(db);
                tenantTablesSnap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            }
          }
          localStorage.setItem(cleanKey, 'true');
        } catch (cleanErr) {
          console.warn("Aviso ao sanitizar ambiente inicial do tenant:", cleanErr);
        }
      }
      return;
    }

    // Abaixo: exclusivo para o tenant de demonstração 'lojista'
    const lojistaRef = doc(db, 'tenants', 'lojista');
    const lojistaSnap = await getDoc(lojistaRef);
    if (!lojistaSnap.exists()) {
      await setDoc(lojistaRef, {
        id: 'lojista',
        clientNumber: 1,
        name: 'KitchenFlow',
        companyName: 'KitchenFlow',
        slug: 'lojista',
        category: 'Alimentação / Delivery',
        ownerId: 'lojista@kitchenflow.app',
        email: 'atendimento@kitchenflow.app',
        phone: '(11) 99999-8888',
        planId: 'ultimate',
        status: 'active',
        subscription: {
          planId: 'ultimate',
          status: 'active',
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          allowedModules: [
            'merchant-copilot', 'pos', 'tables_manage', 'delivery', 
            'inventory', 'cmv', 'finance', 'kds', 'kds-kitchen-only', 
            'menu_digital_config', 'digital_menu', 'marketplace', 'ai_auditor', 'users', 'logs'
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
    }

    const settingsRef = doc(db, 'settings', 'lojista');
    const settingsSnap = await getDoc(settingsRef);
    const sData = settingsSnap.exists() ? settingsSnap.data() : {};
    const curCats = sData.productCategories;

    if (!settingsSnap.exists() || !Array.isArray(curCats)) {
      await setDoc(settingsRef, {
        productCategories: CATEGORIES,
        updatedAt: new Date()
      }, { merge: true });
    }

    const tenantProductsQuery = query(collection(db, 'products'), where('tenantId', '==', 'lojista'));
    const tenantProductsSnap = await getDocs(tenantProductsQuery);
    if (tenantProductsSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach(product => {
        const newId = `lojista_${product.id}`;
        batch.set(doc(db, 'products', newId), {
          ...product,
          id: newId,
          tenantId: 'lojista',
          updatedAt: new Date()
        });
      });
      await batch.commit();
    }
  } catch (err: any) {
    if (err?.message?.includes('Quota limit exceeded') || err?.code === 'resource-exhausted' || err?.code === 'permission-denied') {
      console.warn("Aviso de sincronização inicial de tenant:", err?.message || err);
    } else {
      console.error("Error ensuring tenant defaults:", err);
    }
  }
}

