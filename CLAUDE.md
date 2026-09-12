# CLAUDE.md — Agent Contract

This file governs how Claude Code operates in this repo. Read it in full before
touching any code. It is copied verbatim from the vibe-scaffold template —
project-specific detail lives in `docs/PRD.md`, `docs/ARCHITECTURE.md`, and
`docs/DECISIONS.md`, not here.

## Project identity

- **Name:** Coloring Book
- **One-liner:** Turn any photo into a tap-to-fill coloring page, entirely client-side, for a 3-year-old on iPad/iPhone.
- **Stack:** React + Vite, deployed on Vercel (default — override in ARCHITECTURE.md if this project differs)
- **Integration branch:** `main` (default — set to `dev` for three-tier projects, see Git workflow)
- **PRD:** `docs/PRD.md`
- **Architecture / decisions:** `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`

Everything below that says "the integration branch" means whatever that line says.
Set it once at project start; the rest of this contract follows from it.

## How to start a session

1. Read `docs/PRD.md` and `docs/ARCHITECTURE.md` in full.
2. Read `docs/DECISIONS.md` for anything already settled — don't re-litigate it.
3. Restate the plan for the current feature/phase in 3-5 bullets before writing code.
   **Wait for a go-ahead on this restatement before building.** This is the one
   mandatory check-in — everything after it runs autonomously until the next
   trigger below.

## Autonomy contract

**Do without asking:**
- Implement anything explicitly scoped in `docs/PRD.md`
- Install/remove npm dependencies that stay within the stack already declared in ARCHITECTURE.md
- Create commits and push to the current feature branch
- Open a PR from a feature branch into the integration branch
- Write/update tests for code you write
- Update `docs/DECISIONS.md` when you make a judgment call worth remembering

**Stop and ask first:**
- Merging any PR
- Opening or merging a release PR (`dev` → `main`) in a three-tier project — that
  ships to production, so it's a human call on human timing
- Anything that touches production data or a live deploy
- Adding a paid API, service, or anything with a cost attached — surface the cost before doing anything, no exceptions
- Any change that expands scope beyond what's in `docs/PRD.md`
- Deleting data, dropping a table/collection, or force-pushing
- Introducing a new major dependency/framework not already in ARCHITECTURE.md

## Check-in cadence

Beyond the mandatory plan check-in above, check in when:
- A PRD feature/milestone is complete and ready for review
- You've attempted the same blocker two different ways and neither worked
- Something in the PRD is ambiguous enough that two reasonable interpretations
  would produce different code
- You're about to open a PR to the integration branch
- Enough has accumulated on `dev` that a release to `main` looks due (three-tier
  projects) — say what's stacked up and let a human decide whether to ship

Otherwise, keep working. Don't check in just to narrate progress — a working
diff and a clear commit message says more than a status update.

## Git workflow

### Branch model — pick one at project start

**Two-tier (default).** Integration branch is `main`. Features cut from `main` and
merge back into it. Every merge ships. Right when the project is young, solo, or
low-stakes enough that "merged" and "live" can mean the same thing.

**Three-tier.** Integration branch is `dev`. Features cut from `dev` and merge into
`dev`; `dev` promotes to `main` in a separate release PR, less often. Right when
production has real users, when you want several features to land and settle before
any of them ship, or when "merged" and "live" need to be different events.

Set the **Integration branch** line under Project identity to match. The rules below
are the same either way.

### The rules

- `main` is production. Vercel auto-deploys `main` to prod and gives every
  branch/PR a preview URL — no extra config needed, just keep the repo connected.
- One branch per unit of work, cut from latest integration branch:
  `feature/<slug>`, `fix/<slug>`, or `docs/<slug>`.
- One **worktree** per feature, created with `scripts/new-feature.sh <slug>`,
  living as a sibling directory (`../<repo>-worktrees/<slug>`). This lets
  multiple features get worked in parallel without stashing.
- Squash-merge work branches into the integration branch via PR. Delete the branch
  and remove the worktree after merge (`git worktree remove`).
- Never push directly to `main`, or to `dev` where it exists. Everything lands by PR.
- **Releases (three-tier only):** `dev` → `main` is a merge commit, not a squash —
  squashing would flatten the individual features into one opaque commit and make
  `dev` and `main` diverge permanently. Opening that PR is a stop-and-ask.
- Commit messages: imperative mood, no filler ("add score validation" not
  "this commit adds some validation logic for scores"). Reference the PRD
  section a commit addresses when it's not obvious. If the project uses
  Conventional Commits, note that in ARCHITECTURE.md and follow it.

## Quality bar before calling something done

- No console errors/warnings in the browser
- Responsive at mobile + desktop widths at minimum
- Keyboard-navigable, visible focus states, obvious touch targets (44px min)
- No hardcoded secrets — use `.env.local`, confirm it's gitignored
- Frontend UI changes pass a design-taste check (`/design-taste-frontend` or
  equivalent) before calling the work done — no boilerplate-looking layouts
- Update `docs/DECISIONS.md` if you made a call the PRD didn't specify

## Voice for anything user-facing in the PR/commit trail

Direct, no filler, no "great progress!" energy. State what changed and why in
as few words as it takes.
