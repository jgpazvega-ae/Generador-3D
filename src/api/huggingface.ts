import type { UploadedImage, ModelResult } from '../types';
import { convertObjToGlb } from '../utils/objToGlb';

const SPACE = 'https://stabilityai-triposr.hf.space';

function mkHash() {
  return Math.random().toString(36).slice(2, 14);
}

// ── Upload ────────────────────────────────────────────────────────────────────
// Tries /gradio_api/upload (Gradio 5.x) first, falls back to /upload (Gradio 4.x).
// Returns a complete FileData object with url so Gradio can locate the file.
async function uploadImage(dataUrl: string): Promise<Record<string, unknown>> {
  const res0 = await fetch(dataUrl);
  const blob = await res0.blob();
  const size = blob.size;

  for (const prefix of ['/gradio_api', '']) {
    const form = new FormData();
    form.append('files', blob, 'input.png');
    const res = await fetch(`${SPACE}${prefix}/upload`, { method: 'POST', body: form });
    if (!res.ok) continue;

    const paths = (await res.json()) as (string | Record<string, unknown>)[];
    if (!paths.length) continue;

    const first = paths[0];
    if (typeof first === 'string') {
      return {
        path: first,
        url: `${SPACE}/file=${first}`,
        orig_name: 'input.png',
        mime_type: 'image/png',
        size,
        is_stream: false,
        meta: { _type: 'gradio.FileData' },
      };
    }
    // Gradio 5.x returns objects; ensure url is present
    return {
      ...first,
      url: (first.url as string | undefined) ?? `${SPACE}/file=${first.path}`,
      orig_name: first.orig_name ?? 'input.png',
      mime_type: first.mime_type ?? 'image/png',
      size: first.size ?? size,
      meta: (first.meta as object | undefined) ?? { _type: 'gradio.FileData' },
    };
  }

  throw new Error('No se pudo subir la imagen a HuggingFace');
}

// ── Queue ─────────────────────────────────────────────────────────────────────
// Tries /gradio_api/queue/join (Gradio 5.x) then /queue/join (Gradio 4.x).
async function joinQueue(fnIndex: number, data: unknown[], hash: string): Promise<void> {
  const body5 = JSON.stringify({ data, fn_index: fnIndex, session_hash: hash, trigger_id: null });
  const body4 = JSON.stringify({ data, fn_index: fnIndex, session_hash: hash, event_data: null });

  for (const [prefix, body] of [
    ['/gradio_api', body5],
    ['', body4],
  ] as [string, string][]) {
    const res = await fetch(`${SPACE}${prefix}/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) return;
  }
  throw new Error('Error al unirse a la cola de HuggingFace');
}

// ── SSE listener ──────────────────────────────────────────────────────────────
// Tries /gradio_api/queue/data (Gradio 5.x) first, falls back to /queue/data.
function listenSSE(
  hash: string,
  onProgress: (p: number, m: string) => void,
  pStart: number,
  pEnd: number,
): Promise<unknown[]> {
  const urls = [
    `${SPACE}/gradio_api/queue/data?session_hash=${hash}`,
    `${SPACE}/queue/data?session_hash=${hash}`,
  ];

  return new Promise((resolve, reject) => {
    let urlIdx = 0;
    let es: EventSource;
    let tmo: ReturnType<typeof setTimeout>;

    const tryUrl = (idx: number) => {
      if (es) { try { es.close(); } catch { /* ignore */ } }
      es = new EventSource(urls[idx]);
      tmo = setTimeout(() => {
        es.close();
        reject(new Error('Tiempo agotado esperando GPU (5 min). Intenta de nuevo.'));
      }, 300_000);

      es.onmessage = ({ data }) => {
        let msg: {
          msg: string;
          rank?: number;
          queue_size?: number;
          output?: { data?: unknown[]; error?: string };
          success?: boolean;
        };
        try { msg = JSON.parse(data); } catch { return; }

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
          if (msg.output?.error) reject(new Error(msg.output.error));
          else resolve(msg.output?.data ?? []);
        } else if (msg.msg === 'error') {
          clearTimeout(tmo);
          es.close();
          reject(new Error('Error en el servidor de HuggingFace. Intenta de nuevo.'));
        }
      };

      es.onerror = () => {
        clearTimeout(tmo);
        // If first URL fails immediately, try the other
        if (idx === 0) { urlIdx = 1; tryUrl(1); }
        else {
          es.close();
          reject(new Error('Conexión perdida con HuggingFace. Verifica tu internet.'));
        }
      };
    };

    tryUrl(urlIdx);
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateWithTripoSR(
  image: UploadedImage,
  onProgress: (p: number, m: string) => void,
): Promise<ModelResult> {
  onProgress(3, 'Subiendo imagen a HuggingFace TripoSR...');
  const uploaded = await uploadImage(image.dataUrl);

  // Step 1: preprocess (fn_index 0) — remove background + normalize
  onProgress(10, 'Preprocesando imagen...');
  const h1 = mkHash();
  await joinQueue(0, [uploaded, true, 0.85], h1);
  const [preprocessed] = await listenSSE(h1, onProgress, 10, 30);

  if (preprocessed == null) throw new Error('Preprocesado falló — la imagen no fue aceptada');

  // Step 2: generate 3D mesh (fn_index 1)
  onProgress(35, 'Generando modelo 3D (puede tardar 1–3 min)...');
  const h2 = mkHash();
  await joinQueue(1, [preprocessed, 256], h2);
  const genOut = await listenSSE(h2, onProgress, 35, 92);

  onProgress(93, 'Descargando modelo 3D...');

  // genOut[0] = gr.Model3D output (OBJ path), genOut[1] = gr.File (download)
  const fileData = (genOut[1] ?? genOut[0]) as { url?: string; path?: string } | null;
  if (!fileData) throw new Error('No se recibió modelo del servidor');

  const fileUrl = fileData.url ?? (fileData.path ? `${SPACE}/file=${fileData.path}` : null);
  if (!fileUrl) throw new Error('No se pudo obtener la URL del modelo');

  const modelRes = await fetch(fileUrl);
  if (!modelRes.ok) throw new Error('Error descargando el modelo 3D');

  const blob = await modelRes.blob();
  const objUrl = URL.createObjectURL(blob);

  // Convert OBJ → GLB for in-browser preview
  onProgress(94, 'Convirtiendo a GLB para vista previa...');
  let glbUrl = '';
  try {
    const glbBlob = await convertObjToGlb(blob);
    glbUrl = URL.createObjectURL(glbBlob);
  } catch {
    // Conversion failed — still return OBJ for download
  }

  return { glbUrl, objUrl, isBlob: true };
}
