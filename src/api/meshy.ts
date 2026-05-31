import type { UploadedImage, ModelResult } from '../types';

const BASE = 'https://api.meshy.ai';

interface MeshyTaskResponse {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
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

export async function createMeshyTask(
  apiKey: string,
  images: UploadedImage[],
): Promise<string> {
  const primary = images[0];

  const body: Record<string, unknown> = {
    image_url: primary.dataUrl,
    enable_pbr: true,
    ai_model: 'meshy-4',
    topology: 'quad',
    target_polycount: 30000,
    should_remesh: true,
  };

  if (images.length > 1) {
    body.multiview_image_urls = images.slice(1).map((img) => img.dataUrl);
  }

  const res = await fetch(`${BASE}/v2/image-to-3d`, {
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
  return data.result as string;
}

export async function pollMeshyTask(
  apiKey: string,
  taskId: string,
  onProgress: (progress: number, message: string) => void,
  intervalMs = 4000,
  timeoutMs = 600000,
): Promise<ModelResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/v2/image-to-3d/${taskId}`, {
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

    if (task.status === 'FAILED' || task.status === 'EXPIRED') {
      throw new Error(task.task_error?.message ?? 'La tarea falló en Meshy');
    }

    const pct = task.progress ?? 0;
    const label =
      task.status === 'PENDING'
        ? 'En cola...'
        : `Generando modelo 3D... ${pct}%`;
    onProgress(pct, label);

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Tiempo agotado esperando el modelo');
}
