# Reverse SSH tunnel: Steam Deck 127.0.0.1:7682 -> this PC 127.0.0.1:7682
# Run on the PC while Cursor debug ingest is listening (debug mode). Leave the window open.
# Plugin fetch() on the Deck targets http://127.0.0.1:7682/... and sshd forwards to your ingest here.
#
# Requires: OpenSSH client, Deck reachable (DECK_IP), key-based auth recommended (see setup-dev.ps1).
# Deck sshd must allow TCP forwarding (default on SteamOS).

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

$DeckIp = "192.168.86.52"
$DeckUser = "deck"
$DeckPort = 22
$IngestPort = 7682

if (Test-Path "$RepoRoot\.env") {
    Get-Content "$RepoRoot\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#]\S+?)\s*=\s*(.+)$') {
            $name = $matches[1]
            $value = $matches[2].Trim()
            switch ($name) {
                "DECK_IP" { $DeckIp = $value }
                "DECK_USER" { $DeckUser = $value }
                "DECK_PORT" { $DeckPort = [int]$value }
                "DEBUG_INGEST_PORT" { $IngestPort = [int]$value }
            }
        }
    }
}

$remoteSpec = "127.0.0.1:${IngestPort}:127.0.0.1:${IngestPort}"
Write-Host "Reverse tunnel (leave running): ${DeckUser}@${DeckIp} remote TCP ${remoteSpec} -> this PC"
Write-Host "Ensure Cursor debug ingest is listening on 127.0.0.1:${IngestPort} before testing on the Deck."
ssh -N `
    -p $DeckPort `
    -o ServerAliveInterval=30 `
    -o ServerAliveCountMax=3 `
    -o ExitOnForwardFailure=yes `
    "-R$remoteSpec" `
    "${DeckUser}@${DeckIp}"
