import { Sparkles, Scissors, Ruler, Info } from 'lucide-react';
import type { GenerationSettings, QualityPreset } from '../types';
import { QUALITY_PROFILES } from '../types';

interface Props {
  value: GenerationSettings;
  onChange: (s: GenerationSettings) => void;
  hasMeasurements: boolean;
}

const PRESETS: QualityPreset[] = ['draft', 'standard', 'max'];
const PRESET_ICONS = ['⚡', '✦', '◆'];

export default function SettingsPanel({ value, onChange, hasMeasurements }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(99,102,241,0.1)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <span className="font-semibold text-white text-sm">Calidad y precisión</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Quality preset */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2"
             style={{ color: 'rgba(100,116,139,0.7)' }}>
            Nivel de calidad
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p, i) => {
              const profile = QUALITY_PROFILES[p];
              const active = value.quality === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ ...value, quality: p })}
                  className="rounded-xl px-2 py-2.5 text-center transition-all duration-200"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(124,58,237,0.2))'
                      : 'rgba(255,255,255,0.025)',
                    border: active
                      ? '1px solid rgba(99,102,241,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: active ? '0 0 16px rgba(99,102,241,0.12)' : 'none',
                    color: active ? 'white' : 'rgba(100,116,139,0.75)',
                  }}
                >
                  <span className="text-base block mb-0.5">{PRESET_ICONS[i]}</span>
                  <span className="text-xs font-semibold">{profile.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'rgba(71,85,105,0.8)' }}>
            {QUALITY_PROFILES[value.quality].description}
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <Toggle
            icon={<Scissors className="w-3.5 h-3.5" />}
            title="Eliminar fondo"
            subtitle="Aísla la pieza para mayor precisión"
            checked={value.removeBackground}
            onChange={(v) => onChange({ ...value, removeBackground: v })}
          />
          <Toggle
            icon={<Ruler className="w-3.5 h-3.5" />}
            title="Escalar a medidas reales"
            subtitle={
              hasMeasurements
                ? 'Dimensiones físicas exactas aplicadas'
                : 'Agrega medidas abajo para activar'
            }
            checked={value.scaleToMeasurements && hasMeasurements}
            disabled={!hasMeasurements}
            onChange={(v) => onChange({ ...value, scaleToMeasurements: v })}
          />
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
             style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-400/60" />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(71,85,105,0.8)' }}>
            La eliminación de fondo se ejecuta en tu navegador (descarga un modelo ligero la primera vez).
          </p>
        </div>
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
      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200"
      style={{
        background: disabled
          ? 'rgba(255,255,255,0.01)'
          : checked
          ? 'rgba(99,102,241,0.07)'
          : 'rgba(255,255,255,0.02)',
        border: disabled
          ? '1px solid rgba(255,255,255,0.04)'
          : checked
          ? '1px solid rgba(99,102,241,0.28)'
          : '1px solid rgba(255,255,255,0.06)',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
        style={{
          background: checked && !disabled ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
          color: checked && !disabled ? '#a5b4fc' : 'rgba(71,85,105,0.7)',
          border: '1px solid transparent',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: checked && !disabled ? 'white' : 'rgba(148,163,184,0.7)' }}>
          {title}
        </p>
        <p className="text-[11px] leading-snug" style={{ color: 'rgba(71,85,105,0.8)' }}>{subtitle}</p>
      </div>
      {/* Toggle pill */}
      <div
        className="relative w-10 h-5.5 rounded-full flex-shrink-0 transition-all duration-300"
        style={{
          width: '38px',
          height: '22px',
          background: checked && !disabled
            ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
            : 'rgba(255,255,255,0.06)',
          boxShadow: checked && !disabled ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute bg-white rounded-full transition-all duration-300"
          style={{
            width: '16px',
            height: '16px',
            top: '2px',
            left: checked ? '18px' : '2px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </button>
  );
}
