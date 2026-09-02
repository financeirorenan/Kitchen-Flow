import React from 'react';
import { CheckCircle2, Clock, MapPin, Store, Bike, PackageCheck, AlertCircle } from 'lucide-react';
import { OrderStatus } from '../../types';

interface CourierTimelineProps {
  status: OrderStatus;
  dispatchedAt?: Date;
  deliveredAt?: Date;
}

export const CourierTimeline: React.FC<CourierTimelineProps> = ({
  status,
  dispatchedAt,
  deliveredAt
}) => {
  // Steps definition for standard courier flow
  const steps = [
    {
      id: 'accepted',
      label: 'Pedido Atribuído',
      sublabel: 'Pronto na cozinha',
      icon: Store,
      isCompleted: ['ready', 'delivering', 'delivered', 'finished'].includes(status),
      isActive: status === 'ready'
    },
    {
      id: 'delivering',
      label: 'A Caminho',
      sublabel: dispatchedAt ? new Date(dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Em trânsito',
      icon: Bike,
      isCompleted: ['delivering', 'delivered', 'finished'].includes(status),
      isActive: status === 'delivering'
    },
    {
      id: 'delivered',
      label: 'Entregue',
      sublabel: deliveredAt ? new Date(deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Concluído',
      icon: CheckCircle2,
      isCompleted: ['delivered', 'finished'].includes(status),
      isActive: status === 'delivered' || status === 'finished'
    }
  ];

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting background line */}
        <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        
        {/* Active progress colored line */}
        <div 
          className="absolute top-1/2 left-6 h-0.5 bg-gradient-to-r from-orange-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{
            width: status === 'ready' ? '15%' : (status === 'delivering' ? '50%' : (['delivered', 'finished'].includes(status) ? 'calc(100% - 3rem)' : '0%'))
          }}
        />

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = step.isCompleted;
          const isCurrent = step.isActive;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                  isCurrent 
                    ? 'bg-brand-primary border-orange-400 text-white shadow-lg shadow-orange-500/40 scale-110 animate-pulse'
                    : isDone
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-750 text-slate-500'
                }`}
              >
                <Icon size={16} strokeWidth={isCurrent ? 2.5 : 2} />
              </div>

              <div className="text-center mt-1.5 max-w-[85px]">
                <span className={`text-[9.5px] font-black uppercase tracking-tight block truncate ${
                  isCurrent ? 'text-brand-primary' : (isDone ? 'text-slate-200' : 'text-slate-500')
                }`}>
                  {step.label}
                </span>
                <span className="text-[8px] font-medium text-slate-400 block truncate">
                  {step.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
