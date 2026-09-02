import React from 'react';
import { Bike, Camera, LogOut, ChevronRight, Wifi, WifiOff, RefreshCw, Power } from 'lucide-react';
import { Courier, User } from '../../types';

interface CourierHeaderProps {
  currentUser: User;
  courierData: Courier | null;
  isOnline: boolean;
  pendingSyncCount: number;
  onProfileClick: () => void;
  onLogout: () => void;
  onToggleStatus: () => void;
  onSyncNow?: () => void;
}

export const CourierHeader: React.FC<CourierHeaderProps> = ({
  currentUser,
  courierData,
  isOnline,
  pendingSyncCount,
  onProfileClick,
  onLogout,
  onToggleStatus,
  onSyncNow
}) => {
  const photoURL = courierData?.photoURL || currentUser.photoURL;
  const firstName = (courierData?.name || currentUser.name || 'Entregador').split(' ')[0];
  const isAvailable = courierData?.status !== 'offline';

  // Greeting by hour of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <header className="px-5 pt-6 pb-4 flex flex-col gap-4 relative z-20">
      <div className="flex items-center justify-between">
        {/* Profile and Greeting */}
        <div className="flex items-center gap-3.5">
          <div 
            onClick={onProfileClick}
            className="w-13 h-13 bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-slate-750 shadow-xl overflow-hidden group active:scale-95 transition-all cursor-pointer relative"
          >
            {photoURL ? (
              <img src={photoURL} className="w-full h-full object-cover" alt="Perfil" />
            ) : (
              <Bike size={24} className="text-orange-400 group-hover:scale-110 transition-transform" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={14} className="text-white" />
            </div>
          </div>

          <div onClick={onProfileClick} className="cursor-pointer">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {getGreeting()}, parceiro
            </p>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1 leading-tight">
              {firstName}
              <ChevronRight size={14} className="text-slate-500" />
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isOnline 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {isOnline ? 'Online' : 'Sem Conexão'}
              </span>

              {pendingSyncCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSyncNow) onSyncNow();
                  }}
                  className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
                  title="Sincronizar dados salvos offline"
                >
                  <RefreshCw size={9} className="animate-spin" />
                  {pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions / Status Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleStatus}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md border cursor-pointer ${
              isAvailable
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750 hover:text-slate-200'
            }`}
          >
            <Power size={13} className={isAvailable ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
            <span>{isAvailable ? 'Disponível' : 'Offline'}</span>
          </button>

          <button 
            type="button"
            onClick={onLogout}
            className="p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 hover:bg-slate-800 active:scale-95 transition-all text-slate-400 hover:text-white cursor-pointer shadow-sm"
            title="Sair da Conta"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
