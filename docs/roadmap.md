# bonsAI Roadmap

This document tracks **shipped** work (**[Completed](#completed)**), **active** engineering and QA (**[In Progress](#in-progress)**), and the **backlog** (**[Planned](#planned)**). Operational setup, firewalls, and vision tuning: [troubleshooting.md](troubleshooting.md). QA and regression matrices: [prompt-testing.md](prompt-testing.md), [regression-and-smoke.md](regression-and-smoke.md). Index of all `docs/` files: [README.md](README.md). Refactor notes: [refactor-specialist-sweep.md](refactor-specialist-sweep.md). Release process and versioning: [development.md](development.md), [CHANGELOG.md](CHANGELOG.md).

Star ratings use the GTA scale: `★` easiest … `★★★★★` very high complexity; `★★★★★★` extreme scope.

---

## In Progress

Active features, maintainer tasks, and **known defects**. *QAMP Phase 1 (safe default) is [shipped](#ai-assisted-power-and-long-response-ux). Phase 2 (experimental profile sync) remains backlog-only.*

### Bugs

- ★ **Question Overlay Alignment Drift:** The 3-line question overlay has minor horizontal spacing mismatch vs native `TextField` internals.
- ★★ **D-pad Scroll Bottom Cutoff:** Controller navigation can stop before the final response chunk is fully visible even when touch scroll can reach it.

### Active work

- ★★ **Prompt-testing — finish device matrix:** **MVP ready** (matrices, QAMP rows, optional frozen carousel in [prompt-testing.md](prompt-testing.md)); Deck checkbox pass is **partially complete** — finish remaining scenarios, mark checkboxes, record **Pass / Partial / Fail** with build id in the PR and/or in [prompt-testing.md](prompt-testing.md) / [regression-and-smoke.md](regression-and-smoke.md) as appropriate.

---

## Planned

Backlog items are **not** listed in execution order. Stars are effort/risk within bands. **The April 2026 release-window requirements freeze has ended.**

> **Backlog:** ranked by effort/risk (easiest to hardest within star bands). **Not** an implementation order.

### Near-term

- ★★ **Text Ask model preference chains (user-configurable):** Screenshot/vision tries an ordered fallback list per Ask mode in `[refactor_helpers.py](../refactor_helpers.py)` (`select_ollama_models(..., requires_vision=True)`). **Text-only** paths still use the same fixed per-mode lists today. Add Settings (or import/export JSON) so users can define **ordered text model tags per mode** (Speed / Strategy / Expert), with validation, sane defaults matching the shipped lists, and the same try-next-on-`model not found` behavior as vision.
- ★★ **Prompt Testing and Tuning:** Broader systematic validation and tuning beyond the shipped doc MVP (see **Completed** → Prompt-testing MVP; working matrices in [prompt-testing.md](prompt-testing.md)).
- ★★★ **QAMP Verification Checklist:** Verify behavior across per-game profile modes, QAM reopen, Steam restart/reboot, and GPU-related recommendations.
  - Verify behavior with per-game profile on/off.
  - Verify behavior after closing and reopening the QAM Performance tab.
  - Verify behavior after Steam restart and full reboot.
  - Verify behavior when prompt includes GPU clock recommendations.
- ★★★★★ **QAMP Reflection (Phase 2 — Experimental Opt-In):** Attempt Steam profile sync only behind explicit warning toggles. *Phase 1 (safe default sysfs + user verification copy) is shipped; Phase 2 is unblocked for future scoping, not an active commitment.*
  - Risks: undocumented internals, Steam update breakage, restart/reboot requirements, and profile corruption risk.
  - Candidate path: fragile `config.vdf` / protobuf edits gated behind experimental mode only.

### Per-mode latency/timeout profiles

★★★

- **Goal:** Separate warning and timeout values per selected mode.
- **Primary work:** mode-keyed settings schema and runtime value resolution.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** **Mode selector (main screen)** (shipped).
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
- **Depends on:** **Mode selector (main screen)** (shipped).
- **Not in scope:** guaranteed perfect walkthroughs for every title.

### Strategy Guide safety and spoilers

★★★★

- **Goal:** Useful strategy help without unwanted spoilers by default.
- **Primary work:** spoiler-safe policy, explicit consent for unrestricted spoilers, tap-to-reveal blocks.
- **Settings note:** optional setting to show spoilers directly after consent.
- **Files:** `src/index.tsx`, `main.py`, `prompt-testing.md`.
- **Depends on:** **Strategy Guide prompt path (beta)**.
- **Not in scope:** hard guarantees in every edge case.

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

### Native QAM entry for BonsAI (beneath Decky icon) — decouple research

★★★★★★

- **Goal:** A separate Quick Access Menu (QAM) left-rail entry for BonsAI **directly beneath the Decky Loader icon**, so a Guide-chord macro (and manual navigation) can reach BonsAI with **fewer steps** than the current path through the Decky plugin list (see [troubleshooting.md](troubleshooting.md) § BonsAI shortcut setup).
- **Why not a plugin-only change:** QAM sidebar tiles are governed by the **Steam client** and **Decky Loader** host; individual plugins cannot register a sibling QAM icon from `plugin.json` alone.
- **Research tracks:**
  1. **Decky Loader / plugin API:** Upstream support for pinned QAM entries, deep-linking straight into a plugin, or a launcher row under Decky (docs/issues; may require upstream contribution).
  2. **Steam / SteamOS:** Whether Valve exposes stable third-party QAM tiles without Decky as intermediary (treat as **assumption until validated**).
  3. **Standalone or companion host:** What a non-Decky BonsAI surface would cost (separate surface, Decky-only APIs, TDP/sysfs paths, distribution) — long-range path if (1–2) are unavailable.
- **Related:** **Global BonsAI quick-launch via Steam Input macro** below; when a native entry exists, refresh the macro sequence in [troubleshooting.md](troubleshooting.md).
- **Not in scope:** Shipping a forked Steam client or undocumented UI injection as the default approach.

### Global BonsAI quick-launch via Steam Input macro (documentation spike)

★★★★★

- **Status:** **Baseline doc shipped** — full recipe, delay ladder, tuning, and maintainer **Verification checklist** in [troubleshooting.md](troubleshooting.md) §5; optional macro row in [regression-and-smoke.md](regression-and-smoke.md) §3. Ongoing: refresh if Steam/Decky QAM or Decky list behavior changes, or when **Native QAM entry for BonsAI (beneath Decky icon) — decouple research** (see above) lands (shorter macro).
- **Goal:** Near-instant BonsAI from in-game or Home via Guide chord → QAM → Decky → BonsAI.
- **Primary work:** Document and test optimal macro sequence (user-specific QAM tab order).
- **Files:** `README.md`, `docs/development.md`.
- **Depends on:** native Steam Input (Guide chord) and QAM layout.
- **Related / future UX:** Today’s path assumes **Decky as intermediary**. **Native QAM entry for BonsAI (beneath Decky icon) — decouple research** (above) is the target way to **shorten the macro** once platform or Decky support exists.
- **Assessment:** High value; until a native QAM entry exists, maintenance is mostly documentation and macro tuning. Any future Decky/Steam glue for deep-link or QAM registration would be bounded, small-scope integration — not “zero” work, but still no evdev or DOM hacks.
- **Not in scope:** evdev sniffing, WebSockets, React DOM hacks.

### Pyro talent-manager easter egg (hidden preset)

★★★★

- **Goal (easter egg):** When the user selects **Pyro** (`tf2_pyro`), Pyro has no intelligible in-universe voice — roleplay switches to Pyro’s **representative / Hollywood-style media manager** (Entourage-adjacent hints: **Vince**, **E**, “the agency”) as parody voice archetype without claiming third-party likeness.
- **Persona:** Obnoxious agent energy — talks about themselves, bragging; **self-aware** about existing inside BonsAI; **moonlights** as an OSS advocate and nudges the player toward **testing or contributing** to the repository (playful, not deceptive).
- **Secret tip mechanic:** At the end of (some) replies, the manager **tips a hidden preset**; the UI **injects** it into the main-tab suggestion carousel as a distinguished chip.
- **Carousel exception:** Injection may appear **after** the normal post-mount carousel rest window (`PRESET_CAROUSEL_ACTIVE_MS`, 60 s in `src/components/PresetAnimatedChips.tsx`) — an explicit exception to the usual “no new cycles after session end” behavior for this chip only.
- **Chrome:** That chip uses a **persistent orange–red outline** until cleared (exact design token TBD at implementation).
- **Clear conditions:** Clear the injected chip styling / pin when the user **sends the next Ask** or **resets the plugin session** (implementation TBD: Decky reload vs explicit in-app reset).
- **Primary work:** Special-case roleplay branch in `backend/services/ai_character_service.py` (or adjacent helper); optional **structured metadata** from backend (preset id / inject flag) vs fragile reply parsing (open design choice); `PresetAnimatedChips.tsx`, `MainTab.tsx` / `src/index.tsx` for highlight/inject lifecycle.
- **Depends on:** **Character voice roleplay (shipped)**; preset carousel behavior in **Preset carousel and transition UX** (shipped Phase 1).
- **See also:** [voice-character-catalog.md](voice-character-catalog.md) (Pyro / voice handling); compare current `tf2_pyro` style hint (“wordless playful menace”).
- **Not in scope:** Ensuring the joke lands in every locale or model.

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
- **Settings:** plain-language disclosure; **Update knowledge on PC** after confirm; requires `**network_web_access`** when added.
- **Files (expected):** `ollama_service.py`, `main.py`, `capabilities.py`, `settings_service.py`, `settingsAndResponse.ts`, `PermissionsTab`, `pc/` or `scripts/`, `docs/development.md`, `rag-sources-research.md`.
- **Depends on:** Ollama on PC; `nomic-embed-text` pulled on host; optional Reddit API on PC only.
- **Legal:** respect ToS, robots, rate limits; no scraped corpora in git.
- **Not in scope (v1):** Deck-side scrapers, multi-GB DBs in-repo, automatic refresh without user action.

### Deep mod and port configuration manager

★★★★★★

- **Goal:** Detect mod frameworks/files; mod-aware AI guidance.
- **Primary work:** per-game path discovery, mod signals, context injection UX.
- **Files:** `main.py`, `src/index.tsx`.
- **Depends on:** reliable install and compatdata scanning.
- **Not in scope:** downloading/installing mods automatically.

### Reference — vision model fallback order

When a screenshot is attached, `select_ollama_models(..., requires_vision=True)` in `[refactor_helpers.py](../refactor_helpers.py)` picks the try-next chain. Defaults are **FOSS-first** and **~16GB VRAM–friendly** (llava / qwen2.5vl first, then smaller open-weight multimodal tags). **Settings → Model policy → Allow high-VRAM model fallbacks** appends large tags (e.g. 31B / 38B class) after the safe chain. **Speed** prefers the smallest FOSS vision tags first; **Strategy** leads with `qwen2.5vl:latest`; **Expert** prefers stronger FOSS vision within the safe list before open-weight midsize tags. Exact strings evolve with the Ollama library; install the tags you care about on the host.

---

## Completed

Headings group related work. Star counts match the historical list.

### Release and distribution

- ★★ **Decky plugin release `.zip` (CI) + clean install proof:** [`.github/workflows/build-plugin-zip.yml`](../.github/workflows/build-plugin-zip.yml) builds the shippable zip via Decky CLI on **`v*` tags** and **workflow_dispatch**; [`scripts/verify-decky-plugin-zip.sh`](../scripts/verify-decky-plugin-zip.sh) enforces the same file layout as deploy (`main.py`, `refactor_helpers.py`, `py_modules/backend/services/`, `dist/`). Maintainer flow and versioning: [development.md](development.md) → **Release (plugin zip)**. **QA log template:** [regression-and-smoke.md](regression-and-smoke.md) §5 — run README-only path from **no Ollama yet**, then record Pass/Partial/Fail (human gate).
- ★★ **README — end-user install and usage:** [README.md](../README.md) gives **plain, step-by-step** guidance for **(1)** installing **Ollama** (Deck vs PC, official download or repo helper scripts; firewall/`OLLAMA_HOST` in [troubleshooting.md](troubleshooting.md)), **(2)** obtaining and installing the bonsAI plugin (**`.zip`** from e.g. GitHub Release, load in Decky Loader), **(3)** **using the app** (Decky/QAM, Ollama host/base URL in Settings, pull a model, Ask, optional permissions). Troubleshooting deep-dives remain in `docs/`, not the main path.

### First-run and prompts

- ★ **Beta Disclaimer Modal:** Show one-time experimental-software warning with risk acknowledgment and bug-report link.
- ★ **Suggested AI Prompts:** Show curated prompt presets, randomize initial suggestions, and generate contextual follow-ups after responses.
- ★★ **Prompt-testing MVP:** [prompt-testing.md](prompt-testing.md) — scenario matrices (incl. QAMP verification), checklist workflow, and **optional frozen preset carousel** for repeatable main-tab chips (`TEMP_PRESET_CAROUSEL_FROZEN` / `TEMP_CAROUSEL_FROZEN_TEXTS` in `src/data/presets.ts`). **Status:** MVP ready for contributors; Deck checkbox pass **partially complete** (see **In Progress**).
- ★★ **Input sanitizer lane (hybrid):** Deterministic Ask cleanup and conservative block before Ollama; default on; no Settings UI. Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize` (exact whole message, trim + casefold) persist `input_sanitizer_user_disabled` via `save_settings` and return confirmation without calling the model. Backend `backend/services/input_sanitizer_service.py`, `main.py` (`ask_game_ai` / `start_background_game_ai`); frontend types and completion path in `src/index.tsx`; phrase constants in `src/data/inputSanitizerCommands.ts`.
- ★★★ **Input Handling Transparency Panel:** Main tab **Input handling (last Ask)** shows raw input, sanitizer path, system/user text sent to Ollama, model name, and raw vs final reply; **Run original** / **Copy JSON**. Optional Settings **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`) appends full trace markdown to `bonsai-ask-trace-YYYY-MM-DD.md` when filesystem writes are allowed. Backend `get_input_transparency`, `_persist_input_transparency`, `append_desktop_ask_transparency_sync` in `desktop_note_service.py`; `main.py`; UI `MainTab.tsx`, `src/utils/inputTransparency.ts`.

**Also counted in shipped baseline (not separate checklist lines above):** background prompt completion (V1); Linux Ollama compatibility.

### Connection, routing, diagnostics, and timeouts

- ★★ **Ollama Network Routing Fix:** Route frontend requests through Decky backend (`call("ask_game_ai", ...)`) to resolve cross-origin failures.
- ★★ **Deck and PC Connection Settings:** Add connection-focused settings including visible Deck IP and PC IP management.
- ★★ **Diagnostic, Latency, and Timeout Warnings:** Return `elapsed_seconds`, show slow-response warnings, and enforce backend timeout messaging.
- ★★ **Configurable Latency and Timeout Controls:** Persisted warning + timeout in `settings.json`; Settings Connection uses one Steam `SliderField` for hard timeout with a visible soft-warning readout (`ConnectionTimeoutSlider.tsx`), and ordering is reconciled on load/updates.
- ★★ **Ollama model VRAM retention (`keep_alive`):** Persisted `ollama_keep_alive` with fixed preset durations (default **5 minutes**); Settings → Connection `OllamaKeepAliveSlider.tsx`; value passed on each Ask through `main.py` into `backend/services/ollama_service.py`. `settings_service.py`, `settingsAndResponse.ts`.

### Tabs, icons, and unified ask flow

- ★★ **Iconography Pass (Tabs + Plugin + Ask Button):** Add icons to all tabs (bonsAI bonsai-tree icon, Settings gear, Debug bug, About unchanged), switch plugin icon to bonsai SVG, and show the stock diamond beside `Ask` text.
- ★★ **Persist Last Question and Answer:** Restore prior session state when reopening QAM via Decky settings storage.
- ★★ **Unified Search + Ask Input:** Merge settings search and AI question entry into one shared input flow.
- ★ **Preset Chip Fade Opt-Out:** Settings `ToggleField` **Preset chip fade animation** (persisted `preset_chip_fade_animation_enabled`, default on). When off, main-tab suggestion chips stay opaque and rotate prompts without opacity transitions; post-Ask re-seed unchanged. `PresetAnimatedChips.tsx`, `MainTab.tsx`, `settingsAndResponse.ts`, `settings_service.py`.
- ★★★ **Mode selector (main screen):** Persisted `ask_mode` (`speed` / `strategy` / `deep`, UI labels Speed / Strategy / Deep). Compact outline control (green / bronze / gold) on the unified input strip, left of mic/stop, opens an anchored popover menu to change mode (no layout reflow); D-pad focus order is text field → mode → mic/stop. Backend orders Ollama model fallbacks per mode in `refactor_helpers.py`; `start_background_game_ai` includes `ask_mode`. `src/data/askMode.ts`, `src/components/AskModeMenuPopover.tsx`, `MainTab.tsx`, `index.tsx`, `settingsAndResponse.ts`, `settings_service.py`, `main.py`.
- ★★ **Debug tab opt-in (Settings):** Persisted `show_debug_tab` (default **false**); **Debug** omitted from the tab strip until **Show Debug tab** is enabled in Settings; safe tab switch when turning the toggle off while on **Debug**. `src/index.tsx`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Settings tab trim:** **Trim the fat** on Settings: fewer simultaneous controls per view, clearer `PanelSection` grouping, progressive disclosure, shorter helper copy on toggles and sliders; dedicated Settings composition (`SettingsTab.tsx` and related controls).
- ★★★ **Reset session cache (app state):** Settings → Advanced **Reset session cache…** with confirm modal; `resetPluginSession()` clears in-memory unified search, reply, thread, transparency, branch picker, attachments, and timers. Does **not** change persisted `settings.json`, host Ollama history, or screenshot files. `src/index.tsx`.

**Baseline index:** preset carousel and transition UX (Phase 1 — fade/hold; manual arrows deferred).

### AI-assisted power and long-response UX

- ★★★ **TDP Automation via AI Output:** Parse AI recommendations and apply constrained TDP values through safe sysfs write paths.
- ★★★ **QAMP Reflection (Phase 1 — Safe Default):** After a sysfs TDP apply, the main tab shows an explicit **TDP nW** confirmation plus re-open **QAM → Performance** guidance (`formatAppliedTuningBannerText` / `buildResponseText` in [src/utils/settingsAndResponse.ts](../src/utils/settingsAndResponse.ts), [src/components/MainTab.tsx](../src/components/MainTab.tsx)). GPU MHz from the model is labeled **recommendation only** (not written in sysfs in this build). On-Deck QAMP / restart checks: [prompt-testing.md](prompt-testing.md) § QAMP Verification. **Phase 2** (Steam profile / experimental opt-in) remains in [Planned](#near-term) — *blocked until explicitly scoped*.
- ★★★ **D-pad Response Scrolling:** Split long responses into focusable chunks for controller-first navigation.

### Steam Input

- ★★★★★ **Steam Input Jump (Phase 1):** Debug tab jump to per-game controller config via `steam://controllerconfig/{appId}` (`SteamClient.URL.ExecuteSteamURL`), versioned lexicon in `src/data/steam-input-lexicon.ts`, helper in `src/utils/steamInputJump.ts`. Documented in [steam-input-research.md](steam-input-research.md). **Phase 2+** (indexed search, full catalog, ranked results) is **not** planned to continue.
- ★★ **Global quick-launch macro (documentation + verification checklist):** Guide-chord path QAM → Decky → bonsAI with **Fire Start Delay** and per-user rail depth documented in [troubleshooting.md](troubleshooting.md) §5; [README.md](../README.md) quick-launch blurb; optional device check in [regression-and-smoke.md](regression-and-smoke.md) §3 (Plugin shell). On-device **Last verified** line in §5 is maintainer-updated when hardware is exercised.
- ★ **Shortcut setup keywords (Ask, no Ollama):** `bonsai:shortcut-setup-deck` and `bonsai:shortcut-setup-stadia` typed in Ask (optional leading `/`); `backend/services/shortcut_setup_commands.py`; response + optional **Open Controller settings**; documented in [troubleshooting.md](troubleshooting.md) §5 and [prompt-testing.md](prompt-testing.md). **Not in scope:** auto-writing Steam Input / VDF (see [steam-input-research.md](steam-input-research.md)).

### About tab and main surface polish

- ★ **Built on Ollama Link (About Tab):** “Built on Ollama” button in About opens `https://github.com/ollama/ollama` via `Navigation.NavigateToExternalWeb` (toast fallback), wired from `OLLAMA_UPSTREAM_REPO_URL` in `src/index.tsx` and `src/components/AboutTab.tsx`.
- ★★ **Search Surface Glass Pass (Unified Input):** Glass-style unified search field and ask bar (~25% fill, blur, light edge), 50% opacity on corner action icons, dynamic height for the input shell from wrapped text, AI answer chunks use matching glass instead of near-black panels.

### Desktop notes (Game Mode → Desktop)

- ★★★ **Desktop Mode Debug Note Save (Steam Deck, V1):** After a successful ask, **Save to Desktop note…** on the main tab opens a consent + name dialog; append-only writes to `~/Desktop/BonsAI_notes/<name>.md` with UTC timestamps and Q+A (`append_desktop_debug_note` in `main.py`, `backend/services/desktop_note_service.py`, `DesktopNoteSaveModal` + `MainTab` in `src/`).
- ★★★ **Desktop Mode Debug Note Save — Daily chat auto-save (V2):** Settings tab toggle (`desktop_debug_note_auto_save`, default off). When enabled with Filesystem writes, each **Ask** and each **AI response** append to `~/Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md` (UTC calendar day); Ask entries list attached screenshot paths. Backend `append_desktop_chat_event`; `src/index.tsx` Settings + ask/response hooks.

### Permissions and capability gating

- ★★★★ **Capability Permission Center (User-Controlled Access):** Permissions tab (lock icon, same title scale as other tabs) with toggles for filesystem writes, hardware control (TDP apply), media library access (screenshot attach), and external/Steam navigation (About links, Debug Steam Input jump). Persisted `settings.json` `capabilities`; new installs default OFF; legacy installs without a `capabilities` block are grandfathered ON until saved. Backend enforces gates on `append_desktop_debug_note`, `append_desktop_chat_event`, `list_recent_screenshots`, ask-with-attachments, TDP apply, `capture_screenshot`. Files: `backend/services/capabilities.py`, `PermissionsTab`, `main.py`, `src/utils/settingsAndResponse.ts`.
- ★★★★ **Model policy tiers + disclosure UX:** Persisted `model_policy_tier` / `model_policy_non_foss_unlocked` and related allow-high-VRAM flag; Settings **Model policy** (tier chips, unlock flow, README link); backend `backend/services/model_policy.py` classifies model tags and enforces tier when selecting fallbacks; successful replies can include **Model source disclosure** on Main. `src/data/modelPolicy.ts`, `MainTab.tsx`, `src/utils/inputTransparency.ts`, `main.py`, [README.md](../README.md) § Model policy tiers.

**Baseline index:** global screenshots and vision (V1) — multimodal attach; uses media-related capability paths.

### Character voice roleplay

- ★★★ **Character Voice Roleplay Mode (Opt-In):** Default-off **AI character** in Settings (small caps label); fullscreen `CharacterPickerModal` with per–work-title groups, **Random** toggle, custom line, OK/Cancel; unique pixel emoticons; main-tab glass avatar opens picker; backend `ai_character_service.build_roleplay_system_suffix` appends roleplay instructions to the Ollama system prompt. `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `main.py`, `settings.json` fields `ai_character_*`.
- ★★ **Character Accent Intensity Levels (Doom-Style Copy):** Settings **Accent intensity** horizontal chips (`subtle` / `balanced` / `heavy` / `unleashed`, default `balanced`) when AI characters are on; Doom-difficulty–flavored short labels and helper copy. Persisted `ai_character_accent_intensity`; `build_roleplay_system_suffix` varies dialect/accent strength for presets, random, and custom paths without changing TDP/JSON policy. `src/data/aiCharacterAccentIntensity.ts`, `src/index.tsx`, `backend/services/ai_character_service.py`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Running-game character suggestions (AI picker):** On `CharacterPickerModal` open, read `Router.MainRunningApp`, resolve 1–3 catalog presets via `src/utils/runningGameCharacterSuggestions.ts` (Steam AppID map + normalized title match + TF2 merge), show **Playing:** headline and suggestion row with `CharacterRoleplayEmoticon`; async after first paint with delayed spinner (~160 ms); D-pad links Random, suggestions, column 0, and custom field.
- ★★ **Random character “?” avatar (picker + main):** When **Random** is on, picker tile, main-tab glass avatar, and related summary chips use a single **“?”** affordance. `CharacterRoleplayEmoticon.tsx`, `CharacterPickerModal.tsx`, `MainTab.tsx`.
- ★★★ **Character-derived UI accent theme (preset-selected):** With AI character on and a fixed catalog preset (not Random / not custom), accent tokens follow `src/data/characterUiAccent.ts` and catalog-driven colors; **AI character off**, **Random**, and **Custom** stay bonsAI forest green. `src/index.tsx` scoped CSS / token wiring, `MainTab.tsx`, `CharacterPickerModal.tsx`.

### Shipped detail (extensions and deferred phases)

> Items here mirror **Completed** above with roadmap-style detail, follow-on notes, and deferred phases.

#### Character accent intensity levels (Doom-style copy)

★★

**Shipped** — see **Completed** → Character voice roleplay; `ai_character_accent_intensity`; backend varies by `subtle` / `balanced` / `heavy` / `unleashed`.

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
- **Not in scope:** arbitrary paths outside `~/Desktop/BonsAI_notes/`, silent writes without permission, or replacing note content by default.

#### Preset carousel and transition UX

★★★★

- **Status (Phase 1):** Shipped — three chips, staggered fade, length-based hold; `PresetAnimatedChips.tsx`, `src/data/presets.ts`, scoped CSS in `src/index.tsx`; notes in `docs/prompt-testing.md`.
- **Deferred:** lower-right arrow controls for manual next/previous and controller focus (not in Phase 1).
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
- **Files:** `src/index.tsx`, `main.py`, [steam-input-research.md](steam-input-research.md).
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

## Appendix

Dependency graph and implementation notes that are not feature checklist items.

### Cross-feature dependency summary

- **Mode selector (main screen)** (shipped: Speed / Strategy / Deep + model fallbacks) → **Per-mode latency/timeout profiles**, **Strategy Guide prompt path (beta)**.
- **Character voice roleplay (shipped)** → baseline for **Character accent intensity (shipped)**; presets in [voice-character-catalog.md](voice-character-catalog.md), [src/data/characterCatalog.ts](../src/data/characterCatalog.ts).
- **Character voice roleplay (shipped)** → **Pyro talent-manager easter egg (hidden preset)** (planned).
- **Character voice roleplay** + avatar mapping → **Higher-resolution character avatars (GTA-style art pass)**.
- **Character voice roleplay (shipped)** → **Character-derived UI accent theme (preset-selected)** (shipped — see **Completed**); **Random character “?” avatar** (shipped — see **Completed**); **Running-game character suggestions (AI picker)** (shipped — see **Completed**).
- **Input sanitizer (shipped)** + **Input handling transparency (shipped)** → future sanitizer extensions should keep user-visible auditability.
- **Strategy Guide prompt path (beta)** → **Strategy Guide safety and spoilers**, **Strategy checklist workflow (chat-scoped)**.
- **Global screenshots and vision** → richer strategy + screenshot context.
- **Capability Permission Center** → gates filesystem, elevated tasks, hardware, and (future) web/search calls.
- **Model policy tiers + disclosure UX (shipped)** → layered on **Capability Permission Center**; tiered routing + per-reply disclosure — see **Completed** → Permissions.
- **Llama.cpp compatibility evaluation** → informs **Local runtime mode (default)**.
- **Local runtime mode (default)** → provider priority and remote fallback.
- **Restricted kids account master lock** → above permission toggles while restricted.
- **Built on Ollama link** → shipped in About.
- **SteamOS Media screenshot share button** → possible fast path into **Global screenshots and vision** if APIs allow.
- **Reset session cache (shipped)** → in-memory unified-input / reply state only; see **Completed** → Tabs.
- **Preset carousel (Phase 1 shipped)** → extends presentation without changing category routing; **Pyro talent-manager easter egg** depends on it for inject + `PRESET_CAROUSEL_ACTIVE_MS` exception semantics.
- **Global BonsAI quick-launch via Steam Input macro** ↔ **Native QAM entry for BonsAI (beneath Decky icon) — decouple research** (shorter macro once a direct QAM tile exists).
- **Bundled VDF parsing** → **Steam Input layout analysis** (and optional deeper parsing).
- **Steam Input settings search + jump** → Phase 1 shipped; broader catalog deferred.
- **Offline intent pack exchange** → offline-first search quality.
- **Settings persistence** → mode profiles, language override, background completion metadata; **Debug tab opt-in (Settings)** (shipped — see **Completed** → Tabs).

```mermaid
flowchart TD
  modeSelector[ModeSelectorMainScreenShipped] --> perModeProfiles[PerModeLatencyTimeoutProfiles]
  modeSelector --> strategyPath[StrategyGuidePromptPathBeta]
  strategyPath --> strategySafety[StrategyGuideSafetyAndSpoilers]
  strategyPath --> strategyChecklist[StrategyChecklistWorkflowChatScoped]
  visionFeature[GlobalScreenshotsAndVision] --> strategyPath
  mediaShareButton[SteamOSMediaScreenshotShareButtonResearchSpike] --> visionFeature
  resetCacheAction[ResetSessionCacheShipped] --> settingsBase
  presetCarousel[PresetCarouselAndTransitionUx] --> strategyPath
  settingsBase[SettingsPersistenceBase] --> perModeProfiles
  settingsBase --> strategySafety
  settingsBase --> multiLanguage[MultiLanguageResponses]
  settingsBase --> backgroundCompletion[BackgroundPromptCompletion]
  settingsBase --> capabilityPermission[CapabilityPermissionCenter]
  capabilityPermission --> modelPolicyTiers[ModelPolicyTiersDisclosureShipped]
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
  characterVoiceRoleplay[CharacterVoiceRoleplayShipped] --> pyroManagerEgg[PyroTalentManagerEasterEgg]
  presetCarousel --> pyroManagerEgg
  nativeQamBonsai[NativeQamBonsaiDecoupleResearch] -.->|shorter macro when shipped| globalQuickLaunch[GlobalBonsaiQuickLaunchSteamInputDoc]
```

### Implementation notes

#### Iconography pass — plugin list icon lesson

Decky sizes icons via CSS `font-size`. Font Awesome works because it renders `<svg width="1em">` which inherits that font-size. An `<img>` with fixed pixel dimensions is ignored — pixel tweaks do not fix it. The fix was inlining SVG path data into `<svg width="1em" height="1em" fill="currentColor">` (`BonsaiSvgIcon`), matching Font Awesome. The `<img>`-based `BonsaiLogoIcon` remains for tab headers where layout is controlled. The source SVG needs `viewBox` for scaling.
