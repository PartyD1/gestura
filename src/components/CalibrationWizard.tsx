import { CheckCircle, AlertCircle } from 'lucide-react'
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
  liveDetectedCount: number
  expectedCount: 0 | 1 | 2 | 3 | 4 | 5 | null
  poseMatch: boolean
  stream: MediaStream | null
  landmarks: NormalizedLandmarkList | null
  extendedMask: Record<FingerName, boolean>
  onStart: () => void
}

export function CalibrationWizard({
  step,
  instruction,
  frameProgress,
  verifyPassed,
  hasHand,
  liveDetectedCount,
  expectedCount,
  poseMatch,
  stream,
  landmarks,
  extendedMask,
  onStart,
}: CalibrationWizardProps) {
  const showProgress =
    step === 'fist' ||
    step.startsWith('count') ||
    step === 'camera' ||
    step === 'verify'
  const showCamera = step !== 'intro'
  const showPoseFeedback =
    expectedCount !== null && step !== 'camera' && step !== 'intro'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E4E0DA] bg-white shadow-xl sm:max-h-[90vh] sm:flex-row"
        role="dialog"
        aria-modal="true"
        aria-label="Hand calibration"
      >
        {/* Camera panel */}
        {showCamera ? (
          <div className="border-b border-[#E4E0DA] sm:w-[55%] sm:border-b-0 sm:border-r">
            <div className="border-b border-[#E4E0DA] bg-[#F7F5F2] px-4 py-2.5">
              <p className="text-sm font-medium text-[#52606D]">
                Camera preview — green dots show detected fingers
              </p>
            </div>
            <CameraPreview
              stream={stream}
              landmarks={landmarks}
              extendedMask={extendedMask}
              size="large"
              className="min-h-[200px] sm:min-h-[320px]"
            />
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center border-b border-[#E4E0DA] bg-[#F7F5F2] sm:w-[55%] sm:border-b-0 sm:border-r">
            <p className="text-sm text-[#7B8794]">Camera preview starts when you begin</p>
          </div>
        )}

        {/* Instruction panel */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#1A2230]">Hand calibration</h2>
          <p className="mt-3 text-base leading-relaxed text-[#52606D]">
            {instruction}
          </p>

          {/* Hand detection state */}
          {step === 'camera' && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
                hasHand
                  ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                  : 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]'
              }`}
              role="status"
            >
              {hasHand
                ? <CheckCircle size={16} aria-hidden="true" />
                : <AlertCircle size={16} aria-hidden="true" />}
              {hasHand
                ? 'Hand detected — hold in frame…'
                : 'Show your hand in the camera'}
            </div>
          )}

          {/* Pose match feedback */}
          {showPoseFeedback && (
            <div
              className={`mt-4 rounded-lg border px-4 py-4 ${
                poseMatch
                  ? 'border-[#BBF7D0] bg-[#F0FDF4]'
                  : 'border-[#FDE68A] bg-[#FFFBEB]'
              }`}
              role="status"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#7B8794]">Detected</p>
                  <p className={`text-4xl font-bold tabular-nums ${poseMatch ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                    {liveDetectedCount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#7B8794]">Target</p>
                  <p className="text-4xl font-bold tabular-nums text-[#1A2230]">
                    {expectedCount}
                  </p>
                </div>
              </div>
              <div className={`mt-3 flex items-start gap-2 text-sm ${poseMatch ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                {poseMatch
                  ? <CheckCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  : <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <span>
                  {poseMatch
                    ? 'Pose matched — hold steady while the bar fills.'
                    : `Showing ${liveDetectedCount} finger${liveDetectedCount !== 1 ? 's' : ''} — need ${expectedCount}. Adjust your hand until they match.`}
                </span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {showProgress && (
            <div className="mt-5">
              <div
                role="progressbar"
                aria-valuenow={Math.round(frameProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Calibration progress"
                className="h-3 overflow-hidden rounded-full bg-[#E4E0DA]"
              >
                <div
                  className="h-full rounded-full bg-[#1D4ED8] transition-all duration-150"
                  style={{ width: `${frameProgress * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-[#52606D]">
                {Math.round(frameProgress * 100)}% — keep holding
              </p>
            </div>
          )}

          {/* Verify passed */}
          {step === 'verify' && verifyPassed && (
            <div className="mt-4 flex items-center gap-2 text-base font-semibold text-[#15803D]">
              <CheckCircle size={18} aria-hidden="true" />
              Calibration complete!
            </div>
          )}

          {/* Start button */}
          {step === 'intro' && (
            <button
              type="button"
              onClick={onStart}
              className="mt-8 w-full rounded-xl bg-[#1D4ED8] px-4 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#1E40AF]"
            >
              Start calibration
            </button>
          )}

          {/* Quick reference */}
          <div className="mt-6 rounded-lg border border-[#E4E0DA] bg-[#F7F5F2] p-4">
            <p className="text-sm font-semibold text-[#1A2230]">Gesture reference</p>
            <ul className="mt-2 space-y-1 text-sm text-[#52606D]">
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
