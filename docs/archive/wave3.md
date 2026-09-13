# Wave 3 integration report (2026-08-07)

Three parallel implementation workers landed in separate worktrees and were integrated onto `experimental` via cherry-pick. This report records goals, commit lineage, automated verification, integration conflicts, and outstanding on-Deck QA.

## Scale note

Wave 3 adds **transparency chips** (KB corpus honesty + spoiler-risk band), plus a **permission deep-link** from denial surfaces to the matching Permissions toggle. Integration risk concentrated on shared transparency manifest builders (`transparency_service.py`, `game_ai_request.py`, `inputTransparency.ts`) and roadmap/testing docs. Cherry-pick order **I then C then K** kept spoiler work atop KB coverage so both chip appends could auto-merge; only generated `hotspots.json` needed manual resolution.

## Scope

| ID | Item | Type | Worktree path / branch | Original commit | Main `experimental` commit |
|----|------|------|------------------------|-----------------|----------------------------|
| I | KB coverage chip (Show details) | Feature | `kb-coverage-14fe3a58` (detached at `61026c2`) | `61026c27d0e1936dcff39842339d2af76c859b60` | `b5093d2` |
| C | Spoiler risk chip (Show details) | Feature | `spoiler-risk-chip-d18093e4` / `wave3-spoiler-risk-chip` | `30b9bade2491dd775f13d603751b3f06dfebaf27` | `0ba5575` |
| K | Permission jump (deny → Permissions) | Feature | `perm-jump-a7f3c2e1` (detached at `4eb2159`) | `4eb2159a325eb4ad25d1b7e658dc91a4549346d7` | `3ecd9d0` |
| - | This report | Docs | - | - | *(see integration commit after cherry-picks)* |

**Base for all worktrees:** `79189f2` (`experimental` at Wave 3 start — Wave 2 results doc).

**Integration method:** `git cherry-pick` (I, then C, then K). Original worktree SHAs are **not** preserved on `experimental`; new commit hashes are listed above.

**Agent transcripts:** [Spoiler risk chip (C)](63099ecc-8fde-4f59-a6f8-ab0100c67385) · [KB coverage (I)](d80764f0-7277-492c-a278-deec7d71558b) · [Permission jump (K)](d0dd552c-ac71-4bf3-9a28-d08daf5daae8)

## Item I — KB corpus coverage chip

**Problem:** Users could enable local KB without knowing whether the installed corpus actually covered the current game.

**Approach:** `summarize_kb_coverage` in `knowledge_base_service.py` reports off / none-for-game / section count; Ask path stamps `kb_coverage_*` on Ollama results; `transparency_service.py` emits a distinct `kb_coverage` chip (corpus honesty) separate from the existing `kb` chip (Ask-turn retrieval).

**Files (representative):** `knowledge_base_service.py`, `game_ai_request.py`, `transparency_service.py`, `inputTransparency.ts`, `tests/test_knowledge_base_service.py`, `tests/test_transparency_kb_retrieval.py`, roadmap/testing docs, `hotspots.json`.

**Tests:** `test_transparency_kb_retrieval.py` (8 cases) and KB coverage cases in `test_knowledge_base_service.py`.

**On-Deck QA:** **KB-COVERAGE-01** — Open; blocked by **CONTEXT-LADDER-01** until live-turn Show details is reliable, then verify off / sections / none-for-game labels.

## Item C — Spoiler risk chip

**Problem:** Strategy-mode answers could spoil without a visible confidence signal in Show details.

**Approach:** New `spoiler_risk_service.py` scores low/med/high from signals + optional `<bonsai-spoiler-risk>` model tag; manifest chip `spoiler_risk` appended at Ask end (not mid-stream).

**The model-tag half is unreachable today — noted 2026-08-07 during review.** `parse_bonsai_spoiler_risk_tag`
and the 60/40 blend in `compute_spoiler_risk_band` are implemented and unit-tested, but **no prompt in
`ollama_prompts.py` ever asks a model to emit `<bonsai-spoiler-risk>`**, so in production every band
comes from `compute_heuristic_spoiler_risk_score` alone. Nothing is broken — the tag is documented as
optional and the parser correctly ignores incomplete tags — but the tests make the blend look
exercised when the only live path is the heuristic. Two consequences for whoever picks this up:
tuning the band means tuning the heuristic weights, not the blend; and because nothing strips the
tag from displayed text, wiring the prompt instruction requires adding a stripper in the same change
or the literal markup renders in the answer.

