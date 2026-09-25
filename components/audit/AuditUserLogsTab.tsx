import React, { useState } from 'react';
import { 
  AuditLog, 
  User 
} from '../../types';
import { 
  UserCheck, 
  Search, 
  Filter, 
  History, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Tag, 
  Undo2, 
  FileEdit, 
  XCircle 
} from 'lucide-react';
import { isDateInRange, AuditPeriodRange } from '../../services/auditService';

interface AuditUserLogsTabProps {
  auditLogs: AuditLog[];
  users: User[];
  range: AuditPeriodRange;
}

export const AuditUserLogsTab: React.FC<AuditUserLogsTabProps> = ({
  auditLogs,
  users,
  range
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedOperation, setSelectedOperation] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    if (!isDateInRange(log.timestamp, range)) return false;

    if (selectedUser !== 'all' && log.userId !== selectedUser) return false;

    if (selectedOperation !== 'all') {
      const act = (log.action || '').toUpperCase();
      if (selectedOperation === 'CANCEL' && !act.includes('CANCEL')) return false;
      if (selectedOperation === 'DISCOUNT' && !act.includes('DISCOUNT') && !act.includes('DESCONTO')) return false;
      if (selectedOperation === 'REVERSE' && !act.includes('ESTORNO') && !act.includes('REVERS')) return false;
      if (selectedOperation === 'SETTLEMENT' && !act.includes('BAIXA') && !act.includes('SETTLEMENT')) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = log.description?.toLowerCase().includes(q);
      const matchUser = log.userName?.toLowerCase().includes(q);
      const matchReason = log.reason?.toLowerCase().includes(q);
      const matchId = log.id?.toLowerCase().includes(q);
      if (!matchDesc && !matchUser && !matchReason && !matchId) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por usuário, ação, motivo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
            />
          </div>

          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">Todos os Usuários</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>

          <select
            value={selectedOperation}
            onChange={e => setSelectedOperation(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="all">Todas as Operações</option>
            <option value="CANCEL">Cancelamentos</option>
            <option value="DISCOUNT">Descontos</option>
            <option value="REVERSE">Estornos / Reversões</option>
            <option value="SETTLEMENT">Baixas</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredLogs.length} ação{filteredLogs.length !== 1 ? 'ões' : ''} registrada{filteredLogs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela de Logs de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Data / Hora</th>
                <th className="py-3 px-3">Usuário</th>
                <th className="py-3 px-3">Operação</th>
                <th className="py-3 px-3">Descrição da Ação</th>
                <th className="py-3 px-3">Registro Afetado</th>
                <th className="py-3 px-3">Valor Antes → Depois</th>
                <th className="py-3 px-3">Motivo Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum log de atividade de usuário localizado no período.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 block">
                        {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                      <div>{log.userName}</div>
                      <span className="text-[10px] text-slate-400 font-normal uppercase">{log.userRole}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 block w-max">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 max-w-sm">
                      {log.description}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      {log.entityType ? `${log.entityType.toUpperCase()} #${(log.entityId || log.orderId || '').slice(0, 8)}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {log.previousValue || log.newValue ? (
                        <div className="space-y-0.5">
                          {log.previousValue && (
                            <span className="block text-rose-600 line-through truncate max-w-xs">
                              {String(log.previousValue)}
                            </span>
                          )}
                          {log.newValue && (
                            <span className="block text-emerald-700 font-bold truncate max-w-xs">
                              → {String(log.newValue)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.reason ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] block truncate max-w-[160px]">
                          {log.reason}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
