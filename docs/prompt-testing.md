# bonsAI prompt testing tracker

**Run order (what to do next):** [device-qa-runbook.md](device-qa-runbook.md) — Tier 0 quick wins first, heavy setup in Tier 3–4.  
**PR automated gates:** [regression-and-smoke.md](regression-and-smoke.md) §1.

This file holds the **shipped-feature coverage index**, **Test Results log**, and **detailed scenario checkboxes** linked from the runbook.

Related planning (not yet implemented): [roadmap.md](roadmap.md) **Planned** section. Research notes: [steam-input-research.md](steam-input-research.md), [voice-character-catalog.md](voice-character-catalog.md).

---

## Evidence rules (check-offs)

Mark `- [x]` when:

1. **On-device PASS** recorded in Test Results (with build / date when known), or  
2. **Documented verified sweep** — e.g. vision V1 manual run (2026-04), QAMP banner unit tests (2026-04-26), frozen-carousel troubleshooting pass.

Historical **FAIL** rows live in [prompt-testing-failures.md](prompt-testing-failures.md). Standardize on `- [x]` / `- [ ]` only.

Preview-suite runs with `--write` upsert Test Results (PASS only) and the failures doc (FAIL), deduped by scenario ID. Artifacts: [test-evidence/](test-evidence/). Consolidate duplicate rows manually if needed after debug iterations; RPC/log dumps are redacted before commit.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **PASS** | Correct answer and action (if any) applied |
| **FAIL** | Wrong answer, hallucination, or action not applied |
| **PARTIAL** | Correct idea; formatting/parsing blocked full success |
| **PENDING** | Reserved for next on-device run |

Coverage table: **Verified** / **Partial** / **Open** / **N/A (unit-only)**.

---

## Shipped feature coverage

Maps [roadmap.md](roadmap.md) **Completed** items to test IDs. Update **Status** when runbook smokes or scenario rows pass.

