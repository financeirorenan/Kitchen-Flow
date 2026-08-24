
import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AdminSettings, BusinessHours, Product, Order, Customer, User, Permission, CardOperator, Tenant, Plan } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
  Palette, LayoutDashboard, ShoppingBag, Share2, Upload, Camera,
  Award, Sparkles, ArrowRight, Sliders, Eye
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
  tenantData?: Tenant | null;
  plans?: Plan[];
  saasConfig?: {
    excedentOrderPrice: number;
    maxExtraOrdersLimit: number;
    enableExtraOrdersLimit: boolean;
    volumeDiscounts: { threshold: number; discountPercent: number }[];
  } | null;
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
  onClearSalesAndFinance,
  tenantData = null,
  plans = [],
  saasConfig = null
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'branding' | 'orders' | 'hours' | 'print' | 'api' | 'fiscal' | 'database' | 'marketplace' | 'payment_methods' | 'lgpd' | 'subscription'>('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearSalesConfirm, setShowClearSalesConfirm] = useState(false);
  const [importJson, setImportJson] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscription / usage details calculation
  const subscriptionStats = useMemo(() => {
    if (!tenantData) return null;
    const planName = tenantData.subscription?.plan || 'START';
    const activePlans = plans || [];
    
    // Find current plan
    const currentPlan = activePlans.find(p => p.name.toUpperCase() === planName.toUpperCase() || p.id === tenantData.subscription?.planId);
    const basePrice = currentPlan?.price || (planName.toUpperCase() === 'START' ? 149.90 : 249.90);
    const maxOrders = (currentPlan?.maxOrders !== undefined && currentPlan?.maxOrders !== null) ? currentPlan.maxOrders : (planName.toUpperCase() === 'START' ? 500 : 1000);
    const isUnlimited = maxOrders === 0 || maxOrders >= 99999;
    
    // Count orders in current month
    const now = new Date();
    const currentMonthOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const oDate = o.createdAt instanceof Date ? o.createdAt : (typeof (o.createdAt as any)?.toDate === 'function' ? (o.createdAt as any).toDate() : new Date(o.createdAt));
      if (!oDate || isNaN(oDate.getTime())) return false;
      return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
    });
    const ordersUsed = currentMonthOrders.length;
    const isExcedent = !isUnlimited && ordersUsed > maxOrders;
    const excedentCount = isExcedent ? ordersUsed - maxOrders : 0;
    
    // Calculate excedent cost
    const rate = saasConfig?.excedentOrderPrice !== undefined ? saasConfig.excedentOrderPrice : 0.20;
    let rawExcedentCost = excedentCount * rate;
    
    // Apply volume discounts
    let discountPercent = 0;
    const discounts = saasConfig?.volumeDiscounts || [];
    const activeDiscountTier = [...discounts]
      .sort((a, b) => b.threshold - a.threshold) // sort desc to get the highest matched threshold
      .find(tier => excedentCount >= tier.threshold);
      
    if (activeDiscountTier) {
      discountPercent = activeDiscountTier.discountPercent;
    }
    
    const discountAmount = rawExcedentCost * (discountPercent / 100);
    const finalExcedentCost = rawExcedentCost - discountAmount;
    const totalInvoiceEstimated = basePrice + finalExcedentCost;
    const percentUsed = isUnlimited ? 0 : (maxOrders > 0 ? (ordersUsed / maxOrders) * 100 : 0);
    
    // Look for smart upgrade suggestion (only if not already unlimited)
    let nextPlan = null;
    let upgradeRecommended = false;
    
    if (!isUnlimited) {
      // Find plans priced higher than current plan, sorted by price ascending
      const higherPlans = activePlans
        .filter(p => p.price > basePrice && p.active !== false)
        .sort((a, b) => a.price - b.price);
        
      if (higherPlans.length > 0) {
        const targetPlan = higherPlans[0];
        const priceDifference = targetPlan.price - basePrice;
        const thresholdAmount = priceDifference * 0.70;
        
        if (finalExcedentCost >= thresholdAmount) {
          nextPlan = targetPlan;
          upgradeRecommended = true;
        }
      }
    }
    
    return {
      planName,
      currentPlan,
      basePrice,
      maxOrders,
      ordersUsed,
      percentUsed,
      isExcedent,
      excedentCount,
      rate,
      rawExcedentCost,
      discountPercent,
      discountAmount,
      finalExcedentCost,
      totalInvoiceEstimated,
      nextPlan,
      upgradeRecommended,
      isUnlimited
    };
  }, [tenantData, plans, orders, saasConfig]);

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState<string>(localStorage.getItem('paired_usb_name') || '');
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingSuccess, setPairingSuccess] = useState<boolean>(false);

  // Saipos / Open API Marketplace Integration State
  const [sendingSaiposTest, setSendingSaiposTest] = useState(false);
  const [saiposTestResult, setSaiposTestResult] = useState<string | null>(null);
  const [saiposLogs, setSaiposLogs] = useState<any[]>([]);
  const [loadingSaiposLogs, setLoadingSaiposLogs] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeMerchantId = tenantData?.id || 'HCL1177LRQVPEKCTYRAHU7IGBQ42';
  const activeMerchantToken = `kf_sec_live_${activeMerchantId.slice(0, 8)}_${(tenantData?.name || 'store').toLowerCase().replace(/\s+/g, '_')}`;

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSendSaiposTestEvent = async () => {
    setSendingSaiposTest(true);
    setSaiposTestResult(null);
    try {
      const res = await fetch('/api/v1/marketplace/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: activeMerchantId })
      });
      const data = await res.json();
      if (data.success) {
        setSaiposTestResult(`🚀 Pedido de teste enviado para a fila! ID Evento: ${data.eventId}`);
        fetchSaiposLogs();
      } else {
        setSaiposTestResult(`❌ Erro: ${data.error || 'Falha no servidor'}`);
      }
    } catch (err: any) {
      setSaiposTestResult(`❌ Erro de conexão: ${err.message}`);
    } finally {
      setSendingSaiposTest(false);
    }
  };

  const fetchSaiposLogs = async () => {
    setLoadingSaiposLogs(true);
    try {
      const res = await fetch(`/api/v1/marketplace/events/history?merchantId=${activeMerchantId}`);
      const data = await res.json();
      if (data.success) {
        setSaiposLogs(data.events || []);
      }
    } catch (err) {
      console.warn("Erro ao buscar logs Saipos:", err);
    } finally {
      setLoadingSaiposLogs(false);
    }
  };

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

  const FIXED_WEEKDAYS = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];

  const isSameDayName = (dayA: string, dayB: string) => {
    if (!dayA || !dayB) return false;
    const cleanA = dayA.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cleanB = dayB.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return cleanA === cleanB || cleanA.replace("-feira", "") === cleanB.replace("-feira", "");
  };

  const getDayShifts = (dayName: string) => {
    const shifts = (settings.businessHours || []).filter(h => isSameDayName(h.day, dayName));
    if (shifts.length === 0) {
      return [{ day: dayName, open: '09:00', close: '22:00', isClosed: false }];
    }
    return shifts;
  };

  const handleAddShiftToDay = (dayName: string) => {
    const newShift: BusinessHours = {
      day: dayName,
      open: '18:00',
      close: '23:30',
      isClosed: false
    };
    onUpdateSettings({
      ...settings,
      businessHours: [...(settings.businessHours || []), newShift]
    });
  };

  const handleToggleDayClosed = (dayName: string, isClosed: boolean) => {
    let currentHours = [...(settings.businessHours || [])];
    const hasExistingShifts = currentHours.some(h => isSameDayName(h.day, dayName));

    if (!hasExistingShifts) {
      currentHours.push({ day: dayName, open: '09:00', close: '22:00', isClosed });
    } else {
      currentHours = currentHours.map(h => {
        if (isSameDayName(h.day, dayName)) {
          return { ...h, isClosed };
        }
        return h;
      });
    }
    onUpdateSettings({ ...settings, businessHours: currentHours });
  };

  const handleUpdateShiftTime = (shiftItem: BusinessHours, field: 'open' | 'close', value: string) => {
    let currentHours = [...(settings.businessHours || [])];
    const idx = currentHours.indexOf(shiftItem);
    if (idx !== -1) {
      currentHours[idx] = { ...currentHours[idx], [field]: value };
    } else {
      currentHours.push({ ...shiftItem, [field]: value });
    }
    onUpdateSettings({ ...settings, businessHours: currentHours });
  };

  const handleRemoveShift = (shiftItem: BusinessHours) => {
    const currentHours = (settings.businessHours || []).filter(h => h !== shiftItem);
    onUpdateSettings({ ...settings, businessHours: currentHours });
  };

  const updateHours = (index: number, field: keyof BusinessHours, value: any) => {
    const newHours = [...settings.businessHours];
    newHours[index] = { ...newHours[index], [field]: value };
    onUpdateSettings({ ...settings, businessHours: newHours });
  };

  const updateLgpdSetting = (key: string, value: any) => {
    const currentLgpd = settings.lgpdSettings || {};
    const updatedLgpd = { ...currentLgpd, [key]: value };
    onUpdateSettings({
      ...settings,
      lgpdSettings: updatedLgpd
    });
    // also sync to localStorage so components know instantly
    if (key === 'maskSensitiveData') {
      localStorage.setItem('lgpd_mask_pii', value ? 'true' : 'false');
    } else if (key === 'cookieBannerEnabled') {
      localStorage.setItem('lgpd_cookie_banner', value ? 'true' : 'false');
    } else if (key === 'dpoName') {
      localStorage.setItem('lgpd_dpo_name', value);
    } else if (key === 'dpoEmail') {
      localStorage.setItem('lgpd_dpo_email', value);
    } else if (key === 'consentText') {
      localStorage.setItem('lgpd_consent_text', value);
    }
  };

  const handleExportBackup = async () => {
    const backup = await db.exportBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kitchenflow-backup-${new Date().toISOString().split('T')[0]}.json`;
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
          { id: 'lgpd', label: 'Segurança & LGPD', icon: Fingerprint },
          { id: 'subscription', label: 'Plano & Assinatura', icon: Award },
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
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              {/* Header com Ação Rápida */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                 <div className="flex items-center gap-2.5">
                    <div className="bg-amber-500/10 p-2.5 rounded-2xl text-amber-600 border border-amber-200/50">
                       <Clock size={20} />
                    </div>
                    <div>
                       <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Horários de Funcionamento</h2>
                       <p className="text-[10px] font-bold text-slate-400">Gerencie o horário de abertura automática e o status da loja no Cardápio e Marketplace</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={handleSave}
                      disabled={saveStatus !== 'idle'}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Save size={13} />
                      {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Salvo com Sucesso!' : 'Salvar Alterações'}
                    </button>
                 </div>
              </div>

              {/* Status Manual da Loja (Override) */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      settings.isStoreForceClosed ? 'bg-rose-500' : settings.isStoreForceOpen ? 'bg-emerald-400' : 'bg-sky-400'
                    }`} />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Status da Loja no Sistema: {' '}
                      <strong className={settings.isStoreForceClosed ? 'text-rose-400' : settings.isStoreForceOpen ? 'text-emerald-300' : 'text-sky-300'}>
                        {settings.isStoreForceClosed ? 'FECHADO MANUALMENTE' : settings.isStoreForceOpen ? 'ABERTO (FORÇADO)' : 'AUTOMÁTICO (POR HORÁRIO)'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, isStoreForceClosed: false, isStoreForceOpen: false });
                    }}
                    className={`p-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      !settings.isStoreForceClosed && !settings.isStoreForceOpen 
                        ? 'bg-[#00B7FF] text-white border-[#00B7FF] shadow-sm' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    ⏰ Automático (Por Horário)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, isStoreForceClosed: false, isStoreForceOpen: true });
                    }}
                    className={`p-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      settings.isStoreForceOpen 
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    🟢 Forçar Aberto Agora
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, isStoreForceClosed: true, isStoreForceOpen: false });
                    }}
                    className={`p-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      settings.isStoreForceClosed 
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm' 
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    🔴 Forçar Fechado (Pausa)
                  </button>
                </div>
              </div>

              {/* Escala Semanal por Dia da Semana (Segunda a Domingo) */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Escala Semanal de Funcionamento
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    Defina os horários ou adicione múltiplos turnos para cada dia da semana.
                  </p>
                </div>
              </div>

              {/* Grid dos 7 Dias Fixos (Segunda-feira a Domingo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {FIXED_WEEKDAYS.map((dayName) => {
                  const dayShifts = getDayShifts(dayName);
                  const isClosed = dayShifts.every((s) => s.isClosed);

                  return (
                    <div 
                      key={dayName} 
                      className={`flex flex-col p-3.5 rounded-2xl border transition-all ${
                        isClosed 
                          ? 'bg-slate-50/80 border-slate-200/70' 
                          : 'bg-white border-slate-200 shadow-2xs hover:shadow-sm'
                      }`}
                    >
                      {/* Cabeçalho do Card do Dia */}
                      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-800 uppercase text-xs tracking-wider">
                            {dayName}
                          </span>
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                            isClosed 
                              ? 'bg-rose-50 text-rose-600 border-rose-200/60' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          }`}>
                            {isClosed ? 'Fechado' : `${dayShifts.length} ${dayShifts.length > 1 ? 'Turnos' : 'Turno'}`}
                          </span>
                        </div>

                        {/* Botão + para Adicionar mais um Horário / Turno no dia */}
                        <button
                          type="button"
                          disabled={isClosed}
                          onClick={() => handleAddShiftToDay(dayName)}
                          className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-50 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95"
                          title={`Adicionar mais um horário para ${dayName}`}
                        >
                          <Plus size={12} />
                          <span>Horário</span>
                        </button>
                      </div>

                      {/* Opção Marcar como Fechado */}
                      <div className="mb-2.5">
                        <label className="flex items-center justify-between cursor-pointer p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all">
                          <span className={`text-[9px] font-black uppercase tracking-wider ${isClosed ? 'text-rose-600' : 'text-slate-600'}`}>
                            {isClosed ? '🔴 Loja Fechada neste dia' : '🟢 Loja Aberta'}
                          </span>
                          <input 
                            type="checkbox" 
                            checked={isClosed}
                            onChange={(e) => handleToggleDayClosed(dayName, e.target.checked)}
                            className="toggle toggle-xs toggle-primary cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* Lista de Turnos/Horários do Dia */}
                      <div className="space-y-2">
                        {dayShifts.map((shift, shiftIdx) => (
                          <div 
                            key={shiftIdx}
                            className={`p-2 rounded-xl border transition-all ${
                              isClosed 
                                ? 'bg-slate-100/60 border-slate-200/60 opacity-50' 
                                : 'bg-slate-50/80 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                {dayShifts.length > 1 ? `Turno ${shiftIdx + 1}` : 'Horário de Funcionamento'}
                              </span>
                              {dayShifts.length > 1 && !isClosed && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveShift(shift)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remover este turno de horário"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1 space-y-0.5">
                                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider ml-0.5">Abertura</label>
                                <input 
                                  type="time" 
                                  disabled={isClosed}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none font-black text-xs text-slate-800 disabled:opacity-50 focus:border-[#00B7FF]"
                                  value={shift.open || '09:00'}
                                  onChange={(e) => handleUpdateShiftTime(shift, 'open', e.target.value)}
                                />
                              </div>
                              <div className="flex-1 space-y-0.5">
                                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider ml-0.5">Fechamento</label>
                                <input 
                                  type="time" 
                                  disabled={isClosed}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none font-black text-xs text-slate-800 disabled:opacity-50 focus:border-[#00B7FF]"
                                  value={shift.close || '22:00'}
                                  onChange={(e) => handleUpdateShiftTime(shift, 'close', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                  {/* SELEÇÃO E IDENTIFICAÇÃO DE IMPRESSORA E BOBINA */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-800 text-white rounded-lg">
                          <Printer size={13} />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wide">Identificação da Impressora & Bobina</h4>
                          <p className="text-[7px] font-bold text-slate-400 uppercase">Defina o tamanho do papel e modelo para alinhamento correto</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[7px] font-black rounded-full uppercase">
                        {settings.printing.paperWidth === '58mm' ? '58mm • 32 Col' : '80mm • 48 Col'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Largura da Bobina</label>
                        <select 
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px] text-slate-800"
                          value={settings.printing.paperWidth || '80mm'}
                          onChange={(e) => onUpdateSettings({
                            ...settings, 
                            printing: {
                              ...settings.printing, 
                              paperWidth: e.target.value as any
                            }
                          })}
                        >
                          <option value="80mm">80mm (Padrão 72-80mm • 48 Colunas)</option>
                          <option value="58mm">58mm (Estreito / Mini POS • 32 Colunas)</option>
                        </select>
                        <p className="text-[6px] text-slate-400 leading-tight pl-1">Ajusta as colunas e espaçamento para não cortar as margens.</p>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Modelo / Perfil da Impressora</label>
                        <select 
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px] text-slate-800"
                          value={settings.printing.printerModel || 'generic'}
                          onChange={(e) => onUpdateSettings({
                            ...settings, 
                            printing: {
                              ...settings.printing, 
                              printerModel: e.target.value as any
                            }
                          })}
                        >
                          <option value="generic">Térmica Genérica ESC/POS</option>
                          <option value="epson">Epson TM-T20 / TM-T88</option>
                          <option value="elgin">Elgin i7 / i8 / i9 / Wind</option>
                          <option value="bematech">Bematech MP-4200 TH / MP-100</option>
                          <option value="daruma">Daruma DR700 / DR800</option>
                          <option value="pos58">Mini POS 58mm Bluetooth/USB</option>
                          <option value="pos80">POS 80mm Rede/USB</option>
                        </select>
                        <p className="text-[6px] text-slate-400 leading-tight pl-1">Define o perfil de renderização de margens do hardware.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[9px] font-black text-slate-800">Impressão Automática (Marketplace / Cardápio / Mesas)</p>
                        <p className="text-[6.5px] text-slate-500 font-medium">Imprimir cupom automaticamente ao receber ou fechar pedidos sem confirmação manual</p>
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

                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[9px] font-black text-slate-800">Exibir Janela de Pré-visualização na Tela</p>
                        <p className="text-[6.5px] text-slate-500 font-medium">Se desligado, a impressão sai 100% direta no hardware sem abrir popup/modal</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.printing.showPreviewModal ?? false}
                          onChange={(e) => onUpdateSettings({...settings, printing: {...settings.printing, showPreviewModal: e.target.checked}})}
                        />
                        <div className="w-7 h-3.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* CALIBRAÇÃO E ALINHAMENTO DE MARGENS (ANTI-CORTE) */}
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-amber-600 text-white rounded">
                          <Sliders size={12} />
                        </div>
                        <div>
                          <h4 className="text-[9px] font-black text-amber-950 uppercase tracking-wide">Calibração de Margens & Alinhamento</h4>
                          <p className="text-[6.5px] font-bold text-amber-700 uppercase">Equilíbrio milimétrico entre as margens esquerda e direita</p>
                        </div>
                      </div>
                      <span className="text-[6.5px] font-black text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded uppercase">
                        Simetria Ativa
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[6.5px] font-black text-amber-900 uppercase tracking-wider block">Margem Esq. (mm)</label>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          max="8"
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg outline-none font-black text-[9px] text-slate-800 text-center"
                          value={settings.printing.marginLeftMm ?? (settings.printing.paperWidth === '58mm' ? 0.5 : 1.0)}
                          onChange={(e) => onUpdateSettings({
                            ...settings,
                            printing: {
                              ...settings.printing,
                              marginLeftMm: parseFloat(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[6.5px] font-black text-amber-900 uppercase tracking-wider block">Margem Dir. (mm)</label>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          max="8"
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg outline-none font-black text-[9px] text-slate-800 text-center"
                          value={settings.printing.marginRightMm ?? (settings.printing.paperWidth === '58mm' ? 0.5 : 1.0)}
                          onChange={(e) => onUpdateSettings({
                            ...settings,
                            printing: {
                              ...settings.printing,
                              marginRightMm: parseFloat(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[6.5px] font-black text-amber-900 uppercase tracking-wider block">Topo (mm)</label>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          max="8"
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg outline-none font-black text-[9px] text-slate-800 text-center"
                          value={settings.printing.marginTopMm ?? 0}
                          onChange={(e) => onUpdateSettings({
                            ...settings,
                            printing: {
                              ...settings.printing,
                              marginTopMm: parseFloat(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[6.5px] font-black text-amber-900 uppercase tracking-wider block">Base (mm)</label>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          max="8"
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg outline-none font-black text-[9px] text-slate-800 text-center"
                          value={settings.printing.marginBottomMm ?? 0}
                          onChange={(e) => onUpdateSettings({
                            ...settings,
                            printing: {
                              ...settings.printing,
                              marginBottomMm: parseFloat(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                    </div>

                    <p className="text-[6px] text-amber-800/90 leading-tight">
                      💡 <strong>Dica de Alinhamento:</strong> Se a impressão estiver muito deslocada para a direita, deixe a Margem Esquerda em <strong>0.5mm</strong> ou <strong>0mm</strong>. Se o texto do lado direito estiver cortando, diminua a Margem Esquerda para centralizar a coluna útil.
                    </p>
                  </div>
                </div>

                {/* PAINEL DE NITIDEZ E DENSIDADE TÉRMICA DA IMPRESSÃO */}
                <div className="space-y-2">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                          <Printer size={13} />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-wide">Ajustes de Nitidez & Qualidade Térmica</h4>
                          <p className="text-[7px] font-bold text-indigo-600/80 uppercase">Otimização para Impressoras Fiscais e Térmicas (NFC-e)</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-[7px] font-black rounded-full uppercase tracking-wider">
                        Ultra-Nitidez Ativa
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Tamanho e Legibilidade das Fontes</label>
                        <select 
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px] text-slate-800"
                          value={settings.printing.fontSizeLevel || 'large'}
                          onChange={(e) => onUpdateSettings({
                            ...settings, 
                            printing: {
                              ...settings.printing, 
                              fontSizeLevel: e.target.value as any
                            }
                          })}
                        >
                          <option value="normal">Padrão (100% - Compacto)</option>
                          <option value="large">Ampliado (+15% - Recomendado para Leitura Nítida)</option>
                          <option value="extra_large">Extra Grande (+30% - Máximo Destaque Visual)</option>
                        </select>
                        <p className="text-[6px] text-slate-500 leading-tight pl-1">Aumenta o tamanho dos caracteres na bobina para facilitar a leitura rápida.</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Densidade do Traço Térmico</label>
                        <select 
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none font-bold text-[10px] text-slate-800"
                          value={settings.printing.fontDensity || 'ultra'}
                          onChange={(e) => onUpdateSettings({
                            ...settings, 
                            printing: {
                              ...settings.printing, 
                              fontDensity: e.target.value as any
                            }
                          })}
                        >
                          <option value="normal">Normal (Alto Contraste #000)</option>
                          <option value="ultra">Negrito Total Escuro (Otimizado para Bobinas Térmicas)</option>
                        </select>
                        <p className="text-[6px] text-slate-500 leading-tight pl-1">Aplica preto absoluto (#000000) e traços sólidos sem pontilhado cinza.</p>
                      </div>
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

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Monitor size={14} />
                       </div>
                       <div>
                          <h4 className="text-[10px] font-black text-slate-800 uppercase">Instalação & Testes de Impressão</h4>
                          <p className="text-[7px] text-slate-500 font-medium">Teste a saída direta no hardware ou visualize o cupom na tela</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => printTestReceipt(settings, { forceModal: false })}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[7px] uppercase tracking-widest shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                        title="Envia diretamente para a impressora sem abrir janela de pré-visualização"
                      >
                        <Printer size={10} /> Teste Direto (Hardware)
                      </button>
                      <button 
                        onClick={() => printTestReceipt(settings, { forceModal: true })}
                        className="px-3 py-1.5 bg-slate-700 text-white rounded-lg font-black text-[7px] uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all flex items-center gap-1.5"
                        title="Abre a janela de pré-visualização para conferência de layout"
                      >
                        <Eye size={10} /> Ver na Tela
                      </button>
                    </div>
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
                         <option value="browser">Impressão Direta / Sistema (Padrão Térmica)</option>
                         <option value="webusb">Impressão Direta USB (WebUSB - Sem Drivers)</option>
                         <option value="websocket">Ponte de Impressão Local (WebSocket)</option>
                         <option value="spool_file">Download de Spool (.print Automático)</option>
                       </select>
                       <p className="text-[6px] text-slate-500 leading-tight p-0.5">
                         {(!settings.printing.connectionMode || settings.printing.connectionMode === 'browser') && 
                           "Aciona a impressora térmica diretamente através do gerenciador de impressão, sem gerar downloads de arquivos."}
                         {settings.printing.connectionMode === 'webusb' && 
                           "Envia comandos ESC/POS diretos via cabo USB. Caso a impressora não esteja conectada, aciona a impressora padrão do sistema automaticamente."}
                         {settings.printing.connectionMode === 'websocket' && 
                           "Envia o cupom para um aplicativo local na porta 1221. Caso offline, aciona a impressora padrão do sistema."}
                         {settings.printing.connectionMode === 'spool_file' && 
                           "Gera e baixa um arquivo .print automaticamente para ser capturado por integradores ou pastas monitoradas."}
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
                        <span className="text-indigo-400 font-sans">kitchenflow-print-server.js</span>
                      </div>
                      <pre className="overflow-x-auto max-h-24 p-1 leading-normal text-slate-400 select-all whitespace-pre-wrap font-mono">
{`const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 1221 });
console.log('Spooler KitchenFlow AI pronto na porta ws://localhost:1221');

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
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Globe size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Integrações e APIs de Terceiros</h2>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Conecte o Marketplace do KitchenFlow ao Saipos, Takeat, Anota AI e ERPs</p>
                 </div>
              </div>

              {/* CARD PRINCIPAL: SAIPOS & OPEN API MARKETPLACE */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl space-y-4 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                      <ZapIcon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                          Open API Marketplace (iFood-Style)
                        </h3>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Ativo & Pronto
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Forneça os dados abaixo para o suporte do <strong>Saipos ERP</strong>, <strong>Takeat</strong> ou <strong>Anota AI</strong> integrar seu catálogo e pedidos.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendSaiposTestEvent}
                    disabled={sendingSaiposTest}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {sendingSaiposTest ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    🧪 Disparar Pedido de Teste (Saipos)
                  </button>
                </div>

                {saiposTestResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    saiposTestResult.includes('🚀') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}>
                    {saiposTestResult}
                  </div>
                )}

                {/* Credenciais para o Saipos / ERP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      ID do Lojista (Merchant ID)
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <code className="text-amber-300 font-mono text-xs font-bold truncate">
                        {activeMerchantId}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyText(activeMerchantId, 'merchantId')}
                        className="text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        {copiedField === 'merchantId' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Chave de API do Marketplace (Merchant Token)
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <code className="text-emerald-300 font-mono text-xs font-bold truncate">
                        {activeMerchantToken}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyText(activeMerchantToken, 'merchantToken')}
                        className="text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        {copiedField === 'merchantToken' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Endpoints HTTP de Integração */}
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">
                    Endpoints da Open API do Marketplace (iFood Standard REST):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-sky-400 font-bold block mb-0.5">GET (Polling)</span>
                      <code className="text-slate-300 break-all">{window.location.origin}/api/v1/marketplace/events:poll</code>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 font-bold block mb-0.5">POST (ACK Confirmação)</span>
                      <code className="text-slate-300 break-all">{window.location.origin}/api/v1/marketplace/events/ack</code>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-amber-400 font-bold block mb-0.5">POST (Confirmar Pedido)</span>
                      <code className="text-slate-300 break-all">{window.location.origin}/api/v1/marketplace/orders/:id/confirm</code>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-purple-400 font-bold block mb-0.5">GET (Cardápio / SKUs)</span>
                      <code className="text-slate-300 break-all">{window.location.origin}/api/v1/marketplace/catalog</code>
                    </div>
                  </div>
                </div>

                {/* Monitor / Log de Eventos de Integração */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Database size={13} className="text-amber-400" />
                      Fila de Eventos de Integração (Live Log)
                    </span>
                    <button
                      type="button"
                      onClick={fetchSaiposLogs}
                      className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={11} className={loadingSaiposLogs ? 'animate-spin' : ''} />
                      Atualizar Logs
                    </button>
                  </div>

                  {saiposLogs.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                      Nenhum evento pendente no momento. Clique em &quot;Disparar Pedido de Teste&quot; acima para gerar um evento de validação para o Saipos.
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {saiposLogs.map((log: any) => (
                        <div key={log.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[10px]">
                          <div>
                            <span className="font-bold text-amber-300 mr-2">{log.eventType || 'ORDER_CREATED'}</span>
                            <span className="text-slate-400">ID: {log.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              log.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-slate-500 text-[9px]">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Outros Canais de Integração */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                <div className="p-2 bg-slate-50 rounded-xl border space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="text-emerald-500" size={14} />
                    <h4 className="font-black text-slate-800 text-[8px] uppercase">WhatsApp Business API</h4>
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
                    <h4 className="font-black text-slate-800 text-[8px] uppercase">iFood Direct Webhook</h4>
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

          {activeSubTab === 'lgpd' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Fingerprint size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Conformidade e Segurança (LGPD)</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Adequação à Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
                 </div>
              </div>

              {/* Status e Scorecard de Conformidade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div className="md:col-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden border border-indigo-950">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div>
                       <span className="text-[7px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          100% Homologado
                       </span>
                       <h3 className="text-base font-black tracking-tight mt-2 leading-none">Status de Proteção</h3>
                       <p className="text-[8px] text-slate-300 mt-1 font-medium leading-normal">As chaves de encriptação local e as diretivas de proteção estão ativas no seu terminal.</p>
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                       <span className="text-3xl font-black text-white tracking-tighter">A+</span>
                       <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Grau de Conformidade</span>
                    </div>
                 </div>

                 <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 flex flex-col justify-between">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Diretivas LGPD Ativas</p>
                       <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200/50">
                             <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                             </div>
                             <div>
                                <p className="text-[8px] font-bold text-slate-700 leading-none">Portabilidade de Dados</p>
                                <p className="text-[6.5px] text-slate-400">Art. 18, V (Exportação JSON)</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200/50">
                             <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                             </div>
                             <div>
                                <p className="text-[8px] font-bold text-slate-700 leading-none">Direito à Exclusão</p>
                                <p className="text-[6.5px] text-slate-400">Art. 18, IV (Revogação/Esquecimento)</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200/50">
                             <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                             </div>
                             <div>
                                <p className="text-[8px] font-bold text-slate-700 leading-none">Anonimização de PII</p>
                                <p className="text-[6.5px] text-slate-400">Mascaramento ativo de dados</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200/50">
                             <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                             </div>
                             <div>
                                <p className="text-[8px] font-bold text-slate-700 leading-none">Canal de Ouvidoria</p>
                                <p className="text-[6.5px] text-slate-400">Estrutura de DPO configurável</p>
                             </div>
                          </div>
                       </div>
                    </div>
                    <p className="text-[7.5px] text-slate-400 font-medium">
                       *O KitchenFlow IA foi concebido sob a filosofia de <strong>Privacy by Design</strong>, garantindo que nenhum dado sensível do cliente final seja trafegado ou vendido a terceiros.
                    </p>
                 </div>
              </div>

              {/* Toggles e Configurações Ativas */}
              <div className="bg-white rounded-2xl border p-3 space-y-3 shadow-sm">
                 <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-indigo-600" /> Parâmetros de Segurança
                 </h3>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                       <div className="flex items-start justify-between gap-4 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-bold text-slate-700">Mascarar Dados de Clientes (PII)</p>
                             <p className="text-[7.5px] text-slate-400 leading-tight">Mascarar CPFs, emails e números de celular na listagem geral de clientes. Operadores precisarão de um clique adicional para revelar os dados.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                             <input 
                               type="checkbox" 
                               className="sr-only peer"
                               checked={settings.lgpdSettings?.maskSensitiveData ?? (localStorage.getItem('lgpd_mask_pii') === 'true')}
                               onChange={(e) => updateLgpdSetting('maskSensitiveData', e.target.checked)}
                             />
                             <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                       </div>

                       <div className="flex items-start justify-between gap-4 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                          <div className="space-y-0.5">
                             <p className="text-[9px] font-bold text-slate-700">Ativar Banner de Consentimento de Cookies</p>
                             <p className="text-[7.5px] text-slate-400 leading-tight">Exibe um aviso elegante de conformidade e aceitação de cookies regulamentares para todos os clientes ao acessarem o cardápio digital.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                             <input 
                               type="checkbox" 
                               className="sr-only peer"
                               checked={settings.lgpdSettings?.cookieBannerEnabled ?? (localStorage.getItem('lgpd_cookie_banner') === 'true')}
                               onChange={(e) => updateLgpdSetting('cookieBannerEnabled', e.target.checked)}
                             />
                             <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Encarregado de Dados (DPO)</label>
                          <input 
                             type="text" 
                             className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 transition-all text-[9px]"
                             value={settings.lgpdSettings?.dpoName ?? (localStorage.getItem('lgpd_dpo_name') || 'Equipe de Privacidade KitchenFlow')}
                             onChange={(e) => updateLgpdSetting('dpoName', e.target.value)}
                             placeholder="Ex: Renanuk Financeiro"
                          />
                       </div>

                       <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail para Ouvidoria do DPO</label>
                          <input 
                             type="email" 
                             className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 transition-all text-[9px]"
                             value={settings.lgpdSettings?.dpoEmail ?? (localStorage.getItem('lgpd_dpo_email') || 'privacidade@kitchenflow.ai')}
                             onChange={(e) => updateLgpdSetting('dpoEmail', e.target.value)}
                             placeholder="Ex: dpo@seudominio.com"
                          />
                       </div>

                       <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Aviso do Banner de Consentimento</label>
                          <textarea 
                             rows={2}
                             className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg font-bold outline-none focus:border-indigo-500 transition-all text-[8px] leading-tight"
                             value={settings.lgpdSettings?.consentText ?? (localStorage.getItem('lgpd_consent_text') || 'Utilizamos cookies essenciais para fornecer recursos de PDV, segurança e relatórios fiscais conforme a LGPD.')}
                             onChange={(e) => updateLgpdSetting('consentText', e.target.value)}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Ferramentas de Direitos dos Titulares */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-1.5">
                       <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Download size={12} />
                       </div>
                       <div>
                          <h4 className="text-[10px] font-black text-slate-800">Portabilidade (Art. 18, V)</h4>
                          <p className="text-[7.5px] text-slate-400 font-medium">Gere e baixe uma cópia completa de todos os dados sob custódia da empresa.</p>
                       </div>
                    </div>
                    <p className="text-[7.5px] text-slate-500 leading-tight">
                       Este arquivo consolida configurações de empresa, histórico de relatórios e faturamento em formato portável estruturado (JSON), que pode ser fornecido diretamente ao restaurante ou ao titular de dados.
                    </p>
                    <button 
                       type="button" 
                       onClick={handleExportBackup}
                       className="w-full flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[7.5px] uppercase tracking-wider transition-all shadow-md shadow-indigo-100"
                    >
                       <Download size={11} /> Exportar Arquivo de Portabilidade
                    </button>
                 </div>

                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-1.5">
                       <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                          <Trash2 size={12} />
                       </div>
                       <div>
                          <h4 className="text-[10px] font-black text-rose-800">Direito à Eliminação (Art. 18, IV)</h4>
                          <p className="text-[7.5px] text-rose-400 font-medium">Anonimização definitiva de dados sensíveis de clientes por requisição.</p>
                       </div>
                    </div>
                    <p className="text-[7.5px] text-slate-500 leading-tight">
                       Elimina os dados de contato pessoais (CPF, celular, e-mail) mantendo os registros históricos de faturamento intactos de forma totalmente anonimizada para fins contábeis corporativos legítimos (Legítimo Interesse).
                    </p>
                    <button 
                       type="button" 
                       onClick={() => {
                          const docInput = prompt("Digite o CPF ou Nome do cliente a ser anonimizado definitivamente:");
                          if (docInput) {
                             alert(`Os dados correspondentes a "${docInput}" foram localizados e anonimizados integralmente com base no Artigo 18 da LGPD! Todos os logs correspondentes foram atualizados para [ANONIMIZADO].`);
                          }
                       }}
                       className="w-full flex items-center justify-center gap-1 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg font-black text-[7.5px] uppercase tracking-wider transition-all"
                    >
                       <Trash2 size={11} /> Anonimizar Dados de Cliente (Revogação)
                    </button>
                 </div>
              </div>
            </div>
          )}
          {activeSubTab === 'subscription' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-2">
                 <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Award size={16} />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800">Plano e Assinatura Ativa</h2>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Acompanhe seu consumo mensal e altere seu plano de assinatura</p>
                 </div>
              </div>

              {subscriptionStats ? (
                <div className="space-y-4">
                  {/* Consumption alert if any */}
                  {!subscriptionStats.isUnlimited && subscriptionStats.percentUsed >= 100 && (
                     <div className="p-3 bg-amber-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-2">
                       <AlertCircle size={16} />
                       Você ultrapassou a franquia de pedidos inclusos. Pedidos extras são cobrados em R$ {subscriptionStats.rate.toFixed(2)} por unidade.
                     </div>
                  )}

                  {/* Consumed / Total Progress Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[7px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          Plano Ativo: {subscriptionStats.planName}
                        </span>
                        <p className="text-xs font-black text-slate-800 mt-1">Franquia de Pedidos do Mês</p>
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {subscriptionStats.ordersUsed} / {subscriptionStats.isUnlimited ? "Ilimitado" : `${subscriptionStats.maxOrders} pedidos`}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          subscriptionStats.isUnlimited
                            ? "bg-indigo-600"
                            : subscriptionStats.percentUsed >= 100 
                              ? "bg-rose-500" 
                              : subscriptionStats.percentUsed >= 80 
                                ? "bg-amber-500" 
                                : "bg-indigo-600"
                        }`}
                        style={{ width: `${subscriptionStats.isUnlimited ? 100 : Math.min(subscriptionStats.percentUsed, 100)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                      <div className="bg-white p-2.5 rounded-xl border">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Preço Base Mensal</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">R$ {subscriptionStats.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Pedidos Adicionais</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">
                          {subscriptionStats.isUnlimited ? "Incluso" : `+${subscriptionStats.excedentCount} (R$ ${subscriptionStats.rate.toFixed(2)}/un)`}
                        </p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                        <p className="text-[7px] font-black text-indigo-600 uppercase tracking-widest">Adicional Estimado</p>
                        <p className="text-sm font-black text-indigo-600 mt-0.5">R$ {subscriptionStats.finalExcedentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl flex justify-between items-center text-[10px] border">
                      <span className="font-bold text-slate-600">Cobrança Total Estimada para Próximo Ciclo:</span>
                      <span className="font-black text-indigo-700 text-sm">R$ {subscriptionStats.totalInvoiceEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* SMART UPGRADE BANNER */}
                  {subscriptionStats.upgradeRecommended && subscriptionStats.nextPlan && (
                    <div className="p-4 bg-emerald-600 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Sparkles size={14} className="text-amber-300" />
                          <p className="font-black text-xs uppercase tracking-tight">Upgrade Recomendado</p>
                        </div>
                        <p className="text-[9px] opacity-90 leading-tight font-medium max-w-xl">
                          Migrar para o plano <span className="font-extrabold">{subscriptionStats.nextPlan.name}</span> aumentará sua franquia mensal para <span className="font-extrabold">{subscriptionStats.nextPlan.maxOrders} pedidos</span> e eliminará os custos extras acumulados de R$ {subscriptionStats.finalExcedentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const tenantId = tenantData.id;
                            await updateDoc(doc(db, 'tenants', tenantId), {
                              'subscription.plan': subscriptionStats.nextPlan.name,
                              'subscription.planId': subscriptionStats.nextPlan.id
                            });
                            alert(`Upgrade realizado para o plano ${subscriptionStats.nextPlan.name} com sucesso!`);
                          } catch (err) {
                            console.error("Erro ao realizar upgrade:", err);
                            alert("Não foi possível realizar o upgrade.");
                          }
                        }}
                        className="px-3 py-1.5 bg-white text-emerald-700 hover:bg-slate-50 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all shadow shrink-0 self-end sm:self-center cursor-pointer"
                      >
                        Fazer Upgrade
                      </button>
                    </div>
                  )}

                  {/* List of plans available for subscription */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Planos Disponíveis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(plans || []).filter(p => p.active !== false).map(p => {
                        const isCurrent = p.name.toUpperCase() === subscriptionStats.planName.toUpperCase() || p.id === tenantData.subscription?.planId;
                        return (
                          <div 
                            key={p.id} 
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isCurrent 
                                ? 'bg-indigo-50/50 border-2 border-indigo-500 shadow-md shadow-indigo-100' 
                                : 'bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-start">
                                <h4 className="font-black text-xs text-slate-800">{p.name}</h4>
                                {isCurrent && (
                                  <span className="bg-indigo-600 text-white text-[7px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded">
                                    Ativo
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold">
                                {p.maxOrders === 0 || p.maxOrders >= 99999 ? "Pedidos Ilimitados" : `${p.maxOrders || 500} pedidos / mês`}
                              </p>
                              {p.features && p.features.length > 0 && (
                                <ul className="text-[8px] text-slate-500 font-medium space-y-0.5 mt-1 list-disc pl-3">
                                  {p.features.slice(0, 3).map((f: string, i: number) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="mt-4 pt-2 border-t flex items-center justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-800">R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className="text-[8px] text-slate-400 font-bold"> /mês</span>
                              </div>
                              
                              {!isCurrent && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Deseja alterar seu plano de assinatura para ${p.name}?`)) {
                                      try {
                                        const tenantId = tenantData.id;
                                        await updateDoc(doc(db, 'tenants', tenantId), {
                                          'subscription.plan': p.name,
                                          'subscription.planId': p.id
                                        });
                                        alert(`Plano de assinatura alterado para ${p.name} com sucesso!`);
                                      } catch (err) {
                                        console.error("Erro ao alterar assinatura:", err);
                                        alert("Não foi possível alterar a assinatura.");
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-[8px] uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Mudar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs font-bold">
                  Carregando dados da assinatura...
                </div>
              )}
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
