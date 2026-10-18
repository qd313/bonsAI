# Title: Windows deploy script (remote Steam Deck)
# Purpose: Build the frontend + seed KB and deploy them to a Deck over SSH.
# Used for: `.\scripts\build.ps1` and, by inheritance, `.\scripts\watch-deploy.ps1`.
# Solves: The Windows equivalent of `build.sh dev` - prune, copy, verify, restart.
# Does not: Deploy locally (use `build.sh local`) or build a release zip.
#
# ASCII only, deliberately. This file has no BOM, so Windows PowerShell 5.1 reads it as
# CP1252: a UTF-8 em-dash inside a double-quoted string decodes to a smart quote, which
# PowerShell accepts as a string delimiter and the whole script stops parsing.

# Deliberately NOT $ErrorActionPreference = "Stop". Under Windows PowerShell 5.1 that turns a
# native command's stderr into a terminating NativeCommandError whenever the script's output is
# redirected (`build.ps1 2>&1 | ...`), so a harmless `pnpm`/node deprecation warning aborts the
# deploy. Failures are handled explicitly instead: every ssh/scp is checked by Assert-LastExit,
# and the cmdlets whose failure would corrupt the run carry their own -ErrorAction Stop.

# Load connection details from .env (credentials are never stored in this script)
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path "$RepoRoot\.env") {
    Get-Content "$RepoRoot\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#]\S+?)\s*=\s*(.+)$') {
            Set-Variable -Name $matches[1] -Value $matches[2].Trim()
        }
    }
} else {
    Write-Host ".env file not found. Copy .env.example to .env and fill in your values." -ForegroundColor Red
    exit 1
}

Set-Location $RepoRoot -ErrorAction Stop

$HostIp     = $DECK_IP
$User       = $DECK_USER
$PluginName = "bonsAI"

# Reliability: this script can occasionally fail or appear stuck during the `scp` upload
# or while the remote step overwrites system files / restarts Decky Loader. If there is
# no output or progress for about 60 seconds, kill the process (Ctrl+C) and run the
# script again - a second run usually succeeds.

# Preflight: passwordless sudo (via /etc/sudoers.d/decky_restart, installed by setup-dev.ps1)
# lives outside SteamOS's persisted overlay. A SteamOS update re-images root and silently
# wipes it while SSH keys under ~/.ssh survive - so the deploy connects fine and then dies at
# the sudo step later, after a full build + upload. Catch that here, before spending the time.
ssh "$User@$HostIp" "sudo -n true" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Passwordless sudo is not set up on the Deck (exit code $LASTEXITCODE)." -ForegroundColor Red
    Write-Host "This is usually a SteamOS update resetting /etc/sudoers.d/decky_restart - it lives outside the persisted overlay and does not survive a system update." -ForegroundColor Yellow
    Write-Host "Fix: run .\scripts\setup-dev.ps1 to reinstall it, then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Every ssh/scp step is exit-code checked. A Deck that drifted to sleep mid-deploy used to
# print "Deployment complete!" while nothing landed; unchecked native exit codes were why.
function Assert-LastExit {
    param([Parameter(Mandatory = $true)][string]$What)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "$What failed (exit code $LASTEXITCODE). Deploy aborted - the Deck may be asleep or unreachable." -ForegroundColor Red
        exit 1
    }
}

# Install dependencies (only needed once or when adding new packages)
pnpm install
Assert-LastExit "pnpm install"

# Create the dist folder if it doesn't exist
if (!(Test-Path "dist")) { New-Item -ItemType Directory -Path "dist" | Out-Null }

# Build the plugin frontend
pnpm run build
Assert-LastExit "pnpm run build"

Write-Host "Building seed knowledge base for Deck QA..."
python scripts/kb/build_rag_db.py --seed --out build/knowledge-base-seed
Assert-LastExit "Seed knowledge base build"

Write-Host "Uploading to temporary Deck directory..."

# 1. Create a safe temporary directory in the user folder (no sudo required).
#    Wiped first: a partial temp dir left by a failed run would otherwise ship stale files.
ssh "$User@$HostIp" "rm -rf ~/decky_temp_$PluginName && mkdir -p ~/decky_temp_$PluginName/dist"
Assert-LastExit "Creating remote temp directory"

# 2. Upload everything into the temporary directory
scp package.json plugin.json main.py "${User}@${HostIp}:~/decky_temp_$PluginName/"
Assert-LastExit "Uploading manifests and main.py"
scp -r py_modules "${User}@${HostIp}:~/decky_temp_$PluginName/"
Assert-LastExit "Uploading py_modules"
if (Test-Path "data") {
    scp -r data "${User}@${HostIp}:~/decky_temp_$PluginName/"
    Assert-LastExit "Uploading data"
}
scp dist/index.js "${User}@${HostIp}:~/decky_temp_$PluginName/dist/"
Assert-LastExit "Uploading dist/index.js"
# Rollup emits hashed files under dist/assets/ (rollup-plugin-import-assets). Without this copy,
# <img> URLs in index.js 404 on device (dev server URL points into the plugin dist folder).
if (Test-Path "dist\assets") {
    scp -r "dist\assets" "${User}@${HostIp}:~/decky_temp_$PluginName/dist/"
    Assert-LastExit "Uploading dist/assets"
}

