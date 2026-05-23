# Capture Steam Deck UI recording to repo recordings/ (composited QAM + bonsAI required).
param(
    [ValidateSet('auto', 'game', 'desktop')]
    [string]$Mode = 'auto',
    [int]$Seconds = 15,
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
    Write-Error "DECK_IP and DECK_USER must be set in .env at repo root."
    exit 1
}

$ScriptsDir = $PSScriptRoot
$DeckDir = Join-Path $ScriptsDir "deck"
$CommonScript = Join-Path $DeckDir "bonsai-capture-common.sh"
$RecordScript = Join-Path $DeckDir "bonsai-record.sh"

if (!(Test-Path $RecordScript) -or !(Test-Path $CommonScript)) {
    Write-Error "Missing $RecordScript or $CommonScript"
    exit 1
}

function Get-BundledRecordScript {
    $common = Get-Content -Path $CommonScript -Raw
    $main = Get-Content -Path $RecordScript -Raw
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
    Write-Host "Installing bonsai-record to ${DeckUser}@${DeckIP}:~/.local/bin/ ..." -ForegroundColor Cyan
    $bundle = Get-BundledRecordScript
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $bytes = $utf8NoBom.GetBytes($bundle)
    $tempBundle = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllBytes($tempBundle, $bytes)
    ssh "${DeckUser}@${DeckIP}" "mkdir -p ~/.local/bin"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    scp $tempBundle "${DeckUser}@${DeckIP}:~/.local/bin/bonsai-record"
    Remove-Item $tempBundle -Force
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    ssh "${DeckUser}@${DeckIP}" "chmod +x ~/.local/bin/bonsai-record"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Installed. On the Deck run: bonsai-record --seconds $Seconds (open QAM + bonsAI first)." -ForegroundColor Green
    }
    exit $LASTEXITCODE
}

