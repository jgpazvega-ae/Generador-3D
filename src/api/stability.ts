import type { UploadedImage, ModelResult } from '../types';

const BASE = 'https://api.stability.ai';

export async function generateStabilityFast3D(
  apiKey: string,
  image: UploadedImage,
  onProgress: (progress: number, message: string) => void,
): Promise<ModelResult> {
  onProgress(10, 'Enviando imagen a Stability AI...');

  const form = new FormData();
  form.append('image', image.file);
  form.append('texture_resolution', '1024');
  form.append('foreground_ratio', '0.85');
  form.append('remesh', 'none');

  onProgress(30, 'Generando modelo 3D con Stable Fast 3D...');

  const res = await fetch(`${BASE}/v2beta/3d/stable-fast-3d`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Stability AI error ${res.status}`);
  }

  onProgress(85, 'Procesando resultado...');
  const blob = await res.blob();
  const glbUrl = URL.createObjectURL(blob);

  onProgress(100, '¡Modelo generado!');
  return {
    glbUrl,
    taskId: `stability-${Date.now()}`,
    isBlob: true,
  };
}
