import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  DollarSign, 
  Calendar, 
  Clock, 
  Users, 
  Package, 
  LifeBuoy, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  ShoppingBag, 
  ShieldCheck, 
  Cpu, 
  Check, 
  ChevronRight, 
  FileText, 
  AlertCircle, 
  Smartphone, 
  Receipt, 
  Zap, 
  Monitor, 
  Flame, 
  ArrowUpRight,
  Info,
  TrendingUp
} from 'lucide-react';
import { Tenant, User } from '../../types';
import { SaasQuickDiagnosticModal } from './SaasQuickDiagnosticModal';

interface Tenant360ModalProps {
  tenant: Tenant;
  onClose: () => void;
  onAccessSystem: (tenant: Tenant) => void;
  onGenerateAccess?: (tenant: Tenant) => void;
  onRenewPlan?: (tenant: Tenant) => void;
  onOpenSupportTicket?: (tenant: Tenant) => void;
  onEdit?: (tenant: Tenant) => void;
  onOpenDiagnostics?: (tenant: Tenant) => void;
  usersCount?: number;
  ordersCountToday?: number;
  lastOrderTime?: string;
  lastAccessTime?: string;
  supportTicketsCount?: number;
  onAuditLog?: (action: string, previous?: string, next?: string) => void;
}

