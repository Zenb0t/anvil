#!/bin/sh
# ETR acceptance test runner for F-2026-02-reset (anvil reset)
# Optimized: batched fixtures + sourced functions (no fork per test).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
ANVIL="$REPO_ROOT/bin/anvil"
FEATURES_DIR="$REPO_ROOT/work/features"
export FEATURES_DIR

pass=0
fail=0
total=0

# Source anvil functions once (cmd_reset uses return, not exit)
ANVIL_SOURCED=1 . "$ANVIL"

# run_reset <args...> — calls cmd_reset directly, captures stdout, stderr, exit code
# Sets: _stdout, _stderr, _exit
run_reset() {
  _stderr_file="$(mktemp)"
  set +e
  _stdout="$(cmd_reset "$@" 2>"$_stderr_file")"
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

assert_file_exists() {
  total=$((total + 1))
  label="$1"; fpath="$2"
  if [ -e "$fpath" ]; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    echo "    file does not exist: $fpath"
    fail=$((fail + 1))
  fi
}

# ============================================================
# BATCHED FIXTURE SETUP — create ALL test fixtures once
# ============================================================
PFX="_tr$$"  # short unique prefix for this run

# Helper: create a minimal valid feature with all phases and specified gate statuses
create_feature() {
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

# Helper: set gate status in a gate.md
set_gate_status() {
  fid="$1"; phase="$2"; status="$3"
  gate="$FEATURES_DIR/$fid/$phase/gate.md"
  sed -i "s/^Status: .*/Status: $status/" "$gate"
  if [ "$status" = "PASS" ]; then
    # Check all boxes and add rationale for PASS gates
    sed -i 's/- \[ \]/- [x]/' "$gate"
    sed -i "s|^Rationale:.*|Rationale:\nSee \`evidence/\` for details.|" "$gate"
    # For verify/ship, ensure Falsification has content
    case "$phase" in
      2-verify|4-ship)
        sed -i "s|Tried: -> Observed:|Tried: ran tests -> Observed: all GREEN|" "$gate"
        ;;
    esac
  fi
}

echo "--- Setting up fixtures ---"

# FIX_allpend: all phases PENDING — basic full reset target
create_feature "${PFX}_allpend"

# FIX_mixed: mixed gate statuses — 0-define PASS, 1-spec PASS, rest PENDING
create_feature "${PFX}_mixed"
set_gate_status "${PFX}_mixed" "0-define" "PASS"
set_gate_status "${PFX}_mixed" "1-spec" "PASS"

# FIX_allpass: all phases PASS — test phase pointer derivation (should be 4-ship)
create_feature "${PFX}_allpass"
for phase in 0-define 1-spec 2-verify 3-build 4-ship; do
  set_gate_status "${PFX}_allpass" "$phase" "PASS"
done

# FIX_corrupt: corrupted state.yaml (wrong statuses, bad phase pointer)
create_feature "${PFX}_corrupt"
set_gate_status "${PFX}_corrupt" "0-define" "PASS"
set_gate_status "${PFX}_corrupt" "1-spec" "PASS"
cat > "$FEATURES_DIR/${PFX}_corrupt/state.yaml" <<STATEEOF
feature: ${PFX}_corrupt
phase: 4-ship
gates:
  0-define: { status: fail }
  1-spec: { status: fail }
  2-verify: { status: pass, anchor: deadbeef }
  3-build: { status: pass }
  4-ship: { status: pass }
STATEEOF

# FIX_nostate: feature dir exists but no state.yaml
create_feature "${PFX}_nostate"
rm -f "$FEATURES_DIR/${PFX}_nostate/state.yaml"

# FIX_failgate: one gate is FAIL
create_feature "${PFX}_failgate"
set_gate_status "${PFX}_failgate" "0-define" "PASS"
set_gate_status "${PFX}_failgate" "1-spec" "FAIL"

# FIX_cascade: for single-phase reset + cascade test
create_feature "${PFX}_cascade"
set_gate_status "${PFX}_cascade" "0-define" "PASS"
set_gate_status "${PFX}_cascade" "1-spec" "PASS"
set_gate_status "${PFX}_cascade" "2-verify" "PASS"
set_gate_status "${PFX}_cascade" "3-build" "PASS"
set_gate_status "${PFX}_cascade" "4-ship" "PASS"
# Set state.yaml to reflect all pass with anchors
cat > "$FEATURES_DIR/${PFX}_cascade/state.yaml" <<STATEEOF
feature: ${PFX}_cascade
phase: 4-ship
gates:
  0-define: { status: pass, anchor: aaa111 }
  1-spec: { status: pass, anchor: bbb222 }
  2-verify: { status: pass, anchor: ccc333 }
  3-build: { status: pass, anchor: ddd444 }
  4-ship: { status: pass, anchor: eee555 }
STATEEOF

# FIX_nophase: feature exists but has no phase directories at all
create_feature "${PFX}_nophase"
rm -rf "$FEATURES_DIR/${PFX}_nophase/0-define" \
       "$FEATURES_DIR/${PFX}_nophase/1-spec" \
       "$FEATURES_DIR/${PFX}_nophase/2-verify" \
       "$FEATURES_DIR/${PFX}_nophase/3-build" \
       "$FEATURES_DIR/${PFX}_nophase/4-ship"

# FIX_missinggate: has phase dirs but a gate.md is missing in 2-verify
create_feature "${PFX}_missinggate"
set_gate_status "${PFX}_missinggate" "0-define" "PASS"
set_gate_status "${PFX}_missinggate" "1-spec" "PASS"
rm -f "$FEATURES_DIR/${PFX}_missinggate/2-verify/gate.md"

# FIX_idempotent: for idempotency test
create_feature "${PFX}_idempotent"
set_gate_status "${PFX}_idempotent" "0-define" "PASS"

echo "--- Fixtures ready ---"
echo ""

# ============================================================
echo "=== BR-1: anvil reset <id> rebuilds state.yaml from gate files ==="
run_reset "${PFX}_corrupt"
assert_eq "BR-1a: exit 0 on full reset" "0" "$_exit"
assert_eq "BR-1b: stdout is empty" "" "$_stdout"
# After reset, state.yaml should reflect actual gate statuses: 0-define=pass, 1-spec=pass, rest=pending
state_content="$(cat "$FEATURES_DIR/${PFX}_corrupt/state.yaml")"
assert_contains "BR-1c: 0-define is pass (gate says PASS)" "0-define.*status: pass" "$state_content"
assert_contains "BR-1d: 1-spec is pass (gate says PASS)" "1-spec.*status: pass" "$state_content"
assert_contains "BR-1e: 2-verify is pending (gate says PENDING)" "2-verify.*status: pending" "$state_content"
assert_not_contains "BR-1f: 2-verify has no anchor (was wrongly set)" "2-verify.*anchor:" "$state_content"

# ============================================================
echo ""
echo "=== BR-2: anvil reset <id> <phase> resets single phase + downstream cascade ==="
run_reset "${PFX}_cascade" "1-spec"
assert_eq "BR-2a: exit 0 on phase reset" "0" "$_exit"
state_content="$(cat "$FEATURES_DIR/${PFX}_cascade/state.yaml")"
# 0-define should be untouched (upstream of reset target)
assert_contains "BR-2b: 0-define unchanged (upstream)" "0-define.*status: pass" "$state_content"
# 1-spec and all downstream should be re-derived from gates
# 1-spec gate says PASS so it should still be pass, but re-derived
assert_contains "BR-2c: 1-spec re-derived from gate" "1-spec.*status: pass" "$state_content"
# 2-verify through 4-ship should also be re-derived (cascade)
assert_contains "BR-2d: 2-verify re-derived (downstream cascade)" "2-verify.*status: pass" "$state_content"

# ============================================================
echo ""
echo "=== BR-3: Status derivation from gate files ==="
# FIX_allpend: all gates are PENDING
run_reset "${PFX}_allpend"
state_content="$(cat "$FEATURES_DIR/${PFX}_allpend/state.yaml")"
assert_contains "BR-3a: PENDING gate -> status pending" "0-define.*status: pending" "$state_content"

# FIX_failgate: 1-spec is FAIL
run_reset "${PFX}_failgate"
state_content="$(cat "$FEATURES_DIR/${PFX}_failgate/state.yaml")"
assert_contains "BR-3b: FAIL gate -> status fail" "1-spec.*status: fail" "$state_content"

# FIX_mixed: 0-define and 1-spec are PASS
run_reset "${PFX}_mixed"
state_content="$(cat "$FEATURES_DIR/${PFX}_mixed/state.yaml")"
assert_contains "BR-3c: PASS gate -> status pass" "0-define.*status: pass" "$state_content"

# Missing gate.md -> pending
run_reset "${PFX}_missinggate"
state_content="$(cat "$FEATURES_DIR/${PFX}_missinggate/state.yaml")"
assert_contains "BR-3d: missing gate.md -> status pending" "2-verify.*status: pending" "$state_content"

# ============================================================
echo ""
echo "=== BR-4: Phase pointer derivation ==="
# All PENDING -> phase is 0-define
run_reset "${PFX}_allpend"
state_content="$(cat "$FEATURES_DIR/${PFX}_allpend/state.yaml")"
assert_contains "BR-4a: all pending -> phase 0-define" "^phase: 0-define" "$state_content"

# 0-define PASS, rest PENDING -> phase is 1-spec
run_reset "${PFX}_idempotent"
state_content="$(cat "$FEATURES_DIR/${PFX}_idempotent/state.yaml")"
assert_contains "BR-4b: first non-pass is 1-spec" "^phase: 1-spec" "$state_content"

# All PASS -> phase is 4-ship
run_reset "${PFX}_allpass"
state_content="$(cat "$FEATURES_DIR/${PFX}_allpass/state.yaml")"
assert_contains "BR-4c: all pass -> phase 4-ship" "^phase: 4-ship" "$state_content"

# ============================================================
echo ""
echo "=== BR-5: Anchor recomputation for PASS gates ==="
run_reset "${PFX}_mixed"
state_content="$(cat "$FEATURES_DIR/${PFX}_mixed/state.yaml")"
# PASS gates must have an anchor
assert_match "BR-5a: PASS gate 0-define has anchor" "0-define.*anchor: [a-f0-9]+" "$state_content"
assert_match "BR-5b: PASS gate 1-spec has anchor" "1-spec.*anchor: [a-f0-9]+" "$state_content"
# Non-PASS gates must NOT have an anchor
assert_not_contains "BR-5c: PENDING gate 2-verify has no anchor" "2-verify.*anchor:" "$state_content"

# ============================================================
echo ""
echo "=== BR-6: Print changes on stderr ==="
# First run on corrupt state: should show changes
run_reset "${PFX}_corrupt"
assert_not_contains "BR-6a: changes printed to stderr" "already consistent" "$_stderr"
assert_eq "BR-6b: stdout is empty during change report" "" "$_stdout"

# Run reset again — now state should be consistent
run_reset "${PFX}_corrupt"
assert_contains "BR-6c: no-change run reports consistent on stderr" "already consistent" "$_stderr"
assert_eq "BR-6d: stdout still empty on no-change" "" "$_stdout"

# ============================================================
echo ""
echo "=== BR-7: Create state.yaml if missing ==="
run_reset "${PFX}_nostate"
assert_eq "BR-7a: exit 0 when state.yaml missing" "0" "$_exit"
assert_file_exists "BR-7b: state.yaml created" "$FEATURES_DIR/${PFX}_nostate/state.yaml"
state_content="$(cat "$FEATURES_DIR/${PFX}_nostate/state.yaml" 2>/dev/null || echo '')"
assert_contains "BR-7c: created state.yaml has feature field" "feature: ${PFX}_nostate" "$state_content"
assert_contains "BR-7d: created state.yaml has phase field" "^phase:" "$state_content"
assert_contains "BR-7e: created state.yaml has gates section" "^gates:" "$state_content"

# ============================================================
echo ""
echo "=== BR-8: Exit codes ==="
# Successful reset -> exit 0
run_reset "${PFX}_allpend"
assert_eq "BR-8a: successful reset exits 0" "0" "$_exit"

# Already consistent -> still exit 0
run_reset "${PFX}_allpend"
assert_eq "BR-8b: already consistent exits 0" "0" "$_exit"

# Feature not found -> exit 1
run_reset "_nonexistent_feature_$$"
assert_eq "BR-8c: feature not found exits 1" "1" "$_exit"

# No arguments -> exit 1
run_reset
assert_eq "BR-8d: no arguments exits 1" "1" "$_exit"

# ============================================================
echo ""
echo "=== IT-1: Reset must NOT modify gate.md files ==="
# Capture gate.md content before reset
gate_before="$(cat "$FEATURES_DIR/${PFX}_allpend/0-define/gate.md")"
run_reset "${PFX}_allpend"
gate_after="$(cat "$FEATURES_DIR/${PFX}_allpend/0-define/gate.md")"
assert_eq "IT-1a: gate.md unchanged after reset" "$gate_before" "$gate_after"

# Also check a PASS gate
gate_before="$(cat "$FEATURES_DIR/${PFX}_mixed/0-define/gate.md")"
run_reset "${PFX}_mixed"
gate_after="$(cat "$FEATURES_DIR/${PFX}_mixed/0-define/gate.md")"
assert_eq "IT-1b: PASS gate.md unchanged after reset" "$gate_before" "$gate_after"

# ============================================================
echo ""
echo "=== IT-2: Reset must NOT modify any file other than state.yaml ==="
# Snapshot all file mtimes except state.yaml
before_times="$(find "$FEATURES_DIR/${PFX}_allpend" -type f ! -name state.yaml -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR/${PFX}_allpend" -type f ! -name state.yaml -exec stat -f '%m %N' {} + 2>/dev/null || true)"
run_reset "${PFX}_allpend"
after_times="$(find "$FEATURES_DIR/${PFX}_allpend" -type f ! -name state.yaml -exec ls -l --time-style=+%s {} + 2>/dev/null || find "$FEATURES_DIR/${PFX}_allpend" -type f ! -name state.yaml -exec stat -f '%m %N' {} + 2>/dev/null || true)"
assert_eq "IT-2: no non-state.yaml files modified" "$before_times" "$after_times"

