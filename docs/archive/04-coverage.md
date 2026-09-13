# 04 — Safety net: what actually covers the hotspots (Phase 2d, 2026-08-02)

For each hotspot from [02-hotspots.md](02-hotspots.md): which tests exercise it,
what they assert, and a coverage class. Files classified **none** must get
characterization tests *before* they are refactored.

> **Update 2026-08-02 (D3 safety net).** The two files graded **none** that block
> the entry-point split now have characterization coverage:
> `src/hooks/useBonsaiAskOrchestration.test.ts` (13 tests — submit guards,
> payload, invalid/blocked/completed/error branches, polling, cancel, thread
> archive) and `src/index.test.tsx` (9 tests — Decky contract, real mount,
> settings wiring, tab set, error containment). Both were **mutation-checked
> rather than assumed**: three deliberate breaks in each turn the suites red.
> Suite went 217 → 239 tests.
>
> Three harness defects had to be fixed first, and each is part of why UI
> coverage was zero rather than merely thin:
>
> 1. `vitest.config.ts` included only `src/**/*.test.ts` — **a `.tsx` test file
>    was silently never collected**, so no component test could exist at all.
> 2. jsdom has no `ResizeObserver`; without a stub the entire tree failed to
>    mount and only the ErrorBoundary fallback rendered. A "renders without
>    throwing" test passes anyway, which is why the assertion here is "does
>    **not** show the error fallback" — the boundary makes the naive version
>    worthless.
> 3. `globals: false` means React Testing Library never registers auto-cleanup,
>    so every render leaked into `document.body` between tests.
>
> One behavior to know before splitting: `bonsaiSessionSurvival.ts` keeps
> module-level state so settings survive Decky remounting the panel on modal
> open. Mounting the root twice in one module instance restores the previous
> snapshot instead of the loaded settings, so root tests call `vi.resetModules()`
> per test. The `Tabs` stub in `fakeDeckyUi.tsx` now models titles and active
> content instead of spreading `[object Object]`, which is what makes tab-level
> assertions possible.

**Classes**
- **Behavioral** — asserts observable outcomes; would catch a logic regression.
- **Smoke-only** — proves it imports/constructs/returns a shape; would catch a
  crash, not a wrong answer.
- **Indirect** — no test names this file, but its logic runs inside another
  file's tests.
- **None** — nothing executes it in CI.

---

## The three test layers

| Layer | Count | Runs | Covers |
|---|---|---|---|
| Vitest | 44 files, 217 tests | `npm test` | Pure TS logic |
| Python `unittest` | 50 files, 399 tests | `npm run test:py` | Backend services |
| Preview suite | 9 tier batches (`tests/preview-suite/`) | `npm run test:preview`, manual | UI in an in-IDE QAM harness |

Only the first two gate a commit. The preview suite is operator-driven and needs
the Decky Plugin Studio VSIX (see [AGENTS.md](../../AGENTS.md)), so **nothing
automatic covers the UI layer.**

### The distribution is the headline

Vitest files by directory:

```
29  src/utils/
 8  src/data/
 3  src/hooks/
 2  src/features/preset-carousel/
 1  src/test-harness/
 1  src/components/     <-- SettingsTab.mdns.test.ts, the only one
```

**44 component files, one test file between them.** Testing is concentrated on
pure functions; every screen, modal, and panel is untested by the automatic
suites.

On the Python side, **5 of 50 test files import `Plugin` from `main.py`** —
`test_background_abort_busy`, `test_background_partial_state`,
`test_intent_pack_store_lock`, `test_settings_save_lock`,
`test_strategy_checklist_store_lock`. All five are concurrency/locking tests. The
55-method RPC surface has no direct behavioral coverage of its own; it is
exercised only through the services it delegates to.

---

## Per-hotspot

