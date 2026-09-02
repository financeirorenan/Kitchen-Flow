import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  LifeBuoy, 
  Store, 
  DollarSign, 
  ExternalLink, 
  Check, 
  Trash2,
  Clock,
  Sparkles
} from 'lucide-react';
import { SaasNotification } from '../../types';

interface SaasNotificationsDrawerProps {
  notifications: SaasNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll: () => void;
  onNavigateToNotification?: (notif: SaasNotification) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SaasNotificationsDrawer: React.FC<SaasNotificationsDrawerProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateToNotification,
  onNavigateTab
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'critical') return n.type === 'danger' || n.type === 'warning';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-amber-400">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Central de Notificações</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                title="Marcar todas como lidas"
              >
                Marcar lidas
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: `Não Lidas (${unreadCount})` },
              { id: 'critical', label: 'Críticas 🔴' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  filter === tab.id ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-black text-slate-700">Tudo em dia!</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Não há notificações pendentes nesta categoria.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isDanger = notif.type === 'danger';
              const isWarning = notif.type === 'warning';
              const isSuccess = notif.type === 'success';
              const isInfo = notif.type === 'info';

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    if (onNavigateToNotification) {
                      onNavigateToNotification(notif);
                    } else if (onNavigateTab && notif.actionTab) {
                      onNavigateTab(notif.actionTab);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-left relative group ${
                    notif.read 
                      ? 'bg-slate-50/70 border-slate-200/60 opacity-80' 
                      : 'bg-white border-slate-200 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Indicator Icon */}
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isDanger ? 'bg-rose-50 text-rose-600' :
                    isWarning ? 'bg-amber-50 text-amber-600' :
                    isSuccess ? 'bg-emerald-50 text-emerald-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {isDanger ? <XCircle size={16} /> :
                     isWarning ? <AlertTriangle size={16} /> :
                     isSuccess ? <CheckCircle2 size={16} /> :
                     <LifeBuoy size={16} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-black truncate ${notif.read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.description}</p>
                    
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={10} />
                        {typeof notif.timestamp === 'string' ? notif.timestamp : new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                        Resolver <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400 shrink-0 font-medium">
          Notificações em tempo real do ecossistema KitchenFlow
        </div>
      </motion.div>
    </div>
  );
};
