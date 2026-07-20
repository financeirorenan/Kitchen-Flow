
import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  BarChart3,
  UserCircle,
  ShoppingBag,
  X,
  LogOut,
  Shield,
  ExternalLink,
  LifeBuoy,
  TrendingUp,
  Sparkles,
  Monitor,
  ChefHat
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
  isSaaSMode?: boolean;
  restaurantName: string;
  logoUrl?: string;
  onProfileClick?: () => void;
  userPermissions?: Permission[];
}

const Sidebar: React.FC<SidebarProps> = memo(({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose, 
  user, 
  onLogout,
  allowedModules,
  isSuperAdmin = false,
  isSaaSMode = false,
  restaurantName,
  logoUrl,
  onProfileClick,
  userPermissions
}) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'merchant-copilot', label: 'Módulo Lojista', icon: TrendingUp, permission: 'finance_view' },
    { id: 'tables', label: 'Mesas / Comandas', icon: Grid, permission: 'tables_manage' },
    { id: 'kds', label: 'Monitor KDS (Logística)', icon: Trello, permission: 'kds_view' },
    { id: 'kds-kitchen-only', label: 'Cozinha (KDS Produção)', icon: ChefHat, permission: 'kds_view' },
    { id: 'order-monitor', label: 'Monitor de Pedidos (TV)', icon: Monitor, permission: 'kds_view' },
    { id: 'delivery', label: 'Logística de Entregas', icon: Bike, permission: 'delivery_manage' },
    { id: 'digital-menu', label: 'Cardápio Digital', icon: Smartphone, permission: 'digital_menu_manage' },
    { id: 'customers', label: 'Clientes / Fiado', icon: UserCircle, permission: 'customers_manage' },
    { id: 'inventory', label: 'Estoque', icon: Package, permission: 'inventory_edit' },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, permission: 'finance_view' },
    { id: 'users', label: 'Equipe', icon: UsersIcon, permission: 'users_manage' },
    { id: 'settings', label: 'Configurações', icon: Settings, permission: 'admin_settings_manage' },
    { id: 'support', label: 'Suporte Técnico', icon: LifeBuoy, permission: 'dashboard_view' },
  ];

  const saasMenuItems = [
    { id: 'saas-admin', label: 'Dashboard SaaS', icon: LayoutDashboard, permission: 'admin_settings_manage' },
    { id: 'saas-tenants', label: 'Clientes (Tenants)', icon: UsersIcon, permission: 'admin_settings_manage' },
    { id: 'saas-plans', label: 'Planos e Preços', icon: Package, permission: 'admin_settings_manage' },
    { id: 'saas-finance', label: 'Financeiro SaaS', icon: DollarSign, permission: 'admin_settings_manage' },
    { id: 'saas-website', label: 'Ver Site de Vendas', icon: ExternalLink, permission: 'admin_settings_manage', url: '/site' },
  ];

  const filteredMenuItems = isSaaSMode 
    ? saasMenuItems 
    : menuItems.filter(item => {
        // If the user is SuperAdmin (SAAS_ADMIN or developer email), they can see everything
        if (isSuperAdmin) return true;

        // Check if the module is enabled in the tenant's subscription plan.
        // If allowedModules is undefined or empty, we assume there's no restriction or subscription loading,
        // so we default to true to allow user's role/permissions to be the source of truth.
        const isModuleAllowedByTenant = !allowedModules || allowedModules.length === 0 || (() => {
          if (item.id === 'kds-kitchen-only') {
            return allowedModules.includes('kds_view') || allowedModules.includes('kds_kitchen_only_view');
          }
          return allowedModules.includes(item.permission as Permission);
        })();

        if (!isModuleAllowedByTenant) return false;

        // Now, check the user's specific permissions
        const actualUserPermissions = userPermissions || user.permissions || [];
        
        if (item.id === 'kds-kitchen-only') {
          return actualUserPermissions.includes('kds_view') || actualUserPermissions.includes('kds_kitchen_only_view');
        }

        if (item.id === 'support') {
          return true; // Técnico support is always available
        }

        return actualUserPermissions.includes(item.permission as Permission);
      });

  const handleTabClick = (item: any) => {
    if (item.url) {
      window.open(item.url, '_blank');
      return;
    }
    if (item.path) {
      navigate(item.path);
      if (item.targetTab) {
        setActiveTab(item.targetTab);
      }
      if (window.innerWidth < 1024) {
        onClose();
      }
      return;
    }
    setActiveTab(item.id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className={`fixed inset-0 ${isSaaSMode ? 'bg-slate-900/50' : 'bg-slate-900/50'} backdrop-blur-sm z-40 lg:hidden`}
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed lg:sticky top-0 left-0 z-50
        w-64 lg:w-48 ${isSaaSMode ? 'bg-brand-black border-slate-800' : 'bg-brand-white border-r'} h-screen h-[100dvh] flex flex-col shrink-0 overflow-hidden
        transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
          <div className={`p-4 flex items-center justify-between border-b ${isSaaSMode ? 'border-slate-800 bg-slate-800/50' : 'bg-slate-50/50'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-8 h-8 shrink-0 overflow-hidden rounded-xl border border-white/10 flex items-center justify-center ${isSaaSMode ? 'bg-slate-950' : 'bg-brand-primary'}`}>
              {isSaaSMode ? (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="intermundosGradSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>
                  <polygon points="50,10 90,50 50,90 10,50" stroke="url(#intermundosGradSidebar)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                  <polygon points="50,5 81.82,18.18 95,50 81.82,81.82 50,95 18.18,81.82 5,50 18.18,18.18" stroke="url(#intermundosGradSidebar)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="50" y1="5" x2="50" y2="95" stroke="url(#intermundosGradSidebar)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                  <line x1="5" y1="50" x2="95" y2="50" stroke="url(#intermundosGradSidebar)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                  <line x1="18.18" y1="18.18" x2="81.82" y2="81.82" stroke="url(#intermundosGradSidebar)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                  <line x1="18.18" y1="81.82" x2="81.82" y2="18.18" stroke="url(#intermundosGradSidebar)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                  <polygon points="50,5 81.82,18.18 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.15" />
                  <polygon points="50,5 18.18,18.18 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.05" />
                  <polygon points="95,50 81.82,18.18 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.1" />
                  <polygon points="95,50 81.82,81.82 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.2" />
                  <polygon points="50,95 81.82,81.82 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.25" />
                  <polygon points="50,95 18.18,81.82 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.15" />
                  <polygon points="5,50 18.18,81.82 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.1" />
                  <polygon points="5,50 18.18,18.18 50,50" fill="url(#intermundosGradSidebar)" fillOpacity="0.2" />
                  <circle cx="50" cy="50" r="10" fill="#ffffff" opacity="0.15" />
                  <circle cx="50" cy="50" r="4" fill="#047857" />
                  <circle cx="50" cy="50" r="2" fill="#34d399" />
                </svg>
              ) : logoUrl ? (
                <img src={logoUrl} alt={restaurantName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-brand-primary text-white font-black flex items-center justify-center text-sm">
                  {restaurantName.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <h1 className={`font-black text-[12px] leading-tight ${isSaaSMode ? 'text-white' : 'text-slate-800'} tracking-tighter truncate max-w-[100px]`}>{restaurantName}</h1>
          </div>
          <button onClick={onClose} className={`lg:hidden p-2 shrink-0 ${isSaaSMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-white'} rounded-full transition-all border border-transparent hover:border-slate-100`}>
            <X size={20} />
          </button>
        </div>



        <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs group relative ${
                activeTab === item.id 
                  ? (isSaaSMode ? 'bg-emerald-500 text-white font-black shadow-lg shadow-emerald-900/20' : 'bg-brand-secondary text-white font-black shadow-lg shadow-brand-secondary/40 border-l-4 border-white/50')
                  : (isSaaSMode ? 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400 font-bold' : 'text-slate-500 hover:bg-brand-primary/10 hover:text-brand-primary font-bold')
              }`}
            >
              <item.icon size={18} className={`${activeTab === item.id ? 'text-white' : (isSaaSMode ? 'text-slate-500 group-hover:text-emerald-400' : 'text-slate-400 group-hover:text-brand-primary')} transition-colors`} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className={`p-3 pb-safe pb-5 lg:pb-3 border-t ${isSaaSMode ? 'border-slate-800 bg-slate-800/50' : 'bg-slate-50/50'} space-y-2 shrink-0`}>
          <div 
            onClick={onProfileClick}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:opacity-85 active:scale-[0.98] transition-all ${isSaaSMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/80' : 'bg-white border-slate-100 hover:bg-slate-50/80'} rounded-xl border shadow-sm group/profile`}
            title="Clique para editar seu perfil"
          >
            <div className={`w-8 h-8 ${isSaaSMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-primary/10 text-brand-primary'} rounded-lg flex items-center justify-center font-black text-[10px] uppercase shrink-0 relative overflow-hidden group-hover/profile:scale-105 transition-transform`}>
              {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full rounded-lg object-cover" /> : user.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black ${isSaaSMode ? 'text-white font-black' : 'text-slate-800'} truncate group-hover/profile:text-indigo-600 transition-colors`}>{user.name}</p>
              <p className={`text-[8px] font-bold ${isSaaSMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>{user.role}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs text-rose-500 hover:bg-rose-500/10 font-bold group"
          >
            <LogOut size={18} className="text-rose-400 group-hover:text-rose-600 transition-colors" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
});

export default Sidebar;
