import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { ApiProvider, GenerationState, UploadedImage } from '../types';

interface Props {
  state: GenerationState;
  images?: UploadedImage[];
  provider?: ApiProvider;
  onCancel?: () => void;
}

const TIPS = [
  'Más ángulos = geometría más precisa en zonas difíciles.',
  'El modelo puede exportarse a Blender, Fusion 360 o impresoras 3D.',
  'Las texturas se generan a partir del color y luz de tus fotos.',
  'Multi-vista combina ángulos en vez de adivinar las caras ocultas.',
  'SPAR3D predice la parte trasera no visible usando difusión 3D.',
  'TripoSR usa una red transformer para reconstrucción en un solo paso.',
  'Con fondo eliminado la IA detecta mejor los bordes del objeto.',
  'Meshy AI genera texturas PBR separadas: albedo, roughness y normal map.',
];

const STAGE_LABELS = [
  { label: 'Subiendo',    threshold: 10 },
  { label: 'Procesando', threshold: 50 },
  { label: 'Finalizando', threshold: 95 },
];

const PROVIDER_HINTS: Partial<Record<ApiProvider, { title: string; body: string; color: string }>> = {
  huggingface: {
    title: 'El espacio de HuggingFace puede tardar 2–3 min en iniciarse',
    body: 'TripoSR corre en una GPU pública compartida. Si está inactiva, el servidor tarda en arrancar antes de procesar tu imagen. Es normal — no es un error.',
    color: 'rgba(245,158,11,0.08)',
  },
  replicate: {
    title: 'Hunyuan 3D suele tardar 2–5 minutos',
    body: 'El modelo reconstruye geometría compleja desde múltiples ángulos. La primera ejecución puede arrancar un contenedor nuevo en Replicate.',
    color: 'rgba(99,102,241,0.07)',
  },
};

