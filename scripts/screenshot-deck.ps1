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

# Command to use ffmpeg with kmsgrab to pull the raw DRM buffer (captures game + QAM + Plugins)
$CaptureCommand = "sudo ffmpeg -loglevel error -device /dev/dri/card0 -f kmsgrab -i - -vframes 1 -vf 'hwmap=derive_device=vaapi,hwdownload,format=bgr0' -y $RemoteFile"

# 1. SSH into the Deck and execute the capture
ssh -t "${DeckUser}@${DeckIP}" $CaptureCommand

if ($?) {
    Write-Host "`nCapture successful! Downloading screenshot..." -ForegroundColor Cyan

    # 2. Download the file via SCP
    scp "${DeckUser}@${DeckIP}:${RemoteFile}" "$LocalFile"

    if ($?) {
        Write-Host "Cleaning up temporary files on the Deck..." -ForegroundColor Cyan

        # 3. Clean up the image left on the Deck (capture ran under sudo, so the file is root-owned)
        ssh -t "${DeckUser}@${DeckIP}" "sudo rm -f $RemoteFile"

        Write-Host "Success! Full UI screenshot saved to: $LocalFile" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to download the screenshot via SCP." -ForegroundColor Red
    }
} else {
    Write-Host "Error: Failed to capture the screen. Ensure your Deck is awake, you entered the correct password, and HDR is disabled." -ForegroundColor Red
}
