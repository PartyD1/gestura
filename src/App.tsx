import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { DEFAULT_CALIBRATION } from './lib/calibration'
import {
  fingerScores,
  getExtendedFingerMask,
  normalizeLandmarks,
  palmFacingScore,
  rawPalmWidth,
} from './lib/handGeometry'
import { CalibrationWizard } from './components/CalibrationWizard'
import { GestureBadge } from './components/GestureBadge'
import { GestureCamera } from './components/GestureCamera'
import { GestureGuide, shouldShowGestureGuide } from './components/GestureGuide'
import { GestureHud } from './components/GestureHud'
import { MusicPlayer } from './components/MusicPlayer'
import { useCalibration } from './hooks/useCalibration'
import { useGestures } from './hooks/useGestures'
import { useMediaPipe } from './hooks/useMediaPipe'
import { usePlayer } from './hooks/usePlayer'

const FINGER_LEGEND = [
  { count: 1, action: 'Volume down',   pose: 'Index only' },
  { count: 2, action: 'Volume up',     pose: 'Index + middle' },
  { count: 3, action: 'Previous',      pose: 'Index + middle + ring' },
  { count: 4, action: 'Next track',    pose: 'Index + middle + ring + pinky' },
  { count: 5, action: 'Play / Pause',  pose: 'Open hand' },
]

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { landmarks, handedness, stream, cameraError } = useMediaPipe(videoRef)
  const {
    status: calibrationStatus,
    calibration: fingerCalibration,
    step: calibrationStep,
    frameProgress,
    stepInstruction,
    verifyPassed,
    liveDetectedCount,
    liveExtendedMask,
    poseMatch,
    expectedCount,
    startCalibration,
    resetCalibration,
    ingestFrame,
  } = useCalibration()
  const [showGuide, setShowGuide] = useState(false)

  const gesturesEnabled = calibrationStatus === 'ready'

  const {
    fingerCount,
    extendedMask,
    phase,
    confirmProgress,
    pendingGesture,
    gesture,
    gestureId,
    rejectReason,
  } = useGestures(landmarks, handedness, fingerCalibration, gesturesEnabled)

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
  const debugMode = useMemo(
    () => new URLSearchParams(window.location.search).get('debug') === '1',
    [],
  )

  useEffect(() => {
    if (!debugMode || !landmarks) return
    const norm = normalizeLandmarks(landmarks)
    console.debug('[Gestura debug] finger scores', fingerScores(landmarks))
    console.debug('[Gestura debug] rawPalmWidth', rawPalmWidth(landmarks).toFixed(4))
    console.debug(
      '[Gestura debug] palmFacingScore',
      palmFacingScore(norm, handedness).toFixed(4),
      'handedness',
      handedness,
    )
  }, [landmarks, handedness, debugMode])

  useEffect(() => {
    if (calibrationStatus === 'calibrating') {
      ingestFrame(landmarks)
    }
  }, [landmarks, calibrationStatus, ingestFrame])

  useEffect(() => {
    if (calibrationStatus === 'ready' && shouldShowGestureGuide()) {
      setShowGuide(true)
    }
  }, [calibrationStatus])

  useEffect(() => {
    if (!gesturesEnabled || !gesture || gestureId === 0) return
    if (gestureId === lastGestureId.current) return
    lastGestureId.current = gestureId
    handleGesture(gesture)
  }, [gesture, gestureId, handleGesture, gesturesEnabled])

  const showWizard =
    calibrationStatus === 'needed' || calibrationStatus === 'calibrating'

  const previewMask = useMemo(() => {
    if (calibrationStatus === 'calibrating') return liveExtendedMask
    if (!landmarks) return extendedMask
    if (gesturesEnabled) return extendedMask
    return getExtendedFingerMask(
      normalizeLandmarks(landmarks),
      fingerCalibration ?? DEFAULT_CALIBRATION,
    )
  }, [
    landmarks,
    extendedMask,
    gesturesEnabled,
    fingerCalibration,
    calibrationStatus,
    liveExtendedMask,
  ])

  return (
    <div className="gestura-bg min-h-full">
      {/* Persistent, always-mounted source video that MediaPipe reads frames from. */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />

      {/* ── Global error banner ─────────────────────────────────────────── */}
      {cameraError && (
        <div
          className="flex items-start gap-3 border-b border-[#FCA5A5] bg-[#FFF1F1] px-6 py-4 text-[#B91C1C]"
          role="alert"
        >
          <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-base font-medium">
            Camera unavailable: {cameraError}. Allow camera access and refresh the page.
          </p>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="border-b border-[#E4E0DA] bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-[#1A2230]">Gestura</h1>
        <p className="mt-0.5 text-base text-[#52606D]">
          Control your music with simple hand gestures
        </p>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_380px]">

        {/* Left column — music player */}
        <main>
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
        </main>

        {/* Right column — "Your hand" panel */}
        <aside aria-label="Hand gesture controls">
          <div className="rounded-2xl border border-[#E4E0DA] bg-white shadow-sm">
            <div className="border-b border-[#E4E0DA] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#1A2230]">Your hand</h2>
              <p className="mt-0.5 text-sm text-[#52606D]">
                {gesturesEnabled
                  ? 'Show your hand to control music'
                  : 'Calibrate to enable gesture control'}
              </p>
            </div>

            {/* Gesture status HUD */}
            {gesturesEnabled && (
              <div className="border-b border-[#E4E0DA] px-5 py-4">
                <GestureHud
                  fingerCount={fingerCount}
                  phase={phase}
                  confirmProgress={confirmProgress}
                  pendingGesture={pendingGesture}
                  gesturesEnabled={gesturesEnabled}
                  rejectReason={rejectReason}
                />
              </div>
            )}

            {/* Camera preview */}
            {!showWizard && (
              <div className="border-b border-[#E4E0DA]">
                <GestureCamera
                  stream={stream}
                  landmarks={landmarks}
                  extendedMask={extendedMask}
                  onRecalibrate={gesturesEnabled ? resetCalibration : undefined}
                />
              </div>
            )}

            {/* Always-visible finger legend */}
            <div className="px-5 py-4">
              <p className="mb-3 text-sm font-semibold text-[#1A2230]">Gesture map</p>
              <ul className="space-y-2">
                {FINGER_LEGEND.map(({ count, action, pose }) => (
                  <li key={count} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-sm font-bold text-[#1D4ED8]">
                      {count}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[#1A2230]">{action}</span>
                      <span className="block text-xs text-[#52606D]">{pose}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Guide / help button */}
              {!showWizard && (
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="mt-4 w-full rounded-xl border border-[#BFDBFE] bg-[#DBEAFE] px-4 py-2.5 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#BFDBFE]"
                >
                  View full gesture guide
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Overlays ────────────────────────────────────────────────────── */}
      {showWizard && (
        <CalibrationWizard
          step={calibrationStep}
          instruction={stepInstruction}
          frameProgress={frameProgress}
          verifyPassed={verifyPassed}
          hasHand={!!landmarks}
          liveDetectedCount={liveDetectedCount}
          expectedCount={expectedCount}
          poseMatch={poseMatch}
          stream={stream}
          landmarks={landmarks}
          extendedMask={previewMask}
          onStart={startCalibration}
        />
      )}

      {showGuide && !showWizard && (
        <GestureGuide onDismiss={() => setShowGuide(false)} />
      )}

      <GestureBadge gesture={gesture} gestureId={gestureId} />
    </div>
  )
}

export default App
