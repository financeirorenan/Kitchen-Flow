
import { Dexie, type EntityTable } from 'dexie';
import { Product, Order, Customer, FinancialRecord, Table, Courier, User, AuditLog, AdminSettings, DigitalMenuSettings, RawMaterial, CashClosingReport, CashSession, BankAccount } from '../types';

interface AppSettings {
  id: string;
  admin: AdminSettings;
  digitalMenu: DigitalMenuSettings;
  cashSession?: CashSession;
  productCategories?: string[];
  rawMaterialCategories?: string[];
}

// Inheriting from Dexie class to manage local IndexedDB storage
class KitchenFlowAIDatabase extends Dexie {
  products!: EntityTable<Product, 'id'>;
  orders!: EntityTable<Order, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  financialRecords!: EntityTable<FinancialRecord, 'id'>;
  diningTables!: EntityTable<Table, 'id'>; // Renamed from tables to avoid collision with Dexie.tables
  counterOrders!: EntityTable<Table, 'id'>;
  couriers!: EntityTable<Courier, 'id'>;
  users!: EntityTable<User, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  rawMaterials!: EntityTable<RawMaterial, 'id'>;
  cashClosings!: EntityTable<CashClosingReport, 'id'>;
  bankAccounts!: EntityTable<BankAccount, 'id'>;

  constructor() {
    super('KitchenFlowAIDatabase');
    // Fix: Ensuring the version() method from inherited Dexie class is recognized by casting to Dexie
    (this as Dexie).version(1).stores({
      products: 'id, name, category, barcode',
      orders: 'id, createdAt, status, customerId, tableNumber, type',
      customers: 'id, document, name, phone',
      financialRecords: 'id, date, type, category',
      diningTables: 'id, status', // Renamed from tables
      counterOrders: 'id, status',
      couriers: 'id, name, status',
      users: 'id, email, role',
      auditLogs: 'id, timestamp, action',
      settings: 'id',
      rawMaterials: 'id, name, category',
      cashClosings: 'id, closedAt',
      bankAccounts: 'id, name, bankName'
    });
  }

  async exportBackup() {
    const data = {
      products: await this.products.toArray(),
      orders: await this.orders.toArray(),
      customers: await this.customers.toArray(),
      financialRecords: await this.financialRecords.toArray(),
      tables: await this.diningTables.toArray(), // Keep key as 'tables' for external JSON compatibility
      counterOrders: await this.counterOrders.toArray(),
      couriers: await this.couriers.toArray(),
      users: await this.users.toArray(),
      auditLogs: await this.auditLogs.toArray(),
      settings: await this.settings.toArray(),
      bankAccounts: await this.bankAccounts.toArray()
    };
    return JSON.stringify(data);
  }

  async importBackup(jsonString: string) {
    const data = JSON.parse(jsonString);
    // Fix: Using transaction() method from inherited Dexie class by casting this to Dexie to resolve type checking
    await (this as Dexie).transaction('rw', [
      this.products, 
      this.orders, 
      this.customers, 
      this.financialRecords, 
      this.diningTables, 
      this.counterOrders,
      this.couriers, 
      this.users, 
      this.auditLogs, 
      this.settings,
      this.bankAccounts
    ], async () => {
      await Promise.all([
        this.products.clear(),
        this.orders.clear(),
        this.customers.clear(),
        this.financialRecords.clear(),
        this.diningTables.clear(),
        this.counterOrders.clear(),
        this.couriers.clear(),
        this.users.clear(),
        this.auditLogs.clear(),
        this.settings.clear(),
        this.bankAccounts.clear()
      ]);
      
      if (data.products) await this.products.bulkAdd(data.products);
      if (data.orders) await this.orders.bulkAdd(data.orders);
      if (data.customers) await this.customers.bulkAdd(data.customers);
      if (data.financialRecords) await this.financialRecords.bulkAdd(data.financialRecords);
      if (data.tables) await this.diningTables.bulkAdd(data.tables);
      if (data.counterOrders) await this.counterOrders.bulkAdd(data.counterOrders);
      if (data.couriers) await this.couriers.bulkAdd(data.couriers);
      if (data.users) await this.users.bulkAdd(data.users);
      if (data.auditLogs) await this.auditLogs.bulkAdd(data.auditLogs);
      if (data.settings) await this.settings.bulkAdd(data.settings);
      if (data.bankAccounts) await this.bankAccounts.bulkAdd(data.bankAccounts);
    });
  }

  async clearAllData() {
    await (this as Dexie).transaction('rw', [
      this.products, 
      this.orders, 
      this.customers, 
      this.financialRecords, 
      this.diningTables, 
      this.counterOrders,
      this.couriers, 
      this.users, 
      this.auditLogs, 
      this.settings,
      this.rawMaterials,
      this.cashClosings,
      this.bankAccounts
    ], async () => {
      await Promise.all([
        this.products.clear(),
        this.orders.clear(),
        this.customers.clear(),
        this.financialRecords.clear(),
        this.diningTables.clear(),
        this.counterOrders.clear(),
        this.couriers.clear(),
        this.users.clear(),
        this.auditLogs.clear(),
        this.settings.clear(),
        this.rawMaterials.clear(),
        this.cashClosings.clear(),
        this.bankAccounts.clear()
      ]);
    });
  }
}

export const db = new KitchenFlowAIDatabase();
