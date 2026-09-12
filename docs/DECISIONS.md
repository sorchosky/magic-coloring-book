# Decisions Log — Coloring Book

> Append-only. Claude Code adds an entry any time it makes a judgment call the
> PRD didn't specify, or you make a call together mid-build. Newest at top.
> This is what keeps a second session (or a second project) from re-deciding
> something already settled.

---

### 2026-09-12 — Ask OpenAI for finished line art, not a flat-color cartoon

**Context:** you supplied four coloring-page design references (kawaii picnic
scene, ice cream cone, party-items page, sun/bird/flower landscape). All four
are *pure black-and-white line art* — monoline strokes, white interiors, no
color anywhere — not stylized colored images.

**Decision:** the stylize prompt now asks for a finished black-and-white
coloring book page directly (monoline strokes of one even weight, pure white
interiors, fully closed shapes, minimal interior detail, plain white
background, simple dot eyes on faces) instead of a flat-color cartoon we then
re-derive lines from. Bumped `quality` from `low` to `medium` in the same
change, since wobbly/broken strokes at low quality mean unclosed contours,
and unclosed contours leak flood fill — still within the approved
~$0.02-0.07/image envelope.

Shared attributes extracted from the references and encoded in the prompt:
monoline single-weight strokes; no color/gray/shading/hatching; every shape a
closed loop; rounded chunky geometry with generous open space; only essential
interior lines; plain white background with at most a couple of simple
background shapes.

**Alternatives considered:** keeping the flat-color-cartoon step and tuning
our own extraction harder — rejected because it's strictly more lossy: asking
the model for colored output and then re-deriving lines risks our threshold
catching dark *fill* colors (a navy shirt, a black dog) as line pixels, while
asking for line art directly makes our pass a near-lossless binarization of
exactly the strokes the model intended.

**Consequence to handle in Phase 2:** with the stylized output now
black-and-white, the original downscaled photo is the only remaining source
of color for per-region crayon colors (as the PRD specifies). `StartScreen`
currently discards it after stylizing — Phase 2 needs to pass it through
alongside the line art.

**Reversible?** Yes — prompt-only change plus one quality parameter.

---

### 2026-09-12 — Darkness threshold replaces DoG as default line-extraction method

**Context:** after the cartoon stylization step landed, real-device testing
showed DoG produced hollow "tube" outlines — two thin parallel lines with a
white gap — instead of one solid mono line, on a dog photo test.

**Decision:** added a third method to `lineArt.js`, `threshold` (darkness
threshold on the smoothed grayscale image), and made it the default. DoG and
adaptive threshold are edge detectors: they find the two intensity
transitions at a stroke's boundaries, not its solid interior, so a thick
drawn cartoon outline comes out hollow. Straight darkness thresholding marks
the whole stroke as line pixels, matching what the cartoon image actually
drew. `LineArtScreen` now defaults to `dog` only when the stylize call
failed and we're working from a raw (non-cartoon) photo instead, since DoG's
real edge detection is still the right tool for un-stylized photos.

**Alternatives considered:** tuning DoG's dilate/erode radii to bridge the
gap between the two edges — rejected as fragile; the gap width depends on
the cartoon output's stroke thickness, which isn't controlled precisely by
the OpenAI prompt and will vary photo to photo.

**Reversible?** Yes — it's a third method alongside the existing two, not a
replacement of any code.

---

### 2026-09-12 — Add OpenAI cartoon stylization step (supersedes "100% client-side, no network calls")

**Context:** Phase 1 line art from raw photos looked too photorealistic —
edge detection on a real photo traces skin/fur/fabric texture and photo
lighting, not clean cartoon-style outlines. You asked for an image
generator to convert photos to a cartoon style before line-art extraction.

**Decision:** Add a Vercel serverless function (`api/stylize.js`) that calls
OpenAI's `gpt-image-1` image-edit endpoint to redraw the downscaled photo as
a flat-color cartoon; our existing DoG/adaptive pipeline then runs on that
cartoon image instead of the raw photo. This supersedes the original
"no backend, no API keys, no network calls at runtime, 100% client-side"
constraint from the initial spec — that constraint no longer holds for this
one step. If the stylize call fails (missing key, network, quota), the app
falls back to running line-art extraction on the raw photo rather than
blocking, preserving the "no fail state" toddler UX rule.

