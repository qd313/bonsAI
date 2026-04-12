#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- colors ----------
red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
cyan()  { printf '\033[1;36m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

# ---------- usage ----------
usage() {
    cat <<'EOF'
Usage: ./build.sh [command] [options]

Commands:
  dev           Build + deploy to remote Steam Deck (default)
  local         Build + deploy locally on this Bazzite machine
  release       Build distributable zip via Decky CLI
  deploy        Re-deploy last build without rebuilding

Options:
  --local       For 'deploy' command: deploy locally instead of remote
  --skip-install  Skip pnpm install even if node_modules seems stale
  -h, --help    Show this help
EOF
    exit 0
}

# ---------- parse args ----------
COMMAND="${1:-dev}"
shift || true

DEPLOY_LOCAL=false
SKIP_INSTALL=false

for arg in "$@"; do
    case "$arg" in
        --local)        DEPLOY_LOCAL=true ;;
        --skip-install) SKIP_INSTALL=true ;;
        -h|--help)      usage ;;
        *) red "Unknown option: $arg"; usage ;;
    esac
done

# ---------- load .env ----------
if [[ ! -f .env ]]; then
    red ".env not found. Run ./setup-dev.sh first."
    exit 1
fi

source .env

: "${DECK_IP:?DECK_IP is not set in .env}"
: "${DECK_PORT:=22}"
: "${DECK_USER:=deck}"
: "${DECK_DIR:=/home/deck}"
: "${PC_IP:?PC_IP is not set in .env}"
: "${PLUGIN_NAME:=bonsAI}"

SSH_DEST="${DECK_USER}@${DECK_IP}"
SSH_OPTS="-p ${DECK_PORT}"
PLUGIN_DIR="${DECK_DIR}/homebrew/plugins/${PLUGIN_NAME}"

# ---------- helper: SSH command to Deck ----------
deck_ssh() {
    ssh $SSH_OPTS "$SSH_DEST" "$@"
}

# ---------- helper: SCP to Deck ----------
deck_scp() {
    scp -P "$DECK_PORT" "$@"
}

# ---------- build steps ----------
do_install() {
    if [[ "$SKIP_INSTALL" == "true" ]]; then
        echo "  Skipping pnpm install (--skip-install)"
        return
    fi

    if [[ -d node_modules && node_modules -nt package.json && node_modules -nt pnpm-lock.yaml ]]; then
        echo "  node_modules is up to date, skipping install"
    else
        bold "Installing dependencies..."
        pnpm install
    fi
}

do_generate_config() {
    bold "Generating src/config.ts..."
    cat > src/config.ts <<CONF
export const HostIp = '${DECK_IP}';
export const PcIp = '${PC_IP}';
CONF
    green "  src/config.ts written (HostIp=${DECK_IP}, PcIp=${PC_IP})"
}

do_build() {
    bold "Building plugin frontend..."
    pnpm run build
    green "  Build complete → dist/index.js"
}

do_full_build() {
    ensure_pnpm
    ensure_node
    do_install
    do_generate_config
    do_build
}

ensure_pnpm() {
    local pnpm_bin
    pnpm_bin="$(command -v pnpm || true)"

    if [[ -n "$pnpm_bin" ]]; then
        return
    fi

    # Common install location used by pnpm installer on Linux.
    local guessed_pnpm_home="${PNPM_HOME:-$HOME/.local/share/pnpm}"
    if [[ -x "${guessed_pnpm_home}/pnpm" ]]; then
        export PNPM_HOME="$guessed_pnpm_home"
        export PATH="$PNPM_HOME:$PATH"
        pnpm_bin="$(command -v pnpm || true)"
    fi

    if [[ -z "$pnpm_bin" ]] && command -v corepack >/dev/null 2>&1; then
        corepack enable >/dev/null 2>&1 || true
        corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
        pnpm_bin="$(command -v pnpm || true)"
    fi

    if [[ -z "$pnpm_bin" ]]; then
        red "pnpm is not available in this shell."
        echo "Run ./setup-dev.sh again, then open a new terminal and retry."
        exit 1
    fi
}

