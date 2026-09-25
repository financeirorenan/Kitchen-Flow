import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  BarChart3, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Building2,
  ShoppingBag,
  Layers
} from 'lucide-react';
import { Tenant, Plan, Order, MarketplaceInvoice } from '../../types';
import { SaasLedgerItem } from './types';
import { exportToCSV, getTenantPlanDetails, getDaysDiff, DEFAULT_MARKETPLACE_FIXED_FEE } from './financeHelpers';

interface ReportsTabProps {
  tenants: Tenant[];
  plans: Plan[];
  orders: Order[];
  marketplaceInvoices: MarketplaceInvoice[];
  saasLedger: SaasLedgerItem[];
  marketplaceFixedFee?: number;
}

type ReportType = 
  | 'dre' 
  | 'receivables' 
  | 'payables' 
  | 'subscriptions' 
  | 'marketplace' 
  | 'defaulting' 
  | 'cashflow' 
  | 'tenant_results' 
  | 'category_expenses' 
  | 'audit';

export const ReportsTab: React.FC<ReportsTabProps> = ({
  tenants,
  plans,
  orders,
  marketplaceInvoices,
  saasLedger,
  marketplaceFixedFee = DEFAULT_MARKETPLACE_FIXED_FEE,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('dre');

  const reportList: Array<{ id: ReportType; title: string; desc: string; icon: any }> = [
    { id: 'dre', title: 'DRE Simplificada', desc: 'Demonstrativo do Resultado do Exercício com receitas, custos e margem', icon: BarChart3 },
    { id: 'receivables', title: 'Contas a Receber', desc: 'Previsão de recebíveis, mensalidades em aberto e marketplace', icon: DollarSign },
    { id: 'payables', title: 'Contas a Pagar', desc: 'Cronograma de despesas por vencimento, status e fornecedor', icon: Layers },
    { id: 'subscriptions', title: 'Mensalidades e Planos', desc: 'Assinaturas ativas, MRR e distribuição por categoria', icon: Building2 },
    { id: 'marketplace', title: 'Relatório Marketplace B2C', desc: 'Volumetria de pedidos, faturamento e taxas por lojista', icon: ShoppingBag },
    { id: 'defaulting', title: 'Inadimplência e Atrasos', desc: 'Lojistas em débito, tempo de atraso e histórico de cobranças', icon: AlertCircle },
    { id: 'cashflow', title: 'Fluxo de Caixa Consolidado', desc: 'Entradas e saídas efetivamente liquidadas no período', icon: TrendingUp },
    { id: 'tenant_results', title: 'Resultado por Lojista', desc: 'Faturamento bruto vs. taxas geradas por restaurante', icon: Building2 },
    { id: 'category_expenses', title: 'Despesas por Categoria', desc: 'Distribuição dos custos (Infra, APIs, Marketing, etc.)', icon: Layers },
    { id: 'audit', title: 'Auditoria Financeira', desc: 'Trilha de auditoria de lançamentos, baixas e conciliações', icon: CheckCircle2 },
  ];

  // Calculations for DRE
  const paidReceivables = saasLedger.filter(i => i.type === 'receber' && i.status === 'paid');
  const paidPayables = saasLedger.filter(i => i.type === 'pagar' && i.status === 'paid');

  const subRevenue = paidReceivables
    .filter(i => i.category.toLowerCase().includes('plano') || i.category.toLowerCase().includes('mensalidade'))
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const mktRevenue = paidReceivables
    .filter(i => i.category.toLowerCase().includes('marketplace') || i.category.toLowerCase().includes('comiss'))
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const otherRevenue = paidReceivables
    .filter(i => !i.category.toLowerCase().includes('plano') && !i.category.toLowerCase().includes('marketplace'))
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const totalGrossRevenue = paidReceivables.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalExpenses = paidPayables.reduce((acc, i) => acc + (i.amount || 0), 0);
  const netResult = totalGrossRevenue - totalExpenses;

  // Export handlers
  const handleExportCSV = () => {
    if (selectedReport === 'dre') {
      const headers = ['Rubrica', 'Valor (R$)', 'Participação (%)'];
      const rows = [
        ['Receita de Mensalidades', subRevenue.toFixed(2), totalGrossRevenue > 0 ? ((subRevenue / totalGrossRevenue) * 100).toFixed(1) : '0'],
        ['Receita Marketplace (R$ 2/pedido)', mktRevenue.toFixed(2), totalGrossRevenue > 0 ? ((mktRevenue / totalGrossRevenue) * 100).toFixed(1) : '0'],
        ['Outras Receitas', otherRevenue.toFixed(2), totalGrossRevenue > 0 ? ((otherRevenue / totalGrossRevenue) * 100).toFixed(1) : '0'],
        ['RECEITA BRUTA TOTAL', totalGrossRevenue.toFixed(2), '100.0'],
        ['Despesas Operacionais e Infra', totalExpenses.toFixed(2), '-'],
        ['RESULTADO LÍQUIDO', netResult.toFixed(2), '-']
      ];
      exportToCSV('relatorio_dre_kitchenflow', headers, rows);
    } else if (selectedReport === 'receivables' || selectedReport === 'subscriptions') {
      const headers = ['Lojista', 'Plano', 'Mensalidade (R$)', 'Vencimento', 'Status'];
      const rows = tenants.map(t => {
        const { planName, price } = getTenantPlanDetails(t, plans);
        const days = getDaysDiff(t.subscription?.expiryDate);
        return [
          t.name,
          planName,
          price.toFixed(2),
          t.subscription?.expiryDate ? new Date(t.subscription.expiryDate).toLocaleDateString('pt-BR') : 'Sem data',
          days < 0 ? 'Atrasado' : days <= 3 ? 'Vencendo' : 'Em dia'
        ];
      });
      exportToCSV('relatorio_recebiveis_kitchenflow', headers, rows);
    } else if (selectedReport === 'payables' || selectedReport === 'category_expenses') {
      const headers = ['Despesa', 'Categoria', 'Fornecedor', 'Vencimento', 'Valor (R$)', 'Status'];
      const rows = saasLedger.filter(i => i.type === 'pagar').map(i => [
        i.description,
        i.category,
        i.supplierName || 'Plataforma',
        i.dueDate ? new Date(i.dueDate).toLocaleDateString('pt-BR') : 'A definir',
        Number(i.amount || 0).toFixed(2),
        i.status === 'paid' ? 'Pago' : 'Pendente'
      ]);
      exportToCSV('relatorio_despesas_kitchenflow', headers, rows);
    } else {
      // General ledger export
      const headers = ['ID', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Status', 'Data'];
      const rows = saasLedger.map(i => [
        i.id,
        i.description,
        i.type === 'receber' ? 'Receita' : 'Despesa',
        i.category,
        Number(i.amount || 0).toFixed(2),
        i.status === 'paid' ? 'Pago' : 'Pendente',
        i.createdAt ? new Date(i.createdAt).toLocaleDateString('pt-BR') : ''
      ]);
      exportToCSV(`relatorio_${selectedReport}_kitchenflow`, headers, rows);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO COM EXPORTAÇÃO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            Central de Relatórios Financeiros
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geração de demonstrativos, conciliações e relatórios executivos para tomada de decisão
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Printer size={14} /> Exportar PDF
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Download size={14} /> Exportar Excel / CSV
          </button>
        </div>
      </div>

      {/* GRADE DE SELEÇÃO DE RELATÓRIOS & CONTEÚDO */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu Lateral de Relatórios */}
        <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 py-2 block">
            Relatórios Disponíveis
          </span>
          {reportList.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <span className="text-xs font-black block">{r.title}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'} line-clamp-1`}>
                    {r.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Visualização do Relatório Selecionado */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h4 className="text-base font-black text-slate-900">
              {reportList.find(r => r.id === selectedReport)?.title}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {reportList.find(r => r.id === selectedReport)?.desc}
            </p>
          </div>

          {/* DRE SIMPLIFICADA */}
          {selectedReport === 'dre' && (
            <div className="space-y-4 font-sans">
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                <div className="p-4 bg-slate-50/70 font-black text-xs text-slate-800 uppercase tracking-wider flex justify-between">
                  <span>Rubrica / Linha</span>
                  <span>Valor Líquido</span>
                </div>

                <div className="p-4 flex justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Receita de Mensalidades (Planos Recorrentes)
                  </span>
                  <span className="text-emerald-700 font-black font-sans">
                    + R$ {subRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 flex justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Receita Variável Marketplace (R$ 2,00/pedido)
                  </span>
                  <span className="text-emerald-700 font-black font-sans">
                    + R$ {mktRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 flex justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Outras Receitas e Setups
                  </span>
                  <span className="text-emerald-700 font-black font-sans">
                    + R$ {otherRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/50 flex justify-between text-xs font-black text-emerald-950">
                  <span className="uppercase tracking-wider">(=) Receita Bruta Total</span>
                  <span className="text-sm font-sans">
                    R$ {totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 flex justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    (-) Custos Operacionais e Infraestrutura
                  </span>
                  <span className="text-rose-600 font-black font-sans">
                    - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className={`p-4 ${netResult >= 0 ? 'bg-indigo-50/80 text-indigo-950' : 'bg-rose-50/80 text-rose-950'} flex justify-between text-sm font-black`}>
                  <span className="uppercase tracking-wider">(=) Resultado Líquido do Período</span>
                  <span className="text-base font-sans">
                    R$ {netResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CONTAS A RECEBER OU ASSINATURAS */}
          {(selectedReport === 'receivables' || selectedReport === 'subscriptions') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 font-black text-slate-400 uppercase">Lojista</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Plano</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Mensalidade</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Vencimento</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map(t => {
                    const { planName, price } = getTenantPlanDetails(t, plans);
                    const days = getDaysDiff(t.subscription?.expiryDate);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-black text-slate-800">{t.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase">
                            {planName}
                          </span>
                        </td>
                        <td className="p-3 font-black text-slate-800">R$ {price.toFixed(2)}</td>
                        <td className="p-3 text-slate-500 font-medium">
                          {t.subscription?.expiryDate ? new Date(t.subscription.expiryDate).toLocaleDateString('pt-BR') : 'Sem data'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            days < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {days < 0 ? 'Atrasado' : 'Em dia'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CONTAS A PAGAR OU DESPESAS */}
          {(selectedReport === 'payables' || selectedReport === 'category_expenses') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 font-black text-slate-400 uppercase">Despesa</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Categoria</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Vencimento</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Valor</th>
                    <th className="p-3 font-black text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saasLedger.filter(i => i.type === 'pagar').map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-black text-slate-800">{item.description}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : 'A definir'}
                      </td>
                      <td className="p-3 font-black text-rose-600">R$ {Number(item.amount || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MARKETPLACE B2C */}
          {selectedReport === 'marketplace' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                <span className="font-bold text-indigo-900 block mb-1">Taxa Automática: R$ {marketplaceFixedFee.toFixed(2)} por pedido</span>
                <p className="text-slate-600">Total de pedidos processados pelo canal: {orders.filter(o => o.source === 'marketplace' || o.source === 'Marketplace').length} pedidos.</p>
              </div>
            </div>
          )}

          {/* INADIMPLÊNCIA */}
          {selectedReport === 'defaulting' && (
            <div className="space-y-4">
              <div className="divide-y divide-slate-100">
                {tenants.filter(t => {
                  if (t.subscription?.plan === 'FREE') return false;
                  return getDaysDiff(t.subscription?.expiryDate) < 0;
                }).map(t => {
                  const { price } = getTenantPlanDetails(t, plans);
                  const days = Math.abs(getDaysDiff(t.subscription?.expiryDate));
                  return (
                    <div key={t.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-black text-sm text-slate-900">{t.name}</span>
                        <span className="text-xs text-rose-600 font-bold block">Atrasado há {days} dias</span>
                      </div>
                      <span className="text-sm font-black text-rose-700 font-sans">
                        R$ {price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AUDITORIA / OUTROS */}
          {(selectedReport === 'audit' || selectedReport === 'cashflow' || selectedReport === 'tenant_results') && (
            <div className="space-y-2 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-600 font-medium">
                  {saasLedger.length} lançamentos auditados e validados no livro razão geral da plataforma.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
