---
id: deck-dev-loop
description: Deck dev loop
---

# bonsAI Deck dev loop

## When to use

- After editing **Deck-facing** code: `src/`, `main.py`, `py_modules/`, `plugin.json`.
- Before marking UI/focus/RPC tasks done.
- When the user asks how to test on Deck or iterate quickly.

## One-time setup

From repo root (see [docs/development.md](../../../../docs/development.md)):

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

| Track | When | Runbook |
|-------|------|---------|
| **A — BPM (Desktop)** | Daily UI, Settings, Ask, Ollama RPC, D-pad focus | [testing.md](../../../../docs/testing.md) **Tier 0** (SMOKE-A, C, F) |
| **B — Gaming Mode** | Steam Input, TDP, in-game overlay, gamescope screenshots | **Tier 1** (SMOKE-B, E, H) after Tier 0 |

Track A: Steam Desktop → View → Big Picture → QAM → bonsAI.  
Track B: Return to Gaming Mode → QAM → bonsAI.

Scenario detail and coverage: [testing.md](../../../../docs/testing.md). Automated gates: [testing-automated.md](../../../../docs/testing-automated.md). Deck smokes: [testing-manual.md](../../../../docs/testing-manual.md).

## New focusable controls (D-pad)

When adding Settings/QAM toggles, buttons, sliders, or chip rows:

1. Design the **section-level focus graph** before coding UI polish — see `bonsai://architecture/focus-graph-patterns`.
2. For `DeckFocusSlider`: add a parent **Focusable bridge** (or Ollama-style parent refs); never rely on thumb-only props.
3. On-Deck QA: [testing.md](../../../../docs/testing.md) **FOCUS-GRAPH-01…05** + feature-specific row (e.g. UI-SCALE-05).
4. Policy gate: `bonsai://policy/decky-ui-focus` § **New controls & settings rows**.

**Focus bugs:** main agent runs the checklist in `.cursor/rules/decky-focus-graph.mdc` (screenshots → name graph → one evidence-backed fix). Task **master-debugger** only for a real debug loop (still broken after that, or instrumentation/log proof). Preview mocks do **not** validate Deck focus graphs — deploy + on-Deck pass required.

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

When debugging layout, focus, or QAM (or the user says a capture is in the repo):

1. Reproduce on Deck (QAM open for game-mode UI).
2. Run `.\scripts\screenshot-deck.ps1` or `./scripts/screenshot-deck.sh` (or `-Mode game` / `--mode game`).
3. Follow skill **decky-screenshot-ingest**: Shell-list `screenshots/` by mtime (**not** Glob — folder is gitignored), then Read newest `DeckCapture_*.png`.

On-Deck hotkey (optional): `-InstallDeckHelper` / `--install-deck-helper` then `bonsai-capture` on the Deck.

## Screen recordings (QAM + bonsAI required)

For motion/focus repros or multi-step UI flows:

1. Open QAM and bonsAI on the Deck **before** recording.
2. `.\scripts\record-deck.ps1 -Seconds 20` or `./scripts/record-deck.sh --seconds 20` (prefer `game` mode in Gaming Mode).
3. Clips land in `recordings/DeckRecord_*.mkv` — confirm bonsAI chrome is readable in the video.

See [workshop:archive/spikes/deck-screen-recording.md](../../../../../bonsAI-workshop/archive/spikes/deck-screen-recording.md). On-Deck: `bonsai-record --seconds 20` after `-InstallDeckHelper`.

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

- [workshop:archive/spikes/cursor-deck-visibility.md](../../../../../bonsAI-workshop/archive/spikes/cursor-deck-visibility.md)
- [docs/development.md](../../../../docs/development.md)
- [docs/testing.md](../../../../docs/testing.md)
- `bonsai://workflow/screenshot-ingest` (screenshot ingest workflow)
