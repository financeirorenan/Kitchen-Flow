
import React, { useState, memo } from 'react';
import { 
  ExternalLink, RefreshCcw, Database, 
  Users, ShoppingBag, LayoutDashboard, 
  ArrowUpRight, Share2, Shield, AlertCircle,
  ToggleLeft as Toggle, DollarSign, Wallet, FileText
} from 'lucide-react';
import { Product, Order, Customer, AdminSettings, User } from '../types';

interface PartnerHubProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  externalAppUrl: string;
  settings: AdminSettings;
  onUpdateSettings: (settings: AdminSettings) => void;
  currentUser: User | null;
}

const PartnerHub: React.FC<PartnerHubProps> = memo(({ 
  products, 
  orders, 
  customers, 
  externalAppUrl,
  settings,
  onUpdateSettings,
  currentUser
}) => {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'embedded' | 'status' | 'billing'>('embedded');

  const isSaasAdmin = currentUser?.role === 'SAAS_ADMIN';
  const partnerOrders = orders.filter(o => o.source === 'partner_app');
  const feePerOrder = settings.saasIntegration?.appFeePerOrder || 1.50;
  const totalFees = partnerOrders.length * feePerOrder;
  const totalSales = partnerOrders.reduce((acc, curr) => acc + curr.total, 0);

  const stats = {
    externalOrders: partnerOrders.length,
    syncedProducts: products.filter(p => !!p.externalId).length,
    crmLeads: customers.filter(c => c.crmStatus === 'lead').length,
    totalSyncErrors: orders.filter(o => o.syncStatus === 'error').length,
    accumulatedFees: totalFees,
    totalSales: totalSales
  };

  const handleToggleApp = () => {
    onUpdateSettings({
      ...settings,
      saasIntegration: {
        ...settings.saasIntegration,
        isCustomerAppEnabled: !settings.saasIntegration?.isCustomerAppEnabled
      }
    });
  };

  const handleSync = (type: string) => {
    setSyncing(type);
    setTimeout(() => setSyncing(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 animate-in fade-in duration-500">
      {/* Header Hub */}
      <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Share2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Partner Integration Hub</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Connection & Data Sync</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border">
          <button 
            onClick={() => setActiveView('embedded')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'embedded' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Visualização Integrada
          </button>
          <button 
            onClick={() => setActiveView('status')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'status' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Status da Sincronização
          </button>
          <button 
            onClick={() => setActiveView('billing')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'billing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {isSaasAdmin ? 'Faturamento SaaS' : 'Resumo Financeiro App'}
          </button>
        </div>

        <div className="flex gap-2">
           <button 
            onClick={() => window.open(externalAppUrl, '_blank')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
          >
            <ExternalLink size={14} />
            Abrir em Nova Aba
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="lg:col-span-9 flex flex-col gap-4 overflow-hidden">
          {activeView === 'embedded' ? (
            <div className="flex-1 bg-white rounded-3xl border shadow-inner overflow-hidden relative group">
              {externalAppUrl ? (
                <iframe 
                  src={externalAppUrl} 
                  className="w-full h-full border-none"
                  title="External App Integration"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
                  <Database size={48} className="opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">URL de conexão não configurada</p>
                </div>
              )}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border shadow-lg flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Conexão Ativa</span>
                </div>
              </div>
            </div>
          ) : activeView === 'status' ? (
            <div className="flex-1 bg-white rounded-3xl border p-6 space-y-6 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <ShoppingBag size={20} className="text-rose-500" />
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">LIVE</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.externalOrders}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedidos Externos</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <LayoutDashboard size={20} className="text-indigo-500" />
                      <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">SYCED</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.syncedProducts}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produtos Mapeados</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <Users size={20} className="text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">CRM</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.crmLeads}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novos Leads CRM</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <AlertCircle size={20} className="text-amber-500" />
                      <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">ISSUES</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.totalSyncErrors}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Falhas de Sinc.</p>
                  </div>
               </div>

               <div className="space-y-4">
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Eventos de Integração Recentes</h3>
                 <div className="space-y-2">
                    {orders.filter(o => !!o.externalId).slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 border rounded-xl hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center text-rose-500 shadow-sm">
                            <ShoppingBag size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-800">Pedido Externo #{order.externalId?.slice(-6)}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{order.customerName} • {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${order.syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {order.syncStatus || 'pending'}
                          </span>
                          <ArrowUpRight size={14} className="text-slate-300" />
                        </div>
                      </div>
                    ))}
                    {orders.filter(o => !!o.externalId).length === 0 && (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-slate-400">
                        <Database size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">Nenhuma atividade externa detectada</p>
                      </div>
                    )}
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-3xl border p-6 space-y-8 overflow-y-auto custom-scrollbar">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                      {isSaasAdmin ? 'Relatórios de Cobrança (App Cliente)' : 'Resumo de Vendas do App'}
                    </h3>
                    {isSaasAdmin && (
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Taxa de R$ {feePerOrder.toFixed(2).replace('.', ',')} por pedido recebido via integração</p>
                    )}
                  </div>
                  {isSaasAdmin ? (
                    <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-100 flex items-center gap-4">
                       <Wallet size={24} />
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Acumulado Taxas</p>
                          <p className="text-2xl font-black">{stats.accumulatedFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-100 flex items-center gap-4">
                       <DollarSign size={24} />
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Vendido via App</p>
                          <p className="text-2xl font-black">{stats.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                       </div>
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border space-y-2">
                     <ShoppingBag className="text-indigo-600 mb-2" size={24} />
                     <p className="text-3xl font-black text-slate-800">{stats.externalOrders}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedidos Recebidos</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border space-y-2">
                     <DollarSign className="text-emerald-500 mb-2" size={24} />
                     <p className="text-3xl font-black text-slate-800">{stats.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume de Vendas</p>
                  </div>
                  <div className="p-6 bg-indigo-500 rounded-3xl border border-indigo-600 text-white space-y-2 shadow-lg shadow-indigo-100 cursor-pointer hover:bg-indigo-600 transition-all">
                     <FileText className="mb-2" size={24} />
                     <p className="text-lg font-black uppercase tracking-tighter">Exportar Relatório</p>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Download em PDF/Excel</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Histórico de Pedidos do App</h4>
                  <div className="border rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b">
                        <tr className="text-[9px] font-black uppercase text-slate-400">
                          <th className="p-4">Data</th>
                          <th className="p-4">Pedido ID</th>
                          <th className="p-4">Cliente</th>
                          <th className="p-4">Valor Pedido</th>
                          {isSaasAdmin && <th className="p-4 text-right">Taxa App</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {partnerOrders.map(order => (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-600">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                            <td className="p-4 font-black text-slate-800">#{order.externalId || order.id.slice(-6)}</td>
                            <td className="p-4 font-medium text-slate-600">{order.customerName}</td>
                            <td className="p-4 font-bold text-slate-800">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            {isSaasAdmin && <td className="p-4 text-right font-black text-rose-500">R$ {feePerOrder.toFixed(2).replace('.', ',')}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto custom-scrollbar">
          {isSaasAdmin && (
            <div className="bg-white p-5 rounded-3xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configurações SaaS</h3>
                  <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${settings.saasIntegration?.isCustomerAppEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {settings.saasIntegration?.isCustomerAppEnabled ? 'Ativo' : 'Pausado'}
                  </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${settings.saasIntegration?.isCustomerAppEnabled ? 'bg-emerald-500 shadow-emerald-100' : 'bg-slate-400 shadow-slate-100'} shadow-lg`}>
                        <LayoutDashboard size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Módulo App Cliente</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Visibilidade na Loja</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleApp}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.saasIntegration?.isCustomerAppEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.saasIntegration?.isCustomerAppEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900 p-5 rounded-3xl text-white space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Operational Bridge</h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleSync('menu')}
                disabled={!!syncing}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/5 active:scale-95 group"
              >
                <div className="flex items-center gap-3 text-left">
                  <LayoutDashboard size={18} className="text-indigo-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Sincronizar Menu</p>
                    <p className="text-[8px] font-medium text-white/50">Exportar Imagens & Preços</p>
                  </div>
                </div>
                {syncing === 'menu' ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>

              <button 
                onClick={() => handleSync('reports')}
                disabled={!!syncing}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/5 active:scale-95 group"
              >
                <div className="flex items-center gap-3 text-left">
                  <Database size={18} className="text-rose-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Relatórios CRM</p>
                    <p className="text-[8px] font-medium text-white/50">Push para Base Master</p>
                  </div>
                </div>
                {syncing === 'reports' ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>

              <button 
                onClick={() => handleSync('clients')}
                disabled={!!syncing}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/5 active:scale-95 group"
              >
                <div className="flex items-center gap-3 text-left">
                  <Users size={18} className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Master CRM Sync</p>
                    <p className="text-[8px] font-medium text-white/50">Sincronizar {customers.length} contatos</p>
                  </div>
                </div>
                {syncing === 'clients' ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10">
               <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-indigo-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Segurança & API</span>
               </div>
               <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-[8px] font-mono text-white/40 break-all">ID RESTAURANTE: {localStorage.getItem('tenant_id') || 'GastroAI-MASTER-001'}</p>
                  <p className="text-[8px] font-mono text-white/40 mt-1">STATUS: ENCRYPTED_TUNNEL_ACTIVE</p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
             <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertCircle size={14} /> Dica de Integração
             </h4>
             <p className="text-[9px] font-medium text-indigo-700 leading-relaxed">
                Ao sincronizar o menu, todos os novos produtos serão vinculados automaticamente pelo ExternalID, permitindo que o app parceiro gere pedidos diretamente no seu KDS.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PartnerHub;
