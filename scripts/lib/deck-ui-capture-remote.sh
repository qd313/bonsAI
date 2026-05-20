#!/usr/bin/env bash
# Remote/local Deck UI capture: gamescope atom -> grim -> kmsgrab.
# Sourced or run under sudo; wrappers substitute __BONSAI_ALLOW_STEAMOS_RW__ before execution.
set +e
OUT=/tmp/deck_ui_capture.png
CAPTURE_METHOD="kmsgrab"
TARGET_USER="${SUDO_USER:-deck}"
RD="/run/user/$(id -u "$TARGET_USER" 2>/dev/null || id -u deck)"
BONSAI_ALLOW_STEAMOS_RW=__BONSAI_ALLOW_STEAMOS_RW__

# Progress messages go to stderr so the outer wrapper streams them to the user
# but they do not interfere with stdout parsing of ---CAPTURE_METHOD---.
bonsai_progress() { printf '[capture] %s\n' "$*" >&2; }

# Game Mode = gamescope is the DRM master / compositor. In Desktop Mode (Plasma),
# Plasma owns the DRM master so ffmpeg kmsgrab cannot work (it hangs until timeout).
GS_RUNNING=0
if pgrep -x gamescope >/dev/null 2>&1 || pgrep -x gamescope-wl >/dev/null 2>&1; then
  GS_RUNNING=1
fi
bonsai_progress "session: $([ "$GS_RUNNING" -eq 1 ] && echo 'Game Mode (gamescope)' || echo 'Desktop Mode (no gamescope)')"

# Trigger Gamescope's own composited screenshot via X11 atom.
# Reference: ValveSoftware/gamescope src/steamcompmgr.cpp:~5379 + protocol/gamescope-control.xml.
# Setting GAMESCOPECTRL_REQUEST_SCREENSHOT (CARDINAL/32) on the gamescope X server's root window:
#   1 = base_plane_only, 2 = all_real_layers, 3 = full_composition, 4 = screen_buffer
# Output is always written to /tmp/gamescope.png (overwritten each call).
bonsai_try_gamescope_atom_screenshot() {
  GS_OUT=/tmp/gamescope.png
  if ! command -v xprop >/dev/null 2>&1; then
    return 1
  fi
  cand=/tmp/bonsai_xcands.$$
  : >"$cand"
  deck_uid=$(id -u "$TARGET_USER" 2>/dev/null) || deck_uid=1000
  pids="$(pgrep -x gamescope 2>/dev/null) $(pgrep -x gamescope-wl 2>/dev/null) $(pgrep -x steam 2>/dev/null) $(pgrep -x steamwebhelper 2>/dev/null | head -10) $(pgrep -u "$deck_uid" 2>/dev/null | head -50)"
  for pid in $pids; do
    [ -r "/proc/$pid/environ" ] || continue
    envf=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null)
    d=$(echo "$envf" | sed -n 's/^DISPLAY=//p' | head -1)
    [ -z "$d" ] && continue
    xa=$(echo "$envf" | sed -n 's/^XAUTHORITY=//p' | head -1)
    echo "$d|$xa" >>"$cand"
  done
  cands=$(awk '!seen[$0]++' "$cand")
  rm -f "$cand"
  for d in :0 :1 :2; do
    case $cands in *"$d|"*) ;; *) cands="$cands"$'\n'"$d|" ;; esac
  done
  rm -f "$GS_OUT" 2>/dev/null || sudo rm -f "$GS_OUT" 2>/dev/null || true
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    d="${line%%|*}"
    xa="${line#*|}"
    if [ -n "$xa" ]; then
      sudo -u "$TARGET_USER" env DISPLAY="$d" XAUTHORITY="$xa" xprop -root -f GAMESCOPECTRL_REQUEST_SCREENSHOT 32c -set GAMESCOPECTRL_REQUEST_SCREENSHOT 3 >/dev/null 2>&1
    else
      sudo -u "$TARGET_USER" env DISPLAY="$d" xprop -root -f GAMESCOPECTRL_REQUEST_SCREENSHOT 32c -set GAMESCOPECTRL_REQUEST_SCREENSHOT 3 >/dev/null 2>&1
    fi
    rc=$?
    [ "$rc" != 0 ] && continue
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
      [ -s "$GS_OUT" ] && break
      sleep 0.25
    done
    if [ -s "$GS_OUT" ]; then
      cp "$GS_OUT" "$OUT" && chmod 0644 "$OUT" 2>/dev/null
      return 0
    fi
  done <<EOF_CANDS
