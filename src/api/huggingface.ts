import type { UploadedImage, ModelResult } from '../types';

const SPACE = 'https://stabilityai-triposr.hf.space';

type FD = { url?: string; path?: string; orig_name?: string };

// Build a download URL that actually works. The space's own `url` field is
// buggy (it emits `/ca/file=…` which 404s), so we construct `/file=<path>`
// ourselves — confirmed working — and only fall back to the server url.
function fileUrl(fd: FD | null | undefined): string | null {
  if (!fd) return null;
  if (fd.path) return `${SPACE}/file=${fd.path}`;
  if (fd.url) return fd.url;
  return null;
}

// ── Upload ────────────────────────────────────────────────────────────────────
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

// ── SSE via fetch streaming ───────────────────────────────────────────────────
// We deliberately avoid EventSource: it auto-reconnects when the server closes
// the stream, and reconnecting to a consumed event_id returns an error — which
// turns every normal completion (or transient idle during a long GPU wait) into
// a spurious failure. A single streamed fetch gives us full control instead.
async function callEndpointSSE(
  endpoint: string,
  eventId: string,
  onProgress: (p: number, m: string) => void,
  pStart: number,
  pEnd: number,
): Promise<unknown[]> {
  const url = `${SPACE}/call/${endpoint}/${eventId}`;

  const ctrl = new AbortController();
  const tmo = setTimeout(() => ctrl.abort(), 300_000); // 5 min hard cap

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(tmo);
    if ((e as Error).name === 'AbortError') {
      throw new Error('Tiempo agotado esperando GPU (5 min). Intenta de nuevo.');
    }
    throw new Error('No se pudo conectar con HuggingFace. Verifica tu internet.');
  }

  if (!res.ok || !res.body) {
    clearTimeout(tmo);
    throw new Error(`HuggingFace respondió ${res.status} en /${endpoint}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLine = '';

  // Parse one complete SSE event (event name + data). Returns a result or null.
  const handleEvent = (): { ok: true; data: unknown[] } | { ok: false; error: string } | null => {
    if (eventName === 'generating') {
      onProgress(pStart + (pEnd - pStart) * 0.6, 'Generando malla 3D...');
      return null;
    }
    if (eventName === 'complete') {
      try { return { ok: true, data: JSON.parse(dataLine) as unknown[] }; }
      catch { return { ok: true, data: [] }; }
    }
    if (eventName === 'error') {
      // The server sends `data: null` for "no result"; treat as a retryable error.
      const msg = !dataLine || dataLine === 'null'
        ? 'El servidor de HuggingFace no devolvió un modelo. Reintentando...'
        : dataLine;
      return { ok: false, error: msg };
    }
    // Unnamed / Gradio 4.x style message
    try {
      const m = JSON.parse(dataLine) as {
        msg?: string; rank?: number; queue_size?: number;
        output?: { data?: unknown[]; error?: string };
      };
      if (m.msg === 'estimation') {
        onProgress(pStart, `En cola de HuggingFace: posición ${m.rank ?? m.queue_size ?? '?'}...`);
      } else if (m.msg === 'process_starts') {
        onProgress(pStart + (pEnd - pStart) * 0.3, 'GPU asignada, procesando...');
      } else if (m.msg === 'process_generating') {
        onProgress(pStart + (pEnd - pStart) * 0.6, 'Generando malla 3D...');
      } else if (m.msg === 'process_completed') {
        if (m.output?.error) return { ok: false, error: m.output.error };
        return { ok: true, data: m.output?.data ?? [] };
      }
    } catch { /* not JSON, ignore */ }
    return null;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split into SSE event blocks separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        eventName = '';
        dataLine = '';
        for (const raw of block.split('\n')) {
          if (raw.startsWith('event:')) eventName = raw.slice(6).trim();
          else if (raw.startsWith('data:')) {
            const part = raw.slice(5).replace(/^ /, '');
            dataLine = dataLine ? dataLine + '\n' + part : part;
          }
        }

        const result = handleEvent();
        if (result) {
          clearTimeout(tmo);
          ctrl.abort(); // stop the stream cleanly
          if (result.ok) return result.data;
          throw new Error(result.error);
        }
      }
    }
  } finally {
    clearTimeout(tmo);
  }

  // Stream ended with no terminal event.
  throw new Error('La conexión con HuggingFace se cerró antes de terminar.');
}

// ── /call/ API ────────────────────────────────────────────────────────────────
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

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateWithTripoSR(
  image: UploadedImage,
  onProgress: (p: number, m: string) => void,
): Promise<ModelResult> {
  onProgress(3, 'Subiendo imagen a HuggingFace TripoSR...');
  const uploaded = await uploadImage(image.dataUrl);

  onProgress(10, 'Preprocesando imagen...');
  const [preprocessed] = await callGradio('preprocess', [uploaded, true, 0.85], onProgress, 10, 30);
  if (preprocessed == null) throw new Error('Preprocesado falló — imagen no aceptada');

  // Marching-cubes resolution: 320 is the space's maximum — best geometry detail.
  onProgress(35, 'Generando modelo 3D en alta resolución (puede tardar 1–3 min)...');
  const genOut = await callGradio('generate', [preprocessed, 320], onProgress, 35, 92);

  onProgress(93, 'Descargando modelo 3D...');

  const isExt = (f: FD, ext: string) =>
    f.orig_name?.endsWith(ext) || f.path?.endsWith(ext) || f.url?.endsWith(ext);

  const asFD = (o: unknown): FD | null =>
    o && typeof o === 'object' ? (o as FD) : null;

  const glbData = genOut.map(asFD).find((f) => f && isExt(f, '.glb')) ?? null;
  const objData = genOut.map(asFD).find((f) => f && isExt(f, '.obj')) ?? null;

  // Fallback to TripoSR output order: [0] = OBJ, [1] = GLB
  const glbRemote = fileUrl(glbData ?? asFD(genOut[1]));
  const objRemote = fileUrl(objData ?? asFD(genOut[0]));

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
