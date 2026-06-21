# @bonsai/mcp

IDE-agnostic MCP knowledge server for the bonsAI Decky plugin.

## Quick start

```bash
npm install
npm run build
```

Set `BONSAI_REPO_ROOT` to the bonsAI git root. Run via stdio:

```bash
BONSAI_REPO_ROOT=/path/to/bonsAI node dist/index.js
```

## Knowledge layout

| Path | Content |
|------|---------|
| `knowledge/policies/` | Git, deploy, focus, permissions, planning rules |
| `knowledge/workflows/` | Deck dev loop, tier QA, preview, screenshot ingest |
| `knowledge/personas/` | Specialist agent system prompts |
| `knowledge/architecture/` | Generated RPC map, module map, test inventory |

## Tools

- `bonsai.session.bootstrap` — session start
- `bonsai.policy.list` / `bonsai.policy.get`
- `bonsai.workflow.get`
- `bonsai.docs.search` / `bonsai.docs.get`
- `bonsai.arch.rpcMap` / `bonsai.arch.hotspots` / `bonsai.arch.previewTiers`
- `bonsai.report.archive`

## Prompts

- `bonsai/persona/{id}` — full specialist prompts
- `bonsai/triage/focus-bug` / `bonsai/triage/empty-ai-reply`
- `bonsai/plan/ship-review`

## Scripts

```bash
npm run generate   # regenerate knowledge/architecture/*.json
npm run validate   # check frontmatter + required generated files
```

From repo root: `pnpm run mcp:generate`, `pnpm run mcp:validate`, `pnpm run mcp:build`.

See [docs/mcp-setup.md](../../docs/mcp-setup.md) for IDE configuration.
