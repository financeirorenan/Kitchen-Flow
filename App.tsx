
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Tables from './components/Tables';
import KDS from './components/KDS';
import AIInsights from './components/AIInsights';
import UsersPanel from './components/UsersPanel';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Delivery from './components/Delivery';
import CMVAnalysis from './components/CMVAnalysis';
import DashboardAlerts from './components/DashboardAlerts';
import DigitalMenuConfig from './components/DigitalMenuConfig';
import AdminSettingsComponent from './components/AdminSettings';
import CustomersPanel from './components/CustomersPanel';
import SaaSAdmin from './components/SaaSAdmin';
import { db as localDb } from './services/db';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import Login from './components/Login';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_TABLES, 
  INITIAL_COURIERS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  ROLE_DEFAULT_PERMISSIONS as INITIAL_ROLE_PERMISSIONS
} from './constants';
import { Product, Table, Order, Courier, FinancialRecord, User, UserRole, AuditLog, Permission, OrderItem, PaymentMethod, PriceHistory, DigitalMenuSettings, AdminSettings, Customer, CustomerTransaction, RawMaterial, CashClosingReport, Tenant } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  BarChart as BarChartIcon,
  Plus, 
  Download, 
  Filter, 
  Bell, 
  BellRing, 
  Check, 
  X as CloseIcon, 
  Smartphone, 
  ShoppingBag, 
  MessageCircle, 
  UserCircle, 
  Store, 
  Database, 
  Menu, 
  X,
  XCircle
} from 'lucide-react';

