import type { UploadedImage, ModelResult } from '../types';

const SPACE = 'https://stabilityai-triposr.hf.space';

async function uploadImage(dataUrl: string): Promise<Record<string, unknown>> {
  const res0 = await fetch(dataUrl);
  const blob = await res0.blob();
  const size = blob.size;

  for (const prefix of ['', '/gradio_api']) {
    const form = new FormData();
    form.append('files', blob, 'input.png');
    let res: Response;
    try { res = await fetch(`${SPACE}${prefix}/upload`, { method: 'POST', body: form }); }
    catch { continue; }
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

function callEndpointSSE(
  endpoint: string,
  eventId: string,
  onProgress: (p: number, m: string) => void,
  pStart: number,
  pEnd: number,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const url = `${SPACE}/call/${endpoint}/${eventId}`;
    const es = new EventSource(url);

    const tmo = setTimeout(() => {
      es.close();
      reject(new Error('Tiempo agotado esperando GPU (5 min). Intenta de nuevo.'));
    }, 300_000);

    let settled = false;
    const done = (data: unknown[]) => {
      if (settled) return; settled = true;
      clearTimeout(tmo); es.close(); resolve(data);
    };
    const fail = (msg: string) => {
      if (settled) return; settled = true;
      clearTimeout(tmo); es.close(); reject(new Error(msg));
    };

    es.addEventListener('generating', () => {
      onProgress(pStart + (pEnd - pStart) * 0.65, 'Generando malla 3D...');
    });

    es.addEventListener('complete', (e: Event) => {
      try { done(JSON.parse((e as MessageEvent).data) as unknown[]); }
      catch { done([]); }
    });

    es.addEventListener('error', (e: Event) => {
      const me = e as MessageEvent;
      if (me.data !== undefined) {
        fail(String(me.data || 'Error en el servidor de HuggingFace'));
      }
    });

    es.onmessage = ({ data }) => {
      let msg: {
        msg?: string;
        rank?: number;
        queue_size?: number;
        output?: { data?: unknown[]; error?: string };
      };
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
        if (msg.output?.error) fail(msg.output.error);
        else done(msg.output?.data ?? []);
      } else if (msg.msg === 'error') {
        fail('Error en el servidor de HuggingFace. Intenta de nuevo.');
      }
    };

    es.onerror = () => {
      fail('No se pudo conectar con HuggingFace. Verifica tu internet.');
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
  const res = await fetch(`${SPACE}/call/${endpoint}`, {
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

export async function generateWithTripoSR(
  image: UploadedImage,
  onProgress: (p: number, m: string) => void,
): Promise<ModelResult> {
  onProgress(3, 'Subiendo imagen a HuggingFace TripoSR...');
  const uploaded = await uploadImage(image.dataUrl);

  onProgress(10, 'Preprocesando imagen...');
  const [preprocessed] = await callGradio('preprocess', [uploaded, true, 0.85], onProgress, 10, 30);
  if (preprocessed == null) throw new Error('Preprocesado falló — imagen no aceptada');

  onProgress(35, 'Generando modelo 3D (puede tardar 1–3 min)...');
  const genOut = await callGradio('generate', [preprocessed, 256], onProgress, 35, 92);

  onProgress(93, 'Descargando modelo 3D...');

  type FD = { url?: string; path?: string; orig_name?: string };
  const toUrl = (fd: FD | null) =>
    fd ? (fd.url ?? (fd.path ? `${SPACE}/file=${fd.path}` : null)) : null;

  const glbData = genOut.find((o) => {
    if (typeof o !== 'object' || !o) return false;
    const f = o as FD;
    return f.orig_name?.endsWith('.glb') || f.url?.endsWith('.glb') || f.path?.endsWith('.glb');
  }) as FD | undefined;

  const objData = genOut.find((o) => {
    if (typeof o !== 'object' || !o) return false;
    const f = o as FD;
    return f.orig_name?.endsWith('.obj') || f.url?.endsWith('.obj') || f.path?.endsWith('.obj');
  }) as FD | undefined;

  const glbRemote = toUrl(glbData ?? (genOut[1] as FD | null));
  const objRemote = toUrl(objData ?? (genOut[0] as FD | null));

  let glbUrl = '';
  if (glbRemote) {
    try {
      const r = await fetch(glbRemote);
      if (r.ok) glbUrl = URL.createObjectURL(await r.blob());
    } catch { /* continue */ }
  }

  let objUrl: string | undefined;
  if (objRemote) {
    try {
      const r = await fetch(objRemote);
      if (r.ok) {
        const b = await r.blob();
        objUrl = URL.createObjectURL(b);
        if (!glbUrl) {
          onProgress(94, 'Convirtiendo OBJ a GLB para vista previa...');
          try {
            const { convertObjToGlb } = await import('../utils/objToGlb');
            glbUrl = URL.createObjectURL(await convertObjToGlb(b));
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  if (!glbUrl && !objUrl) throw new Error('No se pudo descargar el modelo 3D');
  return { glbUrl, objUrl, isBlob: true };
}
