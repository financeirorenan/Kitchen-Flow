import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  Phone, 
  Mail, 
  DollarSign, 
  Flame, 
  Activity, 
  Award, 
  Lock,
  BarChart2,
  Layers,
  Package,
  AlertTriangle,
  Zap,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  Eye,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import KaiAvatar from './KaiAvatar';

// Fotografias profissionais geradas via IA
import chefImage from '../src/assets/images/chef_modern_kitchen_1783212349047.jpg';
import managerImage from '../src/assets/images/manager_analyzing_tablet_1783212361726.jpg';
import waiterImage from '../src/assets/images/waiter_digital_order_1783255865002.jpg';
import interiorImage from '../src/assets/images/modern_restaurant_interior_1783255877535.jpg';

// Máscara de Telefone para o Brasil
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

const ChefHatLogo = ({ className = "w-6 h-6 text-[#FF4F18]" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M26 56 C16 56, 12 42, 22 34 C16 19, 32 6, 44 12 C52 0, 72 2, 76 18 C88 12, 94 28, 84 38 C90 49, 80 56, 72 56"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M29 56 V66 C29 69, 33 71, 41 71 H71 C79 71, 83 66, 83 66 V56"
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
    description: 'Gestão ideal para novos cafés, lanchonetes ou operações individuais buscando estabilidade.',
    priceMonthly: 149,
    priceYearly: 119,
    icon: Smartphone,
    isPopular: false,
    features: [
      'Operação de Vendas Ultra-Rápida (PDV)',
      'Gestão de Mesas & Comandas Básicas',
      'Controle de Caixa e Fluxo de Entrada',
      'Fichas Técnicas & Baixa por Ingrediente',
      'Até 3 usuários simultâneos',
      'Suporte prioritário por E-mail'
    ]
  },
  {
    id: 'pro-ai',
    name: 'Professional AI',
    description: 'A solução definitiva de alta performance para restaurantes em crescimento, integrando IA ao salão.',
    priceMonthly: 299,
    priceYearly: 239,
    icon: Sparkles,
    isPopular: true,
    features: [
      'Tudo do Plano Essential',
      'Copiloto de IA para Auditoria de CMV',
      'Monitor Eletrônico de Cozinha (KDS)',
      'Cardápio Digital por QR Code Autônomo',
      'Relatórios Preditivos de Sobra Limpa',
      'Até 10 usuários simultâneos',
      'Suporte Premium via WhatsApp'
    ]
  },
  {
    id: 'elite',
    name: 'Elite Enterprise',
    description: 'Arquitetura premium multi-filial para redes de franquias e operações de altíssimo volume.',
    priceMonthly: 599,
    priceYearly: 479,
    icon: Award,
    isPopular: false,
    features: [
      'Tudo do Plano Professional AI',
      'Emissão Fiscal Integrada (NFC-e/NF-e)',
      'App Corporativo p/ Entregadores Próprios',
      'Múltiplas Filiais & Painel de Redes',
      'Suporte Exclusivo 24h com Gerente dedicado',
      'Pedidos Mensais Ilimitados'
    ]
  }
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

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // -----------------------------------------------------------------
  // STAGE 1: STATES DO DASHBOARD VIVO (REAL-TIME MULTI-TAB SIMULATOR)
  // -----------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'dre' | 'kds' | 'menu' | 'ai'>('dre');
  const [liveFaturamento, setLiveFaturamento] = useState(4820);
  const [liveCmv, setLiveCmv] = useState(24.5);
  const [liveOrders, setLiveOrders] = useState([
    { id: '#1542', items: '1x Parmegiana de carne + 1x Refrigerante Lata', source: 'Mesa 08', status: 'preparando', time: 275 },
    { id: '#1543', items: '2x X-tudo + 1x Batata frita', source: 'Delivery', status: 'pendente', time: 75 },
    { id: '#1541', items: '1x Parmegiana de frango + 1x Suco Natural copo', source: 'Mesa 03', status: 'pronto', time: 660 },
  ]);

  const [liveAiInsights, setLiveAiInsights] = useState<string[]>([
    "✨ IA do Kai: Analisando as vendas em tempo real do Viva Lá Fome...",
    "✨ CMV Crítico: Custo da Carne Bovina subiu 8.5% no distribuidor principal",
    "✨ Ajuste Sugerido: Ajustar ficha técnica da Parmegiana de carne economiza R$ 3.20/prato",
    "✨ Alerta de Estoque: Batata In Natura está operando abaixo da margem mínima de segurança",
    "✨ Sucesso Operacional: Sobra Limpa real de hoje atingiu a meta de 24.5% às 19:30"
  ]);
  const [aiInsightIndex, setAiInsightIndex] = useState(0);

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'kai'; text: string; pose?: string; expression?: string }>>([
    {
      sender: 'kai',
      text: 'Olá lojista do Viva Lá Fome! Sou o Kai, seu Copiloto de IA em tempo real. Fiz uma auditoria instantânea do faturamento e identifiquei desvios operacionais. O que gostaria de analisar agora de forma inteligente? 🤖💡',
      pose: 'tudo-sob-controle',
      expression: 'feliz'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Recharts simulation data
  const mockWeeklySales = [
    { name: 'Seg', faturamento: 3200 },
    { name: 'Ter', faturamento: 4100 },
    { name: 'Qua', faturamento: 3800 },
    { name: 'Qui', faturamento: 5200 },
    { name: 'Sex', faturamento: 6800 },
    { name: 'Sáb', faturamento: 8400 },
    { name: 'Dom', faturamento: 7900 }
  ];

  // Helper to format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // KDS action handlers
  const handleKdsStatusChange = (id: string, currentStatus: string) => {
    setLiveOrders(prev => {
      if (currentStatus === 'pendente') {
        return prev.map(o => o.id === id ? { ...o, status: 'preparando' } : o);
      } else if (currentStatus === 'preparando') {
        return prev.map(o => o.id === id ? { ...o, status: 'pronto', time: 690 } : o);
      } else {
        // Remove 'pronto'
        return prev.filter(o => o.id !== id);
      }
    });
  };

  // Simulates a menu item click and sending order to KDS
  const handleSimulateMenuOrder = (itemName: string) => {
    const nextId = `#15${Math.floor(Math.random() * 80) + 44}`;
    const newOrder = {
      id: nextId,
      items: `1x ${itemName}`,
      source: `Mesa ${Math.floor(Math.random() * 11) + 1}`,
      status: 'pendente',
      time: 0
    };
    
    // Add to orders
    setLiveOrders(prev => [newOrder, ...prev]);
    
    // Switch to KDS tab automatically to show the user the live flow!
    setActiveTab('kds');
  };

  // AI Chat options click
  const handleAiQuestion = (question: string, answer: string, pose: string, expression: string) => {
    if (isTyping) return;
    
    setChatMessages(prev => [...prev, { sender: 'user', text: question }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: 'kai',
        text: answer,
        pose,
        expression
      }]);
      setIsTyping(false);
    }, 1500);
  };

  // Active ticking intervals
  useEffect(() => {
    // 1. Faturamento and CMV updates every 3.5 seconds
    const metricsInterval = setInterval(() => {
      setLiveFaturamento(prev => prev + Math.floor(Math.random() * 85) + 15);
      setLiveCmv(prev => {
        const delta = (Math.random() - 0.5) * 0.2;
        const next = prev + delta;
        return next < 23.5 ? 23.5 : next > 25.5 ? 25.5 : parseFloat(next.toFixed(1));
      });
      setAiInsightIndex(prev => (prev + 1) % 5); // 5 insights
    }, 3500);

    // 2. KDS timer increments every second
    const kdsTimerInterval = setInterval(() => {
      setLiveOrders(prev => prev.map(o => o.status !== 'pronto' ? { ...o, time: o.time + 1 } : o));
    }, 1000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(kdsTimerInterval);
    };
  }, []);

  // -----------------------------------------------------------------
  // STAGE 2: STATES DO SIMULADOR DE VÍDEO (30-SECOND FLOW ACTION)
  // -----------------------------------------------------------------
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoStep, setVideoStep] = useState(0); // 0 a 5
  const [videoProgress, setVideoProgress] = useState(0); // 0 a 100%
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const videoStepsData = [
    {
      title: "1. Pedido do Viva Lá Fome",
      desc: "O cliente faz o pedido no cardápio digital (Mesa 08 ou Delivery). O pedido cai instantaneamente no PDV consolidado.",
      badge: "Entrada Sincronizada",
      color: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
      textColor: "text-orange-400"
    },
    {
      title: "2. Cozinha KDS Ativa",
      desc: "A cozinha do Viva Lá Fome recebe o pedido na tela do KDS, dividido por setores (Chapa, Fritura) com cronômetro de preparo ativo.",
      badge: "Linha de Produção",
      color: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
      textColor: "text-amber-400"
    },
    {
      title: "3. Garçom Notificado",
      desc: "A cozinha marca a Parmegiana de carne como pronta. O garçom do salão recebe um alerta vibratório na comanda digital para retirar.",
      badge: "Tempo sob controle",
      color: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
      textColor: "text-yellow-400"
    },
    {
      title: "4. Baixa Automática",
      desc: "A ficha técnica do prato é lida: Arroz agulhinha (-150g), Queijo Muçarela (-40g) e Bife Bovino (-200g) sofrem baixa automática no estoque.",
      badge: "Desperdício Zero",
      color: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
      textColor: "text-rose-400"
    },
    {
      title: "5. DRE Consolidado",
      desc: "A receita de R$ 30,00 é lançada no fluxo de caixa do Viva Lá Fome, atualizando as taxas de meios de pagamento e o lucro proporcional.",
      badge: "Controle Absoluto",
      color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
      textColor: "text-emerald-450"
    },
    {
      title: "6. Kai IA Otimizando",
      desc: "Nossa IA analisa as margens de lucro, sugere compras inteligentes e otimiza a ficha técnica do Viva Lá Fome em tempo real.",
      badge: "Sobra Limpa Máxima",
      color: "from-teal-500/20 to-teal-500/5 border-teal-500/30",
      textColor: "text-teal-400"
    }
  ];

  // Efeito do timer do Simulador de Vídeo
  useEffect(() => {
    let timer: any;
    if (videoPlaying) {
      timer = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            // Cicla para o próximo passo
            setVideoStep(s => (s + 1) % 6);
            return 0;
          }
          return prev + 2; // velocidade do progresso
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [videoPlaying]);

  // Atualização em tempo real dos planos vindos do Firebase se cadastrados
  useEffect(() => {
    const q = query(collection(db, 'plans'), orderBy('price', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const loadedPlans = snapshot.docs.map(doc => {
          const data = doc.data();
          const price = Number(data.price) || 0;
          const billingCycle = data.billingCycle || 'monthly';
          
          let priceMonthly = price;
          let priceYearly = Math.round(price * 0.8);
          
          if (billingCycle === 'yearly') {
            priceMonthly = Math.round(price / 12);
            priceYearly = price;
          }

          const dynamicFeatures: string[] = [];
          if (data.features && Array.isArray(data.features)) {
            dynamicFeatures.push(...data.features);
          } else {
            dynamicFeatures.push('Acesso operacional imediato');
            dynamicFeatures.push('Controle de caixa e faturamento');
            dynamicFeatures.push('Integração de módulos nativos');
          }

          let planIcon = Smartphone;
          if (priceMonthly > 350) planIcon = Award;
          else if (priceMonthly >= 180) planIcon = Sparkles;

          return {
            id: doc.id,
            name: data.name || 'Sem Nome',
            description: data.description || 'Sem descrição cadastrada.',
            priceMonthly,
            priceYearly,
            icon: planIcon,
            isPopular: false,
            features: dynamicFeatures
          };
        });

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
      console.error("Error loading plans:", error);
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
        source: 'Landing Page Pública',
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
    <div className="w-full h-screen overflow-y-auto scroll-smooth bg-[#06080e] text-slate-200 font-sans selection:bg-[#FF4F18] selection:text-white relative" id="public-website">
      
      {/* Luzes de ambiente sutis */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FF4F18]/5 rounded-full blur-[130px] pointer-events-none -z-20" />
      <div className="absolute top-[30vh] right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none -z-20" />
      <div className="absolute top-[120vh] left-10 w-[500px] h-[500px] bg-orange-500/[0.03] rounded-full blur-[150px] pointer-events-none -z-20" />

      {/* Header / Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#06080e]/85 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#FF4F18]/25 to-[#FF4F18]/10 border border-[#FF4F18]/20 rounded-xl flex items-center justify-center shadow-lg shadow-[#FF4F18]/10">
              <ChefHatLogo className="w-6 h-6 text-[#FF4F18]" />
            </div>
            <div>
              <span className="font-sans font-extrabold text-lg tracking-tight text-white">KitchenFlow</span>
              <span className="text-[10px] font-black text-[#FF4F18] ml-1.5 bg-[#FF4F18]/10 px-2 py-0.5 rounded border border-[#FF4F18]/20 uppercase tracking-widest">AI</span>
            </div>
          </div>

          {/* Links Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#operacao-conectada" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">Módulos</a>
            <a href="#video-acao" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">Como Funciona</a>
            <a href="#beneficios" className="text-xs font-semibold text-slate-400 hover:text-[#FF4F18] transition-colors uppercase tracking-wider flex items-center gap-1">Resultados <Sparkles size={11} className="text-[#FF4F18]" /></a>
            <a href="#humanizacao" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">A Operação</a>
            <a href="#precos" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">Preços</a>
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/saas" 
              className="text-xs font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-colors"
            >
              Fazer Login
            </Link>
            <a 
              href="#leads-section" 
              className="px-5 py-3 bg-[#FF4F18] hover:bg-[#ff3b00] text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-white/10 hover:shadow-lg hover:shadow-[#FF4F18]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Agendar Demonstração
            </a>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-[#06080e]/95 backdrop-blur-lg overflow-hidden py-6 px-6 space-y-4"
            >
              <div className="flex flex-col gap-4">
                <a href="#operacao-conectada" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Módulos</a>
                <a href="#video-acao" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Como Funciona</a>
                <a href="#beneficios" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 hover:text-[#FF4F18] transition-colors">Resultados</a>
                <a href="#humanizacao" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">A Operação</a>
                <a href="#precos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Planos</a>
              </div>
              <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                <Link 
                  to="/saas" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-3 bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase"
                >
                  Fazer Login
                </Link>
                <a 
                  href="#leads-section" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-3 bg-[#FF4F18] text-white hover:bg-brand-primary/95 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Criar Conta Grátis
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center relative" id="hero">
        
        {/* Left Column: Copy & CTAs */}
        <div className="lg:col-span-5 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-mono text-orange-450 uppercase tracking-widest">
            <Sparkles size={11} className="text-[#FF4F18] animate-pulse" /> Copiloto Operacional Ativo
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-sans font-black text-white tracking-tight leading-[1.08]">
            Menos Caos.<br />
            Mais Lucro.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4F18] via-orange-400 to-amber-300">
              Tudo em um único sistema inteligente.
            </span>
          </h1>
          
          <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-lg">
            O primeiro Copiloto Operacional inteligente que administra o seu restaurante com você. Integre PDV, KDS, estoque, delivery e financeiro com auditoria contínua de IA em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <a 
              href="#leads-section" 
              className="px-7 py-4 bg-[#FF4F18] hover:bg-[#ff3b00] text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-[#FF4F18]/15 flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              Criar Conta Grátis <ArrowRight size={13} />
            </a>
            <a 
              href="#video-acao" 
              className="px-7 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest border border-white/5 shadow-md transition-all duration-300 flex items-center justify-center gap-2"
            >
              Ver Como Funciona <Play size={12} className="fill-current text-slate-400" />
            </a>
          </div>

          {/* Quick benefits */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-mono uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> Sem Fidelidade</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> Teste Grátis de 14 dias</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> Fisco & LGPD Homologados</span>
          </div>

          {/* Social Claims */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/5">
            <div>
              <p className="text-2xl font-black text-white tracking-tight">8.4%</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Redução Média de CMV</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight">+14h</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Economizadas p/ Semana</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight">24h</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Monitoramento de IA</p>
            </div>
          </div>
        </div>

        {/* Right Column: Dashboard Vivo (Real-Time Animated Interface) */}
        <div className="lg:col-span-7 mt-12 lg:mt-0 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4F18]/15 via-emerald-500/5 to-transparent blur-3xl -z-10" />
          
          <div className="bg-[#0b0f19]/90 border border-white/5 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            {/* Window header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-950/60 px-3 py-1 rounded-full border border-white/5 ml-2">
                  kitchenflow.ai/realtime-dashboard
                </span>
              </div>
              
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[8px] text-emerald-450 font-mono uppercase font-black tracking-widest">LIVE SIMULATOR</span>
              </div>
            </div>

            {/* Tab Selector buttons */}
            <div className="flex flex-wrap gap-2 pb-4 mb-4 border-b border-white/5 scrollbar-thin overflow-x-auto">
              <button
                onClick={() => setActiveTab('dre')}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'dre'
                    ? 'bg-[#FF4F18] text-white shadow-lg shadow-[#FF4F18]/25'
                    : 'bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900 border border-white/5'
                }`}
                id="tab-dre-selector"
              >
                <BarChart2 size={13} /> Painel DRE
              </button>
              <button
                onClick={() => setActiveTab('kds')}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'kds'
                    ? 'bg-[#FF4F18] text-white shadow-lg shadow-[#FF4F18]/25'
                    : 'bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900 border border-white/5'
                }`}
                id="tab-kds-selector"
              >
                <Trello size={13} /> Cozinha KDS
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'menu'
                    ? 'bg-[#FF4F18] text-white shadow-lg shadow-[#FF4F18]/25'
                    : 'bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900 border border-white/5'
                }`}
                id="tab-menu-selector"
              >
                <Smartphone size={13} /> Cardápio QR
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'ai'
                    ? 'bg-[#FF4F18] text-white shadow-lg shadow-[#FF4F18]/25'
                    : 'bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900 border border-white/5'
                }`}
                id="tab-ai-selector"
              >
                <Sparkles size={13} /> Copiloto IA
              </button>
            </div>

            {/* Simulated Multi-Tab Content */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {activeTab === 'dre' && (
                  <motion.div
                    key="dre-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                    id="panel-dre-content"
                  >
                    {/* Top KPIs row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 relative overflow-hidden" id="dre-kpi-sales">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Faturamento Hoje</p>
                        <h4 className="text-base sm:text-lg font-black text-white mt-1 font-mono tracking-tight">
                          R$ {liveFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                        <span className="text-[8px] text-emerald-450 font-mono block mt-1">+24.5% vs ontem</span>
                      </div>

                      <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 relative overflow-hidden" id="dre-kpi-cmv">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">CMV Real-Time</p>
                        <h4 className="text-base sm:text-lg font-black text-orange-400 mt-1 font-mono tracking-tight">
                          {liveCmv}%
                        </h4>
                        <span className="text-[8px] text-slate-500 font-mono block mt-1">Meta: 22.0%</span>
                      </div>

                      <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/5 relative overflow-hidden" id="dre-kpi-profit">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Sobra Limpa (Líquido)</p>
                        <h4 className="text-base sm:text-lg font-black text-emerald-400 mt-1 font-mono tracking-tight">
                          R$ {Math.round(liveFaturamento * 0.245).toLocaleString('pt-BR')}
                        </h4>
                        <span className="text-[8px] text-emerald-450 font-mono block mt-1">Margem: 24.5%</span>
                      </div>
                    </div>

                    {/* Channel mix and chart column */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Recharts Sales Performance area chart */}
                      <div className="md:col-span-8 bg-slate-950/80 p-4 rounded-2xl border border-white/5" id="dre-performance-chart">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-3">Faturamento últimos 7 dias (R$)</p>
                        <div className="h-40 w-full font-mono text-[9px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockWeeklySales} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FF4F18" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#FF4F18" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="name" stroke="#52525b" strokeWidth={0.5} tickLine={false} />
                              <YAxis stroke="#52525b" strokeWidth={0.5} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 10 }} />
                              <Area type="monotone" dataKey="faturamento" stroke="#FF4F18" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Faturamento por Canal card */}
                      <div className="md:col-span-4 bg-slate-950/80 p-4 rounded-2xl border border-white/5 flex flex-col justify-between" id="dre-channels-card">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-2">Canais de Venda</p>
                        <div className="space-y-1.5 text-[9px]">
                          {[
                            { name: 'Salão (Mesa)', val: '40%', color: 'bg-orange-500' },
                            { name: 'Delivery', val: '25%', color: 'bg-emerald-500' },
                            { name: 'iFood App', val: '20%', color: 'bg-rose-500' },
                            { name: 'QR Code Mesa', val: '10%', color: 'bg-teal-500' },
                            { name: 'Balcão/PDV', val: '5%', color: 'bg-sky-500' },
                          ].map((ch, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className={`w-1.5 h-1.5 rounded-full ${ch.color}`} />
                                <span>{ch.name}</span>
                              </div>
                              <span className="font-bold text-white font-mono">{ch.val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-white/5 pt-2 mt-2">
                          <div className="text-[8px] font-mono uppercase text-slate-500 leading-none">
                            Auditoria ativa • Viva Lá Fome
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic AI advice preview snippet */}
                    <div className="bg-[#FF4F18]/5 border border-[#FF4F18]/10 p-3 rounded-xl flex items-center justify-between text-xs" id="dre-ai-alert">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-[#FF4F18] animate-pulse shrink-0" />
                        <span className="text-orange-250 font-semibold text-[10px] leading-snug">
                          {liveAiInsights[aiInsightIndex]}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('ai')}
                        className="text-[8px] bg-[#FF4F18]/10 text-[#FF4F18] border border-[#FF4F18]/20 px-2 py-1 rounded hover:bg-[#FF4F18]/20 transition-all font-mono uppercase font-black tracking-widest shrink-0 ml-2"
                      >
                        Perguntar
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'kds' && (
                  <motion.div
                    key="kds-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                    id="panel-kds-content"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500">Fila KDS ativa • Cozinha Quente</p>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase font-black tracking-wider">
                        Sincronizado via PDV
                      </span>
                    </div>

                    {liveOrders.length === 0 ? (
                      <div className="bg-slate-950/80 p-8 rounded-2xl border border-white/5 text-center text-xs text-slate-500 font-medium" id="kds-empty-state">
                        🍳 Nenhum pedido pendente na cozinha! Simule um no cardápio digital.
                        <button
                          onClick={() => setActiveTab('menu')}
                          className="block mx-auto mt-3 px-4 py-2 bg-[#FF4F18] hover:bg-[#ff3b00] text-white rounded-xl text-[10px] font-mono uppercase tracking-wider font-black transition-all"
                        >
                          Ir para Cardápio QR
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="kds-orders-grid">
                        <AnimatePresence initial={false}>
                          {liveOrders.map((order) => (
                            <motion.div
                              key={order.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`bg-slate-950/80 p-3 rounded-xl border flex flex-col justify-between h-40 text-xs transition-all ${
                                order.status === 'pendente' ? 'border-orange-500/30 shadow-md shadow-orange-500/5' :
                                order.status === 'preparando' ? 'border-amber-500/30 shadow-md shadow-amber-500/5' :
                                'border-emerald-500/30'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2">
                                  <span className="font-mono text-[10px] text-slate-500 font-bold">{order.id}</span>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-black tracking-widest ${
                                    order.status === 'pendente' ? 'bg-orange-500/15 text-orange-400' :
                                    order.status === 'preparando' ? 'bg-amber-500/15 text-amber-400' :
                                    'bg-emerald-500/15 text-emerald-450'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>

                                <p className="text-white font-extrabold text-[10px] sm:text-[11px] leading-tight line-clamp-2">{order.items}</p>
                                <span className="text-[10px] text-slate-500 font-medium block mt-1">{order.source}</span>
                              </div>

                              <div className="border-t border-white/5 pt-2 mt-2 flex items-center justify-between">
                                <span className="font-mono text-[9px] text-slate-450 font-bold flex items-center gap-1">
                                  <Clock size={10} className={order.status !== 'pronto' ? 'animate-pulse text-[#FF4F18]' : ''} />
                                  {formatTime(order.time)}
                                </span>
                                
                                <button
                                  onClick={() => handleKdsStatusChange(order.id, order.status)}
                                  className={`px-2 py-1 rounded text-[8px] font-mono uppercase font-black tracking-widest transition-all ${
                                    order.status === 'pendente' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20' :
                                    order.status === 'preparando' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' :
                                    'bg-slate-900 text-slate-500 border border-white/5 hover:bg-slate-800'
                                  }`}
                                >
                                  {order.status === 'pendente' ? 'Iniciar' : order.status === 'preparando' ? 'Pronto' : 'Entregar'}
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'menu' && (
                  <motion.div
                    key="menu-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col md:flex-row items-center gap-6"
                    id="panel-menu-content"
                  >
                    {/* Left QR Code prompt mockup */}
                    <div className="md:w-1/3 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-white/5 text-center space-y-2">
                      <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 100 100" className="w-20 h-20 text-slate-900">
                          <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                          <rect x="10" y="10" width="10" height="10" fill="white" />
                          <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                          <rect x="80" y="10" width="10" height="10" fill="white" />
                          <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                          <rect x="10" y="80" width="10" height="10" fill="white" />
                          <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                          <rect x="45" y="45" width="10" height="10" fill="white" />
                          <rect x="40" y="10" width="10" height="15" fill="currentColor" />
                          <rect x="10" y="40" width="15" height="10" fill="currentColor" />
                          <rect x="75" y="45" width="15" height="15" fill="currentColor" />
                          <rect x="45" y="75" width="15" height="15" fill="currentColor" />
                        </svg>
                      </div>
                      <span className="text-[9px] font-mono uppercase text-slate-450 font-bold">QR Code Mesa 08</span>
                      <p className="text-[10px] text-slate-500 leading-snug">Aponte o celular e simule o autoatendimento: o pedido entra na cozinha na hora!</p>
                    </div>

                    {/* Right products menu list mockup */}
                    <div className="md:w-2/3 bg-slate-950/80 p-4 rounded-2xl border border-white/5 w-full">
                      <p className="text-[8px] font-mono uppercase tracking-wider text-slate-500 mb-3 text-left">Cardápio Digital • Viva Lá Fome</p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {[
                          { name: 'Parmegiana de carne', price: '30,00', desc: 'Bife bovino empanado, molho pomodoro rústico e muçarela gratinada. Acompanha arroz e fritas.' },
                          { name: 'X-tudo Gourmet', price: '31,00', desc: 'Hambúrguer de fraldinha 180g, bacon, ovo frito, muçarela, alface e tomate.' },
                          { name: 'Bolinha de queijo', price: '20,00', desc: 'Porção crocante com 8 unidades de pura muçarela com cream cheese.' },
                          { name: 'Refrigerante Lata', price: '6,00', desc: 'Lata 350ml trincando de gelada.' },
                        ].map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-[#0e1423] rounded-xl border border-white/5 flex items-start justify-between text-left gap-3 group hover:border-[#FF4F18]/20 transition-all">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-[11px] text-white leading-none uppercase tracking-wide">{item.name}</h5>
                                <span className="text-[10px] font-bold text-orange-450 font-mono">R$ {item.price}</span>
                              </div>
                              <p className="text-[9px] text-slate-450 leading-tight font-medium line-clamp-2">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handleSimulateMenuOrder(item.name)}
                              className="px-2 py-1.5 bg-[#FF4F18] hover:bg-[#ff3b00] text-white rounded-lg text-[9px] font-mono uppercase font-black shrink-0 tracking-widest hover:scale-105 active:scale-95 transition-all"
                            >
                              Pedir
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'ai' && (
                  <motion.div
                    key="ai-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[280px]"
                    id="panel-ai-content"
                  >
                    {/* Left Column: Animated Kai Avatar */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-white/5 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-20 h-20 bg-[#FF4F18]/5 rounded-full blur-xl" />
                      
                      {/* Animated Kai Avatar with current expression/pose */}
                      <div className="w-28 h-28 flex items-center justify-center scale-110">
                        <KaiAvatar 
                          expression={isTyping ? 'analisando' : (chatMessages[chatMessages.length - 1]?.expression as any || 'feliz')}
                          pose={isTyping ? 'analisando-dados' : (chatMessages[chatMessages.length - 1]?.pose as any || 'tudo-sob-controle')}
                          size={110} 
                        />
                      </div>
                      
                      <span className="text-[10px] font-sans font-extrabold text-white uppercase tracking-wider mt-2">Kai Copiloto AI</span>
                      <span className="text-[8px] font-mono text-emerald-400 uppercase font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mt-1 animate-pulse">
                        Ativo & Monitorando
                      </span>
                    </div>

                    {/* Right Column: Chat messages feed */}
                    <div className="md:col-span-8 flex flex-col justify-between bg-slate-950/80 p-4 rounded-2xl border border-white/5 h-full relative overflow-hidden">
                      {/* Message Feed list */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs max-h-32 scrollbar-thin">
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-[#FF4F18] text-white font-semibold rounded-br-none text-[10px]'
                                : 'bg-[#0e1423] border border-white/5 text-orange-200 rounded-bl-none text-[10px] font-medium'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="bg-[#0e1423] border border-white/5 text-slate-400 p-2.5 rounded-xl rounded-bl-none text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-[#FF4F18] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-[#FF4F18] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-[#FF4F18] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="text-[9px] font-mono ml-1 uppercase">Kai pensando...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pre-set strategic query buttons */}
                      <div className="border-t border-white/5 pt-2.5 mt-2.5 flex flex-col gap-2">
                        <p className="text-[8px] font-mono uppercase text-slate-500 text-left">Selecione uma dúvida para a IA rodar no Viva Lá Fome:</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            disabled={isTyping}
                            onClick={() => handleAiQuestion(
                              "Como reduzir meu CMV de carne?",
                              "No Viva Lá Fome, a Parmegiana de carne opera com custo de ingrediente de R$ 14,00. Reduzindo a gramatura do bife de 220g para 200g (padrão) e fracionando a muçarela em 40g, reduzimos o CMV de 46% para 33%, injetando +R$ 3,90 de lucro líquido por prato vendido!",
                              "planejamento",
                              "feliz"
                            )}
                            className="px-2 py-1.5 bg-[#0e1423] hover:bg-[#FF4F18]/10 text-slate-300 hover:text-white border border-white/5 rounded-lg text-[9px] text-left transition-all font-semibold"
                          >
                            🥩 CMV Carne Bov.
                          </button>
                          <button
                            disabled={isTyping}
                            onClick={() => handleAiQuestion(
                              "Verificar estoques críticos",
                              "Atenção! O estoque de Batata In Natura do Viva Lá Fome está operando com apenas 12kg (abaixo do mínimo de 20kg). O consumo estimado para o final de semana é de 45kg. Ordem de compra sugerida imediata com a Distribuidora Horti.",
                              "controle-estoque",
                              "alerta"
                            )}
                            className="px-2 py-1.5 bg-[#0e1423] hover:bg-[#FF4F18]/10 text-slate-300 hover:text-white border border-white/5 rounded-lg text-[9px] text-left transition-all font-semibold"
                          >
                            📦 Estoque Crítico
                          </button>
                          <button
                            disabled={isTyping}
                            onClick={() => handleAiQuestion(
                              "Sugerir combo de margem alta",
                              "Dica de ouro para o Viva Lá Fome: Monte o Combo Família - 2x Parmegiana de frango (CMV 39%) + 1x Bolinha de queijo (CMV 40%) + 1x Refrigerante 2L (CMV 46%). Preço sugerido: R$ 89,00. Margem de lucro de 62.5% protegida!",
                              "tudo-sob-controle",
                              "surpreso"
                            )}
                            className="px-2 py-1.5 bg-[#0e1423] hover:bg-[#FF4F18]/10 text-[#FF4F18] border border-[#FF4F18]/10 rounded-lg text-[9px] text-left transition-all font-semibold"
                          >
                            💡 Criar Combo AI
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>

      {/* STAGE 3: "Veja o KitchenFlow AI em ação" (Demonstrative Video Player) */}
      <section className="py-20 border-t border-white/5 bg-[#030509]" id="video-acao">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase">Veja o KitchenFlow AI em ação</span>
            <h3 className="text-3xl sm:text-4xl font-sans font-black text-white tracking-tight leading-none">
              Como funciona o fluxo inteligente?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Acompanhe a jornada completa de uma venda em nosso ecossistema e entenda por que KitchenFlow AI vai além de um simples software de gestão.
            </p>
          </div>

          {/* Simulated 30s HTML5 Video Player Frame */}
          <div className="bg-[#0b0f19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            
            {/* Fake browser head with buttons */}
            <div className="bg-[#04060c] px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
                <span className="text-xs text-slate-400 font-semibold tracking-wide ml-3">
                  Demonstração Operacional (30 segundos)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-[#FF4F18]/10 text-[#FF4F18] px-2 py-0.5 rounded font-mono uppercase font-black">
                  Passo {videoStep + 1} de 6
                </span>
              </div>
            </div>

            {/* Video Canvas screen */}
            <div className="aspect-video w-full bg-[#04060c] relative flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
              
              {/* Pulsing light effects inside the video depending on the step */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent to-transparent opacity-30 pointer-events-none" />
              
              {/* Interactive Player Screen depending on current video step */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={videoStep}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full flex flex-col justify-between relative z-10"
                >
                  {/* Step visual header badge */}
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono uppercase bg-slate-900 border border-white/10 text-slate-400 px-3 py-1 rounded-full">
                      {videoStepsData[videoStep].badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      00:{(videoStep * 5 + Math.floor((videoProgress / 100) * 5)).toString().padStart(2, '0')} / 00:30
                    </span>
                  </div>

                  {/* STEP SPECIFIC VISUAL GRAPHICS */}
                  <div className="my-auto py-6 flex flex-col items-center text-center space-y-6">
                    
                    {/* Visual Animation for step 1 (Pedido Entrando) */}
                    {videoStep === 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center text-orange-400 animate-bounce">
                            <Smartphone size={32} />
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono space-y-1 text-left">
                          <p className="text-emerald-450">✔ Leitura QR Code Mesa 4</p>
                          <p className="text-white">📥 Pedido #8916 enviado direto!</p>
                          <p className="text-slate-400 mt-1">1x Risoto Funghi Gourmet • R$ 48,00</p>
                        </div>
                      </div>
                    )}

                    {/* Visual Animation for step 2 (KDS Recebendo) */}
                    {videoStep === 1 && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
                            <Trello size={32} className="animate-pulse" />
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono text-left">
                          <p className="text-amber-400">🔥 Monitor de Cozinha KDS</p>
                          <p className="text-white">Pedido #8916 recebido na Cozinha Quente</p>
                          <p className="text-slate-500 text-[10px] mt-1">Cronômetro de preparo iniciado...</p>
                        </div>
                      </div>
                    )}

                    {/* Visual Animation for step 3 (Cozinha Preparando) */}
                    {videoStep === 2 && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
                            <CheckCircle2 size={32} className="animate-spin-slow" />
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono text-left">
                          <p className="text-yellow-400">✔ Cozinha marcou como: PRONTO</p>
                          <p className="text-white">Garçom acionado via Comanda Digital</p>
                          <p className="text-emerald-450 mt-1">✔ Tempo de preparo: 12m (abaixo da média)</p>
                        </div>
                      </div>
                    )}

                    {/* Visual Animation for step 4 (Estoque Diminuindo) */}
                    {videoStep === 3 && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-400">
                            <Package size={32} />
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono text-left space-y-1">
                          <p className="text-rose-400">📦 Baixa automática por Ficha Técnica</p>
                          <p className="text-white">Arroz Arbóreo: <span className="text-rose-400">-150g</span></p>
                          <p className="text-white">Queijo Parmesão: <span className="text-rose-400">-40g</span></p>
                        </div>
                      </div>
                    )}

                    {/* Visual Animation for step 5 (Finanças Atualizando) */}
                    {videoStep === 4 && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-450">
                            <DollarSign size={32} />
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono text-left space-y-1">
                          <p className="text-emerald-450">💰 Caixa consolidado na nuvem</p>
                          <p className="text-white">Receita Líquida: + R$ 48,00</p>
                          <p className="text-slate-400">CMV contabilizado: - R$ 11,20</p>
                        </div>
                      </div>
                    )}

                    {/* Visual Animation for step 6 (IA Calculando CMV) */}
                    {videoStep === 5 && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-[#FF4F18]/10 border border-[#FF4F18]/20 rounded-full flex items-center justify-center text-[#FF4F18]">
                            <Sparkles size={32} className="animate-pulse" />
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono text-left">
                          <p className="text-orange-450">✨ Copiloto de IA relatórios</p>
                          <p className="text-white">"CMV do Risoto Funghi otimizado para 23.3%. Margem de lucro de 76.7% protegida."</p>
                        </div>
                      </div>
                    )}

                    {/* Step descriptions */}
                    <div className="max-w-md mx-auto space-y-2">
                      <h4 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans">
                        {videoStepsData[videoStep].title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                        {videoStepsData[videoStep].desc}
                      </p>
                    </div>

                  </div>

                </motion.div>
              </AnimatePresence>

            </div>

            {/* Video Player Controls (Play, Pause, Progress scrubbing, mute) */}
            <div className="bg-[#04060c] px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setVideoPlaying(!videoPlaying)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-white border border-white/10 rounded-full transition-all"
                >
                  {videoPlaying ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
                </button>
                <button 
                  onClick={() => {
                    setVideoStep(0);
                    setVideoProgress(0);
                  }}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 rounded-full transition-all"
                  title="Reiniciar"
                >
                  <RefreshCw size={14} />
                </button>
                <button 
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 rounded-full transition-all"
                  title={isVideoMuted ? "Sem áudio" : "Com áudio"}
                >
                  {isVideoMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-[#FF4F18]" />}
                </button>
              </div>

              {/* Progress Slider track */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-mono">Progresso</span>
                <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF4F18] to-orange-400 rounded-full transition-all duration-100"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{videoProgress}%</span>
              </div>

            </div>

          </div>

          {/* Quick step selectors navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
            {videoStepsData.map((step, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setVideoStep(idx);
                  setVideoProgress(0);
                  setVideoPlaying(false);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  videoStep === idx 
                    ? 'bg-slate-900 text-white border-[#FF4F18]/50 shadow-md' 
                    : 'bg-transparent text-slate-500 border-white/5 hover:text-slate-300'
                }`}
              >
                <p className="text-[9px] font-mono font-bold uppercase text-[#FF4F18]">Etapa {idx + 1}</p>
                <p className="text-[10px] font-bold uppercase truncate mt-0.5">{step.title.split('. ')[1]}</p>
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* STAGE 4: "Um restaurante. Uma única plataforma." Connected Modules Graph */}
      <section className="py-20 border-y border-white/5 bg-[#030509] relative overflow-hidden" id="operacao-conectada">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-orange-500/[0.03] blur-[110px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 space-y-14 text-center">
          
          <div className="space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase">Gestão Unificada</span>
            <h2 className="text-3xl sm:text-4xl font-sans font-black text-white tracking-tight leading-none">
              Um restaurante. Uma única plataforma.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-semibold">
              O usuário precisa compreender visualmente que tudo conversa entre si. Linhas de dados luminosas integram todos os canais operacionais em tempo real.
            </p>
          </div>

          {/* Connected Grid Map of 8 modules with custom connections */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
            
            {/* Connection line helper (background vector design) */}
            <div className="hidden md:block absolute inset-x-10 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FF4F18]/25 to-transparent -translate-y-1/2 -z-10 animate-pulse" />

            {[
              { id: 'pedidos', title: 'Pedidos', desc: 'QR Code Mesa, Balcão e Delivery', icon: Smartphone, bg: 'from-orange-500/15 to-orange-500/5 text-orange-400 border-orange-500/10' },
              { id: 'cozinha', title: 'Cozinha', desc: 'Fila KDS em monitores eletrônicos', icon: Trello, bg: 'from-amber-500/15 to-amber-500/5 text-amber-400 border-amber-500/10' },
              { id: 'estoque', title: 'Estoque', desc: 'Baixa de insumos por ficha técnica', icon: Package, bg: 'from-rose-500/15 to-rose-500/5 text-rose-400 border-rose-500/10' },
              { id: 'compras', title: 'Compras', desc: 'Análise de compras e fornecedores', icon: CheckCircle2, bg: 'from-yellow-500/15 to-yellow-500/5 text-yellow-400 border-yellow-500/10' },
              { id: 'financeiro', title: 'Financeiro', desc: 'DRE consolidado e fluxo de caixa', icon: DollarSign, bg: 'from-emerald-500/15 to-emerald-500/5 text-emerald-450 border-emerald-500/10' },
              { id: 'delivery', title: 'Delivery', desc: 'Logística de entregadores própria', icon: Bike, bg: 'from-rose-500/15 to-rose-500/5 text-rose-450 border-rose-500/10' },
              { id: 'relatorios', title: 'Relatórios', desc: 'Inteligência de faturamento real', icon: BarChart2, bg: 'from-sky-500/15 to-sky-500/5 text-sky-400 border-sky-500/10' },
              { id: 'ia', title: 'Inteligência Artificial', desc: 'Auditor de CMV e assistente virtual', icon: Sparkles, bg: 'from-teal-500/15 to-teal-500/5 text-teal-400 border-teal-500/20' }
            ].map((node, index) => (
              <div 
                key={node.id} 
                className={`p-6 bg-[#090d16]/70 border rounded-2xl text-left space-y-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}
              >
                {/* Glowing light pulse on hover */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#FF4F18]/5 rounded-full blur-2xl group-hover:bg-[#FF4F18]/15 transition-all" />
                
                {/* Module Icon in a glowing block */}
                <div className={`w-11 h-11 bg-gradient-to-tr ${node.bg} rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105`}>
                  <node.icon size={20} />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider">
                    {node.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-normal font-semibold min-h-[36px]">
                    {node.desc}
                  </p>
                </div>

                {/* Animated data flow indicator line */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-mono uppercase text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado
                  </span>
                  <span className="text-[#FF4F18] group-hover:translate-x-0.5 transition-transform">0.2s ➔</span>
                </div>
              </div>
            ))}

          </div>

          {/* Central Connecting Flow Message */}
          <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-2xl max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <Zap size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Luzes Luminosas em tempo real</h4>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Nossa API interna realiza a triagem imediata de cada ação em todos os canais.</p>
              </div>
            </div>
            <a href="#leads-section" className="px-5 py-2.5 bg-[#FF4F18] hover:bg-[#ff3b00] text-white rounded-xl text-[10px] font-mono uppercase tracking-widest font-black shrink-0">
              Ver na Minha Loja
            </a>
          </div>

        </div>
      </section>

      {/* STAGE 5: Outcomes Focused Section (Vender Resultados) */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center" id="beneficios">
        <div className="space-y-16">
          
          <div className="space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase">Engenharia de Resultados</span>
            <h3 className="text-3xl sm:text-4xl font-sans font-black text-white tracking-tight leading-none">
              Não vendemos relatórios. Entregamos sobra de caixa.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
              Descubra os benefícios práticos que redesenham a lucratividade e o controle do seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl p-8 space-y-4 text-left relative overflow-hidden group hover:border-[#FF4F18]/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#FF4F18]/5 rounded-full blur-2xl" />
              <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-[#FF4F18]">
                <TrendingUp size={20} />
              </div>
              <h4 className="text-base font-sans font-extrabold text-white uppercase tracking-wider">Reduza Desperdícios</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Nossas fichas técnicas integradas e as baixas de estoque eliminam as compras às cegas e as perdas na geladeira. Economize até 14% de custos em insumos.
              </p>
            </div>

            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl p-8 space-y-4 text-left relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl" />
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-450">
                <Clock size={20} />
              </div>
              <h4 className="text-base font-sans font-extrabold text-white uppercase tracking-wider">Economize horas todos os dias</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Esqueça as planilhas manuais e o fechamento demorado. Faturamento, DRE financeiro e folha de taxas são centralizados na nuvem em segundos.
              </p>
            </div>

            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl p-8 space-y-4 text-left relative overflow-hidden group hover:border-[#FF4F18]/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#FF4F18]/5 rounded-full blur-2xl" />
              <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400">
                <DollarSign size={20} />
              </div>
              <h4 className="text-base font-sans font-extrabold text-white uppercase tracking-wider">Descubra Furos de Caixa</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Nossa IA audita o fluxo de cada comanda e acusa se houver sangrias desreguladas, taxas abusivas de entrega ou pratos operando sem margem saudável.
              </p>
            </div>

          </div>

          {/* Quick Persuasive row */}
          <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto text-left">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Pronto para aumentar suas margens?</p>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">O KitchenFlow AI paga a si mesmo já nas primeiras semanas de operação ativa.</p>
            </div>
            <div className="flex gap-4">
              <a href="#leads-section" className="px-5 py-2.5 bg-[#FF4F18] hover:bg-[#ff3b00] text-white rounded-xl text-[10px] font-mono uppercase tracking-widest font-black transition-all">
                Criar Conta Grátis
              </a>
              <a href="#precos" className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-[10px] font-mono uppercase tracking-widest font-black border border-white/5 transition-all">
                Ver Planos
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* STAGE 6: Humanization (Featuring real-life AI professional photographs) */}
      <section className="py-20 px-6 bg-slate-950 border-t border-white/5" id="humanizacao">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase">Equipe de Sucesso</span>
            <h3 className="text-3xl font-sans font-black text-white tracking-tight leading-none">
              Projetado para quem vive a operação real
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Do salão à gerência, KitchenFlow AI foi desenhado para ser intuitivo, fluído e eliminar o estresse diário dos restaurantes de alta gastronomia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Block 1: Chef utilizing tablet */}
            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl overflow-hidden shadow-xl group">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src={chefImage} 
                  alt="Chef utilizando tablet KDS na cozinha" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent" />
              </div>
              <div className="p-6 space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                  Cozinha Inteligente (KDS)
                </span>
                <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider pt-1">O Chef no Comando</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Sem comandas de papel borradas ou gritos no balcão. O chef visualiza o tempo de preparo de cada mesa e atualiza o salão com um clique.
                </p>
              </div>
            </div>

            {/* Block 2: Manager analyzing indicators */}
            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl overflow-hidden shadow-xl group">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src={managerImage} 
                  alt="Gerente analisando faturamento e custos no tablet" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent" />
              </div>
              <div className="p-6 space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Painel de Lucratividade
                </span>
                <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider pt-1">O Gestor Estratégico</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Relatórios de CMV, perdas de ingredientes e faturamento do dia na palma da mão, permitindo decisões rápidas de cortes e compras.
                </p>
              </div>
            </div>

            {/* Block 3: Waiter taking digital orders */}
            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl overflow-hidden shadow-xl group">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src={waiterImage} 
                  alt="Garçom anotando comanda digital no celular" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent" />
              </div>
              <div className="p-6 space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Atendimento Móvel
                </span>
                <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider pt-1">O Garçom Ágil</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Pedidos são lançados diretamente na mesa via celular ou tablet e caem em tempo real no KDS da cozinha quente e no caixa de faturamento.
                </p>
              </div>
            </div>

            {/* Block 4: Modern cozy restaurant layout */}
            <div className="bg-[#0b0f19] border border-white/5 rounded-3xl overflow-hidden shadow-xl group">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src={interiorImage} 
                  alt="Lanchonete ou restaurante moderno acolhedor" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] to-transparent" />
              </div>
              <div className="p-6 space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                  Atendimento Fluído
                </span>
                <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider pt-1">O Salão Confortável</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Otimização no giro de mesas, QR Codes de mesas estáveis e autoatendimento reduzem filas no caixa físico e encantam o cliente.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Trust Callout / Slogan section */}
      <section className="py-16 bg-[#030509] border-t border-white/5 text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center text-[#FF4F18] mx-auto animate-pulse">
            <Award size={24} />
          </div>
          <h4 className="text-lg sm:text-xl font-sans font-extrabold text-white uppercase tracking-wide">
            "Construído com a experiência real de quem vive a operação de restaurantes todos os dias."
          </h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Nossa arquitetura unificada foi desenhada em parceria com chefs, donos de lanchonetes e caixas experientes. Não somos apenas software, entendemos o calor e a pressa da cozinha profissional.
          </p>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="py-20 bg-[#06080e] border-t border-white/5 px-6" id="precos">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase">Investimento Transparente</span>
            <h3 className="text-3xl sm:text-4xl font-sans font-black text-white tracking-tight">
              Preços claros. Sem amarras.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
              Sem taxas surpresas, sem comissões sobre suas comandas e sem fidelidade contratual. Cancele ou altere quando quiser.
            </p>

            {/* Toggle Switch */}
            <div className="inline-flex justify-center items-center gap-2 bg-slate-900/60 border border-white/5 p-1 rounded-xl mt-2">
              <button 
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
                  billingPeriod === 'monthly' ? 'bg-[#0b0f19] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  billingPeriod === 'yearly' ? 'bg-[#FF4F18] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Anual <span className="bg-[#0b0f19] text-[#FF4F18] px-1.5 py-0.5 rounded text-[8px] font-bold">Salvar 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-2">
            {activePlans.map((plan) => {
              const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
              return (
                <div 
                  key={plan.id}
                  className={`p-8 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${
                    plan.isPopular 
                      ? 'bg-gradient-to-b from-slate-900/40 to-[#0e1423]/10 border-[#FF4F18]/30 shadow-2xl relative' 
                      : 'bg-[#0b0f19]/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF4F18] text-white font-mono text-[8px] uppercase tracking-widest px-4 py-1 rounded-full border border-orange-500/20 shadow-md">
                      Mais Recomendado
                    </span>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-sans font-extrabold text-white uppercase tracking-wider">{plan.name}</h4>
                      <div className={`p-2.5 rounded-xl ${plan.isPopular ? 'bg-[#FF4F18] text-white' : 'bg-slate-900 border border-white/5 text-slate-400'}`}>
                        <plan.icon size={16} />
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[44px] font-semibold">
                      {plan.description}
                    </p>

                    <div className="flex items-baseline gap-1.5 font-mono pt-2 border-b border-white/5 pb-6">
                      <span className="text-xs uppercase text-slate-500">R$</span>
                      <span className="text-4xl font-extrabold text-white tracking-tight">{price}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest">/mês</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      {plan.features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <div className="w-5 h-5 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-[#FF4F18] mt-0.5">
                            <Check size={10} strokeWidth={3} />
                          </div>
                          <span className="text-slate-300 leading-normal font-semibold">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <a 
                      href="#leads-section"
                      className={`w-full py-3.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all block text-center cursor-pointer font-black ${
                        plan.isPopular 
                          ? 'bg-[#FF4F18] hover:bg-[#ff3b00] text-white shadow-xl shadow-[#FF4F18]/20 border border-white/5' 
                          : 'bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/5'
                      }`}
                    >
                      Solicitar {plan.name}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ / Accordion Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto" id="perguntas-frequentes">
        <div className="space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase">Dúvidas Frequentes</span>
            <h3 className="text-3xl font-sans font-black text-white tracking-tight">Perguntas Frequentes</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Preciso trocar meus tablets, celulares ou computadores?",
                a: "Não. O KitchenFlow AI funciona diretamente através de qualquer navegador web moderno. Você pode rodar em tablets comuns, PCs antigos, celulares Android/iOS ou nas telas profissionais de KDS que já possuir."
              },
              {
                q: "O que acontece se a internet do restaurante cair?",
                a: "Nosso sistema de vendas possui um módulo offline resiliente. Ele registra e emite pedidos mesmo se o sinal do Wi-Fi falhar temporariamente, re-sincronizando tudo com a nuvem assim que a rede voltar."
              },
              {
                q: "A IA realmente consegue calcular o CMV sozinha?",
                a: "Sim. Ao cadastrar suas receitas e vincular às compras de fornecedores, o sistema realiza a baixa de ingredientes automatizada na venda de cada prato, identificando desvios de consumo e sugerindo reajustes de cardápio."
              },
              {
                q: "Há alguma multa de cancelamento ou contrato de fidelidade?",
                a: "Absolutamente nenhuma. Confiamos na qualidade da nossa entrega e no lucro real que geramos. Você pode suspender, fazer upgrade ou cancelar sua assinatura mensal ou anual a qualquer momento, sem surpresas."
              }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="bg-[#0b0f19]/70 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="text-xs sm:text-sm font-sans font-extrabold text-white pr-4">{faq.q}</span>
                    <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#FF4F18]' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-white/5 font-semibold">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Leads Capture Form (Optimized Conversational CRM Setup) */}
      <section className="py-20 px-6 max-w-5xl mx-auto" id="leads-section">
        <div className="bg-gradient-to-b from-slate-900/60 to-[#0b0f19] p-8 sm:p-12 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-orange-500/5 blur-[80px] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-left">
              <span className="text-xs font-mono font-bold text-[#FF4F18] tracking-[0.25em] uppercase flex items-center gap-2">
                <MessageSquare size={14} /> Fale com Especialistas
              </span>
              <h3 className="text-3xl font-sans font-black text-white tracking-tight leading-[1.1]">
                Aumente os lucros da sua operação ainda esta semana.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-semibold">
                Preencha o formulário e agende uma demonstração gratuita guiada do software, simulando o CMV, faturamento e despesas reais do seu próprio restaurante.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-[#FF4F18] shrink-0">
                    <Phone size={14} />
                  </div>
                  <span>Contato comercial imediato via WhatsApp de Segunda a Sexta</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-[#FF4F18] shrink-0">
                    <Mail size={14} />
                  </div>
                  <span>Email de atendimento: comercial@kitchenflow.ai</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-[#FF4F18] shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <span>Amparo legal integral pela LGPD</span>
                </div>
              </div>
            </div>

            {/* Form Box */}
            <div className="bg-[#04060b] p-6 sm:p-8 rounded-2xl border border-white/5 shadow-inner">
              {submitSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 animate-bounce">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-sans font-bold text-white">Solicitação Recebida!</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Excelente. Salvamos os dados em nosso CRM comercial. Um membro de nossa equipe fará contato comercial nas próximas horas para agendar seu acesso.
                  </p>
                  <button 
                    onClick={() => setSubmitSuccess(false)}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-mono uppercase tracking-wider border border-white/5 transition-colors"
                  >
                    Cadastrar Outro Restaurante
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Seu Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Ex: Pedro Henrique"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs placeholder-slate-600 text-white focus:outline-none focus:border-[#FF4F18] transition-colors font-semibold" 
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Nome do seu Restaurante</label>
                    <input 
                      type="text" 
                      required
                      value={leadCompany}
                      onChange={(e) => setLeadCompany(e.target.value)}
                      placeholder="Ex: Forno de Nápoles Pizzaria"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs placeholder-slate-600 text-white focus:outline-none focus:border-[#FF4F18] transition-colors font-semibold" 
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">E-mail Corporativo</label>
                    <input 
                      type="email" 
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Ex: pedro@fornodepizza.com"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs placeholder-slate-600 text-white focus:outline-none focus:border-[#FF4F18] transition-colors font-semibold" 
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">WhatsApp com DDD</label>
                    <input 
                      type="text" 
                      required
                      value={leadPhone}
                      onChange={handlePhoneChange}
                      placeholder="Ex: (11) 99876-5432"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs placeholder-slate-600 text-white focus:outline-none focus:border-[#FF4F18] transition-colors font-semibold" 
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400">
                      {errorMessage}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#FF4F18] hover:bg-[#ff3b00] disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#FF4F18]/10 border border-white/5 transition-all"
                  >
                    {isSubmitting ? 'Registrando no CRM...' : 'Solicitar Demonstração Gratuita'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Certification Footer Trust Callout */}
      <section className="py-12 bg-[#030509] border-t border-white/5 text-center px-6">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF4F18]">
            <Lock size={16} />
          </div>
          <h4 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-widest">Plataforma Segura Homologada</h4>
          <p className="text-[10px] text-slate-500 leading-normal max-w-sm font-semibold">
            Criptografia de dados ponta a ponta, servidores redundantes e backups automáticos. Amparo integral às obrigações fiscais brasileiras.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#030509] text-slate-500 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center">
                <ChefHatLogo className="w-5 h-5 text-[#FF4F18]" />
              </div>
              <span className="font-sans font-bold text-white">KitchenFlow AI</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              Sistema de gestão operacional inteligente para controle de CMV, KDS integrado e automação completa de salão e entrega de pratos para restaurantes de elite.
            </p>
          </div>

          <div>
            <h5 className="text-[10px] font-mono uppercase tracking-widest text-slate-300 mb-3">Módulos</h5>
            <ul className="space-y-2 text-[10px] font-bold">
              <li><a href="#operacao-conectada" className="hover:text-[#FF4F18] transition-colors">Monitor de Cozinha KDS</a></li>
              <li><a href="#operacao-conectada" className="hover:text-[#FF4F18] transition-colors">Cardápio por QR Code</a></li>
              <li><a href="#operacao-conectada" className="hover:text-[#FF4F18] transition-colors">PDV & Balcão de Vendas</a></li>
              <li><a href="#operacao-conectada" className="hover:text-[#FF4F18] transition-colors">Controle Financeiro CMV</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-mono uppercase tracking-widest text-slate-300 mb-3">Tecnologia</h5>
            <ul className="space-y-2 text-[10px] font-bold">
              <li><a href="#hero" className="hover:text-[#FF4F18] transition-colors">Copiloto Integrado</a></li>
              <li><a href="#hero" className="hover:text-[#FF4F18] transition-colors">Heurísticas de CMV</a></li>
              <li><a href="https://firebase.google.com" target="_blank" rel="noreferrer" className="hover:text-[#FF4F18] transition-colors">Armazenamento Firestore</a></li>
              <li><a href="https://vite.dev" target="_blank" rel="noreferrer" className="hover:text-[#FF4F18] transition-colors">Vite + React SPA</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-mono uppercase tracking-widest text-slate-300 mb-3">Contato</h5>
            <p className="text-[10px] font-bold">
              São Paulo, Brasil<br />
              Suporte Técnico: suporte@kitchenflow.ai<br />
              Comercial: comercial@kitchenflow.ai
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-white/5 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[9px] font-semibold text-slate-600 gap-4">
          <span>© 2026 Kitchenflow AI Ltda. Todos os direitos reservados. CNPJ: 45.980.201/0001-92</span>
          <div className="flex gap-4">
            <a href="#hero" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
            <a href="#hero" className="hover:text-slate-400 transition-colors">Privacidade Regulamentada</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
