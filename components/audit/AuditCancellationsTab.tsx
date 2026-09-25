import React, { useState } from 'react';
import { 
  Order, 
  AuditLog, 
  User 
} from '../../types';
import { 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  User as UserIcon, 
  Clock, 
  Undo2, 
  Tag, 
  AlertOctagon 
} from 'lucide-react';
import { isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditCancellationsTabProps {
  orders: Order[];
  auditLogs: AuditLog[];
  users: User[];
  range: AuditPeriodRange;
  onOpenOrder: (orderId: string) => void;
}

export const AuditCancellationsTab: React.FC<AuditCancellationsTabProps> = ({
  orders,
  auditLogs,
  users,
  range,
  onOpenOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtrar pedidos cancelados no período
  const canceledOrders = orders.filter(o => o.status === 'canceled' && isDateInRange(o.createdAt, range));

  // Identificar cancelamentos suspeitos para o painel de alertas no topo
  const suspiciousAlerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    orderId?: string;
  }> = [];

  // Alerta 1: Cancelamento após pagamento
  canceledOrders.forEach(o => {
    if (o.paymentStatus === 'paid' || (o.payments && o.payments.length > 0)) {
      suspiciousAlerts.push({
        id: `paid-cancel-${o.id}`,
        type: 'critical',
        title: 'Cancelamento após quitação/pagamento',
        description: `Pedido #${o.id.slice(0, 8)} (${formatCurrency(o.total)}) constava como pago e foi cancelado.`,
        orderId: o.id
      });
    }

    // Alerta 2: Valor elevado (> R$ 150)
    if (o.total > 150) {
      suspiciousAlerts.push({
        id: `high-cancel-${o.id}`,
        type: 'warning',
        title: 'Cancelamento de valor elevado',
        description: `Pedido #${o.id.slice(0, 8)} no valor de ${formatCurrency(o.total)} foi cancelado.`,
        orderId: o.id
      });
    }

    // Alerta 3: Sem justificativa nos logs
    const cancelLog = auditLogs.find(l => l.orderId === o.id && (l.action.includes('CANCEL') || l.description.toLowerCase().includes('cancelou')));
    if (!cancelLog || !cancelLog.reason || cancelLog.reason.trim().length < 3) {
      suspiciousAlerts.push({
        id: `no-reason-${o.id}`,
        type: 'suspicious',
        title: 'Cancelamento sem justificativa registrada',
        description: `Pedido #${o.id.slice(0, 8)} cancelado sem motivo explícito no log de auditoria.`,
        orderId: o.id
      });
    }
  });

  const filteredCancellations = canceledOrders.filter(order => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCustomer = order.customerName?.toLowerCase().includes(q);
      if (!matchId && !matchCustomer) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      {/* Alertas Automáticos de Cancelamento Suspeito */}
      {suspiciousAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            Alertas Automáticos de Cancelamentos Suspeitos ({suspiciousAlerts.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {suspiciousAlerts.slice(0, 6).map(alert => (
              <div key={alert.id} className="bg-white p-2.5 rounded-xl border border-rose-200 shadow-2xs text-xs space-y-1">
                <div className="font-bold text-rose-900 flex items-center justify-between">
                  <span>{alert.title}</span>
                  {alert.orderId && (
                    <button
                      type="button"
                      onClick={() => onOpenOrder(alert.orderId!)}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      Ver
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, cliente ou motivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredCancellations.length} cancelamento{filteredCancellations.length !== 1 ? 's' : ''} auditado{filteredCancellations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela de Cancelamentos */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Pedido / Data</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Itens Cancelados</th>
                <th className="py-3 px-3">Valor Pedido</th>
                <th className="py-3 px-3">Motivo Registrado</th>
                <th className="py-3 px-3">Responsável</th>
                <th className="py-3 px-3">Estorno / Pagamento</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCancellations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum pedido cancelado no período selecionado.
                  </td>
                </tr>
              ) : (
                filteredCancellations.map(order => {
                  const cancelLog = auditLogs.find(l => l.orderId === order.id && (l.action.includes('CANCEL') || l.description.toLowerCase().includes('cancelou')));
                  const wasPaid = order.paymentStatus === 'paid' || (order.payments && order.payments.length > 0);

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
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-bold block">
                          {order.items?.length || 0} produto{order.items?.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-xs">
                          {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-black text-rose-700">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-3">
                        {cancelLog?.reason ? (
                          <span className="text-slate-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] block truncate max-w-[180px]">
                            {cancelLog.reason}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md text-[10px]">
                            Sem justificativa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-bold">
                        {cancelLog?.userName || 'Operador Balcão'}
                      </td>
                      <td className="py-3 px-3">
                        {wasPaid ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            Pago / Exige Estorno
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-600">
                            Não Pago
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenOrder(order.id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                        >
                          Auditar
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
