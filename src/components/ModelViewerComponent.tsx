import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, RotateCcw, Sun } from 'lucide-react';

interface Props {
  src: string;
  poster?: string;
}

const ENVS = [
  'legacy', 'neutral', 'apartment', 'city', 'dawn',
  'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse',
] as const;

const ENV_LABELS: Record<string, string> = {
  legacy: 'Estudio', neutral: 'Neutro', apartment: 'Interior',
  city: 'Ciudad', dawn: 'Amanecer', forest: 'Bosque',
  lobby: 'Lobby', night: 'Noche', park: 'Parque',
  studio: 'Estudio Pro', sunset: 'Atardecer', warehouse: 'Almacén',
};

export default function ModelViewerComponent({ src, poster }: Props) {
  const mvRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [envIdx, setEnvIdx] = useState(1); // 'neutral' — limpio, sin tinte de color
  const [loading, setLoading] = useState(false);
  const [showEnvLabel, setShowEnvLabel] = useState(false);

  useEffect(() => {
    if (!src) return;
    setLoading(true);
    const mv = mvRef.current;
    if (!mv) return;
    const done = () => setLoading(false);
    mv.addEventListener('load', done);
    mv.addEventListener('error', done);
    return () => { mv.removeEventListener('load', done); mv.removeEventListener('error', done); };
  }, [src]);

  useEffect(() => {
    (mvRef.current as HTMLElement & { resetTurntableRotation?: () => void })?.resetTurntableRotation?.();
  }, [src]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!wrapRef.current) return;
    if (!document.fullscreenElement) {
      await wrapRef.current.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const resetCamera = () => {
    const mv = mvRef.current as HTMLElement & { resetTurntableRotation?: () => void };
    mv?.resetTurntableRotation?.();
    mv?.setAttribute('camera-orbit', 'auto auto 105%');
  };

  const cycleEnv = () => {
    setEnvIdx(i => (i + 1) % ENVS.length);
    setShowEnvLabel(true);
    setTimeout(() => setShowEnvLabel(false), 2000);
  };

  if (!src) return null;

  return (
    <div
      ref={wrapRef}
      className="viewer-wrap relative w-full h-full rounded-xl overflow-hidden group bg-[#060610]"
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#060610]">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-indigo-500/20 animate-spin-slow" />
              <div
                className="absolute inset-4 rounded-full border-[1.5px] border-purple-500/30"
                style={{ animation: 'spin 2s linear infinite reverse' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-indigo-600/20 rounded-xl flex items-center justify-center animate-pulse-slow">
                  <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <line x1="2" y1="8.5" x2="22" y2="8.5" />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 animate-spin-slow">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              </div>
            </div>
            <p className="text-slate-500 text-sm">Cargando modelo 3D…</p>
          </div>
        </div>
      )}

      <model-viewer
        ref={mvRef as React.RefObject<HTMLElement>}
        src={src}
        {...(poster ? { poster } : {})}
        alt="Modelo 3D generado"
        camera-controls=""
        auto-rotate=""
        auto-rotate-delay="1000"
        rotation-per-second="18deg"
        shadow-intensity="0.9"
        shadow-softness="1"
        exposure="1.1"
        tone-mapping="neutral"
        environment-image={ENVS[envIdx]}
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '300px',
          background: 'radial-gradient(ellipse at 50% 85%, #191540 0%, #060610 65%)',
        }}
      />

      {/* Environment flash label */}
      {showEnvLabel && (
        <div className="absolute top-3 left-3 animate-fade-in pointer-events-none">
          <span className="text-xs text-white/60 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
            {ENV_LABELS[ENVS[envIdx]]}
          </span>
        </div>
      )}

      {/* Hover controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
        <button onClick={resetCamera} className="viewer-btn" title="Resetear cámara">
          <RotateCcw className="w-[15px] h-[15px]" />
        </button>
        <button onClick={cycleEnv} className="viewer-btn" title="Cambiar iluminación">
          <Sun className="w-[15px] h-[15px]" />
        </button>
        <button onClick={toggleFullscreen} className="viewer-btn" title={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}>
          {isFullscreen ? <Minimize2 className="w-[15px] h-[15px]" /> : <Maximize2 className="w-[15px] h-[15px]" />}
        </button>
      </div>

      {/* Usage hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <span className="text-[10px] text-white/30 whitespace-nowrap">
          Arrastra para rotar · Scroll para zoom
        </span>
      </div>
    </div>
  );
}
