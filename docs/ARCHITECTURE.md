# Architecture — Coloring Book

## Stack

- **Framework:** React + Vite (default, no deviation)
- **Deploy:** Vercel, connected to `main`, static build only (no serverless functions)
- **Styling:** plain CSS / inline styles — app is small enough not to need a system
- **State management:** useState/useReducer, no external state library
- **External APIs:** none — all image processing is client-side JS on Canvas ImageData
- **Data/persistence:** none — no localStorage, no backend. Nothing survives a Start Over.

## Data model

No persisted entities. In-memory only, per session:

- `photoImageData: ImageData` — downscaled source photo (longest edge 1024px)
- `lineMask: Uint8Array` — one byte per pixel, 1 = line, 0 = background
- `regionMap: Int32Array` — one int per pixel, region ID (-1 = line pixel)
- `regionColors: Map<number, {r,g,b}>` — crayon color per region ID
- `fillState: Map<number, {r,g,b}>` — current fill color per filled region, mutated on tap
- `undoStack: Array<{ regionId, previousColor }>` — last-fill-wins undo

## Key architectural decisions made up front

- Processing resolution (≤1024px longest edge) is decoupled from display
  resolution — canvases render at the fixed processing size and are scaled
  up via CSS for display, independent of devicePixelRatio. Keeps memory
  bounded (~10MB worst case) regardless of screen density. — 2026-09-12
- DoG chosen over adaptive threshold as the default edge detector (see
  DECISIONS.md) but both are implemented behind a `method` switch in
  `lineArt.js` for ongoing comparison. — 2026-09-12
- Sound effects are synthesized via Web Audio API, not bundled audio files —
  keeps the app 100% offline/asset-free per the no-network-calls constraint. — 2026-09-12
- Two-tier git workflow (`main` as integration branch) — solo, low-stakes
  project where merged == shippable. — 2026-09-12

## Known constraints / things to watch

- Region map + line mask + source ImageData together stay under ~10MB at
  1024px; if this ever grows (higher MAX_DIMENSION), re-check memory on
  older iPhones.
- Median filter + Gaussian blurs in `lineArt.js` are synchronous and block
  the main thread for the duration of conversion (~300-500ms observed at
  600x800 in testing; expect roughly double at 1024px). Deferred one frame
  via `requestAnimationFrame` so a loading state can paint first. If this
  becomes noticeably janky on-device, move to a Web Worker.
- iOS Safari specifics to keep validating: `capture="environment"` behavior,
  `createImageBitmap` EXIF orientation handling, viewport lock (no
  pinch-zoom/pull-to-refresh), and the PNG download → share sheet flow.

## Folder structure

```
src/
  main.jsx
  App.jsx
  screens/
    StartScreen.jsx       # Phase 1: photo input
    LineArtScreen.jsx     # Phase 1: line art display + DoG/adaptive debug toggle
  lib/
    imageLoad.js           # file -> downscaled ImageData
    lineArt.js              # grayscale -> smoothing -> edges -> morphology -> speckle removal
  styles/
    index.css
```

`lib/regions.js`, `lib/color.js`, `lib/sound.js`, and `hooks/useColoringState.js`
land in Phase 2/3 as the coloring interaction is built.