$cands
EOF_CANDS
  return 1
}
bonsai_progress "trying gamescope X11 atom (composited)..."
if bonsai_try_gamescope_atom_screenshot; then
  CAPTURE_METHOD="gamescope-atom"
  echo "---CAPTURE_METHOD---"
  echo "$CAPTURE_METHOD"
  exit 0
fi
bonsai_progress "gamescope atom path failed; trying grim (Wayland)..."

# X11 desktop capture: when gamescope is not running, capture the Plasma X11
# session root window via ffmpeg x11grab (preferred, no DRM master needed),
# falling back to ImageMagick `import` or `xwd | convert`. Reuses the
# DISPLAY/XAUTHORITY discovery logic so it picks up the live deck user session.
bonsai_try_x11_desktop_capture() {
  # ffmpeg is the universal fallback because it's already required for kmsgrab.
  # import/xwd are only used when ffmpeg x11grab does not work or is missing.
  command -v ffmpeg >/dev/null 2>&1 \
    || command -v import >/dev/null 2>&1 \
    || command -v xwd >/dev/null 2>&1 \
    || return 1
  local cand_x deck_uid_x pids_x envf_x d_x xa_x cands_x tmp_xwd ok=1
  cand_x=/tmp/bonsai_xcands_x11.$$
  : >"$cand_x"
  deck_uid_x=$(id -u "$TARGET_USER" 2>/dev/null) || deck_uid_x=1000
  pids_x="$(pgrep -u "$deck_uid_x" 2>/dev/null | head -80)"
  for pid in $pids_x; do
    [ -r "/proc/$pid/environ" ] || continue
    envf_x=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null)
    d_x=$(echo "$envf_x" | sed -n 's/^DISPLAY=//p' | head -1)
    [ -z "$d_x" ] && continue
    xa_x=$(echo "$envf_x" | sed -n 's/^XAUTHORITY=//p' | head -1)
    echo "$d_x|$xa_x" >>"$cand_x"
  done
  cands_x=$(awk '!seen[$0]++' "$cand_x")
  rm -f "$cand_x"
  rm -f "$OUT" 2>/dev/null || true
  : >/tmp/bonsai_x11_err.log
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    d_x="${line%%|*}"
    xa_x="${line#*|}"
    # ffmpeg x11grab works without DRM master (uses X11 protocol).
    # No video_size = auto-detect screen size on modern ffmpeg (>=4.x).
    if command -v ffmpeg >/dev/null 2>&1; then
      if [ -n "$xa_x" ]; then
        sudo -u "$TARGET_USER" env DISPLAY="$d_x" XAUTHORITY="$xa_x" \
          ffmpeg -loglevel error -f x11grab -i "$d_x" -vframes 1 -y "$OUT" 2>>/tmp/bonsai_x11_err.log
      else
        sudo -u "$TARGET_USER" env DISPLAY="$d_x" \
          ffmpeg -loglevel error -f x11grab -i "$d_x" -vframes 1 -y "$OUT" 2>>/tmp/bonsai_x11_err.log
      fi
      if [ -s "$OUT" ]; then
        chmod 0644 "$OUT" 2>/dev/null
        return 0
      fi
    fi
    if command -v import >/dev/null 2>&1; then
      if [ -n "$xa_x" ]; then
        sudo -u "$TARGET_USER" env DISPLAY="$d_x" XAUTHORITY="$xa_x" import -window root "$OUT" 2>>/tmp/bonsai_x11_err.log
      else
        sudo -u "$TARGET_USER" env DISPLAY="$d_x" import -window root "$OUT" 2>>/tmp/bonsai_x11_err.log
      fi
      if [ -s "$OUT" ]; then
        chmod 0644 "$OUT" 2>/dev/null
        return 0
      fi
    fi
    if command -v xwd >/dev/null 2>&1 && command -v convert >/dev/null 2>&1; then
      tmp_xwd=/tmp/bonsai_root.xwd
      if [ -n "$xa_x" ]; then
        sudo -u "$TARGET_USER" env DISPLAY="$d_x" XAUTHORITY="$xa_x" xwd -root -silent -out "$tmp_xwd" 2>>/tmp/bonsai_x11_err.log
      else
        sudo -u "$TARGET_USER" env DISPLAY="$d_x" xwd -root -silent -out "$tmp_xwd" 2>>/tmp/bonsai_x11_err.log
      fi
      if [ -s "$tmp_xwd" ]; then
        convert "$tmp_xwd" "$OUT" 2>>/tmp/bonsai_x11_err.log
        rm -f "$tmp_xwd"
        if [ -s "$OUT" ]; then
          chmod 0644 "$OUT" 2>/dev/null
          return 0
        fi
      fi
    fi
  done <<EOF_X
