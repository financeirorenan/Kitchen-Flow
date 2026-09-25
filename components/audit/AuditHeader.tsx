import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  BellRing, 
  RotateCw, 
  ShieldCheck,
  Store,
  ArrowLeft,
  ChevronDown,
  Building2,
  Lock,
  ChevronRight,
  Sparkles,
  Check
} from 'lucide-react';
import { AuditPeriodPreset } from '../../services/auditService';
import { Tenant } from '../../types';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface AuditHeaderProps {
  tenants?: Tenant[];
  selectedTenantId: string;
  onSelectTenantId: (tenantId: string) => void;
  selectedTenant?: Tenant | null;
  breadcrumbTrail?: BreadcrumbItem[];
  activePeriod: AuditPeriodPreset;
  setActivePeriod: (period: AuditPeriodPreset) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefresh: () => void;
  onOpenExportModal: () => void;
  onOpenAlertRulesModal: () => void;
  inconsistenciesCount: number;
}

export const AuditHeader: React.FC<AuditHeaderProps> = ({
  tenants = [],
  selectedTenantId,
  onSelectTenantId,
  selectedTenant,
  breadcrumbTrail = [],
  activePeriod,
  setActivePeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onOpenExportModal,
  onOpenAlertRulesModal,
  inconsistenciesCount
}) => {
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTenantDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const periodButtons: { id: AuditPeriodPreset; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: '7days', label: '7 Dias' },
    { id: '30days', label: '30 Dias' },
    { id: 'current_month', label: 'Mês Atual' },
    { id: 'previous_month', label: 'Mês Anterior' },
    { id: 'custom', label: 'Personalizado' }
  ];

  // Filtro de lojistas por Nome, Razão Social, CNPJ, ID
  const filteredTenants = (tenants || []).filter(t => {
    if (!t) return false;
    if (!tenantSearchTerm) return true;
    const term = tenantSearchTerm.toLowerCase();
    const nameMatch = (t.name || '').toLowerCase().includes(term);
    const razaoMatch = ((t as any).razaoSocial || '').toLowerCase().includes(term);
    const cnpjMatch = (t.cnpj || '').replace(/\D/g, '').includes(term.replace(/\D/g, '')) || (t.cnpj || '').toLowerCase().includes(term);
    const idMatch = (t.id || '').toLowerCase().includes(term);
    return nameMatch || razaoMatch || cnpjMatch || idMatch;
  });

  const isMerchantMode = selectedTenantId !== 'ALL' && selectedTenant;

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs">
      {/* 1. SELETOR PRINCIPAL DE LOJISTA (BARRA DE CONTROLE MULTITENANT) */}
      <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Filtro Principal de Auditoria
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Nível Lojista
                </span>
              </div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                LOJISTA INVESTIGADO:
                <span className="text-amber-400 font-bold">
                  {selectedTenant ? selectedTenant.name : 'Todos os Lojistas (Visão Geral da Plataforma)'}
                </span>
              </div>
            </div>
          </div>

          {/* Dropdown Seletor de Lojista com Pesquisa */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="audit-tenant-selector-btn"
              onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
              className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-inner w-full md:w-80"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {selectedTenant ? selectedTenant.name : 'Todos os Lojistas'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTenantDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTenantDropdownOpen && (
              <div className="absolute right-0 mt-2 w-96 max-h-[460px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-800 bg-slate-950/60">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar por Nome, Razão Social, CNPJ ou ID..."
                      value={tenantSearchTerm}
                      onChange={e => setTenantSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto divide-y divide-slate-800/60 max-h-80">
                  {/* Opção Todos os Lojistas */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTenantId('ALL');
                      setIsTenantDropdownOpen(false);
                      setTenantSearchTerm('');
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                      selectedTenantId === 'ALL'
                        ? 'bg-indigo-950/60 text-indigo-300 font-black'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Todos os lojistas</div>
                        <div className="text-[10px] text-slate-500">Visão consolidada da plataforma</div>
                      </div>
                    </div>
                    {selectedTenantId === 'ALL' && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>

                  {/* Lista de Lojistas Filtrados */}
                  {filteredTenants.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Nenhum lojista encontrado para a busca.
                    </div>
                  ) : (
                    filteredTenants.map(tenant => (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => {
                          onSelectTenantId(tenant.id);
                          setIsTenantDropdownOpen(false);
                          setTenantSearchTerm('');
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                          selectedTenantId === tenant.id
                            ? 'bg-amber-950/40 text-amber-200 font-black border-l-2 border-amber-400'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {tenant.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {tenant.cnpj ? `CNPJ: ${tenant.cnpj}` : `ID: ${tenant.id.slice(0, 10)}...`}
                              {(tenant as any).razaoSocial && ` • ${(tenant as any).razaoSocial}`}
                            </div>
                          </div>
                        </div>
                        {selectedTenantId === tenant.id && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 text-center font-medium">
                  Selecione um estabelecimento para investigar dados isolados
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MODO AUDITORIA DO LOJISTA (BANNER DESTAQUE QUANDO LOJISTA SELECIONADO) */}
      {isMerchantMode && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 border-b border-amber-200 px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSelectTenantId('ALL')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Auditoria Geral
                </button>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  MODO AUDITORIA DO LOJISTA
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Isolamento Rigoroso Ativo
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  🔎 Auditoria do Lojista: <span className="text-amber-700 font-black">{selectedTenant.name}</span>
                </h2>
              </div>

              {/* Informações detalhadas do Lojista */}
              <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
                {selectedTenant.cnpj && (
                  <div>
                    <span className="font-semibold text-slate-500">CNPJ:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">{selectedTenant.cnpj}</span>
                  </div>
                )}
                {(selectedTenant as any).razaoSocial && (
                  <div>
                    <span className="font-semibold text-slate-500">Razão Social:</span>{' '}
                    <span className="font-bold text-slate-800">{(selectedTenant as any).razaoSocial}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-500">ID Lojista:</span>{' '}
                  <span className="font-mono text-slate-700">{selectedTenant.id}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Segmento:</span>{' '}
                  <span className="font-bold text-slate-800">{selectedTenant.category || 'Restaurante / Alimentação'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Plano:</span>{' '}
                  <span className="px-2 py-0.5 bg-white text-indigo-700 rounded-md font-bold text-[10px] border border-indigo-200">
                    {selectedTenant.subscription?.planName || 'Profissional'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1.5 rounded-xl border border-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Auditoria 100% focada nesta operação
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. BREADCRUMBS HIERÁRQUICOS */}
      {breadcrumbTrail && breadcrumbTrail.length > 0 && (
        <div className="px-6 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto">
          {breadcrumbTrail.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
              {crumb.onClick && !crumb.active ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="font-semibold text-slate-600 hover:text-indigo-600 hover:underline transition-colors truncate"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={`font-bold truncate ${crumb.active ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 4. CABEÇALHO PADRÃO & AÇÕES */}
      <div className="px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Título & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  {isMerchantMode ? `Diagnóstico & Prevenção: ${selectedTenant.name}` : 'Central de Diagnóstico, Prevenção & Saúde'}
                </h1>
                {inconsistenciesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    {inconsistenciesCount} Alerta{inconsistenciesCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isMerchantMode
                  ? 'Check-up contínuo, prevenção de inconsistências, pedidos e conciliação financeira deste lojista.'
                  : 'Check-up contínuo em 9 módulos (pedidos, caixa, estoque, financeiro, KDS, integrações) com prevenção ativa e auto-correção.'}
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenAlertRulesModal}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              Regras de Alerta
            </button>

            <button
              type="button"
              id="audit-export-report-btn"
              onClick={onOpenExportModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Relatório {isMerchantMode ? 'do Lojista' : ''}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              title="Atualizar dados de auditoria"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. BARRA DE PERÍODOS E BUSCA RÁPIDA */}
        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {periodButtons.map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setActivePeriod(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activePeriod === btn.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Período Customizado */}
          {activePeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent border-0 font-bold text-slate-700 focus:outline-hidden"
              />
              <span className="text-slate-400 font-bold">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent border-0 font-bold text-slate-700 focus:outline-hidden"
              />
            </div>
          )}

          {/* Campo de Busca Rápida */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isMerchantMode ? `Buscar neste lojista (pedido, cliente, item)...` : "Pesquisar pedido, cliente, valor..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
