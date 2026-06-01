import type { UploadedImage, ModelResult } from '../types';

const SPACE = 'https://stabilityai-triposr.hf.space';

// ── Upload ────────────────────────────────────────────────────────────────────
// Gradio 5.x: POST /gradio_api/upload  (falls back to /upload for 4.x)
async function uploadImage(dataUrl: string): Promise<Record<string, unknown>> {
  const res0 = await fetch(dataUrl);
  const blob = await res0.blob();
  const size = blob.size;

  for (const prefix of ['/gradio_api', '']) {
    const form = new FormData();
    form.append('files', blob, 'input.png');
    let res: Response;
    try {
      res = await fetch(`${SPACE}${prefix}/upload`, { method: 'POST', body: form });
    } catch {
      continue;
    }
    if (!res.ok) continue;

    const paths = (await res.json()) as (string | Record<string, unknown>)[];
    if (!paths.length) continue;

    const first = paths[0];
    if (typeof first === 'string') {
      return {
        path: first,
        url: `${SPACE}/file=${first}`,
        orig_name: 'input.png',
        mime_type: blob.type || 'image/png',
        size,
        is_stream: false,
        meta: { _type: 'gradio.FileData' },
      };
    }
    const f = first as Record<string, unknown>;
    return {
      ...f,
      url: (f.url as string | undefined) ?? `${SPACE}/file=${f.path as string}`,
      orig_name: f.orig_name ?? 'input.png',
      mime_type: f.mime_type ?? blob.type ?? 'image/png',
      size: f.size ?? size,
      meta: (f.meta as object | undefined) ?? { _type: 'gradio.FileData' },
    };
  }

  throw new Error('No se pudo subir la imagen a HuggingFace TripoSR');
}

// ── Gradio 5.x /call/ API ─────────────────────────────────────────────────────
// POST /gradio_api/call/<endpoint>  → { event_id }
// GET  /gradio_api/call/<endpoint>/<event_id>  → SSE

interface GradioOutput {
  data: unknown[];
}

function callEndpointSSE(
  endpoint: string,
  eventId: string,
  onProgress: (p: number, m: string) => void,
  pStart: number,
  pEnd: number,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const url = `${SPACE}/gradio_api/call/${endpoint}/${eventId}`;
    const es = new EventSource(url);

    const tmo = setTimeout(() => {
      es.close();
      reject(new Error('Tiempo agotado esperando GPU (5 min). Intenta de nuevo.'));
    }, 300_000);

    es.addEventListener('error', (e) => {
      // EventSource fires 'error' on SSE data events too — parse them
      const raw = (e as MessageEvent).data;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw) as { output?: GradioOutput; msg?: string };
          if (parsed.output?.data) {
            clearTimeout(tmo);
            es.close();
            resolve(parsed.output.data);
            return;
          }
        } catch { /* not JSON */ }
      }
      // Real connection error after a moment (not an SSE data error)
      clearTimeout(tmo);
      es.close();
      reject(new Error('Conexión perdida con HuggingFace. Verifica tu internet.'));
    });

    es.onmessage = ({ data }) => {
      let msg: { msg?: string; output?: GradioOutput; rank?: number; queue_size?: number };
      try { msg = JSON.parse(data); } catch { return; }

      if (!msg.msg) return;
      if (msg.msg === 'estimation') {
        const pos = msg.rank ?? msg.queue_size ?? '?';
        onProgress(pStart, `En cola de HuggingFace: posición ${pos}...`);
      } else if (msg.msg === 'process_starts') {
        onProgress(pStart + (pEnd - pStart) * 0.3, 'GPU asignada, procesando...');
      } else if (msg.msg === 'process_generating') {
        onProgress(pStart + (pEnd - pStart) * 0.65, 'Generando malla 3D...');
      } else if (msg.msg === 'process_completed') {
        clearTimeout(tmo);
        es.close();
        const out = msg.output as (GradioOutput & { error?: string }) | undefined;
        if (out?.error) reject(new Error(out.error));
        else resolve(out?.data ?? []);
      } else if (msg.msg === 'error') {
        clearTimeout(tmo);
        es.close();
        reject(new Error('Error en el servidor de HuggingFace. Intenta de nuevo.'));
      }
    };

    es.onerror = () => {
      clearTimeout(tmo);
      es.close();
      reject(new Error('No se pudo conectar con HuggingFace. Verifica tu internet.'));
    };
  });
}

