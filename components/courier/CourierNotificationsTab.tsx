import React from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Bike, 
  DollarSign, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Clock,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface CourierNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'delivery' | 'earnings' | 'system';
  timestamp: Date;
  read: boolean;
}

interface CourierNotificationsTabProps {
  notifications: CourierNotificationItem[];
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onRequestPermission: () => void;
  notificationPermission: NotificationPermission;
}

export const CourierNotificationsTab: React.FC<CourierNotificationsTabProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  onRequestPermission,
  notificationPermission
}) => {
  const getIcon = (type: CourierNotificationItem['type']) => {
    switch (type) {
      case 'order':
        return <Bike size={16} className="text-orange-400" />;
      case 'delivery':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'earnings':
        return <DollarSign size={16} className="text-amber-400" />;
      case 'system':
      default:
        return <Info size={16} className="text-sky-400" />;
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Central de Notificações
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico de alertas e avisos operacionais
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 transition-colors"
            >
              Marcar lidas
            </button>
            <button
              type="button"
              onClick={onClearNotifications}
              className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition-colors"
              title="Limpar Notificações"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Permission banner if pending */}
      {notificationPermission !== 'granted' && (
        <div className="bg-orange-950/30 border border-orange-500/40 p-4.5 rounded-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary text-white rounded-2xl flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Ativar Alertas em Segundo Plano</h4>
              <p className="text-[10px] text-slate-400">Receba notificações de novas corridas mesmo com a tela bloqueada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequestPermission}
            className="px-3 py-2 bg-brand-primary text-white text-[9px] font-black uppercase rounded-xl shrink-0"
          >
            Ativar
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 text-center space-y-3 shadow-xl">
            <div className="w-14 h-14 bg-slate-950 text-slate-500 rounded-3xl flex items-center justify-center mx-auto border border-slate-800">
              <Bell size={24} />
            </div>
            <h3 className="text-sm font-black text-white">Nenhum alerta recente</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Você está em dia com todas as notificações operacionais da sua rota.
            </p>
          </div>
        ) : (
          notifications.map(item => (
            <div 
              key={item.id}
              className={`p-4 rounded-3xl border transition-all flex items-start gap-3.5 ${
                item.read 
                  ? 'bg-slate-900/60 border-slate-800/80 text-slate-400' 
                  : 'bg-slate-900 border-orange-500/30 text-slate-200 shadow-md'
              }`}
            >
              <div className="w-9 h-9 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-white truncate">
                    {item.title}
                  </h4>
                  <span className="text-[8.5px] text-slate-500 shrink-0 flex items-center gap-1 font-mono">
                    <Clock size={10} />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
