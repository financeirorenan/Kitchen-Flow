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
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Eye,
  Store,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Order, Courier, AdminSettings } from '../../types';
import { CourierTimeline } from './CourierTimeline';
import { formatOrderNumber } from '../../utils/deduplicate';
import { maskPhone } from '../../utils/masks';

interface CourierHomeTabProps {
  courierData: Courier | null;
  activeDeliveries: Order[];
  assignedOrders: Order[];
  adminSettings: AdminSettings | null;
  courierLocation: { latitude: number; longitude: number } | null;
  copiedAddress: boolean;
  onToggleStatus: () => void;
  onUpdateOrderStatus: (order: Order, nextStatus: 'delivering' | 'delivered') => void;
  onOpenExternalNavigation: (address: string, app?: 'google' | 'waze' | 'geo' | 'apple') => void;
  onCopyAddress: (address: string) => void;
  onSelectOrderSummary: (order: Order) => void;
  onGoToDeliveries: () => void;
  onGoToEarnings: () => void;
}

export const CourierHomeTab: React.FC<CourierHomeTabProps> = ({
  courierData,
  activeDeliveries,
  assignedOrders,
  adminSettings,
  courierLocation,
  copiedAddress,
  onToggleStatus,
  onUpdateOrderStatus,
  onOpenExternalNavigation,
  onCopyAddress,
  onSelectOrderSummary,
  onGoToDeliveries,
  onGoToEarnings
}) => {
  const isAvailable = courierData?.status !== 'offline';
  const currentActiveOrder = activeDeliveries[0] || null;
  const otherActiveDeliveries = activeDeliveries.slice(1);

  // Today metrics
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const completedTodayOrders = assignedOrders.filter(o => {
    if (o.status !== 'delivered' && o.status !== 'finished') return false;
    const date = o.deliveredAt ? new Date(o.deliveredAt) : (o.createdAt ? new Date(o.createdAt) : null);
    return date && date >= startOfDay;
  });

  const totalEarningsToday = completedTodayOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
  const avgEarningsToday = completedTodayOrders.length > 0 ? (totalEarningsToday / completedTodayOrders.length) : 0;

  return (
    <div className="space-y-5 pb-28">
      {/* 1. STATUS CARD (ONLINE / OFFLINE TOGGLE) */}
      <div className={`p-5 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden shadow-xl ${
        isAvailable 
          ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40 shadow-emerald-950/30' 
          : 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-slate-950/40'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isAvailable 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse' 
                : 'bg-slate-800 text-slate-500'
            }`}>
              <Radio size={22} className={isAvailable ? 'animate-spin' : ''} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isAvailable 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {isAvailable ? 'Em Operação' : 'Pausa / Desconectado'}
                </span>
              </div>
              <h2 className="text-base font-black text-white tracking-tight mt-0.5">
                {isAvailable ? 'Você está visível para entregas' : 'Você está offline no momento'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleStatus}
            className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-lg cursor-pointer flex items-center gap-1.5 ${
              isAvailable
                ? 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                : 'bg-brand-primary hover:bg-[#E03D0C] text-white shadow-orange-950/40'
            }`}
          >
            <span>{isAvailable ? 'Pausar' : 'Ficar Online'}</span>
          </button>
        </div>

        {isAvailable && courierLocation && (
          <div className="mt-3.5 pt-3 border-t border-emerald-950/60 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
            <span className="flex items-center gap-1.5 font-sans font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              GPS Ativo e transmitindo localização
            </span>
            <span className="text-[9px] text-slate-400 font-bold">
              {activeDeliveries.length > 0 ? `${activeDeliveries.length} corrida(s) em rota` : 'Aguardando chamados'}
            </span>
          </div>
        )}
      </div>

      {/* 2. OPERATIONAL KPIS (METRICS OF THE DAY) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Metric 1: Earnings Today */}
        <div 
          onClick={onGoToEarnings}
          className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 shadow-md flex flex-col justify-between hover:border-orange-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Ganhos Hoje</span>
            <DollarSign size={13} className="text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <h3 className="text-base font-black text-orange-400 tracking-tight leading-none">
              R$ {totalEarningsToday.toFixed(2)}
            </h3>
            <span className="text-[8px] font-bold text-slate-500 mt-1 block">
              Média R$ {avgEarningsToday.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metric 2: Completed Today */}
        <div 
          onClick={onGoToDeliveries}
          className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 shadow-md flex flex-col justify-between hover:border-emerald-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Entregues</span>
            <CheckCircle2 size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <h3 className="text-base font-black text-white tracking-tight leading-none">
              {completedTodayOrders.length}
            </h3>
            <span className="text-[8px] font-bold text-slate-500 mt-1 block">
              {completedTodayOrders.length === 1 ? '1 concluída' : `${completedTodayOrders.length} concluídas`}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Orders */}
        <div 
          onClick={onGoToDeliveries}
          className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 shadow-md flex flex-col justify-between hover:border-indigo-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Em Rota</span>
            <Bike size={13} className="text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <h3 className="text-base font-black text-indigo-300 tracking-tight leading-none">
              {activeDeliveries.length}
            </h3>
            <span className="text-[8px] font-bold text-slate-500 mt-1 block">
              {activeDeliveries.length === 0 ? 'Livre' : `${activeDeliveries.length} pendente(s)`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CURRENT ACTIVE DELIVERY (HIGH PRIORITY HERO CARD) */}
      {currentActiveOrder ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-ping" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Entrega Atual em Destaque
              </h3>
            </div>

            {activeDeliveries.length > 1 && (
              <button
                type="button"
                onClick={onGoToDeliveries}
                className="text-[9.5px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                +{otherActiveDeliveries.length} em rota
                <ChevronRight size={13} />
              </button>
            )}
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] border-2 border-orange-500/60 p-5 sm:p-6 shadow-2xl shadow-orange-950/30 space-y-5 relative overflow-hidden">
            {/* Top Bar with ID and Earnings */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/40 px-2.5 py-0.5 rounded-full border border-orange-800/40">
                    {currentActiveOrder.status === 'ready' ? 'Retirar na Loja' : 'A Caminho do Cliente'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    #{formatOrderNumber(currentActiveOrder)}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white tracking-tight mt-1">
                  {currentActiveOrder.customerName || 'Cliente'}
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">
                  Sua Comissão
                </span>
                <span className="text-xl font-black text-orange-400">
                  + R$ {(currentActiveOrder.courierEarnings || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Timeline component */}
            <div className="bg-slate-950/80 p-3.5 rounded-3xl border border-slate-800/80">
              <CourierTimeline 
                status={currentActiveOrder.status}
                dispatchedAt={currentActiveOrder.dispatchedAt}
                deliveredAt={currentActiveOrder.deliveredAt}
              />
            </div>

            {/* Delivery Addresses */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-3xl border border-slate-800">
              {/* Pickup point (Restaurant) */}
              <div className="flex items-start gap-2.5 text-xs">
                <Store size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 block">
                    Ponto de Retirada
                  </span>
                  <p className="text-xs font-bold text-slate-200 truncate">
                    {adminSettings?.companyName || 'Estabelecimento'}
                  </p>
                  {adminSettings?.address && (
                    <p className="text-[10.5px] text-slate-400 font-mono truncate">
                      {adminSettings.address}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-850 pt-3 flex items-start gap-2.5 text-xs">
                <MapPin size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 block">
                    Destino Final (Cliente)
                  </span>
                  <p className="text-xs font-bold text-slate-100 leading-relaxed font-mono">
                    {currentActiveOrder.customerAddress || 'Endereço não informado'}
                  </p>
                </div>
              </div>

              {/* Quick Actions for address */}
              <div className="pt-2 border-t border-slate-850 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCopyAddress(currentActiveOrder.customerAddress || '')}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedAddress ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar Endereço</span>
                    </>
                  )}
                </button>

                {currentActiveOrder.customerPhone && (
                  <a
                    href={`tel:${currentActiveOrder.customerPhone.replace(/\D/g, '')}`}
                    className="flex-1 py-2.5 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-900/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Phone size={13} />
                    <span>Ligar ({maskPhone(currentActiveOrder.customerPhone)})</span>
                  </a>
                )}
              </div>
            </div>

            {/* Payment Info Box */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 block">
                  Cobrança do Pedido
                </span>
                <span className="font-bold text-slate-200">
                  Total: R$ {currentActiveOrder.total.toFixed(2)}
                </span>
              </div>

              <span className={`px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider border ${
                currentActiveOrder.paymentMethod === 'dinheiro'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }`}>
                {currentActiveOrder.paymentMethod === 'dinheiro' 
                  ? `Dinheiro ${currentActiveOrder.changeFor ? `(Troco p/ ${currentActiveOrder.changeFor})` : ''}` 
                  : (currentActiveOrder.paymentMethod?.toUpperCase() || 'PAGO DIGITAL')}
              </span>
            </div>

            {/* GPS Apps Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenExternalNavigation(currentActiveOrder.customerAddress || '', 'waze')}
                className="py-3 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-2xl text-[9.5px] font-black uppercase tracking-wider border border-slate-750 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Navigation size={14} className="text-sky-400" />
                <span>Abrir no Waze</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenExternalNavigation(currentActiveOrder.customerAddress || '', 'google')}
                className="py-3 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-2xl text-[9.5px] font-black uppercase tracking-wider border border-slate-750 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Navigation size={14} className="text-emerald-400" />
                <span>Google Maps</span>
              </button>
            </div>

            {/* BIG ACTION BUTTON (MOST IMPORTANT ELEMENT ON SCREEN) */}
            <div className="pt-1">
              {currentActiveOrder.status === 'ready' ? (
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(currentActiveOrder, 'delivering')}
                  className="w-full py-4.5 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <Bike size={20} strokeWidth={2.5} />
                  <span>INICIAR ROTA DE ENTREGA</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(currentActiveOrder, 'delivered')}
                  className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <Check size={20} strokeWidth={3} />
                  <span>CHEGUEI & ENTREGUE AO CLIENTE</span>
                </button>
              )}
            </div>

            {/* View full order summary modal link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => onSelectOrderSummary(currentActiveOrder)}
                className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Eye size={12} />
                Ver Detalhes dos Itens do Pedido
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* NO ACTIVE DELIVERIES - STANDBY STATE */
        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-slate-950 text-slate-500 rounded-3xl flex items-center justify-center mx-auto border border-slate-800">
            <Bike size={32} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-white tracking-tight">
              Nenhuma entrega em rota no momento
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {isAvailable 
                ? 'Você está conectado e pronto! Assim que a cozinha despachar um pedido para você, ele aparecerá aqui com alerta sonoro.' 
                : 'Você está offline. Clique em "Ficar Online" no topo para começar a receber corridas.'}
            </p>
          </div>

          {!isAvailable && (
            <button
              type="button"
              onClick={onToggleStatus}
              className="py-3 px-6 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              Conectar e Ficar Disponível
            </button>
          )}
        </div>
      )}

      {/* 4. MULTI-DELIVERY QUEUE (IF MORE THAN 1 ACTIVE) */}
      {otherActiveDeliveries.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
              Próximas Entregas na Fila ({otherActiveDeliveries.length})
            </span>
            <button 
              onClick={onGoToDeliveries}
              className="text-[9.5px] font-black uppercase tracking-wider text-orange-400"
            >
              Ver Rota Otimizada
            </button>
          </div>

          <div className="space-y-2">
            {otherActiveDeliveries.map((order, idx) => (
              <div 
                key={order.id || idx}
                onClick={() => onSelectOrderSummary(order)}
                className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                    {idx + 2}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {order.customerName || 'Cliente'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        #{formatOrderNumber(order)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {order.customerAddress || 'Endereço'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <span className="text-xs font-black text-orange-400 block">
                    + R$ {(order.courierEarnings || 0).toFixed(2)}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">
                    Fila
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
