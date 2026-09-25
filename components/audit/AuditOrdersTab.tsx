import React, { useState, useMemo } from 'react';
import { 
  Order, 
  AuditLog, 
  Product,
  User 
} from '../../types';
import { 
  FileEdit, 
  History, 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Tag, 
  User as UserIcon, 
  Clock, 
  Calendar,
  X,
  Search,
  Filter,
  CreditCard,
  Building2,
  Receipt,
  HelpCircle,
  Percent,
  DollarSign,
  ChevronDown
} from 'lucide-react';
import { isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditOrdersTabProps {
  orders: Order[];
  auditLogs: AuditLog[];
  products: Product[];
  users?: User[];
  range: AuditPeriodRange;
  initialSelectedOrderId?: string | null;
  platformFeePercent?: number;
}

export const AuditOrdersTab: React.FC<AuditOrdersTabProps> = ({
  orders,
  auditLogs,
  products,
  users = [],
  range,
  initialSelectedOrderId,
  platformFeePercent = 2.5
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(
    initialSelectedOrderId ? orders.find(o => o.id === initialSelectedOrderId) || null : null
  );

  // Filtros Avançados
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterOnlyAltered, setFilterOnlyAltered] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Lista única de clientes presentes nos pedidos
  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.customerName) set.add(o.customerName);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Lista única de formas de pagamento
  const uniquePaymentMethods = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.paymentMethod) set.add(o.paymentMethod);
      if (o.payments && Array.isArray(o.payments)) {
        o.payments.forEach(p => {
          if (p.method) set.add(p.method);
        });
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Lista de canais
  const channels = ['PDV', 'Delivery', 'Balcão', 'Mesa', 'Marketplace', 'WhatsApp'];

  // Filtragem dos pedidos
  const filteredOrders = orders.filter(order => {
    if (!isDateInRange(order.createdAt, range)) return false;

    // Status
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;

    // Cliente
    if (filterCustomer !== 'all' && order.customerName !== filterCustomer) return false;

    // Forma de pagamento
    if (filterPaymentMethod !== 'all') {
      const orderMatches = order.paymentMethod === filterPaymentMethod || 
        (order.payments && order.payments.some(p => p.method === filterPaymentMethod));
      if (!orderMatches) return false;
    }

    // Canal
    if (filterChannel !== 'all') {
      const src = (order.source || order.type || 'PDV').toLowerCase();
      if (!src.includes(filterChannel.toLowerCase())) return false;
    }

    // Usuário responsável
    if (filterUser !== 'all') {
      const orderUser = (order as any).userName || (order as any).userId || (order as any).waiterName || '';
      if (!orderUser.toLowerCase().includes(filterUser.toLowerCase())) return false;
    }

    // Valores Mínimo / Máximo
    const orderTotal = Number(order.total || 0);
    if (filterMinAmount && orderTotal < Number(filterMinAmount)) return false;
    if (filterMaxAmount && orderTotal > Number(filterMaxAmount)) return false;

    // Apenas alterados
    const hasLogs = auditLogs.some(l => l.orderId === order.id);
    if (filterOnlyAltered && !hasLogs) return false;

    // Busca textual
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCustomer = order.customerName?.toLowerCase().includes(q);
      const matchTable = String(order.tableNumber || '').includes(q);
      const matchItems = order.items?.some(i => i.name.toLowerCase().includes(q));
      if (!matchId && !matchCustomer && !matchTable && !matchItems) return false;
    }

    return true;
  });

  // Logs do pedido selecionado
  const orderLogs = selectedOrder
    ? auditLogs.filter(l => l.orderId === selectedOrder.id || (l.details && l.details.includes(selectedOrder.id)))
    : [];

  return (
    <div className="space-y-4">
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Busca Rápida */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID (#), cliente, item ou mesa..."
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Filtro de Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="preparing">Em Preparo</option>
            <option value="ready">Pronto</option>
            <option value="delivering">Em Entrega</option>
            <option value="delivered">Entregue / Concluído</option>
            <option value="canceled">Cancelado</option>
          </select>

          {/* Filtro de Cliente */}
          <select
            value={filterCustomer}
            onChange={e => setFilterCustomer(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 max-w-[180px] truncate"
          >
            <option value="all">Todos os Clientes</option>
            {uniqueCustomers.map(cName => (
              <option key={cName} value={cName}>{cName}</option>
            ))}
          </select>

          {/* Toggle Filtros Avançados */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              showAdvancedFilters ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros Avançados
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Checkbox Apenas Alterados */}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={filterOnlyAltered}
              onChange={e => setFilterOnlyAltered(e.target.checked)}
              className="rounded-sm text-indigo-600 focus:ring-indigo-500"
            />
            Apenas Alterados (Com Logs)
          </label>
        </div>

        {/* Painel de Filtros Avançados Expansível */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Forma de Pagamento */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={filterPaymentMethod}
                onChange={e => setFilterPaymentMethod(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">Todas as Formas</option>
                {uniquePaymentMethods.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>

            {/* Canal de Venda */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Canal de Atendimento
              </label>
              <select
                value={filterChannel}
                onChange={e => setFilterChannel(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">Todos os Canais</option>
                {channels.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            {/* Faixa de Valor */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Faixa de Valor (R$)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Mín"
                  value={filterMinAmount}
                  onChange={e => setFilterMinAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={filterMaxAmount}
                  onChange={e => setFilterMaxAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Usuário Responsável */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Usuário Responsável
              </label>
              <input
                type="text"
                placeholder="Filtrar por operador..."
                value={filterUser === 'all' ? '' : filterUser}
                onChange={e => setFilterUser(e.target.value || 'all')}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-semibold">
          <span>
            Exibindo <strong>{filteredOrders.length}</strong> de {orders.length} pedido(s)
          </span>
          {(filterStatus !== 'all' || filterCustomer !== 'all' || filterPaymentMethod !== 'all' || filterChannel !== 'all' || filterOnlyAltered || filterMinAmount || filterMaxAmount) && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setFilterCustomer('all');
                setFilterPaymentMethod('all');
                setFilterChannel('all');
                setFilterUser('all');
                setFilterMinAmount('');
                setFilterMaxAmount('');
                setFilterOnlyAltered(false);
                setOrderSearch('');
              }}
              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* TABELA DE PEDIDOS & PAINEL ANTES/DEPOIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tabela de Pedidos */}
        <div className={`${selectedOrder ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Número</th>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Itens</th>
                  <th className="py-3 px-3">Valor Bruto</th>
                  <th className="py-3 px-3">Desconto</th>
                  <th className="py-3 px-3">Taxa</th>
                  <th className="py-3 px-3">Valor Líquido</th>
                  <th className="py-3 px-3">Pagamento</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Usuário</th>
                  <th className="py-3 px-3 text-right">Trilha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                      Nenhum pedido encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const logsCount = auditLogs.filter(l => l.orderId === order.id).length;
                    const isSelected = selectedOrder?.id === order.id;
                    const orderGross = Number(order.total || 0) + Number(order.discount || 0);
                    const orderDiscount = Number(order.discount || 0);
                    const platformFee = Number(order.total || 0) * (platformFeePercent / 100);
                    const orderNet = Math.max(0, Number(order.total || 0) - platformFee);
                    const responsibleUser = (order as any).userName || (order as any).waiterName || 'Atendente';

                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/70 font-semibold' : ''
                        }`}
                      >
                        {/* Número */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-black text-slate-900 block">
                            #{order.id.slice(0, 8)}
                          </span>
                        </td>

                        {/* Data */}
                        <td className="py-3 px-3 text-slate-600">
                          <div>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Cliente */}
                        <td className="py-3 px-3">
                          <span className="text-slate-900 font-bold block truncate max-w-[120px]">
                            {order.customerName || (order.tableNumber ? `Mesa ${order.tableNumber}` : 'Balcão')}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {order.source || order.type || 'PDV'}
                          </span>
                        </td>

                        {/* Itens */}
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {order.items?.length || 0} itens
                        </td>

                        {/* Valor Bruto */}
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {formatCurrency(orderGross)}
                        </td>

                        {/* Desconto */}
                        <td className="py-3 px-3">
                          {orderDiscount > 0 ? (
                            <span className="text-purple-700 font-black bg-purple-50 px-1.5 py-0.5 rounded text-[11px] border border-purple-200">
                              -{formatCurrency(orderDiscount)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Taxa da Plataforma */}
                        <td className="py-3 px-3 text-purple-700 font-medium text-[11px]">
                          -{formatCurrency(platformFee)}
                        </td>

                        {/* Valor Líquido do Lojista */}
                        <td className="py-3 px-3 font-black text-emerald-700">
                          {formatCurrency(orderNet)}
                        </td>

                        {/* Pagamento */}
                        <td className="py-3 px-3 text-slate-700 font-medium truncate max-w-[100px]">
                          {order.paymentMethod || 'Dinheiro'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {order.status === 'canceled' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Cancelado
                            </span>
                          ) : order.paymentStatus === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Pago
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              Pendente
                            </span>
                          )}
                        </td>

                        {/* Usuário Responsável */}
                        <td className="py-3 px-3 text-slate-600 text-[11px] truncate max-w-[90px]">
                          {responsibleUser}
                        </td>

                        {/* Ação */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors inline-flex items-center gap-1"
                            title="Auditar alterações deste pedido"
                          >
                            {logsCount > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            )}
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

        {/* PAINEL LATERAL: AUDITORIA DO PEDIDO (HISTÓRICO ANTES → DEPOIS) */}
        {selectedOrder && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-indigo-600" />
                  Auditoria do Pedido #{selectedOrder.id.slice(0, 8)}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Rastreabilidade total: criação, itens, pagamentos e alterações
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dados Consolidados do Pedido */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Cliente:</span>
                <span className="font-black text-slate-800">{selectedOrder.customerName || 'Não identificado'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Data/Hora de Criação:</span>
                <span className="font-bold text-slate-800">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Canal / Origem:</span>
                <span className="font-bold text-slate-800 uppercase">{selectedOrder.source || selectedOrder.type || 'PDV'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Forma de Pagamento:</span>
                <span className="font-bold text-slate-800">{selectedOrder.paymentMethod || 'Dinheiro'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-bold">Total Bruto do Pedido:</span>
                <span className="font-black text-slate-900">{formatCurrency(selectedOrder.total + (selectedOrder.discount || 0))}</span>
              </div>
              {selectedOrder.discount ? (
                <div className="flex justify-between items-center text-purple-700">
                  <span className="font-bold">Desconto Concedido:</span>
                  <span className="font-black">-{formatCurrency(selectedOrder.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Comissão da Plataforma ({platformFeePercent}%):</span>
                <span className="font-bold text-purple-700">-{formatCurrency(selectedOrder.total * (platformFeePercent / 100))}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-emerald-700 font-black">Líquido do Lojista:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatCurrency(selectedOrder.total - (selectedOrder.total * (platformFeePercent / 100)))}
                </span>
              </div>
            </div>

            {/* Itens Atuais do Pedido */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Itens Atuais do Pedido ({selectedOrder.items?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900">{item.quantity}x {item.name}</span>
                      {item.observation && (
                        <span className="block text-[10px] text-slate-400">Obs: {item.observation}</span>
                      )}
                    </div>
                    <span className="font-bold text-slate-700">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TRILHA DE AUDITORIA: ANTES → DEPOIS */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                Histórico Completo de Alterações (Antes → Depois)
              </h4>

              {orderLogs.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                  Nenhuma alteração pós-criação registrada para este pedido.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {orderLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px] uppercase">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <p className="text-slate-700 font-medium">
                        {log.description}
                      </p>

                      {/* Comparação Antes x Depois */}
                      {log.diff && log.diff.length > 0 ? (
                        <div className="mt-2 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                          {log.diff.map((d, dIdx) => (
                            <div key={dIdx} className="grid grid-cols-3 gap-1 text-[10px]">
                              <span className="font-bold text-slate-500">{d.label}:</span>
                              <span className="text-rose-600 font-mono line-through truncate">
                                {String(d.before || '-')}
                              </span>
                              <span className="text-emerald-700 font-mono font-bold truncate">
                                → {String(d.after || '-')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Operador, Motivo e Origem */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-1">
                        <span>
                          Operador: <strong className="text-slate-800">{log.userName || 'Sistema'}</strong>
                        </span>
                        {log.reason && (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                            Motivo: {log.reason}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Origem: {log.operationType || 'Manual'}
                        </span>
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
