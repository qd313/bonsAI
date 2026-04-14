# Subagent review reports

Structured findings from Cursor subagents in this folder (for example `foss-advocate.md`, `security-auditor.md`). Paste or summarize each run here so results live next to the agent definitions and survive chat context.

## How to use

- Add a new dated section under **Report log** after each review (newest first).
- Copy the matching **Template** block and fill in only confirmed items; if the agent outputs exactly `No issues found`, record that instead of inventing findings.
- Optional: one section can cover multiple files or scopes if you label them (e.g. `codebase`, `TODO.md`).

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

Example entry:

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

## Report log

<!-- Newest entries first. -->

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
Tests and docs status: Added tests for new service/data modules and updated DEVELOPMENT.md + CHANGELOG.md architecture traceability notes.
Trade-offs: Prioritized safe seam extraction and modularity over deep behavior changes (model fallback policy remains unchanged in this milestone).
```
