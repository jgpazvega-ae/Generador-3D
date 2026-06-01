import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, ChevronRight, Zap, Layers, Star, Sparkles, Server, Check, ArrowRight } from 'lucide-react';
import type { ApiConfig, ApiProvider } from '../types';
import { DEFAULT_REPLICATE_MODEL } from '../api/replicate';

interface Props {
  initialConfig: ApiConfig | null;
  onSave: (config: ApiConfig) => void;
}

interface ProviderInfo {
  id: ApiProvider;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  badgeStyle: React.CSSProperties;
  features: string[];
  stats: Array<{ label: string; value: string }>;
  docsUrl: string;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  keyLabel: string;
  keyPlaceholder: string;
  noKey?: boolean;
  isShared?: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'huggingface',
    name: 'TripoSR',
    tagline: 'Gratis · Sin registro',
    description: 'Stability AI via HuggingFace Spaces. Una foto → modelo 3D en segundos. Sujeto a disponibilidad de GPU pública.',
    badge: 'Sin API key',
    badgeStyle: { background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' },
    features: ['100% gratis', 'Sin cuenta', 'GLB + OBJ', 'Cola pública'],
    stats: [
      { label: 'Costo', value: 'Gratis' },
      { label: 'Vistas', value: '1 imagen' },
      { label: 'Tiempo', value: '~30s' },
    ],
    docsUrl: 'https://huggingface.co/spaces/stabilityai/TripoSR',
    icon: <Sparkles className="w-5 h-5" />,
    accentColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.2)',
    keyLabel: '',
    keyPlaceholder: '',
    noKey: true,
  },
  {
    id: 'meshy',
    name: 'Meshy AI',
    tagline: 'Multi-vista · 4K PBR',
    description: 'El mejor resultado multi-imagen. Texturas 4K PBR con meshy-5/6. Endpoint multi-imagen real para máxima similitud.',
    badge: 'Mejor calidad',
    badgeStyle: { background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.25)' },
    features: ['Multi-imagen', 'Texturas 4K PBR', 'GLB/FBX/OBJ', 'Créditos gratis'],
    stats: [
      { label: 'Costo', value: 'Créditos' },
      { label: 'Vistas', value: 'Hasta 4' },
      { label: 'Tiempo', value: '~2 min' },
    ],
    docsUrl: 'https://docs.meshy.ai/en/api/multi-image-to-3d',
    icon: <Layers className="w-5 h-5" />,
    accentColor: '#38bdf8',
    glowColor: 'rgba(56,189,248,0.18)',
    keyLabel: 'Meshy API Key',
    keyPlaceholder: 'msy_...',
  },
  {
    id: 'replicate',
    name: 'Hunyuan 3D',
    tagline: 'Replicate · Multivista',
    description: 'Modelo de Tencent vía Replicate. Multi-vista automático con frente/atrás/izquierda para máxima calidad de geometría.',
    badge: 'Recomendado',
    badgeStyle: { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' },
    features: ['Multi-vista', 'Alta calidad', 'Open source', 'Tier gratis'],
    stats: [
      { label: 'Costo', value: 'Por uso' },
      { label: 'Vistas', value: '1 – 4' },
      { label: 'Tiempo', value: '~3 min' },
    ],
    docsUrl: 'https://replicate.com/tencent/hunyuan3d-2',
    icon: <Star className="w-5 h-5" />,
    accentColor: '#6366f1',
    glowColor: 'rgba(99,102,241,0.2)',
    keyLabel: 'Replicate API Token',
    keyPlaceholder: 'r8_...',
  },
  {
    id: 'stability',
    name: 'Stability AI',
    tagline: 'SPAR3D · Rápido',
    description: 'Stable Point Aware 3D: predice la cara trasera no visible usando difusión 3D. Una imagen, respuesta directa.',
    badge: 'Cara trasera IA',
    badgeStyle: { background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)' },
    features: ['Predicción trasera', 'Respuesta directa', '1 imagen', 'Texturas 2K'],
    stats: [
      { label: 'Costo', value: 'Por uso' },
      { label: 'Vistas', value: '1 imagen' },
      { label: 'Tiempo', value: '~20s' },
    ],
    docsUrl: 'https://platform.stability.ai/docs/api-reference',
    icon: <Zap className="w-5 h-5" />,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.18)',
    keyLabel: 'Stability API Key',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'shared',
    name: 'Servidor propio',
    tagline: 'Proxy · Para producción',
    description: 'Conecta tu propio servidor proxy. Los usuarios finales no necesitan API key — la gestiona el servidor. Render.com gratis.',
    badge: 'Para producción',
    badgeStyle: { background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' },
    features: ['Sin key para usuarios', 'Rate limiting', 'Gratis hospedar'],
    stats: [
      { label: 'Usuarios', value: 'Sin key' },
      { label: 'Control', value: 'Total' },
      { label: 'Host', value: 'Gratis' },
    ],
    docsUrl: 'https://render.com',
    icon: <Server className="w-5 h-5" />,
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.18)',
    keyLabel: 'URL del servidor proxy',
    keyPlaceholder: 'https://mi-proxy.onrender.com',
    isShared: true,
  },
];

const SHARED_PROVIDERS = [
  { value: 'replicate', label: 'Hunyuan 3D (Replicate)' },
  { value: 'meshy', label: 'Meshy AI' },
  { value: 'stability', label: 'Stability AI (SPAR3D)' },
] as const;

