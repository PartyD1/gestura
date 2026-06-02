import type { Gesture } from '../types/gesture'

export type FingerCount = 0 | 1 | 2 | 3 | 4 | 5

/** 1=vol down, 2=vol up, 3=prev, 4=next, 5=play/pause */
export function fingerCountToGesture(count: FingerCount): Gesture {
  switch (count) {
    case 1:
      return 'VOL_DOWN'
    case 2:
      return 'VOL_UP'
    case 3:
      return 'PREV'
    case 4:
      return 'NEXT'
    case 5:
      return 'PLAY_PAUSE'
    default:
      return null
  }
}

export function gestureLabel(gesture: NonNullable<Gesture>): string {
  switch (gesture) {
    case 'VOL_DOWN':
      return 'Volume Down'
    case 'VOL_UP':
      return 'Volume Up'
    case 'PREV':
      return 'Previous Track'
    case 'NEXT':
      return 'Next Track'
    case 'PLAY_PAUSE':
      return 'Play / Pause'
  }
}

export function fingerCountLabel(count: FingerCount): string {
  if (count === 0) return 'Show fingers to control'
  const gesture = fingerCountToGesture(count)
  if (!gesture) return `${count} finger${count === 1 ? '' : 's'}`
  return `${count} — ${gestureLabel(gesture)}`
}

export const GESTURE_BADGE_LABELS: Record<NonNullable<Gesture>, string> = {
  VOL_DOWN: '1 — Volume Down',
  VOL_UP: '2 — Volume Up',
  PREV: '3 — Previous Track',
  NEXT: '4 — Next Track',
  PLAY_PAUSE: '5 — Play / Pause',
}
