import React from 'react';
import { Bike, Camera, LogOut, ChevronRight, RefreshCw, Power, Bell } from 'lucide-react';
import { Courier, User } from '../../types';
import { CourierPWAInstallBanner } from './CourierPWAInstallBanner';

interface CourierHeaderProps {
  currentUser: User;
  courierData: Courier | null;
  isOnline: boolean;
  pendingSyncCount: number;
  unreadNotificationsCount?: number;
  onProfileClick: () => void;
  onNotificationsClick?: () => void;
  onLogout: () => void;
  onToggleStatus: () => void;
  onSyncNow?: () => void;
}

export const CourierHeader: React.FC<CourierHeaderProps> = ({
  currentUser,
  courierData,
  isOnline,
  pendingSyncCount,
  unreadNotificationsCount = 0,
  onProfileClick,
  onNotificationsClick,
  onLogout,
  onToggleStatus,
  onSyncNow
}) => {
  const photoURL = courierData?.photoURL || currentUser.photoURL;
  const firstName = (courierData?.name || currentUser.name || 'Entregador').split(' ')[0];
  const isAvailable = courierData?.status !== 'offline';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 -mx-3 sm:-mx-4 px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left Slot: Profile and Clean Unboxed Status Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onProfileClick}
            className="w-11 h-11 min-h-[44px] min-w-[44px] bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 overflow-hidden group active:scale-95 transition-transform cursor-pointer relative shrink-0"
            title="Abrir Perfil"
          >
            {photoURL ? (
              <img src={photoURL} className="w-full h-full object-cover" alt="Perfil" referrerPolicy="no-referrer" />
            ) : (
              <Bike size={22} className="text-orange-400" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={13} className="text-white" />
            </div>
          </button>

          <div onClick={onProfileClick} className="cursor-pointer min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span>{getGreeting()}</span>
              <span aria-hidden="true">·</span>
              <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {isOnline ? 'Conectado' : 'Modo Offline'}
              </span>
              {pendingSyncCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSyncNow) onSyncNow();
                    }}
                    className="inline-flex items-center gap-1 text-amber-400 hover:underline font-medium cursor-pointer"
                    title="Sincronizar dados salvos offline"
                  >
                    <RefreshCw size={10} className="animate-spin" />
                    <span>{pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}</span>
                  </button>
                </>
              )}
            </div>

            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1 truncate">
              <span className="truncate">{firstName}</span>
              <ChevronRight size={14} className="text-slate-500 shrink-0" />
            </h1>
          </div>
        </div>

        {/* Right Slot: PWA Install, Notifications, Online Toggle, Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <CourierPWAInstallBanner variant="header-button" />

          {onNotificationsClick && (
            <button
              type="button"
              onClick={onNotificationsClick}
              className="min-h-[44px] min-w-[44px] bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors relative cursor-pointer active:scale-95"
              title="Central de Notificações"
            >
              <Bell size={17} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-primary text-white text-[10px] font-bold tabular-nums rounded-full flex items-center justify-center border-2 border-slate-950">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleStatus}
            className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95 border cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              isAvailable
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Power size={14} className={isAvailable ? 'text-emerald-400' : 'text-slate-500'} />
            <span>{isAvailable ? 'Disponível' : 'Offline'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] min-w-[44px] bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Sair da Conta"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
