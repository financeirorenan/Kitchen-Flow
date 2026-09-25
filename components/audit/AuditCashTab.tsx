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
import { isDateInRange, AuditPeriodRange } from '../../services/auditService';

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

  // Calcular totais gerais de caixa
  let totalRegisteredSales = 0;
  let totalReceivedPayments = 0;
  orders.forEach(o => {
    if (isDateInRange(o.createdAt, range) && o.status !== 'canceled') {
      totalRegisteredSales += Number(o.total || 0);
      if (o.paymentStatus === 'paid' || (o.payments && o.payments.length > 0)) {
        totalReceivedPayments += Number(o.total || 0);
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

      {/* Tabela de Fechamentos de Caixa e Quebras/Sobras */}
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
