import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  TrendingUp, 
  Sparkles, 
  Shield, 
  Trello, 
  Bike, 
  Smartphone, 
  Users, 
  Check, 
  CheckCircle2, 
  MessageSquare, 
  Menu, 
  X, 
  ArrowRight, 
  Plus, 
  Phone, 
  Mail, 
  Building, 
  DollarSign, 
  Flame, 
  Activity, 
  Award, 
  Lock,
  BarChart2,
  Layers,
  Package,
  Settings,
  FileText,
  Globe,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Máscara de Telefone para o Brasil (ex: (11) 99999-9999)
const maskPhone = (value: string) => {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return cleanValue
    .substring(0, 11)
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const ChefHatLogo = ({ className = "w-6 h-6 text-brand-primary" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M26 56 C16 56, 12 42, 22 34 C16 19, 32 6, 44 12 C52 0, 72 2, 76 18 C88 12, 94 28, 84 38 C90 49, 80 56, 72 56"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M29 56 V66 C29 69, 33 71, 41 71 H71 C79 71, 83 69, 83 66 V56"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="56" cy="66" r="4.5" fill="currentColor" />
    <path d="M56 66 V59 H44" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    <path
      d="M32 48 Q48 46, 56 30 L66 18"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M56 18 H66 V28"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DEFAULT_PLANS = [
  {
    id: 'essential',
    name: 'Essential POS',
    description: 'Ideal para novas operações, dark kitchens ou lanchonetes de pequeno porte.',
    priceMonthly: 149,
    priceYearly: 119,
    icon: Smartphone,
    isPopular: false,
    modules: ['pos_access', 'tables_manage', 'inventory_edit', 'finance_view'],
    maxUsers: 3,
    maxOrders: 1000,
    features: [
      'Operação de Vendas (PDV Web)',
      'Comandas de Mesa e QR Code',
      'Gestão de Estoque Completa',
      'Controle de Caixa e Finanças',
      'Até 3 usuários simultâneos',
      'Limite de 1000 pedidos/mês',
      'Suporte básico por e-mail'
    ]
  },
  {
    id: 'pro-ai',
    name: 'Professional AI',
    description: 'A solução de alta performance completa, com monitoramento KDS e Inteligência Artificial.',
    priceMonthly: 299,
    priceYearly: 239,
    icon: Sparkles,
    isPopular: true,
    modules: ['pos_access', 'tables_manage', 'inventory_edit', 'finance_view', 'dashboard_view', 'kds_view', 'digital_menu_manage', 'cmv_analysis', 'users_manage'],
    maxUsers: 10,
    maxOrders: 5000,
    features: [
      'Operação de Vendas (PDV Web)',
      'Comandas de Mesa e QR Code',
      'Gestão de Estoque Completa',
      'Controle de Caixa e Finanças',
      'Painel AI de Indicadores',
      'Monitor de Preparo Cozinha (KDS)',
      'Cardápio Digital QR Code',
      'Auditoria de CMV com Inteligência',
      'Gerenciamento de Equipe e Permissões',
      'Até 10 usuários simultâneos',
      'Limite de 5000 pedidos/mês',
      'Suporte ágil via WhatsApp'
    ]
  },
  {
    id: 'elite',
    name: 'Elite Enterprise',
    description: 'Para franquias, redes de restaurantes e operações robustas de alta complexidade.',
    priceMonthly: 599,
    priceYearly: 479,
    icon: Award,
    isPopular: false,
    modules: ['pos_access', 'tables_manage', 'inventory_edit', 'finance_view', 'dashboard_view', 'kds_view', 'digital_menu_manage', 'cmv_analysis', 'users_manage', 'marketplace_manage', 'delivery_manage', 'fiscal_manage', 'courier_app_access', 'admin_settings_manage'],
    maxUsers: 99,
    maxOrders: 99999,
    features: [
      'Operação de Vendas (PDV Web)',
      'Comandas de Mesa e QR Code',
      'Gestão de Estoque Completa',
      'Controle de Caixa e Finanças',
      'Painel AI de Indicadores',
      'Monitor de Preparo Cozinha (KDS)',
      'Cardápio Digital QR Code',
      'Auditoria de CMV com Inteligência',
      'Gerenciamento de Equipe e Permissões',
      'Vitrine no Marketplace Gourmet',
      'Logística de Entregas & Delivery',
      'Módulo Fiscal (Emissão NFC-e)',
      'App de Rastreio de Entregadores',
      'Painel de Configurações Geral',
      'Pedidos mensais ilimitados',
      'Suporte prioritário VIP 24/7'
    ]
  }
];

const SYSTEM_MODULES = [
  { id: 'dashboard_view', name: 'Painel AI de Indicadores', desc: 'Gráficos interativos em tempo real, inteligência de faturamento e análise de crescimento.', icon: BarChart2, color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' },
  { id: 'pos_access', name: 'Operação de Vendas (PDV Web)', desc: 'Faturamento rápido em balcão e caixas, com alta performance operacional e funcionamento contínuo.', icon: Smartphone, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'tables_manage', name: 'Comandas de Mesa e Salão', desc: 'Organização visual completa de mesas, consumo em tempo real, união de comandas e divisões ágeis.', icon: Layers, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'kds_view', name: 'Monitor de Preparo Cozinha (KDS)', desc: 'Despacho eletrônico ágil para confeitaria, bar e linha de pratos com controle térmico e de tempo.', icon: Trello, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { id: 'delivery_manage', name: 'Logística de Entregas & Delivery', desc: 'Centralização de taxas por zona ou quilômetro, atribuição de motorista e despacho inteligente.', icon: Bike, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { id: 'digital_menu_manage', name: 'Cardápio Digital por QR Code', desc: 'Autoatendimento direto no smartphone do cliente, integrando pedidos imediatos à cozinha.', icon: Sparkles, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'customers_manage', name: 'Módulo de Fiado & Contas', desc: 'Gestão de contas correntes e carteiras de clientes, limites de fiado e históricos de liquidação.', icon: Users, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'inventory_edit', name: 'Gestão de Estoque Completa', desc: 'Controle de matéria-prima, ficha técnica automatizada com baixa em vendas e alertas de insumos.', icon: Package, color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
  { id: 'finance_view', name: 'Controle de Caixa e Finanças', desc: 'Fluxo de caixa detalhado por operador, contas a pagar e receber, retiradas (sangrias) e depósitos.', icon: DollarSign, color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' },
  { id: 'cmv_analysis', name: 'Auditoria de CMV Inteligente', desc: 'Cálculo dinâmico do Custo de Mercadoria Vendida por produto com otimizações inteligentes de margem.', icon: TrendingUp, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { id: 'users_manage', name: 'Gerenciamento de Equipe', desc: 'Controle rígido de acessos, senhas individuais de alteração e comissão automatizada de garçons.', icon: Award, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'admin_settings_manage', name: 'Painel de Configurações Geral', desc: 'Hub de branding, parametrização de faturas, horários de funcionamento e impressões.', icon: Settings, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { id: 'fiscal_manage', name: 'Módulo Fiscal (Emissão NFC-e)', desc: 'Emissão descomplicada de cupons e notas fiscais homologadas em poucos cliques no caixa.', icon: FileText, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { id: 'marketplace_manage', name: 'Vitrine no Marketplace Gourmet', desc: 'Canal extra de faturamento exibindo seu restaurante na vitrine pública do marketplace para pedidos integrados.', icon: Globe, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
  { id: 'courier_app_access', name: 'App de Rastreio de Entregadores', desc: 'Localização geográfica das partidas integradas para rastrear entregadores no mapa ao vivo e dar segurança.', icon: Compass, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' }
];

export default function KitchenflowWebsite() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [activePlans, setActivePlans] = useState<any[]>(DEFAULT_PLANS);
  
  // States do Formulário de Lead
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // States do Simulador Interativo do Sistema (Hero Mockup)
  const [salesMultiplier, setSalesMultiplier] = useState(0); // 0% a 50%
  const [cmvReduction, setCmvReduction] = useState(0); // 0% a 40%
  const [fixedCostsReduction, setFixedCostsReduction] = useState(0); // 0% a 30%
  const [appFeesReduction, setAppFeesReduction] = useState(0); // 0% a 50%
  const [heroActiveTab, setHeroActiveTab] = useState<'painel' | 'copiloto' | 'cmv' | 'custos'>('painel');
  const [showAiReport, setShowAiReport] = useState(false);

  // Real-time synchronization with SaaS PLANS registered in database
  useEffect(() => {
    const q = query(collection(db, 'plans'), orderBy('price', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const loadedPlans = snapshot.docs.map(doc => {
          const data = doc.data();
          
          const price = Number(data.price) || 0;
          const billingCycle = data.billingCycle || 'monthly';
          
          // Determine friendly prices for toggle display
          let priceMonthly = price;
          let priceYearly = Math.round(price * 0.8); // 20% discount on monthly plans for yearly display
          
          if (billingCycle === 'yearly') {
            priceMonthly = Math.round(price / 12);
            priceYearly = price;
          } else if (billingCycle === 'quarterly') {
            priceMonthly = Math.round(price / 3);
            priceYearly = Math.round(priceMonthly * 12 * 0.8);
          } else if (billingCycle === 'semiannual') {
            priceMonthly = Math.round(price / 6);
            priceYearly = Math.round(priceMonthly * 12 * 0.8);
          }

          // Mapper table to translate technical module ids into client-facing values
          const permissionMap: Record<string, string> = {
            'dashboard_view': 'Painel AI de Indicadores',
            'marketplace_manage': 'Vitrine no Marketplace Gourmet',
            'tables_manage': 'Comandas de Mesa e QR Code',
            'kds_view': 'Monitor de Preparo Cozinha (KDS)',
            'delivery_manage': 'Logística de Entregas & Delivery',
            'digital_menu_manage': 'Cardápio Digital QR Code',
            'customers_manage': 'Módulo de Fiado & Contas Clientes',
            'inventory_edit': 'Gestão de Estoque Completa',
            'finance_view': 'Controle de Caixa e Finanças',
            'cmv_analysis': 'Auditoria de CMV com Inteligência',
            'users_manage': 'Gerenciamento de Equipe e Permissões',
            'admin_settings_manage': 'Painel de Configurações Geral',
            'fiscal_manage': 'Módulo Fiscal (Emissão NFC-e)',
            'courier_app_access': 'App de Rastreio de Entregadores'
          };

          const dynamicFeatures: string[] = [];
          
          // Use hardcoded bullet list features if explicitly registered, else build dynamically
          if (data.features && Array.isArray(data.features) && data.features.length > 0) {
            dynamicFeatures.push(...data.features);
          } else {
            if (data.modules && Array.isArray(data.modules)) {
              data.modules.forEach((mod: string) => {
                const label = permissionMap[mod];
                if (label) dynamicFeatures.push(label);
              });
            }
            
            const maxUsers = Number(data.maxUsers) || 0;
            if (maxUsers > 0) {
              dynamicFeatures.push(`Até ${maxUsers} usuários simultâneos`);
            } else {
              dynamicFeatures.push('Acesso p/ usuários ilimitados');
            }

            const maxOrders = Number(data.maxOrders) || 0;
            if (maxOrders > 0 && maxOrders < 10000) {
              dynamicFeatures.push(`Limite de ${maxOrders} pedidos/mês`);
            } else {
              dynamicFeatures.push('Pedidos mensais ilimitados');
            }

            if (priceMonthly > 300) {
              dynamicFeatures.push('Suporte prioritário VIP 24/7');
            } else if (priceMonthly > 150) {
              dynamicFeatures.push('Suporte ágil via WhatsApp');
            } else {
              dynamicFeatures.push('Suporte básico por e-mail');
            }
          }

          let planIcon = Smartphone;
          if (priceMonthly > 350) {
            planIcon = Award;
          } else if (priceMonthly >= 180) {
            planIcon = Sparkles;
          }

          return {
            id: doc.id,
            name: data.name || 'Sem Nome',
            description: data.description || 'Sem descrição cadastrada.',
            priceMonthly,
            priceYearly,
            icon: planIcon,
            isPopular: false, // will be balanced subsequently
            features: dynamicFeatures
          };
        });

        // Balance popularity visually (the middle one, or the one with Pro in name)
        if (loadedPlans.length > 0) {
          const middleIdx = Math.floor(loadedPlans.length / 2);
          loadedPlans.forEach((p, idx) => {
            p.isPopular = idx === middleIdx;
          });
        }

        setActivePlans(loadedPlans);
      } else {
        setActivePlans(DEFAULT_PLANS);
      }
    }, (error) => {
      console.error("Error loading plans for Kitchenflow Website:", error);
      setActivePlans(DEFAULT_PLANS);
    });

    return () => unsubscribe();
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeadPhone(maskPhone(e.target.value));
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail || !leadPhone || !leadCompany) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const leadData = {
        name: leadName.trim(),
        email: leadEmail.trim().toLowerCase(),
        phone: leadPhone.trim(),
        companyName: leadCompany.trim(),
        status: 'Novo',
        source: 'Landing Page Publica',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'leads'), leadData);
      
      setSubmitSuccess(true);
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      setLeadCompany('');
    } catch (err: any) {
      console.error('Erro ao enviar lead:', err);
      setErrorMessage('Desculpe, ocorreu um erro de conexão. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-screen overflow-y-auto scroll-smooth bg-[#080c14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative" id="public-website">
      {/* Header / Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/10">
              <ChefHatLogo className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white font-sans tracking-tighter">KitchenFlow</span>
              <span className="text-xs font-black text-emerald-400 ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">AI</span>
            </div>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#solucoes" className="text-xs font-bold text-slate-350 hover:text-white transition-colors uppercase tracking-wider">Módulos</a>
            <a href="#recursos" className="text-xs font-bold text-slate-350 hover:text-white transition-colors uppercase tracking-wider">Recursos AI</a>
            <a href="#precos" className="text-xs font-bold text-slate-350 hover:text-white transition-colors uppercase tracking-wider">Planos</a>
            <a href="#depoimentos" className="text-xs font-bold text-slate-350 hover:text-white transition-colors uppercase tracking-wider">Clientes</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a 
              href="/saas" 
              className="text-xs font-extrabold text-slate-350 hover:text-white uppercase tracking-widest transition-colors"
            >
              Fazer Login
            </a>
            <a 
              href="#leads-section" 
              className="px-5 py-2.5 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-950/40 border-b-2 border-[#B82300] hover:-translate-y-[1px] active:translate-y-[1px] transition-all"
            >
              Demo Grátis
            </a>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-lg overflow-hidden py-4 px-6 space-y-4"
            >
              <div className="flex flex-col gap-4">
                <a 
                  href="#solucoes" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider"
                >
                  Módulos
                </a>
                <a 
                  href="#recursos" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider"
                >
                  Recursos AI
                </a>
                <a 
                  href="#precos" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider"
                >
                  Planos
                </a>
                <a 
                  href="#depoimentos" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider"
                >
                  Clientes
                </a>
              </div>
              <div className="border-t border-slate-850 pt-4 flex flex-col gap-3">
                <a 
                  href="/saas" 
                  className="text-center py-2.5 bg-slate-800 text-slate-100 rounded-xl text-xs font-bold uppercase"
                >
                  Fazer Login
                </a>
                <a 
                  href="#leads-section" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2.5 bg-brand-primary text-white hover:bg-brand-primary/95 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Solicitar Demonstração
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto md:grid md:grid-cols-2 md:gap-12 md:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-xs font-black text-brand-primary uppercase tracking-widest">
            <Sparkles size={14} className="animate-pulse" /> Inteligência Gastronômica
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none">
            O Ecossistema Completo de Gestão para <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-orange-500">Restaurantes de Elite</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-lg">
            Da cozinha à contabilidade, conecte seus KDS, comandas digitais por QR Code, aplicativo de entregadores e assistente de CMV com IA em uma única infraestrutura sem falhas. Descubra o faturamento real do seu negócio com dados integrados.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a 
              href="#leads-section" 
              className="px-6 py-3 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-950/30 flex items-center gap-2 transition-all group border-b-2 border-[#B82300] cursor-pointer"
            >
              Criar Conta Grátis <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="#solucoes" 
              className="px-6 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-700/60 shadow-md transition-all cursor-pointer"
            >
              Ver Módulos
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800">
            <div>
              <p className="text-2xl font-black text-brand-primary tracking-tight">99.98%</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tempo de Uptime</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brand-primary tracking-tight">R$ 54M+</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Vendas Processadas</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brand-primary tracking-tight">2.5k+</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Garçons & Cozinheiros</p>
            </div>
          </div>
        </div>

        <div className="mt-12 md:mt-0 relative col-span-1">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 via-orange-500/5 to-transparent blur-3xl -z-10" />
          
          <div className="bg-[#0c1221] p-3 sm:p-5 rounded-[2.5rem] border border-slate-800 shadow-2xl relative select-none">
            
            {/* Window Top bar with status links */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                {/* Simulated URL */}
                <span className="text-[10px] text-slate-500 font-mono tracking-wide bg-slate-950 px-3 py-1 rounded-full border border-slate-850">
                  https://kitchenflow.ai/dashboard
                </span>
              </div>
              
              {/* Range Selector Filters */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-950 p-1 rounded-lg border border-slate-850">
                <span className="text-[9px] px-1.5 py-0.5 text-slate-500 font-bold">Hoje</span>
                <span className="text-[9px] px-1.5 py-0.5 text-slate-500 font-bold">7D</span>
                <span className="text-[9px] px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-450 font-black rounded-md">Mês</span>
                <span className="text-[9px] px-1.5 py-0.5 text-slate-500 font-bold font-sans">Mês Ant.</span>
              </div>
            </div>

            {/* Simulated Desktop App Tabs */}
            <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-800/50 pb-2">
              <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border bg-slate-800 text-white border-slate-700">
                Painel AI e Visão Geral
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-slate-400 border border-transparent">
                Copiloto Financeiro
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-slate-400 border border-transparent">
                Assistente de Cardápio (CMV)
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-slate-400 border border-transparent">
                Configurar Custos Fixos
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Grid 2-column: Left column (Health), Right column (Lucros estimativos) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column: Health Gauge */}
                <div className="lg:col-span-5 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wider block">Sua Saúde Operacional</span>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                        ✖ PREJUÍZO REAL
                      </span>
                    </div>
                  </div>

                  {/* Graphic Gauge */}
                  <div className="my-3 flex flex-col items-center justify-center relative min-h-[110px] z-10">
                    {/* Semi-circular gauge */}
                    <svg viewBox="0 0 100 55" className="w-full max-w-[130px] overflow-visible">
                      <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      {/* Arc track background */}
                      <path 
                        d="M 10 50 A 40 40 0 0 1 90 50" 
                        fill="none" 
                        stroke="#111827" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                      />
                      {/* Beautiful gradient Arc track foreground */}
                      <path 
                        d="M 10 50 A 40 40 0 0 1 90 50" 
                        fill="none" 
                        stroke="url(#gaugeGradient)" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        opacity="0.9"
                      />
                      {/* Needle Indicator - fixed pointing left at -40 deg for Prejuízo */}
                      <g transform="translate(50, 50) rotate(-40)">
                        {/* Needle body */}
                        <line x1="0" y1="0" x2="0" y2="-43" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                        <polygon points="-4,0 4,0 0,-15" fill="#f97316" />
                        {/* Needle cap */}
                        <circle cx="0" cy="0" r="5" fill="#1e293b" stroke="#f97316" strokeWidth="2.5" />
                      </g>
                    </svg>

                    {/* Large readout */}
                    <div className="text-center mt-2">
                      <p className="text-lg font-black tracking-tight leading-none text-rose-450">
                        -11.0%
                      </p>
                      <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wider">Margem Líquida Real</p>
                    </div>
                  </div>

                  <div className="space-y-3 z-10">
                    <p className="text-[9px] text-slate-400 leading-normal font-sans font-semibold">
                      Prejuízo: Você está desembolsando caixa para girar a operação de vendas.
                    </p>
                    <div className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                      <Sparkles size={11} className="text-rose-400" /> EXPLIQUE MINHA OPERAÇÃO
                    </div>
                  </div>
                </div>
                
                {/* Right Column: Lucros Estimates Grid */}
                <div className="lg:col-span-7 space-y-4">
                  
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">
                       Demonstrativo de Lucros Estimados • Este Mês
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* 1. Faturamento Bruto */}
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-widest leading-none">1. Faturamento Bruto</p>
                          <p className="text-xs font-black text-white mt-1">
                            R$ 2.268,89
                          </p>
                        </div>
                        <div className="mt-2 text-[7px] text-emerald-450 font-bold leading-none">
                          <span className="text-emerald-400 font-black">+100%</span> vs período ant.
                        </div>
                      </div>

                      {/* 2. Custo Prod CMV */}
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-widest leading-none">2. Custo Prod (CMV)</p>
                          <p className="text-xs font-black text-rose-400 mt-1">
                            - R$ 217,69
                          </p>
                        </div>
                        <div className="mt-2 inline-flex items-center justify-between text-[7px] text-slate-500 font-bold leading-none w-full">
                          <span>Insumos reais</span>
                          <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-black">
                            10%
                          </span>
                        </div>
                      </div>

                      {/* 3. Comissoes Apps */}
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-widest leading-none">3. Comissões Apps</p>
                          <p className="text-xs font-black text-slate-400 mt-1">
                            - R$ 0,00
                          </p>
                        </div>
                        <div className="mt-2 text-[7px] text-slate-500 font-bold leading-none">
                          Taxas de delivery iFood/Rappi
                        </div>
                      </div>

                      {/* 4. Folha Proporcional */}
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-widest leading-none">4. Folha Proporcional</p>
                          <p className="text-xs font-black text-rose-450 mt-1">
                            - R$ 1.603,50
                          </p>
                        </div>
                        <div className="mt-2 text-[7px] text-slate-500 font-bold leading-none">
                          Equipes salão/cozinha (5d)
                        </div>
                      </div>

                      {/* 5. Despesas Fixas */}
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-widest leading-none">5. Despesas Fixas Prop.</p>
                          <p className="text-xs font-black text-rose-450 mt-1">
                            - R$ 696,67
                          </p>
                        </div>
                        <div className="mt-2 text-[7px] text-slate-500 font-bold leading-none">
                          Prorrateio operacional (5d)
                        </div>
                      </div>

                      {/* 6. Outras Despesas */}
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-extrabold uppercase text-slate-500 tracking-widest leading-none">6. Outras Despesas</p>
                          <p className="text-xs font-black text-slate-500 mt-1">
                            - R$ 0,00
                          </p>
                        </div>
                        <div className="mt-2 text-[7px] text-slate-500 font-bold leading-none">
                          Lançamentos avulsos
                        </div>
                      </div>
                    </div>

                    {/* Sobra Limpa Total Result Box */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wider block">Resultado Líquido Sobra Limpa</span>
                        <span className="text-sm font-black tracking-tight text-rose-400 animate-pulse">
                          - R$ 248,97
                        </span>
                      </div>
                      <div className="text-right text-[8px] font-black uppercase text-slate-500 tracking-wider space-y-0.5">
                        <p>Equilíbrio: <span className="text-white">R$ 2.544,28</span></p>
                        <p>Ticket Médio: <span className="text-white">R$ 206,26</span></p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Daily break-even status indicator bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Equipartição Real: Ponto de Equilíbrio Diário vs Faturado
                    </span>
                  </div>
                  <div>
                    <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                      Abaixo do Equilíbrio
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-slate-900 p-2 rounded-xl">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block leading-none">Meta Diária (Break-Even)</span>
                    <span className="text-xs font-black text-white mt-1 block">R$ 508,86</span>
                    <span className="text-[7px] text-slate-500 block mt-0.5">Nivelamento financeiro por dia</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-rose-500/10">
                    <span className="text-[7.5px] font-bold text-rose-400 uppercase tracking-widest block leading-none">Faturado Hoje (Vendas)</span>
                    <span className="text-xs font-black text-rose-450 mt-1 block">
                      R$ 441,00
                    </span>
                    <span className="text-[7px] text-slate-500 block mt-0.5">Vendas acumuladas hoje</span>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-wider">
                    <span className="text-rose-450 font-black">
                      Metas e Sobra Operacional: Deficientes (-R$ 67,86 hoje)
                    </span>
                    <span className="text-slate-400 font-mono">
                      87%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-rose-500"
                      style={{ width: '87%' }}
                    />
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold leading-normal">
                    Sua meta mínima hoje é faturar mais R$ 67,86 para cobrir as obrigações diárias.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Modules & Feature Bento Grid Section */}
      <section className="py-20 bg-slate-950 border-y border-slate-850 px-6" id="solucoes">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-xs font-black text-brand-primary tracking-[0.2em] uppercase">Ecosystem Modular</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
              Módulos Completos, Uma Única Plataforma Inteligente
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-semibold">
              Elimine integrações confusas. O Kitchenflow AI dispõe de 15 módulos operacionais de elite que você ativa e assina conforme o tamanho do seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SYSTEM_MODULES.map((module) => (
              <div 
                key={module.id} 
                className="p-6 bg-slate-900 rounded-[1.8rem] border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300 group"
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${module.color} transition-all duration-300 group-hover:scale-105`}>
                    <module.icon size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white tracking-tight uppercase group-hover:text-brand-primary transition-colors">
                    {module.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {module.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-[8px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <span>Módulo SaaS Ativo</span>
                  <span className="text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10">Homologado</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artificial Intelligence Copilot Callout */}
      <section className="py-20 px-6 max-w-7xl mx-auto" id="recursos">
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-8 sm:p-12 md:p-16 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-brand-primary/10 blur-3xl -z-10 rounded-full" />
          
          <div className="max-w-2xl space-y-6">
            <span className="text-xs font-black text-brand-primary tracking-[0.2em] uppercase flex items-center gap-2">
              <Flame size={14} /> EXCLUSIVIDADE KITCHENFLOW
            </span>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
              Um Copiloto de Inteligência Artificial Decidindo com Você
            </h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              O Kitchenflow AI não guarda apenas dados: ele analisa, sugere heurísticas e aponta desvios comerciais. O sistema detecta se o CMV de um produto escalou além do aceitável, calcula as projeções de faturamento mensal e sugere ajustes automáticos de cardápio com base na demanda dos clientes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                  <Check size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Auditoria Automatizada de Dívidas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                  <Check size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Heurística Semanal de Lucro Líquido</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                  <Check size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Previsibilidade Inteligente de Compras</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                  <Check size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Análise de Desempenho de Garçons</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="py-20 bg-slate-950 border-t border-slate-850 px-6" id="precos">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-xs font-black text-brand-primary tracking-[0.2em] uppercase">Investimento Inteligente</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">
              Escolha o Plano Ideal para seu Negócio Prosperar
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto font-medium">
              Sem taxas ocultas, sem fidelidade obrigatória. Altere seu plano quando quiser para acompanhar o crescimento da sua rede.
            </p>

            {/* Toggle Switch */}
            <div className="inline-flex justify-center items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl pt-2">
              <button 
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  billingPeriod === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  billingPeriod === 'yearly' ? 'bg-brand-primary text-white shadow-lg shadow-orange-950/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Anual <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded text-[8px] border border-brand-primary/20">Economize 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-2 font-sans">
            {activePlans.map((plan) => {
              const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
              return (
                <div 
                  key={plan.id}
                  className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all ${
                    plan.isPopular 
                      ? 'bg-gradient-to-b from-slate-900 to-slate-900/60 border-brand-primary/50 shadow-xl shadow-orange-950/20 relative' 
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-800'
                  }`}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-primary text-white font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-primary/20 shadow-md">
                      Plano Recomendado
                    </span>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-white">{plan.name}</h4>
                      <div className={`p-2 rounded-xl ${plan.isPopular ? 'bg-brand-primary text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <plan.icon size={18} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold min-h-[40px]">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] uppercase font-black text-slate-500">R$</span>
                      <span className="text-4xl font-extrabold text-white tracking-tight transition-all duration-300">{price}</span>
                      <span className="text-[10px] text-slate-450 uppercase font-black">/mês Co-cobrado {billingPeriod === 'yearly' ? 'anualmente' : 'mensalmente'}</span>
                    </div>

                    <div className="border-t border-slate-800/80 pt-6 space-y-3.5">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <div className="w-5 h-5 rounded-md bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary mt-0.5">
                            <Check size={11} strokeWidth={3} />
                          </div>
                          <span className="text-slate-300 leading-normal">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <a 
                      href="#leads-section"
                      className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all block text-center cursor-pointer ${
                        plan.isPopular 
                          ? 'bg-brand-primary hover:bg-[#E03D0C] text-white shadow-xl shadow-orange-950/30' 
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                      }`}
                    >
                      Assinar {plan.name}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Customer Leads Capture Form - CORE SALES UTILLITY */}
      <section className="py-20 px-6 max-w-5xl mx-auto" id="leads-section">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 sm:p-12 md:p-16 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute left-1/3 top-0 w-80 h-80 bg-brand-primary/5 blur-3xl -z-10 rounded-full" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <span className="text-xs font-black text-brand-primary tracking-[0.2em] uppercase flex items-center gap-2">
                <MessageSquare size={14} /> FALE CONOSCO
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">
                Fale com um dos Nossos Especialistas de Venda
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-semibold">
                Preencha os dados e receba uma demonstração gratuita guiada do software, simulando o faturamento, CMV e processos do seu próprio restaurante. Sem compromisso de contrato prévio.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-brand-primary border border-slate-700/50">
                    <Phone size={14} />
                  </div>
                  <span>WhatsApp comercial expresso: de Seg a Sex das 8h às 21h</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-brand-primary border border-slate-700/50">
                    <Mail size={14} />
                  </div>
                  <span>Email: contato@kitchenflow.ai</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-brand-primary border border-slate-700/50">
                    <Shield size={14} />
                  </div>
                  <span>Amparo legal integral pela LGPD</span>
                </div>
              </div>
            </div>

            {/* Lead Form Block */}
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 shadow-inner">
              {submitSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-14 h-14 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-xl font-black text-white">Inscrição Efetuada com Sucesso!</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Parabéns, os dados do seu restaurante foram registrados e integrados em nossa base CRM. Um membro de nossa equipe comercial do Kitchenflow IA fará contato por telefone ou WhatsApp nas próximas horas.
                  </p>
                  <button 
                    onClick={() => setSubmitSuccess(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow"
                  >
                    Cadastrar Outro Restaurante
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Seu Nome Completo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500"><Users size={14} /></span>
                      <input 
                        type="text" 
                        required
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="Ex: Pedro Henrique"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs placeholder-slate-500 text-white focus:outline-none focus:border-brand-primary" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nome do seu Restaurante</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500"><Building size={14} /></span>
                      <input 
                        type="text" 
                        required
                        value={leadCompany}
                        onChange={(e) => setLeadCompany(e.target.value)}
                        placeholder="Ex: Pizzaria Forno Nobre"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs placeholder-slate-500 text-white focus:outline-none focus:border-brand-primary" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Endereço de E-mail</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500"><Mail size={14} /></span>
                      <input 
                        type="email" 
                        required
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="Ex: pedro@fornonobre.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs placeholder-slate-500 text-white focus:outline-none focus:border-brand-primary" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">WhatsApp / Celular com DDD</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500"><Phone size={14} /></span>
                      <input 
                        type="text" 
                        required
                        value={leadPhone}
                        onChange={handlePhoneChange}
                        placeholder="Ex: (11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs placeholder-slate-500 text-white focus:outline-none focus:border-brand-primary" 
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400">
                      {errorMessage}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3 bg-brand-primary hover:bg-[#E03D0C] disabled:bg-slate-850 disabled:text-slate-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-950/30 font-sans tracking-wide transition-all uppercase border-b-2 border-[#B82300] active:translate-y-[1px]"
                  >
                    {isSubmitting ? 'Cadastrando no CRM...' : 'Solicitar Demo Grátis'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 bg-slate-900/50 border-t border-slate-850 px-6" id="depoimentos">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black text-brand-primary tracking-[0.2em] uppercase">Depoimentos Reais</h2>
            <h3 className="text-3xl font-black text-white tracking-tighter">Quem Já Escalou com o Kitchenflow AI</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                "A transição das comandas de papel para o monitor KDS sincronizado reduziu o tempo de espera dos clientes por pratos de 40 para 22 minutos. A integração com o app de entregas foi o que mudou o patamar financeiro da nossa rede."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-brand-primary">
                  AM
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Alvaro M.</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Sócio Grelhados Central</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                "Usar o assistente financeiro do Kitchenflow para calcular o CMV tornou claro quais pratos de frutos do mar estavam consumindo nossa margem de lucro. No primeiro mês economizamos R$ 7.200 em compras erradas."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-brand-primary">
                  RM
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Regina M.</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Chef de Cozinha & Proprietária</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                "Os clientes adoram pedir por QR Code direto nas mesas. Os garçons focam em entregar as bebidas super rápido e em manter o salão impecável, enquanto o sistema envia todas as comissões transparentes no painel de equipe."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-brand-primary">
                  FB
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Fabiano B.</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Diretor de Operações de Rede</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solid Security Indicator */}
      <section className="py-12 bg-slate-950 border-t border-slate-850/60 text-center px-6">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
            <Lock size={18} />
          </div>
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Plataforma Certificada e Protegida</h4>
          <p className="text-[10px] text-slate-500 leading-normal font-sans font-semibold max-w-sm">
            Dispomos de criptografia ponta a ponta SSLv3, armazenamento em bancos isolados geograficamente e backups de vendas redundantes de hora em hora.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-12 px-6 border-t border-slate-850">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-center">
                <ChefHatLogo className="w-7 h-7 text-brand-primary" />
              </div>
              <span className="font-extrabold text-sm text-white tracking-tight">KitchenFlow AI</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans font-bold">
              Software de Gestão Operacional Modular, Inteligência de CMV, monitores KDS Integrados e aplicativo nativo corporativo de entregadores autônomos para restaurantes e franquias gastronômicas.
            </p>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-3">Módulos</h5>
            <ul className="space-y-2 text-[10px] font-bold">
              <li><a href="#solucoes" className="hover:text-brand-primary transition-colors">Monitor de Cozinha KDS</a></li>
              <li><a href="#solucoes" className="hover:text-brand-primary transition-colors">Cardápio por QR Code</a></li>
              <li><a href="#solucoes" className="hover:text-brand-primary transition-colors">Frota de Entregadores</a></li>
              <li><a href="#solucoes" className="hover:text-brand-primary transition-colors">Controle Financeiro AI</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-3">Tecnologia</h5>
            <ul className="space-y-2 text-[10px] font-bold">
              <li><a href="#recursos" className="hover:text-brand-primary transition-colors">Copiloto Integrado</a></li>
              <li><a href="#recursos" className="hover:text-brand-primary transition-colors">Audit Logs Seguros</a></li>
              <li><a href="#recursos" className="hover:text-brand-primary transition-colors">Armazenamento Firestore</a></li>
              <li><a href="https://vite.dev" target="_blank" rel="noreferrer" className="hover:text-brand-primary transition-colors">Vite + React SPA Engine</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-3">Contato</h5>
            <p className="text-[10px] font-bold">
              São Paulo, Brasil<br />
              Email: suporte@kitchenflow.ai<br />
              Atendimento Comercial: sac@kitchenflow.ai
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-850 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[9px] font-semibold text-slate-600 gap-4">
          <span>© 2026 Kitchenflow AI Ltda. Todos os direitos reservados. CNPJ: 45.980.201/0001-92</span>
          <div className="flex gap-4">
            <a href="#solucoes" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
            <a href="#solucoes" className="hover:text-slate-400 transition-colors">Privacidade Regulamentada</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
