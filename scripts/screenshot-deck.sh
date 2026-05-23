#!/usr/bin/env bash
# Capture Steam Deck UI screenshot to repo screenshots/ (auto-detects game vs desktop mode).
# Auto-local when DECK_IP is loopback or resolves to this machine (Cursor-on-Deck).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deck/deck-remote-common.sh
. "$SCRIPT_DIR/deck/deck-remote-common.sh"

MODE="auto"
INSTALL_DECK_HELPER=0
OPEN_AFTER=0
FORCE_LOCAL=""
FORCE_REMOTE=""

normalize_deck_host() {
  local h="${1,,}"
  h="${h//[[:space:]]/}"
  h="${h#*@}"
  echo "$h"
}

is_loopback_deck_ip() {
  local ip
  ip="$(normalize_deck_host "$1")"
  [[ -z "$ip" || "$ip" == "127.0.0.1" || "$ip" == "localhost" ]]
}

# True when DECK_IP is this host (avoids SSH-to-self when .env says steamdeck.local on the Deck).
is_deck_ip_this_machine() {
  local target short long resolved ip
  target="$(normalize_deck_host "$1")"
  [[ -z "$target" ]] && return 1

  short="$(hostname -s 2>/dev/null || hostname)"
  long="$(hostname -f 2>/dev/null || true)"
  if [[ "$target" == "$short" || "$target" == "$long" ]]; then
    return 0
  fi
  if [[ -n "$short" && "$target" == "${short}.local" ]]; then
    return 0
  fi

  resolved="$(getent ahosts "$target" 2>/dev/null | awk '{print $1; exit}')"
  if [[ -z "$resolved" ]]; then
    return 1
  fi
  if [[ "$resolved" == "127.0.0.1" || "$resolved" == "::1" ]]; then
    return 0
  fi
  while read -r ip; do
    [[ -z "$ip" ]] && continue
    if [[ "$resolved" == "$ip" ]]; then
      return 0
    fi
  done < <(hostname -I 2>/dev/null || true)
  return 1
}

usage() {
  cat <<'EOF'
Usage: ./scripts/screenshot-deck.sh [options]

Options:
  --mode MODE           auto | game | desktop (default: auto)
  --install-deck-helper Install bonsai-capture to ~/.local/bin on the Deck
  --open                Open the PNG after download (xdg-open on Linux)
  --local               Force capture on this machine (no SSH)
  --remote              Force SSH to DECK_IP even when loopback
  -h, --help            Show this help

Environment:
  DECK_IP, DECK_USER from repo .env (see .env.example)
  BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW=0  Skip steamos-readonly grim install path

Auto-local: when DECK_IP is loopback, or resolves to this machine (e.g. steamdeck.local on the Deck).
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --install-deck-helper) INSTALL_DECK_HELPER=1; shift ;;
    --open) OPEN_AFTER=1; shift ;;
    --local) FORCE_LOCAL=1; shift ;;
    --remote) FORCE_REMOTE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -f "$_REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$_REPO_ROOT/.env"
  set +a
fi
DECK_IP="${DECK_IP:-}"
DECK_USER="${DECK_USER:-deck}"

USE_LOCAL=0
if [ -n "$FORCE_LOCAL" ]; then
  USE_LOCAL=1
elif [ -z "$FORCE_REMOTE" ]; then
  if is_loopback_deck_ip "$DECK_IP" || is_deck_ip_this_machine "$DECK_IP"; then
    USE_LOCAL=1
  fi
fi

if [ "$USE_LOCAL" -eq 0 ]; then
  if [ -z "$DECK_IP" ] || [ -z "$DECK_USER" ]; then
    echo "Error: DECK_IP and DECK_USER must be set in $_REPO_ROOT/.env (or use --local on the Deck)." >&2
    exit 1
  fi
fi

CAPTURE_SCRIPT="$_SCRIPTS_DIR/deck/bonsai-capture.sh"

if [ "$INSTALL_DECK_HELPER" -eq 1 ]; then
  if [ "$USE_LOCAL" -eq 1 ]; then
    echo "Error: --install-deck-helper requires remote SSH to the Deck." >&2
    exit 1
  fi
  deck_remote_install_helper "bonsai-capture" "$CAPTURE_SCRIPT"
  exit $?
fi

LOCAL_PATH="$_REPO_ROOT/screenshots"
mkdir -p "$LOCAL_PATH"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REMOTE_FILE="/tmp/deck_ui_capture.png"
REMOTE_DIAG="/tmp/bonsai-capture.diag"
REMOTE_RESULT="/tmp/bonsai-capture.result"
LOCAL_FILE_TEMP="$LOCAL_PATH/DeckCapture_${TIMESTAMP}.png"
LOCAL_DIAG="$LOCAL_PATH/DeckCapture_${TIMESTAMP}.log"
LOCAL_RESULT="$LOCAL_PATH/DeckCapture_${TIMESTAMP}.result"

REMOTE_ARGS="--mode $MODE --out $REMOTE_FILE --diag $REMOTE_DIAG --result $REMOTE_RESULT"
if [ "${BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW:-}" = "0" ]; then
  REMOTE_ARGS="$REMOTE_ARGS --no-steamos-rw"
fi

