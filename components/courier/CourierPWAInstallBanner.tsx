import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Zap, 
  MapPin, 
  Bell, 
  WifiOff,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface CourierPWAInstallBannerProps {
  variant?: 'card' | 'header-button' | 'profile-section';
  onInstalled?: () => void;
}

export const CourierPWAInstallBanner: React.FC<CourierPWAInstallBannerProps> = ({
  variant = 'card',
  onInstalled
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('kf_courier_pwa_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const handleInstallAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onInstalled) {
        onInstalled();
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('kf_courier_pwa_banner_dismissed', '1');
    } catch {}
  };

  // Header compact action button
  if (variant === 'header-button') {
    if (isInstalled) return null;

    return (
      <>
        <button
          type="button"
          onClick={handleInstallAction}
          className="min-h-[44px] px-3.5 py-2 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 rounded-2xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          title="Instalar App do Entregador na tela inicial"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Instalar App</span>
        </button>

        <InstallGuideSheet 
          isOpen={showGuideModal} 
          onClose={() => setShowGuideModal(false)} 
          isIOS={isIOS} 
        />
      </>
    );
  }

  // Profile section card (always visible so courier can check PWA status or install)
  if (variant === 'profile-section') {
    return (
      <>
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Smartphone size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Aplicativo do Entregador (PWA)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isInstalled
                    ? 'Instalado na tela inicial • Modo tela cheia ativo'
                    : 'Instale no celular para acesso rápido, GPS contínuo e modo offline'}
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-400 shrink-0">
              {isInstalled ? 'Instalado' : 'Navegador'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-xs text-slate-300">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex flex-col gap-1">
              <MapPin size={15} className="text-emerald-400" />
              <span className="font-semibold text-white text-xs">GPS Fluido</span>
              <span className="text-[11px] text-slate-400">Rotas rápidas</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex flex-col gap-1">
              <Bell size={15} className="text-orange-400" />
              <span className="font-semibold text-white text-xs">Alertas Push</span>
              <span className="text-[11px] text-slate-400">Tela bloqueada</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex flex-col gap-1">
              <WifiOff size={15} className="text-sky-400" />
              <span className="font-semibold text-white text-xs">Modo Offline</span>
              <span className="text-[11px] text-slate-400">Sincroniza auto</span>
            </div>
          </div>

          {!isInstalled ? (
            <button
              type="button"
              onClick={handleInstallAction}
              className="w-full min-h-[48px] py-3 px-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-lg shadow-orange-950/40"
            >
              <Download size={16} />
              <span>{isInstallable ? 'Instalar Aplicativo Agora' : 'Como Instalar na Tela Inicial'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl px-4 py-3 font-medium">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Você já está utilizando a versão instalada do aplicativo.</span>
            </div>
          )}
        </div>

        <InstallGuideSheet 
          isOpen={showGuideModal} 
          onClose={() => setShowGuideModal(false)} 
          isIOS={isIOS} 
        />
      </>
    );
  }

  // Home card banner
  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-md">
              <Smartphone size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-snug">
                Instale o App do Entregador
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Tela cheia sem barra do navegador, alertas de corrida em 2º plano e funcionamento offline.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Ocultar aviso"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3.5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleInstallAction}
            className="flex-1 min-h-[44px] py-2.5 px-4 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Download size={15} />
            <span>{isInstallable ? 'Instalar Aplicativo' : isIOS ? 'Instalar no iPhone' : 'Adicionar à Tela Inicial'}</span>
          </button>
        </div>
      </div>

      <InstallGuideSheet 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
        isIOS={isIOS} 
      />
    </>
  );
};

const InstallGuideSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}> = ({ isOpen, onClose, isIOS }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl space-y-5"
          >
            {/* Grab Handle */}
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-md">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Instalar App do Entregador
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isIOS ? 'Passo a passo para iPhone / iPad' : 'Passo a passo para Android / Chrome'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="leading-relaxed">
                    Toque no botão <strong className="text-white">Compartilhar</strong>{' '}
                    <Share size={14} className="inline text-sky-400 mx-0.5" /> na barra do Safari.
                  </span>
                </li>
                <li className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="leading-relaxed">
                    Role a lista e toque em <strong className="text-white">Adicionar à Tela de Início</strong>{' '}
                    <PlusSquare size={14} className="inline text-slate-200 mx-0.5" />.
                  </span>
                </li>
                <li className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="leading-relaxed">
                    Confirme em <strong className="text-white">Adicionar</strong> no canto superior direito para abrir como aplicativo.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="leading-relaxed">
                    Toque no menu do navegador <MoreVertical size={14} className="inline text-slate-200 mx-0.5" /> no canto superior direito do Chrome.
                  </span>
                </li>
                <li className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="leading-relaxed">
                    Selecione <strong className="text-white">Instalar aplicativo</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="leading-relaxed">
                    Confirme em <strong className="text-white">Instalar</strong> para usar em tela cheia com GPS e alertas em segundo plano.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] py-3 bg-brand-primary hover:bg-[#E03D0C] text-white rounded-2xl font-bold text-xs transition-all cursor-pointer"
            >
              Entendi
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