export const Tenant360Modal: React.FC<Tenant360ModalProps> = ({
  tenant,
  onClose,
  onAccessSystem,
  onGenerateAccess = () => {},
  onRenewPlan = () => {},
  onOpenSupportTicket,
  onEdit,
  onOpenDiagnostics,
  usersCount = 4,
  ordersCountToday = 18,
  lastOrderTime = 'Hoje às 12:45',
  lastAccessTime = 'Hoje às 13:10',
  supportTicketsCount = 0,
  onAuditLog
}) => {
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'financial' | 'support' | 'timeline'>('overview');

  // Subscription remaining days calculation
  const getDaysRemaining = (expiryDate: any) => {
    if (!expiryDate) return 0;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining(tenant.subscription?.expiryDate);
  const isExpired = !tenant.active || daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;

  // System Modules Status Simulation & Diagnostic check
  const modulesStatus = [
    { id: 'pos', name: 'PDV (Ponto de Venda)', icon: Monitor, status: tenant.active ? 'ok' : 'error', latency: '42ms', details: 'Frente de caixa online e sincronizada com Firestore' },
    { id: 'kds', name: 'KDS (Monitor de Cozinha)', icon: Flame, status: tenant.active ? 'ok' : 'error', latency: '35ms', details: 'Comandas em tempo real e sinalizadores sonoros ativos' },
    { id: 'marketplace', name: 'Marketplace Zupi', icon: ShoppingBag, status: tenant.active ? 'ok' : 'warning', latency: '58ms', details: 'Cardápio sincronizado na cidade. Loja visível no app' },
    { id: 'inventory', name: 'Estoque & Ficha Técnica', icon: Package, status: 'ok', latency: '28ms', details: 'Dedução automática de insumos e CMV nominal' },
    { id: 'finance', name: 'Gestão Financeira & DRE', icon: DollarSign, status: 'ok', latency: '31ms', details: 'Fechamento de caixa e conciliação de cartões operando' },
    { id: 'fiscal', name: 'Módulo Fiscal (NFC-e / SAT)', icon: Receipt, status: 'ok', latency: '75ms', details: 'Certificado A1 válido e emissão em contingência offline pronta' },
  ];

  // Store timeline events
  const timelineEvents = [
    { time: '12:45', title: 'Pedido #4092 recebido', desc: '1x Parmegiana de Alcatra + 1x Coca-Cola (R$ 48,90) via Marketplace', type: 'order' },
    { time: '12:10', title: 'Usuário operador logado', desc: 'Operador Caixa 01 autenticado com sucesso no PDV', type: 'login' },
    { time: '11:35', title: 'Sincronização em Nuvem', desc: '14 novos itens e fichas técnicas atualizadas no banco de dados', type: 'sync' },
    { time: '10:00', title: 'Abertura de Caixa', desc: 'Caixa aberto com fundo inicial de R$ 150,00', type: 'cash' },
    { time: '09:30', title: 'Backup Local IndexedDB', desc: 'Snapshot local gerado com integridade 100%', type: 'system' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Header 360° */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 size={32} className="text-white/80" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {tenant.active ? '🟢 Loja Operacional' : '🔴 Loja Desativada'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 font-mono">
                  Cliente #{tenant.clientNumber || tenant.id.slice(0, 5)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  Plano {tenant.subscription?.plan || 'PRO'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{tenant.name}</h2>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                <span>Proprietário: <strong className="text-slate-200">{tenant.ownerId}</strong></span>
                {tenant.phone && <span>• Tel: <strong className="text-slate-200">{tenant.phone}</strong></span>}
                {tenant.category && <span>• Categoria: <strong className="text-slate-200">{tenant.category}</strong></span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowDiagnosticModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Zap size={15} />
              Executar Diagnóstico 360°
            </button>
            <button
              onClick={() => onAccessSystem(tenant)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <ExternalLink size={15} />
              Acessar Painel
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'overview', label: 'Visão Geral 360°', icon: Activity },
            { id: 'modules', label: 'Módulos do Sistema', icon: Cpu },
            { id: 'financial', label: 'Financeiro & Assinatura', icon: DollarSign },
            { id: 'support', label: `Suporte & Chamados (${supportTicketsCount})`, icon: LifeBuoy },
            { id: 'timeline', label: 'Timeline de Atividades', icon: Clock },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  isActive ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Quick 4 Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Status da Assinatura</span>
                    <CheckCircle2 size={16} className={tenant.active ? 'text-emerald-500' : 'text-rose-500'} />
                  </div>
                  <p className="text-xl font-black text-slate-900">
                    {tenant.active ? 'Ativa & Operante' : 'Inativa / Suspensa'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {daysRemaining >= 0 ? `Vence em ${daysRemaining} dias` : `Vencido há ${Math.abs(daysRemaining)} dias`}
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Usuários / Equipe</span>
                    <Users size={16} className="text-indigo-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{usersCount} Usuários</p>
                  <p className="text-xs text-slate-500 mt-1">Último acesso: {lastAccessTime}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Pedidos Hoje</span>
                    <ShoppingBag size={16} className="text-amber-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{ordersCountToday} Pedidos</p>
                  <p className="text-xs text-slate-500 mt-1">Último pedido: {lastOrderTime}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Suporte & Chamados</span>
                    <LifeBuoy size={16} className="text-teal-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{supportTicketsCount} Pendentes</p>
                  <p className="text-xs text-emerald-600 font-bold mt-1">Nenhum incidente crítico</p>
                </div>
              </div>

              {/* Status dos Sistemas (Módulos) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Status dos Módulos Operacionais</h3>
                      <p className="text-xs text-slate-500">Monitoramento em tempo real dos serviços conectados do estabelecimento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDiagnosticModal(true)}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Testar Todos</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {modulesStatus.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black text-slate-900 truncate">{m.name}</h4>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                              m.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {m.status === 'ok' ? '🟢 ONLINE' : '🔴 OFFLINE'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{m.details}</p>
                          <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 inline-block">Latência: {m.latency}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informações de Cliente e Financeiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cliente */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Building2 size={18} />
                    </div>
                    <h3 className="text-base font-black text-slate-900">Dados do Cliente</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Razão Social / Nome Fantasia:</span>
                      <span className="font-black text-slate-900">{tenant.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">E-mail do Proprietário:</span>
                      <span className="font-bold text-slate-800 font-mono">{tenant.ownerId}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">CNPJ / Documento:</span>
                      <span className="font-bold text-slate-800 font-mono">{tenant.cnpj || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Endereço Cadastrado:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[200px]">{tenant.address || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Data de Cadastro:</span>
                      <span className="font-bold text-slate-800">
                        {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('pt-BR') : 'Recentemente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financeiro */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                        <DollarSign size={18} />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Resumo Financeiro & Assinatura</h3>
                    </div>
                    <button
                      onClick={() => onRenewPlan(tenant)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-wider hover:bg-indigo-100 transition-all cursor-pointer"
                    >
                      Renovar / Cobrar
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Plano Contratado:</span>
                      <span className="font-black text-indigo-600">{tenant.subscription?.plan || 'PRO'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Ciclo de Cobrança:</span>
                      <span className="font-bold text-slate-800">Mensal Recorrente</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Status do Pagamento:</span>
                      <span className={`font-black ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpired ? '🔴 Pagamento Atrasado' : '🟢 Em Dia (Pago)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Próximo Vencimento:</span>
                      <span className="font-black text-slate-900">
                        {tenant.subscription?.expiryDate 
                          ? new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR') 
                          : 'Indeterminado'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-bold">Comissões Marketplace:</span>
                      <span className="font-bold text-slate-800">R$ 1,50 por pedido entregue</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">Auditoria Completa de Módulos & Permissões</h3>
                <span className="text-xs text-slate-500 font-bold">6 de 6 serviços operacionais</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modulesStatus.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-sm shrink-0">
                        <Icon size={22} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900">{m.name}</h4>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            m.status === 'ok' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {m.status === 'ok' ? 'Operacional' : 'Requer Atenção'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{m.details}</p>
                        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Tempo de Resposta: {m.latency}</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">Timeline de Atividades Recentes</h3>
                <span className="text-xs text-slate-500 font-bold">Sincronização em tempo real</span>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative pb-4 last:pb-0">
                    {idx !== timelineEvents.length - 1 && (
                      <div className="absolute left-[19px] top-7 bottom-0 w-0.5 bg-slate-200"></div>
                    )}
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-mono text-xs font-black shadow-sm shrink-0 z-10">
                      {evt.time}
                    </div>
                    <div className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                      <h4 className="text-xs font-black text-slate-900">{evt.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{evt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-900">Assinatura em Conformidade</h4>
                    <p className="text-xs text-emerald-700">O cliente não possui faturas pendentes ou débitos de comissão.</p>
                  </div>
                </div>
                <button 
                  onClick={() => onRenewPlan(tenant)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-700 cursor-pointer"
                >
                  Registrar Pagamento
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Histórico de Cobranças</h4>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-800">Mensalidade Plano {tenant.subscription?.plan || 'PRO'}</p>
                      <p className="text-[10px] text-slate-400">Vencimento: 01/{new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
                    </div>
                    <span className="font-bold text-emerald-600">Pago via PIX</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-800">Comissões Marketplace Ciclo Anterior</p>
                      <p className="text-[10px] text-slate-400">Total: 42 pedidos entregues</p>
                    </div>
                    <span className="font-bold text-emerald-600">Conciliado (R$ 63,00)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">Chamados e Atendimentos de Suporte</h3>
                <button
                  onClick={() => onOpenSupportTicket && onOpenSupportTicket(tenant)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5"
                >
                  <LifeBuoy size={14} />
                  Abrir Novo Chamado
                </button>
              </div>

              {supportTicketsCount === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200/80 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">Nenhum chamado pendente</h4>
                  <p className="text-xs text-slate-500">Este cliente não possui tickets de suporte abertos no momento.</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                  Existem chamados em andamento para este cliente.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={14} className="text-indigo-500" />
            <span>Ações administrativas são registradas no Log de Auditoria SaaS.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onGenerateAccess(tenant)}
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider hover:bg-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Key size={14} />
              Gerar Credencial Master
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
            >
              Fechar Visão 360°
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Diagnostic Modal */}
      {showDiagnosticModal && (
        <SaasQuickDiagnosticModal
          tenantName={tenant.name}
          onClose={() => setShowDiagnosticModal(false)}
        />
      )}
    </div>
  );
};
