#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
cyan()  { printf '\033[1;36m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

cyan "========================================"
cyan "  bonsAI — Revert Dev SSH Key Setup"
cyan "========================================"
echo

if [[ ! -f .env ]]; then
    red ".env not found — nothing to revert."
    exit 1
fi

source .env

: "${DECK_IP:?DECK_IP is not set in .env}"
: "${DECK_PORT:=22}"
: "${DECK_USER:=deck}"

# ---------- find local public key ----------
LOCAL_PUB=""
for candidate in "$HOME/.ssh/id_ed25519.pub" "$HOME/.ssh/id_rsa.pub" "$HOME/.ssh/id_ecdsa.pub"; do
    if [[ -f "$candidate" ]]; then
        LOCAL_PUB="$candidate"
        break
    fi
done

if [[ -z "$LOCAL_PUB" ]]; then
    red "No local SSH public key found — nothing to remove from the Deck."
    exit 0
fi

PUB_CONTENT="$(cat "$LOCAL_PUB")"
bold "Public key to remove: $LOCAL_PUB"
echo "  ${PUB_CONTENT:0:72}..."
echo

# ---------- remove from Deck's authorized_keys ----------
bold "Removing this key from ${DECK_USER}@${DECK_IP}..."

ESCAPED_PUB="$(printf '%s' "$PUB_CONTENT" | sed 's/[&/\]/\\&/g')"
ssh -p "$DECK_PORT" "${DECK_USER}@${DECK_IP}" \
    "sed -i '\|${ESCAPED_PUB}|d' ~/.ssh/authorized_keys 2>/dev/null && echo 'removed' || echo 'not found'"

green "  Key removed from Deck (if it was present)."
echo

# ---------- optionally delete local keypair ----------
LOCAL_PRIV="${LOCAL_PUB%.pub}"
read -rp "Delete the local keypair ($LOCAL_PRIV + $LOCAL_PUB)? [y/N] " answer
if [[ "${answer,,}" == "y" ]]; then
    rm -f "$LOCAL_PRIV" "$LOCAL_PUB"
    green "  Local keypair deleted."
else
    echo "  Kept local keypair."
fi

echo
green "Done. SSH key auth to the Deck has been reverted."
echo "You will be prompted for a password on the next SSH/deploy."
