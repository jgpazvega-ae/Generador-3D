import { useState } from 'react';
import { Ruler, ChevronDown, ChevronUp } from 'lucide-react';
import type { Measurements, MeasurementUnit } from '../types';
import { UNIT_LABELS } from '../types';

interface Props {
  value: Measurements;
  onChange: (m: Measurements) => void;
}

const UNITS: MeasurementUnit[] = ['mm', 'cm', 'm', 'in'];

export default function MeasurementsPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const set = (key: keyof Measurements, val: string) =>
    onChange({ ...value, [key]: val });

  const hasMeasurements = value.width || value.height || value.depth;

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(99,102,241,0.1)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors duration-200"
        style={{ background: 'transparent' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.03)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{
                 background: hasMeasurements ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
                 border: '1px solid rgba(99,102,241,0.2)',
               }}>
            <Ruler className="w-3.5 h-3.5" style={{ color: hasMeasurements ? '#a5b4fc' : 'rgba(99,102,241,0.6)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: hasMeasurements ? 'white' : 'rgba(148,163,184,0.8)' }}>
              Medidas reales
            </p>
            {hasMeasurements && !open ? (
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(165,180,252,0.7)' }}>
                {[value.width && `A: ${value.width}`, value.height && `H: ${value.height}`, value.depth && `P: ${value.depth}`]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                {value.unit}
              </p>
            ) : (
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(71,85,105,0.7)' }}>
                Opcional — mejora la precisión del escalado
              </p>
            )}
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(100,116,139,0.6)' }}>
          {open
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-slide-down"
             style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="grid grid-cols-3 gap-3 pt-3">
            {(
              [
                { key: 'width' as const, label: 'Ancho', placeholder: '0' },
                { key: 'height' as const, label: 'Alto', placeholder: '0' },
                { key: 'depth' as const, label: 'Prof.', placeholder: '0' },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold mb-1.5"
                       style={{ color: 'rgba(100,116,139,0.75)' }}>
                  {label}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input-field text-sm py-2"
                  placeholder={placeholder}
                  value={value[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1.5"
                   style={{ color: 'rgba(100,116,139,0.75)' }}>
              Unidad
            </label>
            <div className="grid grid-cols-4 gap-2">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => set('unit', u)}
                  className="py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: value.unit === u
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(124,58,237,0.2))'
                      : 'rgba(255,255,255,0.025)',
                    border: value.unit === u
                      ? '1px solid rgba(99,102,241,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                    color: value.unit === u ? 'white' : 'rgba(100,116,139,0.7)',
                    boxShadow: value.unit === u ? '0 0 14px rgba(99,102,241,0.1)' : 'none',
                  }}
                >
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(71,85,105,0.7)' }}>
            Escala el modelo GLB a las dimensiones físicas del objeto para su uso en software CAD o impresoras 3D.
          </p>
        </div>
      )}
    </div>
  );
}
