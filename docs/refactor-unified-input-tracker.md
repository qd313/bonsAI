# Unified input / main tab refactor — phase tracker

This file backs the phased plan in `.cursor/plans` (unified input refactor scope). **Update this file whenever a phase completes or when you pause** so work does not stall on one phase or skip ahead without finishing prerequisites.

## Rules

1. **One phase at a time** — Do not start Phase B until Phase A is done and verified; do not start C until B is done and verified.
2. **Done means** — Merged change + `pnpm test` + `pnpm run build` + `./scripts/build.ps1` or `./scripts/build.sh` when Deck UI changes + short on-device check (unified input wrap, caret, Ask width, D-pad focus, OSK).
3. **If you pause** — Fill in **Paused at** and **Blockers / next steps** below.
4. **Optional work** — Phase C is optional after B is stable. Phase D (CSS file split) only if still painful after A–C.

## Current status

| Phase | Status | Last updated |
|-------|--------|----------------|
| A — Extract `UNIFIED_*` / `ASK_*` constants (+ optional `splitResponseIntoChunks`) | done | 2026-04-14 |
| B — Extract `useUnifiedInputSurface` (remeasure, refs, surface state) | done | 2026-04-14 |
| Verify — Deck smoke after A | done | 2026-04-14 (`pnpm test`, `pnpm run build`, `scripts/build.ps1`) |
| Verify — Deck smoke after B | done | 2026-04-14 (same; on-device caret/Ask/focus per contributor) |
| C — Optional `MainTab.tsx` | done | 2026-04-14 |
| D — Defer: optional `.bonsai-scope` CSS extract | not started | — |
| Docs — CHANGELOG + `development.md` pointer (if B+ ships) | done | 2026-04-14 |

## Paused / blockers (fill when stopping mid-stream)

- **Paused at:** (e.g. mid Phase A)
- **Blockers / next steps:**

---

See also: [development.md](development.md) for general Deck plugin dev notes.
