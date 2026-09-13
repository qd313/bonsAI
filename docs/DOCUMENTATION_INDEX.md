# bonsAI documentation index

Short guide to markdown under `docs/`. Repo root **[README.md](../README.md)** stays the primary install entry; **[CLAUDE.md](../CLAUDE.md)** orients agents on the codebase; **[CHANGELOG.md](../CHANGELOG.md)** is release history.

| Doc | Audience | What it is |
|-----|----------|------------|
| [mcp-setup.md](mcp-setup.md) | Contributors / agents | MCP servers — bonsai knowledge + Decky Plugin Studio |
| [development.md](development.md) | Contributors | Deck-first setup, build/deploy, architecture, hotspots |
| [troubleshooting.md](troubleshooting.md) | Power users | GPU, network, vision, permissions, QAM, deploy edge cases |
| [roadmap.md](roadmap.md) | Planning | Active index — Bugs, Verify, themed Backlog. Entries are kept short on purpose |
| [roadmap-details.md](roadmap-details.md) | Planning | Long-form notes for **open** roadmap items — steps, measurements, ruled-out leads |
| [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md) | Planning / refactor | Locked D1–D15 decisions, execution order, cleanup candidates |
| [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md) | Planning | Fixed-bug writeups (full detail) |
| [testing.md](testing.md) | QA / contributors | Testing hub + slim coverage |
| [testing-automated.md](testing-automated.md) | Agents / CI | Commands runnable without a human on Deck |
| [testing-manual.md](testing-manual.md) | Maintainers | On-Deck smokes and Tier 0–4 runbook |
| [knowledge-base.md](knowledge-base.md) | Maintainers | Offline RAG / corpus phases |
| [code-clarity.md](code-clarity.md) | Contributors / agents | Module header convention and its exclusions |
| [design-language.md](design-language.md) | Contributors / agents | **Read before adding UI.** Eight layout rules, each earned by a specific bug — starting with using every pixel of the 300px QAM column |
| [design-tokens.md](design-tokens.md) | Contributors / agents | Palette, surfaces, focus rings, type scale, layout constants |
| [major-redesign.md](archive/major-redesign.md) | Planning / maintainers | Named chat slots v2 — mockup spec, decisions R1–R5, phased path |
| [glossary.md](glossary.md) | Everyone | Terms used in file headers and maintainer docs |
| [rag-retrieval-quality-remediation-implementation-plan.md](archive/rag-retrieval-quality-remediation-implementation-plan.md) | Maintainers | **Active** RAG hybrid-retrieval fix plan (PR1/PR2) |
| [planning/](planning/) | Maintainers / agents | Planning prompts ([roadmap-planning-questions.md](archive/roadmap-planning-questions.md)), answers (Q1–Q13), [web-permission-discovery.md](planning/web-permission-discovery.md) |
| [audit/](audit/) | Contributors / agents | Refactor recon — read before re-deriving anything |
| [archive/reports/](archive/reports/) | Maintainers | Security / FOSS review snapshots |
| [archive/](archive/) | — | Historical research, plans, completed features, old testing dumps |

The archived RAG *analysis* lives at
[archive/rag-retrieval-quality-remediation-plan.md](archive/rag-retrieval-quality-remediation-plan.md).
Its name differs from the active implementation plan by one word — implement from
the file listed in the table above, not that one.

## MCP knowledge (agents)

Policies, workflows, and specialist personas live in [`packages/bonsai-mcp/knowledge/`](../packages/bonsai-mcp/knowledge/). Call **`bonsai.session.bootstrap`** at session start. See [mcp-setup.md](mcp-setup.md).

**Start here:** install → [README.md](../README.md); contributor setup → [development.md](development.md); agent MCP → [mcp-setup.md](mcp-setup.md); on-Deck QA → [testing-manual.md](testing-manual.md); planning → [roadmap.md](roadmap.md) and [planning/](planning/) answers.
