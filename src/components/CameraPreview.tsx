import { useEffect, useRef } from 'react'
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
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach the shared webcam stream to this preview's own <video> element.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    if (stream) {
      video.play().catch(() => {
        /* autoplay may reject until user interaction; harmless here */
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
      canvas.width = video?.videoWidth || 640
      canvas.height = video?.videoHeight || 480
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

      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [landmarks, extendedMask, size])

  const aspectClass = 'aspect-[4/3]'

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
      {/*
        Canvas must NOT be CSS-mirrored. The video is mirrored (scaleX(-1)) but
        the landmarks come from MediaPipe which already processed a flipped frame,
        so landmark.x is in the mirrored coordinate space. Drawing at landmark.x
        on an un-mirrored canvas puts the dot at the same screen position as the
        corresponding pixel in the mirrored video. Double-mirroring the canvas
        would flip the dots to the wrong side.
      */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  )
}
