import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { AuditMetricsSummary, exportToCSV, AuditPeriodRange } from '../../services/auditService';
import { Order, FinancialRecord, Customer, AuditLog, AuditInconsistency } from '../../types';

interface AuditReportsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: AuditMetricsSummary;
  range: AuditPeriodRange;
  orders: Order[];
  financialRecords: FinancialRecord[];
  inconsistencies: AuditInconsistency[];
  auditLogs: AuditLog[];
  merchantName?: string;
}

export const AuditReportsExportModal: React.FC<AuditReportsExportModalProps> = ({
  isOpen,
  onClose,
  metrics,
  range,
  orders,
  financialRecords,
  inconsistencies,
  auditLogs,
  merchantName
}) => {
  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleExportCSV = () => {
    const rows = [
      { Indicador: 'Estabelecimento / Lojista', Valor: merchantName || 'Todos os Estabelecimentos' },
      { Indicador: 'Total de Pedidos Realizados', Valor: metrics.totalOrdersCount },
      { Indicador: 'Total de Pedidos Cancelados', Valor: metrics.canceledOrdersCount },
      { Indicador: 'Total de Pedidos Alterados', Valor: metrics.alteredOrdersCount },
      { Indicador: 'Total Vendido (Faturamento Bruto)', Valor: metrics.totalSold.toFixed(2) },
      { Indicador: 'Total Recebido (Quitado)', Valor: metrics.totalReceived.toFixed(2) },
      { Indicador: 'Total em Aberto (Fiado/Pendente)', Valor: metrics.totalOpenPending.toFixed(2) },
      { Indicador: 'Total Baixado (Contas a Receber)', Valor: metrics.totalSettled.toFixed(2) },
      { Indicador: 'Total de Descontos Concedidos', Valor: metrics.totalDiscounts.toFixed(2) },
      { Indicador: 'Total de Estornos Realizados', Valor: metrics.totalReversals.toFixed(2) },
      { Indicador: 'Total de Sangrias de Caixa', Valor: metrics.totalBleeds.toFixed(2) },
      { Indicador: 'Total de Suprimentos de Caixa', Valor: metrics.totalSupplies.toFixed(2) },
      { Indicador: 'Ajustes Financeiros Manuais', Valor: metrics.totalFinancialAdjustments.toFixed(2) },
      { Indicador: 'Diferenças de Caixa / Inconsistências', Valor: metrics.totalDiscrepancies },
      { Indicador: 'Operações Suspeitas Identificadas', Valor: metrics.totalSuspiciousOperations },
      { Indicador: 'Alterações Efetuadas por Usuários', Valor: metrics.userChangesCount }
    ];

    const safeName = merchantName ? merchantName.replace(/[^a-zA-Z0-9]/g, '_') : 'Plataforma';
    exportToCSV(`Relatorio_Auditoria_${safeName}_${range.label.replace(/\s+/g, '_')}`, rows);
  };

  const handleExportOrdersCSV = () => {
    const rows = orders.map(o => ({
      ID: o.id,
      Lojista: merchantName || (o as any).tenantName || (o as any).tenantId || 'Lojista',
      Data: new Date(o.createdAt).toLocaleString('pt-BR'),
      Cliente: o.customerName || 'Balcão',
      Canal: o.source || 'PDV',
      Itens: o.items?.length || 0,
      Total: Number(o.total || 0).toFixed(2),
      Desconto: Number(o.discount || 0).toFixed(2),
      Status: o.status,
      Pagamento: o.paymentStatus || 'pending'
    }));

    const safeName = merchantName ? merchantName.replace(/[^a-zA-Z0-9]/g, '_') : 'Plataforma';
    exportToCSV(`Pedidos_Auditados_${safeName}_${range.label.replace(/\s+/g, '_')}`, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">
                Exportar Relatório Executivo de Auditoria
              </h3>
              <span className="text-xs text-slate-500">
                Período selecionado: {range.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo Consolidado do Período */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Faturamento Total:</span>
            <span className="font-black text-slate-900">{formatCurrency(metrics.totalSold)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Total Recebido / Baixado:</span>
            <span className="font-black text-emerald-700">{formatCurrency(metrics.totalReceived + metrics.totalSettled)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Descontos + Estornos:</span>
            <span className="font-black text-purple-700">{formatCurrency(metrics.totalDiscounts + metrics.totalReversals)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">Inconsistências Detectadas:</span>
            <span className={`font-black ${inconsistencies.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {inconsistencies.length} apontamentos
            </span>
          </div>
        </div>

        {/* Opções de Exportação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-xs font-black text-slate-900">Resumo Executivo (CSV / Excel)</div>
            <p className="text-[10px] text-slate-400">Indicadores e KPIs consolidados</p>
          </button>

          <button
            type="button"
            onClick={handleExportOrdersCSV}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-xs font-black text-slate-900">Pedidos Detalhados (CSV)</div>
            <p className="text-[10px] text-slate-400">Todos os pedidos com valores e status</p>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <div className="text-xs font-black text-slate-900">Imprimir / Salvar PDF</div>
            <p className="text-[10px] text-slate-400">Layout formatado para documento</p>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
