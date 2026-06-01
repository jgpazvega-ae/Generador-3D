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
  'El proceso usa visión por computadora y deep learning 3D.',
  'Con fondo eliminado la IA detecta mejor los bordes del objeto.',
];

export default function ProcessingStep({ state }: Props) {
  const [tipIdx, setTipIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(i => i + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedStr = tick < 60 ? `${tick}s` : `${Math.floor(tick / 60)}m ${tick % 60}s`;
  const progress = Math.max(5, state.progress);

  return (
    <div className="max-w-lg mx-auto py-10 space-y-10 animate-slide-up">
      {/* Central animation */}
      <div className="flex justify-center">
        <div className="relative w-36 h-36">
          <div className="absolute inset-0 rounded-full border border-indigo-500/15 animate-spin-slow" />
          <div
            className="absolute inset-4 rounded-full border border-purple-500/20"
            style={{ animation: 'spin 4s linear infinite reverse' }}
          />
          <div className="absolute inset-0 rounded-full bg-indigo-600/5 animate-pulse-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-indigo-600/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center animate-float">
              <svg className="w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" />
                <line x1="2" y1="15.5" x2="22" y2="15.5" />
              </svg>
            </div>
          </div>
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_12px_4px_rgba(99,102,241,0.6)]" />
          </div>
          <div className="absolute inset-6" style={{ animation: 'spin 2.5s linear infinite reverse' }}>
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_2px_rgba(168,85,247,0.5)]" />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Generando modelo 3D</h2>
        <p className="text-indigo-300/90 font-medium text-sm min-h-[1.25rem]">{state.message || 'Procesando…'}</p>
        <p className="text-slate-600 text-xs">Tiempo transcurrido: {elapsedStr}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2.5">
        <div className="h-2 bg-[#111128] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4338ca, #7c3aed)',
              boxShadow: '0 0 12px rgba(99,102,241,0.4)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>{progress}% completado</span>
          <span>{progress < 100 ? 'No cierres esta página' : '¡Listo!'}</span>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-[#0d0d20] border border-[#232340] rounded-2xl p-5">
        <p className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-widest mb-2">¿Sabías que?</p>
        <p className="text-slate-300 text-sm leading-relaxed transition-all duration-500">{TIPS[tipIdx]}</p>
      </div>
    </div>
  );
}
