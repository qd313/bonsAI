# Agent guide (IDE-neutral)

This repository uses **two MCP servers** for agent-assisted development.

## 1. bonsAI knowledge (`bonsai`)

In-repo server: [`packages/bonsai-mcp/`](packages/bonsai-mcp/). Setup: [docs/mcp-setup.md](docs/mcp-setup.md).

**Session start:** `bonsai.session.bootstrap`

| Tool | Purpose |
|------|---------|
| `bonsai.session.bootstrap` | Always-on policies + index |
| `bonsai.policy.list` / `bonsai.policy.get` | Policy slices (git, focus, deploy, …) |
| `bonsai.workflow.get` | Deck dev loop, tier QA, preview, screenshot ingest |
| `bonsai.docs.search` / `bonsai.docs.get` | Search or read `docs/` |
| `bonsai.arch.rpcMap` | RPC methods from `main.py` |
| `bonsai.arch.hotspots` | Change-risk hotspots + test inventory |
| `bonsai.arch.previewTiers` | Preview suite tier manifest |
| `bonsai.report.archive` | Append to `.cursor/agents/SUBAGENT_REPORTS.md` |

| Prompt | Purpose |
|--------|---------|
| `bonsai/persona/master-debugger` | Decky focus, layout, log capture |
| `bonsai/persona/security-auditor` | Security / PII review |
| `bonsai/persona/foss-advocate` | FOSS / transparency |
| `bonsai/persona/refactor-specialist` | Maintainability sweeps |
| `bonsai/triage/focus-bug` | Short focus triage |
| `bonsai/triage/empty-ai-reply` | AI envelope debugging |

Resources: `bonsai://policy/{id}`, `bonsai://workflow/{id}`, `bonsai://persona/{id}`, `bonsai://architecture/{name}`, `bonsai://index`.

**Archived:** Red/Blue ship counsel → [docs/archive/red-blue-counsel/](docs/archive/red-blue-counsel/README.md).

## 2. Decky Plugin Studio (`decky-plugin-studio`)

Operational Deck preview and deploy. Requires the [Decky Plugin Studio](https://github.com/SteamDeckHomebrew/decky-plugin-studio) VSIX.

| Tool | Purpose |
|------|---------|
| `deck.configure` | Set DECK_IP, DECK_USER, ingest port |
| `deck.startTunnel` / `deck.stopTunnel` | Reverse SSH tunnel for NDJSON ingest |
| `deck.probeIngest` / `deck.tailIngest` | Debug log capture from Deck |
| `deck.captureScreenshot` | Pull Deck UI screenshot |
| `deck.deploy` | Build + deploy to Deck |
| `plugin.detect` / `plugin.build` / `plugin.verifyZip` | Workspace validation and build |
| `preview.start` / `preview.stop` / `preview.status` | In-IDE QAM preview |
| `preview.injectFocusEvent` | Simulate D-pad input |
| `preview.setHardware` | Hardware simulator |
| `preview.runSequence` | Input sequence + DOM snapshot |
| `preview.callRpc` / `preview.readLog` | Backend RPC and log tail |
| `preview.snapshotDom` / `preview.captureScreenshot` | DOM inspect + preview PNG |

## Preview test suite

```bash
pnpm run test:preview:tier -- --tier=tier0 --evidence --write
pnpm run test:preview -- --filter=SMOKE-A
```

Workflow: `bonsai.workflow.get` with `id=tier-qa`. Deck-only E-bucket: `tests/preview-suite/deck-only-e-bucket.json`.

## Git policy

Do not `git push` unless the user explicitly asks. No `cursor/*` branches. See `bonsai://policy/git-branch`.

## Preview limitations

- Approximate `@decky/ui` mocks (not pixel-perfect Steam CEF)
- Hardware reads from simulator; Ollama at `127.0.0.1:11434` by default
- Focus/layout bugs need on-device QA via `deck.deploy`
