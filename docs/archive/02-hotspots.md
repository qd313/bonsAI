# 02 — Hotspots by churn × complexity (Phase 2b, 2026-08-02)

Churn alone over-weights files that get touched a lot but are trivial. This
ranks by `churn × complexity` so the list surfaces files that are both volatile
*and* hard to reason about.

**Method and its limits.** Churn is commit count per path from
`git log --format=format: --name-only --since=18.months`, recomputed today, so
it reflects the current tree (files deleted in Phase 0 are gone). Complexity is
an **approximate** cyclomatic count — decision points per file (`if`, `elif`,
`for`, `while`, `case`, `catch`/`except`, `&&`, `||`, `??`, ternary), with
comments and string literals crudely stripped. It is *not* an AST-derived
metric: no tool for that is installed, and adding one was out of scope. Treat
the ordering as sound and the absolute numbers as indicative. Archive and
generated paths are excluded.

---

## Ranking

| # | Score | Churn | Cx | Lines | File |
|---|---|---|---|---|---|
| 1 | 33624 | 72 | 467 | 3021 | `main.py` |
| 2 | 12546 | 82 | 153 | 1965 | `src/index.tsx` |
| 3 | 8472 | 24 | 353 | 1225 | `src/hooks/useBonsaiAskOrchestration.ts` |
| 4 | 3570 | 17 | 210 | 1051 | `py_modules/backend/services/ollama_prompts.py` |
| 5 | 2996 | 14 | 214 | 1168 | `src/components/OllamaWhereAiRunsSection.tsx` |
| 6 | 2184 | 42 | 52 | 187 | `src/components/MainTab.tsx` |
| 7 | 1890 | 10 | 189 | 914 | `py_modules/backend/services/local_ollama_setup_service.py` |
| 8 | 1876 | 28 | 67 | 492 | `py_modules/backend/services/settings_service.py` |
| 9 | 1860 | 6 | 310 | 1511 | `py_modules/backend/services/voice_transcription_service.py` |
| 10 | 1740 | 12 | 145 | 658 | `src/components/MainTabChatTranscript.tsx` |
| 11 | 1568 | 14 | 112 | 594 | `ollama_service.py` |
| 12 | 1554 | 21 | 74 | 492 | `game_ai_request.py` |
| 13 | 1463 | 7 | 209 | 1103 | `src/components/PullModelsModal.tsx` |
| 14 | 1290 | 10 | 129 | 498 | `src/components/KnowledgeBaseSection.tsx` |
| 15 | 1260 | 12 | 105 | 674 | `bonsai_stream_tags.py` |
| 16 | 1150 | 10 | 115 | 589 | `transparency_service.py` |
| 17 | 1045 | 11 | 95 | 437 | `src/data/bonsaiSettingsNormalizers.ts` |
| 18 | 1036 | 7 | 148 | 788 | `knowledge_base_service.py` |
| 19 | 972 | 4 | 243 | 1030 | `screenshot_media.py` |
| 20 | 858 | 6 | 143 | 429 | `strategy_guide_parse.py` |
| 21 | 825 | 25 | 33 | 540 | `src/components/SettingsTab.tsx` |

---

## Why the top 10 keep changing

**1. `main.py`** — It is the entire RPC surface (55 methods) *and* the place
where several Ask branches finalize inline rather than delegating, which its own
header admits (`main.py:8-9`). Every feature on either side of the boundary has
to pass through this one file, so its churn is the sum of all feature churn.

**2. `src/index.tsx`** — Highest raw churn (82) in the repo. It is simultaneously
the plugin root, tab wiring, scoped-CSS host, settings-save orchestrator, and
holder of 7 direct RPC call sites; it also has the largest fan-out in the import
graph (54 imports), so any new surface tends to get wired here first.

**3. `useBonsaiAskOrchestration.ts`** — The Ask state machine: submit, abort,
background polling, streaming phases, checklist, follow-ups, and RAG chips all
live in one hook. Complexity (353) is the second-highest in the repo, so every
Ask-adjacent change lands in already-dense conditional logic.