### Release and first-run

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| BETA-MODAL | Beta disclaimer modal | SMOKE-A | Open | First paint |
| PRESETS-CAROUSEL | Suggested AI prompts + carousel | SMOKE-A, SMOKE-D | Partial | Troubleshooting triple verified; animation ms → Tier 3 |
| PROMPT-TEST-MVP | Prompt-testing MVP (this doc) | — | Partial | Matrices shipped; Tier 0–1 open |
| SANITIZER | Input sanitizer lane | SMOKE-F | Partial | [SMOKE-F-disable-sanitize](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| TRANSPARENCY | Input handling transparency panel | SMOKE-A | Partial | Expand panel in golden path (on-Deck); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |

### Connection, routing, diagnostics

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CONN-TEST | Deck/PC connection + Test Ollama | SMOKE-A | Open | |
| CONN-TIMEOUT | Latency/timeout warnings + sliders | SMOKE-A | Open | Slow Ask optional |
| KEEP-ALIVE | Ollama keep_alive presets | — | Open | Settings persist |
| LOCAL-RUNTIME | Local Ollama on Deck default-off + onboarding | — | Open | Tier 2 |
| MDNS-FIND | LAN mDNS Find LAN | — | Open | Tier 2; needs Avahi; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/MDNS-FIND-rpc/manifest.json) |
| MAINT-HARNESS | Vitest Deck harness, watch-deploy | N/A (unit-only) | N/A | CI; [preGate](test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json); [preview 2026-05-26](test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| OLLAMA-UPDATE | Update Ollama & Models on Deck | — | Open | Tier 2 |

### Tabs, icons, unified ask

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-UI | Iconography, tabs, unified input | SMOKE-A | Partial | [SMOKE-A](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| PERSIST-QA | Persist last Q&A on reopen | Tier 1 extra | Open | |
| UNIFIED-INPUT | Unified search + ask | SMOKE-A | Open | |
| PRESET-FADE-OPT | Preset chip fade opt-out | — | Open | Tier 3 cosmetic |
| CAROUSEL-SLIDE | Carousel slide + history (2026-05-20) | — | Open | Tier 3 cosmetic |
| GEMMA-PULL | Gemma pull models + routing | — | Partial | Unit tests |
| MODE-SELECTOR | Speed / Strategy / Deep | SMOKE-E, Tier 1 | Open | |
| STRATEGY-CORE | Strategy Guide prompt path | SMOKE-E | Open | |
| STRATEGY-SPOILER | Strategy spoiler policy + consent | SMOKE-E, STRAT-01…05 | Partial | Unit green 2026-04-30; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
| DEBUG-TAB | Debug tab opt-in | SMOKE-A | Open | Tab strip when enabled |
| SETTINGS-TRIM | Settings tab trim | SMOKE-A | Open | |
| RESET-SESSION | Reset session cache | — | Open | Tier 2 |

### AI-assisted power and UX

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| TDP-APPLY | TDP automation via AI JSON | SMOKE-B, Test #3–4, 6 | Verified | On-Deck PASS rows; [UNIT-B](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json); [preview 2026-05-26](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| QAMP-BANNER | QAMP Phase 1 banner (safe default) | SMOKE-B, QAMP-CODE | Verified | Vitest 2026-04-26; on-Deck → Tier 3; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| QAMP-ONDECK | QAMP manual (profile/reboot) | QAMP-DECK-01…05 | Open | Tier 3 |
| D-PAD-CHUNKS | D-pad response scrolling | SMOKE-A | Partial | [SMOKE-A focus path](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| BG-ASK-V1 | Background prompt completion V1 | SMOKE-H, BG-* | Partial | SMOKE-H Tier 1; full matrix Tier 4; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/BG-ASK-reopen-status/manifest.json) |
| SYS-PROMPT-LAYERS | System prompt layer order | SMOKE-A transparency | Partial | `tests/test_ollama_service.py` only |

### Steam Input

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| STEAM-JUMP | Debug Steam Input jump Phase 1 | — | Open | Tier 2 optional; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/STEAM-JUMP-shim/manifest.json) |
| QUICK-LAUNCH-DOC | Guide-chord macro documentation | — | Open | Tier 3; [troubleshooting.md](troubleshooting.md) §5 |
| SHORTCUT-KW | Shortcut setup keywords | SMOKE-F | Partial | [SMOKE-F-shortcut-deck](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json); [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| VAC-01…06 | VAC / ban lookup Phase 1 | SMOKE-F, VAC-* | Partial | [VAC-01](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json); full matrix → Tier 2 |

### About and polish

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| ABOUT-OLLAMA | Built on Ollama link | — | Open | Tier 3 |
| GLASS-UI | Search surface glass pass | SMOKE-A | Open | |

### Desktop notes

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| APP-LOG | App activity logging to Desktop | — | Open | Tier 2 |
| DESKTOP-NOTES | Save to Desktop note V1 | — | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/DESKTOP-NOTES-rpc/manifest.json) |
| DESKTOP-AUTOSAVE | Daily chat auto-save V2 | — | Open | Tier 2 |

### Permissions and capabilities

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| PERMS-GATE | Capability Permission Center | SMOKE-C | Partial | [SMOKE-C](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json); on-Deck toast → runbook; [preview 2026-05-26](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| PROTON-LOG | Proton log attachment | PROTON-LOG-01…03 | Open | Tier 2; needs PROTON_LOG |
| MODEL-POLICY | Model policy tiers + disclosure | — | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/MODEL-POLICY-load/manifest.json) |

### Character voice

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CHAR-VOICE | Character roleplay mode | — | Open | Tier 2; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/CHAR-VOICE-load-settings/manifest.json) |
| CHAR-ACCENT | Accent intensity levels | — | Open | Tier 2–3 |
| CHAR-SUGGEST | Running-game character suggestions | — | Open | Tier 2 |
| CHAR-RANDOM | Random “?” avatar | — | Open | Tier 3 |
| CHAR-ACCENT-UI | Character-derived UI accent theme | — | Open | Tier 3 |
| PYRO-EGG | Pyro talent-manager easter egg | — | Open | Tier 2–3 |

