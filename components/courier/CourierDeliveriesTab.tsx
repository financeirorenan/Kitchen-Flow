import React from 'react';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Phone, 
  DollarSign, 
  Clock, 
  Check, 
  Copy, 
  ChevronRight, 
  AlertCircle, 
  Radio, 
  Layers, 
  Map as MapIcon, 
  Eye, 
  ExternalLink,
  Store,
  CheckCircle2,
  Navigation2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Order, Courier, AdminSettings } from '../../types';
import { CourierTimeline } from './CourierTimeline';
import { CourierNavigation } from '../CourierNavigation';
import { formatOrderNumber } from '../../utils/deduplicate';
import { maskPhone } from '../../utils/masks';

interface CourierDeliveriesTabProps {
  activeDeliveries: Order[];
  adminSettings: AdminSettings | null;
  courierLocation: { latitude: number; longitude: number } | null;
  copiedAddress: boolean;
  onUpdateOrderStatus: (order: Order, nextStatus: 'delivering' | 'delivered') => void;
  onOpenExternalNavigation: (address: string, app?: 'google' | 'waze' | 'geo' | 'apple') => void;
  onCopyAddress: (address: string) => void;
  onSelectOrderSummary: (order: Order) => void;
  onOpenMultiRoute: () => void;
}

export const CourierDeliveriesTab: React.FC<CourierDeliveriesTabProps> = ({
  activeDeliveries,
  adminSettings,
  courierLocation,
  copiedAddress,
  onUpdateOrderStatus,
  onOpenExternalNavigation,
  onCopyAddress,
  onSelectOrderSummary,
  onOpenMultiRoute
}) => {
  return (
    <div className="space-y-5 pb-28">
      {/* 1. Header with Active Route Summary */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Rotas e Entregas Ativas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeDeliveries.length === 0 
              ? 'Nenhuma entrega atribuída no momento' 
              : `${activeDeliveries.length} ${activeDeliveries.length === 1 ? 'pedido em rota' : 'pedidos para entregar'}`}
          </p>
        </div>

        {activeDeliveries.length > 1 && (
          <button
            type="button"
            onClick={onOpenMultiRoute}
            className="flex items-center gap-1.5 py-2.5 px-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-[9.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Navigation2 size={14} />
            <span>Rota Total no Maps</span>
          </button>
        )}
      </div>

      {/* 2. Empty State if no deliveries */}
      {activeDeliveries.length === 0 ? (
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-slate-950 text-slate-500 rounded-3xl flex items-center justify-center mx-auto border border-slate-800">
            <Bike size={32} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-white tracking-tight">
              Tudo pronto por aqui!
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Você não possui entregas pendentes. Quando novos pedidos forem despachados pelo operador, eles aparecerão aqui com rotas calculadas.
            </p>
          </div>
        </div>
      ) : (
        /* 3. List of Active Delivery Cards */
        <div className="space-y-5">
          {activeDeliveries.map((order, index) => {
            const isFirst = index === 0;
            const orderNum = formatOrderNumber(order);

            return (
              <div 
                key={order.id || index}
                className={`bg-slate-900 rounded-[2.5rem] p-5 sm:p-6 border shadow-xl space-y-5 relative overflow-hidden transition-all ${
                  isFirst ? 'border-orange-500/60 shadow-orange-950/30' : 'border-slate-800'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                      isFirst ? 'bg-brand-primary text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Pedido #{orderNum}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {order.status === 'ready' ? 'Pronto na Cozinha' : 'Em Transporte'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      Comissão
                    </span>
                    <span className="text-base font-black text-orange-400">
                      + R$ {(order.courierEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                  <CourierTimeline 
                    status={order.status}
                    dispatchedAt={order.dispatchedAt}
                    deliveredAt={order.deliveredAt}
                  />
                </div>

                {/* Turn-by-Turn GPS Navigation Component (Expanded on primary order) */}
                {isFirst && (
                  <div className="rounded-2xl overflow-hidden border border-slate-800">
                    <CourierNavigation 
                      order={order}
                      courierLatitude={courierLocation?.latitude}
                      courierLongitude={courierLocation?.longitude}
                    />
                  </div>
                )}

                {/* Destination & Customer Details */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        Cliente
                      </span>
                      <p className="text-sm font-bold text-white">
                        {order.customerName || 'Cliente'}
                      </p>
                    </div>

                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone.replace(/\D/g, '')}`}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-900/30 hover:bg-emerald-900/40"
                      >
                        <Phone size={12} />
                        Ligar
                      </a>
                    )}
                  </div>

                  {order.customerAddress && (
                    <div className="pt-2 border-t border-slate-850 flex items-start gap-2">
                      <MapPin size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                          Endereço de Entrega
                        </span>
                        <p className="text-xs font-medium text-slate-200 leading-relaxed font-mono">
                          {order.customerAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Copy & External Maps */}
                  <div className="pt-2 border-t border-slate-850 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCopyAddress(order.customerAddress || '')}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedAddress ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copiar Endereço</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenExternalNavigation(order.customerAddress || '', 'google')}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation size={12} className="text-emerald-400" />
                      <span>Google Maps</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenExternalNavigation(order.customerAddress || '', 'waze')}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation size={12} className="text-sky-400" />
                      <span>Waze</span>
                    </button>
                  </div>
                </div>

                {/* Primary State Transition Action */}
                <div className="pt-1">
                  {order.status === 'ready' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(order, 'delivering')}
                      className="w-full py-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Bike size={18} strokeWidth={2.5} />
                      <span>Iniciar Rota deste Pedido</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(order, 'delivered')}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Check size={18} strokeWidth={3} />
                      <span>Confirmar Entrega Realizada</span>
                    </button>
                  )}
                </div>

                {/* View Details Link */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectOrderSummary(order)}
                    className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    Ver Itens e Comprovante do Pedido
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
