import { useEffect, useRef, useState } from 'react'
import type { FingerCalibration } from '../lib/calibration'
import { fingerCountToGesture } from '../lib/gestureMap'
import {
  getExtendedFingerMask,
  getExtendedFingerMaskHysteresis,
  normalizeLandmarks,
  palmFacingScore,
  rawPalmWidth,
  recognizePoseCount,
} from '../lib/handGeometry'
import type { FingerName } from '../lib/calibration'
import type { Handedness } from './useMediaPipe'
import type { Gesture } from '../types/gesture'
import type { NormalizedLandmarkList } from '../types/mediapipe'

export type { Gesture } from '../types/gesture'

export type GesturePhase =
  | 'searching'
  | 'detected'
  | 'holding'
  | 'fired'
  | 'cooldown'

export type RejectReason =
  | 'pose'      // fingers up but not a canonical 1-5 pose
  | 'distance'  // hand too far away / too small in frame
  | 'facing'    // back of hand or side toward camera
  | null

// ─── Tuning knobs ────────────────────────────────────────────────────────────
const TUNING = {
  // How many consecutive frames the recognized pose must stay identical
  // before the hold-to-confirm timer starts.
  STABLE_FRAMES: 16,

  // How long (ms) the stable pose must be held before firing.
  CONFIRM_MS: 750,

  // Global cooldown (ms) after any gesture fires. Nothing can fire during this.
  DEBOUNCE_MS: 1100,

  // Fraction of the extension threshold used as the lower "turn off" boundary.
  // A finger already "up" stays up until score drops below threshold*(1-HYSTERESIS).
  HYSTERESIS: 0.2,

  // Minimum raw palm width (wrist-to-middle-MCP distance in image space [0-1]).
  // Rejects hands that are too far away or partially out of frame.
  // Typical range when hand is comfortably presented: 0.06-0.15.
  MIN_PALM_WIDTH: 0.055,

  // Whether to reject poses whose palm is clearly turned away from the camera
  // (e.g. back-of-hand resting on the face). The gate is skipped whenever
  // handedness is unknown, so it can never silently block all input.
  PALM_FACING_GATE: true,

  // Global sign for palmFacingScore. palmFacingScore() already folds in
  // handedness so both hands agree; this is the ONE remaining convention bit
  // (camera/mirror + MediaPipe z axis). If, with ?debug=1, an obviously
  // palm-facing hand logs a NEGATIVE facing score, flip this to -1.
  PALM_FACING_SIGN: 1 as 1 | -1,

  // Minimum palm-facing cosine in [-1, 1] after the sign is applied.
  // +1 = palm squared to camera, 0 = edge-on, -1 = back of hand to camera.
  // Lenient by design: only rejects hands clearly turned away.
  MIN_PALM_FACING: -0.35,
} as const
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_MASK: Record<FingerName, boolean> = {
  thumb: false,
  index: false,
  middle: false,
  ring: false,
  pinky: false,
}