### Vision (baseline index)

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| VISION-V1 | Global screenshots and vision V1 | SMOKE-G | Verified | Vision sweep 2026-04; rows below; [preview 2026-05-26](test-evidence/tier2/2026-05-26-9e20a82/VISION-V1-spot-dom/manifest.json) |

### Other shipped baseline

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-ASK | Ask pipeline / Ollama routing | SMOKE-A | Open | |
| GAME-CTX | Running game context | SMOKE-B, game-name Ask | Partial | Test #6; [preview 2026-05-26](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| TROUBLESHOOT-3 | Frozen carousel troubleshooting triple | SMOKE-D | Verified | [x] prompts below |
| LINUX-OLLAMA | Linux Ollama compatibility | CONN-TEST | Open | |
| ZIP-CI | Plugin release zip CI | N/A | N/A | CI + Tier 4 clean install |

---

## Test Results

On-Deck and preview-suite **PASS** rows only. FAIL / retry queue: [prompt-testing-failures.md](prompt-testing-failures.md).

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 1 | — | None | "What is the capital of Michigan?" | Lansing (concise) | gemma3:latest | PASS | |
| 3 | — | L4D2 | "Set my TDP to 8 watts" | JSON 8W, sysfs write | llama3:latest | PASS | → SMOKE-B |
| 4 | — | L4D2 | "Set my TDP to 6 watts" | JSON 6W, sysfs write | llama3:latest | PASS | journalctl confirmed |
| 6 | — | *(session title)* | "Recommended TDP for this game?" | JSON 3–15W clamp | *record* | PASS | → TDP-REC |
| 7 | 2026-05-26 / 9e20a82 | preview | UNIT-A-vitest-gates | MAINT-HARNESS | preview-suite | PASS | [manifest](test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| 8 | 2026-05-26 / 9e20a82 | preview | UNIT-B-pytest-sandbox-tdp | TDP-APPLY | preview-suite | PASS | [manifest](test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| 9 | 2026-05-26 / 9e20a82 | preview | SMOKE-A-golden-path | SMOKE-A, CORE-UI, CORE-ASK, CONN-TEST, TRANSP… | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) |
| 10 | 2026-05-26 / 9e20a82 | preview | SMOKE-C-perms-gate | SMOKE-C, PERMS-GATE | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| 11 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-disable-sanitize | SMOKE-F, SANITIZER | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| 12 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-shortcut-deck | SMOKE-F, SHORTCUT-KW | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| 13 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-vac-capability-off | SMOKE-F, VAC-01 | preview-suite | PASS | [manifest](test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json) |
| 14 | 2026-05-26 / 9e20a82 | preview | SMOKE-B-tdp-8w-sandbox | SMOKE-B, TDP-APPLY, QAMP-BANNER, GAME-CTX | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| 15 | 2026-05-26 / 9e20a82 | preview | SMOKE-E-strategy-mode | SMOKE-E, STRATEGY-CORE, STRATEGY-SPOILER, MOD… | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
| 16 | 2026-05-26 / 9e20a82 | preview | BG-ASK-reopen-status | SMOKE-H, BG-ASK-V1 | preview-suite | PASS | [manifest](test-evidence/tier1Core/2026-05-26-9e20a82/BG-ASK-reopen-status/manifest.json) |
| 17 | 2026-05-26 / 9e20a82 | preview | TDP-15W-clamp | TDP-15W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-15W-clamp/manifest.json) |
| 18 | 2026-05-26 / 9e20a82 | preview | TDP-3W-clamp | TDP-3W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-3W-clamp/manifest.json) |
| 19 | 2026-05-26 / 9e20a82 | preview | TDP-1W-clamp-to-3 | TDP-1W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-1W-clamp-to-3/manifest.json) |
| 20 | 2026-05-26 / 9e20a82 | preview | TDP-20W-clamp-to-15 | TDP-20W | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-20W-clamp-to-15/manifest.json) |
| 21 | 2026-05-26 / 9e20a82 | preview | GPU-800-advisory | GPU-800 | preview-suite | PASS | [manifest](test-evidence/tier1Boundaries/2026-05-26-9e20a82/GPU-800-advisory/manifest.json) |
| 22 | 2026-05-26 / 9e20a82 | preview | STREAM-01-flag-off | STREAM-01 | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/STREAM-01-flag-off/manifest.json) |
| 23 | 2026-05-26 / 9e20a82 | preview | MDNS-FIND-rpc | MDNS-FIND | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/MDNS-FIND-rpc/manifest.json) |
| 24 | 2026-05-26 / 9e20a82 | preview | MODEL-POLICY-load | MODEL-POLICY | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/MODEL-POLICY-load/manifest.json) |
| 25 | 2026-05-26 / 9e20a82 | preview | CHAR-VOICE-load-settings | CHAR-VOICE | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/CHAR-VOICE-load-settings/manifest.json) |
| 26 | 2026-05-26 / 9e20a82 | preview | VAC-02-empty-key | VAC-02 | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/VAC-02-empty-key/manifest.json) |
| 27 | 2026-05-26 / 9e20a82 | preview | DESKTOP-NOTES-rpc | DESKTOP-NOTES | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/DESKTOP-NOTES-rpc/manifest.json) |
| 28 | 2026-05-26 / 9e20a82 | preview | STEAM-JUMP-shim | STEAM-JUMP | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/STEAM-JUMP-shim/manifest.json) |
| 29 | 2026-05-26 / 9e20a82 | preview | VISION-V1-spot-dom | VISION-V1, SMOKE-G | preview-suite | PASS | [manifest](test-evidence/tier2/2026-05-26-9e20a82/VISION-V1-spot-dom/manifest.json) |
| 30 | 2026-06-09 / a9237e4 | preview | STREAM-02-flag-on-speed | STREAM-02 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-02-flag-on-speed/manifest.json) |
| 31 | 2026-06-09 / a9237e4 | preview | STREAM-03-strategy-spoiler | STREAM-03, STRATEGY-SPOILER | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-03-strategy-spoiler/manifest.json) |
| 32 | 2026-06-09 / a9237e4 | preview | STREAM-04-stop-mid-stream | STREAM-04 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-04-stop-mid-stream/manifest.json) |
| 33 | 2026-06-09 / a9237e4 | preview | STREAM-05-transparency-terminal | STREAM-05, TRANSPARENCY | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-05-transparency-terminal/manifest.json) |
| 34 | 2026-06-09 / a9237e4 | preview | VAC-03-valid-key-steamid | VAC-03 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-03-valid-key-steamid/manifest.json) |
| 35 | 2026-06-09 / a9237e4 | preview | VAC-04-profile-url | VAC-04 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-04-profile-url/manifest.json) |
| 36 | 2026-06-09 / a9237e4 | preview | VAC-05-vanity-url | VAC-05 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-05-vanity-url/manifest.json) |
| 37 | 2026-06-09 / a9237e4 | preview | VAC-06-perm-off-after-key | VAC-06 | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-06-perm-off-after-key/manifest.json) |
| 38 | 2026-06-09 / a9237e4 | preview | TDP-boundary-clamps-assert | TDP-1W, TDP-20W | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/TDP-boundary-clamps-assert/manifest.json) |
| 39 | 2026-06-09 / a9237e4 | preview | SMOKE-B-apply-with-perms | SMOKE-B, TDP-APPLY | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/SMOKE-B-apply-with-perms/manifest.json) |
| 40 | 2026-06-09 / a9237e4 | preview | BG-ASK-lifecycle | BG-ASK-V1, SMOKE-H | preview-suite | PASS | [manifest](test-evidence/tier2Deep/2026-06-09-a9237e4/BG-ASK-lifecycle/manifest.json) |

