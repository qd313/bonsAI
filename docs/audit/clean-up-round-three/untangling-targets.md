# Untangling targets for plan 86 step 6 (settings, D-pad helpers, hand-downs)

Written 2026-10-16 by the plan 86 step 2 untangling reviewer (Sonnet 5.5 high), from the records of batches b02, b09,
b18, b20, b24, b25, b28, b30, b34, b35, b38, b42, b47 and b59 plus the digest of all 297 records with something in
their untangle field, on `experimental` at `b5ce2768`. Every line number is a line at `b5ce2768`. Nothing was changed;
the only commands run were `git grep`, `git log`, `sed`, `wc`, the project's own `scripts/shell_seam.mjs` (read-only,
prints to the screen) and small read-only scripts kept outside the repo.

## In plain words

Nothing here changes what a player sees. This file is the map for step 6, the riskiest step: three knots that make the
plugin slow to change. What I found, in the order of the plan:

- **Adding one setting means writing it in about twelve places today** (plan 86 says about eight). One back-end
  table, two screen type lists, one screen rule table, one save translation, one name table, the plugin's main screen,
  the tab's own hand-over file (three spots), the tab itself, and two check files. A one-line list can replace the
  tables and the translation (about half of the twelve). It cannot replace the main screen and the hand-over files
  unless step 6c also lands: those places go away only when tabs read settings themselves. So "2 or 3 places" is
  honest for 6a plus the settings part of 6c together, not for 6a alone.
- **There are 53 settings today, 49 after the removals** (the Steam key, the two UI scale settings and the read-aloud
  setting go; the Steam permission switch inside the permissions block goes too). Five settings no tab shows.
