import { useEffect, useRef } from 'react'
import type { FingerName } from '../lib/calibration'
import { LANDMARK } from '../lib/handGeometry'
import type { NormalizedLandmarkList } from '../types/mediapipe'

const FINGER_LANDMARKS: Record<FingerName, number> = {
  thumb:  LANDMARK.THUMB_TIP,
  index:  LANDMARK.INDEX_TIP,
  middle: LANDMARK.MIDDLE_TIP,
  ring:   LANDMARK.RING_TIP,
  pinky:  LANDMARK.PINKY_TIP,
}

interface CameraPreviewProps {
  stream: MediaStream | null
  landmarks: NormalizedLandmarkList | null
  extendedMask: Record<FingerName, boolean>
  size?: 'large' | 'compact'
  className?: string
  showVideo?: boolean
}

export function CameraPreview({
  stream,
  landmarks,
  extendedMask,
  size = 'compact',
  className = '',
  showVideo = true,
}: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)

  // Attach the shared webcam stream to this preview's own <video> element.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    if (stream) {
      video.play().catch(() => {
        /* autoplay may be deferred until user interaction; harmless */
      })
    }
  }, [stream])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    const draw = () => {
      const video = videoRef.current
      canvas.width  = video?.videoWidth  || 640
      canvas.height = video?.videoHeight || 480
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (landmarks) {
        const dotRadius    = size === 'large' ? 9 : 7
        const dotRadiusDim = size === 'large' ? 5 : 4
        for (const [finger, tipIndex] of Object.entries(FINGER_LANDMARKS)) {
          const point    = landmarks[tipIndex]
          const extended = extendedMask[finger as FingerName]
          // Extended: accessible green; retracted: medium gray for visibility on light bg
          ctx.fillStyle = extended ? '#15803D' : '#9CA3AF'
          ctx.beginPath()
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            extended ? dotRadius : dotRadiusDim,
            0,
            2 * Math.PI,
          )
          ctx.fill()
          // White ring on extended dots for contrast over any background
          if (extended) {
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 2
            ctx.stroke()
          }
        }
      }

      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [landmarks, extendedMask, size])

  const aspectClass = size === 'large' ? 'aspect-[4/3]' : 'aspect-video'

  return (
    <div className={`relative overflow-hidden bg-[#F7F5F2] ${aspectClass} ${className}`}>
      {showVideo && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover [transform:scaleX(-1)]"
          autoPlay
          playsInline
          muted
        />
      )}
      {/*
        Canvas must NOT be CSS-mirrored. Landmarks are in MediaPipe's
        already-flipped space; the video is CSS-mirrored; drawing at
        landmark.x on an un-mirrored canvas aligns correctly.
      */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  )
}
