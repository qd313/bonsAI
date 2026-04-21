# bonsAI Prompt Testing Tracker

Track what prompts have been tested, what model responded, and whether the result was correct.

**PR / release gates:** automated commands, per-area tests, and Deck smoke checklist → [regression-and-smoke.md](regression-and-smoke.md).

Related planning (not yet implemented): future prompt policy, search UX, and Steam Input work are ranked in [roadmap.md](roadmap.md). When those ship, use the research and catalog notes below to extend test matrices.

- [steam-input-research.md](steam-input-research.md) — Steam Input search/jump feasibility, fallback UX, validation checklist.
- [voice-character-catalog.md](voice-character-catalog.md) — opt-in character voice/accent preset catalog (planning-only).

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

## Release Notes

### 2026-04-16 - Input sanitizer lane (hybrid) shipped
- **Default:** deterministic sanitization runs on Ask text before Ollama (on by default; no Settings UI).
- **Commands:** Send exactly `bonsai:disable-sanitize` or `bonsai:enable-sanitize` as the **whole** Ask message (trim + casefold match). No model call; plugin persists `input_sanitizer_user_disabled` and returns confirmation text.
- **Testing without touching benchmarks:** Use normal game prompts for model quality rows. To verify the lane only, use short benign strings, empty/whitespace-only asks (expect block when sanitizer is on), and the enable/disable phrases on a throwaway profile or after noting you will flip the flag back. Re-enable with `bonsai:enable-sanitize` before resuming comparative prompt runs so empty-control tests do not leak into “model said X” rows.

### 2026-04-16 - Character accent intensity (Settings)
- **Accent intensity** (when AI characters is on): four levels persisted as `ai_character_accent_intensity` (`subtle`, `balanced`, `heavy`, `unleashed`). The backend varies how strongly the system prompt asks for dialect/accent; factual answers and required TDP JSON behavior are unchanged.
- **Ultra** (`heavy`): brief in-character tangents allowed, then a clear snap-back to the answer; JSON/TDP fences unchanged.
- **Nightmare** (`unleashed`): stronger wandering and caricature-level voice allowed, then snap-back and a **short plain recap** so facts stay recoverable; middle may be deliberately hard to read.
- Suggested checks: same preset at **subtle** vs **unleashed** and confirm voice color shifts while JSON/TDP blocks still parse; verify Input handling / verbose trace shows the updated system suffix when logging is on.

### 2026-04-18 - Strategy Guide + TDP prompt layout
- **Strategy first turn** without performance/TDP keywords in the user message: system prompt omits the hardware JSON contract block so coaching is not front-loaded with watts/GPU talk; branch-picker fence rules unchanged.
- **Strategy** when the user *does* ask about TDP/FPS/performance: hardware appendix returns; first-turn instructions place the optional fenced TDP JSON block immediately above the `bonsai-strategy-branches` fence when recommending changes.
- Suggested checks: Strategy Ask on a pure puzzle prompt → raw model output should avoid opening with TDP; transparency “System prompt” should show the strategy silence paragraph instead of the full JSON contract. Mixed “stuck + what TDP” prompt should still show the contract.

### 2026-04-15 - Character Voice Roleplay Mode (Opt-In) Shipped
- Settings: opt-in **AI character** with fullscreen picker (work-title sections, Random, custom line, OK/Cancel).
- Backend: `ai_character_service` appends a concise roleplay instruction to the **system** message; TDP JSON contract unchanged.
- Suggested checks: enable + pick a known preset (e.g. Jackie Welles) and confirm tone shifts while answers stay English and concise; enable **Random** and confirm variation across Asks; custom text only; toggle off and confirm neutral assistant tone returns.

### 2026-04-13 - Global Screenshots and Vision (V1) Completed
- Added screenshot attachment flow with fullscreen recent-screenshot browser, thumbnail previews, and controller-first navigation.
- Added multimodal ask payload support with screenshot preprocessing + dimension clamp options (`1280`, `1920`, `3160`) and persisted settings.
- Added game-context enrichment for vision prompts (running app + attachment metadata hints), plus guardrails to prioritize in-game cues over Steam overlay UI.
- Improved composer UX for attachments: visible chip preview, remove action, and integrated ask-bar behavior for screenshot-assisted prompts.

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
- [ ] After successful sysfs apply (no errors): model transcript includes the **Note:** paragraph about stale QAM sliders (`buildResponseText` / main tab body), not only the yellow banner row
- [ ] With per-game profile ON: TDP write applies and verification guidance is shown
- [ ] With per-game profile OFF: TDP write applies and verification guidance is shown
- [ ] After closing and reopening QAM Performance tab: verify slider reflects the written value
- [ ] After Steam restart: verify TDP returns to default (not persisted across restarts)
- [ ] After full reboot: verify TDP returns to default
- [ ] Prompt includes GPU clock recommendation: verify verification guidance still shown for TDP portion

