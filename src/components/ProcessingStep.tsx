import { useEffect, useState } from 'react';
import type { GenerationState } from '../types';

interface Props {
  state: GenerationState;
}

const TIPS = [
  'Más ángulos = geometría más precisa en zonas difíciles.',
  'El modelo puede exportarse a Blender, Fusion 360 o impresoras 3D.',
  'Las texturas se generan a partir del color y luz de tus fotos.',
  'Multi-vista combina ángulos en vez de adivinar las caras ocultas.',
  'SPAR3D predice la parte trasera no visible usando difusión 3D.',
  'TripoSR usa una red transformer para reconstrucción en un solo paso.',
  'Con fondo eliminado la IA detecta mejor los bordes del objeto.',
];

export default function ProcessingStep({ state }: Props) {
  const [tipIdx, setTipIdx] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIdx(i => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(i => i + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedStr = tick < 60 ? `${tick}s` : `${Math.floor(tick / 60)}m ${tick % 60}s`;
  const progress = Math.max(5, state.progress);

  return (
    <div className="max-w-md mx-auto py-8 space-y-8 animate-slide-up">

      {/* Central 3D animation */}
      <div className="flex justify-center">
        <div className="relative w-44 h-44">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full animate-glow" style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          }} />

          {/* Ring 1 — slow spin */}
          <div className="absolute inset-0 rounded-full animate-spin-slow" style={{
            border: '1px solid rgba(99,102,241,0.2)',
          }} />

          {/* Ring 2 — reverse + medium */}
          <div className="absolute inset-3 rounded-full" style={{
            border: '1px solid rgba(139,92,246,0.15)',
            animation: 'spin 6s linear infinite reverse',
          }} />

          {/* Ring 3 — dashes */}
          <div className="absolute inset-7 rounded-full" style={{
            border: '1px dashed rgba(99,102,241,0.12)',
            animation: 'spin 4s linear infinite',
          }} />

          {/* Orbit particle 1 */}
          <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
            <div className="relative w-full h-full">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-2.5 h-2.5 rounded-full"
                   style={{ background: '#6366f1', boxShadow: '0 0 12px 4px rgba(99,102,241,0.55)' }} />
            </div>
          </div>

          {/* Orbit particle 2 — reverse + smaller */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'spin 4s linear infinite reverse' }}>
            <div className="relative w-4/5 h-4/5">
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full"
                   style={{ background: '#a78bfa', boxShadow: '0 0 8px 3px rgba(167,139,250,0.5)' }} />
            </div>
          </div>

          {/* Orbit particle 3 */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'spin 7s linear infinite' }}>
            <div className="relative w-[65%] h-[65%]">
              <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full"
                   style={{ background: '#38bdf8', boxShadow: '0 0 8px 3px rgba(56,189,248,0.45)' }} />
            </div>
          </div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
                 style={{
                   background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.12) 100%)',
                   border: '1px solid rgba(99,102,241,0.3)',
                   boxShadow: '0 0 30px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
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

      {/* Status */}
      <div className="text-center space-y-2.5">
        <h2 className="text-2xl font-bold text-white">Generando modelo 3D</h2>
        <p className="text-sm font-medium min-h-[1.5rem] transition-all duration-300" style={{ color: 'rgba(165,180,252,0.9)' }}>
          {state.message || 'Procesando…'}
        </p>
        <p className="text-xs" style={{ color: 'rgba(71,85,105,0.7)' }}>Tiempo transcurrido: {elapsedStr}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4338ca, #7c3aed, #6366f1)',
              boxShadow: '0 0 12px rgba(99,102,241,0.5)',
            }}
          />
          {/* Shimmer overlay */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
              backgroundSize: '200% auto',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px]" style={{ color: 'rgba(71,85,105,0.8)' }}>
          <span>{progress}% completado</span>
          <span>{progress < 100 ? 'No cierres esta página' : '¡Listo!'}</span>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl overflow-hidden" style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Accent top border */}
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #6366f1, #7c3aed, transparent)' }} />
        <div className="p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5" style={{ color: 'rgba(99,102,241,0.7)' }}>
            ¿Sabías que?
          </p>
          <p
            className="text-sm leading-relaxed transition-all duration-300"
            style={{
              color: 'rgba(148,163,184,0.85)',
              opacity: tipVisible ? 1 : 0,
              transform: tipVisible ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            {TIPS[tipIdx]}
          </p>
        </div>
      </div>

      {/* Stage indicators */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Subiendo', done: progress > 10 },
          { label: 'Procesando', done: progress > 50 },
          { label: 'Finalizando', done: progress >= 95 },
        ].map(({ label, done }) => (
          <div key={label} className="text-center rounded-xl py-2.5 transition-all duration-500"
               style={{
                 background: done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                 border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
               }}>
            <div className="w-1.5 h-1.5 rounded-full mx-auto mb-1.5 transition-all duration-500"
                 style={{ background: done ? '#10b981' : 'rgba(255,255,255,0.12)' }} />
            <span className="text-[11px] font-medium transition-colors duration-500"
                  style={{ color: done ? 'rgba(52,211,153,0.9)' : 'rgba(71,85,105,0.7)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
