# Load connection details from .env (repo root; same KEY=value rules as scripts/build.ps1)
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path "$RepoRoot\.env") {
    foreach ($line in Get-Content "$RepoRoot\.env") {
        if ($line -match '^\s*([^#]\S+?)\s*=\s*(.+)$') {
            Set-Variable -Name $matches[1] -Value $matches[2].Trim()
        }
    }
}

$DeckIP = $DECK_IP
$DeckUser = $DECK_USER

if ([string]::IsNullOrWhiteSpace($DeckIP) -or [string]::IsNullOrWhiteSpace($DeckUser)) {
    Write-Error "DECK_IP and DECK_USER must be set in .env at repo root, or define `$DECK_IP and `$DECK_USER before running this script."
    exit 1
}

$LocalPath = Join-Path $RepoRoot "screenshots"
if (!(Test-Path $LocalPath)) {
    New-Item -ItemType Directory -Path $LocalPath -Force | Out-Null
}

# Create a timestamp for a unique filename
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LocalFile = Join-Path $LocalPath "DeckCapture_$Timestamp.png"
$RemoteFile = "/tmp/deck_ui_capture.png"

Write-Host "Connecting to Steam Deck ($DeckIP)..." -ForegroundColor Cyan
Write-Host "NOTE: You will be prompted for your 'deck' user sudo password." -ForegroundColor Yellow
Write-Host "Capture order: Gamescope X11 atom (composited, includes QAM) -> grim (Wayland) -> ffmpeg kmsgrab (game-only fallback)." -ForegroundColor DarkGray

$allowSteamosRwToggle = 'true'
if ($env:BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW -eq '0') { $allowSteamosRwToggle = 'false' }

# Remote: Gamescope atom requests a full-composition PNG; grim uses Wayland screencopy; kmsgrab is primary-plane only when a game is fullscreen.
# Single-quoted here-string so PowerShell does not eat bash $ variables.
$remoteScript = @'
set +e
OUT=
'@ + $RemoteFile + @'

CAPTURE_METHOD="kmsgrab"
TARGET_USER="${SUDO_USER:-deck}"
RD="/run/user/$(id -u "$TARGET_USER" 2>/dev/null || id -u deck)"
BONSAI_ALLOW_STEAMOS_RW=__BONSAI_ALLOW_STEAMOS_RW__
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
  # Collect candidate (DISPLAY, XAUTHORITY) pairs from gamescope-related processes.
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
  # De-dup (preserve order).
  cands=$(awk '!seen[$0]++' "$cand")
  rm -f "$cand"
  # Always also try the obvious gamescope display values without explicit XAUTHORITY.
  for d in :0 :1 :2; do
    case $cands in *"$d|"*) ;; *) cands="$cands"$'\n'"$d|" ;; esac
  done
  rm -f "$GS_OUT" 2>/dev/null || sudo rm -f "$GS_OUT" 2>/dev/null || true
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    d="${line%%|*}"
    xa="${line#*|}"
    # Run xprop as the deck user so it can read its X cookie.
    if [ -n "$xa" ]; then
      sudo -u "$TARGET_USER" env DISPLAY="$d" XAUTHORITY="$xa" xprop -root -f GAMESCOPECTRL_REQUEST_SCREENSHOT 32c -set GAMESCOPECTRL_REQUEST_SCREENSHOT 3 >/dev/null 2>&1
    else
      sudo -u "$TARGET_USER" env DISPLAY="$d" xprop -root -f GAMESCOPECTRL_REQUEST_SCREENSHOT 32c -set GAMESCOPECTRL_REQUEST_SCREENSHOT 3 >/dev/null 2>&1
    fi
    rc=$?
    [ "$rc" != 0 ] && continue
    # Wait briefly for /tmp/gamescope.png to appear/refresh.
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
if bonsai_try_gamescope_atom_screenshot; then
  CAPTURE_METHOD="gamescope-atom"
  echo "---CAPTURE_METHOD---"
  echo "$CAPTURE_METHOD"
  exit 0
fi
# Install grim without pacman (avoids broken/missing keyring in some SSH/sudo contexts).
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
'@
# Normalize to LF for base64 → Linux bash; inject SteamOS read-only toggle preference.
$remoteScript = $remoteScript -replace "`r`n", "`n" -replace "`r", ""
$remoteScript = $remoteScript -replace '__BONSAI_ALLOW_STEAMOS_RW__', $allowSteamosRwToggle
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$b64 = [Convert]::ToBase64String($utf8NoBom.GetBytes($remoteScript))
$CaptureCommand = "echo $b64 | base64 -d | sudo bash"

$sshOutput = (ssh -t "${DeckUser}@${DeckIP}" $CaptureCommand 2>&1 | ForEach-Object { "$_" }) -join "`n"
$sshExit = $LASTEXITCODE

$capMethod = "unknown"
$capMatches = [regex]::Matches($sshOutput, '---CAPTURE_METHOD---\s*(\S+)')
if ($capMatches.Count -gt 0) {
    $capMethod = $capMatches[$capMatches.Count - 1].Groups[1].Value.Trim()
}

if ($sshExit -eq 0) {
    Write-Host "`nCapture successful! Downloading screenshot..." -ForegroundColor Cyan

    # 2. Download the file via SCP
    scp "${DeckUser}@${DeckIP}:${RemoteFile}" "$LocalFile"

    if ($?) {
        Write-Host "Cleaning up temporary files on the Deck..." -ForegroundColor Cyan

        # 3. Clean up the image left on the Deck (capture ran under sudo, so the file is root-owned)
        ssh -t "${DeckUser}@${DeckIP}" "sudo rm -f $RemoteFile"

        Write-Host "Success! Full UI screenshot saved to: $LocalFile" -ForegroundColor Green
        if ($capMethod -eq "kmsgrab") {
            Write-Host "Capture used KMS grab (primary plane only when a game is fullscreen). Gamescope atom and grim both failed; check that xprop is available and grim can reach the compositor socket, or run with QAM closed and retry." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Error: Failed to download the screenshot via SCP." -ForegroundColor Red
    }
} else {
    $hint = "Ensure the Deck is awake, sudo password is correct, and HDR is disabled."
    if ($sshExit -eq -1 -or $sshOutput -match '\^C') {
        $hint += " If you pressed Ctrl+C, grim may have been waiting on Wayland; this version uses per-socket timeouts and should fall back to KMS."
    }
    Write-Host "Error: Failed to capture the screen. $hint" -ForegroundColor Red
}