---

## Background Prompt Completion (V1) - Feature Shipped, Verification Matrix In Progress

Status note:
- Feature is implemented and marked complete in [roadmap.md](roadmap.md).
- The checklist below is the ongoing regression/verification matrix for post-ship hardening.

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
- [ ] Preset carousel: three chips stay visible; each fades in/out on its own schedule (staggered, not synchronized)
- [ ] Preset carousel: first-cycle fade-in start offset per chip ~0 / 650 / 1300 ms
- [ ] Preset carousel: fade in and fade out each take ~2s (smooth opacity transition)
- [ ] Preset carousel: longer preset text stays on screen longer before the next fade-out (hold scales with length)
- [ ] After a successful ask, follow-up presets re-seed and carousel animation continues without layout break
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

### Global Screenshots and Vision (V1) - Completed
- [x] Attach target opens fullscreen screenshot browser with visible thumbnail previews.
- [x] Screenshot browser lists recent screenshots with app-priority ordering when a game is active and global fallback when not.
- [x] Selecting a screenshot from the grid attaches it and closes browser back to composer.
- [x] Browser supports controller navigation and Back/Escape close path without focus traps.
- [x] Merged action control exposes exactly 3 targets: `Attach` (left), `Ask` (center), `Mic` idle / `Stop` while asking (right).
- [x] Remove attachment action clears composer indicator and sends next ask request as text-only.

### Screenshot Dimension Clamp Settings
- [x] Settings tab shows screenshot max dimension options `1280`, `1920`, `3160`.
- [x] Changing max dimension persists after closing/reopening plugin.
- [x] With `1280` selected, backend sends compressed image and response remains stable on slower hosts.
- [x] With `1920` selected, backend accepts screenshot attachment and model response remains valid.
- [x] With `3160` selected, large captures still avoid backend crashes; if processing fails, user gets actionable attachment error text.

### Manual Deck Test Run (Staged)
- [x] Set test environment details in **Current Test Environment** section before starting.
- [x] Launch a game, open bonsAI, open fullscreen browser from `Attach`, pick a screenshot tile, then submit one `Ask`.
- [x] Repeat with no active game and confirm browser still lists recent screenshots (global fallback).
- [x] Verify attachment chip visuals and controls: source badge label, filename truncation, remove button, attach-button count badge.
- [x] Verify button sizing/focus usability with controller only: attach button, ask/stop button, clear button, and fullscreen browser grid navigation.
- [x] Run the dimension clamp sweep (`1280` then `1920` then `3160`) and record latency + any attachment warnings/errors in Notes.
- [x] Close/reopen plugin after changing dimension clamp and confirm the selected value persists.
- [x] Mark PASS/PARTIAL/FAIL for each step above and capture screenshots/log snippets for any failures.

### Spoiler Policy and Consent
- [ ] First strategy answer includes best-effort "no spoilers by default" disclosure.
- [ ] Without explicit permission, response avoids direct puzzle/boss/story spoilers.
- [ ] With explicit user permission ("spoilers are okay"), unrestricted guidance is allowed.
- [ ] Spoiler segments render as tap-to-reveal blocks by default.
- [ ] Settings toggle for spoiler masking changes behavior as expected (masked vs directly visible after consent).

### Steam Input-Tailored Coaching
**Phase 1 (navigation plumbing)** is **complete** (Debug tab jump + lexicon); broader search+jump is **deferred** per [roadmap.md](roadmap.md).

When full **Steam Input Settings Search + Jump** ships (if revived), add matrix rows against [steam-input-research.md](steam-input-research.md) validation checklist (exact vs near vs manual-only routes).

**Regression smoke (optional):** After Steam client updates that may affect Input, run the Debug tab **Jump to Steam Input (running game)** with a focused title and record PASS/PARTIAL/FAIL against the smoke-test bullets in [steam-input-research.md](steam-input-research.md).

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
