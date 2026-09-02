import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Bike, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Layers, 
  Eye, 
  HelpCircle, 
  Sparkles,
  Flame,
  Award,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Order, Courier } from '../../types';
import { formatOrderNumber } from '../../utils/deduplicate';

interface CourierEarningsTabProps {
  courierData: Courier | null;
  assignedOrders: Order[];
  onSelectOrderSummary: (order: Order) => void;
  onSettleCash: () => void;
}

export const CourierEarningsTab: React.FC<CourierEarningsTabProps> = ({
  courierData,
  assignedOrders,
  onSelectOrderSummary,
  onSettleCash
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'previous' | 'month' | 'all'>('current');
  const [chartMetric, setChartMetric] = useState<'earnings' | 'count' | 'avgTime'>('earnings');
  const [chartType, setChartType] = useState<'bar' | 'area' | 'line'>('bar');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Helper date calcs
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;
  
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() + diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(currentWeekStart);
  prevWeekEnd.setMilliseconds(-1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Filter delivered orders
  const deliveredOrders = assignedOrders.filter(o => o.status === 'delivered' || o.status === 'finished');

  // Filter by selected period
  const filteredOrders = deliveredOrders.filter(order => {
    const d = order.deliveredAt ? new Date(order.deliveredAt) : (order.createdAt ? new Date(order.createdAt) : null);
    if (!d) return false;

    if (selectedPeriod === 'current') return d >= currentWeekStart;
    if (selectedPeriod === 'previous') return d >= prevWeekStart && d <= prevWeekEnd;
    if (selectedPeriod === 'month') return d >= monthStart;
    return true;
  });

  // Calculate metrics
  const totalPeriodEarnings = filteredOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
  const totalDeliveries = filteredOrders.length;
  const avgPerDelivery = totalDeliveries > 0 ? (totalPeriodEarnings / totalDeliveries) : 0;

  // Today specific metrics
  const todayOrders = deliveredOrders.filter(o => {
    const d = o.deliveredAt ? new Date(o.deliveredAt) : (o.createdAt ? new Date(o.createdAt) : null);
    return d && d >= startOfToday;
  });
  const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
  const todayDeliveriesCount = todayOrders.length;

  // Group by day for charts and list
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fullDayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Build daily stats for week
  const daysData = Array.from({ length: 7 }).map((_, i) => {
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(currentWeekStart.getDate() + i);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const ordersInDay = deliveredOrders.filter(o => {
      const d = o.deliveredAt ? new Date(o.deliveredAt) : (o.createdAt ? new Date(o.createdAt) : null);
      return d && d >= dayStart && d <= dayEnd;
    });

    const dayEarnings = ordersInDay.reduce((sum, o) => sum + (o.courierEarnings || 0), 0);
    
    // Average minutes per delivery
    const totalMinutes = ordersInDay.reduce((sum, o) => {
      if (o.dispatchedAt && o.deliveredAt) {
        return sum + (new Date(o.deliveredAt).getTime() - new Date(o.dispatchedAt).getTime()) / 60000;
      }
      return sum + 20; // Default estimate
    }, 0);
    const avgMinutes = ordersInDay.length > 0 ? Math.round(totalMinutes / ordersInDay.length) : 0;

    const dayIndex = targetDate.getDay();
    const isToday = targetDate.toDateString() === now.toDateString();

    return {
      dateKey: targetDate.toISOString().split('T')[0],
      dayName: dayNames[dayIndex],
      fullDayName: fullDayNames[dayIndex],
      dateFormatted: targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      earnings: dayEarnings,
      count: ordersInDay.length,
      avgTime: avgMinutes,
      orders: ordersInDay,
      isToday
    };
  });

  // Best day calculation
  const bestDay = [...daysData].sort((a, b) => b.earnings - a.earnings)[0];

  return (
    <div className="space-y-5 pb-28">
      {/* 1. TOP HIGHLIGHT CARD (TODAY'S EARNINGS vs WEEK) */}
      <div className="bg-gradient-to-br from-orange-950/80 via-slate-900 to-slate-950 border-2 border-orange-500/50 p-6 rounded-[2.5rem] shadow-2xl shadow-orange-950/30 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
              Ganhos Acumulados Hoje
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
            Hoje ({now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })})
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">
              R$ {todayEarnings.toFixed(2)}
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>{todayDeliveriesCount} {todayDeliveriesCount === 1 ? 'corrida concluída hoje' : 'corridas concluídas hoje'}</span>
            </p>
          </div>

          <div className="text-right bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">
              Total da Semana
            </span>
            <span className="text-base font-black text-orange-400">
              R$ {totalPeriodEarnings.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CARTEIRA & ACERTO DE CAIXA (CASH HELD & NET SETTLEMENT) */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-[2.5rem] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Wallet size={16} className="text-orange-400" />
            Carteira & Acerto de Contas
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">
            Saldo em Tempo Real
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 block">
              Comissões + Diárias
            </span>
            <span className="text-base font-black text-slate-200 mt-0.5 block">
              R$ {(courierData?.earnings || 0).toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-500 block">
              Dinheiro em Mãos (Caixa)
            </span>
            <span className="text-base font-black text-amber-400 mt-0.5 block">
              R$ {(courierData?.cashHeld || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 block">
              Saldo Líquido a Receber
            </span>
            <span className="text-[8px] text-slate-500 block">
              Ganhos acumulados menos dinheiro físico em mãos
            </span>
          </div>

          <span className={`text-xl font-black ${(courierData?.earnings || 0) >= (courierData?.cashHeld || 0) ? 'text-orange-400' : 'text-rose-500'}`}>
            R$ {((courierData?.earnings || 0) - (courierData?.cashHeld || 0)).toFixed(2)}
          </span>
        </div>

        {(courierData?.cashHeld || 0) > 0 && (
          <button
            type="button"
            onClick={onSettleCash}
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-850 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
          >
            <DollarSign size={15} className="text-orange-400" />
            <span>Acertar Dinheiro com o Caixa</span>
          </button>
        )}
      </div>

      {/* 3. PERIOD SELECTOR & SUMMARY METRICS */}
      <div className="space-y-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'current', label: 'Esta Semana' },
            { id: 'previous', label: 'Semana Anterior' },
            { id: 'month', label: 'Mês Atual' },
            { id: 'all', label: 'Todas' }
          ].map(period => (
            <button
              key={period.id}
              type="button"
              onClick={() => setSelectedPeriod(period.id as any)}
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                selectedPeriod === period.id 
                  ? 'bg-brand-primary text-white shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Total Período</span>
            <h3 className="text-base font-black text-orange-400 tracking-tight mt-1">
              R$ {totalPeriodEarnings.toFixed(2)}
            </h3>
            <span className="text-[8px] text-slate-400 block mt-0.5">{totalDeliveries} entregas</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Média / Corrida</span>
            <h3 className="text-base font-black text-white tracking-tight mt-1">
              R$ {avgPerDelivery.toFixed(2)}
            </h3>
            <span className="text-[8px] text-slate-400 block mt-0.5">por entrega</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Melhor Dia</span>
            <h3 className="text-base font-black text-emerald-400 tracking-tight mt-1">
              {bestDay?.dayName || '--'}
            </h3>
            <span className="text-[8px] text-slate-400 block mt-0.5">R$ {(bestDay?.earnings || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 4. PERFORMANCE CHARTS & SWITCHER */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-[2.5rem] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Evolução Diária da Semana
            </h3>
            <p className="text-[10px] text-slate-400">
              Desempenho por dia com alternância de métricas
            </p>
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setChartMetric('earnings')}
              className={`px-2 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-colors ${
                chartMetric === 'earnings' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ganhos
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('count')}
              className={`px-2 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-colors ${
                chartMetric === 'count' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Qtd Entregas
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('avgTime')}
              className={`px-2 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-colors ${
                chartMetric === 'avgTime' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tempo Médio
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={daysData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="dayName" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem' }}
                  formatter={(value: any) => [
                    chartMetric === 'earnings' ? `R$ ${Number(value).toFixed(2)}` : chartMetric === 'count' ? `${value} entregas` : `${value} min`,
                    chartMetric === 'earnings' ? 'Comissão' : chartMetric === 'count' ? 'Entregas' : 'Tempo Médio'
                  ]}
                />
                <Bar 
                  dataKey={chartMetric} 
                  fill={chartMetric === 'earnings' ? '#FF4F18' : chartMetric === 'count' ? '#10b981' : '#6366f1'} 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            ) : (
              <AreaChart data={daysData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="dayName" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartMetric} 
                  stroke="#FF4F18" 
                  fill="#FF4F18" 
                  fillOpacity={0.25} 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. DAILY BREAKDOWN EXPANDABLE LIST */}
      <div className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-white px-1 block">
          Detalhamento por Dia da Semana
        </span>

        <div className="space-y-2">
          {daysData.map(day => {
            const isExpanded = expandedDay === day.dateKey;

            return (
              <div 
                key={day.dateKey}
                className={`bg-slate-900 rounded-3xl border transition-colors overflow-hidden ${
                  day.isToday ? 'border-orange-500/50' : 'border-slate-800'
                }`}
              >
                {/* Day Header Row */}
                <div 
                  onClick={() => setExpandedDay(isExpanded ? null : day.dateKey)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                      day.isToday ? 'bg-brand-primary text-white' : 'bg-slate-950 text-slate-300'
                    }`}>
                      {day.dayName}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{day.fullDayName}</span>
                        {day.isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-orange-950 text-orange-400 border border-orange-800">
                            Hoje
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{day.dateFormatted} • {day.count} {day.count === 1 ? 'entrega' : 'entregas'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-black text-orange-400 block">
                        R$ {day.earnings.toFixed(2)}
                      </span>
                      <span className="text-[8px] text-slate-500 uppercase">
                        Ganhos
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Day Orders */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-850 bg-slate-950/60 p-4 space-y-2"
                    >
                      {day.orders.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">
                          Nenhuma entrega realizada neste dia.
                        </p>
                      ) : (
                        day.orders.map((order, idx) => (
                          <div 
                            key={order.id || idx}
                            onClick={() => onSelectOrderSummary(order)}
                            className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80 flex items-center justify-between hover:border-orange-500/30 transition-colors cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono font-bold text-slate-400">
                                  #{formatOrderNumber(order)}
                                </span>
                                <span className="text-xs font-bold text-slate-200">
                                  {order.customerName || 'Cliente'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">
                                {order.customerAddress || 'Endereço'}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-orange-400 block">
                                + R$ {(order.courierEarnings || 0).toFixed(2)}
                              </span>
                              <span className="text-[8px] text-slate-500">
                                {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
