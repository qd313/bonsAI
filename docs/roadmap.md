# bonsAI Roadmap

In-progress work, bugs, and **Up next** are first. **[Completed](#completed)** is the canonical shipped checklist. Detailed backlog notes (shipped vs planned) follow. For refactor sweep notes, see [refactor-specialist-sweep.md](refactor-specialist-sweep.md).

Star ratings use the GTA scale: `★` easiest … `★★★★★` very high complexity; `★★★★★★` extreme scope.

---

## In progress

- [ ] ★★★ **QAMP Reflection (Phase 1 — Safe Default):** Show applied-state confirmation and explicit verification guidance when QAM sliders do not immediately mirror hardware writes.
  - Requirement: every BonsAI performance action must be user-verifiable after execution.
  - Initial behavior: keep sysfs write path as source of truth and guide users to re-open QAM Performance to verify reflected values.

## Known bugs

- [x] ★ **Question Overlay Alignment Drift:** The 3-line question overlay has minor horizontal spacing mismatch vs native `TextField` internals.
- [ ] ★★ **D-pad Scroll Bottom Cutoff:** Controller navigation can stop before the final response chunk is fully visible even when touch scroll can reach it.

## Up next

- [ ] ★★ **Prompt Testing and Tuning:** Systematically validate prompt quality across games and scenarios (see [prompt-testing.md](prompt-testing.md)).
- [ ] ★★★ **QAMP Verification Checklist:** Verify behavior across per-game profile modes, QAM reopen, Steam restart/reboot, and GPU-related recommendations.
  - [ ] Verify behavior with per-game profile on/off.
  - [ ] Verify behavior after closing and reopening the QAM Performance tab.
  - [ ] Verify behavior after Steam restart and full reboot.
  - [ ] Verify behavior when prompt includes GPU clock recommendations.
- [ ] ★★★★★ **QAMP Reflection (Phase 2 — Experimental Opt-In):** Attempt Steam profile sync only behind explicit warning toggles. *Blocked on Phase 1.*
  - Risks: undocumented internals, Steam update breakage, restart/reboot requirements, and profile corruption risk.
  - Candidate path: fragile `config.vdf` / protobuf edits gated behind experimental mode only.

---

## Completed

Headings group related work. Star counts match the historical list.

### First-run and prompts

- [x] ★ **Beta Disclaimer Modal:** Show one-time experimental-software warning with risk acknowledgment and bug-report link.
- [x] ★ **Suggested AI Prompts:** Show curated prompt presets, randomize initial suggestions, and generate contextual follow-ups after responses.
- [x] ★★ **Input sanitizer lane (hybrid):** Deterministic Ask cleanup and conservative block before Ollama; default on; no Settings UI. Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize` (exact whole message, trim + casefold) persist `input_sanitizer_user_disabled` via `save_settings` and return confirmation without calling the model. Backend `backend/services/input_sanitizer_service.py`, `main.py` (`ask_game_ai` / `start_background_game_ai`); frontend types and completion path in `src/index.tsx`; phrase constants in `src/data/inputSanitizerCommands.ts`.
- [x] ★★★ **Input Handling Transparency Panel:** Main tab **Input handling (last Ask)** shows raw input, sanitizer path, system/user text sent to Ollama, model name, and raw vs final reply; **Run original** / **Copy JSON**. Optional Settings **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`) appends full trace markdown to `bonsai-ask-trace-YYYY-MM-DD.md` when filesystem writes are allowed. Backend `get_input_transparency`, `_persist_input_transparency`, `append_desktop_ask_transparency_sync` in `desktop_note_service.py`; `main.py`; UI `MainTab.tsx`, `src/utils/inputTransparency.ts`.

**Also counted in shipped baseline (not separate checklist lines above):** background prompt completion (V1); Linux Ollama compatibility.

### Connection, routing, diagnostics, and timeouts

- [x] ★★ **Ollama Network Routing Fix:** Route frontend requests through Decky backend (`call("ask_game_ai", ...)`) to resolve cross-origin failures.
- [x] ★★ **Deck and PC Connection Settings:** Add connection-focused settings including visible Deck IP and PC IP management.
- [x] ★★ **Diagnostic, Latency, and Timeout Warnings:** Return `elapsed_seconds`, show slow-response warnings, and enforce backend timeout messaging.
- [x] ★★ **Configurable Latency and Timeout Controls:** Persisted warning + timeout in `settings.json`; Settings Connection uses one Steam `SliderField` for hard timeout with a visible soft-warning readout (`ConnectionTimeoutSlider.tsx`), and ordering is reconciled on load/updates.