export function useGestures(
  landmarks: NormalizedLandmarkList | null,
  handedness: Handedness,
  calibration: FingerCalibration,
  enabled: boolean,
) {
  // Raw finger count (any extended fingers, for display only)
  const [fingerCount, setFingerCount] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [extendedMask, setExtendedMask] = useState<Record<FingerName, boolean>>(EMPTY_MASK)
  const [phase, setPhase] = useState<GesturePhase>('searching')
  const [confirmProgress, setConfirmProgress] = useState(0)
  const [pendingGesture, setPendingGesture] = useState<Gesture>(null)
  const [gesture, setGesture] = useState<Gesture>(null)
  const [gestureId, setGestureId] = useState(0)
  const [rejectReason, setRejectReason] = useState<RejectReason>(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const stableCountRef = useRef(0)
  const stableTargetRef = useRef<0 | 1 | 2 | 3 | 4 | 5>(0)
  const confirmStartRef = useRef<number | null>(null)
  const lastFiredRef = useRef(0)
  const lastFiredCountRef = useRef<0 | 1 | 2 | 3 | 4 | 5>(0)
  // Full-release rearm: only true after recognized pose returns to 0 (hand down).
  const canRearmRef = useRef(true)
  // Hysteresis: carry the previous per-frame mask forward.
  const prevMaskRef = useRef<Record<FingerName, boolean>>(EMPTY_MASK)

  useEffect(() => {
    if (!enabled) {
      setPhase('searching')
      setFingerCount(0)
      setExtendedMask(EMPTY_MASK)
      setConfirmProgress(0)
      setPendingGesture(null)
      setRejectReason(null)
      stableCountRef.current = 0
      confirmStartRef.current = null
      prevMaskRef.current = EMPTY_MASK
      return
    }

    if (!landmarks || landmarks.length < 21) {
      stableCountRef.current = 0
      confirmStartRef.current = null
      prevMaskRef.current = EMPTY_MASK
      setFingerCount(0)
      setExtendedMask(EMPTY_MASK)
      setPhase('searching')
      setConfirmProgress(0)
      setPendingGesture(null)
      setRejectReason(null)
      return
    }

    const norm = normalizeLandmarks(landmarks)

    // ── Presentation gates (B) ─────────────────────────────────────────────
    const palmW = rawPalmWidth(landmarks)

    if (palmW < TUNING.MIN_PALM_WIDTH) {
      // Hand too far or too small — ignore entirely so it doesn't even count frames.
      stableCountRef.current = 0
      confirmStartRef.current = null
      prevMaskRef.current = EMPTY_MASK
      setFingerCount(0)
      setExtendedMask(EMPTY_MASK)
      setPhase('searching')
      setConfirmProgress(0)
      setPendingGesture(null)
      setRejectReason('distance')
      return
    }

    // Palm-facing gate. Skipped entirely when handedness is unknown so it can
    // never silently block all input.
    if (TUNING.PALM_FACING_GATE && handedness !== null) {
      const facing = palmFacingScore(norm, handedness) * TUNING.PALM_FACING_SIGN
      if (facing < TUNING.MIN_PALM_FACING) {
        stableCountRef.current = 0
        confirmStartRef.current = null
        prevMaskRef.current = EMPTY_MASK
        setFingerCount(0)
        setExtendedMask(EMPTY_MASK)
        setPhase('searching')
        setConfirmProgress(0)
        setPendingGesture(null)
        setRejectReason('facing')
        return
      }
    }

    // ── Hysteresis-aware mask (B) ──────────────────────────────────────────
    const hystMask = getExtendedFingerMaskHysteresis(
      norm,
      calibration,
      prevMaskRef.current,
      TUNING.HYSTERESIS,
    )
    prevMaskRef.current = hystMask

    // Recognized pose count (1-5 only if exact canonical pose, else 0)
    const recognizedCount = recognizePoseCount(hystMask) as 0 | 1 | 2 | 3 | 4 | 5

    // Raw count for HUD display (still using non-hysteresis mask so feedback is responsive)
    const rawMask = getExtendedFingerMask(norm, calibration)
    const rawCount = (
      Object.values(rawMask).filter(Boolean).length
    ) as 0 | 1 | 2 | 3 | 4 | 5
    setFingerCount(rawCount)
    setExtendedMask(hystMask)

    // Surface a rejection reason when fingers are up but pose doesn't match
    if (rawCount > 0 && recognizedCount === 0) {
      setRejectReason('pose')
    } else {
      setRejectReason(null)
    }

    const now = Date.now()

    // ── Global debounce ────────────────────────────────────────────────────
    if (now - lastFiredRef.current < TUNING.DEBOUNCE_MS) {
      setPhase('cooldown')
      setConfirmProgress(0)
      confirmStartRef.current = null
      return
    }

    // ── No valid pose → reset (treat as count 0) ───────────────────────────
    if (recognizedCount === 0) {
      // Full-release rearm: only rearm when the hand is actually down/unrecognized.
      canRearmRef.current = true
      stableCountRef.current = 0
      confirmStartRef.current = null
      setPhase('searching')
      setConfirmProgress(0)
      setPendingGesture(null)
      return
    }

    // ── Post-fire hold: same count as last fired, not yet rearmed ──────────
    if (!canRearmRef.current && recognizedCount === lastFiredCountRef.current) {
      setPhase('cooldown')
      setConfirmProgress(0)
      confirmStartRef.current = null
      setPendingGesture(fingerCountToGesture(recognizedCount))
      return
    }

    // Full-release rearm only (C): count changes are NOT enough to rearm.
    // canRearmRef is reset to true only when recognizedCount === 0 (above).

    const mapped = fingerCountToGesture(recognizedCount)
    setPendingGesture(mapped)

    // ── Stability check (C) ────────────────────────────────────────────────
    if (recognizedCount !== stableTargetRef.current) {
      stableTargetRef.current = recognizedCount
      stableCountRef.current = 1
      confirmStartRef.current = null
      setPhase('detected')
      setConfirmProgress(0)
      return
    }

    stableCountRef.current += 1

    if (stableCountRef.current < TUNING.STABLE_FRAMES) {
      setPhase('detected')
      setConfirmProgress(0)
      confirmStartRef.current = null
      return
    }

    // ── Hold-to-confirm ────────────────────────────────────────────────────
    setPhase('holding')

    if (confirmStartRef.current === null) {
      confirmStartRef.current = now
    }

    const elapsed = now - confirmStartRef.current
    const progress = Math.min(1, elapsed / TUNING.CONFIRM_MS)
    setConfirmProgress(progress)

    if (progress < 1 || !mapped) {
      return
    }

    // ── Fire ───────────────────────────────────────────────────────────────
    lastFiredRef.current = now
    lastFiredCountRef.current = recognizedCount
    canRearmRef.current = false
    confirmStartRef.current = null
    stableCountRef.current = 0

    setGesture(mapped)
    setGestureId(now)
    setPhase('fired')
    setConfirmProgress(1)
    console.debug('[Gestura] gesture fired', mapped, 'fingers', recognizedCount)
  }, [landmarks, handedness, calibration, enabled])

  return {
    fingerCount,
    extendedMask,
    phase,
    confirmProgress,
    pendingGesture,
    gesture,
    gestureId,
    rejectReason,
  }
}
