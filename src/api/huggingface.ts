import type { UploadedImage, ModelResult } from '../types';
import { convertObjToGlb } from '../utils/objToGlb';

const SPACE = 'https://stabilityai-triposr.hf.space';

function mkHash() {
  return Math.random().toString(36).slice(2, 14);
}

async function uploadImage(dataUrl: string): Promise<unknown> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append('files', blob, 'input.png');

  const res = await fetch(`${SPACE}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Error subiendo imagen a HuggingFace (${res.status})`);

  const paths = (await res.json()) as string[] | unknown[];
  const first = paths[0];
  // Gradio v4 returns objects, v3 returns strings
  return typeof first === 'string' ? { path: first, is_file: true } : first;
}

async function joinQueue(fnIndex: number, data: unknown[], hash: string): Promise<void> {
  const res = await fetch(`${SPACE}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, fn_index: fnIndex, session_hash: hash, event_data: null }),
  });
  if (!res.ok) throw new Error(`Error en cola de HuggingFace (${res.status})`);
}

function listenSSE(
  hash: string,
  onProgress: (p: number, m: string) => void,
  pStart: number,
  pEnd: number,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const es = new EventSource(`${SPACE}/queue/data?session_hash=${hash}`);
    const tmo = setTimeout(() => {
      es.close();
      reject(new Error('Tiempo agotado esperando GPU (5 min). Intenta de nuevo.'));
    }, 300_000);

    es.onmessage = ({ data }) => {
      const msg = JSON.parse(data) as {
        msg: string;
        rank?: number;
        queue_size?: number;
        output?: { data?: unknown[]; error?: string };
      };

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
      es.close();
      reject(new Error('Conexión perdida con HuggingFace. Verifica tu internet.'));
    };
  });
}

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

  // Step 2: generate 3D mesh (fn_index 1)
  onProgress(35, 'Generando modelo 3D (puede tardar 1–3 min)...');
  const h2 = mkHash();
  await joinQueue(1, [preprocessed, 256], h2);
  const genOut = await listenSSE(h2, onProgress, 35, 92);

  onProgress(93, 'Descargando modelo 3D...');

  // genOut[0] = gr.Model3D output (OBJ path), genOut[1] = gr.File (download)
  const fileData = (genOut[1] ?? genOut[0]) as {
    url?: string;
    path?: string;
  } | null;

  if (!fileData) throw new Error('No se recibió modelo del servidor');

  const fileUrl =
    fileData.url ?? (fileData.path ? `${SPACE}/file=${fileData.path}` : null);

  if (!fileUrl) throw new Error('No se pudo obtener la URL del modelo');

  const modelRes = await fetch(fileUrl);
  if (!modelRes.ok) throw new Error('Error descargando el modelo 3D');

  const blob = await modelRes.blob();
  const objUrl = URL.createObjectURL(blob);

  // Convert OBJ → GLB for in-browser preview via <model-viewer>
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
