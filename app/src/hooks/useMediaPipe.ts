import { useEffect, useRef, useState, type RefObject } from 'react'
import type { NormalizedLandmarkList } from '../types/mediapipe'

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
const SMOOTH_ALPHA = 0.35

function smoothLandmarks(
  prev: NormalizedLandmarkList | null,
  next: NormalizedLandmarkList,
): NormalizedLandmarkList {
  if (!prev || prev.length !== next.length) return next
  return next.map((p, i) => ({
    x: SMOOTH_ALPHA * p.x + (1 - SMOOTH_ALPHA) * prev[i].x,
    y: SMOOTH_ALPHA * p.y + (1 - SMOOTH_ALPHA) * prev[i].y,
    z: SMOOTH_ALPHA * p.z + (1 - SMOOTH_ALPHA) * prev[i].z,
    visibility: p.visibility,
  }))
}

export type Handedness = 'Left' | 'Right' | null

export function useMediaPipe(videoRef: RefObject<HTMLVideoElement | null>) {
  const [landmarks, setLandmarks] = useState<NormalizedLandmarkList | null>(null)
  const [handedness, setHandedness] = useState<Handedness>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const handsRef = useRef<InstanceType<typeof window.Hands> | null>(null)
  const cameraRef = useRef<InstanceType<typeof window.Camera> | null>(null)
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const smoothedRef = useRef<NormalizedLandmarkList | null>(null)
  const latestRef = useRef<NormalizedLandmarkList | null>(null)
  const latestHandednessRef = useRef<Handedness>(null)
  const rafScheduledRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof window.Hands === 'undefined') {
      return
    }

    const mirrorCanvas = document.createElement('canvas')
    mirrorCanvasRef.current = mirrorCanvas
    const mirrorCtx = mirrorCanvas.getContext('2d')

    const flushLandmarks = () => {
      rafScheduledRef.current = false
      setLandmarks(latestRef.current)
      setHandedness(latestHandednessRef.current)
    }

    const scheduleFlush = () => {
      if (rafScheduledRef.current) return
      rafScheduledRef.current = true
      requestAnimationFrame(flushLandmarks)
    }

    const hands = new window.Hands({
      locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
    })

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    })

    hands.onResults((results) => {
      const detected = results.multiHandLandmarks?.[0] ?? null
      if (!detected) {
        smoothedRef.current = null
        latestRef.current = null
        latestHandednessRef.current = null
        scheduleFlush()
        return
      }
      const label = results.multiHandedness?.[0]?.label
      latestHandednessRef.current =
        label === 'Left' || label === 'Right' ? label : null
      smoothedRef.current = smoothLandmarks(smoothedRef.current, detected)
      latestRef.current = smoothedRef.current
      scheduleFlush()
    })

    handsRef.current = hands

    const camera = new window.Camera(video, {
      onFrame: async () => {
        if (!mirrorCtx || video.videoWidth === 0) {
          await hands.send({ image: video })
          return
        }
        mirrorCanvas.width = video.videoWidth
        mirrorCanvas.height = video.videoHeight
        mirrorCtx.save()
        mirrorCtx.scale(-1, 1)
        mirrorCtx.drawImage(
          video,
          -mirrorCanvas.width,
          0,
          mirrorCanvas.width,
          mirrorCanvas.height,
        )
        mirrorCtx.restore()
        await hands.send({ image: mirrorCanvas })
      },
      width: 640,
      height: 480,
    })

    camera
      .start()
      .then(() => {
        setCameraError(null)
        // Expose the live stream so any number of preview <video> elements can
        // display it, independent of which one MediaPipe reads frames from.
        const src = video.srcObject
        if (src instanceof MediaStream) setStream(src)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Camera could not start'
        setCameraError(message)
        console.error('[Gestura] Camera failed to start', err)
      })

    cameraRef.current = camera

    return () => {
      camera.stop()
      hands.close()
      handsRef.current = null
      cameraRef.current = null
      mirrorCanvasRef.current = null
      smoothedRef.current = null
      latestRef.current = null
      latestHandednessRef.current = null
      setLandmarks(null)
      setHandedness(null)
      setStream(null)
    }
  }, [videoRef])

  return { landmarks, handedness, stream, cameraError }
}
