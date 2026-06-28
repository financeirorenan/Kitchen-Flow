import React from 'react';

export type KaiExpression = 'neutro' | 'analisando' | 'alerta' | 'feliz' | 'concentrado' | 'surpreso';
export type KaiPose = 'analisando-dados' | 'gestao-pedidos' | 'controle-estoque' | 'planejamento' | 'na-cozinha' | 'tudo-sob-controle';

interface KaiAvatarProps {
  expression?: KaiExpression;
  pose?: KaiPose;
  size?: number | string;
  className?: string;
  showCardDesign?: boolean; // Whether to frame it in a super neat DNA Visual card
}

export default function KaiAvatar({
  expression = 'neutro',
  pose = 'tudo-sob-controle',
  size = 180,
  className = '',
  showCardDesign = false,
}: KaiAvatarProps) {
  // Convert friendly colors from visual identity
  const colorGraphite = "#14171C";
  const colorGraphiteLight = "#1F232A";
  const colorNeonBlue = "#00B7FF";
  const colorLightBlue = "#7DD3FF";
  const colorWhite = "#FFFFFF";

  // Dynamic eye rendering based on expression
  const renderEyes = () => {
    switch (expression) {
      case 'analisando':
        // Slanted horizontal lines
        return (
          <>
            <rect x="34" y="58" width="12" height="4" rx="2" fill={colorNeonBlue} className="animate-pulse" />
            <rect x="54" y="58" width="12" height="4" rx="2" fill={colorNeonBlue} className="animate-pulse" />
          </>
        );
      case 'alerta':
        // Round alert eyes with warm orange glow
        return (
          <>
            <circle cx="40" cy="60" r="6" fill="#FFA500" stroke={colorNeonBlue} strokeWidth="1.5" />
            <circle cx="60" cy="60" r="6" fill="#FFA500" stroke={colorNeonBlue} strokeWidth="1.5" />
            <circle cx="40" cy="60" r="2" fill="#FFFFFF" />
            <circle cx="60" cy="60" r="2" fill="#FFFFFF" />
          </>
        );
      case 'feliz':
        // Happy arch eyes
        return (
          <>
            <path d="M34 62 Q40 54 46 62" stroke={colorNeonBlue} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M54 62 Q60 54 66 62" stroke={colorNeonBlue} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case 'concentrado':
        // Focused squinting downward
        return (
          <>
            <path d="M34 57 L46 61" stroke={colorNeonBlue} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M66 57 L54 61" stroke={colorNeonBlue} strokeWidth="3.5" strokeLinecap="round" />
          </>
        );
      case 'surpreso':
        // Big round eyes
        return (
          <>
            <circle cx="40" cy="58" r="7.5" fill={colorNeonBlue} />
            <circle cx="60" cy="58" r="7.5" fill={colorNeonBlue} />
            <circle cx="40" cy="58" r="3" fill="#FFFFFF" />
            <circle cx="60" cy="58" r="3" fill="#FFFFFF" />
          </>
        );
      case 'neutro':
      default:
        // Regular friendly eyes
        return (
          <>
            <circle cx="40" cy="59" r="5.5" fill={colorNeonBlue} />
            <circle cx="60" cy="59" r="5.5" fill={colorNeonBlue} />
            <circle cx="39" cy="57" r="1.8" fill="#FFFFFF" />
            <circle cx="59" cy="57" r="1.8" fill="#FFFFFF" />
          </>
        );
    }
  };

  // Helper additions for custom poses
  const renderPoseAids = () => {
    switch (pose) {
      case 'analisando-dados':
        // Glowing cyan financial bar/line chart floating
        return (
          <g transform="translate(68, 62) scale(0.9)" className="animate-bounce" style={{ animationDuration: '4s' }}>
            <rect x="0" y="0" width="28" height="20" rx="4" fill={colorGraphiteLight} stroke={colorNeonBlue} strokeWidth="1.5" opacity="0.95" />
            {/* Chart bars */}
            <rect x="4" y="12" width="4" height="5" fill={colorLightBlue} rx="1" />
            <rect x="10" y="8" width="4" height="9" fill={colorNeonBlue} rx="1" />
            <rect x="16" y="5" width="4" height="12" fill={colorLightBlue} rx="1" />
            <circle cx="22" cy="4" r="1.5" fill="#10B981" />
            <path d="M4 14 L10 9 L16 6 L22 4" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'gestao-pedidos':
        // A cute checkmark receipt clipboard
        return (
          <g transform="translate(64, 58) scale(0.9)" className="animate-pulse">
            <rect x="5" y="0" width="24" height="28" rx="3" fill="#F8FAFC" stroke={colorNeonBlue} strokeWidth="1.5" />
            {/* Clip */}
            <rect x="12" y="-3" width="10" height="4" rx="1" fill="#94A3B8" />
            {/* Check marks and lines */}
            <path d="M9 7 L12 10 L18 4" stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <line x1="10" y1="15" x2="22" y2="15" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <line x1="10" y1="21" x2="18" y2="21" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'controle-estoque':
        // Crate of veggies
        return (
          <g transform="translate(10, 68) scale(0.85)" className="animate-bounce" style={{ animationDuration: '3s' }}>
            {/* Wooden box */}
            <rect x="0" y="10" width="26" height="15" rx="2" fill="#854D0E" />
            <line x1="0" y1="17" x2="26" y2="17" stroke="#713F12" strokeWidth="1" />
            {/* Carrots and Lettuce peaking from inside box */}
            <path d="M5 12 Q2 4 8 8 Z" fill="#22C55E" />
            <path d="M7 10 L10 5" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M15 12 Q12 2 18 6 Z" fill="#22C55E" />
            <path d="M18 10 L21 5" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        );
      case 'planejamento':
        // Glowing yellow/blue insight bulb
        return (
          <g transform="translate(70, 15) scale(0.9)" className="animate-pulse">
            <circle cx="12" cy="12" r="8" fill="rgba(0, 183, 255, 0.15)" stroke={colorNeonBlue} strokeWidth="1.5" />
            {/* Bulb threads base */}
            <rect x="9" y="19" width="6" height="4" rx="1" fill="#94A3B8" />
            <path d="M12 7 L12 15M8 11 L16 11" stroke={colorLightBlue} strokeWidth="1.5" strokeLinecap="round" />
            {/* Glow particles */}
            <line x1="12" y1="1" x2="12" y2="3" stroke={colorNeonBlue} strokeWidth="1.5" />
            <line x1="2" y1="12" x2="4" y2="12" stroke={colorNeonBlue} strokeWidth="1.5" />
            <line x1="20" y1="12" x2="22" y2="12" stroke={colorNeonBlue} strokeWidth="1.5" />
          </g>
        );
      case 'na-cozinha':
        // Silver cooking pot with rising steam
        return (
          <g transform="translate(36, 84) scale(0.9)">
            <rect x="-14" y="0" width="28" height="18" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
            {/* Handles */}
            <path d="M-17 4 Q-21 4 -17 10" stroke="#475569" strokeWidth="2" fill="none" />
            <path d="M17 4 Q21 4 17 10" stroke="#475569" strokeWidth="2" fill="none" />
            {/* Steam lines */}
            <path d="M-6 -6 Q-8 -12 -5 -18" stroke={colorLightBlue} strokeWidth="1.5" fill="none" strokeDasharray="2,2" opacity="0.8" className="animate-pulse" />
            <path d="M5 -6 Q3 -14 6 -20" stroke={colorLightBlue} strokeWidth="1.5" fill="none" strokeDasharray="2,2" opacity="0.8" className="animate-pulse" />
          </g>
        );
      case 'tudo-sob-controle':
      default:
        // Centered sparkling stars showing success / peace of mind
        return (
          <g transform="translate(74, 52) scale(0.9)" className="animate-pulse">
            <path d="M 0,-6 L 2,-2 L 6,0 L 2,2 L 0,6 L -2,2 L -6,0 L -2,-2 Z" fill="#FBBF24" />
            <path d="M -60,-30 L -58,-28 L -55,-27 L -58,-26 L -60,-22 L -62,-26 L -65,-27 L -62,-28 Z" fill="#FBBF24" />
          </g>
        );
    }
  };

  const getPoseLabel = () => {
    switch (pose) {
      case 'analisando-dados': return 'Analisando Dados';
      case 'gestao-pedidos': return 'Gestão de Pedidos';
      case 'controle-estoque': return 'Controle de Estoque';
      case 'planejamento': return 'Planejamento Operacional';
      case 'na-cozinha': return 'Na Cozinha';
      case 'tudo-sob-controle':
      default:
        return 'Tudo Sob Controle';
    }
  };

  const getExpressionLabel = () => {
    switch (expression) {
      case 'analisando': return 'Pensando';
      case 'alerta': return 'Atenção';
      case 'feliz': return 'Contente';
      case 'concentrado': return 'Focado';
      case 'surpreso': return 'Espantado';
      case 'neutro':
      default:
        return 'Neutro';
    }
  };

  const numSize = typeof size === 'number' ? size : parseInt(String(size)) || 100;
  const showLabel = !showCardDesign && numSize >= 65;

  const avatarMarkup = (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* SVG drawing Kai the Mascot */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_10px_20px_rgba(0,183,255,0.15)] transition-all duration-300"
      >
        <defs>
          <radialGradient id="kaiBodyGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor={colorGraphiteLight} />
            <stop offset="100%" stopColor={colorGraphite} />
          </radialGradient>
          <linearGradient id="neonGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorNeonBlue} />
            <stop offset="100%" stopColor={colorLightBlue} />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Background Ambient Glow --- */}
        <circle cx="50" cy="65" r="28" fill={colorNeonBlue} opacity="0.06" filter="url(#neonGlow)" />

        {/* --- Back/Side Tentacles (Rendered behind body) --- */}
        <g stroke={colorGraphite} strokeWidth="1" fill="url(#kaiBodyGrad)">
          {/* Back Left Outer Tentacle */}
          <path d="M26 72 C10 65, 0 85, 4 94 C12 100, 22 88, 30 78 Z" />
          <path d="M16 80 C8 82, 6 92, 10 96" stroke={colorNeonBlue} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

          {/* Back Right Outer Tentacle */}
          <path d="M74 72 C90 65, 100 85, 96 94 C88 100, 78 88, 70 78 Z" />
          <path d="M84 80 C92 82, 94 92, 90 96" stroke={colorNeonBlue} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

          {/* Symmetrical Under tentacles */}
          <path d="M34 82 C22 92, 25 106, 36 104 C42 102, 42 92, 42 84 Z" />
          <path d="M66 82 C78 92, 75 106, 64 104 C58 102, 58 92, 58 84 Z" />
        </g>

        {/* --- Suction cup light glow (ventosas) --- */}
        <g fill={colorLightBlue} opacity="0.8">
          <circle cx="5" cy="85" r="1.5" filter="url(#neonGlow)" />
          <circle cx="10" cy="92" r="1.5" filter="url(#neonGlow)" />
          <circle cx="95" cy="85" r="1.5" filter="url(#neonGlow)" />
          <circle cx="90" cy="92" r="1.5" filter="url(#neonGlow)" />
          <circle cx="28" cy="98" r="1.5" filter="url(#neonGlow)" />
          <circle cx="34" cy="102" r="1.5" filter="url(#neonGlow)" />
          <circle cx="72" cy="98" r="1.5" filter="url(#neonGlow)" />
          <circle cx="66" cy="102" r="1.5" filter="url(#neonGlow)" />
        </g>

        {/* --- Front Tentacles (curled forward, overlapping) --- */}
        <g stroke={colorGraphite} strokeWidth="1.2" fill="url(#kaiBodyGrad)">
          {/* Main Front Left Tentacle */}
          <path d="M38 78 C28 85, 12 92, 20 102 C28 104, 34 94, 42 86 Z" />
          {/* Main Front Right Tentacle */}
          <path d="M62 78 C72 85, 88 92, 80 102 C72 104, 66 94, 58 86 Z" />
        </g>

        {/* Glowing suction circles on front tentacles */}
        <g fill={colorNeonBlue}>
          <circle cx="22" cy="94" r="1.8" filter="url(#neonGlow)" />
          <circle cx="29" cy="98" r="1.8" filter="url(#neonGlow)" />
          <circle cx="78" cy="94" r="1.8" filter="url(#neonGlow)" />
          <circle cx="71" cy="98" r="1.8" filter="url(#neonGlow)" />
        </g>

        {/* --- Octopus Central Head / Body --- */}
        <ellipse cx="50" cy="65" rx="26" ry="24" fill="url(#kaiBodyGrad)" stroke={colorGraphiteLight} strokeWidth="2" />

        {/* Chef Logo "K" emblem on head area above screen, or directly as body overlay */}
        <path d="M48 68 Q50 63 52 68" stroke={colorNeonBlue} strokeWidth="1.5" fill="none" opacity="0.4" />

        {/* --- Chef's Hat (Chapeu de Cozinheiro) --- */}
        <g id="chefs-hat">
          {/* Shadow of hat */}
          <ellipse cx="50" cy="44" rx="20" ry="4" fill="#000000" opacity="0.25" />
          
          {/* Hat base band */}
          <path d="M32 44 L68 44 C68 40,68 37, 68 36 C64 36, 36 36, 32 36 Z" fill={colorWhite} stroke={colorGraphiteLight} strokeWidth="1.5" strokeLinejoin="round" />
          
          {/* White puffy clouds on top */}
          <path d="M30 36 C24 36, 22 24, 32 22 C28 12, 42 10, 46 18 C50 10, 62 12, 60 22 C68 20, 72 32, 66 36 H30" fill={colorWhite} stroke={colorGraphiteLight} strokeWidth="1.5" strokeLinejoin="miter" />

          {/* Blue Stylized K Emblem on Chef Hat */}
          <g transform="translate(48.5, 25.5) scale(0.9)">
            {/* Crown/Stripe */}
            <path
              d="M-4 1 H -1 V 13 H -4 Z"
              fill={colorNeonBlue}
            />
            <path
              d="M3 1 L-1 6 L3 13"
              stroke={colorNeonBlue}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </g>

        {/* --- Interactive Face Screen (Glowing outline mask) --- */}
        {/* Draw a subtle blue mask surrounding eyes and mouth for cyberpunk look */}
        <ellipse cx="50" cy="65" rx="22" ry="16" fill="#0c1015" stroke="rgba(0, 183, 255, 0.4)" strokeWidth="1.5" />

        {/* Cute neon-blue cheeks */}
        <circle cx="34" cy="68" r="3" fill={colorNeonBlue} opacity="0.3" filter="url(#neonGlow)" />
        <circle cx="66" cy="68" r="3" fill={colorNeonBlue} opacity="0.3" filter="url(#neonGlow)" />

        {/* --- Eyes Area --- */}
        {renderEyes()}

        {/* --- Cute Glowing Mouth --- */}
        {/* Neutro uses simple smile, Feliz uses wide smile, Alerta/Surpreso uses little round "o" */}
        {(() => {
          if (expression === 'surpreso' || expression === 'alerta') {
            return <circle cx="50" cy="71" r="3" stroke={colorNeonBlue} strokeWidth="2" fill="none" />;
          }
          if (expression === 'feliz') {
            return <path d="M45 69 Q50 75 55 69" stroke={colorNeonBlue} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
          }
          if (expression === 'concentrado') {
            return <line x1="46" y1="71" x2="54" y2="71" stroke={colorNeonBlue} strokeWidth="2" strokeLinecap="round" />;
          }
          // Default happy smile
          return <path d="M46 70 Q50 74 54 70" stroke={colorNeonBlue} strokeWidth="2" fill="none" strokeLinecap="round" />;
        })()}

        {/* --- Pose Aid decorations --- */}
        {renderPoseAids()}
      </svg>

      {/* Styled bubble badges indicating state */}
      {showLabel && (
        <span className="mt-1 bg-[#14171C] border border-[#00B7FF]/30 text-[#7DD3FF] text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md uppercase tracking-wider scale-90 animate-pulse whitespace-nowrap z-10">
          {getPoseLabel()}
        </span>
      )}
    </div>
  );

  if (!showCardDesign) {
    return avatarMarkup;
  }

  // Beautiful DNA visual card box layout
  return (
    <div className="bg-gradient-to-br from-[#14171C] to-[#1F232A] rounded-3xl p-5 border border-[#00B7FF]/20 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 text-white group">
      {/* Absolute background scanlines to emphasize real-time offline AI aspect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,183,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
      <div className="absolute w-28 h-28 bg-[#00B7FF]/10 rounded-full blur-[40px] top-4 left-4" />
      
      {/* Anchor avatar graphics */}
      <div className="relative shrink-0 select-none bg-slate-950/40 p-4 rounded-2xl border border-white/5">
        {avatarMarkup}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[#00B7FF]/10 px-1.5 py-0.5 rounded-md border border-[#00B7FF]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[7.5px] font-mono tracking-widest text-[#7DD3FF] uppercase">LOCAL ENGINE</span>
        </div>
      </div>

      {/* Structured DNA specifications sheet */}
      <div className="flex-1 space-y-3 relative z-10 w-full text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-widest uppercase text-[#00B7FF] bg-[#00B7FF]/10 px-2 py-0.5 rounded-full border border-[#00B7FF]/20">
              Mascote Oficial de Gestão
            </span>
            <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              KitchenFlow
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">
            KAI
          </h3>
          <p className="text-[11px] text-slate-300 leading-relaxed font-semibold mt-1">
            O analista residente da sua cozinha. Kai processa todo o faturamento, metas, CMV de insumos e desempenho de canais diretamente no navegador, funcionando de forma **100% autônoma e local** sem compartilhar dados ou depender da nuvem!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#1F232A]/90 p-2 rounded-xl border border-white/5">
            <p className="text-[9px] text-[#7DD3FF]/70 uppercase font-black tracking-wider">DNA Analítico</p>
            <p className="font-bold text-white text-[11px] mt-0.5">Previsibilidade, CMV e Lucro</p>
          </div>
          <div className="bg-[#1F232A]/90 p-2 rounded-xl border border-white/5">
            <p className="text-[9px] text-emerald-400 uppercase font-black tracking-wider">Segurança Absoluta</p>
            <p className="font-bold text-white text-[11px] mt-0.5">Processamento Local Offline</p>
          </div>
        </div>

        {/* Color tokens display */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[8.5px] text-slate-400 font-bold tracking-wider uppercase">Paleta de Cores de Kai:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#14171C] border border-white/20" title="Grafite Principal (#14171C)" />
            <div className="w-3 h-3 rounded-full bg-[#1F232A] border border-white/20" title="Grafite Secundário (#1F232A)" />
            <div className="w-3 h-3 rounded-full bg-[#00B7FF]" title="Azul Neon (#00B7FF)" />
            <div className="w-3 h-3 rounded-full bg-[#7DD3FF]" title="Azul Claro (#7DD3FF)" />
            <div className="w-3 h-3 rounded-full bg-[#FFFFFF]" title="Branco (#FFFFFF)" />
          </div>
        </div>
      </div>
    </div>
  );
}
