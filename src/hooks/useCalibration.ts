import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CALIBRATION_STORAGE_KEY,
  COUNT_FINGER_MASK,
  DEFAULT_CALIBRATION,
  FINGER_NAMES,
  loadCalibration,
  relaxedCalibration,
  saveCalibration,
  type FingerCalibration,
  type FingerName,
} from '../lib/calibration'
import {
  countExtendedFingers,
  fingerScores,
  getExtendedFingerMask,
  normalizeLandmarks,
} from '../lib/handGeometry'

/** Returns true only when the exact set of extended fingers matches the target count's mask. */
function exactPoseMatch(
  mask: Record<FingerName, boolean>,
  expected: 0 | 1 | 2 | 3 | 4 | 5 | null,
): boolean {
  if (expected === null) return false
  if (expected === 0) return FINGER_NAMES.every((f) => !mask[f])
  const required = COUNT_FINGER_MASK[expected as 1 | 2 | 3 | 4 | 5]
  return FINGER_NAMES.every((f) => mask[f] === required.includes(f))
}
import type { NormalizedLandmarkList } from '../types/mediapipe'

export type CalibrationStatus =
  | 'loading'
  | 'needed'
  | 'calibrating'
  | 'ready'

export type CalibrationStep =
  | 'intro'
  | 'camera'
  | 'fist'
  | 'count1'
  | 'count2'
  | 'count3'
  | 'count4'
  | 'count5'
  | 'verify'
  | 'done'

const FRAMES_PER_STEP = 30
const MIN_SAMPLES_FOR_THRESHOLD = 15
const MATCH_STREAK_REQUIRED = 2
const VERIFY_STABLE_FRAMES = 10
const CAMERA_HAND_FRAMES = 30
const VERIFY_TARGETS: (1 | 3 | 5)[] = [1, 3, 5]

const RELAXED_CALIBRATION = relaxedCalibration(DEFAULT_CALIBRATION)

const STEP_COUNTS: Record<
  Exclude<CalibrationStep, 'intro' | 'camera' | 'verify' | 'done' | 'fist'>,
  1 | 2 | 3 | 4 | 5
> = {
  count1: 1,
  count2: 2,
  count3: 3,
  count4: 4,
  count5: 5,
}

