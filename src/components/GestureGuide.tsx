const GUIDE_DISMISSED_KEY = 'gestura-guide-dismissed'

interface GestureGuideProps {
  onDismiss: () => void
}

const ROWS = [
  { count: 1, pose: 'Index finger only', action: 'Volume down' },
  { count: 2, pose: 'Index + middle', action: 'Volume up' },
  { count: 3, pose: 'Index + middle + ring', action: 'Previous track' },
  { count: 4, pose: 'Index + middle + ring + pinky', action: 'Next track' },
  { count: 5, pose: 'Open hand (all five)', action: 'Play / pause' },
] as const

export function GestureGuide({ onDismiss }: GestureGuideProps) {
  const handleDismiss = () => {
    localStorage.setItem(GUIDE_DISMISSED_KEY, '1')
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-[guide-pop_260ms_ease-out] rounded-2xl border border-violet-500/20 bg-zinc-900 p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white">How to control Gestura</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Use an exact pose and hold steady until the ring fills. Between
          commands, briefly relax or change your pose to re-arm.
        </p>

        <ul className="mt-6 space-y-3">
          {ROWS.map(({ count, pose, action }, idx) => (
            <li
              key={count}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 opacity-0 [animation:guide-row_360ms_ease-out_forwards]"
              style={{ animationDelay: `${120 + idx * 65}ms` }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-lg font-bold text-violet-200">
                {count}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-zinc-200">{action}</span>
                <span className="text-xs text-zinc-500">{pose}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-2.5 text-xs text-zinc-400">
          Keep your palm toward the camera. A raised thumb or extra fingers break
          the pose — only the exact combination shown above will trigger.
        </p>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-8 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export function shouldShowGestureGuide(): boolean {
  return localStorage.getItem(GUIDE_DISMISSED_KEY) !== '1'
}
