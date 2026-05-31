import { useEffect, useState } from 'react';
import type { GenerationState } from '../types';

interface Props {
  state: GenerationState;
}

const TIPS = [
  'La IA analiza cada ángulo de la pieza para reconstruir la geometría.',
  'Más imágenes desde distintos puntos de vista = mejor calidad final.',
  'El modelo generado puede exportarse a software como Blender o Fusion 360.',
  'Las texturas se generan automáticamente a partir del color de las fotos.',
  'Puedes usar el modelo en impresoras 3D después de exportarlo como STL.',
  'El proceso usa técnicas de visión por computadora y difusión latente 3D.',
];

export default function ProcessingStep({ state }: Props) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setTipIndex((i) => (i + 1) % TIPS.length),
      4000,
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-lg mx-auto text-center py-8 space-y-8">
      {/* Animated 3D cube */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-spin-slow" />
          <div
            className="absolute inset-3 rounded-full border-2 border-purple-500/30 animate-spin-slow"
            style={{ animationDirection: 'reverse', animationDuration: '4s' }}
          />
          {/* Center cube icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center animate-pulse-slow">
              <svg
                className="w-8 h-8 text-indigo-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" />
                <line x1="2" y1="15.5" x2="22" y2="15.5" />
              </svg>
            </div>
          </div>
          {/* Orbiting dot */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50" />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Generando modelo 3D</h2>
        <p className="text-indigo-300 font-medium">{state.message || 'Procesando...'}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2 bg-[#1a1a38] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, state.progress)}%` }}
          />
        </div>
        <p className="text-slate-500 text-sm">{state.progress}% completado</p>
      </div>

      {/* Rotating tip */}
      <div className="bg-[#111128] border border-[#2a2a4a] rounded-2xl p-5 text-left">
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2">
          ¿Sabías que?
        </p>
        <p className="text-slate-300 text-sm leading-relaxed transition-all duration-500">
          {TIPS[tipIndex]}
        </p>
      </div>

      <p className="text-slate-600 text-xs">
        Esto puede tomar entre 30 segundos y varios minutos según el proveedor.
        No cierres esta página.
      </p>
    </div>
  );
}
