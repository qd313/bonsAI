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
RECORD_QUALITY="compressed"
RUN_EPOCH=$(date +%s)
# compressed VP8 clips can be small on quiet UI; full MJPEG is large.
MIN_RECORD_BYTES=100000

bonsai_common_init

usage() {
  cat <<'EOF'
Usage: bonsai-record.sh [options]

Record Steam Deck UI for bonsAI / Decky debugging (composited QAM + plugin UI required for v1).

Options:
  --mode MODE         auto | game | desktop (default: auto)
  --seconds N         Recording duration in seconds (default: 15)
  --quality MODE      compressed (default, VP8) | full (MJPEG / high bitrate)
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

Default --quality compressed keeps clips small (VP8 ~2.5 Mbps). Use --quality full for
near-lossless MJPEG when you need maximum visual fidelity (much larger files).

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
    # Valid partial: promote it to the final path (unless already the same file).
    # Without this move the caller deletes the partial and leaves a 0-byte final.
    if [ "$partial" != "$final" ]; then
      mv -f "$partial" "$final" 2>/dev/null || return 1
      diag "finalize: promoted valid partial -> $final"
    fi
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

bonsai_pw_env_run() {
  # pipewiresrc must talk to the deck user's PipeWire session (not root).
  local uid rd
  uid=$(id -u "$TARGET_USER" 2>/dev/null) || uid=1000
  rd="/run/user/$uid"
  if [ "$(id -u)" -eq 0 ]; then
    sudo -u "$TARGET_USER" env XDG_RUNTIME_DIR="$rd" PATH="$PATH" "$@"
  else
    env XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$rd}" "$@"
  fi
}

bonsai_run_gst_pipewire_target() {
  local target="$1" duration="$2" partial="$3" gst_log="$4"
  local timeout_sec rc quality="${RECORD_QUALITY:-compressed}"
  timeout_sec=$((duration + 8))

  if ! command -v timeout >/dev/null 2>&1; then
    diag "pipewire-gamescope: timeout command missing"
    return 1
  fi

  # Prefer real H.264 when available. Soft fallbacks:
  #   compressed (default) -> vp8enc (~2.5 Mbps) then low-quality jpegenc
  #   full                 -> jpegenc q=85 then high-bitrate vp8enc
  # Do not use on-disconnect=true — pipewiresrc expects enum none|eos|error.
  if gst-inspect-1.0 vah264enc >/dev/null 2>&1; then
    diag "pipewire-gamescope: using encoder=vah264enc quality=$quality"
    if [ "$quality" = "full" ]; then
      bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" \
        ! queue max-size-buffers=4 leaky=downstream \
        ! video/x-raw,format=NV12 \
        ! videoconvert ! vah264enc ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
    else
      bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" \
        ! queue max-size-buffers=4 leaky=downstream \
        ! video/x-raw,format=NV12 \
        ! videoconvert ! vah264enc bitrate=2500 ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
    fi
    rc=$?
  elif gst-inspect-1.0 vaapih264enc >/dev/null 2>&1; then
    diag "pipewire-gamescope: using encoder=vaapih264enc quality=$quality"
    bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
      pipewiresrc do-timestamp=true target-object="$target" \
      ! queue ! video/x-raw,format=NV12 \
      ! videoconvert ! vaapih264enc ! h264parse \
      ! matroskamux ! filesink location="$partial" \
      >>"$gst_log" 2>&1
    rc=$?
  elif gst-inspect-1.0 x264enc >/dev/null 2>&1; then
    diag "pipewire-gamescope: using encoder=x264enc quality=$quality"
    if [ "$quality" = "full" ]; then
      bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" \
        ! queue ! videoconvert ! x264enc speed-preset=fast tune=zerolatency ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
    else
      bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
        pipewiresrc do-timestamp=true target-object="$target" \
        ! queue ! videoconvert ! x264enc speed-preset=ultrafast tune=zerolatency bitrate=2500 ! h264parse \
        ! matroskamux ! filesink location="$partial" \
        >>"$gst_log" 2>&1
    fi
    rc=$?
  elif [ "$quality" = "full" ] && gst-inspect-1.0 jpegenc >/dev/null 2>&1; then
    diag "pipewire-gamescope: using encoder=jpegenc (full quality)"
    bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
      pipewiresrc do-timestamp=true target-object="$target" \
      ! queue max-size-buffers=4 leaky=downstream \
      ! videoconvert ! jpegenc quality=85 \
      ! matroskamux ! filesink location="$partial" \
      >>"$gst_log" 2>&1
    rc=$?
  elif gst-inspect-1.0 vp8enc >/dev/null 2>&1; then
    local vp8_br=2500000
    [ "$quality" = "full" ] && vp8_br=8000000
    diag "pipewire-gamescope: using encoder=vp8enc quality=$quality bitrate=$vp8_br"
    bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
      pipewiresrc do-timestamp=true target-object="$target" \
      ! queue max-size-buffers=4 leaky=downstream \
      ! videoconvert ! vp8enc deadline=1 target-bitrate=$vp8_br \
      ! matroskamux ! filesink location="$partial" \
      >>"$gst_log" 2>&1
    rc=$?
  elif gst-inspect-1.0 jpegenc >/dev/null 2>&1; then
    # Last resort when VP8 missing: lower JPEG quality for size.
    diag "pipewire-gamescope: using encoder=jpegenc quality=40 (compressed last resort)"
    bonsai_pw_env_run timeout --signal=INT "$timeout_sec" gst-launch-1.0 -e \
      pipewiresrc do-timestamp=true target-object="$target" \
      ! queue max-size-buffers=4 leaky=downstream \
      ! videoconvert ! jpegenc quality=40 \
      ! matroskamux ! filesink location="$partial" \
      >>"$gst_log" 2>&1
    rc=$?
  else
    return 1
  fi
  return "$rc"
}

