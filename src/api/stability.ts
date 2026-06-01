import type { UploadedImage, ModelResult, QualityProfile } from '../types';

const STABILITY_DIRECT = 'https://api.stability.ai';

/**
 * Genera un modelo 3D con Stability AI.
 * Usa SPAR3D (Stable Point Aware 3D) por defecto: combina difusión de nube de
 * puntos + regresión de malla, lo que predice mucho mejor la parte trasera no
 * visible → mayor similitud que Stable Fast 3D.
 * Si SPAR3D no está disponible en la cuenta, hace fallback a Stable Fast 3D.
 */
export async function generateStability3D(
  apiKey: string,
  image: UploadedImage,
  quality: QualityProfile,
  onProgress: (progress: number, message: string) => void,
  proxyUrl?: string,
): Promise<ModelResult> {
  onProgress(15, 'Enviando imagen a Stability AI (SPAR3D)...');

  try {
    return await callEndpoint(apiKey, 'spar3d', image, quality, onProgress, true, proxyUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (/404|not found|not available|access/i.test(msg)) {
      onProgress(20, 'SPAR3D no disponible, usando Stable Fast 3D...');
      return await callEndpoint(apiKey, 'fast3d', image, quality, onProgress, false, proxyUrl);
    }
    throw err;
  }
}

async function callEndpoint(
  apiKey: string,
  endpoint: 'spar3d' | 'fast3d',
  image: UploadedImage,
  quality: QualityProfile,
  onProgress: (progress: number, message: string) => void,
  isSpar: boolean,
  proxyUrl?: string,
): Promise<ModelResult> {
  onProgress(35, 'Reconstruyendo geometría y texturas...');

  let res: Response;

  if (proxyUrl) {
    // Proxy mode: send JSON with imageDataUrl
    const imageDataUrl = image.dataUrl;
    const body: Record<string, unknown> = {
      imageDataUrl,
      texture_resolution: String(quality.stabilityTextureResolution),
      foreground_ratio: isSpar ? '1.3' : '0.85',
      remesh: 'quad',
    };
    if (isSpar) { body.target_type = 'face'; body.target_count = '20000'; }

    res = await fetch(`${proxyUrl}/proxy/stability/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } else {
    // Direct mode: send multipart FormData
    const path = isSpar
      ? '/v2beta/3d/stable-point-aware-3d'
      : '/v2beta/3d/stable-fast-3d';
    const form = new FormData();
    form.append('image', image.file);
    form.append('texture_resolution', String(quality.stabilityTextureResolution));
    form.append('foreground_ratio', isSpar ? '1.3' : '0.85');
    form.append('remesh', 'quad');
    if (isSpar) { form.append('target_type', 'face'); form.append('target_count', '20000'); }

    res = await fetch(`${STABILITY_DIRECT}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'model/gltf-binary' },
      body: form,
    });
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.errors?.join(', ') || j.message || j.error || JSON.stringify(j);
    } catch { /* binary or empty */ }
    throw new Error(`${res.status}: ${detail}`);
  }

  onProgress(85, 'Procesando resultado...');
  const blob = await res.blob();
  const glbUrl = URL.createObjectURL(blob);

  onProgress(100, '¡Modelo generado!');
  return { glbUrl, taskId: `stability-${Date.now()}`, isBlob: true };
}
