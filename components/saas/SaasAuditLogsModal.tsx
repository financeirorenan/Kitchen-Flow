import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  X, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Building2, 
  ArrowRight, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  Layers
} from 'lucide-react';
import { SaasAuditLog } from '../../types';

interface SaasAuditLogsModalProps {
  isOpen: boolean;
  logs: SaasAuditLog[];
  onClose: () => void;
}

export const SaasAuditLogsModal: React.FC<SaasAuditLogsModalProps> = ({
  isOpen,
  logs,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.clientName && log.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchCat = selectedCategory === 'all' || log.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [logs, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 md:p-8 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  AUDITORIA & COMPLIANCE
                </span>
                <span className="text-xs text-slate-400 font-bold">• {logs.length} Registros</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5">
                Log de Ações Administrativas SaaS
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-50 p-4 px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por usuário, ação ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filtrar:</span>
            {['all', 'Planos', 'Clientes', 'Financeiro', 'Segurança'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table / Cards */}
        <div className="p-6 overflow-y-auto space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <ShieldCheck size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-black text-slate-700">Nenhum log encontrado</p>
              <p className="text-xs text-slate-400">As próximas ações administrativas serão gravadas e exibidas aqui.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                    <User size={16} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900">{log.userName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs font-bold text-indigo-600">{log.action}</span>
                      {log.clientName && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {log.clientName}
                        </span>
                      )}
                    </div>

                    {(log.previousValue || log.newValue) && (
                      <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 w-fit">
                        {log.previousValue && (
                          <span className="text-rose-600 line-through">Antes: {log.previousValue}</span>
                        )}
                        {log.previousValue && log.newValue && <ArrowRight size={12} className="text-slate-400" />}
                        {log.newValue && (
                          <span className="text-emerald-700 font-bold">Depois: {log.newValue}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-slate-400 shrink-0 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {typeof log.timestamp === 'string' ? log.timestamp : new Date(log.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            🔒 Logs de auditoria são imutáveis e protegidos para segurança jurídica e de governança.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-wider hover:bg-slate-800 cursor-pointer"
          >
            Fechar Auditoria
          </button>
        </div>
      </motion.div>
    </div>
  );
};
