import { useEffect, useRef, type RefObject } from 'react'
import type { NormalizedLandmarkList } from '../types/mediapipe'

interface GestureCameraProps {
  videoRef: RefObject<HTMLVideoElement | null>
  landmarks: NormalizedLandmarkList | null
}

export function GestureCamera({ videoRef, landmarks }: GestureCameraProps) {
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
        ctx.fillStyle = '#7c3aed'
        for (const point of landmarks) {
          ctx.beginPath()
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI)
          ctx.fill()
        }
      }

      requestAnimationFrame(draw)
    }

    const frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [videoRef, landmarks])

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
      <div className="relative aspect-[4/3] bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover [transform:scaleX(-1)]"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full [transform:scaleX(-1)]"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
