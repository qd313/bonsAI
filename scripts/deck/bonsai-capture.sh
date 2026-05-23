#!/usr/bin/env bash
# bonsai-capture.sh — Steam Deck screenshot helper (game-mode QAM/bonsAI composited capture).
# Invoked locally on the Deck or via scripts/screenshot-deck.ps1 / screenshot-deck.sh over SSH.
set +e

if [ -z "${BONSAI_CAPTURE_COMMON_LOADED:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=bonsai-capture-common.sh
  . "$SCRIPT_DIR/bonsai-capture-common.sh"
fi

CAPTURE_MODE="auto"
OUT=""
DIAG="/tmp/bonsai-capture.diag"
RESULT_FILE="/tmp/bonsai-capture.result"
QUIET=0
CAPTURE_METHOD="kmsgrab"
RESOLVED_MODE="unknown"
RUN_EPOCH=$(date +%s)
MIN_PNG_BYTES=51200

bonsai_common_init

usage() {
  cat <<'EOF'
Usage: bonsai-capture.sh [options]

Capture Steam Deck UI for bonsAI / Decky debugging.

Options:
  --auto              Same as --mode auto (default)
  --mode MODE         auto | game | desktop
  --out PATH          Output PNG path (default: /tmp/deck_ui_capture.png or ~/Pictures/...)
  --diag PATH         Diagnostic log path (default: /tmp/bonsai-capture.diag)
  --result PATH       Machine-readable result file
  --quiet             Suppress non-error messages
  -h, --help          Show this help

Environment:
  BONSAI_ALLOW_STEAMOS_RW  Set to 0/false to skip steamos-readonly toggle for grim install

Game mode:  gamescope atom (full composition, QAM + overlays) -> kmsgrab fallback (game-only).
Desktop:    grim (Plasma Wayland) -> kmsgrab fallback.
Auto:       detect_mode() then dispatch.

On success prints:
  ---CAPTURE_RESULT--- mode=<mode> method=<method> bytes=<N> path=<out>
EOF
}

diag() { bonsai_diag "$@"; }
log() { bonsai_log "$@"; }

emit_result() {
  local bytes=0
  if [ -f "$OUT" ]; then
    bytes=$(stat -c%s "$OUT" 2>/dev/null || echo 0)
  fi
  local line="---CAPTURE_RESULT--- mode=${RESOLVED_MODE} method=${CAPTURE_METHOD} bytes=${bytes} path=${OUT}"
  echo "$line"
  if [ -n "$RESULT_FILE" ]; then
    printf '%s\n' "$line" >"$RESULT_FILE" 2>/dev/null
    chmod 0644 "$RESULT_FILE" 2>/dev/null
  fi
}

validate_png() {
  local f="$1"
  [ -f "$f" ] || return 1
  local sz mt
  sz=$(stat -c%s "$f" 2>/dev/null || echo 0)
  mt=$(stat -c%Y "$f" 2>/dev/null || echo 0)
  [ "$sz" -ge "$MIN_PNG_BYTES" ] || return 1
  [ "$mt" -ge "$RUN_EPOCH" ] || return 1
  return 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --auto) CAPTURE_MODE="auto"; shift ;;
    --mode)
      CAPTURE_MODE="${2:-}"
      shift 2
      ;;
    --out)
      OUT="${2:-}"
      shift 2
      ;;
    --diag)
      DIAG="${2:-}"
      shift 2
      ;;
    --result)
      RESULT_FILE="${2:-}"
      shift 2
      ;;
    --no-steamos-rw) BONSAI_ALLOW_STEAMOS_RW="false"; shift ;;
    --allow-steamos-rw) BONSAI_ALLOW_STEAMOS_RW="true"; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$CAPTURE_MODE" in
  auto|game|desktop) ;;
  *)
    echo "Invalid --mode: $CAPTURE_MODE (use auto, game, or desktop)" >&2
    exit 2
    ;;
esac