$cands_x
EOF_X
  ok=0
  return 1
}
bonsai_install_grim_portable() {
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
  UH=$(getent passwd "$TARGET_USER" | cut -d: -f6)
  if command -v grim >/dev/null 2>&1 || [ -x "$UH/.local/bin/grim" ]; then
    return 0
  fi
  if bonsai_install_grim_portable >>/tmp/bonsai_grim_install.log 2>&1; then
    return 0
  fi
  : > /tmp/bonsai_grim_install.log
  if sudo pacman -Sy --needed --noconfirm grim >>/tmp/bonsai_grim_install.log 2>&1 && command -v grim >/dev/null 2>&1; then
    return 0
  fi
  if [ "$BONSAI_ALLOW_STEAMOS_RW" != "true" ]; then
    return 1
  fi
  if ! command -v steamos-readonly >/dev/null 2>&1; then
    return 1
  fi
  if ! sudo steamos-readonly disable >>/tmp/bonsai_grim_install.log 2>&1; then
    return 1
  fi
  sudo pacman -Sy --needed --noconfirm grim >>/tmp/bonsai_grim_install.log 2>&1 || true
  if ! sudo steamos-readonly enable >>/tmp/bonsai_grim_install.log 2>&1; then
    echo "WARNING: steamos-readonly enable failed after grim install attempt." >&2
  fi
  if command -v grim >/dev/null 2>&1; then
    return 0
  fi
  return 1
}
grim_sock_add() {
  sp="$1"
  [ -S "$sp" ] || return
  for e in "${grim_socks[@]}"; do
    [ "$e" = "$sp" ] && return
  done
  grim_socks+=("$sp")
}
bonsai_scan_procs_for_wayland_sockets() {
  seen=/tmp/bonsai_wlseen.$$
  : >"$seen"
  deck_uid=$(id -u "$TARGET_USER" 2>/dev/null) || deck_uid=1000
  for pid in $(pgrep -u "$deck_uid" 2>/dev/null) $(pgrep gamescope 2>/dev/null | head -20) $(pgrep steamwebhelper 2>/dev/null | head -30); do
    [ -r "/proc/$pid/environ" ] || continue
    envf=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null)
    w=$(echo "$envf" | sed -n 's/^WAYLAND_DISPLAY=//p' | head -1)
    r=$(echo "$envf" | sed -n 's/^XDG_RUNTIME_DIR=//p' | head -1)
    [ -n "$w" ] && [ -n "$r" ] && [ -S "$r/$w" ] || continue
    k="${r}|${w}"
    grep -qxF "$k" "$seen" 2>/dev/null && continue
    echo "$k" >>"$seen"
    grim_sock_add "$r/$w"
  done
  rm -f "$seen"
}
bonsai_ensure_grim || true
GRIM_EXE=$(bonsai_resolve_grim_exe) || GRIM_EXE=""
if [ -n "$GRIM_EXE" ]; then
  shopt -s nullglob
  grim_socks=()
  bonsai_scan_procs_for_wayland_sockets
  for sock in "$RD"/wayland-*; do
    case "$sock" in *-ei) continue ;; esac
    grim_sock_add "$sock"
  done
  for sock in "$RD"/gamescope-*; do
    case "$sock" in *-ei) continue ;; esac
    grim_sock_add "$sock"
  done
  for sock in "$RD"/*-ei; do
    [ -S "$sock" ] || continue
    grim_sock_add "$sock"
  done
  GRIM_DEADLINE=45
  for sock in "${grim_socks[@]}"; do
    [ -S "$sock" ] || continue
    wl=$(basename "$sock")
    sock_rd=$(dirname "$sock")
    grim_ok=0
    if command -v timeout >/dev/null 2>&1; then
      if sudo -u "$TARGET_USER" env XDG_RUNTIME_DIR="$sock_rd" WAYLAND_DISPLAY="$wl" timeout "$GRIM_DEADLINE" "$GRIM_EXE" -t png "$OUT" 2>/tmp/bonsai_grim_err.log; then
        grim_ok=1
      fi
    else
      if sudo -u "$TARGET_USER" env XDG_RUNTIME_DIR="$sock_rd" WAYLAND_DISPLAY="$wl" "$GRIM_EXE" -t png "$OUT" 2>/tmp/bonsai_grim_err.log; then
        grim_ok=1
      fi
    fi
    if [ "$grim_ok" = 1 ]; then
      CAPTURE_METHOD="grim"
      echo "---CAPTURE_METHOD---"
      echo "$CAPTURE_METHOD"
      exit 0
    fi
  done
fi
# Desktop Mode: skip kmsgrab (Plasma owns DRM master, ffmpeg will hang ~90s).
# Try X11 root-window capture instead; fast-fail with a helpful message otherwise.
if [ "$GS_RUNNING" -eq 0 ]; then
  bonsai_progress "Desktop Mode detected; trying X11 root capture (ffmpeg x11grab/import/xwd)..."
  if bonsai_try_x11_desktop_capture; then
    CAPTURE_METHOD="x11-root"
    bonsai_progress "captured via X11 root window."
    echo "---CAPTURE_METHOD---"
    echo "$CAPTURE_METHOD"
    exit 0
  fi
  bonsai_progress "ERROR: no usable capture path in Desktop Mode."
  bonsai_progress "ffmpeg x11grab stderr tail: $(tail -c 300 /tmp/bonsai_x11_err.log 2>/dev/null | tr '\n' ' ')"
  bonsai_progress "Hint: switch to Game Mode for gamescope capture, or install ImageMagick ('sudo pacman -S imagemagick')."
  echo "---CAPTURE_METHOD---"
  echo "none-desktop-mode"
  exit 2
fi

bonsai_progress "trying ffmpeg kmsgrab (Game Mode fallback)..."
if command -v timeout >/dev/null 2>&1; then
  timeout 90 ffmpeg -loglevel error -device /dev/dri/card0 -f kmsgrab -i - -vframes 1 -vf 'hwmap=derive_device=vaapi,hwdownload,format=bgr0' -y "$OUT"
  FE=$?
else
  ffmpeg -loglevel error -device /dev/dri/card0 -f kmsgrab -i - -vframes 1 -vf 'hwmap=derive_device=vaapi,hwdownload,format=bgr0' -y "$OUT"
  FE=$?
fi
echo "---CAPTURE_METHOD---"
echo "$CAPTURE_METHOD"
exit $FE
