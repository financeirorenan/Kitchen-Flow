import React, { useState } from 'react';
import { 
  Customer, 
  Order, 
  FinancialRecord, 
  Product, 
  AuditLog, 
  User 
} from '../../types';
import { 
  Search, 
  ArrowRight, 
  Users, 
  ShoppingBag, 
  Package, 
  CreditCard, 
  DollarSign, 
  History, 
  UserCheck, 
  FileText,
  Clock
} from 'lucide-react';
import { searchAuditChain, GlobalSearchChainResult } from '../../services/auditService';

interface AuditGlobalSearchTabProps {
  customers: Customer[];
  orders: Order[];
  financialRecords: FinancialRecord[];
  products: Product[];
  auditLogs: AuditLog[];
  users: User[];
  onOpenOrder: (orderId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}

export const AuditGlobalSearchTab: React.FC<AuditGlobalSearchTabProps> = ({
  customers,
  orders,
  financialRecords,
  products,
  auditLogs,
  users,
  onOpenOrder,
  onOpenCustomer
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeResults, setActiveResults] = useState<GlobalSearchChainResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;

    const results = searchAuditChain(searchInput, {
      customers,
      orders,
      financialRecords,
      products,
      auditLogs,
      users
    });

    setActiveResults(results);
    setHasSearched(true);
  };

  return (
    <div className="space-y-5">
      {/* Barra de Busca Universal */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3 text-center max-w-3xl mx-auto">
        <h2 className="text-base font-black text-slate-900">
          Pesquisa Global de Rastreabilidade Unificada
        </h2>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Digite qualquer termo (Nome, CPF/CNPJ, Pedido, Produto, ID de Lançamento ou Usuário) para reconstruir a cadeia de auditoria completa.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ex: João da Silva, 123.456.789-00, #ord-102, X-Burger, Atendente..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-sm transition-all hover:scale-[1.02] active:scale-95"
          >
            Rastrear Cadeia
          </button>
        </form>
      </div>

      {/* Resultados da Cadeia de Rastreabilidade */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Resultados encontrados: {activeResults.length}</span>
            <span className="font-mono">Cadeia: Cliente → Pedido → Itens → Pagamento → Caixa → Baixa → Usuário → Alterações</span>
          </div>

          {activeResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs font-medium">
              Nenhum registro localizado para o termo pesquisado.
            </div>
          ) : (
            activeResults.map((res, rIdx) => (
              <div key={rIdx} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
                {/* Cabeçalho da Cadeia */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
                      {rIdx + 1}
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {res.customer ? res.customer.name : res.order ? `Pedido #${res.order.id.slice(0, 8)}` : 'Registro Auditado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {res.customer && (
                      <button
                        type="button"
                        onClick={() => onOpenCustomer(res.customer!.id)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                      >
                        Ver Cliente
                      </button>
                    )}
                    {res.order && (
                      <button
                        type="button"
                        onClick={() => onOpenOrder(res.order!.id)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold"
                      >
                        Ver Pedido
                      </button>
                    )}
                  </div>
                </div>

                {/* Blocos da Cadeia: Cliente -> Pedido -> Itens -> Pagamento -> Baixa -> Usuário -> Alterações */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* 1. Cliente */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase text-[10px]">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      1. Cliente
                    </div>
                    {res.customer ? (
                      <div>
                        <div className="font-black text-slate-900">{res.customer.name}</div>
                        <div className="text-[11px] text-slate-500">Doc: {res.customer.document || 'Não cadastrado'}</div>
                        <div className="text-[11px] text-slate-500">Saldo: {formatCurrency(res.customer.balance)}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">Cliente não vinculado</div>
                    )}
                  </div>

                  {/* 2. Pedido & Itens */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase text-[10px]">
                      <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                      2. Pedido & Itens
                    </div>
                    {res.order ? (
                      <div>
                        <div className="font-black text-slate-900">
                          #{res.order.id.slice(0, 8)} • {formatCurrency(res.order.total)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {res.order.items?.length || 0} itens ({res.order.type})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(res.order.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">Nenhum pedido direto</div>
                    )}
                  </div>

                  {/* 3. Pagamento & Baixas */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase text-[10px]">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      3. Pagamento / Baixa
                    </div>
                    {res.payments && res.payments.length > 0 ? (
                      res.payments.map((p, pIdx) => (
                        <div key={pIdx} className="text-[11px] text-slate-700 font-medium">
                          {p.method?.toUpperCase()}: <span className="font-bold">{formatCurrency(p.amount)}</span>
                        </div>
                      ))
                    ) : res.order?.paymentStatus === 'paid' ? (
                      <div className="font-bold text-emerald-700">Pago no Caixa</div>
                    ) : (
                      <div className="text-amber-700 font-bold">Pendente / Fiado</div>
                    )}
                  </div>

                  {/* 4. Usuário & Alterações */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase text-[10px]">
                      <History className="w-3.5 h-3.5 text-amber-600" />
                      4. Auditoria & Logs
                    </div>
                    {res.auditLogs && res.auditLogs.length > 0 ? (
                      <div>
                        <div className="font-black text-slate-900">
                          {res.auditLogs.length} logs registrados
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          Último: {res.auditLogs[0].action} ({res.auditLogs[0].userName})
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">Sem alterações pós-criação</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