if [ -z "$OUT" ]; then
  if [ -n "${BONSAI_CAPTURE_OUT:-}" ]; then
    OUT="$BONSAI_CAPTURE_OUT"
  elif [ "$(id -u)" -eq 0 ] || [ -n "${SUDO_USER:-}" ]; then
    OUT="/tmp/deck_ui_capture.png"
  else
    UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
    mkdir -p "$UH/Pictures" 2>/dev/null
    OUT="$UH/Pictures/bonsai-capture-$(date +%Y%m%d_%H%M%S).png"
  fi
fi

: >"$DIAG"
diag "bonsai-capture start epoch=$RUN_EPOCH mode_flag=$CAPTURE_MODE out=$OUT user=$TARGET_USER rd=$RD"

bonsai_try_gamescope_atom_screenshot() {
  local GS_OUT=/tmp/gamescope.png
  local cand cands d xa atom_epoch line rc gs_mt gs_sz
  if ! command -v xprop >/dev/null 2>&1; then
    diag "gamescope-atom: xprop not found"
    return 1
  fi

  cand=/tmp/bonsai_xcands.$$
  : >"$cand"

  for pid in $(pgrep -x gamescope 2>/dev/null) $(pgrep -x gamescope-wl 2>/dev/null); do
    line=$(bonsai_env_from_pid "$pid") || continue
    echo "$line" >>"$cand"
    diag "gamescope-atom: candidate from gamescope pid=$pid -> $line"
  done

  for pid in $(pgrep -x steam 2>/dev/null); do
    line=$(bonsai_env_from_pid "$pid") || continue
    echo "$line" >>"$cand"
    diag "gamescope-atom: candidate from steam pid=$pid -> $line"
  done

  cands=$(awk '!seen[$0]++' "$cand")
  rm -f "$cand"

  for d in :0 :1 :2; do
    case $cands in *"$d|"*) ;; *) cands="${cands}"$'\n'"$d|" ;; esac
  done

  rm -f "$GS_OUT" 2>/dev/null || sudo rm -f "$GS_OUT" 2>/dev/null || true
  atom_epoch=$RUN_EPOCH

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    d="${line%%|*}"
    xa="${line#*|}"
    diag "gamescope-atom: trying DISPLAY=$d XAUTHORITY=${xa:-<none>}"
    if [ -n "$xa" ]; then
      sudo -u "$TARGET_USER" env DISPLAY="$d" XAUTHORITY="$xa" \
        xprop -root -f GAMESCOPECTRL_REQUEST_SCREENSHOT 32c \
        -set GAMESCOPECTRL_REQUEST_SCREENSHOT 3 >/dev/null 2>&1
    else
      sudo -u "$TARGET_USER" env DISPLAY="$d" \
        xprop -root -f GAMESCOPECTRL_REQUEST_SCREENSHOT 32c \
        -set GAMESCOPECTRL_REQUEST_SCREENSHOT 3 >/dev/null 2>&1
    fi
    rc=$?
    [ "$rc" != 0 ] && continue

    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
      if [ -f "$GS_OUT" ]; then
        gs_mt=$(stat -c%Y "$GS_OUT" 2>/dev/null || echo 0)
        gs_sz=$(stat -c%s "$GS_OUT" 2>/dev/null || echo 0)
        if [ "$gs_mt" -ge "$atom_epoch" ] && [ "$gs_sz" -ge "$MIN_PNG_BYTES" ]; then
          break
        fi
      fi
      sleep 0.25
    done

    if validate_png "$GS_OUT"; then
      cp "$GS_OUT" "$OUT" && chmod 0644 "$OUT" 2>/dev/null
      diag "gamescope-atom: success from $GS_OUT -> $OUT"
      return 0
    fi
    diag "gamescope-atom: stale or small png after DISPLAY=$d"
  done <<EOF_CANDS
$cands
EOF_CANDS

  diag "gamescope-atom: all candidates failed"
  return 1
}

