import React, { useRef, useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  CreditCard, 
  Bike, 
  Camera, 
  Check, 
  Bell, 
  Activity, 
  Info, 
  ShieldCheck, 
  LogOut, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Radio, 
  Clock, 
  Play, 
  Zap, 
  XCircle, 
  Smartphone, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Courier, User } from '../../types';
import { maskPhone } from '../../utils/masks';

export interface CourierPushPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  newOrderAlerts: boolean;
  readyOrderAlerts: boolean;
  chatAlerts: boolean;
  backgroundLockscreen: boolean;
}

interface CourierProfileTabProps {
  currentUser: User;
  courierData: Courier | null;
  editingData: {
    name: string;
    phone: string;
    pixKey: string;
    vehicleType: 'bike' | 'moto' | 'car';
    vehiclePlate: string;
    document: string;
    cnh: string;
  };
  saving: boolean;
  notificationPermission: NotificationPermission;
  testNotificationTimer: number | null;
  pushPreferences?: CourierPushPreferences;
  onEditingDataChange: React.Dispatch<React.SetStateAction<{
    name: string;
    phone: string;
    pixKey: string;
    vehicleType: 'bike' | 'moto' | 'car';
    vehiclePlate: string;
    document: string;
    cnh: string;
  }>>;
  onSaveProfile: () => void;
  onRequestNotificationPermission: () => void;
  onTestBackgroundNotification?: () => void;
  onScheduleBackgroundTest?: (delaySeconds: number, title?: string, body?: string) => void;
  onImmediateTestNotification?: (title?: string, body?: string) => void;
  onCancelBackgroundTest?: () => void;
  onUpdatePushPreferences?: (prefs: Partial<CourierPushPreferences>) => void;
  onUploadPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
}

