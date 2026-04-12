# setup-dev.ps1 — Load connection details from .env
if (Test-Path "$PSScriptRoot\.env") {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#]\S+?)\s*=\s*(.+)$') {
            Set-Variable -Name $matches[1] -Value $matches[2].Trim()
        }
    }
} else {
    Write-Error ".env file not found. Copy .env.example to .env and fill in your values."
    exit 1
}

$HostIp     = $DECK_IP
$User       = $DECK_USER
$PluginName = "bonsAI"

Write-Host "=== Starting Steam Deck Dev Setup ==="

# 1. Generate SSH Key silently (if it doesn't already exist)
$KeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
if (!(Test-Path "$KeyPath.pub")) {
    Write-Host "Generating new passwordless SSH key..."
    ssh-keygen -t ed25519 -f $KeyPath -N '""'
}

# 2. Copy the SSH Key to the Deck
Write-Host "Copying SSH key to Deck (Enter your Deck password when prompted)..."
$PubKey = Get-Content "$KeyPath.pub" -Raw
$PubKey = $PubKey.Trim()
ssh "$User@$HostIp" "mkdir -p ~/.ssh && echo '$PubKey' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

# 3. Passwordless sudo for dev mode.
# SteamOS sudoers matching can be inconsistent with command-specific entries over non-interactive ssh,
# so use an explicit dev-only override and rely on revert-dev.ps1 to remove it.
Write-Host "Setting up passwordless Decky service control (Enter Deck password if prompted)..."
$SudoersBlock = @(
    "Defaults:$User !authenticate",
    "$User ALL=(root) NOPASSWD: ALL"
) -join "`n"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($SudoersBlock))
ssh -t "$User@$HostIp" "printf '%s' '$b64' | base64 -d | tr -d '\r' > /tmp/decky_restart.new && sudo visudo -cf /tmp/decky_restart.new && sudo install -o root -g root -m 0440 /tmp/decky_restart.new /etc/sudoers.d/decky_restart && rm -f /tmp/decky_restart.new"

# 4. Take ownership of the plugin directory
Write-Host "Taking ownership of the plugin folder..."
ssh -t "$User@$HostIp" "sudo mkdir -p ~/homebrew/plugins/$PluginName && sudo chown -R ${User}:${User} ~/homebrew/plugins/$PluginName"

Write-Host "=== Setup Complete! Your build.ps1 will now run fully automatically. ==="
