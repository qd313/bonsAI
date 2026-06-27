> **Archived** — see [archive README](README.md). Active summary: [roadmap.md](../roadmap.md#completed)

# bonsAI roadmap — completed features (full detail)

## Completed

Headings group related work. Star counts match the historical list.

### Release and distribution

- ★★ **Decky plugin release `.zip` (CI) + clean install proof:** [`.github/workflows/build-plugin-zip.yml`](../.github/workflows/build-plugin-zip.yml) builds the shippable zip via Decky CLI on **`v*` tags** and **workflow_dispatch**; [`scripts/verify-decky-plugin-zip.sh`](../scripts/verify-decky-plugin-zip.sh) enforces the same file layout as deploy (`main.py`, `refactor_helpers.py`, `py_modules/backend/services/`, `dist/`). Maintainer flow and versioning: [development.md](development.md) → **Release (plugin zip)**. **QA log template:** [testing.md](testing.md#regression-gates) §5 — run README-only path from **no Ollama yet**, then record Pass/Partial/Fail (human gate).
- ★★ **README — end-user install and usage:** [README.md](../README.md) gives **plain, step-by-step** guidance for **(1)** installing **Ollama** (Deck vs PC, official download or repo helper scripts; firewall/`OLLAMA_HOST` in [troubleshooting.md](troubleshooting.md)), **(2)** obtaining and installing the bonsAI plugin (**`.zip`** from e.g. GitHub Release, load in Decky Loader), **(3)** **using the app** (Decky/QAM, Ollama host/base URL in Settings, pull a model, Ask, optional permissions). Troubleshooting deep-dives remain in `docs/`, not the main path.

### First-run and prompts

- ★ **Beta Disclaimer Modal:** Show one-time experimental-software warning with risk acknowledgment and bug-report link.
- ★ **Suggested AI Prompts:** Show curated prompt presets, randomize initial suggestions, and generate contextual follow-ups after responses.
- ★ **Preset chip refresh (advice-first, 2026-04-24):** [`src/data/presets.ts`](../src/data/presets.ts) `PRESET_PROMPTS` rephrased to advice-first questions; action wording only for strong shipped surfaces; `beta: true` chips preview roadmap items honestly. Content tuning only — no schema, RPC, or carousel logic change. See [CHANGELOG.md](../CHANGELOG.md) § Changed.
- ★ **Preset chip expansion (2026-06-26):** Incremental strings for LAN/Ollama, Expert/voice, Steam Input; graduated stale beta labels; see [CHANGELOG.md](../CHANGELOG.md) § Unreleased.
- ★★ **Prompt-testing MVP:** [testing.md](testing.md#device-qa-runbook) (tiered run order) + [testing.md](testing.md) (shipped-feature coverage, scenarios, Test Results) + optional frozen preset carousel (`TEMP_PRESET_CAROUSEL_FROZEN` / `TEMP_CAROUSEL_FROZEN_TEXTS` in `src/data/presets.ts`). **Status:** Refactored 2026-05-24; Tier 0–1 execution tracked in **In Progress**.
- ★★ **Input sanitizer lane (hybrid):** Deterministic Ask cleanup and conservative block before Ollama; default on; no Settings UI. Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize` (exact whole message, trim + casefold) persist `input_sanitizer_user_disabled` via `save_settings` and return confirmation without calling the model. Backend `backend/services/input_sanitizer_service.py`, `main.py` (`ask_game_ai` / `start_background_game_ai`); frontend types and completion path in `src/index.tsx`; phrase constants in `src/data/inputSanitizerCommands.ts`.
- ★★★ **Input Handling Transparency Panel:** Main tab **Input handling (last Ask)** shows raw input, sanitizer path, system/user text sent to Ollama, model name, and raw vs final reply; **Run original** / **Copy JSON**. Optional Settings **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`) appends full trace markdown to `bonsai-ask-trace-YYYY-MM-DD.md` when filesystem writes are allowed. Backend `get_input_transparency`, `_persist_input_transparency`, `append_desktop_ask_transparency_sync` in `desktop_note_service.py`; `main.py`; UI `MainTab.tsx`, `src/utils/inputTransparency.ts`.
- ★★★ **Thinking blurb during reply (2026-06-14):** While pending, users see one italic `thinking_summary` line (deterministic prep phases via `format_thinking_phase` / `_publish_thinking_phase`, plus model `<bonsai-status>` once streaming). Submit shows `Starting…` immediately with no duplicate Thinking AI bubble; `useSmoothStreamReveal` smooths token preview. Files: `bonsai_stream_tags.py`, `game_ai_request.py`, `main.py`, `ollama_prompts.py`, `useBonsaiAskOrchestration.ts`, `askThinkingPhases.ts`, `useSmoothStreamReveal.ts`, `MainTab.tsx`, `BonsaiChatFeedbackRow.tsx`.
- ★★★ **Playful thinking status lines (2026-06-14, ships with Thinking blurb):** At Ask start, `compose_thinking_blurb()` publishes prompt-woven pending copy (question snippet, game, attachments; strategy/TDP/troubleshooting template pools). **Character voice** adds witty/deadpan variants via `thinking_status_tone_for_preset` in `ai_character_service.py`.
- ★★ **Thinking phase copy polish (2026-06-27):** Mid-Ask `_publish_thinking_phase_key` lines stay prompt-woven — `format_thinking_phase()` accepts `question` and weaves snippet + game for proton/TDP/screenshot/build/retry phases (character variants preserved); redundant background `starting` publish removed. Files: `bonsai_stream_tags.py`, `main.py`, `game_ai_request.py`; tests `tests/test_bonsai_stream_tags.py`, `tests/test_background_partial_state.py`.
- ★★★ **System prompt reorder + general-purpose assistant clause:** Shipped — `build_system_prompt` in [`py_modules/backend/services/ollama_service.py`](../py_modules/backend/services/ollama_service.py) assembles the Ollama **system** message in layers: dynamic game/attachment/vision → identity + general-purpose clause → optional early context (e.g. Proton via `early_context_suffix` from `main.py`) → topic/mode injects → **TDP + ```json``` contract tail** last; `append_deck_tdp_sysfs_grounding` after that; AI character roleplay remains a **prefix** when enabled. Unit ordering tests in [`tests/test_ollama_service.py`](../tests/test_ollama_service.py); maintainer notes in [testing.md](testing.md) (**System message layer order**). **Still needs on-device / matrix validation:** use Input transparency to confirm layer order and quality on real Asks (Speed, Strategy, Ollama-host, TDP/read paths) — track in [testing.md](testing.md) and [testing.md](testing.md#regression-gates) as appropriate. RAG injection in-prompt remains future (see [archive/research/rag-sources-research.md](archive/research/rag-sources-research.md)); **not in scope:** changing TDP/GPU JSON schema.

**Also counted in shipped baseline (not separate checklist lines above):** background prompt completion (V1); Linux Ollama compatibility.

### Connection, routing, diagnostics, and timeouts

- ★★★ **Ollama tab + unified AI models hub (2026-06-11):** New **Ollama** LB/RB tab (outline llama icon) between Main and Settings consolidates **Where AI runs**, response verification, connection timeouts/keep-alive, and **Models & routing** → **Open AI models…** fullscreen hub with **Policy**, **Browse & pull**, and **Advanced** chips (tier selection, pull table, Tier 3 unlock / high-VRAM fallbacks). Removed scattered controls from Permissions (model policy), Settings (connection block), and Developer (verify + tuning + routing). Implemented in `src/components/OllamaTab.tsx`, `OllamaWhereAiRunsSection.tsx`, `OllamaModelsHubModal.tsx`, `ModelPolicyTierPanel.tsx`, `ModelRoutingAdvancedPanel.tsx`; tab wiring in `src/index.tsx`.
- ★★ **Ollama Network Routing Fix:** Route frontend requests through Decky backend (`call("ask_game_ai", ...)`) to resolve cross-origin failures.
- ★★ **Deck and PC Connection Settings:** Add connection-focused settings including visible Deck IP and PC IP management.
- ★★ **Diagnostic, Latency, and Timeout Warnings:** Return `elapsed_seconds`, show slow-response warnings, and enforce backend timeout messaging.
- ★★ **Configurable Latency and Timeout Controls:** Persisted warning + timeout in `settings.json`; Settings Connection uses one Steam `SliderField` for hard timeout with a visible soft-warning readout (`ConnectionTimeoutSlider.tsx`), and ordering is reconciled on load/updates.
- ★★ **Ollama model VRAM retention (`keep_alive`):** Persisted `ollama_keep_alive` with fixed preset durations (default **5 minutes**); Settings → Connection `OllamaKeepAliveSlider.tsx`; value passed on each Ask through `main.py` into `backend/services/ollama_service.py`. `settings_service.py`, `settingsAndResponse.ts`.
- ★★★ **[Local/runtime] Default off + onboarding:** When `ollama_local_on_deck` is absent from persisted settings, default **`false`** (LAN PC host field applies); explicit **`true`** / **`false`** in JSON unchanged. Global beta modal warns LAN-hosted Ollama is typically faster than on-device inference and that heavy VRAM use may crash games (**use at your own risk**). **`bonsai:local-runtime-beta-dismissed-v1`** **`ConfirmModal`** when the user enables **Ollama on Deck** (optional local routing); Starter/Connection Tier-1 essentials per [`TIER1_ESSENTIALS_PULL_TAGS`](../refactor_helpers.py). **Clear all plugin data** resets flags and storage keys. Connection **Test** to localhost may **`systemctl --user`** / **`ollama serve`** wake the listener (`recover_loopback_ollama_listening`, **`main.py`**). `settings_service.py`, `settingsAndResponse.ts`, `src/index.tsx`, `py_modules/backend/services/local_ollama_setup_service.py`.
- ★★★ **Deck essentials model simplification (2026-06-15):** One-model defaults — Tier 1 `qwen2.5vl:3b`, optional Tier 2 `gemma4:e2b-it-qat`; shortened routing chains; Pull Models **Essentials only** default; removed 11-model “full Tier-1” setup; **Clear all data** purges local Ollama when **Ollama on this Deck** was on. `refactor_helpers.py`, `pullModelCatalog.ts`, `OllamaWhereAiRunsSection.tsx`, `local_ollama_teardown_service.py`, `docs/troubleshooting.md`.
- ★★ **LAN Ollama discovery (mDNS, opt-in):** **Ollama** tab **Find LAN** browses `_ollama._tcp.local` only (user-confirmed; no subnet scan). `ollama_mdns_discovery_service.py`, `discover_mdns_ollama_hosts` RPC, `OllamaWhereAiRunsSection.tsx`. Requires Avahi/Bonjour publish on the Ollama host — [troubleshooting.md](troubleshooting.md) § Find Ollama on LAN.
- ★★★ **Named Ollama hosts (quick switch, K):** Save up to **4** labeled LAN base URLs (`named_ollama_hosts`); one-tap switch chips on the **Ollama** tab when **Ollama on this Deck** is off. **Save current PC address as quick host** button. `OllamaWhereAiRunsSection.tsx`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Maintainer automation:** Vitest headless Decky harness (`src/test-harness/`), `watch-deploy` scripts, prepare-only `pnpm run version:bump`, Cursor skill `.cursor/skills/bonsai-deck-dev-loop/`. [development.md](development.md).
- ★★ **Local Ollama update + saved LAN IP fix:** Settings → Connection adds **Update Ollama & Models** when **Ollama on this Deck** is on — re-runs the official installer, then re-pulls each tag from local `/api/tags` (no-op model step if none installed). Ask no longer overwrites `bonsai:pc-ip` with `127.0.0.1:11434` while local routing is active, so toggling local off restores the LAN host. `update_installed` profile in `refactor_helpers.py`, `local_ollama_setup_service.py` (`list_installed_ollama_tags`), `SettingsTab.tsx`, `src/utils/persistOllamaIp.ts`, `src/index.tsx`.

### Tabs, icons, and unified ask flow

- ★★ **Iconography Pass (Tabs + Plugin + Ask Button):** Add icons to all tabs (bonsAI bonsai-tree icon, Settings gear, Debug bug, About unchanged), switch plugin icon to bonsai SVG, and show the stock diamond beside `Ask` text.
- ★★ **Persist Last Question and Answer:** Restore prior session state when reopening QAM via Decky settings storage.
- ★★ **Unified Search + Ask Input:** Merge settings search and AI question entry into one shared input flow.
- ★ **Preset Chip Fade Opt-Out:** Settings `ToggleField` **Preset chip fade animation** (persisted `preset_chip_fade_animation_enabled`, default on). When off, main-tab suggestion chips stay opaque and rotate prompts without opacity transitions; post-Ask re-seed unchanged. `PresetAnimatedChips.tsx`, `MainTab.tsx`, `settingsAndResponse.ts`, `settings_service.py`.
- ★★★ **Preset carousel scroll + slide (2026-05-20):** Developer → **carousel** mode: slower auto-advance (~5.8s), `translateY` slide animation, D-pad scrollable history (~12 items), soft contextual re-seed after Ask, `React.memo` on chips, inject-row placeholder during Ask. `src/features/preset-carousel/carouselState.ts`, `MainTabPresetAnimatedChips.tsx`, `bonsaiScopeStylesheet.ts`, `MainTab.tsx`.
- ★★ **Gemma Pull Models + routing parity (2026-05-20):** Browse models adds `gemma4:4b` / `gemma4:2b`; Tier 2 fallbacks try `gemma3:4b` and catalog Gemma tags before `:latest`; HTTP 404 advances to next model. `pullModelCatalog.ts`, `refactor_helpers.py`, `main.py`, `docs/troubleshooting.md`.
- ★★★ **Living Pull Models catalog (2026-06-11):** Bundled `pullModelCatalog.ts` merged with remote `data/pull-model-catalog-overlay.json` on **Update AI & models** completion and Pull Models **↻** refresh; disk cache `~/.bonsai/cache`; picker-only (routing chains unchanged until plugin release). `pull_model_catalog_service.py`, `mergePullModelCatalog.ts`, `PullModelsModal.tsx`, `OllamaWhereAiRunsSection.tsx`.
- ★★★ **Mode selector (main screen):** Persisted `ask_mode` (`speed` / `strategy` / `expert`, UI labels Speed / Strategy / Expert). Compact outline control (green / bronze / gold) on the unified input strip, left of mic/stop, opens an anchored popover menu to change mode (no layout reflow); D-pad focus order is text field → mode → mic/stop. Backend orders Ollama model fallbacks per mode in `refactor_helpers.py`; `start_background_game_ai` includes `ask_mode`. `src/data/askMode.ts`, `src/components/AskModeMenuPopover.tsx`, `MainTab.tsx`, `index.tsx`, `settingsAndResponse.ts`, `settings_service.py`, `main.py`. Legacy `"deep"` migrates to `"expert"` on load (2026-06-26).
- ★★★★★ **Whisper voice Ask (Deck STT, 2026-06-11):** Local speech-to-text into the unified Ask input via the mic button. Backend PipeWire/Pulse/ALSA capture (`voice_transcription_service.py`), rolling-window **whisper.cpp** interim transcription, poll-based status RPCs (`start_voice_transcription`, `stop_voice_transcription`, `get_voice_transcription_status`). **Permission:** `microphone_access` toggle in **Permissions** tab (default off; not legacy-grandfathered). **Settings → Voice input:** `tiny.en` / `base.en` model selector + GGUF download (`install_voice_engine`). Bundle `bin/whisper-cli` on device (see `bin/README.md`). Audio in-memory only; transparency route `voice.transcribe`. Files: `main.py`, `src/hooks/useVoiceTranscription.ts`, `VoiceInputSettingsSection.tsx`, `PermissionsTab.tsx`, `MainTab.tsx`.
- ★★★★ **Strategy Guide prompt path (beta):** Shipped — **Strategy Guide** in prompts and tooling is the same path as **`ask_mode: strategy`** (main-tab label **Strategy**). Strategy presets can switch Ask mode; strategy-specific placeholder (“describe the level / boss / puzzle”); **`STRATEGY GUIDE MODE`** scaffolding and branch-picker contract in `backend/services/ollama_service.py` + `backend/services/strategy_guide_parse.py`; follow-up UX in `src/index.tsx`, `MainTab.tsx`, `src/data/presets.ts`, `src/data/strategyGuideFollowup.ts`; character framing in `ai_character_service.py` when roleplay is on. Optional cheat / shortcut guidance when the user asks; Steam Input-aware copy where relevant. Regression notes: [testing.md](testing.md) § Strategy Guide. **Not in scope:** perfect walkthroughs for every title.
- ★★★ **Ask thread accordion (2026-06-14):** Main-tab transcript uses one **accordion row per turn** — collapsed title is a truncated question (`buildCollapsedTurnTitle`); OK expands **full AI answer only** inline; exactly one turn open (`expandedTurnKey` in `useBonsaiAskOrchestration.ts`). Removed detached question chips + shared AI bubble and **Next message** navigation. **Spoilers:** removed main-tab **Spoilers OK for this Ask** and Settings **Open spoilers after I opt in**; masking is controlled only by **Hide spoilers until I tap** (`strategy_spoiler_masking_enabled`); darker tap-to-reveal styling on `.bonsai-spoiler-reveal-target`. Files: `BonsaiChatTurnRow.tsx`, `MainTab.tsx`, `chatTurnTitle.ts`, `bonsaiScopeStylesheet.ts`.
- ★★ **Retry same prompt (regenerate, B):** **Retry same prompt** on a completed reply re-submits the last sanitized Ask without retyping. `onRetryLastResponse` in `useBonsaiAskOrchestration.ts`, `BonsaiChatReplyActions.tsx`, `buildReplyActionsElement.tsx`, `MainTab.tsx`.
- ★★★ **Per-turn local feedback (thumbs, S):** Compact **Was this helpful?** row with thumbs up/down under AI replies; `save_ask_feedback` RPC in `main.py`; shared `.bonsai-chat-secondary-btn` chrome with Retry and Show details. Shipped 2026-06-14. `BonsaiChatReplyActions.tsx`, `MainTab.tsx`.
- ★★★★ **Strategy Guide safety and spoilers:** Shipped — spoiler-minimized default and `bonsai-spoiler` fenced blocks in the strategy system prompt; phrase-match consent on sanitized user text; Settings → **Story spoilers (Strategy mode)** → **Hide spoilers until I tap**; tap-to-reveal in `MainTabBonsaiAiMarkdownChunk.tsx`. **`settings.json`:** `strategy_spoiler_masking_enabled` (legacy `strategy_spoiler_auto_reveal_after_consent` ignored on save). **Not in scope:** hard model guarantees. **Testing:** [testing.md](testing.md) § **Spoiler Policy and Consent**.
- ★★★★★ **Strategy checklist (Strategy Guide chats):** Shipped — follow-up turns emit `bonsai-strategy-checklist` JSON fence; interactive `ToggleField` rows in `StrategyChecklistPanel.tsx`; progress synced into subsequent Strategy asks via `strategy_checklist_state`; per-game persistence in `strategy_checklist_session.json` (`get/save/clear_strategy_checklist_session` RPC). Cleared on Reset session cache, Clear all plugin data, leaving Strategy mode, or new first-turn Strategy ask. **Testing:** [testing.md](testing.md) § Strategy depth (`STRATEGY-CHECKLIST`).
- ★★ **Debug tab opt-in (Settings):** Persisted `show_debug_tab` (default **false**); **Debug** omitted from the tab strip until **Show Debug tab** is enabled in Settings; safe tab switch when turning the toggle off while on **Debug**. `src/index.tsx`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Settings tab trim:** **Trim the fat** on Settings: fewer simultaneous controls per view, clearer `PanelSection` grouping, progressive disclosure, shorter helper copy on toggles and sliders; dedicated Settings composition (`SettingsTab.tsx` and related controls).
- ★★★ **Reset session cache (app state):** Settings → Advanced **Reset session cache…** with confirm modal; `resetPluginSession()` clears in-memory unified search, reply, thread, transparency, branch picker, attachments, and timers. Does **not** change persisted `settings.json`, host Ollama history, or screenshot files. `src/index.tsx`.

**Baseline index:** preset carousel and transition UX (Phase 1 — fade/hold; manual arrows deferred).

### AI-assisted power and long-response UX

- ★★★ **TDP Automation via AI Output:** Parse AI recommendations and apply constrained TDP values through safe sysfs write paths.
- ★★★ **QAMP Reflection (Phase 1 — Safe Default):** After a sysfs TDP apply, the main tab shows an explicit **TDP nW** confirmation plus re-open **QAM → Performance** guidance (`formatAppliedTuningBannerText` / `buildResponseText` in [src/utils/settingsAndResponse.ts](../src/utils/settingsAndResponse.ts), [src/components/MainTab.tsx](../src/components/MainTab.tsx)). GPU MHz from the model is labeled **recommendation only** (not written in sysfs in this build). On-Deck QAMP / restart checks: [testing.md](testing.md) § QAMP Verification. **Phase 2** (Steam profile / experimental opt-in) remains in [Planned](#long-term) — *blocked until explicitly scoped*.
- ★★★ **D-pad Response Scrolling:** Split long responses into focusable chunks for controller-first navigation.

### Steam Input

- ★★★★★ **Steam Input Jump (Phase 1):** Debug tab jump to per-game controller config via `steam://controllerconfig/{appId}` (`SteamClient.URL.ExecuteSteamURL`), versioned lexicon in `src/data/steam-input-lexicon.ts`, helper in `src/utils/steamInputJump.ts`. Documented in [archive/research/steam-input-research.md](archive/research/steam-input-research.md). **Phase 2+** (indexed search, full catalog, ranked results) is **not** planned to continue.
- ★★ **Global quick-launch macro (documentation + verification checklist):** Guide-chord path QAM → Decky → bonsAI with **Fire Start Delay** and per-user rail depth documented in [troubleshooting.md](troubleshooting.md) §5; [README.md](../README.md) quick-launch blurb; optional device check in [testing.md](testing.md#regression-gates) §3 (Plugin shell). On-device **Last verified** line in §5 is maintainer-updated when hardware is exercised.
- ★ **Shortcut setup keywords (Ask, no Ollama):** `bonsai:shortcut-setup-deck` and `bonsai:shortcut-setup-stadia` typed in Ask (optional leading `/`); `backend/services/shortcut_setup_commands.py`; response + optional **Open Controller settings**; documented in [troubleshooting.md](troubleshooting.md) §5 and [testing.md](testing.md). **Not in scope:** auto-writing Steam Input / VDF (see [archive/research/steam-input-research.md](archive/research/steam-input-research.md)).
- ★★ **VAC / ban lookup (Phase 1 — Ask command) — complete:** `bonsai:vac-check` with user-supplied 64-bit SteamIDs or `/profiles/765…` URLs; Steam **GetPlayerBans** via `backend/services/steam_vac_service.py`, `vac_check_commands.py`; Permission **`steam_web_api`** (default off; legacy grandfather leaves it off); Settings **Steam Web API key**; TTL cache; disclaimer that results are account-level, not opponent attribution. README + optional preset chip. **Phase 2** (live opponent IDs) remains in [Planned](#long-term). **On-device QA:** Phase 1 is **not** fully covered in the matrices until someone runs [testing.md](testing.md) § **VAC / Steam ban lookup (`bonsai:vac-check`)** and records Pass / Partial / Fail + build id; optional smoke row in [testing.md](testing.md#regression-gates) § **Permissions**.

### About tab and main surface polish

- ★ **Built on Ollama Link (About Tab):** “Built on Ollama” button in About opens `https://github.com/ollama/ollama` via `Navigation.NavigateToExternalWeb` (toast fallback), wired from `OLLAMA_UPSTREAM_REPO_URL` in `src/index.tsx` and `src/components/AboutTab.tsx`.
- ★★ **Search Surface Glass Pass (Unified Input):** Glass-style unified search field and ask bar (~25% fill, blur, light edge), 50% opacity on corner action icons, dynamic height for the input shell from wrapped text, AI answer chunks use matching glass instead of near-black panels.

### Desktop notes (Game Mode → Desktop)

- ★★★ **Desktop app activity logging (opt-in):** Settings → Advanced **App activity logging to Desktop** (`desktop_app_log_level`: off / default / verbose; default off). With Filesystem writes, summary or detailed events append to `~/Desktop/bonsAI_logs/bonsai-app-YYYY-MM-DD.log`. Backend `_maybe_app_log`, RPC `append_app_log`, redaction in `desktop_note_service.py`; frontend `src/utils/appDesktopLog.ts`. Folder rename: all Desktop writes now use `bonsAI_logs` (was `BonsAI_notes`; manual rename for existing folders).
- ★★★ **Desktop Mode Debug Note Save (Steam Deck, V1):** After a successful ask, **Save to Desktop note…** on the main tab opens a consent + name dialog; append-only writes to `~/Desktop/bonsAI_logs/<name>.md` with UTC timestamps and Q+A (`append_desktop_debug_note` in `main.py`, `backend/services/desktop_note_service.py`, `DesktopNoteSaveModal` + `MainTab` in `src/`).
- ★★★ **Desktop Mode Debug Note Save — Daily chat auto-save (V2):** Settings tab toggle (`desktop_debug_note_auto_save`, default off). When enabled with Filesystem writes, each **Ask** and each **AI response** append to `~/Desktop/bonsAI_logs/bonsai-chat-YYYY-MM-DD.md` (UTC calendar day); Ask entries list attached screenshot paths. Backend `append_desktop_chat_event`; `src/index.tsx` Settings + ask/response hooks.

### Permissions and capability gating

- ★★★★ **Capability Permission Center (User-Controlled Access):** Permissions tab (lock icon, same title scale as other tabs) with toggles for filesystem writes, hardware control (TDP apply), media library access (screenshot attach), Steam/Proton log read (troubleshooting Ask excerpts), **Steam Web API** (outbound GetPlayerBans for `bonsai:vac-check`), and external/Steam navigation (About links, Debug Steam Input jump). Persisted `settings.json` `capabilities`; new installs default OFF; legacy installs without a `capabilities` block are grandfathered ON until saved (**Steam Web API** stays off in that path). Backend enforces gates on `append_desktop_debug_note`, `append_desktop_chat_event`, `list_recent_screenshots`, ask-with-attachments, TDP apply, `capture_screenshot`, bounded reads for Proton/log attachment when enabled, and Steam ban lookups when enabled. Files: `backend/services/capabilities.py`, `PermissionsTab`, `main.py`, `src/utils/settingsAndResponse.ts`.
- ★★★ **Debugging and Proton log analysis:** Settings → Advanced **Attach Proton logs when troubleshooting** (`attach_proton_logs_when_troubleshooting`) plus Permissions **Steam / Proton log read** (`steam_logs_read`). On Linux, when the sanitized question matches the troubleshooting heuristic and a running AppID is present, the backend attaches bounded tails from `~/steam-<appid>.log` (typical with `PROTON_LOG=1`) and shallow `steamapps/compatdata/<appid>/*.log` files into the **system** prompt before roleplay prefixing (`backend/services/proton_troubleshooting_logs.py`, `backend/services/game_ai_request.py`, `main.py`). Main **Input handling** shows excerpt/notes. Does **not** enable Proton logging automatically. **On-device QA:** not yet exercised in the prompt matrix — follow [testing.md](testing.md) § **Proton / Steam log attachment (QA)**; optional Permissions smoke row in [testing.md](testing.md#regression-gates) § Permissions.
- ★★★★ **Model policy tiers + disclosure UX:** Persisted `model_policy_tier` / `model_policy_non_foss_unlocked` and related allow-high-VRAM flag; Settings **Model policy** (tier chips, unlock flow, README link); backend `backend/services/model_policy.py` classifies model tags and enforces tier when selecting fallbacks; successful replies can include **Model source disclosure** on Main. `src/data/modelPolicy.ts`, `MainTab.tsx`, `src/utils/inputTransparency.ts`, `main.py`, [README.md](../README.md) § Model policy tiers.

**Baseline index:** global screenshots and vision (V1) — multimodal attach; uses media-related capability paths.

### Character voice roleplay

- ★★★ **Character Voice Roleplay Mode (Opt-In):** Default-off **AI character** in Settings (small caps label); fullscreen `CharacterPickerModal` with per–work-title groups, **Random** toggle, custom line, OK/Cancel; unique pixel emoticons; main-tab glass avatar opens picker; backend `ai_character_service.build_roleplay_system_suffix` appends roleplay instructions to the Ollama system prompt. `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `main.py`, `settings.json` fields `ai_character_*`.
- ★★ **Character Accent Intensity Levels (Doom-Style Copy):** Settings **Accent intensity** horizontal chips (`subtle` / `balanced` / `heavy` / `unleashed`, default `balanced`) when AI characters are on; Doom-difficulty–flavored short labels and helper copy. Persisted `ai_character_accent_intensity`; `build_roleplay_system_suffix` varies dialect/accent strength for presets, random, and custom paths without changing TDP/JSON policy. `src/data/aiCharacterAccentIntensity.ts`, `src/index.tsx`, `backend/services/ai_character_service.py`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Running-game character suggestions (AI picker):** On `CharacterPickerModal` open, read `Router.MainRunningApp`, resolve 1–3 catalog presets via `src/utils/runningGameCharacterSuggestions.ts` (Steam AppID map + normalized title match + TF2 merge), show **Playing:** headline and suggestion row with `CharacterRoleplayEmoticon`; async after first paint with delayed spinner (~160 ms); D-pad links Random, suggestions, column 0, and custom field.
- ★★ **Random character “?” avatar (picker + main):** When **Random** is on, picker tile, main-tab glass avatar, and related summary chips use a single **“?”** affordance. `CharacterRoleplayEmoticon.tsx`, `CharacterPickerModal.tsx`, `MainTab.tsx`.
- ★★★ **Character-derived UI accent theme (preset-selected):** With AI character on and a fixed catalog preset (not Random / not custom), accent tokens follow `src/data/characterUiAccent.ts` and catalog-driven colors; **AI character off**, **Random**, and **Custom** stay bonsAI forest green. `src/index.tsx` scoped CSS / token wiring, `MainTab.tsx`, `CharacterPickerModal.tsx`.
- ★★★★ **Pyro talent-manager easter egg (hidden preset):** With AI character on and resolved voice **Pyro** (`tf2_pyro`, fixed picker or Random), replies use a Hollywood-style talent-manager parody (Ari Gold–style archetype only—not in-universe Pyro speech, no likeness claims). **Two tiers:** at **Subtle/Balanced** accent the manager stays smarmy but **helpful** (OSS-angled carousel tips); at **Heavy/Nightmare** accent the same unlock becomes a **worthless asshole AI**—mocking replies, deliberately bad Deck/game advice, never admits failure—while the backend **never applies TDP/hardware** from those replies (even if the model emits JSON). Some successful Asks attach structured **`preset_carousel_inject`** so Main shows an extra orange-outlined suggestion chip **beside** the three-slot carousel—the inject chip does not use `PRESET_CAROUSEL_ACTIVE_MS` and stays focusable after the trio may rest. Clears on the next Ask or **Reset session cache**. `backend/services/ai_character_service.py` (`build_roleplay_system_suffix_meta`, tips), `main.py` (`ask_ollama`), `game_ai_request.py`, `MainTab.tsx`, `bonsaiScopeStylesheet.ts`. [archive/research/voice-character-catalog.md](archive/research/voice-character-catalog.md). **On-device QA:** not yet fully exercised in the standing matrices — follow [testing.md](testing.md#regression-gates) §2 (character / carousel touches) and §3 Main tab (Pyro + inject chip; Nightmare asshole tier).

### Shipped detail (extensions and deferred phases)

> Items here mirror **Completed** above with roadmap-style detail, follow-on notes, and deferred phases.

#### Character accent intensity levels (Doom-style copy)

★★

**Shipped** — see **Completed** → Character voice roleplay; `ai_character_accent_intensity`; backend varies by `subtle` / `balanced` / `heavy` / `unleashed`.

#### Pyro talent-manager easter egg (hidden preset)

★★★★

**Shipped** — see **Completed** → Character voice roleplay. **Subtle/Balanced:** smarmy helpful manager + OSS carousel tips. **Heavy/Nightmare:** asshole AI tier (bad advice in text only; backend suppresses TDP apply). Tip appearance is probabilistic; verify on hardware per [testing.md](testing.md#regression-gates) §2 / §3.

#### Higher-resolution character avatars (GTA-style art pass)

★★★

- **Status (V1):** Shipped — unified 16×16 SVG placeholder emoticon grids (`expand8To16`, hand-tuned bust overrides); `src/components/characterPlaceholderEmoticonGrids.ts`, `CharacterRoleplayEmoticon.tsx`.
- **Goal:** Improve recognizability with higher-resolution art that stays clear at small sizes; GTA-inspired cel-shaded, graphic-novel direction; TF2 Announcer keeps bonsai-tree treatment.
- **Files:** `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `src/components/MainTab.tsx`, `src/index.tsx`, `src/assets/`.
- **Depends on:** character voice roleplay + existing catalog mapping.
- **Not in scope:** changing roleplay prompt behavior, animation/VFX, or unapproved third-party likeness assets.

#### Input sanitizer lane (hybrid + user override) — extensions

★★★

**Baseline shipped** — see **Completed** → Input sanitizer lane.

- **Future goal:** Optional small-model rewrite path, harmful-input block path, explicit **Use original input** bypass beyond current hybrid behavior.
- **Files:** `main.py`, `src/index.tsx`, prompt-policy docs.
- **Depends on:** settings persistence and transparent input handling.
- **Not in scope:** hidden rewriting with no user visibility or override.

#### Input handling transparency panel

★★★

**Shipped** — see **Completed** → Input Handling Transparency Panel.

#### Desktop mode debug note save (Steam Deck)

★★★

**V1 and V2 shipped** — see **Completed** → Desktop notes.

- **Possible follow-ups:** natural-language save triggers, optional raw-response export.
- **Not in scope:** arbitrary paths outside `~/Desktop/bonsAI_logs/`, silent writes without permission, or replacing note content by default.

#### Preset carousel and transition UX

★★★★

- **Status (Phase 1):** Shipped — three chips, staggered fade, length-based hold; `PresetAnimatedChips.tsx`, `src/data/presets.ts`, scoped CSS in `src/index.tsx`; notes in `docs/testing.md`. **Carousel mode extension (2026-05-20):** slide animation, scrollable history, anti-flicker re-seed — see Completed changelog above.
- **Deferred:** lower-right arrow controls for manual next/previous (D-pad history browse shipped in carousel mode 2026-05-20).
- **Goal (full vision):** Carousel navigation controls as above.
- **Depends on:** existing preset randomization/category logic.
- **Not in scope:** changing core preset taxonomy/model routing.

#### Capability Permission Center (user-controlled access)

★★★★

**Shipped** — see **Completed** and baseline index. Ollama/LAN ask traffic is not gated as “web.”

- **Not in scope (future):** first-use modals per capability beyond blocked-action toasts; separate toggles for sudo vs direct sysfs (currently under Hardware control).
- **Planned extension (not shipped):** `**network_web_access`** — Permission Center toggle (default TBD) covering outbound HTTP/HTTPS from the Deck plugin; ties to **RAG knowledge base** in **Planned** → Backlog.

#### Steam Input settings search + jump (research-first)

★★★★★

- **Phase 1 shipped** — see **Completed** → Steam Input Jump. **Phase 2+ deferred** unless revived: indexed catalog, unified search, ranked results, Edit Layout enumeration.
- **Goal (if resumed):** Search setting names and navigate to relevant surfaces; deep-link feasibility gated.
- **Files:** `src/index.tsx`, `main.py`, [archive/research/steam-input-research.md](archive/research/steam-input-research.md).
- **Depends on:** route-discovery research and fallback UX.
- **Not in scope:** private UI patching or brittle route injection.

#### Global screenshots and vision (implemented V1)

★★★★★

**Shipped** — see **Completed** / baseline index.

- **Strategy extension:** screenshot + game context for strategy guidance; inline visual aids when available.
- **Files:** `main.py`, `src/index.tsx`, install/troubleshooting docs.
- **Depends on:** vision-capable models on host PC.
- **Not in scope:** continuous video streaming.

---
