# Changelog

All notable changes to this project are documented in this file.

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [\[Unreleased\]](#unreleased)
- [\[0.6.0\] - 2026-10-23](#060---2026-10-23)
  - [What it does](#what-it-does)
  - [What is different from 0.4.9](#what-is-different-from-049)
  - [Known problems](#known-problems)
  - [Installing over 0.4.9](#installing-over-049)
  - [The full list](#the-full-list)
- [\[0.5.0\] - 2026-07-15](#050---2026-07-15)
  - [Added](#added)
  - [Changed](#changed)
- [\[0.4.9\] - 2026-07-08](#049---2026-07-08)
  - [Fixed](#fixed)
  - [Changed](#changed-1)
- [\[0.4.8\] - 2026-07-07](#048---2026-07-07)
  - [Added](#added-1)
  - [Fixed](#fixed-1)
  - [Changed](#changed-2)
- [\[0.4.7\] - 2026-07-07](#047---2026-07-07)
  - [Added](#added-2)
  - [Fixed](#fixed-2)
  - [Changed](#changed-3)
- [\[0.4.6\] - 2026-07-06](#046---2026-07-06)
  - [Fixed](#fixed-3)
  - [Changed](#changed-4)
- [\[0.4.5\] - 2026-07-06](#045---2026-07-06)
  - [Added](#added-3)
  - [Changed](#changed-5)
  - [Fixed](#fixed-4)
- [\[0.4.4\] - 2026-06-27](#044---2026-06-27)
  - [Added](#added-4)
  - [Changed](#changed-6)
  - [Fixed](#fixed-5)
- [\[0.4.3\] - 2026-06-26](#043---2026-06-26)
  - [Added](#added-5)
  - [Changed](#changed-7)
- [\[0.4.2\] - 2026-06-21](#042---2026-06-21)
  - [Added](#added-6)
  - [Changed](#changed-8)
- [\[0.4.1\] - 2026-06-15](#041---2026-06-15)
  - [Added](#added-7)
  - [Changed](#changed-9)
- [\[0.4.0\] - 2026-06-14](#040---2026-06-14)
  - [Added](#added-8)
  - [Changed](#changed-10)
  - [Fixed](#fixed-6)
- [\[0.3.0\] - 2026-04-30](#030---2026-04-30)
  - [Changed](#changed-11)
- [\[0.2.1\] - 2026-04-28](#021---2026-04-28)
  - [Changed](#changed-12)
  - [Docs](#docs)
- [\[Unreleased\] - 2026-04-19](#unreleased---2026-04-19)
  - [Added](#added-9)
  - [Changed](#changed-13)
  - [Fixed](#fixed-7)
  - [Docs](#docs-1)
<!-- /toc -->

## [Unreleased]

## [0.6.0] - 2026-10-23

bonsAI is an AI chat that lives in the Steam Deck's Quick Access Menu. It talks to Ollama, running on the Deck itself or on a PC on the same network, so you can ask about the game you are playing without leaving it. bonsAI is free and open source. It runs on your own hardware, your privacy stays yours. No paid API, no data centers.

### What it does

- **Ask about the game you're playing.** bonsAI knows which game is running, so you can ask about a boss, a level or a puzzle.
- **Notes from the game's wiki.** Answers can use notes from community wikis, 38 games so far, and it works offline.
- **The knowledge library.** The notes from game wikis are downloaded once, after you say yes, and then used offline.
- **Your own notes.** Tell bonsAI what matters to you and it remembers.
- **Spoilers stay hidden until you ask.** In Strategy mode, anything that looks like a spoiler is covered.
- **"Where are you at?"** Strategy can ask where you are in the game, then gives you a checklist of steps.
- **Ask about a screenshot.** Take a screenshot and ask what is on screen, like a puzzle, a menu or an error message.
- **Search your chats, settings and notes.** A Search tab to the left of Main finds things without any AI.
- **Close the menu, keep playing.** Close the menu while an answer is being written, and a popup tells you when it is ready.
- **Saved chats.** Keep up to ten chats and flip between them with the triggers.
- **Talk instead of typing.** Press the mic button and talk. Your speech becomes text on the Deck itself.
- **See how it answered.** Show details under any answer shows which model wrote it and which notes it used.
- **A first-run popup.** The first time you open bonsAI, it asks where the AI should run: on the Deck or on a PC.

### What is different from 0.4.9

- A new tab bar.
- Saved chats: ten of them, with "Sum up this chat".
- The Search tab.
- Your own notes.
- A thinking fold that shows how the AI worked toward an answer, and a decode effect while the answer is written.
- An Internet downloads permission. It is off on a fresh install, so nothing downloads without a yes from you.
- Gone: reading answers aloud.
- Gone: the Steam ban lookup.
- Gone: the recommended-models list refreshing itself from the internet.

### Known problems

- Rarely, the D-pad may stop moving in the panel. Close and reopen the Quick Access Menu. If that does not help, reload the plugin from Decky's settings. Restarting the Deck always clears it.
- On the Settings tab, after opening several sections and walking with the D-pad, the ring can skip a control (for example Terse mode). Closing and reopening the menu puts it right.
- Rarely, after you touch the screen, a faded second copy of the tab bar shows over the suggestion chips for a moment. The plugin hides it again by itself.
- The kids lock (Steam's parental controls turning bonsAI's high-impact permissions off) has not yet been checked on a child account.
- The first answer after installing the AI on the Deck takes a minute or two while the model loads. The panel says so.
- With a game running, the panel can update more slowly while an answer arrives, and very long answers can dip further. With the AI on a PC it stays smooth in our tests.
- Answers come from a small AI model on your Deck or PC. They can be wrong, can repeat wording from an earlier answer, and questions that aren't about a game can pick up game notes.
- Once, with a game running and the AI on the Deck itself, Steam's screen stopped responding a few minutes after an answer; restarting the Deck cleared it.

### Installing over 0.4.9

0.6.0 was not tested as an upgrade from 0.4.9. If anything looks off after installing over the old version, open Settings, press Clear all data, and set up again. Your settings from 0.4.9 are read and carried over where they still exist, but the Steam key is deleted, because the ban lookup it was for is gone.

### The full list

Every change since 0.4.9, session by session, is in [the detailed list](https://github.com/qd313/bonsAI/blob/main/docs/changelog-0.6.0-full.md).

To see the code changes themselves, open the [compare view from v0.4.9 to v0.6.0](https://github.com/qd313/bonsAI/compare/v0.4.9...v0.6.0).

## [0.5.0] - 2026-07-15

### Added
- **Token streaming — live markdown (experimental):** Developer **Token streaming** toggle now renders progressive markdown in one live bubble (R2 closed/tail split), spoiler-safe incomplete fences, code-fence wait chip (2s pulse/spinner), ~3× fence reveal burst, T3 settle→terminal handoff. Stop keeps partial reply.

### Changed
- **Strategy streaming:** Strategy asks with spoiler masking now stream with masked open spoilers (S1) instead of suppressing the preview entirely.

## [0.4.9] - 2026-07-08

### Fixed
- **Bazzite / gamescope QAM layout:** Tab strip crush, tab body overlapping LB/RB icons, and thin left strip on first open when scope collapsed to ~80px. `useQamPanelHeightGuard` locks scope to Steam QAM tab host height; `useTabStripBodyOffset` reserves strip space via `--bonsai-tab-strip-reserve` after carousel settles.

### Changed
- **Docs:** QAM Bazzite fix archived in `docs/archive/roadmap-completed.md`; **QAM-BAZZITE-01** regression row in `docs/testing.md`.

## [0.4.8] - 2026-07-07

### Added
- **Voice STT Tier 1 latency tuning:** Shorter decode interval, rolling window, poll cadence, and 4-thread whisper decode for faster interim text on Deck.
- **Voice maintainer guide:** `docs/voice-input-follow-up.md` (SIGILL triage, pinned podman digest, Tier 2 daemon backlog).

### Fixed
- **Voice STT on Deck:** CPU-safe whisper-cli compile (`GGML_NATIVE=OFF`) when prebuilt binary SIGILLs on Zen 2; inference smoke test on install.
- **Voice STT capture:** Gaming Mode mic RMS gate lowered; filler hallucinations still rejected at high RMS.
- **Voice transcript junk:** Strip `>>`, `[INAUDIBLE]`, and related whisper noise tags from decoded text.
- **Voice stop UX:** Skip final whisper pass on user stop; mic icon clears immediately instead of waiting on RPC.

### Changed
- **Pinned whisper.cpp image** to digest `sha256:c0b535ad…` (no floating `:main` prebuilt copy).
- **Docs:** `docs/testing.md` VOICE-06 latency row; `docs/troubleshooting.md` voice input updates; roadmap STT daemon follow-up.

## [0.4.7] - 2026-07-07

### Added
- **Ollama first-install UX:** **Install Ollama** above **Browse models**; ~5 minute first-install hint; **Install Ollama** label when loopback is not set up (vs **Update AI & models**).
- **Tier 2 pull confirm:** Browse & pull prompts to enable **Tier 2 (open-weight)** when queueing open-weight tags on Tier 1 policy.
- **Tiny-model thinking blurbs:** Pull confirm for `qwen2.5:1.5b` returns to **Ollama** tab after accept.

### Fixed
- **Voice engine install:** Copy whisper.cpp libs from `/app/build/bin/` (not `src/`) in podman image layout.
- **Clear all data + Ollama:** Teardown when `~/.ollama` or user-prefix install exists; stop stale listeners; gate loopback connection test on `~/.ollama/id_ed25519`; force fresh `ollama serve` when keys missing after clear.
- **Tier 2 policy survival:** Modal session snapshot patched after Tier 2 RPC save so remount does not revert policy label on Ollama tab.
- **Thinking blurbs navigation:** Post-modal survival restores **Ollama** tab; developer-tab guard waits for `settingsLoaded` (no spurious **Developer tab hidden** toast).
- **Settings focus rings:** Tighter outline on Install voice engine / Install Ollama action buttons.

### Changed
- **Preset chips:** Tighter fade-animation gap; more space before Ask text area.
- **Docs:** `docs/testing.md`, `docs/troubleshooting.md` rows for Ollama install, Tier 2 pull, clear-data, thinking blurbs.

## [0.4.6] - 2026-07-06

### Fixed
- **Clear all data — settings and permissions wipe:** In-app **Clear all data** no longer restores pre-clear settings after the beta disclaimer modal re-captured stale session survival. Backend wipe clears the full Decky settings directory (voice STT assets, feedback log), always removes `~/.bonsai/cache`, and stops voice install tasks. Uninstall vs clear documented in `docs/troubleshooting.md` §1b; manual wipe script `scripts/wipe-bonsai-data.sh`.

### Changed
- **Docs:** README uninstall note; `DATA-CLEAR-01` regression row in `docs/testing.md`.
## [0.4.5] - 2026-07-06

### Added
- **UI scale slider (Deck focus graph):** Settings **UI scale** manual snap uses shared `DeckFocusSlider` with explicit D-pad focus bridge (`SettingsTabUiScaleSection.tsx`, `deckSliderMath.ts`, `focus-graph-patterns.md` policy).
- **MainTab modularization:** `MainTabPresetRow`, `MainTabUnifiedAskBar`, `MainTabScreenshotBrowser`, `MainTabChatTranscript`; `index.tsx` shell hooks (`useBonsaiPluginShell`, `useScreenshotBrowser`, `useSteamSettingsSearch`).
- **Backend service extraction (Phase 3):** `ollama_ask_service.py`, `async_background_job.py`, `network_service.py`, `transparency_service.py`, `ask_local_commands.py`; Ollama routing moved to `ollama_routing.py` / `ollama_connectivity.py`; `main.py` slimmed ~500 LOC.

### Changed
- **Thinking blurbs:** Always-sarcastic witty/deadpan copy via `composeThinkingBlurb.ts`; stream tag and tiny-model prompt alignment (`bonsai_stream_tags.py`, `thinking_tiny_model_service.py`).
- **Stylesheet split:** `bonsaiScopeStylesheet.ts` composes `src/styles/sections/*.ts` for maintainability.
- **Settings schema:** `bonsaiSettingsSchema.ts` + `bonsaiSettingsNormalizers.ts` + `settingsPayload.ts` centralize persistence shape.

### Fixed
- **Seven critical regressions (post-refactor):** Settings save RMW lock; abort busy gate (Stop releases Ask); voice PCM buffer lock; intent pack corrupt-file preservation; Pillow decode containment; strategy checklist stale-ref + game-switch hydration; intent-pack and strategy-checklist store write locks. Regression tests: `test_background_abort_busy`, `test_settings_save_lock`, `test_intent_pack_store_lock`, `test_strategy_checklist_store_lock`.
- **Connection / Ollama keep-alive sliders:** Migrated to `DeckFocusSlider` with parent focus-graph wiring.

## [0.4.4] - 2026-06-27

### Added
- **Offline intent packs:** Bundled offline Q&A for common Deck setup questions (`data/intent-packs/deck-basics.json`); Settings → **Offline help packs** with install/update and search integration (`intent_pack_service.py`, `SettingsTabIntentPacksSection.tsx`, `useIntentPacks.ts`).
- **Strategy checklist (Strategy Guide follow-ups):** Model emits `bonsai-strategy-checklist` JSON; interactive `ToggleField` rows in `StrategyChecklistPanel.tsx`; progress synced into subsequent Strategy asks and persisted per game in `strategy_checklist_session.json` (`strategy_checklist_session_service.py`, `strategy_guide_parse.py`).
- **Take screenshot (attach menu):** Capture the running game screen into the Ask attachment flow from the attach paperclip menu; expanded `screenshot_media.py` with game-focus capture paths and tests.

### Changed
- **Ask mode styling:** Refined Speed / Strategy / Expert chip fills, borders, and asking-state glow on the unified input bar (`askMode.ts`, `bonsaiScopeStylesheet.ts`, `MainTab.tsx`).
- **Thinking blurb polish:** Mid-Ask phase lines weave question snippet + game context; character voice variants preserved; redundant background `starting` publish removed (`bonsai_stream_tags.py`, `game_ai_request.py`, `main.py`).
- **README and About tab:** End-user README refresh with hero image, clearer quick start and feature overview; About tab quick-start wording and spacing (`README.md`, `AboutTab.tsx`, `pluginQuickStartInstructions.tsx`).

### Fixed
- **Screenshot attach UX:** Attach menu and modal focus/layout fixes for screenshot capture on Deck (`MainTabAttachMenuPopover.tsx`, `BonsaiModalScope.tsx`, `bonsaiScopeStylesheet.ts`).

## [0.4.3] - 2026-06-26

### Added
- **Ask mode visual indicators:** Speed / Strategy / Expert mode chip shows a colored fill and border (green / yellow / red) on the unified Ask bar, similar to Cursor’s mode affordance. `ASK_MODE_ACCENT` / `ASK_MODE_FILL` in [`src/data/askMode.ts`](src/data/askMode.ts); paint via [`src/styles/bonsaiScopeStylesheet.ts`](src/styles/bonsaiScopeStylesheet.ts) (beats Decky transparency flattening on `.bonsai-askbar-target`).
- **Thinking outline on Ask input:** While an Ask is in progress, the unified input host gets a mode-colored border glow with a breathing animation (`bonsai-unified-input--asking`, `bonsai-ask-input-breathe`); static accent border when `prefers-reduced-motion: reduce`. [`src/components/MainTab.tsx`](src/components/MainTab.tsx).

### Changed
- **Preset chip refresh:** [`src/data/presets.ts`](src/data/presets.ts) — LAN/Ollama connection chips, Expert/voice setup prompts, Steam Input advice chip; graduated strategy/VAC/essentials chips off `[beta]`; removed fan-noise/long-session thermal and redundant GPU/battery dupes; rephrased model-policy tier chip.
- **Ask mode id rename (soft migration):** Persisted/RPC `ask_mode` **`deep`** renamed **`expert`** to match UI label **Expert**. Legacy `"deep"` in settings coerces to `"expert"` on load (`normalizeAskMode`, `sanitize_ask_mode`).

## [0.4.2] - 2026-06-21

### Added
- **bonsai-mcp knowledge server:** In-repo IDE-agnostic MCP (`packages/bonsai-mcp/`) for policies, workflows, specialist personas, doc search, and generated RPC/architecture index. Cursor bootstrap via `.cursor/mcp.json` and `sessionStart` hook. CI: `validate-mcp.yml`.

### Changed
- **Documentation consolidation:** Active docs are now `README.md`, `docs/development.md`, `docs/troubleshooting.md`, `docs/roadmap.md`, and `docs/testing.md` (merged PR gates, device QA runbook, prompt testing, and failures). Historical research, plans, sweeps, and the full completed-feature checklist moved to `workshop:archive/`. Removed stale root `TODO.md`.
- **Agent/bootstrap lean-out:** `.cursorrules`, subagent stubs, and skills now point at MCP; canonical knowledge in `packages/bonsai-mcp/knowledge/`.

## [0.4.1] - 2026-06-15

### Added
- **Tier 2 one-model multimodal preset:** Connection → **Install Tier 2 one-model multimodal** pulls `gemma4:e2b-it-qat` (falls back to `gemma4:e2b`) with open-weight license disclosure and auto Tier 2 policy.
- **Clear all data — local Ollama teardown:** When **Ollama on this Deck** was enabled, clearing plugin data removes downloaded models, user-prefix Ollama binary, `~/.ollama`, and `~/.bonsai/cache`.
- **Living Pull Models catalog:** Bundled `pullModelCatalog.ts` merged with remote overlay on catalog refresh; disk cache under `~/.bonsai/cache` (`pull_model_catalog_service.py`, `PullModelsModal.tsx`).

### Changed
- **Deck essentials model simplification:** Tier 1 default is one pull (`qwen2.5vl:3b`); shortened Ask routing chains; Pull Models defaults to **Essentials only**; removed 11-model “full Tier-1” and dual-model starter presets.
- **Docs/scripts:** README and `scripts/setup-ollama.sh` recommend `qwen2.5vl:3b`; troubleshooting covers essentials tags and clear-data Ollama purge.

## [0.4.0] - 2026-06-14

### Added
- **Ollama tab + models hub:** Dedicated **Ollama** tab (between Main and Settings) for where AI runs, connection test, timeouts/keep-alive, **Find LAN** (mDNS), saved LAN hosts, and **Models & routing** hub (policy tiers, browse/pull, advanced routing). `OllamaTab.tsx`, `OllamaWhereAiRunsSection.tsx`, `OllamaModelsHubModal.tsx`, `ModelPolicyTierPanel.tsx`.
- **Ask thread accordion:** Main tab shows one collapsible row per turn; expand to read the full answer inline (`expandedTurnKey`, `BonsaiChatTurnRow.tsx`, `useBonsaiAskOrchestration.ts`).
- **Thinking status during Ask:** Deterministic phase lines via `format_thinking_phase` plus optional model `<bonsai-status>` while pending (`bonsai_stream_tags.py`, `game_ai_request.py`, `MainTab.tsx`).
- **Retry same prompt:** **Retry same prompt** on completed replies re-runs the last sanitized Ask without retyping (`onRetryLastResponse`, `BonsaiChatReplyActions.tsx`).
- **Per-turn reply feedback:** Thumbs up/down under AI replies (`save_ask_feedback` RPC, `BonsaiChatReplyActions.tsx`).
- **Named Ollama hosts:** Save and quick-switch up to four labeled LAN Ollama base URLs on the Ollama tab (`named_ollama_hosts`, `OllamaWhereAiRunsSection.tsx`).
- **Voice input (local STT):** Mic button on the unified Ask bar records via backend PipeWire/Pulse/ALSA capture and streams interim whisper.cpp transcription into the text field. **Permissions → Voice input (microphone)** (default off). **Settings → Voice input** for `tiny.en` / `base.en` model download. RPCs: `start_voice_transcription`, `stop_voice_transcription`, `get_voice_transcription_status`, `install_voice_engine`. `voice_transcription_service.py`, `useVoiceTranscription.ts`, `VoiceInputSettingsSection.tsx`.
- **LAN Ollama discovery (mDNS):** **Ollama** tab **Find LAN** — user-triggered browse for `_ollama._tcp` only (no subnet scan). `ollama_mdns_discovery_service.py`, `discover_mdns_ollama_hosts` RPC, `OllamaWhereAiRunsSection.tsx`.
- **Maintainer automation:** Vitest headless Decky harness (`src/test-harness/`, `vitest.config.ts`); `scripts/watch-deploy.sh` / `.ps1`; prepare-only `pnpm run version:bump`; Cursor skill `.cursor/skills/bonsai-deck-dev-loop/`.
- **Token streaming (experimental, Developer tab):** When **Token streaming (experimental)** is enabled (`bonsai_token_streaming_enabled`), Main shows a single growing preview chunk while Ollama NDJSON deltas arrive (`partial_response` on background status poll at 350ms); `useSmoothStreamReveal` RAF smoothing. Terminal replies still run strategy branches, TDP apply, model-policy disclosure, and normal D-pad chunk splitting. `main.py`, `ollama_service.py`, `useBonsaiAskOrchestration.ts`, `MainTab.tsx`, `DeveloperTab.tsx`.
- **Developer tab (opt-in):** Settings → Data → **Show Developer tab** (`show_developer_tab`; migrates legacy `show_debug_tab`). Merges former Debug diagnostics with advanced logging, connection tuning, Steam Web API key, and model-policy advanced controls. `DeveloperTab.tsx`, `index.tsx`, `settings_service.py`, `settingsAndResponse.ts`.

### Changed
- **Settings UX cleanup:** Plain-language labels on Settings and Permissions; technical options moved to Developer tab; simplified connection test output and AI model choice on Permissions. `SettingsTab.tsx`, `PermissionsTab.tsx`, `PermissionsTabModelPolicyPanel.tsx`, `modelPolicy.ts`, `aiCharacterAccentIntensity.ts`.
- **Desktop logs folder rename:** All Desktop writes (chat auto-save, Ask traces, manual notes, app logs) now use `~/Desktop/bonsAI_logs/` instead of `~/Desktop/BonsAI_notes/`. Existing folders are not auto-migrated — rename manually if you already have notes there.
- **Pull models:** Filters Speed / Strategy / Expert / Vision (coding removed); coverage-based suggestions; install bundles dropdown; default slow warning **45s** and hard timeout **3 min** when custom timeouts are off.

### Fixed
- **Token stream isolation:** Background Ask partial streaming binds only to the active background `request_id`; foreground asks no longer corrupt shared partial snapshots (`main.py`, `game_ai_request.py`).
- **Settings persist safety:** Debounced `save_settings` gated on successful hydrate; atomic `settings.json` writes; epoch cancel before clear/sync (`usePluginSettings.ts`, `settings_service.py`).
- **Ask input survival:** `no_persist` mode no longer clears the Ask field on every Decky remount after modal close (`unifiedInputPersistenceMode.ts`, `index.tsx`).
- **Local-only Ask commands:** Sanitizer keywords, shortcut setup, and vac-check work without a configured Ollama PC IP (`localOnlyAskCommands.ts`, `useBonsaiAskOrchestration.ts`).
- **Ollama stream integrity:** NDJSON streams that end without Ollama's `done: true` marker are rejected instead of returning truncated success (`ollama_service.py`).
- **Local toggle no longer overwrites LAN PC IP:** Ask no longer persists `127.0.0.1:11434` to `bonsai:pc-ip` localStorage while **Ollama on this Deck** is enabled, so toggling local off restores the user's LAN host (`src/utils/persistOllamaIp.ts`, `src/index.tsx`).
- **Deck UI polish (QAM):** Avatar containment in unified input; 1px Ask spacing; full-bleed settings/pull picker; clearer no-game hint (replaces “Limited context” chip); pull picker D-pad on filter toggles; logging level persists after reload; merged screenshot+log permission; PC IP hidden when local Ollama is on; **Clear all data** clears modal session survival; Proton attach toggle removed from Developer.

## [0.3.0] - 2026-04-30

### Changed
- Refactor / contributor-UX pass: deduplicated synchronous immediate background Ask paths in `main.py`; split `Content` orchestration into focused hooks under `src/hooks/` (and related modules); moved prompt/policy helpers to `py_modules/backend/services/ollama_prompts.py` with HTTP/streaming remaining in `ollama_service.py` (stable re-exports); aligned capability grandfather tests with `steam_web_api` privacy default; expanded tiered code comments on RPC shapes, capability gates, and Decky UI assumptions.

## [0.2.1] - 2026-04-28

### Changed
- **Local Ollama routing default off:** Omitting `ollama_local_on_deck` in `settings.json` now normalizes and sanitizes to **`false`** (`settingsAndResponse.ts`, `settings_service.py`); LAN PC IP applies until the user opts in. Existing explicit `true`/`false` preserved.
- **Local-runtime (beta) modal on enable:** `bonsAI:local-runtime-beta-dismissed-v1` **`ConfirmModal`** runs when the user turns **Ollama on Deck** **on** (tracked `false→true` transition), after global disclaimer and settings load — not solely because the key was defaulted on (`src/index.tsx`).
- **Connection Test — loopback wake-up:** Failed probe to **`127.0.0.1:11434` / localhost** attempts `systemctl --user` start/restart and **`ollama serve`** (reuse `recover_loopback_ollama_listening` in `py_modules/backend/services/local_ollama_setup_service.py`), then retries **once**. Response may include **`recovery_attempted`**; **`SettingsTab`** uses a longer Decky RPC deadline for localhost tests (~52s padded).
- **Beta disclaimers + quick-start persistence** (prior drop): LAN speed + VRAM/crash wording on global banner; **`bonsai:plugin-help-dismissed`** chip; changelog items from **[Unreleased] - 2026-04-28** drafts consolidated here where still accurate.

### Docs
- **`docs/troubleshooting.md`:** localhost Connection Test wake-up note; Clear all behavior for stored flags.
- **`docs/roadmap.md`:** Completed bullet updated for routing default / modal UX.


## [Unreleased] - 2026-04-19

### Added
- **Running-game character suggestions (AI picker):** `CharacterPickerModal` shows a **Playing:** strip with up to three catalog presets when Steam reports a running game (`Router.MainRunningApp`); matching uses `src/utils/runningGameCharacterSuggestions.ts` (AppID map, normalized title hints, TF2 merge). Async resolve after first paint with a delayed spinner; D-pad links Random, suggestions, catalog column 0, and custom character field.
- **Mode selector (main screen):** Persisted `ask_mode` (`speed` / `strategy` / `deep`) with UI labels Speed, Strategy, Expert; outline button (green / bronze / gold) left of mic/stop opens an anchored popover menu (no layout reflow); D-pad order text → mode → mic/stop. Backend `refactor_helpers.select_ollama_models` maps each mode to ordered Ollama fallbacks; `start_background_game_ai` sends `ask_mode`. `src/data/askMode.ts`, `AskModeMenuPopover.tsx`, `MainTab.tsx`, `index.tsx`, `settingsAndResponse.ts`, `settings_service.py`, `main.py`.
- **Character accent intensity:** When **AI characters** is on, Settings includes **Accent intensity** (four levels: subtle / balanced / heavy / unleashed, default balanced) with short Doom-difficulty–style chip labels. Persisted `ai_character_accent_intensity`; `backend/services/ai_character_service.py` modulates roleplay dialect strength for preset, random, and custom character paths; TDP/JSON policy unchanged. `src/data/aiCharacterAccentIntensity.ts`, `src/index.tsx`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Input handling transparency:** Main tab **Input handling (last Ask)** shows raw Ask text, sanitizer output, system/user messages sent to Ollama, model id, and responses; **Run original in Ask** and **Copy JSON**. RPC `get_input_transparency`; optional Settings **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`) appends traces to `~/Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md` when filesystem writes are allowed. `main.py`, `backend/services/desktop_note_service.py`, `src/components/MainTab.tsx`, `src/utils/inputTransparency.ts`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Input sanitizer lane (hybrid):** Default-on deterministic Ask sanitization before Ollama (NUL/control cleanup, length cap, empty/junk block). No Settings-tab controls; disable/re-enable with exact Ask-only phrases `bonsai:disable-sanitize` and `bonsai:enable-sanitize` (persisted `input_sanitizer_user_disabled`, confirmation without model call). `backend/services/input_sanitizer_service.py`, `main.py`, `src/index.tsx`, `src/data/inputSanitizerCommands.ts`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Preset chip fade opt-out:** Settings **Preset chip fade animation** `ToggleField` (persisted `preset_chip_fade_animation_enabled`, default on). When off, main-tab suggestion chips stay fully visible and swap text without crossfades while keeping the same rotation window and post-Ask re-seed. `PresetAnimatedChips.tsx`, `MainTab.tsx`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Character Voice Roleplay Mode (Opt-In):** Settings **AI character** toggle (default off); fullscreen `CharacterPickerModal` with per–work-title sections, **Random** toggle, custom character `TextField`, OK/Cancel; unique 8×8-pixel SVG emoticons (`characterPlaceholderEmoticonGrids.ts`, `CharacterRoleplayEmoticon.tsx`); main-tab glass avatar opens picker; persisted `ai_character_*` in `settings.json`; backend `backend/services/ai_character_service.py` appends roleplay instructions to the Ollama system prompt (`main.py`). Catalog: `src/data/characterCatalog.ts` (keep in sync with Python allowlist).
- **Preset carousel (Phase 1):** Main tab shows three suggestion chips with staggered fade in/out (2s each) and hold time scaled to prompt length (doubled dwell vs earlier tuning); chips rotate independently and re-seed when follow-up presets refresh. `PresetAnimatedChips.tsx`, `holdMsForPresetText` / `getRandomPresetExcluding` in `src/data/presets.ts`, styles in `src/index.tsx`. Manual next/previous arrow controls deferred.
- **Capability Permission Center:** Permissions tab (`LockIcon`, `TAB_TITLE_ICON_PX_PERMISSIONS`) with persisted `capabilities` in `settings.json` (filesystem write, hardware control, media library access, external/Steam navigation). New installs default all OFF; legacy settings files without a `capabilities` object are grandfathered ON until the user saves. Backend enforcement in `main.py` (`backend/services/capabilities.py`); UI in `PermissionsTab.tsx`, `AboutTab.tsx`, `MainTab.tsx`, `src/index.tsx`.
- **Desktop daily chat auto-save (V2):** Settings tab toggle `desktop_debug_note_auto_save` (default off). When on and filesystem writes are allowed, each Ask and each AI response append to `~/Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md` (UTC day); Ask entries list attached screenshot paths. RPC `append_desktop_chat_event`, `backend/services/desktop_note_service.py`, `src/index.tsx`.
- **Desktop Mode Debug Note Save (V1):** After a successful ask, **Save to Desktop note…** opens a consent dialog and writes append-only markdown to `~/Desktop/BonsAI_notes/<name>.md` (UTC timestamps, question + answer). Backend: `append_desktop_debug_note`, `backend/services/desktop_note_service.py`. UI: `DesktopNoteSaveModal`, `MainTab`, `src/index.tsx`.
- **Search Surface Glass Pass:** Unified search `TextField` and ask bar use a shared glass surface (`rgba` ~25% fill, `backdrop-filter` blur, light border); attach/mic/stop/clear icons render at 50% opacity; input height follows wrapped text (min/max clamp); AI response chunks use the same glass family instead of near-black fills (`src/index.tsx`).
- **Built on Ollama** About tab link to upstream `https://github.com/ollama/ollama` (`OLLAMA_UPSTREAM_REPO_URL`, `AboutTab`).
- Phase 1 experimental **Steam Input jump** (Debug tab): per-game `steam://controllerconfig/{appId}` via `SteamClient.URL.ExecuteSteamURL`, `Navigation.CloseSideMenus`, and a versioned lexicon in `src/data/steam-input-lexicon.ts` with CEF route-discovery and update-discipline notes in `workshop:archive/research/steam-input-research.md`.
- Background prompt completion flow so requests can finish while QAM is closed and recover state on reopen (marked complete in `docs/roadmap.md`; verification matrix in `docs/testing.md` under `Background Prompt Completion (V1)`).
- Local/dev workflow support and deployment-oriented setup scripting for Linux and Bazzite-focused environments.
- Expanded prompt test coverage and strategy-mode ideation notes for upcoming tuning work.
- Added backend service modules under `backend/services/` and extracted frontend tab/data modules for milestone refactor decomposition.
- Added baseline service/data tests: `tests/test_settings_service.py`, `tests/test_ollama_service.py`, `src/data/presets.test.ts`, and `src/data/steam-input-lexicon.test.ts`.

### Changed
- **Preset chip refresh (advice-first):** [src/data/presets.ts](src/data/presets.ts) `PRESET_PROMPTS` rephrased so battery / TDP / performance chips ask questions (e.g. "Optimize for battery life" → "How can I optimize for battery life?"), letting bonsAI advise first and apply only when the user asks during chat. Action wording kept only for strong shipped surfaces (Steam Input jump → `Open Steam Input config`; vision V1 → `Describe what you see in this screenshot`). Dropped `Reduce fan noise` and `Best thermal settings for long play sessions` because the fan's job is cooling and bonsAI cannot meaningfully change Deck thermals without trading performance. Added bonsAI-feature chips: `Diagnose a slow Ollama response`, `What does my model policy tier mean?`, `Which Ollama model fits my Deck setup?`, `Why is my Deck running hot?`. Eight `beta: true` chips preview roadmap items: quiet fan profile (QAMP), Proton log analysis, Steam Input layout analysis, `Which Ollama models do I need for bonsAI?`, `How do I use strategy mode?`, spoiler-safe tips, `VAC bans on opponents?`, and restored `Suggest mods or tweaks for this game`. Maintainer approved 2026-04-24 as freeze-week-compatible content tuning; no logic, schema, RPC, or runtime change. See [workshop:archive/red-blue-fight-2026-04-21.md](../bonsAI-workshop/archive/red-blue-fight-2026-04-21.md) § _Content tuning approvals_.
- **AI character avatars (higher resolution):** Roleplay avatars render from a unified 16×16 cell SVG grid: each preset’s 8×8 art is pixel-doubled (`expand8To16`), with hand-tuned 16×16 overrides for the full catalog cast (GTA V leads, TF2 mercs + graphic-novel Announcer bonsai tree, Random/Custom dice and custom tile, Portal/BG3/Fallout/Zelda/RDR/Cyberpunk/Hades/Other busts). `src/components/characterPlaceholderEmoticonGrids.ts`, `src/components/CharacterRoleplayEmoticon.tsx`.
- **Settings (Connection):** Hard timeout uses one Steam `SliderField` in `ConnectionTimeoutSlider.tsx` (10s steps, max 300s), while soft warning remains visible as a readout and is auto-reconciled to stay before timeout. Ordering is enforced when loading settings via `reconcileLatencyWarningAndTimeout` in `src/utils/settingsAndResponse.ts` and matching logic in `backend/services/settings_service.py`.
- **Refactor (unified input / main tab):** `UNIFIED_*` / Ask label color and `splitResponseIntoChunks` live under `src/features/unified-input/constants.ts` and `src/utils/splitResponseIntoChunks.ts`; Deck layout measurement and refs are in `useUnifiedInputSurface`; the main tab body is `src/components/MainTab.tsx` (behavior parity; `src/index.tsx` composes hooks + tabs).
- **Tabs:** Main/settings/debug tab titles use 4× larger icons (`TAB_TITLE_ICON_PX_*`); plugin store / loader entry icon remains `BonsaiSvgIcon` in `definePlugin`. ResizeObserver and unified-input remeasure run only on the **main** tab to cut tab-switch jitter; tab strip `transition-property: none` reduces twitchy animations (`src/index.tsx`).
- **Unified search / Ask:** Ask full-bleed width uses the same `calc(100% + 24px)` rule as other `bonsai-full-bleed-row` rows (no `--bonsai-ask-sync-width` from the unified host). Textarea/input use stable `margin-top: 0` so crossing wrap no longer toggles margin and throws off the caret on line 2+ (`src/index.tsx`).
- **Ask row:** `bonsai-ask-bleed-wrap` + `PanelSectionRow` `overflow: visible` / `align-self: stretch` so full-bleed negative margins are not clipped narrower than the search field (`src/index.tsx`).
- **Search layout (expand + bleed):** Text-body height adds `UNIFIED_INPUT_EXPAND_AHEAD_PX` (one line at `UNIFIED_TEXT_FONT_PX` × `UNIFIED_TEXT_LINE_HEIGHT`) on top of remeasure padding; **global** `.bonsai-scope .bonsai-full-bleed-row` restores `calc(100% + 24px)` for every tagged row so Ask matches unified input even when `PanelSectionRow` DOM nesting differs (`src/index.tsx`).
- **Main tab fixes:** Bottom attach/mic strip overrides `flex-direction: row` so icons are not stacked by the TextField column `Panel.Focusable` rule; Ask bar gets `min-width` on full-bleed rows and full-width `DialogButton`; zero top inset/padding and hiding empty Decky field label nodes improve caret alignment (`src/index.tsx`).
- **Settings tab icon:** `GearIcon` now uses `react-icons/fi` `FiSettings` (stroke-based, readable at 26px on Deck CEF) instead of the custom filled gear (`src/components/icons.tsx`).
- **Unified search caret vs overlay:** `UNIFIED_TEXT_FONT_PX` / `UNIFIED_TEXT_LINE_HEIGHT` now drive measure div, overlay, `TextField`, and scoped textarea CSS so the caret lines up with painted text; `Panel.Focusable` uses column flex with `justify-content: flex-start` to avoid vertically centering short text in a tall field (`src/index.tsx`).
- **Search Surface Glass Pass:** Typed overlay uses asymmetric insets (top 1px, L/R/B 0) + tighter strip height; bottom attach/mic in one horizontal `Focusable` (`flex-wrap: nowrap`); Clear sits inside the Ask glass (Ask flex-grow to near full width); Ask label `#a8b4c4` with scoped `!important` so SteamOS/Decky `DialogButton` theming does not force accent/yellow; full-bleed ask row; `TextField`/`textarea` padding trimmed; subtler glass borders; removed temporary debug ingest `fetch` instrumentation from `remeasureUnifiedInputSurface` / `reportGlassStyleProbe` (kept `window.__bonsaiGlassDebug` snapshot).
- **Search Surface Glass Pass (margins):** Icon strip 24px; remeasure pad 7px; overlay/ measure `line-height` 1.2; zeroed `Panel.Focusable` margins and `text-indent`; logical padding resets on transparent input; overlay `margin`/`padding` pinned to 0; slightly smaller corner hit targets (20px) and glyphs.
- **Search Surface Glass Pass (height + Ask):** Default empty text-body min height +1 line (`UNIFIED_TEXT_BODY_MIN_PX` 42); Clear control absolutely positioned on the Ask bar so the Ask `DialogButton` spans full bleed width (with right padding when Clear is visible).
- Reorganized documentation under `docs/` (`development.md`, `troubleshooting.md`, `prompt-testing.md`, `roadmap.md`, `refactor-specialist-sweep.md`) and moved dev automation scripts under `scripts/` with repository-root resolution for `.env`, builds, and Decky CLI paths.
- Refined frontend request state handling and response UX behavior in `src/index.tsx`.
- Updated backend request lifecycle and orchestration paths in `main.py` for more resilient local AI interactions.
- Updated roadmap and prioritization details in `docs/roadmap.md` (consolidates former root `roadmap.md` and `FUTURE_FEATURES.md` planning), including moving completed items into `Implemented Baseline` where applicable.
- `main.py` now delegates settings/TDP/Ollama internals to service-layer helpers to keep plugin RPC methods focused on orchestration.
- `src/index.tsx` now delegates debug/about tab rendering and prompt preset logic to extracted modules.

### Fixed
- **Settings (Connection):** Soft warning remains visible as a dedicated readout line under the single hard-timeout slider so users can confirm both thresholds on Deck CEF (`src/index.tsx`, `ConnectionTimeoutSlider.tsx`).
- **Unified search caret vs wrapped text:** Hidden measure + text overlay now use the same horizontal origin and width as the real `textarea`/`input` (from layout rects + `clientWidth`), so word-wrap matches the native field on line 2+ instead of using the full glass width (`src/index.tsx`).
- **Unified search measure node:** Removed React `left`/`width`/`top` props from the hidden measure div so they are not reset to `width: 0` every render (which broke `scrollHeight` and height sync). Vertical alignment uses `--bonsai-unified-field-top` from the field’s bounding rect; last remeasure snapshot is exposed as `window.__bonsaiLastRemeasure` for on-device debugging (`src/index.tsx`).
- **Unified search caret baseline:** Disabled the extra painted text overlay and render the native `TextField` text directly (non-transparent), eliminating Deck-specific dual-layer baseline drift where the blinking caret sat ~1-1.5 lines below visible text (`src/index.tsx`).
- **Ask bar width parity:** Ask row width now keys off `--bonsai-search-host-width` captured from the live unified host measurement, so Ask and search bars stay the same rendered width on-device (`src/index.tsx`).
- Synced `experimental` with latest remote updates before consolidation to avoid drift and preserve branch history.
- Resolved roadmap documentation integration conflict during sync so both upstream and local planning updates are retained in `docs/roadmap.md`.

### Docs
- Documented **Input handling transparency** (main tab + verbose Desktop trace) in `README.md`, `docs/troubleshooting.md`, `docs/roadmap.md`, `docs/development.md`, and this changelog.
- Documented **Input sanitizer lane** in `README.md`, `docs/testing.md`, `docs/troubleshooting.md`, `docs/roadmap.md`, and `docs/development.md` (field names).
- Documented **Character Voice Roleplay Mode** in `docs/roadmap.md`, `workshop:archive/research/voice-character-catalog.md`, `docs/testing.md`, `docs/troubleshooting.md`, and this changelog.
- Documented single hard-timeout slider + visible soft-warning readout in `docs/troubleshooting.md` and this changelog.
- Documented **Preset carousel (Phase 1)** in `docs/roadmap.md`, `docs/testing.md`, `docs/development.md`, and this changelog.

- Documented **Desktop daily chat auto-save (V2)** in `docs/roadmap.md`, `docs/troubleshooting.md`, and this changelog.
- Documented **Capability Permission Center** in `docs/roadmap.md` (Completed + Implemented Baseline + candidate status), `docs/troubleshooting.md` (permissions section), and `docs/foss-advocate-report.md`.
- Marked **Search Surface Glass Pass** complete in `docs/roadmap.md` (Completed + Implemented Baseline); noted glass tokens and layout in `docs/development.md`.
- Marked **Built on Ollama Link (About Tab)** complete in `docs/roadmap.md` (Completed + Implemented Baseline).
- Marked **Steam Input Jump Phase 1** complete in `docs/roadmap.md` and noted Phase 2+ (search + full catalog) as deferred; aligned `workshop:archive/research/steam-input-research.md` and `docs/testing.md` status language.
- Expanded `workshop:archive/research/steam-input-research.md` with CEF debugging steps, History API console snippet, verified-route log template, and Steam client update smoke-test discipline.
- Expanded troubleshooting guidance in `docs/troubleshooting.md`.
- Updated prompt testing notes in `docs/testing.md`.
- Refined project rules and planning notes in `.cursorrules`.

- **Documentation refresh:** README recommended multimodal models (`llava` default, library link); expanded developer doc map table; network troubleshooting TODOs replaced with numbered steps (Ollama listen address, `ollama pull`); roadmap cross-links to troubleshooting and prompt-testing; `docs/development.md` adds `characterUiAccent`, ask-mode pointers, and release doc checklist; `workshop:archive/refactor/refactor-specialist-sweep.md` historical banner; `docs/security-audit-report.md` line refs and Open status re-verified (2026-04-19); `docs/foss-advocate-report.md` dependency and license snapshot.

