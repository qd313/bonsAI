# Historical failures & retries (archived 2026-07-30)

Preview suite --write FAIL upserts into the marker table below.

## Failures and retries

# bonsAI prompt testing — failures & retries

Open FAIL rows, superseded preview attempts, and optional on-Deck retests. **PASS** results live in [../testing.md](../testing.md).

**Retry:** `pnpm run test:preview:tier -- --tier=<batch> --filter=<id> --evidence --write`

---

## On-Deck FAIL (historical)

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 2 | — | Elden Ring | "What TDP should I use?" | 8–12W + JSON | llama3:latest | FAIL | Pre–system-prompt fix; **optional retest** |
| 5 | — | L4D2 | "Optimize for battery life" | Low TDP JSON | llama3:latest | FAIL | Pre–game context; superseded by Tier 1 with-game pass — retest optional |

---

## Preview FAIL log

Runner `--write` upserts here on FAIL (deduped by scenario ID). Superseded rows from 2026-05-26 debug iterations are summarized below; per-attempt artifacts remain under [test-evidence/](../../../bonsAI-workshop/test-evidence).

### Superseded tier0 attempts (2026-05-26 / 9e20a82)

Sidecar / assertion tuning before final **5/5 PASS**. Evidence folders may contain both fail and pass manifests from the same date folder.

| Scenario | Attempts | Root cause (final) | Resolution |
|----------|----------|-------------------|------------|
| SMOKE-A-golden-path | 6+ | `domContains "bonsAI"`; IPC `callTestHook` timeout | Dismiss modal via focus; assert shell selectors |
| SMOKE-C-perms-gate | 5+ | Sidecar `fetch failed`; DOM `"Permissions"`; `callTestHook` timeout | RPC `load_settings` + `hardware_control` assert |
| SMOKE-F-disable-sanitize | 4+ | Sidecar down; RPC `"sanitizer"` vs `"sanitiz"` | Sidecar path fix; substring assert |
| SMOKE-F-shortcut-deck | 3+ | Sidecar `fetch failed` | Sidecar auto-start / manual start |
| SMOKE-F-vac-capability-off | 4+ | Sidecar down; assert `"capability"` vs message text | Assert `"Steam Web API is off"` |
| VISION-V1-spot-dom | 1 | `domContains "Ask"` — label not in preview DOM | Assert `bonsai-decky-tabs-root` / askbar classes |

**Final PASS batch:** [test-evidence/tier0/2026-05-26-9e20a82/](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82) ┬╖ **tier2 (8/8):** [test-evidence/tier2/2026-05-26-9e20a82/](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82)

---

## Preview FAIL table (auto-updated)

<!-- preview-fail-results:start -->
| 2026-06-09 / a9237e4 | tier3UI | UI-A-beta-modal | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-beta-modal/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-tab-tour | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-tab-tour/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-settings-conn | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-settings-conn/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-permissions-ui | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-permissions-ui/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-mode-menu | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-mode-menu/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-transparency-expand | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-transparency-expand/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-debug-tab | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-debug-tab/manifest.json) — Error: IPC timeout for callTestHook |
| 2026-06-09 / a9237e4 | tier3UI | UI-A-presets-visible | FAIL | [manifest](../../../bonsAI-workshop/test-evidence/tier3UI/2026-06-09-a9237e4/UI-A-presets-visible/manifest.json) — Error: IPC timeout for callTestHook |
<!-- preview-fail-results:end -->

---

---

## Revision log

| Date | Change |
|------|--------|
| 2026-06-21 | Consolidated regression-and-smoke, device-qa-runbook, prompt-testing, prompt-testing-failures into testing.md |
| 2026-05-26 | FAIL rows split; preview --write dedupe |
| 2026-05-24 | Refactor: coverage matrix, tier-linked scenarios, runbook split |
