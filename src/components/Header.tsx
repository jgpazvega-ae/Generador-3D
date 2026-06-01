import { Settings2, Sparkles } from 'lucide-react';
import type { ApiProvider } from '../types';

interface HeaderProps {
  hasConfig: boolean;
  onReconfigure: () => void;
  provider?: ApiProvider;
}

const PROVIDER_LABELS: Partial<Record<ApiProvider, string>> = {
  huggingface: 'TripoSR',
  replicate: 'Hunyuan 3D',
  meshy: 'Meshy AI',
  stability: 'SPAR3D',
  shared: 'Servidor propio',
};

export default function Header({ hasConfig, onReconfigure, provider }: HeaderProps) {
  const providerLabel = provider ? PROVIDER_LABELS[provider] : null;

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(8,8,24,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.045)',
        boxShadow: '0 1px 0 rgba(99,102,241,0.06), 0 4px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between" style={{ height: '62px' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0 animate-float-gentle">
            <div className="absolute inset-0 rounded-xl blur-sm opacity-60"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }} />
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
                 style={{
                   background: 'linear-gradient(135deg, #5b5fef 0%, #7c3aed 100%)',
                   boxShadow: '0 2px 14px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                 }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" />
                <line x1="2" y1="15.5" x2="22" y2="15.5" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-[15px] leading-tight tracking-tight flex items-center gap-1.5">
              <span className="text-white">Generador</span>
              <span className="text-gradient">3D</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-0.5"
                    style={{ background: 'rgba(99,102,241,0.12)', color: 'rgba(165,180,252,0.7)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Sparkles className="w-2.5 h-2.5" />
                IA
              </span>
            </h1>
            <p className="text-[10px] leading-tight" style={{ color: 'rgba(100,116,139,0.5)' }}>
              Imágenes → Modelo 3D
            </p>
          </div>
        </div>

        {/* Right area */}
        <div className="flex items-center gap-2">
          {hasConfig && providerLabel && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full"
                 style={{
                   background: 'rgba(99,102,241,0.07)',
                   color: 'rgba(165,180,252,0.65)',
                   border: '1px solid rgba(99,102,241,0.14)',
                 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {providerLabel}
            </div>
          )}
          {hasConfig && (
            <button
              onClick={onReconfigure}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                color: 'rgba(148,163,184,0.7)',
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, {
                background: 'rgba(99,102,241,0.1)',
                borderColor: 'rgba(99,102,241,0.28)',
                color: 'white',
              })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, {
                background: 'rgba(255,255,255,0.035)',
                borderColor: 'rgba(255,255,255,0.07)',
                color: 'rgba(148,163,184,0.7)',
              })}
              title="Cambiar proveedor de IA"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Proveedor</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
