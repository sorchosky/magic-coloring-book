# PRD — Coloring Book

## Problem

My 3-year-old daughter loves coloring but we run out of coloring pages, and
the ones online are generic (animals, generic clip art) — not pictures of
her own life. This turns any photo (her toys, the dog, family) into a custom
coloring page she can fill in on an iPad/iPhone, instantly, with zero setup.

## Users

Just her, with me handing her the device. Bar for polish: has to survive a
toddler mashing the screen — no way to get it into a broken or confusing
state, every tap has to do something satisfying.

## Core loop

Take or choose a photo → app converts it to a black-and-white line-art
coloring page → tap a region → it fills with a bright color (tap again to
cycle to a new color) → tap through the whole page.

## Scope — this version

1. Photo input (camera or library) + client-side downscale to 1024px longest edge.
2. Cartoon stylization: the downscaled photo is sent to a Vercel serverless
   function (`api/stylize.js`), which calls OpenAI's `gpt-image-1` image-edit
   endpoint to redraw it as a flat-color cartoon. Falls back to the raw photo
   if this fails for any reason (no fail state).
3. Line-art conversion: grayscale → noise smoothing → edge detection (DoG,
   compared against adaptive threshold) → morphological closing → speckle
   removal → boolean line mask. Runs on the cartoon image, not the raw photo.
4. Region precomputation: connected-component labeling of non-line pixels,
   average cartoon-image color per region boosted to a bright crayon color,
   small regions merged into their largest neighbor.
5. Tap-to-fill coloring: O(1) region lookup per tap, cycle color on repeat
   taps, fill animation + sound on every tap.
6. Undo (single tap, reverts last fill), Start Over (1.5s long-press to
   avoid accidental resets), Save to Photos (composite + PNG download,
   opens iOS share sheet).
7. Toddler-proof UX: icon-only controls, 88px+ touch targets in bottom
   corners, no modals/menus/text/fail states, locked viewport (no
   pinch-zoom, double-tap zoom, text selection, pull-to-refresh).

Build order: Phase 1 (photo → line art, no coloring) → Phase 2 (regions +
tap-to-fill + auto color) → Phase 3 (undo/start-over/save/sound/animation/polish).

## Explicitly out of scope

- Accounts, saved galleries, sharing beyond the OS share sheet.
- Any drawing/freehand tool — tap-to-fill only.
- Any settings, difficulty levels, or customization UI.
- Any AI step beyond the one cartoon-stylization call per photo (no
  multi-turn editing, no style picker, no retry-with-different-prompt UI).

## Success criteria

- Phase 1: line art from real photos of people, pets, and toys has closed
  outlines (no leaks) and readable detail without being noise-cluttered from
  skin/fur texture.
- Phase 2: tapping any enclosed region fills only that region, instantly,
  with no flood-fill leakage across the whole image.
- Phase 3: a 3-year-old can complete the loop (photo → fully colored page →
  save) without adult help beyond taking the initial photo.

## Constraints

- Budget for any paid API/service: OpenAI `gpt-image-1` for cartoon
  stylization, ~$0.02-0.07/photo (low quality tier), approved 2026-09-12
  after cost was surfaced — see DECISIONS.md. Nothing else paid.
- Devices/browsers that matter: iPad and iPhone Safari (primary), desktop
  Chrome useful for development only.
- Anything that must NOT change: none — greenfield project.
- Requires `OPENAI_API_KEY` set in Vercel project env vars for production
  and a local `.env.local` for dev (see `.env.local.example`) — never
  committed.

## Open questions

None outstanding — DoG vs. adaptive threshold, sound approach (Web Audio
synth, no bundled assets), and target devices were resolved before Phase 1
started (see DECISIONS.md).
