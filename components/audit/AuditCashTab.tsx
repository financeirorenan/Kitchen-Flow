import React from 'react';
import { 
  CashClosingReport, 
  CashSession, 
  Order, 
  FinancialRecord 
} from '../../types';
import { 
  DollarSign, 
  ArrowDownRight, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  UserCheck 
} from 'lucide-react';
import { isDateInRange, AuditPeriodRange, calculateMasterEquationByChannel } from '../../services/auditService';

interface AuditCashTabProps {
  cashClosings: CashClosingReport[];
  cashSession: CashSession;
  orders: Order[];
  financialRecords: FinancialRecord[];
  range: AuditPeriodRange;
}

export const AuditCashTab: React.FC<AuditCashTabProps> = ({
  cashClosings,
  cashSession,
  orders,
  financialRecords,
  range
}) => {
  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtrar fechamentos no período
  const periodClosings = cashClosings.filter(c => isDateInRange(c.closedAt, range));

  // Equação Mestre por Canal
  const masterEquation = calculateMasterEquationByChannel({ orders, range });

  // Calcular totais gerais de caixa
  let totalRegisteredSales = 0;
  let totalReceivedPayments = 0;
  orders.forEach(o => {
    if (isDateInRange(o.createdAt, range) && o.status !== 'canceled' && o.status !== 'cancelled') {
      totalRegisteredSales += Number(o.total || 0);
      if (o.paymentStatus === 'paid' || (o.payments && o.payments.length > 0) || o.status === 'delivered' || o.status === 'finished') {
        const orderPaymentsSum = o.payments && o.payments.length > 0
          ? o.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
          : Number(o.total || 0);
        totalReceivedPayments += orderPaymentsSum;
      }
    }
  });

  let totalBleeds = 0;
  let totalSupplies = 0;
  let totalAdjustments = 0;
  financialRecords.forEach(r => {
    if (isDateInRange(r.date, range)) {
      const cat = (r.category || '').toLowerCase();
      const amt = Math.abs(Number(r.amount || 0));
      if (cat.includes('sangria')) totalBleeds += amt;
      else if (cat.includes('suprimento')) totalSupplies += amt;
      else if (cat.includes('ajuste')) totalAdjustments += amt;
    }
  });

  return (
    <div className="space-y-4">
      {/* 4 Cards de Conciliação Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Vendas Registradas</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(totalRegisteredSales)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Soma de pedidos PDV/Mesas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Valores Recebidos</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalReceivedPayments)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Quitado em dinheiro, cartões e Pix</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Sangrias (Saídas)</span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {formatCurrency(totalBleeds)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Retiradas físicas registradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Suprimentos (Entradas)</span>
          <div className="text-xl font-black text-cyan-700 mt-1">
            {formatCurrency(totalSupplies)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Aportes e fundo de troco</span>
        </div>
      </div>

      {/* PAINEL EQUAÇÃO MESTRE POR CANAL (AUDITORIA RIGOROSA) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
              masterEquation.isAllBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              ⚖️
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                EQUAÇÃO MESTRE: Soma dos Pedidos por Canal = Entradas no Caixa por Canal
                {masterEquation.isAllBalanced ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 100% Batendo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Divergência Detectada ({formatCurrency(masterEquation.totalDifference)})
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria cruzada rigorosa: Mesa, Balcão, Delivery e Marketplace sem omissões ou duplicações.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
            KDS: <span className="font-black text-slate-900">{masterEquation.kdsTotalOrders} pedidos emitidos</span> ({masterEquation.kdsDispatchedOrders} despachados)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Canal de Venda</th>
                <th className="py-3 px-3">Pedidos</th>
                <th className="py-3 px-3">Subtotal Itens</th>
                <th className="py-3 px-3">Taxa Entrega</th>
                <th className="py-3 px-3">Descontos</th>
                <th className="py-3 px-3">Soma Pedidos (Total)</th>
                <th className="py-3 px-3">Entradas Caixa (Pago)</th>
                <th className="py-3 px-3">Taxas Cartão Est.</th>
                <th className="py-3 px-3">Divergência</th>
                <th className="py-3 px-3">Conformidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {masterEquation.channels.map(ch => (
                <tr key={ch.channel} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    {ch.channelLabel}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">{ch.ordersCount}</td>
                  <td className="py-3 px-3 text-slate-600">{formatCurrency(ch.ordersGrossSum)}</td>
                  <td className="py-3 px-3 text-slate-600">{ch.ordersDeliveryFeesSum > 0 ? formatCurrency(ch.ordersDeliveryFeesSum) : '-'}</td>
                  <td className="py-3 px-3 text-rose-600">{ch.ordersDiscountsSum > 0 ? `-${formatCurrency(ch.ordersDiscountsSum)}` : '-'}</td>
                  <td className="py-3 px-3 font-black text-slate-900">{formatCurrency(ch.ordersNetSum)}</td>
                  <td className="py-3 px-3 font-black text-emerald-700">{formatCurrency(ch.cashEntriesSum)}</td>
                  <td className="py-3 px-3 text-slate-500">
                    {ch.cardFeesEstimated > 0 ? (
                      <span title="Bruto - Taxa = Líquido">
                        {formatCurrency(ch.cardFeesEstimated)} <span className="text-[10px] text-slate-400">({formatCurrency(ch.netRevenueEstimated)} líq.)</span>
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    {ch.isBalanced ? (
                      <span className="text-emerald-700 font-bold">R$ 0,00</span>
                    ) : (
                      <span className="text-rose-600 font-black">
                        {formatCurrency(ch.difference)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {ch.isBalanced ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" /> Bateu Exato
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                        <AlertTriangle className="w-3 h-3" /> Divergente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-900">
                <td className="py-3 px-3.5 uppercase text-[11px]">TOTAL GERAL</td>
                <td className="py-3 px-3">{masterEquation.channels.reduce((s, c) => s + c.ordersCount, 0)}</td>
                <td className="py-3 px-3">{formatCurrency(masterEquation.totalOrdersGross)}</td>
                <td className="py-3 px-3">{formatCurrency(masterEquation.totalDeliveryFees)}</td>
                <td className="py-3 px-3 text-rose-700">-{formatCurrency(masterEquation.totalDiscounts)}</td>
                <td className="py-3 px-3 text-indigo-950 font-black">{formatCurrency(masterEquation.totalOrdersNet)}</td>
                <td className="py-3 px-3 text-emerald-800 font-black">{formatCurrency(masterEquation.totalCashEntries)}</td>
                <td className="py-3 px-3 text-slate-600">{formatCurrency(masterEquation.channels.reduce((s, c) => s + c.cardFeesEstimated, 0))}</td>
                <td className="py-3 px-3 font-mono">
                  {masterEquation.isAllBalanced ? (
                    <span className="text-emerald-700">R$ 0,00</span>
                  ) : (
                    <span className="text-rose-700 font-black">{formatCurrency(masterEquation.totalDifference)}</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  {masterEquation.isAllBalanced ? (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-600 text-white flex items-center gap-1 w-max">
                      ✓ Equação Fechada
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1 w-max">
                      ⚠ Não Fecha
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Auditoria de Fechamentos de Caixa & Conferência Cega
            </h3>
            <span className="text-xs text-slate-500">
              Confronto entre Saldo Esperado (Sistema) e Saldo Informado (Operador)
            </span>
          </div>
          <div className="text-xs font-bold text-slate-500">
            {periodClosings.length} fechamento{periodClosings.length !== 1 ? 's' : ''} auditado{periodClosings.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Data / Hora Fechamento</th>
                <th className="py-3 px-3">Operador</th>
                <th className="py-3 px-3">Abertura</th>
                <th className="py-3 px-3">Vendas Totais</th>
                <th className="py-3 px-3">Saldo Esperado</th>
                <th className="py-3 px-3">Saldo Informado</th>
                <th className="py-3 px-3">Diferença (Quebra/Sobra)</th>
                <th className="py-3 px-3">Status Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodClosings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum fechamento de caixa registrado no período selecionado.
                  </td>
                </tr>
              ) : (
                periodClosings.map(closing => {
                  const diff = Number(closing.difference || 0);
                  const isExact = Math.abs(diff) < 0.05;
                  const isShortage = diff < -0.05;

                  return (
                    <tr key={closing.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-900 block">
                          {new Date(closing.closedAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(closing.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {closing.closedBy || 'Operador'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-bold">
                        {formatCurrency(closing.openingValue)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(closing.totalSales)}
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-900">
                        {formatCurrency(closing.expectedValue)}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        {formatCurrency(closing.actualValue)}
                      </td>
                      <td className="py-3 px-3">
                        {isExact ? (
                          <span className="text-emerald-700 font-black">R$ 0,00 (Exato)</span>
                        ) : isShortage ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Falta: {formatCurrency(Math.abs(diff))}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            Sobra: +{formatCurrency(diff)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isExact ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            Conciliado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                            <ShieldAlert className="w-3 h-3" />
                            Divergência
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
  );
};
