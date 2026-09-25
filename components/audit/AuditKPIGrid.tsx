import React from 'react';
import { 
  ShoppingBag, 
  XCircle, 
  FileEdit, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowDownRight, 
  Tag, 
  Undo2, 
  TrendingDown, 
  TrendingUp, 
  Sliders, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck 
} from 'lucide-react';
import { AuditMetricsSummary } from '../../services/auditService';

interface AuditKPIGridProps {
  metrics: AuditMetricsSummary;
  onCardClick?: (targetTab: string) => void;
}

export const AuditKPIGrid: React.FC<AuditKPIGridProps> = ({ metrics, onCardClick }) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const cards = [
    {
      id: 'orders',
      tab: 'orders',
      title: 'Pedidos Realizados',
      value: metrics.totalOrdersCount.toString(),
      icon: ShoppingBag,
      color: 'indigo',
      subtext: 'Volume total gerado no período'
    },
    {
      id: 'canceled',
      tab: 'cancellations',
      title: 'Pedidos Cancelados',
      value: metrics.canceledOrdersCount.toString(),
      icon: XCircle,
      color: metrics.canceledOrdersCount > 0 ? 'rose' : 'slate',
      subtext: `${metrics.totalOrdersCount > 0 ? ((metrics.canceledOrdersCount / metrics.totalOrdersCount) * 100).toFixed(1) : 0}% de cancelamento`
    },
    {
      id: 'altered',
      tab: 'orders',
      title: 'Pedidos Alterados',
      value: metrics.alteredOrdersCount.toString(),
      icon: FileEdit,
      color: 'amber',
      subtext: 'Alterações registradas com antes/depois'
    },
    {
      id: 'sold',
      tab: 'dashboard',
      title: 'Total Vendido',
      value: formatCurrency(metrics.totalSold),
      icon: DollarSign,
      color: 'emerald',
      subtext: 'Faturamento bruto aprovado'
    },
    {
      id: 'received',
      tab: 'dashboard',
      title: 'Total Recebido',
      value: formatCurrency(metrics.totalReceived),
      icon: CheckCircle2,
      color: 'emerald',
      subtext: 'Quitado no caixa e operadoras'
    },
    {
      id: 'open',
      tab: 'accounts-receivable',
      title: 'Total em Aberto',
      value: formatCurrency(metrics.totalOpenPending),
      icon: Clock,
      color: metrics.totalOpenPending > 0 ? 'amber' : 'slate',
      subtext: 'Pendente de quitação / fiado'
    },
    {
      id: 'settled',
      tab: 'accounts-receivable',
      title: 'Total Baixado',
      value: formatCurrency(metrics.totalSettled),
      icon: ArrowDownRight,
      color: 'blue',
      subtext: 'Baixas de contas a receber'
    },
    {
      id: 'discounts',
      tab: 'discounts',
      title: 'Total de Descontos',
      value: formatCurrency(metrics.totalDiscounts),
      icon: Tag,
      color: 'purple',
      subtext: 'Descontos comerciais concedidos'
    },
    {
      id: 'reversals',
      tab: 'financial-records',
      title: 'Total de Estornos',
      value: formatCurrency(metrics.totalReversals),
      icon: Undo2,
      color: metrics.totalReversals > 0 ? 'rose' : 'slate',
      subtext: 'Valores revertidos / devolvidos'
    },
    {
      id: 'bleeds',
      tab: 'cash',
      title: 'Total de Sangrias',
      value: formatCurrency(metrics.totalBleeds),
      icon: TrendingDown,
      color: 'slate',
      subtext: 'Retiradas físicas do caixa'
    },
    {
      id: 'supplies',
      tab: 'cash',
      title: 'Total de Suprimentos',
      value: formatCurrency(metrics.totalSupplies),
      icon: TrendingUp,
      color: 'cyan',
      subtext: 'Aportes de troco ou caixa'
    },
    {
      id: 'adjustments',
      tab: 'financial-records',
      title: 'Ajustes Financeiros',
      value: formatCurrency(metrics.totalFinancialAdjustments),
      icon: Sliders,
      color: 'violet',
      subtext: 'Reconciliações e acertos manuais'
    },
    {
      id: 'discrepancies',
      tab: 'inconsistencies',
      title: 'Diferenças Encontradas',
      value: metrics.totalDiscrepancies.toString(),
      icon: AlertTriangle,
      color: metrics.totalDiscrepancies > 0 ? 'rose' : 'emerald',
      subtext: 'Divergências de caixa e regras'
    },
    {
      id: 'suspicious',
      tab: 'inconsistencies',
      title: 'Operações Suspeitas',
      value: metrics.totalSuspiciousOperations.toString(),
      icon: ShieldAlert,
      color: metrics.totalSuspiciousOperations > 0 ? 'amber' : 'emerald',
      subtext: 'Alertas automáticos disparados'
    },
    {
      id: 'user_changes',
      tab: 'user-logs',
      title: 'Alterações por Usuários',
      value: metrics.userChangesCount.toString(),
      icon: UserCheck,
      color: 'indigo',
      subtext: 'Eventos rastreados com autoria'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          iconBg: 'bg-emerald-100 text-emerald-700'
        };
      case 'rose':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-100',
          iconBg: 'bg-rose-100 text-rose-700'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-100',
          iconBg: 'bg-amber-100 text-amber-700'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-100',
          iconBg: 'bg-blue-100 text-blue-700'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-100',
          iconBg: 'bg-purple-100 text-purple-700'
        };
      case 'cyan':
        return {
          bg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
          iconBg: 'bg-cyan-100 text-cyan-700'
        };
      case 'violet':
        return {
          bg: 'bg-violet-50 text-violet-700 border-violet-100',
          iconBg: 'bg-violet-100 text-violet-700'
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
          iconBg: 'bg-indigo-100 text-indigo-700'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200/70',
          iconBg: 'bg-slate-100 text-slate-700'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map(card => {
        const Icon = card.icon;
        const colorClasses = getColorClasses(card.color);

        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.tab)}
            className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 group`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorClasses.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 tracking-tight mb-1">
              {card.value}
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
