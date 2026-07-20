import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '../types';
import { 
  Volume2, VolumeX, Maximize2, Minimize2, 
  Tv, Clock, CheckCircle2, Flame, AlertCircle, Sparkles
} from 'lucide-react';

interface MonitorPedidosProps {
  orders: Order[];
}

export const MonitorPedidos: React.FC<MonitorPedidosProps> = ({ orders }) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Ref to track previously seen "ready" orders to identify when a new one appears
  const prevReadyIdsRef = useRef<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders
  const preparingOrders = useMemo(() => {
    // Keep only recent pending/preparing orders (from last 12 hours) to avoid clutter
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return orders
      .filter(o => 
        (o.status === 'preparing' || o.status === 'pending') && 
        new Date(o.createdAt) > twelveHoursAgo
      )
      .slice(0, 16); // limit for visual elegance on TV screen
  }, [orders]);

  const readyOrders = useMemo(() => {
    // Keep ready orders from the current active session
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return orders
      .filter(o => 
        o.status === 'ready' && 
        new Date(o.createdAt) > twelveHoursAgo
      )
      .slice(0, 12);
  }, [orders]);

  // Handle Voice Announcement and Sound alerts when an order becomes ready
  useEffect(() => {
    const currentReadyIds = readyOrders.map(o => o.id);
    const prevReadyIds = prevReadyIdsRef.current;

    // Detect newly added "ready" orders
    const newlyReadyOrders = readyOrders.filter(o => !prevReadyIds.includes(o.id));

    if (newlyReadyOrders.length > 0 && prevReadyIds.length > 0) {
      newlyReadyOrders.forEach(order => {
        // 1. Play alert chime
        if (soundEnabled) {
          playAlertChime();
        }

        // 2. Synthesize speech if enabled
        if (speechEnabled) {
          announceOrder(order);
        }
      });
    }

    // Save current ids for next cycle
    prevReadyIdsRef.current = currentReadyIds;
  }, [readyOrders, soundEnabled, speechEnabled]);

  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Chime sequence: Tone 1 (G5), Tone 2 (C6)
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.05);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(783.99, now, 0.15); // G5
      playTone(1046.50, now + 0.15, 0.4); // C6
    } catch (err) {
      console.warn("Could not play audio alert: ", err);
    }
  };

  const announceOrder = (order: Order) => {
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      let identifier = '';
      if (order.tableNumber) {
        identifier = `Mesa ${order.tableNumber}`;
      } else if (order.customerName) {
        identifier = `Cliente ${order.customerName}`;
      } else {
        const shortId = order.id.replace('KDS-', '').slice(-3);
        identifier = `Senha ${shortId}`;
      }

      const text = `Pedido para ${identifier} está pronto! Por favor, retire no balcão.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Could not speak: ", err);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Monitor screen exit full screen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format order label for display
  const getOrderLabel = (order: Order) => {
    if (order.tableNumber) {
      return `MESA ${order.tableNumber}`;
    }
    if (order.customerName) {
      return order.customerName.toUpperCase().slice(0, 15);
    }
    const shortId = order.id.replace('KDS-', '').toUpperCase().slice(-4);
    return `SENHA ${shortId}`;
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col flex-1 bg-slate-950 text-white rounded-3xl border border-slate-900 shadow-2xl overflow-hidden h-full min-h-0 font-sans select-none"
    >
      {/* Header Panel */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary border border-brand-primary/20 shadow-lg shadow-brand-primary/5">
            <Tv size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Painel de Retirada
              <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold tracking-widest animate-pulse">
                AO VIVO
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              Acompanhe o status do seu pedido na cozinha em tempo real
            </p>
          </div>
        </div>

        {/* Action Controls & Clock */}
        <div className="flex items-center gap-4">
          {/* Sounds */}
          <div className="flex items-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 gap-1 shadow-inner">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-amber-500 text-slate-950 font-black shadow' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Campainha sonora"
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              Som
            </button>
            <button
              onClick={() => {
                setSpeechEnabled(!speechEnabled);
                if (!speechEnabled) {
                  // request sound consent implicitly by playing a quick beep
                  playAlertChime();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                speechEnabled 
                  ? 'bg-emerald-500 text-slate-950 font-black shadow' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Chamada de voz por sintetizador"
            >
               Voz
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all text-slate-300 hover:text-white rounded-xl border border-slate-700/50"
            title="Tela Cheia (TV)"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Digital Clock */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 p-2 px-3 rounded-xl shadow-inner font-mono">
            <Clock size={14} className="text-amber-400" />
            <span className="text-sm font-bold tracking-wider text-slate-200">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Board View: 2 Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden min-h-0 bg-slate-950">
        
        {/* Left Column: Preparing (Em Preparo) */}
        <div className="flex flex-col border-r border-slate-900 overflow-hidden self-stretch">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/20 to-transparent border-b border-rose-900/10 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                <Flame size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-widest">
                  Preparando
                </h2>
                <p className="text-[9px] text-rose-400 uppercase tracking-wider font-extrabold">
                  Na grelha, forno ou montagem
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-xs font-black text-rose-400">
              {preparingOrders.length}
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar-monitor">
            {preparingOrders.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {preparingOrders.map(order => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group shadow-md"
                    >
                      {/* Left glowing border */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50" />
                      
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        {order.type === 'delivery' ? '💬 DELIVERY' : order.type === 'takeout' ? '🛍️ RETIRADA' : '🍽️ SALÃO'}
                      </span>
                      
                      <span className="text-lg sm:text-xl font-black text-slate-200 tracking-tight leading-none group-hover:text-white transition-colors">
                        {getOrderLabel(order)}
                      </span>

                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold bg-slate-950 p-1 px-2.5 rounded-full border border-slate-800/40 mt-1">
                        <Clock size={10} className="text-rose-400 animate-pulse" />
                        <span>PREPARANDO...</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-35 text-slate-500 py-12">
                <Flame size={48} className="stroke-1 mb-3 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem pedidos em preparo</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ready (Pronto / Retire Aqui) */}
        <div className="flex flex-col bg-slate-950 overflow-hidden self-stretch">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/20 to-transparent border-b border-emerald-900/10 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={18} className="animate-bounce" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-widest">
                  Pronto para Retirar
                </h2>
                <p className="text-[9px] text-emerald-400 uppercase tracking-wider font-extrabold animate-pulse">
                  Retire seu pedido no balcão!
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-black text-emerald-400 animate-pulse">
              {readyOrders.length}
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar-monitor">
            {readyOrders.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {readyOrders.map(order => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.5, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 180, damping: 15 }}
                      className="bg-emerald-950/20 border-2 border-emerald-500/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden shadow-xl shadow-emerald-950/10 group hover:border-emerald-400 transition-all cursor-pointer"
                      onClick={() => {
                        // Play sound or announce manually when user clicks on a ready card as an interactive easter egg
                        playAlertChime();
                        announceOrder(order);
                      }}
                    >
                      {/* Flashing overlay for ultimate premium look */}
                      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                      
                      <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                      <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-emerald-500 rounded-full" />
                      
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                        {order.type === 'delivery' ? '🛵 RETIRADA' : order.type === 'takeout' ? '🛍️ BALCÃO' : '🍽️ SALÃO'}
                      </span>

                      <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none uppercase select-all font-mono">
                        {getOrderLabel(order)}
                      </span>

                      <div className="flex items-center gap-1 text-[10px] text-emerald-200 font-extrabold bg-emerald-500/10 border border-emerald-500/30 p-1.5 px-4 rounded-full mt-1.5 animate-pulse uppercase tracking-wide">
                        <Sparkles size={11} className="text-amber-400 animate-spin duration-1000" />
                        RETIRAR NO BALCÃO
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-35 text-slate-500 py-12">
                <CheckCircle2 size={48} className="stroke-1 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum pedido pronto ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Instructions banner */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 px-5 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <AlertCircle size={13} className="text-amber-500 animate-pulse" />
          Atenção clientes: compareça à área de entrega quando seu número piscar em verde!
        </span>
        <span className="mt-1 sm:mt-0 text-slate-500 font-mono">
          KitchenFlow AI KDS Network
        </span>
      </div>

      <style>{`
        .custom-scrollbar-monitor::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar-monitor::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-monitor::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-monitor::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
};
