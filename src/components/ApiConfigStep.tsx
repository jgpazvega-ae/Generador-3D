import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, ChevronRight, Zap, Layers, Star, Sparkles } from 'lucide-react';
import type { ApiConfig, ApiProvider } from '../types';
import { DEFAULT_REPLICATE_MODEL } from '../api/replicate';

interface Props {
  initialConfig: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
}

interface ProviderInfo {
  id: ApiProvider;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  features: string[];
  docsUrl: string;
  icon: React.ReactNode;
  keyLabel: string;
  keyPlaceholder: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'huggingface',
    name: 'Gratis — TripoSR (HuggingFace)',
    description: 'Sin API key. Usa TripoSR de Stability AI vía HuggingFace Spaces. Una imagen → modelo 3D OBJ. Sujeto a disponibilidad de GPU.',
    badge: 'Sin API key',
    badgeColor: 'bg-green-500/20 text-green-300 border border-green-500/30',
    features: ['100% gratis', 'Sin registro', 'OBJ descargable', 'Cola pública'],
    docsUrl: 'https://huggingface.co/spaces/stabilityai/TripoSR',
    icon: <Sparkles className="w-5 h-5" />,
    keyLabel: '',
    keyPlaceholder: '',
  },
  {
    id: 'replicate',
    name: 'Hunyuan 3D (Replicate)',
    description: 'El modelo de Tencent del video. Usa hunyuan3d-2mv (multivista) automáticamente con varias fotos.',
    badge: 'Recomendado',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    features: ['Multivista (mv)', 'Alta calidad', 'Open source', 'Gratis (tier)'],
    docsUrl: 'https://replicate.com/tencent/hunyuan3d-2',
    icon: <Star className="w-5 h-5" />,
    keyLabel: 'Replicate API Token',
    keyPlaceholder: 'r8_...',
  },
  {
    id: 'meshy',
    name: 'Meshy AI',
    description: 'Mejor reconstrucción multi-vista. Endpoint multi-imagen, texturas 4K PBR (meshy-5/6).',
    badge: 'Mejor multi-vista',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    features: ['Multi-imagen real', 'Texturas 4K PBR', 'GLB/FBX/OBJ', 'Créditos gratis'],
    docsUrl: 'https://docs.meshy.ai/en/api/multi-image-to-3d',
    icon: <Layers className="w-5 h-5" />,
    keyLabel: 'Meshy API Key',
    keyPlaceholder: 'msy_...',
  },
  {
    id: 'stability',
    name: 'Stability AI (SPAR3D)',
    description: 'Stable Point Aware 3D: predice la parte trasera no visible. Una imagen, muy rápido.',
    badge: 'Backside AI',
    badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    features: ['Predicción trasera', 'Respuesta directa', '1 imagen', 'Texturas 2K'],
    docsUrl: 'https://platform.stability.ai/docs/api-reference',
    icon: <Zap className="w-5 h-5" />,
    keyLabel: 'Stability API Key',
    keyPlaceholder: 'sk-...',
  },
];

export default function ApiConfigStep({ initialConfig, onSave }: Props) {
  const [provider, setProvider] = useState<ApiProvider>(
    initialConfig?.provider ?? 'huggingface',
  );
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? '');
  const [replicateModel, setReplicateModel] = useState(
    initialConfig?.replicateModel ?? '',
  );
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const current = PROVIDERS.find((p) => p.id === provider)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (provider !== 'huggingface' && !apiKey.trim()) {
      setError('Por favor ingresa tu API key');
      return;
    }
    setError('');
    onSave({
      provider,
      apiKey: apiKey.trim(),
      replicateModel: replicateModel.trim() || DEFAULT_REPLICATE_MODEL,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Configura tu proveedor de IA
        </h2>
        <p className="text-slate-400">
          Elige el servicio que usará la IA para generar tu modelo 3D
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider cards */}
        <div className="space-y-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`
                w-full text-left rounded-2xl border p-4 transition-all duration-200
                ${
                  provider === p.id
                    ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                    : 'border-[#2a2a4a] bg-[#111128] hover:border-[#3a3a5a]'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    provider === p.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1a1a38] text-slate-400'
                  }`}
                >
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className={`badge ${p.badgeColor}`}>{p.badge}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="text-xs text-slate-500 bg-[#0f0f25] px-2 py-0.5 rounded-full border border-[#2a2a4a]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-2.5 transition-colors ${
                    provider === p.id
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-[#3a3a5a]'
                  }`}
                >
                  {provider === p.id && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* API Key input — hidden for free HuggingFace provider */}
        <div className={`card mt-2 ${provider === 'huggingface' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">{current.keyLabel}</label>
            <a
              href={current.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Obtener key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder={current.keyPlaceholder}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Tu API key se guarda solo en este navegador, nunca en ningún servidor.
          </p>

          {/* Replicate model override */}
          {provider === 'replicate' && (
            <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
              <label className="label">Modelo de Replicate (opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder={DEFAULT_REPLICATE_MODEL}
                value={replicateModel}
                onChange={(e) => setReplicateModel(e.target.value)}
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Por defecto usa{' '}
                <code className="text-indigo-400">{DEFAULT_REPLICATE_MODEL}</code>.
                Puedes cambiarlo a cualquier modelo de Replicate compatible.
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-3 flex items-center gap-2">
              <span>⚠</span> {error}
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
          Continuar
          <ChevronRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
