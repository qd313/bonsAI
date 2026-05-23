#!/usr/bin/env bash
# bonsai-record.sh — Steam Deck composited screen recording (QAM + bonsAI plugin UI).
# Canonical capture implementation; invoked via record-deck.ps1/.sh or locally on Deck.
set +e

if [ -z "${BONSAI_CAPTURE_COMMON_LOADED:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=bonsai-capture-common.sh
  . "$SCRIPT_DIR/bonsai-capture-common.sh"
fi

RECORD_MODE="auto"
OUT=""
DIAG="/tmp/bonsai-record.diag"
RESULT_FILE="/tmp/bonsai-record.result"
QUIET=0
RECORD_METHOD="failed"
RESOLVED_MODE="unknown"
PLUGIN_UI="no"
RECORD_SECONDS=15
RUN_EPOCH=$(date +%s)
MIN_RECORD_BYTES=524288

bonsai_common_init

usage() {
  cat <<'EOF'
Usage: bonsai-record.sh [options]

Record Steam Deck UI for bonsAI / Decky debugging (composited QAM + plugin UI required for v1).

Options:
  --mode MODE         auto | game | desktop (default: auto)
  --seconds N         Recording duration in seconds (default: 15)
  --out PATH          Output video path (default: /tmp/deck_record.mkv or ~/Videos/...)
  --diag PATH         Diagnostic log path
  --result PATH       Machine-readable result file
  --quiet             Suppress non-error messages
  -h, --help          Show this help

Environment:
  BONSAI_ALLOW_STEAMOS_RW  Allow pacman/steamos-readonly for wf-recorder/gstreamer install

Game mode:   pipewire gamescope node only (QAM + Decky + bonsAI). No kmsgrab success path.
Desktop:     wf-recorder on Plasma Wayland socket.

Open QAM and bonsAI before recording in game mode.

On completion prints:
  ---RECORD_RESULT--- mode=... method=... bytes=... path=... seconds=... plugin_ui=expected|no
EOF
}

diag() { bonsai_diag "$@"; }
log() { bonsai_log "$@"; }

emit_record_result() {
  local bytes=0
  if [ -f "$OUT" ]; then
    bytes=$(stat -c%s "$OUT" 2>/dev/null || echo 0)
  fi
  local line="---RECORD_RESULT--- mode=${RESOLVED_MODE} method=${RECORD_METHOD} bytes=${bytes} path=${OUT} seconds=${RECORD_SECONDS} plugin_ui=${PLUGIN_UI}"
  echo "$line"
  if [ -n "$RESULT_FILE" ]; then
    printf '%s\n' "$line" >"$RESULT_FILE" 2>/dev/null
    chmod 0644 "$RESULT_FILE" 2>/dev/null
  fi
}

validate_recording() {
  local f="$1"
  [ -f "$f" ] || return 1
  local sz mt
  sz=$(stat -c%s "$f" 2>/dev/null || echo 0)
  mt=$(stat -c%Y "$f" 2>/dev/null || echo 0)
  [ "$sz" -ge "$MIN_RECORD_BYTES" ] || return 1
  [ "$mt" -ge "$RUN_EPOCH" ] || return 1
  return 0
}

bonsai_finalize_recording() {
  local partial="$1" final="$2"
  [ -f "$partial" ] || return 1
  if validate_recording "$partial"; then
    return 0
  fi
  if ! command -v ffmpeg >/dev/null 2>&1; then
    return 1
  fi
  diag "finalize: attempting ffmpeg remux on partial file"
  local fixed="${partial%.mkv}_fixed.mkv"
  [ "$fixed" = "$partial" ] && fixed="${partial}.remux.mkv"
  if ffmpeg -y -loglevel error -i "$partial" -c copy "$fixed" 2>>"$DIAG"; then
    if validate_recording "$fixed"; then
      mv -f "$fixed" "$final" 2>/dev/null
      diag "finalize: remux success -> $final"
      return 0
    fi
  fi
  rm -f "$fixed" 2>/dev/null
  return 1
}

bonsai_run_gst_pipewire_target() {
  local target="$1" duration="$2" partial="$3" gst_log="$4"
  local timeout_sec
  timeout_sec=$((duration + 8))

  if gst-inspect-1.0 vah264enc >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then
      timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" on-disconnect=true \
        ! queue max-size-buffers=4 leaky=downstream \
        ! video/x-raw,format=NV12 \
        ! videoconvert ! vah264enc ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
      return $?
    fi
  elif gst-inspect-1.0 vaapih264enc >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then
      timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" on-disconnect=true \
        ! queue ! video/x-raw,format=NV12 \
        ! videoconvert ! vaapih264enc ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
      return $?
    fi
  elif gst-inspect-1.0 x264enc >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then
      timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" on-disconnect=true \
        ! queue ! videoconvert ! x264enc speed-preset=ultrafast tune=zerolatency ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
      return $?
    fi
  fi
  return 1
}

bonsai_try_pipewire_gamescope_record() {
  local duration="$1"
  local partial out_tmp gst_log node_id
  bonsai_ensure_gstreamer_pipewire || {
    diag "pipewire-gamescope: gstreamer/pipewiresrc not available"
    return 1
  }
  if ! bonsai_gst_has_va_h264; then
    diag "pipewire-gamescope: no H.264 encoder found"
    return 1
  fi

  partial="${OUT}.partial.$$"
  out_tmp="$OUT"
  rm -f "$partial" "$out_tmp" 2>/dev/null
  gst_log=/tmp/bonsai_record_gst.log
  : >"$gst_log"

  diag "pipewire-gamescope: starting gst-launch duration=${duration}s target=gamescope"
  bonsai_run_gst_pipewire_target "gamescope" "$duration" "$partial" "$gst_log" || true

  if [ ! -f "$partial" ] || ! validate_recording "$partial"; then
    diag "pipewire-gamescope: target-object=gamescope failed; trying pw-cli node id"
    rm -f "$partial" 2>/dev/null
    node_id=$(pw-cli ls Node 2>/dev/null | awk '/object.name = "gamescope"/{found=1} found && /id [0-9]+/{print $2; exit}')
    if [ -z "$node_id" ]; then
      node_id=$(pw-cli ls Node 2>/dev/null | grep -i gamescope | head -1 | sed -n 's/.*id \([0-9]*\).*/\1/p')
    fi
    if [ -n "$node_id" ]; then
      diag "pipewire-gamescope: retry with node id $node_id"
      bonsai_run_gst_pipewire_target "$node_id" "$duration" "$partial" "$gst_log" || true
    fi
  fi

  if [ ! -f "$partial" ]; then
    diag "pipewire-gamescope: no output file; gst log tail:"
    tail -30 "$gst_log" >>"$DIAG" 2>/dev/null
    return 1
  fi

  if bonsai_finalize_recording "$partial" "$out_tmp"; then
    rm -f "$partial" 2>/dev/null
    chmod 0644 "$out_tmp" 2>/dev/null
    diag "pipewire-gamescope: success"
    return 0
  fi

  if [ -f "$partial" ]; then
    mv -f "$partial" "$out_tmp" 2>/dev/null
    if validate_recording "$out_tmp"; then
      diag "pipewire-gamescope: using partial without remux"
      return 0
    fi
  fi
  diag "pipewire-gamescope: failed"
  tail -30 "$gst_log" >>"$DIAG" 2>/dev/null
  return 1
}

bonsai_try_wfrecorder_record() {
  local duration="$1"
  local WF_EXE sock wl sock_rd wf_log wf_pid
  bonsai_ensure_wfrecorder || {
    diag "wf-recorder: not available"
    return 1
  }
  WF_EXE=$(bonsai_resolve_wfrecorder_exe) || return 1

  bonsai_collect_wayland_sockets
  wf_log=/tmp/bonsai_wfrecorder_err.log

  for sock in "${grim_socks[@]}"; do
    [ -S "$sock" ] || continue
    wl=$(basename "$sock")
    sock_rd=$(dirname "$sock")
    diag "wf-recorder: trying $sock_rd WAYLAND_DISPLAY=$wl"
    rm -f "$OUT" 2>/dev/null
    : >"$wf_log"
    if sudo -u "$TARGET_USER" env XDG_RUNTIME_DIR="$sock_rd" WAYLAND_DISPLAY="$wl" \
      "$WF_EXE" --log --file="$OUT" >>"$wf_log" 2>&1 &
    then
      wf_pid=$!
      sleep "$duration"
      kill -INT "$wf_pid" 2>/dev/null
      wait "$wf_pid" 2>/dev/null
      sleep 1
      if validate_recording "$OUT"; then
        diag "wf-recorder: success on $sock"
        return 0
      fi
      bonsai_finalize_recording "$OUT" "$OUT" && return 0
    fi
    diag "wf-recorder: failed on $sock"
    tail -5 "$wf_log" >>"$DIAG" 2>/dev/null
  done
  return 1
}

record_game_mode() {
  log "Game mode: pipewire gamescope (composited QAM + bonsAI — open QAM before recording)"
  log "NOTE: kmsgrab cannot capture plugin UI; compositor path required."
  if bonsai_try_pipewire_gamescope_record "$RECORD_SECONDS"; then
    RECORD_METHOD="pipewire-gamescope"
    PLUGIN_UI="expected"
    return 0
  fi
  PLUGIN_UI="no"
  log "ERROR: Composited gamescope recording failed."
  log "  Open QAM and bonsAI, ensure gamescope is running, HDR off, and gstreamer+gst-plugin-pipewire installed."
  diag "record_game_mode: failed — no kmsgrab fallback (plugin UI required)"
  return 1
}

record_desktop_mode() {
  log "Desktop mode: wf-recorder (Plasma compositor — keep bonsAI window visible)"
  if bonsai_try_wfrecorder_record "$RECORD_SECONDS"; then
    RECORD_METHOD="wf-recorder"
    PLUGIN_UI="expected"
    return 0
  fi
  PLUGIN_UI="no"
  log "ERROR: wf-recorder failed on all Wayland sockets."
  return 1
}

record_unknown_mode() {
  log "Unknown mode: try pipewire gamescope then wf-recorder"
  if bonsai_try_pipewire_gamescope_record "$RECORD_SECONDS"; then
    RECORD_METHOD="pipewire-gamescope"
    PLUGIN_UI="expected"
    return 0
  fi
  if bonsai_try_wfrecorder_record "$RECORD_SECONDS"; then
    RECORD_METHOD="wf-recorder"
    PLUGIN_UI="expected"
    return 0
  fi
  PLUGIN_UI="no"
  return 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --mode)
      RECORD_MODE="${2:-}"
      shift 2
      ;;
    --seconds)
      RECORD_SECONDS="${2:-15}"
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