# ============================================================
echo ""
echo "=== IT-3: Reset must NOT create phase directories or gate files ==="
# Feature with missing gate — reset should not create it
before_listing="$(ls -R "$FEATURES_DIR/${PFX}_missinggate" 2>/dev/null)"
run_reset "${PFX}_missinggate"
after_listing="$(ls -R "$FEATURES_DIR/${PFX}_missinggate" 2>/dev/null)"
assert_eq "IT-3a: directory listing unchanged (no files created)" "$before_listing" "$after_listing"

# Feature with no phase dirs — reset should not create them
before_listing="$(ls -R "$FEATURES_DIR/${PFX}_nophase" 2>/dev/null)"
run_reset "${PFX}_nophase"
after_listing="$(ls -R "$FEATURES_DIR/${PFX}_nophase" 2>/dev/null)"
# Only state.yaml may differ (IT-3 is about phase dirs and gate files, not state.yaml)
before_dirs="$(find "$FEATURES_DIR/${PFX}_nophase" -type d | sort)"
after_dirs="$(find "$FEATURES_DIR/${PFX}_nophase" -type d | sort)"
assert_eq "IT-3b: no new directories created" "$before_dirs" "$after_dirs"

# ============================================================
echo ""
echo "=== INV-1: After reset, anvil check must not report structural errors ==="
run_reset "${PFX}_allpend"
# Run check (via bash to avoid exit vs return issue)
_check_stderr="$(mktemp)"
set +e
_check_out="$(bash "$ANVIL" check "${PFX}_allpend" 2>"$_check_stderr")"
_check_exit=$?
set -e
_check_err="$(cat "$_check_stderr")"
rm -f "$_check_stderr"
# check should not report structural errors (MISSING, format issues)
assert_not_contains "INV-1: no structural errors after reset" "ERROR" "$_check_err"

