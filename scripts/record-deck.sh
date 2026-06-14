#!/usr/bin/env bash
# Capture Steam Deck UI recording to repo recordings/ (composited QAM + bonsAI required).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deck/deck-remote-common.sh
. "$SCRIPT_DIR/deck/deck-remote-common.sh"

MODE="auto"
SECONDS_DURATION=15
INSTALL_DECK_HELPER=0
OPEN_AFTER=0

usage() {
  cat <<'EOF'
Usage: ./scripts/record-deck.sh [options]

Options:
  --mode MODE           auto | game | desktop (default: auto)
  --seconds N           Recording duration (default: 15)
  --install-deck-helper Install bonsai-record to ~/.local/bin on the Deck
  --open                Open the video after download
  -h, --help            Show this help

Open QAM and bonsAI on the Deck before and during recording.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --seconds) SECONDS_DURATION="${2:-15}"; shift 2 ;;
    --install-deck-helper) INSTALL_DECK_HELPER=1; shift ;;
    --open) OPEN_AFTER=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

deck_remote_load_env

RECORD_SCRIPT="$_SCRIPTS_DIR/deck/bonsai-record.sh"

if [ "$INSTALL_DECK_HELPER" -eq 1 ]; then
  deck_remote_install_helper "bonsai-record" "$RECORD_SCRIPT"
  deck_remote_gray "On the Deck: open QAM + bonsAI, then run: bonsai-record --seconds $SECONDS_DURATION"
  exit $?
fi

LOCAL_PATH="$_REPO_ROOT/recordings"
mkdir -p "$LOCAL_PATH"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REMOTE_FILE="/tmp/deck_record.mkv"
REMOTE_DIAG="/tmp/bonsai-record.diag"
REMOTE_RESULT="/tmp/bonsai-record.result"
LOCAL_FILE_TEMP="$LOCAL_PATH/DeckRecord_${TIMESTAMP}.mkv"
LOCAL_DIAG="$LOCAL_PATH/DeckRecord_${TIMESTAMP}.log"
LOCAL_RESULT="$LOCAL_PATH/DeckRecord_${TIMESTAMP}.result"

deck_remote_cyan "Connecting to Steam Deck ($DECK_IP)..."
deck_remote_yellow "NOTE: You will be prompted for your 'deck' user sudo password."
deck_remote_yellow "Recording ${SECONDS_DURATION}s — open QAM and bonsAI on the Deck BEFORE and DURING capture."
deck_remote_gray "Mode: $MODE — game: pipewire gamescope only; desktop: wf-recorder. No kmsgrab (plugin UI required)."

REMOTE_ARGS="--mode $MODE --seconds $SECONDS_DURATION --out $REMOTE_FILE --diag $REMOTE_DIAG --result $REMOTE_RESULT"
if [ "${BONSAI_ALLOW_STEAMOS_RW:-}" = "0" ]; then
  REMOTE_ARGS="$REMOTE_ARGS --no-steamos-rw"
fi

RECORD_CMD=$(deck_remote_ssh_capture "$REMOTE_ARGS" "$RECORD_SCRIPT")

ssh "${DECK_USER}@${DECK_IP}" "sudo rm -f $REMOTE_FILE $REMOTE_DIAG $REMOTE_RESULT" 2>/dev/null || true

ssh -t "${DECK_USER}@${DECK_IP}" "$RECORD_CMD"
SSH_EXIT=$?

scp "${DECK_USER}@${DECK_IP}:${REMOTE_RESULT}" "$LOCAL_RESULT" 2>/dev/null || true

deck_remote_parse_record_result "$LOCAL_RESULT"

download_diag() {
  scp "${DECK_USER}@${DECK_IP}:${REMOTE_DIAG}" "$LOCAL_DIAG" 2>/dev/null || true
  if [ -f "$LOCAL_DIAG" ]; then
    deck_remote_gray "Diagnostic log saved to: $LOCAL_DIAG"
  fi
}

if [ "$SSH_EXIT" -eq 0 ] && deck_remote_record_ok "$LOCAL_RESULT"; then
  deck_remote_cyan "Recording successful (mode=$REC_MODE method=$REC_METHOD bytes=$REC_BYTES plugin_ui=$REC_PLUGIN_UI). Downloading..."

  if scp "${DECK_USER}@${DECK_IP}:${REC_PATH}" "$LOCAL_FILE_TEMP"; then
    SUFFIX_MODE="$REC_MODE"
    [ "$SUFFIX_MODE" = "unknown" ] && SUFFIX_MODE="$MODE"
    LOCAL_FILE="$LOCAL_PATH/DeckRecord_${TIMESTAMP}_${SUFFIX_MODE}.mkv"
    if [ "$LOCAL_FILE_TEMP" != "$LOCAL_FILE" ]; then
      mv -f "$LOCAL_FILE_TEMP" "$LOCAL_FILE"
    else
      LOCAL_FILE="$LOCAL_FILE_TEMP"
    fi

    deck_remote_cyan "Cleaning up temporary files on the Deck..."
    ssh "${DECK_USER}@${DECK_IP}" "sudo rm -f $REMOTE_FILE $REMOTE_DIAG $REMOTE_RESULT" 2>/dev/null || true

    deck_remote_green "Success! Recording saved to: $LOCAL_FILE"
    deck_remote_gray "  mode=$REC_MODE  method=$REC_METHOD  bytes=$REC_BYTES  seconds=$REC_SECONDS"
    deck_remote_gray "  Verify bonsAI plugin UI is visible in the clip (QAM should have been open)."

    if [ "$OPEN_AFTER" -eq 1 ] && [ -f "$LOCAL_FILE" ]; then
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$LOCAL_FILE" 2>/dev/null || true
      elif command -v open >/dev/null 2>&1; then
        open "$LOCAL_FILE" 2>/dev/null || true
      fi
    fi
    exit 0
  fi
  deck_remote_red "Error: Failed to download the recording via SCP."
  download_diag
  exit 1
fi

HINT="Open QAM and bonsAI on the Deck before/during recording. Composited capture (pipewire-gamescope / wf-recorder) is required."
if [ "$REC_PLUGIN_UI" = "no" ] || [ "$REC_METHOD" = "failed" ]; then
  HINT="$HINT Compositor path failed — check gstreamer/gst-plugin-pipewire (see .log)."
fi
if [ "${REC_BYTES:-0}" -gt 0 ] && [ "${REC_BYTES:-0}" -lt 524288 ]; then
  HINT="$HINT Recording too small ($REC_BYTES bytes)."
fi
deck_remote_red "Error: Recording failed v1 validation. $HINT"
if [ -f "$LOCAL_RESULT" ]; then
  cat "$LOCAL_RESULT" >&2
fi
download_diag
exit 1
