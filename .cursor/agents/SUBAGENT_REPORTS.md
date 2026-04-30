# Subagent review reports

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

### 2026-04-30 - foss-advocate + refactor-specialist (full codebase read)

```text
Scope: Whole-repo review for FOSS/transparency and maintainability hotspots (features + architecture).
Agents: foss-advocate (confirmed findings only); refactor-specialist (structure + verification).
Deliverables: docs/foss-advocate-report.md; docs/refactor-specialist-report.md.
Tests this session: pnpm test — pass (64 tests). python scripts/run_python_tests.py — 1 failure (test_capabilities legacy grandfather vs steam_web_api=False); see refactor report.
Ship/no-ship / red-blue: N/A.
```

### 2026-04-21 - Judge ruling handoff (red-blue-fight)

```text
Source: docs/red-blue-fight-2026-04-21.md — Week work list (after the bell) populated from Accept rulings.
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
