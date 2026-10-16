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

- `bonsai.session.bootstrap` — slim session start (policy ids + fetch hints)
- `bonsai.policy.list` / `bonsai.policy.get`
- `bonsai.workflow.get`
- `bonsai.docs.search` / `bonsai.docs.get`
- `bonsai.arch.rpcMap` / `bonsai.arch.hotspots` / `bonsai.arch.previewTiers`
- `bonsai.report.archive`

## Prompts

- `bonsai/persona/{id}` — specialist prompts (security, FOSS, refactor, master-debugger)
- `bonsai/triage/focus-bug` / `bonsai/triage/empty-ai-reply`

**Archived:** Red/Blue counsel and ship-review template → [workshop:archive/red-blue-counsel/](../../../bonsAI-workshop/archive/red-blue-counsel/README.md).

## Scripts

```bash
npm run generate   # regenerate knowledge/architecture/*.json
npm run validate   # frontmatter + freshness (same gate as CI validate-mcp)
```

From repo root: `pnpm run mcp:generate`, `pnpm run mcp:validate`, `pnpm run mcp:build`.

After changing `main.py` / `src/` / preview suite / `.env.example`, regenerate and commit architecture JSON in the same change set (see [docs/mcp-setup.md](../../docs/mcp-setup.md)).

See [docs/mcp-setup.md](../../docs/mcp-setup.md) for IDE configuration.
