import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
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

    const hideTimer = window.setTimeout(() => setVisible(false), 1800)
    return () => window.clearTimeout(hideTimer)
  }, [gesture, gestureId])

  if (!label) return null

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div className="flex items-center gap-2 rounded-full border border-[#BBF7D0] bg-white px-5 py-3 shadow-lg">
        <CheckCircle size={18} className="text-[#15803D]" aria-hidden="true" />
        <span className="text-base font-semibold text-[#1A2230]">{label}</span>
      </div>
    </div>
  )
}
