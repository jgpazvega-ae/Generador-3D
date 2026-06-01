import { useState } from 'react';
import type {
  ApiConfig,
  UploadedImage,
  Measurements,
  GenerationSettings,
} from './types';
import { useGeneration } from './hooks/useGeneration';
import { useLocalStorage } from './hooks/useLocalStorage';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import ApiConfigStep from './components/ApiConfigStep';
import ImageUploadStep from './components/ImageUploadStep';
import ProcessingStep from './components/ProcessingStep';
import ResultStep from './components/ResultStep';
import { AlertCircle, RotateCcw } from 'lucide-react';

type AppStep = 'config' | 'upload' | 'processing' | 'result';

const STEP_LABELS = ['Proveedor IA', 'Fotos del objeto', 'Generando…', 'Modelo 3D'];

export default function App() {
  const [step, setStep] = useState<AppStep>('config');
  const [apiConfig, setApiConfig] = useLocalStorage<ApiConfig | null>('generador3d-config', null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [measurements, setMeasurements] = useState<Measurements>({
    width: '',
    height: '',
    depth: '',
    unit: 'cm',
  });
  const [settings, setSettings] = useState<GenerationSettings>({
    quality: 'standard',
    removeBackground: true,
    scaleToMeasurements: true,
  });

  const { state: gen, generate, reset, cancel } = useGeneration();

  const currentIndex = ['config', 'upload', 'processing', 'result'].indexOf(step);

  const handleConfigSave = (config: ApiConfig) => {
    setApiConfig(config);
    setStep('upload');
  };

  const handleGenerate = async () => {
    if (!apiConfig) return;
    setStep('processing');
    await generate(apiConfig, images, settings, measurements);
    setStep('result');
  };

  const handleStartOver = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setMeasurements({ width: '', height: '', depth: '', unit: 'cm' });
    reset();
    setStep('upload');
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#080818' }}>
      {/* Animated background layers */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {/* Base gradient */}
        <div className="absolute inset-0"
             style={{ background: 'radial-gradient(ellipse 140% 70% at 20% -10%, rgba(99,102,241,0.08) 0%, transparent 55%), radial-gradient(ellipse 100% 60% at 80% 110%, rgba(139,92,246,0.06) 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 50% 50%, rgba(56,189,248,0.02) 0%, transparent 70%)' }} />
        {/* Animated top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] animate-glow"
             style={{
               background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)',
               filter: 'blur(40px)',
             }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
             style={{
               backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
               backgroundSize: '60px 60px',
             }} />
        {/* Floating orbs */}
        <div className="absolute top-[15%] left-[8%] w-72 h-72 rounded-full animate-float"
             style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 65%)', animationDelay: '0s', animationDuration: '8s' }} />
        <div className="absolute top-[55%] right-[6%] w-56 h-56 rounded-full animate-float"
             style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 65%)', animationDelay: '-3s', animationDuration: '10s' }} />
        <div className="absolute bottom-[10%] left-[30%] w-40 h-40 rounded-full animate-float"
             style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.03) 0%, transparent 65%)', animationDelay: '-5s', animationDuration: '7s' }} />
      </div>

      <Header hasConfig={!!apiConfig} onReconfigure={() => setStep('config')} provider={apiConfig?.provider} />

      <main className="relative max-w-6xl mx-auto px-4 py-8 pb-20">
        {/* Step indicator */}
        <div className="mb-10">
          <StepIndicator steps={STEP_LABELS} currentIndex={currentIndex} />
        </div>

        {step === 'config' && (
          <ApiConfigStep initialConfig={apiConfig} onSave={handleConfigSave} />
        )}

        {step === 'upload' && apiConfig && (
          <ImageUploadStep
            images={images}
            onImagesChange={setImages}
            measurements={measurements}
            onMeasurementsChange={setMeasurements}
            settings={settings}
            onSettingsChange={setSettings}
            onGenerate={handleGenerate}
            onBack={() => setStep('config')}
            provider={apiConfig.provider}
          />
        )}

        {step === 'processing' && (
          <ProcessingStep
            state={gen}
            images={images}
            provider={apiConfig?.provider}
            onCancel={() => { cancel(); setStep('upload'); }}
          />
        )}

        {step === 'result' && gen.status === 'succeeded' && gen.result && (
          <ResultStep
            result={gen.result}
            measurements={measurements}
            images={images}
            onStartOver={handleStartOver}
          />
        )}

        {step === 'result' && gen.status === 'failed' && (
          <div className="max-w-md mx-auto text-center py-12 space-y-6 animate-slide-up">
            {/* Error icon */}
            <div className="relative mx-auto w-fit">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
                   style={{ background: 'rgba(239,68,68,0.3)' }} />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <AlertCircle className="w-10 h-10" style={{ color: 'rgba(248,113,113,0.9)' }} />
              </div>
            </div>

            {/* Message */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Error al generar</h2>
              <p className="text-sm mb-4" style={{ color: 'rgba(100,116,139,0.8)' }}>
                El modelo no pudo generarse. Detalles:
              </p>
              <div className="rounded-xl px-4 py-3 text-left"
                   style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-sm font-mono leading-relaxed break-words"
                   style={{ color: 'rgba(252,165,165,0.85)' }}>
                  {gen.error}
                </p>
              </div>
            </div>

            {/* Tips based on error */}
            <div className="text-left rounded-xl px-4 py-3 space-y-1.5"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(165,180,252,0.7)' }}>
                Qué puedes intentar:
              </p>
              {[
                'Verifica que tu API key sea correcta',
                'Asegúrate de que la imagen tiene buena iluminación y fondo liso',
                'Prueba con TripoSR (gratis, sin API key)',
                'Si usas Replicate, comprueba que tienes créditos disponibles',
              ].map((tip) => (
                <p key={tip} className="text-xs flex items-start gap-2"
                   style={{ color: 'rgba(100,116,139,0.8)' }}>
                  <span className="text-indigo-400 mt-0.5">›</span>
                  {tip}
                </p>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={handleStartOver} className="btn-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Intentar de nuevo
              </button>
              <button onClick={() => setStep('config')} className="btn-secondary">
                Cambiar proveedor
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 py-2.5"
              style={{
                background: 'rgba(8,8,24,0.88)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgba(51,65,85,0.8)' }}>
            Generador 3D · IA
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] hidden sm:inline" style={{ color: 'rgba(51,65,85,0.6)' }}>
              Powered by
            </span>
            <div className="flex items-center gap-2">
              {['TripoSR', 'Hunyuan 3D', 'Meshy', 'SPAR3D'].map((name) => (
                <span key={name} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(71,85,105,0.65)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