- **The plan's "eight D-pad helpers" are the eight files it names, but they are not all of them.** About fourteen more
  files keep their own memory of D-pad stops, and a handful of them (a copy of the nav helper for one chip, a copy of
  the return-focus helper for one list, the Search tab's back line) were written after the plan's starting commit.
  Plan 86 § 5 says a ninth helper means stop and ask. This is the biggest open question below.
- **The main screen hands 218 separate things to seven tabs** (the project's own counter says 211 because it skips the
  Search tab). Just under half are settings and their setters. A fair goal is 40 or fewer in all.
- **Two things in the plan's wording need a correction:** the shared "hostile input" check file is 64 hand-written
  cases and cannot be made from a list, and AGENTS.md says the only direct call to Steam's focus transfer is inside the
  nav helper; there are 20 such calls in 17 other files (only 5 of them with the window check Steam's transfer needs on a game screen).

---

# 6a. Each setting written once

## 6a-1. Three settings traced end to end

All three are traced from the saved name to every place that names it. "Silent" means nothing fails if the place is
forgotten; "loud" means the type check or a test fails.

### A true/false setting: `preset_single_chip` ("Show one chip instead of two")

Changed on the Settings tab, read by the Main tab.

| Where | File:line | What is written there | If forgotten |
|---|---|---|---|
| Back end rule | `py_modules/backend/services/settings_service.py:477` | row `"preset_single_chip": _bool_default_false` in `_SIMPLE_FIELDS` (L466-525) | loud (defaults contract, Python half) |
| Shared check, defaults | `tests/contracts/settings-defaults.json:36` | `"preset_single_chip": false` | loud |
| Shared check, hostile | `tests/contracts/settings-hostile-inputs.json:414` | one case (an old file with no value loads two chips) | silent (a case is optional) |
| Screen type, saved names | `src/data/bonsaiSettingsSchema.ts:138` | `preset_single_chip: boolean` in `BonsaiSettings` (L112-233) | loud |
| Screen type, screen names | `src/data/bonsaiSettingsSchema.ts:249` | `presetSingleChip: boolean` in `BonsaiSettingsSnapshotInput` (L236-294) | loud |
| Screen rule | `src/data/bonsaiSettingsNormalizers.ts:466` | `preset_single_chip: boolDefaultFalse` in `SIMPLE_FIELDS` (L459-548) | loud (return type needs every key) |
| Save translation | `src/utils/settingsPayload.ts:64` | `preset_single_chip: input.presetSingleChip` | loud |
| Name table | `src/hooks/usePluginSettings.ts:137` | `presetSingleChip: "preset_single_chip"` in `SETTINGS_FIELD_BACKEND_KEY`; the setter `setPresetSingleChip` is made from it at run time | loud |
| Plugin root, take | `src/index.tsx:320-321` | value and setter in the destructure of `usePluginSettings()` (L285-389) | loud if used later |
| Plugin root, give | `src/index.tsx:894`; `:1045-1046` | handed to `useMainTabPayload` and to `useSettingsTabPayload` | loud (required prop) |
| Main payload hook | `src/features/plugin-shell/tabs/useMainTabPayload.tsx:158`, `:270`, `:382` | destructure, JSX attribute, **rebuild list** | rebuild list: **silent** |
| Settings payload hook | `.../useSettingsTabPayload.tsx:63-64`, `:102-103`, `:130` | destructure, JSX attribute, **rebuild list** (setter left out on purpose) | rebuild list: **silent** |
| Tab component | `src/components/SettingsTab.tsx:123`, `:175`, `:198`, `:305` | props type, destructure, fold summary value, the switch | loud / the control is the feature |
| Main-tab chain | `src/components/MainTab.tsx:77`, `:392`; `MainTabPresetRow.tsx:109,149,246`; `src/features/preset-carousel/presetChipShared.ts:85`; `presetDecodeSlots.tsx:93-98` | hand-down to where it is read | the use, not another place it is written |
| Tests | `usePluginSettings.readBack.test.ts:74`, `settingsContracts.test.ts` (3), `bonsaiSessionSurvival.test.ts`, `useBonsaiAskOrchestration.test.ts`, `src/components/ringTestProps.ts:35`, five `SettingsTab.*.test.tsx` files that build full props | one row each | the read-back row is loud; the full-props helpers fail the type check |

In all: 40 non-test lines in 18 files, plus 19 test files. Twelve are real "writes", the rest is the Main tab using it.

### A choice from a list: `chat_text_size` (Text size: small, normal, large)

| Where | File:line | What is written there |
|---|---|---|
| Back end rule | `settings_service.py:510` | `_enum(frozenset({"small","normal","large"}), "normal", strip=True)` (the list is typed again here, not shared) |
| Shared checks | `settings-defaults.json:17`; `settings-hostile-inputs.json:507, 510, 516, 519, 526` | default; three cases |
| Screen types | `bonsaiSettingsSchema.ts:73` (the three names), `:121`, `:242`, `:313-314` (`DEFAULT_CHAT_TEXT_SIZE`, `CHAT_TEXT_SIZE_OPTIONS`) | the list is written again as a type and again as an array |
| Screen rule | `bonsaiSettingsNormalizers.ts:82-83` (imports), `:490` | row `enumOf(CHAT_TEXT_SIZE_OPTIONS, DEFAULT_CHAT_TEXT_SIZE, {trim:true})` |
| Translation, name table | `settingsPayload.ts:57`; `usePluginSettings.ts:130` | one row each |
| Plugin root | `src/index.tsx:292-293` (take); `:623-626`, `:641` (feeds the text scale); `:1008-1011` (a value+setter bundle, `chatTextSizeSetting`, made to save one hand-down); `:1020` (give) | five spots, not three |
| Settings payload hook | `useSettingsTabPayload.tsx:38`, `:77`, `:110` | destructure, attribute, rebuild list |
| Tab | `SettingsTab.tsx:35, 71, 106, 163, 195, 264`; `SettingsTabChatTextSizeRow.tsx` (the row, 12 lines) | props, row |
| Fold summary (plan 91) | `src/features/folded-tabs/settingsTabFolds.ts:28`, `:64` (`CHAT_TEXT_SIZE_LABEL`), `:134`, `:151` | a label table and a summary line for the folded section |
| Consumers | `src/data/chatTextSize.ts`, `usePublishTextScale.ts`, `src/styles/sections/textPx.ts`, `ChatTitleView.tsx` | use it |
| Tests | 21 test files; the hostile cases above | |

A choice costs two extra writes the true/false one does not: the list of valid values (back end, screen type, screen
array, three copies) and the label and fold-summary tables on a folded tab.

### A number: `stream_scramble_settle_ms` (Developer tab, 100 to 1000, default 400)

| Where | File:line | What is written there |
|---|---|---|
| Back end constants and rule | `settings_service.py:245-247` (default, min, max), `:522-523` | row `_clamped_whole_number(DEFAULT, MIN, MAX)` |
| Shared checks | `settings-defaults.json:51`; `settings-hostile-inputs.json` (7 cases, L595-657) | default; clamp, truncate, string, bool, null cases |
| Screen types and constants | `bonsaiSettingsSchema.ts:232`, `:293`, `:361-365` (default, min, max, five quick-pick buttons) | the three limits are written in both languages |
| Screen rule | `bonsaiSettingsNormalizers.ts:78`, `:98-99` (imports), `:543-547` | row `clampedWholeNumber(DEFAULT, MIN, MAX)` |
| Translation, name table | `settingsPayload.ts:104`; `usePluginSettings.ts:177` | |
| Plugin root | `src/index.tsx:380-381` (take); `:869-886` (bundled with its three siblings into one `streamScramble` object and one `onStreamScrambleChange`) | **no tab hand-over edit** |
| Tab hand-over | none: `useDeveloperTabPayload.tsx:74-75, 111` carries the bundle | |
| Control | `src/components/developerRowsAnimations.tsx:32, 108` | five quick-pick buttons |
| Tests | `readBack:89`, `bonsaiSessionSurvival.test.ts`, `useBonsaiAskOrchestration.test.ts`, `settingsContracts.test.ts` (3), `tests/test_settings_service.py` (1) | |

This one shows the model for 6c: because four settings travel as one object, a new member of that group touches no
hand-over file.

## 6a-2. Places a new setting is written by hand today

For a setting with an ordinary rule (true/false, one of a list, a number, a bounded text), shown on one tab, read on
that tab. A setting read on a second tab adds that tab's three spots too.

| # | Place | File and table or function | Miss is |
|---|---|---|---|
| 1 | Back-end rule | `settings_service.py` `_SIMPLE_FIELDS` (L466-525); constants and valid lists (L224-299, L350-373) | loud, by the defaults contract |
| 2 | Back-end main file constants (only for the three rules that need them) | `main.py:246-264` (`Plugin` constants), `_sanitize_settings` (L335-347) | silent |
| 3 | Shared check, defaults | `tests/contracts/settings-defaults.json` | loud |
| 4 | Shared check, hostile (optional) | `tests/contracts/settings-hostile-inputs.json` | silent |
| 5 | Screen type, saved names | `bonsaiSettingsSchema.ts` `BonsaiSettings` (L112-233) | loud |
| 6 | Screen type, screen names, and its limits | same file: `BonsaiSettingsSnapshotInput` (L236-294), constants (L302-365) | loud |
| 7 | Screen rule | `bonsaiSettingsNormalizers.ts` `SIMPLE_FIELDS` (L459-548) or a function plus the return block (L577-609) | loud |
| 8 | Save translation | `settingsPayload.ts` `toBonsaiSettingsPayload` (L51-105) | loud |
| 9 | Name table | `usePluginSettings.ts` `SETTINGS_FIELD_BACKEND_KEY` (L124-178) | loud |
| 10 | Plugin root | `src/index.tsx` destructure (L285-389) and the tab call (L888-1146) | loud |
| 11 | Tab hand-over file | `src/features/plugin-shell/tabs/use<Tab>TabPayload.tsx`: destructure, attribute, rebuild list | rebuild list silent |
| 12 | Tab and its control | the tab's props type, destructure, the row; on a folded tab also `settingsTabFolds.ts` (label table, summary line) and the tab's focus chain | loud / is the feature |
| 13 | Tests that spell a full settings object | `usePluginSettings.readBack.test.ts` `NON_DEFAULT` (L39-100), `bonsaiSessionSurvival.test.ts` (L30-81), `settingsContracts.test.ts` (L334-405, L542-617), `useBonsaiAskOrchestration.test.ts`, `src/components/ringTestProps.ts` (L15-82), `SettingsTab.accentMenuRing.test.tsx` (L38-74), `SettingsTab.clearAllBack.test.tsx` (L43-79), `DeveloperTab.folded.test.tsx` (L26-59) | loud (types), and the read-back row is checked by a test |

Counting the two languages and the shared files as separate places: 1-4 are back end and shared, 5-9 screen data, 10-12
screen wiring, 13 tests. That is **12 places in production code and 8 test files** that spell the whole list. The
plan's "about 8" is one way of counting the same places (merging 5 with 6, 1 with 2, and leaving out 3, 4, 11 to 13).

**Silent places** (nothing catches a miss): the rebuild list in each payload hook (11), the optional hostile case (4),
the `main.py` constants (2), and any rule that differs between the two languages and has no hostile case (see 6a-4).
`useMainTabPayload.tsx` already shows the cost: its rebuild list leaves out 12 changing values (named in 6c).

**Python test copies of the plugin's constants:** `tests/test_settings_contract.py:21-32` and
`tests/test_settings_hostile_contract.py:21-32` each copy the ten values `main.py` passes to `sanitize_settings`.
Three copies of the same ten values, one of them in code that ships.

**Permissions are a second list** (the six on/off switches inside `capabilities`), written in nine places: back-end
`capabilities.py:72-82` (`CAPABILITY_KEYS`) and `:118-127` (the old-install grant); screen `bonsaiSettingsSchema.ts:93-103`
and `:341-348`; `bonsaiSettingsNormalizers.ts:419-430`; `src/hooks/useKidsLock.ts:35-42`;
`src/utils/permissionDeepLink.ts:33-67` (four tables); `src/components/PermissionsTab.tsx:59-89` (`ROWS`);
`src/utils/permissionJumpRegistry.ts:54-67`; `src/utils/navFocusRegistry.ts:68-75` (five ids). One of the six
(`steam_web_api`) leaves with the ban lookup.

## 6a-3. Every setting today

53 saved settings (the keys of `tests/contracts/settings-defaults.json`; `capabilities` counts once and holds six
switches). **Mark:** REMOVED = a removal takes it out. NO TAB = no tab shows or sets it. The rule column is what both
sides do unless a side is named.

| # | Saved name (Python and file) | Screen name | Kind | Default | Rule | Tab |
|---|---|---|---|---|---|---|
| 1 | ai_character_accent_intensity | aiCharacterAccentIntensity | choice: subtle, balanced, heavy, unleashed | balanced | trimmed, in the list else default; the list is typed in both languages | Settings (AI voice & personality menu) |
| 2 | ai_character_custom_text | aiCharacterCustomText | text | "" | line ends fixed, trimmed, capped; own function each side | Settings (character picker box) |
| 3 | ai_character_enabled | aiCharacterEnabled | true/false | false | exactly true | Settings |
| 4 | ai_character_preset_id | aiCharacterPresetId | text (a catalog id) | "" | must be a catalog id; the catalog is kept in both languages | Settings (picker box) |
| 5 | ai_character_random | aiCharacterRandom | true/false | true | only an explicit false turns it off | Settings (picker box) |
| 6 | ask_mode | askMode | choice: speed, strategy, expert | speed | "deep" reads as expert; Python gets the valid list from the `Plugin` class | Main (Ask mode menu) |
| 7 | ask_think_effort | askThinkEffort | choice: off, low, medium, high | off | trimmed, case-sensitive | Ollama (Thinking row) |
| 8 | capabilities | capabilities | six true/false: filesystem_write, media_library_access, steam_logs_read, steam_web_api, microphone_access, internet_downloads | all false | each exactly true (Python also accepts the number 1: see 6a-4); a file with no block grants three (Python only) | Permissions. **steam_web_api inside: REMOVED** |
| 9 | chat_text_size | chatTextSize | choice: small, normal, large | normal | trimmed | Settings (Text size) |
| 10 | desktop_app_log_level | desktopAppLogLevel | choice: off, default, verbose | off | trimmed, case-sensitive | Developer (Logging) |
| 11 | desktop_ask_verbose_logging | desktopAskVerboseLogging | true/false | false | exactly true | Developer |
| 12 | desktop_debug_note_auto_save | desktopDebugNoteAutoSave | true/false | false | exactly true | Developer |
| 13 | dev_force_session_rag_chips | devForceSessionRagChips | true/false | false | exactly true | Developer |
| 14 | dev_frozen_test_chips | devFrozenTestChips | list of text (max 12, each up to 160) | [] | trimmed, blanks and repeats dropped | Developer (pinned chips; QA writes it by hand too) |
| 15 | dev_preload_ask_model | devPreloadAskModel | true/false | false | exactly true | Developer |
| 16 | input_sanitizer_user_disabled | inputSanitizerUserDisabled | true/false | false | exactly true | **NO TAB**: set by a magic phrase in the Ask box (`ask_local_command_handlers.py:50`) |
| 17 | latency_timeouts_custom_enabled | latencyTimeoutsCustomEnabled | true/false | false | exactly true | Ollama |
| 18 | latency_warning_seconds | latencyWarningSeconds | number 5 to 300, step 5 | 60 | pair with the timeout (warning must stay below it); screen snaps to the step, Python does not | Ollama (timeout slider) |
| 19 | model_allow_high_vram_fallbacks | modelAllowHighVramFallbacks | true/false | false | exactly true | AI models box (Filters), opened from Ollama |
| 20 | model_policy_non_foss_unlocked | modelPolicyNonFossUnlocked | true/false | false | pair with the tier | AI models box |
| 21 | model_policy_tier | modelPolicyTier | choice: open_source_only, open_weight, non_foss | open_source_only | "non_foss" without the unlock reads as open_weight | AI models box |
| 22 | named_ollama_hosts | namedOllamaHosts | list of label+host (max 4) | [] | label up to 32, host up to 128, trimmed, blanks dropped | Ollama (saved hosts) |
| 23 | ollama_keep_alive | ollamaKeepAlive | choice of 13 durations (0s to 240m) | 5m | the 13 are written in three places (Python set, screen type, screen array) | Ollama (keep-alive slider) |
| 24 | ollama_local_autostart | ollamaLocalAutostart | true/false | false | exactly true | Ollama |
| 25 | ollama_local_on_deck | ollamaLocalOnDeck | true/false | true | only an explicit false turns it off | Ollama |
| 26 | preset_chip_animation | presetChipAnimation | choice: fade, carousel, static, decode | fade | "stream" reads as decode; old fade flag false reads as static | Developer |
| 27 | preset_chip_fade_animation_enabled | presetChipFadeAnimationEnabled | true/false (old) | true | worked out as "animation is fade" on both sides | **NO TAB**: derived, kept for the screen |
| 28 | preset_single_chip | presetSingleChip | true/false | false | exactly true | Settings (Suggestion chips) |
| 29 | rag_corpus_path | ragCorpusPath | text up to 512, no ".." | "" | traversal rejected | **NO TAB**: written by the library install and remove (`rag_corpus_rpc.py:105, 201, 213`) |
| 30 | rag_corpus_version | ragCorpusVersion | text up to 64 | "" | Python turns numbers into text; the screen does the same for finite numbers | **NO TAB** sets it; Ollama tab shows it |
| 31 | rag_hybrid_retrieval_enabled | ragHybridRetrievalEnabled | true/false | true | only an explicit false turns it off | Developer |
| 32 | reply_language | replyLanguage | choice: follow_system, always_english, or one of 30 Steam language codes | follow_system | aliases; own module each side (`replyLanguage.ts`, `reply_language_service.py`) | About |
| 33 | reply_verbosity | replyVerbosity | choice: terse, caveman, balanced, detailed | balanced | "short" reads as caveman; old `terse_mode` true reads as terse | Ollama (Reply style slider) |
| 34 | request_timeout_seconds | requestTimeoutSeconds | number 10 to 600, step 10 | 180 | pair (see 18) | Ollama |
| 35 | screenshot_attachment_preset | screenshotAttachmentPreset | choice: low, mid, max | low | old `screenshot_max_dimension` 1920 reads as mid, 3160 as max | Settings (Screenshot quality) |
| 36 | show_developer_tab | showDeveloperTab | true/false | false | old `show_debug_tab` true also turns it on | Settings (Data) |
| 37 | show_onscreen_debug_hud | showOnscreenDebugHud | true/false | false | exactly true | Developer |
| 38 | steam_web_api_key | steamWebApiKey | text up to 128 | "" | trimmed; a non-text value becomes "" | Developer (Integrations). **REMOVED** (ban lookup) |
| 39 | strategy_spoiler_auto_reveal_after_consent | strategySpoilerAutoRevealAfterConsent | true/false | false | exactly true | **NO TAB**: read by the transcript, no setter is called anywhere; only a hand-edited file sets it |
| 40 | strategy_spoiler_masking_enabled | strategySpoilerMaskingEnabled | true/false | true | only an explicit false turns it off | Settings (Story spoilers) |
| 41 | stream_scramble_color | streamScrambleColor | choice: same, dim, green, cyan | green | trimmed, case-sensitive | Developer |
| 42 | stream_scramble_enabled | streamScrambleEnabled | true/false | false | exactly true | Developer |
| 43 | stream_scramble_settle_ms | streamScrambleSettleMs | number 100 to 1000 | 400 | whole number, cut not rounded, non-number gives default | Developer |
| 44 | stream_scramble_style | streamScrambleStyle | choice: settle, chip, tail | settle | trimmed, case-sensitive | Developer |
| 45 | tab_resume_mode | tabResumeMode | choice: always_main, resume, resume_recent | resume | trimmed; the screen also keeps a copy in browser storage so the first paint knows it | Developer |
| 46 | text_model_routing_order | textModelRoutingOrder | list of model tags (max 16) | [] | deduped, tag pattern | AI models box (try order) |
| 47 | ui_scale_auto_enabled | uiScaleAutoEnabled | true/false | true | only an explicit false turns it off; screen forces true unless the Developer tab is on | Settings (UI scale, in the Developer-only fold). **REMOVED** |
| 48 | ui_scale_manual_profile | uiScaleManualProfile | choice: handheld, desktop, couch, immersive | handheld | screen refuses "immersive" and forces handheld without the Developer tab | **REMOVED**; this is the documented exception |
| 49 | unified_input_persistence_mode | unifiedInputPersistenceMode | choice: persist_all, no_persist (old persist_search_only reads as no_persist) | no_persist | Python gets the valid list from the `Plugin` class | Settings (Remember what I typed) |
| 50 | use_local_knowledge_base | useLocalKnowledgeBase | true/false | false | exactly true | Ollama (Knowledge library) |
| 51 | vision_model_routing_order | visionModelRoutingOrder | list of model tags (max 16) | [] | as 46 | AI models box |
| 52 | voice_reply_mode | voiceReplyMode | choice: off, voice_only, always | off | trimmed | Settings (Voice replies). **REMOVED** (read aloud) |
| 53 | voice_stt_model | voiceSttModel | choice: tiny.en, base.en | base.en | own module each side | Settings (Voice input) |

**After the removals: 49 settings** (53 minus the Steam key, both UI scale settings and the read-aloud setting), and five
permission switches. The Steam key also leaves `main.py:744` (`sensitive = frozenset({"steam_web_api_key"})`); the
`steam_web_api` word in `desktop_note_service.py:75`'s list of sensitive names becomes dead text. **No tab shows:** 16, 27, 29, 30 (shows
only the version text), 39. Settings only reached from a box that is not a tab (the AI models box): 19, 20, 21, 46, 51.

**How the two languages are laid out today (the tables the generator would replace):**

| | Screen | Back end |
|---|---|---|
| One-row-per-setting table | 37 rows in `SIMPLE_FIELDS` | 29 rows in `_SIMPLE_FIELDS` |
| Settings written as their own code | 16 keys (both latency, both policy, screenshot, ask mode, reply style, developer tab, chip animation, fade flag, capabilities, hosts, frozen chips, both routing orders, corpus path) | 24 keys (the same 16, plus unified-input mode, five character settings, reply language, voice model, which the screen has as table rows) |

The eight rows that are table rows on the screen but custom on the back end are the "two row counts differ on
purpose" in AGENTS.md; they hand off to other modules (`ai_character_service.py`, `reply_language_service.py`,
`voice_transcription_service.py`, and the `Plugin` class for the two lists).

