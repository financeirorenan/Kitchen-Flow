import React, { useState } from 'react';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Phone, 
  DollarSign, 
  Check, 
  Copy, 
  ChevronRight, 
  Radio, 
  CheckCircle2, 
  Eye,
  Store,
  MessageCircle,
  Target,
  Edit3,
  AlertTriangle
} from 'lucide-react';
import { Order, Courier, AdminSettings } from '../../types';
import { CourierTimeline } from './CourierTimeline';
import { CourierNavigation } from '../CourierNavigation';
import { CourierPWAInstallBanner } from './CourierPWAInstallBanner';
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

  // Daily goal state persisted in localStorage
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kf_courier_daily_goal');
      return saved ? Math.max(20, Number(saved)) : 150;
    } catch {
      return 150;
    }
  });
  const [editingGoal, setEditingGoal] = useState(false);

  const handleSelectGoal = (val: number) => {
    setDailyGoal(val);
    setEditingGoal(false);
    try {
      localStorage.setItem('kf_courier_daily_goal', String(val));
    } catch {}
  };

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
  const goalProgressPct = Math.min(100, Math.round((totalEarningsToday / (dailyGoal || 150)) * 100));

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
      {/* PWA In-App Install Banner */}
      <CourierPWAInstallBanner variant="card" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN ON DESKTOP: STATUS, METRICS & DAILY GOAL */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. STATUS CARD (ONLINE / OFFLINE TOGGLE) */}
          <div className={`p-5 rounded-3xl border transition-colors ${
            isAvailable 
              ? 'bg-slate-900 border-emerald-500/40' 
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isAvailable 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <Radio size={22} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className={isAvailable ? 'text-emerald-400 font-semibold' : 'text-slate-400 font-medium'}>
                      {isAvailable ? 'Turno Ativo' : 'Turno Pausado'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{courierLocation ? 'GPS Conectado' : 'Aguardando GPS'}</span>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight mt-0.5 truncate">
                    {isAvailable ? 'Visível para novas entregas' : 'Você está offline no momento'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleStatus}
                className={`min-h-[44px] px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                  isAvailable
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'bg-brand-primary hover:bg-[#E03D0C] text-white shadow-lg shadow-orange-950/50'
                }`}
              >
                {isAvailable ? 'Pausar Turno' : 'Ficar Online'}
              </button>
            </div>
          </div>

          {/* 2. OPERATIONAL KPIS + DAILY GOAL TRACKER */}
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-orange-400" />
                <span className="text-xs font-semibold text-white">Resumo e Meta de Hoje</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingGoal(!editingGoal)}
                className="min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit3 size={12} />
                <span>Meta: R$ {dailyGoal}</span>
              </button>
            </div>

            {editingGoal && (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 block">Escolha sua meta diária de comissões:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 150, 200, 300].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectGoal(val)}
                      className={`min-h-[40px] rounded-xl text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                        dailyGoal === val
                          ? 'bg-brand-primary text-white'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">
                  Progresso do dia ({goalProgressPct}%)
                </span>
                <span className="font-mono font-bold text-white tabular-nums">
                  R$ {totalEarningsToday.toFixed(2)} <span className="text-slate-500 font-normal">/ R$ {dailyGoal.toFixed(2)}</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${goalProgressPct}%` }}
                />
              </div>
            </div>

            {/* 3 Stat Tiles */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onGoToEarnings}
                className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 text-left hover:border-orange-500/40 transition-colors cursor-pointer"
              >
                <span className="text-xs text-slate-400 block">Ganhos</span>
                <span className="text-base font-bold text-orange-400 tabular-nums mt-1 block">
                  R$ {totalEarningsToday.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums mt-0.5 block">
                  Méd. R$ {avgEarningsToday.toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={onGoToDeliveries}
                className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 text-left hover:border-emerald-500/40 transition-colors cursor-pointer"
              >
                <span className="text-xs text-slate-400 block">Concluídas</span>
                <span className="text-base font-bold text-white tabular-nums mt-1 block">
                  {completedTodayOrders.length}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  corridas hoje
                </span>
              </button>

              <button
                type="button"
                onClick={onGoToDeliveries}
                className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/90 text-left hover:border-indigo-500/40 transition-colors cursor-pointer"
              >
                <span className="text-xs text-slate-400 block">Na Bag</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums mt-1 block">
                  {activeDeliveries.length}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {activeDeliveries.length === 0 ? 'Livre' : 'em rota'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN ON DESKTOP: ACTIVE DELIVERY COCKPIT & QUEUE */}
        <div className="lg:col-span-7 space-y-5">
          {currentActiveOrder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span>Entrega Prioritária</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-orange-400">
                    {currentActiveOrder.status === 'ready' ? 'Aguardando Coleta' : 'Em Deslocamento'}
                  </span>
                </div>

                {activeDeliveries.length > 1 && (
                  <button
                    type="button"
                    onClick={onGoToDeliveries}
                    className="min-h-[36px] px-2.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+{otherActiveDeliveries.length} na fila</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              <div className="bg-slate-900 rounded-3xl border border-orange-500/50 p-5 sm:p-6 shadow-xl space-y-4">
                {/* Top Header: Order Number, Customer Name & Courier Earnings */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono font-bold text-orange-400 tabular-nums">
                        #{formatOrderNumber(currentActiveOrder)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {(currentActiveOrder.items || []).reduce((acc, it) => acc + it.quantity, 0)} itens
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight mt-0.5 truncate">
                      {currentActiveOrder.customerName || 'Cliente'}
                    </h2>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 block">Comissão</span>
                    <span className="text-xl font-bold text-orange-400 tabular-nums">
                      + R$ {(currentActiveOrder.courierEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80">
                  <CourierTimeline 
                    status={currentActiveOrder.status}
                    dispatchedAt={currentActiveOrder.dispatchedAt}
                    deliveredAt={currentActiveOrder.deliveredAt}
                  />
                </div>

                {/* Pickup & Destination Card */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {/* Pickup point */}
                  <div className="flex items-start gap-3 text-xs">
                    <Store size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-500 block">Coleta no Estabelecimento</span>
                      <p className="font-semibold text-slate-200 truncate mt-0.5">
                        {adminSettings?.companyName || 'Restaurante'}
                      </p>
                      {adminSettings?.address && (
                        <p className="text-slate-400 truncate mt-0.5">{adminSettings.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Dropoff point */}
                  <div className="border-t border-slate-800/80 pt-3 flex items-start gap-3 text-xs">
                    <MapPin size={17} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-500 block">Destino de Entrega</span>
                      <p className="text-sm font-semibold text-white leading-snug mt-0.5">
                        {currentActiveOrder.customerAddress || 'Endereço não informado'}
                      </p>
                    </div>
                  </div>

                  {/* 1-Tap Contact & Copy Strip (44px+ ergonomic hitboxes) */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onCopyAddress(currentActiveOrder.customerAddress || '')}
                      className="min-h-[44px] px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-medium border border-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      {copiedAddress ? (
                        <>
                          <Check size={14} className="text-emerald-400 shrink-0" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-slate-400 shrink-0" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {currentActiveOrder.customerPhone ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openWhatsAppCustomer(currentActiveOrder)}
                          className="min-h-[44px] px-2.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <MessageCircle size={14} className="shrink-0" />
                          <span>WhatsApp</span>
                        </button>

                        <a
                          href={`tel:${currentActiveOrder.customerPhone.replace(/\D/g, '')}`}
                          className="min-h-[44px] px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-medium border border-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Phone size={14} className="text-sky-400 shrink-0" />
                          <span>Ligar</span>
                        </a>
                      </>
                    ) : (
                      <div className="col-span-2 flex items-center justify-center text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800/50">
                        Sem telefone cadastrado
                      </div>
                    )}
                  </div>
                </div>

                {/* Cash Change High-Visibility Callout */}
                {currentActiveOrder.paymentMethod === 'dinheiro' ? (
                  <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-amber-300 block">
                          Cobrar em Dinheiro na Entrega
                        </span>
                        <span className="text-xs text-amber-200/80 block mt-0.5 tabular-nums">
                          {currentActiveOrder.changeFor && currentActiveOrder.changeFor > currentActiveOrder.total
                            ? `Troco p/ R$ ${currentActiveOrder.changeFor.toFixed(2)} • Devolver R$ ${(currentActiveOrder.changeFor - currentActiveOrder.total).toFixed(2)}`
                            : 'Sem troco solicitado'}
                        </span>
                      </div>
                    </div>
                    <span className="text-base font-bold text-amber-300 tabular-nums shrink-0">
                      R$ {currentActiveOrder.total.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Valor do Pedido: <strong className="text-slate-200 tabular-nums">R$ {currentActiveOrder.total.toFixed(2)}</strong>
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {currentActiveOrder.paymentMethod?.toUpperCase() || 'PAGO ONLINE'}
                    </span>
                  </div>
                )}

                {/* Embedded Interactive GPS & Map Preview */}
                <CourierNavigation
                  order={currentActiveOrder}
                  courierLatitude={courierLocation?.latitude}
                  courierLongitude={courierLocation?.longitude}
                />

                {/* External GPS Buttons (48px Hitboxes) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenExternalNavigation(currentActiveOrder.customerAddress || '', 'waze')}
                    className="min-h-[48px] py-3 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-2xl text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Navigation size={15} className="text-sky-400" />
                    <span>Abrir no Waze</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenExternalNavigation(currentActiveOrder.customerAddress || '', 'google')}
                    className="min-h-[48px] py-3 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-2xl text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Navigation size={15} className="text-emerald-400" />
                    <span>Google Maps</span>
                  </button>
                </div>

                {/* Primary State Action CTA (52px height in natural thumb zone) */}
                <div className="pt-1">
                  {currentActiveOrder.status === 'ready' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(currentActiveOrder, 'delivering')}
                      className="w-full min-h-[52px] py-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-orange-950/60 flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer"
                    >
                      <Bike size={20} strokeWidth={2.4} />
                      <span>Iniciar Rota de Entrega</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateOrderStatus(currentActiveOrder, 'delivered')}
                      className="w-full min-h-[52px] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer"
                    >
                      <Check size={20} strokeWidth={2.8} />
                      <span>Confirmar Entrega ao Cliente</span>
                    </button>
                  )}
                </div>

                {/* Order Items Summary Trigger */}
                <button
                  type="button"
                  onClick={() => onSelectOrderSummary(currentActiveOrder)}
                  className="w-full min-h-[44px] py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye size={14} />
                  <span>Conferir Itens e Observações do Pedido</span>
                </button>
              </div>
            </div>
          ) : (
            /* NO ACTIVE DELIVERIES - STANDBY STATE */
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-950 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-800">
                <Bike size={30} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  Nenhuma entrega atribuída no momento
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isAvailable 
                    ? 'Você está online! Assim que a expedição despachar um pedido para você, ele aparecerá aqui com alerta sonoro e rota calculada.' 
                    : 'Você está offline. Toque no botão abaixo para ficar disponível e receber corridas.'}
                </p>
              </div>

              {!isAvailable && (
                <button
                  type="button"
                  onClick={onToggleStatus}
                  className="min-h-[48px] py-3 px-6 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  Ficar Disponível Agora
                </button>
              )}
            </div>
          )}

          {/* 4. MULTI-DELIVERY QUEUE (IF MORE THAN 1 ACTIVE) */}
          {otherActiveDeliveries.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-400">
                  Próximas paradas na bag ({otherActiveDeliveries.length})
                </span>
                <button 
                  type="button"
                  onClick={onGoToDeliveries}
                  className="min-h-[36px] text-xs font-semibold text-orange-400 hover:underline cursor-pointer"
                >
                  Ver todas na rota
                </button>
              </div>

              <div className="space-y-2">
                {otherActiveDeliveries.map((order, idx) => (
                  <div 
                    key={order.id || idx}
                    onClick={() => onSelectOrderSummary(order)}
                    className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer min-h-[64px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold tabular-nums shrink-0">
                        {idx + 2}ª
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-white truncate">
                            {order.customerName || 'Cliente'}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="font-mono text-slate-400 tabular-nums">
                            #{formatOrderNumber(order)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {order.customerAddress || 'Endereço'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span className="text-xs font-bold text-orange-400 tabular-nums block">
                        + R$ {(order.courierEarnings || 0).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Na fila
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
