# Architecture — Coloring Book

## Stack

- **Framework:** React + Vite (default, no deviation)
- **Deploy:** Vercel, connected to `main`, static build + one serverless function (`api/stylize.js`)
- **Styling:** plain CSS / inline styles — app is small enough not to need a system
- **State management:** useState/useReducer, no external state library
- **External APIs:** OpenAI `gpt-image-1` (image-edit endpoint), called server-side only
  from `api/stylize.js` — cartoonizes the photo before line-art extraction. Cost:
  ~$0.02-0.07/image (low quality tier). Requires `OPENAI_API_KEY` set as a Vercel
  env var (and in a local `.env.local`, gitignored — see `.env.local.example`).
  See DECISIONS.md for why this superseded the original 100%-client-side design.
- **Data/persistence:** none — no localStorage, no database. Nothing survives a Start Over.
  The photo and its stylized version pass through the serverless function in-memory
  per-request and are not stored anywhere.

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
- Photo is stylized to a flat-color cartoon via OpenAI `gpt-image-1` (server-side,
  `api/stylize.js`) before our own line-art pipeline runs on it. If the stylize
  call fails for any reason, the app falls back to running line-art extraction
  on the raw photo rather than blocking — see DECISIONS.md. — 2026-09-12
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
- The app now requires a network round-trip (photo → `/api/stylize` → OpenAI
  → back) between capture and seeing the line art. It is no longer usable
  fully offline; the fallback path (raw photo → line art directly) only
  covers the stylize call failing, not the rest of the app working offline.
- `OPENAI_API_KEY` must be set in Vercel's project env vars for production
  and in a local `.env.local` for `vercel dev`; without it `api/stylize.js`
  returns a 500 and the client falls back to the un-stylized photo.
- Cost scales with usage — trivial at toddler-app volume (~$0.02-0.07 per
  photo), but not $0. Revisit if usage patterns change.

## Folder structure

```
api/
  stylize.js               # Vercel serverless function: photo -> OpenAI gpt-image-1 -> cartoon PNG
src/
  main.jsx
  App.jsx
  screens/
    StartScreen.jsx       # Phase 1: photo input + cartoon stylization
    LineArtScreen.jsx     # Phase 1: line art display + DoG/adaptive debug toggle
  lib/
    imageLoad.js           # file -> downscaled ImageData
    stylize.js              # client -> /api/stylize -> decoded cartoon ImageData
    lineArt.js              # grayscale -> smoothing -> edges -> morphology -> speckle removal
  styles/
    index.css
```

`lib/regions.js`, `lib/color.js`, `lib/sound.js`, and `hooks/useColoringState.js`
land in Phase 2/3 as the coloring interaction is built.