**Other writers at run time** (not places a new setting is written, but the places that call `save_settings` with
settings named by hand): back end `ollama_routing.py:450-489`, `ollama_local_setup_rpc.py:381-386, 467-468`,
`ollama_pc_models.py:145`, `ollama_try_order_prune.py:76`, `rag_corpus_rpc.py:105-107, 201-203, 213-214`,
`rag_corpus_local_install.py:134-138`, `ask_local_command_handlers.py:50`, `plugin_data_reset.py:151` (empty save);
screen `useCharacterPickerModal.tsx:86-110`, `useOllamaModelsHubModal.tsx:110-146`, `useTryOrderPlaces.ts:135`,
`usePullModelPinForAsk.tsx:70-85`, `downloadNotice.tsx:141-148` (saves `capabilities` straight), `index.tsx:667-672`
(UI scale, removed), `pluginStorage.ts:159` (copy of the resume mode). These are typed as `Partial<BonsaiSettings>` so a
rename is caught, and none of them needs a change when a setting is added.

## 6a-4. What the generator would make, what stays by hand, and the risks

**One list** (proposed shape, for the session to design): one entry per setting with its saved name (the screen name
is derived by the same camel-case rule `usePluginSettings.readBack.test.ts:102` already uses), kind (true/false,
choice, number, text, list), default, the choice list or the number's limits and step, trim and case rules, and the
tab. A setting with a rule that is its own names a hand-written function instead.

**What it would make (committed files, plus a check that a fresh run changes nothing, so no runtime reading):**

| Made file | Replaces |
|---|---|
| back-end table and constants | `_SIMPLE_FIELDS` and the valid lists, defaults and limits (`settings_service.py` L224-299, L350-373, L466-525) |
| screen types | `BonsaiSettings`, `BonsaiSettingsSnapshotInput`, and every `DEFAULT_*` / `*_OPTIONS` / `MIN_*` / `MAX_*` constant for table settings (`bonsaiSettingsSchema.ts` L112-294, L302-365) |
| screen rule table | the 37 `SIMPLE_FIELDS` rows (`bonsaiSettingsNormalizers.ts` L459-548) |
| save translation and name table | `toBonsaiSettingsPayload` base (`settingsPayload.ts` L51-105) and `SETTINGS_FIELD_BACKEND_KEY` (`usePluginSettings.ts` L124-178) |
| `tests/contracts/settings-defaults.json` | the fresh-install file |

