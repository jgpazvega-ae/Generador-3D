import { Download, RotateCcw, Share2, CheckCircle, Ruler, Box } from 'lucide-react';
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
      try { await navigator.share({ title: 'Mi modelo 3D', url: result.glbUrl }); return; }
      catch { /* fall through */ }
    }
    if (result.glbUrl && !result.isBlob) {
      await navigator.clipboard.writeText(result.glbUrl).catch(() => {});
      alert('URL copiada al portapapeles');
    } else {
      alert('Modelo temporal: descárgalo primero para guardarlo.');
    }
  };

  const downloads = [
    result.glbUrl && { url: result.glbUrl, ext: 'glb', label: 'GLB', desc: 'Blender · Three.js · Unity' },
    result.fbxUrl && { url: result.fbxUrl, ext: 'fbx', label: 'FBX', desc: '3ds Max · Maya · Unity' },
    result.objUrl && { url: result.objUrl, ext: 'obj', label: 'OBJ', desc: 'Universal · Blender' },
  ].filter(Boolean) as { url: string; ext: string; label: string; desc: string }[];

  const hasViewer = !!result.glbUrl;

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-slide-up">
      {/* Success banner */}
      <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-5 py-4">
        <div className="w-8 h-8 bg-emerald-500/15 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-300 text-sm">¡Modelo 3D generado exitosamente!</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {result.scaled ? 'Modelo escalado a tus medidas reales. ' : ''}
            {hasViewer ? 'Rota · Escala · Descarga en el visor de abajo.' : 'Descarga el archivo para verlo en tu software 3D favorito.'}
          </p>
        </div>
        {result.isBlob && (
          <span className="text-[10px] text-amber-400/80 bg-amber-500/8 border border-amber-500/15 rounded-lg px-2 py-1 flex-shrink-0">
            Temporal
          </span>
        )}
      </div>

      {/* 3D Viewer — hero */}
      {hasViewer ? (
        <div className="rounded-2xl overflow-hidden border border-[#232340] h-[480px] sm:h-[560px] bg-[#060610] shadow-2xl shadow-indigo-950/50">
          <ModelViewerComponent src={result.glbUrl} poster={result.thumbnailUrl} />
        </div>
      ) : (
        /* OBJ placeholder */
        <div className="rounded-2xl border border-[#232340] h-64 flex flex-col items-center justify-center gap-4 bg-[#0a0a1e]">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse-slow">
            <Box className="w-10 h-10 text-indigo-400/60" />
          </div>
          <div className="text-center px-6">
            <p className="font-semibold text-white mb-1">Modelo OBJ generado</p>
            <p className="text-sm text-slate-400">
              Descarga el archivo OBJ y ábrelo en <span className="text-indigo-400">Blender</span>, MeshLab o cualquier visor 3D.
              Para vista previa en el navegador usa un proveedor con API key.
            </p>
          </div>
        </div>
      )}

      {/* Bottom panel */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Downloads */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            Descargar modelo
          </h3>
          {downloads.length > 0 ? (
            <>
              {downloads.map((d) => (
                <button
                  key={d.ext}
                  onClick={() => handleDownload(d.url, d.ext)}
                  className="w-full flex items-center justify-between bg-[#0a0a1e] hover:bg-[#141430]
                             border border-[#2a2a4a] hover:border-indigo-500/40 rounded-xl px-4 py-3
                             transition-all group"
                >
                  <div className="text-left">
                    <span className="font-bold text-indigo-400 text-sm group-hover:text-indigo-300">.{d.label}</span>
                    <p className="text-xs text-slate-500">{d.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-500">Sin archivos disponibles</p>
          )}
        </div>

        {/* Measurements + Actions */}
        <div className="space-y-4">
          {hasMeasurements(measurements) && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-indigo-400" />
                Medidas reales
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Ancho', value: measurements.width },
                  { label: 'Alto',  value: measurements.height },
                  { label: 'Prof.', value: measurements.depth },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="bg-[#0a0a1e] border border-[#2a2a4a] rounded-xl px-2 py-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-white">
                        {value}
                        <span className="text-[10px] text-slate-400 ml-0.5">{measurements.unit}</span>
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleShare} className="btn-secondary flex items-center gap-2 flex-1 justify-center text-sm py-2">
              <Share2 className="w-4 h-4" />
              Compartir
            </button>
            <button onClick={onStartOver} className="btn-secondary flex items-center gap-2 flex-1 justify-center text-sm py-2">
              <RotateCcw className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Images used */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-white text-sm">
            Fotos usadas ({images.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-[#0a0a1e] border border-[#232340]">
                <img src={img.preview} alt={ANGLE_LABELS[img.angle]} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent py-1">
                  <span className="block text-center text-[9px] text-slate-300">{ANGLE_LABELS[img.angle]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
