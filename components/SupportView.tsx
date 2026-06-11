
import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface SupportViewProps {
  restaurantName: string;
  tenantId?: string;
}

const SupportView: React.FC<SupportViewProps> = ({ restaurantName, tenantId }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    if (!tenantId) return;

    const q = query(
      collection(db, 'tickets'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("SupportView onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      await addDoc(collection(db, 'tickets'), {
        subject,
        message,
        priority,
        status: 'open',
        tenantId,
        tenantName: restaurantName,
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid,
        replies: []
      });

      setSubject('');
      setMessage('');
      setPriority('normal');
      setShowNewTicket(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Suporte Técnico</h2>
          <p className="text-slate-500 font-medium">Como podemos ajudar você hoje, {restaurantName}?</p>
        </div>
        <button 
          onClick={() => setShowNewTicket(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <LifeBuoy size={18} />
          Abrir Novo Chamado
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Meus Chamados</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {tickets.length > 0 ? tickets.map(ticket => (
                <div key={ticket.id} className="p-6 hover:bg-slate-50 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-slate-800">{ticket.subject}</h4>
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                      ticket.status === 'open' ? 'bg-amber-50 text-amber-600' :
                      ticket.status === 'responded' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {ticket.status === 'open' ? 'Aberto' :
                       ticket.status === 'responded' ? 'Respondido' : 'Concluído'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{ticket.message}</p>
                  
                  {ticket.replies?.length > 0 && (
                    <div className="mb-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <MessageSquare size={12} /> Resposta do Suporte:
                      </p>
                      <p className="text-xs font-medium text-slate-700">{ticket.replies[ticket.replies.length - 1].message}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock size={12} /> {ticket.createdAt?.toDate?.() ? ticket.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                      <span className="flex items-center gap-1">PRIORIDADE: {ticket.priority}</span>
                    </div>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                      Ver detalhes
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Você não possui chamados abertos.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-indigo-100">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <LifeBuoy size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter">Atendimento VIP</h3>
              <p className="text-indigo-100 text-sm mt-1 font-medium leading-relaxed">Nossa equipe responderá seu chamado em até 1 hora útil.</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">Horário de Atendimento</p>
              <p className="text-xs font-black">Seg - Sáb: 09h às 22h</p>
              <p className="text-xs font-black">Dom: 10h às 18h</p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dúvidas Frequentes</h3>
            <ul className="space-y-3">
              {['Como mudar o preço do app?', 'Configurar impressora termica', 'Relatório de vendas mensal'].map(faq => (
                <li key={faq} className="text-xs font-bold text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors flex items-center gap-2">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                  {faq}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showNewTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h2 className="text-2xl font-black tracking-tighter">Novo Chamado</h2>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Explique seu problema ou dúvida</p>
              </div>
              <button 
                onClick={() => setShowNewTicket(false)} 
                className="p-2 text-white/50 hover:text-white transition-all rounded-full hover:bg-white/10"
              >
                <AlertCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto Curto</label>
                  <input 
                    required 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all" 
                    placeholder="Ex: Impressão cortando" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all appearance-none"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Baixa - Dúvida</option>
                    <option value="normal">Normal - Problema não crítico</option>
                    <option value="high">Alta - Problema operacional</option>
                    <option value="urgent">Urgente - Sistema parado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Detalhada</label>
                  <textarea 
                    required 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all min-h-[150px]" 
                    placeholder="Descreva o que está acontecendo..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <Send size={18} />
                Enviar Solicitação de Ajuda
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportView;
