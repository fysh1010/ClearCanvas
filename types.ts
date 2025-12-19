export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type ProcessMode = 'auto' | 'manual' | 'tiled';

export interface ProcessingResult {
  originalImage: string; // Base64
  processedImage: string | null; // Base64
  maskImage?: string | null; // Base64 used for processing
}