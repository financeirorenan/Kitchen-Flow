
import React, { useState, useMemo } from 'react';
import { Order, OrderItem, Product, PaymentMethod, ProductOption } from '../types';
import { formatOrderNumber } from '../utils/deduplicate';
import { 
  X, Package, Plus, Minus, Trash2, Search, CreditCard, Check 
} from 'lucide-react';

interface EditOrderModalProps {
  order: Order;
  products: Product[];
  onClose: () => void;
  onSave: (updates: Partial<Order>) => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, products = [], onClose, onSave }) => {
  const [items, setItems] = useState<OrderItem[]>(
    order?.items ? order.items.filter(i => !i.cancelled).map(i => ({ ...i })) : []
  );
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod || 'dinheiro');
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: string }>>(() => {
    if (order?.payments && order.payments.length > 1) {
      const orderTotal = Number(order.total || 0);
      const sum = order.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0);
      const uniqueMethods = new Set(order.payments.map(p => p?.method));
      // Only treat as split payment if the sum does not exceed orderTotal (or has distinct valid parts)
      if (sum <= orderTotal + 0.05 || uniqueMethods.size > 1) {
        return order.payments.map(p => ({
          method: (p.method || 'dinheiro') as PaymentMethod,
          amount: Number(p.amount || 0).toFixed(2)
        }));
      }
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [optionsModalQty, setOptionsModalQty] = useState(1);
  const [optionsModalObs, setOptionsModalObs] = useState('');

  const total = useMemo(() => {
    if (items.length === 0) return 0;
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return Math.max(0, subtotal + (order?.deliveryFee || 0) + (order?.additionalFee || 0) - (order?.discount || 0));
  }, [items, order?.deliveryFee, order?.additionalFee, order?.discount]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm || !products) return [];
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [products, searchTerm]);

  const handleAddItem = (product: Product, options?: ProductOption[]) => {
    const hasOptions = (product.optionCategories && product.optionCategories.length > 0) || (product.options && product.options.length > 0);
    
    if (hasOptions && !options) {
      setSelectedProductForOptions(product);
      setSelectedOptions([]);
      setOptionsModalQty(1);
      setOptionsModalObs('');
      setShowOptionsModal(true);
      return;
    }

    const finalOptions = options || [];
    const optionNames = finalOptions.map(o => `${(o.quantity && o.quantity > 1) ? `${o.quantity}x ` : ''}${o.name}`).sort().join(', ');
    const existingIndex = items.findIndex(i => 
      !i.sentToKitchen &&
      i.productId === product.id && 
      (i.selectedOptions?.map(o => `${(o.quantity && o.quantity > 1) ? `${o.quantity}x ` : ''}${o.name}`).sort().join(', ') || '') === optionNames &&
      (i.observation || '') === (optionsModalObs || '')
    );

    if (existingIndex > -1) {
      setItems(items.map((i, idx) => idx === existingIndex ? { ...i, quantity: i.quantity + optionsModalQty } : i));
    } else {
      // Validate category conflict
      const nameConflict = items.find(item => {
        const otherProduct = products.find(p => p.id === item.productId);
        return otherProduct &&
               otherProduct.name.toLowerCase().trim() === product.name.toLowerCase().trim() &&
               otherProduct.category !== product.category;
      });
      if (nameConflict) {
        const otherCat = products.find(p => p.id === nameConflict.productId)?.category || 'Outra';
        const confirmAdd = window.confirm(
          `Atenção: Você está lançando "${product.name}" da categoria "${product.category}", mas já existe um item com o mesmo nome na categoria "${otherCat}" no pedido. Deseja realmente lançar este item?`
        );
        if (!confirmAdd) return;
      }

      const itemPrice = product.price + finalOptions.reduce((acc, o) => acc + (o.price * (o.quantity || 1)), 0);
      setItems([...items, {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        name: product.name,
        quantity: optionsModalQty,
        price: itemPrice,
        category: product.category,
        sentToKitchen: false,
        isNew: true,
        kitchenDispatched: false,
        selectedOptions: finalOptions.length > 0 ? finalOptions : undefined,
        observation: optionsModalObs || undefined
      }]);
    }
    setSearchTerm('');
    setShowOptionsModal(false);
  };

  const getOptionQtyInModal = (option: ProductOption) => {
    const match = selectedOptions.find(o => (o.id && option.id ? o.id === option.id : o.name === option.name));
    return match?.quantity || (match ? 1 : 0);
  };

  const updateOptionQtyInModal = (option: ProductOption, delta: number, categoryName?: string) => {
    if (!selectedProductForOptions) return;
    const catName = categoryName || option.category;
    const category = selectedProductForOptions.optionCategories?.find(
      c => c.name === catName || (c.options || []).some(co => co.id === option.id)
    );

    setSelectedOptions(prev => {
      const matchKey = (o: ProductOption) => (o.id && option.id ? o.id === option.id : o.name === option.name);
      const existing = prev.find(matchKey);
      const currentQty = existing?.quantity || (existing ? 1 : 0);
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        return prev.filter(o => !matchKey(o));
      }

      if (category && category.max === 1) {
        const otherIds = (category.options || []).map(o => o.id);
        return [
          ...prev.filter(o => o.category !== catName && !otherIds.includes(o.id)),
          { ...option, category: catName, quantity: 1 }
        ];
      }

      if (category && category.max > 1 && delta > 0) {
        const totalInCat = prev
          .filter(o => o.category === catName || (category.options || []).some(co => co.id === o.id))
          .reduce((sum, o) => sum + (o.quantity || 1), 0);
        if (totalInCat >= category.max) {
          alert(`Limite de ${category.max} atingido em ${category.name}`);
          return prev;
        }
      }

      if (option.maxQuantity && newQty > option.maxQuantity) {
        return prev;
      }

      if (existing) {
        return prev.map(o => matchKey(o) ? { ...o, quantity: newQty } : o);
      } else {
        return [...prev, { ...option, category: catName, quantity: newQty }];
      }
    });
  };

  const toggleOption = (option: ProductOption, categoryName?: string) => {
    if (!selectedProductForOptions) return;
    const catName = categoryName || option.category;
    const category = selectedProductForOptions.optionCategories?.find(
      c => c.name === catName || (c.options || []).some(co => co.id === option.id)
    );

    if (category && category.max === 1) {
      updateOptionQtyInModal(option, 1, catName);
      return;
    }

    const currentQty = getOptionQtyInModal(option);
    if (currentQty === 0) {
      updateOptionQtyInModal(option, 1, catName);
    } else {
      updateOptionQtyInModal(option, -currentQty, catName);
    }
  };

  const confirmOptions = () => {
    if (selectedProductForOptions) {
      if (selectedProductForOptions.optionCategories) {
        for (const cat of selectedProductForOptions.optionCategories) {
          const selectedInCat = selectedOptions
            .filter(o => o.category === cat.name || (cat.options || []).some(co => co.id === o.id))
            .reduce((sum, o) => sum + (o.quantity || 1), 0);
          if (selectedInCat < cat.min) {
            alert(`Selecione pelo menos ${cat.min} em ${cat.name} (atualmente: ${selectedInCat})`);
            return;
          }
          if (cat.max > 0 && selectedInCat > cat.max) {
            alert(`Máximo de ${cat.max} opções em ${cat.name} (atualmente: ${selectedInCat})`);
            return;
          }
        }
      }
      handleAddItem(selectedProductForOptions, selectedOptions);
    }
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    const targetItem = items[idx];
    if (!targetItem) return;

    if (delta > 0 && targetItem.sentToKitchen) {
      const targetOpts = (targetItem.selectedOptions || [])
        .map(o => `${(o.quantity && o.quantity > 1) ? `${o.quantity}x ` : ''}${o.name}`)
        .sort()
        .join(', ');
      const existingUnsentIdx = items.findIndex((it, i) =>
        i !== idx &&
        !it.sentToKitchen &&
        it.productId === targetItem.productId &&
        it.name === targetItem.name &&
        (it.observation || '') === (targetItem.observation || '') &&
        ((it.selectedOptions || [])
          .map(o => `${(o.quantity && o.quantity > 1) ? `${o.quantity}x ` : ''}${o.name}`)
          .sort()
          .join(', ')) === targetOpts
      );
      if (existingUnsentIdx !== -1) {
        setItems(items.map((it, i) => i === existingUnsentIdx ? { ...it, quantity: it.quantity + delta } : it));
      } else {
        setItems([
          ...items,
          {
            ...targetItem,
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            quantity: delta,
            sentToKitchen: false,
            isNew: true,
            batchNumber: undefined,
            kitchenDispatched: false,
            sentAt: undefined
          }
        ]);
      }
      return;
    }

    setItems(items.map((i, index) => {
      if (index === idx) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="p-4 border-b flex justify-between items-center bg-indigo-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Editar Pedido</h2>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Pedido {formatOrderNumber(order)} - {order.customerName || 'Cliente'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white rounded-full text-slate-400 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Itens do Pedido */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package size={14} /> Itens do Pedido
            </h3>
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1">
                  <p className="text-xs font-black text-rose-700 uppercase">Todos os itens foram removidos</p>
                  <p className="text-[10px] font-bold text-rose-600">Ao salvar as alterações, esta venda será cancelada automaticamente.</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 pr-2">
                      {(() => {
                        let displayName = item.name;
                        if (item.selectedOptions && item.selectedOptions.length > 0) {
                          displayName = displayName.replace(/\s*\(([^)]+)\)/g, (match, inner) => {
                            const innerLower = inner.toLowerCase();
                            return item.selectedOptions!.some(opt => opt.name && innerLower.includes(opt.name.trim().toLowerCase())) ? '' : match;
                          }).trim();
                        }
                        return <p className="font-bold text-slate-800">{displayName}</p>;
                      })()}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">
                          {item.selectedOptions.map(o => `${(o.quantity && o.quantity > 1) ? `${o.quantity}x ` : ''}${o.name}`).join(', ')}
                        </p>
                      )}
                      {item.observation && (
                        <p className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md w-fit mt-1 whitespace-pre-line">
                          Obs: {item.observation}
                        </p>
                      )}
                      <p className="text-[10px] font-bold text-slate-400">R$ {item.price.toFixed(2)} un.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white rounded-lg border shadow-sm">
                        <button 
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-black text-slate-700 text-xs">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="p-2 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, -item.quantity)}
                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase"
                        title="Remover item do pedido"
                      >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Remover</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adicionar Itens */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} /> Adicionar Itens
            </h3>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </div>
              <input 
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-bold text-sm"
              />
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-xl shadow-xl z-10 overflow-hidden">
                  {filteredProducts.map((p, idx) => (
                    <button 
                      key={p.id || `prod-${idx}`}
                      onClick={() => handleAddItem(p)}
                      className="w-full flex items-center justify-between p-3 hover:bg-indigo-50 transition-colors border-b last:border-0"
                    >
                      <div className="text-left">
                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{p.category}</p>
                      </div>
                      <span className="font-black text-indigo-600 text-sm">R$ {p.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Forma de Pagamento (simples ou dividida em 2+ formas) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={14} /> Forma(s) de Pagamento
              </h3>
              {splitPayments.length <= 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const half = (total / 2).toFixed(2);
                    const rest = (total - parseFloat(half)).toFixed(2);
                    setSplitPayments([
                      { method: paymentMethod || 'pix', amount: half },
                      { method: paymentMethod === 'pix' ? 'cartao_debito' : 'pix', amount: rest }
                    ]);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                >
                  <Plus size={12} /> Dividir em 2 Formas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSplitPayments([])}
                  className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all"
                >
                  Usar 1 Forma Única
                </button>
              )}
            </div>

            {splitPayments.length > 1 ? (
              <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {splitPayments.map((part, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase w-14">
                      {idx + 1}ª Parte:
                    </span>
                    <select
                      value={part.method || 'dinheiro'}
                      onChange={(e) => {
                        const newMethod = e.target.value as PaymentMethod;
                        setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, method: newMethod } : p));
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase text-slate-700 focus:border-indigo-500 outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="vale_refeicao">Vale Refeição</option>
                      <option value="conta_cliente">Conta Cliente</option>
                    </select>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={part.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSplitPayments(prev => {
                            const updated = prev.map((p, i) => i === idx ? { ...p, amount: val } : p);
                            if (updated.length === 2) {
                              const otherIdx = idx === 0 ? 1 : 0;
                              const numVal = parseFloat(val) || 0;
                              const remaining = Math.max(0, total - numVal);
                              updated[otherIdx] = { ...updated[otherIdx], amount: remaining.toFixed(2) };
                            }
                            return updated;
                          });
                        }}
                        className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    {splitPayments.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setSplitPayments(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setSplitPayments(prev => [...prev, { method: 'dinheiro', amount: '0.00' }])}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Adicionar outra forma
                  </button>
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    Soma: R$ {splitPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0).toFixed(2)} / Total: R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'vale_refeicao'] as PaymentMethod[]).map(method => (
                  <button 
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wider transition-all ${
                      paymentMethod === method 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Pedido</p>
              <p className="text-2xl font-black text-slate-800">R$ {total.toFixed(2)}</p>
            </div>
            {order.status !== 'cancelled' && (
              !confirmCancelOrder ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancelOrder(true)}
                  className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Cancelar Venda
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                  <button
                    type="button"
                    onClick={() => {
                      onSave({
                        status: 'cancelled',
                        kitchenStatus: 'cancelled',
                        isSettled: false,
                        paymentStatus: 'pending'
                      } as any);
                    }}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Confirmar Cancelamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOrder(false)}
                    className="px-2 py-1.5 text-slate-500 hover:text-slate-700 font-black text-[10px] uppercase cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              )
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Fechar
            </button>
            <button 
              type="button"
              onClick={() => {
                if (items.length === 0) {
                  onSave({
                    items: [],
                    total: 0,
                    status: 'cancelled',
                    kitchenStatus: 'cancelled',
                    isSettled: false,
                    paymentStatus: 'pending'
                  } as any);
                  return;
                }
                const validSplits = splitPayments
                  .map(p => ({ method: p.method || 'dinheiro', amount: parseFloat(p.amount) || 0 }))
                  .filter(p => p.amount > 0);
                if (validSplits.length > 1) {
                  const sumSplits = validSplits.reduce((s, p) => s + p.amount, 0);
                  let adjustedSplits = validSplits;
                  if (Math.abs(sumSplits - total) > 0.01 && sumSplits > 0) {
                    const ratio = total / sumSplits;
                    let running = 0;
                    adjustedSplits = validSplits.map((p, idx) => {
                      if (idx === validSplits.length - 1) {
                        return { ...p, amount: Math.max(0, Number((total - running).toFixed(2))) };
                      }
                      const amt = Number((p.amount * ratio).toFixed(2));
                      running += amt;
                      return { ...p, amount: amt };
                    });
                  }
                  onSave({
                    items,
                    total,
                    paymentMethod: adjustedSplits[0].method,
                    payments: adjustedSplits,
                  });
                } else {
                  onSave({
                    items,
                    total,
                    paymentMethod,
                    payments: [{ method: paymentMethod || 'dinheiro', amount: total }],
                  });
                }
              }}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
            >
              {items.length === 0 ? 'Confirmar Cancelamento' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Opcionais (Sub-modal) */}
      {showOptionsModal && selectedProductForOptions && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b bg-indigo-50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800">Opcionais</h3>
                <p className="text-[10px] font-bold text-indigo-500 uppercase">{selectedProductForOptions.name}</p>
              </div>
              <button onClick={() => setShowOptionsModal(false)} className="p-1 hover:bg-white rounded-full text-slate-400"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {selectedProductForOptions.optionCategories?.map((cat, catIdx) => {
                const totalInCat = selectedOptions
                  .filter(o => o.category === cat.name || (cat.options || []).some(co => co.id === o.id))
                  .reduce((sum, o) => sum + (o.quantity || 1), 0);
                const isSingleChoice = cat.max === 1;

                return (
                <div key={cat.id || cat.name || `cat-${catIdx}`} className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</p>
                    <p className="text-[8px] font-bold text-indigo-500 uppercase">
                      Min: {cat.min} / Max: {cat.max || '∞'} • {totalInCat} selecionado(s)
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.options.map((opt, optIdx) => {
                      const optWithCat = { ...opt, category: cat.name };
                      const qty = getOptionQtyInModal(optWithCat);
                      const isSelected = qty > 0;
                      const isCatMaxReached = !isSingleChoice && cat.max > 0 && totalInCat >= cat.max;

                      return (
                        <div 
                          key={opt.id || opt.name || `opt-${catIdx}-${optIdx}`}
                          onClick={() => {
                            if (isSingleChoice) {
                              toggleOption(optWithCat, cat.name);
                            } else if (!isSelected) {
                              updateOptionQtyInModal(optWithCat, 1, cat.name);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                            isSingleChoice ? 'cursor-pointer' : (!isSelected ? 'cursor-pointer' : '')
                          } ${isSelected ? 'border-indigo-600 bg-indigo-50/70' : 'border-slate-50 hover:border-slate-200'}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            {isSingleChoice ? (
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            ) : (
                              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                {isSelected ? `${qty}x` : <Plus size={11} strokeWidth={3} />}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className={`text-xs font-bold truncate block ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>{opt.name}</span>
                              {opt.price > 0 && <span className="text-[10px] text-slate-400 font-semibold">+ R$ {opt.price.toFixed(2)}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            {isSingleChoice ? (
                              <span className="text-xs font-black text-indigo-600">
                                {opt.price > 0 ? `+ R$ ${opt.price.toFixed(2)}` : 'Grátis'}
                              </span>
                            ) : (
                              <>
                                {!isSelected ? (
                                  <button
                                    type="button"
                                    disabled={isCatMaxReached}
                                    onClick={() => updateOptionQtyInModal(optWithCat, 1, cat.name)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black transition-all ${
                                      isCatMaxReached ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600'
                                    }`}
                                  >
                                    <Plus size={13} strokeWidth={3} />
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-200">
                                    <button
                                      type="button"
                                      onClick={() => updateOptionQtyInModal(optWithCat, -1, cat.name)}
                                      className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center text-xs"
                                    >
                                      <Minus size={10} strokeWidth={3} />
                                    </button>
                                    <span className="w-4 text-center text-xs font-black text-slate-800">{qty}</span>
                                    <button
                                      type="button"
                                      disabled={isCatMaxReached}
                                      onClick={() => updateOptionQtyInModal(optWithCat, 1, cat.name)}
                                      className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                                        isCatMaxReached ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white'
                                      }`}
                                    >
                                      <Plus size={10} strokeWidth={3} />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
              
              {/* Fallback para opções legadas */}
              {(!selectedProductForOptions.optionCategories || selectedProductForOptions.optionCategories.length === 0) && selectedProductForOptions.options?.map((opt, idx) => {
                const qty = getOptionQtyInModal(opt);
                const isSelected = qty > 0;
                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      if (!isSelected) updateOptionQtyInModal(opt, 1, opt.category);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                      !isSelected ? 'cursor-pointer' : ''
                    } ${isSelected ? 'border-indigo-600 bg-indigo-50/70' : 'border-slate-50 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                        {isSelected ? `${qty}x` : <Plus size={11} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold truncate block ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>{opt.name}</span>
                        {opt.price > 0 && <span className="text-[10px] text-slate-400 font-semibold">+ R$ {opt.price.toFixed(2)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => updateOptionQtyInModal(opt, 1, opt.category)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 flex items-center justify-center"
                        >
                          <Plus size={13} strokeWidth={3} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-200">
                          <button
                            type="button"
                            onClick={() => updateOptionQtyInModal(opt, -1, opt.category)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center text-xs"
                          >
                            <Minus size={10} strokeWidth={3} />
                          </button>
                          <span className="w-4 text-center text-xs font-black text-slate-800">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateOptionQtyInModal(opt, 1, opt.category)}
                            className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-xs"
                          >
                            <Plus size={10} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Seletor de Quantidade & Observações */}
              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setOptionsModalQty((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all text-sm shadow-sm"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-black text-slate-800 text-sm">
                      {optionsModalQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOptionsModalQty((prev) => prev + 1)}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all text-sm shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Observação
                  </label>
                  <textarea
                    value={optionsModalObs}
                    onChange={(e) => setOptionsModalObs(e.target.value)}
                    placeholder="Ex: Sem cebola, bem passado..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none h-[64px]"
                  />
                </div>
              </div>

              {/* Totalizador por Item */}
              <div className="p-3 bg-slate-50 rounded-xl border text-center mt-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                  Total do Item
                </p>
                <h3 className="text-lg font-black text-indigo-600">
                  R${" "}
                  {(
                    (selectedProductForOptions.price +
                      selectedOptions.reduce((acc, o) => acc + o.price * (o.quantity || 1), 0)) *
                    optionsModalQty
                  ).toFixed(2)}
                </h3>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex gap-3">
              <button onClick={() => setShowOptionsModal(false)} className="flex-1 py-2 font-black text-slate-400 uppercase text-[10px] hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
              <button onClick={confirmOptions} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditOrderModal;
