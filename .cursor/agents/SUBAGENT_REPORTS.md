# Subagent review reports

> **Red Team / Blue Team counsel retired 2026-06-26.** Historical entries below preserved. Active scope: [docs/roadmap.md](../../docs/roadmap.md). Archived bundle: [docs/archive/red-blue-counsel](../../docs/archive/red-blue-counsel/README.md).

Structured findings from Cursor subagents in this folder (for example `foss-advocate.md`, `security-auditor.md`, `master-debugger.md`). Paste or summarize each run here so results live next to the agent definitions and survive chat context.

## How to use

- Add a new dated section under **Report log** after each review (newest first).
- Copy the matching **Template** block and fill in only confirmed items; if the agent outputs exactly `No issues found`, record that instead of inventing findings.
- Optional: one section can cover multiple files or scopes if you label them (e.g. `codebase`, `docs/roadmap.md`).

### Contract (plans and handoffs)

- Implementation plans in this repo should include a **Subagent reports and follow-ups** section when required by `.cursorrules` (**Planning & subagent accountability**). That section ties the plan to reviewed agent output and to this log or to `docs/*-report.md` when those are the deliverable.
- After each substantive subagent run, add a dated **Report log** entry here so findings are not lost when chat context ends.

---

## Template: foss-advocate

Use when archiving output from `.cursor/agents/foss-advocate.md`.

```text
Finding: <short title>
File: <path>:<line>
Severity: <★|★★|★★★|★★★★|★★★★★|★★★★★★>
Reason: <why this is not FOSS, open-model, or transparent to users/community>
Fix or alternative: <concrete change or replacement>
Cost: <low|medium|high and short effort note>
```

Example entry:

```text
Finding: Default model guidance lacks openness disclosure
File: README.md:76
Severity: ★★
Reason: Model recommendation is presented without source/weight transparency context, making policy expectations unclear for users seeking FOSS-first defaults.
Fix or alternative: Add one-line labels for source and weight openness next to each recommended model and link to policy notes.
Cost: low - docs-only change.
```

If there are no confirmed findings, record:

```text
No issues found
```

---

## Template: security-auditor

Use when archiving output from `.cursor/agents/security-auditor.md`.

```text
Finding: <short title>
File: <path>:<line>
Severity: <★|★★|★★★|★★★★|★★★★★|★★★★★★>
Attack vector: <plain-English exploitation path>
Specific fix: <concrete code-level change>
```

Example entry:

```text
Finding: Privileged write fallback may run broad sudo path
File: main.py:289
Severity: ★★★
Attack vector: If earlier write methods fail, fallback execution path invokes elevated write helpers and increases blast radius if path/value validation is later weakened.
Specific fix: Enforce strict allowlist validation for writable sysfs paths and reject non-matching targets before any elevated command path.
```

If there are no confirmed findings, record:

```text
No issues found
```

---

## Template: refactor-specialist

Use when archiving output from `.cursor/agents/refactor-specialist.md`.

```text
Finding: <short title>
File: <path>:<line>
Severity: <★|★★|★★★|★★★★|★★★★★|★★★★★★>
Clarity tax: <plain-English explanation of maintainability/cognitive-load cost>
Specific refactor: <concrete extraction, rename, split, dedupe, or pattern change>
```

Optional roll-up block (for full deep-review archives):

```text
Changes made: <grouped by rename/extract/split/dedupe/style/docs>
Regression risk checks: <tests run, paths validated, remaining risks>
Tests and docs status: <what is covered, what still needs updates>
Trade-offs: <quality ideal vs pragmatic choice and rationale>
```

Example entry (illustrative only; not an open backlog item):

```text
Finding: Monolithic request orchestrator in backend
File: main.py:924
Severity: ★★★★
Clarity tax: Prompt construction, model fallback, attachment processing, and transport are tightly coupled, so simple edits require understanding multiple unrelated concerns.
Specific refactor: Extract `_build_system_prompt`, `_select_models`, and `_post_ollama_chat` helpers, then keep `ask_ollama` as a thin orchestration method.
```

If there are no changes or findings to report, record:

```text
No issues found
```

---

## Template: master-debugger

Use when archiving a debugging session or postmortem from `.cursor/agents/master-debugger.md` (Decky/Steam focus, D-pad, modals, clipping).

```text
Session: <short title>
Bug class: <focus|layout|backend|other>
Root cause: <what was wrong at the platform contract level>
Evidence: <signals that confirmed it: logs, activeElement, measurements, build parity>
Resolution: <smallest fix: which surface — e.g. onMoveLeft/onMoveRight, refs, geometry>
Files: <paths touched or "see commit">
Regression checks: <build script, on-device smoke>
```

Example entry:

