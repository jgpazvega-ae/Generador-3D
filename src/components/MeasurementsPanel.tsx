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
    <div className="card-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a1a38] rounded-lg flex items-center justify-center">
            <Ruler className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="font-medium text-white text-sm">Medidas reales</span>
            {hasMeasurements && !open && (
              <p className="text-xs text-indigo-400 mt-0.5">
                {[value.width && `A: ${value.width}`, value.height && `H: ${value.height}`, value.depth && `P: ${value.depth}`]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                {value.unit}
              </p>
            )}
            {!hasMeasurements && (
              <p className="text-xs text-slate-500 mt-0.5">Opcional — mejora la precisión</p>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { key: 'width' as const, label: 'Ancho' },
                { key: 'height' as const, label: 'Alto' },
                { key: 'depth' as const, label: 'Profund.' },
              ] as const
            ).map(({ key, label }) => (
              <div key={key}>
                <label className="label text-xs">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input-field text-sm py-2"
                  placeholder="0"
                  value={value[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="label text-xs">Unidad</label>
            <div className="flex gap-2">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => set('unit', u)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    value.unit === u
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#0f0f25] text-slate-400 border border-[#2a2a4a] hover:border-indigo-500/50'
                  }`}
                >
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Las medidas se incluyen en los metadatos del modelo y ayudan a escalar
            correctamente la pieza en software CAD.
          </p>
        </div>
      )}
    </div>
  );
}
