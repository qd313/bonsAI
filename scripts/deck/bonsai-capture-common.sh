# bonsai-capture-common.sh — shared Deck capture helpers (screenshots + recording).
# Sourced by bonsai-capture.sh and bonsai-record.sh; not executed directly.

bonsai_common_init() {
  TARGET_USER="${SUDO_USER:-${USER:-deck}}"
  RD="/run/user/$(id -u "$TARGET_USER" 2>/dev/null || id -u deck)"
  BONSAI_ALLOW_STEAMOS_RW="${BONSAI_ALLOW_STEAMOS_RW:-true}"
}

bonsai_diag() {
  [ -n "${DIAG:-}" ] && echo "$*" >>"$DIAG"
}

bonsai_log() {
  [ "${QUIET:-0}" = 1 ] && return
  echo "$*" >&2
}

detect_mode() {
  local deck_uid
  deck_uid=$(id -u "$TARGET_USER" 2>/dev/null) || deck_uid=1000
  if pgrep -x gamescope >/dev/null 2>&1 || pgrep -x gamescope-wl >/dev/null 2>&1; then
    local gs_pids pid owner
    gs_pids=$(pgrep -x gamescope 2>/dev/null; pgrep -x gamescope-wl 2>/dev/null)
    for pid in $gs_pids; do
      owner=$(stat -c%U "/proc/$pid" 2>/dev/null || echo "")
      if [ "$owner" = "$TARGET_USER" ] || [ -z "$owner" ]; then
        bonsai_diag "detect_mode: game (gamescope pid=$pid owner=$owner)"
        echo "game"
        return 0
      fi
    done
    bonsai_diag "detect_mode: game (gamescope running)"
    echo "game"
    return 0
  fi
  if pgrep -x plasmashell >/dev/null 2>&1 || pgrep -x kwin_wayland >/dev/null 2>&1; then
    bonsai_diag "detect_mode: desktop (plasmashell/kwin_wayland)"
    echo "desktop"
    return 0
  fi
  bonsai_diag "detect_mode: unknown"
  echo "unknown"
}

resolve_capture_mode() {
  local mode_flag="${1:-auto}"
  if [ "$mode_flag" = "auto" ]; then
    detect_mode
  else
    echo "$mode_flag"
  fi
}

bonsai_env_from_pid() {
  local pid="$1"
  [ -r "/proc/$pid/environ" ] || return 1
  local envf d xa
  envf=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null)
  d=$(echo "$envf" | sed -n 's/^DISPLAY=//p' | head -1)
  [ -z "$d" ] && return 1
  xa=$(echo "$envf" | sed -n 's/^XAUTHORITY=//p' | head -1)
  echo "$d|$xa"
  return 0
}

grim_sock_add() {
  local sp="$1"
  [ -S "$sp" ] || return
  local e
  for e in "${grim_socks[@]}"; do
    [ "$e" = "$sp" ] && return
  done
  grim_socks+=("$sp")
}

bonsai_scan_procs_for_wayland_sockets() {
  local seen deck_uid pid envf w r k
  seen=/tmp/bonsai_wlseen.$$
  : >"$seen"
  deck_uid=$(id -u "$TARGET_USER" 2>/dev/null) || deck_uid=1000
  for pid in $(pgrep -x plasmashell 2>/dev/null) $(pgrep -x kwin_wayland 2>/dev/null) \
    $(pgrep -u "$deck_uid" plasmashell 2>/dev/null) $(pgrep -u "$deck_uid" 2>/dev/null | head -30); do
    [ -r "/proc/$pid/environ" ] || continue
    envf=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null)
    w=$(echo "$envf" | sed -n 's/^WAYLAND_DISPLAY=//p' | head -1)
    r=$(echo "$envf" | sed -n 's/^XDG_RUNTIME_DIR=//p' | head -1)
    [ -n "$w" ] && [ -n "$r" ] && [ -S "$r/$w" ] || continue
    k="${r}|${w}"
    grep -qxF "$k" "$seen" 2>/dev/null && continue
    echo "$k" >>"$seen"
    grim_sock_add "$r/$w"
    bonsai_diag "wayland-socket: from pid=$pid -> $r/$w"
  done
  rm -f "$seen"
}

bonsai_collect_wayland_sockets() {
  local sock
  shopt -s nullglob
  grim_socks=()
  bonsai_scan_procs_for_wayland_sockets
  for sock in "$RD"/wayland-*; do
    case "$sock" in *-ei) continue ;; esac
    grim_sock_add "$sock"
  done
}

