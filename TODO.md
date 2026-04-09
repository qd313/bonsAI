# Decky Plugin bonsAI (Backend Ollama Node for Steam (A.I.)) - Roadmap

## Completed
- [x] Fix the `TypeError: Failed to fetch` cross-origin/network error between the Steam Deck UI and the local Windows PC Ollama server.
  - Root cause: frontend used `fetchNoCors` directly to Ollama; fixed by routing through Decky's Python backend via `call("ask_game_ai", ...)`.
  - Also removed stale `DeckySettingsSearch` plugin directory that shadowed `bonsAI` with `api_version: 0`.
- [x] TDP & Performance Optimization: Text-prompted API calls to adjust system power settings.
  - Ollama `/api/chat` endpoint with structured system prompt (game context, TDP/GPU ranges, JSON output format).
  - Backend parses AI response for `{"tdp_watts": N}` (fenced JSON, bare JSON, or natural language fallback).
  - Writes TDP to sysfs via `steamos-priv-write` with clean env (strips Decky's `LD_` overrides).
  - Frontend passes game context via `Router.MainRunningApp` and displays applied changes.
- [x] Suggested AI prompts: Preset `ButtonItem`s under the question field (`PRESET_PROMPTS` with categories). Three random presets on first load; after a response, three contextual follow-ups from `getContextualPresets`. Game name appended via `Router.MainRunningApp` when a game is running. Question input is a multi-line textarea; compact preset styling and prominent Ask button.
- [x] Pop-up disclaimer: One-time beta notice modal (`ConfirmModal` via `showModal`) on first plugin open. Warns that bonsAI is beta, AI recommendations should be verified, and hardware settings are modified at user's own risk. Includes GitHub issues link for bug reports/feature requests. Acceptance persisted in `localStorage`.

## Active Priorities
- [x] D-pad AI Response Scrolling: Long AI answers are split into focusable paragraph chunks so D-pad/arrow controls scroll through them. Works on Steam Deck D-pad, wireless controllers, and touchscreen.
- [ ] QAMP Reflection (Phase 1 - safe default): After prompt execution, show clear applied-state confirmation and a QAM reflection check/warning path when Steam's slider does not immediately mirror the applied hardware value.
  - Requirement: any BonsAI TDP/performance action must be verifiable by the user after execution.
  - Initial behavior: keep sysfs write path as source of truth and add explicit UI guidance for QAM re-open verification.

## Known Bugs
- [ ] Question text box overlay alignment: The 3-line question display overlay is slightly misaligned (extra left padding, touches right edge). Root cause: the overlay is a plain `<div>` sibling of the `TextField`, but Decky/Steam applies framework-specific margins to `TextField` internals that a plain div doesn't inherit. The keyboard and text wrapping work correctly; this is a cosmetic issue only.
- [ ] D-pad scroll doesn't fully reach the bottom of long AI responses. The last paragraph/chunk is partially cut off when navigating with D-pad, though touchscreen scrolling can reach it. Likely a QAM scroll viewport calculation issue where the panel doesn't scroll far enough to fully reveal the last focused element.

## Current Priorities Needing Work
- [ ] QAMP Reflection (Phase 2 - experimental opt-in): Attempt Steam profile sync only behind an explicit warning toggle.
  - Risks: undocumented internals, Steam update breakage, possible restart/reboot requirements, and profile corruption risk.
  - Candidate path: investigate fragile `config.vdf` / protobuf edits only as experimental and disabled by default.
- [ ] QAMP Verification Checklist:
  - [ ] Verify behavior with per-game profile on/off.
  - [ ] Verify behavior after closing and reopening the QAM Performance tab.
  - [ ] Verify behavior after Steam restart and full reboot.
  - [ ] Verify behavior when prompt includes GPU clock recommendations.
- [ ] Prompt testing & tuning: Systematically test AI prompts across different games and scenarios (see `PROMPT_TESTING.md`).

## Future Features (DO NOT IMPLEMENT YET)
**[Full detailed breakdown →](FUTURE_FEATURES.md)**

- [x] ★★ **Diagnostic & Latency Warnings:** Backend timer on `ask_game_ai` returns `elapsed_seconds`. Live warning appears after 20s of waiting; persistent warning shown post-response if >20s. `urlopen` timeout reduced to 120s with clear error message.
- [ ] ★★ **Configurable Latency Threshold:** Let the user adjust the 20-second latency warning threshold via a settings UI. Depends on Persist Settings feature.
- [ ] ★★ Persist last question and answer. If the user closes the QAM, when they reopen it'll be back where they left off. Save/restore via Decky settings API.
- [ ] ★★ Show the deck's current IP address in a separate tab, along with PC IP Address and other possible settings.
- [ ] ★★ Combine decky settings search box with the question box.
- [ ] ★★★ Multi-Language support. System prompt currently hardcodes English — should read the device's language settings and respond in the user's language.
- [ ] ★★★ Background prompt completion. If the user closes the QAM while it's still thinking, the prompt still finishes and the answer is ready when the user reopens the QAM.
- [ ] ★★★ Debugging & Log Analysis (Steam Proton logs). Find, parse, and feed Proton/game logs to AI for troubleshooting.
- [ ] ★★★★ Steam Input Analysis (Parsing .vdf configuration files). Parse Valve's VDF format, extract meaningful controller config data, feed to AI.
- [ ] ★★★★ Advanced Thermal & Fan Curve Tuning. Direct hardware fan curve control via sysfs, with safety guardrails.
- [ ] ★★★★★ Global Screenshots & Vision (Gamescope frame buffer). Capture screenshots from gamescope, send to multimodal AI for visual game analysis.
- [ ] ★★★★★ Voice Command Input (PipeWire to local PC Whisper server). Audio capture pipeline from PipeWire, stream to Whisper for speech-to-text prompts.
- [ ] ★★★★★★ Deep Mod & Port Configuration Manager. Game-specific mod detection, installation, and configuration — massive scope with per-game logic.