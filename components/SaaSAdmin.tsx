import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy, deleteDoc, addDoc, where, getDocs } from 'firebase/firestore';
import { compressImage } from '../lib/imageUtils';
import { Tenant, Plan, Permission, User, MarketplaceInvoice, MarketplaceSettings } from '../types';
import { maskPhone } from '../utils/masks';
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
  ArrowUpRight,
  RefreshCw,
  Clock,
  MessageSquare,
  Phone
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
];

const DEFAULT_COMMERCE_CATEGORIES = [
  { id: 'lanches', name: 'Lanches', description: 'Hambúrgueres, sanduíches e petiscos' },
  { id: 'pizza', name: 'Pizza', description: 'Pizzarias, calzones e massas' },
  { id: 'sobremesas', name: 'Sobremesas', description: 'Doces, bolos, sorvetes e açaí' },
  { id: 'bebidas', name: 'Bebidas', description: 'Sucos, refrigerantes, cervejas e coquetéis' },
  { id: 'mercado', name: 'Mercado', description: 'Supermercados, mercearias e hortifrúti' },
  { id: 'farmacia', name: 'Farmácia', description: 'Medicamentos, cosméticos e cuidados pessoais' }
];

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

interface SaaSAdminProps {
  activeTab: string;
  onViewTenant: (tenantId: string, name?: string, logo?: string) => void;
  onNavigate: (tab: string) => void;
}