### Tabs, icons, and unified ask flow

- [x] ★★ **Iconography Pass (Tabs + Plugin + Ask Button):** Add icons to all tabs (bonsAI bonsai-tree icon, Settings gear, Debug bug, About unchanged), switch plugin icon to bonsai SVG, and show the stock diamond beside `Ask` text.
- [x] ★★ **Persist Last Question and Answer:** Restore prior session state when reopening QAM via Decky settings storage.
- [x] ★★ **Unified Search + Ask Input:** Merge settings search and AI question entry into one shared input flow.
- [x] ★ **Preset Chip Fade Opt-Out:** Settings `ToggleField` **Preset chip fade animation** (persisted `preset_chip_fade_animation_enabled`, default on). When off, main-tab suggestion chips stay opaque and rotate prompts without opacity transitions; post-Ask re-seed unchanged. `PresetAnimatedChips.tsx`, `MainTab.tsx`, `settingsAndResponse.ts`, `settings_service.py`.

**Baseline index:** preset carousel and transition UX (Phase 1 — fade/hold; manual arrows deferred).

### AI-assisted power and long-response UX

- [x] ★★★ **TDP Automation via AI Output:** Parse AI recommendations and apply constrained TDP values through safe sysfs write paths.
- [x] ★★★ **D-pad Response Scrolling:** Split long responses into focusable chunks for controller-first navigation.

### Steam Input

- [x] ★★★★★ **Steam Input Jump (Phase 1):** Debug tab jump to per-game controller config via `steam://controllerconfig/{appId}` (`SteamClient.URL.ExecuteSteamURL`), versioned lexicon in `src/data/steam-input-lexicon.ts`, helper in `src/utils/steamInputJump.ts`. Documented in [steam-input-research.md](steam-input-research.md). **Phase 2+** (indexed search, full catalog, ranked results) is **not** planned to continue.

### About tab and main surface polish

- [x] ★ **Built on Ollama Link (About Tab):** “Built on Ollama” button in About opens `https://github.com/ollama/ollama` via `Navigation.NavigateToExternalWeb` (toast fallback), wired from `OLLAMA_UPSTREAM_REPO_URL` in `src/index.tsx` and `src/components/AboutTab.tsx`.
- [x] ★★ **Search Surface Glass Pass (Unified Input):** Glass-style unified search field and ask bar (~25% fill, blur, light edge), 50% opacity on corner action icons, dynamic height for the input shell from wrapped text, AI answer chunks use matching glass instead of near-black panels.

### Desktop notes (Game Mode → Desktop)

- [x] ★★★ **Desktop Mode Debug Note Save (Steam Deck, V1):** After a successful ask, **Save to Desktop note…** on the main tab opens a consent + name dialog; append-only writes to `~/Desktop/BonsAI_notes/<name>.md` with UTC timestamps and Q+A (`append_desktop_debug_note` in `main.py`, `backend/services/desktop_note_service.py`, `DesktopNoteSaveModal` + `MainTab` in `src/`).
- [x] ★★★ **Desktop Mode Debug Note Save — Daily chat auto-save (V2):** Settings tab toggle (`desktop_debug_note_auto_save`, default off). When enabled with Filesystem writes, each **Ask** and each **AI response** append to `~/Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md` (UTC calendar day); Ask entries list attached screenshot paths. Backend `append_desktop_chat_event`; `src/index.tsx` Settings + ask/response hooks.

### Permissions and capability gating

- [x] ★★★★ **Capability Permission Center (User-Controlled Access):** Permissions tab (lock icon, same title scale as other tabs) with toggles for filesystem writes, hardware control (TDP apply), media library access (screenshot attach), and external/Steam navigation (About links, Debug Steam Input jump). Persisted `settings.json` `capabilities`; new installs default OFF; legacy installs without a `capabilities` block are grandfathered ON until saved. Backend enforces gates on `append_desktop_debug_note`, `append_desktop_chat_event`, `list_recent_screenshots`, ask-with-attachments, TDP apply, `capture_screenshot`. Files: `backend/services/capabilities.py`, `PermissionsTab`, `main.py`, `src/utils/settingsAndResponse.ts`.

**Baseline index:** global screenshots and vision (V1) — multimodal attach; uses media-related capability paths.

