# Gestura

Gestura is a browser-based music player controlled entirely by hand gestures. It uses your webcam and [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) to detect hand landmarks in real time, classifies gestures with pure geometry (no ML training), and maps them to playback actions.

Built for **BananaBots** as assistive technology for motor-impaired users who cannot comfortably use a keyboard or mouse but still want independent music control.

## Features

- Play, pause, skip tracks, and adjust volume with hand gestures
- Runs 100% in the browser — no backend, API keys, or accounts
- Small webcam HUD with optional landmark overlay
- On-screen gesture feedback with accessible live announcements
- Keyboard-free music UI with ARIA labels on controls

## Gesture controls

| Gesture | Action |
|--------|--------|
| Open palm | Play / Pause |
| Point right (on screen) | Next track |
| Point left (on screen) | Previous track |
| Thumbs up | Volume up |
| Thumbs down | Volume down |

**Tips for skip gestures:** extend only your index finger, point horizontally toward the left or right edge of the screen, and hold steady for about half a second.

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
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/`) and allow camera access when prompted.

### Production build

```bash
npm run build
npm run preview
```

## Project structure

```
src/
├── App.tsx                 # Wires hooks and components
├── components/
│   ├── MusicPlayer.tsx     # Album art, controls, progress, volume
│   ├── GestureCamera.tsx   # Webcam HUD + landmark overlay
│   └── GestureBadge.tsx    # Gesture toast notifications
├── hooks/
│   ├── useMediaPipe.ts     # Webcam + hand landmark detection
│   ├── useGestures.ts      # Landmark → gesture classification
│   └── usePlayer.ts        # Audio playback state
├── data/tracks.ts          # Hardcoded royalty-free track list
└── types/mediapipe.d.ts    # Global types for MediaPipe CDN scripts
```

MediaPipe scripts are loaded in `index.html` from jsDelivr before the React bundle.

## Tracks

Demo tracks use royalty-free audio from [SoundHelix](https://www.soundhelix.com/) and album art from [Unsplash](https://unsplash.com/). Edit `src/data/tracks.ts` to change the playlist.

## Accessibility

- All player buttons include `aria-label`s
- Progress bar uses `role="progressbar"` with `aria-valuenow`
- Gesture badge uses `aria-live="polite"` for screen reader announcements

## License

This project is for educational and assistive-technology demonstration purposes. Verify licensing for any audio or images you add beyond the included demo assets.
