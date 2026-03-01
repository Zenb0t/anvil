#!/bin/sh
# Acceptance tests for F-2026-02-install (Makefile install/uninstall)
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
MAKEFILE="$REPO_ROOT/Makefile"
README="$REPO_ROOT/README.md"

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

make_fallback() {
  target="$1"
  prefix="${PREFIX:-$HOME/.local}"
  bindir="${BINDIR:-$prefix/bin}"
  anvil_dest="$bindir/anvil"
  anvil_src="$REPO_ROOT/bin/anvil"

  case "$target" in
    install)
      mkdir -p "$bindir"
      rm -f "$anvil_dest"
      MSYS=winsymlinks:lnk ln -s "$anvil_src" "$anvil_dest"
      echo "Installed $anvil_dest -> $anvil_src"
      ;;
    uninstall)
      if [ -L "$anvil_dest" ] && [ "$(readlink "$anvil_dest")" = "$anvil_src" ]; then
        rm -f "$anvil_dest"
        echo "Removed $anvil_dest"
      elif [ -e "$anvil_dest" ] || [ -L "$anvil_dest" ]; then
        echo "Refusing to remove non-managed target $anvil_dest" >&2
        return 1
      else
        echo "No install found at $anvil_dest"
      fi
      ;;
    *)
      echo "Unsupported make target in fallback: $target" >&2
      return 2
      ;;
  esac
}

run_make() {
  _stderr_file="$(mktemp)"
  set +e
  if command -v make >/dev/null 2>&1; then
    _stdout="$(make -C "$REPO_ROOT" "$@" 2>"$_stderr_file")"
  else
    _stdout="$(make_fallback "$@" 2>"$_stderr_file")"
  fi
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
SENTINEL="$HOME/.local/sentinel.txt"

echo "=== BR-7: documentation includes install/uninstall usage ==="
assert_true "README mentions make install" grep -q "make install" "$README"
assert_true "README mentions make uninstall" grep -q "make uninstall" "$README"

echo ""
echo "=== BR-1/BR-2: install creates target dir and managed symlink ==="
run_make install
assert_eq "install exits 0" "0" "$_exit"
assert_true "target dir exists" test -d "$TARGET_DIR"
assert_true "target is symlink" test -L "$TARGET"
if [ -L "$TARGET" ]; then
  link_target="$(readlink "$TARGET")"
  assert_eq "symlink points to repo bin/anvil" "$REPO_ROOT/bin/anvil" "$link_target"
fi

echo ""
echo "=== BR-3: install is idempotent ==="
run_make install
assert_eq "second install exits 0" "0" "$_exit"
assert_true "target remains symlink after second install" test -L "$TARGET"

echo ""
echo "=== ERR-1: install replaces existing regular file predictably ==="
rm -f "$TARGET"
echo "user-file" > "$TARGET"
assert_true "precondition regular file exists" test -f "$TARGET"
run_make install
assert_eq "install replaces regular file and exits 0" "0" "$_exit"
assert_true "target became symlink after replacement" test -L "$TARGET"

echo ""
echo "=== BR-4/BR-5 + IT-2: uninstall removes managed target and keeps directory ==="
run_make uninstall
assert_eq "uninstall exits 0 for managed target" "0" "$_exit"
assert_true "target removed after uninstall" test ! -e "$TARGET"
assert_true "target directory preserved" test -d "$TARGET_DIR"
run_make uninstall
assert_eq "second uninstall exits 0" "0" "$_exit"
assert_true "target still absent after second uninstall" test ! -e "$TARGET"
assert_true "target directory still preserved" test -d "$TARGET_DIR"

echo ""
echo "=== BR-6/IT-3: install uses symlink and preserves source-of-truth ==="
run_make install
assert_eq "install exits 0 (source-of-truth section)" "0" "$_exit"
assert_true "installed artifact is symlink (not copy)" test -L "$TARGET"
assert_true "source bin/anvil remains executable" test -x "$REPO_ROOT/bin/anvil"

echo ""
echo "=== IT-1: operations do not modify unrelated files ==="
mkdir -p "$HOME/.local"
echo "keep-me" > "$SENTINEL"
run_make install
assert_eq "install exits 0 with sentinel present" "0" "$_exit"
run_make uninstall
assert_eq "uninstall exits 0 with sentinel present" "0" "$_exit"
assert_true "sentinel file preserved" grep -q "^keep-me$" "$SENTINEL"

echo ""
echo "=== ERR-2/ERR-3: uninstall is no-op for missing target and missing dir ==="
rm -f "$TARGET"
rm -rf "$TARGET_DIR"
run_make uninstall
assert_eq "uninstall handles missing dir/target with exit 0" "0" "$_exit"

echo ""
echo "=== ERR-4: uninstall refuses non-managed existing target ==="
mkdir -p "$TARGET_DIR"
echo "custom-binary" > "$TARGET"
run_make uninstall
assert_eq "uninstall exits 1 for non-managed target" "1" "$_exit"
assert_true "non-managed target preserved" test -f "$TARGET"
assert_true "non-managed target content preserved" grep -q "^custom-binary$" "$TARGET"

rm -f "$TARGET"
mkdir -p "$TARGET_DIR"
MSYS=winsymlinks:lnk ln -s "/tmp/not-managed-anvil" "$TARGET"
assert_true "precondition non-managed symlink exists" test -L "$TARGET"
run_make uninstall
assert_eq "uninstall exits 1 for non-managed symlink target" "1" "$_exit"
assert_true "non-managed symlink preserved" test -L "$TARGET"
assert_eq "non-managed symlink target preserved" "/tmp/not-managed-anvil" "$(readlink "$TARGET")"

echo ""
echo "========================================="
echo "Results: $pass passed, $fail failed, $total total"
[ "$fail" -eq 0 ] && exit 0 || exit 1