download_diag() {
  if [ "$USE_LOCAL" -eq 1 ]; then
    if [ -f "$REMOTE_DIAG" ]; then
      cp "$REMOTE_DIAG" "$LOCAL_DIAG" 2>/dev/null || sudo cp "$REMOTE_DIAG" "$LOCAL_DIAG" 2>/dev/null || true
    fi
  else
    scp "${DECK_USER}@${DECK_IP}:${REMOTE_DIAG}" "$LOCAL_DIAG" 2>/dev/null || true
  fi
  if [ -f "$LOCAL_DIAG" ]; then
    deck_remote_gray "Diagnostic log saved to: $LOCAL_DIAG"
  fi
}

finish_success() {
  local suffix_mode="$CAP_MODE"
  [ "$suffix_mode" = "unknown" ] && suffix_mode="$MODE"
  LOCAL_FILE="$LOCAL_PATH/DeckCapture_${TIMESTAMP}_${suffix_mode}.png"
  if [ "$LOCAL_FILE_TEMP" != "$LOCAL_FILE" ]; then
    mv -f "$LOCAL_FILE_TEMP" "$LOCAL_FILE"
  else
    LOCAL_FILE="$LOCAL_FILE_TEMP"
  fi

  deck_remote_green "Success! Screenshot saved to: $LOCAL_FILE"
  deck_remote_gray "  mode=$CAP_MODE  method=$CAP_METHOD  bytes=$CAP_BYTES"

  if [ "$CAP_METHOD" = "kmsgrab" ]; then
    deck_remote_yellow "WARNING: KMS grab captures primary plane only — QAM and bonsAI overlays are usually missing."
    deck_remote_yellow "  Ensure xprop is available and gamescope is running; retry with QAM open in game mode."
  fi

  if [ "$OPEN_AFTER" -eq 1 ] && [ -f "$LOCAL_FILE" ]; then
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$LOCAL_FILE" 2>/dev/null || true
    elif command -v open >/dev/null 2>&1; then
      open "$LOCAL_FILE" 2>/dev/null || true
    fi
  fi
}

if [ "$USE_LOCAL" -eq 1 ]; then
  deck_remote_cyan "Capturing on this machine (local / Cursor-on-Deck)..."
  deck_remote_yellow "NOTE: You may be prompted for your sudo password."
  deck_remote_gray "Mode: $MODE — game: gamescope atom (QAM+bonsAI) -> kmsgrab; desktop: grim -> kmsgrab; auto: detect on Deck."

  sudo rm -f "$REMOTE_FILE" "$REMOTE_DIAG" "$REMOTE_RESULT" 2>/dev/null || true

  set +e
  sudo bash "$CAPTURE_SCRIPT" $REMOTE_ARGS
  SSH_EXIT=$?
  set -e

  if [ -f "$REMOTE_RESULT" ]; then
    cp "$REMOTE_RESULT" "$LOCAL_RESULT" 2>/dev/null || sudo cp "$REMOTE_RESULT" "$LOCAL_RESULT" 2>/dev/null || true
  fi
else
  deck_remote_cyan "Connecting to Steam Deck ($DECK_IP)..."
  deck_remote_yellow "NOTE: You will be prompted for your 'deck' user sudo password."
  deck_remote_gray "Mode: $MODE — game: gamescope atom (QAM+bonsAI) -> kmsgrab; desktop: grim -> kmsgrab; auto: detect on Deck."

  CAPTURE_CMD=$(deck_remote_ssh_capture "$REMOTE_ARGS" "$CAPTURE_SCRIPT")

  ssh "${DECK_USER}@${DECK_IP}" "sudo rm -f $REMOTE_FILE $REMOTE_DIAG $REMOTE_RESULT" 2>/dev/null || true

  ssh -t "${DECK_USER}@${DECK_IP}" "$CAPTURE_CMD"
  SSH_EXIT=$?

  scp "${DECK_USER}@${DECK_IP}:${REMOTE_RESULT}" "$LOCAL_RESULT" 2>/dev/null || true
fi

deck_remote_parse_capture_result "$LOCAL_RESULT"

if [ "$SSH_EXIT" -eq 0 ] && [ "${CAP_BYTES:-0}" -ge 51200 ]; then
  deck_remote_cyan "Capture successful (mode=$CAP_MODE method=$CAP_METHOD bytes=$CAP_BYTES). Downloading..."

  if [ "$USE_LOCAL" -eq 1 ]; then
    if cp "$CAP_PATH" "$LOCAL_FILE_TEMP" 2>/dev/null || sudo cp "$CAP_PATH" "$LOCAL_FILE_TEMP"; then
      sudo rm -f "$REMOTE_FILE" "$REMOTE_DIAG" "$REMOTE_RESULT" 2>/dev/null || true
      finish_success
      exit 0
    fi
  elif scp "${DECK_USER}@${DECK_IP}:${CAP_PATH}" "$LOCAL_FILE_TEMP"; then
    deck_remote_cyan "Cleaning up temporary files on the Deck..."
    ssh "${DECK_USER}@${DECK_IP}" "sudo rm -f $REMOTE_FILE $REMOTE_DIAG $REMOTE_RESULT" 2>/dev/null || true
    finish_success
    exit 0
  fi

  deck_remote_red "Error: Failed to download the screenshot via SCP."
  download_diag
  exit 1
fi

HINT="Ensure the Deck is awake, sudo password is correct, and HDR is disabled."
if [ "${CAP_BYTES:-0}" -gt 0 ] && [ "${CAP_BYTES:-0}" -lt 51200 ]; then
  HINT="$HINT Capture produced a tiny/stale PNG ($CAP_BYTES bytes)."
fi
deck_remote_red "Error: Failed to capture the screen. $HINT"
if [ -f "$LOCAL_RESULT" ]; then
  cat "$LOCAL_RESULT" >&2
fi
download_diag
exit 1
