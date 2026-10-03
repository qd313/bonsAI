# Ship review template (bonsAI) — archived 2026-06-26

> Links in this file into the roadmap may be stale: the roadmap was split and trimmed on 2026-10-03 (plan 80). Current files: [roadmap.md](../../roadmap.md), [roadmap-kb.md](../../roadmap-kb.md), [roadmap-shelved.md](../../roadmap-shelved.md).

Former MCP prompt: `bonsai/plan/ship-review`.

Invoke **red-team** and **blue-team** personas via archived prompts in this folder (`persona-red-team.md`, `persona-blue-team.md`).

## Red team lens

- Defer non-blocking scope; prioritize bugfixes and regression risk.
- Cite hidden coupling (RPC, focus, sysfs, settings).

## Blue team lens

- Trust, consent, and honest first-run UX cannot ship misleading.
- Document any veto or cut-the-line requests for human judge.

## Required plan sections

- GTA star ratings per `docs/roadmap.md`
- Subagent reports and follow-ups
- Triage vs deferred for risky surfaces

**Active replacement:** [roadmap.md](../../roadmap.md) priorities + domain specialists (`security-auditor`, `foss-advocate`, `refactor-specialist`, `master-debugger`).
