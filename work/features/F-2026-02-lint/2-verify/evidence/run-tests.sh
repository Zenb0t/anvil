#!/bin/sh
# ETR acceptance test runner for F-2026-02-lint (anvil lint)
# All tests should be RED before Build phase.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
ANVIL="$REPO_ROOT/bin/anvil"
FEATURES_DIR="$REPO_ROOT/work/features"

pass=0
fail=0
total=0

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

assert_exit_code() {
  total=$((total + 1))
  label="$1"; expected_code="$2"; shift 2
  set +e
  "$@" >/dev/null 2>/dev/null
  actual_code=$?
  set -e
  if [ "$actual_code" -eq "$expected_code" ]; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label (expected exit $expected_code, got $actual_code)"
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

assert_line_count() {
  total=$((total + 1))
  label="$1"; expected="$2"; actual="$3"
  if [ -z "$actual" ]; then
    count=0
  else
    count="$(echo "$actual" | wc -l | tr -d ' ')"
  fi
  if [ "$count" -eq "$expected" ]; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label (expected $expected lines, got $count)"
    fail=$((fail + 1))
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

# --- Setup: create temp test fixtures ---
TMPDIR_TEST=""

setup_fixture() {
  TMPDIR_TEST="$(mktemp -d "$FEATURES_DIR/_test_lint_XXXXXX")"
}

teardown_fixture() {
  [ -d "$TMPDIR_TEST" ] && rm -rf "$TMPDIR_TEST"
}

# Create a minimal valid feature with all phases and PENDING gates
create_valid_feature() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
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

# Create a feature missing state.yaml
create_no_state_feature() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  mkdir -p "$fdir/0-define"
}

# Create a feature with a specific gate issue
create_feature_bad_status() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Set 0-define gate to invalid status
  sed -i 's/Status: PENDING/Status: BANANA/' "$fdir/0-define/gate.md"
}

create_feature_pass_no_rationale() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Set 0-define to PASS with empty rationale
  sed -i 's/Status: PENDING/Status: PASS/' "$fdir/0-define/gate.md"
  sed -i 's/- \[ \]/- [x]/' "$fdir/0-define/gate.md"
}

create_feature_bad_checkbox() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Add a malformed checkbox
  sed -i 's/- \[ \] Placeholder/- [X] Placeholder\n- [√] Bad checkbox/' "$fdir/0-define/gate.md"
}

create_feature_no_frontmatter() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Remove frontmatter from 0-define gate
  cat > "$fdir/0-define/gate.md" <<'GATEOF'
# Gate: Define (no frontmatter)

- [ ] Placeholder

Status: PENDING
Rationale:
GATEOF
}

create_feature_missing_phase_dir() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Remove 3-build directory entirely
  rm -rf "$fdir/3-build"
}

create_feature_verify_pass_no_falsification() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Set 2-verify gate to PASS with rationale but no falsification
  cat > "$fdir/2-verify/gate.md" <<'GATEOF'
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
}

create_feature_needs_broken() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Set needs to a non-existent file
  sed -i 's|needs: \[\]|needs: [../0-define/nonexistent.md]|' "$fdir/1-spec/gate.md"
}

create_feature_produces_pass_missing() {
  fid="$1"
  fdir="$FEATURES_DIR/$fid"
  create_valid_feature "$fid"
  # Set 0-define to PASS with produces referencing a missing file
  cat > "$fdir/0-define/gate.md" <<'GATEOF'
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
  # Do NOT create brief.md — so produces path is missing
}

# ============================================================
echo "=== BR-1: anvil lint <id> validates a single feature ==="
output="$(bash "$ANVIL" lint F-2026-02-lint 2>&1 || true)"
# Should not be rejected as unknown command
assert_not_contains "BR-1: lint is a recognized command" "Usage:" "$output"

# ============================================================
echo ""
echo "=== BR-2: anvil lint (no args) validates all features ==="
output="$(bash "$ANVIL" lint 2>&1 || true)"
assert_not_contains "BR-2: lint with no args is accepted" "Usage:" "$output"

