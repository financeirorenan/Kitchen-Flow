
import React, { useState, useMemo } from 'react';
import { Order, OrderItem, Product, PaymentMethod, ProductOption } from '../types';
import { 
  X, Package, Plus, Minus, Trash2, Search, CreditCard, Check 
} from 'lucide-react';

interface EditOrderModalProps {
  order: Order;
  products: Product[];
  onClose: () => void;
  onSave: (updates: Partial<Order>) => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, products, onClose, onSave }) => {
  const [items, setItems] = useState<OrderItem[]>([...order.items]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.paymentMethod || 'dinheiro');
  const [searchTerm, setSearchTerm] = useState('');

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [optionsModalQty, setOptionsModalQty] = useState(1);
  const [optionsModalObs, setOptionsModalObs] = useState('');

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0) + (order.deliveryFee || 0);
  }, [items, order.deliveryFee]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
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
    const optionNames = finalOptions.map(o => o.name).sort().join(', ');
    const existingIndex = items.findIndex(i => 
      i.productId === product.id && 
      (i.selectedOptions?.map(o => o.name).sort().join(', ') || '') === optionNames &&
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

      const itemPrice = product.price + finalOptions.reduce((acc, o) => acc + o.price, 0);
      setItems([...items, {
        productId: product.id,
        name: product.name + (finalOptions.length > 0 ? ` (${finalOptions.map(o => o.name).join(', ')})` : ''),
        quantity: optionsModalQty,
        price: itemPrice,
        category: product.category,
        sentToKitchen: true,
        selectedOptions: finalOptions.length > 0 ? finalOptions : undefined,
        observation: optionsModalObs || undefined
      }]);
    }
    setSearchTerm('');
    setShowOptionsModal(false);
  };

  const toggleOption = (option: ProductOption) => {
    if (!selectedProductForOptions) return;
    setSelectedOptions(prev => {
      const isSelected = prev.find(o => o.id === option.id);
      if (isSelected) return prev.filter(o => o.id !== option.id);
      
      if (selectedProductForOptions.optionCategories) {
        const category = selectedProductForOptions.optionCategories.find(c => c.name === option.category);
        if (category && category.max === 1) {
          return [...prev.filter(o => o.category !== option.category), option];
        }
        if (category && category.max > 0 && prev.filter(o => o.category === option.category).length >= category.max) {
          return prev;
        }
      }
      return [...prev, option];
    });
  };

  const confirmOptions = () => {
    if (selectedProductForOptions) {
      if (selectedProductForOptions.optionCategories) {
        for (const cat of selectedProductForOptions.optionCategories) {
          const selectedInCat = selectedOptions.filter(o => o.category === cat.name);
          if (selectedInCat.length < cat.min) {
            alert(`Selecione pelo menos ${cat.min} em ${cat.name}`);
            return;
          }
        }
      }
      handleAddItem(selectedProductForOptions, selectedOptions);
    }
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
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
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Pedido #{order.id.slice(-4)} - {order.customerName || 'Cliente'}</p>
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
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">
                        {item.selectedOptions.map(o => o.name).join(', ')}
                      </p>
                    )}
                    <p className="text-[10px] font-bold text-slate-400">R$ {item.price.toFixed(2)} un.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border shadow-sm">
                      <button 
                        onClick={() => handleUpdateQuantity(idx, -1)}
                        className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-black text-slate-700 text-xs">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(idx, 1)}
                        className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleUpdateQuantity(idx, -item.quantity)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
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
                  {filteredProducts.map(p => (
                    <button 
                      key={p.id}
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

          {/* Forma de Pagamento */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={14} /> Forma de Pagamento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'vale_refeicao'] as PaymentMethod[]).map(method => (
                <button 
                  key={method}
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
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Pedido</p>
            <p className="text-2xl font-black text-slate-800">R$ {total.toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onSave({ items, total, paymentMethod })}
              className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              Salvar Alterações
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
              {selectedProductForOptions.optionCategories?.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</p>
                    <p className="text-[8px] font-bold text-indigo-500 uppercase">Min: {cat.min} / Max: {cat.max || '∞'}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.options.map(opt => {
                      const isSelected = selectedOptions.find(o => o.id === opt.id);
                      return (
                        <button 
                          key={opt.id}
                          onClick={() => toggleOption({ ...opt, category: cat.name })}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50 hover:border-slate-200'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                              {isSelected && <Check size={12} strokeWidth={4} />}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{opt.name}</span>
                          </div>
                          <span className="text-xs font-black text-slate-800">R$ {opt.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Fallback para opções legadas */}
              {(!selectedProductForOptions.optionCategories || selectedProductForOptions.optionCategories.length === 0) && selectedProductForOptions.options?.map((opt, idx) => {
                const isSelected = selectedOptions.find(o => o.name === opt.name);
                return (
                  <button 
                    key={idx}
                    onClick={() => toggleOption(opt)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && <Check size={12} strokeWidth={4} />}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{opt.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">R$ {opt.price.toFixed(2)}</span>
                  </button>
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
                      selectedOptions.reduce((acc, o) => acc + o.price, 0)) *
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
