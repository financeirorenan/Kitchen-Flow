
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, UserRole, AuditLog, Permission } from '../types';
import { 
  UserPlus, Shield, Mail, MoreVertical, ShieldCheck, UserCog, 
  ChefHat, Wallet, Utensils, History, Users, Search, Activity,
  X, Check, Lock, Settings2, Edit3, Briefcase, FileText, Calendar,
  Filter, CheckSquare, Square, ChevronDown, Sparkles, Save, User as UserIcon
} from 'lucide-react';

interface UsersPanelProps {
  users: User[];
  auditLogs: AuditLog[];
  rolePermissions: Record<UserRole, Permission[]>;
  onAddUser: (user: Partial<User>) => void;
  onUpdateRole: (id: string, role: UserRole) => void;
  onUpdateRolePermissions: (role: UserRole, permissions: Permission[]) => void;
}

const ALL_PERMISSIONS: { id: Permission; label: string; group: string; description: string }[] = [
  { id: 'dashboard_view', label: 'Painel AI', group: 'Gestão', description: 'Visualiza insights estratégicos e métricas' },
  { id: 'cmv_analysis', label: 'Análise CMV', group: 'Gestão', description: 'Acesso às recomendações de custo e lucro' },
  { id: 'finance_view', label: 'Financeiro', group: 'Administrativo', description: 'Visualiza contas e balanço financeiro' },
  { id: 'users_manage', label: 'Equipe', group: 'Administrativo', description: 'Gerencia membros e permissões' },
  { id: 'pos_access', label: 'Acesso PDV', group: 'Operacional', description: 'Realiza vendas no caixa' },
  { id: 'tables_manage', label: 'Mesas', group: 'Operacional', description: 'Abre e fecha mesas de atendimento' },
  { id: 'kds_view', label: 'Cozinha (KDS)', group: 'Operacional', description: 'Monitora pedidos na cozinha' },
  { id: 'delivery_manage', label: 'Entregas', group: 'Operacional', description: 'Gerencia motoboys e entregas' },
  { id: 'inventory_edit', label: 'Estoque', group: 'Operacional', description: 'Altera quantidades e custos de produtos' },
];

