#!/bin/sh
# Acceptance tests for F-2026-02-install (Makefile install/uninstall)
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
MAKEFILE="$REPO_ROOT/Makefile"

pass=0
fail=0
total=0

assert_eq() {
  total=$((total + 1))
  label="$1"
  expected="$2"
  actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    fail=$((fail + 1))
  fi
}

assert_true() {
  total=$((total + 1))
  label="$1"
  shift
  if "$@"; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    fail=$((fail + 1))
  fi
}

run_cmd() {
  _stderr_file="$(mktemp)"
  set +e
  _stdout="$("$@" 2>"$_stderr_file")"
  _exit=$?
  set -e
  _stderr="$(cat "$_stderr_file")"
  rm -f "$_stderr_file"
}

TMP_HOME="$(mktemp -d)"
trap 'rm -rf "$TMP_HOME"' EXIT
export HOME="$TMP_HOME"

TARGET_DIR="$HOME/.local/bin"
TARGET="$TARGET_DIR/anvil"

echo "=== BR-1/BR-2: install creates target and symlink ==="
run_cmd make -C "$REPO_ROOT" install
assert_eq "install exits 0" "0" "$_exit"
assert_true "target dir exists" test -d "$TARGET_DIR"
assert_true "target is symlink" test -L "$TARGET"
if [ -L "$TARGET" ]; then
  link_target="$(readlink "$TARGET")"
  assert_eq "symlink points to repo bin/anvil" "$REPO_ROOT/bin/anvil" "$link_target"
fi

echo ""
echo "=== BR-3: install is idempotent ==="
run_cmd make -C "$REPO_ROOT" install
assert_eq "second install exits 0" "0" "$_exit"
assert_true "target remains symlink after second install" test -L "$TARGET"

echo ""
echo "=== BR-4/BR-5: uninstall removes target and is idempotent ==="
run_cmd make -C "$REPO_ROOT" uninstall
assert_eq "uninstall exits 0" "0" "$_exit"
assert_true "target removed after uninstall" test ! -e "$TARGET"
run_cmd make -C "$REPO_ROOT" uninstall
assert_eq "second uninstall exits 0" "0" "$_exit"
assert_true "target still absent after second uninstall" test ! -e "$TARGET"

echo ""
echo "=== BR-6/IT-3: install uses symlink and preserves source ==="
run_cmd make -C "$REPO_ROOT" install
assert_eq "install exits 0 (symlink check section)" "0" "$_exit"
assert_true "installed artifact is symlink (not copy)" test -L "$TARGET"
assert_true "source bin/anvil remains executable" test -x "$REPO_ROOT/bin/anvil"

echo ""
echo "=== ERR-2/ERR-3: uninstall no-op on missing target/dir ==="
rm -f "$TARGET"
rm -rf "$TARGET_DIR"
run_cmd make -C "$REPO_ROOT" uninstall
assert_eq "uninstall handles missing dir/target with exit 0" "0" "$_exit"

echo ""
echo "========================================="
echo "Results: $pass passed, $fail failed, $total total"
[ "$fail" -eq 0 ] && exit 0 || exit 1
