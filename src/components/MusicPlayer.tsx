import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
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
    onSeek((e.clientX - rect.left) / rect.width)
  }

  const handleProgressKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onSeek(Math.min(1, progress + 0.05))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onSeek(Math.max(0, progress - 0.05))
    } else if (e.key === 'Home') {
      e.preventDefault()
      onSeek(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      onSeek(1)
    }
  }

  return (
    <section
      className="rounded-2xl border border-[#E4E0DA] bg-white shadow-sm"
      aria-label="Music player"
    >
      <audio ref={audioRef} preload="metadata" />

      {/* Album art */}
      <div className="relative overflow-hidden rounded-t-2xl">
        <img
          src={track.albumArt}
          alt={`${track.title} album art`}
          className="aspect-[2/1] w-full object-cover"
        />
        {/* Subtle gradient overlay so text is legible over art */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
          <p className="text-lg font-bold leading-tight text-white drop-shadow">
            {track.title}
          </p>
          <p className="mt-0.5 text-sm text-white/80 drop-shadow">{track.artist}</p>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        {/* Progress bar */}
        <div>
          <div
            role="slider"
            aria-label="Track progress"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${currentTimeLabel} of ${durationLabel}`}
            tabIndex={0}
            className="group relative h-4 cursor-pointer rounded-full bg-[#E4E0DA]"
            onClick={handleProgressClick}
            onKeyDown={handleProgressKey}
          >
            <div
              className="h-full rounded-full bg-[#1D4ED8] transition-all duration-150"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Visible thumb handle */}
            <div
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-[#1D4ED8] shadow-md transition-all duration-150"
              style={{ left: `calc(${progress * 100}% - 10px)` }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-[#52606D]">
            <span>{currentTimeLabel}</span>
            <span>{durationLabel}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous track"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E4E0DA] bg-white text-[#52606D] shadow-sm transition-colors hover:border-[#BFDBFE] hover:bg-[#DBEAFE] hover:text-[#1D4ED8]"
          >
            <SkipBack size={22} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-md transition-colors hover:bg-[#1E40AF]"
          >
            {isPlaying
              ? <Pause size={28} fill="currentColor" />
              : <Play size={28} fill="currentColor" className="translate-x-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E4E0DA] bg-white text-[#52606D] shadow-sm transition-colors hover:border-[#BFDBFE] hover:bg-[#DBEAFE] hover:text-[#1D4ED8]"
          >
            <SkipForward size={22} />
          </button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-3">
          <VolumeX size={18} className="shrink-0 text-[#7B8794]" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label={`Volume: ${Math.round(volume * 100)}%`}
            className="h-2 w-full cursor-pointer accent-[#1D4ED8]"
          />
          <Volume2 size={18} className="shrink-0 text-[#52606D]" aria-hidden="true" />
          <span className="w-10 text-right text-sm font-medium text-[#52606D]" aria-live="polite">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </section>
  )
}