That is the repetition of 8 of the 12 places (about 14 lines per setting today, on the order of 700 lines in all).
The setter functions and state are already made at run time from the name table.

**What stays hand-written (2 or 3 places per new setting, plus the tab):**

1. The list entry itself (one line).
2. The control on the tab, with its focus wiring, and for a folded tab its summary line (`settingsTabFolds.ts`).
3. A function for a rule the kinds cannot say, in both languages. Today 16 (screen) and 24 (back end) settings have
   one; after the removals 16 and 23 (the UI scale rows were table rows).

**Left over that the generator cannot touch:**

- **`settings-hostile-inputs.json` stays hand-written.** The plan says the script makes "the two shared check files";
  only the defaults file can be made. The hostile file is 64 cases over 32 settings, each case a person's decision
  about what a bad value should become. Making it from the list would make the check agree with itself.
- **The read-back test's `NON_DEFAULT` table stays hand-written** for the same reason (it is the oracle). It already
  fails if a setting has no row or a row equals the default, so it keeps guarding the generated list.
- **The plugin root's destructure and the payload hooks' three spots** (places 10 and 11) are code, not tables. They
  disappear for settings only if 6c makes tabs read settings themselves. Without 6c, 6a leaves 6 places, not 2 or 3.
- **The Permissions list** is a second, smaller list (9 places) and wants the same treatment, or it stays nine.

**Risks:**

1. **The read-back test (`9c8d7157`, `usePluginSettings.readBack.test.ts`).** It builds its list from the defaults file.
   If the defaults file is made from the same list as the code, a wrong default would pass both. Keep the hostile file
   and `NON_DEFAULT` by hand, and run both before and after each step. When removals land first, the four removed
   settings' rows must leave the defaults file and `NON_DEFAULT` in the same commit or its first test fails.
2. **Python wins where the two disagree.** The generator would write both sides from one description, so any place
   where they differ on purpose or by accident gets decided silently. Found today, in addition to the documented ones:
   - **The two latency numbers:** the screen snaps to the slider step and rounds a decimal (`bonsaiSettingsNormalizers.ts`
     L149-163: 62.7 becomes 65); Python only cuts and clamps (`settings_service.py:186-192`: 62.7 becomes 62). Only
     one hostile case touches them (500 and 5 give 300 and 310, which both agree on).
   - **Capabilities:** Python accepts the number `1` or `1.0` as on (`capabilities.py:105-116`); the screen needs
     exactly `true` (`bonsaiSettingsNormalizers.ts:419-430`). The only hostile case uses the text "yes".
   Neither is a bug a player can hit (the screen only sends the right shape), but the generator must not make one
   side change to match the other without a call. I recommend keeping both pairs as hand-written rules.
3. **The documented exception.** Two are written down: (a) the UI scale gate (the screen refuses "immersive" and
   forces the default without the Developer tab: `bonsaiSettingsNormalizers.ts:456-458, 577-582`,
   `tests/contracts/README.md`), and (b) the fade flag worked out from the animation, decided in favour of the screen
   (`settings_service.py:596-607`). The removal of UI scale takes (a); the README paragraph and the AGENTS.md sentence
   "one deliberate exception is documented where it happens" must change with it. (b) stays and becomes one line in
   the list ("derived from preset_chip_animation").
4. **Old saved files.** A removed setting must still load: both sides build their result only from the keys they know,
   so an unknown saved key is dropped on the next save and ignored on load. The hostile cases "a setting the code no
   longer knows about does not reset the rest" and "a settings file still carrying the deleted streaming switch loads
   quietly" already pin this. No special code is needed for the four removals.
5. **Option lists written in both languages beyond the table:** keep-alive durations (three places), accent levels,
   reply styles, think efforts, Steam language codes (30), model policy tiers. The list can carry them; the language
   list and character catalog are bigger and should stay in their own modules.
6. **A "generated file is current" check is new.** Plan 86 step 7 retires checkers; this is one added. It must run in
   the gate.

---

# 6b. One D-pad helper instead of eight

## 6b-1. The eight, one by one

Lines are at `b5ce2768` (1,443 together; the plan measured 1,424). Direct tests together: 1,504 lines. "Baseline"
is the count in `scripts/focus-baseline.json` of cases the focus-pattern check lets through for that file; the files'
path keys must move with them.

| Helper | Lines | Importers (code / test files) | Direct test file | Baseline cases |
|---|---|---|---|---|
| `src/utils/navFocusRegistry.ts` | 192 | 51 / 56 | `navFocusRegistry.test.ts` 80 lines, 8 tests; `.remount.test.ts` 94, 4; `.windowFocus.test.ts` 135, 6 | 0 |
| `src/utils/answerBubbleElRegistry.ts` | 126 | 6 / 5 | `answerBubbleElRegistry.test.ts` 149, 9 | page-search 1 |
| `src/utils/answerStopRegistry.ts` | 151 | 6 / 13 | `answerStopRegistry.test.ts` 254, 17 | tabindex-removal 1 |
| `src/utils/replyStopRegistry.ts` | 198 | 13 / 8 | `replyStopRegistry.test.ts` 158, 10 | page-search 3, tabindex-removal 1 |
| `src/utils/spoilerFenceRegistry.ts` | 175 | 5 / 5 | `spoilerFenceRegistry.test.ts` 221, 18 | tabindex-removal 1 |
| `src/utils/permissionJumpRegistry.ts` | 171 | 2 / 2 | `permissionJumpRegistry.test.ts` 157, 7 (also `usePermissionJump.test.ts`) | 0 |
| `src/utils/drgGlossaryTermRegistry.ts` | 154 | 5 / 2 | none; covered through `answerBubbleNavigation.test.ts` and `buildReplyActionsElement.test.tsx` | tabindex-removal 1 |
| `src/features/plugin-shell/modalReturnFocusRegistry.ts` | 276 | 21 / 26 | `modalReturnFocusRegistry.test.ts` 256, 19 | page-search 2 |

### 1. `navFocusRegistry.ts`: the base

- **Keeps:** one map from a named area to its Steam navigation node holder (L105). 18 fixed ids and three families
  (`tab-body:<id>`, `fold-line:<id>`, `fold-all:<id>`), L61-97.
- **Exports:** `NavFocusId`, `NavRefHolder`, `registerNavFocus`, `unregisterNavFocus` (only removes its own holder),
  `refocusPanelWindowIfLost`, `takeNavFocus` (window check, then `TakeFocus(true)`), `resetNavFocusRegistry`.
- **Registers (register and its cleanup, `file:line`):**
  `"unified-input"` `MainTabUnifiedAskBar.tsx:276` (and the test stand-in `chat-slots/afterBoxHarness.tsx:140`);
  `"preset-carousel"` `MainTabPresetRow.tsx:50` (help chip alone) and `preset-carousel/presetRowFocusNav.tsx:54`;
  `"tab-bar"` `TabIndicatorBar.tsx:106`; `"tab-body:*"` `TabBodyFocusRoot.tsx:51`; `"fold-line:*"`
  `FoldedSection.tsx:130`; `"fold-all:*"` `FoldAllButton.tsx:66`; `"details-slot-line"` `DetailsSlot.tsx:236`;
  `"newest-closed-question"` `hooks/useLiveTurnHeaderRingRestore.ts:61`; `"chat-name"` `chat-title/chatNameNav.ts:47`;
  `"chat-name-new"` and `"chat-name-delete"` `chatRowIconNav.ts:35`; `"about-links"` `AboutLinks.tsx:133`;
  `"session-summary-card"` `SessionSumUpSection.tsx:164`; `"chat-perm-hint-troubleshoot"` and
  `"chat-perm-hint-deny"` `hooks/usePermHintNavTargets.ts:35, 39`; the five `"permissions-row-*"` through
  `permissionJumpRegistry.ts:79`.