### Character voice roleplay

- [x] ★★★ **Character Voice Roleplay Mode (Opt-In):** Default-off **AI character** in Settings (small caps label); fullscreen `CharacterPickerModal` with per–work-title groups, **Random** toggle, custom line, OK/Cancel; unique pixel emoticons; main-tab glass avatar opens picker; backend `ai_character_service.build_roleplay_system_suffix` appends roleplay instructions to the Ollama system prompt. `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `main.py`, `settings.json` fields `ai_character_*`.
- [x] ★★ **Character Accent Intensity Levels (Doom-Style Copy):** Settings **Accent intensity** horizontal chips (`subtle` / `balanced` / `heavy` / `unleashed`, default `balanced`) when AI characters are on; Doom-difficulty–flavored short labels and helper copy. Persisted `ai_character_accent_intensity`; `build_roleplay_system_suffix` varies dialect/accent strength for presets, random, and custom paths without changing TDP/JSON policy. `src/data/aiCharacterAccentIntensity.ts`, `src/index.tsx`, `backend/services/ai_character_service.py`, `settings_service.py`, `settingsAndResponse.ts`.

---

## Detailed future reference

Longer notes for backlog items: **Shipped feature reference** (extra context, deferred phases, extensions) vs **Planned candidates**. Canonical checklist: [Completed](#completed).

---

## Shipped feature reference (backlog mirror)

> Items here are also listed in **Completed**. This subsection keeps roadmap-style detail and follow-on notes.

### Character accent intensity levels (Doom-style copy)

★★

**Shipped** — see **Completed** → Character voice roleplay; `ai_character_accent_intensity`; backend varies by `subtle` / `balanced` / `heavy` / `unleashed`.



### Higher-resolution character avatars (GTA-style art pass)

★★★

- **Status (V1):** Shipped — unified 16×16 SVG emoticon grids (`expand8To16`, hand-tuned bust overrides); `src/components/characterEmoticonGrids.ts`, `CharacterRoleplayEmoticon.tsx`.
- **Goal:** Improve recognizability with higher-resolution art that stays clear at small sizes; GTA-inspired cel-shaded, graphic-novel direction; TF2 Announcer keeps bonsai-tree treatment.
- **Files:** `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `src/components/MainTab.tsx`, `src/index.tsx`, `src/assets/`.
- **Depends on:** character voice roleplay + existing catalog mapping.
- **Not in scope:** changing roleplay prompt behavior, animation/VFX, or unapproved third-party likeness assets.



### Input sanitizer lane (hybrid + user override) — extensions

★★★

**Baseline shipped** — see **Completed** → Input sanitizer lane.

- **Future goal:** Optional small-model rewrite path, harmful-input block path, explicit **Use original input** bypass beyond current hybrid behavior.
- **Files:** `main.py`, `src/index.tsx`, prompt-policy docs.
- **Depends on:** settings persistence and transparent input handling.
- **Not in scope:** hidden rewriting with no user visibility or override.



### Input handling transparency panel

★★★

**Shipped** — see **Completed** → Input Handling Transparency Panel.



### Desktop mode debug note save (Steam Deck)

★★★

**V1 and V2 shipped** — see **Completed** → Desktop notes.

- **Possible follow-ups:** natural-language save triggers, optional raw-response export.
- **Not in scope:** arbitrary paths outside `~/Desktop/BonsAI_notes/`, silent writes without permission, or replacing note content by default.



### Preset carousel and transition UX

★★★★

- **Status (Phase 1):** Shipped — three chips, staggered fade, length-based hold; `PresetAnimatedChips.tsx`, `src/data/presets.ts`, scoped CSS in `src/index.tsx`; notes in `docs/prompt-testing.md`.
- **Deferred:** lower-right arrow controls for manual next/previous and controller focus (not in Phase 1).
- **Goal (full vision):** Carousel navigation controls as above.
- **Depends on:** existing preset randomization/category logic.
- **Not in scope:** changing core preset taxonomy/model routing.



### Capability Permission Center (user-controlled access)

★★★★

**Shipped** — see **Completed** and baseline index. Ollama/LAN ask traffic is not gated as “web.”

- **Not in scope (future):** first-use modals per capability beyond blocked-action toasts; separate toggles for sudo vs direct sysfs (currently under Hardware control).
- **Planned extension (not shipped):** **`network_web_access`** — Permission Center toggle (default TBD) covering outbound HTTP/HTTPS from the Deck plugin; ties to **RAG knowledge base** below.



