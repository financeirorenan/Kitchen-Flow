import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  X, 
  Building2, 
  Package, 
  DollarSign, 
  LifeBuoy, 
  ShoppingBag, 
  Zap, 
  Activity, 
  ChevronRight, 
  ArrowRight, 
  Command,
  Users,
  Shield
} from 'lucide-react';
import { Tenant } from '../../types';

interface SaasGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onSelectTenant: (tenant: Tenant) => void;
  onNavigateTab: (tab: string) => void;
  onExecuteDiagnostic?: () => void;
  onOpenDiagnostic?: () => void;
  onNewClient?: () => void;
  onOpenNewTenantModal?: () => void;
}

export const SaasGlobalSearchModal: React.FC<SaasGlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tenants,
  onSelectTenant,
  onNavigateTab,
  onExecuteDiagnostic,
  onOpenDiagnostic,
  onNewClient,
  onOpenNewTenantModal
}) => {
  const handleDiagnostic = onExecuteDiagnostic || onOpenDiagnostic || (() => {});
  const handleNewClient = onNewClient || onOpenNewTenantModal || (() => {});
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Shortcut items
  const quickActions = [
    { id: 'new-client', label: 'Cadastrar Novo Cliente', shortcut: 'N', icon: Building2, action: () => { onClose(); handleNewClient(); } },
    { id: 'tab-tenants', label: 'Ver Todas as Lojas / Clientes', shortcut: 'L', icon: Building2, action: () => { onClose(); onNavigateTab('tenants'); } },
    { id: 'tab-marketplace', label: 'Painel do Marketplace Zupi', shortcut: 'M', icon: ShoppingBag, action: () => { onClose(); onNavigateTab('marketplace_config'); } },
    { id: 'tab-financial', label: 'Financeiro & Mensalidades SaaS', shortcut: 'F', icon: DollarSign, action: () => { onClose(); onNavigateTab('financial'); } },
    { id: 'tab-support', label: 'Central de Suporte & Chamados', shortcut: 'S', icon: LifeBuoy, action: () => { onClose(); onNavigateTab('support'); } },
    { id: 'diagnostic', label: 'Executar Diagnóstico em 1 Clique', shortcut: 'D', icon: Zap, action: () => { onClose(); handleDiagnostic(); } },
    { id: 'tab-plans', label: 'Gerenciar Planos & Preços', shortcut: 'P', icon: Package, action: () => { onClose(); onNavigateTab('plans'); } },
  ];

  // Matched Tenants
  const matchedTenants = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return tenants.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.ownerId.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.subscription?.plan && t.subscription.plan.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [tenants, query]);

  // Matched Actions
  const matchedActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();
    return quickActions.filter(a => a.label.toLowerCase().includes(q));
  }, [quickActions, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar loja, proprietário, módulo ou ação rápida (Ctrl + K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-none text-slate-900 text-sm font-bold outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-mono font-bold">ESC</kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-left">
          {/* Matched Tenants */}
          {matchedTenants.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                Lojas & Clientes Encontrados
              </span>
              <div className="space-y-1">
                {matchedTenants.map(t => (
                  <div
                    key={t.id}
                    onClick={() => { onClose(); onSelectTenant(t); }}
                    className="p-3 rounded-2xl hover:bg-indigo-50/80 transition-all cursor-pointer flex items-center justify-between group border border-transparent hover:border-indigo-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                        {t.logoUrl ? <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover rounded-xl" /> : t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{t.name}</h4>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {t.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{t.ownerId} • Plano {t.subscription?.plan || 'PRO'}</p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Abrir Visão 360° <ChevronRight size={14} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions & Navigation */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
              Atalhos & Ações Rápidas
            </span>
            <div className="space-y-1">
              {matchedActions.map(action => {
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    onClick={action.action}
                    className="p-3 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900">{action.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 bg-slate-200/80 text-slate-600 rounded text-[10px] font-mono font-bold">
                        {action.shortcut}
                      </kbd>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <div className="flex items-center gap-3">
            <span>Pressione <strong className="text-slate-600">N</strong> para Novo Cliente</span>
            <span><strong className="text-slate-600">L</strong> Lojas</span>
            <span><strong className="text-slate-600">D</strong> Diagnóstico</span>
          </div>
          <span>Navegue com setas ou clique</span>
        </div>
      </motion.div>
    </div>
  );
};