$SeedRemoteDir = "/home/$User/homebrew/settings/bonsAI/seed-knowledge-base"
ssh "$User@$HostIp" "mkdir -p $SeedRemoteDir"
Assert-LastExit "Creating remote seed knowledge base directory"
scp build/knowledge-base-seed/* "${User}@${HostIp}:$SeedRemoteDir/"
Assert-LastExit "Uploading seed knowledge base"

Write-Host "Overwriting system files and restarting Decky Loader..."

# 3. Stop Decky, wipe the plugin dir, ensure it is writable (Decky often resets it to
#    root-owned), copy files. The wipe matches `build.sh deploy`: without it, files no
#    longer shipped survive from earlier deploys and can satisfy imports that should fail.
#    Only the plugin dir is removed - settings and the seed KB live under homebrew/settings.
$PluginHomePath = "/home/$User/homebrew/plugins/$PluginName"
$RemoteCommand = "sudo -n /usr/bin/systemctl stop plugin_loader.service && " +
                 "sudo -n /usr/bin/rm -rf $PluginHomePath && " +
                 "sudo -n /usr/bin/mkdir -p $PluginHomePath/dist && " +
                 "sudo -n /usr/bin/chown -R ${User}:${User} $PluginHomePath && " +
                 "cp -rf ~/decky_temp_$PluginName/* ~/homebrew/plugins/$PluginName/ && " +
                 "rm -rf ~/decky_temp_$PluginName"

ssh "$User@$HostIp" $RemoteCommand
Assert-LastExit "Installing plugin files on the Deck"

# 4. Verify what actually landed before declaring success. Hash every code file we shipped,
#    not just dist/index.js: a Python-only change leaves index.js byte-identical to the
#    previous deploy, so index.js alone would pass while nothing new arrived.
Write-Host "Verifying deployed files..."

$VerifyPaths = @("package.json", "plugin.json", "main.py", "dist/index.js")
$VerifyPaths += Get-ChildItem -Path "py_modules" -Recurse -File -Filter "*.py" |
    Where-Object { $_.FullName -notmatch '__pycache__' } |
    ForEach-Object { $_.FullName.Substring($RepoRoot.Length + 1).Replace('\', '/') }

$LocalHashes = @{}
foreach ($RelPath in $VerifyPaths) {
    $LocalHashes[$RelPath] = (Get-FileHash -Path (Join-Path $RepoRoot $RelPath) -Algorithm SHA256 -ErrorAction Stop).Hash.ToLower()
}

$QuotedPaths  = ($VerifyPaths | ForEach-Object { "'$_'" }) -join ' '
$RemoteOutput = ssh "$User@$HostIp" "cd '$PluginHomePath' && sha256sum $QuotedPaths"
$HashExitCode = $LASTEXITCODE

$RemoteHashes = @{}
foreach ($Line in $RemoteOutput) {
    if ($Line -match '^([0-9a-f]{64})\s+(.+)$') {
        $RemoteHashes[$matches[2].Trim()] = $matches[1]
    }
}

$Mismatches = @()
foreach ($RelPath in $VerifyPaths) {
    if (-not $RemoteHashes.ContainsKey($RelPath)) {
        $Mismatches += "  MISSING  $RelPath"
    } elseif ($RemoteHashes[$RelPath] -ne $LocalHashes[$RelPath]) {
        $Mismatches += "  STALE    $RelPath"
    }
}

# Restart the loader either way: leaving plugin_loader stopped would break every other
# Decky plugin on the device, not just this one. A failed verify still fails the script.
ssh "$User@$HostIp" "sudo -n /usr/bin/systemctl start plugin_loader.service"
$RestartExitCode = $LASTEXITCODE

if ($Mismatches.Count -gt 0) {
    Write-Host "Deploy verification FAILED - the Deck is not running this build:" -ForegroundColor Red
    $Mismatches | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host "$($Mismatches.Count) of $($VerifyPaths.Count) files did not land. Re-run the deploy (wake the Deck first)." -ForegroundColor Red
    exit 1
}
if ($HashExitCode -ne 0) {
    Write-Host "Could not read deployed file hashes from the Deck (exit code $HashExitCode). Deploy unverified." -ForegroundColor Red
    exit 1
}
if ($RestartExitCode -ne 0) {
    Write-Host "Files landed but restarting plugin_loader failed (exit code $RestartExitCode)." -ForegroundColor Red
    exit 1
}

Write-Host "Verified $($VerifyPaths.Count) files on the Deck." -ForegroundColor Green
Write-Host "Deployment complete! Your new UI should appear on the Deck instantly."
