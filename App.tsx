
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { maskPhone, maskCPF, maskCEP } from './utils/masks';
import Sidebar from './components/Sidebar';
import Tables from './components/Tables';
import KDS from './components/KDS';
import { KDSKitchenOnly } from './components/KDSKitchenOnly';
import { MonitorPedidos } from './components/MonitorPedidos';
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
import KitchenflowWebsite from './components/KitchenflowWebsite';
import PartnerHub from './components/PartnerHub';
import SupportView from './components/SupportView';
import Marketplace from './components/Marketplace';
import CourierApp from './components/CourierApp';
import IntelligentReports from './components/IntelligentReports';
import LojistaCopilot from './components/LojistaCopilot';
import { db as localDb } from './services/db';
import { auth, db } from './firebase';
import { authService } from './services/authService';
import { handlePrintOrder } from './services/printService';
import { onAuthStateChanged, signOut, User as FirebaseUser, updateEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, onSnapshot, query, where, orderBy, limit, addDoc, writeBatch } from 'firebase/firestore';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProfileModal } from './components/UserProfileModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_TABLES, 
  INITIAL_COURIERS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_RAW_MATERIALS,
  ROLE_DEFAULT_PERMISSIONS as INITIAL_ROLE_PERMISSIONS
} from './constants';
import { Product, Table, Order, OrderStatus, Courier, FinancialRecord, User, UserRole, UserPreset, AuditLog, Permission, OrderItem, PaymentMethod, PriceHistory, DigitalMenuSettings, AdminSettings, Customer, CustomerTransaction, RawMaterial, CashClosingReport, Tenant, BankAccount } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { compressImage } from './lib/imageUtils';
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
  Shield,
  MessageCircle, 
  UserCircle, 
  Store, 
  Database, 
  Menu, 
  X,
  XCircle,
  Lock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Cloud,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  Utensils,
  Bike,
  Fingerprint
} from 'lucide-react';

interface CashSession {
  isOpen: boolean;
  openingValue: number;
  openedAt: Date | null;
}

const ALL_MODULES: { id: Permission; label: string }[] = [
  { id: 'dashboard_view', label: 'Painel AI' },
  { id: 'pos_access', label: 'Vendas PDV' },
  { id: 'marketplace_manage', label: 'Marketplace Nova' },
  { id: 'tables_manage', label: 'Mesas / Comandas' },
  { id: 'kds_view', label: 'Monitor de Pedidos (KDS)' },
  { id: 'delivery_manage', label: 'Painel de Entregas' },
  { id: 'digital_menu_manage', label: 'Cardápio Digital' },
  { id: 'customers_manage', label: 'Gestão de Clientes / Fiado' },
  { id: 'inventory_edit', label: 'Controle de Estoque' },
  { id: 'finance_view', label: 'Gestão Financeira' },
  { id: 'cmv_analysis', label: 'Análise de CMV' },
  { id: 'users_manage', label: 'Gestão de Equipe' },
  { id: 'admin_settings_manage', label: 'Configurações do Sistema' },
  { id: 'fiscal_manage', label: 'Gestão Fiscal' },
  { id: 'courier_app_access', label: 'Rastreio de Entregadores' },
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

const STATUS_PRIORITY: Record<string, number> = {
  'pending': 1,
  'preparing': 2,
  'ready': 3,
  'delivering': 4,
  'delivered': 5,
  'finished': 6, // Finished is the ultimate terminal state
  'cancelled': 0
};

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: null, // Would need more context to get from state easily here
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
};

const convertTimestamps = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return obj;

  // This handles Firestore Timestamps
  if (typeof obj.toDate === 'function') {
    return obj.toDate();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    newObj[key] = convertTimestamps(obj[key]);
  });
  return newObj;
};

const cleanObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);

  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      newObj[key] = cleanObject(val);
    }
  });
  return newObj;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(() => {
    try {
      const demoUser = localStorage.getItem('kitchenflow_demo_user');
      if (demoUser) {
        return JSON.parse(demoUser).firebaseUser;
      }
    } catch {}
    return null;
  });
  const [currentUserData, setCurrentUserData] = useState<User | null>(() => {
    try {
      const demoUser = localStorage.getItem('kitchenflow_demo_user');
      if (demoUser) {
        const uData = JSON.parse(demoUser).userData;
        return { ...uData, tenantId: '' };
      }
      const cached = localStorage.getItem('kitchenflow_cached_user') || localStorage.getItem('gastroai_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [activePrintJob, setActivePrintJob] = useState<{
    order: Partial<Order>;
    settings: AdminSettings;
    html: string;
    rawText: string;
    isFiscal: boolean;
  } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addLogRef = useRef<any>(null);

  useEffect(() => {
    addLogRef.current = addLog;
  }, [addLog]);

  useEffect(() => {
    const handlePrintNotification = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>;
      if (customEvent.detail) {
        showToast(customEvent.detail.message, customEvent.detail.type || 'success');
      }
    };
    
    const handleShowPrintModal = (e: Event) => {
      const customEvent = e as CustomEvent<{
        order: Partial<Order>;
        settings: AdminSettings;
        html: string;
        rawText: string;
        isFiscal: boolean;
      }>;
      if (customEvent.detail) {
        setActivePrintJob(customEvent.detail);
        setIsPrintModalOpen(true);
      }
    };

    const handleError = (event: ErrorEvent) => {
      const errorMsg = event.message || 'Erro inesperado no cliente';
      const file = event.filename ? event.filename.split('/').pop() : 'desconhecido';
      const line = event.lineno || '';
      const col = event.colno || '';
      const stack = event.error?.stack || '';
      const loc = `${file}:${line}:${col}`;
      
      console.error(`[Mapeador de Erros] Capturado erro: ${errorMsg} em ${loc}`);
      
      if (addLogRef.current) {
        addLogRef.current(
          'system',
          'ERRO_JS',
          `Falha na execução: "${errorMsg}" em ${loc}`,
          'ERROR',
          `Localização: ${event.filename || 'N/A'}:${line}:${col}`,
          stack
        );
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorMsg = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : '';
      
      console.error(`[Mapeador de Erros] Capturada Promise Rejeitada: ${errorMsg}`);
      
      if (addLogRef.current) {
        addLogRef.current(
          'system',
          'PROMISE_REJECTED',
          `Falha assíncrona: "${errorMsg}"`,
          'ERROR',
          `Razão da rejeição: ${typeof reason === 'object' ? JSON.stringify(reason) : String(reason)}`,
          stack
        );
      }
    };

    const handleManualErrorReport = (e: Event) => {
      const customEvent = e as CustomEvent<{
        action: string;
        description: string;
        details?: string;
        stackTrace?: string;
        level?: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM';
      }>;
      if (customEvent.detail && addLogRef.current) {
        const { action, description, level = 'ERROR', details, stackTrace } = customEvent.detail;
        addLogRef.current(
          'system',
          action,
          description,
          level,
          details,
          stackTrace
        );
      }
    };

    window.addEventListener('kitchenflow-print-notifier', handlePrintNotification);
    window.addEventListener('kitchenflow-show-print-modal', handleShowPrintModal);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('kitchenflow-report-error', handleManualErrorReport);
    
    return () => {
      window.removeEventListener('kitchenflow-print-notifier', handlePrintNotification);
      window.removeEventListener('kitchenflow-show-print-modal', handleShowPrintModal);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('kitchenflow-report-error', handleManualErrorReport);
    };
  }, []);

  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [pdvEditOrder, setPdvEditOrder] = useState<Order | null>(null);
  const [returnToTab, setReturnToTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('merchant-copilot');
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saasConfig, setSaasConfig] = useState<{
    excedentOrderPrice: number;
    maxExtraOrdersLimit: number;
    enableExtraOrdersLimit: boolean;
    volumeDiscounts: { threshold: number; discountPercent: number }[];
  }>({
    excedentOrderPrice: 0.20,
    maxExtraOrdersLimit: 1000,
    enableExtraOrdersLimit: false,
    volumeDiscounts: [
      { threshold: 500, discountPercent: 10 },
      { threshold: 1000, discountPercent: 20 }
    ]
  });
  const [globalDeliveryFee, setGlobalDeliveryFee] = useState(7.00);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosingReport[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(['Entradas', 'Buffet', 'Pratos Principais', 'Lanches', 'Batatas Recheadas', 'Pasteis', 'Bebidas']);
  const [rawMaterialCategories, setRawMaterialCategories] = useState<string[]>(['Proteínas', 'Hortifruti', 'Laticínios', 'Grãos', 'Bebidas', 'Embalagens', 'Limpeza', 'Outros']);
  const [cashSession, setCashSession] = useState<CashSession>({ isOpen: false, openingValue: 0, openedAt: null });
  const lastWriteTimeRef = useRef<number>(0);
  const ordersRef = useRef<Order[]>([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const [tenantData, setTenantData] = useState<Tenant | null>(() => {
    try {
      const cached = localStorage.getItem('kitchenflow_cached_tenant_data') || localStorage.getItem('gastroai_cached_tenant_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [subWarningDismissed, setSubWarningDismissed] = useState(false);

  // Subscription alerts calculation
  const subStats = useMemo(() => {
    if (!tenantData) return null;
    const planName = tenantData.subscription?.plan || 'START';
    const plan = plans.find(p => p.name.toUpperCase() === planName.toUpperCase() || p.id === tenantData.subscription?.planId);
    
    // Default franchise is 500 if START, or look up from plan
    const maxOrders = (plan?.maxOrders !== undefined && plan?.maxOrders !== null) ? plan.maxOrders : (planName.toUpperCase() === 'START' ? 500 : 1000);
    const isUnlimited = maxOrders === 0 || maxOrders >= 99999;
    
    // Count of completed/registered orders in current month
    const now = new Date();
    const currentMonthOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const oDate = o.createdAt instanceof Date ? o.createdAt : (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt));
      return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
    });
    const ordersUsed = currentMonthOrders.length;
    const percentUsed = isUnlimited ? 0 : (maxOrders > 0 ? (ordersUsed / maxOrders) * 100 : 0);
    
    return {
      planName,
      maxOrders,
      ordersUsed,
      percentUsed,
      isUnlimited
    };
  }, [tenantData, plans, orders]);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [currentProject, setCurrentProject] = useState<'PLATFORM' | 'RESTAURANT' | 'MARKETPLACE' | 'COURIER' | 'WEBSITE'>(() => {
    let path = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (typeof window !== 'undefined' && window.location.hash) {
      path = window.location.hash.substring(1).split('?')[0];
    }
    if (path === '/' || path.startsWith('/site') || path.startsWith('/kitchenflow')) {
      return 'WEBSITE';
    }
    if (path.startsWith('/marketplace') || path.startsWith('/perfil')) {
      return 'MARKETPLACE';
    }
    if (path.startsWith('/entregador')) {
      return 'COURIER';
    }
    if (path.startsWith('/lojista')) {
      return 'RESTAURANT';
    }
    if (path.startsWith('/saas')) {
      return 'PLATFORM';
    }
    return 'WEBSITE';
  });
  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [viewingTenantName, setViewingTenantName] = useState<string | null>(null);
  const [viewingTenantLogo, setViewingTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        try {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (err) {
          console.error("Error checking API key:", err);
          setHasApiKey(true);
        }
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (err) {
        console.error("Error opening key selector:", err);
      }
    }
  };

  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = !!user && (user?.email?.toLowerCase() === 'financeirorenanuk@gmail.com' || currentUserData?.role === 'SAAS_ADMIN');

  const effectiveAllowedModules = isSuperAdmin ? undefined : (tenantData?.customModules || tenantData?.subscription?.allowedModules);

  const getUserPermissions = (userData: User | null): Permission[] => {
    if (!userData) return [];
    const isSuper = userData.email?.toLowerCase() === 'financeirorenanuk@gmail.com' || userData.role === 'SAAS_ADMIN';
    if (isSuper) {
      return ALL_MODULES.map(m => m.id);
    }
    const perms = userData.permissions;
    if (perms && perms.length > 0) {
      return perms;
    }
    // Fallback to role-based default permissions from our state
    return (userData.role ? rolePermissions[userData.role] : []) || [];
  };

  const hasPermission = (permission: Permission) => {
    if (isSuperAdmin) return true;
    return getUserPermissions(currentUserData).includes(permission);
  };

  const [marketplaceProfile, setMarketplaceProfile] = useState<{name: string, phone: string} | null>(null);

  // Carregar perfil do marketplace do localStorage se existir
  useEffect(() => {
    const saved = localStorage.getItem('marketplace_profile');
    if (saved) setMarketplaceProfile(JSON.parse(saved));
  }, []);

  const handleUpdateMarketplaceProfile = (data: {name: string, phone: string}) => {
    setMarketplaceProfile(data);
    localStorage.setItem('marketplace_profile', JSON.stringify(data));
  };

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/site') || path.startsWith('/kitchenflow')) {
      if (currentProject !== 'WEBSITE') setCurrentProject('WEBSITE');
    } else if (path.startsWith('/saas')) {
      if (currentUserData) {
        if (currentUserData.role === 'COURIER') {
          navigate('/entregador', { replace: true });
          return;
        }
        if (currentUserData.role === 'CUSTOMER') {
          navigate('/marketplace', { replace: true });
          return;
        }
        if (!isSuperAdmin) {
          navigate('/lojista', { replace: true });
          return;
        }
      }
      if (currentProject !== 'PLATFORM') setCurrentProject('PLATFORM');
      if (activeTab === 'merchant-copilot') setActiveTab('saas-admin');
    } else if (path.startsWith('/lojista')) {
      if (currentUserData) {
        if (currentUserData.role === 'COURIER') {
          navigate('/entregador', { replace: true });
          return;
        }
        if (currentUserData.role === 'CUSTOMER') {
          navigate('/marketplace', { replace: true });
          return;
        }
        const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CHEF', 'CASHIER', 'WAITER', 'KDS', 'STOCK_ANALYST'];
        if (!allowedRoles.includes(currentUserData.role) && !isSuperAdmin) {
          navigate('/marketplace', { replace: true });
          return;
        }
      }

      // Extração inteligente de tenant ID da URL /lojista/:tenantId
      const parts = path.split('/');
      const segment = parts[2]; // ex: /lojista/HCL1177LRQVPEKCTYRAHU7IGBQ42 -> segment = "HCL1177LRQVPEKCTYRAHU7IGBQ42"
      const standardTabs = [
        'merchant-copilot', 'pos', 'orders', 'tables', 'kds', 'delivery', 
        'menu', 'stock', 'financial', 'customers', 'users', 'reports', 'settings'
      ];
      if (segment && !standardTabs.includes(segment)) {
        // SEGURANÇA MÁXIMA CONTRA INVASÃO DE URLS (TENANT ISOLATION BARRIER):
        // Lojistas comuns que NÃO forem Super Admins estão estritamente travados em seu próprio tenantId.
        let resolvedUserTenantId = currentUserData?.tenantId;
        let resolvedIsSuperAdmin = isSuperAdmin;

        if (!resolvedUserTenantId) {
          try {
            const cachedUserRaw = localStorage.getItem('kitchenflow_cached_user');
            if (cachedUserRaw) {
              const parsedCachedUser = JSON.parse(cachedUserRaw);
              resolvedUserTenantId = parsedCachedUser?.tenantId;
              resolvedIsSuperAdmin = parsedCachedUser?.email?.toLowerCase() === 'financeirorenanuk@gmail.com' || parsedCachedUser?.role === 'SAAS_ADMIN';
            }
          } catch {}
        }

        if (resolvedUserTenantId && !resolvedIsSuperAdmin && segment !== resolvedUserTenantId) {
          console.warn(`[Segurança] Acesso negado ao tenant: ${segment}. Redirecionando lojista para o seu próprio tenant: ${resolvedUserTenantId}`);
          navigate(`/lojista/${resolvedUserTenantId}`, { replace: true });
          return;
        }

        if (viewingTenantId !== segment) {
          setViewingTenantId(segment);
          getDoc(doc(db, 'tenants', segment)).then((tDoc) => {
            if (tDoc.exists()) {
              const tData = tDoc.data();
              setViewingTenantName(tData.name || null);
              setViewingTenantLogo(tData.logoUrl || null);
            }
          }).catch(err => console.warn("Erro ao buscar dados do tenant da URL:", err));
        }
      } else if (!segment && currentUserData?.tenantId) {
        // Redireciona de /lojista simples para /lojista/:tenantId para manter o ID visível na URL!
        const targetTenantId = viewingTenantId || currentUserData.tenantId;
        navigate(`/lojista/${targetTenantId}`, { replace: true });
        return;
      }

      if (currentProject !== 'RESTAURANT') setCurrentProject('RESTAURANT');
      if (activeTab === 'saas-admin' || activeTab === 'courier-app') setActiveTab('merchant-copilot');
    } else if (path.startsWith('/entregador')) {
      if (currentProject !== 'COURIER') setCurrentProject('COURIER');
      setActiveTab('courier-app');
    } else if (path.startsWith('/marketplace') || path.startsWith('/perfil') || path.startsWith('/cardapio')) {
      if (currentProject !== 'MARKETPLACE') setCurrentProject('MARKETPLACE');
    }
  }, [location.pathname, isSuperAdmin, currentProject, activeTab, navigate, currentUserData, viewingTenantId]);

  useEffect(() => {
    (window as any).setActiveTab = (tab: string) => {
      if (tab === 'marketplace') {
        navigate('/marketplace');
      } else {
        setActiveTab(tab);
      }
    };
    return () => { delete (window as any).setActiveTab; };
  }, [navigate]);

  const handleViewTenant = (tenantId: string, name?: string, logo?: string) => {
    setViewingTenantId(tenantId);
    setViewingTenantName(name || null);
    setViewingTenantLogo(logo || null);
    setCurrentProject('RESTAURANT');
    setActiveTab('merchant-copilot');
    navigate(`/lojista/${tenantId}`);
    
    if (currentUserData) {
      addLog(currentUserData.id, 'SAAS_AUDIT', `Super Admin iniciou suporte/visualização do parceiro: ${name || tenantId}`);
    }
  };

  const handleStopViewingTenant = () => {
    const backupName = viewingTenantName || viewingTenantId || 'Parceiro';
    setViewingTenantId(null);
    setViewingTenantName(null);
    setViewingTenantLogo(null);
    setCurrentProject('PLATFORM');
    setActiveTab('saas-admin');
    navigate('/saas');
    
    if (currentUserData) {
      addLog(currentUserData.id, 'SAAS_AUDIT', `Super Admin encerrou suporte/visualização do parceiro: ${backupName}`);
    }
  };

  const [cookieConsentAccepted, setCookieConsentAccepted] = useState(() => {
    return localStorage.getItem('lgpd_cookie_accepted') === 'true';
  });

  const [digitalMenuSettings, setDigitalMenuSettings] = useState<DigitalMenuSettings>({
    primaryColor: '#E31B23',
    accentColor: '#FACC15',
    fontFamily: 'sans',
    restaurantName: 'Viva Lá Fome!',
    welcomeMessage: 'O melhor delivery da região! Peça agora e receba em casa.',
    allowOrdering: true,
    showStock: true,
    bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop',
    logoUrl: '',
    categoryImages: {
      'Bebidas': 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=400',
      'Lanches': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
      'Porções': 'https://images.unsplash.com/photo-1541014741259-df549fa3322e?w=400',
      'Pratos': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      'Sobremesas': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'
    },
    dailyPromo: {
      title: 'Combo Irresistível',
      subtitle: 'Aproveite nossa seleção especial com desconto exclusivo.',
      price: 34.90,
      originalPrice: 49.90,
      active: true
    },
    totemUpsellMode: 'auto',
    totemUpsellProducts: []
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    companyName: 'Viva Lá Fome!',
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
    fiscal: { 
      environment: 'homologacao', 
      certificateStatus: 'missing', 
      certificateExpiry: '', 
      cscId: '', 
      cscToken: '', 
      nextNfceNumber: 1, 
      series: 1, 
      taxRegime: 'simples_nacional',
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Viva Lá Fome!',
      inscricaoEstadual: '123.456.789.110',
      address: {
        logradouro: 'Av. Paulista',
        numero: '1000',
        bairro: 'Bela Vista',
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '01310-100',
        codigoMunicipio: '3550308'
      }
    } as any,
    printing: { paperWidth: '80mm', autoPrintOrder: false, headerText: 'BEM VINDO AO VIVA LÁ FOME!', footerText: 'Obrigado!', showLogo: true },
    apis: { googleMapsKey: '', whatsappToken: '', ifoodWebhook: '', integrationActive: false },
    deliveryFee: 7.00,
    isDeliveryEnabled: true,
    isPickupEnabled: true,
    minOrderValue: 20.00,
    estimatedDeliveryTime: '30-45 min',
    estimatedPickupTime: '15-20 min',
    autoAcceptOrders: false,
    paymentMethods: [
      { id: '1', name: 'Dinheiro', type: 'cash', feePercentage: 0, active: true },
      { id: '2', name: 'Cartão de Crédito', type: 'credit', feePercentage: 3.2, active: true, operatorId: 'op-1' },
      { id: '3', name: 'Cartão de Débito', type: 'debit', feePercentage: 1.9, active: true, operatorId: 'op-1' },
      { id: '4', name: 'PIX', type: 'pix', feePercentage: 0, active: true },
      { id: '5', name: 'Vale Refeição', type: 'voucher', feePercentage: 5.0, active: true },
      { id: '6', name: 'Fiado (Conta Cliente)', type: 'account', feePercentage: 0, active: true },
    ],
    operators: [
      { id: 'op-1', name: 'Stone', active: true },
      { id: 'op-2', name: 'Rede', active: true },
      { id: 'op-3', name: 'Getnet', active: true },
    ],
    saasIntegration: {
      isCustomerAppEnabled: false,
      appFeePerOrder: 1.50,
      billingAccumulated: 0
    }
  });

  // Ref para rastrear IDs de pedidos já notificados
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

  // Campainha de novos pedidos (Para até ser aceito)
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Toca o sino em loop enquanto houver pedidos digitais pendentes de aceitação
    if (incomingDigitalOrders.length > 0) {
      if (!bellAudioRef.current) {
        bellAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        bellAudioRef.current.loop = true;
        bellAudioRef.current.volume = 0.6;
      }
      bellAudioRef.current.play().catch(e => console.log('Bloqueio de áudio (campainha):', e));
    } else {
      if (bellAudioRef.current) {
        bellAudioRef.current.pause();
        bellAudioRef.current.currentTime = 0;
      }
    }
    
    // Cleanup ao desmontar
    return () => {
      if (bellAudioRef.current) {
        bellAudioRef.current.pause();
        bellAudioRef.current = null;
      }
    };
  }, [incomingDigitalOrders.length]);

  // Carregar dados de todas as coleções do tenant quando mudar (Suporte SaaS / Multi-tenant)
  useEffect(() => {
    const isDemoMode = !!localStorage.getItem('kitchenflow_demo_user');
    if (isDemoMode) {
      return;
    }
    // Reset states when switching tenants to avoid leaking previous tenant data or placeholders
    setProducts([]);
    setTables([]);
    setCustomers([]);
    setOrders([]);
    setFinancialRecords([]);
    setRawMaterials([]);
    setBankAccounts([]);
    setCouriers([]);
    setAuditLogs([]);
    setUsers([]);
    setTenantData(null);
    setProductCategories([]);
    setRawMaterialCategories([]);
    setCashClosings([]);
    setCashSession({ isOpen: false, openingValue: 0, openedAt: null });
    setAdminSettings({
      companyName: '',
      logoUrl: '',
      cnpj: '',
      address: '',
      phone: '',
      socialMedia: { instagram: '', facebook: '', whatsapp: '' },
      businessHours: [
        { day: 'Segunda-feira', open: '09:00', close: '22:00', isClosed: false },
        { day: 'Terça-feira', open: '09:00', close: '22:00', isClosed: false },
        { day: 'Quarta-feira', open: '09:00', close: '22:00', isClosed: false },
        { day: 'Quinta-feira', open: '09:00', close: '22:00', isClosed: false },
        { day: 'Sexta-feira', open: '09:00', close: '23:00', isClosed: false },
        { day: 'Sábado', open: '10:00', close: '23:00', isClosed: false },
        { day: 'Domingo', open: '10:00', close: '21:00', isClosed: false },
      ],
      fiscal: { 
        environment: 'homologacao', 
        certificateStatus: 'missing', 
        certificateExpiry: '', 
        cscId: '', 
        cscToken: '', 
        nextNfceNumber: 1, 
        series: 1, 
        taxRegime: 'simples_nacional',
        cnpj: '',
        razaoSocial: '',
        inscricaoEstadual: '',
        address: {
          logradouro: '',
          numero: '',
          bairro: '',
          municipio: '',
          uf: '',
          cep: '',
          codigoMunicipio: ''
        }
      } as any,
      printing: { paperWidth: '80mm', autoPrintOrder: false, headerText: '', footerText: '', showLogo: false },
      apis: { googleMapsKey: '', whatsappToken: '', ifoodWebhook: '', integrationActive: false },
      deliveryFee: 7.00,
      isDeliveryEnabled: true,
      isPickupEnabled: true,
      minOrderValue: 20.00,
      estimatedDeliveryTime: '30-45 min',
      estimatedPickupTime: '15-20 min',
      autoAcceptOrders: false,
      paymentMethods: [
        { id: '1', name: 'Dinheiro', type: 'cash', feePercentage: 0, active: true },
        { id: '2', name: 'Cartão de Crédito', type: 'credit', feePercentage: 3.2, active: true, operatorId: 'op-1' },
        { id: '3', name: 'Cartão de Débito', type: 'debit', feePercentage: 1.9, active: true, operatorId: 'op-1' },
        { id: '4', name: 'PIX', type: 'pix', feePercentage: 0, active: true },
        { id: '5', name: 'Vale Refeição', type: 'voucher', feePercentage: 5.0, active: true },
        { id: '6', name: 'Fiado (Conta Cliente)', type: 'account', feePercentage: 0, active: true },
      ],
      operators: [
        { id: 'op-1', name: 'Stone', active: true },
        { id: 'op-2', name: 'Rede', active: true },
        { id: 'op-3', name: 'Getnet', active: true },
      ],
      saasIntegration: {
        isCustomerAppEnabled: false,
        appFeePerOrder: 1.50,
        billingAccumulated: 0
      }
    });

    setDigitalMenuSettings({
      primaryColor: '#E31B23',
      accentColor: '#FACC15',
      fontFamily: 'sans',
      restaurantName: '',
      welcomeMessage: '',
      allowOrdering: true,
      showStock: true,
      bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop',
      logoUrl: '',
      categoryImages: {
        'Bebidas': 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=400',
        'Lanches': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
        'Porções': 'https://images.unsplash.com/photo-1541014741259-df549fa3322e?w=400',
        'Pratos': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
        'Sobremesas': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400'
      },
      dailyPromo: {
        title: '',
        subtitle: '',
        price: 0,
        originalPrice: 0,
        active: false
      }
    });
    notifiedOrdersRef.current.clear();
    setCashSession({ isOpen: false, openingValue: 0, openedAt: null });

    // PRIORIDADE: Primeiro o ID que estamos visualizando (Suporte), depois o ID do próprio usuário logado
    // Se for Super Admin, o padrão é a loja "Viva la fome" (ID: HCL1177LRQVPEKCTYRAHU7IGBQ42) para evitar o painel vazio/placeholder "KitchenFlow AI".
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || (isSuperAdmin ? 'HCL1177LRQVPEKCTYRAHU7IGBQ42' : '');
    if (!effectiveTenantId) {
      setTenantData(null);
      setAdminSettings(prev => ({
        ...prev,
        companyName: 'Viva Lá Fome!',
        logoUrl: ''
      }));
      setDigitalMenuSettings(prev => ({
        ...prev,
        restaurantName: 'Viva Lá Fome!',
        logoUrl: ''
      }));
      return;
    }

    let activeTenantName: string | null = null;
    let activeTenantLogo: string | null = null;

    const hasAdminAccess = !!user && !!currentUserData && (isSuperAdmin || ['SAAS_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'KDS'].includes(currentUserData.role));

    const collectionsToSync = [
      { name: 'products', setter: setProducts, syncType: 'snapshot', limit: 300 },
      { name: 'diningTables', setter: setTables, syncType: 'snapshot' }
    ];

    if (hasAdminAccess) {
      collectionsToSync.push(
        { name: 'customers', setter: setCustomers, syncType: 'snapshot', limit: 200 },
        { name: 'orders', setter: setOrders, syncType: 'snapshot', recentOnly: true, limit: 150 },
        { name: 'financialRecords', setter: setFinancialRecords, syncType: 'snapshot', limit: 100, recentOnly: true },
        { name: 'rawMaterials', setter: setRawMaterials, syncType: 'snapshot', limit: 200 },
        { name: 'bankAccounts', setter: setBankAccounts, syncType: 'snapshot', limit: 50 },
        { name: 'couriers', setter: setCouriers, syncType: 'snapshot', limit: 50 },
        { name: 'auditLogs', setter: setAuditLogs, syncType: 'snapshot', limit: 30 },
        { name: 'users', setter: setUsers, syncType: 'snapshot', limit: 50 },
        { name: 'cashClosings', setter: setCashClosings, syncType: 'snapshot', limit: 20 }
      );
    }

    const unsubscribes = collectionsToSync.map(col => {
      // Usar uma query simples de igualdade por tenantId para evitar dependência de índices compostos no Firestore
      const q = query(collection(db, col.name), where('tenantId', '==', effectiveTenantId));

      return onSnapshot(q, (snapshot) => {
        let items = snapshot.docs.map(doc => {
          const docData = doc.data();
          const item = convertTimestamps({ ...docData, _firestoreId: doc.id });
          // Use data's ID if present, otherwise fallback to Firestore doc ID
          if (item.id === undefined || item.id === null || (typeof item.id === 'number' && isNaN(item.id))) {
             item.id = doc.id;
          }
          
          // Preserve the original document ID for better identification in operations
          item.docId = doc.id;
          return item;
        });

        // Ordenação client-side para evitar a necessidade de índices compostos
        const sortField = col.name === 'orders' ? 'createdAt' : 
                          (col.name === 'auditLogs' || col.name === 'inventoryLogs' ? 'timestamp' : 
                          (col.name === 'financialRecords' ? 'date' : 
                          (col.name === 'cashClosings' ? 'closedAt' : null)));

        if (sortField) {
          items.sort((a, b) => {
            const timeA = a[sortField] instanceof Date ? a[sortField].getTime() : (a[sortField] ? new Date(a[sortField]).getTime() : 0);
            const timeB = b[sortField] instanceof Date ? b[sortField].getTime() : (b[sortField] ? new Date(b[sortField]).getTime() : 0);
            return timeB - timeA;
          });
        }

        // Filtros client-side para substituir filtros de desigualdade do Firestore
        if (col.recentOnly) {
          if (col.name === 'orders') {
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 36); // 36 horas
            items = items.filter(o => {
              const createdAt = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
              if (['pending', 'preparing', 'ready', 'delivering'].includes(o.status)) return true;
              return createdAt >= yesterday;
            });
          } else if (col.name === 'financialRecords') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            items = items.filter(f => {
              const dateVal = f.date instanceof Date ? f.date : new Date(f.date);
              return dateVal >= thirtyDaysAgo;
            });
          }
        }

        // Limitação client-side
        if (col.limit) {
          items = items.slice(0, col.limit);
        }

        if (col.name === 'orders') {
          // Proteção contra status repetidos e notificações (Sync Resiliency)
          const newOrders = items.filter((o: any) => 
            (o.status === 'preparing' || o.status === 'pending') && 
            !notifiedOrdersRef.current.has(o.id)
          );
          
          if (newOrders.length > 0) {
            newOrders.forEach(o => notifiedOrdersRef.current.add(o.id));
          }

          // Proteção contra downgrade de status para pedidos (Sync Resiliency)
          setOrders(prev => {
            const updated = [...prev];
            items.forEach((cloudOrder: any) => {
              const existingIdx = updated.findIndex(o => o.id === cloudOrder.id);
              if (existingIdx > -1) {
                const localStatus = updated[existingIdx].status;
                const cloudStatus = cloudOrder.status;
                const localPriority = STATUS_PRIORITY[localStatus] || 0;
                const cloudPriority = STATUS_PRIORITY[cloudStatus] || 0;

                const terminalStatuses = ['delivered', 'finished', 'cancelled'];
                const localIsTerminal = terminalStatuses.includes(localStatus);
                const cloudIsTerminal = terminalStatuses.includes(cloudStatus);

                // Se o status local já estiver mais avançado ou já for terminal, mantém o local
                // Exceto se o cloud for "cancelled" (cancelamento remoto deve ser respeitado)
                if ((localPriority > cloudPriority || (localIsTerminal && !cloudIsTerminal)) && cloudStatus !== 'cancelled') {
                  console.log(`Resilience: Ignored cloud status downgrade for order ${cloudOrder.id} (${cloudStatus} ignored, keeping ${localStatus})`);
                } else {
                  updated[existingIdx] = cloudOrder;
                }
              } else {
                updated.push(cloudOrder);
              }
            });
            return updated;
          });
        } else if (col.name === 'users') {
          const seenEmails = new Set<string>();
          const seenIds = new Set<string>();
          const uniqueUsers = items.filter((u: any) => {
            const emailKey = String(u.email || '').toLowerCase().trim();
            const idKey = String(u.id || '').trim();
            if (!emailKey || !idKey) return false;
            if (seenEmails.has(emailKey) || seenIds.has(idKey)) {
              return false;
            }
            seenEmails.add(emailKey);
            seenIds.add(idKey);
            return true;
          });
          col.setter(uniqueUsers);
        } else if (col.name === 'auditLogs') {
          const seen = new Set<string>();
          const uniqueLogs = items.filter((item: any) => {
            if (!item.id) return true;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          col.setter(uniqueLogs);
        } else {
          col.setter(items);
        }
      }, (error) => {
        if (error.message?.includes("Quota exceeded") || error.message?.includes("quota")) {
          setQuotaExceeded(true);
        } else {
          handleFirestoreError(error, OperationType.LIST, col.name);
        }
      });
    });

    const plansUnsub = onSnapshot(collection(db, 'plans'), (snapshot) => {
      const loadedPlans: Plan[] = [];
      snapshot.forEach((doc) => {
        loadedPlans.push({ id: doc.id, ...doc.data() } as Plan);
      });
      setPlans(loadedPlans);
    });

    const saasConfigUnsub = onSnapshot(doc(db, 'settings', 'saas_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSaasConfig({
          excedentOrderPrice: data.excedentOrderPrice !== undefined ? data.excedentOrderPrice : 0.20,
          maxExtraOrdersLimit: data.maxExtraOrdersLimit !== undefined ? data.maxExtraOrdersLimit : 1000,
          enableExtraOrdersLimit: data.enableExtraOrdersLimit !== undefined ? data.enableExtraOrdersLimit : false,
          volumeDiscounts: data.volumeDiscounts !== undefined ? data.volumeDiscounts : [
            { threshold: 500, discountPercent: 10 },
            { threshold: 1000, discountPercent: 20 }
          ]
        });
      }
    });

    const settingsUnsub = onSnapshot(doc(db, 'settings', effectiveTenantId), (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.data();
        const s = convertTimestamps(rawData);
        
        if (s.admin) {
          // Explicitly remove legacy cashSession from nested admin object if it exists
          const cleanAdmin = { ...s.admin };
          if (cleanAdmin.cashSession) delete cleanAdmin.cashSession;
          
          setAdminSettings(prev => {
            const finalCompanyName = activeTenantName || cleanAdmin.companyName || prev.companyName;
            const finalLogoUrl = activeTenantLogo || cleanAdmin.logoUrl || '';
            
            return {
              ...prev,
              ...cleanAdmin,
              companyName: finalCompanyName,
              logoUrl: finalLogoUrl,
              // Deep merge nested objects to avoid overwriting them completely if firestore doc is partial
              socialMedia: { ...(prev.socialMedia || {}), ...(cleanAdmin.socialMedia || {}) },
              fiscal: { ...(prev.fiscal || {}), ...(cleanAdmin.fiscal || {}) },
              printing: { ...(prev.printing || {}), ...(cleanAdmin.printing || {}) },
              apis: { ...(prev.apis || {}), ...(cleanAdmin.apis || {}) },
              saasIntegration: { ...(prev.saasIntegration || {}), ...(cleanAdmin.saasIntegration || {}) }
            };
          });
        }
        if (s.digitalMenu) {
          setDigitalMenuSettings(prev => {
            const finalRestaurantName = activeTenantName || s.digitalMenu.restaurantName || prev.restaurantName;
            const finalLogoUrl = activeTenantLogo || s.digitalMenu.logoUrl || '';
            
            return {
              ...prev,
              ...s.digitalMenu,
              restaurantName: finalRestaurantName,
              logoUrl: finalLogoUrl,
              dailyPromo: { ...(prev.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: false }), ...(s.digitalMenu.dailyPromo || {}) }
            };
          });
        }
        if (s.productCategories) {
          setProductCategories(s.productCategories);
        }
        if (s.rawMaterialCategories) {
          setRawMaterialCategories(s.rawMaterialCategories);
        }
        if (s.cashSession) {
          // Only update if we don't have pending writes to this specific field to avoid flipping back 
          // during a close/open operation. We ignore snapshots for 5 seconds after a local write.
          const now = Date.now();
          if (now - lastWriteTimeRef.current > 5000) {
            setCashSession(prev => {
              const incomingTime = s.cashSession.openedAt instanceof Date ? s.cashSession.openedAt.getTime() : (s.cashSession.openedAt ? new Date(s.cashSession.openedAt).getTime() : 0);
              const prevTime = prev.openedAt instanceof Date ? prev.openedAt.getTime() : (prev.openedAt ? new Date(prev.openedAt).getTime() : 0);
              
              if (prev.isOpen !== s.cashSession.isOpen || prevTime !== incomingTime) {
                return s.cashSession;
              }
              return prev;
            });
          }
        } else {
          // Safeguard: reset cash session if current tenant settings doc contains no open session
          setCashSession({ isOpen: false, openingValue: 0, openedAt: null });
        }
      }
    }, (error) => {
      if (error.message?.includes("Quota exceeded") || error.message?.includes("quota")) {
        setQuotaExceeded(true);
      } else {
        handleFirestoreError(error, OperationType.GET, `settings/${effectiveTenantId}`);
      }
    });

    const tenantUnsub = onSnapshot(doc(db, 'tenants', effectiveTenantId), (snapshot) => {
      if (snapshot.exists()) {
        const loadedTenant = convertTimestamps(snapshot.data()) as Tenant;
        setTenantData(loadedTenant);
        activeTenantName = loadedTenant.name;
        activeTenantLogo = loadedTenant.logoUrl || null;
        
        // Garante que os nomes de exibição nas configurações administrativas e do menu digital
        // correspondam exatamente ao nome do cliente (tenant) selecionado em tempo real,
        // evitando fallbacks indesejados para "Viva Lá Fome" ou dados de demonstração locais.
        setAdminSettings(prev => ({
          ...prev,
          companyName: loadedTenant.name || prev.companyName,
          logoUrl: loadedTenant.logoUrl || ''
        }));
        setDigitalMenuSettings(prev => ({
          ...prev,
          restaurantName: loadedTenant.name || prev.restaurantName,
          logoUrl: loadedTenant.logoUrl || ''
        }));
      }
    }, (error) => {
      if (error.message?.includes("Quota exceeded") || error.message?.includes("quota")) {
        setQuotaExceeded(true);
      } else {
        handleFirestoreError(error, OperationType.GET, `tenants/${effectiveTenantId}`);
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      settingsUnsub();
      tenantUnsub();
      plansUnsub();
      saasConfigUnsub();
    };
  }, [currentUserData?.tenantId, currentUserData?.role, viewingTenantId, isSuperAdmin, user]);

  // Monitorar estado de autenticação
  useEffect(() => {
    if (localStorage.getItem('kitchenflow_demo_user')) {
      setAuthLoading(false);
      return;
    }
    
    let userUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Desinscrever do ouvinte anterior se existir
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        // 1. Buscar dados do usuário no Firestore pelo UID
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userDocRef);

        let finalUserData: User | null = null;

        if (userDoc.exists()) {
          // Usuário já vinculado via UID
          finalUserData = convertTimestamps(userDoc.data()) as User;
        } else if (firebaseUser.email) {
          // 2. Se não encontrou pelo UID, tentar encontrar por EMAIL (Pré-cadastro ou alterado)
          const searchEmail = firebaseUser.email.toLowerCase().trim();
          const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', searchEmail), limit(1));
          let usersByEmailSnap = await getDocs(usersByEmailQuery);
          
          if (usersByEmailSnap.empty && searchEmail !== firebaseUser.email) {
            const exactQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email), limit(1));
            usersByEmailSnap = await getDocs(exactQuery);
          }
          
          if (!usersByEmailSnap.empty) {
            // Encontrou um pré-cadastro ou cadastro coincidente por email
            const existingUserDoc = usersByEmailSnap.docs[0];
            const existingUserData = existingUserDoc.data() as User;
            
            // Vincular o UID do Auth ao documento do Firestore (Convertendo random ID p/ UID)
            finalUserData = {
              ...existingUserData,
              id: firebaseUser.uid,
              updatedAt: new Date()
            } as any;

            // Criar novo documento com UID e remover o antigo
            await setDoc(userDocRef, finalUserData);
            if (existingUserDoc.id !== firebaseUser.uid) {
              await deleteDoc(existingUserDoc.ref);
            }
          }
        }

        // Se após as buscas o usuário ainda não possuir perfil no Firestore, nós auto-criamos
        // um perfil padrão (CUSTOMER se for no marketplace, OWNER se for no painel) associado ao tenant correspondente
        if (!finalUserData && firebaseUser.email) {
          const isMaster = firebaseUser.email === 'financeirorenanuk@gmail.com';
          const isMarketplaceRoute = window.location.pathname.startsWith('/marketplace') || window.location.hash.startsWith('#/marketplace');
          
          let role: UserRole = isMaster ? 'SAAS_ADMIN' : (isMarketplaceRoute ? 'CUSTOMER' : 'OWNER');
          let tenantId = isMaster ? '' : (isMarketplaceRoute ? 'GLOBAL' : 'HCL1177LRQVPEKCTYRAHU7IGBQ42');
          let defaultName = firebaseUser.displayName || firebaseUser.email.split('@')[0] || (isMarketplaceRoute ? 'Cliente' : 'Lojista');

          // Verificar se é entregador cadastrado na coleção de couriers
          const courierQuery = query(collection(db, 'couriers'), where('email', '==', firebaseUser.email.toLowerCase().trim()), limit(1));
          const courierSnap = await getDocs(courierQuery);
          if (!courierSnap.empty) {
            role = 'COURIER';
            tenantId = courierSnap.docs[0].data().tenantId || 'HCL1177LRQVPEKCTYRAHU7IGBQ42';
            defaultName = courierSnap.docs[0].data().name || defaultName;
          }

          const newUser: User = {
            id: firebaseUser.uid,
            name: defaultName,
            email: firebaseUser.email,
            role: role,
            tenantId: tenantId,
            permissions: isMaster 
              ? ALL_MODULES.map(m => m.id) 
              : ['dashboard_view', 'orders_view', 'menu_view', 'stock_view', 'finance_view', 'couriers_view', 'users_view', 'integrations_view', 'marketing_view', 'reports_view'] as any,
            status: 'online',
            active: true,
            createdAt: new Date()
          };

          await setDoc(userDocRef, newUser);
          finalUserData = newUser;
        }

        if (finalUserData) {
          // Se for o gestor/admin principal (financeirorenanuk@gmail.com ou SAAS_ADMIN), garante vínculo a 'HCL1177LRQVPEKCTYRAHU7IGBQ42' (Viva la fome) e o cargo SAAS_ADMIN
          const isMasterUser = firebaseUser.email === 'financeirorenanuk@gmail.com' || finalUserData.role === 'SAAS_ADMIN';
          if (isMasterUser) {
            let needsUpdate = false;
            const updatePayload: any = {};
            
            if (finalUserData.role !== 'SAAS_ADMIN') {
              finalUserData.role = 'SAAS_ADMIN';
              updatePayload.role = 'SAAS_ADMIN';
              needsUpdate = true;
            }
            if (finalUserData.tenantId !== 'HCL1177LRQVPEKCTYRAHU7IGBQ42') {
              finalUserData.tenantId = 'HCL1177LRQVPEKCTYRAHU7IGBQ42';
              updatePayload.tenantId = 'HCL1177LRQVPEKCTYRAHU7IGBQ42';
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              try {
                await setDoc(userDocRef, updatePayload, { merge: true });
              } catch (fsErr) {
                console.error("Erro ao sincronizar perfil do master no Firestore:", fsErr);
              }
            }
          }

          // Subscreve em tempo real a esse documento para que qualquer alteração de permissão,
          // cargo ou status feita pelo lojista ou admin do SaaS seja refletida instantaneamente!
          userUnsubscribe = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const liveUserData = convertTimestamps(snap.data()) as User;
              
              // Garante que o status do usuário seja online no Firestore
              if (liveUserData.status !== 'online') {
                liveUserData.status = 'online';
                setDoc(userDocRef, { status: 'online', updatedAt: new Date() }, { merge: true }).catch(() => {});
              }

              setCurrentUserData(liveUserData);
              try {
                localStorage.setItem('kitchenflow_cached_user', JSON.stringify(liveUserData));
              } catch (e) {
                console.warn(e);
              }

              // Se o usuário pertence a um tenant, buscar dados do tenant
              if (liveUserData.tenantId && liveUserData.tenantId !== 'GLOBAL') {
                getDoc(doc(db, 'tenants', liveUserData.tenantId)).then((tenantDoc) => {
                  if (tenantDoc.exists()) {
                    const tData = convertTimestamps(tenantDoc.data()) as Tenant;
                    setTenantData(tData);
                    try {
                      localStorage.setItem('kitchenflow_cached_tenant_data', JSON.stringify(tData));
                    } catch (e) {
                      console.warn(e);
                    }
                  }
                }).catch((err: any) => {
                  if (err.message?.includes("Quota exceeded")) {
                    console.warn("Cota do Firebase atingida. Usando dados básicos do tenant.");
                    const offlineTenant = { id: liveUserData.tenantId, name: 'Restaurante (Modo Offline)', plan: 'free' } as any;
                    setTenantData(offlineTenant);
                    try {
                      localStorage.setItem('kitchenflow_cached_tenant_data', JSON.stringify(offlineTenant));
                    } catch (e) {
                      console.warn(e);
                    }
                  }
                });
              }
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          });
        }
        
        // Auto-redirect for specific roles if on a neutral path
        const isNeutralPath = window.location.pathname === '/' && (!window.location.hash || window.location.hash === '#/');
        const finalUserPerms = getUserPermissions(finalUserData);
        const hasKDSKitchenOnly = finalUserPerms.includes('kds_kitchen_only_view');
        const isKDSOnlyUserLocal = finalUserData && 
          (hasKDSKitchenOnly || finalUserData.role === 'KDS') && 
          !finalUserPerms.includes('admin_settings_manage') && 
          !finalUserPerms.includes('finance_view') &&
          !finalUserPerms.includes('pos_access') &&
          !finalUserPerms.includes('tables_manage');

        if (isKDSOnlyUserLocal) {
          setActiveTab('kds-kitchen-only');
        } else if (finalUserData?.role === 'COURIER' && isNeutralPath) {
          setActiveTab('courier-app');
        } else if (finalUserData?.role === 'SAAS_ADMIN' && isNeutralPath) {
          navigate('/saas');
        }
      } else {
        setCurrentUserData(null);
        setTenantData(null);
        try {
          await authService.purgeAllCachesAndStorages();
        } catch (e) {
          console.warn(e);
        }
      }
      setAuthLoading(false);
    });

    // 3. Gerenciamento de Sessão Durável (Banco de Dados Fonte de Verdade)
    // Valida o status do usuário, do tenant e da assinatura a cada 30 segundos em background.
    const sessionInterval = setInterval(async () => {
      const sessionRaw = localStorage.getItem('kitchenflow_session');
      if (!sessionRaw) return;

      try {
        const session = JSON.parse(sessionRaw);
        if (!session || !session.refreshToken) return;

        const isExpiringSoon = session.expiration - Date.now() < 300000; // Expira em menos de 5 min ou já expirou
        if (isExpiringSoon) {
          console.log('[Session Manager] Token expirando ou vencido, renovando contra o Banco de Dados via AuthService (Fonte de Verdade)...');
          try {
            await authService.refreshSession(session.refreshToken);
            console.log('[Session Manager] Token de sessão renovado com sucesso via AuthService!');
          } catch (refreshErr: any) {
            console.error('[Session Manager] Erro crítico de validação contra o Banco de Dados:', refreshErr.message);
            console.error('[Session Manager] Sessão inválida, usuário suspenso ou plano expirado. Expulsando usuário...');
            await authService.logout();
            showToast(refreshErr.message || 'Sua sessão expirou ou sua conta foi suspensa temporariamente.', 'error');
            window.location.reload();
          }
        }
      } catch (err) {
        console.warn('[Session Manager] Falha no parseamento da sessão ativa:', err);
      }
    }, 30000);

    return () => {
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
      clearInterval(sessionInterval);
    };
  }, [navigate]);

  // Carregamento inicial do banco de dados (Apenas para uso local/demo ou se não estivermos sincronizando com nuvem)
  useEffect(() => {
    let isMounted = true;
    if (!user) return;
    const isDemoMode = !!localStorage.getItem('kitchenflow_demo_user');
    // Se estivermos visualizando um tenant específico em nuvem, não carregamos o mock local para não poluir o estado
    if (!isDemoMode && (viewingTenantId || (currentUserData && currentUserData.tenantId))) {
      setIsDbLoaded(true);
      return;
    }

    const initDb = async () => {
      try {
        const pCount = await localDb.products.count();
        if (pCount === 0 && isMounted) {
          // Popula com dados iniciais se estiver vazio
          await localDb.products.bulkAdd(INITIAL_PRODUCTS);
          await localDb.diningTables.bulkAdd(INITIAL_TABLES);
          await localDb.couriers.bulkAdd(INITIAL_COURIERS);
          await localDb.users.bulkAdd(INITIAL_USERS);
          await localDb.auditLogs.bulkAdd(INITIAL_AUDIT_LOGS);
          await localDb.rawMaterials.bulkAdd(INITIAL_RAW_MATERIALS);
          await localDb.settings.add({ 
            id: 'global', 
            admin: adminSettings, 
            digitalMenu: digitalMenuSettings 
          });
          await localDb.bankAccounts.add({
            id: '1',
            tenantId: 'default',
            name: 'Caixa Principal',
            bankName: 'Dinheiro',
            initialBalance: 0,
            currentBalance: 0,
            createdAt: new Date()
          });
        }

        // CARREGA APENAS SE NÃO ESTIVERMOS NO MODO NUVEM/TENANT (Para evitar sobrescrita)
        if ((isDemoMode || (!currentUserData?.tenantId && !viewingTenantId)) && isMounted) {
          const [p, t, c, o, u, l, f, s, rm, cc, ba] = await Promise.all([
            localDb.products.toArray(),
            localDb.diningTables.toArray(),
            localDb.couriers.toArray(),
            localDb.orders.toArray(),
            localDb.users.toArray(),
            localDb.auditLogs.toArray(),
            localDb.financialRecords.toArray(),
            localDb.settings.get('global'),
            localDb.rawMaterials.toArray(),
            localDb.cashClosings.toArray(),
            localDb.bankAccounts.toArray()
          ]);

          if (isMounted) {
            setProducts(p);
            setTables(t);
            setCouriers(c);
            setOrders(o.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
            setUsers(u);
            setAuditLogs(l.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
            setFinancialRecords(f.sort((a, b) => b.date.getTime() - a.date.getTime()));
            setRawMaterials(rm);
            setCashClosings(cc.sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime()));
            setBankAccounts(ba);
            
            if (s) {
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
              if (s.productCategories) {
                setProductCategories(s.productCategories);
              }
              if (s.rawMaterialCategories) {
                setRawMaterialCategories(s.rawMaterialCategories);
              }
            }

            // Clientes
            const cust = await localDb.customers.toArray();
            setCustomers(cust);

            setIsDbLoaded(true);
          }
        }
      } catch (err) {
        console.error("DB Initialization Error:", err);
      }
    };

    initDb();
    return () => { isMounted = false; };
  }, [user, viewingTenantId, currentUserData?.tenantId]);

  // Dynamic tab permissions map to auto-select allowed views on login or when activeTab becomes unpermitted
  useEffect(() => {
    if (!currentUserData) return;
    
    const isSuperAdmin = currentUserData.email?.toLowerCase() === 'financeirorenanuk@gmail.com' || currentUserData.role === 'SAAS_ADMIN';
    if (isSuperAdmin) return;

    // Special check for isKDSOnlyUser
    const userPerms = getUserPermissions(currentUserData);
    const hasKDSKitchenOnly = userPerms.includes('kds_kitchen_only_view');
    const isKDSOnlyUser = (hasKDSKitchenOnly || currentUserData.role === 'KDS') && 
      !userPerms.includes('admin_settings_manage') && 
      !userPerms.includes('finance_view') &&
      !userPerms.includes('pos_access') &&
      !userPerms.includes('tables_manage');

    if (isKDSOnlyUser) {
      if (activeTab !== 'kds-kitchen-only') {
        setActiveTab('kds-kitchen-only');
      }
      return;
    }

    // Verify if activeTab matches permitted menus
    const tabPermissions: Record<string, string> = {
      'merchant-copilot': 'finance_view',
      'tables': 'tables_manage',
      'kds': 'kds_view',
      'kds-kitchen-only': 'kds_kitchen_only_view',
      'order-monitor': 'kds_view',
      'delivery': 'delivery_manage',
      'digital-menu': 'digital_menu_manage',
      'customers': 'customers_manage',
      'inventory': 'inventory_edit',
      'finance': 'finance_view',
      'users': 'users_manage',
      'settings': 'admin_settings_manage'
    };

    const requiredPermission = tabPermissions[activeTab];
    if (requiredPermission) {
      const hasDirectPermission = userPerms.includes(requiredPermission as any);
      
      // Special allowance for kds-kitchen-only which can be opened by kds_view too
      const isAllowedKDSKitchen = activeTab === 'kds-kitchen-only' && userPerms.includes('kds_view');

      if (!hasDirectPermission && !isAllowedKDSKitchen) {
        // Active tab is not allowed, redirect to first allowed tab
        const menuTabsOrder = [
          { tab: 'merchant-copilot', perm: 'finance_view' },
          { tab: 'tables', perm: 'tables_manage' },
          { tab: 'kds', perm: 'kds_view' },
          { tab: 'kds-kitchen-only', perm: 'kds_kitchen_only_view' },
          { tab: 'order-monitor', perm: 'kds_view' },
          { tab: 'delivery', perm: 'delivery_manage' },
          { tab: 'digital-menu', perm: 'digital_menu_manage' },
          { tab: 'customers', perm: 'customers_manage' },
          { tab: 'inventory', perm: 'inventory_edit' },
          { tab: 'finance', perm: 'finance_view' },
          { tab: 'users', perm: 'users_manage' },
          { tab: 'settings', perm: 'admin_settings_manage' }
        ];

        const firstAllowed = menuTabsOrder.find(m => {
          if (m.tab === 'kds-kitchen-only') {
            return userPerms.includes('kds_view') || userPerms.includes('kds_kitchen_only_view');
          }
          return userPerms.includes(m.perm as any);
        });

        if (firstAllowed) {
          setActiveTab(firstAllowed.tab);
        } else {
          setActiveTab('support');
        }
      }
    }
  }, [currentUserData, activeTab, rolePermissions]);

  const handleLogout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { status: 'offline', updatedAt: new Date() });
      } catch (err) {
        console.warn("Erro ao atualizar status para offline no Firestore durante o logout:", err);
      }
    }
    signOut(auth);
    try {
      localStorage.removeItem('kitchenflow_demo_user');
      localStorage.removeItem('kitchenflow_cached_user');
      localStorage.removeItem('kitchenflow_cached_tenant_data');
      localStorage.removeItem('gastroai_cached_user');
      localStorage.removeItem('gastroai_cached_tenant_data');
      window.location.reload();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      const s = await localDb.settings.get(effectiveTenantId || 'global');
      
      // Ensure images are compressed before saving to Firestore (1MB limit)
      let compressedLogo = digitalMenuSettings.logoUrl;
      let compressedBanner = digitalMenuSettings.bannerUrl;
      let compressedAdminLogo = adminSettings.logoUrl;

      if (compressedLogo && compressedLogo.length > 100000 && compressedLogo.startsWith('data:image/')) {
        compressedLogo = await compressImage(compressedLogo, 400, 400, 0.7);
      }
      if (compressedBanner && compressedBanner.length > 200000 && compressedBanner.startsWith('data:image/')) {
        compressedBanner = await compressImage(compressedBanner, 800, 450, 0.7);
      }
      if (compressedAdminLogo && compressedAdminLogo.length > 100000 && compressedAdminLogo.startsWith('data:image/')) {
        compressedAdminLogo = await compressImage(compressedAdminLogo, 400, 400, 0.7);
      }

      const updatedDigitalMenu = { ...digitalMenuSettings, logoUrl: compressedLogo, bannerUrl: compressedBanner };
      const updatedAdmin = { ...adminSettings, logoUrl: compressedAdminLogo };

      // Limpar campos de estado interno que não devem ir para o Firestore admin settings
      const adminToSync = { ...updatedAdmin };
      if ((adminToSync as any).cashSession) delete (adminToSync as any).cashSession;

      await localDb.settings.put({
        id: effectiveTenantId || 'global',
        admin: updatedAdmin,
        digitalMenu: updatedDigitalMenu,
        cashSession: cashSession, // MANDATORY: Use active React state, never fall back to other-tenant s?.cashSession!
        productCategories,
        rawMaterialCategories
      });

      // Sync to Firestore if tenantId exists
      if (effectiveTenantId) {
        const batch = writeBatch(db);
        
        // Sync Settings
        batch.set(doc(db, 'settings', effectiveTenantId), {
          admin: cleanObject(adminToSync),
          digitalMenu: cleanObject(updatedDigitalMenu),
          cashSession: cashSession, // MANDATORY: Use active React state, never fall back to other-tenant s?.cashSession!
          productCategories,
          rawMaterialCategories,
          updatedAt: new Date()
        }, { merge: true });
        
        // Sync Tenant Profile (This is what shows up in the Marketplace and SaaS Admin)
        const tenantUpdate: any = {
          logoUrl: updatedDigitalMenu.logoUrl || updatedAdmin.logoUrl || tenantData?.logoUrl,
          bannerUrl: updatedDigitalMenu.bannerUrl || tenantData?.bannerUrl,
          description: updatedDigitalMenu.welcomeMessage,
          name: updatedDigitalMenu.restaurantName || updatedAdmin.companyName,
          cnpj: updatedAdmin.cnpj || tenantData?.cnpj,
          address: updatedAdmin.address,
          phone: updatedAdmin.phone,
          updatedAt: new Date()
        };

        if (tenantData?.category) {
          tenantUpdate.category = tenantData.category;
        }

        batch.set(doc(db, 'tenants', effectiveTenantId), cleanObject(tenantUpdate), { merge: true });

        // Batch sync products for public marketplace visibility
        const currentProducts = effectiveTenantId ? products : await localDb.products.toArray();
        // Only sync products that are available for marketplace
        const productsToSync = currentProducts.filter(p => p.isAvailableOnline);
        
        // Limit to 480 to stay within 500 batch limit
        productsToSync.slice(0, 480).forEach(product => {
          batch.set(doc(db, 'products', product.id), {
            ...product,
            active: product.active ?? true,
            updatedAt: new Date(),
            tenantId: effectiveTenantId
          }, { merge: true });
        });

        await batch.commit();
        console.log(`Cloud Sync: Synchronized ${currentProducts.length} items to Marketplace.`);
      }

      return true;
    } catch (err) {
      console.error("Error saving settings:", err);
      return false;
    }
  };

  const weeklySalesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return { 
        name: d.toLocaleDateString('pt-BR', { weekday: 'short' }), 
        date: d,
        sales: 0 
      };
    });

    orders.forEach(order => {
      if (order.status === 'finished' || order.status === 'delivered') {
        const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
        const dayMatch = last7Days.find(d => 
          d.date.getDate() === orderDate.getDate() && 
          d.date.getMonth() === orderDate.getMonth()
        );
        if (dayMatch) {
          dayMatch.sales += order.total || 0;
        }
      }
    });

    return last7Days.map(({ name, sales }) => ({ name, sales }));
  }, [orders]);

  const dailyStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(o => {
      const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      return d >= today && (o.status === 'finished' || o.status === 'delivered');
    });

    return {
      total: todayOrders.reduce((acc, o) => acc + (o.total || 0), 0),
      count: todayOrders.length,
      average: todayOrders.length > 0 ? todayOrders.reduce((acc, o) => acc + (o.total || 0), 0) / todayOrders.length : 0
    };
  }, [orders]);

  const dailyCashFlow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = financialRecords.filter(r => {
      const recordDate = r.date instanceof Date ? r.date : new Date(r.date);
      const rd = new Date(recordDate);
      rd.setHours(0, 0, 0, 0);
      return rd.getTime() === today.getTime();
    });

    const entries = todayRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const outlays = todayRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const net = entries - outlays;

    const recentMovements = [...todayRecords]
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return db.getTime() - da.getTime();
      })
      .slice(0, 5);

    const categorySums = {
      tables: 0,
      delivery: 0,
      marketplace: 0,
      digitalMenu: 0,
      balcao: 0,
      others: 0
    };

    todayRecords.filter(r => r.type === 'income').forEach(r => {
      const desc = (r.description || "").toLowerCase();
      const cat = (r.category || "").toLowerCase();
      
      if (desc.includes("marketplace") || cat.includes("marketplace") || desc.includes("site delivery") || desc.includes("ifood")) {
        categorySums.marketplace += r.amount || 0;
      } else if (desc.includes("digital") || desc.includes("cardápio") || cat.includes("digital") || cat.includes("cardápio") || desc.includes("qr code") || desc.includes("qrcode")) {
        categorySums.digitalMenu += r.amount || 0;
      } else if (desc.includes("mesa") || cat.includes("mesa") || desc.includes("consumo")) {
        categorySums.tables += r.amount || 0;
      } else if (desc.includes("entrega") || cat.includes("entrega") || desc.includes("delivery") || cat.includes("delivery")) {
        categorySums.delivery += r.amount || 0;
      } else if (desc.includes("balcão") || cat.includes("balcão") || desc.includes("balcao") || cat.includes("balcao") || desc.includes("takeout") || cat.includes("takeout") || desc.includes("retirada") || cat.includes("retirada") || desc.includes("retirar") || cat.includes("retirar")) {
        categorySums.balcao += r.amount || 0;
      } else {
        if (desc.startsWith("mesa ") || desc.startsWith("consumo parcial mesa")) {
          categorySums.tables += r.amount || 0;
        } else if (desc.includes("abertura de caixa") || desc.includes("suprimento")) {
          categorySums.others += r.amount || 0;
        } else {
          categorySums.balcao += r.amount || 0;
        }
      }
    });

    return {
      entries,
      outlays,
      net,
      recentMovements,
      categorySums
    };
  }, [financialRecords]);
  useEffect(() => {
    if (isDbLoaded) {
      const clearOldOrders = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const oldFinishedOrders = await localDb.orders
          .where('status')
          .equals('finished')
          .filter(o => new Date(o.createdAt) < today)
          .toArray();
          
        if (oldFinishedOrders.length > 0) {
          const ids = oldFinishedOrders.map(o => o.id);
          await localDb.orders.bulkDelete(ids);
          setOrders(prev => prev.filter(o => !ids.includes(o.id)));
          console.log(`Limpando ${ids.length} pedidos finalizados de dias anteriores.`);
        }
      };
      clearOldOrders();
    }
  }, [isDbLoaded]);

  // Real-time Cloud Order Listener (Marketplace Integration)
  useEffect(() => {
    const hasAdminAccess = !!user && !!currentUserData && (isSuperAdmin || ['SAAS_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'KDS'].includes(currentUserData.role));
    if (!hasAdminAccess) return;

    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    if (effectiveTenantId) {
      // Usar query simples por tenantId para evitar dependência de índices compostos
      const q = query(
        collection(db, 'orders'),
        where('tenantId', '==', effectiveTenantId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const docData = change.doc.data();
          const isPending = docData.status === 'pending';

          if (change.type === 'added' || change.type === 'modified') {
            if (isPending) {
              const cloudOrder = { ...docData, id: change.doc.id } as Order;
              
              const createdAt = cloudOrder.createdAt instanceof Date 
                ? cloudOrder.createdAt 
                : (cloudOrder.createdAt ? new Date((cloudOrder.createdAt as any).toDate ? (cloudOrder.createdAt as any).toDate() : cloudOrder.createdAt) : null);
              
              const yesterday = new Date();
              yesterday.setHours(yesterday.getHours() - 36);
              if (createdAt && createdAt < yesterday) {
                return;
              }

              try {
                const localOrder = await localDb.orders.get(cloudOrder.id);
                // Ignore if already processed or in a final state locally
                if (localOrder && (['preparing', 'ready', 'delivering', 'delivered', 'cancelled', 'finished'].includes(localOrder.status))) {
                  console.log(`Sync: Order ${cloudOrder.id} already in state ${localOrder.status}, ignoring duplicate notify.`);
                  return;
                }

                // Double check if it's already in the main state to prevent UI flickers
                if (ordersRef.current.some(o => o.id === cloudOrder.id && (['preparing', 'ready', 'delivering', 'delivered', 'cancelled', 'finished'].includes(o.status)))) {
                  return;
                }

                if ((cloudOrder.createdAt as any)?.toDate) {
                  cloudOrder.createdAt = (cloudOrder.createdAt as any).toDate();
                } else if (cloudOrder.createdAt) {
                  cloudOrder.createdAt = new Date(cloudOrder.createdAt);
                }
                
                // Notify about new marketplace/digital order
                triggerWhatsAppMock("🛒 Novo Pedido!", `Olá! Você recebeu um novo pedido de ${cloudOrder.customerName} via ${cloudOrder.source === 'marketplace' ? 'Marketplace' : 'Cardápio Digital'}.`);

                if (adminSettings.autoAcceptOrders) {
                   const rawAcceptedOrder: Order = { 
                     ...cloudOrder, 
                     source: cloudOrder.source || 'whatsapp',
                     status: 'preparing' as const, 
                     deliveryFee: cloudOrder.type === 'delivery' ? globalDeliveryFee : 0 
                   };
                   const acceptedOrder = assignDailyNumberToOrder(rawAcceptedOrder);
                   await localDb.orders.put(acceptedOrder);
                   setOrders(prev => [acceptedOrder, ...prev.filter(o => o.id !== acceptedOrder.id)]);
                   
                   await updateDoc(doc(db, 'orders', cloudOrder.id), { 
                     status: 'preparing', 
                     updatedAt: new Date(),
                     acceptedAt: new Date(),
                     dailyNumber: acceptedOrder.dailyNumber
                   });
                   
                   triggerWhatsAppMock("✅ Pedido Aceito!", `Olá ${cloudOrder.customerName}, pedido #${cloudOrder.id.slice(-4)} em produção!`);
                   addLog('u1', 'DIGITAL', `Pedido #${cloudOrder.id.slice(-4)} ACEITO AUTOMATICAMENTE`);
                   return;
                }

                setIncomingDigitalOrders(prev => {
                  if (prev.some(o => o.id === cloudOrder.id)) return prev;
                  return [cloudOrder, ...prev];
                });
                addLog('u1', 'DIGITAL', `Novo pedido digital: #${cloudOrder.id.slice(-4)}`);
              } catch (err) {
                console.error("Error processing cloud order:", err);
              }
            } else {
              // Se foi modificado e não é mais pending, removemos da fila de pendentes (foi aceito ou recusado)
              setIncomingDigitalOrders(prev => prev.filter(o => o.id !== change.doc.id));
            }
          } else if (change.type === 'removed') {
            setIncomingDigitalOrders(prev => prev.filter(o => o.id !== change.doc.id));
          }
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });

      return () => unsubscribe();
    }
  }, [currentUserData?.tenantId, currentUserData?.role, viewingTenantId, isSuperAdmin, adminSettings.autoAcceptOrders, globalDeliveryFee, user]);

  const [mockWhatsAppNotify, setMockWhatsAppNotify] = useState<{title: string, msg: string} | null>(null);

  const triggerWhatsAppMock = (title: string, msg: string) => {
    setMockWhatsAppNotify({ title, msg });
    setTimeout(() => setMockWhatsAppNotify(null), 5000);
  };

  const handleAddFinancialRecord = async (record: Partial<FinancialRecord>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    if (!record.amount || record.amount <= 0) {
      showToast("Por favor, informe um valor válido.", 'error');
      return;
    }

    // Calculo automático de taxas com base na forma de pagamento
    let feeAmount = record.feeAmount || 0;
    if (record.paymentMethod && record.type === 'income' && !record.feeAmount && adminSettings?.paymentMethods) {
       const methodConfig = adminSettings.paymentMethods.find(m => 
          m.name.toLowerCase() === record.paymentMethod?.toLowerCase() || 
          m.type === record.paymentMethod?.toLowerCase()
       );
       
       if (methodConfig && methodConfig.feePercentage > 0) {
          feeAmount = (record.amount * methodConfig.feePercentage) / 100;
          if (methodConfig.fixedFee) feeAmount += methodConfig.fixedFee;
       }
    }

    const newRecord: FinancialRecord = {
      id: record.id || Math.random().toString(36).substr(2, 9),
      tenantId: effectiveTenantId || 't1',
      type: record.type || 'expense',
      amount: record.amount || 0,
      feeAmount,
      paymentMethod: record.paymentMethod,
      category: record.category || 'Outros',
      description: record.description || 'Lançamento manual',
      date: record.date || new Date(),
      shiftOpenedAt: cashSession.isOpen ? (cashSession.openedAt || new Date()) : undefined
    };
    
    // Optimistic Update
    setFinancialRecords(prev => [newRecord, ...prev]);

    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'financialRecords', newRecord.id), cleanObject({
          ...newRecord,
          createdAt: new Date()
        }));
        showToast(`Lançamento realizado: ${newRecord.description}`);
      } catch (err) {
        console.error("Error syncing financial record:", err);
        showToast("Erro ao sincronizar com a nuvem.", 'error');
      }
    } else {
      await localDb.financialRecords.put(newRecord);
    }
    
    addLog('u1', 'FINANCEIRO', `Novo lançamento: ${newRecord.description}`);
  };

  const handleUpdateFinancialRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await setDoc(doc(db, 'financialRecords', id), {
        ...updates,
        updatedAt: new Date()
      }, { merge: true });
    } else {
      await localDb.financialRecords.update(id, updates);
    }
    setFinancialRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    addLog('u1', 'FINANCEIRO', `Registro financeiro updated: ${id}`);
  };

  const handleDeleteFinancialRecord = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await deleteDoc(doc(db, 'financialRecords', id));
    } else {
      await localDb.financialRecords.delete(id);
    }
    setFinancialRecords(prev => prev.filter(r => r.id !== id));
    addLog('u1', 'FINANCEIRO', `Registro financeiro excluído: ${id}`);
  };

  const handleClearSalesAndFinance = async () => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    // 1. Clear Local Database (IndexedDB)
    await localDb.orders.clear();
    await localDb.financialRecords.clear();
    await localDb.cashClosings.clear();
    await localDb.counterOrders.clear();
    
    const localTables = await localDb.diningTables.toArray();
    for (const t of localTables) {
      await localDb.diningTables.update(t.id, {
        status: 'available',
        items: [],
        total: 0,
        currentOrderId: null
      } as any);
    }
    
    const s = await localDb.settings.get('global');
    if (s) {
      await localDb.settings.put({
        ...s,
        cashSession: { isOpen: false, openingValue: 0, openedAt: null }
      });
    }

    // 2. Reset React State
    setOrders([]);
    setFinancialRecords([]);
    setCashClosings([]);
    setTables(prev => prev.map(t => ({ ...t, status: 'available', items: [], total: 0, currentOrderId: null } as any)));
    setCashSession({ isOpen: false, openingValue: 0, openedAt: null });

    // 3. Reset Cloud Database (Firestore)
    if (effectiveTenantId) {
      try {
        const collectionsToClear = ['orders', 'financialRecords', 'cashClosings', 'counterOrders'];
        
        for (const colName of collectionsToClear) {
          const snapshot = await getDocs(query(
            collection(db, colName),
            where('tenantId', '==', effectiveTenantId)
          ));
          
          if (!snapshot.empty) {
            let batch = writeBatch(db);
            let count = 0;
            for (const docSnap of snapshot.docs) {
              batch.delete(docSnap.ref);
              count++;
              if (count >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
              }
            }
            if (count > 0) {
              await batch.commit();
            }
          }
        }

        // Reset Firestore tables
        const tablesSnapshot = await getDocs(query(
          collection(db, 'diningTables'),
          where('tenantId', '==', effectiveTenantId)
        ));
        
        if (!tablesSnapshot.empty) {
          const batch = writeBatch(db);
          tablesSnapshot.docs.forEach(docSnap => {
            batch.update(docSnap.ref, {
              status: 'available',
              items: [],
              total: 0,
              currentOrderId: null,
              updatedAt: new Date()
            });
          });
          await batch.commit();
        }

        // Reset Settings on Cloud
        const settingsRef = doc(db, 'settings', effectiveTenantId);
        await updateDoc(settingsRef, {
          cashSession: { isOpen: false, openingValue: 0, openedAt: null }
        }).catch(() => {});

        showToast("Dados de vendas e financeiro limpos da nuvem e local.");
      } catch (cloudErr) {
        console.error("Erro ao sincronizar limpeza com Firestore:", cloudErr);
        throw new Error("Erro ao limpar dados na nuvem: " + (cloudErr as Error).message);
      }
    } else {
      showToast("Dados de vendas e financeiro apagados localmente!");
    }

    addLog('u1', 'SISTEMA', `Limpeza de movimentações de vendas e financeiro concluída`);
  };

  const handleAddBankAccount = async (bank: Partial<BankAccount>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const newBank: BankAccount = {
      id: bank.id || Math.random().toString(36).substr(2, 9),
      tenantId: effectiveTenantId || 't1',
      name: bank.name || '',
      bankName: bank.bankName || '',
      initialBalance: bank.initialBalance || 0,
      currentBalance: bank.initialBalance || 0,
      createdAt: new Date()
    };

    if (effectiveTenantId) {
      await setDoc(doc(db, 'bankAccounts', newBank.id), cleanObject({
        ...newBank,
        createdAt: new Date()
      }));
    } else {
      await localDb.bankAccounts.add(newBank);
      setBankAccounts(prev => [...prev, newBank]);
    }
    
    addLog('u1', 'FINANCEIRO', `Nova conta bancária: ${newBank.name}`);
  };

  const handleUpdateBankAccount = async (id: string, updates: Partial<BankAccount>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await setDoc(doc(db, 'bankAccounts', id), {
        ...updates,
        updatedAt: new Date()
      }, { merge: true });
    } else {
      await localDb.bankAccounts.update(id, updates);
      setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }
    addLog('u1', 'FINANCEIRO', `Conta bancária atualizada: ${id}`);
  };

  const handleDeleteBankAccount = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await deleteDoc(doc(db, 'bankAccounts', id));
    } else {
      await localDb.bankAccounts.delete(id);
      setBankAccounts(prev => prev.filter(b => b.id !== id));
    }
    addLog('u1', 'FINANCEIRO', `Conta bancária excluída: ${id}`);
  };

  const handleAddCustomer = async (customer: Partial<Customer>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const normalizePhone = (p?: string) => p ? p.replace(/\D/g, '') : '';
    const incomingPhoneNorm = normalizePhone(customer.phone);

    // Encontrar o primeiro cliente já cadastrado com este telefone (normalizado)
    const existing = customers.find(c => normalizePhone(c.phone) === incomingPhoneNorm);

    if (existing) {
      const balanceToMerge = customer.balance || 0;
      const historyToMerge = customer.history || [];
      const updatedAddresses = Array.from(new Set([
        ...(existing.addresses || []),
        ...(customer.addresses || []),
        ...(customer.address ? [customer.address] : [])
      ])).filter(Boolean);

      const updatedFields: Partial<Customer> = {
        balance: existing.balance + balanceToMerge,
        history: [...historyToMerge, ...existing.history],
        addresses: updatedAddresses
      };

      if (customer.name && !existing.name) {
        updatedFields.name = customer.name;
      }
      if (customer.document && !existing.document) {
        updatedFields.document = customer.document;
      }
      if (customer.email && !existing.email) {
        updatedFields.email = customer.email;
      }

      await handleUpdateCustomer(existing.id, updatedFields);
      addLog('u1', 'CLIENTES', `Cliente com telefone duplicado (${customer.phone}) unificado no perfil existente: ${existing.name}`);
      return existing;
    }

    const newCustomer: Customer = {
      id: customer.id || `ct-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tenantId: effectiveTenantId || 't1',
      name: customer.name || '',
      document: customer.document || '',
      phone: customer.phone || '',
      email: customer.email,
      address: customer.address,
      addresses: customer.address ? [customer.address] : [],
      balance: customer.balance || 0,
      createdAt: new Date(),
      history: customer.history || []
    };

    if (effectiveTenantId) {
      await setDoc(doc(db, 'customers', newCustomer.id), cleanObject({
        ...newCustomer,
        createdAt: new Date()
      }));
      // OPTIMISTIC LOCAL STATE UPDATE - CRITICAL FOR IN-CONTEXT CUSTOMER ACCESS
      setCustomers(prev => {
        const exists = prev.some(c => c.id === newCustomer.id);
        if (exists) return prev.map(c => c.id === newCustomer.id ? newCustomer : c);
        return [newCustomer, ...prev];
      });
    } else {
      await localDb.customers.put(newCustomer);
      setCustomers(prev => [newCustomer, ...prev]);
    }
    
    addLog('u1', 'CLIENTES', `Novo cliente cadastrado: ${newCustomer.name}`);
    return newCustomer;
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const normalizePhone = (p?: string) => p ? p.replace(/\D/g, '') : '';

    if (updates.phone) {
      const currentCustomer = customers.find(c => c.id === id);
      if (currentCustomer) {
        const targetPhoneNorm = normalizePhone(updates.phone);
        // Procurar se existe OUTRO cliente com este mesmo telefone (normalizado)
        const existingOther = customers.find(c => c.id !== id && normalizePhone(c.phone) === targetPhoneNorm);

        if (existingOther) {
          // Unificar o cliente atual (id) dentro do outro existente (existingOther)
          const balanceToMerge = currentCustomer.balance;
          const historyToMerge = currentCustomer.history || [];
          const updatedAddresses = Array.from(new Set([
            ...(existingOther.addresses || []),
            ...(currentCustomer.addresses || []),
            ...(currentCustomer.address ? [currentCustomer.address] : []),
            ...(updates.address ? [updates.address] : [])
          ])).filter(Boolean);

          const mergedFields: Partial<Customer> = {
            balance: existingOther.balance + balanceToMerge,
            history: [...historyToMerge, ...existingOther.history],
            addresses: updatedAddresses
          };

          if (updates.name) {
            mergedFields.name = updates.name;
          }
          if (updates.document && !existingOther.document) {
            mergedFields.document = updates.document;
          }
          if (updates.email && !existingOther.email) {
            mergedFields.email = updates.email;
          }

          // 1. Atualizar o cliente existente (existingOther)
          if (effectiveTenantId) {
            await setDoc(doc(db, 'customers', existingOther.id), cleanObject({
              ...mergedFields,
              updatedAt: new Date()
            }), { merge: true });
          } else {
            const currentOtherFull = { ...existingOther, ...mergedFields };
            await localDb.customers.put(currentOtherFull);
            setCustomers(prev => prev.filter(c => c.id !== id).map(c => c.id === existingOther.id ? currentOtherFull : c));
          }

          // 2. Apagar o cliente duplicado que foi unificado (id)
          if (effectiveTenantId) {
            await deleteDoc(doc(db, 'customers', id));
          } else {
            await localDb.customers.delete(id);
            setCustomers(prev => prev.filter(c => c.id !== id));
          }

          // 3. Atualizar todos os pedidos/historico antigos para apontar para o novo customerId unificado
          const relatedOrders = orders.filter(o => o.customerId === id);
          if (relatedOrders.length > 0) {
            if (effectiveTenantId) {
              const batch = writeBatch(db);
              relatedOrders.forEach(o => {
                const targetDocId = o.docId || o.id;
                batch.update(doc(db, 'orders', targetDocId), { customerId: existingOther.id });
              });
              await batch.commit();
            } else {
              for (const o of relatedOrders) {
                await localDb.orders.update(o.id, { customerId: existingOther.id });
              }
              setOrders(prev => prev.map(o => o.customerId === id ? { ...o, customerId: existingOther.id } : o));
            }
          }

          addLog('u1', 'CLIENTES', `Unificação por telefone: Cliente "${currentCustomer.name}" foi unificado com "${existingOther.name}" por conflito de telefone.`);
          return;
        }
      }
    }

    if (effectiveTenantId) {
      await setDoc(doc(db, 'customers', id), cleanObject({
        ...updates,
        updatedAt: new Date()
      }), { merge: true });
      // OPTIMISTIC LOCAL STATE UPDATE - CRITICAL FOR REALTIME RESPONSIVENESS
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } else {
      await localDb.customers.update(id, updates);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
    addLog('u1', 'CLIENTES', `Cliente atualizado: ${id}`);
  };

  const handleUpdateCourier = async (id: string, updates: Partial<Courier>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await setDoc(doc(db, 'couriers', id), cleanObject({
        ...updates,
        updatedAt: new Date()
      }), { merge: true });

      // Sincronizar de volta com a coleção 'users'
      try {
        const userDocRef = doc(db, 'users', id);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userUpdates: any = {};
          if (updates.name !== undefined) userUpdates.name = updates.name;
          if (updates.email !== undefined) userUpdates.email = updates.email;
          if (updates.active !== undefined) userUpdates.active = updates.active;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          if ((updates as any).password !== undefined) userUpdates.password = (updates as any).password;
          
          if (Object.keys(userUpdates).length > 0) {
            await setDoc(userDocRef, {
              ...userUpdates,
              updatedAt: new Date()
            }, { merge: true });
          }
        }
      } catch (syncErr) {
        console.error("Erro ao sincronizar update de courier com users:", syncErr);
      }
    } else {
      await localDb.couriers.update(id, updates);
      setCouriers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
    addLog('u1', 'ENTREGAS', `Entregador atualizado: ${id}`);
  };

  const handleReturnCourierCash = async (courierId: string, amount: number) => {
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return;

    const newCashHeld = Math.max(0, (courier.cashHeld || 0) - amount);
    await handleUpdateCourier(courierId, { cashHeld: newCashHeld });
    
    // Registrar entrada no financeiro como recebimento de motoboy
    await handleAddFinancialRecord({
      type: 'income',
      amount: amount,
      category: 'Recebimento Motoboy',
      description: `Dinheiro devolvido por ${courier.name}`,
      date: new Date()
    });

    addLog('u1', 'FINANCEIRO', `Recebido R$ ${amount.toFixed(2)} de ${courier.name}. Saldo em mãos atualizado.`);
  };

  const handleSendToKitchen = async (tableId: number | string, items: OrderItem[], isCounter?: boolean) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    // Encontrar o número da mesa para exibir no KDS em vez do ID técnico
    const tableInfo = isCounter 
      ? counterOrders.find(t => t.id === tableId)
      : tables.find(t => t.id === tableId || (t as any).docId === tableId);
    
    const displayTableNumber = tableInfo ? tableInfo.number : tableId;

    // Check if we are updating an existing active order for this table
    const activeOrder = orders.find(o => 
      o.type === (isCounter ? 'takeout' : 'table') &&
      (o.id === tableId || String(o.tableNumber) === String(displayTableNumber)) && 
      !['finished', 'cancelled', 'delivered'].includes(o.status)
    );
    
    if (activeOrder) {
      const updatedItems = [...activeOrder.items];
      items.forEach(newItem => {
        updatedItems.push({ ...newItem, sentToKitchen: true });
      });

      // Reset status to 'preparing' so it reappears/remains in the KDS preparing section for the kitchen staff to see and produce
      const updates: Partial<Order> = {
        items: updatedItems,
        total: updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
        status: 'preparing',
        updatedAt: new Date()
      };

      if (effectiveTenantId) {
        const targetDocId = activeOrder.docId || activeOrder.id;
        try {
          await setDoc(doc(db, 'orders', targetDocId), updates, { merge: true });
          
          // Ensure table currentOrderId is synced
          if (!isCounter) {
            const docId = (tableInfo as any)?.docId || (typeof tableId === 'string' ? tableId : null);
            if (docId) {
              await updateDoc(doc(db, 'diningTables', docId), { currentOrderId: activeOrder.id });
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `orders/${targetDocId}`);
        }
      }
      
      await localDb.orders.update(activeOrder.id, updates);
      setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, ...updates } as Order : o));
      addLog('u1', 'COZINHA', `Pedido ${activeOrder.id} (Mesa ${displayTableNumber}) atualizado com novos itens`);
      return;
    }

    const rawKitchenOrder: Order = {
      id: `KDS-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      tableNumber: displayTableNumber, 
      type: isCounter ? 'takeout' : 'table',
      status: 'preparing',
      items: items.map(i => ({ ...i, sentToKitchen: true })),
      total: items.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      createdAt: new Date(),
      tenantId: effectiveTenantId || 't1'
    };
    const kitchenOrder = assignDailyNumberToOrder(rawKitchenOrder);

    if (effectiveTenantId) {
       await setDoc(doc(db, 'orders', kitchenOrder.id), cleanObject({
         ...kitchenOrder,
         createdAt: new Date()
       }));
       
       // Importante: atualizar a mesa com o currentOrderId para evitar duplicidade no fechamento
       if (!isCounter) {
          const docId = (tableInfo as any)?.docId || (typeof tableId === 'string' ? tableId : null);
          if (docId) {
            await updateDoc(doc(db, 'diningTables', docId), { currentOrderId: kitchenOrder.id });
          }
       }
    }
    
    // Atualizar estado local da mesa também
    if (isCounter) {
      setCounterOrders(prev => prev.map(t => t.id === tableId ? { ...t, currentOrderId: kitchenOrder.id } : t));
    } else {
      setTables(prev => prev.map(t => t.id === tableId || (t as any).docId === tableId ? { ...t, currentOrderId: kitchenOrder.id } : t));
    }

    await localDb.orders.put(kitchenOrder);
    setOrders(prev => [kitchenOrder, ...prev.filter(o => o.id !== kitchenOrder.id)]);
    addLog('u1', 'COZINHA', `Pedido enviado para cozinha: ${isCounter ? 'Balcão' : `Mesa ${displayTableNumber}`}`);
  };

  const handleUpdateLogisticsSettings = async (updates: Partial<AdminSettings>) => {
    // Remove cashSession from updates to prevent it from leaking into admin settings doc
    const filteredUpdates = { ...updates };
    if ((filteredUpdates as any).cashSession) delete (filteredUpdates as any).cashSession;

    const newSettings = { ...adminSettings, ...filteredUpdates };
    setAdminSettings(newSettings);
    
    // Create a clean version for cloud avoiding cashSession in the admin nested object
    const cleanAdminForCloud = { ...newSettings };
    if ((cleanAdminForCloud as any).cashSession) delete (cleanAdminForCloud as any).cashSession;

    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'settings', effectiveTenantId), { 
          admin: cleanAdminForCloud,
          updatedAt: new Date() 
        }, { merge: true });
      } catch (e) {
        console.error("Error updating logistics settings:", e);
      }
    }
    
    // Persistir no Dexie com a estrutura correta (AppSettings)
    await localDb.settings.put({ 
      id: effectiveTenantId || 'global',
      admin: newSettings,
      digitalMenu: digitalMenuSettings,
      cashSession: cashSession
    });
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    // Prevent backwards transitions and modification of terminal statuses
    const terminalStatuses: OrderStatus[] = ['delivered', 'finished', 'cancelled'];
    const currentStatus = order.status;

    if (terminalStatuses.includes(currentStatus) && status !== 'cancelled') {
        console.warn(`Attempted to modify a terminal order ${id} (${currentStatus}). State preserved.`);
        return;
    }

    if (status !== 'cancelled') {
        const currentPriority = STATUS_PRIORITY[currentStatus] || 0;
        const newPriority = STATUS_PRIORITY[status] || 0;
        
        // Regra do Usuário: 
        // 1. Permitir retroceder de 'delivering' (4) para 'ready' (3)
        // 2. Bloquear retroceder de 'ready' (3) para 'preparing' (2) ou menos
        // 3. Bloquear outros retrocessos
        const isAllowedRetrocession = (currentStatus === 'delivering' && status === 'ready');

        if (newPriority < currentPriority && !isAllowedRetrocession) {
          console.warn(`Attempted invalid status transition for order ${id}: ${currentStatus} -> ${status}`);
          return;
        }

        // Se já chegou em 'ready', nunca volta para 'preparing'
        if (currentPriority >= 3 && newPriority < 3) {
          console.warn(`Attempted to return a ready order to kitchen (${id}). Blocked.`);
          return;
        }
    }

    const now = new Date();
    const updates: Partial<Order> = { 
      status, 
      updatedAt: now 
    };

    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;

    // Add specific timestamps for lifecycle tracking
    if (status === 'preparing') updates.acceptedAt = now;
    if (status === 'ready') updates.readyAt = now;
    if (status === 'delivering') updates.dispatchedAt = now;
    if (status === 'delivered') updates.deliveredAt = now;
    if (status === 'finished') {
      updates.finishedAt = now;
      
      // Ciclo Final para pedidos de Marketplace/Delivery (Igual às Mesas)
      // Se estiver finalizando, registra no financeiro se não foi registrado antes
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      if (effectiveTenantId && !order.isSettled) {
        try {
          // Registrar Receita
          let recordCategory = 'Vendas Mesa';
          let recordDesc = `Pedido #${order.id.slice(-4)} (${order.type.toUpperCase()}) - Finalizado`;
          
          if (order.source === 'marketplace' || order.source === 'iFood') {
            recordCategory = 'Vendas Marketplace';
            recordDesc = `Pedido #${order.id.slice(-4)} (Marketplace) - Finalizado`;
          } else if (order.source === 'whatsapp' || order.source === 'partner_app' || (order.source as string) === 'digital_menu' || order.tableNumber !== undefined) {
            recordCategory = 'Vendas Cardápio Digital';
            recordDesc = `Pedido #${order.id.slice(-4)} (Cardápio Digital) - Finalizado`;
          } else {
            recordCategory = order.type === 'delivery' ? 'Vendas Entrega' : (order.type === 'takeout' ? 'Vendas Balcão' : 'Vendas Mesa');
            recordDesc = `Pedido #${order.id.slice(-4)} (${order.type === 'delivery' ? 'DELIVERY' : (order.type === 'takeout' ? 'BALCÃO' : 'MESA')}) - Finalizado`;
          }

          await handleAddFinancialRecord({
            type: 'income',
            amount: order.total,
            category: recordCategory,
            description: `${recordDesc} - Pagamento: ${order.paymentMethod || 'dinheiro'}`,
            date: new Date(),
            paymentMethod: order.paymentMethod || 'dinheiro',
            orderId: order.id
          });

          // Se for do Marketplace, acumular taxa de R$ 1,50
          if (order.source === 'marketplace') {
            const currentSettings = adminSettings;
            const appFee = currentSettings.saasIntegration?.appFeePerOrder || 1.50;
            const newBillingAccumulated = (currentSettings.saasIntegration?.billingAccumulated || 0) + appFee;
            
            const updatedSaas = {
              ...currentSettings.saasIntegration,
              billingAccumulated: newBillingAccumulated
            };
            
            await handleUpdateLogisticsSettings({ saasIntegration: updatedSaas });
            addLog('u1', 'SISTEMA', `Taxa de marketplace registrada: R$ ${appFee.toFixed(2)}`);
          }

          updates.isSettled = true;
        } catch (e) {
          console.error("Erro ao processar ciclo final do pedido:", e);
        }
      }
    }

    await localDb.orders.update(id, updates);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    
    // Se o pedido foi entregue, processar ganhos e liberar o motoboy
    if (status === 'delivered' && order?.courierId) {
      const courier = couriers.find(c => c.id === order.courierId);
      if (courier) {
        const today = new Date();
        const lastDaily = courier.lastDailyFeeDate ? new Date(courier.lastDailyFeeDate) : null;
        const isNewDay = !lastDaily || 
                        lastDaily.getDate() !== today.getDate() || 
                        lastDaily.getMonth() !== today.getMonth() || 
                        lastDaily.getFullYear() !== today.getFullYear();

        const courierUpdates: Partial<Courier> = {};
        
        // Se for a primeira entrega do dia, adiciona diária aos ganhos
        if (isNewDay && courier.dailyFee && courier.dailyFee > 0) {
          courierUpdates.lastDailyFeeDate = today;
          courierUpdates.earnings = (courier.earnings || 0) + courier.dailyFee;
          addLog('u1', 'ENTREGAS', `Diária de R$ ${courier.dailyFee.toFixed(2)} creditada para ${courier.name} na 1ª entrega.`);
        }

        // Adiciona taxa de entrega aos ganhos (courierEarnings ou deliveryFee)
        const deliveryEarning = order.courierEarnings || order.deliveryFee || 0;
        courierUpdates.earnings = (courierUpdates.earnings || courier.earnings || 0) + deliveryEarning;
        
        // Se pagou em dinheiro, acumula no cashHeld do motoboy
        if (order.paymentMethod === 'dinheiro') {
          courierUpdates.cashHeld = (courier.cashHeld || 0) + order.total;
        }

        // Só libera se não tiver mais NENHUM pedido em rota
        const otherActiveOrders = orders.filter(o => o.id !== id && o.courierId === courier.id && o.status === 'delivering');
        if (otherActiveOrders.length === 0) {
          courierUpdates.status = 'available';
        }

        await localDb.couriers.update(courier.id, courierUpdates);
        setCouriers(prev => prev.map(c => c.id === courier.id ? { ...c, ...courierUpdates } : c));

        if (effectiveTenantId) {
           await setDoc(doc(db, 'couriers', courier.id), courierUpdates, { merge: true });
        }
      }
    }
    
    addLog('u1', 'PEDIDO', `Pedido ${id} alterado para ${status}`);

    // Sync status to cloud if we are in a tenant context
    if (effectiveTenantId) {
      try {
        const targetDocId = order.docId || order.id || id;
        await setDoc(doc(db, 'orders', targetDocId), cleanObject({
          ...updates,
          // Se for concluído, registrar horário legível para relatórios simples
          ...(status === 'delivered' || status === 'finished' ? { completedAt: now } : {})
        }), { merge: true });
      } catch (e) {
        console.error(`Error syncing status check for cloud order ${id}:`, e);
      }
    }
  };

  const handleAddCourier = async (courier: Partial<Courier>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const newCourier: Courier = {
      id: courier.id || `c${Date.now()}`,
      tenantId: effectiveTenantId || 't1',
      name: courier.name || '',
      phone: courier.phone || '',
      email: courier.email,
      document: courier.document,
      cnh: courier.cnh,
      vehiclePlate: courier.vehiclePlate,
      vehicleType: courier.vehicleType as any || 'moto',
      address: courier.address,
      pixKey: courier.pixKey,
      dailyFee: courier.dailyFee || 0,
      status: 'available',
      active: true,
      createdAt: new Date()
    };
    
    if (effectiveTenantId) {
       if (newCourier.email) {
         const trimmedEmail = newCourier.email.trim().toLowerCase();
         // Validação ativa de duplicidade de e-mail na plataforma
         const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail));
         const usersByEmailSnap = await getDocs(usersByEmailQuery);
         if (!usersByEmailSnap.empty) {
           showToast(`Erro: O e-mail de acesso "${trimmedEmail}" já está cadastrado em nossa plataforma!`, "error");
           return;
         }

         const couriersQuery = query(collection(db, 'couriers'), where('email', '==', trimmedEmail));
         const couriersSnap = await getDocs(couriersQuery);
         if (!couriersSnap.empty) {
           showToast(`Erro: O e-mail de acesso "${trimmedEmail}" já está cadastrado como entregador em nossa plataforma!`, "error");
           return;
         }
       }

       await setDoc(doc(db, 'couriers', newCourier.id), {
         ...newCourier,
         createdAt: new Date()
       });
       
       // If email provided, also ensure a User record exists for app access
       if (newCourier.email) {
         const userDoc = await getDoc(doc(db, 'users', newCourier.id));
         if (!userDoc.exists()) {
           await setDoc(doc(db, 'users', newCourier.id), {
             id: newCourier.id,
             tenantId: newCourier.tenantId,
             name: newCourier.name,
             email: newCourier.email,
             role: 'COURIER',
             active: true,
             status: 'offline',
             createdAt: new Date()
           });
         }
       }
    } else {
      await localDb.couriers.add(newCourier);
      const updatedCouriers = await localDb.couriers.toArray();
      setCouriers(updatedCouriers);
    }
    addLog('u1', 'ENTREGAS', `Novo entregador cadastrado: ${newCourier.name}`);
  };

  const handleEditOrderInPDV = (order: Order) => {
    // Melhoria para manter o usuário na aba original após edição (como solicitado para o KDS)
    if (activeTab !== 'tables') {
      setReturnToTab(activeTab);
      setActiveTab('tables');
    }
    setPdvEditOrder(order);
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    await localDb.orders.update(id, updates);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    
    if (effectiveTenantId) {
      try {
        const order = orders.find(o => o.id === id);
        const targetDocId = order?.docId || order?.id || id;
        await setDoc(doc(db, 'orders', targetDocId), cleanObject({ ...updates, updatedAt: new Date() }), { merge: true });
      } catch (e) {
        console.error(`Error syncing order update ${id}:`, e);
      }
    }
    
    // Se forma de pagamento ou total foi alterada, sincronizar com o lançamento financeiro correspondente
    if (updates.paymentMethod || updates.total !== undefined) {
      const order = orders.find(o => o.id === id);
      if (order) {
        const matchingRecord = financialRecords.find(r => 
          r.orderId === id ||
          (r.description && r.description.includes(`#${id.slice(-4)}`))
        );
        if (matchingRecord) {
          const newAmount = updates.total !== undefined ? updates.total : matchingRecord.amount;
          const newPaymentMethod = updates.paymentMethod || matchingRecord.paymentMethod;
          
          let newDescription = matchingRecord.description;
          if (updates.paymentMethod) {
            // Substitui "Pagamento: X" por "Pagamento: Y"
            if (newDescription.includes("Pagamento:")) {
              newDescription = newDescription.replace(/(Pagamento:\s*)([^\s,]+)/i, `$1${updates.paymentMethod}`);
            } else {
              newDescription = `${newDescription} - Pagamento: ${updates.paymentMethod}`;
            }
          }
          
          await handleUpdateFinancialRecord(matchingRecord.id, { 
            amount: newAmount,
            paymentMethod: newPaymentMethod,
            description: newDescription
          });
        }
      }
    }

    addLog('u1', 'PEDIDO', `Pedido ${id} atualizado: ${Object.keys(updates).join(', ')}`);
  };

  const handleAssignCourier = async (orderId: string, courierId: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const courier = couriers.find(c => c.id === courierId);
    
    // Check if the order is already assigned to a different courier
    const existingOrder = orders.find(o => o.id === orderId);
    const oldCourierId = existingOrder?.courierId;
    
    if (oldCourierId && oldCourierId !== courierId) {
      const otherActiveOrders = orders.filter(o => o.courierId === oldCourierId && o.status === 'delivering' && o.id !== orderId);
      if (otherActiveOrders.length === 0) {
        setCouriers(prev => prev.map(c => c.id === oldCourierId ? { ...c, status: 'available' } : c));
        if (effectiveTenantId) {
          try {
            await setDoc(doc(db, 'couriers', oldCourierId), { status: 'available', updatedAt: new Date() }, { merge: true });
          } catch (e) {
            console.error("Error reverting old courier status:", e);
          }
        }
      }
    }

    // Calculate route position: check how many orders are already assigned to this courier that are not delivered
    const currentAssignments = orders.filter(o => o.courierId === courierId && !['delivered', 'cancelled'].includes(o.status));
    const routePosition = currentAssignments.length + 1;
    
    // Get repasse from courier data or default to 0
    const courierEarnings = courier?.earningsPerDelivery || 0;

    const updates = { 
      courierId, 
      routePosition,
      courierEarnings,
      status: 'delivering' as Order['status'], // Mark as delivering immediately when assigned
      updatedAt: new Date() 
    };
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    
    if (effectiveTenantId) {
      try {
        const order = orders.find(o => o.id === orderId);
        const targetDocId = order?.docId || order?.id || orderId;
        await updateDoc(doc(db, 'orders', targetDocId), updates);
      } catch (e) {
        console.error(`Error syncing courier assignment ${orderId}:`, e);
      }
    }
    
    addLog('u1', 'ENTREGA', `Entregador atribuído ao pedido ${orderId} na posição ${routePosition}`);
  };

  const handleDispatchCourier = async (courierId: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    await localDb.couriers.update(courierId, { status: 'delivering' });
    setCouriers(prev => prev.map(c => c.id === courierId ? { ...c, status: 'delivering' } : c));
    
    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'couriers', courierId), { 
          status: 'delivering', 
          updatedAt: new Date() 
        }, { merge: true });
      } catch (e) {
        console.error(`Error syncing courier dispatch ${courierId}:`, e);
      }
    }
    
    addLog('u1', 'ENTREGA', `Entregador ${courierId} saiu para entrega (Em Rota)`);
  };

  const [isAddingTable, setIsAddingTable] = useState(false);

  const handleAddTable = async () => {
    if (isAddingTable) return;
    
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || (isSuperAdmin ? `saas-admin-${user?.uid}` : null);
    
    if (!effectiveTenantId) {
      showToast("Vínculo com restaurante necessário.", 'error');
      return;
    }

    setIsAddingTable(true);
    try {
      // Determine the next number and ID safely within the current tenant's scope
      // Ensure we only use numeric IDs/numbers for calculations
      const validTables = tables.filter(t => 
        t && 
        (typeof t.number === 'number' || !isNaN(Number(t.number))) && 
        (typeof t.id === 'number' || !isNaN(Number(t.id)))
      );
      
      const nextNumber = validTables.length > 0 ? Math.max(...validTables.map(t => Number(t.number))) + 1 : 1;
      const nextId = validTables.length > 0 ? Math.max(...validTables.map(t => Number(t.id))) + 1 : 1;
      
      // Final sanity check for NaN
      if (isNaN(nextNumber) || isNaN(nextId)) {
        throw new Error("Falha ao calcular próximo número/ID da mesa.");
      }

      // Aggressive check for duplicates in current state
      if (tables.some(t => Number(t.number) === nextNumber)) {
        console.warn(`Table number ${nextNumber} already exists in local state.`);
        // Try to find the actual next available number
        let safeNumber = nextNumber;
        while (tables.some(t => Number(t.number) === safeNumber)) {
          safeNumber++;
        }
        
        const newTable: Table = {
          id: nextId + (safeNumber - nextNumber),
          number: safeNumber,
          status: 'available',
          items: [],
          total: 0,
          tenantId: effectiveTenantId
        };
        
        await addDoc(collection(db, 'diningTables'), {
          ...newTable,
          updatedAt: new Date()
        });
        addLog('u1', 'MESAS', `Nova mesa adicionada: ${safeNumber}`);
        return;
      }

      const newTable: Table = {
        id: nextId,
        number: nextNumber,
        status: 'available',
        items: [],
        total: 0,
        tenantId: effectiveTenantId
      };

      await addDoc(collection(db, 'diningTables'), {
        ...newTable,
        updatedAt: new Date()
      });
      
      addLog('u1', 'MESAS', `Nova mesa adicionada: ${nextNumber}`);
    } catch (error) {
      console.error("Error adding table:", error);
      showToast("Erro ao adicionar mesa.", 'error');
    } finally {
      setIsAddingTable(false);
    }
  };

  const handleDeleteTable = async (id: number | string) => {
    // Robust search for the table in local state
    const numericId = typeof id === 'string' ? Number(id) : id;
    
    // First, try to find by docId/firestoreId (exact match)
    let table = tables.find(t => (t as any).docId === id || (t as any)._firestoreId === id);
    
    // If not found, fall back to numeric ID
    if (!table) {
      table = tables.find(t => t.id === id || (typeof t.id === 'number' && t.id === numericId));
    }
    
    if (!table) {
      console.warn(`Table not found for deletion. ID input: ${id}`);
      // Fallback: if id is clearly a docId string, try direct deletion
      if (typeof id === 'string' && isNaN(numericId)) {
        try {
          await deleteDoc(doc(db, 'diningTables', id));
          return;
        } catch (e) {
          console.error("Direct delete failed:", e);
        }
      }
      return;
    }

    if (table.status !== 'available') {
      showToast("Não é possível excluir uma mesa em uso.", 'error');
      return;
    }

    const effectiveTenantId = table.tenantId || viewingTenantId || currentUserData?.tenantId;
    
    if (effectiveTenantId) {
      try {
        const docId = (table as any).docId || (table as any)._firestoreId || (typeof id === 'string' && isNaN(numericId) ? id : null);
        
        if (docId) {
          await deleteDoc(doc(db, 'diningTables', docId));
        } else {
          // Fallback to query by numeric ID and tenantId
          const q = query(
            collection(db, 'diningTables'), 
            where('id', '==', numericId), 
            where('tenantId', '==', effectiveTenantId)
          );
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        addLog('u1', 'MESAS', `Mesa ${table.number} excluída`);
      } catch (error) {
        console.error("Error deleting table from cloud:", error);
        showToast("Erro ao excluir mesa. Verifique suas permissões.", 'error');
      }
    } else {
      await localDb.diningTables.delete(numericId);
      setTables(prev => prev.filter(t => t.id !== id && t.id !== numericId));
      addLog('u1', 'MESAS', `Mesa ${table.number} excluída (Local)`);
    }
  };

  const handleUpdateTable = async (id: number | string, items: OrderItem[], status: Table['status'], isCounter?: boolean) => {
    const total = items.reduce((a, b) => a + (b.price * b.quantity), 0);
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || (isSuperAdmin ? `saas-admin-${user?.uid}` : null);
    const numericId = typeof id === 'string' ? Number(id) : id;

    if (isCounter) {
      setCounterOrders(prev => prev.map(t => t.id === id || t.id === numericId ? { ...t, items, status, total } : t));
      // Sincronizar com Firestore se for balcão também!
      if (effectiveTenantId) {
        try {
          const docId = `counter-${id}`; 
          // Note: Balcão orders are temporary tables, but we should sync them if they are in Firestore
          // However, usually they were only local. Let's make it consistent.
          // In some versions, they might be in diningTables too.
        } catch (e) {}
      }
    } else {
      // Local update
      if (!isNaN(numericId)) {
        await localDb.diningTables.update(numericId, { items, status, total });
      }
      setTables(prev => prev.map(t => t.id === id || t.id === numericId || (t as any).docId === id ? { ...t, items, status, total } : t));

      // Cloud Sync
      if (effectiveTenantId) {
        try {
          const table = tables.find(t => t.id === id || t.id === numericId || (t as any).docId === id);
          const docId = (table as any).docId || (typeof id === 'string' && isNaN(numericId) ? id : null);

          if (docId) {
            await setDoc(doc(db, 'diningTables', docId), cleanObject({ items, status, total, updatedAt: new Date() }), { merge: true });
          } else {
            const q = query(
              collection(db, 'diningTables'), 
              where('id', '==', numericId), 
              where('tenantId', '==', effectiveTenantId)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const batch = writeBatch(db);
              snapshot.docs.forEach(d => batch.update(d.ref, cleanObject({ items, status, total, updatedAt: new Date() })));
              await batch.commit();
            }
          }
        } catch (error) {
          console.error("Error syncing table update to cloud:", error);
        }
      }
    }
  };

  const handleAddCounterOrder = async () => {
    const newCounter: Table = {
      id: Date.now(),
      number: counterOrders.length + 1,
      status: 'occupied',
      items: [],
      total: 0,
      tenantId: viewingTenantId || currentUserData?.tenantId || 't1'
    };
    setCounterOrders(prev => [...prev, newCounter]);
    addLog('u1', 'BALCÃO', 'Nova comanda de balcão aberta');
    return newCounter.id;
  };

  const handleCancelTable = async (tableId: number | string, isCounter?: boolean) => {
    try {
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || (isSuperAdmin ? `saas-admin-${user?.uid}` : null);
      const strId = String(tableId);
      const numericId = Number(strId.replace(/\D/g, ''));
      
      const table = isCounter 
        ? counterOrders.find(t => t.id === tableId) 
        : tables.find(t => t.id === tableId || t.id === numericId || (t as any).docId === tableId);

      // Remove pedidos de cozinha (KDS-) pendentes ou prontos para esta mesa/balcão
      const tableNumber = table?.number || tableId;
      const kitchenOrderIdsToRemove = orders
        .filter(o => 
          (o.status === 'preparing' || o.status === 'ready') && 
          o.id.startsWith('KDS-') && 
          (String(o.tableNumber) === String(tableNumber))
        )
        .map(o => o.id);
      
      if (kitchenOrderIdsToRemove.length > 0) {
        await localDb.orders.bulkDelete(kitchenOrderIdsToRemove);
        setOrders(prev => prev.filter(o => !kitchenOrderIdsToRemove.includes(o.id)));
        
        if (effectiveTenantId) {
           for (const kid of kitchenOrderIdsToRemove) {
             try {
               await deleteDoc(doc(db, 'orders', kid));
             } catch (e) {
               console.error(`Error deleting cloud KDS order ${kid}:`, e);
             }
           }
        }
      }

      if (isCounter) {
        setCounterOrders(prev => prev.filter(t => t.id !== tableId && t.id !== numericId));
      } else {
        // Redefinir localmente
        if (!isNaN(numericId)) {
          await localDb.diningTables.update(numericId, { items: [], status: 'available', total: 0, currentOrderId: undefined } as any);
        }
        setTables(prev => prev.map(t => t.id === tableId || t.id === numericId || (t as any).docId === tableId ? { ...t, items: [], status: 'available', total: 0, currentOrderId: undefined } : t));
        
        // Sincronização Cloud Robusta
        if (effectiveTenantId) {
          try {
            const docId = (table as any)?.docId || (typeof tableId === 'string' && isNaN(numericId) ? tableId : null);
            
            if (docId) {
              await updateDoc(doc(db, 'diningTables', docId), { 
                items: [], 
                status: 'available', 
                total: 0, 
                currentOrderId: null, 
                updatedAt: new Date() 
              });
            } else if (!isNaN(numericId)) {
              const q = query(collection(db, 'diningTables'), where('id', '==', numericId), where('tenantId', '==', effectiveTenantId));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                await updateDoc(snapshot.docs[0].ref, { items: [], status: 'available', total: 0, currentOrderId: null, updatedAt: new Date() });
              }
            }
          } catch (e) {
            console.error("Error resetting table in cloud during cancel:", e);
          }
        }
      }
      addLog('u1', 'CANCELAMENTO', `${isCounter ? 'Balcão' : `Mesa ${table?.number || tableId}`} cancelado`);
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      showToast('Erro ao cancelar venda. Tente novamente.', 'error');
    }
  };

  const handleTransferTable = async (fromTableId: number | string, toTableId: number | string, isCounter?: boolean) => {
    try {
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || (isSuperAdmin ? `saas-admin-${user?.uid}` : null);
      const fromNumericId = typeof fromTableId === 'string' ? Number(fromTableId) : fromTableId;
      const toNumericId = typeof toTableId === 'string' ? Number(toTableId) : toTableId;

      const source = isCounter ? counterOrders : tables;
      const fromTable = source.find(t => t.id === fromTableId || t.id === fromNumericId || (t as any).docId === fromTableId);
      const toTable = tables.find(t => t.id === toTableId || t.id === toNumericId || (t as any).docId === toTableId);

      if (!fromTable || !toTable) {
        showToast("Mesa de origem ou destino não encontrada.", 'error');
        return false;
      }
      if (toTable.status !== 'available') {
        showToast("A mesa de destino já está ocupada.", 'error');
        return false;
      }

      // Transfer items
      const items = fromTable.items;
      const total = fromTable.total;

      // Update destination table
      if (!isNaN(toNumericId)) {
        await localDb.diningTables.update(toNumericId, { items, status: 'occupied', total });
      }
      setTables(prev => prev.map(t => t.id === toTableId || t.id === toNumericId || (t as any).docId === toTableId ? { ...t, items, status: 'occupied', total } : t));

      // Clear source table
      if (isCounter) {
        setCounterOrders(prev => prev.filter(t => t.id !== fromTableId && t.id !== fromNumericId));
      } else {
        if (!isNaN(fromNumericId)) {
          await localDb.diningTables.update(fromNumericId, { items: [], status: 'available', total: 0 });
        }
        setTables(prev => prev.map(t => t.id === fromTableId || t.id === fromNumericId || (t as any).docId === fromTableId ? { ...t, items: [], status: 'available', total: 0 } : t));
      }

      // Update KDS orders if any
      const fromTableNumber = fromTable?.number || fromTableId;
      const toTableNumber = toTable?.number || toTableId;
      const kitchenOrdersToUpdate = orders.filter(o => 
        (o.status === 'preparing' || o.status === 'ready') && 
        o.id.startsWith('KDS-') && 
        (String(o.tableNumber) === String(fromTableNumber))
      );

      for (const order of kitchenOrdersToUpdate) {
        await localDb.orders.update(order.id, { tableNumber: toTableNumber });
      }
      
      if (kitchenOrdersToUpdate.length > 0) {
        setOrders(prev => prev.map(o => 
          kitchenOrdersToUpdate.some(ko => ko.id === o.id) ? { ...o, tableNumber: toTableNumber } : o
        ));
      }

      // Cloud Sync
      if (effectiveTenantId) {
        try {
          const batch = writeBatch(db);
          
          const fromDocId = (fromTable as any).docId || (typeof fromTableId === 'string' && isNaN(fromNumericId) ? fromTableId : null);
          const toDocId = (toTable as any).docId || (typeof toTableId === 'string' && isNaN(toNumericId) ? toTableId : null);

          // Update destination
          if (toDocId) {
            batch.update(doc(db, 'diningTables', toDocId), { items, status: 'occupied', total, updatedAt: new Date() });
          } else if (!isNaN(toNumericId)) {
            const qTo = query(collection(db, 'diningTables'), where('id', '==', toNumericId), where('tenantId', '==', effectiveTenantId));
            const snapTo = await getDocs(qTo);
            snapTo.docs.forEach(d => batch.update(d.ref, { items, status: 'occupied', total, updatedAt: new Date() }));
          }
          
          // Update source
          if (fromDocId) {
            batch.update(doc(db, 'diningTables', fromDocId), { items: [], status: 'available', total: 0, updatedAt: new Date() });
          } else if (!isNaN(fromNumericId)) {
            const qFrom = query(collection(db, 'diningTables'), where('id', '==', fromNumericId), where('tenantId', '==', effectiveTenantId));
            const snapFrom = await getDocs(qFrom);
            snapFrom.docs.forEach(d => batch.update(d.ref, { items: [], status: 'available', total: 0, updatedAt: new Date() }));
          }
          
          // Update KDS orders in cloud
          for (const ko of kitchenOrdersToUpdate) {
            const targetDocId = ko.docId || ko.id;
            batch.update(doc(db, 'orders', targetDocId), { tableNumber: toTableNumber, updatedAt: new Date() });
          }

          await batch.commit();
        } catch (error) {
          console.error("Error syncing table transfer to cloud:", error);
        }
      }

      addLog('u1', 'TRANSFERÊNCIA', `Pedido transferido da ${isCounter ? 'Comanda' : `Mesa ${fromTableId}`} para a Mesa ${toTableId}`);
      return true;
    } catch (error) {
      console.error('Erro ao transferir mesa:', error);
      showToast('Erro ao transferir mesa. Tente novamente.', 'error');
      return false;
    }
  };

  const assignDailyNumberToOrder = (order: Order, currentOrdersList?: Order[]): Order => {
    if (order.dailyNumber) return order;

    const ordersList = currentOrdersList || orders || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = ordersList.filter(o => {
      if (!o.createdAt) return false;
      let d: Date;
      if (o.createdAt instanceof Date) {
        d = o.createdAt;
      } else if (typeof o.createdAt === 'object' && (o.createdAt as any).seconds !== undefined) {
        d = new Date((o.createdAt as any).seconds * 1000);
      } else if (typeof (o.createdAt as any)?.toDate === 'function') {
        d = (o.createdAt as any).toDate();
      } else {
        d = new Date(o.createdAt as any);
      }
      if (isNaN(d.getTime())) return false;
      return d >= today;
    });

    const maxNum = todayOrders.reduce((max, o) => {
      const num = o.dailyNumber || 0;
      return num > max ? num : max;
    }, 0);

    return {
      ...order,
      dailyNumber: maxNum + 1
    };
  };

  const handleCloseTable = async (
    tableId: number, 
    method: PaymentMethod, 
    fiscal: boolean, 
    customerId?: string, 
    isCounter?: boolean, 
    deliveryInfo?: { address: string, fee: number, name?: string, phone?: string }, 
    customerDocument?: string,
    payments?: { method: PaymentMethod, amount: number, customerId?: string, isFiscalIssued?: boolean, fiscalKey?: string, customerDocument?: string }[],
    changeFor?: number,
    additionalFee?: number,
    additionalFeeReason?: string,
    discount?: number
  ) => {
    // 1. Identificar a mesa e seu docId para sincronização precisa
    const source = isCounter ? counterOrders : tables;
    const table = source.find(t => t.id === tableId);
    if (!table || table.items.length === 0) {
      showToast("Não é possível fechar um pedido sem itens.", 'error');
      return;
    }

    const docId = (table as any).docId || (typeof tableId === 'string' ? tableId : null);
    const finalTotal = table.total + (deliveryInfo?.fee || 0) + (additionalFee || 0) - (discount || 0);
    const existingOrderId = table.currentOrderId;

    // 1. Validar Estoque (Melhoria de Especialista em Testes)
    // Verificamos antes de gerar o pedido para evitar inconsistências
    for (const item of table.items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.trackStock) {
        const currentStock = product.stock || 0;
        if (currentStock < item.quantity) {
          showToast(`Estoque insuficiente: ${product.name}`, 'error');
          return;
        }
      }
    }

    const tableNumber = table?.number || tableId;

    const isRealDelivery = !!(deliveryInfo && (deliveryInfo.address || (deliveryInfo.fee && deliveryInfo.fee > 0)));

    const rawOrder: Order = {
      id: existingOrderId || Math.random().toString(36).substr(2, 6).toUpperCase(),
      tableNumber: isCounter ? undefined : tableNumber,
      items: table.items,
      total: finalTotal,
      type: isRealDelivery ? 'delivery' : (isCounter ? 'takeout' : 'table'),
      status: isRealDelivery 
        ? 'preparing' 
        : (isCounter && !table.items.every(i => i.sentToKitchen)) 
          ? 'preparing' 
          : 'delivered', // Table/Counter orders that are being closed/paid are considered delivered/finished
      deliveryMethod: isRealDelivery ? 'entrega' : undefined,
      createdAt: table.currentOrderId ? (orders.find(o => o.id === table.currentOrderId)?.createdAt || new Date()) : new Date(),
      paymentMethod: method,
      payments: payments?.map(p => ({ ...p, timestamp: new Date() })),
      isFiscalIssued: fiscal,
      fiscalKey: undefined,
      customerId: customerId,
      customerDocument: customerDocument,
      customerName: deliveryInfo?.name || table.items[0]?.observation?.split(' ')[0], 
      customerPhone: deliveryInfo?.phone,
      customerAddress: deliveryInfo?.address,
      deliveryFee: deliveryInfo?.fee,
      changeFor: changeFor,
      additionalFee: additionalFee || 0,
      additionalFeeReason: additionalFeeReason || '',
      discount: discount || 0,
      tenantId: viewingTenantId || currentUserData?.tenantId || 't1',
      source: table.currentOrderId ? (orders.find(o => o.id === table.currentOrderId)?.source || 'local') : 'local',
      isSettled: true,
      finishedAt: new Date(),
      updatedAt: new Date()
    };
    const newOrder = assignDailyNumberToOrder(rawOrder);

    // NFC-e Emission Logic
    if (fiscal) {
      try {
        const response = await fetch('/api/fiscal/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: newOrder,
            settings: adminSettings.fiscal,
            customerDocument: customerDocument
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            newOrder.fiscalKey = result.nfeKey;
            newOrder.isFiscalIssued = true;
            addLog('u1', 'FISCAL', `NFC-e emitida com sucesso: ${result.nfeKey}`);
          } else {
            console.error('Erro SEFAZ:', result.error);
            addLog('u1', 'FISCAL', `Erro ao emitir NFC-e: ${result.error}`);
            showToast(`Erro SEFAZ: ${result.error}`, 'error');
          }
        } else {
          const errorData = await response.json();
          console.error('Erro API Fiscal:', errorData.error);
          showToast(`Erro na emissão fiscal: ${errorData.error}`, 'error');
        }
      } catch (error) {
        console.error('Erro de conexão fiscal:', error);
        showToast('Erro de conexão com o serviço fiscal.', 'error');
      }
    }

    // Marcar todos os pedidos relacionados a esta mesa/balcão como finalizados
    const relatedOrdersToFinish = orders.filter(o => 
      o.id !== newOrder.id &&
      (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready' || o.status === 'delivered') && 
      (
        (existingOrderId && o.id === existingOrderId) ||
        (tableNumber !== undefined && tableNumber !== null && String(o.tableNumber) === String(tableNumber) && !isCounter)
      )
    );
    
    if (relatedOrdersToFinish.length > 0) {
      const now = new Date();
      const orderIds = relatedOrdersToFinish.map(o => o.id);
      
      // Update local
      setOrders(prev => prev.map(o => orderIds.includes(o.id) ? { ...o, status: 'finished', finishedAt: now, updatedAt: now } : o));
      
      // Sync cloud
      if (viewingTenantId || currentUserData?.tenantId) {
        const batch = writeBatch(db);
        relatedOrdersToFinish.forEach(ro => {
          const targetDocId = ro.docId || ro.id;
          batch.update(doc(db, 'orders', targetDocId), { 
            status: 'finished', 
            finishedAt: now, 
            updatedAt: now,
            completedAt: now 
          });
        });
        await batch.commit();
      }
    }

    // Redução de Estoque
    for (const item of table.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        // Reduz estoque do produto (se controlado)
        if (product.trackStock) {
          const newStock = Math.max(0, (product.stock || 0) - item.quantity);
          await handleUpdateProduct({ ...product, stock: newStock });
        }

        // Reduz estoque de insumos (Ficha Técnica)
        if (product.technicalSheet && product.technicalSheet.length > 0) {
          for (const tsItem of product.technicalSheet) {
            const rawMaterial = rawMaterials.find(rm => rm.id === tsItem.rawMaterialId);
            if (rawMaterial) {
              const reduction = tsItem.quantity * item.quantity;
              await handleUpdateRawMaterial({
                ...rawMaterial,
                currentStock: Math.max(0, rawMaterial.currentStock - reduction)
              });
            }
          }
        }
      }
    }

    // CRM: Salvar ou atualizar cliente se for delivery manual com nome/telefone
    if (deliveryInfo?.name && deliveryInfo?.phone) {
      const normalizePhone = (p?: string) => p ? p.replace(/\D/g, '') : '';
      const targetPhoneNorm = normalizePhone(deliveryInfo.phone);
      const existingCustomer = customers.find(c => normalizePhone(c.phone) === targetPhoneNorm);
      if (existingCustomer) {
        const updatedAddresses = [...(existingCustomer.addresses || [])];
        if (deliveryInfo.address && !updatedAddresses.includes(deliveryInfo.address)) {
          updatedAddresses.push(deliveryInfo.address);
        }
        await handleUpdateCustomer(existingCustomer.id, {
          name: deliveryInfo.name,
          address: deliveryInfo.address || existingCustomer.address,
          addresses: updatedAddresses
        });
      } else {
        await handleAddCustomer({
          name: deliveryInfo.name,
          phone: deliveryInfo.phone,
          address: deliveryInfo.address,
          balance: 0
        });
      }
    }

    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await setDoc(doc(db, 'orders', newOrder.id), cleanObject({
        ...newOrder
      }));
      // OPTIMISTIC LOCAL STATE UPDATE - CRITICAL FOR REALTIME RESPONSIVENESS AND IMMEDIATE TOTALS
      setOrders(prev => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
        return [newOrder, ...prev];
      });
      
      if (!isCounter) {
        // RESET ROBUSTO DA MESA
        const resetData = { 
          items: [], 
          status: 'available' as const, 
          total: 0, 
          currentOrderId: null, 
          updatedAt: new Date() 
        };

        if (docId) {
          await updateDoc(doc(db, 'diningTables', docId), resetData);
        } else {
          const q = query(collection(db, 'diningTables'), where('id', '==', tableId), where('tenantId', '==', effectiveTenantId));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            await updateDoc(snapshot.docs[0].ref, resetData);
          }
        }
        
        // Atualizar local para garantir feedback instantâneo
        setTables(prev => prev.map(t => t.id === tableId || (t as any).docId === docId ? { ...t, ...resetData } : t));
      }
    } else {
      await localDb.orders.put(newOrder);
      setOrders(prev => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
        return [newOrder, ...prev];
      });
      
      if (!isCounter) {
        const resetData = { items: [], status: 'available' as const, total: 0, currentOrderId: undefined };
        await localDb.diningTables.update(tableId, resetData);
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...resetData } : t));
      }
    }

    // Always update local counter state
    if (isCounter) {
      setCounterOrders(prev => prev.filter(t => t.id !== tableId));
    }


    addLog('u1', 'PEDIDO', `Pedido ${newOrder.id} finalizado e mesa liberada.`);

    if (pdvEditOrder) {
      setPdvEditOrder(null);
    }

    // Se for do Marketplace, acumular taxa de R$ 1,50
    if (newOrder.source === 'marketplace') {
      const appFee = adminSettings.saasIntegration?.appFeePerOrder || 1.50;
      const newBillingAccumulated = (adminSettings.saasIntegration?.billingAccumulated || 0) + appFee;
      const updatedSaas = {
        ...adminSettings.saasIntegration,
        billingAccumulated: newBillingAccumulated
      };
      await handleUpdateLogisticsSettings({ saasIntegration: updatedSaas });
    }

    // IMPRESSÃO FINAL (Normal ou Fiscal)
    if (adminSettings.printing?.autoPrintOrder || fiscal) {
      handlePrintOrder(newOrder, adminSettings, { isFiscal: fiscal });
    }

    addLog('u1', 'VENDA', `${isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} encerrada. Total: R$ ${finalTotal.toFixed(2)}`);

    if (payments && payments.length > 0) {
      const customerUpdates: Record<string, { totalDebit: number, transactions: CustomerTransaction[] }> = {};
      
      for (const p of payments) {
        const currentCustomerId = p.customerId || customerId;
        if (p.method === 'conta_cliente' && currentCustomerId) {
          if (!customerUpdates[currentCustomerId]) {
            customerUpdates[currentCustomerId] = { totalDebit: 0, transactions: [] };
          }
          customerUpdates[currentCustomerId].totalDebit += p.amount;
          customerUpdates[currentCustomerId].transactions.push({
            id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'debit',
            amount: p.amount,
            description: `Consumo Parcial ${isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} (Pedido #${newOrder.id})`,
            date: new Date(),
            items: newOrder.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price }))
          });
        } else {
          await handleAddFinancialRecord({
            type: 'income',
            amount: p.amount,
            category: isRealDelivery ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
            description: `${isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} - Pagamento: ${p.method}`,
            date: new Date(),
            paymentMethod: p.method,
            orderId: newOrder.id
          });
        }
      }

      for (const [cId, update] of Object.entries(customerUpdates)) {
        const customer = customers.find(c => c.id === cId);
        if (customer) {
          await handleUpdateCustomer(cId, {
            balance: customer.balance + update.totalDebit,
            history: [...update.transactions, ...customer.history]
          });
        }
      }
    } else {
      // Pagamento único (legado/simples)
      if (method === 'conta_cliente' && customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          const transaction: CustomerTransaction = {
            id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'debit',
            amount: finalTotal,
            description: `Consumo ${isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} (Pedido #${newOrder.id})`,
            date: new Date(),
            items: newOrder.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price }))
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
          category: isRealDelivery ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
          description: `${isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} - Pagamento: ${method}`,
          date: new Date(),
          paymentMethod: method,
          orderId: newOrder.id
        });
      }
    }

    addLog('u1', 'VENDA', `${isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableId}`)} encerrada. Total: R$ ${finalTotal.toFixed(2)}`);
  };

  const handleSettleOrders = async (orderIds: string[], settledDailyFee: number = 0) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (!orderIds.length) return;

    showToast(`Processando acerto de ${orderIds.length} pedidos...`, 'info');

    // Find the courier from the first order to update their totals
    const firstOrder = orders.find(o => o.id === orderIds[0]);
    const courierId = firstOrder?.courierId;
    
    let totalEarningsToDeduct = settledDailyFee;
    let totalCashToDeduct = 0;

    for (const id of orderIds) {
      const order = orders.find(o => o.id === id);
      if (order && !order.isSettled) {
        totalEarningsToDeduct += (order.courierEarnings || 0);
        if (order.paymentMethod === 'dinheiro') {
          totalCashToDeduct += (order.total || 0);
        }
      }

      if (effectiveTenantId) {
        try {
          const targetDocId = order?.docId || order?.id || id;
          await setDoc(doc(db, 'orders', targetDocId), { 
            isSettled: true, 
            status: 'finished',
            updatedAt: new Date() 
          }, { merge: true });
        } catch (e) {
          console.error(`Error settling cloud order ${id}:`, e);
        }
      }
      await localDb.orders.update(id, { isSettled: true, status: 'finished' });
    }

    // Update courier balances
    if (courierId && effectiveTenantId) {
      try {
        const courier = couriers.find(c => c.id === courierId);
        if (courier) {
          const newEarnings = Math.max(0, (courier.earnings || 0) - totalEarningsToDeduct);
          const newCash = Math.max(0, (courier.cashHeld || 0) - totalCashToDeduct);
          
          await updateDoc(doc(db, 'couriers', courierId), {
            earnings: newEarnings,
            cashHeld: newCash,
            updatedAt: new Date()
          });
          
          // Also create a financial record for the collective settlement if relevant
          await handleAddFinancialRecord({
            type: 'expense',
            amount: totalEarningsToDeduct,
            category: 'Entregadores',
            description: `Acerto de ${orderIds.length} entregas - ${courier.name}`,
            date: new Date(),
            status: 'paid'
          });
        }
      } catch (e) {
        console.error("Error updating courier balance after settlement:", e);
      }
    }

    showToast("Acerto realizado com sucesso!");
    addLog('u1', 'ENTREGA', `Acerto realizado para ${orderIds.length} pedidos. R$ ${totalEarningsToDeduct.toFixed(2)} pagos.`);
  };

  async function addLog(
    userId: string, 
    action: string, 
    description: string, 
    level: 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM' = 'INFO',
    details?: string,
    stackTrace?: string
  ) {
    // Resilient fallback logic for tenant resolution
    const userObj = users.find(u => u.id === userId) || currentUserData || { 
      id: userId || 'system', 
      name: 'Sistema / Admin', 
      role: 'SAAS_ADMIN', 
      tenantId: viewingTenantId || currentUserData?.tenantId || 't1' 
    };
    
    const resolvedTenantId = viewingTenantId || currentUserData?.tenantId || (userObj as any).tenantId || 't1';

    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      tenantId: resolvedTenantId,
      userId: (userObj as any).id || userId || 'system',
      userName: (userObj as any).name || 'Sistema / Admin',
      userRole: (userObj as any).role || 'SAAS_ADMIN',
      action,
      description,
      timestamp: new Date(),
      level,
      details,
      stackTrace
    };

    try {
      // Prioritize IndexedDB save
      await localDb.auditLogs.add(newLog);
      
      // If we are operating under an active cloud tenant, sync to firebase
      if (resolvedTenantId && resolvedTenantId !== 'GLOBAL' && resolvedTenantId !== 't1') {
        await setDoc(doc(db, 'auditLogs', newLog.id), {
          ...newLog,
          updatedAt: new Date()
        });
      }
    } catch (err) {
      console.warn("Unable to fully persist or sync audit log:", err);
    }

    setAuditLogs(prev => {
      if (prev.some(log => log.id === newLog.id)) {
        return prev;
      }
      return [newLog, ...prev];
    });
  }

  const handleAddUser = async (user: Partial<User>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    if (user.role === 'SAAS_ADMIN' || user.role === 'CUSTOMER') {
      showToast("Erro: Não é permitido cadastrar este cargo no painel do lojista.", "error");
      throw new Error("Não é permitido cadastrar usuários com perfil SaaS Admin ou Cliente dentro do painel do lojista.");
    }

    const trimmedEmail = (user.email || '').trim().toLowerCase();
    const trimmedPassword = (user.password || '').trim();
    const newUser: User = {
      id: user.id || `u${Date.now()}`,
      tenantId: effectiveTenantId || 't1',
      name: (user.name || '').trim(),
      email: trimmedEmail,
      password: trimmedPassword, // Salva a senha informada pelo lojista
      role: user.role || 'WAITER',
      permissions: user.permissions || [],
      status: 'offline',
      active: true,
      lastAccess: new Date(),
      createdAt: new Date(),
      observations: user.observations,
      presets: []
    };

    if (effectiveTenantId) {
      try {
        // Validação ativa de duplicidade de e-mail na plataforma
        const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail));
        const usersByEmailSnap = await getDocs(usersByEmailQuery);
        if (!usersByEmailSnap.empty) {
          showToast(`Erro: O e-mail "${trimmedEmail}" já está cadastrado em nossa plataforma!`, "error");
          throw new Error(`O e-mail "${trimmedEmail}" já está cadastrado em nossa plataforma.`);
        }

        const couriersQuery = query(collection(db, 'couriers'), where('email', '==', trimmedEmail));
        const couriersSnap = await getDocs(couriersQuery);
        if (!couriersSnap.empty) {
          showToast(`Erro: O e-mail "${trimmedEmail}" já está cadastrado como entregador em nossa plataforma!`, "error");
          throw new Error(`O e-mail "${trimmedEmail}" já está cadastrado como entregador.`);
        }

        await setDoc(doc(db, 'users', newUser.id), {
          ...newUser,
          updatedAt: new Date()
        });

        // Se for entregador, criar registro na coleção de couriers também
        if (newUser.role === 'COURIER') {
          const newCourier: Courier & { password?: string } = {
            id: newUser.id,
            tenantId: newUser.tenantId,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            phone: '', // Pode ser preenchido depois
            status: 'available',
            active: true,
            createdAt: new Date()
          };
          await setDoc(doc(db, 'couriers', newUser.id), newCourier);
        }
        showToast(`Usuário cadastrado: ${newUser.name}`);
      } catch (err) {
        console.error("Error syncing user:", err);
        showToast("Erro ao salvar usuário na nuvem.", "error");
      }
    } else {
      await localDb.users.add(newUser);
      setUsers(prev => [...prev, newUser]);
    }
    
    addLog('u1', 'USUARIOS', `Novo usuário cadastrado: ${newUser.name}`);
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    if (updates.role === 'SAAS_ADMIN' || updates.role === 'CUSTOMER') {
      showToast("Erro: Não é permitido atualizar o cargo para SaaS Admin ou Cliente no painel do lojista.", "error");
      throw new Error("Não é permitido definir o cargo de usuários como SaaS Admin ou Cliente dentro do painel do lojista.");
    }

    // Se a senha estiver vazia, remove das atualizações para não sobreescrever
    const finalUpdates = { ...updates };
    if (finalUpdates.email) {
      finalUpdates.email = finalUpdates.email.trim().toLowerCase();
    }
    if (finalUpdates.password !== undefined) {
      finalUpdates.password = finalUpdates.password.trim();
    }
    if (finalUpdates.password === '') {
      delete finalUpdates.password;
    }

    if (effectiveTenantId) {
      // Dobra check se alterou e-mail para um duplicado de outra pessoa
      if (finalUpdates.email) {
        const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', finalUpdates.email));
        const usersByEmailSnap = await getDocs(usersByEmailQuery);
        const duplicate = usersByEmailSnap.docs.some(doc => doc.id !== id);
        if (duplicate) {
          showToast(`Erro: O e-mail "${finalUpdates.email}" já está cadastrado em nossa plataforma!`, "error");
          throw new Error(`O e-mail "${finalUpdates.email}" já está cadastrado.`);
        }

        const couriersQuery = query(collection(db, 'couriers'), where('email', '==', finalUpdates.email));
        const couriersSnap = await getDocs(couriersQuery);
        const courierDuplicate = couriersSnap.docs.some(doc => doc.id !== id);
        if (courierDuplicate) {
          showToast(`Erro: O e-mail "${finalUpdates.email}" já está cadastrado como entregador!`, "error");
          throw new Error(`O e-mail "${finalUpdates.email}" já está cadastrado como entregador.`);
        }
      }

      await updateDoc(doc(db, 'users', id), cleanObject({
        ...finalUpdates,
        updatedAt: new Date()
      }));

      // Sincronizar com couriers se o usuário atual for entregador ou o novo cargo for entregador
      const existingUser = users.find(u => u.id === id);
      const isCourier = updates.role === 'COURIER' || existingUser?.role === 'COURIER';
      if (isCourier && existingUser) {
        const courierUpdate: any = { 
          name: finalUpdates.name !== undefined ? finalUpdates.name : existingUser.name,
          email: finalUpdates.email !== undefined ? finalUpdates.email : (existingUser.email || ''),
          updatedAt: new Date()
        };
        if (finalUpdates.password !== undefined) courierUpdate.password = finalUpdates.password;
        if (finalUpdates.active !== undefined) courierUpdate.active = finalUpdates.active;
        await setDoc(doc(db, 'couriers', id), courierUpdate, { merge: true });
      }

      // Se for o próprio usuário logado, tentar atualizar também no Firebase Auth diretamente
      if (id === auth.currentUser?.uid && auth.currentUser) {
        try {
          if (finalUpdates.email && finalUpdates.email !== auth.currentUser.email) {
            await updateEmail(auth.currentUser, finalUpdates.email);
          }
          if (finalUpdates.password) {
            await updatePassword(auth.currentUser, finalUpdates.password);
          }
        } catch (authErr: any) {
          console.error("Could not sync current user auth credentials directly:", authErr);
          if (authErr.code === 'auth/requires-recent-login' || authErr.message?.includes('requires-recent-login')) {
            showToast("Por segurança, você precisa fazer logout e login novamente para alterar sua própria senha ou e-mail.", "error");
          } else {
            showToast(`Erro ao atualizar no Firebase Auth: ${authErr.message || authErr}`, "error");
          }
          throw authErr;
        }
      }
    } else {
      await localDb.users.update(id, updates);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    }
    addLog('u1', 'USUARIOS', `Usuário atualizado: ${id}`);
  };

  const handleDeleteUser = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    if (effectiveTenantId) {
      // Inativar no firestore
      await updateDoc(doc(db, 'users', id), { active: false, status: 'offline', updatedAt: new Date() });
    } else {
      // Inativar em vez de remover
      await localDb.users.update(id, { active: false, status: 'offline' });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, active: false, status: 'offline' } : u));
    }
    addLog('u1', 'USUARIOS', `Usuário inativado: ${id}`);
  };

  const handleSaveUserPreset = async (userId: string, preset: UserPreset) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const updatedPresets = user.presets ? [...user.presets] : [];
    const existingIndex = updatedPresets.findIndex(p => p.id === preset.id);
    
    if (existingIndex > -1) {
      updatedPresets[existingIndex] = preset;
    } else {
      updatedPresets.push(preset);
    }
    
    await handleUpdateUser(userId, { presets: updatedPresets });
  };

  const handleAddProduct = async (product: Partial<Product>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const newProduct: Product = {
      id: product.id || `p${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tenantId: effectiveTenantId || 't1',
      name: product.name || '',
      category: product.category || 'Geral',
      price: product.price || 0,
      cost: product.cost || 0,
      stock: product.stock || 0,
      minStock: product.minStock || 0,
      unit: product.unit || 'un',
      barcode: product.barcode || '',
      image: product.image || '',
      options: product.options || [],
      technicalSheet: product.technicalSheet || [],
      active: true,
      isAvailableOnline: true,
      isAvailableDigitalMenu: true
    };

    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'products', newProduct.id), cleanObject({
          ...newProduct,
          createdAt: new Date()
        }));
        showToast(`Produto cadastrado: ${newProduct.name}`);
      } catch (err) {
        console.error("Erro ao sincronizar produto com a nuvem:", err);
        showToast("Erro ao salvar produto.", "error");
      }
    } else {
      await localDb.products.add(newProduct);
      setProducts(prev => [...prev, newProduct]);
    }

    addLog('u1', 'ESTOQUE', `Novo produto cadastrado: ${newProduct.name}`);
  };

  const handleUpdateProductCategories = async (newCategories: string[] | ((prev: string[]) => string[])) => {
    setProductCategories(prev => {
      const resolved = typeof newCategories === 'function' ? newCategories(prev) : newCategories;
      // Persist in localDb settings
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      localDb.settings.get(effectiveTenantId || 'global').then(s => {
        if (s) {
          localDb.settings.put({
            ...s,
            productCategories: resolved
          });
        } else {
          localDb.settings.put({
            id: effectiveTenantId || 'global',
            productCategories: resolved,
            admin: adminSettings,
            digitalMenu: digitalMenuSettings,
            cashSession: cashSession
          });
        }
      }).catch(err => console.error("Error saving product categories:", err));

      // Persist in Firestore settings if tenantId exists
      if (effectiveTenantId) {
        setDoc(doc(db, 'settings', effectiveTenantId), {
          productCategories: resolved,
          updatedAt: new Date()
        }, { merge: true }).catch(err => console.error("Error syncing product categories to cloud:", err));
      }

      return resolved;
    });
  };

  const handleUpdateRawMaterialCategories = async (newCategories: string[] | ((prev: string[]) => string[])) => {
    setRawMaterialCategories(prev => {
      const resolved = typeof newCategories === 'function' ? newCategories(prev) : newCategories;
      // Persist in localDb settings
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      localDb.settings.get(effectiveTenantId || 'global').then(s => {
        if (s) {
          localDb.settings.put({
            ...s,
            rawMaterialCategories: resolved
          });
        } else {
          localDb.settings.put({
            id: effectiveTenantId || 'global',
            rawMaterialCategories: resolved,
            admin: adminSettings,
            digitalMenu: digitalMenuSettings,
            cashSession: cashSession
          });
        }
      }).catch(err => console.error("Error saving raw material categories:", err));

      // Persist in Firestore settings if tenantId exists
      if (effectiveTenantId) {
        setDoc(doc(db, 'settings', effectiveTenantId), {
          rawMaterialCategories: resolved,
          updatedAt: new Date()
        }, { merge: true }).catch(err => console.error("Error syncing raw material categories to cloud:", err));
      }

      return resolved;
    });
  };

  const handleUpdateProduct = async (product: Product) => {
    let finalProduct = { ...product };
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;

    // Prevent large document errors by compressing base64 images
    if (finalProduct.image && finalProduct.image.startsWith('data:image/') && finalProduct.image.length > 50000) {
      try {
        const compressed = await compressImage(finalProduct.image, 512, 512, 0.7);
        finalProduct.image = compressed;
      } catch (err) {
        console.error("Error compressing product image:", err);
      }
    }

    const { id, ...updates } = finalProduct;
    
    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'products', id), cleanObject({
          ...finalProduct,
          updatedAt: new Date()
        }), { merge: true });
      } catch (err) {
        console.error("Erro ao atualizar produto na nuvem:", err);
        if (err instanceof Error && err.message.includes("exceeds the maximum allowed size")) {
          try {
            const sizeReducedProduct = { ...finalProduct, image: '' };
            await setDoc(doc(db, 'products', id), {
               ...sizeReducedProduct,
               updatedAt: new Date()
            }, { merge: true });
          } catch (retryErr) {
            console.error("Retry without image failed:", retryErr);
          }
        }
      }
    } else {
      await localDb.products.update(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? finalProduct : p));
    }

    addLog('u1', 'ESTOQUE', `Produto atualizado: ${finalProduct.name}`);
  };

  const handleDeleteProduct = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const product = products.find(p => p.id === id);
    
    if (effectiveTenantId) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.error("Erro ao excluir produto da nuvem:", err);
      }
    } else {
      await localDb.products.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    }

    if (product) addLog('u1', 'ESTOQUE', `Produto excluído: ${product.name}`);
  };


  const handleUpdateRawMaterial = async (material: RawMaterial) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    if (effectiveTenantId) {
      await setDoc(doc(db, 'rawMaterials', material.id), {
        ...material,
        updatedAt: new Date()
      }, { merge: true });
    } else {
      await localDb.rawMaterials.put(material);
      setRawMaterials(prev => prev.map(m => m.id === material.id ? material : m));
    }
    addLog('u1', 'INSUMOS', `Insumo atualizado: ${material.name}`);
  };

  const handleDeleteRawMaterial = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const material = rawMaterials.find(m => m.id === id);
    if (effectiveTenantId) {
      await deleteDoc(doc(db, 'rawMaterials', id));
    } else {
      await localDb.rawMaterials.delete(id);
      setRawMaterials(prev => prev.filter(m => m.id !== id));
    }
    if (material) addLog('u1', 'INSUMOS', `Insumo excluído: ${material.name}`);
  };

  const handleAddRawMaterial = async (material: Partial<RawMaterial>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const newMaterial: RawMaterial = {
      id: material.id || `rm${Date.now()}`,
      tenantId: effectiveTenantId || 't1',
      name: material.name || '',
      unit: material.unit || 'un',
      currentStock: material.currentStock || 0,
      minStock: material.minStock || 0,
      costPerUnit: material.costPerUnit || 0,
      category: material.category || 'Geral'
    };
    if (effectiveTenantId) {
      await setDoc(doc(db, 'rawMaterials', newMaterial.id), {
        ...newMaterial,
        createdAt: new Date()
      });
    } else {
      await localDb.rawMaterials.add(newMaterial);
      setRawMaterials(prev => [...prev, newMaterial]);
    }
    addLog('u1', 'INSUMOS', `Novo insumo cadastrado: ${newMaterial.name}`);
  };

  const handleOpenCash = async (value: number) => {
    try {
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      const now = new Date();
      const newSession = { isOpen: true, openingValue: value, openedAt: now };
      
      // Update states immediately (Optimistic)
      lastWriteTimeRef.current = Date.now();
      setCashSession(newSession);
      
      // Add financial record for opening
      const openRecord: FinancialRecord = {
        id: `open-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tenantId: effectiveTenantId || 't1',
        type: 'income',
        amount: value,
        category: 'Abertura de Caixa',
        description: `Fundo de Troco - Abertura de Caixa`,
        date: now,
        status: 'paid',
        paymentMethod: 'dinheiro',
        // Associate with this session specifically
        shiftOpenedAt: now
      };

      // Handle Local Storage
      try {
        const s = await localDb.settings.get(effectiveTenantId || 'global');
        if (s) {
          await localDb.settings.put({ ...s, cashSession: newSession });
        } else {
          await localDb.settings.put({
            id: effectiveTenantId || 'global',
            admin: adminSettings,
            digitalMenu: digitalMenuSettings,
            cashSession: newSession
          });
        }
        await localDb.financialRecords.add(openRecord);
        setFinancialRecords(prev => [openRecord, ...prev]);
      } catch (localErr) {
        console.error("Local storage error during open cash:", localErr);
      }

      // Handle Cloud Storage
      if (effectiveTenantId) {
        try {
          const batch = writeBatch(db);
          
          // Update settings
          batch.set(doc(db, 'settings', effectiveTenantId), {
            cashSession: newSession,
            updatedAt: now
          }, { merge: true });
          
          // Add financial record
          batch.set(doc(db, 'financialRecords', openRecord.id), cleanObject(openRecord));
          
          await batch.commit();
        } catch (cloudErr) {
          console.error("Cloud storage error during open cash:", cloudErr);
          showToast("Caixa aberto localmente, mas erro ao sincronizar com nuvem.", 'info');
        }
      }
      
      addLog('u1', 'CAIXA', `Caixa aberto com R$ ${value.toFixed(2)}`);
      showToast("Caixa aberto com sucesso!", 'success');
    } catch (err) {
      console.error("Critical error in handleOpenCash:", err);
      showToast("Não foi possível abrir o caixa.", 'error');
    }
  };

  const handleCloseCash = async (actualValue: number, observations?: string) => {
    try {
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      // Robust parsing of openedAt
      let openedDate: Date;
      if (cashSession.openedAt instanceof Date) {
        openedDate = cashSession.openedAt;
      } else if (cashSession.openedAt) {
        openedDate = new Date(cashSession.openedAt);
      } else {
        showToast("Houve um problema ao identificar o horário de abertura do caixa.", 'error');
        return null;
      }

      if (isNaN(openedDate.getTime())) {
        console.error("Invalid opening date detected:", cashSession.openedAt);
        showToast("Formato de data de abertura inválido. Tente reabrir o caixa.", 'error');
        return null;
      }
      
      // Expert Tester Improvement: Verify couriers with money in hand
      const busyCouriers = couriers.filter(c => (c.cashHeld || 0) > 0.01);
      // We removed window.confirm as it is handled by the UI or can be ignored if the user proceeds
      
      showToast("Processando fechamento...", 'info');

      const parseToDate = (val: any): Date => {
        if (!val) return new Date(0);
        if (val instanceof Date) return val;
        if (typeof val.toDate === 'function') return val.toDate();
        if (val.seconds !== undefined) return new Date(val.seconds * 1000);
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? new Date(0) : parsed;
      };

      const getStandardPaymentMethod = (method: string): string => {
        if (!method) return 'dinheiro';
        const cleanMethod = String(method).trim().toLowerCase();
        
        const standardKeys = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'vale_refeicao', 'conta_cliente'];
        if (standardKeys.includes(cleanMethod)) return cleanMethod;
        
        if (cleanMethod === 'cash') return 'dinheiro';
        if (cleanMethod === 'credit') return 'cartao_credito';
        if (cleanMethod === 'debit') return 'cartao_debito';
        if (cleanMethod === 'voucher') return 'vale_refeicao';
        if (cleanMethod === 'account') return 'conta_cliente';
        if (cleanMethod === 'fiado') return 'conta_cliente';

        if (adminSettings && adminSettings.paymentMethods) {
          const config = adminSettings.paymentMethods.find(m => 
            m.id === method || 
            m.name.trim().toLowerCase() === cleanMethod ||
            m.type.trim().toLowerCase() === cleanMethod
          );
          if (config) {
            switch (config.type) {
              case 'cash': return 'dinheiro';
              case 'credit': return 'cartao_credito';
              case 'debit': return 'cartao_debito';
              case 'pix': return 'pix';
              case 'voucher': return 'vale_refeicao';
              case 'account': return 'conta_cliente';
            }
          }
        }

        if (cleanMethod.includes('dinheiro') || cleanMethod.includes('money') || cleanMethod.includes('efetivo') || cleanMethod.includes('cedula')) return 'dinheiro';
        if (cleanMethod.includes('credito') || cleanMethod.includes('crédito')) return 'cartao_credito';
        if (cleanMethod.includes('debito') || cleanMethod.includes('débito')) return 'cartao_debito';
        if (cleanMethod.includes('pix')) return 'pix';
        if (cleanMethod.includes('vale') || cleanMethod.includes('refeicao') || cleanMethod.includes('refeição') || cleanMethod.includes('ticket') || cleanMethod.includes('sodexo') || cleanMethod.includes('vr')) return 'vale_refeicao';
        if (cleanMethod.includes('fiado') || cleanMethod.includes('cliente') || cleanMethod.includes('carteira') || cleanMethod.includes('conta')) return 'conta_cliente';

        return 'dinheiro';
      };

      // ROBUST CALCULATION: Fetch ALL orders during the session
      let salesSinceOpen: Order[] = orders.filter(o => {
        const createdAt = parseToDate(o.createdAt);
        return createdAt >= openedDate;
      });

      let recordsDuringSession: FinancialRecord[] = financialRecords.filter(r => {
        // Prefer shiftOpenedAt link if available for strict session association
        if (r.shiftOpenedAt) {
          const shiftDate = parseToDate(r.shiftOpenedAt);
          return Math.abs(shiftDate.getTime() - openedDate.getTime()) < 5000 && r.status === 'paid'; // 5s tolerance
        }
        const date = parseToDate(r.date);
        return date >= openedDate && r.status === 'paid';
      });

      // Try to get fresh data if online
      if (effectiveTenantId) {
        try {
          const [ordersSnapshot, recordsSnapshot] = await Promise.all([
             getDocs(query(collection(db, 'orders'), where('tenantId', '==', effectiveTenantId))),
             getDocs(query(collection(db, 'financialRecords'), where('tenantId', '==', effectiveTenantId)))
          ]);
          
          if (!ordersSnapshot.empty) {
            const fetchedOrders = ordersSnapshot.docs.map(d => ({ ...d.data(), id: d.id, createdAt: (d.data().createdAt as any)?.toDate ? (d.data().createdAt as any).toDate() : new Date(d.data().createdAt) } as Order));
            salesSinceOpen = fetchedOrders.filter(o => {
              const createdAt = parseToDate(o.createdAt);
              return createdAt >= openedDate;
            });
          }
          if (!recordsSnapshot.empty) {
            const fetchedRecords = recordsSnapshot.docs.map(d => {
              const data = d.data() as any;
              return {
                ...data,
                id: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                shiftOpenedAt: data.shiftOpenedAt?.toDate ? data.shiftOpenedAt.toDate() : (data.shiftOpenedAt ? new Date(data.shiftOpenedAt) : undefined)
              } as FinancialRecord;
            });
            recordsDuringSession = fetchedRecords.filter(r => {
              if (r.shiftOpenedAt) {
                const shiftDate = parseToDate(r.shiftOpenedAt);
                return Math.abs(shiftDate.getTime() - openedDate.getTime()) < 5000 && r.status === 'paid';
              }
              const date = parseToDate(r.date);
              return date >= openedDate && r.status === 'paid';
            });
          }
        } catch (err) {
          console.warn('Usando dados locais para o fechamento devido a falha na nuvem:', err);
        }
      }

      const totalSales = salesSinceOpen.reduce((acc, o) => acc + (o.total || 0), 0);
      
      const salesByMethod: Record<PaymentMethod, number> = {
        dinheiro: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        pix: 0,
        vale_refeicao: 0,
        conta_cliente: 0
      };

      salesSinceOpen.forEach(o => {
        if (o.payments && o.payments.length > 0) {
          o.payments.forEach(p => {
            const method = getStandardPaymentMethod(p.method);
            if (salesByMethod[method] !== undefined) {
              salesByMethod[method] += (p.amount || 0);
            }
          });
        } else if (o.paymentMethod) {
          const method = getStandardPaymentMethod(o.paymentMethod);
          if (salesByMethod[method] !== undefined) {
            salesByMethod[method] += (o.total || 0);
          }
        }
      });

       const cashIncomes = recordsDuringSession
         .filter(r => r.type === 'income' && r.paymentMethod === 'dinheiro' && r.category === 'Suprimento')
         .reduce((acc, r) => acc + (r.amount || 0), 0);
       
       const cashExpenses = recordsDuringSession
         .filter(r => r.type === 'expense' && r.paymentMethod === 'dinheiro' && r.category === 'Sangria')
         .reduce((acc, r) => acc + (r.amount || 0), 0);

      const expectedCash = (cashSession.openingValue || 0) + (salesByMethod.dinheiro || 0) + cashIncomes - cashExpenses;

      const report: CashClosingReport = {
        id: `cc${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tenantId: effectiveTenantId || 't1',
        openedAt: cashSession.openedAt,
        closedAt: new Date(),
        openingValue: cashSession.openingValue,
        expectedValue: expectedCash,
        actualValue,
        difference: actualValue - expectedCash,
        salesByMethod,
        totalSales,
        closedBy: currentUserData?.name || 'Sistema',
        observations: (observations || '') + (cashIncomes > 0 || cashExpenses > 0 ? `\n(Movimentações: Suprimentos: R$ ${cashIncomes.toFixed(2)}, Sangrias: R$ ${cashExpenses.toFixed(2)})` : '')
      };

      // Reseting tables local state
      const updatedTables = tables.map(t => ({ 
        ...t, 
        status: 'available' as const, 
        currentOrderId: undefined, 
        items: [], 
        total: 0 
      }));
      
      // resetting session state
      const closedSession = { isOpen: false, openingValue: 0, openedAt: null };

      // Update UI state immediately (Optimistic update)
      lastWriteTimeRef.current = Date.now();
      setTables(updatedTables);
      setCashSession(closedSession);

      // Try LocalDB Updates as a unit
      try {
        await localDb.cashClosings.add(report);
        setCashClosings(prev => [report, ...prev]);

        // 1. ALWAYS create a "Fechamento de Caixa" record for the extrato
        const closureFinancialRec: FinancialRecord = {
          id: `close-${report.id}`,
          tenantId: effectiveTenantId || 't1',
          type: 'income',
          amount: 0,
          category: 'Fechamento de Caixa',
          description: `Fechamento de Turno - Operador: ${report.closedBy}`,
          date: report.closedAt,
          status: 'paid',
          paymentMethod: 'dinheiro',
          shiftOpenedAt: openedDate
        };

        // 2. Differences record
        let diffRec: FinancialRecord | null = null;
        if (Math.abs(report.difference) >= 0.01) {
          diffRec = {
            id: `diff-${report.id}`,
            tenantId: effectiveTenantId || 't1',
            type: report.difference > 0 ? 'income' : 'expense',
            amount: Math.abs(report.difference),
            category: 'Ajuste de Caixa',
            description: `Diferença no fechamento: ${report.difference > 0 ? 'Sobra' : 'Quebra'}`,
            date: new Date(),
            status: 'paid',
            paymentMethod: 'dinheiro',
            shiftOpenedAt: openedDate
          };
        }

        await localDb.financialRecords.add(closureFinancialRec);
        if (diffRec) await localDb.financialRecords.add(diffRec);

        setFinancialRecords(prev => {
          const newRecords = [closureFinancialRec];
          if (diffRec) newRecords.push(diffRec);
          return [...newRecords, ...prev];
        });

        // Table reset in LocalDB
        for (const t of updatedTables) {
          await localDb.diningTables.update(t.id, { status: 'available', currentOrderId: null, items: [], total: 0 });
        }
        
        const s = await localDb.settings.get(effectiveTenantId || 'global');
        if (s) {
          await localDb.settings.put({ ...s, cashSession: closedSession });
        } else {
          await localDb.settings.put({
            id: effectiveTenantId || 'global',
            admin: adminSettings,
            digitalMenu: digitalMenuSettings,
            cashSession: closedSession
          });
        }

        // 3. Sync everything to Cloud
        if (effectiveTenantId) {
          try {
            const batch = writeBatch(db);
            
            // Saving Report
            batch.set(doc(db, 'cashClosings', report.id), cleanObject(report));
            
            // Saving Financial Records
            batch.set(doc(db, 'financialRecords', closureFinancialRec.id), cleanObject(closureFinancialRec));
            if (diffRec) batch.set(doc(db, 'financialRecords', diffRec.id), cleanObject(diffRec));

            // Settings Reset
          batch.set(doc(db, 'settings', effectiveTenantId), {
            cashSession: closedSession,
            updatedAt: new Date()
          }, { merge: true });
          
          // Tables Reset
          updatedTables.forEach(t => {
            const docId = (t as any).docId || (t as any)._firestoreId;
            if (docId) {
              batch.update(doc(db, 'diningTables', docId), {
                status: 'available', items: [], total: 0, currentOrderId: null, updatedAt: new Date()
              });
            }
          });

          // Finalize pending orders - Better: query for ALL pending orders to be sure
          const ordersToCloseSnapshot = await getDocs(query(
            collection(db, 'orders'), 
            where('tenantId', '==', effectiveTenantId)
          ));
          
          ordersToCloseSnapshot.docs.forEach(oDoc => {
            const data = oDoc.data();
            if (data && ['pending', 'preparing', 'ready', 'delivered'].includes(data.status)) {
              batch.update(oDoc.ref, { 
                status: 'finished', 
                finishedAt: new Date(), 
                updatedAt: new Date() 
              });
            }
          });

          await batch.commit();
        } catch (cloudErr) {
          console.error("Cloud sync error during closure:", cloudErr);
          showToast("Caixa fechado offline. Alguns dados podem não ter sido sincronizados.", 'info');
        }
      }
    } catch (localErr) {
      console.error("Error during local closure operations:", localErr);
    }

    addLog('u1', 'CAIXA', `Caixa encerrado com diferença de R$ ${report.difference.toFixed(2)}`);
      showToast("Caixa fechado com sucesso!", 'success');
      
      return report;
    } catch (error) {
      console.error("Critical error closing cash session:", error);
      showToast("Ocorreu um erro ao fechar o caixa.", 'error');
      return null;
    }
  };

  const effectivePath = useMemo(() => {
    let path = location.pathname;
    if (typeof window !== 'undefined' && window.location.hash) {
      path = window.location.hash.substring(1).split('?')[0];
      if (path && !path.startsWith('/')) {
        path = '/' + path;
      }
    }
    return path || '/';
  }, [location.pathname]);

  const isMarketplace = effectivePath.startsWith('/marketplace') || effectivePath.startsWith('/perfil') || effectivePath.startsWith('/cardapio') || effectivePath === '/';

  const loadingText = (() => {
    try {
      const cachedTenant = localStorage.getItem('kitchenflow_cached_tenant_data');
      if (cachedTenant) {
        const parsed = JSON.parse(cachedTenant);
        if (parsed?.name) return `Carregando ${parsed.name}...`;
      }
      const cachedUser = localStorage.getItem('kitchenflow_cached_user');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.name) return `Carregando ${parsed.name}...`;
      }
    } catch {}
    return "Carregando o sistema...";
  })();

  if (authLoading || (hasApiKey === null && !isMarketplace)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Database size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Configuração Necessária</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Para utilizar as funcionalidades de IA avançadas (como geração de imagens em alta resolução), você precisa selecionar uma chave de API do Google Cloud com faturamento ativado.
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-left">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Importante</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Certifique-se de que o projeto do Google Cloud tenha o faturamento ativado. Consulte a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-bold">documentação de faturamento</a> para mais detalhes.
            </p>
          </div>
          <button
            onClick={handleSelectApiKey}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Selecionar Chave de API
          </button>
        </div>
      </div>
    );
  }

  const isMarketplaceRoute = effectivePath.startsWith('/marketplace') || effectivePath.startsWith('/perfil') || effectivePath.startsWith('/cardapio');
  const isWebsiteRoute = effectivePath.startsWith('/site') || effectivePath.startsWith('/kitchenflow') || effectivePath === '/';
  const isPublicRoute = isMarketplaceRoute || isWebsiteRoute;

  // 1. Se o usuário NÃO está autenticado no Firebase Auth
  // e tenta acessar uma rota privada/privilegiada (não pública):
  if (!user && !isPublicRoute && effectivePath !== '/') {
    return <Login onLoginSuccess={() => {}} />;
  }

  // 2. Se o usuário está autenticado no Firebase Auth mas os dados no Firestore (currentUserData) ainda NÃO carregaram:
  // Mostramos tela de carregamento para garantir consistência e evitar mostrar plataforma nula ou vazia.
  if (user && !currentUserData && authLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Buscando perfil de acesso...</p>
        </div>
      </div>
    );
  }

  // 3. Se já carregou o login (authLoading é falso), mas o usuário logado NÃO possui cadastro correspondente (currentUserData é null) ainda:
  // Carrega em segundo plano ou aguarda a conclusão da sincronização do auto-cadastro.
  if (user && !currentUserData && !authLoading && !isPublicRoute && effectivePath !== '/') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Sincronizando perfil de acesso...</p>
        </div>
      </div>
    );
  }

  // 4. Se o usuário está logado mas tem role CUSTOMER e tenta acessar painel restrito administrativo:
  if (user && currentUserData && currentUserData.role === 'CUSTOMER' && !isPublicRoute && effectivePath !== '/') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 border border-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Área Comercial Restrita</h2>
            <p className="text-slate-500 font-medium text-sm mt-3 leading-relaxed">
              Sua conta está registrada como <strong className="text-indigo-600">Cliente do Marketplace</strong> e não possui permissões administrativas para gerenciar lojas.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/marketplace')}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-indigo-100"
            >
              Ir para o Marketplace
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Fazer Logout / Outra Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SEGURANÇA MÁXIMA CONTRA INVASÃO DE URLS (SYNCHRONOUS ROUTING LOCKS) ---
  const isSaasPath = effectivePath.startsWith('/saas');
  const isLojistaPath = effectivePath.startsWith('/lojista');
  const isEntregadorPath = effectivePath.startsWith('/entregador');

  // A. Bloqueio para caminhos do SaaS (/saas) se não for Super Admin
  if (isSaasPath && currentUserData && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Acesso Negado</h2>
            <p className="text-slate-500 font-medium text-sm mt-3 leading-relaxed">
              Você não possui credenciais de <strong className="text-indigo-600">Super Administrador</strong> para visualizar ou editar as configurações centrais do SaaS.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => {
                if (currentUserData.role === 'COURIER') {
                  navigate('/entregador');
                } else if (currentUserData.role === 'CUSTOMER') {
                  navigate('/marketplace');
                } else {
                  navigate('/lojista');
                }
              }}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-indigo-100"
            >
              Voltar para Área Principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // B. Bloqueio para caminhos do Lojista (/lojista) se o cargo não pertencer ao painel da loja
  const allowedLojistaRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CHEF', 'CASHIER', 'WAITER', 'KDS', 'STOCK_ANALYST'];
  if (isLojistaPath && currentUserData && !allowedLojistaRoles.includes(currentUserData.role) && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Acesso Restrito</h2>
            <p className="text-slate-500 font-medium text-sm mt-3 leading-relaxed">
              O cargo de <strong className="text-indigo-600">{currentUserData.role}</strong> não tem autorização para gerenciar ou acessar o painel administrativo da loja.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => {
                if (currentUserData.role === 'COURIER') {
                  navigate('/entregador');
                } else {
                  navigate('/marketplace');
                }
              }}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-indigo-100"
            >
              Voltar para Área Principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // C. Bloqueio para caminhos do Entregador (/entregador) se não for Courier ou possuir permissão
  if (isEntregadorPath && currentUserData && currentUserData.role !== 'COURIER' && !getUserPermissions(currentUserData).includes('courier_app_access') && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Acesso Negado</h2>
            <p className="text-slate-500 font-medium text-sm mt-3 leading-relaxed">
              Esta área de entregas é de uso exclusivo para entregadores e parceiros logísticos registrados.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/marketplace')}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-xl shadow-indigo-100"
            >
              Ir para o Marketplace
            </button>
          </div>
        </div>
      </div>
    );
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

  if (!isDbLoaded && !isMarketplace) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Sincronizando Dados...</p>
        </div>
      </div>
    );
  }

  const localUserPerms = getUserPermissions(currentUserData);
  const hasKDSKitchenOnly = localUserPerms.includes('kds_kitchen_only_view');
  const isKDSOnlyUser = !!currentUserData && 
    (hasKDSKitchenOnly || currentUserData.role === 'KDS') && 
    !localUserPerms.includes('admin_settings_manage') && 
    !localUserPerms.includes('finance_view') &&
    !localUserPerms.includes('pos_access') &&
    !localUserPerms.includes('tables_manage');

  return (
    <div className="flex h-screen max-h-screen w-screen bg-slate-50 relative overflow-hidden">
      {/* Sistema Online / Toast Global */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 min-w-[320px] ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
              toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
              'bg-brand-primary/90 border-brand-primary/40 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'info' && <Cloud size={20} className="animate-pulse" />}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Sistema {toast.type === 'success' ? 'OK' : 'Alerta'}</span>
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {currentProject !== 'MARKETPLACE' && currentProject !== 'COURIER' && currentProject !== 'WEBSITE' && !isKDSOnlyUser && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            if (tab === 'marketplace') {
              navigate('/marketplace');
            } else {
              setActiveTab(tab);
            }
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={currentUserData ? {
            ...currentUserData,
            permissions: getUserPermissions(currentUserData)
          } : { name: user.displayName || 'Usuário', role: 'WAITER', avatar: user.photoURL || undefined, permissions: [] } as any}
          onLogout={handleLogout}
          allowedModules={effectiveAllowedModules}
          isSuperAdmin={isSuperAdmin}
          isSaaSMode={currentProject === 'PLATFORM'}
          restaurantName={currentProject === 'PLATFORM' ? 'KitchenFlow AI' : (viewingTenantName || tenantData?.name || adminSettings.companyName || 'Viva Lá Fome!')}
          logoUrl={currentProject === 'PLATFORM' ? undefined : (viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl)}
          onProfileClick={() => setIsProfileOpen(true)}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {currentProject === 'WEBSITE' ? (
          <KitchenflowWebsite />
        ) : currentProject === 'MARKETPLACE' || currentProject === 'COURIER' ? (
          <Routes>
            <Route path="/entregador" element={
               user ? (
                 (currentUserData?.role === 'COURIER' || getUserPermissions(currentUserData).includes('courier_app_access')) ? (
                   <CourierApp currentUser={currentUserData} />
                 ) : (
                   <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-sm">
                        <h2 className="text-xl font-black text-slate-800 mb-2">Acesso Negado</h2>
                        <p className="text-sm text-slate-500 mb-6">Esta área é exclusiva para entregadores cadastrados.</p>
                        <button onClick={handleLogout} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px]">Sair e Logar como Entregador</button>
                      </div>
                   </div>
                 )
               ) : <Login onLoginSuccess={() => {}} />
            } />
            {["/marketplace", "/marketplace/:tenantId", "/cardapio/:tenantId", "/perfil"].map((path) => (
              <Route 
                key={path}
                path={path} 
                element={
                  <Marketplace 
                    currentUser={user} 
                    profile={marketplaceProfile}
                    onUpdateProfile={handleUpdateMarketplaceProfile}
                    onSelectTenant={() => {}} 
                  />
                } 
              />
            ))}
            <Route path="*" element={<Navigate to="/marketplace" replace />} />
          </Routes>
        ) : (
          currentUserData?.role === 'COURIER' ? (
            <Navigate to="/entregador" replace />
          ) : (
            <>
              {/* Header Mobile */}
              {!isKDSOnlyUser && (
                <header className="lg:hidden bg-white border-b p-2 flex items-center justify-between sticky top-0 z-30">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <Menu size={20} />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${currentProject === 'PLATFORM' ? 'bg-slate-950 border border-white/10' : 'bg-indigo-600'} rounded-lg flex items-center justify-center text-white font-black text-xs overflow-hidden`}>
                      {currentProject === 'PLATFORM' ? (
                        <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="intermundosGradHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                          </defs>
                          <polygon points="50,10 90,50 50,90 10,50" stroke="url(#intermundosGradHeader)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                          <polygon points="50,5 81.82,18.18 95,50 81.82,81.82 50,95 18.18,81.82 5,50 18.18,18.18" stroke="url(#intermundosGradHeader)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="50" y1="5" x2="50" y2="95" stroke="url(#intermundosGradHeader)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                          <line x1="5" y1="50" x2="95" y2="50" stroke="url(#intermundosGradHeader)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                          <line x1="18.18" y1="18.18" x2="81.82" y2="81.82" stroke="url(#intermundosGradHeader)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                          <line x1="18.18" y1="81.82" x2="81.82" y2="18.18" stroke="url(#intermundosGradHeader)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                          <polygon points="50,5 81.82,18.18 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.15" />
                          <polygon points="50,5 18.18,18.18 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.05" />
                          <polygon points="95,50 81.82,18.18 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.1" />
                          <polygon points="95,50 81.82,81.82 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.2" />
                          <polygon points="50,95 81.82,81.82 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.25" />
                          <polygon points="50,95 18.18,81.82 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.15" />
                          <polygon points="5" y1="50" x2="18.18" y2="81.82" stroke="url(#intermundosGradHeader)" strokeWidth="1" strokeLinecap="round" opacity="0.1" />
                          <polygon points="5,50 18.18,18.18 50,50" fill="url(#intermundosGradHeader)" fillOpacity="0.2" />
                          <circle cx="50" cy="50" r="10" fill="#ffffff" opacity="0.15" />
                          <circle cx="50" cy="50" r="4" fill="#047857" />
                          <circle cx="50" cy="50" r="2" fill="#34d399" />
                        </svg>
                      ) : (
                        (viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl) ? (
                          <img src={viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (viewingTenantName || tenantData?.name || adminSettings.companyName || 'G').substring(0, 1).toUpperCase()
                        )
                      )}
                    </div>
                    <span className="font-bold text-slate-800">
                      {currentProject === 'PLATFORM' ? 'Saas Adm' : (viewingTenantName || tenantData?.name || adminSettings.companyName || 'Carregando...')}
                    </span>
                  </div>
                  <div className="w-10" /> {/* Spacer */}
                </header>
              )}

              <div className={`flex-1 custom-scrollbar ${isKDSOnlyUser ? 'h-screen max-h-screen overflow-hidden flex flex-col p-0' : (activeTab === 'kds' || activeTab === 'kds-kitchen-only' || activeTab === 'order-monitor') ? 'h-[calc(100vh-64px)] lg:h-[calc(100vh-20px)] overflow-hidden flex flex-col p-1' : 'overflow-y-auto max-h-screen p-1'}`}>
          {currentProject === 'PLATFORM' ? (
            isSuperAdmin ? (
              <SaaSAdmin 
                activeTab={activeTab}
                onViewTenant={handleViewTenant} 
                onNavigate={(tab) => {
                  if (tab === 'marketplace') {
                    navigate('/marketplace');
                  } else {
                    setActiveTab(tab);
                  }
                }}
              />
            ) : (
              <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center w-full">
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-sm border border-slate-100">
                   <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <Lock size={32} />
                   </div>
                   <h2 className="text-xl font-black text-slate-800 mb-2">Acesso Negado</h2>
                   <p className="text-sm text-slate-500 mb-6">Esta área é exclusiva para administradores globais do sistema.</p>
                   <button onClick={() => navigate('/lojista')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider">Ir para o Painel da Loja</button>
                 </div>
              </div>
            )
          ) : (
            <>
              {/* Alertas de Consumo de Assinatura */}
              {subStats && currentProject === 'RESTAURANT' && !subWarningDismissed && !subStats.isUnlimited && (
                <div className="mb-4 animate-in slide-in-from-top-4 duration-300">
                  {subStats.percentUsed >= 100 ? (
                    <div className="bg-amber-500 border border-amber-600 text-white px-6 py-4 rounded-[1.8rem] shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="shrink-0 text-white" />
                        <div>
                          <p className="font-black text-xs tracking-tight uppercase">Franquia de Pedidos Atingida ({subStats.ordersUsed} / {subStats.maxOrders})</p>
                          <p className="text-[10px] opacity-95 font-semibold mt-0.5 leading-relaxed">Você atingiu o limite de pedidos do seu plano. O KitchenFlowAI nunca bloqueia suas vendas: os pedidos adicionais continuam funcionando normalmente e serão cobrados na próxima renovação.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSubWarningDismissed(true)} 
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all self-end sm:self-center shrink-0"
                      >
                        Entendido
                      </button>
                    </div>
                  ) : subStats.percentUsed >= 80 ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-[1.8rem] shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="shrink-0 text-amber-600" />
                        <div>
                          <p className="font-black text-xs tracking-tight uppercase">Aviso de Franquia de Pedidos ({subStats.ordersUsed} / {subStats.maxOrders} - {Math.round(subStats.percentUsed)}%)</p>
                          <p className="text-[10px] text-amber-700 font-semibold mt-0.5 leading-relaxed">Você utilizou mais de 80% dos pedidos inclusos no seu plano. Para evitar custos adicionais por pedidos extras, você pode fazer upgrade para um plano maior a qualquer momento.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button 
                          onClick={() => setActiveTab('settings')} 
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Ver Planos
                        </button>
                        <button 
                          onClick={() => setSubWarningDismissed(true)} 
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {!isKDSOnlyUser && (
                <header className="flex justify-between items-center mb-4 bg-white p-6 rounded-[2.5rem] border shadow-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">
                        Painel Lojista Profissional
                      </h2>
                      <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                        <span className="text-slate-600">
                          {activeTab === 'dashboard' ? 'Painel de Controle' : 
                           activeTab === 'tables' ? 'Mesas e Comandas' :
                           activeTab === 'kds' ? 'Monitor KDS (Logística)' :
                           activeTab === 'kds-kitchen-only' ? 'Cozinha (KDS Produção)' :
                           activeTab === 'order-monitor' ? 'Monitor de Pedidos (TV)' :
                           activeTab === 'delivery' ? 'Painel de Entregas' :
                           activeTab === 'digital-menu' ? 'Cardápio Digital' :
                           activeTab === 'customers' ? 'Gestão de Clientes' :
                           activeTab === 'inventory' ? 'Controle de Estoque' :
                           activeTab === 'finance' ? 'Gestão Financeira' :
                           activeTab === 'merchant-copilot' ? 'Módulo Lojista' :
                           activeTab === 'ai-cmv' ? 'Assistente de Cardápio' :
                           activeTab === 'reports' ? 'Relatórios Inteligentes' :
                           activeTab === 'users' ? 'Gestão de Equipe' :
                           activeTab === 'saas-admin' ? 'Gestão SaaS' :
                            activeTab === 'settings' ? 'Configurações do Sistema' : activeTab}
                        </span>
                      </h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     {isSuperAdmin && viewingTenantId && (
                       <button 
                         onClick={handleStopViewingTenant}
                         className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all border-b-4 border-rose-800 active:translate-y-[2px] active:border-b-0 group"
                       >
                         <Shield size={16} className="group-hover:rotate-12 transition-transform" />
                         Sair do Modo de Visualização (Tenant: {viewingTenantName || tenantData?.name || 'Carregando...'})
                       </button>
                     )}
                     <div 
                       onClick={() => setIsProfileOpen(true)}
                       className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-slate-200 text-sm cursor-pointer hover:bg-slate-800 transition-all hover:scale-105 active:scale-[0.98] overflow-hidden shrink-0"
                       title="Editar Perfil"
                     >
                       {currentUserData?.avatar ? (
                         <img src={currentUserData.avatar} alt={currentUserData.name} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                       ) : (
                         (viewingTenantName || tenantData?.name || adminSettings.companyName || 'Viva Lá Fome!').substring(0, 2).toUpperCase()
                       )}
                     </div>
                  </div>
                </header>
              )}

              {quotaExceeded && (
                <div className="mb-4 bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-rose-800 font-black text-xs uppercase tracking-widest">Limite de Sincronização Atingido (Quota)</h3>
                    <p className="text-[10px] text-rose-600 font-bold leading-tight">
                      O Firebase atingiu o limite gratuito de leituras para hoje. O sistema está operando com dados locais salvos.
                      Novos dados da rede podem não aparecer até que o limite seja resetado automaticamente (geralmente à meia-noite).
                    </p>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-rose-500 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-rose-600 transition-colors shrink-0"
                  >
                    Tentar Recarregar
                  </button>
                  <button 
                    onClick={() => setQuotaExceeded(false)}
                    className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className={isKDSOnlyUser ? "flex-1 flex flex-col min-h-0 overflow-hidden" : `p-4 md:p-6 custom-scrollbar flex-1 flex flex-col ${(activeTab === 'kds' || activeTab === 'kds-kitchen-only' || activeTab === 'order-monitor') ? 'min-h-0 overflow-hidden pb-4' : 'pb-20'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex-1 flex flex-col ${(activeTab === 'kds' || activeTab === 'kds-kitchen-only' || activeTab === 'order-monitor') ? 'min-h-0 overflow-hidden h-full' : ''}`}
              >
                {activeTab === 'dashboard-obsolete' && hasPermission('dashboard_view') && (
          <div className="space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
            <AIInsights sales={orders} inventory={products} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-4">
                <DashboardAlerts 
                  products={products} 
                  rawMaterials={rawMaterials}
                  onNavigateToInventory={() => setActiveTab('inventory')} 
                />
                
                {/* Card de Fluxo de Caixa Operacional Diário */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                          Fluxo de Caixa Operacional Diário
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resumo comparativo de hoje</p>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-xl border border-emerald-150">
                      Entradas vs Despesas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                    <div className="bg-emerald-50/10 border border-emerald-100/40 p-3 rounded-2xl flex flex-col">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                        <ArrowUpRight size={10} /> Entradas / Vendas PDV
                      </span>
                      <span className="text-xl font-black text-emerald-600 tracking-tight mt-1">
                        R$ {dailyCashFlow.entries.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                        {dailyCashFlow.recentMovements.filter(m => m.type === 'income').length} lançamentos
                      </span>
                    </div>

                    <div className="bg-rose-50/10 border border-rose-100/40 p-3 rounded-2xl flex flex-col">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <ArrowDownLeft size={10} /> Saídas / Despesas
                      </span>
                      <span className="text-xl font-black text-rose-500 tracking-tight mt-1">
                        R$ {dailyCashFlow.outlays.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                        {dailyCashFlow.recentMovements.filter(m => m.type === 'expense').length} saídas/sangrias
                      </span>
                    </div>

                    <div className={`p-3 rounded-2xl border flex flex-col ${dailyCashFlow.net >= 0 ? 'bg-indigo-50/15 border-indigo-100/40' : 'bg-rose-50/15 border-rose-100/40'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${dailyCashFlow.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        <TrendingUp size={10} /> Saldo Operacional Líquido
                      </span>
                      <span className={`text-xl font-black tracking-tight mt-1 ${dailyCashFlow.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        R$ {dailyCashFlow.net.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                        Resultado final
                      </span>
                    </div>
                  </div>

                  {/* Barra comparativa de proporção */}
                  {(dailyCashFlow.entries > 0 || dailyCashFlow.outlays > 0) ? (
                    <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/60">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1">Proporção Operacional</span>
                        <span>{((dailyCashFlow.entries / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100).toFixed(0)}% Entrada / {((dailyCashFlow.outlays / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100).toFixed(0)}% Saída</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                          style={{ width: `${(dailyCashFlow.entries / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100}%` }} 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                        />
                        <div 
                          style={{ width: `${(dailyCashFlow.outlays / (dailyCashFlow.entries + dailyCashFlow.outlays || 1)) * 100}%` }} 
                          className="bg-rose-500 h-full transition-all duration-500" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3.5 text-slate-400 font-semibold text-[11px] border border-dashed rounded-2xl bg-slate-50 border-slate-200/50">
                      Nenhuma movimentação financeira foi registrada para comparação hoje.
                    </div>
                  )}

                  {/* Movimentações Recentes por Canal */}
                  <div className="space-y-3 pt-1 font-sans">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      Faturamento por Canal de Venda (Hoje)
                    </h4>
                    {(() => {
                      const totalIncomes = (
                        dailyCashFlow.categorySums.tables + 
                        dailyCashFlow.categorySums.delivery + 
                        dailyCashFlow.categorySums.marketplace + 
                        dailyCashFlow.categorySums.digitalMenu + 
                        dailyCashFlow.categorySums.balcao + 
                        dailyCashFlow.categorySums.others
                      ) || 1;

                      const salesChannels = [
                        { id: 'tables', label: 'Mesas / Salão', value: dailyCashFlow.categorySums.tables, icon: Utensils, colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100/50', progressColor: 'bg-indigo-500', description: 'Consumo presencial' },
                        { id: 'delivery', label: 'Delivery Próprio', value: dailyCashFlow.categorySums.delivery, icon: Bike, colorClass: 'bg-sky-50 text-sky-600 border-sky-100/50', progressColor: 'bg-sky-500', description: 'Entregador próprio' },
                        { id: 'marketplace', label: 'Marketplaces (iFood)', value: dailyCashFlow.categorySums.marketplace, icon: ShoppingBag, colorClass: 'bg-rose-50 text-rose-600 border-rose-100/50', progressColor: 'bg-rose-500', description: 'Canais integrados' },
                        { id: 'digitalMenu', label: 'Cardápio Digital', value: dailyCashFlow.categorySums.digitalMenu, icon: Smartphone, colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', progressColor: 'bg-emerald-500', description: 'Autoatendimento QR' },
                        { id: 'balcao', label: 'Balcão / PDV Direto', value: dailyCashFlow.categorySums.balcao, icon: Store, colorClass: 'bg-amber-50 text-amber-600 border-amber-100/50', progressColor: 'bg-amber-500', description: 'Vendas rápidas caixa' },
                      ];

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          {salesChannels.map(channel => {
                            const pct = totalIncomes > 1 ? (channel.value / totalIncomes) * 100 : 0;
                            return (
                              <div key={channel.id} className="p-3 bg-slate-50 hover:bg-slate-100/40 border border-slate-150/60 rounded-2xl flex flex-col justify-between transition-all">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl border ${channel.colorClass} flex items-center justify-center shrink-0`}>
                                      <channel.icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-black text-slate-700 leading-tight block truncate">{channel.label}</span>
                                      <span className="text-[9px] font-bold text-slate-400 mt-0.5 block leading-none truncate">{channel.description}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-extrabold text-slate-400 shrink-0 select-none">
                                    {pct > 0 ? `${pct.toFixed(0)}%` : '0%'}
                                  </span>
                                </div>
                                <div className="mt-3">
                                  <span className="text-[13px] font-black text-slate-800">
                                    R$ {channel.value.toFixed(2)}
                                  </span>
                                  <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden mt-1 flex">
                                    <div 
                                      style={{ width: `${pct}%` }} 
                                      className={`h-full ${channel.progressColor} rounded-full transition-all duration-300`} 
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border shadow-sm h-[350px]">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BarChartIcon size={14} className="text-indigo-600" />
                    Gráfico de Desempenho
                  </h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={weeklySalesData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stats Card (Phone 1 Style) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b flex items-center gap-3">
                    {viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl ? (
                      <img src={viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs">
                        {(viewingTenantName || tenantData?.name || adminSettings.companyName || 'G').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hoje no Restaurante</p>
                      <h3 className="text-xl font-black text-slate-800 tracking-tighter">{viewingTenantName || tenantData?.name || adminSettings.companyName}</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {[
                      { label: 'Pedidos Hoje:', value: dailyStats.count, color: 'text-slate-800' },
                      { label: 'Vendas Hoje:', value: `R$ ${dailyStats.total.toFixed(2)}`, color: 'text-emerald-600', bold: true },
                      { label: 'Ticket Médio:', value: `R$ ${dailyStats.average.toFixed(2)}`, color: 'text-indigo-600', bold: true },
                      { label: 'Em preparo:', value: orders.filter(o => o.status === 'preparing').length, color: 'text-amber-600' },
                      { label: 'Prontos:', value: orders.filter(o => o.status === 'ready').length, color: 'text-emerald-600' },
                    ].map((stat, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-slate-500">{stat.label}</span>
                        <span className={`text-sm font-black ${stat.color} ${stat.bold ? 'text-base' : ''}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mais Vendido Section (Phone 1 Style) */}
                <div className="bg-white rounded-3xl border shadow-sm p-4">
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Mais Vendido</h3>
                  {products.length > 0 ? (
                    <div className="flex gap-4 items-center">
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden border">
                         <img src={products[0]?.image || `https://picsum.photos/seed/food/200/200`} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">{products[0]?.name}</h4>
                        <p className="text-lg font-black text-indigo-600 mt-1">R$ {(products[0]?.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhum produto cadastrado</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('finance')} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 shadow-lg">Financeiro</button>
                  <button onClick={() => setActiveTab('kds')} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 shadow-lg">Pedidos</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'tables' && hasPermission('tables_manage') && <Tables 
          tables={tables} 
          counterOrders={counterOrders} 
          products={products} 
          orders={orders} 
          financialRecords={financialRecords}
          customers={customers} 
          adminSettings={adminSettings}
          digitalMenuSettings={digitalMenuSettings}
          cashSession={cashSession} 
          tenantId={viewingTenantId || currentUserData?.tenantId || 't1'}
          onUpdateTable={handleUpdateTable} 
          onAddTable={handleAddTable}
          onDeleteTable={handleDeleteTable}
          onCloseTable={handleCloseTable} 
          onSendToKitchen={handleSendToKitchen} 
          onOpenCash={handleOpenCash} 
          onCloseCash={handleCloseCash} 
          onAddCounterOrder={handleAddCounterOrder}
          onCancelTable={handleCancelTable}
          onTransferTable={handleTransferTable}
          defaultDeliveryFee={adminSettings.deliveryFee}
          onAddCustomer={handleAddCustomer}
          onAddFinancialRecord={handleAddFinancialRecord}
          pdvEditOrder={pdvEditOrder}
          onCancelPdvEdit={() => {
            setPdvEditOrder(null);
            if (returnToTab) {
              setActiveTab(returnToTab);
              setReturnToTab(null);
            }
          }}
          onUpdateOrder={handleUpdateOrder}
          onNavigate={setActiveTab}
          showToast={showToast}
        />}
        {activeTab === 'customers' && hasPermission('customers_manage') && <CustomersPanel customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onAddFinancialRecord={handleAddFinancialRecord} />}
        {activeTab === 'delivery' && hasPermission('delivery_manage') && (
          <Delivery 
            orders={orders} 
            couriers={couriers} 
            products={products}
            deliveryFee={globalDeliveryFee} 
            adminSettings={adminSettings}
            onUpdateAdminSettings={handleUpdateLogisticsSettings}
            onUpdateStatus={handleUpdateOrderStatus} 
            onAssignCourier={handleAssignCourier} 
            onDispatchCourier={handleDispatchCourier}
            onUpdateOrder={handleUpdateOrder}
            onEditOrderInPDV={handleEditOrderInPDV}
            onAddCourier={handleAddCourier} 
            onUpdateCourier={handleUpdateCourier} 
            onUpdateDeliveryFee={setGlobalDeliveryFee} 
            onReturnCash={handleReturnCourierCash}
            isDeliveryEnabled={adminSettings?.isDeliveryEnabled ?? false}
            isPickupEnabled={adminSettings?.isPickupEnabled ?? false}
            minOrderValue={adminSettings?.minOrderValue ?? 0}
            estimatedDeliveryTime={adminSettings?.estimatedDeliveryTime ?? ''}
            estimatedPickupTime={adminSettings?.estimatedPickupTime ?? ''}
            onUpdateLogisticsSettings={async (settings) => {
              const newAdminSettings = {
                ...adminSettings,
                deliveryFee: settings.deliveryFee,
                isDeliveryEnabled: settings.isDeliveryEnabled,
                isPickupEnabled: settings.isPickupEnabled,
                minOrderValue: settings.minOrderValue,
                estimatedDeliveryTime: settings.estimatedDeliveryTime,
                estimatedPickupTime: settings.estimatedPickupTime
              };
              setAdminSettings(newAdminSettings);
              setGlobalDeliveryFee(settings.deliveryFee);
              
              // Persistir local e na nuvem
              await handleUpdateLogisticsSettings(newAdminSettings);
              addLog('u1', 'CONFIG', 'Configurações de logística atualizadas');
            }}
            onAddFinancialRecord={handleAddFinancialRecord}
            onSettleOrders={handleSettleOrders}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'inventory' && hasPermission('inventory_edit') && (
          <ErrorBoundary>
            <Inventory 
              products={products} 
              rawMaterials={rawMaterials} 
              onUpdateProduct={handleUpdateProduct} 
              onAddProduct={handleAddProduct} 
              onDeleteProduct={handleDeleteProduct}
              onUpdateRawMaterial={handleUpdateRawMaterial} 
              onAddRawMaterial={handleAddRawMaterial}
              onDeleteRawMaterial={handleDeleteRawMaterial}
              digitalMenuSettings={digitalMenuSettings}
              onUpdateDigitalMenuSettings={setDigitalMenuSettings}
              productCategories={productCategories}
              setProductCategories={handleUpdateProductCategories}
              rawMaterialCategories={rawMaterialCategories}
              setRawMaterialCategories={handleUpdateRawMaterialCategories}
              onSyncCloud={handleSaveSettings}
              orders={orders}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'finance' && hasPermission('finance_view') && (
          <ErrorBoundary>
            <Finance 
              orders={orders} 
              products={products}
              customers={customers} 
              couriers={couriers} 
              manualRecords={financialRecords} 
              cashClosings={cashClosings} 
              bankAccounts={bankAccounts}
              adminSettings={adminSettings}
              cashSession={cashSession}
              onAddRecord={handleAddFinancialRecord} 
              onUpdateRecord={handleUpdateFinancialRecord} 
              onDeleteRecord={handleDeleteFinancialRecord}
              onUpdateCustomer={handleUpdateCustomer} 
              onAddBank={handleAddBankAccount}
              onUpdateBank={handleUpdateBankAccount}
              onDeleteBank={handleDeleteBankAccount}
              onSettleOrders={handleSettleOrders}
              onUpdateAdminSettings={handleSaveSettings}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'merchant-copilot' && hasPermission('finance_view') && (
          <ErrorBoundary>
            <LojistaCopilot 
              orders={orders}
              products={products}
              manualRecords={financialRecords}
              adminSettings={adminSettings}
              rawMaterials={rawMaterials}
              onUpdateProduct={handleUpdateProduct}
              onNavigateToInventory={() => setActiveTab('inventory')}
              tenantData={tenantData}
              plans={plans}
              saasConfig={saasConfig}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'users' && hasPermission('users_manage') && (
          <UsersPanel 
            users={users} 
            auditLogs={auditLogs} 
            rolePermissions={rolePermissions} 
            onAddUser={handleAddUser} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser} 
            onUpdateRole={(id, role) => handleUpdateUser(id, { role })} 
            onUpdateRolePermissions={(role, perms) => setRolePermissions(prev => ({ ...prev, [role]: perms }))} 
            onSavePreset={handleSaveUserPreset}
            isSuperAdmin={isSuperAdmin}
            allowedModules={effectiveAllowedModules}
            orders={orders}
            onAddFinancialRecord={handleAddFinancialRecord}
          />
        )}
        {activeTab === 'kds' && hasPermission('kds_view') && (
          <KDS 
            orders={orders} 
            couriers={couriers} 
            products={products}
            adminSettings={adminSettings}
            tables={tables}
            cashSession={cashSession}
            onUpdateStatus={handleUpdateOrderStatus} 
            onAssignCourier={handleAssignCourier} 
            onUpdateOrder={handleUpdateOrder}
            onEditOrderInPDV={handleEditOrderInPDV}
            onUpdateLogisticsSettings={async (settings) => {
              const newAdminSettings = { ...adminSettings, ...settings };
              setAdminSettings(newAdminSettings);
              // Persistir local e na nuvem
              await handleUpdateLogisticsSettings(newAdminSettings);
            }}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'kds-kitchen-only' && (hasPermission('kds_view') || hasPermission('kds_kitchen_only_view')) && (
          <KDSKitchenOnly 
            orders={orders}
            products={products}
            tables={tables}
            onUpdateStatus={handleUpdateOrderStatus}
            onLogout={handleLogout}
            showLogoutButton={isKDSOnlyUser}
          />
        )}
        {activeTab === 'order-monitor' && hasPermission('kds_view') && (
          <MonitorPedidos orders={orders} />
        )}
        {activeTab === 'digital-menu' && hasPermission('digital_menu_manage') && (
          <DigitalMenuConfig 
            settings={digitalMenuSettings} 
            onUpdateSettings={setDigitalMenuSettings} 
            products={products} 
            tables={tables} 
            onUpdateProduct={handleUpdateProduct} 
            onPlaceDigitalOrder={async (order) => {
              const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || 'HCL1177LRQVPEKCTYRAHU7IGBQ42';
              const orderWithTenant = {
                ...order,
                tenantId: effectiveTenantId,
                status: 'pending' as const,
                source: 'digital_menu' as const,
                createdAt: new Date()
              };
              try {
                await setDoc(doc(db, 'orders', order.id), cleanObject(orderWithTenant));
                addLog('u1', 'DIGITAL', `Novo pedido de teste via Cardápio Digital: #${order.id.slice(-4)}`);
              } catch (err) {
                console.error("Erro ao salvar pedido de teste no Firestore:", err);
              }
              setIncomingDigitalOrders(prev => {
                if (prev.some(o => o.id === order.id)) return prev;
                return [orderWithTenant, ...prev];
              });
            }}
            onSaveSettings={handleSaveSettings}
            isDeliveryEnabled={adminSettings.isDeliveryEnabled}
            isPickupEnabled={adminSettings.isPickupEnabled}
            deliveryFee={adminSettings.deliveryFee}
            minOrderValue={adminSettings.minOrderValue}
            estimatedDeliveryTime={adminSettings.estimatedDeliveryTime}
            estimatedPickupTime={adminSettings.estimatedPickupTime}
          />
        )}

        {activeTab === 'support' && (
          <SupportView 
            restaurantName={adminSettings.companyName}
            tenantId={currentUserData?.tenantId}
          />
        )}
        {activeTab === 'settings' && hasPermission('admin_settings_manage') && (
          <AdminSettingsComponent 
            settings={adminSettings} 
            onUpdateSettings={setAdminSettings}
            onSaveSettings={handleSaveSettings}
            allowedModules={effectiveAllowedModules}
            products={products}
            orders={orders}
            customers={customers}
            currentUser={currentUserData}
            onClearSalesAndFinance={handleClearSalesAndFinance}
            tenantData={tenantData}
            plans={plans}
            saasConfig={saasConfig}
          />
        )}
              </motion.div>
            </AnimatePresence>
          </div>
                </>
              )}
            </div>
          </>
        )
      )}
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg space-y-4">
            {incomingDigitalOrders.slice(0, 1).map((order) => (
              <div key={order.id} className="bg-white border-4 border-indigo-600 rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                      {order.type === 'delivery' ? <ShoppingBag size={32} /> : order.type === 'takeout' ? <Store size={32} /> : <Smartphone size={32} />}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 tracking-tight">Novo Pedido {order.type === 'delivery' ? 'Delivery' : 'Digital'}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aguardando seu aceite</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-indigo-600 leading-none">R$ {(order.total || 0).toFixed(2)}</p>
                    {order.paymentMethod === 'dinheiro' && <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Pagamento em Dinheiro</p>}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                   <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Cliente</span>
                      <span className="text-xs font-bold text-slate-800">{order.customerName}</span>
                   </div>
                   {order.customerPhone && (
                     <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Telefone</span>
                        <span className="text-xs font-bold text-slate-800">{order.customerPhone}</span>
                     </div>
                   )}
                   <div className="pt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Itens do Pedido</span>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-xs font-bold text-slate-700 flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>R$ {((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                          </p>
                        ))}
                      </div>
                   </div>
                </div>

                {order.paymentMethod === 'dinheiro' && order.changeFor && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between">
                    <p className="text-xs font-black text-emerald-700 uppercase">Troco para</p>
                    <p className="text-lg font-black text-emerald-600">R$ {(order.changeFor || 0).toFixed(2)}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={async () => {
                     if (confirm("Deseja realmente recusar este pedido? Esta ação não pode ser desfeita.")) {
                       setIncomingDigitalOrders(prev => prev.filter(o => o.id !== order.id));
                       
                       triggerWhatsAppMock("🚫 Pedido Recusado", `O pedido #${order.id.slice(-4)} foi cancelado pelo estabelecimento.`);
                       addLog('u1', 'DIGITAL', `Pedido #${order.id.slice(-4)} RECUSADO`);
                       
                       if (order.id) {
                         try {
                            await setDoc(doc(db, 'orders', order.id), { status: 'cancelled', updatedAt: new Date() }, { merge: true });
                         } catch (e) {
                            console.error("Error updating cloud order:", e);
                         }
                       }
                     }
                  }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">Recusar Pedido</button>
                  <button onClick={async () => {
                     if (order.customerPhone) {
                       try {
                          const existingCustomer = customers.find(c => c.phone === order.customerPhone);
                          if (!existingCustomer) {
                            await handleAddCustomer({
                              name: order.customerName,
                              phone: order.customerPhone,
                                     history: [{
                                id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                date: new Date(),
                                type: 'debit',
                                description: `Primeiro pedido via Marketplace (#${order.id.slice(-4)})`, items: order.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })),
                                amount: order.total
                              }]
                            });
                          } else {
                            const updatedHistory: CustomerTransaction[] = [
                              ...(existingCustomer.history || []),
                              {
                                id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                date: new Date(),
                                type: 'debit',
                                description: `Pedido via Marketplace (#${order.id.slice(-4)})`, items: order.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })),
                                amount: order.total
                              }
                            ];
                            await handleUpdateCustomer(existingCustomer.id, { 
                              history: updatedHistory,
                              address: order.customerAddress || existingCustomer.address
                            });
                          }
                       } catch (e) {
                         console.error("Erro ao processar cliente do marketplace:", e);
                       }
                     }

                     const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
                     const rawAcceptedOrder: Order = { 
                       ...order, 
                       tenantId: order.tenantId || effectiveTenantId || 'HCL1177LRQVPEKCTYRAHU7IGBQ42',
                       source: order.source || 'whatsapp',
                       status: 'preparing',
                       deliveryFee: order.type === 'delivery' ? globalDeliveryFee : 0 
                     };
                     const acceptedOrder = assignDailyNumberToOrder(rawAcceptedOrder);
                     await localDb.orders.put(acceptedOrder);
                     setOrders(prev => {
                       const exists = prev.some(o => o.id === acceptedOrder.id);
                       if (exists) {
                         return prev.map(o => o.id === acceptedOrder.id ? acceptedOrder : o);
                       }
                       return [acceptedOrder, ...prev];
                     });
                     setIncomingDigitalOrders(prev => prev.filter(o => o.id !== order.id));
                     
                     triggerWhatsAppMock("✅ Pedido Confirmado", `Recebemos seu pedido #${order.id.slice(-4)}! Já estamos preparando.`);
                     
                     if (order.id) {
                       try {
                         // Salvar o pedido COMPLETO no Firestore (com itens, cliente, e tenantId)
                         // para sincronização imediata em todas as telas (KDS, Entregas, Admin, etc.)
                         await setDoc(doc(db, 'orders', order.id), cleanObject({
                           ...acceptedOrder,
                           updatedAt: new Date(),
                           acceptedAt: new Date()
                         }));
                       } catch (e) {
                         console.error("Error accepting cloud order:", e);
                       }
                     }

                     if (order.type === 'table' && order.tableNumber) {
                       handleUpdateTable(order.tableNumber, order.items, 'occupied');
                     }
                     triggerWhatsAppMock("✅ Pedido Aceito!", `Olá ${order.customerName}, seu pedido #${order.id.slice(-4)} foi aceito e já está em produção!`);
                     addLog('u1', 'DIGITAL', `Pedido #${order.id.slice(-4)} ACEITO E ENVIADO À COZINHA`);
                  }} className="flex-[1.5] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">Aceitar Pedido</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isProfileOpen && (
          <UserProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            currentUserData={currentUserData}
            onUpdateUser={(updatedData) => {
              setCurrentUserData(updatedData);
              try {
                localStorage.setItem('kitchenflow_cached_user', JSON.stringify(updatedData));
              } catch (e) {
                console.warn(e);
              }
            }}
            showToast={(msg, typ) => showToast(msg, typ)}
          />
        )}
        {isPrintModalOpen && activePrintJob && (
          <PrintPreviewModal
            isOpen={isPrintModalOpen}
            onClose={() => {
              setIsPrintModalOpen(false);
              setActivePrintJob(null);
            }}
            printJob={activePrintJob}
          />
        )}
      </AnimatePresence>

      {/* Cookie Consent Banner (LGPD) */}
      {localStorage.getItem('lgpd_cookie_banner') === 'true' && !cookieConsentAccepted && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-[99999] border border-slate-800 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex items-start gap-3">
             <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400 shrink-0">
                <Fingerprint size={18} />
             </div>
             <div className="space-y-1">
                <h4 className="text-[10px] font-black tracking-wider uppercase text-indigo-400">Privacidade & Cookies (LGPD)</h4>
                <p className="text-[10px] text-slate-300 font-medium leading-normal">
                   {localStorage.getItem('lgpd_consent_text') || 'Utilizamos cookies essenciais e tecnologias semelhantes para fornecer recursos de PDV, segurança e relatórios fiscais conforme a LGPD.'}
                </p>
                <div className="text-[8px] text-slate-400 font-bold mt-1">
                   DPO: {localStorage.getItem('lgpd_dpo_name') || 'Equipe de Privacidade KitchenFlow'} • {localStorage.getItem('lgpd_dpo_email') || 'privacidade@kitchenflow.ai'}
                </div>
                <div className="flex gap-2 pt-2">
                   <button 
                      onClick={() => {
                         localStorage.setItem('lgpd_cookie_accepted', 'true');
                         setCookieConsentAccepted(true);
                         showToast('Suas preferências de privacidade foram salvas!', 'success');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-colors"
                   >
                      Aceitar e Prosseguir
                   </button>
                   <button 
                      onClick={() => {
                         localStorage.setItem('lgpd_cookie_accepted', 'true');
                         setCookieConsentAccepted(true);
                         showToast('Consentimento registrado.', 'info');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[8px] font-black uppercase tracking-wider rounded-lg transition-colors"
                   >
                      Recusar Opcionais
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