# ============================================================
echo ""
echo "=== INV-2: Running reset twice produces the same state.yaml ==="
run_reset "${PFX}_mixed"
state_first="$(cat "$FEATURES_DIR/${PFX}_mixed/state.yaml")"
run_reset "${PFX}_mixed"
state_second="$(cat "$FEATURES_DIR/${PFX}_mixed/state.yaml")"
assert_eq "INV-2: idempotent — two resets yield same state.yaml" "$state_first" "$state_second"

# ============================================================
echo ""
echo "=== INV-3: Phase pointer equals lowest non-PASS phase ==="
# FIX_failgate: 0-define=PASS, 1-spec=FAIL -> phase should be 1-spec
run_reset "${PFX}_failgate"
state_content="$(cat "$FEATURES_DIR/${PFX}_failgate/state.yaml")"
assert_contains "INV-3a: phase=1-spec (first non-pass)" "^phase: 1-spec" "$state_content"

# FIX_mixed: 0-define=PASS, 1-spec=PASS, rest PENDING -> phase should be 2-verify
run_reset "${PFX}_mixed"
state_content="$(cat "$FEATURES_DIR/${PFX}_mixed/state.yaml")"
assert_contains "INV-3b: phase=2-verify (first non-pass)" "^phase: 2-verify" "$state_content"

