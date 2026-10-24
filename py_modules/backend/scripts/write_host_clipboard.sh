#!/usr/bin/env bash
# Best-effort clipboard write for Decky: pipes stdin into wl-copy (Wayland) or xclip (X11 fallback).
# Whichever tool receives the text forks into the background on its own to hold the selection alive
# once this script exits — see docs/audit/clipboard-spike-2026-08-28.md for what is confirmed about
# that and what is still owed an on-device check.
#
# Deliberately not `set -e`: a failed first branch must not abort the script before the fallback runs.
set -uo pipefail

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

_resolve_runtime_env

# Buffered rather than streamed: a failed wl-copy attempt must not have already consumed stdin,
# or the xclip fallback below would have nothing left to send.
payload="$(cat)"

if command -v wl-copy >/dev/null 2>&1; then
  if printf '%s' "$payload" | wl-copy 2>/dev/null; then
    exit 0
  fi
fi

if command -v xclip >/dev/null 2>&1; then
  if printf '%s' "$payload" | xclip -selection clipboard -i 2>/dev/null; then
    exit 0
  fi
fi

echo "Clipboard write failed (wl-copy and xclip unavailable)." >&2
exit 1
