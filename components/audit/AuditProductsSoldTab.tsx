import React, { useState } from 'react';
import { 
  Order, 
  Product 
} from '../../types';
import { 
  Package, 
  Search, 
  ExternalLink, 
  X, 
  DollarSign, 
  TrendingUp, 
  Tag, 
  ShoppingBag, 
  ArrowRight 
} from 'lucide-react';
import { buildProductsSoldAudit, ProductsSoldAuditItem, AuditPeriodRange } from '../../services/auditService';

interface AuditProductsSoldTabProps {
  orders: Order[];
  products: Product[];
  range: AuditPeriodRange;
  onOpenOrder: (orderId: string) => void;
}

export const AuditProductsSoldTab: React.FC<AuditProductsSoldTabProps> = ({
  orders,
  products,
  range,
  onOpenOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingProduct, setViewingProduct] = useState<ProductsSoldAuditItem | null>(null);

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const auditItems = buildProductsSoldAudit(orders, products, range);

  const categories = Array.from(new Set(auditItems.map(i => i.category))).filter(Boolean);

  const filteredItems = auditItems.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Pedidos relacionados ao produto selecionado
  const relatedOrders = viewingProduct
    ? orders.filter(o => viewingProduct.orderIds.includes(o.id))
    : [];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por produto ou categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredItems.length} produto{filteredItems.length !== 1 ? 's' : ''} auditado{filteredItems.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Produto</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Qtd. Vendida</th>
                <th className="py-3 px-3">Qtd. Cancelada</th>
                <th className="py-3 px-3">Qtd. Líquida</th>
                <th className="py-3 px-3">Fat. Bruto</th>
                <th className="py-3 px-3">Fat. Líquido</th>
                <th className="py-3 px-3">Ticket Médio</th>
                <th className="py-3 px-3">Margem (%)</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum produto vendido no período com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr 
                    key={item.productId}
                    onClick={() => setViewingProduct(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.category}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {item.quantitySold}
                    </td>
                    <td className="py-3 px-3 text-rose-600 font-bold">
                      {item.quantityCanceled > 0 ? `-${item.quantityCanceled}` : '0'}
                    </td>
                    <td className="py-3 px-3 font-black text-indigo-700">
                      {item.netQuantity}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {formatCurrency(item.grossRevenue)}
                    </td>
                    <td className="py-3 px-3 font-black text-emerald-700">
                      {formatCurrency(item.netRevenue)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatCurrency(item.averageTicket)}
                    </td>
                    <td className="py-3 px-3">
                      {item.profitMargin !== undefined && item.profitMargin > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.profitMargin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingProduct(item);
                        }}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Ver pedidos onde foi vendido"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Pedidos do Produto Selecionado */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Pedidos do Produto: {viewingProduct.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Vendido em {viewingProduct.orderIds.length} pedidos no período
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-slate-500 block">Total Vendido:</span>
                <span className="font-black text-slate-900 text-sm">{viewingProduct.netQuantity} un.</span>
              </div>
              <div>
                <span className="text-slate-500 block">Faturamento Líquido:</span>
                <span className="font-black text-emerald-700 text-sm">{formatCurrency(viewingProduct.netRevenue)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Ticket Médio:</span>
                <span className="font-bold text-slate-700 text-sm">{formatCurrency(viewingProduct.averageTicket)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Qtd. no Pedido</th>
                    <th className="py-2.5 px-3">Total Pedido</th>
                    <th className="py-2.5 px-3 text-right">Auditar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relatedOrders.map(order => {
                    const orderItem = order.items?.find(i => (i.productId || i.name) === viewingProduct.productId);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {order.customerName || (order.tableNumber ? `Mesa ${order.tableNumber}` : 'Balcão')}
                        </td>
                        <td className="py-2.5 px-3 font-black text-indigo-700">
                          {orderItem?.quantity || 1}x
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenOrder(order.id);
                              setViewingProduct(null);
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                          >
                            Ver Pedido
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
