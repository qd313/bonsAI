# bonsAI Prompt Testing Tracker

Track what prompts have been tested, what model responded, and whether the result was correct.

## Status Legend
- **PASS** - AI responded correctly and action (if any) was applied
- **FAIL** - Wrong answer, hallucination, or action not applied
- **PARTIAL** - Correct idea but formatting/parsing issue prevented full success

## Test Results

| # | Game Running | Prompt | Expected Behavior | Model | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | None | "What is the capital of Michigan?" | "Lansing" (concise) | gemma3:latest | PASS | Earlier models (gemma4) hallucinated Korean/philosophical essays |
| 2 | Elden Ring | "What TDP should I use?" | 8-12W recommendation with JSON block | llama3:latest | FAIL | Suggested 70-80W (desktop values) before system prompt was fixed |
| 3 | Left 4 Dead 2 | "Set my TDP to 8 watts" | JSON block `{"tdp_watts": 8}`, sysfs write | llama3:latest | PASS | Backend wrote 8W via steamos-priv-write |
| 4 | Left 4 Dead 2 | "Set my TDP to 6 watts" | JSON block `{"tdp_watts": 6}`, sysfs write | llama3:latest | PASS | Confirmed via journalctl: 6000000 written to power1_cap |
| 5 | Left 4 Dead 2 | "Optimize for battery life" | Low TDP (3-6W) with JSON block | llama3:latest | FAIL | Gave generic Steam Deck instructions, no JSON block (before game context was wired up) |

---

## Prompts Still Needing Testing

### TDP / Performance
- [ ] "Recommended TDP for this game?" (with game running — should give JSON block)
- [ ] "Max performance for this game" (should suggest high TDP with JSON block)
- [ ] "Best settings for 60fps" (should include TDP recommendation with JSON block)
- [ ] "Set TDP to 15 watts" (max boundary — should clamp at 15W)
- [ ] "Set TDP to 3 watts" (min boundary — should clamp at 3W)
- [ ] "Set TDP to 1 watt" (below min — should clamp to 3W)
- [ ] "Set TDP to 20 watts" (above max — should clamp to 15W)
- [ ] "Lower my TDP by 2 watts" (relative adjustment — may not parse yet)

### GPU Clock (Advisory)
- [ ] "What GPU clock should I use?" (should recommend a value but NOT auto-apply — sysfs write not yet implemented)
- [ ] "Set GPU clock to 800 MHz" (verify JSON includes `gpu_clock_mhz` field; backend logs value but does not write)

### Battery Optimization
- [ ] "Optimize for battery life" (with game running — should give low TDP JSON block)
- [ ] "Balance FPS and battery" (with game running — should give moderate TDP)
- [ ] "Set TDP to minimum for menu/idle" (should suggest 3W JSON block)
- [ ] "Best settings for 30fps with max battery" (with game running)
- [ ] "Optimize for battery life" (NO game running — should give general advice, no JSON block)

### Thermal
- [ ] "Reduce fan noise" (should suggest lower TDP to reduce thermal load)
- [ ] "Best thermal settings for long play sessions" (should give conservative TDP advice)

### General / Compatibility
- [ ] "What settings should I use?" (with game running — should give game-specific advice)
- [ ] "Any known issues running this on Deck?" (open-ended — should not hallucinate a binary verified/not-verified status)
- [ ] "How well does this game run on Deck?" (open-ended compatibility advice)

### Troubleshooting / Proton
- [ ] "Why is my game crashing?" (with game running — should reference the game by name)
- [ ] "How do I fix stuttering?" (should suggest TDP/FSR/framerate-cap advice)
- [ ] "Help me troubleshoot a Proton issue" (general Proton advice)
- [ ] "Game won't launch, what should I check?" (general troubleshooting checklist)

### Controls
- [ ] "Recommended controller layout?" (with game running — should give game-specific advice)
- [ ] "How to reduce input lag?" (general advice for Steam Deck input settings)