### Steam Input settings search + jump (research-first)

★★★★★

- **Phase 1 shipped** — see **Completed** → Steam Input Jump. **Phase 2+ deferred** unless revived: indexed catalog, unified search, ranked results, Edit Layout enumeration.
- **Goal (if resumed):** Search setting names and navigate to relevant surfaces; deep-link feasibility gated.
- **Files:** `src/index.tsx`, `main.py`, [steam-input-research.md](steam-input-research.md).
- **Depends on:** route-discovery research and fallback UX.
- **Not in scope:** private UI patching or brittle route injection.



### Global screenshots and vision (implemented V1)

★★★★★

**Shipped** — see **Completed** / baseline index.

- **Strategy extension:** screenshot + game context for strategy guidance; inline visual aids when available.
- **Files:** `main.py`, `src/index.tsx`, install/troubleshooting docs.
- **Depends on:** vision-capable models on host PC.
- **Not in scope:** continuous video streaming.



---

## Planned candidates (not shipped)

> **Planning only** — ranked by effort/risk (easiest to hardest within star bands). Do not treat as an implementation order.

### Mode selector dropdown (main screen)

★★★

- **Goal:** Add model mode selector (`Fast`, `Strategy Guide`, `Mega/Ultra/Deep`) on main screen.
- **Primary work:** UI selector + backend mode-to-model mapping + installed-model fallback.
- **Behavior note:** `Strategy Guide` replaces the previous `Thinking` lane (rename/repurpose, not an added mode lane).
- **Files:** `src/index.tsx`, `main.py`.
- **Depends on:** none.
- **Not in scope:** automatic model pulls from plugin UI.



### Per-mode latency/timeout profiles

★★★

- **Goal:** Separate warning and timeout values per selected mode.
- **Primary work:** mode-keyed settings schema and runtime value resolution.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** **Mode selector dropdown (main screen)**.
- **Not in scope:** per-game/per-model fine-grained profile matrix.



### Multi-language responses

★★★

- **Goal:** Respond in user/Steam language with optional override.
- **Primary work:** language detection, prompt localization instruction, optional override persistence.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** settings persistence already present.
- **Not in scope:** full UI localization of plugin labels.



### Search results density + live match emphasis

★★★

- **Goal:** Tighter, more scannable results: spacing, wider lines, incremental filtering, highlighted match tokens.
- **Files:** `src/index.tsx`, prompt/search UX test notes.
- **Depends on:** unified search indexing and response-state handling.
- **Not in scope:** changing ranking semantics for unrelated search domains.



### Reset cache action (app state)

★★★

- **Goal:** One user action clears cached unified search text and current AI response.
- **Primary work:** UI control, clear local storage + in-memory response state, explicit/confirmable behavior.
- **Files:** `src/index.tsx`, optional settings/docs references.
- **Depends on:** unified input persistence + response state handling.
- **Not in scope:** clearing host-side Ollama history or deleting screenshot files.



### Debugging and Proton log analysis

★★★

- **Goal:** Attach relevant Proton/game logs to troubleshooting prompts.
- **Primary work:** log discovery, truncation/filtering, context injection.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** active-game context.
- **Not in scope:** enabling Proton logging automatically.
- **Risk note:** limited value unless users already run with `PROTON_LOG=1`.



### System prompt reorder and general-purpose assistant clause

★★★

- **Status:** Planned (documentation only; implementation backlog TBD — see [rag-sources-research.md](rag-sources-research.md)).
- **Goal:** Reorder Ollama **system** message: dynamic game/attachment/vision first, then general-knowledge block (Deck/gaming primary expertise but general-purpose for other topics), optional RAG snippets, **TDP limits and JSON contract last**.
- **Primary work:** refactor `build_system_prompt` in `backend/services/ollama_service.py`; keep AI character prefix in `main.py` when enabled.
- **Files:** `backend/services/ollama_service.py`, `main.py`, `docs/prompt-testing.md` after behavior change.
- **Depends on:** none.
- **Not in scope:** changing the JSON schema for TDP/GPU recommendations.



### Strategy Guide prompt path (beta)

★★★★

