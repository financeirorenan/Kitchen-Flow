import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Tenant, SubscriptionPlan, Permission } from '../types';
import { 
  Users, 
  Plus, 
  Shield, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Package,
  CreditCard,
  Layout,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2
} from 'lucide-react';

const ALL_MODULES: { id: Permission; label: string }[] = [
  { id: 'dashboard_view', label: 'Painel AI' },
  { id: 'tables_manage', label: 'Mesas / Comandas' },
  { id: 'kds_view', label: 'Monitor de Pedidos (KDS)' },
  { id: 'delivery_manage', label: 'Painel de Entregas' },
  { id: 'digital_menu_manage', label: 'Cardápio Digital' },
  { id: 'customers_manage', label: 'Gestão de Clientes / Fiado' },
  { id: 'inventory_edit', label: 'Controle de Estoque' },
  { id: 'finance_view', label: 'Gestão Financeira' },
  { id: 'cmv_analysis', label: 'Análise de CMV' },
  { id: 'users_manage', label: 'Gestão de Equipe' },
  { id: 'admin_settings_manage', label: 'Configurações do Sistema' },
  { id: 'fiscal_manage', label: 'Gestão Fiscal' },
];

const SaaSAdmin: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [plan, setPlan] = useState<SubscriptionPlan>('BASIC');
  const [expiryDate, setExpiryDate] = useState('');
  const [allowedModules, setAllowedModules] = useState<Permission[]>(['dashboard_view']);

  useEffect(() => {
    const q = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        subscription: {
          ...doc.data().subscription,
          startDate: doc.data().subscription?.startDate?.toDate(),
          expiryDate: doc.data().subscription?.expiryDate?.toDate(),
        }
      })) as Tenant[];
      setTenants(data);
      setLoading(false);
    }, (error) => {
      console.error("SaaSAdmin onSnapshot error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = editingTenant?.id || `tenant_${Date.now()}`;
    
    const tenantData: Partial<Tenant> = {
      id: tenantId,
      name,
      ownerId,
      active: true,
      createdAt: editingTenant?.createdAt || new Date(),
      subscription: {
        plan,
        status: 'active',
        startDate: editingTenant?.subscription.startDate || new Date(),
        expiryDate: new Date(expiryDate),
        allowedModules
      }
    };

    try {
      await setDoc(doc(db, 'tenants', tenantId), tenantData);
      setShowAddModal(false);
      setEditingTenant(null);
      resetForm();
    } catch (error) {
      console.error("Error saving tenant:", error);
    }
  };

  const resetForm = () => {
    setName('');
    setOwnerId('');
    setPlan('BASIC');
    setExpiryDate('');
    setAllowedModules(['dashboard_view']);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setName(tenant.name);
    setOwnerId(tenant.ownerId);
    setPlan(tenant.subscription.plan);
    setExpiryDate(tenant.subscription.expiryDate.toISOString().split('T')[0]);
    setAllowedModules(tenant.subscription.allowedModules);
    setShowAddModal(true);
  };

  const toggleModule = (moduleId: Permission) => {
    setAllowedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ownerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">SaaS Management</h2>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Gestão de Clientes</h1>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingTenant(null); setShowAddModal(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Clientes</p>
            <p className="text-2xl font-black text-slate-800">{tenants.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinaturas Ativas</p>
            <p className="text-2xl font-black text-slate-800">{tenants.filter(t => t.active).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inativos / Vencidos</p>
            <p className="text-2xl font-black text-slate-800">{tenants.filter(t => !t.active).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou ID do proprietário..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"><Filter size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">
                        {tenant.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{tenant.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tenant.ownerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      tenant.subscription.plan === 'PRO' ? 'bg-amber-50 text-amber-600' :
                      tenant.subscription.plan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {tenant.subscription.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${tenant.active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {tenant.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-600">
                      {tenant.subscription.expiryDate.toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {tenant.subscription.allowedModules.length} Módulos
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleEdit(tenant)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                  {editingTenant ? 'Editar Cliente' : 'Novo Cliente SaaS'}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure os acessos e assinatura</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><XCircle size={24} /></button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Estabelecimento</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ex: Pizzaria do João"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID do Proprietário (UID Firebase)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Cole o UID do usuário aqui"
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano de Assinatura</label>
                  <select 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
                  >
                    <option value="FREE">FREE</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Vencimento</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulos Habilitados</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_MODULES.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                        allowedModules.includes(module.id)
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        allowedModules.includes(module.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {allowedModules.includes(module.id) ? <CheckCircle2 size={14} /> : <Layout size={14} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">{module.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  {editingTenant ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSAdmin;
