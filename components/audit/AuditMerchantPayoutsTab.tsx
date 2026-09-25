import React, { useState } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  X, 
  ShoppingBag, 
  Calendar, 
  ChevronRight, 
  Receipt, 
  Percent, 
  FileSpreadsheet,
  Download,
  Building2,
  Lock
} from 'lucide-react';
import { 
  MerchantPayoutAuditItem, 
  exportToCSV, 
  AuditPeriodRange 
} from '../../services/auditService';
import { Order } from '../../types';

interface AuditMerchantPayoutsTabProps {
  payouts?: MerchantPayoutAuditItem[];
  allOrders?: Order[];
  range: AuditPeriodRange;
  merchantName?: string;
  onSelectOrder?: (orderId: string) => void;
}

export const AuditMerchantPayoutsTab: React.FC<AuditMerchantPayoutsTabProps> = ({
  payouts = [],
  allOrders = [],
  range,
  merchantName,
  onSelectOrder
}) => {
  const [selectedPayout, setSelectedPayout] = useState<MerchantPayoutAuditItem | null>(null);

  const safePayouts = Array.isArray(payouts) ? payouts : [];
  const safeAllOrders = Array.isArray(allOrders) ? allOrders : [];

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalGross = safePayouts.reduce((acc, p) => acc + (p.totalGrossSold || 0), 0);
  const totalCommission = safePayouts.reduce((acc, p) => acc + (p.platformCommission || 0) + (p.paymentGatewayFees || 0), 0);
  const totalSettled = safePayouts.reduce((acc, p) => acc + (p.amountSettled || 0), 0);
  const totalPending = safePayouts.reduce((acc, p) => acc + (p.amountPending || 0), 0);

  // Pedidos vinculados ao repasse selecionado
  const payoutOrders = selectedPayout 
    ? safeAllOrders.filter(o => o && selectedPayout.orderIds && selectedPayout.orderIds.includes(o.id))
    : [];

  const handleExportPayouts = () => {
    const rows = safePayouts.map(p => ({
      ID: p.id,
      Ciclo: p.periodLabel,
      Inicio: p.startDate.toLocaleDateString('pt-BR'),
      Fim: p.endDate.toLocaleDateString('pt-BR'),
      Vendas_Brutas: p.totalGrossSold.toFixed(2),
      Cancelamentos: p.totalCanceled.toFixed(2),
      Estornos: p.totalReversals.toFixed(2),
      Descontos: p.totalDiscounts.toFixed(2),
      Comissao_Plataforma: p.platformCommission.toFixed(2),
      Taxas_Processamento: p.paymentGatewayFees.toFixed(2),
      Ajustes: p.manualAdjustments.toFixed(2),
      Valor_Liquido: p.netPayoutDue.toFixed(2),
      Valor_Repassado: p.amountSettled.toFixed(2),
      Valor_Pendente: p.amountPending.toFixed(2),
      Status: p.status,
      Data_Repasse: p.payoutDate ? new Date(p.payoutDate).toLocaleDateString('pt-BR') : 'Pendente',
      Responsavel: p.responsibleUser || 'Sistema'
    }));

    exportToCSV(`Repasses_Lojista_${merchantName || 'Audit'}_${range.label.replace(/\s+/g, '_')}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Resumo Consolidado de Repasses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Total Vendido Apurado</span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{formatCurrency(totalGross)}</div>
          <span className="text-[10px] text-slate-500">Volume transacionado nos ciclos</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-bold">Comissões & Taxas Retidas</span>
            <Percent className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-950">{formatCurrency(totalCommission)}</div>
          <span className="text-[10px] text-purple-700">Comissão de plataforma + gateway</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold">Total Liquidado / Repassado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-950">{formatCurrency(totalSettled)}</div>
          <span className="text-[10px] text-emerald-700">Transferido para conta do lojista</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold">Total Pendente de Repasse</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-950">{formatCurrency(totalPending)}</div>
          <span className="text-[10px] text-amber-700">Ciclos em fechamento</span>
        </div>
      </div>

      {/* Tabela de Repasses */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                Extrato Analítico de Repasses ao Lojista
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {payouts.length} Ciclos
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Auditoria de cada repasse com apuração de deduções, comissões e pedidos associados.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportPayouts}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Repasses (CSV)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Ciclo / Período</th>
                <th className="px-4 py-3">Total Vendido</th>
                <th className="px-4 py-3">Cancelamentos</th>
                <th className="px-4 py-3">Descontos</th>
                <th className="px-4 py-3">Comissão Plataforma</th>
                <th className="px-4 py-3">Taxas Gateway</th>
                <th className="px-4 py-3">Valor Líquido</th>
                <th className="px-4 py-3">Status Repasse</th>
                <th className="px-4 py-3">Data / Responsável</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    Nenhum ciclo de repasse apurado para o período selecionado.
                  </td>
                </tr>
              ) : (
                payouts.map(payout => (
                  <tr 
                    key={payout.id} 
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <div>{payout.periodLabel}</div>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {payout.startDate.toLocaleDateString('pt-BR')} - {payout.endDate.toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {formatCurrency(payout.totalGrossSold)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {payout.ordersCount} pedidos
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-rose-600">
                      {payout.totalCanceled > 0 ? `-${formatCurrency(payout.totalCanceled)}` : 'R$ 0,00'}
                    </td>

                    <td className="px-4 py-3 font-semibold text-amber-700">
                      {payout.totalDiscounts > 0 ? `-${formatCurrency(payout.totalDiscounts)}` : 'R$ 0,00'}
                    </td>

                    <td className="px-4 py-3 font-semibold text-purple-700">
                      -{formatCurrency(payout.platformCommission)}
                    </td>

                    <td className="px-4 py-3 font-semibold text-purple-600">
                      -{formatCurrency(payout.paymentGatewayFees)}
                    </td>

                    <td className="px-4 py-3 font-black text-slate-900">
                      {formatCurrency(payout.netPayoutDue)}
                    </td>

                    <td className="px-4 py-3">
                      {payout.status === 'liquidated' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Liquidado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Em Processamento
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      <div>
                        {payout.payoutDate 
                          ? new Date(payout.payoutDate).toLocaleDateString('pt-BR') 
                          : 'Previsto ao término'}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {payout.responsibleUser || 'Automático'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayout(payout)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Pedidos
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES: PEDIDOS QUE COMPÕEM O REPASSE */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    Composição do Repasse: {selectedPayout.periodLabel}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {payoutOrders.length} pedidos apurados • Total Líquido: {formatCurrency(selectedPayout.netPayoutDue)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Cálculo deste Repasse */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Vendas Brutas:</span>
                <div className="font-bold text-slate-800">{formatCurrency(selectedPayout.totalGrossSold)}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Descontos + Estornos:</span>
                <div className="font-bold text-rose-600">
                  -{formatCurrency(selectedPayout.totalDiscounts + selectedPayout.totalReversals)}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Comissão da Plataforma:</span>
                <div className="font-bold text-purple-700">
                  -{formatCurrency(selectedPayout.platformCommission + selectedPayout.paymentGatewayFees)}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Valor Líquido Devido:</span>
                <div className="font-black text-emerald-700 text-sm">{formatCurrency(selectedPayout.netPayoutDue)}</div>
              </div>
            </div>

            {/* Lista dos Pedidos Integrantes */}
            <div className="overflow-y-auto p-5 flex-1 divide-y divide-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                Pedidos Vinculados ao Ciclo
              </h4>
              {payoutOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum registro de pedido individual retornado para este ciclo.
                </div>
              ) : (
                payoutOrders.map(order => (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-slate-600 truncate">
                          {order.customerName || 'Cliente Balcão'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.items?.length || 0} itens • Canal: {order.source || 'PDV'} • Pagamento: {order.paymentMethod || 'Dinheiro'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          {formatCurrency(order.total)}
                        </div>
                        {order.discount ? (
                          <div className="text-[10px] text-amber-700">
                            Desc: -{formatCurrency(order.discount)}
                          </div>
                        ) : null}
                      </div>

                      {onSelectOrder && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayout(null);
                            onSelectOrder(order.id);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="Auditar este pedido"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
