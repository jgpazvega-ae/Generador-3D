import { Download, RotateCcw, Share2, CheckCircle, Ruler } from 'lucide-react';
import type { ModelResult, Measurements, UploadedImage } from '../types';
import { ANGLE_LABELS } from '../types';
import { downloadFile } from '../utils/imageUtils';
import ModelViewerComponent from './ModelViewerComponent';

interface Props {
  result: ModelResult;
  measurements: Measurements;
  images: UploadedImage[];
  onStartOver: () => void;
}

const hasMeasurements = (m: Measurements) => m.width || m.height || m.depth;

export default function ResultStep({ result, measurements, images, onStartOver }: Props) {
  const handleDownload = async (url: string, ext: string) => {
    await downloadFile(url, `modelo-3d-${Date.now()}.${ext}`);
  };

  const handleShare = async () => {
    if (navigator.share && result.glbUrl && !result.isBlob) {
      try {
        await navigator.share({ title: 'Mi modelo 3D', url: result.glbUrl });
        return;
      } catch {
        // fall through
      }
    }
    if (result.glbUrl && !result.isBlob) {
      await navigator.clipboard.writeText(result.glbUrl).catch(() => {});
      alert('URL copiada al portapapeles');
    } else {
      alert('Este modelo es temporal (blob). Descárgalo primero para guardarlo.');
    }
  };

  const downloads = [
    result.glbUrl && { url: result.glbUrl, ext: 'glb', label: 'GLB', desc: 'Blender, Three.js' },
    result.fbxUrl && { url: result.fbxUrl, ext: 'fbx', label: 'FBX', desc: '3ds Max, Maya, Unity' },
    result.objUrl && { url: result.objUrl, ext: 'obj', label: 'OBJ', desc: 'Universal' },
  ].filter(Boolean) as { url: string; ext: string; label: string; desc: string }[];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Success banner */}
      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
        <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-emerald-300">¡Modelo 3D generado!</p>
          <p className="text-sm text-slate-400">
            Puedes rotar, hacer zoom y descargar el modelo a continuación.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 3D Viewer — takes 3 cols */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden h-[420px] lg:h-[500px]">
            <ModelViewerComponent src={result.glbUrl} poster={result.thumbnailUrl} />
          </div>
          <p className="text-xs text-slate-600 text-center mt-2">
            Arrastra para rotar · Scroll para zoom · Doble clic para auto-zoom
          </p>
        </div>

        {/* Right panel — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {/* Downloads */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              Descargar modelo
            </h3>
            {downloads.map((d) => (
              <button
                key={d.ext}
                onClick={() => handleDownload(d.url, d.ext)}
                className="w-full flex items-center justify-between bg-[#0f0f25] hover:bg-[#1a1a38] border border-[#2a2a4a] hover:border-indigo-500/50 rounded-xl px-4 py-3 transition-all group"
              >
                <div className="text-left">
                  <span className="font-bold text-indigo-400 text-sm group-hover:text-indigo-300">
                    .{d.label}
                  </span>
                  <p className="text-xs text-slate-500">{d.desc}</p>
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
            {result.isBlob && (
              <p className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                ⚠ Este modelo es temporal. Descárgalo ahora, se perderá al cerrar la página.
              </p>
            )}
          </div>

          {/* Measurements */}
          {hasMeasurements(measurements) && (
            <div className="card space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-indigo-400" />
                Medidas de referencia
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Ancho', value: measurements.width },
                  { label: 'Alto', value: measurements.height },
                  { label: 'Profund.', value: measurements.depth },
                ].map(
                  ({ label, value }) =>
                    value && (
                      <div key={label} className="bg-[#0f0f25] rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="text-sm font-semibold text-white">
                          {value}
                          <span className="text-xs text-slate-400 ml-0.5">
                            {measurements.unit}
                          </span>
                        </p>
                      </div>
                    ),
                )}
              </div>
            </div>
          )}

          {/* Images used */}
          <div className="card space-y-2">
            <h3 className="font-semibold text-white text-sm">
              Imágenes utilizadas ({images.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-[#0f0f25]">
                  <img
                    src={img.preview}
                    alt={ANGLE_LABELS[img.angle]}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-center py-0.5">
                    <span className="text-[10px] text-slate-300">
                      {ANGLE_LABELS[img.angle]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </button>
            <button
              onClick={onStartOver}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center"
            >
              <RotateCcw className="w-4 h-4" />
              Nuevo modelo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