bonsai_install_grim_portable() {
  local UH GBIN GEXE PKG url ok
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  GBIN="$UH/.local/bin"
  GEXE="$GBIN/grim"
  [ -x "$GEXE" ] && return 0
  mkdir -p "$GBIN"
  PKG=/tmp/bonsai_grim.pkg.tar.zst
  rm -f "$PKG"
  ok=0
  for url in \
    "https://steamdeck-packages.steamos.cloud/archlinux-mirror/extra/os/x86_64/grim-1.5.0-1-x86_64.pkg.tar.zst" \
    "https://geo.mirror.pkgbuild.com/extra/os/x86_64/grim-1.5.0-1-x86_64.pkg.tar.zst" \
    "https://archive.archlinux.org/packages/g/grim/grim-1.5.0-1-x86_64.pkg.tar.zst"
  do
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL --connect-timeout 12 --max-time 90 "$url" -o "$PKG" 2>/dev/null && ok=1 && break
    fi
    if command -v wget >/dev/null 2>&1; then
      wget -q --timeout=90 --tries=1 "$url" -O "$PKG" 2>/dev/null && ok=1 && break
    fi
  done
  [ "$ok" = 1 ] && [ -f "$PKG" ] || return 1
  rm -rf /tmp/bonsai_grim_extract && mkdir -p /tmp/bonsai_grim_extract
  if ! bsdtar -xf "$PKG" -C /tmp/bonsai_grim_extract usr/bin/grim 2>/dev/null; then
    tar -I zstd -xf "$PKG" -C /tmp/bonsai_grim_extract usr/bin/grim 2>/dev/null || return 1
  fi
  install -m 755 /tmp/bonsai_grim_extract/usr/bin/grim "$GEXE"
  chown "$TARGET_USER:$(id -gn "$TARGET_USER" 2>/dev/null || echo "$TARGET_USER")" "$GBIN" "$GEXE" 2>/dev/null || \
    chown "$TARGET_USER:$TARGET_USER" "$GBIN" "$GEXE"
  [ -x "$GEXE" ]
}

bonsai_resolve_grim_exe() {
  local UH
  if command -v grim >/dev/null 2>&1; then
    command -v grim
    return 0
  fi
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  if [ -x "$UH/.local/bin/grim" ]; then
    echo "$UH/.local/bin/grim"
    return 0
  fi
  return 1
}

bonsai_ensure_grim() {
  local UH
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  if command -v grim >/dev/null 2>&1 || [ -x "$UH/.local/bin/grim" ]; then
    return 0
  fi
  if bonsai_install_grim_portable >>/tmp/bonsai_grim_install.log 2>&1; then
    return 0
  fi
  : >/tmp/bonsai_grim_install.log
  if sudo pacman -Sy --needed --noconfirm grim >>/tmp/bonsai_grim_install.log 2>&1 && command -v grim >/dev/null 2>&1; then
    return 0
  fi
  case "$BONSAI_ALLOW_STEAMOS_RW" in
    0|false|FALSE|no|NO) return 1 ;;
  esac
  if ! command -v steamos-readonly >/dev/null 2>&1; then
    return 1
  fi
  if ! sudo steamos-readonly disable >>/tmp/bonsai_grim_install.log 2>&1; then
    return 1
  fi
  sudo pacman -Sy --needed --noconfirm grim >>/tmp/bonsai_grim_install.log 2>&1 || true
  if ! sudo steamos-readonly enable >>/tmp/bonsai_grim_install.log 2>&1; then
    bonsai_log "WARNING: steamos-readonly enable failed after grim install attempt."
  fi
  command -v grim >/dev/null 2>&1
}

