import { useEffect, useRef, useState } from 'react'
import type { NormalizedLandmarkList } from '../types/mediapipe'

export type Gesture =
  | 'PLAY_PAUSE'
  | 'NEXT'
  | 'PREV'
  | 'VOL_UP'
  | 'VOL_DOWN'
  | null

const DEBOUNCE_MS = 900
const STABLE_FRAMES = 5
const POINT_THRESHOLD = 0.045
const THUMB_THRESHOLD = 0.1

const LANDMARK = {
  WRIST: 0,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const

function fingerExtension(
  landmarks: NormalizedLandmarkList,
  tipIndex: number,
  pipIndex: number,
): number {
  const tip = landmarks[tipIndex]
  const pip = landmarks[pipIndex]
  return pip.y - tip.y
}

function isFingerExtended(
  landmarks: NormalizedLandmarkList,
  tipIndex: number,
  pipIndex: number,
  minExtension = 0.02,
): boolean {
  return fingerExtension(landmarks, tipIndex, pipIndex) > minExtension
}

/** Index out, other fingers mostly folded — thumb ignored (unreliable vs wrist). */
function isIndexPointPose(landmarks: NormalizedLandmarkList): boolean {
  const indexExt = fingerExtension(
    landmarks,
    LANDMARK.INDEX_TIP,
    LANDMARK.INDEX_PIP,
  )
  if (indexExt < 0.025) return false

  const middleExt = fingerExtension(
    landmarks,
    LANDMARK.MIDDLE_TIP,
    LANDMARK.MIDDLE_PIP,
  )
  const ringExt = fingerExtension(
    landmarks,
    LANDMARK.RING_TIP,
    LANDMARK.RING_PIP,
  )
  const pinkyExt = fingerExtension(
    landmarks,
    LANDMARK.PINKY_TIP,
    LANDMARK.PINKY_PIP,
  )

  const maxOther = Math.max(middleExt, ringExt, pinkyExt)
  return indexExt > maxOther + 0.015
}

/**
 * Horizontal point direction. Uses mirrored X so "point right" on the
 * selfie preview matches NEXT (same side you see on screen).
 */
function detectPointDirection(
  landmarks: NormalizedLandmarkList,
): 'NEXT' | 'PREV' | null {
  if (!isIndexPointPose(landmarks)) return null

  const wrist = landmarks[LANDMARK.WRIST]
  const indexTip = landmarks[LANDMARK.INDEX_TIP]
  const indexPip = landmarks[LANDMARK.INDEX_PIP]

  const segmentDx = indexTip.x - indexPip.x
  const segmentDy = indexTip.y - indexPip.y
  const segmentLen = Math.hypot(segmentDx, segmentDy)
  if (segmentLen < 0.03) return null

  const horizontalEnough = Math.abs(segmentDx) > Math.abs(segmentDy) * 0.65
  if (!horizontalEnough) return null

  // Mirrored X: matches what the user sees in the flipped webcam HUD
  const screenDeltaX = (1 - indexTip.x) - (1 - wrist.x)

  if (screenDeltaX > POINT_THRESHOLD) return 'NEXT'
  if (screenDeltaX < -POINT_THRESHOLD) return 'PREV'

  return null
}

function isOpenPalm(landmarks: NormalizedLandmarkList): boolean {
  const fingers = [
    [LANDMARK.INDEX_TIP, LANDMARK.INDEX_PIP],
    [LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_PIP],
    [LANDMARK.RING_TIP, LANDMARK.RING_PIP],
    [LANDMARK.PINKY_TIP, LANDMARK.PINKY_PIP],
  ] as const

  const extendedCount = fingers.filter(([tip, pip]) =>
    isFingerExtended(landmarks, tip, pip, 0.015),
  ).length

  return extendedCount >= 4
}

function detectThumbVolume(
  landmarks: NormalizedLandmarkList,
): 'VOL_UP' | 'VOL_DOWN' | null {
  const wrist = landmarks[LANDMARK.WRIST]
  const thumbTip = landmarks[LANDMARK.THUMB_TIP]

  const indexExt = isFingerExtended(
    landmarks,
    LANDMARK.INDEX_TIP,
    LANDMARK.INDEX_PIP,
  )
  const middleExt = isFingerExtended(
    landmarks,
    LANDMARK.MIDDLE_TIP,
    LANDMARK.MIDDLE_PIP,
  )
  const ringExt = isFingerExtended(
    landmarks,
    LANDMARK.RING_TIP,
    LANDMARK.RING_PIP,
  )
  const pinkyExt = isFingerExtended(
    landmarks,
    LANDMARK.PINKY_TIP,
    LANDMARK.PINKY_PIP,
  )

  if (indexExt || middleExt || ringExt || pinkyExt) return null

  const thumbUp = isFingerExtended(
    landmarks,
    LANDMARK.THUMB_TIP,
    LANDMARK.THUMB_IP,
    0.015,
  )
  const thumbDown =
    fingerExtension(landmarks, LANDMARK.THUMB_TIP, LANDMARK.THUMB_IP) <
    -0.02

  if (thumbUp && thumbTip.y < wrist.y - THUMB_THRESHOLD) return 'VOL_UP'
  if (thumbDown && thumbTip.y > wrist.y + THUMB_THRESHOLD) return 'VOL_DOWN'

  return null
}

function classifyGesture(landmarks: NormalizedLandmarkList): Gesture {
  const point = detectPointDirection(landmarks)
  if (point) return point

  const volume = detectThumbVolume(landmarks)
  if (volume) return volume

  if (isOpenPalm(landmarks)) return 'PLAY_PAUSE'

  return null
}

export function useGestures(landmarks: NormalizedLandmarkList | null) {
  const [gesture, setGesture] = useState<Gesture>(null)
  const [gestureId, setGestureId] = useState(0)
  const lastFiredRef = useRef(0)
  const stableGestureRef = useRef<Gesture>(null)
  const stableCountRef = useRef(0)

  useEffect(() => {
    if (!landmarks || landmarks.length < 21) {
      stableGestureRef.current = null
      stableCountRef.current = 0
      return
    }

    const detected = classifyGesture(landmarks)

    if (detected !== stableGestureRef.current) {
      stableGestureRef.current = detected
      stableCountRef.current = 1
      return
    }

    stableCountRef.current += 1
    if (!detected || stableCountRef.current < STABLE_FRAMES) {
      return
    }

    const now = Date.now()
    if (now - lastFiredRef.current < DEBOUNCE_MS) {
      return
    }

    lastFiredRef.current = now
    setGesture(detected)
    setGestureId(now)
    console.debug('[Gestura] gesture', detected)
  }, [landmarks])

  return { gesture, gestureId }
}