async function callGradio(
  endpoint: string,
  data: unknown[],
  onProgress: (p: number, m: string) => void,
  pStart: number,
  pEnd: number,
): Promise<unknown[]> {
  const res = await fetch(`${SPACE}/gradio_api/call/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `TripoSR error ${res.status} al llamar /${endpoint}`);
  }

  const { event_id } = await res.json() as { event_id: string };
  return callEndpointSSE(endpoint, event_id, onProgress, pStart, pEnd);
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateWithTripoSR(
  image: UploadedImage,
  onProgress: (p: number, m: string) => void,
): Promise<ModelResult> {
  // 1. Upload
  onProgress(3, 'Subiendo imagen a HuggingFace TripoSR...');
  const uploaded = await uploadImage(image.dataUrl);

  // 2. Preprocess — named endpoint /preprocess (Gradio 5.x)
  onProgress(10, 'Preprocesando imagen...');
  const [preprocessed] = await callGradio('preprocess', [uploaded, true, 0.85], onProgress, 10, 30);

  if (preprocessed == null) throw new Error('Preprocesado falló — imagen no aceptada');

  // 3. Generate 3D — named endpoint /generate
  // Output: [OBJ FileData, GLB FileData] (space now provides both formats directly)
  onProgress(35, 'Generando modelo 3D (puede tardar 1–3 min)...');
  const genOut = await callGradio('generate', [preprocessed, 256], onProgress, 35, 92);

  onProgress(93, 'Descargando modelo 3D...');

  // Find GLB and OBJ in outputs
  type FileData = { url?: string; path?: string; orig_name?: string };
  const toUrl = (fd: FileData | null) =>
    fd ? (fd.url ?? (fd.path ? `${SPACE}/file=${fd.path}` : null)) : null;

  const glbData = genOut.find(
    (o) => typeof o === 'object' && o !== null &&
      ((o as FileData).orig_name?.endsWith('.glb') || (o as FileData).url?.endsWith('.glb') || (o as FileData).path?.endsWith('.glb'))
  ) as FileData | undefined;

  const objData = genOut.find(
    (o) => typeof o === 'object' && o !== null &&
      ((o as FileData).orig_name?.endsWith('.obj') || (o as FileData).url?.endsWith('.obj') || (o as FileData).path?.endsWith('.obj'))
  ) as FileData | undefined;

  // Fallback: take first and second outputs
  const firstData = (genOut[0] ?? null) as FileData | null;
  const secondData = (genOut[1] ?? null) as FileData | null;

  const glbUrl_remote = toUrl(glbData ?? secondData);
  const objUrl_remote = toUrl(objData ?? firstData);

  // Download GLB if available (space now outputs GLB natively — no conversion needed)
  let glbUrl = '';
  if (glbUrl_remote) {
    try {
      const r = await fetch(glbUrl_remote);
      if (r.ok) {
        const b = await r.blob();
        glbUrl = URL.createObjectURL(b);
      }
    } catch { /* will fall through to OBJ */ }
  }

  let objUrl: string | undefined;
  if (objUrl_remote) {
    try {
      const r = await fetch(objUrl_remote);
      if (r.ok) {
        const b = await r.blob();
        objUrl = URL.createObjectURL(b);
        // If no GLB yet, try converting OBJ → GLB
        if (!glbUrl) {
          onProgress(94, 'Convirtiendo a GLB para vista previa...');
          try {
            const { convertObjToGlb } = await import('../utils/objToGlb');
            const glbBlob = await convertObjToGlb(b);
            glbUrl = URL.createObjectURL(glbBlob);
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  if (!glbUrl && !objUrl) throw new Error('No se pudo descargar el modelo 3D');

  return { glbUrl, objUrl, isBlob: true };
}
