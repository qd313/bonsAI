# Refactor-specialist sweep — bonsAI repository

> **Historical note:** This file records a **past** documentation and script-layout reorg (moving guides under `docs/` and automation under `scripts/`). Current canonical paths are [README.md](../README.md) and the other markdown guides in this `docs/` directory. Do not treat the “before this reorg” tables below as the live layout.

Report format follows `.cursor/agents/refactor-specialist.md` (Sweep / Planning + individual findings).

## Current behavior

**Plugin role:** bonsAI is a Decky Loader plugin that exposes a React/TypeScript UI (`src/index.tsx`, components) and a Python backend (`main.py`) implementing Decky RPC methods. User prompts and settings flow through the backend, which calls Ollama on a user-configured host (LAN or local). Heavy logic is split across `backend/services/` (Ollama transport, settings, TDP/sysfs) and `refactor_helpers.py` (URL building, TDP parsing, model selection). The frontend bundles to `dist/index.js` referenced by `plugin.json`.

**Documentation roles (before this reorg):**

| File | Audience |
|------|----------|
| `README.md` | Install, Ollama quick setup, links to advanced docs |
| `CHANGELOG.md` | Release notes |
| `DEVELOPMENT.md` | Contributors: toolchain, env, build/deploy, architecture notes |
| `INSTALL_STEPS_TROUBLESHOOTING.md` | Power users: GPU, network, vision, deploy edge cases |
| `PROMPT_TESTING.md` | Prompt QA matrix and release notes for model behavior |
| `TODO.md` | Active roadmap, bugs, short “future” bullets |
| `FUTURE_FEATURES.md` | Long-form candidate features, dependency graph, implementation notes |

**Automation roles:** PowerShell and bash scripts at repo root (and Ollama helpers under `src/`) load `.env`, run `pnpm` builds, SSH-deploy to a Deck, or install Decky CLI / Ollama. Paths assumed the script lived at repo root (`PSScriptRoot` / `SCRIPT_DIR` = root).

## Hotspots

- **Split roadmap:** `TODO.md` duplicated themes from `FUTURE_FEATURES.md` (checkbox list vs deep specs), increasing the chance one file drifts from the other.
- **Asymmetric Ollama scripts:** Windows path pointed to `src/setup_ollama.ps1`, Linux to root `setup-ollama.sh`, plus an extra `src/setup_ollama.sh` variant — three entrypoints for similar intent.
- **Long troubleshooting KB:** Single large file mixed GPU tuning, CORS, vision, sudoers/deploy debugging, and QAM strategy — acceptable as one KB but sat at root with a long filename.
- **Deploy scripts coupled to cwd:** After any move to `scripts/`, scripts must resolve **repository root** for `.env`, `pnpm`, `cli/decky`, and Decky `plugin build` (not the `scripts/` directory).

## Problems (individual findings)

**Finding:** Roadmap split across two files  
**File:** `TODO.md:1`, `FUTURE_FEATURES.md:1`  
**Severity:** ★★  
**Clarity tax:** Contributors must guess whether to update short bullets or long-form specs; links between them can stale.  
**Specific refactor:** Merge into `docs/roadmap.md` with a clear “active / in progress” section and a fenced “detailed future (do not implement yet)” section preserving the existing warning.

**Finding:** Automation paths assume script location is repo root  
**File:** `build.sh:4-5`, `build.ps1:2`, `setup-dev.ps1:2`, `setup-dev.sh:4-5`  
**Severity:** ★★★  
**Clarity tax:** Moving scripts without `REPO_ROOT` / parent-directory resolution breaks `.env`, `pnpm`, and `cli/decky` resolution silently or with confusing errors.  
**Specific refactor:** Set `REPO_ROOT` to parent of `scripts/`, `cd` there, and use `REPO_ROOT` for CLI paths and `decky plugin build`.

**Finding:** Ollama helper scripts fragmented  
**File:** `src/setup_ollama.ps1`, `setup-ollama.sh`, `src/setup_ollama.sh`  
**Severity:** ★★  
**Clarity tax:** Users and docs reference different paths; two Linux scripts differ slightly (model lists).  
**Specific refactor:** Consolidate under `scripts/`; keep one Linux `setup-ollama.sh` (bonsAI-oriented) and one Windows `setup_ollama.ps1`; remove redundant `src/setup_ollama.sh`.