```text
Session: AI character picker D-pad only moved vertically
Bug class: focus
Root cause: Controller navigation used Deck focus-graph callbacks; DOM keydown did not fire reliably for horizontal routing assumptions.
Evidence: onButtonDown logged; nav-key/keydown absent; fix required Decky move handlers on catalog controls.
Resolution: Cross-column focus via onMoveLeft/onMoveRight and stable button refs; footer buttons found by walking ancestors from picker shell.
Files: src/components/CharacterPickerModal.tsx, src/index.tsx (settings block width)
Regression checks: ./scripts/build.ps1; verified on Steam Deck
```

If there is nothing to archive from a run, record:

```text
No session archived
```

---

## Report log

<!-- Newest entries first. -->

### 2026-06-26 - foss-advocate + security-auditor (preset chip refresh, ask_mode deep→expert)

```text
Scope: Uncommitted changes — src/data/presets.ts (LAN/Ollama/Expert/voice/Steam Input chips, graduated bonsai:vac-check), ask_mode id rename deep→expert with legacy coercion (askMode.ts, settingsAndResponse.ts, settings_service.py, refactor_helpers.py, ollama_prompts.py, main.py), docs/README/roadmap/testing updates.
foss-advocate: 1 finding (★★) — OLLAMA_BONSAI_SETUP_LINE still cites Settings → Connection while Ollama tab ships Find LAN / named hosts; docs/foss-advocate-report.md updated. Fix: prompt string edit in ollama_prompts.py (low cost).
security-auditor: No new confirmed findings; ask_mode sanitization and steam_web_api gate on bonsai:vac-check re-verified; docs/security-audit-report.md revision log 2026-06-26.
Red-team / blue-team: N/A.
```

### 2026-06-14 - Ask thread accordion UX

**master-debugger** — Triaged. Static review found transcript `flow-children` broken by non-Focusable row wrapper and missing header→body vertical link; fixed in `BonsaiChatTurnRow.tsx` (row + body as nested `Focusable flow-children="vertical"`). Deferred: nested spoiler `Focusable` inside chunk wrappers (pre-existing pattern); model-policy Read more native button.

**red-team** / **blue-team** — N/A (UX parity, no new capabilities).

**security-auditor** — Deferred; removed client `spoiler_consent` toggle only; phrase-based backend consent unchanged.

### 2026-05-19 - Token stream replies Phase 1 (plan accountability)

**refactor-specialist** — Triaged. Separate `threading.Lock` for `_partial_stream_snapshot` vs `asyncio.Lock` on `_background_state` keeps executor-thread NDJSON callbacks off the event-loop lock; `on_delta(text, done)` is minimal and does not leak HTTP bodies. No further refactor required before ship.

**red-team** — Triaged. Dev-flag default-off limits regression blast radius; ship as experimental. Phase 2 (incremental chunks, public Settings toggle) deferred per roadmap.

**blue-team** — Triaged. Opt-in behind Developer tab matches honest-UX / power-user disclosure; terminal-only transparency and post-processors preserve sanitizer/transparency contracts.

**security-auditor** — Triaged. `get_background_game_ai_status` adds only `partial_response` (assistant text) and `streaming` (bool)—same sensitivity class as terminal `response`; no new secrets or paths.

**foss-advocate** — N/A (no new runtime/provider).

**master-debugger** — Deferred to on-device QA ([testing.md](../docs/testing.md) § Token streaming (experimental)); escalate if D-pad focus drops on preview→chunk finalize.

### 2026-06-11 - Living Pull Models catalog (overlay merge + refresh triggers)

```text
Scope: data/pull-model-catalog-overlay.json, pull_model_catalog_service.py, fetch_pull_model_catalog RPC, mergePullModelCatalog.ts, usePullModelCatalog hook, PullModelsModal.tsx, OllamaWhereAiRunsSection.tsx.
security-auditor: Triaged — host allowlist (raw.githubusercontent.com), JSON size cap, OLLAMA_TAG_RE validation, no user URLs; cache under ~/.bonsai/cache. No new confirmed findings.
foss-advocate: Triaged — transparent GitHub-hosted overlay; FOSS licenseClass on qwen3:2b example; bundled baseline remains offline fallback.
red-team / blue-team: Triaged — picker-only v1 (routing deferred); user-initiated refresh on Update AI & models + ↻ aligns with honest UX.
Tests: pnpm test (merge + recommendations); python tests/test_pull_model_catalog_merge.py + parity OK.
```

### 2026-05-19 - foss-advocate + security-auditor (Pull Models fullscreen picker)