$LocalPath = Join-Path $RepoRoot "recordings"
if (!(Test-Path $LocalPath)) {
    New-Item -ItemType Directory -Path $LocalPath -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RemoteFile = "/tmp/deck_record.mkv"
$RemoteDiag = "/tmp/bonsai-record.diag"
$RemoteResult = "/tmp/bonsai-record.result"
$LocalFileTemp = Join-Path $LocalPath "DeckRecord_${Timestamp}.mkv"
$LocalDiag = Join-Path $LocalPath "DeckRecord_${Timestamp}.log"
$LocalResult = Join-Path $LocalPath "DeckRecord_${Timestamp}.result"

Write-Host "Connecting to Steam Deck ($DeckIP)..." -ForegroundColor Cyan
Write-Host "NOTE: You will be prompted for your 'deck' user sudo password." -ForegroundColor Yellow
Write-Host "Recording ${Seconds}s — open QAM and bonsAI on the Deck BEFORE and DURING capture." -ForegroundColor Yellow
Write-Host "Mode: $Mode — game: pipewire gamescope only; desktop: wf-recorder. kmsgrab is NOT used (no plugin UI)." -ForegroundColor DarkGray

$bashContent = Get-BundledRecordScript
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$b64 = [Convert]::ToBase64String($utf8NoBom.GetBytes($bashContent))

$remoteArgs = "--mode $Mode --seconds $Seconds --out $RemoteFile --diag $RemoteDiag --result $RemoteResult"
if ($env:BONSAI_ALLOW_STEAMOS_RW -eq '0') {
    $remoteArgs = "$remoteArgs --no-steamos-rw"
}
$CaptureCommand = "echo $b64 | base64 -d | sudo bash -s -- $remoteArgs"

ssh "${DeckUser}@${DeckIP}" "sudo rm -f $RemoteFile $RemoteDiag $RemoteResult" 2>$null | Out-Null

& ssh -t "${DeckUser}@${DeckIP}" $CaptureCommand
$sshExit = $LASTEXITCODE

scp "${DeckUser}@${DeckIP}:${RemoteResult}" "$LocalResult" 2>$null | Out-Null

$sshOutput = ''
if (Test-Path $LocalResult) {
    $sshOutput = (Get-Content -Path $LocalResult -Raw)
    if ($null -eq $sshOutput) { $sshOutput = '' }
}

$recMode = 'unknown'
$recMethod = 'unknown'
$recBytes = 0
$recPath = $RemoteFile
$recPluginUi = 'no'
$recSeconds = $Seconds

$resultMatch = [regex]::Match($sshOutput, '---RECORD_RESULT---\s+mode=(\S+)\s+method=(\S+)\s+bytes=(\d+)\s+path=(\S+)\s+seconds=(\d+)\s+plugin_ui=(\S+)')
if ($resultMatch.Success) {
    $recMode = $resultMatch.Groups[1].Value.Trim()
    $recMethod = $resultMatch.Groups[2].Value.Trim()
    $recBytes = [int]$resultMatch.Groups[3].Value.Trim()
    $recPath = $resultMatch.Groups[4].Value.Trim()
    $recSeconds = [int]$resultMatch.Groups[5].Value.Trim()
    $recPluginUi = $resultMatch.Groups[6].Value.Trim()
}

function Download-DiagLog {
    scp "${DeckUser}@${DeckIP}:${RemoteDiag}" "$LocalDiag" 2>$null | Out-Null
    if (Test-Path $LocalDiag) {
        Write-Host "Diagnostic log saved to: $LocalDiag" -ForegroundColor DarkGray
    }
}

function Test-RecordV1Pass {
    if ($recPluginUi -eq 'no') { return $false }
    if ($recMethod -eq 'kmsgrab' -or $recMethod -eq 'failed') { return $false }
    if ($recMethod -notin @('pipewire-gamescope', 'wf-recorder')) { return $false }
    if ($recBytes -lt 524288) { return $false }
    return $true
}

$v1Pass = Test-RecordV1Pass

if ($sshExit -eq 0 -and $v1Pass) {
    Write-Host "`nRecording successful (mode=$recMode method=$recMethod bytes=$recBytes plugin_ui=$recPluginUi). Downloading..." -ForegroundColor Cyan

    scp "${DeckUser}@${DeckIP}:${recPath}" "$LocalFileTemp"

    if ($?) {
        $suffixMode = if ($recMode -ne 'unknown') { $recMode } else { $Mode }
        $LocalFile = Join-Path $LocalPath "DeckRecord_${Timestamp}_${suffixMode}.mkv"
        if ($LocalFileTemp -ne $LocalFile) {
            Move-Item -Path $LocalFileTemp -Destination $LocalFile -Force
        } else {
            $LocalFile = $LocalFileTemp
        }

        Write-Host "Cleaning up temporary files on the Deck..." -ForegroundColor Cyan
        ssh "${DeckUser}@${DeckIP}" "sudo rm -f $RemoteFile $RemoteDiag $RemoteResult" 2>$null | Out-Null

        Write-Host "Success! Recording saved to: $LocalFile" -ForegroundColor Green
        Write-Host "  mode=$recMode  method=$recMethod  bytes=$recBytes  seconds=$recSeconds" -ForegroundColor DarkGray
        Write-Host "  Verify bonsAI plugin UI is visible in the clip (QAM should have been open)." -ForegroundColor DarkGray

        if ($Open -and (Test-Path $LocalFile)) {
            Start-Process $LocalFile
        }
        exit 0
    } else {
        Write-Host "Error: Failed to download the recording via SCP." -ForegroundColor Red
        Download-DiagLog
        exit 1
    }
} else {
    $hint = "Open QAM and bonsAI on the Deck before/during recording. Composited capture (pipewire-gamescope / wf-recorder) is required."
    if ($recPluginUi -eq 'no' -or $recMethod -eq 'failed') {
        $hint += " Compositor path failed — check gstreamer/gst-plugin-pipewire on the Deck (see .log)."
    }
    if ($recBytes -gt 0 -and $recBytes -lt 524288) {
        $hint += " Recording too small ($recBytes bytes)."
    }
    if ($sshExit -eq -1) {
        $hint += " If you pressed Ctrl+C, retry after the record finishes."
    }
    Write-Host "Error: Recording failed v1 validation. $hint" -ForegroundColor Red
    if ($sshOutput) {
        Write-Host $sshOutput -ForegroundColor DarkGray
    }
    Download-DiagLog
    exit 1
}
