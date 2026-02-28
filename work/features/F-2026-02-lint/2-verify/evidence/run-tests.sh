#!/bin/sh
# ETR acceptance test runner for F-2026-02-lint (anvil lint)
# Optimized: batched fixtures + sourced functions (no fork per test).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
ANVIL="$REPO_ROOT/bin/anvil"
FEATURES_DIR="$REPO_ROOT/work/features"
export FEATURES_DIR

pass=0
fail=0
total=0

# Source anvil functions once (cmd_lint uses return, not exit)
ANVIL_SOURCED=1 . "$ANVIL"

# run_lint <args...> — calls cmd_lint directly, captures stdout, stderr, exit code
# Sets: _stdout, _stderr, _exit
run_lint() {
  _stderr_file="$(mktemp)"
  set +e
  _stdout="$(cmd_lint "$@" 2>"$_stderr_file")"
  _exit=$?
  set -e
  _stderr="$(cat "$_stderr_file")"
  rm -f "$_stderr_file"
}

# --- Assertion helpers ---
assert_eq() {
  total=$((total + 1))
  label="$1"; expected="$2"; actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    echo "    expected: $(echo "$expected" | head -3)"
    echo "    actual:   $(echo "$actual" | head -3)"
    fail=$((fail + 1))
  fi
}

assert_contains() {
  total=$((total + 1))
  label="$1"; pattern="$2"; actual="$3"
  if echo "$actual" | grep -q "$pattern"; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    echo "    pattern '$pattern' not found in output"
    fail=$((fail + 1))
  fi
}

assert_not_contains() {
  total=$((total + 1))
  label="$1"; pattern="$2"; actual="$3"
  if echo "$actual" | grep -q "$pattern"; then
    echo "  FAIL: $label"
    echo "    pattern '$pattern' should not appear in output"
    fail=$((fail + 1))
  else
    echo "  PASS: $label"
    pass=$((pass + 1))
  fi
}

assert_match() {
  total=$((total + 1))
  label="$1"; regex="$2"; actual="$3"
  if echo "$actual" | grep -qE "$regex"; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    echo "    regex '$regex' did not match output"
    echo "    output: $(echo "$actual" | head -3)"
    fail=$((fail + 1))
  fi
}

# ============================================================
# BATCHED FIXTURE SETUP — create ALL test fixtures once
# ============================================================
PFX="_tl$$"  # short unique prefix for this run

# Helper: create a minimal valid feature with all phases and PENDING gates
create_valid_feature() {
  fid="$1"; fdir="$FEATURES_DIR/$fid"
  mkdir -p "$fdir"
  for phase in 0-define 1-spec 2-verify 3-build 4-ship; do
    mkdir -p "$fdir/$phase"
    cat > "$fdir/$phase/gate.md" <<GATEOF
---
phase: $phase
needs: []
produces: []
---
# Gate: $(echo "$phase" | cut -d- -f2)

- [ ] Placeholder checklist item

Status: PENDING
Rationale:

Falsification:
- Tried: -> Observed:
GATEOF
  done
  cat > "$fdir/state.yaml" <<STATEEOF
feature: $fid
phase: 0-define
gates:
  0-define: { status: pending }
  1-spec: { status: pending }
  2-verify: { status: pending }
  3-build: { status: pending }
  4-ship: { status: pending }
STATEEOF
}

echo "--- Setting up fixtures ---"

# FIX_clean: valid feature (no lint issues)
create_valid_feature "${PFX}_clean"

# FIX_badstat: feature with invalid status
create_valid_feature "${PFX}_badstat"
sed -i 's/Status: PENDING/Status: BANANA/' "$FEATURES_DIR/${PFX}_badstat/0-define/gate.md"

# FIX_passnorat: PASS with empty rationale
create_valid_feature "${PFX}_passnorat"
sed -i 's/Status: PENDING/Status: PASS/' "$FEATURES_DIR/${PFX}_passnorat/0-define/gate.md"
sed -i 's/- \[ \]/- [x]/' "$FEATURES_DIR/${PFX}_passnorat/0-define/gate.md"

# FIX_badcb: malformed checkbox
create_valid_feature "${PFX}_badcb"
sed -i 's/- \[ \] Placeholder/- [X] Placeholder\n- [√] Bad checkbox/' "$FEATURES_DIR/${PFX}_badcb/0-define/gate.md"

