# Watch dist/ and debounced-deploy to Steam Deck (deploy-only; Rollup watch rebuilds frontend).
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$DebounceMs = 1500
$DeployScript = if ($Local) {
    @("$PSScriptRoot\build.sh", "deploy", "--local")
} else {
    @("$PSScriptRoot\build.ps1")
}

if (!(Test-Path "$RepoRoot\.env")) {
    Write-Error ".env required (run .\scripts\setup-dev.ps1 first)."
}

function Invoke-Deploy {
    if ($Local) {
        & bash @DeployScript
    } else {
        & $DeployScript[0]
    }
}

function Schedule-Deploy {
    if ($script:DeployTimer) {
        try { $script:DeployTimer.Dispose() } catch {}
    }
    $script:DeployTimer = [System.Threading.Timer]::new({
        Write-Host "Deploying after dist change..." -ForegroundColor Green
        try { Invoke-Deploy } catch { Write-Host $_ -ForegroundColor Red }
    }, $null, $DebounceMs, [System.Threading.Timeout]::Infinite)
}

Write-Host "bonsAI watch-deploy (debounce ${DebounceMs}ms)" -ForegroundColor Cyan
if ($Local) { Write-Host "  deploy target: local (bash build.sh deploy --local)" -ForegroundColor Cyan }
else { Write-Host "  deploy target: remote Deck (.env)" -ForegroundColor Cyan }

if (!(Test-Path "$RepoRoot\dist\index.js")) {
    Write-Host "No dist/index.js — running one-shot build..." -ForegroundColor Cyan
    pnpm run build
    Invoke-Deploy
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Join-Path $RepoRoot "dist"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.Filter = "*.*"

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action { Schedule-Deploy } | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action { Schedule-Deploy } | Out-Null

try {
    pnpm run watch
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    if ($script:DeployTimer) { $script:DeployTimer.Dispose() }
}