const SaaSAdmin: React.FC<SaaSAdminProps> = memo(({ 
  activeTab: parentActiveTab, 
  onViewTenant,
  onNavigate
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'plans' | 'financial' | 'support' | 'leads' | 'team' | 'marketplace_config'>('dashboard');

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
  const [selectedSaasPermissions, setSelectedSaasPermissions] = useState<Permission[]>(SAAS_ADMIN_MODULES.map(m => m.id));
  const [promoTenantSearch, setPromoTenantSearch] = useState('');

  useEffect(() => {
    if (parentActiveTab === 'saas-tenants') setActiveTab('tenants');
    else if (parentActiveTab === 'saas-plans') setActiveTab('plans');
    else if (parentActiveTab === 'saas-finance') setActiveTab('financial');
    else if (parentActiveTab === 'saas-admin') setActiveTab('dashboard');
  }, [parentActiveTab]);

  useEffect(() => {
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.error("SaaSAdmin leads error:", error);
    });

    const qTickets = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribeTickets = onSnapshot(qTickets, (snapshot) => {
      setSupportTickets(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.error("SaaSAdmin tickets error:", error);
    });

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setSaasUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User).filter(u => u.role === 'SAAS_ADMIN'));
    }, (error) => {
      console.error("SaaSAdmin users error:", error);
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
    const qPayments = query(collection(db, 'saasPayments'), orderBy('createdAt', 'desc'));
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
      console.error("SaaSAdmin saasPayments error:", error);
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
          } catch (e) {
            console.error("Error seeding commerce categories:", e);
          }
        };
        seedCategories();
      }
    }, (error) => {
      console.error("SaaSAdmin commerceCategories error:", error);
    });

    return () => unsubscribeCategories();
  }, []);

  useEffect(() => {
    const qInvoices = query(collection(db, 'marketplaceInvoices'), orderBy('createdAt', 'desc'));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setMarketplaceInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as MarketplaceInvoice));
    }, (error) => {
      console.error("SaaSAdmin marketplaceInvoices error:", error);
    });

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.error("SaaSAdmin orders error:", error);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeOrders();
    };
  }, []);

  useEffect(() => {
    const qLedger = query(collection(db, 'saasLedger'), orderBy('createdAt', 'desc'));
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
        const seedLedger = async () => {
          try {
            const initialLedger = [
              {
                description: 'Servidores Google Cloud (Cloud Run & Firestore)',
                type: 'pagar',
                amount: 320.00,
                dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().slice(0, 10),
                category: 'Infraestrutura',
                status: 'pending',
                createdAt: new Date()
              },
              {
                description: 'API de Geolocalização / Google Maps Premium Billing',
                type: 'pagar',
                amount: 112.50,
                dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().slice(0, 10),
                category: 'API / Servidores',
                status: 'pending',
                createdAt: new Date()
              },
              {
                description: 'Licença mensal de API WhatsApp Gateway Business',
                type: 'pagar',
                amount: 90.00,
                dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString().slice(0, 10),
                category: 'Softwares / Integrações',
                status: 'paid',
                createdAt: new Date()
              },
              {
                description: 'Tokens Gemini Pro AI (Smart Classification & Assistant)',
                type: 'pagar',
                amount: 55.45,
                dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString().slice(0, 10),
                category: 'Inteligência AI',
                status: 'pending',
                createdAt: new Date()
              },
              {
                description: 'Anuidade do Domínio KitchenFlowAI.com.br (Registro.br)',
                type: 'pagar',
                amount: 40.00,
                dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 2).toISOString().slice(0, 10),
                category: 'Domínios / Registro',
                status: 'paid',
                createdAt: new Date()
              }
            ];
            for (const item of initialLedger) {
              await addDoc(collection(db, 'saasLedger'), item);
            }
          } catch (e) {
            console.error("Error seeding saasLedger:", e);
          }
        };
        seedLedger();
      }
    }, (error) => {
      console.error("SaaSAdmin saasLedger error:", error);
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
    try {
      const newStatus = item.status === 'paid' ? 'pending' : 'paid';
      await updateDoc(doc(db, 'saasLedger', item.id), {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating ledger status:", err);
    }
  };

  const handleDeleteLedgerItem = async (itemId: string) => {
    if (!window.confirm("Deseja realmente excluir este lançamento financeiro?")) return;
    try {
      await deleteDoc(doc(db, 'saasLedger', itemId));
    } catch (err) {
      console.error("Error deleting ledger item:", err);
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

  const handleCloseCycleAndBill = async (tenant: Tenant, unbilledOrdersList: any[], totalFees: number, includeSubscription: boolean, monthlyBasePrice: number) => {
    const totalAmount = totalFees + (includeSubscription ? monthlyBasePrice : 0);
    const invoiceId = `inv_${Date.now()}`;
    
    try {
      await addDoc(collection(db, 'saasLedger'), {
        description: `Cobrança Período - ${tenant.name} (${unbilledOrdersList.length} Ped. Mkt + Plano)`,
        type: 'receber',
        amount: totalAmount,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        category: 'Planos e Marketplace',
        status: 'pending',
        tenantId: tenant.id,
        createdAt: new Date()
      });

      for (const order of unbilledOrdersList) {
        const invId = `mkt_inv_${order.id}`;
        await setDoc(doc(db, 'marketplaceInvoices', invId), {
          id: invId,
          tenantId: tenant.id,
          orderId: order.id,
          amount: marketplaceFixedFee + ((order.total || 0) * marketplaceFee / 100),
          status: 'pending',
          createdAt: new Date()
        });
      }

      setSelectedBilling({
        id: invoiceId,
        tenantName: tenant.name,
        amount: totalAmount,
        pixCode: `00020101021126580014br.gov.bcb.pix0136${Math.random().toString(36).slice(-10)}@kitchenflowai.com5204000053039865405${totalAmount.toFixed(2)}5802BR5914KitchenFlow AI6009SaoPaulo62070503***6304${Math.random().toString(16).slice(-4)}`
      });
      
      setShowBillingModal(true);
    } catch (err) {
      console.error("Error creating cycle billing:", err);
    }
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [generatedUser, setGeneratedUser] = useState<{ email: string; password: string } | null>(null);
  const [showUserGenModal, setShowUserGenModal] = useState(false);
  const [showTenantUserModal, setShowTenantUserModal] = useState(false);
  const [selectedTenantForUser, setSelectedTenantForUser] = useState<Tenant | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [marketplaceFee, setMarketplaceFee] = useState(2.5); // 2.5% padrão
  const [marketplaceBanner, setMarketplaceBanner] = useState('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop');
  const [marketplacePromotions, setMarketplacePromotions] = useState<{ id: string; title: string; active: boolean; participatingTenantIds: string[]; bannerUrl?: string }[]>([]);
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

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'marketplace'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.serviceFee !== undefined) setMarketplaceFee(data.serviceFee);
        if (data.fixedFee !== undefined) setMarketplaceFixedFee(data.fixedFee);
        if (data.bannerUrl) setMarketplaceBanner(data.bannerUrl);
        if (data.promotions) setMarketplacePromotions(data.promotions);
        if (data.maintenance) {
          setMaintenanceConfig({
            active: data.maintenance.active || false,
            startAt: data.maintenance.startAt ? new Date(data.maintenance.startAt.toDate()).toISOString().slice(0, 16) : '',
            endAt: data.maintenance.endAt ? new Date(data.maintenance.endAt.toDate()).toISOString().slice(0, 16) : '',
            message: data.maintenance.message || ''
          });
        }
      }
    });
    return () => unsub();
  }, []);

  const handleSaveMarketplaceConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'marketplace'), {
        id: 'marketplace',
        serviceFee: marketplaceFee,
        fixedFee: marketplaceFixedFee,
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
    } catch (error) {
      console.error("Error saving marketplace config:", error);
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

  const handleCreateTenantUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForUser) return;
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const password = Math.random().toString(36).slice(-8);

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
  const handleCreateSaaSUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const name = formData.get('name') as string;
    const password = Math.random().toString(36).slice(-8);

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
        role: 'SAAS_ADMIN',
        permissions: selectedSaasPermissions,
        password,
        createdAt: new Date(),
        active: true
      });
      
      setGeneratedUser({ email, password });
      setShowSaaSUserModal(false);
      setShowUserGenModal(true);
      setSelectedSaasPermissions(SAAS_ADMIN_MODULES.map(m => m.id));
    } catch (error) {
      console.error("Error creating SaaS user:", error);
    }
  };

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status });
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
        await updateDoc(doc(db, 'leads', editingLead.id), leadData);
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
      await updateDoc(ticketRef, { 
        replies: updatedReplies,
        status: 'responded'
      });
      
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
  const [planModules, setPlanModules] = useState<Permission[]>(['dashboard_view']);

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
    const q = query(collection(db, 'tenants'));
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
      
      // Sort client-side by createdAt desc to allow tenants with missing createdAt to also show up
      data.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      });

      setTenants(data);
      setLoading(false);
    }, (error) => {
      console.error("SaaSAdmin onSnapshot error (tenants):", error);
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
      console.error("SaaSAdmin plans onSnapshot error:", error);
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
      maxOrders: 1000,
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
    
    // Calcula o próximo ID de lojista de forma sequencial (iniciando em 1)
    let tenantId = editingTenant?.id;
    if (!tenantId) {
      let nextNumId = 1;
      if (tenants.length > 0) {
        const numericIds = tenants.map(t => {
          if (/^\d+$/.test(t.id)) {
            const num = parseInt(t.id, 10);
            return num < 10000000 ? num : 0;
          }
          return 0;
        });
        const maxId = Math.max(...numericIds, 0);
        nextNumId = maxId + 1;
      }
      tenantId = String(nextNumId);
    }
    
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    
    if (!selectedPlan) {
      alert('Selecione um plano válido.');
      return;
    }

    const tenantData: Partial<Tenant> = {
      id: tenantId,
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

        const password = Math.random().toString(36).slice(-8);
        
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
    const password = Math.random().toString(36).slice(-8);

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
    } else if (renewPeriod === 'quarterly') {
      billingMonths = 3;
      computedExpiryDate.setMonth(computedExpiryDate.getMonth() + 3);
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
      const discounts = { monthly: 0, quarterly: 0.05, semiannual: 0.10, yearly: 0.20 };
      const discount = discounts[renewPeriod as keyof typeof discounts] || 0;
      finalPrice = basePrice * billingMonths * (1 - discount);
    }

    try {
      const tenantRef = doc(db, 'tenants', renewingTenant.id);
      await updateDoc(tenantRef, {
        active: true,
        'subscription.expiryDate': computedExpiryDate,
        'subscription.status': 'active'
      });

      if (registerPayment) {
        const paymentId = `pay_${Date.now()}`;
        const paymentData = {
          id: paymentId,
          tenantId: renewingTenant.id,
          tenantName: renewingTenant.name,
          planName: renewingTenant.subscription.plan,
          period: renewPeriod,
          priceBeforeDiscount: renewPeriod === 'custom' ? finalPrice : (finalPrice / (1 - (renewPeriod === 'monthly' ? 0 : renewPeriod === 'quarterly' ? 0.05 : renewPeriod === 'semiannual' ? 0.10 : 0.20))),
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
      alert("Erro ao processar renovação.");
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

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.ownerId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const days = getDaysRemaining(t.subscription?.expiryDate);
    
    if (tenantFilter === 'active') {
      return t.active && days >= 0;
    }
    if (tenantFilter === 'expiring') {
      return t.active && days >= 0 && days <= 7;
    }
    if (tenantFilter === 'expired') {
      return !t.active || days < 0;
    }
    return true;
  });

  const monthlyTenants = tenants.filter(t => {
    const pObj = plans.find(p => p.id === t.planId) || plans.find(p => p.name === t.subscription?.plan);
    const billingCycle = pObj ? pObj.billingCycle : (((t.subscription as any)?.billingCycle) || 'monthly');
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
      await updateDoc(tenantRef, {
        active: true,
        'subscription.expiryDate': computedExpiryDate,
        'subscription.status': 'active'
      });

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

      alert(`Sucesso! Recebimento confirmado de R$ ${price.toFixed(2)} do lojista ${tenant.name}. Plano renovado até ${computedExpiryDate.toLocaleDateString('pt-BR')}.`);
    } catch (err) {
      console.error("Error in handleQuickSettleTenant:", err);
      alert("Erro ao dar baixa no recebimento.");
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Platform Manager</h2>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
            {activeTab === 'tenants' ? 'Gestão de Clientes' : 
             activeTab === 'plans' ? 'Planos e Preços' :
             activeTab === 'financial' ? 'Financeiro da Plataforma' :
             'Dashboard da Plataforma'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border shadow-inner">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'tenants', label: 'Clientes' },
              { id: 'plans', label: 'Planos' },
              { id: 'financial', label: 'Financeiro' },
              { id: 'leads', label: 'Leads' },
              { id: 'support', label: 'Suporte' },
              { id: 'team', label: 'Equipe SaaS' },
              { id: 'marketplace_config', label: 'Marketplace Nova' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:bg-white/50'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="saasHeaderTabPill"
                    className="absolute inset-0 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
          {activeTab === 'tenants' && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                  setShowCategoryModal(true);
                }}
                className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200 hover:bg-slate-900 transition-all border border-slate-700"
              >
                <Settings size={18} />
                Reg. Categorias de Comércio
              </button>
              <button 
                onClick={() => { resetForm(); setEditingTenant(null); setShowAddModal(true); }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} />
                Novo Cliente
              </button>
            </div>
          )}
          {activeTab === 'plans' && (
            <button 
              onClick={() => {
                setActiveTab('plans');
                resetPlanForm();
                setEditingPlan(null);
                setShowPlanModal(true);
              }}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
            >
              <Plus size={18} />
              Criar Novo Plano
            </button>
          )}
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-in fade-in duration-700">
          {/* MATH & STATS COMPUTATION FOR DASHBOARD */}
          {(() => {
            const now = new Date();
            const currentMonthNum = now.getMonth();
            const currentYearNum = now.getFullYear();
            const monthNames = [
              'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
              'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];

            const getSafeDateComp = (field: any) => {
              if (!field) return null;
              if (field.toDate && typeof field.toDate === 'function') {
                return field.toDate();
              }
              if (field instanceof Date) {
                return field;
              }
              const d = new Date(field);
              return isNaN(d.getTime()) ? null : d;
            };

            // 1. Novos Clientes no Mês
            const newTenantsThisMonth = tenants.filter(t => {
              const cd = getSafeDateComp(t.createdAt);
              return cd && cd.getMonth() === currentMonthNum && cd.getFullYear() === currentYearNum;
            }).length;

            // 2. Lojistas Ativos (Active Tenants)
            const activeTenantsCount = tenants.filter(t => t.active).length;

            // 3. Quantidade de pedidos realizados no Marketplace
            const marketplaceOrders = orders.filter(o => o.source === 'marketplace' || o.source === 'Marketplace');
            const totalMarketplaceOrders = marketplaceOrders.length;

            // 4. Valor gerado por pedidos no marketplace direcionado a mim (taxa fixa e comissão)
            const revenueMarketplaceFixed = totalMarketplaceOrders * marketplaceFixedFee;

            // -- NEW FINANCIAL METRICS FOR DASHBOARD CARDS --
            // A Receber mensal de empresas que fecharam planos mensais
            const monthlyTenants = tenants.filter(t => {
              const pObj = plans.find(p => p.id === t.planId) || plans.find(p => p.name === t.subscription?.plan);
              const billingCycle = pObj ? pObj.billingCycle : ((t.subscription as any)?.billingCycle || 'monthly');
              return t.active && billingCycle === 'monthly';
            });
            const valorReceberMensalPlanos = monthlyTenants.reduce((acc, t) => {
              const prices = { FREE: 0, BASIC: 99, PRO: 199, ENTERPRISE: 499 };
              const pObj = plans.find(p => p.id === t.planId) || plans.find(p => p.name === t.subscription?.plan);
              const price = pObj ? pObj.price : (prices[t.subscription?.plan as keyof typeof prices] || 0);
              return acc + price;
            }, 0);

            // Valor recebido por plano anual
            const valorRecebidoAnual = saasPayments
              .filter(p => p.period === 'yearly' || p.planBillingCycle === 'yearly' || p.period === 'Anual' || p.period === 'Anuário')
              .reduce((acc, p) => acc + (p.amountPaid || p.price || 0), 0);

            // Valor gerado por pedidos no marketplace (GMV total e somatório das comissões estimadas)
            const totalMarketplaceGMV = marketplaceOrders.reduce((acc, o) => acc + (o.total || 0), 0);
            const comissaoGeradaMarketplace = marketplaceOrders.reduce((acc, o) => {
              const orderTotal = o.total || 0;
              const fixedFee = marketplaceFixedFee;
              const varFee = (orderTotal * marketplaceFee) / 100;
              return acc + fixedFee + varFee;
            }, 0);

            // Counts for: Novos Leads, Novos Clientes, Chamados em Aberto
            const novosLeadsCount = leads.filter(l => l.status === 'Novo' || l.status === 'novo').length;
            const novosClientesCount = newTenantsThisMonth;
            const chamadosAbertoCount = supportTickets.filter(t => t.status === 'Aberto' || t.status === 'open' || t.status === 'pendente' || t.status === 'pending').length;

            const faturamentoSaaSRealTotal = saasPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0) + 
              marketplaceInvoices.filter(inv => inv.status === 'paid').reduce((acc, inv) => acc + inv.amount, 0);

            const totalReceivedThisMonth = valorReceberMensalPlanos + comissaoGeradaMarketplace;

            // 6. Group leads received for Recharts AreaChart (last 6 months)
            const getLeadsChartData = () => {
              const monthsAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              const dataMap = new Map<string, number>();
              
              // Initialize last 6 months
              for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                dataMap.set(monthsAbbr[d.getMonth()], 0);
              }

              leads.forEach(lead => {
                const cd = getSafeDateComp(lead.createdAt);
                if (cd) {
                  const leadMonthName = monthsAbbr[cd.getMonth()];
                  if (dataMap.has(leadMonthName)) {
                    dataMap.set(leadMonthName, dataMap.get(leadMonthName)! + 1);
                  }
                }
              });

              return Array.from(dataMap.entries()).map(([name, value]) => ({
                name,
                Leads: value,
              }));
            };

            const leadsChartData = getLeadsChartData();

            return (
              <>
                {/* DYNAMIC PREMIUM COMMAND PANEL BAR */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black uppercase tracking-wider text-indigo-200">
                        <Sparkles size={12} className="text-amber-400" />
                        Visão Executiva do SaaS
                      </div>
                      <h2 className="text-3xl font-black tracking-tight mb-1">Painel Geral de Operações</h2>
                      <p className="text-white/60 font-medium text-xs max-w-xl font-sans leading-relaxed">
                        Monitore de forma centralizada os principais indicadores da rede: novos leads recebidos, taxas transacionais faturadas do Marketplace, adimplência de mensalidades e ativação de lojistas por plano contratual.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl min-w-[170px] flex-1 lg:flex-none">
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Coins size={10} className="text-amber-400" /> Recência Gerada (Marketplace)
                        </p>
                        <p className="text-2xl font-black">R$ {revenueMarketplaceFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <span className="text-[8px] font-semibold text-emerald-400 uppercase tracking-wider block mt-1">Taxas fixas acumuladas</span>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl min-w-[170px] flex-1 lg:flex-none">
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Users size={10} className="text-indigo-300" /> Conversão Geral
                        </p>
                        <p className="text-2xl font-black">
                          {leads.length > 0 ? ((leads.filter(l => l.status === 'Convertido' || l.status === 'Ganho' || l.status === 'Ativo').length / leads.length) * 100).toFixed(0) : 0}%
                        </p>
                        <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider block mt-1">{leads.length} leads no pipeline</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FIVE CORE REVOLUTIONARY KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* KPI 1: A Receber mensal de planos mensais */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Calendar size={22} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">Receber Mensal (Planos)</p>
                      <h3 className="font-black text-slate-805 tracking-tight text-xl mb-1 mt-1 font-sans">
                        R$ {valorReceberMensalPlanos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-3">
                      Empresas Mensais ({monthlyTenants.length})
                    </p>
                  </div>

                  {/* KPI 2: Já recebido por plano anual */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle2 size={22} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">Recebido (Planos Anuais)</p>
                      <h3 className="font-black text-emerald-600 tracking-tight text-xl mb-1 mt-1 font-sans">
                        R$ {valorRecebidoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-3">
                      Lançamentos anuais consolidados
                    </p>
                  </div>

                  {/* KPI 3: Valor gerado por pedidos no marketplace */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Package size={22} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">Vendas no Marketplace</p>
                      <h3 className="font-black text-slate-805 tracking-tight text-xl mb-1 mt-1 font-sans">
                        R$ {totalMarketplaceGMV.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </h3>
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-3">
                      Comissão: <span className="text-rose-600 font-bold">R$ {comissaoGeradaMarketplace.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>

                  {/* KPI 4: COMBINED LEADS, CLIENTS & OPEN TICKETS CARD */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monitor Geral</p>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-lg uppercase">CRM</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Leads Novos</span>
                          <span className="text-xs font-black text-slate-800">{novosLeadsCount}</span>
                        </div>
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Novos Clientes</span>
                          <span className="text-xs font-black text-emerald-600">+{novosClientesCount}</span>
                        </div>
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Suporte Aberto</span>
                          <span className={`text-xs font-black ${chamadosAbertoCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
                            {chamadosAbertoCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-slate-100 flex gap-0.5 justify-between text-[7px] font-black uppercase tracking-wider text-slate-400">
                      <button onClick={() => setActiveTab('leads')} className="hover:text-indigo-600 transition-all">Leads</button>
                      <span>•</span>
                      <button onClick={() => setActiveTab('tenants')} className="hover:text-indigo-600 transition-all">Inquil.</button>
                      <span>•</span>
                      <button onClick={() => setActiveTab('support')} className="hover:text-indigo-600 transition-all">Suporte</button>
                    </div>
                  </div>

                  {/* KPI 5: Caixa de Ativos / Total SaaS */}
                  <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-inner text-white">
                        <DollarSign size={22} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">Receita Real Compensada</p>
                      <h3 className="font-black text-amber-550 tracking-tight text-xl mb-1 mt-1 font-sans">
                        R$ {faturamentoSaaSRealTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </h3>
                    </div>
                    <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wider mt-3">
                      Lojas Ativas: <span className="text-emerald-400 font-bold">{activeTenantsCount}</span>
                    </p>
                  </div>
                </div>

                {/* MARKER POINT FOR EDIT 2 */}
                {/* GRÁFICO DE LEADS OU CATEGORIAS DO SAAS */}
                <div id="saas-dashboard-charts-leads" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        {dashboardCardTab === 'leads' ? (
                          <>
                            <h3 className="font-black text-slate-800 tracking-tight text-lg">Histórico de Leads Recebidos</h3>
                            <p className="text-xs text-slate-400 font-medium font-sans">Evolução do funil de novos contatos e potenciais clientes</p>
                          </>
                        ) : (
                          <>
                            <h3 className="font-black text-slate-800 tracking-tight text-lg">Categorias de Lojistas SaaS</h3>
                            <p className="text-xs text-slate-400 font-medium font-sans">Ramos de atividades comerciais cadastrados na plataforma e vinculados no SaaS</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border shrink-0">
                        <button
                          onClick={() => setDashboardCardTab('leads')}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            dashboardCardTab === 'leads' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          Leads
                        </button>
                        <button
                          onClick={() => setDashboardCardTab('categories')}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            dashboardCardTab === 'categories' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-slate-855'
                          }`}
                        >
                          Categorias
                        </button>
                      </div>
                    </div>

                    {dashboardCardTab === 'leads' ? (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={leadsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                background: '#0f172a', 
                                border: 'none', 
                                borderRadius: '16px', 
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: '700'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="Leads" 
                              stroke="#4f46e5" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorLeads)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col h-72">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                            Total: {commerceCategories.length} Ramos Cadastrados
                          </span>
                          <button
                            onClick={() => {
                              setEditingCategory(null);
                              setNewCategoryName('');
                              setNewCategoryDescription('');
                              setNewCategoryImg('');
                              setNewCategoryBg('bg-indigo-50');
                              setNewCategoryColor('text-indigo-500');
                              setNewCategoryIconName('UtensilsCrossed');
                              setShowCategoryModal(true);
                            }}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} strokeWidth={3} /> Adicionar Categoria
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px]">
                          {commerceCategories.map((cat) => (
                            <div key={cat.id} className="p-3 bg-slate-50 hover:bg-indigo-50/20 border border-slate-100 rounded-2xl flex items-center justify-between transition-all group">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 ${cat.bg || 'bg-indigo-50'}`}>
                                  {cat.img ? (
                                    <img src={cat.img} className="w-5 h-5 object-contain" alt={cat.name} referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className={`text-[10px] font-black uppercase ${cat.color || 'text-indigo-500'}`}>
                                      {cat.name ? cat.name.slice(0, 2) : 'Cat'}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-slate-700 truncate">{cat.name}</p>
                                  <p className="text-[8px] text-slate-405 font-medium truncate leading-normal">
                                    {cat.description || 'Ativo e disponível para lojistas'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setNewCategoryName(cat.name || '');
                                    setNewCategoryDescription(cat.description || '');
                                    setNewCategoryImg(cat.img || '');
                                    setNewCategoryBg(cat.bg || 'bg-indigo-50');
                                    setNewCategoryColor(cat.color || 'text-indigo-500');
                                    setNewCategoryIconName(cat.iconName || 'UtensilsCrossed');
                                    setShowCategoryModal(true);
                                  }}
                                  className="p-1.5 text-indigo-650 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100 cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="p-1.5 text-rose-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100 cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COORTES E METAS COMERCIAIS */}
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10">
                      <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-300">Resumo Comercial</span>
                      <h3 className="font-black tracking-tight text-xl text-white mt-4">Eficiência Comercial</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">Status dos leads e taxa de conversão da equipe comercial.</p>
                      
                      <div className="mt-6 space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Conversões</span>
                          <span className="text-sm font-black text-emerald-400">
                            {leads.filter(l => l.status === 'Convertido' || l.status === 'Ganho' || l.status === 'Ativo').length} convertidos
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Negociando</span>
                          <span className="text-sm font-black text-indigo-300">
                            {leads.filter(l => l.status === 'negotiating' || l.status === 'reunião' || l.status === 'Em negociação').length} em progresso
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Leads Novos</span>
                          <span className="text-sm font-black text-amber-400">
                            {leads.filter(l => l.status === 'new' || l.status === 'Novo').length} aguardando
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-6 relative z-10">
                      <button onClick={() => setActiveTab('leads' as any)} className="w-full py-3 bg-white hover:bg-slate-100 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2">
                        Acessar CRM de Leads <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ATIVIDADES GERAIS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm border-slate-100 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Rocket size={24} />
                </div>
                <h3 className="font-black text-slate-800 tracking-tight text-lg mb-1">Dashboard Marketplace</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">Veja como os clientes finais estão interagindo com as lojas e gerencie as taxas globais.</p>
                <button onClick={() => setActiveTab('financial' as any)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">Ver Financeiro <ChevronRight size={14}/></button>
             </div>
             <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm border-slate-100 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Users size={24} />
                </div>
                <h3 className="font-black text-slate-800 tracking-tight text-lg mb-1">Apoio ao Lojista</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">Crie novos clientes, ajuste planos e forneça acesso privilegiado aos módulos contratados.</p>
                <button onClick={() => setActiveTab('tenants')} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">Gerenciar Lojas <ChevronRight size={14}/></button>
             </div>
             <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm border-slate-100 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <LifeBuoy size={24} />
                </div>
                <h3 className="font-black text-slate-800 tracking-tight text-lg mb-1">Central de Suporte</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">Responda a tickets de lojistas e gerencie leads de potenciais novos clientes da plataforma.</p>
                <button onClick={() => setActiveTab('support')} className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">Ver Chamados <ChevronRight size={14}/></button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[140px]">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">MRR Combinado</p>
                      <p className="text-3xl font-black tracking-tighter">R$ {(tenants.reduce((acc, t) => {
                        const prices = { FREE: 0, BASIC: 99, PRO: 199, ENTERPRISE: 499 };
                        return acc + (t.active ? prices[t.subscription.plan as keyof typeof prices] || 0 : 0);
                      }, 0) + marketplaceInvoices.reduce((acc, inv) => acc + inv.amount, 0)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[140px]">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Churn Mensal</p>
                      <p className="text-3xl font-black tracking-tighter">1.2%</p>
                   </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* GROWTH ENGINE - DIDACTIC COMPONENT */}
            <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100 p-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />
               
               <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Motor de Crescimento (Simulador)</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">Como transformar lojistas em receita sustentável</p>
                  </div>
                  <Sparkles className="text-amber-500 animate-pulse" size={24} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                     <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Users size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aquisição</p>
                        <p className="text-xs font-bold text-slate-800 leading-tight">Leads qualificados gerados no marketplace.</p>
                     </div>
                     <div className="pt-2 border-t flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500" style={{ width: '65%' }} />
                        </div>
                        <span className="text-[9px] font-black text-indigo-600">65%</span>
                     </div>
                  </div>

                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-4">
                     <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                        <Zap size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Ativação</p>
                        <p className="text-xs font-bold text-slate-800 leading-tight">Lojistas que configuraram o cardápio digital.</p>
                     </div>
                     <div className="pt-2 border-t flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-emerald-200 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500" style={{ width: '82%' }} />
                        </div>
                        <span className="text-[9px] font-black text-emerald-600">82%</span>
                     </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-4">
                     <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-100">
                        <Star size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Retenção</p>
                        <p className="text-xs font-bold text-slate-800 leading-tight">Fidelidade baseada em performance e suporte.</p>
                     </div>
                     <div className="pt-2 border-t flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-amber-200 rounded-full overflow-hidden">
                           <div className="h-full bg-amber-500" style={{ width: '91%' }} />
                        </div>
                        <span className="text-[9px] font-black text-amber-600">91%</span>
                     </div>
                  </div>
               </div>

               <div className="mt-10 p-6 bg-indigo-900 rounded-[2rem] text-white">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl">
                           <LifeBuoy size={24} className="text-indigo-300" />
                        </div>
                        <div>
                           <p className="text-base font-black tracking-tight">Dica Didática de Sucesso</p>
                           <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Aumente sua MRR oferecendo sessões de consultoria AI para seus lojistas PRO.</p>
                        </div>
                     </div>
                     <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all">Ver Academy</button>
                  </div>
               </div>
            </div>

            {/* QUICK ACTIONS & FEEDBACK */}
            <div className="space-y-6">
               <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Ações Estratégicas</h3>
                  <div className="space-y-3">
                     <button 
                       onClick={() => setActiveTab('plans')}
                       className="w-full p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl flex items-center justify-between transition-all group"
                     >
                        <div className="flex items-center gap-3">
                           <CreditCard size={18} className="text-slate-400 group-hover:text-indigo-600" />
                           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-indigo-800">Ajustar Preços</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                     </button>
                     <button 
                       onClick={() => setActiveTab('support')}
                       className="w-full p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl flex items-center justify-between transition-all group"
                     >
                        <div className="flex items-center gap-3">
                           <AlertCircle size={18} className="text-slate-400 group-hover:text-rose-600" />
                           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-rose-800">Tickets Críticos</span>
                        </div>
                        <div className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">3</div>
                     </button>
                     <button 
                       onClick={() => setActiveTab('financial')}
                       className="w-full p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl flex items-center justify-between transition-all group"
                     >
                        <div className="flex items-center gap-3">
                           <Download size={18} className="text-slate-400 group-hover:text-emerald-600" />
                           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-800">Relatório Financeiro</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                     </button>
                  </div>
               </div>

               <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between h-[280px]">
                  <div>
                     <h4 className="text-xl font-black tracking-tighter">Alcance Master</h4>
                     <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Seu SaaS em números globais</p>
                  </div>
                  <div className="py-6 border-y border-white/10 my-4">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status de Deploy</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Região: US-East-1</span>
                     </div>
                     <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: '100%' }} />
                     </div>
                  </div>
                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-2xl font-black tracking-tighter">99.99%</p>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">SLA Disponibilidade</p>
                     </div>
                     <Shield size={32} className="opacity-20" />
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LATEST TENANTS WITH MORE CONTEXT */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Monitor de Ativação</h3>
                  <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Ver Todos</button>
               </div>
               <div className="space-y-6">
                  {tenants.slice(0, 4).map(tenant => (
                    <div key={tenant.id} className="flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-slate-100 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all overflow-hidden relative shadow-sm">
                             {tenant.logoUrl ? (
                               <img src={tenant.logoUrl} className="w-full h-full object-cover" />
                             ) : (
                               <Building2 className="text-slate-300" size={24} />
                             )}
                          </div>
                          <div>
                             <p className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{tenant.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                   tenant.subscription.plan === 'PRO' ? 'bg-amber-100 text-amber-600' : 
                                   tenant.subscription.plan === 'ENTERPRISE' ? 'bg-indigo-100 text-indigo-600' : 
                                   'bg-slate-100 text-slate-500'
                                }`}>
                                   Plano {tenant.subscription.plan}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Há 2 dias</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-800">85%</p>
                             <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                             </div>
                          </div>
                          <button 
                            onClick={() => handleAccessSystem(tenant)}
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                             <ExternalLink size={16} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* PERFORMANCE ANALYSIS */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Saúde Financeira da Rede</h3>
               <div className="space-y-8">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center border border-emerald-100">
                        <DollarSign size={28} />
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inadimplência</span>
                           <span className="text-xs font-black text-emerald-600 tracking-tight">Baixa (2.1%)</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                           <div className="h-full bg-emerald-500 rounded-full" style={{ width: '97.9%' }} />
                        </div>
                     </div>

                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center border border-indigo-100">
                           <TrendingUp size={28} />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Upgrade</span>
                              <span className="text-xs font-black text-indigo-600 tracking-tight">Saudável (15.4%)</span>
                           </div>
                           <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '15.4%' }} />
                           </div>
                        </div>
                     </div>
                     <div className="hidden space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                           <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Categorias do Marketplace</h4>
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
                               setShowCategoryModal(true);
                             }}
                             className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline cursor-pointer"
                           >
                             Gerenciar Categorias
                           </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                           {commerceCategories.map((cat) => (
                              <div key={cat.id} className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-2.5 shadow-sm">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-100/50 ${cat.bg || 'bg-indigo-50'}`}>
                                    {cat.img ? (
                                       <img src={cat.img} className="w-5 h-5 object-contain" alt={cat.name} />
                                    ) : (
                                       <span className={`text-[10px] font-black uppercase ${cat.color || 'text-indigo-500'}`}>
                                          {cat.name ? cat.name.slice(0, 2) : ''}
                                       </span>
                                    )}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 truncate">{cat.name}</p>
                                    <p className="text-[8px] text-slate-400 font-medium truncate">{cat.description || 'Disponível'}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="hidden space-y-4 pointer-events-none absolute w-0 h-0 overflow-hidden">
                        <div className="flex justify-between items-center border-b pb-2">
                           <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Categorias do Marketplace</h4>
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
                               setShowCategoryModal(true);
                             }}
                             className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline cursor-pointer"
                           >
                             Gerenciar Categorias
                           </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                           {commerceCategories.map((cat) => (
                              <div key={cat.id} className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-2.5 shadow-sm">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-100/50 ${cat.bg || 'bg-indigo-50'}`}>
                                    {cat.img ? (
                                       <img src={cat.img} className="w-5 h-5 object-contain" alt={cat.name} />
                                    ) : (
                                       <span className={`text-[10px] font-black uppercase ${cat.color || 'text-indigo-500'}`}>
                                          {cat.name ? cat.name.slice(0, 2) : ''}
                                       </span>
                                    )}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 truncate">{cat.name}</p>
                                    <p className="text-[8px] text-slate-400 font-medium truncate">{cat.description || 'Disponível'}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Taxa Transacional</p>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">R$ 1.50 fixo / pedido</p>
                        <p className="text-[8px] font-bold text-amber-600 uppercase mt-2">Modelo Altamente Escalável</p>
                     </div>
                     <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Upgrades (Mês)</p>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">12 Lojistas</p>
                        <p className="text-[8px] font-bold text-indigo-600 uppercase mt-2">LTC:R$ 1.840,00</p>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Dados Certificados por AI</span>
                     </div>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Última atualização: agora mesmo</p>
                  </div>
               </div>
            </div>
          </div>

        {/* DIDACTIC GROWTH MAP - PLANO DE CARREIRA DO SAAS */}
        <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden mt-12 mx-6 mb-12">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Mapa de Escala: Do Zero ao Milhão</h3>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Sua jornada didática para dominar o mercado de food-tech</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {[
                    { 
                        level: "Fase 1: Fundação", 
                        target: "1-10 Lojistas", 
                        desc: "Foco em ativação e feedback. Seu objetivo é garantir que os primeiros clientes amem o produto.",
                        icon: <Rocket size={20} />,
                        status: "Concluído",
                        color: "bg-emerald-500"
                    },
                    { 
                        level: "Fase 2: Tração", 
                        target: "11-50 Lojistas", 
                        desc: "Introdução do Marketplace. Receita transacional começa a superar as assinaturas.",
                        icon: <Zap size={20} />,
                        status: "Em Curso",
                        color: "bg-indigo-500"
                    },
                    { 
                        level: "Fase 3: Expansão", 
                        target: "51-200 Lojistas", 
                        desc: "Contratação de suporte dedicado. Automação de marketing para novas aquisições.",
                        icon: <Target size={20} />,
                        status: "Próximo",
                        color: "bg-slate-700"
                    },
                    { 
                        level: "Fase 4: Domínio", 
                        target: "200+ Lojistas", 
                        desc: "Ecossistema completo. Sua plataforma se torna o padrão da região.",
                        icon: <Crown size={20} />,
                        status: "Objetivo",
                        color: "bg-slate-700"
                    }
                  ].map((phase, idx) => (
                    <div key={idx} className="relative group">
                        <div className={`w-10 h-10 ${phase.color} rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-black/20 group-hover:scale-110 transition-all`}>
                          {phase.icon}
                        </div>
                        <h4 className="text-sm font-black tracking-tight mb-2 uppercase">{phase.level}</h4>
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">{phase.target}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{phase.desc}</p>
                        <div className="mt-6 inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/60">
                          {phase.status}
                        </div>
                        {idx < 3 && (
                          <div className="hidden md:block absolute top-5 -right-4 w-8 h-[2px] bg-slate-800" />
                        )}
                    </div>
                  ))}
              </div>

              <div className="mt-16 p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                        <PieChart size={32} />
                    </div>
                    <div>
                        <h5 className="text-lg font-black tracking-tighter">Projeção Financeira de Escala</h5>
                        <p className="text-xs text-slate-400">Com 100 lojistas no plano PRO + taxas, sua receita estimada é de <span className="text-emerald-400 font-black tracking-tight">R$ 35.000,00/mês</span>.</p>
                    </div>
                  </div>
                  <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40">Baixar Plano de Negócios</button>
              </div>
            </div>
        </div>
              </>
            );
          })()}
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
              { id: 'active', label: 'Ativos', count: tenants.filter(t => t.active && getDaysRemaining(t.subscription?.expiryDate) >= 0).length },
              { id: 'expiring', label: 'Expira em Breve', count: tenants.filter(t => t.active && getDaysRemaining(t.subscription?.expiryDate) >= 0 && getDaysRemaining(t.subscription?.expiryDate) <= 7).length },
              { id: 'expired', label: 'Inativos/Expirados', count: tenants.filter(t => !t.active || getDaysRemaining(t.subscription?.expiryDate) < 0).length }
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
              {filteredTenants.map((tenant) => (
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
                        <p className="font-black text-slate-800 text-sm">{tenant.name}</p>
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
                      if (!tenant.active || days < 0) {
                        return (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <XCircle size={10} /> Expirado
                          </span>
                        );
                      } else if (days <= 7) {
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
                      return (
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-700 font-mono">
                            {new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${
                            days < 0 ? 'text-rose-500' :
                            days === 0 ? 'text-rose-600 font-black animate-pulse' :
                            days <= 7 ? 'text-amber-500 font-black' :
                            'text-slate-400'
                          }`}>
                            {days < 0 
                              ? `Vencido há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}` 
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
                           <td className="px-6 py-4 text-right">
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
          {/* Subheader and sub-tabs selector */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>💰</span> Painel de Finanças e Tesouraria SaaS
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Acompanhe o faturamento, contas a pagar e receber, e consolide ciclos de comissionamento de lojistas
              </p>
            </div>
            
            {/* Inline financial sub-section tabs */}
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 gap-1">
              <button
                onClick={() => setFinancialSubSection('ledger')}
                className={`px-4 py-2 text-[10px] font-black text-center uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSubSection === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Coins size={12} />
                Análise Pagar/Receber
              </button>
              <button
                onClick={() => setFinancialSubSection('marketplace')}
                className={`px-4 py-2 text-[10px] font-black text-center uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSubSection === 'marketplace' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <RefreshCw size={12} />
                Ciclos Marketplace
              </button>
              <button
                onClick={() => setFinancialSubSection('faturamento')}
                className={`px-4 py-2 text-[10px] font-black text-center uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSubSection === 'faturamento' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TrendingUp size={12} />
                Faturamento SaaS
              </button>
            </div>
          </div>

          {financialSubSection === 'ledger' && (
            <div className="space-y-6">
              {/* Dynamic summary metric boxes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-slate-800 relative overflow-hidden hover:scale-[1.02] hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                  <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
                  <p className="text-2xl font-sans font-black text-emerald-600 block">
                    R$ {(
                      saasLedger.filter(i => i.type === 'receber' && i.status === 'pending').reduce((acc, i) => acc + (i.amount || 0), 0) + 
                      expiredPlansTotal
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lançamentos em aberto e assinaturas vencidas</div>
                  {expiredPlansTotal > 0 && (
                    <button
                      onClick={() => {
                        const el = document.getElementById('expired-tenants-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="text-[8.5px] text-rose-600 bg-rose-50 hover:bg-rose-100 font-extrabold flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg w-full transition-all border border-rose-100 hover:border-rose-200 cursor-pointer text-left"
                    >
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      ⚠️ {expiredTenantsList.length} {expiredTenantsList.length === 1 ? 'lojista está' : 'lojistas estão'} em atraso (R$ {expiredPlansTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </button>
                  )}
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-slate-800 relative overflow-hidden hover:scale-[1.02] hover:shadow-md hover:border-rose-100 transition-all duration-300">
                  <div className="absolute top-4 right-4 bg-rose-50 text-rose-600 p-2 rounded-xl">
                    <XCircle size={16} />
                  </div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                  <p className="text-2xl font-sans font-black text-rose-600 block">
                    R$ {saasLedger.filter(i => i.type === 'pagar' && i.status === 'pending').reduce((acc, i) => acc + (i.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="text-[8px] font-bold text-rose-400 uppercase tracking-widest mt-1">Custos operacionais pendentes</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-slate-800 relative overflow-hidden hover:scale-[1.02] hover:shadow-md hover:border-indigo-100 transition-all duration-300">
                  <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Liquidado Recebido</p>
                  <p className="text-2xl font-sans font-black text-indigo-600 block">
                    R$ {saasLedger.filter(i => i.type === 'receber' && i.status === 'paid').reduce((acc, i) => acc + (i.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">KitchenFlow AI compensado</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-slate-800 relative overflow-hidden hover:scale-[1.02] hover:shadow-md hover:border-slate-200 transition-all duration-300">
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Saldo Líquido Executado</p>
                  {(() => {
                    const rec = saasLedger.filter(i => i.type === 'receber' && i.status === 'paid').reduce((acc, i) => acc + (i.amount || 0), 0);
                    const pag = saasLedger.filter(i => i.type === 'pagar' && i.status === 'paid').reduce((acc, i) => acc + (i.amount || 0), 0);
                    const balance = rec - pag;
                    return (
                      <>
                        <div className="absolute top-4 right-4 p-2 rounded-xl bg-slate-50 text-slate-500">
                          <Coins size={16} />
                        </div>
                        <p className={`text-2xl font-sans font-black block ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Considerando repasses quitados</div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Table Ledger view */}
              <div id="saas-ledger-table-inline" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-indigo-900 text-white gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Livro Razão Plataforma (Contas a Pagar & Receber)</h3>
                    <p className="text-[9px] text-white/50 tracking-wider font-semibold uppercase mt-0.5">Gestão de licenças, APIs, marketing, infraestrutura e faturamento de lojistas</p>
                  </div>
                  <button
                    onClick={() => setShowAddLedgerModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-950 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    <Plus size={16} /> Adicionar Lançamento
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="bg-slate-50/60">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {saasLedger.length > 0 ? saasLedger.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4">
                            <span className="font-sans font-black text-slate-800 text-sm block">{item.description}</span>
                            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">id: {item.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 border border-slate-150 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {item.dueDate instanceof Date ? item.dueDate.toLocaleDateString() : item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'A definir'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-black font-sans ${item.type === 'receber' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'receber' ? '+' : '-'} R$ {item.amount?.toFixed(2)}
                              </span>
                              <span className="text-[8px] font-semibold text-slate-400 uppercase">
                                ({item.type === 'receber' ? 'Entrada' : 'Saída'})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleLedgerStatus(item)}
                              className={`px-3 py-1.5 text-[9px] font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${
                                item.status === 'paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              {item.status === 'paid' ? '● Quitado / Compensado' : '○ Pendente Ativo'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteLedgerItem(item.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Excluir Lançamento"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest font-sans">
                            Nenhum lançamento no livro razão ainda. Clique acima para registrar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {financialSubSection === 'marketplace' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2.5rem] flex gap-4 items-start font-sans">
                <span className="text-2xl mt-0.5">ℹ️</span>
                <div>
                  <h4 className="text-sm font-black text-amber-850 uppercase tracking-wider mb-1 font-sans">Como funciona o Fechamento de Ciclo Marketplace?</h4>
                  <p className="text-xs text-amber-800 leading-relaxed max-w-4xl font-bold font-sans">
                    O sistema cruza os pedidos faturados como origem **"Marketplace"** com as faturas de cobrança anteriores.
                    Ao lado, você confere o acumulado em aberto. Você pode fechar o ciclo de comissão acumulado mais a assinatura, gerando uma fatura Pix de conciliação.
                  </p>
                </div>
              </div>

              {/* Tenant commission balance list */}
              <div id="saas-marketplace-cycles-dynamic-wrapper" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden font-sans">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-950 text-white font-sans">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Conciliação de Tarifas por Lojista</h3>
                    <p className="text-[9px] text-white/50 tracking-wider font-semibold uppercase mt-0.5">Acompanhamento e fechamento de ciclo de comissões de vendas no aplicativo marketplace</p>
                  </div>
                  <div className="flex gap-4 p-1 rounded-xl bg-white/10 text-[9px] font-black uppercase font-sans">
                    <span className="px-3 py-1.5 text-white bg-white/10 rounded-lg">Comissão Global: {marketplaceFee}%</span>
                    <span className="px-3 py-1.5 text-white bg-white/10 rounded-lg">Custo Fator: R$ {marketplaceFixedFee.toFixed(2)}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="bg-slate-50/60 font-sans">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Inquilino</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Ativo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-black">Pedidos Marketplace</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">GMV Total</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarifas Acumuladas</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarifas Quidadas</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fechamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-sans">
                      {tenants.map((tenant) => {
                        const stats = getTenantMarketplaceStats(tenant.id);
                        return (
                          <tr key={tenant.id} className="hover:bg-slate-50/50 transition-all font-sans font-sans">
                            <td className="px-6 py-4 font-sans font-sans">
                              <span className="font-black text-slate-800 text-sm block">{tenant.name}</span>
                              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">SubID: {tenant.id}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9.5px] font-black uppercase tracking-wider">
                                {tenant.subscription?.plan || 'NENHUM'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-705 text-slate-700">
                              <span className="font-black text-indigo-600 font-bold">{stats.unbilledOrdersCount}</span> novos / {stats.totalOrdersCount} históricos
                            </td>
                            <td className="px-6 py-4 font-sans font-sans">
                              <p className="text-xs font-black text-slate-800">R$ {stats.unbilledGMV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">GMV do Ciclo Atual</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-black font-sans ${stats.unbilledFees > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                R$ {stats.unbilledFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-black font-sans text-emerald-600">
                                R$ {stats.billedFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedTenantForBilling(tenant);
                                  setBillingIncludeSubscription(true);
                                  setShowCloseCycleModal(true);
                                }}
                                disabled={stats.unbilledOrdersCount === 0 && (tenant.subscription?.plan === 'FREE')}
                                className={`px-4 py-3 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                                  stats.unbilledOrdersCount > 0 || (tenant.subscription?.plan !== 'FREE')
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                🔒 Cobrar Ciclo
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {financialSubSection === 'faturamento' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
               <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 font-sans">
                  <div className="flex justify-between items-center mb-8 font-sans">
                     <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Volume Geral de Recebimentos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acordo de assinaturas e conciliações de comissões marketplace</p>
                     </div>
                  </div>
                  
                  <div className="h-64 flex items-end justify-between gap-4 px-2 font-sans font-bold">
                     {[
                        { month: 'Jan', sub: 4500, mkt: 2000 },
                        { month: 'Fev', sub: 5200, mkt: 2500 },
                        { month: 'Mar', sub: 4800, mkt: 3500 },
                        { month: 'Abr', sub: 6500, mkt: 4500 },
                        { month: 'Mai', sub: 7800, mkt: 5000 },
                        { month: 'Jun', sub: (valorReceberMensalPlanos * 0.8), mkt: comissaoGeradaMarketplace },
                     ].map((data, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer font-sans">
                           <div className="w-full flex flex-col items-center gap-0.5 relative h-full justify-end font-sans">
                              <div 
                                 className="w-full max-w-4 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-600" 
                                 style={{ height: `${(data.mkt / 12000) * 100}%` }}
                              />
                              <div 
                                 className="w-full max-w-4 bg-indigo-500 rounded-t-lg transition-all group-hover:bg-indigo-650" 
                                 style={{ height: `${(data.sub / 12000) * 100}%` }}
                              />
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all font-sans">
                                 R$ {(data.sub + data.mkt).toFixed(0)}
                              </div>
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase">{data.month}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col justify-between font-sans">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 font-sans">Lojas por Categoria de Assinatura</h3>
                    <div className="space-y-6">
                       {[
                          { plan: 'ENTERPRISE', color: 'bg-purple-500', pct: Math.round((tenants.filter(t => t.subscription?.plan === 'ENTERPRISE').length / (tenants.length || 1)) * 100), mrr: `R$ ${tenants.filter(t => t.subscription?.plan === 'ENTERPRISE').length * 499}` },
                          { plan: 'PRO', color: 'bg-amber-500', pct: Math.round((tenants.filter(t => t.subscription?.plan === 'PRO').length / (tenants.length || 1)) * 100), mrr: `R$ ${tenants.filter(t => t.subscription?.plan === 'PRO').length * 199}` },
                          { plan: 'BASIC', color: 'bg-indigo-500', pct: Math.round((tenants.filter(t => t.subscription?.plan === 'BASIC').length / (tenants.length || 1)) * 100), mrr: `R$ ${tenants.filter(t => t.subscription?.plan === 'BASIC').length * 99}` },
                       ].map((item, idx) => (
                          <div key={idx} className="space-y-2">
                             <div className="flex justify-between items-center text-slate-800 font-sans">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-sans">{item.plan}</span>
                                <span className="text-[10px] font-mono font-black">{item.mrr} MRR</span>
                             </div>
                                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-sans">{item.pct || 0}% de todas as assinaturas</p>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-2 mt-4 text-indigo-850 font-sans">
                    <span className="text-base">💹</span>
                    <p className="text-[8.5px] font-black uppercase leading-snug">Empresas com plano Anual não geram recorrência mensal.</p>
                  </div>
               </div>
            </div>
          )}

          {/* Lojistas com Assinaturas Vencidas / Expiradas */}
          <div id="expired-tenants-section" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mt-6 scroll-mt-24 transition-all duration-300 hover:shadow-md">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertCircle size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    Lojistas com Assinaturas Vencidas ou Pendentes
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Painel de Cobrança • Acompanhe planos em atraso e regularize com baixas manuais rápidas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 ${expiredTenantsList.length > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} rounded-xl text-[10px] font-black uppercase tracking-wider`}>
                  {expiredTenantsList.length} em atraso
                </span>
              </div>
            </div>
            {expiredTenantsList.length > 0 ? (
              <div className="overflow-x-auto font-sans">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquilino / Lojista</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Ativo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo de Atraso</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensalidade</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {expiredTenantsList.map(tenant => {
                      const price = getTenantPlanPrice(tenant);
                      const days = Math.abs(getDaysRemaining(tenant.subscription?.expiryDate));
                      const formattedDate = tenant.subscription?.expiryDate
                        ? new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')
                        : 'Sem data';
                      
                      const cleanPhone = tenant.phone ? tenant.phone.replace(/\D/g, '') : '';
                      const whatsappText = encodeURIComponent(`Olá, ${tenant.name}! Equipe financeira KitchenFlow AI por aqui. Passando apenas para lembrar que a assinatura do seu plano KitchenFlow AI (${tenant.subscription?.plan || 'BASIC'}) venceu em ${formattedDate}.\n\nPara facilitar a regularização, você pode pagar via Pix. Caso necessite da chave Pix ou já tenha efetuado o pagamento, por favor nos responda aqui para darmos a baixa. Obrigado!`);
                      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${whatsappText}`;

                      return (
                        <tr key={tenant.id} className="hover:bg-rose-50/10 transition-all group">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-800 text-sm group-hover:text-rose-900 transition-colors">{tenant.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] font-mono text-slate-400 uppercase font-extrabold">ID: {tenant.id}</span>
                              {tenant.phone && (
                                <span className="text-[8px] font-sans text-slate-400 font-bold uppercase flex items-center gap-0.5">
                                  <Phone size={8} /> {tenant.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 rounded text-[9px] font-black uppercase tracking-wider border border-indigo-100">
                              {tenant.subscription?.plan || 'BASIC'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-[9px] font-black uppercase tracking-widest font-mono border border-rose-100 animate-pulse">
                              {days} {days === 1 ? 'dia' : 'dias'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-black font-sans text-rose-600 block">
                              R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {tenant.phone && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-all cursor-pointer font-black text-[9px] uppercase tracking-wider flex items-center gap-1 active:scale-95 border border-emerald-150"
                                  title="Enviar mensagem de cobrança pré-configurada via WhatsApp"
                                >
                                  <MessageSquare size={12} className="text-emerald-650" />
                                  Notificar WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => 
                                  confirmAction(
                                    "Dar Baixa de Recebimento", 
                                    `Confirmar o recebimento de R$ ${price.toFixed(2)} referente ao plano do lojista ${tenant.name}? Essa ação renovará a assinatura e regularizará o status no sistema.`, 
                                    () => handleQuickSettleTenant(tenant), 
                                    'info'
                                  )
                                }
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
                              >
                                <CheckCircle2 size={12} /> Confirmar Recebimento / Baixa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest font-sans bg-slate-50/20">
                Nenhum lojista com fatura vencida no momento. Todas as mensalidades em dia! 🎉
              </div>
            )}
          </div>

          {/* Histórico Real de Renovações e Pagamentos SaaS */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Histórico de Recebimentos Recorrentes (SaaS)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Registrado automaticamente a partir de renovações e extensões de planos de lojistas</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                {saasPayments.length} Lançamentos Realizados
              </span>
            </div>
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lojista</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período Contratado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Recebido</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal de Pagamento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Processamento / Compensação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {saasPayments.length > 0 ? saasPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-800 text-sm">{payment.tenantName}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {payment.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-wider">
                          {payment.period === 'monthly' ? 'Mensal' :
                           payment.period === 'quarterly' ? 'Trimestral' :
                           payment.period === 'semiannual' ? 'Semestral' :
                           payment.period === 'yearly' ? 'Anual' : 'Personalizado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-800">R$ {payment.amountPaid?.toFixed(2)}</p>
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase">Estendido até {payment.expiryDate instanceof Date ? payment.expiryDate.toLocaleDateString() : payment.expiryDate ? new Date(payment.expiryDate).toLocaleDateString() : ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                          {payment.paymentMethod === 'pix' ? 'Pix Immediate' :
                           payment.paymentMethod === 'cartao' ? 'Cartão de Crédito' :
                           payment.paymentMethod === 'boleto' ? 'Boleto Digital' : 'Dinheiro / Outro'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-mono text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle2 size={12} />
                          Compensado ({payment.createdAt instanceof Date ? payment.createdAt.toLocaleDateString() : payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : new Date().toLocaleDateString()})
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                        Nenhuma renovação registrada ainda. Use as ferramentas do menu de Clientes para prorrogar planos e registrar recebimentos aqui.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'marketplace_config' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-900 text-white">
                 <div>
                   <h3 className="text-lg font-black tracking-tighter">Configuração do Marketplace</h3>
                   <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Configure promoções, taxas e visibilidade global</p>
                 </div>
                 <button 
                   onClick={() => confirmAction("Salvar Configurações", "Deseja salvar as alterações no marketplace global?", handleSaveMarketplaceConfig, 'info')}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20"
                 >
                   <Save size={16} className="inline mr-2" />
                   Salvar Alterações
                 </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Serviço Global (%)</label>
                       <input 
                         type="number" 
                         step="0.1"
                         className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" 
                         value={marketplaceFee}
                         onChange={(e) => setMarketplaceFee(Number(e.target.value))}
                       />
                       <p className="text-[9px] text-slate-400 font-medium">Esta taxa será aplicada sobre o valor total de cada pedido realizado via marketplace.</p>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa Fixa por Pedido no Marketplace (R$)</label>
                       <input 
                         type="number" 
                         step="0.05"
                         className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" 
                         value={marketplaceFixedFee}
                         onChange={(e) => setMarketplaceFixedFee(Number(e.target.value))}
                       />
                       <p className="text-[9px] text-slate-400 font-medium">Este valor fixo de R$ (ex: 1.50) será cobrado por pedido faturado do lojista no marketplace.</p>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banner Promocional Principal</label>
                       <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl space-y-4">
                          <img 
                            src={marketplaceBanner} 
                            className="w-full h-32 object-cover rounded-2xl" 
                            alt="Preview"
                          />
                          <label className="w-full py-3 bg-white border border-slate-200 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center">
                             <Upload size={14} className="inline mr-2" /> Trocar Imagem do Banner
                             <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                          </label>
                       </div>
                    </div>
                 </div>

                  <div className="space-y-6">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">Programação de Manutenção</h4>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="text-[11px] font-bold text-slate-700">Ativar Período de Manutenção</p>
                             <p className="text-[9px] text-slate-400 font-medium tracking-tight">Informa clientes e bloqueia pedidos no marketplace</p>
                          </div>
                          <div 
                            onClick={() => setMaintenanceConfig({ ...maintenanceConfig, active: !maintenanceConfig.active })}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${maintenanceConfig.active ? 'bg-amber-500 shadow-lg shadow-amber-100' : 'bg-slate-200'}`}
                          >
                             <div className={`w-4 h-4 bg-white rounded-full transition-all ${maintenanceConfig.active ? 'translate-x-6' : 'translate-x-0'}`} />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Início</label>
                             <input 
                               type="datetime-local" 
                               className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-600"
                               value={maintenanceConfig.startAt}
                               onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, startAt: e.target.value })}
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase">Fim Previsto</label>
                             <input 
                               type="datetime-local" 
                               className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-600"
                               value={maintenanceConfig.endAt}
                               onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, endAt: e.target.value })}
                             />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Mensagem de Aviso</label>
                          <textarea 
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-600 min-h-[60px]"
                            placeholder="Ex: Estamos em manutenção programada..."
                            value={maintenanceConfig.message}
                            onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, message: e.target.value })}
                          />
                       </div>
                    </div>

                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">Promoções em Destaque</h4>
                       <div className="space-y-3">
                          {marketplacePromotions.map((promo, idx) => (
                             <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
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
                                       setEditingPromo({...promo, index: idx});
                                       setShowPromoModal(true);
                                     }}
                                     className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"
                                   >
                                      <Edit3 size={14} />
                                   </button>
                                   <span className="text-sm font-bold text-slate-700">{promo.title}</span>
                                   <span className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded uppercase">{promo.participatingTenantIds?.length || 0} Lojas</span>
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
                          <button 
                            onClick={() => {
                               setEditingPromo({ id: `promo_${Date.now()}`, title: '', active: true, participatingTenantIds: [] });
                               setShowPromoModal(true);
                            }}
                            className="w-full py-3 bg-slate-50 text-slate-500 border border-slate-100 border-dashed rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                          >
                             <Plus size={14} className="inline mr-2" /> Nova Promoção
                          </button>
                       </div>
                    </div>

                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-4">
                       <div className="flex items-center gap-3">
                          <AlertCircle className="text-amber-500" size={20} />
                          <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Agendamento de Manutenção</h4>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Início</label>
                                <input 
                                  type="datetime-local" 
                                  className="w-full p-3 bg-white border border-amber-200 rounded-xl text-[10px] font-bold outline-none focus:border-amber-500"
                                  value={maintenanceConfig.startAt}
                                  onChange={(e) => setMaintenanceConfig({...maintenanceConfig, startAt: e.target.value})}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Fim</label>
                                <input 
                                  type="datetime-local" 
                                  className="w-full p-3 bg-white border border-amber-200 rounded-xl text-[10px] font-bold outline-none focus:border-amber-500"
                                  value={maintenanceConfig.endAt}
                                  onChange={(e) => setMaintenanceConfig({...maintenanceConfig, endAt: e.target.value})}
                                />
                             </div>
                          </div>
                          
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Mensagem para Clientes</label>
                             <textarea 
                               className="w-full p-3 bg-white border border-amber-200 rounded-xl text-[10px] font-medium outline-none focus:border-amber-500 h-20"
                               placeholder="Ex: Estamos em manutenção programada para melhorias..."
                               value={maintenanceConfig.message}
                               onChange={(e) => setMaintenanceConfig({...maintenanceConfig, message: e.target.value})}
                             />
                          </div>

                          <button 
                            onClick={() => setMaintenanceConfig({...maintenanceConfig, active: !maintenanceConfig.active})}
                            className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg ${maintenanceConfig.active ? 'bg-rose-500 text-white shadow-rose-100' : 'bg-amber-500 text-white shadow-amber-200'} hover:opacity-90`}
                          >
                             {maintenanceConfig.active ? 'Desativar Manutenção Agora' : 'Ativar Manutenção / Agendamento'}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
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
                           placeholder="Ex: Festival de Verão"
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
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Restaurantes Participantes ({editingPromo.participatingTenantIds?.length || 0})</label>
                      <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden flex flex-col h-64">
                         <div className="p-3 border-b bg-white flex items-center gap-2">
                           <Search size={14} className="text-slate-400" />
                           <input 
                             type="text" 
                             placeholder="Buscar loja..." 
                             className="text-[10px] font-bold outline-none w-full" 
                             value={promoTenantSearch}
                             onChange={(e) => setPromoTenantSearch(e.target.value)}
                           />
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {tenants
                             .filter(t => t.name.toLowerCase().includes(promoTenantSearch.toLowerCase()))
                             .map(tenant => (
                               <button
                                 key={tenant.id}
                                 onClick={() => {
                                    const currentIds = editingPromo.participatingTenantIds || [];
                                    const newIds = currentIds.includes(tenant.id) 
                                      ? currentIds.filter((id: string) => id !== tenant.id)
                                      : [...currentIds, tenant.id];
                                    setEditingPromo({...editingPromo, participatingTenantIds: newIds});
                                 }}
                                 className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                                    (editingPromo.participatingTenantIds || []).includes(tenant.id)
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-white text-slate-600 hover:bg-slate-100'
                                 }`}
                               >
                                  <div className="flex items-center gap-3">
                                     <div className="w-6 h-6 rounded bg-white/20 overflow-hidden flex items-center justify-center">
                                        {tenant.logoUrl ? <img src={tenant.logoUrl} className="w-full h-full object-cover" /> : <Building2 size={12} />}
                                     </div>
                                     <span className="text-[10px] font-black uppercase text-left">{tenant.name}</span>
                                  </div>
                                  {(editingPromo.participatingTenantIds || []).includes(tenant.id) && <CheckCircle2 size={14} />}
                               </button>
                            ))}
                         </div>
                      </div>
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
                   <h2 className="text-xl font-black tracking-tighter">Novo Membro Equipe SaaS</h2>
                   <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Defina permissões específicas de acesso</p>
                </div>
                <button onClick={() => setShowSaaSUserModal(false)} className="p-2 text-white/50 hover:text-white transition-all"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateSaaSUser} className="p-8 space-y-6">
                {emailError && (
                   <div className="bg-rose-50 border-2 border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold text-center">
                      {emailError}
                   </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                     <input required name="name" type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Ex: Admin KitchenFlow AI" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                     <input required name="email" type="email" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all" placeholder="admin@kitchenflowai.com" />
                  </div>
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
                   Gerar Credenciais de Acesso
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
                    <option value="quarterly">Trimestral (A cada 3 meses)</option>
                    <option value="semiannual">Semestral (A cada 6 meses)</option>
                    <option value="yearly">Anual (A cada 12 meses)</option>
                  </select>
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
                    { id: 'quarterly', label: 'Trimestral', desc: '5% de desconto' },
                    { id: 'semiannual', label: 'Semestral', desc: '10% de desconto' },
                    { id: 'yearly', label: 'Anual', desc: '20% de economia' },
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
                        const mul = renewPeriod === 'monthly' ? 1 : renewPeriod === 'quarterly' ? 3 : renewPeriod === 'semiannual' ? 6 : 12;
                        const disc = renewPeriod === 'monthly' ? 0 : renewPeriod === 'quarterly' ? 0.05 : renewPeriod === 'semiannual' ? 0.10 : 0.20;
                        return (basePrice * mul * (1 - disc)).toFixed(2);
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Custo por Ciclo</p>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-lg uppercase tracking-wider">
                      {renewPeriod === 'monthly' ? 'Normal' : renewPeriod === 'quarterly' ? '5% OFF' : renewPeriod === 'semiannual' ? '10% OFF' : '20% OFF'}
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
                      } else if (renewPeriod === 'quarterly') {
                        currentExpiry.setMonth(currentExpiry.getMonth() + 3);
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
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SaaSAdmin;
