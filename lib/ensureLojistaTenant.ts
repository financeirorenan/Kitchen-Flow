import { db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { INITIAL_PRODUCTS, INITIAL_TABLES } from '../constants';

export async function ensureLojistaTenantWithData() {
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

    // 2. Copy/Ensure settings/lojista
    const lojistaSettingsRef = doc(db, 'settings', 'lojista');
    const lojistaSettingsSnap = await getDoc(lojistaSettingsRef);
    if (!lojistaSettingsSnap.exists()) {
      let vivaSettings: any = null;
      try {
        const vivaSetSnap = await getDoc(doc(db, 'settings', 'HCL1177LRQVPEKCTYRAHU7IGBQ42'));
        if (vivaSetSnap.exists()) {
          vivaSettings = vivaSetSnap.data();
        }
      } catch (e) {
        console.warn("Could not fetch viva settings:", e);
      }

      const newSettings = vivaSettings ? JSON.parse(JSON.stringify(vivaSettings)) : {};
      if (!newSettings.admin) newSettings.admin = {};
      if (!newSettings.digitalMenu) newSettings.digitalMenu = {};
      
      newSettings.admin.companyName = 'KitchenFlow';
      newSettings.digitalMenu.restaurantName = 'KitchenFlow';
      newSettings.updatedAt = new Date();

      await setDoc(lojistaSettingsRef, newSettings, { merge: true });
    }

    // 3. Copy Products from Viva or INITIAL_PRODUCTS if lojista has 0 products
    const lojistaProductsQuery = query(collection(db, 'products'), where('tenantId', '==', 'lojista'));
    const lojistaProductsSnap = await getDocs(lojistaProductsQuery);

    if (lojistaProductsSnap.empty) {
      const vivaProductsQuery = query(collection(db, 'products'), where('tenantId', '==', 'HCL1177LRQVPEKCTYRAHU7IGBQ42'));
      const vivaProductsSnap = await getDocs(vivaProductsQuery);

      const batch = writeBatch(db);
      if (!vivaProductsSnap.empty) {
        vivaProductsSnap.docs.forEach(docSnap => {
          const pData = docSnap.data();
          const newId = `lojista_${docSnap.id}`;
          batch.set(doc(db, 'products', newId), {
            ...pData,
            id: newId,
            tenantId: 'lojista',
            updatedAt: new Date()
          });
        });
        await batch.commit();
        console.log(`Copied ${vivaProductsSnap.size} products from Viva to lojista tenant.`);
      } else if (INITIAL_PRODUCTS && INITIAL_PRODUCTS.length > 0) {
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
        console.log(`Seeded ${INITIAL_PRODUCTS.length} initial products to lojista tenant.`);
      }
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
        console.log(`Copied ${vivaTablesSnap.size} tables from Viva to lojista tenant.`);
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
        console.log(`Seeded ${INITIAL_TABLES.length} initial tables to lojista tenant.`);
      }
    }
  } catch (err) {
    console.error("Error ensuring lojista tenant:", err);
  }
}