bonsai_install_wfrecorder_portable() {
  local UH WBIN WEXE PKG url ok
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  WBIN="$UH/.local/bin"
  WEXE="$WBIN/wf-recorder"
  [ -x "$WEXE" ] && return 0
  mkdir -p "$WBIN"
  PKG=/tmp/bonsai_wfrecorder.pkg.tar.zst
  rm -f "$PKG"
  ok=0
  for url in \
    "https://steamdeck-packages.steamos.cloud/archlinux-mirror/extra/os/x86_64/wf-recorder-0.5.0-1-x86_64.pkg.tar.zst" \
    "https://geo.mirror.pkgbuild.com/extra/os/x86_64/wf-recorder-0.5.0-1-x86_64.pkg.tar.zst" \
    "https://archive.archlinux.org/packages/w/wf-recorder/wf-recorder-0.5.0-1-x86_64.pkg.tar.zst"
  do
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL --connect-timeout 12 --max-time 90 "$url" -o "$PKG" 2>/dev/null && ok=1 && break
    fi
    if command -v wget >/dev/null 2>&1; then
      wget -q --timeout=90 --tries=1 "$url" -O "$PKG" 2>/dev/null && ok=1 && break
    fi
  done
  [ "$ok" = 1 ] && [ -f "$PKG" ] || return 1
  rm -rf /tmp/bonsai_wfrecorder_extract && mkdir -p /tmp/bonsai_wfrecorder_extract
  if ! bsdtar -xf "$PKG" -C /tmp/bonsai_wfrecorder_extract usr/bin/wf-recorder 2>/dev/null; then
    tar -I zstd -xf "$PKG" -C /tmp/bonsai_wfrecorder_extract usr/bin/wf-recorder 2>/dev/null || return 1
  fi
  install -m 755 /tmp/bonsai_wfrecorder_extract/usr/bin/wf-recorder "$WEXE"
  chown "$TARGET_USER:$(id -gn "$TARGET_USER" 2>/dev/null || echo "$TARGET_USER")" "$WBIN" "$WEXE" 2>/dev/null || \
    chown "$TARGET_USER:$TARGET_USER" "$WBIN" "$WEXE"
  [ -x "$WEXE" ]
}

bonsai_resolve_wfrecorder_exe() {
  local UH
  if command -v wf-recorder >/dev/null 2>&1; then
    command -v wf-recorder
    return 0
  fi
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  if [ -x "$UH/.local/bin/wf-recorder" ]; then
    echo "$UH/.local/bin/wf-recorder"
    return 0
  fi
  return 1
}

bonsai_ensure_wfrecorder() {
  local UH
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  if command -v wf-recorder >/dev/null 2>&1 || [ -x "$UH/.local/bin/wf-recorder" ]; then
    return 0
  fi
  if bonsai_install_wfrecorder_portable >>/tmp/bonsai_wfrecorder_install.log 2>&1; then
    return 0
  fi
  : >/tmp/bonsai_wfrecorder_install.log
  if sudo pacman -Sy --needed --noconfirm wf-recorder >>/tmp/bonsai_wfrecorder_install.log 2>&1 && command -v wf-recorder >/dev/null 2>&1; then
    return 0
  fi
  case "$BONSAI_ALLOW_STEAMOS_RW" in
    0|false|FALSE|no|NO) return 1 ;;
  esac
  if ! command -v steamos-readonly >/dev/null 2>&1; then
    return 1
  fi
  if ! sudo steamos-readonly disable >>/tmp/bonsai_wfrecorder_install.log 2>&1; then
    return 1
  fi
  sudo pacman -Sy --needed --noconfirm wf-recorder >>/tmp/bonsai_wfrecorder_install.log 2>&1 || true
  if ! sudo steamos-readonly enable >>/tmp/bonsai_wfrecorder_install.log 2>&1; then
    bonsai_log "WARNING: steamos-readonly enable failed after wf-recorder install attempt."
  fi
  command -v wf-recorder >/dev/null 2>&1
}

bonsai_ensure_gstreamer_pipewire() {
  if command -v gst-launch-1.0 >/dev/null 2>&1 && \
     gst-inspect-1.0 pipewiresrc >/dev/null 2>&1; then
    return 0
  fi
  if sudo pacman -Sy --needed --noconfirm gstreamer gst-plugin-pipewire gst-plugins-good ffmpeg \
      >>/tmp/bonsai_gst_install.log 2>&1; then
    command -v gst-launch-1.0 >/dev/null 2>&1 && gst-inspect-1.0 pipewiresrc >/dev/null 2>&1
    return $?
  fi
  case "$BONSAI_ALLOW_STEAMOS_RW" in
    0|false|FALSE|no|NO) return 1 ;;
  esac
  if ! command -v steamos-readonly >/dev/null 2>&1; then
    return 1
  fi
  if ! sudo steamos-readonly disable >>/tmp/bonsai_gst_install.log 2>&1; then
    return 1
  fi
  sudo pacman -Sy --needed --noconfirm gstreamer gst-plugin-pipewire gst-plugins-good ffmpeg \
    >>/tmp/bonsai_gst_install.log 2>&1 || true
  sudo steamos-readonly enable >>/tmp/bonsai_gst_install.log 2>&1 || true
  command -v gst-launch-1.0 >/dev/null 2>&1 && gst-inspect-1.0 pipewiresrc >/dev/null 2>&1
}

bonsai_gst_has_va_h264() {
  gst-inspect-1.0 vah264enc >/dev/null 2>&1 || \
    gst-inspect-1.0 vaapih264enc >/dev/null 2>&1 || \
    gst-inspect-1.0 x264enc >/dev/null 2>&1
}
