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
    <div aria-label="Live camera preview">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="gestura-pulse-dot h-2.5 w-2.5 rounded-full bg-[#15803D]"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-[#1A2230]">Camera active</span>
        </div>
        {onRecalibrate && (
          <button
            type="button"
            onClick={onRecalibrate}
            className="rounded-lg border border-[#E4E0DA] bg-white px-3 py-1.5 text-sm font-medium text-[#52606D] transition-colors hover:border-[#BFDBFE] hover:bg-[#DBEAFE] hover:text-[#1D4ED8]"
          >
            Recalibrate
          </button>
        )}
      </div>
      <CameraPreview
        stream={stream}
        landmarks={landmarks}
        extendedMask={extendedMask}
        size="compact"
      />
    </div>
  )
}
