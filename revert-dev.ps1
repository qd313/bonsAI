# revert-dev.ps1
$HostIp="192.168.86.52"
$User="deck"

Write-Host "=== Starting Steam Deck Dev Reversal ==="

# 1. Revoke the passwordless sudo exception
Write-Host "Revoking passwordless service restarts (Enter your Deck password)..."
ssh -t "$User@$HostIp" "sudo rm -f /etc/sudoers.d/decky_restart"

# 2. Wipe the authorized SSH keys
Write-Host "Removing trusted SSH keys..."
ssh "$User@$HostIp" "rm -f ~/.ssh/authorized_keys"

Write-Host "=== Reversal Complete! The Steam Deck is locked back down to default security. ==="