export const CourierProfileTab: React.FC<CourierProfileTabProps> = ({
  currentUser,
  courierData,
  editingData,
  saving,
  notificationPermission,
  testNotificationTimer,
  pushPreferences = {
    soundEnabled: true,
    vibrationEnabled: true,
    newOrderAlerts: true,
    readyOrderAlerts: true,
    chatAlerts: true,
    backgroundLockscreen: true,
  },
  onEditingDataChange,
  onSaveProfile,
  onRequestNotificationPermission,
  onTestBackgroundNotification,
  onScheduleBackgroundTest,
  onImmediateTestNotification,
  onCancelBackgroundTest,
  onUpdatePushPreferences,
  onUploadPhoto,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoURL = courierData?.photoURL || currentUser.photoURL;

  // Background testing configuration state
  const [selectedDelay, setSelectedDelay] = useState<number>(5);
  const [selectedScenario, setSelectedScenario] = useState<'new_order' | 'ready' | 'chat'>('new_order');
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(false);
  const [hasServiceWorker, setHasServiceWorker] = useState<boolean>(false);
  const [lastTestTimestamp, setLastTestTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setHasServiceWorker(true);
      }).catch(() => {
        setHasServiceWorker(false);
      });
    }
  }, []);

  const scenarioDetails = {
    new_order: {
      title: '🛵 Nova Entrega Disponível (R$ 16,80)',
      body: 'Pizzaria Bella Napoli • Coleta em 1.2km • Toque para aceitar a rota!',
      label: 'Nova Corrida',
      badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    },
    ready: {
      title: '🍳 Pedido Pronto para Retirada! (#8421)',
      body: 'O restaurante finalizou o preparo. Dirija-se ao balcão para retirar a bag.',
      label: 'Pronto p/ Coleta',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    },
    chat: {
      title: '💬 Mensagem do Cliente (#8421)',
      body: 'Cliente: "Estou aguardando no portão principal do condomínio."',
      label: 'Chat / Mensagem',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    }
  };

  const handleTriggerSchedule = () => {
    const sc = scenarioDetails[selectedScenario];
    if (onScheduleBackgroundTest) {
      onScheduleBackgroundTest(selectedDelay, sc.title, sc.body);
    } else if (onTestBackgroundNotification) {
      onTestBackgroundNotification();
    }
    setLastTestTimestamp(new Date().toLocaleTimeString('pt-BR'));
  };

  const handleTriggerImmediate = () => {
    const sc = scenarioDetails[selectedScenario];
    if (onImmediateTestNotification) {
      onImmediateTestNotification(sc.title, sc.body);
    } else if (onTestBackgroundNotification) {
      onTestBackgroundNotification();
    }
    setLastTestTimestamp(new Date().toLocaleTimeString('pt-BR'));
  };

  const togglePreference = (key: keyof CourierPushPreferences) => {
    if (onUpdatePushPreferences) {
      onUpdatePushPreferences({ [key]: !pushPreferences[key] });
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* 1. Profile Header with Photo Upload */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 border border-slate-800 text-center space-y-4 shadow-xl relative overflow-hidden">
        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-950 border-2 border-orange-500/60 overflow-hidden flex items-center justify-center shadow-xl">
            {photoURL ? (
              <img src={photoURL} className="w-full h-full object-cover" alt="Perfil" />
            ) : (
              <Bike size={42} className="text-orange-400" />
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-2 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl shadow-lg border-2 border-slate-900 transition-transform active:scale-90 cursor-pointer"
            title="Alterar Foto"
          >
            <Camera size={14} />
          </button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={onUploadPhoto} 
          />
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {courierData?.name || currentUser.name}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {maskPhone(courierData?.phone || currentUser.phone || '')}
          </p>
          <span className="inline-block mt-2 px-3 py-1 bg-orange-950/40 text-orange-400 border border-orange-800/40 rounded-full text-[9px] font-black uppercase tracking-wider">
            Entregador Parceiro Homologado
          </span>
        </div>
      </div>

      {/* 2. Personal & Contact Details Form */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 border border-slate-800 space-y-4 shadow-xl">
        <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
          <UserIcon size={16} className="text-orange-400" />
          Dados Cadastrais & Contato
        </span>

        <div className="space-y-3.5">
          <div>
            <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Nome Completo
            </label>
            <input 
              type="text"
              value={editingData.name}
              onChange={(e) => onEditingDataChange(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              WhatsApp / Telefone
            </label>
            <input 
              type="tel"
              value={editingData.phone}
              onChange={(e) => onEditingDataChange(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Chave Pix para Repasses
            </label>
            <div className="relative">
              <input 
                type="text"
                placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                value={editingData.pixKey}
                onChange={(e) => onEditingDataChange(prev => ({ ...prev, pixKey: e.target.value }))}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white pr-10 outline-none focus:border-orange-500/60 transition-colors"
              />
              <CreditCard size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Tipo de Veículo
              </label>
              <select
                value={editingData.vehicleType}
                onChange={(e) => onEditingDataChange(prev => ({ ...prev, vehicleType: e.target.value as any }))}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-orange-500/60 transition-colors"
              >
                <option value="moto">Motocicleta</option>
                <option value="bike">Bicicleta</option>
                <option value="car">Carro / Van</option>
              </select>
            </div>

            <div>
              <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Placa do Veículo
              </label>
              <input 
                type="text"
                placeholder="Ex: ABC1D23"
                value={editingData.vehiclePlate}
                onChange={(e) => onEditingDataChange(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                CPF
              </label>
              <input 
                type="text"
                placeholder="Apenas números"
                value={editingData.document}
                onChange={(e) => onEditingDataChange(prev => ({ ...prev, document: e.target.value }))}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Número da CNH
              </label>
              <input 
                type="text"
                placeholder="Registro CNH"
                value={editingData.cnh}
                onChange={(e) => onEditingDataChange(prev => ({ ...prev, cnh: e.target.value }))}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onSaveProfile}
              disabled={saving}
              className="w-full py-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Salvar Alterações de Cadastro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. DEDICATED PUSH NOTIFICATIONS & BACKGROUND TEST CONFIGURATION INTERFACE */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 border border-slate-800 space-y-5 shadow-xl relative overflow-hidden">
        {/* Module Header with Live Diagnostics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Notificações Push & Segundo Plano
              </h3>
              <p className="text-[10px] text-slate-400">
                Gerencie alertas do navegador, vibração e agende testes
              </p>
            </div>
          </div>

          {/* Service Worker Connectivity Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
              hasServiceWorker
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasServiceWorker ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {hasServiceWorker ? 'SW Ativo & Monitorando' : 'SW Em Registro'}
            </span>
          </div>
        </div>

        {/* 3.1 Browser Notification Permission Manager Card */}
        <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Permissão do Navegador
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 ${
              notificationPermission === 'granted'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : notificationPermission === 'denied'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {notificationPermission === 'granted' && <CheckCircle2 size={11} />}
              {notificationPermission === 'denied' && <AlertTriangle size={11} />}
              {notificationPermission === 'granted' 
                ? 'Permissão Concedida' 
                : notificationPermission === 'denied' 
                  ? 'Permissão Bloqueada' 
                  : 'Pendente de Ativação'}
            </span>
          </div>

          {notificationPermission === 'granted' ? (
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              O seu navegador está autorizado a emitir notificações do sistema. As novas corridas e atualizações de pedidos serão exibidas mesmo com a tela bloqueada.
            </p>
          ) : notificationPermission === 'denied' ? (
            <div className="space-y-2 bg-rose-950/20 p-3 rounded-xl border border-rose-900/30 text-[10.5px] text-rose-300">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} className="shrink-0 text-rose-400" />
                As notificações estão bloqueadas no seu navegador.
              </p>
              <p className="text-rose-200/80 leading-relaxed text-[10px]">
                Para receber entregas, toque no ícone de <strong>Cadeado / Configurações</strong> na barra de endereços do topo, clique em <strong>Permissões &gt; Notificações</strong> e marque <strong>Permitir</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                className="text-[9.5px] font-bold text-orange-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                <HelpCircle size={12} />
                <span>{showPermissionGuide ? 'Ocultar instruções detalhadas' : 'Ver guia passo a passo'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Autorize as notificações para que você receba o alerta sonoro de novas corridas sem precisar manter a tela do celular sempre ligada.
              </p>
              <button
                type="button"
                onClick={onRequestNotificationPermission}
                className="w-full py-3 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40 active:scale-98"
              >
                <Bell size={14} />
                <span>Habilitar Notificações Push Agora</span>
              </button>
            </div>
          )}

          {/* Collapsible Detailed Guide for Unblocking */}
          {showPermissionGuide && (
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-[10px] text-slate-300 space-y-2">
              <p className="font-black text-white uppercase tracking-wider text-[9px]">
                Passo a passo para desbloquear:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                <li>Toque no ícone de <strong>ajustes/cadeado</strong> ao lado da URL no topo do Chrome ou Safari.</li>
                <li>Localize a opção <strong>Notificações</strong> (ou Configurações do Site).</li>
                <li>Mude de &quot;Bloqueado&quot; para <strong>&quot;Permitir&quot;</strong>.</li>
                <li>Recarregue a página ou toque em salvar.</li>
              </ol>
            </div>
          )}
        </div>

        {/* 3.2 Notification Preference Toggles */}
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Radio size={13} className="text-orange-400" />
            Canais de Alerta e Preferências
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Som */}
            <div 
              onClick={() => togglePreference('soundEnabled')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                pushPreferences.soundEnabled 
                  ? 'bg-slate-950 border-orange-500/40' 
                  : 'bg-slate-950/60 border-slate-800/80 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  pushPreferences.soundEnabled ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  {pushPreferences.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-white block truncate">
                    Alerta Sonoro
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Toque de corrida
                  </span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                pushPreferences.soundEnabled ? 'bg-orange-500' : 'bg-slate-800'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pushPreferences.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Vibração */}
            <div 
              onClick={() => togglePreference('vibrationEnabled')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                pushPreferences.vibrationEnabled 
                  ? 'bg-slate-950 border-orange-500/40' 
                  : 'bg-slate-950/60 border-slate-800/80 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  pushPreferences.vibrationEnabled ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Vibrate size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-white block truncate">
                    Vibração no Celular
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Padrão de alerta tátil
                  </span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                pushPreferences.vibrationEnabled ? 'bg-orange-500' : 'bg-slate-800'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pushPreferences.vibrationEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Alerta de Novas Entregas */}
            <div 
              onClick={() => togglePreference('newOrderAlerts')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                pushPreferences.newOrderAlerts 
                  ? 'bg-slate-950 border-orange-500/40' 
                  : 'bg-slate-950/60 border-slate-800/80 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  pushPreferences.newOrderAlerts ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Bike size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-white block truncate">
                    Novas Entregas no Raio
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Notificar pedidos atribuídos
                  </span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                pushPreferences.newOrderAlerts ? 'bg-orange-500' : 'bg-slate-800'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pushPreferences.newOrderAlerts ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Tela Bloqueada / Segundo Plano */}
            <div 
              onClick={() => togglePreference('backgroundLockscreen')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                pushPreferences.backgroundLockscreen 
                  ? 'bg-slate-950 border-orange-500/40' 
                  : 'bg-slate-950/60 border-slate-800/80 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  pushPreferences.backgroundLockscreen ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-white block truncate">
                    Tela Bloqueada
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Modo em segundo plano
                  </span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                pushPreferences.backgroundLockscreen ? 'bg-orange-500' : 'bg-slate-800'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pushPreferences.backgroundLockscreen ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* 3.3 Background Test Scheduling & Simulation Center */}
        <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                Agendamento de Testes de Background
              </h4>
            </div>
            {lastTestTimestamp && (
              <span className="text-[9px] text-slate-400 font-mono">
                Último teste: {lastTestTimestamp}
              </span>
            )}
          </div>

          <p className="text-[10.5px] text-slate-400 leading-relaxed">
            Agende um teste para verificar se o seu aparelho recebe notificações e toca mesmo com o aplicativo fechado ou com o celular no bolso.
          </p>

          {/* Delay Selector */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Tempo de Espera para o Disparo (Delay):
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[3, 5, 10, 15, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={testNotificationTimer !== null}
                  onClick={() => setSelectedDelay(sec)}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 ${
                    selectedDelay === sec
                      ? 'bg-gradient-to-r from-orange-500 to-brand-primary text-white shadow-md shadow-orange-950/50'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Cenário Simulado:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(scenarioDetails) as ('new_order' | 'ready' | 'chat')[]).map((key) => {
                const sc = scenarioDetails[key];
                const isSelected = selectedScenario === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={testNotificationTimer !== null}
                    onClick={() => setSelectedScenario(key)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider block truncate">
                      {sc.label}
                    </span>
                    <span className="text-[8px] text-slate-500 block truncate mt-0.5">
                      {key === 'new_order' ? 'Corrida R$ 16,80' : key === 'ready' ? 'Balcão da loja' : 'Mensagem cliente'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview of the Notification Message */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-850 space-y-1">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 block">
              Pré-visualização do card na barra de status:
            </span>
            <p className="text-[10px] font-black text-white truncate">
              {scenarioDetails[selectedScenario].title}
            </p>
            <p className="text-[9px] text-slate-400 line-clamp-1">
              {scenarioDetails[selectedScenario].body}
            </p>
          </div>

          {/* Active Countdown Progress or Scheduling Action Buttons */}
          {testNotificationTimer !== null ? (
            <div className="p-4 bg-gradient-to-br from-orange-950/40 to-slate-900 rounded-2xl border border-orange-500/40 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <Activity size={14} className="animate-spin text-orange-400" />
                  Disparo em Segundo Plano Ativo
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {testNotificationTimer}s
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, (testNotificationTimer / selectedDelay) * 100))}%` }}
                />
              </div>

              <div className="bg-slate-950/90 p-2.5 rounded-xl border border-orange-500/20 text-center">
                <p className="text-[10px] font-bold text-orange-200">
                  📱 Bloqueie a tela do celular agora ou troque de aplicativo!
                </p>
                <p className="text-[8.5px] text-slate-400 mt-0.5">
                  Aguarde os {testNotificationTimer} segundos com a tela apagada para ouvir o alerta de corrida.
                </p>
              </div>

              {onCancelBackgroundTest && (
                <button
                  type="button"
                  onClick={onCancelBackgroundTest}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <XCircle size={13} className="text-rose-400" />
                  <span>Cancelar Agendamento</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleTriggerImmediate}
                disabled={notificationPermission !== 'granted'}
                className="py-3.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-2xl text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 active:scale-98"
                title="Dispara a notificação de teste imediatamente na tela"
              >
                <Zap size={14} className="text-amber-400" />
                <span>Testar Imediato</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerSchedule}
                disabled={notificationPermission !== 'granted'}
                className="py-3.5 px-4 bg-gradient-to-r from-orange-500 to-brand-primary hover:from-orange-600 hover:to-[#E03D0C] text-white rounded-2xl text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-orange-950/60 disabled:opacity-40 active:scale-98"
                title={`Agenda o disparo em ${selectedDelay} segundos no Service Worker`}
              >
                <Clock size={14} />
                <span>Agendar Teste ({selectedDelay}s)</span>
              </button>
            </div>
          )}
        </div>

        {/* 3.4 Delivery Tips & Battery Diagnostic Card */}
        <div className="flex gap-2.5 items-start bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[10px] text-slate-400 leading-normal">
          <Info size={16} className="text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black text-slate-200 uppercase tracking-wide text-[9px] block">
              Dica de Otimização de Bateria para Entregadores
            </span>
            <p className="text-slate-400">
              No Android (Xiaomi, Samsung, Motorola), certifique-se de definir a <strong>Economia de Bateria</strong> do KitchenFlow para <em>&quot;Sem Restrições&quot;</em> e permitir <em>Início Automático</em> para garantir que as notificações e o GPS nunca sejam encerrados pelo sistema operacional enquanto você pilota.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Logout Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-4 bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <LogOut size={16} />
          <span>Sair da Conta de Entregador</span>
        </button>
      </div>
    </div>
  );
};
