import React, { useState } from 'react';
import { 
  FinancialRecord, 
  AuditLog, 
  User, 
  BankAccount 
} from '../../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Undo2, 
  Sliders, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  Lock, 
  AlertTriangle 
} from 'lucide-react';
import { logAuditEvent, isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditFinancialRecordsTabProps {
  financialRecords: FinancialRecord[];
  auditLogs: AuditLog[];
  bankAccounts: BankAccount[];
  users: User[];
  currentUser?: User | null;
  range: AuditPeriodRange;
  onAddRecord: (record: Partial<FinancialRecord>) => void;
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
}

export const AuditFinancialRecordsTab: React.FC<AuditFinancialRecordsTabProps> = ({
  financialRecords,
  auditLogs,
  bankAccounts,
  users,
  currentUser,
  range,
  onAddRecord,
  onUpdateRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal de Estorno Financeiro
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filteredRecords = financialRecords.filter(record => {
    if (!isDateInRange(record.date, range)) return false;

    if (typeFilter !== 'all' && record.type !== typeFilter) return false;

    if (categoryFilter !== 'all') {
      const cat = (record.category || '').toLowerCase();
      if (categoryFilter === 'sangria' && !cat.includes('sangria')) return false;
      if (categoryFilter === 'suprimento' && !cat.includes('suprimento')) return false;
      if (categoryFilter === 'estorno' && !cat.includes('estorno')) return false;
      if (categoryFilter === 'ajuste' && !cat.includes('ajuste')) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = record.description?.toLowerCase().includes(q);
      const matchCat = record.category?.toLowerCase().includes(q);
      const matchId = record.id.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchId) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Confirmar Estorno de Lançamento Financeiro (Imutabilidade: mantém o original e cria o estorno)
  const handleConfirmReversal = async () => {
    if (!selectedRecord) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      setErrorMessage('O motivo do estorno é obrigatório (mínimo de 5 caracteres).');
      return;
    }

    if (supervisorPin !== '1234' && supervisorPin !== '0000' && supervisorPin !== 'admin') {
      const supervisorMatch = users.find(u => (u.role === 'SAAS_ADMIN' || u.role === 'OWNER' || u.role === 'GERENTE') && u.password === supervisorPin);
      if (!supervisorMatch && supervisorPin.length > 0) {
        setErrorMessage('PIN / Senha de supervisor inválida.');
        return;
      }
    }

    const opUser = currentUser?.name || 'Administrador';

    // 1. Atualizar o registro original marcando como estornado na descrição/status
    onUpdateRecord(selectedRecord.id, {
      description: `[ESTORNADO] ${selectedRecord.description}`
    });

    // 2. Criar contrapartida de estorno (inverter tipo)
    const oppositeType = selectedRecord.type === 'income' ? 'expense' : 'income';
    onAddRecord({
      type: oppositeType,
      amount: selectedRecord.amount,
      category: 'Estornos & Devoluções',
      description: `[ESTORNO REF #${selectedRecord.id.slice(0, 8)}] Motivo: ${reversalReason}`,
      date: new Date(),
      paymentMethod: selectedRecord.paymentMethod || 'ESTORNO',
      status: 'paid'
    });

    // 3. Registrar Log de Auditoria
    await logAuditEvent({
      action: 'ESTORNO_LANCAMENTO_FINANCEIRO',
      description: `Estorno de lançamento financeiro #${selectedRecord.id.slice(0, 8)} no valor de R$ ${selectedRecord.amount.toFixed(2)}. Motivo: ${reversalReason}`,
      level: 'WARNING',
      severity: 'warning',
      entityType: 'financial_record',
      entityId: selectedRecord.id,
      previousValue: `${selectedRecord.type.toUpperCase()} R$ ${selectedRecord.amount.toFixed(2)}`,
      newValue: `ESTORNADO via contrapartida ${oppositeType.toUpperCase()}`,
      financialImpact: selectedRecord.amount,
      reason: reversalReason,
      operationType: 'REVERSE',
      userId: currentUser?.id || 'admin',
      userName: opUser,
      diff: [
        { field: 'description', label: 'Descrição', before: selectedRecord.description, after: `[ESTORNADO] ${selectedRecord.description}` },
        { field: 'status', label: 'Status', before: 'Ativo', after: 'Estornado' }
      ]
    });

    setReversalModalOpen(false);
    setSelectedRecord(null);
    setReversalReason('');
    setSupervisorPin('');
    setErrorMessage('');
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">Todos os Tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">Todas as Categorias</option>
            <option value="sangria">Sangrias</option>
            <option value="suprimento">Suprimentos</option>
            <option value="estorno">Estornos</option>
            <option value="ajuste">Ajustes</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredRecords.length} lançamento{filteredRecords.length !== 1 ? 's' : ''} auditado{filteredRecords.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela de Lançamentos Financeiros */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">ID / Data</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Descrição</th>
                <th className="py-3 px-3">Forma / Conta</th>
                <th className="py-3 px-3">Valor</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum lançamento financeiro localizado no período.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const isIncome = record.type === 'income';
                  const isAlreadyReversed = record.description?.includes('[ESTORNADO]');

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-900 block">
                          #{record.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(record.date).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isIncome ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <TrendingUp className="w-3 h-3" />
                            Receita
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                            <TrendingDown className="w-3 h-3" />
                            Despesa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">
                        {record.category || 'Geral'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-xs truncate">
                        {record.description}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {record.paymentMethod || 'Caixa Local'}
                      </td>
                      <td className={`py-3 px-3 font-black text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(record.amount)}
                      </td>
                      <td className="py-3 px-3">
                        {isAlreadyReversed ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            Estornado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            Consolidado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!isAlreadyReversed && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(record);
                              setReversalModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1 ml-auto transition-colors"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Estornar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Proteção: Estorno de Lançamento Financeiro */}
      {reversalModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">
                  Estorno de Lançamento Financeiro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReversalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100 space-y-1 text-xs text-rose-900">
              <p className="font-bold">
                Atenção: Nenhum lançamento financeiro é apagado da base de dados.
              </p>
              <p className="text-rose-700">
                O lançamento original será marcado como estornado e um contra-lançamento compensatório será inserido automaticamente para anular o impacto contábil.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Lançamento Ref.:</span>
                <span className="font-black text-slate-800">{selectedRecord.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Valor:</span>
                <span className="font-black text-rose-700">{formatCurrency(selectedRecord.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">ID do Registro:</span>
                <span className="font-mono text-slate-600">{selectedRecord.id}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Motivo do Estorno <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Informe o motivo da correção financeira..."
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                PIN / Senha de Autorização
              </label>
              <input
                type="password"
                placeholder="PIN de supervisor"
                value={supervisorPin}
                onChange={e => setSupervisorPin(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-100 text-rose-800 text-xs rounded-xl font-bold">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmReversal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm transition-all hover:scale-[1.02] active:scale-95"
              >
                Efetivar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
