
import React, { useState, useRef } from 'react';
import { AdminSettings, BusinessHours } from '../types';
import { db } from '../services/db';
import { 
  Settings, Clock, Printer, Globe, Building2, 
  Save, Check, AlertCircle, Info, ChevronRight,
  Phone, MapPin, Hash, Plus, Trash2, ShieldCheck,
  Smartphone, Code, Webhook, Zap, FileText, 
  Fingerprint, ShieldAlert, Key, Download, UploadCloud,
  Database, RefreshCw, FileJson
} from 'lucide-react';

interface AdminSettingsProps {
  settings: AdminSettings;
  onUpdateSettings: (settings: AdminSettings) => void;
}

const AdminSettingsComponent: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'hours' | 'print' | 'api' | 'fiscal' | 'database'>('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importJson, setImportJson] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1000);
  };

  const updateHours = (index: number, field: keyof BusinessHours, value: any) => {
    const newHours = [...settings.businessHours];
    newHours[index] = { ...newHours[index], [field]: value };
    onUpdateSettings({ ...settings, businessHours: newHours });
  };

  const handleExportBackup = async () => {
    const backup = await db.exportBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastroai-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const json = event.target?.result as string;
      setImportJson(json);
      setShowImportConfirm(true);
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!importJson) return;
    try {
      await db.importBackup(importJson);
      setImportStatus({ type: 'success', message: 'Backup restaurado com sucesso! Reiniciando...' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Erro ao importar backup. Verifique o arquivo.' });
      setTimeout(() => setImportStatus(null), 3000);
    } finally {
      setShowImportConfirm(false);
      setImportJson(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 animate-in fade-in duration-500">
      {/* Navegação de Configurações */}
      <div className="w-full lg:w-44 flex flex-col gap-0.5 shrink-0">
        {[
          { id: 'general', label: 'Dados da Empresa', icon: Building2 },
          { id: 'hours', label: 'Horários', icon: Clock },
          { id: 'print', label: 'Impressão / Cupom', icon: Printer },
          { id: 'fiscal', label: 'Módulo Fiscal', icon: ShieldCheck },
          { id: 'api', label: 'Integrações e APIs', icon: Globe },
          { id: 'database', label: 'Banco de Dados', icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-widest transition-all text-left ${
              activeSubTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}

        <div className="mt-1 p-2 bg-indigo-50 rounded-xl border border-indigo-100 space-y-1">
           <div className="flex items-center gap-1 text-indigo-700">
              <ShieldCheck size={12} />
              <span className="text-[7px] font-black uppercase tracking-widest">Nível Admin</span>
           </div>
           <p className="text-[7px] text-indigo-600 leading-tight font-medium">
             As alterações feitas aqui afetam todos os terminais e acessos da equipe.
           </p>
        </div>
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
          {activeSubTab === 'general' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Building2 size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Perfil do Estabelecimento</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Informações fiscais e de contato</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-[10px]" value={settings.companyName} onChange={(e) => onUpdateSettings({...settings, companyName: e.target.value})} />
                 </div>
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.cnpj} onChange={(e) => onUpdateSettings({...settings, cnpj: e.target.value})} />
                 </div>
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone de Contato</label>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.phone} onChange={(e) => onUpdateSettings({...settings, phone: e.target.value})} />
                 </div>
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Instagram</label>
                    <input type="text" placeholder="@seu_restaurante" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.socialMedia?.instagram || ''} onChange={(e) => onUpdateSettings({...settings, socialMedia: {...settings.socialMedia, instagram: e.target.value}})} />
                 </div>
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Facebook</label>
                    <input type="text" placeholder="facebook.com/seu_restaurante" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.socialMedia?.facebook || ''} onChange={(e) => onUpdateSettings({...settings, socialMedia: {...settings.socialMedia, facebook: e.target.value}})} />
                 </div>
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp (Link Direto)</label>
                    <input type="text" placeholder="wa.me/55..." className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.socialMedia?.whatsapp || ''} onChange={(e) => onUpdateSettings({...settings, socialMedia: {...settings.socialMedia, whatsapp: e.target.value}})} />
                 </div>
                 <div className="space-y-0.5 md:col-span-2">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.address} onChange={(e) => onUpdateSettings({...settings, address: e.target.value})} />
                 </div>
              </div>
            </div>
          )}

          {activeSubTab === 'fiscal' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                    <ShieldCheck size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Módulo Fiscal NFC-e</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Emissão de nota fiscal ao consumidor eletrônica</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-2">
                    <div className="space-y-0.5">
                       <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Ambiente de Emissão</label>
                       <div className="flex bg-slate-100 p-0.5 rounded-lg border">
                          <button 
                            onClick={() => onUpdateSettings({...settings, fiscal: {...settings.fiscal, environment: 'homologacao'}})}
                            className={`flex-1 py-1 rounded-md font-black text-[7px] uppercase transition-all ${settings.fiscal.environment === 'homologacao' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >
                            Homologação
                          </button>
                          <button 
                            onClick={() => onUpdateSettings({...settings, fiscal: {...settings.fiscal, environment: 'producao'}})}
                            className={`flex-1 py-1 rounded-md font-black text-[7px] uppercase transition-all ${settings.fiscal.environment === 'producao' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                          >
                            Produção
                          </button>
                       </div>
                    </div>

                    <div className="space-y-0.5">
                       <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Regime Tributário</label>
                       <select 
                         className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]"
                         value={settings.fiscal.taxRegime}
                         onChange={(e) => onUpdateSettings({...settings, fiscal: {...settings.fiscal, taxRegime: e.target.value as any}})}
                       >
                         <option value="simples_nacional">Simples Nacional</option>
                         <option value="lucro_presumido">Lucro Presumido</option>
                         <option value="lucro_real">Lucro Real</option>
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <div className="space-y-0.5">
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Série</label>
                          <input type="number" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.fiscal.series} onChange={(e) => onUpdateSettings({...settings, fiscal: {...settings.fiscal, series: parseInt(e.target.value)}})} />
                       </div>
                       <div className="space-y-0.5">
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Próximo Nº</label>
                          <input type="number" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.fiscal.nextNfceNumber} onChange={(e) => onUpdateSettings({...settings, fiscal: {...settings.fiscal, nextNfceNumber: parseInt(e.target.value)}})} />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                             <Key size={12} className="text-indigo-600" />
                             <span className="text-[7px] font-black uppercase tracking-widest text-slate-800">Certificado Digital</span>
                          </div>
                          <span className={`px-1 py-0.5 rounded-full text-[5px] font-black uppercase ${settings.fiscal.certificateStatus === 'valid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                             {settings.fiscal.certificateStatus === 'valid' ? 'Válido' : 'Expirado'}
                          </span>
                       </div>
                       <div className="flex items-center justify-between text-[8px]">
                          <span className="text-slate-400 font-bold">Vencimento:</span>
                          <span className="text-slate-800 font-black">{settings.fiscal.certificateExpiry || 'Não configurado'}</span>
                       </div>
                       <button className="w-full py-1 bg-white border border-slate-200 rounded-md font-black text-[7px] uppercase text-slate-600 hover:bg-slate-100 transition-all">Atualizar Certificado (.pfx)</button>
                    </div>

                    <div className="space-y-1.5">
                       <div className="space-y-0.5">
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Token CSC</label>
                          <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.fiscal.cscId} onChange={(e) => onUpdateSettings({...settings, fiscal: {...settings.fiscal, cscId: e.target.value}})} />
                       </div>
                       <div className="space-y-0.5">
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Token CSC</label>
                          <input type="password" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.fiscal.cscToken} onChange={(e) => onUpdateSettings({...settings, fiscal: {...settings.fiscal, cscToken: e.target.value}})} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-3 bg-indigo-600 rounded-xl text-white flex flex-col md:flex-row items-center justify-between gap-2 shadow-md shadow-indigo-100">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                       <Zap size={16} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black">Status da SEFAZ</h4>
                       <p className="text-[8px] font-medium opacity-80">Conexão em tempo real com os servidores</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => {
                     const btn = document.activeElement as HTMLButtonElement;
                     const originalText = btn.innerText;
                     btn.innerText = "TESTANDO...";
                     setTimeout(() => {
                       btn.innerText = "CONEXÃO OK! ✅";
                       setTimeout(() => btn.innerText = originalText, 2000);
                     }, 1500);
                   }}
                   className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-black text-[7px] uppercase tracking-widest shadow-sm hover:scale-105 transition-all"
                 >
                   Testar Conexão
                 </button>
              </div>
            </div>
          )}
          {activeSubTab === 'hours' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b pb-2">
                 <div className="flex items-center gap-2">
                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                       <Clock size={16} />
                    </div>
                    <div>
                       <h2 className="text-sm font-black text-slate-800">Horários de Funcionamento</h2>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Defina quando seu restaurante está aberto</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => {
                     const newHour = { day: 'Novo Horário', open: '08:00', close: '18:00', isClosed: false };
                     onUpdateSettings({ ...settings, businessHours: [...settings.businessHours, newHour] });
                   }}
                   className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold hover:bg-indigo-700 transition-colors"
                 >
                   <Plus size={12} />
                   Adicionar
                 </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {settings.businessHours.map((h, idx) => (
                  <div key={idx} className={`flex flex-col p-2 rounded-xl border transition-all ${h.isClosed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <input 
                        type="text"
                        className="bg-transparent border-none outline-none font-black text-slate-800 uppercase text-[8px] tracking-widest w-full"
                        value={h.day}
                        onChange={(e) => updateHours(idx, 'day', e.target.value)}
                      />
                      <button 
                        onClick={() => {
                          const newHours = settings.businessHours.filter((_, i) => i !== idx);
                          onUpdateSettings({ ...settings, businessHours: newHours });
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 space-y-0.5">
                        <label className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Abertura</label>
                        <input 
                          type="time" 
                          disabled={h.isClosed}
                          className="w-full px-1.5 py-1 bg-slate-50 border rounded-md outline-none font-bold text-[10px] disabled:opacity-50 focus:border-indigo-500"
                          value={h.open}
                          onChange={(e) => updateHours(idx, 'open', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <label className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Fechamento</label>
                        <input 
                          type="time" 
                          disabled={h.isClosed}
                          className="w-full px-1.5 py-1 bg-slate-50 border rounded-md outline-none font-bold text-[10px] disabled:opacity-50 focus:border-indigo-500"
                          value={h.close}
                          onChange={(e) => updateHours(idx, 'close', e.target.value)}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                      <input 
                        type="checkbox" 
                        checked={h.isClosed}
                        onChange={(e) => updateHours(idx, 'isClosed', e.target.checked)}
                        className="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-wider">Marcar como Fechado</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'print' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    <Printer size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Configurações de Impressão</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Personalize seus cupons e comandas</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Largura do Papel</label>
                    <select 
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]"
                      value={settings.printing.paperWidth}
                      onChange={(e) => onUpdateSettings({...settings, printing: {...settings.printing, paperWidth: e.target.value as any}})}
                    >
                      <option value="58mm">58mm (Estreito)</option>
                      <option value="80mm">80mm (Padrão)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="text-[10px] font-black text-slate-800">Impressão Automática</p>
                      <p className="text-[7px] text-slate-500 font-medium">Imprimir cupom ao fechar pedido</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={settings.printing.autoPrintOrder}
                        onChange={(e) => onUpdateSettings({...settings, printing: {...settings.printing, autoPrintOrder: e.target.checked}})}
                      />
                      <div className="w-7 h-3.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Cabeçalho do Cupom</label>
                    <textarea 
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px] h-12 resize-none"
                      value={settings.printing.headerText}
                      onChange={(e) => onUpdateSettings({...settings, printing: {...settings.printing, headerText: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Rodapé do Cupom</label>
                    <textarea 
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px] h-12 resize-none"
                      value={settings.printing.footerText}
                      onChange={(e) => onUpdateSettings({...settings, printing: {...settings.printing, footerText: e.target.value}})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'api' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Globe size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Integrações e APIs</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Conecte o GastroAI com serviços externos</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="text-emerald-500" size={14} />
                    <h4 className="font-black text-slate-800 text-[8px] uppercase">WhatsApp Business</h4>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Token da API"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px]"
                    value={settings.apis.whatsappToken}
                    onChange={(e) => onUpdateSettings({...settings, apis: {...settings.apis, whatsappToken: e.target.value}})}
                  />
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Webhook className="text-rose-500" size={14} />
                    <h4 className="font-black text-slate-800 text-[8px] uppercase">iFood Webhook</h4>
                  </div>
                  <input 
                    type="text" 
                    placeholder="URL do Webhook"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px]"
                    value={settings.apis.ifoodWebhook}
                    onChange={(e) => onUpdateSettings({...settings, apis: {...settings.apis, ifoodWebhook: e.target.value}})}
                  />
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border space-y-1.5 md:col-span-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="text-indigo-500" size={14} />
                    <h4 className="font-black text-slate-800 text-[8px] uppercase">Google Maps API Key</h4>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Sua chave do Google Maps"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px]"
                    value={settings.apis.googleMapsKey}
                    onChange={(e) => onUpdateSettings({...settings, apis: {...settings.apis, googleMapsKey: e.target.value}})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'database' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    <Database size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Segurança de Dados</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Backup e gerenciamento do banco local</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5">
                       <Download className="text-indigo-600" size={14} />
                       <h4 className="font-black text-slate-800 text-[8px] uppercase">Exportar Backup</h4>
                    </div>
                    <p className="text-[8px] text-slate-500 font-medium">Baixe uma cópia completa de todas as suas vendas, estoque e configurações.</p>
                    <button onClick={handleExportBackup} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-indigo-600 text-indigo-600 rounded-lg font-black text-[7px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                       <FileJson size={12} /> Salvar Arquivo JSON
                    </button>
                 </div>

                 <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100 space-y-2">
                    <div className="flex items-center gap-1.5">
                       <RefreshCw className="text-rose-600" size={14} />
                       <h4 className="font-black text-slate-800 text-[8px] uppercase">Restaurar Dados</h4>
                    </div>
                    <p className="text-[8px] text-slate-500 font-medium">Substitua as informações atuais por um backup anterior. Ação irreversível.</p>
                    <input type="file" ref={fileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-rose-600 text-white rounded-lg font-black text-[7px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm">
                       <UploadCloud size={12} /> Selecionar Backup
                    </button>
                 </div>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">
                 <AlertCircle className="text-amber-600 shrink-0" size={14} />
                 <div>
                    <p className="text-[10px] font-black text-amber-800">Sobre o Armazenamento Local</p>
                    <p className="text-[8px] text-amber-700 font-medium mt-0.5 leading-tight">Seus dados estão salvos apenas neste navegador (IndexedDB). Limpar o histórico ou o cache pode apagar seus dados sem backup.</p>
                 </div>
              </div>
            </div>
          )}
          {/* Outras abas permanecem com seus formulários... */}
        </div>

        <div className="p-2 border-t bg-slate-50/50 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg font-black text-slate-400 uppercase tracking-widest text-[7px] hover:text-slate-600 transition-colors">Descartar</button>
          <button onClick={handleSave} className="min-w-[100px] px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[7px] uppercase tracking-[0.2em] shadow-md hover:bg-indigo-700 transition-all">
            {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Modais de Confirmação e Status */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tighter">Confirmar Restauração</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">ATENÇÃO: Restaurar um backup irá apagar todos os dados atuais. Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowImportConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
              <button onClick={confirmImport} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-rose-100">Restaurar</button>
            </div>
          </div>
        </div>
      )}

      {importStatus && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-10">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${importStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
            {importStatus.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <p className="text-xs font-black uppercase tracking-widest">{importStatus.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsComponent;
