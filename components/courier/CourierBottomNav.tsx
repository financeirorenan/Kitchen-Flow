import React from 'react';
import { 
  Home, 
  Bike, 
  DollarSign, 
  History, 
  User as UserIcon,
  Bell
} from 'lucide-react';

export type CourierTabType = 'home' | 'deliveries' | 'earnings' | 'history' | 'notifications' | 'profile';

interface CourierBottomNavProps {
  activeTab: CourierTabType;
  onChangeTab: (tab: CourierTabType) => void;
  activeDeliveriesCount: number;
  unreadNotificationsCount?: number;
}

export const CourierBottomNav: React.FC<CourierBottomNavProps> = ({
  activeTab,
  onChangeTab,
  activeDeliveriesCount,
  unreadNotificationsCount = 0
}) => {
  const tabs = [
    {
      id: 'home' as CourierTabType,
      label: 'Início',
      icon: Home
    },
    {
      id: 'deliveries' as CourierTabType,
      label: 'Rotas',
      icon: Bike,
      badge: activeDeliveriesCount > 0 ? activeDeliveriesCount : undefined
    },
    {
      id: 'earnings' as CourierTabType,
      label: 'Ganhos',
      icon: DollarSign
    },
    {
      id: 'history' as CourierTabType,
      label: 'Histórico',
      icon: History
    },
    {
      id: 'profile' as CourierTabType,
      label: 'Perfil',
      icon: UserIcon
    }
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto h-20 bg-slate-900/95 backdrop-blur-xl rounded-[2.2rem] shadow-[0_20px_40px_rgba(0,0,0,0.6)] border border-slate-800/90 flex items-center justify-around px-2 z-50">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl gap-1 transition-all relative cursor-pointer ${
              isActive 
                ? 'text-brand-primary font-black scale-105 bg-orange-950/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[7.5px] font-black uppercase tracking-wider">
              {tab.label}
            </span>

            {/* Badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute top-1 right-1.5 min-w-[17px] h-[17px] px-1 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
