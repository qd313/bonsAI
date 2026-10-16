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
| `knowledge/workflows/` | Deck dev loop, screenshot ingest |
| `knowledge/personas/` | Specialist agent system prompts |
| `knowledge/architecture/` | Two hand-written maps (`focus-graph-patterns.md`, `platform-contract.md`). The RPC map, module map, test inventory and the rest are JSON files built when the server starts; they are not saved in the repo |

## Tools

- `bonsai.session.bootstrap` — slim session start (policy ids + fetch hints)
- `bonsai.policy.list` / `bonsai.policy.get`
- `bonsai.workflow.get`
- `bonsai.docs.search` / `bonsai.docs.get`
- `bonsai.arch.rpcMap` / `bonsai.arch.hotspots`
- `bonsai.report.archive`

## Prompts

- `bonsai/persona/{id}` — specialist prompts (security, FOSS, refactor, master-debugger)
- `bonsai/triage/focus-bug` / `bonsai/triage/empty-ai-reply`

**Archived:** Red/Blue counsel and ship-review template → [workshop:archive/red-blue-counsel/](../../../bonsAI-workshop/archive/red-blue-counsel/README.md).

## Scripts

```bash
npm run generate   # build knowledge/architecture/*.json by hand (the server builds them itself at start-up)
npm run validate   # frontmatter + src/types/rpcMethods.ts freshness (same gate as CI validate-mcp)
npm run smoke      # after npm run build: start the server with no maps on disk and check its answers
```

From repo root: `pnpm run mcp:generate`, `pnpm run mcp:validate`, `pnpm run mcp:build`.

The architecture JSON is not saved in the repo, so there is nothing to regenerate or commit after changing `main.py` / `src/`. The one generated file that is saved, `src/types/rpcMethods.ts`, is rewritten by the commit hook (see [docs/mcp-setup.md](../../docs/mcp-setup.md)).

See [docs/mcp-setup.md](../../docs/mcp-setup.md) for IDE configuration.