case "$RECORD_MODE" in
  auto|game|desktop) ;;
  *)
    echo "Invalid --mode: $RECORD_MODE" >&2
    exit 2
    ;;
esac

if [ -z "$OUT" ]; then
  if [ -n "${BONSAI_RECORD_OUT:-}" ]; then
    OUT="$BONSAI_RECORD_OUT"
  elif [ "$(id -u)" -eq 0 ] || [ -n "${SUDO_USER:-}" ]; then
    OUT="/tmp/deck_record.mkv"
  else
    UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
    mkdir -p "$UH/Videos" 2>/dev/null
    OUT="$UH/Videos/bonsai-record-$(date +%Y%m%d_%H%M%S).mkv"
  fi
fi

: >"$DIAG"
diag "bonsai-record start epoch=$RUN_EPOCH mode_flag=$RECORD_MODE seconds=$RECORD_SECONDS out=$OUT"

RESOLVED_MODE=$(resolve_capture_mode "$RECORD_MODE")
diag "resolved_mode=$RESOLVED_MODE"

FE=1
case "$RESOLVED_MODE" in
  game) record_game_mode; FE=$? ;;
  desktop) record_desktop_mode; FE=$? ;;
  *) record_unknown_mode; FE=$? ;;
esac

if [ "$FE" -eq 0 ] && validate_recording "$OUT"; then
  log "Record OK: mode=$RESOLVED_MODE method=$RECORD_METHOD plugin_ui=$PLUGIN_UI path=$OUT"
  log "Verify bonsAI UI is visible in the clip (QAM open during capture)."
  emit_record_result
  exit 0
fi

diag "record failed fe=$FE plugin_ui=$PLUGIN_UI"
emit_record_result
exit "${FE:-1}"
