import { Settings } from 'lucide-react';

interface HeaderProps {
  hasConfig: boolean;
  onReconfigure: () => void;
}

export default function Header({ hasConfig, onReconfigure }: HeaderProps) {
  return (
    <header className="border-b border-[#1e1e3f] bg-[#0a0a16]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="8.5" x2="22" y2="8.5" />
              <line x1="2" y1="15.5" x2="22" y2="15.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">
              Generador 3D
            </h1>
            <p className="text-xs text-slate-500 leading-tight">
              Imágenes → Modelo 3D con IA
            </p>
          </div>
        </div>

        {hasConfig && (
          <button
            onClick={onReconfigure}
            className="btn-ghost flex items-center gap-2 text-sm"
            title="Cambiar configuración de API"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">API</span>
          </button>
        )}
      </div>
    </header>
  );
}
