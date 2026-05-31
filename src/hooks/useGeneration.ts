import { useState, useCallback } from 'react';
import type {
  ApiConfig,
  UploadedImage,
  Measurements,
  GenerationState,
  ModelResult,
} from '../types';
import { createMeshyTask, pollMeshyTask } from '../api/meshy';
import { generateStabilityFast3D } from '../api/stability';
import { generateHunyuan3D, DEFAULT_REPLICATE_MODEL } from '../api/replicate';
import { compressImageToDataUrl } from '../utils/imageUtils';

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
      measurements?: Measurements,
    ) => {
      setState({ status: 'pending', progress: 0, message: 'Iniciando...' });

      const onProgress = (progress: number, message: string) => {
        setState((prev) => ({ ...prev, status: 'processing', progress, message }));
      };

      try {
        // Compress images to data URLs before sending
        onProgress(2, 'Comprimiendo imágenes...');
        const compressed = await Promise.all(
          images.map(async (img) => ({
            ...img,
            dataUrl: await compressImageToDataUrl(img.file),
          })),
        );

        let result: ModelResult;

        if (config.provider === 'meshy') {
          onProgress(8, 'Creando tarea en Meshy AI...');
          const taskId = await createMeshyTask(config.apiKey, compressed);
          onProgress(12, 'Procesando imágenes...');
          result = await pollMeshyTask(config.apiKey, taskId, onProgress);
        } else if (config.provider === 'stability') {
          result = await generateStabilityFast3D(
            config.apiKey,
            compressed[0],
            onProgress,
          );
        } else {
          const modelVersion =
            config.replicateModel?.trim() || DEFAULT_REPLICATE_MODEL;
          result = await generateHunyuan3D(
            config.apiKey,
            compressed,
            modelVersion,
            onProgress,
          );
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

      // Suppress unused warning — measurements stored for future use
      void measurements;
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, message: '' });
  }, []);

  return { state, generate, reset };
}
