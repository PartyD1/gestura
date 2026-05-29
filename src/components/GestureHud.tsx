import { CheckCircle, AlertCircle, Hand, Clock } from 'lucide-react'
import { fingerCountLabel } from '../lib/gestureMap'
import type { GesturePhase, RejectReason } from '../hooks/useGestures'
import type { Gesture } from '../types/gesture'

interface GestureHudProps {
  fingerCount: 0 | 1 | 2 | 3 | 4 | 5
  phase: GesturePhase
  confirmProgress: number
  pendingGesture: Gesture
  gesturesEnabled: boolean
  rejectReason: RejectReason
}

const PHASE_TEXT: Record<GesturePhase, string> = {
  searching:  'Show your hand to the camera',
  detected:   'Hold steady…',
  holding:    'Keep holding to confirm',
  fired:      'Action sent!',
  cooldown:   'Relax your pose to continue',
}

const REJECT_TEXT: Record<NonNullable<RejectReason>, string> = {
  pose:     'Use an exact 1–5 pose (see guide below)',
  distance: 'Move your hand closer to the camera',
  facing:   'Turn your palm to face the camera',
}

export function GestureHud({
  fingerCount,
  phase,
  confirmProgress,
  gesturesEnabled,
  rejectReason,
}: GestureHudProps) {
  if (!gesturesEnabled) return null

  const isRejected = rejectReason !== null
  const isFired = phase === 'fired'
  const isHolding = phase === 'holding' || isFired

  const label = fingerCount > 0 ? fingerCountLabel(fingerCount) : 'Show 1–5 fingers'
  const statusText = rejectReason ? REJECT_TEXT[rejectReason] : PHASE_TEXT[phase]

  const circumference = 2 * Math.PI * 28
  const dashOffset = isHolding ? circumference * (1 - confirmProgress) : circumference

  // Ring and number color based on state
  const ringColor = isRejected ? '#B45309' : isFired ? '#15803D' : '#1D4ED8'
  const bgColor   = isRejected ? '#FFFBEB' : isFired ? '#F0FDF4' : '#DBEAFE'

  return (
    <div
      className="flex items-center gap-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Ring + number */}
      <div
        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bgColor }}
        aria-hidden="true"
      >
        <svg
          className="-rotate-90 absolute inset-0 h-full w-full"
          viewBox="0 0 64 64"
        >
          <circle cx="32" cy="32" r="28" fill="none" stroke="#E4E0DA" strokeWidth="4" />
          {isHolding && (
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-75"
            />
          )}
          {isRejected && fingerCount > 0 && (
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
              className="opacity-40"
            />
          )}
        </svg>
        <span
          className="relative text-2xl font-bold tabular-nums"
          style={{ color: fingerCount > 0 ? ringColor : '#C9C3BA' }}
        >
          {fingerCount}
        </span>
      </div>

      {/* Status text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {isFired && <CheckCircle size={15} className="shrink-0 text-[#15803D]" aria-hidden="true" />}
          {isRejected && <AlertCircle size={15} className="shrink-0 text-[#B45309]" aria-hidden="true" />}
          {phase === 'holding' && !isFired && <Clock size={15} className="shrink-0 text-[#1D4ED8]" aria-hidden="true" />}
          {!isFired && !isRejected && phase === 'searching' && <Hand size={15} className="shrink-0 text-[#7B8794]" aria-hidden="true" />}
          <p
            className="text-sm font-semibold"
            style={{ color: isRejected ? '#B45309' : isFired ? '#15803D' : '#1A2230' }}
          >
            {label}
          </p>
        </div>
        <p className="mt-0.5 text-sm text-[#52606D]">{statusText}</p>
      </div>
    </div>
  )
}
