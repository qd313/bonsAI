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
