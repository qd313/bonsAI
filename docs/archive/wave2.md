# Wave 2 integration report (2026-08-07)

Two parallel implementation workers landed in separate worktrees and were integrated onto `experimental` via cherry-pick. This report records goals, commit lineage, automated verification, and outstanding on-Deck QA.

## Scale note

Wave 2 is a **readiness ★/★★** wave: small, well-scoped bug fixes with clear unit coverage (F) or layout-only change without a component test harness (E). Integration risk was limited to shared docs and generated `hotspots.json`; cherry-pick order **F then E** auto-merged without manual conflict resolution.

## Scope

| ID | Item | Type | Worktree branch | Original commit | Main `experimental` commit |
|----|------|------|-----------------|-----------------|----------------------------|
| F | KB-advice preset seed gate | Bug fix | `wave2-f-kb-seed-gate` | `97ca108d85412586ce21d6956fac5c9b5dccb50e` | `9f311dae0d59ea20b818a55bdeda109e01a93cda` |
| E | Ask-bar caret with AI character | Bug fix | `fix/ask-bar-caret-avatar` | `f99fef9b7a1b168d4ba750fe0a2fbfd67ef59db6` | `40f396f5150f00f06fec6cac490e735408e1568a` |
| — | This report | Docs | — | — | *(see integration commit after cherry-picks)* |

**Base for both worktrees:** `e3e507792315664790de2a476045e8de6769dd74` (`experimental` at Wave 2 start).

**Integration method:** `git cherry-pick` (F, then E). Original worktree SHAs are **not** preserved on `experimental`; new commit hashes are listed above.

**Agent transcripts:** [Static KB seed](b586f43b-6275-4748-a592-7a6a01ff33d7) · [Ask-bar caret](262c08cc-3ad6-447c-9ec3-63cfe6bd0f4a)

## Item F — KB-advice preset seed gate

**Problem:** With **Use local knowledge base** already enabled, the Main tab preset carousel could still surface the static chip *Enable local knowledge base for better game tips*, including on timer-driven re-samples (~60s).

**Approach:** Filter the KB-advice static seed from `getRandomPresets`, `getContextualPresets`, and `getRandomPresetExcluding` when `useLocalKnowledgeBase` is true. Thread the flag from settings through `useMainTabPayload`, `MainTab`, preset row/animated chips, and ask orchestration so timer re-samples respect the gate.

**Important behavior:** Gate is on the **setting only**, not on whether a corpus is installed. If KB is toggled on but corpus is missing, the seed stays hidden.

**Files (representative):** `src/data/presets.ts`, `src/data/presets.test.ts`, `MainTabPresetAnimatedChips.tsx` (+ test), `MainTabPresetRow.tsx`, `useMainTabPayload.tsx`, `useBonsaiAskOrchestration.ts`, `index.tsx`, `docs/roadmap.md`, `docs/testing.md`, `docs/archive/roadmap-bugs-fixed.md`, `hotspots.json`.

**Tests:** `presets.test.ts` — `excludes KB-advice static seed when useLocalKnowledgeBase is on (all samplers)` and inverse when off; `MainTabPresetAnimatedChips.test.tsx` (4 tests). Focused run 2026-08-07: **13 passed**.

**On-Deck QA:** **PRESET-KB-SEED-01** — Open; watch carousel ~60s with KB on (chip must not appear); with KB off, seed may still appear (sampled).

## Item E — Ask-bar caret with AI character avatar

**Problem:** With AI character enabled, the native text caret rendered at the left edge of the unified input row while placeholder and overlay text were offset by a `padding-left` hack for the avatar badge—caret and text origin diverged.

**Approach:** Move the avatar outside `.bonsai-unified-input-text-box` as a flex sibling; remove the extra left padding on textarea, measure layer, and overlay so caret and text share one origin.

**Files:** `src/components/MainTabUnifiedAskBar.tsx`, `src/styles/sections/section-5.ts`, `docs/roadmap.md`, `docs/testing.md`, `docs/testing-manual.md`, `docs/archive/roadmap-completed.md`, `hotspots.json`.

**Tests:** No Ask-bar component test harness. Regression risk is layout/CSS and focus graph (avatar still reachable from paperclip row).

**On-Deck QA:** **ASK-CARET-CHAR-01** — Open; AI character on, empty Ask field focused; confirm caret aligns with placeholder/text start (not left of `?` badge); D-pad Up from paperclip → avatar, Right → field; character-off path unchanged.

## Integration (main repo)

| Step | Result |
|------|--------|
| Cherry-pick F (`97ca108…`) | Clean → `9f311da` |
| Cherry-pick E (`f99fef9…`) | Auto-merged `docs/roadmap.md`, `docs/testing.md`, `hotspots.json` → `40f396f` |
| Manual conflict resolution | **None required** |

**Worktrees (left intact):**
- `C:\Users\still\.cursor\worktrees\kb-seed-gate-a7f3c2e1`
- `C:\Users\still\.cursor\worktrees\ask-caret-e7a3f91b`

## Combined verification

| Check | Result |
|-------|--------|
| `npm test` — `presets.test.ts`, `MainTabPresetAnimatedChips.test.tsx` | **Pass** (13 tests) |
| `npx tsc --noEmit` | **Pass** (2026-08-07) |

## Attention for maintainer

1. **KB gate vs corpus:** Hiding the seed when the setting is on but no corpus is installed is intentional (setting-driven gate). Confirm product copy still makes sense if users never see the nudge after enabling KB without installing RAG.
2. **PRESET-KB-SEED-01:** Carousel timer re-sample is the subtle path; unit tests cover samplers but not full 60s Deck timing.
3. **ASK-CARET-CHAR-01:** Manual on-Deck only; verify D-pad path and both character-on/off layouts.
4. **Windows worktrees:** If agents reported npm/rollup friction in worktrees, main-repo cherry-pick did not require a rebuild for doc integration; run `npm run build` before Deck deploy as usual.

## Commit sequence on `experimental` (after integration)

1. `9f311da` — Gate KB-advice preset seed when local KB setting is on (F)
2. `40f396f` — Fix Ask-bar caret misalignment when AI character avatar is on (E)
3. *(this commit)* — `docs: Wave 2 results (KB seed gate + ask-bar caret)`
