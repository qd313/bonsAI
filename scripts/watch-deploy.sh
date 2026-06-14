#!/usr/bin/env bash
# Watch dist/ and debounced-deploy to Deck (deploy-only; Rollup watch rebuilds frontend).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_LOCAL=false
DEBOUNCE_MS=1500

usage() {
  cat <<'EOF'
Usage: ./scripts/watch-deploy.sh [--local]

Runs `pnpm run watch` and deploys when dist/index.js (or dist/assets) changes.
Uses ./scripts/build.sh deploy (remote) or deploy --local (this machine).

Options:
  --local   Deploy to ~/homebrew/plugins on this host (Deck-native dev)
  -h        Help
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --local) DEPLOY_LOCAL=true ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $arg"; usage ;;
  esac
done

if [[ ! -f .env ]]; then
  echo ".env required (run ./scripts/setup-dev.sh first)."
  exit 1
fi

cyan() { printf '\033[1;36m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }

cyan "bonsAI watch-deploy (debounce ${DEBOUNCE_MS}ms)"
if [[ "$DEPLOY_LOCAL" == "true" ]]; then
  cyan "  deploy target: local plugin dir"
else
  cyan "  deploy target: remote Deck (.env DECK_IP)"
fi
echo

deploy_once() {
  if [[ "$DEPLOY_LOCAL" == "true" ]]; then
    bash "$SCRIPT_DIR/build.sh" deploy --local
  else
    bash "$SCRIPT_DIR/build.sh" deploy
  fi
}

schedule_deploy() {
  if [[ -n "${DEPLOY_TIMER_PID:-}" ]] && kill -0 "$DEPLOY_TIMER_PID" 2>/dev/null; then
    kill "$DEPLOY_TIMER_PID" 2>/dev/null || true
  fi
  (
    sleep "$(awk "BEGIN { print ${DEBOUNCE_MS}/1000 }")"
    green "Deploying after dist change..."
    deploy_once || true
  ) &
  DEPLOY_TIMER_PID=$!
}

# Initial build so dist exists before watch
if [[ ! -f dist/index.js ]]; then
  cyan "No dist/index.js — running one-shot build..."
  pnpm run build
  deploy_once || true
fi

# inotifywait (Linux) or polling fallback
watch_loop() {
  if command -v inotifywait &>/dev/null; then
    inotifywait -m -e close_write,move,create -r dist 2>/dev/null | while read -r _; do
      schedule_deploy
    done
  else
    cyan "inotifywait not found — polling dist/ every 2s"
    last_mtime=""
    while true; do
      if [[ -f dist/index.js ]]; then
        mtime="$(stat -c %Y dist/index.js 2>/dev/null || stat -f %m dist/index.js 2>/dev/null || echo "")"
        if [[ -n "$mtime" && "$mtime" != "$last_mtime" ]]; then
          last_mtime="$mtime"
          schedule_deploy
        fi
      fi
      sleep 2
    done
  fi
}

trap '[[ -n "${DEPLOY_TIMER_PID:-}" ]] && kill "$DEPLOY_TIMER_PID" 2>/dev/null || true' EXIT

watch_loop &
WATCH_PID=$!

pnpm run watch &
WATCH_ROLLUP_PID=$!

trap 'kill "$WATCH_PID" "$WATCH_ROLLUP_PID" 2>/dev/null || true; [[ -n "${DEPLOY_TIMER_PID:-}" ]] && kill "$DEPLOY_TIMER_PID" 2>/dev/null || true' EXIT

wait "$WATCH_ROLLUP_PID"
