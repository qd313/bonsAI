# Decky Plugin bonsAI (Backend Ollama Node for Steam (A.I.)) - Roadmap

## Completed
- [x] ★ **Beta Disclaimer Modal:** Show one-time experimental-software warning with risk acknowledgment and bug-report link.
- [x] ★ **Suggested AI Prompts:** Show curated prompt presets, randomize initial suggestions, and generate contextual follow-ups after responses.
- [x] ★★ **Ollama Network Routing Fix:** Route frontend requests through Decky backend (`call("ask_game_ai", ...)`) to resolve cross-origin failures.
- [x] ★★ **Deck and PC Connection Settings:** Add connection-focused settings including visible Deck IP and PC IP management.
- [x] ★★ **Diagnostic, Latency, and Timeout Warnings:** Return `elapsed_seconds`, show slow-response warnings, and enforce backend timeout messaging.
- [x] ★★ **Configurable Latency and Timeout Controls:** Add persisted warning/timeout settings with side increment controls (`-` / `+`) in Settings.
- [x] ★★ **Iconography Pass (Tabs + Plugin + Ask Button):** Add icons to all tabs (bonsAI bonsai-tree icon, Settings gear, Debug bug, About unchanged), switch plugin icon to bonsai SVG, and show the stock diamond beside `Ask` text.
- [x] ★★ **Persist Last Question and Answer:** Restore prior session state when reopening QAM via Decky settings storage.
- [x] ★★ **Unified Search + Ask Input:** Merge settings search and AI question entry into one shared input flow.
- [x] ★★★ **TDP Automation via AI Output:** Parse AI recommendations and apply constrained TDP values through safe sysfs write paths.
- [x] ★★★ **D-pad Response Scrolling:** Split long responses into focusable chunks for controller-first navigation.

## In Progress
- [ ] ★★★ **QAMP Reflection (Phase 1 - Safe Default):** Show applied-state confirmation and explicit verification guidance when QAM sliders do not immediately mirror hardware writes.
  - Requirement: every BonsAI performance action must be user-verifiable after execution.
  - Initial behavior: keep sysfs write path as source of truth and guide users to re-open QAM Performance to verify reflected values.

## Known Bugs
- [ ] ★ **Question Overlay Alignment Drift:** The 3-line question overlay has minor horizontal spacing mismatch vs native `TextField` internals.
- [ ] ★★ **D-pad Scroll Bottom Cutoff:** Controller navigation can stop before the final response chunk is fully visible even when touch scroll can reach it.

## Up Next
- [ ] ★★ **Prompt Testing and Tuning:** Systematically validate prompt quality across games and scenarios (see `PROMPT_TESTING.md`).
- [ ] ★★★ **QAMP Verification Checklist:** Verify behavior across per-game profile modes, QAM reopen, Steam restart/reboot, and GPU-related recommendations.
  - [ ] Verify behavior with per-game profile on/off.
  - [ ] Verify behavior after closing and reopening the QAM Performance tab.
  - [ ] Verify behavior after Steam restart and full reboot.
  - [ ] Verify behavior when prompt includes GPU clock recommendations.
- [ ] ★★★★★ **QAMP Reflection (Phase 2 - Experimental Opt-In):** Attempt Steam profile sync only behind explicit warning toggles. *Blocked on Phase 1.*
  - Risks: undocumented internals, Steam update breakage, restart/reboot requirements, and profile corruption risk.
  - Candidate path: fragile `config.vdf` / protobuf edits gated behind experimental mode only.

## Future Features (DO NOT IMPLEMENT YET)
**[Full detailed breakdown →](FUTURE_FEATURES.md)**

- [ ] ★★★ **Mode Selector Dropdown (Main Screen):** Add mode selection (`Fast`, `Strategy Guide`, `Mega/Ultra/Deep`) with safe installed-model fallback behavior.
  - Note: **Strategy Guide** replaces the previous `Thinking` mode label/behavior (repurpose, not extra mode count).
- [ ] ★★★★ **Strategy Guide Prompt Path (Beta):** Add strategy preset-driven UX (`How do I beat this level`), coaching-first guidance, Steam Input-aware recommendations, and optional `Cheat / Fast Pass` output only when explicitly requested.
- [ ] ★★★★ **Strategy Guide Safety and Spoilers:** Default to best-effort spoiler avoidance, require explicit user permission for unrestricted spoilers, and support tap-to-reveal spoiler formatting with optional Settings toggle behavior.
- [ ] ★★★ **Per-Mode Latency/Timeout Profiles:** Configure separate warning/timeout values per mode. Depends on **Mode Selector Dropdown (Main Screen)**.
- [ ] ★★★ **Multi-Language Responses:** Detect Steam language and localize AI response language (with optional override).
- [x] ★★★ **Background Prompt Completion:** Allow requests to complete while QAM is closed and restore results when reopened.
- [ ] ★★★ **Debugging and Proton Log Analysis:** Attach relevant Proton/game log excerpts to troubleshooting prompts.
- [x] ★★★★ **Linux Ollama Compatibility:** Add support and validation for Linux-hosted Ollama setups.
- [ ] ★★★★ **Idle Safety Preset Automation:** Optionally apply a low-power preset (e.g., 3W) after configurable inactivity duration.
- [ ] ★★★★ **Steam Input Layout Analysis:** Parse VDF controller configs and expose actionable control summaries to AI.
- [ ] ★★★★ **Advanced Thermal and Fan Curve Tuning:** Add manual fan-profile controls with safety guardrails and failsafes.
- [ ] ★★★★★ **Dedicated QAM Left-Rail BonsAI Shortcut (Research Spike):** Investigate whether Steam/Decky supports a stable plugin icon entry in the QAM left rail. Proceed only if there is a supported API path; otherwise no-go and keep this as non-implementation research.
- [ ] ★★★★★ **Global Screenshots and Vision:** Capture gamescope screenshots and send multimodal context to supported models, including strategy guidance from screenshot + game context and optional inline visual aids.
- [ ] ★★★★★ **Strategy Checklist Workflow (Chat-Scoped):** Let Strategy Guide responses include interactive action checklists, allow check/uncheck in current chat, and keep checklist progress synchronized across follow-up prompts (including inferred progress updates).
- [ ] ★★★★★ **Voice Command Input:** Capture mic audio and transcribe prompts through a local Whisper service.
- [ ] ★★★★★ **VAC Opponent Check (Phased):** Start with manual-assisted SteamID parsing and VAC lookup, then expand to automated lobby/opponent detection where reliable identity signals exist.
- [ ] ★★★★★★ **Deep Mod and Port Configuration Manager:** Provide broad game-specific mod/port detection and advisory workflows.
