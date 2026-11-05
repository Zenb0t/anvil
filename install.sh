#!/bin/sh
# Install agents and their assets into ~/.claude. Re-run after edits.
# Never touches ~/.claude/pr-review/config.yaml, ~/.claude/tidy/config.yaml or ~/.claude/tidy/ledger.yaml.
set -eu
root=$(cd "$(dirname "$0")" && pwd)
dest="${CLAUDE_HOME:-$HOME/.claude}"

mkdir -p "$dest/agents" "$dest/pr-review/dimensions" \
  "$dest/tidy/tidyings" "$dest/tidy/languages"
cp "$root"/agents/*.md "$dest/agents/"

cp "$root"/pr-review/dimensions/*.md "$dest/pr-review/dimensions/"
cp "$root/pr-review/config.example.yaml" "$dest/pr-review/"

cp "$root"/tidy/tidyings/*.md "$dest/tidy/tidyings/"
cp "$root"/tidy/languages/*.md "$dest/tidy/languages/"
cp "$root/tidy/rubric.md" "$root/tidy/report.md" "$root/tidy/config.example.yaml" "$dest/tidy/"

echo "installed to $dest"
[ -f "$dest/pr-review/config.yaml" ] || echo "no pr-review config yet: run pr-orchestrator once to set up"
[ -f "$dest/tidy/config.yaml" ] || echo "no tidy config yet: run tidy-orchestrator once to set up"