bonsai_try_grim_screenshot() {
  local GRIM_EXE sock wl sock_rd grim_ok GRIM_DEADLINE
  bonsai_ensure_grim || true
  GRIM_EXE=$(bonsai_resolve_grim_exe) || GRIM_EXE=""
  [ -n "$GRIM_EXE" ] || return 1

  bonsai_collect_wayland_sockets

  GRIM_DEADLINE=45
  for sock in "${grim_socks[@]}"; do
    [ -S "$sock" ] || continue
    wl=$(basename "$sock")
    sock_rd=$(dirname "$sock")
    diag "grim: trying $sock_rd WAYLAND_DISPLAY=$wl"
    grim_ok=0
    if command -v timeout >/dev/null 2>&1; then
      if sudo -u "$TARGET_USER" env XDG_RUNTIME_DIR="$sock_rd" WAYLAND_DISPLAY="$wl" \
        timeout "$GRIM_DEADLINE" "$GRIM_EXE" -t png "$OUT" 2>/tmp/bonsai_grim_err.log; then
        grim_ok=1
      fi
    else
      if sudo -u "$TARGET_USER" env XDG_RUNTIME_DIR="$sock_rd" WAYLAND_DISPLAY="$wl" \
        "$GRIM_EXE" -t png "$OUT" 2>/tmp/bonsai_grim_err.log; then
        grim_ok=1
      fi
    fi
    if [ "$grim_ok" = 1 ] && validate_png "$OUT"; then
      diag "grim: success on $sock"
      return 0
    fi
  done
  diag "grim: all sockets failed"
  return 1
}

bonsai_try_kmsgrab() {
  diag "kmsgrab: attempting primary-plane capture (overlays may be missing)"
  if command -v timeout >/dev/null 2>&1; then
    timeout 90 ffmpeg -loglevel error -device /dev/dri/card0 -f kmsgrab -i - \
      -vframes 1 -vf 'hwmap=derive_device=vaapi,hwdownload,format=bgr0' -y "$OUT"
    return $?
  fi
  ffmpeg -loglevel error -device /dev/dri/card0 -f kmsgrab -i - \
    -vframes 1 -vf 'hwmap=derive_device=vaapi,hwdownload,format=bgr0' -y "$OUT"
  return $?
}

capture_game_mode() {
  log "Game mode: gamescope atom (full composition) -> kmsgrab fallback"
  if bonsai_try_gamescope_atom_screenshot; then
    CAPTURE_METHOD="gamescope-atom"
    return 0
  fi
  log "Gamescope atom failed; falling back to kmsgrab (game-only, no QAM/overlays)"
  if bonsai_try_kmsgrab; then
    CAPTURE_METHOD="kmsgrab"
    return 0
  fi
  return 1
}

capture_desktop_mode() {
  log "Desktop mode: grim (Plasma Wayland) -> kmsgrab fallback"
  if bonsai_try_grim_screenshot; then
    CAPTURE_METHOD="grim"
    return 0
  fi
  if bonsai_try_kmsgrab; then
    CAPTURE_METHOD="kmsgrab"
    return 0
  fi
  return 1
}

capture_unknown_mode() {
  log "Unknown mode: trying gamescope atom then grim then kmsgrab"
  if bonsai_try_gamescope_atom_screenshot; then
    CAPTURE_METHOD="gamescope-atom"
    return 0
  fi
  if bonsai_try_grim_screenshot; then
    CAPTURE_METHOD="grim"
    return 0
  fi
  if bonsai_try_kmsgrab; then
    CAPTURE_METHOD="kmsgrab"
    return 0
  fi
  return 1
}

RESOLVED_MODE=$(resolve_capture_mode "$CAPTURE_MODE")
diag "resolved_mode=$RESOLVED_MODE"

FE=1
case "$RESOLVED_MODE" in
  game) capture_game_mode; FE=$? ;;
  desktop) capture_desktop_mode; FE=$? ;;
  *) capture_unknown_mode; FE=$? ;;
esac

if [ "$FE" -eq 0 ] && validate_png "$OUT"; then
  log "Capture OK: mode=$RESOLVED_MODE method=$CAPTURE_METHOD path=$OUT"
  emit_result
  exit 0
fi

diag "capture failed fe=$FE out_exists=$([ -f "$OUT" ] && echo yes || echo no)"
emit_result
exit "${FE:-1}"