**4. `ollama_prompts.py`** — Owns prompt copy *and* prompt assembly policy. Copy
refreshes (tone, status-line wording) and behavioral changes (spoiler rules,
mode branching) both edit the same file, which is exactly why a test pinned to
its wording broke in Phase 0.

**5. `OllamaWhereAiRunsSection.tsx`** — One component covering host discovery,
mDNS, connection testing, local Ollama install/update, and setup-profile
completion. Five independent reasons to change; it also holds one of the two
backend-less RPC calls (`:573`).

**6. `MainTab.tsx`** — The anomaly: only 187 lines and complexity 52, yet
**churn 42**. It is a pure composition shell (14 imports, ~25 prop pass-throughs)
whose header says it just composes children. It churns because *every* Main-tab
feature has to thread new props through it — classic pass-through tax, not
internal complexity.

**7. `local_ollama_setup_service.py`** — Multi-step install orchestration
(download, extract, systemd unit, model pull, teardown) with per-step error
branches. Complexity 189 across 914 lines, and each new supported install path
adds another branch rather than another module.

**8. `settings_service.py`** — 28 hand-written `sanitize_*` functions. Churn 28
is almost exactly one commit per sanitizer: adding a setting means adding a
function here, which is the shotgun-surgery pattern REFACTOR-PLAN 3.1 targets.

**9. `voice_transcription_service.py`** — **High complexity (310), low churn (6).**
This is the profile of code that is intricate but settled — written once for
PipeWire/whisper capture and largely left alone. It ranks high only because of
complexity, and it is a **DO-NOT-TOUCH candidate**, not a refactor target.

**10. `MainTabChatTranscript.tsx`** — Renders the transcript plus streaming
markdown, spoiler masking, context chips, and micro-action rows. It changes
whenever reply *presentation* changes, which is often, and it has the second
highest fan-out on the frontend (25 imports).

---

## Cross-cutting observations

**Test files churning more than their source** — the plan's tell for tests
pinned to implementation shape rather than behavior. Still true for two of three
pairs:

| Source | Churn | Test | Churn | |
|---|---|---|---|---|
| `src/utils/settingsAndResponse.ts` | 34 | `settingsAndResponse.test.ts` | **42** | test churns more |
| `settings_service.py` | 28 | `tests/test_settings_service.py` | **33** | test churns more |
| `src/hooks/usePluginSettings.ts` | 28 | `usePluginSettings.test.ts` | 2 | healthy |

Phase 0 already hit this failure mode twice in the Python suite (see
[00-phase0.md](00-phase0.md)); expect the same when the settings cluster moves.

**The settings cluster is confirmed, but its shape has changed.** Combined churn
across `settings_service.py` (28), `settingsAndResponse.test.ts` (42),
`settingsAndResponse.ts` (34), `usePluginSettings.ts` (28), `SettingsTab.tsx`
(25) and `bonsaiSettingsNormalizers.ts` (11) is ~168. But per
[01-map.md](01-map.md) §5, `settingsAndResponse.ts` is now a 16-line barrel — the
churn is historical, accrued before the split. Rank the *cluster* as high
priority; do not act on the individual file's churn number.

**Complexity concentrates in Python, churn in TypeScript.** The five densest
files are `main.py` (467), `useBonsaiAskOrchestration.ts` (353),
`voice_transcription_service.py` (310), `screenshot_media.py` (243),
`OllamaWhereAiRunsSection.tsx` (214). The five most-churned are `index.tsx` (82),
`main.py` (72), `MainTab.tsx` (42), `settingsAndResponse.test.ts` (42),
`settings_service.py` (28). Only `main.py` is top-five on both — which is why it
ranks first by a factor of nearly three.

**Low-churn/high-complexity = leave alone.** `voice_transcription_service.py`
(6/310), `screenshot_media.py` (4/243), `intent_pack_service.py` (4/185) and
`PullModelsModal.tsx` (7/209) are intricate but stable. They belong in the
DO-NOT-TOUCH section of `05-plan.md`.