# ============================================================
echo ""
echo "=== BR-3: exit code 0 if no issues, 1 if issues ==="
# Create a clean valid feature
fid="_test_lint_clean_$$"
create_valid_feature "$fid"
assert_exit_code "BR-3a: clean feature exits 0" 0 bash "$ANVIL" lint "$fid"
rm -rf "$FEATURES_DIR/$fid"

# Create a feature with a bad status => should have issues => exit 1
fid="_test_lint_bad_$$"
create_feature_bad_status "$fid"
assert_exit_code "BR-3b: feature with issues exits 1" 1 bash "$ANVIL" lint "$fid"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-4: output format is '<feature-id> <phase> <rule-id> <message>' ==="
fid="_test_lint_fmt_$$"
create_feature_bad_status "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
if [ -n "$output" ]; then
  # Every line should have at least 4 space-separated tokens
  bad_lines="$(echo "$output" | awk 'NF < 4 { print }' || true)"
  assert_eq "BR-4a: all issue lines have >=4 tokens" "" "$bad_lines"
  # First token should be the feature ID
  first_token="$(echo "$output" | head -1 | awk '{print $1}')"
  assert_eq "BR-4b: first token is feature id" "$fid" "$first_token"
  # Third token should match rule-id pattern
  assert_match "BR-4c: third token is a rule-id" "(GATE|TMPL|XREF)-[A-Z]+" "$output"
else
  echo "  FAIL: BR-4: no output from lint on bad feature"
  fail=$((fail + 1))
  total=$((total + 1))
fi
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-5: no output when all checks pass (silent clean run) ==="
fid="_test_lint_silent_$$"
create_valid_feature "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_eq "BR-5: clean feature produces no stdout" "" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-6: warnings for unreadable features go to stderr ==="
fid="_test_lint_nostate_$$"
create_no_state_feature "$fid"
stderr_out="$(bash "$ANVIL" lint 2>&1 1>/dev/null || true)"
stdout_out="$(bash "$ANVIL" lint 2>/dev/null || true)"
assert_contains "BR-6a: warning on stderr" "warning" "$stderr_out"
assert_not_contains "BR-6b: no warning on stdout" "warning" "$stdout_out"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-7: GATE-STATUS — invalid status line is flagged ==="
fid="_test_lint_gs_$$"
create_feature_bad_status "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-7: GATE-STATUS issue reported" "GATE-STATUS" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-8: GATE-RATIONALE — PASS with empty rationale is flagged ==="
fid="_test_lint_gr_$$"
create_feature_pass_no_rationale "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-8: GATE-RATIONALE issue reported" "GATE-RATIONALE" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-9: GATE-CHECKLIST — malformed checkbox flagged ==="
fid="_test_lint_gc_$$"
create_feature_bad_checkbox "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-9: GATE-CHECKLIST issue reported" "GATE-CHECKLIST" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-10: GATE-FRONTMATTER — missing frontmatter flagged ==="
fid="_test_lint_gf_$$"
create_feature_no_frontmatter "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-10: GATE-FRONTMATTER issue reported" "GATE-FRONTMATTER" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-11: GATE-FALSIFICATION — verify/ship PASS without Tried/Observed ==="
fid="_test_lint_gfals_$$"
create_feature_verify_pass_no_falsification "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-11: GATE-FALSIFICATION issue reported" "GATE-FALSIFICATION" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-12: TMPL-PHASE — missing phase dir or gate.md flagged ==="
fid="_test_lint_tp_$$"
create_feature_missing_phase_dir "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-12: TMPL-PHASE issue reported" "TMPL-PHASE" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-13: TMPL-STATE — missing state.yaml flagged ==="
# Create feature with state.yaml, then remove it for lint of that specific ID
fid="_test_lint_ts_$$"
create_valid_feature "$fid"
rm "$FEATURES_DIR/$fid/state.yaml"
# When linting a specific ID with no state.yaml, it should either warn/error
output="$(bash "$ANVIL" lint "$fid" 2>&1 || true)"
assert_match "BR-13: TMPL-STATE or error for missing state.yaml" "(TMPL-STATE|warning|ERROR)" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-14: XREF-NEEDS — unresolvable needs path flagged ==="
fid="_test_lint_xn_$$"
create_feature_needs_broken "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-14: XREF-NEEDS issue reported" "XREF-NEEDS" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-15: XREF-PRODUCES — produces missing when PASS, flagged ==="
fid="_test_lint_xp_$$"
create_feature_produces_pass_missing "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
assert_contains "BR-15: XREF-PRODUCES issue reported" "XREF-PRODUCES" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== BR-16: lint does NOT validate checklist-vs-status, staleness, dirty, anchors ==="
# A PENDING gate with unchecked items should NOT produce issues from lint
# (that's anvil check's job)
fid="_test_lint_nocheck_$$"
create_valid_feature "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
# Should have zero issues — PENDING gates with unchecked items are fine for lint
assert_eq "BR-16: lint ignores check-domain concerns" "" "$output"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== IT-1: anvil lint must NOT write to any file ==="
fid="_test_lint_ro_$$"
create_valid_feature "$fid"
before_state="$(cat "$FEATURES_DIR/$fid/state.yaml")"
# Snapshot all file mtimes
before_times="$(find "$FEATURES_DIR/$fid" -type f -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR/$fid" -type f -exec stat -f '%m %N' {} + 2>/dev/null || true)"
bash "$ANVIL" lint "$fid" >/dev/null 2>&1 || true
after_state="$(cat "$FEATURES_DIR/$fid/state.yaml")"
after_times="$(find "$FEATURES_DIR/$fid" -type f -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR/$fid" -type f -exec stat -f '%m %N' {} + 2>/dev/null || true)"
assert_eq "IT-1a: state.yaml unchanged" "$before_state" "$after_state"
assert_eq "IT-1b: no file mtimes changed" "$before_times" "$after_times"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== IT-2: anvil lint must NOT call update_state ==="
# If update_state were called, state.yaml would change. We already checked IT-1.
# Additionally verify that a feature with issues still doesn't modify state.
fid="_test_lint_rous_$$"
create_feature_bad_status "$fid"
before="$(cat "$FEATURES_DIR/$fid/state.yaml")"
bash "$ANVIL" lint "$fid" >/dev/null 2>&1 || true
after="$(cat "$FEATURES_DIR/$fid/state.yaml")"
assert_eq "IT-2: state.yaml not modified even with lint issues" "$before" "$after"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== INV-1: output line count equals total number of issues ==="
fid="_test_lint_inv1_$$"
create_feature_bad_status "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
if [ -n "$output" ]; then
  line_count="$(echo "$output" | wc -l | tr -d ' ')"
  # Each line should be one issue — no blank lines, no headers
  blank_lines="$(echo "$output" | grep -c '^$' || true)"
  assert_eq "INV-1: no blank lines in output (every line is an issue)" "0" "$blank_lines"
