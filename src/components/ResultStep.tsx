import { Download, RotateCcw, Share2, CheckCircle, Ruler, Box, Sparkles } from 'lucide-react';
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
    result.glbUrl && { url: result.glbUrl, ext: 'glb', label: 'GLB', desc: 'Blender · Three.js · Unity', color: '#6366f1' },
    result.fbxUrl && { url: result.fbxUrl, ext: 'fbx', label: 'FBX', desc: '3ds Max · Maya · Unity', color: '#10b981' },
    result.objUrl && { url: result.objUrl, ext: 'obj', label: 'OBJ', desc: 'Universal · Blender', color: '#f59e0b' },
  ].filter(Boolean) as { url: string; ext: string; label: string; desc: string; color: string }[];

  const hasViewer = !!result.glbUrl;

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-slide-up">

      {/* Success banner */}
      <div className="relative rounded-2xl px-5 py-4 overflow-hidden"
           style={{
             background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.05) 100%)',
             border: '1px solid rgba(16,185,129,0.2)',
           }}>
        {/* Left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
             style={{ background: 'linear-gradient(180deg, #10b981, #059669)' }} />
        <div className="flex items-center gap-3 pl-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-emerald-300 text-sm">¡Modelo 3D generado exitosamente!</p>
              {result.isBlob && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}>
                  Temporal
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.8)' }}>
              {result.scaled ? 'Modelo escalado a tus medidas reales. ' : ''}
              {hasViewer ? 'Rota · Escala · Descarga en el visor de abajo.' : 'Descarga el archivo para verlo en tu software 3D favorito.'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5"
               style={{ background: 'rgba(16,185,129,0.08)', color: 'rgba(52,211,153,0.8)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Sparkles className="w-3 h-3" />
            IA completó
          </div>
        </div>
      </div>

      {/* 3D Viewer */}
      {hasViewer ? (
        <div className="rounded-2xl overflow-hidden h-[480px] sm:h-[560px] relative"
             style={{
               background: '#060610',
               border: '1px solid rgba(99,102,241,0.15)',
               boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)',
             }}>
          {/* Corner glow */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)',
          }} />
          <ModelViewerComponent src={result.glbUrl} poster={result.thumbnailUrl} />
        </div>
      ) : (
        <div className="rounded-2xl h-64 flex flex-col items-center justify-center gap-4"
             style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse-slow"
               style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Box className="w-10 h-10" style={{ color: 'rgba(99,102,241,0.5)' }} />
          </div>
          <div className="text-center px-6">
            <p className="font-semibold text-white mb-1">Modelo OBJ generado</p>
            <p className="text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>
              Descarga el archivo OBJ y ábrelo en <span className="text-indigo-400">Blender</span> o cualquier visor 3D.
            </p>
          </div>
        </div>
      )}

      {/* Bottom panel */}
      <div className="grid sm:grid-cols-3 gap-4">

        {/* Downloads */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Download className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            Descargar modelo
          </h3>
          {downloads.length > 0 ? (
            <div className="space-y-2">
              {downloads.map((d) => (
                <button
                  key={d.ext}
                  onClick={() => handleDownload(d.url, d.ext)}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 group"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, {
                    background: 'rgba(99,102,241,0.06)',
                    borderColor: 'rgba(99,102,241,0.25)',
                  })}
                  onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, {
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.06)',
                  })}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                         style={{ background: `${d.color}1a`, color: d.color, border: `1px solid ${d.color}30` }}>
                      .{d.label}
                    </div>
                    <p className="text-xs text-left" style={{ color: 'rgba(100,116,139,0.8)' }}>{d.desc}</p>
                  </div>
                  <Download className="w-4 h-4 transition-colors" style={{ color: 'rgba(71,85,105,0.6)' }} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(71,85,105,0.8)' }}>Sin archivos disponibles</p>
          )}
        </div>

        {/* Measurements + Actions */}
        <div className="space-y-4">
          {hasMeasurements(measurements) && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                Medidas reales
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Ancho', value: measurements.width },
                  { label: 'Alto',  value: measurements.height },
                  { label: 'Prof.', value: measurements.depth },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="rounded-xl px-2 py-3 text-center"
                         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(71,85,105,0.8)' }}>{label}</p>
                      <p className="text-sm font-bold text-white">
                        {value}
                        <span className="text-[10px] ml-0.5" style={{ color: 'rgba(100,116,139,0.7)' }}>
                          {measurements.unit}
                        </span>
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center text-sm py-2.5"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </button>
            <button
              onClick={onStartOver}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center text-sm py-2.5"
            >
              <RotateCcw className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Images used */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-white text-sm">
            Fotos usadas
            <span className="ml-1.5 text-[11px] font-normal rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,180,252,0.7)' }}>
              {images.length}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={img.preview} alt={ANGLE_LABELS[img.angle]} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 py-1"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                  <span className="block text-center text-[9px]" style={{ color: 'rgba(203,213,225,0.9)' }}>
                    {ANGLE_LABELS[img.angle]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
