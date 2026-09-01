import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed / standalone mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // Capture Android / Desktop Chromium prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Verify if current path is allowed (EXCLUSIVELY Cardápio Digital / Marketplace)
  const isAllowedPath = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    
    // Explicitly reject Lojista, SaaS, Admin, KDS, Entregador
    if (
      path.includes('/lojista') || 
      path.includes('/saas') || 
      path.includes('/admin') || 
      path.includes('/entregador') ||
      path.includes('/courier') ||
      path.includes('/motoboy')
    ) {
      return false;
    }

    return (
      path.startsWith('/cardapio') ||
      path.startsWith('/marketplace') ||
      path.startsWith('/c/') ||
      path.startsWith('/m/') ||
      path.startsWith('/menu')
    );
  };

  if (isStandalone || dismissed || !isAllowedPath()) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      // General prompt or fallback
      alert('Para instalar no seu dispositivo Android ou Computador: abra o menu do navegador (3 pontinhos) e toque em "Instalar aplicativo" ou "Adicionar à tela inicial".');
    }
  };

  // Compact Pill button mode (useful for headers or toolbars)
  if (compact) {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-full text-xs font-bold shadow-sm transition-all active:scale-95"
          title="Instalar Zupi Delivery no seu dispositivo"
        >
          <Smartphone size={14} />
          <span>Baixar Zupi Delivery</span>
        </button>

        {/* Modal Instruções iOS */}
        {showIosModal && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIosModal(false);
            }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl max-w-sm w-full relative shadow-2xl cursor-default"
            >
              <button 
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white overflow-hidden p-1 shadow-md">
                  <img src="/icon.svg" alt="Zupi Delivery" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Instalar Zupi Delivery</h3>
                  <p className="text-xs text-slate-400">Aplicativo Oficial no iPhone / iPad</p>
                </div>
              </div>

              <ol className="space-y-3 text-xs text-slate-300 mb-6">
                <li className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded-lg text-[10px]">1</span>
                  <span>Toque no botão <strong className="text-white font-semibold">Compartilhar</strong> <Share size={14} className="inline text-blue-400 mx-1" /> na barra inferior do Safari.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded-lg text-[10px]">2</span>
                  <span>Role para baixo e selecione <strong className="text-white font-semibold">Adicionar à Tela de Início</strong> <PlusSquare size={14} className="inline text-slate-300 mx-1" />.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded-lg text-[10px]">3</span>
                  <span>Confirme tocando em <strong className="text-white font-semibold">Adicionar</strong> e aproveite o app Zupi Delivery!</span>
                </li>
              </ol>

              <button
                onClick={() => setShowIosModal(false)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Floating bottom bar banner
  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9990] bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white p-4 rounded-2xl shadow-2xl transition-all animate-bounce-once">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/20 overflow-hidden p-1">
              <img src="/icon.svg" alt="Zupi Delivery" className="w-full h-full object-contain" />
            </div>
            <div>
              <h4 className="font-bold text-xs md:text-sm text-white">Baixar App Zupi Delivery</h4>
              <p className="text-[11px] text-slate-400">Acesse direto da sua tela inicial (iOS e Android)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Instalar Zupi Delivery</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Instruções iOS */}
      {showIosModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIosModal(false);
          }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl max-w-sm w-full relative shadow-2xl cursor-default"
          >
            <button 
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white overflow-hidden p-1 shadow-md">
                <img src="/icon.svg" alt="Zupi Delivery" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-base">Instalar Zupi Delivery</h3>
                <p className="text-xs text-slate-400">Instalação rápida pelo Safari</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300 mb-6">
              <li className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded-lg text-[10px]">1</span>
                <span>Toque no ícone <strong className="text-white font-semibold">Compartilhar</strong> <Share size={14} className="inline text-blue-400 mx-1" /> no rodapé do Safari.</span>
              </li>
              <li className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded-lg text-[10px]">2</span>
                <span>Selecione <strong className="text-white font-semibold">Adicionar à Tela de Início</strong> <PlusSquare size={14} className="inline text-slate-300 mx-1" />.</span>
              </li>
              <li className="flex items-start gap-2.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded-lg text-[10px]">3</span>
                <span>Toque em <strong className="text-white font-semibold">Adicionar</strong> e aproveite seu app Zupi Delivery!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
