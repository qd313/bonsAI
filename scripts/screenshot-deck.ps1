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

$LibPath = Join-Path $PSScriptRoot "lib\deck-ui-capture-remote.sh"
if (!(Test-Path $LibPath)) {
    Write-Error "Missing capture library: $LibPath"
    exit 1
}
$remoteScript = Get-Content -Raw -Path $LibPath
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