// Mini step diagram for the hero
function HeroSteps() {
  const steps = [
    { icon: '📸', label: 'Foto' },
    { icon: '🤖', label: 'IA' },
    { icon: '📦', label: 'Modelo 3D' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mt-5 mb-1">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                 style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
              {s.icon}
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'rgba(100,116,139,0.7)' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="w-3.5 h-3.5 mb-4 flex-shrink-0" style={{ color: 'rgba(99,102,241,0.35)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

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

      {/* Hero header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-5 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,180,252,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}>
          Paso 1 de 3
        </div>
        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">
          De fotos a{' '}
          <span className="text-gradient">modelo 3D</span>
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'rgba(100,116,139,0.85)' }}>
          Elige el motor de IA que generará el modelo. Puedes cambiar en cualquier momento.
        </p>
        <HeroSteps />
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {PROVIDERS.map((p) => {
          const selected = provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setProvider(p.id); setError(''); }}
              className={`w-full text-left rounded-2xl transition-all duration-300 ${selected ? 'provider-card-selected' : ''}`}
              style={!selected ? {
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.055)',
              } : {}}
            >
              <div className="p-4 flex items-start gap-4">
                {/* Icon */}
                <div
                  className="mt-0.5 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    background: selected ? `linear-gradient(135deg, ${p.accentColor}cc, ${p.accentColor}88)` : 'rgba(255,255,255,0.04)',
                    color: selected ? 'white' : 'rgba(148,163,184,0.5)',
                    boxShadow: selected ? `0 4px 20px ${p.glowColor}` : 'none',
                    border: selected ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {p.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name + badge row */}
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-bold text-white text-[15px] tracking-tight">{p.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={p.badgeStyle}>
                      {p.badge}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p className="text-[11px] font-medium mb-1.5" style={{ color: selected ? `${p.accentColor}cc` : 'rgba(100,116,139,0.7)' }}>
                    {p.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    {p.description}
                  </p>

                  {/* Stats row */}
                  <div className="flex gap-4 mb-3">
                    {p.stats.map((s) => (
                      <div key={s.label}>
                        <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'rgba(71,85,105,0.8)' }}>{s.label}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: selected ? p.accentColor : 'rgba(203,213,225,0.7)' }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          background: selected ? `${p.accentColor}18` : 'rgba(255,255,255,0.03)',
                          color: selected ? `${p.accentColor}dd` : 'rgba(100,116,139,0.7)',
                          border: `1px solid ${selected ? `${p.accentColor}30` : 'rgba(255,255,255,0.05)'}`,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Check indicator */}
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 mt-1.5 flex items-center justify-center transition-all duration-300"
                  style={selected
                    ? { background: `linear-gradient(135deg, ${p.accentColor}, ${p.accentColor}88)`, boxShadow: `0 0 12px ${p.glowColor}` }
                    : { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)' }
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
              <p className="text-xs mt-2" style={{ color: 'rgba(100,116,139,0.65)' }}>
                Despliega <code className="text-violet-400">server/</code> en Render.com y pega la URL aquí.
              </p>
            </div>
            <div>
              <label className="label">Proveedor activo en el servidor</label>
              <select
                value={sharedProvider}
                onChange={(e) => setSharedProvider(e.target.value as typeof sharedProvider)}
                className="w-full rounded-xl px-4 py-3 text-white outline-none transition-all duration-200 cursor-pointer text-sm"
                style={{ background: 'rgba(4,4,16,0.92)', border: '1px solid rgba(99,102,241,0.18)' }}
              >
                {SHARED_PROVIDERS.map((sp) => (
                  <option key={sp.value} value={sp.value} style={{ background: '#0f0f25' }}>{sp.label}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm flex items-center gap-2"><span>⚠</span> {error}</p>}
          </div>
        )}

        {/* API Key input */}
        {needsKey && (
          <div className="card animate-scale-in"
               style={{ borderColor: `${current.accentColor}22` }}>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">{current.keyLabel}</label>
              <a
                href={current.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: `${current.accentColor}99` }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = current.accentColor)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = `${current.accentColor}99`)}
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
                style={{ borderColor: apiKey ? `${current.accentColor}40` : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(100,116,139,0.6)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.9)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(100,116,139,0.6)')}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'rgba(71,85,105,0.75)' }}>
              Tu API key se guarda solo en este navegador, nunca en ningún servidor.
            </p>

            {provider === 'replicate' && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <label className="label">Modelo de Replicate <span className="font-normal text-slate-600">(opcional)</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={DEFAULT_REPLICATE_MODEL}
                  value={replicateModel}
                  onChange={(e) => setReplicateModel(e.target.value)}
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'rgba(71,85,105,0.75)' }}>
                  Por defecto: <code className="text-indigo-400/80">{DEFAULT_REPLICATE_MODEL}</code>
                </p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><span>⚠</span> {error}</p>}
          </div>
        )}

        {/* No-key hint */}
        {current.noKey && (
          <div className="animate-scale-in flex items-center gap-3 rounded-xl px-4 py-3"
               style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(16,185,129,0.12)' }}>
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            </div>
            <p className="text-[13px]" style={{ color: 'rgba(110,231,183,0.8)' }}>
              No necesitas ninguna API key — puedes continuar directamente.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2.5 py-4 text-base mt-1"
          style={{ boxShadow: `0 4px 24px ${current.glowColor}, 0 4px 24px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.12)` }}
        >
          Continuar con {current.name}
          <ChevronRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
