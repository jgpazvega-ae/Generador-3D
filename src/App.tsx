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

  const { state: gen, generate, reset } = useGeneration();

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
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse 120% 60% at 30% 10%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse 100% 50% at 70% 90%, rgba(139,92,246,0.05) 0%, transparent 60%), #0a0a16' }}>
      <Header hasConfig={!!apiConfig} onReconfigure={() => setStep('config')} />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-20">
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
          <ProcessingStep state={gen} />
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
          <div className="max-w-md mx-auto text-center py-16 space-y-6 animate-slide-up">
            <div className="relative mx-auto w-fit">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-10 h-10" style={{ color: 'rgba(248,113,113,0.9)' }} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Error al generar</h2>
              <p className="text-sm leading-relaxed rounded-xl px-5 py-4 mx-auto"
                 style={{
                   color: 'rgba(148,163,184,0.8)',
                   background: 'rgba(255,255,255,0.02)',
                   border: '1px solid rgba(255,255,255,0.06)',
                 }}>
                {gen.error}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleStartOver}
                className="btn-primary flex items-center gap-2"
              >
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
      <footer className="fixed bottom-0 inset-x-0 py-3"
              style={{ background: 'rgba(7,7,26,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-center text-xs" style={{ color: 'rgba(51,65,85,0.8)' }}>
          Generador 3D · Powered by{' '}
          <span style={{ color: 'rgba(71,85,105,0.7)' }}>Hunyuan 3D, TripoSR, Meshy AI &amp; Stability AI</span>
        </p>
      </footer>
    </div>
  );
}
