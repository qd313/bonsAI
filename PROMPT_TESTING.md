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

## Prompts Still Needing Testing

### TDP / Performance
- [ ] "Optimize [game] for battery life" (with game running)
- [ ] "Optimize [game] for best performance"
- [ ] "Set TDP to 15 watts" (max boundary)
- [ ] "Set TDP to 3 watts" (min boundary)
- [ ] "Set TDP to 1 watt" (below min - should clamp to 3W)
- [ ] "Set TDP to 20 watts" (above max - should clamp to 15W)
- [ ] "What TDP do you recommend for [game]?" (should give JSON block)
- [ ] "Lower my TDP by 2 watts" (relative adjustment - may not work yet)
- [ ] "Set GPU clock to 800 MHz" (GPU clock in JSON)
- [ ] "Balance performance and battery for [game]"

### General Knowledge / Edge Cases
- [ ] "What game am I playing?" (should name the running game)
- [ ] "What is my current TDP?" (we don't read it back yet)
- [ ] Non-English input (should still respond in English)
- [ ] Very long prompt (stress test)
- [ ] Empty-ish prompts like "hi" or "help"
- [ ] Prompt with no game running asking for TDP optimization

### Games to Test With
- [ ] Left 4 Dead 2 (confirmed working)
- [ ] Elden Ring
- [ ] A lightweight indie game (Celeste, Hollow Knight, etc.)
- [ ] A demanding AAA game (Cyberpunk 2077, etc.)
- [ ] A non-Steam game / emulator

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