bonsai_try_pipewire_gamescope_record() {
  local duration="$1"
  local partial out_tmp gst_log node_id
  bonsai_ensure_gstreamer_pipewire || {
    diag "pipewire-gamescope: gstreamer/pipewiresrc/encoder not available"
    diag "pipewire-gamescope: need pipewiresrc plus vah264enc/x264enc or jpegenc/vp8enc"
    bonsai_gst_encoder_inventory | while IFS= read -r line; do diag "  $line"; done
    return 1
  }
  if ! bonsai_gst_has_any_encoder; then
    diag "pipewire-gamescope: no encoder found after ensure"
    bonsai_gst_encoder_inventory | while IFS= read -r line; do diag "  $line"; done
    return 1
  fi
  diag "pipewire-gamescope: encoder inventory:"
  bonsai_gst_encoder_inventory | while IFS= read -r line; do diag "  $line"; done

  partial="${OUT}.partial.$$"
  out_tmp="$OUT"
  rm -f "$partial" "$out_tmp" 2>/dev/null
  gst_log=/tmp/bonsai_record_gst.log
  : >"$gst_log"

  # Ask for the compositor's video node by its numeric id, not by name. On SteamOS
  # (measured 2026-09-09) target-object=gamescope connects but never delivers a
  # frame, so the file stays header-only, while the node id records fine. pw-cli
  # prints each node's "id N," line before its properties, so remember the last id
  # seen and report it when the block turns out to be the gamescope video source.
  node_id=$(bonsai_pw_env_run pw-cli ls Node 2>/dev/null | awk '
    /^[[:space:]]*id [0-9]+,/ { if (name && vid) { print id; exit } id=$2; sub(",", "", id); name=0; vid=0 }
    /media\.class = "Video\/Source"/ { vid=1 }
    /node\.name = "gamescope"/ { name=1 }
    END { if (name && vid) print id }')
  if [ -z "$node_id" ]; then
    node_id=$(bonsai_pw_env_run pw-cli ls Node 2>/dev/null | awk '
      /^[[:space:]]*id [0-9]+,/ { id=$2; sub(",", "", id) }
      /node\.name = "gamescope"/ { print id; exit }')
  fi

  if [ -n "$node_id" ]; then
    diag "pipewire-gamescope: starting gst-launch duration=${duration}s target=node id $node_id"
    bonsai_run_gst_pipewire_target "$node_id" "$duration" "$partial" "$gst_log" || true
  else
    diag "pipewire-gamescope: no gamescope video node found in pw-cli ls Node"
  fi

  if [ ! -f "$partial" ] || ! validate_recording "$partial"; then
    diag "pipewire-gamescope: node id path failed (id=${node_id:-none}); trying target-object=gamescope by name"
    rm -f "$partial" 2>/dev/null
    bonsai_run_gst_pipewire_target "gamescope" "$duration" "$partial" "$gst_log" || true
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
    --quality)
      RECORD_QUALITY="${2:-compressed}"
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

case "$RECORD_QUALITY" in
  compressed)
    MIN_RECORD_BYTES=100000
    ;;
  full)
    MIN_RECORD_BYTES=524288
    ;;
  *)
    echo "Invalid --quality: $RECORD_QUALITY (use compressed|full)" >&2
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
diag "bonsai-record start epoch=$RUN_EPOCH mode_flag=$RECORD_MODE seconds=$RECORD_SECONDS quality=$RECORD_QUALITY out=$OUT"

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
