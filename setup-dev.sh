#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- colors ----------
red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
cyan()  { printf '\033[1;36m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

cyan "========================================"
cyan "  bonsAI — Developer Environment Setup"
cyan "========================================"
echo

# ========== 1. .env bootstrap ==========
bold "[1/5] Checking .env configuration..."

if [[ ! -f .env ]]; then
    cp .env.example .env
    green "Created .env from .env.example."
    echo ">>> Please edit .env now to set your Steam Deck IP, PC IP, etc. <<<"
    echo "    Then re-run this script."
    echo
    "${EDITOR:-nano}" .env
fi

source .env

: "${DECK_IP:?DECK_IP is not set in .env}"
: "${DECK_PORT:=22}"
: "${DECK_USER:=deck}"
: "${DECK_DIR:=/home/deck}"
: "${PC_IP:?PC_IP is not set in .env}"
: "${PLUGIN_NAME:=bonsAI}"

green "  DECK_IP=$DECK_IP  DECK_USER=$DECK_USER  PC_IP=$PC_IP"
echo

# ========== 2. pnpm ==========
bold "[2/5] Checking pnpm..."

if command -v pnpm &>/dev/null; then
    green "  pnpm found: $(pnpm --version)"
else
    echo "  pnpm not found. Installing via corepack..."
    if command -v corepack &>/dev/null; then
        corepack enable
        corepack prepare pnpm@latest --activate
    else
        curl -fsSL https://get.pnpm.io/install.sh | sh -
        export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
        export PATH="$PNPM_HOME:$PATH"
    fi
    green "  pnpm installed: $(pnpm --version)"
fi
echo

# ========== 3. Decky CLI ==========
bold "[3/5] Checking Decky CLI..."

CLI_BIN="$SCRIPT_DIR/cli/decky"
if [[ -x "$CLI_BIN" ]]; then
    green "  Decky CLI already installed at $CLI_BIN"
else
    mkdir -p "$SCRIPT_DIR/cli"
    ARCH="$(uname -m)"
    OS="$(uname -s)"
    DL_URL=""

    if [[ "$OS" == "Linux" ]]; then
        case "$ARCH" in
            x86_64)  DL_URL="https://github.com/SteamDeckHomebrew/cli/releases/latest/download/decky-linux-x86_64" ;;
            aarch64) DL_URL="https://github.com/SteamDeckHomebrew/cli/releases/latest/download/decky-linux-aarch64" ;;
        esac
    elif [[ "$OS" == "Darwin" ]]; then
        case "$ARCH" in
            x86_64)  DL_URL="https://github.com/SteamDeckHomebrew/cli/releases/latest/download/decky-macOS-x86_64" ;;
            arm64)   DL_URL="https://github.com/SteamDeckHomebrew/cli/releases/latest/download/decky-macOS-aarch64" ;;
        esac
    fi

    if [[ -z "$DL_URL" ]]; then
        red "  Unsupported platform: $OS $ARCH — skipping Decky CLI install."
        red "  You can download it manually from https://github.com/SteamDeckHomebrew/cli/releases"
    else
        echo "  Downloading Decky CLI for $OS $ARCH..."
        curl -L -o "$CLI_BIN" "$DL_URL"
        chmod +x "$CLI_BIN"
        green "  Decky CLI installed at $CLI_BIN"
    fi
fi
echo

# ========== 4. SSH key setup ==========
bold "[4/5] Setting up SSH keys for passwordless deploy..."

SSH_KEY=""
for candidate in "$HOME/.ssh/id_ed25519" "$HOME/.ssh/id_rsa" "$HOME/.ssh/id_ecdsa"; do
    if [[ -f "$candidate" ]]; then
        SSH_KEY="$candidate"
        break
    fi
done

if [[ -z "$SSH_KEY" ]]; then
    echo "  No SSH key found. Generating ed25519 keypair..."
    ssh-keygen -t ed25519 -C "bonsai-dev@$(hostname)" -f "$HOME/.ssh/id_ed25519" -N ""
    SSH_KEY="$HOME/.ssh/id_ed25519"
    green "  Generated $SSH_KEY"
else
    green "  Found existing key: $SSH_KEY"
fi

echo "  Copying public key to ${DECK_USER}@${DECK_IP}:${DECK_PORT}..."
echo "  (You may be prompted for the Deck password one last time)"
ssh-copy-id -i "${SSH_KEY}.pub" -p "$DECK_PORT" "${DECK_USER}@${DECK_IP}" 2>/dev/null || \
    ssh-copy-id -p "$DECK_PORT" "${DECK_USER}@${DECK_IP}"

if ssh -o BatchMode=yes -p "$DECK_PORT" "${DECK_USER}@${DECK_IP}" "echo ok" &>/dev/null; then
    green "  SSH key auth verified — passwordless login works!"
else
    red "  Warning: passwordless SSH test failed. You may still be prompted for a password during deploys."
fi
echo

# ========== 5. pnpm install ==========
bold "[5/5] Installing node dependencies..."
pnpm install
green "  Dependencies installed."
echo

cyan "========================================"
green "  Setup complete! You can now run:"
echo "    ./build.sh          # build + deploy to Steam Deck"
echo "    ./build.sh local    # build + deploy locally"
echo "    ./build.sh release  # build distributable zip"
cyan "========================================"
