export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'

export interface FingerCalibration {
  noiseFloor: number
  thresholds: Record<FingerName, number>
}

export const CALIBRATION_STORAGE_KEY = 'gestura-calibration-v1'

export const DEFAULT_CALIBRATION: FingerCalibration = {
  noiseFloor: 0.02,
  thresholds: {
    thumb: 0.09,
    index: 0.07,
    middle: 0.07,
    ring: 0.065,
    pinky: 0.06,
  },
}

const FINGER_NAMES: FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
]

/** Looser thresholds for pose gating before personal calibration exists. */
export function relaxedCalibration(
  cal: FingerCalibration,
  factor = 0.85,
): FingerCalibration {
  return {
    noiseFloor: cal.noiseFloor * factor,
    thresholds: {
      thumb: cal.thresholds.thumb * factor,
      index: cal.thresholds.index * factor,
      middle: cal.thresholds.middle * factor,
      ring: cal.thresholds.ring * factor,
      pinky: cal.thresholds.pinky * factor,
    },
  }
}

/** Which fingers must be extended for each target count (1–5). */
export const COUNT_FINGER_MASK: Record<1 | 2 | 3 | 4 | 5, FingerName[]> = {
  1: ['index'],
  2: ['index', 'middle'],
  3: ['index', 'middle', 'ring'],
  4: ['index', 'middle', 'ring', 'pinky'],
  5: ['thumb', 'index', 'middle', 'ring', 'pinky'],
}

export function loadCalibration(): FingerCalibration | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FingerCalibration
    if (
      typeof parsed.noiseFloor === 'number' &&
      parsed.thresholds &&
      typeof parsed.thresholds.index === 'number'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveCalibration(calibration: FingerCalibration): void {
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(calibration))
}

export function clearCalibration(): void {
  localStorage.removeItem(CALIBRATION_STORAGE_KEY)
}

export { FINGER_NAMES }
