import { useEffect, useRef, useState, type RefObject } from 'react'
import type { NormalizedLandmarkList } from '../types/mediapipe'

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'

export function useMediaPipe(videoRef: RefObject<HTMLVideoElement | null>) {
  const [landmarks, setLandmarks] = useState<NormalizedLandmarkList | null>(null)
  const handsRef = useRef<InstanceType<typeof window.Hands> | null>(null)
  const cameraRef = useRef<InstanceType<typeof window.Camera> | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof window.Hands === 'undefined') {
      return
    }

    const hands = new window.Hands({
      locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
    })

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75,
    })

    hands.onResults((results) => {
      const detected = results.multiHandLandmarks?.[0] ?? null
      setLandmarks(detected)
      if (detected) {
        console.debug('[Gestura] landmarks', detected.length)
      }
    })

    handsRef.current = hands

    const camera = new window.Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video })
      },
      width: 640,
      height: 480,
    })

    camera.start().catch((err: unknown) => {
      console.error('[Gestura] Camera failed to start', err)
    })

    cameraRef.current = camera

    return () => {
      camera.stop()
      hands.close()
      handsRef.current = null
      cameraRef.current = null
      setLandmarks(null)
    }
  }, [videoRef])

  return { landmarks }
}
