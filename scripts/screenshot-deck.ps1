# Capture Steam Deck UI screenshot to repo screenshots/ (auto-detects game vs desktop mode).
param(
    [ValidateSet('auto', 'game', 'desktop')]
    [string]$Mode = 'auto',
    [switch]$InstallDeckHelper,
    [switch]$Open
)

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

$DeckDir = Join-Path $PSScriptRoot "deck"
$CommonScript = Join-Path $DeckDir "bonsai-capture-common.sh"
$CaptureScript = Join-Path $DeckDir "bonsai-capture.sh"
if (!(Test-Path $CaptureScript) -or !(Test-Path $CommonScript)) {
    Write-Error "Missing $CaptureScript or $CommonScript"
    exit 1
}

function Get-BundledCaptureScript {
    $common = Get-Content -Path $CommonScript -Raw
    $main = Get-Content -Path $CaptureScript -Raw
    $common = $common -replace "`r`n", "`n" -replace "`r", ""
    $main = $main -replace "`r`n", "`n" -replace "`r", ""
    $lines = $main -split "`n"
    $skip = $false
    $body = New-Object System.Collections.Generic.List[string]
    foreach ($line in $lines) {
        if ($line -match '^#!') { continue }
        if ($line -match '^\s*if \[ -z "\$\{BONSAI_CAPTURE_COMMON_LOADED') { $skip = $true; continue }
        if ($skip -and $line -match '^\s*fi\s*$') { $skip = $false; continue }
        if ($skip) { continue }
        $body.Add($line)
    }
    $shebang = ($lines | Where-Object { $_ -match '^#!' } | Select-Object -First 1)
    if (-not $shebang) { $shebang = '#!/usr/bin/env bash' }
    return ($shebang + "`n" + $common + "`nBONSAI_CAPTURE_COMMON_LOADED=1`n" + ($body -join "`n"))
}

if ($InstallDeckHelper) {
    Write-Host "Installing bonsai-capture to ${DeckUser}@${DeckIP}:~/.local/bin/ ..." -ForegroundColor Cyan
    $bundle = Get-BundledCaptureScript
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $tempBundle = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllBytes($tempBundle, $utf8NoBom.GetBytes($bundle))
    ssh "${DeckUser}@${DeckIP}" "mkdir -p ~/.local/bin"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    scp $tempBundle "${DeckUser}@${DeckIP}:~/.local/bin/bonsai-capture"
    Remove-Item $tempBundle -Force
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    ssh "${DeckUser}@${DeckIP}" "chmod +x ~/.local/bin/bonsai-capture"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Installed. On the Deck run: bonsai-capture (or bind ~/.local/bin/bonsai-capture to a hotkey)." -ForegroundColor Green
    }
    exit $LASTEXITCODE
}