- **Takes:**
  `"unified-input"` `MainTabUnifiedAskBar.tsx:265`, `takeFirstChatStop.ts:43, 50`, `useChatTriggerSwitch.ts:51`,
  `askBarRingWatch.ts:88`, `useAskBarInitialRingClaim.ts:81`, `useAskBarPressHandlers.ts:56, 71`,
  `useMainTabAskBarFocus.ts:105`, `buildDetailsPanelElement.tsx:226`;
  `"preset-carousel"` `DetailsSlot.tsx:284`, `detailsSlotStore.ts:113`, `useMainTabAskBarFocus.ts:166, 172`;
  `"tab-bar"` `chatRowMoves.ts:30, 44, 50`, `deckyHeaderShape.ts:190`, `FoldedSection.tsx:143`,
  `foldedTabArrival.ts:72`, `TabBodyFocusRoot.tsx:68`, `useHiddenTabHeaderTrap.ts:124`, `useSearchNav.ts:158`,
  `src/index.tsx:1263`, `chatTranscriptNavHelpers.ts:184`; `"tab-body:*"` `useTopStripTabBar.ts:33`;
  `"fold-line:*"` `FoldedSection.tsx:83`; `"fold-all:*"` `FoldedSection.tsx:105, 176`;
  `"details-slot-line"` `detailsSlotStore.ts:103, 106`, `DetailsSlot.tsx:284`; `"newest-closed-question"`
  `takeFirstChatStop.ts:49`, `presetRowFocusNav.tsx:218`; `"chat-name"` `chatNameNav.ts:62, 88`,
  `chatTranscriptNavHelpers.ts:183`; `"about-links"` `AboutTab.tsx:110`; `"session-summary-card"`
  `SessionSumUpSection.tsx:108`; `"chat-perm-hint-*"` `chatTranscriptNavHelpers.ts:44-45, 279, 297, 312`,
  `presetRowFocusNav.tsx:216-217`; `"permissions-row-*"` `permissionJumpRegistry.ts:125`;
  `"session-context-strip"` `liveTurnFocusGraph.ts:403`; `refocusPanelWindowIfLost` alone:
  `AboutLinks.tsx:75`, `injectChipNav.ts:37`, `pullModelsBoxMemory.ts:72`, `useAskBarInitialRingClaim.ts:105`,
  `answerBubbleNavigation.ts:618`, `chatTranscriptNavHelpers.ts:166`, `reasoningBlockReading.ts:80`.
- **Dead id found:** `"session-context-strip"` (L61) is never registered anywhere (no `registerNavFocus` with that id
  in code or tests), so the take at `liveTurnFocusGraph.ts:403` always fails and the next lines (L405-408, a page
  query) do the work. Safe to drop the id and the take; the page query is a baseline case worth deleting at the same
  time. Check with a Deck walk of the session strip first.
- **Removals:** `"chat-perm-hint-deny"` (L67) and `"permissions-row-steam-web-api"` (L74) go with the ban lookup; the
  takes and registers listed above for them go too.

### 2. `answerBubbleElRegistry.ts`

- **Keeps:** two maps by answer key: the bubble's element (`bubbleByKey`, L47) and its nav holder (`bubbleNavByKey`, L59).
- **Exports:** `registerAnswerBubbleNav`, `takeAnswerBubbleNavFocus`, `registerAnswerBubbleEl`,
  `getRegisteredAnswerBubble`, `resolveFocusedAnswerBubble`. No reset function (its test clears by hand).
- **Registers:** `buildAnswerBubbleElement.tsx:386` (nav), `:413` (element, by ref), `:159`; `answerBubbleNavigation.ts:302,
  387, 425, 634`; `test-harness/deckAnswerWalk.ts:206`.
- **Takes:** `answerBubbleNavigation.ts:236, 239, 298-303, 383-388, 426, 443-446`; `buildReplyActionsElement.tsx:583, 593`;
  `liveTurnFocusGraph.ts:292`; `MainTabChatTranscript.tsx:709`; `buildAnswerBubbleElement.tsx:158`.
- **Not in the plan's list as a D-pad helper in its record (b18 said none):** it is one.

### 3. `answerStopRegistry.ts`

- **Keeps:** answer key to (position to element) (`stopsByAnswer`, L62).
- **Exports:** `registerAnswerStop`, `orderedAnswerStops` (drops stops outside the bubble), `focusedAnswerStopIndex`,
  `focusAnswerStop`, `resetAnswerStopRegistry`.
- **Registers:** `buildAnswerSections.tsx:88`; `deckAnswerWalk.ts:222`.
- **Takes:** `answerBubbleNavigation.ts:195-196, 209, 305, 329, 362, 390, 401, 427, 430, 542, 621, 671, 686, 739-740, 762,
  839-840`; `answerBubbleCoverUp.ts:73`; `answerBubbleWordsUp.ts:115, 144`; `MainTabChatTranscript.tsx:710-711`.

### 4. `replyStopRegistry.ts`

- **Keeps:** element per stop name (`stops`, L104), a set of greyed stops (`unavailableStops`, L105), a nav holder per
  stop (`stopNavs`, L108); the walking order (`REPLY_STOP_ORDER`, L89-102); 12 stop names.
- **Exports:** `ReplyStopId`, `REPLY_STOP_ORDER`, `replyStopNavRef`, `registerReplyStop`, `getReplyStop`,
  `setReplyStopUnavailable`, `focusRegisteredReplyStop`. No reset function.
- **Registers:** through `BonsaiChatSecondaryButton.tsx:60` (the `replyStop` prop: `ReplyCopyButton.tsx:129, 143`
  "copy"; `buildAnswerCornerSlots.tsx:171` "read-aloud-corner"; `buildReplyActionsElement.tsx:693, 703`
  "helpful", "not-really"; `buildTurnHeaderElement.tsx:332` "retry"); directly `buildChatSummaryNoteElement.tsx:114`,
  `NoteOfferCard.tsx:294, 333`, `NotesReadLine.tsx:146`, `buildReasoningFoldElement.tsx:141`,
  `buildReplyActionsElement.tsx:278, 775`; greyed flags `buildReplyActionsElement.tsx:380-384`.
- **Takes (`focusRegisteredReplyStop` / `getReplyStop`):** `MainTabChatTranscript.tsx:944, 956`,
  `buildChatSummaryNoteElement.tsx:80-83`, `detailsSlotStore.ts:168`, `NoteOfferCard.tsx:209, 221, 279-280`,
  `NotesReadLine.tsx:122`, `useLiveTurnHeaderRingRestore.ts:46-47, 108`, `buildAnswerBubbleElement.tsx:318-328`,
  `buildAnswerCornerSlots.tsx:89, 101-105`, `buildReplyActionsElement.tsx:228, 432, 452-453, 470, 566, 612, 619, 733`,
  `buildTurnHeaderElement.tsx:308`, `liveTurnFocusGraph.ts:162, 379`.
- **Removals:** `"read-aloud-corner"` (L57-58 id, L93 slot, comments L5, L24, L68-70, L114) and
  `buildAnswerCornerSlots.tsx:83, 129, 133, 171`.

### 5. `spoilerFenceRegistry.ts`

- **Keeps:** fence id to element and its "open me" function (`fences`, L48).
- **Exports:** `registerSpoilerFence`, `findNextSpoilerFenceInView`, `findLastSpoilerFenceIn`,
  `findFirstSpoilerFenceIn`, `revealSpoilerFence`, `focusSpoilerFence`, `resetSpoilerFenceRegistry`.
- **Registers:** `MainTabBonsaiAiMarkdownChunk.tsx:447, 487, 504`; `deckAnswerWalk.ts:235`.
- **Takes:** `answerBubbleNavigation.ts:228, 520, 572-573, 689-690, 745-746, 757, 843`; `answerBubbleCoverUp.ts:48-52,
  102, 105`; `answerBubbleBandGeometry.ts:88`; `MainTabBonsaiAiMarkdownChunk.tsx:483`.
- **Twice:** `findLastSpoilerFenceIn` (L103-113) and `findFirstSpoilerFenceIn` (L120-130) are one loop with the
  comparison flipped.

### 6. `permissionJumpRegistry.ts`

- **Keeps:** two single values (the tab to return to and the row to focus, L45-46); nothing else. It sits on top of
  the nav registry for the five row ids.
- **Exports:** `registerPermissionRowNavFocus`, `unregisterPermissionRowNavFocus`, `armPermissionJump`,
  `peekPermissionJumpReturnTab`, `peekPermissionJumpFocusTarget` (the two peeks are used only by tests),
  `consumePermissionJumpReturnTab`, `restorePermissionJumpFocusWithRetry`, `resetPermissionJumpRegistry`.
- **Registers:** `PermissionsTab.tsx:117-118`. **Takes:** `PermissionsTab.tsx:161`; `usePermissionJump.ts:40, 48`.
- **Removals:** the `steam_web_api` case (L60-61) and the type member in `permissionDeepLink.ts:38`.
- **Twice:** `restorePermissionJumpFocusWithRetry` (L142-165) and `modalReturnFocusRegistry.ts`
  `restoreModalReturnFocusWithRetry` (L173-202) are the same three tries (0, 120, 320 ms). The only difference: the
  jump runs all three even after one claims (it must, the first button takes the ring back 22 ms later), the modal
  return stops at the first claim.

### 7. `drgGlossaryTermRegistry.ts` (stays; the glossary reviewer owns what changes)

- **Keeps:** chip id to element (`chips`, L45).
- **Exports:** `registerDrgGlossaryTermChip`, `findNextDrgGlossaryTermChipInView`, `focusDrgGlossaryTermChip`,
  `isDrgGlossaryTermChip`, `resetDrgGlossaryTermRegistry`.
- **Registers:** `DrgGlossaryTermChip.tsx:128, 258`; `deckAnswerWalk.ts:245`.
- **Takes:** `answerBubbleNavigation.ts:713, 720`; `answerBubbleWordsUp.ts:67, 71, 87-88, 91, 100, 105, 114, 135, 139,
  160`; `buildReplyActionsElement.tsx:587, 594`.
