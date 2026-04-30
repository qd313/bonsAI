# Refactor specialist report

Point-in-time architecture and maintainability review (whole codebase). **Red-team / blue-team:** N/A (no ship/no-ship bout invoked).

## Sweep / planning

- **Current behavior:** Decky Python backend (`main.py` `Plugin`) exposes RPCs that delegate to `py_modules/backend/services/*` (Ollama, settings, screenshots, TDP, sanitizers, Steam Web API VAC check, etc.). React UI in `src/index.tsx` mounts a large `Content` tree with hooks (`useBackgroundGameAi`, settings normalization via `settingsAndResponse.ts`) and tab components under `src/components/`.
- **Problems:** Very large orchestration surfaces (`main.py`, `index.tsx`, `ollama_service.py`) duplicate similar payload shapes; one Python unit test contradicts intentional capability defaults.
- **Refactor plan (low-risk order):** (1) Fix failing capability grandfather test to match product intent. (2) Extract shared `_persist_*` / background-completion helpers in `main.py` for sanitizer, shortcut, and VAC fast paths. (3) Split `Content` in `index.tsx` into region hooks or tab-specific containers (Main vs Settings vs Permissions wiring). (4) Optionally split `ollama_service.py` along prompt composition vs HTTP transport boundaries once RPC seams stay stable.
- **Open questions:** Should `package.json` repository URL drive any automation (releases, issue templates)? If yes, coordinate metadata fix with CI/env expectations.

## Individual findings

Finding: Monolithic `Content` component holds most UI orchestration
File: src/index.tsx:467
Severity: ★★★★
Clarity tax: A single FC spans most of the file (~1.5k+ lines), mixing RPC polling, Ask lifecycle, modal state, and tab routing—making isolated feature changes high-touch and review-heavy.
Specific refactor: Extract cohesive hooks (`useAskSubmission`, `useBackgroundPolling`, `useDisclaimerAndHelpGates`) and thin presentational shells per tab; keep `deckyCall` boundaries in one module if RPC surface must stay stable.

Finding: `Plugin.start_background_game_ai` repeats near-identical “complete local command” blocks
File: main.py:1093
Severity: ★★★
Clarity tax: Sanitizer, shortcut-setup, and VAC branches each rebuild `_background_state`, `_persist_input_transparency` snapshots, and return shapes—risking subtle divergence when one path gains a new field.
Specific refactor: Add `_finalize_immediate_background_command(plugin, *, route, meta, response, ...)` that accepts variant-specific keys (`shortcut_setup`, etc.) and builds state + transparency once.

Finding: `ollama_service.py` bundles prompt policy, HTTP streaming, and auxiliary detectors
File: py_modules/backend/services/ollama_service.py:1
Severity: ★★★
Clarity tax: Over ~1100 lines, mixing spoiler policy helpers, system prompt construction, and transport—harder to navigate than neighboring focused services (`vac_check_commands.py`, `model_policy.py`).
Specific refactor: Extract `ollama_prompts.py` (strategy/spoiler/system builders) and keep `ollama_service.py` as IO + orchestration; preserve public imports used by `game_ai_request.py` and tests via re-export or explicit package API.

Finding: Legacy capability grandfather test expects all capabilities True but implementation intentionally gates Steam Web API
File: tests/test_capabilities.py:34
Severity: ★★
Clarity tax: The suite fails locally (`test_legacy_grandfather_all_true`), so CI/regression signal is broken until expectations match intentional privacy posture (`capabilities.py` sets `steam_web_api` False for legacy installs).
Specific refactor: Rename test to `test_legacy_grandfather_all_true_except_steam_web_api` and assert `g["steam_web_api"] is False` and all other keys True; add a one-line comment referencing `legacy_grandfather_capabilities` docstring.

Finding: npm/package identity drift (also impacts contributor onboarding)
File: package.json:16
Severity: ★
Clarity tax: Template repository URLs in metadata confuse repo boundaries when debugging install paths or linking issues—adjacent to refactor hygiene.
Specific refactor: Same as FOSS report: point metadata at the real GitHub repo.

## Deep refactor review (verification)

- **Tests run:** `pnpm test` — Vitest **64/64 passed**.
- **Tests run:** `python scripts/run_python_tests.py` — **133 passed, 1 failed** (`test_legacy_grandfather_all_true`). Regression risk for refactors cannot be claimed fully green until that expectation is updated.
- **Tests and docs status:** Strong coverage for backend services and TS settings normalization; no Vitest coverage for `index.tsx` integration (typical for Decky plugins—manual/device smoke remains important).
- **Trade-offs:** Splitting `main.py` RPC methods further is valuable but must preserve Decky loader RPC names/signatures; prefer extract-private-helper-first over renaming public methods.
