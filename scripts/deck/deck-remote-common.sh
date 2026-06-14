# deck-remote-common.sh — shared helpers for screenshot-deck.sh and record-deck.sh (PC side).
# Source from scripts/*.sh orchestrators; not run on the Deck directly.

_DECK_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_SCRIPTS_DIR="$(cd "$_DECK_COMMON_DIR/.." && pwd)"
_REPO_ROOT="$(cd "$_SCRIPTS_DIR/.." && pwd)"

deck_remote_load_env() {
  REPO_ROOT="$_REPO_ROOT"
  if [ -f "$REPO_ROOT/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$REPO_ROOT/.env"
    set +a
  fi
  DECK_IP="${DECK_IP:-}"
  DECK_USER="${DECK_USER:-}"
  if [ -z "$DECK_IP" ] || [ -z "$DECK_USER" ]; then
    echo "Error: DECK_IP and DECK_USER must be set in $REPO_ROOT/.env" >&2
    exit 1
  fi
}

deck_remote_cyan() { printf '\033[36m%s\033[0m\n' "$*"; }
deck_remote_green() { printf '\033[32m%s\033[0m\n' "$*"; }
deck_remote_yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
deck_remote_red() { printf '\033[31m%s\033[0m\n' "$*"; }
deck_remote_gray() { printf '\033[90m%s\033[0m\n' "$*"; }

# Bundle common + main deck script for stdin execution over SSH (no separate files on Deck).
deck_remote_bundle_script() {
  local main_script="$1"
  local common_script
  common_script="$(dirname "$main_script")/bonsai-capture-common.sh"
  if [ ! -f "$common_script" ]; then
    echo "Error: missing $common_script" >&2
    exit 1
  fi
  if [ ! -f "$main_script" ]; then
    echo "Error: missing $main_script" >&2
    exit 1
  fi
  head -1 "$main_script"
  cat "$common_script"
  printf '%s\n' 'BONSAI_CAPTURE_COMMON_LOADED=1'
  awk '
    /^#!/ { next }
    /^if \[ -z "\$\{BONSAI_CAPTURE_COMMON_LOADED/ { skip=1; next }
    skip && /^fi$/ { skip=0; next }
    skip { next }
    { print }
  ' "$main_script"
}

deck_remote_b64_bundle() {
  local main_script="$1"
  deck_remote_bundle_script "$main_script" | tr -d '\r' | base64 -w0 2>/dev/null || \
    deck_remote_bundle_script "$main_script" | tr -d '\r' | base64 | tr -d '\n'
}

deck_remote_ssh_capture() {
  local remote_args="$1"
  local main_script="$2"
  local b64
  b64=$(deck_remote_b64_bundle "$main_script")
  printf 'echo %s | base64 -d | sudo bash -s -- %s' "$b64" "$remote_args"
}

deck_remote_install_helper() {
  local helper_name="$1"
  local main_script="$2"
  local tmpbundle
  tmpbundle=$(mktemp)
  deck_remote_bundle_script "$main_script" >"$tmpbundle"
  deck_remote_cyan "Installing $helper_name to ${DECK_USER}@${DECK_IP}:~/.local/bin/ ..."
  ssh "${DECK_USER}@${DECK_IP}" "mkdir -p ~/.local/bin"
  scp "$tmpbundle" "${DECK_USER}@${DECK_IP}:~/.local/bin/$helper_name"
  rm -f "$tmpbundle"
  ssh "${DECK_USER}@${DECK_IP}" "chmod +x ~/.local/bin/$helper_name"
  deck_remote_green "Installed. On the Deck run: $helper_name"
}

deck_remote_parse_capture_result() {
  local file="$1"
  CAP_MODE="unknown"
  CAP_METHOD="unknown"
  CAP_BYTES=0
  CAP_PATH=""
  if [ -f "$file" ]; then
    local line
    line=$(grep '---CAPTURE_RESULT---' "$file" | tail -1)
    if [ -n "$line" ]; then
      CAP_MODE=$(echo "$line" | sed -n 's/.*mode=\([^ ]*\).*/\1/p')
      CAP_METHOD=$(echo "$line" | sed -n 's/.*method=\([^ ]*\).*/\1/p')
      CAP_BYTES=$(echo "$line" | sed -n 's/.*bytes=\([0-9]*\).*/\1/p')
      CAP_PATH=$(echo "$line" | sed -n 's/.*path=\([^ ]*\).*/\1/p')
    fi
  fi
}

deck_remote_parse_record_result() {
  local file="$1"
  REC_MODE="unknown"
  REC_METHOD="unknown"
  REC_BYTES=0
  REC_PATH=""
  REC_SECONDS=0
  REC_PLUGIN_UI="no"
  if [ -f "$file" ]; then
    local line
    line=$(grep '---RECORD_RESULT---' "$file" | tail -1)
    if [ -n "$line" ]; then
      REC_MODE=$(echo "$line" | sed -n 's/.*mode=\([^ ]*\).*/\1/p')
      REC_METHOD=$(echo "$line" | sed -n 's/.*method=\([^ ]*\).*/\1/p')
      REC_BYTES=$(echo "$line" | sed -n 's/.*bytes=\([0-9]*\).*/\1/p')
      REC_PATH=$(echo "$line" | sed -n 's/.*path=\([^ ]*\).*/\1/p')
      REC_SECONDS=$(echo "$line" | sed -n 's/.*seconds=\([0-9]*\).*/\1/p')
      REC_PLUGIN_UI=$(echo "$line" | sed -n 's/.*plugin_ui=\([^ ]*\).*/\1/p')
    fi
  fi
}

deck_remote_record_ok() {
  deck_remote_parse_record_result "$1"
  if [ "$REC_PLUGIN_UI" = "no" ]; then
    return 1
  fi
  if [ "$REC_METHOD" = "kmsgrab" ] || [ "$REC_METHOD" = "failed" ]; then
    return 1
  fi
  case "$REC_METHOD" in
    pipewire-gamescope|wf-recorder) ;;
    *) return 1 ;;
  esac
  [ "${REC_BYTES:-0}" -ge 524288 ] || return 1
  return 0
}
