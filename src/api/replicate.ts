import type { UploadedImage, ModelResult } from '../types';

const BASE = 'https://api.replicate.com/v1';

// Default: Hunyuan 3D 2.0 on Replicate
export const DEFAULT_REPLICATE_MODEL =
  'tencent/hunyuan3d-2:latest';

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
  // modelVersion can be "owner/model:version" or "owner/model:latest"
  const [modelPath, version] = modelVersion.split(':');
  const [owner, model] = modelPath.split('/');

  const endpoint =
    version && version !== 'latest'
      ? `${BASE}/predictions`
      : `${BASE}/models/${owner}/${model}/predictions`;

  const body: Record<string, unknown> = { input };
  if (version && version !== 'latest') {
    body.version = version;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
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
  modelVersion: string,
  onProgress: (progress: number, message: string) => void,
): Promise<ModelResult> {
  onProgress(5, 'Enviando imágenes a Replicate (Hunyuan 3D)...');

  const primary = images[0];

  const input: Record<string, unknown> = {
    image: primary.dataUrl,
    steps: 50,
    guidance_scale: 5,
    octree_resolution: 256,
    num_chunks: 200000,
    randomize_seed: true,
    seed: 42,
  };

  if (images.length > 1) {
    input.image_front = images.find((i) => i.angle === 'front')?.dataUrl ?? primary.dataUrl;
    const back = images.find((i) => i.angle === 'back');
    const left = images.find((i) => i.angle === 'left');
    const right = images.find((i) => i.angle === 'right');
    if (back) input.image_back = back.dataUrl;
    if (left) input.image_left = left.dataUrl;
    if (right) input.image_right = right.dataUrl;
  }

  onProgress(10, 'Tarea creada, en cola...');
  const predictionId = await createPrediction(apiKey, modelVersion, input);

  const deadline = Date.now() + 600000;
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
      ? `Hunyuan 3D procesando${ellipsis} ${logLine.slice(-60)}`
      : `Hunyuan 3D generando modelo${ellipsis}`;

    const elapsed = (Date.now() - (deadline - 600000)) / 1000;
    const approxProgress = Math.min(90, Math.round((elapsed / 120) * 90));
    onProgress(approxProgress, statusMsg);

    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error('Tiempo agotado esperando Hunyuan 3D');
}