interface CashSession {
  isOpen: boolean;
  openingValue: number;
  openedAt: Date | null;
}

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [counterOrders, setCounterOrders] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingDigitalOrders, setIncomingDigitalOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>(INITIAL_ROLE_PERMISSIONS as Record<UserRole, Permission[]>);
  const [globalDeliveryFee, setGlobalDeliveryFee] = useState(7.00);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosingReport[]>([]);
  const [cashSession, setCashSession] = useState<CashSession>({ isOpen: false, openingValue: 0, openedAt: null });
  const [tenantData, setTenantData] = useState<Tenant | null>(null);

  const isSuperAdmin = user?.email === 'financeirorenanuk@gmail.com';

  const [digitalMenuSettings, setDigitalMenuSettings] = useState<DigitalMenuSettings>({
    primaryColor: '#4f46e5',
    restaurantName: 'GastroAI Bistrô',
    welcomeMessage: 'Olá! Seja bem-vindo ao nosso cardápio digital.',
    allowOrdering: true,
    showStock: true,
    bannerUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop',
    logoUrl: '',
    categoryImages: {
      'Bebidas': 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=400',
      'Lanches': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
      'Sobremesas': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
      'Entradas': 'https://images.unsplash.com/photo-1541014741259-df549fa3322e?w=400',
      'Pratos Principais': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'
    }
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    companyName: 'GastroAI Soluções Alimentares LTDA',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    phone: '(11) 4002-8922',
    socialMedia: {
      instagram: '',
      facebook: '',
      whatsapp: ''
    },
    businessHours: [
      { day: 'Segunda-feira', open: '09:00', close: '22:00', isClosed: false },
      { day: 'Terça-feira', open: '09:00', close: '22:00', isClosed: false },
      { day: 'Quarta-feira', open: '09:00', close: '22:00', isClosed: false },
      { day: 'Quinta-feira', open: '09:00', close: '22:00', isClosed: false },
      { day: 'Sexta-feira', open: '09:00', close: '23:00', isClosed: false },
      { day: 'Sábado', open: '10:00', close: '23:00', isClosed: false },
      { day: 'Domingo', open: '10:00', close: '21:00', isClosed: false },
    ],
    fiscal: { environment: 'homologacao', certificateStatus: 'valid', certificateExpiry: '15/12/2025', cscId: '000001', cscToken: 'A1B2C3D4E5', nextNfceNumber: 154, series: 1, taxRegime: 'simples_nacional' } as any,
    printing: { paperWidth: '80mm', autoPrintOrder: true, headerText: 'BEM VINDO AO GASTROAI', footerText: 'Obrigado!', showLogo: true },
    apis: { googleMapsKey: '', whatsappToken: '', ifoodWebhook: '', integrationActive: false }
  });

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Buscar ou criar dados do usuário no Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUserData(userData);
          
          // Se o usuário pertence a um tenant, buscar dados do tenant
          if (userData.tenantId) {
            const tenantDoc = await getDoc(doc(db, 'tenants', userData.tenantId));
            if (tenantDoc.exists()) {
              setTenantData(tenantDoc.data() as Tenant);
            }
          }
        } else {
          // Criar novo usuário (primeiro acesso)
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Novo Usuário',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'financeirorenanuk@gmail.com' ? 'ADMIN' : 'WAITER',
            permissions: [], // Será preenchido pelo role
            status: 'online',
            createdAt: new Date()
          };
          await setDoc(userDocRef, newUser);
          setCurrentUserData(newUser);
        }
      } else {
        setCurrentUserData(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Carregamento inicial do banco de dados
  useEffect(() => {
    if (!user) return;

    const initDb = async () => {
      try {
        const pCount = await localDb.products.count();
        if (pCount === 0) {
          // Popula com dados iniciais se estiver vazio
          await localDb.products.bulkAdd(INITIAL_PRODUCTS);
          await localDb.diningTables.bulkAdd(INITIAL_TABLES);
          await localDb.couriers.bulkAdd(INITIAL_COURIERS);
          await localDb.users.bulkAdd(INITIAL_USERS);
          await localDb.auditLogs.bulkAdd(INITIAL_AUDIT_LOGS);
          await localDb.settings.add({ 
            id: 'global', 
            admin: adminSettings, 
            digitalMenu: digitalMenuSettings 
          });
        }

        // Carrega para o estado
        const [p, t, c, o, u, l, f, s, rm, cc] = await Promise.all([
          localDb.products.toArray(),
          localDb.diningTables.toArray(),
          localDb.couriers.toArray(),
          localDb.orders.toArray(),
          localDb.users.toArray(),
          localDb.auditLogs.toArray(),
          localDb.financialRecords.toArray(),
          localDb.settings.get('global'),
          localDb.rawMaterials.toArray(),
          localDb.cashClosings.toArray()
        ]);

        setProducts(p);
        setTables(t);
        setCouriers(c);
        setOrders(o.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setUsers(u);
        setAuditLogs(l.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        setFinancialRecords(f.sort((a, b) => b.date.getTime() - a.date.getTime()));
        setRawMaterials(rm);
        setCashClosings(cc.sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime()));
        if (s) {
          // Merge with defaults to ensure all properties exist
          setAdminSettings(prev => ({
            ...prev,
            ...s.admin,
            socialMedia: { ...prev.socialMedia, ...s.admin.socialMedia },
            fiscal: { ...prev.fiscal, ...s.admin.fiscal },
            printing: { ...prev.printing, ...s.admin.printing },
            apis: { ...prev.apis, ...s.admin.apis }
          }));
          setDigitalMenuSettings(prev => ({ ...prev, ...s.digitalMenu }));
          if (s.cashSession) {
            setCashSession(s.cashSession);
          }
        }

        // Clientes
        const cust = await localDb.customers.toArray();
        setCustomers(cust);

        setIsDbLoaded(true);
      } catch (err) {
        console.error("DB Initialization Error:", err);
      }
    };

    initDb();
  }, [user]);

  const handleLogout = () => {
    signOut(auth);
  };

  // Persistência de configurações quando mudam
  useEffect(() => {
    if (isDbLoaded) {
      localDb.settings.put({ id: 'global', admin: adminSettings, digitalMenu: digitalMenuSettings });
    }
  }, [adminSettings, digitalMenuSettings, isDbLoaded]);

  const [mockWhatsAppNotify, setMockWhatsAppNotify] = useState<{title: string, msg: string} | null>(null);

  const triggerWhatsAppMock = (title: string, msg: string) => {
    setMockWhatsAppNotify({ title, msg });
    setTimeout(() => setMockWhatsAppNotify(null), 5000);
  };

  const handleAddFinancialRecord = async (record: Partial<FinancialRecord>) => {
    const newRecord: FinancialRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type: record.type || 'expense',
      amount: record.amount || 0,
      category: record.category || 'Outros',
      description: record.description || 'Lançamento manual',
      date: record.date || new Date(),
      status: record.status || 'paid'
    };
    await localDb.financialRecords.add(newRecord);
    setFinancialRecords(prev => [newRecord, ...prev]);
    addLog('u1', 'FINANCEIRO', `Novo lançamento: ${newRecord.description}`);
  };

  const handleUpdateFinancialRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    await localDb.financialRecords.update(id, updates);
    setFinancialRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    addLog('u1', 'FINANCEIRO', `Registro financeiro atualizado: ${id}`);
  };

  const handleAddCustomer = async (customer: Partial<Customer>) => {
    const newCustomer: Customer = {
      id: `ct${Date.now()}`,
      name: customer.name || '',
      document: customer.document || '',
      phone: customer.phone || '',
      email: customer.email,
      address: customer.address,
      balance: customer.balance || 0,
      createdAt: new Date(),
      history: customer.history || []
    };
    await localDb.customers.add(newCustomer);
    setCustomers(prev => [newCustomer, ...prev]);
    addLog('u1', 'CLIENTES', `Novo cliente cadastrado: ${newCustomer.name}`);
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    await localDb.customers.update(id, updates);
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    addLog('u1', 'CLIENTES', `Cliente atualizado: ${id}`);
  };

  const handleUpdateCourier = async (id: string, updates: Partial<Courier>) => {
    await localDb.couriers.update(id, updates);
    setCouriers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    addLog('u1', 'ENTREGAS', `Entregador atualizado: ${id}`);
  };

  const handleSendToKitchen = async (tableId: number, items: OrderItem[], isCounter?: boolean) => {
    const kitchenOrder: Order = {
      id: `KDS-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      tableNumber: isCounter ? undefined : tableId,
      type: isCounter ? 'takeout' : 'table',
      status: 'preparing',
      items: items,
      total: items.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      createdAt: new Date()
    };
    await localDb.orders.add(kitchenOrder);
    setOrders(prev => [kitchenOrder, ...prev]);
    addLog('u1', 'COZINHA', `Pedido enviado para cozinha: ${isCounter ? 'Balcão' : `Mesa ${tableId}`}`);
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    await localDb.orders.update(id, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    addLog('u1', 'PEDIDO', `Pedido ${id} alterado para ${status}`);
  };

  const handleAssignCourier = async (orderId: string, courierId: string) => {
    await localDb.orders.update(orderId, { courierId, status: 'delivering' });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courierId, status: 'delivering' } : o));
    addLog('u1', 'ENTREGA', `Entregador atribuído ao pedido ${orderId}`);
  };

  const handleUpdateTable = async (id: number, items: OrderItem[], status: Table['status'], isCounter?: boolean) => {
    if (isCounter) {
      setCounterOrders(prev => prev.map(t => t.id === id ? { ...t, items, status, total: items.reduce((a, b) => a + (b.price * b.quantity), 0) } : t));
    } else {
      await localDb.diningTables.update(id, { items, status, total: items.reduce((a, b) => a + (b.price * b.quantity), 0) });
      setTables(prev => prev.map(t => t.id === id ? { ...t, items, status, total: items.reduce((a, b) => a + (b.price * b.quantity), 0) } : t));
    }
  };

  const handleAddCounterOrder = () => {
    const newCounter: Table = {
      id: Date.now(),
      status: 'occupied',
      items: [],
      total: 0
    };
    setCounterOrders(prev => [...prev, newCounter]);
    addLog('u1', 'BALCÃO', 'Nova comanda de balcão aberta');
    return newCounter.id;
  };

  const handleCloseTable = async (tableId: number, method: PaymentMethod, fiscal: boolean, customerId?: string, isCounter?: boolean, deliveryInfo?: { address: string, fee: number }, customerDocument?: string) => {
    const source = isCounter ? counterOrders : tables;
    const table = source.find(t => t.id === tableId);
    if (!table) return;

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      tableNumber: isCounter ? undefined : tableId,
      items: table.items,
      total: table.total + (deliveryInfo?.fee || 0),
      type: deliveryInfo ? 'delivery' : (isCounter ? 'takeout' : 'table'),
      status: deliveryInfo ? 'preparing' : 'delivered',
      createdAt: new Date(),
      paymentMethod: method,
      isFiscalIssued: fiscal,
      fiscalKey: fiscal ? Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join('') : undefined,
      customerId: customerId,
      customerDocument: customerDocument,
      customerAddress: deliveryInfo?.address,
      deliveryFee: deliveryInfo?.fee
    };

    await localDb.orders.add(newOrder);
    setOrders(prev => [newOrder, ...prev]);
    
    if (isCounter) {
      setCounterOrders(prev => prev.filter(t => t.id !== tableId));
    } else {
      await localDb.diningTables.update(tableId, { items: [], status: 'available', total: 0 });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, items: [], status: 'available', total: 0 } : t));
    }
    
    const finalTotal = table.total + (deliveryInfo?.fee || 0);

    if (method === 'conta_cliente' && customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        const transaction: CustomerTransaction = {
          id: `t${Date.now()}`,
          type: 'debit',
          amount: finalTotal,
          description: `Consumo ${deliveryInfo ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} (Pedido #${newOrder.id})`,
          date: new Date()
        };
        await handleUpdateCustomer(customerId, {
          balance: customer.balance + finalTotal,
          history: [transaction, ...customer.history]
        });
      }
    } else {
      await handleAddFinancialRecord({
        type: 'income',
        amount: finalTotal,
        category: deliveryInfo ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
        description: `${deliveryInfo ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} - Pagamento: ${method}`,
        date: new Date()
      });
    }

    addLog('u1', 'VENDA', `${deliveryInfo ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} encerrada. Total: R$ ${finalTotal.toFixed(2)}`);
  };

  const addLog = async (userId: string, action: string, description: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      description,
      timestamp: new Date()
    };
    await localDb.auditLogs.add(newLog);
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleUpdateProduct = async (product: Product) => {
    await localDb.products.put(product);
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    addLog('u1', 'ESTOQUE', `Produto atualizado: ${product.name}`);
  };

  const handleUpdateRawMaterial = async (material: RawMaterial) => {
    await localDb.rawMaterials.put(material);
    setRawMaterials(prev => prev.map(m => m.id === material.id ? material : m));
    addLog('u1', 'INSUMOS', `Insumo atualizado: ${material.name}`);
  };

  const handleAddRawMaterial = async (material: Partial<RawMaterial>) => {
    const newMaterial: RawMaterial = {
      id: `rm${Date.now()}`,
      name: material.name || '',
      unit: material.unit || 'un',
      currentStock: material.currentStock || 0,
      minStock: material.minStock || 0,
      costPerUnit: material.costPerUnit || 0,
      category: material.category || 'Geral'
    };
    await localDb.rawMaterials.add(newMaterial);
    setRawMaterials(prev => [...prev, newMaterial]);
    addLog('u1', 'INSUMOS', `Novo insumo cadastrado: ${newMaterial.name}`);
  };

  const handleOpenCash = async (value: number) => {
    const newSession = { isOpen: true, openingValue: value, openedAt: new Date() };
    setCashSession(newSession);
    addLog('u1', 'CAIXA', `Caixa aberto com R$ ${value.toFixed(2)}`);
    
    // Persist
    const s = await localDb.settings.get('global');
    if (s) {
      await localDb.settings.put({ ...s, cashSession: newSession });
    }
  };

  const handleCloseCash = async (actualValue: number, observations?: string) => {
    if (!cashSession.openedAt) return;

    // Calculate expected value based on sales since openedAt
    const salesSinceOpen = orders.filter(o => o.createdAt >= cashSession.openedAt!);
    const totalSales = salesSinceOpen.reduce((acc, o) => acc + o.total, 0);
    const expectedValue = cashSession.openingValue + totalSales;

    const salesByMethod: Record<PaymentMethod, number> = {
      dinheiro: 0,
      cartao_credito: 0,
      cartao_debito: 0,
      pix: 0,
      vale_refeicao: 0,
      conta_cliente: 0
    };

    salesSinceOpen.forEach(o => {
      if (o.paymentMethod) {
        salesByMethod[o.paymentMethod] += o.total;
      }
    });

    const report: CashClosingReport = {
      id: `cc${Date.now()}`,
      openedAt: cashSession.openedAt,
      closedAt: new Date(),
      openingValue: cashSession.openingValue,
      expectedValue,
      actualValue,
      difference: actualValue - expectedValue,
      salesByMethod,
      totalSales,
      closedBy: 'Administrador', // Should come from current user
      observations
    };

    await localDb.cashClosings.add(report);
    setCashClosings(prev => [report, ...prev]);

    // Record difference in financial records if any
    if (report.difference !== 0) {
      const diffRecord: FinancialRecord = {
        id: `diff-${Date.now()}`,
        type: report.difference > 0 ? 'income' : 'expense',
        amount: Math.abs(report.difference),
        category: 'Ajuste de Caixa',
        description: `Diferença no fechamento de caixa (${report.difference > 0 ? 'Sobra' : 'Quebra'}) - Ref: ${report.id}`,
        date: new Date(),
        status: 'paid'
      };
      await localDb.financialRecords.add(diffRecord);
      setFinancialRecords(prev => [diffRecord, ...prev]);
    }

    const closedSession = { isOpen: false, openingValue: 0, openedAt: null };
    setCashSession(closedSession);
    addLog('u1', 'CAIXA', `Caixa fechado. Diferença: R$ ${(actualValue - expectedValue).toFixed(2)}`);
    
    // Persist
    const s = await localDb.settings.get('global');
    if (s) {
      await localDb.settings.put({ ...s, cashSession: closedSession });
    }

    return report;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Bloqueio se o tenant estiver inativo (exceto para super admin)
  if (!isSuperAdmin && tenantData && !tenantData.active) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
            <XCircle size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Acesso Bloqueado</h2>
            <p className="text-slate-500 font-bold text-sm mt-2">Sua assinatura está inativa ou expirada. Entre em contato com o suporte para regularizar.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  if (!isDbLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Sincronizando Dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={currentUserData || { name: user.displayName || 'Usuário', role: 'WAITER', avatar: user.photoURL || undefined } as any}
        onLogout={handleLogout}
        allowedModules={isSuperAdmin ? undefined : tenantData?.subscription.allowedModules}
        isSuperAdmin={isSuperAdmin}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {/* Header Mobile */}
        <header className="lg:hidden bg-white border-b p-2 flex items-center justify-between sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">G</div>
            <span className="font-bold text-slate-800">GastroAI</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        <div className="flex-1 p-1 overflow-y-auto max-h-screen custom-scrollbar">
          <header className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">GastroAI Management System</h2>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
                {activeTab === 'dashboard' ? 'Painel de Controle' : 
                 activeTab === 'tables' ? 'Mesas e Comandas' :
                 activeTab === 'kds' ? 'Monitor de Pedidos' :
                 activeTab === 'delivery' ? 'Painel de Entregas' :
                 activeTab === 'digital-menu' ? 'Cardápio Digital' :
                 activeTab === 'customers' ? 'Gestão de Clientes' :
                 activeTab === 'inventory' ? 'Controle de Estoque' :
                 activeTab === 'finance' ? 'Gestão Financeira' :
                 activeTab === 'ai-cmv' ? 'Assistente de Cardápio' :
                 activeTab === 'users' ? 'Gestão de Equipe' :
                 activeTab === 'saas-admin' ? 'Gestão SaaS' :
                  activeTab === 'settings' ? 'Configurações do Sistema' : activeTab}
              </h1>
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Banco Local Ativo</span>
               </div>
               <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-100 text-xs">GA</div>
            </div>
          </header>
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <AIInsights sales={orders} inventory={products} />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 space-y-4">
                <DashboardAlerts products={products} onNavigateToInventory={() => setActiveTab('inventory')} />
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-[300px]">
                  <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <BarChartIcon size={18} className="text-indigo-600" />
                    Desempenho de Vendas (7 Dias)
                  </h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={[{ name: 'Seg', sales: 4000 }, { name: 'Ter', sales: 3000 }, { name: 'Qua', sales: 5000 }, { name: 'Qui', sales: 4780 }, { name: 'Sex', sales: 8890 }, { name: 'Sáb', sales: 9390 }, { name: 'Dom', sales: 7490 }]}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fontWeight: 600, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-fit gap-4">
                <h3 className="text-sm font-black text-slate-800">Resumo Diário</h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Vendido</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ {orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pedidos Realizados</p>
                  <p className="text-2xl font-black text-indigo-600 tracking-tighter">{orders.length}</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Saldo em Fiado</p>
                  <p className="text-2xl font-black text-rose-600 tracking-tighter">R$ {customers.reduce((a,b)=>a+b.balance,0).toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('finance')}
                  className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Ver Financeiro Completo
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'tables' && <Tables tables={tables} counterOrders={counterOrders} products={products} orders={orders} customers={customers} cashSession={cashSession} onUpdateTable={handleUpdateTable} onCloseTable={handleCloseTable} onSendToKitchen={handleSendToKitchen} onOpenCash={handleOpenCash} onCloseCash={handleCloseCash} onAddCounterOrder={handleAddCounterOrder} />}
        {activeTab === 'customers' && <CustomersPanel customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onAddFinancialRecord={handleAddFinancialRecord} />}
        {activeTab === 'delivery' && <Delivery orders={orders} couriers={couriers} deliveryFee={globalDeliveryFee} onUpdateStatus={handleUpdateOrderStatus} onAssignCourier={handleAssignCourier} onAddCourier={(c) => localDb.couriers.add(c as Courier).then(()=>localDb.couriers.toArray().then(setCouriers))} onUpdateCourier={handleUpdateCourier} onUpdateDeliveryFee={setGlobalDeliveryFee} onAddFinancialRecord={handleAddFinancialRecord} />}
        {activeTab === 'inventory' && <Inventory products={products} rawMaterials={rawMaterials} onUpdateProduct={handleUpdateProduct} onUpdateRawMaterial={handleUpdateRawMaterial} onAddRawMaterial={handleAddRawMaterial} />}
        {activeTab === 'finance' && <Finance orders={orders} customers={customers} couriers={couriers} manualRecords={financialRecords} cashClosings={cashClosings} onAddRecord={handleAddFinancialRecord} onUpdateRecord={handleUpdateFinancialRecord} onUpdateCustomer={handleUpdateCustomer} />}
        {activeTab === 'users' && <UsersPanel users={users} auditLogs={auditLogs} rolePermissions={rolePermissions} onAddUser={(u) => localDb.users.add(u as User).then(()=>localDb.users.toArray().then(setUsers))} onUpdateRole={()=>{}} onUpdateRolePermissions={()=>{}} />}
        {activeTab === 'saas-admin' && isSuperAdmin && <SaaSAdmin />}
        {activeTab === 'kds' && <KDS orders={orders} couriers={couriers} onUpdateStatus={handleUpdateOrderStatus} onAssignCourier={handleAssignCourier} />}
        {activeTab === 'digital-menu' && <DigitalMenuConfig settings={digitalMenuSettings} onUpdateSettings={setDigitalMenuSettings} products={products} tables={tables} onUpdateProduct={handleUpdateProduct} onPlaceDigitalOrder={(order) => setIncomingDigitalOrders(prev => [...prev, order])} />}
        {activeTab === 'ai-cmv' && <CMVAnalysis products={products} rawMaterials={rawMaterials} onUpdateProduct={handleUpdateProduct} />}
        {activeTab === 'settings' && <AdminSettingsComponent settings={adminSettings} onUpdateSettings={setAdminSettings} />}
        </div>
      </main>

      {mockWhatsAppNotify && (
        <div className="fixed top-8 right-8 z-[300] w-full max-w-sm px-4 animate-in slide-in-from-right-10">
           <div className="bg-white border-l-4 border-emerald-500 rounded-2xl shadow-2xl p-4 flex gap-4 items-center ring-1 ring-black/5">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-100"><MessageCircle size={24} /></div>
              <div className="flex-1 min-w-0">
                 <p className="text-[10px] font-black uppercase text-emerald-600 flex justify-between"><span>WhatsApp Cliente</span><span className="text-slate-300">Agora</span></p>
                 <p className="text-sm font-black text-slate-800 mt-0.5">{mockWhatsAppNotify.title}</p>
                 <p className="text-xs font-medium text-slate-500 line-clamp-2">{mockWhatsAppNotify.msg}</p>
              </div>
           </div>
        </div>
      )}

      {incomingDigitalOrders.length > 0 && (
        <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 w-96 animate-in slide-in-from-right-10">
          {incomingDigitalOrders.map((order) => (
            <div key={order.id} className="bg-white border-2 border-indigo-600 rounded-[2rem] shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  {order.type === 'delivery' ? <ShoppingBag size={24} /> : order.type === 'takeout' ? <Store size={24} /> : <Smartphone size={24} />}
                </div>
                <div>
                  <h4 className="font-black text-slate-800">Novo Pedido {order.type === 'takeout' ? 'Retirada' : 'Digital'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customerName} • R$ {order.total.toFixed(2)}</p>
                  {order.paymentMethod === 'dinheiro' && order.changeFor && (
                    <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">
                      Leva troco para R$ {order.changeFor.toFixed(2)} (Troco: R$ {(order.changeFor - order.total).toFixed(2)})
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setIncomingDigitalOrders(prev => prev.filter(o => o.id !== order.id)); addLog('u1', 'DIGITAL', `Pedido #${order.id.slice(-4)} RECUSADO`); }} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">Recusar</button>
                <button onClick={async () => {
                   const acceptedOrder = { ...order, status: 'preparing' as const, deliveryFee: order.type === 'delivery' ? globalDeliveryFee : 0 };
                   await localDb.orders.add(acceptedOrder);
                   setOrders(prev => [acceptedOrder, ...prev]);
                   setIncomingDigitalOrders(prev => prev.filter(o => o.id !== order.id));
                   if (order.type === 'table' && order.tableNumber) {
                     handleUpdateTable(order.tableNumber, order.items, 'occupied');
                   }
                   triggerWhatsAppMock("✅ Pedido Aceito!", `Olá ${order.customerName}, seu pedido #${order.id.slice(-4)} foi aceito e já está em produção!`);
                   addLog('u1', 'DIGITAL', `Pedido #${order.id.slice(-4)} ACEITO E ENVIADO À COZINHA`);
                }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Aceitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