# FIX_nofm: missing frontmatter
create_valid_feature "${PFX}_nofm"
cat > "$FEATURES_DIR/${PFX}_nofm/0-define/gate.md" <<'GATEOF'
# Gate: Define (no frontmatter)

- [ ] Placeholder

Status: PENDING
Rationale:
GATEOF

# FIX_missphase: missing phase dir (3-build removed)
create_valid_feature "${PFX}_missphase"
rm -rf "$FEATURES_DIR/${PFX}_missphase/3-build"

# FIX_verifynofals: verify PASS without Tried/Observed
create_valid_feature "${PFX}_verifynofals"
cat > "$FEATURES_DIR/${PFX}_verifynofals/2-verify/gate.md" <<'GATEOF'
---
phase: 2-verify
needs: []
produces: []
---
# Gate: Verify

- [x] Item done

Status: PASS
Rationale:
Tests in `evidence/` are all RED (0 of 5 passing)

GATEOF

# FIX_badneeds: unresolvable needs path
create_valid_feature "${PFX}_badneeds"
sed -i 's|needs: \[\]|needs: [../0-define/nonexistent.md]|' "$FEATURES_DIR/${PFX}_badneeds/1-spec/gate.md"

# FIX_badprod: produces path missing when PASS
create_valid_feature "${PFX}_badprod"
cat > "$FEATURES_DIR/${PFX}_badprod/0-define/gate.md" <<'GATEOF'
---
phase: 0-define
needs: []
produces: [brief.md]
---
# Gate: Define

- [x] Done

Status: PASS
Rationale:
See `brief.md` for the feature brief.

Falsification:
- Tried: checked brief.md exists -> Observed: file present
GATEOF

# FIX_nostate: directory without state.yaml (for warning/skip tests)
mkdir -p "$FEATURES_DIR/${PFX}_nostate/0-define"

# FIX_nostate2: specific-ID lint on missing state.yaml
create_valid_feature "${PFX}_nostate2"
rm "$FEATURES_DIR/${PFX}_nostate2/state.yaml"

echo "--- Fixtures ready ---"
echo ""

# ============================================================
echo "=== BR-1: anvil lint <id> validates a single feature ==="
run_lint "${PFX}_clean"
assert_not_contains "BR-1: lint is a recognized command" "Usage:" "$_stdout$_stderr"

# ============================================================
echo ""
echo "=== BR-2: anvil lint (no args) validates all features ==="
run_lint
assert_not_contains "BR-2: lint with no args is accepted" "Usage:" "$_stdout$_stderr"

# ============================================================
echo ""
echo "=== BR-3: exit code 0 if no issues, 1 if issues ==="
run_lint "${PFX}_clean"
assert_eq "BR-3a: clean feature exits 0" "0" "$_exit"

run_lint "${PFX}_badstat"
assert_eq "BR-3b: feature with issues exits 1" "1" "$_exit"

# ============================================================
echo ""
echo "=== BR-4: output format is '<feature-id> <phase> <rule-id> <message>' ==="
run_lint "${PFX}_badstat"
if [ -n "$_stdout" ]; then
  bad_lines="$(echo "$_stdout" | awk 'NF < 4 { print }' || true)"
  assert_eq "BR-4a: all issue lines have >=4 tokens" "" "$bad_lines"
  first_token="$(echo "$_stdout" | head -1 | awk '{print $1}')"
  assert_eq "BR-4b: first token is feature id" "${PFX}_badstat" "$first_token"
  assert_match "BR-4c: third token is a rule-id" "(GATE|TMPL|XREF)-[A-Z]+" "$_stdout"
else
  echo "  FAIL: BR-4: no output from lint on bad feature"
  fail=$((fail + 1))
  total=$((total + 1))
fi

# ============================================================
echo ""
echo "=== BR-5: no output when all checks pass (silent clean run) ==="
run_lint "${PFX}_clean"
assert_eq "BR-5: clean feature produces no stdout" "" "$_stdout"

# ============================================================
echo ""
echo "=== BR-6: warnings for unreadable features go to stderr ==="
run_lint
assert_contains "BR-6a: warning on stderr" "warning" "$_stderr"
assert_not_contains "BR-6b: no warning on stdout" "warning" "$_stdout"

