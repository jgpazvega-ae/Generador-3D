import { useState, useCallback, useRef } from 'react';
import type {
  ApiConfig,
  UploadedImage,
  Measurements,
  GenerationState,
  GenerationSettings,
  ModelResult,
} from '../types';
import { QUALITY_PROFILES } from '../types';
import { createMeshyTask, pollMeshyTask } from '../api/meshy';
import { generateStability3D } from '../api/stability';
import { generateHunyuan3D } from '../api/replicate';
import { generateWithTripoSR } from '../api/huggingface';
import {
  compressImageToDataUrl,
  removeImageBackground,
} from '../utils/imageUtils';
import { scaleGlbToMeasurements } from '../utils/glbScaling';

// Errors that should NOT be retried (fatal: wrong key, quota, etc.)
const FATAL_PATTERNS = /api key|apikey|unauthorized|401|403|quota|exceeded|invalid.*key|key.*invalid|forbidden/i;

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  return !FATAL_PATTERNS.test(err.message);
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState({ status: 'idle', progress: 0, message: '' });
  }, []);

  const generate = useCallback(
    async (
      config: ApiConfig,
      images: UploadedImage[],
      settings: GenerationSettings,
      measurements: Measurements,
    ) => {
      cancelledRef.current = false;
      setState({ status: 'pending', progress: 0, message: 'Iniciando...' });

      const onProgress = (progress: number, message: string) => {
        if (cancelledRef.current) return;
        setState((prev) => ({ ...prev, status: 'processing', progress, message }));
      };

      const MAX_RETRIES = 10;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            const wait = Math.min(5000 * attempt, 30_000);
            const errMsg = lastError?.message ?? 'error desconocido';
            onProgress(0, `Reintentando (${attempt}/${MAX_RETRIES})... ${errMsg.slice(0, 60)}`);
            await new Promise((r) => setTimeout(r, wait));
            if (cancelledRef.current) return;
            onProgress(0, `Reintentando (${attempt}/${MAX_RETRIES})...`);
          }

          if (cancelledRef.current) return;
          const quality = QUALITY_PROFILES[settings.quality];

          // 1. Preprocesado: (opcional) quitar fondo + comprimir/orientar
          let prepared = images;
          if (settings.removeBackground) {
            onProgress(2, 'Eliminando fondo de las imágenes...');
            prepared = await Promise.all(
              images.map(async (img) =>
                img.bgRemoved
                  ? img
                  : { ...img, file: await removeImageBackground(img.file), bgRemoved: true },
              ),
            );
          }

          if (cancelledRef.current) return;
          onProgress(5, 'Optimizando imágenes...');
          const compressed = await Promise.all(
            prepared.map(async (img) => ({
              ...img,
              dataUrl: await compressImageToDataUrl(img.file),
            })),
          );
          if (cancelledRef.current) return;

          // 2. Generación según proveedor
          const proxy = config.proxyUrl?.trim() || undefined;
          const sharedProvider = config.sharedProvider ?? 'replicate';
          const effectiveProvider =
            config.provider === 'shared' ? sharedProvider : config.provider;

          // For single-view providers always use the 'front' angle image (or first if absent)
          const frontImage =
            compressed.find((img) => img.angle === 'front') ?? compressed[0];

          let result: ModelResult;
          if (effectiveProvider === 'meshy') {
            onProgress(8, 'Creando tarea en Meshy AI...');
            const { taskId, endpoint } = await createMeshyTask(
              config.apiKey,
              compressed,
              quality,
              proxy,
            );
            result = await pollMeshyTask(config.apiKey, taskId, endpoint, onProgress, 4000, 600000, proxy);
          } else if (effectiveProvider === 'stability') {
            result = await generateStability3D(
              config.apiKey,
              frontImage,
              quality,
              onProgress,
              proxy,
            );
          } else if (effectiveProvider === 'huggingface') {
            result = await generateWithTripoSR(frontImage, onProgress);
          } else {
            result = await generateHunyuan3D(
              config.apiKey,
              compressed,
              quality,
              onProgress,
              config.replicateModel,
              proxy,
            );
          }

          // 3. Post-proceso: escalar a las medidas reales
          if (settings.scaleToMeasurements && result.glbUrl) {
            try {
              onProgress(96, 'Ajustando modelo a las medidas reales...');
              const scaledBlob = await scaleGlbToMeasurements(result.glbUrl, measurements);
              if (scaledBlob) {
                if (result.isBlob) URL.revokeObjectURL(result.glbUrl);
                result = { ...result, glbUrl: URL.createObjectURL(scaledBlob), isBlob: true, scaled: true };
              }
            } catch (e) {
              console.warn('No se pudo escalar el GLB:', e);
            }
          }

          if (cancelledRef.current) return;
          setState({ status: 'succeeded', progress: 100, message: '¡Modelo 3D generado exitosamente!', result });
          return; // success — exit retry loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (!isRetryable(lastError) || attempt === MAX_RETRIES) break;
          // retryable — loop continues
        }
      }

      setState({
        status: 'failed',
        progress: 0,
        message: 'Error al generar el modelo',
        error: lastError?.message ?? 'Error desconocido',
      });
    },
    [],
  );

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState({ status: 'idle', progress: 0, message: '' });
  }, []);

  return { state, generate, reset, cancel };
}
