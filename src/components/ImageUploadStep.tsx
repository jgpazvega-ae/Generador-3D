import { useRef, useState, useCallback } from 'react';
import { Upload, X, Camera, Wand2, ChevronLeft, AlertCircle } from 'lucide-react';
import type {
  UploadedImage,
  ViewAngle,
  Measurements,
  ApiProvider,
  GenerationSettings,
} from '../types';
import { ANGLE_LABELS, ANGLE_ICONS } from '../types';
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

const MAX_IMAGES: Record<ApiProvider, number> = {
  replicate: 4,
  meshy: 4,
  stability: 1,
  huggingface: 4,
  shared: 4,
};

// Providers that only consume the first image for generation (single-view models)
const SINGLE_VIEW: ApiProvider[] = ['stability', 'huggingface'];

const ANGLES: ViewAngle[] = ['front', 'back', 'left', 'right', 'top', 'bottom', 'diagonal', 'custom'];

export default function ImageUploadStep({
  images,
  onImagesChange,
  measurements,
  onMeasurementsChange,
  settings,
  onSettingsChange,
  onGenerate,
  onBack,
  provider,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const maxImages = MAX_IMAGES[provider];

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        setError(`Máximo ${maxImages} imagen${maxImages > 1 ? 'es' : ''} para este proveedor`);
        return;
      }

      setLoading(true);
      setError('');
      const toProcess = arr.slice(0, remaining);
      const newImages: UploadedImage[] = [];

      for (const file of toProcess) {
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        const preview = createObjectUrl(file);
        const dataUrl = await compressImageToDataUrl(file).catch(() => '');

        const usedAngles = new Set(images.map((i) => i.angle));
        const defaultAngle =
          ANGLES.find((a) => !usedAngles.has(a)) ?? 'custom';

        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          dataUrl,
          angle: defaultAngle,
        });
      }

      onImagesChange([...images, ...newImages]);
      setLoading(false);
    },
    [images, maxImages, onImagesChange],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeImage = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.preview);
    onImagesChange(images.filter((i) => i.id !== id));
  };

  const updateAngle = (id: string, angle: ViewAngle) => {
    onImagesChange(images.map((img) => (img.id === id ? { ...img, angle } : img)));
  };

  const canGenerate = images.length > 0;
  const atMax = images.length >= maxImages;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,180,252,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}>
          Paso 2 de 3
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Sube fotos <span className="text-gradient">de tu pieza</span>
        </h2>
        <p className="text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>
          {provider === 'stability'
            ? 'Este proveedor usa 1 imagen. Elige la mejor vista.'
            : provider === 'huggingface'
            ? `Sube hasta ${maxImages} fotos (se usa la primera para el modelo). Mínimo 1.`
            : `Sube hasta ${maxImages} fotos desde distintos ángulos para mejor calidad`}
        </p>
      </div>

      {/* Drop zone */}
      {!atMax && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-300"
          style={{
            background: dragging ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${dragging ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: dragging ? '0 0 30px rgba(99,102,241,0.12), inset 0 0 30px rgba(99,102,241,0.04)' : 'none',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={maxImages > 1}
            className="hidden"
            onChange={handleFileChange}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                   style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>Procesando imágenes...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                   style={{
                     background: dragging ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                     border: `1px solid ${dragging ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                   }}>
                <Upload className="w-7 h-7" style={{ color: dragging ? '#a5b4fc' : 'rgba(99,102,241,0.7)' }} />
              </div>
              <div>
                <p className="font-medium text-white">
                  Arrastra aquí o{' '}
                  <span style={{ color: '#a5b4fc', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    haz clic para seleccionar
                  </span>
                </p>
                <p className="text-sm mt-1" style={{ color: 'rgba(71,85,105,0.8)' }}>
                  JPEG, PNG o WebP · máx. 20 MB por imagen
                </p>
              </div>
              {images.length > 0 && (
                <p className="text-xs px-3 py-1 rounded-full"
                   style={{ background: 'rgba(99,102,241,0.08)', color: 'rgba(165,180,252,0.7)' }}>
                  {images.length}/{maxImages} imagen{images.length !== 1 ? 'es' : ''} cargada{images.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img, i) => (
            <div key={img.id} className="card-sm p-0 overflow-hidden group relative">
              {/* Preview */}
              <div className="aspect-square bg-[#0f0f25] relative overflow-hidden">
                <img
                  src={img.preview}
                  alt={`Vista ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Index badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              {/* Angle selector */}
              <div className="p-3">
                <label className="label text-xs mb-1.5">Ángulo de vista</label>
                <select
                  value={img.angle}
                  onChange={(e) => updateAngle(img.id, e.target.value as ViewAngle)}
                  className="w-full bg-[#0f0f25] border border-[#2a2a4a] rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {ANGLES.map((a) => (
                    <option key={a} value={a}>
                      {ANGLE_ICONS[a]} {ANGLE_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {!atMax && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-[#2a2a4a] hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-indigo-400 transition-all"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs">Agregar</span>
            </button>
          )}
        </div>
      )}

      {/* Photo guidance */}
      <div className="relative rounded-xl overflow-hidden"
           style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
             style={{ background: 'linear-gradient(180deg, #6366f1, #7c3aed)' }} />
        <div className="flex items-start gap-3 p-4 pl-5">
          <Camera className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(99,102,241,0.8)' }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(165,180,252,0.9)' }}>
              Cómo lograr ~99% de similitud
            </p>
            <ul className="text-sm space-y-0.5 list-disc list-inside" style={{ color: 'rgba(100,116,139,0.85)' }}>
              {!SINGLE_VIEW.includes(provider) && (
                <li>Sube frente, atrás e izquierda/derecha del mismo objeto.</li>
              )}
              {provider === 'huggingface' && (
                <li>TripoSR usa 1 imagen: la primera y mejor vista del objeto.</li>
              )}
              <li>Fondo liso y uniforme, buena iluminación sin sombras duras.</li>
              <li>La pieza centrada, nítida y ocupando casi todo el encuadre.</li>
              <li>Mantén la misma distancia y evita reflejos o brillos.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quality & precision settings */}
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
          {images.length > 0 && (
            <span className="ml-1 opacity-70 text-sm">
              ({images.length} foto{images.length !== 1 ? 's' : ''})
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
