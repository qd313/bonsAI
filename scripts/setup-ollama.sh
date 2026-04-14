#!/usr/bin/env bash
set -euo pipefail

green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
cyan()  { printf '\033[1;36m%s\033[0m\n' "$*"; }
red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }

cyan "========================================"
cyan "  Ollama AI Setup for bonsAI (Linux)"
cyan "========================================"
echo

echo "Downloading and installing the latest version of Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

if [[ $? -ne 0 ]]; then
    red "Ollama installation failed."
    echo "Visit https://ollama.com/download for manual installation."
    exit 1
fi
green "Ollama installed/updated successfully."
echo

MODELS=("gemma4" "llama3")

for model in "${MODELS[@]}"; do
    echo "Pulling '${model}' model (this may take a while)..."
    if ollama pull "$model"; then
        green "  ${model} pulled successfully."
    else
        red "  Warning: failed to pull ${model}. You can retry later with: ollama pull ${model}"
    fi
    echo
done

cyan "========================================"
green "Ollama setup complete!"
echo "Models pulled: ${MODELS[*]}"
echo "Ollama should be running on port 11434."
echo "Test with: ollama run llama3 'Hello, Ollama!'"
cyan "========================================"
