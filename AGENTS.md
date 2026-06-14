# Decky Plugin Development — Agent Guide

This repository is configured for **Decky Plugin Studio**. Use the bundled MCP tools and subagent personas in `.cursor/agents/` when working on this plugin.

## Platform contract (read first)

- **Focus-graph first:** D-pad navigation uses Decky `Focusable` callbacks (`onMoveLeft`, `onMoveRight`, `onOKButton`, etc.), not DOM `keydown`.
- **Build parity:** After changes to `src/`, `main.py`, or `plugin.json`, run `plugin.build` (MCP) or `./scripts/build.ps1` / `./scripts/build.sh` before on-device QA.
- **Preview vs on-device:** Use `preview.start` for fast iteration; use `deck.deploy` + on-device QA for focus/layout bugs the preview cannot reproduce faithfully.

## MCP tools (Decky Plugin Studio)

| Tool | Purpose |
|------|---------|
| `deck.configure` | Set DECK_IP, DECK_USER, ingest port |
| `deck.startTunnel` / `deck.stopTunnel` | Reverse SSH tunnel for NDJSON ingest |
| `deck.probeIngest` / `deck.tailIngest` | Debug log capture from Deck |
| `deck.captureScreenshot` | Pull Deck UI screenshot |
| `deck.deploy` | Build + deploy (local SteamOS/Bazzite or remote SSH) |
| `plugin.detect` / `plugin.build` / `plugin.verifyZip` | Workspace validation and build |
| `preview.start` / `preview.stop` / `preview.status` | In-IDE QAM preview |
| `preview.injectFocusEvent` | Simulate D-pad input |
| `preview.setHardware` | Drive hardware simulator (temps, battery, fans) |
| `preview.runSequence` | Replay input sequence + return DOM snapshot |
| `preview.callRpc` / `preview.readLog` | Backend RPC and log tail |
| `preview.snapshotDom` / `preview.captureScreenshot` | Idle DOM inspect + preview PNG under `screenshots/preview/` |

## Preview test suite (bonsAI)

From repo root (preview panel must be open — **Decky: Open Preview**):

```bash
pnpm run test:preview:tier -- --tier=tier0 --evidence --write
pnpm run test:preview -- --filter=SMOKE-A
```

PASS → `docs/prompt-testing.md`; FAIL → `docs/prompt-testing-failures.md`. Agent loop: `.cursor/skills/bonsai-tier-qa/SKILL.md`.

Deck-only bucket **E** scenarios are documented in `tests/preview-suite/deck-only-e-bucket.json` — use `deck.deploy` + device runbook.

## Subagents

Invoke personas from `.cursor/agents/` for specialized reviews:

- **master-debugger** — Decky/Steam focus, layout, ingest/tunnel workflow
- **refactor-specialist** — maintainability sweeps
- **security-auditor** — RPC, logging, permissions
- **foss-advocate** — FOSS/transparency
- **bonsai-tier-qa** — tier-by-tier preview QA, evidence writeback, E-bucket Deck path
- **red-team** / **blue-team** — scope and ship decisions

Archive substantive runs in `.cursor/agents/SUBAGENT_REPORTS.md`.

## Preview limitations

- Approximate `@decky/ui` mocks (not pixel-perfect Steam CEF)
- Hardware reads served from simulator; writes logged/mocked
- Ollama allowed at `127.0.0.1:11434` by default; other HTTP blocked
- All Decky permissions treated as granted in preview