## Refactor plan (executed in this change set)

1. Add `docs/refactor-specialist-sweep.md` (this file) as the sweep record.
2. Move contributor/power-user markdown into `docs/` with stable names: `development.md`, `troubleshooting.md`, `prompt-testing.md`, `roadmap.md` (merge `TODO.md` + `FUTURE_FEATURES.md`).
3. Leave `README.md` and `CHANGELOG.md` at repo root; update `README` doc links and script paths to `docs/…` and `scripts/…`.
4. Move shell/PowerShell automation into `scripts/`; fix root resolution; update `.cursorrules` and `CHANGELOG` references.
5. Verify: `pnpm run build`, `pnpm test`, `python -m unittest discover -s tests -p "test_*.py"`.

## Open questions

- **External bookmarks:** Old filenames (`DEVELOPMENT.md`, `INSTALL_STEPS_TROUBLESHOOTING.md`, etc.) will break if shared off-repo. This change does **not** add stub redirect files at old paths (fewer root files). Add stubs later if needed.
- **`refactor_helpers.py`:** Remains at repo root (imported by `main.py` and tests); not moved into `scripts/` because it is library code, not an executable script.

## Verification (post-change)

- [x] `pnpm run build` succeeds  
- [x] `pnpm test` succeeds  
- [x] `python -m unittest discover -s tests -p "test_*.py"` succeeds  
- [x] `plugin.json` / `main.py` / `dist/` layout unchanged for Decky packaging  

## Trade-offs

- **Canonical paths only:** No root wrapper scripts for `build.ps1`; `.cursorrules` and docs now reference `./scripts/build.ps1` (or `.\scripts\build.ps1` on Windows) for clarity and a single source of truth.

---

## Unified input refactor (completed)

> **Former tracker:** Progress lived in `docs/refactor-unified-input-tracker.md` (now a one-line redirect). This section is the archived snapshot.

Phased work backed plans under `.cursor/plans` (unified input / main tab scope). **All phases A–C and doc hooks are done** (as of 2026-04-14). **Phase D** (optional `.bonsai-scope` CSS extract) remains **not started** if layout pain returns.

### Rules (historical)

1. **One phase at a time** — Do not start Phase B until Phase A is done and verified; do not start C until B is done and verified.
2. **Done means** — Merged change + `pnpm test` + `pnpm run build` + `./scripts/build.ps1` or `./scripts/build.sh` when Deck UI changes + short on-device check (unified input wrap, caret, Ask width, D-pad focus, OSK).
3. **If you pause** — Record **Paused at** and **Blockers / next steps** in a PR or planning artifact (this section is closed).
4. **Optional work** — Phase C was optional after B was stable. Phase D only if still painful after A–C.

### Final status

| Phase | Status | Last updated |
|-------|--------|----------------|
| A — Extract `UNIFIED_*` / `ASK_*` constants (+ optional `splitResponseIntoChunks`) | done | 2026-04-14 |
| B — Extract `useUnifiedInputSurface` (remeasure, refs, surface state) | done | 2026-04-14 |
| Verify — Deck smoke after A | done | 2026-04-14 (`pnpm test`, `pnpm run build`, `scripts/build.ps1`) |
| Verify — Deck smoke after B | done | 2026-04-14 (same; on-device caret/Ask/focus per contributor) |
| C — Optional `MainTab.tsx` | done | 2026-04-14 |
| D — Defer: optional `.bonsai-scope` CSS extract | not started | — |
| Docs — CHANGELOG + `development.md` pointer (if B+ ships) | done | 2026-04-14 |

### Where the code lives

- Deck measurement, refs, surface height: [`src/features/unified-input/useUnifiedInputSurface.ts`](../src/features/unified-input/useUnifiedInputSurface.ts)
- Layout constants: [`src/features/unified-input/constants.ts`](../src/features/unified-input/constants.ts)
- Main tab JSX: [`src/components/MainTab.tsx`](../src/components/MainTab.tsx)

See [development.md](development.md) for general Deck plugin dev notes.