**Alternatives considered:**
- Client-side posterization/color quantization only (no API) — free and
  fully offline, but wouldn't address the deeper issue: DoG still traces
  real photo edges (wrinkles, fabric folds, background clutter), not
  cartoon-simplified shapes. Rejected as the first thing tried per your
  direction to go straight to the image-generation approach.
- Having the API generate the finished line art directly (skip our own edge
  detection) — rejected in favor of stylize-then-extract, which reuses and
  keeps testable the DoG/morphology/speckle-removal pipeline already
  validated in Phase 1, and gives more control over line closure/gap-sealing
  than trusting a generated image to have clean closed outlines already.
- Providers other than OpenAI (Gemini 2.5 Flash Image, Replicate-hosted
  models) — cheaper (Replicate) or comparable (Gemini) options exist;
  OpenAI `gpt-image-1` chosen for prompt-following reliability on a specific
  style brief and simpler single-provider billing.

**Reversible?** Yes, but not free to reverse — removing it returns to the
photorealistic line-art problem this was meant to fix. Swapping providers
only touches `api/stylize.js`.

---

### 2026-09-12 — DoG over adaptive threshold for edge detection

**Context:** spec asked for a recommendation between Difference of Gaussians
and adaptive (local-mean) thresholding for turning photos into line art.

**Decision:** DoG is the default edge detector; adaptive threshold is kept as
a second implementation behind a `method` switch in `lineArt.js` for
side-by-side comparison during Phase 1.

**Alternatives considered:** Adaptive threshold alone — rejected as primary
because it's a binarization technique built for flat-background documents;
on continuous-tone photo content (skin, fur, plush texture) it fires on
low-contrast shading gradients that aren't real edges, producing broken,
noisy lines — the exact leak-prone failure mode the spec called out as the
main risk.

**Reversible?** Yes — trivial to flip the default or drop one method once
real-photo testing settles it.

---

### 2026-09-12 — Sound via Web Audio synthesis, not bundled files

**Context:** spec requires a sound effect on every fill tap but also
requires zero network calls at runtime and no API keys/paid services.

**Decision:** Synthesize a short chime per fill using the Web Audio API
rather than bundling audio asset files.

**Alternatives considered:** Bundled `.mp3`/`.wav` assets — rejected for
Phase 1/2 since no assets were provided or specified; would need to be
sourced or generated separately with no clear benefit over synthesis for a
simple UI chime.

**Reversible?** Yes — synthesis lives in one module (`lib/sound.js`,
Phase 3); swapping to bundled assets later doesn't touch anything else.

---

### 2026-09-12 — Two-tier branch model (`main` as integration branch)

**Context:** CLAUDE.md's default asks which branch model to use. This is a
solo, personal, low-stakes project.

**Decision:** Two-tier — `main` is the integration branch, every merge
ships.

**Alternatives considered:** Three-tier (`dev` + `main`) — rejected as
unnecessary process for a project where "merged" and "live" can safely mean
the same thing.

**Reversible?** Yes, but would mean adding a `dev` branch and updating
CLAUDE.md's Integration branch line later if the project ever needs staged
releases.

---

### 2026-09-12 — Processing resolution decoupled from display resolution

**Context:** region map + line mask memory footprint at 1024px needed to
stay bounded across iPhone/iPad screen densities.

**Decision:** All pixel-processing arrays (line mask, region map, fill
lookups) are sized to the downscaled photo (≤1024px longest edge) — not to
the device's physical pixel count. The two display canvases are scaled up
via CSS; tap coordinates are mapped back down to processing space via a
scale factor.

**Alternatives considered:** Sizing canvases to `devicePixelRatio`-scaled
dimensions for crisper rendering — rejected; line art doesn't need retina
sharpness once it's already a binary mask, and DPR scaling could balloon
memory 3-4x on high-density screens for no visible benefit.

**Reversible?** Yes, but would require re-deriving memory budgets if changed.
