# Change-risk hotspots (CRAP-style inventory)

**Purpose:** Prioritize refactors and reviews by **change risk** — large surfaces, branching logic, and **how much automated test signal** exists before edits. This is a working companion to the ship-week freeze in [roadmap.md](roadmap.md) and the bout template in [red-blue-fight-2026-04-21.md](red-blue-fight-2026-04-21.md).

**How to use:** Before a non-trivial edit, find the row for the file you touch; run the listed tests plus `pnpm test`, `pnpm run test:py`, and `pnpm run build` (and `scripts/build.ps1` / `scripts/build.sh` when Deck UI or RPC changes). Full standing gate + Deck smoke: [regression-and-smoke.md](regression-and-smoke.md). After **Settings** is acceptably calm (roadmap order), pull the **next extraction** items from the bottom queue — one slice per PR.

**CRAP (Change Risk Analysis and Prediction) lens:** High **cyclomatic / structural complexity** plus **low coverage** means higher regression cost. This doc does not ship numeric CRAP scores; optional tooling: `radon cc` on Python (not wired in CI today) if you want numbers later.

---

## Line counts (approximate, 2026-04-21)

| Lines | Path | Role |
|------:|------|------|
| ~3425 | [`src/index.tsx`](../src/index.tsx) | Plugin root: tabs, scoped CSS, Decky RPC wiring, much of **Settings** as inline `settingsTab`, globals |
| ~1660 | [`src/components/MainTab.tsx`](../src/components/MainTab.tsx) | Unified ask/search surface, chunks, suggestion UI |
| ~1508 | [`main.py`](../main.py) | Decky RPC entrypoints, orchestration, many `call` handlers |
| ~761 | [`src/components/CharacterPickerModal.tsx`](../src/components/CharacterPickerModal.tsx) | Character picker UX + async suggestions |
| ~449 | [`src/components/ConnectionTimeoutSlider.tsx`](../src/components/ConnectionTimeoutSlider.tsx) | Connection timeout / warning slider |
| ~300 | [`backend/services/ollama_service.py`](../backend/services/ollama_service.py) | Prompt build, Ollama HTTP, streaming paths |
| ~249 | [`backend/services/desktop_note_service.py`](../backend/services/desktop_note_service.py) | Desktop notes / chat append, paths |
| ~239 | [`backend/services/settings_service.py`](../backend/services/settings_service.py) | Load/save/merge `settings.json` |
| ~228 | [`refactor_helpers.py`](../refactor_helpers.py) | Model selection, TDP parse helpers, URLs |
| ~207 | [`backend/services/ai_character_service.py`](../backend/services/ai_character_service.py) | Roleplay suffix, accent intensity |
| ≤170 | Other `backend/services/*.py` | See repo; smaller blast radius per file |

---

## Prioritized hotspots (edit order vs risk)

