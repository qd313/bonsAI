---
name: bonsai-deck-dev-loop
description: >-
  End-to-end maintainer loop for bonsAI on Steam Deck: build/deploy, watch-deploy,
  BPM vs Gaming Mode testing, screenshots, optional log tunnel, and when to use
  decky-screenshot-ingest. Use when changing src/, main.py, plugin.json, or closing
  Deck-facing UI/RPC work.
---

# bonsAI Deck dev loop

## When to use

- After editing **Deck-facing** code: `src/`, `main.py`, `refactor_helpers.py`, `py_modules/`, `plugin.json`.
- Before marking UI/focus/RPC tasks done.
- When the user asks how to test on Deck or iterate quickly.

## One-time setup

From repo root (see [docs/development.md](../../docs/development.md)):

```bash
cp .env.example .env   # DECK_IP, PC_IP, DECK_USER
./scripts/setup-dev.sh
```

Same-machine Deck dev: `DECK_IP=127.0.0.1`, `PC_IP=127.0.0.1`.

## Build and deploy

| Goal | Command |
|------|---------|
| Build + deploy on **this** Deck | `./scripts/build.sh local` |
| Build + deploy to **remote** Deck | `./scripts/build.sh` or `.\scripts\build.ps1` |
| Re-deploy last build only | `./scripts/build.sh deploy --local` or `deploy` (remote) |
| Release zip | `./scripts/build.sh release` |

After deploy, if QAM does not show changes: **Decky Reload** in QAM or restart `plugin_loader` (see troubleshooting).

**Flaky deploy:** retry once; if still failing after ~60–90s, stop and report (SSH/sudo/plugin_loader).

## Fast frontend loop (watch)

1. Terminal A: `./scripts/watch-deploy.sh` (Deck-native) or `.\scripts\watch-deploy.ps1` (Windows → remote Deck).
2. Rollup rebuilds `dist/`; script debounces and runs **deploy only** (no full `pnpm install`).
3. In Steam Desktop → **Big Picture Mode** → QAM → Decky → **Reload** bonsAI after each deploy.

Python/RPC changes still need a full deploy (watch-deploy copies `py_modules/` + `main.py` on each deploy).

## Which test track?

| Track | When |
|-------|------|
| **A — BPM (Desktop)** | Daily UI, Settings, Ask, Ollama RPC, D-pad focus |
| **B — Gaming Mode** | Steam Input, TDP, in-game overlay, gamescope screenshots |

Track A: Steam Desktop → View → Big Picture → QAM → bonsAI.  
Track B: Return to Gaming Mode → QAM → bonsAI.

## Automated gates (before handoff)

From repo root:

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm run test:py
pnpm run build
```

Deck-facing changes: also run `./scripts/build.sh local` or remote equivalent.

## Visual verification (screenshots)

When debugging layout, focus, or QAM:

1. Reproduce on Deck (QAM open for game-mode UI).
2. Run `.\scripts\screenshot-deck.ps1` or `./scripts/screenshot-deck.sh` (or `-Mode game` / `--mode game`).
3. Follow **decky-screenshot-ingest** skill: read newest `screenshots/DeckCapture_*.png`.

On-Deck hotkey (optional): `-InstallDeckHelper` / `--install-deck-helper` then `bonsai-capture` on the Deck.

## Screen recordings (QAM + bonsAI required)

For motion/focus repros or multi-step UI flows:

1. Open QAM and bonsAI on the Deck **before** recording.
2. `.\scripts\record-deck.ps1 -Seconds 20` or `./scripts/record-deck.sh --seconds 20` (prefer `game` mode in Gaming Mode).
3. Clips land in `recordings/DeckRecord_*.mkv` — confirm bonsAI chrome is readable in the video.

See [docs/spikes/deck-screen-recording.md](../../docs/spikes/deck-screen-recording.md). On-Deck: `bonsai-record --seconds 20` after `-InstallDeckHelper`.

## Optional debug log tunnel

If verbose/debug `fetch` targets `127.0.0.1:<port>` on the Deck:

1. Copy `scripts/cursor-deck-log-capture.example.ps1`, set `DECK_HOST` / `INGEST_PORT` in `.env`.
2. Run `scripts/reverse-tunnel-deck-ingest.ps1` or `.sh` on the PC (leave open).
3. Probe from Deck SSH: `curl -sS http://127.0.0.1:<port>/`

Never commit private IPs or ingest secrets — use `.env` only.

## Version bump (maintainer)

Prepare-only (no git tag/push):

```bash
pnpm run version:bump patch   # or minor | major | 0.4.0
```

Then edit `CHANGELOG.md` bullets under the new version, commit, and:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z   # triggers CI plugin zip
```

## Related docs

- [docs/spikes/cursor-deck-visibility.md](../../docs/spikes/cursor-deck-visibility.md)
- [docs/development.md](../../docs/development.md)
- [docs/regression-and-smoke.md](../../docs/regression-and-smoke.md)
- `.cursor/skills/decky-screenshot-ingest/SKILL.md`
