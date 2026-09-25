import React, { useState } from 'react';
import { 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  X, 
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Check,
  Building2
} from 'lucide-react';
import { B2BPurchaseOrder, PurchaseOrderStatus } from './types';

interface PurchaseOrdersViewProps {
  orders: B2BPurchaseOrder[];
  onUpdateOrderStatus: (orderId: string, newStatus: PurchaseOrderStatus) => void;
  onReceiveOrderToStockAndFinance: (order: B2BPurchaseOrder) => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  orders,
  onUpdateOrderStatus,
  onReceiveOrderToStockAndFinance
}) => {
  const [selectedOrder, setSelectedOrder] = useState<B2BPurchaseOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'received':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" /> Recebido & Integrado
          </span>
        );
      case 'in_transit':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            <Truck size={12} className="text-indigo-600 animate-pulse" /> Em Transporte
          </span>
        );
      case 'order_placed':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock size={12} /> Pedido Realizado
          </span>
        );
      case 'awaiting_approval':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock size={12} /> Aguardando Aprovação
          </span>
        );
      case 'cancelled':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const handleReceiveOrder = (order: B2BPurchaseOrder) => {
    onReceiveOrderToStockAndFinance(order);
    setSelectedOrder(null);
    setSuccessBanner(
      `Pedido ${order.orderNumber} recebido com sucesso! Entrada gerada no Estoque (custos médios recalculados) e lançamento registrado no Contas a Pagar (R$ ${order.total.toFixed(2)}).`
    );
    setTimeout(() => setSuccessBanner(null), 7000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Feedback */}
      {successBanner && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3 text-xs font-bold">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Banner and Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" />
            Gestão de Pedidos de Compra B2B
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Acompanhe o status de entrega e integre automaticamente o recebimento ao Estoque e ao Contas a Pagar.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 custom-scrollbar">
          {[
            { id: 'all', label: 'Todos os Pedidos' },
            { id: 'in_transit', label: 'Em Transporte' },
            { id: 'order_placed', label: 'Realizados' },
            { id: 'received', label: 'Recebidos' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shrink-0 ${
                filterStatus === f.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div 
            key={order.id}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-black text-sm text-slate-900 tracking-tight">
                  {order.orderNumber}
                </span>
                {getStatusBadge(order.status)}
                <span className="text-[10px] text-slate-400 font-semibold">
                  Emitido em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Building2 size={14} className="text-emerald-600" />
                <span>{order.supplierName} ({order.supplierCity})</span>
                <span className="text-slate-300">•</span>
                <span>{order.paymentTerms}</span>
              </div>

              {/* Items summary */}
              <div className="flex flex-wrap gap-2 pt-1">
                {order.items.map(item => (
                  <span key={item.productId} className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700">
                    {item.quantity} {item.unit} {item.productName} (R$ {item.unitPrice.toFixed(2)})
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-stretch lg:self-auto justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total do Pedido</span>
                <span className="text-xl font-black text-emerald-700 tracking-tight block">
                  R$ {order.total.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block">
                  {order.freight === 0 ? 'Frete Grátis' : `Frete R$ ${order.freight.toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {order.status !== 'received' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => handleReceiveOrder(order)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    title="Dar entrada no estoque e gerar conta a pagar"
                  >
                    <CheckCircle2 size={14} /> Receber Pedido
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-colors"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
            <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-xs">Nenhum pedido de compra encontrado neste status.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">
                  {selectedOrder.orderNumber}
                </span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Pedido para {selectedOrder.supplierName}
                </h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {/* Status pipeline indicator */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Pipeline do Pedido:
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black uppercase">
                <div className={`p-2 rounded-xl border ${selectedOrder.status !== 'quotation' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400'}`}>
                  1. Aprovado
                </div>
                <div className={`p-2 rounded-xl border ${selectedOrder.status === 'in_transit' || selectedOrder.status === 'received' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400'}`}>
                  2. Em Transporte
                </div>
                <div className={`p-2 rounded-xl border ${selectedOrder.status === 'received' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400'}`}>
                  3. Recebido
                </div>
                <div className={`p-2 rounded-xl border ${selectedOrder.sentToInventory ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400'}`}>
                  4. Estoque & Fin.
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Qtd</th>
                    <th className="py-2.5 px-3">Preço Unit.</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items.map(item => (
                    <tr key={item.productId}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{item.productName}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{item.quantity} {item.unit}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">R$ {item.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900 text-right">R$ {item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal dos Produtos:</span>
                <span className="text-slate-800">R$ {selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Frete:</span>
                <span className="text-slate-800">{selectedOrder.freight === 0 ? 'Grátis' : `R$ ${selectedOrder.freight.toFixed(2)}`}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto Aplicado:</span>
                  <span>- R$ {selectedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total a Pagar:</span>
                <span className="text-emerald-700 text-base">R$ {selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Integration Status Flags */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${
                selectedOrder.sentToInventory ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <Package size={16} />
                <span>{selectedOrder.sentToInventory ? 'Entrada realizada no Estoque' : 'Pendente de Entrada no Estoque'}</span>
              </div>

              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${
                selectedOrder.sentToAccountsPayable ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <DollarSign size={16} />
                <span>{selectedOrder.sentToAccountsPayable ? 'Lançado no Contas a Pagar' : 'Pendente de Lançamento Financeiro'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
              >
                Fechar
              </button>
              {selectedOrder.status !== 'received' && (
                <button
                  type="button"
                  onClick={() => handleReceiveOrder(selectedOrder)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[11px] shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Confirmar Recebimento de Mercadoria
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
