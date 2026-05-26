import { useEffect, useRef, useState } from 'react'
import type { FingerCalibration } from '../lib/calibration'
import { fingerCountToGesture } from '../lib/gestureMap'
import {
  countExtendedFingers,
  getExtendedFingerMask,
  normalizeLandmarks,
} from '../lib/handGeometry'
import type { FingerName } from '../lib/calibration'
import type { Gesture } from '../types/gesture'
import type { NormalizedLandmarkList } from '../types/mediapipe'

export type { Gesture } from '../types/gesture'

export type GesturePhase =
  | 'searching'
  | 'detected'
  | 'holding'
  | 'fired'
  | 'cooldown'

const STABLE_FRAMES = 12
const CONFIRM_MS = 500
const DEBOUNCE_MS = 900

export function useGestures(
  landmarks: NormalizedLandmarkList | null,
  calibration: FingerCalibration,
  enabled: boolean,
) {
  const [fingerCount, setFingerCount] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [extendedMask, setExtendedMask] = useState<Record<FingerName, boolean>>({
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  })
  const [phase, setPhase] = useState<GesturePhase>('searching')
  const [confirmProgress, setConfirmProgress] = useState(0)
  const [pendingGesture, setPendingGesture] = useState<Gesture>(null)
  const [gesture, setGesture] = useState<Gesture>(null)
  const [gestureId, setGestureId] = useState(0)

  const stableCountRef = useRef(0)
  const stableTargetRef = useRef<0 | 1 | 2 | 3 | 4 | 5>(0)
  const confirmStartRef = useRef<number | null>(null)
  const lastFiredRef = useRef(0)
  const lastFiredCountRef = useRef<0 | 1 | 2 | 3 | 4 | 5>(0)
  const canRearmRef = useRef(true)

  useEffect(() => {
    if (!enabled) {
      setPhase('searching')
      setFingerCount(0)
      setConfirmProgress(0)
      setPendingGesture(null)
      stableCountRef.current = 0
      confirmStartRef.current = null
      return
    }

    if (!landmarks || landmarks.length < 21) {
      stableCountRef.current = 0
      confirmStartRef.current = null
      setFingerCount(0)
      setExtendedMask({
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      })
      setPhase('searching')
      setConfirmProgress(0)
      setPendingGesture(null)
      return
    }

    const norm = normalizeLandmarks(landmarks)
    const count = countExtendedFingers(norm, calibration) as
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
    const mask = getExtendedFingerMask(norm, calibration)

    setFingerCount(count)
    setExtendedMask(mask)

    const now = Date.now()

    if (now - lastFiredRef.current < DEBOUNCE_MS) {
      setPhase('cooldown')
      setConfirmProgress(0)
      confirmStartRef.current = null
      return
    }

    if (count === 0) {
      canRearmRef.current = true
      stableCountRef.current = 0
      confirmStartRef.current = null
      setPhase('searching')
      setConfirmProgress(0)
      setPendingGesture(null)
      return
    }

    if (
      !canRearmRef.current &&
      count === lastFiredCountRef.current
    ) {
      setPhase('cooldown')
      setConfirmProgress(0)
      confirmStartRef.current = null
      setPendingGesture(fingerCountToGesture(count))
      return
    }

    if (count !== lastFiredCountRef.current) {
      canRearmRef.current = true
    }

    const mapped = fingerCountToGesture(count)
    setPendingGesture(mapped)

    if (count !== stableTargetRef.current) {
      stableTargetRef.current = count
      stableCountRef.current = 1
      confirmStartRef.current = null
      setPhase('detected')
      setConfirmProgress(0)
      return
    }

    stableCountRef.current += 1

    if (stableCountRef.current < STABLE_FRAMES) {
      setPhase('detected')
      setConfirmProgress(0)
      confirmStartRef.current = null
      return
    }

    setPhase('holding')

    if (confirmStartRef.current === null) {
      confirmStartRef.current = now
    }

    const elapsed = now - confirmStartRef.current
    const progress = Math.min(1, elapsed / CONFIRM_MS)
    setConfirmProgress(progress)

    if (progress < 1 || !mapped) {
      return
    }

    lastFiredRef.current = now
    lastFiredCountRef.current = count
    canRearmRef.current = false
    confirmStartRef.current = null
    stableCountRef.current = 0

    setGesture(mapped)
    setGestureId(now)
    setPhase('fired')
    setConfirmProgress(1)
    console.debug('[Gestura] gesture fired', mapped, 'fingers', count)
  }, [landmarks, calibration, enabled])

  return {
    fingerCount,
    extendedMask,
    phase,
    confirmProgress,
    pendingGesture,
    gesture,
    gestureId,
  }
}