ensure_node() {
    local node_bin
    node_bin="$(command -v node || true)"

    if [[ -n "$node_bin" ]]; then
        return
    fi

    if command -v pnpm >/dev/null 2>&1; then
        pnpm env use --global lts >/dev/null 2>&1 || true
    fi

    local guessed_pnpm_home="${PNPM_HOME:-$HOME/.local/share/pnpm}"
    local newest_node_bin=""
    for candidate in "${guessed_pnpm_home}"/nodejs/*/bin/node; do
        if [[ -x "$candidate" ]]; then
            newest_node_bin="$candidate"
        fi
    done

    if [[ -n "$newest_node_bin" ]]; then
        export PATH="$(dirname "$newest_node_bin"):$PATH"
    fi

    node_bin="$(command -v node || true)"
    if [[ -z "$node_bin" ]]; then
        red "node is not available in this shell."
        echo "Install Node.js (LTS) and retry, or run:"
        echo "  pnpm env use --global lts"
        echo "Then open a new terminal and run ./build.sh again."
        exit 1
    fi
}

# ---------- deploy: remote Steam Deck ----------
deploy_remote() {
    cyan "Deploying to Steam Deck at ${SSH_DEST}..."

    bold "Stopping plugin_loader & preparing plugin directory..."
    deck_ssh "sudo systemctl stop plugin_loader 2>/dev/null || true; \
              sudo rm -rf ${PLUGIN_DIR}; \
              sudo mkdir -p ${PLUGIN_DIR}/dist; \
              sudo chown -R ${DECK_USER} ${PLUGIN_DIR}; \
              sudo chmod -R 755 ${PLUGIN_DIR}"

    bold "Copying files..."
    deck_scp package.json plugin.json main.py "${SSH_DEST}:${PLUGIN_DIR}/"
    deck_scp dist/index.js "${SSH_DEST}:${PLUGIN_DIR}/dist/"

    bold "Fixing permissions & restarting plugin_loader..."
    deck_ssh "sudo chmod -R 755 ${PLUGIN_DIR}; \
              sudo systemctl start plugin_loader"

    green "Remote deploy complete!"
}

# ---------- deploy: local Bazzite ----------
deploy_local() {
    LOCAL_PLUGIN_DIR="$HOME/homebrew/plugins/${PLUGIN_NAME}"
    cyan "Deploying locally to ${LOCAL_PLUGIN_DIR}..."

    bold "Stopping plugin_loader & preparing plugin directory..."
    sudo systemctl stop plugin_loader 2>/dev/null || true
    sudo rm -rf "$LOCAL_PLUGIN_DIR"
    sudo mkdir -p "${LOCAL_PLUGIN_DIR}/dist"
    sudo chown -R "$(whoami)" "$LOCAL_PLUGIN_DIR"

    bold "Copying files..."
    cp package.json plugin.json main.py "$LOCAL_PLUGIN_DIR/"
    cp dist/index.js "$LOCAL_PLUGIN_DIR/dist/"

    bold "Fixing permissions & restarting plugin_loader..."
    sudo chmod -R 755 "$LOCAL_PLUGIN_DIR"
    sudo systemctl start plugin_loader

    green "Local deploy complete!"
}

# ---------- release: Decky CLI zip ----------
do_release() {
    CLI_BIN="$SCRIPT_DIR/cli/decky"
    if [[ ! -x "$CLI_BIN" ]]; then
        red "Decky CLI not found at $CLI_BIN"
        echo "Run ./setup-dev.sh to install it."
        exit 1
    fi

    bold "Building plugin zip with Decky CLI..."
    sudo "$CLI_BIN" plugin build "$SCRIPT_DIR"

    if ls out/*.zip 1>/dev/null 2>&1; then
        green "Release build complete!"
        echo "  Zip file(s):"
        ls -lh out/*.zip
    else
        red "Expected zip in out/ but none found."
        exit 1
    fi
}

# ---------- command dispatch ----------
cyan "========================================"
cyan "  bonsAI — Build & Deploy ($COMMAND)"
cyan "========================================"
echo

case "$COMMAND" in
    dev)
        do_full_build
        echo
        deploy_remote
        ;;
    local)
        do_full_build
        echo
        deploy_local
        ;;
    release)
        do_full_build
        echo
        do_release
        ;;
    deploy)
        if [[ ! -f dist/index.js ]]; then
            red "dist/index.js not found — run a build first."
            exit 1
        fi
        echo
        if [[ "$DEPLOY_LOCAL" == "true" ]]; then
            deploy_local
        else
            deploy_remote
        fi
        ;;
    -h|--help)
        usage
        ;;
    *)
        red "Unknown command: $COMMAND"
        usage
        ;;
esac

echo
green "Done!"
