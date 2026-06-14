# Maintainer example: forward Deck loopback ingest to your PC (no hardcoded IPs in repo).
# Copy to a local script, set variables in repo-root .env (see .env.example), then run.
#
#   DECK_HOST=deck@your-deck.example
#   INGEST_PORT=7242

param(
  [string]$DeckHost = $env:DECK_HOST,
  [int]$Port = $(if ($env:INGEST_PORT) { [int]$env:INGEST_PORT } else { 7242 })
)

if (-not $DeckHost) {
  Write-Error "Set DECK_HOST in .env or pass -DeckHost."
  exit 1
}

Write-Host "SSH reverse tunnel: Deck 127.0.0.1:${Port} -> this PC 127.0.0.1:${Port}"
ssh -N -R "127.0.0.1:${Port}:127.0.0.1:${Port}" $DeckHost
