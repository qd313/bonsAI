# bonsAI documentation index

Short guide to markdown under `docs/`. Repo root **[README.md](../README.md)** stays the primary install entry; **[CHANGELOG.md](../CHANGELOG.md)** is release history.

| Doc | Audience | What it is |
|-----|----------|------------|
| [mcp-setup.md](mcp-setup.md) | Contributors / agents | **MCP servers** — bonsai knowledge + Decky Plugin Studio ops |
| [development.md](development.md) | Contributors | Deck-first setup, build/deploy, BPM test loop, architecture |
| [troubleshooting.md](troubleshooting.md) | Power users | GPU, network, vision, permissions, QAM, deploy edge cases |
| [roadmap.md](roadmap.md) | Planning / contributors | In progress, planned backlog, and completed shipped work |
| [device-qa-runbook.md](device-qa-runbook.md) | QA / contributors | **What to run on Deck next** — Tier 0–4, cross-cutting smokes |
| [testing.md](testing.md) | QA / contributors | Shipped-feature coverage, scenario checkboxes, Test Results log |
| [regression-and-smoke.md](regression-and-smoke.md) | Contributors / QA | Standing PR automated gates; Deck smokes → runbook |
| [change-risk-hotspots.md](change-risk-hotspots.md) | Contributors | Large files, test signal, suggested refactor order |
| [security-audit-report.md](security-audit-report.md) | Maintainers | RPC/log/UI disclosure review and status |
| [refactor-specialist-sweep.md](refactor-specialist-sweep.md) | Contributors | Past doc/script reorg + unified-input refactor section |

## MCP knowledge (agents)

Policies, workflows, and specialist personas live in [`packages/bonsai-mcp/knowledge/`](../packages/bonsai-mcp/knowledge/). IDE agents should call **`bonsai.session.bootstrap`** at session start. See [mcp-setup.md](mcp-setup.md).

**Start here:** install → [README.md](../README.md); first-time contributor setup → [development.md](development.md); agent MCP → [mcp-setup.md](mcp-setup.md); planning → [roadmap.md](roadmap.md).
