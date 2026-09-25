import React, { useState } from 'react';
import { X, PlusCircle, CheckCircle2, DollarSign, Calendar, Tag, Building } from 'lucide-react';
import { Tenant } from '../../types';
import { SaasLedgerItem } from './types';

interface AddLedgerModalProps {
  initialType?: 'receber' | 'pagar';
  tenants: Tenant[];
  onClose: () => void;
  onSave: (item: Partial<SaasLedgerItem>) => void;
}

export const AddLedgerModal: React.FC<AddLedgerModalProps> = ({
  initialType = 'pagar',
  tenants,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<'receber' | 'pagar'>(initialType);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(initialType === 'pagar' ? 'Infraestrutura' : 'Serviços Avulsos');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [supplierName, setSupplierName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [notes, setNotes] = useState('');

  const payableCategories = ['Infraestrutura', 'APIs e Serviços', 'Marketing', 'Equipe e Suporte', 'Impostos', 'Outros'];
  const receivableCategories = ['Planos e Mensalidades', 'Marketplace B2C', 'Setup e Onboarding', 'Serviços Avulsos', 'Consultoria', 'Outros'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    onSave({
      type,
      description: description.trim(),
      category,
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate),
      status,
      paymentMethod,
      supplierName: supplierName.trim() || undefined,
      tenantId: tenantId || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {type === 'pagar' ? 'Nova Despesa / Conta a Pagar' : 'Novo Lançamento de Receita'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cadastre uma movimentação na tesouraria do SaaS
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('receber');
                setCategory('Serviços Avulsos');
              }}
              className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                type === 'receber' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              + Receita
            </button>
            <button
              type="button"
              onClick={() => {
                setType('pagar');
                setCategory('Infraestrutura');
              }}
              className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                type === 'pagar' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              - Despesa
            </button>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Descrição do Lançamento *
            </label>
            <input
              type="text"
              required
              placeholder={type === 'pagar' ? 'Ex: Google Cloud, Servidor VPS, Twilio...' : 'Ex: Taxa de adesão, migração de dados...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Valor */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Vencimento */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Categoria */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {(type === 'pagar' ? payableCategories : receivableCategories).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Status Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'pending' | 'paid')}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="pending">Pendente</option>
                <option value="paid">Já Pago / Liquidado</option>
              </select>
            </div>
          </div>

          {/* Fornecedor ou Lojista Vinculado */}
          {type === 'pagar' ? (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Fornecedor / Beneficiário (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Google Inc, Meta, Hostinger..."
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Lojista Vinculado (Opcional)
              </label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Nenhum (Lançamento Geral)</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                type === 'pagar' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 size={14} /> Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
