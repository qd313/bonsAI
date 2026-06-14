#!/usr/bin/env bash
# Restart local Ollama with Steam Deck GPU-friendly env (Vulkan + Van Gogh ROCm override).
# Run on the Deck in Desktop Mode → Konsole: bash scripts/deck-restart-ollama-gpu.sh
set -euo pipefail

OLLAMA_BIN="${OLLAMA_BIN:-$HOME/.local/bin/ollama}"
if [[ ! -x "$OLLAMA_BIN" ]]; then
  OLLAMA_BIN="$(command -v ollama || true)"
fi
if [[ -z "${OLLAMA_BIN:-}" || ! -x "$OLLAMA_BIN" ]]; then
  echo "ollama binary not found. Install via bonsAI Settings → Connection first." >&2
  exit 1
fi

export OLLAMA_VULKAN="${OLLAMA_VULKAN:-1}"
export OLLAMA_NUM_PARALLEL="${OLLAMA_NUM_PARALLEL:-1}"
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-1}"

product="$(cat /sys/devices/virtual/dmi/id/product_name 2>/dev/null || true)"
if [[ "$product" == "Jupiter" || "$product" == "Galileo" ]]; then
  export HSA_OVERRIDE_GFX_VERSION="${HSA_OVERRIDE_GFX_VERSION:-gfx1030}"
  export OLLAMA_FLASH_ATTENTION="${OLLAMA_FLASH_ATTENTION:-0}"
  # Deck APU is an integrated GPU; Ollama drops iGPUs by default and falls back to CPU.
  # OLLAMA_IGPU_ENABLE=1 keeps the Vulkan (RADV VANGOGH) device for offload.
  export OLLAMA_IGPU_ENABLE="${OLLAMA_IGPU_ENABLE:-1}"
  echo "Steam Deck detected — HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_GFX_VERSION OLLAMA_VULKAN=$OLLAMA_VULKAN OLLAMA_IGPU_ENABLE=$OLLAMA_IGPU_ENABLE"
else
  echo "Non-Deck host — OLLAMA_VULKAN=$OLLAMA_VULKAN"
fi

echo "Stopping existing ollama serve…"
pkill -f 'ollama serve' 2>/dev/null || true
sleep 1

echo "Starting ollama serve with GPU env…"
nohup env OLLAMA_VULKAN="$OLLAMA_VULKAN" \
  OLLAMA_NUM_PARALLEL="$OLLAMA_NUM_PARALLEL" \
  OLLAMA_MAX_LOADED_MODELS="$OLLAMA_MAX_LOADED_MODELS" \
  ${HSA_OVERRIDE_GFX_VERSION:+HSA_OVERRIDE_GFX_VERSION="$HSA_OVERRIDE_GFX_VERSION"} \
  ${OLLAMA_FLASH_ATTENTION:+OLLAMA_FLASH_ATTENTION="$OLLAMA_FLASH_ATTENTION"} \
  ${OLLAMA_IGPU_ENABLE:+OLLAMA_IGPU_ENABLE="$OLLAMA_IGPU_ENABLE"} \
  "$OLLAMA_BIN" serve >/tmp/ollama-serve-gpu.log 2>&1 &

for i in $(seq 1 30); do
  if curl -sS -m 2 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
    echo "Ollama ready on :11434 (log: /tmp/ollama-serve-gpu.log)"
    exit 0
  fi
  sleep 0.5
done

echo "Ollama did not become ready — tail /tmp/ollama-serve-gpu.log" >&2
tail -n 40 /tmp/ollama-serve-gpu.log 2>/dev/null || true
exit 1