# ============================================================
echo ""
echo "=== BR-7: GATE-STATUS — invalid status line is flagged ==="
run_lint "${PFX}_badstat"
assert_contains "BR-7: GATE-STATUS issue reported" "GATE-STATUS" "$_stdout"

# ============================================================
echo ""
echo "=== BR-8: GATE-RATIONALE — PASS with empty rationale is flagged ==="
run_lint "${PFX}_passnorat"
assert_contains "BR-8: GATE-RATIONALE issue reported" "GATE-RATIONALE" "$_stdout"

# ============================================================
echo ""
echo "=== BR-9: GATE-CHECKLIST — malformed checkbox flagged ==="
run_lint "${PFX}_badcb"
assert_contains "BR-9: GATE-CHECKLIST issue reported" "GATE-CHECKLIST" "$_stdout"

# ============================================================
echo ""
echo "=== BR-10: GATE-FRONTMATTER — missing frontmatter flagged ==="
run_lint "${PFX}_nofm"
assert_contains "BR-10: GATE-FRONTMATTER issue reported" "GATE-FRONTMATTER" "$_stdout"

# ============================================================
echo ""
echo "=== BR-11: GATE-FALSIFICATION — verify/ship PASS without Tried/Observed ==="
run_lint "${PFX}_verifynofals"
assert_contains "BR-11: GATE-FALSIFICATION issue reported" "GATE-FALSIFICATION" "$_stdout"

# ============================================================
echo ""
echo "=== BR-12: TMPL-PHASE — missing phase dir or gate.md flagged ==="
run_lint "${PFX}_missphase"
assert_contains "BR-12: TMPL-PHASE issue reported" "TMPL-PHASE" "$_stdout"

# ============================================================
echo ""
echo "=== BR-13: TMPL-STATE — missing state.yaml flagged ==="
run_lint "${PFX}_nostate2"
assert_match "BR-13: TMPL-STATE or error for missing state.yaml" "(TMPL-STATE|warning|ERROR)" "$_stdout$_stderr"

# ============================================================
echo ""
echo "=== BR-14: XREF-NEEDS — unresolvable needs path flagged ==="
run_lint "${PFX}_badneeds"
assert_contains "BR-14: XREF-NEEDS issue reported" "XREF-NEEDS" "$_stdout"

# ============================================================
echo ""
echo "=== BR-15: XREF-PRODUCES — produces missing when PASS, flagged ==="
run_lint "${PFX}_badprod"
assert_contains "BR-15: XREF-PRODUCES issue reported" "XREF-PRODUCES" "$_stdout"

# ============================================================
echo ""
echo "=== BR-16: lint does NOT validate checklist-vs-status, staleness, dirty, anchors ==="
run_lint "${PFX}_clean"
assert_eq "BR-16: lint ignores check-domain concerns" "" "$_stdout"

# ============================================================
echo ""
echo "=== IT-1: anvil lint must NOT write to any file ==="
before_state="$(cat "$FEATURES_DIR/${PFX}_clean/state.yaml")"
before_times="$(find "$FEATURES_DIR/${PFX}_clean" -type f -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR/${PFX}_clean" -type f -exec stat -f '%m %N' {} + 2>/dev/null || true)"
run_lint "${PFX}_clean"
after_state="$(cat "$FEATURES_DIR/${PFX}_clean/state.yaml")"
after_times="$(find "$FEATURES_DIR/${PFX}_clean" -type f -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR/${PFX}_clean" -type f -exec stat -f '%m %N' {} + 2>/dev/null || true)"
assert_eq "IT-1a: state.yaml unchanged" "$before_state" "$after_state"
assert_eq "IT-1b: no file mtimes changed" "$before_times" "$after_times"

# ============================================================
echo ""
echo "=== IT-2: anvil lint must NOT call update_state ==="
before="$(cat "$FEATURES_DIR/${PFX}_badstat/state.yaml")"
run_lint "${PFX}_badstat"
after="$(cat "$FEATURES_DIR/${PFX}_badstat/state.yaml")"
assert_eq "IT-2: state.yaml not modified even with lint issues" "$before" "$after"

# ============================================================
echo ""
echo "=== INV-1: output line count equals total number of issues ==="
run_lint "${PFX}_badstat"
if [ -n "$_stdout" ]; then
  blank_lines="$(echo "$_stdout" | grep -c '^$' || true)"
  assert_eq "INV-1: no blank lines in output (every line is an issue)" "0" "$blank_lines"
