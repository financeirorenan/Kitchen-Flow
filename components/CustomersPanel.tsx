
import React, { useState, useMemo } from 'react';
import { Customer, CustomerTransaction, FinancialRecord } from '../types';
import { 
  UserPlus, Search, Phone, Mail, MapPin, 
  FileText, History, Wallet, ArrowDownCircle, 
  ArrowUpCircle, X, Check, Save, Plus,
  DollarSign, MoreVertical, CreditCard, Banknote, Smartphone,
  AlertCircle, ChevronRight, UserCircle, Edit3
} from 'lucide-react';

interface CustomersPanelProps {
  customers: Customer[];
  onAddCustomer: (customer: Partial<Customer>) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onAddFinancialRecord: (record: Partial<FinancialRecord>) => void;
}

const CustomersPanel: React.FC<CustomersPanelProps> = ({ 
  customers, 
  onAddCustomer, 
  onUpdateCustomer,
  onAddFinancialRecord 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBaixaModal, setShowBaixaModal] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Baixa Form
  const [baixaAmount, setBaixaAmount] = useState('');
  const [baixaMethod, setBaixaMethod] = useState<string>('dinheiro');

  // Customer Form
  const [formName, setFormName] = useState('');
  const [formDoc, setFormDoc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  );

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormDoc(customer.document);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setShowAddModal(true);
  };

  const handleSaveCustomer = () => {
    if (!formName || !formDoc) return;

    const customerData = {
      name: formName,
      document: formDoc,
      phone: formPhone,
      email: formEmail,
      address: formAddress,
    };

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, customerData);
    } else {
      onAddCustomer({
        ...customerData,
        balance: 0,
        history: []
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormDoc('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setEditingCustomer(null);
  };

  const handleBaixa = () => {
    if (!showBaixaModal || !baixaAmount) return;
    const amount = parseFloat(baixaAmount);
    
    const transaction: CustomerTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'credit',
      amount: amount,
      description: `Pagamento recebido via ${baixaMethod.toUpperCase()}`,
      date: new Date(),
      paymentMethod: baixaMethod
    };

    const newBalance = showBaixaModal.balance - amount;
    onUpdateCustomer(showBaixaModal.id, {
      balance: newBalance,
      history: [transaction, ...showBaixaModal.history]
    });

    onAddFinancialRecord({
      type: 'income',
      amount: amount,
      category: 'Recebimento Fiado',
      description: `Baixa de conta: ${showBaixaModal.name}`,
      date: new Date()
    });

    setShowBaixaModal(null);
    setBaixaAmount('');
    alert("Baixa realizada com sucesso!");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CPF/CNPJ..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <UserPlus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de Clientes */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {filteredCustomers.map(customer => (
            <div 
              key={customer.id} 
              className={`bg-white p-3 rounded-[1.5rem] border-2 transition-all cursor-pointer group ${selectedCustomer?.id === customer.id ? 'border-indigo-600 shadow-xl' : 'border-transparent hover:border-slate-200 shadow-sm'}`}
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${customer.balance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">{customer.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{customer.document}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Saldo Devedor</p>
                   <p className={`text-xl font-black tracking-tighter ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                     R$ {customer.balance.toFixed(2)}
                   </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <Phone size={12} className="text-indigo-500" /> {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <Mail size={12} className="text-indigo-500" /> {customer.email}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Editar Perfil"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowBaixaModal(customer); }}
                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600"
                  >
                    Dar Baixa
                  </button>
                  <button className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detalhes e Histórico */}
        <div className="bg-white rounded-[2rem] border shadow-sm flex flex-col h-[70vh] overflow-hidden">
          {selectedCustomer ? (
            <>
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                   <h3 className="text-sm font-black text-slate-800">Extrato da Conta</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedCustomer.name}</p>
                </div>
                <History size={18} className="text-indigo-300" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {selectedCustomer.history.length > 0 ? selectedCustomer.history.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${t.type === 'debit' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                           {t.type === 'debit' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-700 leading-tight">{t.description}</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase">{t.date.toLocaleDateString()} {t.date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                     </div>
                     <p className={`font-black text-xs ${t.type === 'debit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {t.type === 'debit' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                     </p>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-6">
                     <FileText size={32} className="mb-2" />
                     <p className="text-[10px] font-black uppercase tracking-widest">Sem movimentação registrada</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-indigo-600 text-white">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Saldo Consolidado</span>
                    <span className="text-xl font-black">R$ {selectedCustomer.balance.toFixed(2)}</span>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3 opacity-50 grayscale">
              <UserCircle size={48} strokeWidth={1} />
              <p className="font-bold text-[10px] uppercase tracking-widest">Selecione um cliente para ver o extrato detalhado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Cliente / Editar Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                       {editingCustomer ? <Edit3 size={18} /> : <UserPlus size={18} />}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800">{editingCustomer ? 'Editar Cliente' : 'Cadastrar Cliente'}</h2>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{editingCustomer ? 'Atualize as informações do perfil' : 'Novo registro de conta fiado'}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
              </div>
              <div className="p-4 space-y-3">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Razão Social</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formName} onChange={(e)=>setFormName(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF / CNPJ</label>
                       <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formDoc} onChange={(e)=>setFormDoc(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                       <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formPhone} onChange={(e)=>setFormPhone(e.target.value)} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                    <textarea rows={2} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none resize-none focus:border-indigo-500 transition-all text-xs" value={formAddress} onChange={(e)=>setFormAddress(e.target.value)} />
                 </div>
              </div>
              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Cancelar</button>
                 <button onClick={handleSaveCustomer} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-black uppercase text-[9px] shadow-xl hover:bg-indigo-700 transition-all">{editingCustomer ? 'Salvar Alterações' : 'Salvar Cadastro'}</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Baixa de Pagamento */}
      {showBaixaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b bg-emerald-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl"><DollarSign size={18} /></div>
                    <div>
                       <h2 className="text-lg font-black">Baixa de Pagamento</h2>
                       <p className="text-[9px] font-bold uppercase opacity-80">{showBaixaModal.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowBaixaModal(null)} className="p-1 hover:bg-white/20 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-5">
                 <div className="bg-slate-50 p-4 rounded-[1.5rem] border text-center space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual Devedor</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">R$ {showBaixaModal.balance.toFixed(2)}</p>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Recebimento (R$)</label>
                       <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-100 rounded-[1.5rem] text-3xl font-black text-indigo-600 outline-none focus:border-indigo-500 text-center" 
                        value={baixaAmount}
                        onChange={(e)=>setBaixaAmount(e.target.value)}
                        placeholder="0,00"
                        autoFocus
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                         { id: 'pix', label: 'PIX', icon: Smartphone },
                         { id: 'cartao', label: 'Cartão', icon: CreditCard }
                       ].map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => setBaixaMethod(m.id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-xs ${baixaMethod === m.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'}`}
                          >
                             <m.icon size={16} /> {m.label}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button onClick={() => setShowBaixaModal(null)} className="flex-1 py-3 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancelar</button>
                 <button onClick={handleBaixa} disabled={!baixaAmount} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-100 disabled:opacity-50">Confirmar Recebimento</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPanel;
