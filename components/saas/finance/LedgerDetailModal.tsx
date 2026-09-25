import React from 'react';
import { X, CheckCircle2, Clock, Calendar, Tag, Building2, Layers, DollarSign, FileText } from 'lucide-react';
import { SaasLedgerItem } from './types';
import { Tenant } from '../../types';

interface LedgerDetailModalProps {
  item: SaasLedgerItem | null;
  tenants: Tenant[];
  onClose: () => void;
  onToggleStatus: (item: SaasLedgerItem) => void;
}

export const LedgerDetailModal: React.FC<LedgerDetailModalProps> = ({
  item,
  tenants,
  onClose,
  onToggleStatus,
}) => {
  if (!item) return null;

  const tenantObj = tenants.find(t => t.id === item.tenantId);

  const createdAtFormatted = item.createdAt instanceof Date 
    ? item.createdAt.toLocaleDateString('pt-BR') 
    : item.createdAt 
      ? new Date(item.createdAt).toLocaleDateString('pt-BR') 
      : 'Não informada';

  const dueDateFormatted = item.dueDate instanceof Date 
    ? item.dueDate.toLocaleDateString('pt-BR') 
    : item.dueDate 
      ? new Date(item.dueDate).toLocaleDateString('pt-BR') 
      : 'Não informada';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                item.type === 'receber' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {item.type === 'receber' ? 'Receita' : 'Despesa'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                item.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {item.status === 'paid' ? 'Liquidado' : 'Pendente'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
              {item.description}
            </h3>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              ID: {item.id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* DETAILS */}
        <div className="p-6 space-y-4 text-xs font-sans">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              Valor da Transação
            </span>
            <span className={`text-xl font-black ${item.type === 'receber' ? 'text-emerald-600' : 'text-rose-600'}`}>
              R$ {Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Categoria</span>
              <span className="font-bold text-slate-800 block">{item.category}</span>
            </div>

            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Forma de Pagamento</span>
              <span className="font-bold text-slate-800 block">{item.paymentMethod || 'Pix'}</span>
            </div>

            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Data de Vencimento</span>
              <span className="font-bold text-slate-800 block">{dueDateFormatted}</span>
            </div>

            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Data de Registro</span>
              <span className="font-bold text-slate-800 block">{createdAtFormatted}</span>
            </div>
          </div>

          {item.supplierName && (
            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Fornecedor / Favorecido</span>
              <span className="font-bold text-slate-800 block">{item.supplierName}</span>
            </div>
          )}

          {tenantObj && (
            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Lojista Vinculado</span>
              <span className="font-bold text-slate-800 block">{tenantObj.name} ({tenantObj.id})</span>
            </div>
          )}

          {item.notes && (
            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Observações</span>
              <p className="text-slate-600 mt-1 leading-relaxed">{item.notes}</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Fechar
          </button>

          <button
            onClick={() => {
              onToggleStatus(item);
              onClose();
            }}
            className={`px-4 py-2 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              item.status === 'paid' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <CheckCircle2 size={14} />
            {item.status === 'paid' ? 'Reverter para Pendente' : 'Marcar como Pago / Baixar'}
          </button>
        </div>
      </div>
    </div>
  );
};
