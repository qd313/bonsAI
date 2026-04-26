# revert-dev.ps1 — Load connection details from .env
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

$HostIp = $DECK_IP
$User   = $DECK_USER

Write-Host "=== Starting Steam Deck Dev Reversal ==="

# 1. Revoke the passwordless sudo exception
Write-Host "Revoking passwordless service restarts (Enter your Deck password)..."
ssh -t "$User@$HostIp" "sudo rm -f /etc/sudoers.d/decky_restart"

# 2. Wipe the authorized SSH keys
Write-Host "Removing trusted SSH keys..."
ssh "$User@$HostIp" "rm -f ~/.ssh/authorized_keys"

Write-Host "=== Reversal Complete! The Steam Deck is locked back down to default security. ==="