export type ViewAngle =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'diagonal'
  | 'custom';

export const ANGLE_LABELS: Record<ViewAngle, string> = {
  front: 'Frente',
  back: 'Atrás',
  left: 'Izquierda',
  right: 'Derecha',
  top: 'Superior',
  bottom: 'Inferior',
  diagonal: 'Diagonal',
  custom: 'Personalizado',
};

export const ANGLE_ICONS: Record<ViewAngle, string> = {
  front: '⬆',
  back: '⬇',
  left: '◀',
  right: '▶',
  top: '🔼',
  bottom: '🔽',
  diagonal: '↗',
  custom: '✦',
};

export type MeasurementUnit = 'mm' | 'cm' | 'm' | 'in';

export const UNIT_LABELS: Record<MeasurementUnit, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  in: 'in',
};

// Factor para convertir cada unidad a metros (unidad estándar de glTF)
export const UNIT_TO_METERS: Record<MeasurementUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
};

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  dataUrl: string;
  angle: ViewAngle;
  /** true si el fondo ya fue eliminado */
  bgRemoved?: boolean;
}

export interface Measurements {
  width: string;
  height: string;
  depth: string;
  unit: MeasurementUnit;
}

export type ApiProvider = 'meshy' | 'stability' | 'replicate' | 'huggingface' | 'shared';

/** Preset de calidad que controla polígonos, pasos de inferencia y resolución de textura */
export type QualityPreset = 'draft' | 'standard' | 'max';

export interface QualityProfile {
  label: string;
  description: string;
  // Meshy
  meshyPolycount: number;
  meshyModel: 'meshy-4' | 'meshy-5' | 'meshy-6';
  enablePbr: boolean;
  // Stability
  stabilityTextureResolution: 512 | 1024 | 2048;
  // Replicate / Hunyuan
  hunyuanSteps: number;
  hunyuanOctree: 256 | 384 | 512;
  hunyuanFaces: number;
}

export const QUALITY_PROFILES: Record<QualityPreset, QualityProfile> = {
  draft: {
    label: 'Borrador',
    description: 'Rápido y económico. Ideal para previsualizar.',
    meshyPolycount: 30000,
    meshyModel: 'meshy-5',
    enablePbr: false,
    stabilityTextureResolution: 1024,
    hunyuanSteps: 30,
    hunyuanOctree: 256,
    hunyuanFaces: 30000,
  },
  standard: {
    label: 'Estándar',
    description: 'Buen equilibrio entre calidad y velocidad.',
    meshyPolycount: 100000,
    meshyModel: 'meshy-5',
    enablePbr: true,
    stabilityTextureResolution: 2048,
    hunyuanSteps: 40,
    hunyuanOctree: 384,
    hunyuanFaces: 100000,
  },
  max: {
    label: 'Máxima',
    description: 'Máxima similitud: más polígonos, texturas 4K PBR. Más lento.',
    meshyPolycount: 300000,
    meshyModel: 'meshy-6',
    enablePbr: true,
    stabilityTextureResolution: 2048,
    hunyuanSteps: 50,
    hunyuanOctree: 512,
    hunyuanFaces: 300000,
  },
};

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  replicateModel?: string;
  /** URL del servidor proxy propio (para provider 'shared') */
  proxyUrl?: string;
  /** Qué proveedor usa el proxy (replicate | meshy | stability) */
  sharedProvider?: 'replicate' | 'meshy' | 'stability';
}

export interface GenerationSettings {
  quality: QualityPreset;
  removeBackground: boolean;
  scaleToMeasurements: boolean;
}

export type GenerationStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed';

export interface ModelResult {
  glbUrl: string;
  fbxUrl?: string;
  objUrl?: string;
  taskId?: string;
  thumbnailUrl?: string;
  isBlob?: boolean;
  /** true si el GLB fue reescalado a las medidas reales */
  scaled?: boolean;
}

export interface GenerationState {
  status: GenerationStatus;
  progress: number;
  message: string;
  result?: ModelResult;
  error?: string;
}