### General Knowledge / Edge Cases
- [ ] "What game am I playing?" (should name the running game)
- [ ] "What is my current TDP?" (we don't read it back yet — should say so)
- [ ] Non-English input (should still respond in English)
- [ ] Very long prompt (stress test)
- [ ] Empty-ish prompts like "hi" or "help"
- [ ] Prompt with no game running asking for TDP optimization (should give generic advice, not hallucinate a game)

---

## QAMP Verification (Phase 1 — In Progress)
- [ ] After TDP write: confirmation message includes applied wattage
- [ ] After TDP write: response includes guidance to re-open QAM Performance tab to verify reflected value
- [ ] With per-game profile ON: TDP write applies and verification guidance is shown
- [ ] With per-game profile OFF: TDP write applies and verification guidance is shown
- [ ] After closing and reopening QAM Performance tab: verify slider reflects the written value
- [ ] After Steam restart: verify TDP returns to default (not persisted across restarts)
- [ ] After full reboot: verify TDP returns to default
- [ ] Prompt includes GPU clock recommendation: verify verification guidance still shown for TDP portion

---

## Background Prompt Completion (V1)

### Lifecycle and Restore
- [ ] Start prompt, close QAM/plugin UI while request is pending, reopen before completion -> pending status restores with "Thinking...".
- [ ] Start prompt, close QAM/plugin UI while request is pending, reopen after completion -> final response restores automatically.
- [ ] Start prompt, keep QAM open -> behavior matches normal foreground request flow (no regressions).
- [ ] Reopen plugin multiple times during one pending request -> no duplicate/stacked results; single final result shown.

### Busy Guardrails (Single In-Flight)
- [ ] While one request is pending, second Ask attempt is blocked with clear "request in progress" feedback.
- [ ] While one request is pending, Enter submit path is also blocked from starting a second request.
- [ ] After pending request completes, next Ask request can start normally.

### Timeout, Error, and Cancel Semantics
- [ ] Timeout path: exceeds configured request timeout and restores failed state + timeout message on reopen.
- [ ] Backend/network error path: failed state restores with meaningful error text on reopen.
- [ ] Local Stop/Cancel interaction does not create a second backend request and does not leave UI stuck in loading state.
- [ ] Local Clear interaction while pending does not break eventual restore behavior when status is polled again.

### Apply/Action Parity
- [ ] Response with valid TDP JSON still applies once and displays `[Applied: ...]` summary after completion/reopen.
- [ ] Apply errors (if any) continue to render in `[Errors: ...]` suffix without breaking restore flow.

### Session-Only Limitation (Expected)
- [ ] Verify/reconfirm V1 boundary: Steam crash/plugin restart/reboot does NOT restore pending/completed background status.

### Regression Subset (Run after any prompt/system update)
- [ ] Slow warning still appears after configured latency threshold while pending.
- [ ] Elapsed-time warning still appears for responses slower than configured threshold.
- [ ] Suggested follow-up presets still refresh after successful completion.
- [ ] Unified input persistence mode behavior is unchanged (`persist_all`, `persist_search_only`, `no_persist`).
- [ ] Saved PC IP behavior is unchanged after successful ask/connection test.

### Verification Runbook (Record PASS/FAIL)
- [ ] Build validation (`npm run build`) -> PASS when build completes with no TypeScript errors that block output.
- [ ] Backend syntax validation (`python -m py_compile main.py`) -> PASS when command exits cleanly.
- [ ] Deck manual lifecycle matrix -> PASS when all Lifecycle, Busy Guardrails, Timeout/Error/Cancel, and Apply/Action checks above are marked complete.
- [ ] Session-only boundary check -> PASS when restart/crash scenarios correctly do **not** restore state (expected V1 limitation).

---

## Preset and Follow-Up UX
- [ ] Initial load shows exactly 3 random presets
- [ ] Tapping a preset with a game running appends " for [game name]" to input
- [ ] Tapping a preset with NO game running sets only the preset text (no trailing "for")
- [ ] After asking a battery question, follow-ups include battery/performance/thermal presets
- [ ] After asking a performance question, follow-ups include performance/thermal/battery presets
- [ ] After asking a troubleshooting question, follow-ups include troubleshooting/performance/general presets
- [ ] After asking a controls question, follow-ups include controls/troubleshooting/general presets
- [ ] Category detection works for freeform questions (not just exact preset matches)

---

## Beta Preset Behavior
- [ ] `[beta]` tag renders visually on chip (dimmer italic text)
- [ ] `[beta]` tag is NOT included in the submitted prompt text
- [ ] "Set a quiet fan profile" — AI gives reasonable fan/thermal advice even without fan control backend
- [ ] "Analyze my controller config" — AI gives general controller advice even without VDF parsing
- [ ] "Check my Proton logs for errors" — AI gives Proton troubleshooting steps even without log attachment
- [ ] "Suggest mods or tweaks for this game" — AI gives general mod advice even without mod detection
- [ ] Beta presets trigger correct category detection and follow-up chain

---

## Strategy Guide Prompt Testing

### Core Strategy Preset and Mode UX
- [ ] "How do I beat this level" preset appears as beta strategy preset.
- [ ] Tapping strategy preset switches mode from `Thinking` replacement lane to `Strategy Guide`.
- [ ] Strategy mode placeholder changes from generic ask text to strategy copy (e.g. "Describe the level or problem").
- [ ] Follow-up prompts after strategy questions continue to include strategy-relevant suggestions.

### Vision and Inline Visuals
- [ ] Strategy prompt with no screenshot: gives useful fallback guidance and clearly notes limited visual context.
- [ ] Strategy prompt with screenshot attached: response references visible scene/problem details.
- [ ] If inline visual aid is returned (map/dungeon hint), it renders inline correctly in response.
- [ ] If inline visual cannot render, response degrades gracefully (text-only fallback, no broken UI).

### Spoiler Policy and Consent
- [ ] First strategy answer includes best-effort "no spoilers by default" disclosure.
- [ ] Without explicit permission, response avoids direct puzzle/boss/story spoilers.
- [ ] With explicit user permission ("spoilers are okay"), unrestricted guidance is allowed.
- [ ] Spoiler segments render as tap-to-reveal blocks by default.
- [ ] Settings toggle for spoiler masking changes behavior as expected (masked vs directly visible after consent).

### Steam Input-Tailored Coaching
- [ ] User issue like "I can't hit headshots" triggers control-specific advice (gyro/trackpad/layout/sensitivity).
- [ ] Recommendations remain actionable for Steam Deck (not generic desktop-only control tips).
- [ ] If Steam Input context is missing, response explicitly gives best-effort generic control advice.

### Checklist Workflow (Chat-Scoped)
- [ ] Strategy response can include checklist summary with actionable steps.
- [ ] User can check/uncheck checklist items in chat.
- [ ] Follow-up question updates checklist progress based on previous checked items.
- [ ] Follow-up can infer progress from user text even when boxes were not manually checked.
- [ ] Checklist state is chat-scoped only (does not leak to unrelated/new chat context).

### Cheat / Fast Pass Gating
- [ ] No cheat section appears for normal coaching requests.
- [ ] "Give me fastest way / I just want to pass quickly" explicitly enables `Cheat / Fast Pass` section.
- [ ] Cheat section stays clearly separated from normal coaching guidance.

### PASS / PARTIAL / FAIL Examples (Strategy)
- **PASS:** Correctly follows spoiler policy, provides practical strategy, and updates checklist state consistently.
- **PARTIAL:** Good tactical advice but misses one policy/format rule (e.g. spoiler disclosure missing, checklist not updated).
- **FAIL:** Gives unconsented spoilers, ignores explicit consent handling, provides irrelevant control advice, or breaks checklist/visual rendering expectations.

### Strategy Regression Subset (Run after prompt/system updates)
- [ ] "How do I beat this level" (no screenshot, no spoiler permission).
- [ ] "How do I beat this level" + screenshot attachment (scene-aware guidance expected).
- [ ] "Spoilers are okay, give me exact steps" (unrestricted but spoiler formatting/toggle behavior correct).
- [ ] "I can't hit headshots in this game" (Steam Input-focused coaching expected).
- [ ] "Give me a checklist and keep it updated while we iterate" (checklist lifecycle sanity check).
- [ ] "I don't care, just the fastest cheese" (Cheat/Fast Pass gating expected).

---

## Games to Test With
- [ ] Left 4 Dead 2 (confirmed working — lightweight Source engine)
- [ ] Elden Ring (demanding, Proton-dependent)
- [ ] A lightweight indie game (Celeste, Hollow Knight, Stardew Valley, etc.)
- [ ] A demanding AAA game (Cyberpunk 2077, Red Dead Redemption 2, etc.)
- [ ] A native Linux game (if available in library)
- [ ] A non-Steam game / emulator (added via shortcut)

## Environment Matrix

All tests above should be validated on the stable channels that most users run. Re-test any PASS result if switching channels.

| Component | Channel to Test | Notes |
|---|---|---|
| Decky Loader | **Stable** (Release) | Most users are on Stable. Dev/pre-release builds may have APIs or behaviors that don't exist on Stable. |
| SteamOS | **Stable** (Default client update channel) | Beta/Preview channels may change sysfs paths, permission models, or QAM behavior. Always confirm on Stable before shipping. |

### Current Test Environment
- [ ] Record Decky Loader version: ___
- [ ] Record Decky Loader channel: Stable / Pre-release
- [ ] Record SteamOS version: ___
- [ ] Record SteamOS update channel: Stable / Beta / Preview
- [ ] Record Ollama version on host PC: ___
- [ ] Record model(s) installed: ___
