#!/usr/bin/env bash
# Scaffold a new project from the vibe-scaffold template.
# Run this FROM the vibe-scaffold repo, one directory up from where the new
# project should live, e.g.:
#   cd ~/code
#   ~/code/vibe-scaffold/scripts/init-project.sh trip-up
#
# Usage: scripts/init-project.sh <project-name>

set -euo pipefail

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "Usage: scripts/init-project.sh <project-name>"
  exit 1
fi

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="../${NAME}"

if [ -d "$TARGET_DIR" ]; then
  echo "Directory $TARGET_DIR already exists. Aborting."
  exit 1
fi

echo "Scaffolding $NAME from vibe-scaffold..."
mkdir -p "$TARGET_DIR"
cp -r "$TEMPLATE_DIR/CLAUDE.md" "$TARGET_DIR/"
cp -r "$TEMPLATE_DIR/.claude" "$TARGET_DIR/"
mkdir -p "$TARGET_DIR/docs"
cp "$TEMPLATE_DIR/docs/PRD_TEMPLATE.md" "$TARGET_DIR/docs/PRD.md"
cp "$TEMPLATE_DIR/docs/ARCHITECTURE_TEMPLATE.md" "$TARGET_DIR/docs/ARCHITECTURE.md"
cp "$TEMPLATE_DIR/docs/DECISIONS_LOG_TEMPLATE.md" "$TARGET_DIR/docs/DECISIONS.md"
cp "$TEMPLATE_DIR/vercel.json" "$TARGET_DIR/"

# Fill in the project name where the templates expect it
sed -i.bak "s/<Project Name>/${NAME}/g; s/<Project Name>/${NAME}/g" \
  "$TARGET_DIR/docs/PRD.md" "$TARGET_DIR/docs/ARCHITECTURE.md" "$TARGET_DIR/docs/DECISIONS.md"
sed -i.bak "s/<fill in>/${NAME}/" "$TARGET_DIR/CLAUDE.md"
find "$TARGET_DIR" -name "*.bak" -delete

cd "$TARGET_DIR"
npm create vite@latest . -- --template react
git init
git add -A
git commit -m "Init ${NAME} from vibe-scaffold"

echo ""
echo "$NAME scaffolded at $TARGET_DIR"
echo "Next:"
echo "  1. Talk through docs/PRD.md and fill it in (don't skip this)"
echo "  2. Fill in docs/ARCHITECTURE.md stack decisions"
echo "  3. Create a GitHub repo and push main"
echo "  4. Connect the repo in Vercel (auto-deploys main, previews branches)"
echo "  5. Run scripts/new-feature.sh <slug> to start the first feature"
