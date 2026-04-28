# FOSS advocate snapshot

**Date:** 2026-04-28  
**Scope:** Repository metadata and declared runtime dependencies (not a full transitive license audit).

## Summary

bonsAI is a **self-hosted** Decky plugin: the user’s Ollama instance and chosen models run on hardware they control. The project aligns with local-first, user-directed AI use described in [README.md](../README.md) (open source vs open weight, hallucination limits).

**Confirmed finding:** None that reduce software freedom or force a closed model for core operation. The app does not bundle a proprietary inference engine; it calls user-configured Ollama endpoints.

## Licenses and metadata

| Item | Notes |
|------|--------|
| `package.json` `license` | `Apache-2.0` |
| Root [`LICENSE`](../LICENSE) / [`NOTICE`](../NOTICE) | Apache License 2.0 text; `NOTICE` lists bonsAI copyright (Quentin Davis) and retained BSD 3-Clause attribution for Steam Deck Homebrew decky-plugin-template portions |
| Frontend bundle | TypeScript/React; see `package.json` `dependencies` / `devDependencies` |
| Backend | Python 3 on-device (`main.py`, `backend/services/`); standard library plus project code for HTTP to Ollama |

## Key open-source dependencies (npm)

Declared in [package.json](../package.json): `@decky/api`, `@decky/ui`, `decky-frontend-lib`, `rollup` toolchain, `react-icons`, `tslib`, `typescript`, `vitest`, etc. These are public packages intended for Decky plugin development. **Repository / homepage URLs** in `package.json` still point at the upstream Decky plugin template; update them if you publish a fork (maintainability only—not a license violation).

## AI stack

- **Inference:** User-installed **Ollama** and models from the public library; model license and openness vary by tag (see README “Self-hosted and model transparency”).
- **Transparency:** Input sanitization, optional input-handling transparency UI, and permission-gated filesystem features are documented in user-facing docs.

## Maintainer note

Per `.cursor/agents/foss-advocate.md`, when there are no confirmed FOSS-policy violations:

No issues found