else
  echo "  FAIL: INV-1: expected issues but got no output"
  fail=$((fail + 1))
  total=$((total + 1))
fi
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== INV-2: exit 0 iff stdout line count is 0 ==="
# Clean feature: exit 0, no stdout
fid="_test_lint_inv2a_$$"
create_valid_feature "$fid"
set +e
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null)"
code=$?
set -e
assert_eq "INV-2a: clean feature exit 0" "0" "$code"
assert_eq "INV-2a: clean feature no stdout" "" "$output"
rm -rf "$FEATURES_DIR/$fid"

# Broken feature: exit 1, has stdout
fid="_test_lint_inv2b_$$"
create_feature_bad_status "$fid"
set +e
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null)"
code=$?
set -e
assert_eq "INV-2b: broken feature exit 1" "1" "$code"
# Should have at least one line of output
if [ -n "$output" ]; then
  echo "  PASS: INV-2b: broken feature has stdout"
  pass=$((pass + 1))
else
  echo "  FAIL: INV-2b: broken feature should have stdout"
  fail=$((fail + 1))
fi
total=$((total + 1))
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== INV-3: no stdout for warnings/errors — warnings go to stderr ==="
fid="_test_lint_inv3_$$"
create_no_state_feature "$fid"
stdout_out="$(bash "$ANVIL" lint 2>/dev/null || true)"
# The warning about no state.yaml should NOT appear on stdout
assert_not_contains "INV-3: no warning text on stdout" "$fid" "$stdout_out"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== INV-4: freshly scaffolded feature produces zero lint issues ==="
fid="_test_lint_inv4_$$"
# Scaffold with anvil init
bash "$ANVIL" init "$fid" >/dev/null 2>&1 || true
if [ -d "$FEATURES_DIR/$fid" ]; then
  set +e
  output="$(bash "$ANVIL" lint "$fid" 2>/dev/null)"
  code=$?
  set -e
  assert_eq "INV-4a: scaffolded feature has no lint issues (exit 0)" "0" "$code"
  assert_eq "INV-4b: scaffolded feature produces no stdout" "" "$output"
  rm -rf "$FEATURES_DIR/$fid"
