import React, { useState } from 'react';
import { 
  Order, 
  AuditLog, 
  User 
} from '../../types';
import { 
  Tag, 
  Trophy, 
  Percent, 
  Search, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert 
} from 'lucide-react';
import { buildDiscountsRanking, isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditDiscountsTabProps {
  orders: Order[];
  auditLogs: AuditLog[];
  users: User[];
  range: AuditPeriodRange;
  onOpenOrder: (orderId: string) => void;
  discountThresholdPercent?: number;
}

export const AuditDiscountsTab: React.FC<AuditDiscountsTabProps> = ({
  orders,
  auditLogs,
  users,
  range,
  onOpenOrder,
  discountThresholdPercent = 20
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const { ranking, highestDiscount, averageDiscount, totalDiscountSum } = buildDiscountsRanking(orders, auditLogs, range);

  // Pedidos com desconto no período
  const discountedOrders = orders.filter(o => 
    isDateInRange(o.createdAt, range) && 
    o.discount && 
    o.discount > 0 && 
    o.status !== 'canceled'
  );

  const filteredOrders = discountedOrders.filter(order => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCustomer = order.customerName?.toLowerCase().includes(q);
      if (!matchId && !matchCustomer) return false;
    }
    return true;
  }).sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0));

  return (
    <div className="space-y-4">
      {/* 4 Cards de Métricas de Desconto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total de Descontos</span>
          <div className="text-xl font-black text-purple-700 mt-1">
            {formatCurrency(totalDiscountSum)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Soma de todos os abatimentos</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Maior Desconto Concedido</span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {formatCurrency(highestDiscount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Pico unitário no período</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Ticket Médio de Desconto</span>
          <div className="text-xl font-black text-indigo-700 mt-1">
            {formatCurrency(averageDiscount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Média por pedido bonificado</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Teto de Tolerância</span>
          <div className="text-xl font-black text-amber-700 mt-1">
            {discountThresholdPercent}%
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Limite padrão para alerta</span>
        </div>
      </div>

      {/* Ranking de Usuários que mais Concederam Desconto */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-black text-slate-900">
            Ranking de Usuários: Concessão de Descontos
          </h3>
        </div>

        {ranking.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 font-medium">
            Nenhum desconto concedido no período.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ranking.map((userItem, idx) => (
              <div key={userItem.userId} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span>{userItem.userName}</span>
                  </div>
                  <span className="font-mono text-purple-700 font-black">
                    {formatCurrency(userItem.totalDiscountAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>{userItem.discountsCount} concessões</span>
                  <span>Média: {formatCurrency(userItem.averageDiscount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabela de Pedidos com Desconto */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por pedido ou cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
            />
          </div>
          <div className="text-xs text-slate-500 font-bold">
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} com desconto
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Pedido / Data</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Valor Original</th>
                <th className="py-3 px-3">Desconto Aplicado</th>
                <th className="py-3 px-3">% Desconto</th>
                <th className="py-3 px-3">Valor Final</th>
                <th className="py-3 px-3">Alerta</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum pedido com desconto encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const discount = Number(order.discount || 0);
                  const finalVal = Number(order.total || 0);
                  const originalVal = finalVal + discount;
                  const percent = originalVal > 0 ? (discount / originalVal) * 100 : 0;
                  const isAboveThreshold = percent > discountThresholdPercent;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-900 block">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {order.customerName || (order.tableNumber ? `Mesa ${order.tableNumber}` : 'Balcão')}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-bold">
                        {formatCurrency(originalVal)}
                      </td>
                      <td className="py-3 px-3 font-black text-purple-700">
                        -{formatCurrency(discount)}
                      </td>
                      <td className="py-3 px-3 font-bold">
                        {percent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-700">
                        {formatCurrency(finalVal)}
                      </td>
                      <td className="py-3 px-3">
                        {isAboveThreshold ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" />
                            Acima de {discountThresholdPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Normal</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenOrder(order.id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                        >
                          Ver
                        </button>
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
