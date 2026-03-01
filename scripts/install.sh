#!/bin/sh
set -eu

ACTION="${1:-install}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
ANVIL_SRC="$REPO_ROOT/bin/anvil"

PREFIX="${PREFIX:-$HOME/.local}"
BINDIR="${BINDIR:-$PREFIX/bin}"
ANVIL_DEST="${ANVIL_DEST:-$BINDIR/anvil}"

MANAGED_MARKER="# managed-by: anvil scripts/install.sh"

install_anvil() {
  mkdir -p "$BINDIR"
  cat >"$ANVIL_DEST" <<EOF
#!/bin/sh
$MANAGED_MARKER
exec bun "$ANVIL_SRC" "\$@"
EOF
  chmod +x "$ANVIL_DEST"
  echo "Installed $ANVIL_DEST -> $ANVIL_SRC"
}

uninstall_anvil() {
  if [ -L "$ANVIL_DEST" ]; then
    TARGET="$(readlink "$ANVIL_DEST" || true)"
    if [ "$TARGET" = "$ANVIL_SRC" ]; then
      rm -f "$ANVIL_DEST"
      echo "Removed $ANVIL_DEST"
      return 0
    fi
  fi

  if [ -f "$ANVIL_DEST" ] && grep -Fq "$MANAGED_MARKER" "$ANVIL_DEST"; then
    rm -f "$ANVIL_DEST"
    echo "Removed $ANVIL_DEST"
    return 0
  fi

  if [ -e "$ANVIL_DEST" ] || [ -L "$ANVIL_DEST" ]; then
    echo "Refusing to remove non-managed target $ANVIL_DEST" >&2
    exit 1
  fi

  echo "No install found at $ANVIL_DEST"
}

case "$ACTION" in
  install)
    install_anvil
    ;;
  uninstall)
    uninstall_anvil
    ;;
  *)
    echo "Usage: sh scripts/install.sh [install|uninstall]" >&2
    exit 2
    ;;
esac
