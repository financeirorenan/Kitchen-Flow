
import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { User, UserRole, UserPreset, AuditLog, Permission, Order, FinancialRecord } from '../types';
import { 
  UserPlus, Shield, Mail, MoreVertical, ShieldCheck, UserCog, 
  ChefHat, Wallet, Utensils, History, Users, Search, Activity,
  X, Check, Lock, Settings2, Edit3, Briefcase, FileText, Calendar,
  Filter, CheckSquare, Square, ChevronDown, Sparkles, Save, User as UserIcon,
  LayoutDashboard, AlertTriangle, Coins, TrendingUp, Calculator, Percent, PiggyBank, FileCheck, CheckCircle,
  AlertCircle, Info, Terminal, Copy
} from 'lucide-react';
import { PayrollSimulator } from './PayrollSimulator';

interface UsersPanelProps {
  users: User[];
  auditLogs: AuditLog[];
  rolePermissions: Record<UserRole, Permission[]>;
  onAddUser: (user: Partial<User>) => Promise<void> | void;
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void> | void;
  onDeleteUser: (id: string) => void;
  onUpdateRole: (id: string, role: UserRole) => void;
  onUpdateRolePermissions: (role: UserRole, permissions: Permission[]) => void;
  onSavePreset: (userId: string, preset: UserPreset) => void;
  allowedModules?: Permission[];
  isSuperAdmin?: boolean;
  orders?: Order[];
  onAddFinancialRecord?: (record: Partial<FinancialRecord>) => Promise<void> | void;
}

const ALL_PERMISSIONS: { id: Permission; label: string; group: string; description: string }[] = [
  { id: 'dashboard_view', label: 'Painel AI', group: 'Gestão', description: 'Visualiza insights estratégicos e métricas' },
  { id: 'cmv_analysis', label: 'Análise CMV', group: 'Gestão', description: 'Acesso às recomendações de custo e lucro' },
  { id: 'finance_view', label: 'Financeiro', group: 'Administrativo', description: 'Visualiza contas e balanço financeiro' },
  { id: 'users_manage', label: 'Equipe', group: 'Administrativo', description: 'Gerencia membros e permissões' },
  { id: 'pos_access', label: 'Acesso PDV', group: 'Operacional', description: 'Realiza vendas no caixa' },
  { id: 'tables_manage', label: 'Mesas', group: 'Operacional', description: 'Abre e fecha mesas de atendimento' },
  { id: 'kds_view', label: 'Cozinha (KDS)', group: 'Operacional', description: 'Monitora pedidos na cozinha e produção' },
  { id: 'kds_kitchen_only_view', label: 'Apenas KDS Produção', group: 'Operacional', description: 'Acesso EXCLUSIVO ao KDS de Produção da Cozinha, ocultando logística' },
  { id: 'delivery_manage', label: 'Entregas', group: 'Operacional', description: 'Gerencia entregadores e logística' },
  { id: 'inventory_edit', label: 'Estoque', group: 'Operacional', description: 'Altera quantidades e custos de produtos' },
  { id: 'courier_app_access', label: 'Acesso App Entregador', group: 'Operacional', description: 'Permite que este usuário acesse o aplicativo mobile do entregador' },
  { id: 'digital_menu_manage', label: 'Cardápio Digital', group: 'Operacional', description: 'Gerencia o cardápio digital de autoatendimento' },
  { id: 'admin_settings_manage', label: 'Configurações', group: 'Administrativo', description: 'Acesso completo às configurações gerais e do lojista' },
  { id: 'fiscal_manage', label: 'Módulo Fiscal', group: 'Administrativo', description: 'Acesso a configurações fiscais e emissão de notas' },
  { id: 'customers_manage', label: 'Clientes & CRM', group: 'Gestão', description: 'Gerenciamento de base de clientes, fiado e fidelidade' },
  { id: 'marketplace_manage', label: 'Marketplace', group: 'Gestão', description: 'Gerenciamento e configurações do canal de marketplace' },
];

