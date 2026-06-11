
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AdminSettings, BusinessHours, Product, Order, Customer, User, Permission, CardOperator } from '../types';
import { db } from '../services/db';
import { printTestReceipt, pairUSBPrinter } from '../services/printService';
import FiscalSettings from './FiscalSettings';
import PartnerHub from './PartnerHub';
import { 
  Settings, Clock, Printer, Globe, Building2, CreditCard, CheckCircle2,
  Save, Check, AlertCircle, Info, ChevronRight,
  Phone, MapPin, Hash, Plus, Trash2, ShieldCheck,
  Smartphone, Code, Webhook, Zap as ZapIcon, FileText, 
  Fingerprint, ShieldAlert, Key, Download, UploadCloud,
  Database, RefreshCw, FileJson, ExternalLink, Monitor, Loader2,
  Palette, LayoutDashboard, ShoppingBag, Share2, Upload, Camera
} from 'lucide-react';
import { maskPhone, maskCPF, maskCNPJ, maskCEP } from '../utils/masks';
import { compressImage } from '../lib/imageUtils';

interface AdminSettingsProps {
  settings: AdminSettings;
  onUpdateSettings: (settings: AdminSettings) => void;
  onSaveSettings: () => Promise<boolean>;
  allowedModules?: Permission[];
  products?: Product[];
  orders?: Order[];
  customers?: Customer[];
  currentUser?: User | null;
  onClearSalesAndFinance?: () => Promise<void>;
}

