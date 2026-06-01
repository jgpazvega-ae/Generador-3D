import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, Camera, Wand2, ChevronLeft, AlertCircle, Plus, CheckCircle2, Sparkles } from 'lucide-react';
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
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [globalDragActive, setGlobalDragActive] = useState(false);
  const [justFilledSlot, setJustFilledSlot] = useState<string | null>(null);
  const dragCounters = useRef<Record<string, number>>({});
  const globalDragCounter = useRef(0);

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

      const slotOrder = slots.map((s) => s.angle);
      const updated = [...images.filter((i) => i.angle !== angle), newImg];
      updated.sort((a, b) => {
        const ai = slotOrder.indexOf(a.angle);
        const bi = slotOrder.indexOf(b.angle);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      onImagesChange(updated);
      setLoadingSlot(null);
      setJustFilledSlot(angle);
      setTimeout(() => setJustFilledSlot(null), 900);
    },
    [images, onImagesChange, slots],
  );

  // Process multiple files at once into a batch state update — avoids stale-closure
  // race condition that would lose all but the last image when called in a loop.
  const handleMultipleFiles = useCallback(
    async (targets: ViewSlot[], files: File[]) => {
      if (!targets.length || !files.length) return;
      const count = Math.min(targets.length, files.length);
      if (count === 1) { handleSlotFile(targets[0].angle, files[0]); return; }

      setError('');
      const firstAngle = targets[0].angle;
      setLoadingSlot(firstAngle);

      // Compress all files in parallel
      const prepared = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          const angle = targets[i].angle;
          const file = files[i];
          const ex = images.find((img) => img.angle === angle);
          if (ex) URL.revokeObjectURL(ex.preview);
          const preview = createObjectUrl(file);
          const dataUrl = await compressImageToDataUrl(file).catch(() => '');
          return { id: `${Date.now()}-${Math.random()}`, file, preview, dataUrl, angle } as UploadedImage;
        }),
      );

      const slotOrder = slots.map((s) => s.angle);
      const anglesReplaced = new Set(prepared.map((p) => p.angle));
      const retained = images.filter((img) => !anglesReplaced.has(img.angle));
      const next = [...retained, ...prepared];
      next.sort((a, b) => {
        const ai = slotOrder.indexOf(a.angle);
        const bi = slotOrder.indexOf(b.angle);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      onImagesChange(next);
      setLoadingSlot(null);
      // Flash all newly filled slots
      for (const p of prepared) {
        setJustFilledSlot(p.angle);
        await new Promise((r) => setTimeout(r, 80));
      }
      setTimeout(() => setJustFilledSlot(null), 900);
    },
    [images, onImagesChange, slots, handleSlotFile],
  );

  const removeImage = (angle: ViewAngle) => {
    const img = images.find((i) => i.angle === angle);
    if (img) URL.revokeObjectURL(img.preview);
    onImagesChange(images.filter((i) => i.angle !== angle));
  };

  const handleDragEnter = useCallback((angle: ViewAngle, e: React.DragEvent) => {
    e.preventDefault();
    dragCounters.current[angle] = (dragCounters.current[angle] ?? 0) + 1;
    if (e.dataTransfer.types.includes('Files')) setDragOverSlot(angle);
  }, []);

  const handleDragLeave = useCallback((angle: ViewAngle, e: React.DragEvent) => {
    e.preventDefault();
    dragCounters.current[angle] = Math.max(0, (dragCounters.current[angle] ?? 1) - 1);
    if (dragCounters.current[angle] === 0) setDragOverSlot(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((angle: ViewAngle, e: React.DragEvent) => {
    e.preventDefault();
    dragCounters.current[angle] = 0;
    setDragOverSlot(null);
    globalDragCounter.current = 0;
    setGlobalDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const startIdx = slots.findIndex((s) => s.angle === angle);
    const targets = slots.slice(startIdx).filter((s) => !images.find((img) => img.angle === s.angle));
    handleMultipleFiles(targets, files);
  }, [handleMultipleFiles, slots, images]);

  const handleGlobalDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    globalDragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setGlobalDragActive(true);
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    globalDragCounter.current = Math.max(0, globalDragCounter.current - 1);
    if (globalDragCounter.current === 0) setGlobalDragActive(false);
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    globalDragCounter.current = 0;
    setGlobalDragActive(false);
    setDragOverSlot(null);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const emptySlots = slots.filter((s) => !images.find((img) => img.angle === s.angle));
    handleMultipleFiles(emptySlots, files);
  }, [slots, images, handleMultipleFiles]);

  const nextEmptySlot = slots.find((s) => !images.find((img) => img.angle === s.angle));

  // Clipboard paste: Ctrl+V / Cmd+V pastes into the next empty slot
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((i) => i.type.startsWith('image/'));
      if (!imageItems.length) return;
      const files = imageItems.map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (!files.length) return;
      const emptySlots = slots.filter((s) => !images.find((img) => img.angle === s.angle));
      if (emptySlots.length) {
        e.preventDefault();
        handleMultipleFiles(emptySlots, files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [slots, images, handleMultipleFiles]);

  const canGenerate = images.length > 0;
  const filledCount = images.filter((img) => slots.some((s) => s.angle === img.angle)).length;

  return (
    <div
      className="max-w-4xl mx-auto space-y-6 animate-slide-up relative"
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleGlobalDrop}
    >
      {/* Global drag overlay */}
      {globalDragActive && !dragOverSlot && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
             style={{ background: 'rgba(8,8,24,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-3xl px-10 py-8 text-center space-y-3"
               style={{
                 background: 'rgba(99,102,241,0.1)',
                 border: '2px dashed rgba(99,102,241,0.6)',
                 boxShadow: '0 0 60px rgba(99,102,241,0.15)',
               }}>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.2)' }}>
              <Upload className="w-8 h-8 text-indigo-300 animate-bounce" />
            </div>
            <p className="text-lg font-bold text-white">Suelta la imagen</p>
            <p className="text-sm" style={{ color: 'rgba(165,180,252,0.7)' }}>
              {nextEmptySlot
                ? `→ Primera vacía: ${nextEmptySlot.label}`
                : 'Todas las posiciones están llenas'}
            </p>
            {nextEmptySlot && !isSingleView && (
              <p className="text-[11px]" style={{ color: 'rgba(99,102,241,0.5)' }}>
                Múltiples archivos se distribuyen automáticamente
              </p>
            )}
          </div>
        </div>
      )}

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
        <p className="text-[11px] mt-1.5 flex items-center justify-center gap-3"
           style={{ color: 'rgba(71,85,105,0.6)' }}>
          <span>Clic · Arrastra · <kbd className="px-1 py-0.5 rounded text-[10px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            ⌘V
          </kbd> Pegar</span>
        </p>
      </div>

      {/* View angle slots */}
      <div className={`grid gap-4 ${isSingleView ? 'max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {slots.map((slot) => {
          const img = getImageForAngle(slot.angle);
          const isLoading = loadingSlot === slot.angle;
          const isHovered = hoveredSlot === slot.angle;
          const isDragOver = dragOverSlot === slot.angle;
          const isNextTarget = globalDragActive && !dragOverSlot && !img && slot.angle === nextEmptySlot?.angle;
          const isJustFilled = justFilledSlot === slot.angle;
          const filled = !!img;
          const interactive = isHovered || isDragOver || isNextTarget;

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
                className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${!filled && slot.required && !interactive ? 'animate-pulse-soft' : ''}`}
                onClick={() => { if (!isLoading) inputRefs.current[slot.angle]?.click(); }}
                onMouseEnter={() => setHoveredSlot(slot.angle)}
                onMouseLeave={() => setHoveredSlot(null)}
                onDragEnter={(e) => handleDragEnter(slot.angle, e)}
                onDragLeave={(e) => handleDragLeave(slot.angle, e)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(slot.angle, e)}
                style={{
                  background: isDragOver
                    ? 'rgba(99,102,241,0.1)'
                    : isNextTarget
                    ? 'rgba(99,102,241,0.06)'
                    : filled
                    ? '#080818'
                    : isHovered
                    ? 'rgba(99,102,241,0.05)'
                    : 'rgba(255,255,255,0.018)',
                  border: isDragOver
                    ? '2px solid rgba(99,102,241,0.7)'
                    : isJustFilled
                    ? '2px solid rgba(16,185,129,0.7)'
                    : isNextTarget
                    ? '2px dashed rgba(99,102,241,0.55)'
                    : filled
                    ? '2px solid rgba(99,102,241,0.35)'
                    : isHovered
                    ? '2px dashed rgba(99,102,241,0.45)'
                    : slot.required
                    ? '2px dashed rgba(99,102,241,0.22)'
                    : '2px dashed rgba(255,255,255,0.07)',
                  boxShadow: isDragOver
                    ? '0 0 28px rgba(99,102,241,0.2), inset 0 0 20px rgba(99,102,241,0.05)'
                    : isJustFilled
                    ? '0 0 32px rgba(16,185,129,0.35)'
                    : isNextTarget
                    ? '0 0 20px rgba(99,102,241,0.12)'
                    : filled
                    ? '0 0 20px rgba(99,102,241,0.08)'
                    : 'none',
                  transform: isDragOver ? 'scale(1.03)' : isNextTarget ? 'scale(1.01)' : isJustFilled ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <input
                  ref={(el) => { inputRefs.current[slot.angle] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length) return;
                    const startIdx = slots.findIndex((s) => s.angle === slot.angle);
                    const targets = slots.slice(startIdx).filter((s) => !images.find((img) => img.angle === s.angle));
                    handleMultipleFiles(targets, files);
                    e.target.value = '';
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

                    {/* Hover / drag-over overlay */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 transition-all duration-250"
                      style={{ opacity: interactive ? 1 : 0, background: isDragOver ? 'rgba(99,102,241,0.25)' : 'rgba(0,0,0,0.4)' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                           style={{ background: 'rgba(99,102,241,0.3)', backdropFilter: 'blur(4px)' }}>
                        <Upload className={`w-4 h-4 text-white ${isDragOver ? 'animate-bounce' : ''}`} />
                      </div>
                      <span className="text-[11px] font-medium text-white">
                        {isDragOver ? 'Suelta aquí' : 'Cambiar foto'}
                      </span>
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
                        background: isDragOver ? 'rgba(99,102,241,0.25)' : isHovered ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)',
                        border: `1px solid ${isDragOver ? 'rgba(99,102,241,0.7)' : isHovered ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.12)'}`,
                        transform: isDragOver ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {isDragOver
                        ? <Upload className="w-6 h-6 text-indigo-300 animate-bounce" />
                        : <Plus className="w-6 h-6 transition-all duration-300"
                                style={{ color: isHovered ? '#a5b4fc' : 'rgba(99,102,241,0.5)' }} />
                      }
                    </div>
                    <span className="text-[10px] text-center leading-relaxed font-medium"
                          style={{ color: isDragOver ? 'rgba(165,180,252,0.9)' : isHovered ? 'rgba(165,180,252,0.7)' : 'rgba(71,85,105,0.8)' }}>
                      {isDragOver ? 'Suelta aquí' : isHovered ? 'Clic o arrastra' : slot.hint}
                    </span>
                    {!isHovered && !isDragOver && slot.angle === nextEmptySlot?.angle && (
                      <span className="text-[9px] font-medium"
                            style={{ color: 'rgba(99,102,241,0.45)' }}>
                        ⌘V para pegar
                      </span>
                    )}
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

      {/* Ready summary */}
      {filledCount > 0 && (
        <div
          className="rounded-2xl overflow-hidden animate-slide-up"
          style={{
            background: 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.18)',
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#6ee7b7' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(167,243,208,0.9)' }}>
              {filledCount === 1 ? '1 foto lista' : `${filledCount} fotos listas`} para generar
            </span>
            <Sparkles className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: 'rgba(99,102,241,0.6)' }} />
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {slots.map((slot) => {
              const img = getImageForAngle(slot.angle);
              return (
                <div key={slot.angle} className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div
                    className="relative w-14 h-14 rounded-xl overflow-hidden"
                    style={{
                      border: img
                        ? '1.5px solid rgba(99,102,241,0.4)'
                        : '1.5px dashed rgba(255,255,255,0.07)',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    {img ? (
                      <>
                        <img src={img.preview} alt={slot.label} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                             style={{ background: 'rgba(16,185,129,0.9)' }}>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px]" style={{ color: 'rgba(71,85,105,0.5)' }}>—</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: img ? 'rgba(165,180,252,0.7)' : 'rgba(71,85,105,0.5)' }}>
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