| # | File | Tests | What they assert | Class |
|---|---|---|---|---|
| 1 | `main.py` | 5 files, all lock-focused | Background abort while busy, partial-state reads, and that the settings / intent-pack / checklist store locks serialize concurrent writes | **Smoke-only** for the RPC surface. The locking behavior is genuinely tested; the other 50 methods are not asserted here |
| 2 | `src/index.tsx` | — | — | **None** |
| 3 | `useBonsaiAskOrchestration.ts` | — | — | **None** |
| 4 | `ollama_prompts.py` | `test_ollama_prompts_stream_instruction.py`, `test_ollama_service.py`, `test_reply_followup.py` | Status-line tone and the strategy spoiler guardrail; prompt assembly via ollama_service | **Behavioral**, but partly copy-coupled — one of these broke in Phase 0 for asserting an exact adjective |
| 5 | `OllamaWhereAiRunsSection.tsx` | — | — | **None** |
| 6 | `MainTab.tsx` | — | — | **None** |
| 7 | `local_ollama_setup_service.py` | `test_local_ollama_setup_service.py`, `test_local_ollama_loopback.py`, `test_local_ollama_teardown.py`, `test_ollama_pull_registry.py` | Install/loopback paths, teardown removes tags and home paths, pull registry resolution | **Behavioral** |
| 8 | `settings_service.py` | `test_settings_service.py` (33 churn), `test_plugin_data_reset.py` | Per-setting `sanitize_*` round-trips and reset-to-defaults | **Behavioral** — the densest safety net in the repo, and the reason the settings refactor is tractable |
| 9 | `voice_transcription_service.py` | `test_voice_transcription_service.py`, `test_voice_whisper_daemon.py` | Session lifecycle and daemon fallback | **Behavioral** |
| 10 | `MainTabChatTranscript.tsx` | — | — | **None** |
| 11 | `ollama_service.py` | `test_ollama_service.py` | Prompt build, streaming, HTTP shaping | **Behavioral** |
| 12 | `game_ai_request.py` | `test_pyro_asshole_safety.py`, `test_token_stream_request_id_wiring.py` | Character-safety filter; request-id threading through token streams | **Behavioral**, narrow — two specific concerns, not the whole request path |
| 13 | `PullModelsModal.tsx` | — | — | **None** |
| 14 | `KnowledgeBaseSection.tsx` | — | — | **None** |
| 15 | `bonsai_stream_tags.py` | `test_bonsai_stream_tags.py` (59 asserts / 30 tests) | Stream tag parsing and status extraction | **Behavioral**, the deepest single Python suite |
| 16 | `transparency_service.py` | `test_transparency_kb_retrieval.py` | KB retrieval feeding transparency chips | **Behavioral** |
| 17 | `bonsaiSettingsNormalizers.ts` | `settingsAndResponse.test.ts` (116 `normalize` references) | Every normalizer, via the barrel re-export | **Indirect but strong** — no test imports this file by name; coverage arrives through `settingsAndResponse` |
| 18 | `SettingsTab.tsx` | `SettingsTab.mdns.test.ts` | mDNS discovery row only | **Smoke-only** — one narrow slice of a 540-line tab |

---

## What this means for Phase 3

**The refactor targets split cleanly into safe and unsafe.**

*Safe to move now — real behavioral coverage exists:*
`settings_service.py`, `ollama_service.py`, `local_ollama_setup_service.py`,
`bonsai_stream_tags.py`, `bonsaiSettingsNormalizers.ts` (via the barrel),
`transparency_service.py`.

Notably this covers **the entire Python half of REFACTOR-PLAN 3.1** (settings
single source of truth). The Python side has the best safety net in the repo.

*Needs characterization tests first — currently `none`:*

| File | Why it matters |
|---|---|
| `src/index.tsx` | Plan item 3.4 splits it. 1965 lines, 82 churn, zero automatic coverage |
| `useBonsaiAskOrchestration.ts` | Complexity 353, the Ask state machine, zero coverage |
| `MainTab.tsx` | Plan wants prop-threading fixed here; nothing would catch a broken wire-up |
| `SettingsTab.tsx` | Plan item 3.1 touches it; only the mDNS row is covered |

**This is the single biggest risk in the plan.** Phase 3.4 ("split the entry
points by feature") targets `index.tsx` and `main.py` — one has no automatic
coverage at all, the other has coverage only of its locking behavior. A
behavior-preserving move cannot be *verified* as behavior-preserving there.

Two honest options, to be decided in `05-plan.md`:

1. Write characterization tests for `index.tsx` and `useBonsaiAskOrchestration.ts`
   before touching them. Expensive — they are React + Decky-coupled, which is
   presumably why they have none — but `src/test-harness/fakeDeckyRpc.ts` already
   exists and 3 hook tests already work, so the pattern is proven.
2. Accept that Phase 3.4 is verified by on-device QA (preview suite + Deck)
   rather than by CI, and sequence it last with a tight rollback plan.

**Do not treat `npm test` passing as evidence that a UI refactor was safe.** It
would pass with every component deleted.

---

## Aside: preview-suite coverage is real but not automatic

`tests/preview-suite/` defines 9 tier batches (`preGate`, `tier0`, `tier1Core`,
`tier1Boundaries`, `tier2`, `hookSmoke`, …) with an `executionOrder`. Per
[testing.md](../testing.md) most rows are **Open** or **Partial**, and the
Deck-only bucket (`deck-only-e-bucket.json`) cannot run in the IDE harness at
all. It is the only thing covering the UI, and it depends on an operator
choosing to run it.
