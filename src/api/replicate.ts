import type { UploadedImage, ModelResult, QualityProfile } from '../types';

const BASE = 'https://api.replicate.com/v1';

// Modelo single-image por defecto (Hunyuan 3D 2 de Tencent)
export const DEFAULT_REPLICATE_MODEL = 'tencent/hunyuan3d-2';
// Modelo multiview (usa frente/atrás/izquierda) cuando hay varias vistas
export const MULTIVIEW_REPLICATE_MODEL = 'tencent/hunyuan3d-2mv';

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
  logs?: string;
}

async function createPrediction(
  apiKey: string,
  modelVersion: string,
  input: Record<string, unknown>,
): Promise<string> {
  const [modelPath, version] = modelVersion.split(':');
  const [owner, model] = modelPath.split('/');

  const useVersion = version && version !== 'latest';
  const endpoint = useVersion
    ? `${BASE}/predictions`
    : `${BASE}/models/${owner}/${model}/predictions`;

  const body: Record<string, unknown> = { input };
  if (useVersion) body.version = version;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      (err as { detail?: string }).detail ?? `Replicate error ${res.status}`,
    );
  }

  const prediction: ReplicatePrediction = await res.json();
  return prediction.id;
}

async function getPrediction(
  apiKey: string,
  predictionId: string,
): Promise<ReplicatePrediction> {
  const res = await fetch(`${BASE}/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Error al consultar predicción: ${res.status}`);
  return res.json();
}

export async function generateHunyuan3D(
  apiKey: string,
  images: UploadedImage[],
  quality: QualityProfile,
  onProgress: (progress: number, message: string) => void,
  userModel?: string,
): Promise<ModelResult> {
  const multiview = images.length > 1;
  const byAngle = (a: string) => images.find((i) => i.angle === a)?.dataUrl;
  const front = byAngle('front') ?? images[0].dataUrl;

  let modelVersion: string;
  let input: Record<string, unknown>;

  if (multiview && !userModel) {
    modelVersion = MULTIVIEW_REPLICATE_MODEL;
    input = {
      front_image: front,
      back_image: byAngle('back'),
      left_image: byAngle('left') ?? byAngle('right'),
      steps: quality.hunyuanSteps,
      guidance_scale: 5.5,
      octree_resolution: quality.hunyuanOctree,
      remove_background: true,
    };
    // Quitar claves vacías
    Object.keys(input).forEach((k) => input[k] == null && delete input[k]);
  } else {
    modelVersion = userModel?.trim() || DEFAULT_REPLICATE_MODEL;
    input = {
      image: front,
      steps: quality.hunyuanSteps,
      guidance_scale: 5.5,
      octree_resolution: quality.hunyuanOctree,
      remove_background: true,
    };
  }

  onProgress(8, `Enviando a Replicate (${modelVersion.split('/')[1] ?? modelVersion})...`);
  const predictionId = await createPrediction(apiKey, modelVersion, input);

  const start = Date.now();
  const deadline = start + 600000;
  let dots = 0;

  while (Date.now() < deadline) {
    const prediction = await getPrediction(apiKey, predictionId);

    if (prediction.status === 'succeeded' && prediction.output) {
      const output = Array.isArray(prediction.output)
        ? prediction.output
        : [prediction.output];
      const glbUrl =
        output.find((u) => typeof u === 'string' && u.endsWith('.glb')) ??
        output[0];
      if (!glbUrl) throw new Error('El modelo no produjo archivo GLB');
      return { glbUrl, taskId: predictionId, isBlob: false };
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(prediction.error ?? 'La predicción falló en Replicate');
    }

    dots = (dots + 1) % 4;
    const ellipsis = '.'.repeat(dots + 1);
    const logLine = prediction.logs?.split('\n').filter(Boolean).pop() ?? '';
    const statusMsg = logLine
      ? `Hunyuan 3D${ellipsis} ${logLine.slice(-50)}`
      : `Hunyuan 3D generando modelo${ellipsis}`;

    const elapsed = (Date.now() - start) / 1000;
    const approxProgress = Math.min(90, Math.round((elapsed / 130) * 90));
    onProgress(approxProgress, statusMsg);

    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error('Tiempo agotado esperando Hunyuan 3D');
}