**Tier 0 preview batch (5/5):** [test-evidence/tier0/2026-05-26-9e20a82/](test-evidence/tier0/2026-05-26-9e20a82/) · **preGate (2/2):** [batch-summary](test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json) · **tier1Core (3/3):** [batch-summary](test-evidence/tier1Core/2026-05-26-9e20a82/batch-summary.json) · **tier1Boundaries (5/5):** [batch-summary](test-evidence/tier1Boundaries/2026-05-26-9e20a82/batch-summary.json) · **tier2 (8/8):** [batch-summary](test-evidence/tier2/2026-05-26-9e20a82/batch-summary.json) · **deckOnly (3 skipped):** [batch-summary](test-evidence/deckOnly/2026-05-26-9e20a82/batch-summary.json)
---

## Tier 0 scenarios (S0)

Linked from [device-qa-runbook.md](device-qa-runbook.md) **Tier 0**. Prefer smokes over individual rows.

### Deterministic commands (SMOKE-F)

- [x] `bonsai:disable-sanitize` / `bonsai:enable-sanitize` — whole message; confirmation; no Ollama text in transparency
- [x] `bonsai:shortcut-setup-deck` — Guide chord, QAM, Decky; points to [troubleshooting.md](troubleshooting.md) §5
- [ ] `bonsai:shortcut-setup-stadia` — spare button / Stadia layout (not R4-only)
- [ ] Shortcut: **Open Controller settings** with External/Steam on → `steam://open/settings/controller`
- [ ] Shortcut: permissions off → toast to enable navigation
- [x] `bonsai:vac-check` with **Steam Web API** off → capability message only (**VAC-01**)