- **Change that is certain:** the "Drg" in every exported name goes with "the code loses its one-game names". The
  registry, the chip, the tooltip and the walk over them stay. Do the rename before or with the shared-helper move,
  once: it touches the same five files.

### 8. `modalReturnFocusRegistry.ts`

- **Keeps:** button element per id (`owners`, L90), optional Steam transfer per id (`transfers`, L91), one armed id
  (`pendingReturn`, L92). 20 ids, L30-81.
- **Exports:** `ModalReturnFocusId`, `ModalReturnTransfer`, `registerModalReturnFocusOwner`, `rememberModalReturnFocus`,
  `clearModalReturnFocus`, `peekModalReturnFocus`, `restoreModalReturnFocus`, `restoreModalReturnFocusWithRetry`,
  `resetModalReturnFocusRegistry`.
- **Registers (owner):** `KnowledgeBaseSection.tsx:869, 930, 1006`; `MainTabPresetRow.tsx:218`; `OllamaTab.tsx:396`;
  `OllamaWhereAiRunsSection.tsx:550, 602`; `SettingsTabCharacterSection.tsx:166`; `SettingsTabDataSection.tsx:110, 138`;
  `useOllamaTabFocus.ts:70`; `useChatSlotDeleteConfirm.tsx:64`; `useChatSlotRenameModal.tsx:56`; `useStartNewChat.tsx:81`;
  `ChatsMenu.tsx:187`; `useChatRowActions.ts:60`; `TabIndicatorBar.tsx:148`.
- **Arms (remember):** `KnowledgeBaseSection.tsx:653, 733, 755`; `MainTabPresetRow.tsx:220`; `OllamaModelsHubModal.tsx:232`;
  `OllamaTab.tsx:399`; `OllamaWhereAiRunsSection.tsx:606`; `SettingsTabCharacterSection.tsx:168`;
  `SettingsTabDataSection.tsx:112, 140`; the three chat-slot hooks; `ChatsMenu.tsx:186`; `useThinkingNoticeGate.tsx:115`;
  `src/utils/rememberReturnWhileBoxOpens.ts:38, 48`.
- **Takes (restore and peek):** `useBonsaiPluginShell.ts:192-194`; peeks `OllamaModelsHubModal.tsx:230`,
  `useChatTriggerSwitch.ts:44`, `useSearchShortcut.ts:44`, `askBarRingWatch.ts:68`.
- **Unused:** the ids `"session-context-clear"` (L68) and `"session-tab-clear"` (L75) are named nowhere else (b38 right).
- **Twice:** the target ladder in `focusOwnerById` (L247-251: panel, button, element) is the one in
  `replyStopRegistry.ts` `focusRegisteredReplyStop` (L184-188), as its comment says.

## 6b-2. Other modules keeping their own list of stops, and whether each is a ninth registry

The plan names eight files. A search for module-level maps and slots that remember an element or a nav node found
more. **Sorting them:**

**Same job as one of the eight (near-copies; the nearest thing to a ninth registry):**

| Module | What it keeps | Same as | Added |
|---|---|---|---|
| `src/components/injectChipNav.ts` (43 lines) | one nav holder for the AI's suggestion chip; take with window check | `navFocusRegistry` for one id (`takeInjectChipFocus` L35-42 is `takeNavFocus`) | after `efecab1` (2026-10-10, `1c6db1ff`); no test |
| `src/components/pullModelsRemoveReturn.ts` (88 lines) | remove control per model tag, one armed tag, retries at 80/220/450/800 ms | `modalReturnFocusRegistry` for one list (`registerRemoveControl` / `rememberRemoveReturn` / `restoreRemoveReturn`) | after `efecab1` (2026-10-14, `7392f43f`) |
| `AboutLinks.tsx:72-81` and `pullModelsBoxMemory.ts:69-78` | a private `takeFocusOf` / `handRingTo`, both with the window check | `takeNavFocus` | before / after |
| `chatTranscriptNavHelpers.ts:163-170` `takeHolderFocus` | take for a holder in hand | `takeNavFocus`, with the window check | 2026-09-24 |

