# Load connection details from .env (credentials are never stored in this script)
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path "$RepoRoot\.env") {
    Get-Content "$RepoRoot\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#]\S+?)\s*=\s*(.+)$') {
            Set-Variable -Name $matches[1] -Value $matches[2].Trim()
        }
    }
} else {
    Write-Error ".env file not found. Copy .env.example to .env and fill in your values."
    exit 1
}

Set-Location $RepoRoot

$HostIp     = $DECK_IP
$User       = $DECK_USER
$PluginName = "bonsAI"

# Reliability: this script can occasionally fail or appear stuck during the `scp` upload
# or while the remote step overwrites system files / restarts Decky Loader. If there is
# no output or progress for about 60 seconds, kill the process (Ctrl+C) and run the
# script again — a second run usually succeeds.

# Install dependencies (only needed once or when adding new packages)
pnpm install

# Create the dist folder if it doesn't exist
if (!(Test-Path "dist")) { New-Item -ItemType Directory -Path "dist" | Out-Null }

# Build the plugin frontend
pnpm run build

Write-Host "Uploading to temporary Deck directory..."

# 1. Create a safe temporary directory in the user folder (no sudo required)
ssh "$User@$HostIp" "mkdir -p ~/decky_temp_$PluginName/dist"

# 2. Upload everything into the temporary directory
scp package.json plugin.json main.py "${User}@${HostIp}:~/decky_temp_$PluginName/"
scp refactor_helpers.py "${User}@${HostIp}:~/decky_temp_$PluginName/"
scp -r backend "${User}@${HostIp}:~/decky_temp_$PluginName/"
scp dist/index.js "${User}@${HostIp}:~/decky_temp_$PluginName/dist/"

Write-Host "Overwriting system files and restarting Decky Loader..."

# 3. Stop Decky, ensure plugin dir is writable (Decky often resets it to root-owned), copy files, restart
$PluginHomePath = "/home/$User/homebrew/plugins/$PluginName"
$RemoteCommand = "sudo -n /usr/bin/systemctl stop plugin_loader.service && " +
                 "sudo -n /usr/bin/mkdir -p $PluginHomePath/dist && " +
                 "sudo -n /usr/bin/chown -R ${User}:${User} $PluginHomePath && " +
                 "cp -rf ~/decky_temp_$PluginName/* ~/homebrew/plugins/$PluginName/ && " +
                 "rm -rf ~/decky_temp_$PluginName && " +
                 "sudo -n /usr/bin/systemctl start plugin_loader.service"

ssh "$User@$HostIp" $RemoteCommand

Write-Host "Deployment complete! Your new UI should appear on the Deck instantly."
