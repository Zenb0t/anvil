#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$PWD/process/edsc/scripts/edsc.js"
if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Could not find EDSC CLI at '$SCRIPT_PATH'. Run this command from repository root." >&2
  exit 1
fi

bun "$SCRIPT_PATH" "$@"