const ROLE_DETAILS: Record<UserRole, { label: string; description: string; color: string }> = {
  ADMIN: { label: 'Administrador', description: 'Acesso total e configurações fiscais.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  MANAGER: { label: 'Gerente', description: 'Gestão operacional e financeira.', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  CHEF: { label: 'Chef de Cozinha', description: 'KDS e controle de estoque.', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  CASHIER: { label: 'Operador de Caixa', description: 'Vendas e fechamento de caixa.', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  WAITER: { label: 'Garçom / Atendente', description: 'Atendimento de mesas e pedidos.', color: 'text-blue-600 bg-blue-50 border-blue-100' },
};

const UsersPanel: React.FC<UsersPanelProps> = ({ 
  users, 
  auditLogs, 
  rolePermissions, 
  onAddUser, 
  onUpdateRole, 
  onUpdateRolePermissions 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'team' | 'roles' | 'audit'>('team');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  
  // Modal states for adding user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('WAITER');
  const [newPermissions, setNewPermissions] = useState<Permission[]>(rolePermissions.WAITER);
  const [newObservations, setNewObservations] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [rolePermSearch, setRolePermSearch] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <ShieldCheck size={18} />;
      case 'MANAGER': return <UserCog size={18} />;
      case 'CHEF': return <ChefHat size={18} />;
      case 'CASHIER': return <Wallet size={18} />;
      case 'WAITER': return <Utensils size={18} />;
    }
  };

  const handleRoleTemplateSelect = (role: UserRole) => {
    setNewRole(role);
    setNewPermissions([...rolePermissions[role]]);
    setIsRoleDropdownOpen(false);
  };

  const togglePermission = (id: Permission) => {
    setNewPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleGroupPermissions = (groupName: string) => {
    const groupPerms = ALL_PERMISSIONS.filter(p => p.group === groupName).map(p => p.id);
    const allSelected = groupPerms.every(p => newPermissions.includes(p));
    
    if (allSelected) {
      setNewPermissions(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setNewPermissions(prev => Array.from(new Set([...prev, ...groupPerms])));
    }
  };

  const filteredPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter(p => 
      p.label.toLowerCase().includes(permSearch.toLowerCase()) || 
      p.description.toLowerCase().includes(permSearch.toLowerCase())
    );
  }, [permSearch]);

  const filteredPresetPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter(p => 
      p.label.toLowerCase().includes(rolePermSearch.toLowerCase()) || 
      p.description.toLowerCase().includes(rolePermSearch.toLowerCase())
    );
  }, [rolePermSearch]);

  const handleSaveUser = () => {
    if (!newName || !newEmail) return;
    onAddUser({
      name: newName,
      email: newEmail,
      role: newRole,
      permissions: newPermissions,
      observations: newObservations
    });
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('WAITER');
    setNewPermissions(rolePermissions.WAITER);
    setNewObservations('');
    setPermSearch('');
  };

  const openEditRole = (role: UserRole) => {
    setEditingRole(role);
    setRolePresetPermissions([...rolePermissions[role]]);
    setRolePermSearch('');
  };

  const [rolePresetPermissions, setRolePresetPermissions] = useState<Permission[]>([]);

  const handleSaveRolePreset = () => {
    if (editingRole) {
      onUpdateRolePermissions(editingRole, rolePresetPermissions);
      setEditingRole(null);
    }
  };

  const filteredLogs = auditLogs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
          <button 
            onClick={() => setActiveSubTab('team')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${activeSubTab === 'team' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users size={18} />
            Equipe
          </button>
          <button 
            onClick={() => setActiveSubTab('roles')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${activeSubTab === 'roles' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Briefcase size={18} />
            Cargos
          </button>
          <button 
            onClick={() => setActiveSubTab('audit')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${activeSubTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History size={18} />
            Auditoria
          </button>
        </div>
        
        {activeSubTab === 'team' ? (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <UserPlus size={20} />
            Configurar Acesso
          </button>
        ) : (
          activeSubTab === 'audit' && (
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Filtrar logs..." 
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )
        )}
      </div>

      {activeSubTab === 'team' ? (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in fade-in duration-500">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Usuário</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Função / Nível</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Permissões Ativas</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail size={12} /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${ROLE_DETAILS[user.role].color}`}>
                      {getRoleIcon(user.role)}
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {user.permissions.slice(0, 3).map(p => (
                        <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {ALL_PERMISSIONS.find(ap => ap.id === p)?.label}
                        </span>
                      ))}
                      {user.permissions.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-bold">+{user.permissions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                      <span className="text-sm text-slate-600 capitalize">{user.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeSubTab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {(['ADMIN', 'MANAGER', 'CHEF', 'CASHIER', 'WAITER'] as UserRole[]).map(role => (
            <div key={role} className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col gap-4 group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${ROLE_DETAILS[role].color}`}>
                    {getRoleIcon(role)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{role}</h3>
                    <p className="text-xs text-slate-500">{rolePermissions[role].length} permissões padrão</p>
                  </div>
                </div>
                <button 
                  onClick={() => openEditRole(role)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit3 size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rolePermissions[role].slice(0, 6).map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 font-semibold">
                    {ALL_PERMISSIONS.find(ap => ap.id === p)?.label}
                  </span>
                ))}
                {rolePermissions[role].length > 6 && (
                  <span className="text-[10px] text-slate-400 font-bold self-center">+{rolePermissions[role].length - 6}</span>
                )}
              </div>
              <div className="mt-auto pt-4 border-t flex justify-between items-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Preset do Sistema</p>
                <button 
                  onClick={() => openEditRole(role)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Settings2 size={12} /> Configurar Preset
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-800">Log de Atividades</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm">Horário</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm">Usuário</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm">Ação</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">{log.timestamp.toLocaleTimeString('pt-BR')}</p>
                      <p className="text-xs text-slate-400">{log.timestamp.toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 border font-bold">
                          {log.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{log.userName}</p>
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">{log.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-slate-100 border text-[10px] font-black tracking-wider uppercase text-slate-600">{log.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 font-medium">{log.description}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Novo Acesso à Equipe</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configure permissões granulares</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-rose-500">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
                   Identificação Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">Nome Completo</label>
                    <input type="text" placeholder="Ex: Carlos Alberto" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">E-mail Profissional</label>
                    <input type="email" placeholder="carlos@seunegocio.com" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Secão 2: Role Select Suspenso Refatorado */}
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
                   Cargo e Nível de Acesso
                </h3>
                <div className="relative" ref={roleDropdownRef}>
                  <label className="text-xs font-bold text-slate-700 ml-1 mb-2 block">Selecione o Cargo Principal</label>
                  <button 
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all group ${isRoleDropdownOpen ? 'border-indigo-600 bg-white shadow-xl' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl shadow-sm ${ROLE_DETAILS[newRole].color}`}>
                        {getRoleIcon(newRole)}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800 text-sm leading-none">{ROLE_DETAILS[newRole].label}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{newRole}</p>
                      </div>
                    </div>
                    <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} size={20} />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute z-[60] top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                        {(['ADMIN', 'MANAGER', 'CHEF', 'CASHIER', 'WAITER'] as UserRole[]).map(role => (
                          <button 
                            key={role}
                            onClick={() => handleRoleTemplateSelect(role)}
                            className={`w-full flex items-center gap-4 p-4 rounded-[1.4rem] transition-all text-left group ${newRole === role ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
                          >
                            <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${ROLE_DETAILS[role].color}`}>
                              {getRoleIcon(role)}
                            </div>
                            <div className="flex-1">
                              <p className={`font-black text-sm ${newRole === role ? 'text-indigo-900' : 'text-slate-800'}`}>{ROLE_DETAILS[role].label}</p>
                              <p className="text-[10px] font-medium text-slate-500 leading-tight">{ROLE_DETAILS[role].description}</p>
                            </div>
                            {newRole === role && (
                              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-in zoom-in">
                                <Check size={16} strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Secão 3: Permissões Granulares */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-400">Permissões Customizadas</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Buscar permissão..." 
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-8">
                  {['Gestão', 'Administrativo', 'Operacional'].map(group => {
                    const permsInGroup = filteredPermissions.filter(p => p.group === group);
                    if (permsInGroup.length === 0) return null;
                    
                    return (
                      <div key={group} className="space-y-3">
                        <div className="flex justify-between items-center px-2">
                           <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-2">
                             <Lock size={12} /> {group}
                           </h4>
                           <button onClick={() => toggleGroupPermissions(group)} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase">Selecionar Todos</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {permsInGroup.map(perm => {
                            const isSelected = newPermissions.includes(perm.id);
                            return (
                              <button key={perm.id} onClick={() => togglePermission(perm.id)} className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${isSelected ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/40 hover:border-slate-200'}`}>
                                <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}>
                                  {isSelected && <Check size={14} strokeWidth={4} />}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800">{perm.label}</p>
                                  <p className="text-[9px] font-medium text-slate-500 mt-0.5">{perm.description}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-slate-50/50 flex gap-4 justify-end">
              <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-white uppercase text-xs">Cancelar</button>
              <button onClick={handleSaveUser} disabled={!newName || !newEmail} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 uppercase text-xs flex items-center gap-2">
                <Check size={18} /> Criar Novo Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Role Preset */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-amber-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-100">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Preset: {editingRole}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configure as permissões padrão do cargo</p>
                </div>
              </div>
              <button onClick={() => setEditingRole(null)} className="p-2 hover:bg-white rounded-full text-slate-400"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {['Gestão', 'Administrativo', 'Operacional'].map(group => {
                const permsInGroup = ALL_PERMISSIONS.filter(p => p.group === group);
                return (
                  <div key={group} className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                       <Shield size={12} className="text-amber-500" /> {group}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permsInGroup.map(perm => (
                        <button 
                          key={perm.id} 
                          onClick={() => {
                            const newPerms = rolePresetPermissions.includes(perm.id) 
                              ? rolePresetPermissions.filter(p => p !== perm.id) 
                              : [...rolePresetPermissions, perm.id];
                            setRolePresetPermissions(newPerms);
                          }} 
                          className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${rolePresetPermissions.includes(perm.id) ? 'border-amber-500 bg-amber-50/20' : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200'}`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${rolePresetPermissions.includes(perm.id) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-transparent group-hover:border-slate-300'}`}>
                            {rolePresetPermissions.includes(perm.id) && <Check size={14} strokeWidth={4} />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${rolePresetPermissions.includes(perm.id) ? 'text-amber-900' : 'text-slate-700'}`}>{perm.label}</p>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{perm.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-8 border-t bg-slate-50 flex gap-4 justify-end">
              <button onClick={() => setEditingRole(null)} className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200 uppercase text-xs tracking-widest">Cancelar</button>
              <button onClick={handleSaveRolePreset} className="bg-amber-500 text-white px-10 py-4 rounded-xl font-bold hover:bg-amber-600 shadow-xl shadow-amber-100 uppercase text-xs tracking-widest flex items-center gap-2">
                <Save size={18} /> Salvar Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPanel;