- **Goal:** Strategy-focused path for “how do I beat this level” and related prompts.
- **Primary work:** strategy intent routing, coaching-first format, prompt scaffolding.
- **Expected UX:** strategy preset switches to `Strategy Guide` mode with placeholder like `Describe the level or problem`.
- **Includes:** Steam Input-aware recommendations when control friction matters.
- **Policy:** optional `Cheat / Fast Pass` only when user asks for speedrun/shortcut guidance.
- **Files:** `src/index.tsx`, `main.py`, `prompt-testing.md`.
- **Depends on:** **Mode selector dropdown (main screen)**.
- **Not in scope:** guaranteed perfect walkthroughs for every title.



### Strategy Guide safety and spoilers

★★★★

- **Goal:** Useful strategy help without unwanted spoilers by default.
- **Primary work:** spoiler-safe policy, explicit consent for unrestricted spoilers, tap-to-reveal blocks.
- **Settings note:** optional setting to show spoilers directly after consent.
- **Files:** `src/index.tsx`, `main.py`, `prompt-testing.md`.
- **Depends on:** **Strategy Guide prompt path (beta)**.
- **Not in scope:** hard guarantees in every edge case.



### Idle safety preset automation

★★★★

- **Goal:** Optionally apply a low-power preset (e.g., 3W) after configurable inactivity.
- **Primary work:** inactivity detection, guardrails, explicit opt-in, cooldown rules.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** robust user opt-in safeguards.
- **Not in scope:** hidden automation without consent.



### Steam Input layout analysis

★★★★

- **Goal:** Parse controller VDF configs and feed actionable control context to AI.
- **Primary work:** config discovery, VDF parsing, normalization to human-readable actions.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** bundled VDF parser support.
- **Not in scope:** editing/writing controller configs.



### Offline intent pack exchange (local JSON)

★★★★

- **Goal:** Import/export user-created offline search intent packs (aliases, synonyms, expansions) without cloud dependence.
- **Primary work:** local JSON schema, add/edit/export/import, merge conflict rules.
- **Files:** `src/index.tsx`, `main.py`, docs/usage references.
- **Depends on:** stable search indexing and local storage schema versioning.
- **Not in scope:** remote-hosted catalogs or mandatory online sync.



### Advanced thermal and fan curve tuning

★★★★

- **Goal:** Manual fan profile control with thermal failsafes.
- **Primary work:** hwmon discovery, fan control lifecycle, safety limits, restore-on-unload.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** strict safety validation.
- **Not in scope:** custom graph editor for fan curves.



### Model policy tiers + disclosure UX

★★★★

- **Goal:** Separate open-source and open-weight access with explicit unlock for non-FOSS models.
- **Required behavior:** Tier 1 default `Open-Source only`; Tier 2 `Open-Source + Open-Weight`; Tier 3 `Non-FOSS` via explicit unlock; disclosure label every response; `Read more` links in disclosure and permission rows.
- **Primary work:** model-source metadata, tiered policy in Settings, route guard, disclosure UI, doc links.
- **Files:** `src/index.tsx`, `main.py`, docs/about/permissions references.
- **Depends on:** **Capability Permission Center** and stable model routing.
- **Not in scope:** legal guarantees beyond documented metadata.



### Llama.cpp compatibility evaluation (research spike)

★★★★

- **Goal:** Evaluate first-class llama.cpp runtime/provider support.
- **Primary work:** API formats, streaming, model management, tokenizer/context, Deck constraints.
- **Expected output:** go/no-go, phased path, risk matrix.
- **Files:** `main.py`, runtime/provider abstraction docs, troubleshooting docs.
- **Not in scope:** shipping full production support in the spike.



### Local runtime mode (default) + beta risk warning

★★★★★

- **Goal:** Prefer on-device inference by default; retain remote fallback.
- **Primary work:** `local first` policy, fallback heuristics, health checks, beta warning for in-game inference risk.
- **Files:** `main.py`, `src/index.tsx`, install/troubleshooting docs.
- **Depends on:** provider routing and **Llama.cpp compatibility evaluation** outcomes.
- **Not in scope:** zero performance impact guarantees under heavy load.



### Restricted kids account master lock

★★★★★

- **Goal:** Disable plugin capabilities when Steam reports a restricted kids account; restore when full account returns.
- **Primary work:** parental-restriction detection, global lock above capability checks, banner lifecycle.
- **Required behavior:** lock forces permissions off/blocked while restricted; message clears when full account detected.
- **Files:** `main.py`, `src/index.tsx`, settings/help docs.
- **Depends on:** **Capability Permission Center** and a detectable Steam signal.
- **Not in scope:** bypassing platform restrictions or separate auth systems.



