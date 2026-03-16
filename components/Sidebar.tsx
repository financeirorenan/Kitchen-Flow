
import React from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  UtensilsCrossed, 
  Truck, 
  Package, 
  DollarSign, 
  BrainCircuit,
  Settings,
  Users as UsersIcon,
  Smartphone,
  Trello,
  Bike,
  UserCircle,
  ShoppingBag,
  X,
  LogOut,
  Shield
} from 'lucide-react';
import { User, Permission } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  allowedModules?: Permission[];
  isSuperAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose, 
  user, 
  onLogout,
  allowedModules = [],
  isSuperAdmin = false
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel AI', icon: LayoutDashboard, permission: 'dashboard_view' },
    { id: 'tables', label: 'Mesas / Comandas', icon: Grid, permission: 'tables_manage' },
    { id: 'kds', label: 'Monitor de Pedidos', icon: Trello, permission: 'kds_view' },
    { id: 'delivery', label: 'Painel Motoboy', icon: Bike, permission: 'delivery_manage' },
    { id: 'digital-menu', label: 'Cardápio Digital', icon: Smartphone, permission: 'digital_menu_manage' },
    { id: 'customers', label: 'Clientes / Fiado', icon: UserCircle, permission: 'customers_manage' },
    { id: 'inventory', label: 'Estoque', icon: Package, permission: 'inventory_edit' },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, permission: 'finance_view' },
    { id: 'ai-cmv', label: 'Assistente de Cardápio', icon: BrainCircuit, permission: 'cmv_analysis' },
    { id: 'users', label: 'Equipe', icon: UsersIcon, permission: 'users_manage' },
  ];

  const filteredMenuItems = isSuperAdmin 
    ? [...menuItems, { id: 'saas-admin', label: 'Gestão SaaS', icon: Shield, permission: 'admin_settings_manage' }]
    : menuItems.filter(item => allowedModules.includes(item.permission as Permission));

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed lg:sticky top-0 left-0 z-50
        w-64 lg:w-48 bg-white border-r h-screen flex flex-col shrink-0
        transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 flex items-center justify-between border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">G</div>
            <h1 className="font-black text-lg text-slate-800 tracking-tighter">GastroAI</h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100' 
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 font-bold'
              }`}
            >
              <item.icon size={18} className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black text-[10px] uppercase">
              {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-lg object-cover" /> : user.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-800 truncate">{user.name}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          
          <button 
            onClick={() => handleTabClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs group ${
              activeTab === 'settings' 
                ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100' 
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 font-bold'
            }`}
          >
            <Settings size={18} className={`${activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
            Configurações
          </button>

          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs text-rose-500 hover:bg-rose-50 font-bold group"
          >
            <LogOut size={18} className="text-rose-400 group-hover:text-rose-600 transition-colors" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