else
  echo "  FAIL: INV-4: could not scaffold test feature"
  fail=$((fail + 1))
  total=$((total + 1))
fi

# ============================================================
echo ""
echo "=== INV-5: every issue line has >=4 tokens, third matches (GATE|TMPL|XREF)-[A-Z]+ ==="
fid="_test_lint_inv5_$$"
create_feature_bad_status "$fid"
output="$(bash "$ANVIL" lint "$fid" 2>/dev/null || true)"
if [ -n "$output" ]; then
  # Check all lines have >=4 tokens
  bad_token_lines="$(echo "$output" | awk 'NF < 4' || true)"
  assert_eq "INV-5a: all lines have >=4 tokens" "" "$bad_token_lines"
  # Check third token matches pattern
  bad_rule_lines="$(echo "$output" | awk '{if ($3 !~ /^(GATE|TMPL|XREF)-[A-Z]+$/) print}' || true)"
  assert_eq "INV-5b: all rule-ids match pattern" "" "$bad_rule_lines"
else
  echo "  FAIL: INV-5: expected output from bad feature"
  fail=$((fail + 1))
  total=$((total + 1))
fi
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== ERR-1: feature dir with no state.yaml -> skip, warn on stderr ==="
fid="_test_lint_err1_$$"
create_no_state_feature "$fid"
stderr_out="$(bash "$ANVIL" lint 2>&1 1>/dev/null || true)"
assert_contains "ERR-1: stderr warns about missing state.yaml" "$fid" "$stderr_out"
rm -rf "$FEATURES_DIR/$fid"

# ============================================================
echo ""
echo "=== ERR-2: feature ID given but dir does not exist -> error on stderr, exit 1 ==="
set +e
output="$(bash "$ANVIL" lint _nonexistent_feature_$$ 2>&1)"
code=$?
set -e
assert_eq "ERR-2a: exit 1 for missing feature" "1" "$code"
stderr_out="$(bash "$ANVIL" lint _nonexistent_feature_$$ 2>&1 1>/dev/null || true)"
assert_match "ERR-2b: error message on stderr" "(ERROR|error|not found)" "$stderr_out"

# ============================================================
echo ""
echo "=== ERR-3: FEATURES_DIR does not exist -> exit 0, no output ==="
# Temporarily set features dir to a nonexistent path by testing lint behavior
# We can test this by checking current behavior: if FEATURES_DIR is missing, exit 0
# Since we can't easily override env in the script, we test that the command
# handles an empty features dir gracefully
set +e
output="$(FEATURES_DIR=/tmp/_anvil_nonexistent_$$ bash "$ANVIL" lint 2>/dev/null)"
code=$?
set -e
assert_eq "ERR-3a: exit 0 when features dir missing" "0" "$code"
assert_eq "ERR-3b: no output when features dir missing" "" "$output"

# ============================================================
echo ""
echo "=== HS-1: directory traversal prevention ==="
set +e
output="$(bash "$ANVIL" lint "../../etc/passwd" 2>&1)"
code=$?
set -e
# Should reject the path, not process it
assert_not_contains "HS-1: no processing of traversal paths" "GATE-" "$output"

# ============================================================
# Final cleanup: remove any stale test fixtures
for d in "$FEATURES_DIR"/_test_lint_*; do
  [ -d "$d" ] && rm -rf "$d"
done

echo ""
echo "========================================="
echo "Results: $pass passed, $fail failed, $total total"
[ "$fail" -eq 0 ] && exit 0 || exit 1
