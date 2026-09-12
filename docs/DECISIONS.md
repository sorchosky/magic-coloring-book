# Decisions Log — Coloring Book

> Append-only. Claude Code adds an entry any time it makes a judgment call the
> PRD didn't specify, or you make a call together mid-build. Newest at top.
> This is what keeps a second session (or a second project) from re-deciding
> something already settled.

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
