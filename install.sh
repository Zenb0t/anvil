#!/bin/sh
# Install agents and pr-review assets into ~/.claude. Re-run after edits.
# Never touches ~/.claude/pr-review/config.yaml.
set -eu
root=$(cd "$(dirname "$0")" && pwd)
dest="${CLAUDE_HOME:-$HOME/.claude}"

mkdir -p "$dest/agents" "$dest/pr-review/dimensions"
cp "$root"/agents/*.md "$dest/agents/"
cp "$root"/pr-review/dimensions/*.md "$dest/pr-review/dimensions/"
cp "$root/pr-review/config.example.yaml" "$dest/pr-review/"

echo "installed to $dest"
[ -f "$dest/pr-review/config.yaml" ] || echo "no config yet: run pr-orchestrator once to set up"