**Slots of the "element by key" kind (module `let` or `Map`; not in the plan's eight, mostly older than it):**
`SessionContextStrip.tsx:345, 348`; `SessionSumUpSection.tsx:65-67`; `SessionTitleOffer.tsx:40-41`;
`chatNameNav.ts:42`; `searchJumpStore.ts:158, 161` (the Search tab's back line, 2026-10-12);
`chatTranscriptNavHelpers.ts:100, 119` (day-line holders, the "N earlier" line); `liveTurnFocusGraph.ts:328, 341`
(the choice buttons); `buildDetailsPanelElement.tsx:66, 97`; `buildKbNotesBlockElement.tsx:215`;
`buildTurnHeaderElement.tsx:113, 116`; `buildReplyActionsElement.tsx:162`. 25 slots in 14 files. Holder type
`{ current: { TakeFocus?: ... } }` is declared again in nine files (`answerBubbleElRegistry.ts:58`,
`buildAnswerCornerSlots.tsx:59`, `buildReplyActionsElement.tsx:161`, `buildTurnHeaderElement.tsx:114`,
`liveTurnFocusGraph.ts:327`, `replyStopRegistry.ts:107`, `useLiveTurnHeaderRingRestore.ts:36`, `NoteOfferCard.tsx:55`,
`reasoningBlockReading.ts:53`).

**Something else, not a registry (state per screen part, or handlers):**

| Module | What it is | Verdict |
|---|---|---|
| `src/features/chat-title/chatRowMoves.ts` (55 lines) | the shared Up, Down, LB, RB moves of the name row's three stops | handler set built on `takeNavFocus`; not a registry. Added after `efecab1`. Becomes a thin user of the shared helper |
| `src/features/chat-sum-up/sumUpDirectionHandlers.ts` (35 lines) | one Up, Down, button-down handler set for the Sum up stops | handler builder; its users (`SessionSumUpSection`, `SessionTitleOffer`) keep the slots above |
| `src/components/useSettingsTabFocus.ts` (83), `useDeveloperTabFocus.ts` (75), `useOllamaTabFocus.ts` (186) | per hook instance: section body elements, "enter from top / bottom" per folded section | **a different kind of stop** (section host with two entries). The three repeat one finder (`stopsIn` / `focusStopIn` / `focusFirstStopIn` and the `[tabindex], button, input` selector) and one chain shape. Added after `efecab1` |
| `src/utils/settingsPanelScroll.ts` (61) | scroll-then-hop for Up at a section's top | helper with a page query (`tryFocusActiveTabStrip` L38-46); no stop memory. Three callers (`KnowledgeBaseSection.tsx:345`, `OllamaWhereAiRunsSection.tsx:299, 304`) |
| `src/features/folded-tabs/shoulderSwitch.ts` (48) | one slot holding the tab bar's stepping function | not a registry of stops; same register, un-register-only-mine shape as the nav registry. Added after `efecab1` |
| `src/features/search-tab/useSearchNav.ts` (193), `presetRowFocusNav.tsx` (222), `useMainTabAskBarFocus.ts` | each screen part's own walk | per-part walks that call the nav registry; not memories |

**Verdict for the session:** by plan 86 § 5's rule, the two near-copies (`injectChipNav.ts`, `pullModelsRemoveReturn.ts`)
and the Search tab's back-line slot appeared after the starting commit and are the same kind of thing as the eight.
The step 0 freshness check said "still the eight" because it counted named files. This is Open question 1.

## 6b-3. What the one shared helper needs to know

Every kind of stop the eight and their neighbours remember today:

1. **A Steam container reached by a fixed name** (nav registry): register, un-register only if still mine, take =
   window check then `TakeFocus(true)`. 18 names and three families.
2. **A Steam container reached by a key** (a holder object made on first ask): bubble (`bubbleNavByKey`), reply stop
   (`stopNavs`), thumbs row, question text, day line; six hand-made copies today.
3. **One element by a key, newest wins, forgotten when it unmounts or disconnects:** bubble element, reply stop,
   modal owner, remove control, chat name, back line, earlier line, sum-up slots.
4. **An ordered group of elements per owner** (answer sections by position), with "only those still inside the
   bubble" and "which one holds the ring".
5. **Scan and pick in reading order from where the ring is** (spoiler fences up, down, first; glossary chips up and
   down). The only geometry; it should stay as functions over kind 3 or 4, not move into the helper.
6. **A "greyed" mark on a stop** (reply stops): stays mounted, counts as absent for a walk.
7. **An armed target with retries across a remount** (modal return, permission jump): one pending value, the same
   0, 120, 320 ms tries, a rule for when to stop.
8. **How to land:** transfer first if the stop has a node, then focus, then check with the ring (`elementHasGamepadFocus`)
   or with the page's own focus (`elementHasFocus`), and one rule for the `tabindex`. Today four rules (below).
9. **A window check on every transfer** (plan 76): 20 direct `TakeFocus` calls in 17 files besides the nav registry,
   five with the check (`takeHolderFocus`, `injectChipNav`, `AboutLinks`, `pullModelsBoxMemory`,
   `reasoningBlockReading`) and fifteen without.
10. **One reset** for tests (six registries have a reset function, replyStop and answerBubbleEl do not).
11. Not part of it: section hosts (the three tab focus hooks), shoulder step, handler builders (chatRowMoves,
    sumUpDirectionHandlers).

**Disagreements the helper must settle (Deck measurements, as AGENTS.md requires for focus work):**

- **Four rules for `tabindex`.** `focusAnswerStop` (answerStopRegistry.ts:136), `focusSpoilerFence`
  (spoilerFenceRegistry.ts:160) and `focusDrgGlossaryTermChip` (drgGlossaryTermRegistry.ts:133) are the same body: put
  `tabindex="-1"` on anything without one, focus, check. `ensureFocusable` in `replyStopRegistry.ts:158-162` skips
  buttons, links and fields. `modalReturnFocusRegistry.ts` never stamps. AGENTS.md says adding a missing one "can be
  just as wrong". The focus-pattern baseline lets four of these through as "tabindex-removal".
- **Two ways to check a landing:** the ring (`replyStop`, `modalReturn`, nav) against the page's own focus
  (`answerStop`, `spoilerFence`, glossary). The ring check is the one the Deck trusts.

## 6b-4. Which are the easy first ones, and what the removals already do

**Easy first (one batch, one Deck walk "the answer's walk"):** `answerBubbleElRegistry`, `answerStopRegistry`,
`spoilerFenceRegistry`, `drgGlossaryTermRegistry`. They have 5 or 6 code importers each, nearly the same ones
(`answerBubbleNavigation.ts` plus its helpers), the same shape (a map, a register, a find, a focus), and
`test-harness/deckAnswerWalk.ts` plus the 26 `answerBubbleNavigation` test files already walk them. Three of the four share one `focus` body.
Then `permissionJumpRegistry` (2 importers, a thin layer, smaller after the removal).

**Middle:** `replyStopRegistry` (13 importers; two-thirds of its callers are the answer's walk too, but it owns the
walking order and the greyed set).

**Hard, last:** `modalReturnFocusRegistry` (21 importers, 26 test files, a timing rule) and `navFocusRegistry`
(51 importers, 56 test files). I suggest the shared helper **starts as the nav registry** with its three functions
unchanged (so the 51 importers do not change) and grows the other kinds around it, rather than being a new file the
others move into. That is a proposal for the session to design, not a finding.

**What the removals already change before 6b starts:**

| Removal | Helper | Change |
|---|---|---|
| Ban lookup | `navFocusRegistry` | 2 of 18 ids go (`chat-perm-hint-deny`, `permissions-row-steam-web-api`) with their take and register sites (`usePermHintNavTargets.ts:39-40`, `chatTranscriptNavHelpers.ts:45, 279, 288-304, 312`, `presetRowFocusNav.tsx:216`, `ChatTranscriptHintRows.tsx:153-155`) |
| Ban lookup | `permissionJumpRegistry` | the `steam_web_api` case (L60-61) |
| Read aloud | `replyStopRegistry` | the `read-aloud-corner` stop (3 lines) and `buildAnswerCornerSlots.tsx` corner take |
| Glossary | `drgGlossaryTermRegistry` | stays; the "Drg" names go; the glossary reviewer's list decides the rest |
| UI scale | none of the eight | the section is the example AGENTS.md and `focus-graph-patterns.md` tell people to copy (Pattern A, Pattern B, "four sliders share the fixed version"); the docs need a new example (step 7) |
| Preview tool | none | `useDeckyPreviewTestHookRegistration` (15 hand-over args in `index.tsx`) goes |

None of the eight disappears in step 3.

## 6b-5. Found in passing

- AGENTS.md says "The only direct call left in the whole front end is inside the registry itself" (the Steam
  transfer). It is not true: `TakeFocus` is called directly in `AboutLinks.tsx:77`, `KnowledgeBaseSection.tsx:314`,
  `OllamaWhereAiRunsSection.tsx:265`, `SettingsTabCharacterSection.tsx:132`, `injectChipNav.ts:39`,
  `pullModelsBoxMemory.ts:74`, `NoteOfferCard.tsx:78`, `useLiveTurnHeaderRingRestore.ts:42`,
  `answerBubbleElRegistry.ts:74`, `buildAnswerCornerSlots.tsx:85`, `buildReplyActionsElement.tsx:202, 231, 474`,
  `buildTurnHeaderElement.tsx:157`, `chatTranscriptNavHelpers.ts:168`, `liveTurnFocusGraph.ts:353-354`,
  `reasoningBlockReading.ts:82`, `replyStopRegistry.ts:180`.
- Two places register the same id `"preset-carousel"` on purpose (`MainTabPresetRow.tsx:50`, `presetRowFocusNav.tsx:54`;
  the help chip stands in for the chips). One mounted at a time, so no clash.
- `focus-baseline.json` holds path keys for these files; moving or merging files in step 4 and 6b needs its keys to
  follow (`node scripts/check-focus-patterns.mjs --update` after a reviewed move).

---

# 6c. The main screen hands down less

## 6c-1. How it was counted

For each tab payload hook, the number of properties of its argument type (`Use<Tab>TabPayloadArgs`), read with
`ts-morph` from the project's own tsconfig. For the six tabs the project counts this is exactly
`node scripts/shell_seam.mjs` (run read-only; it printed `total 211`). The same method with the Search tab added gives
218. The plan measured 214 on `efecab1` with the six; today's six are 211 (the stream scramble settings and the Text
size value-and-setter were each bundled into one prop since), plus 7 for the Search tab built since. A second count,
by reading `src/index.tsx` with the TypeScript parser, gave the same numbers for the call sites (`useMainTabPayload`
105 properties passed, and so on) and the extra hand-overs in the next table.

Sorting into kinds is mine, by name, and is a judgement for the edge cases (below).

## 6c-2. What each tab gets, by kind

| Tab (payload hook) | Settings values | Settings setters | Other state setters | Modal openers and bridge | Refs | Handlers | Status and data | Total |
|---|---|---|---|---|---|---|---|---|
| Main (`useMainTabPayload`) | 18 | 2 | 3 | 7 | 6 | 22 | 47 | **105** |
| Settings (`useSettingsTabPayload`) | 16 | 9 | 0 | 3 | 0 | 4 | 1 | **33** |
| Ollama (`useOllamaTabPayload`) | 14 | 11 | 0 | 3 | 0 | 2 | 1 | **31** |
| Permissions (`usePermissionsTabPayload`) | 2 | 1 | 0 | 0 | 0 | 1 | 1 | **5** |
| Developer (`useDeveloperTabPayload`) | 14 | 12 | 1 | 0 | 0 | 3 | 2 | **32** |
| About (`useAboutTabPayload`) | 3 | 1 | 0 | 0 | 0 | 1 | 0 | **5** |
| Search (`useSearchTabPayload`) | 0 | 0 | 0 | 0 | 0 | 3 | 4 | **7** |
| **All** | **67** | **36** | **4** | **13** | **6** | **36** | **56** | **218** |

- **Survival snapshots: 0 handed to tabs.** They are a separate hand-copy: `index.tsx:689-731` fills 31 fields,
  `bonsaiSessionSurvival.ts:58-100` declares the same 31, and the restore side takes 12 (`useSessionRestoreAfterRemount`)
  and 33 (`useAskSessionSnapshotActions`).
- "Settings values" includes about ten worked-out values: five permission gates (`mediaLibraryEnabled`,
  `desktopNoteSaveEnabled`, `gameContextReadEnabled`, `microphoneAccessEnabled`, `filesystemWrite`), the address
  (`ollamaIp`, `effectiveOllamaPcIp`), `latencyWarningSeconds` (effective), `kidsLockActive`, the language labels, and
  the two bundles (`chatTextSizeSetting`, `streamScramble`). "Settings setters" includes `onAskModeChange`,
  `onPresetPreferAskMode`, `onOllamaIpChange`, `onReplyLanguageChange`, `onStreamScrambleChange`.
- Names by tab: Main's modal bridge is `onOpenPluginHelp`, `onOpenDesktopNoteSave`, `onOpenModelPolicyReadme`,
  `onOpenControllerSettings`, `openCharacterPickerModal`, `onBeforeNestedDeckyModal`, `onCompleteNestedDeckyModalClose`;
  its refs are the six `*HostRef`, `*LayerRef`, `*MeasureRef` of the ask bar.

**What `src/index.tsx` hands, beyond the tabs:** 24 other hook calls take 175 named things (the largest:
`useBonsaiAskOrchestration` 26, `useSessionResetActions` 18, `useDeckyPreviewTestHookRegistration` 15 (goes with the
preview tool), `useOllamaModelsHubModal` 15, `useSessionRestoreAfterRemount` 12, `useVoiceAskWithReadAloud` 10,
`useCharacterPickerModal` 10); 35 of those are settings or their setters by exact name. The root itself destructures
103 names from `usePluginSettings` (L286-388): 96 settings values and setters named one by one and 7 controls. That
list is the first of the "five places" AGENTS.md says the root repeats a setting in.

**After the removals (step 3, before 6c):** 218 becomes 210. Settings loses 6 (`voiceReplyMode`, `setVoiceReplyMode`,
`uiScaleAutoEnabled`, `uiScaleManualProfile`, `appliedUiScaleProfileId`, `onApplyUiScale`) and Developer loses 2
(`steamWebApiKey`, `setSteamWebApiKey`).

**A latent bug the same count found:** `useMainTabPayload`'s rebuild list leaves out 12 values that change
(`strategySpoilerAutoRevealAfterConsent`, `isStreamingPreview`, `streamDisplayText`, `liveThinking`,
`desktopAskVerboseLogging`, `lastRequestId`, `aiCharacterRandom`, `aiCharacterPresetId`, `aiCharacterCustomText`,
`aiCharacterAccentIntensity`, `canSaveDesktopNote`, `desktopNoteSaveEnabled`). The file's own note says so. Nothing
shows a fault, probably because other listed values change at the same moment. 6c removes this class of mistake.

## 6c-3. What the tabs could read from shared state instead

| Group | Count (of 218) | Could the tab read it itself | From where |
|---|---|---|---|
| Settings values and setters | 103 (47%) | yes | `usePluginSettings` already owns all of it; make its result available through a provider at the root. The ten worked-out values become small hooks (`useGatedCapabilities`, the effective address) |
| Modal openers and the modal bridge | 13 (6%) | yes | one provider carrying `captureSessionBeforeModal` and `finalizeShowModalAndRestoreActiveTab` and the openers |
| Refs | 6 (3%) | yes, Main only | the ask bar's own surface (`useUnifiedInputSurface`); they are only used by the ask bar |
| Main's status and handlers | 69 (32%) | yes | one "ask session" provider fed by `useBonsaiAskOrchestration` (it returns 56 things). `MainTab.tsx` already only spreads them on to the transcript (L364) and the ask bar (L403) |
| State setters not saved as settings | 4 | yes | the ask session (3), the error list (1) |
| Search's seven | 7 (3%) | all but about two | tab showing, `selectTab`, `selectSlot`, `isAsking` come from the tab shell and the ask session; `intentPackIndex` and `onSettingClick` are made by hooks the Search tab can call |
| Left per tab | about 30 | no | real per-tab shell state: Settings `onResetSession`, `onClearAllPluginData`, `onJumpToPermission`; Ollama `ollamaTabResetKey`, `onOpenOllamaModelsHub`, `onLastConnectionStatus`, `onApplyTier2MultimodalPolicy`; Developer `capturedErrors`, `setCapturedErrors`, `lastConnectionStatus`, `onSteamInputPhase1Jump`, `installSeedKnowledgeBase`; Permissions `permissionJumpReturnTab`, `onReturnFromPermissionJump` (both could come from `usePermissionJump`, which already keeps them in module state); Main about 12 grouped values |

## 6c-4. A proposed goal

**At most 40 things handed to the seven tabs in all (from 218, about one in five), with no tab but Main above 5 and
Main at or below 14.** Reasons:

- My count of what is genuinely left is about 30 (last row above). Forty keeps ten of slack. A lower number would
  force module-level singletons that hide the same coupling.
- It is easy to check: `scripts/shell_seam.mjs` already counts it. Two changes: add the Search tab (it counts six), and
  set the ratchet's `shell_props_to_tabs` target (today `best 215, target 150` in `scripts/ratchet.json`) to the new goal.
- It can be reached in two stages, and stopping after the first is a fair choice: **stage 1, settings only**
  (103 fewer, total 115, about half); **stage 2, the ask session, the modal bridge and the refs** (down to about 30).
- Stage 1 is also what makes 6a's "2 or 3 places" true: the root's destructure and the three spots in each payload
  hook only go away when a tab reads its settings itself. I suggest stage 1 lands inside the 6a session.
- Test setup first: about 8 test files build the settings props by hand (6a-2 place 13), and the five `SettingsTab` tests, the
  Developer and About tab tests build a tab's full props. The shared test setup of step 5 should land first so the provider is added once.
- Deck risk: a tab that reads shared state re-renders on any change to it; the rebuild lists exist to prevent that.
  Provide the state in slices (settings, ask session, modal bridge) so a settings change does not redraw the
  transcript.

---

## Open questions for the one running the session

1. **Is the shared helper's scope the eight, or all the memories of stops?** About 25 module-level slots in 14 files
   keep their own element or nav node, and two near-copies (`injectChipNav.ts`, `pullModelsRemoveReturn.ts`) and the
   Search back-line slot are newer than the plan's starting commit. Plan 86 § 5 says a ninth helper means ask the
   maintainer. *Settled by:* the maintainer's call; my recommendation is to do the eight, make the two near-copies
   uses of the helper in the same pass, and leave the slots for after.
2. **Do the plan's "two shared check files" both come from the list?** The defaults file can; the hostile file cannot
   (64 hand-made cases). Recommend: generate the first, keep the second and the read-back table by hand. *Settled by:*
   the session agreeing that wording change to § 6 step 6a.
3. **The latency numbers and the capability `1`:** the screen snaps to the slider step, Python only clamps; Python
   accepts `1` as on, the screen only `true`. Python wins by rule, so does the screen change, or do both stay as
   written custom rules? Recommend: stay custom, add no hostile case until decided. *Settled by:* the session; a Deck
   check is not needed (the screen only sends legal values).
4. **Where does the list live and how is it read?** Recommend: the list in one data file, generated files committed,
   a check that a fresh run changes nothing, no runtime reading (the back end never opens the list). *Settled by:*
   design in the 6a session.
5. **One `tabindex` rule and one landing check for the shared helper.** Four rules today (6b-3). *Settled by:* Deck
   measurements, as AGENTS.md requires; Opus does 6b.
6. **Should every transfer carry the window check?** Fifteen of the 20 direct transfers have none. *Settled by:* a
   Deck walk of the in-bubble hand-offs with and without it.
7. **6c's goal numbers** (at most 40, Main at most 14). *Settled by:* the session; stage 1 alone is a safe stop.
8. **Dead id and dead take:** `"session-context-strip"` (never registered). Drop it? *Settled by:* a Deck walk of the
   session strip's Up (`liveTurnFocusGraph.ts:403-408` falls back to a page query now).
9. **Documents that become false:** AGENTS.md "only direct call inside the registry", AGENTS.md "one deliberate
   exception" (after the UI scale removal), `tests/contracts/README.md` ("40 keys", the UI scale exception),
   `focus-graph-patterns.md` and AGENTS.md "copy the UI scale section". For step 7 and the bookkeeper.
10. **The deprecated `preset_chip_fade_animation_enabled`** is only kept because the screen still reads it and is
    derived on both sides. Drop it with the generator (saved-file shape changes, harmless: unknown keys are ignored)
    or keep it as one derived line? *Settled by:* the session.
11. **`focus-baseline.json` keys** follow the files in steps 4 and 6b. *Settled by:* running the focus-pattern check
    after the first move in a copy.

## Records found wrong

About 70 of the 297 digest records were checked against the code, plus the eight registries' records and the records
of `injectChipNav.ts`, `chatRowMoves.ts` and `usePluginSettings.ts`. Most line numbers hold. Found wrong:

- **b59, `src/utils/drgGlossaryTermRegistry.ts`, removal and new folder:** said "glossary: whole file" and "goes away".
  True: the glossary chips, their registry and their tooltip stay; only the word list, the matcher and the one-game
  names go or change (reviewer kit). Keep it, rename it, and move it with the D-pad helpers.
- **b18, `src/utils/answerBubbleElRegistry.ts`, untangle:** said none. True: it is one of the eight D-pad helpers
  (two maps by answer key, L47 and L59; 12 registering and taking sites listed in 6b-1).
- **b28, `src/components/AboutTab.tsx`, untangle:** said it gets about 8 things from the main screen, including "the
  three addresses". True: 5; the three addresses are constants set in `useAboutTabPayload.tsx:35-37`.
- **b42, `src/hooks/usePluginSettings.ts`, untangle:** said it passes about 53 settings and their setters to the main
  screen (L545-561). True: 53 values, 53 setters and 8 controls, 114 in all.
- **b38, `src/features/plugin-shell/modalReturnFocusRegistry.ts`, untangle:** said "own list in `focusOwnerById`
  L235-265". True: the list is the id type (L30-81) and the owners map (L90); `focusOwnerById` is the step that lands.
  (Minor.)
- **b28, `src/index.tsx`, untangle:** said the Main tab call passes about 104 things. True: 105. (Minor; the other tabs'
  counts, 33, 31, 5, 32, 5, 7, are right.)
