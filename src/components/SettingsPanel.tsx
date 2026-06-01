import { Sparkles, Scissors, Ruler, Info } from 'lucide-react';
import type { GenerationSettings, QualityPreset } from '../types';
import { QUALITY_PROFILES } from '../types';

interface Props {
  value: GenerationSettings;
  onChange: (s: GenerationSettings) => void;
  hasMeasurements: boolean;
}

const PRESETS: QualityPreset[] = ['draft', 'standard', 'max'];

export default function SettingsPanel({ value, onChange, hasMeasurements }: Props) {
  return (
    <div className="card-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#1a1a38] rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="font-medium text-white text-sm">Calidad y precisión</span>
      </div>

      {/* Quality preset */}
      <div>
        <label className="label text-xs">Nivel de calidad</label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const profile = QUALITY_PROFILES[p];
            const active = value.quality === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ ...value, quality: p })}
                className={`rounded-lg px-2 py-2.5 text-center transition-all border ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-[#0f0f25] border-[#2a2a4a] text-slate-400 hover:border-indigo-500/50'
                }`}
              >
                <span className="text-sm font-semibold block">{profile.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {QUALITY_PROFILES[value.quality].description}
        </p>
      </div>

      {/* Toggles */}
      <div className="space-y-2.5 pt-1">
        <Toggle
          icon={<Scissors className="w-4 h-4" />}
          title="Eliminar fondo automáticamente"
          subtitle="Aísla la pieza para máxima similitud (recomendado)"
          checked={value.removeBackground}
          onChange={(v) => onChange({ ...value, removeBackground: v })}
        />
        <Toggle
          icon={<Ruler className="w-4 h-4" />}
          title="Escalar a medidas reales"
          subtitle={
            hasMeasurements
              ? 'El modelo tendrá las dimensiones físicas exactas'
              : 'Agrega medidas abajo para activar esto'
          }
          checked={value.scaleToMeasurements && hasMeasurements}
          disabled={!hasMeasurements}
          onChange={(v) => onChange({ ...value, scaleToMeasurements: v })}
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500 bg-[#0f0f25] rounded-lg p-2.5 border border-[#2a2a4a]">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
        <span>
          La eliminación de fondo se ejecuta en tu navegador la primera vez
          (descarga un modelo ligero). Mejora notablemente el parecido.
        </span>
      </div>
    </div>
  );
}

interface ToggleProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ icon, title, subtitle, checked, disabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 rounded-lg p-2.5 border text-left transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-[#2a2a4a] bg-[#0f0f25]'
          : checked
            ? 'border-indigo-500/50 bg-indigo-500/5'
            : 'border-[#2a2a4a] bg-[#0f0f25] hover:border-indigo-500/30'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          checked ? 'bg-indigo-600 text-white' : 'bg-[#1a1a38] text-slate-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div
        className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative ${
          checked ? 'bg-indigo-600' : 'bg-[#2a2a4a]'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
