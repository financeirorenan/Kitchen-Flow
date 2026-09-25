import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Calendar,
  X,
  Building,
  Server,
  Layers
} from 'lucide-react';
import { SaasLedgerItem } from './types';
import { getDaysDiff } from './financeHelpers';

interface PayablesTabProps {
  saasLedger: SaasLedgerItem[];
  onToggleStatus: (item: SaasLedgerItem) => void;
  onOpenDetails: (item: SaasLedgerItem) => void;
  onOpenAddModal: () => void;
}

export const PayablesTab: React.FC<PayablesTabProps> = ({
  saasLedger,
  onToggleStatus,
  onOpenDetails,
  onOpenAddModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  // Filtrar apenas despesas (type === 'pagar')
  const payables = saasLedger.filter(item => item.type === 'pagar');

  // Top metrics calculations
  const totalToPay = payables
    .filter(i => i.status === 'pending')
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const dueToday = payables
    .filter(i => {
      if (i.status !== 'pending' || !i.dueDate) return false;
      const days = getDaysDiff(i.dueDate);
      return days === 0;
    })
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const dueNext7Days = payables
    .filter(i => {
      if (i.status !== 'pending' || !i.dueDate) return false;
      const days = getDaysDiff(i.dueDate);
      return days >= 0 && days <= 7;
    })
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const overdue = payables
    .filter(i => {
      if (i.status !== 'pending' || !i.dueDate) return false;
      const days = getDaysDiff(i.dueDate);
      return days < 0;
    })
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  // Extract unique categories
  const categories = Array.from(new Set(payables.map(p => p.category).filter(Boolean)));

  // Filtered payables list
  const filteredPayables = payables.filter(item => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDesc = item.description?.toLowerCase().includes(term);
      const matchCat = item.category?.toLowerCase().includes(term);
      const matchSupplier = item.supplierName?.toLowerCase().includes(term);
      if (!matchDesc && !matchCat && !matchSupplier) return false;
    }

    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }

    const daysRemaining = item.dueDate ? getDaysDiff(item.dueDate) : 0;
    const isOverdue = item.status === 'pending' && daysRemaining < 0;

    if (statusFilter === 'pending') return item.status === 'pending';
    if (statusFilter === 'paid') return item.status === 'paid';
    if (statusFilter === 'overdue') return isOverdue;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 4 CARDS NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL A PAGAR */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
            Total a Pagar
          </span>
          <div className="text-2xl lg:text-3xl font-black text-rose-600 font-sans">
            R$ {totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Contas pendentes de liquidação
          </p>
        </div>

        {/* VENCE HOJE */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider block mb-1">
            Vence Hoje
          </span>
          <div className="text-2xl lg:text-3xl font-black text-amber-900 font-sans">
            R$ {dueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Prioridade para pagamento
          </p>
        </div>

        {/* PRÓXIMOS 7 DIAS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">
            Próximos 7 Dias
          </span>
          <div className="text-2xl lg:text-3xl font-black text-slate-800 font-sans">
            R$ {dueNext7Days.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Previsibilidade de desembolso
          </p>
        </div>

        {/* ATRASADO */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider block mb-1">
            Atrasado
          </span>
          <div className="text-2xl lg:text-3xl font-black text-rose-700 font-sans">
            R$ {overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {overdue > 0 ? 'Requer atenção imediata' : 'Nenhuma conta em atraso'}
          </p>
        </div>
      </div>

      {/* BARRA DE COMANDOS, FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar despesa ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-56 sm:w-64"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'pending', 'overdue', 'paid'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' && 'Todas'}
                {st === 'pending' && 'Pendentes'}
                {st === 'overdue' && 'Atrasadas'}
                {st === 'paid' && 'Pagas'}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} /> Nova Despesa
          </button>
        </div>
      </div>

      {/* LISTA LIMPA E DIRETA */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Despesa</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Vencimento</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayables.length > 0 ? (
                filteredPayables.map((item) => {
                  const daysRemaining = item.dueDate ? getDaysDiff(item.dueDate) : 0;
                  const isOverdue = item.status === 'pending' && daysRemaining < 0;
                  const isToday = item.status === 'pending' && daysRemaining === 0;

                  const dueDateFormatted = item.dueDate instanceof Date 
                    ? item.dueDate.toLocaleDateString('pt-BR') 
                    : item.dueDate 
                      ? new Date(item.dueDate).toLocaleDateString('pt-BR') 
                      : 'A definir';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <button
                          onClick={() => onOpenDetails(item)}
                          className="font-black text-sm text-slate-900 hover:text-indigo-600 transition-colors text-left block cursor-pointer"
                        >
                          {item.description}
                        </button>
                        {item.supplierName && (
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            Fornecedor: {item.supplierName}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-600">
                        {dueDateFormatted}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-black text-rose-600 font-sans">
                          R$ {Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {item.status === 'paid' ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-100 flex items-center gap-1 w-fit">
                            🟢 Pago
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase border border-rose-100 flex items-center gap-1 w-fit">
                            🔴 Vencido há {Math.abs(daysRemaining)}d
                          </span>
                        ) : isToday ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-black uppercase border border-amber-100 flex items-center gap-1 w-fit">
                            🟠 Vence hoje
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-800 text-[10px] font-black uppercase border border-yellow-100 flex items-center gap-1 w-fit">
                            🟡 Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDetails(item)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Ver detalhes da despesa"
                          >
                            <Eye size={12} /> Ver
                          </button>

                          {item.status !== 'paid' ? (
                            <button
                              onClick={() => onToggleStatus(item)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
                              title="Marcar conta como paga"
                            >
                              <CheckCircle2 size={12} /> Baixar
                            </button>
                          ) : (
                            <button
                              onClick={() => onToggleStatus(item)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              title="Reabrir despesa"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                    Nenhuma despesa encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
