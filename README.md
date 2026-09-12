# vibe-scaffold

Reusable starting point for new vibe-code projects (Trip Up, Aviary,
child care app, water table, and whatever's next). Speak a PRD, let
Claude Code build against it in dedicated worktrees, check in at the
milestones — not on every keystroke.

## One-time setup

1. Push this repo to GitHub.
2. Mark it as a **template repository**: repo Settings → check "Template repository."
   Now every new project starts with a green "Use this template" button on
   GitHub, or you can run `scripts/init-project.sh` locally — same result,
   pick whichever fits the moment.

## Starting a new project

```bash
cd ~/code   # wherever your projects live
~/code/vibe-scaffold/scripts/init-project.sh <project-name>
```

This copies `CLAUDE.md`, `.claude/settings.json`, `vercel.json`, and the
`docs/` templates into a fresh directory, scaffolds a Vite React app, and
makes the first commit.

Then:
1. **Talk through the PRD out loud**, then fill in `docs/PRD.md`. This is the
   single highest-leverage step — a vague PRD produces a vague, over-permissive
   build. Don't let Claude fill it in for you; it should be your voice.
2. Fill in `docs/ARCHITECTURE.md` if the stack deviates from the React/Vite/Vercel
   default.
3. `git remote add origin <new-github-repo>` and push `main`.
4. Connect the repo in Vercel. `main` auto-deploys to production, every
   branch/PR gets a preview URL — nothing extra to configure.
5. Start Claude Code in the project root, let it read `CLAUDE.md` + `docs/`,
   confirm the plan, then let it run.

## Choosing a branch model

Set the **Integration branch** line in `CLAUDE.md` at project start. Everything
else in the contract follows from it.

| | Two-tier (default) | Three-tier |
|---|---|---|
| Integration branch | `main` | `dev` |
| Features merge into | `main` | `dev` |
| What ships to prod | every merge | a separate `dev` → `main` release PR |
| Use when | young, solo, low-stakes — "merged" and "live" can mean the same thing | production has real users, or you want features to land and settle before any of them ship |

Three-tier costs one extra PR per release and buys you a place for work to
accumulate without going live. Start two-tier; add `dev` when shipping every
merge starts to feel like a risk rather than a feature.

## Starting a new feature

```bash
scripts/new-feature.sh <slug> [base-branch]
```

Creates a sibling worktree (`../<project>-worktrees/<slug>`) on branch
`feature/<slug>`, cut from latest `main` — or from `[base-branch]` if given, which
is how three-tier projects cut from `dev`. Set `BASE_BRANCH=dev` in your shell to
avoid passing it every time. Prefix the slug (`fix/...`, `docs/...`) to get a
branch of that type instead of a feature branch.

Work in the worktree — including running Claude Code there — without disturbing
the integration branch or other in-flight features. Squash-merge via PR when it's
done, then `git worktree remove` to clean up.

## Files in this template

| File | Purpose |
|---|---|
| `CLAUDE.md` | The agent contract. Copied as-is into every project — this is what defines autonomy boundaries and check-in cadence. |
| `docs/PRD_TEMPLATE.md` | Becomes `docs/PRD.md` per project. What you're building and why. |
| `docs/ARCHITECTURE_TEMPLATE.md` | Becomes `docs/ARCHITECTURE.md`. Stack and data model calls. |
| `docs/DECISIONS_LOG_TEMPLATE.md` | Becomes `docs/DECISIONS.md`. Append-only log of judgment calls made mid-build. |
| `.claude/settings.json` | Claude Code permission rules — what it can do without asking vs. what requires a human in the loop. Verify against current Claude Code docs periodically; the permission schema evolves. |
| `scripts/init-project.sh` | Scaffolds a new project from this template. |
| `scripts/new-feature.sh` | Creates a worktree + branch for a new feature, cut from `main` or a base branch you pass. |
| `vercel.json` | Deploy defaults for a Vite app. |

## Evolving this template

When something learned on one project should apply to all future ones —
a CLAUDE.md rule that would've prevented a bad call, a script tweak — change
it here, not just in the live project. That's the whole point of a template:
it should get better every time you use it.
