import { useEffect, useRef, type RefObject } from 'react'
import type { FingerName } from '../lib/calibration'
import { LANDMARK } from '../lib/handGeometry'
import type { NormalizedLandmarkList } from '../types/mediapipe'

const FINGER_LANDMARKS: Record<FingerName, number> = {
  thumb: LANDMARK.THUMB_TIP,
  index: LANDMARK.INDEX_TIP,
  middle: LANDMARK.MIDDLE_TIP,
  ring: LANDMARK.RING_TIP,
  pinky: LANDMARK.PINKY_TIP,
}

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>
  landmarks: NormalizedLandmarkList | null
  extendedMask: Record<FingerName, boolean>
  size?: 'large' | 'compact'
  className?: string
  showVideo?: boolean
}

export function CameraPreview({
  videoRef,
  landmarks,
  extendedMask,
  size = 'compact',
  className = '',
  showVideo = true,
}: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (landmarks) {
        const dotRadius = size === 'large' ? 9 : 7
        const dotRadiusDim = size === 'large' ? 5 : 4
        for (const [finger, tipIndex] of Object.entries(FINGER_LANDMARKS)) {
          const point = landmarks[tipIndex]
          const extended = extendedMask[finger as FingerName]
          ctx.fillStyle = extended ? '#34d399' : '#52525b'
          ctx.beginPath()
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            extended ? dotRadius : dotRadiusDim,
            0,
            2 * Math.PI,
          )
          ctx.fill()
        }
      }

      requestAnimationFrame(draw)
    }

    const frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [videoRef, landmarks, extendedMask, size])

  const aspectClass = size === 'large' ? 'aspect-[4/3]' : 'aspect-[4/3]'

  return (
    <div className={`relative overflow-hidden bg-black ${aspectClass} ${className}`}>
      {showVideo && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover [transform:scaleX(-1)]"
          autoPlay
          playsInline
          muted
        />
      )}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full [transform:scaleX(-1)]"
        aria-hidden="true"
      />
    </div>
  )
}
