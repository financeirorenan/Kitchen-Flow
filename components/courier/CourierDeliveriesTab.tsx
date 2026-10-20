import React from 'react';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Phone, 
  Check, 
  Copy, 
  Eye, 
  Navigation2,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { Order, AdminSettings } from '../../types';
import { CourierTimeline } from './CourierTimeline';
import { CourierNavigation } from '../CourierNavigation';
import { formatOrderNumber } from '../../utils/deduplicate';

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
  courierLocation,
  copiedAddress,
  onUpdateOrderStatus,
  onOpenExternalNavigation,
  onCopyAddress,
  onSelectOrderSummary,
  onOpenMultiRoute
}) => {
  const openWhatsAppCustomer = (order: Order) => {
    if (!order.customerPhone) return;
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const orderNum = formatOrderNumber(order);
    const statusText = order.status === 'ready'
      ? `Olá ${order.customerName || ''}! Sou o entregador do seu pedido #${orderNum}. Já estou saindo do estabelecimento com sua entrega!`
      : `Olá ${order.customerName || ''}! Sou o entregador do seu pedido #${orderNum}. Estou chegando no endereço de entrega!`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(statusText)}`, '_blank');
  };

  return (
    <div className="space-y-5 pb-28">
      {/* 1. Header with Active Route Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Rotas e Entregas Ativas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeDeliveries.length === 0 
              ? 'Nenhuma entrega atribuída no momento' 
              : `${activeDeliveries.length} ${activeDeliveries.length === 1 ? 'pedido em rota' : 'pedidos ordenados por parada'}`}
          </p>
        </div>

        {activeDeliveries.length > 1 && (
          <button
            type="button"
            onClick={onOpenMultiRoute}
            className="min-h-[44px] flex items-center gap-2 py-2.5 px-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Navigation2 size={15} />
            <span>Abrir Rota Completa no Maps</span>
          </button>
        )}
      </div>

      {/* 2. Empty State if no deliveries */}
      {activeDeliveries.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-950 text-slate-500 rounded-2xl flex items-center justify-center mx-auto border border-slate-800">
            <Bike size={30} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Tudo pronto por aqui!
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Você não possui entregas pendentes. Quando novos pedidos forem despachados pelo operador, eles aparecerão aqui com rotas calculadas.
            </p>
          </div>
        </div>
      ) : (
        /* 3. List of Active Delivery Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {activeDeliveries.map((order, index) => {
            const isFirst = index === 0;
            const orderNum = formatOrderNumber(order);
            const itemsCount = (order.items || []).reduce((acc, it) => acc + it.quantity, 0);

            return (
              <div 
                key={order.id || index}
                className={`bg-slate-900 rounded-3xl p-5 sm:p-6 border space-y-4 relative overflow-hidden transition-all ${
                  isFirst ? 'border-orange-500/60 shadow-xl' : 'border-slate-800'
                }`}
              >
                {/* Header Stop Number & Commission */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                      isFirst ? 'bg-brand-primary text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {index + 1}ª
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-mono font-bold text-white tabular-nums">#{orderNum}</span>
                        <span aria-hidden="true">·</span>
                        <span>{itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
                      </div>
                      <h3 className="text-base font-bold text-white truncate mt-0.5">
                        {order.customerName || 'Cliente'}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 block">Comissão</span>
                    <span className="text-base font-bold text-orange-400 tabular-nums">
                      + R$ {(order.courierEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                  <CourierTimeline 
                    status={order.status}
                    dispatchedAt={order.dispatchedAt}
                    deliveredAt={order.deliveredAt}
                  />
                </div>

                {/* Turn-by-Turn GPS Navigation Component */}
                <CourierNavigation 
                  order={order}
                  courierLatitude={courierLocation?.latitude}
                  courierLongitude={courierLocation?.longitude}
                />

                {/* Destination & Customer Contact */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  {order.customerAddress && (
                    <div className="flex items-start gap-2.5">
                      <MapPin size={17} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-slate-500 block">Endereço de Entrega</span>
                        <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed mt-0.5">
                          {order.customerAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Contact & Copy Actions (44px+ touch targets) */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onCopyAddress(order.customerAddress || '')}
                      className="min-h-[44px] px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-medium border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedAddress ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-slate-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {order.customerPhone ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openWhatsAppCustomer(order)}
                          className="min-h-[44px] px-2.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </button>

                        <a
                          href={`tel:${order.customerPhone.replace(/\D/g, '')}`}
                          className="min-h-[44px] px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-medium border border-slate-800 flex items-center justify-center gap-1.5"
                        >
                          <Phone size={14} className="text-sky-400" />
                          <span>Ligar</span>
                        </a>
                      </>
                    ) : (
                      <div className="col-span-2 flex items-center justify-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/50">
                        Sem telefone
                      </div>
                    )}
                  </div>

                  {/* External GPS Apps */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenExternalNavigation(order.customerAddress || '', 'waze')}
                      className="min-h-[44px] py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation size={14} className="text-sky-400" />
                      <span>Waze</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenExternalNavigation(order.customerAddress || '', 'google')}
                      className="min-h-[44px] py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation size={14} className="text-emerald-400" />
                      <span>Google Maps</span>
                    </button>
                  </div>
                </div>

                {/* Cash Payment / Change Warning */}
                {order.paymentMethod === 'dinheiro' ? (
                  <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-300">
                      <AlertTriangle size={16} className="shrink-0" />
                      <div>
                        <span className="font-bold block">Receber em Dinheiro</span>
                        {order.changeFor && order.changeFor > order.total && (
                          <span className="text-amber-200/80 tabular-nums">
                            Troco p/ R$ {order.changeFor.toFixed(2)} (Devolver R$ {(order.changeFor - order.total).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-sm text-amber-300 tabular-nums shrink-0">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Total: <strong className="text-slate-200 tabular-nums">R$ {order.total.toFixed(2)}</strong></span>
                    <span className="text-emerald-400 font-semibold">{order.paymentMethod?.toUpperCase() || 'PAGO ONLINE'}</span>
                  </div>
                )}

                {/* Primary State Transition Action */}
                <div className="pt-1">
                  {order.status === 'ready' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(order, 'delivering')}
                      className="w-full min-h-[50px] py-3.5 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <Bike size={18} strokeWidth={2.4} />
                      <span>Iniciar Rota deste Pedido</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(order, 'delivered')}
                      className="w-full min-h-[50px] py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <Check size={18} strokeWidth={2.8} />
                      <span>Confirmar Entrega Realizada</span>
                    </button>
                  )}
                </div>

                {/* View Details Link */}
                <button
                  type="button"
                  onClick={() => onSelectOrderSummary(order)}
                  className="w-full min-h-[40px] text-xs font-medium text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Ver Itens e Comprovante do Pedido</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
