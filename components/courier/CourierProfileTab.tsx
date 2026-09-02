import React, { useRef } from 'react';
import { 
  User as UserIcon, 
  Phone, 
  CreditCard, 
  Bike, 
  Car, 
  Camera, 
  Check, 
  Bell, 
  Activity, 
  Info, 
  ShieldCheck, 
  LogOut, 
  DollarSign, 
  FileText,
  Smartphone
} from 'lucide-react';
import { Courier, User } from '../../types';
import { maskPhone } from '../../utils/masks';

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
  onTestBackgroundNotification: () => void;
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
  onEditingDataChange,
  onSaveProfile,
  onRequestNotificationPermission,
  onTestBackgroundNotification,
  onUploadPhoto,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoURL = courierData?.photoURL || currentUser.photoURL;

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

      {/* 3. Background Notifications & Service Worker Panel */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-orange-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Notificações em Segundo Plano
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Receba alertas sonoros e notificações instantâneas mesmo com a tela bloqueada ou com o aplicativo minimizado.
        </p>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
              Permissão no Navegador
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${
              notificationPermission === 'granted'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : notificationPermission === 'denied'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {notificationPermission === 'granted' ? 'Concedida' : notificationPermission === 'denied' ? 'Bloqueada' : 'Pendente'}
            </span>
          </div>

          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={onRequestNotificationPermission}
              className="w-full py-3 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Bell size={14} />
              <span>Ativar Notificações no Dispositivo</span>
            </button>
          )}

          {notificationPermission === 'granted' && (
            <div className="pt-2 border-t border-slate-850 space-y-2">
              <p className="text-[10px] text-slate-400">
                Clique abaixo e bloqueie a tela do celular em até 5 segundos para testar o alerta de novas entregas:
              </p>
              <button
                type="button"
                onClick={onTestBackgroundNotification}
                disabled={testNotificationTimer !== null}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testNotificationTimer !== null ? (
                  <span>Aguarde {testNotificationTimer}s... Bloqueie a tela!</span>
                ) : (
                  <>
                    <Activity size={14} className="text-orange-400" />
                    <span>Testar Notificação em 5 Segundos</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 items-start bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[10px] text-slate-500 leading-normal">
          <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-300 block mb-0.5">Dica de Bateria para Entregadores</span>
            Certifique-se de desabilitar a otimização de economia de bateria agressiva do seu Android/iOS para este aplicativo para garantir que o GPS e as notificações funcionem em segundo plano durante a rota.
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
