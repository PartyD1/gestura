import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import type { RefObject } from 'react'
import type { Track } from '../data/tracks'

interface MusicPlayerProps {
  audioRef: RefObject<HTMLAudioElement | null>
  track: Track
  isPlaying: boolean
  volume: number
  progress: number
  currentTimeLabel: string
  durationLabel: string
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onVolumeChange: (v: number) => void
  onSeek: (fraction: number) => void
}

export function MusicPlayer({
  audioRef,
  track,
  isPlaying,
  volume,
  progress,
  currentTimeLabel,
  durationLabel,
  onTogglePlay,
  onPrev,
  onNext,
  onVolumeChange,
  onSeek,
}: MusicPlayerProps) {
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    onSeek(fraction)
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <audio ref={audioRef} preload="metadata" />

      <div className="w-full max-w-md space-y-8 text-center">
        <img
          src={track.albumArt}
          alt={`${track.title} album art`}
          className="mx-auto aspect-square w-72 max-w-full rounded-2xl object-cover shadow-[0_0_60px_rgba(124,58,237,0.35)]"
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {track.title}
          </h1>
          <p className="mt-1 text-base text-zinc-400">{track.artist}</p>
        </div>

        <div className="space-y-2">
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Track progress"
            className="group h-2 cursor-pointer rounded-full bg-zinc-800"
            onClick={handleProgressClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSeek(0.5)
              }
            }}
            tabIndex={0}
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-150 group-hover:bg-violet-400"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{currentTimeLabel}</span>
            <span>{durationLabel}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous track"
            className="rounded-full p-3 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SkipBack size={28} />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="rounded-full bg-violet-600 p-5 text-white shadow-lg shadow-violet-900/50 transition-transform hover:scale-105 hover:bg-violet-500"
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="rounded-full p-3 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SkipForward size={28} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 px-4">
          <Volume2 size={20} className="shrink-0 text-zinc-500" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-full max-w-xs cursor-pointer accent-violet-500"
          />
        </div>
      </div>
    </main>
  )
}
