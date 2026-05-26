import { fingerCountLabel } from '../lib/gestureMap'
import type { GesturePhase } from '../hooks/useGestures'
import type { Gesture } from '../types/gesture'

interface GestureHudProps {
  fingerCount: 0 | 1 | 2 | 3 | 4 | 5
  phase: GesturePhase
  confirmProgress: number
  pendingGesture: Gesture
  gesturesEnabled: boolean
}

const PHASE_HINT: Record<GesturePhase, string> = {
  searching: 'Show your hand',
  detected: 'Hold steady…',
  holding: 'Keep holding to confirm',
  fired: 'Action sent',
  cooldown: 'Release fingers to continue',
}

export function GestureHud({
  fingerCount,
  phase,
  confirmProgress,
  pendingGesture,
  gesturesEnabled,
}: GestureHudProps) {
  if (!gesturesEnabled) return null

  const label =
    fingerCount > 0
      ? fingerCountLabel(fingerCount)
      : pendingGesture
        ? fingerCountLabel(
            fingerCount as 0 | 1 | 2 | 3 | 4 | 5,
          )
        : 'Show 1–5 fingers'

  const ringProgress =
    phase === 'holding' || phase === 'fired' ? confirmProgress : 0
  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * (1 - ringProgress)

  return (
    <div
      className="pointer-events-none fixed left-6 top-24 z-40 flex flex-col items-center gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 112 112"
          aria-hidden="true"
        >
          <circle
            cx="56"
            cy="56"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="56"
            cy="56"
            r="52"
            fill="none"
            stroke="#7c3aed"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-75"
          />
        </svg>
        <span
          className={`text-5xl font-bold tabular-nums ${
            fingerCount > 0 ? 'text-white' : 'text-zinc-600'
          }`}
        >
          {fingerCount}
        </span>
      </div>

      <div className="max-w-[200px] text-center">
        <p className="text-sm font-semibold text-violet-200">{label}</p>
        <p className="mt-1 text-xs text-zinc-500">{PHASE_HINT[phase]}</p>
      </div>
    </div>
  )
}