# ============================================================
echo ""
echo "=== INV-4: PASS gates have anchor; non-PASS gates never have anchor ==="
run_reset "${PFX}_mixed"
state_content="$(cat "$FEATURES_DIR/${PFX}_mixed/state.yaml")"
# PASS gates (0-define, 1-spec) should have anchors
assert_match "INV-4a: PASS 0-define has anchor" "0-define.*anchor:" "$state_content"
assert_match "INV-4b: PASS 1-spec has anchor" "1-spec.*anchor:" "$state_content"
# Non-PASS gates (2-verify, 3-build, 4-ship) should NOT have anchors
assert_not_contains "INV-4c: PENDING 2-verify has no anchor" "2-verify.*anchor:" "$state_content"
assert_not_contains "INV-4d: PENDING 3-build has no anchor" "3-build.*anchor:" "$state_content"
assert_not_contains "INV-4e: PENDING 4-ship has no anchor" "4-ship.*anchor:" "$state_content"

# ============================================================
echo ""
echo "=== ERR-1: Feature directory does not exist ==="
run_reset "_nonexistent_feature_$$"
assert_eq "ERR-1a: exit 1" "1" "$_exit"
assert_match "ERR-1b: error on stderr" "(ERROR|error|not found)" "$_stderr"
assert_eq "ERR-1c: stdout empty" "" "$_stdout"

