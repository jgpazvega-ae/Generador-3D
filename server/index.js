import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const rawOrigins = process.env.ALLOWED_ORIGINS ?? 'https://jgpazvega-ae.github.io';
const allowedOrigins = rawOrigins.split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Allow server-to-server calls (no origin header) and listed origins
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true);
    // Always allow localhost for local dev
    if (/^https?:\/\/localhost/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origen no permitido: ${origin}`));
  },
}));

app.use(express.json({ limit: '50mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const maxPerHour = Number(process.env.RATE_LIMIT ?? 20);
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: maxPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Límite de ${maxPerHour} solicitudes por hora alcanzado. Intenta más tarde.` },
});
app.use('/proxy', limiter);

// ── Env vars ──────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_TOKEN;
const MESHY_KEY = process.env.MESHY_KEY;
const STABILITY_KEY = process.env.STABILITY_KEY;

// ── Health / info ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'Generador 3D Proxy' });
});

app.get('/proxy/providers', (_req, res) => {
  res.json({
    replicate: !!REPLICATE_TOKEN,
    meshy: !!MESHY_KEY,
    stability: !!STABILITY_KEY,
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────
function noKey(provider, res) {
  return res.status(503).json({ error: `${provider} no está configurado en este servidor.` });
}

async function fwd(res, fn) {
  try { await fn(); } catch (err) {
    res.status(500).json({ error: err?.message ?? 'Error interno del proxy' });
  }
}

// ── Replicate ─────────────────────────────────────────────────────────────────
const REPLICATE_BASE = 'https://api.replicate.com/v1';

app.post('/proxy/replicate/predictions', (req, res) => {
  if (!REPLICATE_TOKEN) return noKey('Replicate', res);
  fwd(res, async () => {
    const up = await fetch(`${REPLICATE_BASE}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Token ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.status(up.status).json(await up.json());
  });
});

app.post('/proxy/replicate/models/:owner/:model/predictions', (req, res) => {
  if (!REPLICATE_TOKEN) return noKey('Replicate', res);
  const { owner, model } = req.params;
  fwd(res, async () => {
    const up = await fetch(`${REPLICATE_BASE}/models/${owner}/${model}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Token ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.status(up.status).json(await up.json());
  });
});

app.get('/proxy/replicate/predictions/:id', (req, res) => {
  if (!REPLICATE_TOKEN) return noKey('Replicate', res);
  fwd(res, async () => {
    const up = await fetch(`${REPLICATE_BASE}/predictions/${req.params.id}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    res.status(up.status).json(await up.json());
  });
});

// ── Meshy ─────────────────────────────────────────────────────────────────────
const MESHY_BASE = 'https://api.meshy.ai/openapi/v1';
const MESHY_ENDPOINTS = ['image-to-3d', 'multi-image-to-3d'];

for (const ep of MESHY_ENDPOINTS) {
  app.post(`/proxy/meshy/${ep}`, (req, res) => {
    if (!MESHY_KEY) return noKey('Meshy', res);
    fwd(res, async () => {
      const up = await fetch(`${MESHY_BASE}/${ep}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MESHY_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      res.status(up.status).json(await up.json());
    });
  });

  app.get(`/proxy/meshy/${ep}/:id`, (req, res) => {
    if (!MESHY_KEY) return noKey('Meshy', res);
    fwd(res, async () => {
      const up = await fetch(`${MESHY_BASE}/${ep}/${req.params.id}`, {
        headers: { Authorization: `Bearer ${MESHY_KEY}` },
      });
      res.status(up.status).json(await up.json());
    });
  });
}

// ── Stability AI ──────────────────────────────────────────────────────────────
// Frontend sends JSON: { imageDataUrl, textureResolution, foregroundRatio, ... }
// Proxy converts imageDataUrl → blob and forwards as multipart FormData.
const STABILITY_BASE = 'https://api.stability.ai';

async function stabilityProxy(req, res, path) {
  if (!STABILITY_KEY) return noKey('Stability', res);
  fwd(res, async () => {
    const { imageDataUrl, ...params } = req.body;
    if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl requerido' });

    const [meta, b64] = imageDataUrl.split(',');
    const mimeType = (meta.match(/:(.*?);/) ?? [])[1] ?? 'image/png';
    const buffer = Buffer.from(b64, 'base64');

    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimeType }), 'input.png');
    for (const [k, v] of Object.entries(params)) form.append(k, String(v));

    const up = await fetch(`${STABILITY_BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STABILITY_KEY}`, Accept: 'model/gltf-binary' },
      body: form,
    });

    if (!up.ok) {
      let detail = up.statusText;
      try { const j = await up.json(); detail = j.errors?.join(', ') || j.message || detail; } catch {}
      return res.status(up.status).json({ error: `${up.status}: ${detail}` });
    }

    const buf = Buffer.from(await up.arrayBuffer());
    res.set('Content-Type', 'model/gltf-binary');
    res.send(buf);
  });
}

app.post('/proxy/stability/spar3d', (req, res) =>
  stabilityProxy(req, res, '/v2beta/3d/stable-point-aware-3d'));

app.post('/proxy/stability/fast3d', (req, res) =>
  stabilityProxy(req, res, '/v2beta/3d/stable-fast-3d'));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Generador 3D Proxy] Listening on port ${PORT}`);
  console.log(`  Replicate: ${REPLICATE_TOKEN ? '✓' : '✗ (no configurado)'}`);
  console.log(`  Meshy:     ${MESHY_KEY ? '✓' : '✗ (no configurado)'}`);
  console.log(`  Stability: ${STABILITY_KEY ? '✓' : '✗ (no configurado)'}`);
});
