#!/usr/bin/env bash
# Verify a Decky distributable zip contains the same runtime layout as dev deploy
# (main.py, py_modules/backend/, dist/index.js, manifests), the data files the back end reads,
# and every licence file the download owes: LICENSE, NOTICE and the third-party licences file.
# Refuses a program dropped into bin/ (it would ship without its notice) and the game notes.
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

# Licences the download must carry (scripts/stage_zip_extras.py stages NOTICE; npm run build
# writes the third-party file).
need_file LICENSE
need_file NOTICE
need_file dist/THIRD-PARTY-LICENSES.txt

# Data the back end reads from the plugin folder (staged by scripts/stage_zip_extras.py).
need_file data/settings-search-targets.json
need_file data/intent-packs/deck-basics.json

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

# bin/README.md invites dropping in a prebuilt voice program; one packed by accident would
# ship with no licence notice. Only the note itself may be in bin/.
if [[ -d "$ROOT/bin" ]]; then
    mapfile -t bin_extra < <(cd "$ROOT" && find bin -type f ! -path bin/README.md | sort)
    if [[ ${#bin_extra[@]} -gt 0 ]]; then
        echo "verify-decky-plugin-zip: bin/ may hold only README.md; found:" >&2
        printf '  %s\n' "${bin_extra[@]}" >&2
        exit 1
    fi
fi

# ATTR-4.2 — Apache-2.0 plugin zip must not bundle the separately licensed KB corpus.
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$REPO_ROOT/scripts/plugin_zip_corpus_guard.py" --dir "$ROOT" || exit 1

echo "verify-decky-plugin-zip: OK ($ROOT)"