### Strategy checklist workflow (chat-scoped)

★★★★★

- **Goal:** Strategy Guide responses with actionable checklists for the current chat.
- **Primary work:** checklist format, interactive check/uncheck, follow-up sync when user reports progress in text.
- **Files:** `src/index.tsx`, `main.py`, `prompt-testing.md`.
- **Depends on:** **Strategy Guide prompt path (beta)**.
- **Not in scope:** long-term persistence across sessions.



### Global BonsAI quick-launch via Steam Input macro (documentation spike)

★★★★★

- **Goal:** Near-instant BonsAI from in-game or Home via Guide chord → QAM → Decky → BonsAI.
- **Primary work:** Document and test optimal macro sequence (user-specific QAM tab order).
- **Files:** `README.md`, `docs/development.md`.
- **Depends on:** native Steam Input (Guide chord) and QAM layout.
- **Assessment:** High value, zero code maintenance, official tools only.
- **Not in scope:** evdev sniffing, WebSockets, React DOM hacks.



### Voice command input

★★★★★

- **Goal:** Record voice on Deck, transcribe to prompt via local Whisper service.
- **Primary work:** PipeWire recording, transcription RPC, UI states.
- **Files:** `main.py`, `src/index.tsx`, install/troubleshooting docs.
- **Depends on:** user-hosted Whisper endpoint.
- **Not in scope:** wake-word or always-on listening.



### VAC opponent check (phased)

★★★★★

- **Goal:** Flag likely opponents with VAC history during a session, with clear confidence messaging.
- **Phase 1:** Parse user-provided SteamIDs; query ban data.
- **Phase 2:** Live opponent extraction when metadata allows.
- **Primary work:** SteamID normalization, PlayerBans flow, cache/rate limits, confidence, warning UI.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** Steam Web API key and reliable opponent identities.
- **Risks:** private profiles, games without IDs, quota, privacy boundaries, incomplete-data UX.
- **Not in scope:** automated reporting, punitive automation, bypassing protections.



### RAG knowledge base (PC-hosted ingest + Deck query)

★★★★★

- **Status:** Planned — see [rag-sources-research.md](rag-sources-research.md).
- **Goal:** RAG with ChromaDB + `nomic-embed-text` (Ollama `/api/embed`) over a curated corpus; heavy work on user’s PC beside Ollama; Deck queries over LAN.
- **Architecture:** Ollama does not run ingestion — small PC companion (e.g. `bonsai-rag`), Chroma under `~/.bonsai/rag/chroma`, endpoints `POST /v1/refresh`, `POST /v1/query`; inject context **before** hardware + JSON tail in system prompt.
- **Developer tooling:** e.g. `scripts/build_rag_db.py` on dev PC; same embedding contract as runtime.
- **Settings:** plain-language disclosure; **Update knowledge on PC** after confirm; requires **`network_web_access`** when added.
- **Files (expected):** `ollama_service.py`, `main.py`, `capabilities.py`, `settings_service.py`, `settingsAndResponse.ts`, `PermissionsTab`, `pc/` or `scripts/`, `docs/development.md`, `rag-sources-research.md`.
- **Depends on:** Ollama on PC; `nomic-embed-text` pulled on host; optional Reddit API on PC only.
- **Legal:** respect ToS, robots, rate limits; no scraped corpora in git.
- **Not in scope (v1):** Deck-side scrapers, multi-GB DBs in-repo, automatic refresh without user action.



### SteamOS Media screenshot share button (research spike)

★★★★★★

- **Goal:** bonsAI share action in SteamOS Media screenshot browsing → send shot to chat.
- **Primary work:** validate Decky/Steam extension point; map metadata/path into attach flow; document no-go if unsupported.
- **Files:** `src/index.tsx`, Decky API notes, docs.
- **Risk:** likely no-go if private Steam UI patching required.
- **Not in scope:** brittle runtime patching of Steam bundles.



### Deep mod and port configuration manager

★★★★★★

- **Goal:** Detect mod frameworks/files; mod-aware AI guidance.
- **Primary work:** per-game path discovery, mod signals, context injection UX.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** reliable install and compatdata scanning.
- **Not in scope:** downloading/installing mods automatically.

---



## Cross-feature dependency summary

