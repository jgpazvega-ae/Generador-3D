import { Settings2 } from 'lucide-react';

interface HeaderProps {
  hasConfig: boolean;
  onReconfigure: () => void;
}

export default function Header({ hasConfig, onReconfigure }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.05]"
            style={{ background: 'rgba(7,7,26,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between" style={{ height: '60px' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-xl blur-md opacity-50"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }} />
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #5b5fef 0%, #7c3aed 100%)',
                          boxShadow: '0 2px 12px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" />
                <line x1="2" y1="15.5" x2="22" y2="15.5" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-[15px] leading-tight tracking-tight">
              <span className="text-white">Generador </span>
              <span className="text-gradient">3D</span>
            </h1>
            <p className="text-[10px] leading-tight" style={{ color: 'rgba(148,163,184,0.45)' }}>
              Imágenes → Modelo 3D con IA
            </p>
          </div>
        </div>

        {hasConfig && (
          <button
            onClick={onReconfigure}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{
              color: 'rgba(148,163,184,0.75)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, {
              background: 'rgba(99,102,241,0.12)',
              borderColor: 'rgba(99,102,241,0.3)',
              color: 'white',
            })}
            onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, {
              background: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.07)',
              color: 'rgba(148,163,184,0.75)',
            })}
            title="Cambiar proveedor de IA"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Proveedor</span>
          </button>
        )}
      </div>
    </header>
  );
}
