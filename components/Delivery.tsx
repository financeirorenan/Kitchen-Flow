
import React, { useState, useMemo } from 'react';
import { Order, Courier, FinancialRecord } from '../types';
import { 
  Navigation, CheckCircle2, 
  User as UserIcon, Phone, MapPin, Package,
  ChevronRight, Bike, X, UserCheck, 
  TrendingUp, Settings, Plus,
  Save, UserPlus, Wallet, ArrowRightLeft,
  Banknote, QrCode, ClipboardList, Timer, Clock,
  Coins, CreditCard, DollarSign, Calculator, AlertTriangle, Edit3,
  Search, Filter, Store
} from 'lucide-react';

interface DeliveryProps {
  orders: Order[];
  couriers: Courier[];
  deliveryFee: number;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onAssignCourier: (orderId: string, courierId: string) => void;
  onAddCourier: (courier: Partial<Courier>) => void;
  onUpdateCourier: (id: string, updates: Partial<Courier>) => void;
  onUpdateDeliveryFee: (fee: number) => void;
  onAddFinancialRecord: (record: Partial<FinancialRecord>) => void;
}

const Delivery: React.FC<DeliveryProps> = ({ 
  orders, 
  couriers, 
  deliveryFee,
  onUpdateStatus, 
  onAssignCourier,
  onAddCourier,
  onUpdateCourier,
  onUpdateDeliveryFee,
  onAddFinancialRecord
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'couriers' | 'settlement' | 'settings'>('monitor');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAddCourierModal, setShowAddCourierModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState<any | null>(null);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  
  // States para filtros do monitor
  const [monitorSearch, setMonitorSearch] = useState('');
  const [monitorStatusFilter, setMonitorStatusFilter] = useState<'ready' | 'preparing' | 'all'>('ready');

  // Settlement Multimeios
  const [settlementPayments, setSettlementPayments] = useState<{ [key: string]: number }>({
    dinheiro: 0,
    pix: 0,
    cartao: 0
  });

  // Courier Form
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [newCourierPix, setNewCourierPix] = useState('');
  const [newCourierDailyFee, setNewCourierDailyFee] = useState('0');
  const [newCourierVehicle, setNewCourierVehicle] = useState<'moto' | 'bike' | 'car'>('moto');

  const deliveryOrders = useMemo(() => orders.filter(o => o.type === 'delivery'), [orders]);

  // Filtro dinâmico para a coluna de despacho
  const filteredDispatchOrders = useMemo(() => {
    return deliveryOrders.filter(o => {
      const matchesStatus = monitorStatusFilter === 'all' 
        ? ['preparing', 'ready'].includes(o.status) 
        : o.status === monitorStatusFilter;
      
      const matchesSearch = 
        o.id.toLowerCase().includes(monitorSearch.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(monitorSearch.toLowerCase()) ||
        (o.customerAddress || '').toLowerCase().includes(monitorSearch.toLowerCase());
        
      return matchesStatus && matchesSearch;
    });
  }, [deliveryOrders, monitorStatusFilter, monitorSearch]);

  // Cálculo de acerto de contas por motoboy
  const courierSettlementData = useMemo(() => {
    return couriers.map(courier => {
      const courierOrders = deliveryOrders.filter(o => o.courierId === courier.id && o.status === 'delivered');
      const totalFees = courierOrders.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
      const cashCollected = courierOrders.filter(o => o.paymentMethod === 'dinheiro').reduce((acc, o) => acc + o.total, 0);
      const dailyFee = courier.dailyFee || 0;
      
      return {
        courier,
        orderCount: courierOrders.length,
        totalFees, 
        cashCollected,
        dailyFee,
        balance: (totalFees + dailyFee) - cashCollected
      };
    });
  }, [couriers, deliveryOrders]);

  const handleEditCourier = (courier: Courier) => {
    setEditingCourier(courier);
    setNewCourierName(courier.name);
    setNewCourierPhone(courier.phone);
    setNewCourierPix(courier.pixKey || '');
    setNewCourierDailyFee(courier.dailyFee?.toString() || '0');
    setNewCourierVehicle(courier.vehicleType || 'moto');
    setShowAddCourierModal(true);
  };

  const handleSaveCourier = () => {
    if (!newCourierName || !newCourierPhone) return;

    const courierData = { 
      name: newCourierName, 
      phone: newCourierPhone, 
      pixKey: newCourierPix,
      dailyFee: parseFloat(newCourierDailyFee) || 0,
      vehicleType: newCourierVehicle 
    };

    if (editingCourier) {
      onUpdateCourier(editingCourier.id, courierData);
    } else {
      onAddCourier(courierData);
    }

    resetCourierForm();
    setShowAddCourierModal(false);
  };

  const resetCourierForm = () => {
    setNewCourierName('');
    setNewCourierPhone('');
    setNewCourierPix('');
    setNewCourierDailyFee('0');
    setNewCourierVehicle('moto');
    setEditingCourier(null);
  };

  const openSettlement = (data: any) => {
    setShowSettlementModal(data);
    setSettlementPayments({
      dinheiro: data.balance > 0 ? data.balance : 0,
      pix: 0,
      cartao: 0
    });
  };

  const handleRealizeSettlement = () => {
    if (!showSettlementModal) return;
    const { courier, balance, totalFees, dailyFee, cashCollected } = showSettlementModal;
    
    const totalSelected = (Object.values(settlementPayments) as number[]).reduce((a, b) => a + b, 0);
    
    if (Math.abs(totalSelected - Math.abs(balance)) > 0.01) {
      alert("A soma dos valores informados não confere com o saldo do acerto!");
      return;
    }

    Object.entries(settlementPayments).forEach(([method, amount]) => {
      if ((amount as number) > 0) {
        onAddFinancialRecord({
          type: balance >= 0 ? 'expense' : 'income',
          amount: amount as number,
          category: 'Acerto Motoboy',
          description: `Acerto com ${courier.name} (${method.toUpperCase()}). Taxas: R$${totalFees.toFixed(2)} | Diária: R$${dailyFee.toFixed(2)} | Dinheiro rua: R$${cashCollected.toFixed(2)}`,
          date: new Date()
        });
      }
    });

    alert(`Acerto de ${courier.name} finalizado com sucesso via multimeios!`);
    setShowSettlementModal(null);
  };

  const totalSettlementInput = (Object.values(settlementPayments) as number[]).reduce((a, b) => a + b, 0);
  const remainingSettlement = showSettlementModal ? Math.abs(showSettlementModal.balance) - totalSettlementInput : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Navegação Secundária */}
      <div className="flex bg-white p-0.5 rounded-lg border shadow-sm w-fit">
        {[
          { id: 'monitor', label: 'Monitor Despacho', icon: Navigation },
          { id: 'couriers', label: 'Equipe de Motoboys', icon: UserCheck },
          { id: 'settlement', label: 'Acertos Financeiros', icon: Wallet },
          { id: 'settings', label: 'Configurações', icon: Settings }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-1 px-3 py-1 rounded-md font-black text-[8px] uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>
      {activeSubTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Coluna de Despacho com Filtros */}
          <div className="lg:col-span-4 space-y-2">
            <div className="space-y-1">
              <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Package size={12} /> Aguardando Envio ({filteredDispatchOrders.length})
              </h3>
              
              <div className="bg-white p-2 rounded-xl border shadow-sm space-y-1.5">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input 
                       type="text" 
                       placeholder="Buscar cliente..."
                       className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:border-indigo-500 transition-all"
                       value={monitorSearch}
                       onChange={(e) => setMonitorSearch(e.target.value)}
                    />
                 </div>
                 <div className="flex gap-1">
                    {(['ready', 'preparing', 'all'] as const).map(status => (
                       <button
                          key={status}
                          onClick={() => setMonitorStatusFilter(status)}
                          className={`flex-1 py-1 rounded-md text-[7px] font-black uppercase tracking-widest border transition-all ${monitorStatusFilter === status ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                       >
                          {status === 'ready' ? 'Prontos' : status === 'preparing' ? 'Preparo' : 'Todos'}
                       </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="space-y-2 h-[calc(100vh-16rem)] overflow-y-auto pr-1 custom-scrollbar">
              {filteredDispatchOrders.map(order => (
                <div key={order.id} className={`bg-white p-2.5 rounded-xl border-2 shadow-sm space-y-2 hover:border-indigo-200 transition-colors ${order.status === 'ready' ? 'border-amber-100' : 'border-slate-50 opacity-80'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1">
                         <h4 className="text-sm font-black text-slate-800">#{order.id.slice(-4)}</h4>
                         <span className={`px-1 py-0.5 rounded-full text-[6px] font-black uppercase ${order.status === 'ready' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-500'}`}>
                            {order.status === 'ready' ? 'Pronto' : 'Cozinha'}
                         </span>
                      </div>
                      <p className="text-[7px] font-black uppercase text-slate-400 flex items-center gap-0.5 mt-0.5">
                         <Clock size={8} /> {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m
                      </p>
                    </div>
                    <p className="text-sm font-black text-indigo-600">R$ {order.total.toFixed(2)}</p>
                  </div>
                  
                  <div className="space-y-0.5">
                     <p className="text-[9px] font-black text-slate-700 uppercase">{order.customerName}</p>
                     <div className="flex items-start gap-1 text-[9px] font-medium text-slate-500 bg-slate-50 p-1.5 rounded-lg border">
                        <MapPin size={10} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1 leading-relaxed">{order.customerAddress}</span>
                     </div>
                  </div>

                  <button 
                    disabled={order.status !== 'ready'}
                    onClick={() => setSelectedOrderId(order.id)} 
                    className="w-full py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-700 shadow-sm disabled:opacity-30 disabled:grayscale transition-all"
                  >
                     {order.status === 'ready' ? 'Atribuir Entregador' : 'Aguardando Cozinha'}
                  </button>
                </div>
              ))}

              {filteredDispatchOrders.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale">
                    <Package size={32} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest mt-1 text-[8px]">Nenhum pedido</p>
                 </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-3">
            <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5"><Bike size={12} className="text-indigo-600" /> Motoboys em Atividade</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {courierSettlementData.filter(c => c.courier.status !== 'offline').map(data => (
                  <div key={data.courier.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                     <div className="p-2.5 border-b flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">{data.courier.name.charAt(0)}</div>
                           <div>
                              <p className="font-black text-slate-800 text-[10px]">{data.courier.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{data.courier.vehicleType}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter ${data.courier.status === 'delivering' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {data.courier.status === 'delivering' ? 'Em Rota' : 'Livre'}
                           </span>
                        </div>
                     </div>
                     <div className="p-2 bg-indigo-50/30 flex justify-between items-center mx-2 my-1.5 rounded-lg border border-indigo-100">
                        <div className="text-center flex-1">
                           <p className="text-[6px] font-black uppercase text-indigo-400">Diária</p>
                           <p className="text-[9px] font-black text-indigo-700">R$ {data.dailyFee.toFixed(2)}</p>
                        </div>
                        <div className="h-3 w-px bg-indigo-100"></div>
                        <div className="text-center flex-1">
                           <p className="text-[6px] font-black uppercase text-indigo-400">Taxas</p>
                           <p className="text-[9px] font-black text-indigo-700">R$ {data.totalFees.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="flex-1 p-2.5 space-y-1.5">
                        {deliveryOrders.filter(o => o.courierId === data.courier.id && o.status === 'delivering').map(order => (
                           <div key={order.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg shadow-sm">
                              <div className="flex items-center gap-1.5">
                                 <div className="w-6 h-6 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[8px] font-black">#{order.id.slice(-4)}</div>
                                 <p className="text-[8px] font-black text-slate-700 uppercase">{order.customerName?.split(' ')[0]}</p>
                              </div>
                              <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 shadow-sm"><CheckCircle2 size={12} /></button>
                           </div>
                        ))}
                        {deliveryOrders.filter(o => o.courierId === data.courier.id && o.status === 'delivering').length === 0 && (
                           <div className="py-2 text-center opacity-20 text-[8px] font-black uppercase tracking-widest">Sem entregas</div>
                        )}
                     </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'couriers' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-black text-slate-800">Equipe de Entrega</h3>
             <button onClick={() => { resetCourierForm(); setShowAddCourierModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100"><Plus size={14} /> Cadastrar Entregador</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {couriers.map(courier => (
              <div key={courier.id} className="bg-white p-3 rounded-xl border shadow-sm space-y-3 group hover:shadow-md transition-all">
                <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">{courier.name.charAt(0)}</div>
                   <div>
                     <h4 className="font-black text-slate-800 text-[10px]">{courier.name}</h4>
                     <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">R$ {(courier.dailyFee || 0).toFixed(2)} diária • {courier.vehicleType}</p>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg"><Phone size={10} className="text-slate-400" /><span className="text-[9px] font-bold">{courier.phone}</span></div>
                   <div className="flex items-center gap-1.5 p-1.5 bg-indigo-50 rounded-lg border border-indigo-100"><QrCode size={10} className="text-indigo-600" /><div className="flex-1 overflow-hidden"><p className="text-[6px] font-black text-indigo-400 uppercase">PIX</p><p className="text-[9px] font-bold text-indigo-700 truncate">{courier.pixKey || 'Não cadastrado'}</p></div></div>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleEditCourier(courier)} 
                    className="flex-1 py-1 bg-indigo-50 text-indigo-600 rounded-md font-black text-[7px] uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit3 size={10} /> Editar
                  </button>
                  <button className="flex-1 py-1 border text-slate-400 rounded-md font-black text-[7px] uppercase tracking-widest">Inativar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'settlement' && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
           <div className="bg-indigo-600 p-6 rounded-2xl text-white flex justify-between items-center shadow-md shadow-indigo-100">
              <div className="space-y-1"><h2 className="text-xl font-black tracking-tighter">Acerto Financeiro</h2><p className="text-[10px] text-indigo-100 font-medium">Concilie taxas, diárias e dinheiro recebido em mãos.</p></div>
              <ArrowRightLeft size={32} className="opacity-20" />
           </div>
           <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b"><tr><th className="px-4 py-3 font-black text-slate-400 text-[8px] uppercase">Entregador</th><th className="px-4 py-3 font-black text-slate-400 text-[8px] uppercase text-right">Diária</th><th className="px-4 py-3 font-black text-slate-400 text-[8px] uppercase text-right">Taxas</th><th className="px-4 py-3 font-black text-slate-400 text-[8px] uppercase text-right">Dinheiro em Mão</th><th className="px-4 py-3 font-black text-slate-400 text-[8px] uppercase text-right">Saldo Final</th><th className="px-4 py-3 font-black text-slate-400 text-[8px] uppercase text-center">Ações</th></tr></thead>
                 <tbody className="divide-y">
                    {courierSettlementData.map((data, idx) => (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-black text-slate-800 text-[10px]">{data.courier.name}</td>
                          <td className="px-4 py-3 text-right font-black text-indigo-400 text-[10px]">R$ {data.dailyFee.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-black text-emerald-600 text-[10px]">R$ {data.totalFees.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-black text-rose-600 text-[10px]">R$ {data.cashCollected.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-black text-[10px] ${data.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>R$ {Math.abs(data.balance).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center"><button onClick={() => openSettlement(data)} disabled={data.orderCount === 0 && data.dailyFee === 0} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest disabled:opacity-30 shadow-sm shadow-indigo-100">Realizar Acerto</button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Modal de Seleção de Motoboy (Despacho) */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center"><div><h2 className="text-sm font-black text-slate-800">Despachar Pedido</h2><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pedido #{selectedOrderId.slice(-4)}</p></div><button onClick={() => setSelectedOrderId(null)} className="p-1.5 hover:bg-white rounded-full"><X size={16} /></button></div>
            <div className="p-3 space-y-2">
              {couriers.filter(c => c.status !== 'offline').map(courier => {
                const active = orders.filter(o => o.courierId === courier.id && o.status === 'delivering').length;
                return (
                   <button key={courier.id} onClick={() => { onAssignCourier(selectedOrderId, courier.id); setSelectedOrderId(null); }} className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-slate-50 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-white shadow-sm border rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><Bike size={16} /></div>
                        <div><p className="font-black text-slate-800 text-[10px]">{courier.name}</p><p className="text-[8px] font-black uppercase text-slate-400">{active > 0 ? `${active} entregas ativas` : 'Livre'}</p></div>
                     </div>
                     <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                   </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro / Edição Entregador */}
      {showAddCourierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
                  {editingCourier ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h2 className="text-sm font-black">{editingCourier ? 'Editar Entregador' : 'Novo Entregador'}</h2>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{editingCourier ? 'Atualize os dados de perfil e pagamento' : 'Adicione um novo membro à frota'}</p>
                </div>
              </div>
              <button onClick={() => setShowAddCourierModal(false)} className="p-1.5 hover:bg-white rounded-full transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierName} onChange={(e)=>setNewCourierName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierPhone} onChange={(e)=>setNewCourierPhone(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Diária (R$)</label>
                    <input type="number" className="w-full px-3 py-2 bg-slate-50 border-2 border-indigo-100 rounded-lg font-black text-indigo-600 text-[10px] outline-none focus:border-indigo-500 transition-all" value={newCourierDailyFee} onChange={(e)=>setNewCourierDailyFee(e.target.value)} />
                 </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave PIX</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierPix} onChange={(e)=>setNewCourierPix(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['moto', 'bike', 'car'] as const).map(v => (
                  <button key={v} onClick={() => setNewCourierVehicle(v)} className={`py-1.5 rounded-lg border-2 font-black text-[8px] uppercase transition-all ${newCourierVehicle === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex gap-3">
              <button onClick={() => setShowAddCourierModal(false)} className="flex-1 py-2 font-black text-slate-400 uppercase text-[9px]">Cancelar</button>
              <button onClick={handleSaveCourier} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-indigo-700 transition-all">
                {editingCourier ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO Modal: Acerto Financeiro Multimeios */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b bg-indigo-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl shadow-inner"><Wallet size={18} /></div>
                    <div>
                       <h2 className="text-sm font-black">Acerto: {showSettlementModal.courier.name}</h2>
                       <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">Conciliação Multimeios</p>
                    </div>
                 </div>
                 <button onClick={() => setShowSettlementModal(null)} className="p-1.5 hover:bg-white/20 rounded-full"><X size={18} /></button>
              </div>

              <div className="p-4 flex flex-col lg:flex-row gap-4">
                 {/* Resumo Esquerda */}
                 <div className="flex-1 space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                       <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Resumo do Período</p>
                       <div className="flex justify-between items-center text-[10px] font-bold text-slate-600"><span>Diária</span><span>+ R$ {showSettlementModal.dailyFee.toFixed(2)}</span></div>
                       <div className="flex justify-between items-center text-[10px] font-bold text-slate-600"><span>Taxas</span><span>+ R$ {showSettlementModal.totalFees.toFixed(2)}</span></div>
                       <div className="flex justify-between items-center text-[10px] font-bold text-slate-600"><span>Dinheiro rua</span><span className="text-rose-500">- R$ {showSettlementModal.cashCollected.toFixed(2)}</span></div>
                       <div className="pt-2 border-t flex justify-between items-center">
                          <span className="font-black text-slate-800 text-xs">Saldo Final</span>
                          <span className={`text-lg font-black ${showSettlementModal.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>R$ {Math.abs(showSettlementModal.balance).toFixed(2)}</span>
                       </div>
                    </div>
                    {showSettlementModal.balance < 0 && (
                       <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg flex gap-2 text-rose-700">
                          <AlertTriangle size={14} className="shrink-0" />
                          <p className="text-[8px] font-bold leading-tight uppercase">O motoboy possui mais dinheiro em espécie do que tem a receber. Ele deve devolver a diferença.</p>
                       </div>
                    )}
                 </div>

                 {/* Checkout Direita */}
                 <div className="flex-1 space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Como o acerto será pago?</p>
                    <div className="space-y-2">
                       {[
                         { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                         { id: 'pix', label: 'PIX', icon: QrCode },
                         { id: 'cartao', label: 'Cartão / Depósito', icon: CreditCard }
                       ].map(m => (
                          <div key={m.id} className="relative group">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><m.icon size={14} /></div>
                             <input 
                               type="number" 
                               placeholder={m.label}
                               className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all"
                               value={settlementPayments[m.id] || ''}
                               onChange={(e) => setSettlementPayments({...settlementPayments, [m.id]: parseFloat(e.target.value) || 0})}
                             />
                          </div>
                       ))}
                    </div>

                    <div className="p-3 bg-indigo-50 rounded-xl space-y-1 border border-indigo-100">
                       <div className="flex justify-between items-center text-[7px] font-black uppercase text-indigo-400"><span>Restante</span><span>Status</span></div>
                       <div className="flex justify-between items-center">
                          <span className={`text-sm font-black ${remainingSettlement === 0 ? 'text-emerald-500' : 'text-indigo-600'}`}>R$ {remainingSettlement.toFixed(2)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${remainingSettlement === 0 ? 'bg-emerald-500 text-white' : 'bg-indigo-200 text-indigo-700'}`}>
                             {remainingSettlement === 0 ? 'Conferido' : 'Pendente'}
                          </span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button onClick={() => setShowSettlementModal(null)} className="flex-1 py-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancelar</button>
                 <button 
                  onClick={handleRealizeSettlement} 
                  disabled={remainingSettlement !== 0}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md disabled:opacity-30 disabled:grayscale transition-all"
                 >
                    Confirmar e Gerar Lançamentos
                 </button>
              </div>
          </div>
        </div>
      )}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-100">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">Configurações de Logística</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle as modalidades de entrega e taxas</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Canais de Venda */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidades Ativas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Bike size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">Delivery</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Entrega em domicílio</p>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Store size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">Retirada</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Cliente retira no balcão</p>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxa de Entrega */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Entrega Padrão</h4>
                <div className="p-6 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white rounded-2xl shadow-md text-indigo-600">
                      <Coins size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">Taxa Única</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Aplicada a todos os pedidos delivery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-indigo-600">R$</span>
                    <input 
                      type="number" 
                      className="w-32 px-4 py-3 bg-white border-2 border-indigo-200 rounded-2xl text-xl font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all"
                      value={deliveryFee}
                      onChange={(e) => onUpdateDeliveryFee(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  <Save size={18} /> Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;
