
import React, { useState, useMemo } from 'react';
import { FinancialRecord, Order, Customer, Courier, CustomerTransaction, CashClosingReport } from '../types';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  Plus, Search, Calendar, PieChart, 
  ArrowRightLeft, FileText, CheckCircle2, X, Save,
  Bike, Truck, ArrowRight, History,
  Building2, UserCircle, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
  ClipboardList, Info, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart as RePieChart, Pie
} from 'recharts';

interface FinanceProps {
  orders: Order[];
  customers: Customer[];
  couriers: Courier[];
  manualRecords: FinancialRecord[];
  cashClosings: CashClosingReport[];
  onAddRecord: (record: Partial<FinancialRecord>) => void;
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
}

const Finance: React.FC<FinanceProps> = ({ 
  orders, 
  customers, 
  couriers, 
  manualRecords, 
  cashClosings,
  onAddRecord, 
  onUpdateRecord,
  onUpdateCustomer 
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'transactions' | 'agenda' | 'closings'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedClosing, setSelectedClosing] = useState<CashClosingReport | null>(null);

  // Form states
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Fornecedores');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'paid'>('paid');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const incomeFromOrders = useMemo(() => orders.map(order => ({
    id: order.id,
    type: 'income' as const,
    amount: order.total,
    category: 'Vendas PDV',
    description: `Pedido #${order.id.slice(-4)} (${order.type})`,
    date: order.createdAt,
    status: 'paid' as const
  })), [orders]);

  const allRecords = useMemo(() => [
    ...incomeFromOrders,
    ...manualRecords
  ].sort((a, b) => b.date.getTime() - a.date.getTime()), [incomeFromOrders, manualRecords]);

  // Cálculos de Projeção Reais
  const courierDebts = useMemo(() => {
    return couriers.map(c => {
      const courierOrders = orders.filter(o => o.courierId === c.id && o.status === 'delivered' && o.type === 'delivery');
      const totalFees = courierOrders.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
      const totalDaily = c.dailyFee || 0;
      const cashHand = courierOrders.filter(o => o.paymentMethod === 'dinheiro').reduce((acc, o) => acc + o.total, 0);
      
      // O que o restaurante DEVE ao motoboy
      const balance = (totalFees + totalDaily) - cashHand;
      return { courier: c, balance, orderCount: courierOrders.length };
    });
  }, [couriers, orders]);

  const financialProjection = useMemo(() => {
    const totalFiadoReceivable = customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
    const totalMotoboyPayable = courierDebts.reduce((acc, d) => acc + (d.balance > 0 ? d.balance : 0), 0);
    const totalMotoboyToReceive = courierDebts.reduce((acc, d) => acc + (d.balance < 0 ? Math.abs(d.balance) : 0), 0);
    const totalPendingExpenses = manualRecords
      .filter(r => r.type === 'expense' && r.status === 'pending')
      .reduce((acc, r) => acc + r.amount, 0);

    return {
      fiado: totalFiadoReceivable,
      motoboyPagar: totalMotoboyPayable,
      motoboyReceber: totalMotoboyToReceive,
      fornecedores: totalPendingExpenses,
      totalPayable: totalMotoboyPayable + totalPendingExpenses,
      totalReceivable: totalFiadoReceivable + totalMotoboyToReceive
    };
  }, [customers, courierDebts, manualRecords]);

  const stats = useMemo(() => {
    const totalIncome = allRecords.filter(r => r.type === 'income' && r.status === 'paid').reduce((acc, r) => acc + r.amount, 0);
    const totalExpense = allRecords.filter(r => r.type === 'expense' && r.status === 'paid').reduce((acc, r) => acc + r.amount, 0);
    const netProfit = totalIncome - totalExpense;
    return { totalIncome, totalExpense, netProfit };
  }, [allRecords]);

  const handleSaveRecord = () => {
    if (!formAmount || parseCurrency(formAmount) === 0 || !formDesc) return;
    onAddRecord({
      type: formType,
      amount: parseCurrency(formAmount),
      category: formCategory,
      description: formDesc,
      status: formStatus,
      date: new Date()
    });
    setShowAddModal(false);
    setFormAmount('');
    setFormDesc('');
  };

  const handleSettlePending = (recordId: string) => {
    onUpdateRecord(recordId, { status: 'paid', date: new Date() });
    alert("Conta liquidada com sucesso!");
  };

  const handleSettleFiado = (customer: Customer) => {
    const amount = customer.balance;
    const transaction: CustomerTransaction = {
      id: `baixa-${Date.now()}`,
      type: 'credit',
      amount: amount,
      description: `Liquidação total de fiado via Financeiro`,
      date: new Date(),
      paymentMethod: 'dinheiro'
    };

    onUpdateCustomer(customer.id, {
      balance: 0,
      history: [transaction, ...customer.history]
    });

    onAddRecord({
      type: 'income',
      amount: amount,
      category: 'Recebimento Fiado',
      description: `Baixa Financeira: ${customer.name}`,
      status: 'paid',
      date: new Date()
    });
    alert(`Recebimento de R$ ${amount.toFixed(2)} registrado.`);
  };

  const filteredRecords = allRecords.filter(r => {
    const matchesSearch = r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="flex bg-white p-1 rounded-xl border shadow-sm">
          {[
            { id: 'overview', label: 'Balanço', icon: PieChart },
            { id: 'agenda', label: 'Contas Pagar/Receber', icon: Calendar },
            { id: 'transactions', label: 'Extrato Completo', icon: ArrowRightLeft },
            { id: 'closings', label: 'Fechamentos', icon: ClipboardList },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all ${activeView === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus size={14} strokeWidth={3} /> Novo Lançamento
        </button>
      </div>

      {activeView === 'overview' && (
        <div className="space-y-2">
          {/* Dashboard de Liquidez */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded-xl border shadow-sm relative overflow-hidden group">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Disponibilidade (Saldo Realizado)</p>
                   <h3 className="text-xl font-black text-slate-800 tracking-tighter">R$ {stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                   <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[7px] font-black text-emerald-600 uppercase">Dinheiro em Caixa / Banco</span>
                   </div>
                </div>

                <div className="bg-indigo-600 p-3 rounded-xl shadow-xl relative overflow-hidden text-white">
                   <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign size={24} /></div>
                   <p className="text-[7px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">Projeção Realista (Líquido Esperado)</p>
                   <h3 className="text-xl font-black tracking-tighter">R$ {(stats.netProfit + financialProjection.totalReceivable - financialProjection.totalPayable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                   <div className="mt-0.5 flex items-center gap-1.5">
                      <TrendingUp size={8} className="text-indigo-300" />
                      <p className="text-[7px] font-bold text-indigo-100 uppercase">Considerando Fiados e Pendências</p>
                   </div>
                </div>
             </div>

             <div className="bg-white p-3 rounded-xl border shadow-sm space-y-2">
                <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><History size={10} /> Fluxo Projetado</h4>
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center group cursor-help">
                      <div className="flex items-center gap-1.5"><div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg"><UserCircle size={12} /></div><span className="text-[9px] font-bold text-slate-600">Fiado a Receber</span></div>
                      <span className="text-[10px] font-black text-emerald-600">+ R$ {financialProjection.fiado.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5"><div className="p-1 bg-rose-50 text-rose-600 rounded-lg"><Bike size={12} /></div><span className="text-[9px] font-bold text-slate-600">Pagar Motoboys</span></div>
                      <span className="text-[10px] font-black text-rose-600">- R$ {financialProjection.motoboyPagar.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5"><div className="p-1 bg-amber-50 text-amber-600 rounded-lg"><Truck size={12} /></div><span className="text-[9px] font-bold text-slate-600">Fornecedores Pend.</span></div>
                      <span className="text-[10px] font-black text-rose-600">- R$ {financialProjection.fornecedores.toFixed(2)}</span>
                   </div>
                </div>
                <button onClick={() => setActiveView('agenda')} className="w-full py-1 bg-slate-50 text-slate-500 rounded-lg font-black text-[7px] uppercase tracking-widest hover:bg-slate-100 transition-all">Ver Agenda</button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-xl border shadow-sm">
               <h3 className="text-xs font-black text-slate-800 mb-2">Saúde das Margens</h3>
               <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{name:'Jan', profit: 12000, goal: 15000}, {name:'Fev', profit: 18000, goal: 15000}, {name:'Mar', profit: 14000, goal: 15000}]}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 'bold', fill: '#94a3b8'}} />
                       <Tooltip contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px'}} />
                       <Area type="monotone" dataKey="profit" stroke="#6366f1" fill="#6366f11a" strokeWidth={2} name="Lucro Realizado" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white p-3 rounded-xl border shadow-sm">
               <h3 className="text-xs font-black text-slate-800 mb-2">Onde seu dinheiro está indo</h3>
               <div className="h-[140px] flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                     <RePieChart>
                        <Pie data={[{name:'Fornecedores', v:financialProjection.fornecedores || 1000},{name:'Motoboys', v:financialProjection.motoboyPagar || 500},{name:'Custos Oper.', v:stats.totalExpense || 3000}]} innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="v">
                           {['#f43f5e', '#f59e0b', '#6366f1'].map((color, i) => <Cell key={i} fill={color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{fontSize: '8px', fontWeight: 'bold'}} />
                     </RePieChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'agenda' && (
        <div className="space-y-2 animate-in slide-in-from-bottom-4">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Contas a Receber */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                 <div className="p-3 border-b bg-emerald-50/50 flex justify-between items-center">
                    <div>
                       <h3 className="text-xs font-black text-slate-800">Compromissos de Recebimento</h3>
                       <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Fiados e Devoluções de Motoboy</p>
                    </div>
                    <p className="text-base font-black text-emerald-600">R$ {financialProjection.totalReceivable.toFixed(2)}</p>
                 </div>
                 <div className="flex-1 overflow-y-auto max-h-[250px] p-1.5 space-y-1 custom-scrollbar">
                    {/* Fiados */}
                    {customers.filter(c => c.balance > 0).map(c => (
                       <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                          <div className="flex items-center gap-1.5">
                             <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center text-emerald-500 shadow-sm"><UserCircle size={14} /></div>
                             <div>
                                <p className="font-black text-slate-800 text-[10px]">{c.name}</p>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Fiado Acumulado</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <p className="font-black text-emerald-600 text-[10px]">R$ {c.balance.toFixed(2)}</p>
                             <button 
                                onClick={() => handleSettleFiado(c)}
                                className="p-1 bg-emerald-500 text-white rounded-md shadow-lg shadow-emerald-100 hover:scale-110 transition-all"
                             >
                                <CheckCircle2 size={12} />
                             </button>
                          </div>
                       </div>
                    ))}
                    {/* Motoboys que devem devolver dinheiro */}
                    {courierDebts.filter(d => d.balance < 0).map(d => (
                       <div key={d.courier.id} className="flex items-center justify-between p-2 bg-indigo-50/30 rounded-lg border border-indigo-100 group">
                          <div className="flex items-center gap-1.5">
                             <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center text-indigo-600 shadow-sm"><Bike size={14} /></div>
                             <div>
                                <p className="font-black text-slate-800 text-[10px]">{d.courier.name}</p>
                                <p className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">Dinheiro rua a devolver</p>
                             </div>
                          </div>
                          <p className="font-black text-indigo-600 text-[10px]">R$ {Math.abs(d.balance).toFixed(2)}</p>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Contas a Pagar */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                 <div className="p-3 border-b bg-rose-50/50 flex justify-between items-center">
                    <div>
                       <h3 className="text-xs font-black text-slate-800">Compromissos de Saída</h3>
                       <p className="text-[8px] font-bold text-rose-600 uppercase tracking-widest">Fornecedores e Acertos Motoboy</p>
                    </div>
                    <p className="text-base font-black text-rose-600">R$ {financialProjection.totalPayable.toFixed(2)}</p>
                 </div>
                 <div className="flex-1 overflow-y-auto max-h-[250px] p-1.5 space-y-1 custom-scrollbar">
                    {/* Motoboys a pagar */}
                    {courierDebts.filter(d => d.balance > 0).map(d => (
                       <div key={d.courier.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                          <div className="flex items-center gap-1.5">
                             <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center text-rose-500 shadow-sm"><Bike size={14} /></div>
                             <div>
                                <p className="font-black text-slate-800 text-[10px]">{d.courier.name} (Motoboy)</p>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Diária + Taxas pendentes</p>
                             </div>
                          </div>
                          <p className="font-black text-rose-600 text-[10px]">R$ {d.balance.toFixed(2)}</p>
                       </div>
                    ))}
                    {/* Fornecedores Agendados */}
                    {manualRecords.filter(r => r.type === 'expense' && r.status === 'pending').map(record => (
                       <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                          <div className="flex items-center gap-1.5">
                             <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center text-amber-500 shadow-sm"><Building2 size={14} /></div>
                             <div>
                                <p className="font-black text-slate-800 text-[10px]">{record.description}</p>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{record.category} • Vencendo</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <p className="font-black text-rose-600 text-[10px]">R$ {record.amount.toFixed(2)}</p>
                             <button 
                                onClick={() => handleSettlePending(record.id)}
                                className="p-1 bg-slate-200 text-slate-600 rounded-md hover:bg-emerald-500 hover:text-white transition-all"
                             >
                                <CheckCircle2 size={12} />
                             </button>
                          </div>
                       </div>
                    ))}
                    {manualRecords.filter(r => r.type === 'expense' && r.status === 'pending').length === 0 && (
                       <div className="py-4 text-center opacity-30 grayscale flex flex-col items-center gap-1.5">
                          <CheckCircle2 size={20} />
                          <p className="text-[7px] font-black uppercase tracking-widest">Sem boletos pendentes</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeView === 'closings' && (
        <div className="space-y-2 animate-in slide-in-from-right-4">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-800">Relatórios de Fechamento de Caixa</h3>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Histórico de encerramentos diários</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b">
                  <tr>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Data / Hora</th>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Abertura</th>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Vendas</th>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Esperado</th>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Real</th>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">Diferença</th>
                    <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cashClosings.sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime()).map(closing => (
                    <tr key={closing.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2 text-[10px] font-black text-slate-700">
                        {closing.closedAt.toLocaleDateString('pt-BR')} {closing.closedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2 text-[10px] font-bold text-slate-600">{formatCurrency(closing.openingValue)}</td>
                      <td className="px-4 py-2 text-[10px] font-bold text-slate-600">{formatCurrency(closing.totalSales)}</td>
                      <td className="px-4 py-2 text-[10px] font-bold text-slate-600">{formatCurrency(closing.expectedValue)}</td>
                      <td className="px-4 py-2 text-[10px] font-black text-slate-800">{formatCurrency(closing.actualValue)}</td>
                      <td className={`px-4 py-2 text-right font-black text-[10px] ${closing.difference === 0 ? 'text-slate-500' : closing.difference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {closing.difference > 0 ? '+' : ''} {formatCurrency(closing.difference)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button 
                          onClick={() => setSelectedClosing(closing)}
                          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <Info size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cashClosings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center opacity-30 grayscale flex flex-col items-center gap-1.5">
                        <ClipboardList size={24} />
                        <p className="text-[8px] font-black uppercase tracking-widest">Nenhum fechamento registrado</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Closing Detail Modal */}
      {selectedClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Detalhes do Fechamento</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {selectedClosing.closedAt.toLocaleDateString('pt-BR')} às {selectedClosing.closedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedClosing(null)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Abertura</p>
                  <p className="text-sm font-black text-slate-700">{formatCurrency(selectedClosing.openingValue)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Vendas</p>
                  <p className="text-sm font-black text-slate-700">{formatCurrency(selectedClosing.totalSales)}</p>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Vendas por Método</p>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(selectedClosing.salesByMethod).map(([method, value]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-600 capitalize">{method.replace('_', ' ')}</span>
                      <span className="text-[10px] font-black text-slate-800">{formatCurrency(value as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Esperado</p>
                  <p className="text-[10px] font-black text-slate-700">{formatCurrency(selectedClosing.expectedValue)}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Informado</p>
                  <p className="text-[10px] font-black text-slate-700">{formatCurrency(selectedClosing.actualValue)}</p>
                </div>
                <div className={`p-2 rounded-xl border text-center ${selectedClosing.difference >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <p className={`text-[7px] font-black uppercase tracking-widest mb-0.5 ${selectedClosing.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Diferença</p>
                  <p className={`text-[10px] font-black ${selectedClosing.difference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(selectedClosing.difference)}</p>
                </div>
              </div>

              {selectedClosing.observations && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle size={10} /> Observações
                  </p>
                  <p className="text-[10px] font-medium text-amber-800 italic">"{selectedClosing.observations}"</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50/50">
              <button 
                onClick={() => setSelectedClosing(null)}
                className="w-full py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-500 uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'transactions' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in slide-in-from-right-4">
          <div className="p-3 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between gap-2">
             <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" placeholder="Filtrar lançamentos..." className="w-full pl-9 pr-3 py-1.5 border rounded-xl outline-none font-medium text-[10px]" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
             </div>
             <div className="flex gap-1">
                {(['all', 'income', 'expense'] as const).map(t => (
                   <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${filterType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400'}`}>
                      {t === 'all' ? 'Tudo' : t === 'income' ? 'Entradas' : 'Saídas'}
                   </button>
                ))}
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b">
                <tr>
                  <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Data / Hora</th>
                  <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Categoria</th>
                  <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase">Descrição</th>
                  <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">Status</th>
                  <th className="px-4 py-2 font-black text-slate-400 text-[8px] uppercase text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map(record => (
                   <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2 text-[10px] font-black text-slate-700">{record.date.toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-2"><span className="text-[8px] font-black uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600">{record.category}</span></td>
                    <td className="px-4 py-2 font-bold text-slate-700 text-[10px]">{record.description}</td>
                    <td className="px-4 py-2 text-right">
                       <span className={`px-1 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${record.status === 'pending' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                          {record.status === 'pending' ? 'Pendente' : 'Efetivado'}
                       </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-black text-[10px] ${record.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                       {record.type === 'income' ? '+' : '-'} R$ {record.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Novo Lançamento */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-lg"><Plus size={16} /></div>
                 <h2 className="text-lg font-black text-slate-800">Novo Registro</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-full"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFormType('income')} className={`py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${formType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Receita</button>
                <button onClick={() => setFormType('expense')} className={`py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${formType === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Despesa</button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border">
                <button onClick={() => setFormStatus('paid')} className={`py-1 rounded-md font-black text-[7px] uppercase tracking-widest transition-all ${formStatus === 'paid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>Pago / Recebido</button>
                <button onClick={() => setFormStatus('pending')} className={`py-1 rounded-md font-black text-[7px] uppercase tracking-widest transition-all ${formStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>Agendar</button>
              </div>

              <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-500 font-black text-lg" 
                  value={formAmount ? formatCurrency(parseCurrency(formAmount)) : ''} 
                  onChange={(e) => setFormAmount(e.target.value)} 
                  placeholder="R$ 0,00" 
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                <select className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs" value={formCategory} onChange={(e)=>setFormCategory(e.target.value)}>
                   {formType === 'expense' ? ['Fornecedores', 'Utilidades', 'Aluguel', 'Salários', 'Impostos', 'Outros'].map(c => <option key={c} value={c}>{c}</option>) : ['Vendas PDV', 'Aportes', 'Reembolsos'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none font-medium text-xs" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Ex: Boleto Carnes" />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 font-black text-slate-500 uppercase tracking-widest text-[8px]">Cancelar</button>
              <button onClick={handleSaveRecord} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1.5 shadow-xl shadow-indigo-100"><Save size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
