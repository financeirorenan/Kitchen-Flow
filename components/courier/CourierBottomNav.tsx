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
      id: 'notifications' as CourierTabType,
      label: 'Alertas',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    },
    {
      id: 'profile' as CourierTabType,
      label: 'Perfil',
      icon: UserIcon
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 pb-safe">
      <div className="max-w-3xl mx-auto grid grid-cols-6 items-center h-16 px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors relative cursor-pointer ${
                isActive 
                  ? 'text-brand-primary font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 bg-rose-500 rounded-full border border-slate-950 flex items-center justify-center text-[9px] font-bold tabular-nums text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
