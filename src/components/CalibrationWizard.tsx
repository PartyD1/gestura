import type { RefObject } from 'react'
import type { FingerName } from '../lib/calibration'
import type { CalibrationStep } from '../hooks/useCalibration'
import type { NormalizedLandmarkList } from '../types/mediapipe'
import { CameraPreview } from './CameraPreview'

interface CalibrationWizardProps {
  step: CalibrationStep
  instruction: string
  frameProgress: number
  verifyPassed: boolean
  hasHand: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  landmarks: NormalizedLandmarkList | null
  extendedMask: Record<FingerName, boolean>
  onStart: () => void
  onContinue: () => void
}

export function CalibrationWizard({
  step,
  instruction,
  frameProgress,
  verifyPassed,
  hasHand,
  videoRef,
  landmarks,
  extendedMask,
  onStart,
  onContinue,
}: CalibrationWizardProps) {
  const showProgress =
    step === 'fist' || step.startsWith('count')
  const showCamera = step !== 'intro'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-900/95 shadow-2xl sm:max-h-[90vh] sm:flex-row">
        {showCamera ? (
          <div className="border-b border-zinc-800 sm:w-[55%] sm:border-b-0 sm:border-r">
            <div className="border-b border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400">
              Camera preview — green dots = fingers detected
            </div>
            <CameraPreview
              videoRef={videoRef}
              landmarks={landmarks}
              extendedMask={extendedMask}
              size="large"
              className="min-h-[200px] sm:min-h-[320px]"
            />
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center border-b border-zinc-800 bg-zinc-950/80 sm:w-[55%] sm:border-b-0 sm:border-r">
            <p className="text-sm text-zinc-500">Camera starts when you begin</p>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-y-auto p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">Hand calibration</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {instruction}
          </p>

          {step === 'camera' && (
            <p
              className={`mt-4 text-sm font-medium ${
                hasHand ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {hasHand
                ? 'Hand detected — continuing…'
                : 'Show your hand in the camera'}
            </p>
          )}

          {showProgress && (
            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-violet-500 transition-all duration-150"
                  style={{ width: `${frameProgress * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {Math.round(frameProgress * 100)}% — keep holding
              </p>
            </div>
          )}

          {step === 'verify' && verifyPassed && (
            <p className="mt-4 text-sm font-medium text-emerald-400">
              Perfect!
            </p>
          )}

          <div className="mt-8 flex gap-3">
            {step === 'intro' && (
              <button
                type="button"
                onClick={onStart}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Start calibration
              </button>
            )}
            {step === 'camera' && hasHand && (
              <button
                type="button"
                onClick={onContinue}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Continue
              </button>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-500">
            <p className="font-medium text-zinc-400">Finger map</p>
            <ul className="mt-2 space-y-1">
              <li>1 finger — Volume down</li>
              <li>2 fingers — Volume up</li>
              <li>3 fingers — Previous track</li>
              <li>4 fingers — Next track</li>
              <li>5 fingers — Play / pause</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
