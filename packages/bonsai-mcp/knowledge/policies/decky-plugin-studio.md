---
id: decky-plugin-studio
title: Decky Plugin Studio (upstream sync)
tags: [decky, mcp, preview, alwaysApply]
alwaysApply: true
description: DPS source of truth, document issues, sync changes to upstream
---

## Decky Plugin Studio

- Source of truth for Decky Plugin Studio (extension, MCP `deck.*` / `preview.*` / `plugin.*` tools, capture scripts, Init Pack templates) is **[qd313/decky-plugin-studio](https://github.com/qd313/decky-plugin-studio)** — not this repo.
- bonsAI **consumes** the published VSIX / MCP server; do not fork or permanently vendor DPS behavior here.
- ALWAYS document Decky Plugin Studio bugs, gaps, and needed adds/deletes/changes in bonsAI docs (see [docs/mcp-setup.md](../../../../docs/mcp-setup.md) § Decky Plugin Studio) **and** carry the same change or issue to the upstream DPS repo (issue and/or PR).
- NEVER “fix it only in bonsAI” for DPS tooling, MCP paths, preview/capture scripts, or Init Pack–owned agent assets without updating [qd313/decky-plugin-studio](https://github.com/qd313/decky-plugin-studio).