```text
Scope: Pull Models picker — src/data/pullModelCatalog.ts, PullModelsModal.tsx, ollama_catalog_service.py, main.py pull/delete/metadata RPCs, local_ollama_setup custom profile + ollama rm.
foss-advocate: 1 finding (licenseClass vs model_policy mismatch) — triaged/fixed via aligned catalog licenseClass + tests/test_pull_model_catalog_parity.py; docs/foss-advocate-report.md → No issues found.
security-auditor: no new confirmed findings; tag regex + argv subprocess + ollama_local_on_deck gate reviewed; docs/security-audit-report.md revision log updated.
Red-team / blue-team: N/A.
Tests: python scripts/run_python_tests.py (146 OK); pnpm run build OK.
Deploy: ./scripts/build.sh local — frontend build OK; plugin_loader restart blocked (sudo password in agent session).
```

### 2026-05-19 - security-auditor + refactor-specialist (script/doc cleanup)

```text
Scope: Remove duplicate Ollama helpers under src/, root build.ps1 (hardcoded DECK_IP/PC_IP/$Pass), and Decky-template .vscode/ deploy tasks (${config:deckpass}).
Agents: security-auditor — triaged by deletion; canonical paths scripts/build.ps1 and scripts/build.sh load .env. refactor-specialist — closes asymmetric Ollama scripts finding in docs/archive/refactor/refactor-specialist-sweep.md.
Red-team / blue-team: N/A.
```

### 2026-04-30 - security-auditor (full refresh + doc cleanup)

```text
Scope: Whole-repo RPC/UI/log/error sinks, capability gates, subprocess and attachment paths; removed superseded subagent markdown snapshots.
Agents: security-auditor — canonical deliverable docs/security-audit-report.md only (foss/refactor report files deleted per cleanup).
Code: main.py — generic user message for failed background asyncio tasks (no str(exc) in RPC JSON).
Red-team / blue-team: N/A.
Tests: pnpm test (64 OK); python scripts/run_python_tests.py (134 OK).
```

## Report log

### 2026-06-11 - Voice input (local STT) — security / FOSS / Decky triage

```text
Scope: microphone_access capability, voice_transcription_service.py, main.py voice RPCs, useVoiceTranscription.ts, PermissionsTab, MainTab mic button.
Agents: security-auditor, foss-advocate, master-debugger — triaged in implementation session (no separate subagent spawn); recorded here per plan accountability.
Security (triaged): microphone_access default off, not legacy-grandfathered; backend RPCs deny when off; save_settings revokes active session; audio buffer in-memory only; transient WAV for whisper-cli deleted immediately; errors surfaced without raw PCM in logs. Deferred: formal security-auditor re-run on device with ingest logs.
FOSS (triaged): whisper.cpp (MIT) + GGUF from Hugging Face; no cloud STT path; transparency route voice.transcribe documents local-only + no audio persistence. Deferred: ship bundled whisper-cli binary license file in bin/.
Master-debugger (triaged): mic button keeps existing focus-graph (mode ← → mic); recording state swaps to stop affordance without new focus nodes. Deferred: on-Deck QA for PipeWire capture chain (VOICE-01…04 in testing.md).
Follow-up: complete VOICE-01…04 on hardware; bundle bin/whisper-cli x86_64 for SteamOS.
```

### 2026-04-21 - Judge ruling handoff (red-blue-fight)

```text
Source: docs/archive/red-blue-fight-2026-04-21.md — Week work list (after the bell) populated from Accept rulings.
Execution this session: per-chunk Focusable for AI reply stack (D-pad reaches last chunk); buildResponseText appends QAM Performance verification when sysfs apply succeeds without errors; README quick-launch pointer to troubleshooting §5; roadmap Up next blockquote links fight doc week list.
Deferred per judge: Strategy Guide (beta) path, Pyro easter egg, most Planned candidates (unchanged).
```

### 2026-04-21 - security (Phase 2) - Disclosure hardening + audit refresh

```text
Scope: docs/security-audit-report.md triage; RPC/UI/log paths for prompts, tracebacks, Ollama HTTP bodies, exception strings.
Agents: security-auditor N/A (in-repo triage + fixes in session); findings recorded in docs/security-audit-report.md.
Changes: formatDeckyRpcError strips traceback from UI; removed sensitive Ask console.log; INFO logs use question_len; ollama_service short HTTP user message + no first_200 in logs; ask_ollama strips body from client payloads; generic RPC errors for test connection, screenshots, execute_game_ai except, ask_ollama except.
Follow-up (2026-04-21): desktop note / chat append RPC — `backend/services/desktop_note_service.py` now maps **OSError** to a fixed user message + journal logging; **ValueError** still returns validation text. Closes the prior Partial item in docs/security-audit-report.md.
Tests: pnpm exec tsc --noEmit; pnpm test; pnpm run test:py; pnpm run build — all green.
```

