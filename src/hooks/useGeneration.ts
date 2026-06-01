import { useState, useCallback } from 'react';
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

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const generate = useCallback(
    async (
      config: ApiConfig,
      images: UploadedImage[],
      settings: GenerationSettings,
      measurements: Measurements,
    ) => {
      setState({ status: 'pending', progress: 0, message: 'Iniciando...' });

      const onProgress = (progress: number, message: string) => {
        setState((prev) => ({ ...prev, status: 'processing', progress, message }));
      };

      try {
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

        onProgress(5, 'Optimizando imágenes...');
        const compressed = await Promise.all(
          prepared.map(async (img) => ({
            ...img,
            dataUrl: await compressImageToDataUrl(img.file),
          })),
        );

        // 2. Generación según proveedor
        let result: ModelResult;
        if (config.provider === 'meshy') {
          onProgress(8, 'Creando tarea en Meshy AI...');
          const { taskId, endpoint } = await createMeshyTask(
            config.apiKey,
            compressed,
            quality,
          );
          result = await pollMeshyTask(config.apiKey, taskId, endpoint, onProgress);
        } else if (config.provider === 'stability') {
          result = await generateStability3D(
            config.apiKey,
            compressed[0],
            quality,
            onProgress,
          );
        } else if (config.provider === 'huggingface') {
          result = await generateWithTripoSR(compressed[0], onProgress);
        } else {
          result = await generateHunyuan3D(
            config.apiKey,
            compressed,
            quality,
            onProgress,
            config.replicateModel,
          );
        }

        // 3. Post-proceso: escalar a las medidas reales
        if (settings.scaleToMeasurements && result.glbUrl) {
          try {
            onProgress(96, 'Ajustando modelo a las medidas reales...');
            const scaledBlob = await scaleGlbToMeasurements(
              result.glbUrl,
              measurements,
            );
            if (scaledBlob) {
              if (result.isBlob) URL.revokeObjectURL(result.glbUrl);
              result = {
                ...result,
                glbUrl: URL.createObjectURL(scaledBlob),
                isBlob: true,
                scaled: true,
              };
            }
          } catch (e) {
            console.warn('No se pudo escalar el GLB:', e);
          }
        }

        setState({
          status: 'succeeded',
          progress: 100,
          message: '¡Modelo 3D generado exitosamente!',
          result,
        });
      } catch (err) {
        setState({
          status: 'failed',
          progress: 0,
          message: 'Error al generar el modelo',
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, message: '' });
  }, []);

  return { state, generate, reset };
}
