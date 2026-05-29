import { useEffect, useMemo, useRef, useState } from 'react'
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
    <div className="gestura-bg relative min-h-full">
      {/* Persistent, always-mounted source video that MediaPipe reads frames
          from. Keeping a single stable element here prevents the webcam stream
          from being orphaned when preview components mount/unmount. */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />

      <header className="absolute left-0 right-0 top-0 z-10 px-6 py-5">
        <h1 className="text-lg font-bold tracking-wide text-white">
          Gestura
        </h1>
        <p className="text-sm text-zinc-500">
          {gesturesEnabled
            ? 'Hold fingers 1–5 to control music'
            : 'Complete calibration to enable gestures'}
        </p>
      </header>

      {cameraError && (
        <div
          className="absolute left-1/2 top-20 z-50 max-w-md -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          Camera error: {cameraError}. Allow camera access and refresh.
        </div>
      )}

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

      {!showWizard && !showGuide && (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="fixed bottom-6 left-6 z-40 rounded-full border border-violet-400/40 bg-violet-900/70 px-4 py-2 text-xs font-semibold text-violet-100 shadow-lg backdrop-blur-md transition hover:bg-violet-800/80"
          aria-label="Open gesture guide"
        >
          Gesture Guide
        </button>
      )}

      <GestureHud
        fingerCount={fingerCount}
        phase={phase}
        confirmProgress={confirmProgress}
        pendingGesture={pendingGesture}
        gesturesEnabled={gesturesEnabled}
        rejectReason={rejectReason}
      />

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

      {!showWizard && (
        <GestureCamera
          stream={stream}
          landmarks={landmarks}
          extendedMask={extendedMask}
          onRecalibrate={gesturesEnabled ? resetCalibration : undefined}
        />
      )}
    </div>
  )
}

export default App
