# bonsAI MCP setup

bonsAI uses **two complementary MCP servers**:

| Server | Package | Role |
|--------|---------|------|
| **bonsai** | In-repo [`packages/bonsai-mcp/`](../packages/bonsai-mcp/) | Policies, workflows, personas, architecture index, doc search |
| **decky-plugin-studio** | [Decky Plugin Studio](https://github.com/SteamDeckHomebrew/decky-plugin-studio) extension | Build, deploy, preview, tunnel, screenshots |

## Prerequisites

```bash
cd packages/bonsai-mcp
npm install
npm run build
```

From repo root you can also run:

```bash
pnpm run mcp:build
```

## Cursor

Primary config: [`.cursor/mcp.json`](../.cursor/mcp.json) (Cursor loads this on project open).

Root [`mcp.json`](../mcp.json) mirrors the same servers for other MCP clients.

Add to project MCP settings (if not using `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "bonsai": {
      "command": "node",
      "args": ["packages/bonsai-mcp/dist/index.js"],
      "env": {
        "BONSAI_REPO_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

Keep **decky-plugin-studio** configured in the same file (see [AGENTS.md](../AGENTS.md)).

**After first clone or MCP changes:** run `pnpm run mcp:install && pnpm run mcp:build`, then **Developer: Reload Window** (or restart Cursor). Confirm **bonsai** shows green in **Cursor Settings → MCP**.

**Session start:** a `sessionStart` hook auto-injects always-on policies; agents may also call `bonsai.session.bootstrap`.

## Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bonsai": {
      "command": "node",
      "args": ["/absolute/path/to/bonsAI/packages/bonsai-mcp/dist/index.js"],
      "env": {
        "BONSAI_REPO_ROOT": "/absolute/path/to/bonsAI"
      }
    }
  }
}
```

## Generic MCP clients

- Transport: **stdio**
- Entry: `node packages/bonsai-mcp/dist/index.js`
- Required env: `BONSAI_REPO_ROOT` → git repo root (must contain `plugin.json`, `main.py`, `packages/bonsai-mcp/`)

## Key tools

| Tool | When |
|------|------|
| `bonsai.session.bootstrap` | Start of session — always-on policies |
| `bonsai.workflow.get` | Deck dev loop, tier QA, preview, screenshots |
| `bonsai.policy.get` / `bonsai.policy.list` | Specific policy slices |
| `bonsai.docs.search` / `bonsai.docs.get` | Search or read `docs/` |
| `bonsai.arch.rpcMap` / `bonsai.arch.hotspots` | Codebase context |
| `bonsai.report.archive` | Append subagent findings |

## Key prompts

| Prompt | When |
|--------|------|
| `bonsai/persona/master-debugger` | Focus, layout, log capture |
| `bonsai/persona/security-auditor` | RPC, logging, permissions review |
| `bonsai/persona/red-team` / `bonsai/persona/blue-team` | Ship / scope decisions |
| `bonsai/triage/focus-bug` | Short focus triage checklist |
| `bonsai/triage/empty-ai-reply` | Silent/truncated AI replies |

## Knowledge without MCP

All knowledge files are plain markdown under `packages/bonsai-mcp/knowledge/` and remain readable in git without MCP.

Regenerate architecture JSON after RPC or structure changes:

```bash
pnpm run mcp:generate
```
