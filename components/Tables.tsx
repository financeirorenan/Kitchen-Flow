
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Table, Product, OrderItem, PaymentMethod, Order, Customer } from '../types';
import { getObservationSuggestions } from '../services/gemini';
import { 
  Users, CreditCard, Utensils, X, Plus, Trash2, 
  Receipt, Wallet, Smartphone, Banknote, ShieldCheck,
  CheckCircle2, Printer, Search, Edit3, User as UserIcon, MessageSquare, Save,
  Minus, Sparkles, Loader2, Send, ChefHat, Lock, Unlock, Coins, 
  History, DollarSign, ArrowRightLeft, PieChart, UserCircle, Store, ShoppingBag,
  CreditCard as CardIcon, Landmark, AlertTriangle, Calculator, ListChecks, ArrowRight,
  Check, Bike, Ticket
} from 'lucide-react';

interface TablesProps {
  tables: Table[];
  counterOrders: Table[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  cashSession: {
    isOpen: boolean;
    openingValue: number;
    openedAt: Date | null;
  };
  onUpdateTable: (tableId: number, items: OrderItem[], status: Table['status'], isCounter?: boolean) => void;
  onCloseTable: (tableId: number, paymentMethod: PaymentMethod, isFiscal: boolean, customerId?: string, isCounter?: boolean, deliveryInfo?: { address: string, fee: number }, customerDocument?: string) => void;
  onSendToKitchen: (tableId: number, items: OrderItem[], isCounter?: boolean) => void;
  onOpenCash: (value: number) => void;
  onCloseCash: (actualValue: number, observations?: string) => void;
  onAddCounterOrder: () => number;
}

interface SplitPart {
  id: string;
  amount: number;
  method: PaymentMethod;
  isPaid: boolean;
}

const Tables: React.FC<TablesProps> = ({ 
  tables, counterOrders, products, orders, customers, cashSession, 
  onUpdateTable, onCloseTable, onSendToKitchen, onOpenCash, onCloseCash, onAddCounterOrder
}) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isCounterContext, setIsCounterContext] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCustomerSelection, setShowCustomerSelection] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Split logic states
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitMode, setSplitMode] = useState<'value' | 'items' | null>(null);
  const [selectedSplitItems, setSelectedSplitItems] = useState<number[]>([]); 
  const [customSplitValue, setCustomSplitValue] = useState('');
  const [splitParts, setSplitParts] = useState<SplitPart[]>([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [paidItemIndices, setPaidItemIndices] = useState<number[]>([]);

  const [isFiscalEmission, setIsFiscalEmission] = useState(false);
  const [customerDocumentInput, setCustomerDocumentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardOptions, setShowCardOptions] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const [showKitchenSuccess, setShowKitchenSuccess] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [openingValueInput, setOpeningValueInput] = useState('0');
  const [closingValueInput, setClosingValueInput] = useState('0');
  const [closingObservations, setClosingObservations] = useState('');

  // Change calculation states
  const [amountReceived, setAmountReceived] = useState('');
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Delivery states for counter
  const [isDeliveryOrder, setIsDeliveryOrder] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('0');

  const formatCurrency = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const numberValue = parseFloat(cleanValue) / 100;
    if (isNaN(numberValue)) return '0,00';
    return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (formattedValue: string) => {
    const cleanValue = formattedValue.replace(/\D/g, '');
    return parseFloat(cleanValue) / 100;
  };

  // Item Edit States
  const [activeSeat, setActiveSeat] = useState<string>('Geral');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [tempObs, setTempObs] = useState('');
  const [tempSeat, setTempSeat] = useState('');
  const [tempQty, setTempQty] = useState<number>(1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const cashReport = useMemo(() => {
    if (!cashSession.openedAt) return null;
    const sessionOrders = orders.filter(o => o.createdAt >= cashSession.openedAt!);
    const totalsByMethod = { 
      dinheiro: 0, 
      cartao_credito: 0, 
      cartao_debito: 0, 
      pix: 0, 
      vale_refeicao: 0, 
      conta_cliente: 0 
    };
    
    sessionOrders.forEach(o => { 
      if (o.paymentMethod) totalsByMethod[o.paymentMethod] += o.total; 
    });

    const totalSales = Object.values(totalsByMethod).reduce((a, b) => a + b, 0);
    const electronicTotal = totalsByMethod.cartao_credito + totalsByMethod.cartao_debito + totalsByMethod.pix + totalsByMethod.vale_refeicao;
    
    return { 
      totalsByMethod, 
      totalSales, 
      electronicTotal,
      expectedFinalValue: totalsByMethod.dinheiro + cashSession.openingValue, 
      count: sessionOrders.length 
    };
  }, [orders, cashSession]);

  const filteredCustomerList = useMemo(() => 
    customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]
  );

  const getTableStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'occupied': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'billing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cleaning': return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const openTable = (table: Table) => {
    if (!cashSession.isOpen) {
      alert("Por favor, abra o caixa antes de realizar atendimentos.");
      setShowCashModal(true);
      return;
    }
    setIsCounterContext(false);
    if (table.status === 'available') {
      onUpdateTable(table.id, [], 'occupied');
      setSelectedTable({ ...table, status: 'occupied', items: [], total: 0 });
    } else {
      setSelectedTable(table);
    }
    setActiveSeat('Geral');
  };

  const openCounterOrder = (order: Table) => {
    setIsCounterContext(true);
    setSelectedTable(order);
    setActiveSeat('Geral');
  };

  const handleNewCounter = () => {
    if (!cashSession.isOpen) {
      alert("Abra o caixa primeiro.");
      setShowCashModal(true);
      return;
    }
    const newId = onAddCounterOrder();
    setIsCounterContext(true);
    setSelectedTable({ id: newId, status: 'occupied', items: [], total: 0 });
  };

  const addToTable = useCallback((product: Product, qty: number = 1) => {
    if (!selectedTable) return;
    const existingIndex = selectedTable.items.findIndex(i => i.productId === product.id && i.seat === activeSeat && !i.observation);
    let newItems: OrderItem[];
    if (existingIndex > -1) {
      newItems = [...selectedTable.items];
      newItems[existingIndex] = { ...newItems[existingIndex], quantity: newItems[existingIndex].quantity + qty };
    } else {
      newItems = [...selectedTable.items, { productId: product.id, name: product.name, price: product.price, quantity: qty, seat: activeSeat }];
    }
    const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const updated = { ...selectedTable, items: newItems, total: newTotal };
    setSelectedTable(updated);
    onUpdateTable(selectedTable.id, newItems, 'occupied', isCounterContext);
  }, [selectedTable, activeSeat, isCounterContext, onUpdateTable]);

  const removeItem = useCallback((index: number) => {
    if (!selectedTable) return;
    const newItems = selectedTable.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const updated = { ...selectedTable, items: newItems, total: newTotal };
    setSelectedTable(updated);
    onUpdateTable(selectedTable.id, newItems, 'occupied', isCounterContext);
  }, [selectedTable, isCounterContext, onUpdateTable]);

  const startEditItem = async (index: number) => {
    const item = selectedTable!.items[index];
    setEditingItemIndex(index);
    setTempObs(item.observation || '');
    setTempSeat(item.seat || 'Geral');
    setTempQty(item.quantity);
    setLoadingSuggestions(true);
    try {
      const res = await getObservationSuggestions(item.name);
      setSuggestions(res);
    } catch (err) {
      setSuggestions(["Sem cebola", "Bem passado", "Ponto da casa", "Sem gelo"]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const saveItemEdit = () => {
    if (!selectedTable || editingItemIndex === null) return;
    const newItems = [...selectedTable.items];
    newItems[editingItemIndex] = { 
      ...newItems[editingItemIndex], 
      observation: tempObs.trim(), 
      seat: tempSeat.trim() || 'Geral', 
      quantity: tempQty > 0 ? tempQty : 1 
    };
    const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const updated = { ...selectedTable, items: newItems, total: newTotal };
    setSelectedTable(updated);
    onUpdateTable(selectedTable.id, newItems, 'occupied', isCounterContext);
    setEditingItemIndex(null);
  };

  const handleSendToKitchenLocal = useCallback(() => {
    if (!selectedTable || selectedTable.items.length === 0) return;
    setIsSendingToKitchen(true);
    setTimeout(() => {
      onSendToKitchen(selectedTable.id, [...selectedTable.items], isCounterContext);
      setIsSendingToKitchen(false);
      setShowKitchenSuccess(true);
      setTimeout(() => setShowKitchenSuccess(false), 3000);
    }, 1000);
  }, [selectedTable, isCounterContext, onSendToKitchen]);

  const openPayment = useCallback(() => {
    if (!selectedTable) return;
    setRemainingBalance(selectedTable.total);
    setSplitParts([]);
    setPaidItemIndices([]);
    setIsSplitting(false);
    setSplitMode(null);
    setShowPaymentModal(true);
  }, [selectedTable]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCustomerSelection) setShowCustomerSelection(false);
        else if (showChangeModal) setShowChangeModal(false);
        else if (showPaymentModal) setShowPaymentModal(false);
        else if (editingItemIndex !== null) setEditingItemIndex(null);
        else if (showCashModal) setShowCashModal(false);
        else if (selectedTable) setSelectedTable(null);
        return;
      }

      if (!selectedTable) return;

      if (e.key === 'F1') {
        e.preventDefault();
        if (selectedTable.items.length > 0 && !showPaymentModal) openPayment();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (selectedTable.items.length > 0 && !isSendingToKitchen) handleSendToKitchenLocal();
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (selectedTable.items.length > 0 && !showPaymentModal) openPayment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTable, showPaymentModal, editingItemIndex, showCashModal, showChangeModal, showCustomerSelection, openPayment]);

  const handleProcessPayment = (method: PaymentMethod) => {
    if (!selectedTable) return;
    
    if (method === 'dinheiro' && !isSplitting) {
      setSelectedPaymentMethod(method);
      setAmountReceived('');
      setShowChangeModal(true);
      return;
    }

    if (method === 'conta_cliente') {
      setShowCustomerSelection(true);
      return;
    }
    if (isSplitting) {
      const amountToPay = splitMode === 'value' ? (parseFloat(customSplitValue) || remainingBalance) : 
                          splitMode === 'items' ? selectedSplitItems.reduce((acc, idx) => acc + (selectedTable.items[idx].price * selectedTable.items[idx].quantity), 0) :
                          remainingBalance;
      
      if (method === 'dinheiro') {
        setSelectedPaymentMethod(method);
        setAmountReceived('');
        setShowChangeModal(true);
        return;
      }

      const newPart: SplitPart = {
        id: Math.random().toString(36).substr(2, 9),
        amount: amountToPay,
        method: method,
        isPaid: true
      };
      const newRemaining = remainingBalance - amountToPay;
      setSplitParts([...splitParts, newPart]);
      setRemainingBalance(newRemaining);
      
      if (splitMode === 'items') {
        setPaidItemIndices([...paidItemIndices, ...selectedSplitItems]);
      }
      
      setSplitMode(null);
      setSelectedSplitItems([]);
      setCustomSplitValue('');
      if (newRemaining <= 0.01) {
        finishSplitPayment();
      }
      return;
    }
    setIsProcessing(true);
    const deliveryInfo = isDeliveryOrder && isCounterContext ? { address: deliveryAddress, fee: parseCurrency(deliveryFeeInput) } : undefined;
    
    // Se for retirada no balcão, garantir que vá para a cozinha se ainda não foi enviado
    const shouldSendToKitchen = isCounterContext && !isDeliveryOrder;

    setTimeout(() => {
      onCloseTable(selectedTable.id, method, isFiscalEmission, undefined, isCounterContext, deliveryInfo, isFiscalEmission ? customerDocumentInput : undefined);
      if (shouldSendToKitchen) {
        onSendToKitchen(selectedTable.id, selectedTable.items, true);
      }
      setIsProcessing(false);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setIsDeliveryOrder(false);
      setDeliveryAddress('');
      setDeliveryFeeInput('0');
    }, 1500);
  };

  const finishCashPayment = () => {
    if (!selectedTable || !selectedPaymentMethod) return;
    const received = parseCurrency(amountReceived);
    const amountToPay = isSplitting ? (splitMode === 'value' ? (parseFloat(customSplitValue) || remainingBalance) : 
                        splitMode === 'items' ? selectedSplitItems.reduce((acc, idx) => acc + (selectedTable.items[idx].price * selectedTable.items[idx].quantity), 0) :
                        remainingBalance) : selectedTable.total + (isDeliveryOrder && isCounterContext ? parseCurrency(deliveryFeeInput) : 0);

    if (received < amountToPay) {
      alert("Valor recebido é menor que o total!");
      return;
    }

    if (isSplitting) {
      const newPart: SplitPart = {
        id: Math.random().toString(36).substr(2, 9),
        amount: amountToPay,
        method: 'dinheiro',
        isPaid: true
      };
      const newRemaining = remainingBalance - amountToPay;
      setSplitParts([...splitParts, newPart]);
      setRemainingBalance(newRemaining);
      
      if (splitMode === 'items') {
        setPaidItemIndices([...paidItemIndices, ...selectedSplitItems]);
      }
      
      setSplitMode(null);
      setSelectedSplitItems([]);
      setCustomSplitValue('');
      setShowChangeModal(false);
      if (newRemaining <= 0.01) {
        finishSplitPayment();
      }
      return;
    }

    setIsProcessing(true);
    const deliveryInfo = isDeliveryOrder && isCounterContext ? { address: deliveryAddress, fee: parseCurrency(deliveryFeeInput) } : undefined;
    setTimeout(() => {
      onCloseTable(selectedTable.id, 'dinheiro', isFiscalEmission, undefined, isCounterContext, deliveryInfo, isFiscalEmission ? customerDocumentInput : undefined);
      setIsProcessing(false);
      setShowChangeModal(false);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setIsDeliveryOrder(false);
      setDeliveryAddress('');
      setDeliveryFeeInput('0');
    }, 1000);
  };

  const finishSplitPayment = () => {
    setIsProcessing(true);
    const mainMethod = splitParts.sort((a,b) => b.amount - a.amount)[0].method;
    const deliveryInfo = isDeliveryOrder && isCounterContext ? { address: deliveryAddress, fee: parseCurrency(deliveryFeeInput) } : undefined;
    setTimeout(() => {
      onCloseTable(selectedTable!.id, mainMethod, isFiscalEmission, undefined, isCounterContext, deliveryInfo, isFiscalEmission ? customerDocumentInput : undefined);
      setIsProcessing(false);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setIsSplitting(false);
      setIsDeliveryOrder(false);
      setDeliveryAddress('');
      setDeliveryFeeInput('0');
    }, 2000);
  };

  const finishFiadoPayment = () => {
    if (!selectedTable || !selectedCustomerId) return;
    setIsProcessing(true);
    const deliveryInfo = isDeliveryOrder && isCounterContext ? { address: deliveryAddress, fee: parseCurrency(deliveryFeeInput) } : undefined;
    setTimeout(() => {
      onCloseTable(selectedTable.id, 'conta_cliente', isFiscalEmission, selectedCustomerId, isCounterContext, deliveryInfo, isFiscalEmission ? customerDocumentInput : undefined);
      setIsProcessing(false);
      setShowCustomerSelection(false);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setSelectedCustomerId('');
      setCustomerSearch('');
      setIsDeliveryOrder(false);
      setDeliveryAddress('');
      setDeliveryFeeInput('0');
    }, 1500);
  };

  const toggleSplitItem = (idx: number) => {
    setSelectedSplitItems(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'TODOS' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['TODOS', ...cats];
  }, [products]);

  return (
    <div className="space-y-2">
      {/* Barra de Gestão Superior */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-2 rounded-xl border shadow-sm gap-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowCashModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all shadow-md ${cashSession.isOpen ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-rose-500 text-white shadow-rose-100'}`}
          >
            {cashSession.isOpen ? <Unlock size={14} /> : <Lock size={14} />}
            Caixa {cashSession.isOpen ? 'Aberto' : 'Fechado'}
          </button>
          
          {cashSession.isOpen && (
            <div className="hidden sm:flex gap-2">
               <div className="text-left border-l pl-2">
                  <p className="text-[7px] font-black text-slate-400 uppercase">Fundo Inicial</p>
                  <p className="font-black text-slate-700 text-[10px]">R$ {cashSession.openingValue.toFixed(2)}</p>
               </div>
               <div className="text-left border-l pl-2">
                  <p className="text-[7px] font-black text-slate-400 uppercase">Vendas Atual</p>
                  <p className="font-black text-indigo-600 text-[10px]">R$ {cashReport?.totalSales.toFixed(2)}</p>
               </div>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 w-full lg:w-auto">
           <div className="relative flex-1 lg:w-36">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input type="text" placeholder="Pesquisar mesa..." className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-[10px]" />
           </div>
           <button 
            onClick={handleNewCounter}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
           >
              <Store size={12} /> Novo Balcão
           </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
           <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1.5 flex items-center gap-1.5">
              <Utensils size={10} /> Mapa de Mesas
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
              {tables.map(table => (
                <button key={table.id} onClick={() => openTable(table)} disabled={table.status === 'cleaning'} className={`aspect-square p-1.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-0.5 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${getTableStatusColor(table.status)} shadow-sm`}>
                  <div className="text-current">{table.status === 'available' ? <Utensils size={16} /> : table.status === 'occupied' ? <Users size={16} /> : table.status === 'billing' ? <CreditCard size={16} /> : <Utensils size={16} className="animate-spin" />}</div>
                  <div className="text-center"><h3 className="text-sm font-black">Mesa {table.id}</h3><p className="text-[6px] uppercase font-black tracking-widest opacity-60">{table.status}</p></div>
                  {table.total > 0 && <div className="mt-0.5 text-[8px] font-black bg-white/60 px-1 py-0.5 rounded-md shadow-sm">R$ {table.total.toFixed(2)}</div>}
                </button>
              ))}
           </div>
        </div>

        {counterOrders.length > 0 && (
          <div>
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1.5 flex items-center gap-1.5">
                <Store size={10} /> Comandas de Balcão Ativas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
               {counterOrders.map(order => (
                  <button 
                    key={order.id} 
                    onClick={() => openCounterOrder(order)}
                    className="flex items-center justify-between p-1.5 bg-white rounded-lg border-2 border-slate-100 hover:border-indigo-600 transition-all shadow-sm group"
                  >
                     <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-all">
                           <ShoppingBag size={14} />
                        </div>
                        <div className="text-left">
                           <p className="font-black text-slate-800 text-[10px]">Balcão #{order.id.toString().slice(-4)}</p>
                           <p className="text-[6px] font-bold text-slate-400 uppercase">{order.items.length} itens</p>
                        </div>
                     </div>
                     <p className="font-black text-indigo-600 text-[10px]">R$ {order.total.toFixed(2)}</p>
                  </button>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Caixa */}
      {showCashModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className={`p-4 border-b flex justify-between items-center text-white shrink-0 ${cashSession.isOpen ? 'bg-indigo-600' : 'bg-rose-500'}`}>
                 <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl shadow-inner">{cashSession.isOpen ? <Unlock size={20} /> : <Lock size={20} />}</div><div><h2 className="text-lg font-black">{cashSession.isOpen ? 'Fechamento de Caixa' : 'Abertura de Caixa'}</h2><p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{cashSession.isOpen ? 'Conferência de Vendas' : 'Fundo de troco'}</p></div></div>
                 <button onClick={() => setShowCashModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                 {!cashSession.isOpen ? (
                    <div className="space-y-4 text-center py-6">
                       <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Valor de Fundo Inicial / Troco</p>
                       <div className="relative max-w-[240px] mx-auto">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">R$</span>
                          <input type="number" className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-3xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-center" value={openingValueInput} onChange={(e) => setOpeningValueInput(e.target.value)} autoFocus />
                       </div>
                       <button onClick={() => { onOpenCash(parseFloat(openingValueInput) || 0); setShowCashModal(false); }} className="w-full max-w-[240px] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all">Confirmar Abertura</button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Vendido</p>
                             <h4 className="text-lg font-black text-slate-800 tracking-tighter">R$ {cashReport?.totalSales.toFixed(2)}</h4>
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total em Espécie</p>
                             <h4 className="text-lg font-black text-emerald-700 tracking-tighter">R$ {cashReport?.expectedFinalValue.toFixed(2)}</h4>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                             <PieChart size={14} /> Detalhamento por Meio de Pagamento
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {[
                               { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                               { id: 'pix', label: 'PIX', icon: Smartphone, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                               { id: 'cartao_credito', label: 'C. Crédito', icon: CardIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
                               { id: 'cartao_debito', label: 'C. Débito', icon: CardIcon, color: 'text-sky-500', bg: 'bg-sky-50' },
                               { id: 'vale_refeicao', label: 'Ticket / VR', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-50' },
                               { id: 'conta_cliente', label: 'Fiado', icon: UserCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
                             ].map(method => (
                                <div key={method.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                   <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-xl ${method.bg} ${method.color}`}><method.icon size={18} /></div>
                                      <p className="font-bold text-slate-700 text-xs">{method.label}</p>
                                   </div>
                                   <p className="font-black text-slate-800 text-sm">R$ {cashReport?.totalsByMethod[method.id as keyof typeof cashReport.totalsByMethod].toFixed(2)}</p>
                                </div>
                             ))}
                          </div>
                       </div>

                       <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-4">
                             <div className="p-4 bg-white rounded-2xl shadow-sm border"><DollarSign className="text-indigo-600" /></div>
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Fundo Inicial de Troco</p>
                                <p className="font-black text-slate-800">R$ {cashSession.openingValue.toFixed(2)}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Meios Eletrônicos</p>
                             <p className="font-black text-slate-800">R$ {cashReport?.electronicTotal.toFixed(2)}</p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor em Dinheiro para Fechamento (Conferido)</label>
                          <div className="relative">
                             <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">R$</span>
                             <input 
                                type="text" 
                                className="w-full pl-16 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all" 
                                value={closingValueInput} 
                                onChange={(e) => setClosingValueInput(formatCurrency(e.target.value))} 
                             />
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações do Fechamento (Opcional)</label>
                          <textarea 
                             className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all resize-none text-sm"
                             rows={2}
                             placeholder="Ex: Diferença de R$ 2,00 devido a troco..."
                             value={closingObservations}
                             onChange={(e) => setClosingObservations(e.target.value)}
                          />
                       </div>

                       <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-700">
                          <AlertTriangle size={20} className="shrink-0" />
                          <p className="text-[10px] font-bold leading-tight uppercase">Confira os valores na gaveta e no terminal de cartão antes de confirmar o encerramento. Divergências devem ser justificadas no log.</p>
                       </div>
                       
                       <button onClick={() => { onCloseCash(parseCurrency(closingValueInput), closingObservations); setShowCashModal(false); setClosingObservations(''); }} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"><Lock size={18} /> Encerrar Turno e Gerar Resumo</button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Modal de Troco */}
      {showChangeModal && selectedTable && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b flex justify-between items-center bg-emerald-50/50">
                 <div className="flex items-center gap-4">
                    <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><Banknote size={24} /></div>
                    <div>
                       <h2 className="text-xl font-black">Pagamento em Dinheiro</h2>
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Cálculo de Troco</p>
                    </div>
                 </div>
                 <button onClick={() => setShowChangeModal(false)} className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="p-6 bg-slate-50 rounded-2xl border text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor a Pagar</p>
                    <h3 className="text-3xl font-black text-slate-800">R$ {(isSplitting ? (splitMode === 'value' ? (parseFloat(customSplitValue) || remainingBalance) : 
                        splitMode === 'items' ? selectedSplitItems.reduce((acc, idx) => acc + (selectedTable.items[idx].price * selectedTable.items[idx].quantity), 0) :
                        remainingBalance) : selectedTable.total + (isDeliveryOrder && isCounterContext ? parseCurrency(deliveryFeeInput) : 0)).toFixed(2)}</h3>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Recebido</label>
                    <div className="relative">
                       <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">R$</span>
                       <input 
                          type="text" 
                          className="w-full pl-16 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-3xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all" 
                          value={amountReceived} 
                          onChange={(e) => setAmountReceived(formatCurrency(e.target.value))} 
                          autoFocus
                       />
                    </div>
                 </div>

                 {parseCurrency(amountReceived) > 0 && (
                    <div className="p-6 bg-indigo-600 rounded-2xl text-white text-center animate-in slide-in-from-top-2">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Troco a Devolver</p>
                       <h3 className="text-4xl font-black tracking-tighter">
                          R$ {Math.max(0, parseCurrency(amountReceived) - (isSplitting ? (splitMode === 'value' ? (parseFloat(customSplitValue) || remainingBalance) : 
                            splitMode === 'items' ? selectedSplitItems.reduce((acc, idx) => acc + (selectedTable.items[idx].price * selectedTable.items[idx].quantity), 0) :
                            remainingBalance) : selectedTable.total + (isDeliveryOrder && isCounterContext ? parseCurrency(deliveryFeeInput) : 0))).toFixed(2)}
                       </h3>
                    </div>
                 )}
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                 <button onClick={() => setShowChangeModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Cancelar</button>
                 <button onClick={finishCashPayment} disabled={parseCurrency(amountReceived) < (isSplitting ? (splitMode === 'value' ? (parseFloat(customSplitValue) || remainingBalance) : 
                        splitMode === 'items' ? selectedSplitItems.reduce((acc, idx) => acc + (selectedTable.items[idx].price * selectedTable.items[idx].quantity), 0) :
                        remainingBalance) : selectedTable.total + (isDeliveryOrder && isCounterContext ? parseCurrency(deliveryFeeInput) : 0))} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"><Check size={18} /> Confirmar Recebimento</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Comanda (Mesa ou Balcão) - NOVO LAYOUT PDV */}
      {selectedTable && !showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#f8fafc] w-full h-full lg:h-[95vh] lg:w-[98vw] lg:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            
            {/* Header Superior Estilo Imagem */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                     <Store size={24} />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        Vender <span className="bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full text-xs uppercase tracking-widest">{isCounterContext ? 'PDV BALCÃO' : `MESA ${selectedTable.id}`}</span>
                     </h2>
                  </div>
               </div>

               <div className="flex items-center gap-8">
                  <div className="flex gap-6">
                     <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos</p>
                        <p className="font-black text-slate-700">R$ {selectedTable.total.toFixed(2)}</p>
                     </div>
                     <div className="text-center border-l pl-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa Serviço</p>
                        <p className="font-black text-slate-700">R$ 0,00</p>
                     </div>
                     <div className="text-center border-l pl-6">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Valor Final</p>
                        <p className="text-xl font-black text-indigo-600">R$ {(selectedTable.total + (isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0)).toFixed(2)}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
               </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               
               {/* Coluna Esquerda: Itens do Pedido */}
               <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r flex flex-col shadow-sm h-[300px] lg:h-auto">
                  <div className="p-4 border-b bg-slate-50/50 flex gap-2">
                     <button 
                        onClick={() => setIsDeliveryOrder(true)}
                        className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase transition-all ${isDeliveryOrder ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                     >
                        Delivery
                     </button>
                     <button 
                        onClick={() => setIsDeliveryOrder(false)}
                        className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase transition-all ${!isDeliveryOrder ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                     >
                        Retirada
                     </button>
                  </div>

                  {isDeliveryOrder && (
                    <div className="p-4 bg-indigo-50/50 border-b space-y-3 animate-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest ml-1">Endereço de Entrega</label>
                        <textarea 
                          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                          rows={2}
                          placeholder="Rua, número, bairro..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest ml-1">Taxa de Entrega (R$)</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all"
                          value={deliveryFeeInput}
                          onChange={(e) => setDeliveryFeeInput(formatCurrency(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                     {selectedTable.items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
                           <div className="p-6 border-2 border-dashed rounded-full border-slate-200"><ShoppingBag size={40} /></div>
                           <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item lançado</p>
                        </div>
                     ) : (
                        selectedTable.items.map((item, index) => (
                           <div 
                             key={index} 
                             onClick={() => startEditItem(index)}
                             className="group relative bg-slate-50 rounded-2xl border border-slate-100 p-3 hover:border-indigo-200 transition-all cursor-pointer hover:bg-indigo-50/30"
                           >
                              <div className="flex justify-between items-start mb-1">
                                 <p className="font-black text-slate-800 text-xs leading-tight pr-6">{item.name}</p>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); removeItem(index); }} 
                                   className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                              </div>
                              <div className="flex justify-between items-end">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400">{item.quantity}x</span>
                                    <span className="text-[10px] font-bold text-slate-400">R$ {item.price.toFixed(2)}</span>
                                    {item.observation && (
                                      <span className="flex items-center gap-1 text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        <MessageSquare size={8} /> Obs
                                      </span>
                                    )}
                                 </div>
                                 <p className="font-black text-indigo-600 text-xs">R$ {(item.price * item.quantity).toFixed(2)}</p>
                              </div>
                           </div>
                        ))
                     )}
                  </div>

                  <div className="p-4 border-t bg-slate-50 space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                        <span className="font-black text-slate-700">R$ {selectedTable.total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-lg font-black text-slate-800">
                        <span>Total</span>
                        <span className="text-indigo-600">R$ {(selectedTable.total + (isDeliveryOrder ? parseCurrency(deliveryFeeInput) : 0)).toFixed(2)}</span>
                     </div>
                  </div>
               </div>

               {/* Coluna Central: Busca e Grid de Produtos */}
               <div className="flex-1 flex flex-col min-w-0">
                  <div className="p-4 bg-white border-b">
                     <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                           ref={searchInputRef}
                           type="text" 
                           placeholder="(F2) Nome/código/código de barras" 
                           className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                           value={productSearch}
                           onChange={(e) => setProductSearch(e.target.value)}
                           autoFocus
                        />
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 custom-scrollbar content-start">
                     {filteredProducts.map(product => (
                        <button 
                           key={product.id} 
                           onClick={() => addToTable(product)}
                           className="aspect-[4/5] bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500 hover:-translate-y-1 transition-all text-left flex flex-col overflow-hidden group"
                        >
                           <div className="flex-1 p-4 flex flex-col items-center justify-center text-center gap-2">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden mb-1">
                                 <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                              </div>
                              <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-tight line-clamp-2">{product.name}</h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{product.id.slice(-4)}</p>
                           </div>
                           <div className="bg-slate-50 group-hover:bg-indigo-600 py-3 px-4 flex justify-center items-center transition-colors">
                              <p className="font-black text-slate-700 group-hover:text-white text-sm">R$ {product.price.toFixed(2)}</p>
                           </div>
                        </button>
                     ))}
                  </div>
               </div>

               {/* Coluna Direita: Categorias */}
               <div className="hidden lg:flex w-56 bg-white border-l flex-col shrink-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                     {categories.map(cat => (
                        <button 
                           key={cat}
                           onClick={() => setSelectedCategory(cat)}
                           className={`w-full py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all text-center ${
                              selectedCategory === cat 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                              : 'bg-white border-slate-50 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                           }`}
                        >
                           {cat}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Categorias Mobile */}
               <div className="lg:hidden bg-white border-t p-2 overflow-x-auto flex gap-2 shrink-0 custom-scrollbar">
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        selectedCategory === cat 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
               </div>
            </div>

            {/* Barra de Ações Inferior */}
            <div className="bg-white border-t p-4 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
               <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => setSelectedTable(null)} className="flex-1 sm:px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Sair</button>
                  <button 
                    onClick={handleSendToKitchenLocal}
                    disabled={isSendingToKitchen || selectedTable.items.length === 0}
                    className="flex-1 sm:px-6 py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100 disabled:opacity-50"
                  >
                    {isSendingToKitchen ? <Loader2 size={16} className="animate-spin" /> : <ChefHat size={16} />}
                    Cozinha
                  </button>
               </div>
               
               <div className="flex gap-3 items-center w-full sm:w-auto">
                  {showKitchenSuccess && (
                    <div className="hidden md:flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase animate-in fade-in slide-in-from-right-2">
                      <CheckCircle2 size={16} /> Pedido Enviado!
                    </div>
                  )}
                  <button className="hidden sm:block px-4 py-4 text-slate-400 hover:text-indigo-600 transition-colors"><Printer size={24} /></button>
                  <button 
                     disabled={selectedTable.items.length === 0}
                     onClick={openPayment}
                     className="flex-1 sm:px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                     Pagar <ArrowRight size={20} />
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* NOVO Modal: Edição de Detalhes do Item (Observação) */}
      {editingItemIndex !== null && selectedTable && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b flex justify-between items-center bg-indigo-50/50">
                 <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><Edit3 size={24} /></div>
                    <div>
                       <h2 className="text-xl font-black">Detalhes do Item</h2>
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{selectedTable.items[editingItemIndex].name}</p>
                    </div>
                 </div>
                 <button onClick={() => setEditingItemIndex(null)} className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="p-8 space-y-8">
                 {/* Observações com IA */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><MessageSquare size={12} /> Observações de Preparo</label>
                       {loadingSuggestions && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                    </div>
                    <textarea 
                       className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none text-sm"
                       rows={3}
                       placeholder="Ex: Sem cebola, bem passado..."
                       value={tempObs}
                       onChange={(e) => setTempObs(e.target.value)}
                       autoFocus
                    />
                    
                    {suggestions.length > 0 && (
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-1"><Sparkles size={10} /> Sugestões GastroAI</p>
                          <div className="flex flex-wrap gap-2">
                             {suggestions.map((sug, i) => (
                                <button 
                                   key={i} 
                                   onClick={() => setTempObs(sug)}
                                   className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                   {sug}
                                </button>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>

                 {/* Ajustes de Assento e Quantidade */}
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Para quem?</label>
                       <input 
                          type="text" 
                          className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500"
                          value={tempSeat}
                          onChange={(e) => setTempSeat(e.target.value)}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                       <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border">
                          <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center shadow-sm"><Minus size={14} /></button>
                          <span className="flex-1 text-center font-black text-slate-800">{tempQty}</span>
                          <button onClick={() => setTempQty(tempQty + 1)} className="w-8 h-8 bg-white text-slate-400 rounded-lg flex items-center justify-center shadow-sm"><Plus size={14} /></button>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-4">
                 <button onClick={() => setEditingItemIndex(null)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Descartar</button>
                 <button onClick={saveItemEdit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"><Save size={18} /> Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Pagamento & Divisão de Conta */}
      {showPaymentModal && selectedTable && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[90vh]">
            <div className="p-8 border-b flex justify-between items-center bg-emerald-600 text-white shrink-0">
               <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl"><Wallet size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black">Finalizar {isCounterContext ? 'Balcão' : `Mesa ${selectedTable.id}`}</h2>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Total: R$ {selectedTable.total.toFixed(2)}</p>
                  </div>
               </div>
               <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
               {/* Esquerda: Status da Divisão / Saldo */}
               <div className="w-full lg:w-[400px] border-r bg-slate-50/50 p-8 flex flex-col space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2 text-center bg-white p-8 rounded-[2rem] shadow-sm border">
                     <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Saldo Remanescente</p>
                     <h1 className={`text-5xl font-black tracking-tighter ${remainingBalance > 0 ? 'text-slate-800' : 'text-emerald-600'}`}>R$ {remainingBalance.toFixed(2)}</h1>
                     {remainingBalance <= 0 && <div className="mt-2 flex items-center justify-center gap-1 text-emerald-600 font-black text-[10px] uppercase"><CheckCircle2 size={12} /> Conta Liquidada</div>}
                  </div>

                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Pagamentos Efetuados</p>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{splitParts.length} partes</span>
                     </div>
                     <div className="space-y-2">
                        {splitParts.map(part => (
                           <div key={part.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm animate-in slide-in-from-left-2">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Check size={14} strokeWidth={4} /></div>
                                 <p className="text-xs font-black text-slate-700 uppercase">{part.method.replace('_', ' ')}</p>
                              </div>
                              <p className="font-black text-slate-800 text-sm">R$ {part.amount.toFixed(2)}</p>
                           </div>
                        ))}
                        {splitParts.length === 0 && (
                           <div className="py-10 text-center opacity-30 grayscale flex flex-col items-center gap-2">
                              <History size={32} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pagamento</p>
                           </div>
                        )}
                     </div>
                  </div>

                  {!isSplitting && remainingBalance > 0 && (
                     <button 
                        onClick={() => setIsSplitting(true)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-50 text-indigo-600 border-2 border-indigo-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                     >
                        <Calculator size={16} /> Dividir Conta
                     </button>
                  )}
               </div>

               {/* Direita: Seleção de Valor / Método */}
               <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  {!showCustomerSelection ? (
                    <div className="space-y-8 h-full">
                       {isSplitting && !splitMode && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                             <h3 className="text-lg font-black text-slate-800">Como deseja dividir?</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => setSplitMode('value')} className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col gap-4 group">
                                   <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit group-hover:bg-indigo-600 group-hover:text-white transition-all"><DollarSign size={24} /></div>
                                   <div><p className="font-black text-slate-800">Valor Específico</p><p className="text-[10px] font-bold text-slate-400 uppercase">Defina o quanto pagar agora</p></div>
                                </button>
                                <button onClick={() => setSplitMode('items')} className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col gap-4 group">
                                   <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all"><ListChecks size={24} /></div>
                                   <div><p className="font-black text-slate-800">Por Itens</p><p className="text-[10px] font-bold text-slate-400 uppercase">Selecione o que pagar</p></div>
                                </button>
                             </div>
                             <button onClick={() => setIsSplitting(false)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Voltar ao pagamento total</button>
                          </div>
                       )}

                       {( (!isSplitting) || (isSplitting && splitMode) ) && (
                          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                             <div className="flex justify-between items-end">
                                <div>
                                   <h3 className="text-xl font-black text-slate-800">{isSplitting ? (splitMode === 'value' ? 'Lançar Valor Manual' : 'Pagar Itens Selecionados') : 'Pagamento Único'}</h3>
                                   <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Etapa final do despacho</p>
                                </div>
                                {splitMode && <button onClick={() => setSplitMode(null)} className="text-xs font-bold text-slate-400 hover:text-indigo-600">Alterar Modo</button>}
                             </div>

                             <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                                {splitMode === 'value' && (
                                   <div className="space-y-4">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Informe o Valor</label>
                                      <div className="relative">
                                         <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">R$</span>
                                         <input 
                                          type="number" 
                                          className="w-full pl-20 pr-8 py-6 bg-white border-2 border-indigo-100 rounded-[2rem] text-4xl font-black text-indigo-600 focus:border-indigo-500 outline-none transition-all" 
                                          value={customSplitValue}
                                          onChange={(e) => setCustomSplitValue(e.target.value)}
                                          placeholder={remainingBalance.toFixed(2)}
                                          autoFocus
                                         />
                                      </div>
                                   </div>
                                )}

                                {splitMode === 'items' && (
                                   <div className="space-y-4">
                                      <div className="flex justify-between items-center px-1">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marque os Itens</label>
                                         <p className="text-xs font-black text-indigo-600">Subtotal: R$ {selectedSplitItems.reduce((acc, idx) => acc + (selectedTable.items[idx].price * selectedTable.items[idx].quantity), 0).toFixed(2)}</p>
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                         {selectedTable.items.map((item, idx) => {
                                             const isPaid = paidItemIndices.includes(idx);
                                             return (
                                                <button 
                                                   key={idx} 
                                                   disabled={isPaid}
                                                   onClick={() => toggleSplitItem(idx)} 
                                                   className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isPaid ? 'opacity-40 grayscale bg-slate-100 border-slate-200' : selectedSplitItems.includes(idx) ? 'border-indigo-600 bg-indigo-50' : 'bg-white border-slate-50'}`}
                                                >
                                               <div className="flex items-center gap-3">
                                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isPaid ? 'bg-slate-400 border-slate-400 text-white' : selectedSplitItems.includes(idx) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>{ (isPaid || selectedSplitItems.includes(idx)) && <Check size={14} strokeWidth={4} />}</div>
                                                  <div className="text-left"><p className="text-xs font-black text-slate-700">{item.name}</p><p className="text-[10px] font-bold text-slate-400">{item.quantity}x R$ {item.price.toFixed(2)}</p></div>
                                               </div>
                                               <p className="font-black text-slate-800 text-sm">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                            </button>
                                         );
                                      })}
                                      </div>
                                   </div>
                                )}

                                {!isSplitting && (
                                   <div className="text-center py-6">
                                      <p className="text-sm font-bold text-slate-500">Deseja realizar o pagamento total da conta agora?</p>
                                   </div>
                                )}
                             </div>

                              <div className="space-y-4 flex-1">
                                 <div className="flex items-center justify-between px-2">
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Selecione o Método para esta {isSplitting ? 'parte' : 'conta'}</p>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                       <div className={`w-8 h-4 rounded-full relative transition-all ${isFiscalEmission ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                          <input type="checkbox" className="hidden" checked={isFiscalEmission} onChange={(e) => setIsFiscalEmission(e.target.checked)} />
                                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isFiscalEmission ? 'left-[18px]' : 'left-0.5'}`} />
                                       </div>
                                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Emitir Cupom Fiscal</span>
                                    </label>
                                 </div>

                                 {isFiscalEmission && (
                                   <div className="px-2 animate-in slide-in-from-top-2 duration-300">
                                     <div className="relative">
                                       <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                       <input 
                                         type="text" 
                                         placeholder="CPF ou CNPJ no cupom (opcional)" 
                                         className="w-full pl-12 pr-4 py-3 bg-white border-2 border-emerald-100 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                                         value={customerDocumentInput}
                                         onChange={(e) => setCustomerDocumentInput(e.target.value)}
                                       />
                                     </div>
                                   </div>
                                 )}

                                 {!showCardOptions ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      {[
                                        { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-500' },
                                        { id: 'pix', label: 'PIX', icon: Smartphone, color: 'text-indigo-500' },
                                        { id: 'cartao', label: 'Cartão', icon: CreditCard, color: 'text-blue-600' },
                                        { id: 'conta_cliente', label: 'Fiado', icon: UserCircle, color: 'text-rose-500' },
                                      ].map(method => (
                                        <button 
                                          key={method.id} 
                                          disabled={isProcessing || (splitMode === 'items' && selectedSplitItems.length === 0)} 
                                          onClick={() => {
                                            if (method.id === 'cartao') {
                                              setShowCardOptions(true);
                                            } else {
                                              handleProcessPayment(method.id as PaymentMethod);
                                            }
                                          }} 
                                          className="p-6 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-center flex flex-col items-center gap-3 group active:scale-95 disabled:opacity-30 disabled:grayscale"
                                        >
                                          <div className={`p-4 bg-slate-50 shadow-sm border rounded-2xl w-fit ${method.color} group-hover:scale-110 transition-transform`}><method.icon size={28} /></div>
                                          <p className="font-black text-slate-800 text-xs uppercase tracking-tighter">{method.label}</p>
                                        </button>
                                      ))}
                                    </div>
                                 ) : (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                       <div className="flex items-center justify-between">
                                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Opções de Cartão</h4>
                                          <button onClick={() => setShowCardOptions(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Voltar</button>
                                       </div>
                                       <div className="grid grid-cols-3 gap-3">
                                          {[
                                             { id: 'cartao_debito', label: 'Débito', icon: CreditCard },
                                             { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                                             { id: 'vale_refeicao', label: 'Voucher', icon: Ticket },
                                          ].map(card => (
                                             <button 
                                                key={card.id}
                                                onClick={() => {
                                                   handleProcessPayment(card.id as PaymentMethod);
                                                   setShowCardOptions(false);
                                                }}
                                                className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-500 hover:shadow-md transition-all text-center flex flex-col items-center gap-2 group active:scale-95"
                                             >
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><card.icon size={20} /></div>
                                                <p className="font-black text-slate-800 text-[10px] uppercase">{card.label}</p>
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                          </div>
                       )}
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-right-10 duration-300">
                       <div className="p-8 border-b bg-rose-600 text-white flex justify-between items-center rounded-t-3xl"><div className="flex items-center gap-4"><div className="bg-white/20 p-3 rounded-2xl"><UserCircle size={24} /></div><div><h2 className="text-xl font-black">Selecionar Cliente</h2><p className="text-xs font-bold uppercase opacity-80">Lançamento em Conta Fiado</p></div></div><button onClick={() => setShowCustomerSelection(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={24} /></button></div>
                       <div className="p-8 space-y-6">
                          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Nome do cliente..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border rounded-2xl font-bold outline-none" value={customerSearch} onChange={(e)=>setCustomerSearch(e.target.value)} /></div>
                          <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar">
                             {filteredCustomerList.map(c => (
                                <button key={c.id} onClick={() => setSelectedCustomerId(c.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedCustomerId === c.id ? 'border-rose-600 bg-rose-50' : 'border-slate-50 bg-white hover:border-slate-200'}`}>
                                   <div className="text-left"><p className="font-black text-slate-800">{c.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.document}</p></div>
                                   {selectedCustomerId === c.id && <CheckCircle2 size={24} className="text-rose-600" />}
                                </button>
                             ))}
                          </div>
                       </div>
                       <div className="p-8 border-t bg-slate-50 flex gap-4"><button onClick={() => setShowCustomerSelection(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Voltar</button><button onClick={finishFiadoPayment} disabled={!selectedCustomerId || isProcessing} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50">Lançar Fiado (R$ {remainingBalance.toFixed(2)})</button></div>
                    </div>
                  )}
               </div>
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-[70] animate-in fade-in"><div className="w-24 h-24 border-t-4 border-indigo-600 rounded-full animate-spin"></div><p className="text-xl font-black text-slate-800">Processando Pagamento...</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tables;
