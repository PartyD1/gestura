import { useEffect, useState } from 'react'
import { GESTURE_BADGE_LABELS } from '../lib/gestureMap'
import type { Gesture } from '../types/gesture'

interface GestureBadgeProps {
  gesture: Gesture
  gestureId: number
}

export function GestureBadge({ gesture, gestureId }: GestureBadgeProps) {
  const [visible, setVisible] = useState(false)
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!gesture || gestureId === 0) return

    setLabel(GESTURE_BADGE_LABELS[gesture])
    setVisible(true)

    const hideTimer = window.setTimeout(() => setVisible(false), 1500)
    return () => window.clearTimeout(hideTimer)
  }, [gesture, gestureId])

  if (!label) return null

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-8 z-50 -translate-x-1/2 rounded-full border border-violet-500/30 bg-violet-950/90 px-6 py-3 text-sm font-semibold text-violet-100 shadow-lg backdrop-blur-md transition-all duration-500 ${
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-2 opacity-0'
      }`}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {label}
    </div>
  )
}
