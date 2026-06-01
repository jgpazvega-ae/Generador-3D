import { useRef, useState, useCallback } from 'react';
import { Upload, X, Camera, Wand2, ChevronLeft, AlertCircle, Plus } from 'lucide-react';
import type { UploadedImage, ViewAngle, Measurements, ApiProvider, GenerationSettings } from '../types';
import { createObjectUrl, validateImageFile, compressImageToDataUrl } from '../utils/imageUtils';
import MeasurementsPanel from './MeasurementsPanel';
import SettingsPanel from './SettingsPanel';

interface Props {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  measurements: Measurements;
  onMeasurementsChange: (m: Measurements) => void;
  settings: GenerationSettings;
  onSettingsChange: (s: GenerationSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
  provider: ApiProvider;
}

interface ViewSlot {
  angle: ViewAngle;
  label: string;
  hint: string;
  required: boolean;
}

const MULTI_SLOTS: ViewSlot[] = [
  { angle: 'front',  label: 'Frente',    hint: 'Vista principal',   required: true  },
  { angle: 'back',   label: 'Atrás',     hint: 'Vista posterior',   required: false },
  { angle: 'left',   label: 'Izquierda', hint: 'Vista lateral',     required: false },
  { angle: 'right',  label: 'Derecha',   hint: 'Vista lateral',     required: false },
];

const SINGLE_SLOT: ViewSlot[] = [
  { angle: 'front',  label: 'Foto del objeto', hint: 'Vista frontal clara', required: true },
];

const SINGLE_VIEW_PROVIDERS: ApiProvider[] = ['stability', 'huggingface'];

export default function ImageUploadStep({
  images, onImagesChange, measurements, onMeasurementsChange,
  settings, onSettingsChange, onGenerate, onBack, provider,
}: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [error, setError] = useState('');
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const isSingleView = SINGLE_VIEW_PROVIDERS.includes(provider);
  const slots = isSingleView ? SINGLE_SLOT : MULTI_SLOTS;

  const getImageForAngle = (angle: ViewAngle) =>
    images.find((img) => img.angle === angle) ?? null;

  const handleSlotFile = useCallback(
    async (angle: ViewAngle, file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) { setError(validationError); return; }

      setLoadingSlot(angle);
      setError('');

      const existing = images.find((i) => i.angle === angle);
      if (existing) URL.revokeObjectURL(existing.preview);

      const preview = createObjectUrl(file);
      const dataUrl = await compressImageToDataUrl(file).catch(() => '');

      const newImg: UploadedImage = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview,
        dataUrl,
        angle,
      };

      onImagesChange([...images.filter((i) => i.angle !== angle), newImg]);
      setLoadingSlot(null);
    },
    [images, onImagesChange],
  );

  const removeImage = (angle: ViewAngle) => {
    const img = images.find((i) => i.angle === angle);
    if (img) URL.revokeObjectURL(img.preview);
    onImagesChange(images.filter((i) => i.angle !== angle));
  };

  const canGenerate = images.length > 0;
  const filledCount = images.filter((img) => slots.some((s) => s.angle === img.angle)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,180,252,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}>
          Paso 2 de 3
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Sube fotos <span className="text-gradient">de tu pieza</span>
        </h2>
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>
          {isSingleView
            ? 'Sube la mejor foto del objeto. Fondo liso, buena iluminación.'
            : 'Sube hasta 4 ángulos del mismo objeto para máxima calidad y precisión.'}
        </p>
      </div>

      {/* View angle slots */}
      <div className={`grid gap-4 ${isSingleView ? 'max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {slots.map((slot) => {
          const img = getImageForAngle(slot.angle);
          const isLoading = loadingSlot === slot.angle;
          const isHovered = hoveredSlot === slot.angle;
          const filled = !!img;

          return (
            <div key={slot.angle} className="flex flex-col gap-2">
              {/* Slot header */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: filled ? 'rgba(165,180,252,0.9)' : 'rgba(148,163,184,0.7)' }}>
                  {slot.label}
                  {slot.required && <span className="text-indigo-400/80 text-[10px]">*</span>}
                </span>
                {filled ? (
                  <span className="text-[10px] font-medium text-emerald-400" style={{ opacity: 0.8 }}>✓ Lista</span>
                ) : (
                  <span className="text-[10px]" style={{ color: 'rgba(71,85,105,0.7)' }}>
                    {slot.required ? 'Requerida' : 'Opcional'}
                  </span>
                )}
              </div>

              {/* Slot card */}
              <div
                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                onClick={() => { if (!isLoading) inputRefs.current[slot.angle]?.click(); }}
                onMouseEnter={() => setHoveredSlot(slot.angle)}
                onMouseLeave={() => setHoveredSlot(null)}
                style={{
                  background: filled
                    ? '#080818'
                    : isHovered
                    ? 'rgba(99,102,241,0.05)'
                    : 'rgba(255,255,255,0.018)',
                  border: filled
                    ? '2px solid rgba(99,102,241,0.35)'
                    : isHovered
                    ? '2px dashed rgba(99,102,241,0.45)'
                    : '2px dashed rgba(255,255,255,0.07)',
                  boxShadow: filled ? '0 0 20px rgba(99,102,241,0.08)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <input
                  ref={(el) => { inputRefs.current[slot.angle] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleSlotFile(slot.angle, e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />

                {filled ? (
                  <>
                    <img src={img!.preview} alt={slot.label}
                         className="w-full h-full object-cover transition-transform duration-300"
                         style={{ transform: isHovered ? 'scale(1.04)' : 'scale(1)' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(slot.angle); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        background: isHovered ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'scale(1)' : 'scale(0.8)',
                      }}
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>

                    {/* Hover overlay with change prompt */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 transition-all duration-250"
                      style={{ opacity: isHovered ? 1 : 0, background: 'rgba(0,0,0,0.4)' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                           style={{ background: 'rgba(99,102,241,0.3)', backdropFilter: 'blur(4px)' }}>
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white">Cambiar foto</span>
                    </div>

                    {/* Bottom angle label */}
                    <div className="absolute bottom-0 inset-x-0 px-3 py-2">
                      <span className="text-[11px] font-semibold text-white/90">{slot.label}</span>
                    </div>
                  </>
                ) : isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isHovered ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)',
                        border: `1px solid ${isHovered ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.12)'}`,
                      }}
                    >
                      <Plus className="w-6 h-6 transition-all duration-300"
                            style={{ color: isHovered ? '#a5b4fc' : 'rgba(99,102,241,0.5)' }} />
                    </div>
                    <span className="text-[11px] text-center leading-relaxed"
                          style={{ color: isHovered ? 'rgba(165,180,252,0.7)' : 'rgba(71,85,105,0.8)' }}>
                      {slot.hint}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress dots */}
      {!isSingleView && (
        <div className="flex items-center justify-center gap-3">
          {slots.map((slot) => {
            const filled = !!getImageForAngle(slot.angle);
            return (
              <div key={slot.angle} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    background: filled ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    boxShadow: filled ? '0 0 6px rgba(99,102,241,0.6)' : 'none',
                    transform: filled ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
                <span className="text-[10px]" style={{ color: filled ? 'rgba(165,180,252,0.7)' : 'rgba(71,85,105,0.6)' }}>
                  {slot.label}
                </span>
              </div>
            );
          })}
          <span className="text-[11px] ml-2 font-semibold"
                style={{ color: filledCount > 0 ? 'rgba(165,180,252,0.8)' : 'rgba(71,85,105,0.6)' }}>
            {filledCount}/{slots.length}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tips */}
      <div className="relative rounded-xl overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
             style={{ background: 'linear-gradient(180deg, #6366f1, #7c3aed)' }} />
        <div className="flex items-start gap-3 p-4 pl-5">
          <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(99,102,241,0.7)' }} />
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(165,180,252,0.85)' }}>
              Consejos para mejor resultado
            </p>
            <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: 'rgba(100,116,139,0.8)' }}>
              {!isSingleView && <li>Fotografía el mismo objeto desde cada ángulo sin moverlo.</li>}
              {provider === 'huggingface' && <li>TripoSR usa solo la vista de frente — pon la mejor foto ahí.</li>}
              <li>Fondo liso y uniforme; buena iluminación sin sombras duras.</li>
              <li>Objeto centrado, nítido y ocupando casi todo el encuadre.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quality settings */}
      <SettingsPanel
        value={settings}
        onChange={onSettingsChange}
        hasMeasurements={!!(measurements.width || measurements.height || measurements.depth)}
      />

      {/* Measurements */}
      <MeasurementsPanel value={measurements} onChange={onMeasurementsChange} />

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Atrás
        </button>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-base disabled:opacity-40"
        >
          <Wand2 className="w-5 h-5" />
          Generar modelo 3D
          {filledCount > 0 && (
            <span className="ml-1 opacity-70 text-sm">
              ({filledCount} foto{filledCount !== 1 ? 's' : ''})
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
