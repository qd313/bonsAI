# Historical Test Results (archived 2026-07-30)

Live coverage: [testing.md](../testing.md). Evidence: [test-evidence/](../../../bonsAI-workshop/test-evidence). Failures: [testing-failures-2026.md](testing-failures-2026.md).

> **† Two preview PASS rows were withdrawn 2026-08-08 — annotated, not rewritten.**
> Five defects in the preview harness meant DOM, focus-path and screenshot
> assertions never checked what they claimed; full statement and evidence in
> [testing.md § Preview-suite evidence invalidated](../testing.md#preview-suite-evidence-invalidated-2026-08-08).
> Rows whose PASS rested **only** on those assert types are marked `†` below and
> should be read as *not run*. Every other row stands — `rpcResult`, `hookResult`,
> `shellVitest` and `shellPytest` steps were unaffected. **Nothing here is deleted
> and no linked evidence was pruned**; the stored `final.png` files, however, are a
> placeholder image rather than a screenshot and are not evidence of anything.

## Test Results

On-Deck and preview-suite **PASS** rows only. FAIL / retry queue: [testing-failures-2026.md](testing-failures-2026.md).

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 1 | — | None | "What is the capital of Michigan?" | Lansing (concise) | gemma3:latest | PASS | |
| 3 | — | L4D2 | "Set my TDP to 8 watts" | JSON 8W, sysfs write | llama3:latest | PASS | → SMOKE-B |
| 4 | — | L4D2 | "Set my TDP to 6 watts" | JSON 6W, sysfs write | llama3:latest | PASS | journalctl confirmed |
| 6 | — | *(session title)* | "Recommended TDP for this game?" | JSON 3–15W clamp | *record* | PASS | → TDP-REC |
| 7 | 2026-05-26 / 9e20a82 | preview | UNIT-A-vitest-gates | MAINT-HARNESS | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/preGate/2026-05-26-9e20a82/UNIT-A-vitest-gates/manifest.json) |
| 8 | 2026-05-26 / 9e20a82 | preview | UNIT-B-pytest-sandbox-tdp | TDP-APPLY | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/preGate/2026-05-26-9e20a82/UNIT-B-pytest-sandbox-tdp/manifest.json) |
| 9 | 2026-05-26 / 9e20a82 | preview | SMOKE-A-golden-path | SMOKE-A, CORE-UI, CORE-ASK, CONN-TEST, TRANSPΓÇª | preview-suite | PASS † | [manifest](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82/SMOKE-A-golden-path/manifest.json) — **† withdrawn 2026-08-08:** both asserts were DOM/focus-path, so this PASS checked nothing |
| 10 | 2026-05-26 / 9e20a82 | preview | SMOKE-C-perms-gate | SMOKE-C, PERMS-GATE | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82/SMOKE-C-perms-gate/manifest.json) |
| 11 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-disable-sanitize | SMOKE-F, SANITIZER | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-disable-sanitize/manifest.json) |
| 12 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-shortcut-deck | SMOKE-F, SHORTCUT-KW | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-shortcut-deck/manifest.json) |
| 13 | 2026-05-26 / 9e20a82 | preview | SMOKE-F-vac-capability-off | SMOKE-F, VAC-01 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82/SMOKE-F-vac-capability-off/manifest.json) |
| 14 | 2026-05-26 / 9e20a82 | preview | SMOKE-B-tdp-8w-sandbox | SMOKE-B, TDP-APPLY, QAMP-BANNER, GAME-CTX | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-B-tdp-8w-sandbox/manifest.json) |
| 15 | 2026-05-26 / 9e20a82 | preview | SMOKE-E-strategy-mode | SMOKE-E, STRATEGY-CORE, STRATEGY-SPOILER, MODΓÇª | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Core/2026-05-26-9e20a82/SMOKE-E-strategy-mode/manifest.json) |
| 16 | 2026-05-26 / 9e20a82 | preview | BG-ASK-reopen-status | SMOKE-H, BG-ASK-V1 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Core/2026-05-26-9e20a82/BG-ASK-reopen-status/manifest.json) |
| 17 | 2026-05-26 / 9e20a82 | preview | TDP-15W-clamp | TDP-15W | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-15W-clamp/manifest.json) |
| 18 | 2026-05-26 / 9e20a82 | preview | TDP-3W-clamp | TDP-3W | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-3W-clamp/manifest.json) |
| 19 | 2026-05-26 / 9e20a82 | preview | TDP-1W-clamp-to-3 | TDP-1W | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-1W-clamp-to-3/manifest.json) |
| 20 | 2026-05-26 / 9e20a82 | preview | TDP-20W-clamp-to-15 | TDP-20W | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Boundaries/2026-05-26-9e20a82/TDP-20W-clamp-to-15/manifest.json) |
| 21 | 2026-05-26 / 9e20a82 | preview | GPU-800-advisory | GPU-800 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier1Boundaries/2026-05-26-9e20a82/GPU-800-advisory/manifest.json) |
| 22 | 2026-05-26 / 9e20a82 | preview | STREAM-01-flag-off | STREAM-01 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/STREAM-01-flag-off/manifest.json) |
| 23 | 2026-05-26 / 9e20a82 | preview | MDNS-FIND-rpc | MDNS-FIND | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/MDNS-FIND-rpc/manifest.json) |
| 24 | 2026-05-26 / 9e20a82 | preview | MODEL-POLICY-load | MODEL-POLICY | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/MODEL-POLICY-load/manifest.json) |
| 25 | 2026-05-26 / 9e20a82 | preview | CHAR-VOICE-load-settings | CHAR-VOICE | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/CHAR-VOICE-load-settings/manifest.json) |
| 26 | 2026-05-26 / 9e20a82 | preview | VAC-02-empty-key | VAC-02 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/VAC-02-empty-key/manifest.json) |
| 27 | 2026-05-26 / 9e20a82 | preview | DESKTOP-NOTES-rpc | DESKTOP-NOTES | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/DESKTOP-NOTES-rpc/manifest.json) |
| 28 | 2026-05-26 / 9e20a82 | preview | STEAM-JUMP-shim | STEAM-JUMP | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/STEAM-JUMP-shim/manifest.json) |
| 29 | 2026-05-26 / 9e20a82 | preview | VISION-V1-spot-dom | VISION-V1, SMOKE-G | preview-suite | PASS † | [manifest](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/VISION-V1-spot-dom/manifest.json) — **† withdrawn 2026-08-08:** single DOM assert, no other check. SMOKE-G's Verified status is unaffected; it rests on the April 2026 on-Deck sweep |
| 30 | 2026-06-09 / a9237e4 | preview | STREAM-02-flag-on-speed | STREAM-02 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-02-flag-on-speed/manifest.json) |
| 31 | 2026-06-09 / a9237e4 | preview | STREAM-03-strategy-spoiler | STREAM-03, STRATEGY-SPOILER | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-03-strategy-spoiler/manifest.json) |
| 32 | 2026-06-09 / a9237e4 | preview | STREAM-04-stop-mid-stream | STREAM-04 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-04-stop-mid-stream/manifest.json) |
| 33 | 2026-06-09 / a9237e4 | preview | STREAM-05-transparency-terminal | STREAM-05, TRANSPARENCY | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/STREAM-05-transparency-terminal/manifest.json) |
| 34 | 2026-06-09 / a9237e4 | preview | VAC-03-valid-key-steamid | VAC-03 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-03-valid-key-steamid/manifest.json) |
| 35 | 2026-06-09 / a9237e4 | preview | VAC-04-profile-url | VAC-04 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-04-profile-url/manifest.json) |
| 36 | 2026-06-09 / a9237e4 | preview | VAC-05-vanity-url | VAC-05 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-05-vanity-url/manifest.json) |
| 37 | 2026-06-09 / a9237e4 | preview | VAC-06-perm-off-after-key | VAC-06 | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/VAC-06-perm-off-after-key/manifest.json) |
| 38 | 2026-06-09 / a9237e4 | preview | TDP-boundary-clamps-assert | TDP-1W, TDP-20W | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/TDP-boundary-clamps-assert/manifest.json) |
| 39 | 2026-06-09 / a9237e4 | preview | SMOKE-B-apply-with-perms | SMOKE-B, TDP-APPLY | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/SMOKE-B-apply-with-perms/manifest.json) |
| 40 | 2026-06-09 / a9237e4 | preview | BG-ASK-lifecycle | BG-ASK-V1, SMOKE-H | preview-suite | PASS | [manifest](../../../bonsAI-workshop/test-evidence/tier2Deep/2026-06-09-a9237e4/BG-ASK-lifecycle/manifest.json) |
| 41 | 2026-07-27 / Deck | DRG Survivor (`2321470`) | Strategy Ask (Glyphid Dreadnought / seed KB) | KB-SMOKE-02, KB-RETRIEVE | gemma4:e2b-it-qat | PASS | Dev-tab seed KB; Show details Local KB `wiki_verified`; [screenshot](../screenshots/DeckCapture_20260727_170321_game.png) |
| 42 | 2026-07-28 / Deck | DRG Survivor (`2321470`) | Strategy Ask (Dreadnought / vectorized seed + nomic) | KB-SMOKE-04, KB-RETRIEVE | gemma4:e2b-it-qat | PASS | Hybrid **Keyword + meaning**; embed ~1124 ms; [screenshot](../screenshots/DeckCapture_20260728_183448_game.png) |

**Tier 0 preview batch (5/5):** [test-evidence/tier0/2026-05-26-9e20a82/](../../../bonsAI-workshop/test-evidence/tier0/2026-05-26-9e20a82) ┬╖ **preGate (2/2):** [batch-summary](../../../bonsAI-workshop/test-evidence/preGate/2026-05-26-9e20a82/batch-summary.json) ┬╖ **tier1Core (3/3):** [batch-summary](../../../bonsAI-workshop/test-evidence/tier1Core/2026-05-26-9e20a82/batch-summary.json) ┬╖ **tier1Boundaries (5/5):** [batch-summary](../../../bonsAI-workshop/test-evidence/tier1Boundaries/2026-05-26-9e20a82/batch-summary.json) ┬╖ **tier2 (8/8):** [batch-summary](../../../bonsAI-workshop/test-evidence/tier2/2026-05-26-9e20a82/batch-summary.json) ┬╖ **deckOnly (3 skipped):** [batch-summary](../../../bonsAI-workshop/test-evidence/deckOnly/2026-05-26-9e20a82/batch-summary.json)
---
