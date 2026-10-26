
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { safeParseDate, toSafeDate } from './utils/dateUtils';
import { maskPhone, maskCPF, maskCEP } from './utils/masks';
import { deduplicateOrders, deduplicateFinancialRecords } from './utils/deduplicate';
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
import { B2BSuppliersModule } from './components/suppliers/B2BSuppliersModule';
import KitchenflowWebsite from './components/KitchenflowWebsite';
import PartnerHub from './components/PartnerHub';
import SupportView from './components/SupportView';
import Marketplace from './components/Marketplace';
import CourierApp from './components/CourierApp';
import IntelligentReports from './components/IntelligentReports';
import LojistaCopilot from './components/LojistaCopilot';
import { FiscalEngineModule } from './components/FiscalEngineModule';
import { FiscalCoupons } from './components/FiscalCoupons';
import { SystemAudit } from './components/SystemAudit';
import { db as localDb } from './services/db';
import { auth, db } from './firebase';
import { handlePrintOrder, enqueueBrowserPrint } from './services/printService';
import { onAuthStateChanged, signOut, User as FirebaseUser, updateEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, onSnapshot, query, where, orderBy, limit, addDoc, writeBatch } from 'firebase/firestore';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { setOnQuotaExceededCallback, isQuotaError } from './lib/firestoreErrors';
import { setLocalCache, getLocalCache } from './lib/cacheUtils';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { UserProfileModal } from './components/UserProfileModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { OpenCashModal } from './components/OpenCashModal';
import { 
  getCanonicalTenantId, 
  getCanonicalStoreId, 
  publishDomainEvent, 
  subscribeToDomainEvents, 
  logDiagnostic 
} from './services/orderService';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_TABLES, 
  INITIAL_COURIERS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_RAW_MATERIALS,
  ROLE_DEFAULT_PERMISSIONS as INITIAL_ROLE_PERMISSIONS
} from './constants';
import { Product, Table, Order, OrderStatus, Courier, FinancialRecord, User, UserRole, UserPreset, AuditLog, Permission, OrderItem, PaymentMethod, PriceHistory, DigitalMenuSettings, AdminSettings, Customer, CustomerTransaction, RawMaterial, CashClosingReport, Tenant, BankAccount, Plan } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { compressImage } from './lib/imageUtils';
import { ensureLojistaTenantWithData, restoreCategoryForProduct } from './lib/ensureLojistaTenant';
import { normalizePaymentMethod, getPaymentMethodLabel } from './utils/paymentUtils';
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
  Fingerprint,
  ShieldAlert,
  ArrowLeft
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
  { id: 'audit_view', label: 'Auditoria do Sistema' },
  { id: 'audit_manage', label: 'Gestão de Auditoria' },
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
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
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
  };

  if (
    errMsg.includes('Quota') || 
    errMsg.includes('quota') || 
    errCode === 'resource-exhausted' || 
    errCode === 'unavailable' ||
    errMsg.includes('unavailable') ||
    errMsg.includes('INTERNAL ASSERTION FAILED') ||
    errMsg.includes('Unexpected state') ||
    errMsg.includes('Could not reach Cloud Firestore backend')
  ) {
    console.warn('Firestore connectivity or quota notice:', errMsg);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
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
        return JSON.parse(demoUser).userData;
      }
      const cached = localStorage.getItem('kitchenflow_cached_user') || localStorage.getItem('gastroai_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    companyName: 'KitchenFlow',
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
      razaoSocial: 'KitchenFlow AI',
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
    printing: { paperWidth: '80mm', autoPrintOrder: false, headerText: 'BEM VINDO AO KITCHENFLOW AI!', footerText: 'Obrigado!', showLogo: true },
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

  const adminSettingsRef = useRef<AdminSettings>(adminSettings);
  useEffect(() => {
    adminSettingsRef.current = adminSettings;
  }, [adminSettings]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addLogRef = useRef<any>(null);

  useEffect(() => {
    setOnQuotaExceededCallback(() => {
      setQuotaExceeded(true);
    });
  }, []);

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
      const errorMsg = event.message || event.error?.message || 'Erro inesperado no cliente';
      
      if (isQuotaError(event.error) || isQuotaError(event.message)) {
        console.warn('Aviso de cota do Firestore interceptado:', errorMsg);
        setQuotaExceeded(true);
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        return;
      }

      if (
        errorMsg.includes('FIRESTORE') || 
        errorMsg.includes('INTERNAL ASSERTION FAILED') || 
        errorMsg.includes('Unexpected state')
      ) {
        console.warn('Aviso de conexão do Firestore interceptado:', errorMsg);
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        return;
      }

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

      if (isQuotaError(reason) || isQuotaError(errorMsg)) {
        console.warn('Aviso de cota do Firestore interceptado:', errorMsg);
        setQuotaExceeded(true);
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        return;
      }

      if (
        errorMsg.includes('FIRESTORE') || 
        errorMsg.includes('INTERNAL ASSERTION FAILED') || 
        errorMsg.includes('Unexpected state')
      ) {
        console.warn('Aviso de rejeição assíncrona do Firestore interceptado:', errorMsg);
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        return;
      }

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
  const [plans, setPlans] = useState<Plan[]>(() => getLocalCache('plans') || []);
  const [saasConfig, setSaasConfig] = useState<{
    excedentOrderPrice: number;
    maxExtraOrdersLimit: number;
    enableExtraOrdersLimit: boolean;
    volumeDiscounts: { threshold: number; discountPercent: number }[];
  }>(() => getLocalCache('saas_config') || {
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
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [rawMaterialCategories, setRawMaterialCategories] = useState<string[]>([]);
  const [cashSession, setCashSession] = useState<CashSession>({ isOpen: false, openingValue: 0, openedAt: null });
  const [showGlobalOpenCashModal, setShowGlobalOpenCashModal] = useState(false);
  const [pendingOrderToAcceptAfterCashOpen, setPendingOrderToAcceptAfterCashOpen] = useState<Order | null>(null);
  const cashSessionRef = useRef<CashSession>(cashSession);
  useEffect(() => {
    cashSessionRef.current = cashSession;
  }, [cashSession]);

  useEffect(() => {
    const handleOpenCashEvent = (e: any) => {
      const order = e.detail?.order || null;
      if (order) {
        setPendingOrderToAcceptAfterCashOpen(order);
      }
      setShowGlobalOpenCashModal(true);
    };
    window.addEventListener('kitchenflow-open-cash-modal', handleOpenCashEvent);
    return () => window.removeEventListener('kitchenflow-open-cash-modal', handleOpenCashEvent);
  }, []);

  const lastWriteTimeRef = useRef<number>(0);
  const ordersRef = useRef<Order[]>([]);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
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
      const oDate = o.createdAt instanceof Date ? o.createdAt : (typeof (o.createdAt as any)?.toDate === 'function' ? (o.createdAt as any).toDate() : new Date(o.createdAt));
      if (!oDate || isNaN(oDate.getTime())) return false;
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
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(true);
  const [currentProject, setCurrentProject] = useState<'PLATFORM' | 'RESTAURANT' | 'MARKETPLACE' | 'COURIER' | 'WEBSITE'>(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (
      path.startsWith('/marketplace') || 
      path.startsWith('/perfil') || 
      path.startsWith('/cardapio') || 
      path.startsWith('/cardapio-digital') || 
      path.startsWith('/c/') || 
      path.startsWith('/m/') || 
      path.startsWith('/menu')
    ) {
      return 'MARKETPLACE';
    }
    if (path === '/' || path.startsWith('/site') || path.startsWith('/kitchenflow')) {
      return 'WEBSITE';
    }
    if (path.startsWith('/entregador')) {
      return 'COURIER';
    }
    if (path.startsWith('/lojista') || path.startsWith('/painel') || path.startsWith('/admin') || path.startsWith('/loja') || path.startsWith('/pdv') || path.startsWith('/mesas') || path.startsWith('/financeiro') || path.startsWith('/kds') || path.startsWith('/estoque') || path.startsWith('/suporte') || path.startsWith('/relatorios') || path.startsWith('/insights') || path.startsWith('/configuracoes')) {
      return 'RESTAURANT';
    }
    if (path.startsWith('/saas')) {
      return 'PLATFORM';
    }
    return 'WEBSITE';
  });
  const computeIsStoreOpen = () => {
    if (adminSettings?.isStoreForceClosed) return false;
    if (adminSettings?.isStoreForceOpen) return true;
    if (!adminSettings?.businessHours || adminSettings.businessHours.length === 0) return true;

    const DAYS_MAP = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const now = new Date();
    const todayIndex = now.getDay();
    const todayName = DAYS_MAP[todayIndex];
    const isWeekDay = todayIndex >= 1 && todayIndex <= 5;
    const isWeekend = todayIndex === 0 || todayIndex === 6;

    const todaySchedules = adminSettings.businessHours.filter((h) => {
      if (!h || !h.day) return false;
      const dayClean = h.day.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const todayClean = todayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (dayClean === todayClean || dayClean.replace("-feira", "") === todayClean.replace("-feira", "")) return true;
      if (isWeekDay && (dayClean.includes("segunda a sexta") || dayClean.includes("seg a sex"))) return true;
      if (isWeekend && (dayClean.includes("sabado e domingo") || dayClean.includes("sab e dom"))) return true;
      if (dayClean.includes("diario") || dayClean.includes("todos os dias")) return true;
      return false;
    });

    if (!todaySchedules || todaySchedules.length === 0) return true;
    if (todaySchedules.every(s => s.isClosed)) return false;

    const activeShifts = todaySchedules.filter(s => !s.isClosed);
    if (activeShifts.length === 0) return false;

    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return activeShifts.some(shift => {
      const openTime = shift.open || "00:00";
      const closeTime = shift.close || "23:59";
      if (closeTime < openTime) {
        return currentTimeStr >= openTime || currentTimeStr <= closeTime;
      }
      return currentTimeStr >= openTime && currentTimeStr <= closeTime;
    });
  };

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

  const isSuperAdmin = user?.email?.toLowerCase() === 'financeirorenanuk@gmail.com' || currentUserData?.role === 'SAAS_ADMIN';

  const effectiveAllowedModules = isSuperAdmin
    ? (viewingTenantId ? (tenantData?.customModules || tenantData?.subscription?.allowedModules) : undefined)
    : (tenantData?.customModules || tenantData?.subscription?.allowedModules);

  const getUserPermissions = (userData: User | null): Permission[] => {
    if (!userData) return [];
    const isSuper = userData.email?.toLowerCase() === 'financeirorenanuk@gmail.com' || userData.role === 'SAAS_ADMIN';
    if (isSuper) {
      return ALL_MODULES.map(m => m.id);
    }
    
    const rolePerms = (userData.role ? rolePermissions[userData.role] : []) || [];
    
    // Para OWNER e ADMIN (acesso máximo ao lojista), garante que eles tenham todas as permissões padrão do cargo
    if (userData.role === 'OWNER' || userData.role === 'ADMIN') {
      const perms = userData.permissions || [];
      return Array.from(new Set([...perms, ...rolePerms]));
    }

    const perms = userData.permissions;
    if (perms && perms.length > 0) {
      return perms;
    }
    // Fallback to role-based default permissions from our state
    return rolePerms;
  };

  const hasPermission = (permission: Permission) => {
    if (isSuperAdmin) return true;
    return getUserPermissions(currentUserData).includes(permission);
  };

  const [marketplaceProfile, setMarketplaceProfile] = useState<{name: string, phone: string, photoURL?: string} | null>(null);

  // Carregar perfil do marketplace do localStorage se existir
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marketplace_profile');
      if (saved) setMarketplaceProfile(JSON.parse(saved));
    } catch (e) {
      console.warn('Erro ao carregar perfil do marketplace:', e);
    }
  }, []);

  const handleUpdateMarketplaceProfile = (data: {name: string, phone: string, photoURL?: string}) => {
    setMarketplaceProfile(data);
    try {
      localStorage.setItem('marketplace_profile', JSON.stringify(data));
    } catch (e) {
      console.warn('Erro ao salvar perfil do marketplace:', e);
    }
  };

  const getTabUrl = useCallback((tab: string, tenantId?: string) => {
    const currentTenant = tenantId || viewingTenantId || currentUserData?.tenantId || tenantData?.slug || 'default-tenant';
    switch (tab) {
      case 'saas-admin':
      case 'saas-diagnostics':
      case 'saas-audit':
      case 'saas-suppliers':
      case 'saas-tenants':
      case 'saas-plans':
      case 'saas-finance':
        return '/saas';
      case 'pos':
        return `/lojista/${currentTenant}/pdv`;
      case 'finance':
        return `/lojista/${currentTenant}/financeiro`;
      case 'tables':
        return `/lojista/${currentTenant}/mesas`;
      case 'kds':
        return `/lojista/${currentTenant}/kds`;
      case 'kds-kitchen-only':
        return `/lojista/${currentTenant}/kds-cozinha`;
      case 'delivery':
        return `/lojista/${currentTenant}/entregas`;
      case 'inventory':
        return `/lojista/${currentTenant}/estoque`;
      case 'suppliers':
        return `/lojista/${currentTenant}/fornecedores`;
      case 'digital-menu':
        return `/lojista/${currentTenant}/cardapio-digital`;
      case 'customers':
        return `/lojista/${currentTenant}/clientes`;
      case 'cmv':
        return `/lojista/${currentTenant}/cmv`;
      case 'users':
        return `/lojista/${currentTenant}/equipe`;
      case 'couriers':
        return `/lojista/${currentTenant}/entregadores`;
      case 'fiscal':
        return `/lojista/${currentTenant}/fiscal`;
      case 'fiscal-coupons':
      case 'cupons-fiscais':
      case 'cupons':
        return `/lojista/${currentTenant}/cupons-fiscais`;
      case 'settings':
      case 'admin-settings':
        return `/lojista/${currentTenant}/configuracoes`;
      case 'marketplace-config':
        return `/lojista/${currentTenant}/marketplace`;
      case 'support':
        return `/lojista/${currentTenant}/suporte`;
      case 'order-monitor':
      case 'monitor-pedidos':
        return `/lojista/${currentTenant}/monitor-pedidos`;
      case 'intelligent-reports':
        return `/lojista/${currentTenant}/relatorios`;
      case 'ai-insights':
        return `/lojista/${currentTenant}/insights`;
      case 'alerts':
        return `/lojista/${currentTenant}/alertas`;
      case 'partner-hub':
        return `/lojista/${currentTenant}/parceiros`;
      case 'merchant-copilot':
      default:
        return `/lojista/${currentTenant}`;
    }
  }, [viewingTenantId, currentUserData?.tenantId, tenantData?.slug]);

  const handleSelectTab = useCallback((tab: string) => {
    if (tab === 'marketplace') {
      navigate('/marketplace');
      return;
    }
    if (tab.startsWith('saas-')) {
      if (viewingTenantId) {
        setViewingTenantId(null);
        setViewingTenantName(null);
        setViewingTenantLogo(null);
      }
      setActiveTab(tab);
      if (currentProject !== 'PLATFORM') {
        setCurrentProject('PLATFORM');
      }
      if (location.pathname !== '/saas') {
        navigate('/saas');
      }
      return;
    }
    setActiveTab(tab);
    const tenant = viewingTenantId || currentUserData?.tenantId || tenantData?.slug || 'default-tenant';
    const targetUrl = getTabUrl(tab, tenant);
    if (location.pathname !== targetUrl) {
      navigate(targetUrl);
    }
  }, [navigate, viewingTenantId, currentUserData?.tenantId, tenantData?.slug, getTabUrl, location.pathname, currentProject]);

  useEffect(() => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);

    if (path === '/login') {
      if (user && currentUserData) {
        const userTenant = currentUserData.tenantId || 'default-tenant';
        const targetUrl = isSuperAdmin ? '/saas' : `/lojista/${userTenant}`;
        navigate(targetUrl, { replace: true });
      }
      return;
    }

    if (
      path.startsWith('/marketplace') || 
      path.startsWith('/perfil') || 
      path.startsWith('/cardapio') || 
      path.startsWith('/cardapio-digital') || 
      path.startsWith('/c/') || 
      path.startsWith('/m/') || 
      path.startsWith('/menu')
    ) {
      if (currentProject !== 'MARKETPLACE') setCurrentProject('MARKETPLACE');
    } else if (path === '/' || path.startsWith('/site') || path.startsWith('/kitchenflow')) {
      if (currentProject !== 'WEBSITE') setCurrentProject('WEBSITE');
    } else if (path.startsWith('/saas')) {
      if (authLoading) return; // Aguarda o fim do carregamento da autenticação antes de redirecionar
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
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
          const userTenant = currentUserData.tenantId;
          const targetUrl = userTenant ? `/lojista/${userTenant}` : '/lojista/default-tenant';
          navigate(targetUrl, { replace: true });
          setCurrentProject('RESTAURANT');
          setActiveTab('merchant-copilot');
          return;
        }
      } else if (!isSuperAdmin) {
        navigate('/marketplace', { replace: true });
        return;
      }
      if (viewingTenantId) {
        setViewingTenantId(null);
        setViewingTenantName(null);
        setViewingTenantLogo(null);
      }
      if (currentProject !== 'PLATFORM') setCurrentProject('PLATFORM');
      if (!activeTab.startsWith('saas-')) setActiveTab('saas-admin');
    } else if (path.startsWith('/lojista') || path.startsWith('/painel') || path.startsWith('/admin') || path.startsWith('/loja') || path.startsWith('/pdv') || path.startsWith('/mesas') || path.startsWith('/financeiro') || path.startsWith('/kds') || path.startsWith('/estoque') || path.startsWith('/suporte') || path.startsWith('/relatorios') || path.startsWith('/insights') || path.startsWith('/configuracoes') || path.startsWith('/cupons-fiscais') || path.startsWith('/fiscal')) {
      if (authLoading) return; // Aguarda autenticação
      
      // Se não há usuário logado, nunca acessa o painel do lojista ou KDS
      if (!user) {
        navigate('/marketplace', { replace: true });
        return;
      }

      if (currentUserData) {
        if (currentUserData.role === 'COURIER') {
          navigate('/entregador', { replace: true });
          return;
        }
        if (currentUserData.role === 'CUSTOMER') {
          navigate('/marketplace', { replace: true });
          return;
        }
        const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CHEF', 'CASHIER', 'WAITER', 'KDS', 'STOCK_ANALYST', 'SAAS_ADMIN'];
        if (!allowedRoles.includes(currentUserData.role) && !isSuperAdmin) {
          navigate('/marketplace', { replace: true });
          return;
        }

        const urlTenantParam = (parts[0] === 'lojista' || parts[0] === 'painel' || parts[0] === 'admin' || parts[0] === 'loja') ? parts[1] : null;
        const userTenantId = currentUserData.tenantId;

        if (isSuperAdmin) {
          if (urlTenantParam && urlTenantParam !== viewingTenantId) {
            setViewingTenantId(urlTenantParam);
          } else if (!urlTenantParam && !viewingTenantId) {
            const fallbackTenant = userTenantId || 'lojista';
            setViewingTenantId(fallbackTenant);
            navigate(`/lojista/${fallbackTenant}`, { replace: true });
            return;
          }
        } else {
          // Lojista acessando o painel: limpar qualquer resquício de inspeção do Super Admin
          if (viewingTenantId || viewingTenantName || viewingTenantLogo) {
            setViewingTenantId(null);
            setViewingTenantName(null);
            setViewingTenantLogo(null);
          }
          if (userTenantId) {
            if (urlTenantParam && urlTenantParam !== userTenantId && urlTenantParam !== tenantData?.slug) {
              const sub = parts[2] ? `/${parts[2]}` : '';
              navigate(`/lojista/${userTenantId}${sub}`, { replace: true });
              return;
            } else if (!urlTenantParam && parts[0] === 'lojista') {
              navigate(`/lojista/${userTenantId}`, { replace: true });
              return;
            }
          }
        }
      }

      if (currentProject !== 'RESTAURANT') setCurrentProject('RESTAURANT');

      let subPath = '';
      if (parts[0] === 'lojista' || parts[0] === 'painel' || parts[0] === 'admin' || parts[0] === 'loja') {
        subPath = (parts[2] || '').toLowerCase();
      } else {
        subPath = (parts[0] || '').toLowerCase();
      }

      let targetTab = 'merchant-copilot';
      if (subPath === 'pdv' || subPath === 'pos') {
        targetTab = 'pos';
      } else if (subPath === 'mesas' || subPath === 'tables') {
        targetTab = 'tables';
      } else if (subPath === 'financeiro' || subPath === 'finance') {
        targetTab = 'finance';
      } else if (subPath === 'kds') {
        targetTab = 'kds';
      } else if (subPath === 'kds-cozinha') {
        targetTab = 'kds-kitchen-only';
      } else if (subPath === 'entregas' || subPath === 'delivery') {
        targetTab = 'delivery';
      } else if (subPath === 'estoque' || subPath === 'inventory') {
        targetTab = 'inventory';
      } else if (subPath === 'fornecedores' || subPath === 'suppliers') {
        targetTab = 'suppliers';
      } else if (subPath === 'cardapio-digital' || subPath === 'cardapio') {
        targetTab = 'digital-menu';
      } else if (subPath === 'clientes' || subPath === 'customers') {
        targetTab = 'customers';
      } else if (subPath === 'cmv') {
        targetTab = 'cmv';
      } else if (subPath === 'equipe' || subPath === 'users') {
        targetTab = 'users';
      } else if (subPath === 'entregadores' || subPath === 'couriers') {
        targetTab = 'couriers';
      } else if (subPath === 'fiscal') {
        targetTab = 'fiscal';
      } else if (subPath === 'cupons-fiscais' || subPath === 'fiscal-coupons' || subPath === 'cupons') {
        targetTab = 'fiscal-coupons';
      } else if (subPath === 'configuracoes' || subPath === 'settings' || subPath === 'admin-settings') {
        targetTab = 'settings';
      } else if (subPath === 'marketplace') {
        targetTab = 'marketplace-config';
      } else if (subPath === 'suporte' || subPath === 'support') {
        targetTab = 'support';
      } else if (subPath === 'monitor-pedidos' || subPath === 'order-monitor' || subPath === 'monitor') {
        targetTab = 'order-monitor';
      } else if (subPath === 'relatorios' || subPath === 'reports') {
        targetTab = 'intelligent-reports';
      } else if (subPath === 'insights') {
        targetTab = 'ai-insights';
      } else if (subPath === 'alertas' || subPath === 'alerts') {
        targetTab = 'alerts';
      } else if (subPath === 'parceiros' || subPath === 'partners') {
        targetTab = 'partner-hub';
      } else if (subPath === 'copilot' || subPath === '' || subPath === 'dashboard') {
        if (currentUserData) {
          const userPerms = getUserPermissions(currentUserData);
          const hasKDSKitchenOnly = userPerms.includes('kds_kitchen_only_view');
          const isKDSOnlyUser = (hasKDSKitchenOnly || currentUserData.role === 'KDS') && 
            !userPerms.includes('admin_settings_manage') && 
            !userPerms.includes('finance_view') &&
            !userPerms.includes('pos_access') &&
            !userPerms.includes('tables_manage');

          if (isKDSOnlyUser) {
            targetTab = 'kds-kitchen-only';
          } else {
            const isOwnerOrAdmin = currentUserData.role === 'OWNER' || currentUserData.role === 'ADMIN' || isSuperAdmin;
            if (!isOwnerOrAdmin && !userPerms.includes('finance_view')) {
              if (userPerms.includes('pos_access')) targetTab = 'pos';
              else if (userPerms.includes('tables_manage')) targetTab = 'tables';
              else if (userPerms.includes('kds_view')) targetTab = 'kds';
              else if (userPerms.includes('kds_kitchen_only_view')) targetTab = 'kds-kitchen-only';
              else if (userPerms.includes('delivery_manage')) targetTab = 'delivery';
              else if (userPerms.includes('digital_menu_manage')) targetTab = 'digital-menu';
              else if (userPerms.includes('customers_manage')) targetTab = 'customers';
              else if (userPerms.includes('inventory_edit')) targetTab = 'inventory';
              else if (userPerms.includes('users_manage')) targetTab = 'users';
              else if (userPerms.includes('admin_settings_manage')) targetTab = 'settings';
              else targetTab = 'support';
            } else {
              targetTab = 'merchant-copilot';
            }
          }
        } else {
          targetTab = 'merchant-copilot';
        }
      }

      // Validação estrita de RBAC por cargo/permissão cadastrada
      if (currentUserData && !isSuperAdmin && currentUserData.role !== 'OWNER' && currentUserData.role !== 'ADMIN') {
        const userPerms = getUserPermissions(currentUserData);
        const TAB_REQUIRED_PERMISSIONS: Record<string, Permission> = {
          'pos': 'pos_access',
          'tables': 'tables_manage',
          'finance': 'finance_view',
          'kds': 'kds_view',
          'kds-kitchen-only': 'kds_kitchen_only_view',
          'delivery': 'delivery_manage',
          'inventory': 'inventory_edit',
          'digital-menu': 'digital_menu_manage',
          'customers': 'customers_manage',
          'cmv': 'cmv_analysis',
          'users': 'users_manage',
          'fiscal': 'fiscal_manage',
          'fiscal-coupons': 'fiscal_manage',
          'settings': 'admin_settings_manage',
          'merchant-copilot': 'finance_view',
          'intelligent-reports': 'cmv_analysis',
          'ai-insights': 'dashboard_view',
        };

        const requiredPerm = TAB_REQUIRED_PERMISSIONS[targetTab];
        if (requiredPerm && !userPerms.includes(requiredPerm)) {
          // Usuário não tem permissão para a aba requisitada; redirecionar para a primeira aba permitida
          let fallbackTab = 'support';
          if (userPerms.includes('pos_access')) fallbackTab = 'pos';
          else if (userPerms.includes('tables_manage')) fallbackTab = 'tables';
          else if (userPerms.includes('kds_kitchen_only_view')) fallbackTab = 'kds-kitchen-only';
          else if (userPerms.includes('kds_view')) fallbackTab = 'kds';
          else if (userPerms.includes('delivery_manage')) fallbackTab = 'delivery';
          else if (userPerms.includes('inventory_edit')) fallbackTab = 'inventory';
          else if (userPerms.includes('digital_menu_manage')) fallbackTab = 'digital-menu';
          else if (userPerms.includes('customers_manage')) fallbackTab = 'customers';
          else if (userPerms.includes('finance_view')) fallbackTab = 'finance';
          else if (userPerms.includes('admin_settings_manage')) fallbackTab = 'settings';

          targetTab = fallbackTab;
        }
      }

      if (activeTab !== targetTab) {
        setActiveTab(targetTab);
      }
    } else if (path.startsWith('/entregador')) {
      if (currentProject !== 'COURIER') setCurrentProject('COURIER');
      if (activeTab !== 'courier-app') setActiveTab('courier-app');
    } else {
      if (user && !authLoading) {
        const userTenant = currentUserData?.tenantId || 'default-tenant';
        if (isSuperAdmin) {
          if (currentProject !== 'PLATFORM') setCurrentProject('PLATFORM');
        } else if (currentUserData?.role === 'COURIER') {
          navigate('/entregador', { replace: true });
        } else if (currentUserData?.role === 'CUSTOMER') {
          navigate('/marketplace', { replace: true });
        } else {
          navigate(`/lojista/${userTenant}`, { replace: true });
        }
      } else if (!user && !authLoading) {
        if (currentProject !== 'WEBSITE') setCurrentProject('WEBSITE');
      }
    }
  }, [location.pathname, isSuperAdmin, currentProject, activeTab, navigate, user, currentUserData, tenantData?.slug, viewingTenantId, authLoading]);

  useEffect(() => {
    const activeViewName = isSuperAdmin && viewingTenantId ? viewingTenantName : null;
    if (currentProject === 'PLATFORM') {
      document.title = 'KitchenFlow - Painel SaaS Admin';
    } else if (currentProject === 'RESTAURANT') {
      const storeName = activeViewName || tenantData?.name || adminSettings.companyName || 'Lojista';
      document.title = `${storeName} | KitchenFlow - Sistema de Gestão para Restaurantes`;
    } else if (currentProject === 'COURIER') {
      document.title = 'KitchenFlow - Portal do Entregador';
    } else if (currentProject === 'MARKETPLACE') {
      // Dynamic title handled inside Marketplace component
    } else {
      document.title = 'KitchenFlow - Sistema de Gestão para Restaurantes';
    }
  }, [currentProject, isSuperAdmin, viewingTenantId, viewingTenantName, tenantData?.name, adminSettings.companyName]);

  useEffect(() => {
    (window as any).setActiveTab = (tab: string) => {
      handleSelectTab(tab);
    };
    return () => { delete (window as any).setActiveTab; };
  }, [handleSelectTab]);

  const handleViewTenant = (tenantId: string, name?: string, logo?: string) => {
    setPdvEditOrder(null);
    setViewingTenantId(tenantId);
    setViewingTenantName(name || null);
    setViewingTenantLogo(logo || null);
    if (name) {
      setAdminSettings(prev => ({
        ...prev,
        companyName: name,
        logoUrl: logo || prev.logoUrl
      }));
      setDigitalMenuSettings(prev => ({
        ...prev,
        restaurantName: name,
        logoUrl: logo || prev.logoUrl
      }));
    }
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
    restaurantName: 'KitchenFlow',
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

  // Ref para rastrear IDs de pedidos já notificados
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

  // Auxiliar para determinar se o pedido veio de canal digital externo (Cardápio Digital ou Marketplace)
  const isDigitalOrMarketplaceOrder = (order: Partial<Order>) => {
    if (order.isManual) return false;
    const source = (order.source || '').toLowerCase().trim();
    if (!source || source === 'pos' || source === 'local' || source === 'panel' || source === 'lojista' || source === 'balcao' || source === 'delivery_panel' || source === 'mesa') {
      return false;
    }
    if (order.type === 'table' || order.type === 'dine_in') return false;

    return (
      source === 'marketplace' ||
      source === 'zupi' ||
      source === 'zupi_delivery' ||
      source === 'digital_menu' ||
      source === 'digital_menu_delivery' ||
      source === 'digital_menu_takeout' ||
      source === 'cardapio' ||
      source === 'cardapio_digital' ||
      source === 'whatsapp'
    );
  };

  // Campainha de novos pedidos (Para até ser aceito - APENAS para Cardápio Digital e Marketplace)
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Toca o sino em loop enquanto houver pedidos digitais/marketplace pendentes de aceitação
    const pendingDigitalOrders = incomingDigitalOrders.filter(isDigitalOrMarketplaceOrder);
    if (pendingDigitalOrders.length > 0) {
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
  }, [incomingDigitalOrders]);

  // Carregar dados de todas as coleções do tenant quando mudar (Suporte SaaS / Multi-tenant)
  useEffect(() => {
    // Reset states when switching tenants to avoid leaking previous tenant data or placeholders
    setProducts([]);
    setTables([]);
    setCounterOrders([]);
    setIncomingDigitalOrders([]);
    setPdvEditOrder(null);
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

    // Se o usuário logado NÃO for Super Admin, jamais manter estado de inspeção de outro tenant
    if (currentUserData && !isSuperAdmin) {
      if (viewingTenantId) setViewingTenantId(null);
      if (viewingTenantName) setViewingTenantName(null);
      if (viewingTenantLogo) setViewingTenantLogo(null);
    }

    // PRIORIDADE: Primeiro o ID canônico consolidado para todos os módulos (Caixa, KDS, Salão, Delivery)
    const effectiveTenantId = getCanonicalTenantId(currentUserData, isSuperAdmin ? viewingTenantId : null, tenantData);
    const canonicalStoreId = getCanonicalStoreId(effectiveTenantId);

    // Try pre-populating tenantData immediately from SaaS cached tenants if matching effectiveTenantId
    let cachedSelectedTenant: Tenant | null = null;
    if (effectiveTenantId && effectiveTenantId !== 'default-tenant') {
      try {
        const rawCachedTenants = localStorage.getItem('kitchenflow_saas_cached_tenants');
        if (rawCachedTenants) {
          const parsedTenants = JSON.parse(rawCachedTenants) as Tenant[];
          const found = parsedTenants.find(t => t.id === effectiveTenantId || t.slug === effectiveTenantId);
          if (found) {
            cachedSelectedTenant = found;
            setTenantData(found);
            if (isSuperAdmin && viewingTenantId) {
              setViewingTenantName(found.name || null);
              setViewingTenantLogo(found.logoUrl || null);
            }
          }
        }
      } catch (e) {
        console.warn("Could not read cached tenants:", e);
      }
    }

    const activeViewingName = isSuperAdmin && viewingTenantId ? viewingTenantName : null;
    const activeViewingLogo = isSuperAdmin && viewingTenantId ? viewingTenantLogo : null;
    const initialName = cachedSelectedTenant?.name || activeViewingName || '';
    const initialLogo = cachedSelectedTenant?.logoUrl || activeViewingLogo || '';

    setAdminSettings({
      companyName: initialName,
      logoUrl: initialLogo,
      cnpj: cachedSelectedTenant?.cnpj || '',
      address: cachedSelectedTenant?.address || '',
      phone: cachedSelectedTenant?.phone || '',
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
        cnpj: cachedSelectedTenant?.cnpj || '',
        razaoSocial: initialName,
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
      autoAcceptOrders: cachedSelectedTenant?.autoAcceptOrders || false,
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
      restaurantName: initialName,
      welcomeMessage: cachedSelectedTenant?.description || '',
      allowOrdering: true,
      showStock: true,
      bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop',
      logoUrl: initialLogo,
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

    // Also load local settings for this tenant if saved in IndexedDB
    if (effectiveTenantId) {
      localDb.settings.get(effectiveTenantId).then(localSettings => {
        if (localSettings) {
          if (localSettings.admin) {
            setAdminSettings(prev => ({
              ...prev,
              ...localSettings.admin,
              companyName: initialName || localSettings.admin.companyName || prev.companyName,
              logoUrl: initialLogo || localSettings.admin.logoUrl || prev.logoUrl
            }));
          }
          if (localSettings.digitalMenu) {
            setDigitalMenuSettings(prev => ({
              ...prev,
              ...localSettings.digitalMenu,
              restaurantName: initialName || localSettings.digitalMenu.restaurantName || prev.restaurantName,
              logoUrl: initialLogo || localSettings.digitalMenu.logoUrl || prev.logoUrl
            }));
          }
          if (localSettings.productCategories && Array.isArray(localSettings.productCategories)) {
            setProductCategories(localSettings.productCategories);
          }
          if (localSettings.rawMaterialCategories && Array.isArray(localSettings.rawMaterialCategories)) {
            setRawMaterialCategories(localSettings.rawMaterialCategories);
          }
          if (localSettings.cashSession) {
            setCashSession(localSettings.cashSession);
          }
        }
      }).catch(e => console.warn("LocalDb settings read warning:", e));
    }

    ensureLojistaTenantWithData(effectiveTenantId);
    notifiedOrdersRef.current.clear();

    const isRemoteAuthValid = Boolean(auth.currentUser?.uid) || Boolean(user?.uid);
    if (!effectiveTenantId || !isRemoteAuthValid) {
      setTenantData(cachedSelectedTenant || null);
      setAdminSettings(prev => ({
        ...prev,
        companyName: initialName || 'KitchenFlow AI',
        logoUrl: initialLogo || ''
      }));
      setDigitalMenuSettings(prev => ({
        ...prev,
        restaurantName: initialName || 'KitchenFlow AI',
        logoUrl: initialLogo || ''
      }));
      return;
    }

    let activeTenantName: string | null = initialName || null;
    let activeTenantLogo: string | null = initialLogo || null;

    const collectionsToSync = [
      { name: 'products', setter: setProducts, syncType: 'snapshot', limit: 250 },
      { name: 'diningTables', setter: setTables, syncType: 'snapshot', limit: 50 },
      { name: 'customers', setter: setCustomers, syncType: 'snapshot', limit: 100 },
      { name: 'orders', setter: setOrders, syncType: 'snapshot', recentOnly: true, limit: 150 },
      { name: 'financialRecords', setter: setFinancialRecords, syncType: 'snapshot', limit: 150, recentOnly: true },
      { name: 'rawMaterials', setter: setRawMaterials, syncType: 'snapshot', limit: 150 },
      { name: 'bankAccounts', setter: setBankAccounts, syncType: 'snapshot', limit: 30 },
      { name: 'couriers', setter: setCouriers, syncType: 'snapshot', limit: 30 },
      { name: 'auditLogs', setter: setAuditLogs, syncType: 'snapshot', limit: 30 },
      { name: 'users', setter: setUsers, syncType: 'snapshot', limit: 40 },
      { name: 'cashClosings', setter: setCashClosings, syncType: 'snapshot', limit: 20 }
    ];

    const unsubscribes = collectionsToSync.map(col => {
      // Usar limit no nível do banco para garantir que a cota de leitura não seja excedida
      const q = col.limit 
        ? query(collection(db, col.name), where('tenantId', '==', effectiveTenantId), limit(col.limit))
        : query(collection(db, col.name), where('tenantId', '==', effectiveTenantId));

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
            newOrders.forEach(o => {
              notifiedOrdersRef.current.add(o.id);
              // Auto-impressão de novos pedidos vindos de Marketplaces ou Cardápio Digital
              // Nunca disparar popup no monitor KDS e nunca em lançamentos de mesa (bebidas/itens adicionais têm fluxo silencioso como no Saipos)
              if (adminSettingsRef.current?.printing?.autoPrintOrder) {
                const isKdsActive = activeTab === 'kds' || activeTab === 'kds-kitchen-only';
                if (!isKdsActive && o.type !== 'table' && o.source !== 'pos') {
                  try {
                    console.log(`[Auto-Print] Enviando pedido #${o.id} para impressão simultânea no balcão`);
                    enqueueBrowserPrint(o, adminSettingsRef.current);
                  } catch (printErr) {
                    console.warn('[Auto-Print] Erro ao enfileirar impressão automática:', printErr);
                  }
                }
              }
            });
          }

          // Proteção contra downgrade de status para pedidos (Sync Resiliency)
          setOrders(prev => {
            const updated = [...prev];
            items.forEach((cloudOrder: any) => {
              const existingIdx = updated.findIndex(o => o.id === cloudOrder.id || (cloudOrder.docId && o.docId === cloudOrder.docId));
              if (existingIdx > -1) {
                const localOrder = updated[existingIdx];
                const localStatus = localOrder.status;
                const cloudStatus = cloudOrder.status;

                const terminalStatuses = ['delivered', 'finished', 'cancelled'];
                const localIsTerminal = terminalStatuses.includes(localStatus);
                const cloudIsTerminal = terminalStatuses.includes(cloudStatus);
                const isNewBatchInKitchen =
                  cloudStatus === 'preparing' ||
                  cloudOrder.kitchenStatus === 'preparing' ||
                  ((cloudOrder.currentBatch || 1) > ((localOrder as any).currentBatch || 1));

                // Se o status local for terminal e o cloud não for, só ignora se não for cancelamento remoto nem nova rodada na cozinha
                if (localIsTerminal && !cloudIsTerminal && cloudStatus !== 'cancelled' && !isNewBatchInKitchen) {
                  console.log(`Resilience: Keeping terminal status ${localStatus} for order ${cloudOrder.id}`);
                } else {
                  // Blindagem de Pagamento: se o pedido local já foi liquidado ou possui pagamento atualizado/dividido, preservar as propriedades
                  const merged = { ...cloudOrder };
                  const localUpdatedMs = localOrder.updatedAt ? toSafeDate(localOrder.updatedAt).getTime() : 0;
                  const cloudUpdatedMs = merged.updatedAt ? toSafeDate(merged.updatedAt).getTime() : 0;
                  if (localUpdatedMs > cloudUpdatedMs) {
                    merged.items = localOrder.items || merged.items;
                    merged.total = localOrder.total !== undefined ? localOrder.total : merged.total;
                    merged.status = localOrder.status || merged.status;
                    merged.kitchenStatus = localOrder.kitchenStatus || merged.kitchenStatus;
                    merged.paymentMethod = localOrder.paymentMethod || merged.paymentMethod;
                    merged.payments = localOrder.payments || merged.payments;
                    if (localOrder.changeFor !== undefined) merged.changeFor = localOrder.changeFor;
                    merged.updatedAt = localOrder.updatedAt;
                  }
                  if (merged.status !== 'cancelled' && (localOrder.isSettled || localOrder.paymentStatus === 'paid' || (localOrder.payments && localOrder.payments.length > 0))) {
                    merged.isSettled = localOrder.isSettled || merged.isSettled;
                    merged.paymentStatus = localOrder.paymentStatus || merged.paymentStatus;
                    merged.paymentMethod = localOrder.paymentMethod || merged.paymentMethod;
                    if (localOrder.payments && localOrder.payments.length >= (merged.payments?.length || 0)) {
                      merged.payments = localOrder.payments;
                    }
                    if (localOrder.changeFor !== undefined) merged.changeFor = localOrder.changeFor;
                    merged.paidAt = localOrder.paidAt || merged.paidAt;
                    merged.completedAt = localOrder.completedAt || merged.completedAt;
                    merged.finishedAt = localOrder.finishedAt || merged.finishedAt;
                    if ((localOrder as any).shiftOpenedAt) (merged as any).shiftOpenedAt = (localOrder as any).shiftOpenedAt;
                  }
                  updated[existingIdx] = merged;
                }
              } else {
                updated.push(cloudOrder);
              }
            });
            return deduplicateOrders(updated);
          });

          // Sincronizar comandas de balcão ativas em tempo real para múltiplos terminais e servidor
          setCounterOrders(prev => {
            const inactiveOrderIds = new Set(
              items
                .filter((o: any) => o && (o.status === 'cancelled' || o.status === 'finished' || o.isSettled || o.paymentStatus === 'paid'))
                .flatMap((o: any) => [String(o.id), o.docId ? String(o.docId) : '', o.counterId ? String(o.counterId) : ''].filter(Boolean))
            );

            const activeUnsettled = items.filter((o: any) =>
              o && 
              (o.type === 'takeout' || o.type === 'delivery' || o.type === 'counter' || o.counterId || (!o.tableNumber && o.type !== 'table')) &&
              o.status !== 'cancelled' && 
              o.status !== 'finished' && 
              !o.isSettled && 
              o.paymentStatus !== 'paid'
            );

            const updatedCounters = prev.filter(c =>
              c &&
              !inactiveOrderIds.has(String(c.id)) &&
              !(c.currentOrderId && inactiveOrderIds.has(String(c.currentOrderId)))
            );

            if (activeUnsettled.length === 0) return updatedCounters;

            activeUnsettled.forEach((ord: any) => {
              const counterId = ord.counterId || ord.id;
              const idx = updatedCounters.findIndex(c => c && (c.id === counterId || String(c.id) === String(counterId) || c.currentOrderId === ord.id));
              const activeItems = (ord.items || []).filter((it: any) => !it.cancelled);
              const counterObj: Table = {
                id: counterId,
                number: ord.dailyNumber || (typeof counterId === 'number' ? counterId : 1),
                status: 'occupied',
                items: activeItems,
                total: ord.total ?? activeItems.reduce((s: number, it: any) => s + it.price * it.quantity, 0),
                tenantId: ord.tenantId,
                currentOrderId: ord.id,
                customerName: ord.customerName,
                customerPhone: ord.customerPhone,
                customerAddress: ord.customerAddress,
                deliveryFee: ord.deliveryFee,
                isDelivery: ord.type === 'delivery',
                customerId: ord.customerId,
                partialPayments: ord.partialPayments
              };
              if (idx > -1) {
                updatedCounters[idx] = { ...updatedCounters[idx], ...counterObj };
              } else {
                updatedCounters.push(counterObj);
              }
            });
            return updatedCounters;
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
        } else if (col.name === 'financialRecords') {
          col.setter(deduplicateFinancialRecords(items));
        } else if (col.name === 'products') {
          const cleanedProducts = items.map((p: any) => {
            if (p.category === 'Geral' || !p.category) {
              return { ...p, category: restoreCategoryForProduct(p) };
            }
            return p;
          });
          col.setter(cleanedProducts);
        } else {
          col.setter(items);
        }
        setQuotaExceeded(false);
      }, (error) => {
        if (isQuotaError(error)) {
          setQuotaExceeded(true);
        } else {
          handleFirestoreError(error, OperationType.LIST, col.name);
        }
        // Fallback to localDb strictly filtered by effectiveTenantId if cloud snapshot fails
        if (localDb && (localDb as any)[col.name]) {
          (localDb as any)[col.name].toArray().then((localItems: any[]) => {
            const filtered = localItems.filter(it => it && (it.tenantId === effectiveTenantId || (effectiveTenantId === 'lojista' && it.tenantId === 't1')));
            if (filtered.length > 0) {
              col.setter(filtered);
            }
          }).catch(() => {});
        }
      });
    });

    const plansUnsub = onSnapshot(collection(db, 'plans'), (snapshot) => {
      setQuotaExceeded(false);
      const loadedPlans: Plan[] = [];
      snapshot.forEach((doc) => {
        loadedPlans.push({ id: doc.id, ...doc.data() } as Plan);
      });
      setPlans(loadedPlans);
      setLocalCache('plans', loadedPlans);
    }, (error) => {
      console.warn("Error loading plans:", error.message);
      if (isQuotaError(error)) {
        setQuotaExceeded(true);
      }
    });

    const saasConfigUnsub = onSnapshot(doc(db, 'settings', 'saas_config'), (snapshot) => {
      setQuotaExceeded(false);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const conf = {
          excedentOrderPrice: data.excedentOrderPrice !== undefined ? data.excedentOrderPrice : 0.20,
          maxExtraOrdersLimit: data.maxExtraOrdersLimit !== undefined ? data.maxExtraOrdersLimit : 1000,
          enableExtraOrdersLimit: data.enableExtraOrdersLimit !== undefined ? data.enableExtraOrdersLimit : false,
          volumeDiscounts: data.volumeDiscounts !== undefined ? data.volumeDiscounts : [
            { threshold: 500, discountPercent: 10 },
            { threshold: 1000, discountPercent: 20 }
          ]
        };
        setSaasConfig(conf);
        setLocalCache('saas_config', conf);
      }
    }, (error) => {
      console.warn("Error loading saas_config:", error.message);
      if (isQuotaError(error)) {
        setQuotaExceeded(true);
      }
    });

    const settingsUnsub = onSnapshot(doc(db, 'settings', effectiveTenantId), (snapshot) => {
      setQuotaExceeded(false);
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
            
            const next = {
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
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            return next;
          });
        }
        if (s.digitalMenu) {
          setDigitalMenuSettings(prev => {
            const finalRestaurantName = activeTenantName || s.digitalMenu.restaurantName || prev.restaurantName;
            const finalLogoUrl = activeTenantLogo || s.digitalMenu.logoUrl || '';
            
            const next = {
              ...prev,
              ...s.digitalMenu,
              restaurantName: finalRestaurantName,
              logoUrl: finalLogoUrl,
              dailyPromo: { ...(prev.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: false }), ...(s.digitalMenu.dailyPromo || {}) }
            };
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            return next;
          });
        }
        const isRecentCategoryWrite = Date.now() - lastWriteTimeRef.current <= 4000;
        if (!isRecentCategoryWrite) {
          if (s.productCategories && Array.isArray(s.productCategories)) {
            const cleanCats = s.productCategories.filter((c: string) => c && c !== 'Geral');
            setProductCategories(prev => {
              if (JSON.stringify(prev) === JSON.stringify(cleanCats)) return prev;
              return cleanCats;
            });
          } else if (effectiveTenantId !== 'lojista') {
            setProductCategories([]);
          }
          if (s.rawMaterialCategories && Array.isArray(s.rawMaterialCategories)) {
            const cleanRawCats = s.rawMaterialCategories.filter(Boolean);
            setRawMaterialCategories(prev => {
              if (JSON.stringify(prev) === JSON.stringify(cleanRawCats)) return prev;
              return cleanRawCats;
            });
          } else if (effectiveTenantId !== 'lojista') {
            setRawMaterialCategories([]);
          }
        }
        if (s.cashSession) {
          // Only update if we don't have pending writes to this specific field to avoid flipping back 
          // during a close/open operation. We ignore snapshots for 5 seconds after a local write.
          const now = Date.now();
          if (now - lastWriteTimeRef.current > 5000) {
            setCashSession(prev => {
              const incomingDate = safeParseDate(s.cashSession.openedAt);
              const prevDate = safeParseDate(prev.openedAt);
              const incomingTime = incomingDate ? incomingDate.getTime() : 0;
              const prevTime = prevDate ? prevDate.getTime() : 0;
              
              if (prev.isOpen !== s.cashSession.isOpen || prevTime !== incomingTime) {
                return {
                  ...s.cashSession,
                  openedAt: incomingDate
                };
              }
              return prev;
            });
          }
        } else {
          // Safeguard: only reset cash session if we haven't written recently and localDb also has no open session
          const now = Date.now();
          if (now - lastWriteTimeRef.current > 5000) {
            localDb.settings.get(effectiveTenantId).then(localS => {
              if (!localS?.cashSession?.isOpen) {
                setCashSession(prev => {
                  if (!prev.isOpen && prev.openingValue === 0 && prev.openedAt === null) return prev;
                  return { isOpen: false, openingValue: 0, openedAt: null };
                });
              }
            }).catch(() => {});
          }
        }
      }
    }, (error) => {
      if (isQuotaError(error)) {
        setQuotaExceeded(true);
      } else {
        handleFirestoreError(error, OperationType.GET, `settings/${effectiveTenantId}`);
      }
    });

    const tenantUnsub = onSnapshot(doc(db, 'tenants', effectiveTenantId), (snapshot) => {
      setQuotaExceeded(false);
      if (snapshot.exists()) {
        const loadedTenant = { ...(convertTimestamps(snapshot.data()) as Tenant), id: snapshot.id };
        setTenantData(loadedTenant);
        activeTenantName = loadedTenant.name;
        activeTenantLogo = loadedTenant.logoUrl || null;
        try {
          localStorage.setItem('kitchenflow_cached_tenant_data', JSON.stringify(loadedTenant));
        } catch {}
        if (isSuperAdmin && viewingTenantId === effectiveTenantId) {
          setViewingTenantName(loadedTenant.name || null);
          setViewingTenantLogo(loadedTenant.logoUrl || null);
        }
        
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
      if (isQuotaError(error)) {
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
  }, [currentUserData?.tenantId, viewingTenantId, isSuperAdmin]);

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
        const cleanAuthEmail = (firebaseUser.email || '').toLowerCase().trim();
        const isMaster = cleanAuthEmail === 'financeirorenanuk@gmail.com';

        // Se não for o Super Admin Master, limpar imediatamente qualquer estado de visualização herdado
        if (!isMaster) {
          setViewingTenantId(null);
          setViewingTenantName(null);
          setViewingTenantLogo(null);
        }

        try {
          // 1. Buscar dados do usuário no Firestore pelo UID
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = await getDoc(userDocRef);

          let finalUserData: User | null = null;

          if (userDoc.exists()) {
            // Usuário já vinculado via UID
            finalUserData = convertTimestamps(userDoc.data()) as User;
          }

          // 2. Buscar também por EMAIL para vincular pré-cadastros (usr_${tenantId}_owner)
          // OU auto-curar usuários não-master cujo doc com UID foi poluído pelo antigo fallback 'HCL1177LRQVPEKCTYRAHU7IGBQ42'
          const needsTenantHealing =
            !isMaster &&
            (!finalUserData ||
              !finalUserData.tenantId ||
              finalUserData.tenantId === 'HCL1177LRQVPEKCTYRAHU7IGBQ42' ||
              finalUserData.tenantId === 'default-tenant');

          if (cleanAuthEmail && (!finalUserData || needsTenantHealing)) {
            const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', cleanAuthEmail));
            let usersByEmailSnap = await getDocs(usersByEmailQuery);
            
            if (usersByEmailSnap.empty && firebaseUser.email && cleanAuthEmail !== firebaseUser.email) {
              const exactQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              usersByEmailSnap = await getDocs(exactQuery);
            }
            
            if (!usersByEmailSnap.empty) {
              // Priorizar documento que possua um tenantId próprio (diferente do fallback legado de Viva la fome para não-masters)
              const preferredDoc = !isMaster
                ? (usersByEmailSnap.docs.find(d => {
                    const tId = d.data()?.tenantId;
                    return tId && tId !== 'HCL1177LRQVPEKCTYRAHU7IGBQ42' && tId !== 'GLOBAL' && tId !== 'default-tenant';
                  }) || usersByEmailSnap.docs[0])
                : usersByEmailSnap.docs[0];

              const existingUserData = convertTimestamps(preferredDoc.data()) as User;
              const previousTenantId = finalUserData?.tenantId;

              finalUserData = {
                ...(finalUserData || {}),
                ...existingUserData,
                id: firebaseUser.uid,
                tenantId: existingUserData.tenantId || finalUserData?.tenantId || '',
                updatedAt: new Date()
              } as any;

              // Sincronizar o documento definitivo com UID e remover documentos temporários duplicados (usr_*_owner)
              try {
                if (previousTenantId && previousTenantId !== finalUserData!.tenantId) {
                  await deleteDoc(userDocRef);
                }
                await setDoc(userDocRef, finalUserData!, { merge: true });
                for (const d of usersByEmailSnap.docs) {
                  if (d.id !== firebaseUser.uid) {
                    await deleteDoc(d.ref);
                  }
                }
              } catch (migErr) {
                console.warn("Aviso ao unificar documento de usuário por UID:", migErr);
              }
            }

            // 2b. Se ainda estiver sem tenantId próprio (ou com o fallback legado HCL1177LRQVPEKCTYRAHU7IGBQ42 sendo não-master),
            // consultar a coleção 'tenants' por e-mail ou pelo nome da loja ("Admin <Nome da Loja>") para auto-curar o vínculo!
            if (
              !isMaster &&
              (!finalUserData ||
                !finalUserData.tenantId ||
                finalUserData.tenantId === 'HCL1177LRQVPEKCTYRAHU7IGBQ42' ||
                finalUserData.tenantId === 'default-tenant')
            ) {
              try {
                let matchedTenant: Tenant | null = null;
                const qTenantsByEmail = query(collection(db, 'tenants'), where('email', '==', cleanAuthEmail));
                const snapTenantsByEmail = await getDocs(qTenantsByEmail);
                if (!snapTenantsByEmail.empty) {
                  const foundDoc = snapTenantsByEmail.docs.find(d => d.id !== 'HCL1177LRQVPEKCTYRAHU7IGBQ42') || snapTenantsByEmail.docs[0];
                  matchedTenant = { ...(convertTimestamps(foundDoc.data()) as Tenant), id: foundDoc.id };
                }

                if (!matchedTenant) {
                  const allTenantsSnap = await getDocs(query(collection(db, 'tenants'), limit(100)));
                  const candidateName = (finalUserData?.name || firebaseUser.displayName || '')
                    .replace(/^Admin\s+/i, '')
                    .trim()
                    .toLowerCase();

                  for (const tDoc of allTenantsSnap.docs) {
                    if (tDoc.id === 'HCL1177LRQVPEKCTYRAHU7IGBQ42') continue;
                    const tData = tDoc.data();
                    const tEmail = String(tData.email || tData.ownerEmail || tData.ownerId || '').toLowerCase().trim();
                    const tName = String(tData.name || tData.companyName || '').trim().toLowerCase();
                    if (
                      (tEmail && tEmail === cleanAuthEmail) ||
                      (candidateName && candidateName.length >= 3 && tName === candidateName)
                    ) {
                      matchedTenant = { ...(convertTimestamps(tData) as Tenant), id: tDoc.id };
                      break;
                    }
                  }
                }

                if (matchedTenant && matchedTenant.id) {
                  const allowedPerms =
                    matchedTenant.customModules ||
                    matchedTenant.subscription?.allowedModules ||
                    finalUserData?.permissions ||
                    (['dashboard_view', 'pos_access', 'tables_manage', 'kds_view', 'delivery_manage', 'digital_menu_manage', 'customers_manage', 'inventory_edit', 'finance_view', 'users_manage', 'admin_settings_manage'] as any);

                  finalUserData = {
                    ...(finalUserData || {}),
                    id: firebaseUser.uid,
                    name: finalUserData?.name || firebaseUser.displayName || `Admin ${matchedTenant.name}`,
                    email: cleanAuthEmail,
                    role: finalUserData?.role || 'OWNER',
                    tenantId: matchedTenant.id,
                    permissions: allowedPerms,
                    status: 'online',
                    active: true,
                    createdAt: finalUserData?.createdAt || new Date(),
                    updatedAt: new Date(),
                  } as User;

                  setTenantData(matchedTenant);
                  try {
                    localStorage.setItem('kitchenflow_cached_tenant_data', JSON.stringify(matchedTenant));
                  } catch {}

                  try {
                    await deleteDoc(userDocRef);
                  } catch {}
                  await setDoc(userDocRef, finalUserData, { merge: true });
                }
              } catch (tenantHealErr) {
                console.warn("Aviso ao verificar auto-cura de tenant para o usuário:", tenantHealErr);
              }
            }
          }

          // Se após as buscas o usuário ainda não possuir perfil no Firestore, nós auto-criamos
          // um perfil padrão (CUSTOMER se for no marketplace, OWNER se for no painel) associado ao tenant correspondente
          if (!finalUserData && firebaseUser.email) {
            const isMarketplaceRoute = window.location.pathname.startsWith('/marketplace');
            
            let role: UserRole = isMaster ? 'SAAS_ADMIN' : (isMarketplaceRoute ? 'CUSTOMER' : 'OWNER');
            let tenantId = isMaster ? 'HCL1177LRQVPEKCTYRAHU7IGBQ42' : (isMarketplaceRoute ? 'GLOBAL' : 'default-tenant');
            let defaultName = firebaseUser.displayName || firebaseUser.email.split('@')[0] || (isMarketplaceRoute ? 'Cliente' : 'Lojista');

            // Verificar se é entregador cadastrado na coleção de couriers
            const courierQuery = query(collection(db, 'couriers'), where('email', '==', cleanAuthEmail), limit(1));
            const courierSnap = await getDocs(courierQuery);
            if (!courierSnap.empty) {
              role = 'COURIER';
              tenantId = courierSnap.docs[0].data().tenantId || 'default-tenant';
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
            // Garante que se não for SAAS_ADMIN, nenhum cache de outro tenant permaneça ativo
            const isMasterUser = firebaseUser.email === 'financeirorenanuk@gmail.com' || finalUserData.role === 'SAAS_ADMIN';
            if (!isMasterUser) {
              setViewingTenantId(null);
              setViewingTenantName(null);
              setViewingTenantLogo(null);
              try {
                const cachedTenantRaw = localStorage.getItem('kitchenflow_cached_tenant_data');
                if (cachedTenantRaw) {
                  const parsedTenant = JSON.parse(cachedTenantRaw);
                  if (parsedTenant?.id && parsedTenant.id !== finalUserData.tenantId) {
                    localStorage.removeItem('kitchenflow_cached_tenant_data');
                    setTenantData(null);
                  }
                }
              } catch {}
            }

            // Garante que o status do usuário seja online no Firestore
            if (finalUserData.status !== 'online') {
              finalUserData.status = 'online';
              try {
                await setDoc(userDocRef, { status: 'online', lastAccess: new Date(), updatedAt: new Date() }, { merge: true });
              } catch (fsErr) {
                console.error("Erro ao sincronizar status online no Firestore:", fsErr);
              }
            }

            // Se for o gestor/admin principal (financeirorenanuk@gmail.com ou SAAS_ADMIN), garante vínculo a 'HCL1177LRQVPEKCTYRAHU7IGBQ42' (Viva la fome) e o cargo SAAS_ADMIN
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
                liveUserData.status = 'online';

                setCurrentUserData(liveUserData);
                try {
                  localStorage.setItem('kitchenflow_cached_user', JSON.stringify(liveUserData));
                } catch (e) {
                  console.warn(e);
                }

                // Se o usuário pertence a um tenant, validar estritamente o cache local contra o tenantId do usuário
                if (liveUserData.tenantId && liveUserData.tenantId !== 'GLOBAL') {
                  const cachedTenant = localStorage.getItem('kitchenflow_cached_tenant_data');
                  if (cachedTenant) {
                    try {
                      const parsed = JSON.parse(cachedTenant);
                      if (parsed && parsed.id === liveUserData.tenantId) {
                        setTenantData(prev => (prev && prev.id === liveUserData.tenantId ? prev : parsed));
                      } else if (liveUserData.role !== 'SAAS_ADMIN') {
                        localStorage.removeItem('kitchenflow_cached_tenant_data');
                        setTenantData(prev => (prev && prev.id === liveUserData.tenantId ? prev : null));
                      }
                    } catch (e) {
                      console.warn(e);
                    }
                  }
                }
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            });
          }
          
          // Auto-redirect for specific roles if on a neutral path
          const isNeutralPath = window.location.pathname === '/';
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
        } catch (fsUserErr: any) {
          console.warn("Erro ao carregar dados do usuário do Firestore:", fsUserErr);
          let loaded = false;
          try {
            const cachedUser = localStorage.getItem('kitchenflow_cached_user');
            if (cachedUser) {
              const parsedCachedUser = JSON.parse(cachedUser);
              if (!firebaseUser.email || (parsedCachedUser?.email || '').toLowerCase() === cleanAuthEmail) {
                setCurrentUserData(parsedCachedUser);
                loaded = true;
                const cachedTenant = localStorage.getItem('kitchenflow_cached_tenant_data');
                if (cachedTenant) {
                  const parsedCachedTenant = JSON.parse(cachedTenant);
                  if (parsedCachedTenant?.id === parsedCachedUser?.tenantId || parsedCachedUser?.role === 'SAAS_ADMIN') {
                    setTenantData(parsedCachedTenant);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Erro ao carregar do cache local:", e);
          }

          if (!loaded && firebaseUser) {
            const fallbackRole: UserRole = isMaster ? 'SAAS_ADMIN' : 'OWNER';
            let resolvedFallbackTenantId = isMaster ? 'HCL1177LRQVPEKCTYRAHU7IGBQ42' : 'default-tenant';
            if (!isMaster) {
              try {
                const rawCachedTenants = localStorage.getItem('kitchenflow_saas_cached_tenants');
                if (rawCachedTenants) {
                  const parsedTenants = JSON.parse(rawCachedTenants) as Tenant[];
                  const matched = parsedTenants.find(t =>
                    t.id !== 'HCL1177LRQVPEKCTYRAHU7IGBQ42' &&
                    ((t.email || '').toLowerCase().trim() === cleanAuthEmail ||
                      (t.ownerId || '').toLowerCase().trim() === cleanAuthEmail)
                  );
                  if (matched?.id) resolvedFallbackTenantId = matched.id;
                }
              } catch {}
            }
            const fallbackUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (isMaster ? 'Master Admin' : 'Lojista'),
              email: firebaseUser.email || '',
              role: fallbackRole,
              tenantId: resolvedFallbackTenantId,
              permissions: isMaster ? ALL_MODULES.map(m => m.id) : ['dashboard_view', 'orders_view', 'menu_view', 'stock_view', 'finance_view', 'users_view'] as any,
              status: 'online',
              active: true,
              createdAt: new Date()
            };
            setCurrentUserData(fallbackUser);
          }
        }
      } else {
        setCurrentUserData(null);
        setTenantData(null);
        setViewingTenantId(null);
        setViewingTenantName(null);
        setViewingTenantLogo(null);
        try {
          localStorage.removeItem('kitchenflow_cached_user');
          localStorage.removeItem('kitchenflow_cached_tenant_data');
          localStorage.removeItem('gastroai_cached_user');
          localStorage.removeItem('gastroai_cached_tenant_data');
        } catch (e) {
          console.warn(e);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, [navigate]);

  // Carregamento inicial do banco de dados (Apenas para uso local/demo ou se não estivermos sincronizando com nuvem)
  useEffect(() => {
    let isMounted = true;
    if (!user) return;
    // Se estivermos visualizando um tenant específico em nuvem, não carregamos o mock local para não poluir o estado
    if (viewingTenantId || (currentUserData && currentUserData.tenantId)) {
      setIsDbLoaded(true);
      return;
    }

    const initDb = async () => {
      try {
        // Isolamento Estrito Multi-Tenant: NUNCA popular localDb com INITIAL_PRODUCTS, INITIAL_USERS ou dados fictícios.
        if (isMounted) {
          setIsDbLoaded(true);
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
        const targetTenant = currentUserData?.tenantId || viewingTenantId || tenantData?.slug || 'default-tenant';
        navigate(`/lojista/${targetTenant}/kds-cozinha`, { replace: true });
      }
      return;
    }

    // Bloqueia tentativas de acessar a aba ou projeto SaaS Admin sem ser Super Admin
    if ((activeTab.startsWith('saas-') || currentProject === 'PLATFORM') && !isSuperAdmin) {
      if (currentProject === 'PLATFORM') setCurrentProject('RESTAURANT');
      setActiveTab('merchant-copilot');
      navigate('/lojista', { replace: true });
      return;
    }

    // Verify if activeTab matches permitted menus
    const tabPermissions: Record<string, string> = {
      'merchant-copilot': 'finance_view',
      'pos': 'pos_access',
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
      const isOwnerOrAdmin = currentUserData?.role === 'OWNER' || currentUserData?.role === 'ADMIN';
      const hasDirectPermission = isOwnerOrAdmin || userPerms.includes(requiredPermission as any);
      
      // Special allowance for kds-kitchen-only which can be opened by kds_view too
      const isAllowedKDSKitchen = activeTab === 'kds-kitchen-only' && userPerms.includes('kds_view');

      if (!hasDirectPermission && !isAllowedKDSKitchen) {
        // Active tab is not allowed, redirect to first allowed tab
        const menuTabsOrder = [
          { tab: 'merchant-copilot', perm: 'finance_view' },
          { tab: 'pos', perm: 'pos_access' },
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

        const targetTenant = currentUserData?.tenantId || viewingTenantId || tenantData?.slug || 'default-tenant';
        if (firstAllowed) {
          setActiveTab(firstAllowed.tab);
          navigate(getTabUrl(firstAllowed.tab, targetTenant), { replace: true });
        } else {
          setActiveTab('support');
          navigate(getTabUrl('support', targetTenant), { replace: true });
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
    try {
      // Limpeza completa de credenciais e caches de sessão/tenant
      const keysToRemove = [
        'kitchenflow_demo_user',
        'kitchenflow_cached_user',
        'kitchenflow_cached_tenant_data',
        'gastroai_cached_user',
        'gastroai_cached_tenant_data',
        'marketplace_profile',
        'marketplace_favorites',
        'marketplace_customer_address',
        'kf_slug_map',
        'kf_target_margins',
        'kf_simulated_pizzas'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      // Remover todos os caches de lojas (kf_store_*, copilot_*, etc.)
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('kf_store_') || key.startsWith('copilot_') || key.startsWith('kf_cache_') || key.startsWith('last_order_'))) {
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('mp_store_') || key.startsWith('mp_') || key.startsWith('kf_'))) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn(e);
    }
    // Resetar estados em memória para isolamento total
    setCurrentUserData(null);
    setTenantData(null);
    setViewingTenantId(null);
    setViewingTenantName(null);
    setViewingTenantLogo(null);
    setProductCategories([]);
    setRawMaterialCategories([]);
    setOrders([]);
    setProducts([]);
    setTables([]);
    setCustomers([]);
    setCouriers([]);
    setFinancialRecords([]);
    
    await signOut(auth);
    window.location.href = '/login';
  };

  const handleSaveSettings = async () => {
    try {
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      const s = await localDb.settings.get(effectiveTenantId || 'global');
      
      // Ensure images are compressed before saving to Firestore (1MB limit)
      let compressedLogo = digitalMenuSettings.logoUrl || adminSettings.logoUrl;
      let compressedBanner = digitalMenuSettings.bannerUrl || adminSettings.bannerUrl;

      if (compressedLogo && compressedLogo.length > 100000 && compressedLogo.startsWith('data:image/')) {
        compressedLogo = await compressImage(compressedLogo, 400, 400, 0.7);
      }
      if (compressedBanner && compressedBanner.length > 200000 && compressedBanner.startsWith('data:image/')) {
        compressedBanner = await compressImage(compressedBanner, 800, 450, 0.7);
      }

      // UNIFY BRANDING: Primary Color, Accent Color, Logo, Banner, Store Name
      const unifiedPrimaryColor = digitalMenuSettings.primaryColor || adminSettings.primaryColor || '#4f46e5';
      const unifiedAccentColor = digitalMenuSettings.accentColor || adminSettings.accentColor || '#facc15';
      const unifiedLogo = compressedLogo || '';
      const unifiedBanner = compressedBanner || '';
      const unifiedName = digitalMenuSettings.restaurantName || adminSettings.companyName || 'KitchenFlow';

      const updatedDigitalMenu = { 
        ...digitalMenuSettings, 
        restaurantName: unifiedName,
        primaryColor: unifiedPrimaryColor,
        accentColor: unifiedAccentColor,
        logoUrl: unifiedLogo, 
        bannerUrl: unifiedBanner 
      };
      const updatedAdmin = { 
        ...adminSettings, 
        companyName: unifiedName,
        primaryColor: unifiedPrimaryColor,
        accentColor: unifiedAccentColor,
        logoUrl: unifiedLogo, 
        bannerUrl: unifiedBanner,
        coverUrl: unifiedBanner
      };

      // Keep active React states in sync immediately
      setDigitalMenuSettings(updatedDigitalMenu);
      setAdminSettings(updatedAdmin);

      // Limpar campos de estado interno que não devem ir para o Firestore admin settings
      const adminToSync = { ...updatedAdmin };
      if ((adminToSync as any).cashSession) delete (adminToSync as any).cashSession;
      if (adminToSync.fiscal?.certificate?.password) {
        adminToSync.fiscal = {
          ...adminToSync.fiscal,
          certificate: {
            ...adminToSync.fiscal.certificate,
            password: ''
          }
        };
      }

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
        
        // Sync Settings (Private to tenant)
        batch.set(doc(db, 'settings', effectiveTenantId), {
          admin: cleanObject(adminToSync),
          digitalMenu: cleanObject(updatedDigitalMenu),
          cashSession: cashSession, // MANDATORY: Use active React state, never fall back to other-tenant s?.cashSession!
          productCategories,
          rawMaterialCategories,
          updatedAt: new Date()
        }, { merge: true });

        // Sync Public Storefront (Safe non-sensitive subset for Marketplace / Digital Menu)
        const publicAdminSubset = {
          companyName: updatedAdmin.companyName || '',
          address: updatedAdmin.address || '',
          city: (updatedAdmin as any).city || updatedAdmin.fiscal?.address?.municipio || '',
          phone: updatedAdmin.phone || '',
          deliveryFee: updatedAdmin.deliveryFee ?? 0,
          minOrderValue: updatedAdmin.minOrderValue ?? 0,
          isDeliveryEnabled: updatedAdmin.isDeliveryEnabled ?? true,
          isPickupEnabled: updatedAdmin.isPickupEnabled ?? true,
          estimatedDeliveryTime: updatedAdmin.estimatedDeliveryTime || '30-45 min',
          estimatedPickupTime: updatedAdmin.estimatedPickupTime || '15-20 min',
          autoAcceptOrders: updatedAdmin.autoAcceptOrders ?? false,
          businessHours: updatedAdmin.businessHours || [],
          isStoreForceClosed: updatedAdmin.isStoreForceClosed ?? false,
          isStoreForceOpen: updatedAdmin.isStoreForceOpen ?? false,
          socialMedia: updatedAdmin.socialMedia || {},
          category: updatedAdmin.category || tenantData?.category || ''
        };

        batch.set(doc(db, 'publicStorefronts', effectiveTenantId), {
          tenantId: effectiveTenantId,
          admin: cleanObject(publicAdminSubset),
          digitalMenu: cleanObject(updatedDigitalMenu),
          productCategories,
          updatedAt: new Date()
        }, { merge: true });
        
        // Sync Tenant Profile (This is what shows up in the Marketplace and SaaS Admin)
        const tenantUpdate: any = {
          logoUrl: updatedDigitalMenu.logoUrl || updatedAdmin.logoUrl || tenantData?.logoUrl,
          bannerUrl: updatedDigitalMenu.bannerUrl || updatedAdmin.bannerUrl || tenantData?.bannerUrl,
          coverUrl: updatedDigitalMenu.bannerUrl || updatedAdmin.bannerUrl || tenantData?.bannerUrl,
          primaryColor: unifiedPrimaryColor,
          accentColor: unifiedAccentColor,
          description: updatedDigitalMenu.welcomeMessage,
          name: updatedDigitalMenu.restaurantName || updatedAdmin.companyName,
          cnpj: updatedAdmin.cnpj || tenantData?.cnpj,
          address: updatedAdmin.address,
          phone: updatedAdmin.phone,
          isStoreForceClosed: updatedAdmin.isStoreForceClosed ?? updatedDigitalMenu.isStoreForceClosed ?? false,
          isStoreForceOpen: updatedAdmin.isStoreForceOpen ?? updatedDigitalMenu.isStoreForceOpen ?? false,
          businessHours: updatedAdmin.businessHours || updatedDigitalMenu.businessHours || [],
          updatedAt: new Date()
        };

        if (updatedAdmin.category || tenantData?.category) {
          tenantUpdate.category = updatedAdmin.category || tenantData?.category;
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
      if (order.status === 'cancelled' || order.isSubTicket || order.mergedIntoOrderId) return;
      const isCompletedOrPaid = order.status === 'finished' || order.status === 'delivered' || order.isSettled || order.paymentStatus === 'paid';
      if (isCompletedOrPaid) {
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
    
    const todayOrders = deduplicateOrders(orders.filter(o => {
      if (o.status === 'cancelled' || o.isSubTicket || o.mergedIntoOrderId) return false;
      const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
      const isCompletedOrPaid = o.status === 'finished' || o.status === 'delivered' || o.isSettled || o.paymentStatus === 'paid';
      return d >= today && isCompletedOrPaid;
    }));

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
  // Historical orders preservation: Keep finished orders in localDb and state for accounting and reporting
  useEffect(() => {
    // Finished orders are preserved for financial history, CMV analysis, cash closures and reporting.
  }, [isDbLoaded]);

  // Real-time Cloud Order Listener (Strictly isolated per merchant/tenant and merchant view)
  useEffect(() => {
    // Isolamento: Notificações e fila de pedidos em tempo real só devem rodar no ambiente do lojista (RESTAURANT ou SaaS Admin inspecionando loja)
    // NUNCA no Website institucional, Marketplace de clientes, Entregador ou telas públicas
    const isPublicOrCustomerView = 
      currentProject === 'WEBSITE' || 
      currentProject === 'MARKETPLACE' || 
      currentProject === 'COURIER' || 
      location.pathname === '/' || 
      location.pathname.startsWith('/site') || 
      location.pathname.startsWith('/kitchenflow') || 
      location.pathname.startsWith('/marketplace') || 
      location.pathname.startsWith('/cardapio') || 
      location.pathname.startsWith('/c/') || 
      location.pathname.startsWith('/m/') || 
      location.pathname.startsWith('/menu') || 
      location.pathname.startsWith('/entregador') || 
      location.pathname.startsWith('/perfil') || 
      location.pathname === '/login';

    const isMerchantView = (currentProject === 'RESTAURANT' || (currentProject === 'PLATFORM' && isSuperAdmin && !!viewingTenantId)) && !isPublicOrCustomerView;
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    
    if (!isMerchantView || !effectiveTenantId) {
      // Limpa qualquer notificação ou modal pendente se estiver fora do painel do lojista
      setIncomingDigitalOrders([]);
      setMockWhatsAppNotify(null);
      return;
    }

    // Query estritamente isolada por tenantId do lojista para sincronização em tempo real de todos os pedidos operacionais ordenados pelos mais recentes
    let q;
    try {
      q = query(
        collection(db, 'orders'),
        where('tenantId', '==', effectiveTenantId),
        orderBy('createdAt', 'desc'),
        limit(150)
      );
    } catch (_qErr) {
      q = query(
        collection(db, 'orders'),
        where('tenantId', '==', effectiveTenantId),
        limit(150)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const docData = change.doc.data();
        
        // Barreira extra de isolamento de segurança
        if (docData.tenantId && docData.tenantId !== effectiveTenantId) {
          return;
        }

        const isPending = docData.status === 'pending';

        if (change.type === 'added' || change.type === 'modified') {
          if (isPending) {
            const rawCloudOrder = { ...docData, id: change.doc.id, docId: change.doc.id } as Order;
            const cloudOrder: Order = {
              ...rawCloudOrder,
              paymentMethod: normalizePaymentMethod(rawCloudOrder.paymentMethod, adminSettings)
            };
            
            const createdAt = cloudOrder.createdAt instanceof Date 
              ? cloudOrder.createdAt 
              : (cloudOrder.createdAt ? new Date((cloudOrder.createdAt as any).toDate ? (cloudOrder.createdAt as any).toDate() : cloudOrder.createdAt) : null);
            
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 36);
            if (createdAt && createdAt < yesterday) {
              return;
            }

            try {
              if ((cloudOrder.createdAt as any)?.toDate) {
                cloudOrder.createdAt = (cloudOrder.createdAt as any).toDate();
              } else if (cloudOrder.createdAt) {
                cloudOrder.createdAt = new Date(cloudOrder.createdAt);
              }

              const localOrder = await localDb.orders.get(cloudOrder.id);
              // Ignore notify if already processed or in a final state locally
              if (localOrder && (['preparing', 'ready', 'delivering', 'delivered', 'cancelled', 'finished'].includes(localOrder.status))) {
                console.log(`Sync: Order ${cloudOrder.id} already in state ${localOrder.status}, ignoring duplicate notify.`);
                return;
              }

              // Double check if it's already in the main state to prevent UI flickers
              if (ordersRef.current.some(o => o.id === cloudOrder.id && (['preparing', 'ready', 'delivering', 'delivered', 'cancelled', 'finished'].includes(o.status)))) {
                return;
              }
              
              // Verificar se o pedido veio de canal digital (Cardápio Digital ou Marketplace)
              const isDigital = isDigitalOrMarketplaceOrder(cloudOrder);

              if (!isDigital) {
                // Pedidos lançados manualmente pelo atendente (Mesa, Balcão, Retirada ou Delivery manual)
                // Salva normalmente no sistema sem abrir modal de aceite nem tocar campainha
                await localDb.orders.put(cloudOrder);
                setOrders(prev => {
                  const exists = prev.some(o => o.id === cloudOrder.id || o.docId === cloudOrder.docId);
                  if (exists) {
                    return prev.map(o => (o.id === cloudOrder.id || o.docId === cloudOrder.docId) ? { ...o, ...cloudOrder } : o);
                  }
                  return [cloudOrder, ...prev];
                });
                return;
              }

              // Pedido veio de canal digital (Marketplace ou Cardápio Digital)
              triggerWhatsAppMock("🛒 Novo Pedido!", `Olá! Você recebeu um novo pedido de ${cloudOrder.customerName} via ${cloudOrder.source === 'marketplace' ? 'Marketplace' : 'Cardápio Digital'}.`);

              // Se o caixa estiver fechado, aciona automaticamente o modal para abrir o caixa e contabilizar as vendas
              if (!cashSessionRef.current.isOpen) {
                setPendingOrderToAcceptAfterCashOpen(cloudOrder);
                setShowGlobalOpenCashModal(true);
              }

              if (adminSettings.autoAcceptOrders) {
                 const rawAcceptedOrder: Order = { 
                   ...cloudOrder, 
                   source: cloudOrder.source || 'digital_menu',
                   status: 'preparing' as const, 
                   shiftOpenedAt: cashSessionRef.current.isOpen ? (cashSessionRef.current.openedAt || new Date()) : new Date(),
                   deliveryFee: cloudOrder.deliveryFee !== undefined ? cloudOrder.deliveryFee : (cloudOrder.type === 'delivery' ? globalDeliveryFee : 0) 
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

              // Se não for aceito automaticamente, salva na lista principal e na fila de pendentes
              await localDb.orders.put(cloudOrder);
              setOrders(prev => {
                const exists = prev.some(o => o.id === cloudOrder.id || o.docId === cloudOrder.docId);
                if (exists) {
                  return prev.map(o => (o.id === cloudOrder.id || o.docId === cloudOrder.docId) ? { ...o, ...cloudOrder } : o);
                }
                return [cloudOrder, ...prev];
              });

              setIncomingDigitalOrders(prev => {
                if (prev.some(o => o.id === cloudOrder.id)) return prev;
                return [cloudOrder, ...prev];
              });
              addLog('u1', 'DIGITAL', `Novo pedido digital: #${cloudOrder.id.slice(-4)}`);
            } catch (err) {
              console.error("Error processing cloud order:", err);
            }
          } else {
            // Normalizar todas as datas do Firestore recursivamente (incluindo paidAt, payments[].timestamp, shiftOpenedAt, etc.)
            const rawCloudOrder = convertTimestamps({ ...docData, id: docData.id || change.doc.id, docId: change.doc.id }) as Order;
            const cloudOrder: Order = {
              ...rawCloudOrder,
              paymentMethod: rawCloudOrder.paymentMethod ? normalizePaymentMethod(rawCloudOrder.paymentMethod, adminSettings) : undefined
            };

            // Remover da fila de digitais pendentes se deixou de ser pending
            setIncomingDigitalOrders(prev => prev.filter(o => o.id !== change.doc.id && o.id !== cloudOrder.id));

            // Atualizar banco local e estado global em tempo real para sincronização entre Admin, Cozinha, Garçom e Entregas
            try {
              await localDb.orders.put(cloudOrder);
            } catch (e) {
              console.warn("Local DB sync warning:", e);
            }

            logDiagnostic('KDS_EVENT_RECEIVED', {
              tenant_id: docData.tenantId,
              order_id: cloudOrder.id,
              status: cloudOrder.status,
              type: cloudOrder.type,
              table: cloudOrder.tableNumber
            });

            // Sincronizar mesa se o pedido for de mesa (somente se ainda não foi pago/fechado)
            if (cloudOrder.type === 'table' && cloudOrder.tableNumber && !cloudOrder.isSettled && cloudOrder.paymentStatus !== 'paid') {
              setTables(prev => prev.map(t => (t.number === cloudOrder.tableNumber || String(t.number) === String(cloudOrder.tableNumber) || t.currentOrderId === cloudOrder.id) ? {
                ...t,
                currentOrderId: cloudOrder.id,
                status: (cloudOrder.status === 'delivered' || cloudOrder.status === 'finished' || cloudOrder.status === 'cancelled') ? t.status : 'occupied'
              } : t));
            }

            setOrders(prev => {
              const idx = prev.findIndex(o => o.id === cloudOrder.id || o.docId === cloudOrder.docId);
              if (idx !== -1) {
                const updatedList = [...prev];
                const existing = updatedList[idx];
                const merged: Order = { ...existing, ...cloudOrder };
                // Blindagem de Pagamento: se o pedido local já estava liquidado, manter dados de liquidação,
                // mas priorizar payments/paymentMethod vindos da nuvem quando o pedido foi editado/atualizado
                if (existing.isSettled || existing.paymentStatus === 'paid' || (existing.payments && existing.payments.length > 0)) {
                  merged.isSettled = true;
                  merged.paymentStatus = 'paid';
                  merged.paymentMethod = cloudOrder.paymentMethod || existing.paymentMethod;
                  merged.payments = (cloudOrder.payments && cloudOrder.payments.length > 0) ? cloudOrder.payments : existing.payments;
                  merged.paidAt = cloudOrder.paidAt || existing.paidAt;
                  merged.completedAt = cloudOrder.completedAt || existing.completedAt;
                }
                updatedList[idx] = merged;
                return updatedList;
              }
              return [cloudOrder, ...prev];
            });
          }
        } else if (change.type === 'removed') {
          setIncomingDigitalOrders(prev => prev.filter(o => o.id !== change.doc.id));
          setOrders(prev => prev.filter(o => o.id !== change.doc.id && o.docId !== change.doc.id));
          try {
            await localDb.orders.delete(change.doc.id);
          } catch (e) {
            console.warn("Local DB delete error:", e);
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [currentUserData?.tenantId, currentUserData?.role, viewingTenantId, adminSettings.autoAcceptOrders, globalDeliveryFee, currentProject, location.pathname, isSuperAdmin, tenantData?.id]);

  // Subscriber ao Domain Event Bus central para sincronização cross-tab instantânea
  useEffect(() => {
    const canonicalTenant = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const unsubscribeEvents = subscribeToDomainEvents((event) => {
      if (event.tenantId !== canonicalTenant) return;

      logDiagnostic('KDS_EVENT_RECEIVED', {
        event: event.event,
        tenant_id: event.tenantId,
        store_id: event.storeId,
        order_id: event.orderId,
        source: event.source
      });

      if (event.payload && (
        event.event === 'ORDER_CREATED' || 
        event.event === 'ORDER_SENT_TO_KITCHEN' || 
        event.event === 'ORDER_ITEM_ADDED' ||
        event.event === 'ORDER_UPDATED' || 
        event.event === 'ORDER_STATUS_CHANGED' || 
        event.event === 'KITCHEN_STATUS_CHANGED' ||
        event.event === 'TABLE_CLOSED'
      )) {
        const rawPayload = event.payload;
        const targetId = rawPayload.id || rawPayload.orderId || event.orderId;
        if (!targetId) return;

        setOrders(prev => {
          const existingIdx = prev.findIndex(o => o.id === targetId || o.docId === targetId);
          if (existingIdx !== -1) {
            const existing = prev[existingIdx];
            const merged: Order = {
              ...existing,
              ...rawPayload,
              id: existing.id,
              items: Array.isArray(rawPayload.items)
                ? rawPayload.items
                : (existing.items || [])
            };
            const updated = [...prev];
            updated[existingIdx] = merged;
            return updated;
          }

          // Se for novo pedido vindo do barramento de eventos
          if (rawPayload.items && Array.isArray(rawPayload.items)) {
            const newOrder: Order = {
              id: targetId,
              tenantId: event.tenantId,
              storeId: event.storeId,
              status: rawPayload.status || 'preparing',
              kitchenStatus: rawPayload.kitchenStatus || 'pending',
              type: rawPayload.type || (event.tableNumber ? 'table' : 'takeout'),
              tableNumber: rawPayload.tableNumber || event.tableNumber,
              items: rawPayload.items,
              total: rawPayload.total || 0,
              createdAt: rawPayload.createdAt ? new Date(rawPayload.createdAt) : new Date(),
              updatedAt: new Date(),
              source: rawPayload.source || event.source || 'pos',
              isManual: true,
              ...rawPayload
            };
            return deduplicateOrders([newOrder, ...prev]);
          }

          return prev;
        });
      }
    });

    return () => unsubscribeEvents();
  }, [currentUserData?.tenantId, viewingTenantId, tenantData?.id]);

  const [mockWhatsAppNotify, setMockWhatsAppNotify] = useState<{title: string, msg: string} | null>(null);

  const triggerWhatsAppMock = (title: string, msg: string) => {
    setMockWhatsAppNotify({ title, msg });
    setTimeout(() => setMockWhatsAppNotify(null), 5000);
  };

  const handleAddFinancialRecord = async (record: Partial<FinancialRecord>) => {
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    
    if (!record.amount || record.amount <= 0) {
      showToast("Por favor, informe um valor válido.", 'error');
      return;
    }

    // Prevenção estrita contra duplicidade por id único: se já existir, atualiza o registro existente in-place
    if (record.id) {
      const existingRec = financialRecords.find(r => r.id === record.id);
      if (existingRec) {
        if (
          Math.abs((existingRec.amount || 0) - record.amount) > 0.01 ||
          existingRec.paymentMethod !== record.paymentMethod ||
          existingRec.description !== record.description
        ) {
          await handleUpdateFinancialRecord(record.id, {
            amount: record.amount,
            paymentMethod: record.paymentMethod,
            description: record.description,
            orderId: record.orderId ?? existingRec.orderId
          });
        }
        return;
      }
    }

    // Calculo automático de taxas com base na forma de pagamento
    let feeAmount = record.feeAmount || 0;
    if (record.paymentMethod && record.type === 'income' && !record.feeAmount && adminSettings?.paymentMethods) {
       const normRecordMethod = normalizePaymentMethod(record.paymentMethod, adminSettings);
       const methodConfig = adminSettings.paymentMethods.find(m => 
          m.id === record.paymentMethod ||
          normalizePaymentMethod(m.type, adminSettings) === normRecordMethod ||
          normalizePaymentMethod(m.name, adminSettings) === normRecordMethod ||
          m.name.toLowerCase() === record.paymentMethod?.toLowerCase() || 
          m.type.toLowerCase() === record.paymentMethod?.toLowerCase()
       );
       
       if (methodConfig && methodConfig.feePercentage > 0) {
          feeAmount = (record.amount * methodConfig.feePercentage) / 100;
          if (methodConfig.fixedFee) feeAmount += methodConfig.fixedFee;
       }
    }

    const newRecord: FinancialRecord = {
      id: record.id || `fin-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      tenantId: effectiveTenantId || 'lojista',
      type: record.type || 'expense',
      amount: record.amount || 0,
      feeAmount,
      paymentMethod: record.paymentMethod || 'dinheiro',
      category: record.category || 'Outros',
      description: record.description || 'Lançamento manual',
      date: record.date || new Date(),
      status: record.status || 'paid',
      orderId: record.orderId,
      shiftOpenedAt: cashSession.isOpen ? (cashSession.openedAt || new Date()) : undefined
    };
    
    // Optimistic Update
    setFinancialRecords(prev => deduplicateFinancialRecords([newRecord, ...prev]));

    // Always persist in localDb for offline/quota resilience
    try {
      await localDb.financialRecords.put(newRecord);
    } catch (localErr) {
      console.warn("Local DB financial record save warning:", localErr);
    }

    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'financialRecords', newRecord.id), cleanObject({
          ...newRecord,
          createdAt: new Date()
        }));
        showToast(`Lançamento realizado: ${newRecord.description}`);
      } catch (err) {
        console.error("Error syncing financial record:", err);
        showToast("Lançamento salvo localmente.", 'info');
      }
    }
    
    addLog('u1', 'FINANCEIRO', `Novo lançamento: ${newRecord.description}`);
  };

  const handleUpdateFinancialRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    if (effectiveTenantId) {
      await setDoc(doc(db, 'financialRecords', id), {
        ...updates,
        updatedAt: new Date()
      }, { merge: true }).catch(e => console.warn("Cloud financial record update error:", e));
    }
    await localDb.financialRecords.update(id, updates).catch(e => console.warn("Local DB financial record update error:", e));
    setFinancialRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    addLog('u1', 'FINANCEIRO', `Registro financeiro atualizado: ${id}`);
  };

  const handleDeleteFinancialRecord = async (id: string) => {
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    if (effectiveTenantId) {
      await deleteDoc(doc(db, 'financialRecords', id));
    } else {
      await localDb.financialRecords.delete(id);
    }
    setFinancialRecords(prev => prev.filter(r => r.id !== id));
    addLog('u1', 'FINANCEIRO', `Registro financeiro excluído: ${id}`);
  };

  const handleClearSalesAndFinance = async () => {
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const isSameTenantRecord = (tId?: string) =>
      !effectiveTenantId || tId === effectiveTenantId || ((effectiveTenantId === 'lojista' || effectiveTenantId === 't1') && (tId === 'lojista' || tId === 't1'));

    // 1. Clear Local Database (IndexedDB) strictly for the current tenant
    const [allLocalOrders, allLocalFin, allLocalClosings, allLocalCounters] = await Promise.all([
      localDb.orders.toArray(),
      localDb.financialRecords.toArray(),
      localDb.cashClosings.toArray(),
      localDb.counterOrders.toArray()
    ]);

    const orderIdsToDel = allLocalOrders.filter(o => isSameTenantRecord(o.tenantId)).map(o => o.id);
    if (orderIdsToDel.length > 0) await localDb.orders.bulkDelete(orderIdsToDel);

    const finIdsToDel = allLocalFin.filter(f => isSameTenantRecord(f.tenantId)).map(f => f.id);
    if (finIdsToDel.length > 0) await localDb.financialRecords.bulkDelete(finIdsToDel);

    const closingIdsToDel = allLocalClosings.filter(c => isSameTenantRecord(c.tenantId)).map(c => c.id);
    if (closingIdsToDel.length > 0) await localDb.cashClosings.bulkDelete(closingIdsToDel);

    const counterIdsToDel = allLocalCounters.filter(c => isSameTenantRecord(c.tenantId)).map(c => c.id);
    if (counterIdsToDel.length > 0) await localDb.counterOrders.bulkDelete(counterIdsToDel);

    const localTables = await localDb.diningTables.toArray();
    for (const t of localTables) {
      if (isSameTenantRecord(t.tenantId)) {
        await localDb.diningTables.update(t.id, {
          status: 'available',
          items: [],
          total: 0,
          currentOrderId: null
        } as any);
      }
    }

    const s = await localDb.settings.get(effectiveTenantId || 'global');
    if (s) {
      await localDb.settings.put({
        ...s,
        cashSession: { isOpen: false, openingValue: 0, openedAt: null }
      });
    }

    // 2. Reset React State
    setOrders([]);
    setCounterOrders([]);
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

  const handleSendToKitchen = async (
    tableId: number | string, 
    items: OrderItem[], 
    isCounter?: boolean,
    customerData?: {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      deliveryFee?: number;
      customerId?: string;
      isDelivery?: boolean;
    }
  ) => {
    // Garantir rigorosamente o tenant canônico e a unidade para isolamento e tempo real
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const canonicalStoreId = getCanonicalStoreId(effectiveTenantId);
    
    // Encontrar o número da mesa/comanda ou balcão
    const tableInfo = isCounter 
      ? counterOrders.find(t => t.id === tableId || String(t.id) === String(tableId) || (t as any).docId === tableId || t.currentOrderId === String(tableId))
      : tables.find(t => t.id === tableId || (t as any).docId === tableId || t.number === tableId || String(t.id) === String(tableId) || Number(t.id) === Number(tableId) || t.currentOrderId === String(tableId));
    
    const displayTableNumber = tableInfo ? tableInfo.number : (typeof tableId === 'number' ? tableId : (/^\d+$/.test(String(tableId).trim()) ? Number(String(tableId).trim()) : tableId));
    const now = new Date();

    const effectiveCustomerName = (customerData?.customerName && customerData.customerName.trim()) || tableInfo?.customerName || undefined;
    const effectiveCustomerPhone = (customerData?.customerPhone && customerData.customerPhone.trim()) || tableInfo?.customerPhone || undefined;
    const effectiveCustomerAddress = (customerData?.customerAddress && customerData.customerAddress.trim()) || tableInfo?.customerAddress || undefined;
    const effectiveCustomerId = customerData?.customerId || tableInfo?.customerId || undefined;
    const effectiveDeliveryFee = customerData?.deliveryFee !== undefined ? customerData.deliveryFee : (tableInfo?.deliveryFee || 0);
    const effectiveIsDelivery = customerData?.isDelivery !== undefined ? customerData.isDelivery : (isCounter && !!tableInfo?.isDelivery);

    // =========================================================================
    // 0. LOCALIZAR PEDIDO ATIVO EXISTENTE (Mesa, Balcão, Delivery ou pdvEditOrder)
    // Se o pedido já estiver ativo na cozinha ou aberto na mesa/balcão,
    // atualizamos diretamente o pedido existente com os novos itens (marcando como ⚡ NOVO ITEM)
    // SEM criar nenhum pedido ou ticket duplicado!
    // =========================================================================
    let activeExistingOrder: Order | undefined = undefined;

    if (pdvEditOrder) {
      activeExistingOrder = orders.find(o => o.id === pdvEditOrder.id || o.docId === pdvEditOrder.id) || pdvEditOrder;
    } else {
      // Verificar primeiro se tableId já é o próprio ID de um pedido existente (mesmo que já esteja pago/quitado!)
      activeExistingOrder = orders.find(o =>
        (o.id === String(tableId) || o.docId === String(tableId)) &&
        o.status !== 'cancelled'
      );
    }

    if (!activeExistingOrder && tableInfo?.currentOrderId) {
      activeExistingOrder = orders.find(o =>
        (o.id === tableInfo.currentOrderId || o.docId === tableInfo.currentOrderId) &&
        o.status !== 'cancelled'
      );
    }

    if (!activeExistingOrder) {
      if (!isCounter) {
        // Para mesas: procurar pedido de mesa aberto correspondente (não quitado)
        activeExistingOrder = orders.find(o => 
          String(o.tableNumber) === String(displayTableNumber) && 
          (o.type === 'table' || !o.type) && 
          !o.isSettled &&
          o.paymentStatus !== 'paid' &&
          o.status !== 'cancelled' && 
          o.status !== 'finished'
        );
      } else {
        // Para balcão/delivery
        activeExistingOrder = orders.find(o => 
          (o.id === String(tableId) || o.docId === String(tableId) || String(o.counterId) === String(tableId) || (tableInfo && (String(o.counterId) === String(tableInfo.id) || o.id === tableInfo.currentOrderId))) &&
          o.status !== 'cancelled' && 
          o.status !== 'finished'
        );
      }
    }

    // Fallback por impressão digital de IDs de itens (garante 0% de chance de duplicar um pedido cujos itens já pertencem a um pedido ativo)
    if (!activeExistingOrder && items && items.length > 0) {
      const incomingItemIds = new Set(items.map(i => i.id).filter(id => id && !String(id).startsWith('item-edit-') && !String(id).startsWith('item-sync-')));
      if (incomingItemIds.size > 0) {
        activeExistingOrder = orders.find(o =>
          o &&
          o.status !== 'cancelled' &&
          !o.isSubTicket &&
          (o.items || []).some(oi => oi.id && incomingItemIds.has(oi.id))
        );
      }
    }

    if (activeExistingOrder) {
      const wasKitchenReady =
        activeExistingOrder.status === 'ready' ||
        activeExistingOrder.kitchenStatus === 'ready' ||
        activeExistingOrder.productionStatus === 'ready' ||
        activeExistingOrder.status === 'delivering' ||
        activeExistingOrder.status === 'delivered';

      const prevItems = (activeExistingOrder.items || []).filter(i => !i.cancelled);
      const maxExistingBatch = prevItems.reduce((max, i) => Math.max(max, i.batchNumber || 1), (activeExistingOrder as any)?.currentBatch || 1);
      const nextBatchNumber = maxExistingBatch + 1;
      let hasNewKitchenItems = false;

      // Construir a lista de itens atualizada separando quantidades adicionais em um novo lote (nextBatchNumber)
      // para que o KDS exiba um card exclusivo apenas com os itens adicionados!
      const usedPrevIndices = new Set<number>();
      const existingItems: OrderItem[] = [];

      items.filter(i => !i.cancelled).forEach((incomingItem, idx) => {
        const ensuredId = incomingItem.id || `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
        const matchIdx = prevItems.findIndex((prev, pIdx) => {
          if (usedPrevIndices.has(pIdx)) return false;
          if (prev.id && incomingItem.id && prev.id === incomingItem.id) return true;
          const prevOpts = (prev.selectedOptions || []).map(o => `${o.quantity || 1}x_${o.name}`).sort().join('|');
          const incOpts = (incomingItem.selectedOptions || []).map(o => `${o.quantity || 1}x_${o.name}`).sort().join('|');
          return prev.productId === incomingItem.productId &&
            prev.name === incomingItem.name &&
            (prev.observation || '') === (incomingItem.observation || '') &&
            (prev.batchNumber || 1) === (incomingItem.batchNumber || prev.batchNumber || 1) &&
            prevOpts === incOpts;
        });

        if (matchIdx !== -1) {
          usedPrevIndices.add(matchIdx);
          const prev = prevItems[matchIdx];
          const qtyIncreased = incomingItem.quantity > prev.quantity;
          const wasUnsent = !incomingItem.sentToKitchen && !prev.sentToKitchen;

          if (qtyIncreased && prev.sentToKitchen !== false) {
            // Mantém o item original no lote original e cria um novo item separado para a quantidade adicionada no novo lote
            existingItems.push({
              ...prev,
              ...incomingItem,
              id: prev.id || ensuredId,
              quantity: prev.quantity,
              sentToKitchen: true,
              isNew: prev.isNew ?? false,
              batchNumber: prev.batchNumber || 1,
              sentAt: prev.sentAt || now.toISOString(),
              kitchenDispatched: prev.kitchenDispatched || (prev.sentToKitchen ? wasKitchenReady : false)
            });
            const addedQty = incomingItem.quantity - prev.quantity;
            hasNewKitchenItems = true;
            existingItems.push({
              ...incomingItem,
              id: `item-${Date.now()}-${idx}-batch${nextBatchNumber}-${Math.random().toString(36).substr(2, 4)}`,
              quantity: addedQty,
              sentToKitchen: true,
              isNew: true,
              batchNumber: nextBatchNumber,
              sentAt: now.toISOString(),
              kitchenDispatched: false
            });
            return;
          }

          if (wasUnsent) {
            hasNewKitchenItems = true;
          }

          existingItems.push({
            ...prev,
            ...incomingItem,
            id: prev.id || ensuredId,
            sentToKitchen: true,
            isNew: wasUnsent ? true : (prev.isNew ?? false),
            batchNumber: wasUnsent ? nextBatchNumber : (prev.batchNumber || 1),
            sentAt: wasUnsent ? now.toISOString() : (prev.sentAt || now.toISOString()),
            kitchenDispatched: wasUnsent ? false : (prev.kitchenDispatched || (prev.sentToKitchen ? wasKitchenReady : false))
          });
          return;
        }

        hasNewKitchenItems = true;
        existingItems.push({
          ...incomingItem,
          id: ensuredId,
          sentToKitchen: true,
          isNew: true,
          batchNumber: nextBatchNumber,
          sentAt: now.toISOString(),
          kitchenDispatched: false
        });
      });

      const updatedDeliveryFee = effectiveDeliveryFee !== undefined ? effectiveDeliveryFee : (activeExistingOrder.deliveryFee || 0);
      const newItemsTotal = existingItems.filter(i => !i.cancelled).reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const finalOrderTotal = Math.max(0, newItemsTotal + updatedDeliveryFee + (activeExistingOrder.additionalFee || 0) - (activeExistingOrder.discount || 0));

      const updates: Partial<Order> = {
        tenantId: effectiveTenantId,
        storeId: canonicalStoreId,
        tableNumber: activeExistingOrder.tableNumber || (isCounter 
          ? (effectiveCustomerName ? `Balcão (${effectiveCustomerName})` : (tableInfo?.number ? `Balcão ${tableInfo.number}` : 'Balcão')) 
          : displayTableNumber),
        items: existingItems,
        total: finalOrderTotal,
        status: hasNewKitchenItems ? 'preparing' : activeExistingOrder.status,
        kitchenStatus: hasNewKitchenItems ? 'preparing' : (activeExistingOrder.kitchenStatus || 'preparing'),
        productionStatus: hasNewKitchenItems ? 'in_production' : (activeExistingOrder.productionStatus || 'in_production'),
        updatedAt: now,
        customerName: effectiveCustomerName || activeExistingOrder.customerName,
        customerPhone: effectiveCustomerPhone || activeExistingOrder.customerPhone,
        customerAddress: effectiveCustomerAddress || activeExistingOrder.customerAddress,
        customerId: effectiveCustomerId || activeExistingOrder.customerId,
        deliveryFee: updatedDeliveryFee,
        deliveryMethod: effectiveIsDelivery ? 'entrega' : (activeExistingOrder.deliveryMethod || (isCounter ? 'retirada' : undefined)),
        currentBatch: hasNewKitchenItems ? nextBatchNumber : ((activeExistingOrder as any)?.currentBatch || maxExistingBatch)
      };

      // Se o pedido já estava pago e teve seu valor alterado, adicionar apenas a diferença no pagamento (ou ajustar se reduzido) sem duplicar
      if ((activeExistingOrder.isSettled || activeExistingOrder.paymentStatus === 'paid') && Math.abs((activeExistingOrder.total || 0) - finalOrderTotal) > 0.01) {
        const payMethod = activeExistingOrder.paymentMethod || activeExistingOrder.payments?.[0]?.method || 'dinheiro';
        const prevPayments = (activeExistingOrder.payments && activeExistingOrder.payments.length > 0)
          ? activeExistingOrder.payments
          : [{ method: payMethod, amount: Number(activeExistingOrder.total) || 0, timestamp: activeExistingOrder.paidAt || activeExistingOrder.createdAt || now }];
        const prevPaidSum = prevPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const diffAmount = Number((finalOrderTotal - prevPaidSum).toFixed(2));

        if (diffAmount > 0.01) {
          updates.payments = [
            ...prevPayments.map((p, idx) => ({
              ...p,
              id: (p as any).id || `fin-${activeExistingOrder!.id}-${p.method}-${p.amount}-${idx}`,
              alreadyRecorded: true
            })),
            {
              id: `fin-${activeExistingOrder.id}-${payMethod}-${diffAmount}-${prevPayments.length}`,
              method: payMethod,
              amount: diffAmount,
              alreadyRecorded: true,
              timestamp: now
            } as any
          ];
          handleAddFinancialRecord({
            id: `fin-${activeExistingOrder.id}-${payMethod}-${diffAmount}-${prevPayments.length}`,
            type: 'income',
            amount: diffAmount,
            category: activeExistingOrder.type === 'delivery' ? 'Vendas Entrega' : (activeExistingOrder.type === 'takeout' ? 'Vendas Balcão' : 'Vendas Mesa'),
            description: `Adicional Pedido #${activeExistingOrder.dailyNumber || activeExistingOrder.id.slice(-4)} - Pagamento: ${payMethod}`,
            date: now,
            paymentMethod: payMethod as any,
            orderId: activeExistingOrder.id,
            status: 'paid'
          }).catch(() => {});
        } else {
          updates.payments = [{ method: payMethod, amount: finalOrderTotal, timestamp: now }];
          const matchingFin = financialRecords.filter(r => r.orderId === activeExistingOrder!.id || (activeExistingOrder!.docId && r.orderId === activeExistingOrder!.docId));
          if (matchingFin.length > 0) {
            handleUpdateFinancialRecord(matchingFin[0].id, { amount: finalOrderTotal, orderId: activeExistingOrder.id }).catch(() => {});
            for (let i = 1; i < matchingFin.length; i++) {
              handleDeleteFinancialRecord(matchingFin[i].id).catch(() => {});
            }
          }
        }
      }

      const updatedOrder = { ...activeExistingOrder, ...updates };

      // 1. Atualizar pedidos no React State instantaneamente
      setOrders(prev => prev.map(o => (o.id === activeExistingOrder!.id || o.docId === activeExistingOrder!.id || (activeExistingOrder!.docId && o.id === activeExistingOrder!.docId)) ? { ...o, ...updates } : o));

      // 2. Se for mesa, manter mesa sincronizada
      if (!isCounter || activeExistingOrder.type === 'table') {
        setTables(prev => prev.map(t => (t.id === tableId || t.number === displayTableNumber || t.currentOrderId === activeExistingOrder!.id) ? {
          ...t,
          items: existingItems,
          total: newItemsTotal,
          currentOrderId: activeExistingOrder!.id,
          customerName: effectiveCustomerName || t.customerName,
          customerPhone: effectiveCustomerPhone || t.customerPhone
        } : t));

        // Atualizar diningTables no Firestore
        const tableDocId = (tableInfo as any)?.docId;
        if (tableDocId) {
          setDoc(doc(db, 'diningTables', tableDocId), cleanObject({
            items: existingItems,
            total: newItemsTotal,
            currentOrderId: activeExistingOrder.id,
            status: 'occupied',
            customerName: effectiveCustomerName,
            customerPhone: effectiveCustomerPhone,
            updatedAt: now
          }), { merge: true }).catch(e => console.warn("Erro ao atualizar mesa no Firestore:", e));
        }
      } else {
        setCounterOrders(prev => {
          const updatedList = prev.map(t => (
            t.id === tableId ||
            String(t.id) === String(tableId) ||
            t.currentOrderId === activeExistingOrder!.id ||
            (activeExistingOrder!.docId && t.currentOrderId === activeExistingOrder!.docId) ||
            (activeExistingOrder!.counterId !== undefined && String(t.id) === String(activeExistingOrder!.counterId))
          ) ? {
            ...t,
            items: existingItems,
            total: newItemsTotal,
            currentOrderId: activeExistingOrder!.id,
            customerName: effectiveCustomerName || t.customerName,
            customerPhone: effectiveCustomerPhone || t.customerPhone,
            customerAddress: effectiveCustomerAddress || t.customerAddress,
            customerId: effectiveCustomerId || t.customerId,
            deliveryFee: updatedDeliveryFee,
            isDelivery: effectiveIsDelivery
          } : t);
          // Deduplicar comandas que apontem para o mesmo currentOrderId
          const seenOrderIds = new Set<string>();
          return updatedList.filter(t => {
            if (!t.currentOrderId) return true;
            if (seenOrderIds.has(t.currentOrderId)) return false;
            seenOrderIds.add(t.currentOrderId);
            return true;
          });
        });
      }

      // 3. Persistência local e na nuvem
      localDb.orders.put(updatedOrder as Order).catch(e => console.warn("LocalDb order update error:", e));
      if (effectiveTenantId) {
        setDoc(doc(db, 'orders', activeExistingOrder.docId || activeExistingOrder.id), cleanObject(updates), { merge: true })
          .then(() => {
            logDiagnostic('ORDER_PERSISTED', {
              tenant_id: effectiveTenantId,
              store_id: canonicalStoreId,
              order_id: activeExistingOrder!.id,
              status: updates.status,
              kitchen_status: updates.kitchenStatus,
              items_count: existingItems.length,
              timestamp: now.toISOString()
            });
          })
          .catch(e => console.error("Error updating order in cloud:", e));
      }

      // Disparar evento de novos itens adicionados ao pedido existente
      publishDomainEvent('ORDER_ITEM_ADDED', {
        tenantId: effectiveTenantId,
        storeId: canonicalStoreId,
        orderId: activeExistingOrder.id,
        tableNumber: displayTableNumber,
        userId: currentUserData?.id || user?.uid,
        userName: currentUserData?.name,
        userRole: currentUserData?.role,
        source: 'pos',
        payload: updatedOrder
      });

      addLog('u1', 'COZINHA', `Pedido #${activeExistingOrder.dailyNumber || activeExistingOrder.id.slice(-4)} atualizado com novos itens na cozinha.`);
      return;
    }

    // Criar pedido KDS inicial se não houver nenhum pedido ativo
    const rawKitchenOrder: Order = {
      id: `KDS-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      tableNumber: isCounter 
        ? (effectiveCustomerName ? `Balcão (${effectiveCustomerName})` : (tableInfo?.number ? `Balcão ${tableInfo.number}` : 'Balcão')) 
        : displayTableNumber,
      type: isCounter ? (effectiveIsDelivery ? 'delivery' : 'takeout') : 'table',
      deliveryMethod: effectiveIsDelivery ? 'entrega' : (isCounter ? 'retirada' : undefined),
      customerName: effectiveCustomerName,
      customerPhone: effectiveCustomerPhone,
      customerAddress: effectiveCustomerAddress,
      deliveryFee: effectiveDeliveryFee,
      customerId: effectiveCustomerId,
      counterId: isCounter ? (tableInfo?.id || tableId) : undefined,
      status: 'preparing',
      kitchenStatus: 'pending',
      productionStatus: 'pending',
      paymentStatus: 'pending',
      currentBatch: 1,
      items: items.map((i, idx) => ({
        ...i,
        id: i.id || `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        sentToKitchen: true,
        isNew: false,
        batchNumber: 1,
        kitchenDispatched: false,
        sentAt: now.toISOString()
      })),
      total: items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (effectiveDeliveryFee || 0),
      createdAt: now,
      updatedAt: now,
      tenantId: effectiveTenantId,
      storeId: canonicalStoreId,
      version: 1,
      isManual: true,
      source: 'pos',
      isSettled: false
    };
    const kitchenOrder = assignDailyNumberToOrder(rawKitchenOrder);

    logDiagnostic('ORDER_CREATED', {
      tenant_id: effectiveTenantId,
      store_id: canonicalStoreId,
      order_id: kitchenOrder.id,
      table_number: kitchenOrder.tableNumber,
      type: kitchenOrder.type,
      status: kitchenOrder.status,
      kitchen_status: kitchenOrder.kitchenStatus,
      items_count: kitchenOrder.items.length,
      total: kitchenOrder.total,
      timestamp: now.toISOString()
    });

    // 1. Instant optimistic state updates
    if (isCounter) {
      setCounterOrders(prev => {
        const targetCounterId = tableInfo?.id || tableId;
        const exists = prev.some(t => t.id === targetCounterId || String(t.id) === String(targetCounterId));
        const updatedTableObj: Table = {
          id: targetCounterId,
          number: tableInfo?.number || (typeof targetCounterId === 'number' ? targetCounterId : prev.length + 1),
          status: 'occupied',
          currentOrderId: kitchenOrder.id,
          customerName: effectiveCustomerName,
          customerPhone: effectiveCustomerPhone,
          customerAddress: effectiveCustomerAddress,
          customerId: effectiveCustomerId,
          deliveryFee: effectiveDeliveryFee,
          isDelivery: effectiveIsDelivery,
          items: kitchenOrder.items,
          total: kitchenOrder.total,
          tenantId: effectiveTenantId
        };
        if (exists) {
          return prev.map(t => (t.id === targetCounterId || String(t.id) === String(targetCounterId)) ? { ...t, ...updatedTableObj } : t);
        }
        return [...prev, updatedTableObj];
      });
    } else {
      setTables(prev => prev.map(t => (t.id === tableId || (t as any).docId === tableId || t.number === displayTableNumber) ? { 
        ...t, 
        currentOrderId: kitchenOrder.id,
        status: 'occupied',
        items: kitchenOrder.items,
        total: kitchenOrder.total,
        customerName: effectiveCustomerName || t.customerName,
        customerPhone: effectiveCustomerPhone || t.customerPhone
      } : t));

      // Sincronizar diningTables no Firestore para outros terminais (Garçom, Salão, Admin)
      const tableDocId = (tableInfo as any)?.docId;
      if (tableDocId) {
        setDoc(doc(db, 'diningTables', tableDocId), cleanObject({
          currentOrderId: kitchenOrder.id,
          status: 'occupied',
          items: kitchenOrder.items,
          total: kitchenOrder.total,
          customerName: effectiveCustomerName,
          customerPhone: effectiveCustomerPhone,
          updatedAt: now
        }), { merge: true }).catch(e => console.warn("Erro ao vincular mesa ao pedido no Firestore:", e));
      } else {
        const qTable = query(
          collection(db, 'diningTables'),
          where('tenantId', '==', effectiveTenantId),
          where('number', '==', Number(displayTableNumber) || 0)
        );
        getDocs(qTable).then(snap => {
          if (!snap.empty) {
            snap.docs.forEach(d => {
              setDoc(d.ref, cleanObject({
                currentOrderId: kitchenOrder.id,
                status: 'occupied',
                items: kitchenOrder.items,
                total: kitchenOrder.total,
                customerName: effectiveCustomerName,
                customerPhone: effectiveCustomerPhone,
                updatedAt: now
              }), { merge: true });
            });
          }
        }).catch(e => console.warn("Erro ao buscar mesa para vincular docId:", e));
      }
    }

    setOrders(prev => deduplicateOrders([kitchenOrder, ...prev]));

    // 2. Local persistence and non-blocking cloud sync
    localDb.orders.put(kitchenOrder).catch(e => console.warn("LocalDb order put error:", e));
    if (effectiveTenantId) {
      setDoc(doc(db, 'orders', kitchenOrder.id), cleanObject({
        ...kitchenOrder,
        createdAt: now,
        updatedAt: now
      })).then(() => {
        logDiagnostic('ORDER_PERSISTED', {
          tenant_id: effectiveTenantId,
          store_id: canonicalStoreId,
          order_id: kitchenOrder.id,
          status: kitchenOrder.status,
          kitchen_status: kitchenOrder.kitchenStatus,
          timestamp: now.toISOString()
        });
      }).catch(err => console.error("Error creating KDS order in Firestore:", err));
    }

    // 3. Disparar Evento de Domínio central para KDS e terminais autorizados
    publishDomainEvent('ORDER_CREATED', {
      tenantId: effectiveTenantId,
      storeId: canonicalStoreId,
      orderId: kitchenOrder.id,
      tableNumber: displayTableNumber,
      userId: currentUserData?.id || user?.uid,
      userName: currentUserData?.name,
      userRole: currentUserData?.role,
      source: 'pos',
      payload: kitchenOrder
    });

    addLog('u1', 'COZINHA', `Pedido enviado para cozinha: ${isCounter ? `Balcão (${effectiveCustomerName || 'Identificado'})` : `Mesa ${displayTableNumber}`}`);
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
    const order = orders.find(o => o.id === id || o.docId === id);
    if (!order) return;

    // Se o status já é o mesmo e o kitchenStatus já está sincronizado, nada a fazer
    if (order.status === status && (order.kitchenStatus === status || (!order.kitchenStatus && status === 'ready'))) return;

    // Permitir restauração de pedidos cancelados (para pending ou preparing)
    // Para pedidos finalizados/entregues, apenas bloquear alterações acidentais a menos que seja cancelamento ou restauração explícita
    if ((order.status === 'delivered' || order.status === 'finished') && status !== 'cancelled' && status !== 'preparing' && status !== 'ready') {
      console.warn(`Attempted to modify a completed order ${id} (${order.status}). State preserved.`);
      return;
    }

    // Transição permitida para qualquer status em pedidos não-terminais (ex: retornar pedido 'ready' ou 'delivering' para a cozinha 'preparing')

    const now = new Date();
    const updates: Partial<Order> & { kitchen_status?: string } = { 
      status, 
      updatedAt: now 
    };

    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || 'default-tenant';

    const isTableOrder =
      order.type === 'table' ||
      order.type === 'dine_in' ||
      (!order.type && order.tableNumber !== undefined && !String(order.tableNumber).toLowerCase().includes('balcão'));
    const hasExplicitPayment = Boolean(order.paymentMethod || (order.payments && order.payments.length > 0));
    const isAlreadyPaid = Boolean(order.isSettled || order.paymentStatus === 'paid' || order.paymentStatus === 'completed');
    // Pedidos de mesa (ou comandas de PDV ainda sem forma de pagamento definida) só devem ser baixados financeiramente no fechamento da mesa/conta (handleCloseTable)
    const canSettleOnStatusFinal = !isTableOrder && (isAlreadyPaid || hasExplicitPayment);

    // Add specific timestamps and synchronized kitchenStatus for lifecycle tracking
    if (status === 'preparing') {
      updates.acceptedAt = now;
      updates.kitchenStatus = 'preparing';
      updates.kitchen_status = 'preparing';
      updates.productionStatus = 'in_production';
    } else if (status === 'ready') {
      updates.readyAt = now;
      updates.kitchenStatus = 'ready';
      updates.kitchen_status = 'ready';
      updates.productionStatus = 'ready';
      updates.items = (order.items || []).map(item => ({
        ...item,
        kitchenDispatched: true,
        isNew: false
      }));
    } else if (status === 'delivering') {
      updates.dispatchedAt = now;
      updates.kitchenStatus = 'ready';
      updates.kitchen_status = 'ready';
      updates.items = (order.items || []).map(item => ({
        ...item,
        kitchenDispatched: true,
        isNew: false
      }));
    } else if (status === 'delivered' || status === 'finished') {
      updates.deliveredAt = now;
      updates.completedAt = order.completedAt || now;
      updates.finishedAt = order.finishedAt || now;
      if (canSettleOnStatusFinal) {
        updates.paidAt = order.paidAt || now;
        updates.paymentStatus = 'paid';
        if (status === 'finished') {
          updates.isSettled = true;
        }
        if (cashSession?.isOpen && cashSession.openedAt) {
          (updates as any).shiftOpenedAt = cashSession.openedAt;
        }
      }
      updates.kitchenStatus = 'delivered';
      updates.kitchen_status = 'delivered';
      updates.productionStatus = 'delivered';
      updates.items = (order.items || []).map(item => ({
        ...item,
        kitchenDispatched: true,
        isNew: false
      }));
    } else if (status === 'pending') {
      updates.kitchenStatus = 'pending';
      updates.kitchen_status = 'pending';
      updates.productionStatus = 'pending';
    } else if (status === 'cancelled') {
      updates.kitchenStatus = 'cancelled';
      updates.kitchen_status = 'cancelled';
      updates.productionStatus = 'cancelled';
      updates.isSettled = false;
      updates.paymentStatus = 'pending';
      (updates as any).cancelledAt = now;
    }

    // 1. Instant optimistic state update (0ms latency for UI response)
    setOrders(prev => prev.map(o => (o.id === id || o.docId === id || o.id === order.id) ? { ...o, ...updates } as Order : o));

    if (status === 'cancelled') {
      // Remover de comandas de balcão ativas
      setCounterOrders(prev => prev.filter(c =>
        c.id !== order.id &&
        String(c.id) !== String(order.id) &&
        String(c.id) !== String((order as any).counterId) &&
        c.currentOrderId !== order.id &&
        c.currentOrderId !== order.docId
      ));

      // Liberar mesa vinculada se for pedido de mesa ativo
      const linkedTable = tables.find(t =>
        t.currentOrderId === order.id ||
        (order.docId && t.currentOrderId === order.docId) ||
        (order.type === 'table' && order.tableNumber !== undefined && String(t.number) === String(order.tableNumber) && !order.isSettled)
      );
      if (linkedTable) {
        const numericTblId = typeof linkedTable.id === 'string' ? Number(linkedTable.id.replace(/\D/g, '')) : linkedTable.id;
        setTables(prev => prev.map(t => t.id === linkedTable.id ? {
          ...t,
          items: [],
          status: 'available',
          total: 0,
          currentOrderId: undefined,
          partialPayments: []
        } : t));
        if (!isNaN(numericTblId)) {
          localDb.diningTables.update(numericTblId, { items: [], status: 'available', total: 0, currentOrderId: undefined } as any).catch(() => {});
        }
        if (effectiveTenantId) {
          const tblDocId = (linkedTable as any).docId;
          if (tblDocId) {
            updateDoc(doc(db, 'diningTables', tblDocId), { items: [], status: 'available', total: 0, currentOrderId: null, partialPayments: [], updatedAt: now }).catch(() => {});
          } else if (!isNaN(numericTblId)) {
            getDocs(query(collection(db, 'diningTables'), where('id', '==', numericTblId), where('tenantId', '==', effectiveTenantId)))
              .then(snap => {
                if (!snap.empty) {
                  updateDoc(snap.docs[0].ref, { items: [], status: 'available', total: 0, currentOrderId: null, partialPayments: [], updatedAt: now }).catch(() => {});
                }
              })
              .catch(() => {});
          }
        }
      }
      showToast(`Pedido #${order.dailyNumber || (order.id || '').slice(-4)} cancelado com sucesso!`, 'info');
    } else if (updates.items) {
      setTables(prev => prev.map(t => (t.currentOrderId === order.id || (order.type === 'table' && String(t.number) === String(order.tableNumber))) ? {
        ...t,
        items: t.items.map(ti => {
          const matched = updates.items!.find(oi => Boolean(oi.id && ti.id && oi.id === ti.id) || (oi.productId === ti.productId && oi.name === ti.name));
          return matched ? { ...ti, kitchenDispatched: true, isNew: false } : ti;
        })
      } : t));
    }

    if (status === 'ready') {
      showToast(`Pedido #${(order.id || '').slice(-4)} marcado como Pronto!`, 'success');
    }

    // 2. Persist to local IndexedDB immediately
    localDb.orders.update(order.id, updates).catch(e => console.warn("LocalDb order update error:", e));

    publishDomainEvent('ORDER_STATUS_CHANGED', {
      tenantId: effectiveTenantId,
      orderId: order.id,
      tableNumber: order.tableNumber,
      source: 'kds',
      payload: { status, kitchenStatus: updates.kitchenStatus }
    });

    // 3. Side effects and cloud sync asynchronously in background
    (async () => {
      // Ciclo Final apenas para pedidos que NÃO são de mesa e que já possuem forma de pagamento definida
      // (Pedidos de mesa só dão baixa financeira quando a mesa é efetivamente fechada em handleCloseTable)
      if ((status === 'finished' || status === 'delivered') && !isTableOrder && hasExplicitPayment) {
        const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
        const alreadyHasRecords = financialRecords.some(r => r.orderId && (r.orderId === order.id || (order.docId && r.orderId === order.docId)));
        if (effectiveTenantId && !order.isSettled && !alreadyHasRecords) {
          try {
            // Registrar Receita
            let recordCategory = 'Vendas Entrega';
            const shortOrdNum = order.dailyNumber ? String(order.dailyNumber) : order.id.slice(-4);
            let recordDesc = `Pedido #${shortOrdNum} (${order.type.toUpperCase()}) - Finalizado`;
            
            if (order.source === 'marketplace' || order.source === 'iFood') {
              recordCategory = 'Vendas Marketplace';
              recordDesc = `Pedido #${shortOrdNum} (Marketplace) - Finalizado`;
            } else if (order.source === 'whatsapp' || order.source === 'partner_app' || (order.source as string) === 'digital_menu') {
              recordCategory = 'Vendas Cardápio Digital';
              recordDesc = `Pedido #${shortOrdNum} (Cardápio Digital) - Finalizado`;
            } else {
              recordCategory = order.type === 'delivery' ? 'Vendas Entrega' : 'Vendas Balcão';
              recordDesc = `Pedido #${shortOrdNum} (${order.type === 'delivery' ? 'DELIVERY' : 'BALCÃO'}) - Finalizado`;
            }

            if (order.payments && order.payments.length > 0) {
              for (let i = 0; i < order.payments.length; i++) {
                const p = order.payments[i];
                const pAmount = Number(p.amount) || 0;
                if (pAmount > 0 && !(p as any).alreadyRecorded) {
                  await handleAddFinancialRecord({
                    id: (p as any).id || `fin-${order.id}-${p.method}-${pAmount}-${i}`,
                    type: 'income',
                    amount: pAmount,
                    category: recordCategory,
                    description: `${recordDesc} (${i + 1}/${order.payments.length}) - Pagamento: ${p.method}`,
                    date: new Date(),
                    paymentMethod: p.method as any,
                    orderId: order.id
                  });
                }
              }
            } else if (order.paymentMethod) {
              await handleAddFinancialRecord({
                id: `fin-${order.id}-${order.paymentMethod}-${order.total}`,
                type: 'income',
                amount: order.total,
                category: recordCategory,
                description: `${recordDesc} - Pagamento: ${order.paymentMethod}`,
                date: new Date(),
                paymentMethod: order.paymentMethod,
                orderId: order.id
              });
            }

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

            if (status === 'finished') {
              updates.isSettled = true;
            }
          } catch (e) {
            console.error("Erro ao processar ciclo final do pedido:", e);
          }
        }
      }

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
          
          // Se pagou em dinheiro (total ou parcial), acumula apenas a parte em dinheiro no cashHeld do motoboy
          const cashAmountForCourier = (order.payments && order.payments.length > 0)
            ? order.payments
                .filter(p => normalizePaymentMethod(p.method, adminSettings) === 'dinheiro')
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
            : (normalizePaymentMethod(order.paymentMethod || 'dinheiro', adminSettings) === 'dinheiro' ? (order.total || 0) : 0);

          if (cashAmountForCourier > 0) {
            courierUpdates.cashHeld = (courier.cashHeld || 0) + cashAmountForCourier;
          }

          // Só libera se não tiver mais NENHUM pedido em rota
          const otherActiveOrders = orders.filter(o => o.id !== id && o.courierId === courier.id && o.status === 'delivering');
          if (otherActiveOrders.length === 0) {
            courierUpdates.status = 'available';
          }

          setCouriers(prev => prev.map(c => c.id === courier.id ? { ...c, ...courierUpdates } : c));
          await localDb.couriers.update(courier.id, courierUpdates).catch(e => console.warn("LocalDb courier update error:", e));

          if (effectiveTenantId) {
            await setDoc(doc(db, 'couriers', courier.id), courierUpdates, { merge: true }).catch(e => console.error("Error updating courier in cloud:", e));
          }
        }
      }

      // Se o pedido foi cancelado, estornar lançamentos financeiros e saldo Fiado se existirem
      if (status === 'cancelled') {
        const shortId = order.dailyNumber ? String(order.dailyNumber) : order.id.slice(-4);
        const exactShortIdRegex = new RegExp(`Pedido #${shortId}(?:\\b|\\s|-|\\)|$)`, 'i');
        const recordsToRemove = financialRecords.filter(r =>
          r.orderId === order.id ||
          (order.docId && r.orderId === order.docId) ||
          (!r.orderId && r.description && exactShortIdRegex.test(r.description))
        );
        for (const rec of recordsToRemove) {
          await handleDeleteFinancialRecord(rec.id).catch(e => console.warn("Erro ao remover lançamento de pedido cancelado:", e));
        }

        // Estornar Fiado se aplicável
        const isFiado = order.paymentMethod === 'conta_cliente' || order.paymentMethod === 'fiado' ||
          (order.payments && order.payments.some(p => p.method === 'conta_cliente' || (p.method as string) === 'fiado'));
        if (isFiado && order.customerId) {
          const customer = customers.find(c => c.id === order.customerId);
          if (customer) {
            const fiadoAmount = (order.payments && order.payments.length > 0)
              ? order.payments.filter(p => p.method === 'conta_cliente' || (p.method as string) === 'fiado').reduce((s, p) => s + (Number(p.amount) || 0), 0)
              : (order.total || 0);
            if (fiadoAmount > 0) {
              const transaction: CustomerTransaction = {
                id: `tr-canc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: 'credit',
                amount: fiadoAmount,
                description: `Estorno por Cancelamento - Pedido #${shortId}`,
                date: new Date()
              };
              await handleUpdateCustomer(order.customerId, {
                balance: Math.max(0, (customer.balance || 0) - fiadoAmount),
                history: [transaction, ...(customer.history || [])]
              });
            }
          }
        }
      }

      // Sync status to cloud if we are in a tenant context
      if (effectiveTenantId) {
        try {
          const targetDocId = order.docId || order.id || id;
          await setDoc(doc(db, 'orders', targetDocId), cleanObject({
            ...updates,
            ...(status === 'delivered' || status === 'finished' ? { completedAt: now } : {})
          }), { merge: true });
        } catch (e) {
          console.error(`Error syncing status check for cloud order ${id}:`, e);
        }
      }
    })();

    addLog('u1', 'PEDIDO', `Pedido ${id} alterado para ${status}`);
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
    // Abrir estritamente o pedido em que foi clicado através de seu ID exato
    const exactOrder = orders.find(o => o.id === order.id || o.docId === order.id) || order;
    setReturnToTab(activeTab);
    setPdvEditOrder({ ...exactOrder });
    setActiveTab('tables');
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    
    // Obter versão anterior do pedido para calcular diferenças de valor ou método de pagamento (Fiado)
    const oldOrder = orders.find(o => o.id === id || o.docId === id);
    const targetId = oldOrder?.id || id;
    const targetDocId = oldOrder?.docId || oldOrder?.id || id;

    // Se a atualização estiver cancelando o pedido ou removendo todos os itens, executar fluxo completo de cancelamento
    if (updates.status === 'cancelled' || (updates.items !== undefined && updates.items.filter(it => !it.cancelled).length === 0)) {
      await handleUpdateOrderStatus(targetId, 'cancelled');
      return;
    }

    if (updates.items) {
      const cleanItems = updates.items.filter(it => !it.cancelled);
      const prevItems = (oldOrder?.items || []).filter(it => !it.cancelled);
      const maxExistingBatch = prevItems.reduce((max, i) => Math.max(max, i.batchNumber || 1), (oldOrder as any)?.currentBatch || 1);
      const nextBatch = maxExistingBatch + 1;
      let addedNewBatch = false;

      updates.items = cleanItems.map(it => {
        if (!it.sentToKitchen) {
          addedNewBatch = true;
          return {
            ...it,
            sentToKitchen: true,
            isNew: true,
            batchNumber: it.batchNumber || nextBatch,
            kitchenDispatched: false,
            sentAt: it.sentAt || new Date().toISOString()
          };
        }
        if (it.isNew && !it.kitchenDispatched && (it.batchNumber || 1) > maxExistingBatch) {
          addedNewBatch = true;
        }
        return it;
      });

      if (addedNewBatch) {
        updates.status = 'preparing';
        updates.kitchenStatus = 'preparing';
        updates.productionStatus = 'in_production';
        (updates as any).currentBatch = nextBatch;
      }
    }
    
    updates.updatedAt = new Date();

    // Se a forma de pagamento mudou ou total mudou, atualizar também o array 'payments' do pedido se ele existir,
    // para que relatórios e o fechamento de caixa (que leem o.payments) reflitam a nova forma de pagamento e o novo valor sem duplicar
    if (updates.paymentMethod || updates.total !== undefined) {
      const newTotal = updates.total !== undefined ? updates.total : (oldOrder?.total || 0);
      if (!updates.payments && oldOrder?.payments && oldOrder.payments.length > 0) {
        const oldPaidSum = oldOrder.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const diffAmount = Number((newTotal - oldPaidSum).toFixed(2));
        const targetMethod = updates.paymentMethod || oldOrder.payments[oldOrder.payments.length - 1].method || oldOrder.paymentMethod || 'dinheiro';

        if (diffAmount > 0.01) {
          updates.payments = [
            ...oldOrder.payments.map((p, idx) => ({
              ...p,
              id: (p as any).id || `fin-${targetId}-${p.method}-${p.amount}-${idx}`,
              alreadyRecorded: true
            })),
            {
              id: `fin-${targetId}-${targetMethod}-${diffAmount}-${oldOrder.payments.length}`,
              method: targetMethod,
              amount: diffAmount,
              alreadyRecorded: true,
              timestamp: new Date()
            } as any
          ];
        } else {
          const uniqueOldMethods = Array.from(new Set(oldOrder.payments.map(p => p.method)));
          if (oldOrder.payments.length === 1 || uniqueOldMethods.length === 1 || updates.paymentMethod) {
            updates.payments = [{
              method: targetMethod,
              amount: newTotal,
              timestamp: oldOrder.payments[0].timestamp || new Date()
            }];
          }
        }
      }
    }

    try {
      await localDb.orders.update(targetId, cleanObject(updates));
    } catch (e) {
      if (oldOrder) {
        await localDb.orders.put({ ...oldOrder, ...updates });
      }
    }

    setOrders(prev => prev.map(o => (o.id === targetId || o.docId === targetDocId || o.id === targetDocId || (o.docId && o.docId === targetId)) ? { ...o, ...updates } : o));
    
    // Sincronizar mesa e diningTables no Firestore se for um pedido de mesa
    if (updates.items) {
      const itemsSubtotal = updates.items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
      if (oldOrder?.tableNumber || oldOrder?.type === 'table') {
        const matchedTable = tables.find(t => String(t.number) === String(oldOrder?.tableNumber) || t.currentOrderId === targetId || t.currentOrderId === targetDocId);
        setTables(prev => prev.map(t => (String(t.number) === String(oldOrder?.tableNumber) || t.currentOrderId === targetId || t.currentOrderId === targetDocId) ? {
          ...t,
          items: updates.items || t.items,
          total: itemsSubtotal
        } : t));
        if (matchedTable) {
          const numTblId = typeof matchedTable.id === 'string' ? Number(matchedTable.id.replace(/\D/g, '')) : matchedTable.id;
          if (!isNaN(numTblId)) {
            localDb.diningTables.update(numTblId, { items: updates.items, total: itemsSubtotal } as any).catch(() => {});
          }
          if (effectiveTenantId && (matchedTable as any).docId) {
            setDoc(doc(db, 'diningTables', (matchedTable as any).docId), cleanObject({
              items: updates.items,
              total: itemsSubtotal,
              updatedAt: new Date()
            }), { merge: true }).catch(() => {});
          }
        }
      }
      // Sincronizar comanda de balcão se aplicável
      setCounterOrders(prev => prev.map(c => (c.currentOrderId === targetId || c.currentOrderId === targetDocId || String(c.id) === String(targetId) || String(c.id) === String((oldOrder as any)?.counterId)) ? {
        ...c,
        items: updates.items || c.items,
        total: itemsSubtotal
      } : c));
    }

    if (effectiveTenantId) {
      try {
        await setDoc(doc(db, 'orders', targetDocId), cleanObject({ ...updates, updatedAt: new Date() }), { merge: true });
      } catch (e) {
        console.error(`Error syncing order update ${id}:`, e);
      }
    }
    
    // Sincronizar alteração no saldo de Fiado do cliente se houver mudança de valor ou método de pagamento
    if (oldOrder) {
      const oldMethod = oldOrder.paymentMethod;
      const newMethod = updates.paymentMethod || oldMethod;
      const isOldFiado = oldMethod === 'conta_cliente' || oldMethod === 'fiado';
      const isNewFiado = newMethod === 'conta_cliente' || newMethod === 'fiado';

      const oldTotal = oldOrder.total || 0;
      const newTotal = updates.total !== undefined ? updates.total : oldTotal;

      const oldCustomerId = oldOrder.customerId;
      const newCustomerId = updates.customerId !== undefined ? updates.customerId : oldCustomerId;

      // Caso 1: Era fiado e continua fiado
      if (isOldFiado && isNewFiado && newCustomerId) {
        const diff = newTotal - oldTotal;
        if (Math.abs(diff) > 0.001) {
          const customer = customers.find(c => c.id === newCustomerId);
          if (customer) {
            const shortId = (oldOrder.dailyNumber ? String(oldOrder.dailyNumber) : id.slice(-4));
            const transaction: CustomerTransaction = {
              id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              type: diff > 0 ? 'debit' : 'credit',
              amount: Math.abs(diff),
              description: `Ajuste Pedido #${shortId} (${diff > 0 ? 'Acréscimo/Delivery' : 'Redução/Desconto'})`,
              date: new Date()
            };
            await handleUpdateCustomer(newCustomerId, {
              balance: (customer.balance || 0) + diff,
              history: [transaction, ...(customer.history || [])]
            });
          }
        }
      }
      // Caso 2: Não era fiado e passou a ser fiado
      else if (!isOldFiado && isNewFiado && newCustomerId) {
        const customer = customers.find(c => c.id === newCustomerId);
        if (customer) {
          const shortId = (oldOrder.dailyNumber ? String(oldOrder.dailyNumber) : id.slice(-4));
          const transaction: CustomerTransaction = {
            id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'debit',
            amount: newTotal,
            description: `Lançamento Fiado - Pedido #${shortId}`,
            date: new Date()
          };
          await handleUpdateCustomer(newCustomerId, {
            balance: (customer.balance || 0) + newTotal,
            history: [transaction, ...(customer.history || [])]
          });
        }
      }
      // Caso 3: Era fiado e alterou para outro método de pagamento
      else if (isOldFiado && !isNewFiado && oldCustomerId) {
        const customer = customers.find(c => c.id === oldCustomerId);
        if (customer) {
          const shortId = (oldOrder.dailyNumber ? String(oldOrder.dailyNumber) : id.slice(-4));
          const transaction: CustomerTransaction = {
            id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'credit',
            amount: oldTotal,
            description: `Estorno de Fiado - Pedido #${shortId} alterado para ${newMethod || 'outro'}`,
            date: new Date()
          };
          await handleUpdateCustomer(oldCustomerId, {
            balance: Math.max(0, (customer.balance || 0) - oldTotal),
            history: [transaction, ...(customer.history || [])]
          });
        }
      }
    }

    // Se forma de pagamento, pagamentos divididos ou total foi alterado, sincronizar com os lançamentos financeiros correspondentes
    if (updates.payments || updates.paymentMethod || updates.total !== undefined || updates.isSettled) {
      const order = oldOrder || orders.find(o => o.id === id || o.docId === id);
      const targetId = order?.id || id;
      const targetDocId = order?.docId;
      const shortId = (order?.dailyNumber ? String(order.dailyNumber) : targetId.slice(-4));
      const exactShortIdRegex = new RegExp(`Pedido #${shortId}(?:\\b|\\s|-|\\)|$)`, 'i');

      const matchingRecords = financialRecords.filter(r => 
        r.orderId === targetId ||
        (targetDocId && r.orderId === targetDocId) ||
        (!r.orderId && r.description && exactShortIdRegex.test(r.description))
      );

      const effectivePayments = updates.payments || order?.payments;
      const recCategory = order?.type === 'delivery' ? 'Vendas Entrega' : (order?.type === 'takeout' ? 'Vendas Balcão' : 'Vendas Mesa');
      const isTableOrd = Boolean(
        order && (
          order.type === 'table' ||
          order.type === 'dine_in' ||
          (!order.type && order.tableNumber !== undefined && !String(order.tableNumber).toLowerCase().includes('balcão'))
        )
      );
      const isCompleted = Boolean(
        updates.isSettled ||
        updates.paymentStatus === 'paid' ||
        (order && (
          order.isSettled ||
          order.paymentStatus === 'paid' ||
          (!isTableOrd && Boolean(order.paymentMethod || updates.paymentMethod) && (order.status === 'delivered' || order.status === 'finished'))
        ))
      );

      if (effectivePayments && effectivePayments.length > 1) {
        if (matchingRecords.length > 0 || isCompleted) {
          for (let i = 0; i < effectivePayments.length; i++) {
            const part = effectivePayments[i];
            const partAmount = Number(part.amount) || 0;
            const partMethod = part.method || 'dinheiro';
            const partDesc = `Pedido #${shortId} (${i + 1}/${effectivePayments.length}) - Pagamento: ${partMethod}`;

            if (i < matchingRecords.length) {
              await handleUpdateFinancialRecord(matchingRecords[i].id, {
                amount: partAmount,
                paymentMethod: partMethod as any,
                description: partDesc,
                orderId: targetId
              });
            } else if (partAmount > 0) {
              await handleAddFinancialRecord({
                id: (part as any).id || `fin-${targetId}-${partMethod}-${partAmount}-${i}`,
                type: 'income',
                amount: partAmount,
                category: recCategory,
                description: partDesc,
                date: order?.paidAt ? new Date(order.paidAt) : (order?.createdAt ? new Date(order.createdAt) : new Date()),
                paymentMethod: partMethod as any,
                orderId: targetId
              });
            }
          }
          // Se havia mais lançamentos antigos do que partes atuais, remover os excedentes
          if (matchingRecords.length > effectivePayments.length) {
            for (let i = effectivePayments.length; i < matchingRecords.length; i++) {
              await handleDeleteFinancialRecord(matchingRecords[i].id).catch(e => console.warn("Delete extra record warning:", e));
            }
          }
        }
      } else if (matchingRecords.length > 0) {
        const finalTotal = updates.total !== undefined ? updates.total : (order?.total ?? matchingRecords[0].amount);
        const finalMethod = (effectivePayments && effectivePayments.length === 1 ? effectivePayments[0].method : undefined) || updates.paymentMethod || order?.paymentMethod || matchingRecords[0].paymentMethod;
        let newDescription = matchingRecords[0].description;
        if (finalMethod) {
          if (newDescription.includes("Pagamento:")) {
            newDescription = newDescription.replace(/(Pagamento:\s*)(.+)$/i, `$1${finalMethod}`);
          } else {
            newDescription = `${newDescription} - Pagamento: ${finalMethod}`;
          }
        }

        await handleUpdateFinancialRecord(matchingRecords[0].id, {
          amount: finalTotal,
          paymentMethod: finalMethod as any,
          description: newDescription,
          orderId: targetId
        });

        if (matchingRecords.length > 1) {
          for (let i = 1; i < matchingRecords.length; i++) {
            await handleDeleteFinancialRecord(matchingRecords[i].id).catch(e => console.warn("Delete extra record warning:", e));
          }
        }
      } else if (isCompleted && order) {
        const finalTotal = updates.total !== undefined ? updates.total : (order.total || 0);
        const finalMethod = (effectivePayments && effectivePayments.length === 1 ? effectivePayments[0].method : undefined) || updates.paymentMethod || order.paymentMethod || 'dinheiro';
        await handleAddFinancialRecord({
          id: `fin-${targetId}-${finalMethod}-${finalTotal}`,
          type: 'income',
          amount: finalTotal,
          category: recCategory,
          description: `Pedido #${shortId} - Pagamento: ${finalMethod}`,
          date: order.createdAt ? new Date(order.createdAt) : new Date(),
          paymentMethod: finalMethod as any,
          orderId: targetId
        });
      }
    }

    addLog('u1', 'PEDIDO', `Pedido ${id} atualizado: ${Object.keys(updates).join(', ')}`);
  };

  // Auto-reparo de registros financeiros de pedidos com pagamento dividido no turno ativo (disponível para todos os tenants com isolamento por tenantId)
  const healedSplitOrdersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!cashSession?.isOpen || !cashSession.openedAt || orders.length === 0) return;
    const sessionOpenTime = toSafeDate(cashSession.openedAt).getTime();
    if (sessionOpenTime <= 0) return;
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const isTenantMatch = (tId?: string) =>
      !effectiveTenantId || !tId || tId === effectiveTenantId || ((effectiveTenantId === 'lojista' || effectiveTenantId === 't1') && (tId === 'lojista' || tId === 't1'));

    orders.forEach(o => {
      if (!o || !isTenantMatch(o.tenantId) || !o.payments || o.payments.length <= 1) return;
      const isPaid = o.isSettled || o.paymentStatus === 'paid' || Boolean(o.payments && o.payments.length > 0);
      if (!isPaid || o.status === 'cancelled') return;

      const sig = `${effectiveTenantId}_${o.id}_${o.payments.map(p => `${p.method}:${p.amount}`).join('|')}`;
      if (healedSplitOrdersRef.current.has(sig)) return;

      const matching = financialRecords.filter(r =>
        isTenantMatch(r.tenantId) &&
        r.orderId && (r.orderId === o.id || (o.docId && r.orderId === o.docId))
      );

      const expectedSum = o.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const actualSum = matching.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      const methodsMatch = matching.length === o.payments.length && o.payments.every((p, idx) =>
        matching[idx] &&
        normalizePaymentMethod(matching[idx].paymentMethod, adminSettings) === normalizePaymentMethod(p.method, adminSettings) &&
        Math.abs((Number(matching[idx].amount) || 0) - (Number(p.amount) || 0)) < 0.02
      );

      if (matching.length > 0 && (!methodsMatch || Math.abs(actualSum - expectedSum) > 0.05)) {
        healedSplitOrdersRef.current.add(sig);
        const shortId = o.dailyNumber ? String(o.dailyNumber) : o.id.slice(-4);
        const recCategory = o.type === 'delivery' ? 'Vendas Entrega' : (o.type === 'takeout' ? 'Vendas Balcão' : 'Vendas Mesa');
        (async () => {
          for (let i = 0; i < o.payments!.length; i++) {
            const part = o.payments![i];
            const partAmount = Number(part.amount) || 0;
            const partMethod = part.method || 'dinheiro';
            const partDesc = `Pedido #${shortId} (${i + 1}/${o.payments!.length}) - Pagamento: ${partMethod}`;
            if (i < matching.length) {
              await handleUpdateFinancialRecord(matching[i].id, {
                amount: partAmount,
                paymentMethod: partMethod as any,
                description: partDesc,
                orderId: o.id
              });
            } else if (partAmount > 0) {
              await handleAddFinancialRecord({
                id: (part as any).id || `fin-${o.id}-${partMethod}-${partAmount}-${i}`,
                type: 'income',
                amount: partAmount,
                category: recCategory,
                description: partDesc,
                date: o.paidAt ? new Date(o.paidAt) : (o.createdAt ? new Date(o.createdAt) : new Date()),
                paymentMethod: partMethod as any,
                orderId: o.id
              });
            }
          }
          if (matching.length > o.payments!.length) {
            for (let i = o.payments!.length; i < matching.length; i++) {
              await handleDeleteFinancialRecord(matching[i].id).catch(() => {});
            }
          }
        })();
      } else if (methodsMatch) {
        healedSplitOrdersRef.current.add(sig);
      }
    });
  }, [orders, financialRecords, cashSession?.isOpen, cashSession?.openedAt, viewingTenantId, currentUserData?.tenantId, tenantData?.id]);

  // Auto-reparo para pedidos de mesa que receberam baixa automática em dinheiro ao finalizar no KDS antes do fechamento da mesa
  const healedTableDuplicatesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!cashSession?.isOpen || !cashSession.openedAt || orders.length === 0) return;
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const isTenantMatch = (tId?: string) =>
      !effectiveTenantId || !tId || tId === effectiveTenantId || ((effectiveTenantId === 'lojista' || effectiveTenantId === 't1') && (tId === 'lojista' || tId === 't1'));

    orders.forEach(o => {
      if (!o || !isTenantMatch(o.tenantId) || o.status === 'cancelled') return;
      const isTableOrd = o.type === 'table' || o.type === 'dine_in' || (!o.type && o.tableNumber !== undefined && !String(o.tableNumber).toLowerCase().includes('balcão'));
      if (!isTableOrd) return;

      // Procurar lançamentos financeiros gerados automaticamente pelo KDS ("- Finalizado - Pagamento: dinheiro") para este pedido de mesa
      const kdsAutoRecords = financialRecords.filter(r =>
        isTenantMatch(r.tenantId) &&
        r.orderId &&
        (r.orderId === o.id || (o.docId && r.orderId === o.docId)) &&
        r.description &&
        r.description.includes('- Finalizado') &&
        !r.description.startsWith('Mesa ')
      );

      if (kdsAutoRecords.length === 0) return;

      const isTableStillOpen = tables.some(t =>
        isTenantMatch(t.tenantId) &&
        t.status === 'occupied' &&
        (t.currentOrderId === o.id || (o.docId && t.currentOrderId === o.docId) || (o.tableNumber !== undefined && String(t.number) === String(o.tableNumber)))
      );

      // Procurar se já existe outro pedido fechado/quitado para a mesma mesa no mesmo turno (gerado quando fechou a mesa depois)
      const duplicateClosedTableOrder = orders.find(other =>
        other.id !== o.id &&
        isTenantMatch(other.tenantId) &&
        other.status !== 'cancelled' &&
        !other.isSubTicket &&
        (other.type === 'table' || other.type === 'dine_in' || !other.type) &&
        String(other.tableNumber) === String(o.tableNumber) &&
        other.isSettled &&
        other.paymentStatus === 'paid' &&
        !o.paymentMethod &&
        financialRecords.some(r => isTenantMatch(r.tenantId) && r.orderId === other.id && r.description?.startsWith('Mesa '))
      );

      if (isTableStillOpen || duplicateClosedTableOrder) {
        const healKey = `tbl_heal_${effectiveTenantId}_${o.id}_${kdsAutoRecords.map(r => r.id).join(',')}`;
        if (healedTableDuplicatesRef.current.has(healKey)) return;
        healedTableDuplicatesRef.current.add(healKey);

        (async () => {
          for (const rec of kdsAutoRecords) {
            await handleDeleteFinancialRecord(rec.id).catch(() => {});
          }
          if (duplicateClosedTableOrder) {
            const subUpdates: Partial<Order> = {
              isSubTicket: true,
              mergedIntoOrderId: duplicateClosedTableOrder.id,
              isSettled: true
            };
            setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, ...subUpdates } : ord));
            await localDb.orders.update(o.id, subUpdates).catch(() => {});
            if (effectiveTenantId) {
              await setDoc(doc(db, 'orders', o.docId || o.id), cleanObject(subUpdates), { merge: true }).catch(() => {});
            }
          } else if (isTableStillOpen && !o.paymentMethod) {
            const openUpdates: Partial<Order> = {
              isSettled: false,
              paymentStatus: 'pending'
            };
            setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, ...openUpdates } : ord));
            await localDb.orders.update(o.id, openUpdates).catch(() => {});
            if (effectiveTenantId) {
              await setDoc(doc(db, 'orders', o.docId || o.id), cleanObject(openUpdates), { merge: true }).catch(() => {});
            }
          }
        })();
      }
    });
  }, [orders, financialRecords, tables, cashSession?.isOpen, cashSession?.openedAt, viewingTenantId, currentUserData?.tenantId, tenantData?.id]);

  // Auto-reparo para pedidos duplicados em edições anteriores (mesmo dailyNumber, tipo e horário de criação) e pagamentos somados indevidamente
  const healedEditedOrdersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (orders.length === 0) return;
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const isTenantMatch = (tId?: string) =>
      !effectiveTenantId || !tId || tId === effectiveTenantId || ((effectiveTenantId === 'lojista' || effectiveTenantId === 't1') && (tId === 'lojista' || tId === 't1'));

    // 1. Detectar clones de edição (mesmo dailyNumber > 0, mesmo type e createdAt dentro de 5s com IDs diferentes)
    const groupsByLineage = new Map<string, Order[]>();
    orders.forEach(o => {
      if (!o || !isTenantMatch(o.tenantId) || o.status === 'cancelled' || !o.dailyNumber || o.dailyNumber <= 0) return;
      const createdMs = toSafeDate(o.createdAt).getTime();
      if (createdMs <= 0) return;
      const bucket = Math.floor(createdMs / 5000);
      const key = `${o.tenantId || effectiveTenantId}_${o.type || ''}_${o.dailyNumber}_${bucket}`;
      const list = groupsByLineage.get(key) || [];
      list.push(o);
      groupsByLineage.set(key, list);
    });

    groupsByLineage.forEach((group, key) => {
      if (group.length <= 1) return;
      const healGroupKey = `clone_${key}_${group.map(g => g.id).sort().join(',')}`;
      if (healedEditedOrdersRef.current.has(healGroupKey)) return;
      healedEditedOrdersRef.current.add(healGroupKey);

      // Ordenar para manter o pedido com atualização mais recente (ou maior valor/itens se editado)
      const sorted = [...group].sort((a, b) => {
        const upA = toSafeDate(a.updatedAt || a.paidAt || a.createdAt).getTime();
        const upB = toSafeDate(b.updatedAt || b.paidAt || b.createdAt).getTime();
        if (Math.abs(upB - upA) > 1000) return upB - upA;
        return (Number(b.total) || 0) - (Number(a.total) || 0);
      });

      const winner = sorted[0];
      const losers = sorted.slice(1);

      (async () => {
        for (const loser of losers) {
          // Remover registros financeiros do pedido clonado antigo
          const loserRecords = financialRecords.filter(r => r.orderId === loser.id || (loser.docId && r.orderId === loser.docId));
          for (const rec of loserRecords) {
            await handleDeleteFinancialRecord(rec.id).catch(() => {});
          }
          // Remover o pedido clonado antigo do estado, localDb e Firestore
          setOrders(prev => prev.filter(ord => ord.id !== loser.id && ord.docId !== loser.id));
          await localDb.orders.delete(loser.id).catch(() => {});
          if (loser.docId) await localDb.orders.delete(loser.docId).catch(() => {});
          if (effectiveTenantId) {
            await deleteDoc(doc(db, 'orders', loser.docId || loser.id)).catch(() => {});
          }
        }
      })();
    });

    // 2. Detectar pedidos cujo array payments ou lançamentos financeiros somam mais que o total do pedido (ex: R$ 24 + R$ 40 = R$ 64 para pedido de R$ 44)
    orders.forEach(o => {
      if (!o || !isTenantMatch(o.tenantId) || o.status === 'cancelled') return;
      const orderTotal = Number(o.total || 0);
      if (orderTotal <= 0) return;

      const paymentsSum = (o.payments || []).reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
      const matchingFin = financialRecords.filter(r => isTenantMatch(r.tenantId) && r.orderId && (r.orderId === o.id || (o.docId && r.orderId === o.docId)));
      const finSum = matchingFin.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

      if (paymentsSum > orderTotal + 0.05 || finSum > orderTotal + 0.05) {
        const overKey = `overpay_${effectiveTenantId}_${o.id}_${paymentsSum.toFixed(2)}_${finSum.toFixed(2)}_${orderTotal.toFixed(2)}`;
        if (healedEditedOrdersRef.current.has(overKey)) return;
        healedEditedOrdersRef.current.add(overKey);

        const primaryMethod = (o.payments && o.payments.length > 0 ? o.payments[o.payments.length - 1].method : o.paymentMethod) || 'dinheiro';
        const fixedPayments = [{ method: primaryMethod as any, amount: Number(orderTotal.toFixed(2)), timestamp: new Date() }];

        (async () => {
          if (paymentsSum > orderTotal + 0.05) {
            const ordUpdates: Partial<Order> = {
              paymentMethod: primaryMethod as any,
              payments: fixedPayments
            };
            setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, ...ordUpdates } : ord));
            await localDb.orders.update(o.id, ordUpdates).catch(() => {});
            if (effectiveTenantId) {
              await setDoc(doc(db, 'orders', o.docId || o.id), cleanObject(ordUpdates), { merge: true }).catch(() => {});
            }
          }

          if (matchingFin.length > 0 && finSum > orderTotal + 0.05) {
            const shortId = o.dailyNumber ? String(o.dailyNumber) : o.id.slice(-4);
            await handleUpdateFinancialRecord(matchingFin[0].id, {
              amount: Number(orderTotal.toFixed(2)),
              paymentMethod: primaryMethod as any,
              description: `Pedido #${shortId} - Pagamento: ${primaryMethod}`,
              orderId: o.id
            }).catch(() => {});
            for (let i = 1; i < matchingFin.length; i++) {
              await handleDeleteFinancialRecord(matchingFin[i].id).catch(() => {});
            }
          }
        })();
      }
    });
  }, [orders, financialRecords, viewingTenantId, currentUserData?.tenantId]);

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
        await updateDoc(doc(db, 'orders', targetDocId), cleanObject(updates));
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
    const numericId = typeof id === 'string' ? Number(id) : id;
    
    let table = tables.find(t => (t as any).docId === id || (t as any)._firestoreId === id);
    if (!table) {
      table = tables.find(t => t.id === id || (typeof t.id === 'number' && t.id === numericId) || Number(t.number) === numericId);
    }
    
    if (!table) {
      if (typeof id === 'string' && isNaN(numericId)) {
        setTables(prev => prev.filter(t => (t as any).docId !== id && (t as any)._firestoreId !== id));
        try {
          await deleteDoc(doc(db, 'diningTables', id));
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

    const effectiveTenantId = table.tenantId || getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const targetDocId = (table as any).docId || (table as any)._firestoreId || (typeof id === 'string' && isNaN(numericId) ? id : null);

    // Atualização otimista imediata no estado e no IndexedDB
    setTables(prev => prev.filter(t =>
      t.id !== table!.id &&
      t.number !== table!.number &&
      (!targetDocId || ((t as any).docId !== targetDocId && (t as any)._firestoreId !== targetDocId))
    ));
    if (!isNaN(Number(table.id))) {
      localDb.diningTables.delete(Number(table.id)).catch(() => {});
    }

    if (effectiveTenantId) {
      try {
        if (targetDocId) {
          await deleteDoc(doc(db, 'diningTables', targetDocId));
        }
        if (!isNaN(Number(table.id))) {
          const qById = query(
            collection(db, 'diningTables'),
            where('id', '==', Number(table.id)),
            where('tenantId', '==', effectiveTenantId)
          );
          const snapById = await getDocs(qById);
          if (!snapById.empty) {
            const batch = writeBatch(db);
            snapById.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
        addLog('u1', 'MESAS', `Mesa ${table.number} excluída`);
      } catch (error) {
        console.error("Error deleting table from cloud:", error);
        showToast("Erro ao excluir mesa. Verifique suas permissões.", 'error');
      }
    } else {
      addLog('u1', 'MESAS', `Mesa ${table.number} excluída (Local)`);
    }
  };

  const handleUpdateTable = async (
    id: number | string, 
    items: OrderItem[], 
    status: Table['status'], 
    isCounter?: boolean, 
    partialPayments?: Table['partialPayments'],
    customerData?: {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      deliveryFee?: number;
      customerId?: string;
      isDelivery?: boolean;
    }
  ) => {
    const activeItems = (items || []).filter(it => !it.cancelled);
    const total = activeItems.reduce((a, b) => a + (b.price * b.quantity), 0);
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId || (isSuperAdmin ? `saas-admin-${user?.uid}` : null);
    const numericId = typeof id === 'string' ? Number(id) : id;

    const tableUpdates: Record<string, any> = { items: activeItems, status, total };
    const existingTable = (!isCounter ? tables : counterOrders).find(t =>
      t.id === id ||
      t.id === numericId ||
      String(t.id) === String(id) ||
      (t as any).docId === id ||
      t.currentOrderId === String(id)
    );
    if (existingTable?.currentOrderId) {
      tableUpdates.currentOrderId = existingTable.currentOrderId;
    }
    if (partialPayments !== undefined) {
      tableUpdates.partialPayments = partialPayments;
    }
    if (customerData) {
      if (customerData.customerName !== undefined) tableUpdates.customerName = customerData.customerName;
      if (customerData.customerPhone !== undefined) tableUpdates.customerPhone = customerData.customerPhone;
      if (customerData.customerAddress !== undefined) tableUpdates.customerAddress = customerData.customerAddress;
      if (customerData.deliveryFee !== undefined) tableUpdates.deliveryFee = customerData.deliveryFee;
      if (customerData.customerId !== undefined) tableUpdates.customerId = customerData.customerId;
      if (customerData.isDelivery !== undefined) tableUpdates.isDelivery = customerData.isDelivery;
    }

    if (isCounter) {
      const matchedOrder = orders.find(o =>
        o.status !== 'cancelled' &&
        (
          (existingTable?.currentOrderId && (o.id === existingTable.currentOrderId || o.docId === existingTable.currentOrderId)) ||
          (pdvEditOrder && (o.id === pdvEditOrder.id || o.docId === pdvEditOrder.id)) ||
          o.id === String(id) ||
          o.docId === String(id) ||
          String(o.counterId) === String(id) ||
          (existingTable && String(o.counterId) === String(existingTable.id))
        )
      );
      const counterOrderId = matchedOrder?.id || existingTable?.currentOrderId || (pdvEditOrder ? pdvEditOrder.id : null);

      setCounterOrders(prev => {
        const match = prev.find(t =>
          t.id === id ||
          t.id === numericId ||
          String(t.id) === String(id) ||
          (counterOrderId && t.currentOrderId === counterOrderId)
        );
        if (match) {
          if (activeItems.length === 0 && status === 'available') {
            return prev.filter(t => t.id !== match.id);
          }
          return prev.map(t => (t.id === match.id) ? { ...t, ...tableUpdates, currentOrderId: counterOrderId || t.currentOrderId } : t);
        }
        // Se for edição direta de um pedido já existente em orders, não criar comanda fantasma avulsa
        if (counterOrderId || pdvEditOrder || activeItems.length === 0) {
          return prev;
        }
        return [...prev, {
          id: id,
          number: typeof id === 'number' ? id : prev.length + 1,
          status: status || 'occupied',
          items: activeItems,
          total: total || 0,
          tenantId: effectiveTenantId || '',
          ...tableUpdates
        }];
      });

      // Se houver pedido vinculado a esta comanda de balcão, atualiza no estado e no Firestore preservando taxas e lotes
      if (counterOrderId) {
        if (activeItems.length === 0) {
          await handleUpdateOrderStatus(counterOrderId, 'cancelled');
          return;
        }
        const targetOrd = matchedOrder || orders.find(o => o.id === counterOrderId || o.docId === counterOrderId);
        const existingOrdItems = targetOrd?.items || [];
        const sentCounterItems = activeItems.filter(it => it.sentToKitchen !== false).map(it => {
          const prevMatch = existingOrdItems.find(oi =>
            Boolean(oi.id && it.id && oi.id === it.id) ||
            (oi.productId === it.productId && oi.name === it.name && (oi.observation || '') === (it.observation || ''))
          );
          return prevMatch ? {
            ...prevMatch,
            ...it,
            id: prevMatch.id || it.id,
            batchNumber: it.batchNumber ?? prevMatch.batchNumber ?? 1,
            isNew: it.isNew ?? prevMatch.isNew ?? false,
            sentAt: it.sentAt ?? prevMatch.sentAt,
            kitchenDispatched: it.kitchenDispatched ?? prevMatch.kitchenDispatched ?? false,
            sentToKitchen: true
          } : it;
        });

        // Se todos os itens já enviados foram removidos da comanda, cancelar o pedido no KDS
        if (existingOrdItems.length > 0 && sentCounterItems.length === 0 && activeItems.every(it => !it.sentToKitchen)) {
          await handleUpdateOrderStatus(counterOrderId, 'cancelled');
          return;
        }

        const sentItemsSubtotal = sentCounterItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        const fullOrderTotal = Math.max(0, sentItemsSubtotal + (targetOrd?.deliveryFee || 0) + (targetOrd?.additionalFee || 0) - (targetOrd?.discount || 0));
        setOrders(prev => prev.map(o => (o.id === counterOrderId || o.docId === counterOrderId) ? {
          ...o,
          items: sentCounterItems,
          total: fullOrderTotal,
          updatedAt: new Date()
        } : o));
        localDb.orders.update(counterOrderId, { items: sentCounterItems, total: fullOrderTotal, updatedAt: new Date() }).catch(() => {});
        if (effectiveTenantId) {
          setDoc(doc(db, 'orders', targetOrd?.docId || counterOrderId), cleanObject({
            items: sentCounterItems,
            total: fullOrderTotal,
            updatedAt: new Date(),
            customerName: tableUpdates.customerName,
            customerPhone: tableUpdates.customerPhone,
            customerAddress: tableUpdates.customerAddress
          }), { merge: true }).catch(e => console.warn("Erro ao sincronizar comanda de balcão no Firestore:", e));
        }
      }
    } else {
      // Local update
      const targetTableNumber = existingTable?.number ?? numericId;
      const linkedTableOrder = orders.find(o =>
        o.status !== 'cancelled' &&
        o.status !== 'finished' &&
        !o.isSettled &&
        o.paymentStatus !== 'paid' &&
        (
          (existingTable?.currentOrderId && (o.id === existingTable.currentOrderId || o.docId === existingTable.currentOrderId)) ||
          ((o.type === 'table' || !o.type) && String(o.tableNumber) === String(targetTableNumber))
        )
      );
      const orderIdToSync = existingTable?.currentOrderId || linkedTableOrder?.id;

      setTables(prev => prev.map(t => (t.id === id || t.id === numericId || String(t.id) === String(id) || (t as any).docId === id) ? { ...t, ...tableUpdates } : t));
      if (!isNaN(numericId)) {
        localDb.diningTables.update(numericId, tableUpdates).catch(e => console.warn("LocalDb table update error:", e));
      }

      // Se houver pedido ativo vinculado a esta mesa no KDS, sincroniza itens já enviados (inclusive quando zerados)
      if (orderIdToSync) {
        const sentItemsOnly = activeItems.filter(it => it.sentToKitchen !== false);
        const currentOrderObj = linkedTableOrder || orders.find(o => o.id === orderIdToSync || o.docId === orderIdToSync);
        const existingOrderItems = currentOrderObj?.items || [];

        if (activeItems.length === 0 || (existingOrderItems.length > 0 && sentItemsOnly.length === 0 && activeItems.every(it => !it.sentToKitchen))) {
          await handleUpdateOrderStatus(orderIdToSync, 'cancelled');
          return;
        }

        const mergedOrderItems = sentItemsOnly.map(it => {
          const prevMatch = existingOrderItems.find(oi =>
            Boolean(oi.id && it.id && oi.id === it.id) ||
            (oi.productId === it.productId && oi.name === it.name && (oi.observation || '') === (it.observation || ''))
          );
          return prevMatch ? {
            ...prevMatch,
            ...it,
            id: prevMatch.id || it.id,
            batchNumber: it.batchNumber ?? prevMatch.batchNumber ?? 1,
            isNew: it.isNew ?? prevMatch.isNew ?? false,
            sentAt: it.sentAt ?? prevMatch.sentAt,
            kitchenDispatched: it.kitchenDispatched ?? prevMatch.kitchenDispatched ?? false,
            sentToKitchen: true
          } : it;
        });
        const activeItemsTotal = mergedOrderItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        const fullTableOrderTotal = Math.max(0, activeItemsTotal + (currentOrderObj?.deliveryFee || 0) + (currentOrderObj?.additionalFee || 0) - (currentOrderObj?.discount || 0));

        setOrders(prev => prev.map(o => (o.id === orderIdToSync || o.docId === orderIdToSync) ? {
          ...o,
          items: mergedOrderItems,
          total: fullTableOrderTotal,
          updatedAt: new Date()
        } : o));

        localDb.orders.update(orderIdToSync, {
          items: mergedOrderItems,
          total: fullTableOrderTotal,
          updatedAt: new Date()
        }).catch(() => {});

        if (effectiveTenantId) {
          const targetDocId = currentOrderObj?.docId || orderIdToSync;
          setDoc(doc(db, 'orders', targetDocId), cleanObject({
            items: mergedOrderItems,
            total: fullTableOrderTotal,
            updatedAt: new Date()
          }), { merge: true }).catch(e => console.warn("Erro ao sincronizar pedido de mesa no Firestore:", e));
        }
      }

      // Cloud Sync (asynchronous and non-blocking)
      if (effectiveTenantId) {
        (async () => {
          try {
            const table = tables.find(t => t.id === id || t.id === numericId || (t as any).docId === id);
            const docId = (table as any)?.docId || (typeof id === 'string' && isNaN(numericId) ? id : null);

            if (docId) {
              await setDoc(doc(db, 'diningTables', docId), cleanObject({ ...tableUpdates, updatedAt: new Date() }), { merge: true });
            } else {
              const q = query(
                collection(db, 'diningTables'), 
                where('id', '==', numericId), 
                where('tenantId', '==', effectiveTenantId)
              );
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(d => batch.update(d.ref, cleanObject({ ...tableUpdates, updatedAt: new Date() })));
                await batch.commit();
              }
            }
          } catch (error) {
            console.error("Error syncing table update to cloud:", error);
          }
        })();
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
      const numericId = /^\d+$/.test(strId.trim()) ? Number(strId.trim()) : NaN;
      const now = new Date();
      
      const table = isCounter 
        ? counterOrders.find(t => t.id === tableId || String(t.id) === strId || t.id === numericId || t.currentOrderId === strId) 
        : tables.find(t => t.id === tableId || String(t.id) === strId || t.id === numericId || (t as any).docId === tableId || t.currentOrderId === strId);

      const tableNumber = table?.number || (!isCounter && !isNaN(numericId) ? numericId : tableId);

      // Identificar TODOS os pedidos ativos vinculados a esta mesa, comanda de balcão ou ID de pedido
      const ordersToCancel = orders.filter(o => {
        if (!o || o.status === 'cancelled') return false;
        // Se foi passado o próprio ID do pedido (ex: pdvEditOrder ou card virtual de pedido ativo)
        if (String(o.id) === strId || (o.docId && String(o.docId) === strId)) return true;
        // Se a mesa/comanda aponta para currentOrderId
        if (table?.currentOrderId && (String(o.id) === String(table.currentOrderId) || (o.docId && String(o.docId) === String(table.currentOrderId)))) {
          return true;
        }
        // Se for comanda de balcão vinculada por counterId
        if (isCounter && (String((o as any).counterId) === strId || String(o.id) === strId)) {
          return true;
        }
        // Se for mesa, cancelar pedidos em aberto (não quitados) desta mesa
        if (!isCounter && (o.type === 'table' || o.tableNumber !== undefined) && String(o.tableNumber) === String(tableNumber)) {
          if (o.status !== 'finished' && o.status !== 'delivered' && !o.isSettled && o.paymentStatus !== 'paid') {
            return true;
          }
        }
        return false;
      });

      if (ordersToCancel.length > 0) {
        const cancelIds = new Set(ordersToCancel.flatMap(o => [String(o.id), o.docId ? String(o.docId) : ''].filter(Boolean)));
        const cancelUpdates = {
          status: 'cancelled' as const,
          kitchenStatus: 'cancelled' as const,
          kitchen_status: 'cancelled',
          productionStatus: 'cancelled' as const,
          isSettled: false,
          paymentStatus: 'pending' as const,
          cancelledAt: now,
          updatedAt: now
        };

        setOrders(prev => prev.map(o =>
          (cancelIds.has(String(o.id)) || (o.docId && cancelIds.has(String(o.docId))))
            ? { ...o, ...cancelUpdates } as Order
            : o
        ));

        for (const ord of ordersToCancel) {
          await localDb.orders.update(ord.id, cancelUpdates).catch(() => {});
          if (effectiveTenantId) {
            const targetDocId = ord.docId || ord.id;
            setDoc(doc(db, 'orders', targetDocId), cleanObject(cancelUpdates), { merge: true }).catch(e =>
              console.error(`Error cancelling cloud order ${targetDocId}:`, e)
            );
          }

          // Remover lançamentos financeiros vinculados a este pedido se houver
          const linkedRecords = financialRecords.filter(r =>
            r.orderId && (r.orderId === ord.id || (ord.docId && r.orderId === ord.docId))
          );
          for (const rec of linkedRecords) {
            await handleDeleteFinancialRecord(rec.id).catch(() => {});
          }
        }
      }

      // Remover ou estornar pagamentos parciais da mesa/balcão se houver
      const partialPayments = (table as any)?.partialPayments || [];
      if (partialPayments.length > 0) {
        for (const part of partialPayments) {
          if (part.id && financialRecords.some(r => r.id === part.id)) {
            await handleDeleteFinancialRecord(part.id).catch(() => {});
          } else {
            const refundAmount = Number(part.amount || 0);
            if (refundAmount > 0) {
              const refundRecord: FinancialRecord = {
                id: `estorno-canc-${tableId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                tenantId: effectiveTenantId || 't1',
                type: 'expense',
                amount: refundAmount,
                category: 'Estorno de Pagamento Parcial',
                description: `Estorno por cancelamento de ${isCounter ? 'Balcão' : `Mesa ${tableNumber}`} - Forma: ${part.method || 'Não informada'}`,
                date: now,
                status: 'paid',
                paymentMethod: part.method || 'dinheiro'
              };
              await handleAddFinancialRecord(refundRecord);
            }
          }
        }
      }

      // Sempre limpar tanto comandas de balcão quanto mesa correspondente se aplicável
      setCounterOrders(prev => prev.filter(t =>
        t.id !== tableId &&
        String(t.id) !== strId &&
        t.id !== numericId &&
        t.currentOrderId !== strId &&
        !(table?.currentOrderId && t.currentOrderId === table.currentOrderId)
      ));

      if (!isCounter || tables.some(t => t.id === tableId || t.id === numericId || (t as any).docId === tableId || t.currentOrderId === strId)) {
        if (!isNaN(numericId)) {
          await localDb.diningTables.update(numericId, { items: [], status: 'available', total: 0, currentOrderId: undefined, partialPayments: [] } as any).catch(() => {});
        }
        setTables(prev => prev.map(t =>
          (t.id === tableId || String(t.id) === strId || t.id === numericId || (t as any).docId === tableId || t.currentOrderId === strId)
            ? { ...t, items: [], status: 'available', total: 0, currentOrderId: undefined, partialPayments: [] }
            : t
        ));
        
        if (effectiveTenantId) {
          try {
            const docId = (table as any)?.docId || (typeof tableId === 'string' && isNaN(numericId) && !ordersToCancel.some(o => o.id === tableId) ? tableId : null);
            
            if (docId) {
              await updateDoc(doc(db, 'diningTables', docId), { 
                items: [], 
                status: 'available', 
                total: 0, 
                currentOrderId: null, 
                partialPayments: [],
                updatedAt: now 
              });
            } else if (!isNaN(numericId)) {
              const q = query(collection(db, 'diningTables'), where('id', '==', numericId), where('tenantId', '==', effectiveTenantId));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                await updateDoc(snapshot.docs[0].ref, { items: [], status: 'available', total: 0, currentOrderId: null, partialPayments: [], updatedAt: now });
              }
            }
          } catch (e) {
            console.error("Error resetting table in cloud during cancel:", e);
          }
        }
      }

      showToast(`${isCounter ? 'Venda de balcão' : `Venda da Mesa ${table?.number || tableId}`} cancelada com sucesso!`, 'info');
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

  const deductStockForItems = async (items: OrderItem[], channel: string) => {
    if (!items || items.length === 0) return { updatedProductsList: [] as Product[], updatedRawMaterialsList: [] as RawMaterial[] };

    const productStockReductions = new Map<string, number>();
    const rawMaterialReductions = new Map<string, number>();

    for (const item of items) {
      const cleanItemName = (item.name || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const product = products.find(p => 
        (item.productId && p.id === item.productId) ||
        (p.id === (item as any).id) ||
        (cleanItemName && p.name.trim().toLowerCase() === cleanItemName)
      );

      if (product) {
        if (product.trackStock) {
          productStockReductions.set(product.id, (productStockReductions.get(product.id) || 0) + item.quantity);
        }

        if (product.technicalSheet && product.technicalSheet.length > 0) {
          for (const tsItem of product.technicalSheet) {
            const rawMaterial = rawMaterials.find(rm => 
              rm.id === tsItem.rawMaterialId || 
              (tsItem.rawMaterialName && rm.name.trim().toLowerCase() === tsItem.rawMaterialName.trim().toLowerCase())
            );
            if (rawMaterial) {
              const ch = tsItem.channel || 'all';
              const isMatch = 
                ch === 'all' ||
                (ch === 'dine_in' && channel === 'dine_in') ||
                (ch === 'takeout_delivery' && (channel === 'takeout' || channel === 'delivery')) ||
                (ch === 'delivery' && channel === 'delivery') ||
                (ch === 'takeout' && channel === 'takeout');

              if (isMatch) {
                const reduction = Number(tsItem.quantity) * Number(item.quantity);
                rawMaterialReductions.set(rawMaterial.id, (rawMaterialReductions.get(rawMaterial.id) || 0) + reduction);
              }
            }
          }
        }
      }
    }

    const updatedProductsList: Product[] = [];
    if (productStockReductions.size > 0) {
      setProducts(prev => prev.map(p => {
        const red = productStockReductions.get(p.id);
        if (red) {
          const updated = { ...p, stock: Math.max(0, (p.stock || 0) - red) };
          updatedProductsList.push(updated);
          return updated;
        }
        return p;
      }));
    }

    const updatedRawMaterialsList: RawMaterial[] = [];
    if (rawMaterialReductions.size > 0) {
      setRawMaterials(prev => prev.map(rm => {
        const red = rawMaterialReductions.get(rm.id);
        if (red) {
          const updated = { ...rm, currentStock: Math.max(0, rm.currentStock - red) };
          updatedRawMaterialsList.push(updated);
          return updated;
        }
        return rm;
      }));
    }

    try {
      if (updatedProductsList.length > 0) {
        await localDb.products.bulkPut(updatedProductsList);
      }
      if (updatedRawMaterialsList.length > 0) {
        await localDb.rawMaterials.bulkPut(updatedRawMaterialsList);
      }
      const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
      if (effectiveTenantId) {
        const batch = writeBatch(db);
        for (const p of updatedProductsList) {
          batch.set(doc(db, 'products', p.id), cleanObject(p), { merge: true });
        }
        for (const rm of updatedRawMaterialsList) {
          batch.set(doc(db, 'rawMaterials', rm.id), cleanObject(rm), { merge: true });
        }
        await batch.commit();
      }
    } catch (e) {
      console.warn("Error persisting stock reduction:", e);
    }

    return { updatedProductsList, updatedRawMaterialsList };
  };

  const handleCloseTable = async (
    tableId: number | string, 
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
    // 1. Identificar tenant e unidade canônicos
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const canonicalStoreId = getCanonicalStoreId(effectiveTenantId);

    // 2. Identificar a mesa/comanda/pedido e seu docId para sincronização precisa
    const strTableId = String(tableId);
    const numTableId = /^\d+$/.test(strTableId.trim()) ? Number(strTableId.trim()) : NaN;
    const source = isCounter ? counterOrders : tables;
    
    let table = source.find(t => 
      String(t.id) === strTableId || 
      (!isNaN(numTableId) && t.id === numTableId) || 
      String(t.number) === strTableId || 
      (t as any).docId === strTableId
    );

    // Fallback se não encontrado no source principal
    if (!table) {
      table = (!isCounter ? counterOrders : tables).find(t => 
        String(t.id) === strTableId || 
        (!isNaN(numTableId) && t.id === numTableId) || 
        String(t.number) === strTableId || 
        (t as any).docId === strTableId
      );
    }

    // Fallback: se estiver registrado em orders ou se for pdvEditOrder (priorizando a versão viva de orders que contém itens recém-editados)
    if (!table) {
      const targetLookupId = pdvEditOrder ? pdvEditOrder.id : strTableId;
      const matchedOrder = orders.find(o => o.id === targetLookupId || o.docId === targetLookupId || o.id === strTableId || o.docId === strTableId) || pdvEditOrder;
      if (matchedOrder) {
        const activeItems = (matchedOrder.items || []).filter(i => !i.cancelled);
        const itemsSum = activeItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
        table = {
          id: matchedOrder.id,
          number: Number(matchedOrder.tableNumber) || matchedOrder.dailyNumber || 0,
          items: activeItems,
          total: itemsSum > 0 ? itemsSum : Math.max(0, (matchedOrder.total || 0) - (matchedOrder.deliveryFee || 0)),
          status: 'occupied',
          tenantId: matchedOrder.tenantId,
          currentOrderId: matchedOrder.id
        } as Table;
      }
    }

    if (!table || !table.items || table.items.length === 0) {
      showToast("Não é possível fechar um pedido sem itens.", 'error');
      return;
    }

    const resetData = {
      items: [],
      status: 'available' as const,
      total: 0,
      currentOrderId: null,
      partialPayments: [],
      updatedAt: new Date()
    };

    const docId = (table as any).docId || (typeof tableId === 'string' ? tableId : null);
    const itemsSubtotal = (table.items || []).filter(i => !i.cancelled).reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const finalTotal = (itemsSubtotal > 0 ? itemsSubtotal : table.total) + (deliveryInfo?.fee || 0) + (additionalFee || 0) - (discount || 0);
    const tableNumber = table?.number || tableId;

    const isRealDelivery = !!(deliveryInfo && (deliveryInfo.address || (deliveryInfo.fee && deliveryInfo.fee > 0)));

    // Tentar localizar o pedido existente para reaproveitar seu ID e evitar duplicidade
    // (Mesmo que o pedido já tenha sido pago e esteja sendo editado via pdvEditOrder, NUNCA devemos gerar outro ID!)
    let existingOrderId = pdvEditOrder ? pdvEditOrder.id : table.currentOrderId;
    if (!existingOrderId) {
      const directMatch = orders.find(o => (o.id === strTableId || o.docId === strTableId) && o.status !== 'cancelled');
      if (directMatch) {
        existingOrderId = directMatch.id;
      }
    }
    if (existingOrderId && !pdvEditOrder && existingOrderId !== strTableId) {
      const linkedOrd = orders.find(o => o.id === existingOrderId || o.docId === existingOrderId);
      const isAlreadyClosedTableOrd = Boolean(
        linkedOrd && (
          linkedOrd.status === 'cancelled' ||
          (!isCounter && linkedOrd.isSettled && linkedOrd.paymentStatus === 'paid' && Boolean(linkedOrd.paymentMethod || (linkedOrd.payments && linkedOrd.payments.length > 0)))
        )
      );
      if (isAlreadyClosedTableOrd && existingOrderId !== table.currentOrderId) {
        existingOrderId = undefined;
      }
    }
    if (!existingOrderId && !isCounter && !isRealDelivery) {
      const activeOrd = orders.find(o => 
        (String(o.tableNumber) === String(tableNumber)) && 
        (o.type === 'table' || o.type === 'dine_in' || !o.type) && 
        !o.isSettled &&
        (o.paymentStatus !== 'paid' || !o.paymentMethod) &&
        o.status !== 'cancelled' && 
        !o.isSubTicket
      );
      if (activeOrd) {
        existingOrderId = activeOrd.id;
      }
    }
    // Fallback por impressão digital de IDs de itens (impede 100% que um pedido editado gere outro KDS-... duplicado)
    if (!existingOrderId && table.items && table.items.length > 0) {
      const itemIds = new Set(table.items.map(i => i.id).filter(id => id && !String(id).startsWith('item-edit-') && !String(id).startsWith('item-sync-')));
      if (itemIds.size > 0) {
        const fingerprintMatch = orders.find(o =>
          o &&
          o.status !== 'cancelled' &&
          !o.isSubTicket &&
          (o.items || []).some(oi => oi.id && itemIds.has(oi.id))
        );
        if (fingerprintMatch) {
          existingOrderId = fingerprintMatch.id;
        }
      }
    }

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

    const targetOrderId = existingOrderId || `KDS-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Tentar localizar pedido ativo correspondente para preservar status da cozinha
    const activeOrderObj = existingOrderId 
      ? orders.find(o => (o.id === existingOrderId || o.docId === existingOrderId) && o.status !== 'cancelled')
      : orders.find(o => !isCounter && String(o.tableNumber) === String(tableNumber) && o.status !== 'cancelled' && !o.isSettled && (o.paymentStatus !== 'paid' || !o.paymentMethod) && !o.isSubTicket);

    const activeStatus = activeOrderObj?.status;

    // Regra Operacional: Para qualquer pedido (Mesa, Balcão ou Delivery) que ainda estiver em produção/entrega,
    // o pagamento/fechamento financeiro registra o pagamento (isSettled: true, paymentStatus: 'paid'),
    // MAS PRESERVA ou inicia o status de preparo na Cozinha (pending, preparing ou ready), para que os cozinheiros
    // e entregadores continuem vendo o pedido no KDS até a entrega final!
    const isAlreadyFinished = activeStatus === 'delivered' || activeStatus === 'finished';
    const determinedStatus: OrderStatus = isAlreadyFinished
      ? 'finished'
      : (activeStatus === 'ready' || activeStatus === 'delivering')
        ? activeStatus
        : 'preparing';

    const determinedKitchenStatus = isAlreadyFinished
      ? 'delivered'
      : (activeStatus === 'ready' ? 'ready' : (activeOrderObj?.kitchenStatus || 'preparing'));

    const preparedItems = table.items.map(i => ({ ...i, sentToKitchen: true }));

    const rawOrder: Order = {
      id: targetOrderId,
      docId: activeOrderObj?.docId || (pdvEditOrder ? pdvEditOrder.docId : undefined),
      dailyNumber: activeOrderObj?.dailyNumber || (pdvEditOrder ? pdvEditOrder.dailyNumber : undefined),
      tableNumber: isCounter 
        ? (activeOrderObj?.tableNumber || (deliveryInfo?.name ? `Balcão (${deliveryInfo.name})` : (deliveryInfo?.phone ? `Balcão (${deliveryInfo.phone})` : 'Balcão'))) 
        : tableNumber,
      items: preparedItems,
      total: finalTotal,
      type: isRealDelivery ? 'delivery' : (isCounter ? 'takeout' : 'table'),
      status: determinedStatus,
      deliveryMethod: isRealDelivery ? 'entrega' : undefined,
      createdAt: activeOrderObj?.createdAt || (pdvEditOrder ? pdvEditOrder.createdAt : new Date()),
      paidAt: new Date(),
      shiftOpenedAt: cashSession.openedAt || undefined,
      paymentStatus: 'paid',
      paymentMethod: method,
      payments: (() => {
        // Se o pedido já tinha pagamento(s) quitado(s) num valor menor que finalTotal, mas 'payments' veio como uma única entrada do total cheio,
        // dividir automaticamente preservando o pagamento anterior e lançando apenas a diferença do novo item!
        const incomingPayments = payments || [{ method, amount: finalTotal }];
        if (
          incomingPayments.length === 1 &&
          !(incomingPayments[0] as any).alreadyRecorded &&
          activeOrderObj &&
          (activeOrderObj.isSettled || activeOrderObj.paymentStatus === 'paid')
        ) {
          const prevOrderPayments = (activeOrderObj.payments && activeOrderObj.payments.length > 0)
            ? activeOrderObj.payments
            : (activeOrderObj.paymentMethod ? [{ method: activeOrderObj.paymentMethod, amount: Number(activeOrderObj.total) || 0 }] : []);
          const prevPaidSum = prevOrderPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          const diffAmount = Number((finalTotal - prevPaidSum).toFixed(2));
          if (prevPaidSum > 0 && diffAmount > 0.01 && prevOrderPayments.length === 1) {
            return [
              {
                ...prevOrderPayments[0],
                id: (prevOrderPayments[0] as any).id || `fin-${targetOrderId}-${prevOrderPayments[0].method}-${prevOrderPayments[0].amount}-0`,
                alreadyRecorded: true,
                timestamp: (prevOrderPayments[0] as any).timestamp || activeOrderObj.paidAt || new Date()
              },
              {
                id: `fin-${targetOrderId}-${method}-${diffAmount}-1`,
                method,
                amount: diffAmount,
                alreadyRecorded: false,
                timestamp: new Date()
              }
            ];
          }
        }
        return incomingPayments.map((p, idx) => ({
          ...p,
          id: (p as any).id || `fin-${targetOrderId}-${p.method}-${p.amount}-${idx}`,
          timestamp: (p as any).timestamp || new Date()
        }));
      })(),
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
      tenantId: effectiveTenantId,
      storeId: canonicalStoreId,
      source: table.currentOrderId ? (orders.find(o => o.id === table.currentOrderId)?.source || 'pos') : (pdvEditOrder?.source || 'pos'),
      isManual: true,
      isSettled: true,
      stockDeducted: true,
      kitchenStatus: determinedKitchenStatus,
      finishedAt: determinedStatus === 'finished' ? new Date() : (activeOrderObj?.finishedAt || undefined),
      completedAt: determinedStatus === 'finished' ? new Date() : (activeOrderObj?.completedAt || undefined),
      updatedAt: new Date()
    };
    const newOrder = assignDailyNumberToOrder(rawOrder);

    logDiagnostic('TABLE_CLOSED', {
      tenant_id: effectiveTenantId,
      store_id: canonicalStoreId,
      table_id: tableId,
      order_id: newOrder.id,
      total: finalTotal,
      status: determinedStatus,
      timestamp: new Date().toISOString()
    });

    logDiagnostic('ORDER_COMPLETED', {
      tenant_id: effectiveTenantId,
      store_id: canonicalStoreId,
      order_id: newOrder.id,
      table_number: tableNumber,
      total: finalTotal,
      status: determinedStatus,
      timestamp: new Date().toISOString()
    });

    publishDomainEvent('TABLE_CLOSED', {
      tenantId: effectiveTenantId,
      storeId: canonicalStoreId,
      orderId: newOrder.id,
      tableNumber: tableNumber,
      userId: currentUserData?.id || user?.uid,
      userName: currentUserData?.name,
      userRole: currentUserData?.role,
      source: 'pos',
      payload: newOrder
    });

    // 1. UPDATE LOCAL REACT STATE INSTANTLY FOR OPTIMISTIC FEEDBACK
    setOrders(prev => deduplicateOrders([newOrder, ...prev.filter(o => o.id !== newOrder.id && o.docId !== newOrder.id && o.id !== targetOrderId && o.docId !== targetOrderId)]));
    if (!isCounter) {
      setTables(prev => prev.map(t => (String(t.id) === String(tableId) || String(t.number) === String(tableNumber) || (t as any).docId === docId) ? { ...t, ...resetData } : t));
    } else {
      setCounterOrders(prev => prev.filter(t => String(t.id) !== strTableId && (!isNaN(numTableId) ? t.id !== numTableId : true) && t.currentOrderId !== targetOrderId && (!newOrder.id || t.currentOrderId !== newOrder.id)));
    }

    if (pdvEditOrder) {
      setPdvEditOrder(null);
    }

    // 2. BATCH REDUCTION OF STOCK & TECHNICAL SHEET (Single state and localDb pass)
    const orderChannel = isRealDelivery ? 'delivery' : (isCounter ? 'takeout' : 'dine_in');
    const productStockReductions = new Map<string, number>();
    const rawMaterialReductions = new Map<string, number>();

    for (const item of table.items) {
      // Robust product matching: check productId, exact id, and name fallback
      const cleanItemName = (item.name || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const product = products.find(p => 
        (item.productId && p.id === item.productId) ||
        (p.id === (item as any).id) ||
        (cleanItemName && p.name.trim().toLowerCase() === cleanItemName)
      );

      if (product) {
        // Reduz estoque do produto (se controlado)
        if (product.trackStock) {
          productStockReductions.set(product.id, (productStockReductions.get(product.id) || 0) + item.quantity);
        }

        // Reduz estoque de insumos (Ficha Técnica)
        if (product.technicalSheet && product.technicalSheet.length > 0) {
          for (const tsItem of product.technicalSheet) {
            const rawMaterial = rawMaterials.find(rm => 
              rm.id === tsItem.rawMaterialId || 
              (tsItem.rawMaterialName && rm.name.trim().toLowerCase() === tsItem.rawMaterialName.trim().toLowerCase())
            );
            if (rawMaterial) {
              const ch = tsItem.channel || 'all';
              const isMatch = 
                ch === 'all' ||
                (ch === 'dine_in' && orderChannel === 'dine_in') ||
                (ch === 'takeout_delivery' && (orderChannel === 'takeout' || orderChannel === 'delivery')) ||
                (ch === 'delivery' && orderChannel === 'delivery') ||
                (ch === 'takeout' && orderChannel === 'takeout');

              if (isMatch) {
                const reduction = Number(tsItem.quantity) * Number(item.quantity);
                rawMaterialReductions.set(rawMaterial.id, (rawMaterialReductions.get(rawMaterial.id) || 0) + reduction);
              }
            }
          }
        }
      }
    }

    const updatedProductsList: Product[] = [];
    if (productStockReductions.size > 0) {
      setProducts(prev => prev.map(p => {
        const red = productStockReductions.get(p.id);
        if (red) {
          const updated = { ...p, stock: Math.max(0, (p.stock || 0) - red) };
          updatedProductsList.push(updated);
          return updated;
        }
        return p;
      }));
    }

    const updatedRawMaterialsList: RawMaterial[] = [];
    if (rawMaterialReductions.size > 0) {
      setRawMaterials(prev => prev.map(rm => {
        const red = rawMaterialReductions.get(rm.id);
        if (red) {
          const updated = { ...rm, currentStock: Math.max(0, rm.currentStock - red) };
          updatedRawMaterialsList.push(updated);
          return updated;
        }
        return rm;
      }));
    }

    // 3. ASYNC PERSISTENCE, CLOUD SYNC, FISCAL, CRM, AND FINANCIAL LOGGING
    (async () => {
      // Local IndexedDB persistence
      try {
        await localDb.orders.put(newOrder);
        if (!isCounter) {
          await localDb.diningTables.toCollection().modify(t => {
            if (String(t.id) === String(tableId) || String(t.number) === String(tableNumber)) {
              t.items = [];
              t.status = 'available';
              t.total = 0;
              t.currentOrderId = undefined;
              t.partialPayments = [];
            }
          });
        }
        if (updatedProductsList.length > 0) {
          await localDb.products.bulkPut(updatedProductsList);
        }
        if (updatedRawMaterialsList.length > 0) {
          await localDb.rawMaterials.bulkPut(updatedRawMaterialsList);
        }
      } catch (e) {
        console.warn("Error updating localDb on close table:", e);
      }

      // NFC-e Emission Logic
      if (fiscal) {
        try {
          const currentNfceNum = Number(adminSettings.fiscal?.nextNfceNumber) || 1;
          const currentSeries = Number(adminSettings.fiscal?.series) || 1;
          const targetTenantId = viewingTenantId || currentUserData?.tenantId || 't1';

          const response = await fetch('/api/fiscal/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order: newOrder,
              tenantId: targetTenantId,
              settings: adminSettings.fiscal,
              customerDocument: customerDocument,
              nfceNumber: currentNfceNum,
              series: currentSeries,
              certificate: adminSettings.fiscal?.certificate,
              config: {
                environment: adminSettings.fiscal?.environment || 'homologation',
                cnpj: adminSettings.fiscal?.cnpj,
                cscId: adminSettings.fiscal?.cscId,
                cscToken: adminSettings.fiscal?.cscToken
              }
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              const issuedKey = result.nfeKey || result.accessKey;
              const actualNfceNum = result.nfceNumber || currentNfceNum;
              const nextNum = result.nextNfceNumber || (actualNfceNum + 1);

              newOrder.fiscalKey = issuedKey;
              newOrder.isFiscalIssued = true;
              newOrder.metadata = {
                ...(newOrder.metadata || {}),
                nfceNumber: actualNfceNum,
                series: currentSeries,
                protocol: result.protocol || '135260000000001'
              };
              addLog('u1', 'FISCAL', `NFC-e #${actualNfceNum} emitida com sucesso (Protocolo: ${result.protocol || 'OK'}): ${issuedKey}`);
              
              await handleUpdateLogisticsSettings({
                fiscal: {
                  ...adminSettings.fiscal,
                  nextNfceNumber: nextNum
                }
              });
            } else {
              console.error('Erro SEFAZ:', result.error);
              addLog('u1', 'FISCAL', `Erro ao emitir NFC-e #${currentNfceNum}: ${result.error}`);
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

      // Atualizar pedidos relacionados a esta mesa/balcão para encerrá-los (NUNCA tocar em pedidos já quitados!)
      const relatedOrdersToUpdate = orders.filter(o => 
        o.id !== newOrder.id &&
        (o as any).docId !== newOrder.id &&
        o.status !== 'cancelled' &&
        o.status !== 'finished' &&
        !o.isSettled &&
        o.paymentStatus !== 'paid' &&
        (
          (existingOrderId && (o.id === existingOrderId || (o as any).docId === existingOrderId)) ||
          (tableNumber !== undefined && tableNumber !== null && String(o.tableNumber) === String(tableNumber) && !isCounter)
        )
      );
      
      if (relatedOrdersToUpdate.length > 0) {
        const now = new Date();
        for (const ro of relatedOrdersToUpdate) {
          const targetStatus = isAlreadyFinished ? 'finished' : (ro.status && ro.status !== 'finished' && ro.status !== 'cancelled' ? ro.status : 'preparing');
          const updates: Partial<Order> = {
            status: targetStatus,
            isSettled: true,
            isSubTicket: true,
            mergedIntoOrderId: newOrder.id,
            paymentMethod: method,
            payments: payments?.map(p => ({ ...p, timestamp: now })),
            updatedAt: now,
            ...(targetStatus === 'finished' ? { finishedAt: now, completedAt: now } : {})
          };

          setOrders(prev => prev.map(o => o.id === ro.id ? { ...o, ...updates } : o));
          await localDb.orders.update(ro.id, updates).catch(e => console.warn(e));

          if (effectiveTenantId) {
            try {
              const targetDocId = ro.docId || ro.id;
              await updateDoc(doc(db, 'orders', targetDocId), cleanObject(updates));
            } catch (e) {
              console.error("Error syncing payment update to related order:", e);
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

      // Cloud Persistence via Batch Write
      if (effectiveTenantId) {
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'orders', newOrder.id), cleanObject({ ...newOrder }));

          if (!isCounter) {
            if (docId) {
              batch.update(doc(db, 'diningTables', docId), resetData);
            } else {
              const q = query(
                collection(db, 'diningTables'), 
                where('tenantId', '==', effectiveTenantId),
                where('number', '==', Number(tableNumber))
              );
              const snapshot = await getDocs(q);
              for (const d of snapshot.docs) {
                batch.update(d.ref, resetData);
              }
            }
          }

          // Batch products in cloud
          for (const p of updatedProductsList) {
            batch.set(doc(db, 'products', p.id), cleanObject(p), { merge: true });
          }

          // Batch raw materials in cloud
          for (const rm of updatedRawMaterialsList) {
            batch.set(doc(db, 'rawMaterials', rm.id), cleanObject(rm), { merge: true });
          }

          await batch.commit();
        } catch (e) {
          console.warn("Error syncing order batch to Firestore on close table:", e);
        }
      }

      // Financial Records: Antes de registrar o pagamento final (ou atualizado), remover quaisquer lançamentos financeiros antigos
      // deste mesmo pedido que não façam parte dos pagamentos parciais já registrados (evita duplicar pagamento ao editar pedido)
      const finalOrderPayments = newOrder.payments || payments || [];
      const preservedPartialIds = new Set(
        finalOrderPayments.filter(p => (p as any).alreadyRecorded && (p as any).id).map(p => String((p as any).id))
      );
      const staleOrderRecords = financialRecords.filter(r =>
        r.orderId &&
        (r.orderId === newOrder.id || (newOrder.docId && r.orderId === newOrder.docId)) &&
        !preservedPartialIds.has(String(r.id))
      );
      const staleOrderRecordIds = new Set(staleOrderRecords.map(r => String(r.id)));
      for (const staleRec of staleOrderRecords) {
        await handleDeleteFinancialRecord(staleRec.id).catch(() => {});
      }

      if (finalOrderPayments.length > 0) {
        const customerUpdates: Record<string, { totalDebit: number, transactions: CustomerTransaction[] }> = {};
        
        for (let i = 0; i < finalOrderPayments.length; i++) {
          const p = finalOrderPayments[i];
          const currentCustomerId = p.customerId || customerId;
          const paymentRecordId = (p as any).id || `fin-${newOrder.id}-${p.method}-${p.amount}-${i}`;
          const existsInKeptRecords = Boolean(
            (p as any).alreadyRecorded &&
            financialRecords.some(r => String(r.id) === String(paymentRecordId) && !staleOrderRecordIds.has(String(r.id)))
          );

          const targetCustomer = currentCustomerId ? customers.find(c => c.id === currentCustomerId) : null;
          const originLabel = isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableNumber || tableId}`);

          if (p.method === 'conta_cliente' && currentCustomerId) {
            if (!existsInKeptRecords) {
              if (!customerUpdates[currentCustomerId]) {
                customerUpdates[currentCustomerId] = { totalDebit: 0, transactions: [] };
              }
              customerUpdates[currentCustomerId].totalDebit += p.amount;
              customerUpdates[currentCustomerId].transactions.push({
                id: `tr-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                type: 'debit',
                amount: p.amount,
                description: `Consumo Parcial ${originLabel} ${targetCustomer?.name ? `(${targetCustomer.name})` : ''} - Pedido #${newOrder.id}`,
                date: new Date(),
                items: newOrder.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price }))
              });
            }

            if (!existsInKeptRecords) {
              await handleAddFinancialRecord({
                id: paymentRecordId,
                type: 'income',
                amount: p.amount,
                category: isRealDelivery ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
                description: `${originLabel} - ${targetCustomer?.name ? `Cliente: ${targetCustomer.name}` : 'Conta Cliente / Fiado'} (Pedido #${newOrder.id})`,
                date: new Date(),
                paymentMethod: 'conta_cliente',
                orderId: newOrder.id,
                status: 'pending'
              });
            } else if ((p as any).id) {
              await handleUpdateFinancialRecord((p as any).id, { orderId: newOrder.id }).catch(() => {});
            }
          } else if (!existsInKeptRecords) {
            await handleAddFinancialRecord({
              id: paymentRecordId,
              type: 'income',
              amount: p.amount,
              category: isRealDelivery ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
              description: `${originLabel} - Pagamento: ${p.method}`,
              date: new Date(),
              paymentMethod: p.method,
              orderId: newOrder.id,
              status: 'paid'
            });
          } else if ((p as any).id) {
            await handleUpdateFinancialRecord((p as any).id, { orderId: newOrder.id }).catch(() => {});
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
        const paymentRecordId = `fin-${newOrder.id}-${method}-${finalTotal}`;
        const singleCustomer = customerId ? customers.find(c => c.id === customerId) : null;
        const originLabel = isRealDelivery ? 'Entrega' : (isCounter ? 'Balcão' : `Mesa ${tableNumber || tableId}`);

        if (method === 'conta_cliente' && customerId) {
          if (singleCustomer) {
            const transaction: CustomerTransaction = {
              id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              type: 'debit',
              amount: finalTotal,
              description: `Consumo ${originLabel} ${singleCustomer?.name ? `(${singleCustomer.name})` : ''} - Pedido #${newOrder.id}`,
              date: new Date(),
              items: newOrder.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price }))
            };
            await handleUpdateCustomer(customerId, {
              balance: singleCustomer.balance + finalTotal,
              history: [transaction, ...singleCustomer.history]
            });
          }
          await handleAddFinancialRecord({
            id: paymentRecordId,
            type: 'income',
            amount: finalTotal,
            category: isRealDelivery ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
            description: `${originLabel} - ${singleCustomer?.name ? `Cliente: ${singleCustomer.name}` : 'Conta Cliente / Fiado'} (Pedido #${newOrder.id})`,
            date: new Date(),
            paymentMethod: 'conta_cliente',
            orderId: newOrder.id,
            status: 'pending'
          });
        } else {
          await handleAddFinancialRecord({
            id: paymentRecordId,
            type: 'income',
            amount: finalTotal,
            category: isRealDelivery ? 'Vendas Entrega' : (isCounter ? 'Vendas Balcão' : 'Vendas Mesa'),
            description: `${originLabel} - Pagamento: ${method}`,
            date: new Date(),
            paymentMethod: method,
            orderId: newOrder.id,
            status: 'paid'
          });
        }
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
    })();

    // IMPRESSÃO FINAL (Normal ou Fiscal)
    if (adminSettings.printing?.autoPrintOrder || fiscal) {
      handlePrintOrder(newOrder, adminSettings, { isFiscal: fiscal });
    }

    addLog('u1', 'PEDIDO', `Pedido ${newOrder.id} finalizado e mesa liberada.`);
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
        if (order.payments && order.payments.length > 0) {
          totalCashToDeduct += order.payments
            .filter(p => normalizePaymentMethod(p.method, adminSettings) === 'dinheiro')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        } else if (normalizePaymentMethod(order.paymentMethod, adminSettings) === 'dinheiro') {
          totalCashToDeduct += (order.total || 0);
        }
      }

      const shiftUpdate = cashSession?.isOpen && cashSession.openedAt ? { shiftOpenedAt: cashSession.openedAt } : {};

      if (effectiveTenantId) {
        try {
          const targetDocId = order?.docId || order?.id || id;
          await setDoc(doc(db, 'orders', targetDocId), { 
            isSettled: true, 
            status: 'finished',
            updatedAt: new Date(),
            ...shiftUpdate
          }, { merge: true });
        } catch (e) {
          console.error(`Error settling cloud order ${id}:`, e);
        }
      }
      await localDb.orders.update(id, { isSettled: true, status: 'finished', updatedAt: new Date(), finishedAt: new Date(), completedAt: new Date(), ...shiftUpdate } as any);
    }

    // Atualizar estado React de pedidos instantaneamente
    setOrders(prev => prev.map(o => orderIds.includes(o.id) ? { 
      ...o, 
      isSettled: true, 
      status: 'finished', 
      paidAt: o.paidAt || new Date(),
      paymentStatus: 'paid',
      updatedAt: new Date(), 
      finishedAt: o.finishedAt || new Date(), 
      completedAt: o.completedAt || new Date(),
      ...(cashSession?.isOpen && cashSession.openedAt ? { shiftOpenedAt: cashSession.openedAt } : {})
    } : o));

    // Update courier balances
    if (courierId) {
      const courier = couriers.find(c => c.id === courierId);
      if (courier) {
        const newEarnings = Math.max(0, (courier.earnings || 0) - totalEarningsToDeduct);
        const newCash = Math.max(0, (courier.cashHeld || 0) - totalCashToDeduct);
        
        await localDb.couriers.update(courierId, { earnings: newEarnings, cashHeld: newCash });
        setCouriers(prev => prev.map(c => c.id === courierId ? { ...c, earnings: newEarnings, cashHeld: newCash } : c));

        if (effectiveTenantId) {
          try {
            await updateDoc(doc(db, 'couriers', courierId), {
              earnings: newEarnings,
              cashHeld: newCash,
              updatedAt: new Date()
            });
          } catch (e) {
            console.error("Error updating courier balance in cloud after settlement:", e);
          }
        }
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
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    
    if (user.role === 'SAAS_ADMIN' || user.role === 'CUSTOMER') {
      showToast("Erro: Não é permitido cadastrar este cargo no painel do lojista.", "error");
      throw new Error("Não é permitido cadastrar usuários com perfil SaaS Admin ou Cliente dentro do painel do lojista.");
    }

    const trimmedEmail = (user.email || '').trim().toLowerCase();
    const rawPassword = (user as any).password ? String((user as any).password).trim() : '';
    const newUser: User = {
      id: user.id || `u${Date.now()}`,
      tenantId: effectiveTenantId || 't1',
      name: (user.name || '').trim(),
      email: trimmedEmail,
      ...(rawPassword ? { password: rawPassword } : {}),
      role: user.role || 'WAITER',
      permissions: user.permissions || [],
      status: 'offline',
      active: true,
      lastAccess: new Date(),
      createdAt: new Date(),
      observations: user.observations,
      presets: []
    };

    if (effectiveTenantId && auth.currentUser?.uid) {
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

        await setDoc(doc(db, 'users', newUser.id), cleanObject({
          ...newUser,
          updatedAt: new Date()
        }));

        if (rawPassword && rawPassword.length >= 6) {
          try {
            await fetch('/api/auth/update-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: newUser.id,
                email: trimmedEmail,
                newPassword: rawPassword
              })
            });
          } catch (syncErr) {
            console.warn("Aviso ao sincronizar senha do novo usuário no Auth:", syncErr);
          }
        }

        // Se for entregador, criar registro na coleção de couriers também
        if (newUser.role === 'COURIER') {
          const newCourier: Courier = {
            id: newUser.id,
            tenantId: newUser.tenantId,
            name: newUser.name,
            phone: '',
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
    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    
    if (updates.role === 'SAAS_ADMIN' || updates.role === 'CUSTOMER') {
      showToast("Erro: Não é permitido atualizar o cargo para SaaS Admin ou Cliente no painel do lojista.", "error");
      throw new Error("Não é permitido definir o cargo de usuários como SaaS Admin ou Cliente dentro do painel do lojista.");
    }

    const existingUser = users.find(u => u.id === id) || (currentUserData?.id === id ? currentUserData : undefined);
    const oldEmail = (existingUser?.email || '').trim().toLowerCase();

    const finalUpdates = { ...updates };
    const requestedNewPassword = finalUpdates.password ? finalUpdates.password.trim() : '';
    if (requestedNewPassword) {
      finalUpdates.password = requestedNewPassword;
    } else {
      delete finalUpdates.password;
    }
    if (finalUpdates.email) {
      finalUpdates.email = finalUpdates.email.trim().toLowerCase();
    }

    if (effectiveTenantId) {
      // Dobra check se alterou e-mail para um duplicado de outra pessoa
      if (finalUpdates.email && finalUpdates.email !== oldEmail) {
        const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', finalUpdates.email));
        const usersByEmailSnap = await getDocs(usersByEmailQuery);
        const duplicate = usersByEmailSnap.docs.some(d => d.id !== id && d.data()?.email?.toLowerCase() !== oldEmail);
        if (duplicate) {
          showToast(`Erro: O e-mail "${finalUpdates.email}" já está cadastrado em nossa plataforma!`, "error");
          throw new Error(`O e-mail "${finalUpdates.email}" já está cadastrado.`);
        }

        const couriersQuery = query(collection(db, 'couriers'), where('email', '==', finalUpdates.email));
        const couriersSnap = await getDocs(couriersQuery);
        const courierDuplicate = couriersSnap.docs.some(d => d.id !== id && d.data()?.email?.toLowerCase() !== oldEmail);
        if (courierDuplicate) {
          showToast(`Erro: O e-mail "${finalUpdates.email}" já está cadastrado como entregador!`, "error");
          throw new Error(`O e-mail "${finalUpdates.email}" já está cadastrado como entregador.`);
        }
      }

      const payloadToSave = cleanObject({
        ...finalUpdates,
        updatedAt: new Date()
      });

      await setDoc(doc(db, 'users', id), payloadToSave, { merge: true });

      // Se havia outros documentos com o mesmo oldEmail do mesmo usuário, sincronizá-los também
      if (oldEmail) {
        try {
          const prevEmailQuery = query(collection(db, 'users'), where('email', '==', oldEmail));
          const prevEmailSnap = await getDocs(prevEmailQuery);
          for (const uDoc of prevEmailSnap.docs) {
            if (uDoc.id !== id && (!uDoc.data()?.tenantId || uDoc.data()?.tenantId === effectiveTenantId)) {
              await setDoc(doc(db, 'users', uDoc.id), payloadToSave, { merge: true });
            }
          }
        } catch (syncDocErr) {
          console.warn("Aviso ao sincronizar documentos secundários do usuário:", syncDocErr);
        }
      }

      // Se o usuário atualizado for o proprietário/admin principal da loja e mudou o e-mail, atualizar no tenant também
      const isStoreOwner =
        id === `usr_${effectiveTenantId}_owner` ||
        existingUser?.role === 'OWNER' ||
        (oldEmail && tenantData?.email?.toLowerCase() === oldEmail);
      if (isStoreOwner && finalUpdates.email && finalUpdates.email !== oldEmail) {
        try {
          await setDoc(doc(db, 'tenants', effectiveTenantId), {
            email: finalUpdates.email,
            updatedAt: new Date()
          }, { merge: true });
        } catch (tErr) {
          console.warn("Aviso ao sincronizar e-mail no documento do tenant:", tErr);
        }
      }

      const targetUserEmail = finalUpdates.email || oldEmail;
      const emailChanged = Boolean(finalUpdates.email && finalUpdates.email !== oldEmail);
      const passwordChanged = Boolean(requestedNewPassword && requestedNewPassword.length >= 6);

      if (emailChanged || passwordChanged || finalUpdates.name) {
        try {
          await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: id,
              oldEmail: oldEmail || targetUserEmail,
              email: targetUserEmail,
              newPassword: passwordChanged ? requestedNewPassword : undefined,
              name: finalUpdates.name || existingUser?.name
            })
          });
        } catch (syncErr) {
          console.warn("Aviso ao sincronizar credenciais no Auth:", syncErr);
        }
      }

      // Sincronizar com couriers se houver mudança de nome, email ou role
      if (updates.role === 'COURIER' || existingUser?.role === 'COURIER') {
        const courierUpdate: any = {
          name: updates.name || existingUser?.name || '',
          updatedAt: new Date()
        };
        if (finalUpdates.email) courierUpdate.email = finalUpdates.email;
        if (requestedNewPassword) courierUpdate.password = requestedNewPassword;
        if (updates.active !== undefined) courierUpdate.active = updates.active;
        await setDoc(doc(db, 'couriers', id), courierUpdate, { merge: true });
      }

      // Se for o próprio usuário logado, atualizar também no estado atual, cache local e Firebase Auth
      const isCurrentUser =
        id === currentUserData?.id ||
        id === auth.currentUser?.uid ||
        (oldEmail && currentUserData?.email?.toLowerCase() === oldEmail);

      if (isCurrentUser) {
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
          try {
            if (requestedNewPassword) {
              await updatePassword(auth.currentUser, requestedNewPassword);
            }
          } catch (authErr) {
            console.warn("Could not sync current user password directly on client SDK:", authErr);
          }
        }
        setCurrentUserData(prev => {
          if (!prev) return prev;
          const next = { ...prev, ...finalUpdates };
          try {
            localStorage.setItem('kitchenflow_cached_user', JSON.stringify(next));
            if (localStorage.getItem('kitchenflow_demo_user')) {
              localStorage.setItem('kitchenflow_demo_user', JSON.stringify(next));
            }
          } catch (_) {}
          return next;
        });
      }
    } else {
      await localDb.users.update(id, finalUpdates);
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...finalUpdates } : u));
    showToast("Usuário atualizado com sucesso!");
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
      category: product.category || productCategories[0] || 'Pratos Principais',
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

  const handleUpdateDigitalMenuSettings = async (newSettings: DigitalMenuSettings | ((prev: DigitalMenuSettings) => DigitalMenuSettings)) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    let resolved: DigitalMenuSettings;

    setDigitalMenuSettings(prev => {
      resolved = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
      
      // Unify with adminSettings immediately
      setAdminSettings(prevAdmin => ({
        ...prevAdmin,
        primaryColor: resolved.primaryColor || prevAdmin.primaryColor,
        accentColor: resolved.accentColor || prevAdmin.accentColor,
        logoUrl: resolved.logoUrl || prevAdmin.logoUrl,
        bannerUrl: resolved.bannerUrl || prevAdmin.bannerUrl,
        coverUrl: resolved.bannerUrl || prevAdmin.coverUrl,
        companyName: resolved.restaurantName || prevAdmin.companyName,
        isStoreForceClosed: resolved.isStoreForceClosed !== undefined ? resolved.isStoreForceClosed : prevAdmin.isStoreForceClosed,
        isStoreForceOpen: resolved.isStoreForceOpen !== undefined ? resolved.isStoreForceOpen : prevAdmin.isStoreForceOpen,
        businessHours: resolved.businessHours || prevAdmin.businessHours,
      }));

      localDb.settings.get(effectiveTenantId || 'global').then(s => {
        const mergedAdmin = {
          ...(s?.admin || adminSettings),
          primaryColor: resolved.primaryColor || s?.admin?.primaryColor || adminSettings.primaryColor,
          accentColor: resolved.accentColor || s?.admin?.accentColor || adminSettings.accentColor,
          logoUrl: resolved.logoUrl || s?.admin?.logoUrl || adminSettings.logoUrl,
          bannerUrl: resolved.bannerUrl || s?.admin?.bannerUrl || adminSettings.bannerUrl,
          coverUrl: resolved.bannerUrl || s?.admin?.coverUrl || adminSettings.coverUrl,
          companyName: resolved.restaurantName || s?.admin?.companyName || adminSettings.companyName,
          isStoreForceClosed: resolved.isStoreForceClosed !== undefined ? resolved.isStoreForceClosed : s?.admin?.isStoreForceClosed,
          isStoreForceOpen: resolved.isStoreForceOpen !== undefined ? resolved.isStoreForceOpen : s?.admin?.isStoreForceOpen,
          businessHours: resolved.businessHours || s?.admin?.businessHours || adminSettings.businessHours,
        };

        if (s) {
          localDb.settings.put({
            ...s,
            admin: mergedAdmin,
            digitalMenu: resolved
          });
        } else {
          localDb.settings.put({
            id: effectiveTenantId || 'global',
            admin: mergedAdmin,
            digitalMenu: resolved,
            cashSession: cashSession
          });
        }
      }).catch(err => console.error("Error saving digital menu settings to localDb:", err));

      if (effectiveTenantId) {
        setDoc(doc(db, 'settings', effectiveTenantId), {
          digitalMenu: cleanObject(resolved),
          updatedAt: new Date()
        }, { merge: true }).catch(err => console.error("Error syncing digital menu settings to cloud:", err));

        const cleanSlug = resolved.customSlug
          ? resolved.customSlug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          : (resolved.restaurantName ? resolved.restaurantName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : undefined);

        // Sync live to publicStorefronts for marketplace / public menu
        setDoc(doc(db, 'publicStorefronts', effectiveTenantId), {
          digitalMenu: cleanObject(resolved),
          slug: cleanSlug || undefined,
          name: resolved.restaurantName || undefined,
          updatedAt: new Date()
        }, { merge: true }).catch(err => console.error("Error syncing digital menu to publicStorefronts:", err));

        // Sync tenant profile branding & status
        setDoc(doc(db, 'tenants', effectiveTenantId), cleanObject({
          logoUrl: resolved.logoUrl || undefined,
          bannerUrl: resolved.bannerUrl || undefined,
          coverUrl: resolved.bannerUrl || undefined,
          primaryColor: resolved.primaryColor || undefined,
          accentColor: resolved.accentColor || undefined,
          name: resolved.restaurantName || undefined,
          slug: cleanSlug || undefined,
          isStoreForceClosed: resolved.isStoreForceClosed !== undefined ? resolved.isStoreForceClosed : undefined,
          isStoreForceOpen: resolved.isStoreForceOpen !== undefined ? resolved.isStoreForceOpen : undefined,
          businessHours: resolved.businessHours || undefined,
          updatedAt: new Date()
        }), { merge: true }).catch(err => console.error("Error syncing tenant branding:", err));
      }

      return resolved;
    });
  };

  const handleUpdateAdminSettings = (newSettingsOrFn: AdminSettings | ((prev: AdminSettings) => AdminSettings)) => {
    setAdminSettings(prev => {
      const resolved = typeof newSettingsOrFn === 'function' ? newSettingsOrFn(prev) : newSettingsOrFn;
      // Sync branding & status to digitalMenuSettings
      setDigitalMenuSettings(prevMenu => ({
        ...prevMenu,
        restaurantName: resolved.companyName || prevMenu.restaurantName,
        primaryColor: resolved.primaryColor || prevMenu.primaryColor,
        accentColor: resolved.accentColor || prevMenu.accentColor,
        logoUrl: resolved.logoUrl || prevMenu.logoUrl,
        bannerUrl: resolved.bannerUrl || prevMenu.bannerUrl,
        isStoreForceClosed: resolved.isStoreForceClosed !== undefined ? resolved.isStoreForceClosed : prevMenu.isStoreForceClosed,
        isStoreForceOpen: resolved.isStoreForceOpen !== undefined ? resolved.isStoreForceOpen : prevMenu.isStoreForceOpen,
        businessHours: resolved.businessHours || prevMenu.businessHours,
      }));
      return resolved;
    });
  };

  const handleUpdateProductCategories = async (newCategories: string[] | ((prev: string[]) => string[])) => {
    lastWriteTimeRef.current = Date.now();
    setProductCategories(prev => {
      const rawResolved = typeof newCategories === 'function' ? newCategories(prev) : newCategories;
      const cleanResolved = (rawResolved || []).filter(c => c && c !== 'Geral');
      const resolved = cleanResolved;
      // Persist in localDb settings
      const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
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

      // Persist in Firestore settings and publicStorefronts if tenantId exists
      if (effectiveTenantId) {
        setDoc(doc(db, 'settings', effectiveTenantId), {
          productCategories: resolved,
          updatedAt: new Date()
        }, { merge: true }).catch(err => console.error("Error syncing product categories to cloud:", err));

        setDoc(doc(db, 'publicStorefronts', effectiveTenantId), {
          productCategories: resolved,
          updatedAt: new Date()
        }, { merge: true }).catch(err => console.error("Error syncing product categories to publicStorefronts:", err));
      }

      return resolved;
    });
  };

  const handleUpdateRawMaterialCategories = async (newCategories: string[] | ((prev: string[]) => string[])) => {
    lastWriteTimeRef.current = Date.now();
    setRawMaterialCategories(prev => {
      const rawResolved = typeof newCategories === 'function' ? newCategories(prev) : newCategories;
      const cleanResolved = (rawResolved || []).filter(Boolean);
      const resolved = cleanResolved;
      // Persist in localDb settings
      const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
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

    const { id } = finalProduct;
    
    // Atualização otimista imediata no estado de produtos e no banco local Dexie
    setProducts(prev => prev.map(p => p.id === id ? finalProduct : p));
    localDb.products.put(finalProduct).catch(e => console.warn("Local DB product put error:", e));

    if (effectiveTenantId) {
      (async () => {
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
      })();
    }

    addLog('u1', 'ESTOQUE', `Produto atualizado: ${finalProduct.name}`);
  };

  const handleDeleteProduct = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const product = products.find(p => p.id === id);
    
    setProducts(prev => prev.filter(p => p.id !== id));
    await localDb.products.delete(id).catch(e => console.warn("Local DB product delete error:", e));

    if (effectiveTenantId) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.error("Erro ao excluir produto da nuvem:", err);
      }
    }

    if (product) addLog('u1', 'ESTOQUE', `Produto excluído: ${product.name}`);
  };

  const handleUpdateRawMaterial = async (material: RawMaterial) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    setRawMaterials(prev => prev.map(m => m.id === material.id ? material : m));
    await localDb.rawMaterials.put(material).catch(e => console.warn("Local DB raw material put error:", e));

    if (effectiveTenantId) {
      await setDoc(doc(db, 'rawMaterials', material.id), {
        ...material,
        updatedAt: new Date()
      }, { merge: true }).catch(err => console.error("Cloud rawMaterial update error:", err));
    }
    addLog('u1', 'INSUMOS', `Insumo atualizado: ${material.name}`);
  };

  const handleDeleteRawMaterial = async (id: string) => {
    const effectiveTenantId = viewingTenantId || currentUserData?.tenantId;
    const material = rawMaterials.find(m => m.id === id);
    
    setRawMaterials(prev => prev.filter(m => m.id !== id));
    await localDb.rawMaterials.delete(id).catch(e => console.warn("Local DB raw material delete error:", e));

    if (effectiveTenantId) {
      await deleteDoc(doc(db, 'rawMaterials', id)).catch(err => console.error("Cloud rawMaterial delete error:", err));
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
      category: material.category || rawMaterialCategories[0] || 'Outros'
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

  const handleAcceptIncomingOrder = async (order: Order) => {
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
              description: `Primeiro pedido via Marketplace (#${order.id.slice(-4)})`,
              items: order.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })),
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
              description: `Pedido via Marketplace (#${order.id.slice(-4)})`,
              items: order.items?.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })),
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

    const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
    const now = new Date();

    if (!order.stockDeducted && order.items && order.items.length > 0) {
      await deductStockForItems(order.items, order.type === 'delivery' ? 'delivery' : 'takeout');
    }

    const rawAcceptedOrder: Order = { 
      ...order, 
      tenantId: order.tenantId || effectiveTenantId,
      source: order.source || 'whatsapp',
      status: 'preparing',
      stockDeducted: true,
      shiftOpenedAt: cashSessionRef.current.isOpen ? (cashSessionRef.current.openedAt || now) : now,
      deliveryFee: order.deliveryFee !== undefined ? order.deliveryFee : (order.type === 'delivery' ? globalDeliveryFee : 0) 
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
        await setDoc(doc(db, 'orders', order.id), cleanObject({
          ...acceptedOrder,
          updatedAt: now,
          acceptedAt: now
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
  };

  const handleOpenCash = async (value: number) => {
    try {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        showToast("Valor de abertura inválido. O saldo inicial não pode ser negativo.", "error");
        return;
      }

      if (cashSession.isOpen) {
        showToast("O caixa já se encontra aberto.", "info");
        return;
      }

      const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
      const now = new Date();
      const newSession = { isOpen: true, openingValue: numValue, openedAt: now };
      
      // Update states immediately (Optimistic)
      lastWriteTimeRef.current = Date.now();
      setCashSession(newSession);
      
      // Add financial record for opening
      const openRecord: FinancialRecord = {
        id: `open-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tenantId: effectiveTenantId || 'lojista',
        type: 'income',
        amount: numValue,
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
      if (!cashSession.isOpen) {
        showToast("O caixa já se encontra fechado.", "info");
        return null;
      }

      const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);
      const isMatchingTenant = (id?: string) => {
        if (!effectiveTenantId || !id) return true;
        if (id === effectiveTenantId) return true;
        if ((effectiveTenantId === 'lojista' || effectiveTenantId === 't1') && (id === 'lojista' || id === 't1')) return true;
        return false;
      };
      // Robust parsing of openedAt
      const openedDate = safeParseDate(cashSession.openedAt);
      if (!openedDate || isNaN(openedDate.getTime())) {
        console.error("Invalid opening date detected:", cashSession.openedAt);
        showToast("Horário de abertura do caixa inválido ou não identificado.", 'error');
        return null;
      }
      
      // Expert Tester Improvement: Verify couriers with money in hand
      const busyCouriers = couriers.filter(c => (c.cashHeld || 0) > 0.01);
      // We removed window.confirm as it is handled by the UI or can be ignored if the user proceeds
      
      showToast("Processando fechamento...", 'info');

      const parseToDate = (val: any): Date => {
        return toSafeDate(val, new Date(0));
      };

      const getStandardPaymentMethod = (method: string): string => {
        return normalizePaymentMethod(method, adminSettings);
      };

      // Helper to check if an order belongs to this cash session
      const isOrderInSession = (o: Order) => {
        if (!isMatchingTenant(o.tenantId)) return false;
        const hasSessionFinancialRecord = financialRecords.some(r =>
          r.orderId && (r.orderId === o.id || (o.docId && r.orderId === o.docId)) &&
          parseToDate(r.date) >= openedDate
        );
        const isTrueSubTicket = Boolean((o.isSubTicket || o.mergedIntoOrderId) && !hasSessionFinancialRecord);
        if (o.status === 'cancelled' || isTrueSubTicket) return false;
        const isTableOrd = o.type === 'table' || o.type === 'dine_in' || (!o.type && o.tableNumber !== undefined && !String(o.tableNumber).toLowerCase().includes('balcão'));
        const hasExplicitPayment = Boolean(o.paymentMethod || (o.payments && o.payments.length > 0));
        const isPaid = Boolean(
          o.isSettled ||
          o.paymentStatus === 'paid' ||
          (o.payments && o.payments.length > 0) ||
          hasSessionFinancialRecord ||
          (!isTableOrd && hasExplicitPayment && (o.status === 'finished' || o.status === 'delivered'))
        );
        if (!isPaid) return false;

        // 1. Se o pedido possui vínculo explícito com o turno atual (shiftOpenedAt), incluir diretamente
        let hasShiftFromEarlierSession = false;
        if ((o as any).shiftOpenedAt) {
          const orderShiftDate = parseToDate((o as any).shiftOpenedAt);
          if (orderShiftDate.getTime() > 0) {
            if (Math.abs(orderShiftDate.getTime() - openedDate.getTime()) < 5000) {
              return true;
            }
            if (orderShiftDate.getTime() < openedDate.getTime() - 5000) {
              hasShiftFromEarlierSession = true;
            }
          }
        }

        if (hasSessionFinancialRecord) {
          return true;
        }

        // 2. Validar pelo horário real do pagamento/liquidação (incluir pedidos abertos antes mas pagos/finalizados neste caixa)
        if (o.paidAt) {
          const paidDate = parseToDate(o.paidAt);
          if (paidDate.getTime() > 0) {
            return paidDate >= openedDate;
          }
        }

        if (o.payments && o.payments.length > 0) {
          const paymentTimes = o.payments
            .map((p: any) => (p.timestamp ? parseToDate(p.timestamp).getTime() : 0))
            .filter((t: number) => t > 0);
          if (paymentTimes.length > 0) {
            return Math.max(...paymentTimes) >= openedDate.getTime();
          }
        }

        if (o.completedAt) {
          const completedDate = parseToDate(o.completedAt);
          if (completedDate.getTime() > 0) {
            return completedDate >= openedDate;
          }
        }

        if (o.finishedAt) {
          const finishedDate = parseToDate(o.finishedAt);
          if (finishedDate.getTime() > 0) {
            return finishedDate >= openedDate;
          }
        }

        if (hasShiftFromEarlierSession) {
          return false;
        }

        const createdAt = parseToDate(o.createdAt);
        return createdAt >= openedDate;
      };

      // ROBUST CALCULATION: Fetch ALL orders during the session
      let salesSinceOpen: Order[] = deduplicateOrders(orders.filter(isOrderInSession));

      let recordsDuringSession: FinancialRecord[] = deduplicateFinancialRecords(financialRecords.filter(r => {
        if (!isMatchingTenant(r.tenantId)) return false;
        const isPaid = r.status === 'paid' || !r.status;
        if (!isPaid) return false;
        if (r.shiftOpenedAt) {
          const shiftDate = parseToDate(r.shiftOpenedAt);
          if (shiftDate.getTime() > 0) {
            return Math.abs(shiftDate.getTime() - openedDate.getTime()) < 5000;
          }
        }
        const date = parseToDate(r.date);
        return date >= openedDate;
      }));

      // Try to get fresh data if online with limit protection
      if (effectiveTenantId) {
        try {
          const [ordersSnapshot, recordsSnapshot] = await Promise.all([
             getDocs(query(collection(db, 'orders'), where('tenantId', '==', effectiveTenantId), limit(150))),
             getDocs(query(collection(db, 'financialRecords'), where('tenantId', '==', effectiveTenantId), limit(150)))
          ]);
          
          if (!ordersSnapshot.empty) {
            const fetchedOrders = ordersSnapshot.docs.map(d => {
              const data = d.data();
              return { 
                ...data, 
                id: data.id || d.id, 
                docId: d.id, 
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
                finishedAt: (data.finishedAt as any)?.toDate ? (data.finishedAt as any).toDate() : (data.finishedAt ? new Date(data.finishedAt) : undefined),
                completedAt: (data.completedAt as any)?.toDate ? (data.completedAt as any).toDate() : (data.completedAt ? new Date(data.completedAt) : undefined),
                paidAt: (data.paidAt as any)?.toDate ? (data.paidAt as any).toDate() : (data.paidAt ? new Date(data.paidAt) : undefined),
                shiftOpenedAt: (data.shiftOpenedAt as any)?.toDate ? (data.shiftOpenedAt as any).toDate() : (data.shiftOpenedAt ? new Date(data.shiftOpenedAt) : undefined)
              } as Order;
            });
            salesSinceOpen = deduplicateOrders([...orders, ...fetchedOrders].filter(isOrderInSession));
          }
          if (!recordsSnapshot.empty) {
            const fetchedRecords = recordsSnapshot.docs.map(d => {
              const data = d.data() as any;
              return {
                ...data,
                id: data.id || d.id,
                docId: d.id,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                shiftOpenedAt: data.shiftOpenedAt?.toDate ? data.shiftOpenedAt.toDate() : (data.shiftOpenedAt ? new Date(data.shiftOpenedAt) : undefined)
              } as FinancialRecord;
            });
            recordsDuringSession = deduplicateFinancialRecords([...financialRecords, ...fetchedRecords].filter(r => {
              if (!isMatchingTenant(r.tenantId)) return false;
              const isPaid = r.status === 'paid' || !r.status;
              if (!isPaid) return false;
              if (r.shiftOpenedAt) {
                const shiftDate = parseToDate(r.shiftOpenedAt);
                if (shiftDate.getTime() > 0) {
                  return Math.abs(shiftDate.getTime() - openedDate.getTime()) < 5000;
                }
              }
              const date = parseToDate(r.date);
              return date >= openedDate;
            }));
          }
        } catch (err) {
          console.warn('Usando dados locais para o fechamento devido a falha na nuvem:', err);
        }
      }

      const salesByMethod: Record<PaymentMethod, number> = {
        dinheiro: 0,
        cartao_credito: 0,
        cartao_debito: 0,
        pix: 0,
        vale_refeicao: 0,
        conta_cliente: 0
      };

      const accountedRecordIds = new Set<string>();
      const sessionOrderIds = new Set<string>();

      salesSinceOpen.forEach(o => {
        if (o.id) sessionOrderIds.add(o.id);
        if (o.docId) sessionOrderIds.add(o.docId);

        const rawOrderTotal = Number(o.total) || 0;
        const calculatedItemsTotal = (o.items && o.items.length > 0)
          ? o.items.filter((i: any) => !i.cancelled).reduce((acc: number, i: any) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0) +
            (Number(o.deliveryFee) || 0) +
            (Number((o as any).additionalFee) || 0) -
            (Number((o as any).discount) || 0)
          : rawOrderTotal;

        const matchingRecords = recordsDuringSession.filter(r => 
          r.orderId && (r.orderId === o.id || (o.docId && r.orderId === o.docId))
        );
        matchingRecords.forEach(r => {
          if (r.id) accountedRecordIds.add(r.id);
        });

        let paymentsToUse = o.payments;
        let primaryMethod = o.paymentMethod;

        const currentPaymentsSum = (paymentsToUse || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const matchingRecordsSum = matchingRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

        const orderTotal = (currentPaymentsSum > 0 && Math.abs(currentPaymentsSum - calculatedItemsTotal) < 0.05)
          ? calculatedItemsTotal
          : rawOrderTotal;

        if (
          o.isSubTicket ||
          o.mergedIntoOrderId ||
          (!paymentsToUse?.length && matchingRecords.length > 0) ||
          (matchingRecords.length > (paymentsToUse?.length || 0) && Math.abs(matchingRecordsSum - orderTotal) < 0.05) ||
          (currentPaymentsSum < orderTotal - 0.01 && matchingRecordsSum >= currentPaymentsSum && matchingRecords.length > 0)
        ) {
          if (matchingRecords.length > 0) {
            paymentsToUse = matchingRecords.map(r => ({
              method: r.paymentMethod as any,
              amount: Number(r.amount) || 0,
              timestamp: r.date
            }));
            primaryMethod = matchingRecords[0].paymentMethod as any;
          }
        }

        if (paymentsToUse && paymentsToUse.length > 0) {
          let paymentsSum = 0;
          paymentsToUse.forEach(p => {
            const pAmount = Number(p.amount) || 0;
            if (pAmount > 0) {
              const method = getStandardPaymentMethod(p.method) as PaymentMethod;
              if (salesByMethod[method] !== undefined) {
                salesByMethod[method] += pAmount;
              } else {
                salesByMethod.pix += pAmount;
              }
              paymentsSum += pAmount;
            }
          });

          // Se a soma dos pagamentos for menor que o total real, alocar a diferença
          if (orderTotal > paymentsSum + 0.009) {
            const diff = orderTotal - paymentsSum;
            const fallbackMethod = getStandardPaymentMethod(primaryMethod || 'dinheiro') as PaymentMethod;
            if (salesByMethod[fallbackMethod] !== undefined) {
              salesByMethod[fallbackMethod] += diff;
            } else {
              salesByMethod.dinheiro += diff;
            }
          }
        } else {
          const method = getStandardPaymentMethod(primaryMethod || 'dinheiro') as PaymentMethod;
          if (salesByMethod[method] !== undefined) {
            salesByMethod[method] += orderTotal;
          } else {
            salesByMethod.dinheiro += orderTotal;
          }
        }
      });

      // Incluir pagamentos parciais já lançados no caixa de mesas/pedidos ainda em aberto
      recordsDuringSession.forEach(r => {
        const isPaid = r.status === 'paid' || !r.status;
        if (!isPaid || r.type !== 'income') return;
        if (r.id && accountedRecordIds.has(r.id)) return;
        if (r.orderId && sessionOrderIds.has(r.orderId)) return;

        const cat = (r.category || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        if (!cat.startsWith('venda') && !desc.includes('pagamento parcial')) return;
        if (!r.orderId && !desc.includes('pagamento parcial')) return;

        if (!r.orderId) {
          const alreadyInClosedOrder = salesSinceOpen.some(so =>
            so.payments && so.payments.length > 1 &&
            so.payments.some((p: any) =>
              (p.id && p.id === r.id) ||
              (getStandardPaymentMethod(p.method) === getStandardPaymentMethod(r.paymentMethod || 'dinheiro') &&
               Math.abs((Number(p.amount) || 0) - (Number(r.amount) || 0)) < 0.01)
            )
          );
          if (alreadyInClosedOrder) return;
        }

        const rAmount = Number(r.amount) || 0;
        if (rAmount > 0) {
          const method = getStandardPaymentMethod(r.paymentMethod || 'dinheiro') as PaymentMethod;
          if (salesByMethod[method] !== undefined) {
            salesByMethod[method] += rAmount;
          } else {
            salesByMethod.dinheiro += rAmount;
          }
        }
      });

      const totalSales = Object.values(salesByMethod).reduce((acc, val) => acc + val, 0);

      const cashIncomes = recordsDuringSession
        .filter(r => {
          const cat = (r.category || '').toLowerCase();
          return r.type === 'income' && 
                 getStandardPaymentMethod(r.paymentMethod || 'dinheiro') === 'dinheiro' && 
                 !cat.includes('abertura') && 
                 !cat.includes('fechamento') &&
                 !cat.includes('ajuste') &&
                 !cat.startsWith('venda') &&
                 !cat.includes('motoboy') &&
                 !cat.includes('entregador') &&
                 !r.orderId;
        })
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
       
      const cashExpenses = recordsDuringSession
        .filter(r => {
          const cat = (r.category || '').toLowerCase();
          return r.type === 'expense' &&
                 !cat.includes('ajuste') &&
                 getStandardPaymentMethod(r.paymentMethod || 'dinheiro') === 'dinheiro';
        })
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

      const expectedCash = (Number(cashSession.openingValue) || 0) + (salesByMethod.dinheiro || 0) + cashIncomes - cashExpenses;

      const report: CashClosingReport = {
        id: `cc${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tenantId: effectiveTenantId || 't1',
        openedAt: openedDate,
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
            // 3.1 Salvar Relatório de Fechamento com prioridade máxima e persistência garantida
            await setDoc(doc(db, 'cashClosings', report.id), cleanObject(report));
            
            // 3.2 Salvar Lançamento no Extrato Financeiro
            await setDoc(doc(db, 'financialRecords', closureFinancialRec.id), cleanObject(closureFinancialRec));
            if (diffRec) {
              await setDoc(doc(db, 'financialRecords', diffRec.id), cleanObject(diffRec));
            }

            // 3.3 Atualizar Sessão de Caixa nas Configurações
            await setDoc(doc(db, 'settings', effectiveTenantId), {
              cashSession: closedSession,
              updatedAt: new Date()
            }, { merge: true });
          
            // 3.4 Resetar Mesas em lote seguro
            if (updatedTables.length > 0) {
              const tableBatch = writeBatch(db);
              let hasTableWrites = false;
              updatedTables.forEach(t => {
                const docId = (t as any).docId || (t as any)._firestoreId;
                if (docId) {
                  tableBatch.update(doc(db, 'diningTables', docId), {
                    status: 'available', items: [], total: 0, currentOrderId: null, updatedAt: new Date()
                  });
                  hasTableWrites = true;
                }
              });
              if (hasTableWrites) {
                await tableBatch.commit().catch(e => console.warn("Aviso ao resetar mesas na nuvem:", e));
              }
            }

            // 3.5 Encerrar pedidos do turno atual com proteção contra limites de cota
            const activeSessionOrderIds = salesSinceOpen.map(o => o.docId || o.id).filter(Boolean);
            if (activeSessionOrderIds.length > 0) {
              const orderChunks = [];
              for (let i = 0; i < activeSessionOrderIds.length; i += 25) {
                orderChunks.push(activeSessionOrderIds.slice(i, i + 25));
              }
              for (const chunk of orderChunks) {
                const orderBatch = writeBatch(db);
                chunk.forEach(orderId => {
                  orderBatch.update(doc(db, 'orders', orderId), {
                    status: 'finished',
                    finishedAt: new Date(),
                    updatedAt: new Date()
                  });
                });
                await orderBatch.commit().catch(e => console.warn("Aviso ao encerrar pedidos do turno na nuvem:", e));
              }
            }
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

  const isCardapioRoute = location.pathname.startsWith('/cardapio') || location.pathname.startsWith('/c/') || location.pathname.startsWith('/m/') || location.pathname.startsWith('/menu') || location.pathname.startsWith('/cardapio-digital');
  const isMarketplaceRoute = location.pathname.startsWith('/marketplace') || location.pathname.startsWith('/perfil') || isCardapioRoute;
  const isWebsiteRoute = (location.pathname.startsWith('/site') || location.pathname.startsWith('/kitchenflow') || location.pathname === '/' || location.pathname === '/login') && !isCardapioRoute;
  const isPublicRoute = isMarketplaceRoute || isWebsiteRoute || isCardapioRoute;

  if (authLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#FF4F18] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
        <div className="flex flex-col items-center gap-6 z-10 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/25 rounded-3xl flex items-center justify-center shadow-2xl shadow-black/10">
            <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">K</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black tracking-tighter text-white">KitchenFlow AI</h1>
            <p className="text-white/85 font-black text-[10px] uppercase tracking-[0.25em] animate-pulse">
              Carregando KitchenFlow AI...
            </p>
          </div>
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mt-2" />
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

  // 1. Se o usuário NÃO está autenticado no Firebase Auth
  // e tenta acessar uma rota privada/privilegiada (não pública):
  if (!user && !isPublicRoute) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (!user && location.pathname === '/login') {
    return <Login onLoginSuccess={() => {}} />;
  }

  // 1b. Quando o usuário acaba de clicar em Logar (/login) ou está em transição de autenticação na rota /login,
  // exibir o Splash Screen oficial do KitchenFlow AI em vez do site institucional.
  if (user && (location.pathname === '/login' || (currentProject === 'WEBSITE' && !location.pathname.startsWith('/site') && !location.pathname.startsWith('/kitchenflow') && location.pathname !== '/'))) {
    return (
      <div className="min-h-screen bg-[#FF4F18] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
        <div className="flex flex-col items-center gap-6 z-10 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/25 rounded-3xl flex items-center justify-center shadow-2xl shadow-black/10">
            <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">K</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black tracking-tighter text-white">KitchenFlow AI</h1>
            <p className="text-white/85 font-black text-[10px] uppercase tracking-[0.25em] animate-pulse">
              Preparando seu ambiente...
            </p>
          </div>
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 2. Se o usuário está autenticado no Firebase Auth mas os dados no Firestore (currentUserData) ainda NÃO carregaram:
  // Mostramos tela de carregamento para garantir consistência e evitar mostrar plataforma nula ou vazia.
  if (user && !currentUserData && authLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#FF4F18] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
        <div className="flex flex-col items-center gap-6 z-10 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/25 rounded-3xl flex items-center justify-center shadow-2xl shadow-black/10">
            <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">K</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black tracking-tighter text-white">KitchenFlow AI</h1>
            <p className="text-white/85 font-black text-[10px] uppercase tracking-[0.25em] animate-pulse">
              Carregando seu painel...
            </p>
          </div>
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 3. Se já carregou o login (authLoading é falso), mas o usuário logado NÃO possui cadastro correspondente (currentUserData é null) ainda:
  // Carrega em segundo plano ou aguarda a conclusão da sincronização do auto-cadastro.
  if (user && !currentUserData && !authLoading && !isPublicRoute && location.pathname !== '/') {
    return (
      <div className="min-h-screen bg-[#FF4F18] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none" />
        <div className="flex flex-col items-center gap-6 z-10 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/25 rounded-3xl flex items-center justify-center shadow-2xl shadow-black/10">
            <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">K</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black tracking-tighter text-white">KitchenFlow AI</h1>
            <p className="text-white/85 font-black text-[10px] uppercase tracking-[0.25em] animate-pulse">
              Sincronizando KitchenFlow AI...
            </p>
          </div>
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 4. Se o usuário está logado mas tem role CUSTOMER e tenta acessar painel restrito administrativo:
  if (user && currentUserData && currentUserData.role === 'CUSTOMER' && !isPublicRoute && location.pathname !== '/') {
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

  if (!isDbLoaded && !isPublicRoute) {
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

  const effectiveTenantId = getCanonicalTenantId(currentUserData, viewingTenantId, tenantData);

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
          setActiveTab={(tab) => handleSelectTab(tab)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={currentUserData || { name: user.displayName || 'Usuário', role: 'WAITER', avatar: user.photoURL || undefined } as any}
          onLogout={handleLogout}
          allowedModules={effectiveAllowedModules}
          isSuperAdmin={isSuperAdmin}
          isSaaSMode={currentProject === 'PLATFORM'}
          restaurantName={currentProject === 'PLATFORM' ? 'KitchenFlow AI' : ((isSuperAdmin && viewingTenantId ? viewingTenantName : null) || tenantData?.name || adminSettings.companyName || 'KitchenFlow')}
          logoUrl={currentProject === 'PLATFORM' ? undefined : ((isSuperAdmin && viewingTenantId ? viewingTenantLogo : null) || tenantData?.logoUrl || adminSettings.logoUrl)}
          onProfileClick={() => setIsProfileOpen(true)}
          userPermissions={localUserPerms}
          isViewingTenant={Boolean(isSuperAdmin && viewingTenantId)}
          onStopViewingTenant={handleStopViewingTenant}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {isSuperAdmin && viewingTenantId && (
          <div className="bg-slate-900 border-b border-rose-500/30 text-white px-5 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3 z-40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center shrink-0 border border-rose-500/30">
                <Shield size={18} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-400">Modo de Suporte SaaS Ativo</p>
                <p className="text-[11px] font-semibold text-slate-300">
                  Inspecionando loja: <strong className="text-white">{viewingTenantName || tenantData?.name || viewingTenantId}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={handleStopViewingTenant}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-b-2 border-rose-800"
            >
              <ArrowLeft size={16} />
              Sair da Tela do Cliente e Voltar ao SaaS Admin
            </button>
          </div>
        )}
        {currentProject === 'WEBSITE' ? (
          <KitchenflowWebsite onNavigateLogin={() => navigate('/login')} />
        ) : currentProject === 'MARKETPLACE' || currentProject === 'COURIER' ? (
          <Routes>
            <Route path="/entregador" element={
               user ? (
                 (currentUserData?.role === 'COURIER' || getUserPermissions(currentUserData).includes('courier_app_access')) ? (
                   <CourierApp currentUser={currentUserData} onLogout={handleLogout} />
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
            {[
              "/marketplace", "/marketplace/*", "/marketplace/:tenantId",
              "/cardapio", "/cardapio/*", "/cardapio/:tenantId",
              "/cardapio-digital", "/cardapio-digital/*", "/cardapio-digital/:tenantId",
              "/c/*", "/c/:tenantId",
              "/m/*", "/m/:tenantId",
              "/menu/*", "/menu/:tenantId",
              "/perfil"
            ].map((path) => (
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
                        ((isSuperAdmin && viewingTenantId ? viewingTenantLogo : null) || tenantData?.logoUrl || adminSettings.logoUrl) ? (
                          <img src={(isSuperAdmin && viewingTenantId ? viewingTenantLogo : null) || tenantData?.logoUrl || adminSettings.logoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          ((isSuperAdmin && viewingTenantId ? viewingTenantName : null) || tenantData?.name || adminSettings.companyName || 'G').substring(0, 1).toUpperCase()
                        )
                      )}
                    </div>
                    <span className="font-bold text-slate-800">
                      {currentProject === 'PLATFORM' ? 'Saas Adm' : ((isSuperAdmin && viewingTenantId ? viewingTenantName : null) || tenantData?.name || adminSettings.companyName || 'Carregando...')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('settings')}
                    className={`px-2.5 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs transition-all cursor-pointer ${
                      computeIsStoreOpen()
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                    title="Clique para gerenciar os Horários e Status da Loja"
                  >
                    <span className={`w-2 h-2 rounded-full ${computeIsStoreOpen() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{computeIsStoreOpen() ? 'Aberto' : 'Fechado'}</span>
                  </button>
                </header>
              )}

              <div className={`flex-1 custom-scrollbar ${isKDSOnlyUser ? 'h-screen max-h-screen overflow-hidden flex flex-col p-0' : (activeTab === 'kds' || activeTab === 'kds-kitchen-only' || activeTab === 'order-monitor') ? 'h-[calc(100dvh-64px)] lg:h-[calc(100dvh-20px)] overflow-hidden flex flex-col p-1' : 'overflow-y-auto max-h-screen p-1'}`}>
          {currentProject === 'PLATFORM' && isSuperAdmin ? (
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
              isQuotaExceeded={quotaExceeded}
              onResetQuota={() => setQuotaExceeded(false)}
              orders={orders}
              financialRecords={financialRecords}
              customers={customers}
              products={products}
              cashClosings={cashClosings}
              cashSession={cashSession}
              auditLogs={auditLogs}
              users={users}
              currentUser={currentUserData}
              bankAccounts={bankAccounts}
              onUpdateCustomer={handleUpdateCustomer}
              onAddFinancialRecord={handleAddFinancialRecord}
              onUpdateFinancialRecord={handleUpdateFinancialRecord}
              onRefreshData={() => {
                setQuotaExceeded(false);
              }}
              onOpenOrder={(orderId) => {
                const found = orders.find(o => o.id === orderId);
                if (found) {
                  setPdvEditOrder(found);
                }
              }}
              showToast={showToast}
            />
          ) : currentProject === 'PLATFORM' && !isSuperAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-[60vh]">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-4 border border-red-200 shadow-sm">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-800">Acesso Restrito ao SaaS Admin</h2>
              <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
                Sua conta não possui privilégios de Administrador da Plataforma. Você foi redirecionado para o painel da sua loja.
              </p>
              <button 
                onClick={() => { setCurrentProject('RESTAURANT'); setActiveTab('merchant-copilot'); navigate('/lojista'); }}
                className="mt-6 px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold text-sm shadow-md hover:bg-brand-primary/90 transition-all active:scale-95"
              >
                Ir para o Painel da Loja
              </button>
            </div>
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
                          onClick={() => handleSelectTab('settings')} 
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
                    {((isSuperAdmin && viewingTenantId ? viewingTenantLogo : null) || tenantData?.logoUrl || adminSettings.logoUrl) ? (
                      <img src={(isSuperAdmin && viewingTenantId ? viewingTenantLogo : null) || tenantData?.logoUrl || adminSettings.logoUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0">
                        {((isSuperAdmin && viewingTenantId ? viewingTenantName : null) || tenantData?.name || adminSettings.companyName || 'KF').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">
                        {(isSuperAdmin && viewingTenantId ? viewingTenantName : null) || tenantData?.name || adminSettings.companyName || 'Painel Lojista Profissional'}
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
                           activeTab === 'suppliers' ? 'Fornecedores B2B & Abastecimento' :
                           activeTab === 'finance' ? 'Gestão Financeira' :
                           activeTab === 'merchant-copilot' ? 'Módulo Lojista' :
                           activeTab === 'ai-cmv' ? 'Assistente de Cardápio' :
                           activeTab === 'reports' ? 'Relatórios Inteligentes' :
                           activeTab === 'users' ? 'Gestão de Equipe' :
                           activeTab === 'saas-admin' ? 'Gestão SaaS' :
                           activeTab === 'fiscal' ? 'Motor Tributário & Gestão Fiscal (CBS/IBS)' :
                           activeTab === 'fiscal-coupons' ? 'Cupons Fiscais (NFC-e)' :
                           activeTab === 'audit' ? 'Central de Diagnóstico & Prevenção' :
                           activeTab === 'settings' ? 'Configurações do Sistema' : activeTab}
                        </span>
                      </h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <button
                       type="button"
                       onClick={() => {
                         const currentlyOpen = computeIsStoreOpen();
                         if (currentlyOpen) {
                           handleUpdateLogisticsSettings({ isStoreForceClosed: true, isStoreForceOpen: false });
                           showToast('Loja fechada manualmente!', 'info');
                         } else {
                           handleUpdateLogisticsSettings({ isStoreForceClosed: false, isStoreForceOpen: true });
                           showToast('Loja aberta com sucesso!', 'success');
                         }
                       }}
                       className={`px-3.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border shadow-2xs transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                         computeIsStoreOpen()
                           ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                           : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                       }`}
                       title={computeIsStoreOpen() ? "Clique para fechar a loja" : "Clique para abrir a loja"}
                     >
                       <span className={`w-2.5 h-2.5 rounded-full ${computeIsStoreOpen() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                       <span>{computeIsStoreOpen() ? 'Loja Aberta' : 'Loja Fechada'}</span>
                     </button>

                     <div 
                       onClick={() => setIsProfileOpen(true)}
                       className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-slate-200 text-sm cursor-pointer hover:bg-slate-800 transition-all hover:scale-105 active:scale-[0.98] overflow-hidden shrink-0"
                       title="Editar Perfil"
                     >
                       {viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl || currentUserData?.avatar ? (
                         <img src={viewingTenantLogo || tenantData?.logoUrl || adminSettings.logoUrl || currentUserData?.avatar} alt={viewingTenantName || tenantData?.name || currentUserData?.name || 'Loja'} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                       ) : (
                         (viewingTenantName || tenantData?.name || adminSettings.companyName || 'KitchenFlow').substring(0, 2).toUpperCase()
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
        {((activeTab === 'tables' || activeTab === 'pos') && (hasPermission('tables_manage') || hasPermission('pos_access')) || pdvEditOrder !== null) && <Tables 
          tables={tables} 
          counterOrders={counterOrders} 
          products={products} 
          orders={orders} 
          financialRecords={financialRecords}
          customers={customers} 
          adminSettings={adminSettings}
          digitalMenuSettings={digitalMenuSettings}
          cashSession={cashSession} 
          tenantId={getCanonicalTenantId(currentUserData, viewingTenantId, tenantData)}
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
          onUpdateAdminSettings={handleUpdateLogisticsSettings}
          onCancelPdvEdit={() => {
            setPdvEditOrder(null);
            if (returnToTab) {
              setActiveTab(returnToTab);
              setReturnToTab(null);
            } else {
              setActiveTab('tables');
            }
          }}
          onUpdateOrder={handleUpdateOrder}
          onNavigate={setActiveTab}
          showToast={showToast}
        />}
        {pdvEditOrder === null && activeTab === 'customers' && hasPermission('customers_manage') && <CustomersPanel customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onAddFinancialRecord={handleAddFinancialRecord} />}
        {pdvEditOrder === null && activeTab === 'delivery' && hasPermission('delivery_manage') && (
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
        {pdvEditOrder === null && activeTab === 'inventory' && hasPermission('inventory_edit') && (
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
            onUpdateDigitalMenuSettings={handleUpdateDigitalMenuSettings}
            productCategories={productCategories}
            setProductCategories={handleUpdateProductCategories}
            rawMaterialCategories={rawMaterialCategories}
            setRawMaterialCategories={handleUpdateRawMaterialCategories}
            onSyncCloud={handleSaveSettings}
            orders={orders}
          />
        )}
        {pdvEditOrder === null && activeTab === 'suppliers' && (
          <div className="space-y-6">
            <B2BSuppliersModule 
              currentUserEmail={currentUserData?.email}
              currentTenantId={effectiveTenantId}
              onNavigateTab={setActiveTab}
            />
          </div>
        )}
        {pdvEditOrder === null && activeTab === 'finance' && hasPermission('finance_view') && (
          <Finance 
            tenantId={effectiveTenantId}
            orders={orders} 
            products={products}
            rawMaterials={rawMaterials}
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
        )}
        {pdvEditOrder === null && activeTab === 'merchant-copilot' && hasPermission('finance_view') && (
          <LojistaCopilot 
            tenantId={effectiveTenantId}
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
            currentUser={currentUserData}
            onUpdateSettings={handleUpdateLogisticsSettings}
          />
        )}
        {pdvEditOrder === null && activeTab === 'users' && hasPermission('users_manage') && (
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
        {pdvEditOrder === null && activeTab === 'kds' && hasPermission('kds_view') && (
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
        {pdvEditOrder === null && activeTab === 'kds-kitchen-only' && (hasPermission('kds_view') || hasPermission('kds_kitchen_only_view')) && (
          <KDSKitchenOnly 
            orders={orders}
            products={products}
            tables={tables}
            onUpdateStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            onLogout={handleLogout}
            showLogoutButton={isKDSOnlyUser}
          />
        )}
        {activeTab === 'order-monitor' && hasPermission('kds_view') && (
          <MonitorPedidos orders={orders} />
        )}
        {activeTab === 'digital-menu' && hasPermission('digital_menu_manage') && (
          <DigitalMenuConfig 
            tenantId={effectiveTenantId}
            settings={digitalMenuSettings} 
            onUpdateSettings={handleUpdateDigitalMenuSettings} 
            products={products} 
            productCategories={productCategories}
            setProductCategories={handleUpdateProductCategories}
            tables={tables} 
            onUpdateProduct={handleUpdateProduct} 
            onPlaceDigitalOrder={async (order) => {
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
            restaurantName={viewingTenantName || tenantData?.name || adminSettings.companyName}
            tenantId={effectiveTenantId}
          />
        )}
        {activeTab === 'fiscal' && (
          <FiscalEngineModule 
            products={products}
            orders={orders}
            settings={adminSettings}
            currentUser={currentUserData}
            onUpdateSettings={setAdminSettings}
          />
        )}
        {activeTab === 'fiscal-coupons' && (
          <FiscalCoupons
            currentTenant={effectiveTenantId}
            currentUser={currentUserData}
            adminSettings={adminSettings}
            orders={orders}
            showToast={showToast}
            addLog={addLog}
          />
        )}
        {activeTab === 'audit' && (
          isSuperAdmin ? (
            <SystemAudit
              orders={orders}
              financialRecords={financialRecords}
              customers={customers}
              products={products}
              cashClosings={cashClosings}
              cashSession={cashSession}
              auditLogs={auditLogs}
              users={users}
              currentUser={currentUserData}
              bankAccounts={bankAccounts}
              onUpdateCustomer={handleUpdateCustomer}
              onAddFinancialRecord={handleAddFinancialRecord}
              onUpdateFinancialRecord={handleUpdateFinancialRecord}
              onOpenOrder={(orderId) => {
                const found = orders.find(o => o.id === orderId);
                if (found) {
                  setPdvEditOrder(found);
                }
              }}
              onRefresh={() => {
                fetchRealtimeData();
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-200 m-4 shadow-sm">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-3">
                <ShieldAlert size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-800">Recurso Exclusivo do Administrador SaaS</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                A Central de Auditoria é um módulo administrativo restrito à gestão da plataforma.
              </p>
              <button
                onClick={() => setActiveTab('merchant-copilot')}
                className="mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Voltar ao Painel da Loja
              </button>
            </div>
          )
        )}
        {(activeTab === 'settings' || activeTab === 'admin-settings') && hasPermission('admin_settings_manage') && (
          <AdminSettingsComponent 
            settings={adminSettings} 
            onUpdateSettings={handleUpdateAdminSettings}
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

      {mockWhatsAppNotify && (currentProject === 'RESTAURANT' || (currentProject === 'PLATFORM' && isSuperAdmin && !!viewingTenantId)) && (
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

      {(currentProject === 'RESTAURANT' || (currentProject === 'PLATFORM' && isSuperAdmin && !!viewingTenantId)) && incomingDigitalOrders.filter(isDigitalOrMarketplaceOrder).filter(o => {
        const effectiveId = viewingTenantId || currentUserData?.tenantId;
        return !effectiveId || o.tenantId === effectiveId;
      }).length > 0 && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg space-y-4">
            {incomingDigitalOrders.filter(isDigitalOrMarketplaceOrder).slice(0, 1).map((order) => (
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

                {!cashSession.isOpen && (
                  <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Lock size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-amber-800 tracking-wider">Caixa Fechado</p>
                        <p className="text-xs font-medium text-amber-700 leading-tight">Abra o caixa para contabilizar este pedido no turno atual.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOrderToAcceptAfterCashOpen(order);
                        setShowGlobalOpenCashModal(true);
                      }}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap shadow-sm"
                    >
                      Abrir Caixa
                    </button>
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
                     if (!cashSession.isOpen) {
                       setPendingOrderToAcceptAfterCashOpen(order);
                       setShowGlobalOpenCashModal(true);
                       return;
                     }
                     await handleAcceptIncomingOrder(order);
                  }} className="flex-[1.5] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                    {cashSession.isOpen ? "Aceitar Pedido" : "Abrir Caixa & Aceitar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showGlobalOpenCashModal && (
          <OpenCashModal
            isOpen={showGlobalOpenCashModal}
            onClose={() => {
              setShowGlobalOpenCashModal(false);
              setPendingOrderToAcceptAfterCashOpen(null);
            }}
            onConfirm={async (val) => {
              await handleOpenCash(val);
              if (pendingOrderToAcceptAfterCashOpen) {
                const orderToProcess = pendingOrderToAcceptAfterCashOpen;
                setPendingOrderToAcceptAfterCashOpen(null);
                await handleAcceptIncomingOrder(orderToProcess);
              }
            }}
            triggerOrder={pendingOrderToAcceptAfterCashOpen}
            pendingCount={incomingDigitalOrders.filter(isDigitalOrMarketplaceOrder).length}
          />
        )}
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
      {(currentProject === 'MARKETPLACE' || activeTab === 'marketplace' || location.pathname.startsWith('/cardapio') || location.pathname.startsWith('/marketplace') || location.pathname.startsWith('/c/') || location.pathname.startsWith('/m/') || location.pathname.startsWith('/menu')) && (
        <PwaInstallPrompt />
      )}
    </div>
  );
};

export default App;
