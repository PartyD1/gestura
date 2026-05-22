import { useEffect, useRef } from 'react'
import { GestureBadge } from './components/GestureBadge'
import { GestureCamera } from './components/GestureCamera'
import { MusicPlayer } from './components/MusicPlayer'
import { useGestures } from './hooks/useGestures'
import { useMediaPipe } from './hooks/useMediaPipe'
import { usePlayer } from './hooks/usePlayer'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { landmarks } = useMediaPipe(videoRef)
  const { gesture, gestureId } = useGestures(landmarks)
  const {
    audioRef,
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    togglePlay,
    prevTrack,
    nextTrack,
    setVolume,
    seek,
    handleGesture,
    formatTime,
  } = usePlayer()
  const lastGestureId = useRef(0)

  useEffect(() => {
    if (!gesture || gestureId === 0 || gestureId === lastGestureId.current) {
      return
    }
    lastGestureId.current = gestureId
    handleGesture(gesture)
  }, [gesture, gestureId, handleGesture])

  return (
    <div className="gestura-bg relative min-h-full">
      <header className="absolute left-0 right-0 top-0 z-10 px-6 py-5">
        <h1 className="text-lg font-bold tracking-wide text-white">
          Gestura
        </h1>
        <p className="text-sm text-zinc-500">
          Hand-gesture music control
        </p>
      </header>

      <GestureBadge gesture={gesture} gestureId={gestureId} />

      <MusicPlayer
        audioRef={audioRef}
        track={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        progress={progress}
        currentTimeLabel={formatTime(progress * duration)}
        durationLabel={formatTime(duration)}
        onTogglePlay={togglePlay}
        onPrev={prevTrack}
        onNext={nextTrack}
        onVolumeChange={setVolume}
        onSeek={seek}
      />

      <GestureCamera videoRef={videoRef} landmarks={landmarks} />
    </div>
  )
}

export default App
