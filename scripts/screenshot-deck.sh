#!/usr/bin/env bash
# Capture Steam Deck UI screenshot to repo screenshots/ (auto-detects game vs desktop mode).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deck/deck-remote-common.sh
. "$SCRIPT_DIR/deck/deck-remote-common.sh"

MODE="auto"
INSTALL_DECK_HELPER=0
OPEN_AFTER=0

usage() {
  cat <<'EOF'
Usage: ./scripts/screenshot-deck.sh [options]

Options:
  --mode MODE           auto | game | desktop (default: auto)
  --install-deck-helper Install bonsai-capture to ~/.local/bin on the Deck
  --open                Open the PNG after download (xdg-open on Linux)
  -h, --help            Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --install-deck-helper) INSTALL_DECK_HELPER=1; shift ;;
    --open) OPEN_AFTER=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

deck_remote_load_env

CAPTURE_SCRIPT="$_SCRIPTS_DIR/deck/bonsai-capture.sh"

if [ "$INSTALL_DECK_HELPER" -eq 1 ]; then
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

deck_remote_cyan "Connecting to Steam Deck ($DECK_IP)..."
deck_remote_yellow "NOTE: You will be prompted for your 'deck' user sudo password."
deck_remote_gray "Mode: $MODE — game: gamescope atom (QAM+bonsAI) -> kmsgrab; desktop: grim -> kmsgrab; auto: detect on Deck."

REMOTE_ARGS="--mode $MODE --out $REMOTE_FILE --diag $REMOTE_DIAG --result $REMOTE_RESULT"
if [ "${BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW:-}" = "0" ]; then
  REMOTE_ARGS="$REMOTE_ARGS --no-steamos-rw"
fi

CAPTURE_CMD=$(deck_remote_ssh_capture "$REMOTE_ARGS" "$CAPTURE_SCRIPT")

ssh "${DECK_USER}@${DECK_IP}" "sudo rm -f $REMOTE_FILE $REMOTE_DIAG $REMOTE_RESULT" 2>/dev/null || true

ssh -t "${DECK_USER}@${DECK_IP}" "$CAPTURE_CMD"
SSH_EXIT=$?

scp "${DECK_USER}@${DECK_IP}:${REMOTE_RESULT}" "$LOCAL_RESULT" 2>/dev/null || true

deck_remote_parse_capture_result "$LOCAL_RESULT"

download_diag() {
  scp "${DECK_USER}@${DECK_IP}:${REMOTE_DIAG}" "$LOCAL_DIAG" 2>/dev/null || true
  if [ -f "$LOCAL_DIAG" ]; then
    deck_remote_gray "Diagnostic log saved to: $LOCAL_DIAG"
  fi
}

if [ "$SSH_EXIT" -eq 0 ] && [ "${CAP_BYTES:-0}" -ge 51200 ]; then
  deck_remote_cyan "Capture successful (mode=$CAP_MODE method=$CAP_METHOD bytes=$CAP_BYTES). Downloading..."

  if scp "${DECK_USER}@${DECK_IP}:${CAP_PATH}" "$LOCAL_FILE_TEMP"; then
    SUFFIX_MODE="$CAP_MODE"
    [ "$SUFFIX_MODE" = "unknown" ] && SUFFIX_MODE="$MODE"
    LOCAL_FILE="$LOCAL_PATH/DeckCapture_${TIMESTAMP}_${SUFFIX_MODE}.png"
    if [ "$LOCAL_FILE_TEMP" != "$LOCAL_FILE" ]; then
      mv -f "$LOCAL_FILE_TEMP" "$LOCAL_FILE"
    else
      LOCAL_FILE="$LOCAL_FILE_TEMP"
    fi

    deck_remote_cyan "Cleaning up temporary files on the Deck..."
    ssh "${DECK_USER}@${DECK_IP}" "sudo rm -f $REMOTE_FILE $REMOTE_DIAG $REMOTE_RESULT" 2>/dev/null || true

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