**Files (representative):** `spoiler_risk_service.py`, `game_ai_request.py`, `transparency_service.py`, `inputTransparency.ts`, `tests/test_spoiler_risk_service.py` (8 cases), roadmap/testing docs, architecture snapshots.

**Tests:** `tests/test_spoiler_risk_service.py` — band scoring, tag blend, manifest wiring.

**On-Deck QA:** **SPOILER-RISK-CHIP-01** — Speed/Strategy/Expert Asks show **Spoiler risk: low|med|high**; toggles for masking/consent must not change the band; incomplete stream tag must not blank the answer.

## Item K — Permission jump

**Problem:** Permission denials in chat, Ask bar, voice, screenshots, and desktop-note flows had no path to the matching Permissions toggle.

**Approach:** `permissionDeepLink.ts` maps capability → Settings/Permissions focus target; `permissionJumpRegistry.ts` + `usePermissionJump.ts` coordinate tab switch, scroll, and Back; `PermissionDenyAction.tsx` surfaces **Open Permissions** on deny copy.

**Files (representative):** `PermissionDenyAction.tsx`, `usePermissionJump.ts`, `permissionDeepLink.ts`, `permissionJumpRegistry.ts`, `PermissionsTab.tsx`, MainTab/AskBar/voice/screenshot call sites, `index.tsx`, roadmap/testing-manual docs.

**Tests:** Vitest — `permissionDeepLink.test.ts` (5), `permissionJumpRegistry.test.ts` (3), `usePermissionJump.test.ts` (2), `PermissionDenyAction.test.tsx` (2) — **12 passed** (2026-08-07).

**On-Deck QA:** **PERM-JUMP-01** — Each capability off → deny shows **Open Permissions** → lands on matching toggle → **Back** returns; D-pad focus chain in `testing-manual.md`.

## Integration (main repo)

| Step | Result |
|------|--------|
| Cherry-pick I (`61026c2`) | Clean → `b5093d2` |
| Cherry-pick C (`30b9bad`) | Auto-merged transparency + docs; **conflict** in `packages/bonsai-mcp/knowledge/architecture/hotspots.json` → resolved with `npm run mcp:generate` → `0ba5575` |
| Cherry-pick K (`4eb2159`) | Clean auto-merge (docs + architecture) → `3ecd9d0` |
| Code merge (`transparency_service.py`, `game_ai_request.py`, `inputTransparency.ts`) | **Both** `kb_coverage` and `spoiler_risk` chips retained (no manual edit required) |
| Docs merge (`roadmap.md`, `testing.md`, `testing-manual.md`, `archive/roadmap-completed.md`) | **Both** Wave 3 I/C completions + K permission-jump shipped notes retained via auto-merge |

**Worktrees (left intact):**
- `C:\Users\still\.cursor\worktrees\kb-coverage-14fe3a58`
- `C:\Users\still\.cursor\worktrees\spoiler-risk-chip-d18093e4`
- `C:\Users\still\.cursor\worktrees\perm-jump-a7f3c2e1`

## Combined verification

| Check | Result |
|-------|--------|
| `python scripts/run_python_tests.py` (full suite, includes spoiler + KB coverage modules) | **Pass** — 580 ran, OK (skipped=3), 2026-08-07 |
| `npm test` — four permission-jump files | **Pass** — 12 tests |
| `npx tsc --noEmit` | **Pass** (2026-08-07) |

## Attention for maintainer

1. **Two KB chips vs one:** Show details may show both `kb` (retrieval this turn) and `kb_coverage` (corpus vs current game). Confirm copy is not redundant on-Deck.
2. **Spoiler chip timing:** `spoiler_risk` is computed at **Ask end**, not updated mid-stream; streaming incomplete tags must not blank answers (**SPOILER-RISK-CHIP-01**).
3. **Extra KB labels:** `kb_coverage` honesty paths (`none for this game`, unreadable corpus) need manual check when no corpus or corrupt install.
4. **CONTEXT-LADDER-01 blocks KB-COVERAGE-01:** Fix live-turn Show details before treating KB coverage QA as authoritative.
5. **PERM-JUMP-01 on-Deck focus:** Registry + `PermissionsTab` focus graph must be walked with D-pad after deploy; preview does not validate cross-tab `TakeFocus`.

## Commit sequence on `experimental` (after integration)

1. `b5093d2` — KB corpus coverage chip in Show details (I)
2. `0ba5575` — Spoiler risk chip in Show details (C)
3. `3ecd9d0` — Permission jump from denials to Permissions toggle (K)
4. *(this commit)* — `docs: Wave 3 results (spoiler risk, KB coverage, permission jump)`