export default function ProcessingStep({ state, images = [], provider, onCancel }: Props) {
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIdx(i => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 350);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(i => i + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedStr = tick < 60 ? `${tick}s` : `${Math.floor(tick / 60)}m ${tick % 60}s`;
  const progress = Math.max(5, state.progress);

  return (
    <div className="max-w-lg mx-auto py-6 space-y-7 animate-slide-up">

      {/* Central 3D animation */}
      <div className="flex justify-center">
        <div className="relative w-44 h-44">
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full animate-glow" style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          }} />

          {/* Rings */}
          <div className="absolute inset-0 rounded-full animate-spin-slow"
               style={{ border: '1px solid rgba(99,102,241,0.18)' }} />
          <div className="absolute inset-3 rounded-full"
               style={{ border: '1px solid rgba(139,92,246,0.12)', animation: 'spin 7s linear infinite reverse' }} />
          <div className="absolute inset-7 rounded-full"
               style={{ border: '1px dashed rgba(99,102,241,0.10)', animation: 'spin 4.5s linear infinite' }} />

          {/* Orbit particles */}
          <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
            <div className="relative w-full h-full">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-2.5 h-2.5 rounded-full"
                   style={{ background: '#6366f1', boxShadow: '0 0 14px 5px rgba(99,102,241,0.55)' }} />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ animation: 'spin 4s linear infinite reverse' }}>
            <div className="relative w-4/5 h-4/5">
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
                   style={{ background: '#a78bfa', boxShadow: '0 0 10px 4px rgba(167,139,250,0.5)' }} />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ animation: 'spin 8s linear infinite' }}>
            <div className="relative w-[60%] h-[60%]">
              <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full"
                   style={{ background: '#38bdf8', boxShadow: '0 0 8px 3px rgba(56,189,248,0.5)' }} />
            </div>
          </div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
                 style={{
                   background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.10) 100%)',
                   border: '1px solid rgba(99,102,241,0.28)',
                   boxShadow: '0 0 32px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.07)',
                 }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" strokeWidth="1.5">
                <defs>
                  <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" />
                <line x1="2" y1="15.5" x2="22" y2="15.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Generando modelo 3D</h2>
        <p className="text-sm font-medium min-h-[1.5rem] transition-all duration-300"
           style={{ color: 'rgba(165,180,252,0.9)' }}>
          {state.message || 'Procesando…'}
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <span style={{ color: 'rgba(71,85,105,0.65)' }}>
            Tiempo: <span className="font-mono font-semibold" style={{ color: 'rgba(100,116,139,0.8)' }}>{elapsedStr}</span>
          </span>
          <span style={{ color: 'rgba(51,65,85,0.5)' }}>·</span>
          <span style={{ color: 'rgba(71,85,105,0.6)' }}>Mantén la pestaña abierta</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="relative h-2.5 rounded-full overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4338ca 0%, #6366f1 55%, #818cf8 100%)',
              boxShadow: '0 0 18px rgba(99,102,241,0.65), 0 0 4px rgba(99,102,241,0.9)',
            }}
          />
          <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
               style={{
                 width: `${progress}%`,
                 background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                 backgroundSize: '200% auto',
                 animation: 'shimmer 1.8s linear infinite',
               }} />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="font-semibold" style={{ color: 'rgba(165,180,252,0.65)' }}>{progress}%</span>
          <span style={{ color: 'rgba(71,85,105,0.7)' }}>{progress < 100 ? 'Procesando en la nube…' : '¡Listo!'}</span>
        </div>
      </div>

      {/* Stage indicators */}
      <div className="grid grid-cols-3 gap-2">
        {STAGE_LABELS.map(({ label, threshold }, idx) => {
          const done = progress > threshold;
          const active = !done && (idx === 0 ? progress <= threshold : progress > STAGE_LABELS[idx - 1].threshold);
          return (
            <div key={label} className="text-center rounded-xl py-3 transition-all duration-500"
                 style={{
                   background: done
                     ? 'rgba(16,185,129,0.07)'
                     : active
                     ? 'rgba(99,102,241,0.07)'
                     : 'rgba(255,255,255,0.018)',
                   border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`,
                 }}>
              <div className="w-1.5 h-1.5 rounded-full mx-auto mb-1.5 transition-all duration-500"
                   style={{
                     background: done ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.1)',
                     boxShadow: done ? '0 0 6px rgba(16,185,129,0.6)' : active ? '0 0 6px rgba(99,102,241,0.6)' : 'none',
                   }} />
              <span className="text-[11px] font-semibold transition-colors duration-500"
                    style={{ color: done ? 'rgba(52,211,153,0.9)' : active ? 'rgba(165,180,252,0.9)' : 'rgba(71,85,105,0.6)' }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Uploaded image previews */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-center"
             style={{ color: 'rgba(71,85,105,0.7)' }}>
            Imágenes enviadas
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {images.map((img, i) => (
              <div key={img.id}
                   className="relative w-14 h-14 rounded-xl overflow-hidden animate-pop-in"
                   style={{
                     border: '1px solid rgba(99,102,241,0.25)',
                     animationDelay: `${i * 80}ms`,
                     boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                   }}>
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0.5 inset-x-0 text-center">
                  <span className="text-[8px] text-white/70 font-medium">{img.angle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition-all duration-200"
            style={{
              color: 'rgba(100,116,139,0.7)',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, {
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.2)',
              color: 'rgba(248,113,113,0.85)',
            })}
            onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, {
              background: 'rgba(255,255,255,0.025)',
              borderColor: 'rgba(255,255,255,0.06)',
              color: 'rgba(100,116,139,0.7)',
            })}
          >
            <X className="w-3.5 h-3.5" />
            Cancelar y volver
          </button>
        </div>
      )}

      {/* Provider-specific hint */}
      {provider && PROVIDER_HINTS[provider] && tick < 30 && (
        <div className="rounded-2xl overflow-hidden animate-slide-up"
             style={{ background: PROVIDER_HINTS[provider]!.color, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(253,230,138,0.7)' }} />
            <div>
              <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(253,230,138,0.85)' }}>
                {PROVIDER_HINTS[provider]!.title}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.7)' }}>
                {PROVIDER_HINTS[provider]!.body}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tip box */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #6366f1, #7c3aed, #38bdf8, transparent)' }} />
        <div className="p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5"
             style={{ color: 'rgba(99,102,241,0.7)' }}>
            ¿Sabías que?
          </p>
          <p className="text-sm leading-relaxed transition-all duration-350"
             style={{
               color: 'rgba(148,163,184,0.85)',
               opacity: tipVisible ? 1 : 0,
               transform: tipVisible ? 'translateY(0)' : 'translateY(5px)',
             }}>
            {TIPS[tipIdx]}
          </p>
        </div>
      </div>
    </div>
  );
}
