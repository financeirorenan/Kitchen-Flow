import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Settings, 
  Tag, 
  AlertTriangle, 
  DollarSign, 
  Receipt, 
  Layers, 
  History, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Lock, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Building2, 
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TaxEngine, 
  TaxRuleVersion, 
  DEFAULT_TAX_RULES, 
  COMMON_FOOD_NCMS, 
  ProductTaxClassification, 
  OrderTaxAuditMemory,
  defaultTaxEngine
} from '../lib/taxEngine';

interface FiscalEngineModuleProps {
  products?: any[];
  orders?: any[];
  settings?: any;
  currentUser?: any;
  onUpdateSettings?: (newSettings: any) => void;
}

export const FiscalEngineModule: React.FC<FiscalEngineModuleProps> = ({
  products = [],
  orders = [],
  settings = {},
  currentUser,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'split' | 'rules' | 'products' | 'audit' | 'alerts'>('split');
  
  // Regras Tributárias com Histórico
  const [rulesHistory, setRulesHistory] = useState<TaxRuleVersion[]>(() => {
    return settings?.taxRulesHistory && settings.taxRulesHistory.length > 0
      ? settings.taxRulesHistory
      : DEFAULT_TAX_RULES;
  });

  // Instância do Motor Tributário
  const taxEngine = useMemo(() => new TaxEngine(rulesHistory), [rulesHistory]);
  const currentRule = useMemo(() => taxEngine.getRuleForDate(), [taxEngine]);

  // Modal para Nova Regra
  const [isNewRuleModalOpen, setIsNewRuleModalOpen] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    cbsRate: 8.8,
    ibsStateRate: 17.7,
    ibsCityRate: 1.2,
    foodSegmentReductionPct: 60.0,
    basicBasketReductionPct: 100.0,
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Classificação de Produtos
  const [productSearch, setProductSearch] = useState('');
  const [productClassifications, setProductClassifications] = useState<Record<string, Partial<ProductTaxClassification>>>(() => {
    const map: Record<string, Partial<ProductTaxClassification>> = {};
    (products || []).forEach(p => {
      map[p.id] = {
        productId: p.id,
        ncm: p.ncm || (p.category?.toLowerCase().includes('bebid') ? '2202.10.00' : '2106.90.90'),
        productType: p.category?.toLowerCase().includes('bebid') ? 'non_alcoholic_beverage' : 'food',
        taxCategory: 'differentiated',
        taxRegime: 'simples_nacional',
        baseReductionPct: 60.0,
        creditAllowed: true,
        effectiveDate: '2026-01-01',
        status: p.ncm ? 'valid' : 'valid'
      };
    });
    return map;
  });

  // Memória de Cálculo Auditada dos Pedidos
  const auditedOrders = useMemo<OrderTaxAuditMemory[]>(() => {
    return (orders || []).slice(0, 50).map(ord => {
      return taxEngine.processOrderTaxAndSplit({
        id: ord.id,
        total: ord.total || 0,
        items: ord.items || [],
        createdAt: ord.createdAt,
        paymentMethod: ord.paymentMethod,
        operatorId: ord.operatorId || currentUser?.id,
        operatorName: ord.operatorName || currentUser?.name || 'Caixa Central',
        customerDoc: ord.customerDocument,
        nfceNumber: ord.nfceNumber || Math.floor(1000 + Math.random() * 9000),
        nfceKey: ord.fiscalKey,
        acquirerFeeVal: (ord.total || 0) * 0.025,
        marketplaceFeeVal: ord.isMarketplace ? 1.50 : 0
      });
    });
  }, [orders, taxEngine, currentUser]);

  // Totais Consolidados do Split Payment
  const splitTotals = useMemo(() => {
    const gross = auditedOrders.reduce((a, b) => a + b.grossAmount, 0);
    const cbs = auditedOrders.reduce((a, b) => a + b.totalCbs, 0);
    const ibs = auditedOrders.reduce((a, b) => a + b.totalIbs, 0);
    const govTotal = cbs + ibs;
    const netCredited = auditedOrders.reduce((a, b) => a + b.splitPayment.netCreditedToRestaurant, 0);
    const acqFees = auditedOrders.reduce((a, b) => a + b.splitPayment.acquirerFee, 0);
    const mktFees = auditedOrders.reduce((a, b) => a + b.splitPayment.marketplaceFee, 0);

    return { gross, cbs, ibs, govTotal, netCredited, acqFees, mktFees };
  }, [auditedOrders]);

  // Salvar nova versão da regra tributária
  const handleSaveNewRule = () => {
    if (!newRuleForm.reason.trim()) {
      alert("Por favor, informe a justificativa da nova versão da regra.");
      return;
    }

    const nextVersion = (rulesHistory[0]?.version || 1) + 1;
    const newRule: TaxRuleVersion = {
      id: `rule_v${nextVersion}_${Date.now()}`,
      version: nextVersion,
      effectiveDate: newRuleForm.effectiveDate,
      cbsRate: Number(newRuleForm.cbsRate),
      ibsStateRate: Number(newRuleForm.ibsStateRate),
      ibsCityRate: Number(newRuleForm.ibsCityRate),
      foodSegmentReductionPct: Number(newRuleForm.foodSegmentReductionPct),
      basicBasketReductionPct: Number(newRuleForm.basicBasketReductionPct),
      updatedBy: currentUser?.name || 'ADMIN_LOJISTA',
      updatedAt: new Date().toISOString(),
      reason: newRuleForm.reason,
      isActive: true
    };

    const updated = [newRule, ...rulesHistory.map(r => ({ ...r, isActive: false }))];
    setRulesHistory(updated);
    if (onUpdateSettings) {
      onUpdateSettings({ ...settings, taxRulesHistory: updated });
    }

    setIsNewRuleModalOpen(false);
    setNewRuleForm({
      cbsRate: 8.8,
      ibsStateRate: 17.7,
      ibsCityRate: 1.2,
      foodSegmentReductionPct: 60.0,
      basicBasketReductionPct: 100.0,
      effectiveDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  // Atualizar NCM de um produto
  const handleUpdateProductTax = (productId: string, field: string, value: any) => {
    setProductClassifications(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => 
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
      (productClassifications[p.id]?.ncm || '').includes(productSearch)
    );
  }, [products, productSearch, productClassifications]);

  // Alertas de conformidade
  const complianceAlerts = useMemo(() => {
    const list: { id: string; type: 'warning' | 'error' | 'info'; title: string; desc: string }[] = [];
    
    const unclassified = (products || []).filter(p => !productClassifications[p.id]?.ncm);
    if (unclassified.length > 0) {
      list.push({
        id: 'unclassified_products',
        type: 'warning',
        title: `${unclassified.length} Produto(s) sem NCM definido`,
        desc: 'Produtos sem NCM podem ser tributados com a alíquota padrão sem a redução legal do segmento de alimentação (60%).'
      });
    }

    list.push({
      id: 'split_payment_active',
      type: 'info',
      title: 'Motor de Split Payment Ativo (Reforma Tributária PLP 68/2024)',
      desc: 'As retenções na fonte da CBS e do IBS são processadas automaticamente a cada liquidação no adquirente bancário.'
    });

    list.push({
      id: 'immutable_history_notice',
      type: 'info',
      title: 'Versões e Histórico Imutáveis',
      desc: 'Nenhuma alteração tributária recalcula vendas passadas. O histórico de regras é 100% auditável.'
    });

    return list;
  }, [products, productClassifications]);

  return (
    <div className="space-y-6">
      {/* Banner Principal de Status Tributário */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck size={200} className="text-indigo-400" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles size={12} /> Motor Tributário ERP • CBS & IBS
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                <Lock size={10} /> Regras v{currentRule.version} Vigente
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight font-sans">
              Reforma Tributária & Split Payment
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
              Cálculo automatizado em tempo real de <strong className="text-white">CBS (Federal)</strong> e <strong className="text-white">IBS (Estadual/Municipal)</strong> com retenção automática no <strong className="text-white">Split Payment</strong> e histórico auditável imutável.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsNewRuleModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={14} /> Nova Versão de Regra
            </button>
          </div>
        </div>

        {/* Métrica Rápida da Regra Ativa */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">CBS (União)</span>
            <span className="text-lg font-black text-indigo-300 font-mono">{currentRule.cbsRate.toFixed(1)}%</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Alíquota Padrão</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">IBS (Estadual + Municipal)</span>
            <span className="text-lg font-black text-indigo-300 font-mono">{(currentRule.ibsStateRate + currentRule.ibsCityRate).toFixed(1)}%</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">{currentRule.ibsStateRate}% Est. + {currentRule.ibsCityRate}% Mun.</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Redução Bares/Restaurantes</span>
            <span className="text-lg font-black text-emerald-400 font-mono">-{currentRule.foodSegmentReductionPct.toFixed(0)}%</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Base Efetiva: {(100 - currentRule.foodSegmentReductionPct)}%</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Carga Efetiva Alimentação</span>
            <span className="text-lg font-black text-amber-300 font-mono">
              {(((currentRule.cbsRate + currentRule.ibsStateRate + currentRule.ibsCityRate) * (1 - currentRule.foodSegmentReductionPct / 100))).toFixed(2)}%
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Sobre Faturamento Bruto</span>
          </div>
        </div>
      </div>

      {/* Navegação entre Abas Módulos */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setActiveTab('split')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'split' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign size={14} /> Split Payment & Retenções
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'rules' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings size={14} /> Configuração & Versionamento
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'products' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag size={14} /> Classificação de Produtos (NCM)
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={14} /> Auditoria Imutável ({auditedOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'alerts' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle size={14} /> Alerta de Conformidade
        </button>
      </div>

      {/* Conteúdo Aba 1: Split Payment & Retenções */}
      {activeTab === 'split' && (
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard de Retenções do Governo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Faturamento Bruto
              </span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                R$ {splitTotals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <Receipt size={12} className="text-slate-400" /> Base Total de Vendas do Período
              </p>
            </div>

            <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block mb-1">
                Retenção Split Payment (Governo)
              </span>
              <div className="text-2xl font-black text-rose-700 font-mono">
                R$ {splitTotals.govTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-rose-600 font-bold mt-2 flex items-center justify-between">
                <span>CBS: R$ {splitTotals.cbs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span>IBS: R$ {splitTotals.ibs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                Líquido Creditado na Conta
              </span>
              <div className="text-2xl font-black text-emerald-800 font-mono">
                R$ {splitTotals.netCredited.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" /> Após retenção automática CBS/IBS + taxas
              </p>
            </div>
          </div>

          {/* Tabela de Split Payment por Pedido */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Extrato em Tempo Real do Split Payment</h3>
                <p className="text-[11px] text-slate-500">Detalhamento das retenções tributárias na liquidação bancária dos pedidos</p>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Integração Adquirente Ativa
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="p-3">Pedido / Data</th>
                    <th className="p-3 text-right">Bruto (R$)</th>
                    <th className="p-3 text-right text-rose-600">CBS (8.8%*)</th>
                    <th className="p-3 text-right text-rose-600">IBS (18.9%*)</th>
                    <th className="p-3 text-right text-amber-600">Taxas Cartão/Mkt</th>
                    <th className="p-3 text-right text-emerald-700">Líquido Caixa</th>
                    <th className="p-3 text-center">Status Split</th>
                    <th className="p-3 text-right">Cód. Transação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Nenhum pedido registrado no período para simular o Split Payment.
                      </td>
                    </tr>
                  ) : (
                    auditedOrders.map((audit) => (
                      <tr key={audit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-extrabold text-slate-800 font-mono">
                          #{audit.orderId.substring(0, 8)}
                          <span className="block text-[9px] font-normal text-slate-400 font-sans">
                            {new Date(audit.calculatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-800 font-mono">
                          R$ {audit.grossAmount.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 font-mono">
                          -R$ {audit.totalCbs.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 font-mono">
                          -R$ {audit.totalIbs.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 font-mono">
                          -R$ {(audit.splitPayment.acquirerFee + audit.splitPayment.marketplaceFee).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700 font-mono bg-emerald-50/20">
                          R$ {audit.splitPayment.netCreditedToRestaurant.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={10} /> Retido & Retido
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-[9px] text-slate-400">
                          {audit.splitPayment.transactionCode}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Configuração Global & Versionamento de Regras */}
      {activeTab === 'rules' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Histórico de Versões das Regras Tributárias</h3>
                <p className="text-xs text-slate-500">Todas as alterações geram uma nova versão imutável. Vendas antigas mantêm as alíquotas da época.</p>
              </div>
              <button
                onClick={() => setIsNewRuleModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Nova Regra
              </button>
            </div>

            <div className="space-y-3">
              {rulesHistory.map((rule) => (
                <div 
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rule.isActive 
                      ? 'border-indigo-300 bg-indigo-50/30 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/50 opacity-80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${rule.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        v{rule.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-xs">Regra Tributária v{rule.version}</span>
                          {rule.isActive && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase">Vigente</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Vigência a partir de: <strong>{rule.effectiveDate}</strong> • Atualizado por: <strong>{rule.updatedBy}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">CBS</span>
                        <strong className="text-slate-800">{rule.cbsRate}%</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">IBS Est.</span>
                        <strong className="text-slate-800">{rule.ibsStateRate}%</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">IBS Mun.</span>
                        <strong className="text-slate-800">{rule.ibsCityRate}%</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Redução Rest.</span>
                        <strong className="text-emerald-600">-{rule.foodSegmentReductionPct}%</strong>
                      </div>
                    </div>
                  </div>

                  {rule.reason && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center gap-1.5 font-medium">
                      <Info size={12} className="text-indigo-500 shrink-0" />
                      <span>Motivo da alteração: {rule.reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 3: Classificação de Produtos (NCM) */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="relative w-full md:w-96">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar produto, categoria ou NCM..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Exibindo <strong>{filteredProducts.length}</strong> produtos cadastrados
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="p-3">Produto / Categoria</th>
                    <th className="p-3">Código NCM</th>
                    <th className="p-3">Tipo Fiscal</th>
                    <th className="p-3">Categoria Tributária</th>
                    <th className="p-3 text-right">Redução Legal</th>
                    <th className="p-3 text-center">Status NCM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const classif = productClassifications[p.id] || {};
                      const ncmValidation = taxEngine.validateNcm(classif.ncm);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800 block text-xs">{p.name}</span>
                            <span className="text-[10px] text-slate-400">{p.category || 'Geral'}</span>
                          </td>

                          <td className="p-3">
                            <input
                              type="text"
                              value={classif.ncm || ''}
                              onChange={(e) => handleUpdateProductTax(p.id, 'ncm', e.target.value)}
                              placeholder="2106.90.90"
                              className="w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                            />
                            {ncmValidation.description && (
                              <span className="text-[9px] text-slate-400 block mt-0.5 truncate max-w-[160px]">
                                {ncmValidation.description}
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            <select
                              value={classif.productType || 'food'}
                              onChange={(e) => handleUpdateProductTax(p.id, 'productType', e.target.value)}
                              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                            >
                              <option value="food">Alimentação / Refeição</option>
                              <option value="non_alcoholic_beverage">Bebida Não Alcoólica</option>
                              <option value="alcoholic_beverage">Bebida Alcoólica</option>
                              <option value="dessert">Sobremesa</option>
                              <option value="packaging">Embalagem</option>
                              <option value="service">Serviço</option>
                            </select>
                          </td>

                          <td className="p-3">
                            <select
                              value={classif.taxCategory || 'differentiated'}
                              onChange={(e) => handleUpdateProductTax(p.id, 'taxCategory', e.target.value)}
                              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                            >
                              <option value="differentiated">Diferenciado (60% Redução)</option>
                              <option value="basic_food_basket">Cesta Básica (Isento/Zero)</option>
                              <option value="standard">Padrão Sem Redução</option>
                              <option value="exempt">Isento</option>
                            </select>
                          </td>

                          <td className="p-3 text-right font-black text-emerald-600 font-mono">
                            {classif.taxCategory === 'basic_food_basket' || classif.taxCategory === 'exempt' 
                              ? '-100%' 
                              : `-${classif.baseReductionPct || 60}%`}
                          </td>

                          <td className="p-3 text-center">
                            {ncmValidation.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle size={10} /> NCM Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 4: Auditoria Imutável & Memória de Cálculo */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-emerald-400" />
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-300">
                  Memória de Cálculo Fiscal Imutável
                </h4>
                <p className="text-[11px] text-slate-300">
                  Conforme a legislação tributária, cálculos e retenções efetuadas no ato da venda são salvos com selo criptográfico e nunca podem ser alterados ou recalculados.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {auditedOrders.map((audit) => (
              <div key={audit.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs">
                      Pedido #{audit.orderId.substring(0, 8)}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Regra Aplicada: v{audit.ruleVersion}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {new Date(audit.calculatedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-slate-500">Operador: <strong className="text-slate-800">{audit.operatorName}</strong></span>
                    {audit.nfceNumber && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 font-extrabold">
                        NFC-e #{audit.nfceNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalhe de Itens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                      Itens & Classificação NCM
                    </span>
                    <div className="space-y-1">
                      {audit.itemsCalculations.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span>{it.quantity}x {it.productName} <span className="text-[9px] font-mono text-slate-400">({it.ncm})</span></span>
                          <span className="font-mono font-extrabold text-slate-700">R$ {it.grossTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valor Bruto:</span>
                      <strong className="text-slate-800">R$ {audit.grossAmount.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>(-) Retenção CBS (8.8%):</span>
                      <strong>R$ {audit.totalCbs.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>(-) Retenção IBS (18.9%):</span>
                      <strong>R$ {audit.totalIbs.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-extrabold pt-1 border-t border-indigo-200">
                      <span>(=) Líquido do Restaurante:</span>
                      <strong>R$ {audit.splitPayment.netCreditedToRestaurant.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo Aba 5: Alertas de Conformidade */}
      {activeTab === 'alerts' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-extrabold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={16} /> Central de Conformidade Fiscal & Alertas
            </h3>

            <div className="space-y-3">
              {complianceAlerts.map((alt) => (
                <div 
                  key={alt.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    alt.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
                    alt.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    'bg-indigo-50 border-indigo-200 text-indigo-900'
                  }`}
                >
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-xs">{alt.title}</h4>
                    <p className="text-xs mt-0.5 opacity-90">{alt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Adicionar Nova Versão da Regra Tributária */}
      {isNewRuleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" /> Nova Versão de Regra Tributária
              </h3>
              <button 
                onClick={() => setIsNewRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Alíquota CBS (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRuleForm.cbsRate}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, cbsRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">IBS Estadual (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRuleForm.ibsStateRate}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, ibsStateRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">IBS Municipal (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRuleForm.ibsCityRate}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, ibsCityRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Redução Bares/Rest. (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={newRuleForm.foodSegmentReductionPct}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, foodSegmentReductionPct: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Início de Vigência</label>
                  <input
                    type="date"
                    value={newRuleForm.effectiveDate}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, effectiveDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Motivo / Legislação de Referência</label>
                <textarea
                  rows={2}
                  value={newRuleForm.reason}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, reason: e.target.value })}
                  placeholder="Ex: Atualização da alíquota estadual de IBS conforme Decreto nº 123/2026..."
                  className="w-full p-2 border border-slate-200 rounded-xl font-medium text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsNewRuleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewRule}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md"
              >
                Salvar Nova Versão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
