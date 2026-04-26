#!/usr/bin/env bash
# Verify a Decky distributable zip contains the same runtime layout as dev deploy
# (main.py, py_modules/backend/, refactor_helpers.py, dist/index.js, manifests).
set -euo pipefail

usage() {
    echo "Usage: $0 path/to/plugin.zip" >&2
    exit 1
}

[[ $# -eq 1 ]] || usage
ZIP="$1"
if [[ ! -f "$ZIP" ]]; then
    echo "verify-decky-plugin-zip: not a file: $ZIP" >&2
    exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

unzip -q "$ZIP" -d "$TMP"

mapfile -t manifests < <(find "$TMP" -name plugin.json -type f || true)
if [[ ${#manifests[@]} -eq 0 ]]; then
    echo "verify-decky-plugin-zip: no plugin.json inside zip" >&2
    exit 1
fi

ROOT="$(dirname "${manifests[0]}")"
MISSING=()

need_file() {
    local rel="$1"
    if [[ ! -f "$ROOT/$rel" ]]; then
        MISSING+=("$rel")
    fi
}

need_file main.py
need_file plugin.json
need_file package.json
need_file dist/index.js
need_file refactor_helpers.py

for spot in \
    py_modules/backend/services/ollama_service.py \
    py_modules/backend/services/settings_service.py \
    py_modules/backend/__init__.py; do
    need_file "$spot"
done

shopt -s nullglob
py_services=( "$ROOT"/py_modules/backend/services/*.py )
shopt -u nullglob
if [[ ${#py_services[@]} -lt 3 ]]; then
    echo "verify-decky-plugin-zip: expected multiple py_modules/backend/services/*.py, found ${#py_services[@]}" >&2
    exit 1
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo "verify-decky-plugin-zip: missing required paths under plugin root:" >&2
    printf '  %s\n' "${MISSING[@]}" >&2
    exit 1
fi

echo "verify-decky-plugin-zip: OK ($ROOT)"
