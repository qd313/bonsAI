# Folder map: tabs, settings and models

Written 2026-10-16 by the plan 86 step 2 tabs-settings-models reviewer (Sonnet 5.5 high), from the records of batches
b28 to b48, on `experimental` at `b5ce2768`. The table of moves is the sibling file
`folder-map-tabs-settings-models.tsv` (one line per file, 391 lines).

## In plain words

Nothing a player sees changes in this part of the plan. It is about where 391 screen-side files sit: the Settings,
Ollama, Developer, Permissions and About tabs, the AI models box, the plugin shell, the AI characters, the style
files and the shared small parts.

- **72 files stay where they are** (the entry file `index.tsx` and its four tests, the tab payload hooks, the tab bar,
  the folded-tab machinery and others that already sit in the right folder).
- **306 files move** into a folder per feature. Where a feature already had its own folder, the files join it.
- **13 files go away whole** with the UI scale and weekly-refresh removals. They are listed at the end of the map. The
  removal lanes write their own cut lists; I only mark these files.
- **Four calls need the maintainer's eye** (section 1): the models box gets one sub-folder for its Browse and pull
  dialog; data files go to their feature's folder, so this part leaves no `src/data/` behind; the numbered style files
  stay as one layer; the seven tab payload hooks stay together. Three style files also get a `Styles` ending, because
  their names would clash with a screen part of the same name on Windows, which does not tell `aboutTab.ts` from
  `AboutTab.tsx`.
- **The one real risk is not the moves.** Eleven tests find the files they read by writing the folder out in plain
  text, or by counting folder levels ("two levels up, then `tests/contracts`"). The move tool cannot fix those. If they
  are not made folder-proof first, each move commit goes red. Section 2.1 lists them line by line.
- **A few findings are worth a look beyond the plan.** The biggest: a 1,101-line file of pixel avatar art for the AI
  characters is never drawn by the app (section 5).

## 1. The folder map

### 1.1 The rules I used

1. **A file goes with the feature whose behaviour it describes**, even when other features import it. A file with no
   single owner goes to `src/shared/` (in a named sub-folder when three or more files belong together).
2. **A tab's own controls go in that tab's folder, even when the setting belongs to another feature.** So the Reply
   style, Thinking, keep-alive and timeout rows are in `ai-connection/` (they are drawn on the Ollama tab). A whole
   section that is one feature's own surface goes with that feature: the character section, the voice-engine section.
3. **A test goes with the file it tests.** I checked every test against its subject by name and by what it imports.
   The only test whose folder differs from the file named like it is `SettingsTab.mdns.test.ts`: it is about network
   discovery, not the Settings tab, so it goes with `useMdnsOllamaDiscovery`.
4. **A file already in a right folder stays.** I did not move files to make a folder look neater.
5. **Files a tool or a script finds by exact path stay**, unless moving is the point: `src/pluginVersion.ts` (four
   scripts write or name it), `src/types/rpcMethods.ts` (generated), `src/index.tsx`.
6. **The map describes the state after step 3's removals.** Where a file is only partly a removal, its line gives the
   place the rest goes (section 1.5).
7. **No two files may share a name ignoring capitals and the last extension** in one folder. I checked every
   destination against every tracked file: three style files clash (below).

### 1.2 The calls you asked for

- **`model-routing/` folds into `models/`.** It holds two files today (`useTryOrderPlaces.ts` and its test), and it
  serves only the AI models box's try-order switch. The readers also proposed `modelRoutingOrder.ts` and
  `activeOllamaRoutingTag.ts` (now in `utils/`) for it; they land in `models/`. A one-feature folder of two files has no
  reason to exist.
- **The models box gets a sub-folder, `models/pull-box/`.** Counting everything, the box is 78 files. The Browse and
  pull dialog (56 files: `PullModels*`, `usePullModel*`, `pullModels*`, `mergePullModelCatalog`, the filters, the models
  list style) forms a clear block that the hub uses as one part. 22 files sit directly in `models/` (the hub, policy,
  routing, the starter set, the model tables). Precedent: `plugin-shell/tabs/`. If the maintainer prefers one flat
  folder, drop the `pull-box/` segment from the `.tsv`.
- **`folded-tabs/` stays its own folder.** It holds the shared machinery (section line, Open all, help strip, the
  open/closed store, the arrival ring, dense rows): 17 files used by three tabs. The three per-tab fold lists leave for
  their tab, because a new row on a tab means editing that tab's fold list: `developerTabFolds` to `developer/`,
  `settingsTabFolds` to `settings/`, `ollamaTabFolds` to `ai-connection/`. `shoulderSwitch.ts` (LB/RB) goes to
  `shared/focus/`: its two users are the tab bar and the Open all button. `styles/sections/foldedTabs.ts` joins the
  folder.
- **`src/styles/sections/` stays for the base and the numbered slices only.** `scopeBase.ts`, `section-1` to
  `section-9` and the tests of `section-4`, `section-5`, `section-6` stay (13 files). The readers filed each numbered
  slice under one feature, but their own records say the slices mix several (`section-6` carries answer, chip and
  question-box rules; `section-4` carries presets and the Ask bar), and `bonsaiScopeStylesheet.ts` glues the slices in
  a fixed order. Splitting rules by feature is real CSS work with ordering risk, not a move. Slices named for one
  feature move with it: `aboutTab` to `about/`, `answerBubble`, `answerMarkdownFormatting`, `chatDetailsText`,
  `questionBubble`, `replyRatingChoices` to `answer/`, `chatSlotModal` to `chat-slots/`, `detailsSlot` to
  `details-slot/`, `foldedTabs` to `folded-tabs/`, `gamepadAndPullModels` to `models/pull-box/`, `presetChipLabel` to
  `preset-carousel/`, `tabIndicatorBar` to `plugin-shell/`, `userNotes` to `user-notes/`. `textPx.ts` (Text size, about
  100 importers) and `gameRunningLighter` go up one level to `src/styles/`; `answerBubbleCorners.ts` and `uiScalePx.ts`
  go away with their removals.
- **Three style slices are renamed on the way** (the tool allows a new full path): `aboutTab.ts` becomes
  `about/aboutTabStyles.ts` (beside `AboutTab.tsx`), `tabIndicatorBar.ts` becomes `plugin-shell/tabIndicatorBarStyles.ts`
  (beside `TabIndicatorBar.tsx`), `detailsSlot.ts` becomes `details-slot/detailsSlotStyles.ts` (beside `DetailsSlot.tsx`).
  `import "./AboutTab"` on a case-insensitive system could pick `aboutTab.ts` first. The Search tab already uses the
  `...Styles.ts` ending (`searchTabStyles.ts`).
