import { Settings2 } from 'lucide-react';

interface HeaderProps {
  hasConfig: boolean;
  onReconfigure: () => void;
}

export default function Header({ hasConfig, onReconfigure }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080814]/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-15 flex items-center justify-between" style={{ height: '60px' }}>
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="8.5" x2="22" y2="8.5" />
                <line x1="2" y1="15.5" x2="22" y2="15.5" />
              </svg>
            </div>
          </div>

          <div>
            <h1 className="text-white font-bold text-base leading-tight tracking-tight">
              Generador <span className="text-indigo-400">3D</span>
            </h1>
            <p className="text-[10px] text-slate-500 leading-tight">Fotos → Modelo 3D con IA</p>
          </div>
        </div>

        {hasConfig && (
          <button
            onClick={onReconfigure}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs
                       bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07]
                       hover:border-white/[0.15] px-3 py-1.5 rounded-lg transition-all duration-200"
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
