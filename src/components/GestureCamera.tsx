import type { FingerName } from '../lib/calibration'
import type { NormalizedLandmarkList } from '../types/mediapipe'
import { CameraPreview } from './CameraPreview'

interface GestureCameraProps {
  stream: MediaStream | null
  landmarks: NormalizedLandmarkList | null
  extendedMask: Record<FingerName, boolean>
  onRecalibrate?: () => void
}

export function GestureCamera({
  stream,
  landmarks,
  extendedMask,
  onRecalibrate,
}: GestureCameraProps) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[220px] overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-md"
      aria-label="Gesture camera preview"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs font-medium text-zinc-300">
        <span
          className="gestura-pulse-dot h-2 w-2 rounded-full bg-emerald-400"
          aria-hidden="true"
        />
        Gestura Active
      </div>
      <CameraPreview
        stream={stream}
        landmarks={landmarks}
        extendedMask={extendedMask}
        size="compact"
      />
      {onRecalibrate && (
        <div className="border-t border-white/10 px-3 py-2 text-center">
          <button
            type="button"
            onClick={onRecalibrate}
            className="text-xs text-violet-400 underline-offset-2 hover:text-violet-300 hover:underline"
          >
            Recalibrate gestures
          </button>
        </div>
      )}
    </div>
  )
}
