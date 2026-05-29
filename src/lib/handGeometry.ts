import type { FingerCalibration, FingerName } from './calibration'
import { DEFAULT_CALIBRATION } from './calibration'
import type { NormalizedLandmark, NormalizedLandmarkList } from '../types/mediapipe'

export const LANDMARK = {
  WRIST: 0,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const

const FINGER_DEFS: Record<
  FingerName,
  { tip: number; pip: number; useThumbChain?: boolean }
> = {
  thumb: { tip: LANDMARK.THUMB_TIP, pip: LANDMARK.THUMB_IP, useThumbChain: true },
  index: { tip: LANDMARK.INDEX_TIP, pip: LANDMARK.INDEX_PIP },
  middle: { tip: LANDMARK.MIDDLE_TIP, pip: LANDMARK.MIDDLE_PIP },
  ring: { tip: LANDMARK.RING_TIP, pip: LANDMARK.RING_PIP },
  pinky: { tip: LANDMARK.PINKY_TIP, pip: LANDMARK.PINKY_PIP },
}

const FINGER_ORDER: FingerName[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'pinky',
]

function dist(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** Wrist-centered, scaled by palm width for distance invariance. */
export function normalizeLandmarks(
  landmarks: NormalizedLandmarkList,
): NormalizedLandmarkList {
  const wrist = landmarks[LANDMARK.WRIST]
  const middleMcp = landmarks[LANDMARK.MIDDLE_MCP]
  const scale = Math.max(dist(wrist, middleMcp), 0.05)

  return landmarks.map((p) => ({
    x: (p.x - wrist.x) / scale,
    y: (p.y - wrist.y) / scale,
    z: (p.z - wrist.z) / scale,
    visibility: p.visibility,
  }))
}

/** Extension along the palm→tip axis (tilt-invariant vs raw Y). */
export function fingerExtensionScore(
  landmarks: NormalizedLandmarkList,
  tipIndex: number,
  pipIndex: number,
): number {
  const wrist = landmarks[LANDMARK.WRIST]
  const tip = landmarks[tipIndex]
  const pip = landmarks[pipIndex]

  const tipVec = { x: tip.x - pip.x, y: tip.y - pip.y, z: tip.z - pip.z }
  const palmVec = { x: pip.x - wrist.x, y: pip.y - wrist.y, z: pip.z - wrist.z }
  const palmLen = Math.hypot(palmVec.x, palmVec.y, palmVec.z) || 1e-6

  return (
    (tipVec.x * palmVec.x + tipVec.y * palmVec.y + tipVec.z * palmVec.z) /
    palmLen
  )
}

export function getFingerExtensionScore(
  landmarks: NormalizedLandmarkList,
  finger: FingerName,
): number {
  const def = FINGER_DEFS[finger]
  if (def.useThumbChain) {
    const mcp = landmarks[LANDMARK.THUMB_MCP]
    const tip = landmarks[def.tip]
    const pip = landmarks[def.pip]
    const tipVec = { x: tip.x - pip.x, y: tip.y - pip.y, z: tip.z - pip.z }
    const palmVec = { x: pip.x - mcp.x, y: pip.y - mcp.y, z: pip.z - mcp.z }
    const palmLen = Math.hypot(palmVec.x, palmVec.y, palmVec.z) || 1e-6
    return (
      (tipVec.x * palmVec.x + tipVec.y * palmVec.y + tipVec.z * palmVec.z) /
      palmLen
    )
  }
  return fingerExtensionScore(landmarks, def.tip, def.pip)
}

export function isFingerExtended(
  landmarks: NormalizedLandmarkList,
  finger: FingerName,
  calibration: FingerCalibration = DEFAULT_CALIBRATION,
): boolean {
  const score = getFingerExtensionScore(landmarks, finger)
  if (
    !(score > calibration.noiseFloor && score > calibration.thresholds[finger])
  ) {
    return false
  }

  if (finger !== 'thumb') {
    return true
  }

  const thumbTip = landmarks[LANDMARK.THUMB_TIP]
  const thumbIp = landmarks[LANDMARK.THUMB_IP]
  const indexMcp = landmarks[LANDMARK.INDEX_MCP]
  const middleMcp = landmarks[LANDMARK.MIDDLE_MCP]
  const ringPip = landmarks[LANDMARK.RING_PIP]
  const pinkyPip = landmarks[LANDMARK.PINKY_PIP]

  // Thumb needs to be away from the palm core; folded thumbs often
  // still score as "extended" on chain angle alone.
  const palmCenter = {
    x: (indexMcp.x + middleMcp.x + ringPip.x + pinkyPip.x) / 4,
    y: (indexMcp.y + middleMcp.y + ringPip.y + pinkyPip.y) / 4,
    z: (indexMcp.z + middleMcp.z + ringPip.z + pinkyPip.z) / 4,
  }
  const tipToPalm = dist(thumbTip, palmCenter)
  const ipToPalm = dist(thumbIp, palmCenter)
  const thumbOpenBySpread = tipToPalm > ipToPalm + 0.12

  // Secondary guard: open thumb should sit farther from index base
  // than the thumb IP does.
  const tipToIndexBase = dist(thumbTip, indexMcp)
  const ipToIndexBase = dist(thumbIp, indexMcp)
  const thumbOpenByIndexGap = tipToIndexBase > ipToIndexBase + 0.08

  return thumbOpenBySpread && thumbOpenByIndexGap
}

export function getExtendedFingerMask(
  landmarks: NormalizedLandmarkList,
  calibration: FingerCalibration = DEFAULT_CALIBRATION,
): Record<FingerName, boolean> {
  return {
    thumb: isFingerExtended(landmarks, 'thumb', calibration),
    index: isFingerExtended(landmarks, 'index', calibration),
    middle: isFingerExtended(landmarks, 'middle', calibration),
    ring: isFingerExtended(landmarks, 'ring', calibration),
    pinky: isFingerExtended(landmarks, 'pinky', calibration),
  }
}

export function countExtendedFingers(
  landmarks: NormalizedLandmarkList,
  calibration: FingerCalibration = DEFAULT_CALIBRATION,
): number {
  const norm = normalizeLandmarks(landmarks)
  const mask = getExtendedFingerMask(norm, calibration)
  return FINGER_ORDER.filter((f) => mask[f]).length
}

export function fingerScores(
  landmarks: NormalizedLandmarkList,
): Record<FingerName, number> {
  const norm = normalizeLandmarks(landmarks)
  return {
    thumb: getFingerExtensionScore(norm, 'thumb'),
    index: getFingerExtensionScore(norm, 'index'),
    middle: getFingerExtensionScore(norm, 'middle'),
    ring: getFingerExtensionScore(norm, 'ring'),
    pinky: getFingerExtensionScore(norm, 'pinky'),
  }
}

export { FINGER_ORDER }
