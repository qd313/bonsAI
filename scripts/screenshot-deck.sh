#!/usr/bin/env bash
# Capture full Deck UI (BPM/QAM composited) into repo screenshots/ for Cursor debug ingest.
# Auto-local when DECK_IP is loopback (Cursor-on-Deck); remote SSH otherwise.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LIB_CAPTURE="$SCRIPT_DIR/lib/deck-ui-capture-remote.sh"
REMOTE_TMP="/tmp/deck_ui_capture.png"

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
cyan()  { printf '\033[1;36m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[1;33m%s\033[0m\n' "$*"; }

usage() {
  cat <<'EOF'
Usage: ./scripts/screenshot-deck.sh [options]

Capture Steam Deck UI (Gamescope composited BPM/QAM when possible) into screenshots/.

Options:
  --local     Force capture on this machine (no SSH)
  --remote    Force SSH to DECK_IP even when loopback
  -h, --help  Show this help

Environment:
  DECK_IP, DECK_USER, DECK_PORT from repo .env (see .env.example)
  BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW=0  Skip steamos-readonly grim install path

Auto-local: when DECK_IP is loopback, or resolves to this machine (e.g. steamdeck.local on the Deck).
EOF
}

FORCE_LOCAL=""
FORCE_REMOTE=""
for arg in "$@"; do
  case "$arg" in
    --local)  FORCE_LOCAL=1 ;;
    --remote) FORCE_REMOTE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) red "Unknown option: $arg"; usage; exit 1 ;;
  esac
done

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

DECK_IP="${DECK_IP:-}"
DECK_USER="${DECK_USER:-deck}"
DECK_PORT="${DECK_PORT:-22}"

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

USE_LOCAL=0
if [[ -n "$FORCE_LOCAL" ]]; then
  USE_LOCAL=1
elif [[ -z "$FORCE_REMOTE" ]]; then
  if is_loopback_deck_ip "$DECK_IP" || is_deck_ip_this_machine "$DECK_IP"; then
    USE_LOCAL=1
  fi
fi

if [[ "$USE_LOCAL" -eq 0 ]]; then
  if [[ -z "$DECK_IP" ]]; then
    red "DECK_IP must be set in .env (or use --local on the Deck)."
    exit 1
  fi
fi

if [[ ! -f "$LIB_CAPTURE" ]]; then
  red "Missing capture library: $LIB_CAPTURE"
  exit 1
fi

ALLOW_STEAMOS_RW="true"
if [[ "${BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW:-}" == "0" ]]; then
  ALLOW_STEAMOS_RW="false"
fi

SCREENSHOTS_DIR="$REPO_ROOT/screenshots"
mkdir -p "$SCREENSHOTS_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOCAL_FILE="$SCREENSHOTS_DIR/DeckCapture_${TIMESTAMP}.png"

prepare_capture_script() {
  sed "s/__BONSAI_ALLOW_STEAMOS_RW__/$ALLOW_STEAMOS_RW/g" "$LIB_CAPTURE"
}

parse_capture_method() {
  local out="$1"
  echo "$out" | awk '/---CAPTURE_METHOD---/{getline; gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit}'
}

warn_kmsgrab_if_needed() {
  local method="$1"
  if [[ "$method" == "kmsgrab" ]]; then
    yellow "Capture used KMS grab (primary plane only when a game is fullscreen)."
    yellow "Gamescope atom and grim both failed — keep BPM/QAM running and retry, or check xprop/grim."
  fi
}

finish_success() {
  local method="$1"
  green "Success! Full UI screenshot saved to: $LOCAL_FILE"
  warn_kmsgrab_if_needed "$method"
}

run_capture_local() {
  cyan "Capturing on this machine (local / Cursor-on-Deck)..."
  yellow "NOTE: You may be prompted for your sudo password."
  cyan "Capture order: Gamescope X11 atom (composited) -> grim (Wayland) -> ffmpeg kmsgrab (fallback)."

  local tmp_script
  tmp_script="$(mktemp /tmp/bonsai_capture.XXXXXX.sh)"
  prepare_capture_script >"$tmp_script"
  chmod 700 "$tmp_script"

  local capture_out
  local capture_exit=0
  local capture_log
  capture_log="$(mktemp /tmp/bonsai_capture_out.XXXXXX)"
  set +e
  # Stream output via tee so the user sees progress in real time while we also
  # capture stdout for ---CAPTURE_METHOD--- parsing. PIPESTATUS[0] preserves
  # the real exit code of sudo bash through the pipe.
  sudo bash "$tmp_script" 2>&1 | tee "$capture_log"
  capture_exit=${PIPESTATUS[0]}
  set -e
  capture_out="$(cat "$capture_log")"
  rm -f "$capture_log" "$tmp_script"

  local cap_method
  cap_method="$(parse_capture_method "$capture_out")"
  [[ -z "$cap_method" ]] && cap_method="unknown"

  if [[ "$capture_exit" -ne 0 ]] || [[ ! -s "$REMOTE_TMP" ]]; then
    red "Error: Failed to capture the screen. Ensure the Deck is awake and BPM/Steam is still running."
    if [[ -n "$capture_out" ]]; then
      echo "$capture_out" | tail -20
    fi
    exit 1
  fi

  cp "$REMOTE_TMP" "$LOCAL_FILE"
  finish_success "$cap_method"
}

run_capture_remote() {
  cyan "Connecting to Steam Deck (${DECK_USER}@${DECK_IP})..."
  yellow "NOTE: You will be prompted for your 'deck' user sudo password."
  cyan "Capture order: Gamescope X11 atom (composited) -> grim (Wayland) -> ffmpeg kmsgrab (fallback)."

  local b64
  b64="$(prepare_capture_script | base64 -w0 2>/dev/null || prepare_capture_script | base64 | tr -d '\n')"
  local ssh_dest="${DECK_USER}@${DECK_IP}"
  local ssh_opts=(-p "$DECK_PORT")

  local capture_out
  local capture_exit=0
  set +e
  capture_out="$(ssh -t "${ssh_opts[@]}" "$ssh_dest" "echo $b64 | base64 -d | sudo bash" 2>&1)"
  capture_exit=$?
  set -e

  local cap_method
  cap_method="$(parse_capture_method "$capture_out")"
  [[ -z "$cap_method" ]] && cap_method="unknown"

  if [[ "$capture_exit" -ne 0 ]]; then
    red "Error: Failed to capture the screen. Ensure the Deck is awake, sudo password is correct, and HDR is disabled."
    if [[ "$capture_exit" -eq -1 ]] || [[ "$capture_out" == *"^C"* ]]; then
      yellow "If you pressed Ctrl+C, grim may have been waiting on Wayland; retry with QAM/BPM still open."
    fi
    exit 1
  fi

  cyan "Capture successful! Downloading screenshot..."
  scp -P "$DECK_PORT" "${ssh_dest}:${REMOTE_TMP}" "$LOCAL_FILE"

  cyan "Cleaning up temporary files on the Deck..."
  ssh -t "${ssh_opts[@]}" "$ssh_dest" "sudo rm -f $REMOTE_TMP" || true

  finish_success "$cap_method"
}

if [[ "$USE_LOCAL" -eq 1 ]]; then
  run_capture_local
else
  run_capture_remote
fi