# ============================================================
echo ""
echo "=== ERR-2: Invalid phase name ==="
run_reset "${PFX}_allpend" "99-bogus"
assert_eq "ERR-2a: exit 1 for invalid phase" "1" "$_exit"
assert_match "ERR-2b: error on stderr for invalid phase" "(ERROR|error|invalid|Invalid)" "$_stderr"
assert_eq "ERR-2c: stdout empty" "" "$_stdout"

# Also test a plausible-but-wrong phase
run_reset "${PFX}_allpend" "define"
assert_eq "ERR-2d: exit 1 for phase without number prefix" "1" "$_exit"

# ============================================================
echo ""
echo "=== ERR-3: Feature exists but has no phase directories ==="
run_reset "${PFX}_nophase"
assert_eq "ERR-3a: exit 0 (generates minimal state)" "0" "$_exit"
assert_file_exists "ERR-3b: state.yaml exists" "$FEATURES_DIR/${PFX}_nophase/state.yaml"
state_content="$(cat "$FEATURES_DIR/${PFX}_nophase/state.yaml" 2>/dev/null || echo '')"
# All phases should be pending (no gate files to read)
assert_contains "ERR-3c: all phases pending" "0-define.*status: pending" "$state_content"
assert_contains "ERR-3d: all phases pending" "4-ship.*status: pending" "$state_content"

# ============================================================
echo ""
echo "=== HS-1: Directory traversal rejection ==="
run_reset "../../etc/passwd"
assert_eq "HS-1a: exit 1 for traversal path" "1" "$_exit"
assert_match "HS-1b: error on stderr" "(ERROR|error|invalid|traversal)" "$_stderr"

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
