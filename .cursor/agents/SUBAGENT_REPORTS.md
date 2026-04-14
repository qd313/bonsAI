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

If there are no confirmed findings, record:

```text
No issues found
```

---

## Template: refactor-specialist

Use when archiving output from `.cursor/agents/refactor-specialist.md`.

```text
Changes made: <grouped by rename/extract/split/dedupe/style/docs>
Regression risk checks: <tests run, paths validated, remaining risks>
Tests and docs status: <what is covered, what still needs updates>
Trade-offs: <quality ideal vs pragmatic choice and rationale>
```

If there are no changes or findings to report, record:

```text
No issues found
```

---

## Report log

<!-- Newest entries first. -->
