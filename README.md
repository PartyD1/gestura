# Gestura

Gestura is a browser-based music player controlled entirely by hand gestures. It uses your webcam and [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) to detect hand landmarks in real time, counts how many fingers you hold up, and maps that to playback actions.

Built for **BananaBots** as assistive technology for motor-impaired users who cannot comfortably use a keyboard or mouse but still want independent music control.

## Features

- Finger-count gestures (1–5) with hold-to-confirm feedback
- Per-user hand calibration stored in the browser
- Live gesture HUD with progress ring before each action fires
- Runs 100% in the browser — no backend, API keys, or accounts
- Webcam HUD with per-finger extended/folded overlay
- Accessible live announcements and ARIA labels on controls

## Gesture controls

After calibration, hold up fingers and keep steady until the violet ring completes:

| Fingers | Action |
|--------|--------|
| 1 | Volume down |
| 2 | Volume up |
| 3 | Previous track |
| 4 | Next track |
| 5 (open hand) | Play / pause |

Release or change finger count before repeating the same action.

## Calibration (required)

On first visit:

1. Allow camera access
2. Hold a **fist** for the baseline sample
3. Hold **1, 2, 3, 4, then 5** fingers as prompted
4. Verify by showing **1, 3, and 5** fingers once each

Calibration is saved in `localStorage`. Use **Recalibrate gestures** in the camera panel if lighting or distance changes.

## Tech stack

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS
- MediaPipe Hands (CDN — not npm, to avoid Vite/WASM issues)
- HTML5 `<audio>` for playback
- [lucide-react](https://lucide.dev) for icons

## Getting started

### Prerequisites

- Node.js 20+
- A webcam
- A modern browser (Chrome recommended)

### Install and run

```bash
cd app
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/`) and complete calibration when prompted.

### Production build

```bash
cd app
npm run build
npm run preview
```

### Debug mode

Add `?debug=1` to the URL to log finger extension scores in the browser console.

## Project structure

```
app/
├── public/
│   └── assets/
│       └── hand-sprites/       # Finger-count guide images
├── src/
│   ├── App.tsx
│   ├── lib/
│   │   ├── handGeometry.ts     # Normalized finger extension + counting
│   │   ├── gestureMap.ts       # Finger count → player action
│   │   └── calibration.ts      # Threshold types + localStorage
│   ├── hooks/
│   │   ├── useMediaPipe.ts     # Mirrored input, smoothed landmarks
│   │   ├── useGestures.ts      # Stability, hold-to-confirm, firing
│   │   ├── useCalibration.ts   # Calibration wizard logic
│   │   └── usePlayer.ts        # Audio playback
│   └── components/
│       ├── GestureHud.tsx      # Large count + confirm ring
│       ├── CalibrationWizard.tsx
│       ├── HandSprite.tsx
│       ├── GestureGuide.tsx
│       ├── GestureCamera.tsx
│       ├── GestureBadge.tsx
│       └── MusicPlayer.tsx
└── package.json
docs/
└── plan.txt
```

## Accessibility

- Gesture badge and HUD use `aria-live="polite"`
- Player buttons include `aria-label`s
- Progress bar uses `role="progressbar"` with `aria-valuenow`

## License

This project is for educational and assistive-technology demonstration purposes. Verify licensing for any audio or images you add beyond the included demo assets.
