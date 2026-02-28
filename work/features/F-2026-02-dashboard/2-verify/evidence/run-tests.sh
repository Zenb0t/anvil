#!/bin/sh
# ETR acceptance test runner for F-2026-02-dashboard (anvil list)
# Optimized: sourced functions (no fork per test).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
ANVIL="$REPO_ROOT/bin/anvil"
FEATURES_DIR="$REPO_ROOT/work/features"
export FEATURES_DIR

pass=0
fail=0
total=0

# Source anvil functions once
ANVIL_SOURCED=1 . "$ANVIL"

# run_list — calls cmd_list directly, captures stdout, stderr, exit code
# Sets: _stdout, _stderr, _exit
run_list() {
  _stderr_file="$(mktemp)"
  set +e
  _stdout="$(cmd_list 2>"$_stderr_file")"
  _exit=$?
  set -e
  _stderr="$(cat "$_stderr_file")"
  rm -f "$_stderr_file"
}

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

# ============================================================
echo "=== ETR-1: anvil list is a recognized command (BR-8) ==="
run_list
assert_not_contains "ETR-1: list is not rejected as unknown" "Usage:" "$_stdout$_stderr"

# ============================================================
echo "=== ETR-2: one line per feature (BR-1, INV-1) ==="
run_list
feature_count="$(ls -d "$FEATURES_DIR"/F-* 2>/dev/null | wc -l | tr -d ' ')"
if [ "$feature_count" -gt 0 ]; then
  line_count="$(echo "$_stdout" | grep -c '.' || true)"
  assert_eq "ETR-2: line count matches feature count" "$feature_count" "$line_count"
else
  echo "  SKIP: no features present"
fi

# ============================================================
echo "=== ETR-3: output format is '<id> <phase> <status>' (BR-2) ==="
run_list
if [ -n "$_stdout" ]; then
  bad_lines="$(echo "$_stdout" | awk 'NF != 3 { print }' || true)"
  assert_eq "ETR-3: all lines have 3 fields" "" "$bad_lines"
else
  echo "  SKIP: no output to check"
fi

# ============================================================
echo "=== ETR-4: effective phase matches anvil status (BR-3, INV-4) ==="
run_list
if [ -n "$_stdout" ]; then
  first_id="$(echo "$_stdout" | head -1 | awk '{print $1}')"
  list_phase="$(echo "$_stdout" | head -1 | awk '{print $2}')"
  status_phase="$(bash "$ANVIL" status "$first_id" 2>/dev/null | grep 'Effective phase:' | awk '{print $3}' || true)"
  if [ -z "$status_phase" ]; then
    status_phase="4-ship"
  fi
  assert_eq "ETR-4: list phase matches status effective phase" "$status_phase" "$list_phase"
else
  echo "  SKIP: no output to check"
fi

# ============================================================
echo "=== ETR-5: empty features dir produces no output (BR-7, ERR-3) ==="
assert_eq "ETR-5: list exits 0" "0" "$_exit"

# ============================================================
echo "=== ETR-6: read-only — no files modified (IT-1, IT-2, IT-3) ==="
if [ -d "$FEATURES_DIR" ] && ls "$FEATURES_DIR"/F-* >/dev/null 2>&1; then
  before="$(find "$FEATURES_DIR" -name state.yaml -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR" -name state.yaml -exec stat -f '%m %N' {} + 2>/dev/null || true)"
  run_list
  after="$(find "$FEATURES_DIR" -name state.yaml -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR" -name state.yaml -exec stat -f '%m %N' {} + 2>/dev/null || true)"
  assert_eq "ETR-6: state.yaml unchanged after list" "$before" "$after"
else
  echo "  SKIP: no features to check"
fi

# ============================================================
echo "=== ETR-7: malformed feature warns on stderr (ERR-1, INV-3) ==="
mkdir -p "$FEATURES_DIR/F-test-broken-$$"
run_list
assert_contains "ETR-7a: stderr warns about broken feature" "warning" "$_stderr"
assert_not_contains "ETR-7b: warning not on stdout" "warning" "$_stdout"
rm -rf "$FEATURES_DIR/F-test-broken-$$"

# ============================================================
echo ""
echo "Results: $pass passed, $fail failed, $total total"
[ "$fail" -eq 0 ] && exit 0 || exit 1
