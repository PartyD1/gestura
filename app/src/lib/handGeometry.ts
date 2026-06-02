import type { FingerCalibration, FingerName } from './calibration'
import { COUNT_FINGER_MASK, DEFAULT_CALIBRATION } from './calibration'
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
  RING_MCP: 13,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
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
    return thumbSpreadScore(landmarks)
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

  return thumbGeometryExtended(landmarks)
}

/**
 * Thumb geometry guard isolated so hysteresis can apply a loosened version.
 * looseFactor: 1.0 = strict (use for turning ON), < 1.0 = looser (use for staying UP).
 * Lower offsets mean the thumb needs less clearance from the palm to stay "open."
 */
function palmCenter(landmarks: NormalizedLandmarkList): NormalizedLandmark {
  const indexMcp = landmarks[LANDMARK.INDEX_MCP]
  const middleMcp = landmarks[LANDMARK.MIDDLE_MCP]
  const ringMcp = landmarks[LANDMARK.RING_MCP]
  const pinkyMcp = landmarks[LANDMARK.PINKY_MCP]

  return {
    x: (indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 4,
    y: (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4,
    z: (indexMcp.z + middleMcp.z + ringMcp.z + pinkyMcp.z) / 4,
  }
}

/**
 * Thumb extension is mostly lateral spread, not distal-joint straightness.
 * Positive values mean the tip has moved farther from both the palm core and
 * index base than the thumb IP joint has; folded thumbs tend to collapse one
 * of these distances even when the thumb joints themselves look straight.
 */
function thumbSpreadScore(landmarks: NormalizedLandmarkList): number {
  const thumbTip = landmarks[LANDMARK.THUMB_TIP]
  const thumbIp = landmarks[LANDMARK.THUMB_IP]
  const indexMcp = landmarks[LANDMARK.INDEX_MCP]
  const center = palmCenter(landmarks)

  const palmSpread = dist(thumbTip, center) - dist(thumbIp, center)
  const indexSpread = dist(thumbTip, indexMcp) - dist(thumbIp, indexMcp)

  return Math.min(palmSpread, indexSpread)
}

function thumbGeometryExtended(
  landmarks: NormalizedLandmarkList,
  looseFactor = 1,
): boolean {
  const thumbTip = landmarks[LANDMARK.THUMB_TIP]
  const thumbIp = landmarks[LANDMARK.THUMB_IP]
  const thumbMcp = landmarks[LANDMARK.THUMB_MCP]
  const indexMcp = landmarks[LANDMARK.INDEX_MCP]

  // Thumb needs to be away from the palm core; folded thumbs often
  // still score as "extended" if we only look at one distance.
  const center = palmCenter(landmarks)
  const tipToPalm = dist(thumbTip, center)
  const ipToPalm = dist(thumbIp, center)
  const mcpToPalm = dist(thumbMcp, center)
  const thumbOpenByPalmSpread = tipToPalm > ipToPalm + 0.04 * looseFactor
  const thumbTipClearsPalm = tipToPalm > mcpToPalm + 0.02 * looseFactor

  // Open thumbs should also move away from the index base, not tuck across it.
  const tipToIndexBase = dist(thumbTip, indexMcp)
  const ipToIndexBase = dist(thumbIp, indexMcp)
  const mcpToIndexBase = dist(thumbMcp, indexMcp)
  const thumbOpenByIndexSpread = tipToIndexBase > ipToIndexBase + 0.03 * looseFactor
  const thumbTipClearsIndex = tipToIndexBase > mcpToIndexBase + 0.02 * looseFactor

  return (
    thumbOpenByPalmSpread &&
    thumbTipClearsPalm &&
    thumbOpenByIndexSpread &&
    thumbTipClearsIndex
  )
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

/**
 * Hysteresis-aware extended finger mask.
 * A finger already "up" stays up until its score drops below threshold*(1-hysteresis).
 * A finger "down" requires score to exceed the normal threshold before turning on.
 * This eliminates boundary flicker without increasing the onset threshold.
 */
export function getExtendedFingerMaskHysteresis(
  norm: NormalizedLandmarkList,
  calibration: FingerCalibration,
  prevMask: Record<FingerName, boolean>,
  hysteresis = 0.2,
): Record<FingerName, boolean> {
  const result: Record<FingerName, boolean> = {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  }
  for (const finger of FINGER_ORDER) {
    const score = getFingerExtensionScore(norm, finger)
    const onThreshold = Math.max(calibration.noiseFloor, calibration.thresholds[finger])
    const offThreshold = onThreshold * (1 - hysteresis)

    if (prevMask[finger]) {
      // Already up: stay up as long as score stays above the lower off-threshold.
      // Thumb also needs geometry clearance, but with loosened offsets so a
      // single borderline frame doesn't instantly drop it.
      const staysUp = score > offThreshold
      if (!staysUp) {
        result[finger] = false
      } else if (finger === 'thumb') {
        // Use loosened geometry (offsets scaled by 1-hysteresis) to avoid
        // the thumb flickering off every time it drifts slightly toward the palm.
        result[finger] = thumbGeometryExtended(norm, 1 - hysteresis)
      } else {
        result[finger] = true
      }
    } else {
      // Currently down: must pass the full strict check (score + tight geometry) to turn on.
      result[finger] = isFingerExtended(norm, finger, calibration)
    }
  }
  return result
}

/**
 * Recognizes a canonical 1-5 finger pose by matching the extended mask
 * exactly against COUNT_FINGER_MASK.
 * Returns 1-5 if the mask matches exactly one canonical pose, else 0.
 * For counts 1-4 the thumb is allowed to be up without voiding the match
 * when allowThumbForCounts is true (default false — strict).
 */
export function recognizePoseCount(
  mask: Record<FingerName, boolean>,
  allowThumbForCounts = false,
): 0 | 1 | 2 | 3 | 4 | 5 {
  const counts = [1, 2, 3, 4, 5] as const
  for (const count of counts) {
    const required = COUNT_FINGER_MASK[count]
    const requiredSet = new Set(required)

    let matches = true
    for (const finger of FINGER_ORDER) {
      const shouldBeUp = requiredSet.has(finger)
      const isUp = mask[finger]

      if (shouldBeUp && !isUp) {
        // A required finger is down — no match.
        matches = false
        break
      }
      if (!shouldBeUp && isUp) {
        // An unexpected finger is up.
        if (finger === 'thumb' && count !== 5 && allowThumbForCounts) {
          // Tolerate thumb for 1-4 when flag is set.
          continue
        }
        matches = false
        break
      }
    }

    if (matches) return count
  }
  return 0
}

/**
 * Raw (pre-normalization) palm width in image-space [0-1].
 * Used to reject hands that are too far away or partially out of frame.
 * Larger value = hand is closer to the camera.
 */
export function rawPalmWidth(landmarks: NormalizedLandmarkList): number {
  const wrist = landmarks[LANDMARK.WRIST]
  const middleMcp = landmarks[LANDMARK.MIDDLE_MCP]
  return dist(wrist, middleMcp)
}

/**
 * Palm-facing score in [-1, 1]: the cosine of the angle between the palm's
 * surface normal and the camera axis (MediaPipe z).
 *
 * The normal is the full 3D cross product of two palm-plane vectors
 * (indexMCP - wrist) × (pinkyMCP - wrist). Its raw direction flips with hand
 * chirality (left vs right), so we fold in the MediaPipe handedness label to
 * give a consistent sign for both hands. With the convention here, a palm
 * presented squarely to the camera approaches one extreme and the back of the
 * hand approaches the other.
 *
 * Note: which extreme is "+1" depends on the camera/mirror + MediaPipe z
 * convention. This is a single global sign (the same for every user with this
 * pipeline), exposed as PALM_FACING_SIGN in useGestures and verifiable via
 * ?debug=1. Returns 0 when handedness is unknown (caller should skip gating).
 */
export function palmFacingScore(
  norm: NormalizedLandmarkList,
  handedness: 'Left' | 'Right' | null,
): number {
  if (!handedness) return 0

  const wrist = norm[LANDMARK.WRIST]
  const indexMcp = norm[LANDMARK.INDEX_MCP]
  const pinkyMcp = norm[LANDMARK.PINKY_MCP]

  const v1 = {
    x: indexMcp.x - wrist.x,
    y: indexMcp.y - wrist.y,
    z: indexMcp.z - wrist.z,
  }
  const v2 = {
    x: pinkyMcp.x - wrist.x,
    y: pinkyMcp.y - wrist.y,
    z: pinkyMcp.z - wrist.z,
  }

  // Full 3D cross product → palm surface normal.
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  }
  const len = Math.hypot(normal.x, normal.y, normal.z) || 1e-6

  // Cosine vs the camera (z) axis, then fold handedness so both hands agree.
  const cos = normal.z / len
  const handSign = handedness === 'Left' ? -1 : 1
  return cos * handSign
}

export { FINGER_ORDER }
