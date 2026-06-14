#!/usr/bin/env bash
set -euo pipefail

echo "=== ollama serve PID ==="
pid="$(pgrep -f 'ollama serve' | head -1 || true)"
echo "PID=${pid:-none}"

if [[ -n "${pid:-}" ]]; then
  echo "=== GPU-related env on ollama serve ==="
  tr '\0' '\n' < "/proc/$pid/environ" | grep -E '^(OLLAMA_|HSA_|GGML_|ROCM|CUDA|VK_)' || echo "(none set)"
fi

echo "=== installed models ==="
curl -sS -m 5 http://127.0.0.1:11434/api/tags | head -c 600
echo

echo "=== 60s generate probe (gemma4:latest) ==="
start=$(date +%s)
body='{"model":"gemma4:latest","prompt":"Reply with exactly: hello there","stream":false,"options":{"num_predict":16}}'
if out=$(curl -sS -m 60 -H 'Content-Type: application/json' -d "$body" http://127.0.0.1:11434/api/generate); then
  end=$(date +%s)
  echo "elapsed=$((end-start))s"
  echo "$out" | head -c 500
  echo
else
  echo "generate failed or timed out at 60s"
fi