### 2026-04-15 - master-debugger - Focus-graph lesson codified (subagent + .cursorrules)

```text
Session: Steam/Decky D-pad and settings clipping (AI character picker)
Bug class: focus + layout
Root cause: Treated D-pad as browser keydown; gated logic on unstable modal/DOM; settings block used calc bleed wider than parent caused clipping.
Evidence: Runtime showed focus-graph/button path vs missing keydown routing; measured block wider than parent.
Resolution: master-debugger.md subagent rules; Steam/Decky UI directives in .cursorrules; picker uses onMoveLeft/onMoveRight; container-constrained settings width.
Files: .cursor/agents/master-debugger.md, .cursorrules, CharacterPickerModal.tsx, index.tsx
Regression checks: User confirmed fix; instrumentation removed after verification
```

### 2026-04-13 - refactor-specialist - Milestone 2 decomposition sweep

```text
Finding: Backend service-layer extraction for settings, TDP, and Ollama orchestration
File: main.py:1
Severity: ★★★★
Clarity tax: Runtime orchestration and service internals were mixed in one module, which raised change risk and made targeted testing difficult.
Specific refactor: Move settings/TDP/Ollama internals to backend/services modules and keep main.py methods as RPC orchestration delegates.
```

```text
Finding: Frontend tab/data decomposition from index monolith
File: src/index.tsx:1
Severity: ★★★★
Clarity tax: Debug/About rendering and prompt-preset logic were embedded in a large UI shell, increasing cognitive load for unrelated feature edits.
Specific refactor: Extract DebugTab/AboutTab components and preset/category data+logic into src/components and src/data modules while preserving behavior.
```

```text
Changes made: backend service extraction (settings_service, tdp_service, ollama_service), frontend tab/data extraction (DebugTab, AboutTab, presets.ts), and expanded parity tests.
Regression risk checks: python -m unittest discover -s tests -p "test_*.py"; pnpm test; pnpm run build (pass, with existing TS5103 warning from plugin-typescript).
Tests and docs status: Added tests for new service/data modules and updated docs/development.md + CHANGELOG.md architecture traceability notes.
Trade-offs: Prioritized safe seam extraction and modularity over deep behavior changes (model fallback policy remains unchanged in this milestone).
```

## 2026-05-26 — Preview test automation (Decky Plugin Studio v0.1.1)

| Agent | Invoked | Summary |
|-------|---------|---------|
| master-debugger | Yes (planning) | Installed VSIX v0.1.0 was stale — MCP preview tools were stubs; sibling source at `C:/Users/still/decky-plugin-studio` had real IPC + sidecar |
| security-auditor | Yes (Phase 2 gate) | `preview.callRpc` gated by `PREVIEW_RPC_ALLOWLIST` in mcp-server + sidecar; no arbitrary method dispatch |

**Shipped (bonsAI):** `tests/preview-suite/*.json`, `scripts/run-preview-suite.mjs`, `pnpm run test:preview`, preview test hooks (`src/preview/previewTestHooks.ts`), sandbox sysfs mock (`tdp_service.py`), `tests/test_tdp_sandbox_sysfs.py`, updated `mcp.json` → v0.1.1 + `DECKY_STUDIO_REPO=C:/Users/still/decky-plugin-studio`.

**Shipped (decky-plugin-studio v0.1.1):** Real `preview.callRpc` via IPC→HTTP sidecar, `preview.snapshotDom`, `preview.captureScreenshot`, `preview.setHttpAllow`, focus event log in `focusManager`, `preview-state.json` for MCP URL sync.

**User action:** Reload Cursor after VSIX install; run **Decky: Open Preview** once per session before `pnpm run test:preview`.

**Deferred (bucket E):** QAMP reboot matrix, CEF CORS Ollama PC bug — `tests/preview-suite/deck-only-e-bucket.json` + `deck.deploy`.

## 2026-05-20 — Self-hosted automation (harness, dev loop, mDNS)

| Agent | Invoked | Summary |
|-------|---------|---------|
| explore ×3 | Yes | Mapped harness, scripts, LAN discovery surfaces |
| security-auditor | Planning triage | mDNS: user-triggered only, fixed `_ollama._tcp`, no CIDR/port scan params, curated logs |
| red-team / blue-team | N/A | Tooling + opt-in discovery |

**Shipped:** Vitest `src/test-harness/` + hook/RPC tests; `.cursor/skills/bonsai-deck-dev-loop/`; `watch-deploy` scripts; `bump-version.mjs` + `sync-versions.mjs`; `discover_mdns_ollama_hosts` + Settings **Find LAN**; docs/CHANGELOG updates.

**Deferred:** Subnet scanning; auto git tag/push; stock Ollama mDNS without Avahi publish.
