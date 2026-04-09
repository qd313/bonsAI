# setup-dev.ps1
$HostIp="192.168.86.52"
$User="deck"
$PluginName="bonsAI"

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

# 3. Create the passwordless sudo exception
Write-Host "Setting up passwordless Decky restarts (Enter Deck password if prompted)..."
ssh -t "$User@$HostIp" "echo 'deck ALL=(root) NOPASSWD: /usr/bin/systemctl restart plugin_loader.service' | sudo tee /etc/sudoers.d/decky_restart > /dev/null && sudo chmod 0440 /etc/sudoers.d/decky_restart"

# 4. Take ownership of the plugin directory
Write-Host "Taking ownership of the plugin folder..."
ssh -t "$User@$HostIp" "sudo mkdir -p ~/homebrew/plugins/$PluginName && sudo chown -R deck:deck ~/homebrew/plugins/$PluginName"

Write-Host "=== Setup Complete! Your build.ps1 will now run fully automatically. ==="