#!/bin/sh
# Build an isolated pr-reviewer workspace for one eval case, cut at the reviewed commit.
# usage: prepare.sh <case-dir> <workspace>
# The workspace holds nothing from after the cut: src/ is a fresh repo with history
# only up to cut_sha and no remote; the pack has no threads, reviews or later comments.
set -eu
case_dir=$1; W=$2
val() { sed -n "s/^$1: *//p" "$case_dir/case.yaml" | sed 's/ *#.*//'; }
clone=$(val clone); cut=$(val cut_sha); base=$(val base_sha)
[ -n "$cut" ] && [ -n "$base" ] && [ -d "$clone/.git" ] || { echo "bad case: $case_dir" >&2; exit 1; }

rm -rf "$W"; mkdir -p "$W"
git -C "$clone" branch -f pr-review-eval-cut "$cut" >/dev/null
git init -q "$W/src"
git -C "$W/src" fetch -q "$clone" pr-review-eval-cut
git -C "$W/src" checkout -q --detach FETCH_HEAD
rm -f "$W/src/.git/FETCH_HEAD"
git -C "$clone" branch -D pr-review-eval-cut >/dev/null

git -C "$clone" diff "$base" "$cut" > "$W/diff.patch"

standards=$(cd "$W/src" && find . -path ./.git -prune -o -path '*/node_modules' -prune -o -type f \
  \( -name CLAUDE.md -o -name AGENTS.md -o -name CONTRIBUTING.md -o -name CODING_STANDARDS.md \
     -o -name '.eslintrc*' -o -name 'eslint.config.*' -o -name 'biome.json' -o -name '.prettierrc*' \) -print | sort)

{
  echo "# Context pack (eval cut @ $(echo "$cut" | cut -c1-7))"
  echo; echo "## Intent"; echo "Title: $(cat "$case_dir/title.txt")"; echo
  cat "$case_dir/body.md"; echo
  echo "Commits:"; git -C "$W/src" log --oneline "$base..HEAD"
  echo; echo "## Ticket"; echo "none found"
  echo; echo "## Threads"; echo "none"
  echo; echo "## Conversation"; echo "none"
  echo; echo "## Prior review"; echo "none"
  echo; echo "## Overlaps"; echo "none"
  echo; echo "## Standards sources"; echo "$standards" | sed 's|^\./|src/|; s|^|- |'
} > "$W/pack.md"

echo "$W ($(grep -c '^diff --git' "$W/diff.patch") files)"