$LocalPath = Join-Path $RepoRoot "screenshots"
if (!(Test-Path $LocalPath)) {
    New-Item -ItemType Directory -Path $LocalPath -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RemoteFile = "/tmp/deck_ui_capture.png"
$RemoteDiag = "/tmp/bonsai-capture.diag"
$RemoteResult = "/tmp/bonsai-capture.result"
$LocalFileTemp = Join-Path $LocalPath "DeckCapture_${Timestamp}.png"
$LocalDiag = Join-Path $LocalPath "DeckCapture_${Timestamp}.log"
$LocalResult = Join-Path $LocalPath "DeckCapture_${Timestamp}.result"

Write-Host "Connecting to Steam Deck ($DeckIP)..." -ForegroundColor Cyan
Write-Host "NOTE: You will be prompted for your 'deck' user sudo password." -ForegroundColor Yellow
Write-Host "Mode: $Mode - game: gamescope atom (QAM+bonsAI) -> kmsgrab; desktop: grim -> kmsgrab; auto: detect on Deck." -ForegroundColor DarkGray

$bashContent = Get-BundledCaptureScript
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$b64 = [Convert]::ToBase64String($utf8NoBom.GetBytes($bashContent))

$remoteArgs = "--mode $Mode --out $RemoteFile --diag $RemoteDiag --result $RemoteResult"
if ($env:BONSAI_SCREENSHOT_ALLOW_STEAMOS_RW -eq '0') {
    $remoteArgs = "$remoteArgs --no-steamos-rw"
}
# Plain `sudo bash` (no `env` wrapper) so existing sudoers NOPASSWD rules for /bin/bash apply.
$CaptureCommand = "echo $b64 | base64 -d | sudo bash -s -- $remoteArgs"

ssh "${DeckUser}@${DeckIP}" "sudo rm -f $RemoteFile $RemoteDiag $RemoteResult" 2>$null | Out-Null

# Run ssh fully interactive (no piping/redirection) so the sudo password prompt is visible
# and the user's keystrokes reach sudo. Output is parsed from the SCP'd result file, not stdout.
& ssh -t "${DeckUser}@${DeckIP}" $CaptureCommand
$sshExit = $LASTEXITCODE

scp "${DeckUser}@${DeckIP}:${RemoteResult}" "$LocalResult" 2>$null | Out-Null

$sshOutput = ''
if (Test-Path $LocalResult) {
    $sshOutput = (Get-Content -Path $LocalResult -Raw)
    if ($null -eq $sshOutput) { $sshOutput = '' }
}

$capMode = 'unknown'
$capMethod = 'unknown'
$capBytes = 0
$capPath = $RemoteFile

$resultMatch = [regex]::Match($sshOutput, '---CAPTURE_RESULT---\s+mode=(\S+)\s+method=(\S+)\s+bytes=(\d+)\s+path=(\S+)')
if ($resultMatch.Success) {
    $capMode = $resultMatch.Groups[1].Value.Trim()
    $capMethod = $resultMatch.Groups[2].Value.Trim()
    $capBytes = [int]$resultMatch.Groups[3].Value.Trim()
    $capPath = $resultMatch.Groups[4].Value.Trim()
}

function Download-DiagLog {
    scp "${DeckUser}@${DeckIP}:${RemoteDiag}" "$LocalDiag" 2>$null | Out-Null
    if (Test-Path $LocalDiag) {
        Write-Host "Diagnostic log saved to: $LocalDiag" -ForegroundColor DarkGray
    }
}

if ($sshExit -eq 0 -and $capBytes -ge 51200) {
    Write-Host "`nCapture successful (mode=$capMode method=$capMethod bytes=$capBytes). Downloading..." -ForegroundColor Cyan

    scp "${DeckUser}@${DeckIP}:${capPath}" "$LocalFileTemp"

    if ($?) {
        $suffixMode = if ($capMode -ne 'unknown') { $capMode } else { $Mode }
        $LocalFile = Join-Path $LocalPath "DeckCapture_${Timestamp}_${suffixMode}.png"
        if ($LocalFileTemp -ne $LocalFile) {
            Move-Item -Path $LocalFileTemp -Destination $LocalFile -Force
        } else {
            $LocalFile = $LocalFileTemp
        }

        Write-Host "Cleaning up temporary files on the Deck..." -ForegroundColor Cyan
        ssh "${DeckUser}@${DeckIP}" "sudo rm -f $RemoteFile $RemoteDiag $RemoteResult" 2>$null | Out-Null

        Write-Host "Success! Screenshot saved to: $LocalFile" -ForegroundColor Green
        Write-Host "  mode=$capMode  method=$capMethod  bytes=$capBytes" -ForegroundColor DarkGray

        if ($capMethod -eq 'kmsgrab') {
            Write-Host "WARNING: KMS grab captures primary plane only - QAM and bonsAI overlays are usually missing." -ForegroundColor Yellow
            Write-Host "  Ensure xprop is available and gamescope is running; retry with QAM open in game mode." -ForegroundColor Yellow
        }

        if ($Open -and (Test-Path $LocalFile)) {
            Start-Process $LocalFile
        }
    } else {
        Write-Host "Error: Failed to download the screenshot via SCP." -ForegroundColor Red
        Download-DiagLog
        exit 1
    }
} else {
    $hint = "Ensure the Deck is awake, sudo password is correct, and HDR is disabled."
    if ($sshExit -eq -1 -or $sshOutput -match '\^C') {
        $hint += " If you pressed Ctrl+C, retry after the capture finishes."
    }
    if ($capBytes -gt 0 -and $capBytes -lt 51200) {
        $hint += " Capture produced a tiny/stale PNG ($capBytes bytes) - gamescope atom may not have refreshed /tmp/gamescope.png."
    }
    Write-Host "Error: Failed to capture the screen. $hint" -ForegroundColor Red
    if ($sshOutput) {
        Write-Host $sshOutput -ForegroundColor DarkGray
    }
    Download-DiagLog
    exit 1
}