else
  echo "  FAIL: INV-1: expected issues but got no output"
  fail=$((fail + 1))
  total=$((total + 1))
fi

# ============================================================
echo ""
echo "=== INV-2: exit 0 iff stdout line count is 0 ==="
run_lint "${PFX}_clean"
assert_eq "INV-2a: clean feature exit 0" "0" "$_exit"
assert_eq "INV-2a: clean feature no stdout" "" "$_stdout"

run_lint "${PFX}_badstat"
assert_eq "INV-2b: broken feature exit 1" "1" "$_exit"
total=$((total + 1))
if [ -n "$_stdout" ]; then
  echo "  PASS: INV-2b: broken feature has stdout"
  pass=$((pass + 1))
else
  echo "  FAIL: INV-2b: broken feature should have stdout"
  fail=$((fail + 1))
fi

# ============================================================
echo ""
echo "=== INV-3: no stdout for warnings/errors — warnings go to stderr ==="
run_lint
assert_not_contains "INV-3: no warning text on stdout" "${PFX}_nostate" "$_stdout"

# ============================================================
echo ""
echo "=== INV-4: freshly scaffolded feature produces zero lint issues ==="
fid="${PFX}_scaff"
bash "$ANVIL" init "$fid" >/dev/null 2>&1 || true
if [ -d "$FEATURES_DIR/$fid" ]; then
  run_lint "$fid"
  assert_eq "INV-4a: scaffolded feature has no lint issues (exit 0)" "0" "$_exit"
  assert_eq "INV-4b: scaffolded feature produces no stdout" "" "$_stdout"
else
  echo "  FAIL: INV-4: could not scaffold test feature"
  fail=$((fail + 1))
  total=$((total + 1))
fi

# ============================================================
echo ""
echo "=== INV-5: every issue line has >=4 tokens, third matches (GATE|TMPL|XREF)-[A-Z]+ ==="
run_lint "${PFX}_badstat"
if [ -n "$_stdout" ]; then
  bad_token_lines="$(echo "$_stdout" | awk 'NF < 4' || true)"
  assert_eq "INV-5a: all lines have >=4 tokens" "" "$bad_token_lines"
  bad_rule_lines="$(echo "$_stdout" | awk '{if ($3 !~ /^(GATE|TMPL|XREF)-[A-Z]+$/) print}' || true)"
  assert_eq "INV-5b: all rule-ids match pattern" "" "$bad_rule_lines"
else
  echo "  FAIL: INV-5: expected output from bad feature"
  fail=$((fail + 1))
  total=$((total + 1))
fi

# ============================================================
echo ""
echo "=== ERR-1: feature dir with no state.yaml -> skip, warn on stderr ==="
run_lint
assert_contains "ERR-1: stderr warns about missing state.yaml" "${PFX}_nostate" "$_stderr"

# ============================================================
echo ""
echo "=== ERR-2: feature ID given but dir does not exist -> error on stderr, exit 1 ==="
run_lint "_nonexistent_feature_$$"
assert_eq "ERR-2a: exit 1 for missing feature" "1" "$_exit"
assert_match "ERR-2b: error message on stderr" "(ERROR|error|not found)" "$_stderr"

# ============================================================
echo ""
echo "=== ERR-3: FEATURES_DIR does not exist -> exit 0, no output ==="
_saved_fd="$FEATURES_DIR"
FEATURES_DIR="/tmp/_anvil_nonexistent_$$"
run_lint
FEATURES_DIR="$_saved_fd"
assert_eq "ERR-3a: exit 0 when features dir missing" "0" "$_exit"
assert_eq "ERR-3b: no output when features dir missing" "" "$_stdout"

# ============================================================
echo ""
echo "=== HS-1: directory traversal prevention ==="
run_lint "../../etc/passwd"
assert_not_contains "HS-1: no processing of traversal paths" "GATE-" "$_stdout"

# ============================================================
# BATCHED FIXTURE CLEANUP
# ============================================================
echo ""
echo "--- Cleaning up fixtures ---"
for d in "$FEATURES_DIR"/${PFX}_*; do
  [ -d "$d" ] && rm -rf "$d"
done

echo ""
echo "========================================="
echo "Results: $pass passed, $fail failed, $total total"
[ "$fail" -eq 0 ] && exit 0 || exit 1
