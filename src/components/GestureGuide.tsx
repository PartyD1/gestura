const GUIDE_DISMISSED_KEY = 'gestura-guide-dismissed'

interface GestureGuideProps {
  onDismiss: () => void
}

const ROWS = [
  { count: 1, action: 'Volume down' },
  { count: 2, action: 'Volume up' },
  { count: 3, action: 'Previous track' },
  { count: 4, action: 'Next track' },
  { count: 5, action: 'Play / pause' },
] as const

export function GestureGuide({ onDismiss }: GestureGuideProps) {
  const handleDismiss = () => {
    localStorage.setItem(GUIDE_DISMISSED_KEY, '1')
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-violet-500/20 bg-zinc-900 p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white">How to control Gestura</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Hold up fingers, keep steady until the ring fills, then release.
        </p>

        <ul className="mt-6 space-y-3">
          {ROWS.map(({ count, action }) => (
            <li
              key={count}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-lg font-bold text-violet-200">
                {count}
              </span>
              <span className="text-sm text-zinc-200">{action}</span>
            </li>
          ))}
        </ul>

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
