import type { UploadedImage, ModelResult, QualityProfile } from '../types';

// API actual de Meshy (openapi v1). El antiguo /v2/ está obsoleto.
const BASE = 'https://api.meshy.ai/openapi/v1';

interface MeshyTaskResponse {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED';
  progress: number;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
  task_error?: { message: string };
}

/**
 * Crea una tarea de generación 3D en Meshy.
 * - 1 imagen  → endpoint image-to-3d
 * - ≥2 imágenes → endpoint multi-image-to-3d (reconstrucción multi-vista,
 *   mucho mejor para similitud).
 */
export async function createMeshyTask(
  apiKey: string,
  images: UploadedImage[],
  quality: QualityProfile,
): Promise<{ taskId: string; endpoint: string }> {
  const multi = images.length > 1;
  const endpoint = multi ? 'multi-image-to-3d' : 'image-to-3d';

  const common = {
    ai_model: quality.meshyModel,
    topology: 'quad' as const,
    target_polycount: quality.meshyPolycount,
    should_remesh: true,
    should_texture: true,
    enable_pbr: quality.enablePbr,
    // Textura base 4K: solo soportado por meshy-6
    hd_texture: quality.meshyModel === 'meshy-6',
  };

  const body: Record<string, unknown> = multi
    ? { image_urls: orderImages(images).map((i) => i.dataUrl), ...common }
    : { image_url: images[0].dataUrl, ...common };

  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Meshy error ${res.status}`);
  }

  const data = await res.json();
  return { taskId: data.result as string, endpoint };
}

export async function pollMeshyTask(
  apiKey: string,
  taskId: string,
  endpoint: string,
  onProgress: (progress: number, message: string) => void,
  intervalMs = 4000,
  timeoutMs = 600000,
): Promise<ModelResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/${endpoint}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Error al consultar tarea: ${res.status}`);

    const task: MeshyTaskResponse = await res.json();

    if (task.status === 'SUCCEEDED' && task.model_urls) {
      return {
        glbUrl: task.model_urls.glb ?? '',
        fbxUrl: task.model_urls.fbx,
        objUrl: task.model_urls.obj,
        thumbnailUrl: task.thumbnail_url,
        taskId,
        isBlob: false,
      };
    }

    if (['FAILED', 'EXPIRED', 'CANCELED'].includes(task.status)) {
      throw new Error(task.task_error?.message ?? 'La tarea falló en Meshy');
    }

    const pct = task.progress ?? 0;
    const label =
      task.status === 'PENDING' ? 'En cola...' : `Generando modelo 3D... ${pct}%`;
    onProgress(pct, label);

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Tiempo agotado esperando el modelo');
}

/** Ordena las imágenes en un orden de vistas estable y útil para Meshy. */
function orderImages(images: UploadedImage[]): UploadedImage[] {
  const priority: Record<string, number> = {
    front: 0,
    right: 1,
    back: 2,
    left: 3,
    top: 4,
    bottom: 5,
    diagonal: 6,
    custom: 7,
  };
  return [...images].sort(
    (a, b) => (priority[a.angle] ?? 9) - (priority[b.angle] ?? 9),
  );
}
