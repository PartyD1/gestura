import { useCallback, useEffect, useRef, useState } from 'react'
import { tracks, type Track } from '../data/tracks'
import type { Gesture } from '../types/gesture'

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const volumeRef = useRef(0.7)
  volumeRef.current = volume
  const isPlayingRef = useRef(false)
  isPlayingRef.current = isPlaying
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const currentTrack: Track = tracks[currentIndex]

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      void audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  const nextTrack = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % tracks.length)
    setIsPlaying(true)
  }, [])

  const prevTrack = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
  }, [])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolumeState(clamped)
    if (audioRef.current) {
      audioRef.current.volume = clamped
    }
  }, [])

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    const clamped = Math.min(1, Math.max(0, fraction))
    audio.currentTime = clamped * audio.duration
    setProgress(clamped)
  }, [])

  const handleGesture = useCallback(
    (gesture: NonNullable<Gesture>) => {
      switch (gesture) {
        case 'PLAY_PAUSE':
          togglePlay()
          break
        case 'NEXT':
          nextTrack()
          break
        case 'PREV':
          prevTrack()
          break
        case 'VOL_UP':
          setVolume(volumeRef.current + 0.1)
          break
        case 'VOL_DOWN':
          setVolume(volumeRef.current - 0.1)
          break
      }
    },
    [togglePlay, nextTrack, prevTrack, setVolume],
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const playWhenReady = () => {
      audio.volume = volumeRef.current
      if (isPlayingRef.current) {
        void audio.play().catch(() => setIsPlaying(false))
      }
    }

    audio.src = currentTrack.audioSrc
    audio.load()

    if (audio.readyState >= 2) {
      playWhenReady()
    } else {
      audio.addEventListener('canplay', playWhenReady, { once: true })
    }

    return () => {
      audio.removeEventListener('canplay', playWhenReady)
    }
  }, [currentIndex, currentTrack.audioSrc])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume

    const onTimeUpdate = () => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration)
      }
    }

    const onLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const onEnded = () => {
      nextTrack()
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [nextTrack, volume])

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return {
    audioRef,
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    volume,
    progress,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    setVolume,
    seek,
    handleGesture,
    formatTime,
  }
}