### Token streaming (Tier 2 — Developer tab)

Requires **Settings → Data → Show Developer tab** → **Token streaming (experimental)**.

- [x] **STREAM-01** Flag off: **Thinking…** until full reply; normal chunks after
- [x] **STREAM-02** Flag on, Speed/Deep: single preview bubble; terminal split + banners
- [x] **STREAM-03** Flag on, Strategy + spoiler masking, no Spoilers OK: no unmasked mid-stream flash
- [x] **STREAM-04** Stop mid-stream: cancelled copy; no stale overwrite
- [x] **STREAM-05** Transparency populates only after terminal

---

## Tier 1 scenarios (S1)

### TDP / performance

- [x] **TDP-REC** "Recommended TDP for this game?" (game running, JSON) — Test Results #6
- [x] "What's the efficiency sweet spot for this game?" — verified prior pass
- [x] "What are the best settings for 60fps?" — verified prior pass
- [x] **GPU-ADV** "What GPU clock should I use?" (advisory only; no sysfs GPU write) — verified
- [x] **GPU-800** "Set GPU clock to 800 MHz" — JSON `gpu_clock_mhz`; backend logs, no write
- [x] **TDP-15W** "Set TDP to 15 watts" — clamp at 15W
- [x] **TDP-3W** "Set TDP to 3 watts" — clamp at 3W
- [x] **TDP-1W** "Set TDP to 1 watt" — clamp to 3W
- [x] **TDP-20W** "Set TDP to 20 watts" — clamp to 15W
- [ ] "Lower my TDP by 2 watts" — relative adjustment (may not parse)

### Battery / thermal / compatibility

