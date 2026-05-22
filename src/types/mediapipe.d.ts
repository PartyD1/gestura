export interface NormalizedLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export type NormalizedLandmarkList = NormalizedLandmark[]

export interface HandsResults {
  multiHandLandmarks?: NormalizedLandmarkList[]
  multiHandedness?: { label: string; score: number }[]
}

export interface HandsOptions {
  maxNumHands?: number
  modelComplexity?: 0 | 1
  minDetectionConfidence?: number
  minTrackingConfidence?: number
}

export interface HandsConfig {
  locateFile?: (file: string) => string
}

export declare class Hands {
  constructor(config?: HandsConfig)
  setOptions(options: HandsOptions): void
  onResults(callback: (results: HandsResults) => void): void
  send(inputs: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>
  close(): void
}

export interface CameraOptions {
  onFrame: () => void | Promise<void>
  width?: number
  height?: number
}

export declare class Camera {
  constructor(video: HTMLVideoElement, options: CameraOptions)
  start(): Promise<void>
  stop(): void
}

declare global {
  interface Window {
    Hands: typeof Hands
    Camera: typeof Camera
  }
}

export {}