function emptySamples(): Record<FingerName, number[]> {
  return { thumb: [], index: [], middle: [], ring: [], pinky: [] }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function expectedFingerCount(
  step: CalibrationStep,
  verifyIndex: number,
): 0 | 1 | 2 | 3 | 4 | 5 | null {
  if (step === 'fist') return 0
  if (step === 'count1') return 1
  if (step === 'count2') return 2
  if (step === 'count3') return 3
  if (step === 'count4') return 4
  if (step === 'count5') return 5
  if (step === 'verify') return VERIFY_TARGETS[verifyIndex] ?? null
  return null
}

export function useCalibration() {
  const [status, setStatus] = useState<CalibrationStatus>('loading')
  const [calibration, setCalibration] = useState<FingerCalibration>(
    DEFAULT_CALIBRATION,
  )
  const [step, setStep] = useState<CalibrationStep>('intro')
  const [frameProgress, setFrameProgress] = useState(0)
  const [verifyIndex, setVerifyIndex] = useState(0)
  const [verifyPassed, setVerifyPassed] = useState(false)
  const [liveDetectedCount, setLiveDetectedCount] = useState(0)
  const [liveExtendedMask, setLiveExtendedMask] = useState<
    Record<FingerName, boolean>
  >({
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  })
  const [poseMatch, setPoseMatch] = useState(false)

  const statusRef = useRef(status)
  const stepRef = useRef(step)
  const verifyIndexRef = useRef(verifyIndex)
  const builtCalibrationRef = useRef<FingerCalibration>(DEFAULT_CALIBRATION)
  const matchStreakRef = useRef(0)
  const verifyStreakRef = useRef(0)
  const verifyPauseRef = useRef(false)   // true while waiting between verify targets
  const cameraHandFramesRef = useRef(0)
  const verifyTimeoutRef = useRef<number | null>(null)

  statusRef.current = status
  stepRef.current = step
  verifyIndexRef.current = verifyIndex

  const samplesRef = useRef<{
    fist: Record<FingerName, number[]>
    byCount: Record<number, Record<FingerName, number[]>>
  }>({
    fist: emptySamples(),
    byCount: {
      1: emptySamples(),
      2: emptySamples(),
      3: emptySamples(),
      4: emptySamples(),
      5: emptySamples(),
    },
  })

  const clearStepSamples = useCallback((targetStep: CalibrationStep) => {
    if (targetStep === 'fist') {
      samplesRef.current.fist = emptySamples()
    } else if (targetStep.startsWith('count')) {
      const n = STEP_COUNTS[targetStep as keyof typeof STEP_COUNTS]
      samplesRef.current.byCount[n] = emptySamples()
    }
  }, [])

  useEffect(() => {
    const stored = loadCalibration()
    if (stored) {
      setCalibration(stored)
      builtCalibrationRef.current = stored
      setStatus('ready')
      setStep('done')
    } else {
      setStatus('needed')
      setStep('intro')
    }
  }, [])

  const startCalibration = useCallback(() => {
    samplesRef.current = {
      fist: emptySamples(),
      byCount: {
        1: emptySamples(),
        2: emptySamples(),
        3: emptySamples(),
        4: emptySamples(),
        5: emptySamples(),
      },
    }
    matchStreakRef.current = 0
    verifyStreakRef.current = 0
    verifyPauseRef.current = false
    cameraHandFramesRef.current = 0
    setFrameProgress(0)
    setVerifyIndex(0)
    setVerifyPassed(false)
    setLiveDetectedCount(0)
    setPoseMatch(false)
    setStatus('calibrating')
    setStep('camera')
    stepRef.current = 'camera'
  }, [])

  const resetCalibration = useCallback(() => {
    localStorage.removeItem(CALIBRATION_STORAGE_KEY)
    setCalibration(DEFAULT_CALIBRATION)
    builtCalibrationRef.current = DEFAULT_CALIBRATION
    setStatus('needed')
    setStep('intro')
    setFrameProgress(0)
    setVerifyIndex(0)
    setVerifyPassed(false)
    setLiveDetectedCount(0)
    setPoseMatch(false)
  }, [])

  const advanceStep = useCallback(() => {
    setFrameProgress(0)
    setVerifyPassed(false)
    matchStreakRef.current = 0
    verifyStreakRef.current = 0

    setStep((s) => {
      const order: CalibrationStep[] = [
        'intro',
        'camera',
        'fist',
        'count1',
        'count2',
        'count3',
        'count4',
        'count5',
        'verify',
        'done',
      ]
      const i = order.indexOf(s)
      const next = order[Math.min(i + 1, order.length - 1)] ?? 'done'
      clearStepSamples(next)
      stepRef.current = next
      return next
    })
  }, [clearStepSamples])

  const buildCalibrationFromSamples = useCallback((): FingerCalibration => {
    const { fist, byCount } = samplesRef.current
    const noiseFloor =
      Math.max(...FINGER_NAMES.flatMap((f) => fist[f]), 0.01) + 0.015

    const thresholds = { ...DEFAULT_CALIBRATION.thresholds }

    for (const finger of FINGER_NAMES) {
      const extended: number[] = []
      const folded: number[] = [...fist[finger]]

      for (const count of [1, 2, 3, 4, 5] as const) {
        const shouldExtend = COUNT_FINGER_MASK[count].includes(finger)
        const samples = byCount[count][finger]
        if (samples.length < MIN_SAMPLES_FOR_THRESHOLD) continue
        if (shouldExtend) extended.push(...samples)
        else folded.push(...samples)
      }

      if (extended.length > 0 && folded.length > 0) {
        const mid = (median(extended) + median(folded)) / 2
        const extMed = median(extended)
        thresholds[finger] = Math.max(
          noiseFloor + 0.01,
          Math.min(extMed * 0.85, mid),
        )
      } else if (extended.length > 0) {
        thresholds[finger] = Math.max(
          noiseFloor + 0.01,
          median(extended) * 0.85,
        )
      } else {
        thresholds[finger] = DEFAULT_CALIBRATION.thresholds[finger]
      }
    }

    return { noiseFloor, thresholds }
  }, [])

  const finishCalibration = useCallback(() => {
    const built = builtCalibrationRef.current
    saveCalibration(built)
    setCalibration(built)
    setStatus('ready')
    setStep('done')
    stepRef.current = 'done'
  }, [])

  const appendValidSample = useCallback(
    (
      targetStep: 'fist' | keyof typeof STEP_COUNTS,
      scores: Record<FingerName, number>,
    ) => {
      if (targetStep === 'fist') {
        for (const f of FINGER_NAMES) {
          samplesRef.current.fist[f].push(scores[f])
        }
        return samplesRef.current.fist.index.length
      }
      const n = STEP_COUNTS[targetStep as keyof typeof STEP_COUNTS]
      for (const f of FINGER_NAMES) {
        samplesRef.current.byCount[n][f].push(scores[f])
      }
      return samplesRef.current.byCount[n].index.length
    },
    [],
  )

  const ingestFrame = useCallback(
    (landmarks: NormalizedLandmarkList | null) => {
      if (statusRef.current !== 'calibrating') return

      const currentStep = stepRef.current
      const expected = expectedFingerCount(
        currentStep,
        verifyIndexRef.current,
      )

      if (!landmarks) {
        setLiveDetectedCount(0)
        setPoseMatch(false)
        matchStreakRef.current = 0
        verifyStreakRef.current = 0
        cameraHandFramesRef.current = 0
        return
      }

      const norm = normalizeLandmarks(landmarks)
      const scores = fingerScores(norm)
      const detected = countExtendedFingers(
        norm,
        RELAXED_CALIBRATION,
      ) as 0 | 1 | 2 | 3 | 4 | 5
      const mask = getExtendedFingerMask(norm, RELAXED_CALIBRATION)

      setLiveDetectedCount(detected)
      setLiveExtendedMask(mask)
      setPoseMatch(exactPoseMatch(mask, expected))

      if (currentStep === 'camera') {
        cameraHandFramesRef.current += 1
        setFrameProgress(
          Math.min(cameraHandFramesRef.current / CAMERA_HAND_FRAMES, 1),
        )
        if (cameraHandFramesRef.current >= CAMERA_HAND_FRAMES) {
          cameraHandFramesRef.current = 0
          advanceStep()
        }
        return
      }

      if (expected === null) return

      if (exactPoseMatch(mask, expected)) {
        matchStreakRef.current += 1
      } else {
        matchStreakRef.current = 0
      }

      if (currentStep === 'verify') {
        // Skip frame processing during the brief pause between verify targets
        // so the progress bar doesn't flicker while the success animation plays.
        if (verifyPauseRef.current) return

        const cal = builtCalibrationRef.current
        const verifyMask = getExtendedFingerMask(norm, cal)
        const verifyCount = countExtendedFingers(norm, cal) as number
        const target = VERIFY_TARGETS[verifyIndexRef.current]
        const verifyMatch = exactPoseMatch(verifyMask, target)

        setLiveDetectedCount(verifyCount)
        setPoseMatch(verifyMatch)

        if (verifyMatch) {
          verifyStreakRef.current += 1
        } else {
          verifyStreakRef.current = 0
        }

        setFrameProgress(Math.min(verifyStreakRef.current / VERIFY_STABLE_FRAMES, 1))

        if (verifyStreakRef.current >= VERIFY_STABLE_FRAMES) {
          verifyStreakRef.current = 0
          verifyPauseRef.current = true   // freeze bar at 100% during inter-target pause
          setVerifyPassed(true)
          setFrameProgress(1)

          if (verifyTimeoutRef.current !== null) {
            window.clearTimeout(verifyTimeoutRef.current)
          }
          verifyTimeoutRef.current = window.setTimeout(() => {
            verifyTimeoutRef.current = null
            verifyPauseRef.current = false  // resume processing for next target
            setVerifyPassed(false)
            setFrameProgress(0)
            if (verifyIndexRef.current + 1 >= VERIFY_TARGETS.length) {
              finishCalibration()
            } else {
              setVerifyIndex((i) => {
                const next = i + 1
                verifyIndexRef.current = next
                return next
              })
              matchStreakRef.current = 0
            }
          }, 800)
        }
        return
      }

      if (matchStreakRef.current < MATCH_STREAK_REQUIRED) {
        return
      }

      let validCount = 0
      if (currentStep === 'fist') {
        validCount = appendValidSample('fist', scores)
      } else if (currentStep.startsWith('count')) {
        const target = currentStep as keyof typeof STEP_COUNTS
        validCount = appendValidSample(target, scores)
      }

      setFrameProgress(Math.min(validCount / FRAMES_PER_STEP, 1))

      if (validCount >= FRAMES_PER_STEP) {
        matchStreakRef.current = 0
        if (currentStep === 'count5') {
          const built = buildCalibrationFromSamples()
          builtCalibrationRef.current = built
          setCalibration(built)
        }
        advanceStep()
      }
    },
    [
      advanceStep,
      appendValidSample,
      buildCalibrationFromSamples,
      finishCalibration,
    ],
  )

  useEffect(() => {
    return () => {
      if (verifyTimeoutRef.current !== null) {
        window.clearTimeout(verifyTimeoutRef.current)
      }
    }
  }, [])

  const expectedCount = expectedFingerCount(step, verifyIndex)

  const stepInstruction = ((): string => {
    switch (step) {
      case 'intro':
        return 'Quick hand calibration makes gestures reliable. Takes about 30 seconds.'
      case 'camera':
        return 'Show your hand in the camera. Keep it in frame until we continue.'
      case 'fist':
        return 'Close your hand into a fist. Hold steady until the bar fills.'
      case 'count1':
        return 'Hold up 1 finger (index only).'
      case 'count2':
        return 'Hold up 2 fingers (index + middle).'
      case 'count3':
        return 'Hold up 3 fingers (index, middle, ring).'
      case 'count4':
        return 'Hold up 4 fingers (all except thumb).'
      case 'count5':
        return 'Open your full hand — all 5 fingers.'
      case 'verify': {
        const t = VERIFY_TARGETS[verifyIndex]
        return `Test: show ${t} finger${t === 1 ? '' : 's'} and hold until confirmed.`
      }
      case 'done':
        return 'Calibration complete. Use finger counts to control music.'
      default:
        return ''
    }
  })()

  return {
    status,
    calibration,
    step,
    frameProgress,
    stepInstruction,
    verifyPassed,
    liveDetectedCount,
    liveExtendedMask,
    poseMatch,
    expectedCount,
    startCalibration,
    resetCalibration,
    ingestFrame,
    advanceStep,
    finishCalibration,
  }
}