- **Mode selector dropdown (main screen)** (`Strategy Guide` replaces `Thinking`) → **Per-mode latency/timeout profiles**, **Strategy Guide prompt path (beta)**.
- **Character voice roleplay (shipped)** → baseline for **Character accent intensity (shipped)**; presets in [voice-character-catalog.md](voice-character-catalog.md), [src/data/characterCatalog.ts](../src/data/characterCatalog.ts).
- **Character voice roleplay** + avatar mapping → **Higher-resolution character avatars (GTA-style art pass)**.
- **Input sanitizer (shipped)** + **Input handling transparency (shipped)** → future sanitizer extensions should keep user-visible auditability.
- **Strategy Guide prompt path (beta)** → **Strategy Guide safety and spoilers**, **Strategy checklist workflow (chat-scoped)**.
- **Global screenshots and vision** → richer strategy + screenshot context.
- **Capability Permission Center** → gates filesystem, elevated tasks, hardware, and (future) web/search calls.
- **Model policy tiers + disclosure UX** → depends on **Capability Permission Center**; tiered routing.
- **Llama.cpp compatibility evaluation** → informs **Local runtime mode (default)**.
- **Local runtime mode (default)** → provider priority and remote fallback.
- **Restricted kids account master lock** → above permission toggles while restricted.
- **Built on Ollama link** → shipped in About.
- **SteamOS Media screenshot share button** → possible fast path into **Global screenshots and vision** if APIs allow.
- **Reset cache action** → unified-input persistence boundaries.
- **Preset carousel (Phase 1 shipped)** → extends presentation without changing category routing.
- **Bundled VDF parsing** → **Steam Input layout analysis** (and optional deeper parsing).
- **Steam Input settings search + jump** → Phase 1 shipped; broader catalog deferred.
- **Offline intent pack exchange** → offline-first search quality.
- **Settings persistence** → mode profiles, language override, background completion metadata.

```mermaid
flowchart TD
  modeSelector[ModeSelectorDropdownMainScreen] --> perModeProfiles[PerModeLatencyTimeoutProfiles]
  modeSelector --> strategyPath[StrategyGuidePromptPathBeta]
  strategyPath --> strategySafety[StrategyGuideSafetyAndSpoilers]
  strategyPath --> strategyChecklist[StrategyChecklistWorkflowChatScoped]
  visionFeature[GlobalScreenshotsAndVision] --> strategyPath
  mediaShareButton[SteamOSMediaScreenshotShareButtonResearchSpike] --> visionFeature
  resetCacheAction[ResetCacheActionAppState] --> settingsBase
  presetCarousel[PresetCarouselAndTransitionUx] --> strategyPath
  settingsBase[SettingsPersistenceBase] --> perModeProfiles
  settingsBase --> strategySafety
  settingsBase --> multiLanguage[MultiLanguageResponses]
  settingsBase --> backgroundCompletion[BackgroundPromptCompletion]
  settingsBase --> capabilityPermission[CapabilityPermissionCenter]
  capabilityPermission --> modelPolicyTiers[ModelPolicyTiersAndDisclosure]
  modelPolicyTiers --> tierOpenSource[OpenSourceOnly]
  modelPolicyTiers --> tierOpenWeight[OpenSourcePlusOpenWeight]
  modelPolicyTiers --> tierNonFoss[NonFossUnlock]
  kidsLock[RestrictedKidsAccountMasterLock] --> capabilityPermission
  llamaEval[LlamaCppCompatibilityEvaluation] --> localRuntime[LocalRuntimeModeDefault]
  localRuntime --> modelRouting[ModelProviderRoutingLayer]
  tierOpenSource --> modelRouting
  tierOpenWeight --> modelRouting
  tierNonFoss --> modelRouting
  builtOnOllama[BuiltOnOllamaAboutLink] --> aboutTab[AboutTab]
  vdfSupport[BundledVdfParsingSupport] --> steamInput[SteamInputLayoutAnalysis]
```

---

## Implementation notes

### Iconography pass — plugin list icon lesson

Decky sizes icons via CSS `font-size`. Font Awesome works because it renders `<svg width="1em">` which inherits that font-size. An `<img>` with fixed pixel dimensions is ignored — pixel tweaks do not fix it. The fix was inlining SVG path data into `<svg width="1em" height="1em" fill="currentColor">` (`BonsaiSvgIcon`), matching Font Awesome. The `<img>`-based `BonsaiLogoIcon` remains for tab headers where layout is controlled. The source SVG needs `viewBox` for scaling.
