import React, { useState } from 'react';
import { 
  Send, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Building2, 
  ShoppingCart, 
  X, 
  Check, 
  Trash2,
  Scale,
  Sparkles
} from 'lucide-react';
import { B2BQuotation, B2BSupplier, B2BCentralProduct, QuotationItem, QuotationSupplierResponse } from './types';

interface QuotationsViewProps {
  quotations: B2BQuotation[];
  suppliers: B2BSupplier[];
  products: B2BCentralProduct[];
  onCreateQuotation: (quotation: B2BQuotation) => void;
  onConvertToPurchaseOrder: (quotation: B2BQuotation, winningSupplierId: string) => void;
  onSelectSupplier: (supplier: B2BSupplier) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  quotations,
  suppliers,
  products,
  onCreateQuotation,
  onConvertToPurchaseOrder,
  onSelectSupplier
}) => {
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<B2BQuotation | null>(null);

  // New Quote Form states
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteDeadline, setQuoteDeadline] = useState('2026-09-30');
  const [selectedItems, setSelectedItems] = useState<{
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    notes?: string;
  }[]>([
    {
      productId: 'prod-bife-bovino',
      productName: 'Bife Bovino (Alcatra/Contra-filé)',
      unit: 'KG',
      quantity: 50
    }
  ]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(
    suppliers.slice(0, 3).map(s => s.id)
  );

  // Helper to add item to draft
  const handleAddItemToDraft = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (selectedItems.some(i => i.productId === productId)) return;

    setSelectedItems([
      ...selectedItems,
      {
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        quantity: 20
      }
    ]);
  };

  const handleRemoveDraftItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(i => i.productId !== productId));
  };

  const handleUpdateItemQty = (productId: string, qty: number) => {
    setSelectedItems(selectedItems.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const handleToggleSupplier = (supplierId: string) => {
    if (selectedSupplierIds.includes(supplierId)) {
      setSelectedSupplierIds(selectedSupplierIds.filter(id => id !== supplierId));
    } else {
      setSelectedSupplierIds([...selectedSupplierIds, supplierId]);
    }
  };

  const handleCreateQuotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTitle.trim() || selectedItems.length === 0 || selectedSupplierIds.length === 0) {
      alert('Por favor informe título, pelo menos 1 produto e selecione fornecedores.');
      return;
    }

    const invited: QuotationSupplierResponse[] = selectedSupplierIds.map(supId => {
      const sup = suppliers.find(s => s.id === supId);
      // Auto-simulate quoted response based on catalog price
      const itemsQuoted = selectedItems.map(item => {
        const catItem = sup?.products.find(p => p.productId === item.productId || p.productName === item.productName);
        const unitPrice = catItem ? catItem.price : 30.00;
        return {
          productId: item.productId,
          unitPrice,
          available: true,
          leadTimeDays: sup?.avgDeliveryDays || 2
        };
      });

      const totalQuotation = itemsQuoted.reduce((acc, it, idx) => acc + (it.unitPrice * selectedItems[idx].quantity), 0);

      return {
        supplierId: supId,
        supplierName: sup?.tradeName || 'Distribuidor',
        status: 'quoted',
        freight: 0,
        minOrderMet: totalQuotation >= (sup?.minOrderValue || 0),
        paymentTerms: sup?.paymentTerms || '28 dias',
        validityUntil: quoteDeadline,
        totalQuotation,
        items: itemsQuoted,
        notes: 'Preço garantido para entrega imediata.',
        respondedAt: new Date().toISOString()
      };
    });

    const newQuotation: B2BQuotation = {
      id: `quot-${Date.now()}`,
      quotationNumber: `COT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantTenantId: 'demo-tenant',
      restaurantName: 'Restaurante Sabor & Arte',
      title: quoteTitle.trim(),
      status: 'responses_received',
      items: selectedItems,
      invitedSuppliers: invited,
      createdAt: new Date().toISOString(),
      deadline: quoteDeadline
    };

    onCreateQuotation(newQuotation);
    setShowNewQuoteModal(false);
    setQuoteTitle('');
    setViewingQuotation(newQuotation);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Send size={18} className="text-emerald-600" />
            Central de Cotações B2B (RFQ Food Service)
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Crie cotações simultâneas para múltiplos fornecedores, compare propostas e feche o melhor negócio.
          </p>
        </div>

        <button
          onClick={() => setShowNewQuoteModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider px-5 py-3 rounded-2xl shadow-xs transition-all flex items-center gap-2 self-stretch md:self-auto justify-center"
        >
          <Plus size={16} /> + Nova Cotação
        </button>
      </div>

      {/* Quotations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quotations.map(quote => {
          const responsesCount = quote.invitedSuppliers.filter(s => s.status === 'quoted').length;
          const bestTotal = quote.invitedSuppliers.length
            ? Math.min(...quote.invitedSuppliers.filter(s => s.status === 'quoted').map(s => s.totalQuotation))
            : 0;

          return (
            <div 
              key={quote.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                    {quote.quotationNumber}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    quote.status === 'responses_received'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : quote.status === 'converted_to_po'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {quote.status === 'responses_received' ? 'Propostas Recebidas' : quote.status === 'converted_to_po' ? 'Convertida em Pedido' : 'Aberta'}
                  </span>
                </div>

                <h4 className="font-black text-slate-800 text-sm tracking-tight line-clamp-2">
                  {quote.title}
                </h4>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Itens Cotados:</span>
                    <strong className="text-slate-800">{quote.items.length} produtos</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Fornecedores Convidados:</span>
                    <strong className="text-slate-800">{quote.invitedSuppliers.length} empresas</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Respostas Recebidas:</span>
                    <strong className="text-emerald-700">{responsesCount} de {quote.invitedSuppliers.length}</strong>
                  </div>
                  {bestTotal > 0 && (
                    <div className="flex justify-between text-slate-500 font-semibold pt-1 border-t border-slate-200">
                      <span>Melhor Proposta:</span>
                      <strong className="text-emerald-700 font-black">R$ {bestTotal.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Clock size={12} /> Até {quote.deadline}
                </span>

                <button
                  onClick={() => setViewingQuotation(quote)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                >
                  Comparar Propostas <ChevronRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Drawer to View and Compare Proposals */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">
                  {viewingQuotation.quotationNumber} • Cotação B2B
                </span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {viewingQuotation.title}
                </h3>
              </div>
              <button onClick={() => setViewingQuotation(null)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {/* Items Requested List */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Produtos Requisitados pelo Restaurante:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {viewingQuotation.items.map(it => (
                  <div key={it.productId} className="p-2 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block">{it.productName}</span>
                    <span className="text-slate-500 font-semibold">{it.quantity} {it.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Side-by-side Supplier Responses */}
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Scale size={16} className="text-emerald-600" />
                Propostas Comerciais Recebidas ({viewingQuotation.invitedSuppliers.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingQuotation.invitedSuppliers.map((resp, idx) => {
                  const supObj = suppliers.find(s => s.id === resp.supplierId);
                  const isLowest = idx === 0 || resp.totalQuotation === Math.min(...viewingQuotation.invitedSuppliers.map(s => s.totalQuotation));

                  return (
                    <div 
                      key={resp.supplierId}
                      className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                        isLowest 
                          ? 'bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-black text-sm text-slate-900 block">{resp.supplierName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{resp.paymentTerms}</span>
                          </div>
                          {isLowest && (
                            <span className="bg-emerald-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full">
                              Melhor Preço
                            </span>
                          )}
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                          {resp.items.map(it => (
                            <div key={it.productId} className="flex justify-between items-center text-slate-600">
                              <span className="truncate pr-2 font-medium">
                                {viewingQuotation.items.find(i => i.productId === it.productId)?.productName || 'Item'}
                              </span>
                              <strong className="text-slate-800 shrink-0 font-bold">
                                R$ {it.unitPrice.toFixed(2)}
                              </strong>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase block">Total do Lote:</span>
                            <span className="text-lg font-black text-emerald-700">
                              R$ {resp.totalQuotation.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            Frete: {resp.freight === 0 ? 'Grátis' : `R$ ${resp.freight.toFixed(2)}`}
                          </span>
                        </div>
                      </div>

                      {/* Convert to PO action */}
                      <button
                        onClick={() => {
                          onConvertToPurchaseOrder(viewingQuotation, resp.supplierId);
                          setViewingQuotation(null);
                        }}
                        className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart size={14} /> Aprovar & Gerar Pedido de Compra
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Create New Quotation */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Criar Nova Cotação de Preços (RFQ)
              </h3>
              <button onClick={() => setShowNewQuoteModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuotationSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Título da Cotação *</label>
                <input
                  type="text"
                  required
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                  placeholder="Ex: Cotação Semanal de Carnes e Laticínios"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Limite de Resposta</label>
                <input
                  type="date"
                  value={quoteDeadline}
                  onChange={(e) => setQuoteDeadline(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              {/* Items Selection */}
              <div className="space-y-2 border-t pt-3">
                <label className="text-[10px] font-black text-slate-400 uppercase block">1. Produtos e Quantidades Necessárias</label>
                
                <div className="flex gap-2">
                  <select
                    id="quoteProdSelect"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                    onChange={(e) => {
                      if (e.target.value) handleAddItemToDraft(e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">+ Selecionar Produto do Catálogo...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 mt-2">
                  {selectedItems.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-800 block">{item.productName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">Qtd:</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQty(item.productId, parseInt(e.target.value) || 1)}
                          className="w-20 p-1.5 bg-white border border-slate-200 rounded-lg font-black text-center text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(item.productId)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suppliers Selection */}
              <div className="space-y-2 border-t pt-3">
                <label className="text-[10px] font-black text-slate-400 uppercase block">2. Fornecedores a Convidar ({selectedSupplierIds.length} selecionados)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {suppliers.map(sup => (
                    <div 
                      key={sup.id}
                      onClick={() => handleToggleSupplier(sup.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedSupplierIds.includes(sup.id)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="truncate block font-bold text-xs">{sup.tradeName}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{sup.city} • Pedido Mín R$ {sup.minOrderValue}</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={selectedSupplierIds.includes(sup.id)}
                        onChange={() => {}}
                        className="rounded text-emerald-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewQuoteModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[11px] shadow-sm flex items-center gap-1.5"
                >
                  <Send size={14} /> Disparar Cotação para Fornecedores
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
