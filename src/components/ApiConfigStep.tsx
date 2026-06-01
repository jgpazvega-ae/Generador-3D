import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, ChevronRight, Zap, Layers, Star, Sparkles, Server, Check } from 'lucide-react';
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
  badgeStyle: React.CSSProperties;
  features: string[];
  docsUrl: string;
  icon: React.ReactNode;
  iconGradient: string;
  keyLabel: string;
  keyPlaceholder: string;
  noKey?: boolean;
  isShared?: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'huggingface',
    name: 'TripoSR — Gratis',
    description: 'Sin API key. Stability AI vía HuggingFace Spaces. Una imagen → modelo 3D. Sujeto a disponibilidad de GPU.',
    badge: 'Sin API key',
    badgeStyle: { background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' },
    features: ['100% gratis', 'Sin registro', 'GLB + OBJ', 'Cola pública'],
    docsUrl: 'https://huggingface.co/spaces/stabilityai/TripoSR',
    icon: <Sparkles className="w-5 h-5" />,
    iconGradient: 'linear-gradient(135deg, #10b981, #059669)',
    keyLabel: '',
    keyPlaceholder: '',
    noKey: true,
  },
  {
    id: 'shared',
    name: 'Servidor propio',
    description: 'Conecta tu propio proxy. Los usuarios no necesitan API key — la gestiona el servidor. Render.com gratis.',
    badge: 'Para producción',
    badgeStyle: { background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' },
    features: ['Sin key para usuarios', 'Rate limiting', 'Gratis hospedar'],
    docsUrl: 'https://render.com',
    icon: <Server className="w-5 h-5" />,
    iconGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    keyLabel: 'URL del servidor proxy',
    keyPlaceholder: 'https://mi-proxy.onrender.com',
    isShared: true,
  },
  {
    id: 'replicate',
    name: 'Hunyuan 3D (Replicate)',
    description: 'Modelo de Tencent. Multivista automático con varias fotos para máxima calidad.',
    badge: 'Recomendado',
    badgeStyle: { background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' },
    features: ['Multivista', 'Alta calidad', 'Open source', 'Tier gratis'],
    docsUrl: 'https://replicate.com/tencent/hunyuan3d-2',
    icon: <Star className="w-5 h-5" />,
    iconGradient: 'linear-gradient(135deg, #6366f1, #4338ca)',
    keyLabel: 'Replicate API Token',
    keyPlaceholder: 'r8_...',
  },
  {
    id: 'meshy',
    name: 'Meshy AI',
    description: 'Mejor multi-vista. Texturas 4K PBR con meshy-5/6. Endpoint multi-imagen real.',
    badge: 'Mejor multi-vista',
    badgeStyle: { background: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' },
    features: ['Multi-imagen', 'Texturas 4K PBR', 'GLB/FBX/OBJ', 'Créditos gratis'],
    docsUrl: 'https://docs.meshy.ai/en/api/multi-image-to-3d',
    icon: <Layers className="w-5 h-5" />,
    iconGradient: 'linear-gradient(135deg, #10b981, #0d9488)',
    keyLabel: 'Meshy API Key',
    keyPlaceholder: 'msy_...',
  },
  {
    id: 'stability',
    name: 'Stability AI (SPAR3D)',
    description: 'Stable Point Aware 3D: predice la parte trasera no visible. Una imagen, muy rápido.',
    badge: 'Backside AI',
    badgeStyle: { background: 'rgba(245,158,11,0.10)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' },
    features: ['Predicción trasera', 'Respuesta directa', '1 imagen', 'Texturas 2K'],
    docsUrl: 'https://platform.stability.ai/docs/api-reference',
    icon: <Zap className="w-5 h-5" />,
    iconGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    keyLabel: 'Stability API Key',
    keyPlaceholder: 'sk-...',
  },
];

const SHARED_PROVIDERS = [
  { value: 'replicate', label: 'Hunyuan 3D (Replicate)' },
  { value: 'meshy', label: 'Meshy AI' },
  { value: 'stability', label: 'Stability AI (SPAR3D)' },
] as const;

export default function ApiConfigStep({ initialConfig, onSave }: Props) {
  const [provider, setProvider] = useState<ApiProvider>(
    initialConfig?.provider ?? 'huggingface',
  );
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? '');
  const [replicateModel, setReplicateModel] = useState(
    initialConfig?.replicateModel ?? '',
  );
  const [proxyUrl, setProxyUrl] = useState(initialConfig?.proxyUrl ?? '');
  const [sharedProvider, setSharedProvider] = useState<'replicate' | 'meshy' | 'stability'>(
    initialConfig?.sharedProvider ?? 'replicate',
  );
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const current = PROVIDERS.find((p) => p.id === provider)!;
  const needsKey = !current.noKey && !current.isShared;
  const isShared = provider === 'shared';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isShared && !proxyUrl.trim()) {
      setError('Por favor ingresa la URL de tu servidor proxy');
      return;
    }
    if (needsKey && !apiKey.trim()) {
      setError('Por favor ingresa tu API key');
      return;
    }
    setError('');
    onSave({
      provider,
      apiKey: apiKey.trim(),
      replicateModel: replicateModel.trim() || DEFAULT_REPLICATE_MODEL,
      proxyUrl: proxyUrl.trim() || undefined,
      sharedProvider: isShared ? sharedProvider : undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,180,252,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}>
          Paso 1 de 3
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Elige tu proveedor <span className="text-gradient">de IA</span>
        </h2>
        <p className="text-slate-500 text-sm">
          Selecciona el servicio que generará el modelo 3D
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {PROVIDERS.map((p) => {
          const selected = provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setProvider(p.id); setError(''); }}
              className={`w-full text-left rounded-2xl p-4 transition-all duration-300 ${selected ? 'provider-card-selected' : ''}`}
              style={!selected ? {
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              } : {}}
              onMouseEnter={e => {
                if (!selected) Object.assign((e.currentTarget as HTMLElement).style, {
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.1)',
                });
              }}
              onMouseLeave={e => {
                if (!selected) Object.assign((e.currentTarget as HTMLElement).style, {
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                });
              }}
            >
              <div className="flex items-start gap-3.5">
                {/* Icon */}
                <div
                  className="mt-0.5 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all duration-300"
                  style={{
                    background: selected ? p.iconGradient : 'rgba(255,255,255,0.04)',
                    color: selected ? 'white' : 'rgba(148,163,184,0.6)',
                    boxShadow: selected ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
                    border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {p.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white text-[15px]">{p.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={p.badgeStyle}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'rgba(148,163,184,0.65)' }}>
                    {p.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="text-[11px] px-2 py-0.5 rounded-full transition-colors"
                        style={{
                          background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                          color: selected ? 'rgba(165,180,252,0.9)' : 'rgba(100,116,139,0.8)',
                          border: `1px solid ${selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Check indicator */}
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 mt-1 flex items-center justify-center transition-all duration-300"
                  style={selected
                    ? { background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)' }
                  }
                >
                  {selected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
              </div>
            </button>
          );
        })}

        {/* Shared proxy config */}
        {isShared && (
          <div className="card space-y-4 animate-scale-in">
            <div>
              <label className="label">URL del servidor proxy</label>
              <input
                type="url"
                className="input-field"
                placeholder="https://mi-proxy.onrender.com"
                value={proxyUrl}
                onChange={(e) => { setProxyUrl(e.target.value); setError(''); }}
                autoComplete="off"
              />
              <p className="text-xs mt-2" style={{ color: 'rgba(100,116,139,0.7)' }}>
                Despliega el código de{' '}
                <code className="text-violet-400">server/</code>
                {' '}en Render.com y pega la URL aquí.
              </p>
            </div>

            <div>
              <label className="label">Proveedor activo en el servidor</label>
              <select
                value={sharedProvider}
                onChange={(e) => setSharedProvider(e.target.value as typeof sharedProvider)}
                className="w-full rounded-xl px-4 py-3 text-white outline-none transition-all duration-200 cursor-pointer text-sm"
                style={{
                  background: 'rgba(5,5,18,0.9)',
                  border: '1px solid rgba(99,102,241,0.18)',
                }}
              >
                {SHARED_PROVIDERS.map((sp) => (
                  <option key={sp.value} value={sp.value} style={{ background: '#0f0f25' }}>{sp.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <span>⚠</span> {error}
              </p>
            )}
          </div>
        )}

        {/* API Key input */}
        {needsKey && (
          <div className="card animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">{current.keyLabel}</label>
              <a
                href={current.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'rgba(99,102,241,0.8)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#a5b4fc')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(99,102,241,0.8)')}
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
                onChange={(e) => { setApiKey(e.target.value); setError(''); }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(100,116,139,0.7)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.9)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.7)')}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'rgba(71,85,105,0.8)' }}>
              Tu API key se guarda solo en este navegador, nunca en ningún servidor.
            </p>

            {provider === 'replicate' && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <label className="label">Modelo de Replicate (opcional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={DEFAULT_REPLICATE_MODEL}
                  value={replicateModel}
                  onChange={(e) => setReplicateModel(e.target.value)}
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'rgba(71,85,105,0.8)' }}>
                  Por defecto:{' '}
                  <code className="text-indigo-400/80">{DEFAULT_REPLICATE_MODEL}</code>
                </p>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm mt-3 flex items-center gap-2">
                <span>⚠</span> {error}
              </p>
            )}
          </div>
        )}

        {/* No-key provider hint */}
        {current.noKey && (
          <div className="animate-scale-in flex items-start gap-3 rounded-xl px-4 py-3"
               style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 stroke-[2.5]" />
            <p className="text-[13px]" style={{ color: 'rgba(110,231,183,0.8)' }}>
              No necesitas ninguna API key. Puedes continuar directamente.
            </p>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base mt-2"
        >
          Continuar con {current.name}
          <ChevronRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
