#!/usr/bin/env bash
# Reverse SSH tunnel: Steam Deck 127.0.0.1:7682 -> this PC 127.0.0.1:7682
# Run on the PC while Cursor debug ingest is listening. Leave the terminal open.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$REPO_ROOT/.env"
  set +a
fi
DECK_IP="${DECK_IP:-192.168.86.52}"
DECK_USER="${DECK_USER:-deck}"
DECK_PORT="${DECK_PORT:-22}"
DEBUG_INGEST_PORT="${DEBUG_INGEST_PORT:-7682}"
REMOTE_SPEC="127.0.0.1:${DEBUG_INGEST_PORT}:127.0.0.1:${DEBUG_INGEST_PORT}"
echo "Reverse tunnel (leave running): ${DECK_USER}@${DECK_IP} remote TCP ${REMOTE_SPEC} -> this PC"
echo "Ensure Cursor debug ingest is listening on 127.0.0.1:${DEBUG_INGEST_PORT} before testing on the Deck."
exec ssh -N \
  -p "${DECK_PORT}" \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -R "${REMOTE_SPEC}" \
  "${DECK_USER}@${DECK_IP}"
