import React, { useState } from 'react';
import { 
  Customer, 
  Order, 
  FinancialRecord, 
  AuditLog 
} from '../../types';
import { 
  Users, 
  Search, 
  Phone, 
  FileText, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  Calendar, 
  History, 
  X, 
  Tag, 
  XCircle, 
  CheckCircle2, 
  Undo2 
} from 'lucide-react';
import { isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditCustomersTabProps {
  customers: Customer[];
  orders: Order[];
  financialRecords: FinancialRecord[];
  auditLogs: AuditLog[];
  range: AuditPeriodRange;
  initialSelectedCustomerId?: string | null;
  onSelectCustomerForOrders?: (customerName: string) => void;
}

export const AuditCustomersTab: React.FC<AuditCustomersTabProps> = ({
  customers,
  orders,
  financialRecords,
  auditLogs,
  range,
  initialSelectedCustomerId,
  onSelectCustomerForOrders
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialSelectedCustomerId ? customers.find(c => c.id === initialSelectedCustomerId) || null : null
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Enriquecer dados dos clientes com métricas consolidadas
  const customerProfiles = customers.map(cust => {
    const custOrders = orders.filter(o => 
      o.customerId === cust.id || 
      (o.customerName && o.customerName.toLowerCase() === cust.name.toLowerCase())
    );

    const totalOrders = custOrders.length;
    let totalPurchased = 0;
    let totalDiscounts = 0;
    let totalCanceledOrders = 0;
    let lastPurchaseDate: Date | null = null;

    custOrders.forEach(o => {
      if (o.status === 'canceled') {
        totalCanceledOrders++;
      } else {
        totalPurchased += Number(o.total || 0);
        totalDiscounts += Number(o.discount || 0);
        const orderDate = new Date(o.createdAt);
        if (!lastPurchaseDate || orderDate > lastPurchaseDate) {
          lastPurchaseDate = orderDate;
        }
      }
    });

    // Total pago via pagamentos de pedidos ou créditos na conta
    let totalPaid = 0;
    if (cust.history && Array.isArray(cust.history)) {
      cust.history.forEach(h => {
        if (h.type === 'credit') {
          totalPaid += Number(h.amount || 0);
        }
      });
    }

    // Se o cliente não tem fiado e pagou no ato
    custOrders.forEach(o => {
      if (o.paymentStatus === 'paid' && !o.customerId) {
        totalPaid += Number(o.total || 0);
      }
    });

    const openBalance = cust.balance || 0;

    return {
      customer: cust,
      totalOrders,
      totalPurchased,
      totalPaid,
      openBalance,
      totalDiscounts,
      totalCanceledOrders,
      lastPurchaseDate
    };
  });

  const filteredProfiles = customerProfiles.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.customer.name.toLowerCase().includes(q) ||
      p.customer.document.toLowerCase().includes(q) ||
      p.customer.phone.includes(q)
    );
  });

  // Timeline completa do cliente selecionado: Cliente -> Pedido -> Alterações -> Pagamento -> Baixa -> Cancelamento/Estorno
  const buildTimeline = (cust: Customer) => {
    const events: Array<{
      id: string;
      date: Date;
      type: 'order' | 'edit' | 'payment' | 'settlement' | 'cancel' | 'refund';
      title: string;
      description: string;
      amount?: number;
      badge: string;
      badgeColor: string;
      user?: string;
    }> = [];

    // Pedidos
    const custOrders = orders.filter(o => 
      o.customerId === cust.id || 
      (o.customerName && o.customerName.toLowerCase() === cust.name.toLowerCase())
    );

    custOrders.forEach(o => {
      events.push({
        id: `ord-${o.id}`,
        date: new Date(o.createdAt),
        type: 'order',
        title: `Pedido Realizado #${o.id.slice(0, 8)}`,
        description: `${o.items?.length || 0} itens • ${o.type} (${o.source || 'PDV'})`,
        amount: o.total,
        badge: 'Pedido',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      });

      if (o.status === 'canceled') {
        events.push({
          id: `canc-${o.id}`,
          date: new Date(o.createdAt),
          type: 'cancel',
          title: `Pedido Cancelado #${o.id.slice(0, 8)}`,
          description: `Cancelamento de pedido no valor de ${formatCurrency(o.total)}`,
          amount: o.total,
          badge: 'Cancelamento',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
        });
      }

      if (o.payments && o.payments.length > 0) {
        o.payments.forEach((p, pIdx) => {
          events.push({
            id: `pay-${o.id}-${pIdx}`,
            date: new Date(p.timestamp || o.createdAt),
            type: 'payment',
            title: `Pagamento de Pedido #${o.id.slice(0, 8)}`,
            description: `Forma: ${p.method.toUpperCase()}`,
            amount: p.amount,
            badge: 'Pagamento',
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          });
        });
      }
    });

    // Baixas na conta de fiado (histórico do cliente)
    if (cust.history && Array.isArray(cust.history)) {
      cust.history.forEach(h => {
        if (h.type === 'credit') {
          events.push({
            id: `set-${h.id}`,
            date: new Date(h.date),
            type: 'settlement',
            title: `Baixa de Conta Fiado (Recebimento)`,
            description: h.description || `Forma: ${h.paymentMethod || 'Dinheiro/Pix'}`,
            amount: h.amount,
            badge: 'Baixa / Quitação',
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
          });
        }
      });
    }

    // Logs de auditoria vinculados ao cliente
    const custLogs = auditLogs.filter(l => 
      l.customerId === cust.id || 
      (l.details && l.details.includes(cust.id)) ||
      (l.description && l.description.includes(cust.name))
    );

    custLogs.forEach(l => {
      events.push({
        id: `log-${l.id}`,
        date: new Date(l.timestamp),
        type: 'edit',
        title: `Alteração: ${l.action}`,
        description: l.description,
        badge: 'Auditoria / Alteração',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        user: l.userName
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const selectedTimeline = selectedCustomer ? buildTimeline(selectedCustomer) : [];

  return (
    <div className="space-y-4">
      {/* Busca e Resumo */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredProfiles.length} cliente{filteredProfiles.length !== 1 ? 's' : ''} auditado{filteredProfiles.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Grid: Tabela de Clientes + Timeline Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tabela de Clientes */}
        <div className={`${selectedCustomer ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Cliente</th>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Pedidos</th>
                  <th className="py-3 px-3">Comprado</th>
                  <th className="py-3 px-3">Em Aberto</th>
                  <th className="py-3 px-3">Descontos</th>
                  <th className="py-3 px-3">Cancelamentos</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Nenhum cliente cadastrado ou encontrado na busca.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map(({ customer, totalOrders, totalPurchased, openBalance, totalDiscounts, totalCanceledOrders }) => {
                    const isSelected = selectedCustomer?.id === customer.id;

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60 font-semibold' : ''}`}
                      >
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-900 block truncate max-w-[130px]">
                            {customer.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {customer.phone || 'Sem fone'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {customer.document || 'Não inf.'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {totalOrders}
                        </td>
                        <td className="py-3 px-3 font-black text-slate-900">
                          {formatCurrency(totalPurchased)}
                        </td>
                        <td className="py-3 px-3">
                          {openBalance > 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                              {formatCurrency(openBalance)}
                            </span>
                          ) : openBalance < 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              {formatCurrency(openBalance)} (Crédito)
                            </span>
                          ) : (
                            <span className="text-slate-400">R$ 0,00</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {totalDiscounts > 0 ? (
                            <span className="text-purple-700 font-bold">
                              {formatCurrency(totalDiscounts)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {totalCanceledOrders > 0 ? (
                            <span className="text-rose-600 font-bold">
                              {totalCanceledOrders}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(customer);
                            }}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
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

        {/* Timeline Completa: Cliente -> Pedido -> Alterações -> Pagamento -> Baixa -> Cancelamento/Estorno */}
        {selectedCustomer && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Timeline do Cliente: {selectedCustomer.name}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Rastreabilidade unificada de compras, alterações, quitações e baixas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ficha Rápida */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">CPF/CNPJ:</span>
                <span className="font-mono font-bold text-slate-800">{selectedCustomer.document || 'Não cadastrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Telefone:</span>
                <span className="font-bold text-slate-800">{selectedCustomer.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Saldo Devedor Atual:</span>
                <span className={`font-black ${selectedCustomer.balance > 0 ? 'text-amber-700' : selectedCustomer.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(selectedCustomer.balance)}
                </span>
              </div>

              {onSelectCustomerForOrders && (
                <button
                  type="button"
                  onClick={() => onSelectCustomerForOrders(selectedCustomer.name)}
                  className="w-full mt-2 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-indigo-200"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Ver Pedidos deste Cliente
                </button>
              )}
            </div>

            {/* Timeline Vertical */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                Cadeia de Eventos Auditada
              </h4>

              {selectedTimeline.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                  Nenhum evento registrado no histórico deste cliente.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 max-h-96 overflow-y-auto pr-1">
                  {selectedTimeline.map(item => (
                    <div key={item.id} className="relative group">
                      {/* Node Bullet */}
                      <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-white border-2 border-indigo-600 group-hover:scale-125 transition-transform" />

                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.date.toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="font-black text-slate-900 pt-0.5">
                          {item.title}
                        </div>

                        <p className="text-slate-600 text-[11px]">
                          {item.description}
                        </p>

                        {item.amount !== undefined && (
                          <div className="text-[11px] font-bold text-slate-700 pt-1">
                            Valor: <span className="font-black text-slate-900">{formatCurrency(item.amount)}</span>
                          </div>
                        )}

                        {item.user && (
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            Operador: <strong className="text-slate-700">{item.user}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
