#!/bin/sh
# Run pr-reviewer headless on one prepared workspace, offline. GitHub and web tools are
# denied at the permission layer, so the reviewer cannot read the real review.
# usage: run-case.sh <case-dir> <workspace>     → <workspace>/run.json
set -eu
case_dir=$1; W=$2
val() { sed -n "s/^$1: *//p" "$case_dir/case.yaml" | sed 's/ *#.*//'; }
prompt="repo: $(val repo)
pr: $(val pr)
head: $(val cut_sha)
mode: full
since_sha: none
reviewed_at: none
overlaps: none
repo_config: {}
workspace: $W
post: false"
cd "$W"
claude -p --agent pr-reviewer --output-format json \
  --add-dir "$HOME/.claude/pr-review" \
  --permission-mode acceptEdits \
  --allowedTools Read Write Edit Grep Glob Agent "Bash(git:*)" "Bash(ls:*)" "Bash(cat:*)" \
    "Bash(sed:*)" "Bash(grep:*)" "Bash(find:*)" "Bash(wc:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(mkdir:*)" \
  --disallowedTools "Bash(gh:*)" "Bash(curl:*)" "Bash(wget:*)" "Bash(git fetch:*)" "Bash(git pull:*)" \
    "Bash(git remote:*)" "Bash(git clone:*)" WebFetch WebSearch \
  "$prompt" > "$W/run.json"
echo "done $W"
