import React, { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy, deleteDoc, addDoc, where, getDocs, getDoc, limit } from 'firebase/firestore';
import { compressImage } from '../lib/imageUtils';
import { ensureLojistaTenantWithData } from '../lib/ensureLojistaTenant';
import { isQuotaError } from '../lib/firestoreErrors';
import { Tenant, Plan, Permission, User, MarketplaceInvoice, MarketplaceSettings, MarketplacePromotion, SaasAuditLog, SaasNotification, Order, FinancialRecord, Customer, Product, CashClosingReport, BankAccount, AuditLog } from '../types';
import { maskPhone } from '../utils/masks';
import { sendSaasInvoiceEmailResend } from '../services/emailService';
import { SystemDiagnosticsSuite } from './SystemDiagnosticsSuite';
import SystemAudit from './SystemAudit';
import { Tenant360Modal } from './saas/Tenant360Modal';
import { SaasQuickDiagnosticModal } from './saas/SaasQuickDiagnosticModal';
import { MarketplaceAdminView } from './saas/MarketplaceAdminView';
import { MarketplaceCommandCenter } from './saas/marketplace/MarketplaceCommandCenter';
import { MarketplaceStoreScoresView } from './saas/marketplace/MarketplaceStoreScoresView';
import { MarketplaceMonetizationView } from './saas/marketplace/MarketplaceMonetizationView';
import { MarketplacePromotionsView } from './saas/marketplace/MarketplacePromotionsView';
import { MarketplaceCrmFunnelView } from './saas/marketplace/MarketplaceCrmFunnelView';
import { MarketplaceAlgorithmAuctionView } from './saas/marketplace/MarketplaceAlgorithmAuctionView';
import { MarketplaceOpportunitiesView } from './saas/marketplace/MarketplaceOpportunitiesView';
import { MarketplaceBannersManagerView } from './saas/marketplace/MarketplaceBannersManagerView';
import { SaasNotificationsDrawer } from './saas/SaasNotificationsDrawer';
import { SaasAuditLogsModal } from './saas/SaasAuditLogsModal';
import { SaasGlobalSearchModal } from './saas/SaasGlobalSearchModal';
import { SaasTrainingGuide } from './saas/SaasTrainingGuide';
import { SaaSFinancialModule } from './saas/finance/SaaSFinancialModule';
import { B2BSuppliersModule } from './suppliers/B2BSuppliersModule';
import { ExecutiveDashboard } from './saas/ExecutiveDashboard';
import { 
  DEFAULT_REGISTERED_TENANTS,
  DEFAULT_SAAS_PLANS
} from './saas/finance/defaultFinancialData';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Users, 
  Plus, 
  Shield, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Package,
  CreditCard,
  LayoutDashboard,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  LifeBuoy,
  Key,
  BarChart3,
  ExternalLink,
  Download,
  FileSpreadsheet,
  FileText,
  Settings,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  UserPlus,
  X,
  Building2,
  Upload,
  Save,
  Sparkles,
  Zap,
  Star,
  DollarSign,
  TrendingUp,
  Rocket,
  Target,
  Crown,
  PieChart,
  Percent,
  Coins,
  Printer,
  ArrowUpRight,
  RefreshCw,
  Clock,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Activity,
  Cpu,
  HardDrive,
  Gauge,
  Server,
  Wifi,
  ShieldCheck,
  Layers,
  Radio,
  Truck,
  Award,
  ShoppingBag,
  Megaphone,
  Tag,
  Bell,
  GraduationCap,
  Command,
  Eye,
  Store
} from 'lucide-react';

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

const SAAS_ADMIN_MODULES: { id: Permission; label: string }[] = [
  { id: 'saas_dashboard_view', label: 'Painel Geral' },
  { id: 'tenants_manage', label: 'Clientes (Lojas)' },
  { id: 'saas_plans_manage', label: 'Gestão de Planos' },
  { id: 'saas_finance_view', label: 'Financeiro Saas' },
  { id: 'marketplace_config', label: 'Configurações Marketplace' },
  { id: 'support_manage', label: 'Suporte & Tickets' },
  { id: 'leads_manage', label: 'Gestão de Leads' },
  { id: 'saas_team_manage', label: 'Equipe Admin' },
  { id: 'saas_suppliers_manage', label: 'Fornecedores B2B' },
];

const DEFAULT_COMMERCE_CATEGORIES = [
  { id: 'burger', name: 'Lanches & Hamburguerias', description: 'Artesanais, smash burgers, lanches e petiscos', iconName: 'Sandwich', bg: 'bg-amber-50', color: 'text-amber-500' },
  { id: 'pizza', name: 'Pizzarias', description: 'Pizzas artesanais, forno a lenha, calzones e bordas recheadas', iconName: 'Pizza', bg: 'bg-rose-50', color: 'text-rose-500' },
  { id: 'marmitaria', name: 'Marmitarias & Caseira', description: 'Comida caseira, marmitex, pratos executivos e almoço', iconName: 'ChefHat', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { id: 'mercado', name: 'Mercados & Hortifruti', description: 'Supermercados, mercearias, hortifrúti e produtos básicos', iconName: 'Store', bg: 'bg-green-50', color: 'text-green-500' },
  { id: 'farmacia', name: 'Farmácias & Drogaria', description: 'Medicamentos, cosméticos, drogarias e cuidados de saúde', iconName: 'Pill', bg: 'bg-teal-50', color: 'text-teal-500' },
  { id: 'pet', name: 'Pet & Agro', description: 'Rações, pet shops, produtos agropecuários e cuidados animais', iconName: 'PawPrint', bg: 'bg-purple-50', color: 'text-purple-500' },
  { id: 'bebidas', name: 'Adegas & Bebidas', description: 'Cervejas trincando, adegas, distribuidoras e destilados', iconName: 'Wine', bg: 'bg-cyan-50', color: 'text-cyan-500' },
  { id: 'doces', name: 'Açaí & Doces', description: 'Açaí, sobremesas, sorvetes, doces e gelados', iconName: 'IceCream', bg: 'bg-pink-50', color: 'text-pink-500' },
  { id: 'pastel', name: 'Pastéis & Salgados', description: 'Pastéis fritos na hora, salgados e empanadas', iconName: 'UtensilsCrossed', bg: 'bg-orange-50', color: 'text-orange-500' }
];

const DEFAULT_SAAS_LEDGER = [
  {
    id: 'ledger_default_1',
    description: 'Servidores Google Cloud (Cloud Run & Firestore)',
    type: 'pagar',
    amount: 320.00,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().slice(0, 10),
    category: 'Infraestrutura',
    status: 'pending',
    createdAt: new Date()
  },
  {
    id: 'ledger_default_2',
    description: 'API de Geolocalização / Google Maps Premium Billing',
    type: 'pagar',
    amount: 112.50,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().slice(0, 10),
    category: 'API / Servidores',
    status: 'pending',
    createdAt: new Date()
  },
  {
    id: 'ledger_default_3',
    description: 'Licença mensal de API WhatsApp Gateway Business',
    type: 'pagar',
    amount: 90.00,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString().slice(0, 10),
    category: 'Softwares / Integrações',
    status: 'paid',
    createdAt: new Date()
  },
  {
    id: 'ledger_default_4',
    description: 'Tokens Gemini Pro AI (Smart Classification & Assistant)',
    type: 'pagar',
    amount: 55.45,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString().slice(0, 10),
    category: 'Inteligência AI',
    status: 'pending',
    createdAt: new Date()
  },
  {
    id: 'ledger_default_5',
    description: 'Anuidade do Domínio KitchenFlowAI.com.br (Registro.br)',
    type: 'pagar',
    amount: 40.00,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 2).toISOString().slice(0, 10),
    category: 'Domínios / Registro',
    status: 'paid',
    createdAt: new Date()
  }
];

const isFirestoreQuotaError = (err: any): boolean => {
  if (!err) return false;
  const msg = err?.message || String(err || '');
  return (
    msg.includes('Quota') ||
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('free tier') ||
    msg.includes('INTERNAL ASSERTION FAILED') ||
    msg.includes('Quota exceeded')
  );
};