- **`plugin-shell/tabs/` stays as it is** (seven payload hooks and the Search tab's test). The readers sent each payload
  hook to its feature. I kept them together: step 6c works on them as a set, `scripts/shell_seam.mjs:22` is wired to
  this folder (it reads six of them by name), and splitting them first would make 6c harder. The tab bar, the tab titles,
  the tab body root and their tests also stay in `plugin-shell/` itself (the readers proposed moving them into `tabs/`;
  there is no gain).
- **Glue hooks that serve one feature move out of `plugin-shell/`.** These were taken out of `index.tsx` and each serves
  one feature: `useCharacterPickerModal` to `characters/`, `useOllamaModelsHubModal` (+ test) to `models/`,
  `usePluginHelpModal` to `about/`, `useAppLogPrefsAndCapturedErrors` and `useDeveloperToolActions` to `developer/`,
  `useOllamaConnectionState` to `ai-connection/`, `useSessionResetActions`, `developerTabSignal` and
  `settingsLoadedSignal` to `settings/`, `useChatSlotActivityState` to `chat-slots/`, `useUnifiedInputBehaviors` to
  `unified-input/`. The ones that serve the shell itself stay (`useBonsaiScopeStyle`, `useExternalNavigationActions`,
  `useTabAndModeGuardEffects`, `useSessionRestoreAfterRemount`, `useHiddenTabHeaderTrap`, `initialSessionSnapshot`,
  `pluginStorage`). `useHiddenTabHeaderTrap` stays (its only user is `index.tsx`; the readers said `shared/focus/`).
- **`jsdom.d.ts` and `types.d.ts` stay.** `tsconfig.json:22` includes all of `src`, so they would work anywhere, but
  `jsdom.d.ts`'s only user (`useHiddenTabHeaderTrap.test.tsx`) stays beside it.

### 1.3 The data folder: the rule, file by file

No `src/data/` folder is left for this area. The rule: a data file goes to the feature whose rules or words it holds;
a file two or more features share and none owns goes to `src/shared/`. Importer counts are from the script's facts,
checked against the code.

| File (30 in `src/data/`) | Goes to | Why |
|---|---|---|
| `bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts` (+ the two contract tests) | `settings/` | the saved-file names and rules; 44 files import the schema, but its owner is settings |
| `aiCharacterAccentIntensity.ts`, `characterCatalog.ts` (+test), `characterPropGlyphAppearance.ts`, `characterPlaceholderEmoticonGrids.ts`, `characterUiAccent.ts` (+test) | `characters/` | the character's own values; `characterUiAccent` reaches the whole panel only through `useBonsaiScopeStyle` |
| `deprioritizedModels.ts`, `modelPolicy.ts`, `pullModelCatalog.ts` (+test), `pullModelLicencePill.ts` | `models/` | model rules and tables; `pullModelCatalog` is used by 20 pull-box files, `modelPolicy` by 12 |
| `ollamaKeepAlive.ts` | `ai-connection/` | the keep-alive choices of the Ollama tab |
| `pluginQuickStartInstructions.tsx` | `about/` | the quick start words (read as text by `firstRunNoticeWording.test.ts`, section 2.1) |
| `replyLanguage.ts` (+test), `steamLanguages.ts` | `shared/i18n/` | the language lists feed the About dropdown, the settings schema and the translation lookup together |
| `settingsDatabase.ts` | `search-tab/` | one user: the Search tab's model |
| `steam-input-lexicon.ts` (+test) | `developer/` | the Steam Input jump experiment on the Developer tab (users: `useDeveloperToolActions`, `steamInputJump`) |
| `chatTextSize.ts` (+test) | `shared/text-size/` | five importers in four features; Text size is no one feature's |
| `steamSettingsNavigation.ts` | `shared/` | the shell and the Search tab both open Steam settings pages by it |
| `storageKeys.ts` | `shared/` | browser-storage key names used by five features |
| `uiScaleProfile.ts` (+test) | `-` | goes with UI scale |

Data files not in my 391 that follow the same rule (the other reviewers decide, but they should agree):
`replyVerbosity.ts` to `ai-connection/` (importers: the Reply style slider, `OllamaTab`, schema, normalizers,
`ollamaTabFolds`); `deckEssentialsTags.ts` to `models/` (importers: `PullModelsStarterSetChip`, `localOllamaStarterSet`;
two Python tests read it by path, `tests/test_starter_tag_parity.py:31`, `tests/test_starter_set_extras.py:49`);
`askThinkEffort.ts` to `ask/` (the Thinking row is on the Ollama tab but the setting is the Ask box's);
`knowledgeBaseDev.ts` to the knowledge reviewer's folder (its one importer here is `useDeveloperToolActions`).

### 1.4 What lands in `src/shared/`

These are the files the readers marked `src/shared/focus/` or `src/shared/`, with my decision.

| File | Decision |
|---|---|
| `modalReturnFocusRegistry.ts` (+test) | `shared/focus/`: 21 importers in many features |
| `useTabBodyFocusScroll.ts`, `tabBodyScrollPlan.ts` (+test), `tabBodyFocusCalls.test.ts` | `shared/focus/`: 11 tab-body callers in four features |
| `shoulderSwitch.ts` | `shared/focus/`: tab bar and Open all button |
| `settingsPanelScroll.ts` | `shared/focus/`: users are `KnowledgeBaseSection` and `OllamaWhereAiRunsSection`, two features |
| `deckSliderMath.ts`, `DeckFocusSlider.tsx` (+tests) | **not shared:** `ai-connection/`. After UI scale goes, all three sliders that use them sit on the Ollama tab |
| `useHiddenTabHeaderTrap.ts` (+test) | **not shared:** stays in `plugin-shell/`; one user (`index.tsx`) |
| `buttonFocusRing.test.ts` | **not shared:** stays in `src/styles/`; it walks the source tree from `join(__dirname, "..")` and keys its lists by path under `src/` |
| `BonsaiModalScope.tsx`, `CancelFirstConfirmModal.tsx` (+test), `createTabLocalSurvival.ts`, `storageKeys.ts`, `steamSettingsNavigation.ts` | `shared/` (flat): eight popups use the scope; eight files in four features use the confirm box |
| `icons.tsx`, `bonsaiLogoPath.ts`, two icon tests | `shared/icons/`: 14 importers; `NOTICE:51` names `bonsaiLogoPath.ts` |
| `catalog.ts`, `keys.ts`, `i18n.ts` (+test), `useReplyLanguage.ts`, `replyLanguage`, `steamLanguages` | `shared/i18n/` |
| `chatTextSize`, `usePublishTextScale` (+tests), `scaledSteamWords.tsx`, `uiScaleScopeBridge.ts` | `shared/text-size/` |
| `pluginVersion.ts`, `types.d.ts` | stay in `src/` |
| `bonsaiUi.ts`, `rpcMethods.ts` | stay in `src/types/` |
| `ringTestProps.ts` | `src/test-harness/`: it builds Settings and Developer tab props for seven tests |

### 1.5 Partly removed files (their `to` is where the rest goes)

- `src/utils/uiScaleScopeBridge.ts` goes to `shared/text-size/`. It carries the merged scope style that holds Text size
  (`useBonsaiScopeStyle.ts` and `BonsaiModalScope.tsx` use it). The removal lane may rename it (its functions are called
  `publishUiScaleScopeStyle` and `readPublishedUiScaleScopeStyle`). The mover must use the name that exists after step 3.
- `src/styles/sections/textPx.ts` goes to `src/styles/`. It holds `textPx`, `uiTextPx` and `TEXT_SCALE_ROOT_CSS`; Text
  size stays.
- `src/hooks/usePullModelCatalog.ts` and `usePullModelCatalogRefresh.ts` go to `models/pull-box/`. The first calls
  `fetch_pull_model_catalog` on open (stays, per the plan); only its subscription to the refresh bus
  (`usePullModelCatalog.ts:16,48`) and the bus call at `useLocalOllamaSetupFlow.tsx:38,209` belong to the weekly
  refresh. The second also learns what is installed and how big it is (stays; its `forceCatalog` flag is never true,
  section 5).
- `src/utils/pullModelCatalogRefresh.ts` is marked `-`: it is a 21-line subscribe/notify bus whose only job is to make
  `usePullModelCatalog` refetch the overlay, and the plan (line 440) lists it as a removal. If the removal reviewer
  decides the bus also serves the on-open call, change this line.

### 1.6 Where I differ from the readers

Of 390 recorded files, I changed the readers' folder for these. Everything else follows them.

| Files | Readers said | I say | Why |
|---|---|---|---|
| TabBodyFocusRoot, TabIndicatorBar, tabTitles + 9 tests | `plugin-shell/tabs/` | stay in `plugin-shell/` | already there; `tabs/` is for payload hooks |
| 7 payload hooks | their feature | stay in `plugin-shell/tabs/` | step 6c; `shell_seam.mjs` |
| `useHiddenTabHeaderTrap` (+test) | `shared/focus/` | stays | one user |
| `DeckFocusSlider`, `deckSliderMath` (+3 tests) | `shared` / `shared/focus/` | `ai-connection/` | only the Ollama tab uses them once UI scale goes |
| `developerTabSignal.ts` | `developer/` | `settings/` | it carries the `show_developer_tab` setting that `usePluginSettings` writes |
| `OllamaThinkingEffortRow` (+test) | `ask/` | `ai-connection/` | drawn on the Ollama tab; rule 2 |
| `pluginVersion.ts` | `src/shared/` | stays | four scripts write or name it |
| `jsdom.d.ts` | `src/types/` | stays | its test stays beside it |
| `buttonFocusRing.test.ts` | `shared/focus/` | stays in `src/styles/` | it reads the tree from `__dirname/..` |
| numbered style slices `section-4` to `section-8` (+3 tests) | `preset-carousel/`, `ask/`, `answer/` | stay in `src/styles/sections/` | they mix features |
| `scopeBase`, `section-1` to `section-3`, `section-9` | `plugin-shell/`, `src/styles/` | stay in `src/styles/sections/` | same |
| `i18n/`, `utils/i18n*`, `useReplyLanguage`, `replyLanguage`, `steamLanguages` | `src/shared/` | `src/shared/i18n/` | eight files that belong together |
| `SettingsDeveloper*Ring.test.tsx` (2) | unsure | `plugin-shell/` | they cover several tabs at once; step 5 may split them by tab |
| `useBonsaiPluginShell.foldedSwitch.test.ts` | unsure | `plugin-shell/` | tests `useBonsaiPluginShell.ts` |
| `modelRoutingOrder`, `activeOllamaRoutingTag` | `model-routing/` | `models/` | `model-routing/` folds in |

### 1.7 The listing (the same moves as the `.tsv`, grouped by new folder)

Paths are under `src/`. "From" shows where a file sits today. Files named "already here" stay.

#### `src/`  (7 files: 0 move in, 7 already here)

The entry file and its four root tests, the generated version file and the image-import types. Stay.

- already here: `index.helpChip.test.tsx`, `index.test.tsx`, `index.textSize.test.tsx`, `index.topStrip.test.tsx`, `index.tsx`, `pluginVersion.ts`, `types.d.ts`

#### `src/types/`  (2 files: 0 move in, 2 already here)

Shared types (existing folder). Stays.

- already here: `bonsaiUi.ts`, `rpcMethods.ts`

#### `src/features/plugin-shell/`  (41 files: 19 move in, 22 already here)

The panel itself: tab bar, tab titles, tab body root, the shell hook, the first-run notices, Quick Access panel guards, the error boundary, session restore. Mostly files already here.

- from `src/components/`: `BonsaiPluginShell.test.tsx`, `BonsaiPluginShell.tsx`, `SettingsDeveloperLeftoverRing.test.tsx`, `SettingsDeveloperWrappedRing.test.tsx`
- from `src/hooks/`: `useBonsaiPluginShell.foldedSwitch.test.ts`, `useBonsaiPluginShell.test.ts`, `useBonsaiPluginShell.ts`, `useDisclaimerAndLocalRuntimeGates.firstOpen.test.tsx`, `useDisclaimerAndLocalRuntimeGates.saveFirst.test.tsx`, `useDisclaimerAndLocalRuntimeGates.tsx`, `useDisclaimerAndLocalRuntimeGates.wordCount.test.tsx`, `useQamPanelHeightGuard.test.ts`, `useQamPanelHeightGuard.ts`, `useQamPanelSideBleed.test.ts`, `useQamPanelSideBleed.ts`, `useTabStripBodyOffset.ts`
- from `src/styles/sections/`: `tabIndicatorBar.ts` (renamed `tabIndicatorBarStyles.ts`)
- from `src/utils/`: `tabBodyViewport.test.ts`, `tabBodyViewport.ts`
- already here: `initialSessionSnapshot.ts`, `jsdom.d.ts`, `PluginErrorBoundary.tsx`, `pluginStorage.ts`, `tabBarNav.test.ts`, `tabBarNav.ts`, `TabBodyFocusRoot.heading.test.tsx`, `TabBodyFocusRoot.tsx`, `TabBodyFocusRoot.walk.test.tsx`, `TabIndicatorBar.layout.test.tsx`, `TabIndicatorBar.mainLabel.test.tsx`, `TabIndicatorBar.test.tsx`, `TabIndicatorBar.tsx`, `tabTitles.test.tsx`, `tabTitles.tsx`, `useBonsaiScopeStyle.ts`, `useExternalNavigationActions.ts`, `useHiddenTabHeaderTrap.test.tsx`, `useHiddenTabHeaderTrap.ts`, `useSessionRestoreAfterRemount.test.ts`, `useSessionRestoreAfterRemount.ts`, `useTabAndModeGuardEffects.ts`

#### `src/features/plugin-shell/tabs/`  (8 files: 0 move in, 8 already here)

The seven tab payload hooks (one per tab, plus the Search tab test) that build what the main screen hands to each tab. They stay together so step 6c (hand-downs) works on them as one set, and `scripts/shell_seam.mjs` is wired to this folder.

- already here: `useAboutTabPayload.tsx`, `useDeveloperTabPayload.tsx`, `useMainTabPayload.tsx`, `useOllamaTabPayload.tsx`, `usePermissionsTabPayload.tsx`, `useSearchTabPayload.test.tsx`, `useSearchTabPayload.tsx`, `useSettingsTabPayload.tsx`

#### `src/features/folded-tabs/`  (18 files: 1 move in, 17 already here)

The shared machinery of folded tabs: section lines, Open all, the help strip, the open/closed store, the arrival ring. Used by the Settings, Ollama and Developer tabs. The per-tab fold lists leave for their tabs.

- from `src/styles/sections/`: `foldedTabs.ts`
- already here: `DenseRow.test.tsx`, `DenseRow.tsx`, `FoldAllButton.test.tsx`, `FoldAllButton.tsx`, `foldAllCover.test.ts`, `FoldedSection.test.tsx`, `FoldedSection.tsx`, `foldedTabArrival.test.ts`, `foldedTabArrival.ts`, `foldedTabsStore.test.ts`, `foldedTabsStore.ts`, `foldLineWidths.test.ts`, `sectionSummary.test.ts`, `sectionSummary.ts`, `TabHelpStrip.test.tsx`, `TabHelpStrip.tsx`, `useHelpStrip.ts`

#### `src/features/settings/`  (35 files: 35 move in, 0 already here)

The Settings tab and the settings plumbing: schema, normalizers, load and save, session reset, the Settings tab's fold list.

- from `src/components/`: `SettingsTab.accentMenuRing.test.tsx`, `SettingsTab.clearAllBack.test.tsx`, `SettingsTab.clearBoxes.test.tsx`, `SettingsTab.focusRing.test.tsx`, `SettingsTab.folded.test.tsx`, `SettingsTab.foldedWalk.test.tsx`, `SettingsTab.modalReturnFocus.test.tsx`, `SettingsTab.textSizeWalk.test.tsx`, `SettingsTab.tsx`, `SettingsTabChatTextSizeRow.test.tsx`, `SettingsTabChatTextSizeRow.tsx`, `SettingsTabChoiceRow.tsx`, `SettingsTabDataSection.tsx`, `SettingsTabPresetSingleChip.test.tsx`, `SettingsTabRememberTypedSwitch.test.tsx`, `SettingsTabScreenshotHeading.test.tsx`, `useSettingsTabFocus.ts`
- from `src/data/`: `bonsaiSettingsContract.test.ts`, `bonsaiSettingsHostileContract.test.ts`, `bonsaiSettingsNormalizers.ts`, `bonsaiSettingsSchema.ts`
- from `src/features/folded-tabs/`: `settingsTabFolds.test.ts`, `settingsTabFolds.ts`
- from `src/features/plugin-shell/`: `developerTabSignal.ts`, `settingsLoadedSignal.ts`, `useSessionResetActions.tsx`
- from `src/hooks/`: `usePluginSettings.readBack.test.ts`, `usePluginSettings.test.ts`, `usePluginSettings.ts`, `useSettingsLoadedFlag.ts`
- from `src/utils/`: `clearBonsaiBrowserStorage.test.ts`, `clearBonsaiBrowserStorage.ts`, `settingsContracts.test.ts`, `settingsPayload.ts`, `settingsTabLocalSurvival.ts`

#### `src/features/ai-connection/`  (48 files: 48 move in, 0 already here)

The Ollama tab: where the AI runs (this Deck or a PC), the local set-up flow, saved hosts, network discovery, keep-alive, timeouts, the Reply style and Thinking rows, and the Deck slider those rows use (once UI scale goes, only this tab uses the slider).

- from `src/components/`: `OllamaFindLanHidden.test.tsx`, `OllamaReplyVerbositySlider.tsx`, `OllamaSavedHostsRows.tsx`, `OllamaSetupStatusLine.tsx`, `OllamaTab.focusRing.test.tsx`, `OllamaTab.foldedWalk.test.tsx`, `OllamaTab.modalReturnFocus.test.tsx`, `OllamaTab.terseMode.test.tsx`, `OllamaTab.tsx`, `OllamaThinkingEffortRow.test.tsx`, `OllamaThinkingEffortRow.tsx`, `OllamaWhereAiRunsSection.cancelRing.test.tsx`, `OllamaWhereAiRunsSection.constants.test.tsx`, `OllamaWhereAiRunsSection.constants.tsx`, `OllamaWhereAiRunsSection.constants.wording.test.tsx`, `OllamaWhereAiRunsSection.downloadsOffUpdate.test.tsx`, `OllamaWhereAiRunsSection.httpsAddress.test.tsx`, `OllamaWhereAiRunsSection.inPlaceSetup.test.tsx`, `OllamaWhereAiRunsSection.noBoxNoteReturn.test.tsx`, `OllamaWhereAiRunsSection.returnFocus.test.tsx`, `OllamaWhereAiRunsSection.starterOffer.test.tsx`, `OllamaWhereAiRunsSection.test.tsx`, `OllamaWhereAiRunsSection.tsx`, `OllamaWhereAiRunsSection.types.ts`, `OllamaWhereAiRunsSection.walk.test.tsx`, `SettingsTab.mdns.test.ts`, `SettingsTabConnectionTimeoutSlider.tsx`, `SettingsTabOllamaKeepAliveSlider.tsx`, `developerConnectionStatus.ts`, `useOllamaTabFocus.ts`
- from `src/components/deck/`: `DeckFocusSlider.ring.test.tsx`, `DeckFocusSlider.test.ts`, `DeckFocusSlider.tsx`
- from `src/data/`: `ollamaKeepAlive.ts`
- from `src/features/folded-tabs/`: `ollamaTabFolds.ts`
- from `src/features/plugin-shell/`: `useOllamaConnectionState.ts`
- from `src/hooks/`: `useLocalOllamaSetupFlow.inPlace.test.tsx`, `useLocalOllamaSetupFlow.tsx`, `useMdnsOllamaDiscovery.tsx`, `useMdnsOllamaDiscovery.wording.test.tsx`, `useOllamaLocalAutostart.ts`
- from `src/utils/`: `deckSliderMath.test.ts`, `deckSliderMath.ts`, `ollamaAddress.test.ts`, `ollamaAddress.ts`, `ollamaTabLocalSurvival.ts`, `persistOllamaIp.test.ts`, `persistOllamaIp.ts`

#### `src/features/models/`  (22 files: 22 move in, 0 already here)

The AI models box (the hub): policy tiers, try order, routing, the starter set, and the model tables the box reads. The old `model-routing/` folder folds in here.

- from `src/components/`: `ModelPolicyTierPanel.tsx`, `ModelRoutingAdvancedPanel.tsx`, `OllamaModelsHubModal.cancelRestores.test.tsx`, `OllamaModelsHubModal.renderLoop.test.tsx`, `OllamaModelsHubModal.returnFocus.test.tsx`, `OllamaModelsHubModal.test.tsx`, `OllamaModelsHubModal.tsx`
- from `src/data/`: `deprioritizedModels.ts`, `modelPolicy.ts`, `pullModelCatalog.test.ts`, `pullModelCatalog.ts`, `pullModelLicencePill.ts`
- from `src/features/model-routing/`: `useTryOrderPlaces.test.tsx`, `useTryOrderPlaces.ts`
- from `src/features/plugin-shell/`: `useOllamaModelsHubModal.openOnce.test.tsx`, `useOllamaModelsHubModal.tsx`
- from `src/hooks/`: `localOllamaStarterSet.tsx`, `useStarterSetRunWatch.ts`
- from `src/utils/`: `activeOllamaRoutingTag.test.ts`, `activeOllamaRoutingTag.ts`, `modelRoutingOrder.test.ts`, `modelRoutingOrder.ts`

#### `src/features/models/pull-box/`  (56 files: 56 move in, 0 already here)

The Browse and pull part of the AI models box: the pull dialog, its filters column, table, try-order cells, confirm boxes and the hooks behind them. A sub-folder so `models/` does not hold 78 files.

- from `src/components/`: `PullModelLicenceSlot.tsx`, `PullModelsCustomTagEntry.tsx`, `PullModelsFiltersColumn.layout.test.ts`, `PullModelsFiltersColumn.test.tsx`, `PullModelsFiltersColumn.tsx`, `PullModelsModal.customTagCancel.test.tsx`, `PullModelsModal.customTagChip.test.tsx`, `PullModelsModal.formSubmit.test.tsx`, `PullModelsModal.gamepadOK.test.tsx`, `PullModelsModal.licencePill.test.tsx`, `PullModelsModal.listEnds.test.tsx`, `PullModelsModal.listScroll.test.tsx`, `PullModelsModal.otherInstalledSize.test.tsx`, `PullModelsModal.removeBoxReturn.test.tsx`, `PullModelsModal.removeKeepsPcName.test.tsx`, `PullModelsModal.test.tsx`, `PullModelsModal.tryOrder.test.tsx`, `PullModelsModal.tsx`, `PullModelsModal.types.ts`, `PullModelsPcRow.tsx`, `PullModelsStarterSetChip.test.tsx`, `PullModelsStarterSetChip.tsx`, `PullModelsTableHeader.tsx`, `PullModelsTryOrder.tsx`, `pullModelsBeside.test.ts`, `pullModelsBeside.ts`, `pullModelsBoxMemory.ts`, `pullModelsListClearance.ts`, `pullModelsRemoveReturn.ts`
- from `src/hooks/`: `usePullModelCatalog.ts`, `usePullModelCatalogRefresh.ts`, `usePullModelCustomTagPull.tsx`, `usePullModelDeleteConfirm.safeFirst.test.tsx`, `usePullModelDeleteConfirm.tsx`, `usePullModelDownloadNotice.test.tsx`, `usePullModelEmbeddedFooterState.ts`, `usePullModelOpenBookkeeping.test.tsx`, `usePullModelOpenBookkeeping.ts`, `usePullModelPinForAsk.test.tsx`, `usePullModelPinForAsk.tsx`, `usePullModelSubmitSelected.tier2Box.test.tsx`, `usePullModelSubmitSelected.tsx`, `usePullModelTableData.ts`, `usePullModelTier2Confirm.safeFirst.test.tsx`, `usePullModelTier2Confirm.tsx`, `usePullModelTier2Wording.test.tsx`, `usePullModelToggleSelection.safeFirst.test.tsx`, `usePullModelToggleSelection.tsx`
- from `src/styles/sections/`: `gamepadAndPullModels.test.ts`, `gamepadAndPullModels.ts`
- from `src/utils/`: `mergePullModelCatalog.test.ts`, `mergePullModelCatalog.ts`, `pullModelFilters.ts`, `pullModelNewBadge.ts`, `pullModelRecommendations.test.ts`, `pullModelRecommendations.ts`

#### `src/features/permissions/`  (16 files: 16 move in, 0 already here)

The Permissions tab, the Kids lock (Steam parental) watcher, and the jump-to-a-permission-switch helpers.

- from `src/components/`: `PermissionDenyAction.test.tsx`, `PermissionDenyAction.tsx`, `PermissionsTab.internetDownloads.test.tsx`, `PermissionsTab.permissionRowNavRegistration.test.tsx`, `PermissionsTab.test.tsx`, `PermissionsTab.tsx`
- from `src/hooks/`: `useKidsLock.test.ts`, `useKidsLock.ts`, `usePermissionJump.test.ts`, `usePermissionJump.ts`
- from `src/utils/`: `permissionDeepLink.test.ts`, `permissionDeepLink.ts`, `permissionJumpRegistry.test.ts`, `permissionJumpRegistry.ts`, `steamParental.test.ts`, `steamParental.ts`

#### `src/features/developer/`  (22 files: 22 move in, 0 already here)

The Developer tab (rows, folded sections, focus helper), the debug overlay and log, captured-error hooks, the Steam Input jump experiment.

- from `src/components/`: `BonsaiDebugOverlay.tsx`, `DeveloperOptionRow.tsx`, `DeveloperTab.folded.test.tsx`, `DeveloperTab.foldedWalk.test.tsx`, `DeveloperTab.test.tsx`, `DeveloperTab.tsx`, `developerRows.tsx`, `developerRowsAnimations.tsx`, `developerRowsDiagnostics.tsx`, `developerRowsLogging.tsx`, `useDeveloperTabFocus.ts`
- from `src/data/`: `steam-input-lexicon.test.ts`, `steam-input-lexicon.ts`
- from `src/features/folded-tabs/`: `developerTabFolds.test.ts`, `developerTabFolds.ts`
- from `src/features/plugin-shell/`: `useAppLogPrefsAndCapturedErrors.ts`, `useDeveloperToolActions.ts`
- from `src/hooks/`: `useCapturedFrontendErrors.ts`
- from `src/utils/`: `appDesktopLog.test.ts`, `appDesktopLog.ts`, `bonsaiDebugIngest.ts`, `steamInputJump.ts`

#### `src/features/about/`  (11 files: 11 move in, 0 already here)

The About tab, the help popup and the quick start text, and the About tab's styles. One tab, one folder.

- from `src/components/`: `AboutLinks.test.tsx`, `AboutLinks.tsx`, `AboutReplyLanguageSection.tsx`, `AboutRevealRow.tsx`, `AboutTab.test.tsx`, `AboutTab.tsx`, `AboutTab.walk.test.tsx`, `PluginHelpModal.tsx`
- from `src/data/`: `pluginQuickStartInstructions.tsx`
- from `src/features/plugin-shell/`: `usePluginHelpModal.tsx`
- from `src/styles/sections/`: `aboutTab.ts` (renamed `aboutTabStyles.ts`)

#### `src/features/characters/`  (15 files: 15 move in, 0 already here)

AI characters: the catalog, picker popup, avatar art, accent colour and intensity, and the Settings tab's character section.

- from `src/components/`: `CharacterPickerModal.test.tsx`, `CharacterPickerModal.tsx`, `CharacterPropGlyph.tsx`, `CharacterRoleplayEmoticon.test.tsx`, `CharacterRoleplayEmoticon.tsx`, `SettingsTabAccentIntensityMenuPopover.tsx`, `SettingsTabCharacterSection.tsx`
- from `src/data/`: `aiCharacterAccentIntensity.ts`, `characterCatalog.test.ts`, `characterCatalog.ts`, `characterPlaceholderEmoticonGrids.ts`, `characterPropGlyphAppearance.ts`, `characterUiAccent.test.ts`, `characterUiAccent.ts`
- from `src/features/plugin-shell/`: `useCharacterPickerModal.tsx`

#### `src/features/voice/`  (3 files: 3 move in, 0 already here)

Voice input (existing folder; the voice reviewer owns it). Only the Settings tab's voice-engine section lands here.

- from `src/components/`: `VoiceInputSettingsSection.downloadNotice.test.tsx`, `VoiceInputSettingsSection.test.tsx`, `VoiceInputSettingsSection.tsx`

#### `src/features/answer/`  (9 files: 9 move in, 0 already here)

Showing the answer (the answer reviewer owns the folder). Style slices named for the answer bubble, plus the troubleshoot hint helpers.

- from `src/hooks/`: `usePermHintNavTargets.ts`
- from `src/styles/sections/`: `answerBubble.test.ts`, `answerBubble.ts`, `answerMarkdownFormatting.ts`, `chatDetailsText.ts`, `questionBubble.ts`, `replyRatingChoices.test.ts`, `replyRatingChoices.ts`
- from `src/utils/`: `troubleshootHintDismissals.ts`

#### `src/features/ask/`  (1 file)

Asking a question (the ask reviewer owns the folder). One file: the running-game sync hook. From `src/hooks/`: `useOllamaGameContextSync.ts`.

#### `src/features/chat-slots/`  (2 files)

Saved chats (existing folder). From `src/features/plugin-shell/`: `useChatSlotActivityState.ts`. From `src/styles/sections/`: `chatSlotModal.ts`.

#### `src/features/details-slot/`  (1 file)

Details panel (existing folder). From `src/styles/sections/`: `detailsSlot.ts` (renamed `detailsSlotStyles.ts`).

#### `src/features/preset-carousel/`  (4 files)

Suggestion chips (existing folder). From `src/styles/`: `presetChipFocusRing.test.ts`, `presetChipHighlightFill.test.ts`. From `src/styles/sections/`: `presetChipLabel.test.ts`, `presetChipLabel.ts`.

#### `src/features/search-tab/`  (3 files)

The Search tab (existing folder). From `src/data/`: `settingsDatabase.ts`. From `src/hooks/`: `useSteamSettingsSearch.openPage.test.ts`, `useSteamSettingsSearch.ts`.

#### `src/features/unified-input/`  (1 file)

The Ask bar (existing folder). From `src/features/plugin-shell/`: `useUnifiedInputBehaviors.ts`.

#### `src/features/user-notes/`  (1 file)

The player's notes (existing folder). From `src/styles/sections/`: `userNotes.ts`.

#### `src/shared/`  (6 files)

Small things several features use that belong to none: the popup scope, the two-button confirm box, storage key names, Steam settings page names, the per-tab survival helper.

- from `src/components/`: `BonsaiModalScope.tsx`, `CancelFirstConfirmModal.test.tsx`, `CancelFirstConfirmModal.tsx`
- from `src/data/`: `steamSettingsNavigation.ts`, `storageKeys.ts`
- from `src/utils/`: `createTabLocalSurvival.ts`

#### `src/shared/focus/`  (8 files)

D-pad helpers more than one feature calls: the popup return-focus registry, tab-body scroll and its plan, the LB/RB switch, the Up-at-top scroll fallback. The D-pad reviewer may fold these into the one helper.

- from `src/features/folded-tabs/`: `shoulderSwitch.ts`
- from `src/features/plugin-shell/`: `modalReturnFocusRegistry.test.ts`, `modalReturnFocusRegistry.ts`, `tabBodyFocusCalls.test.ts`, `useTabBodyFocusScroll.ts`
- from `src/utils/`: `settingsPanelScroll.ts`, `tabBodyScrollPlan.test.ts`, `tabBodyScrollPlan.ts`

#### `src/shared/i18n/`  (8 files)

The few translated interface strings and the reply-language / Steam-language lists, with the hook that supplies the current language. Every feature that shows a translated string reads these.

- from `src/data/`: `replyLanguage.test.ts`, `replyLanguage.ts`, `steamLanguages.ts`
- from `src/hooks/`: `useReplyLanguage.ts`
- from `src/i18n/`: `catalog.ts`, `keys.ts`
- from `src/utils/`: `i18n.test.ts`, `i18n.ts`

#### `src/shared/icons/`  (4 files)

Icons and the bonsAI logo outline (`bonsaiLogoPath.ts`, named in NOTICE), with their two tests. From `src/components/`: `bonsaiLogoPath.ts`, `icons.bonsaiGeometry.test.tsx`, `icons.tabStroke.test.tsx`, `icons.tsx`.

#### `src/shared/text-size/`  (6 files)

The Text size setting's shared parts: the three steps, the variable on the root, the bridge that carries it to popups, popup publishing, and the Steam-word components that follow it.

- from `src/components/`: `scaledSteamWords.tsx`
- from `src/data/`: `chatTextSize.test.ts`, `chatTextSize.ts`
- from `src/features/plugin-shell/`: `usePublishTextScale.test.tsx`, `usePublishTextScale.ts`
- from `src/utils/`: `uiScaleScopeBridge.ts`

#### `src/styles/`  (6 files: 3 move in, 3 already here)

The scope stylesheet, the shared glass button, and the two helpers every style file uses (`textPx`, `gameRunningLighter`).

- from `src/styles/sections/`: `gameRunningLighter.test.ts`, `gameRunningLighter.ts`, `textPx.ts`
- already here: `bonsaiScopeStylesheet.ts`, `buttonFocusRing.test.ts`, `settingsGlassButton.ts`

#### `src/styles/sections/`  (13 files, all already here)

The base and the numbered style slices (`scopeBase`, `section-1` to `section-9`). Each mixes several features, so they stay as one layer.

- already here: `scopeBase.ts`, `section-1.ts`, `section-2.ts`, `section-3.ts`, `section-4.test.ts`, `section-4.ts`, `section-5.test.ts`, `section-5.ts`, `section-6.test.ts`, `section-6.ts`, `section-7.ts`, `section-8.ts`, `section-9.ts`

#### `src/test-harness/`  (1 file)

Shared test setup (existing folder). From `src/components/`: `ringTestProps.ts`.

#### Go away whole (`-` in the table), 13 files

- `src/components/SettingsTabUiScaleHeading.test.tsx`, `SettingsTabUiScaleHidden.test.tsx`, `SettingsTabUiScaleSection.greyedApply.test.tsx`, `SettingsTabUiScaleSection.test.ts`, `SettingsTabUiScaleSection.tsx`, `SettingsTabUiScaleSlider.tsx` (UI scale)
- `src/context/UiScaleContext.tsx`, `src/data/uiScaleProfile.test.ts`, `src/data/uiScaleProfile.ts`, `src/hooks/useUiScaleProfile.ts`, `src/styles/sections/uiScalePx.ts` (UI scale)
- `src/styles/sections/answerBubbleCorners.ts` (read aloud: the whole file styles the speaker's corner)
- `src/utils/pullModelCatalogRefresh.ts` (weekly refresh)

## 2. What a move must also update

Checked with `git grep` for the path and for the bare file name in `scripts/`, `tests/`, `packages/`, `py_modules/`,
`vitest.config.ts`, `.github/`, `.githooks/`, `.claude/`, `docs/` and the root files, and with a search of every
`.test` file in `src/` that reads files (`readFileSync`, `readdirSync`, `process.cwd`, `__dirname`).

### 2.1 Tests that find a source file by building its path (the mover cannot fix these)

`scripts/move_screen_file.mjs` fixes module paths (imports, `vi.mock`, dynamic `import()`) and a repo path written
whole in comments, documents, Python tests, scripts and JSON. It does **not** fix a path put together at run time, a
path relative to `__dirname` that changes depth, or a name written without `src/`. These do that. They are test
changes, and "moving never shares a commit with changing", so each needs a small commit **before** its area's move,
making the test independent of folders (for example: find the file by name anywhere under `src/`, and read fixtures
from the repo root with `process.cwd()`).

| Test (line) | What it reads | What breaks |
|---|---|---|
| `src/features/plugin-shell/tabBodyFocusCalls.test.ts` (L13-20, L25) | six names under `src/components/` through `join(process.cwd(), "src", "components", file)`: `OllamaTab`, `OllamaWhereAiRunsSection`, `KnowledgeBaseSection`, `SettingsTab`, `SettingsTabUiScaleSection` (removed), `SettingsTabConnectionTimeoutSlider` | every file leaves `components/` |
| `src/styles/buttonFocusRing.test.ts` (L39-45 `KNOWN`, L127-137 `TAB_FILES`) | eleven keys written as `components/<name>.tsx`, relative to `src/`, with no `src/` in front: `CharacterPickerModal` in `KNOWN`, and in `TAB_FILES` `SettingsTab`, `SettingsTabUiScaleSection` (removed), `DeveloperTab`, `AboutTab`, `PermissionsTab`, `PermissionDenyAction`, `OllamaSavedHostsRows`, `OllamaWhereAiRunsSection`, `VoiceInputSettingsSection`, `KnowledgeBaseSection` | the mover's repo-path rewrite never matches these |
| `src/components/AboutTab.test.tsx` (L49, L231) | `join(__dirname, "../../docs/demos/mockup-board-2/src")`; `join(__dirname, "../styles/sections/aboutTab.ts")` | depth grows by one (`../../../docs`); the style file lands beside the test as `./aboutTabStyles.ts` (renamed) |
| `src/components/DeveloperTab.folded.test.tsx` (L118) | `path.resolve(__dirname, "../../docs/demos/mockup-board-2/src/42-tabs-data.js")` | depth grows by one |
| `src/components/icons.bonsaiGeometry.test.tsx` (L36-39) | `join(__dirname, "..", "assets", "icons", "bonsai-logo.svg")` | `components/` to `shared/icons/`: one more `..` |
| `src/data/bonsaiSettingsContract.test.ts` (L20), `bonsaiSettingsHostileContract.test.ts` (L19) | `resolve(__dirname, "../../tests/contracts/...json")` | `data/` to `features/settings/`: one more `..` |
| `src/hooks/usePluginSettings.readBack.test.ts` (L30) | `resolve(__dirname, "../../tests/contracts/settings-defaults.json")` | `hooks/` to `features/settings/`: one more `..` |
| `src/components/textSizeScan.test.ts` (L20-23, L37-47, L63) (another area's file) | `components/CharacterRoleplayEmoticon.tsx` and `styles/sections/tabIndicatorBar.ts` by path under `src/`, and a walk of the whole tree | both files move (the second is renamed `tabIndicatorBarStyles.ts`) |
| `src/components/MainTabUnifiedAskBar.noSettingsCard.test.tsx` (L91) (another area's file) | `rel !== "data/bonsaiSettingsNormalizers.ts"` | the normalizers move |
| `src/data/firstRunNoticeWording.test.ts` (L10-12) (another area's file; not in my 391) | `hooks/useDisclaimerAndLocalRuntimeGates.tsx` and `data/pluginQuickStartInstructions.tsx` through `join(__dirname, "..", rel)` | both files move |
| `src/features/folded-tabs/developerTabFolds.test.ts` (L45) | `../../../docs/demos/...` | none: `folded-tabs/` and `developer/` are the same depth |
| `src/features/folded-tabs/settingsTabFolds.test.ts` (L26) | `process.cwd()` | none |

Eleven tests need a prepare step: eight in my area (`tabBodyFocusCalls`, `buttonFocusRing`, `AboutTab.test`,
`DeveloperTab.folded`, `icons.bonsaiGeometry`, the two settings contract tests, `usePluginSettings.readBack`) and three
in other areas' files. `buttonFocusRing.test.ts` and `tabBodyFocusCalls.test.ts` are also on step 5's "reads the
code's text" list, so a prepare commit that makes them find files by name does part of that work.

### 2.2 Python tests and scripts that read screen files

| Place (line) | Names | What to do |
|---|---|---|
| `tests/test_accent_intensity_parity.py:16` (and `:22`, `:28` text) | `root / "src" / "data" / "aiCharacterAccentIntensity.ts"` built from pieces | edit by hand: new path `src/features/characters/` |
| `tests/test_character_catalog_parity.py:16` (and `:19`, `:23` text) | `root / "src" / "data" / "characterCatalog.ts"` built from pieces | edit by hand: `src/features/characters/` |
| `tests/test_starter_tag_parity.py:38` and `:60` | `ROOT / "src" / "utils" / "modelRoutingOrder.ts"` built from pieces (`:31` reads `deckEssentialsTags.ts`, another area) | edit by hand: `src/features/models/` |
| `tests/test_model_policy_docs.py:39` (and `:35`) | `_read("src/data/modelPolicy.ts")`, a whole literal path | the mover rewrites it |
| `tests/contracts/ask-hook-order.json:15`, read by `tests/test_ask_hook_order.py:65` | `src/hooks/useOllamaGameContextSync.ts` | the mover rewrites the JSON; the test reads the path from it |
| `tests/contracts/README.md:11,12` | `src/data/bonsaiSettingsContract.test.ts`, `...HostileContract.test.ts` | the mover rewrites; `:58`, `:63` name `uiScaleProfile.ts` and the UI scale section, which go (removal) |
| `tests/preview-suite/unit-gates.json:13` | `src/utils/settingsContracts.test.ts` | the preview tool's folder goes away entirely (removal) |
| `scripts/focus-baseline.json` L8 `CharacterPickerModal`, L22 `OllamaModelsHubModal`, L25 `OllamaWhereAiRunsSection`, L28 `PullModelsCustomTagEntry`, L31 `PullModelsModal`, L35 `PullModelsTryOrder`, L41 `SettingsTabConnectionTimeoutSlider`, L44 `SettingsTabUiScaleSection` (removal), L47 `modalReturnFocusRegistry`, L84 `settingsPanelScroll`; second block L98, L110, L113, L116, L119 | the files by `src/...` path as JSON keys | the mover rewrites JSON; check that `check-focus-patterns.mjs` finds the renamed keys on its first run |
| `scripts/growth_limits.json` L16 `OllamaWhereAiRunsSection`, L21 `PullModelsModal`, L24 `characterPlaceholderEmoticonGrids` (a candidate for deletion, section 5), L30 `index.tsx` (stays) | by path | the mover rewrites JSON |
| `scripts/ratchet.py:743` and `:746`, `scripts/ratchet.json:136` | `src/hooks/usePluginSettings.ts` (the repeated-settings-list rule, metric 13) | the mover rewrites the literals; run `python scripts/ratchet.py check` after |
| `scripts/shell_seam.mjs:22` | `src/features/plugin-shell/tabs` | none (the folder stays); it also loads six tab payload files by name |
| `scripts/sync-version-from-plugin.mjs:42`, `scripts/bump-version.mjs:3,75`, `scripts/sync_version_from_plugin.test.mjs:14`, `tests/test_sync_version_from_plugin.py:8` | `src/pluginVersion.ts` | none: the file stays (this is why) |
| `scripts/third_party_licenses.test.mjs:38,58,181`, `packages/bonsai-mcp/scripts/generate-architecture.mjs:93,213,281`, `scripts/py_import_graph.py:246` | `src/index.tsx` | none: the file stays |
| `NOTICE:51` | `src/components/bonsaiLogoPath.ts` | the mover rewrites it if `NOTICE` is not in `--leave` |
| `vitest.config.ts:11` | a comment naming `index.test.tsx` | none: it stays |
| `tsconfig.json`, `rollup.config.js`, `package.json`, `.github/`, `.githooks/`, `.claude/` | only `src/types/rpcMethods.ts`, `src/index.tsx` | none |

Comments that name a moved file by name only (the mover will not catch a bare name):
`py_modules/backend/services/settings_service.py:257` (`bonsaiSettingsNormalizers.ts`) and `:602` (`settingsPayload.ts`),
`tests/test_reply_language_snapshot_rpc.py:8` (`useReplyLanguage.ts`). Comments that write the path with `src/`
(`py_modules/backend/ollama_routing.py:68`, `ollama_urls.py:32`, `ai_character_service.py:94,142`,
`intent_pack_service.py:93`, `tests/test_pull_model_catalog_parity.py:9`, `tests/test_settings_contract.py:5`,
`tests/test_ollama_https_refused.py:8`) are rewritten by the tool.

### 2.3 The tool's own limits on this map

- `move_screen_file.mjs --map` refuses a line whose target is its source (`is already there`), so strip the 72 "stay"
  lines and the 13 `-` lines from the `.tsv` before running it.
- `--with-tests` carries tests whose name starts with the file's name. For this map that would send
  `SettingsTab.mdns.test.ts` to `settings/` with `SettingsTab.tsx` while the map sends it to `ai-connection/`, which the
  tool reports as "moved to two places". Run the map without `--with-tests` (the `.tsv` lists every test), or drop the
  `mdns` line and move it in a second step.
- The map has no two files landing on one path, and none lands on an existing file. Case-insensitive clashes
  (same name ignoring capitals and the last extension) were checked against every tracked file; three style slices clash
  and are renamed in the map (section 1.2). Other reviewers' maps must be checked the same way once all eight exist.
- Moves between folders at the same depth need no relative-path edits; the ones that change depth are the `__dirname`
  readers in 2.1.

### 2.4 The drawing data file four tests read

`docs/demos/mockup-board-2/src/42-tabs-data.js` is read as text by `AboutTab.test.tsx:50`,
`DeveloperTab.folded.test.tsx:118`, `developerTabFolds.test.ts:45` and `settingsTabFolds.test.ts:27`, and the words of
every row on the Settings and Developer tabs are checked against it word for word. Two consequences for the plan:

1. If the demo boards move to the workshop in step 1 or 7, these four tests fail. Either keep this one file in the
   repo or copy the words the tests need into a fixture inside `src/`.
2. The removals break the same tests unless the file is edited with them: UI scale rows at L48-50, "Voice replies" at
   L65-66, "Steam ban lookup" at L81, the "Integrations" section and the Steam key field at L112-113.

### 2.5 Live documents that name my files

The mover fixes links and paths in live documents (it leaves `docs/audit`, `docs/planning`, `docs/archive` and
`docs/test-evidence` as written). Lines naming a file that moves, by document (a full path match; a mention by bare name
is not counted): `docs/design-tokens.md` 11, `docs/roadmap-details.md` 4, `docs/development.md` 4,
`docs/troubleshooting.md` 3, `docs/focus-graph.md` 2, `docs/testing.md` 1, `docs/roadmap.md` 1,
`packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md` 5, `.../policies/decky-ui-focus.md` 1,
`.../personas/master-debugger.md` 1, `NOTICE` 1, `CHANGELOG.md` 7 (history: use `--leave CHANGELOG.md`). The roadmap and
testing documents belong to the bookkeeper; decide whether the mover may edit them or the bookkeeper makes those edits
after. `docs/design-tokens.md` also describes `uiScalePx` (L262) and the Read aloud corner (L368), which the removals
change.

### 2.6 Things the moves do not touch but the readers noticed

- `src/components/BonsaiPluginShell.tsx:24-27,46-47` says three other places call `rememberUiDocument`; the code has
  four (`answerBubbleElRegistry.ts:86`, `answerStopRegistry.ts:78`, `spoilerFenceRegistry.ts:56`,
  `drgGlossaryTermRegistry.ts:53`). After the glossary move it is three again, so the comment needs the same edit.
- Step 4's check "no explanation naming a file that has moved" will also catch file headers that name sibling files by
  bare name; the mover does not rewrite those.

## 3. Test files to merge, by topic

All 164 test files in my area total about 22,800 lines. 54 of them mock `@decky/ui`, most with the same shape:
`vi.mock("@decky/ui", async () => { const stubs = await import(".../fakeDeckyUi"); return { ...stubs, <one extra> } })`,
where the one extra thing is a capture of one component's props (a `Button`, a `ConfirmModal`, a `showModal` box) or
nothing. Step 5's shared test setup covers that block; the merges below also remove the repeated `render` helpers and
props lists.

**Clear wins** (same subject, same stand-ins written out again, small files):

| Group (new folder) | Files | Topic | Setup they repeat |
|---|---|---|---|
| Confirm boxes that open on Cancel (`models/pull-box/`) | `usePullModelTier2Confirm.safeFirst`, `usePullModelToggleSelection.safeFirst`, `usePullModelDeleteConfirm.safeFirst`, `usePullModelSubmitSelected.tier2Box`, `usePullModelTier2Wording`, `usePullModelDownloadNotice` (6) | each box opens on Cancel, Cancel and B change nothing, its words are short | `vi.mock` of `@decky/ui` (a `showModal` that stores the box's props), `@decky/api`, `deckyCall`, `downloadNotice` in four of the six; a `BoxProps` type |
| AI models hub (`models/`) | `OllamaModelsHubModal.test`, `.cancelRestores`, `.renderLoop`, `.returnFocus`, `useOllamaModelsHubModal.openOnce` (5) | the hub box's sections, cancel, redraw loop, return focus, open once | `vi.mock("./PullModelsModal")` stand-in that records its props, the `ConfirmModal` capture, `buildProps` |
| Where AI runs: set-up popups (`ai-connection/`) | `OllamaWhereAiRunsSection.downloadsOffUpdate`, `.inPlaceSetup`, `.starterOffer`, `useLocalOllamaSetupFlow.inPlace` (4) | the Update and set-up flows and the boxes they open | the identical `showModal` stand-in (`hoisted.modals.push(...)`), the same 11-line `<OllamaWhereAiRunsSection .../>` props block (`draw`, `drawOnDeck`), the same `settingsLoadedSignal`, return-focus and download-bridge resets |
| Where AI runs: wording (`ai-connection/`) | `OllamaWhereAiRunsSection.constants.test` (11 lines), `.constants.wording.test` (30 lines) | length and words of two lines | none; they are tiny |
| Find LAN (`ai-connection/`) | `useMdnsOllamaDiscovery.wording`, `SettingsTab.mdns`, `OllamaFindLanHidden` (3) | the Find LAN box: words, reply shape, hidden without the Developer tab | `@decky/ui` mock, the discovery hook |
| First-run notices (`plugin-shell/`) | `useDisclaimerAndLocalRuntimeGates.firstOpen`, `.saveFirst`, `.wordCount` (3) | the two one-time notices | the same hook, the same single mock |
| Icons (`shared/icons/`) | `icons.bonsaiGeometry`, `icons.tabStroke` (2) | icon shapes and strokes | none; small |
| Deck slider (`ai-connection/`) | `DeckFocusSlider.ring`, `DeckFocusSlider.test`, `deckSliderMath.test` (3) | the slider's keys, ring and maths | the slider |
| Settings contracts (`settings/`) | `bonsaiSettingsContract`, `bonsaiSettingsHostileContract` (2) | the settings clean-up against the shared JSON fixtures | `normalizeSettings` import, the same `resolve(__dirname, "../../tests/contracts/...")` read |
| Pull dialog, small files (`models/pull-box/`) | `PullModelsModal.formSubmit` (70 lines), `.licencePill` (64), `.otherInstalledSize` (78) into `PullModelsModal.test` (450) | the dialog's small behaviours | each defines its own `renderModal(overrides)` |
| Pull dialog, custom tag (`models/pull-box/`) | `PullModelsModal.customTagCancel` (85), `.customTagChip` (113) | the typed-name chip and its B key | a `hoisted` props map, `renderModal` |
| Pull dialog, remove (`models/pull-box/`) | `PullModelsModal.removeBoxReturn` (127), `.removeKeepsPcName` (106) | the Remove box and what it sends | `hoisted` records, `renderModal` |
| Pull dialog, list (`models/pull-box/`) | `PullModelsModal.listEnds` (95), `.listScroll` (166) | the list's edges and scroll | the same `Button`-capturing mock, the `pullModelsListLayout` harness |
| Settings tab, clear boxes (`settings/`) | `SettingsTab.clearAllBack`, `.clearBoxes`, `.modalReturnFocus` (3) | the two Clear boxes and the ring back | `buildProps` (a full settings props list written out again; `settingsProps()` in `ringTestProps.ts` exists for this) |
| Settings tab, rows (`settings/`) | `SettingsTabChatTextSizeRow`, `SettingsTabPresetSingleChip`, `SettingsTabRememberTypedSwitch`, `SettingsTabScreenshotHeading` (4) | one row each: values, saves, heading once | `settingsProps()` and the `@decky/ui` mock |
| Ollama tab (`ai-connection/`) | `OllamaTab.focusRing`, `.foldedWalk`, `.modalReturnFocus`, `.terseMode` (4) | rings, folded walk, return focus, Terse stop | `@decky/ui` mock, the same tab props |
| Permissions (`permissions/`) | `PermissionsTab.test`, `.internetDownloads`, `.permissionRowNavRegistration`, `PermissionDenyAction.test` (4) | switches, kids lock, row registration | `@decky/ui` mock, tab props |
| Tab bar (`plugin-shell/`) | `TabIndicatorBar.test`, `.layout`, `.mainLabel`, `tabTitles.test`, `tabBarNav.test` (5); `TabBodyFocusRoot.heading` into `.walk` | the tab bar; the heading test's loop is wholly inside the walk test (`.heading.test.tsx:37-48` against `.walk.test.tsx:207-219`) | `@decky/ui` mock; the same tab list and panes |
| Quick Access guards (`plugin-shell/`) | `useQamPanelHeightGuard.test`, `useQamPanelSideBleed.test` (2) | pane height and side insets | both rest on `tabBodyViewport`'s crushed-pane rule |
| Chip styles (`preset-carousel/`) | `presetChipFocusRing`, `presetChipHighlightFill`, `presetChipLabel` (3) | the chip's ring, fill and label | each builds the stylesheet and reads a rule out of the text |
| Root tests (`src/`) | `index.helpChip` into `index.test` (2) | the plugin root | the real plugin mount; `index.textSize` and `index.topStrip` stay apart (each takes a long full mount) |

**Worth it but needs care** (different stand-ins, so a merge means one wider mock):

| Group | Files | Note |
|---|---|---|
| Developer tab | `DeveloperTab.test`, `.folded`, `.foldedWalk` (3) | share a `props()` list; the folded ones read the drawing data file (2.4) |
| About tab | `AboutTab.test`, `.walk`, `AboutLinks.test` (3) | the walk test uses real geometry, the others words |
| Where AI runs: return focus | `.cancelRing`, `.noBoxNoteReturn`, `.returnFocus` (3) | different captures (`focusables` map, `delayMs`, none) |
| Folded-tab machinery | `foldedTabsStore` + `foldedTabArrival`; `FoldAllButton` + `foldAllCover` + `foldLineWidths`; `sectionSummary` + `settingsTabFolds` + `developerTabFolds` | three smaller groups; the last reads the drawing |
| Settings plumbing | `usePluginSettings.test` + `.readBack` | the read-back test is the guard for every setting (`names settings one by one L39-100`); keep its test names |
| Permission helpers | `permissionDeepLink`, `permissionJumpRegistry`, `usePermissionJump` | `useKidsLock` + `steamParental` stay separate (different mocks) |

**Not worth merging** (own harness, size, or a guard worth keeping separate): `PullModelsModal.tryOrder` (683 lines, its
own `renderBox`), `PullModelsFiltersColumn.test` (22 tests in five blocks, lines 242 to 795),
`PullModelsStarterSetChip.test`, `useSessionRestoreAfterRemount.test` (four mocks), `modalReturnFocusRegistry.test`,
`TabBodyFocusRoot.walk`, the style-slice tests (`section-4/5/6`, `answerBubble`, `gamepadAndPullModels`,
`gameRunningLighter`, `replyRatingChoices`: one per subject file), `useBonsaiPluginShell.test` + `.foldedSwitch`
(different set-up), the Python-mirror guards (`ollamaAddress.test`, `modelRoutingOrder.test`, the characters tests), and
every pure-function test (`tabBodyScrollPlan`, `tabBodyViewport`, `i18n`, `clearBonsaiBrowserStorage`,
`mergePullModelCatalog`, `pullModelRecommendations`).

## 4. Tests that check the code's text instead of what it does

### 4.1 Tests that read a source file or a data file as text

| Test (line) | What it reads | Could it become a behaviour test? |
|---|---|---|
| `src/features/plugin-shell/tabBodyFocusCalls.test.ts` L25-28 | each of six component files as text, drops comment lines, regex for `.focus(` not on a `focusInTabBody` line (the records marked this "no"; it is "yes") | not by a behaviour test: it forbids a style of call. `scripts/check-focus-patterns.mjs` has four rules (page search, move props on a Decky button, tabindex removal, ring question) and none covers a bare `.focus()`, so a fifth rule there would replace this test |
| `src/styles/buttonFocusRing.test.ts` L62-76, L145 | every `.tsx` in `src/` and ten named files as source text, parsed with the TypeScript parser, looking for buttons that paint a fill without the ring class; plus the stylesheet text at L48-53, L181 | partly: the ring itself is checked by running tests (`SettingsTab.focusRing`, `OllamaTab.focusRing`, the two `SettingsDeveloper*Ring` tests); this one is a lint over source and is fine as a script |
| `src/components/AboutTab.test.tsx` L50, L85, L101, L167 | the drawing's data file `docs/demos/mockup-board-2/src/42-tabs-data.js`, matching the tab's words to it | words can be compared to a fixture inside `src/` |
| `src/components/AboutTab.test.tsx` L231-233 | `src/styles/sections/aboutTab.ts` as text: two colour values must not be in it | yes, easily: assert the About rule's computed colour equals the shared button's |
| `src/components/AboutTab.test.tsx` L74-79 (callers L122-129, L154-157, L179-188, L205-227, L239-253) | the built scope stylesheet text, regex over rule declarations | see 4.2 |
| `src/components/DeveloperTab.folded.test.tsx` L119 | the drawing's data file, evaluated, row words checked word for word | same as About |
| `src/features/folded-tabs/developerTabFolds.test.ts` L44-46 | the drawing's data file | same |
| `src/features/folded-tabs/settingsTabFolds.test.ts` L27, L49, L133, L137-138 | the drawing's data file as text; section names and row words must appear in it | same |
| `src/components/icons.bonsaiGeometry.test.tsx` L36-41 | `src/assets/icons/bonsai-logo.svg` as text, first `<path d>` compared with the component's | a fair "same data in two places" guard; keep |

Outside my 391 but reading my files (for the step 5 owner): `src/components/textSizeScan.test.ts` (L26-63: every source
file's lines, plus two named files), `src/components/MainTabUnifiedAskBar.noSettingsCard.test.tsx` (L74-91),
`src/data/firstRunNoticeWording.test.ts` (L10-12: reads `useDisclaimerAndLocalRuntimeGates.tsx` and
`pluginQuickStartInstructions.tsx` and asserts words are not in them).

### 4.2 Tests that match text in the built stylesheet

These do not read a source file; they run a function that returns the CSS text and match it with regular expressions.
`lessons-learned.md` section 5 says why: jsdom does no layout, so a rule's numbers can only be checked in the text. Keep
them, but merge them (section 3) and give them one shared helper for "find a rule's body by selector".

| Test | Lines | What it matches |
|---|---|---|
| `src/styles/presetChipFocusRing.test.ts` | L24-29, L54-60, L139, L83-89 | rule bodies for the chip ring, gating, edge list, label |
| `src/styles/presetChipHighlightFill.test.ts` | L24-35, L78, L86-99 (the computed-style checks at L102-114 are real behaviour) | the highlight fill rule |
| `src/styles/sections/presetChipLabel.test.ts` | L15-25, L30-34, L46-56 | the label rule's position and body in section 4 |
| `src/styles/sections/answerBubble.test.ts` | L16-21, L102 and throughout; L93-256 is the Read aloud corner (removal) | the answer bubble's spacing, scramble, glow, corner rules |
| `src/styles/sections/section-4.test.ts` | L25-227 | chip-row edge cue, caret colour, width variable, room under chips |
| `src/styles/sections/section-5.test.ts` | L23-58 | the blinking cursor |
| `src/styles/sections/section-6.test.ts` | L24-241 (read aloud rules gone, removal) | copy icon room, placeholder, chip surfaces, glow, reason chips |
| `src/styles/sections/gamepadAndPullModels.test.ts` | L30-40, L65-73, L89-110 | the models list height and no screen-sized height anywhere in the scoped sheet |
| `src/styles/sections/gameRunningLighter.test.ts` | L19-57 | `animation: none !important` in selected bodies |
| `src/styles/sections/replyRatingChoices.test.ts` | whole file | rating button sizes from the built sheet |
| `src/features/plugin-shell/TabIndicatorBar.test.tsx` | L79-93, L332-344, L347-370 | the header-hiding rule's selector and declarations |
| `src/features/folded-tabs/foldAllCover.test.ts` | L65-66 | a regex for the fold tail's height |
| `src/features/folded-tabs/foldLineWidths.test.ts` | L10-21, L24-38 | name, summary and chevron rules |
| `src/components/PullModelsFiltersColumn.layout.test.ts` | L88-94 | strings in `buildPullModelsStylesheet()` |
| `src/styles/buttonFocusRing.test.ts` | L48-53, L181 | the ring-host rule |

The ring tests (`SettingsTab.focusRing`, `OllamaTab.focusRing`, `SettingsDeveloper*Ring`) build the stylesheet and read
`getComputedStyle` outlines: those run the rules and are behaviour tests.

## 5. Unused and written twice

Each entry was checked against the code with `git grep` unless marked "from the record". "Act" means a small, safe
clean-up worth a step-5 commit; "leave" means harmless or kept on purpose.

### 5.1 Unused

| What | Where | Act? |
|---|---|---|
| **The pixel-grid avatar art is never drawn.** `CharacterRoleplayEmoticon` draws it only when `art` is left out (default `"grid"`, L85); all six app callers pass `art="prop"` (`CharacterPickerModal.tsx:238,534,628,743,813`, `MainTabUnifiedAskBar.tsx:503`); only `CharacterRoleplayEmoticon.test.tsx` draws it. The file holds an 8x8 table (L133-453) that `expand8To16` (L115-130, used L1075-1082) doubles and then overwrites with the 16x16 table (L470-1046) for the same 33 ids, so the 8x8 copy never reaches a screen. | `src/data/characterPlaceholderEmoticonGrids.ts` (1,101 lines); `src/components/CharacterRoleplayEmoticon.tsx:102-165` (the grid branch, the "?" at :102-132) and the `EMOTICON_PALETTE` import; `scripts/growth_limits.json:24`; names in comments `characterCatalog.ts:158`, `characterPropGlyphAppearance.ts:60` | **Yes, the biggest find in this area.** About 1,170 lines. Not on the plan's removal list, so the maintainer decides. AI characters themselves stay |
| `CharacterPropGlyph` props `prop`, `tint` (L119-120), the unframed branch (L412, L420), default `size` (L121), `className`/`title` (L123-124): the one caller passes none | `src/components/CharacterPropGlyph.tsx` | Yes, with the item above |
| The `letter` field on every `CHARACTER_PROPS` entry is never read (the glyph reads `prop` and `tint`, `CharacterPropGlyph.tsx:126-128`) | `src/data/characterPropGlyphAppearance.ts:55,62-` | Yes (small) |
| Four translation keys no code asks for: `ask.working`, `toast.permissionRequired.title`, `toast.permissionRequired.body`, `about.replyLanguage.dropdownLabel` | `src/i18n/keys.ts:26-28,34`; `catalog.ts` English L14-16,22, Japanese L31-33,39, German L47-50,56 (checked: no hit outside `src/i18n`, no key built at run time) | Yes |
| CSS rule for a class nothing uses: `.bonsai-chat-response-stack` (the class in use is `bonsai-ai-response-stack`) | `src/styles/sections/section-4.ts:185-187` | Yes |
| CSS rule for a class nothing uses: `button.bonsai-chat-next-message` (the row class `bonsai-chat-next-message-row` is a different class, `answerBubble.ts:224`) | `src/styles/sections/section-6.ts:246-264` | Yes, but check the Deck once: the class could be set from text built at run time (I found none) |
| A branch that can never change the answer: after `inst === tag` already returned true | `src/utils/pullModelFilters.ts:70,73` | Yes |
| `flexDirection: compact ? "column" : "column"` | `src/components/PermissionDenyAction.tsx:58` | Yes |
| `AboutTab` receives a translator prop `t` (declared L41, taken as `_t` L84) and never reads it; `useAboutTabPayload.tsx` hands it over | `src/components/AboutTab.tsx:41,84` | Yes, ties in with step 6c |
| The Ollama tab's pass-through of `onApplyTier2MultimodalPolicy` goes to `OllamaWhereAiRunsSection`, which never reads it (its own type says so). The hub's use is live | `OllamaTab.tsx:106,174,253`; `OllamaWhereAiRunsSection.types.ts:78-79`; `useOllamaTabPayload.tsx:69,107,127` | Yes |
| `useHiddenTabHeaderTrap(onBounce?)`: no caller passes it | `useHiddenTabHeaderTrap.ts:116,126,161` | Yes (small) |
| `forceCatalog`: both callers pass `false` | `usePullModelCatalogRefresh.ts:46,81,84,139`; `usePullModelDeleteConfirm.tsx:41,121` | Yes |
| `SettingsTabChoiceRow` prop `hostRef`: no caller passes it | `SettingsTabChoiceRow.tsx:45,56,60` | Yes |
| `tabFold`'s second parameter `_sections`: never read, four callers pass it | `foldedTabsStore.ts:42,52,57,64,70` | Yes (small) |
| Two ids in `ModalReturnFocusId` with no caller: `"session-context-clear"`, `"session-tab-clear"` | `modalReturnFocusRegistry.ts:68,75` | Yes (check the "settings clear ids" the test mentions first) |
| `TryOrderHost.modelAllowHighVramFallbacks`: declared, never read in the hook | `useTryOrderPlaces.ts:55` | Yes (small) |
| `steamLanguages.ts` is a pure re-export shim; one importer (`AboutReplyLanguageSection.tsx:32`) takes three of its seven names; the rest (`REPLY_LANGUAGE_ALWAYS_ENGLISH`, `STEAM_LANGUAGE_CODES`, `STEAM_LANGUAGE_LABELS`, `effectiveLangCatalogKey`, two types) no one takes from this path. Its header says it is kept for a shorter path | `src/data/steamLanguages.ts` | Optional: point the importer at `replyLanguage.ts` and delete the shim |
| Returned values nobody reads: `useReplyLanguage` `snapshot`, `steamClientLanguage`, `refresh` (L76-80; `index.tsx:414` reads three others); `usePullModelCatalog` `catalogLoading`, `overlayPayload`; `useOllamaTabFocus` `focusKbToggle` (L179), `focusKbUpFromReplyVerbosity` (L182); `developerConnectionStatus` fields `version`, `models`, `error` (read by no Developer file; the four Ollama users unknown) | files named | Leave (cheap, may be wanted); `usePullModelCatalog`'s two are likely to go with the weekly refresh |
| Parameters declared and never read: `useLocalOllamaSetupFlow` `onBeforeDeckyModal`, `onCompleteDeckyModalClose` (L83, L85), still passed at `OllamaWhereAiRunsSection.tsx:441-442`; `localInstallMenuOpen: false` kept "for the shape" (`OllamaWhereAiRunsSection.tsx:337`; type at `ollamaTabLocalSurvival.ts:31`); `VoiceEngineStatus.model_id`, `.ready` (`VoiceInputSettingsSection.tsx:48,51`); `steamParental.ts:42-43` payload fields | files named | Leave, except the setup flow's two: Yes, with the call site |
| Test-only exports: `PullModelsModal.tsx` re-exports of `computeUpdatedPullRecord`, `PULL_MODEL_NEW_BADGE_WINDOW_MS`, `PULL_MODEL_NEW_BADGE_STORAGE_KEY`, `findUnavailableRegistryTags` (L152-163, only `PullModelsModal.test.tsx:18-22` uses them); `isLeftDeckButton`/`isRightDeckButton` (`deckSliderMath.ts:14,19`); `peekPermissionJumpReturnTab`, `peekPermissionJumpFocusTarget` (`permissionJumpRegistry.ts:96,100`); `PERMISSION_TOGGLE_LABELS` (`permissionDeepLink.ts:63`, whose comment says the Back banner uses it and it does not); `mountedBonsaiTabIds` (`tabTitles.tsx:55`); `flushSettingsSnapshotNow` (`usePluginSettings.ts:393,552`); `findCoverageGaps` outside its own file (`pullModelRecommendations.ts:88`) | files named | Leave, except the `PullModelsModal` re-exports: point the test at the real modules and drop them (Yes) |
| **`modelSizeWarning`** (`modelRoutingOrder.ts:94`): only its own test calls it, yet the file header (L26-32) says screens that show a person a model should use it. That may mean no screen warns about a big model. | `modelRoutingOrder.ts:94`; test `modelRoutingOrder.test.ts:11-33` | **Look first**: it may be a missing warning, not dead code |
| Exported types no other file imports: the `Use...Args` types of the shell and payload hooks (`useAboutTabPayload.tsx:26`, `useDeveloperTabPayload.tsx:24`, `useMainTabPayload.tsx:68`, `useOllamaTabPayload.tsx:25`, `usePermissionsTabPayload.tsx:19`, `useSettingsTabPayload.tsx:20`, `useUnifiedInputBehaviors.ts:26,60`, `useSessionResetActions.tsx:54,75`, and others), `PullModelsModal.types.ts:40-42`, `PullModelsTryOrder.tsx:57,65`, `characterUiAccent.ts:17`, `deprioritizedModels.ts:40-42` (`BLOCKED_PULL_CATALOG_TAGS`, mirrored only in Python), `modelPolicy.ts:33`, `steam-input-lexicon.ts:8` | files named | Leave: harmless; the compiler does not flag unused exports |
| **TDP/GPU "applied" leftovers:** `AppliedResult` (`types/bonsaiUi.ts:20-24`) and `AppliedResultLike` (`bonsaiSettingsSchema.ts:296-300`) both carry `tdp_watts`, `gpu_clock_mhz`; `appliedTuningText.ts` formats them; `lastApplied` is threaded through `MainTab`, `MainTabChatTranscript`, three hooks, two type files and `bonsaiSessionSurvival`. The docs say bonsAI stopped changing power limits on 2026-07-30 | outside my area except the two types and `settingsContracts.test.ts:472-538` | **Unknown whether the back end still ever sends `applied`** (`main.py:1550` passes `result.get("applied")`). The back-end and main-screen reviewers can settle it; if never, it is a hand-down to remove in step 6c |

### 5.2 Written twice

| What | Where | Act? |
|---|---|---|
| `type OkRuns` written out **three times** (the records found two) | `PullModelsCustomTagEntry.tsx:29`, `PullModelsFiltersColumn.tsx:59`, `PullModelsTryOrder.tsx:55` | Yes: one export |
| `CRUSHED_SCOPE_MAX_PX = 160` three times, and the same comparison | `tabBodyViewport.ts:9`; `useQamPanelHeightGuard.ts:20` (check at :154, :158); `useTabStripBodyOffset.ts:16` (check at :37) | Yes: import from `tabBodyViewport.ts` |
| "Installed, or installed as `:latest`" test written four times; the "expert" rule twice | `pullModelFilters.ts:68-69` and `pullModelRecommendations.ts:62,82,108`; `pullModelFilters.ts:87` and `pullModelRecommendations.ts:71` | Yes: this is real logic, not constants |
| `TEST_CONNECTION_TIMEOUT_SECONDS = 10`, `LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS = 42000` | `OllamaWhereAiRunsSection.constants.tsx:17,19`; `usePullModelCatalogRefresh.ts:34-35` | Yes |
| Profile name `"tier1_essentials"` | `useStarterSetRunWatch.ts:26`; `OllamaWhereAiRunsSection.constants.tsx:23` | Yes (small) |
| **Starter set size told two ways:** "about 4.6 GB" in the download notice, "about 4.5 GiB" in the box before it; two tests pin the second | `localOllamaStarterSet.tsx:39`; `OllamaWhereAiRunsSection.constants.tsx:30`; `starterOffer.test.tsx:105`, `PullModelsStarterSetChip.test.tsx:219` | The maintainer's call: which wording is right (a player-visible difference) |
| The six capability keys, in the type and the default (`bonsaiSettingsSchema.ts:93-103`, `:341-348`) and again in `normalizeCapabilities` (`bonsaiSettingsNormalizers.ts:422-429`); two clamp helpers with no comment on why (`clampNumber` L135-140, `clampedWholeNumber` L279-289) | settings plumbing | For the settings-plumbing reviewer (step 6a) |
| The "changed since the last saved copy" diff three times | `usePluginSettings.ts:384-387,417-420,524-526` | For the settings-plumbing reviewer |
| The helper that focuses the first stop inside a row, three near-copies | `useDeveloperTabFocus.ts:36-53`, `useOllamaTabFocus.ts:37-44` (`focusFirstStopIn`), `useSettingsTabFocus.ts:38-52` (`stopsIn`, `focusStop`); the Developer one says it follows the Ollama one and does not say why a copy exists (they differ: Developer takes the innermost match, Ollama takes a selector) | For the D-pad reviewer |
| Two near-copies of one function in the same file | `pullModelsBeside.ts:127-152` (`enterList`) and `:154-173` (`enterColumn`) | For the D-pad reviewer |
| Two effects copy the two saved switches into drafts | `ModelRoutingAdvancedPanel.tsx:83-86`, `OllamaModelsHubModal.tsx:182-185` | Yes (one hook) |
| Two Tier 2 box layouts and two toast pairs | `usePullModelSubmitSelected.tsx:157-185` and `usePullModelTier2Confirm.tsx:83-111` (the second calls the first its sister); `usePullModelCustomTagPull.tsx:82-98` and `usePullModelSubmitSelected.tsx:122-137` | Leave: different words |
| Two identical buttons in the picker, and two comment blocks for one effect | `CharacterPickerModal.tsx:514-547` and `:722-756`; comments `:329-341` (older) and `:342-355` | Yes: delete the older comment; the buttons are a possible small extract |
| Pointer handlers on the knob and on the track | `DeckFocusSlider.tsx:156-183` and `:327-353` (the header says they must agree) | Leave |
| "Pick and close" written three times | `SettingsTabAccentIntensityMenuPopover.tsx:152-165` | Yes (small) |
| The two Clear buttons' set-up steps | `SettingsTabDataSection.tsx:111-131` and `:139-165` | Leave unless the Settings tab is reworked |
| Dot styles in three sliders | `SettingsTabConnectionTimeoutSlider.tsx:198-234`, `SettingsTabOllamaKeepAliveSlider.tsx:70-89` | Leave |
| The option-row title style, and the same `Focusable` settings | `DeveloperOptionRow.tsx:82` and `developerRowsAnimations.tsx:151-153` (a ban-lookup row); `developerRows.tsx:125-128` and `developerRowsDiagnostics.tsx:185-188` | The first goes with the Steam key row (removal); the second: Yes (small) |
| The `deckNav` cast | `AboutLinks.tsx:64`, `AboutReplyLanguageSection.tsx:37-38` | Leave |
| Labels "Follow system" and "Always English" twice in one file | `replyLanguage.ts:126-127` and `:139-140` | Yes (small) |
| Same tabs-scroll rules in two style slices | `section-1.ts:83-90` and `section-3.ts:102-117`; `section-1.ts:118-124` and `section-3.ts:83-91` (the PanelSection rules in `section-3.ts` match nothing on the shipping build, per its own L70-82; not re-measured) | Leave until measured on the Deck |
| Same declarations for two menus | `section-7.ts:55-67` and `:111-122`; `:92-104` and `:138-150` | Yes (small) |
| WCAG luminance maths | `characterPropGlyphAppearance.ts:98-103`; `characterUiAccent.ts:91-111`; the test's own copy (`characterUiAccent.test.ts:24-43`) is on purpose | Yes for the first two |
| `.bonsai-pullmodels-chip--foss-inline` and `.bonsai-scope .bonsai-pullmodels-col--try` each as two rules | `gamepadAndPullModels.ts:458-464`/`:716-719`, `:541-547`/`:568-570` | Yes (merge) |
| Storage helpers in matching pairs, two notice boxes of the same shape | `useDisclaimerAndLocalRuntimeGates.tsx:59-89,134-145,179-191` | Leave |
| The `loadLastTab` / `loadActiveChatSlotId` read-trim steps | `pluginStorage.ts:70-90` | Leave |
| The two `onErr`/`onRejection` handlers | `useCapturedFrontendErrors.ts:42-69` | Leave |
| Headers that are out of date: `OllamaReplyVerbositySlider.tsx` says "three-stop" (the list has four); `CharacterPropGlyph.tsx:95-96` says an unknown character gets the crate art (it gets a head figure, L395-403); `CharacterRoleplayEmoticon.tsx` header says Settings uses the grid art (it does not); `DeveloperOptionRow.tsx:17` names the wrong file | files named | Yes: comment fixes (a comment-only commit) |

**Kept on purpose, do not touch** (a comment says so, and a test or a header guards it): `icons.tsx` `BonsaiLogoIcon` and
`BonsaiSvgIcon` drawing the same path; `bonsaiLogoPath.ts` (split out of `icons.tsx` and checked against the SVG);
`deprioritizedModels.ts` against `py_modules/backend/ollama_routing.py:147-187` (word for word, a Python test guards it);
`modelRoutingOrder.ts` seed lists against `ollama_routing.py`; `ollamaAddress.ts:17-18` against
`py_modules/backend/ollama_urls.py:28-30` (the screen test checks the sentence); the `section-4`, `section-5`,
`section-6` duplicates that carry a comment; the test's own luminance copy.

## Open questions for the one running the session

1. **Prepare commits for the text-reading tests (section 2.1).** One small "make these tests find files by name" commit
   per area before its move, or one for all eleven first? Without them each move commit fails its own tests.
   `buttonFocusRing.test.ts` and `tabBodyFocusCalls.test.ts` also appear in step 5's list.
2. **`models/pull-box/`**: yes or no (drop the segment from the `.tsv` for a flat `models/` of 78 files).
3. **Per-tab fold lists move to their tabs** (3 files + 2 tests). The alternative is leaving them in `folded-tabs/`. Say if
   the maintainer wants the folded-tab words kept in one place.
4. **Order with the removals.** The map describes the state after step 3. `uiScaleScopeBridge.ts` may be renamed by the
   UI scale lane; `pullModelCatalogRefresh.ts` marked `-` assumes the on-open catalog call stays and that the lane edits
   `usePullModelCatalog.ts:16,48` and `useLocalOllamaSetupFlow.tsx:38,209`. A mover starting from this `.tsv` must check
   each `from` still exists.
5. **Grid avatar art (5.1):** not on the plan's removal list; about 1,170 lines. Approve or leave.
6. **Starter set size wording** (4.6 GB or 4.5 GiB): a maintainer call.
7. **The drawing data file (2.4):** stays in the repo, or its words copied into a fixture in `src/`? Settle it before step 1
   or 7 sends the demo boards to the workshop.
8. **Folders I use that other reviewers own:** `ask/`, `answer/`, `chat-slots/`, `details-slot/`, `preset-carousel/`,
   `search-tab/`, `unified-input/`, `user-notes/`, `voice/`, `test-harness/`, and the `shared/` sub-folders `focus/`, `i18n/`,
   `icons/`, `text-size/`. I could not see the other maps. Within my map no two files share a path or a case-insensitive name;
   across the eight maps that is unchecked (a stem like `aboutTab` against `AboutTab` is the trap).
9. **The drawing data file also holds a UI scale row, a Voice replies row and the ban lookup rows** (2.4): the removals must edit it.
10. **TDP/GPU "applied" leftovers (5.1)**: does the back end still send `applied`? That settles whether `lastApplied` goes.
11. **Data files outside my 391** that I would place with my folders (1.3): `replyVerbosity.ts`, `deckEssentialsTags.ts`,
    `askThinkEffort.ts`, `knowledgeBaseDev.ts`.

**Handed over to the other reviewers** (found while reading; I did not list lines for these):

- *Removal lanes (lines are in the records of these batches):* ban-lookup touches 29 files in my area (the Developer tab and
  its payload and tests, `developerRowsAnimations.tsx:151-159` the key row, `developerTabFolds.ts:38,120,211`, the
  Permissions tab rows and tests, `permissionDeepLink.ts` + test L29, `permissionJumpRegistry`, `usePermHintNavTargets.ts:38-41`,
  `useKidsLock.ts`, `bonsaiSettingsSchema.ts` L336-338 and the capability list, the normalizers, `usePluginSettings`,
  `index.tsx`, `scopeBase.ts`, `ringTestProps.ts`, `settingsPayload.ts`, `settingsContracts.test.ts`, the two
  `SettingsDeveloper*Ring` tests, `DeveloperTab.foldedWalk.test.tsx` L8 and L135, which pin six sections including
  Integrations). Read aloud touches 26 (the speaker icon in `icons.tsx` is also used by `buildAnswerCornerSlots.tsx:176`;
  the Settings tab's Voice replies row; the schema and normalizers; `answerBubble.ts`, `section-6.ts`, `replyRatingChoices.ts`
  and their tests; `index.tsx`). UI scale touches 55 (the records' `ui-scale` removal fields give every line;
  `BonsaiModalScope.tsx:47` and `useBonsaiScopeStyle.ts` carry both UI scale and Text size, and `index.textSize.test.tsx`
  L32, L52, L70, L86 reads the bridge to check Text size, so it must keep passing). Preview tool: `index.tsx` only.
- *Settings plumbing (6a):* places in my area that write a setting out by name: `index.tsx:285-389`,
  `bonsaiSettingsSchema.ts:112-233,236-293`, `bonsaiSettingsNormalizers.ts:459-547,577-609`, `usePluginSettings.ts:124-178`,
  `settingsPayload.ts:52-104`, `settingsTabFolds.ts:38-49,99-112,145-165`, `useSettingsTabPayload.tsx:32-64,71-103`,
  `useDeveloperTabPayload.tsx:44-75,81-112`, `useOllamaTabPayload.tsx:42-72,80-110`, `PermissionsTab.tsx:59-89`,
  `SettingsTab.tsx:94-141,157-189`, and the props lists written out in tests (`ringTestProps.ts:15-82`,
  `SettingsTab.accentMenuRing.test.tsx:38-74`, `SettingsTab.clearAllBack.test.tsx:43-79`,
  `DeveloperTab.folded.test.tsx:26-59`, `usePluginSettings.readBack.test.ts:39-100`, `settingsContracts.test.ts:334-617`).
  Writers outside those: `useOllamaModelsHubModal.tsx:110-146`, `useCharacterPickerModal.tsx:86-110`,
  `useTryOrderPlaces.ts:135-137,294`, `usePullModelPinForAsk.tsx:70-85`, `pluginStorage.ts:159-164`.
- *D-pad helpers:* `pullModelsBoxMemory.ts:69-78,86-93` (`handRingTo`, `focusAndReveal`, used by
  `OllamaModelsHubModal.tsx:61`), the three `use*TabFocus.ts` helpers (5.2), `shoulderSwitch.ts`, `modalReturnFocusRegistry.ts`,
  `settingsPanelScroll.ts`, `useTabBodyFocusScroll.ts`, `deckSliderMath.ts` / `DeckFocusSlider.tsx`
  (`buildDeckThumbNavHandlers` L89-96), `usePermHintNavTargets.ts`, `useHiddenTabHeaderTrap.ts`, `CharacterPickerModal.tsx`
  (its own column lists L402-419, L496-512, L601-611, L704-720, L826), `developerRows.tsx:50-76`.
- *Hand-downs (6c):* `index.tsx` passes about 104 values to the Main tab payload (L889-1003), 33 to Settings, 31 to Ollama,
  32 to Developer; `useMainTabPayload.tsx` receives about 105 and its rebuild list L377-454 leaves out about two dozen values
  the screen reads; `useSessionResetActions.tsx:89-106` takes about 18; `useOllamaModelsHubModal.tsx:81-95` about 15;
  `useSessionRestoreAfterRemount.ts:68-79` about 12; `useCharacterPickerModal.tsx:56-67` about 10;
  `useUnifiedInputBehaviors.ts` about 8; `useBonsaiScopeStyle.ts` about 5; `usePluginSettings.ts:545-561` returns about 53
  settings and setters.

## Records found wrong

390 records read (the script's list has 391 files). I checked every line citation mechanically (646 file:line citations;
all point inside their file) and every "tests" field against the files on disk (225 code-file records, no gap), then read
the code behind the claims of about 85 records (more than one in five), including every record that drives a whole-file cut.

| Batch, file, field | Said | True |
|---|---|---|
| b36, `src/data/characterUiAccent.test.ts` | (no record) | the file is on the batch list and has no record. It tests `characterUiAccent.ts`; goes with it to `characters/` |
| b32, `PullModelsCustomTagEntry.tsx:29` and `PullModelsFiltersColumn.tsx:59`, unused-or-twice | `OkRuns` is written twice | three times: also `PullModelsTryOrder.tsx:55` |
| b28, `AboutTab.tsx`, users | no reader of the file by path | `src/styles/buttonFocusRing.test.ts:128-133` lists `components/AboutTab.tsx` (L131) and reads it as text |
| b31, `OllamaTab.tsx` and `OllamaWhereAiRunsSection.tsx`, users | `tabBodyFocusCalls.test.ts` not named | both are in its `FILES` list (`tabBodyFocusCalls.test.ts:14-15`) |
| b39, `tabBodyFocusCalls.test.ts`, "checks code text" | no | yes: L25-28 reads each component file and regex-matches its text |
| b37, `steamLanguages.ts`, unused | five names and two types are unused | right, but the file also has a live user: `AboutReplyLanguageSection.tsx:32` takes three names through it |
| b47, `pullModelCatalogRefresh.ts`, removal | "catalog-refresh: whole file" | agrees with the plan (line 440), but its subscriber and caller (`usePullModelCatalog.ts:16,48`, `useLocalOllamaSetupFlow.tsx:38,209`) must change in the same removal; whether it goes depends on the on-open call (open question 4) |
| b29/b36, `CharacterRoleplayEmoticon.tsx` and the grid file | "unused in practice" for the grid art | confirmed, and bigger than the record says: the same finding reaches `characterPlaceholderEmoticonGrids.ts`, 1,101 lines, with its growth-limit entry (`growth_limits.json:24`) |
| b38/b39, folder picks (`plugin-shell/tabs/`, shared/focus for `useHiddenTabHeaderTrap`, `developer/` for `developerTabSignal`, numbered style slices) | the folder named | my decisions differ; see 1.6. Not errors in the facts |