| Priority | Hotspot | Why it hurts change | Automated test signal | Suggested next extraction / mitigation |
|----------|---------|---------------------|------------------------|----------------------------------------|
| 1 | `src/index.tsx` | Single file mixes layout, CSS, RPC, tab assembly, and **large Settings JSX**; any edit can ripple focus/CSS/RPC. | **Low** for the file as a whole — Vitest covers [`src/utils/*.test.ts`](../src/utils/settingsAndResponse.test.ts), [`src/data/*.test.ts`](../src/data/), not the root component tree. | **After Settings UX trim:** extract **Settings** subtree to e.g. `src/components/SettingsTabPanel.tsx` (props in, no new persistence keys); then consider smaller hooks for repeated RPC patterns. |
| 2 | `main.py` | Many RPC branches; easy to break one handler while fixing another; logging/error shapes affect UI. | **Partial** — services are unit-tested; `main.py` itself has **no** dedicated `test_main.py`; regressions surface in integration/manual. | Prefer **new logic in services** with tests; keep `main.py` thin wrappers; when touching errors, align with [security-audit-report.md](security-audit-report.md) (user-safe messages). |
| 3 | `src/components/MainTab.tsx` | Long controller-first UI; focus graph and measurement logic intertwined. | **Partial** — unified-input phases extracted helpers; Vitest on data/utils, not full MainTab mount. | Further extractions only when needed; follow [refactor-specialist-sweep.md § Unified input](refactor-specialist-sweep.md#unified-input-refactor-completed); always device-check D-pad + overlay after edits. |
| 4 | `backend/services/ollama_service.py` | Prompt and transport changes affect every Ask; HTTP error paths touch disclosure. | **Good** — [`tests/test_ollama_service.py`](../tests/test_ollama_service.py). | Keep behavioral changes paired with test updates; redact user-facing error bodies per security audit. |
| 5 | `backend/services/settings_service.py` | Schema merge bugs affect entire plugin. | **Good** — [`tests/test_settings_service.py`](../tests/test_settings_service.py). | Add tests for any new keys; avoid silent defaults that bypass capability gating. |
| 6 | `backend/services/desktop_note_service.py` | Filesystem paths and consent boundaries. | **Good** — [`tests/test_desktop_note_service.py`](../tests/test_desktop_note_service.py). | Keep path logic in service; gate in `main.py` + capabilities. |
| 7 | `refactor_helpers.py` | Model routing / TDP parse shared across Ask paths. | **Good** — [`tests/test_refactor_helpers.py`](../tests/test_refactor_helpers.py). | Extend tests when adding branches; avoid duplicating policy in `main.py`. |
| 8 | `src/components/CharacterPickerModal.tsx` | Async + catalog + focus; easy Deck regressions. | **Partial** — catalog parity / accent tests in Python; TS [`characterCatalog.test.ts`](../src/data/characterCatalog.test.ts), [`runningGameCharacterSuggestions.test.ts`](../src/utils/runningGameCharacterSuggestions.test.ts). | Extract pure suggestion sorting/filtering only with tests; UI changes need device smoke. |
| 9 | Other services (`ai_character`, `input_sanitizer`, `capabilities`, `model_policy`, `strategy_guide_parse`, `tdp_service`) | Smaller files but security/behavior sensitive. | **Good** per matching `tests/test_*.py`. | Edit with corresponding test file open. |

---

## Python unit tests (inventory)

| Test file | Primary target |
|-----------|----------------|
| [`tests/test_ollama_service.py`](../tests/test_ollama_service.py) | `ollama_service.py` |
| [`tests/test_settings_service.py`](../tests/test_settings_service.py) | `settings_service.py` |
| [`tests/test_desktop_note_service.py`](../tests/test_desktop_note_service.py) | `desktop_note_service.py` |
| [`tests/test_refactor_helpers.py`](../tests/test_refactor_helpers.py) | `refactor_helpers.py` |
| [`tests/test_ai_character_service.py`](../tests/test_ai_character_service.py) | `ai_character_service.py` |
| [`tests/test_input_sanitizer_service.py`](../tests/test_input_sanitizer_service.py) | `input_sanitizer_service.py` |
| [`tests/test_capabilities.py`](../tests/test_capabilities.py) | `capabilities.py` |
| [`tests/test_model_policy.py`](../tests/test_model_policy.py) | `model_policy.py` |
| [`tests/test_strategy_guide_parse.py`](../tests/test_strategy_guide_parse.py) | `strategy_guide_parse.py` |
| [`tests/test_accent_intensity_parity.py`](../tests/test_accent_intensity_parity.py) | Accent strings parity (backend + catalog expectations) |
| [`tests/test_character_catalog_parity.py`](../tests/test_character_catalog_parity.py) | Character catalog parity |

---

## Frontend Vitest (inventory)

| Test file | Primary target |
|-----------|----------------|
| [`src/utils/settingsAndResponse.test.ts`](../src/utils/settingsAndResponse.test.ts) | Settings types / response helpers |
| [`src/data/characterCatalog.test.ts`](../src/data/characterCatalog.test.ts) | Catalog data |
| [`src/data/characterUiAccent.test.ts`](../src/data/characterUiAccent.test.ts) | Accent tokens |
| [`src/data/presets.test.ts`](../src/data/presets.test.ts) | Presets |
| [`src/data/steam-input-lexicon.test.ts`](../src/data/steam-input-lexicon.test.ts) | Steam Input lexicon |
| [`src/utils/runningGameCharacterSuggestions.test.ts`](../src/utils/runningGameCharacterSuggestions.test.ts) | Running-game suggestions |

---

## Ordered refactor queue (after Settings is calm)

Aligned with roadmap **trim the fat → Settings first**; do **not** start deep extractions until Settings UX is acceptable.

1. **Settings** — UX trim in place, then **`SettingsTabPanel` (or equivalent)** extracted from [`src/index.tsx`](../src/index.tsx); add Vitest only for new pure helpers.
2. **`main.py`** — Move new/changed RPC logic into `backend/services/` with tests; reduce duplicate error formatting.
3. **MainTab** — Only targeted extractions with device proof (focus, overlay, scroll).
4. **CharacterPickerModal** — Pure TS helpers first; UI second.
5. **Optional:** `radon cc main.py backend/services refactor_helpers.py` recorded here or in CI when someone adds the dependency.

---

## Revision log

| Date | Change |
|------|--------|
| 2026-04-21 | Initial inventory (Phase 1 ship-week cleanup). |
| 2026-04-21 | Phase 3: `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm run test:py`, `pnpm run build` are the canonical gates. `tsconfig.json` excludes `src/v0-drafts` (non-shipped UI kit) and sets `skipLibCheck` so library `.d.ts` quirks do not fail CI-style checks. |
| 2026-04-21 | Phase 4 (Settings): split the old single **SETTINGS** `PanelSection` into **Connection**, **Ask timing**, **Model unload (VRAM)**, **Screenshots**, **Saved text**, **Main tab**, **Character** (plus existing **Model policy**, **Advanced**, **Desktop notes**); shortened helper / `ToggleField` copy and `MODEL_POLICY_SETTINGS_INTRO` in [`src/data/modelPolicy.ts`](../src/data/modelPolicy.ts). `settingsTab` remains in [`src/index.tsx`](../src/index.tsx) (extract deferred). |
| 2026-04-21 | Phase 2 (security): see [`security-audit-report.md`](security-audit-report.md) — RPC traceback UI leak, INFO question logging, Ask `console.log`, Ollama HTTP body in chat, `first_200` logging, and several `str(exc)` RPC surfaces mitigated; desktop-note error passthrough left **Partial**. |
| 2026-04-21 | Phase 5 (docs): [`README.md`](README.md) doc index; unified-input tracker **merged** into [`refactor-specialist-sweep.md`](refactor-specialist-sweep.md#unified-input-refactor-completed); [`refactor-unified-input-tracker.md`](refactor-unified-input-tracker.md) is a short redirect; [`roadmap.md`](roadmap.md) links the index. |
| 2026-04-21 | Phase 6: [`regression-and-smoke.md`](regression-and-smoke.md) — standing automated gates, PR-scoped matrix, Deck device smoke checklist; linked from [`prompt-testing.md`](prompt-testing.md), [`roadmap.md`](roadmap.md), [`README.md`](README.md) index. |
