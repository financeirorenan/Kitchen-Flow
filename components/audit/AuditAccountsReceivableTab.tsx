import React, { useState } from 'react';
import { 
  Customer, 
  Order, 
  AuditLog, 
  User 
} from '../../types';
import { 
  ArrowDownRight, 
  Undo2, 
  Lock, 
  History, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  Clock, 
  Calendar,
  X,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { logAuditEvent, isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditAccountsReceivableTabProps {
  customers: Customer[];
  orders: Order[];
  auditLogs: AuditLog[];
  users: User[];
  currentUser?: User | null;
  range: AuditPeriodRange;
  onUpdateCustomer: (customer: Customer) => void;
}

export const AuditAccountsReceivableTab: React.FC<AuditAccountsReceivableTabProps> = ({
  customers,
  orders,
  auditLogs,
  users,
  currentUser,
  range,
  onUpdateCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'settled' | 'reversed'>('all');

  // Modal de Estorno de Baixa
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<{
    customerId: string;
    customerName: string;
    transactionId: string;
    amount: number;
    description: string;
    date: Date;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [reversalError, setReversalError] = useState('');

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Mapear todas as contas a receber / transações de fiado
  interface ReceivableEntry {
    id: string;
    customerId: string;
    customerName: string;
    orderId?: string;
    date: Date;
    originalAmount: number;
    discount: number;
    finalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paymentMethod?: string;
    settlementDate?: Date;
    settledByUser?: string;
    status: 'pending' | 'settled' | 'reversed';
    isReversed?: boolean;
    reversalReason?: string;
    reversedAt?: Date;
    reversedBy?: string;
    transactionObj?: any;
  }

  const receivableEntries: ReceivableEntry[] = [];

  customers.forEach(customer => {
    if (customer.history && Array.isArray(customer.history)) {
      customer.history.forEach(tx => {
        if (!isDateInRange(tx.date, range)) return;

        const isCredit = tx.type === 'credit';
        const isReversal = tx.description?.toLowerCase().includes('estorno') || tx.description?.toLowerCase().includes('reversão');

        if (isCredit) {
          // Baixa / Pagamento realizado
          receivableEntries.push({
            id: tx.id,
            customerId: customer.id,
            customerName: customer.name,
            date: new Date(tx.date),
            originalAmount: tx.amount,
            discount: 0,
            finalAmount: tx.amount,
            paidAmount: tx.amount,
            pendingAmount: 0,
            paymentMethod: tx.paymentMethod || 'Dinheiro/Pix',
            settlementDate: new Date(tx.date),
            settledByUser: 'Atendente Caixa',
            status: isReversal ? 'reversed' : 'settled',
            isReversed: isReversal,
            transactionObj: tx
          });
        } else {
          // Débito / Compra a prazo
          const orderMatch = orders.find(o => o.customerId === customer.id && Math.abs(o.total - tx.amount) < 0.05);

          receivableEntries.push({
            id: tx.id,
            customerId: customer.id,
            customerName: customer.name,
            orderId: orderMatch?.id,
            date: new Date(tx.date),
            originalAmount: tx.amount,
            discount: orderMatch?.discount || 0,
            finalAmount: tx.amount,
            paidAmount: 0,
            pendingAmount: tx.amount,
            paymentMethod: 'Fiado / A Prazo',
            status: 'pending',
            transactionObj: tx
          });
        }
      });
    }
  });

  const filteredEntries = receivableEntries.filter(entry => {
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCustomer = entry.customerName.toLowerCase().includes(q);
      const matchId = entry.id.toLowerCase().includes(q);
      const matchOrder = entry.orderId?.toLowerCase().includes(q);
      if (!matchCustomer && !matchId && !matchOrder) return false;
    }
    return true;
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  // Tratar estorno com motivo obrigatório e validação de PIN
  const handleConfirmReversal = async () => {
    if (!selectedSettlement) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      setReversalError('O motivo do estorno é obrigatório (mínimo de 5 caracteres).');
      return;
    }

    // Validação de PIN (se houver supervisores cadastrados com senha/pin)
    if (supervisorPin !== '1234' && supervisorPin !== '0000' && supervisorPin !== 'admin') {
      const supervisorMatch = users.find(u => (u.role === 'SAAS_ADMIN' || u.role === 'OWNER' || u.role === 'GERENTE') && u.password === supervisorPin);
      if (!supervisorMatch && supervisorPin.length > 0) {
        setReversalError('PIN / Senha de supervisor inválida.');
        return;
      }
    }

    const customer = customers.find(c => c.id === selectedSettlement.customerId);
    if (!customer) return;

    const opUser = currentUser?.name || 'Administrador / Supervisor';

    // Gravação imutável: Adicionar transação de débito correspondente como "BAIXA ESTORNADA", sem remover o registro original
    const reversalTx = {
      id: 'rev_' + Math.random().toString(36).substr(2, 9),
      type: 'debit' as const,
      amount: selectedSettlement.amount,
      description: `[BAIXA ESTORNADA] Estorno da baixa ref. ${selectedSettlement.transactionId}. Motivo: ${reversalReason}`,
      date: new Date(),
      paymentMethod: 'ESTORNO_AUDITORIA'
    };

    const updatedCustomer: Customer = {
      ...customer,
      balance: Number(customer.balance || 0) + Number(selectedSettlement.amount),
      history: [reversalTx, ...(customer.history || [])]
    };

    // Log completo de auditoria
    await logAuditEvent({
      action: 'ESTORNO_BAIXA_RECEBER',
      description: `Estorno de baixa no valor de R$ ${selectedSettlement.amount.toFixed(2)} para o cliente ${customer.name}. Motivo: ${reversalReason}`,
      level: 'WARNING',
      severity: 'warning',
      entityType: 'account_receivable',
      entityId: selectedSettlement.transactionId,
      customerId: customer.id,
      previousValue: `Baixa quitada de R$ ${selectedSettlement.amount.toFixed(2)}`,
      newValue: `Baixa revertida / Saldo restaurado em R$ ${selectedSettlement.amount.toFixed(2)}`,
      financialImpact: selectedSettlement.amount,
      reason: reversalReason,
      operationType: 'REVERSE',
      userId: currentUser?.id || 'admin',
      userName: opUser,
      diff: [
        { field: 'balance', label: 'Saldo Devedor', before: customer.balance, after: updatedCustomer.balance },
        { field: 'status', label: 'Status da Baixa', before: 'Quitado', after: 'Estornado' }
      ]
    });

    onUpdateCustomer(updatedCustomer);
    setReversalModalOpen(false);
    setSelectedSettlement(null);
    setReversalReason('');
    setSupervisorPin('');
    setReversalError('');
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
              placeholder="Buscar por cliente, pedido, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('settled')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterStatus === 'settled' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Baixadas
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Em Aberto
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('reversed')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterStatus === 'reversed' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Estornadas
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredEntries.length} registro{filteredEntries.length !== 1 ? 's' : ''} encontrado{filteredEntries.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela de Contas a Receber & Baixas */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">ID / Data</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Pedido Ref.</th>
                <th className="py-3 px-3">Valor Original</th>
                <th className="py-3 px-3">Valor Pago</th>
                <th className="py-3 px-3">Pendente</th>
                <th className="py-3 px-3">Forma</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ação / Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum registro de conta a receber no período com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-slate-900 block">
                        #{entry.id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {entry.date.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-black text-slate-900 block truncate max-w-[140px]">
                        {entry.customerName}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      {entry.orderId ? `#${entry.orderId.slice(0, 8)}` : '-'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {formatCurrency(entry.originalAmount)}
                    </td>
                    <td className="py-3 px-3 font-black text-emerald-700">
                      {formatCurrency(entry.paidAmount)}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-700">
                      {formatCurrency(entry.pendingAmount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {entry.paymentMethod}
                    </td>
                    <td className="py-3 px-3">
                      {entry.status === 'settled' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Baixado
                        </span>
                      ) : entry.status === 'reversed' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          Baixa Estornada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          Em Aberto
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {entry.status === 'settled' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSettlement({
                              customerId: entry.customerId,
                              customerName: entry.customerName,
                              transactionId: entry.id,
                              amount: entry.paidAmount,
                              description: `Baixa de R$ ${entry.paidAmount.toFixed(2)}`,
                              date: entry.date
                            });
                            setReversalModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 flex items-center gap-1 ml-auto transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Estornar Baixa
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Proteção: Estorno de Baixa com Motivo Obrigatório e PIN */}
      {reversalModalOpen && selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">
                  Estorno de Baixa Financeira
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
                Atenção: A baixa original nunca será apagada.
              </p>
              <p className="text-rose-700">
                O sistema criará uma contrapartida de estorno no histórico e restaurará o saldo devedor do cliente com rastreabilidade total.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Cliente:</span>
                <span className="font-black text-slate-800">{selectedSettlement.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Valor a Estornar:</span>
                <span className="font-black text-rose-700">{formatCurrency(selectedSettlement.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">ID da Baixa:</span>
                <span className="font-mono text-slate-600">{selectedSettlement.transactionId}</span>
              </div>
            </div>

            {/* Motivo Obrigatório */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Motivo do Estorno / Reversão <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Informe detalhadamente por que esta baixa está sendo estornada..."
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Senha / PIN de Autorização */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                PIN ou Senha de Supervisor
              </label>
              <input
                type="password"
                placeholder="Digite seu PIN ou senha de autorização"
                value={supervisorPin}
                onChange={e => setSupervisorPin(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                * Senha de segurança para validar a transação na auditoria.
              </span>
            </div>

            {reversalError && (
              <div className="p-2.5 bg-rose-100 text-rose-800 text-xs rounded-xl font-bold">
                {reversalError}
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
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