const ROLE_DETAILS: Record<UserRole, { label: string; description: string; color: string }> = {
  ADMIN: { label: 'Administrador', description: 'Acesso total e configurações fiscais.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  MANAGER: { label: 'Gerente', description: 'Gestão operacional e financeira.', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  CHEF: { label: 'Chef de Cozinha', description: 'KDS e controle de estoque.', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  CASHIER: { label: 'Operador de Caixa', description: 'Vendas e fechamento de caixa.', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  WAITER: { label: 'Garçom / Atendente', description: 'Atendimento de mesas e pedidos.', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  KDS: { label: 'Monitor de Pedidos', description: 'Visualização e preparo de pedidos.', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  SAAS_ADMIN: { label: 'SaaS Admin', description: 'Gestão da plataforma SaaS.', color: 'text-purple-600 bg-purple-50 border-purple-100' },
  COURIER: { label: 'Entregador', description: 'Acesso ao App mobile do entregador.', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  CUSTOMER: { label: 'Cliente', description: 'Conta de cliente do Marketplace.', color: 'text-slate-600 bg-slate-50 border-slate-100' },
  OWNER: { label: 'Proprietário', description: 'Acesso total ao estabelecimento.', color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' },
  STOCK_ANALYST: { label: 'Analista de Estoque', description: 'Monitora insumos, custos e CMV.', color: 'text-teal-600 bg-teal-50 border-teal-100' },
};

const UsersPanel: React.FC<UsersPanelProps> = memo(({ 
  users, 
  auditLogs, 
  rolePermissions, 
  onAddUser, 
  onUpdateUser,
  onDeleteUser,
  onUpdateRole, 
  onUpdateRolePermissions,
  onSavePreset,
  allowedModules = [],
  isSuperAdmin = false,
  orders = [],
  onAddFinancialRecord
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'team' | 'roles' | 'audit' | 'payroll'>('team');
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'ERROR' | 'SYSTEM'>('ALL');
  const [selectedDetailLog, setSelectedDetailLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [showPresetsModal, setShowPresetsModal] = useState<User | null>(null);
  
  // Modal states for adding/editing user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('WAITER');
  const [newPermissions, setNewPermissions] = useState<Permission[]>(rolePermissions.WAITER || []);
  const [newObservations, setNewObservations] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [permSearch, setPermSearch] = useState('');
  const [rolePermSearch, setRolePermSearch] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);

  const confirmAction = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type });
    setShowConfirmModal(true);
  };

  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(null);
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
      case 'KDS': return <LayoutDashboard size={18} />;
      case 'SAAS_ADMIN': return <Shield size={18} />;
      case 'STOCK_ANALYST': return <Briefcase size={18} />;
    }
  };

  const handleRoleTemplateSelect = (role: UserRole) => {
    setNewRole(role);
    setNewPermissions([...(rolePermissions[role] || [])]);
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

  const visiblePermissions = useMemo(() => {
    if (isSuperAdmin || !allowedModules || allowedModules.length === 0) return ALL_PERMISSIONS;
    return ALL_PERMISSIONS.filter(p => {
      if (p.id === 'kds_kitchen_only_view') {
        return allowedModules.includes('kds_view') || allowedModules.includes('kds_kitchen_only_view');
      }
      return allowedModules.includes(p.id);
    });
  }, [isSuperAdmin, allowedModules]);

  const filteredPermissions = useMemo(() => {
    return visiblePermissions.filter(p => 
      p.label.toLowerCase().includes(permSearch.toLowerCase()) || 
      p.description.toLowerCase().includes(permSearch.toLowerCase())
    );
  }, [visiblePermissions, permSearch]);

  const filteredPresetPermissions = useMemo(() => {
    return visiblePermissions.filter(p => 
      p.label.toLowerCase().includes(rolePermSearch.toLowerCase()) || 
      p.description.toLowerCase().includes(rolePermSearch.toLowerCase())
    );
  }, [visiblePermissions, rolePermSearch]);

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setNewName(user.name);
    setNewEmail(user.email);
    setNewPassword(''); // Começa vazio ao editar, para o lojista opcionalmente preencher nova senha
    setNewRole(user.role);
    setNewPermissions(user.permissions || []);
    setNewObservations(user.observations || '');
    setNewActive(user.active);
    setValidationError(null);
    setShowModal(true);
    setUserMenuOpen(null);
  };

  const handleSaveUser = async () => {
    setValidationError(null);

    const nameVal = newName.trim();
    const emailVal = newEmail.trim().toLowerCase();
    const passwordVal = newPassword.trim();

    if (!nameVal) {
      setValidationError("O nome completo do membro da equipe é obrigatório.");
      return;
    }

    if (!emailVal) {
      setValidationError("O e-mail profissional é obrigatório.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setValidationError("Por favor, informe um endereço de e-mail válido (exemplo@dominio.com).");
      return;
    }

    // Verificar e-mails duplicados na equipe (exceto se for o próprio usuário sendo editado)
    const emailExists = users.some(u => u.email.toLowerCase() === emailVal && (!editingUser || u.id !== editingUser.id));
    if (emailExists) {
      setValidationError("Este e-mail já está em uso por outro membro registrado na equipe.");
      return;
    }

    if (!editingUser) {
      // Novo usuário: a senha é estritamente obrigatória e precisa de mínimo 6 caracteres e regras de complexidade
      if (!passwordVal) {
        setValidationError("A senha de acesso provisória é obrigatória para cadastrar novos usuários.");
        return;
      }
      const hasUpper = /[A-Z]/.test(passwordVal);
      const hasLower = /[a-z]/.test(passwordVal);
      const hasSpec = /[!@#$%^&*(),.?":{}|<>_+\-\[\]\/\\`';~`=]/.test(passwordVal);
      if (passwordVal.length < 6 || !hasUpper || !hasLower || !hasSpec) {
        setValidationError("A senha de acesso deve ter pelo menos 6 caracteres, contendo letras maiúsculas, minúsculas e caracteres especiais (ex: @, #, $, %, etc.).");
        return;
      }
    } else {
      // Editando usuário: senha de alteração é opcional, mas se informada deve ter pelo menos 6 caracteres e regras de complexidade
      if (passwordVal) {
        const hasUpper = /[A-Z]/.test(passwordVal);
        const hasLower = /[a-z]/.test(passwordVal);
        const hasSpec = /[!@#$%^&*(),.?":{}|<>_+\-\[\]\/\\`';~`=]/.test(passwordVal);
        if (passwordVal.length < 6 || !hasUpper || !hasLower || !hasSpec) {
          setValidationError("A nova senha de acesso deve ter no mínimo 6 caracteres, contendo letras maiúsculas, minúsculas e caracteres especiais (ex: @, #, $, %, etc.).");
          return;
        }
      }
    }

    const userData = {
      name: nameVal,
      email: emailVal,
      password: passwordVal,
      role: newRole,
      permissions: newPermissions,
      observations: newObservations.trim(),
      active: newActive
    };

    setIsSaving(true);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, userData);
      } else {
        await onAddUser(userData);
      }
      
      setShowModal(false);
      setEditingUser(null);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || "Ocorreu um erro ao salvar o usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('WAITER');
    setNewPermissions(rolePermissions.WAITER || []);
    setNewObservations('');
    setNewActive(true);
    setPermSearch('');
    setEditingUser(null);
    setValidationError(null);
  };

  const openEditRole = (role: UserRole) => {
    setEditingRole(role);
    setRolePresetPermissions([...(rolePermissions[role] || [])]);
    setRolePermSearch('');
  };

  const [rolePresetPermissions, setRolePresetPermissions] = useState<Permission[]>([]);

  const handleSaveRolePreset = () => {
    if (editingRole) {
      onUpdateRolePermissions(editingRole, rolePresetPermissions);
      setEditingRole(null);
    }
  };

  const filteredLogs = useMemo(() => {
    const seen = new Set<string>();
    const uniqueLogs = auditLogs.filter(log => {
      if (!log.id) return true;
      if (seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    });

    return uniqueLogs.filter(log => {
      const matchesSearch = 
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = logLevelFilter === 'ALL' || (log.level || 'INFO') === logLevelFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [auditLogs, searchTerm, logLevelFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner">
          {[
            { id: 'team', label: 'Equipe', icon: Users },
            { id: 'payroll', label: 'Folha & Simulador', icon: Wallet },
            { id: 'roles', label: 'Cargos', icon: Briefcase },
            { id: 'audit', label: 'Auditoria', icon: History },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`relative flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeSubTab === tab.id ? 'text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {activeSubTab === tab.id && (
                <motion.div 
                  layoutId="usersTabPill"
                  className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon size={16} strokeWidth={activeSubTab === tab.id ? 3 : 2} />
                {tab.label}
              </span>
            </button>
          ))}
        </div>
        
        {activeSubTab === 'team' ? (
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <UserPlus size={20} />
            Configurar Acesso
          </button>
        ) : (
          activeSubTab === 'audit' && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              {/* Filtro de Nível de Log */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto shadow-inner">
                {[
                  { id: 'ALL', label: 'Todos', color: 'bg-white text-slate-700 border border-slate-200' },
                  { id: 'INFO', label: 'Info', color: 'bg-blue-600 text-white' },
                  { id: 'WARNING', label: 'Aviso', color: 'bg-amber-500 text-white' },
                  { id: 'ERROR', label: 'Erro', color: 'bg-rose-600 text-white' },
                  { id: 'SYSTEM', label: 'Sistema', color: 'bg-purple-600 text-white' },
                ].map(level => {
                  const isActive = logLevelFilter === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => setLogLevelFilter(level.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        isActive 
                          ? level.color + ' shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                      }`}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>

              {/* Caixa de Pesquisa */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar logs/erros..." 
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium bg-white shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )
        )}
      </div>

      {activeSubTab === 'team' ? (
        <div className="bg-white rounded-3xl border shadow-sm overflow-visible animate-in fade-in duration-500">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm rounded-tl-3xl">Usuário</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Função / Nível</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Permissões Ativas</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm text-right rounded-tr-3xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user, index) => (
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
                      {(user.permissions || []).slice(0, 3).map(p => (
                        <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {ALL_PERMISSIONS.find(ap => ap.id === p)?.label}
                        </span>
                      ))}
                      {(user.permissions || []).length > 3 && (
                        <span className="text-[10px] text-slate-400 font-bold">+{(user.permissions || []).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.active ? (user.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300') : 'bg-rose-500'}`}></span>
                      <span className="text-sm text-slate-600 capitalize">{user.active ? user.status : 'Inativo'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                       onClick={() => setUserMenuOpen(userMenuOpen === user.id ? null : user.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {userMenuOpen === user.id && (
                      <div ref={userMenuRef} className={`absolute right-6 ${index === users.length - 1 && users.length > 1 ? 'bottom-full mb-1' : 'top-12'} z-20 w-48 bg-white border rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200`}>
                        <button 
                          onClick={() => handleOpenEditUser(user)}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit3 size={16} /> Editar Perfil
                        </button>
                        <button 
                          onClick={() => setShowPresetsModal(user)}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Settings2 size={16} /> Presets do Usuário
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <button 
                          onClick={() => {
                            const actionName = user.active ? 'inativar' : 'ativar';
                            const title = user.active ? 'Inativar Usuário' : 'Ativar Usuário';
                            const message = `Tem certeza de que deseja ${actionName} o acesso do usuário "${user.name}" ao sistema?`;
                            const type = user.active ? 'danger' : 'info';
                            
                            confirmAction(title, message, () => {
                              if (user.active) {
                                onDeleteUser(user.id);
                              } else {
                                onUpdateUser(user.id, { active: true });
                              }
                            }, type);
                            setUserMenuOpen(null);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm font-bold flex items-center gap-2 ${user.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {user.active ? <Lock size={16} /> : <Check size={16} />}
                          {user.active ? 'Inativar Usuário' : 'Ativar Usuário'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeSubTab === 'payroll' ? (
        <PayrollSimulator 
          users={users} 
          orders={orders} 
          onUpdateUser={onUpdateUser} 
          onAddFinancialRecord={onAddFinancialRecord} 
        />
      ) : activeSubTab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {(Object.keys(ROLE_DETAILS) as UserRole[])
            .filter(role => role !== 'SAAS_ADMIN')
            .map(role => (
            <div key={role} className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col gap-4 group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${ROLE_DETAILS[role].color}`}>
                    {getRoleIcon(role)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{role}</h3>
                    <p className="text-xs text-slate-500">{(rolePermissions[role] || []).length} permissões padrão</p>
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
                {(rolePermissions[role] || []).slice(0, 6).map(p => (
                   <span key={p} className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 font-semibold">
                     {ALL_PERMISSIONS.find(ap => ap.id === p)?.label}
                   </span>
                ))}
                {(rolePermissions[role] || []).length > 6 && (
                  <span className="text-[10px] text-slate-400 font-bold self-center">+{(rolePermissions[role] || []).length - 6}</span>
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
              <div>
                <h3 className="font-bold text-slate-800">Mapeamento de Logs e Erros</h3>
                <p className="text-xs text-slate-400 mt-0.5">Diagnósticos em tempo real do sistema. Clique em qualquer registro para visualizar detalhes cirúrgicos de execução.</p>
              </div>
            </div>
            {filteredLogs.length > 0 && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border">
                {filteredLogs.length} logs encontrados
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/30">
                <Terminal className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-bold text-sm">Nenhum log encontrado para os filtros selecionados.</p>
                <p className="text-xs text-slate-400 mt-1">Experimente alterar a busca ou alternar para a aba "Todos".</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Nível</th>
                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Horário</th>
                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Ação</th>
                    <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map(log => {
                    const level = log.level || 'INFO';
                    let levelBadge = '';
                    let levelIcon = null;
                    if (level === 'ERROR') {
                      levelBadge = 'bg-rose-50 border-rose-100 text-rose-700';
                      levelIcon = <AlertCircle size={12} strokeWidth={3} />;
                    } else if (level === 'WARNING') {
                      levelBadge = 'bg-amber-50 border-amber-100 text-amber-700';
                      levelIcon = <AlertTriangle size={12} strokeWidth={3} />;
                    } else if (level === 'SYSTEM') {
                      levelBadge = 'bg-purple-50 border-purple-100 text-purple-700';
                      levelIcon = <Terminal size={12} strokeWidth={3} />;
                    } else {
                      levelBadge = 'bg-blue-50 border-blue-100 text-blue-700';
                      levelIcon = <Info size={12} strokeWidth={3} />;
                    }

                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedDetailLog(log)}
                        className="hover:bg-slate-50 cursor-pointer transition-all duration-150 group"
                      >
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${levelBadge}`}>
                            {levelIcon}
                            {level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-800">{log.timestamp.toLocaleTimeString('pt-BR')}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{log.timestamp.toLocaleDateString('pt-BR')}</p>
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
                          <span className="px-2 py-1 rounded-md bg-slate-100 border text-[10px] font-black tracking-wider uppercase text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-100">{log.action}</span>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <p className="text-sm text-slate-600 font-medium truncate group-hover:text-slate-900 transition-colors">{log.description}</p>
                          {log.details && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{log.details}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhes Cirúrgicos do Log */}
      {selectedDetailLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className={`p-8 border-b flex justify-between items-center ${
              (selectedDetailLog.level || 'INFO') === 'ERROR' ? 'bg-rose-50/50' :
              (selectedDetailLog.level || 'INFO') === 'WARNING' ? 'bg-amber-50/50' :
              (selectedDetailLog.level || 'INFO') === 'SYSTEM' ? 'bg-purple-50/50' : 'bg-blue-50/50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl text-white shadow-lg ${
                  (selectedDetailLog.level || 'INFO') === 'ERROR' ? 'bg-rose-500 shadow-rose-100' :
                  (selectedDetailLog.level || 'INFO') === 'WARNING' ? 'bg-amber-500 shadow-amber-100' :
                  (selectedDetailLog.level || 'INFO') === 'SYSTEM' ? 'bg-purple-500 shadow-purple-100' : 'bg-blue-500 shadow-blue-100'
                }`}>
                  {(selectedDetailLog.level || 'INFO') === 'ERROR' ? <AlertCircle size={24} /> :
                   (selectedDetailLog.level || 'INFO') === 'WARNING' ? <AlertTriangle size={24} /> :
                   (selectedDetailLog.level || 'INFO') === 'SYSTEM' ? <Terminal size={24} /> : <Info size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detalhes do Registro</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Diagnóstico Cirúrgico de Atividade</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailLog(null)} 
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-rose-500"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Horário do Evento</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {selectedDetailLog.timestamp.toLocaleDateString('pt-BR')} às {selectedDetailLog.timestamp.toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Identificação (ID)</p>
                  <p className="text-sm font-mono font-bold text-slate-800 mt-1">{selectedDetailLog.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Usuário Responsável</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selectedDetailLog.userName}</p>
                  <p className="text-[10px] font-bold uppercase text-indigo-600 mt-0.5">{selectedDetailLog.userRole}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400">Escopo da Tenant</p>
                  <p className="text-sm font-mono font-bold text-slate-800 mt-1">{selectedDetailLog.tenantId}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Ação / Gatilho</p>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase tracking-wider">{selectedDetailLog.action}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed mt-2">{selectedDetailLog.description}</p>
              </div>

              {selectedDetailLog.details && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400">Payload / Contexto Adicional</p>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{selectedDetailLog.details}</p>
                </div>
              )}

              {selectedDetailLog.stackTrace && (
                <div className="bg-rose-50/20 p-5 rounded-2xl border border-rose-100/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1">
                      <Terminal size={12} /> Rastro do Erro (Stack Trace)
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDetailLog.stackTrace || '');
                        alert('Rastro do erro copiado para a área de transferência!');
                      }}
                      className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-rose-200 text-[9px] font-black uppercase text-rose-700 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Copy size={10} /> Copiar Rastro
                    </button>
                  </div>
                  <div className="bg-slate-900 text-rose-300 p-4 rounded-xl font-mono text-[10px] overflow-x-auto max-h-60 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                    <pre className="whitespace-pre">{selectedDetailLog.stackTrace}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedDetailLog(null)} 
                className="px-8 py-3.5 bg-white border rounded-xl font-black text-slate-500 hover:bg-slate-100 uppercase text-xs tracking-wider transition-all shadow-sm"
              >
                Fechar Painel
              </button>
            </div>
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
                  <h2 className="text-2xl font-black text-slate-800">{editingUser ? 'Editar Acesso' : 'Novo Acesso à Equipe'}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configure permissões granulares</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setEditingUser(null); }} className="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-rose-500">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {validationError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
                    Identificação Básica
                  </h3>
                  {editingUser && (
                    <button 
                      onClick={() => setNewActive(!newActive)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${newActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}
                    >
                      {newActive ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                      {newActive ? 'Ativo' : 'Inativo'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">Nome Completo</label>
                    <input type="text" placeholder="Ex: Carlos Alberto" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">E-mail Profissional</label>
                    <input type="email" placeholder="carlos@seunegocio.com" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">
                      {editingUser ? 'Alterar Senha de Acesso (Vazio para manter a atual)' : 'Senha de Acesso'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        placeholder={editingUser ? "Deixe em branco para não alterar" : "••••••••"} 
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium ml-1">Mínimo 6 caracteres para o Firebase Auth</p>
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
                        {(Object.keys(ROLE_DETAILS) as UserRole[])
                          .filter(role => role !== 'SAAS_ADMIN')
                          .map(role => (
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
              <button onClick={() => { setShowModal(false); setEditingUser(null); }} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-white uppercase text-xs" disabled={isSaving}>Cancelar</button>
              <button onClick={handleSaveUser} disabled={isSaving || !newName || !newEmail} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 uppercase text-xs flex items-center gap-2">
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} /> {editingUser ? 'Salvar Alterações' : 'Criar Novo Acesso'}
                  </>
                )}
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
      {/* Modal: User Presets */}
      {showPresetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Presets: {showPresetsModal.name}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gerencie configurações salvas do usuário</p>
                </div>
              </div>
              <button onClick={() => setShowPresetsModal(null)} className="p-2 hover:bg-white rounded-full text-slate-400"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {(!showPresetsModal.presets || showPresetsModal.presets.length === 0) ? (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Settings2 className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-500 font-bold">Nenhum preset salvo para este usuário.</p>
                  <button 
                    onClick={() => {
                      const newPreset = { id: `pr-${Date.now()}`, name: 'Novo Preset', settings: { permissions: showPresetsModal.permissions || [] } };
                      onSavePreset(showPresetsModal.id, newPreset);
                      setShowPresetsModal({ ...showPresetsModal, presets: [newPreset] });
                    }}
                    className="mt-4 text-indigo-600 font-black text-xs uppercase hover:underline"
                  >
                    Criar primeiro preset
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {showPresetsModal.presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{preset.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Criado em {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            onUpdateUser(showPresetsModal.id, { permissions: preset.settings.permissions });
                            setShowPresetsModal(null);
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setShowPresetsModal(null)} className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200 uppercase text-xs tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`p-6 text-center ${confirmConfig.type === 'danger' ? 'bg-rose-50' : confirmConfig.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-rose-500 text-white' : confirmConfig.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">{confirmConfig.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="p-4 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
                className={`flex-1 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${confirmConfig.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : confirmConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default UsersPanel;
