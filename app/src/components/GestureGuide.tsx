import { X } from 'lucide-react'
import { HandSprite } from './HandSprite'

const GUIDE_DISMISSED_KEY = 'gestura-guide-dismissed'

interface GestureGuideProps {
  onDismiss: () => void
}

const ROWS = [
  { count: 1, pose: 'Index finger only',               action: 'Volume down' },
  { count: 2, pose: 'Index + middle',                   action: 'Volume up' },
  { count: 3, pose: 'Index + middle + ring',            action: 'Previous track' },
  { count: 4, pose: 'Index + middle + ring + pinky',    action: 'Next track' },
  { count: 5, pose: 'Open hand (all five fingers)',     action: 'Play / Pause' },
] as const

export function GestureGuide({ onDismiss }: GestureGuideProps) {
  const handleDismiss = () => {
    localStorage.setItem(GUIDE_DISMISSED_KEY, '1')
    onDismiss()
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Gesture guide"
    >
      <div className="w-full max-w-lg animate-[guide-pop_260ms_ease-out] rounded-2xl border border-[#E4E0DA] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E4E0DA] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#1A2230]">How to use gestures</h2>
            <p className="mt-1 text-sm text-[#52606D]">
              Use an exact pose, hold steady until the circle fills. Relax between commands.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close gesture guide"
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4E0DA] text-[#7B8794] transition-colors hover:bg-[#F7F5F2] hover:text-[#1A2230]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Gesture rows */}
        <ul className="divide-y divide-[#E4E0DA] px-6">
          {ROWS.map(({ count, pose, action }, idx) => (
            <li
              key={count}
              className="flex items-center gap-4 py-3 opacity-0 [animation:guide-row_360ms_ease-out_forwards]"
              style={{ animationDelay: `${80 + idx * 50}ms` }}
            >
              <HandSprite count={count} size={52} />
              <span className="flex-1">
                <span className="block text-base font-semibold text-[#1A2230]">{action}</span>
                <span className="block text-sm text-[#52606D]">{pose}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Tip */}
        <div className="mx-6 mb-4 rounded-lg border border-[#E4E0DA] bg-[#F7F5F2] px-4 py-3 text-sm text-[#52606D]">
          Keep your palm toward the camera. Thumb up or extra fingers break the pose — only the exact combination shown will trigger.
        </div>

        {/* Dismiss */}
        <div className="border-t border-[#E4E0DA] px-6 py-4">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-xl bg-[#1D4ED8] py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#1E40AF]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export function shouldShowGestureGuide(): boolean {
  return localStorage.getItem(GUIDE_DISMISSED_KEY) !== '1'
}
