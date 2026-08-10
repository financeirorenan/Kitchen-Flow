import { db } from '../firebase';
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

let isLojistaTenantEnsured = false;

export async function ensureLojistaTenantWithData() {
  if (isLojistaTenantEnsured) return;
  isLojistaTenantEnsured = true;
  try {
    const lojistaRef = doc(db, 'tenants', 'lojista');
    const lojistaSnap = await getDoc(lojistaRef);

    let vivaTenantData: any = null;
    try {
      const vivaSnap = await getDoc(doc(db, 'tenants', 'HCL1177LRQVPEKCTYRAHU7IGBQ42'));
      if (vivaSnap.exists()) {
        vivaTenantData = vivaSnap.data();
      }
    } catch (e) {
      console.warn("Could not fetch viva tenant:", e);
    }

    // 1. Ensure 'tenants/lojista' document exists in Firestore
    if (!lojistaSnap.exists()) {
      await setDoc(lojistaRef, {
        id: 'lojista',
        clientNumber: 1,
        name: 'KitchenFlow',
        companyName: 'KitchenFlow',
        slug: 'lojista',
        category: vivaTenantData?.category || 'Alimentação / Delivery',
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

    // 2. Ensure settings/lojista and settings/HCL1177LRQVPEKCTYRAHU7IGBQ42 have correct productCategories
    const tenantIdsToRepair = ['lojista', 'HCL1177LRQVPEKCTYRAHU7IGBQ42'];
    for (const tid of tenantIdsToRepair) {
      const settingsRef = doc(db, 'settings', tid);
      const settingsSnap = await getDoc(settingsRef);
      let sData = settingsSnap.exists() ? settingsSnap.data() : {};

      const curCats = sData.productCategories;
      const needsRestore = !curCats || !Array.isArray(curCats) || curCats.length === 0 || curCats.includes('Geral');

      let updatedDigitalMenu = sData.digitalMenu || {};
      let orderChanged = false;
      if (updatedDigitalMenu.categoryOrder && Array.isArray(updatedDigitalMenu.categoryOrder)) {
        if (updatedDigitalMenu.categoryOrder.includes('Geral')) {
          updatedDigitalMenu.categoryOrder = updatedDigitalMenu.categoryOrder.filter((c: string) => c !== 'Geral');
          orderChanged = true;
        }
      }
      if (updatedDigitalMenu.hiddenCategories && Array.isArray(updatedDigitalMenu.hiddenCategories)) {
        if (updatedDigitalMenu.hiddenCategories.includes('Geral')) {
          updatedDigitalMenu.hiddenCategories = updatedDigitalMenu.hiddenCategories.filter((c: string) => c !== 'Geral');
          orderChanged = true;
        }
      }

      if (needsRestore || orderChanged || !settingsSnap.exists()) {
        const payload: any = {
          productCategories: CATEGORIES,
          digitalMenu: updatedDigitalMenu,
          updatedAt: new Date()
        };
        if (!sData.admin) {
          payload.admin = { companyName: tid === 'lojista' ? 'KitchenFlow' : 'Viva La Fome' };
        }
        await setDoc(settingsRef, payload, { merge: true });
      }
    }

    // 3. Restore product categories for products in Firestore that have category === 'Geral' or empty
    const allProductsSnap = await getDocs(collection(db, 'products'));
    if (!allProductsSnap.empty) {
      const batch = writeBatch(db);
      let hasUpdates = false;
      allProductsSnap.docs.forEach(docSnap => {
        const pData = docSnap.data();
        if (pData.category === 'Geral' || !pData.category) {
          const restoredCat = restoreCategoryForProduct(pData);
          batch.update(docSnap.ref, {
            category: restoredCat,
            updatedAt: new Date()
          });
          hasUpdates = true;
        }
      });
      if (hasUpdates) {
        await batch.commit();
        console.log("Restored product categories in Firestore for products with invalid/Geral category.");
      }
    } else {
      // Seed lojista products if empty
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

    // 4. Copy Dining Tables from Viva or INITIAL_TABLES if lojista has 0 tables
    const lojistaTablesQuery = query(collection(db, 'diningTables'), where('tenantId', '==', 'lojista'));
    const lojistaTablesSnap = await getDocs(lojistaTablesQuery);

    if (lojistaTablesSnap.empty) {
      const vivaTablesQuery = query(collection(db, 'diningTables'), where('tenantId', '==', 'HCL1177LRQVPEKCTYRAHU7IGBQ42'));
      const vivaTablesSnap = await getDocs(vivaTablesQuery);

      const batch = writeBatch(db);
      if (!vivaTablesSnap.empty) {
        vivaTablesSnap.docs.forEach(docSnap => {
          const tData = docSnap.data();
          const newId = `lojista_${docSnap.id}`;
          batch.set(doc(db, 'diningTables', newId), {
            ...tData,
            id: newId,
            tenantId: 'lojista',
            updatedAt: new Date()
          });
        });
        await batch.commit();
      } else if (INITIAL_TABLES && INITIAL_TABLES.length > 0) {
        INITIAL_TABLES.forEach(table => {
          const newId = `lojista_${table.id}`;
          batch.set(doc(db, 'diningTables', newId), {
            ...table,
            id: newId,
            tenantId: 'lojista',
            updatedAt: new Date()
          });
        });
        await batch.commit();
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('Quota limit exceeded') || err?.code === 'resource-exhausted') {
      console.warn("Cota do Firestore atingida (Free Tier). Sincronização inicial de tenant/produtos pulada.");
    } else {
      console.error("Error ensuring lojista tenant:", err);
    }
  }
}
