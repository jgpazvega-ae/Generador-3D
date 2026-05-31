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

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  dataUrl: string;
  angle: ViewAngle;
}

export interface Measurements {
  width: string;
  height: string;
  depth: string;
  unit: MeasurementUnit;
}

export type ApiProvider = 'meshy' | 'stability' | 'replicate';

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  replicateModel?: string;
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
}

export interface GenerationState {
  status: GenerationStatus;
  progress: number;
  message: string;
  result?: ModelResult;
  error?: string;
}