- [x] "Optimize for battery life" (game running, low TDP JSON) — verified (supersedes Test #5 fail)
- [x] "Balance FPS and battery" / `How do I balance FPS and battery?`
- [ ] "Set TDP to minimum for menu/idle" / `What TDP should I use for menus and idle?`
- [x] "Best settings for 30fps with max battery"
- [x] "Optimize for battery life" (no game — general advice, no JSON)
- [x] "Reduce fan noise" / thermal long-session prompts — verified
- [x] General compatibility prompts ("What settings…", "known issues", "how well on Deck") — verified

### Troubleshooting / Proton

- [x] **TROUBLESHOOT-3** Frozen carousel: crashing / stuttering / Proton — verified (SMOKE-D)
- [ ] "Game won't launch, what should I check?"

#### Proton log attachment (Tier 2)

- [ ] **PROTON-LOG-01** Toggle + permission on, `steam-<appid>.log` present → transparency excerpt
- [ ] **PROTON-LOG-02** Toggle on, log read off → Ask completes; skip noted
- [ ] **PROTON-LOG-03** Heuristic ask, no log files → warning; answer still returns

### Controls and edge cases

- [ ] "Recommended controller layout?" (game running)
- [ ] "How to reduce input lag?"
- [ ] "What game am I playing?" (game running)
- [x] "What is my current TDP?" — read path + sysfs grounding (unit + prior pass)
- [ ] Non-English input → English reply
- [ ] Very long prompt stress test
- [x] Empty-ish "hi" / "help"
- [ ] TDP optimization ask with **no** game — generic advice only

**System prompt layers:** spot-check via SMOKE-A transparency; unit tests in `tests/test_ollama_service.py`.

---

## QAMP verification (Phase 1)

### Code / automated (verified 2026-04-26)

- [x] TDP write banner includes applied wattage
- [x] Transcript includes re-open QAM Performance guidance
- [x] **Note** about stale sliders on successful apply
- [x] GPU MHz recommendation labeled not sysfs-applied

### On-Deck manual (Tier 3 — record build + SteamOS)

- [ ] **QAMP-DECK-01** Per-game profile ON: TDP apply + guidance
- [ ] **QAMP-DECK-02** Per-game profile OFF: same
- [ ] **QAMP-DECK-03** Close/reopen QAM Performance: cap reflects write
- [ ] **QAMP-DECK-04** After Steam restart: OS default (not plugin regression)
- [ ] **QAMP-DECK-05** After full reboot: same

---

## Tier 2 — Strategy depth

Run after **SMOKE-E**. Unit coverage green 2026-04-30.

### Core mode UX

- [x] **STRAT-01** "How do I beat this level" beta preset visible
- [ ] Strategy preset switches mode to Strategy Guide
- [ ] Strategy placeholder copy
- [ ] Follow-ups stay strategy-relevant

### Spoiler policy

- [ ] **STRAT-SPOIL-01** First answer: no-spoilers-by-default disclosure
- [ ] **STRAT-SPOIL-02** Without permission: no direct puzzle/boss spoilers
- [ ] **STRAT-SPOIL-03** With permission: unrestricted guidance OK
- [ ] **STRAT-SPOIL-04** Tap-to-reveal blocks default
- [ ] **STRAT-SPOIL-05** Settings spoiler masking toggle behavior

### Vision + strategy

- [ ] Strategy without screenshot: notes limited context
- [ ] Strategy with screenshot: scene-aware guidance
- [ ] Inline visual aid renders or degrades gracefully

### Steam Input coaching / checklist / cheat

- [ ] Headshots / control-specific Deck advice
- [ ] Checklist check/uncheck + follow-up progress
- [ ] Cheat / Fast Pass gating only when user asks to rush

### Strategy regression subset

- [ ] Beat level (no screenshot, no spoiler OK)
- [ ] Beat level + screenshot
- [ ] "Spoilers are okay, give me exact steps"
- [ ] "I can't hit headshots in this game"
- [ ] Checklist iteration prompt
- [ ] "Fastest cheese" cheat gating

---

## VAC / Steam ban lookup (`bonsai:vac-check`) — Tier 2

- [x] **VAC-01** Capability off — SMOKE-F; no outbound request
- [x] **VAC-02** Capability on, empty key
- [x] **VAC-03** Valid key + known SteamID; route `vac_check`
- [x] **VAC-04** Profile URL token
- [x] **VAC-05** Vanity `/id/…` unsupported note
- [x] **VAC-06** Permission off after key saved — no network

---

## Vision V1 (verified 2026-04)

Spot-check only if attach/RPC changes. **SMOKE-G**.

- [x] Fullscreen screenshot browser + thumbnails
- [x] App-priority ordering + global fallback
- [x] Select attaches; Back/Escape; controller navigation
- [x] Attach / Ask / Mic|Stop control row
- [x] Remove attachment → text-only next Ask
- [x] Quality Low / Mid / Max settings persist
- [x] Quality sweep on device (Low → Mid → Max)
- [x] Manual Deck staged run completed

---

## Appendix — Tier 3 cosmetic (P3)

### Preset and follow-up UX

- [ ] Three random presets on load
- [ ] Fade mode: stagger, offsets (~750/1300/1700 ms), fade in/out timing, length hold
- [ ] Carousel mode: slide, D-pad history, post-Ask re-seed
- [ ] Preset tap appends " for [game]" when game running
- [ ] Follow-up category detection (battery / performance / troubleshooting / controls)

### Beta preset behavior

- [ ] `[beta]` tag visual only (not in submitted text)
- [ ] Beta preset prompts give reasonable generic advice
- [ ] Beta category detection + follow-ups

---

## Appendix — Tier 4 heavy (S3)

### Background prompt completion (V1)

**Tier 1 smoke:** SMOKE-H (reopen pending / complete). Full matrix below.

#### Lifecycle

- [ ] Close QAM while pending → reopen → Thinking…
- [ ] Close QAM after complete → reopen → final reply
- [ ] Foreground flow unchanged
- [ ] Multiple reopens → single result

#### Busy / timeout / cancel

- [ ] Second Ask blocked while pending
- [ ] Timeout + error restore on reopen
- [ ] Stop/Clear semantics

#### Apply parity

- [ ] TDP JSON applies after background complete
- [ ] Session crash/reboot does **not** restore (expected V1)

#### Regression subset

- [ ] Slow / elapsed warnings; follow-up presets; input persistence; PC IP unchanged

### Games to test with

- [ ] Left 4 Dead 2
- [ ] Elden Ring
- [ ] Lightweight indie
- [ ] Demanding AAA
- [ ] Native Linux title
- [ ] Non-Steam / emulator shortcut

---

## Environment matrix

Validate on **Stable** Decky + **Stable** SteamOS when possible. Re-test PASS after channel changes.

| Component | Channel | Notes |
|-----------|---------|-------|
| Decky Loader | Stable (Release) | |
| SteamOS | Stable | Beta/Preview may change sysfs / QAM |

### Current test environment

Record before Tier 1+ runs:

- [ ] Decky Loader version: ___
- [ ] Decky channel: Stable / Pre-release
- [ ] SteamOS version: ___
- [ ] SteamOS channel: Stable / Beta / Preview
- [ ] Ollama version: ___
- [ ] Model(s) installed: ___

---

## Optional deep dives (release notes)

Historical **suggested checks** from shipped features — run when touching that area; not required for Tier 0–1.

### Input sanitizer (2026-04-16)

Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize`; re-enable before comparative model runs.

### Character accent intensity (2026-04-16)

Same preset at subtle vs unleashed; JSON/TDP unchanged.

### Strategy + TDP layout (2026-04-18)

Pure puzzle Strategy ask → no hardware JSON in system prompt; mixed performance ask → contract returns.

### Character voice + Pyro (2026-04-15)

Picker, Random, custom line; Pyro Balanced vs Nightmare — no TDP apply on Nightmare asshole tier.

### Global screenshots (2026-04-13)

See **Vision V1** verified section.

### Frozen preset carousel (maintainers)

Set `TEMP_PRESET_CAROUSEL_FROZEN` in [`src/data/presets.ts`](../src/data/presets.ts) for repeatable chips:

1. `Why is my game crashing?`
2. `How do I fix stuttering?`
3. `Help me troubleshoot a Proton issue`

Turn **off** before release builds. `vitest` asserts frozen triple when flag on.

---

## Revision log

| Date | Change |
|------|--------|
| 2026-05-26 | FAIL rows → prompt-testing-failures.md; --write dedupe; bonsai-tier-qa skill |
| 2026-05-26 | Preview suite tier0/preGate PASS (`9e20a82`); consolidated Test Results; coverage evidence cleanup |
| 2026-05-24 | Refactor: coverage matrix, tier-linked scenarios, dedupe, runbook split; audit ✓/x → [x] |
| *(prior)* | MVP matrices, vision sweep, QAMP unit verification |