const AdminSettingsComponent: React.FC<AdminSettingsProps> = ({ 
  settings, 
  onUpdateSettings, 
  onSaveSettings,
  allowedModules = [],
  products = [],
  orders = [],
  customers = [],
  currentUser,
  onClearSalesAndFinance
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'branding' | 'orders' | 'hours' | 'print' | 'api' | 'fiscal' | 'database' | 'marketplace' | 'payment_methods'>('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearSalesConfirm, setShowClearSalesConfirm] = useState(false);
  const [importJson, setImportJson] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState<string>(localStorage.getItem('paired_usb_name') || '');
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingSuccess, setPairingSuccess] = useState<boolean>(false);

  const handleAdminCEPChange = async (cepValue: string) => {
    const masked = maskCEP(cepValue);
    
    // update state with the masked cep first
    let updatedSettings = { ...settings, cep: masked };
    onUpdateSettings(updatedSettings);

    const cleanCEP = masked.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            const street = data.logradouro || '';
            const neighbor = data.bairro || '';
            const city = data.localidade || '';
            const stateLetter = data.uf || '';
            
            let fullAddress = street;
            if (neighbor) fullAddress += `, ${neighbor}`;
            if (city) fullAddress += ` - ${city}`;
            if (stateLetter) fullAddress += `/${stateLetter}`;
            
            onUpdateSettings({
              ...updatedSettings,
              cep: masked,
              address: fullAddress
            });
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const success = await onSaveSettings();
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('idle');
      console.error('Erro ao salvar configurações.');
    }
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64, 512, 512, 0.7);
        onUpdateSettings({ ...settings, logoUrl: compressed });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error uploading logo:", err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 animate-in fade-in duration-500">
      {/* Navegação de Configurações */}
      <div className="w-full lg:w-48 flex flex-col gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner shrink-0 h-fit">
        {[
          { id: 'general', label: 'Dados da Empresa', icon: Building2 },
          { id: 'branding', label: 'Marca e Cores', icon: Palette },
          { id: 'orders', label: 'Módulo Pedidos', icon: ShoppingBag },
          { id: 'hours', label: 'Horários', icon: Clock },
          { id: 'print', label: 'Impressão / Cupom', icon: Printer },
          { id: 'fiscal', label: 'Módulo Fiscal', icon: ShieldCheck },
          { id: 'payment_methods', label: 'Formas de Pagamento', icon: FileText },
          { id: 'api', label: 'Integrações e APIs', icon: Globe },
          { id: 'marketplace', label: 'Master Hub / Mktplace', icon: Share2, hidden: !allowedModules.includes('marketplace_manage') },
          { id: 'database', label: 'Banco de Dados', icon: Database },
        ].filter(t => !t.hidden).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all text-left w-full ${
              activeSubTab === tab.id 
                ? 'text-white' 
                : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            {activeSubTab === tab.id && (
              <motion.div 
                layoutId="adminSettingsTabPill"
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon size={13} strokeWidth={activeSubTab === tab.id ? 3 : 2} />
              {tab.label}
            </span>
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
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.cnpj || ''} onChange={(e) => onUpdateSettings({...settings, cnpj: maskCNPJ(e.target.value)})} />
                 </div>
                 <div className="space-y-0.5">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone de Contato</label>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.phone || ''} onChange={(e) => onUpdateSettings({...settings, phone: maskPhone(e.target.value)})} />
                 </div>
                 <div className="space-y-0.5">
                    <div className="flex justify-between items-center ml-1 pr-1">
                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CEP</label>
                        {isSearchingCep && (
                           <span className="text-[7px] text-[#FF4F18] font-bold animate-pulse uppercase tracking-wider">Buscando...</span>
                        )}
                    </div>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.cep || ''} onChange={(e) => handleAdminCEPChange(e.target.value)} placeholder="00000-000" />
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
                    <input type="text" placeholder="wa.me/55..." className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.socialMedia?.whatsapp || ''} onChange={(e) => onUpdateSettings({...settings, socialMedia: {...settings.socialMedia, whatsapp: maskPhone(e.target.value)}})} />
                 </div>
                 <div className="space-y-0.5 md:col-span-2">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                    <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.address} onChange={(e) => onUpdateSettings({...settings, address: e.target.value})} />
                 </div>
              </div>
            </div>
          )}

          {activeSubTab === 'branding' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-2 border-b pb-2">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                     <Palette size={16} />
                  </div>
                  <div>
                     <h2 className="text-sm font-black text-slate-800">Marca e Identidade Visual</h2>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Personalize as cores e a logo do seu sistema</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border">
                     <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <LayoutDashboard size={14} className="text-indigo-600" />
                        Cores do Sistema
                     </h3>
                     <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-0.5">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Cor Primária (Dashboard)</label>
                           <div className="flex gap-2">
                              <input type="color" className="w-10 h-8 p-0 border-0 rounded bg-transparent cursor-pointer" value={settings.primaryColor || '#4f46e5'} onChange={(e) => onUpdateSettings({...settings, primaryColor: e.target.value})} />
                              <input type="text" className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.primaryColor || '#4f46e5'} onChange={(e) => onUpdateSettings({...settings, primaryColor: e.target.value})} />
                           </div>
                        </div>
                        <div className="space-y-0.5">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Cor de Destaque</label>
                           <div className="flex gap-2">
                              <input type="color" className="w-10 h-8 p-0 border-0 rounded bg-transparent cursor-pointer" value={settings.accentColor || '#10b981'} onChange={(e) => onUpdateSettings({...settings, accentColor: e.target.value})} />
                              <input type="text" className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px]" value={settings.accentColor || '#10b981'} onChange={(e) => onUpdateSettings({...settings, accentColor: e.target.value})} />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl flex flex-col justify-center items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur flex items-center justify-center relative group overflow-hidden border border-white/10">
                         {settings.logoUrl ? (
                            <img src={settings.logoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         ) : <Building2 size={32} />}
                         <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera size={20} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                         </label>
                      </div>
                      <div className="w-full space-y-2">
                         <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Logo do Painel Lojista</p>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => document.getElementById('logo-upload')?.click()}
                              className="flex-1 px-4 py-2 bg-white text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                               <Upload size={14} /> Alterar Logo
                               <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </button>
                            {settings.logoUrl && (
                               <button 
                                 onClick={() => onUpdateSettings({...settings, logoUrl: ''})}
                                 className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                               >
                                  <Trash2 size={16} />
                               </button>
                            )}
                         </div>
                         <p className="text-[7px] font-medium opacity-70">Esta foto aparece apenas no seu painel administrativo.</p>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeSubTab === 'marketplace' && allowedModules.includes('marketplace_manage') && (
            <div className="animate-in slide-in-from-right-4 duration-300 -m-3 h-[calc(100vh-12rem)] overflow-hidden">
               <PartnerHub 
                 products={products}
                 orders={orders}
                 customers={customers}
                 externalAppUrl="https://ais-pre-sxhhxzv44xcfxjuxxjixtw-101514438395.us-west1.run.app/marketplace"
                 settings={settings}
                 onUpdateSettings={onUpdateSettings}
                 currentUser={currentUser}
               />
            </div>
          )}
          {activeSubTab === 'fiscal' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <FiscalSettings 
                settings={settings} 
                onUpdate={onUpdateSettings} 
              />
            </div>
          )}
          {activeSubTab === 'orders' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-2 border-b pb-2">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                     <ShoppingBag size={16} />
                  </div>
                  <div>
                     <h2 className="text-sm font-black text-slate-800">Fluxo de Pedidos e Marketplace</h2>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Configure como o sistema recebe e processa novos pedidos</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                     <div className="p-5 bg-white border-2 border-indigo-600 rounded-3xl shadow-xl shadow-indigo-50 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                           <ZapIcon size={40} className="text-indigo-600" />
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Aceite Automático</h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Marketplace & Cardápio</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.autoAcceptOrders || false}
                                onChange={(e) => onUpdateSettings({...settings, autoAcceptOrders: e.target.checked})}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                           </label>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                           Ao ativar esta opção, todos os pedidos recebidos via **Marketplace** e **Cardápio Digital** serão aceitos instantaneamente pelo sistema e enviados diretamente para a produção (KDS/Cozinha).
                        </p>
                        {settings.autoAcceptOrders && (
                           <div className="px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 animate-in pulse duration-1000 infinite">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Automação Ativa</span>
                           </div>
                        )}
                     </div>

                     <div className="bg-white p-4 rounded-2xl border space-y-3">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">Tempos Estimados</h4>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Delivery</label>
                              <input 
                                type="text" 
                                placeholder="30-45 min"
                                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                                value={settings.estimatedDeliveryTime || ''}
                                onChange={(e) => onUpdateSettings({...settings, estimatedDeliveryTime: e.target.value})}
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Retirada</label>
                              <input 
                                type="text" 
                                placeholder="15-20 min"
                                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                                value={settings.estimatedPickupTime || ''}
                                onChange={(e) => onUpdateSettings({...settings, estimatedPickupTime: e.target.value})}
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-6 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                     <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-200">
                        <Smartphone size={32} />
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Visualização do Cliente</h4>
                        <p className="text-[9px] font-medium text-slate-500 leading-relaxed px-4">
                           Configurações como o aceite automático melhoram a experiência do cliente, reduzindo o tempo de espera e frustração.
                        </p>
                     </div>
                     <a 
                       href="https://ais-pre-sxhhxzv44xcfxjuxxjixtw-101514438395.us-west1.run.app/marketplace"
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                     >
                        <Share2 size={14} /> Abrir Meu Marketplace
                     </a>
                  </div>
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

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Monitor size={14} />
                       </div>
                       <div>
                          <h4 className="text-[10px] font-black text-slate-800 uppercase">Instalação de Impressora</h4>
                          <p className="text-[7px] text-slate-500 font-medium">Como configurar sua impressora térmica</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => printTestReceipt(settings)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[7px] uppercase tracking-widest shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                    >
                      <Printer size={10} /> Realizar Teste de Impressão
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 space-y-1">
                       <p className="text-[7px] font-black text-indigo-600 uppercase">1. Conexão Física</p>
                       <p className="text-[6px] text-slate-500 leading-tight">Conecte sua impressora via USB, Rede (Ethernet) ou pareie via Bluetooth no seu computador/tablet.</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100 space-y-1">
                       <p className="text-[7px] font-black text-indigo-600 uppercase">2. Driver do Sistema</p>
                       <p className="text-[6px] text-slate-500 leading-tight">Instale o driver do fabricante (ex: Bematech, Elgin, Epson) e certifique-se que ela aparece nas impressoras do Windows/Mac.</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100 space-y-1">
                       <p className="text-[7px] font-black text-indigo-600 uppercase">3. Seleção no Navegador</p>
                       <p className="text-[6px] text-slate-500 leading-tight">Ao clicar em "Imprimir", o navegador abrirá a janela do sistema. Selecione sua impressora térmica na lista de destinos.</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                    <Info size={10} className="text-amber-600" />
                    <p className="text-[6px] text-amber-700 font-medium">Selecione abaixo o modo avançado de comunicação para impressão automatizada.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-250/60 pt-3 pb-3 text-left w-full">
                     <div className="space-y-1">
                       <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">Modo de Transmissão</label>
                       <select 
                         className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px] text-slate-800"
                         value={settings.printing.connectionMode || 'browser'}
                         onChange={(e) => onUpdateSettings({
                           ...settings, 
                           printing: {
                             ...settings.printing, 
                             connectionMode: e.target.value as any
                           }
                         })}
                       >
                         <option value="browser">Navegador (Fila de Impressão de Background)</option>
                         <option value="spool_file">Download de Spool (.print Automático)</option>
                         <option value="webusb">Impressão Direta USB (WebUSB - Sem Drivers)</option>
                         <option value="websocket">Ponte de Impressão Local (WebSocket)</option>
                       </select>
                       <p className="text-[6px] text-slate-500 leading-tight p-0.5">
                         {(!settings.printing.connectionMode || settings.printing.connectionMode === 'browser') && 
                           "Envia a impressão em background via HTML em uma fila de background (spooler), sem abrir novas abas."}
                          {settings.printing.connectionMode === 'spool_file' && 
                            "Gera e baixa um arquivo .print automaticamente para ser capturado por sistemas locais."}
                         {settings.printing.connectionMode === 'webusb' && 
                           "Usa a porta USB para enviar os comandos ESC/POS diretamente à impressora térmica de forma silenciosa."}
                         {settings.printing.connectionMode === 'websocket' && 
                           "Envia o cupom para um aplicativo local rodando no seu computador que gerencia as filas de impressão."}
                       </p>
                     </div>

                     {/* SUB-PAINEL CHAVE PARA WEBUSB */}
                     {(settings.printing.connectionMode === 'webusb') && (
                       <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-2">
                         <div className="flex items-center justify-between">
                           <p className="text-[8px] font-black text-slate-800 uppercase">Pareamento USB Direct</p>
                           <span className={`px-1.5 py-0.5 rounded text-[5px] font-bold uppercase tracking-widest ${pairedDeviceName ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                             {pairedDeviceName ? 'Conectado / Cadastrado' : 'Não Vinculado'}
                           </span>
                         </div>
                         
                         {pairedDeviceName && (
                           <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                             <p className="text-[8px] font-mono text-slate-600 truncate max-w-[200px]">{pairedDeviceName}</p>
                             <button 
                               type="button"
                               onClick={() => {
                                 localStorage.removeItem('paired_usb_vendor_id');
                                 localStorage.removeItem('paired_usb_product_id');
                                 localStorage.removeItem('paired_usb_name');
                                 setPairedDeviceName('');
                               }}
                               className="text-rose-500 font-bold text-[7px] uppercase font-sans cursor-pointer hover:underline"
                             >
                               Remover
                             </button>
                           </div>
                         )}

                         <div className="flex items-center gap-2">
                           <button
                             type="button"
                             onClick={async () => {
                               setPairingError(null);
                               setPairingSuccess(false);
                               const res = await pairUSBPrinter();
                               if (res.success && res.deviceName) {
                                 setPairedDeviceName(res.deviceName);
                                 setPairingSuccess(true);
                               } else if (res.error) {
                                 setPairingError(res.error);
                               }
                             }}
                             className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-bold text-[7px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer text-indigo-700 transition"
                           >
                             <Fingerprint size={10} /> {pairedDeviceName ? 'Alterar Impressora' : 'Selecionar Impressora USB'}
                           </button>
                         </div>

                         {pairingError && (
                           <p className="text-[7.5px] font-bold text-rose-500 leading-tight">⚠️ {pairingError}</p>
                         )}
                         {pairingSuccess && (
                           <p className="text-[7.5px] font-bold text-emerald-600 leading-tight">✅ Impressora pareada com sucesso!</p>
                         )}
                       </div>
                     )}

                     {/* SUB-PAINEL CHAVE PARA WEBSOCKET */}
                     {(settings.printing.connectionMode === 'websocket') && (
                       <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-2">
                         <div className="space-y-0.5">
                           <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">URL do Gateway (WebSocket)</label>
                           <input 
                             type="text" 
                             className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none font-mono font-bold text-[9px]"
                             placeholder="ws://localhost:1221"
                             value={settings.printing.websocketUrl || 'ws://localhost:1221'}
                             onChange={(e) => onUpdateSettings({
                               ...settings, 
                               printing: {
                                 ...settings.printing, 
                                 websocketUrl: e.target.value
                               }
                             })}
                           />
                         </div>
                         
                         <div className="p-1 px-1.5 bg-indigo-50/50 rounded text-[7px] text-indigo-900 border border-indigo-100 flex items-start gap-1">
                           <Info size={10} className="text-indigo-600 shrink-0 mt-0.5" />
                           <p className="leading-relaxed">
                             Crie um arquivo <strong>server.js</strong> no seu computador e inicie o executável para receber comandos de impressão direto da nuvem.
                           </p>
                         </div>
                       </div>
                     )}
                  </div>

                  {/* CODE BRIDGE AUXILIAR DE SPOOLER PRONTO */}
                  {(settings.printing.connectionMode === 'websocket') && (
                    <div className="p-2.5 bg-slate-900 rounded-lg text-slate-300 font-mono text-[7px] space-y-1 w-full text-left">
                      <div className="flex items-center justify-between text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 font-bold text-[6px]">
                        <span>Script para a Ponte Local (Node.js)</span>
                        <span className="text-indigo-400 font-sans">gastroai-print-server.js</span>
                      </div>
                      <pre className="overflow-x-auto max-h-24 p-1 leading-normal text-slate-400 select-all whitespace-pre-wrap font-mono">
{`const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 1221 });
console.log('Spooler GastroAI pronto na porta ws://localhost:1221');

wss.on('connection', ws => {
  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      if (data.action === 'print') {
        const file = 'temp_cupom.txt';
        fs.writeFileSync(file, data.text, 'latin1');
        exec(\`copy /B "\${file}" "ImpressoraTermica"\`);
      }
    } catch(e) { console.error(e); }
  });
});`}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                     <Info size={10} className="text-amber-600" />
                     <p className="text-[6px] text-amber-700 font-medium font-sans">Nota: O modo WebUSB é seguro e funciona direto no navegador secundário.</p>
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

          {activeSubTab === 'payment_methods' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-600" />
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Operadoras de Cartão</h3>
                     </div>
                     <button 
                       onClick={() => {
                         const currentOperators = settings.operators || [];
                         onUpdateSettings({ 
                           ...settings, 
                           operators: [...currentOperators, { id: `op-${Date.now()}`, name: 'Nova Operadora', active: true }] 
                         });
                       }}
                       className="p-1 px-2 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase"
                     >
                        + Adicionar
                     </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                     {(settings.operators || []).map((op, idx) => (
                       <div key={op.id} className={`p-2 bg-white rounded-xl border flex justify-between items-center ${op.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                          <input 
                            className="font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 text-[10px] w-full" 
                            value={op.name}
                            onChange={(e) => {
                              const newOps = [...(settings.operators || [])];
                              newOps[idx] = { ...newOps[idx], name: e.target.value };
                              onUpdateSettings({ ...settings, operators: newOps });
                            }}
                          />
                          <div className="flex items-center gap-1">
                             <button 
                               onClick={() => {
                                 const newOps = [...(settings.operators || [])];
                                 newOps[idx] = { ...newOps[idx], active: !newOps[idx].active };
                                 onUpdateSettings({ ...settings, operators: newOps });
                               }}
                               className={`p-1 rounded-lg ${op.active ? 'text-emerald-600' : 'text-slate-300'}`}
                             >
                                <CheckCircle2 size={12} />
                             </button>
                             <button 
                               onClick={() => {
                                 const newOps = (settings.operators || []).filter(o => o.id !== op.id);
                                 onUpdateSettings({ ...settings, operators: newOps });
                               }}
                               className="p-1 text-rose-500"
                             >
                                <Trash2 size={12} />
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                     <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                        <FileText size={20} />
                     </div>
                     <div>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight">Formas de Pagamento e Taxas</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Gerencie como você recebe e as taxas automáticas</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newMethod = { 
                        id: Math.random().toString(36).substr(2, 9), 
                        name: 'Nova Forma', 
                        type: 'credit' as const, 
                        feePercentage: 0, 
                        active: true 
                      };
                      onUpdateSettings({ ...settings, paymentMethods: [...(settings.paymentMethods || []), newMethod] });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                  >
                    <Plus size={14} /> Adicionar Forma
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {(settings.paymentMethods || []).map((method, idx) => (
                    <div key={method.id} className={`p-4 bg-white border rounded-2xl transition-all ${method.active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60 bg-slate-50'}`}>
                       <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                             <div className="space-y-1">
                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome da Forma</label>
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                                  value={method.name}
                                  onChange={(e) => {
                                    const newMethods = [...settings.paymentMethods];
                                    newMethods[idx] = { ...newMethods[idx], name: e.target.value };
                                    onUpdateSettings({ ...settings, paymentMethods: newMethods });
                                  }}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tipo / Categoria</label>
                                <select 
                                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                                  value={method.type}
                                  onChange={(e) => {
                                    const newMethods = [...settings.paymentMethods];
                                    newMethods[idx] = { ...newMethods[idx], type: e.target.value as any };
                                    onUpdateSettings({ ...settings, paymentMethods: newMethods });
                                  }}
                                >
                                   <option value="cash">Dinheiro / Espécie</option>
                                   <option value="credit">Cartão de Crédito</option>
                                   <option value="debit">Cartão de Débito</option>
                                   <option value="pix">PIX</option>
                                   <option value="voucher">Vale Refeição / Ticket</option>
                                   <option value="account">Conta Cliente</option>
                                   <option value="other">Outros</option>
                                </select>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block ml-1">Taxa Percentual (%)</label>
                                <div className="relative">
                                   <input 
                                     type="text" 
                                     inputMode="decimal"
                                     className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs pr-8"
                                     value={method.feePercentage.toString().replace('.', ',')}
                                     onChange={(e) => {
                                       const val = e.target.value.replace(',', '.');
                                       if (val === '' || !isNaN(Number(val)) || val === '.') {
                                         const numVal = parseFloat(val) || 0;
                                         const newMethods = [...settings.paymentMethods];
                                         newMethods[idx] = { ...newMethods[idx], feePercentage: numVal };
                                         onUpdateSettings({ ...settings, paymentMethods: newMethods });
                                       }
                                     }}
                                   />
                                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block ml-1">Taxa Fixa (R$)</label>
                                <div className="relative">
                                   <input 
                                     type="text" 
                                     inputMode="decimal"
                                     className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs pr-8"
                                     value={(method.fixedFee || 0).toString().replace('.', ',')}
                                     onChange={(e) => {
                                       const val = e.target.value.replace(',', '.');
                                       if (val === '' || !isNaN(Number(val)) || val === '.') {
                                         const numVal = parseFloat(val) || 0;
                                         const newMethods = [...settings.paymentMethods];
                                         newMethods[idx] = { ...newMethods[idx], fixedFee: numVal };
                                         onUpdateSettings({ ...settings, paymentMethods: newMethods });
                                       }
                                     }}
                                   />
                                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                </div>
                             </div>
                             {(method.type === 'credit' || method.type === 'debit' || method.type === 'pix') && (
                               <div className="space-y-1">
                                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block ml-1">Operadora</label>
                                  <select 
                                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs"
                                    value={method.operatorId || ''}
                                    onChange={(e) => {
                                      const newMethods = [...settings.paymentMethods];
                                      newMethods[idx] = { ...newMethods[idx], operatorId: e.target.value };
                                      onUpdateSettings({ ...settings, paymentMethods: newMethods });
                                    }}
                                  >
                                     <option value="">Nenhuma</option>
                                     {(settings.operators || []).filter(op => op.active).map(op => (
                                       <option key={op.id} value={op.id}>{op.name}</option>
                                     ))}
                                  </select>
                               </div>
                             )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 md:pt-4">
                             <button 
                               onClick={() => {
                                 const newMethods = [...settings.paymentMethods];
                                 newMethods[idx] = { ...newMethods[idx], active: !newMethods[idx].active };
                                 onUpdateSettings({ ...settings, paymentMethods: newMethods });
                               }}
                               className={`px-3 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all ${
                                 method.active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                               }`}
                             >
                                {method.active ? 'Ativo' : 'Inativo'}
                             </button>
                             <button 
                               onClick={() => {
                                 const newMethods = settings.paymentMethods.filter((_, i) => i !== idx);
                                 onUpdateSettings({ ...settings, paymentMethods: newMethods });
                               }}
                               className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-600 h-fit">
                     <AlertCircle size={20} />
                  </div>
                  <div>
                     <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Impacto no Financeiro</h4>
                     <p className="text-[10px] font-medium text-amber-800 leading-relaxed mt-1">
                        As taxas configuradas aqui serão descontadas automaticamente nos seus relatórios de faturamento líquido. Isso não altera o valor cobrado do cliente, apenas o cálculo do seu saldo real pós-taxas de processamento.
                     </p>
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

                 <div className="bg-amber-50/40 p-3 rounded-2xl border border-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5">
                       <Trash2 className="text-amber-600" size={14} />
                       <h4 className="font-black text-slate-800 text-[8px] uppercase">Limpar Movimentações</h4>
                    </div>
                    <p className="text-[8px] text-slate-500 font-medium">Zera todo seu histórico de vendas, relatórios de caixa e lançamentos do financeiro. Seu estoque e cardápios NÃO serão mexidos.</p>
                    <button type="button" onClick={() => setShowClearSalesConfirm(true)} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-black text-[7px] uppercase tracking-widest transition-all shadow-sm">
                       <Trash2 size={12} /> Limpar Vendas e Financeiro
                    </button>
                 </div>

                 <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2 md:col-span-2">
                    <div className="flex items-center gap-1.5">
                       <RefreshCw className="text-amber-500" size={14} />
                       <h4 className="font-black text-white text-[8px] uppercase">Resetar para Padrões</h4>
                    </div>
                    <p className="text-[8px] text-slate-400 font-medium">Apaga todos os dados atuais e restaura o cardápio padrão do sistema. Use para limpar o ambiente de testes.</p>
                    <button onClick={() => setShowResetConfirm(true)} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 text-slate-900 rounded-lg font-black text-[7px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-sm">
                       <Database size={12} /> Resetar Banco de Dados
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
          <button 
            onClick={handleSave} 
            disabled={saveStatus !== 'idle'}
            className={`min-w-[100px] px-3 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-[0.2em] shadow-md transition-all flex items-center justify-center gap-1.5 ${
              saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="animate-spin" size={10} />
            ) : saveStatus === 'success' ? (
              <Check size={10} />
            ) : (
              <Save size={10} />
            )}
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

      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tighter">Resetar Banco de Dados?</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Isso irá apagar permanentemente todos os seus pedidos, clientes e produtos customizados, restaurando o cardápio padrão.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
              <button 
                onClick={async () => {
                  try {
                    await db.clearAllData();
                    window.location.reload();
                  } catch (err) {
                    setImportStatus({ type: 'error', message: 'Erro ao resetar banco de dados.' });
                    setShowResetConfirm(false);
                  }
                }} 
                className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-amber-100"
              >
                Confirmar Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearSalesConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center animate-pulse">
              <Trash2 size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tighter">Limpar Vendas e Financeiro?</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                Ação Irreversível. Isso irá apagar todo o histórico de vendas, relatórios de caixas e lançamentos financeiros (contas a pagar e receber).
              </p>
              <p className="text-[10px] font-black text-emerald-600 mt-2 bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                ✓ Seu estoque, ingredientes e cardápio de produtos estão preservados e NÃO serão alterados.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowClearSalesConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase animate-none">Cancelar</button>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    if (onClearSalesAndFinance) {
                      await onClearSalesAndFinance();
                    }
                    setImportStatus({ type: 'success', message: 'Dados de vendas e financeiro limpos com sucesso.' });
                    setShowClearSalesConfirm(false);
                  } catch (err: any) {
                    setImportStatus({ type: 'error', message: 'Erro ao limpar dados: ' + err.message });
                    setShowClearSalesConfirm(false);
                  }
                }} 
                className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-amber-150 transition-all hover:bg-amber-400"
              >
                Confirmar Limpeza
              </button>
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