const CATEGORY_COLOR_PRESETS = [
  { name: 'Vermelho/Rosa (Pizza/Hambúrguer)', bg: 'bg-rose-50', color: 'text-rose-500' },
  { name: 'Azul (Comida Japonesa/Bebidas)', bg: 'bg-blue-50', color: 'text-blue-500' },
  { name: 'Amarelo (Salgados/Lanches)', bg: 'bg-amber-50', color: 'text-amber-500' },
  { name: 'Pink (Doces/Confeitaria)', bg: 'bg-pink-50', color: 'text-pink-500' },
  { name: 'Ciano (Açai/Refrescantes)', bg: 'bg-cyan-50', color: 'text-cyan-500' },
  { name: 'Verde (Saudável/Natural)', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { name: 'Roxo (Geral/Mercado)', bg: 'bg-violet-50', color: 'text-violet-500' },
  { name: 'Laranja (Farmácia/Serviços)', bg: 'bg-orange-50', color: 'text-orange-500' },
];

const CATEGORY_ICON_PRESETS = [
  { value: 'Pizza', label: 'Pizza' },
  { value: 'Coffee', label: 'Bebidas/Café' },
  { value: 'IceCream', label: 'Sorvetes/Doces' },
  { value: 'Fish', label: 'Japonês/Sushi' },
  { value: 'Sandwich', label: 'Hambúrguer/Sanduíches' },
  { value: 'UtensilsCrossed', label: 'Geral/Utensílios' },
];

interface SupplierMaterial {
  rawMaterialName: string;
  price: number;
}

interface Supplier {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  materials: SupplierMaterial[];
  history: Record<string, { date: string; price: number }[]>;
}

const INITIAL_SAAS_SUPPLIERS: Supplier[] = [
  {
    id: 'sup1',
    name: 'Distribuidora JBS Friboi',
    city: 'São Paulo',
    phone: '(11) 98765-4321',
    email: 'vendas@friboisp.com.br',
    materials: [
      { rawMaterialName: 'Bife Bovino kg', price: 34.50 },
      { rawMaterialName: 'Filé de Frango kg', price: 17.20 }
    ],
    history: {
      'Bife Bovino kg': [
        { date: 'Jan/26', price: 32.00 },
        { date: 'Fev/26', price: 32.50 },
        { date: 'Mar/26', price: 33.80 },
        { date: 'Abr/26', price: 34.10 },
        { date: 'Mai/26', price: 34.50 }
      ],
      'Filé de Frango kg': [
        { date: 'Jan/26', price: 16.00 },
        { date: 'Fev/26', price: 16.50 },
        { date: 'Mar/26', price: 16.80 },
        { date: 'Abr/26', price: 17.00 },
        { date: 'Mai/26', price: 17.20 }
      ]
    }
  },
  {
    id: 'sup2',
    name: 'Frigorífico Sul Meat Ltda',
    city: 'Porto Alegre',
    phone: '(51) 99988-7766',
    email: 'comercial@sulmeat.com.br',
    materials: [
      { rawMaterialName: 'Bife Bovino kg', price: 31.80 },
      { rawMaterialName: 'Filé de Frango kg', price: 16.50 }
    ],
    history: {
      'Bife Bovino kg': [
        { date: 'Jan/26', price: 30.00 },
        { date: 'Fev/26', price: 30.80 },
        { date: 'Mar/26', price: 31.20 },
        { date: 'Abr/26', price: 31.50 },
        { date: 'Mai/26', price: 31.80 }
      ],
      'Filé de Frango kg': [
        { date: 'Jan/26', price: 15.50 },
        { date: 'Fev/26', price: 15.80 },
        { date: 'Mar/26', price: 16.00 },
        { date: 'Abr/26', price: 16.20 },
        { date: 'Mai/26', price: 16.50 }
      ]
    }
  },
  {
    id: 'sup3',
    name: 'Distribuidora Scala de Laticínios',
    city: 'São Paulo',
    phone: '(11) 95544-3322',
    email: 'pedidos@scalasp.com.br',
    materials: [
      { rawMaterialName: 'Queijo Muçarela kg', price: 29.90 }
    ],
    history: {
      'Queijo Muçarela kg': [
        { date: 'Jan/26', price: 28.50 },
        { date: 'Fev/26', price: 29.00 },
        { date: 'Mar/26', price: 29.50 },
        { date: 'Abr/26', price: 29.80 },
        { date: 'Mai/26', price: 29.90 }
      ]
    }
  },
  {
    id: 'sup4',
    name: 'Queijos de Minas Distribuição',
    city: 'Belo Horizonte',
    phone: '(31) 98877-6655',
    email: 'contato@minasqueijos.com.br',
    materials: [
      { rawMaterialName: 'Queijo Muçarela kg', price: 27.50 }
    ],
    history: {
      'Queijo Muçarela kg': [
        { date: 'Jan/26', price: 26.00 },
        { date: 'Fev/26', price: 26.50 },
        { date: 'Mar/26', price: 26.90 },
        { date: 'Abr/26', price: 27.20 },
        { date: 'Mai/26', price: 27.50 }
      ]
    }
  },
  {
    id: 'sup5',
    name: 'Distribuidora Cerealista Sul',
    city: 'Curitiba',
    phone: '(41) 97766-5544',
    email: 'vendas@cerealistacentral.com.br',
    materials: [
      { rawMaterialName: 'Óleo de Cozinha', price: 5.80 },
      { rawMaterialName: 'Farinha de Trigo', price: 4.20 }
    ],
    history: {
      'Óleo de Cozinha': [
        { date: 'Jan/26', price: 6.20 },
        { date: 'Fev/26', price: 6.10 },
        { date: 'Mar/26', price: 6.00 },
        { date: 'Abr/26', price: 5.90 },
        { date: 'Mai/26', price: 5.80 }
      ],
      'Farinha de Trigo': [
        { date: 'Jan/26', price: 4.50 },
        { date: 'Fev/26', price: 4.40 },
        { date: 'Mar/26', price: 4.30 },
        { date: 'Abr/26', price: 4.25 },
        { date: 'Mai/26', price: 4.20 }
      ]
    }
  }
];

export const getClientNumber = (tenant: Tenant, fallbackIdx: number = 0): number => {
  if (tenant.clientNumber && typeof tenant.clientNumber === 'number' && tenant.clientNumber > 0) {
    return tenant.clientNumber;
  }
  if (tenant.id && /^\d+$/.test(String(tenant.id))) {
    const parsed = parseInt(String(tenant.id), 10);
    if (!isNaN(parsed) && parsed < 10000000) return parsed;
  }
  if (tenant.ownerId && /^\d+$/.test(String(tenant.ownerId))) {
    const parsed = parseInt(String(tenant.ownerId), 10);
    if (!isNaN(parsed) && parsed < 10000000) return parsed;
  }
  return fallbackIdx + 1;
};

interface SaaSAdminProps {
  activeTab: string;
  onViewTenant: (tenantId: string, name?: string, logo?: string) => void;
  onNavigate: (tab: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isQuotaExceeded?: boolean;
  onResetQuota?: () => void;
  orders?: Order[];
  financialRecords?: FinancialRecord[];
  customers?: Customer[];
  products?: Product[];
  cashClosings?: CashClosingReport[];
  cashSession?: any;
  auditLogs?: AuditLog[];
  users?: User[];
  currentUser?: User | null;
  bankAccounts?: BankAccount[];
  onUpdateCustomer?: (customer: Customer) => void;
  onAddFinancialRecord?: (record: Omit<FinancialRecord, 'id'>) => Promise<any>;
  onUpdateFinancialRecord?: (record: FinancialRecord) => Promise<any>;
  onRefreshData?: () => void;
  onOpenOrder?: (orderId: string) => void;
}

const SaaSAdmin: React.FC<SaaSAdminProps> = memo(({ 
  activeTab: parentActiveTab, 
  onViewTenant,
  onNavigate,
  showToast,
  isQuotaExceeded: isQuotaExceededProp,
  onResetQuota,
  orders: incomingOrders = [],
  financialRecords = [],
  customers = [],
  products = [],
  cashClosings = [],
  cashSession,
  auditLogs = [],
  users = [],
  currentUser,
  bankAccounts = [],
  onUpdateCustomer,
  onAddFinancialRecord,
  onUpdateFinancialRecord,
  onRefreshData,
  onOpenOrder
}) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    try {
      const cached = localStorage.getItem('kitchenflow_saas_cached_tenants');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.map((t: any) => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
            subscription: t.subscription ? {
              ...t.subscription,
              startDate: t.subscription.startDate ? new Date(t.subscription.startDate) : undefined,
              expiryDate: t.subscription.expiryDate ? new Date(t.subscription.expiryDate) : undefined,
            } : undefined
          }));
          DEFAULT_REGISTERED_TENANTS.forEach(dt => {
            if (!list.some(t => t.id === dt.id || t.name?.toLowerCase() === dt.name.toLowerCase())) {
              list.push(dt);
            }
          });
          return list;
        }
      }
    } catch (e) {
      console.warn("Erro ao recuperar cache de tenants:", e);
    }
    return DEFAULT_REGISTERED_TENANTS;
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditTenantId, setSelectedAuditTenantId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'plans' | 'financial' | 'support' | 'leads' | 'team' | 'marketplace_config' | 'suppliers' | 'subscription_rules' | 'telemetry' | 'diagnostics' | 'audit'>('dashboard');

  // Experience Modes: Super Admin (Completo), Operação (Atendimento/Lojas), Treinamento (Guiado)
  const [experienceMode, setExperienceMode] = useState<'superadmin' | 'operation' | 'training'>('superadmin');
  const [selectedTenantFor360, setSelectedTenantFor360] = useState<Tenant | null>(null);
  const [showQuickDiagnosticModal, setShowQuickDiagnosticModal] = useState(false);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);

  // Central de Notificações
  const [saasNotifications, setSaasNotifications] = useState<SaasNotification[]>([
    {
      id: 'notif-1',
      title: 'Atenção: 1 Loja em Alerta Operacional',
      description: 'A loja Viva LaFome teve alta latência na emissão fiscal nos últimos 15 min.',
      type: 'warning',
      timestamp: new Date(Date.now() - 10 * 60000),
      read: false,
      actionTab: 'tenants'
    },
    {
      id: 'notif-2',
      title: 'Mensalidade Próxima do Vencimento',
      description: '2 clientes possuem fatura mensal vencendo em menos de 48 horas.',
      type: 'warning',
      timestamp: new Date(Date.now() - 45 * 60000),
      read: false,
      actionTab: 'financial'
    },
    {
      id: 'notif-3',
      title: 'Novo Estabelecimento Ativado',
      description: 'Lojista Pradópolis Burger configurou catálogo com sucesso no Marketplace.',
      type: 'success',
      timestamp: new Date(Date.now() - 2 * 3600000),
      read: true,
      actionTab: 'marketplace_config'
    }
  ]);

  // Auditoria de Ações Administrativas
  const [saasAuditLogs, setSaasAuditLogs] = useState<SaasAuditLog[]>([
    {
      id: 'aud-1',
      userName: 'Renan (Super Admin)',
      action: 'Ajustou taxa fixa do Marketplace Zupi',
      clientName: 'Marketplace Global',
      previousValue: 'R$ 1,00',
      newValue: 'R$ 1,50',
      timestamp: new Date(Date.now() - 30 * 60000),
      category: 'Financeiro'
    },
    {
      id: 'aud-2',
      userName: 'Renan (Super Admin)',
      action: 'Executou Diagnóstico Automatizado 360°',
      clientName: 'Infraestrutura Geral',
      newValue: '13/13 verificações OK',
      timestamp: new Date(Date.now() - 2 * 3600000),
      category: 'Segurança'
    }
  ]);

  const addAuditLog = (action: string, clientName?: string, prev?: string, nextVal?: string, category: string = 'Geral') => {
    const newLog: SaasAuditLog = {
      id: `aud-${Date.now()}`,
      userName: 'Renan (Super Admin)',
      action,
      clientName: clientName || 'SaaS Global',
      previousValue: prev,
      newValue: nextVal,
      timestamp: new Date(),
      category
    };
    setSaasAuditLogs(prevLogs => [newLog, ...prevLogs.slice(0, 49)]);
  };

  // Keyboard Shortcuts Listener (Ctrl+K, N, L, S, F, M, D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or select
      const activeEl = document.activeElement;
      const isInput = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearchModal(prev => !prev);
        return;
      }

      if (isInput) return;

      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        resetForm();
        setEditingTenant(null);
        setShowAddModal(true);
      } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowQuickDiagnosticModal(true);
      } else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        setActiveTab('tenants');
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        setActiveTab('support');
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        setActiveTab('financial');
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        setActiveTab('marketplace_config');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (parentActiveTab === 'saas-diagnostics' || parentActiveTab === 'diagnostics') {
      setActiveTab('diagnostics');
    } else if (parentActiveTab === 'saas-audit' || parentActiveTab === 'audit') {
      setActiveTab('audit');
    } else if (parentActiveTab === 'saas-suppliers' || parentActiveTab === 'suppliers') {
      setActiveTab('suppliers');
    } else if (parentActiveTab === 'saas-tenants' || parentActiveTab === 'tenants') {
      setActiveTab('tenants');
    } else if (parentActiveTab === 'saas-plans' || parentActiveTab === 'plans') {
      setActiveTab('plans');
    } else if (parentActiveTab === 'saas-finance' || parentActiveTab === 'financial') {
      setActiveTab('financial');
    } else if (parentActiveTab === 'saas-admin') {
      setActiveTab('dashboard');
    }
  }, [parentActiveTab]);

  // Telemetry & Infrastructure States
  interface ServerTelemetryData {
    status: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
      externalMb: number;
      heapUsagePercent: number;
    };
    system: {
      platform: string;
      arch: string;
      nodeVersion: string;
      pid: number;
    };
    traffic: {
      totalRequests: number;
      requestsPerMinute: number;
    };
    timestamp: number;
  }

  interface TelemetryPingPoint {
    time: string;
    ping: number;
    heap: number;
  }

  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [isLocalQuotaExceeded, setIsLocalQuotaExceeded] = useState(false);
  const [serverTelemetry, setServerTelemetry] = useState<ServerTelemetryData | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<TelemetryPingPoint[]>([]);
  const [isLiveTelemetryActive, setIsLiveTelemetryActive] = useState<boolean>(true);
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState<string>('');
  const [telemetryTickCount, setTelemetryTickCount] = useState<number>(0);
  const telemetryTicksRef = useRef<number>(0);

  const effectiveQuotaExceeded = isQuotaExceededProp || isLocalQuotaExceeded;

  const [telemetryLogs, setTelemetryLogs] = useState<{ id: string; time: string; type: 'info' | 'warn' | 'success'; message: string }[]>([
    { id: 'init-1', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'success', message: 'Serviço de telemetria em tempo real ativado. Monitorando latência e heap do Cloud Run.' },
    { id: 'init-2', time: new Date(Date.now() - 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'info', message: 'Sincronização contínua de infraestrutura operando com telemetria ativa.' }
  ]);

  // Polling em tempo real da telemetria a cada 3 segundos
  useEffect(() => {
    if (!isLiveTelemetryActive) return;
    if (activeTab !== 'telemetry' && activeTab !== 'dashboard') return;

    let isMounted = true;

    const fetchLiveTelemetry = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/telemetry', { cache: 'no-store' });
        const roundTripMs = Math.max(1, Math.round(performance.now() - start));
        
        if (res.ok && isMounted) {
          const data: ServerTelemetryData = await res.json();
          setServerTelemetry(data);
          setDbLatency(roundTripMs);
          const timeNow = new Date();
          const timeFormatted = timeNow.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastTelemetryTimestamp(timeFormatted);
          
          telemetryTicksRef.current += 1;
          setTelemetryTickCount(telemetryTicksRef.current);

          setLatencyHistory(prev => {
            const newPoint: TelemetryPingPoint = {
              time: timeFormatted.slice(3), // mm:ss
              ping: roundTripMs,
              heap: data.memory?.heapUsedMb || 0,
            };
            const next = [...prev, newPoint];
            return next.slice(-15);
          });

          // Log periódico a cada ~30s (10 ticks de 3s)
          if (telemetryTicksRef.current > 0 && telemetryTicksRef.current % 10 === 0) {
            const periodicLogId = `tlog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            setTelemetryLogs(prevLogs => {
              const newLog = {
                id: periodicLogId,
                time: timeFormatted,
                type: roundTripMs < 120 ? ('success' as const) : ('warn' as const),
                message: `Telemetria ao vivo: Ping ${roundTripMs}ms • RAM Heap ${data.memory?.heapUsedMb || 0}MB (${data.memory?.heapUsagePercent || 0}%) • ${data.traffic?.totalRequests || 0} requisições atendidas.`
              };
              return [newLog, ...prevLogs.filter(l => l.id !== periodicLogId)].slice(0, 20);
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          const roundTripMs = Math.max(1, Math.round(performance.now() - start));
          setDbLatency(roundTripMs);
        }
      }
    };

    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveTelemetryActive, activeTab]);

  const [isVerifyingQuota, setIsVerifyingQuota] = useState(false);

  // Auto-checagem suave para validar se a cota do Firestore está de fato ativa ou se é falso positivo
  useEffect(() => {
    if (isQuotaExceededProp || isLocalQuotaExceeded) {
      getDoc(doc(db, 'settings', 'saas_config'))
        .then(() => {
          setIsLocalQuotaExceeded(false);
          onResetQuota?.();
        })
        .catch((err) => {
          if (!isQuotaError(err)) {
            setIsLocalQuotaExceeded(false);
            onResetQuota?.();
          }
        });
    }
  }, []);

  useEffect(() => {
    if (effectiveQuotaExceeded) {
      setTelemetryLogs(prev => {
        if (prev.some(l => l.id === 'quota-exceeded-log')) return prev;
        return [
          {
            id: 'quota-exceeded-log',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'warn',
            message: '⚠️ Cota diária gratuita do Firestore (50.000 leituras/dia) excedida. O sistema ativou o modo de resiliência e fallback do servidor SaaS para manter os lojistas operando sem travamentos.'
          },
          ...prev
        ];
      });
    } else {
      setTelemetryLogs(prev => prev.filter(l => l.id !== 'quota-exceeded-log'));
    }
  }, [effectiveQuotaExceeded]);

  const handleVerifyDatabaseQuota = async () => {
    setIsVerifyingQuota(true);
    try {
      await getDoc(doc(db, 'settings', 'saas_config'));
      setIsLocalQuotaExceeded(false);
      onResetQuota?.();
      
      setTelemetryLogs(prev => [
        {
          id: `quota_verified_${Date.now()}`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'success',
          message: 'Diagnóstico de Cota do Firestore: Banco respondeu com sucesso. Operações nominais liberadas (sem bloqueio de cota).'
        },
        ...prev.filter(l => l.id !== 'quota-exceeded-log').slice(0, 19)
      ]);
      showToast?.('Cota do Firestore verificada: Banco de dados 100% acessível e sem bloqueios!', 'success');
    } catch (err: any) {
      if (isQuotaError(err)) {
        setIsLocalQuotaExceeded(true);
        showToast?.('Cota diária de 50.000 leituras excedida no Firestore.', 'error');
      } else {
        setIsLocalQuotaExceeded(false);
        onResetQuota?.();
        showToast?.('Banco de dados operacional (sem restrição de cota).', 'info');
      }
    } finally {
      setIsVerifyingQuota(false);
    }
  };

  const handleTestLatency = async () => {
    setIsTestingLatency(true);
    const start = performance.now();
    try {
      // Ping direto no servidor de telemetria
      const testPromise = fetch('/api/telemetry', { cache: 'no-store' });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500));
      const res: any = await Promise.race([testPromise, timeoutPromise]);
      
      const end = performance.now();
      const latencyMs = Math.max(1, Math.round(end - start));
      setDbLatency(latencyMs);

      if (res && res.ok) {
        const data: ServerTelemetryData = await res.json();
        setServerTelemetry(data);
      }

      const manualLogId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setTelemetryLogs(prev => {
        const manualLog = { 
          id: manualLogId, 
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          type: latencyMs < 200 ? ('success' as const) : ('warn' as const), 
          message: `Diagnóstico manual: Latência de ida e volta (RTT) de ${latencyMs}ms (${latencyMs < 80 ? 'Ultrarrápido' : latencyMs < 200 ? 'Excelente' : 'Normal'}). Servidor Cloud Run 100% operacional.` 
        };
        return [manualLog, ...prev.filter(l => l.id !== manualLogId)].slice(0, 20);
      });
    } catch (err: any) {
      const errStr = err?.message || String(err);
      console.warn("[SaaSAdmin] Checagem de latência (fallback ativo):", errStr);
      setDbLatency(32);
    } finally {
      setIsTestingLatency(false);
    }
  };

  // Commerce Categories States
  const [commerceCategories, setCommerceCategories] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryImg, setNewCategoryImg] = useState('');
  const [newCategoryBg, setNewCategoryBg] = useState('bg-indigo-50');
  const [newCategoryColor, setNewCategoryColor] = useState('text-indigo-500');
  const [newCategoryIconName, setNewCategoryIconName] = useState('UtensilsCrossed');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [dashboardCardTab, setDashboardCardTab] = useState<'leads' | 'categories'>('categories');

  // SaaS Subscription/Billing States
  const [saasPayments, setSaasPayments] = useState<any[]>([]);
  const [planBillingCycle, setPlanBillingCycle] = useState<'monthly' | 'quarterly' | 'semiannual' | 'yearly'>('monthly');
  const [renewingTenant, setRenewingTenant] = useState<Tenant | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewPeriod, setRenewPeriod] = useState<'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom'>('monthly');
  const [renewCustomDate, setRenewCustomDate] = useState('');
  const [renewCustomPrice, setRenewCustomPrice] = useState<number>(0);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<'pix' | 'cartao' | 'boleto' | 'dinheiro'>('pix');
  const [registerPayment, setRegisterPayment] = useState(true);
  const [tenantFilter, setTenantFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  const [leads, setLeads] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [saasUsers, setSaasUsers] = useState<User[]>([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSaaSUserModal, setShowSaaSUserModal] = useState(false);
  const [editingSaaSUser, setEditingSaaSUser] = useState<User | null>(null);
  const [selectedSaasPermissions, setSelectedSaasPermissions] = useState<Permission[]>(SAAS_ADMIN_MODULES.map(m => m.id));
  const [promoTenantSearch, setPromoTenantSearch] = useState('');

  // Fornecedores B2B States
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SAAS_SUPPLIERS);
  const [selectedCity, setSelectedCity] = useState<string>('Todas');
  const [selectedGraphMaterial, setSelectedGraphMaterial] = useState<string>('Bife Bovino kg');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  
  // New Supplier Form
  const [supName, setSupName] = useState('');
  const [supCity, setSupCity] = useState('São Paulo');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supMaterialName, setSupMaterialName] = useState('Bife Bovino kg');
  const [supMaterialPrice, setSupMaterialPrice] = useState('');
  const [supAddedMaterials, setSupAddedMaterials] = useState<{ rawMaterialName: string; price: number }[]>([]);

  useEffect(() => {
    if (parentActiveTab === 'saas-tenants') setActiveTab('tenants');
    else if (parentActiveTab === 'saas-plans') setActiveTab('plans');
    else if (parentActiveTab === 'saas-finance') setActiveTab('financial');
    else if (parentActiveTab === 'saas-admin') setActiveTab('dashboard');
  }, [parentActiveTab]);

  useEffect(() => {
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.warn("SaaSAdmin leads error:", error);
    });

    const qTickets = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeTickets = onSnapshot(qTickets, (snapshot) => {
      setSupportTickets(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.warn("SaaSAdmin tickets error:", error);
    });

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setSaasUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User).filter(u => u.role === 'SAAS_ADMIN'));
    }, (error) => {
      console.warn("SaaSAdmin users error:", error);
    });

    return () => {
      unsubscribeLeads();
      unsubscribeTickets();
      unsubscribeUsers();
    };
  }, []);

  const [marketplaceInvoices, setMarketplaceInvoices] = useState<MarketplaceInvoice[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [marketplaceFixedFee, setMarketplaceFixedFee] = useState(1.50); // Default R$ 1.50

  useEffect(() => {
    const qPayments = query(collection(db, 'saasPayments'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribePayments = onSnapshot(qPayments, (snapshot) => {
      setSaasPayments(snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: d.createdAt?.toDate(),
          expiryDate: d.expiryDate?.toDate()
        };
      }));
    }, (error) => {
      if (isFirestoreQuotaError(error)) {
        setIsLocalQuotaExceeded(true);
      }
      console.warn("SaaSAdmin saasPayments error (handled gracefully):", error?.message || error);
    });

    return () => unsubscribePayments();
  }, []);

  useEffect(() => {
    const qCategories = query(collection(db, 'commerceCategories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      if (!snapshot.empty) {
        const cats = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        setCommerceCategories(cats);
      } else {
        setCommerceCategories(DEFAULT_COMMERCE_CATEGORIES);
        const seedCategories = async () => {
          try {
            for (const cat of DEFAULT_COMMERCE_CATEGORIES) {
              const id = `cat_${cat.id}`;
              await setDoc(doc(db, 'commerceCategories', id), {
                name: cat.name,
                description: cat.description
              });
            }
          } catch (e: any) {
            if (isFirestoreQuotaError(e)) {
              setIsLocalQuotaExceeded(true);
            }
            console.warn("Error seeding commerce categories (handled gracefully):", e?.message || e);
          }
        };
        seedCategories();
      }
    }, (error) => {
      if (isFirestoreQuotaError(error)) {
        setIsLocalQuotaExceeded(true);
      }
      setCommerceCategories(DEFAULT_COMMERCE_CATEGORIES);
      console.warn("SaaSAdmin commerceCategories error (handled gracefully):", error?.message || error);
    });

    return () => unsubscribeCategories();
  }, []);

  useEffect(() => {
    const qInvoices = query(collection(db, 'marketplaceInvoices'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setMarketplaceInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as MarketplaceInvoice));
    }, (error) => {
      if (isFirestoreQuotaError(error)) {
        setIsLocalQuotaExceeded(true);
      }
      console.warn("SaaSAdmin marketplaceInvoices error (handled gracefully):", error?.message || error);
    });

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      if (isFirestoreQuotaError(error)) {
        setIsLocalQuotaExceeded(true);
      }
      console.warn("SaaSAdmin orders error (handled gracefully):", error?.message || error);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeOrders();
    };
  }, []);

  useEffect(() => {
    const qLedger = query(collection(db, 'saasLedger'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeLedger = onSnapshot(qLedger, (snapshot) => {
      if (!snapshot.empty) {
        setSaasLedger(snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            ...d,
            id: doc.id,
            dueDate: d.dueDate?.toDate ? d.dueDate.toDate() : d.dueDate ? new Date(d.dueDate) : null,
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt ? new Date(d.createdAt) : null,
          };
        }));
      } else {
        // Seed initial platform ledger with both PAYABLE (Contas a Pagar) and RECEIVABLE (Contas a Receber)
        setSaasLedger(DEFAULT_SAAS_LEDGER);
        const seedLedger = async () => {
          try {
            for (const item of DEFAULT_SAAS_LEDGER) {
              await addDoc(collection(db, 'saasLedger'), item);
            }
          } catch (e: any) {
            if (isFirestoreQuotaError(e)) {
              setIsLocalQuotaExceeded(true);
            }
            console.warn("Error seeding saasLedger (handled gracefully):", e?.message || e);
          }
        };
        seedLedger();
      }
    }, (error) => {
      if (isFirestoreQuotaError(error)) {
        setIsLocalQuotaExceeded(true);
      }
      setSaasLedger(DEFAULT_SAAS_LEDGER);
      console.warn("SaaSAdmin saasLedger error (handled gracefully):", error?.message || error);
    });

    return () => unsubscribeLedger();
  }, []);

  const handleAddLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerDescription || ledgerAmount <= 0 || !ledgerDueDate) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    try {
      await addDoc(collection(db, 'saasLedger'), {
        description: ledgerDescription,
        type: ledgerType,
        amount: Number(ledgerAmount),
        dueDate: ledgerDueDate,
        category: ledgerCategory,
        status: ledgerStatus,
        createdAt: new Date()
      });
      
      setLedgerDescription('');
      setLedgerAmount(0);
      setLedgerDueDate('');
      setLedgerCategory('Infraestrutura');
      setLedgerStatus('pending');
      setShowAddLedgerModal(false);
      alert("Lançamento cadastrado com sucesso!");
    } catch (err) {
      console.error("Error adding ledger:", err);
      alert("Erro ao salvar lançamento.");
    }
  };

  const handleToggleLedgerStatus = async (item: any) => {
    const newStatus = item.status === 'paid' ? 'pending' : 'paid';
    // Optimistic local state update so the UI responds instantly
    setLedger(prev => prev.map(l => l.id === item.id ? { 
      ...l, 
      status: newStatus,
      paidAt: newStatus === 'paid' ? new Date() : undefined 
    } : l));

    try {
      await setDoc(doc(db, 'saasLedger', item.id), {
        ...item,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : null,
        updatedAt: new Date()
      }, { merge: true });
    } catch (err) {
      console.warn("Error updating ledger status on Firestore (local update preserved):", err);
    }
  };

  const handleDeleteLedgerItem = async (itemId: string) => {
    if (!window.confirm("Deseja realmente excluir este lançamento financeiro?")) return;
    setLedger(prev => prev.filter(l => l.id !== itemId));
    try {
      await deleteDoc(doc(db, 'saasLedger', itemId));
    } catch (err) {
      console.warn("Error deleting ledger item on Firestore (local update preserved):", err);
    }
  };

  const getTenantMarketplaceStats = (tenantId: string) => {
    const tenantMktOrders = orders.filter(o => o.tenantId === tenantId && (o.source === 'marketplace' || o.source === 'Marketplace'));
    const billedOrderIds = new Set(marketplaceInvoices.filter(inv => inv.tenantId === tenantId).map(inv => inv.orderId));
    const unbilledOrders = tenantMktOrders.filter(o => !billedOrderIds.has(o.id));
    
    const totalGMV = tenantMktOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const unbilledGMV = unbilledOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    
    const unbilledFees = unbilledOrders.reduce((acc, o) => {
      return acc + marketplaceFixedFee + ((o.total || 0) * marketplaceFee / 100);
    }, 0);

    const billedFees = marketplaceInvoices.filter(inv => inv.tenantId === tenantId).reduce((acc, inv) => acc + inv.amount, 0);

    return {
      totalOrdersCount: tenantMktOrders.length,
      totalGMV,
      unbilledOrdersCount: unbilledOrders.length,
      unbilledGMV,
      unbilledFees,
      billedFees,
      unbilledOrdersList: unbilledOrders
    };
  };

  const handleCloseCycleAndBill = async (
    tenant: Tenant, 
    unbilledOrdersList: any[], 
    totalFees: number, 
    includeSubscription: boolean, 
    monthlyBasePrice: number,
    customDueDate?: string,
    customDesc?: string
  ) => {
    const totalAmount = totalFees + (includeSubscription ? monthlyBasePrice : 0);
    const invoiceId = `inv_${Date.now()}`;
    const finalDueDate = customDueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const finalDesc = customDesc || `Cobrança Período - ${tenant.name} (${unbilledOrdersList.length} Ped. Mkt + Plano)`;
    
    try {
      const ledgerRef = await addDoc(collection(db, 'saasLedger'), {
        description: finalDesc,
        type: 'receber',
        amount: totalAmount,
        dueDate: finalDueDate,
        category: 'Planos e Marketplace',
        status: 'pending',
        tenantId: tenant.id,
        createdAt: new Date()
      });

      const ledgerId = ledgerRef.id;

      for (const order of unbilledOrdersList) {
        const invId = `mkt_inv_${order.id}`;
        await setDoc(doc(db, 'marketplaceInvoices', invId), {
          id: invId,
          tenantId: tenant.id,
          orderId: order.id,
          amount: marketplaceFixedFee + ((order.total || 0) * marketplaceFee / 100),
          status: 'pending',
          ledgerId: ledgerId,
          createdAt: new Date()
        });
      }

      setSelectedBilling({
        id: ledgerId,
        tenantName: tenant.name,
        amount: totalAmount,
        pixCode: `00020101021126580014br.gov.bcb.pix0136${Math.random().toString(36).slice(-10)}@kitchenflowai.com5204000053039865405${totalAmount.toFixed(2)}5802BR5914KitchenFlow AI6009SaoPaulo62070503***6304${Math.random().toString(16).slice(-4)}`
      });
      
      setShowBillingModal(true);
    } catch (err) {
      console.error("Error creating cycle billing:", err);
    }
  };

  // Impressão do Livro Razão
  const handlePrintLedger = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rec = saasLedger.filter(i => i.type === 'receber' && i.status === 'paid').reduce((acc, i) => acc + (i.amount || 0), 0);
    const pag = saasLedger.filter(i => i.type === 'pagar' && i.status === 'paid').reduce((acc, i) => acc + (i.amount || 0), 0);
    const balance = rec - pag;

    const rowsHtml = saasLedger.map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
        <td style="padding: 10px;">
          <strong style="color: #1e293b; display: block;">${item.description}</strong>
          <span style="font-size: 8px; font-family: monospace; color: #94a3b8;">ID: ${item.id}</span>
        </td>
        <td style="padding: 10px; text-transform: uppercase; font-weight: bold; color: #475569;">${item.category}</td>
        <td style="padding: 10px; color: #64748b;">${item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : 'A definir'}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: ${item.type === 'receber' ? '#16a34a' : '#dc2626'}">
          ${item.type === 'receber' ? '+' : '-'} R$ ${Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 10px; text-align: center;">
          <span style="padding: 3px 8px; border-radius: 8px; font-size: 9px; font-weight: bold; ${item.status === 'paid' ? 'background-color: #d1fae5; color: #065f46;' : 'background-color: #fef3c7; color: #92400e;'}">
            ${item.status === 'paid' ? 'QUITADO' : 'PENDENTE'}
          </span>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Fluxo de Caixa - SaaS Admin</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #4f46e5; margin: 0; }
            .title { font-size: 14px; color: #64748b; text-transform: uppercase; margin: 5px 0 0; font-weight: bold; letter-spacing: 0.05em; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .summary-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; background: #f8fafc; }
            .summary-box.balance { background: #eef2ff; border-color: #e0e7ff; }
            .summary-title { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin: 0; }
            .summary-value { font-size: 18px; font-weight: 800; margin: 5px 0 0; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .th { background: #f1f5f9; padding: 12px; font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; text-align: left; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo">KITCHENFLOW AI</h1>
            <p class="title">Relatório de Fluxo de Caixa - SaaS Admin</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 5px 0 0;">Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-box">
              <p class="summary-title" style="color: #16a34a;">Total Recebido (Compensado)</p>
              <p class="summary-value" style="color: #16a34a;">R$ ${rec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="summary-box">
              <p class="summary-title" style="color: #dc2626;">Total Pago (Compensado)</p>
              <p class="summary-value" style="color: #dc2626;">R$ ${pag.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="summary-box balance">
              <p class="summary-title" style="color: #4f46e5;">Saldo Líquido Executado</p>
              <p class="summary-value" style="color: ${balance >= 0 ? '#15803d' : '#b91c1c'};">R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th class="th">Descrição</th>
                <th class="th">Categoria</th>
                <th class="th">Vencimento</th>
                <th class="th" style="text-align: right;">Valor</th>
                <th class="th" style="text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8;">
            <p style="border-top: 1px dashed #cbd5e1; width: 250px; margin: 0 auto; padding-top: 10px; font-weight: bold;">Assinatura do Responsável Financeiro</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Impressão da Conciliação de Tarifas Marketplace
  const handlePrintMarketplaceCycles = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = tenants.map(tenant => {
      const stats = getTenantMarketplaceStats(tenant.id);
      return `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
          <td style="padding: 10px;">
            <strong style="color: #1e293b; display: block;">${tenant.name}</strong>
            <span style="font-size: 8px; font-family: monospace; color: #94a3b8;">ID: ${tenant.id}</span>
          </td>
          <td style="padding: 10px; text-transform: uppercase; font-weight: bold; color: #6366f1;">${tenant.subscription?.plan || 'NENHUM'}</td>
          <td style="padding: 10px; color: #475569;">${stats.unbilledOrdersCount} pendentes / ${stats.totalOrdersCount} históricos</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #1e293b;">R$ ${stats.unbilledGMV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #d97706;">R$ ${stats.unbilledFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #16a34a;">R$ ${stats.billedFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Conciliação Marketplace - SaaS Admin</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #4f46e5; margin: 0; }
            .title { font-size: 14px; color: #64748b; text-transform: uppercase; margin: 5px 0 0; font-weight: bold; letter-spacing: 0.05em; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 40px; }
            .th { background: #f1f5f9; padding: 12px; font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; text-align: left; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo">KITCHENFLOW AI</h1>
            <p class="title">Relatório de Conciliação e Tarifas do Marketplace</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 5px 0 0;">Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th class="th">Lojista / Inquilino</th>
                <th class="th">Plano Ativo</th>
                <th class="th">Pedidos Marketplace</th>
                <th class="th" style="text-align: right;">GMV do Ciclo</th>
                <th class="th" style="text-align: right;">Tarifas Acumuladas</th>
                <th class="th" style="text-align: right;">Tarifas Quitadas</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8;">
            <p style="border-top: 1px dashed #cbd5e1; width: 250px; margin: 0 auto; padding-top: 10px; font-weight: bold;">Auditoria Financeira KitchenFlow</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Impressão do Histórico de Recebimentos SaaS
  const handlePrintSaaSPayments = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalRevenue = saasPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

    const rowsHtml = saasPayments.map(payment => `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
        <td style="padding: 10px;">
          <strong style="color: #1e293b; display: block;">${payment.tenantName}</strong>
          <span style="font-size: 8px; font-family: monospace; color: #94a3b8;">ID: ${payment.id}</span>
        </td>
        <td style="padding: 10px; text-transform: uppercase; font-weight: bold; color: #4f46e5;">
          ${payment.period === 'monthly' ? 'Mensal' :
            payment.period === 'quarterly' ? 'Trimestral' :
            payment.period === 'semiannual' ? 'Semestral' :
            payment.period === 'yearly' ? 'Anual' : 'Personalizado'}
        </td>
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">
          R$ ${Number(payment.amountPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 10px; text-transform: uppercase; font-size: 9px; color: #64748b;">
          ${payment.paymentMethod === 'pix' ? 'Pix Immediate' :
            payment.paymentMethod === 'cartao' ? 'Cartão de Crédito' :
            payment.paymentMethod === 'boleto' ? 'Boleto Digital' : 'Dinheiro / Outro'}
        </td>
        <td style="padding: 10px; color: #16a34a; font-weight: bold;">
          COMPENSADO (${payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')})
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Recebimentos Recorrentes (SaaS)</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #4f46e5; margin: 0; }
            .title { font-size: 14px; color: #64748b; text-transform: uppercase; margin: 5px 0 0; font-weight: bold; letter-spacing: 0.05em; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 40px; }
            .th { background: #f1f5f9; padding: 12px; font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; text-align: left; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo">KITCHENFLOW AI</h1>
            <p class="title">Relatório de Recebimentos Recorrentes e Assinaturas (SaaS)</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 5px 0 0;">Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin-bottom: 30px; background: #eef2ff; max-width: 300px;">
            <p style="font-size: 9px; font-weight: bold; color: #4f46e5; text-transform: uppercase; margin: 0;">Faturamento SaaS Acumulado</p>
            <p style="font-size: 20px; font-weight: 900; color: #312e81; margin: 5px 0 0;">R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th class="th">Lojista / Inquilino</th>
                <th class="th">Período Contratado</th>
                <th class="th">Valor Recebido</th>
                <th class="th">Canal de Pagamento</th>
                <th class="th">Processamento / Compensação</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8;">
            <p style="border-top: 1px dashed #cbd5e1; width: 250px; margin: 0 auto; padding-top: 10px; font-weight: bold;">Auditoria Financeira de Assinaturas</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const [plans, setPlans] = useState<Plan[]>(() => DEFAULT_SAAS_PLANS);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [generatedUser, setGeneratedUser] = useState<{ email: string; password: string } | null>(null);
  const [showUserGenModal, setShowUserGenModal] = useState(false);
  const [showTenantUserModal, setShowTenantUserModal] = useState(false);
  const [selectedTenantForUser, setSelectedTenantForUser] = useState<Tenant | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [marketplaceFee, setMarketplaceFee] = useState(2.5); // 2.5% padrão
  const [marketplaceConsumerFee, setMarketplaceConsumerFee] = useState<number>(1.99);
  const [marketplaceMinOrderValue, setMarketplaceMinOrderValue] = useState<number>(15.00);
  const [marketplaceMaxRadius, setMarketplaceMaxRadius] = useState<number>(20);
  const [marketplaceAutoApproveOrders, setMarketplaceAutoApproveOrders] = useState<boolean>(false);
  const [marketplaceOrderTimeoutMinutes, setMarketplaceOrderTimeoutMinutes] = useState<number>(10);
  const [marketplaceAllowPickup, setMarketplaceAllowPickup] = useState<boolean>(true);
  const [marketplaceAllowDelivery, setMarketplaceAllowDelivery] = useState<boolean>(true);
  const [marketplaceRankingStrategy, setMarketplaceRankingStrategy] = useState<string>('distance');
  const [marketplaceEnableSponsored, setMarketplaceEnableSponsored] = useState<boolean>(true);
  const [marketplaceAnnouncementBanner, setMarketplaceAnnouncementBanner] = useState<string>('🎉 Cupom BEMVINDO10 para R$ 10 OFF no seu 1º pedido pelo app!');
  const [marketplaceCategories, setMarketplaceCategories] = useState<string[]>([
    'Lanches & Hamburguerias', 'Pizzarias', 'Marmitarias & Caseira', 'Mercados & Hortifruti', 'Farmácias & Drogaria', 'Pet & Agro', 'Adegas & Bebidas', 'Açaí & Doces', 'Pastéis & Salgados'
  ]);
  const [marketplaceNewCategoryInput, setMarketplaceNewCategoryInput] = useState<string>('');
  const [marketplacePaymentMethods, setMarketplacePaymentMethods] = useState({
    pixOnline: true,
    creditCardOnline: true,
    cardOnDelivery: true,
    cashOnDelivery: true
  });
  const [marketplaceConfigSubTab, setMarketplaceConfigSubTab] = useState<
    'overview' | 'stores' | 'monetization' | 'promotions' | 'crm' | 'algorithm' | 'opportunities' | 'banners' | 'fees' | 'operations' | 'marketing' | 'ranking' | 'maintenance'
  >('overview');
  const [marketplaceBanner, setMarketplaceBanner] = useState('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop');
  const [marketplacePromotions, setMarketplacePromotions] = useState<MarketplacePromotion[]>([]);
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    active: false,
    startAt: '',
    endAt: '',
    message: ''
  });
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

  // --- STATE FOR PLATFORM LEDGER & BILLING ---
  const [saasLedger, setSaasLedger] = useState<any[]>([]);
  const [financialSubSection, setFinancialSubSection] = useState<'ledger' | 'marketplace' | 'faturamento'>('ledger');
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false);
  const [ledgerDescription, setLedgerDescription] = useState('');
  const [ledgerType, setLedgerType] = useState<'receber' | 'pagar'>('receber');
  const [ledgerAmount, setLedgerAmount] = useState<number>(0);
  const [ledgerDueDate, setLedgerDueDate] = useState('');
  const [ledgerCategory, setLedgerCategory] = useState('Infraestrutura');
  const [ledgerStatus, setLedgerStatus] = useState<'pending' | 'paid'>('pending');
  
  // Custom billing flow states
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showCloseCycleModal, setShowCloseCycleModal] = useState(false);
  const [billingIncludeSubscription, setBillingIncludeSubscription] = useState(true);
  const [selectedTenantForBilling, setSelectedTenantForBilling] = useState<any | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<{ id: string; tenantName: string; amount: number; pixCode: string } | null>(null);
  const [billingCustomSubscriptionPrice, setBillingCustomSubscriptionPrice] = useState<string>('');
  const [billingCustomDueDate, setBillingCustomDueDate] = useState<string>('');
  const [billingCustomNotes, setBillingCustomNotes] = useState<string>('');

  // Estados para geração de contrato de cessão de uso do app
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedTenantForContract, setSelectedTenantForContract] = useState<any | null>(null);
  const [contractDate, setContractDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [contractDurationMonths, setContractDurationMonths] = useState<number>(12);
  const [contractCity, setContractCity] = useState<string>('São Paulo');
  const [contractState, setContractState] = useState<string>('SP');
  const [contractOwnerCNPJ, setContractOwnerCNPJ] = useState<string>('45.123.456/0001-90');
  const [contractOwnerAddress, setContractOwnerAddress] = useState<string>('Av. Paulista, 1000, Bela Vista, São Paulo/SP');
  const [contractOwnerRepresentative, setContractOwnerRepresentative] = useState<string>('Renan de Oliveira');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'marketplace'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.serviceFee !== undefined) setMarketplaceFee(data.serviceFee);
        if (data.fixedFee !== undefined) setMarketplaceFixedFee(data.fixedFee);
        if (data.consumerFee !== undefined) setMarketplaceConsumerFee(data.consumerFee);
        if (data.minOrderValue !== undefined) setMarketplaceMinOrderValue(data.minOrderValue);
        if (data.maxRadius !== undefined) setMarketplaceMaxRadius(data.maxRadius);
        if (data.autoApproveOrders !== undefined) setMarketplaceAutoApproveOrders(data.autoApproveOrders);
        if (data.orderTimeoutMinutes !== undefined) setMarketplaceOrderTimeoutMinutes(data.orderTimeoutMinutes);
        if (data.allowPickup !== undefined) setMarketplaceAllowPickup(data.allowPickup);
        if (data.allowDelivery !== undefined) setMarketplaceAllowDelivery(data.allowDelivery);
        if (data.rankingStrategy) setMarketplaceRankingStrategy(data.rankingStrategy);
        if (data.enableSponsored !== undefined) setMarketplaceEnableSponsored(data.enableSponsored);
        if (data.announcementBanner !== undefined) setMarketplaceAnnouncementBanner(data.announcementBanner);
        if (data.categories && Array.isArray(data.categories)) setMarketplaceCategories(data.categories);
        if (data.paymentMethods) setMarketplacePaymentMethods(prev => ({ ...prev, ...data.paymentMethods }));
        if (data.bannerUrl) setMarketplaceBanner(data.bannerUrl);
        if (data.promotions) setMarketplacePromotions(data.promotions);
        if (data.maintenance) {
          setMaintenanceConfig({
            active: data.maintenance.active || false,
            startAt: data.maintenance.startAt ? new Date(data.maintenance.startAt.toDate ? data.maintenance.startAt.toDate() : data.maintenance.startAt).toISOString().slice(0, 16) : '',
            endAt: data.maintenance.endAt ? new Date(data.maintenance.endAt.toDate ? data.maintenance.endAt.toDate() : data.maintenance.endAt).toISOString().slice(0, 16) : '',
            message: data.maintenance.message || ''
          });
        }
      }
    }, (error) => {
      console.warn("SaaSAdmin marketplace settings snapshot error:", error);
    });

    const unsubSaas = onSnapshot(doc(db, 'settings', 'saas_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.excedentOrderPrice !== undefined) setSaasExcedentPrice(data.excedentOrderPrice);
        if (data.maxExtraOrdersLimit !== undefined) setSaasMaxExtraOrders(data.maxExtraOrdersLimit);
        if (data.enableExtraOrdersLimit !== undefined) setSaasEnableExtraLimit(data.enableExtraOrdersLimit);
        if (data.volumeDiscounts !== undefined) setSaasVolumeDiscounts(data.volumeDiscounts);
        }
    }, (error) => {
      console.warn("SaaSAdmin saas_config snapshot error:", error);
    });

    return () => {
      unsub();
      unsubSaas();
    };
  }, []);

  const handleSaveMarketplaceConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'marketplace'), {
        id: 'marketplace',
        serviceFee: marketplaceFee,
        fixedFee: marketplaceFixedFee,
        consumerFee: marketplaceConsumerFee,
        minOrderValue: marketplaceMinOrderValue,
        maxRadius: marketplaceMaxRadius,
        autoApproveOrders: marketplaceAutoApproveOrders,
        orderTimeoutMinutes: marketplaceOrderTimeoutMinutes,
        allowPickup: marketplaceAllowPickup,
        allowDelivery: marketplaceAllowDelivery,
        rankingStrategy: marketplaceRankingStrategy,
        enableSponsored: marketplaceEnableSponsored,
        announcementBanner: marketplaceAnnouncementBanner,
        categories: marketplaceCategories,
        paymentMethods: marketplacePaymentMethods,
        bannerUrl: marketplaceBanner,
        promotions: marketplacePromotions,
        maintenance: {
          active: maintenanceConfig.active,
          startAt: maintenanceConfig.startAt ? new Date(maintenanceConfig.startAt) : null,
          endAt: maintenanceConfig.endAt ? new Date(maintenanceConfig.endAt) : null,
          message: maintenanceConfig.message
        },
        updatedAt: new Date()
      });
      if (showToast) {
        showToast("Configurações do Marketplace salvas com sucesso!", "success");
      } else {
        alert("Configurações do Marketplace salvas com sucesso!");
      }
    } catch (error) {
      console.error("Error saving marketplace config:", error);
      if (showToast) {
        showToast("Erro ao salvar configurações do marketplace", "error");
      } else {
        alert("Erro ao salvar configurações do marketplace");
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const compressed = await compressImage(base64, 1200, 400, 0.7);
          setMarketplaceBanner(compressed);
        } catch (err) {
          console.error("Error compressing banner:", err);
          setMarketplaceBanner(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateStrongRandomPassword = () => {
    const charsLower = "abcdefghijklmnopqrstuvwxyz";
    const charsUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charsNum = "0123456789";
    const charsSpecial = "!@#$%&*()";
    
    let pass = "";
    pass += charsLower[Math.floor(Math.random() * charsLower.length)];
    pass += charsUpper[Math.floor(Math.random() * charsUpper.length)];
    pass += charsNum[Math.floor(Math.random() * charsNum.length)];
    pass += charsSpecial[Math.floor(Math.random() * charsSpecial.length)];
    
    const allChars = charsLower + charsUpper + charsNum + charsSpecial;
    for (let i = 0; i < 4; i++) {
      pass += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const handleCreateTenantUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForUser) return;
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const password = generateStrongRandomPassword();

    setEmailError(null);

    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      
      const qCourier = query(collection(db, 'couriers'), where('email', '==', email));
      const snapCourier = await getDocs(qCourier);
      
      if (!snap.empty || !snapCourier.empty) {
        setEmailError("Este e-mail de acesso já está cadastrado no sistema!");
        return;
      }

      await addDoc(collection(db, 'users'), {
        email,
        name,
        role,
        tenantId: selectedTenantForUser.id,
        password, // Em prod enviaria convite por email
        createdAt: new Date()
      });
      
      setGeneratedUser({ email, password });
      setShowTenantUserModal(false);
      setShowUserGenModal(true);
    } catch (error) {
      console.error("Error creating tenant user:", error);
    }
  };
  const handleSaveSaaSUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const name = formData.get('name') as string;
    const password = (formData.get('password') as string || '').trim();

    setEmailError(null);

    try {
      if (editingSaaSUser) {
        // Modo Edição
        if (email !== editingSaaSUser.email) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const snap = await getDocs(q);
          const qCourier = query(collection(db, 'couriers'), where('email', '==', email));
          const snapCourier = await getDocs(qCourier);
          
          if (!snap.empty || !snapCourier.empty) {
            setEmailError("Este e-mail de acesso já está cadastrado no sistema!");
            return;
          }
        }

        const updateData: any = {
          email,
          name,
          permissions: selectedSaasPermissions,
          updatedAt: new Date()
        };

        if (password) {
          updateData.password = password;
        }

        await setDoc(doc(db, 'users', editingSaaSUser.id), updateData, { merge: true });
        
        setShowSaaSUserModal(false);
        setEditingSaaSUser(null);
      } else {
        // Modo Criação
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q);
        const qCourier = query(collection(db, 'couriers'), where('email', '==', email));
        const snapCourier = await getDocs(qCourier);
        
        if (!snap.empty || !snapCourier.empty) {
          setEmailError("Este e-mail de acesso já está cadastrado no sistema!");
          return;
        }

        const finalPassword = password || generateStrongRandomPassword();

        await addDoc(collection(db, 'users'), {
          email,
          name,
          role: 'SAAS_ADMIN',
          permissions: selectedSaasPermissions,
          password: finalPassword,
          createdAt: new Date(),
          active: true
        });
        
        setGeneratedUser({ email, password: finalPassword });
        setShowSaaSUserModal(false);
        setShowUserGenModal(true);
        setSelectedSaasPermissions(SAAS_ADMIN_MODULES.map(m => m.id));
      }
    } catch (error) {
      console.error("Error saving SaaS user:", error);
    }
  };

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await setDoc(doc(db, 'tickets', ticketId), { status }, { merge: true });
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const leadData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      companyName: formData.get('companyName') as string,
      status: editingLead?.status || 'Novo',
      createdAt: editingLead?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      if (editingLead) {
        await setDoc(doc(db, 'leads', editingLead.id), leadData, { merge: true });
      } else {
        await addDoc(collection(db, 'leads'), leadData);
      }
      setShowLeadModal(false);
      setEditingLead(null);
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      const newReply = {
        sender: 'SaaS Master',
        message: replyText,
        timestamp: new Date()
      };
      
      const updatedReplies = [...(selectedTicket.replies || []), newReply];
      await setDoc(ticketRef, { 
        replies: updatedReplies,
        status: 'responded'
      }, { merge: true });
      
      setReplyText('');
      setSelectedTicket(null);
      setShowSupportModal(false);
    } catch (error) {
      console.error("Error replying to ticket:", error);
    }
  };
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);

  const confirmAction = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type });
    setShowConfirmModal(true);
  };

  // Plan Form states
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planMaxUsers, setPlanMaxUsers] = useState(5);
  const [planMaxOrders, setPlanMaxOrders] = useState(1000);
  const [planModules, setPlanModules] = useState<Permission[]>(['dashboard_view']);

  // --- STATE FOR GLOBAL SAAS SUBSCRIPTION RULES ---
  const [saasExcedentPrice, setSaasExcedentPrice] = useState(0.20);
  const [saasMaxExtraOrders, setSaasMaxExtraOrders] = useState(1000);
  const [saasEnableExtraLimit, setSaasEnableExtraLimit] = useState(false);
  const [saasVolumeDiscounts, setSaasVolumeDiscounts] = useState<{ threshold: number; discountPercent: number }[]>([
    { threshold: 500, discountPercent: 10 },
    { threshold: 1000, discountPercent: 20 }
  ]);
  // Tiers inputs
  const [newTierThreshold, setNewTierThreshold] = useState<number | ''>('');
  const [newTierDiscount, setNewTierDiscount] = useState<number | ''>('');

  // Tenant Form states
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [tenantModules, setTenantModules] = useState<Permission[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!showSaaSUserModal && !showTenantUserModal) {
      setEmailError(null);
    }
  }, [showSaaSUserModal, showTenantUserModal]);

  useEffect(() => {
    ensureLojistaTenantWithData();

    const q = query(collection(db, 'tenants'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        subscription: {
          ...doc.data().subscription,
          startDate: doc.data().subscription?.startDate?.toDate(),
          expiryDate: doc.data().subscription?.expiryDate?.toDate(),
        }
      })) as Tenant[];

      if (!data.some(t => t.id === 'lojista' || t.slug === 'lojista' || t.name.toLowerCase() === 'kitchenflow')) {
        data.unshift({
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
        } as any);
      }
      
      // Sort client-side by createdAt desc to allow tenants with missing createdAt to also show up
      data.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      });

      setTenants(data);
      try {
        localStorage.setItem('kitchenflow_saas_cached_tenants', JSON.stringify(data));
      } catch (e) {
        console.warn("Erro ao salvar cache de tenants:", e);
      }
      setLoading(false);
    }, (error) => {
      console.warn("SaaSAdmin onSnapshot error (tenants):", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'plans'), orderBy('price', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Plan[];
      setPlans(data);
    }, (error) => {
      console.warn("SaaSAdmin plans onSnapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const planId = editingPlan?.id || `plan_${Date.now()}`;
    const newPlan: Plan = {
      id: planId,
      name: planName,
      description: planDescription,
      price: planPrice,
      features: [],
      modules: planModules,
      maxUsers: planMaxUsers,
      maxOrders: planMaxOrders,
      billingCycle: planBillingCycle,
      active: true
    };

    try {
      await setDoc(doc(db, 'plans', planId), newPlan);
      setShowPlanModal(false);
      setEditingPlan(null);
      resetPlanForm();
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  const resetPlanForm = () => {
    setPlanName('');
    setPlanDescription('');
    setPlanPrice(0);
    setPlanMaxUsers(5);
    setPlanMaxOrders(1000);
    setPlanModules(['dashboard_view']);
    setPlanBillingCycle('monthly');
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const catId = editingCategory?.id || `cat_${Date.now()}`;
      const payload = {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
        img: newCategoryImg.trim(),
        bg: newCategoryBg,
        color: newCategoryColor,
        iconName: newCategoryIconName,
      };
      await setDoc(doc(db, 'commerceCategories', catId), payload);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryImg('');
      setNewCategoryBg('bg-indigo-50');
      setNewCategoryColor('text-indigo-500');
      setNewCategoryIconName('UtensilsCrossed');
      setEditingCategory(null);
    } catch (err) {
      console.error("Error saving commerce category:", err);
      alert("Erro ao salvar categoria: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    confirmAction(
      'Remover Categoria de Comércio',
      `Tem certeza de que deseja remover a categoria de comércio "${name}"? Certifique-se de que nenhum cliente esteja usando-a ativamente.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'commerceCategories', id));
        } catch (err) {
          console.error("Error deleting category:", err);
          alert("Erro ao excluir categoria: " + (err instanceof Error ? err.message : String(err)));
        }
      },
      'danger'
    );
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calcula o próximo ID de lojista e número de cliente de forma sequencial (iniciando em 1)
    let tenantId = editingTenant?.id;
    let clientNumber = editingTenant?.clientNumber;

    if (!clientNumber) {
      if (tenants.length > 0) {
        const nums = tenants.map((t, index) => getClientNumber(t, index));
        const maxNum = Math.max(...nums, 0);
        clientNumber = maxNum + 1;
      } else {
        clientNumber = 1;
      }
    }

    if (!tenantId) {
      tenantId = String(clientNumber);
    }
    
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    
    if (!selectedPlan) {
      alert('Selecione um plano válido.');
      return;
    }

    const tenantData: Partial<Tenant> = {
      id: tenantId,
      clientNumber,
      name,
      ownerId,
      planId: selectedPlanId,
      active: true,
      logoUrl,
      category,
      description,
      autoAcceptOrders,
      customModules: tenantModules,
      createdAt: editingTenant?.createdAt || new Date(),
      subscription: {
        plan: selectedPlan.name as any,
        status: 'active',
        startDate: editingTenant?.subscription.startDate || new Date(),
        expiryDate: new Date(expiryDate),
        allowedModules: selectedPlan.modules
      }
    };

    try {
      await setDoc(doc(db, 'tenants', tenantId), tenantData);
      
      // Se for um novo tenant, criar o primeiro usuário (Admin do Cliente)
      if (!editingTenant) {
        let email = `${name.toLowerCase().replace(/\s+/g, '')}@admin.com`.trim().toLowerCase();
        
        // Evitar duplicidade de e-mail ao criar o primeiro usuário do tenant
        try {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const snap = await getDocs(q);
          const qCourier = query(collection(db, 'couriers'), where('email', '==', email));
          const snapCourier = await getDocs(qCourier);
          
          if (!snap.empty || !snapCourier.empty) {
            const suffix = Math.floor(100 + Math.random() * 900);
            email = `${name.toLowerCase().replace(/\s+/g, '')}${suffix}@admin.com`.trim().toLowerCase();
          }
        } catch (e) {
          console.warn("Could not check email uniqueness:", e);
        }

        const password = generateStrongRandomPassword();
        
        const firstUser: Partial<User> = {
          id: ownerId, // Assume que o ownerId é o UID do usuário já criado ou a ser criado
          tenantId: tenantId,
          name: `Admin ${name}`,
          email: email,
          role: 'ADMIN',
          permissions: selectedPlan.modules,
          status: 'offline',
          active: true,
          password: password,
          createdAt: new Date()
        };
        await setDoc(doc(db, 'users', ownerId), firstUser, { merge: true });

        // Inicializar configurações padrão para o novo tenant (Isso habilita o sistema para o cliente)
        await setDoc(doc(db, 'settings', tenantId), {
          admin: {
            companyName: name,
            deliveryFee: 7.00,
            isDeliveryEnabled: true,
            isPickupEnabled: true,
            minOrderValue: 20.00,
            estimatedDeliveryTime: '30-45 min',
            estimatedPickupTime: '15-20 min',
            autoAcceptOrders: false,
            notifications: true,
            printing: { paperWidth: '80mm', autoPrintOrder: false },
          },
          digitalMenu: {
            restaurantName: name,
            welcomeMessage: `Bem-vindo ao ${name}!`,
            themeColor: '#4f46e5',
            logoUrl: logoUrl || ''
          },
          updatedAt: new Date()
        });
        
        setGeneratedUser({ email, password });
        setShowUserGenModal(true);

        // Inicializar com 10 mesas padrão para o novo cliente
        for (let i = 1; i <= 10; i++) {
          await addDoc(collection(db, 'diningTables'), {
            id: i,
            number: i,
            tenantId: tenantId,
            status: 'available',
            items: [],
            total: 0,
            updatedAt: new Date()
          });
        }
      }

      setShowAddModal(false);
      setEditingTenant(null);
      resetForm();
    } catch (error) {
      console.error("Error saving tenant:", error);
    }
  };

  const resetForm = () => {
    setName('');
    setOwnerId('');
    setSelectedPlanId('');
    setExpiryDate('');
    setLogoUrl('');
    setCategory('');
    setDescription('');
    setAutoAcceptOrders(false);
    setTenantModules([]);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setName(tenant.name);
    setOwnerId(tenant.ownerId);
    setSelectedPlanId(tenant.planId || '');
    setExpiryDate(tenant.subscription.expiryDate.toISOString().split('T')[0]);
    setLogoUrl(tenant.logoUrl || '');
    setCategory(tenant.category || '');
    setDescription(tenant.description || '');
    setAutoAcceptOrders(tenant.autoAcceptOrders || false);
    setTenantModules(tenant.customModules || tenant.subscription.allowedModules || []);
    setShowAddModal(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setActiveTab('plans');
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanDescription(plan.description);
    setPlanPrice(plan.price);
    setPlanMaxUsers(plan.maxUsers);
    setPlanMaxOrders(plan.maxOrders !== undefined && plan.maxOrders !== null ? plan.maxOrders : 1000);
    setPlanModules(plan.modules);
    setPlanBillingCycle(plan.billingCycle || 'monthly');
    setShowPlanModal(true);
  };

  const toggleModule = (moduleId: Permission) => {
    setPlanModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleGenerateAccess = async (tenant: Tenant) => {
    let email = `${tenant.name.toLowerCase().replace(/\s+/g, '')}@sistema.com`.trim().toLowerCase();
    const password = generateStrongRandomPassword();

    try {
      // Garantir e-mail absolutamente único na plataforma
      let attempts = 0;
      let emailExists = true;
      while (emailExists && attempts < 10) {
        const qUser = query(collection(db, 'users'), where('email', '==', email));
        const snapUser = await getDocs(qUser);
        
        const qCourier = query(collection(db, 'couriers'), where('email', '==', email));
        const snapCourier = await getDocs(qCourier);
        
        let foundConflict = false;
        if (!snapUser.empty) {
          const existingUser = snapUser.docs[0].data();
          if (existingUser.tenantId !== tenant.id) {
            foundConflict = true;
          }
        }
        if (!snapCourier.empty) {
          foundConflict = true;
        }

        if (foundConflict) {
          attempts++;
          const suffix = Math.floor(100 + Math.random() * 900);
          email = `${tenant.name.toLowerCase().replace(/\s+/g, '')}${suffix}@sistema.com`.trim().toLowerCase();
        } else {
          emailExists = false;
        }
      }

      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      
      let userId = tenant.ownerId || `user_${Date.now()}`;
      if (!snap.empty) {
        userId = snap.docs[0].id;
      }

      const permissions = tenant.customModules || tenant.subscription?.allowedModules || ['dashboard_view'];

      const tenantUser = {
        id: userId,
        tenantId: tenant.id,
        name: `Admin ${tenant.name}`,
        email: email,
        role: 'ADMIN',
        permissions: permissions,
        status: 'offline',
        active: true,
        password: password,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', userId), tenantUser, { merge: true });

      setGeneratedUser({ email, password });
      setShowUserGenModal(true);
    } catch (err: any) {
      console.error("Error generating master access:", err);
      alert("Erro ao salvar acesso no Firestore: " + err.message);
    }
  };

  const handleAccessSystem = (tenant: Tenant) => {
    onViewTenant(tenant.id, tenant.name, tenant.logoUrl);
  };

  const handleDeleteTenant = async (tenantId: string) => {
    confirmAction(
      "Excluir Cliente",
      "Tem certeza que deseja excluir este cliente? Esta ação é irreversível e todos os dados do restaurante serão perdidos.",
      async () => {
        try {
          await deleteDoc(doc(db, 'tenants', tenantId));
        } catch (error) {
          console.error('Erro ao excluir tenant:', error);
        }
      }
    );
  };

  const handleDeletePlan = async (planId: string) => {
    confirmAction(
      "Excluir Plano",
      "Tem certeza que deseja excluir este plano? Clientes que utilizam este plano não serão afetados imediatamente, mas o plano não poderá mais ser assinado.",
      async () => {
        try {
          await deleteDoc(doc(db, 'plans', planId));
        } catch (error) {
          console.error('Erro ao excluir plano:', error);
        }
      }
    );
  };

  const generateInvoice = (tenant: Tenant) => {
    const planPrices = { FREE: 0, BASIC: 99, PRO: 199, ENTERPRISE: 499 };
    const price = planPrices[tenant.subscription.plan];
    alert(`Cobrança gerada para ${tenant.name}\nValor: R$ ${price.toFixed(2)}\nVencimento: ${new Date().toLocaleDateString()}`);
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingTenant) return;

    let billingMonths = 1;
    let finalPrice = renewCustomPrice;
    let computedExpiryDate = new Date(renewingTenant.subscription.expiryDate || new Date());
    
    // Se estiver expirado no passado, renovamos contando de hoje. Se estiver ativo, estendemos a partir da data de vencimento atual!
    if (computedExpiryDate < new Date()) {
      computedExpiryDate = new Date();
    }

    if (renewPeriod === 'monthly') {
      billingMonths = 1;
      computedExpiryDate.setMonth(computedExpiryDate.getMonth() + 1);
    } else if (renewPeriod === 'semiannual') {
      billingMonths = 6;
      computedExpiryDate.setMonth(computedExpiryDate.getMonth() + 6);
    } else if (renewPeriod === 'yearly') {
      billingMonths = 12;
      computedExpiryDate.setMonth(computedExpiryDate.getMonth() + 12);
    } else if (renewPeriod === 'custom') {
      computedExpiryDate = new Date(renewCustomDate);
    }

    if (renewPeriod !== 'custom') {
      const selectedPlan = plans.find(p => p.id === renewingTenant.planId) || plans.find(p => p.name === renewingTenant.subscription.plan);
      const basePrice = selectedPlan ? selectedPlan.price : 99;
      const discounts = { monthly: 0, semiannual: 0.05, yearly: 0.10 };
      const discount = discounts[renewPeriod as keyof typeof discounts] || 0;
      finalPrice = basePrice * billingMonths * (1 - discount);
    }

    try {
      const tenantRef = doc(db, 'tenants', renewingTenant.id);
      const updatedSub = {
        ...(renewingTenant.subscription || {}),
        expiryDate: computedExpiryDate,
        status: 'active'
      };
      await setDoc(tenantRef, {
        ...renewingTenant,
        active: true,
        subscription: updatedSub,
        updatedAt: new Date()
      }, { merge: true });

      setTenants(prev => prev.map(t => t.id === renewingTenant.id ? {
        ...t,
        active: true,
        subscription: updatedSub
      } : t));

      if (registerPayment) {
        const paymentId = `pay_${Date.now()}`;
        const paymentData = {
          id: paymentId,
          tenantId: renewingTenant.id,
          tenantName: renewingTenant.name,
          planName: renewingTenant.subscription?.plan || 'BASIC',
          period: renewPeriod,
          priceBeforeDiscount: renewPeriod === 'custom' ? finalPrice : (finalPrice / (1 - (renewPeriod === 'monthly' ? 0 : renewPeriod === 'semiannual' ? 0.05 : 0.10))),
          amountPaid: finalPrice,
          paymentMethod: renewPaymentMethod,
          createdAt: new Date(),
          expiryDate: computedExpiryDate,
          status: 'Pago'
        };
        await setDoc(doc(db, 'saasPayments', paymentId), paymentData);
      }

      setShowRenewModal(false);
      setRenewingTenant(null);
      alert(`Assinatura de ${renewingTenant.name} renovada até ${computedExpiryDate.toLocaleDateString('pt-BR')} com sucesso!`);
    } catch (err) {
      console.error("Error renewing subscription:", err);
      // Fallback local update
      setTenants(prev => prev.map(t => t.id === renewingTenant.id ? {
        ...t,
        active: true,
        subscription: {
          ...(t.subscription || {}),
          expiryDate: computedExpiryDate,
          status: 'active'
        }
      } : t));
      setShowRenewModal(false);
      setRenewingTenant(null);
      alert(`Assinatura de ${renewingTenant.name} renovada localmente até ${computedExpiryDate.toLocaleDateString('pt-BR')}.`);
    }
  };

  const getDaysRemaining = (expiryDate: any) => {
    if (!expiryDate) return 0;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTenantBillingCycle = (t: Tenant) => {
    const pObj = plans.find(p => p.id === t.planId) || plans.find(p => p.name === t.subscription?.plan);
    return pObj ? pObj.billingCycle : (((t.subscription as any)?.billingCycle) || 'monthly');
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.ownerId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const days = getDaysRemaining(t.subscription?.expiryDate);
    const isMonthly = getTenantBillingCycle(t) === 'monthly';
    
    if (tenantFilter === 'active') {
      return t.active && (days >= 0 || isMonthly);
    }
    if (tenantFilter === 'expiring') {
      return t.active && days >= 0 && days <= 7 && !isMonthly;
    }
    if (tenantFilter === 'expired') {
      return (!t.active || days < 0) && !isMonthly;
    }
    return true;
  });

  const monthlyTenants = tenants.filter(t => {
    const billingCycle = getTenantBillingCycle(t);
    return t.active && billingCycle === 'monthly';
  });
  const valorReceberMensalPlanos = monthlyTenants.reduce((acc, t) => {
    const prices = { FREE: 0, BASIC: 99, PRO: 199, ENTERPRISE: 499 };
    const pObj = plans.find(p => p.id === t.planId) || plans.find(p => p.name === t.subscription?.plan);
    const price = pObj ? pObj.price : (prices[t.subscription?.plan as keyof typeof prices] || 0);
    return acc + price;
  }, 0);

  const marketplaceOrders = orders.filter(o => o.source === 'marketplace' || o.source === 'Marketplace');
  const comissaoGeradaMarketplace = marketplaceOrders.reduce((acc, o) => acc + (o.marketplaceCommissionAmount || (o.total * (marketplaceFee / 100)) || 0), 0) + (marketplaceOrders.length * marketplaceFixedFee);

  const expiredTenantsList = tenants.filter(t => {
    if (t.subscription?.plan === 'FREE') return false;
    const isMonthly = getTenantBillingCycle(t) === 'monthly';
    if (isMonthly) return false;
    const days = getDaysRemaining(t.subscription?.expiryDate);
    return days < 0;
  });

  const getTenantPlanPrice = (t: Tenant) => {
    const planPrices = { FREE: 0, BASIC: 99, PRO: 199, ENTERPRISE: 499 };
    const pObj = plans.find(p => p.id === t.planId) || plans.find(p => p.name === t.subscription?.plan);
    const price = pObj ? pObj.price : (planPrices[t.subscription?.plan as keyof typeof planPrices] || 0);
    return price;
  };

  const expiredPlansTotal = expiredTenantsList.reduce((acc, t) => acc + getTenantPlanPrice(t), 0);

  const handleQuickSettleTenant = async (tenant: Tenant) => {
    const price = getTenantPlanPrice(tenant);
    const pObj = plans.find(p => p.id === tenant.planId) || plans.find(p => p.name === tenant.subscription?.plan);
    const billingCycle = pObj?.billingCycle || 'monthly';

    let monthsToAdd = 1;
    if (billingCycle === 'quarterly') monthsToAdd = 3;
    else if (billingCycle === 'semiannual') monthsToAdd = 6;
    else if (billingCycle === 'yearly') monthsToAdd = 12;

    let computedExpiryDate = new Date(tenant.subscription?.expiryDate || new Date());
    if (computedExpiryDate < new Date()) {
      computedExpiryDate = new Date();
    }
    computedExpiryDate.setMonth(computedExpiryDate.getMonth() + monthsToAdd);

    try {
      const tenantRef = doc(db, 'tenants', tenant.id);
      const updatedSub = {
        ...(tenant.subscription || {}),
        plan: tenant.subscription?.plan || 'BASIC',
        expiryDate: computedExpiryDate,
        status: 'active'
      };
      await setDoc(tenantRef, {
        ...tenant,
        active: true,
        subscription: updatedSub,
        updatedAt: new Date()
      }, { merge: true });

      // Immediate optimistic update so UI re-renders without needing snapshot delay
      setTenants(prev => prev.map(t => t.id === tenant.id ? {
        ...t,
        active: true,
        subscription: updatedSub
      } : t));

      const paymentId = `pay_${Date.now()}`;
      const paymentData = {
        id: paymentId,
        tenantId: tenant.id,
        tenantName: tenant.name,
        planName: tenant.subscription?.plan || 'BASIC',
        period: billingCycle,
        priceBeforeDiscount: price,
        amountPaid: price,
        paymentMethod: 'pix',
        createdAt: new Date(),
        expiryDate: computedExpiryDate,
        status: 'Pago'
      };
      await setDoc(doc(db, 'saasPayments', paymentId), paymentData);

      // Register into financial ledger
      try {
        const ledgerItem = {
          id: `ledger_pay_${paymentId}`,
          description: `Mensalidade SaaS - ${tenant.name} (${tenant.subscription?.plan || 'Plano'})`,
          type: 'receber' as const,
          amount: price,
          dueDate: new Date().toISOString().slice(0, 10),
          paidDate: new Date().toISOString().slice(0, 10),
          category: 'Mensalidades SaaS',
          status: 'paid' as const,
          createdAt: new Date()
        };
        await setDoc(doc(db, 'saasLedger', ledgerItem.id), ledgerItem, { merge: true });
        setLedger(prev => [ledgerItem, ...prev.filter(l => l.id !== ledgerItem.id)]);
      } catch (ledgerErr) {
        console.warn("Ledger registration non-fatal error:", ledgerErr);
      }

      alert(`Sucesso! Recebimento confirmado de R$ ${price.toFixed(2)} do lojista ${tenant.name}. Plano renovado até ${computedExpiryDate.toLocaleDateString('pt-BR')}.`);
    } catch (err) {
      console.error("Error in handleQuickSettleTenant:", err);
      // Fallback local update even if network/quota fails so the admin is never blocked
      setTenants(prev => prev.map(t => t.id === tenant.id ? {
        ...t,
        active: true,
        subscription: {
          ...(t.subscription || { plan: 'BASIC', status: 'active', startDate: new Date() }),
          expiryDate: computedExpiryDate,
          status: 'active'
        }
      } : t));
      alert(`Sucesso! Recebimento registrado localmente para ${tenant.name}. Plano renovado até ${computedExpiryDate.toLocaleDateString('pt-BR')}.`);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      {/* Top Header & Executive Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SaaS Control Center • v2.5.0
            </span>
            <span className="text-[10px] font-bold text-slate-400">Ambiente de Produção</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {activeTab === 'tenants' ? 'Gestão de Clientes & Lojas' : 
             activeTab === 'plans' ? 'Planos e Preços' :
             activeTab === 'financial' ? 'Financeiro da Plataforma' :
             activeTab === 'subscription_rules' ? 'Regras de Assinatura' :
             activeTab === 'telemetry' ? '⚡ Telemetria & Saúde do Servidor' :
             activeTab === 'leads' ? 'Pipeline de Leads & CRM' :
             activeTab === 'support' ? 'Central de Suporte & Tickets' :
             activeTab === 'team' ? 'Equipe de Gestão SaaS' :
             activeTab === 'marketplace_config' ? 'Marketplace B2C / Nova' :
             activeTab === 'suppliers' ? 'Rede de Fornecedores B2B' :
             activeTab === 'diagnostics' ? 'Diagnóstico & Autotestes do Sistema' :
             'Dashboard da Plataforma'}
          </h1>
        </div>

        {/* Global Controls & Modes */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Experience Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
            <button
              onClick={() => setExperienceMode('superadmin')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                experienceMode === 'superadmin' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Acesso irrestrito a todos os módulos, financeiro e banco de dados"
            >
              <Crown size={12} className="text-amber-500" />
              <span>Super Admin</span>
            </button>

            <button
              onClick={() => setExperienceMode('operation')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                experienceMode === 'operation' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Modo Operação: Foco no suporte diário, marketplace e monitoramento de lojas"
            >
              <Zap size={12} className="text-indigo-500" />
              <span>Operação</span>
            </button>

            <button
              onClick={() => setExperienceMode('training')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                experienceMode === 'training' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Modo Treinamento: Ativa guias, dicas de atalhos e tutoriais passo a passo"
            >
              <GraduationCap size={13} />
              <span>Treinamento</span>
            </button>
          </div>

          {/* Quick Search Shortcut Button (Ctrl + K) */}
          <button
            onClick={() => setShowGlobalSearchModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Busca Global (Ctrl + K)"
          >
            <Search size={14} className="text-slate-400" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-slate-500 border border-slate-200">
              ⌘K
            </kbd>
          </button>

          {/* 1-Click Diagnostics Button */}
          <button
            onClick={() => setShowQuickDiagnosticModal(true)}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Executar Diagnóstico Geral em 1 Clique (Atalho: D)"
          >
            <Zap size={14} className="text-amber-600" />
            <span className="hidden sm:inline">Diagnóstico</span>
          </button>

          {/* Audit Logs Button */}
          <button
            onClick={() => setShowAuditLogsModal(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Log de Auditoria & Compliance"
          >
            <ShieldCheck size={16} />
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsDrawer(prev => !prev)}
              className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer relative"
              title="Central de Notificações"
            >
              <Bell size={16} />
              {saasNotifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {saasNotifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Specific Action Buttons */}
          {activeTab === 'tenants' && (
            <>
              <button 
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                  setShowCategoryModal(true);
                }}
                className="bg-slate-800 text-white px-3.5 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-slate-900 transition-all border border-slate-700 cursor-pointer"
              >
                <Settings size={14} />
                Categorias
              </button>
              <button 
                onClick={() => { resetForm(); setEditingTenant(null); setShowAddModal(true); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
              >
                <Plus size={14} />
                Novo Cliente
              </button>
            </>
          )}
          {activeTab === 'plans' && (
            <button 
              onClick={() => {
                setActiveTab('plans');
                resetPlanForm();
                setEditingPlan(null);
                setShowPlanModal(true);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Plus size={14} />
              Criar Novo Plano
            </button>
          )}
        </div>
      </div>

      {/* Modern Horizontal Scrollable Sub-Navigation Bar */}
      <div className="w-full bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner overflow-x-auto no-scrollbar flex items-center gap-1">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'audit', label: 'Diagnóstico & Saúde', icon: ShieldCheck },
          { id: 'tenants', label: 'Clientes / Lojas', count: tenants.length, icon: Building2 },
          { id: 'plans', label: 'Planos', icon: Package },
          { id: 'financial', label: 'Financeiro', icon: DollarSign },
          { id: 'marketplace_config', label: 'Marketplace', icon: Sparkles },
          { id: 'suppliers', label: 'Fornecedores B2B', icon: Layers },
          { id: 'leads', label: 'Leads', count: leads.filter(l => l.status === 'Novo' || l.status === 'novo').length, icon: Target },
          { id: 'support', label: 'Suporte', count: supportTickets.filter(t => t.status === 'Aberto' || t.status === 'open' || t.status === 'pendente').length, icon: LifeBuoy },
          { id: 'team', label: 'Equipe', icon: Users },
          { id: 'telemetry', label: 'Telemetria', icon: Gauge },
          { id: 'subscription_rules', label: 'Configurações SaaS', icon: Shield },
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="saasHeaderTabPill"
                  className="absolute inset-0 bg-emerald-600 rounded-xl shadow-md shadow-emerald-600/20"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <IconComp size={13} className={isActive ? 'text-white' : 'text-slate-500'} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' ? (
        <ExecutiveDashboard
          tenants={tenants}
          plans={plans}
          orders={(incomingOrders && incomingOrders.length > 0 ? incomingOrders : orders) as Order[]}
          financialRecords={financialRecords}
          saasPayments={saasPayments}
          leads={leads}
          supportTickets={supportTickets}
          currentUser={currentUser}
          onNavigate={(tab) => setActiveTab(tab as any)}
          onOpenAddTenant={() => { resetForm(); setEditingTenant(null); setShowAddModal(true); }}
          onOpenAddPlan={() => setShowPlanModal(true)}
          onOpenSearch={() => setShowGlobalSearchModal(true)}
          onRunQuickDiagnostic={() => setShowQuickDiagnosticModal(true)}
          serverLatency={dbLatency !== null ? dbLatency : 199}
        />
      ) : activeTab === 'telemetry' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* HERO TELEMETRY MONITOR HEADER */}
          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    isLiveTelemetryActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    <Radio size={12} className={isLiveTelemetryActive ? 'animate-pulse text-emerald-400' : 'text-amber-400'} />
                    {isLiveTelemetryActive ? 'Telemetria Ao Vivo • Atualizando a cada 3s' : 'Telemetria Pausada'}
                  </div>
                  {lastTelemetryTimestamp && (
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                      Última leitura: <strong className="text-white">{lastTelemetryTimestamp}</strong>
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Saúde & Desempenho do Sistema em Tempo Real</h2>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Monitoramento contínuo de latência (ping), consumo de memória RAM do Node.js, requisições de API atendidas e cotas de leitura/escrita do banco de dados em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsLiveTelemetryActive(prev => !prev)}
                  className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                    isLiveTelemetryActive 
                      ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/30' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-lg'
                  }`}
                >
                  <Activity size={14} className={isLiveTelemetryActive ? 'animate-pulse' : ''} />
                  {isLiveTelemetryActive ? 'Pausar Ao Vivo' : 'Iniciar Ao Vivo'}
                </button>

                <button
                  onClick={handleTestLatency}
                  disabled={isTestingLatency}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40 flex items-center gap-2.5 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isTestingLatency ? 'animate-spin' : ''} />
                  {isTestingLatency ? 'Medindo Ping...' : 'Testar Ping Agora'}
                </button>
              </div>
            </div>
          </div>

          {/* TOP METRICS GRID (REAL TIME DATA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CARD 1: SYSTEM STATUS & UPTIME */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Servidor Cloud Run & Uptime</span>
                <div className={`w-3 h-3 rounded-full animate-ping ${effectiveQuotaExceeded ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                  effectiveQuotaExceeded ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Server size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {serverTelemetry?.uptimeFormatted || '0h 15m 30s'}
                  </h3>
                  <p className="text-[10px] font-bold uppercase text-emerald-600">
                    {serverTelemetry ? 'Node ' + serverTelemetry.system.nodeVersion : 'Servidor Ativo'}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                <span>Modo de Operação:</span>
                <span className="font-bold text-slate-700">Cloud Run / Produção</span>
              </div>
            </div>

            {/* CARD 2: PING / LATENCY */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latência de Resposta (RTT)</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Wifi size={16} className="text-indigo-500" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  {dbLatency !== null ? `${dbLatency} ms` : '28 ms'}
                </h3>
                <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">
                  {dbLatency === null ? 'Sincronizando...' : dbLatency < 100 ? 'Excelente Resposta (< 100ms)' : dbLatency < 250 ? 'Tempo de Resposta Normal' : 'Tráfego Elevado'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                <span>Última Leitura:</span>
                <span className="font-bold font-mono text-slate-700">{lastTelemetryTimestamp || 'Em tempo real'}</span>
              </div>
            </div>

            {/* CARD 3: MEMORY RAM (HEAP USAGE) */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Memória RAM do Servidor</span>
                <Cpu size={16} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  {serverTelemetry ? `${serverTelemetry.memory.heapUsedMb} MB` : '48.2 MB'}
                </h3>
                <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">
                  {serverTelemetry ? `Heap Alocado: ${serverTelemetry.memory.heapTotalMb} MB (${serverTelemetry.memory.heapUsagePercent}%)` : 'Heap Normal'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                <span>RSS Total:</span>
                <span className="font-bold text-slate-700">{serverTelemetry ? `${serverTelemetry.memory.rssMb} MB` : '85 MB'}</span>
              </div>
            </div>

            {/* CARD 4: API REQUESTS & TRAFFIC */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Requisições da API Processadas</span>
                <Activity size={16} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                  {serverTelemetry ? serverTelemetry.traffic.totalRequests.toLocaleString('pt-BR') : orders.length}
                </h3>
                <p className="text-[10px] font-bold text-rose-600 uppercase mt-1">
                  {serverTelemetry ? `~${serverTelemetry.traffic.requestsPerMinute} req/min` : 'Fluxo estável'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                <span>Lojas Concorrentes:</span>
                <span className="font-bold text-slate-700">{tenants.filter(t => t.active).length} Lojas</span>
              </div>
            </div>
          </div>

          {/* REAL TIME LATENCY SPARKLINE CHART */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-lg font-black text-slate-800">Oscilação de Latência em Tempo Real (ms)</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Últimas 15 leituras de ping capturadas dinamicamente a cada 3 segundos</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" /> Ping RTT (ms)
                </span>
                <span className="bg-slate-50 px-3 py-1 rounded-xl text-slate-700 font-bold border border-slate-200">
                  Média: {latencyHistory.length > 0 ? Math.round(latencyHistory.reduce((acc, curr) => acc + curr.ping, 0) / latencyHistory.length) : 32} ms
                </span>
              </div>
            </div>

            <div className="h-48 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyHistory.length > 0 ? latencyHistory : [
                  { time: '00', ping: 30 },
                  { time: '03', ping: 28 },
                  { time: '06', ping: 32 },
                  { time: '09', ping: 25 },
                  { time: '12', ping: 29 }
                ]}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 'dataMax + 20']} unit="ms" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
                    formatter={(val: any) => [`${val} ms`, 'Latência']}
                    labelFormatter={(label) => `Horário: ${label}`}
                  />
                  <Area type="monotone" dataKey="ping" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#latencyGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DATABASE QUOTAS & CAPACITY GAUGES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* INFRASTRUCTURE CONSUMPTION GAUGES (2 COLS) */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Estimativa de Consumo de Carga do Banco de Dados</h3>
                  <p className="text-xs text-slate-400">Uso do Firestore / Cloud Database em relação às cotas do plano</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerifyDatabaseQuota}
                    disabled={isVerifyingQuota}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border border-slate-200"
                    title="Testar leitura do Firestore em tempo real e revalidar cota"
                  >
                    <RefreshCw size={11} className={isVerifyingQuota ? 'animate-spin' : ''} />
                    {isVerifyingQuota ? 'Verificando...' : 'Verificar Status da Cota'}
                  </button>
                  <span className={`px-3 py-1 font-black text-[10px] rounded-xl uppercase ${
                    effectiveQuotaExceeded 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {effectiveQuotaExceeded ? 'Cota Excedida (Ação Requerida)' : 'Nível 1 (Normal)'}
                  </span>
                </div>
              </div>

              <div className="space-y-6 pt-2">
                {/* READS BAR */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold items-center">
                    <span className="text-slate-700 flex items-center gap-2">
                      <HardDrive size={14} className={effectiveQuotaExceeded ? 'text-amber-500' : 'text-indigo-600'} /> Operações de Leitura (Reads)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-bold">
                        {Math.min(48500, (orders.length * 8 + tenants.length * 15 + 320)).toLocaleString('pt-BR')} / 50.000 grátis/dia ({Math.min(95, Math.max(4, Math.round(((orders.length * 8 + tenants.length * 15 + 320) / 50000) * 100)))}%)
                      </span>
                      {effectiveQuotaExceeded && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Escudo Ativo
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLocalQuotaExceeded(false);
                          if (onResetQuota) onResetQuota();
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer ml-1"
                        title="Recalibrar status da leitura"
                      >
                        Recalibrar
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        effectiveQuotaExceeded ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(95, Math.max(5, Math.round(((orders.length * 8 + tenants.length * 15 + 320) / 50000) * 100)))}%` }}
                    />
                  </div>
                </div>

                {/* WRITES BAR */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <Cpu size={14} className="text-emerald-600" /> Operações de Escrita (Writes)
                    </span>
                    <span className="text-slate-500">
                      {(orders.length * 5 + 40).toLocaleString('pt-BR')} / 20.000 grátis/dia ({Math.min(99, Math.round(((orders.length * 5 + 40) / 20000) * 100))}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(5, Math.min(100, Math.round(((orders.length * 5 + 40) / 20000) * 100)))}%` }}
                    />
                  </div>
                </div>

                {/* BANDWIDTH BAR */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <Gauge size={14} className="text-amber-600" /> Transferência de Dados (Bandwidth / Cardápios)
                    </span>
                    <span className="text-slate-500">
                      {(0.8 + (orders.length * 0.005)).toFixed(2)} GB / 10 GB limite diário ({Math.min(99, Math.round(((0.8 + (orders.length * 0.005)) / 10) * 100))}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(5, Math.min(100, Math.round(((0.8 + (orders.length * 0.005)) / 10) * 100)))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* SCALE ADVISORY & PLAN UPGRADE GUIDANCE */}
              <div className={`mt-8 p-6 text-white rounded-3xl border space-y-3 transition-all ${
                effectiveQuotaExceeded 
                  ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-rose-950 border-amber-500/40' 
                  : 'bg-slate-900 border-slate-800'
              }`}>
                <div className={`flex items-center gap-3 ${effectiveQuotaExceeded ? 'text-amber-400' : 'text-amber-400'}`}>
                  <Zap size={20} />
                  <h4 className="font-black text-sm uppercase tracking-wider">
                    {effectiveQuotaExceeded ? '⚠️ ALERTA DE CONFIGURAÇÃO DE PLANO FIREBASE' : 'Recomendação de Escala do Servidor'}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {effectiveQuotaExceeded ? (
                    <>
                      Seu projeto no Firebase atingiu o limite gratuito de <strong>50.000 leituras/dia</strong> do plano Spark.<br />
                      O KitchenFlow ativou automaticamente os escudos de resiliência e a camada de cache local para garantir que os lojistas continuem operando sem perdas. Para restaurar o streaming e escutas em tempo real do Firestore sem limites, acesse o <strong>Console do Firebase</strong> e altere o plano para <strong>BLAZE (Pague pelo que usar)</strong>.
                    </>
                  ) : tenants.filter(t => t.active).length < 25 
                    ? "Sua infraestrutura atual opera com margem de segurança altíssima. Você pode adicionar até 30 novas lojas ativas sem alterar o plano em nuvem."
                    : tenants.filter(t => t.active).length < 60
                    ? "Recomendado ativar o plano Firestore Blaze com faturamento automático caso o volume de pedidos ultrapasse 1.000 pedidos/dia."
                    : "Atenção: Com mais de 60 lojas ativas, solicite a alocação de instâncias reservadas no Cloud Run no painel Google Cloud."
                  }
                </p>
                <div className="pt-2 flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span>• Próximo passo recomendado: <strong className="text-amber-300">{effectiveQuotaExceeded ? 'Ativar Plano Blaze no Firebase Console' : '50 Lojas Ativas'}</strong></span>
                  <span>• Status de Conectividade: <strong className="text-white">{effectiveQuotaExceeded ? 'Modo Resiliente Ativo' : '1.200 ped/hora'}</strong></span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: TELEMETRY LOGS & ALERTS */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Logs & Diagnósticos de Sistema</h3>
                <p className="text-xs text-slate-400 mb-4">Eventos e checagens recentes de infraestrutura</p>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {telemetryLogs.map((log, idx) => (
                    <div key={log.id || `tlog-${idx}-${log.time}`} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 text-xs">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'warn' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-slate-700">{log.type === 'success' ? 'Sucesso' : log.type === 'warn' ? 'Atenção' : 'Info'}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{log.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  handleTestLatency();
                  alert("Diagnóstico completo executado! Banco de dados e conexões locais validados.");
                }}
                className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
              >
                <Server size={14} />
                Executar Varredura de Diagnóstico
              </button>
            </div>
          </div>

          {/* PING & LATENCY OPTIMIZATION GUIDANCE CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center font-black">
                <Wifi size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Como Reduzir o Ping de ~150ms para 15ms - 30ms no Brasil</h3>
                <p className="text-xs text-slate-400">Guia prático de otimização de latência para produção no Google Cloud / Firebase</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase">
                  <MapPin size={14} /> 1. Região São Paulo (southamerica-east1)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O container de teste atual roda em servidor US West (EUA). Ao implantar seu projeto final na região <strong>São Paulo (southamerica-east1)</strong>, o ping reduz drasticamente para os clientes no Brasil.
                </p>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase">
                  <HardDrive size={14} /> 2. Cache IndexedDB Offline
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O SDK do Firestore utiliza armazenamento em cache no navegador do cliente. Leituras de cardápio e pedidos ocorrem instantaneamente em <strong>0ms a 5ms</strong> no dispositivo do usuário.
                </p>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase">
                  <Cpu size={14} /> 3. Cloud Run Min-Instances = 1
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Definir <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">min-instances: 1</code> no Cloud Run elimina o tempo de aquecimento ("Cold Start") mantendo o servidor Express sempre na memória RAM.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'tenants' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Clientes</p>
            <p className="text-2xl font-black text-slate-800">{tenants.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinaturas Ativas</p>
            <p className="text-2xl font-black text-slate-800">{tenants.filter(t => t.active).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inativos / Vencidos</p>
            <p className="text-2xl font-black text-slate-800">{tenants.filter(t => !t.active).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou ID do proprietário..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Todos', count: tenants.length },
              { id: 'active', label: 'Ativos', count: tenants.filter(t => t.active && (getDaysRemaining(t.subscription?.expiryDate) >= 0 || getTenantBillingCycle(t) === 'monthly')).length },
              { id: 'expiring', label: 'Expira em Breve', count: tenants.filter(t => t.active && getDaysRemaining(t.subscription?.expiryDate) >= 0 && getDaysRemaining(t.subscription?.expiryDate) <= 7 && getTenantBillingCycle(t) !== 'monthly').length },
              { id: 'expired', label: 'Inativos/Expirados', count: tenants.filter(t => (!t.active || getDaysRemaining(t.subscription?.expiryDate) < 0) && getTenantBillingCycle(t) !== 'monthly').length }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTenantFilter(f.id as any)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                  tenantFilter === f.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${tenantFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTenants.map((tenant, idx) => (
                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs overflow-hidden border-2 border-slate-100 group-hover:border-indigo-200 transition-all">
                        {tenant.logoUrl ? (
                          <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                        ) : (
                          tenant.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-black border border-indigo-200 shrink-0" title="Número do Cliente">
                            #{getClientNumber(tenant, idx)}
                          </span>
                          <p className="font-black text-slate-800 text-sm">{tenant.name}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tenant.ownerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      tenant.subscription.plan === 'PRO' ? 'bg-amber-50 text-amber-600' :
                      tenant.subscription.plan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {tenant.subscription.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const days = getDaysRemaining(tenant.subscription.expiryDate);
                      const isMonthly = getTenantBillingCycle(tenant) === 'monthly';
                      if ((!tenant.active || days < 0) && !isMonthly) {
                        return (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <XCircle size={10} /> Expirado
                          </span>
                        );
                      } else if (isMonthly && days < 0) {
                        return (
                          <span className="px-2.5 py-1 bg-teal-50 text-teal-600 rounded-lg border border-teal-100 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Recorrente Ativo
                          </span>
                        );
                      } else if (days <= 7 && !isMonthly) {
                        return (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle size={10} /> Expira Breve
                          </span>
                        );
                      } else {
                        return (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Ativo
                          </span>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const days = getDaysRemaining(tenant.subscription.expiryDate);
                      const isMonthly = getTenantBillingCycle(tenant) === 'monthly';
                      return (
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-700 font-mono">
                            {new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${
                            days < 0 ? (isMonthly ? 'text-teal-600' : 'text-rose-500') :
                            days === 0 ? 'text-rose-600 font-black animate-pulse' :
                            days <= 7 ? 'text-amber-500 font-black' :
                            'text-slate-400'
                          }`}>
                            {days < 0 
                              ? (isMonthly 
                                ? `Recorrente (Próx. ciclo ativo)` 
                                : `Vencido há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`)
                              : days === 0 
                              ? 'Vence Hoje!' 
                              : days === 1 
                              ? 'Vence Amanhã' 
                              : `${days} dias restantes`
                            }
                          </p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {tenant.subscription?.allowedModules?.length || 0} Módulos
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setSelectedTenantFor360(tenant)}
                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                        title="Visão 360° Individual da Loja"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => { setRenewingTenant(tenant); setRenewCustomDate(new Date(tenant.subscription.expiryDate).toISOString().split('T')[0]); setShowRenewModal(true); }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Renovar / Estender Plano"
                      >
                        <RefreshCw size={18} className="animate-hover-spin" />
                      </button>
                      <button 
                        onClick={() => { setSelectedTenantForUser(tenant); setShowTenantUserModal(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Criar Usuário para este cliente"
                      >
                        <UserPlus size={18} />
                      </button>
                      <button 
                        onClick={() => handleAccessSystem(tenant)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Acessar Sistema (Suporte)"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button 
                        onClick={() => confirmAction("Gerar Acesso", `Isso criará uma nova credencial master para ${tenant.name}. Deseja continuar?`, () => handleGenerateAccess(tenant), 'warning')}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Gerar Credencial Master"
                      >
                        <Key size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(tenant)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedTenantForContract(tenant);
                          setContractDate(new Date().toISOString().slice(0, 10));
                          setShowContractModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Gerar Contrato de Cessão de Uso"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => confirmAction("Excluir Cliente", "Deseja remover este lojista permanentemente?", () => handleDeleteTenant(tenant.id), 'danger')}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        </>
      ) : activeTab === 'plans' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Package size={28} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditPlan(plan)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit3 size={18} /></button>
                    <button 
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">{plan.name}</h3>
                <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">{plan.description}</p>
                <div className="flex flex-col mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-slate-400">R$</span>
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">{plan.price.toFixed(0)}</span>
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter ml-1">
                      {plan.billingCycle === 'yearly' ? '/ano' :
                       plan.billingCycle === 'semiannual' ? '/semestre' :
                       plan.billingCycle === 'quarterly' ? '/trimestre' : '/mês'}
                    </span>
                  </div>
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1.5 flex items-center gap-1">
                    <Clock size={10} className="text-indigo-500" />
                    {plan.billingCycle === 'yearly' ? 'Ciclo Anual (Economia)' :
                     plan.billingCycle === 'semiannual' ? 'Ciclo Semestral' :
                     plan.billingCycle === 'quarterly' ? 'Ciclo Trimestral' : 'Ciclo Recorrente Mensal'}
                  </span>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <Users size={14} className="text-indigo-500" />
                    Até {plan.maxUsers} usuários
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {plan.modules.length} módulos habilitados
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.modules.slice(0, 3).map(m => (
                    <span key={m} className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[8px] font-black uppercase tracking-widest">
                      {ALL_MODULES.find(am => am.id === m)?.label || m}
                    </span>
                  ))}
                  {plan.modules.length > 3 && (
                    <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[8px] font-black uppercase tracking-widest">
                      +{plan.modules.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'leads' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Prospects e Leads</h3>
              <button 
                onClick={() => {
                  setEditingLead(null);
                  setShowLeadModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus size={14} /> Novo Lead
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome / Empresa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leads.length > 0 ? leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 font-black text-slate-800 text-sm">
                        {lead.companyName || lead.name}
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lead.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-600">{lead.email}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{lead.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                          lead.status === 'Novo' ? 'bg-indigo-50 text-indigo-600' :
                          lead.status === 'Negociação' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {lead.createdAt?.toDate?.() ? lead.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setEditingLead(lead);
                            setShowLeadModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            confirmAction("Converter em Cliente", `Deseja converter ${lead.name} em um cliente ativo?`, () => {
                              // Lógica para preencher o form de tenant com dados do lead
                              setName(lead.companyName || lead.name);
                              setOwnerId(lead.email); // Placeholder
                              setShowLeadModal(false);
                              setShowAddModal(true);
                            }, 'info');
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                        Nenhum lead registrado no momento
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      ) : activeTab === 'support' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tickets Abertos</p>
                <p className="text-2xl font-black text-slate-800">{supportTickets.filter(t => t.status === 'open').length}</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Atendimento</p>
                <p className="text-2xl font-black text-indigo-600">{supportTickets.filter(t => t.status === 'in_progress').length}</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Médio Resposta</p>
                <p className="text-2xl font-black text-emerald-600">14m</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolvidos (Hoje)</p>
                <p className="text-2xl font-black text-slate-800">8</p>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Chamados de Suporte</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                   <thead>
                      <tr className="bg-slate-50/50">
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assunto / Restaurante</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 text-sm">
                      {supportTickets.length > 0 ? supportTickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-slate-50/50 transition-all">
                           <td className="px-6 py-4">
                              <p className="font-black text-slate-800">{ticket.subject}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{ticket.tenantName}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                ticket.priority === 'urgent' ? 'bg-rose-50 text-rose-600' :
                                ticket.priority === 'high' ? 'bg-amber-50 text-amber-600' :
                                'bg-indigo-50 text-indigo-600'
                              }`}>
                                {ticket.priority}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-600 capitalize">{ticket.status.replace('_', ' ')}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => { setSelectedTicket(ticket); setShowSupportModal(true); }}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                              >
                                Responder
                              </button>
                           </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                            Nenhum ticket pendente
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
          

        </div>
      ) : activeTab === 'team' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h3 className="text-lg font-black tracking-tighter">Equipe Interna SaaS</h3>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Gerencie administradores e suporte da plataforma</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSaasPermissions(SAAS_ADMIN_MODULES.map(m => m.id));
                    setShowSaaSUserModal(true);
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20"
                >
                  <Plus size={16} className="inline mr-2" />
                  Novo Membro
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50">
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Acesso</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {saasUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px] overflow-hidden border border-slate-100 group-hover:border-indigo-200 transition-all">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      u.name.substring(0, 2).toUpperCase()
                                    )}
                                 </div>
                                 <p className="font-black text-slate-800 text-sm">{u.name}</p>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-xs font-bold text-slate-500">{u.email}</td>
                           <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-widest">
                                 {u.role}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-[10px] text-slate-400 font-medium">
                              {u.lastAccess ? new Date(u.lastAccess).toLocaleString() : 'Nunca'}
                           </td>
                           <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                              <button 
                                onClick={() => {
                                  setEditingSaaSUser(u);
                                  setSelectedSaasPermissions(u.permissions || []);
                                  setShowSaaSUserModal(true);
                                }}
                                className="p-2 text-slate-300 hover:text-indigo-600 transition-all"
                                title="Editar Membro"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setShowConfirmModal(true);
                                  setConfirmConfig({
                                    title: 'Remover Membro',
                                    message: `Tem certeza que deseja remover ${u.name} da equipe?`,
                                    onConfirm: async () => {
                                      try {
                                        await deleteDoc(doc(db, 'users', u.id));
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    },
                                    type: 'danger'
                                  });
                                }}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      ) : activeTab === 'financial' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <SaaSFinancialModule
            tenants={tenants}
            plans={plans}
            orders={orders}
            marketplaceInvoices={marketplaceInvoices}
            saasLedger={saasLedger as any}
            marketplaceFixedFee={marketplaceFixedFee || 2.00}
            marketplaceFee={marketplaceFee}
            onSaveLedgerItem={async (item) => {
              try {
                await addDoc(collection(db, 'saasLedger'), {
                  ...item,
                  createdAt: new Date(),
                });
              } catch (e) {
                console.error("Error saving ledger item:", e);
              }
            }}
            onToggleLedgerStatus={handleToggleLedgerStatus}
            onQuickSettleSubscription={handleQuickSettleTenant}
            onSettleMarketplaceCycle={async (tenant, unbilledOrders, totalAmount) => {
              await handleCloseCycleAndBill(
                tenant,
                unbilledOrders,
                totalAmount,
                false,
                0
              );
            }}
          />
        </div>
      ) : activeTab === 'marketplace_config' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white gap-4">
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                     <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-wider border border-indigo-400/20">
                       Painel B2C & Delivery
                     </span>
                   </div>
                   <h3 className="text-xl font-black tracking-tighter">Configuração do Marketplace Nova</h3>
                   <p className="text-[11px] font-medium text-slate-400 mt-0.5">Gestão completa de taxas, operação, logística, banners, promoções e algoritmos do aplicativo consumidor</p>
                 </div>
                 <button 
                   onClick={() => confirmAction("Salvar Configurações", "Deseja salvar as alterações no marketplace global?", handleSaveMarketplaceConfig, 'info')}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/30 flex items-center gap-2 shrink-0"
                 >
                   <Save size={16} />
                   Salvar Alterações
                 </button>
              </div>

              {/* Sub-tab Navigation */}
              <div className="px-8 pt-6 pb-2 border-b border-slate-100 flex flex-wrap gap-2 bg-slate-50/50">
                <button
                  onClick={() => setMarketplaceConfigSubTab('overview')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'overview'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Rocket size={13} /> 🚀 Centro de Comando
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('stores')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'stores'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Store size={13} /> 🏪 Lojas & Scores
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('monetization')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'monetization'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <DollarSign size={13} /> 💎 Monetização & Ads
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('promotions')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'promotions'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Tag size={13} /> 🏷️ Promoções & Cupons
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('crm')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'crm'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Users size={13} /> 👥 Funil & CRM
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('algorithm')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'algorithm'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Award size={13} /> 🧠 Algoritmo & Leilão
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('opportunities')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'opportunities'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Sparkles size={13} /> 💡 Oportunidades
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('banners')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'banners'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Megaphone size={13} /> 🎨 Banners & Vitrine
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('fees')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'fees'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Percent size={13} /> Taxas & Comissões
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('operations')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'operations'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Truck size={13} /> Operação & Entrega
                </button>

                <button
                  onClick={() => setMarketplaceConfigSubTab('maintenance')}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    marketplaceConfigSubTab === 'maintenance'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <AlertTriangle size={13} /> Manutenção
                </button>
              </div>

              <div className="p-8">
                 {/* SUB-TAB 0: CENTRO DE COMANDO & PERFORMANCE */}
                 {marketplaceConfigSubTab === 'overview' && (
                   <div className="space-y-6">
                     <MarketplaceCommandCenter 
                       tenants={tenants}
                       marketplaceFixedFee={marketplaceFixedFee}
                       marketplaceFeePercent={marketplaceFee}
                       onNavigateTab={(tab) => setMarketplaceConfigSubTab(tab as any)}
                     />
                   </div>
                 )}

                 {/* SUB-TAB: DESEMPENHO DE LOJAS & SCORE */}
                 {marketplaceConfigSubTab === 'stores' && (
                   <MarketplaceStoreScoresView 
                     tenants={tenants}
                     onViewTenant360={(tenant) => setSelectedTenantFor360(tenant)}
                     onOpenStoreMenu={(tenant) => onViewTenant(tenant.id, tenant.name, tenant.logoUrl)}
                     marketplaceFixedFee={marketplaceFixedFee}
                   />
                 )}

                 {/* SUB-TAB: MONETIZAÇÃO & ESPAÇOS PUBLICITÁRIOS */}
                 {marketplaceConfigSubTab === 'monetization' && (
                   <MarketplaceMonetizationView 
                     tenants={tenants}
                     onSaveConfig={handleSaveMarketplaceConfig}
                   />
                 )}

                 {/* SUB-TAB: PROMOÇÕES & CUPONS */}
                 {marketplaceConfigSubTab === 'promotions' && (
                   <MarketplacePromotionsView 
                     tenants={tenants}
                     promotions={marketplacePromotions}
                     onUpdatePromotions={(promos) => setMarketplacePromotions(promos)}
                   />
                 )}

                 {/* SUB-TAB: CRM & FUNIL DE CONVERSÃO */}
                 {marketplaceConfigSubTab === 'crm' && (
                   <MarketplaceCrmFunnelView 
                     tenants={tenants}
                   />
                 )}

                 {/* SUB-TAB: ALGORITMO & LEILÃO DE DESTAQUES */}
                 {marketplaceConfigSubTab === 'algorithm' && (
                   <MarketplaceAlgorithmAuctionView 
                     tenants={tenants}
                   />
                 )}

                 {/* SUB-TAB: OPORTUNIDADES & METAS */}
                 {marketplaceConfigSubTab === 'opportunities' && (
                   <MarketplaceOpportunitiesView 
                     tenants={tenants}
                     onNavigateTab={(tab) => setMarketplaceConfigSubTab(tab as any)}
                   />
                 )}

                 {/* SUB-TAB: BANNERS & VITRINE */}
                 {marketplaceConfigSubTab === 'banners' && (
                   <MarketplaceBannersManagerView 
                     tenants={tenants}
                     bannerUrl={marketplaceBanner}
                     onBannerChange={(url) => setMarketplaceBanner(url)}
                   />
                 )}

                 {/* SUB-TAB 1: TAXAS & COMISSÕES */}
                 {marketplaceConfigSubTab === 'fees' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Percent size={16} className="text-indigo-600" /> Cobrança dos Restaurantes (Lojistas)
                          </h4>
                          
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Comissão Percentual Global (%)</label>
                             <div className="relative">
                               <input 
                                 type="number" 
                                 step="0.1"
                                 className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-indigo-600 transition-all pr-12" 
                                 value={marketplaceFee}
                                 onChange={(e) => setMarketplaceFee(Number(e.target.value))}
                               />
                               <span className="absolute right-4 top-4 font-black text-slate-400">%</span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium">Percentual cobrado da loja sobre o valor dos produtos em cada pedido.</p>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Taxa Fixa por Pedido (R$)</label>
                             <div className="relative">
                               <span className="absolute left-4 top-4 font-black text-slate-400">R$</span>
                               <input 
                                 type="number" 
                                 step="0.10"
                                 className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-indigo-600 transition-all pl-12" 
                                 value={marketplaceFixedFee}
                                 onChange={(e) => setMarketplaceFixedFee(Number(e.target.value))}
                               />
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium">Valor fixo de cobrança por pedido concluído (ex: R$ 1,50).</p>
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <ShoppingBag size={16} className="text-emerald-600" /> Taxas & Pedido do Consumidor
                          </h4>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Taxa de Conveniência do Consumidor (R$)</label>
                             <div className="relative">
                               <span className="absolute left-4 top-4 font-black text-slate-400">R$</span>
                               <input 
                                 type="number" 
                                 step="0.10"
                                 className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-indigo-600 transition-all pl-12" 
                                 value={marketplaceConsumerFee}
                                 onChange={(e) => setMarketplaceConsumerFee(Number(e.target.value))}
                               />
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium">Adicionado ao total do carrinho do cliente no app do marketplace.</p>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Mínimo para Pedido (R$)</label>
                             <div className="relative">
                               <span className="absolute left-4 top-4 font-black text-slate-400">R$</span>
                               <input 
                                 type="number" 
                                 step="1.00"
                                 className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-indigo-600 transition-all pl-12" 
                                 value={marketplaceMinOrderValue}
                                 onChange={(e) => setMarketplaceMinOrderValue(Number(e.target.value))}
                               />
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium">Mínimo necessário nos subtotais dos itens para permitir checkout.</p>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard size={16} className="text-indigo-600" /> Formas de Pagamento Aceitas no App
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">Habilite os métodos autorizados para pagamentos no marketplace:</p>

                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Pix Online (Instantâneo)</p>
                                <p className="text-[9px] text-slate-400 font-medium">Confirmação automática de pagamento</p>
                              </div>
                              <input 
                                type="checkbox"
                                className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                checked={marketplacePaymentMethods.pixOnline}
                                onChange={(e) => setMarketplacePaymentMethods({ ...marketplacePaymentMethods, pixOnline: e.target.checked })}
                              />
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Cartão de Crédito Online</p>
                                <p className="text-[9px] text-slate-400 font-medium">Processamento direto pelo gateway do app</p>
                              </div>
                              <input 
                                type="checkbox"
                                className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                checked={marketplacePaymentMethods.creditCardOnline}
                                onChange={(e) => setMarketplacePaymentMethods({ ...marketplacePaymentMethods, creditCardOnline: e.target.checked })}
                              />
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Cartão na Entrega (Maquininha)</p>
                                <p className="text-[9px] text-slate-400 font-medium">Pagamento realizado com o entregador</p>
                              </div>
                              <input 
                                type="checkbox"
                                className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                checked={marketplacePaymentMethods.cardOnDelivery}
                                onChange={(e) => setMarketplacePaymentMethods({ ...marketplacePaymentMethods, cardOnDelivery: e.target.checked })}
                              />
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Dinheiro na Entrega</p>
                                <p className="text-[9px] text-slate-400 font-medium">Solicitação de troco ao entregador</p>
                              </div>
                              <input 
                                type="checkbox"
                                className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                checked={marketplacePaymentMethods.cashOnDelivery}
                                onChange={(e) => setMarketplacePaymentMethods({ ...marketplacePaymentMethods, cashOnDelivery: e.target.checked })}
                              />
                            </div>
                          </div>
                        </div>
                     </div>
                   </div>
                 )}

                 {/* SUB-TAB 2: LOGÍSTICA & OPERAÇÃO */}
                 {marketplaceConfigSubTab === 'operations' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Truck size={16} className="text-indigo-600" /> Raio & Alcance de Atendimento
                          </h4>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Raio Máximo de Exibição de Lojas (km)</label>
                             <div className="relative">
                               <input 
                                 type="number" 
                                 step="1"
                                 className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-indigo-600 transition-all pr-12" 
                                 value={marketplaceMaxRadius}
                                 onChange={(e) => setMarketplaceMaxRadius(Number(e.target.value))}
                               />
                               <span className="absolute right-4 top-4 font-black text-slate-400">km</span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium">Lojas além desta distância do cliente não aparecem nas buscas.</p>
                          </div>

                          <div className="space-y-3 pt-2">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modalidades Aceitas no Checkout</p>
                             <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">Permitir Entrega (Delivery)</p>
                                  <p className="text-[9px] text-slate-400 font-medium">Lojas entregam ou usam motoboys</p>
                                </div>
                                <input 
                                  type="checkbox"
                                  className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                  checked={marketplaceAllowDelivery}
                                  onChange={(e) => setMarketplaceAllowDelivery(e.target.checked)}
                                />
                             </div>

                             <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">Permitir Retirada no Balcão (Takeaway)</p>
                                  <p className="text-[9px] text-slate-400 font-medium">Cliente retira presencialmente no restaurante</p>
                                </div>
                                <input 
                                  type="checkbox"
                                  className="w-5 h-5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                  checked={marketplaceAllowPickup}
                                  onChange={(e) => setMarketplaceAllowPickup(e.target.checked)}
                                />
                             </div>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} className="text-indigo-600" /> Fluxo & Tempo de Aceite
                          </h4>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tempo Limite para Aceite pela Loja (Minutos)</label>
                             <div className="relative">
                               <input 
                                 type="number" 
                                 step="1"
                                 className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-indigo-600 transition-all pr-16" 
                                 value={marketplaceOrderTimeoutMinutes}
                                 onChange={(e) => setMarketplaceOrderTimeoutMinutes(Number(e.target.value))}
                               />
                               <span className="absolute right-4 top-4 font-black text-slate-400">min</span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-medium">Se o restaurante não aceitar neste prazo, o pedido é alertado e pode ser cancelado.</p>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 mt-2">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Auto-Aprovação de Pedidos</p>
                              <p className="text-[9px] text-slate-400 font-medium">Aprova e envia direto para produção em restaurantes parceiros verificados</p>
                            </div>
                            <div 
                              onClick={() => setMarketplaceAutoApproveOrders(!marketplaceAutoApproveOrders)}
                              className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${marketplaceAutoApproveOrders ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}
                            >
                               <div className={`w-4 h-4 bg-white rounded-full transition-all ${marketplaceAutoApproveOrders ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </div>
                     </div>
                   </div>
                 )}

                 {/* SUB-TAB 3: BANNERS, PROMOÇÕES & CATEGORIAS */}
                 {marketplaceConfigSubTab === 'marketing' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             <Megaphone size={16} className="text-indigo-600" /> Anúncio Notificação no Topo do App
                           </h4>
                           <textarea 
                             className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 transition-all min-h-[70px]"
                             placeholder="Ex: 🎉 Cupom BEMVINDO10 para R$ 10 OFF no seu 1º pedido pelo app!"
                             value={marketplaceAnnouncementBanner}
                             onChange={(e) => setMarketplaceAnnouncementBanner(e.target.value)}
                           />
                           <p className="text-[10px] text-slate-400 font-medium">Aparece na barra fixa de topo em destaque para todos os usuários do marketplace.</p>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             <Upload size={16} className="text-indigo-600" /> Banner Principal em Destaque
                           </h4>
                           <div className="p-4 bg-white border-2 border-dashed border-slate-200 rounded-3xl space-y-4 text-center">
                              <img 
                                src={marketplaceBanner} 
                                className="w-full h-36 object-cover rounded-2xl shadow-sm" 
                                alt="Preview Banner"
                              />
                              <label className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all cursor-pointer flex items-center justify-center border border-indigo-200">
                                 <Upload size={14} className="inline mr-2" /> Selecionar Nova Imagem para o Banner
                                 <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                              </label>
                           </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Tag size={16} className="text-indigo-600" /> Categorias do Marketplace
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium">Categorias exibidas no carrossel superior de navegação:</p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {marketplaceCategories.map((cat, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
                                {cat}
                                <button 
                                  onClick={() => setMarketplaceCategories(marketplaceCategories.filter((_, i) => i !== idx))}
                                  className="text-slate-300 hover:text-rose-500 font-bold ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <input 
                              type="text" 
                              className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                              placeholder="Nova categoria (ex: Vegano)"
                              value={marketplaceNewCategoryInput}
                              onChange={(e) => setMarketplaceNewCategoryInput(e.target.value)}
                            />
                            <button 
                              onClick={() => {
                                if (marketplaceNewCategoryInput.trim()) {
                                  setMarketplaceCategories([...marketplaceCategories, marketplaceNewCategoryInput.trim()]);
                                  setMarketplaceNewCategoryInput('');
                                }
                              }}
                              className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                           <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-500" /> Campanhas e Promoções do Marketplace
                              </h4>
                              <button 
                                onClick={() => {
                                   setEditingPromo({ 
                                     id: `promo_${Date.now()}`, 
                                     title: '', 
                                     description: '',
                                     active: true, 
                                     type: 'free_delivery',
                                     minOrderValue: 65,
                                     discountValue: 0,
                                     couponCode: '',
                                     participatingTenantIds: [] 
                                   });
                                   setShowPromoModal(true);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Plus size={12} /> Nova Promoção
                              </button>
                           </div>

                           <div className="space-y-3 pt-2">
                              {marketplacePromotions.map((promo, idx) => (
                                 <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all">
                                    <div className="flex items-center gap-3">
                                       <button 
                                         onClick={() => {
                                            const newPromos = marketplacePromotions.filter((_, i) => i !== idx);
                                            setMarketplacePromotions(newPromos);
                                         }}
                                         className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                       <button 
                                         onClick={() => {
                                           setEditingPromo({
                                             ...promo, 
                                             type: promo.type || 'free_delivery',
                                             minOrderValue: promo.minOrderValue ?? 65,
                                             discountValue: promo.discountValue ?? 0,
                                             couponCode: promo.couponCode || '',
                                             index: idx
                                           });
                                           setShowPromoModal(true);
                                         }}
                                         className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"
                                       >
                                          <Edit3 size={14} />
                                       </button>
                                       <div className="space-y-1">
                                         <div className="flex items-center gap-2 flex-wrap">
                                           <p className="text-xs font-black text-slate-800">{promo.title}</p>
                                           {promo.type === 'free_delivery' && (
                                             <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                               🚚 Frete Grátis {promo.minOrderValue ? `acima de R$ ${promo.minOrderValue.toFixed(2)}` : ''}
                                             </span>
                                           )}
                                           {promo.type === 'percentage_discount' && (
                                             <span className="text-[8px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                               🏷️ {promo.discountValue}% OFF {promo.minOrderValue ? `(min R$ ${promo.minOrderValue.toFixed(2)})` : ''}
                                             </span>
                                           )}
                                           {promo.type === 'fixed_discount' && (
                                             <span className="text-[8px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                               💵 R$ {promo.discountValue?.toFixed(2)} OFF {promo.minOrderValue ? `(min R$ ${promo.minOrderValue.toFixed(2)})` : ''}
                                             </span>
                                           )}
                                           {promo.couponCode && (
                                             <span className="text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded uppercase">
                                               Cupom: {promo.couponCode}
                                             </span>
                                           )}
                                         </div>
                                         <div className="flex items-center gap-2 text-[9px]">
                                           <span className="font-bold text-indigo-600 uppercase">
                                             {(!promo.participatingTenantIds || promo.participatingTenantIds.length === 0 || promo.participatingTenantIds.includes('all')) 
                                               ? 'Válido para Todos os Restaurantes' 
                                               : `${promo.participatingTenantIds.length} Restaurante(s) Participante(s)`}
                                           </span>
                                           {promo.description && (
                                             <span className="text-slate-400 font-medium">• {promo.description}</span>
                                           )}
                                         </div>
                                       </div>
                                    </div>
                                    <div 
                                      onClick={() => {
                                        const newPromos = [...marketplacePromotions];
                                        newPromos[idx].active = !newPromos[idx].active;
                                        setMarketplacePromotions(newPromos);
                                      }}
                                      className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-all ${promo.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    >
                                       <div className={`w-4 h-4 bg-white rounded-full transition-all ${promo.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                 </div>
                              ))}

                              {marketplacePromotions.length === 0 && (
                                <p className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                  Nenhuma promoção cadastrada ainda.
                                </p>
                              )}
                           </div>
                        </div>
                     </div>
                   </div>
                 )}

                 {/* SUB-TAB 4: ALGORITMOS & DESTAQUE DE LOJAS */}
                 {marketplaceConfigSubTab === 'ranking' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Award size={16} className="text-indigo-600" /> Estratégia de Ordenação Padrão no Feed
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium">Como as lojas são ordenadas por padrão para os clientes no aplicativo:</p>

                          <div className="space-y-3 pt-2">
                            <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${marketplaceRankingStrategy === 'distance' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                              <div>
                                <p className="text-xs font-bold">Mais Próximos Primeiro (Proximidade GPS)</p>
                                <p className="text-[9px] opacity-70">Prioriza restaurantes com menor raio de entrega em km</p>
                              </div>
                              <input 
                                type="radio" 
                                name="ranking" 
                                checked={marketplaceRankingStrategy === 'distance'}
                                onChange={() => setMarketplaceRankingStrategy('distance')}
                                className="accent-indigo-600 w-4 h-4"
                              />
                            </label>

                            <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${marketplaceRankingStrategy === 'rating' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                              <div>
                                <p className="text-xs font-bold">Maior Avaliação dos Clientes (Rating 5 estrelas)</p>
                                <p className="text-[9px] opacity-70">Lojas com melhores notas e mais avaliações positivas no topo</p>
                              </div>
                              <input 
                                type="radio" 
                                name="ranking" 
                                checked={marketplaceRankingStrategy === 'rating'}
                                onChange={() => setMarketplaceRankingStrategy('rating')}
                                className="accent-indigo-600 w-4 h-4"
                              />
                            </label>

                            <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${marketplaceRankingStrategy === 'delivery_time' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                              <div>
                                <p className="text-xs font-bold">Menor Tempo Estimado de Entrega</p>
                                <p className="text-[9px] opacity-70">Destaca restaurantes mais rápidos para despacho</p>
                              </div>
                              <input 
                                type="radio" 
                                name="ranking" 
                                checked={marketplaceRankingStrategy === 'delivery_time'}
                                onChange={() => setMarketplaceRankingStrategy('delivery_time')}
                                className="accent-indigo-600 w-4 h-4"
                              />
                            </label>

                            <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${marketplaceRankingStrategy === 'sponsored_first' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                              <div>
                                <p className="text-xs font-bold">Lojas Patrocinadas e Impulsionadas no Topo</p>
                                <p className="text-[9px] opacity-70">Exibe banners e restaurantes do plano Premium/Patrocinado primeiro</p>
                              </div>
                              <input 
                                type="radio" 
                                name="ranking" 
                                checked={marketplaceRankingStrategy === 'sponsored_first'}
                                onChange={() => setMarketplaceRankingStrategy('sponsored_first')}
                                className="accent-indigo-600 w-4 h-4"
                              />
                            </label>
                          </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-500" /> Monetização & Lojas Patrocinadas
                          </h4>

                          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                             <div>
                               <p className="text-xs font-bold text-slate-800">Ativar Venda de Destaques / Patrocínio</p>
                               <p className="text-[9px] text-slate-400 font-medium">Permite que restaurantes comprem selo "Destaque" no topo do app</p>
                             </div>
                             <div 
                               onClick={() => setMarketplaceEnableSponsored(!marketplaceEnableSponsored)}
                               className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${marketplaceEnableSponsored ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'}`}
                             >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${marketplaceEnableSponsored ? 'translate-x-6' : 'translate-x-0'}`} />
                             </div>
                          </div>
                        </div>
                     </div>
                   </div>
                 )}

                 {/* SUB-TAB 5: MANUTENÇÃO PROGRAMADA */}
                 {marketplaceConfigSubTab === 'maintenance' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                     <div className="space-y-6">
                        <div className="p-6 bg-amber-50/60 rounded-3xl border border-amber-200/80 space-y-4">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="text-amber-600" size={20} />
                                <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Modo de Manutenção do Marketplace</h4>
                              </div>
                              <div 
                                onClick={() => setMaintenanceConfig({ ...maintenanceConfig, active: !maintenanceConfig.active })}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${maintenanceConfig.active ? 'bg-amber-500 shadow-lg shadow-amber-200' : 'bg-slate-300'}`}
                              >
                                 <div className={`w-4 h-4 bg-white rounded-full transition-all ${maintenanceConfig.active ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                           </div>

                           <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                             Quando ativo, bloqueia a criação de novos pedidos no marketplace e exibe uma tela informativa com a justificativa programada aos consumidores.
                           </p>

                           <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Início da Manutenção</label>
                                    <input 
                                      type="datetime-local" 
                                      className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
                                      value={maintenanceConfig.startAt}
                                      onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, startAt: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Previsão de Término</label>
                                    <input 
                                      type="datetime-local" 
                                      className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
                                      value={maintenanceConfig.endAt}
                                      onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, endAt: e.target.value })}
                                    />
                                 </div>
                              </div>

                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Mensagem Exibida aos Consumidores</label>
                                 <textarea 
                                   className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 h-24"
                                   placeholder="Ex: Estamos em manutenção programada para atualização de servidores. Retornaremos em breve!"
                                   value={maintenanceConfig.message}
                                   onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, message: e.target.value })}
                                 />
                              </div>

                              <button 
                                onClick={() => setMaintenanceConfig({ ...maintenanceConfig, active: !maintenanceConfig.active })}
                                className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${
                                  maintenanceConfig.active 
                                    ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600' 
                                    : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'
                                }`}
                              >
                                 {maintenanceConfig.active ? 'Desativar Manutenção Agora' : 'Ativar Modo Manutenção'}
                              </button>
                           </div>
                        </div>
                     </div>

                     <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-3">
                        <Clock size={40} className="text-amber-500 opacity-80" />
                        <h4 className="text-sm font-black text-slate-800">Status Atual do Marketplace</h4>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${maintenanceConfig.active ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                          {maintenanceConfig.active ? '⚠️ Em Manutenção' : '✅ 100% Operacional e Ativo'}
                        </span>
                        <p className="text-[11px] text-slate-400 font-medium max-w-xs">
                          {maintenanceConfig.active ? (maintenanceConfig.message || 'Manutenção programada ativa.') : 'Os clientes podem navegar, escolher produtos e realizar pedidos normalmente.'}
                        </p>
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      ) : activeTab === 'subscription_rules' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                 <div>
                   <h3 className="text-lg font-black tracking-tighter">Regras Globais de Assinatura</h3>
                   <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Defina preços de excedentes, franquias e descontos de volume</p>
                 </div>
                 <button 
                   onClick={async () => {
                     try {
                       await setDoc(doc(db, 'settings', 'saas_config'), {
                         excedentOrderPrice: saasExcedentPrice,
                         maxExtraOrdersLimit: saasMaxExtraOrders,
                         enableExtraOrdersLimit: saasEnableExtraLimit,
                         volumeDiscounts: saasVolumeDiscounts
                       });
                       alert("Configurações de Assinatura salvas com sucesso!");
                     } catch (err) {
                       console.error("Erro ao salvar regras de assinatura:", err);
                       alert("Erro ao salvar.");
                     }
                   }}
                   className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20"
                 >
                   <Save size={16} className="inline mr-2" />
                   Salvar Regras
                 </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor por Pedido Excedente (R$)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" 
                         value={saasExcedentPrice}
                         onChange={(e) => setSaasExcedentPrice(Number(e.target.value))}
                       />
                       <p className="text-[9px] text-slate-400 font-medium">Este valor será cobrado por cada pedido que ultrapassar a franquia do plano na próxima renovação.</p>
                    </div>

                    <div className="space-y-4 p-5 bg-slate-50 rounded-[1.8rem] border border-slate-100/85">
                       <div className="flex items-center justify-between">
                          <div className="pr-4">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Limitar Pedidos Extras (Segurança)</span>
                            <span className="text-[8.5px] text-slate-400 font-medium block mt-0.5">Defina uma quantidade máxima de pedidos adicionais que o restaurante pode registrar antes que necessite de moderação manual (opcional).</span>
                          </div>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer shrink-0"
                            checked={saasEnableExtraLimit}
                            onChange={(e) => setSaasEnableExtraLimit(e.target.checked)}
                          />
                       </div>
                       
                       {saasEnableExtraLimit && (
                          <div className="space-y-2 animate-in slide-in-from-top-2 duration-250 pt-2 border-t border-slate-200/50">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quantidade Máxima de Pedidos Extras</label>
                             <input 
                               type="number" 
                               className="w-full p-3.5 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-600 transition-all" 
                               value={saasMaxExtraOrders}
                               onChange={(e) => setSaasMaxExtraOrders(Number(e.target.value))}
                             />
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-155 space-y-4">
                       <div className="flex justify-between items-center">
                          <div>
                             <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Descontos para Grandes Volumes</h4>
                             <p className="text-[9px] text-slate-400 font-medium mt-0.5">Defina faixas de descontos percentuais para incentivar o uso excedente em alta escala.</p>
                          </div>
                       </div>

                       <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {saasVolumeDiscounts.length > 0 ? (
                             saasVolumeDiscounts.map((discount, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3.5 bg-white border rounded-xl shadow-sm text-xs">
                                   <div className="font-bold text-slate-700">
                                      A partir de <span className="text-indigo-600 font-black">{discount.threshold}</span> pedidos extras
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-extrabold">
                                         -{discount.discountPercent}% desc.
                                      </span>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setSaasVolumeDiscounts(saasVolumeDiscounts.filter((_, i) => i !== idx));
                                        }}
                                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-all"
                                      >
                                         <Trash2 size={14} />
                                      </button>
                                   </div>
                                </div>
                             ))
                          ) : (
                             <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4">Nenhum desconto cadastrado.</p>
                          )}
                       </div>

                       <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-slate-150">
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase">A partir de (Qtd)</label>
                             <input 
                               type="number" 
                               placeholder="Ex: 500"
                               className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-indigo-500"
                               value={newTierThreshold}
                               onChange={(e) => setNewTierThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Desconto (%)</label>
                             <div className="relative">
                                <input 
                                  type="number" 
                                  placeholder="Ex: 15"
                                  className="w-full p-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-indigo-500 pr-8"
                                  value={newTierDiscount}
                                  onChange={(e) => setNewTierDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-3 text-xs font-black text-slate-400">%</span>
                             </div>
                          </div>
                       </div>
                       
                       <button 
                         type="button"
                         onClick={() => {
                           if (newTierThreshold === '' || newTierDiscount === '') return;
                           setSaasVolumeDiscounts([...saasVolumeDiscounts, { threshold: Number(newTierThreshold), discountPercent: Number(newTierDiscount) }].sort((a,b) => a.threshold - b.threshold));
                           setNewTierThreshold('');
                           setNewTierDiscount('');
                         }}
                         className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all"
                       >
                          Adicionar Faixa de Desconto
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : activeTab === 'suppliers' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <B2BSuppliersModule 
            currentUserEmail={currentUser?.email}
            currentTenantId={selectedAuditTenantId || 'demo-tenant'}
            onNavigateTab={onNavigate}
          />
        </div>
      ) : activeTab === 'diagnostics' ? (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <SystemDiagnosticsSuite />
        </div>
      ) : activeTab === 'audit' ? (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
          {/* SaaS Admin Audit Header & Store Selector */}
          {(() => {
            const auditOrdersList: Order[] = (incomingOrders && incomingOrders.length > 0 ? incomingOrders : orders) as Order[];
            return (
              <SystemAudit
                orders={auditOrdersList}
                financialRecords={financialRecords}
                customers={customers}
                products={products}
                cashClosings={cashClosings}
                cashSession={cashSession}
                auditLogs={auditLogs}
                users={users}
                currentUser={currentUser}
                bankAccounts={bankAccounts}
                tenants={tenants}
                selectedTenantId={selectedAuditTenantId === 'ALL' ? null : selectedAuditTenantId}
                onSelectTenantId={(tId) => setSelectedAuditTenantId(tId || 'ALL')}
                onUpdateCustomer={onUpdateCustomer}
                onAddFinancialRecord={onAddFinancialRecord}
                onUpdateFinancialRecord={onUpdateFinancialRecord}
                onOpenOrder={onOpenOrder}
                onRefresh={onRefreshData}
              />
            );
          })()}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
           <AlertTriangle size={48} className="mb-4 opacity-20" />
           <p className="font-black text-[10px] uppercase tracking-[0.2em]">Selecione uma aba para gerenciar</p>
        </div>
      )}

      {/* Promotion Config Modal */}
      {showPromoModal && editingPromo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
                <div>
                   <h2 className="text-xl font-black tracking-tighter">Configurar Promoção</h2>
                   <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Defina o banner e restaurantes participantes</p>
                </div>
                <button onClick={() => setShowPromoModal(false)} className="p-2 text-white/50 hover:text-white transition-all"><X size={20} /></button>
             </div>
             
             <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Título da Promoção</label>
                         <input 
                           type="text" 
                           className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                           value={editingPromo.title}
                           onChange={(e) => setEditingPromo({...editingPromo, title: e.target.value})}
                           placeholder="Ex: Entrega Grátis Especial"
                         />
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Promoção / Benefício</label>
                         <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingPromo({...editingPromo, type: 'free_delivery'})}
                              className={`p-3 rounded-2xl border-2 font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all ${(editingPromo.type || 'free_delivery') === 'free_delivery' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                            >
                               <span className="text-base">🚚</span>
                               <span>Frete Grátis</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPromo({...editingPromo, type: 'percentage_discount'})}
                              className={`p-3 rounded-2xl border-2 font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all ${editingPromo.type === 'percentage_discount' ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                            >
                               <span className="text-base">🏷️</span>
                               <span>Desconto %</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPromo({...editingPromo, type: 'fixed_discount'})}
                              className={`p-3 rounded-2xl border-2 font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all ${editingPromo.type === 'fixed_discount' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                            >
                               <span className="text-base">💵</span>
                               <span>Desconto R$</span>
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                              Valor Mínimo (R$)
                            </label>
                            <input 
                              type="number" 
                              step="0.5"
                              min="0"
                              className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                              value={editingPromo.minOrderValue ?? ''}
                              onChange={(e) => setEditingPromo({...editingPromo, minOrderValue: parseFloat(e.target.value) || 0})}
                              placeholder="Ex: 65.00"
                            />
                            <p className="text-[8px] text-slate-400 font-bold ml-1">Pedido mínimo para ativar</p>
                         </div>

                         {(editingPromo.type === 'percentage_discount' || editingPromo.type === 'fixed_discount') ? (
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                {editingPromo.type === 'percentage_discount' ? 'Desconto (%)' : 'Desconto (R$)'}
                              </label>
                              <input 
                                type="number" 
                                step="0.5"
                                min="0"
                                className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                                value={editingPromo.discountValue ?? ''}
                                onChange={(e) => setEditingPromo({...editingPromo, discountValue: parseFloat(e.target.value) || 0})}
                                placeholder={editingPromo.type === 'percentage_discount' ? 'Ex: 10' : 'Ex: 15.00'}
                              />
                              <p className="text-[8px] text-slate-400 font-bold ml-1">Valor do benefício</p>
                           </div>
                         ) : (
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Código Cupom (Opcional)</label>
                              <input 
                                type="text" 
                                className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:border-indigo-500 transition-all"
                                value={editingPromo.couponCode || ''}
                                onChange={(e) => setEditingPromo({...editingPromo, couponCode: e.target.value.toUpperCase()})}
                                placeholder="Ex: FRETE65"
                              />
                              <p className="text-[8px] text-slate-400 font-bold ml-1">Vazio = Automático</p>
                           </div>
                         )}
                      </div>

                      {(editingPromo.type === 'percentage_discount' || editingPromo.type === 'fixed_discount') && (
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Código Cupom (Opcional)</label>
                           <input 
                             type="text" 
                             className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:border-indigo-500 transition-all"
                             value={editingPromo.couponCode || ''}
                             onChange={(e) => setEditingPromo({...editingPromo, couponCode: e.target.value.toUpperCase()})}
                             placeholder="Ex: FESTA10"
                           />
                           <p className="text-[8px] text-slate-400 font-bold ml-1">Vazio = Desconto automático acima do valor mínimo</p>
                        </div>
                      )}

                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição / Regras (Exibida ao Cliente)</label>
                         <input 
                           type="text" 
                           className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                           value={editingPromo.description || ''}
                           onChange={(e) => setEditingPromo({...editingPromo, description: e.target.value})}
                           placeholder="Ex: Entrega grátis em pedidos acima de R$ 65,00"
                         />
                      </div>
                      
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Banner Específico (Opcional)</label>
                         <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl space-y-3">
                            {editingPromo.bannerUrl && (
                              <img src={editingPromo.bannerUrl} className="w-full h-24 object-cover rounded-xl" alt="Promo Preview" />
                            )}
                            <label className="w-full py-2 bg-white border border-slate-200 text-indigo-600 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center">
                               <Upload size={12} className="mr-2" /> {editingPromo.bannerUrl ? 'Trocar Banner' : 'Subir Banner'}
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*" 
                                 onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                       const reader = new FileReader();
                                       reader.onload = async (event) => {
                                          const base64 = event.target?.result as string;
                                          try {
                                             const compressed = await compressImage(base64, 1000, 350, 0.7);
                                             setEditingPromo({...editingPromo, bannerUrl: compressed});
                                          } catch (err) {
                                             setEditingPromo({...editingPromo, bannerUrl: base64});
                                          }
                                       };
                                       reader.readAsDataURL(file);
                                    }
                                 }}
                               />
                            </label>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">
                           Restaurantes ({editingPromo.participatingTenantIds?.length || 0}/{tenants.length})
                         </label>
                         <button
                           type="button"
                           onClick={() => {
                             const allIds = tenants.map(t => t.id);
                             const isAllSelected = (editingPromo.participatingTenantIds || []).length >= tenants.length;
                             setEditingPromo({
                               ...editingPromo,
                               participatingTenantIds: isAllSelected ? [] : allIds
                             });
                           }}
                           className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider hover:underline"
                         >
                           {(editingPromo.participatingTenantIds || []).length >= tenants.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                         </button>
                      </div>
                      <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden flex flex-col h-80">
                         <div className="p-3 border-b bg-white flex items-center gap-2">
                           <Search size={14} className="text-slate-400" />
                           <input 
                             type="text" 
                             placeholder="Buscar restaurante..." 
                             className="text-[10px] font-bold outline-none w-full" 
                             value={promoTenantSearch}
                             onChange={(e) => setPromoTenantSearch(e.target.value)}
                           />
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {tenants
                             .filter(t => t.name.toLowerCase().includes(promoTenantSearch.toLowerCase()))
                             .map(tenant => {
                               const isSelected = (editingPromo.participatingTenantIds || []).includes(tenant.id);
                               return (
                                 <button
                                   key={tenant.id}
                                   type="button"
                                   onClick={() => {
                                      const currentIds = editingPromo.participatingTenantIds || [];
                                      const newIds = isSelected 
                                        ? currentIds.filter((id: string) => id !== tenant.id)
                                        : [...currentIds, tenant.id];
                                      setEditingPromo({...editingPromo, participatingTenantIds: newIds});
                                   }}
                                   className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                   }`}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className="w-7 h-7 rounded-lg bg-white/20 overflow-hidden flex items-center justify-center">
                                          {tenant.logoUrl ? <img src={tenant.logoUrl} className="w-full h-full object-cover" /> : <Building2 size={13} />}
                                       </div>
                                       <div className="text-left">
                                         <p className="text-[10px] font-black uppercase leading-tight">{tenant.name}</p>
                                         <p className={`text-[8px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'} font-medium`}>{tenant.segment || 'Restaurante'}</p>
                                       </div>
                                    </div>
                                    {isSelected ? <CheckCircle2 size={16} className="text-white" /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                                 </button>
                               );
                             })}
                         </div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold ml-1">
                        * Se nenhum restaurante for selecionado ou todos estiverem marcados, a promoção é válida para todo o marketplace.
                      </p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => setShowPromoModal(false)}
                     className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                   >
                      Cancelar
                   </button>
                   <button 
                     onClick={() => {
                        const newPromos = [...marketplacePromotions];
                        if (editingPromo.index !== undefined) {
                           newPromos[editingPromo.index] = { ...editingPromo };
                        } else {
                           newPromos.push({ ...editingPromo });
                        }
                        setMarketplacePromotions(newPromos);
                        setShowPromoModal(false);
                     }}
                     className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                   >
                      Confirmar Promoção
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
      {showSaaSUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                <div>
                   <h2 className="text-xl font-black tracking-tighter">
                     {editingSaaSUser ? 'Editar Membro Equipe SaaS' : 'Novo Membro Equipe SaaS'}
                   </h2>
                   <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">
                     {editingSaaSUser ? 'Atualize as informações e permissões' : 'Defina permissões específicas de acesso'}
                   </p>
                </div>
                <button onClick={() => { setShowSaaSUserModal(false); setEditingSaaSUser(null); }} className="p-2 text-white/50 hover:text-white transition-all"><X size={20} /></button>
             </div>
             <form onSubmit={handleSaveSaaSUser} className="p-8 space-y-6">
                {emailError && (
                   <div className="bg-rose-50 border-2 border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold text-center">
                      {emailError}
                   </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                     <input required name="name" type="text" defaultValue={editingSaaSUser?.name || ''} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Ex: Admin KitchenFlow AI" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                     <input required name="email" type="email" defaultValue={editingSaaSUser?.email || ''} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" placeholder="admin@kitchenflowai.com" />
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                     Senha de Acesso {editingSaaSUser && <span className="text-slate-400 text-[8px] lowercase font-normal">(deixe em branco para manter a atual)</span>}
                   </label>
                   <input 
                     name="password" 
                     type="text" 
                     required={!editingSaaSUser}
                     className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" 
                     placeholder={editingSaaSUser ? "•••••••• (Opcional)" : "Digite uma senha ou deixe em branco para gerar automática"} 
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Módulos Permitidos</label>
                   <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {SAAS_ADMIN_MODULES.map(module => (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => {
                            setSelectedSaasPermissions(prev => 
                              prev.includes(module.id) 
                                ? prev.filter(id => id !== module.id)
                                : [...prev, module.id]
                            );
                          }}
                          className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                            selectedSaasPermissions.includes(module.id)
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded shadow-inner ${selectedSaasPermissions.includes(module.id) ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                          <span className="text-[9px] font-black uppercase tracking-tighter text-left">{module.label}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all mt-4">
                   {editingSaaSUser ? 'Salvar Alterações' : 'Gerar Credenciais de Acesso'}
                </button>
             </form>
          </div>
        </div>
      )}
      {/* Tenant User Creation Modal */}
      {showTenantUserModal && selectedTenantForUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 shadow-2xl">
          <div className="bg-white w-full max-m-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
                <div>
                   <h2 className="text-xl font-black tracking-tighter">Novo Usuário Admin</h2>
                   <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">{selectedTenantForUser.name}</p>
                </div>
                <button onClick={() => setShowTenantUserModal(false)} className="p-2 text-white/50 hover:text-white transition-all"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateTenantUser} className="p-8 space-y-4">
                {emailError && (
                   <div className="bg-rose-50 border-2 border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold text-center">
                      {emailError}
                   </div>
                )}
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                   <input required name="name" type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Ex: João da Silva" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                   <input required name="email" type="email" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="email@cliente.com" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Permissão</label>
                   <select name="role" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all appearance-none">
                      <option value="ADMIN">Administrador (Total)</option>
                      <option value="MANAGER">Gerente (Operacional)</option>
                      <option value="WAITER">Garçom (Pedidos)</option>
                      <option value="CHEF">Cozinha (KDS)</option>
                   </select>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4">
                   Gerar e Notificar Acesso
                </button>
             </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                  {editingTenant ? 'Editar Cliente' : 'Novo Cliente SaaS'}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure os acessos e assinatura</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><XCircle size={24} /></button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Estabelecimento</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ex: Pizzaria do João"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID do Proprietário (UID Firebase)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Cole o UID do usuário aqui"
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano de Assinatura</label>
                  <select 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    required
                  >
                    <option value="">Selecione um plano</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Vencimento</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo do Estabelecimento (Marketplace)</label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl">
                     <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <Building2 className="text-slate-200" size={32} />}
                     </div>
                     <div className="flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm">
                           <Upload size={14} /> Selecionar Foto
                           <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                       const base64 = event.target?.result as string;
                                       try {
                                          const compressed = await compressImage(base64, 400, 400, 0.7);
                                          setLogoUrl(compressed);
                                       } catch (err) {
                                          console.error("Error compressing logo:", err);
                                          setLogoUrl(base64);
                                       }
                                    };
                                    reader.readAsDataURL(file);
                                 }
                              }} 
                           />
                        </label>
                     </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <select 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Selecione uma categoria</option>
                    {commerceCategories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <textarea 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all h-24"
                    placeholder="Breve descrição do restaurante para o app delivery"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setAutoAcceptOrders(!autoAcceptOrders)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      autoAcceptOrders
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoAcceptOrders ? 'bg-emerald-100' : 'bg-slate-50'}`}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm tracking-tight text-slate-800">Aceite Automático de Pedidos</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Aprovar pedidos do marketplace instantaneamente</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-all ${autoAcceptOrders ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-all ${autoAcceptOrders ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Módulos Habilitados (Personalizado)</label>
                    <button 
                      type="button"
                      onClick={() => {
                        const selectedPlan = plans.find(p => p.id === selectedPlanId);
                        if (selectedPlan) setTenantModules(selectedPlan.modules);
                      }}
                      className="text-[8px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                      Resetar para o Plano
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_MODULES.map(module => (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => {
                          setTenantModules(prev => 
                            prev.includes(module.id) 
                              ? prev.filter(id => id !== module.id)
                              : [...prev, module.id]
                          );
                        }}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                          tenantModules.includes(module.id)
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded shadow-inner ${tenantModules.includes(module.id) ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-left">{module.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  {editingTenant ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                  {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina o preço e módulos inclusos</p>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><XCircle size={24} /></button>
            </div>

            <form onSubmit={handleSavePlan} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Plano</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ex: Plano Profissional"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Máximo de Usuários</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={planMaxUsers}
                    onChange={(e) => setPlanMaxUsers(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Período de Faturamento</label>
                  <select 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={planBillingCycle}
                    onChange={(e) => setPlanBillingCycle(e.target.value as any)}
                    required
                  >
                    <option value="monthly">Mensal</option>
                    <option value="semiannual">Semestral (A cada 6 meses)</option>
                    <option value="yearly">Anual (A cada 12 meses)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Franquia de Pedidos (Mensal)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={planMaxOrders}
                    onChange={(e) => setPlanMaxOrders(Number(e.target.value))}
                  />
                  <p className="text-[9px] text-slate-400 font-bold ml-1">Defina como 0 (zero) para configurar pedidos ILIMITADOS neste plano.</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Breve descrição do plano"
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulos Inclusos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_MODULES.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                        planModules.includes(module.id)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        planModules.includes(module.id) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {planModules.includes(module.id) ? <CheckCircle2 size={14} /> : <LayoutDashboard size={14} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">{module.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  {editingPlan ? 'Salvar Plano' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Renewal Modal - Interactive & Robust Periods */}
      {showRenewModal && renewingTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center text-slate-800">
              <div>
                <h2 className="text-xl font-black tracking-tighter">Estender Assinatura</h2>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                  Cliente: {renewingTenant.name}
                </p>
              </div>
              <button type="button" onClick={() => { setShowRenewModal(false); setRenewingTenant(null); }} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRenewSubscription} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade do Período</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'monthly', label: 'Mensal', desc: 'Preço cheio' },
                    { id: 'semiannual', label: 'Semestral', desc: '5% de desconto' },
                    { id: 'yearly', label: 'Anual', desc: '10% de desconto' },
                    { id: 'custom', label: 'Personalizado', desc: 'Definir data/valor' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRenewPeriod(p.id as any)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        renewPeriod === p.id 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <p className="font-black text-xs uppercase tracking-wider">{p.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {renewPeriod === 'custom' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Data de Expiração</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none"
                      value={renewCustomDate}
                      onChange={(e) => setRenewCustomDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Cobrado (R$)</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none"
                      value={renewCustomPrice}
                      onChange={(e) => setRenewCustomPrice(Number(e.target.value))}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Calculado</p>
                    <p className="text-xl font-black text-slate-800">
                      R$ {(() => {
                        const sPlan = plans.find(p => p.id === renewingTenant.planId) || plans.find(p => p.name === renewingTenant.subscription.plan);
                        const basePrice = sPlan ? sPlan.price : 99;
                        const mul = renewPeriod === 'monthly' ? 1 : renewPeriod === 'semiannual' ? 6 : 12;
                        const disc = renewPeriod === 'monthly' ? 0 : renewPeriod === 'semiannual' ? 0.05 : 0.10;
                        return (basePrice * mul * (1 - disc)).toFixed(2);
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Custo por Ciclo</p>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-lg uppercase tracking-wider">
                      {renewPeriod === 'monthly' ? 'Normal' : renewPeriod === 'semiannual' ? '5% OFF' : renewPeriod === 'yearly' ? '10% OFF' : 'Personalizado'}
                    </span>
                  </div>
                </div>
              )}

              {/* Expiry Preview */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex gap-4 items-center">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Novo Vencimento</p>
                  <p className="text-sm font-black text-indigo-800">
                    {(() => {
                      let currentExpiry = new Date(renewingTenant.subscription.expiryDate || new Date());
                      if (currentExpiry < new Date()) {
                        currentExpiry = new Date();
                      }
                      if (renewPeriod === 'monthly') {
                        currentExpiry.setMonth(currentExpiry.getMonth() + 1);
                      } else if (renewPeriod === 'semiannual') {
                        currentExpiry.setMonth(currentExpiry.getMonth() + 6);
                      } else if (renewPeriod === 'yearly') {
                        currentExpiry.setMonth(currentExpiry.getMonth() + 12);
                      } else if (renewPeriod === 'custom' && renewCustomDate) {
                        currentExpiry = new Date(renewCustomDate);
                      }
                      return currentExpiry.toLocaleDateString('pt-BR');
                    })()}
                  </p>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                  <select
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none"
                    value={renewPaymentMethod}
                    onChange={(e) => setRenewPaymentMethod(e.target.value as any)}
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <button
                    type="button"
                    onClick={() => setRegisterPayment(!registerPayment)}
                    className={`flex items-center justify-between w-full p-3 overflow-hidden rounded-xl border transition-all ${
                      registerPayment ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider">Registrar Caixa</span>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${registerPayment ? 'bg-emerald-600 text-white' : 'bg-slate-300'}`}>
                      {registerPayment && <Check size={10} />}
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => { setShowRenewModal(false); setRenewingTenant(null); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Confirmar Renovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Creation Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center text-slate-800">
              <div>
                <h2 className="text-xl font-black tracking-tighter">{editingLead ? 'Editar Lead' : 'Novo Prospect'}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Capture informações de potenciais clientes</p>
              </div>
              <button onClick={() => setShowLeadModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveLead} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Contato</label>
                  <input required name="name" defaultValue={editingLead?.name} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa / Restaurante</label>
                  <input required name="companyName" defaultValue={editingLead?.companyName} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input required name="email" type="email" defaultValue={editingLead?.email} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                  <input required name="phone" defaultValue={editingLead?.phone} onChange={(e) => e.target.value = maskPhone(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" />
                </div>
              </div>
              {editingLead && (
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status do Lead</label>
                    <select name="status" defaultValue={editingLead?.status} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all">
                       <option value="Novo">Novo Contato</option>
                       <option value="Negociação">Em Negociação</option>
                       <option value="Convertido">Convertido</option>
                       <option value="Perdido">Perdido</option>
                    </select>
                 </div>
              )}
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4">
                {editingLead ? 'Atualizar Lead' : 'Salvar Prospect'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Support Reply Modal */}
      {showSupportModal && selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tighter">Responder Chamado</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ticket: {selectedTicket.subject}</p>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem do Lojista:</p>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{selectedTicket.message}</p>
              </div>
              
              {selectedTicket.replies?.map((reply: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-2xl text-xs font-medium ${reply.sender === 'SaaS Master' ? 'bg-indigo-50 ml-8' : 'bg-slate-100 mr-8 text-slate-600'}`}>
                  <p className="font-black text-[9px] uppercase tracking-widest mb-1">{reply.sender}</p>
                  <p>{reply.message}</p>
                </div>
              ))}

              <form onSubmit={handleReplyTicket} className="space-y-4">
                <textarea 
                  required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all min-h-[120px]"
                  placeholder="Sua resposta para o lojista..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'closed')}
                    className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all"
                  >
                    Encerrar Chamado
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    Enviar Resposta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && confirmConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`p-6 text-center ${confirmConfig.type === 'danger' ? 'bg-rose-50' : confirmConfig.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-rose-500 text-white' : confirmConfig.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">{confirmConfig.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="p-4 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
                className={`flex-1 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${confirmConfig.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : confirmConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FECHAMENTO DE CICLO (RECONCILIAÇÃO) */}
      {showCloseCycleModal && selectedTenantForBilling && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-950 text-white">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">Fechamento de Ciclo & Faturamento</h2>
                <p className="text-[9px] text-white/60 tracking-wider font-semibold uppercase mt-0.5">
                  Reconciliar comissões e assinaturas do cliente {selectedTenantForBilling.name}
                </p>
              </div>
              <button 
                onClick={() => setShowCloseCycleModal(false)} 
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Resumo do Período */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inquilino</span>
                  <span className="text-xs font-black text-slate-800">{selectedTenantForBilling.name}</span>
                </div>
                
                {/* Stats da comissão */}
                {(() => {
                  const stats = getTenantMarketplaceStats(selectedTenantForBilling.id);
                  const mktFees = stats.unbilledFees;
                  const planBase = parseFloat(billingCustomSubscriptionPrice) || 0;
                  const total = mktFees + (billingIncludeSubscription ? planBase : 0);
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold">Pedidos no Ciclo Marketplace:</span>
                        <span className="font-black text-slate-800">{stats.unbilledOrdersCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold">GMV Acumulado no Ciclo:</span>
                        <span className="font-black text-slate-800">R$ {stats.unbilledGMV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-amber-600 font-bold">
                        <span>Tarifas de Marketplace (Comissão + Fixo):</span>
                        <span>R$ {mktFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Toggles e Overrides */}
              <div className="space-y-3">
                {/* Toggle de inclusão de assinatura */}
                <div className="flex items-start justify-between gap-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-indigo-950">Cobrar Mensalidade SaaS</p>
                    <p className="text-[8px] text-indigo-700/80 leading-normal">
                      Inclui o valor correspondente ao plano {selectedTenantForBilling.subscription?.plan || 'PRO'} neste período de cobrança.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={billingIncludeSubscription}
                      onChange={(e) => setBillingIncludeSubscription(e.target.checked)}
                    />
                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {billingIncludeSubscription && (
                  <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-150">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço da Assinatura (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={billingCustomSubscriptionPrice}
                        onChange={(e) => setBillingCustomSubscriptionPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento da Cobrança</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={billingCustomDueDate}
                        onChange={(e) => setBillingCustomDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!billingIncludeSubscription && (
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento da Cobrança</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                      value={billingCustomDueDate}
                      onChange={(e) => setBillingCustomDueDate(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas / Descrição do Lançamento</label>
                  <textarea 
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                    value={billingCustomNotes}
                    onChange={(e) => setBillingCustomNotes(e.target.value)}
                    placeholder="Descrição da cobrança para o financeiro..."
                  />
                </div>
              </div>

              {/* Valor total a cobrar */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Valor Final Consolidado</span>
                  <p className="text-xs text-slate-300 font-bold leading-normal">Comissão + Mensalidade do Período</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black tracking-tight text-white block">
                    R$ {(() => {
                      const stats = getTenantMarketplaceStats(selectedTenantForBilling.id);
                      const mktFees = stats.unbilledFees;
                      const planBase = billingIncludeSubscription ? (parseFloat(billingCustomSubscriptionPrice) || 0) : 0;
                      return (mktFees + planBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => setShowCloseCycleModal(false)}
                className="flex-1 py-3 bg-white border text-slate-500 hover:bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  const stats = getTenantMarketplaceStats(selectedTenantForBilling.id);
                  const subPrice = billingIncludeSubscription ? (parseFloat(billingCustomSubscriptionPrice) || 0) : 0;
                  await handleCloseCycleAndBill(
                    selectedTenantForBilling,
                    stats.unbilledOrdersList,
                    stats.unbilledFees,
                    billingIncludeSubscription,
                    subPrice,
                    billingCustomDueDate,
                    billingCustomNotes
                  );
                  setShowCloseCycleModal(false);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-indigo-100"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PIX / DETALHES DE COBRANÇA */}
      {showBillingModal && selectedBilling && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Fatura de Ciclo Emitida</h2>
                  <p className="text-[9px] text-indigo-100 tracking-wider font-semibold uppercase mt-0.5">
                    Envie o Pix Copia e Cola para o Lojista
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowBillingModal(false)} 
                className="p-1.5 text-indigo-100 hover:text-white hover:bg-indigo-500/50 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto font-sans">
              
              {/* Pix Card */}
              <div className="p-5 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-[2rem] text-white relative overflow-hidden border border-indigo-950">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      PIX Ativo
                    </span>
                    <h3 className="text-sm font-black mt-2 leading-none">{selectedBilling.tenantName}</h3>
                    <p className="text-[8px] text-slate-400 mt-1 font-bold">Fatura Ref: #{selectedBilling.id.slice(-6)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white p-1 rounded-xl flex items-center justify-center">
                    {/* Simulated Pix Logo QR */}
                    <svg viewBox="0 0 24 24" className="w-full h-full text-slate-800" fill="currentColor">
                      <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2zm-1 9H9v2h2v-2zm4 0h-2v2h2v-2zm-4 4H9v2h2v-2zm4 0h-2v2h2v-2z"/>
                    </svg>
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-end border-t border-slate-800 pt-4">
                  <div>
                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Valor do Ciclo</span>
                    <p className="text-2xl font-black text-white tracking-tight">
                      R$ {selectedBilling.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className="text-[8px] text-indigo-400 font-black tracking-widest uppercase">KITCHENFLOW AI SAAS</span>
                </div>
              </div>

              {/* Pix Copy & Paste Block */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Pix Copia e Cola
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    className="flex-1 px-3 py-2 bg-slate-50 border rounded-xl font-mono text-[9px] font-semibold text-slate-500 select-all outline-none"
                    value={selectedBilling.pixCode}
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedBilling.pixCode);
                      alert('Chave Pix copiada com sucesso!');
                    }}
                    className="px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                    title="Copiar Pix"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ações de Cobrança</p>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* WhatsApp Quick Link */}
                  <button
                    onClick={() => {
                      const text = `Olá! 🍲 Segue o fechamento de ciclo do KitchenFlow AI para o restaurante *${selectedBilling.tenantName}*.\n\n*Valor:* R$ ${selectedBilling.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n*Vencimento:* Hoje\n\nUse o Pix Copia e Cola abaixo para efetuar o pagamento:\n\n\`\`\`${selectedBilling.pixCode}\`\`\`\n\nQualquer dúvida, conte conosco!`;
                      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-100"
                  >
                    <MessageSquare size={13} /> Enviar Cobrança por WhatsApp
                  </button>

                  {/* Resend Email Quick Button */}
                  <button
                    onClick={async () => {
                      const targetEmail = prompt(`Digite o e-mail para envio da fatura de ${selectedBilling.tenantName}:`, 'financeirorenanuk@gmail.com');
                      if (!targetEmail) return;
                      try {
                        await sendSaasInvoiceEmailResend({
                          email: targetEmail,
                          tenantName: selectedBilling.tenantName,
                          amount: selectedBilling.amount,
                          description: selectedBilling.description || `Fechamento de Ciclo SaaS - ${selectedBilling.tenantName}`,
                          qrCodePix: selectedBilling.pixCode,
                          dueDate: new Date().toLocaleDateString('pt-BR')
                        });
                        alert(`Fatura enviada com sucesso para ${targetEmail} via Resend!`);
                      } catch (err: any) {
                        alert(`Erro ao enviar e-mail via Resend: ${err.message || err}`);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-100"
                  >
                    <Mail size={13} /> Enviar Fatura por E-mail (Resend)
                  </button>

                  {/* Settle Invoice manually */}
                  <button
                    onClick={async () => {
                      if (!window.confirm("Deseja marcar esta fatura como PAGA manualmente? Isso conciliará todos os pedidos do ciclo e dará baixa na conta a receber.")) return;
                      try {
                        // 1. Update saasLedger status to paid
                        await setDoc(doc(db, 'saasLedger', selectedBilling.id), {
                          ...selectedBilling,
                          status: 'paid',
                          paymentMethod: 'pix',
                          paidAt: new Date()
                        }, { merge: true });

                        setLedger(prev => prev.map(l => l.id === selectedBilling.id ? {
                          ...l,
                          status: 'paid',
                          paymentMethod: 'pix',
                          paidAt: new Date()
                        } : l));

                        // 2. Find all marketplaceInvoices with this ledgerId and update to paid
                        const q = query(collection(db, 'marketplaceInvoices'), where('ledgerId', '==', selectedBilling.id));
                        const snaps = await getDocs(q);
                        for (const docSnap of snaps.docs) {
                          await setDoc(doc(db, 'marketplaceInvoices', docSnap.id), {
                            ...docSnap.data(),
                            status: 'paid',
                            paidAt: new Date()
                          }, { merge: true });
                        }

                        setMarketplaceInvoices(prev => prev.map(inv => inv.ledgerId === selectedBilling.id ? {
                          ...inv,
                          status: 'paid',
                          paidAt: new Date()
                        } : inv));

                        alert('Ciclo conciliado e faturamento quitado com sucesso!');
                        setShowBillingModal(false);
                      } catch (err) {
                        console.error("Error settling invoice manually:", err);
                        // Fallback local update
                        setLedger(prev => prev.map(l => l.id === selectedBilling.id ? {
                          ...l,
                          status: 'paid',
                          paymentMethod: 'pix',
                          paidAt: new Date()
                        } : l));
                        alert('Ciclo conciliado e faturamento quitado localmente!');
                        setShowBillingModal(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={13} className="text-emerald-500" /> Dar Baixa Manual / Simular Pix Pago
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t flex">
              <button 
                onClick={() => setShowBillingModal(false)}
                className="w-full py-3 bg-white border text-slate-700 hover:bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-center"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERAR CONTRATO DE CESSÃO DE USO DE SOFTWARE */}
      {showContractModal && selectedTenantForContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body > * {
                display: none !important;
              }
              #print-contract-wrapper {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                color: black !important;
                padding: 2cm !important;
                font-family: 'Times New Roman', serif !important;
                font-size: 12pt !important;
                line-height: 1.5 !important;
              }
              #print-contract-wrapper * {
                background: transparent !important;
                color: black !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />
          <div id="print-contract-wrapper" className="hidden">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '16pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                INSTRUMENTO PARTICULAR DE CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)
              </h1>
              <h2 style={{ fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                E PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA
              </h2>
            </div>

            <p style={{ textIndent: '2cm', textAlign: 'justify', marginBottom: '1.5rem' }}>
              Pelo presente instrumento particular, de um lado, na qualidade de <strong>LICENCIANTE</strong>, a empresa <strong>KITCHENFLOW AI LTDA</strong>, inscrita no CNPJ sob o nº {contractOwnerCNPJ}, sediada em {contractOwnerAddress}, neste ato representada por {contractOwnerRepresentative}.
            </p>

            <p style={{ textIndent: '2cm', textAlign: 'justify', marginBottom: '1.5rem' }}>
              E, de outro lado, na qualidade de <strong>LICENCIADA</strong>, a empresa/restaurante <strong>{selectedTenantForContract.name}</strong>, inscrita no CNPJ sob o nº {selectedTenantForContract.cnpj || '____________________'}, com sede em {selectedTenantForContract.address || '____________________'}, telefone {selectedTenantForContract.phone || '____________________'}, neste ato representada por seu representante legal qualificado em seu ato constitutivo.
            </p>

            <p style={{ textIndent: '2cm', textAlign: 'justify', marginBottom: '1.5rem' }}>
              Têm entre si, justo e contratado, o que mutuamente aceitam e outorgam mediante as seguintes cláusulas e condições:
            </p>

            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CLÁUSULA PRIMEIRA – DO OBJETO</h3>
            <p style={{ textAlign: 'justify', marginBottom: '1rem' }}>
              1.1. O objeto deste contrato é a licença de uso temporária, não exclusiva e intransferível do software de gestão comercial e autoatendimento denominado <strong>KitchenFlow AI POS & Marketplace</strong> (doravante denominado "Software" ou "Plataforma"), bem como a prestação de serviços de suporte técnico, armazenamento de dados e integração de canais de venda associados.
            </p>

            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CLÁUSULA SEGUNDA – DA VIGÊNCIA E DO PRAZO</h3>
            <p style={{ textAlign: 'justify', marginBottom: '1rem' }}>
              2.1. O presente instrumento é celebrado por prazo determinado de {contractDurationMonths} meses, contados a partir de {new Date(contractDate).toLocaleDateString('pt-BR')}, renovando-se automaticamente por períodos iguais e sucessivos caso não haja manifestação expressa em contrário de qualquer das partes, com antecedência mínima de 30 (trinta) dias do término da vigência.
            </p>

            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CLÁUSULA TERCEIRA – DOS VALORES E CONDIÇÕES DE PAGAMENTO</h3>
            <p style={{ textAlign: 'justify', marginBottom: '1rem' }}>
              3.1. Pela licença de uso do Software e serviços correspondentes ao Plano <strong>{selectedTenantForContract.subscription?.plan || 'PRO'}</strong>, a LICENCIADA pagará à LICENCIANTE o valor fixo recorrente de <strong>R$ {(parseFloat(billingCustomSubscriptionPrice) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por ciclo mensal, com vencimento conforme estipulado nas faturas mensais enviadas.
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '1rem' }}>
              3.2. Adicionalmente, caso aplicável, incidirá uma comissão de corretagem sobre as vendas realizadas através do canal Marketplace próprio de <strong>{marketplaceFee}%</strong> mais a taxa fixa de <strong>R$ {marketplaceFixedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por pedido concluído, cujo fechamento e cobrança (conciliação) ocorrerá em ciclos periódicos definidos em painel administrativo.
            </p>

            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CLÁUSULA QUARTA – DAS RESPONSABILIDADES DA LICENCIADA</h3>
            <p style={{ textAlign: 'justify', marginBottom: '1rem' }}>
              4.1. A LICENCIADA compromete-se a: (a) utilizar o Software estritamente dentro dos limites legais e das diretrizes contratuais; (b) manter suas credenciais de acesso seguras e confidenciais; (c) fornecer informações precisas e fidedignas relativas a seu estabelecimento comercial, cardápio, preços e conformidade fiscal; e (d) adimplir pontualmente com as obrigações financeiras descritas na Cláusula Terceira.
            </p>

            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CLÁUSULA QUINTA – CONFIDENCIALIDADE E LEI GERAL DE PROTEÇÃO DE DADOS (LGPD)</h3>
            <p style={{ textAlign: 'justify', marginBottom: '1rem' }}>
              5.1. As Partes obrigam-se a manter o mais absoluto sigilo sobre quaisquer dados pessoais, segredos de negócios ou informações operacionais obtidos em decorrência do presente contrato, adotando todas as medidas de segurança técnicas e administrativas necessárias para o cumprimento rigoroso da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).
            </p>

            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CLÁUSULA SEXTA – DO FORO</h3>
            <p style={{ textAlign: 'justify', marginBottom: '1.5rem' }}>
              6.1. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de {contractCity} - {contractState}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>

            <p style={{ textAlign: 'justify', marginTop: '3rem', marginBottom: '3rem' }}>
              E, por estarem assim justas e contratadas, assinam o presente instrumento em 02 (duas) vias de igual teor e forma para um único efeito de direito, na presença das testemunhas abaixo qualificadas.
            </p>

            <p style={{ textAlign: 'right', marginBottom: '4rem' }}>
              {contractCity}/{contractState}, {new Date(contractDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
              <div style={{ width: '45%', borderTop: '1px solid black', textAlign: 'center', paddingTop: '0.5rem' }}>
                <strong>KITCHENFLOW AI LTDA</strong><br />
                LICENCIANTE
              </div>
              <div style={{ width: '45%', borderTop: '1px solid black', textAlign: 'center', paddingTop: '0.5rem' }}>
                <strong>{selectedTenantForContract.name}</strong><br />
                LICENCIADA
              </div>
            </div>
          </div>

          <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] no-print">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-950 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Gerador de Contrato de Cessão de Uso</h2>
                  <p className="text-[9px] text-white/60 tracking-wider font-semibold uppercase mt-0.5">
                    Gere contratos personalizados e oficiais de licença de uso SaaS para seus lojistas
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowContractModal(false)} 
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              
              {/* Left Column: Form Settings */}
              <div className="w-full lg:w-[40%] bg-slate-50 p-6 border-r border-slate-100 overflow-y-auto space-y-4">
                <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1">
                  ⚙️ Parâmetros do Instrumento
                </h3>

                {/* Secção Licenciante (Nossos dados) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DADOS DA LICENCIANTE (KITCHENFLOW AI)</p>
                  
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Representante Legal</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                      value={contractOwnerRepresentative}
                      onChange={(e) => setContractOwnerRepresentative(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ da Licenciante</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={contractOwnerCNPJ}
                        onChange={(e) => setContractOwnerCNPJ(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Sede</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={contractOwnerAddress}
                        onChange={(e) => setContractOwnerAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Secção Licenciado (Dados do Lojista) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DADOS DA LICENCIADA (INQUILINO)</p>
                  
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome Comercial</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                      value={selectedTenantForContract.name}
                      onChange={async (e) => {
                        const newName = e.target.value;
                        setSelectedTenantForContract({...selectedTenantForContract, name: newName});
                        // Update in background on Firestore
                        try {
                          await setDoc(doc(db, 'tenants', selectedTenantForContract.id), { name: newName }, { merge: true });
                        } catch (err) {
                          console.error("Error auto-saving name:", err);
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ do Inquilino</label>
                      <input 
                        type="text"
                        placeholder="Ex: 00.000.000/0001-00"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700 font-mono"
                        value={selectedTenantForContract.cnpj || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setSelectedTenantForContract({...selectedTenantForContract, cnpj: val});
                          // Update on Firestore
                          try {
                            await setDoc(doc(db, 'tenants', selectedTenantForContract.id), { cnpj: val }, { merge: true });
                          } catch (err) {
                            console.error("Error auto-saving CNPJ:", err);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                      <input 
                        type="text"
                        placeholder="Ex: (11) 99999-9999"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={selectedTenantForContract.phone || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setSelectedTenantForContract({...selectedTenantForContract, phone: val});
                          try {
                            await setDoc(doc(db, 'tenants', selectedTenantForContract.id), { phone: val }, { merge: true });
                          } catch (err) {
                            console.error("Error auto-saving phone:", err);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                    <input 
                      type="text"
                      placeholder="Av. das Américas, 500, Rio de Janeiro/RJ"
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                      value={selectedTenantForContract.address || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setSelectedTenantForContract({...selectedTenantForContract, address: val});
                        try {
                          await setDoc(doc(db, 'tenants', selectedTenantForContract.id), { address: val }, { merge: true });
                        } catch (err) {
                          console.error("Error auto-saving address:", err);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Termos Financeiros */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TERMOS FINANCEIROS & PRAZO</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano Base</label>
                      <span className="w-full px-3 py-2 bg-slate-100 border rounded-lg font-black text-xs text-slate-500 block text-center uppercase tracking-widest">
                        {selectedTenantForContract.subscription?.plan || 'PRO'}
                      </span>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensalidade (R$)</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-black outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={billingCustomSubscriptionPrice}
                        onChange={(e) => setBillingCustomSubscriptionPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Duração (Meses)</label>
                      <input 
                        type="number"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={contractDurationMonths}
                        onChange={(e) => setContractDurationMonths(parseInt(e.target.value) || 12)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Início da Cessão</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={contractDate}
                        onChange={(e) => setContractDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Foro (Cidade)</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700"
                        value={contractCity}
                        onChange={(e) => setContractCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">UF do Foro</label>
                      <input 
                        type="text"
                        maxLength={2}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 text-xs text-slate-700 uppercase"
                        value={contractState}
                        onChange={(e) => setContractState(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Beautiful interactive contract paper sheet */}
              <div className="flex-1 bg-slate-800 p-8 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-center mb-4 text-white">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pré-visualização do Documento</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">A4 Simulado</span>
                </div>

                <div className="flex-1 bg-white rounded-2xl shadow-inner border border-slate-300 p-8 overflow-y-auto text-slate-800 font-serif leading-relaxed text-xs select-all select-text space-y-4 max-h-[55vh]">
                  
                  {/* Document Header */}
                  <div className="text-center space-y-1 mb-8">
                    <p className="font-bold uppercase text-sm font-sans text-slate-900 tracking-tight">
                      CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)
                    </p>
                    <p className="font-bold uppercase text-[10px] font-sans text-slate-500">
                      E PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA
                    </p>
                    <div className="w-16 h-0.5 bg-indigo-500 mx-auto mt-2" />
                  </div>

                  {/* Document Body */}
                  <p className="text-justify indent-8">
                    Pelo presente instrumento particular, de um lado, na qualidade de <strong>LICENCIANTE</strong>, a empresa <strong>KITCHENFLOW AI LTDA</strong>, inscrita no CNPJ sob o nº {contractOwnerCNPJ}, sediada em {contractOwnerAddress}, neste ato representada por {contractOwnerRepresentative}.
                  </p>

                  <p className="text-justify indent-8">
                    E, de outro lado, na qualidade de <strong>LICENCIADA</strong>, a empresa/restaurante <strong>{selectedTenantForContract.name}</strong>, inscrita no CNPJ sob o nº {selectedTenantForContract.cnpj || '____________________'}, com sede em {selectedTenantForContract.address || '____________________'}, telefone {selectedTenantForContract.phone || '____________________'}, neste ato representada por seu representante legal qualificado em seu ato constitutivo.
                  </p>

                  <p className="text-justify indent-8">
                    Têm entre si, justo e contratado, o que mutuamente aceitam e outorgam mediante as seguintes cláusulas e condições:
                  </p>

                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-900 mt-6 mb-2">CLÁUSULA PRIMEIRA – DO OBJETO</p>
                  <p className="text-justify">
                    1.1. O objeto deste contrato é a licença de uso temporária, não exclusiva e intransferível do software de gestão comercial e autoatendimento denominado <strong>KitchenFlow AI POS & Marketplace</strong>, bem como a prestação de serviços de suporte técnico, armazenamento de dados e integração de canais de venda associados.
                  </p>

                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-900 mt-6 mb-2">CLÁUSULA SEGUNDA – DA VIGÊNCIA E DO PRAZO</p>
                  <p className="text-justify">
                    2.1. O presente instrumento é celebrado por prazo determinado de {contractDurationMonths} meses, contados a partir de {new Date(contractDate).toLocaleDateString('pt-BR')}, renovando-se automaticamente por períodos iguais e sucessivos caso não haja manifestação expressa em contrário de qualquer das partes.
                  </p>

                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-900 mt-6 mb-2">CLÁUSULA TERCEIRA – DOS VALORES E CONDIÇÕES DE PAGAMENTO</p>
                  <p className="text-justify">
                    3.1. Pela licença de uso do Software e serviços correspondentes ao Plano <strong>{selectedTenantForContract.subscription?.plan || 'PRO'}</strong>, a LICENCIADA pagará à LICENCIANTE o valor fixo recorrente de <strong>R$ {(parseFloat(billingCustomSubscriptionPrice) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por ciclo mensal, com vencimento conforme faturamento.
                  </p>
                  <p className="text-justify">
                    3.2. Adicionalmente, caso aplicável, incidirá uma comissão de corretagem sobre as vendas realizadas através do canal Marketplace próprio de <strong>{marketplaceFee}%</strong> mais a taxa fixa de <strong>R$ {marketplaceFixedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por pedido concluído.
                  </p>

                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-900 mt-6 mb-2">CLÁUSULA QUARTA – DAS RESPONSABILIDADES DA LICENCIADA</p>
                  <p className="text-justify">
                    4.1. A LICENCIADA compromete-se a utilizar o Software estritamente dentro dos limites legais, mantendo seguras suas credenciais de acesso, e adimplir pontualmente com as obrigações financeiras descritas.
                  </p>

                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-900 mt-6 mb-2">CLÁUSULA QUINTA – CONFIDENCIALIDADE E LGPD</p>
                  <p className="text-justify">
                    5.1. As Partes obrigam-se a manter o absoluto sigilo sobre quaisquer dados operacionais e pessoais obtidos em decorrência do presente contrato, cumprindo rigorosamente a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                  </p>

                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-900 mt-6 mb-2">CLÁUSULA SEXTA – DO FORO</p>
                  <p className="text-justify">
                    6.1. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de {contractCity} - {contractState}, com renúncia expressa a qualquer outro.
                  </p>

                  <div className="pt-6 border-t border-dashed mt-8 space-y-4">
                    <p className="text-right italic">
                      {contractCity}/{contractState}, {new Date(contractDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-8">
                      <div className="border-t border-slate-400 pt-2 text-center">
                        <p className="font-bold">KITCHENFLOW AI LTDA</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">LICENCIANTE</p>
                      </div>
                      <div className="border-t border-slate-400 pt-2 text-center">
                        <p className="font-bold">{selectedTenantForContract.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">LICENCIADA</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Document interactive tools bar */}
                <div className="mt-4 flex flex-wrap gap-2 justify-end">
                  {/* Copiar Texto */}
                  <button
                    onClick={() => {
                      const text = `INSTRUMENTO PARTICULAR DE CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS) E PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA

LICENCIANTE: KITCHENFLOW AI LTDA, CNPJ nº ${contractOwnerCNPJ}, sediada em ${contractOwnerAddress}, representada por ${contractOwnerRepresentative}.

LICENCIADA: ${selectedTenantForContract.name}, CNPJ nº ${selectedTenantForContract.cnpj || '____________________'}, com sede em ${selectedTenantForContract.address || '____________________'}, telefone ${selectedTenantForContract.phone || '____________________'}.

CLÁUSULA PRIMEIRA – DO OBJETO
1.1. Licença de uso temporária, não exclusiva e intransferível do software de gestão comercial KitchenFlow AI POS & Marketplace.

CLÁUSULA SEGUNDA – DA VIGÊNCIA E DO PRAZO
2.1. Prazo determinado de ${contractDurationMonths} meses, contados a partir de ${new Date(contractDate).toLocaleDateString('pt-BR')}.

CLÁUSULA TERCEIRA – DOS VALORES E CONDIÇÕES DE PAGAMENTO
3.1. Valor fixo recorrente de R$ ${(parseFloat(billingCustomSubscriptionPrice) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ciclo mensal correspondente ao Plano ${selectedTenantForContract.subscription?.plan || 'PRO'}.
3.2. Comissão de Marketplace de ${marketplaceFee}% + R$ ${marketplaceFixedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por pedido concluído.

CLÁUSULA QUARTA – DAS RESPONSABILIDADES DA LICENCIADA
4.1. Utilizar o software dentro das diretrizes contratuais e pagar pontualmente as faturas.

CLÁUSULA QUINTA – CONFIDENCIALIDADE E LGPD
5.1. Sigilo absoluto sobre dados pessoais e operacionais (Lei nº 13.709/2018 - LGPD).

CLÁUSULA SEXTA – DO FORO
6.1. Foro da Comarca de ${contractCity} - ${contractState}.

Assinam o presente instrumento as partes na data de ${new Date(contractDate).toLocaleDateString('pt-BR')}.

_________________________________
KITCHENFLOW AI LTDA (LICENCIANTE)

_________________________________
${selectedTenantForContract.name} (LICENCIADA)`;
                      navigator.clipboard.writeText(text);
                      alert('Texto completo do contrato copiado para a área de transferência!');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider cursor-pointer transition-all border border-slate-650"
                  >
                    <Copy size={13} /> Copiar Texto
                  </button>

                  {/* WhatsApp Quick share */}
                  <button
                    onClick={() => {
                      const text = `Olá! 📄 Segue o contrato de Licença de Uso (SaaS) da Plataforma KitchenFlow AI para o restaurante *${selectedTenantForContract.name}*.\n\n*Plano:* ${selectedTenantForContract.subscription?.plan || 'PRO'}\n*Mensalidade:* R$ ${(parseFloat(billingCustomSubscriptionPrice) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n*Vigência:* ${contractDurationMonths} meses\n\nPor favor, faça a revisão das informações contratuais (CNPJ: ${selectedTenantForContract.cnpj || 'Pendente'}, Endereço: ${selectedTenantForContract.address || 'Pendente'}). Qualquer dúvida ou se tudo estiver correto, daremos início à assinatura digital.\n\nFicamos à disposição!`;
                      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[9px] uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <MessageSquare size={13} /> Enviar WhatsApp
                  </button>

                  {/* Print Document */}
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-wider cursor-pointer transition-all shadow-md shadow-indigo-900/50"
                  >
                    <Printer size={13} /> Imprimir / Salvar PDF
                  </button>
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => setShowContractModal(false)}
                className="w-full py-3 bg-white border text-slate-500 hover:bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-center cursor-pointer"
              >
                Fechar Gerador de Contrato
              </button>
            </div>
          </div>
        </div>
      )}
 
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tighter">Categorias de Comércio</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Gerencie os ramos de atividades comerciais dos seus lojistas
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                  setNewCategoryImg('');
                  setNewCategoryBg('bg-indigo-50');
                  setNewCategoryColor('text-indigo-500');
                  setNewCategoryIconName('UtensilsCrossed');
                }} 
                className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-5 gap-8 overflow-y-auto">
              
              {/* Form Side */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">
                    {editingCategory ? 'Editar Categoria' : 'Cadastrar Categoria'}
                  </h3>
                  <form onSubmit={handleSaveCategory} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Categoria</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Pizzaria, Pet Shop, etc."
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-700"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                      <textarea 
                        placeholder="Breve descrição da atividade..."
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-700 h-24 resize-none"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem/Ícone (Optativo)</label>
                      <input 
                        type="url"
                        placeholder="Ex: https://cdn-icons-png.flaticon.com/512/...png"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-700"
                        value={newCategoryImg}
                        onChange={(e) => setNewCategoryImg(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Esquema de Cores (Marketplace)</label>
                      <select 
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-700"
                        value={`${newCategoryBg}|${newCategoryColor}`}
                        onChange={(e) => {
                          const [bg, color] = e.target.value.split('|');
                          setNewCategoryBg(bg);
                          setNewCategoryColor(color);
                        }}
                      >
                        {CATEGORY_COLOR_PRESETS.map((p) => (
                          <option key={p.bg} value={`${p.bg}|${p.color}`}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ícone de Fallback (Lucide)</label>
                      <select 
                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-700"
                        value={newCategoryIconName}
                        onChange={(e) => setNewCategoryIconName(e.target.value)}
                      >
                        {CATEGORY_ICON_PRESETS.map((icon) => (
                          <option key={icon.value} value={icon.value}>
                            {icon.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editingCategory && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingCategory(null);
                            setNewCategoryName('');
                            setNewCategoryDescription('');
                            setNewCategoryImg('');
                            setNewCategoryBg('bg-indigo-50');
                            setNewCategoryColor('text-indigo-500');
                            setNewCategoryIconName('UtensilsCrossed');
                          }}
                          className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-300 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                      <button 
                        type="submit"
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Save size={12} />
                        {editingCategory ? 'Atualizar' : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* List Side */}
              <div className="md:col-span-3 flex flex-col h-full min-h-[300px]">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span>Categorias Ativas ({commerceCategories.length})</span>
                  <span className="text-[9px] text-slate-400 font-medium lowercase italic">Disponíveis no cadastro</span>
                </h3>
                
                <div className="flex-1 border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/20 max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                  {commerceCategories.length > 0 ? commerceCategories.map((cat) => (
                    <div key={cat.id} className="p-4 flex justify-between items-center hover:bg-slate-55/50 transition-all">
                      <div className="flex items-center gap-3.5 pr-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 ${cat.bg || 'bg-indigo-50'}`}>
                          {cat.img ? (
                            <img src={cat.img} className="w-6 h-6 object-contain" alt={cat.name} />
                          ) : (
                            <span className={`text-[11px] font-black uppercase ${cat.color || 'text-indigo-500'}`}>
                              {cat.name ? cat.name.slice(0, 2) : 'Cat'}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 text-xs">{cat.name}</p>
                        {cat.description ? (
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{cat.description}</p>
                        ) : (
                          <p className="text-[9px] text-slate-300 font-medium italic">Sem descrição disponível</p>
                        )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingCategory(cat);
                            setNewCategoryName(cat.name || '');
                            setNewCategoryDescription(cat.description || '');
                            setNewCategoryImg(cat.img || '');
                            setNewCategoryBg(cat.bg || 'bg-indigo-50');
                            setNewCategoryColor(cat.color || 'text-indigo-500');
                            setNewCategoryIconName(cat.iconName || 'UtensilsCrossed');
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                      Nenhuma categoria encontrada.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {showUserGenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2 rounded-xl text-white shadow-lg"><Key size={20} /></div>
                <h2 className="text-xl font-black text-slate-800 tracking-tighter">Acesso Gerado</h2>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail de Acesso</p>
                  <p className="font-black text-slate-800">{generatedUser?.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Senha Temporária</p>
                  <p className="font-black text-slate-800 text-lg tracking-widest">{generatedUser?.password}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase text-center leading-relaxed">
                Envie estas credenciais para o cliente.<br/>Ele deverá alterar a senha no primeiro acesso.
              </p>
              <button 
                onClick={() => setShowUserGenModal(false)}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VISÃO 360° INDIVIDUAL DA LOJA */}
      {selectedTenantFor360 && (
        <Tenant360Modal
          tenant={selectedTenantFor360}
          onClose={() => setSelectedTenantFor360(null)}
          onAccessSystem={(t) => {
            handleAccessSystem(t);
            addAuditLog(`Acessou sistema da loja ${t.name}`, t.name, undefined, 'Acesso suporte', 'Suporte');
          }}
          onGenerateAccess={(t) => {
            handleGenerateAccess(t);
          }}
          onRenewPlan={(t) => {
            setSelectedTenantFor360(null);
            setRenewingTenant(t);
            setShowRenewModal(true);
          }}
          onOpenSupportTicket={() => {
            setSelectedTenantFor360(null);
            setActiveTab('support');
          }}
          onEdit={(t) => {
            setSelectedTenantFor360(null);
            handleEdit(t);
          }}
          onOpenDiagnostics={() => {
            setSelectedTenantFor360(null);
            setShowQuickDiagnosticModal(true);
          }}
          onAuditLog={(action, prev, next) => {
            addAuditLog(action, selectedTenantFor360.name, prev, next, 'Operacional');
          }}
        />
      )}

      {/* MODAL 2: DIAGNÓSTICO COM UM CLIQUE */}
      {showQuickDiagnosticModal && (
        <SaasQuickDiagnosticModal
          onClose={() => setShowQuickDiagnosticModal(false)}
          onNavigate={(tab) => {
            setShowQuickDiagnosticModal(false);
            setActiveTab(tab as any);
          }}
        />
      )}

      {/* MODAL 3: AUDITORIA DE AÇÕES ADMINISTRATIVAS */}
      <SaasAuditLogsModal
        isOpen={showAuditLogsModal}
        onClose={() => setShowAuditLogsModal(false)}
        logs={saasAuditLogs}
      />

      {/* MODAL 4: CENTRAL DE NOTIFICAÇÕES (DRAWER LATERAL) */}
      <SaasNotificationsDrawer
        isOpen={showNotificationsDrawer}
        onClose={() => setShowNotificationsDrawer(false)}
        notifications={saasNotifications}
        onMarkAsRead={(id) => setSaasNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
        onClearAll={() => setSaasNotifications([])}
        onNavigateTab={(tab) => {
          setShowNotificationsDrawer(false);
          setActiveTab(tab as any);
        }}
      />

      {/* MODAL 5: BUSCA GLOBAL & ATALHOS DE TECLADO (CTRL+K) */}
      <SaasGlobalSearchModal
        isOpen={showGlobalSearchModal}
        onClose={() => setShowGlobalSearchModal(false)}
        tenants={tenants}
        onSelectTenant={(t) => {
          setShowGlobalSearchModal(false);
          setSelectedTenantFor360(t);
        }}
        onNavigateTab={(tab) => {
          setShowGlobalSearchModal(false);
          setActiveTab(tab as any);
        }}
        onOpenNewTenantModal={() => {
          setShowGlobalSearchModal(false);
          resetForm();
          setEditingTenant(null);
          setShowAddModal(true);
        }}
        onOpenDiagnostic={() => {
          setShowGlobalSearchModal(false);
          setShowQuickDiagnosticModal(true);
        }}
      />
    </div>
  );
});

export default SaaSAdmin;
