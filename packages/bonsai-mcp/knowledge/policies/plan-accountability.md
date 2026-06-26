---
id: plan-accountability
title: Planning and subagent accountability
tags: [planning, alwaysApply]
alwaysApply: true
description: Star ratings in plans and subagent report requirements
---

## Planning & subagent accountability

- When **drafting or updating any implementation plan** for this repo (including Cursor plan artifacts), include **GTA-scale star ratings** (`★`–`★★★★★★`, same legend and effort/risk meaning as `docs/roadmap.md`) for the overall change and for each major sub-deliverable so plans stay comparable to roadmap items at a glance.
- When **drafting or updating any implementation plan** (including Cursor plan artifacts), include a mandatory top-level section **Subagent reports and follow-ups** when the task touches areas covered by a specialist agent (see MCP prompts `bonsai/persona/*` — e.g. security, FOSS/transparency, refactors/maintainability, Decky focus/layout debugging), or when such an agent was invoked in the session.
- That section must list: **which agents** (by name), **whether their output was reviewed**, a **short summary of actionable findings** (or `No issues found`, or `N/A — scope did not apply` with one-line reason), and **where findings are recorded** — use `bonsai.report.archive` MCP tool and/or update `docs/*-report.md` when those files are the canonical published snapshot (e.g. `docs/security-audit-report.md`, `docs/foss-advocate-report.md`).
- Before calling work **done** or ready to merge on **risky surfaces** (RPC contracts, logging, user-visible errors, permissions/capabilities, large refactors), explicitly state whether the latest relevant subagent report was **triaged** or **deferred** (with next step or owner). Do not skip this by omission.
