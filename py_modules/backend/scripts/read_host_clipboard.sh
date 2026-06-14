#!/usr/bin/env bash
# Best-effort clipboard read for Decky when navigator.clipboard is unavailable.
# Tries wl-paste (Wayland) then xclip (X11). Prints text to stdout; exit 0 on success.
set -euo pipefail

max_bytes="${BONSAI_CLIPBOARD_MAX_BYTES:-65536}"

_resolve_runtime_env() {
  local uid home rd
  if id deck &>/dev/null; then
    uid="$(id -u deck)"
    home="/home/deck"
  else
    uid="$(id -u)"
    home="${HOME:-/home/deck}"
  fi
  rd="/run/user/${uid}"
  if [[ -d "$rd" ]]; then
    export XDG_RUNTIME_DIR="$rd"
  fi
  if [[ -z "${WAYLAND_DISPLAY:-}" && -S "${rd}/wayland-0" ]]; then
    export WAYLAND_DISPLAY=wayland-0
  fi
  export HOME="$home"
}

_truncate() {
  head -c "$max_bytes"
}

_resolve_runtime_env

if command -v wl-paste >/dev/null 2>&1; then
  if wl-paste -n 2>/dev/null | _truncate; then
    exit 0
  fi
  if wl-paste 2>/dev/null | _truncate; then
    exit 0
  fi
fi

if command -v xclip >/dev/null 2>&1; then
  if xclip -o -selection clipboard 2>/dev/null | _truncate; then
    exit 0
  fi
fi

echo "Clipboard read failed (wl-paste and xclip unavailable or empty)." >&2
exit 1
